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
} from './networkProductionValues'
import type { NetworkConfigurationHost, NetworkPlatformPorts, NetworkTransport, NetworkChannelDefinition, NetworkRpcDefinition, RemoteNetworkInputFrame } from './networkSessionContracts'
import type { NetworkServiceHandle, NetworkServiceKind } from './networkServices'
import { selectedNetworkServiceIds } from './networkServices'
import { MultiplayerReplayOwner, type MultiplayerSaveDocument } from './multiplayerReplayOwner'

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
export const NETWORKING_PACKAGE_GATE = Object.freeze({
  maturity: 'supported' as const,
  coreStabilityBlocker: false,
  optionalAndLocalFirst: true,
  protocolVersion: 2,
  requiredSuites: Object.freeze(['security', 'bandwidth', 'packet-fuzz', 'packet-loss', 'two-process-localhost', 'reconnect-late-join', 'divergence', 'headless-build', 'no-implicit-network']),
  passedSuites: Object.freeze(['security', 'bandwidth', 'packet-fuzz', 'packet-loss', 'two-process-localhost', 'reconnect-late-join', 'divergence', 'headless-build', 'no-implicit-network', 'message-bounds', 'schema-bounds', 'secret-exclusion', 'deterministic-link-simulation', 'headless-interface', 'replay-protection', 'authentication-hooks', 'authority-transfer', 'interest-management', 'scene-handoff', 'multi-instance-plan']),
  externalSuites: Object.freeze(['independent-hostile-network-review', 'public-internet-NAT-traversal', 'cross-host-long-soak'])
})
const MAX_SEQUENCE = 0x7fff_ffff
const NETWORK_WORLD_BOUND = 1_000_000_000
export function createInitialNetworkingState() { return {
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
} }
export type NetworkingState=ReturnType<typeof createInitialNetworkingState>
export class NetworkSessionOwner {
  readonly world:NetworkConfigurationHost['world']
  readonly networkingState:NetworkingState
  private get configuration(){return this.host.readConfiguration()}
  private transport:NetworkTransport | null=null
  private tick=0
  private snapshotAccumulator=0
  private reconnectTimer:ReturnType<typeof setTimeout> | null=null
  private simulator:DeterministicNetworkSimulator
  private sessionEpoch:string
  private connectionGeneration=0
  private budgetStarted:number
  private budgetBytes=0
  private receiveBudgetStarted:number
  private receiveBudgetBytes=0
  private lastEntities:Entity[]=[]
  private lastInput:InputSnapshot | null=null
  private lastChecksum=''
  private sequenceByChannel=new Map<string, number>()
  private inboundSequences=new Map<string, number>()
  private reliableBuffers=new Map<string, Map<number, NetworkPacket>>()
  private reliableWindow:ReliablePacketWindow
  private outboundRate=new NetworkRateLimiter()
  private inboundRate=new NetworkRateLimiter()
  private rpcRate=new NetworkRateLimiter()
  private rpcHandlers=new Map<string, (payload: unknown, context: { sender: string; tick: number }) => void>()
  private snapshotCursors=new Map<string, number>()
  private remoteSnapshots:NetworkPacket[]=[]
  private remoteInputs=new Map<string, Map<number, InputSnapshot>>()
  private localHistory:Array<{ tick: number; input: InputSnapshot; checksum: string; snapshot: SnapshotPayload }>=[]
  private replayProtection=new NetworkReplayProtectionWindow()
  private authorityTable=new NetworkAuthorityTable()
  private peerInterests=new Map<string, NetworkInterestView>()
  private verifiedPeers=new Set<string>()
  private handshakenPeers=new Set<string>()
  private peerSources=new Map<string, string>()
  private peerEpochs=new Map<string, string>()
  private retiredPeerEpochs=new Map<string, number>()
  private sourcePeers=new Map<string, string>()
  private scheduledDeliveries=new Set<ReturnType<typeof setTimeout>>()
  private baselinePending=new Map<string, Set<string>>()
  private baselineSending=new Set<string>()
  private baselineTransfers=new Map<string, { transferId: string; count: number; checksum: string; chunks: Map<number, string>; bytes: number; startedAt: number }>()
  private deferredInbound=new Map<string, Map<string, DeferredInboundPacket>>()
  private deferredInboundCount=0
  private preAdmissionRpcs:PreAdmissionRpc[]=[]
  private rollbackTimeline=new NetworkTimeline<NetworkRollbackEntry>(600)
  private replicationDiffs=new NetworkTimeline<NetworkReplicationDiff>(2_000)
  private interpolationTargets=new Map<string, { sender: string; position?: [number, number]; rotation?: number; velocity?: [number, number]; remaining: number }>()
  private localInterest:NetworkInterestView | null=null
  private sceneHandoffHandler:((sceneUuid: string, spawnTag: string, peerId: string) => void | Promise<void>) | null=null
  private serviceAbort:AbortController | null=null
  private serviceHandles:NetworkServiceHandle[]=[]
  private reconnectAllowed=false
  private startupPromise:Promise<void> | null=null
  private readonly baselineWaits=new Map<ReturnType<typeof globalThis.setTimeout>,()=>void>()
  private waitBaselineWindow(delay:number,generation:number):Promise<void> {
    this.requireConnectionGeneration(generation)
    return new Promise<void>((resolve,reject)=>{
      const handle=this.ports.setTimeout(()=>{this.baselineWaits.delete(handle);try{this.requireConnectionGeneration(generation);resolve()}catch(error){reject(error)}},delay)
      this.baselineWaits.set(handle,()=>{this.ports.clearTimeout(handle);this.baselineWaits.delete(handle);reject(this.ports.abortError('Authoritative baseline transfer was cancelled with the session.'))})
    })
  }

  constructor(private readonly host:NetworkConfigurationHost,private readonly ports:NetworkPlatformPorts,readonly replay:MultiplayerReplayOwner,state=createInitialNetworkingState()) {
    if(!host?.world||typeof host.readConfiguration!=='function'||!ports||['now','wallNow','setTimeout','clearTimeout','createAbortController','abortError','createEpoch','createNonce','peerIdentity','createTransport','openService'].some(key=>typeof ports[key as keyof NetworkPlatformPorts]!=='function'))throw new Error('NETWORK_SESSION_PORTS_REQUIRED')
    if(replay.world!==host.world)throw new Error('NETWORK_REPLAY_WORLD_OWNER_MISMATCH')
    this.world=host.world;this.networkingState=state
    this.simulator=new DeterministicNetworkSimulator(this.configuration.networking.simulation.seed);this.sessionEpoch=this.ports.createEpoch();this.budgetStarted=this.ports.now();this.receiveBudgetStarted=this.ports.now();this.reliableWindow=new ReliablePacketWindow(this.configuration.networking.maximumPendingReliable)
    this.pruneRetiredEpochs=this.pruneRetiredEpochs.bind(this);this.requireConnectionGeneration=this.requireConnectionGeneration.bind(this);this.networkSessionId=this.networkSessionId.bind(this);this.peerIdentity=this.peerIdentity.bind(this);this.channel=this.channel.bind(this);this.channelByDelivery=this.channelByDelivery.bind(this);this.addEvent=this.addEvent.bind(this);this.channelStat=this.channelStat.bind(this);this.packetSummary=this.packetSummary.bind(this);this.updatePeer=this.updatePeer.bind(this);this.authorityClaimTrusted=this.authorityClaimTrusted.bind(this);this.nextSequence=this.nextSequence.bind(this);this.sequenceDistance=this.sequenceDistance.bind(this);this.nextExpectedSequence=this.nextExpectedSequence.bind(this);this.protocolLimits=this.protocolLimits.bind(this);this.authenticationChecksum=this.authenticationChecksum.bind(this);this.securePacket=this.securePacket.bind(this);this.refreshProductionDiagnostics=this.refreshProductionDiagnostics.bind(this);this.removePeer=this.removePeer.bind(this);this.pruneDisconnectedPeers=this.pruneDisconnectedPeers.bind(this);this.cancelScheduledDeliveries=this.cancelScheduledDeliveries.bind(this);this.closeNetworkServices=this.closeNetworkServices.bind(this);this.openNetworkServices=this.openNetworkServices.bind(this);this.resetConnectionPeerState=this.resetConnectionPeerState.bind(this);this.transportSend=this.transportSend.bind(this);this.sendNetworkPacket=this.sendNetworkPacket.bind(this);this.sendAck=this.sendAck.bind(this);this.sendAuthoritativeBaseline=this.sendAuthoritativeBaseline.bind(this);this.queuePreAdmissionRpc=this.queuePreAdmissionRpc.bind(this);this.flushPreAdmissionRpcs=this.flushPreAdmissionRpcs.bind(this);this.rpcEntityUuid=this.rpcEntityUuid.bind(this);this.acceptsRpc=this.acceptsRpc.bind(this);this.boundedNetworkNumber=this.boundedNetworkNumber.bind(this);this.normalizeEntitySnapshot=this.normalizeEntitySnapshot.bind(this);this.clearDeferredInbound=this.clearDeferredInbound.bind(this);this.deferInboundPacket=this.deferInboundPacket.bind(this);this.drainDeferredInbound=this.drainDeferredInbound.bind(this);this.processPacket=this.processPacket.bind(this);this.commitPacketReplay=this.commitPacketReplay.bind(this);this.processAcceptedPacket=this.processAcceptedPacket.bind(this);this.receive=this.receive.bind(this);this.scheduleReconnect=this.scheduleReconnect.bind(this);this.startNetworking=this.startNetworking.bind(this);this.startNetworkingSession=this.startNetworkingSession.bind(this);this.stopNetworking=this.stopNetworking.bind(this);this.localSnapshot=this.localSnapshot.bind(this);this.snapshotPage=this.snapshotPage.bind(this);this.predictionSnapshot=this.predictionSnapshot.bind(this);this.parentFirstNetworkStates=this.parentFirstNetworkStates.bind(this);this.reconcile=this.reconcile.bind(this);this.updateNetworking=this.updateNetworking.bind(this);this.registerRpc=this.registerRpc.bind(this);this.callRpc=this.callRpc.bind(this);this.setNetworkInterest=this.setNetworkInterest.bind(this);this.transferNetworkAuthority=this.transferNetworkAuthority.bind(this);this.handoffNetworkScene=this.handoffNetworkScene.bind(this);this.registerNetworkSceneHandoff=this.registerNetworkSceneHandoff.bind(this);this.consumeRemoteInput=this.consumeRemoteInput.bind(this);this.drainRemoteInputs=this.drainRemoteInputs.bind(this);this.rollbackSnapshot=this.rollbackSnapshot.bind(this);this.multiplayerSave=this.multiplayerSave.bind(this);this.restoreMultiplayerSave=this.restoreMultiplayerSave.bind(this);this.captureNetworkDiagnostics=this.captureNetworkDiagnostics.bind(this);this.networkRuntimeSnapshot=this.networkRuntimeSnapshot.bind(this);this.startNetworkingWithTransport=this.startNetworkingWithTransport.bind(this)
  }
  private transportContext(){ const owner=this;return { get configuration(){return owner.configuration},networkingState:owner.networkingState,networkSessionId:owner.networkSessionId.bind(owner)} }
  private requireEntities(entities:readonly Entity[]):void {if(entities===this.world.entities)return;const members=new Set(this.world.entities);if(entities.some(entity=>!members.has(entity)))throw new Error('NETWORK_SESSION_WORLD_INPUT_MISMATCH')}
pruneRetiredEpochs(): void { for (const [key, until] of this.retiredPeerEpochs) if (until < this.ports.wallNow()) this.retiredPeerEpochs.delete(key) }

requireConnectionGeneration(generation: number): void { if (generation !== this.connectionGeneration) throw this.ports.abortError('Network session opening was cancelled.') }

networkSessionId(): string { let hash = 0x811c9dc5; const source = `${this.configuration.networking.sessionName}:${this.configuration.networking.schemaVersion}`; for (const char of source) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193); return `session-${(hash >>> 0).toString(16).padStart(8, '0')}` }

peerIdentity():string {return this.ports.peerIdentity(this.configuration.networking.playerName)}

channel(id: string): NetworkChannelDefinition | null { return this.configuration.networking.channels.find(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id) ?? null }

channelByDelivery(delivery: NetworkChannelDefinition['delivery'], preferred: string): NetworkChannelDefinition | null { const preferredChannel = this.channel(preferred); return preferredChannel?.delivery === delivery ? preferredChannel : this.configuration.networking.channels.find(/* 比较 item.delivery 与 delivery，返回严格相等的判断结果。 */ item => item.delivery === delivery) ?? null }

addEvent(message: string, level: 'info' | 'warning' | 'error' = 'info'): void { this.networkingState.events.push({ at: this.ports.wallNow(), level, message: message.slice(0, 300) }); if (this.networkingState.events.length > 500) this.networkingState.events.splice(0, this.networkingState.events.length - 500) }

channelStat(id: string): { sent: number; received: number; dropped: number } { return this.networkingState.channelStats[id] ??= { sent: 0, received: 0, dropped: 0 } }

packetSummary(direction: 'in' | 'out', peer: string, packet: NetworkPacket, bytes: number, accepted: boolean): void { this.networkingState.packetSummaries.push({ direction, at: this.ports.wallNow(), peer: peer.slice(0, 80), channel: packet.channel, kind: packet.kind, sequence: packet.sequence, bytes, accepted }); if (this.networkingState.packetSummaries.length > 1_000) this.networkingState.packetSummaries.splice(0, this.networkingState.packetSummaries.length - 1_000) }

updatePeer(id: string, payload?: HelloPayload, verified = this.verifiedPeers.has(id)): boolean { const now = this.ports.wallNow(), existing = this.networkingState.peerDetails.find(/* 比较 peer.id 与 id，返回严格相等的判断结果。 */ peer => peer.id === id); if (existing) { existing.lastSeenAt = now; existing.verified ||= verified; return true }; if (this.networkingState.peerDetails.length >= this.configuration.networking.maxPeers) return false; this.networkingState.peerDetails.push({ id, name: payload?.playerName ?? id, role: payload?.role ?? 'peer', verified, connectedAt: now, lastSeenAt: now, sceneUuid: '' }); this.networkingState.peers = this.networkingState.peerDetails.length; return true }

authorityClaimTrusted(sender: string, source: string): boolean {
  if (this.verifiedPeers.has(sender)) return true
  if (this.transport?.kind === 'local-loopback') return source === sender
  if (this.transport?.kind === 'native-udp') return source === this.configuration.networking.endpoint.replace(/^udp:\/\//i, '')
  return false
}

nextSequence(channelId: string, peer = '*', commit = true): number { const destination = peer || '*', key = `${destination}:${channelId}`, baseline = this.sequenceByChannel.get(key) ?? (destination === '*' ? 0 : this.sequenceByChannel.get(`*:${channelId}`) ?? 0), next = (baseline + 1) & 0x7fff_ffff; if (commit) this.sequenceByChannel.set(key, next || 1); return next || 1 }

sequenceDistance(previous: number, current: number): number { if (current === previous) return 0; return current > previous ? current - previous : MAX_SEQUENCE - previous + current }

nextExpectedSequence(previous: number): number { return previous >= MAX_SEQUENCE ? 1 : previous + 1 }

protocolLimits() { return { maximumPacketBytes: this.configuration.networking.maximumPacketBytes, maximumMessagesPerSecond: this.configuration.networking.maximumMessagesPerSecond, schemaVersion: this.configuration.networking.schemaVersion } }

authenticationChecksum(packet: NetworkPacket): string { const { security: _security, ...unsigned } = packet; return networkChecksum(unsigned) }

securePacket(packet: NetworkPacket): NetworkPacket {
  const envelope: NetworkSecurityEnvelope = { epoch: this.sessionEpoch, nonce: this.ports.createNonce(packet.sequence), issuedAt: this.ports.wallNow(), proof: '' }
  if (this.configuration.networking.authentication.mode === 'hook') envelope.proof = createAuthenticationProof(this.configuration.networking.authentication.providerId, { sessionId: packet.sessionId, sender: packet.sender, epoch: envelope.epoch, nonce: envelope.nonce, issuedAt: envelope.issuedAt, packetChecksum: this.authenticationChecksum(packet) })
  packet.security = envelope
  return packet
}

refreshProductionDiagnostics(): void {
  this.networkingState.ownership.splice(0, this.networkingState.ownership.length, ...this.authorityTable.entries())
  this.networkingState.peerInterests.splice(0, this.networkingState.peerInterests.length, ...[...this.peerInterests.values()].sort(/* 调用 a.peerId.localeCompare(b.peerId) 并返回调用结果。 */ (a, b) => a.peerId.localeCompare(b.peerId)))
  this.networkingState.rollbackTimeline.splice(0, this.networkingState.rollbackTimeline.length, ...this.rollbackTimeline.snapshot())
  this.networkingState.replicationDiffs.splice(0, this.networkingState.replicationDiffs.length, ...this.replicationDiffs.snapshot())
}

removePeer(peerId: string, reason: string): void {
  const epoch = this.peerEpochs.get(peerId); this.pruneRetiredEpochs()
  if (epoch && this.retiredPeerEpochs.size < 4096) this.retiredPeerEpochs.set(`${peerId}:${epoch}`, this.ports.wallNow() + this.configuration.networking.security.maximumPacketAgeMs)
  this.baselineSending.delete(peerId); this.snapshotCursors.delete(peerId)
  for (const [uuid, target] of this.interpolationTargets) if (target.sender === peerId) this.interpolationTargets.delete(uuid)
  const index = this.networkingState.peerDetails.findIndex(/* 比较 item.id 与 peerId，返回严格相等的判断结果。 */ item => item.id === peerId)
  if (index >= 0) this.networkingState.peerDetails.splice(index, 1)
  this.networkingState.peers = this.networkingState.peerDetails.length
  this.verifiedPeers.delete(peerId); this.handshakenPeers.delete(peerId); this.peerEpochs.delete(peerId); this.remoteInputs.delete(peerId); this.peerInterests.delete(peerId); const source = this.peerSources.get(peerId); this.peerSources.delete(peerId); if (source && this.sourcePeers.get(source) === peerId) this.sourcePeers.delete(source); this.baselinePending.delete(peerId); this.baselineTransfers.delete(peerId); this.clearDeferredInbound(peerId); this.replayProtection.clearPeer(peerId); this.inboundRate.clearPrefix(`${peerId}:`); this.rpcRate.clearPrefix(`${peerId}:`)
  if (this.transport?.kind === 'native-udp') this.transport.unbindPeer?.(peerId)
  let releasedNetworkState = this.reliableWindow.clearPeer(peerId)
  for (const key of [...this.sequenceByChannel.keys()]) if (key.startsWith(`${peerId}:`)) { this.sequenceByChannel.delete(key); releasedNetworkState++ }
  for (const key of [...this.inboundSequences.keys()]) if (key.startsWith(`${peerId}:`)) { this.inboundSequences.delete(key); releasedNetworkState++ }
  for (const key of [...this.reliableBuffers.keys()]) if (key.startsWith(`${peerId}:`)) { this.reliableBuffers.delete(key); releasedNetworkState++ }
  this.networkingState.reliablePending = this.reliableWindow.size
  const authorityPeer = this.configuration.networking.role === 'server' || this.configuration.networking.role === 'host' ? this.networkingState.localPeerId : ''
  const released = this.authorityTable.releasePeer(peerId, authorityPeer)
  if (released.length || releasedNetworkState) this.networkingState.disconnectCleanups += released.length + releasedNetworkState
  if (released.length) this.addEvent(`${released.length} owned object(s) returned to authority after ${reason}.`, 'warning')
  this.refreshProductionDiagnostics()
}

pruneDisconnectedPeers(now = this.ports.wallNow()): void {
  const timeout = Math.max(5_000, this.configuration.networking.authentication.handshakeTimeoutMs * 2)
  for (const peer of [...this.networkingState.peerDetails]) if (now - peer.lastSeenAt > timeout) { this.removePeer(peer.id, 'peer timeout'); this.addEvent(`${peer.name} timed out and was removed.`, 'warning') }
  for (const [peerId, view] of this.peerInterests) if (now - view.updatedAt > timeout) this.peerInterests.delete(peerId)
  this.refreshProductionDiagnostics()
}

cancelScheduledDeliveries(): void { for(const cancel of [...this.baselineWaits.values()])cancel(); for (const timer of this.scheduledDeliveries) this.ports.clearTimeout(timer); this.scheduledDeliveries.clear() }

async closeNetworkServices(): Promise<void> { this.serviceAbort?.abort(); this.serviceAbort = null; const handles = this.serviceHandles.splice(0); await Promise.all(handles.map(/** 结构说明（自动提取）：handles.map 回调；输入 handle；直接调用 catch、handle.close；返回表达式求值结果。 */ handle => handle.close().catch(/* 返回 undefined 的当前值。 */ () => undefined))) }

async openNetworkServices(generation: number): Promise<void> {
  await this.closeNetworkServices(); this.requireConnectionGeneration(generation)
  const abort = this.ports.createAbortController(); this.serviceAbort = abort
  const selected = selectedNetworkServiceIds(this.configuration.networking)
  for (const kind of ['identity', 'lobby', 'relay'] as NetworkServiceKind[]) {
    if (!selected[kind]) continue
    const handle = await this.ports.openService(kind, this.configuration.networking, { sessionId: this.networkingState.sessionId, localPeerId: this.networkingState.localPeerId, role: this.configuration.networking.role, signal: abort.signal })
    if (generation !== this.connectionGeneration || abort.signal.aborted) { await handle.close().catch(/* 返回 undefined 的当前值。 */ () => undefined); this.requireConnectionGeneration(generation); throw this.ports.abortError('Network service opening was cancelled.') }
    this.serviceHandles.push(handle)
    const operation = kind === 'identity' ? 'identify' : kind === 'lobby' ? (this.configuration.networking.role === 'client' ? 'discover' : 'publish') : 'connect'
    await handle.request(operation, Object.freeze({ sessionName: this.configuration.networking.sessionName, role: this.configuration.networking.role, peerId: this.networkingState.localPeerId }))
    this.requireConnectionGeneration(generation)
    this.addEvent(`Reviewed ${kind} service ${selected[kind]} opened for ${operation}.`)
  }
}

resetConnectionPeerState(): void {
  this.networkingState.lastAppliedSnapshotAt = null; this.networkingState.lastAppliedSnapshotTick = null; this.networkingState.lastAppliedSnapshotPeer = ''
  for (const peer of [...this.networkingState.peerDetails]) this.removePeer(peer.id, 'session reset')
  this.networkingState.peerDetails.splice(0); this.networkingState.peers = 0; this.remoteSnapshots.splice(0); this.remoteInputs.clear(); this.inboundSequences.clear(); this.reliableBuffers.clear(); this.peerSources.clear(); this.peerEpochs.clear(); this.retiredPeerEpochs.clear(); this.baselineSending.clear(); this.snapshotCursors.clear(); this.sourcePeers.clear(); this.baselinePending.clear(); this.baselineTransfers.clear(); this.clearDeferredInbound(); this.preAdmissionRpcs.splice(0); this.verifiedPeers.clear(); this.handshakenPeers.clear(); this.peerInterests.clear(); this.interpolationTargets.clear(); this.replayProtection.clear(); this.reliableWindow.clear(); this.outboundRate.clear(); this.inboundRate.clear(); this.rpcRate.clear()
}

async transportSend(source: string, packet: NetworkPacket, target: string, resend = false): Promise<boolean> {
  if (!this.transport || this.networkingState.status !== 'connected') return false
  const activeTransport = this.transport, generation = this.connectionGeneration, bytes = utf8Bytes(source), decision = this.simulator.decide(this.configuration.networking.simulation)
  if (decision.dropped) { this.networkingState.droppedPackets++; this.channelStat(packet.channel).dropped++; this.packetSummary('out', target || '*', packet, bytes, false); return packet.delivery === 'reliable-ordered' }
  const deliver = /** 结构说明（自动提取）：deliver；无显式参数；直接调用 activeTransport.send、channelStat、packetSummary、String；写入 networkingState.sentBytes、networkingState.lastError；等待异步结果。 */ async () => {
    if (this.transport !== activeTransport || this.connectionGeneration !== generation || this.networkingState.status !== 'connected') return false
    try { await activeTransport.send(source, target); if(this.transport!==activeTransport||this.connectionGeneration!==generation||this.networkingState.status!=='connected')return false;this.networkingState.sentBytes += bytes; this.networkingState.sentPackets++; this.channelStat(packet.channel).sent++; this.packetSummary('out', target || '*', packet, bytes, true); if (resend) this.networkingState.reliableResent++; return true } catch (error) { if(this.transport!==activeTransport||this.connectionGeneration!==generation||this.networkingState.status!=='connected')return false;this.networkingState.lastError = error instanceof Error ? error.message : String(error); this.networkingState.droppedPackets++; this.channelStat(packet.channel).dropped++; return false }
  }
  for (let copy = 0; copy < decision.copies; copy++) {
    const delay = decision.delayMs + copy
    if (delay) {
      if (this.scheduledDeliveries.size >= Math.max(64, Math.min(4_096, this.configuration.networking.maximumPendingReliable * 4))) { this.networkingState.droppedPackets++; this.channelStat(packet.channel).dropped++; continue }
      const timer = this.ports.setTimeout(/** 结构说明（自动提取）：globalThis.setTimeout 回调；无显式参数；直接调用 scheduledDeliveries.delete、deliver。 */ () => { this.scheduledDeliveries.delete(timer); void deliver() }, delay); this.scheduledDeliveries.add(timer)
    } else await deliver()
  }
  return true
}

async sendNetworkPacket(kind: NetworkPacket['kind'], payload: unknown, channelId: string, target = ''): Promise<boolean> {
  if (!this.transport || this.networkingState.status !== 'connected' || !this.configuration.networking.enabled || !this.configuration.networking.permissionGranted) return false
  const contract = this.channel(channelId); if (!contract) { this.networkingState.lastError = `Unknown network channel ${channelId}.`; return false }
  if (this.transport.kind === 'native-udp' && !target && !this.networkingState.peerDetails.length && (this.configuration.networking.role === 'host' || this.configuration.networking.role === 'server')) return true
  const now = this.ports.now()
  if (!this.outboundRate.accept('global', this.configuration.networking.maximumMessagesPerSecond, now) || !this.outboundRate.accept(channelId, contract.messagesPerSecond, now)) { this.networkingState.rateLimited++; this.channelStat(channelId).dropped++; return false }
  const targets = contract.delivery === 'reliable-ordered' && kind !== 'ack' && !target && this.networkingState.peerDetails.length ? this.networkingState.peerDetails.map(/* 返回 peer.id 的当前值。 */ peer => peer.id) : [target]
  let deliveries: Array<{ destination: string; packet: NetworkPacket; source: string; bytes: number }>
  try {
    const payloadError = validateNetworkValue(payload); if (payloadError) throw new Error(payloadError)
    if (utf8Bytes(stableNetworkJson(payload)) > contract.maximumPayloadBytes) throw new Error(`Packet payload exceeds channel ${channelId}.`)
    deliveries = targets.map(/** 结构说明（自动提取）：targets.map 回调；输入 destination；直接调用 securePacket、createNetworkPacket、nextSequence、serializeNetworkPacket、utf8Bytes 等；包含显式抛错路径。 */ destination => {
      const packet = this.securePacket(createNetworkPacket({ sessionId: this.networkingState.sessionId, sender: this.networkingState.localPeerId, channel: channelId, delivery: contract.delivery, sequence: this.nextSequence(channelId, destination || '*', false), ack: null, tick: this.tick, schema: this.configuration.networking.schemaVersion, kind, payload })), source = serializeNetworkPacket(packet), bytes = utf8Bytes(source)
      if (bytes > this.configuration.networking.maximumPacketBytes) throw new Error('Packet exceeds the configured byte bound.')
      return { destination, packet, source, bytes }
    })
  } catch (error) { this.networkingState.lastError = error instanceof Error ? error.message : String(error); this.networkingState.schemaRejected++; if (this.configuration.networking.authentication.mode === 'hook') this.networkingState.authenticationRejected++; return false }
  if (now - this.budgetStarted >= 1_000) { this.networkingState.bandwidthOutKbps = Math.round(this.budgetBytes * 8 / 1024); this.budgetStarted = now; this.budgetBytes = 0 }
  const limit = this.configuration.networking.bandwidthKbps * 1024 / 8
  const totalBytes = deliveries.reduce(/* 计算表达式 sum + item.bytes 并返回结果，沿用操作数的原有类型规则。 */ (sum, item) => sum + item.bytes, 0)
  if (this.budgetBytes + totalBytes > limit) { this.networkingState.droppedPackets += deliveries.length; this.channelStat(channelId).dropped += deliveries.length; return false }
  if (contract.delivery === 'reliable-ordered' && kind !== 'ack') {
    if (!this.reliableWindow.canTrack(deliveries.length)) { this.networkingState.droppedPackets += deliveries.length; this.networkingState.reliableExpired += deliveries.length; return false }
    for (const item of deliveries) { if (!this.reliableWindow.track(item.destination || '*', item.packet, item.source, now)) { this.networkingState.droppedPackets++; this.networkingState.reliableExpired++; return false }; this.networkingState.reliableSent++ }
    this.networkingState.reliablePending = this.reliableWindow.size
  }
  this.budgetBytes += totalBytes
  for (const item of deliveries) this.sequenceByChannel.set(`${item.destination || '*'}:${item.packet.channel}`, item.packet.sequence)
  if (kind === 'resync') for (const item of deliveries) if (item.destination) { const pending = this.baselinePending.get(item.destination) ?? new Set<string>(); pending.add(`${item.packet.channel}:${item.packet.sequence}`); this.baselinePending.set(item.destination, pending) }
  const delivered = await Promise.all(deliveries.map(/* 调用 transportSend(item.source, item.packet, item.destination) 并返回调用结果。 */ item => this.transportSend(item.source, item.packet, item.destination)))
  return delivered.every(Boolean)
}

async sendAck(packet: NetworkPacket, _peer: string): Promise<void> { const ack = this.securePacket(createNetworkPacket({ sessionId: this.networkingState.sessionId, sender: this.networkingState.localPeerId, channel: packet.channel, delivery: packet.delivery, sequence: 0, ack: packet.sequence, tick: this.tick, schema: this.configuration.networking.schemaVersion, kind: 'ack', payload: null })); await this.transportSend(serializeNetworkPacket(ack), ack, packet.sender) }

async sendAuthoritativeBaseline(peerId: string, reliable: NetworkChannelDefinition): Promise<void> {
  this.baselineSending.add(peerId); this.baselinePending.set(peerId, new Set())
  const document: BaselineDocument = { format: 'nova-network-baseline', version: 1, save: this.replay.exportMultiplayerSave(this.lastEntities, this.tick), authority: this.authorityTable.entries(), scenes: this.networkingState.peerDetails.map(/** 构造并返回记录 { peerId: peer.id, sceneUuid: peer.sceneUuid }，字段按当前实参及捕获状态求值。 */ peer => ({ peerId: peer.id, sceneUuid: peer.sceneUuid })).filter(/* 返回 item.sceneUuid 的当前值。 */ item => item.sceneUuid).slice(0, 64) }
  const source = stableNetworkJson(document), configuredByteBudget = Math.max(1_024, this.configuration.networking.bandwidthKbps * 1024 / 8), maximumChunkBytes = Math.max(128, Math.min(48_000, reliable.maximumPayloadBytes - 2_048, this.configuration.networking.maximumPacketBytes - 4_096, configuredByteBudget - 768))
  const chunks: string[] = []
  for (let offset = 0; offset < source.length;) {
    let low = offset, high = Math.min(source.length, offset + maximumChunkBytes)
    while (low < high) { const end = Math.ceil((low + high) / 2); if (utf8Bytes(JSON.stringify(source.slice(offset, end))) - 2 <= maximumChunkBytes) low = end; else high = end - 1 }
    if (low <= offset) throw new Error('The authoritative baseline cannot fit the configured packet limits.')
    chunks.push(source.slice(offset, low)); offset = low
  }
  if (!chunks.length || chunks.length > 256 || utf8Bytes(source) > 8 * 1024 * 1024) throw new Error('The authoritative baseline exceeds the bounded 8 MiB / 256 chunk limit.')
  const transferId = `base-${this.tick.toString(36)}-${networkChecksum(source).slice(0, 12)}`, checksum = networkChecksum(source)
  const generation = this.connectionGeneration, targetEpoch = this.peerEpochs.get(peerId), byteBudget = configuredByteBudget, messageBudget = Math.max(1, Math.min(this.configuration.networking.maximumMessagesPerSecond, reliable.messagesPerSecond)); let windowStarted = this.ports.now(), windowBytes = 0, windowMessages = 0
  for (let index = 0; index < chunks.length; index++) {
    const estimate = Math.min(byteBudget, utf8Bytes(chunks[index]) + 768), elapsed = this.ports.now() - windowStarted
    if (windowMessages >= messageBudget || windowBytes + estimate > byteBudget) { await this.waitBaselineWindow(Math.max(1, 1_000 - elapsed),generation); windowStarted = this.ports.now(); windowBytes = 0; windowMessages = 0 }
    if (generation !== this.connectionGeneration || !this.transport || this.networkingState.status !== 'connected' || !this.handshakenPeers.has(peerId) || this.peerEpochs.get(peerId) !== targetEpoch) throw new Error('Authoritative baseline transfer was cancelled with the session or peer.')
    if (!await this.sendNetworkPacket('resync', { transferId, index, count: chunks.length, checksum, chunk: chunks[index] } satisfies BaselineChunkPayload, reliable.id, peerId)) throw new Error(`Authoritative baseline chunk ${index + 1}/${chunks.length} could not be queued.`)
    windowBytes += estimate; windowMessages++
  }
  this.baselineSending.delete(peerId)
  if (!this.baselinePending.get(peerId)?.size) { this.baselinePending.delete(peerId); this.drainDeferredInbound(peerId) }
}

queuePreAdmissionRpc(payload: RpcPayload, channelId: string): boolean {
  if (this.channel(channelId)?.delivery !== 'reliable-ordered' || this.preAdmissionRpcs.length >= Math.max(1, this.configuration.networking.maximumPendingReliable)) return false
  const expiresIn = Math.max(1_000, Math.min(30_000, this.configuration.networking.authentication.handshakeTimeoutMs))
  this.preAdmissionRpcs.push({ payload: JSON.parse(stableNetworkJson(payload)) as RpcPayload, channelId, expiresAt: this.ports.wallNow() + expiresIn })
  return true
}

flushPreAdmissionRpcs(peerId: string): void {
  const now = this.ports.wallNow(), pending = this.preAdmissionRpcs.splice(0)
  for (const item of pending) if (item.expiresAt >= now) void this.sendNetworkPacket('rpc', item.payload, item.channelId, peerId)
}

rpcEntityUuid(payload: unknown): string { if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return ''; const value = payload as Record<string, unknown>, candidate = value.entityUuid ?? value.entity; return typeof candidate === 'string' ? candidate.slice(0, 128) : '' }

acceptsRpc(contract: NetworkRpcDefinition, remoteRole: string, sender: string, payload: unknown): boolean { const localRole = this.configuration.networking.role; const direction = contract.direction === 'bidirectional' || (contract.direction === 'client-to-server' && (localRole === 'server' || localRole === 'host') && remoteRole === 'client') || (contract.direction === 'server-to-client' && localRole === 'client' && (remoteRole === 'server' || remoteRole === 'host')); const entityUuid = this.rpcEntityUuid(payload), authority = contract.authority === 'any' || (contract.authority === 'owner' && Boolean(entityUuid) && this.authorityTable.owner(entityUuid) === sender) || (contract.authority === 'server' && (remoteRole === 'server' || remoteRole === 'host')); return direction && authority }

boundedNetworkNumber(value: unknown, maximum = NETWORK_WORLD_BOUND): number | null { return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= maximum ? value : null }

normalizeEntitySnapshot(value: unknown): EntitySnapshot[] { if (!Array.isArray(value)) return []; const seen = new Set<string>(); return value.slice(0, 2_000).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 raw；直接调用 String、test、seen.has、seen.add、Array.isArray 等；写入 output.position、output.rotation、output.velocity。 */ raw => { if (!raw || typeof raw !== 'object' || typeof (raw as Record<string, unknown>).uuid !== 'string') return []; const item = raw as Record<string, unknown>, uuid = String(item.uuid); if (!/^[A-Za-z0-9_.-]{1,128}$/.test(uuid) || seen.has(uuid)) return []; seen.add(uuid); const output: EntitySnapshot = { uuid }, position = item.position, velocity = item.velocity; if (Array.isArray(position) && position.length === 2) { const x = this.boundedNetworkNumber(position[0]), y = this.boundedNetworkNumber(position[1]); if (x !== null && y !== null) output.position = [x, y] } if (typeof item.rotation === 'number') { const rotation = this.boundedNetworkNumber(item.rotation, 1_000_000_000_000); if (rotation !== null) output.rotation = rotation } if (Array.isArray(velocity) && velocity.length === 2) { const x = this.boundedNetworkNumber(velocity[0]), y = this.boundedNetworkNumber(velocity[1]); if (x !== null && y !== null) output.velocity = [x, y] } return output.position || output.rotation !== undefined || output.velocity ? [output] : [] }) }

clearDeferredInbound(peerId = ''): void {
  if (!peerId) { this.deferredInbound.clear(); this.deferredInboundCount = 0; return }
  const pending = this.deferredInbound.get(peerId)
  if (!pending) return
  this.deferredInboundCount = Math.max(0, this.deferredInboundCount - pending.size)
  this.deferredInbound.delete(peerId)
}

deferInboundPacket(packet: NetworkPacket, peer: string): boolean {
  if (packet.delivery !== 'reliable-ordered' || packet.kind === 'ack' || packet.sequence <= 0) return false
  const key = `${packet.channel}:${packet.sequence}`, pending = this.deferredInbound.get(packet.sender) ?? new Map<string, DeferredInboundPacket>()
  if (pending.has(key)) return true
  const maximum = Math.max(1, this.configuration.networking.maximumPendingReliable)
  if (pending.size >= maximum || this.deferredInboundCount >= maximum) return false
  pending.set(key, { packet, peer }); this.deferredInbound.set(packet.sender, pending); this.deferredInboundCount++
  return true
}

drainDeferredInbound(peerId: string): void {
  const pending = this.deferredInbound.get(peerId)
  if (!pending) return
  this.clearDeferredInbound(peerId)
  const packets = [...pending.values()].sort(/* 先计算 left.packet.channel.localeCompare(right.packet.channel)；仅当其为假值时求右侧 left.packet.sequence - right.packet.sequence，返回短路求值结果。 */ (left, right) => left.packet.channel.localeCompare(right.packet.channel) || left.packet.sequence - right.packet.sequence)
  for (const item of packets) this.processAcceptedPacket(item.packet, item.peer)
}

processPacket(packet: NetworkPacket, peer: string): void {
  if (packet.kind === 'ack') { if (packet.ack !== null && (this.reliableWindow.acknowledge(packet.sender, packet.channel, packet.ack) || this.reliableWindow.acknowledgeBootstrap(packet.channel, packet.ack))) this.networkingState.reliableAcknowledged++; const baseline = this.baselinePending.get(packet.sender); if (packet.ack !== null && baseline) { baseline.delete(`${packet.channel}:${packet.ack}`); if (!baseline.size && !this.baselineSending.has(packet.sender)) { this.baselinePending.delete(packet.sender); this.addEvent(`Authoritative baseline acknowledged by ${packet.sender}.`); this.drainDeferredInbound(packet.sender) } }; this.networkingState.reliablePending = this.reliableWindow.size; return }
  if (packet.kind === 'hello' || packet.kind === 'join') {
    const payload = packet.payload && typeof packet.payload === 'object' ? packet.payload as Partial<HelloPayload> : {}, claimedRole = payload.role === 'server' || payload.role === 'host' ? payload.role : 'client', localRole = this.configuration.networking.role
    const trustedAuthorityRoute = this.authorityClaimTrusted(packet.sender, peer)
    const admittedRole: HelloPayload['role'] = localRole === 'server' || localRole === 'host' ? 'client' : trustedAuthorityRoute && (claimedRole === 'server' || claimedRole === 'host') ? claimedRole : 'client'
    const hello: HelloPayload = { role: admittedRole, playerName: typeof payload.playerName === 'string' ? payload.playerName.slice(0, 80) : packet.sender, lateJoin: payload.lateJoin === true }, wasKnown = this.handshakenPeers.has(packet.sender)
    if (!this.updatePeer(packet.sender, hello)) { this.networkingState.droppedPackets++; this.networkingState.schemaRejected++; this.addEvent(`Peer ${packet.sender} was rejected because the session is full.`, 'warning'); return }
    this.peerSources.set(packet.sender, peer); this.sourcePeers.set(peer, packet.sender)
    this.peerEpochs.set(packet.sender, packet.security?.epoch ?? '')
    if (this.transport?.kind === 'native-udp') this.transport.bindPeer?.(packet.sender, peer)
    this.handshakenPeers.add(packet.sender); const reliable = this.channelByDelivery('reliable-ordered', 'events')
    if (!wasKnown && claimedRole !== admittedRole) this.addEvent(`Peer ${packet.sender} requested ${claimedRole} authority and was admitted as client.`, 'warning')
    if (!wasKnown && packet.kind === 'hello' && reliable) void this.sendNetworkPacket('join', { role: localRole, playerName: this.configuration.networking.playerName, lateJoin: this.configuration.networking.lateJoin } satisfies HelloPayload, reliable.id, packet.sender)
    if (!wasKnown && this.tick > 0 && this.configuration.networking.lateJoin && (localRole === 'server' || localRole === 'host')) { const baselineGeneration=this.connectionGeneration;this.networkingState.lateJoins++; if (reliable) void this.sendAuthoritativeBaseline(packet.sender, reliable).catch(/** 结构说明（自动提取）：catch 回调；输入 error；直接调用 removePeer、String、addEvent；写入 networkingState.lastError。 */ error => { if(baselineGeneration!==this.connectionGeneration)return;this.removePeer(packet.sender, 'failed authoritative baseline'); this.networkingState.lastError = error instanceof Error ? error.message : String(error); this.addEvent(this.networkingState.lastError, 'error') }) }
    if (!wasKnown) this.flushPreAdmissionRpcs(packet.sender)
    this.addEvent(`${hello.playerName} joined as ${hello.role}.`); return
  }
  if (!this.updatePeer(packet.sender)) { this.networkingState.droppedPackets++; this.networkingState.schemaRejected++; return }
  if (packet.kind === 'leave') { this.removePeer(packet.sender, 'disconnect'); this.addEvent(`${packet.sender} left.`); return }
  if (packet.kind === 'authority') {
    const value = packet.payload && typeof packet.payload === 'object' ? packet.payload as Partial<AuthorityPayload> : {}, entityUuid = typeof value.entityUuid === 'string' ? value.entityUuid.slice(0, 128) : '', targetPeerId = typeof value.targetPeerId === 'string' ? value.targetPeerId.slice(0, 80) : '', remoteRole = this.networkingState.peerDetails.find(/* 比较 item.id 与 packet.sender，返回严格相等的判断结果。 */ item => item.id === packet.sender)?.role ?? 'client'
    const authorized = this.configuration.networking.allowAuthorityTransfer && ((remoteRole === 'server' || remoteRole === 'host') || this.authorityTable.owner(entityUuid) === packet.sender) && (targetPeerId === this.networkingState.localPeerId || this.networkingState.peerDetails.some(/* 比较 item.id 与 targetPeerId，返回严格相等的判断结果。 */ item => item.id === targetPeerId))
    if (!authorized || !this.authorityTable.transfer(entityUuid, targetPeerId)) { this.networkingState.schemaRejected++; this.addEvent(`Authority transfer from ${packet.sender} was rejected.`, 'warning'); return }
    this.interpolationTargets.delete(entityUuid); this.networkingState.authorityTransfers++; this.refreshProductionDiagnostics(); this.addEvent(`Authority for ${entityUuid} transferred to ${targetPeerId}.`); return
  }
  if (packet.kind === 'interest') {
    const value = packet.payload && typeof packet.payload === 'object' ? packet.payload as Partial<InterestPayload> : {}, center = value.center
    if (!Array.isArray(center) || center.length !== 2 || !center.every(Number.isFinite) || !Number.isFinite(value.radius)) { this.networkingState.schemaRejected++; return }
    this.peerInterests.set(packet.sender, { peerId: packet.sender, center: [Number(center[0]), Number(center[1])], radius: Math.max(0, Math.min(this.configuration.networking.interest.maximumRadius, Number(value.radius))), sceneUuid: typeof value.sceneUuid === 'string' ? value.sceneUuid.slice(0, 128) : '', updatedAt: this.ports.wallNow() }); this.refreshProductionDiagnostics(); return
  }
  if (packet.kind === 'scene') {
    const value = packet.payload && typeof packet.payload === 'object' ? packet.payload as Partial<ScenePayload> : {}, remoteRole = this.networkingState.peerDetails.find(/* 比较 item.id 与 packet.sender，返回严格相等的判断结果。 */ item => item.id === packet.sender)?.role ?? 'client', sceneUuid = typeof value.sceneUuid === 'string' ? value.sceneUuid.slice(0, 128) : '', spawnTag = typeof value.spawnTag === 'string' ? value.spawnTag.slice(0, 80) : ''
    if (!this.configuration.networking.allowSceneHandoff || (remoteRole !== 'server' && remoteRole !== 'host') || !sceneUuid) { this.networkingState.schemaRejected++; this.addEvent('Scene handoff was rejected by authority or project policy.', 'warning'); return }
    const detail = this.networkingState.peerDetails.find(/* 比较 item.id 与 packet.sender，返回严格相等的判断结果。 */ item => item.id === packet.sender); if (detail) detail.sceneUuid = sceneUuid
    this.networkingState.sceneHandoffs++; this.addEvent(`Scene handoff to ${sceneUuid} received from ${packet.sender}.`); void this.sceneHandoffHandler?.(sceneUuid, spawnTag, packet.sender); return
  }
  if (packet.kind === 'rpc') { this.networkingState.rpcCalls++; const payload = packet.payload && typeof packet.payload === 'object' ? packet.payload as Partial<RpcPayload> : {}, contract = this.configuration.networking.rpcContracts.find(/* 比较 item.name 与 payload.name，返回严格相等的判断结果。 */ item => item.name === payload.name), remoteRole = this.networkingState.peerDetails.find(/* 比较 item.id 与 packet.sender，返回严格相等的判断结果。 */ item => item.id === packet.sender)?.role ?? 'client'; if (!contract || contract.channelId !== packet.channel || !this.acceptsRpc(contract, remoteRole, packet.sender, payload.value) || !validatePayloadSchema(payload.value, contract.payloadSchema) || utf8Bytes(stableNetworkJson(payload.value)) > contract.maximumPayloadBytes || !this.rpcRate.accept(`${packet.sender}:${contract.name}`, contract.callsPerSecond, this.ports.now())) { this.networkingState.rpcRejected++; this.networkingState.schemaRejected++; return }; try { this.rpcHandlers.get(contract.name)?.(payload.value, { sender: packet.sender, tick: packet.tick }) } catch (error) { this.networkingState.lastError = error instanceof Error ? error.message : String(error); this.addEvent(`RPC ${contract.name} failed: ${this.networkingState.lastError}`, 'error') }; return }
  if (packet.kind === 'input') { const normalized = normalizeNetworkInput(packet.payload, true); if (!normalized) { this.networkingState.schemaRejected++; this.networkingState.droppedPackets++; this.addEvent(`Malformed input frame from ${packet.sender} was rejected.`, 'warning'); return }; const frames = this.remoteInputs.get(packet.sender) ?? new Map<number, InputSnapshot>(); frames.set(packet.tick, normalized); while (frames.size > Math.max(1, this.configuration.networking.rollbackFrames)) frames.delete(frames.keys().next().value ?? 0); this.remoteInputs.set(packet.sender, frames); this.networkingState.inputFrames++; return }
  if (packet.kind === 'resync') {
    const reject = /** 结构说明（自动提取）：reject；输入 message；直接调用 removePeer、addEvent、scheduleReconnect；写入 networkingState.lastError、networkingState.status。 */ (message: string): void => {
      this.removePeer(packet.sender, 'invalid authoritative baseline')
      this.networkingState.schemaRejected++; this.networkingState.droppedPackets++; this.networkingState.lastError = message; this.addEvent(message, 'error')
      if (this.configuration.networking.role === 'client') { this.networkingState.status = 'error'; this.scheduleReconnect() }
    }
    const payload = packet.payload && typeof packet.payload === 'object' ? packet.payload as Partial<BaselineChunkPayload> : {}, remoteRole = this.networkingState.peerDetails.find(/* 比较 item.id 与 packet.sender，返回严格相等的判断结果。 */ item => item.id === packet.sender)?.role ?? 'client'
    const valid = this.configuration.networking.role === 'client' && this.configuration.networking.lateJoin && (remoteRole === 'server' || remoteRole === 'host') && typeof payload.transferId === 'string' && /^[A-Za-z0-9_.-]{1,80}$/.test(payload.transferId) && Number.isSafeInteger(payload.index) && Number.isSafeInteger(payload.count) && Number(payload.count) >= 1 && Number(payload.count) <= 256 && Number(payload.index) >= 0 && Number(payload.index) < Number(payload.count) && typeof payload.checksum === 'string' && /^[a-f0-9]{24}$/i.test(payload.checksum) && typeof payload.chunk === 'string'
    if (!valid) { reject('Unauthorized or malformed authoritative baseline. Reconnect after correcting the sender.'); return }
    const chunkPayload = payload as BaselineChunkPayload
    let transfer = this.baselineTransfers.get(packet.sender)
    if (!transfer || transfer.transferId !== chunkPayload.transferId) {
      if (chunkPayload.index !== 0) { reject('Authoritative baseline must start with chunk zero.'); return }
      transfer = { transferId: chunkPayload.transferId, count: chunkPayload.count, checksum: chunkPayload.checksum, chunks: new Map(), bytes: 0, startedAt: this.ports.wallNow() }; this.baselineTransfers.set(packet.sender, transfer)
    }
    if (transfer.count !== chunkPayload.count || transfer.checksum !== chunkPayload.checksum || this.ports.wallNow() - transfer.startedAt > 15_000) { reject('Authoritative baseline metadata changed or the transfer expired.'); return }
    if (!transfer.chunks.has(chunkPayload.index)) {
      transfer.bytes += utf8Bytes(chunkPayload.chunk)
      if (transfer.bytes > 8 * 1024 * 1024) { reject('Authoritative baseline exceeds 8 MiB.'); return }
      transfer.chunks.set(chunkPayload.index, chunkPayload.chunk)
    }
    if (transfer.chunks.size !== transfer.count) { void this.sendAck(packet, peer); return }
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
      const definitions = this.configuration.networking.replicatedEntities, allowed = new Set(definitions.map(/* 返回 definition.entityUuid 的当前值。 */ definition => definition.entityUuid)), stagedAuthority = new NetworkAuthorityTable()
      if (!stagedAuthority.restore(document.authority, definitions)) throw new Error('Authoritative baseline ownership is invalid.')
      if (!Array.isArray(document.save.entities) || document.save.entities.some(/* 先计算 !entity；仅当其为假值时求右侧 !allowed.has(entity.uuid)，返回短路求值结果。 */ entity => !entity || !allowed.has(entity.uuid))) throw new Error('Authoritative baseline contains an entity outside the replication contract.')
      const restored = this.replay.importMultiplayerSave(document.save, this.lastEntities, new Map(definitions.map(/* 返回按声明顺序构造的数组 [definition.entityUuid, definition.properties]。 */ definition => [definition.entityUuid, definition.properties])))
      this.authorityTable.restore(stagedAuthority.entries(), definitions)
      for (const scene of document.scenes) { const detail = this.networkingState.peerDetails.find(/* 比较 item.id 与 scene.peerId，返回严格相等的判断结果。 */ item => item.id === scene.peerId); if (detail) detail.sceneUuid = scene.sceneUuid }
      this.tick = Math.max(this.tick, restored.tick); this.networkingState.currentTick = this.tick
      this.networkingState.lateJoins++; this.networkingState.snapshots++; this.baselineTransfers.delete(packet.sender); this.refreshProductionDiagnostics()
      this.addEvent('Late-join baseline restored ' + restored.restored + ' entities and current authority state.')
      void this.sendAck(packet, peer)
    } catch (error) { reject(error instanceof Error ? error.message : String(error)) }
    return
  }

  if (packet.kind === 'snapshot') { const payload = packet.payload && typeof packet.payload === 'object' ? packet.payload as Partial<SnapshotPayload> : {}, entities = this.normalizeEntitySnapshot(payload.entities); this.remoteSnapshots.push({ ...packet, payload: { entities, checksum: typeof payload.checksum === 'string' ? payload.checksum.slice(0, 64) : '', full: payload.full === true } }); if (this.remoteSnapshots.length > 128) this.remoteSnapshots.splice(0, this.remoteSnapshots.length - 128); this.networkingState.snapshots++; return }
  if (packet.kind === 'ping') { const reliable = this.channelByDelivery('reliable-ordered', packet.channel); if (reliable) void this.sendNetworkPacket('pong', { sentAt: (packet.payload as { sentAt?: unknown })?.sentAt ?? 0 }, reliable.id, packet.sender); return }
  if (packet.kind === 'pong') { const sentAt = Number((packet.payload as { sentAt?: unknown })?.sentAt); if (Number.isFinite(sentAt)) this.networkingState.pingMs = Math.max(0, this.ports.now() - sentAt) }
}

commitPacketReplay(packet: NetworkPacket): void { this.replayProtection.accept(packet.sender, packet.security, this.ports.wallNow(), this.configuration.networking.security.maximumPacketAgeMs, this.configuration.networking.security.replayWindow, this.configuration.networking.authentication.mode === 'hook' || this.configuration.networking.authentication.requireVerifiedPeers) }

processAcceptedPacket(packet: NetworkPacket, peer: string): void {
  const sequenceKey = `${packet.sender}:${packet.channel}`
  if (packet.delivery === 'reliable-ordered' && !this.inboundSequences.has(sequenceKey) && packet.sequence > 0 && ((packet.kind === 'hello' || packet.kind === 'join' || packet.kind === 'resync') || !this.handshakenPeers.has(packet.sender))) this.inboundSequences.set(sequenceKey, packet.sequence - 1)
  const previous = this.inboundSequences.get(sequenceKey) ?? 0
  const distance = this.sequenceDistance(previous, packet.sequence)
  if (packet.delivery === 'unreliable-sequenced') { if (distance === 0 || distance > MAX_SEQUENCE / 2) { this.networkingState.duplicatePackets++; return }; this.commitPacketReplay(packet); this.inboundSequences.set(sequenceKey, packet.sequence); this.processPacket(packet, peer); return }
  if (packet.kind === 'ack') { this.commitPacketReplay(packet); this.processPacket(packet, peer); return }
  if (distance === 0 || distance > MAX_SEQUENCE / 2) { this.networkingState.duplicatePackets++; return }
  if (distance > this.configuration.networking.maximumPendingReliable) { this.networkingState.droppedPackets++; this.networkingState.outOfOrderPackets++; this.networkingState.lastError = `Reliable sequence gap from ${packet.sender} exceeds the receive window.`; return }
  const buffer = this.reliableBuffers.get(sequenceKey) ?? new Map<number, NetworkPacket>()
  if (!buffer.has(packet.sequence) && buffer.size >= this.configuration.networking.maximumPendingReliable) { this.networkingState.droppedPackets++; this.networkingState.reliableExpired++; return }
  this.commitPacketReplay(packet)
  buffer.set(packet.sequence, packet); this.reliableBuffers.set(sequenceKey, buffer); if (distance > 1) this.networkingState.outOfOrderPackets++
  let expected = this.nextExpectedSequence(previous)
  while (buffer.has(expected)) { const ordered = buffer.get(expected)!; buffer.delete(expected); this.inboundSequences.set(sequenceKey, expected); this.processPacket(ordered, peer); if (!this.handshakenPeers.has(packet.sender)) break; if (ordered.kind !== 'resync') void this.sendAck(ordered, peer); expected = this.nextExpectedSequence(expected) }
}

receive(source: string, peer: string): void {
  if (!this.configuration.networking.enabled || !this.configuration.networking.permissionGranted) { void this.stopNetworking(); return }
  if (!this.transport || this.networkingState.status !== 'connected') return
  const bytes = utf8Bytes(source), now = this.ports.now()
  if (now - this.receiveBudgetStarted >= 1_000) { this.networkingState.bandwidthInKbps = Math.round(this.receiveBudgetBytes * 8 / 1024); this.receiveBudgetStarted = now; this.receiveBudgetBytes = 0 }
  const limit = this.configuration.networking.bandwidthKbps * 1024 / 8
  if (this.receiveBudgetBytes + bytes > limit || !this.inboundRate.accept('global', this.configuration.networking.maximumMessagesPerSecond, now)) { this.networkingState.droppedPackets++; this.networkingState.rateLimited++; return }
  this.receiveBudgetBytes += bytes
  const parsed = parseNetworkPacket(source, this.protocolLimits(), this.configuration.networking.channels, this.networkingState.sessionId)
  if (!parsed.packet) { this.networkingState.droppedPackets++; this.networkingState.invalidPackets++; this.networkingState.lastError = parsed.error; return }
  const packet = parsed.packet
  if (!peer || peer.length > 256) { this.networkingState.droppedPackets++; this.networkingState.authenticationRejected++; this.networkingState.lastError = 'Transport source identity is empty or oversized.'; return }
  const boundSource = this.peerSources.get(packet.sender), boundPeer = this.sourcePeers.get(peer)
  if ((boundSource && boundSource !== peer) || (boundPeer && boundPeer !== packet.sender)) { this.networkingState.droppedPackets++; this.networkingState.authenticationRejected++; this.networkingState.lastError = `Transport source identity changed for ${packet.sender}; packet rejected.`; return }
  let authenticated = false
  if (this.configuration.networking.authentication.mode === 'hook') {
    const security = packet.security
    authenticated = Boolean(security && verifyAuthenticationProof(this.configuration.networking.authentication.providerId, { sessionId: packet.sessionId, sender: packet.sender, epoch: security.epoch, nonce: security.nonce, issuedAt: security.issuedAt, packetChecksum: this.authenticationChecksum(packet) }, security.proof))
    if (!authenticated) { this.networkingState.droppedPackets++; this.networkingState.authenticationRejected++; this.networkingState.lastError = 'Packet authentication proof was rejected.'; return }
  }
  let knownPeer = this.networkingState.peerDetails.find(/* 比较 item.id 与 packet.sender，返回严格相等的判断结果。 */ item => item.id === packet.sender)
  const lifecyclePacket = packet.kind === 'hello' || packet.kind === 'join', admittedEpoch = this.peerEpochs.get(packet.sender), incomingEpoch = packet.security?.epoch ?? '', replacingEpoch = admittedEpoch !== undefined && admittedEpoch !== incomingEpoch
  this.pruneRetiredEpochs()
  if ((incomingEpoch && this.retiredPeerEpochs.has(`${packet.sender}:${incomingEpoch}`)) || (replacingEpoch && (!lifecyclePacket || !incomingEpoch)) || ((!knownPeer || replacingEpoch) && this.retiredPeerEpochs.size >= 4096)) { this.networkingState.droppedPackets++; this.networkingState.replayRejected++; this.networkingState.lastError = 'Packet epoch is retired, changed without a lifecycle handshake, or reconnect history is full.'; return }
  if (!knownPeer && !lifecyclePacket) { this.networkingState.droppedPackets++; this.networkingState.lastError = `Peer ${packet.sender} sent ${packet.kind} before admission.`; this.packetSummary('in', peer, packet, bytes, false); return }
  if (!knownPeer && lifecyclePacket && this.networkingState.peerDetails.length >= this.configuration.networking.maxPeers) { this.networkingState.droppedPackets++; this.networkingState.schemaRejected++; this.networkingState.lastError = 'Session peer limit reached.'; return }
  const sequenceKey = `${packet.sender}:${packet.channel}`, previousSequence = this.inboundSequences.get(sequenceKey) ?? 0, bufferedSequence = this.reliableBuffers.get(sequenceKey)?.has(packet.sequence) === true
  const contract = this.channel(packet.channel)
  if (!contract || !this.inboundRate.accept(`${packet.sender}:${packet.channel}`, contract.messagesPerSecond, now)) { this.networkingState.rateLimited++; this.channelStat(packet.channel).dropped++; this.packetSummary('in', peer, packet, bytes, false); return }
  const replayDecision = this.replayProtection.accept(packet.sender, packet.security, this.ports.wallNow(), this.configuration.networking.security.maximumPacketAgeMs, this.configuration.networking.security.replayWindow, this.configuration.networking.authentication.mode === 'hook' || this.configuration.networking.authentication.requireVerifiedPeers, false)
  if (!replayDecision.accepted) { this.networkingState.droppedPackets++; this.networkingState.replayRejected++; this.networkingState.lastError = `Packet rejected by replay protection: ${replayDecision.reason}.`; const alreadyProcessed = this.sequenceDistance(previousSequence, packet.sequence) === 0 || this.sequenceDistance(previousSequence, packet.sequence) > MAX_SEQUENCE / 2; if (replayDecision.reason === 'duplicate' && knownPeer && !bufferedSequence && alreadyProcessed && packet.delivery === 'reliable-ordered' && packet.kind !== 'ack') void this.sendAck(packet, peer); return }
  if (replacingEpoch) { this.removePeer(packet.sender, 'new connection epoch'); knownPeer = undefined }
  if (knownPeer) { knownPeer.lastSeenAt = this.ports.wallNow(); knownPeer.verified ||= authenticated }
  if (authenticated) this.verifiedPeers.add(packet.sender)
  if (knownPeer && this.baselinePending.has(packet.sender) && !['ack', 'leave', 'hello', 'join'].includes(packet.kind)) {
    if (this.deferInboundPacket(packet, peer)) {
      this.commitPacketReplay(packet)
      this.networkingState.receivedBytes += bytes; this.networkingState.receivedPackets++; this.channelStat(packet.channel).received++; this.packetSummary('in', peer, packet, bytes, true)
      return
    }
    this.networkingState.droppedPackets++; this.channelStat(packet.channel).dropped++; this.packetSummary('in', peer, packet, bytes, false); this.networkingState.lastError = `Peer ${packet.sender} is waiting for its authoritative baseline.`; return
  }
  this.networkingState.receivedBytes += bytes; this.networkingState.receivedPackets++; this.channelStat(packet.channel).received++; this.packetSummary('in', peer, packet, bytes, true)
  this.processAcceptedPacket(packet, peer)
}

scheduleReconnect(): void { if (!this.reconnectAllowed || !this.configuration.networking.enabled || !this.configuration.networking.permissionGranted || !this.configuration.networking.reconnect || this.networkingState.status === 'disabled' || this.reconnectTimer !== null) return; if (this.networkingState.reconnectAttempts >= this.configuration.networking.reconnectMaxAttempts) { this.networkingState.status = 'error'; this.networkingState.lastError = 'Reconnect attempt limit reached.'; return }; this.networkingState.status = 'reconnecting'; const generation=this.connectionGeneration;const delay = Math.min(10_000, 500 * 2 ** Math.min(5, this.networkingState.reconnectAttempts++)); this.reconnectTimer = this.ports.setTimeout(/** 结构说明（自动提取）：globalThis.setTimeout 回调；无显式参数；直接调用 catch；写入 reconnectTimer、transport。 */ () => { this.reconnectTimer = null; const active = this.transport; this.transport = null; void (/** 结构说明（自动提取）：匿名回调；无显式参数；直接调用 active.close、startNetworking；等待异步结果。 */ async () => { if (active) try { await active.close() } catch {}; if (this.reconnectAllowed&&generation===this.connectionGeneration) await this.startNetworking() })().catch(/** 结构说明（自动提取）：catch 回调；输入 error；直接调用 String；写入 networkingState.status、networkingState.lastError。 */ error => { if(generation!==this.connectionGeneration)return;this.networkingState.status = 'error'; this.networkingState.lastError = error instanceof Error ? error.message : String(error) }) }, delay) }

startNetworking(): Promise<void> {
  if (this.startupPromise) return this.startupPromise
  const pending = this.startNetworkingSession(); this.startupPromise = pending
  void pending.finally(/** 结构说明（自动提取）：pending.finally 回调；无显式参数；写入 startupPromise。 */ () => { if (this.startupPromise === pending) this.startupPromise = null }).catch(/* 返回 undefined 的当前值。 */ () => undefined)
  return pending
}

async startNetworkingSession(): Promise<void> {
  if (!this.configuration.networking.enabled) throw new Error('Networking is disabled for this project.')
  if (!this.configuration.networking.permissionGranted) { this.networkingState.status = 'permission-required'; throw new Error('Network permission must be granted explicitly before a session starts.') }
  if (this.transport) return
  if (this.configuration.networking.authentication.requireVerifiedPeers && this.configuration.networking.authentication.mode !== 'hook') throw new Error('Verified peers require a reviewed authentication hook.')
  if (this.configuration.networking.authentication.mode === 'hook' && !networkAuthenticationProviders().some(/* 比较 provider.id 与 productionSettings.networking.authentication.providerId，返回严格相等的判断结果。 */ provider => provider.id === this.configuration.networking.authentication.providerId)) throw new Error('The selected network authentication provider is not registered.')
  const reviewed = this.configuration.networking.transportAdapterId ? createReviewedNetworkTransport(this.configuration.networking.transportAdapterId, this.configuration.networking) : null
  if (this.configuration.networking.transportAdapterId && !reviewed) throw new Error(`Reviewed transport adapter ${this.configuration.networking.transportAdapterId} is not registered.`)
  const adapterEncrypted = reviewedNetworkTransports().find(/* 比较 item.id 与 productionSettings.networking.transportAdapterId，返回严格相等的判断结果。 */ item => item.id === this.configuration.networking.transportAdapterId)?.encrypted === true, encryption = networkEncryptionGuidance(this.configuration.networking, adapterEncrypted); this.networkingState.encryptedTransport = encryption.protected; this.networkingState.encryptionMessage = encryption.message
  if (encryption.severity === 'error') { this.networkingState.status = 'error'; this.networkingState.lastError = encryption.message; throw new Error(encryption.message) }
  this.reconnectAllowed = true; this.connectionGeneration++; this.cancelScheduledDeliveries(); this.resetConnectionPeerState(); this.networkingState.status = 'connecting'; this.networkingState.lastError = ''; this.networkingState.sessionMode = this.configuration.networking.sessionMode; this.networkingState.sessionId = this.networkSessionId(); this.networkingState.localPeerId ||= this.peerIdentity(); this.simulator = new DeterministicNetworkSimulator(this.configuration.networking.simulation.seed); this.reliableWindow = new ReliablePacketWindow(this.configuration.networking.maximumPendingReliable); this.sessionEpoch = this.ports.createEpoch(); this.tick = 0; this.snapshotAccumulator = 0; this.budgetStarted = this.ports.now(); this.budgetBytes = 0; this.receiveBudgetStarted = this.budgetStarted; this.receiveBudgetBytes = 0; this.rollbackTimeline.clear(); this.replicationDiffs.clear(); this.authorityTable.initialize(this.configuration.networking.replicatedEntities, this.networkingState.localPeerId, this.configuration.networking.role); this.refreshProductionDiagnostics()
  const generation = this.connectionGeneration
  let ownedTransport: NetworkTransport | null = null
  try {
    await this.openNetworkServices(generation); this.requireConnectionGeneration(generation)
    this.transport = this.configuration.networking.sessionMode === 'local' ? this.ports.createTransport('local-loopback',this.transportContext()) : reviewed ?? (this.configuration.networking.transport === 'native-udp' ? this.ports.createTransport('native-udp',this.transportContext()) : this.ports.createTransport('websocket',this.transportContext())); ownedTransport = this.transport; this.networkingState.transport = this.transport.kind; this.networkingState.transportAdapterId = this.configuration.networking.transportAdapterId
    if (encryption.severity === 'warning') this.addEvent(encryption.message, 'warning')
    await ownedTransport.connect(/** 结构说明（自动提取）：ownedTransport.connect 回调；输入 source、peer；直接调用 receive。 */ (source, peer) => { if (generation === this.connectionGeneration && this.transport === ownedTransport) this.receive(source, peer) }, /** 结构说明（自动提取）：ownedTransport.connect 回调；输入 state；直接调用 scheduleReconnect；写入 networkingState.status、networkingState.lastError。 */ state => { if (generation !== this.connectionGeneration || this.transport !== ownedTransport) return; if (state === 'connected') this.networkingState.status = 'connected'; else if (this.networkingState.status !== 'disabled') { this.networkingState.lastError = state; this.scheduleReconnect() } }); this.requireConnectionGeneration(generation); this.networkingState.status = 'connected'; this.networkingState.reconnectAttempts = 0; this.addEvent(`${ownedTransport.kind} session started${this.serviceHandles.length ? ` with ${this.serviceHandles.length} explicitly selected reviewed service(s)` : '; no Nova_A cloud service is involved'}.`); const reliable = this.channelByDelivery('reliable-ordered', 'events'); if (!reliable) throw new Error('At least one reliable channel is required for session control.'); await this.sendNetworkPacket('hello', { role: this.configuration.networking.role, playerName: this.configuration.networking.playerName, lateJoin: this.configuration.networking.lateJoin } satisfies HelloPayload, reliable.id)
  } catch (error) { if (generation !== this.connectionGeneration) { if (ownedTransport) try { await ownedTransport.close() } catch {}; throw this.ports.abortError('Network session opening was cancelled.') }; this.networkingState.status = 'error'; this.networkingState.lastError = error instanceof Error ? error.message : String(error); this.addEvent(this.networkingState.lastError, 'error'); const active = this.transport; this.transport = null; const closingServices = this.closeNetworkServices(); await Promise.allSettled([closingServices, active?.close()]); if (generation === this.connectionGeneration) this.scheduleReconnect(); throw error }
}

async stopNetworking(disableState = true): Promise<void> {
  this.reconnectAllowed = false
  if (this.reconnectTimer !== null) this.ports.clearTimeout(this.reconnectTimer)
  this.reconnectTimer = null
  const reliable = this.channelByDelivery('reliable-ordered', 'events')
  const leaving = this.transport && this.networkingState.status === 'connected' && reliable ? this.sendNetworkPacket('leave', null, reliable.id) : Promise.resolve(false)
  this.connectionGeneration++; this.startupPromise = null; this.cancelScheduledDeliveries()
  const active = this.transport; this.transport = null
  const closingServices = this.closeNetworkServices()
  this.resetConnectionPeerState(); this.localHistory.splice(0); this.authorityTable.clear(); this.rollbackTimeline.clear(); this.replicationDiffs.clear(); this.localInterest = null
  this.networkingState.ownership.splice(0); this.networkingState.peerInterests.splice(0); this.networkingState.rollbackTimeline.splice(0); this.networkingState.replicationDiffs.splice(0); this.networkingState.reliablePending = 0
  if (disableState) { this.networkingState.status = 'disabled'; this.networkingState.reconnectAttempts = 0 }
  await Promise.allSettled([leaving, closingServices, active?.close()])
}

localSnapshot(entities: Entity[], full = false, targetPeer = ''): SnapshotPayload {
  const definitions = new Map(this.configuration.networking.replicatedEntities.map(/* 返回按声明顺序构造的数组 [definition.entityUuid, definition]。 */ definition => [definition.entityUuid, definition])), view = targetPeer ? this.peerInterests.get(targetPeer) : undefined
  const snapshots = entities.flatMap(/** 结构说明（自动提取）：entities.flatMap 回调；输入 entity；直接调用 definitions.get、authorityTable.owner、worldTransform、finiteNumber、entityRelevantToPeer 等；写入 snapshot.position、snapshot.rotation、snapshot.velocity。 */ entity => {
    const definition = definitions.get(entity.uuid); if (!definition) return []
    const owner = this.authorityTable.owner(entity.uuid), sendsAuthority = definition.authority === 'server' ? this.configuration.networking.role === 'server' || this.configuration.networking.role === 'host' : owner === this.networkingState.localPeerId || this.configuration.networking.role === 'host' || this.configuration.networking.role === 'server'
    if (!sendsAuthority) return []
    const transform = worldTransform(entity, entities), position: [number, number] = [finiteNumber(transform.position.x), finiteNumber(transform.position.y)]
    if (!full && !entityRelevantToPeer(definition, position, view, this.configuration.networking.interest.enabled)) { this.networkingState.interestCulled++; return [] }
    const snapshot: EntitySnapshot = { uuid: entity.uuid }
    if (definition.properties.includes('transform')) snapshot.position = position
    if (definition.properties.includes('rotation')) snapshot.rotation = finiteNumber(transform.rotation)
    if (definition.properties.includes('velocity')) snapshot.velocity = [finiteNumber(entity.velocity.x), finiteNumber(entity.velocity.y)]
    return snapshot.position || snapshot.rotation !== undefined || snapshot.velocity ? [snapshot] : []
  }).slice(0, 2_000).sort(/* 调用 left.uuid.localeCompare(right.uuid) 并返回调用结果。 */ (left, right) => left.uuid.localeCompare(right.uuid))
  return { checksum: networkChecksum(snapshots), full, entities: snapshots }
}

snapshotPage(snapshot: SnapshotPayload, target: string, contract: NetworkChannelDefinition): SnapshotPayload | null {
  if (!snapshot.entities.length) return null
  const empty = { entities: [], checksum: '0'.repeat(24), full: false }, emptyBytes = utf8Bytes(stableNetworkJson(empty))
  const envelope = createNetworkPacket({ sessionId: this.networkingState.sessionId, sender: this.networkingState.localPeerId, channel: contract.id, delivery: contract.delivery, sequence: MAX_SEQUENCE, ack: null, tick: MAX_SEQUENCE, schema: this.configuration.networking.schemaVersion, kind: 'snapshot', payload: empty, security: { epoch: this.sessionEpoch, nonce: '0'.repeat(24), issuedAt: Number.MAX_SAFE_INTEGER, proof: this.configuration.networking.authentication.mode === 'hook' ? '0'.repeat(512) : '' } })
  const overhead = utf8Bytes(stableNetworkJson(envelope)) - emptyBytes, limit = Math.min(contract.maximumPayloadBytes, this.configuration.networking.maximumPacketBytes - overhead)
  const start = (this.snapshotCursors.get(target) ?? 0) % snapshot.entities.length, page: EntitySnapshot[] = []
  let bytes = emptyBytes
  for (let offset = 0; offset < Math.min(1024, snapshot.entities.length); offset++) {
    const entity = snapshot.entities[(start + offset) % snapshot.entities.length], nextBytes = utf8Bytes(stableNetworkJson(entity)) + (page.length ? 1 : 0)
    if (bytes + nextBytes > limit) break
    bytes += nextBytes; page.push(entity)
  }
  this.networkingState.snapshotPageEntities = page.length; this.networkingState.snapshotDeferredEntities = snapshot.entities.length - page.length
  if (!page.length) { this.networkingState.lastError = 'A replicated entity cannot fit the state channel or packet byte limit. Increase the limit or reduce replicated properties.'; return null }
  this.snapshotCursors.set(target, (start + page.length) % snapshot.entities.length)
  page.sort(/* 调用 a.uuid.localeCompare(b.uuid) 并返回调用结果。 */ (a, b) => a.uuid.localeCompare(b.uuid))
  return { entities: page, checksum: networkChecksum(page), full: false }
}

predictionSnapshot(entities: Entity[]): SnapshotPayload {
  const definitions = new Map(this.configuration.networking.replicatedEntities.map(/* 返回按声明顺序构造的数组 [definition.entityUuid, definition]。 */ definition => [definition.entityUuid, definition]))
  return { checksum: this.lastChecksum, full: true, entities: entities.flatMap(/** 结构说明（自动提取）：entities.flatMap 回调；输入 entity；直接调用 definitions.get、worldTransform、definition.properties.includes、finiteNumber；写入 snapshot.position、snapshot.rotation、snapshot.velocity。 */ entity => {
    const definition = definitions.get(entity.uuid); if (!definition) return []
    const transform = worldTransform(entity, entities), snapshot: EntitySnapshot = { uuid: entity.uuid }
    if (definition.properties.includes('transform')) snapshot.position = [finiteNumber(transform.position.x), finiteNumber(transform.position.y)]
    if (definition.properties.includes('rotation')) snapshot.rotation = finiteNumber(transform.rotation)
    if (definition.properties.includes('velocity')) snapshot.velocity = [finiteNumber(entity.velocity.x), finiteNumber(entity.velocity.y)]
    return [snapshot]
  }).slice(0, 2_000) }
}

parentFirstNetworkStates<T extends { uuid: string }>(states: readonly T[], entities: readonly Entity[]): T[] {
  const byUuid = new Map(entities.map(/* 返回按声明顺序构造的数组 [entity.uuid, entity]。 */ entity => [entity.uuid, entity])), depths = new Map<string, number>()
  for (const state of states) {
    let entity = byUuid.get(state.uuid)
    const chain: string[] = [], seen = new Set<string>()
    while (entity && !depths.has(entity.uuid)) {
      if (seen.has(entity.uuid) || chain.length >= 512) { this.networkingState.schemaRejected++; this.networkingState.lastError = 'Network correction requires an acyclic hierarchy of at most 512 levels.'; return [] }
      seen.add(entity.uuid); chain.push(entity.uuid); entity = entity.parentUuid ? byUuid.get(entity.parentUuid) : undefined
    }
    let depth = entity ? depths.get(entity.uuid)! : -1
    for (const uuid of chain.reverse()) depths.set(uuid, ++depth)
  }
  return [...states].sort(/* 先计算 (depths.get(a.uuid) ?? 0) - (depths.get(b.uuid) ?? 0)；仅当其为假值时求右侧 a.uuid.localeCompare(b.uuid)，返回短路求值结果。 */ (a, b) => (depths.get(a.uuid) ?? 0) - (depths.get(b.uuid) ?? 0) || a.uuid.localeCompare(b.uuid))
}

reconcile(snapshotPacket: NetworkPacket, entities: Entity[]): void {
  const payload = snapshotPacket.payload as SnapshotPayload, history = this.localHistory.find(/* 比较 item.tick 与 snapshotPacket.tick，返回严格相等的判断结果。 */ item => item.tick === snapshotPacket.tick)
  const comparedHistory = history?.snapshot.entities.filter(/** 结构说明（自动提取）：history.snapshot.entities.filter 回调；输入 entity；直接调用 payload.entities.some；返回表达式求值结果。 */ entity => payload.entities.some(/* 比较 remote.uuid 与 entity.uuid，返回严格相等的判断结果。 */ remote => remote.uuid === entity.uuid)).sort(/* 调用 left.uuid.localeCompare(right.uuid) 并返回调用结果。 */ (left, right) => left.uuid.localeCompare(right.uuid)) ?? [], comparedChecksum = comparedHistory.length ? networkChecksum(comparedHistory) : ''
  if (payload.checksum && comparedChecksum && payload.checksum !== comparedChecksum) { this.networkingState.divergences++; this.rollbackTimeline.push({ tick: snapshotPacket.tick, peerId: snapshotPacket.sender, checksumBefore: comparedChecksum, checksumAfter: payload.checksum, replayedInputs: 0, correction: 0, reason: 'authoritative-checksum-divergence' }) }
  const definitions = new Map(this.configuration.networking.replicatedEntities.map(/* 返回按声明顺序构造的数组 [definition.entityUuid, definition]。 */ definition => [definition.entityUuid, definition]))
  const ordered = this.parentFirstNetworkStates(payload.entities, entities), byUuid = new Map(entities.map(/* 返回按声明顺序构造的数组 [entity.uuid, entity]。 */ entity => [entity.uuid, entity]))
  const previousWorld = new Map(ordered.flatMap(/** 结构说明（自动提取）：ordered.flatMap 回调；输入 state；直接调用 byUuid.get、worldTransform。 */ state => { const entity = byUuid.get(state.uuid); return entity ? [[state.uuid, worldTransform(entity, entities)] as const] : [] }))
  for (const candidate of ordered) {
    const definition = definitions.get(candidate.uuid), entity = entities.find(/* 比较 entity.uuid 与 candidate.uuid，返回严格相等的判断结果。 */ entity => entity.uuid === candidate.uuid), peerRole = this.networkingState.peerDetails.find(/* 比较 item.id 与 snapshotPacket.sender，返回严格相等的判断结果。 */ item => item.id === snapshotPacket.sender)?.role ?? 'client', owner = this.authorityTable.owner(candidate.uuid)
    const authoritativeServer = this.configuration.networking.role === 'client' && (peerRole === 'server' || peerRole === 'host')
    const receivesAuthority = definition?.authority === 'server' ? authoritativeServer : owner ? owner === snapshotPacket.sender || (owner !== this.networkingState.localPeerId && authoritativeServer) : authoritativeServer
    if (!definition || !entity || !receivesAuthority) continue
    const remote: EntitySnapshot = { uuid: candidate.uuid, ...(definition.properties.includes('transform') && candidate.position ? { position: candidate.position } : {}), ...(definition.properties.includes('rotation') && candidate.rotation !== undefined ? { rotation: candidate.rotation } : {}), ...(definition.properties.includes('velocity') && candidate.velocity ? { velocity: candidate.velocity } : {}) }
    if (!remote.position && remote.rotation === undefined && !remote.velocity) continue
    this.networkingState.lastAppliedSnapshotAt = this.ports.now(); this.networkingState.lastAppliedSnapshotTick = snapshotPacket.tick; this.networkingState.lastAppliedSnapshotPeer = snapshotPacket.sender
    const current = previousWorld.get(remote.uuid)!, remoteVelocity = remote.velocity ?? [entity.velocity.x, entity.velocity.y], predictionSeconds = definition.predict ? Math.min(.25, Math.max(0, this.configuration.networking.interpolationMs / 1_000)) : 0, projectedX = remote.position ? remote.position[0] + remoteVelocity[0] * predictionSeconds : current.position.x, projectedY = remote.position ? remote.position[1] + remoteVelocity[1] * predictionSeconds : current.position.y, error = Math.hypot(projectedX - current.position.x, projectedY - current.position.y), fields: string[] = []
    if (remote.position && (remote.position[0] !== current.position.x || remote.position[1] !== current.position.y)) fields.push('transform')
    if (remote.rotation !== undefined && remote.rotation !== current.rotation) fields.push('rotation')
    if (remote.velocity && (remote.velocity[0] !== entity.velocity.x || remote.velocity[1] !== entity.velocity.y)) fields.push('velocity')
    const rollback = definition.predict && error > this.configuration.networking.reconciliationThreshold ? replayNetworkTransformDeltas(remote, snapshotPacket.tick, this.localHistory.map(/** 构造并返回记录 { tick: frame.tick, entities: frame.snapshot.entities }，字段按当前实参及捕获状态求值。 */ frame => ({ tick: frame.tick, entities: frame.snapshot.entities }))) : null
    const targetX = rollback?.state.position?.[0] ?? projectedX, targetY = rollback?.state.position?.[1] ?? projectedY, targetRotation = rollback?.state.rotation ?? remote.rotation, targetVelocity = rollback?.state.velocity ?? remote.velocity
    const blend = rollback || !definition.interpolate ? 1 : 0
    if (rollback) { this.networkingState.predictionCorrections++; this.networkingState.rollbacks++; this.networkingState.replayedInputs += rollback.replayedFrames; this.rollbackTimeline.push({ tick: snapshotPacket.tick, peerId: snapshotPacket.sender, checksumBefore: history?.checksum ?? '', checksumAfter: payload.checksum, replayedInputs: rollback.replayedFrames, correction: error, reason: 'authoritative-rollback-replay' }) }
    if (fields.length) this.replicationDiffs.push({ tick: snapshotPacket.tick, peerId: snapshotPacket.sender, entityUuid: remote.uuid, fields, error, authority: definition.authority })
    if (definition.interpolate && !rollback) this.interpolationTargets.set(remote.uuid, { sender: snapshotPacket.sender, ...(remote.position ? { position: [targetX, targetY] as [number, number] } : {}), ...(targetRotation !== undefined ? { rotation: targetRotation } : {}), ...(targetVelocity ? { velocity: targetVelocity } : {}), remaining: Math.max(.001, this.configuration.networking.interpolationMs / 1_000) })
    setWorldTransform(entity, { ...current, position: { x: current.position.x + (targetX - current.position.x) * blend, y: current.position.y + (targetY - current.position.y) * blend }, rotation: targetRotation === undefined ? current.rotation : current.rotation + (targetRotation - current.rotation) * blend }, entities)
    if (targetVelocity && blend) entity.velocity = { x: targetVelocity[0], y: targetVelocity[1] }
  }
  this.refreshProductionDiagnostics()
}

updateNetworking(entities: Entity[], fixedDelta: number, input?: InputSnapshot, physicsChecksum = ''): void {
    this.requireEntities(entities)
  if (!this.configuration.networking.enabled || !this.configuration.networking.permissionGranted) { void this.stopNetworking(); return }
  if (!this.transport || this.networkingState.status !== 'connected') return
  if (this.authorityTable.synchronize(this.configuration.networking.replicatedEntities, this.networkingState.localPeerId, this.configuration.networking.role)) { this.interpolationTargets.clear(); this.refreshProductionDiagnostics() }
  this.tick++; this.networkingState.currentTick = this.tick; this.lastEntities = entities; this.lastInput = input ? cloneNetworkInput(input) : this.lastInput; this.lastChecksum = physicsChecksum.slice(0, 64)
  const snapshot = this.predictionSnapshot(entities)
  if (this.lastInput) this.localHistory.push({ tick: this.tick, input: cloneNetworkInput(this.lastInput), checksum: this.lastChecksum, snapshot })
  if (this.localHistory.length > this.configuration.networking.rollbackFrames) this.localHistory.splice(0, this.localHistory.length - this.configuration.networking.rollbackFrames)
  const inputChannel = this.channelByDelivery('unreliable-sequenced', 'input'); if (this.lastInput && inputChannel && (this.configuration.networking.role === 'client' || this.configuration.networking.role === 'host')) void this.sendNetworkPacket('input', this.lastInput, inputChannel.id)
  const interval = 1 / this.configuration.networking.snapshotRate
  this.snapshotAccumulator = Math.min(interval * 2, this.snapshotAccumulator + Math.max(0, Math.min(1, fixedDelta)))
  if (this.snapshotAccumulator + Number.EPSILON >= interval) {
    this.snapshotAccumulator = Math.max(0, this.snapshotAccumulator - interval); if (this.snapshotAccumulator < 1e-9) this.snapshotAccumulator = 0; const stateChannel = this.channelByDelivery('unreliable-sequenced', 'state')
    if (stateChannel) {
      const targets = this.networkingState.peerDetails.filter(/* 返回 baselinePending.has(peer.id) 的逻辑取反结果。 */ peer => !this.baselinePending.has(peer.id)).map(/* 返回 peer.id 的当前值。 */ peer => peer.id)
      for (const target of targets) { const targeted = this.localSnapshot(entities, false, target), page = this.snapshotPage(targeted, target, stateChannel); if (page) void this.sendNetworkPacket('snapshot', page, stateChannel.id, target) }
    }
  }
  while (this.remoteSnapshots.length) this.reconcile(this.remoteSnapshots.shift()!, entities)
  const interpolationDelta = Math.max(0, Math.min(.25, fixedDelta))
  const interpolationOrder = this.parentFirstNetworkStates([...this.interpolationTargets.keys()].map(/** 构造并返回记录 { uuid }，字段按当前实参及捕获状态求值。 */ uuid => ({ uuid })), entities)
  const beforeInterpolation = new Map(interpolationOrder.flatMap(/** 结构说明（自动提取）：interpolationOrder.flatMap 回调；输入 state；直接调用 entities.find、worldTransform。 */ state => { const entity = entities.find(/* 比较 entity.uuid 与 state.uuid，返回严格相等的判断结果。 */ entity => entity.uuid === state.uuid); return entity ? [[state.uuid, worldTransform(entity, entities)] as const] : [] }))
  for (const { uuid: entityUuid } of interpolationOrder) {
    const target = this.interpolationTargets.get(entityUuid)!, definition = this.configuration.networking.replicatedEntities.find(/* 比较 item.entityUuid 与 entityUuid，返回严格相等的判断结果。 */ item => item.entityUuid === entityUuid)
    if (!definition || !definition.interpolate) { this.interpolationTargets.delete(entityUuid); continue }
    if (!definition.properties.includes('transform')) delete target.position
    if (!definition.properties.includes('rotation')) delete target.rotation
    if (!definition.properties.includes('velocity')) delete target.velocity
    const entity = entities.find(/* 比较 candidate.uuid 与 entityUuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === entityUuid); if (!entity) { this.interpolationTargets.delete(entityUuid); continue }
    const current = beforeInterpolation.get(entityUuid)!, alpha = Math.min(1, interpolationDelta / Math.max(interpolationDelta, target.remaining))
    setWorldTransform(entity, { ...current, position: target.position ? { x: current.position.x + (target.position[0] - current.position.x) * alpha, y: current.position.y + (target.position[1] - current.position.y) * alpha } : current.position, rotation: target.rotation === undefined ? current.rotation : current.rotation + (target.rotation - current.rotation) * alpha }, entities)
    if (target.velocity) entity.velocity = { x: entity.velocity.x + (target.velocity[0] - entity.velocity.x) * alpha, y: entity.velocity.y + (target.velocity[1] - entity.velocity.y) * alpha }
    target.remaining -= interpolationDelta; if (target.remaining <= 1e-6 || alpha >= 1) this.interpolationTargets.delete(entityUuid)
  }
  const reliableBefore = this.reliableWindow.size, dueReliable = this.reliableWindow.due(this.ports.now(), this.configuration.networking.reliableRetryMs, this.configuration.networking.reliableMaximumAttempts)
  this.networkingState.reliableExpired += Math.max(0, reliableBefore - this.reliableWindow.size)
  const expired = this.reliableWindow.takeExpired()
  for (const peerId of new Set(expired.map(/* 返回 item.peer 的当前值。 */ item => item.peer))) {
    if (peerId === '*' && this.configuration.networking.role !== 'client') continue
    if (peerId !== '*') this.removePeer(peerId, 'reliable acknowledgement timeout')
    else this.reliableWindow.clearPeer('*')
    this.networkingState.lastError = `Reliable delivery to ${peerId} exhausted its acknowledgement retries. Reconnect the peer.`; this.addEvent(this.networkingState.lastError, 'error')
    if (this.configuration.networking.role === 'client') { this.networkingState.status = 'error'; this.scheduleReconnect() }
  }
  for (const pending of dueReliable) if (this.networkingState.status === 'connected' && (pending.peer === '*' || this.networkingState.peerDetails.some(/* 比较 peer.id 与 pending.peer，返回严格相等的判断结果。 */ peer => peer.id === pending.peer))) void this.transportSend(pending.source, pending.packet, pending.peer === '*' ? '' : pending.peer, true)
  this.networkingState.reliablePending = this.reliableWindow.size
  const inputs = [...this.remoteInputs].flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 [peerId, frames]；直接调用 frames.get。 */ ([peerId, frames]) => { const value = frames.get(this.tick); return value ? [{ peerId, input: value }] : [] }); if (this.lastInput) inputs.push({ peerId: this.networkingState.localPeerId, input: this.lastInput })
  this.replay.recordMultiplayerReplayFrame(this.tick, inputs, this.lastChecksum, this.networkingState.packetSummaries.slice(-32))
  if (this.tick % Math.max(1, Math.round(1 / Math.max(.0001, fixedDelta))) === 0) { this.pruneDisconnectedPeers(); const reliable = this.channelByDelivery('reliable-ordered', 'events'); if (reliable) { void this.sendNetworkPacket('ping', { sentAt: this.ports.now() }, reliable.id); if (this.localInterest && this.configuration.networking.interest.enabled) void this.sendNetworkPacket('interest', { center: this.localInterest.center, radius: this.localInterest.radius, sceneUuid: this.localInterest.sceneUuid } satisfies InterestPayload, reliable.id) } }
}

registerRpc(name: string, handler: (payload: unknown, context: { sender: string; tick: number }) => void): () => void { const key = name.trim().replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 80); this.rpcHandlers.set(key, handler); return /* 调用 rpcHandlers.delete(key) 并返回调用结果。 */ () => this.rpcHandlers.delete(key) }

callRpc(name: string, payload: unknown): boolean {
  if (!this.configuration.networking.enabled || !this.configuration.networking.permissionGranted || !this.transport || this.networkingState.status !== 'connected') return false
  const contract = this.configuration.networking.rpcContracts.find(/* 比较 item.name 与 name，返回严格相等的判断结果。 */ item => item.name === name), localRole = this.configuration.networking.role
  if (!contract) { this.networkingState.rpcRejected++; return false }
  const direction = contract.direction === 'bidirectional' || (contract.direction === 'client-to-server' && localRole === 'client') || (contract.direction === 'server-to-client' && (localRole === 'server' || localRole === 'host')), entityUuid = this.rpcEntityUuid(payload), authority = contract.authority === 'any' || (contract.authority === 'owner' && Boolean(entityUuid) && this.authorityTable.owner(entityUuid) === this.networkingState.localPeerId) || (contract.authority === 'server' && (localRole === 'server' || localRole === 'host'))
  let payloadValid = false
  try { payloadValid = validatePayloadSchema(payload, contract.payloadSchema) && utf8Bytes(stableNetworkJson(payload)) <= contract.maximumPayloadBytes } catch { payloadValid = false }
  if (!direction || !authority || !payloadValid || !this.rpcRate.accept(`local:${contract.name}`, contract.callsPerSecond, this.ports.now())) { this.networkingState.rpcRejected++; return false }
  const rpc: RpcPayload = { name: contract.name, value: payload }
  if (this.transport && this.networkingState.status === 'connected' && !this.networkingState.peerDetails.length) {
    if (!this.queuePreAdmissionRpc(rpc, contract.channelId)) { this.networkingState.rpcRejected++; return false }
    this.networkingState.rpcCalls++; return true
  }
  this.networkingState.rpcCalls++; void this.sendNetworkPacket('rpc', rpc, contract.channelId); return true
}

setNetworkInterest(center: [number, number], radius = this.configuration.networking.interest.defaultRadius, sceneUuid = ''): boolean { if (!center.every(Number.isFinite) || !Number.isFinite(radius)) return false; this.localInterest = { peerId: this.networkingState.localPeerId, center: [finiteNumber(center[0]), finiteNumber(center[1])], radius: Math.max(0, Math.min(this.configuration.networking.interest.maximumRadius, radius)), sceneUuid: sceneUuid.slice(0, 128), updatedAt: this.ports.wallNow() }; const reliable = this.channelByDelivery('reliable-ordered', 'events'); if (reliable && this.networkingState.status === 'connected') void this.sendNetworkPacket('interest', { center: this.localInterest.center, radius: this.localInterest.radius, sceneUuid: this.localInterest.sceneUuid } satisfies InterestPayload, reliable.id); return true }

transferNetworkAuthority(entityUuid: string, targetPeerId: string): boolean { const source = entityUuid.slice(0, 128), target = targetPeerId.slice(0, 80), localRole = this.configuration.networking.role, authorized = this.configuration.networking.allowAuthorityTransfer && ((localRole === 'server' || localRole === 'host') || this.authorityTable.owner(source) === this.networkingState.localPeerId) && (target === this.networkingState.localPeerId || this.networkingState.peerDetails.some(/* 比较 peer.id 与 target，返回严格相等的判断结果。 */ peer => peer.id === target)); if (!authorized || !this.authorityTable.transfer(source, target)) return false; this.interpolationTargets.delete(source); this.networkingState.authorityTransfers++; this.refreshProductionDiagnostics(); const reliable = this.channelByDelivery('reliable-ordered', 'events'); if (reliable && this.networkingState.status === 'connected') void this.sendNetworkPacket('authority', { entityUuid: source, targetPeerId: target } satisfies AuthorityPayload, reliable.id); return true }

handoffNetworkScene(targetPeerId: string, sceneUuid: string, spawnTag = ''): boolean { const localRole = this.configuration.networking.role, target = targetPeerId.slice(0, 80), scene = sceneUuid.slice(0, 128); if (!this.configuration.networking.allowSceneHandoff || (localRole !== 'server' && localRole !== 'host') || !scene || !this.networkingState.peerDetails.some(/* 比较 peer.id 与 target，返回严格相等的判断结果。 */ peer => peer.id === target)) return false; const reliable = this.channelByDelivery('reliable-ordered', 'events'); if (!reliable || this.networkingState.status !== 'connected') return false; this.networkingState.sceneHandoffs++; void this.sendNetworkPacket('scene', { sceneUuid: scene, spawnTag: spawnTag.slice(0, 80) } satisfies ScenePayload, reliable.id, target); return true }

registerNetworkSceneHandoff(handler: (sceneUuid: string, spawnTag: string, peerId: string) => void | Promise<void>): () => void { this.sceneHandoffHandler = handler; return /** 结构说明（自动提取）：匿名回调；无显式参数；写入 sceneHandoffHandler。 */ () => { if (this.sceneHandoffHandler === handler) this.sceneHandoffHandler = null } }

consumeRemoteInput(peerId: string, targetTick = this.tick): InputSnapshot | null { const frames = this.remoteInputs.get(peerId), input = frames?.get(targetTick) ?? null; if (input) frames?.delete(targetTick); return input ? cloneNetworkInput(input) : null }

drainRemoteInputs(maxFrames = 64): RemoteNetworkInputFrame[] {
  const limit = Math.max(1, Math.min(256, Math.round(Number(maxFrames) || 64))), ownership = this.authorityTable.entries(), pending = [...this.remoteInputs].flatMap(/* 调用 [...frames].map(([frameTick, input]) => ({ peerId, tick: frameTick, input })) 并返回调用结果。 */ ([peerId, frames]) => [...frames].map(/** 构造并返回记录 { peerId, tick: frameTick, input }，字段按当前实参及捕获状态求值。 */ ([frameTick, input]) => ({ peerId, tick: frameTick, input }))).sort(/* 先计算 left.tick - right.tick；仅当其为假值时求右侧 left.peerId.localeCompare(right.peerId)，返回短路求值结果。 */ (left, right) => left.tick - right.tick || left.peerId.localeCompare(right.peerId)).slice(0, limit)
  return pending.map(/** 结构说明（自动提取）：pending.map 回调；输入 frame；直接调用 delete、remoteInputs.get、cloneNetworkInput、sort、map 等。 */ frame => { this.remoteInputs.get(frame.peerId)?.delete(frame.tick); return { peerId: frame.peerId, tick: frame.tick, input: cloneNetworkInput(frame.input), targetEntityUuids: ownership.filter(/* 比较 item.ownerPeerId 与 frame.peerId，返回严格相等的判断结果。 */ item => item.ownerPeerId === frame.peerId).map(/* 返回 item.entityUuid 的当前值。 */ item => item.entityUuid).sort() } })
}

rollbackSnapshot(targetTick: number): boolean {
  if (!Number.isSafeInteger(targetTick) || targetTick < 0) return false
  const frame = [...this.localHistory].reverse().find(/* 比较 item.tick 与 targetTick，返回小于或等于的判断结果。 */ item => item.tick <= targetTick)
  if (!frame) return false
  for (const state of this.parentFirstNetworkStates(frame.snapshot.entities, this.lastEntities)) {
    const entity = this.lastEntities.find(/* 比较 candidate.uuid 与 state.uuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === state.uuid); if (!entity) continue
    const current = worldTransform(entity, this.lastEntities)
    setWorldTransform(entity, { ...current, position: state.position ? { x: state.position[0], y: state.position[1] } : current.position, rotation: state.rotation ?? current.rotation }, this.lastEntities)
    if (state.velocity) entity.velocity = { x: state.velocity[0], y: state.velocity[1] }
  }
  if (!this.transport) this.tick = frame.tick
  this.networkingState.currentTick = this.tick
  this.localHistory.splice(0); this.remoteSnapshots.splice(0); this.interpolationTargets.clear(); this.snapshotAccumulator = 0
  this.networkingState.rollbacks++
  this.rollbackTimeline.push({ tick: this.tick, peerId: this.networkingState.localPeerId, checksumBefore: this.lastChecksum, checksumAfter: frame.checksum, replayedInputs: 0, correction: 0, reason: 'manual-snapshot-restore' })
  this.refreshProductionDiagnostics(); return true
}

multiplayerSave(): MultiplayerSaveDocument { return this.replay.exportMultiplayerSave(this.lastEntities, this.tick) }

restoreMultiplayerSave(value: unknown): { tick: number; restored: number } {
  const restored = this.replay.importMultiplayerSave(value, this.lastEntities)
  if (!this.transport) this.tick = restored.tick
  this.networkingState.currentTick = this.tick
  this.localHistory.splice(0); this.remoteSnapshots.splice(0); this.interpolationTargets.clear(); this.snapshotAccumulator = 0
  return restored
}

captureNetworkDiagnostics(): string { return this.replay.networkDiagnosticCapture(this.networkingState as unknown as Record<string, unknown>, this.networkingState.events, this.networkingState.packetSummaries) }

networkRuntimeSnapshot(): Readonly<{ tick: number; localHistory: number; remoteInputs: number; reliablePending: number; owners: number; interestViews: number; rollbackEntries: number; replicationDiffs: number }> { return Object.freeze({ tick: this.tick, localHistory: this.localHistory.length, remoteInputs: [...this.remoteInputs.values()].reduce(/* 计算表达式 sum + frames.size 并返回结果，沿用操作数的原有类型规则。 */ (sum, frames) => sum + frames.size, 0), reliablePending: this.reliableWindow.size, owners: this.authorityTable.entries().length, interestViews: this.peerInterests.size, rollbackEntries: this.networkingState.rollbackTimeline.length, replicationDiffs: this.networkingState.replicationDiffs.length }) }

async startNetworkingWithTransport(testTransport: NetworkTransport): Promise<void> { if (!this.configuration.networking.enabled || !this.configuration.networking.permissionGranted) throw new Error('Explicit enabled permission is required.'); if (this.configuration.networking.authentication.requireVerifiedPeers && this.configuration.networking.authentication.mode !== 'hook') throw new Error('Verified peers require a reviewed authentication hook.'); if (this.transport) await this.stopNetworking(); this.connectionGeneration++; this.cancelScheduledDeliveries(); this.resetConnectionPeerState(); this.networkingState.sessionId = this.networkSessionId(); this.networkingState.localPeerId ||= this.peerIdentity(); this.sessionEpoch = this.ports.createEpoch(); this.tick = 0; this.snapshotAccumulator = 0; this.budgetStarted = this.ports.now(); this.budgetBytes = 0; this.receiveBudgetStarted = this.budgetStarted; this.receiveBudgetBytes = 0; this.authorityTable.initialize(this.configuration.networking.replicatedEntities, this.networkingState.localPeerId, this.configuration.networking.role); this.refreshProductionDiagnostics(); this.transport = testTransport; this.networkingState.transport = testTransport.kind; this.networkingState.status = 'connecting'; const generation=this.connectionGeneration;await testTransport.connect((source,peer)=>{if(generation===this.connectionGeneration&&this.transport===testTransport)this.receive(source,peer)}, /** 将 state === 'connected' ? 'connected' : 'error' 赋给 networkingState.status，不显式返回值。 */ state => { if(generation===this.connectionGeneration&&this.transport===testTransport)this.networkingState.status = state === 'connected' ? 'connected' : 'error' });this.requireConnectionGeneration(generation); this.networkingState.status = 'connected' }

}
