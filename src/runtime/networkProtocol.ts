import type { NetworkChannelDefinition, NetworkDelivery, NetworkPayloadSchema } from './production'
import type { NetworkSecurityEnvelope } from './networkProduction'

export const NOVA_NETWORK_PROTOCOL = 2 as const
export const NOVA_NETWORK_PACKET_FORMAT = 'nova-net' as const
export const MAX_NETWORK_COLLECTION_ITEMS = 1_024
export const MAX_NETWORK_DEPTH = 12

export type NetworkPacketKind = 'hello' | 'ack' | 'rpc' | 'snapshot' | 'input' | 'ping' | 'pong' | 'join' | 'leave' | 'resync' | 'auth' | 'authority' | 'interest' | 'scene'

export interface NetworkPacket {
  format: typeof NOVA_NETWORK_PACKET_FORMAT
  protocol: typeof NOVA_NETWORK_PROTOCOL
  sessionId: string
  sender: string
  channel: string
  delivery: NetworkDelivery
  sequence: number
  ack: number | null
  tick: number
  schema: number
  kind: NetworkPacketKind
  payload: unknown
  security?: NetworkSecurityEnvelope
}

export interface NetworkProtocolLimits {
  maximumPacketBytes: number
  maximumMessagesPerSecond: number
  schemaVersion: number
}

const PACKET_KINDS = new Set<NetworkPacketKind>(['hello', 'ack', 'rpc', 'snapshot', 'input', 'ping', 'pong', 'join', 'leave', 'resync', 'auth', 'authority', 'interest', 'scene'])
const SENSITIVE_KEYS = /^(?:password|passphrase|secret|token|access[_-]?token|api[_-]?key|private[_-]?key|authorization|cookie|session[_-]?key)$/i

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function finiteInteger(value: unknown, minimum: number, maximum: number): number | null {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum ? Number(value) : null
}

export function utf8Bytes(value: string): number { return new TextEncoder().encode(value).byteLength }

/** Stable JSON is used only for diagnostics/checksums; packet object semantics never depend on locale. */
export function stableNetworkJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Network numbers must be finite.')
    return JSON.stringify(Object.is(value, -0) ? 0 : value)
  }
  if (Array.isArray(value)) return `[${value.map(stableNetworkJson).join(',')}]`
  const source = record(value)
  if (!source) throw new Error('Network values must be JSON-compatible.')
  return `{${Object.keys(source).sort().map(key => `${JSON.stringify(key)}:${stableNetworkJson(source[key])}`).join(',')}}`
}

export function networkChecksum(value: unknown): string {
  const source = stableNetworkJson(value)
  let first = 0x811c9dc5, second = 0x9e3779b9
  for (let index = 0; index < source.length; index++) {
    const code = source.charCodeAt(index)
    first = Math.imul(first ^ code, 0x01000193)
    second = Math.imul(second ^ code, 0x85ebca6b); second ^= second >>> 13
  }
  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}${utf8Bytes(source).toString(16).padStart(8, '0')}`
}

export function validateNetworkValue(value: unknown, depth = 0): string | null {
  if (depth > MAX_NETWORK_DEPTH) return `Payload exceeds maximum depth ${MAX_NETWORK_DEPTH}.`
  if (value === null || typeof value === 'boolean') return null
  if (typeof value === 'number') return Number.isFinite(value) ? null : 'Payload numbers must be finite.'
  if (typeof value === 'string') return utf8Bytes(value) <= 65_536 ? null : 'Payload string exceeds 65,536 UTF-8 bytes.'
  if (Array.isArray(value)) {
    if (value.length > MAX_NETWORK_COLLECTION_ITEMS) return `Payload array exceeds ${MAX_NETWORK_COLLECTION_ITEMS} items.`
    for (const item of value) { const error = validateNetworkValue(item, depth + 1); if (error) return error }
    return null
  }
  const source = record(value)
  if (!source) return 'Payload must contain JSON-compatible values only.'
  const entries = Object.entries(source)
  if (entries.length > MAX_NETWORK_COLLECTION_ITEMS) return `Payload object exceeds ${MAX_NETWORK_COLLECTION_ITEMS} keys.`
  for (const [key, item] of entries) {
    if (!key || utf8Bytes(key) > 128) return 'Payload keys must contain 1–128 UTF-8 bytes.'
    if (SENSITIVE_KEYS.test(key)) return `Payload key ${key} is reserved for secrets and cannot enter networking, replay, save, or diagnostics.`
    const error = validateNetworkValue(item, depth + 1); if (error) return error
  }
  return null
}

export function validatePayloadSchema(value: unknown, schema: NetworkPayloadSchema): boolean {
  if (validateNetworkValue(value)) return false
  if (schema === 'any') return true
  if (schema === 'boolean') return typeof value === 'boolean'
  if (schema === 'number') return typeof value === 'number' && Number.isFinite(value)
  if (schema === 'integer') return Number.isSafeInteger(value)
  if (schema === 'string') return typeof value === 'string'
  if (schema === 'array') return Array.isArray(value)
  if (schema === 'object') return Boolean(record(value))
  return Array.isArray(value) && value.length === 2 && value.every(item => typeof item === 'number' && Number.isFinite(item))
}

export function serializeNetworkPacket(packet: NetworkPacket): string {
  const payloadError = validateNetworkValue(packet.payload)
  if (payloadError) throw new Error(payloadError)
  return stableNetworkJson(packet)
}

export function parseNetworkPacket(
  source: string,
  limits: NetworkProtocolLimits,
  channels: readonly NetworkChannelDefinition[],
  expectedSessionId = ''
): { packet: NetworkPacket | null; error: string } {
  if (utf8Bytes(source) > limits.maximumPacketBytes) return { packet: null, error: 'Packet exceeds the configured byte bound.' }
  let parsed: unknown
  try { parsed = JSON.parse(source) } catch { return { packet: null, error: 'Packet is not valid JSON.' } }
  const value = record(parsed)
  if (!value || value.format !== NOVA_NETWORK_PACKET_FORMAT || value.protocol !== NOVA_NETWORK_PROTOCOL) return { packet: null, error: 'Packet protocol or format is unsupported.' }
  const sessionId = typeof value.sessionId === 'string' ? value.sessionId : '', sender = typeof value.sender === 'string' ? value.sender : '', channelId = typeof value.channel === 'string' ? value.channel : ''
  if (!sessionId || utf8Bytes(sessionId) > 80 || !sender || utf8Bytes(sender) > 80) return { packet: null, error: 'Packet session or sender identity is invalid.' }
  if (expectedSessionId && sessionId !== expectedSessionId) return { packet: null, error: 'Packet belongs to another session.' }
  const channel = channels.find(candidate => candidate.id === channelId)
  if (!channel || value.delivery !== channel.delivery) return { packet: null, error: 'Packet channel or delivery contract is invalid.' }
  const sequence = finiteInteger(value.sequence, 0, 0x7fff_ffff), ack = value.ack === null ? null : finiteInteger(value.ack, 0, 0x7fff_ffff), tick = finiteInteger(value.tick, 0, 0x7fff_ffff), schema = finiteInteger(value.schema, 1, 65_535)
  if (sequence === null || (value.ack !== null && ack === null) || tick === null || schema === null || schema !== limits.schemaVersion || !PACKET_KINDS.has(value.kind as NetworkPacketKind)) return { packet: null, error: 'Packet sequence, tick, schema, or kind is invalid.' }
  const payloadError = validateNetworkValue(value.payload)
  if (payloadError) return { packet: null, error: payloadError }
  const payloadBytes = utf8Bytes(stableNetworkJson(value.payload))
  if (payloadBytes > channel.maximumPayloadBytes) return { packet: null, error: `Packet payload exceeds channel ${channel.id}.` }
  let security: NetworkSecurityEnvelope | undefined
  if (value.security !== undefined) {
    const envelope = record(value.security), issuedAt = finiteInteger(envelope?.issuedAt, 0, Number.MAX_SAFE_INTEGER)
    if (!envelope || typeof envelope.epoch !== 'string' || !envelope.epoch || utf8Bytes(envelope.epoch) > 80 || typeof envelope.nonce !== 'string' || !envelope.nonce || utf8Bytes(envelope.nonce) > 120 || issuedAt === null || typeof envelope.proof !== 'string' || utf8Bytes(envelope.proof) > 512) return { packet: null, error: 'Packet security envelope is invalid.' }
    security = { epoch: envelope.epoch, nonce: envelope.nonce, issuedAt, proof: envelope.proof }
  }
  return { packet: { format: NOVA_NETWORK_PACKET_FORMAT, protocol: NOVA_NETWORK_PROTOCOL, sessionId, sender, channel: channel.id, delivery: channel.delivery, sequence, ack, tick, schema, kind: value.kind as NetworkPacketKind, payload: value.payload, ...(security ? { security } : {}) }, error: '' }
}

export class NetworkRateLimiter {
  private windows = new Map<string, { startedAt: number; count: number }>()
  accept(key: string, limit: number, now: number): boolean {
    const boundedLimit = Math.max(1, Math.min(10_000, Math.round(limit))), current = this.windows.get(key)
    if (!current || now - current.startedAt >= 1_000) { this.windows.set(key, { startedAt: now, count: 1 }); return true }
    if (current.count >= boundedLimit) return false
    current.count++; return true
  }
  clear(): void { this.windows.clear() }
}

export interface ReliablePendingPacket { peer: string; packet: NetworkPacket; source: string; sentAt: number; attempts: number }

export class ReliablePacketWindow {
  private pending = new Map<string, ReliablePendingPacket>()
  constructor(private readonly maximum: number) {}
  track(peer: string, packet: NetworkPacket, source: string, now: number): boolean {
    if (this.pending.size >= Math.max(1, this.maximum)) return false
    this.pending.set(`${peer}:${packet.channel}:${packet.sequence}`, { peer, packet, source, sentAt: now, attempts: 1 }); return true
  }
  acknowledge(peer: string, channel: string, sequence: number): boolean { return this.pending.delete(`${peer}:${channel}:${sequence}`) || this.pending.delete(`*:${channel}:${sequence}`) }
  due(now: number, retryMs: number, maximumAttempts: number): ReliablePendingPacket[] {
    const due: ReliablePendingPacket[] = []
    for (const [key, item] of this.pending) {
      if (now - item.sentAt < retryMs) continue
      if (item.attempts >= maximumAttempts) { this.pending.delete(key); continue }
      item.attempts++; item.sentAt = now; due.push(item)
    }
    return due
  }
  get size(): number { return this.pending.size }
  clearPeer(peer: string): number {
    let removed = 0
    for (const [key, item] of this.pending) {
      if (item.peer !== peer) continue
      this.pending.delete(key)
      removed++
    }
    return removed
  }
  clear(): void { this.pending.clear() }
}

export interface SimulatedDelivery { dropped: boolean; copies: number; delayMs: number; reordered: boolean }

export class DeterministicNetworkSimulator {
  private state: number
  constructor(seed: number) { this.state = seed >>> 0 || 0x4e455457 }
  private random(): number { this.state ^= this.state << 13; this.state ^= this.state >>> 17; this.state ^= this.state << 5; return (this.state >>> 0) / 0x1_0000_0000 }
  decide(settings: { enabled: boolean; latencyMs: number; jitterMs: number; lossPercent: number; duplicatePercent: number; reorderPercent: number }): SimulatedDelivery {
    if (!settings.enabled) return { dropped: false, copies: 1, delayMs: 0, reordered: false }
    const dropped = this.random() * 100 < settings.lossPercent, copies = this.random() * 100 < settings.duplicatePercent ? 2 : 1, reordered = this.random() * 100 < settings.reorderPercent
    const jitter = (this.random() * 2 - 1) * settings.jitterMs
    return { dropped, copies, reordered, delayMs: Math.max(0, Math.round(settings.latencyMs + jitter + (reordered ? settings.jitterMs + 1 : 0))) }
  }
}

export function createNetworkPacket(input: Omit<NetworkPacket, 'format' | 'protocol'>): NetworkPacket {
  return { format: NOVA_NETWORK_PACKET_FORMAT, protocol: NOVA_NETWORK_PROTOCOL, ...input }
}
