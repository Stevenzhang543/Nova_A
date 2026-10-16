/** Compatibility facade; the Editor registers its one explicit legacy Owner. */
import type { Entity } from '../world/Entity'
import type { InputSnapshot } from './input'
import { ProductionNetworkOwner } from './productionNetworkOwner'
import type { ProductionRemoteInputFrame } from './productionNetworkOwner'
type NetworkingModule=typeof import('./networking')
export type { ProductionRemoteInputFrame } from './productionNetworkOwner'
let provider:(()=>ProductionNetworkOwner)|null=null
export function installLegacyProductionNetworkOwnerPort(port:{getOwner:()=>ProductionNetworkOwner}):void { provider=port.getOwner }
export function requireLegacyProductionNetworkOwner():ProductionNetworkOwner {if(!provider)throw new Error('LEGACY_NETWORK_OWNER_REQUIRED: Install the Editor network bridge.');return provider()}
export function beginProductionRuntime(): void { return requireLegacyProductionNetworkOwner().beginProductionRuntime() }
export async function startProductionNetworking(): Promise<NetworkingModule> { await requireLegacyProductionNetworkOwner().startProductionNetworking();return import('./networking') }
export async function networkingModule(): Promise<NetworkingModule> { await requireLegacyProductionNetworkOwner().networkingModule();return import('./networking') }
export function productionNetworkContext(): { enabled: boolean; connected: boolean; authority: boolean; peerCount: number; localPeerId: string; role: string; tick: number } { return requireLegacyProductionNetworkOwner().productionNetworkContext() }
export function callProductionRpc(name: string, payload: unknown): boolean { return requireLegacyProductionNetworkOwner().callProductionRpc(name, payload) }
export function onProductionRpc(listener: (name: string, payload: unknown, context: { sender: string; tick: number }) => void): () => void { return requireLegacyProductionNetworkOwner().onProductionRpc(listener) }
export function onProductionSceneHandoff(listener: (sceneUuid: string, spawnTag: string, peerId: string) => void): () => void { return requireLegacyProductionNetworkOwner().onProductionSceneHandoff(listener) }
export function onProductionRemoteInput(listener: (frame: ProductionRemoteInputFrame) => void): () => void { return requireLegacyProductionNetworkOwner().onProductionRemoteInput(listener) }
export async function stopProductionNetworking(): Promise<void> { return requireLegacyProductionNetworkOwner().stopProductionNetworking() }
export function updateProductionRuntime(entities: Entity[], fixedDelta: number, input?: InputSnapshot, physicsChecksum = ''): void { return requireLegacyProductionNetworkOwner().updateProductionRuntime(entities, fixedDelta, input, physicsChecksum) }
export function stopProductionRuntime(): void { return requireLegacyProductionNetworkOwner().stopProductionRuntime() }
