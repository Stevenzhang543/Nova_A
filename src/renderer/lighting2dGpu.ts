/** 26.42 P-D: 2D lighting on the WebGL2 renderer.
 *
 * The Canvas 2D overlay (lighting2d.ts) darkened the whole view and "punched" light back in on a second
 * canvas the browser had to composite on top of the WebGL2 surface. Here the same light set is drawn into a
 * half-resolution light buffer on the GPU and multiplied into the scene inside the world pass, so the light is
 * part of the submitted frame and of the GPU timer.
 *
 * Model (documented difference from 26.41): scene × L, with L = ambient + Σ lights, stored as L/2 so values up
 * to 2 (a light brighter than the unlit scene) survive an RGBA8 target. Lights reach every drawn surface in
 * their range, including the background colour; the Canvas 2D path lit only the shapes of target objects.
 * Shadows are quads extruded to infinity per light, accumulated as a transmittance mask and blurred on the
 * Soft and Ultra shadow qualities. Normal-mapped sprites write their world-space normals into a normal buffer
 * that shades each light.
 *
 * Projects that use light layer masks or sprite light masks keep the Canvas 2D path, and the reason is reported
 * in the renderer statistics. */
import { entityBoundaryPoints } from '../world/Connection'
import type { Light2D, ShadowCaster2D } from '../world/components'
import type { Entity } from '../world/Entity'
import { worldTransform } from '../world/hierarchy'
import type { LightingEnvironment } from './LightingEnvironment'

const ALL_LAYERS = 0xffff_ffff

export interface GpuLight2D {
  /** 0 point, 1 spot, 2 area, 3 directional */
  type: number
  x: number; y: number
  rotation: number
  /** linear RGB multiplier added to L at the light's centre (already scaled by darkness and intensity) */
  r: number; g: number; b: number
  range: number
  /** fraction of the radius where the falloff reaches its knee (Canvas 2D: 1 - softness) */
  knee: number
  innerHalfAngle: number; outerHalfAngle: number
  areaWidth: number; areaHeight: number
  /** x0,y0,x1,y1,opacity per shadow edge */
  shadowEdges: Float32Array
  /** triangle fans (x,y) for casters that do not shadow themselves; [count, ...points] per caster */
  unshadowed: Float32Array
}

export interface GpuLightingFrame {
  ambient: [number, number, number]
  lights: GpuLight2D[]
  /** Shadow softening radius in full-resolution pixels: Hard 0, Soft 4, Ultra 8 (the Canvas 2D blur radii). */
  shadowBlur?: number
}

export interface GpuLightingBuild { frame: GpuLightingFrame | null; fallback: string | null }

const forcedCanvas = (() => {
  try { return typeof location !== 'undefined' && new URLSearchParams(location.search).get('lighting') === 'canvas' } catch { return false }
})()
/** `?lighting=canvas` or `globalThis.__NOVA_FORCE_CANVAS_LIGHTING = true` keeps the 26.41 Canvas 2D path (compatibility switch). */
export function canvasLightingForced(): boolean { return forcedCanvas || (globalThis as { __NOVA_FORCE_CANVAS_LIGHTING?: boolean }).__NOVA_FORCE_CANVAS_LIGHTING === true }

/* 与 lighting2d.ts 的 compatibleTargets 相同的可见性规则（不含层掩码，层掩码会改走 Canvas 2D）。 */
function visibleInView(entity: Entity, gameView: boolean, activeLayer: number): boolean {
  return entity.enabled && entity.authoring.visible && (gameView || (entity.editorVisible && entity.layer === activeLayer))
}

/** Collect this frame's lights in world space, or report why the Canvas 2D path must be used. */
export function buildGpuLighting(entities: Entity[], gameView: boolean, activeLayer: number, environment: LightingEnvironment): GpuLightingBuild {
  const settings = environment.settings
  if (!settings.lightingEnabled) return { frame: null, fallback: null }
  if (canvasLightingForced()) return { frame: null, fallback: 'forced' }
  const lights: Array<{ entity: Entity; light: Light2D }> = []
  for (const entity of entities) {
    const light = entity.getComponent<Light2D>('Light2D')
    if (!light?.enabled || light.removed || !visibleInView(entity, gameView, activeLayer)) continue
    if ((light.layerMask >>> 0) !== ALL_LAYERS) return { frame: null, fallback: 'light layer mask' }
    lights.push({ entity, light })
  }
  for (const entity of entities) {
    if (!visibleInView(entity, gameView, activeLayer)) continue
    const sprite = entity.spriteRenderer
    if (!sprite) continue
    if ((sprite.lightMask >>> 0) !== ALL_LAYERS) return { frame: null, fallback: 'sprite light mask' }
  }
  const ambientColor = settings.ambientColor, darkness = Math.max(0, 1 - Math.min(1, settings.ambientIntensity))
  // Canvas 2D: scene·(1-d) + ambient·0.08·d. As a multiplier: (1-d) + d·0.08·ambient.
  const ambient: [number, number, number] = [0, 1, 2].map(index => (1 - darkness) + darkness * .08 * [ambientColor.r, ambientColor.g, ambientColor.b][index] / 255) as [number, number, number]
  const shadowQuality = environment.renderQuality.shadowQuality
  const samples = shadowQuality === 'Ultra' ? 64 : shadowQuality === 'Soft' ? 32 : 12
  const casters: Array<{ entity: Entity; caster: ShadowCaster2D; boundary: { x: number; y: number }[]; orientation: number }> = []
  if (shadowQuality !== 'Off') for (const entity of entities) {
    const caster = entity.getComponent<ShadowCaster2D>('ShadowCaster2D')
    if (!caster?.enabled || caster.removed || !visibleInView(entity, gameView, activeLayer)) continue
    const boundary = entityBoundaryPoints(entity, samples, entities)
    if (boundary.length < 2) continue
    let twiceArea = 0
    for (let index = 0; index < boundary.length; index++) { const a = boundary[index], b = boundary[(index + 1) % boundary.length]; twiceArea += a.x * b.y - b.x * a.y }
    casters.push({ entity, caster, boundary, orientation: twiceArea < 0 ? -1 : 1 })
  }
  const built: GpuLight2D[] = []
  for (const { entity, light } of lights) {
    const transform = worldTransform(entity, entities)
    const strength = Math.min(1, Math.max(0, light.intensity) / 4)
    const color = [light.color.r / 255, light.color.g / 255, light.color.b / 255]
    // Canvas 2D restored `strength` of the darkness and screened a tint of up to .45 on top.
    const tint = Math.min(.45, strength * .32)
    const rgb = color.map(channel => darkness * strength * (.65 + .35 * channel) + tint * channel)
    const type = light.lightType === 'Spot' ? 1 : light.lightType === 'Area' ? 2 : light.lightType === 'Directional' ? 3 : 0
    const edges: number[] = [], fans: number[] = []
    if (type !== 3 && light.castsShadows && shadowQuality !== 'Off') for (const { entity: casterEntity, caster, boundary, orientation } of casters) {
      if ((caster.layerMask & light.layerMask) === 0 || (casterEntity === entity && !caster.selfShadows)) continue
      const opacity = Math.min(1, Math.max(0, caster.opacity))
      if (opacity <= 0) continue
      for (let index = 0; index < boundary.length; index++) {
        const first = boundary[index], second = boundary[(index + 1) % boundary.length]
        // Only edges facing the light: their extrusions tile the caster and its shadow without overlapping,
        // so a shadow is applied once (the Canvas 2D path filled the union of all edge quads).
        const normalX = (second.y - first.y) * orientation, normalY = -(second.x - first.x) * orientation
        if (normalX * (transform.position.x - (first.x + second.x) * .5) + normalY * (transform.position.y - (first.y + second.y) * .5) <= 0) continue
        edges.push(first.x, first.y, second.x, second.y, opacity)
      }
      if (!caster.selfShadows && boundary.length >= 3) { fans.push(boundary.length); for (const point of boundary) fans.push(point.x, point.y) }
    }
    built.push({
      type, x: transform.position.x, y: transform.position.y, rotation: transform.rotation,
      r: rgb[0], g: rgb[1], b: rgb[2], range: Math.max(.0001, light.range),
      knee: Math.max(.05, 1 - Math.min(.98, Math.max(.02, light.shadowSoftness))),
      innerHalfAngle: Math.min(light.outerAngle, Math.max(0, light.innerAngle)) * Math.PI / 360, outerHalfAngle: Math.max(.001, light.outerAngle) * Math.PI / 360,
      areaWidth: Math.max(.0001, light.areaSize.x), areaHeight: Math.max(.0001, light.areaSize.y),
      shadowEdges: new Float32Array(edges), unshadowed: new Float32Array(fans)
    })
  }
  return { frame: { ambient, lights: built, shadowBlur: shadowQuality === 'Ultra' ? 8 : shadowQuality === 'Soft' ? 4 : 0 }, fallback: null }
}

const LIGHT_VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_position;
layout(location=1) in float a_opacity;
uniform vec4 u_camera;
uniform vec2 u_rotation;
uniform bool u_clip;
out vec2 v_world;
out float v_opacity;
void main(){
  v_world = a_position.xy;
  v_opacity = a_opacity;
  if (u_clip) { gl_Position = vec4(a_position.xy, 0.0, 1.0); return; }
  // w = 0 marks a point at infinity (shadow extrusion): direction only, no camera translation.
  vec2 relative = a_position.xy - u_camera.zw * a_position.z;
  vec2 view = vec2(relative.x * u_rotation.x + relative.y * u_rotation.y, -relative.x * u_rotation.y + relative.y * u_rotation.x);
  gl_Position = vec4(view.x * u_camera.x, view.y * u_camera.y, 0.0, a_position.z);
}`

const LIGHT_FRAGMENT = `#version 300 es
precision highp float;
in vec2 v_world;
in float v_opacity;
uniform int u_mode; // 0 light, 1 shadow transmittance, 2 restore caster
uniform int u_type;
uniform vec2 u_center;
uniform vec2 u_axis;
uniform vec3 u_color;
uniform vec4 u_shape; // range, knee, innerHalf, outerHalf
uniform vec2 u_area;
uniform bool u_useMask;
uniform bool u_useNormals;
uniform sampler2D u_mask;
uniform sampler2D u_normals;
uniform vec2 u_targetSize;
out vec4 outputColor;
void main(){
  if (u_mode == 1) { outputColor = vec4(vec3(1.0 - v_opacity), 1.0); return; }
  if (u_mode == 2) { outputColor = vec4(1.0); return; }
  float falloff = 1.0;
  vec2 toLight = -u_axis;
  if (u_type != 3) {
    vec2 delta = v_world - u_center;
    float t = length(delta) / u_shape.x;
    if (t >= 1.0) discard;
    float knee = u_shape.y;
    falloff = t < knee ? mix(1.0, .82, t / knee) : mix(.82, 0.0, (t - knee) / max(.0001, 1.0 - knee));
    vec2 local = vec2(dot(delta, u_axis), dot(delta, vec2(-u_axis.y, u_axis.x)));
    if (u_type == 1) {
      float angle = abs(atan(local.y, local.x));
      if (angle > u_shape.w) discard;
      float inner = u_shape.z > 0.0 ? u_shape.z : u_shape.w * .85;
      falloff *= 1.0 - smoothstep(inner, u_shape.w, angle) * .65;
    } else if (u_type == 2) {
      if (abs(local.x) > u_area.x * .5 || abs(local.y) > u_area.y * .5) discard;
    }
    toLight = length(delta) > 1e-5 ? -normalize(delta) : vec2(0.0);
  }
  vec2 screen = gl_FragCoord.xy / u_targetSize;
  if (u_useMask) falloff *= texture(u_mask, screen).r;
  if (u_useNormals) {
    vec4 encoded = texture(u_normals, screen);
    if (encoded.a > .5) {
      // Same light height as the Canvas 2D normal response (0.72 / 0.69), normalised so a flat normal keeps 1.
      vec3 normal = normalize(encoded.rgb * 2.0 - 1.0);
      vec3 lightDirection = normalize(vec3(toLight * .72, .69));
      falloff *= (.12 + .88 * max(0.0, dot(normal, lightDirection))) / .7272;
    }
  }
  outputColor = vec4(u_color * falloff, 1.0);
}`

const FULLSCREEN_VERTEX = `#version 300 es
precision highp float;
const vec2 positions[3] = vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));
out vec2 v_uv;
void main(){ vec2 position=positions[gl_VertexID]; gl_Position=vec4(position,0.,1.); v_uv=position*.5+.5; }`

const COMPOSITE_FRAGMENT = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_light;
out vec4 outputColor;
void main(){ outputColor = vec4(texture(u_light, v_uv).rgb, 1.0); }`

// Separable 9-tap Gaussian over the shadow mask; u_step is the texel step times the blur radius.
const BLUR_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D u_source;
uniform vec2 u_step;
uniform vec2 u_targetSize;
out vec4 outputColor;
void main(){
  vec2 uv = gl_FragCoord.xy / u_targetSize;
  float weights[5] = float[5](.2270270, .1945946, .1216216, .0540541, .0162162);
  float sum = texture(u_source, uv).r * weights[0];
  for (int index = 1; index < 5; index++) {
    vec2 offset = u_step * float(index);
    sum += (texture(u_source, uv + offset).r + texture(u_source, uv - offset).r) * weights[index];
  }
  outputColor = vec4(vec3(sum), 1.0);
}`

const NORMAL_VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_position;
layout(location=1) in vec2 a_uv;
uniform vec4 u_camera;
uniform vec2 u_rotation;
out vec2 v_uv;
void main(){
  vec2 relative = a_position - u_camera.zw;
  vec2 view = vec2(relative.x * u_rotation.x + relative.y * u_rotation.y, -relative.x * u_rotation.y + relative.y * u_rotation.x);
  gl_Position = vec4(view.x * u_camera.x, view.y * u_camera.y, 0.0, 1.0);
  v_uv = a_uv;
}`

// Normal maps store +X right and +Y down in image space (as the Canvas 2D path reads them); the world is +Y up.
const NORMAL_FRAGMENT = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_texture;
uniform vec2 u_spriteRotation; // cos, sin of the sprite's world rotation
uniform vec2 u_flip;           // sign of x and y (negative scale or flip)
out vec4 outputColor;
void main(){
  vec4 texel = texture(u_texture, v_uv);
  if (texel.a < .5) discard;
  vec3 normal = texel.rgb * 2.0 - 1.0;
  normal.y = -normal.y;
  normal.xy *= u_flip;
  normal.xy = vec2(normal.x * u_spriteRotation.x - normal.y * u_spriteRotation.y, normal.x * u_spriteRotation.y + normal.y * u_spriteRotation.x);
  outputColor = vec4(normalize(normal) * .5 + .5, 1.0);
}`

interface CameraView { scale: number; offset: { x: number; y: number }; position?: { x: number; y: number }; rotation?: number; viewport?: { x: number; y: number; width: number; height: number } }

/** One normal-mapped sprite, recorded by the renderer while the frame was submitted. */
export interface GpuNormalDraw {
  cameraIndex: number
  /** x, y, u, v per vertex (world position, texture coordinate in the normal map) */
  vertices: Float32Array
  indices: Uint32Array
  texture: WebGLTexture
  rotation: number
  flipX: number
  flipY: number
}

function compile(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
  const shaders = [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]].map(([type, source]) => {
    const shader = gl.createShader(type as number)!
    gl.shaderSource(shader, source as string); gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const message = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(message || 'light shader compilation failed') }
    return shader
  })
  const program = gl.createProgram()!
  for (const shader of shaders) gl.attachShader(program, shader)
  gl.linkProgram(program)
  for (const shader of shaders) gl.deleteShader(shader)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { const message = gl.getProgramInfoLog(program); gl.deleteProgram(program); throw new Error(message || 'light shader link failed') }
  return program
}

interface Target { framebuffer: WebGLFramebuffer; texture: WebGLTexture }

/** One owner per WebGL2 context: light, shadow-mask and normal buffers, their programs and streaming buffers. */
export class GpuLighting2D {
  private readonly lightProgram: WebGLProgram
  private readonly compositeProgram: WebGLProgram
  private readonly blurProgram: WebGLProgram
  private readonly normalProgram: WebGLProgram
  private readonly vao: WebGLVertexArrayObject
  private readonly normalVao: WebGLVertexArrayObject
  private readonly emptyVao: WebGLVertexArrayObject
  private readonly buffer: WebGLBuffer
  private readonly normalBuffer: WebGLBuffer
  private readonly normalIndexBuffer: WebGLBuffer
  private readonly uniforms: Record<string, WebGLUniformLocation | null>
  private readonly blurUniforms: Record<string, WebGLUniformLocation | null>
  private readonly normalUniforms: Record<string, WebGLUniformLocation | null>
  private readonly compositeTexture: WebGLUniformLocation | null
  private light: Target | null = null
  private maskA: Target | null = null
  private maskB: Target | null = null
  private normals: Target | null = null
  private width = 0
  private height = 0
  private upload = new Float32Array(4096)
  private capacityBytes = 0
  lastLightCount = 0
  lastShadowEdges = 0
  lastNormalSprites = 0

  constructor(private readonly gl: WebGL2RenderingContext) {
    const programs: WebGLProgram[] = []
    try {
      this.lightProgram = compile(gl, LIGHT_VERTEX, LIGHT_FRAGMENT); programs.push(this.lightProgram)
      this.compositeProgram = compile(gl, FULLSCREEN_VERTEX, COMPOSITE_FRAGMENT); programs.push(this.compositeProgram)
      this.blurProgram = compile(gl, FULLSCREEN_VERTEX, BLUR_FRAGMENT); programs.push(this.blurProgram)
      this.normalProgram = compile(gl, NORMAL_VERTEX, NORMAL_FRAGMENT); programs.push(this.normalProgram)
    } catch (error) { for (const program of programs) gl.deleteProgram(program); throw error }
    const vao = gl.createVertexArray(), normalVao = gl.createVertexArray(), emptyVao = gl.createVertexArray(), buffer = gl.createBuffer(), normalBuffer = gl.createBuffer(), normalIndexBuffer = gl.createBuffer()
    if (!vao || !normalVao || !emptyVao || !buffer || !normalBuffer || !normalIndexBuffer) throw new Error('Could not allocate light buffers')
    this.vao = vao; this.normalVao = normalVao; this.emptyVao = emptyVao; this.buffer = buffer; this.normalBuffer = normalBuffer; this.normalIndexBuffer = normalIndexBuffer
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0)
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 16, 12)
    gl.bindVertexArray(normalVao); gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer)
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0)
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, normalIndexBuffer)
    gl.bindVertexArray(null)
    const locate = (program: WebGLProgram, names: string[]) => Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, name)]))
    this.uniforms = locate(this.lightProgram, ['u_camera', 'u_rotation', 'u_clip', 'u_mode', 'u_type', 'u_center', 'u_axis', 'u_color', 'u_shape', 'u_area', 'u_useMask', 'u_useNormals', 'u_mask', 'u_normals', 'u_targetSize'])
    this.blurUniforms = locate(this.blurProgram, ['u_source', 'u_step', 'u_targetSize'])
    this.normalUniforms = locate(this.normalProgram, ['u_camera', 'u_rotation', 'u_texture', 'u_spriteRotation', 'u_flip'])
    this.compositeTexture = gl.getUniformLocation(this.compositeProgram, 'u_light')
  }

  private createTarget(previous: Target | null, width: number, height: number): Target {
    const gl = this.gl
    const texture = previous?.texture ?? gl.createTexture(), framebuffer = previous?.framebuffer ?? gl.createFramebuffer()
    if (!texture || !framebuffer) throw new Error('Could not allocate a light buffer')
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Light buffer is incomplete')
    return { texture, framebuffer }
  }

  private ensureTargets(canvasWidth: number, canvasHeight: number, masks: boolean, normals: boolean): void {
    const width = Math.max(1, Math.ceil(canvasWidth / 2)), height = Math.max(1, Math.ceil(canvasHeight / 2))
    const resized = this.width !== width || this.height !== height
    if (resized || !this.light) this.light = this.createTarget(this.light, width, height)
    if (masks && (resized || !this.maskA || !this.maskB)) { this.maskA = this.createTarget(this.maskA, width, height); this.maskB = this.createTarget(this.maskB, width, height) }
    if (normals && (resized || !this.normals)) this.normals = this.createTarget(this.normals, width, height)
    if (resized) {
      // Buffers not needed this frame are re-created at the new size when they are next used.
      if (!masks) { this.release(this.maskA); this.release(this.maskB); this.maskA = this.maskB = null }
      if (!normals) { this.release(this.normals); this.normals = null }
    }
    this.width = width; this.height = height
  }

  private release(target: Target | null): void { if (target) { this.gl.deleteFramebuffer(target.framebuffer); this.gl.deleteTexture(target.texture) } }

  private stream(floats: number[] | Float32Array, count: number): void {
    const gl = this.gl
    if (this.upload.length < count) this.upload = new Float32Array(Math.max(count, this.upload.length * 2))
    this.upload.set(floats.length === count ? floats : (floats as Float32Array).subarray(0, count))
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    if (this.capacityBytes < this.upload.byteLength) { gl.bufferData(gl.ARRAY_BUFFER, this.upload.byteLength, gl.DYNAMIC_DRAW); this.capacityBytes = this.upload.byteLength }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.upload, 0, count)
  }

  private viewportFor(camera: CameraView): [number, number, number, number] {
    const viewport = camera.viewport ?? { x: 0, y: 0, width: 1, height: 1 }
    return [Math.round(viewport.x * this.width), Math.round(viewport.y * this.height), Math.max(1, Math.round(viewport.width * this.width)), Math.max(1, Math.round(viewport.height * this.height))]
  }

  private setCamera(camera: CameraView, logical: { width: number; height: number }, cameraUniform: WebGLUniformLocation | null, rotationUniform: WebGLUniformLocation | null): void {
    const gl = this.gl, viewport = camera.viewport ?? { x: 0, y: 0, width: 1, height: 1 }
    const scale = Math.max(1e-9, Math.abs(Number.isFinite(camera.scale) ? camera.scale : 1))
    const width = logical.width * viewport.width, height = logical.height * viewport.height
    const center = camera.position ?? { x: (logical.width * .5 - camera.offset.x) / scale, y: (camera.offset.y - logical.height * .5) / scale }
    const rotation = camera.rotation ?? 0
    gl.uniform4f(cameraUniform, 2 * scale / Math.max(1, width), 2 * scale / Math.max(1, height), center.x, center.y)
    gl.uniform2f(rotationUniform, Math.cos(rotation), Math.sin(rotation))
  }

  private drawNormals(draws: readonly GpuNormalDraw[], cameras: readonly CameraView[], logical: { width: number; height: number }): number {
    const gl = this.gl, u = this.normalUniforms
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.normals!.framebuffer)
    gl.disable(gl.SCISSOR_TEST); gl.viewport(0, 0, this.width, this.height)
    gl.colorMask(true, true, true, true); gl.clearColor(.5, .5, 1, 0); gl.clear(gl.COLOR_BUFFER_BIT)
    gl.disable(gl.BLEND)
    gl.useProgram(this.normalProgram); gl.bindVertexArray(this.normalVao)
    gl.activeTexture(gl.TEXTURE0); gl.uniform1i(u.u_texture, 0)
    let count = 0
    for (let index = 0; index < cameras.length; index++) {
      const [x, y, w, h] = this.viewportFor(cameras[index])
      gl.viewport(x, y, w, h)
      this.setCamera(cameras[index], logical, u.u_camera, u.u_rotation)
      for (const draw of draws) {
        if (draw.cameraIndex !== index) continue
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer); gl.bufferData(gl.ARRAY_BUFFER, draw.vertices, gl.STREAM_DRAW)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.normalIndexBuffer); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, draw.indices, gl.STREAM_DRAW)
        gl.bindTexture(gl.TEXTURE_2D, draw.texture)
        gl.uniform2f(u.u_spriteRotation, Math.cos(draw.rotation), Math.sin(draw.rotation))
        gl.uniform2f(u.u_flip, draw.flipX, draw.flipY)
        gl.drawElements(gl.TRIANGLES, draw.indices.length, gl.UNSIGNED_INT, 0); count++
      }
    }
    gl.enable(gl.BLEND)
    return count
  }

  /** Draw the light buffer for every camera and multiply it into `target`. Returns the number of draw calls.
   * `shadowBlur` is the shadow softening radius in full-resolution pixels (0 = hard). */
  render(frame: GpuLightingFrame, cameras: readonly CameraView[], logical: { width: number; height: number }, canvas: { width: number; height: number }, target: WebGLFramebuffer | null, normalDraws: readonly GpuNormalDraw[] = []): number {
    const gl = this.gl, u = this.uniforms
    const masks = frame.lights.some(light => light.shadowEdges.length > 0), useNormals = normalDraws.length > 0
    this.ensureTargets(canvas.width, canvas.height, masks, useNormals)
    let draws = 0, edges = 0
    if (useNormals) draws += this.drawNormals(normalDraws, cameras, logical)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.light!.framebuffer)
    gl.viewport(0, 0, this.width, this.height)
    gl.disable(gl.SCISSOR_TEST)
    gl.colorMask(true, true, true, true)
    gl.clearColor(frame.ambient[0] / 2, frame.ambient[1] / 2, frame.ambient[2] / 2, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.enable(gl.BLEND)
    gl.enable(gl.SCISSOR_TEST)
    const blurRadius = Math.max(0, frame.shadowBlur ?? 0) / 2 // light buffers are half resolution
    for (const camera of cameras) {
      const [x, y, w, h] = this.viewportFor(camera)
      for (const light of frame.lights) {
        const shadowed = light.shadowEdges.length > 0
        if (shadowed) {
          // 1. Transmittance mask: start at 1, multiply by (1 - opacity) under each shadow, restore casters that do not shadow themselves.
          gl.useProgram(this.lightProgram); gl.bindVertexArray(this.vao)
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.maskA!.framebuffer)
          gl.viewport(x, y, w, h); gl.scissor(x, y, w, h)
          gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT)
          this.setCamera(camera, logical, u.u_camera, u.u_rotation)
          const vertices: number[] = []
          for (let index = 0; index < light.shadowEdges.length; index += 5) {
            const ax = light.shadowEdges[index], ay = light.shadowEdges[index + 1], bx = light.shadowEdges[index + 2], by = light.shadowEdges[index + 3], opacity = light.shadowEdges[index + 4]
            const adx = ax - light.x, ady = ay - light.y, bdx = bx - light.x, bdy = by - light.y
            // near a, near b, far b, far a (w = 0)
            vertices.push(ax, ay, 1, opacity, bx, by, 1, opacity, bdx, bdy, 0, opacity, ax, ay, 1, opacity, bdx, bdy, 0, opacity, adx, ady, 0, opacity)
          }
          edges += light.shadowEdges.length / 5
          this.stream(vertices, vertices.length)
          gl.uniform1i(u.u_clip, 0); gl.uniform1i(u.u_mode, 1)
          gl.blendFunc(gl.ZERO, gl.SRC_COLOR)
          gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 4); draws++
          if (light.unshadowed.length) {
            const fan: number[] = []
            for (let index = 0; index < light.unshadowed.length;) {
              const count = light.unshadowed[index++]
              let cx = 0, cy = 0
              for (let point = 0; point < count; point++) { cx += light.unshadowed[index + point * 2]; cy += light.unshadowed[index + point * 2 + 1] }
              cx /= count; cy /= count
              for (let point = 0; point < count; point++) {
                const next = (point + 1) % count
                fan.push(cx, cy, 1, 1, light.unshadowed[index + point * 2], light.unshadowed[index + point * 2 + 1], 1, 1, light.unshadowed[index + next * 2], light.unshadowed[index + next * 2 + 1], 1, 1)
              }
              index += count * 2
            }
            this.stream(fan, fan.length)
            gl.uniform1i(u.u_mode, 2)
            gl.blendFunc(gl.ONE, gl.ZERO)
            gl.drawArrays(gl.TRIANGLES, 0, fan.length / 4); draws++
          }
          if (blurRadius > .25) {
            // 2. Soft shadows: separable Gaussian A → B (horizontal), B → A (vertical).
            gl.useProgram(this.blurProgram); gl.bindVertexArray(this.emptyVao)
            gl.blendFunc(gl.ONE, gl.ZERO)
            gl.uniform2f(this.blurUniforms.u_targetSize, this.width, this.height)
            gl.uniform1i(this.blurUniforms.u_source, 1)
            gl.activeTexture(gl.TEXTURE1)
            for (const [source, destination, dx, dy] of [[this.maskA!, this.maskB!, 1, 0], [this.maskB!, this.maskA!, 0, 1]] as const) {
              gl.bindFramebuffer(gl.FRAMEBUFFER, destination.framebuffer)
              gl.bindTexture(gl.TEXTURE_2D, source.texture)
              gl.uniform2f(this.blurUniforms.u_step, dx * blurRadius / 4 / this.width, dy * blurRadius / 4 / this.height)
              gl.drawArrays(gl.TRIANGLES, 0, 3); draws++
            }
            gl.bindTexture(gl.TEXTURE_2D, null)
            gl.activeTexture(gl.TEXTURE0)
          }
        }
        // 3. Add this light into the light buffer (stored as L/2), attenuated by its mask and the surface normals.
        gl.useProgram(this.lightProgram); gl.bindVertexArray(this.vao)
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.light!.framebuffer)
        gl.viewport(x, y, w, h); gl.scissor(x, y, w, h)
        this.setCamera(camera, logical, u.u_camera, u.u_rotation)
        gl.colorMask(true, true, true, false)
        gl.blendFunc(gl.ONE, gl.ONE)
        gl.uniform1i(u.u_mode, 0); gl.uniform1i(u.u_type, light.type)
        gl.uniform2f(u.u_center, light.x, light.y)
        gl.uniform2f(u.u_axis, Math.cos(light.rotation), Math.sin(light.rotation))
        gl.uniform3f(u.u_color, light.r / 2, light.g / 2, light.b / 2)
        gl.uniform4f(u.u_shape, light.range, light.knee, light.innerHalfAngle, light.outerHalfAngle)
        gl.uniform2f(u.u_area, light.areaWidth, light.areaHeight)
        gl.uniform2f(u.u_targetSize, this.width, this.height)
        gl.uniform1i(u.u_useMask, shadowed ? 1 : 0)
        gl.uniform1i(u.u_useNormals, useNormals ? 1 : 0)
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, shadowed ? this.maskA!.texture : null); gl.uniform1i(u.u_mask, 1)
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, useNormals ? this.normals!.texture : null); gl.uniform1i(u.u_normals, 2)
        gl.activeTexture(gl.TEXTURE0)
        if (light.type === 3) {
          gl.uniform1i(u.u_clip, 1)
          this.stream([-1, -1, 1, 1, 3, -1, 1, 1, -1, 3, 1, 1], 12)
        } else {
          gl.uniform1i(u.u_clip, 0)
          const r = light.range, x0 = light.x - r, x1 = light.x + r, y0 = light.y - r, y1 = light.y + r
          this.stream([x0, y0, 1, 1, x1, y0, 1, 1, x1, y1, 1, 1, x0, y0, 1, 1, x1, y1, 1, 1, x0, y1, 1, 1], 24)
        }
        gl.drawArrays(gl.TRIANGLES, 0, light.type === 3 ? 3 : 6); draws++
        gl.colorMask(true, true, true, true)
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, null)
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, null)
        gl.activeTexture(gl.TEXTURE0)
      }
    }
    gl.disable(gl.SCISSOR_TEST)
    gl.colorMask(true, true, true, true)
    // 4. Multiply into the scene: dst · (2 · L/2).
    gl.bindFramebuffer(gl.FRAMEBUFFER, target)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.useProgram(this.compositeProgram)
    gl.bindVertexArray(this.emptyVao)
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.light!.texture)
    gl.uniform1i(this.compositeTexture, 0)
    gl.colorMask(true, true, true, false)
    gl.blendFuncSeparate(gl.DST_COLOR, gl.SRC_COLOR, gl.ZERO, gl.ONE)
    gl.drawArrays(gl.TRIANGLES, 0, 3); draws++
    gl.colorMask(true, true, true, true)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.bindVertexArray(null)
    this.lastLightCount = frame.lights.length
    this.lastShadowEdges = edges
    this.lastNormalSprites = normalDraws.length
    return draws
  }

  destroy(): void {
    const gl = this.gl
    for (const program of [this.lightProgram, this.compositeProgram, this.blurProgram, this.normalProgram]) gl.deleteProgram(program)
    gl.deleteVertexArray(this.vao); gl.deleteVertexArray(this.normalVao); gl.deleteVertexArray(this.emptyVao)
    gl.deleteBuffer(this.buffer); gl.deleteBuffer(this.normalBuffer); gl.deleteBuffer(this.normalIndexBuffer)
    for (const target of [this.light, this.maskA, this.maskB, this.normals]) this.release(target)
    this.light = this.maskA = this.maskB = this.normals = null
  }
}
