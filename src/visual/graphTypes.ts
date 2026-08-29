export const NOVA_GRAPH_FORMAT = 'nova-graph' as const
export const NOVA_GRAPH_VERSION = 1 as const
export const MAX_GRAPH_NODES = 10_000
export const MAX_GRAPH_EDGES = 20_000
export const MAX_GRAPH_VARIABLES = 1_024
export const MAX_GRAPH_COMMENTS = 2_048
export const MAX_GRAPH_ROUTINES = 256
export const MAX_GRAPH_INTERFACES = 128
export const MAX_GRAPH_EVENTS = 256
export const MAX_GRAPH_LIBRARIES = 128
export const MAX_GRAPH_WATCHES = 128

export type GraphValueType = 'Boolean' | 'Number' | 'String' | 'Vec2' | 'Entity' | 'Resource' | 'Data'
export type GraphPinKind = 'execution' | 'data'
export type GraphPinDirection = 'input' | 'output'
export type GraphRoutineKind = 'function' | 'macro' | 'subgraph'
export type GraphValue = null | boolean | number | string | GraphValue[] | { [key: string]: GraphValue }

export interface GraphPoint { x: number; y: number }
export interface GraphSize { width: number; height: number }
export interface GraphViewport extends GraphPoint { zoom: number }

export interface GraphVariable {
  uuid: string
  name: string
  valueType: GraphValueType
  defaultValue: GraphValue
  exposed: boolean
  serialized: boolean
  group: string
  tooltip: string
  minimum: number | null
  maximum: number | null
  step: number | null
  resourceType: string | null
}

export interface GraphParameter { uuid: string; name: string; valueType: GraphValueType; defaultValue: GraphValue; tooltip: string }

export interface GraphPin {
  uuid: string
  key: string
  name: string
  direction: GraphPinDirection
  kind: GraphPinKind
  valueType: GraphValueType | null
  required: boolean
  defaultValue: GraphValue
}

export interface GraphNode {
  uuid: string
  type: string
  title: string
  category: string
  position: GraphPoint
  size: GraphSize
  collapsed: boolean
  pins: GraphPin[]
  config: Record<string, GraphValue>
}

export interface GraphEdgeEndpoint { nodeUuid: string; pinUuid: string }
export interface GraphEdge { uuid: string; from: GraphEdgeEndpoint; to: GraphEdgeEndpoint }
export interface GraphComment { uuid: string; text: string; position: GraphPoint; size: GraphSize; color: string; collapsed: boolean }
export interface GraphCanvasScope { nodes: GraphNode[]; edges: GraphEdge[]; comments: GraphComment[]; viewport: GraphViewport }

export interface GraphRoutine extends GraphCanvasScope {
  uuid: string
  name: string
  kind: GraphRoutineKind
  description: string
  inputs: GraphParameter[]
  outputs: GraphParameter[]
  locals: GraphVariable[]
  pure: boolean
  inline: boolean
  interfaceUuid: string | null
  deprecatedNames: string[]
}

export interface GraphCustomEvent { uuid: string; name: string; parameters: GraphParameter[]; description: string }
export interface GraphInterfaceMethod { uuid: string; name: string; inputs: GraphParameter[]; outputs: GraphParameter[] }
export interface GraphInterface { uuid: string; name: string; description: string; methods: GraphInterfaceMethod[] }
export interface GraphLibraryReference { uuid: string; packageId: string; libraryId: string; version: string; enabled: boolean }
export interface GraphBreakpoint { nodeUuid: string; enabled: boolean; condition: string; hitCondition: number; logMessage: string; hitCount: number }
export interface GraphDebugSettings { breakpoints: GraphBreakpoint[]; watches: string[]; breakOnError: boolean; coverageEnabled: boolean }
export interface GraphMigrationRecord { uuid: string; kind: 'rename' | 'replace' | 'deprecation'; from: string; to: string; appliedAt: string }

export interface NovaGraphDocument extends GraphCanvasScope {
  format: typeof NOVA_GRAPH_FORMAT
  version: typeof NOVA_GRAPH_VERSION
  apiVersion: 2
  uuid: string
  name: string
  variables: GraphVariable[]
  routines: GraphRoutine[]
  customEvents: GraphCustomEvent[]
  interfaces: GraphInterface[]
  libraries: GraphLibraryReference[]
  debug: GraphDebugSettings
  migrations: GraphMigrationRecord[]
}

let fallbackId = 0
export function graphUuid(): string {
  const generated = globalThis.crypto?.randomUUID?.()
  if (generated) return generated.toLowerCase()
  fallbackId++
  const stamp = Date.now().toString(16).padStart(12, '0').slice(-12)
  return `00000000-0000-4000-8000-${(stamp + fallbackId.toString(16).padStart(4, '0')).slice(-12)}`
}

function finite(value: unknown, fallback = 0, minimum = -1_000_000, maximum = 1_000_000): number { const number = Number(value); return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback }
function text(value: unknown, fallback = '', limit = 256): string { return (typeof value === 'string' ? value : fallback).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, limit) }
function identifier(value: unknown, fallback: string): string { const safe = text(value, fallback, 80).replace(/[^A-Za-z0-9_]/g, '_').replace(/^[^A-Za-z_]+/, ''); return safe || fallback }
function id(value: unknown): string { return text(value, '', 128).toLowerCase() }
function point(value: unknown): GraphPoint { const item = value && typeof value === 'object' ? value as Record<string, unknown> : {}; return { x: finite(item.x), y: finite(item.y) } }
function size(value: unknown, fallback: GraphSize): GraphSize { const item = value && typeof value === 'object' ? value as Record<string, unknown> : {}; return { width: finite(item.width, fallback.width, 80, 2_000), height: finite(item.height, fallback.height, 34, 2_000) } }
function viewport(value: unknown): GraphViewport { const item = value && typeof value === 'object' ? value as Record<string, unknown> : {}; return { x: finite(item.x), y: finite(item.y), zoom: finite(item.zoom, 1, .1, 4) } }
function valueType(value: unknown): GraphValueType { return ['Boolean', 'Number', 'String', 'Vec2', 'Entity', 'Resource', 'Data'].includes(String(value)) ? value as GraphValueType : 'Data' }
function boundedArray(value: unknown, maximum: number, label: string): unknown[] { if (Array.isArray(value) && value.length > maximum) throw new Error(`${label} exceeds the ${maximum.toLocaleString('en-US')} item limit.`); return Array.isArray(value) ? value : [] }

export function defaultGraphValue(type: GraphValueType): GraphValue { if (type === 'Boolean') return false; if (type === 'Number') return 0; if (type === 'Vec2') return [0, 0]; if (type === 'Data') return null; return '' }

export function sanitizeGraphValue(value: unknown, type: GraphValueType = 'Data', depth = 0): GraphValue {
  if (depth > 8) return null
  if (type === 'Boolean') return value === true
  if (type === 'Number') return finite(value)
  if (type === 'String' || type === 'Entity' || type === 'Resource') return text(value, '', 8_192)
  if (type === 'Vec2') { const source = Array.isArray(value) ? value : value && typeof value === 'object' ? [(value as Record<string, unknown>).x, (value as Record<string, unknown>).y] : []; return [finite(source[0]), finite(source[1])] }
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return typeof value === 'string' ? text(value, '', 8_192) : value
  if (typeof value === 'number') return finite(value)
  if (Array.isArray(value)) return value.slice(0, 1_024).map(item => sanitizeGraphValue(item, 'Data', depth + 1))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 1_024).map(([key, item]) => [text(key, 'value', 128), sanitizeGraphValue(item, 'Data', depth + 1)]))
  return null
}

function normalizeVariable(entry: unknown, index: number, local = false): GraphVariable {
  const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}, type = valueType(item.valueType)
  const minimum = item.minimum === null || item.minimum === undefined ? null : finite(item.minimum), maximum = item.maximum === null || item.maximum === undefined ? null : finite(item.maximum)
  const low = minimum !== null && maximum !== null && minimum > maximum ? maximum : minimum
  return { uuid: id(item.uuid), name: identifier(item.name, `${local ? 'local' : 'variable'}_${index + 1}`), valueType: type, defaultValue: sanitizeGraphValue(item.defaultValue, type), exposed: local ? false : item.exposed === true, serialized: local ? false : item.serialized !== false, group: text(item.group, local ? 'Locals' : 'Graph', 80) || (local ? 'Locals' : 'Graph'), tooltip: text(item.tooltip, '', 512), minimum: low, maximum, step: item.step === null || item.step === undefined ? null : finite(item.step, .01, .000001, 1_000_000), resourceType: type === 'Resource' ? text(item.resourceType, 'Resource', 80) || 'Resource' : null }
}

function normalizeParameter(entry: unknown, index: number, prefix: string): GraphParameter { const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}, type = valueType(item.valueType); return { uuid: id(item.uuid), name: identifier(item.name, `${prefix}_${index + 1}`), valueType: type, defaultValue: sanitizeGraphValue(item.defaultValue, type), tooltip: text(item.tooltip, '', 512) } }

function normalizeNode(entry: unknown, index: number): GraphNode {
  const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}
  const pins = boundedArray(item.pins, 128, 'Graph node pins').map((entry, pinIndex): GraphPin => { const pin = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}, kind: GraphPinKind = pin.kind === 'execution' ? 'execution' : 'data', type = kind === 'data' ? valueType(pin.valueType) : null; return { uuid: id(pin.uuid), key: identifier(pin.key, `pin_${pinIndex + 1}`), name: text(pin.name, `Pin ${pinIndex + 1}`, 80), direction: pin.direction === 'output' ? 'output' : 'input', kind, valueType: type, required: pin.required === true, defaultValue: kind === 'data' ? sanitizeGraphValue(pin.defaultValue, type ?? 'Data') : null } })
  const config = item.config && typeof item.config === 'object' && !Array.isArray(item.config) ? Object.fromEntries(Object.entries(item.config as Record<string, unknown>).slice(0, 128).map(([key, value]) => {
    const normalizedKey=identifier(key,'value')
    return [normalizedKey,(normalizedKey==='source'||normalizedKey==='rhaiSourceOverride')?text(value,'',64_000):sanitizeGraphValue(value)]
  })) : {}
  return { uuid: id(item.uuid), type: text(item.type, 'invalid', 160), title: text(item.title, `Node ${index + 1}`, 120), category: text(item.category, 'Other', 80), position: point(item.position), size: size(item.size, { width: 220, height: 120 }), collapsed: item.collapsed === true, pins, config }
}

function normalizeEdge(entry: unknown): GraphEdge { const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}, from = item.from && typeof item.from === 'object' ? item.from as Record<string, unknown> : {}, to = item.to && typeof item.to === 'object' ? item.to as Record<string, unknown> : {}; return { uuid: id(item.uuid), from: { nodeUuid: id(from.nodeUuid), pinUuid: id(from.pinUuid) }, to: { nodeUuid: id(to.nodeUuid), pinUuid: id(to.pinUuid) } } }
function normalizeComment(entry: unknown): GraphComment { const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}, color = /^#[0-9a-f]{6}$/i.test(String(item.color)) ? String(item.color).toLowerCase() : '#5b8def'; return { uuid: id(item.uuid), text: text(item.text, 'Comment', 2_048), position: point(item.position), size: size(item.size, { width: 360, height: 220 }), color, collapsed: item.collapsed === true } }
function normalizeCanvas(source: Record<string, unknown>, label: string): GraphCanvasScope { return { nodes: boundedArray(source.nodes, MAX_GRAPH_NODES, `${label} nodes`).map(normalizeNode), edges: boundedArray(source.edges, MAX_GRAPH_EDGES, `${label} edges`).map(normalizeEdge), comments: boundedArray(source.comments, MAX_GRAPH_COMMENTS, `${label} comments`).map(normalizeComment), viewport: viewport(source.viewport) } }

function normalizeRoutine(entry: unknown, index: number): GraphRoutine {
  const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}, kind: GraphRoutineKind = item.kind === 'macro' || item.kind === 'subgraph' ? item.kind : 'function'
  return { uuid: id(item.uuid), name: identifier(item.name, `${kind}_${index + 1}`), kind, description: text(item.description, '', 1_024), inputs: boundedArray(item.inputs, 64, 'Routine inputs').map((value, parameterIndex) => normalizeParameter(value, parameterIndex, 'input')), outputs: boundedArray(item.outputs, 64, 'Routine outputs').map((value, parameterIndex) => normalizeParameter(value, parameterIndex, 'output')), locals: boundedArray(item.locals, 256, 'Routine locals').map((value, localIndex) => normalizeVariable(value, localIndex, true)), pure: item.pure === true, inline: kind === 'macro' ? true : item.inline === true, interfaceUuid: item.interfaceUuid === null || item.interfaceUuid === undefined ? null : id(item.interfaceUuid), deprecatedNames: boundedArray(item.deprecatedNames, 64, 'Routine deprecated names').map(value => identifier(value, '')).filter(Boolean), ...normalizeCanvas(item, `Routine ${index + 1}`) }
}

export function normalizeGraphDocument(source: unknown): NovaGraphDocument {
  if (!source || typeof source !== 'object') throw new Error('Visual graph root must be an object.')
  const raw = source as Record<string, unknown>
  if (raw.format !== NOVA_GRAPH_FORMAT) throw new Error('Unsupported visual graph format.')
  if (Number(raw.version) !== NOVA_GRAPH_VERSION) throw new Error(`Unsupported visual graph version: ${String(raw.version)}.`)
  const canvas = normalizeCanvas(raw, 'Visual graph'), variables = boundedArray(raw.variables, MAX_GRAPH_VARIABLES, 'Visual graph variables').map((entry, index) => normalizeVariable(entry, index)), routines = boundedArray(raw.routines, MAX_GRAPH_ROUTINES, 'Visual graph routines').map(normalizeRoutine)
  if (canvas.nodes.length + routines.reduce((sum, routine) => sum + routine.nodes.length, 0) > MAX_GRAPH_NODES) throw new Error(`Visual graph and routines exceed the ${MAX_GRAPH_NODES.toLocaleString('en-US')} total node limit.`)
  if (canvas.edges.length + routines.reduce((sum, routine) => sum + routine.edges.length, 0) > MAX_GRAPH_EDGES) throw new Error(`Visual graph and routines exceed the ${MAX_GRAPH_EDGES.toLocaleString('en-US')} total edge limit.`)
  const customEvents = boundedArray(raw.customEvents, MAX_GRAPH_EVENTS, 'Visual graph custom events').map((entry, index): GraphCustomEvent => { const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}; return { uuid: id(item.uuid), name: identifier(item.name, `event_${index + 1}`), parameters: boundedArray(item.parameters, 64, 'Event parameters').map((value, parameterIndex) => normalizeParameter(value, parameterIndex, 'parameter')), description: text(item.description, '', 1_024) } })
  const interfaces = boundedArray(raw.interfaces, MAX_GRAPH_INTERFACES, 'Visual graph interfaces').map((entry, index): GraphInterface => { const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}; return { uuid: id(item.uuid), name: identifier(item.name, `interface_${index + 1}`), description: text(item.description, '', 1_024), methods: boundedArray(item.methods, 128, 'Interface methods').map((method, methodIndex): GraphInterfaceMethod => { const value = method && typeof method === 'object' ? method as Record<string, unknown> : {}; return { uuid: id(value.uuid), name: identifier(value.name, `method_${methodIndex + 1}`), inputs: boundedArray(value.inputs, 64, 'Interface inputs').map((parameter, parameterIndex) => normalizeParameter(parameter, parameterIndex, 'input')), outputs: boundedArray(value.outputs, 64, 'Interface outputs').map((parameter, parameterIndex) => normalizeParameter(parameter, parameterIndex, 'output')) } }) } })
  const libraries = boundedArray(raw.libraries, MAX_GRAPH_LIBRARIES, 'Visual graph libraries').map((entry): GraphLibraryReference => { const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}; return { uuid: id(item.uuid), packageId: text(item.packageId, '', 120), libraryId: text(item.libraryId, '', 120), version: text(item.version, '*', 40) || '*', enabled: item.enabled !== false } })
  const rawDebug = raw.debug && typeof raw.debug === 'object' ? raw.debug as Record<string, unknown> : {}
  const debug: GraphDebugSettings = { breakpoints: boundedArray(rawDebug.breakpoints, MAX_GRAPH_NODES, 'Graph breakpoints').map((entry): GraphBreakpoint => { const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}; return { nodeUuid: id(item.nodeUuid), enabled: item.enabled !== false, condition: text(item.condition, '', 512), hitCondition: Math.round(finite(item.hitCondition, 0, 0, 1_000_000_000)), logMessage: text(item.logMessage, '', 1_024), hitCount: Math.round(finite(item.hitCount, 0, 0, 1_000_000_000)) } }), watches: boundedArray(rawDebug.watches, MAX_GRAPH_WATCHES, 'Graph watches').map(value => text(value, '', 160).trim()).filter(Boolean), breakOnError: rawDebug.breakOnError !== false, coverageEnabled: rawDebug.coverageEnabled !== false }
  const migrations = boundedArray(raw.migrations, 2_048, 'Graph migrations').map((entry): GraphMigrationRecord => { const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}, kind = item.kind === 'replace' || item.kind === 'deprecation' ? item.kind : 'rename'; return { uuid: id(item.uuid), kind, from: text(item.from, '', 160), to: text(item.to, '', 160), appliedAt: text(item.appliedAt, '', 64) } })
  return { format: NOVA_GRAPH_FORMAT, version: NOVA_GRAPH_VERSION, apiVersion: 2, uuid: id(raw.uuid), name: text(raw.name, 'Visual Script', 120) || 'Visual Script', variables, routines, customEvents, interfaces, libraries, debug, migrations, ...canvas }
}

function ordinal(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0 }
function canonicalValue(value: GraphValue): GraphValue { if (Array.isArray(value)) return value.map(canonicalValue); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => ordinal(a, b)).map(([key, item]) => [key, canonicalValue(item)])); return value }
function canonicalVariable(item: GraphVariable): GraphVariable { return { ...item, defaultValue: canonicalValue(item.defaultValue) } }
function canonicalParameter(item: GraphParameter): GraphParameter { return { ...item, defaultValue: canonicalValue(item.defaultValue) } }
function canonicalCanvas<T extends GraphCanvasScope>(scope: T): T { return { ...scope, nodes: [...scope.nodes].sort((a, b) => ordinal(a.uuid, b.uuid)).map(node => ({ ...node, pins: [...node.pins], config: canonicalValue(node.config) as Record<string, GraphValue> })), edges: [...scope.edges].sort((a, b) => ordinal(a.uuid, b.uuid)), comments: [...scope.comments].sort((a, b) => ordinal(a.uuid, b.uuid)) } }

export function canonicalGraphDocument(graph: NovaGraphDocument): NovaGraphDocument {
  const normalized = normalizeGraphDocument(graph)
  return canonicalCanvas({ ...normalized, variables: [...normalized.variables].sort((a, b) => ordinal(a.uuid, b.uuid)).map(canonicalVariable), routines: [...normalized.routines].sort((a, b) => ordinal(a.uuid, b.uuid)).map(routine => canonicalCanvas({ ...routine, inputs: [...routine.inputs].sort((a, b) => ordinal(a.uuid, b.uuid)).map(canonicalParameter), outputs: [...routine.outputs].sort((a, b) => ordinal(a.uuid, b.uuid)).map(canonicalParameter), locals: [...routine.locals].sort((a, b) => ordinal(a.uuid, b.uuid)).map(canonicalVariable), deprecatedNames: [...routine.deprecatedNames].sort(ordinal) })), customEvents: [...normalized.customEvents].sort((a, b) => ordinal(a.uuid, b.uuid)).map(event => ({ ...event, parameters: [...event.parameters].sort((a, b) => ordinal(a.uuid, b.uuid)).map(canonicalParameter) })), interfaces: [...normalized.interfaces].sort((a, b) => ordinal(a.uuid, b.uuid)).map(contract => ({ ...contract, methods: [...contract.methods].sort((a, b) => ordinal(a.uuid, b.uuid)).map(method => ({ ...method, inputs: [...method.inputs].sort((a, b) => ordinal(a.uuid, b.uuid)).map(canonicalParameter), outputs: [...method.outputs].sort((a, b) => ordinal(a.uuid, b.uuid)).map(canonicalParameter) })) })), libraries: [...normalized.libraries].sort((a, b) => ordinal(a.uuid, b.uuid)), debug: { ...normalized.debug, breakpoints: [...normalized.debug.breakpoints].sort((a, b) => ordinal(a.nodeUuid, b.nodeUuid)), watches: [...new Set(normalized.debug.watches)].sort(ordinal) }, migrations: [...normalized.migrations].sort((a, b) => ordinal(a.uuid, b.uuid)) })
}

export function serializeGraphDocument(graph: NovaGraphDocument): string { return `${JSON.stringify(canonicalGraphDocument(graph), null, 2)}\n` }
export function parseGraphDocument(source: string): NovaGraphDocument { try { return normalizeGraphDocument(JSON.parse(source)) } catch (error) { throw new Error(error instanceof Error ? error.message : 'Invalid visual graph JSON.') } }
