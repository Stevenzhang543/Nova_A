/** 网络运行核心：管理连接、会话、消息传递、同步状态及断开清理。 */
import { reactive } from 'vue'
import type { Entity } from '../world/Entity'
import { finiteNumber } from '../world/geometry'
import { setWorldTransform, worldTransform } from '../world/hierarchy'
import type { InputSnapshot } from './input'
import { cloneNetworkInput, normalizeNetworkInput } from './networkInput'
import { replayNetworkTransformDeltas } from './networkRollback'
import {
  createNetworkPacket,
  DeterministicNetworkSimulator,
  networkChecksum,
  NetworkRateLimiter,
  parseNetworkPacket,
  ReliablePacketWindow,
  serializeNetworkPacket,
  stableNetworkJson,
  utf8Bytes,
  validatePayloadSchema,
  validateNetworkValue,
  type NetworkPacket
} from './networkProtocol'
import {
  createAuthenticationProof,
  createNetworkEpoch,
  createNetworkNonce,
  createReviewedNetworkTransport,
  entityRelevantToPeer,
  networkAuthenticationProviders,
  networkEncryptionGuidance,
  NetworkAuthorityTable,
  NetworkReplayProtectionWindow,
  NetworkTimeline,
  reviewedNetworkTransports,
  verifyAuthenticationProof,
  type NetworkInterestView,
  type NetworkReplicationDiff,
  type NetworkRollbackEntry,
  type NetworkSecurityEnvelope
} from './networkProduction'
import {
  exportMultiplayerSave,
  importMultiplayerSave,
  networkDiagnosticCapture,
  recordMultiplayerReplayFrame,
  type MultiplayerSaveDocument
} from './networkReplay'
import { productionSettings, type NetworkChannelDefinition, type NetworkRpcDefinition } from './production'
import { openReviewedNetworkService, selectedNetworkServiceIds, type NetworkServiceHandle, type NetworkServiceKind } from './networkServices'

export interface NetworkTransport {
  readonly kind: 'local-loopback' | 'websocket' | 'native-udp' | 'adapter'
  connect(onMessage: (source: string, peer: string) => void, onState: (state: string) => void): Promise<void>
  send(source: string, target?: string): Promise<void>
  close(): Promise<void>
  bindPeer?(peerId: string, endpoint: string): void
  unbindPeer?(peerId: string): void
}

export interface NetworkRpcContract extends NetworkRpcDefinition {}
export interface NetworkReplicationContract { entityUuid: string; authority: 'server' | 'owner'; properties: Array<'transform' | 'rotation' | 'velocity'>; interpolate: boolean; predict: boolean }
export interface NetworkPredictionContract { rollbackFrames: number; interpolationMs: number; reconciliationThreshold: number }
export interface NetworkHeadlessContract { runtimeMode: 'headless-server'; fixedTick: true; renderer: false; roles: readonly ['server', 'host'] }
export interface NetworkDiagnosticsContract { sentBytes: number; receivedBytes: number; droppedPackets: number; pingMs: number | null; predictionCorrections: number; rollbacks: number; divergences: number; reliablePending: number; replayRejected: number; authenticationRejected: number; authorityTransfers: number; interestCulled: number }
export interface RemoteNetworkInputFrame { readonly peerId: string; readonly tick: number; readonly input: InputSnapshot; readonly targetEntityUuids: readonly string[] }

export const NETWORKING_PACKAGE_GATE = Object.freeze({
  maturity: 'supported' as const,
  coreStabilityBlocker: false,
  optionalAndLocalFirst: true,
  protocolVersion: 2,
  requiredSuites: Object.freeze(['security', 'bandwidth', 'packet-fuzz', 'packet-loss', 'two-process-localhost', 'reconnect-late-join', 'divergence', 'headless-build', 'no-implicit-network']),
  passedSuites: Object.freeze(['security', 'bandwidth', 'packet-fuzz', 'packet-loss', 'two-process-localhost', 'reconnect-late-join', 'divergence', 'headless-build', 'no-implicit-network', 'message-bounds', 'schema-bounds', 'secret-exclusion', 'deterministic-link-simulation', 'headless-interface', 'replay-protection', 'authentication-hooks', 'authority-transfer', 'interest-management', 'scene-handoff', 'multi-instance-plan']),
  externalSuites: Object.freeze(['independent-hostile-network-review', 'public-internet-NAT-traversal', 'cross-host-long-soak'])
})

type EntitySnapshot = { uuid: string; position?: [number, number]; rotation?: number; velocity?: [number, number] }
type SnapshotPayload = { entities: EntitySnapshot[]; checksum: string; full: boolean }
type RpcPayload = { name: string; value: unknown }
type HelloPayload = { role: 'client' | 'server' | 'host'; playerName: string; lateJoin: boolean }
type AuthorityPayload = { entityUuid: string; targetPeerId: string }
type InterestPayload = { center: [number, number]; radius: number; sceneUuid: string }
type ScenePayload = { sceneUuid: string; spawnTag: string }
type BaselineChunkPayload = { transferId: string; index: number; count: number; checksum: string; chunk: string }
type BaselineDocument = { format: 'nova-network-baseline'; version: 1; save: MultiplayerSaveDocument; authority: Array<{ entityUuid: string; ownerPeerId: string }>; scenes: Array<{ peerId: string; sceneUuid: string }> }
type DeferredInboundPacket = { packet: NetworkPacket; peer: string }
type PreAdmissionRpc = { payload: RpcPayload; channelId: string; expiresAt: number }

export const networkingState = reactive({
  status: 'disabled' as 'disabled' | 'permission-required' | 'connecting' | 'connected' | 'reconnecting' | 'error',
  transport: '' as '' | NetworkTransport['kind'], transportAdapterId: '', encryptedTransport: false, encryptionMessage: '', sessionMode: 'local' as 'local' | 'direct', sessionId: '', localPeerId: '', peers: 0,
  peerDetails: [] as Array<{ id: string; name: string; role: string; verified: boolean; connectedAt: number; lastSeenAt: number; sceneUuid: string }>,
  sentBytes: 0, receivedBytes: 0, sentPackets: 0, receivedPackets: 0, droppedPackets: 0, invalidPackets: 0, schemaRejected: 0, rateLimited: 0,
  reliableSent: 0, reliableAcknowledged: 0, reliableResent: 0, reliableExpired: 0, reliablePending: 0, duplicatePackets: 0, outOfOrderPackets: 0,
  rpcCalls: 0, rpcRejected: 0, snapshots: 0, inputFrames: 0, lateJoins: 0, rollbacks: 0, replayedInputs: 0, predictionCorrections: 0, divergences: 0,
  snapshotPageEntities: 0, snapshotDeferredEntities: 0,
  lastAppliedSnapshotAt: null as number | null, lastAppliedSnapshotTick: null as number | null, lastAppliedSnapshotPeer: '',
  reconnectAttempts: 0, pingMs: null as number | null, currentTick: 0, bandwidthOutKbps: 0, bandwidthInKbps: 0,
  replayRejected: 0, authenticationRejected: 0, authorityTransfers: 0, interestCulled: 0, sceneHandoffs: 0, disconnectCleanups: 0,
  ownership: [] as Array<{ entityUuid: string; ownerPeerId: string }>,
  peerInterests: [] as NetworkInterestView[],
  rollbackTimeline: [] as NetworkRollbackEntry[],
  replicationDiffs: [] as NetworkReplicationDiff[],
  lastError: '', events: [] as Array<{ at: number; level: 'info' | 'warning' | 'error'; message: string }>,
  channelStats: {} as Record<string, { sent: number; received: number; dropped: number }>,
  packetSummaries: [] as Array<{ direction: 'in' | 'out'; at: number; peer: string; channel: string; kind: string; sequence: number; bytes: number; accepted: boolean }>
})

class LocalLobbyTransport implements NetworkTransport {
  readonly kind = 'local-loopback' as const
  private channel: BroadcastChannel | null = null
  /** 结构说明（自动提取）：connect；输入 onMessage、onState；直接调用 Error、BroadcastChannel、networkSessionId、onState；写入 channel、channel.onmessage、channel.onmessageerror；包含显式抛错路径。 */ async connect(onMessage: (source: string, peer: string) => void, onState: (state: string) => void): Promise<void> {
    if (typeof BroadcastChannel === 'undefined') throw new Error('This runtime does not provide local lobby channels.')
    this.channel = new BroadcastChannel(`nova-a-${networkSessionId()}`)
    this.channel.onmessage = /** 结构说明（自动提取）：匿名回调；输入 event；直接调用 onMessage。 */ event => { const value = event.data as { source?: unknown; peer?: unknown; target?: unknown }; if (typeof value?.source === 'string' && typeof value.peer === 'string' && value.peer !== networkingState.localPeerId && (typeof value.target !== 'string' || !value.target || value.target === networkingState.localPeerId)) onMessage(value.source, value.peer) }
    this.channel.onmessageerror = /* 调用 onState('Local lobby message could not be decoded.') 并返回调用结果。 */ () => onState('Local lobby message could not be decoded.')
    onState('connected')
  }
  /** 结构说明（自动提取）：send；输入 source、target；直接调用 Error、channel.postMessage；包含显式抛错路径。 */ async send(source: string, target = ''): Promise<void> { if (!this.channel) throw new Error('Local lobby is not open.'); this.channel.postMessage({ source, peer: networkingState.localPeerId, target }) }
  /** 结构说明（自动提取）：close；无显式参数；直接调用 channel.close；写入 channel。 */ async close(): Promise<void> { this.channel?.close(); this.channel = null }
}

class WebSocketTransport implements NetworkTransport {
  readonly kind = 'websocket' as const
  private socket: WebSocket | null = null
  private cancelOpening: (() => void) | null = null
  /** 结构说明（自动提取）：connect；输入 onMessage、onState；直接调用 test、Error、Promise；等待异步结果；包含显式抛错路径。 */ async connect(onMessage: (source: string, peer: string) => void, onState: (state: string) => void): Promise<void> {
    if (!/^wss?:\/\//i.test(productionSettings.networking.endpoint)) throw new Error('WebSocket endpoint must begin with ws:// or wss://.')
    await new Promise<void>(/** 结构说明（自动提取）：匿名回调；输入 resolve、reject；直接调用 WebSocket、globalThis.setTimeout；写入 socket、socket.onopen、socket.onmessage、socket.onerror 等。 */ (resolve, reject) => {
      const socket = new WebSocket(productionSettings.networking.endpoint); this.socket = socket
      let settled = false
      /** 握手只完成一次；所有成功、失败和主动停止路径均释放超时。 */
      const finish = (error?: Error): void => {
        if (settled) return
        settled = true; clearTimeout(timeout); this.cancelOpening = null
        if (error) reject(error); else resolve()
      }
      const timeout = globalThis.setTimeout(/** 超时必须拒绝当前握手而非遗留挂起承诺。 */ () => finish(new Error('WebSocket connection timed out.')), 10_000)
      this.cancelOpening = /** 主动停止立刻结束尚未完成的握手。 */ () => finish(new DOMException('WebSocket connection cancelled.', 'AbortError'))
      socket.onopen = /** 结构说明（自动提取）：匿名回调；无显式参数；直接调用 clearTimeout、onState、resolve。 */ () => { if (settled || this.socket !== socket) return; onState('connected'); finish() }
      socket.onmessage = /** 结构说明（自动提取）：匿名回调；输入 event；直接调用 JSON.parse、test、onMessage。 */ event => {
        const source = typeof event.data === 'string' ? event.data : ''
        try {
          const route = JSON.parse(source) as { format?: unknown; version?: unknown; target?: unknown; sender?: unknown; payload?: unknown }
          if (route.format === 'nova-network-route' && route.version === 1 && typeof route.payload === 'string' && route.payload.length <= productionSettings.networking.maximumPacketBytes && typeof route.sender === 'string' && /^[A-Za-z0-9_.-]{1,80}$/.test(route.sender) && (route.target === '' || route.target === networkingState.localPeerId)) { onMessage(route.payload, route.sender); return }
        } catch { /* A one-peer/raw broker remains backwards compatible. */ }
        onMessage(source, 'websocket-peer')
      }
      socket.onerror = /** 结构说明（自动提取）：匿名回调；无显式参数；直接调用 clearTimeout、reject、Error。 */ () => { finish(new Error('WebSocket transport failed.')); if (this.socket === socket) onState('WebSocket transport failed.') }
      socket.onclose = /** 对端握手前关闭时也立即失败，避免等待残留超时。 */ () => { finish(new Error('WebSocket closed before connection completed.')); if (this.socket === socket) onState('closed') }
    })
  }
  /** 结构说明（自动提取）：send；输入 source、target；直接调用 Error、socket.send、stableNetworkJson；包含显式抛错路径。 */ async send(source: string, target = ''): Promise<void> { if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('WebSocket is not connected.'); this.socket.send(target ? stableNetworkJson({ format: 'nova-network-route', version: 1, sender: networkingState.localPeerId, target, payload: source }) : source) }
  /** 结构说明（自动提取）：close；无显式参数；直接调用 socket.close；写入 socket。 */ async close(): Promise<void> { const socket = this.socket; this.socket = null; this.cancelOpening?.(); this.cancelOpening = null; if (socket) { socket.onopen = null; socket.onmessage = null; socket.onerror = null; socket.onclose = null; socket.close(1000, 'Nova_A session stopped') } }
}

class NativeUdpTransport implements NetworkTransport {
  readonly kind = 'native-udp' as const
  private socketId: number | null = null
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private peers = new Map<string, string>()
  /** 结构说明（自动提取）：connect；输入 onMessage、onState；直接调用 Error、invoke、onState、poll；写入 socketId；等待异步结果；包含显式抛错路径。 */ async connect(onMessage: (source: string, peer: string) => void, onState: (state: string) => void): Promise<void> {
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) throw new Error('Native UDP transport is available only in a Nova_A desktop player.')
    const { invoke } = await import('@tauri-apps/api/core')
    this.socketId = await invoke<number>('udp_open', { bindAddress: productionSettings.networking.bindAddress })
    const poll = /** 结构说明（自动提取）：poll；无显式参数；直接调用 invoke、onMessage、onState、String、globalThis.setTimeout；写入 pollTimer；包含循环处理；等待异步结果。 */ async () => {
      if (this.socketId === null) return
      try {
        const packets = await invoke<Array<{ source: string; payload: string }>>('udp_receive', { socketId: this.socketId, maximum: 64 })
        for (const packet of packets) onMessage(packet.payload, packet.source)
      } catch (error) { onState(error instanceof Error ? error.message : String(error)) }
      if (this.socketId !== null) this.pollTimer = globalThis.setTimeout(poll, 8)
    }
    onState('connected'); void poll()
  }
  /** 结构说明（自动提取）：send；输入 source、target；直接调用 Error、productionSettings.networking.endpoint.replace、peers.get、peers.values、slice 等；包含循环处理；等待异步结果；包含显式抛错路径。 */ async send(source: string, target = ''): Promise<void> {
    if (this.socketId === null) throw new Error('UDP socket is not open.')
    const { invoke } = await import('@tauri-apps/api/core')
    const configured = productionSettings.networking.endpoint.replace(/^udp:\/\//i, '')
    const mappedTarget = target ? this.peers.get(target) : undefined
    if (target && !mappedTarget) throw new Error('Native UDP target has not completed bounded peer admission.')
    const targets = mappedTarget ? [mappedTarget] : productionSettings.networking.role === 'client' ? [configured] : [...this.peers.values()]
    for (const destination of [...new Set(targets)].slice(0, productionSettings.networking.maxPeers)) {
      await invoke('udp_admit_peer', { socketId: this.socketId, target: destination })
      await invoke('udp_send', { socketId: this.socketId, target: destination, payload: source })
    }
  }
  /** 结构说明（自动提取）：close；无显式参数；直接调用 clearTimeout、invoke、peers.clear；写入 pollTimer、socketId；等待异步结果。 */ async close(): Promise<void> {
    if (this.pollTimer !== null) clearTimeout(this.pollTimer); this.pollTimer = null
    if (this.socketId !== null) { const { invoke } = await import('@tauri-apps/api/core'); await invoke('udp_close', { socketId: this.socketId }) }
    this.socketId = null; this.peers.clear()
  }
  /** 结构说明（自动提取）：bindPeer；输入 peerId、endpoint；直接调用 peers.set。 */ bindPeer(peerId: string, endpoint: string): void { if (peerId && endpoint && this.peers.size < productionSettings.networking.maxPeers) this.peers.set(peerId, endpoint) }
  /** 结构说明（自动提取）：unbindPeer；输入 peerId；直接调用 peers.get、peers.delete、catch、then。 */ unbindPeer(peerId: string): void {
    const endpoint = this.peers.get(peerId), socketId = this.socketId
    this.peers.delete(peerId)
    if (endpoint && socketId !== null) void import('@tauri-apps/api/core').then(/* 调用 invoke('udp_forget_peer', { socketId, target: endpoint }) 并返回调用结果。 */ ({ invoke }) => invoke('udp_forget_peer', { socketId, target: endpoint })).catch(/* 返回 undefined 的当前值。 */ () => undefined)
  }
}

let transport: NetworkTransport | null = null
let tick = 0, snapshotAccumulator = 0, reconnectTimer: ReturnType<typeof setTimeout> | null = null, simulator = new DeterministicNetworkSimulator(productionSettings.networking.simulation.seed), sessionEpoch = createNetworkEpoch(), connectionGeneration = 0
let budgetStarted = performance.now(), budgetBytes = 0, receiveBudgetStarted = performance.now(), receiveBudgetBytes = 0
let lastEntities: Entity[] = [], lastInput: InputSnapshot | null = null, lastChecksum = ''
const sequenceByChannel = new Map<string, number>(), inboundSequences = new Map<string, number>(), reliableBuffers = new Map<string, Map<number, NetworkPacket>>()
let reliableWindow = new ReliablePacketWindow(productionSettings.networking.maximumPendingReliable)
const outboundRate = new NetworkRateLimiter(), inboundRate = new NetworkRateLimiter(), rpcRate = new NetworkRateLimiter()
const rpcHandlers = new Map<string, (payload: unknown, context: { sender: string; tick: number }) => void>()
const snapshotCursors = new Map<string, number>()
const remoteSnapshots: NetworkPacket[] = [], remoteInputs = new Map<string, Map<number, InputSnapshot>>()
const localHistory: Array<{ tick: number; input: InputSnapshot; checksum: string; snapshot: SnapshotPayload }> = []
const replayProtection = new NetworkReplayProtectionWindow(), authorityTable = new NetworkAuthorityTable(), peerInterests = new Map<string, NetworkInterestView>()
const verifiedPeers = new Set<string>()
const handshakenPeers = new Set<string>()
const peerSources = new Map<string, string>()
const peerEpochs = new Map<string, string>()
const retiredPeerEpochs = new Map<string, number>()
/** 结构说明（自动提取）：pruneRetiredEpochs；无显式参数；直接调用 Date.now、retiredPeerEpochs.delete；包含循环处理。 */ function pruneRetiredEpochs(): void { for (const [key, until] of retiredPeerEpochs) if (until < Date.now()) retiredPeerEpochs.delete(key) }
const sourcePeers = new Map<string, string>()
const scheduledDeliveries = new Set<ReturnType<typeof setTimeout>>()
const baselinePending = new Map<string, Set<string>>()
const baselineSending = new Set<string>()
const baselineTransfers = new Map<string, { transferId: string; count: number; checksum: string; chunks: Map<number, string>; bytes: number; startedAt: number }>()
const deferredInbound = new Map<string, Map<string, DeferredInboundPacket>>()
let deferredInboundCount = 0
const preAdmissionRpcs: PreAdmissionRpc[] = []
const rollbackTimeline = new NetworkTimeline<NetworkRollbackEntry>(600), replicationDiffs = new NetworkTimeline<NetworkReplicationDiff>(2_000)
const interpolationTargets = new Map<string, { sender: string; position?: [number, number]; rotation?: number; velocity?: [number, number]; remaining: number }>()
let localInterest: NetworkInterestView | null = null
let sceneHandoffHandler: ((sceneUuid: string, spawnTag: string, peerId: string) => void | Promise<void>) | null = null
let serviceAbort: AbortController | null = null
const serviceHandles: NetworkServiceHandle[] = []
let reconnectAllowed = false
let startupPromise: Promise<void> | null = null
/** 结构说明（自动提取）：requireConnectionGeneration；输入 generation；直接调用 DOMException；包含显式抛错路径。 */ function requireConnectionGeneration(generation: number): void { if (generation !== connectionGeneration) throw new DOMException('Network session opening was cancelled.', 'AbortError') }

/** 结构说明（自动提取）：networkSessionId；无显式参数；直接调用 Math.imul、char.charCodeAt、padStart、toString；写入 hash；包含循环处理。 */ function networkSessionId(): string { let hash = 0x811c9dc5; const source = `${productionSettings.networking.sessionName}:${productionSettings.networking.schemaVersion}`; for (const char of source) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193); return `session-${(hash >>> 0).toString(16).padStart(8, '0')}` }
/** 结构说明（自动提取）：peerIdentity；无显式参数；直接调用 crypto.randomUUID、toString、Date.now、slice、Math.random 等。 */ function peerIdentity(): string { const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; return `${productionSettings.networking.playerName.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 32)}-${uuid.slice(0, 12)}` }
/** 结构说明（自动提取）：channel；输入 id；直接调用 productionSettings.networking.channels.find。 */ function channel(id: string): NetworkChannelDefinition | null { return productionSettings.networking.channels.find(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id) ?? null }
/** 结构说明（自动提取）：channelByDelivery；输入 delivery、preferred；直接调用 channel、productionSettings.networking.channels.find。 */ function channelByDelivery(delivery: NetworkChannelDefinition['delivery'], preferred: string): NetworkChannelDefinition | null { const preferredChannel = channel(preferred); return preferredChannel?.delivery === delivery ? preferredChannel : productionSettings.networking.channels.find(/* 比较 item.delivery 与 delivery，返回严格相等的判断结果。 */ item => item.delivery === delivery) ?? null }
/** 结构说明（自动提取）：addEvent；输入 message、level；直接调用 networkingState.events.push、Date.now、message.slice、networkingState.events.splice。 */ function addEvent(message: string, level: 'info' | 'warning' | 'error' = 'info'): void { networkingState.events.push({ at: Date.now(), level, message: message.slice(0, 300) }); if (networkingState.events.length > 500) networkingState.events.splice(0, networkingState.events.length - 500) }
/** 结构说明（自动提取）：channelStat；输入 id；写入 networkingState.channelStats[…]。 */ function channelStat(id: string): { sent: number; received: number; dropped: number } { return networkingState.channelStats[id] ??= { sent: 0, received: 0, dropped: 0 } }
/** 结构说明（自动提取）：packetSummary；输入 direction、peer、packet、bytes、accepted；直接调用 networkingState.packetSummaries.push、Date.now、peer.slice、networkingState.packetSummaries.splice。 */ function packetSummary(direction: 'in' | 'out', peer: string, packet: NetworkPacket, bytes: number, accepted: boolean): void { networkingState.packetSummaries.push({ direction, at: Date.now(), peer: peer.slice(0, 80), channel: packet.channel, kind: packet.kind, sequence: packet.sequence, bytes, accepted }); if (networkingState.packetSummaries.length > 1_000) networkingState.packetSummaries.splice(0, networkingState.packetSummaries.length - 1_000) }
/** 结构说明（自动提取）：updatePeer；输入 id、payload、verified；直接调用 Date.now、networkingState.peerDetails.find、networkingState.peerDetails.push；写入 existing.lastSeenAt、existing.verified、networkingState.peers。 */ function updatePeer(id: string, payload?: HelloPayload, verified = verifiedPeers.has(id)): boolean { const now = Date.now(), existing = networkingState.peerDetails.find(/* 比较 peer.id 与 id，返回严格相等的判断结果。 */ peer => peer.id === id); if (existing) { existing.lastSeenAt = now; existing.verified ||= verified; return true }; if (networkingState.peerDetails.length >= productionSettings.networking.maxPeers) return false; networkingState.peerDetails.push({ id, name: payload?.playerName ?? id, role: payload?.role ?? 'peer', verified, connectedAt: now, lastSeenAt: now, sceneUuid: '' }); networkingState.peers = networkingState.peerDetails.length; return true }
/** 结构说明（自动提取）：authorityClaimTrusted；输入 sender、source；直接调用 verifiedPeers.has、productionSettings.networking.endpoint.replace。 */ function authorityClaimTrusted(sender: string, source: string): boolean {
  if (verifiedPeers.has(sender)) return true
  if (transport?.kind === 'local-loopback') return source === sender
  if (transport?.kind === 'native-udp') return source === productionSettings.networking.endpoint.replace(/^udp:\/\//i, '')
  return false
}
/** 结构说明（自动提取）：nextSequence；输入 channelId、peer、commit；直接调用 sequenceByChannel.get、sequenceByChannel.set。 */ function nextSequence(channelId: string, peer = '*', commit = true): number { const destination = peer || '*', key = `${destination}:${channelId}`, baseline = sequenceByChannel.get(key) ?? (destination === '*' ? 0 : sequenceByChannel.get(`*:${channelId}`) ?? 0), next = (baseline + 1) & 0x7fff_ffff; if (commit) sequenceByChannel.set(key, next || 1); return next || 1 }
const MAX_SEQUENCE = 0x7fff_ffff
/** 结构说明（自动提取）：sequenceDistance；输入 previous、current。 */ function sequenceDistance(previous: number, current: number): number { if (current === previous) return 0; return current > previous ? current - previous : MAX_SEQUENCE - previous + current }
/* 根据 previous >= MAX_SEQUENCE 的真假，分别返回 1 或 previous + 1。 */ function nextExpectedSequence(previous: number): number { return previous >= MAX_SEQUENCE ? 1 : previous + 1 }
/** 结构说明（自动提取）：protocolLimits；无显式参数。 */ function protocolLimits() { return { maximumPacketBytes: productionSettings.networking.maximumPacketBytes, maximumMessagesPerSecond: productionSettings.networking.maximumMessagesPerSecond, schemaVersion: productionSettings.networking.schemaVersion } }
/** 结构说明（自动提取）：authenticationChecksum；输入 packet；直接调用 networkChecksum。 */ function authenticationChecksum(packet: NetworkPacket): string { const { security: _security, ...unsigned } = packet; return networkChecksum(unsigned) }
/** 结构说明（自动提取）：securePacket；输入 packet；直接调用 createNetworkNonce、Date.now、createAuthenticationProof、authenticationChecksum；写入 envelope.proof、packet.security；返回路径包含 packet。 */ function securePacket(packet: NetworkPacket): NetworkPacket {
  const envelope: NetworkSecurityEnvelope = { epoch: sessionEpoch, nonce: createNetworkNonce(packet.sequence), issuedAt: Date.now(), proof: '' }
  if (productionSettings.networking.authentication.mode === 'hook') envelope.proof = createAuthenticationProof(productionSettings.networking.authentication.providerId, { sessionId: packet.sessionId, sender: packet.sender, epoch: envelope.epoch, nonce: envelope.nonce, issuedAt: envelope.issuedAt, packetChecksum: authenticationChecksum(packet) })
  packet.security = envelope
  return packet
}
/** 结构说明（自动提取）：refreshProductionDiagnostics；无显式参数；直接调用 networkingState.ownership.splice、authorityTable.entries、networkingState.peerInterests.splice、sort、peerInterests.values 等。 */ function refreshProductionDiagnostics(): void {
  networkingState.ownership.splice(0, networkingState.ownership.length, ...authorityTable.entries())
  networkingState.peerInterests.splice(0, networkingState.peerInterests.length, ...[...peerInterests.values()].sort(/* 调用 a.peerId.localeCompare(b.peerId) 并返回调用结果。 */ (a, b) => a.peerId.localeCompare(b.peerId)))
  networkingState.rollbackTimeline.splice(0, networkingState.rollbackTimeline.length, ...rollbackTimeline.snapshot())
  networkingState.replicationDiffs.splice(0, networkingState.replicationDiffs.length, ...replicationDiffs.snapshot())
}
/** 结构说明（自动提取）：removePeer；输入 peerId、reason；直接调用 peerEpochs.get、pruneRetiredEpochs、retiredPeerEpochs.set、Date.now、baselineSending.delete 等；写入 networkingState.peers、networkingState.reliablePending、networkingState.disconnectCleanups；包含循环处理。 */ function removePeer(peerId: string, reason: string): void {
  const epoch = peerEpochs.get(peerId); pruneRetiredEpochs()
  if (epoch && retiredPeerEpochs.size < 4096) retiredPeerEpochs.set(`${peerId}:${epoch}`, Date.now() + productionSettings.networking.security.maximumPacketAgeMs)
  baselineSending.delete(peerId); snapshotCursors.delete(peerId)
  for (const [uuid, target] of interpolationTargets) if (target.sender === peerId) interpolationTargets.delete(uuid)
  const index = networkingState.peerDetails.findIndex(/* 比较 item.id 与 peerId，返回严格相等的判断结果。 */ item => item.id === peerId)
  if (index >= 0) networkingState.peerDetails.splice(index, 1)
  networkingState.peers = networkingState.peerDetails.length
  verifiedPeers.delete(peerId); handshakenPeers.delete(peerId); peerEpochs.delete(peerId); remoteInputs.delete(peerId); peerInterests.delete(peerId); const source = peerSources.get(peerId); peerSources.delete(peerId); if (source && sourcePeers.get(source) === peerId) sourcePeers.delete(source); baselinePending.delete(peerId); baselineTransfers.delete(peerId); clearDeferredInbound(peerId); replayProtection.clearPeer(peerId); inboundRate.clearPrefix(`${peerId}:`); rpcRate.clearPrefix(`${peerId}:`)
  if (transport?.kind === 'native-udp') transport.unbindPeer?.(peerId)
  let releasedNetworkState = reliableWindow.clearPeer(peerId)
  for (const key of [...sequenceByChannel.keys()]) if (key.startsWith(`${peerId}:`)) { sequenceByChannel.delete(key); releasedNetworkState++ }
  for (const key of [...inboundSequences.keys()]) if (key.startsWith(`${peerId}:`)) { inboundSequences.delete(key); releasedNetworkState++ }
  for (const key of [...reliableBuffers.keys()]) if (key.startsWith(`${peerId}:`)) { reliableBuffers.delete(key); releasedNetworkState++ }
  networkingState.reliablePending = reliableWindow.size
  const authorityPeer = productionSettings.networking.role === 'server' || productionSettings.networking.role === 'host' ? networkingState.localPeerId : ''
  const released = authorityTable.releasePeer(peerId, authorityPeer)
  if (released.length || releasedNetworkState) networkingState.disconnectCleanups += released.length + releasedNetworkState
  if (released.length) addEvent(`${released.length} owned object(s) returned to authority after ${reason}.`, 'warning')
  refreshProductionDiagnostics()
}
/** 结构说明（自动提取）：pruneDisconnectedPeers；输入 now；直接调用 Math.max、removePeer、addEvent、peerInterests.delete、refreshProductionDiagnostics；包含循环处理。 */ function pruneDisconnectedPeers(now = Date.now()): void {
  const timeout = Math.max(5_000, productionSettings.networking.authentication.handshakeTimeoutMs * 2)
  for (const peer of [...networkingState.peerDetails]) if (now - peer.lastSeenAt > timeout) { removePeer(peer.id, 'peer timeout'); addEvent(`${peer.name} timed out and was removed.`, 'warning') }
  for (const [peerId, view] of peerInterests) if (now - view.updatedAt > timeout) peerInterests.delete(peerId)
  refreshProductionDiagnostics()
}

/** 结构说明（自动提取）：cancelScheduledDeliveries；无显式参数；直接调用 globalThis.clearTimeout、scheduledDeliveries.clear；包含循环处理。 */ function cancelScheduledDeliveries(): void { for (const timer of scheduledDeliveries) globalThis.clearTimeout(timer); scheduledDeliveries.clear() }
/** 结构说明（自动提取）：closeNetworkServices；无显式参数；直接调用 serviceAbort.abort、serviceHandles.splice、Promise.all、handles.map；写入 serviceAbort；等待异步结果。 */ async function closeNetworkServices(): Promise<void> { serviceAbort?.abort(); serviceAbort = null; const handles = serviceHandles.splice(0); await Promise.all(handles.map(/** 结构说明（自动提取）：handles.map 回调；输入 handle；直接调用 catch、handle.close；返回表达式求值结果。 */ handle => handle.close().catch(/* 返回 undefined 的当前值。 */ () => undefined))) }
/** 结构说明（自动提取）：openNetworkServices；输入 generation；直接调用 closeNetworkServices、requireConnectionGeneration、AbortController、selectedNetworkServiceIds、openReviewedNetworkService 等；写入 serviceAbort；包含循环处理；等待异步结果；包含显式抛错路径。 */ async function openNetworkServices(generation: number): Promise<void> {
  await closeNetworkServices(); requireConnectionGeneration(generation)
  const abort = new AbortController(); serviceAbort = abort
  const selected = selectedNetworkServiceIds(productionSettings.networking)
  for (const kind of ['identity', 'lobby', 'relay'] as NetworkServiceKind[]) {
    if (!selected[kind]) continue
    const handle = await openReviewedNetworkService(kind, productionSettings.networking, { sessionId: networkingState.sessionId, localPeerId: networkingState.localPeerId, role: productionSettings.networking.role, signal: abort.signal })
    if (generation !== connectionGeneration || abort.signal.aborted) { await handle.close().catch(/* 返回 undefined 的当前值。 */ () => undefined); requireConnectionGeneration(generation); throw new DOMException('Network service opening was cancelled.', 'AbortError') }
    serviceHandles.push(handle)
    const operation = kind === 'identity' ? 'identify' : kind === 'lobby' ? (productionSettings.networking.role === 'client' ? 'discover' : 'publish') : 'connect'
    await handle.request(operation, Object.freeze({ sessionName: productionSettings.networking.sessionName, role: productionSettings.networking.role, peerId: networkingState.localPeerId }))
    requireConnectionGeneration(generation)
    addEvent(`Reviewed ${kind} service ${selected[kind]} opened for ${operation}.`)
  }
}
/** 结构说明（自动提取）：resetConnectionPeerState；无显式参数；直接调用 removePeer、networkingState.peerDetails.splice、remoteSnapshots.splice、remoteInputs.clear、inboundSequences.clear 等；写入 networkingState.peers；包含循环处理。 */ function resetConnectionPeerState(): void {
  networkingState.lastAppliedSnapshotAt = null; networkingState.lastAppliedSnapshotTick = null; networkingState.lastAppliedSnapshotPeer = ''
  for (const peer of [...networkingState.peerDetails]) removePeer(peer.id, 'session reset')
  networkingState.peerDetails.splice(0); networkingState.peers = 0; remoteSnapshots.splice(0); remoteInputs.clear(); inboundSequences.clear(); reliableBuffers.clear(); peerSources.clear(); peerEpochs.clear(); retiredPeerEpochs.clear(); baselineSending.clear(); snapshotCursors.clear(); sourcePeers.clear(); baselinePending.clear(); baselineTransfers.clear(); clearDeferredInbound(); preAdmissionRpcs.splice(0); verifiedPeers.clear(); handshakenPeers.clear(); peerInterests.clear(); interpolationTargets.clear(); replayProtection.clear(); reliableWindow.clear(); outboundRate.clear(); inboundRate.clear(); rpcRate.clear()
}

/** 结构说明（自动提取）：transportSend；输入 source、packet、target、resend；直接调用 utf8Bytes、simulator.decide、channelStat、packetSummary、Math.max 等；包含循环处理；等待异步结果。 */ async function transportSend(source: string, packet: NetworkPacket, target: string, resend = false): Promise<boolean> {
  if (!transport || networkingState.status !== 'connected') return false
  const activeTransport = transport, generation = connectionGeneration, bytes = utf8Bytes(source), decision = simulator.decide(productionSettings.networking.simulation)
  if (decision.dropped) { networkingState.droppedPackets++; channelStat(packet.channel).dropped++; packetSummary('out', target || '*', packet, bytes, false); return packet.delivery === 'reliable-ordered' }
  const deliver = /** 结构说明（自动提取）：deliver；无显式参数；直接调用 activeTransport.send、channelStat、packetSummary、String；写入 networkingState.sentBytes、networkingState.lastError；等待异步结果。 */ async () => {
    if (transport !== activeTransport || connectionGeneration !== generation || networkingState.status !== 'connected') return false
    try { await activeTransport.send(source, target); networkingState.sentBytes += bytes; networkingState.sentPackets++; channelStat(packet.channel).sent++; packetSummary('out', target || '*', packet, bytes, true); if (resend) networkingState.reliableResent++; return true } catch (error) { networkingState.lastError = error instanceof Error ? error.message : String(error); networkingState.droppedPackets++; channelStat(packet.channel).dropped++; return false }
  }
  for (let copy = 0; copy < decision.copies; copy++) {
    const delay = decision.delayMs + copy
    if (delay) {
      if (scheduledDeliveries.size >= Math.max(64, Math.min(4_096, productionSettings.networking.maximumPendingReliable * 4))) { networkingState.droppedPackets++; channelStat(packet.channel).dropped++; continue }
      const timer = globalThis.setTimeout(/** 结构说明（自动提取）：globalThis.setTimeout 回调；无显式参数；直接调用 scheduledDeliveries.delete、deliver。 */ () => { scheduledDeliveries.delete(timer); void deliver() }, delay); scheduledDeliveries.add(timer)
    } else await deliver()
  }
  return true
}

/** 结构说明（自动提取）：sendNetworkPacket；输入 kind、payload、channelId、target；直接调用 channel、performance.now、outboundRate.accept、channelStat、networkingState.peerDetails.map 等；写入 networkingState.lastError、deliveries、networkingState.bandwidthOutKbps、budgetStarted 等；包含循环处理；等待异步结果；包含显式抛错路径。 */ export async function sendNetworkPacket(kind: NetworkPacket['kind'], payload: unknown, channelId: string, target = ''): Promise<boolean> {
  if (!transport || networkingState.status !== 'connected' || !productionSettings.networking.enabled || !productionSettings.networking.permissionGranted) return false
  const contract = channel(channelId); if (!contract) { networkingState.lastError = `Unknown network channel ${channelId}.`; return false }
  if (transport.kind === 'native-udp' && !target && !networkingState.peerDetails.length && (productionSettings.networking.role === 'host' || productionSettings.networking.role === 'server')) return true
  const now = performance.now()
  if (!outboundRate.accept('global', productionSettings.networking.maximumMessagesPerSecond, now) || !outboundRate.accept(channelId, contract.messagesPerSecond, now)) { networkingState.rateLimited++; channelStat(channelId).dropped++; return false }
  const targets = contract.delivery === 'reliable-ordered' && kind !== 'ack' && !target && networkingState.peerDetails.length ? networkingState.peerDetails.map(/* 返回 peer.id 的当前值。 */ peer => peer.id) : [target]
  let deliveries: Array<{ destination: string; packet: NetworkPacket; source: string; bytes: number }>
  try {
    const payloadError = validateNetworkValue(payload); if (payloadError) throw new Error(payloadError)
    if (utf8Bytes(stableNetworkJson(payload)) > contract.maximumPayloadBytes) throw new Error(`Packet payload exceeds channel ${channelId}.`)
    deliveries = targets.map(/** 结构说明（自动提取）：targets.map 回调；输入 destination；直接调用 securePacket、createNetworkPacket、nextSequence、serializeNetworkPacket、utf8Bytes 等；包含显式抛错路径。 */ destination => {
      const packet = securePacket(createNetworkPacket({ sessionId: networkingState.sessionId, sender: networkingState.localPeerId, channel: channelId, delivery: contract.delivery, sequence: nextSequence(channelId, destination || '*', false), ack: null, tick, schema: productionSettings.networking.schemaVersion, kind, payload })), source = serializeNetworkPacket(packet), bytes = utf8Bytes(source)
      if (bytes > productionSettings.networking.maximumPacketBytes) throw new Error('Packet exceeds the configured byte bound.')
      return { destination, packet, source, bytes }
    })
  } catch (error) { networkingState.lastError = error instanceof Error ? error.message : String(error); networkingState.schemaRejected++; if (productionSettings.networking.authentication.mode === 'hook') networkingState.authenticationRejected++; return false }
  if (now - budgetStarted >= 1_000) { networkingState.bandwidthOutKbps = Math.round(budgetBytes * 8 / 1024); budgetStarted = now; budgetBytes = 0 }
  const limit = productionSettings.networking.bandwidthKbps * 1024 / 8
  const totalBytes = deliveries.reduce(/* 计算表达式 sum + item.bytes 并返回结果，沿用操作数的原有类型规则。 */ (sum, item) => sum + item.bytes, 0)
  if (budgetBytes + totalBytes > limit) { networkingState.droppedPackets += deliveries.length; channelStat(channelId).dropped += deliveries.length; return false }
  if (contract.delivery === 'reliable-ordered' && kind !== 'ack') {
    if (!reliableWindow.canTrack(deliveries.length)) { networkingState.droppedPackets += deliveries.length; networkingState.reliableExpired += deliveries.length; return false }
    for (const item of deliveries) { if (!reliableWindow.track(item.destination || '*', item.packet, item.source, now)) { networkingState.droppedPackets++; networkingState.reliableExpired++; return false }; networkingState.reliableSent++ }
    networkingState.reliablePending = reliableWindow.size
  }
  budgetBytes += totalBytes
  for (const item of deliveries) sequenceByChannel.set(`${item.destination || '*'}:${item.packet.channel}`, item.packet.sequence)
  if (kind === 'resync') for (const item of deliveries) if (item.destination) { const pending = baselinePending.get(item.destination) ?? new Set<string>(); pending.add(`${item.packet.channel}:${item.packet.sequence}`); baselinePending.set(item.destination, pending) }
  const delivered = await Promise.all(deliveries.map(/* 调用 transportSend(item.source, item.packet, item.destination) 并返回调用结果。 */ item => transportSend(item.source, item.packet, item.destination)))
  return delivered.every(Boolean)
}

/** 结构说明（自动提取）：sendAck；输入 packet、_peer；直接调用 securePacket、createNetworkPacket、transportSend、serializeNetworkPacket；等待异步结果。 */ async function sendAck(packet: NetworkPacket, _peer: string): Promise<void> { const ack = securePacket(createNetworkPacket({ sessionId: networkingState.sessionId, sender: networkingState.localPeerId, channel: packet.channel, delivery: packet.delivery, sequence: 0, ack: packet.sequence, tick, schema: productionSettings.networking.schemaVersion, kind: 'ack', payload: null })); await transportSend(serializeNetworkPacket(ack), ack, packet.sender) }
/** 结构说明（自动提取）：sendAuthoritativeBaseline；输入 peerId、reliable；直接调用 baselineSending.add、baselinePending.set、Set、exportMultiplayerSave、authorityTable.entries 等；写入 low、high、offset、windowStarted 等；包含循环处理；等待异步结果；包含显式抛错路径。 */ async function sendAuthoritativeBaseline(peerId: string, reliable: NetworkChannelDefinition): Promise<void> {
  baselineSending.add(peerId); baselinePending.set(peerId, new Set())
  const document: BaselineDocument = { format: 'nova-network-baseline', version: 1, save: exportMultiplayerSave(lastEntities, tick), authority: authorityTable.entries(), scenes: networkingState.peerDetails.map(/** 构造并返回记录 { peerId: peer.id, sceneUuid: peer.sceneUuid }，字段按当前实参及捕获状态求值。 */ peer => ({ peerId: peer.id, sceneUuid: peer.sceneUuid })).filter(/* 返回 item.sceneUuid 的当前值。 */ item => item.sceneUuid).slice(0, 64) }
  const source = stableNetworkJson(document), configuredByteBudget = Math.max(1_024, productionSettings.networking.bandwidthKbps * 1024 / 8), maximumChunkBytes = Math.max(128, Math.min(48_000, reliable.maximumPayloadBytes - 2_048, productionSettings.networking.maximumPacketBytes - 4_096, configuredByteBudget - 768))
  const chunks: string[] = []
  for (let offset = 0; offset < source.length;) {
    let low = offset, high = Math.min(source.length, offset + maximumChunkBytes)
    while (low < high) { const end = Math.ceil((low + high) / 2); if (utf8Bytes(JSON.stringify(source.slice(offset, end))) - 2 <= maximumChunkBytes) low = end; else high = end - 1 }
    if (low <= offset) throw new Error('The authoritative baseline cannot fit the configured packet limits.')
    chunks.push(source.slice(offset, low)); offset = low
  }
  if (!chunks.length || chunks.length > 256 || utf8Bytes(source) > 8 * 1024 * 1024) throw new Error('The authoritative baseline exceeds the bounded 8 MiB / 256 chunk limit.')
  const transferId = `base-${tick.toString(36)}-${networkChecksum(source).slice(0, 12)}`, checksum = networkChecksum(source)
  const generation = connectionGeneration, targetEpoch = peerEpochs.get(peerId), byteBudget = configuredByteBudget, messageBudget = Math.max(1, Math.min(productionSettings.networking.maximumMessagesPerSecond, reliable.messagesPerSecond)); let windowStarted = performance.now(), windowBytes = 0, windowMessages = 0
  for (let index = 0; index < chunks.length; index++) {
    const estimate = Math.min(byteBudget, utf8Bytes(chunks[index]) + 768), elapsed = performance.now() - windowStarted
    if (windowMessages >= messageBudget || windowBytes + estimate > byteBudget) { await new Promise(/* 调用 globalThis.setTimeout(resolve, Math.max(1, 1_000 - elapsed)) 并返回调用结果。 */ resolve => globalThis.setTimeout(resolve, Math.max(1, 1_000 - elapsed))); windowStarted = performance.now(); windowBytes = 0; windowMessages = 0 }
    if (generation !== connectionGeneration || !transport || networkingState.status !== 'connected' || !handshakenPeers.has(peerId) || peerEpochs.get(peerId) !== targetEpoch) throw new Error('Authoritative baseline transfer was cancelled with the session or peer.')
    if (!await sendNetworkPacket('resync', { transferId, index, count: chunks.length, checksum, chunk: chunks[index] } satisfies BaselineChunkPayload, reliable.id, peerId)) throw new Error(`Authoritative baseline chunk ${index + 1}/${chunks.length} could not be queued.`)
    windowBytes += estimate; windowMessages++
  }
  baselineSending.delete(peerId)
  if (!baselinePending.get(peerId)?.size) { baselinePending.delete(peerId); drainDeferredInbound(peerId) }
}
/** 结构说明（自动提取）：queuePreAdmissionRpc；输入 payload、channelId；直接调用 channel、Math.max、Math.min、preAdmissionRpcs.push、JSON.parse 等。 */ function queuePreAdmissionRpc(payload: RpcPayload, channelId: string): boolean {
  if (channel(channelId)?.delivery !== 'reliable-ordered' || preAdmissionRpcs.length >= Math.max(1, productionSettings.networking.maximumPendingReliable)) return false
  const expiresIn = Math.max(1_000, Math.min(30_000, productionSettings.networking.authentication.handshakeTimeoutMs))
  preAdmissionRpcs.push({ payload: JSON.parse(stableNetworkJson(payload)) as RpcPayload, channelId, expiresAt: Date.now() + expiresIn })
  return true
}
/** 结构说明（自动提取）：flushPreAdmissionRpcs；输入 peerId；直接调用 Date.now、preAdmissionRpcs.splice、sendNetworkPacket；包含循环处理。 */ function flushPreAdmissionRpcs(peerId: string): void {
  const now = Date.now(), pending = preAdmissionRpcs.splice(0)
  for (const item of pending) if (item.expiresAt >= now) void sendNetworkPacket('rpc', item.payload, item.channelId, peerId)
}
/** 结构说明（自动提取）：rpcEntityUuid；输入 payload；直接调用 Array.isArray、candidate.slice。 */ function rpcEntityUuid(payload: unknown): string { if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return ''; const value = payload as Record<string, unknown>, candidate = value.entityUuid ?? value.entity; return typeof candidate === 'string' ? candidate.slice(0, 128) : '' }
/** 结构说明（自动提取）：acceptsRpc；输入 contract、remoteRole、sender、payload；直接调用 rpcEntityUuid、Boolean、authorityTable.owner。 */ function acceptsRpc(contract: NetworkRpcDefinition, remoteRole: string, sender: string, payload: unknown): boolean { const localRole = productionSettings.networking.role; const direction = contract.direction === 'bidirectional' || (contract.direction === 'client-to-server' && (localRole === 'server' || localRole === 'host') && remoteRole === 'client') || (contract.direction === 'server-to-client' && localRole === 'client' && (remoteRole === 'server' || remoteRole === 'host')); const entityUuid = rpcEntityUuid(payload), authority = contract.authority === 'any' || (contract.authority === 'owner' && Boolean(entityUuid) && authorityTable.owner(entityUuid) === sender) || (contract.authority === 'server' && (remoteRole === 'server' || remoteRole === 'host')); return direction && authority }
const NETWORK_WORLD_BOUND = 1_000_000_000
/* 根据 typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= maximum 的真假，分别返回 value 或 null。 */ function boundedNetworkNumber(value: unknown, maximum = NETWORK_WORLD_BOUND): number | null { return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= maximum ? value : null }
/** 结构说明（自动提取）：normalizeEntitySnapshot；输入 value；直接调用 Array.isArray、Set、flatMap、value.slice。 */ function normalizeEntitySnapshot(value: unknown): EntitySnapshot[] { if (!Array.isArray(value)) return []; const seen = new Set<string>(); return value.slice(0, 2_000).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 raw；直接调用 String、test、seen.has、seen.add、Array.isArray 等；写入 output.position、output.rotation、output.velocity。 */ raw => { if (!raw || typeof raw !== 'object' || typeof (raw as Record<string, unknown>).uuid !== 'string') return []; const item = raw as Record<string, unknown>, uuid = String(item.uuid); if (!/^[A-Za-z0-9_.-]{1,128}$/.test(uuid) || seen.has(uuid)) return []; seen.add(uuid); const output: EntitySnapshot = { uuid }, position = item.position, velocity = item.velocity; if (Array.isArray(position) && position.length === 2) { const x = boundedNetworkNumber(position[0]), y = boundedNetworkNumber(position[1]); if (x !== null && y !== null) output.position = [x, y] } if (typeof item.rotation === 'number') { const rotation = boundedNetworkNumber(item.rotation, 1_000_000_000_000); if (rotation !== null) output.rotation = rotation } if (Array.isArray(velocity) && velocity.length === 2) { const x = boundedNetworkNumber(velocity[0]), y = boundedNetworkNumber(velocity[1]); if (x !== null && y !== null) output.velocity = [x, y] } return output.position || output.rotation !== undefined || output.velocity ? [output] : [] }) }

/** 结构说明（自动提取）：clearDeferredInbound；输入 peerId；直接调用 deferredInbound.clear、deferredInbound.get、Math.max、deferredInbound.delete；写入 deferredInboundCount。 */ function clearDeferredInbound(peerId = ''): void {
  if (!peerId) { deferredInbound.clear(); deferredInboundCount = 0; return }
  const pending = deferredInbound.get(peerId)
  if (!pending) return
  deferredInboundCount = Math.max(0, deferredInboundCount - pending.size)
  deferredInbound.delete(peerId)
}

/** 结构说明（自动提取）：deferInboundPacket；输入 packet、peer；直接调用 deferredInbound.get、Map、pending.has、Math.max、pending.set 等。 */ function deferInboundPacket(packet: NetworkPacket, peer: string): boolean {
  if (packet.delivery !== 'reliable-ordered' || packet.kind === 'ack' || packet.sequence <= 0) return false
  const key = `${packet.channel}:${packet.sequence}`, pending = deferredInbound.get(packet.sender) ?? new Map<string, DeferredInboundPacket>()
  if (pending.has(key)) return true
  const maximum = Math.max(1, productionSettings.networking.maximumPendingReliable)
  if (pending.size >= maximum || deferredInboundCount >= maximum) return false
  pending.set(key, { packet, peer }); deferredInbound.set(packet.sender, pending); deferredInboundCount++
  return true
}

/** 结构说明（自动提取）：drainDeferredInbound；输入 peerId；直接调用 deferredInbound.get、clearDeferredInbound、sort、pending.values、processAcceptedPacket；包含循环处理。 */ function drainDeferredInbound(peerId: string): void {
  const pending = deferredInbound.get(peerId)
  if (!pending) return
  clearDeferredInbound(peerId)
  const packets = [...pending.values()].sort(/* 先计算 left.packet.channel.localeCompare(right.packet.channel)；仅当其为假值时求右侧 left.packet.sequence - right.packet.sequence，返回短路求值结果。 */ (left, right) => left.packet.channel.localeCompare(right.packet.channel) || left.packet.sequence - right.packet.sequence)
  for (const item of packets) processAcceptedPacket(item.packet, item.peer)
}

/** 结构说明（自动提取）：processPacket；输入 packet、peer；直接调用 reliableWindow.acknowledge、reliableWindow.acknowledgeBootstrap、baselinePending.get、baseline.delete、baselineSending.has 等；写入 networkingState.reliablePending、detail.sceneUuid、networkingState.lastError、transfer 等；包含循环处理；包含显式抛错路径。 */ function processPacket(packet: NetworkPacket, peer: string): void {
  if (packet.kind === 'ack') { if (packet.ack !== null && (reliableWindow.acknowledge(packet.sender, packet.channel, packet.ack) || reliableWindow.acknowledgeBootstrap(packet.channel, packet.ack))) networkingState.reliableAcknowledged++; const baseline = baselinePending.get(packet.sender); if (packet.ack !== null && baseline) { baseline.delete(`${packet.channel}:${packet.ack}`); if (!baseline.size && !baselineSending.has(packet.sender)) { baselinePending.delete(packet.sender); addEvent(`Authoritative baseline acknowledged by ${packet.sender}.`); drainDeferredInbound(packet.sender) } }; networkingState.reliablePending = reliableWindow.size; return }
  if (packet.kind === 'hello' || packet.kind === 'join') {
    const payload = packet.payload && typeof packet.payload === 'object' ? packet.payload as Partial<HelloPayload> : {}, claimedRole = payload.role === 'server' || payload.role === 'host' ? payload.role : 'client', localRole = productionSettings.networking.role
    const trustedAuthorityRoute = authorityClaimTrusted(packet.sender, peer)
    const admittedRole: HelloPayload['role'] = localRole === 'server' || localRole === 'host' ? 'client' : trustedAuthorityRoute && (claimedRole === 'server' || claimedRole === 'host') ? claimedRole : 'client'
    const hello: HelloPayload = { role: admittedRole, playerName: typeof payload.playerName === 'string' ? payload.playerName.slice(0, 80) : packet.sender, lateJoin: payload.lateJoin === true }, wasKnown = handshakenPeers.has(packet.sender)
    if (!updatePeer(packet.sender, hello)) { networkingState.droppedPackets++; networkingState.schemaRejected++; addEvent(`Peer ${packet.sender} was rejected because the session is full.`, 'warning'); return }
    peerSources.set(packet.sender, peer); sourcePeers.set(peer, packet.sender)
    peerEpochs.set(packet.sender, packet.security?.epoch ?? '')
    if (transport?.kind === 'native-udp') transport.bindPeer?.(packet.sender, peer)
    handshakenPeers.add(packet.sender); const reliable = channelByDelivery('reliable-ordered', 'events')
    if (!wasKnown && claimedRole !== admittedRole) addEvent(`Peer ${packet.sender} requested ${claimedRole} authority and was admitted as client.`, 'warning')
    if (!wasKnown && packet.kind === 'hello' && reliable) void sendNetworkPacket('join', { role: localRole, playerName: productionSettings.networking.playerName, lateJoin: productionSettings.networking.lateJoin } satisfies HelloPayload, reliable.id, packet.sender)
    if (!wasKnown && tick > 0 && productionSettings.networking.lateJoin && (localRole === 'server' || localRole === 'host')) { networkingState.lateJoins++; if (reliable) void sendAuthoritativeBaseline(packet.sender, reliable).catch(/** 结构说明（自动提取）：catch 回调；输入 error；直接调用 removePeer、String、addEvent；写入 networkingState.lastError。 */ error => { removePeer(packet.sender, 'failed authoritative baseline'); networkingState.lastError = error instanceof Error ? error.message : String(error); addEvent(networkingState.lastError, 'error') }) }
    if (!wasKnown) flushPreAdmissionRpcs(packet.sender)
    addEvent(`${hello.playerName} joined as ${hello.role}.`); return
  }
  if (!updatePeer(packet.sender)) { networkingState.droppedPackets++; networkingState.schemaRejected++; return }
  if (packet.kind === 'leave') { removePeer(packet.sender, 'disconnect'); addEvent(`${packet.sender} left.`); return }
  if (packet.kind === 'authority') {
    const value = packet.payload && typeof packet.payload === 'object' ? packet.payload as Partial<AuthorityPayload> : {}, entityUuid = typeof value.entityUuid === 'string' ? value.entityUuid.slice(0, 128) : '', targetPeerId = typeof value.targetPeerId === 'string' ? value.targetPeerId.slice(0, 80) : '', remoteRole = networkingState.peerDetails.find(/* 比较 item.id 与 packet.sender，返回严格相等的判断结果。 */ item => item.id === packet.sender)?.role ?? 'client'
    const authorized = productionSettings.networking.allowAuthorityTransfer && ((remoteRole === 'server' || remoteRole === 'host') || authorityTable.owner(entityUuid) === packet.sender) && (targetPeerId === networkingState.localPeerId || networkingState.peerDetails.some(/* 比较 item.id 与 targetPeerId，返回严格相等的判断结果。 */ item => item.id === targetPeerId))
    if (!authorized || !authorityTable.transfer(entityUuid, targetPeerId)) { networkingState.schemaRejected++; addEvent(`Authority transfer from ${packet.sender} was rejected.`, 'warning'); return }
    interpolationTargets.delete(entityUuid); networkingState.authorityTransfers++; refreshProductionDiagnostics(); addEvent(`Authority for ${entityUuid} transferred to ${targetPeerId}.`); return
  }
  if (packet.kind === 'interest') {
    const value = packet.payload && typeof packet.payload === 'object' ? packet.payload as Partial<InterestPayload> : {}, center = value.center
    if (!Array.isArray(center) || center.length !== 2 || !center.every(Number.isFinite) || !Number.isFinite(value.radius)) { networkingState.schemaRejected++; return }
    peerInterests.set(packet.sender, { peerId: packet.sender, center: [Number(center[0]), Number(center[1])], radius: Math.max(0, Math.min(productionSettings.networking.interest.maximumRadius, Number(value.radius))), sceneUuid: typeof value.sceneUuid === 'string' ? value.sceneUuid.slice(0, 128) : '', updatedAt: Date.now() }); refreshProductionDiagnostics(); return
  }
  if (packet.kind === 'scene') {
    const value = packet.payload && typeof packet.payload === 'object' ? packet.payload as Partial<ScenePayload> : {}, remoteRole = networkingState.peerDetails.find(/* 比较 item.id 与 packet.sender，返回严格相等的判断结果。 */ item => item.id === packet.sender)?.role ?? 'client', sceneUuid = typeof value.sceneUuid === 'string' ? value.sceneUuid.slice(0, 128) : '', spawnTag = typeof value.spawnTag === 'string' ? value.spawnTag.slice(0, 80) : ''
    if (!productionSettings.networking.allowSceneHandoff || (remoteRole !== 'server' && remoteRole !== 'host') || !sceneUuid) { networkingState.schemaRejected++; addEvent('Scene handoff was rejected by authority or project policy.', 'warning'); return }
    const detail = networkingState.peerDetails.find(/* 比较 item.id 与 packet.sender，返回严格相等的判断结果。 */ item => item.id === packet.sender); if (detail) detail.sceneUuid = sceneUuid
    networkingState.sceneHandoffs++; addEvent(`Scene handoff to ${sceneUuid} received from ${packet.sender}.`); void sceneHandoffHandler?.(sceneUuid, spawnTag, packet.sender); return
  }
  if (packet.kind === 'rpc') { networkingState.rpcCalls++; const payload = packet.payload && typeof packet.payload === 'object' ? packet.payload as Partial<RpcPayload> : {}, contract = productionSettings.networking.rpcContracts.find(/* 比较 item.name 与 payload.name，返回严格相等的判断结果。 */ item => item.name === payload.name), remoteRole = networkingState.peerDetails.find(/* 比较 item.id 与 packet.sender，返回严格相等的判断结果。 */ item => item.id === packet.sender)?.role ?? 'client'; if (!contract || contract.channelId !== packet.channel || !acceptsRpc(contract, remoteRole, packet.sender, payload.value) || !validatePayloadSchema(payload.value, contract.payloadSchema) || utf8Bytes(stableNetworkJson(payload.value)) > contract.maximumPayloadBytes || !rpcRate.accept(`${packet.sender}:${contract.name}`, contract.callsPerSecond, performance.now())) { networkingState.rpcRejected++; networkingState.schemaRejected++; return }; try { rpcHandlers.get(contract.name)?.(payload.value, { sender: packet.sender, tick: packet.tick }) } catch (error) { networkingState.lastError = error instanceof Error ? error.message : String(error); addEvent(`RPC ${contract.name} failed: ${networkingState.lastError}`, 'error') }; return }
  if (packet.kind === 'input') { const normalized = normalizeNetworkInput(packet.payload, true); if (!normalized) { networkingState.schemaRejected++; networkingState.droppedPackets++; addEvent(`Malformed input frame from ${packet.sender} was rejected.`, 'warning'); return }; const frames = remoteInputs.get(packet.sender) ?? new Map<number, InputSnapshot>(); frames.set(packet.tick, normalized); while (frames.size > Math.max(1, productionSettings.networking.rollbackFrames)) frames.delete(frames.keys().next().value ?? 0); remoteInputs.set(packet.sender, frames); networkingState.inputFrames++; return }
  if (packet.kind === 'resync') {
    const reject = /** 结构说明（自动提取）：reject；输入 message；直接调用 removePeer、addEvent、scheduleReconnect；写入 networkingState.lastError、networkingState.status。 */ (message: string): void => {
      removePeer(packet.sender, 'invalid authoritative baseline')
      networkingState.schemaRejected++; networkingState.droppedPackets++; networkingState.lastError = message; addEvent(message, 'error')
      if (productionSettings.networking.role === 'client') { networkingState.status = 'error'; scheduleReconnect() }
    }
    const payload = packet.payload && typeof packet.payload === 'object' ? packet.payload as Partial<BaselineChunkPayload> : {}, remoteRole = networkingState.peerDetails.find(/* 比较 item.id 与 packet.sender，返回严格相等的判断结果。 */ item => item.id === packet.sender)?.role ?? 'client'
    const valid = productionSettings.networking.role === 'client' && productionSettings.networking.lateJoin && (remoteRole === 'server' || remoteRole === 'host') && typeof payload.transferId === 'string' && /^[A-Za-z0-9_.-]{1,80}$/.test(payload.transferId) && Number.isSafeInteger(payload.index) && Number.isSafeInteger(payload.count) && Number(payload.count) >= 1 && Number(payload.count) <= 256 && Number(payload.index) >= 0 && Number(payload.index) < Number(payload.count) && typeof payload.checksum === 'string' && /^[a-f0-9]{24}$/i.test(payload.checksum) && typeof payload.chunk === 'string'
    if (!valid) { reject('Unauthorized or malformed authoritative baseline. Reconnect after correcting the sender.'); return }
    const chunkPayload = payload as BaselineChunkPayload
    let transfer = baselineTransfers.get(packet.sender)
    if (!transfer || transfer.transferId !== chunkPayload.transferId) {
      if (chunkPayload.index !== 0) { reject('Authoritative baseline must start with chunk zero.'); return }
      transfer = { transferId: chunkPayload.transferId, count: chunkPayload.count, checksum: chunkPayload.checksum, chunks: new Map(), bytes: 0, startedAt: Date.now() }; baselineTransfers.set(packet.sender, transfer)
    }
    if (transfer.count !== chunkPayload.count || transfer.checksum !== chunkPayload.checksum || Date.now() - transfer.startedAt > 15_000) { reject('Authoritative baseline metadata changed or the transfer expired.'); return }
    if (!transfer.chunks.has(chunkPayload.index)) {
      transfer.bytes += utf8Bytes(chunkPayload.chunk)
      if (transfer.bytes > 8 * 1024 * 1024) { reject('Authoritative baseline exceeds 8 MiB.'); return }
      transfer.chunks.set(chunkPayload.index, chunkPayload.chunk)
    }
    if (transfer.chunks.size !== transfer.count) { void sendAck(packet, peer); return }
    try {
      const source = Array.from({ length: transfer.count }, /* 当 transfer!.chunks.get(index) 为 null 或 undefined 时返回 ''，否则保留左侧值。 */ (_, index) => transfer!.chunks.get(index) ?? '').join('')
      if (networkChecksum(source) !== transfer.checksum) throw new Error('Authoritative baseline checksum mismatch.')
      const document = JSON.parse(source) as Partial<BaselineDocument>
      if (!document || document.format !== 'nova-network-baseline' || document.version !== 1 || !document.save || !Array.isArray(document.authority) || !Array.isArray(document.scenes) || document.scenes.length > 64) throw new Error('Authoritative baseline format is invalid.')
      const scenePeers = new Set<string>()
      for (const scene of document.scenes) {
        if (!scene || typeof scene.peerId !== 'string' || !/^[A-Za-z0-9_.-]{1,80}$/.test(scene.peerId) || typeof scene.sceneUuid !== 'string' || !/^[A-Za-z0-9_.-]{1,128}$/.test(scene.sceneUuid) || scenePeers.has(scene.peerId)) throw new Error('Authoritative baseline scene identity is invalid.')
        scenePeers.add(scene.peerId)
      }
      const definitions = productionSettings.networking.replicatedEntities, allowed = new Set(definitions.map(/* 返回 definition.entityUuid 的当前值。 */ definition => definition.entityUuid)), stagedAuthority = new NetworkAuthorityTable()
      if (!stagedAuthority.restore(document.authority, definitions)) throw new Error('Authoritative baseline ownership is invalid.')
      if (!Array.isArray(document.save.entities) || document.save.entities.some(/* 先计算 !entity；仅当其为假值时求右侧 !allowed.has(entity.uuid)，返回短路求值结果。 */ entity => !entity || !allowed.has(entity.uuid))) throw new Error('Authoritative baseline contains an entity outside the replication contract.')
      const restored = importMultiplayerSave(document.save, lastEntities, new Map(definitions.map(/* 返回按声明顺序构造的数组 [definition.entityUuid, definition.properties]。 */ definition => [definition.entityUuid, definition.properties])))
      authorityTable.restore(stagedAuthority.entries(), definitions)
      for (const scene of document.scenes) { const detail = networkingState.peerDetails.find(/* 比较 item.id 与 scene.peerId，返回严格相等的判断结果。 */ item => item.id === scene.peerId); if (detail) detail.sceneUuid = scene.sceneUuid }
      tick = Math.max(tick, restored.tick); networkingState.currentTick = tick
      networkingState.lateJoins++; networkingState.snapshots++; baselineTransfers.delete(packet.sender); refreshProductionDiagnostics()
      addEvent('Late-join baseline restored ' + restored.restored + ' entities and current authority state.')
      void sendAck(packet, peer)
    } catch (error) { reject(error instanceof Error ? error.message : String(error)) }
    return
  }

  if (packet.kind === 'snapshot') { const payload = packet.payload && typeof packet.payload === 'object' ? packet.payload as Partial<SnapshotPayload> : {}, entities = normalizeEntitySnapshot(payload.entities); remoteSnapshots.push({ ...packet, payload: { entities, checksum: typeof payload.checksum === 'string' ? payload.checksum.slice(0, 64) : '', full: payload.full === true } }); if (remoteSnapshots.length > 128) remoteSnapshots.splice(0, remoteSnapshots.length - 128); networkingState.snapshots++; return }
  if (packet.kind === 'ping') { const reliable = channelByDelivery('reliable-ordered', packet.channel); if (reliable) void sendNetworkPacket('pong', { sentAt: (packet.payload as { sentAt?: unknown })?.sentAt ?? 0 }, reliable.id, packet.sender); return }
  if (packet.kind === 'pong') { const sentAt = Number((packet.payload as { sentAt?: unknown })?.sentAt); if (Number.isFinite(sentAt)) networkingState.pingMs = Math.max(0, performance.now() - sentAt) }
}

/** 结构说明（自动提取）：commitPacketReplay；输入 packet；直接调用 replayProtection.accept、Date.now。 */ function commitPacketReplay(packet: NetworkPacket): void { replayProtection.accept(packet.sender, packet.security, Date.now(), productionSettings.networking.security.maximumPacketAgeMs, productionSettings.networking.security.replayWindow, productionSettings.networking.authentication.mode === 'hook' || productionSettings.networking.authentication.requireVerifiedPeers) }

/** 结构说明（自动提取）：processAcceptedPacket；输入 packet、peer；直接调用 inboundSequences.has、handshakenPeers.has、inboundSequences.set、inboundSequences.get、sequenceDistance 等；写入 networkingState.lastError、expected；包含循环处理。 */ function processAcceptedPacket(packet: NetworkPacket, peer: string): void {
  const sequenceKey = `${packet.sender}:${packet.channel}`
  if (packet.delivery === 'reliable-ordered' && !inboundSequences.has(sequenceKey) && packet.sequence > 0 && ((packet.kind === 'hello' || packet.kind === 'join' || packet.kind === 'resync') || !handshakenPeers.has(packet.sender))) inboundSequences.set(sequenceKey, packet.sequence - 1)
  const previous = inboundSequences.get(sequenceKey) ?? 0
  const distance = sequenceDistance(previous, packet.sequence)
  if (packet.delivery === 'unreliable-sequenced') { if (distance === 0 || distance > MAX_SEQUENCE / 2) { networkingState.duplicatePackets++; return }; commitPacketReplay(packet); inboundSequences.set(sequenceKey, packet.sequence); processPacket(packet, peer); return }
  if (packet.kind === 'ack') { commitPacketReplay(packet); processPacket(packet, peer); return }
  if (distance === 0 || distance > MAX_SEQUENCE / 2) { networkingState.duplicatePackets++; return }
  if (distance > productionSettings.networking.maximumPendingReliable) { networkingState.droppedPackets++; networkingState.outOfOrderPackets++; networkingState.lastError = `Reliable sequence gap from ${packet.sender} exceeds the receive window.`; return }
  const buffer = reliableBuffers.get(sequenceKey) ?? new Map<number, NetworkPacket>()
  if (!buffer.has(packet.sequence) && buffer.size >= productionSettings.networking.maximumPendingReliable) { networkingState.droppedPackets++; networkingState.reliableExpired++; return }
  commitPacketReplay(packet)
  buffer.set(packet.sequence, packet); reliableBuffers.set(sequenceKey, buffer); if (distance > 1) networkingState.outOfOrderPackets++
  let expected = nextExpectedSequence(previous)
  while (buffer.has(expected)) { const ordered = buffer.get(expected)!; buffer.delete(expected); inboundSequences.set(sequenceKey, expected); processPacket(ordered, peer); if (!handshakenPeers.has(packet.sender)) break; if (ordered.kind !== 'resync') void sendAck(ordered, peer); expected = nextExpectedSequence(expected) }
}

/** 结构说明（自动提取）：receive；输入 source、peer；直接调用 stopNetworking、utf8Bytes、performance.now、Math.round、inboundRate.accept 等；写入 networkingState.bandwidthInKbps、receiveBudgetStarted、receiveBudgetBytes、networkingState.lastError 等。 */ function receive(source: string, peer: string): void {
  if (!productionSettings.networking.enabled || !productionSettings.networking.permissionGranted) { void stopNetworking(); return }
  if (!transport || networkingState.status !== 'connected') return
  const bytes = utf8Bytes(source), now = performance.now()
  if (now - receiveBudgetStarted >= 1_000) { networkingState.bandwidthInKbps = Math.round(receiveBudgetBytes * 8 / 1024); receiveBudgetStarted = now; receiveBudgetBytes = 0 }
  const limit = productionSettings.networking.bandwidthKbps * 1024 / 8
  if (receiveBudgetBytes + bytes > limit || !inboundRate.accept('global', productionSettings.networking.maximumMessagesPerSecond, now)) { networkingState.droppedPackets++; networkingState.rateLimited++; return }
  receiveBudgetBytes += bytes
  const parsed = parseNetworkPacket(source, protocolLimits(), productionSettings.networking.channels, networkingState.sessionId)
  if (!parsed.packet) { networkingState.droppedPackets++; networkingState.invalidPackets++; networkingState.lastError = parsed.error; return }
  const packet = parsed.packet
  if (!peer || peer.length > 256) { networkingState.droppedPackets++; networkingState.authenticationRejected++; networkingState.lastError = 'Transport source identity is empty or oversized.'; return }
  const boundSource = peerSources.get(packet.sender), boundPeer = sourcePeers.get(peer)
  if ((boundSource && boundSource !== peer) || (boundPeer && boundPeer !== packet.sender)) { networkingState.droppedPackets++; networkingState.authenticationRejected++; networkingState.lastError = `Transport source identity changed for ${packet.sender}; packet rejected.`; return }
  let authenticated = false
  if (productionSettings.networking.authentication.mode === 'hook') {
    const security = packet.security
    authenticated = Boolean(security && verifyAuthenticationProof(productionSettings.networking.authentication.providerId, { sessionId: packet.sessionId, sender: packet.sender, epoch: security.epoch, nonce: security.nonce, issuedAt: security.issuedAt, packetChecksum: authenticationChecksum(packet) }, security.proof))
    if (!authenticated) { networkingState.droppedPackets++; networkingState.authenticationRejected++; networkingState.lastError = 'Packet authentication proof was rejected.'; return }
  }
  let knownPeer = networkingState.peerDetails.find(/* 比较 item.id 与 packet.sender，返回严格相等的判断结果。 */ item => item.id === packet.sender)
  const lifecyclePacket = packet.kind === 'hello' || packet.kind === 'join', admittedEpoch = peerEpochs.get(packet.sender), incomingEpoch = packet.security?.epoch ?? '', replacingEpoch = admittedEpoch !== undefined && admittedEpoch !== incomingEpoch
  pruneRetiredEpochs()
  if ((incomingEpoch && retiredPeerEpochs.has(`${packet.sender}:${incomingEpoch}`)) || (replacingEpoch && (!lifecyclePacket || !incomingEpoch)) || ((!knownPeer || replacingEpoch) && retiredPeerEpochs.size >= 4096)) { networkingState.droppedPackets++; networkingState.replayRejected++; networkingState.lastError = 'Packet epoch is retired, changed without a lifecycle handshake, or reconnect history is full.'; return }
  if (!knownPeer && !lifecyclePacket) { networkingState.droppedPackets++; networkingState.lastError = `Peer ${packet.sender} sent ${packet.kind} before admission.`; packetSummary('in', peer, packet, bytes, false); return }
  if (!knownPeer && lifecyclePacket && networkingState.peerDetails.length >= productionSettings.networking.maxPeers) { networkingState.droppedPackets++; networkingState.schemaRejected++; networkingState.lastError = 'Session peer limit reached.'; return }
  const sequenceKey = `${packet.sender}:${packet.channel}`, previousSequence = inboundSequences.get(sequenceKey) ?? 0, bufferedSequence = reliableBuffers.get(sequenceKey)?.has(packet.sequence) === true
  const contract = channel(packet.channel)
  if (!contract || !inboundRate.accept(`${packet.sender}:${packet.channel}`, contract.messagesPerSecond, now)) { networkingState.rateLimited++; channelStat(packet.channel).dropped++; packetSummary('in', peer, packet, bytes, false); return }
  const replayDecision = replayProtection.accept(packet.sender, packet.security, Date.now(), productionSettings.networking.security.maximumPacketAgeMs, productionSettings.networking.security.replayWindow, productionSettings.networking.authentication.mode === 'hook' || productionSettings.networking.authentication.requireVerifiedPeers, false)
  if (!replayDecision.accepted) { networkingState.droppedPackets++; networkingState.replayRejected++; networkingState.lastError = `Packet rejected by replay protection: ${replayDecision.reason}.`; const alreadyProcessed = sequenceDistance(previousSequence, packet.sequence) === 0 || sequenceDistance(previousSequence, packet.sequence) > MAX_SEQUENCE / 2; if (replayDecision.reason === 'duplicate' && knownPeer && !bufferedSequence && alreadyProcessed && packet.delivery === 'reliable-ordered' && packet.kind !== 'ack') void sendAck(packet, peer); return }
  if (replacingEpoch) { removePeer(packet.sender, 'new connection epoch'); knownPeer = undefined }
  if (knownPeer) { knownPeer.lastSeenAt = Date.now(); knownPeer.verified ||= authenticated }
  if (authenticated) verifiedPeers.add(packet.sender)
  if (knownPeer && baselinePending.has(packet.sender) && !['ack', 'leave', 'hello', 'join'].includes(packet.kind)) {
    if (deferInboundPacket(packet, peer)) {
      commitPacketReplay(packet)
      networkingState.receivedBytes += bytes; networkingState.receivedPackets++; channelStat(packet.channel).received++; packetSummary('in', peer, packet, bytes, true)
      return
    }
    networkingState.droppedPackets++; channelStat(packet.channel).dropped++; packetSummary('in', peer, packet, bytes, false); networkingState.lastError = `Peer ${packet.sender} is waiting for its authoritative baseline.`; return
  }
  networkingState.receivedBytes += bytes; networkingState.receivedPackets++; channelStat(packet.channel).received++; packetSummary('in', peer, packet, bytes, true)
  processAcceptedPacket(packet, peer)
}

/** 结构说明（自动提取）：scheduleReconnect；无显式参数；直接调用 Math.min、globalThis.setTimeout；写入 networkingState.status、networkingState.lastError、reconnectTimer。 */ function scheduleReconnect(): void { if (!reconnectAllowed || !productionSettings.networking.enabled || !productionSettings.networking.permissionGranted || !productionSettings.networking.reconnect || networkingState.status === 'disabled' || reconnectTimer !== null) return; if (networkingState.reconnectAttempts >= productionSettings.networking.reconnectMaxAttempts) { networkingState.status = 'error'; networkingState.lastError = 'Reconnect attempt limit reached.'; return }; networkingState.status = 'reconnecting'; const delay = Math.min(10_000, 500 * 2 ** Math.min(5, networkingState.reconnectAttempts++)); reconnectTimer = globalThis.setTimeout(/** 结构说明（自动提取）：globalThis.setTimeout 回调；无显式参数；直接调用 catch；写入 reconnectTimer、transport。 */ () => { reconnectTimer = null; const active = transport; transport = null; void (/** 结构说明（自动提取）：匿名回调；无显式参数；直接调用 active.close、startNetworking；等待异步结果。 */ async () => { if (active) try { await active.close() } catch {}; if (reconnectAllowed) await startNetworking() })().catch(/** 结构说明（自动提取）：catch 回调；输入 error；直接调用 String；写入 networkingState.status、networkingState.lastError。 */ error => { networkingState.status = 'error'; networkingState.lastError = error instanceof Error ? error.message : String(error) }) }, delay) }

/** 结构说明（自动提取）：startNetworking；无显式参数；直接调用 startNetworkingSession、catch、pending.finally；写入 startupPromise；返回路径包含 startupPromise、pending。 */ export function startNetworking(): Promise<void> {
  if (startupPromise) return startupPromise
  const pending = startNetworkingSession(); startupPromise = pending
  void pending.finally(/** 结构说明（自动提取）：pending.finally 回调；无显式参数；写入 startupPromise。 */ () => { if (startupPromise === pending) startupPromise = null }).catch(/* 返回 undefined 的当前值。 */ () => undefined)
  return pending
}

/** 结构说明（自动提取）：startNetworkingSession；无显式参数；直接调用 Error、some、networkAuthenticationProviders、createReviewedNetworkTransport、find 等；写入 networkingState.status、networkingState.encryptedTransport、networkingState.encryptionMessage、networkingState.lastError 等；等待异步结果；包含显式抛错路径。 */ async function startNetworkingSession(): Promise<void> {
  if (!productionSettings.networking.enabled) throw new Error('Networking is disabled for this project.')
  if (!productionSettings.networking.permissionGranted) { networkingState.status = 'permission-required'; throw new Error('Network permission must be granted explicitly before a session starts.') }
  if (transport) return
  if (productionSettings.networking.authentication.requireVerifiedPeers && productionSettings.networking.authentication.mode !== 'hook') throw new Error('Verified peers require a reviewed authentication hook.')
  if (productionSettings.networking.authentication.mode === 'hook' && !networkAuthenticationProviders().some(/* 比较 provider.id 与 productionSettings.networking.authentication.providerId，返回严格相等的判断结果。 */ provider => provider.id === productionSettings.networking.authentication.providerId)) throw new Error('The selected network authentication provider is not registered.')
  const reviewed = productionSettings.networking.transportAdapterId ? createReviewedNetworkTransport(productionSettings.networking.transportAdapterId, productionSettings.networking) : null
  if (productionSettings.networking.transportAdapterId && !reviewed) throw new Error(`Reviewed transport adapter ${productionSettings.networking.transportAdapterId} is not registered.`)
  const adapterEncrypted = reviewedNetworkTransports().find(/* 比较 item.id 与 productionSettings.networking.transportAdapterId，返回严格相等的判断结果。 */ item => item.id === productionSettings.networking.transportAdapterId)?.encrypted === true, encryption = networkEncryptionGuidance(productionSettings.networking, adapterEncrypted); networkingState.encryptedTransport = encryption.protected; networkingState.encryptionMessage = encryption.message
  if (encryption.severity === 'error') { networkingState.status = 'error'; networkingState.lastError = encryption.message; throw new Error(encryption.message) }
  reconnectAllowed = true; connectionGeneration++; cancelScheduledDeliveries(); resetConnectionPeerState(); networkingState.status = 'connecting'; networkingState.lastError = ''; networkingState.sessionMode = productionSettings.networking.sessionMode; networkingState.sessionId = networkSessionId(); networkingState.localPeerId ||= peerIdentity(); simulator = new DeterministicNetworkSimulator(productionSettings.networking.simulation.seed); reliableWindow = new ReliablePacketWindow(productionSettings.networking.maximumPendingReliable); sessionEpoch = createNetworkEpoch(); tick = 0; snapshotAccumulator = 0; budgetStarted = performance.now(); budgetBytes = 0; receiveBudgetStarted = budgetStarted; receiveBudgetBytes = 0; rollbackTimeline.clear(); replicationDiffs.clear(); authorityTable.initialize(productionSettings.networking.replicatedEntities, networkingState.localPeerId, productionSettings.networking.role); refreshProductionDiagnostics()
  const generation = connectionGeneration
  let ownedTransport: NetworkTransport | null = null
  try {
    await openNetworkServices(generation); requireConnectionGeneration(generation)
    transport = productionSettings.networking.sessionMode === 'local' ? new LocalLobbyTransport() : reviewed ?? (productionSettings.networking.transport === 'native-udp' ? new NativeUdpTransport() : new WebSocketTransport()); ownedTransport = transport; networkingState.transport = transport.kind; networkingState.transportAdapterId = productionSettings.networking.transportAdapterId
    if (encryption.severity === 'warning') addEvent(encryption.message, 'warning')
    await ownedTransport.connect(/** 结构说明（自动提取）：ownedTransport.connect 回调；输入 source、peer；直接调用 receive。 */ (source, peer) => { if (generation === connectionGeneration && transport === ownedTransport) receive(source, peer) }, /** 结构说明（自动提取）：ownedTransport.connect 回调；输入 state；直接调用 scheduleReconnect；写入 networkingState.status、networkingState.lastError。 */ state => { if (generation !== connectionGeneration || transport !== ownedTransport) return; if (state === 'connected') networkingState.status = 'connected'; else if (networkingState.status !== 'disabled') { networkingState.lastError = state; scheduleReconnect() } }); requireConnectionGeneration(generation); networkingState.status = 'connected'; networkingState.reconnectAttempts = 0; addEvent(`${ownedTransport.kind} session started${serviceHandles.length ? ` with ${serviceHandles.length} explicitly selected reviewed service(s)` : '; no Nova_A cloud service is involved'}.`); const reliable = channelByDelivery('reliable-ordered', 'events'); if (!reliable) throw new Error('At least one reliable channel is required for session control.'); await sendNetworkPacket('hello', { role: productionSettings.networking.role, playerName: productionSettings.networking.playerName, lateJoin: productionSettings.networking.lateJoin } satisfies HelloPayload, reliable.id)
  } catch (error) { if (generation !== connectionGeneration) { if (ownedTransport) try { await ownedTransport.close() } catch {}; throw new DOMException('Network session opening was cancelled.', 'AbortError') }; networkingState.status = 'error'; networkingState.lastError = error instanceof Error ? error.message : String(error); addEvent(networkingState.lastError, 'error'); const active = transport; transport = null; const closingServices = closeNetworkServices(); await Promise.allSettled([closingServices, active?.close()]); if (generation === connectionGeneration) scheduleReconnect(); throw error }
}

/** 结构说明（自动提取）：stopNetworking；输入 disableState；直接调用 clearTimeout、channelByDelivery、sendNetworkPacket、Promise.resolve、cancelScheduledDeliveries 等；写入 reconnectAllowed、reconnectTimer、startupPromise、transport 等；等待异步结果。 */ export async function stopNetworking(disableState = true): Promise<void> {
  reconnectAllowed = false
  if (reconnectTimer !== null) clearTimeout(reconnectTimer)
  reconnectTimer = null
  const reliable = channelByDelivery('reliable-ordered', 'events')
  const leaving = transport && networkingState.status === 'connected' && reliable ? sendNetworkPacket('leave', null, reliable.id) : Promise.resolve(false)
  connectionGeneration++; startupPromise = null; cancelScheduledDeliveries()
  const active = transport; transport = null
  const closingServices = closeNetworkServices()
  resetConnectionPeerState(); localHistory.splice(0); authorityTable.clear(); rollbackTimeline.clear(); replicationDiffs.clear(); localInterest = null
  networkingState.ownership.splice(0); networkingState.peerInterests.splice(0); networkingState.rollbackTimeline.splice(0); networkingState.replicationDiffs.splice(0); networkingState.reliablePending = 0
  if (disableState) { networkingState.status = 'disabled'; networkingState.reconnectAttempts = 0 }
  await Promise.allSettled([leaving, closingServices, active?.close()])
}

/** 结构说明（自动提取）：localSnapshot；输入 entities、full、targetPeer；直接调用 Map、productionSettings.networking.replicatedEntities.map、peerInterests.get、sort、slice 等。 */ function localSnapshot(entities: Entity[], full = false, targetPeer = ''): SnapshotPayload {
  const definitions = new Map(productionSettings.networking.replicatedEntities.map(/* 返回按声明顺序构造的数组 [definition.entityUuid, definition]。 */ definition => [definition.entityUuid, definition])), view = targetPeer ? peerInterests.get(targetPeer) : undefined
  const snapshots = entities.flatMap(/** 结构说明（自动提取）：entities.flatMap 回调；输入 entity；直接调用 definitions.get、authorityTable.owner、worldTransform、finiteNumber、entityRelevantToPeer 等；写入 snapshot.position、snapshot.rotation、snapshot.velocity。 */ entity => {
    const definition = definitions.get(entity.uuid); if (!definition) return []
    const owner = authorityTable.owner(entity.uuid), sendsAuthority = definition.authority === 'server' ? productionSettings.networking.role === 'server' || productionSettings.networking.role === 'host' : owner === networkingState.localPeerId || productionSettings.networking.role === 'host' || productionSettings.networking.role === 'server'
    if (!sendsAuthority) return []
    const transform = worldTransform(entity, entities), position: [number, number] = [finiteNumber(transform.position.x), finiteNumber(transform.position.y)]
    if (!full && !entityRelevantToPeer(definition, position, view, productionSettings.networking.interest.enabled)) { networkingState.interestCulled++; return [] }
    const snapshot: EntitySnapshot = { uuid: entity.uuid }
    if (definition.properties.includes('transform')) snapshot.position = position
    if (definition.properties.includes('rotation')) snapshot.rotation = finiteNumber(transform.rotation)
    if (definition.properties.includes('velocity')) snapshot.velocity = [finiteNumber(entity.velocity.x), finiteNumber(entity.velocity.y)]
    return snapshot.position || snapshot.rotation !== undefined || snapshot.velocity ? [snapshot] : []
  }).slice(0, 2_000).sort(/* 调用 left.uuid.localeCompare(right.uuid) 并返回调用结果。 */ (left, right) => left.uuid.localeCompare(right.uuid))
  return { checksum: networkChecksum(snapshots), full, entities: snapshots }
}

/** 结构说明（自动提取）：snapshotPage；输入 snapshot、target、contract；直接调用 repeat、utf8Bytes、stableNetworkJson、createNetworkPacket、Math.min 等；写入 bytes、networkingState.snapshotPageEntities、networkingState.snapshotDeferredEntities、networkingState.lastError；包含循环处理。 */ function snapshotPage(snapshot: SnapshotPayload, target: string, contract: NetworkChannelDefinition): SnapshotPayload | null {
  if (!snapshot.entities.length) return null
  const empty = { entities: [], checksum: '0'.repeat(24), full: false }, emptyBytes = utf8Bytes(stableNetworkJson(empty))
  const envelope = createNetworkPacket({ sessionId: networkingState.sessionId, sender: networkingState.localPeerId, channel: contract.id, delivery: contract.delivery, sequence: MAX_SEQUENCE, ack: null, tick: MAX_SEQUENCE, schema: productionSettings.networking.schemaVersion, kind: 'snapshot', payload: empty, security: { epoch: sessionEpoch, nonce: '0'.repeat(24), issuedAt: Number.MAX_SAFE_INTEGER, proof: productionSettings.networking.authentication.mode === 'hook' ? '0'.repeat(512) : '' } })
  const overhead = utf8Bytes(stableNetworkJson(envelope)) - emptyBytes, limit = Math.min(contract.maximumPayloadBytes, productionSettings.networking.maximumPacketBytes - overhead)
  const start = (snapshotCursors.get(target) ?? 0) % snapshot.entities.length, page: EntitySnapshot[] = []
  let bytes = emptyBytes
  for (let offset = 0; offset < Math.min(1024, snapshot.entities.length); offset++) {
    const entity = snapshot.entities[(start + offset) % snapshot.entities.length], nextBytes = utf8Bytes(stableNetworkJson(entity)) + (page.length ? 1 : 0)
    if (bytes + nextBytes > limit) break
    bytes += nextBytes; page.push(entity)
  }
  networkingState.snapshotPageEntities = page.length; networkingState.snapshotDeferredEntities = snapshot.entities.length - page.length
  if (!page.length) { networkingState.lastError = 'A replicated entity cannot fit the state channel or packet byte limit. Increase the limit or reduce replicated properties.'; return null }
  snapshotCursors.set(target, (start + page.length) % snapshot.entities.length)
  page.sort(/* 调用 a.uuid.localeCompare(b.uuid) 并返回调用结果。 */ (a, b) => a.uuid.localeCompare(b.uuid))
  return { entities: page, checksum: networkChecksum(page), full: false }
}

/** 结构说明（自动提取）：predictionSnapshot；输入 entities；直接调用 Map、productionSettings.networking.replicatedEntities.map、slice、entities.flatMap。 */ function predictionSnapshot(entities: Entity[]): SnapshotPayload {
  const definitions = new Map(productionSettings.networking.replicatedEntities.map(/* 返回按声明顺序构造的数组 [definition.entityUuid, definition]。 */ definition => [definition.entityUuid, definition]))
  return { checksum: lastChecksum, full: true, entities: entities.flatMap(/** 结构说明（自动提取）：entities.flatMap 回调；输入 entity；直接调用 definitions.get、worldTransform、definition.properties.includes、finiteNumber；写入 snapshot.position、snapshot.rotation、snapshot.velocity。 */ entity => {
    const definition = definitions.get(entity.uuid); if (!definition) return []
    const transform = worldTransform(entity, entities), snapshot: EntitySnapshot = { uuid: entity.uuid }
    if (definition.properties.includes('transform')) snapshot.position = [finiteNumber(transform.position.x), finiteNumber(transform.position.y)]
    if (definition.properties.includes('rotation')) snapshot.rotation = finiteNumber(transform.rotation)
    if (definition.properties.includes('velocity')) snapshot.velocity = [finiteNumber(entity.velocity.x), finiteNumber(entity.velocity.y)]
    return [snapshot]
  }).slice(0, 2_000) }
}

/** 结构说明（自动提取）：parentFirstNetworkStates；输入 states、entities；直接调用 Map、entities.map、byUuid.get、Set、depths.has 等；写入 networkingState.lastError、entity；包含循环处理。 */ function parentFirstNetworkStates<T extends { uuid: string }>(states: readonly T[], entities: readonly Entity[]): T[] {
  const byUuid = new Map(entities.map(/* 返回按声明顺序构造的数组 [entity.uuid, entity]。 */ entity => [entity.uuid, entity])), depths = new Map<string, number>()
  for (const state of states) {
    let entity = byUuid.get(state.uuid)
    const chain: string[] = [], seen = new Set<string>()
    while (entity && !depths.has(entity.uuid)) {
      if (seen.has(entity.uuid) || chain.length >= 512) { networkingState.schemaRejected++; networkingState.lastError = 'Network correction requires an acyclic hierarchy of at most 512 levels.'; return [] }
      seen.add(entity.uuid); chain.push(entity.uuid); entity = entity.parentUuid ? byUuid.get(entity.parentUuid) : undefined
    }
    let depth = entity ? depths.get(entity.uuid)! : -1
    for (const uuid of chain.reverse()) depths.set(uuid, ++depth)
  }
  return [...states].sort(/* 先计算 (depths.get(a.uuid) ?? 0) - (depths.get(b.uuid) ?? 0)；仅当其为假值时求右侧 a.uuid.localeCompare(b.uuid)，返回短路求值结果。 */ (a, b) => (depths.get(a.uuid) ?? 0) - (depths.get(b.uuid) ?? 0) || a.uuid.localeCompare(b.uuid))
}

/** 结构说明（自动提取）：reconcile；输入 snapshotPacket、entities；直接调用 localHistory.find、sort、history.snapshot.entities.filter、networkChecksum、rollbackTimeline.push 等；写入 networkingState.replayedInputs、entity.velocity；包含循环处理。 */ function reconcile(snapshotPacket: NetworkPacket, entities: Entity[]): void {
  const payload = snapshotPacket.payload as SnapshotPayload, history = localHistory.find(/* 比较 item.tick 与 snapshotPacket.tick，返回严格相等的判断结果。 */ item => item.tick === snapshotPacket.tick)
  const comparedHistory = history?.snapshot.entities.filter(/** 结构说明（自动提取）：history.snapshot.entities.filter 回调；输入 entity；直接调用 payload.entities.some；返回表达式求值结果。 */ entity => payload.entities.some(/* 比较 remote.uuid 与 entity.uuid，返回严格相等的判断结果。 */ remote => remote.uuid === entity.uuid)).sort(/* 调用 left.uuid.localeCompare(right.uuid) 并返回调用结果。 */ (left, right) => left.uuid.localeCompare(right.uuid)) ?? [], comparedChecksum = comparedHistory.length ? networkChecksum(comparedHistory) : ''
  if (payload.checksum && comparedChecksum && payload.checksum !== comparedChecksum) { networkingState.divergences++; rollbackTimeline.push({ tick: snapshotPacket.tick, peerId: snapshotPacket.sender, checksumBefore: comparedChecksum, checksumAfter: payload.checksum, replayedInputs: 0, correction: 0, reason: 'authoritative-checksum-divergence' }) }
  const definitions = new Map(productionSettings.networking.replicatedEntities.map(/* 返回按声明顺序构造的数组 [definition.entityUuid, definition]。 */ definition => [definition.entityUuid, definition]))
  const ordered = parentFirstNetworkStates(payload.entities, entities), byUuid = new Map(entities.map(/* 返回按声明顺序构造的数组 [entity.uuid, entity]。 */ entity => [entity.uuid, entity]))
  const previousWorld = new Map(ordered.flatMap(/** 结构说明（自动提取）：ordered.flatMap 回调；输入 state；直接调用 byUuid.get、worldTransform。 */ state => { const entity = byUuid.get(state.uuid); return entity ? [[state.uuid, worldTransform(entity, entities)] as const] : [] }))
  for (const candidate of ordered) {
    const definition = definitions.get(candidate.uuid), entity = entities.find(/* 比较 entity.uuid 与 candidate.uuid，返回严格相等的判断结果。 */ entity => entity.uuid === candidate.uuid), peerRole = networkingState.peerDetails.find(/* 比较 item.id 与 snapshotPacket.sender，返回严格相等的判断结果。 */ item => item.id === snapshotPacket.sender)?.role ?? 'client', owner = authorityTable.owner(candidate.uuid)
    const authoritativeServer = productionSettings.networking.role === 'client' && (peerRole === 'server' || peerRole === 'host')
    const receivesAuthority = definition?.authority === 'server' ? authoritativeServer : owner ? owner === snapshotPacket.sender || (owner !== networkingState.localPeerId && authoritativeServer) : authoritativeServer
    if (!definition || !entity || !receivesAuthority) continue
    const remote: EntitySnapshot = { uuid: candidate.uuid, ...(definition.properties.includes('transform') && candidate.position ? { position: candidate.position } : {}), ...(definition.properties.includes('rotation') && candidate.rotation !== undefined ? { rotation: candidate.rotation } : {}), ...(definition.properties.includes('velocity') && candidate.velocity ? { velocity: candidate.velocity } : {}) }
    if (!remote.position && remote.rotation === undefined && !remote.velocity) continue
    networkingState.lastAppliedSnapshotAt = performance.now(); networkingState.lastAppliedSnapshotTick = snapshotPacket.tick; networkingState.lastAppliedSnapshotPeer = snapshotPacket.sender
    const current = previousWorld.get(remote.uuid)!, remoteVelocity = remote.velocity ?? [entity.velocity.x, entity.velocity.y], predictionSeconds = definition.predict ? Math.min(.25, Math.max(0, productionSettings.networking.interpolationMs / 1_000)) : 0, projectedX = remote.position ? remote.position[0] + remoteVelocity[0] * predictionSeconds : current.position.x, projectedY = remote.position ? remote.position[1] + remoteVelocity[1] * predictionSeconds : current.position.y, error = Math.hypot(projectedX - current.position.x, projectedY - current.position.y), fields: string[] = []
    if (remote.position && (remote.position[0] !== current.position.x || remote.position[1] !== current.position.y)) fields.push('transform')
    if (remote.rotation !== undefined && remote.rotation !== current.rotation) fields.push('rotation')
    if (remote.velocity && (remote.velocity[0] !== entity.velocity.x || remote.velocity[1] !== entity.velocity.y)) fields.push('velocity')
    const rollback = definition.predict && error > productionSettings.networking.reconciliationThreshold ? replayNetworkTransformDeltas(remote, snapshotPacket.tick, localHistory.map(/** 构造并返回记录 { tick: frame.tick, entities: frame.snapshot.entities }，字段按当前实参及捕获状态求值。 */ frame => ({ tick: frame.tick, entities: frame.snapshot.entities }))) : null
    const targetX = rollback?.state.position?.[0] ?? projectedX, targetY = rollback?.state.position?.[1] ?? projectedY, targetRotation = rollback?.state.rotation ?? remote.rotation, targetVelocity = rollback?.state.velocity ?? remote.velocity
    const blend = rollback || !definition.interpolate ? 1 : 0
    if (rollback) { networkingState.predictionCorrections++; networkingState.rollbacks++; networkingState.replayedInputs += rollback.replayedFrames; rollbackTimeline.push({ tick: snapshotPacket.tick, peerId: snapshotPacket.sender, checksumBefore: history?.checksum ?? '', checksumAfter: payload.checksum, replayedInputs: rollback.replayedFrames, correction: error, reason: 'authoritative-rollback-replay' }) }
    if (fields.length) replicationDiffs.push({ tick: snapshotPacket.tick, peerId: snapshotPacket.sender, entityUuid: remote.uuid, fields, error, authority: definition.authority })
    if (definition.interpolate && !rollback) interpolationTargets.set(remote.uuid, { sender: snapshotPacket.sender, ...(remote.position ? { position: [targetX, targetY] as [number, number] } : {}), ...(targetRotation !== undefined ? { rotation: targetRotation } : {}), ...(targetVelocity ? { velocity: targetVelocity } : {}), remaining: Math.max(.001, productionSettings.networking.interpolationMs / 1_000) })
    setWorldTransform(entity, { ...current, position: { x: current.position.x + (targetX - current.position.x) * blend, y: current.position.y + (targetY - current.position.y) * blend }, rotation: targetRotation === undefined ? current.rotation : current.rotation + (targetRotation - current.rotation) * blend }, entities)
    if (targetVelocity && blend) entity.velocity = { x: targetVelocity[0], y: targetVelocity[1] }
  }
  refreshProductionDiagnostics()
}

/** 结构说明（自动提取）：updateNetworking；输入 entities、fixedDelta、input、physicsChecksum；直接调用 stopNetworking、authorityTable.synchronize、interpolationTargets.clear、refreshProductionDiagnostics、cloneNetworkInput 等；写入 networkingState.currentTick、lastEntities、lastInput、lastChecksum 等；包含循环处理。 */ export function updateNetworking(entities: Entity[], fixedDelta: number, input?: InputSnapshot, physicsChecksum = ''): void {
  if (!productionSettings.networking.enabled || !productionSettings.networking.permissionGranted) { void stopNetworking(); return }
  if (!transport || networkingState.status !== 'connected') return
  if (authorityTable.synchronize(productionSettings.networking.replicatedEntities, networkingState.localPeerId, productionSettings.networking.role)) { interpolationTargets.clear(); refreshProductionDiagnostics() }
  tick++; networkingState.currentTick = tick; lastEntities = entities; lastInput = input ? cloneNetworkInput(input) : lastInput; lastChecksum = physicsChecksum.slice(0, 64)
  const snapshot = predictionSnapshot(entities)
  if (lastInput) localHistory.push({ tick, input: cloneNetworkInput(lastInput), checksum: lastChecksum, snapshot })
  if (localHistory.length > productionSettings.networking.rollbackFrames) localHistory.splice(0, localHistory.length - productionSettings.networking.rollbackFrames)
  const inputChannel = channelByDelivery('unreliable-sequenced', 'input'); if (lastInput && inputChannel && (productionSettings.networking.role === 'client' || productionSettings.networking.role === 'host')) void sendNetworkPacket('input', lastInput, inputChannel.id)
  const interval = 1 / productionSettings.networking.snapshotRate
  snapshotAccumulator = Math.min(interval * 2, snapshotAccumulator + Math.max(0, Math.min(1, fixedDelta)))
  if (snapshotAccumulator + Number.EPSILON >= interval) {
    snapshotAccumulator = Math.max(0, snapshotAccumulator - interval); if (snapshotAccumulator < 1e-9) snapshotAccumulator = 0; const stateChannel = channelByDelivery('unreliable-sequenced', 'state')
    if (stateChannel) {
      const targets = networkingState.peerDetails.filter(/* 返回 baselinePending.has(peer.id) 的逻辑取反结果。 */ peer => !baselinePending.has(peer.id)).map(/* 返回 peer.id 的当前值。 */ peer => peer.id)
      for (const target of targets) { const targeted = localSnapshot(entities, false, target), page = snapshotPage(targeted, target, stateChannel); if (page) void sendNetworkPacket('snapshot', page, stateChannel.id, target) }
    }
  }
  while (remoteSnapshots.length) reconcile(remoteSnapshots.shift()!, entities)
  const interpolationDelta = Math.max(0, Math.min(.25, fixedDelta))
  const interpolationOrder = parentFirstNetworkStates([...interpolationTargets.keys()].map(/** 构造并返回记录 { uuid }，字段按当前实参及捕获状态求值。 */ uuid => ({ uuid })), entities)
  const beforeInterpolation = new Map(interpolationOrder.flatMap(/** 结构说明（自动提取）：interpolationOrder.flatMap 回调；输入 state；直接调用 entities.find、worldTransform。 */ state => { const entity = entities.find(/* 比较 entity.uuid 与 state.uuid，返回严格相等的判断结果。 */ entity => entity.uuid === state.uuid); return entity ? [[state.uuid, worldTransform(entity, entities)] as const] : [] }))
  for (const { uuid: entityUuid } of interpolationOrder) {
    const target = interpolationTargets.get(entityUuid)!, definition = productionSettings.networking.replicatedEntities.find(/* 比较 item.entityUuid 与 entityUuid，返回严格相等的判断结果。 */ item => item.entityUuid === entityUuid)
    if (!definition || !definition.interpolate) { interpolationTargets.delete(entityUuid); continue }
    if (!definition.properties.includes('transform')) delete target.position
    if (!definition.properties.includes('rotation')) delete target.rotation
    if (!definition.properties.includes('velocity')) delete target.velocity
    const entity = entities.find(/* 比较 candidate.uuid 与 entityUuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === entityUuid); if (!entity) { interpolationTargets.delete(entityUuid); continue }
    const current = beforeInterpolation.get(entityUuid)!, alpha = Math.min(1, interpolationDelta / Math.max(interpolationDelta, target.remaining))
    setWorldTransform(entity, { ...current, position: target.position ? { x: current.position.x + (target.position[0] - current.position.x) * alpha, y: current.position.y + (target.position[1] - current.position.y) * alpha } : current.position, rotation: target.rotation === undefined ? current.rotation : current.rotation + (target.rotation - current.rotation) * alpha }, entities)
    if (target.velocity) entity.velocity = { x: entity.velocity.x + (target.velocity[0] - entity.velocity.x) * alpha, y: entity.velocity.y + (target.velocity[1] - entity.velocity.y) * alpha }
    target.remaining -= interpolationDelta; if (target.remaining <= 1e-6 || alpha >= 1) interpolationTargets.delete(entityUuid)
  }
  const reliableBefore = reliableWindow.size, dueReliable = reliableWindow.due(performance.now(), productionSettings.networking.reliableRetryMs, productionSettings.networking.reliableMaximumAttempts)
  networkingState.reliableExpired += Math.max(0, reliableBefore - reliableWindow.size)
  const expired = reliableWindow.takeExpired()
  for (const peerId of new Set(expired.map(/* 返回 item.peer 的当前值。 */ item => item.peer))) {
    if (peerId === '*' && productionSettings.networking.role !== 'client') continue
    if (peerId !== '*') removePeer(peerId, 'reliable acknowledgement timeout')
    else reliableWindow.clearPeer('*')
    networkingState.lastError = `Reliable delivery to ${peerId} exhausted its acknowledgement retries. Reconnect the peer.`; addEvent(networkingState.lastError, 'error')
    if (productionSettings.networking.role === 'client') { networkingState.status = 'error'; scheduleReconnect() }
  }
  for (const pending of dueReliable) if (networkingState.status === 'connected' && (pending.peer === '*' || networkingState.peerDetails.some(/* 比较 peer.id 与 pending.peer，返回严格相等的判断结果。 */ peer => peer.id === pending.peer))) void transportSend(pending.source, pending.packet, pending.peer === '*' ? '' : pending.peer, true)
  networkingState.reliablePending = reliableWindow.size
  const inputs = [...remoteInputs].flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 [peerId, frames]；直接调用 frames.get。 */ ([peerId, frames]) => { const value = frames.get(tick); return value ? [{ peerId, input: value }] : [] }); if (lastInput) inputs.push({ peerId: networkingState.localPeerId, input: lastInput })
  recordMultiplayerReplayFrame(tick, inputs, lastChecksum, networkingState.packetSummaries.slice(-32))
  if (tick % Math.max(1, Math.round(1 / Math.max(.0001, fixedDelta))) === 0) { pruneDisconnectedPeers(); const reliable = channelByDelivery('reliable-ordered', 'events'); if (reliable) { void sendNetworkPacket('ping', { sentAt: performance.now() }, reliable.id); if (localInterest && productionSettings.networking.interest.enabled) void sendNetworkPacket('interest', { center: localInterest.center, radius: localInterest.radius, sceneUuid: localInterest.sceneUuid } satisfies InterestPayload, reliable.id) } }
}

/** 结构说明（自动提取）：registerRpc；输入 name、handler；直接调用 slice、replace、name.trim、rpcHandlers.set。 */ export function registerRpc(name: string, handler: (payload: unknown, context: { sender: string; tick: number }) => void): () => void { const key = name.trim().replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 80); rpcHandlers.set(key, handler); return /* 调用 rpcHandlers.delete(key) 并返回调用结果。 */ () => rpcHandlers.delete(key) }
/** 结构说明（自动提取）：callRpc；输入 name、payload；直接调用 productionSettings.networking.rpcContracts.find、rpcEntityUuid、Boolean、authorityTable.owner、validatePayloadSchema 等；写入 payloadValid。 */ export function callRpc(name: string, payload: unknown): boolean {
  if (!productionSettings.networking.enabled || !productionSettings.networking.permissionGranted || !transport || networkingState.status !== 'connected') return false
  const contract = productionSettings.networking.rpcContracts.find(/* 比较 item.name 与 name，返回严格相等的判断结果。 */ item => item.name === name), localRole = productionSettings.networking.role
  if (!contract) { networkingState.rpcRejected++; return false }
  const direction = contract.direction === 'bidirectional' || (contract.direction === 'client-to-server' && localRole === 'client') || (contract.direction === 'server-to-client' && (localRole === 'server' || localRole === 'host')), entityUuid = rpcEntityUuid(payload), authority = contract.authority === 'any' || (contract.authority === 'owner' && Boolean(entityUuid) && authorityTable.owner(entityUuid) === networkingState.localPeerId) || (contract.authority === 'server' && (localRole === 'server' || localRole === 'host'))
  let payloadValid = false
  try { payloadValid = validatePayloadSchema(payload, contract.payloadSchema) && utf8Bytes(stableNetworkJson(payload)) <= contract.maximumPayloadBytes } catch { payloadValid = false }
  if (!direction || !authority || !payloadValid || !rpcRate.accept(`local:${contract.name}`, contract.callsPerSecond, performance.now())) { networkingState.rpcRejected++; return false }
  const rpc: RpcPayload = { name: contract.name, value: payload }
  if (transport && networkingState.status === 'connected' && !networkingState.peerDetails.length) {
    if (!queuePreAdmissionRpc(rpc, contract.channelId)) { networkingState.rpcRejected++; return false }
    networkingState.rpcCalls++; return true
  }
  networkingState.rpcCalls++; void sendNetworkPacket('rpc', rpc, contract.channelId); return true
}
/** 结构说明（自动提取）：setNetworkInterest；输入 center、radius、sceneUuid；直接调用 center.every、Number.isFinite、finiteNumber、Math.max、Math.min 等；写入 localInterest。 */ export function setNetworkInterest(center: [number, number], radius = productionSettings.networking.interest.defaultRadius, sceneUuid = ''): boolean { if (!center.every(Number.isFinite) || !Number.isFinite(radius)) return false; localInterest = { peerId: networkingState.localPeerId, center: [finiteNumber(center[0]), finiteNumber(center[1])], radius: Math.max(0, Math.min(productionSettings.networking.interest.maximumRadius, radius)), sceneUuid: sceneUuid.slice(0, 128), updatedAt: Date.now() }; const reliable = channelByDelivery('reliable-ordered', 'events'); if (reliable && networkingState.status === 'connected') void sendNetworkPacket('interest', { center: localInterest.center, radius: localInterest.radius, sceneUuid: localInterest.sceneUuid } satisfies InterestPayload, reliable.id); return true }
/** 结构说明（自动提取）：transferNetworkAuthority；输入 entityUuid、targetPeerId；直接调用 entityUuid.slice、targetPeerId.slice、authorityTable.owner、networkingState.peerDetails.some、authorityTable.transfer 等。 */ export function transferNetworkAuthority(entityUuid: string, targetPeerId: string): boolean { const source = entityUuid.slice(0, 128), target = targetPeerId.slice(0, 80), localRole = productionSettings.networking.role, authorized = productionSettings.networking.allowAuthorityTransfer && ((localRole === 'server' || localRole === 'host') || authorityTable.owner(source) === networkingState.localPeerId) && (target === networkingState.localPeerId || networkingState.peerDetails.some(/* 比较 peer.id 与 target，返回严格相等的判断结果。 */ peer => peer.id === target)); if (!authorized || !authorityTable.transfer(source, target)) return false; interpolationTargets.delete(source); networkingState.authorityTransfers++; refreshProductionDiagnostics(); const reliable = channelByDelivery('reliable-ordered', 'events'); if (reliable && networkingState.status === 'connected') void sendNetworkPacket('authority', { entityUuid: source, targetPeerId: target } satisfies AuthorityPayload, reliable.id); return true }
/** 结构说明（自动提取）：handoffNetworkScene；输入 targetPeerId、sceneUuid、spawnTag；直接调用 targetPeerId.slice、sceneUuid.slice、networkingState.peerDetails.some、channelByDelivery、sendNetworkPacket 等。 */ export function handoffNetworkScene(targetPeerId: string, sceneUuid: string, spawnTag = ''): boolean { const localRole = productionSettings.networking.role, target = targetPeerId.slice(0, 80), scene = sceneUuid.slice(0, 128); if (!productionSettings.networking.allowSceneHandoff || (localRole !== 'server' && localRole !== 'host') || !scene || !networkingState.peerDetails.some(/* 比较 peer.id 与 target，返回严格相等的判断结果。 */ peer => peer.id === target)) return false; const reliable = channelByDelivery('reliable-ordered', 'events'); if (!reliable || networkingState.status !== 'connected') return false; networkingState.sceneHandoffs++; void sendNetworkPacket('scene', { sceneUuid: scene, spawnTag: spawnTag.slice(0, 80) } satisfies ScenePayload, reliable.id, target); return true }
/** 结构说明（自动提取）：registerNetworkSceneHandoff；输入 handler；写入 sceneHandoffHandler。 */ export function registerNetworkSceneHandoff(handler: (sceneUuid: string, spawnTag: string, peerId: string) => void | Promise<void>): () => void { sceneHandoffHandler = handler; return /** 结构说明（自动提取）：匿名回调；无显式参数；写入 sceneHandoffHandler。 */ () => { if (sceneHandoffHandler === handler) sceneHandoffHandler = null } }
/** 结构说明（自动提取）：consumeRemoteInput；输入 peerId、targetTick；直接调用 remoteInputs.get、frames.get、frames.delete、cloneNetworkInput。 */ export function consumeRemoteInput(peerId: string, targetTick = tick): InputSnapshot | null { const frames = remoteInputs.get(peerId), input = frames?.get(targetTick) ?? null; if (input) frames?.delete(targetTick); return input ? cloneNetworkInput(input) : null }
/** 结构说明（自动提取）：drainRemoteInputs；输入 maxFrames；直接调用 Math.max、Math.min、Math.round、Number、authorityTable.entries 等。 */ export function drainRemoteInputs(maxFrames = 64): RemoteNetworkInputFrame[] {
  const limit = Math.max(1, Math.min(256, Math.round(Number(maxFrames) || 64))), ownership = authorityTable.entries(), pending = [...remoteInputs].flatMap(/* 调用 [...frames].map(([frameTick, input]) => ({ peerId, tick: frameTick, input })) 并返回调用结果。 */ ([peerId, frames]) => [...frames].map(/** 构造并返回记录 { peerId, tick: frameTick, input }，字段按当前实参及捕获状态求值。 */ ([frameTick, input]) => ({ peerId, tick: frameTick, input }))).sort(/* 先计算 left.tick - right.tick；仅当其为假值时求右侧 left.peerId.localeCompare(right.peerId)，返回短路求值结果。 */ (left, right) => left.tick - right.tick || left.peerId.localeCompare(right.peerId)).slice(0, limit)
  return pending.map(/** 结构说明（自动提取）：pending.map 回调；输入 frame；直接调用 delete、remoteInputs.get、cloneNetworkInput、sort、map 等。 */ frame => { remoteInputs.get(frame.peerId)?.delete(frame.tick); return { peerId: frame.peerId, tick: frame.tick, input: cloneNetworkInput(frame.input), targetEntityUuids: ownership.filter(/* 比较 item.ownerPeerId 与 frame.peerId，返回严格相等的判断结果。 */ item => item.ownerPeerId === frame.peerId).map(/* 返回 item.entityUuid 的当前值。 */ item => item.entityUuid).sort() } })
}
/** 结构说明（自动提取）：rollbackSnapshot；输入 targetTick；直接调用 Number.isSafeInteger、find、reverse、parentFirstNetworkStates、lastEntities.find 等；写入 entity.velocity、tick、networkingState.currentTick、snapshotAccumulator；包含循环处理。 */ export function rollbackSnapshot(targetTick: number): boolean {
  if (!Number.isSafeInteger(targetTick) || targetTick < 0) return false
  const frame = [...localHistory].reverse().find(/* 比较 item.tick 与 targetTick，返回小于或等于的判断结果。 */ item => item.tick <= targetTick)
  if (!frame) return false
  for (const state of parentFirstNetworkStates(frame.snapshot.entities, lastEntities)) {
    const entity = lastEntities.find(/* 比较 candidate.uuid 与 state.uuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === state.uuid); if (!entity) continue
    const current = worldTransform(entity, lastEntities)
    setWorldTransform(entity, { ...current, position: state.position ? { x: state.position[0], y: state.position[1] } : current.position, rotation: state.rotation ?? current.rotation }, lastEntities)
    if (state.velocity) entity.velocity = { x: state.velocity[0], y: state.velocity[1] }
  }
  if (!transport) tick = frame.tick
  networkingState.currentTick = tick
  localHistory.splice(0); remoteSnapshots.splice(0); interpolationTargets.clear(); snapshotAccumulator = 0
  networkingState.rollbacks++
  rollbackTimeline.push({ tick, peerId: networkingState.localPeerId, checksumBefore: lastChecksum, checksumAfter: frame.checksum, replayedInputs: 0, correction: 0, reason: 'manual-snapshot-restore' })
  refreshProductionDiagnostics(); return true
}

/* 调用 exportMultiplayerSave(lastEntities, tick) 并返回调用结果。 */ export function multiplayerSave(): MultiplayerSaveDocument { return exportMultiplayerSave(lastEntities, tick) }
/** 结构说明（自动提取）：restoreMultiplayerSave；输入 value；直接调用 importMultiplayerSave、localHistory.splice、remoteSnapshots.splice、interpolationTargets.clear；写入 tick、networkingState.currentTick、snapshotAccumulator；返回路径包含 restored。 */ export function restoreMultiplayerSave(value: unknown): { tick: number; restored: number } {
  const restored = importMultiplayerSave(value, lastEntities)
  if (!transport) tick = restored.tick
  networkingState.currentTick = tick
  localHistory.splice(0); remoteSnapshots.splice(0); interpolationTargets.clear(); snapshotAccumulator = 0
  return restored
}

/** 结构说明（自动提取）：captureNetworkDiagnostics；无显式参数；直接调用 networkDiagnosticCapture。 */ export function captureNetworkDiagnostics(): string { return networkDiagnosticCapture(networkingState as unknown as Record<string, unknown>, networkingState.events, networkingState.packetSummaries) }
/** 结构说明（自动提取）：networkRuntimeSnapshot；无显式参数；直接调用 Object.freeze、reduce、remoteInputs.values、authorityTable.entries。 */ export function networkRuntimeSnapshot(): Readonly<{ tick: number; localHistory: number; remoteInputs: number; reliablePending: number; owners: number; interestViews: number; rollbackEntries: number; replicationDiffs: number }> { return Object.freeze({ tick, localHistory: localHistory.length, remoteInputs: [...remoteInputs.values()].reduce(/* 计算表达式 sum + frames.size 并返回结果，沿用操作数的原有类型规则。 */ (sum, frames) => sum + frames.size, 0), reliablePending: reliableWindow.size, owners: authorityTable.entries().length, interestViews: peerInterests.size, rollbackEntries: networkingState.rollbackTimeline.length, replicationDiffs: networkingState.replicationDiffs.length }) }

/** Test-only injection remains explicit and never starts a real socket. */
/** 结构说明（自动提取）：startNetworkingWithTransport；输入 testTransport；直接调用 Error、stopNetworking、cancelScheduledDeliveries、resetConnectionPeerState、networkSessionId 等；写入 networkingState.sessionId、networkingState.localPeerId、sessionEpoch、tick 等；等待异步结果；包含显式抛错路径。 */ export async function startNetworkingWithTransport(testTransport: NetworkTransport): Promise<void> { if (!productionSettings.networking.enabled || !productionSettings.networking.permissionGranted) throw new Error('Explicit enabled permission is required.'); if (productionSettings.networking.authentication.requireVerifiedPeers && productionSettings.networking.authentication.mode !== 'hook') throw new Error('Verified peers require a reviewed authentication hook.'); if (transport) await stopNetworking(); connectionGeneration++; cancelScheduledDeliveries(); resetConnectionPeerState(); networkingState.sessionId = networkSessionId(); networkingState.localPeerId ||= peerIdentity(); sessionEpoch = createNetworkEpoch(); tick = 0; snapshotAccumulator = 0; budgetStarted = performance.now(); budgetBytes = 0; receiveBudgetStarted = budgetStarted; receiveBudgetBytes = 0; authorityTable.initialize(productionSettings.networking.replicatedEntities, networkingState.localPeerId, productionSettings.networking.role); refreshProductionDiagnostics(); transport = testTransport; networkingState.transport = testTransport.kind; networkingState.status = 'connecting'; await testTransport.connect(receive, /** 将 state === 'connected' ? 'connected' : 'error' 赋给 networkingState.status，不显式返回值。 */ state => { networkingState.status = state === 'connected' ? 'connected' : 'error' }); networkingState.status = 'connected' }
