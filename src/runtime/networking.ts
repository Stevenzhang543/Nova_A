import { reactive } from 'vue'
import type { Entity } from '../world/Entity'
import { finiteNumber } from '../world/geometry'
import { setWorldTransform, worldTransform } from '../world/hierarchy'
import type { InputSnapshot } from './input'
import {
  createNetworkPacket,
  DeterministicNetworkSimulator,
  NetworkRateLimiter,
  parseNetworkPacket,
  ReliablePacketWindow,
  serializeNetworkPacket,
  stableNetworkJson,
  utf8Bytes,
  validatePayloadSchema,
  type NetworkPacket
} from './networkProtocol'
import {
  exportMultiplayerSave,
  importMultiplayerSave,
  networkDiagnosticCapture,
  recordMultiplayerReplayFrame,
  type MultiplayerSaveDocument
} from './networkReplay'
import { productionSettings, type NetworkChannelDefinition, type NetworkRpcDefinition } from './production'

export interface NetworkTransport {
  readonly kind: 'local-loopback' | 'websocket' | 'native-udp'
  connect(onMessage: (source: string, peer: string) => void, onState: (state: string) => void): Promise<void>
  send(source: string, target?: string): Promise<void>
  close(): Promise<void>
}

export interface NetworkRpcContract extends NetworkRpcDefinition {}
export interface NetworkReplicationContract { entityUuid: string; authority: 'server' | 'owner'; properties: Array<'transform' | 'rotation' | 'velocity'>; interpolate: boolean; predict: boolean }
export interface NetworkPredictionContract { rollbackFrames: number; interpolationMs: number; reconciliationThreshold: number }
export interface NetworkHeadlessContract { runtimeMode: 'headless-server'; fixedTick: true; renderer: false; roles: readonly ['server', 'host'] }
export interface NetworkDiagnosticsContract { sentBytes: number; receivedBytes: number; droppedPackets: number; pingMs: number | null; predictionCorrections: number; rollbacks: number; divergences: number; reliablePending: number }

export const NETWORKING_PACKAGE_GATE = Object.freeze({
  maturity: 'supported' as const,
  coreStabilityBlocker: false,
  optionalAndLocalFirst: true,
  protocolVersion: 2,
  requiredSuites: Object.freeze(['security', 'bandwidth', 'packet-fuzz', 'packet-loss', 'two-process-localhost', 'reconnect-late-join', 'divergence', 'headless-build', 'no-implicit-network']),
  passedSuites: Object.freeze(['security', 'bandwidth', 'packet-fuzz', 'packet-loss', 'two-process-localhost', 'reconnect-late-join', 'divergence', 'headless-build', 'no-implicit-network', 'message-bounds', 'schema-bounds', 'secret-exclusion', 'deterministic-link-simulation', 'headless-interface']),
  externalSuites: Object.freeze(['independent-hostile-network-review', 'public-internet-NAT-traversal', 'cross-host-long-soak'])
})

type EntitySnapshot = { uuid: string; position?: [number, number]; rotation?: number; velocity?: [number, number] }
type SnapshotPayload = { entities: EntitySnapshot[]; checksum: string; full: boolean }
type RpcPayload = { name: string; value: unknown }
type HelloPayload = { role: 'client' | 'server' | 'host'; playerName: string; lateJoin: boolean }

export const networkingState = reactive({
  status: 'disabled' as 'disabled' | 'permission-required' | 'connecting' | 'connected' | 'reconnecting' | 'error',
  transport: '' as '' | NetworkTransport['kind'], sessionMode: 'local' as 'local' | 'direct', sessionId: '', localPeerId: '', peers: 0,
  peerDetails: [] as Array<{ id: string; name: string; role: string; connectedAt: number; lastSeenAt: number }>,
  sentBytes: 0, receivedBytes: 0, sentPackets: 0, receivedPackets: 0, droppedPackets: 0, invalidPackets: 0, schemaRejected: 0, rateLimited: 0,
  reliableSent: 0, reliableAcknowledged: 0, reliableResent: 0, reliableExpired: 0, reliablePending: 0, duplicatePackets: 0, outOfOrderPackets: 0,
  rpcCalls: 0, rpcRejected: 0, snapshots: 0, inputFrames: 0, lateJoins: 0, rollbacks: 0, replayedInputs: 0, predictionCorrections: 0, divergences: 0,
  reconnectAttempts: 0, pingMs: null as number | null, currentTick: 0, bandwidthOutKbps: 0, bandwidthInKbps: 0,
  lastError: '', events: [] as Array<{ at: number; level: 'info' | 'warning' | 'error'; message: string }>,
  channelStats: {} as Record<string, { sent: number; received: number; dropped: number }>,
  packetSummaries: [] as Array<{ direction: 'in' | 'out'; at: number; peer: string; channel: string; kind: string; sequence: number; bytes: number; accepted: boolean }>
})

class LocalLobbyTransport implements NetworkTransport {
  readonly kind = 'local-loopback' as const
  private channel: BroadcastChannel | null = null
  async connect(onMessage: (source: string, peer: string) => void, onState: (state: string) => void): Promise<void> {
    if (typeof BroadcastChannel === 'undefined') throw new Error('This runtime does not provide local lobby channels.')
    this.channel = new BroadcastChannel(`nova-a-${networkSessionId()}`)
    this.channel.onmessage = event => { const value = event.data as { source?: unknown; peer?: unknown; target?: unknown }; if (typeof value?.source === 'string' && typeof value.peer === 'string' && value.peer !== networkingState.localPeerId && (typeof value.target !== 'string' || !value.target || value.target === networkingState.localPeerId)) onMessage(value.source, value.peer) }
    this.channel.onmessageerror = () => onState('Local lobby message could not be decoded.')
    onState('connected')
  }
  async send(source: string, target = ''): Promise<void> { if (!this.channel) throw new Error('Local lobby is not open.'); this.channel.postMessage({ source, peer: networkingState.localPeerId, target }) }
  async close(): Promise<void> { this.channel?.close(); this.channel = null }
}

class WebSocketTransport implements NetworkTransport {
  readonly kind = 'websocket' as const
  private socket: WebSocket | null = null
  async connect(onMessage: (source: string, peer: string) => void, onState: (state: string) => void): Promise<void> {
    if (!/^wss?:\/\//i.test(productionSettings.networking.endpoint)) throw new Error('WebSocket endpoint must begin with ws:// or wss://.')
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(productionSettings.networking.endpoint); this.socket = socket
      const timeout = globalThis.setTimeout(() => reject(new Error('WebSocket connection timed out.')), 10_000)
      socket.onopen = () => { clearTimeout(timeout); onState('connected'); resolve() }
      socket.onmessage = event => onMessage(typeof event.data === 'string' ? event.data : '', 'websocket-peer')
      socket.onerror = () => { clearTimeout(timeout); reject(new Error('WebSocket transport failed.')) }
      socket.onclose = () => onState('closed')
    })
  }
  async send(source: string): Promise<void> { if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('WebSocket is not connected.'); this.socket.send(source) }
  async close(): Promise<void> { this.socket?.close(1000, 'Nova_A session stopped'); this.socket = null }
}

class NativeUdpTransport implements NetworkTransport {
  readonly kind = 'native-udp' as const
  private socketId: number | null = null
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private peers = new Set<string>()
  async connect(onMessage: (source: string, peer: string) => void, onState: (state: string) => void): Promise<void> {
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) throw new Error('Native UDP transport is available only in a Nova_A desktop player.')
    const { invoke } = await import('@tauri-apps/api/core')
    this.socketId = await invoke<number>('udp_open', { bindAddress: productionSettings.networking.bindAddress })
    const poll = async () => {
      if (this.socketId === null) return
      try {
        const packets = await invoke<Array<{ source: string; payload: string }>>('udp_receive', { socketId: this.socketId, maximum: 64 })
        for (const packet of packets) { this.peers.add(packet.source); onMessage(packet.payload, packet.source) }
      } catch (error) { onState(error instanceof Error ? error.message : String(error)) }
      if (this.socketId !== null) this.pollTimer = globalThis.setTimeout(poll, 8)
    }
    onState('connected'); void poll()
  }
  async send(source: string, target = ''): Promise<void> {
    if (this.socketId === null) throw new Error('UDP socket is not open.')
    const { invoke } = await import('@tauri-apps/api/core')
    const configured = productionSettings.networking.endpoint.replace(/^udp:\/\//i, '')
    const targets = target ? [target] : productionSettings.networking.role === 'client' || !this.peers.size ? [configured] : [...this.peers]
    for (const destination of [...new Set(targets)].slice(0, productionSettings.networking.maxPeers)) await invoke('udp_send', { socketId: this.socketId, target: destination, payload: source })
  }
  async close(): Promise<void> {
    if (this.pollTimer !== null) clearTimeout(this.pollTimer); this.pollTimer = null
    if (this.socketId !== null) { const { invoke } = await import('@tauri-apps/api/core'); await invoke('udp_close', { socketId: this.socketId }) }
    this.socketId = null; this.peers.clear()
  }
}

let transport: NetworkTransport | null = null
let tick = 0, lastSnapshotAt = 0, reconnectTimer: ReturnType<typeof setTimeout> | null = null, simulator = new DeterministicNetworkSimulator(productionSettings.networking.simulation.seed)
let budgetStarted = performance.now(), budgetBytes = 0, receiveBudgetStarted = performance.now(), receiveBudgetBytes = 0
let lastEntities: Entity[] = [], lastInput: InputSnapshot | null = null, lastChecksum = ''
const sequenceByChannel = new Map<string, number>(), inboundSequences = new Map<string, number>(), reliableBuffers = new Map<string, Map<number, NetworkPacket>>()
let reliableWindow = new ReliablePacketWindow(productionSettings.networking.maximumPendingReliable)
const outboundRate = new NetworkRateLimiter(), inboundRate = new NetworkRateLimiter(), rpcRate = new NetworkRateLimiter()
const rpcHandlers = new Map<string, (payload: unknown, context: { sender: string; tick: number }) => void>()
const remoteSnapshots: NetworkPacket[] = [], remoteInputs = new Map<string, Map<number, InputSnapshot>>()
const localHistory: Array<{ tick: number; input: InputSnapshot; checksum: string; snapshot: SnapshotPayload }> = []

function cloneInput(input: InputSnapshot): InputSnapshot { return structuredClone(input) }
function networkSessionId(): string { let hash = 0x811c9dc5; const source = `${productionSettings.networking.sessionName}:${productionSettings.networking.schemaVersion}`; for (const char of source) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193); return `session-${(hash >>> 0).toString(16).padStart(8, '0')}` }
function peerIdentity(): string { const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; return `${productionSettings.networking.playerName.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 32)}-${uuid.slice(0, 12)}` }
function channel(id: string): NetworkChannelDefinition | null { return productionSettings.networking.channels.find(item => item.id === id) ?? null }
function channelByDelivery(delivery: NetworkChannelDefinition['delivery'], preferred: string): NetworkChannelDefinition | null { return channel(preferred) ?? productionSettings.networking.channels.find(item => item.delivery === delivery) ?? null }
function addEvent(message: string, level: 'info' | 'warning' | 'error' = 'info'): void { networkingState.events.push({ at: Date.now(), level, message: message.slice(0, 300) }); if (networkingState.events.length > 500) networkingState.events.splice(0, networkingState.events.length - 500) }
function channelStat(id: string): { sent: number; received: number; dropped: number } { return networkingState.channelStats[id] ??= { sent: 0, received: 0, dropped: 0 } }
function packetSummary(direction: 'in' | 'out', peer: string, packet: NetworkPacket, bytes: number, accepted: boolean): void { networkingState.packetSummaries.push({ direction, at: Date.now(), peer: peer.slice(0, 80), channel: packet.channel, kind: packet.kind, sequence: packet.sequence, bytes, accepted }); if (networkingState.packetSummaries.length > 1_000) networkingState.packetSummaries.splice(0, networkingState.packetSummaries.length - 1_000) }
function updatePeer(id: string, payload?: HelloPayload): void { const now = Date.now(), existing = networkingState.peerDetails.find(peer => peer.id === id); if (existing) { existing.lastSeenAt = now; if (payload) { existing.name = payload.playerName; existing.role = payload.role }; return }; if (networkingState.peerDetails.length >= productionSettings.networking.maxPeers) return; networkingState.peerDetails.push({ id, name: payload?.playerName ?? id, role: payload?.role ?? 'peer', connectedAt: now, lastSeenAt: now }); networkingState.peers = networkingState.peerDetails.length }
function nextSequence(channelId: string): number { const next = ((sequenceByChannel.get(channelId) ?? 0) + 1) & 0x7fff_ffff; sequenceByChannel.set(channelId, next || 1); return next || 1 }
function protocolLimits() { return { maximumPacketBytes: productionSettings.networking.maximumPacketBytes, maximumMessagesPerSecond: productionSettings.networking.maximumMessagesPerSecond, schemaVersion: productionSettings.networking.schemaVersion } }

async function transportSend(source: string, packet: NetworkPacket, target: string, resend = false): Promise<boolean> {
  if (!transport || networkingState.status !== 'connected') return false
  const bytes = utf8Bytes(source), decision = simulator.decide(productionSettings.networking.simulation)
  if (decision.dropped) { networkingState.droppedPackets++; channelStat(packet.channel).dropped++; packetSummary('out', target || '*', packet, bytes, false); return packet.delivery === 'reliable-ordered' }
  const deliver = async () => { try { await transport?.send(source, target); networkingState.sentBytes += bytes; networkingState.sentPackets++; channelStat(packet.channel).sent++; packetSummary('out', target || '*', packet, bytes, true); if (resend) networkingState.reliableResent++; return true } catch (error) { networkingState.lastError = error instanceof Error ? error.message : String(error); networkingState.droppedPackets++; channelStat(packet.channel).dropped++; return false } }
  for (let copy = 0; copy < decision.copies; copy++) { const delay = decision.delayMs + copy; if (delay) globalThis.setTimeout(() => { void deliver() }, delay); else await deliver() }
  return true
}

export async function sendNetworkPacket(kind: NetworkPacket['kind'], payload: unknown, channelId: string, target = ''): Promise<boolean> {
  if (!transport || networkingState.status !== 'connected' || !productionSettings.networking.enabled || !productionSettings.networking.permissionGranted) return false
  const contract = channel(channelId); if (!contract) { networkingState.lastError = `Unknown network channel ${channelId}.`; return false }
  const now = performance.now()
  if (!outboundRate.accept('global', productionSettings.networking.maximumMessagesPerSecond, now) || !outboundRate.accept(channelId, contract.messagesPerSecond, now)) { networkingState.rateLimited++; channelStat(channelId).dropped++; return false }
  const packet = createNetworkPacket({ sessionId: networkingState.sessionId, sender: networkingState.localPeerId, channel: channelId, delivery: contract.delivery, sequence: nextSequence(channelId), ack: null, tick, schema: productionSettings.networking.schemaVersion, kind, payload })
  let source: string
  try { source = serializeNetworkPacket(packet) } catch (error) { networkingState.lastError = error instanceof Error ? error.message : String(error); networkingState.schemaRejected++; return false }
  const bytes = utf8Bytes(source)
  if (bytes > productionSettings.networking.maximumPacketBytes || utf8Bytes(stableNetworkJson(payload)) > contract.maximumPayloadBytes) { networkingState.droppedPackets++; channelStat(channelId).dropped++; return false }
  if (now - budgetStarted >= 1_000) { networkingState.bandwidthOutKbps = Math.round(budgetBytes * 8 / 1024); budgetStarted = now; budgetBytes = 0 }
  const limit = productionSettings.networking.bandwidthKbps * 1024 / 8
  if (budgetBytes + bytes > limit) { networkingState.droppedPackets++; channelStat(channelId).dropped++; return false }
  budgetBytes += bytes
  const targets = packet.delivery === 'reliable-ordered' && packet.kind !== 'ack' && !target && networkingState.peerDetails.length ? networkingState.peerDetails.map(peer => peer.id) : [target]
  if (packet.delivery === 'reliable-ordered' && packet.kind !== 'ack') {
    for (const destination of targets) { if (!reliableWindow.track(destination || '*', packet, source, now)) { networkingState.droppedPackets++; networkingState.reliableExpired++; return false }; networkingState.reliableSent++ }
    networkingState.reliablePending = reliableWindow.size
  }
  const delivered = await Promise.all(targets.map(destination => transportSend(source, packet, destination)))
  return delivered.every(Boolean)
}

async function sendAck(packet: NetworkPacket, peer: string): Promise<void> { const ack = createNetworkPacket({ sessionId: networkingState.sessionId, sender: networkingState.localPeerId, channel: packet.channel, delivery: packet.delivery, sequence: 0, ack: packet.sequence, tick, schema: productionSettings.networking.schemaVersion, kind: 'ack', payload: null }); await transportSend(serializeNetworkPacket(ack), ack, peer) }
function acceptsRpc(contract: NetworkRpcDefinition, remoteRole: string): boolean { const localRole = productionSettings.networking.role; const direction = contract.direction === 'bidirectional' || (contract.direction === 'client-to-server' && (localRole === 'server' || localRole === 'host') && remoteRole === 'client') || (contract.direction === 'server-to-client' && localRole === 'client' && (remoteRole === 'server' || remoteRole === 'host')); const authority = contract.authority === 'any' || contract.authority === 'owner' || (contract.authority === 'server' && (remoteRole === 'server' || remoteRole === 'host')); return direction && authority }
function normalizeEntitySnapshot(value: unknown): EntitySnapshot[] { if (!Array.isArray(value)) return []; return value.slice(0, 2_000).flatMap(raw => { if (!raw || typeof raw !== 'object' || typeof (raw as Record<string, unknown>).uuid !== 'string') return []; const item = raw as Record<string, unknown>, output: EntitySnapshot = { uuid: String(item.uuid).slice(0, 128) }, position = item.position, velocity = item.velocity; if (Array.isArray(position) && position.length === 2 && position.every(Number.isFinite)) output.position = [Number(position[0]), Number(position[1])]; if (typeof item.rotation === 'number' && Number.isFinite(item.rotation)) output.rotation = item.rotation; if (Array.isArray(velocity) && velocity.length === 2 && velocity.every(Number.isFinite)) output.velocity = [Number(velocity[0]), Number(velocity[1])]; return output.position || output.rotation !== undefined || output.velocity ? [output] : [] }) }

function processPacket(packet: NetworkPacket, peer: string): void {
  if (packet.kind === 'ack') { if (packet.ack !== null && reliableWindow.acknowledge(peer, packet.channel, packet.ack)) networkingState.reliableAcknowledged++; networkingState.reliablePending = reliableWindow.size; return }
  if (packet.kind === 'hello' || packet.kind === 'join') { const payload = packet.payload && typeof packet.payload === 'object' ? packet.payload as Partial<HelloPayload> : {}, hello: HelloPayload = { role: payload.role === 'server' || payload.role === 'host' ? payload.role : 'client', playerName: typeof payload.playerName === 'string' ? payload.playerName.slice(0, 80) : packet.sender, lateJoin: payload.lateJoin === true }, wasKnown = networkingState.peerDetails.some(item => item.id === packet.sender); updatePeer(packet.sender, hello); const reliable = channelByDelivery('reliable-ordered', 'events'); if (!wasKnown && packet.kind === 'hello' && reliable) void sendNetworkPacket('join', { role: productionSettings.networking.role, playerName: productionSettings.networking.playerName, lateJoin: productionSettings.networking.lateJoin } satisfies HelloPayload, reliable.id, peer); if (!wasKnown && tick > 0 && productionSettings.networking.lateJoin && (productionSettings.networking.role === 'server' || productionSettings.networking.role === 'host')) { networkingState.lateJoins++; if (reliable) void sendNetworkPacket('resync', { ...localSnapshot(lastEntities, true), sessionSave: exportMultiplayerSave(lastEntities, tick) }, reliable.id, peer) }; addEvent(`${hello.playerName} joined as ${hello.role}.`); return }
  updatePeer(packet.sender)
  if (packet.kind === 'leave') { const index = networkingState.peerDetails.findIndex(item => item.id === packet.sender); if (index >= 0) networkingState.peerDetails.splice(index, 1); networkingState.peers = networkingState.peerDetails.length; addEvent(`${packet.sender} left.`); return }
  if (packet.kind === 'rpc') { networkingState.rpcCalls++; const payload = packet.payload && typeof packet.payload === 'object' ? packet.payload as Partial<RpcPayload> : {}, contract = productionSettings.networking.rpcContracts.find(item => item.name === payload.name), remoteRole = networkingState.peerDetails.find(item => item.id === packet.sender)?.role ?? 'client'; if (!contract || !acceptsRpc(contract, remoteRole) || !validatePayloadSchema(payload.value, contract.payloadSchema) || utf8Bytes(stableNetworkJson(payload.value)) > contract.maximumPayloadBytes || !rpcRate.accept(`${packet.sender}:${contract.name}`, contract.callsPerSecond, performance.now())) { networkingState.rpcRejected++; networkingState.schemaRejected++; return }; try { rpcHandlers.get(contract.name)?.(payload.value, { sender: packet.sender, tick: packet.tick }) } catch (error) { networkingState.lastError = error instanceof Error ? error.message : String(error); addEvent(`RPC ${contract.name} failed: ${networkingState.lastError}`, 'error') }; return }
  if (packet.kind === 'input') { if (!packet.payload || typeof packet.payload !== 'object') return; const frames = remoteInputs.get(packet.sender) ?? new Map<number, InputSnapshot>(); frames.set(packet.tick, cloneInput(packet.payload as InputSnapshot)); while (frames.size > productionSettings.networking.rollbackFrames) frames.delete(frames.keys().next().value ?? 0); remoteInputs.set(packet.sender, frames); networkingState.inputFrames++; return }
  if (packet.kind === 'snapshot' || packet.kind === 'resync') { const payload = packet.payload && typeof packet.payload === 'object' ? packet.payload as Partial<SnapshotPayload> & { sessionSave?: MultiplayerSaveDocument } : {}, entities = normalizeEntitySnapshot(payload.entities); remoteSnapshots.push({ ...packet, payload: { entities, checksum: typeof payload.checksum === 'string' ? payload.checksum.slice(0, 64) : '', full: payload.full === true } }); if (remoteSnapshots.length > 128) remoteSnapshots.splice(0, remoteSnapshots.length - 128); if (packet.kind === 'resync' && payload.sessionSave && productionSettings.networking.lateJoin) { try { const restored = importMultiplayerSave(payload.sessionSave, lastEntities); tick = Math.max(tick, restored.tick); addEvent(`Late-join state restored for ${restored.restored} entities.`) } catch (error) { networkingState.lastError = error instanceof Error ? error.message : String(error); networkingState.schemaRejected++ } }; networkingState.snapshots++; return }
  if (packet.kind === 'ping') { const reliable = channelByDelivery('reliable-ordered', packet.channel); if (reliable) void sendNetworkPacket('pong', { sentAt: (packet.payload as { sentAt?: unknown })?.sentAt ?? 0 }, reliable.id, peer); return }
  if (packet.kind === 'pong') { const sentAt = Number((packet.payload as { sentAt?: unknown })?.sentAt); if (Number.isFinite(sentAt)) networkingState.pingMs = Math.max(0, performance.now() - sentAt) }
}

function receive(source: string, peer: string): void {
  const bytes = utf8Bytes(source), now = performance.now()
  if (now - receiveBudgetStarted >= 1_000) { networkingState.bandwidthInKbps = Math.round(receiveBudgetBytes * 8 / 1024); receiveBudgetStarted = now; receiveBudgetBytes = 0 }
  const limit = productionSettings.networking.bandwidthKbps * 1024 / 8
  if (receiveBudgetBytes + bytes > limit || !inboundRate.accept('global', productionSettings.networking.maximumMessagesPerSecond, now)) { networkingState.droppedPackets++; networkingState.rateLimited++; return }
  receiveBudgetBytes += bytes
  const parsed = parseNetworkPacket(source, protocolLimits(), productionSettings.networking.channels, networkingState.sessionId)
  if (!parsed.packet) { networkingState.droppedPackets++; networkingState.invalidPackets++; networkingState.lastError = parsed.error; return }
  const packet = parsed.packet, contract = channel(packet.channel)
  if (!contract || !inboundRate.accept(`${packet.sender}:${packet.channel}`, contract.messagesPerSecond, now)) { networkingState.rateLimited++; channelStat(packet.channel).dropped++; packetSummary('in', peer, packet, bytes, false); return }
  networkingState.receivedBytes += bytes; networkingState.receivedPackets++; channelStat(packet.channel).received++; packetSummary('in', peer, packet, bytes, true)
  if (packet.delivery === 'reliable-ordered' && packet.kind !== 'ack') void sendAck(packet, peer)
  const sequenceKey = `${packet.sender}:${packet.channel}`
  if (packet.delivery === 'reliable-ordered' && !inboundSequences.has(sequenceKey) && packet.sequence > 1 && (packet.kind === 'hello' || packet.kind === 'join' || packet.kind === 'resync')) inboundSequences.set(sequenceKey, packet.sequence - 1)
  const previous = inboundSequences.get(sequenceKey) ?? 0
  if (packet.delivery === 'unreliable-sequenced') { if (packet.sequence <= previous) { networkingState.duplicatePackets++; return }; inboundSequences.set(sequenceKey, packet.sequence); processPacket(packet, peer); return }
  if (packet.kind === 'ack') { processPacket(packet, peer); return }
  if (packet.sequence <= previous) { networkingState.duplicatePackets++; return }
  const buffer = reliableBuffers.get(sequenceKey) ?? new Map<number, NetworkPacket>(); buffer.set(packet.sequence, packet); reliableBuffers.set(sequenceKey, buffer); if (packet.sequence > previous + 1) networkingState.outOfOrderPackets++
  let expected = previous + 1
  while (buffer.has(expected)) { const ordered = buffer.get(expected)!; buffer.delete(expected); inboundSequences.set(sequenceKey, expected); processPacket(ordered, peer); expected++ }
}

function scheduleReconnect(): void { if (!productionSettings.networking.enabled || !productionSettings.networking.permissionGranted || !productionSettings.networking.reconnect || networkingState.status === 'disabled' || reconnectTimer !== null) return; if (networkingState.reconnectAttempts >= productionSettings.networking.reconnectMaxAttempts) { networkingState.status = 'error'; networkingState.lastError = 'Reconnect attempt limit reached.'; return }; networkingState.status = 'reconnecting'; const delay = Math.min(10_000, 500 * 2 ** Math.min(5, networkingState.reconnectAttempts++)); reconnectTimer = globalThis.setTimeout(async () => { reconnectTimer = null; const active = transport; transport = null; if (active) try { await active.close() } catch {}; await startNetworking() }, delay) }

export async function startNetworking(): Promise<void> {
  if (!productionSettings.networking.enabled) throw new Error('Networking is disabled for this project.')
  if (!productionSettings.networking.permissionGranted) { networkingState.status = 'permission-required'; throw new Error('Network permission must be granted explicitly before a session starts.') }
  if (transport) return
  networkingState.status = 'connecting'; networkingState.lastError = ''; networkingState.sessionMode = productionSettings.networking.sessionMode; networkingState.sessionId = networkSessionId(); networkingState.localPeerId ||= peerIdentity(); simulator = new DeterministicNetworkSimulator(productionSettings.networking.simulation.seed); reliableWindow = new ReliablePacketWindow(productionSettings.networking.maximumPendingReliable)
  transport = productionSettings.networking.sessionMode === 'local' ? new LocalLobbyTransport() : productionSettings.networking.transport === 'native-udp' ? new NativeUdpTransport() : new WebSocketTransport(); networkingState.transport = transport.kind
  try { await transport.connect(receive, state => { if (state === 'connected') networkingState.status = 'connected'; else if (networkingState.status !== 'disabled') { networkingState.lastError = state; scheduleReconnect() } }); networkingState.status = 'connected'; networkingState.reconnectAttempts = 0; addEvent(`${transport.kind} session started; no Nova_A cloud service is involved.`); const reliable = channelByDelivery('reliable-ordered', 'events'); if (!reliable) throw new Error('At least one reliable channel is required for session control.'); await sendNetworkPacket('hello', { role: productionSettings.networking.role, playerName: productionSettings.networking.playerName, lateJoin: productionSettings.networking.lateJoin } satisfies HelloPayload, reliable.id) }
  catch (error) { networkingState.status = 'error'; networkingState.lastError = error instanceof Error ? error.message : String(error); addEvent(networkingState.lastError, 'error'); const active = transport; transport = null; if (active) try { await active.close() } catch {}; scheduleReconnect(); throw error }
}

export async function stopNetworking(disableState = true): Promise<void> { if (reconnectTimer !== null) clearTimeout(reconnectTimer); reconnectTimer = null; if (transport && networkingState.status === 'connected') { const reliable = channelByDelivery('reliable-ordered', 'events'); if (reliable) await sendNetworkPacket('leave', null, reliable.id) }; const active = transport; transport = null; if (active) try { await active.close() } catch {}; remoteSnapshots.splice(0); remoteInputs.clear(); localHistory.splice(0); inboundSequences.clear(); reliableBuffers.clear(); reliableWindow.clear(); outboundRate.clear(); inboundRate.clear(); rpcRate.clear(); networkingState.peerDetails.splice(0); networkingState.peers = 0; networkingState.reliablePending = 0; if (disableState) { networkingState.status = 'disabled'; networkingState.reconnectAttempts = 0 } }

function localSnapshot(entities: Entity[], full = false): SnapshotPayload { const definitions = new Map(productionSettings.networking.replicatedEntities.map(definition => [definition.entityUuid, definition])); return { checksum: lastChecksum, full, entities: entities.flatMap(entity => { const definition = definitions.get(entity.uuid); if (!definition) return []; const sendsAuthority = productionSettings.networking.role === 'client' ? definition.authority === 'owner' : definition.authority === 'server'; if (!sendsAuthority) return []; const transform = worldTransform(entity, entities), snapshot: EntitySnapshot = { uuid: entity.uuid }; if (definition.properties.includes('transform')) snapshot.position = [finiteNumber(transform.position.x), finiteNumber(transform.position.y)]; if (definition.properties.includes('rotation')) snapshot.rotation = finiteNumber(transform.rotation); if (definition.properties.includes('velocity')) snapshot.velocity = [finiteNumber(entity.velocity.x), finiteNumber(entity.velocity.y)]; return snapshot.position || snapshot.rotation !== undefined || snapshot.velocity ? [snapshot] : [] }).slice(0, 2_000) } }

function reconcile(snapshotPacket: NetworkPacket, entities: Entity[]): void {
  const payload = snapshotPacket.payload as SnapshotPayload, history = localHistory.find(item => item.tick === snapshotPacket.tick)
  if (payload.checksum && history?.checksum && payload.checksum !== history.checksum) { networkingState.divergences++; networkingState.rollbacks++; networkingState.replayedInputs += localHistory.filter(item => item.tick > snapshotPacket.tick).length }
  const definitions = new Map(productionSettings.networking.replicatedEntities.map(definition => [definition.entityUuid, definition]))
  for (const remote of payload.entities) { const definition = definitions.get(remote.uuid), entity = entities.find(candidate => candidate.uuid === remote.uuid), peerRole = networkingState.peerDetails.find(item => item.id === snapshotPacket.sender)?.role ?? 'server', receivesAuthority = productionSettings.networking.role === 'client' ? definition?.authority === 'server' : definition?.authority === 'owner' && peerRole === 'client'; if (!definition || !entity || !receivesAuthority) continue; const current = worldTransform(entity, entities), blend = definition.interpolate ? Math.min(1, 16 / Math.max(1, productionSettings.networking.interpolationMs)) : 1, remoteVelocity = remote.velocity ?? [entity.velocity.x, entity.velocity.y], predictionSeconds = definition.predict ? Math.min(.25, Math.max(0, productionSettings.networking.interpolationMs / 1_000)) : 0, targetX = remote.position ? remote.position[0] + remoteVelocity[0] * predictionSeconds : current.position.x, targetY = remote.position ? remote.position[1] + remoteVelocity[1] * predictionSeconds : current.position.y, error = Math.hypot(targetX - current.position.x, targetY - current.position.y); if (definition.predict && error > productionSettings.networking.reconciliationThreshold) networkingState.predictionCorrections++; setWorldTransform(entity, { ...current, position: { x: current.position.x + (targetX - current.position.x) * blend, y: current.position.y + (targetY - current.position.y) * blend }, rotation: remote.rotation === undefined ? current.rotation : current.rotation + (remote.rotation - current.rotation) * blend }, entities); if (remote.velocity) entity.velocity = { x: remote.velocity[0], y: remote.velocity[1] } }
}

export function updateNetworking(entities: Entity[], fixedDelta: number, input?: InputSnapshot, physicsChecksum = ''): void {
  if (!transport || networkingState.status !== 'connected') return
  tick++; networkingState.currentTick = tick; lastEntities = entities; lastInput = input ? cloneInput(input) : lastInput; lastChecksum = physicsChecksum.slice(0, 64)
  const snapshot = localSnapshot(entities)
  if (lastInput) localHistory.push({ tick, input: cloneInput(lastInput), checksum: lastChecksum, snapshot })
  if (localHistory.length > productionSettings.networking.rollbackFrames) localHistory.splice(0, localHistory.length - productionSettings.networking.rollbackFrames)
  const inputChannel = channelByDelivery('unreliable-sequenced', 'input'); if (lastInput && inputChannel && (productionSettings.networking.role === 'client' || productionSettings.networking.role === 'host')) void sendNetworkPacket('input', lastInput, inputChannel.id)
  const interval = 1 / productionSettings.networking.snapshotRate
  if ((performance.now() - lastSnapshotAt) / 1_000 >= interval) { lastSnapshotAt = performance.now(); const stateChannel = channelByDelivery('unreliable-sequenced', 'state'); if (stateChannel && snapshot.entities.length) void sendNetworkPacket('snapshot', snapshot, stateChannel.id) }
  while (remoteSnapshots.length) reconcile(remoteSnapshots.shift()!, entities)
  for (const pending of reliableWindow.due(performance.now(), productionSettings.networking.reliableRetryMs, productionSettings.networking.reliableMaximumAttempts)) void transportSend(pending.source, pending.packet, pending.peer === '*' ? '' : pending.peer, true)
  networkingState.reliablePending = reliableWindow.size
  const inputs = [...remoteInputs].flatMap(([peerId, frames]) => { const value = frames.get(tick); return value ? [{ peerId, input: value }] : [] }); if (lastInput) inputs.push({ peerId: networkingState.localPeerId, input: lastInput })
  recordMultiplayerReplayFrame(tick, inputs, lastChecksum, networkingState.packetSummaries.slice(-32))
  if (tick % Math.max(1, Math.round(1 / Math.max(.0001, fixedDelta))) === 0) { const reliable = channelByDelivery('reliable-ordered', 'events'); if (reliable) void sendNetworkPacket('ping', { sentAt: performance.now() }, reliable.id) }
}

export function registerRpc(name: string, handler: (payload: unknown, context: { sender: string; tick: number }) => void): () => void { const key = name.trim().replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 80); rpcHandlers.set(key, handler); return () => rpcHandlers.delete(key) }
export function callRpc(name: string, payload: unknown): boolean { const contract = productionSettings.networking.rpcContracts.find(item => item.name === name), localRole = productionSettings.networking.role; if (!contract) { networkingState.rpcRejected++; return false }; const direction = contract.direction === 'bidirectional' || (contract.direction === 'client-to-server' && localRole === 'client') || (contract.direction === 'server-to-client' && (localRole === 'server' || localRole === 'host')), authority = contract.authority === 'any' || contract.authority === 'owner' || (contract.authority === 'server' && (localRole === 'server' || localRole === 'host')); if (!direction || !authority || !validatePayloadSchema(payload, contract.payloadSchema)) { networkingState.rpcRejected++; return false }; networkingState.rpcCalls++; void sendNetworkPacket('rpc', { name: contract.name, value: payload }, contract.channelId); return true }
export function consumeRemoteInput(peerId: string, targetTick = tick): InputSnapshot | null { const frames = remoteInputs.get(peerId), input = frames?.get(targetTick) ?? null; if (input) frames?.delete(targetTick); return input ? cloneInput(input) : null }
export function rollbackSnapshot(targetTick: number): boolean { const frame = [...localHistory].reverse().find(item => item.tick <= targetTick), stateChannel = channelByDelivery('unreliable-sequenced', 'state'); if (!frame || !stateChannel) return false; networkingState.rollbacks++; remoteSnapshots.push(createNetworkPacket({ sessionId: networkingState.sessionId, sender: networkingState.localPeerId, channel: stateChannel.id, delivery: stateChannel.delivery, sequence: 0, ack: null, tick: frame.tick, schema: productionSettings.networking.schemaVersion, kind: 'snapshot', payload: frame.snapshot })); return true }
export function multiplayerSave(): MultiplayerSaveDocument { return exportMultiplayerSave(lastEntities, tick) }
export function restoreMultiplayerSave(value: unknown): { tick: number; restored: number } { const restored = importMultiplayerSave(value, lastEntities); tick = restored.tick; return restored }
export function captureNetworkDiagnostics(): string { return networkDiagnosticCapture(networkingState as unknown as Record<string, unknown>, networkingState.events, networkingState.packetSummaries) }
export function networkRuntimeSnapshot(): Readonly<{ tick: number; localHistory: number; remoteInputs: number; reliablePending: number }> { return Object.freeze({ tick, localHistory: localHistory.length, remoteInputs: [...remoteInputs.values()].reduce((sum, frames) => sum + frames.size, 0), reliablePending: reliableWindow.size }) }

/** Test-only injection remains explicit and never starts a real socket. */
export async function startNetworkingWithTransport(testTransport: NetworkTransport): Promise<void> { if (!productionSettings.networking.enabled || !productionSettings.networking.permissionGranted) throw new Error('Explicit enabled permission is required.'); if (transport) await stopNetworking(); networkingState.sessionId = networkSessionId(); networkingState.localPeerId ||= peerIdentity(); transport = testTransport; networkingState.transport = testTransport.kind; networkingState.status = 'connecting'; await testTransport.connect(receive, state => { networkingState.status = state === 'connected' ? 'connected' : 'error' }); networkingState.status = 'connected' }
