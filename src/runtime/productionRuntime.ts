/** 生产配置运行桥接：把项目制作数据应用到运行会话并提供状态查询。 */
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
let rpcBindingSignature = ''
const sceneHandoffListeners = new Set<(sceneUuid: string, spawnTag: string, peerId: string) => void>()
let sceneHandoffCleanup: (() => void) | null = null

export interface ProductionRemoteInputFrame {
  readonly peerId: string
  readonly tick: number
  readonly input: InputSnapshot
  readonly targetEntityUuids: readonly string[]
}

const remoteInputListeners = new Set<(frame: ProductionRemoteInputFrame) => void>()

/** 结构说明（自动提取）：dispatchRemoteInputs；输入 module；直接调用 module.drainRemoteInputs、slice、raw.peerId.trim、Number.isSafeInteger、Math.max 等；包含循环处理。 */ function dispatchRemoteInputs(module: NetworkingModule): void {
  for (const raw of module.drainRemoteInputs(64)) {
    const peerId = raw.peerId.trim().slice(0, 80)
    const tick = Number.isSafeInteger(raw.tick) ? Math.max(0, Math.min(0x7fff_ffff, raw.tick)) : 0
    const targetEntityUuids = [...new Set(raw.targetEntityUuids
      .filter(/* 比较 typeof uuid 与 'string'，返回严格相等的判断结果。 */ (uuid): uuid is string => typeof uuid === 'string')
      .map(/* 调用 uuid.trim().slice(0, 128) 并返回调用结果。 */ uuid => uuid.trim().slice(0, 128))
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

/** 结构说明（自动提取）：bindRpcHandlers；输入 module；直接调用 JSON.stringify、productionSettings.networking.rpcContracts.map、cleanup、sceneHandoffCleanup、module.registerNetworkSceneHandoff；写入 rpcBindingSignature、rpcCleanups、sceneHandoffCleanup；包含循环处理。 */ function bindRpcHandlers(module: NetworkingModule): void {
  rpcBindingSignature = JSON.stringify(productionSettings.networking.rpcContracts.map(/* 返回 contract.name 的当前值。 */ contract => contract.name))
  for (const cleanup of rpcCleanups) cleanup()
  rpcCleanups = productionSettings.networking.rpcContracts.map(/** 结构说明（自动提取）：productionSettings.networking.rpcContracts.map 回调；输入 contract；直接调用 module.registerRpc；返回表达式求值结果。 */ contract => module.registerRpc(contract.name, /** 结构说明（自动提取）：module.registerRpc 回调；输入 payload、context；直接调用 listener；包含循环处理。 */ (payload, context) => {
    for (const listener of rpcListeners) listener(contract.name, payload, context)
  }))
  sceneHandoffCleanup?.()
  sceneHandoffCleanup = module.registerNetworkSceneHandoff(/** 结构说明（自动提取）：module.registerNetworkSceneHandoff 回调；输入 sceneUuid、spawnTag、peerId；直接调用 listener；包含循环处理。 */ (sceneUuid, spawnTag, peerId) => { for (const listener of sceneHandoffListeners) listener(sceneUuid, spawnTag, peerId) })
}

/** 结构说明（自动提取）：loadNetworkingModule；无显式参数；直接调用 packageEnabled、Error、finally、catch、then；写入 loading；返回路径包含 networking；等待异步结果；包含显式抛错路径。 */ async function loadNetworkingModule(): Promise<NetworkingModule> {
  if (!packageEnabled(OFFICIAL_NETWORKING_PACKAGE_ID)) throw new Error('The optional Nova Networking package is not installed.')
  if (networking) return networking
  if (loading) { await loading; if (!networking) throw new Error('Networking did not finish loading.'); return networking }
  const generation = ++lifecycleGeneration
  loading = import('./networking')
    .then(/** 结构说明（自动提取）：then 回调；输入 module；直接调用 bindRpcHandlers；写入 networking。 */ module => {
      if (generation !== lifecycleGeneration) return
      networking = module
      bindRpcHandlers(module)
    })
    .catch(/** 结构说明（自动提取）：catch 回调；输入 error；直接调用 reportRecoverableError；写入 networking。 */ error => {
      networking = null
      reportRecoverableError(error, 'Optional networking startup', 'Runtime')
    })
    .finally(/** 结构说明（自动提取）：finally 回调；无显式参数；写入 loading。 */ () => {
      if (generation === lifecycleGeneration) loading = null
    })
  await loading
  if (!networking) throw new Error('Networking could not be loaded.')
  return networking
}

/** 结构说明（自动提取）：ensureNetworking；输入 start；直接调用 Error、loadNetworkingModule、bindRpcHandlers、module.startNetworking；返回路径包含 module；等待异步结果；包含显式抛错路径。 */ async function ensureNetworking(start: boolean): Promise<NetworkingModule> {
  if (!productionSettings.networking.enabled) throw new Error('Networking is disabled for this project.')
  if (!productionSettings.networking.permissionGranted) throw new Error('Network permission has not been granted.')
  const module = await loadNetworkingModule()
  bindRpcHandlers(module)
  if (start) await module.startNetworking()
  return module
}

/** 结构说明（自动提取）：beginProductionRuntime；无显式参数；直接调用 packageEnabled、ensureNetworking。 */ export function beginProductionRuntime(): void {
  if (!productionSettings.networking.enabled || !productionSettings.networking.permissionGranted || !productionSettings.networking.autoStart || !packageEnabled(OFFICIAL_NETWORKING_PACKAGE_ID) || loading || networking) return
  void ensureNetworking(true)
}

/* 调用 ensureNetworking(true) 并返回调用结果。 */ export async function startProductionNetworking(): Promise<NetworkingModule> { return ensureNetworking(true) }
/* 调用 loadNetworkingModule() 并返回调用结果。 */ export async function networkingModule(): Promise<NetworkingModule> { return loadNetworkingModule() }
/** 结构说明（自动提取）：productionNetworkContext；无显式参数。 */ export function productionNetworkContext(): { enabled: boolean; connected: boolean; authority: boolean; peerCount: number; localPeerId: string; role: string; tick: number } {
  const state = networking?.networkingState
  return { enabled: productionSettings.networking.enabled && productionSettings.networking.permissionGranted, connected: state?.status === 'connected', authority: productionSettings.networking.role === 'server' || productionSettings.networking.role === 'host', peerCount: state?.peers ?? 0, localPeerId: state?.localPeerId ?? '', role: productionSettings.networking.role, tick: state?.currentTick ?? 0 }
}
/* 当 networking?.callRpc(name, payload) 为 null 或 undefined 时返回 false，否则保留左侧值。 */ export function callProductionRpc(name: string, payload: unknown): boolean { return networking?.callRpc(name, payload) ?? false }
/** 结构说明（自动提取）：onProductionRpc；输入 listener；直接调用 rpcListeners.add。 */ export function onProductionRpc(listener: (name: string, payload: unknown, context: { sender: string; tick: number }) => void): () => void { rpcListeners.add(listener); return /* 调用 rpcListeners.delete(listener) 并返回调用结果。 */ () => rpcListeners.delete(listener) }
/** 结构说明（自动提取）：onProductionSceneHandoff；输入 listener；直接调用 sceneHandoffListeners.add。 */ export function onProductionSceneHandoff(listener: (sceneUuid: string, spawnTag: string, peerId: string) => void): () => void { sceneHandoffListeners.add(listener); return /* 调用 sceneHandoffListeners.delete(listener) 并返回调用结果。 */ () => sceneHandoffListeners.delete(listener) }
/** 结构说明（自动提取）：onProductionRemoteInput；输入 listener；直接调用 Error、remoteInputListeners.add；包含显式抛错路径。 */ export function onProductionRemoteInput(listener: (frame: ProductionRemoteInputFrame) => void): () => void {
  if (remoteInputListeners.size >= 32) throw new Error('Remote gameplay input listener limit reached.')
  remoteInputListeners.add(listener)
  return /* 调用 remoteInputListeners.delete(listener) 并返回调用结果。 */ () => remoteInputListeners.delete(listener)
}
/** 结构说明（自动提取）：stopProductionNetworking；无显式参数；直接调用 cleanup、sceneHandoffCleanup、active.stopNetworking；写入 networking、loading、rpcCleanups、sceneHandoffCleanup；包含循环处理；等待异步结果。 */ export async function stopProductionNetworking(): Promise<void> {
  lifecycleGeneration++
  const active = networking
  networking = null; loading = null; for (const cleanup of rpcCleanups) cleanup(); rpcCleanups = []; sceneHandoffCleanup?.(); sceneHandoffCleanup = null
  if (active) await active.stopNetworking()
}

/** 结构说明（自动提取）：updateProductionRuntime；输入 entities、fixedDelta、input、physicsChecksum；直接调用 JSON.stringify、productionSettings.networking.rpcContracts.map、bindRpcHandlers、networking.updateNetworking、dispatchRemoteInputs。 */ export function updateProductionRuntime(entities: Entity[], fixedDelta: number, input?: InputSnapshot, physicsChecksum = ''): void {
  if (!networking) return
  if (rpcBindingSignature !== JSON.stringify(productionSettings.networking.rpcContracts.map(/* 返回 contract.name 的当前值。 */ contract => contract.name))) bindRpcHandlers(networking)
  networking.updateNetworking(entities, fixedDelta, input, physicsChecksum)
  dispatchRemoteInputs(networking)
}
/** 结构说明（自动提取）：stopProductionRuntime；无显式参数；直接调用 cleanup、sceneHandoffCleanup、catch、active.stopNetworking；写入 loading、networking、rpcCleanups、sceneHandoffCleanup；包含循环处理。 */ export function stopProductionRuntime(): void {
  lifecycleGeneration++
  loading = null
  const active = networking
  networking = null
  for (const cleanup of rpcCleanups) cleanup(); rpcCleanups = []
  sceneHandoffCleanup?.(); sceneHandoffCleanup = null
  if (active) void active.stopNetworking().catch(/* 调用 reportRecoverableError(error, 'Optional networking shutdown', 'Runtime') 并返回调用结果。 */ error => reportRecoverableError(error, 'Optional networking shutdown', 'Runtime'))
}
