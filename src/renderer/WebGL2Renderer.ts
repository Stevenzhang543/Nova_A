/** WebGL 2 渲染实现：管理着色器、批次、纹理驻留、多重采样和后处理目标，并回收 GPU 资源。 */
import { nineSliceGeometry, shapeGeometry, spriteGeometry, strokeGeometry, type GeometryData } from './geometry'
import { assetState, resolveTexture as resolveTextureAsset } from '../assets/AssetDatabase'
import { analyzeMaterialShader, defaultMaterial, reflectShaderUniforms, reportMaterialFallback, resolvedMaterialFragment, resolveMaterial, type Material2DResource } from './materials'
import { reportRendererContextLost, reportRendererContextRestored } from './capabilities'
import { activePostProcessing, GPU_TEXTURE_MEMORY_LIMIT_MB, renderingSettings } from './renderSettings'
import { textureContentVersion } from './textureContent'
import { boundedFrame } from './surfaceLimits'
import { multisampleCount } from './outputQuality20'
import {
  normalizedColor,
  type CameraRenderView,
  type FrameOptions,
  type Renderer2D,
  type RendererStats,
  type ShapeRenderCommand,
  type SpriteRenderCommand,
  type TextRenderCommand,
  type TextureFilter,
  type TextureRegion,
  type TileChunkRenderCommand
} from './types'

interface GeometryPacket {
  layer: number
  order: number
  sequence: number
  material: string
  blend: 'Alpha' | 'Additive' | 'Multiply' | 'Screen'
  texture: TextureRegion | null
  filter: TextureFilter
  color: [number, number, number, number]
  geometry: GeometryData
  camera: CameraRenderView
  cameraIndex: number
}

interface CachedTexture {
  texture: WebGLTexture
  width: number
  height: number
  filter: TextureFilter | null
  lastUsedFrame: number
  contentVersion: string
}

interface CachedText {
  region: TextureRegion
  aspect: number
  bytes: number
  lastUsedFrame: number
}

const MAX_PACKET_VERTICES = 65_000
const MAX_BATCH_INDICES = MAX_PACKET_VERTICES * 3
/* 根据 Number.isFinite(value) 的真假，分别返回 value 或 fallback。 */ function finite(value: number, fallback: number): number { return Number.isFinite(value) ? value : fallback }
/* 将视口归一化为有效且非空的矩形，非有限输入使用默认值。 */
function safeViewport(viewport: CameraRenderView['viewport']): { x: number; y: number; width: number; height: number } {
  const x = Math.min(1 - 1e-6, Math.max(0, finite(viewport?.x ?? 0, 0)))
  const y = Math.min(1 - 1e-6, Math.max(0, finite(viewport?.y ?? 0, 0)))
  return { x, y, width: Math.max(1e-6, Math.min(1 - x, finite(viewport?.width ?? 1, 1))), height: Math.max(1e-6, Math.min(1 - y, finite(viewport?.height ?? 1, 1))) }
}

const VERTEX_SOURCE = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_position;
layout(location=1) in vec2 a_uv;
layout(location=2) in vec4 a_color;
uniform vec4 u_camera;
uniform vec2 u_rotation;
out vec2 v_uv;
out vec4 v_color;
void main() {
  vec2 relative = a_position - u_camera.zw;
  vec2 viewPosition = vec2(
    relative.x * u_rotation.x + relative.y * u_rotation.y,
    -relative.x * u_rotation.y + relative.y * u_rotation.x
  );
  gl_Position = vec4(viewPosition.x * u_camera.x, viewPosition.y * u_camera.y, 0.0, 1.0);
  v_uv = a_uv;
  v_color = a_color;
}`

const FRAGMENT_SOURCE = `#version 300 es
precision highp float;
in vec2 v_uv;
in vec4 v_color;
uniform sampler2D u_texture;
uniform bool u_linearTexture;
uniform bool u_writeColor;
out vec4 outputColor;
void main() {
  vec4 sampled = texture(u_texture, v_uv);
  if (u_linearTexture) sampled = vec4(pow(max(sampled.rgb, vec3(0.0)), vec3(1.0 / 2.2)), sampled.a);
  outputColor = sampled * v_color;
}`

const POST_VERTEX_SOURCE = `#version 300 es
precision highp float;
const vec2 positions[3] = vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));
out vec2 v_uv;
void main(){ vec2 position=positions[gl_VertexID]; gl_Position=vec4(position,0.,1.); v_uv=position*.5+.5; }`

/* 创建并编译指定阶段的着色器，编译失败时释放对象并抛出驱动诊断。 */
function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Could not allocate WebGL shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Unknown shader compilation error'
    gl.deleteShader(shader)
    throw new Error(message)
  }
  return shader
}

/* 编译和链接顶点及片段程序，成功或失败均释放中间着色器对象。 */
function createProgram(gl: WebGL2RenderingContext, fragmentSource = FRAGMENT_SOURCE, vertexSource = VERTEX_SOURCE): WebGLProgram {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  let fragment: WebGLShader | null = null, program: WebGLProgram | null = null
  try {
    fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
    program = gl.createProgram()
    if (!program) throw new Error('Could not allocate WebGL program')
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Unknown shader link error')
    return program
  } catch (error) {
    if (program) gl.deleteProgram(program)
    throw error
  } finally {
    gl.deleteShader(vertex)
    if (fragment) gl.deleteShader(fragment)
  }
}

interface ProgramState {
  program: WebGLProgram
  camera: WebGLUniformLocation
  texture: WebGLUniformLocation
  rotation: WebGLUniformLocation
  linearTexture: WebGLUniformLocation | null
  material: Material2DResource | null
}

interface PostProgramState { program: WebGLProgram; texture: WebGLUniformLocation; material: Material2DResource }
interface TimerQueryExtension { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }

/* 创建供内置后处理使用的默认 UI 目标材质。 */
function builtInPostMaterial(): Material2DResource {
  const material = defaultMaterial('Nova built-in post process')
  material.target = 'UI'
  return material
}

/* 组合材质源码、资源声明和颜色空间转换，生成精灵片段着色器。 */
function materialFragment(material: Material2DResource): string {
  const resolved = resolvedMaterialFragment(material)
  const declared = new Set(reflectShaderUniforms(resolved.source).map(/* 返回 field.name 的当前值。 */ field => field.name))
  const uniforms = Object.entries(material.uniforms).filter(/* 返回 declared.has(name) 的逻辑取反结果。 */ ([name]) => !declared.has(name)).map(/* 根据资源值类型生成未声明 uniform 的 GLSL 类型声明。 */ ([name, value]) => Array.isArray(value)
    ? `uniform vec${value.length} ${name};`
    : typeof value === 'boolean' ? `uniform bool ${name};` : `uniform float ${name};`).join('\n')
  const textures = Object.keys(material.textures).filter(/* 返回 declared.has(name) 的逻辑取反结果。 */ name => !declared.has(name)).map(/** 按模板 `uniform sampler2D ${name};` 生成并返回字符串。 */ name => `uniform sampler2D ${name};`).join('\n')
  const converted = material.colorSpace === 'Linear' ? `vec4(pow(max(result.rgb, vec3(0.0)), vec3(1.0 / 2.2)), result.a)` : 'result'
  return `#version 300 es
precision highp float;
in vec2 v_uv;
in vec4 v_color;
uniform sampler2D u_texture;
uniform bool u_linearTexture;
uniform bool u_writeColor;
${uniforms}
${textures}
${resolved.source}
out vec4 outputColor;
void main(){ vec4 sampled=texture(u_texture,v_uv); if(u_linearTexture) sampled=vec4(pow(max(sampled.rgb,vec3(0.0)),vec3(1.0/2.2)),sampled.a); vec4 shaded=nova_material(sampled * v_color,v_uv); vec4 result=u_writeColor ? shaded : vec4(sampled.rgb * v_color.rgb, shaded.a); outputColor = ${converted}; }`
}

/* 组合用户材质与内置后处理运算，生成完整后处理片段着色器。 */
function postMaterialFragment(material: Material2DResource): string {
  const resolved = resolvedMaterialFragment(material)
  const declared = new Set(reflectShaderUniforms(resolved.source).map(/* 返回 field.name 的当前值。 */ field => field.name))
  const uniforms = Object.entries(material.uniforms).filter(/* 返回 declared.has(name) 的逻辑取反结果。 */ ([name]) => !declared.has(name)).map(/* 根据后处理资源值的向量、布尔或标量类型生成 uniform 声明。 */ ([name, value]) => Array.isArray(value)
    ? `uniform vec${value.length} ${name};`
    : typeof value === 'boolean' ? `uniform bool ${name};` : `uniform float ${name};`).join('\n')
  const textures = Object.keys(material.textures).filter(/* 返回 declared.has(name) 的逻辑取反结果。 */ name => !declared.has(name)).map(/** 按模板 `uniform sampler2D ${name};` 生成并返回字符串。 */ name => `uniform sampler2D ${name};`).join('\n')
  const converted = material.colorSpace === 'Linear' ? 'vec4(pow(max(result.rgb,vec3(0.0)),vec3(1.0/2.2)),result.a)' : 'result'
  return `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_texture;
uniform vec4 u_nova_post;
uniform vec2 u_nova_post_extra;
${uniforms}
${textures}
${resolved.source}
out vec4 outputColor;
void main(){
  vec2 pixel=max(1.0,u_nova_post_extra.y)/vec2(textureSize(u_texture,0));
  vec4 nearby=(texture(u_texture,v_uv+vec2(pixel.x,0.0))+texture(u_texture,v_uv-vec2(pixel.x,0.0))+texture(u_texture,v_uv+vec2(0.0,pixel.y))+texture(u_texture,v_uv-vec2(0.0,pixel.y)))*.25;
  vec4 base=mix(texture(u_texture,v_uv),nearby,clamp(u_nova_post_extra.y/8.0,0.0,1.0));
  vec4 result=nova_material(base,v_uv);
  result.rgb*=exp2(u_nova_post.x); result.rgb=(result.rgb-.5)*u_nova_post.y+.5;
  float luminance=dot(result.rgb,vec3(.2126,.7152,.0722)); result.rgb=mix(vec3(luminance),result.rgb,u_nova_post.z);
  float edge=smoothstep(.18,.78,length(v_uv-.5)); result.rgb*=1.0-edge*u_nova_post.w;
  float highlight=max(max(result.r,result.g),result.b); result.rgb+=max(0.0,highlight-.72)*u_nova_post_extra.x*.28;
  result=clamp(result,0.0,1.0); outputColor=${converted};
}`
}

/* 调用 createProgram(gl, postMaterialFragment(material), POST_VERTEX_SOURCE) 并返回调用结果。 */ function createPostProgram(gl: WebGL2RenderingContext, material: Material2DResource): WebGLProgram {
  return createProgram(gl, postMaterialFragment(material), POST_VERTEX_SOURCE)
}

/* 读取图像、视频或通用纹理源的实际像素尺寸。 */
function textureDimensions(source: TexImageSource): { width: number; height: number } {
  if (source instanceof HTMLImageElement) return { width: source.naturalWidth, height: source.naturalHeight }
  if (source instanceof HTMLVideoElement) return { width: source.videoWidth, height: source.videoHeight }
  const value = source as { width?: number; height?: number }
  return { width: value.width ?? 1, height: value.height ?? 1 }
}

export class WebGL2Renderer implements Renderer2D {
  readonly stats: RendererStats = { backend: 'WebGL2', drawCalls: 0, batches: 0, triangles: 0, sprites: 0, shapes: 0, text: 0, textures: 0, gpuMs: null, passes: 1, renderTargets: 1, overdraw: 0, batchBreaks: 0, atlasPages: 0, textureMemoryBytes: 0, textureUploads: 0, textureEvictions: 0, textureBudgetBytes: 0, textureBudgetExceeded: false, streamingMisses: 0, shaderCompiles: 0, shaderFallbacks: 0, contextLosses: 0, batchBreakReasons: {} }
  private readonly gl: WebGL2RenderingContext
  private readonly program: WebGLProgram
  private readonly vao: WebGLVertexArrayObject
  private readonly vertexBuffer: WebGLBuffer
  private readonly indexBuffer: WebGLBuffer
  private vertexUpload = new Float32Array(0)
  private indexUpload = new Uint32Array(0)
  private vertexCapacityBytes = 0
  private indexCapacityBytes = 0
  private readonly maximumSurfaceDimension: number
  private readonly maximumTextureDimension: number
  private framebuffer: WebGLFramebuffer | null = null
  private colorTarget: WebGLTexture | null = null
  private sampleFramebuffer: WebGLFramebuffer | null = null
  private sampleColor: WebGLRenderbuffer | null = null
  private sampleSignature = ''
  private sampleCount = 0
  private requestedSamples = 0
  private readonly supportedSamples: number[]
  private readonly defaultSamples: number
  private readonly baseProgramState: ProgramState
  private readonly materialPrograms = new Map<string, ProgramState | null>()
  private materialGeneration = -1
  private postProgram: (PostProgramState & { reference: string; generation: number }) | null = null
  private copyProgram: WebGLProgram | null = null
  private failedPostSignature = ''
  private readonly timerExtension: TimerQueryExtension | null
  private activeTimer: WebGLQuery | null = null
  private pendingTimers: WebGLQuery[] = []
  private lastGpuMs: number | null = null
  private readonly whiteCanvas: HTMLCanvasElement
  private readonly whiteRegion: TextureRegion
  private readonly textureCache = new Map<object, CachedTexture>()
  private textureMemoryBytes = 0
  private textureCount = 0
  private readonly pendingTextureUploads = new Map<object, { region: TextureRegion; requestedFrame: number; bytes: number }>()
  private drainingTextureUploads = false
  private pendingTextureBytes = 0
  private readonly textCache = new Map<string, CachedText>()
  private textCacheBytes = 0
  private packets: GeometryPacket[] = []
  private frame: FrameOptions = { width: 1, height: 1, pixelRatio: 1, clearColor: { r: 0, g: 0, b: 0, a: 1 } }
  private camera: CameraRenderView = { scale: 1, offset: { x: 0, y: 0 } }
  private sequence = 0
  private cameraIndex = -1
  private targetWidth = 0
  private targetHeight = 0
  private validatedFirstDraw = false
  private validatedFirstBlit = false
  private effectsTargetActive = false
  private effectsWidth = 0
  private effectsHeight = 0
  private contextLost = false
  private contextLossCount = 0
  private frameSerial = 0
  private readonly onContextLost = /* 处理上下文丢失，暂停绘制并丢弃无效 GPU 计时状态，同时更新诊断。 */ (event: Event) => {
    event.preventDefault()
    this.contextLost = true
    this.contextLossCount++
    this.activeTimer = null
    this.pendingTimers = []
    reportRendererContextLost()
  }
  private readonly onContextRestored = /* 上下文恢复后清空旧纹理引用并请求上层重建，在重建前继续暂停绘制。 */ () => {
    // Objects from the lost context are invalid; remain suspended until the owner rebuilds.
    this.contextLost = true
    this.textureCache.clear()
    this.textureMemoryBytes = 0
    this.textureCount = 0
    reportRendererContextRestored()
    window.dispatchEvent(new CustomEvent('nova-renderer-reset-request'))
  }

  /* 初始化 WebGL2 能力、缓冲区和默认资源，失败时注销事件并释放上下文。 */
  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: renderingSettings.antiAliasing !== 'Off', depth: false, premultipliedAlpha: true, powerPreference: 'high-performance' })
    if (!gl) throw new Error('WebGL2 is unavailable')
    this.gl = gl
    this.supportedSamples = Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGBA8, gl.SAMPLES) as Int32Array)
    this.defaultSamples = gl.getParameter(gl.SAMPLES) as number
    this.maximumSurfaceDimension = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number
    this.maximumTextureDimension = Math.min(8192, gl.getParameter(gl.MAX_TEXTURE_SIZE) as number)
    canvas.addEventListener('webglcontextlost', this.onContextLost)
    canvas.addEventListener('webglcontextrestored', this.onContextRestored)
    try {
    this.program = createProgram(gl)
    const vao = gl.createVertexArray(), vertexBuffer = gl.createBuffer(), indexBuffer = gl.createBuffer()
    if (!vao || !vertexBuffer || !indexBuffer) throw new Error('Could not allocate WebGL buffers')
    this.vao = vao
    this.vertexBuffer = vertexBuffer
    this.indexBuffer = indexBuffer
    const cameraLocation = gl.getUniformLocation(this.program, 'u_camera')
    const textureLocation = gl.getUniformLocation(this.program, 'u_texture')
    const rotationLocation = gl.getUniformLocation(this.program, 'u_rotation')
    if (!cameraLocation || !textureLocation || !rotationLocation) throw new Error('Renderer shader uniforms are unavailable')
    this.baseProgramState = { program: this.program, camera: cameraLocation, texture: textureLocation, rotation: rotationLocation, linearTexture: gl.getUniformLocation(this.program, 'u_linearTexture'), material: null }
    this.timerExtension = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerQueryExtension | null

    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    const stride = 8 * Float32Array.BYTES_PER_ELEMENT
    for (const [name, size, offset] of [['a_position', 2, 0], ['a_uv', 2, 2], ['a_color', 4, 4]] as const) {
      const location = gl.getAttribLocation(this.program, name)
      gl.enableVertexAttribArray(location)
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset * Float32Array.BYTES_PER_ELEMENT)
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bindVertexArray(null)

    this.whiteCanvas = document.createElement('canvas')
    this.whiteCanvas.width = 1
    this.whiteCanvas.height = 1
    const whiteContext = this.whiteCanvas.getContext('2d')!
    whiteContext.fillStyle = '#ffffff'
    whiteContext.fillRect(0, 0, 1, 1)
    this.whiteRegion = { key: '__white', source: this.whiteCanvas, uv: { x: 0, y: 0, width: 1, height: 1 }, filter: 'Nearest', revision: 0 }
    this.resolveTexture(this.whiteRegion, 'Nearest')
    } catch (error) {
      canvas.removeEventListener('webglcontextlost', this.onContextLost)
      canvas.removeEventListener('webglcontextrestored', this.onContextRestored)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      throw error
    }
  }

  /* 根据硬件限制调整绘制尺寸，仅在像素尺寸变化时更新相关表面。 */
  resize(width: number, height: number, pixelRatio: number): void {
    const safe = boundedFrame({ width, height, pixelRatio, clearColor: this.frame.clearColor }, this.maximumSurfaceDimension)
    const pixelWidth = Math.max(1, Math.floor(safe.width * safe.pixelRatio))
    const pixelHeight = Math.max(1, Math.floor(safe.height * safe.pixelRatio))
    if (this.targetWidth === pixelWidth && this.targetHeight === pixelHeight) return
    this.targetWidth = pixelWidth
    this.targetHeight = pixelHeight
    if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth
    if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight
    if (this.framebuffer && this.colorTarget) this.resizeEffectsTarget(pixelWidth, pixelHeight)
  }

  /* 开始新帧并初始化质量目标、统计、清屏状态及可用 GPU 计时查询。 */
  beginFrame(options: FrameOptions): void {
    this.frameSerial++
    this.frame = boundedFrame(options, this.maximumSurfaceDimension)
    this.resize(this.frame.width, this.frame.height, this.frame.pixelRatio)
    this.packets.length = 0
    this.sequence = 0
    this.cameraIndex = -1
    if (this.contextLost || this.gl.isContextLost()) return
    const aa = renderingSettings.antiAliasing
    this.requestedSamples = aa === 'Off' ? 0 : aa === 'MSAA8' ? 8 : aa === 'MSAA2' ? 2 : aa === 'MSAA4' ? 4 : renderingSettings.pixelSnap ? 0 : 4
    this.effectsTargetActive = renderingSettings.postProcessing.enabled || aa?.startsWith('MSAA') === true
    if (this.effectsTargetActive) { this.ensureEffectsTarget(); this.ensureMultisampleTarget() }
    else this.releaseMultisampleTarget()
    this.pollGpuTimers()
    Object.assign(this.stats, { drawCalls: 0, batches: 0, triangles: 0, sprites: 0, shapes: 0, text: 0, textures: this.textureCount, gpuMs: this.lastGpuMs, passes: 1, renderTargets: this.effectsTargetActive ? 1 : 0, overdraw: 0, batchBreaks: 0, atlasPages: assetState.atlasPages.length, textureMemoryBytes: this.textureMemoryBytes, textureUploads: 0, textureEvictions: 0, textureBudgetBytes: this.textureBudget(), textureBudgetExceeded: false, streamingMisses: 0, shaderCompiles: 0, shaderFallbacks: 0, contextLosses: this.contextLossCount, batchBreakReasons: {} })
    this.stats.backingWidth = this.canvas.width; this.stats.backingHeight = this.canvas.height
    this.stats.antiAliasingSamples = this.effectsTargetActive ? this.sampleCount : this.defaultSamples
    this.stats.antiAliasingLimited = this.effectsTargetActive && this.sampleCount < this.requestedSamples
    this.stats.textureUploadDeferrals = 0
    this.drainTextureUploads()
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.effectsTargetActive ? this.sampleFramebuffer ?? this.framebuffer : null)
    const [r, g, b, a] = normalizedColor(options.clearColor)
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.disable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.clearColor(r, g, b, a)
    gl.clear(gl.COLOR_BUFFER_BIT)
    if (this.timerExtension && !this.activeTimer) {
      this.activeTimer = gl.createQuery()
      if (this.activeTimer) gl.beginQuery(this.timerExtension.TIME_ELAPSED_EXT, this.activeTimer)
    }
  }

  /* 记录当前相机并递增序号，使后续几何命令绑定到该相机。 */
  beginCamera(camera: CameraRenderView): void { this.camera = camera; this.cameraIndex++ }

  /* 验证精灵网格规模后生成普通、九宫格或蒙皮几何并入队。 */
  submitSprite(command: SpriteRenderCommand): void {
    if (command.mesh && (command.mesh.positions.length > MAX_PACKET_VERTICES || command.mesh.uvs.length > MAX_PACKET_VERTICES || command.mesh.indices.length > MAX_PACKET_VERTICES * 3)) return
    this.stats.sprites++
    this.queue(command, command.texture, command.tint, command.mesh ? spriteGeometry(command) : command.nineSlice ? nineSliceGeometry(command) : spriteGeometry(command))
  }

  /* 将有效形状的填充与描边分别转成几何命令入队。 */
  submitShape(command: ShapeRenderCommand): void {
    if (command.vertices.length > MAX_PACKET_VERTICES) return
    this.stats.shapes++
    if (command.fill.a > 0 && command.shape !== 'Line') this.queue(command, command.texture ?? this.whiteRegion, command.fill, shapeGeometry(command))
    const stroke = strokeGeometry(command)
    if (stroke) this.queue(command, this.whiteRegion, command.stroke, stroke, command.orderInLayer + .0001)
  }

  /* 验证文本参数，将缓存文字纹理转换为精灵几何后入队。 */
  submitText(command: TextRenderCommand): void {
    if (command.text.length > 65_536 || !command.text.trim() || command.color.a <= 0) return
    if (![command.fontSize, command.fontWeight, command.lineHeight, command.outlineWidth, command.maxWidth].every(Number.isFinite) || command.fontSize <= 0 || command.lineHeight <= 0) return
    this.stats.text++
    const cached = this.textTexture(command)
    if (!cached) return
    const width = command.maxWidth > 0 ? Math.min(command.maxWidth, command.fontSize * cached.aspect) : command.fontSize * cached.aspect
    const pivotX = command.align === 'center' ? .5 : command.align === 'right' || command.align === 'end' ? 1 : 0
    const sprite: SpriteRenderCommand = {
      position: command.position, rotation: command.rotation, scale: command.scale,
      size: { x: width, y: command.fontSize * command.lineHeight }, pivot: { x: pivotX, y: .5 },
      flipX: false, flipY: false, tint: command.color, texture: cached.region,
      sortingLayer: command.sortingLayer, orderInLayer: command.orderInLayer,
      material: command.material, blendMode: command.blendMode
    }
    this.queue(sprite, cached.region, command.color, spriteGeometry(sprite))
  }

  /* 展开瓦片块的精灵命令，继承块的材质、混合与排序设置。 */
  submitTileChunk(command: TileChunkRenderCommand): void {
    for (const sprite of command.sprites) this.submitSprite({ ...sprite, sortingLayer: command.sortingLayer, orderInLayer: command.orderInLayer, material: command.material, blendMode: command.blendMode })
  }

  /* 结束相机提交阶段；命令保留到帧末统一排序与合批。 */
  endCamera(): void { /* Commands are flushed at endFrame to preserve global sorting. */ }

  /* 按绘制顺序合并兼容批次，解析抗锯齿和后处理目标，回收资源并返回统计。 */
  endFrame(): RendererStats {
    if (this.contextLost || this.gl.isContextLost()) return { ...this.stats }
    this.packets.sort(/* 按相机、层、层内次序及入队序号排序，保留稳定提交顺序。 */ (first, second) => first.cameraIndex - second.cameraIndex || first.layer - second.layer || first.order - second.order || first.sequence - second.sequence)
    let batch: GeometryPacket[] = []
    let batchVertexCount = 0, batchIndexCount = 0
    const flush = /* 绘制非空批次并清空当前批次及顶点、索引计数。 */ () => {
      if (!batch.length) return
      this.drawBatch(batch)
      batch = []
      batchVertexCount = 0; batchIndexCount = 0
    }
    for (const packet of this.packets) {
      const previous = batch[0]
      const sameBatch = previous
        && previous.cameraIndex === packet.cameraIndex
        && previous.texture?.source === packet.texture?.source
        && previous.filter === packet.filter
        && previous.material === packet.material
        && previous.blend === packet.blend
      if ((!sameBatch || batchVertexCount + packet.geometry.positions.length > MAX_PACKET_VERTICES || batchIndexCount + packet.geometry.indices.length > MAX_BATCH_INDICES) && batch.length) {
        const reason = !previous ? 'initial' : previous.cameraIndex !== packet.cameraIndex ? 'camera' : previous.texture?.source !== packet.texture?.source ? 'texture' : previous.filter !== packet.filter ? 'filter' : previous.material !== packet.material ? 'material' : previous.blend !== packet.blend ? 'blend' : batchIndexCount + packet.geometry.indices.length > MAX_BATCH_INDICES ? 'index-limit' : 'vertex-limit'
        this.stats.batchBreakReasons[reason] = (this.stats.batchBreakReasons[reason] ?? 0) + 1
        flush()
      }
      batch.push(packet)
      batchVertexCount += packet.geometry.positions.length
      batchIndexCount += packet.geometry.indices.length
    }
    flush()
    this.stats.batchBreaks = Math.max(0, this.stats.batches - 1)
    const gl = this.gl
    if (this.effectsTargetActive && this.sampleFramebuffer) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.sampleFramebuffer)
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.framebuffer)
      gl.blitFramebuffer(0, 0, this.canvas.width, this.canvas.height, 0, 0, this.canvas.width, this.canvas.height, gl.COLOR_BUFFER_BIT, gl.NEAREST)
    }
    const postReference = activePostProcessing.userMaterial
    const postMaterial = postReference ? null : builtInPostMaterial()
    if (this.effectsTargetActive && (!renderingSettings.postProcessing.enabled || !this.drawPostMaterial(postReference ?? '__nova_builtin_post__', postMaterial))) {
      this.drawResolvedColor()
    }
    if (this.activeTimer && this.timerExtension) {
      gl.endQuery(this.timerExtension.TIME_ELAPSED_EXT)
      this.pendingTimers.push(this.activeTimer)
      this.activeTimer = null
    }
    if (!this.validatedFirstBlit) {
      const error = gl.getError()
      if (error !== gl.NO_ERROR) throw new Error(`WebGL2 renderer failed its first framebuffer copy (error 0x${error.toString(16)})`)
      this.validatedFirstBlit = true
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    this.trimTextureResidency()
    return { ...this.stats, batchBreakReasons: { ...this.stats.batchBreakReasons } }
  }

  /* 移除上下文监听并释放 CPU 缓存和可用 GPU 对象；丢失上下文时仅清理引用。 */
  destroy(): void {
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored)
    const gl = this.gl
    for (const value of this.textCache.values()) { const surface = value.region.source as HTMLCanvasElement; surface.width = 0; surface.height = 0 }
    this.vertexUpload = new Float32Array(0); this.indexUpload = new Uint32Array(0)
    this.textCache.clear(); this.textCacheBytes = 0; this.packets = []; this.pendingTextureUploads.clear(); this.pendingTextureBytes = 0
    if (this.contextLost || gl.isContextLost()) { this.textureCache.clear(); this.materialPrograms.clear(); this.textureMemoryBytes = 0; this.textureCount = 0; return }
    gl.deleteBuffer(this.vertexBuffer)
    gl.deleteBuffer(this.indexBuffer)
    gl.deleteVertexArray(this.vao)
    this.releaseMultisampleTarget()
    if (this.framebuffer) gl.deleteFramebuffer(this.framebuffer)
    if (this.colorTarget) gl.deleteTexture(this.colorTarget)
    gl.deleteProgram(this.program)
    if (this.copyProgram) gl.deleteProgram(this.copyProgram)
    for (const state of this.materialPrograms.values()) if (state) gl.deleteProgram(state.program)
    if (this.postProgram) gl.deleteProgram(this.postProgram.program)
    for (const query of this.pendingTimers) gl.deleteQuery(query)
    for (const cached of this.textureCache.values()) gl.deleteTexture(cached.texture)
    this.textureCache.clear(); this.textureMemoryBytes = 0; this.textureCount = 0
    this.materialPrograms.clear()
  }

  /* 验证几何规模、坐标与索引后，将颜色和排序状态连同当前相机一起入队。 */
  private queue(
    order: { sortingLayer: number; orderInLayer: number; material: string; blendMode?: 'Alpha' | 'Additive' | 'Multiply' | 'Screen' },
    texture: TextureRegion | null,
    color: { r: number; g: number; b: number; a: number },
    geometry: GeometryData,
    orderOverride = order.orderInLayer
  ): void {
    if (this.packets.length >= 100_000 || !geometry.positions.length || !geometry.indices.length) return
    if (geometry.positions.length > MAX_PACKET_VERTICES) return
    if (geometry.positions.some(/* 先计算 !Number.isFinite(position.x)；仅当其为假值时求右侧 !Number.isFinite(position.y)，返回短路求值结果。 */ position => !Number.isFinite(position.x) || !Number.isFinite(position.y))) return
    if (geometry.uvs.some(/* 先计算 !Number.isFinite(uv.x)；仅当其为假值时求右侧 !Number.isFinite(uv.y)，返回短路求值结果。 */ uv => !Number.isFinite(uv.x) || !Number.isFinite(uv.y))) return
    if (geometry.indices.some(/* 先计算 !Number.isInteger(index) || index < 0；仅当其为假值时求右侧 index >= geometry.positions.length，返回短路求值结果。 */ index => !Number.isInteger(index) || index < 0 || index >= geometry.positions.length)) return
    this.packets.push({
      layer: finite(order.sortingLayer, 0), order: finite(orderOverride, 0), sequence: this.sequence++, material: order.material || 'Default',
      blend: order.blendMode ?? 'Alpha', texture, filter: texture?.filter ?? 'Linear', color: normalizedColor(color), geometry,
      camera: this.camera, cameraIndex: this.cameraIndex
    })
  }

  /* 复用上传数组合并批次几何，绑定相机和材质绘制，并更新渲染统计。 */
  private drawBatch(batch: GeometryPacket[]): void {
    const gl = this.gl
    let floats = 0, indexCount = 0
    for (const packet of batch) { floats += packet.geometry.positions.length * 8; indexCount += packet.geometry.indices.length }
    // Retain capacity between frames; upload only the used range. Geometry and order are unchanged.
    if (this.vertexUpload.length < floats) this.vertexUpload = new Float32Array(Math.max(floats, Math.min(MAX_PACKET_VERTICES * 8, Math.max(1024, this.vertexUpload.length * 2))))
    if (this.indexUpload.length < indexCount) this.indexUpload = new Uint32Array(Math.max(indexCount, Math.min(MAX_BATCH_INDICES, Math.max(1024, this.indexUpload.length * 2))))
    let vertexOffset = 0, floatOffset = 0, indexOffset = 0
    for (const packet of batch) {
      const [r, g, b, a] = packet.color
      for (let index = 0; index < packet.geometry.positions.length; index++) {
        const position = packet.geometry.positions[index], uv = packet.geometry.uvs[index]
        this.vertexUpload[floatOffset++] = position.x; this.vertexUpload[floatOffset++] = position.y
        this.vertexUpload[floatOffset++] = uv?.x ?? 0; this.vertexUpload[floatOffset++] = uv?.y ?? 0
        this.vertexUpload[floatOffset++] = r; this.vertexUpload[floatOffset++] = g
        this.vertexUpload[floatOffset++] = b; this.vertexUpload[floatOffset++] = a
      }
      for (const index of packet.geometry.indices) this.indexUpload[indexOffset++] = index + vertexOffset
      vertexOffset += packet.geometry.positions.length
    }

    const camera = batch[0].camera
    const viewport = safeViewport(camera.viewport)
    const viewportX = Math.round(viewport.x * this.canvas.width)
    const viewportY = Math.round(viewport.y * this.canvas.height)
    const viewportWidth = Math.max(1, Math.round(viewport.width * this.canvas.width))
    const viewportHeight = Math.max(1, Math.round(viewport.height * this.canvas.height))
    const scale = Math.max(1e-9, Math.abs(finite(camera.scale, 1)))
    const width = this.frame.width * viewport.width
    const height = this.frame.height * viewport.height
    const center = camera.position ?? {
      x: (this.frame.width * .5 - finite(camera.offset.x, this.frame.width * .5)) / scale,
      y: (finite(camera.offset.y, this.frame.height * .5) - this.frame.height * .5) / scale
    }
    gl.enable(gl.SCISSOR_TEST)
    try {
      gl.scissor(viewportX, viewportY, viewportWidth, viewportHeight)
      gl.viewport(viewportX, viewportY, viewportWidth, viewportHeight)
      const program = this.programFor(batch[0].material)
      gl.useProgram(program.program)
      gl.bindVertexArray(this.vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
      if (this.vertexCapacityBytes < this.vertexUpload.byteLength) {
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexUpload.byteLength, gl.DYNAMIC_DRAW)
        this.vertexCapacityBytes = this.vertexUpload.byteLength
      }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexUpload, 0, floats)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
      if (this.indexCapacityBytes < this.indexUpload.byteLength) {
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indexUpload.byteLength, gl.DYNAMIC_DRAW)
        this.indexCapacityBytes = this.indexUpload.byteLength
      }
      gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, this.indexUpload, 0, indexCount)
      gl.uniform4f(program.camera, 2 * scale / Math.max(1, width), 2 * scale / Math.max(1, height), finite(center.x, 0), finite(center.y, 0))
      const rotation = finite(camera.rotation ?? 0, 0)
      gl.uniform2f(program.rotation, Math.cos(rotation), Math.sin(rotation))
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.resolveTexture(batch[0].texture ?? this.whiteRegion, batch[0].filter))
      gl.uniform1i(program.texture, 0)
      if (program.linearTexture) gl.uniform1i(program.linearTexture, batch[0].texture?.colorSpace === 'Linear' ? 1 : 0)
      if (program.material) this.applyMaterialUniforms(program)
      if (program.material) { const writeColor = gl.getUniformLocation(program.program, 'u_writeColor'); if (writeColor) gl.uniform1i(writeColor, program.material.writeColor ? 1 : 0) }
      if (batch[0].blend === 'Additive') gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
      else if (batch[0].blend === 'Multiply') gl.blendFunc(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA)
      else if (batch[0].blend === 'Screen') gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR)
      else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_INT, 0)
      if (!this.validatedFirstDraw) {
        const error = gl.getError()
        if (error !== gl.NO_ERROR) throw new Error(`WebGL2 renderer failed its first draw (error 0x${error.toString(16)})`)
        this.validatedFirstDraw = true
      }
    } finally {
      gl.bindVertexArray(null)
      gl.disable(gl.SCISSOR_TEST)
    }
    this.stats.drawCalls++
    this.stats.batches++
    this.stats.triangles += indexCount / 3
    this.stats.overdraw += indexCount / 3
    this.stats.textures = this.textureCount
    this.stats.textureMemoryBytes = this.textureMemoryBytes
  }

  /* 缓存材质程序并随资源版本失效，验证或编译失败时记录原因并回退基础程序。 */
  private programFor(reference: string): ProgramState {
    if (this.materialGeneration !== assetState.generation) {
      for (const state of this.materialPrograms.values()) if (state) this.gl.deleteProgram(state.program)
      this.materialPrograms.clear(); this.materialGeneration = assetState.generation
    }
    if (!reference || reference === 'Default' || reference === 'Particles' || reference.startsWith('__')) return this.baseProgramState
    if (this.materialPrograms.has(reference)) return this.materialPrograms.get(reference) ?? this.baseProgramState
    if (this.materialPrograms.size >= 128) { const key = this.materialPrograms.keys().next().value!; const stale = this.materialPrograms.get(key); if (stale) this.gl.deleteProgram(stale.program); this.materialPrograms.delete(key) }
    const material = resolveMaterial(reference)
    const resolved = resolvedMaterialFragment(material)
    if ([...resolved.diagnostics, ...analyzeMaterialShader(resolved.source, material.includes)].some(/* 比较 item.severity 与 'error'，返回严格相等的判断结果。 */ item => item.severity === 'error')) { reportMaterialFallback(reference, 'shader validation failed'); this.stats.shaderFallbacks++; this.materialPrograms.set(reference, null); return this.baseProgramState }
    try {
      const program = createProgram(this.gl, materialFragment(material))
      this.stats.shaderCompiles++
      const camera = this.gl.getUniformLocation(program, 'u_camera'), texture = this.gl.getUniformLocation(program, 'u_texture'), rotation = this.gl.getUniformLocation(program, 'u_rotation')
      if (!camera || !texture || !rotation) { this.gl.deleteProgram(program); throw new Error('Material shader does not expose the renderer uniforms') }
      const state = { program, camera, texture, rotation, linearTexture: this.gl.getUniformLocation(program, 'u_linearTexture'), material }
      this.materialPrograms.set(reference, state)
      return state
    } catch (error) {
      reportMaterialFallback(reference, `shader compilation failed: ${error instanceof Error ? error.message : String(error)}`)
      this.stats.shaderFallbacks++
      this.materialPrograms.set(reference, null)
      return this.baseProgramState
    }
  }

  /** 执行时调用 this.applyResourceUniforms(state.program, state.material!)；不显式返回调用结果。 */ private applyMaterialUniforms(state: ProgramState): void {
    this.applyResourceUniforms(state.program, state.material!)
  }

  /* 将时间、数值 uniform 和有限数量的附加纹理绑定到材质程序。 */
  private applyResourceUniforms(program: WebGLProgram, material: Material2DResource): void {
    const time = this.gl.getUniformLocation(program, 'u_nova_time')
    if (time) this.gl.uniform1f(time, performance.now() / 1_000)
    for (const [name, value] of Object.entries(material.uniforms)) {
      const location = this.gl.getUniformLocation(program, name)
      if (!location) continue
      if (typeof value === 'boolean') this.gl.uniform1i(location, value ? 1 : 0)
      else if (typeof value === 'number') this.gl.uniform1f(location, value)
      else if (value.length === 2) this.gl.uniform2fv(location, value)
      else if (value.length === 3) this.gl.uniform3fv(location, value)
      else if (value.length === 4) this.gl.uniform4fv(location, value)
    }
    Object.entries(material.textures).slice(0, 7).forEach(/* 绑定一个附加纹理到对应纹理单元，缺失资源使用白色回退纹理。 */ ([name, reference], index) => {
      const location = this.gl.getUniformLocation(program, name)
      if (!location) return
      const region = resolveTextureAsset(reference, material.sampling) ?? this.whiteRegion
      this.gl.activeTexture(this.gl.TEXTURE1 + index)
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.resolveTexture(region, material.sampling))
      this.gl.uniform1i(location, index + 1)
    })
    this.gl.activeTexture(this.gl.TEXTURE0)
  }

  /* 编译或复用后处理材质并绘制全屏通道，记录失败签名以避免反复重试。 */
  private drawPostMaterial(reference: string, providedMaterial: Material2DResource | null = null): boolean {
    if (!this.colorTarget) return false
    const signature = providedMaterial ? `${reference}:${providedMaterial.fragment}` : `${reference}:${assetState.generation}`
    if (this.failedPostSignature === signature) return false
    const material = providedMaterial ?? resolveMaterial(reference), resolved = resolvedMaterialFragment(material)
    if ([...resolved.diagnostics, ...analyzeMaterialShader(resolved.source, material.includes)].some(/* 比较 item.severity 与 'error'，返回严格相等的判断结果。 */ item => item.severity === 'error')) { this.failedPostSignature = signature; reportMaterialFallback(reference, 'post-process validation failed'); this.stats.shaderFallbacks++; return false }
    const generation = providedMaterial ? signature.length + [...signature].reduce(/* 将材质签名字符累积为三十二位整数，用于内置后处理程序版本判断。 */ (sum, character) => (sum * 31 + character.charCodeAt(0)) | 0, 0) : assetState.generation
    if (!this.postProgram || this.postProgram.reference !== reference || this.postProgram.generation !== generation) {
      if (this.postProgram) this.gl.deleteProgram(this.postProgram.program)
      try {
        const program = createPostProgram(this.gl, material)
        this.stats.shaderCompiles++
        const texture = this.gl.getUniformLocation(program, 'u_texture')
        if (!texture) { this.gl.deleteProgram(program); return false }
        this.postProgram = { reference, generation, program, texture, material }
      } catch (error) { this.failedPostSignature = signature; reportMaterialFallback(reference, `post-process compilation failed: ${error instanceof Error ? error.message : String(error)}`); this.stats.shaderFallbacks++; this.postProgram = null; return false }
    }
    this.failedPostSignature = ''
    const gl = this.gl, state = this.postProgram
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.canvas.width, this.canvas.height); gl.disable(gl.BLEND)
    gl.useProgram(state.program); gl.bindVertexArray(this.vao); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.colorTarget); gl.uniform1i(state.texture, 0)
    const post = this.gl.getUniformLocation(state.program, 'u_nova_post'), extra = this.gl.getUniformLocation(state.program, 'u_nova_post_extra')
    if (post) gl.uniform4f(post, activePostProcessing.exposure, activePostProcessing.contrast, activePostProcessing.saturation, activePostProcessing.vignette)
    if (extra) gl.uniform2f(extra, activePostProcessing.bloom, activePostProcessing.blur)
    this.applyResourceUniforms(state.program, state.material); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null); gl.enable(gl.BLEND)
    return gl.getError() === gl.NO_ERROR
  }

  /** A texture draw is legal for both single- and multisampled default surfaces.
   * Blitting a resolved texture into a multisampled default framebuffer is not. */
  /* 将已解析的颜色纹理按像素读取复制到默认帧缓冲。 */
  private drawResolvedColor(): void {
    const gl = this.gl
    if (!this.copyProgram) {
      this.copyProgram = createProgram(gl, `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_texture;
out vec4 outputColor;
void main(){ outputColor=texelFetch(u_texture,ivec2(gl_FragCoord.xy),0); }`, POST_VERTEX_SOURCE)
      this.stats.shaderCompiles++
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.canvas.width, this.canvas.height); gl.disable(gl.BLEND)
    gl.useProgram(this.copyProgram); gl.bindVertexArray(this.vao)
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.colorTarget)
    gl.uniform1i(gl.getUniformLocation(this.copyProgram, 'u_texture'), 0)
    gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null); gl.enable(gl.BLEND)
  }

  /* 删除多重采样帧缓冲与颜色缓冲，并清空相关状态。 */
  private releaseMultisampleTarget(): void {
    if (this.sampleFramebuffer) this.gl.deleteFramebuffer(this.sampleFramebuffer)
    if (this.sampleColor) this.gl.deleteRenderbuffer(this.sampleColor)
    this.sampleFramebuffer = null; this.sampleColor = null; this.sampleCount = 0; this.sampleSignature = ''
  }

  /* 根据硬件能力与内存预算创建或复用多重采样表面，失败时保留无采样回退。 */
  private ensureMultisampleTarget(): void {
    const count = multisampleCount(this.requestedSamples, this.supportedSamples, this.canvas.width, this.canvas.height)
    const signature = this.canvas.width + ':' + this.canvas.height + ':' + count
    if (signature === this.sampleSignature) return
    this.releaseMultisampleTarget(); this.sampleSignature = signature
    if (!count) return
    const gl = this.gl, framebuffer = gl.createFramebuffer(), color = gl.createRenderbuffer()
    if (!framebuffer || !color) { gl.deleteFramebuffer(framebuffer); gl.deleteRenderbuffer(color); return }
    gl.bindRenderbuffer(gl.RENDERBUFFER, color)
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, count, gl.RGBA8, this.canvas.width, this.canvas.height)
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, color)
    const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE && gl.getError() === gl.NO_ERROR
    gl.bindRenderbuffer(gl.RENDERBUFFER, null); gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    if (!complete) { gl.deleteFramebuffer(framebuffer); gl.deleteRenderbuffer(color); return }
    this.sampleFramebuffer = framebuffer; this.sampleColor = color; this.sampleCount = count
  }

  /* 按需创建后处理帧缓冲及颜色纹理，并使其匹配当前画布尺寸。 */
  private ensureEffectsTarget(): void {
    const gl = this.gl
    if (!this.framebuffer) this.framebuffer = gl.createFramebuffer()
    if (!this.colorTarget) this.colorTarget = gl.createTexture()
    if (!this.framebuffer || !this.colorTarget) throw new Error('Could not allocate the optional post-process surface')
    if (this.effectsWidth !== this.canvas.width || this.effectsHeight !== this.canvas.height) this.resizeEffectsTarget(this.canvas.width, this.canvas.height)
  }

  /* 重新分配后处理颜色纹理并检查帧缓冲完整性。 */
  private resizeEffectsTarget(pixelWidth: number, pixelHeight: number): void {
    if (!this.framebuffer || !this.colorTarget) return
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.colorTarget)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, pixelWidth, pixelHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorTarget, 0)
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Renderer framebuffer is incomplete')
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    this.effectsWidth = pixelWidth; this.effectsHeight = pixelHeight
  }

  /* 非阻塞读取已完成的 GPU 计时查询，忽略不连续计时并释放查询对象。 */
  private pollGpuTimers(): void {
    if (!this.timerExtension) return
    while (this.pendingTimers.length) {
      const query = this.pendingTimers[0]
      if (!this.gl.getQueryParameter(query, this.gl.QUERY_RESULT_AVAILABLE)) break
      this.pendingTimers.shift()
      const disjoint = this.gl.getParameter(this.timerExtension.GPU_DISJOINT_EXT) as boolean
      if (!disjoint) this.lastGpuMs = Number(this.gl.getQueryParameter(query, this.gl.QUERY_RESULT)) / 1_000_000
      this.gl.deleteQuery(query)
    }
  }

  /* 按纹理内容版本更新 GPU 缓存，遵守上传和内存预算并提供白色回退。 */
  private resolveTexture(region: TextureRegion, filter: TextureFilter): WebGLTexture {
    const source = region.source as object
    const dimensions = textureDimensions(region.source)
    const maximum = this.maximumTextureDimension, weight = dimensions.width * dimensions.height * 4
    let cached = this.textureCache.get(source)
    const contentVersion = textureContentVersion(region, this.frameSerial)
    const changed = !cached || cached.width !== dimensions.width || cached.height !== dimensions.height || cached.contentVersion !== contentVersion
    if (changed && source !== this.whiteCanvas && renderingSettings.textureStreaming.enabled && !this.drainingTextureUploads && (this.stats.textureUploads >= this.uploadBudget() || this.pendingTextureUploads.size > 0)) {
      this.queueTextureUpload(region)
      if (cached) { cached.lastUsedFrame = this.frameSerial; return cached.texture }
      return this.resolveTexture(this.whiteRegion, 'Nearest')
    }
    if (!Number.isFinite(weight) || dimensions.width <= 0 || dimensions.height <= 0 || dimensions.width > maximum || dimensions.height > maximum || !this.reserveTexture(source, weight)) {
      this.stats.textureBudgetExceeded = true; this.stats.streamingMisses++
      return this.resolveTexture(this.whiteRegion, 'Nearest')
    }
    if (!cached) {
      const texture = this.gl.createTexture()
      if (!texture) throw new Error('Could not allocate WebGL texture')
      cached = { texture, width: 0, height: 0, filter: null, lastUsedFrame: this.frameSerial, contentVersion: '' }
      this.textureCache.set(source, cached)
      this.textureCount++
      this.stats.streamingMisses++
    }
    cached.lastUsedFrame = this.frameSerial
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, cached.texture)
    if (cached.width !== dimensions.width || cached.height !== dimensions.height || cached.contentVersion !== contentVersion) {
      this.textureMemoryBytes -= cached.width * cached.height * 4
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, region.source)
      this.stats.textureUploads++
      cached.width = dimensions.width
      cached.height = dimensions.height
      cached.contentVersion = contentVersion
      this.textureMemoryBytes += cached.width * cached.height * 4
    }
    if (cached.filter !== filter) {
      const value = filter === 'Nearest' ? gl.NEAREST : gl.LINEAR
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, value)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, value)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      cached.filter = filter
    }
    return cached.texture
  }

  /* 内容未缓存或版本变化时，将纹理加入延迟上传队列。 */
  preloadTexture(region: TextureRegion): void {
    const cached = this.textureCache.get(region.source as object)
    if (!cached || cached.contentVersion !== textureContentVersion(region, this.frameSerial)) this.queueTextureUpload(region)
  }

  /* 调用 Math.round(Math.min(4096, Math.max(1, finite(renderingSettings.textureStreaming.uploadBudgetPerFrame, 16)))) 并返回调用结果。 */ private uploadBudget(): number { return Math.round(Math.min(4096, Math.max(1, finite(renderingSettings.textureStreaming.uploadBudgetPerFrame, 16)))) }

  /* 校验纹理尺寸并在条目及字节预算内更新上传请求，记录延迟与超限统计。 */
  private queueTextureUpload(region: TextureRegion): void {
    const source = region.source as object, dimensions = textureDimensions(region.source)
    if (!Number.isFinite(dimensions.width * dimensions.height) || dimensions.width <= 0 || dimensions.height <= 0 || dimensions.width > 8192 || dimensions.height > 8192) return
    this.stats.textureUploadDeferrals = (this.stats.textureUploadDeferrals ?? 0) + 1
    const bytes = dimensions.width * dimensions.height * 4, previous = this.pendingTextureUploads.get(source)?.bytes ?? 0
    if ((this.pendingTextureUploads.has(source) || this.pendingTextureUploads.size < 2048) && this.pendingTextureBytes - previous + bytes <= this.textureBudget() - 4) {
      this.pendingTextureUploads.set(source, { region: { ...region, uv: { ...region.uv } }, requestedFrame: this.frameSerial, bytes }); this.pendingTextureBytes += bytes - previous
    } else this.stats.textureBudgetExceeded = true
    this.stats.textureUploadQueue = this.pendingTextureUploads.size; this.stats.textureUploadQueueBytes = this.pendingTextureBytes
  }

  /* 按每帧上传预算处理队列，丢弃过期请求并在结束时更新队列统计。 */
  private drainTextureUploads(): void {
    this.drainingTextureUploads = true
    try {
      const maximum = renderingSettings.textureStreaming.enabled ? this.uploadBudget() : 4096
      for (const [source, request] of this.pendingTextureUploads) {
        if (this.stats.textureUploads >= maximum) break
        this.pendingTextureUploads.delete(source); this.pendingTextureBytes -= request.bytes
        if (request.requestedFrame < this.frameSerial - 120) continue
        this.resolveTexture(request.region, request.region.filter)
      }
    } finally { this.drainingTextureUploads = false; this.stats.textureUploadQueue = this.pendingTextureUploads.size; this.stats.textureUploadQueueBytes = this.pendingTextureBytes }
  }

  /* 将纹理流送内存设置限制到有效范围并转换为字节预算。 */
  private textureBudget(): number { return Math.min(GPU_TEXTURE_MEMORY_LIMIT_MB, Math.max(16, finite(renderingSettings.textureStreaming.memoryBudgetMb, 256))) * 1048576 }

  /* 释放一个已缓存 GPU 纹理并更新数量、内存和淘汰统计。 */
  private evictTexture(source: object): void {
    const cached = this.textureCache.get(source); if (!cached) return
    this.gl.deleteTexture(cached.texture); this.textureCache.delete(source)
    this.textureCount--; this.textureMemoryBytes -= cached.width * cached.height * 4; this.stats.textureEvictions++
  }

  /* 为纹理分配预留容量，必要时淘汰非当前帧使用的旧资源，并保留白色回退空间。 */
  private reserveTexture(source: object, bytes: number): boolean {
    const cached = this.textureCache.get(source), previousBytes = cached ? cached.width * cached.height * 4 : 0
    const reserveFallback = source !== this.whiteCanvas && !this.textureCache.has(this.whiteCanvas)
    const budget = this.textureBudget() - (reserveFallback ? 4 : 0), entries = 2048 - (reserveFallback ? 1 : 0)
    if (bytes > budget) return false
    const over = /* 先计算 this.textureMemoryBytes - previousBytes + bytes > budget；仅当其为假值时求右侧 this.textureCache.size + (cached ? 0 : 1) > entries，返回短路求值结果。 */ () => this.textureMemoryBytes - previousBytes + bytes > budget || this.textureCache.size + (cached ? 0 : 1) > entries
    if (over()) for (const [candidate] of [...this.textureCache].filter(/* 先计算 candidate !== source && candidate !== this.whiteCanvas；仅当其为真值时求右侧 value.lastUsedFrame < this.frameSerial，返回短路求值结果。 */ ([candidate, value]) => candidate !== source && candidate !== this.whiteCanvas && value.lastUsedFrame < this.frameSerial).sort(/* 计算表达式 a[1].lastUsedFrame - b[1].lastUsedFrame 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a[1].lastUsedFrame - b[1].lastUsedFrame)) { this.evictTexture(candidate); if (!over()) break }
    return !over()
  }

  /* 按闲置帧数及内存预算淘汰纹理，保留本帧资源并同步驻留统计。 */
  private trimTextureResidency(): void {
    const budgetBytes = this.textureBudget()
    this.stats.textureBudgetBytes = budgetBytes
    if (!renderingSettings.textureStreaming.enabled) {
      this.stats.textureBudgetExceeded ||= this.textureMemoryBytes > budgetBytes
      this.stats.textures = this.textureCount
      this.stats.textureMemoryBytes = this.textureMemoryBytes
      return
    }
    const idleBefore = this.frameSerial - Math.max(2, renderingSettings.textureStreaming.idleFrames)
    const candidates = [...this.textureCache.entries()]
      .filter(/* 先计算 source !== this.whiteCanvas；仅当其为真值时求右侧 cached.lastUsedFrame < this.frameSerial，返回短路求值结果。 */ ([source, cached]) => source !== this.whiteCanvas && cached.lastUsedFrame < this.frameSerial)
      .sort(/* 优先按最后使用帧排序，再按像素面积排序确定纹理淘汰次序。 */ (first, second) => first[1].lastUsedFrame - second[1].lastUsedFrame || first[1].width * first[1].height - second[1].width * second[1].height)
    for (const [source, cached] of candidates) {
      if (cached.lastUsedFrame > idleBefore && this.textureMemoryBytes <= budgetBytes) break
      this.gl.deleteTexture(cached.texture)
      this.textureCache.delete(source)
      this.textureCount = Math.max(0, this.textureCount - 1)
      this.textureMemoryBytes = Math.max(0, this.textureMemoryBytes - cached.width * cached.height * 4)
      this.stats.textureEvictions++
    }
    this.stats.textureBudgetExceeded ||= this.textureMemoryBytes > budgetBytes
    this.stats.textures = this.textureCount
    this.stats.textureMemoryBytes = this.textureMemoryBytes
  }

  /* 将有限行数的文字和描边栅格化到受预算限制的画布，并缓存其纹理及宽高比。 */
  private textTexture(command: TextRenderCommand): CachedText | null {
    const key = [command.text, command.fontFamily, command.fontWeight, command.fontSize, command.lineHeight, command.outlineWidth, command.outlineColor.r, command.outlineColor.g, command.outlineColor.b, command.outlineColor.a].join('|')
    const existing = this.textCache.get(key)
    if (existing) { existing.lastUsedFrame = this.frameSerial; return existing }
    const fontPixels = 64
    const rasterOutline = Math.max(0, command.outlineWidth / Math.max(1, command.fontSize) * fontPixels)
    const padding = Math.ceil(8 + rasterOutline * 2)
    const lines = command.text.split('\n').slice(0, 64)
    const measureCanvas = document.createElement('canvas')
    const measure = measureCanvas.getContext('2d')!
    measure.font = `${command.fontWeight} ${fontPixels}px ${command.fontFamily}`
    const width = Math.max(1, Math.ceil(Math.max(...lines.map(/* 返回 measure.measureText(line || ' ').width 的当前值。 */ line => measure.measureText(line || ' ').width)) + padding * 2))
    const height = Math.max(1, Math.ceil(lines.length * fontPixels * command.lineHeight + padding * 2))
    const bytes = Math.min(4096, width) * Math.min(4096, height) * 4
    for (const [key, value] of this.textCache) { if (this.textCache.size < 256 && this.textCacheBytes + bytes <= 64 * 1048576) break; if (value.lastUsedFrame === this.frameSerial) continue; this.textCache.delete(key); this.textCacheBytes -= value.bytes; this.evictTexture(value.region.source as object); const surface = value.region.source as HTMLCanvasElement; surface.width = 0; surface.height = 0 }
    if (this.textCache.size >= 256 || this.textCacheBytes + bytes > 64 * 1048576) { this.stats.textureBudgetExceeded = true; this.stats.streamingMisses++; return null }
    const canvas = document.createElement('canvas')
    canvas.width = Math.min(4096, width)
    canvas.height = Math.min(4096, height)
    const context = canvas.getContext('2d')!
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = 'white'
    context.font = `${command.fontWeight} ${fontPixels}px ${command.fontFamily}`
    context.textBaseline = 'top'
    if (rasterOutline > 0 && command.outlineColor.a > 0) {
      context.strokeStyle = `rgba(${command.outlineColor.r}, ${command.outlineColor.g}, ${command.outlineColor.b}, ${command.outlineColor.a})`
      context.lineWidth = rasterOutline * 2
      context.lineJoin = 'round'
    }
    lines.forEach(/* 按行高定位一行文字，先绘制可见描边再填充正文。 */ (line, index) => {
      const y = padding + index * fontPixels * command.lineHeight
      if (rasterOutline > 0 && command.outlineColor.a > 0) context.strokeText(line, padding, y)
      context.fillText(line, padding, y)
    })
    const cached: CachedText = {
      region: { key: `text:${key}`, source: canvas, uv: { x: 0, y: 0, width: 1, height: 1 }, filter: 'Linear' },
      aspect: canvas.width / Math.max(1, canvas.height), bytes, lastUsedFrame: this.frameSerial
    }
    this.textCache.set(key, cached); this.textCacheBytes += bytes
    return cached
  }
}
