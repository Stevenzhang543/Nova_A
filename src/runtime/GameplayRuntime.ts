/** Compatibility entry: the unique gameplay implementation is composed with Editor script services. */
import { GameplayRuntime as GameplayRuntimeCore } from './GameplayRuntimeCore'
import { createEditorGameplayScriptServices } from '../editor/gameplayScriptServices'
import { createEditorGameplayWorldHost } from '../editor/gameplayWorldHost'
import { getEditorGameFlowOwner } from '../editor/gameFlowAdapter'
import { installEditorScriptDebugOwnerProvider } from '../editor/scriptDebugAdapter'
import { installEditorScriptHotReloadOwnerProvider } from '../editor/scriptHotReloadAdapter'
import type { GameplayScriptServices } from './scriptServices'

export type { ExportedProperty, RuntimeDiagnostics, GameplayInputReceiptObservation, GameplayInputFrameObservation, GameplayInputObservationCallbacks } from './GameplayRuntimeCore'
export { GameplayRuntimeCore }
export { DEFAULT_SCRIPT_SOURCE } from './GameplayRuntimeCore'

/** Existing constructor and import names retain the Editor's existing World/catalog. */
export class GameplayRuntime extends GameplayRuntimeCore {
  constructor(scriptServices?: GameplayScriptServices,options:{legacyDebugRoot?:boolean}={}) { super(scriptServices??createEditorGameplayScriptServices(), createEditorGameplayWorldHost({legacyAnimationRoot:scriptServices===undefined,legacyDebugRoot:options.legacyDebugRoot===true}), null, getEditorGameFlowOwner()) }
}

export const gameplayRuntime = new GameplayRuntime(undefined,{legacyDebugRoot:true})
installEditorScriptDebugOwnerProvider(()=>gameplayRuntime.scriptDebugger)
installEditorScriptHotReloadOwnerProvider(()=>gameplayRuntime.scriptHotReload)
