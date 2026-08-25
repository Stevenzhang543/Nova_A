import { readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import type { BlendMode2D, TextureFilter } from './types'

export type MaterialUniform = number | boolean | number[]
export type MaterialUniformType = 'number' | 'integer' | 'vector2' | 'vector3' | 'vector4' | 'color' | 'texture' | 'enum' | 'range' | 'toggle'
export interface MaterialUniformField { name: string; type: MaterialUniformType; label: string; minimum?: number; maximum?: number; step?: number; options?: string[] }
export interface Material2DResource {
  version: 2
  name: string
  fragment: string
  textures: Record<string, string | null>
  uniforms: Record<string, MaterialUniform>
  uniformSchema: MaterialUniformField[]
  includes: string[]
  variants: Record<string, string>
  activeVariant: string
  parentMaterial: string | null
  blendMode: BlendMode2D
  sampling: TextureFilter
  colorSpace: 'sRGB' | 'Linear'
  writeColor: boolean
}

export interface ShaderDiagnostic { line: number; severity: 'error' | 'warning'; message: string; source?: string }

export const DEFAULT_MATERIAL_FRAGMENT = `vec4 nova_material(vec4 baseColor, vec2 uv) {
  return baseColor;
}`

export const MATERIAL_INCLUDE_LIBRARY: Readonly<Record<string, string>> = Object.freeze({
  'nova/color': `vec3 nova_srgb_to_linear(vec3 value){return pow(max(value,vec3(0.0)),vec3(2.2));}\nvec3 nova_linear_to_srgb(vec3 value){return pow(max(value,vec3(0.0)),vec3(1.0/2.2));}`,
  'nova/shapes': `float nova_circle_sdf(vec2 point,float radius){return length(point)-radius;}\nfloat nova_box_sdf(vec2 point,vec2 bounds){vec2 distance=abs(point)-bounds;return length(max(distance,0.0))+min(max(distance.x,distance.y),0.0);}`,
  'nova/noise': `float nova_hash(vec2 point){return fract(sin(dot(point,vec2(127.1,311.7)))*43758.5453123);}`
})

const compileCache = new Map<string, ShaderDiagnostic[]>()
export interface MaterialFallbackEvent { reference: string; reason: string; occurredAt: string; actionableFix: string }
export const materialRuntimeDiagnostics = { compileCacheHits: 0, compileCacheMisses: 0, fallbackCount: 0, lastFallback: '', fallbackEvents: [] as MaterialFallbackEvent[] }

export function defaultMaterial(name = 'New Material'): Material2DResource {
  return { version: 2, name, fragment: DEFAULT_MATERIAL_FRAGMENT, textures: {}, uniforms: {}, uniformSchema: [], includes: [], variants: {}, activeVariant: '', parentMaterial: null, blendMode: 'Alpha', sampling: 'Linear', colorSpace: 'sRGB', writeColor: true }
}

function safeUniform(value: unknown): MaterialUniform | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (Array.isArray(value) && value.length >= 2 && value.length <= 4 && value.every(item => typeof item === 'number' && Number.isFinite(item))) return value
  return null
}
function safeName(value: unknown, fallback = ''): string { return typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(value) ? value : fallback }
function labelFromName(name: string): string { return name.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) }
function annotationField(name: string, glslType: string, annotation = ''): MaterialUniformField {
  const range = annotation.match(/@range\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i)
  const choices = annotation.match(/@enum\(([^)]+)\)/i)?.[1].split(',').map(item => item.trim()).filter(Boolean).slice(0, 32)
  const explicit = annotation.match(/@(color|toggle|integer|number|texture)\b/i)?.[1].toLowerCase()
  const inferred: MaterialUniformType = glslType === 'sampler2D' ? 'texture' : glslType === 'bool' ? 'toggle' : glslType === 'int' ? 'integer' : glslType === 'vec2' ? 'vector2' : glslType === 'vec3' ? 'vector3' : glslType === 'vec4' ? 'vector4' : 'number'
  return { name, label: labelFromName(name), type: choices?.length ? 'enum' : range ? 'range' : explicit as MaterialUniformType || inferred, ...(range ? { minimum: Number(range[1]), maximum: Number(range[2]), step: Number(range[3]) || .01 } : {}), ...(choices?.length ? { options: choices } : {}) }
}

/** Reflects safe inspector metadata directly from GLSL ES declarations. */
export function reflectShaderUniforms(source: string): MaterialUniformField[] {
  const fields: MaterialUniformField[] = []
  const pattern = /^\s*uniform\s+(float|int|bool|vec2|vec3|vec4|sampler2D)\s+([A-Za-z_]\w*)\s*;\s*(?:\/\/\s*(.*))?$/gm
  for (const match of source.matchAll(pattern)) {
    if (match[2] === 'u_texture' || fields.some(field => field.name === match[2])) continue
    fields.push(annotationField(match[2], match[1], match[3] ?? ''))
    if (fields.length >= 32) break
  }
  return fields
}
function defaultValue(field: MaterialUniformField): MaterialUniform {
  if (field.type === 'toggle') return false
  if (field.type === 'vector2') return [0, 0]
  if (field.type === 'vector3') return [0, 0, 0]
  if (field.type === 'vector4' || field.type === 'color') return [1, 1, 1, 1]
  return field.minimum ?? 0
}
function normalizeField(value: unknown): MaterialUniformField | null {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}, name = safeName(source.name)
  const types: MaterialUniformType[] = ['number', 'integer', 'vector2', 'vector3', 'vector4', 'color', 'texture', 'enum', 'range', 'toggle']
  if (!name || !types.includes(source.type as MaterialUniformType)) return null
  const field: MaterialUniformField = { name, type: source.type as MaterialUniformType, label: typeof source.label === 'string' ? source.label.slice(0, 80) : labelFromName(name) }
  if (Number.isFinite(source.minimum)) field.minimum = Number(source.minimum)
  if (Number.isFinite(source.maximum)) field.maximum = Number(source.maximum)
  if (Number.isFinite(source.step)) field.step = Math.max(Number.EPSILON, Number(source.step))
  if (Array.isArray(source.options)) field.options = source.options.map(String).map(item => item.slice(0, 48)).slice(0, 32)
  return field
}

export function resolveShaderIncludes(source: string, declared: readonly string[] = []): { source: string; diagnostics: ShaderDiagnostic[] } {
  const diagnostics: ShaderDiagnostic[] = [], requested = new Set(declared.filter(name => typeof name === 'string').slice(0, 16))
  source.replace(/^\s*#include\s+[<"]([^>"]+)[>"]\s*$/gm, (_, name: string) => { requested.add(name); return '' })
  let output = source.replace(/^\s*#include\s+[<"]([^>"]+)[>"]\s*$/gm, '')
  for (const name of requested) {
    const include = MATERIAL_INCLUDE_LIBRARY[name]
    if (include) output = `${include}\n${output}`
    else diagnostics.push({ line: 1, severity: 'error', source: name, message: `Unknown shader include “${name}”.` })
  }
  return { source: output, diagnostics }
}
export function resolvedMaterialFragment(material: Material2DResource): { source: string; diagnostics: ShaderDiagnostic[] } {
  const included = resolveShaderIncludes(material.fragment, material.includes), variant = material.activeVariant ? material.variants[material.activeVariant] : ''
  return { source: variant ? `${variant}\n${included.source}` : included.source, diagnostics: included.diagnostics }
}

export function normalizeMaterial(value: unknown): Material2DResource {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}, result = defaultMaterial(typeof source.name === 'string' ? source.name.slice(0, 80) : undefined)
  result.fragment = typeof source.fragment === 'string' ? source.fragment.slice(0, 32_000) : result.fragment
  result.blendMode = ['Alpha', 'Additive', 'Multiply', 'Screen'].includes(String(source.blendMode)) ? source.blendMode as BlendMode2D : 'Alpha'
  result.sampling = source.sampling === 'Nearest' ? 'Nearest' : 'Linear'; result.colorSpace = source.colorSpace === 'Linear' ? 'Linear' : 'sRGB'; result.writeColor = source.writeColor !== false
  result.parentMaterial = typeof source.parentMaterial === 'string' ? source.parentMaterial.slice(0, 512) : null
  result.includes = Array.isArray(source.includes) ? [...new Set(source.includes.map(String).filter(name => name in MATERIAL_INCLUDE_LIBRARY))].slice(0, 16) : []
  if (source.variants && typeof source.variants === 'object') for (const [name, definition] of Object.entries(source.variants).slice(0, 16)) { const safe = safeName(name); if (safe && typeof definition === 'string') result.variants[safe] = definition.slice(0, 2_000) }
  result.activeVariant = safeName(source.activeVariant); if (!(result.activeVariant in result.variants)) result.activeVariant = ''
  if (source.textures && typeof source.textures === 'object') for (const [name, reference] of Object.entries(source.textures).slice(0, 8)) if (safeName(name)) result.textures[name] = typeof reference === 'string' ? reference.slice(0, 512) : null
  if (source.uniforms && typeof source.uniforms === 'object') for (const [name, uniform] of Object.entries(source.uniforms).slice(0, 32)) { const safe = safeUniform(uniform); if (safe !== null && safeName(name)) result.uniforms[name] = safe }
  const reflected = reflectShaderUniforms(result.fragment), stored = Array.isArray(source.uniformSchema) ? source.uniformSchema.map(normalizeField).filter((field): field is MaterialUniformField => Boolean(field)) : []
  result.uniformSchema = [...reflected, ...stored.filter(field => !reflected.some(item => item.name === field.name))].slice(0, 32)
  for (const field of result.uniformSchema) field.type === 'texture' ? (field.name in result.textures || (result.textures[field.name] = null)) : (field.name in result.uniforms || (result.uniforms[field.name] = defaultValue(field)))
  return result
}

export function analyzeMaterialShader(source: string, includes: readonly string[] = []): ShaderDiagnostic[] {
  const resolved = resolveShaderIncludes(source, includes), diagnostics: ShaderDiagnostic[] = [...resolved.diagnostics], lines = resolved.source.split(/\r?\n/), forbidden = /\b(?:discard|while|do|atomic\w*|image\w*|sampler3D|samplerCube|gl_FragDepth)\b/
  lines.forEach((line, index) => {
    const match = line.match(forbidden); if (match) diagnostics.push({ line: index + 1, severity: 'error', source: 'material', message: `“${match[0]}” is outside Nova_A's safe 2D shader subset.` })
    const loop = line.match(/\bfor\s*\([^;]*;\s*[^<]*<\s*(\d+)/); if (/\bfor\s*\(/.test(line) && (!loop || Number(loop[1]) > 64)) diagnostics.push({ line: index + 1, severity: 'error', source: 'material', message: 'Shader loops require a compile-time bound of 64 iterations or fewer.' })
  })
  if (!/\bvec4\s+nova_material\s*\(\s*vec4\s+[A-Za-z_]\w*\s*,\s*vec2\s+[A-Za-z_]\w*\s*\)/.test(resolved.source)) diagnostics.push({ line: 1, severity: 'error', source: 'material', message: 'Define vec4 nova_material(vec4 baseColor, vec2 uv).' })
  if (source.length > 32_000) diagnostics.push({ line: lines.length, severity: 'error', source: 'material', message: 'Shader source exceeds the 32 KB safety limit.' })
  return diagnostics
}

export function compileMaterialPreview(source: string, includes: readonly string[] = []): ShaderDiagnostic[] {
  const cacheKey = `${includes.join('|')}\u0000${source}`, cached = compileCache.get(cacheKey)
  if (cached) { materialRuntimeDiagnostics.compileCacheHits++; return cached.map(item => ({ ...item })) }
  materialRuntimeDiagnostics.compileCacheMisses++
  const resolved = resolveShaderIncludes(source, includes), diagnostics = analyzeMaterialShader(source, includes)
  if (!diagnostics.some(item => item.severity === 'error') && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'), gl = canvas.getContext('webgl2')
    if (!gl) diagnostics.push({ line: 1, severity: 'warning', source: 'renderer', message: 'WebGL2 is unavailable; Canvas2D fallback will use the base material.' })
    else { const shader = gl.createShader(gl.FRAGMENT_SHADER); if (!shader) diagnostics.push({ line: 1, severity: 'error', source: 'renderer', message: 'Could not allocate shader.' }); else { gl.shaderSource(shader, `#version 300 es\nprecision highp float;\n${resolved.source}\nout vec4 outputColor;void main(){outputColor=nova_material(vec4(1.0),vec2(0.5));}`); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const message = gl.getShaderInfoLog(shader) || 'GLSL ES compilation failed.'; diagnostics.push({ line: Number(message.match(/ERROR:\s*\d+:(\d+)/)?.[1] ?? 1), severity: 'error', source: 'material', message }) } gl.deleteShader(shader) } }
  }
  compileCache.set(cacheKey, diagnostics.map(item => ({ ...item }))); if (compileCache.size > 64) compileCache.delete(compileCache.keys().next().value as string)
  return diagnostics
}

function declarations(material: Material2DResource, source: string) {
  const declared = new Set(reflectShaderUniforms(source).map(field => field.name))
  return {
    uniforms: Object.entries(material.uniforms).filter(([name]) => !declared.has(name)).map(([name, value]) => Array.isArray(value) ? `uniform vec${value.length} ${name};` : typeof value === 'boolean' ? `uniform bool ${name};` : `uniform float ${name};`).join('\n'),
    textures: Object.keys(material.textures).filter(name => !declared.has(name)).map(name => `uniform sampler2D ${name};`).join('\n')
  }
}
export function renderMaterialPreview(canvas: HTMLCanvasElement, materialInput: Material2DResource): ShaderDiagnostic[] {
  const material = normalizeMaterial(materialInput), resolved = resolvedMaterialFragment(material), diagnostics = [...resolved.diagnostics, ...analyzeMaterialShader(material.fragment, material.includes)]
  if (diagnostics.some(item => item.severity === 'error')) return diagnostics
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true })
  if (!gl) return [...diagnostics, { line: 1, severity: 'warning', source: 'renderer', message: 'WebGL2 is unavailable; the base-material fallback remains active.' }]
  const declared = declarations(material, resolved.source)
  const vertexSource = `#version 300 es\nconst vec2 p[3]=vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));out vec2 uv;void main(){gl_Position=vec4(p[gl_VertexID],0.,1.);uv=p[gl_VertexID]*.5+.5;}`
  const fragmentSource = `#version 300 es\nprecision highp float;in vec2 uv;${declared.uniforms}\n${declared.textures}\n${resolved.source}\nout vec4 outputColor;void main(){vec2 grid=abs(fract(uv*8.)-.5);float checker=step(.25,max(grid.x,grid.y));vec4 baseColor=mix(vec4(.15,.18,.23,1.),vec4(.5,.58,.7,1.),checker);outputColor=nova_material(baseColor,uv);}`
  const compile = (type: number, shaderSource: string) => { const shader = gl.createShader(type)!; gl.shaderSource(shader, shaderSource); gl.compileShader(shader); return shader }, vertex = compile(gl.VERTEX_SHADER, vertexSource), fragment = compile(gl.FRAGMENT_SHADER, fragmentSource)
  if (!gl.getShaderParameter(fragment, gl.COMPILE_STATUS)) diagnostics.push({ line: Number((gl.getShaderInfoLog(fragment) || '').match(/ERROR:\s*\d+:(\d+)/)?.[1] ?? 1), severity: 'error', source: 'material', message: gl.getShaderInfoLog(fragment) || 'GLSL ES compilation failed.' })
  const program = gl.createProgram()!; gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !diagnostics.length) diagnostics.push({ line: 1, severity: 'error', source: 'material', message: gl.getProgramInfoLog(program) || 'GLSL ES link failed.' })
  if (!diagnostics.some(item => item.severity === 'error')) { gl.viewport(0, 0, canvas.width, canvas.height); gl.useProgram(program); for (const [name, value] of Object.entries(material.uniforms)) { const location = gl.getUniformLocation(program, name); if (!location) continue; if (typeof value === 'boolean') gl.uniform1i(location, value ? 1 : 0); else if (typeof value === 'number') gl.uniform1f(location, value); else if (value.length === 2) gl.uniform2fv(location, value); else if (value.length === 3) gl.uniform3fv(location, value); else gl.uniform4fv(location, value) } gl.drawArrays(gl.TRIANGLES, 0, 3) }
  gl.deleteShader(vertex); gl.deleteShader(fragment); gl.deleteProgram(program)
  return diagnostics
}

function noteFallback(reference: string, reason: string): Material2DResource {
  materialRuntimeDiagnostics.fallbackCount++; materialRuntimeDiagnostics.lastFallback = `${reference}: ${reason}`
  const event = { reference, reason, occurredAt: new Date().toISOString(), actionableFix: reason.includes('not found') ? 'Assign an existing material asset.' : reason.includes('cycle') ? 'Remove the cyclic parent material reference.' : 'Open the shader diagnostics, correct the material source, then save it.' }
  materialRuntimeDiagnostics.fallbackEvents.unshift(event); materialRuntimeDiagnostics.fallbackEvents.splice(32)
  return defaultMaterial(`Fallback · ${reference}`)
}
export function reportMaterialFallback(reference: string, reason: string): void { noteFallback(reference, reason) }
export function validateMaterialForPlatform(material: Material2DResource, platform: 'native-windows' | 'web', backend: 'WebGL2' | 'Canvas2D'): ShaderDiagnostic[] {
  const diagnostics = analyzeMaterialShader(material.fragment, material.includes)
  if (backend === 'Canvas2D' && material.fragment.trim() !== DEFAULT_MATERIAL_FRAGMENT.trim()) diagnostics.push({ line: 1, severity: 'warning', source: platform, message: 'Custom shader output is unsupported on Canvas2D and will use the explicit base-material fallback.' })
  return diagnostics
}
export function resolveMaterial(reference: string | null | undefined, visited = new Set<string>()): Material2DResource {
  if (!reference || reference === 'Default' || reference === 'Particles' || reference.startsWith('__')) return defaultMaterial(reference || 'Default')
  if (visited.has(reference)) return noteFallback(reference, 'inheritance cycle')
  visited.add(reference)
  const asset = resolveAsset(reference), source = asset?.assetType === 'material' ? readTextAsset(asset.uuid) : null
  if (!source) return noteFallback(reference, 'material asset not found')
  try { const material = normalizeMaterial(JSON.parse(source)); if (!material.parentMaterial) return material; const parent = resolveMaterial(material.parentMaterial, visited); return normalizeMaterial({ ...parent, ...material, name: material.name, uniforms: { ...parent.uniforms, ...material.uniforms }, textures: { ...parent.textures, ...material.textures }, uniformSchema: [...parent.uniformSchema, ...material.uniformSchema.filter(field => !parent.uniformSchema.some(parentField => parentField.name === field.name))] }) } catch { return noteFallback(reference, 'invalid serialized material') }
}
export function serializeMaterial(material: Material2DResource): string { return JSON.stringify(normalizeMaterial(material), null, 2) }
