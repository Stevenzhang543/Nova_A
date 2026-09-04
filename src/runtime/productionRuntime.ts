import type { Entity } from '../world/Entity'
import type { InputSnapshot } from './input'
import { cloneNetworkInput } from './networkInput'
import { packageEnabled, OFFICIAL_NETWORKING_PACKAGE_ID } from './packages'
import { productionSettings } from './production'
import { reportRecoverableError } from './faultCenter'

type NetworkingModule = typeof import('./networking')
let networking: NetworkingModule | null = null
let loading: Promise<void> | null = null
let lifecycleGeneration = 0
const rpcListeners = new Set<(name: string, payload: unknown, context: { sender: string; tick: number }) => void>()
let rpcCleanups: Array<() => void> = []
const sceneHandoffListeners = new Set<(sceneUuid: string, spawnTag: string, peerId: string) => void>()
let sceneHandoffCleanup: (() => void) | null = null

export interface ProductionRemoteInputFrame {
  readonly peerId: string
  readonly tick: number
  readonly input: InputSnapshot
  readonly targetEntityUuids: readonly string[]
}

const remoteInputListeners = new Set<(frame: ProductionRemoteInputFrame) => void>()

function dispatchRemoteInputs(module: NetworkingModule): void {
  for (const raw of module.drainRemoteInputs(64)) {
    const peerId = raw.peerId.trim().slice(0, 80)
    const tick = Number.isSafeInteger(raw.tick) ? Math.max(0, Math.min(0x7fff_ffff, raw.tick)) : 0
    const targetEntityUuids = [...new Set(raw.targetEntityUuids
      .filter((uuid): uuid is string => typeof uuid === 'string')
      .map(uuid => uuid.trim().slice(0, 128))
      .filter(Boolean))]
      .slice(0, 2_000)
      .sort()
    if (!peerId || !targetEntityUuids.length) continue
    for (const listener of remoteInputListeners) {
      try {
        listener(Object.freeze({ peerId, tick, input: cloneNetworkInput(raw.input), targetEntityUuids: Object.freeze([...targetEntityUuids]) }))
      } catch (error) {
        reportRecoverableError(error, 'Remote gameplay input listener', 'Runtime')
      }
    }
  }
}

function bindRpcHandlers(module: NetworkingModule): void {
  for (const cleanup of rpcCleanups) cleanup()
  rpcCleanups = productionSettings.networking.rpcContracts.map(contract => module.registerRpc(contract.name, (payload, context) => {
    for (const listener of rpcListeners) listener(contract.name, payload, context)
  }))
  sceneHandoffCleanup?.()
  sceneHandoffCleanup = module.registerNetworkSceneHandoff((sceneUuid, spawnTag, peerId) => { for (const listener of sceneHandoffListeners) listener(sceneUuid, spawnTag, peerId) })
}

async function loadNetworkingModule(): Promise<NetworkingModule> {
  if (!packageEnabled(OFFICIAL_NETWORKING_PACKAGE_ID)) throw new Error('The optional Nova Networking package is not installed.')
  if (networking) return networking
  if (loading) { await loading; if (!networking) throw new Error('Networking did not finish loading.'); return networking }
  const generation = ++lifecycleGeneration
  loading = import('./networking')
    .then(module => {
      if (generation !== lifecycleGeneration) return
      networking = module
      bindRpcHandlers(module)
    })
    .catch(error => {
      networking = null
      reportRecoverableError(error, 'Optional networking startup', 'Runtime')
    })
    .finally(() => {
      if (generation === lifecycleGeneration) loading = null
    })
  await loading
  if (!networking) throw new Error('Networking could not be loaded.')
  return networking
}

async function ensureNetworking(start: boolean): Promise<NetworkingModule> {
  if (!productionSettings.networking.enabled) throw new Error('Networking is disabled for this project.')
  if (!productionSettings.networking.permissionGranted) throw new Error('Network permission has not been granted.')
  const module = await loadNetworkingModule()
  bindRpcHandlers(module)
  if (start) await module.startNetworking()
  return module
}

export function beginProductionRuntime(): void {
  if (!productionSettings.networking.enabled || !productionSettings.networking.permissionGranted || !productionSettings.networking.autoStart || !packageEnabled(OFFICIAL_NETWORKING_PACKAGE_ID) || loading || networking) return
  void ensureNetworking(true)
}

export async function startProductionNetworking(): Promise<NetworkingModule> { return ensureNetworking(true) }
export async function networkingModule(): Promise<NetworkingModule> { return loadNetworkingModule() }
export function productionNetworkContext(): { enabled: boolean; connected: boolean; authority: boolean; peerCount: number; localPeerId: string; role: string; tick: number } {
  const state = networking?.networkingState
  return { enabled: productionSettings.networking.enabled && productionSettings.networking.permissionGranted, connected: state?.status === 'connected', authority: productionSettings.networking.role === 'server' || productionSettings.networking.role === 'host', peerCount: state?.peers ?? 0, localPeerId: state?.localPeerId ?? '', role: productionSettings.networking.role, tick: state?.currentTick ?? 0 }
}
export function callProductionRpc(name: string, payload: unknown): boolean { return networking?.callRpc(name, payload) ?? false }
export function onProductionRpc(listener: (name: string, payload: unknown, context: { sender: string; tick: number }) => void): () => void { rpcListeners.add(listener); return () => rpcListeners.delete(listener) }
export function onProductionSceneHandoff(listener: (sceneUuid: string, spawnTag: string, peerId: string) => void): () => void { sceneHandoffListeners.add(listener); return () => sceneHandoffListeners.delete(listener) }
export function onProductionRemoteInput(listener: (frame: ProductionRemoteInputFrame) => void): () => void {
  if (remoteInputListeners.size >= 32) throw new Error('Remote gameplay input listener limit reached.')
  remoteInputListeners.add(listener)
  return () => remoteInputListeners.delete(listener)
}
export async function stopProductionNetworking(): Promise<void> {
  lifecycleGeneration++
  const active = networking
  networking = null; loading = null; for (const cleanup of rpcCleanups) cleanup(); rpcCleanups = []; sceneHandoffCleanup?.(); sceneHandoffCleanup = null
  if (active) await active.stopNetworking()
}

export function updateProductionRuntime(entities: Entity[], fixedDelta: number, input?: InputSnapshot, physicsChecksum = ''): void {
  if (!networking) return
  networking.updateNetworking(entities, fixedDelta, input, physicsChecksum)
  dispatchRemoteInputs(networking)
}
export function stopProductionRuntime(): void {
  lifecycleGeneration++
  loading = null
  const active = networking
  networking = null
  for (const cleanup of rpcCleanups) cleanup(); rpcCleanups = []
  sceneHandoffCleanup?.(); sceneHandoffCleanup = null
  if (active) void active.stopNetworking().catch(error => reportRecoverableError(error, 'Optional networking shutdown', 'Runtime'))
}
