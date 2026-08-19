import { nineSliceGeometry, shapeGeometry, spriteGeometry, strokeGeometry, type GeometryData } from './geometry'
import { assetState, resolveTexture as resolveTextureAsset } from '../assets/AssetDatabase'
import { analyzeMaterialShader, reflectShaderUniforms, resolvedMaterialFragment, resolveMaterial, type Material2DResource } from './materials'
import { reportRendererContextLost, reportRendererContextRestored } from './capabilities'
import { renderingSettings } from './renderSettings'
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
}

interface CachedText {
  region: TextureRegion
  aspect: number
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

function createProgram(gl: WebGL2RenderingContext, fragmentSource = FRAGMENT_SOURCE): WebGLProgram {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SOURCE)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = gl.createProgram()
  if (!program) throw new Error('Could not allocate WebGL program')
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'Unknown shader link error'
    gl.deleteProgram(program)
    throw new Error(message)
  }
  return program
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

function materialFragment(material: Material2DResource): string {
  const resolved = resolvedMaterialFragment(material)
  const declared = new Set(reflectShaderUniforms(resolved.source).map(field => field.name))
  const uniforms = Object.entries(material.uniforms).filter(([name]) => !declared.has(name)).map(([name, value]) => Array.isArray(value)
    ? `uniform vec${value.length} ${name};`
    : typeof value === 'boolean' ? `uniform bool ${name};` : `uniform float ${name};`).join('\n')
  const textures = Object.keys(material.textures).filter(name => !declared.has(name)).map(name => `uniform sampler2D ${name};`).join('\n')
  const converted = material.colorSpace === 'Linear' ? `vec4(pow(max(result.rgb, vec3(0.0)), vec3(1.0 / 2.2)), result.a)` : 'result'
  return `#version 300 es
precision highp float;
in vec2 v_uv;
in vec4 v_color;
uniform sampler2D u_texture;
uniform bool u_linearTexture;
${uniforms}
${textures}
${resolved.source}
out vec4 outputColor;
void main(){ vec4 sampled=texture(u_texture,v_uv); if(u_linearTexture) sampled=vec4(pow(max(sampled.rgb,vec3(0.0)),vec3(1.0/2.2)),sampled.a); vec4 shaded=nova_material(sampled * v_color,v_uv); vec4 result=u_writeColor ? shaded : vec4(sampled.rgb * v_color.rgb, shaded.a); outputColor = ${converted}; }`
}

function postMaterialFragment(material: Material2DResource): string {
  const resolved = resolvedMaterialFragment(material)
  const declared = new Set(reflectShaderUniforms(resolved.source).map(field => field.name))
  const uniforms = Object.entries(material.uniforms).filter(([name]) => !declared.has(name)).map(([name, value]) => Array.isArray(value)
    ? `uniform vec${value.length} ${name};`
    : typeof value === 'boolean' ? `uniform bool ${name};` : `uniform float ${name};`).join('\n')
  const textures = Object.keys(material.textures).filter(name => !declared.has(name)).map(name => `uniform sampler2D ${name};`).join('\n')
  const converted = material.colorSpace === 'Linear' ? 'vec4(pow(max(result.rgb,vec3(0.0)),vec3(1.0/2.2)),result.a)' : 'result'
  return `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_texture;
${uniforms}
${textures}
${resolved.source}
out vec4 outputColor;
void main(){ vec4 result=nova_material(texture(u_texture,v_uv),v_uv); outputColor=${converted}; }`
}

function createPostProgram(gl: WebGL2RenderingContext, material: Material2DResource): WebGLProgram {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, POST_VERTEX_SOURCE)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, postMaterialFragment(material))
  const program = gl.createProgram()
  if (!program) throw new Error('Could not allocate post-process program')
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program)
  gl.deleteShader(vertex); gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { const message = gl.getProgramInfoLog(program) || 'Post-process shader link failed'; gl.deleteProgram(program); throw new Error(message) }
  return program
}

function textureDimensions(source: TexImageSource): { width: number; height: number } {
  if (source instanceof HTMLImageElement) return { width: source.naturalWidth, height: source.naturalHeight }
  if (source instanceof HTMLVideoElement) return { width: source.videoWidth, height: source.videoHeight }
  const value = source as { width?: number; height?: number }
  return { width: Math.max(1, value.width ?? 1), height: Math.max(1, value.height ?? 1) }
}

export class WebGL2Renderer implements Renderer2D {
  readonly stats: RendererStats = { backend: 'WebGL2', drawCalls: 0, batches: 0, triangles: 0, sprites: 0, shapes: 0, text: 0, textures: 0, gpuMs: null, passes: 1, renderTargets: 1, overdraw: 0, batchBreaks: 0, atlasPages: 0 }
  private readonly gl: WebGL2RenderingContext
  private readonly program: WebGLProgram
  private readonly vao: WebGLVertexArrayObject
  private readonly vertexBuffer: WebGLBuffer
  private readonly indexBuffer: WebGLBuffer
  private framebuffer: WebGLFramebuffer | null = null
  private colorTarget: WebGLTexture | null = null
  private readonly baseProgramState: ProgramState
  private readonly materialPrograms = new Map<string, ProgramState | null>()
  private materialGeneration = -1
  private postProgram: (PostProgramState & { reference: string; generation: number }) | null = null
  private readonly timerExtension: TimerQueryExtension | null
  private activeTimer: WebGLQuery | null = null
  private pendingTimers: WebGLQuery[] = []
  private lastGpuMs: number | null = null
  private readonly whiteCanvas: HTMLCanvasElement
  private readonly whiteRegion: TextureRegion
  private readonly textureCache = new WeakMap<object, CachedTexture>()
  private readonly textCache = new Map<string, CachedText>()
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
  private readonly onContextLost = (event: Event) => {
    event.preventDefault()
    this.contextLost = true
    this.activeTimer = null
    this.pendingTimers = []
    reportRendererContextLost()
  }
  private readonly onContextRestored = () => {
    this.contextLost = false
    reportRendererContextRestored()
    window.dispatchEvent(new CustomEvent('nova-renderer-reset-request'))
  }

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: true, depth: false, premultipliedAlpha: true, powerPreference: 'high-performance' })
    if (!gl) throw new Error('WebGL2 is unavailable')
    this.gl = gl
    canvas.addEventListener('webglcontextlost', this.onContextLost)
    canvas.addEventListener('webglcontextrestored', this.onContextRestored)
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
    this.whiteRegion = { key: '__white', source: this.whiteCanvas, uv: { x: 0, y: 0, width: 1, height: 1 }, filter: 'Nearest' }
  }

  resize(width: number, height: number, pixelRatio: number): void {
    const pixelWidth = Math.max(1, Math.round(width * pixelRatio))
    const pixelHeight = Math.max(1, Math.round(height * pixelRatio))
    if (this.targetWidth === pixelWidth && this.targetHeight === pixelHeight) return
    this.targetWidth = pixelWidth
    this.targetHeight = pixelHeight
    if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth
    if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight
    if (this.framebuffer && this.colorTarget) this.resizeEffectsTarget(pixelWidth, pixelHeight)
  }

  beginFrame(options: FrameOptions): void {
    this.frame = options
    this.resize(options.width, options.height, options.pixelRatio)
    this.packets = []
    this.sequence = 0
    this.cameraIndex = -1
    if (this.contextLost || this.gl.isContextLost()) return
    this.effectsTargetActive = Boolean(renderingSettings.postProcessing.enabled && renderingSettings.postProcessing.userMaterial)
    if (this.effectsTargetActive) this.ensureEffectsTarget()
    this.pollGpuTimers()
    Object.assign(this.stats, { drawCalls: 0, batches: 0, triangles: 0, sprites: 0, shapes: 0, text: 0, textures: 0, gpuMs: this.lastGpuMs, passes: 1, renderTargets: this.effectsTargetActive ? 1 : 0, overdraw: 0, batchBreaks: 0, atlasPages: assetState.atlasPages.length })
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.effectsTargetActive ? this.framebuffer : null)
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

  beginCamera(camera: CameraRenderView): void { this.camera = camera; this.cameraIndex++ }

  submitSprite(command: SpriteRenderCommand): void {
    this.stats.sprites++
    this.queue(command, command.texture, command.tint, command.mesh ? spriteGeometry(command) : command.nineSlice ? nineSliceGeometry(command) : spriteGeometry(command))
  }

  submitShape(command: ShapeRenderCommand): void {
    this.stats.shapes++
    if (command.fill.a > 0 && command.shape !== 'Line') this.queue(command, command.texture ?? this.whiteRegion, command.fill, shapeGeometry(command))
    const stroke = strokeGeometry(command)
    if (stroke) this.queue(command, this.whiteRegion, command.stroke, stroke, command.orderInLayer + .0001)
  }

  submitText(command: TextRenderCommand): void {
    if (!command.text.trim() || command.color.a <= 0) return
    this.stats.text++
    const cached = this.textTexture(command)
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

  submitTileChunk(command: TileChunkRenderCommand): void {
    for (const sprite of command.sprites) this.submitSprite({ ...sprite, sortingLayer: command.sortingLayer, orderInLayer: command.orderInLayer, material: command.material, blendMode: command.blendMode })
  }

  endCamera(): void { /* Commands are flushed at endFrame to preserve global sorting. */ }

  endFrame(): RendererStats {
    if (this.contextLost || this.gl.isContextLost()) return { ...this.stats }
    this.packets.sort((first, second) => first.cameraIndex - second.cameraIndex || first.layer - second.layer || first.order - second.order || first.material.localeCompare(second.material) || first.sequence - second.sequence)
    let batch: GeometryPacket[] = []
    const flush = () => {
      if (!batch.length) return
      this.drawBatch(batch)
      batch = []
    }
    for (const packet of this.packets) {
      const previous = batch[0]
      const sameBatch = previous
        && previous.cameraIndex === packet.cameraIndex
        && previous.texture?.source === packet.texture?.source
        && previous.filter === packet.filter
        && previous.material === packet.material
        && previous.blend === packet.blend
      const vertexCount = batch.reduce((total, item) => total + item.geometry.positions.length, 0)
      if (!sameBatch || vertexCount + packet.geometry.positions.length > 65_000) flush()
      batch.push(packet)
    }
    flush()
    this.stats.batchBreaks = Math.max(0, this.stats.batches - 1)
    const gl = this.gl
    const postMaterial = this.effectsTargetActive ? renderingSettings.postProcessing.userMaterial : null
    if (postMaterial && !this.drawPostMaterial(postMaterial)) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.framebuffer)
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
      gl.blitFramebuffer(0, 0, this.canvas.width, this.canvas.height, 0, 0, this.canvas.width, this.canvas.height, gl.COLOR_BUFFER_BIT, gl.NEAREST)
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
    return { ...this.stats }
  }

  destroy(): void {
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored)
    const gl = this.gl
    gl.deleteBuffer(this.vertexBuffer)
    gl.deleteBuffer(this.indexBuffer)
    gl.deleteVertexArray(this.vao)
    if (this.framebuffer) gl.deleteFramebuffer(this.framebuffer)
    if (this.colorTarget) gl.deleteTexture(this.colorTarget)
    gl.deleteProgram(this.program)
    for (const state of this.materialPrograms.values()) if (state) gl.deleteProgram(state.program)
    if (this.postProgram) gl.deleteProgram(this.postProgram.program)
    for (const query of this.pendingTimers) gl.deleteQuery(query)
    this.materialPrograms.clear()
    this.textCache.clear()
  }

  private queue(
    order: { sortingLayer: number; orderInLayer: number; material: string; blendMode?: 'Alpha' | 'Additive' | 'Multiply' | 'Screen' },
    texture: TextureRegion | null,
    color: { r: number; g: number; b: number; a: number },
    geometry: GeometryData,
    orderOverride = order.orderInLayer
  ): void {
    if (!geometry.positions.length || !geometry.indices.length) return
    this.packets.push({
      layer: order.sortingLayer, order: orderOverride, sequence: this.sequence++, material: order.material || 'Default',
      blend: order.blendMode ?? 'Alpha', texture, filter: texture?.filter ?? 'Linear', color: normalizedColor(color), geometry,
      camera: this.camera, cameraIndex: this.cameraIndex
    })
  }

  private drawBatch(batch: GeometryPacket[]): void {
    const gl = this.gl
    const vertices: number[] = []
    const indices: number[] = []
    let vertexOffset = 0
    for (const packet of batch) {
      const [r, g, b, a] = packet.color
      packet.geometry.positions.forEach((position, index) => {
        const uv = packet.geometry.uvs[index] ?? { x: 0, y: 0 }
        vertices.push(position.x, position.y, uv.x, uv.y, r, g, b, a)
      })
      packet.geometry.indices.forEach(index => indices.push(index + vertexOffset))
      vertexOffset += packet.geometry.positions.length
    }

    const camera = batch[0].camera
    const viewport = camera.viewport ?? { x: 0, y: 0, width: 1, height: 1 }
    const viewportX = Math.round(viewport.x * this.canvas.width)
    const viewportY = Math.round(viewport.y * this.canvas.height)
    const viewportWidth = Math.max(1, Math.round(viewport.width * this.canvas.width))
    const viewportHeight = Math.max(1, Math.round(viewport.height * this.canvas.height))
    gl.enable(gl.SCISSOR_TEST)
    gl.scissor(viewportX, viewportY, viewportWidth, viewportHeight)
    gl.viewport(viewportX, viewportY, viewportWidth, viewportHeight)
    const program = this.programFor(batch[0].material)
    gl.useProgram(program.program)
    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.DYNAMIC_DRAW)
    const width = this.frame.width * viewport.width
    const height = this.frame.height * viewport.height
    const center = camera.position ?? {
      x: (this.frame.width * .5 - camera.offset.x) / camera.scale,
      y: (camera.offset.y - this.frame.height * .5) / camera.scale
    }
    gl.uniform4f(
      program.camera,
      2 * camera.scale / Math.max(1, width),
      2 * camera.scale / Math.max(1, height),
      center.x,
      center.y
    )
    const rotation = camera.rotation ?? 0
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
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_INT, 0)
    if (!this.validatedFirstDraw) {
      const error = gl.getError()
      if (error !== gl.NO_ERROR) throw new Error(`WebGL2 renderer failed its first draw (error 0x${error.toString(16)})`)
      this.validatedFirstDraw = true
    }
    gl.bindVertexArray(null)
    gl.disable(gl.SCISSOR_TEST)
    this.stats.drawCalls++
    this.stats.batches++
    this.stats.triangles += indices.length / 3
    this.stats.overdraw += indices.length / 3
    this.stats.textures = Math.max(this.stats.textures, batch[0].texture ? 1 : 0)
  }

  private programFor(reference: string): ProgramState {
    if (this.materialGeneration !== assetState.generation) {
      for (const state of this.materialPrograms.values()) if (state) this.gl.deleteProgram(state.program)
      this.materialPrograms.clear(); this.materialGeneration = assetState.generation
    }
    if (!reference || reference === 'Default' || reference === 'Particles' || reference.startsWith('__')) return this.baseProgramState
    if (this.materialPrograms.has(reference)) return this.materialPrograms.get(reference) ?? this.baseProgramState
    const material = resolveMaterial(reference)
    if (analyzeMaterialShader(material.fragment, material.includes).some(item => item.severity === 'error')) { this.materialPrograms.set(reference, null); return this.baseProgramState }
    try {
      const program = createProgram(this.gl, materialFragment(material))
      const camera = this.gl.getUniformLocation(program, 'u_camera'), texture = this.gl.getUniformLocation(program, 'u_texture'), rotation = this.gl.getUniformLocation(program, 'u_rotation')
      if (!camera || !texture || !rotation) throw new Error('Material shader does not expose the renderer uniforms')
      const state = { program, camera, texture, rotation, linearTexture: this.gl.getUniformLocation(program, 'u_linearTexture'), material }
      this.materialPrograms.set(reference, state)
      return state
    } catch {
      this.materialPrograms.set(reference, null)
      return this.baseProgramState
    }
  }

  private applyMaterialUniforms(state: ProgramState): void {
    this.applyResourceUniforms(state.program, state.material!)
  }

  private applyResourceUniforms(program: WebGLProgram, material: Material2DResource): void {
    for (const [name, value] of Object.entries(material.uniforms)) {
      const location = this.gl.getUniformLocation(program, name)
      if (!location) continue
      if (typeof value === 'boolean') this.gl.uniform1i(location, value ? 1 : 0)
      else if (typeof value === 'number') this.gl.uniform1f(location, value)
      else if (value.length === 2) this.gl.uniform2fv(location, value)
      else if (value.length === 3) this.gl.uniform3fv(location, value)
      else if (value.length === 4) this.gl.uniform4fv(location, value)
    }
    Object.entries(material.textures).slice(0, 7).forEach(([name, reference], index) => {
      const location = this.gl.getUniformLocation(program, name)
      if (!location) return
      const region = resolveTextureAsset(reference, material.sampling) ?? this.whiteRegion
      this.gl.activeTexture(this.gl.TEXTURE1 + index)
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.resolveTexture(region, material.sampling))
      this.gl.uniform1i(location, index + 1)
    })
    this.gl.activeTexture(this.gl.TEXTURE0)
  }

  private drawPostMaterial(reference: string): boolean {
    if (!this.colorTarget) return false
    const material = resolveMaterial(reference)
    if (analyzeMaterialShader(material.fragment, material.includes).some(item => item.severity === 'error')) return false
    if (!this.postProgram || this.postProgram.reference !== reference || this.postProgram.generation !== assetState.generation) {
      if (this.postProgram) this.gl.deleteProgram(this.postProgram.program)
      try {
        const program = createPostProgram(this.gl, material)
        const texture = this.gl.getUniformLocation(program, 'u_texture')
        if (!texture) { this.gl.deleteProgram(program); return false }
        this.postProgram = { reference, generation: assetState.generation, program, texture, material }
      } catch { this.postProgram = null; return false }
    }
    const gl = this.gl, state = this.postProgram
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.canvas.width, this.canvas.height); gl.disable(gl.BLEND)
    gl.useProgram(state.program); gl.bindVertexArray(this.vao); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.colorTarget); gl.uniform1i(state.texture, 0)
    this.applyResourceUniforms(state.program, state.material); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null); gl.enable(gl.BLEND)
    return gl.getError() === gl.NO_ERROR
  }

  private ensureEffectsTarget(): void {
    const gl = this.gl
    if (!this.framebuffer) this.framebuffer = gl.createFramebuffer()
    if (!this.colorTarget) this.colorTarget = gl.createTexture()
    if (!this.framebuffer || !this.colorTarget) throw new Error('Could not allocate the optional post-process surface')
    if (this.effectsWidth !== this.canvas.width || this.effectsHeight !== this.canvas.height) this.resizeEffectsTarget(this.canvas.width, this.canvas.height)
  }

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

  private resolveTexture(region: TextureRegion, filter: TextureFilter): WebGLTexture {
    const source = region.source as object
    const dimensions = textureDimensions(region.source)
    let cached = this.textureCache.get(source)
    if (!cached) {
      const texture = this.gl.createTexture()
      if (!texture) throw new Error('Could not allocate WebGL texture')
      cached = { texture, width: 0, height: 0, filter: null }
      this.textureCache.set(source, cached)
    }
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, cached.texture)
    if (cached.width !== dimensions.width || cached.height !== dimensions.height) {
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, region.source)
      cached.width = dimensions.width
      cached.height = dimensions.height
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

  private textTexture(command: TextRenderCommand): CachedText {
    const key = [command.text, command.fontFamily, command.fontWeight, command.lineHeight, command.outlineWidth, command.outlineColor.r, command.outlineColor.g, command.outlineColor.b, command.outlineColor.a].join('|')
    const existing = this.textCache.get(key)
    if (existing) return existing
    const fontPixels = 64
    const rasterOutline = Math.max(0, command.outlineWidth / Math.max(1, command.fontSize) * fontPixels)
    const padding = Math.ceil(8 + rasterOutline * 2)
    const lines = command.text.split('\n').slice(0, 64)
    const measureCanvas = document.createElement('canvas')
    const measure = measureCanvas.getContext('2d')!
    measure.font = `${command.fontWeight} ${fontPixels}px ${command.fontFamily}`
    const width = Math.max(1, Math.ceil(Math.max(...lines.map(line => measure.measureText(line || ' ').width)) + padding * 2))
    const height = Math.max(1, Math.ceil(lines.length * fontPixels * command.lineHeight + padding * 2))
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
    lines.forEach((line, index) => {
      const y = padding + index * fontPixels * command.lineHeight
      if (rasterOutline > 0 && command.outlineColor.a > 0) context.strokeText(line, padding, y)
      context.fillText(line, padding, y)
    })
    const cached: CachedText = {
      region: { key: `text:${key}`, source: canvas, uv: { x: 0, y: 0, width: 1, height: 1 }, filter: 'Linear' },
      aspect: canvas.width / Math.max(1, canvas.height)
    }
    this.textCache.set(key, cached)
    if (this.textCache.size > 256) this.textCache.delete(this.textCache.keys().next().value as string)
    return cached
  }
}
