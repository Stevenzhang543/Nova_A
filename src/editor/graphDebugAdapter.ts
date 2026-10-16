/** Actual Editor clock and the original same-raw view; no Owner cache or eager World lookup. */
import { reactive, toRaw } from 'vue'
import { GraphDebugOwner, type GraphDebugWorld } from '../runtime/graphDebugOwner'
import type { GameplayScriptServices } from '../runtime/scriptServices'
import { getLegacyGraphDebugRawState, installLegacyGraphDebugPort } from '../visual/graphDebugger'
const stateView=reactive(getLegacyGraphDebugRawState())
export function createEditorGraphDebugOwner(world: GraphDebugWorld, catalog: GameplayScriptServices, options: {legacyRoot:boolean}): GraphDebugOwner {
  return new GraphDebugOwner(world,catalog,{nowMilliseconds:()=>performance.now()},options.legacyRoot?stateView:undefined)
}
export function installEditorGraphDebugOwnerProvider(getOwner:()=>GraphDebugOwner): void {
  installLegacyGraphDebugPort({stateView,unwrapState:toRaw,getOwner})
}
