/** Temporary lazy Editor facade; each Core owns its fixed-World transaction metadata. */
import { ScriptHotReloadOwner,createInitialScriptHotReloadState,type ScriptHotReloadState } from './scriptHotReloadOwner'
export type { HotReloadCompatibility,HotReloadExportShape,HotReloadPlan,HotReloadHistoryEntry,ScriptHotReloadWorld,ScriptHotReloadState } from './scriptHotReloadOwner'
const legacyRaw=createInitialScriptHotReloadState()
export let scriptHotReloadState=legacyRaw
let stateAdapterInstalled = false

/** Bootstrap preflight only; the aggregate installer owns production installation. */
export function isScriptHotReloadStateAdapterInstalled(): boolean { return stateAdapterInstalled }
/** Internal bootstrap: the aggregate installer stages all four views before committing. */
export function installScriptHotReloadStateAdapter(adapter: (target: typeof scriptHotReloadState) => typeof scriptHotReloadState): void {
  if (stateAdapterInstalled) return
  const view = adapter(scriptHotReloadState)
  if (!view || typeof view !== 'object') throw new TypeError('Script state adapter must wrap the existing scriptHotReloadState target')
  scriptHotReloadState = view
  stateAdapterInstalled = true
}
export function getLegacyScriptHotReloadRawState():ScriptHotReloadState { return legacyRaw }
interface LegacyScriptHotReloadPort { stateView:ScriptHotReloadState;unwrapState(value:ScriptHotReloadState):ScriptHotReloadState;getOwner():ScriptHotReloadOwner }
let legacyPort:LegacyScriptHotReloadPort|null=null
/** Register the unique singleton lazily; the existing aggregate installer still wraps the same raw. */
export function installLegacyScriptHotReloadPort(port:LegacyScriptHotReloadPort):void {
 if(!port||typeof port.getOwner!=='function'||typeof port.unwrapState!=='function'||port.unwrapState(port.stateView)!==legacyRaw)throw new Error('HOT_RELOAD_LEGACY_SAME_RAW_REQUIRED')
 if(legacyPort)throw new Error('HOT_RELOAD_LEGACY_PORT_ALREADY_INSTALLED')
 legacyPort=port
}
function requireLegacyScriptHotReloadOwner():ScriptHotReloadOwner {
 if(!legacyPort)throw new Error('HOT_RELOAD_LEGACY_PORT_REQUIRED: Install the actual unique Editor singleton provider.')
 const owner=legacyPort.getOwner()
 if(!(owner instanceof ScriptHotReloadOwner)||legacyPort.unwrapState(owner.state)!==legacyRaw)throw new Error('HOT_RELOAD_LEGACY_OWNER_REQUIRED')
 return owner
}
export function prepareHotReload(...args:Parameters<ScriptHotReloadOwner['prepareHotReload']>):ReturnType<ScriptHotReloadOwner['prepareHotReload']> { return requireLegacyScriptHotReloadOwner().prepareHotReload(...args) }
export function commitHotReload(...args:Parameters<ScriptHotReloadOwner['commitHotReload']>):ReturnType<ScriptHotReloadOwner['commitHotReload']> { return requireLegacyScriptHotReloadOwner().commitHotReload(...args) }
export function rejectHotReload(...args:Parameters<ScriptHotReloadOwner['rejectHotReload']>):ReturnType<ScriptHotReloadOwner['rejectHotReload']> { return requireLegacyScriptHotReloadOwner().rejectHotReload(...args) }
export function peekHotReloadRollback(...args:Parameters<ScriptHotReloadOwner['peekHotReloadRollback']>):ReturnType<ScriptHotReloadOwner['peekHotReloadRollback']> { return requireLegacyScriptHotReloadOwner().peekHotReloadRollback(...args) }
export function completeHotReloadRollback(...args:Parameters<ScriptHotReloadOwner['completeHotReloadRollback']>):ReturnType<ScriptHotReloadOwner['completeHotReloadRollback']> { return requireLegacyScriptHotReloadOwner().completeHotReloadRollback(...args) }
export function rollbackHotReload(...args:Parameters<ScriptHotReloadOwner['rollbackHotReload']>):ReturnType<ScriptHotReloadOwner['rollbackHotReload']> { return requireLegacyScriptHotReloadOwner().rollbackHotReload(...args) }
export function hotReloadHistory(...args:Parameters<ScriptHotReloadOwner['hotReloadHistory']>):ReturnType<ScriptHotReloadOwner['hotReloadHistory']> { return requireLegacyScriptHotReloadOwner().hotReloadHistory(...args) }
export function clearHotReloadSession(...args:Parameters<ScriptHotReloadOwner['clearHotReloadSession']>):ReturnType<ScriptHotReloadOwner['clearHotReloadSession']> { return requireLegacyScriptHotReloadOwner().clearHotReloadSession(...args) }
