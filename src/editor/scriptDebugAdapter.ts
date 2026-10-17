/** Unique legacy raw claim; every ordinary Core/compat construction gets fresh state. */
import { reactive, toRaw } from 'vue'
import { physicsState } from '../store/physics'
import { ScriptDebugOwner, type ScriptDebugWorld } from '../runtime/scriptDebugOwner'
import type { GameplayScriptServices } from '../runtime/scriptServices'
import { getLegacyScriptDebugRawState, installLegacyScriptDebugPort } from '../runtime/scriptDebug'
const stateView=reactive(getLegacyScriptDebugRawState())
let legacyRawClaimed=false
export function createEditorScriptDebugOwner(world:ScriptDebugWorld,catalog:GameplayScriptServices,options:{legacyRoot:boolean;legacyState?:unknown}):ScriptDebugOwner {
 if(options.legacyRoot&&options.legacyState!==physicsState)throw new Error('SCRIPT_DEBUG_LEGACY_ROOT_REQUIRED: Only the actual Editor physicsState may claim this view.')
 if(options.legacyRoot&&legacyRawClaimed)throw new Error('SCRIPT_DEBUG_LEGACY_RAW_ALREADY_CLAIMED: Only the unique Editor gameplayRuntime may claim this view.')
 const owner=new ScriptDebugOwner(world,catalog,options.legacyRoot?stateView:undefined)
 if(options.legacyRoot)legacyRawClaimed=true
 return owner
}
export function installEditorScriptDebugOwnerProvider(getOwner:()=>ScriptDebugOwner):void {
 installLegacyScriptDebugPort({stateView,unwrapState:toRaw,getOwner})
}
