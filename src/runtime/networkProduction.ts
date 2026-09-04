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

function safeId(value: string, maximum = 80): string { return value.trim().replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, maximum) }
function https(value: string): boolean { return /^https:\/\/[^\s]+$/i.test(value) }

export function transportReviewIssues(review: NetworkTransportReview): string[] {
  const issues: string[] = []
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(review.id)) issues.push('Adapter ID must be reverse-domain style.')
  if (!/^\d+\.\d+\.\d+$/.test(review.version)) issues.push('Adapter version must use semantic versioning.')
  if (!review.publisher.trim() || review.reviewedBy !== 'Whitelist') issues.push('Adapter publisher review is missing.')
  if (!/^[a-f0-9]{64}$/.test(review.sha256)) issues.push('Adapter SHA-256 is invalid.')
  if (!review.permissions.includes('network.client') || review.permissions.some(permission => permission !== 'network.client' && permission !== 'network.listen')) issues.push('Adapter permissions are missing or exceed networking scope.')
  if (!https(review.documentationUrl) || !https(review.securityUrl)) issues.push('Adapter documentation and security policy must use HTTPS.')
  return issues
}

export function registerReviewedNetworkTransport(adapter: ReviewedNetworkTransportAdapter): () => void {
  const issues = transportReviewIssues(adapter.review)
  if (issues.length) throw new Error(`Network transport adapter rejected: ${issues.join(' ')}`)
  if (transportAdapters.has(adapter.review.id)) throw new Error(`Network transport adapter ${adapter.review.id} is already registered.`)
  transportAdapters.set(adapter.review.id, adapter)
  return () => transportAdapters.delete(adapter.review.id)
}

export function reviewedNetworkTransports(): ReadonlyArray<NetworkTransportReview> {
  return [...transportAdapters.values()].map(adapter => Object.freeze({ ...adapter.review, permissions: [...adapter.review.permissions] })).sort((a, b) => a.label.localeCompare(b.label))
}

export function createReviewedNetworkTransport(id: string, settings: Readonly<ProductionProjectSettings['networking']>): NetworkTransportContract | null {
  const adapter = transportAdapters.get(id)
  if (!adapter || ((settings.role === 'host' || settings.role === 'server') && !adapter.review.permissions.includes('network.listen'))) return null
  return adapter.create(settings)
}

export function registerNetworkAuthenticationProvider(provider: NetworkAuthenticationProvider): () => void {
  const id = safeId(provider.id)
  if (!id || id !== provider.id || !provider.label.trim()) throw new Error('Authentication provider identity is invalid.')
  if (authenticationProviders.has(id)) throw new Error(`Authentication provider ${id} is already registered.`)
  authenticationProviders.set(id, provider)
  return () => authenticationProviders.delete(id)
}

export function networkAuthenticationProviders(): ReadonlyArray<{ id: string; label: string }> {
  return [...authenticationProviders.values()].map(provider => ({ id: provider.id, label: provider.label })).sort((a, b) => a.label.localeCompare(b.label))
}

export function createAuthenticationProof(providerId: string, context: NetworkAuthenticationContext): string {
  const provider = authenticationProviders.get(providerId)
  if (!provider) throw new Error(`Authentication provider ${providerId || '(none)'} is not registered.`)
  const proof = provider.createProof(Object.freeze({ ...context })).trim()
  if (!proof || proof.length > 512) throw new Error('Authentication provider returned an empty or oversized proof.')
  return proof
}

export function verifyAuthenticationProof(providerId: string, context: NetworkAuthenticationContext, proof: string): boolean {
  const provider = authenticationProviders.get(providerId)
  if (!provider || !proof || proof.length > 512) return false
  try { return provider.verifyProof(Object.freeze({ ...context }), proof) === true } catch { return false }
}

export class NetworkReplayProtectionWindow {
  private readonly seen = new Map<string, Map<string, number>>()

  accept(sender: string, envelope: NetworkSecurityEnvelope | undefined, now: number, maximumAgeMs: number, maximumEntries: number, required: boolean): NetworkReplayDecision {
    if (!envelope) return required ? { accepted: false, reason: 'missing-envelope' } : { accepted: true, reason: '' }
    if (!envelope.epoch || envelope.epoch.length > 80 || !envelope.nonce || envelope.nonce.length > 120 || !Number.isSafeInteger(envelope.issuedAt)) return { accepted: false, reason: 'expired' }
    const age = now - envelope.issuedAt
    if (age < -5_000) return { accepted: false, reason: 'future' }
    if (age > maximumAgeMs) return { accepted: false, reason: 'expired' }
    const key = `${safeId(sender)}:${safeId(envelope.epoch)}`, entries = this.seen.get(key) ?? new Map<string, number>()
    for (const [nonce, issuedAt] of entries) if (now - issuedAt > maximumAgeMs) entries.delete(nonce)
    if (entries.has(envelope.nonce)) return { accepted: false, reason: 'duplicate' }
    if (entries.size >= maximumEntries) return { accepted: false, reason: 'window-full' }
    entries.set(envelope.nonce, envelope.issuedAt); this.seen.set(key, entries)
    while (this.seen.size > 128) this.seen.delete(this.seen.keys().next().value ?? '')
    return { accepted: true, reason: '' }
  }

  clearPeer(sender: string): void { for (const key of this.seen.keys()) if (key.startsWith(`${safeId(sender)}:`)) this.seen.delete(key) }
  clear(): void { this.seen.clear() }
}

export function createNetworkEpoch(): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return safeId(random, 80)
}

export function createNetworkNonce(sequence: number): string {
  const random = typeof crypto !== 'undefined' && 'getRandomValues' in crypto ? crypto.getRandomValues(new Uint32Array(2)) : new Uint32Array([Date.now() >>> 0, Math.floor(Math.random() * 0xffff_ffff)])
  return `${sequence.toString(36)}-${random[0].toString(36)}-${random[1].toString(36)}`.slice(0, 120)
}

export class NetworkAuthorityTable {
  private owners = new Map<string, string>()
  initialize(definitions: readonly ReplicatedEntityDefinition[], localPeerId: string, role: string): void {
    this.owners.clear()
    for (const definition of definitions) this.owners.set(definition.entityUuid, definition.authority === 'owner' && definition.ownerPeerId ? definition.ownerPeerId : role === 'server' || role === 'host' ? localPeerId : '')
  }
  owner(entityUuid: string): string { return this.owners.get(entityUuid) ?? '' }
  entries(): Array<{ entityUuid: string; ownerPeerId: string }> { return [...this.owners].map(([entityUuid, ownerPeerId]) => ({ entityUuid, ownerPeerId })).sort((a, b) => a.entityUuid.localeCompare(b.entityUuid)) }
  restore(entries: readonly { entityUuid: string; ownerPeerId: string }[], definitions: readonly ReplicatedEntityDefinition[]): boolean {
    const allowed = new Set(definitions.map(definition => definition.entityUuid)), staged = new Map<string, string>()
    for (const entry of entries.slice(0, 2_000)) {
      const entityUuid = safeId(entry.entityUuid, 128), ownerPeerId = entry.ownerPeerId ? safeId(entry.ownerPeerId, 80) : ''
      if (!entityUuid || entityUuid !== entry.entityUuid || !allowed.has(entityUuid) || (entry.ownerPeerId && ownerPeerId !== entry.ownerPeerId) || staged.has(entityUuid)) return false
      staged.set(entityUuid, ownerPeerId)
    }
    if (staged.size !== allowed.size) return false
    this.owners = staged; return true
  }
  transfer(entityUuid: string, targetPeerId: string): boolean { if (!this.owners.has(entityUuid) || !safeId(targetPeerId)) return false; this.owners.set(entityUuid, safeId(targetPeerId)); return true }
  releasePeer(peerId: string, authorityPeerId: string): string[] { const changed: string[] = []; for (const [entityUuid, owner] of this.owners) if (owner === peerId) { this.owners.set(entityUuid, authorityPeerId); changed.push(entityUuid) }; return changed.sort() }
  clear(): void { this.owners.clear() }
}

export function entityRelevantToPeer(definition: ReplicatedEntityDefinition, position: [number, number], view: NetworkInterestView | undefined, enabled: boolean): boolean {
  if (!enabled || definition.alwaysRelevant || !view) return true
  if (definition.sceneUuid && view.sceneUuid && definition.sceneUuid !== view.sceneUuid) return false
  const radius = Math.max(0, Math.min(view.radius, definition.interestRadius || view.radius))
  return Math.hypot(position[0] - view.center[0], position[1] - view.center[1]) <= radius
}

export class NetworkTimeline<T> {
  private values: T[] = []
  constructor(private readonly capacity: number) {}
  push(value: T): void { this.values.push(value); if (this.values.length > this.capacity) this.values.splice(0, this.values.length - this.capacity) }
  snapshot(): T[] { return structuredClone(this.values) }
  clear(): void { this.values.splice(0) }
}

export function createNetworkPlayPlan(count: number, sessionName: string): NetworkPlayInstance[] {
  const peers = Math.max(2, Math.min(8, Math.round(count) || 2)), session = sessionName.trim().slice(0, 80) || 'Local game'
  return Array.from({ length: peers }, (_, index) => ({ id: `peer-${index + 1}`, role: index === 0 ? 'host' : 'client', playerName: index === 0 ? 'Host' : `Client ${index}`, sessionName: session, logScope: `network-${index + 1}`, inspectorId: `network-peer-${index + 1}` }))
}

export const localLobbyDirectoryState = reactive({
  active: false,
  advertising: false,
  lobbies: [] as Array<{ sessionName: string; hostName: string; peers: number; maximumPeers: number; schemaVersion: number; lastSeenAt: number }>,
  lastError: ''
})

let directoryChannel: BroadcastChannel | null = null
let directoryTimer: ReturnType<typeof setInterval> | null = null

export function startLocalLobbyDirectory(): void {
  if (directoryChannel) return
  if (typeof BroadcastChannel === 'undefined') throw new Error('Local lobby discovery is unavailable in this runtime.')
  directoryChannel = new BroadcastChannel('nova-a-local-lobby-directory-v1')
  directoryChannel.onmessage = event => {
    const value = event.data as Record<string, unknown>
    if (value?.format !== 'nova-local-lobby' || value.version !== 1 || typeof value.sessionName !== 'string' || typeof value.hostName !== 'string') return
    const lobby = { sessionName: value.sessionName.slice(0, 80), hostName: value.hostName.slice(0, 80), peers: Math.max(0, Math.min(64, Number(value.peers) || 0)), maximumPeers: Math.max(1, Math.min(64, Number(value.maximumPeers) || 1)), schemaVersion: Math.max(1, Math.min(65_535, Number(value.schemaVersion) || 1)), lastSeenAt: Date.now() }
    const existing = localLobbyDirectoryState.lobbies.find(item => item.sessionName === lobby.sessionName && item.hostName === lobby.hostName)
    existing ? Object.assign(existing, lobby) : localLobbyDirectoryState.lobbies.push(lobby)
    localLobbyDirectoryState.lobbies = localLobbyDirectoryState.lobbies.filter(item => Date.now() - item.lastSeenAt < 5_000).slice(0, 64)
  }
  localLobbyDirectoryState.active = true; localLobbyDirectoryState.lastError = ''
}

export function advertiseLocalLobby(input: { sessionName: string; hostName: string; peers: number; maximumPeers: number; schemaVersion: number }): void {
  startLocalLobbyDirectory(); stopLocalLobbyAdvertisement(); localLobbyDirectoryState.advertising = true
  const publish = () => directoryChannel?.postMessage({ format: 'nova-local-lobby', version: 1, sessionName: input.sessionName.slice(0, 80), hostName: input.hostName.slice(0, 80), peers: input.peers, maximumPeers: input.maximumPeers, schemaVersion: input.schemaVersion })
  publish(); directoryTimer = globalThis.setInterval(publish, 1_000)
}

export function stopLocalLobbyAdvertisement(): void { if (directoryTimer !== null) clearInterval(directoryTimer); directoryTimer = null; localLobbyDirectoryState.advertising = false }
export function stopLocalLobbyDirectory(): void { stopLocalLobbyAdvertisement(); directoryChannel?.close(); directoryChannel = null; localLobbyDirectoryState.active = false; localLobbyDirectoryState.lobbies.splice(0) }

export function networkEncryptionGuidance(settings: Readonly<ProductionProjectSettings['networking']>, adapterEncrypted = false): { protected: boolean; severity: 'info' | 'warning' | 'error'; message: string } {
  const protectedTransport = settings.sessionMode === 'local' || adapterEncrypted || (settings.transport === 'websocket' && /^wss:\/\//i.test(settings.endpoint))
  if (protectedTransport) return { protected: true, severity: 'info', message: settings.sessionMode === 'local' ? 'Local lobby traffic stays on the same device and origin.' : 'The selected adapter declares encrypted transport.' }
  if (settings.security.requireEncryption) return { protected: false, severity: 'error', message: 'Encryption is required, but the selected direct transport is not encrypted. Use WSS or a reviewed encrypted adapter.' }
  return { protected: false, severity: 'warning', message: 'Direct traffic is not encrypted. Use WSS, a reviewed encrypted adapter, or an independently reviewed secure tunnel.' }
}
