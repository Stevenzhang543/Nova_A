/** 网络协议编码与验证：规范消息及序列信息，检查接收数据符合协议约定。 */
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

/* 根据 value !== null && typeof value === 'object' && !Array.isArray(value) 的真假，分别返回 value as Record<string, unknown> 或 null。 */ function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

/* 根据 Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum 的真假，分别返回 Number(value) 或 null。 */ function finiteInteger(value: unknown, minimum: number, maximum: number): number | null {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum ? Number(value) : null
}

/* 返回 new TextEncoder().encode(value).byteLength 的当前值。 */ export function utf8Bytes(value: string): number { return new TextEncoder().encode(value).byteLength }

/** Stable JSON is used only for diagnostics/checksums; packet object semantics never depend on locale. */
/** 结构说明（自动提取）：stableNetworkJson；输入 value；直接调用 JSON.stringify、Number.isFinite、Error、Object.is、Array.isArray 等；包含显式抛错路径。 */ export function stableNetworkJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Network numbers must be finite.')
    return JSON.stringify(Object.is(value, -0) ? 0 : value)
  }
  if (Array.isArray(value)) return `[${value.map(stableNetworkJson).join(',')}]`
  const source = record(value)
  if (!source) throw new Error('Network values must be JSON-compatible.')
  return `{${Object.keys(source).sort().map(/** 按模板 `${JSON.stringify(key)}:${stableNetworkJson(source[key])}` 生成并返回字符串。 */ key => `${JSON.stringify(key)}:${stableNetworkJson(source[key])}`).join(',')}}`
}

/** 结构说明（自动提取）：networkChecksum；输入 value；直接调用 stableNetworkJson、source.charCodeAt、Math.imul、padStart、toString 等；写入 first、second；包含循环处理。 */ export function networkChecksum(value: unknown): string {
  const source = stableNetworkJson(value)
  let first = 0x811c9dc5, second = 0x9e3779b9
  for (let index = 0; index < source.length; index++) {
    const code = source.charCodeAt(index)
    first = Math.imul(first ^ code, 0x01000193)
    second = Math.imul(second ^ code, 0x85ebca6b); second ^= second >>> 13
  }
  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}${utf8Bytes(source).toString(16).padStart(8, '0')}`
}

/** 结构说明（自动提取）：validateNetworkValue；输入 value、depth、budget；直接调用 Number.isFinite、utf8Bytes、Array.isArray、validateNetworkValue、record 等；返回路径包含 error；包含循环处理。 */ export function validateNetworkValue(value: unknown, depth = 0, budget = { remaining: 65_536 }): string | null {
  if (--budget.remaining < 0) return 'Payload exceeds the 65,536-value work bound.'
  if (depth > MAX_NETWORK_DEPTH) return `Payload exceeds maximum depth ${MAX_NETWORK_DEPTH}.`
  if (value === null || typeof value === 'boolean') return null
  if (typeof value === 'number') return Number.isFinite(value) ? null : 'Payload numbers must be finite.'
  if (typeof value === 'string') return utf8Bytes(value) <= 65_536 ? null : 'Payload string exceeds 65,536 UTF-8 bytes.'
  if (Array.isArray(value)) {
    if (value.length > MAX_NETWORK_COLLECTION_ITEMS) return `Payload array exceeds ${MAX_NETWORK_COLLECTION_ITEMS} items.`
    for (const item of value) { const error = validateNetworkValue(item, depth + 1, budget); if (error) return error }
    return null
  }
  const source = record(value)
  if (!source) return 'Payload must contain JSON-compatible values only.'
  const entries = Object.entries(source)
  if (entries.length > MAX_NETWORK_COLLECTION_ITEMS) return `Payload object exceeds ${MAX_NETWORK_COLLECTION_ITEMS} keys.`
  for (const [key, item] of entries) {
    if (!key || utf8Bytes(key) > 128) return 'Payload keys must contain 1–128 UTF-8 bytes.'
    if (SENSITIVE_KEYS.test(key)) return `Payload key ${key} is reserved for secrets and cannot enter networking, replay, save, or diagnostics.`
    const error = validateNetworkValue(item, depth + 1, budget); if (error) return error
  }
  return null
}

/** 结构说明（自动提取）：validatePayloadSchema；输入 value、schema；直接调用 validateNetworkValue、Number.isFinite、Number.isSafeInteger、Array.isArray、Boolean 等。 */ export function validatePayloadSchema(value: unknown, schema: NetworkPayloadSchema): boolean {
  if (validateNetworkValue(value)) return false
  if (schema === 'any') return true
  if (schema === 'boolean') return typeof value === 'boolean'
  if (schema === 'number') return typeof value === 'number' && Number.isFinite(value)
  if (schema === 'integer') return Number.isSafeInteger(value)
  if (schema === 'string') return typeof value === 'string'
  if (schema === 'array') return Array.isArray(value)
  if (schema === 'object') return Boolean(record(value))
  return Array.isArray(value) && value.length === 2 && value.every(/* 先计算 typeof item === 'number'；仅当其为真值时求右侧 Number.isFinite(item)，返回短路求值结果。 */ item => typeof item === 'number' && Number.isFinite(item))
}

/** 结构说明（自动提取）：serializeNetworkPacket；输入 packet；直接调用 validateNetworkValue、Error、stableNetworkJson；包含显式抛错路径。 */ export function serializeNetworkPacket(packet: NetworkPacket): string {
  const payloadError = validateNetworkValue(packet.payload)
  if (payloadError) throw new Error(payloadError)
  return stableNetworkJson(packet)
}

/** 结构说明（自动提取）：parseNetworkPacket；输入 source、limits、channels、expectedSessionId；直接调用 utf8Bytes、JSON.parse、record、safeIdentity.test、channels.find 等；写入 parsed、security。 */ export function parseNetworkPacket(
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
  const safeIdentity = /^[A-Za-z0-9_.-]{1,80}$/
  if (!safeIdentity.test(sessionId) || !safeIdentity.test(sender)) return { packet: null, error: 'Packet session or sender identity is invalid.' }
  if (expectedSessionId && sessionId !== expectedSessionId) return { packet: null, error: 'Packet belongs to another session.' }
  const channel = channels.find(/* 比较 candidate.id 与 channelId，返回严格相等的判断结果。 */ candidate => candidate.id === channelId)
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
  /** 结构说明（自动提取）：匿名回调；输入 maximumKeys；空实现，不执行额外操作。 */ constructor(private readonly maximumKeys = 4_096) {}
  /** 结构说明（自动提取）：accept；输入 key、limit、now；直接调用 Math.max、Math.min、Math.round、windows.get、windows.delete 等；包含循环处理。 */ accept(key: string, limit: number, now: number): boolean {
    const boundedLimit = Math.max(1, Math.min(10_000, Math.round(limit))), current = this.windows.get(key)
    if (!current || now - current.startedAt >= 1_000) {
      if (!current && this.windows.size >= Math.max(16, this.maximumKeys)) {
        for (const [candidate, window] of this.windows) if (now - window.startedAt >= 1_000) this.windows.delete(candidate)
        while (this.windows.size >= Math.max(16, this.maximumKeys)) this.windows.delete(this.windows.keys().next().value ?? '')
      }
      this.windows.set(key, { startedAt: now, count: 1 }); return true
    }
    if (current.count >= boundedLimit) return false
    current.count++; return true
  }
  /** 结构说明（自动提取）：clearPrefix；输入 prefix；直接调用 windows.keys、key.startsWith、windows.delete；包含循环处理。 */ clearPrefix(prefix: string): void { for (const key of this.windows.keys()) if (key.startsWith(prefix)) this.windows.delete(key) }
  /** 执行时调用 this.windows.clear()；不显式返回调用结果。 */ clear(): void { this.windows.clear() }
}

export interface ReliablePendingPacket { peer: string; packet: NetworkPacket; source: string; sentAt: number; attempts: number }

export class ReliablePacketWindow {
  private pending = new Map<string, ReliablePendingPacket>()
  private expired: ReliablePendingPacket[] = []
  /** 结构说明（自动提取）：匿名回调；输入 maximum；空实现，不执行额外操作。 */ constructor(private readonly maximum: number) {}
  /** 结构说明（自动提取）：track；输入 peer、packet、source、now；直接调用 Math.max、pending.set。 */ track(peer: string, packet: NetworkPacket, source: string, now: number): boolean {
    if (this.pending.size >= Math.max(1, this.maximum)) return false
    this.pending.set(`${peer}:${packet.channel}:${packet.sequence}`, { peer, packet, source, sentAt: now, attempts: 1 }); return true
  }
  /* 先计算 Number.isSafeInteger(count) && count >= 0；仅当其为真值时求右侧 this.pending.size + count <= Math.max(1, this.maximum)，返回短路求值结果。 */ canTrack(count = 1): boolean { return Number.isSafeInteger(count) && count >= 0 && this.pending.size + count <= Math.max(1, this.maximum) }
  /* 调用 this.pending.delete(`${peer}:${channel}:${sequence}`) 并返回调用结果。 */ acknowledge(peer: string, channel: string, sequence: number): boolean { return this.pending.delete(`${peer}:${channel}:${sequence}`) }
  /** 结构说明（自动提取）：acknowledgeBootstrap；输入 channel、sequence；直接调用 pending.get、pending.delete。 */ acknowledgeBootstrap(channel: string, sequence: number): boolean {
    const key = `*:${channel}:${sequence}`, pending = this.pending.get(key)
    if (!pending || (pending.packet.kind !== 'hello' && pending.packet.kind !== 'join')) return false
    return this.pending.delete(key)
  }
  /** 结构说明（自动提取）：due；输入 now、retryMs、maximumAttempts；直接调用 pending.delete、expired.push、Math.max、expired.shift、due.push；写入 item.sentAt；返回路径包含 due；包含循环处理。 */ due(now: number, retryMs: number, maximumAttempts: number): ReliablePendingPacket[] {
    const due: ReliablePendingPacket[] = []
    for (const [key, item] of this.pending) {
      if (now - item.sentAt < retryMs) continue
      if (item.attempts >= maximumAttempts) { this.pending.delete(key); this.expired.push(item); if (this.expired.length > Math.max(1, this.maximum)) this.expired.shift(); continue }
      item.attempts++; item.sentAt = now; due.push(item)
    }
    return due
  }
  /* 调用 this.expired.splice(0) 并返回调用结果。 */ takeExpired(): ReliablePendingPacket[] { return this.expired.splice(0) }
  /* 返回 this.pending.size 的当前值。 */ get size(): number { return this.pending.size }
  /** 结构说明（自动提取）：clearPeer；输入 peer；直接调用 pending.delete；返回路径包含 removed；包含循环处理。 */ clearPeer(peer: string): number {
    let removed = 0
    for (const [key, item] of this.pending) {
      if (item.peer !== peer) continue
      this.pending.delete(key)
      removed++
    }
    return removed
  }
  /** 结构说明（自动提取）：clear；无显式参数；直接调用 pending.clear、expired.splice。 */ clear(): void { this.pending.clear(); this.expired.splice(0) }
}

export interface SimulatedDelivery { dropped: boolean; copies: number; delayMs: number; reordered: boolean }

export class DeterministicNetworkSimulator {
  private state: number
  /** 将 seed >>> 0 || 0x4e455457 赋给 this.state，不显式返回值。 */ constructor(seed: number) { this.state = seed >>> 0 || 0x4e455457 }
  /** 结构说明（自动提取）：random；无显式参数；写入 state。 */ private random(): number { this.state ^= this.state << 13; this.state ^= this.state >>> 17; this.state ^= this.state << 5; return (this.state >>> 0) / 0x1_0000_0000 }
  /** 结构说明（自动提取）：decide；输入 settings；直接调用 random、Math.max、Math.round。 */ decide(settings: { enabled: boolean; latencyMs: number; jitterMs: number; lossPercent: number; duplicatePercent: number; reorderPercent: number }): SimulatedDelivery {
    if (!settings.enabled) return { dropped: false, copies: 1, delayMs: 0, reordered: false }
    const dropped = this.random() * 100 < settings.lossPercent, copies = this.random() * 100 < settings.duplicatePercent ? 2 : 1, reordered = this.random() * 100 < settings.reorderPercent
    const jitter = (this.random() * 2 - 1) * settings.jitterMs
    return { dropped, copies, reordered, delayMs: Math.max(0, Math.round(settings.latencyMs + jitter + (reordered ? settings.jitterMs + 1 : 0))) }
  }
}

/* 返回具有所列字段的新对象 { format: NOVA_NETWORK_PACKET_FORMAT, protocol: NOVA_NETWORK_PROTOCOL, ...input }。 */ export function createNetworkPacket(input: Omit<NetworkPacket, 'format' | 'protocol'>): NetworkPacket {
  return { format: NOVA_NETWORK_PACKET_FORMAT, protocol: NOVA_NETWORK_PROTOCOL, ...input }
}
