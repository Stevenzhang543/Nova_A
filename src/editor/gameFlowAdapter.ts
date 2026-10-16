/** Temporary single-root Editor composition. Import installs only a view/provider.
 * Recreating for a new World retains the original shared legacy view/pause history;
 * this bridge does not provide independent concurrent Editor Worlds. */
import { reactive, toRaw } from 'vue'
import { physicsState, sceneManager } from '../store/physics'
import { GameFlowOwner } from '../runtime/gameFlowOwner'
import { getLegacyGameFlowRawState, installLegacyGameFlowPort } from '../runtime/gameFlow'

const stateView = reactive(getLegacyGameFlowRawState())
let owner: GameFlowOwner | null = null

export function getEditorGameFlowOwner(): GameFlowOwner {
  const world = physicsState.world
  if (!owner || owner.world !== world) {
    const requireCapturedWorld = () => {
      if (physicsState.world !== world) throw new Error('GAME_FLOW_WORLD_CHANGED: Use the recreated runtime host for the current World.')
    }
    const host = { world,
      get settings() { requireCapturedWorld(); return physicsState.globalSettings },
      get activeSceneUuid() { requireCapturedWorld(); return sceneManager.activeSceneUuid }
    }
    owner = owner ? owner.rebindLegacySingleRootHost(host) : new GameFlowOwner(host, stateView)
  }
  return owner
}

installLegacyGameFlowPort({ stateView, unwrapState: toRaw, getOwner: getEditorGameFlowOwner })
