import type { Entity } from '../world/Entity'
import type { InputSnapshot } from './input'
import { packageEnabled, OFFICIAL_NETWORKING_PACKAGE_ID } from './packages'
import { productionSettings } from './production'
import { reportRecoverableError } from './faultCenter'

type NetworkingModule = typeof import('./networking')
let networking: NetworkingModule | null = null
let loading: Promise<void> | null = null
let lifecycleGeneration = 0
const rpcListeners = new Set<(name: string, payload: unknown, context: { sender: string; tick: number }) => void>()
let rpcCleanups: Array<() => void> = []

function bindRpcHandlers(module: NetworkingModule): void {
  for (const cleanup of rpcCleanups) cleanup()
  rpcCleanups = productionSettings.networking.rpcContracts.map(contract => module.registerRpc(contract.name, (payload, context) => {
    for (const listener of rpcListeners) listener(contract.name, payload, context)
  }))
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
export async function stopProductionNetworking(): Promise<void> {
  lifecycleGeneration++
  const active = networking
  networking = null; loading = null; for (const cleanup of rpcCleanups) cleanup(); rpcCleanups = []
  if (active) await active.stopNetworking()
}

export function updateProductionRuntime(entities: Entity[], fixedDelta: number, input?: InputSnapshot, physicsChecksum = ''): void { networking?.updateNetworking(entities, fixedDelta, input, physicsChecksum) }
export function stopProductionRuntime(): void {
  lifecycleGeneration++
  loading = null
  const active = networking
  networking = null
  for (const cleanup of rpcCleanups) cleanup(); rpcCleanups = []
  if (active) void active.stopNetworking().catch(error => reportRecoverableError(error, 'Optional networking shutdown', 'Runtime'))
}
