/** Temporary single-root Editor facade. Fixed Runtime owners never import this module. */
import { GraphDebugOwner, createInitialGraphDebugState, type GraphDebugState } from '../runtime/graphDebugOwner'
export type { GraphTraceCommand, GraphTraceEntry, GraphNodeTiming, GraphNodeError, GraphWatchResult, GraphTraceDecision, GraphStepMode } from '../runtime/graphDebugOwner'
const legacyRaw = createInitialGraphDebugState()
export let graphDebugState = legacyRaw
export function getLegacyGraphDebugRawState(): GraphDebugState { return legacyRaw }
interface LegacyGraphDebugPort { stateView: GraphDebugState; unwrapState(value: GraphDebugState): GraphDebugState; getOwner(): GraphDebugOwner }
let legacyPort: LegacyGraphDebugPort | null = null
/** Installation only wraps the existing raw; it never invokes the provider or reads a World. */
export function installLegacyGraphDebugPort(port: LegacyGraphDebugPort): void {
  if (!port || typeof port.getOwner!=='function' || typeof port.unwrapState!=='function' || port.unwrapState(port.stateView)!==legacyRaw) throw new Error('GRAPH_DEBUG_LEGACY_SAME_RAW_REQUIRED')
  if (legacyPort) throw new Error('GRAPH_DEBUG_LEGACY_PORT_ALREADY_INSTALLED')
  legacyPort=port; graphDebugState=port.stateView
}
function requireLegacyGraphDebugOwner(): GraphDebugOwner {
  if (!legacyPort) throw new Error('GRAPH_DEBUG_LEGACY_PORT_REQUIRED: Install the real Editor composition before calling the legacy API.')
  const owner=legacyPort.getOwner(); if (!(owner instanceof GraphDebugOwner)) throw new Error('GRAPH_DEBUG_LEGACY_OWNER_REQUIRED'); return owner
}
export function registerGraphDebugDocument(...args: Parameters<GraphDebugOwner['registerGraphDebugDocument']>): ReturnType<GraphDebugOwner['registerGraphDebugDocument']> { return requireLegacyGraphDebugOwner().registerGraphDebugDocument(...args) }
export function graphDebugDocument(...args: Parameters<GraphDebugOwner['graphDebugDocument']>): ReturnType<GraphDebugOwner['graphDebugDocument']> { return requireLegacyGraphDebugOwner().graphDebugDocument(...args) }
export function beginGraphDebugSession(...args: Parameters<GraphDebugOwner['beginGraphDebugSession']>): ReturnType<GraphDebugOwner['beginGraphDebugSession']> { return requireLegacyGraphDebugOwner().beginGraphDebugSession(...args) }
export function requestGraphStep(...args: Parameters<GraphDebugOwner['requestGraphStep']>): ReturnType<GraphDebugOwner['requestGraphStep']> { return requireLegacyGraphDebugOwner().requestGraphStep(...args) }
export function clearGraphPause(...args: Parameters<GraphDebugOwner['clearGraphPause']>): ReturnType<GraphDebugOwner['clearGraphPause']> { return requireLegacyGraphDebugOwner().clearGraphPause(...args) }
export function recordGraphTrace(...args: Parameters<GraphDebugOwner['recordGraphTrace']>): ReturnType<GraphDebugOwner['recordGraphTrace']> { return requireLegacyGraphDebugOwner().recordGraphTrace(...args) }
export function recordGraphError(...args: Parameters<GraphDebugOwner['recordGraphError']>): ReturnType<GraphDebugOwner['recordGraphError']> { return requireLegacyGraphDebugOwner().recordGraphError(...args) }
export function graphCoverage(...args: Parameters<GraphDebugOwner['graphCoverage']>): ReturnType<GraphDebugOwner['graphCoverage']> { return requireLegacyGraphDebugOwner().graphCoverage(...args) }
export function graphDebugSnapshot(...args: Parameters<GraphDebugOwner['graphDebugSnapshot']>): ReturnType<GraphDebugOwner['graphDebugSnapshot']> { return requireLegacyGraphDebugOwner().graphDebugSnapshot(...args) }
export function graphStateValues(...args: Parameters<GraphDebugOwner['graphStateValues']>): ReturnType<GraphDebugOwner['graphStateValues']> { return requireLegacyGraphDebugOwner().graphStateValues(...args) }
