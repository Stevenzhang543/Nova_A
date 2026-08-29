import type { BlendMode2D } from './types'

export type MaterialGraphTarget = 'Sprite' | 'UI' | 'Light'
export type MaterialGraphPinType = 'Color' | 'Number' | 'Vector2' | 'Texture'
export type MaterialGraphNodeKind =
  | 'SpriteTexture' | 'UITexture' | 'LightColor' | 'UV' | 'Time' | 'Color' | 'Number'
  | 'Gradient' | 'Palette' | 'Mask' | 'Outline' | 'Dissolve' | 'Distortion'
  | 'Multiply' | 'Add' | 'Blend' | 'Output'

export interface MaterialGraphNode {
  uuid: string
  kind: MaterialGraphNodeKind
  label: string
  position: { x: number; y: number }
  values: Record<string, number | string | boolean | number[]>
}

export interface MaterialGraphEdge {
  uuid: string
  fromNode: string
  fromPin: string
  toNode: string
  toPin: string
}

export interface MaterialGraphDocument {
  format: 'nova-material-graph'
  version: 1
  target: MaterialGraphTarget
  nodes: MaterialGraphNode[]
  edges: MaterialGraphEdge[]
  viewport: { x: number; y: number; zoom: number }
}

export type MaterialLayerKind = 'Tint' | 'Mask' | 'Gradient' | 'Palette' | 'Outline' | 'Dissolve' | 'Distortion'
export interface MaterialLayer2D {
  id: string
  name: string
  enabled: boolean
  kind: MaterialLayerKind
  opacity: number
  blendMode: BlendMode2D
  colorA: [number, number, number, number]
  colorB: [number, number, number, number]
  threshold: number
  softness: number
  strength: number
  texture: string | null
}

export interface MaterialGraphDiagnostic {
  severity: 'error' | 'warning'
  nodeUuid: string
  message: string
}

export interface MaterialCapabilityPreview {
  backend: 'WebGL2' | 'Canvas2D'
  supportedNodes: number
  fallbackNodes: string[]
  gpuCost: { score: number; estimatedMsAt1080p: number; textureReads: number; arithmeticOps: number }
  recommendation: string
}

const NODE_KINDS: readonly MaterialGraphNodeKind[] = ['SpriteTexture', 'UITexture', 'LightColor', 'UV', 'Time', 'Color', 'Number', 'Gradient', 'Palette', 'Mask', 'Outline', 'Dissolve', 'Distortion', 'Multiply', 'Add', 'Blend', 'Output']
const LAYER_KINDS: readonly MaterialLayerKind[] = ['Tint', 'Mask', 'Gradient', 'Palette', 'Outline', 'Dissolve', 'Distortion']
const BLENDS: readonly BlendMode2D[] = ['Alpha', 'Additive', 'Multiply', 'Screen']

function text(value: unknown, fallback: string, maximum = 80): string {
  const result = typeof value === 'string' ? value.trim().slice(0, maximum) : ''
  return result || fallback
}
function finite(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(maximum, Math.max(minimum, number))
}
function identifier(value: unknown, fallback: string): string {
  const result = text(value, fallback, 96).replace(/[^A-Za-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return result || fallback
}
function vector(value: unknown, fallback: number[], length: number): number[] {
  return Array.isArray(value) && value.length >= length
    ? value.slice(0, length).map((item, index) => finite(item, fallback[index], -1_000_000, 1_000_000))
    : [...fallback]
}
function glslFloat(value: unknown, fallback = 0): string {
  const number = finite(value, fallback, -1_000_000, 1_000_000)
  const result = Number(number.toFixed(6)).toString()
  return result.includes('.') ? result : `${result}.0`
}
function glslColor(value: unknown, fallback = [1, 1, 1, 1]): string {
  const color = vector(value, fallback, 4).map(item => glslFloat(item))
  return `vec4(${color.join(',')})`
}

export function defaultMaterialGraph(target: MaterialGraphTarget = 'Sprite'): MaterialGraphDocument {
  const inputKind: MaterialGraphNodeKind = target === 'UI' ? 'UITexture' : target === 'Light' ? 'LightColor' : 'SpriteTexture'
  return {
    format: 'nova-material-graph', version: 1, target,
    nodes: [
      { uuid: 'input', kind: inputKind, label: target, position: { x: 40, y: 120 }, values: {} },
      { uuid: 'output', kind: 'Output', label: 'Output', position: { x: 420, y: 120 }, values: {} }
    ],
    edges: [{ uuid: 'input-output', fromNode: 'input', fromPin: 'color', toNode: 'output', toPin: 'color' }],
    viewport: { x: 0, y: 0, zoom: 1 }
  }
}

function normalizeNode(value: unknown, index: number): MaterialGraphNode | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Record<string, unknown>, kind = NODE_KINDS.includes(source.kind as MaterialGraphNodeKind) ? source.kind as MaterialGraphNodeKind : null
  if (!kind) return null
  const position = source.position && typeof source.position === 'object' ? source.position as Record<string, unknown> : {}
  const values: MaterialGraphNode['values'] = {}
  if (source.values && typeof source.values === 'object' && !Array.isArray(source.values)) {
    for (const [key, item] of Object.entries(source.values).slice(0, 24)) {
      const safeKey = identifier(key, '')
      if (!safeKey) continue
      if (typeof item === 'number' && Number.isFinite(item)) values[safeKey] = item
      else if (typeof item === 'string') values[safeKey] = item.slice(0, 512)
      else if (typeof item === 'boolean') values[safeKey] = item
      else if (Array.isArray(item) && item.length <= 4 && item.every(entry => typeof entry === 'number' && Number.isFinite(entry))) values[safeKey] = item.slice()
    }
  }
  const uuid = identifier(source.uuid, `node-${index + 1}`)
  return { uuid, kind, label: text(source.label, kind), position: { x: finite(position.x, index * 180, -100_000, 100_000), y: finite(position.y, 100, -100_000, 100_000) }, values }
}

export function normalizeMaterialGraph(value: unknown): MaterialGraphDocument {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const target: MaterialGraphTarget = source.target === 'UI' || source.target === 'Light' ? source.target : 'Sprite'
  const nodes = Array.isArray(source.nodes) ? source.nodes.slice(0, 256).map(normalizeNode).filter((node): node is MaterialGraphNode => Boolean(node)) : []
  const uniqueNodes = [...new Map(nodes.map(node => [node.uuid, node])).values()]
  const known = new Set(uniqueNodes.map(node => node.uuid))
  const edges: MaterialGraphEdge[] = []
  if (Array.isArray(source.edges)) for (const [index, item] of source.edges.slice(0, 512).entries()) {
    if (!item || typeof item !== 'object') continue
    const edge = item as Record<string, unknown>, fromNode = identifier(edge.fromNode, ''), toNode = identifier(edge.toNode, '')
    if (!known.has(fromNode) || !known.has(toNode) || fromNode === toNode) continue
    edges.push({ uuid: identifier(edge.uuid, `edge-${index + 1}`), fromNode, fromPin: identifier(edge.fromPin, 'color'), toNode, toPin: identifier(edge.toPin, 'color') })
  }
  const viewport = source.viewport && typeof source.viewport === 'object' ? source.viewport as Record<string, unknown> : {}
  return {
    format: 'nova-material-graph', version: 1, target,
    nodes: uniqueNodes.sort((a, b) => a.uuid.localeCompare(b.uuid)),
    edges: [...new Map(edges.map(edge => [edge.uuid, edge])).values()].sort((a, b) => a.uuid.localeCompare(b.uuid)),
    viewport: { x: finite(viewport.x, 0, -100_000, 100_000), y: finite(viewport.y, 0, -100_000, 100_000), zoom: finite(viewport.zoom, 1, .1, 8) }
  }
}

export function defaultMaterialLayer(kind: MaterialLayerKind, index = 0): MaterialLayer2D {
  return { id: `layer-${index + 1}`, name: kind, enabled: true, kind, opacity: 1, blendMode: kind === 'Tint' ? 'Multiply' : 'Alpha', colorA: [1, 1, 1, 1], colorB: [0, 0, 0, 1], threshold: .5, softness: .05, strength: .25, texture: null }
}

export function normalizeMaterialLayers(value: unknown): MaterialLayer2D[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 16).flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const source = item as Record<string, unknown>, kind = LAYER_KINDS.includes(source.kind as MaterialLayerKind) ? source.kind as MaterialLayerKind : null
    if (!kind) return []
    const layer = defaultMaterialLayer(kind, index)
    layer.id = identifier(source.id, layer.id); layer.name = text(source.name, kind); layer.enabled = source.enabled !== false
    layer.opacity = finite(source.opacity, 1, 0, 1); layer.blendMode = BLENDS.includes(source.blendMode as BlendMode2D) ? source.blendMode as BlendMode2D : 'Alpha'
    layer.colorA = vector(source.colorA, layer.colorA, 4) as MaterialLayer2D['colorA']; layer.colorB = vector(source.colorB, layer.colorB, 4) as MaterialLayer2D['colorB']
    layer.threshold = finite(source.threshold, .5, 0, 1); layer.softness = finite(source.softness, .05, .0001, 1); layer.strength = finite(source.strength, .25, 0, 32)
    layer.texture = typeof source.texture === 'string' ? source.texture.slice(0, 512) : null
    return [layer]
  })
}

function incoming(graph: MaterialGraphDocument, nodeUuid: string, pin = 'color'): MaterialGraphEdge | undefined {
  return graph.edges.find(edge => edge.toNode === nodeUuid && edge.toPin === pin) ?? graph.edges.find(edge => edge.toNode === nodeUuid)
}

export function validateMaterialGraph(input: unknown): MaterialGraphDiagnostic[] {
  const graph = normalizeMaterialGraph(input), diagnostics: MaterialGraphDiagnostic[] = []
  const output = graph.nodes.filter(node => node.kind === 'Output')
  if (output.length !== 1) diagnostics.push({ severity: 'error', nodeUuid: output[0]?.uuid ?? '', message: 'A material graph requires exactly one Output node.' })
  if (output[0] && !incoming(graph, output[0].uuid)) diagnostics.push({ severity: 'error', nodeUuid: output[0].uuid, message: 'Connect a color value to Output.' })
  const adjacency = new Map(graph.nodes.map(node => [node.uuid, [] as string[]]))
  for (const edge of graph.edges) adjacency.get(edge.fromNode)?.push(edge.toNode)
  const visiting = new Set<string>(), visited = new Set<string>()
  const visit = (uuid: string): boolean => {
    if (visiting.has(uuid)) return true
    if (visited.has(uuid)) return false
    visiting.add(uuid)
    for (const next of adjacency.get(uuid) ?? []) if (visit(next)) return true
    visiting.delete(uuid); visited.add(uuid); return false
  }
  for (const node of graph.nodes) if (visit(node.uuid)) { diagnostics.push({ severity: 'error', nodeUuid: node.uuid, message: 'Material data cycles are not allowed.' }); break }
  for (const node of graph.nodes) {
    if (node.kind === 'SpriteTexture' && graph.target !== 'Sprite') diagnostics.push({ severity: 'warning', nodeUuid: node.uuid, message: 'Sprite Texture is being previewed outside a Sprite target.' })
    if (node.kind === 'UITexture' && graph.target !== 'UI') diagnostics.push({ severity: 'warning', nodeUuid: node.uuid, message: 'UI Texture is being previewed outside a UI target.' })
    if (node.kind === 'LightColor' && graph.target !== 'Light') diagnostics.push({ severity: 'warning', nodeUuid: node.uuid, message: 'Light Color is being previewed outside a Light target.' })
  }
  return diagnostics
}

function compileExpression(graph: MaterialGraphDocument, uuid: string, cache: Map<string, string>, stack: Set<string>): string {
  if (cache.has(uuid)) return cache.get(uuid)!
  if (stack.has(uuid)) return 'baseColor'
  stack.add(uuid)
  const node = graph.nodes.find(candidate => candidate.uuid === uuid)
  if (!node) return 'baseColor'
  const source = (pin = 'color', fallback = 'baseColor') => {
    const edge = incoming(graph, uuid, pin)
    return edge ? compileExpression(graph, edge.fromNode, cache, stack) : fallback
  }
  const amount = glslFloat(node.values.amount, .5), strength = glslFloat(node.values.strength, .25), threshold = glslFloat(node.values.threshold, .5), softness = glslFloat(node.values.softness, .05)
  let expression = 'baseColor'
  if (node.kind === 'Color') expression = glslColor(node.values.color)
  else if (node.kind === 'Number') expression = `vec4(${glslFloat(node.values.value, 1.0)})`
  else if (node.kind === 'UV') expression = 'vec4(uv,0.0,1.0)'
  else if (node.kind === 'Time') expression = 'vec4(u_nova_time)'
  else if (node.kind === 'Gradient') expression = `mix(${glslColor(node.values.colorA, [1, 1, 1, 1])},${glslColor(node.values.colorB, [0, 0, 0, 1])},clamp(uv.y,0.0,1.0))`
  else if (node.kind === 'Palette') expression = `vec4(floor(clamp(${source()}.rgb,0.0,1.0)*${glslFloat(node.values.steps, 6)})/${glslFloat(node.values.steps, 6)},${source()}.a)`
  else if (node.kind === 'Mask') expression = `vec4(${source()}.rgb,${source()}.a*clamp(${source('mask', 'vec4(1.0)')}.r,0.0,1.0))`
  else if (node.kind === 'Outline') expression = `mix(${source()},${glslColor(node.values.color, [0, .5, 1, 1])},clamp((1.0-${source()}.a)*${strength},0.0,1.0))`
  else if (node.kind === 'Dissolve') expression = `vec4(${source()}.rgb,${source()}.a*smoothstep(${threshold}-${softness},${threshold}+${softness},nova_hash(uv*257.0)))`
  else if (node.kind === 'Distortion') expression = `texture(u_texture,clamp(uv+(vec2(nova_hash(uv*127.0),nova_hash(uv.yx*193.0))-.5)*${strength}*.02,0.0,1.0))`
  else if (node.kind === 'Multiply') expression = `(${source('a')}*${source('b', 'vec4(1.0)')})`
  else if (node.kind === 'Add') expression = `clamp(${source('a')}+${source('b', 'vec4(0.0)')},0.0,1.0)`
  else if (node.kind === 'Blend') expression = `mix(${source('a')},${source('b', 'vec4(0.0)')},clamp(${amount},0.0,1.0))`
  else if (node.kind === 'Output') expression = source()
  cache.set(uuid, expression); stack.delete(uuid); return expression
}

export function compileMaterialGraph(input: unknown): { source: string; diagnostics: MaterialGraphDiagnostic[] } {
  const graph = normalizeMaterialGraph(input), diagnostics = validateMaterialGraph(graph), output = graph.nodes.find(node => node.kind === 'Output')
  const expression = output ? compileExpression(graph, output.uuid, new Map(), new Set()) : 'baseColor'
  const usesNoise = graph.nodes.some(node => node.kind === 'Dissolve' || node.kind === 'Distortion')
  const helpers = usesNoise ? 'float nova_hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}\n' : ''
  return { source: `${helpers}uniform float u_nova_time;\nvec4 nova_material(vec4 baseColor, vec2 uv){return clamp(${expression},0.0,1.0);}`, diagnostics }
}

function blendExpression(base: string, layer: string, blendMode: BlendMode2D, opacity: string): string {
  if (blendMode === 'Additive') return `mix(${base},clamp(${base}+${layer},0.0,1.0),${opacity})`
  if (blendMode === 'Multiply') return `mix(${base},${base}*${layer},${opacity})`
  if (blendMode === 'Screen') return `mix(${base},vec4(1.0-(1.0-${base}.rgb)*(1.0-${layer}.rgb),${base}.a),${opacity})`
  return `mix(${base},${layer},${opacity}*${layer}.a)`
}

export function compileMaterialLayers(input: unknown): { source: string; textureBindings: Record<string, string | null> } {
  const layers = normalizeMaterialLayers(input).filter(layer => layer.enabled), lines = ['vec4 result=baseColor;'], textureBindings: Record<string, string | null> = {}
  let usesNoise = false
  layers.forEach((layer, index) => {
    const opacity = glslFloat(layer.opacity, 1), strength = glslFloat(layer.strength, .25), threshold = glslFloat(layer.threshold, .5), softness = glslFloat(layer.softness, .05), colorA = glslColor(layer.colorA), colorB = glslColor(layer.colorB)
    let expression = 'result'
    if (layer.kind === 'Tint') expression = colorA
    else if (layer.kind === 'Gradient') expression = `mix(${colorA},${colorB},clamp(uv.y,0.0,1.0))`
    else if (layer.kind === 'Palette') expression = `vec4(floor(clamp(result.rgb,0.0,1.0)*max(2.0,${strength})) / max(2.0,${strength}),result.a)`
    else if (layer.kind === 'Outline') expression = `mix(result,${colorA},clamp((1.0-result.a)*${strength},0.0,1.0))`
    else if (layer.kind === 'Dissolve') { usesNoise = true; expression = `vec4(result.rgb,result.a*smoothstep(${threshold}-${softness},${threshold}+${softness},nova_layer_hash(uv*257.0)))` }
    else if (layer.kind === 'Distortion') { usesNoise = true; expression = `texture(u_texture,clamp(uv+(vec2(nova_layer_hash(uv*127.0),nova_layer_hash(uv.yx*193.0))-.5)*${strength}*.02,0.0,1.0))` }
    else if (layer.kind === 'Mask') { const uniform = `nova_layer_tex_${index}`; textureBindings[uniform] = layer.texture; expression = `vec4(result.rgb,result.a*texture(${uniform},uv).r)` }
    lines.push(`result=${blendExpression('result', expression, layer.blendMode, opacity)};`)
  })
  const uniforms = Object.keys(textureBindings).map(name => `uniform sampler2D ${name};`).join('\n')
  const helpers = usesNoise ? 'float nova_layer_hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}\n' : ''
  return { source: `${uniforms}\n${helpers}vec4 nova_material(vec4 baseColor, vec2 uv){${lines.join('')}return clamp(result,0.0,1.0);}`, textureBindings }
}

export function materialCapabilityPreview(graphInput: unknown, layersInput: unknown, backend: 'WebGL2' | 'Canvas2D'): MaterialCapabilityPreview {
  const graph = normalizeMaterialGraph(graphInput), layers = normalizeMaterialLayers(layersInput).filter(layer => layer.enabled)
  const expensive = new Set<MaterialGraphNodeKind>(['Outline', 'Dissolve', 'Distortion', 'Mask'])
  const fallbackNodes = backend === 'Canvas2D'
    ? [...graph.nodes.filter(node => expensive.has(node.kind)).map(node => node.label), ...layers.filter(layer => ['Mask', 'Outline', 'Dissolve', 'Distortion'].includes(layer.kind)).map(layer => layer.name)]
    : []
  const textureReads = 1 + graph.nodes.filter(node => ['SpriteTexture', 'UITexture', 'Mask', 'Outline', 'Distortion'].includes(node.kind)).length + layers.filter(layer => ['Mask', 'Outline', 'Distortion'].includes(layer.kind)).length
  const arithmeticOps = graph.nodes.length * 4 + layers.length * 7 + graph.nodes.filter(node => expensive.has(node.kind)).length * 8
  const score = textureReads * 3 + arithmeticOps / 8
  return { backend, supportedNodes: graph.nodes.length + layers.length - fallbackNodes.length, fallbackNodes, gpuCost: { score: Number(score.toFixed(2)), estimatedMsAt1080p: Number((score * .008).toFixed(3)), textureReads, arithmeticOps }, recommendation: fallbackNodes.length ? 'Canvas2D uses the base color for unsupported graph effects; select WebGL2 for full output.' : score > 24 ? 'Consider baking gradients/palettes into an atlas and reducing distortion/outline layers.' : 'Within the default material budget.' }
}
