/** Compatibility facade; the Editor registers its one explicit legacy Owner. */
import type { Entity } from '../world/Entity'
import type { InputSnapshot } from './input'
import { NetworkSessionOwner, createInitialNetworkingState } from './networkSessionOwner'
import type { NetworkPacket } from './networkProtocol'
import type { NetworkTransport, RemoteNetworkInputFrame } from './networkSessionContracts'
import type { MultiplayerSaveDocument } from './multiplayerReplayOwner'
export { NETWORKING_PACKAGE_GATE } from './networkSessionOwner'
export type { NetworkTransport, NetworkRpcContract, NetworkReplicationContract, NetworkPredictionContract, NetworkHeadlessContract, NetworkDiagnosticsContract, RemoteNetworkInputFrame } from './networkSessionContracts'
const rawState=createInitialNetworkingState()
export let networkingState=rawState
export function getLegacyNetworkSessionOwnerRawState(){return rawState}
let provider:(()=>NetworkSessionOwner)|null=null
export function installLegacyNetworkSessionOwnerPort(port:{getOwner:()=>NetworkSessionOwner;stateView:typeof rawState}):void { networkingState=port.stateView;provider=port.getOwner }
export function requireLegacyNetworkSessionOwner():NetworkSessionOwner {if(!provider)throw new Error('LEGACY_NETWORK_OWNER_REQUIRED: Install the Editor network bridge.');return provider()}
export async function sendNetworkPacket(kind: NetworkPacket['kind'], payload: unknown, channelId: string, target = ''): Promise<boolean> { return requireLegacyNetworkSessionOwner().sendNetworkPacket(kind, payload, channelId, target) }
export function startNetworking(): Promise<void> { return requireLegacyNetworkSessionOwner().startNetworking() }
export async function stopNetworking(disableState = true): Promise<void> { return requireLegacyNetworkSessionOwner().stopNetworking(disableState) }
export function updateNetworking(entities: Entity[], fixedDelta: number, input?: InputSnapshot, physicsChecksum = ''): void { return requireLegacyNetworkSessionOwner().updateNetworking(entities, fixedDelta, input, physicsChecksum) }
export function registerRpc(name: string, handler: (payload: unknown, context: { sender: string; tick: number }) => void): () => void { return requireLegacyNetworkSessionOwner().registerRpc(name, handler) }
export function callRpc(name: string, payload: unknown): boolean { return requireLegacyNetworkSessionOwner().callRpc(name, payload) }
export function setNetworkInterest(center: [number, number], radius?:number, sceneUuid = ''): boolean { return requireLegacyNetworkSessionOwner().setNetworkInterest(center, radius, sceneUuid) }
export function transferNetworkAuthority(entityUuid: string, targetPeerId: string): boolean { return requireLegacyNetworkSessionOwner().transferNetworkAuthority(entityUuid, targetPeerId) }
export function handoffNetworkScene(targetPeerId: string, sceneUuid: string, spawnTag = ''): boolean { return requireLegacyNetworkSessionOwner().handoffNetworkScene(targetPeerId, sceneUuid, spawnTag) }
export function registerNetworkSceneHandoff(handler: (sceneUuid: string, spawnTag: string, peerId: string) => void | Promise<void>): () => void { return requireLegacyNetworkSessionOwner().registerNetworkSceneHandoff(handler) }
export function consumeRemoteInput(peerId: string, targetTick?:number): InputSnapshot | null { return requireLegacyNetworkSessionOwner().consumeRemoteInput(peerId, targetTick) }
export function drainRemoteInputs(maxFrames = 64): RemoteNetworkInputFrame[] { return requireLegacyNetworkSessionOwner().drainRemoteInputs(maxFrames) }
export function rollbackSnapshot(targetTick: number): boolean { return requireLegacyNetworkSessionOwner().rollbackSnapshot(targetTick) }
export function multiplayerSave(): MultiplayerSaveDocument { return requireLegacyNetworkSessionOwner().multiplayerSave() }
export function restoreMultiplayerSave(value: unknown): { tick: number; restored: number } { return requireLegacyNetworkSessionOwner().restoreMultiplayerSave(value) }
export function captureNetworkDiagnostics(): string { return requireLegacyNetworkSessionOwner().captureNetworkDiagnostics() }
export function networkRuntimeSnapshot(): Readonly<{ tick: number; localHistory: number; remoteInputs: number; reliablePending: number; owners: number; interestViews: number; rollbackEntries: number; replicationDiffs: number }> { return requireLegacyNetworkSessionOwner().networkRuntimeSnapshot() }
export async function startNetworkingWithTransport(testTransport: NetworkTransport): Promise<void> { return requireLegacyNetworkSessionOwner().startNetworkingWithTransport(testTransport) }
