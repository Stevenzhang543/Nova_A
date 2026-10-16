/** Single-root Editor view; foreign games get a fresh plain fixed-World Replay Owner. */
import { reactive, toRaw } from 'vue'
import { physicsState } from '../store/physics'
import { productionSettings } from '../runtime/production'
import { ReplayOwner } from '../runtime/replayOwner'
import type { ReplayWorld, ReplaySettings } from '../runtime/replayOwner'
import { getLegacyReplayRawState, installLegacyReplayPort } from '../runtime/replay'
const raw = getLegacyReplayRawState()
// Match the original module initialization seed without constructing a World or invoking a provider.
raw.seed = productionSettings.replay.seed
const view = reactive(raw)
let legacy: ReplayOwner | null = null
export function createEditorReplayOwner(world: ReplayWorld, options: { legacyRoot: boolean; readReplaySettings(): ReplaySettings }): ReplayOwner {
  const host = { world, readReplaySettings: options.readReplaySettings.bind(options) }
  if (!options.legacyRoot) return new ReplayOwner(host)
  if ((physicsState.world as unknown) !== world) throw new Error('REPLAY_LEGACY_ROOT_REQUIRED')
  if (legacy?.world === world) return legacy
  legacy = legacy ? legacy.rebindLegacySingleRootHost(host) : new ReplayOwner(host, view)
  return legacy
}
export function getEditorReplayOwner(): ReplayOwner {
  const world = physicsState.world
  return createEditorReplayOwner(world, { legacyRoot: true, readReplaySettings() {
    if ((physicsState.world as unknown) !== world) throw new Error('REPLAY_WORLD_CHANGED: Recreate the Core after replacing its World.')
    return productionSettings.replay
  } })
}
installLegacyReplayPort({ stateView: view, unwrapState: toRaw, getOwner: getEditorReplayOwner })
