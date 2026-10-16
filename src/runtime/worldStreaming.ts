/** Temporary Editor single-root facade. Pure Hosts supply an explicit fixed-World Owner. */
import type { Entity } from '../world/Entity'
import type { Vec2 } from '../world/types'
import { getLegacyStreamLifecycleOwner, type StreamLifecycleOwner } from './streamLifecycle'
import { WorldStreamingOwner, createInitialWorldStreamingState, type WorldStreamingState, type StreamSceneSetter } from './worldStreamingOwner'
export type { StreamCellStatus, StreamCellSnapshot, StreamEvent, StreamSceneSetter, WorldStreamingState } from './worldStreamingOwner'
interface StreamedEntityState {
  uuid: string
  enabled: boolean
  position: Vec2
  rotation: number
  scale: Vec2
  velocity: Vec2
  angularVelocity: number
}
const rawState = createInitialWorldStreamingState()
export let worldStreamingState: WorldStreamingState = rawState
let ownerGetter: (() => WorldStreamingOwner) | null = null
export function getLegacyWorldStreamingRawState(): WorldStreamingState { return rawState }
export function installLegacyWorldStreamingPort(port: { stateView: WorldStreamingState; unwrapState(state: WorldStreamingState): WorldStreamingState; getOwner(): WorldStreamingOwner }): void {
  if (!port || typeof port.getOwner !== 'function' || typeof port.unwrapState !== 'function') throw new Error('STREAM_LEGACY_PORT_REQUIRED')
  if (port.unwrapState(port.stateView) !== rawState) throw new Error('STREAM_LEGACY_SAME_RAW_REQUIRED')
  if (ownerGetter) { if (ownerGetter !== port.getOwner || worldStreamingState !== port.stateView) throw new Error('STREAM_LEGACY_PORT_ALREADY_INSTALLED'); return }
  worldStreamingState = port.stateView; ownerGetter = port.getOwner
}
export function requireLegacyWorldStreamingOwner(): WorldStreamingOwner {
  if (!ownerGetter) throw new Error('STREAM_LEGACY_PORT_REQUIRED: Install the Editor host or use an explicit Owner.')
  const owner = ownerGetter()
  if (!(owner instanceof WorldStreamingOwner) || owner.state !== worldStreamingState || owner.isDisposed) throw new Error('STREAM_LEGACY_OWNER_MISMATCH')
  return owner
}
export function updateWorldStreaming(entities: Entity[], focus: Vec2, memoryBudgetMb: number, enabled: boolean, setScene: StreamSceneSetter, lifecycle: StreamLifecycleOwner = getLegacyStreamLifecycleOwner()): void { return requireLegacyWorldStreamingOwner().updateWorldStreaming(entities, focus, memoryBudgetMb, enabled, setScene, lifecycle) }
export function handoffStreamedSaveState(cellUuid: string, value: unknown): void { return requireLegacyWorldStreamingOwner().handoffStreamedSaveState(cellUuid, value) }
export function consumeStreamedSaveState(cellUuid: string): unknown { return requireLegacyWorldStreamingOwner().consumeStreamedSaveState(cellUuid) }
export function captureStreamCellState(cellUuid: string, entities: Entity[]): StreamedEntityState[] { return requireLegacyWorldStreamingOwner().captureStreamCellState(cellUuid, entities) }
export function restoreStreamCellState(cellUuid: string, entities: Entity[]): boolean { return requireLegacyWorldStreamingOwner().restoreStreamCellState(cellUuid, entities) }
export function exportWorldStreamingHandoffs(): string { return requireLegacyWorldStreamingOwner().exportWorldStreamingHandoffs() }
export function importWorldStreamingHandoffs(source: string): number { return requireLegacyWorldStreamingOwner().importWorldStreamingHandoffs(source) }
export function peekStreamedSaveState(key: string): unknown { return requireLegacyWorldStreamingOwner().peekStreamedSaveState(key) }
export function cancelWorldStreaming(cellUuid?: string): void { return requireLegacyWorldStreamingOwner().cancelWorldStreaming(cellUuid) }
export function retryWorldStreaming(cellUuid?: string): void { return requireLegacyWorldStreamingOwner().retryWorldStreaming(cellUuid) }
export function shiftStreamingOrigin(offset: Vec2): void { return requireLegacyWorldStreamingOwner().shiftStreamingOrigin(offset) }
export function resetWorldStreaming(preserveHandoffs = false): void { return requireLegacyWorldStreamingOwner().resetWorldStreaming(preserveHandoffs) }
