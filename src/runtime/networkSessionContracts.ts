import type { Entity } from '../world/Entity'
import type { InputSnapshot } from './input'
import type { NetworkServiceHandle, NetworkServiceKind, NetworkServiceContext } from './networkServices'

export type NetworkRole = 'client' | 'server' | 'host'

export type NetworkTransportKind = 'websocket' | 'native-udp'

export type NetworkSessionMode = 'local' | 'direct'

export type NetworkDelivery = 'reliable-ordered' | 'unreliable-sequenced'

export type NetworkPayloadSchema = 'any' | 'boolean' | 'number' | 'integer' | 'string' | 'vec2' | 'object' | 'array'

export interface ReplicatedEntityDefinition {
  entityUuid: string
  authority: 'server' | 'owner'
  properties: string[]
  interpolate: boolean
  predict: boolean
  ownerPeerId: string
  alwaysRelevant: boolean
  interestRadius: number
  sceneUuid: string
}

export interface NetworkChannelDefinition {
  id: string
  delivery: NetworkDelivery
  maximumPayloadBytes: number
  messagesPerSecond: number
  priority: number
}

export interface NetworkRpcDefinition {
  name: string
  channelId: string
  direction: 'client-to-server' | 'server-to-client' | 'bidirectional'
  authority: 'server' | 'owner' | 'any'
  payloadSchema: NetworkPayloadSchema
  maximumPayloadBytes: number
  callsPerSecond: number
}

export interface NetworkSimulationSettings {
  enabled: boolean
  latencyMs: number
  jitterMs: number
  lossPercent: number
  duplicatePercent: number
  reorderPercent: number
  seed: number
}

export interface NetworkAuthenticationSettings {
  mode: 'none' | 'hook'
  providerId: string
  requireVerifiedPeers: boolean
  handshakeTimeoutMs: number
}

export interface NetworkSecuritySettings {
  requireEncryption: boolean
  maximumPacketAgeMs: number
  replayWindow: number
}

export interface NetworkInterestSettings {
  enabled: boolean
  defaultRadius: number
  maximumRadius: number
}

export interface NetworkMultiInstanceSettings {
  peerCount: number
  separateLogs: boolean
  separateInspectors: boolean
}

export interface NetworkServiceSelection {
  identityProviderId: string
  lobbyProviderId: string
  relayProviderId: string
}
export type NetworkProjectSettings = {
    enabled: boolean
    permissionGranted: boolean
    autoStart: boolean
    role: NetworkRole
    sessionMode: NetworkSessionMode
    sessionName: string
    playerName: string
    maxPeers: number
    transport: NetworkTransportKind
    transportAdapterId: string
    endpoint: string
    bindAddress: string
    snapshotRate: number
    interpolationMs: number
    rollbackFrames: number
    bandwidthKbps: number
    reconnect: boolean
    reconnectMaxAttempts: number
    protocolVersion: 2
    schemaVersion: number
    maximumPacketBytes: number
    maximumMessagesPerSecond: number
    maximumPendingReliable: number
    reliableRetryMs: number
    reliableMaximumAttempts: number
    reconciliationThreshold: number
    lateJoin: boolean
    channels: NetworkChannelDefinition[]
    rpcContracts: NetworkRpcDefinition[]
    simulation: NetworkSimulationSettings
    authentication: NetworkAuthenticationSettings
    security: NetworkSecuritySettings
    interest: NetworkInterestSettings
    multiInstance: NetworkMultiInstanceSettings
    services: NetworkServiceSelection
    allowAuthorityTransfer: boolean
    allowSceneHandoff: boolean
    replicatedEntities: ReplicatedEntityDefinition[]
  }
export type NetworkReplaySettings = {
    seed: number
    capacity: number
    strictChecksums: boolean
  }
export interface NetworkConfiguration { networking: NetworkProjectSettings; replay: NetworkReplaySettings }
export interface NetworkWorld { readonly entities: Entity[] }
export interface NetworkConfigurationHost { readonly world: NetworkWorld; readConfiguration(): NetworkConfiguration }
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
export interface NetworkTransportContext { readonly configuration: NetworkConfiguration; readonly networkingState: {localPeerId:string}; networkSessionId():string }
export interface NetworkPlatformPorts {
  now():number; wallNow():number; setTimeout(callback:()=>void,delay:number):ReturnType<typeof globalThis.setTimeout>; clearTimeout(handle:ReturnType<typeof globalThis.setTimeout>):void
  createAbortController():AbortController; abortError(message:string):Error
  createEpoch():string; createNonce(sequence:number):string; peerIdentity(playerName:string):string
  createTransport(kind:'local-loopback'|'websocket'|'native-udp',context:NetworkTransportContext):NetworkTransport
  openService(kind:NetworkServiceKind,settings:NetworkProjectSettings,context:NetworkServiceContext):Promise<NetworkServiceHandle>
}
