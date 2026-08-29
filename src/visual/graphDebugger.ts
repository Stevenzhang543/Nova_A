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

function values(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
function text(value: unknown): string { if (typeof value === 'string') return value; try { return JSON.stringify(value) } catch { return String(value) } }
function breakpointFor(graph: NovaGraphDocument | undefined, nodeUuid: string): GraphBreakpoint | null { return graph?.debug.breakpoints.find(item => item.enabled && item.nodeUuid === nodeUuid) ?? null }
function formatLogpoint(template: string, context: Record<string, unknown>): string { return template.replace(/\{([A-Za-z_][A-Za-z0-9_.]*)\}/g, (_match, path: string) => { try { return text(evaluateDebugExpression(path, context)) } catch { return `<${path}: unavailable>` } }).slice(0, 4_096) }

export function registerGraphDebugDocument(source: string | NovaGraphDocument): NovaGraphDocument {
  const graph = typeof source === 'string' ? parseGraphDocument(source) : source
  documents.set(graph.uuid, graph)
  return graph
}

export function graphDebugDocument(uuid: string): NovaGraphDocument | null { return documents.get(uuid) ?? null }

export function beginGraphDebugSession(): void {
  graphDebugState.session++
  graphDebugState.paused = false; graphDebugState.reason = ''; graphDebugState.stepMode = 'continue'; graphDebugState.stepDepth = 0
  graphDebugState.activeGraphUuid = ''; graphDebugState.activeScopeUuid = ''; graphDebugState.activeNodeUuid = ''; graphDebugState.activeEdgeUuid = ''; graphDebugState.activeAt = 0; graphDebugState.sequence = 0
  graphDebugState.trace.splice(0); graphDebugState.callStack.splice(0); graphDebugState.timings = {}; graphDebugState.coverage = {}; graphDebugState.errors.splice(0); graphDebugState.watches.splice(0); graphDebugState.breakpointHits = {}; graphDebugState.revision++
}

export function requestGraphStep(mode: GraphStepMode): void { graphDebugState.paused = false; graphDebugState.reason = ''; graphDebugState.stepMode = mode; graphDebugState.stepDepth = graphDebugState.callStack[0]?.depth ?? 0; graphDebugState.revision++ }
export function clearGraphPause(): void { graphDebugState.paused = false; graphDebugState.reason = ''; graphDebugState.stepMode = 'continue'; graphDebugState.revision++ }

function shouldStep(command: GraphTraceCommand): boolean {
  if (!command.nodeUuid || graphDebugState.stepMode === 'continue') return false
  if (graphDebugState.stepMode === 'into') return true
  if (graphDebugState.stepMode === 'over') return command.depth <= graphDebugState.stepDepth
  return command.depth < graphDebugState.stepDepth
}

export function recordGraphTrace(command: GraphTraceCommand): GraphTraceDecision {
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
    graphDebugState.callStack.splice(0, graphDebugState.callStack.length, frame, ...graphDebugState.callStack.filter(item => item.depth < entry.depth).sort((a, b) => b.depth - a.depth).slice(0, 31))
  }
  const graph = documents.get(command.graphUuid), watchExpressions = graph?.debug.watches ?? []
  graphDebugState.watches.splice(0, graphDebugState.watches.length, ...watchExpressions.map(expression => { try { return { expression, value: text(evaluateDebugExpression(expression, context)), error: '' } } catch (error) { return { expression, value: '—', error: error instanceof Error ? error.message : String(error) } } }))
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

export function recordGraphError(graphUuid: string, nodeUuid: string, message: string): void {
  const clean = message.slice(0, 2_048), existing = graphDebugState.errors.find(item => item.graphUuid === graphUuid && item.nodeUuid === nodeUuid && item.message === clean)
  if (existing) { existing.count++; existing.at = performance.now() } else graphDebugState.errors.unshift({ graphUuid, nodeUuid, message: clean, at: performance.now(), count: 1 })
  if (graphDebugState.errors.length > 1_000) graphDebugState.errors.splice(1_000)
  graphDebugState.revision++
}

export function graphCoverage(graph: NovaGraphDocument): { covered: number; total: number; rate: number; missing: string[] } {
  const nodes = [graph.nodes, ...graph.routines.map(routine => routine.nodes)].flat().filter(node => !node.type.startsWith('reroute.'))
  const covered = nodes.filter(node => (graphDebugState.coverage[node.uuid] ?? 0) > 0).length
  return { covered, total: nodes.length, rate: nodes.length ? covered / nodes.length : 1, missing: nodes.filter(node => !(graphDebugState.coverage[node.uuid] > 0)).map(node => node.uuid) }
}

export function graphDebugSnapshot(): string {
  return `${JSON.stringify({ format: 'nova-graph-debug-capture', version: 1, engineVersion: NOVA_ENGINE_VERSION, session: graphDebugState.session, active: { graphUuid: graphDebugState.activeGraphUuid, scopeUuid: graphDebugState.activeScopeUuid, nodeUuid: graphDebugState.activeNodeUuid, edgeUuid: graphDebugState.activeEdgeUuid }, trace: graphDebugState.trace, timings: graphDebugState.timings, coverage: graphDebugState.coverage, errors: graphDebugState.errors }, null, 2)}\n`
}

export function graphStateValues(): Record<string, GraphValue> { const current = graphDebugState.trace[0]?.values ?? {}; return Object.fromEntries(Object.entries(current).map(([key, value]) => [key, value as GraphValue])) }
