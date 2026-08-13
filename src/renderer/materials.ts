import { readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import type { BlendMode2D, TextureFilter } from './types'

export type MaterialUniform = number | boolean | number[]
export interface Material2DResource {
  version: 1
  name: string
  fragment: string
  textures: Record<string, string | null>
  uniforms: Record<string, MaterialUniform>
  blendMode: BlendMode2D
  sampling: TextureFilter
  colorSpace: 'sRGB' | 'Linear'
  writeColor: boolean
}

export interface ShaderDiagnostic { line: number; severity: 'error' | 'warning'; message: string }

export const DEFAULT_MATERIAL_FRAGMENT = `vec4 nova_material(vec4 baseColor, vec2 uv) {
  return baseColor;
}`

export function defaultMaterial(name = 'New Material'): Material2DResource {
  return { version: 1, name, fragment: DEFAULT_MATERIAL_FRAGMENT, textures: {}, uniforms: {}, blendMode: 'Alpha', sampling: 'Linear', colorSpace: 'sRGB', writeColor: true }
}

function safeUniform(value: unknown): MaterialUniform | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (Array.isArray(value) && value.length >= 2 && value.length <= 4 && value.every(item => typeof item === 'number' && Number.isFinite(item))) return value
  return null
}

export function normalizeMaterial(value: unknown): Material2DResource {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const result = defaultMaterial(typeof source.name === 'string' ? source.name.slice(0, 80) : undefined)
  result.fragment = typeof source.fragment === 'string' ? source.fragment.slice(0, 32_000) : result.fragment
  result.blendMode = ['Alpha', 'Additive', 'Multiply', 'Screen'].includes(String(source.blendMode)) ? source.blendMode as BlendMode2D : 'Alpha'
  result.sampling = source.sampling === 'Nearest' ? 'Nearest' : 'Linear'
  result.colorSpace = source.colorSpace === 'Linear' ? 'Linear' : 'sRGB'
  result.writeColor = source.writeColor !== false
  if (source.textures && typeof source.textures === 'object') for (const [name, reference] of Object.entries(source.textures).slice(0, 8)) {
    if (/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(name)) result.textures[name] = typeof reference === 'string' ? reference.slice(0, 512) : null
  }
  if (source.uniforms && typeof source.uniforms === 'object') for (const [name, value] of Object.entries(source.uniforms).slice(0, 32)) {
    const safe = safeUniform(value); if (safe !== null && /^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(name)) result.uniforms[name] = safe
  }
  return result
}

export function analyzeMaterialShader(source: string): ShaderDiagnostic[] {
  const diagnostics: ShaderDiagnostic[] = []
  const lines = source.split(/\r?\n/)
  const forbidden = /\b(?:discard|while|do|atomic\w*|image\w*|sampler3D|samplerCube|gl_FragDepth)\b/
  lines.forEach((line, index) => {
    const match = line.match(forbidden)
    if (match) diagnostics.push({ line: index + 1, severity: 'error', message: `“${match[0]}” is outside Nova_A's safe 2D shader subset.` })
    if (/\bfor\s*\(/.test(line)) diagnostics.push({ line: index + 1, severity: 'error', message: 'Runtime loops are not allowed in material shaders.' })
  })
  if (!/\bvec4\s+nova_material\s*\(\s*vec4\s+[A-Za-z_]\w*\s*,\s*vec2\s+[A-Za-z_]\w*\s*\)/.test(source)) diagnostics.push({ line: 1, severity: 'error', message: 'Define vec4 nova_material(vec4 baseColor, vec2 uv).' })
  if (source.length > 32_000) diagnostics.push({ line: lines.length, severity: 'error', message: 'Shader source exceeds the 32 KB safety limit.' })
  return diagnostics
}

export function compileMaterialPreview(source: string): ShaderDiagnostic[] {
  const diagnostics = analyzeMaterialShader(source)
  if (diagnostics.some(item => item.severity === 'error') || typeof document === 'undefined') return diagnostics
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2')
  if (!gl) return [...diagnostics, { line: 1, severity: 'warning', message: 'WebGL2 is unavailable; Canvas2D fallback will use the base material.' }]
  const shader = gl.createShader(gl.FRAGMENT_SHADER)
  if (!shader) return [...diagnostics, { line: 1, severity: 'error', message: 'Could not allocate shader.' }]
  gl.shaderSource(shader, `#version 300 es\nprecision highp float;\n${source}\nout vec4 outputColor;void main(){outputColor=nova_material(vec4(1.0),vec2(0.5));}`)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'GLSL ES compilation failed.'
    diagnostics.push({ line: Number(message.match(/ERROR:\s*\d+:(\d+)/)?.[1] ?? 1), severity: 'error', message })
  }
  gl.deleteShader(shader)
  return diagnostics
}

export function renderMaterialPreview(canvas: HTMLCanvasElement, materialInput: Material2DResource): ShaderDiagnostic[] {
  const material = normalizeMaterial(materialInput)
  const diagnostics = analyzeMaterialShader(material.fragment)
  if (diagnostics.some(item => item.severity === 'error')) return diagnostics
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: false })
  if (!gl) return [...diagnostics, { line: 1, severity: 'warning', message: 'WebGL2 is unavailable; the base-material fallback remains active.' }]
  const uniforms = Object.entries(material.uniforms).map(([name, value]) => Array.isArray(value) ? `uniform vec${value.length} ${name};` : typeof value === 'boolean' ? `uniform bool ${name};` : `uniform float ${name};`).join('\n')
  const textures = Object.keys(material.textures).map(name => `uniform sampler2D ${name};`).join('\n')
  const vertexSource = `#version 300 es\nconst vec2 p[3]=vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));out vec2 uv;void main(){gl_Position=vec4(p[gl_VertexID],0.,1.);uv=p[gl_VertexID]*.5+.5;}`
  const fragmentSource = `#version 300 es\nprecision highp float;in vec2 uv;${uniforms}\n${textures}\n${material.fragment}\nout vec4 outputColor;void main(){vec2 grid=abs(fract(uv*8.)-.5);float checker=step(.25,max(grid.x,grid.y));vec4 baseColor=mix(vec4(.15,.18,.23,1.),vec4(.5,.58,.7,1.),checker);outputColor=nova_material(baseColor,uv);}`
  const compile = (type: number, source: string) => { const shader = gl.createShader(type)!; gl.shaderSource(shader, source); gl.compileShader(shader); return shader }
  const vertex = compile(gl.VERTEX_SHADER, vertexSource), fragment = compile(gl.FRAGMENT_SHADER, fragmentSource)
  if (!gl.getShaderParameter(fragment, gl.COMPILE_STATUS)) diagnostics.push({ line: Number((gl.getShaderInfoLog(fragment) || '').match(/ERROR:\s*\d+:(\d+)/)?.[1] ?? 1), severity: 'error', message: gl.getShaderInfoLog(fragment) || 'GLSL ES compilation failed.' })
  const program = gl.createProgram()!; gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !diagnostics.length) diagnostics.push({ line: 1, severity: 'error', message: gl.getProgramInfoLog(program) || 'GLSL ES link failed.' })
  if (!diagnostics.some(item => item.severity === 'error')) {
    gl.viewport(0, 0, canvas.width, canvas.height); gl.useProgram(program)
    for (const [name, value] of Object.entries(material.uniforms)) {
      const location = gl.getUniformLocation(program, name); if (!location) continue
      if (typeof value === 'boolean') gl.uniform1i(location, value ? 1 : 0)
      else if (typeof value === 'number') gl.uniform1f(location, value)
      else if (value.length === 2) gl.uniform2fv(location, value)
      else if (value.length === 3) gl.uniform3fv(location, value)
      else gl.uniform4fv(location, value)
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  gl.deleteShader(vertex); gl.deleteShader(fragment); gl.deleteProgram(program)
  return diagnostics
}

export function resolveMaterial(reference: string | null | undefined): Material2DResource {
  if (!reference || reference === 'Default' || reference === 'Particles' || reference.startsWith('__')) return defaultMaterial(reference || 'Default')
  const asset = resolveAsset(reference)
  const source = asset?.assetType === 'material' ? readTextAsset(asset.uuid) : null
  if (!source) return defaultMaterial(reference)
  try { return normalizeMaterial(JSON.parse(source)) } catch { return defaultMaterial(asset?.name ?? reference) }
}

export function serializeMaterial(material: Material2DResource): string { return JSON.stringify(normalizeMaterial(material), null, 2) }
