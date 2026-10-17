/** Legacy replay API. Only the Editor composition installs the live view and fixed-world owner. */
import type { InputSnapshot } from './input'
import { createInitialReplayState, ReplayOwner } from './replayOwner'
import type { ReplayDocument, ReplayState } from './replayOwner'
export type { ReplayDocument, ReplayFrame } from './replayOwner'
const rawState = createInitialReplayState(0)
export let replayState: ReplayState = rawState
interface LegacyReplayPort { stateView: ReplayState; unwrapState(value: ReplayState): unknown; getOwner(): ReplayOwner }
let legacyPort: LegacyReplayPort | null = null
export function getLegacyReplayRawState(): ReplayState { return rawState }
export function installLegacyReplayPort(port: LegacyReplayPort): void {
  if (!port || port.unwrapState(port.stateView) !== rawState || typeof port.getOwner !== 'function') throw new Error('LEGACY_REPLAY_PORT_INVALID')
  if (legacyPort && legacyPort !== port) throw new Error('LEGACY_REPLAY_PORT_ALREADY_INSTALLED')
  legacyPort = port; replayState = port.stateView
}
export function requireLegacyReplayOwner(): ReplayOwner {
  if (!legacyPort) throw new Error('LEGACY_REPLAY_OWNER_REQUIRED: Install the explicit Editor replay composition.')
  const owner = legacyPort.getOwner()
  if (!(owner instanceof ReplayOwner) || owner.state !== replayState) throw new Error('LEGACY_REPLAY_OWNER_INVALID')
  return owner
}
export function resetDeterministicSeed(seed?: number): void { requireLegacyReplayOwner().resetDeterministicSeed(seed) }
export function deterministicRandom(): number { return requireLegacyReplayOwner().deterministicRandom() }
export function startReplayRecording(initialProject: string, tickRate: number): void { requireLegacyReplayOwner().startReplayRecording(initialProject, tickRate) }
export function stopReplay(): void { requireLegacyReplayOwner().stopReplay() }
export function startReplayPlayback(document: ReplayDocument): string { return requireLegacyReplayOwner().startReplayPlayback(document) }
export function replayFixedInput(live: InputSnapshot): InputSnapshot { return requireLegacyReplayOwner().replayFixedInput(live) }
export function completeReplayFixedStep(physicsChecksum: string): void { requireLegacyReplayOwner().completeReplayFixedStep(physicsChecksum) }
export function exportReplay(tickRate: number): ReplayDocument { return requireLegacyReplayOwner().exportReplay(tickRate) }
export function normalizeReplayDocument(value: unknown): ReplayDocument { return requireLegacyReplayOwner().normalizeReplayDocument(value) }
