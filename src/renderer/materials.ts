/** 材质资源管理：规范材质和参数，解析资源并提供渲染阶段所需的材质描述。 */
import { readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import type { BlendMode2D, TextureFilter } from './types'
import { compileMaterialGraph, compileMaterialLayers, normalizeMaterialGraph, normalizeMaterialLayers, type MaterialGraphDocument, type MaterialGraphTarget, type MaterialLayer2D } from './materialGraph'

export type MaterialUniform = number | boolean | number[]
export type MaterialUniformType = 'number' | 'integer' | 'vector2' | 'vector3' | 'vector4' | 'color' | 'texture' | 'enum' | 'range' | 'toggle'
export interface MaterialUniformField { name: string; type: MaterialUniformType; label: string; minimum?: number; maximum?: number; step?: number; options?: string[] }
export interface Material2DResource {
  version: 3
  name: string
  target: MaterialGraphTarget
  graph: MaterialGraphDocument | null
  layers: MaterialLayer2D[]
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

/* 创建带默认片段着色器、混合方式和空资源集合的材质。 */
export function defaultMaterial(name = 'New Material'): Material2DResource {
  return { version: 3, name, target: 'Sprite', graph: null, layers: [], fragment: DEFAULT_MATERIAL_FRAGMENT, textures: {}, uniforms: {}, uniformSchema: [], includes: [], variants: {}, activeVariant: '', parentMaterial: null, blendMode: 'Alpha', sampling: 'Linear', colorSpace: 'sRGB', writeColor: true }
}

/* 仅接受布尔值、有限数值及二至四维有限数值向量作为 uniform 值。 */
function safeUniform(value: unknown): MaterialUniform | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (Array.isArray(value) && value.length >= 2 && value.length <= 4 && value.every(/* 先计算 typeof item === 'number'；仅当其为真值时求右侧 Number.isFinite(item)，返回短路求值结果。 */ item => typeof item === 'number' && Number.isFinite(item))) return value
  return null
}
/* 根据 typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(value) 的真假，分别返回 value 或 fallback。 */ function safeName(value: unknown, fallback = ''): string { return typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(value) ? value : fallback }
/* 调用 name.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) 并返回调用结果。 */ function labelFromName(name: string): string { return name.replace(/_/g, ' ').replace(/\b\w/g, /* 调用 letter.toUpperCase() 并返回调用结果。 */ letter => letter.toUpperCase()) }
/* 从 GLSL 类型和注解推导 uniform 编辑字段，包括范围、枚举及显示类型。 */
function annotationField(name: string, glslType: string, annotation = ''): MaterialUniformField {
  const range = annotation.match(/@range\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i)
  const choices = annotation.match(/@enum\(([^)]+)\)/i)?.[1].split(',').map(/* 调用 item.trim() 并返回调用结果。 */ item => item.trim()).filter(Boolean).slice(0, 32)
  const explicit = annotation.match(/@(color|toggle|integer|number|texture)\b/i)?.[1].toLowerCase()
  const inferred: MaterialUniformType = glslType === 'sampler2D' ? 'texture' : glslType === 'bool' ? 'toggle' : glslType === 'int' ? 'integer' : glslType === 'vec2' ? 'vector2' : glslType === 'vec3' ? 'vector3' : glslType === 'vec4' ? 'vector4' : 'number'
  return { name, label: labelFromName(name), type: choices?.length ? 'enum' : range ? 'range' : explicit as MaterialUniformType || inferred, ...(range ? { minimum: Number(range[1]), maximum: Number(range[2]), step: Number(range[3]) || .01 } : {}), ...(choices?.length ? { options: choices } : {}) }
}

/** Reflects safe inspector metadata directly from GLSL ES declarations. */
/* 扫描受支持的 uniform 声明及注解，排除内置主纹理并限制字段数量。 */
export function reflectShaderUniforms(source: string): MaterialUniformField[] {
  const fields: MaterialUniformField[] = []
  const pattern = /^\s*uniform\s+(float|int|bool|vec2|vec3|vec4|sampler2D)\s+([A-Za-z_]\w*)\s*;\s*(?:\/\/\s*(.*))?$/gm
  for (const match of source.matchAll(pattern)) {
    if (match[2] === 'u_texture' || fields.some(/* 比较 field.name 与 match[2]，返回严格相等的判断结果。 */ field => field.name === match[2])) continue
    fields.push(annotationField(match[2], match[1], match[3] ?? ''))
    if (fields.length >= 32) break
  }
  return fields
}
/* 根据 uniform 字段类型提供默认布尔值、向量或标量。 */
function defaultValue(field: MaterialUniformField): MaterialUniform {
  if (field.type === 'toggle') return false
  if (field.type === 'vector2') return [0, 0]
  if (field.type === 'vector3') return [0, 0, 0]
  if (field.type === 'vector4' || field.type === 'color') return [1, 1, 1, 1]
  return field.minimum ?? 0
}
/* 清洗 uniform 编辑字段的名称、类型、范围和枚举选项。 */
function normalizeField(value: unknown): MaterialUniformField | null {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}, name = safeName(source.name)
  const types: MaterialUniformType[] = ['number', 'integer', 'vector2', 'vector3', 'vector4', 'color', 'texture', 'enum', 'range', 'toggle']
  if (!name || !types.includes(source.type as MaterialUniformType)) return null
  const field: MaterialUniformField = { name, type: source.type as MaterialUniformType, label: typeof source.label === 'string' ? source.label.slice(0, 80) : labelFromName(name) }
  if (Number.isFinite(source.minimum)) field.minimum = Number(source.minimum)
  if (Number.isFinite(source.maximum)) field.maximum = Number(source.maximum)
  if (Number.isFinite(source.step)) field.step = Math.max(Number.EPSILON, Number(source.step))
  if (Array.isArray(source.options)) field.options = source.options.map(String).map(/* 调用 item.slice(0, 48) 并返回调用结果。 */ item => item.slice(0, 48)).slice(0, 32)
  return field
}

/* 解析声明和源码中的 include 名称，插入内置片段并报告未知引用。 */
export function resolveShaderIncludes(source: string, declared: readonly string[] = []): { source: string; diagnostics: ShaderDiagnostic[] } {
  const diagnostics: ShaderDiagnostic[] = [], requested = new Set(declared.filter(/* 比较 typeof name 与 'string'，返回严格相等的判断结果。 */ name => typeof name === 'string').slice(0, 16))
  source.replace(/^\s*#include\s+[<"]([^>"]+)[>"]\s*$/gm, /* 收集源码中的 include 名称，返回空串供替换回调使用。 */ (_, name: string) => { requested.add(name); return '' })
  let output = source.replace(/^\s*#include\s+[<"]([^>"]+)[>"]\s*$/gm, '')
  for (const name of requested) {
    const include = MATERIAL_INCLUDE_LIBRARY[name]
    if (include) output = `${include}\n${output}`
    else diagnostics.push({ line: 1, severity: 'error', source: name, message: `Unknown shader include “${name}”.` })
  }
  return { source: output, diagnostics }
}
/* 组合图、层、include 与活动变体的片段源码，并合并诊断信息。 */
export function resolvedMaterialFragment(material: Material2DResource): { source: string; diagnostics: ShaderDiagnostic[] } {
  const graph = material.graph ? compileMaterialGraph(material.graph) : null, layers = material.layers.length ? compileMaterialLayers(material.layers) : null
  let fragment = material.fragment
  if (graph && layers) {
    const graphSource = graph.source.replace(/\bnova_material\b/g, 'nova_graph_material'), layerSource = layers.source.replace(/\bnova_material\b/g, 'nova_layers_material')
    fragment = `${graphSource}\n${layerSource}\nvec4 nova_material(vec4 baseColor,vec2 uv){return nova_layers_material(nova_graph_material(baseColor,uv),uv);}`
  } else if (graph) fragment = graph.source
  else if (layers) fragment = layers.source
  const included = resolveShaderIncludes(fragment, material.includes), variant = material.activeVariant ? material.variants[material.activeVariant] : ''
  const graphDiagnostics: ShaderDiagnostic[] = graph ? graph.diagnostics.map(/** 构造并返回记录 { line: 1, severity: item.severity, source: item.nodeUuid, message: item.message }，字段按当前实参及捕获状态求值。 */ item => ({ line: 1, severity: item.severity, source: item.nodeUuid, message: item.message })) : []
  return { source: variant ? `${variant}\n${included.source}` : included.source, diagnostics: [...included.diagnostics, ...graphDiagnostics] }
}

/* 将序列化材质归一化为受限资源结构，合并反射字段并补齐缺失 uniform 默认值。 */
export function normalizeMaterial(value: unknown): Material2DResource {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}, result = defaultMaterial(typeof source.name === 'string' ? source.name.slice(0, 80) : undefined)
  result.target = source.target === 'UI' || source.target === 'Light' ? source.target : 'Sprite'
  result.graph = source.graph && typeof source.graph === 'object' ? normalizeMaterialGraph(source.graph) : null
  result.layers = normalizeMaterialLayers(source.layers)
  result.fragment = typeof source.fragment === 'string' ? source.fragment.slice(0, 32_000) : result.fragment
  result.blendMode = ['Alpha', 'Additive', 'Multiply', 'Screen'].includes(String(source.blendMode)) ? source.blendMode as BlendMode2D : 'Alpha'
  result.sampling = source.sampling === 'Nearest' ? 'Nearest' : 'Linear'; result.colorSpace = source.colorSpace === 'Linear' ? 'Linear' : 'sRGB'; result.writeColor = source.writeColor !== false
  result.parentMaterial = typeof source.parentMaterial === 'string' ? source.parentMaterial.slice(0, 512) : null
  result.includes = Array.isArray(source.includes) ? [...new Set(source.includes.map(String).filter(/* 只保留内置着色 include 库中存在的名称。 */ name => name in MATERIAL_INCLUDE_LIBRARY))].slice(0, 16) : []
  if (source.variants && typeof source.variants === 'object') for (const [name, definition] of Object.entries(source.variants).slice(0, 16)) { const safe = safeName(name); if (safe && typeof definition === 'string') result.variants[safe] = definition.slice(0, 2_000) }
  result.activeVariant = safeName(source.activeVariant); if (!(result.activeVariant in result.variants)) result.activeVariant = ''
  if (source.textures && typeof source.textures === 'object') for (const [name, reference] of Object.entries(source.textures).slice(0, 8)) if (safeName(name)) result.textures[name] = typeof reference === 'string' ? reference.slice(0, 512) : null
  if (result.layers.length) Object.assign(result.textures, compileMaterialLayers(result.layers).textureBindings)
  if (source.uniforms && typeof source.uniforms === 'object') for (const [name, uniform] of Object.entries(source.uniforms).slice(0, 32)) { const safe = safeUniform(uniform); if (safe !== null && safeName(name)) result.uniforms[name] = safe }
  const reflected = reflectShaderUniforms(result.fragment), stored = Array.isArray(source.uniformSchema) ? source.uniformSchema.map(normalizeField).filter(/* 调用 Boolean(field) 并返回调用结果。 */ (field): field is MaterialUniformField => Boolean(field)) : []
  result.uniformSchema = [...reflected, ...stored.filter(/* 返回 reflected.some(item => item.name === field.name) 的逻辑取反结果。 */ field => !reflected.some(/* 比较 item.name 与 field.name，返回严格相等的判断结果。 */ item => item.name === field.name))].slice(0, 32)
  for (const field of result.uniformSchema) field.type === 'texture' ? (field.name in result.textures || (result.textures[field.name] = null)) : (field.name in result.uniforms || (result.uniforms[field.name] = defaultValue(field)))
  return result
}

/* 检查安全着色子集、循环上限、入口签名与源码长度，返回逐行诊断。 */
export function analyzeMaterialShader(source: string, includes: readonly string[] = []): ShaderDiagnostic[] {
  const resolved = resolveShaderIncludes(source, includes), diagnostics: ShaderDiagnostic[] = [...resolved.diagnostics], lines = resolved.source.split(/\r?\n/), forbidden = /\b(?:discard|while|do|atomic\w*|image\w*|sampler3D|samplerCube|gl_FragDepth)\b/
  lines.forEach(/* 检查当前着色源码行中的禁用特性及循环边界，并记录行号。 */ (line, index) => {
    const match = line.match(forbidden); if (match) diagnostics.push({ line: index + 1, severity: 'error', source: 'material', message: `“${match[0]}” is outside Nova_A's safe 2D shader subset.` })
    const loop = line.match(/\bfor\s*\([^;]*;\s*[^<]*<\s*(\d+)/); if (/\bfor\s*\(/.test(line) && (!loop || Number(loop[1]) > 64)) diagnostics.push({ line: index + 1, severity: 'error', source: 'material', message: 'Shader loops require a compile-time bound of 64 iterations or fewer.' })
  })
  if (!/\bvec4\s+nova_material\s*\(\s*vec4\s+[A-Za-z_]\w*\s*,\s*vec2\s+[A-Za-z_]\w*\s*\)/.test(resolved.source)) diagnostics.push({ line: 1, severity: 'error', source: 'material', message: 'Define vec4 nova_material(vec4 baseColor, vec2 uv).' })
  if (source.length > 32_000) diagnostics.push({ line: lines.length, severity: 'error', source: 'material', message: 'Shader source exceeds the 32 KB safety limit.' })
  return diagnostics
}

/* 缓存材质源码诊断，在可用的 WebGL2 上下文中执行片段着色器预编译。 */
export function compileMaterialPreview(source: string, includes: readonly string[] = []): ShaderDiagnostic[] {
  const cacheKey = `${includes.join('|')}\u0000${source}`, cached = compileCache.get(cacheKey)
  if (cached) { materialRuntimeDiagnostics.compileCacheHits++; return cached.map(/** 构造并返回记录 { ...item }，字段按当前实参及捕获状态求值。 */ item => ({ ...item })) }
  materialRuntimeDiagnostics.compileCacheMisses++
  const resolved = resolveShaderIncludes(source, includes), diagnostics = analyzeMaterialShader(source, includes)
  if (!diagnostics.some(/* 比较 item.severity 与 'error'，返回严格相等的判断结果。 */ item => item.severity === 'error') && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'), gl = canvas.getContext('webgl2')
    if (!gl) diagnostics.push({ line: 1, severity: 'warning', source: 'renderer', message: 'WebGL2 is unavailable; Canvas2D fallback will use the base material.' })
    else { const shader = gl.createShader(gl.FRAGMENT_SHADER); if (!shader) diagnostics.push({ line: 1, severity: 'error', source: 'renderer', message: 'Could not allocate shader.' }); else { gl.shaderSource(shader, `#version 300 es\nprecision highp float;\n${resolved.source}\nout vec4 outputColor;void main(){outputColor=nova_material(vec4(1.0),vec2(0.5));}`); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const message = gl.getShaderInfoLog(shader) || 'GLSL ES compilation failed.'; diagnostics.push({ line: Number(message.match(/ERROR:\s*\d+:(\d+)/)?.[1] ?? 1), severity: 'error', source: 'material', message }) } gl.deleteShader(shader) } }
  }
  compileCache.set(cacheKey, diagnostics.map(/** 构造并返回记录 { ...item }，字段按当前实参及捕获状态求值。 */ item => ({ ...item }))); if (compileCache.size > 64) compileCache.delete(compileCache.keys().next().value as string)
  return diagnostics
}

/* 为材质中尚未由源码声明的数值与纹理资源生成 uniform 声明。 */
function declarations(material: Material2DResource, source: string) {
  const declared = new Set(reflectShaderUniforms(source).map(/* 返回 field.name 的当前值。 */ field => field.name))
  return {
    uniforms: Object.entries(material.uniforms).filter(/* 返回 declared.has(name) 的逻辑取反结果。 */ ([name]) => !declared.has(name)).map(/* 根据 uniform 的布尔、标量或向量值生成对应 GLSL 声明。 */ ([name, value]) => Array.isArray(value) ? `uniform vec${value.length} ${name};` : typeof value === 'boolean' ? `uniform bool ${name};` : `uniform float ${name};`).join('\n'),
    textures: Object.keys(material.textures).filter(/* 返回 declared.has(name) 的逻辑取反结果。 */ name => !declared.has(name)).map(/** 按模板 `uniform sampler2D ${name};` 生成并返回字符串。 */ name => `uniform sampler2D ${name};`).join('\n')
  }
}
/* 在预览画布中验证并编译材质，设置资源值绘制预览，最后释放临时着色对象。 */
export function renderMaterialPreview(canvas: HTMLCanvasElement, materialInput: Material2DResource): ShaderDiagnostic[] {
  const material = normalizeMaterial(materialInput), resolved = resolvedMaterialFragment(material), diagnostics = [...resolved.diagnostics, ...analyzeMaterialShader(resolved.source, material.includes)]
  if (diagnostics.some(/* 比较 item.severity 与 'error'，返回严格相等的判断结果。 */ item => item.severity === 'error')) return diagnostics
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true })
  if (!gl) return [...diagnostics, { line: 1, severity: 'warning', source: 'renderer', message: 'WebGL2 is unavailable; the base-material fallback remains active.' }]
  const declared = declarations(material, resolved.source)
  const vertexSource = `#version 300 es\nconst vec2 p[3]=vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));out vec2 uv;void main(){gl_Position=vec4(p[gl_VertexID],0.,1.);uv=p[gl_VertexID]*.5+.5;}`
  const fragmentSource = `#version 300 es\nprecision highp float;in vec2 uv;${declared.uniforms}\n${declared.textures}\n${resolved.source}\nout vec4 outputColor;void main(){vec2 grid=abs(fract(uv*8.)-.5);float checker=step(.25,max(grid.x,grid.y));vec4 baseColor=mix(vec4(.15,.18,.23,1.),vec4(.5,.58,.7,1.),checker);outputColor=nova_material(baseColor,uv);}`
  const compile = /* 创建并编译指定类型的预览着色器，返回供程序链接的对象。 */ (type: number, shaderSource: string) => { const shader = gl.createShader(type)!; gl.shaderSource(shader, shaderSource); gl.compileShader(shader); return shader }, vertex = compile(gl.VERTEX_SHADER, vertexSource), fragment = compile(gl.FRAGMENT_SHADER, fragmentSource)
  if (!gl.getShaderParameter(fragment, gl.COMPILE_STATUS)) diagnostics.push({ line: Number((gl.getShaderInfoLog(fragment) || '').match(/ERROR:\s*\d+:(\d+)/)?.[1] ?? 1), severity: 'error', source: 'material', message: gl.getShaderInfoLog(fragment) || 'GLSL ES compilation failed.' })
  const program = gl.createProgram()!; gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !diagnostics.length) diagnostics.push({ line: 1, severity: 'error', source: 'material', message: gl.getProgramInfoLog(program) || 'GLSL ES link failed.' })
  if (!diagnostics.some(/* 比较 item.severity 与 'error'，返回严格相等的判断结果。 */ item => item.severity === 'error')) { gl.viewport(0, 0, canvas.width, canvas.height); gl.useProgram(program); for (const [name, value] of Object.entries(material.uniforms)) { const location = gl.getUniformLocation(program, name); if (!location) continue; if (typeof value === 'boolean') gl.uniform1i(location, value ? 1 : 0); else if (typeof value === 'number') gl.uniform1f(location, value); else if (value.length === 2) gl.uniform2fv(location, value); else if (value.length === 3) gl.uniform3fv(location, value); else gl.uniform4fv(location, value) } gl.drawArrays(gl.TRIANGLES, 0, 3) }
  gl.deleteShader(vertex); gl.deleteShader(fragment); gl.deleteProgram(program)
  return diagnostics
}

/* 记录材质回退原因及可采取的修复措施，并返回默认材质。 */
function noteFallback(reference: string, reason: string): Material2DResource {
  materialRuntimeDiagnostics.fallbackCount++; materialRuntimeDiagnostics.lastFallback = `${reference}: ${reason}`
  const event = { reference, reason, occurredAt: new Date().toISOString(), actionableFix: reason.includes('not found') ? 'Assign an existing material asset.' : reason.includes('cycle') ? 'Remove the cyclic parent material reference.' : 'Open the shader diagnostics, correct the material source, then save it.' }
  materialRuntimeDiagnostics.fallbackEvents.unshift(event); materialRuntimeDiagnostics.fallbackEvents.splice(32)
  return defaultMaterial(`Fallback · ${reference}`)
}
/** 执行时调用 noteFallback(reference, reason)；不显式返回调用结果。 */ export function reportMaterialFallback(reference: string, reason: string): void { noteFallback(reference, reason) }
/* 计算 Canvas2D 可支持的材质基础颜色近似，按启用的图和层效果更新颜色。 */
export function canvasMaterialColor(material: Material2DResource, input: { r: number; g: number; b: number; a: number }): { r: number; g: number; b: number; a: number } {
  let color = { ...input }
  const blend = /* 按指定透明度及混合模式，将目标颜色合成到当前预览颜色。 */ (target: [number, number, number, number], amount: number, mode: BlendMode2D) => {
    const opacity = Math.min(1, Math.max(0, amount * target[3])), normalized = { r: target[0] * 255, g: target[1] * 255, b: target[2] * 255, a: target[3] }
    if (mode === 'Additive') color = { r: Math.min(255, color.r + normalized.r * opacity), g: Math.min(255, color.g + normalized.g * opacity), b: Math.min(255, color.b + normalized.b * opacity), a: color.a }
    else if (mode === 'Multiply') color = { r: color.r * (1 - opacity + target[0] * opacity), g: color.g * (1 - opacity + target[1] * opacity), b: color.b * (1 - opacity + target[2] * opacity), a: color.a }
    else if (mode === 'Screen') color = { r: 255 - (255 - color.r) * (1 - target[0] * opacity), g: 255 - (255 - color.g) * (1 - target[1] * opacity), b: 255 - (255 - color.b) * (1 - target[2] * opacity), a: color.a }
    else color = { r: color.r + (normalized.r - color.r) * opacity, g: color.g + (normalized.g - color.g) * opacity, b: color.b + (normalized.b - color.b) * opacity, a: color.a + (normalized.a - color.a) * opacity }
  }
  for (const layer of material.layers) {
    if (!layer.enabled) continue
    if (layer.kind === 'Tint') blend(layer.colorA, layer.opacity, layer.blendMode)
    else if (layer.kind === 'Gradient') blend(layer.colorA.map(/* 计算表达式 (value + layer.colorB[index]) * .5 并返回结果，沿用操作数的原有类型规则。 */ (value, index) => (value + layer.colorB[index]) * .5) as MaterialLayer2D['colorA'], layer.opacity, layer.blendMode)
    else if (layer.kind === 'Palette') { const steps = Math.max(2, Math.round(layer.strength)); color = { ...color, r: Math.round(color.r / 255 * steps) / steps * 255, g: Math.round(color.g / 255 * steps) / steps * 255, b: Math.round(color.b / 255 * steps) / steps * 255 } }
  }
  return color
}
/* 检查平台材质源码，并为 Canvas2D 不支持的自定义着色输出提供明确警告。 */
export function validateMaterialForPlatform(material: Material2DResource, platform: 'native-windows' | 'web', backend: 'WebGL2' | 'Canvas2D'): ShaderDiagnostic[] {
  const diagnostics = analyzeMaterialShader(material.fragment, material.includes)
  if (backend === 'Canvas2D' && material.fragment.trim() !== DEFAULT_MATERIAL_FRAGMENT.trim()) diagnostics.push({ line: 1, severity: 'warning', source: platform, message: 'Custom shader output is unsupported on Canvas2D and will use the explicit base-material fallback.' })
  return diagnostics
}
/* 解析材质资源与父材质继承，合并属性；资源缺失、格式错误或循环引用时记录回退。 */
export function resolveMaterial(reference: string | null | undefined, visited = new Set<string>()): Material2DResource {
  if (!reference || reference === 'Default' || reference === 'Particles' || reference.startsWith('__')) return defaultMaterial(reference || 'Default')
  if (visited.has(reference)) return noteFallback(reference, 'inheritance cycle')
  visited.add(reference)
  const asset = resolveAsset(reference), source = asset?.assetType === 'material' ? readTextAsset(asset.uuid) : null
  if (!source) return noteFallback(reference, 'material asset not found')
  try { const material = normalizeMaterial(JSON.parse(source)); if (!material.parentMaterial) return material; const parent = resolveMaterial(material.parentMaterial, visited); return normalizeMaterial({ ...parent, ...material, name: material.name, uniforms: { ...parent.uniforms, ...material.uniforms }, textures: { ...parent.textures, ...material.textures }, uniformSchema: [...parent.uniformSchema, ...material.uniformSchema.filter(/* 返回 parent.uniformSchema.some(parentField => parentField.name === field.name) 的逻辑取反结果。 */ field => !parent.uniformSchema.some(/* 比较 parentField.name 与 field.name，返回严格相等的判断结果。 */ parentField => parentField.name === field.name))] }) } catch { return noteFallback(reference, 'invalid serialized material') }
}
/* 调用 JSON.stringify(normalizeMaterial(material), null, 2) 并返回调用结果。 */ export function serializeMaterial(material: Material2DResource): string { return JSON.stringify(normalizeMaterial(material), null, 2) }
