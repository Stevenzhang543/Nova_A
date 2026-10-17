/** Temporary pure single-root facade. Explicit Runtime callers receive AiOwner.
 * Exit when remaining Editor readers use their composed fixed-World Owner. */
import type { Entity } from '../world/Entity'
import { createInitialAiDiagnostics, type AiDiagnostics, type AiOwner } from './aiOwner'
import type { BlackboardValue } from './aiDocuments'
export { normalizeBehaviorTree, normalizeStateMachine, perceptionSpatialCellSize, MAX_AI_AGENTS, MAX_AI_TICKS_PER_FRAME, MAX_PERCEPTION_RESULTS } from './aiDocuments'
export type { BlackboardValue, BehaviorNodeType, BehaviorNode, BehaviorPerceptionSensor, BehaviorTreeDocument, StateMachineDocument } from './aiDocuments'

const rawDiagnostics = createInitialAiDiagnostics()
export let aiDebugState: AiDiagnostics = rawDiagnostics
let ownerGetter: (() => AiOwner) | null = null
export function getLegacyAiRawDiagnostics(): AiDiagnostics { return rawDiagnostics }
export interface LegacyAiPort { stateView: AiDiagnostics; unwrapState(state: AiDiagnostics): AiDiagnostics; getOwner(): AiOwner }
/** Only register the same raw view/provider; never invoke World access during installation. */
export function installLegacyAiPort(port: LegacyAiPort): void {
  if (!port || typeof port.getOwner !== 'function' || typeof port.unwrapState !== 'function') throw new Error('AI_LEGACY_PORT_REQUIRED: Supply the complete lazy same-raw port.')
  if (port.unwrapState(port.stateView) !== rawDiagnostics) throw new Error('AI_SAME_RAW_REQUIRED: Wrap the original diagnostics.')
  if (ownerGetter) {
    if (port.stateView !== aiDebugState || port.getOwner !== ownerGetter) throw new Error('AI_LEGACY_PORT_ALREADY_INSTALLED: Use the unique Editor composition.')
    return
  }
  aiDebugState = port.stateView; ownerGetter = port.getOwner
}
export function requireLegacyAiOwner(): AiOwner {
  if (!ownerGetter) throw new Error('AI_LEGACY_PORT_REQUIRED: Install the Editor composition or receive an explicit Owner.')
  const owner = ownerGetter()
  if (!owner || owner.diagnostics !== aiDebugState) throw new Error('AI_SAME_RAW_REQUIRED: The legacy Owner must use the registered view.')
  return owner
}
export let emitAiSignal: (name: string, entity: Entity) => void = (name, entity) => { const emitter = requireLegacyAiOwner().emitAiSignal; emitter(name, entity) }
export function setAiSignalEmitter(emitter: typeof emitAiSignal): void { requireLegacyAiOwner().setAiSignalEmitter(emitter) }
export function notifyAiSignal(name: string): void { requireLegacyAiOwner().notifyAiSignal(name) }
export function updateAi(entities: Entity[], dt: number, frame: number): void { requireLegacyAiOwner().updateAi(entities, dt, frame) }
export function blackboardSnapshot(entityUuid: string): Record<string, BlackboardValue> { return requireLegacyAiOwner().blackboardSnapshot(entityUuid) }
export function setBlackboardValue(entityUuid: string, key: string, value: BlackboardValue): void { requireLegacyAiOwner().setBlackboardValue(entityUuid, key, value) }
export function retireAiEntity(uuid: string): void { requireLegacyAiOwner().retireAiEntity(uuid) }
export function resetAi(): void { requireLegacyAiOwner().resetAi() }
