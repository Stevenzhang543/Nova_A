/** 图文档类型、资源上限、输入规范化及稳定 JSON 序列化；结构配置使用严格校验以避免静默破坏源码。 */
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
export const MAX_EDGE_REROUTES = 64
export const MAX_GRAPH_REROUTES = 100_000

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
  /** Imported literal spelling retains Rhai integer/float semantics until edited. */
  sourceLiteral?: string
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
export interface GraphEdge { uuid: string; from: GraphEdgeEndpoint; to: GraphEdgeEndpoint; reroutes?: GraphPoint[] }
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
  /** Additive Rhai IR projection metadata; legacy graphs retain their compiler. */
  language?: { version: 1; source: string; rootNodeUuid: string }
}

let fallbackId = 0
/** 优先生成标准随机 UUID；无平台实现时使用时间戳与进程计数形成后备标识。 */
export function graphUuid(): string {
  const generated = globalThis.crypto?.randomUUID?.()
  if (generated) return generated.toLowerCase()
  fallbackId++
  const stamp = Date.now().toString(16).padStart(12, '0').slice(-12)
  return `00000000-0000-4000-8000-${(stamp + fallbackId.toString(16).padStart(4, '0')).slice(-12)}`
}

/** 将输入转为有限数字并夹在允许区间内，非有限值使用后备值。 */
function finite(value: unknown, fallback = 0, minimum = -1_000_000, maximum = 1_000_000): number { const number = Number(value); return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback }
/** 只接受字符串，剔除指定控制字符并限制长度。 */
function text(value: unknown, fallback = '', limit = 256): string { return (typeof value === 'string' ? value : fallback).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, limit) }
/** 将名称转换为受支持的 ASCII 标识符，空结果使用后备名称。 */
function identifier(value: unknown, fallback: string): string { const safe = text(value, fallback, 80).replace(/[^A-Za-z0-9_]/g, '_').replace(/^[^A-Za-z_]+/, ''); return safe || fallback }
/** 规范化标识文本的长度和小写形式；唯一性与引用关系由后续图验证负责。 */
function id(value: unknown): string { return text(value, '', 128).toLowerCase() }
/** 从未知输入读取并限制二维坐标。 */
function point(value: unknown): GraphPoint { const item = value && typeof value === 'object' ? value as Record<string, unknown> : {}; return { x: finite(item.x), y: finite(item.y) } }
/** 读取节点尺寸，采用后备宽高并限制可接受范围。 */
function size(value: unknown, fallback: GraphSize): GraphSize { const item = value && typeof value === 'object' ? value as Record<string, unknown> : {}; return { width: finite(item.width, fallback.width, 80, 2_000), height: finite(item.height, fallback.height, 34, 2_000) } }
/** 规范化画布平移及缩放，缩放范围为 0.1 到 4。 */
function viewport(value: unknown): GraphViewport { const item = value && typeof value === 'object' ? value as Record<string, unknown> : {}; return { x: finite(item.x), y: finite(item.y), zoom: finite(item.zoom, 1, .1, 4) } }
/** 只接受公开的图值类型，未知值回退为动态数据。 */
function valueType(value: unknown): GraphValueType { return ['Boolean', 'Number', 'String', 'Vec2', 'Entity', 'Resource', 'Data'].includes(String(value)) ? value as GraphValueType : 'Data' }
/** 非数组回退为空列表，超过上限的数组明确抛错而不静默截断。 */
function boundedArray(value: unknown, maximum: number, label: string): unknown[] { if (Array.isArray(value) && value.length > maximum) throw new Error(`${label} exceeds the ${maximum.toLocaleString('en-US')} item limit.`); return Array.isArray(value) ? value : [] }

/** 按图值类型提供布尔、数字、向量、动态数据或文本的初始值。 */
export function defaultGraphValue(type: GraphValueType): GraphValue { if (type === 'Boolean') return false; if (type === 'Number') return 0; if (type === 'Vec2') return [0, 0]; if (type === 'Data') return null; return '' }

/** 按旧式图值类型清理输入，限制嵌套与集合大小；结构源码元数据不使用此截断路径。 */
export function sanitizeGraphValue(value: unknown, type: GraphValueType = 'Data', depth = 0): GraphValue {
  if (depth > 8) return null
  if (type === 'Boolean') return value === true
  if (type === 'Number') return finite(value)
  if (type === 'String' || type === 'Entity' || type === 'Resource') return text(value, '', 8_192)
  if (type === 'Vec2') { const source = Array.isArray(value) ? value : value && typeof value === 'object' ? [(value as Record<string, unknown>).x, (value as Record<string, unknown>).y] : []; return [finite(source[0]), finite(source[1])] }
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return typeof value === 'string' ? text(value, '', 8_192) : value
  if (typeof value === 'number') return finite(value)
  if (Array.isArray(value)) return value.slice(0, 1_024).map(/** 按下一层深度清理集合元素。 */ item => sanitizeGraphValue(item, 'Data', depth + 1))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 1_024).map(/** 限制动态对象键长度并递归清理其值。 */ ([key, item]) => [text(key, 'value', 128), sanitizeGraphValue(item, 'Data', depth + 1)]))
  return null
}

/** 规范化变量属性、范围和默认值；局部变量不暴露且不单独序列化为项目属性。 */
function normalizeVariable(entry: unknown, index: number, local = false): GraphVariable {
  const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}, type = valueType(item.valueType)
  const minimum = item.minimum === null || item.minimum === undefined ? null : finite(item.minimum), maximum = item.maximum === null || item.maximum === undefined ? null : finite(item.maximum)
  const low = minimum !== null && maximum !== null && minimum > maximum ? maximum : minimum
  return { uuid: id(item.uuid), name: identifier(item.name, `${local ? 'local' : 'variable'}_${index + 1}`), valueType: type, defaultValue: sanitizeGraphValue(item.defaultValue, type), ...(typeof item.sourceLiteral === 'string' ? { sourceLiteral: text(item.sourceLiteral, '', 8_192) } : {}), exposed: local ? false : item.exposed === true, serialized: local ? false : item.serialized !== false, group: text(item.group, local ? 'Locals' : 'Graph', 80) || (local ? 'Locals' : 'Graph'), tooltip: text(item.tooltip, '', 512), minimum: low, maximum, step: item.step === null || item.step === undefined ? null : finite(item.step, .01, .000001, 1_000_000), resourceType: type === 'Resource' ? text(item.resourceType, 'Resource', 80) || 'Resource' : null }
}

/** 规范化例程、事件或接口形参的身份、名称、类型、默认值与提示。 */
function normalizeParameter(entry: unknown, index: number, prefix: string): GraphParameter { const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}, type = valueType(item.valueType); return { uuid: id(item.uuid), name: identifier(item.name, `${prefix}_${index + 1}`), valueType: type, defaultValue: sanitizeGraphValue(item.defaultValue, type), tooltip: text(item.tooltip, '', 512) } }

/** 严格校验结构元数据的深度、集合长度、字符串和数值，拒绝超限或不支持值以保留源码语义。 */
function normalizeSyntaxConfig(value: unknown, depth = 0): GraphValue {
  if (depth > 8) throw new Error('Rhai structure metadata exceeds its nesting limit.')
  if (value === null || typeof value === 'boolean') return value
  if (typeof value === 'string') { if (value.length > 64_000) throw new Error('Rhai structure metadata exceeds its string limit.'); return value }
  if (typeof value === 'number') { if (!Number.isFinite(value)) throw new Error('Rhai structure metadata requires finite numbers.'); return value }
  if (Array.isArray(value)) { if (value.length > 1_024) throw new Error('Rhai structure metadata exceeds its array limit.'); return value.map(/** 递归验证每个结构数组元素，超限时保留失败而不截断。 */ item => normalizeSyntaxConfig(item, depth + 1)) }
  if (value && typeof value === 'object') { const entries = Object.entries(value); if (entries.length > 1_024) throw new Error('Rhai structure metadata exceeds its object limit.'); return Object.fromEntries(entries.map(/** 保留结构对象键并递归验证字段值。 */ ([key, item]) => [key, normalizeSyntaxConfig(item, depth + 1)])) }
  throw new Error('Rhai structure metadata contains an unsupported value.')
}

/** 限制节点端口与配置数量，按结构节点或旧式节点选择不同配置校验路径。 */
function normalizeNode(entry: unknown, index: number): GraphNode {
  const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}
  const pins = boundedArray(item.pins, 128, 'Graph node pins').map(/** 规范化端口身份、方向、种类及默认值，控制流端口不携带数据类型。 */ (entry, pinIndex): GraphPin => { const pin = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}, kind: GraphPinKind = pin.kind === 'execution' ? 'execution' : 'data', type = kind === 'data' ? valueType(pin.valueType) : null; return { uuid: id(pin.uuid), key: identifier(pin.key, `pin_${pinIndex + 1}`), name: text(pin.name, `Pin ${pinIndex + 1}`, 80), direction: pin.direction === 'output' ? 'output' : 'input', kind, valueType: type, required: pin.required === true, defaultValue: kind === 'data' ? sanitizeGraphValue(pin.defaultValue, type ?? 'Data') : null } })
  const config = item.config && typeof item.config === 'object' && !Array.isArray(item.config) ? Object.fromEntries(Object.entries(item.config as Record<string, unknown>).slice(0, 128).map(/** 规范化配置键，结构数据严格校验，源码字段采用独立长度上限。 */ ([key, value]) => {
    const normalizedKey=identifier(key,'value')
    return [normalizedKey,typeof item.type === 'string' && item.type.startsWith('rhai.') ? normalizeSyntaxConfig(value) : (normalizedKey==='source'||normalizedKey==='rhaiSourceOverride')?text(value,'',64_000):sanitizeGraphValue(value)]
  })) : {}
  return { uuid: id(item.uuid), type: text(item.type, 'invalid', 160), title: text(item.title, `Node ${index + 1}`, 120), category: text(item.category, 'Other', 80), position: point(item.position), size: size(item.size, { width: 220, height: 120 }), collapsed: item.collapsed === true, pins, config }
}

/** 逐项验证手动路径点为有限且范围内的坐标，非法值抛错。 */
function normalizeReroutes(value: unknown): GraphPoint[] {
  if(!Array.isArray(value))throw new Error('Graph wire reroutes must be an array.')
  return boundedArray(value,MAX_EDGE_REROUTES,'Graph wire reroutes').map(/** 校验每个路径点的两个坐标并返回独立对象。 */ entry=>{
    const candidate=entry&&typeof entry==='object'?entry as Record<string,unknown>:{}
    if(typeof candidate.x!=='number'||typeof candidate.y!=='number'||!Number.isFinite(candidate.x)||!Number.isFinite(candidate.y)||Math.abs(candidate.x)>1_000_000||Math.abs(candidate.y)>1_000_000)throw new Error('Graph wire reroutes require finite coordinates within one million graph units.')
    return {x:candidate.x,y:candidate.y}
  })
}
/** 读取连线身份和两端标识，存在手动路径时执行严格路径点校验。 */
function normalizeEdge(entry: unknown): GraphEdge { const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}, from = item.from && typeof item.from === 'object' ? item.from as Record<string, unknown> : {}, to = item.to && typeof item.to === 'object' ? item.to as Record<string, unknown> : {}; return { uuid: id(item.uuid), from: { nodeUuid: id(from.nodeUuid), pinUuid: id(from.pinUuid) }, to: { nodeUuid: id(to.nodeUuid), pinUuid: id(to.pinUuid) },...(item.reroutes!==undefined?{reroutes:normalizeReroutes(item.reroutes)}:{}) } }
/** 规范化画布注释内容、矩形与六位颜色，缺失值采用后备配置。 */
function normalizeComment(entry: unknown): GraphComment { const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}, color = /^#[0-9a-f]{6}$/i.test(String(item.color)) ? String(item.color).toLowerCase() : '#5b8def'; return { uuid: id(item.uuid), text: text(item.text, 'Comment', 2_048), position: point(item.position), size: size(item.size, { width: 360, height: 220 }), color, collapsed: item.collapsed === true } }
/** 按节点、边和注释上限规范化单个画布及其视口。 */
function normalizeCanvas(source: Record<string, unknown>, label: string): GraphCanvasScope { return { nodes: boundedArray(source.nodes, MAX_GRAPH_NODES, `${label} nodes`).map(normalizeNode), edges: boundedArray(source.edges, MAX_GRAPH_EDGES, `${label} edges`).map(normalizeEdge), comments: boundedArray(source.comments, MAX_GRAPH_COMMENTS, `${label} comments`).map(normalizeComment), viewport: viewport(source.viewport) } }

/** 规范化例程接口、局部变量、弃用名称与独立画布；宏始终内联。 */
function normalizeRoutine(entry: unknown, index: number): GraphRoutine {
  const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}, kind: GraphRoutineKind = item.kind === 'macro' || item.kind === 'subgraph' ? item.kind : 'function'
  return { uuid: id(item.uuid), name: identifier(item.name, `${kind}_${index + 1}`), kind, description: text(item.description, '', 1_024), inputs: boundedArray(item.inputs, 64, 'Routine inputs').map(/** 按原次序规范化例程输入参数。 */ (value, parameterIndex) => normalizeParameter(value, parameterIndex, 'input')), outputs: boundedArray(item.outputs, 64, 'Routine outputs').map(/** 按原次序规范化例程输出参数。 */ (value, parameterIndex) => normalizeParameter(value, parameterIndex, 'output')), locals: boundedArray(item.locals, 256, 'Routine locals').map(/** 使用局部变量约束规范化例程内部变量。 */ (value, localIndex) => normalizeVariable(value, localIndex, true)), pure: item.pure === true, inline: kind === 'macro' ? true : item.inline === true, interfaceUuid: item.interfaceUuid === null || item.interfaceUuid === undefined ? null : id(item.interfaceUuid), deprecatedNames: boundedArray(item.deprecatedNames, 64, 'Routine deprecated names').map(/** 将弃用名称规范化为可识别的函数名称。 */ value => identifier(value, '')).filter(Boolean), ...normalizeCanvas(item, `Routine ${index + 1}`) }
}

/** 先验证格式与语言元数据并检查跨作用域总量，再规范化图、例程、事件、接口、调试和迁移信息。 */
export function normalizeGraphDocument(source: unknown): NovaGraphDocument {
  if (!source || typeof source !== 'object') throw new Error('Visual graph root must be an object.')
  const raw = source as Record<string, unknown>
  let language: NovaGraphDocument['language']
  if (raw.language !== undefined) {
    const item = raw.language as Record<string, unknown>
    if (!item || typeof item !== 'object' || item.version !== 1 || typeof item.source !== 'string' || item.source.length > 64_000 || typeof item.rootNodeUuid !== 'string') throw new Error('Invalid or oversized Rhai language projection metadata.')
    language = { version: 1, source: item.source, rootNodeUuid: id(item.rootNodeUuid) }
  }
  if (raw.format !== NOVA_GRAPH_FORMAT) throw new Error('Unsupported visual graph format.')
  if (Number(raw.version) !== NOVA_GRAPH_VERSION) throw new Error(`Unsupported visual graph version: ${String(raw.version)}.`)
  // Reject aggregate limits before allocating normalized nodes, configs or routes.
  let nodeCount=0,edgeCount=0,rerouteCount=0
  for(const entry of [raw,...boundedArray(raw.routines,MAX_GRAPH_ROUTINES,'Visual graph routines')]){
    const scope=entry&&typeof entry==='object'?entry as Record<string,unknown>:{}
    nodeCount+=boundedArray(scope.nodes,MAX_GRAPH_NODES,'Graph nodes').length
    const edges=boundedArray(scope.edges,MAX_GRAPH_EDGES,'Graph edges');edgeCount+=edges.length
    if(nodeCount>MAX_GRAPH_NODES||edgeCount>MAX_GRAPH_EDGES)throw new Error('Visual graph and routines exceed the total node or edge limit.')
    for(const edge of edges){const value=edge&&typeof edge==='object'?(edge as Record<string,unknown>).reroutes:undefined;if(value===undefined)continue;if(!Array.isArray(value))throw new Error('Graph wire reroutes must be an array.');rerouteCount+=boundedArray(value,MAX_EDGE_REROUTES,'Graph wire reroutes').length;if(rerouteCount>MAX_GRAPH_REROUTES)throw new Error('Visual graph and routines exceed the 100,000 total reroute point limit.')}
  }
  const canvas = normalizeCanvas(raw, 'Visual graph'), variables = boundedArray(raw.variables, MAX_GRAPH_VARIABLES, 'Visual graph variables').map(/** 按输入顺序规范化模块变量。 */ (entry, index) => normalizeVariable(entry, index)), routines = boundedArray(raw.routines, MAX_GRAPH_ROUTINES, 'Visual graph routines').map(normalizeRoutine)
  if (canvas.nodes.length + routines.reduce(/** 累计全部例程节点数用于总上限校验。 */ (sum, routine) => sum + routine.nodes.length, 0) > MAX_GRAPH_NODES) throw new Error(`Visual graph and routines exceed the ${MAX_GRAPH_NODES.toLocaleString('en-US')} total node limit.`)
  if (canvas.edges.length + routines.reduce(/** 累计全部例程连线数用于总上限校验。 */ (sum, routine) => sum + routine.edges.length, 0) > MAX_GRAPH_EDGES) throw new Error(`Visual graph and routines exceed the ${MAX_GRAPH_EDGES.toLocaleString('en-US')} total edge limit.`)
  const customEvents = boundedArray(raw.customEvents, MAX_GRAPH_EVENTS, 'Visual graph custom events').map(/** 规范化自定义事件身份、参数及描述。 */ (entry, index): GraphCustomEvent => { const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}; return { uuid: id(item.uuid), name: identifier(item.name, `event_${index + 1}`), parameters: boundedArray(item.parameters, 64, 'Event parameters').map(/** 按事件参数次序规范化类型和默认值。 */ (value, parameterIndex) => normalizeParameter(value, parameterIndex, 'parameter')), description: text(item.description, '', 1_024) } })
  const interfaces = boundedArray(raw.interfaces, MAX_GRAPH_INTERFACES, 'Visual graph interfaces').map(/** 规范化接口身份及有界方法列表。 */ (entry, index): GraphInterface => { const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}; return { uuid: id(item.uuid), name: identifier(item.name, `interface_${index + 1}`), description: text(item.description, '', 1_024), methods: boundedArray(item.methods, 128, 'Interface methods').map(/** 规范化接口方法及其有序输入输出参数。 */ (method, methodIndex): GraphInterfaceMethod => { const value = method && typeof method === 'object' ? method as Record<string, unknown> : {}; return { uuid: id(value.uuid), name: identifier(value.name, `method_${methodIndex + 1}`), inputs: boundedArray(value.inputs, 64, 'Interface inputs').map(/** 按声明次序规范化接口输入形参。 */ (parameter, parameterIndex) => normalizeParameter(parameter, parameterIndex, 'input')), outputs: boundedArray(value.outputs, 64, 'Interface outputs').map(/** 按声明次序规范化接口输出形参。 */ (parameter, parameterIndex) => normalizeParameter(parameter, parameterIndex, 'output')) } }) } })
  const libraries = boundedArray(raw.libraries, MAX_GRAPH_LIBRARIES, 'Visual graph libraries').map(/** 读取库依赖身份、版本约束与启用状态。 */ (entry): GraphLibraryReference => { const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}; return { uuid: id(item.uuid), packageId: text(item.packageId, '', 120), libraryId: text(item.libraryId, '', 120), version: text(item.version, '*', 40) || '*', enabled: item.enabled !== false } })
  const rawDebug = raw.debug && typeof raw.debug === 'object' ? raw.debug as Record<string, unknown> : {}
  const debug: GraphDebugSettings = { breakpoints: boundedArray(rawDebug.breakpoints, MAX_GRAPH_NODES, 'Graph breakpoints').map(/** 规范化断点节点、条件、命中次数和日志文本。 */ (entry): GraphBreakpoint => { const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}; return { nodeUuid: id(item.nodeUuid), enabled: item.enabled !== false, condition: text(item.condition, '', 512), hitCondition: Math.round(finite(item.hitCondition, 0, 0, 1_000_000_000)), logMessage: text(item.logMessage, '', 1_024), hitCount: Math.round(finite(item.hitCount, 0, 0, 1_000_000_000)) } }), watches: boundedArray(rawDebug.watches, MAX_GRAPH_WATCHES, 'Graph watches').map(/** 规范化监视表达式长度并去除两端空白。 */ value => text(value, '', 160).trim()).filter(Boolean), breakOnError: rawDebug.breakOnError !== false, coverageEnabled: rawDebug.coverageEnabled !== false }
  const migrations = boundedArray(raw.migrations, 2_048, 'Graph migrations').map(/** 规范化迁移记录，未知操作回退为重命名记录。 */ (entry): GraphMigrationRecord => { const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}, kind = item.kind === 'replace' || item.kind === 'deprecation' ? item.kind : 'rename'; return { uuid: id(item.uuid), kind, from: text(item.from, '', 160), to: text(item.to, '', 160), appliedAt: text(item.appliedAt, '', 64) } })
  return { format: NOVA_GRAPH_FORMAT, version: NOVA_GRAPH_VERSION, apiVersion: 2, uuid: id(raw.uuid), name: text(raw.name, 'Visual Script', 120) || 'Visual Script', variables, routines, customEvents, interfaces, libraries, debug, migrations, ...(language ? { language } : {}), ...canvas }
}

/** 使用确定性的字符串序比较，避免不同系统区域设置改变序列化顺序。 */
function ordinal(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0 }
/** 递归排序对象键但保持数组顺序，使同一数据产生稳定 JSON。 */
function canonicalValue(value: GraphValue): GraphValue { if (Array.isArray(value)) return value.map(canonicalValue); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(/** 按对象键的确定性字符串顺序排序。 */ ([a], [b]) => ordinal(a, b)).map(/** 递归规范化每个对象字段值。 */ ([key, item]) => [key, canonicalValue(item)])); return value }
/** 复制变量并规范化其默认数据的对象键顺序。 */
function canonicalVariable(item: GraphVariable): GraphVariable { return { ...item, defaultValue: canonicalValue(item.defaultValue) } }
/** 复制形参并规范化默认值，保留参数位置。 */
function canonicalParameter(item: GraphParameter): GraphParameter { return { ...item, defaultValue: canonicalValue(item.defaultValue) } }
/** 按身份排序节点、边和注释；保留端口顺序并规范化节点配置。 */
function canonicalCanvas<T extends GraphCanvasScope>(scope: T): T { return { ...scope, nodes: [...scope.nodes].sort(/** 按稳定 UUID 排序，不依赖输入集合顺序。 */ (a, b) => ordinal(a.uuid, b.uuid)).map(/** 复制节点与端口列表并递归排序配置对象键。 */ node => ({ ...node, pins: [...node.pins], config: canonicalValue(node.config) as Record<string, GraphValue> })), edges: [...scope.edges].sort(/** 按稳定 UUID 排序，不依赖输入集合顺序。 */ (a, b) => ordinal(a.uuid, b.uuid)), comments: [...scope.comments].sort(/** 按稳定 UUID 排序，不依赖输入集合顺序。 */ (a, b) => ordinal(a.uuid, b.uuid)) } }

/** 先规范化输入，再稳定排序各身份集合；形参等语义有序列表保持顺序。 */
export function canonicalGraphDocument(graph: NovaGraphDocument): NovaGraphDocument {
  const normalized = normalizeGraphDocument(graph)
  return canonicalCanvas({ ...normalized, variables: [...normalized.variables].sort(/** 按稳定 UUID 排序，不依赖输入集合顺序。 */ (a, b) => ordinal(a.uuid, b.uuid)).map(canonicalVariable), routines: [...normalized.routines].sort(/** 按稳定 UUID 排序，不依赖输入集合顺序。 */ (a, b) => ordinal(a.uuid, b.uuid)).map(/** 稳定化例程画布、局部变量及弃用名称，保留输入输出形参次序。 */ routine => canonicalCanvas({ ...routine, inputs: routine.inputs.map(canonicalParameter), outputs: routine.outputs.map(canonicalParameter), locals: [...routine.locals].sort(/** 按稳定 UUID 排序，不依赖输入集合顺序。 */ (a, b) => ordinal(a.uuid, b.uuid)).map(canonicalVariable), deprecatedNames: [...routine.deprecatedNames].sort(ordinal) })), customEvents: [...normalized.customEvents].sort(/** 按稳定 UUID 排序，不依赖输入集合顺序。 */ (a, b) => ordinal(a.uuid, b.uuid)).map(/** 稳定化事件参数默认值，保留调用参数顺序。 */ event => ({ ...event, parameters: event.parameters.map(canonicalParameter) })), interfaces: [...normalized.interfaces].sort(/** 按稳定 UUID 排序，不依赖输入集合顺序。 */ (a, b) => ordinal(a.uuid, b.uuid)).map(/** 按身份排序接口方法并稳定化方法参数默认值。 */ contract => ({ ...contract, methods: [...contract.methods].sort(/** 按稳定 UUID 排序，不依赖输入集合顺序。 */ (a, b) => ordinal(a.uuid, b.uuid)).map(/** 规范化方法参数默认值，保留输入输出顺序。 */ method => ({ ...method, inputs: method.inputs.map(canonicalParameter), outputs: method.outputs.map(canonicalParameter) })) })), libraries: [...normalized.libraries].sort(/** 按稳定 UUID 排序，不依赖输入集合顺序。 */ (a, b) => ordinal(a.uuid, b.uuid)), debug: { ...normalized.debug, breakpoints: [...normalized.debug.breakpoints].sort(/** 按断点所属节点标识排序。 */ (a, b) => ordinal(a.nodeUuid, b.nodeUuid)), watches: [...new Set(normalized.debug.watches)].sort(ordinal) }, migrations: [...normalized.migrations].sort(/** 按稳定 UUID 排序，不依赖输入集合顺序。 */ (a, b) => ordinal(a.uuid, b.uuid)) })
}

/** 将规范化且稳定排序的图输出为带末尾换行的缩进 JSON。 */
export function serializeGraphDocument(graph: NovaGraphDocument): string { return `${JSON.stringify(canonicalGraphDocument(graph), null, 2)}\n` }
/** 解析 JSON 并执行图规范化，把解析或校验失败统一为可显示的异常。 */
export function parseGraphDocument(source: string): NovaGraphDocument { try { return normalizeGraphDocument(JSON.parse(source)) } catch (error) { throw new Error(error instanceof Error ? error.message : 'Invalid visual graph JSON.') } }
