/** 网络游戏制作配置：组织权威、同步及调试选项，并校验网络项目数据。 */
import { reactive } from 'vue'
import type { ProductionProjectSettings, ReplicatedEntityDefinition } from './production'

export interface NetworkTransportContract {
  readonly kind: 'adapter'
  connect(onMessage: (source: string, peer: string) => void, onState: (state: string) => void): Promise<void>
  send(source: string, target?: string): Promise<void>
  close(): Promise<void>
}

export interface NetworkTransportReview {
  id: string
  label: string
  version: string
  publisher: string
  sha256: string
  reviewedBy: 'Whitelist'
  permissions: Array<'network.client' | 'network.listen'>
  encrypted: boolean
  documentationUrl: string
  securityUrl: string
}

export interface ReviewedNetworkTransportAdapter {
  review: NetworkTransportReview
  create(settings: Readonly<ProductionProjectSettings['networking']>): NetworkTransportContract
}

export interface NetworkAuthenticationContext {
  sessionId: string
  sender: string
  epoch: string
  nonce: string
  issuedAt: number
  packetChecksum: string
}

export interface NetworkAuthenticationProvider {
  id: string
  label: string
  createProof(context: NetworkAuthenticationContext): string
  verifyProof(context: NetworkAuthenticationContext, proof: string): boolean
}

export interface NetworkSecurityEnvelope {
  epoch: string
  nonce: string
  issuedAt: number
  proof: string
}

export interface NetworkReplayDecision { accepted: boolean; reason: '' | 'missing-envelope' | 'expired' | 'future' | 'duplicate' | 'window-full' }
export interface NetworkInterestView { peerId: string; center: [number, number]; radius: number; sceneUuid: string; updatedAt: number }
export interface NetworkRollbackEntry { tick: number; peerId: string; checksumBefore: string; checksumAfter: string; replayedInputs: number; correction: number; reason: string }
export interface NetworkReplicationDiff { tick: number; peerId: string; entityUuid: string; fields: string[]; error: number; authority: string }
export interface NetworkPlayInstance { id: string; role: 'host' | 'client'; playerName: string; sessionName: string; logScope: string; inspectorId: string }

const transportAdapters = new Map<string, ReviewedNetworkTransportAdapter>()
const authenticationProviders = new Map<string, NetworkAuthenticationProvider>()

/* 调用 value.trim().replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, maximum) 并返回调用结果。 */ function safeId(value: string, maximum = 80): string { return value.trim().replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, maximum) }
/* 调用 /^https:\/\/[^\s]+$/i.test(value) 并返回调用结果。 */ function https(value: string): boolean { return /^https:\/\/[^\s]+$/i.test(value) }

/** 结构说明（自动提取）：transportReviewIssues；输入 review；直接调用 test、issues.push、review.publisher.trim、review.permissions.includes、review.permissions.some 等；返回路径包含 issues。 */ export function transportReviewIssues(review: NetworkTransportReview): string[] {
  const issues: string[] = []
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(review.id)) issues.push('Adapter ID must be reverse-domain style.')
  if (!/^\d+\.\d+\.\d+$/.test(review.version)) issues.push('Adapter version must use semantic versioning.')
  if (!review.publisher.trim() || review.reviewedBy !== 'Whitelist') issues.push('Adapter publisher review is missing.')
  if (!/^[a-f0-9]{64}$/.test(review.sha256)) issues.push('Adapter SHA-256 is invalid.')
  if (!review.permissions.includes('network.client') || review.permissions.some(/* 先计算 permission !== 'network.client'；仅当其为真值时求右侧 permission !== 'network.listen'，返回短路求值结果。 */ permission => permission !== 'network.client' && permission !== 'network.listen')) issues.push('Adapter permissions are missing or exceed networking scope.')
  if (!https(review.documentationUrl) || !https(review.securityUrl)) issues.push('Adapter documentation and security policy must use HTTPS.')
  return issues
}

/** 结构说明（自动提取）：registerReviewedNetworkTransport；输入 adapter；直接调用 transportReviewIssues、Error、issues.join、transportAdapters.has、transportAdapters.set；包含显式抛错路径。 */ export function registerReviewedNetworkTransport(adapter: ReviewedNetworkTransportAdapter): () => void {
  const issues = transportReviewIssues(adapter.review)
  if (issues.length) throw new Error(`Network transport adapter rejected: ${issues.join(' ')}`)
  if (transportAdapters.has(adapter.review.id)) throw new Error(`Network transport adapter ${adapter.review.id} is already registered.`)
  transportAdapters.set(adapter.review.id, adapter)
  return /* 调用 transportAdapters.delete(adapter.review.id) 并返回调用结果。 */ () => transportAdapters.delete(adapter.review.id)
}

/** 结构说明（自动提取）：reviewedNetworkTransports；无显式参数；直接调用 sort、map、transportAdapters.values。 */ export function reviewedNetworkTransports(): ReadonlyArray<NetworkTransportReview> {
  return [...transportAdapters.values()].map(/* 调用 Object.freeze({ ...adapter.review, permissions: [...adapter.review.permissions] }) 并返回调用结果。 */ adapter => Object.freeze({ ...adapter.review, permissions: [...adapter.review.permissions] })).sort(/* 调用 a.label.localeCompare(b.label) 并返回调用结果。 */ (a, b) => a.label.localeCompare(b.label))
}

/** 结构说明（自动提取）：createReviewedNetworkTransport；输入 id、settings；直接调用 transportAdapters.get、adapter.review.permissions.includes、adapter.create。 */ export function createReviewedNetworkTransport(id: string, settings: Readonly<ProductionProjectSettings['networking']>): NetworkTransportContract | null {
  const adapter = transportAdapters.get(id)
  if (!adapter || ((settings.role === 'host' || settings.role === 'server') && !adapter.review.permissions.includes('network.listen'))) return null
  return adapter.create(settings)
}

/** 结构说明（自动提取）：registerNetworkAuthenticationProvider；输入 provider；直接调用 safeId、provider.label.trim、Error、authenticationProviders.has、authenticationProviders.set；包含显式抛错路径。 */ export function registerNetworkAuthenticationProvider(provider: NetworkAuthenticationProvider): () => void {
  const id = safeId(provider.id)
  if (!id || id !== provider.id || !provider.label.trim()) throw new Error('Authentication provider identity is invalid.')
  if (authenticationProviders.has(id)) throw new Error(`Authentication provider ${id} is already registered.`)
  authenticationProviders.set(id, provider)
  return /* 调用 authenticationProviders.delete(id) 并返回调用结果。 */ () => authenticationProviders.delete(id)
}

/** 结构说明（自动提取）：networkAuthenticationProviders；无显式参数；直接调用 sort、map、authenticationProviders.values。 */ export function networkAuthenticationProviders(): ReadonlyArray<{ id: string; label: string }> {
  return [...authenticationProviders.values()].map(/** 构造并返回记录 { id: provider.id, label: provider.label }，字段按当前实参及捕获状态求值。 */ provider => ({ id: provider.id, label: provider.label })).sort(/* 调用 a.label.localeCompare(b.label) 并返回调用结果。 */ (a, b) => a.label.localeCompare(b.label))
}

/** 结构说明（自动提取）：createAuthenticationProof；输入 providerId、context；直接调用 authenticationProviders.get、Error、trim、provider.createProof、Object.freeze；返回路径包含 proof；包含显式抛错路径。 */ export function createAuthenticationProof(providerId: string, context: NetworkAuthenticationContext): string {
  const provider = authenticationProviders.get(providerId)
  if (!provider) throw new Error(`Authentication provider ${providerId || '(none)'} is not registered.`)
  const proof = provider.createProof(Object.freeze({ ...context })).trim()
  if (!proof || proof.length > 512) throw new Error('Authentication provider returned an empty or oversized proof.')
  return proof
}

/** 结构说明（自动提取）：verifyAuthenticationProof；输入 providerId、context、proof；直接调用 authenticationProviders.get、provider.verifyProof、Object.freeze。 */ export function verifyAuthenticationProof(providerId: string, context: NetworkAuthenticationContext, proof: string): boolean {
  const provider = authenticationProviders.get(providerId)
  if (!provider || !proof || proof.length > 512) return false
  try { return provider.verifyProof(Object.freeze({ ...context }), proof) === true } catch { return false }
}

export class NetworkReplayProtectionWindow {
  private readonly seen = new Map<string, Map<string, number>>()

  /** 结构说明（自动提取）：accept；输入 sender、envelope、now、maximumAgeMs、maximumEntries、required、commit；直接调用 Number.isSafeInteger、safeId、seen.get、Map、entries.delete 等；包含循环处理。 */ accept(sender: string, envelope: NetworkSecurityEnvelope | undefined, now: number, maximumAgeMs: number, maximumEntries: number, required: boolean, commit = true): NetworkReplayDecision {
    if (!envelope) return required ? { accepted: false, reason: 'missing-envelope' } : { accepted: true, reason: '' }
    if (!envelope.epoch || envelope.epoch.length > 80 || !envelope.nonce || envelope.nonce.length > 120 || !Number.isSafeInteger(envelope.issuedAt)) return { accepted: false, reason: 'expired' }
    const age = now - envelope.issuedAt
    if (age < -5_000) return { accepted: false, reason: 'future' }
    if (age > maximumAgeMs) return { accepted: false, reason: 'expired' }
    const key = `${safeId(sender)}:${safeId(envelope.epoch)}`, entries = this.seen.get(key) ?? new Map<string, number>()
    for (const [nonce, issuedAt] of entries) if (now - issuedAt > maximumAgeMs) entries.delete(nonce)
    if (entries.has(envelope.nonce)) return { accepted: false, reason: 'duplicate' }
    if (entries.size >= maximumEntries) return { accepted: false, reason: 'window-full' }
    if (commit) { entries.set(envelope.nonce, envelope.issuedAt); this.seen.set(key, entries) }
    while (this.seen.size > 128) this.seen.delete(this.seen.keys().next().value ?? '')
    return { accepted: true, reason: '' }
  }

  /** 结构说明（自动提取）：clearPeer；输入 sender；直接调用 seen.keys、key.startsWith、safeId、seen.delete；包含循环处理。 */ clearPeer(sender: string): void { for (const key of this.seen.keys()) if (key.startsWith(`${safeId(sender)}:`)) this.seen.delete(key) }
  /** 执行时调用 this.seen.clear()；不显式返回调用结果。 */ clear(): void { this.seen.clear() }
}

/** 结构说明（自动提取）：createNetworkEpoch；无显式参数；直接调用 crypto.randomUUID、toString、Date.now、slice、Math.random 等。 */ export function createNetworkEpoch(): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return safeId(random, 80)
}

/** 结构说明（自动提取）：createNetworkNonce；输入 sequence；直接调用 crypto.getRandomValues、Uint32Array、Date.now、Math.floor、Math.random 等。 */ export function createNetworkNonce(sequence: number): string {
  const random = typeof crypto !== 'undefined' && 'getRandomValues' in crypto ? crypto.getRandomValues(new Uint32Array(2)) : new Uint32Array([Date.now() >>> 0, Math.floor(Math.random() * 0xffff_ffff)])
  return `${sequence.toString(36)}-${random[0].toString(36)}-${random[1].toString(36)}`.slice(0, 120)
}

export class NetworkAuthorityTable {
  private owners = new Map<string, string>()
  private authored = new Map<string, string>()
  /** 结构说明（自动提取）：initialize；输入 definitions、localPeerId、role；直接调用 clear、synchronize。 */ initialize(definitions: readonly ReplicatedEntityDefinition[], localPeerId: string, role: string): void {
    this.clear(); this.synchronize(definitions, localPeerId, role)
  }
  /** 结构说明（自动提取）：synchronize；输入 definitions、localPeerId、role；直接调用 Set、allowed.add、JSON.stringify、authored.get、authored.set 等；写入 changed；返回路径包含 changed；包含循环处理。 */ synchronize(definitions: readonly ReplicatedEntityDefinition[], localPeerId: string, role: string): boolean {
    let changed = false
    const allowed = new Set<string>()
    for (const definition of definitions) {
      allowed.add(definition.entityUuid)
      const identity = JSON.stringify([definition.authority, definition.ownerPeerId, role, localPeerId])
      if (this.authored.get(definition.entityUuid) === identity) continue
      this.authored.set(definition.entityUuid, identity)
      this.owners.set(definition.entityUuid, definition.authority === 'owner' && definition.ownerPeerId ? definition.ownerPeerId : role === 'server' || role === 'host' ? localPeerId : '')
      changed = true
    }
    for (const uuid of this.authored.keys()) if (!allowed.has(uuid)) { this.authored.delete(uuid); this.owners.delete(uuid); changed = true }
    return changed
  }
  /* 当 this.owners.get(entityUuid) 为 null 或 undefined 时返回 ''，否则保留左侧值。 */ owner(entityUuid: string): string { return this.owners.get(entityUuid) ?? '' }
  /** 结构说明（自动提取）：entries；无显式参数；直接调用 sort、map。 */ entries(): Array<{ entityUuid: string; ownerPeerId: string }> { return [...this.owners].map(/** 构造并返回记录 { entityUuid, ownerPeerId }，字段按当前实参及捕获状态求值。 */ ([entityUuid, ownerPeerId]) => ({ entityUuid, ownerPeerId })).sort(/* 调用 a.entityUuid.localeCompare(b.entityUuid) 并返回调用结果。 */ (a, b) => a.entityUuid.localeCompare(b.entityUuid)) }
  /** 结构说明（自动提取）：restore；输入 entries、definitions；直接调用 Array.isArray、Set、definitions.map、Map、safeId 等；写入 owners；包含循环处理。 */ restore(entries: readonly { entityUuid: string; ownerPeerId: string }[], definitions: readonly ReplicatedEntityDefinition[]): boolean {
    if (!Array.isArray(entries) || entries.length > 2_000) return false
    const allowed = new Set(definitions.map(/* 返回 definition.entityUuid 的当前值。 */ definition => definition.entityUuid)), staged = new Map<string, string>()
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry) || typeof entry.entityUuid !== 'string' || typeof entry.ownerPeerId !== 'string') return false
      const entityUuid = safeId(entry.entityUuid, 128), ownerPeerId = entry.ownerPeerId ? safeId(entry.ownerPeerId, 80) : ''
      if (!entityUuid || entityUuid !== entry.entityUuid || !allowed.has(entityUuid) || (entry.ownerPeerId && ownerPeerId !== entry.ownerPeerId) || staged.has(entityUuid)) return false
      staged.set(entityUuid, ownerPeerId)
    }
    if (staged.size !== allowed.size) return false
    this.owners = staged; return true
  }
  /** 结构说明（自动提取）：transfer；输入 entityUuid、targetPeerId；直接调用 owners.has、safeId、owners.set。 */ transfer(entityUuid: string, targetPeerId: string): boolean { if (!this.owners.has(entityUuid) || !safeId(targetPeerId)) return false; this.owners.set(entityUuid, safeId(targetPeerId)); return true }
  /** 结构说明（自动提取）：releasePeer；输入 peerId、authorityPeerId；直接调用 owners.set、changed.push、changed.sort；包含循环处理。 */ releasePeer(peerId: string, authorityPeerId: string): string[] { const changed: string[] = []; for (const [entityUuid, owner] of this.owners) if (owner === peerId) { this.owners.set(entityUuid, authorityPeerId); changed.push(entityUuid) }; return changed.sort() }
  /** 结构说明（自动提取）：clear；无显式参数；直接调用 owners.clear、authored.clear。 */ clear(): void { this.owners.clear(); this.authored.clear() }
}

/** 结构说明（自动提取）：entityRelevantToPeer；输入 definition、position、view、enabled；直接调用 Math.max、Math.min、Math.hypot。 */ export function entityRelevantToPeer(definition: ReplicatedEntityDefinition, position: [number, number], view: NetworkInterestView | undefined, enabled: boolean): boolean {
  if (!enabled || definition.alwaysRelevant || !view) return true
  if (definition.sceneUuid && view.sceneUuid && definition.sceneUuid !== view.sceneUuid) return false
  const radius = Math.max(0, Math.min(view.radius, definition.interestRadius || view.radius))
  return Math.hypot(position[0] - view.center[0], position[1] - view.center[1]) <= radius
}

export class NetworkTimeline<T> {
  private values: T[] = []
  /** 结构说明（自动提取）：匿名回调；输入 capacity；空实现，不执行额外操作。 */ constructor(private readonly capacity: number) {}
  /** 结构说明（自动提取）：push；输入 value；直接调用 values.push、values.splice。 */ push(value: T): void { this.values.push(value); if (this.values.length > this.capacity) this.values.splice(0, this.values.length - this.capacity) }
  /* 调用 structuredClone(this.values) 并返回调用结果。 */ snapshot(): T[] { return structuredClone(this.values) }
  /** 执行时调用 this.values.splice(0)；不显式返回调用结果。 */ clear(): void { this.values.splice(0) }
}

/** 结构说明（自动提取）：createNetworkPlayPlan；输入 count、sessionName；直接调用 Math.max、Math.min、Math.round、slice、sessionName.trim 等。 */ export function createNetworkPlayPlan(count: number, sessionName: string): NetworkPlayInstance[] {
  const peers = Math.max(2, Math.min(8, Math.round(count) || 2)), session = sessionName.trim().slice(0, 80) || 'Local game'
  return Array.from({ length: peers }, /** 结构说明（自动提取）：Array.from 回调；输入 _、index；返回表达式求值结果。 */ (_, index) => ({ id: `peer-${index + 1}`, role: index === 0 ? 'host' : 'client', playerName: index === 0 ? 'Host' : `Client ${index}`, sessionName: session, logScope: `network-${index + 1}`, inspectorId: `network-peer-${index + 1}` }))
}

export const localLobbyDirectoryState = reactive({
  active: false,
  advertising: false,
  lobbies: [] as Array<{ sessionName: string; hostName: string; peers: number; maximumPeers: number; schemaVersion: number; lastSeenAt: number }>,
  lastError: ''
})

let directoryChannel: BroadcastChannel | null = null
let directoryTimer: ReturnType<typeof setInterval> | null = null

/** 结构说明（自动提取）：startLocalLobbyDirectory；无显式参数；直接调用 Error、BroadcastChannel；写入 directoryChannel、directoryChannel.onmessage、localLobbyDirectoryState.active、localLobbyDirectoryState.lastError；包含显式抛错路径。 */ export function startLocalLobbyDirectory(): void {
  if (directoryChannel) return
  if (typeof BroadcastChannel === 'undefined') throw new Error('Local lobby discovery is unavailable in this runtime.')
  directoryChannel = new BroadcastChannel('nova-a-local-lobby-directory-v1')
  directoryChannel.onmessage = /** 结构说明（自动提取）：匿名回调；输入 event；直接调用 value.sessionName.slice、value.hostName.slice、Math.max、Math.min、Number 等；写入 localLobbyDirectoryState.lobbies。 */ event => {
    const value = event.data as Record<string, unknown>
    if (value?.format !== 'nova-local-lobby' || value.version !== 1 || typeof value.sessionName !== 'string' || typeof value.hostName !== 'string') return
    const lobby = { sessionName: value.sessionName.slice(0, 80), hostName: value.hostName.slice(0, 80), peers: Math.max(0, Math.min(64, Number(value.peers) || 0)), maximumPeers: Math.max(1, Math.min(64, Number(value.maximumPeers) || 1)), schemaVersion: Math.max(1, Math.min(65_535, Number(value.schemaVersion) || 1)), lastSeenAt: Date.now() }
    const existing = localLobbyDirectoryState.lobbies.find(/* 先计算 item.sessionName === lobby.sessionName；仅当其为真值时求右侧 item.hostName === lobby.hostName，返回短路求值结果。 */ item => item.sessionName === lobby.sessionName && item.hostName === lobby.hostName)
    existing ? Object.assign(existing, lobby) : localLobbyDirectoryState.lobbies.push(lobby)
    localLobbyDirectoryState.lobbies = localLobbyDirectoryState.lobbies.filter(/* 比较 Date.now() - item.lastSeenAt 与 5_000，返回小于的判断结果。 */ item => Date.now() - item.lastSeenAt < 5_000).slice(0, 64)
  }
  localLobbyDirectoryState.active = true; localLobbyDirectoryState.lastError = ''
}

/** 结构说明（自动提取）：advertiseLocalLobby；输入 input；直接调用 startLocalLobbyDirectory、stopLocalLobbyAdvertisement、publish、globalThis.setInterval；写入 localLobbyDirectoryState.advertising、directoryTimer。 */ export function advertiseLocalLobby(input: { sessionName: string; hostName: string; peers: number; maximumPeers: number; schemaVersion: number }): void {
  startLocalLobbyDirectory(); stopLocalLobbyAdvertisement(); localLobbyDirectoryState.advertising = true
  const publish = /** 结构说明（自动提取）：publish；无显式参数；直接调用 directoryChannel.postMessage、input.sessionName.slice、input.hostName.slice；返回表达式求值结果。 */ () => directoryChannel?.postMessage({ format: 'nova-local-lobby', version: 1, sessionName: input.sessionName.slice(0, 80), hostName: input.hostName.slice(0, 80), peers: input.peers, maximumPeers: input.maximumPeers, schemaVersion: input.schemaVersion })
  publish(); directoryTimer = globalThis.setInterval(publish, 1_000)
}

/** 结构说明（自动提取）：stopLocalLobbyAdvertisement；无显式参数；直接调用 clearInterval；写入 directoryTimer、localLobbyDirectoryState.advertising。 */ export function stopLocalLobbyAdvertisement(): void { if (directoryTimer !== null) clearInterval(directoryTimer); directoryTimer = null; localLobbyDirectoryState.advertising = false }
/** 结构说明（自动提取）：stopLocalLobbyDirectory；无显式参数；直接调用 stopLocalLobbyAdvertisement、directoryChannel.close、localLobbyDirectoryState.lobbies.splice；写入 directoryChannel、localLobbyDirectoryState.active。 */ export function stopLocalLobbyDirectory(): void { stopLocalLobbyAdvertisement(); directoryChannel?.close(); directoryChannel = null; localLobbyDirectoryState.active = false; localLobbyDirectoryState.lobbies.splice(0) }

/** 结构说明（自动提取）：networkEncryptionGuidance；输入 settings、adapterEncrypted；直接调用 test。 */ export function networkEncryptionGuidance(settings: Readonly<ProductionProjectSettings['networking']>, adapterEncrypted = false): { protected: boolean; severity: 'info' | 'warning' | 'error'; message: string } {
  const protectedTransport = settings.sessionMode === 'local' || adapterEncrypted || (settings.transport === 'websocket' && /^wss:\/\//i.test(settings.endpoint))
  if (protectedTransport) return { protected: true, severity: 'info', message: settings.sessionMode === 'local' ? 'Local lobby traffic stays on the same device and origin.' : 'The selected adapter declares encrypted transport.' }
  if (settings.security.requireEncryption) return { protected: false, severity: 'error', message: 'Encryption is required, but the selected direct transport is not encrypted. Use WSS or a reviewed encrypted adapter.' }
  return { protected: false, severity: 'warning', message: 'Direct traffic is not encrypted. Use WSS, a reviewed encrypted adapter, or an independently reviewed secure tunnel.' }
}
