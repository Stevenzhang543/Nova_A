/** Temporary single-root Editor facade; Core uses a fixed-World debugger directly. */
import { ScriptDebugOwner, createInitialScriptDebugState, evaluateDebugExpression as evaluateSnapshotDebugExpression, type ScriptDebugState } from './scriptDebugOwner'
export type { DebugFrame, DebugWatch, DebugStepMode, DebugExceptionPolicy, DebugTask, RemoteDebugPeer, DebugSourceMapping, DebugSourceMap, DebugProtocolRequest, ScriptTestResult, DebugHost, ScriptDebugState, ScriptDebugWorld } from './scriptDebugOwner'
export { DEBUG_CAPABILITIES, debugSourceRevision, normalizeDebugSourceMap } from './scriptDebugOwner'
const legacyRaw=createInitialScriptDebugState()
export let scriptDebugState=legacyRaw
let stateAdapterInstalled = false
export function isScriptDebugStateAdapterInstalled(): boolean { return stateAdapterInstalled }
export function installScriptDebugStateAdapter(adapter: (target: typeof scriptDebugState) => typeof scriptDebugState): void {
  if (stateAdapterInstalled) return
  const view = adapter(scriptDebugState)
  if (!view || typeof view !== 'object') throw new TypeError('Script state adapter must wrap the existing scriptDebugState target')
  scriptDebugState = view
  stateAdapterInstalled = true
}
export function getLegacyScriptDebugRawState(): ScriptDebugState { return legacyRaw }
interface LegacyScriptDebugPort { stateView:ScriptDebugState; unwrapState(value:ScriptDebugState):ScriptDebugState; getOwner():ScriptDebugOwner }
let legacyPort:LegacyScriptDebugPort|null=null
/** Registration is lazy and leaves aggregate same-raw wrapping as the existing bootstrap owner. */
export function installLegacyScriptDebugPort(port:LegacyScriptDebugPort):void {
 if(!port||typeof port.getOwner!=='function'||typeof port.unwrapState!=='function'||port.unwrapState(port.stateView)!==legacyRaw)throw new Error('SCRIPT_DEBUG_LEGACY_SAME_RAW_REQUIRED')
 if(legacyPort)throw new Error('SCRIPT_DEBUG_LEGACY_PORT_ALREADY_INSTALLED')
 legacyPort=port
}
function requireLegacyScriptDebugOwner():ScriptDebugOwner {
 if(!legacyPort)throw new Error('SCRIPT_DEBUG_LEGACY_PORT_REQUIRED: Install the actual Editor singleton provider.')
 const owner=legacyPort.getOwner()
 if(!(owner instanceof ScriptDebugOwner)||legacyPort.unwrapState(owner.state)!==legacyRaw)throw new Error('SCRIPT_DEBUG_LEGACY_OWNER_REQUIRED')
 return owner
}
export function evaluateDebugExpression(expression:string,root?:unknown):unknown { return root===undefined?requireLegacyScriptDebugOwner().evaluateDebugExpression(expression):evaluateSnapshotDebugExpression(expression,root) }
export function bindDebugHost(...args:Parameters<ScriptDebugOwner['bindDebugHost']>):ReturnType<ScriptDebugOwner['bindDebugHost']> { return requireLegacyScriptDebugOwner().bindDebugHost(...args) }
export function inspectDebugObject(...args:Parameters<ScriptDebugOwner['inspectDebugObject']>):ReturnType<ScriptDebugOwner['inspectDebugObject']> { return requireLegacyScriptDebugOwner().inspectDebugObject(...args) }
export function addDebugWatch(...args:Parameters<ScriptDebugOwner['addDebugWatch']>):ReturnType<ScriptDebugOwner['addDebugWatch']> { return requireLegacyScriptDebugOwner().addDebugWatch(...args) }
export function removeDebugWatch(...args:Parameters<ScriptDebugOwner['removeDebugWatch']>):ReturnType<ScriptDebugOwner['removeDebugWatch']> { return requireLegacyScriptDebugOwner().removeDebugWatch(...args) }
export function evaluateDebugWatches(...args:Parameters<ScriptDebugOwner['evaluateDebugWatches']>):ReturnType<ScriptDebugOwner['evaluateDebugWatches']> { return requireLegacyScriptDebugOwner().evaluateDebugWatches(...args) }
export function pauseScriptDebugger(...args:Parameters<ScriptDebugOwner['pauseScriptDebugger']>):ReturnType<ScriptDebugOwner['pauseScriptDebugger']> { return requireLegacyScriptDebugOwner().pauseScriptDebugger(...args) }
export function clearScriptDebugger(...args:Parameters<ScriptDebugOwner['clearScriptDebugger']>):ReturnType<ScriptDebugOwner['clearScriptDebugger']> { return requireLegacyScriptDebugOwner().clearScriptDebugger(...args) }
export function beginDebugSession(...args:Parameters<ScriptDebugOwner['beginDebugSession']>):ReturnType<ScriptDebugOwner['beginDebugSession']> { return requireLegacyScriptDebugOwner().beginDebugSession(...args) }
export function requestDebugStep(...args:Parameters<ScriptDebugOwner['requestDebugStep']>):ReturnType<ScriptDebugOwner['requestDebugStep']> { return requireLegacyScriptDebugOwner().requestDebugStep(...args) }
export function selectDebugFrame(...args:Parameters<ScriptDebugOwner['selectDebugFrame']>):ReturnType<ScriptDebugOwner['selectDebugFrame']> { return requireLegacyScriptDebugOwner().selectDebugFrame(...args) }
export function updateDebugTask(...args:Parameters<ScriptDebugOwner['updateDebugTask']>):ReturnType<ScriptDebugOwner['updateDebugTask']> { return requireLegacyScriptDebugOwner().updateDebugTask(...args) }
export function markDebugTaskCancelled(...args:Parameters<ScriptDebugOwner['markDebugTaskCancelled']>):ReturnType<ScriptDebugOwner['markDebugTaskCancelled']> { return requireLegacyScriptDebugOwner().markDebugTaskCancelled(...args) }
export function handleDebugProtocol(...args:Parameters<ScriptDebugOwner['handleDebugProtocol']>):ReturnType<ScriptDebugOwner['handleDebugProtocol']> { return requireLegacyScriptDebugOwner().handleDebugProtocol(...args) }
export function disconnectRemoteDebugger(...args:Parameters<ScriptDebugOwner['disconnectRemoteDebugger']>):ReturnType<ScriptDebugOwner['disconnectRemoteDebugger']> { return requireLegacyScriptDebugOwner().disconnectRemoteDebugger(...args) }
