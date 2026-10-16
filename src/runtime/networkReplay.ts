/** Compatibility facade; the Editor registers its one explicit legacy Owner. */
import type { Entity } from '../world/Entity'
import { MultiplayerReplayOwner, createInitialMultiplayerReplayState } from './multiplayerReplayOwner'
import type { MultiplayerReplayFrame, MultiplayerInputFrame, MultiplayerReplayDocument, MultiplayerReplayComparison, MultiplayerReplayPlayback, MultiplayerSaveDocument } from './multiplayerReplayOwner'
export type { MultiplayerInputFrame, MultiplayerReplayFrame, MultiplayerReplayDocument, MultiplayerSaveDocument, MultiplayerReplayComparison, MultiplayerReplayPlayback } from './multiplayerReplayOwner'
const rawState=createInitialMultiplayerReplayState()
export let multiplayerReplayState=rawState
export function getLegacyMultiplayerReplayOwnerRawState(){return rawState}
let provider:(()=>MultiplayerReplayOwner)|null=null
export function installLegacyMultiplayerReplayOwnerPort(port:{getOwner:()=>MultiplayerReplayOwner;stateView:typeof rawState}):void { multiplayerReplayState=port.stateView;provider=port.getOwner }
export function requireLegacyMultiplayerReplayOwner():MultiplayerReplayOwner {if(!provider)throw new Error('LEGACY_NETWORK_OWNER_REQUIRED: Install the Editor network bridge.');return provider()}
export function beginMultiplayerReplayRecording(peers: string[] = []): void { return requireLegacyMultiplayerReplayOwner().beginMultiplayerReplayRecording(peers) }
export function recordMultiplayerReplayFrame(tick: number, inputs: MultiplayerInputFrame[], authoritativeChecksum: string, packetSummary: unknown): void { return requireLegacyMultiplayerReplayOwner().recordMultiplayerReplayFrame(tick, inputs, authoritativeChecksum, packetSummary) }
export function stopMultiplayerReplayRecording(tickRate: number): MultiplayerReplayDocument { return requireLegacyMultiplayerReplayOwner().stopMultiplayerReplayRecording(tickRate) }
export function normalizeMultiplayerReplay(value: unknown): MultiplayerReplayDocument { return requireLegacyMultiplayerReplayOwner().normalizeMultiplayerReplay(value) }
export function compareMultiplayerReplays(firstValue: unknown, secondValue: unknown): MultiplayerReplayComparison { return requireLegacyMultiplayerReplayOwner().compareMultiplayerReplays(firstValue, secondValue) }
export function playbackMultiplayerReplay(value: unknown, applyFrame: (frame: Readonly<MultiplayerReplayFrame>) => void): MultiplayerReplayPlayback { return requireLegacyMultiplayerReplayOwner().playbackMultiplayerReplay(value, applyFrame) }
export function exportMultiplayerSave(entities: Entity[], tick: number): MultiplayerSaveDocument { return requireLegacyMultiplayerReplayOwner().exportMultiplayerSave(entities, tick) }
export function importMultiplayerSave(value: unknown, entities: Entity[], propertyMasks?: ReadonlyMap<string, readonly string[]>): { tick: number; restored: number } { return requireLegacyMultiplayerReplayOwner().importMultiplayerSave(value, entities, propertyMasks) }
export function networkDiagnosticCapture(state: Record<string, unknown>, events: unknown[], packetSummaries: unknown[]): string { return requireLegacyMultiplayerReplayOwner().networkDiagnosticCapture(state, events, packetSummaries) }
