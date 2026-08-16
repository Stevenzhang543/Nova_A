import { reactive } from 'vue'
import type { Entity } from '../world/Entity'
import { finiteNumber } from '../world/geometry'
import { worldTransform, setWorldTransform } from '../world/hierarchy'
import { productionSettings } from './production'

type NetworkMessage =
  | { type: 'hello'; role: string; protocol: 1 }
  | { type: 'rpc'; id: number; name: string; payload: unknown }
  | { type: 'snapshot'; tick: number; sentAt: number; entities: Array<{ uuid: string; position?: [number, number]; rotation?: number; velocity?: [number, number] }> }

interface NetworkTransport {
  readonly kind: 'websocket' | 'native-udp'
  connect(onMessage: (source: string) => void, onState: (state: string) => void): Promise<void>
  send(source: string): Promise<void>
  close(): Promise<void>
}

export const networkingState = reactive({
  status: 'disabled' as 'disabled' | 'connecting' | 'connected' | 'reconnecting' | 'error',
  transport: '' as '' | 'websocket' | 'native-udp',
  peers: 0,
  sentBytes: 0,
  receivedBytes: 0,
  sentPackets: 0,
  receivedPackets: 0,
  droppedPackets: 0,
  rpcCalls: 0,
  snapshots: 0,
  rollbacks: 0,
  predictionCorrections: 0,
  reconnectAttempts: 0,
  pingMs: null as number | null,
  lastError: '',
  events: [] as Array<{ at: number; message: string }>
})

class WebSocketTransport implements NetworkTransport {
  readonly kind = 'websocket' as const
  private socket: WebSocket | null = null
  async connect(onMessage: (source: string) => void, onState: (state: string) => void): Promise<void> {
    if (!/^wss?:\/\//i.test(productionSettings.networking.endpoint)) throw new Error('WebSocket endpoint must begin with ws:// or wss://')
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(productionSettings.networking.endpoint); this.socket = socket
      const timeout = window.setTimeout(() => reject(new Error('WebSocket connection timed out')), 10_000)
      socket.onopen = () => { clearTimeout(timeout); onState('connected'); resolve() }
      socket.onmessage = event => onMessage(typeof event.data === 'string' ? event.data : '')
      socket.onerror = () => { clearTimeout(timeout); reject(new Error('WebSocket transport failed')) }
      socket.onclose = () => onState('closed')
    })
  }
  async send(source: string): Promise<void> { if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('WebSocket is not connected'); this.socket.send(source) }
  async close(): Promise<void> { this.socket?.close(1000, 'Nova_A session stopped'); this.socket = null }
}

class NativeUdpTransport implements NetworkTransport {
  readonly kind = 'native-udp' as const
  private socketId: number | null = null
  private pollTimer: number | null = null
  async connect(onMessage: (source: string) => void, onState: (state: string) => void): Promise<void> {
    if (!('__TAURI_INTERNALS__' in window)) throw new Error('Native UDP transport is available only in a Nova_A desktop player')
    const { invoke } = await import('@tauri-apps/api/core')
    this.socketId = await invoke<number>('udp_open', { bindAddress: productionSettings.networking.bindAddress })
    const poll = async () => {
      if (this.socketId === null) return
      try {
        const packets = await invoke<Array<{ source: string; payload: string }>>('udp_receive', { socketId: this.socketId, maximum: 64 })
        for (const packet of packets) onMessage(packet.payload)
      } catch (error) { onState(error instanceof Error ? error.message : String(error)) }
      if (this.socketId !== null) this.pollTimer = window.setTimeout(poll, 8)
    }
    onState('connected'); void poll()
  }
  async send(source: string): Promise<void> {
    if (this.socketId === null) throw new Error('UDP socket is not open')
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('udp_send', { socketId: this.socketId, target: productionSettings.networking.endpoint.replace(/^udp:\/\//i, ''), payload: source })
  }
  async close(): Promise<void> {
    if (this.pollTimer !== null) clearTimeout(this.pollTimer); this.pollTimer = null
    if (this.socketId !== null) { const { invoke } = await import('@tauri-apps/api/core'); await invoke('udp_close', { socketId: this.socketId }) }
    this.socketId = null
  }
}

let transport: NetworkTransport | null = null
let rpcId = 1, tick = 0, lastSnapshotAt = 0, budgetStarted = performance.now(), budgetBytes = 0
let receiveBudgetStarted = performance.now(), receiveBudgetBytes = 0
let reconnectTimer: number | null = null
const rpcHandlers = new Map<string, (payload: unknown) => void>()
const remoteSnapshots: Array<Extract<NetworkMessage, { type: 'snapshot' }>> = []
const rollbackHistory: Array<{ tick: number; snapshot: Extract<NetworkMessage, { type: 'snapshot' }> }> = []

function event(message: string): void { networkingState.events.push({ at: Date.now(), message: message.slice(0, 300) }); if (networkingState.events.length > 200) networkingState.events.splice(0, networkingState.events.length - 200) }
function safeMessage(source: string): NetworkMessage | null {
  if (source.length > 1_000_000) return null
  try {
    const value = JSON.parse(source) as Record<string, unknown>
    if (value.type === 'hello' && typeof value.role === 'string' && value.protocol === 1) return { type: 'hello', role: value.role.slice(0, 20), protocol: 1 }
    if (value.type === 'rpc' && Number.isSafeInteger(value.id) && typeof value.name === 'string') return { type: 'rpc', id: Number(value.id), name: value.name.slice(0, 80), payload: value.payload }
    if (value.type !== 'snapshot' || !Number.isSafeInteger(value.tick) || !Number.isFinite(value.sentAt) || !Array.isArray(value.entities)) return null
    const entities = value.entities.slice(0, 2_000).flatMap(raw => {
      if (!raw || typeof raw !== 'object') return []
      const item = raw as Record<string, unknown>, position = item.position, velocity = item.velocity
      if (typeof item.uuid !== 'string') return []
      const normalized: Extract<NetworkMessage, { type: 'snapshot' }>['entities'][number] = { uuid: item.uuid.slice(0, 128) }
      if (Array.isArray(position)) {
        const values = [Number(position[0]), Number(position[1])]
        if (!values.every(Number.isFinite)) return []
        normalized.position = values as [number, number]
      }
      if (item.rotation !== undefined) {
        const rotation = Number(item.rotation)
        if (!Number.isFinite(rotation)) return []
        normalized.rotation = rotation
      }
      if (Array.isArray(velocity)) {
        const values = [Number(velocity[0]), Number(velocity[1])]
        if (!values.every(Number.isFinite)) return []
        normalized.velocity = values as [number, number]
      }
      return normalized.position || normalized.rotation !== undefined || normalized.velocity ? [normalized] : []
    })
    return { type: 'snapshot', tick: Number(value.tick), sentAt: Number(value.sentAt), entities }
  } catch { return null }
}

function scheduleReconnect(): void {
  if (!productionSettings.networking.enabled || !productionSettings.networking.reconnect || networkingState.status === 'disabled' || reconnectTimer !== null) return
  networkingState.status = 'reconnecting'
  const delay = Math.min(10_000, 500 * 2 ** Math.min(5, networkingState.reconnectAttempts++))
  reconnectTimer = window.setTimeout(async () => {
    reconnectTimer = null
    const active = transport; transport = null
    if (active) try { await active.close() } catch { /* Reconnect cleanup is best effort. */ }
    await startNetworking()
  }, delay)
}

async function send(message: NetworkMessage): Promise<boolean> {
  if (!transport || networkingState.status !== 'connected') return false
  const source = JSON.stringify(message), bytes = new TextEncoder().encode(source).byteLength, now = performance.now()
  if (now - budgetStarted >= 1_000) { budgetStarted = now; budgetBytes = 0 }
  const limit = productionSettings.networking.bandwidthKbps * 1024 / 8
  if (budgetBytes + bytes > limit) { networkingState.droppedPackets++; return false }
  budgetBytes += bytes
  try { await transport.send(source); networkingState.sentBytes += bytes; networkingState.sentPackets++; return true }
  catch (error) { networkingState.lastError = error instanceof Error ? error.message : String(error); networkingState.droppedPackets++; return false }
}

function receive(source: string): void {
  const bytes = new TextEncoder().encode(source).byteLength, now = performance.now()
  if (now - receiveBudgetStarted >= 1_000) { receiveBudgetStarted = now; receiveBudgetBytes = 0 }
  const limit = productionSettings.networking.bandwidthKbps * 1024 / 8
  if (receiveBudgetBytes + bytes > limit) { networkingState.droppedPackets++; return }
  receiveBudgetBytes += bytes
  const message = safeMessage(source); if (!message) { networkingState.droppedPackets++; return }
  networkingState.receivedBytes += bytes; networkingState.receivedPackets++
  if (message.type === 'hello') { networkingState.peers = Math.max(1, networkingState.peers); event(`Peer connected as ${message.role}`); return }
  if (message.type === 'rpc') { networkingState.rpcCalls++; try { rpcHandlers.get(message.name)?.(message.payload) } catch (error) { networkingState.lastError = error instanceof Error ? error.message : String(error); event(`RPC ${message.name} failed: ${networkingState.lastError}`) }; return }
  networkingState.snapshots++; networkingState.pingMs = Math.max(0, performance.now() - message.sentAt)
  remoteSnapshots.push(message); if (remoteSnapshots.length > 64) remoteSnapshots.splice(0, remoteSnapshots.length - 64)
}

export async function startNetworking(): Promise<void> {
  if (!productionSettings.networking.enabled || transport) return
  networkingState.status = 'connecting'; networkingState.lastError = ''
  transport = productionSettings.networking.transport === 'native-udp' ? new NativeUdpTransport() : new WebSocketTransport()
  networkingState.transport = transport.kind
  try {
    await transport.connect(receive, state => { if (state === 'connected') networkingState.status = 'connected'; else if (networkingState.status !== 'disabled') { networkingState.lastError = state; scheduleReconnect() } })
    networkingState.status = 'connected'; networkingState.reconnectAttempts = 0; networkingState.peers = 1; event(`${transport.kind} connected`)
    await send({ type: 'hello', role: productionSettings.networking.role, protocol: 1 })
  } catch (error) { networkingState.status = 'error'; networkingState.lastError = error instanceof Error ? error.message : String(error); event(networkingState.lastError); const active = transport; transport = null; if (active) try { await active.close() } catch { /* Failed connection cleanup. */ }; scheduleReconnect() }
}

export async function stopNetworking(disableState = true): Promise<void> {
  if (reconnectTimer !== null) clearTimeout(reconnectTimer); reconnectTimer = null
  const active = transport; transport = null
  if (active) try { await active.close() } catch { /* Closing is best effort. */ }
  remoteSnapshots.splice(0); rollbackHistory.splice(0); networkingState.peers = 0
  if (disableState) { networkingState.status = 'disabled'; networkingState.reconnectAttempts = 0 }
}

function localSnapshot(entities: Entity[]): Extract<NetworkMessage, { type: 'snapshot' }> {
  const definitions = new Map(productionSettings.networking.replicatedEntities.map(definition => [definition.entityUuid, definition]))
  return {
    type: 'snapshot', tick, sentAt: performance.now(), entities: entities.flatMap(entity => {
      const definition = definitions.get(entity.uuid); if (!definition) return []
      const sendsAuthority = productionSettings.networking.role === 'client' ? definition.authority === 'owner' : definition.authority === 'server'
      if (!sendsAuthority) return []
      const transform = worldTransform(entity, entities)
      const snapshot: Extract<NetworkMessage, { type: 'snapshot' }>['entities'][number] = { uuid: entity.uuid }
      if (definition.properties.includes('transform')) snapshot.position = [transform.position.x, transform.position.y]
      if (definition.properties.includes('rotation')) snapshot.rotation = transform.rotation
      if (definition.properties.includes('velocity')) snapshot.velocity = [entity.velocity.x, entity.velocity.y]
      return snapshot.position || snapshot.rotation !== undefined || snapshot.velocity ? [snapshot] : []
    })
  }
}

export function updateNetworking(entities: Entity[], fixedDelta: number): void {
  if (!transport || networkingState.status !== 'connected') return
  tick++
  const interval = 1 / productionSettings.networking.snapshotRate
  if ((performance.now() - lastSnapshotAt) / 1_000 >= interval) {
    lastSnapshotAt = performance.now()
    const snapshot = localSnapshot(entities)
    if (snapshot.entities.length) void send(snapshot)
  }
  const local = localSnapshot(entities); rollbackHistory.push({ tick, snapshot: local })
  if (rollbackHistory.length > productionSettings.networking.rollbackFrames) rollbackHistory.splice(0, rollbackHistory.length - productionSettings.networking.rollbackFrames)
  if (!remoteSnapshots.length) return
  const targetTime = performance.now() - productionSettings.networking.interpolationMs
  const snapshot = [...remoteSnapshots].reverse().find(item => item.sentAt <= targetTime) ?? remoteSnapshots[0]
  const definitions = new Map(productionSettings.networking.replicatedEntities.map(definition => [definition.entityUuid, definition]))
  for (const remote of snapshot.entities) {
    const definition = definitions.get(remote.uuid), entity = entities.find(candidate => candidate.uuid === remote.uuid)
    const receivesAuthority = productionSettings.networking.role === 'client' ? definition?.authority === 'server' : definition?.authority === 'owner'
    if (!definition || !entity || !receivesAuthority) continue
    const current = worldTransform(entity, entities), blend = definition.interpolate ? Math.min(1, Math.max(0, fixedDelta * 1_000 / Math.max(1, productionSettings.networking.interpolationMs))) : 1
    const predictionSeconds = definition.predict ? Math.min(.25, Math.max(0, (performance.now() - snapshot.sentAt) / 1_000)) : 0
    const remoteVelocity = remote.velocity ?? [entity.velocity.x, entity.velocity.y]
    const targetX = remote.position ? finiteNumber(remote.position[0]) + finiteNumber(remoteVelocity[0]) * predictionSeconds : current.position.x
    const targetY = remote.position ? finiteNumber(remote.position[1]) + finiteNumber(remoteVelocity[1]) * predictionSeconds : current.position.y
    const position = { x: current.position.x + (targetX - current.position.x) * blend, y: current.position.y + (targetY - current.position.y) * blend }
    if (definition.predict && remote.position && Math.hypot(targetX - current.position.x, targetY - current.position.y) > .05) networkingState.predictionCorrections++
    setWorldTransform(entity, { ...current, position, rotation: remote.rotation === undefined ? current.rotation : current.rotation + (finiteNumber(remote.rotation) - current.rotation) * blend }, entities)
    if (remote.velocity) { entity.velocity.x = finiteNumber(remote.velocity[0]); entity.velocity.y = finiteNumber(remote.velocity[1]) }
  }
}

export function registerRpc(name: string, handler: (payload: unknown) => void): () => void { const key = name.trim().slice(0, 80); rpcHandlers.set(key, handler); return () => rpcHandlers.delete(key) }
export function callRpc(name: string, payload: unknown): void { networkingState.rpcCalls++; void send({ type: 'rpc', id: rpcId++, name: name.trim().slice(0, 80), payload }) }
export function rollbackSnapshot(targetTick: number): boolean { const frame = [...rollbackHistory].reverse().find(item => item.tick <= targetTick); if (!frame) return false; networkingState.rollbacks++; remoteSnapshots.push(frame.snapshot); return true }
