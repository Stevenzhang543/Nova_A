/** The explicit unique Editor singleton may claim the original raw; every ordinary construction is fresh. */
import { reactive,toRaw } from 'vue'
import { physicsState } from '../store/physics'
import type { GameplayWorldHost } from '../runtime/gameplayWorldHost'
import type { GameplayScriptServices } from '../runtime/scriptServices'
import { ScriptHotReloadOwner } from '../runtime/scriptHotReloadOwner'
import { getLegacyScriptHotReloadRawState,installLegacyScriptHotReloadPort } from '../runtime/scriptHotReload'
const stateView=reactive(getLegacyScriptHotReloadRawState())
let legacyRawClaimed=false
export function createEditorScriptHotReloadOwner(suppliedHost:Pick<GameplayWorldHost,'state'>,catalog:GameplayScriptServices,options:{legacyRoot:boolean}):ScriptHotReloadOwner {
 if(options.legacyRoot&&(suppliedHost.state as unknown)!==physicsState)throw new Error('HOT_RELOAD_LEGACY_ROOT_REQUIRED: Only the actual Editor physicsState may claim the legacy view.')
 if(options.legacyRoot&&legacyRawClaimed)throw new Error('HOT_RELOAD_LEGACY_RAW_ALREADY_CLAIMED: Only the unique Editor gameplayRuntime may claim this view.')
 const owner=new ScriptHotReloadOwner(suppliedHost.state.world,catalog,options.legacyRoot?stateView:undefined)
 if(options.legacyRoot)legacyRawClaimed=true
 return owner
}
export function installEditorScriptHotReloadOwnerProvider(getOwner:()=>ScriptHotReloadOwner):void {
 installLegacyScriptHotReloadPort({stateView,unwrapState:toRaw,getOwner})
}
