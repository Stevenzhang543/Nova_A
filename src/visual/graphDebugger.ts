/** 图调试状态：记录有界执行轨迹、节点耗时、覆盖率、观察值和断点命中，并生成调试快照。 */
import { reactive } from 'vue'
import { evaluateDebugExpression } from '../runtime/scriptDebug'
import { parseGraphDocument, type GraphBreakpoint, type GraphValue, type NovaGraphDocument } from './graphTypes'
import { NOVA_ENGINE_VERSION } from '../projects/projectFormat'

export interface GraphTraceCommand {
  type: 'graphTrace'
  graphUuid: string
  scopeUuid: string
  nodeUuid: string
  edgeUuid: string
  depth: number
  durationMicros: number
  values: unknown
}

export interface GraphTraceEntry extends Omit<GraphTraceCommand, 'type' | 'values'> { sequence: number; at: number; values: Record<string, unknown> }
export interface GraphNodeTiming { nodeUuid: string; calls: number; totalMicros: number; maximumMicros: number; lastMicros: number }
export interface GraphNodeError { graphUuid: string; nodeUuid: string; message: string; at: number; count: number }
export interface GraphWatchResult { expression: string; value: string; error: string }
export interface GraphTraceDecision { pause: boolean; reason: string; logMessage: string }
export type GraphStepMode = 'continue' | 'into' | 'over' | 'out'

export const graphDebugState = reactive({
  session: 0,
  paused: false,
  reason: '',
  stepMode: 'continue' as GraphStepMode,
  stepDepth: 0,
  activeGraphUuid: '',
  activeScopeUuid: '',
  activeNodeUuid: '',
  activeEdgeUuid: '',
  activeAt: 0,
  sequence: 0,
  trace: [] as GraphTraceEntry[],
  callStack: [] as Array<{ graphUuid: string; scopeUuid: string; nodeUuid: string; depth: number }>,
  timings: {} as Record<string, GraphNodeTiming>,
  coverage: {} as Record<string, number>,
  errors: [] as GraphNodeError[],
  watches: [] as GraphWatchResult[],
  breakpointHits: {} as Record<string, number>,
  revision: 0
})

const documents = new Map<string, NovaGraphDocument>()
const MAX_TRACE_ENTRIES = 5_000

/* 根据 value && typeof value === 'object' && !Array.isArray(value) 的真假，分别返回 value as Record<string, unknown> 或 {}。 */ function values(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
/** 字符串直接返回，其他值优先 JSON 序列化，无法序列化时退回普通字符串转换。 */ function text(value: unknown): string { if (typeof value === 'string') return value; try { return JSON.stringify(value) } catch { return String(value) } }
/* 当 graph?.debug.breakpoints.find(item => item.enabled && item.nodeUuid === nodeUuid) 为 null 或 undefined 时返回 null，否则保留左侧值。 */ function breakpointFor(graph: NovaGraphDocument | undefined, nodeUuid: string): GraphBreakpoint | null { return graph?.debug.breakpoints.find(/* 先计算 item.enabled；仅当其为真值时求右侧 item.nodeUuid === nodeUuid，返回短路求值结果。 */ item => item.enabled && item.nodeUuid === nodeUuid) ?? null }
/** 用当前上下文替换日志模板中的标识符路径，占位值不可求解时给出提示并限制结果长度。 */ function formatLogpoint(template: string, context: Record<string, unknown>): string { return template.replace(/\{([A-Za-z_][A-Za-z0-9_.]*)\}/g, /** 求解日志占位路径并格式化；失败时显示该路径不可用。 */ (_match, path: string) => { try { return text(evaluateDebugExpression(path, context)) } catch { return `<${path}: unavailable>` } }).slice(0, 4_096) }

/** 解析图文本或接受现成文档，按图 UUID 登记供断点和观察表达式查询。 */ export function registerGraphDebugDocument(source: string | NovaGraphDocument): NovaGraphDocument {
  const graph = typeof source === 'string' ? parseGraphDocument(source) : source
  documents.set(graph.uuid, graph)
  return graph
}

/* 当 documents.get(uuid) 为 null 或 undefined 时返回 null，否则保留左侧值。 */ export function graphDebugDocument(uuid: string): NovaGraphDocument | null { return documents.get(uuid) ?? null }

/** 开启新调试会话，清空暂停位置、轨迹、调用栈、耗时、覆盖和断点计数。 */ export function beginGraphDebugSession(): void {
  graphDebugState.session++
  graphDebugState.paused = false; graphDebugState.reason = ''; graphDebugState.stepMode = 'continue'; graphDebugState.stepDepth = 0
  graphDebugState.activeGraphUuid = ''; graphDebugState.activeScopeUuid = ''; graphDebugState.activeNodeUuid = ''; graphDebugState.activeEdgeUuid = ''; graphDebugState.activeAt = 0; graphDebugState.sequence = 0
  graphDebugState.trace.splice(0); graphDebugState.callStack.splice(0); graphDebugState.timings = {}; graphDebugState.coverage = {}; graphDebugState.errors.splice(0); graphDebugState.watches.splice(0); graphDebugState.breakpointHits = {}; graphDebugState.revision++
}

/** 解除暂停并记录单步模式与当前调用深度，让后续追踪决定停点。 */ export function requestGraphStep(mode: GraphStepMode): void { graphDebugState.paused = false; graphDebugState.reason = ''; graphDebugState.stepMode = mode; graphDebugState.stepDepth = graphDebugState.callStack[0]?.depth ?? 0; graphDebugState.revision++ }
/** 解除暂停和单步请求，恢复持续运行并发布状态修订。 */ export function clearGraphPause(): void { graphDebugState.paused = false; graphDebugState.reason = ''; graphDebugState.stepMode = 'continue'; graphDebugState.revision++ }

/** 按进入、越过或跳出模式比较追踪深度；只有节点追踪可以触发停步。 */ function shouldStep(command: GraphTraceCommand): boolean {
  if (!command.nodeUuid || graphDebugState.stepMode === 'continue') return false
  if (graphDebugState.stepMode === 'into') return true
  if (graphDebugState.stepMode === 'over') return command.depth <= graphDebugState.stepDepth
  return command.depth < graphDebugState.stepDepth
}

/** 更新有界轨迹、栈、覆盖和耗时，计算观察值及条件断点，返回暂停决定与日志消息。 */ export function recordGraphTrace(command: GraphTraceCommand): GraphTraceDecision {
  const context = values(command.values), at = performance.now(), sequence = ++graphDebugState.sequence
  graphDebugState.activeGraphUuid = command.graphUuid; graphDebugState.activeScopeUuid = command.scopeUuid
  if (command.nodeUuid) graphDebugState.activeNodeUuid = command.nodeUuid
  if (command.edgeUuid) graphDebugState.activeEdgeUuid = command.edgeUuid
  graphDebugState.activeAt = at
  const entry: GraphTraceEntry = { graphUuid: command.graphUuid, scopeUuid: command.scopeUuid, nodeUuid: command.nodeUuid, edgeUuid: command.edgeUuid, depth: Math.max(0, Math.min(32, Math.round(command.depth))), durationMicros: Math.max(0, Number(command.durationMicros) || 0), sequence, at, values: context }
  graphDebugState.trace.unshift(entry); if (graphDebugState.trace.length > MAX_TRACE_ENTRIES) graphDebugState.trace.splice(MAX_TRACE_ENTRIES)
  if (command.nodeUuid) {
    graphDebugState.coverage[command.nodeUuid] = Math.min(1_000_000_000, (graphDebugState.coverage[command.nodeUuid] ?? 0) + 1)
    const timing = graphDebugState.timings[command.nodeUuid] ?? { nodeUuid: command.nodeUuid, calls: 0, totalMicros: 0, maximumMicros: 0, lastMicros: 0 }
    timing.calls++; timing.lastMicros = entry.durationMicros; timing.totalMicros += entry.durationMicros; timing.maximumMicros = Math.max(timing.maximumMicros, entry.durationMicros); graphDebugState.timings[command.nodeUuid] = timing
    const frame = { graphUuid: command.graphUuid, scopeUuid: command.scopeUuid, nodeUuid: command.nodeUuid, depth: entry.depth }
    graphDebugState.callStack.splice(0, graphDebugState.callStack.length, frame, ...graphDebugState.callStack.filter(/* 比较 item.depth 与 entry.depth，返回小于的判断结果。 */ item => item.depth < entry.depth).sort(/* 计算表达式 b.depth - a.depth 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => b.depth - a.depth).slice(0, 31))
  }
  const graph = documents.get(command.graphUuid), watchExpressions = graph?.debug.watches ?? []
  graphDebugState.watches.splice(0, graphDebugState.watches.length, ...watchExpressions.map(/** 分别求解观察表达式，将单个求值异常转为该项错误而不打断其他观察值。 */ expression => { try { return { expression, value: text(evaluateDebugExpression(expression, context)), error: '' } } catch (error) { return { expression, value: '—', error: error instanceof Error ? error.message : String(error) } } }))
  const breakpoint = command.nodeUuid ? breakpointFor(graph, command.nodeUuid) : null
  let pause = shouldStep(command), reason = pause ? `Step ${graphDebugState.stepMode} reached node ${command.nodeUuid}` : '', logMessage = ''
  if (breakpoint) {
    const hits = Math.min(1_000_000_000, (graphDebugState.breakpointHits[command.nodeUuid] ?? 0) + 1); graphDebugState.breakpointHits[command.nodeUuid] = hits
    let condition = true
    if (breakpoint.condition.trim()) try { condition = Boolean(evaluateDebugExpression(breakpoint.condition, context)) } catch (error) { condition = false; recordGraphError(command.graphUuid, command.nodeUuid, `Breakpoint condition: ${error instanceof Error ? error.message : String(error)}`) }
    if (breakpoint.hitCondition > 0 && hits < breakpoint.hitCondition) condition = false
    if (condition && breakpoint.logMessage.trim()) { logMessage = formatLogpoint(breakpoint.logMessage, context); condition = false }
    if (condition) { pause = true; reason = `Visual breakpoint at node ${command.nodeUuid} · hit ${hits}` }
  }
  if (pause) { graphDebugState.paused = true; graphDebugState.reason = reason; graphDebugState.stepMode = 'continue' }
  graphDebugState.revision++
  return { pause, reason, logMessage }
}

/** 按图、节点及裁剪后的消息合并错误次数，保留最多一千项错误并更新修订。 */ export function recordGraphError(graphUuid: string, nodeUuid: string, message: string): void {
  const clean = message.slice(0, 2_048), existing = graphDebugState.errors.find(/* 先计算 item.graphUuid === graphUuid && item.nodeUuid === nodeUuid；仅当其为真值时求右侧 item.message === clean，返回短路求值结果。 */ item => item.graphUuid === graphUuid && item.nodeUuid === nodeUuid && item.message === clean)
  if (existing) { existing.count++; existing.at = performance.now() } else graphDebugState.errors.unshift({ graphUuid, nodeUuid, message: clean, at: performance.now(), count: 1 })
  if (graphDebugState.errors.length > 1_000) graphDebugState.errors.splice(1_000)
  graphDebugState.revision++
}

/** 计算除重路由节点之外的执行覆盖数量、比例和未覆盖节点标识。 */ export function graphCoverage(graph: NovaGraphDocument): { covered: number; total: number; rate: number; missing: string[] } {
  const nodes = [graph.nodes, ...graph.routines.map(/* 返回 routine.nodes 的当前值。 */ routine => routine.nodes)].flat().filter(/* 返回 node.type.startsWith('reroute.') 的逻辑取反结果。 */ node => !node.type.startsWith('reroute.'))
  const covered = nodes.filter(/* 比较 (graphDebugState.coverage[node.uuid] ?? 0) 与 0，返回大于的判断结果。 */ node => (graphDebugState.coverage[node.uuid] ?? 0) > 0).length
  return { covered, total: nodes.length, rate: nodes.length ? covered / nodes.length : 1, missing: nodes.filter(/* 返回 (graphDebugState.coverage[node.uuid] > 0) 的逻辑取反结果。 */ node => !(graphDebugState.coverage[node.uuid] > 0)).map(/* 返回 node.uuid 的当前值。 */ node => node.uuid) }
}

/** 导出含引擎版本、活动位置、轨迹、耗时、覆盖和错误的格式化 JSON 调试快照。 */ export function graphDebugSnapshot(): string {
  return `${JSON.stringify({ format: 'nova-graph-debug-capture', version: 1, engineVersion: NOVA_ENGINE_VERSION, session: graphDebugState.session, active: { graphUuid: graphDebugState.activeGraphUuid, scopeUuid: graphDebugState.activeScopeUuid, nodeUuid: graphDebugState.activeNodeUuid, edgeUuid: graphDebugState.activeEdgeUuid }, trace: graphDebugState.trace, timings: graphDebugState.timings, coverage: graphDebugState.coverage, errors: graphDebugState.errors }, null, 2)}\n`
}

/** 将最新追踪中的值复制为图变量状态记录；无追踪时返回空记录。 */ export function graphStateValues(): Record<string, GraphValue> { const current = graphDebugState.trace[0]?.values ?? {}; return Object.fromEntries(Object.entries(current).map(/* 返回按声明顺序构造的数组 [key, value as GraphValue]。 */ ([key, value]) => [key, value as GraphValue])) }
