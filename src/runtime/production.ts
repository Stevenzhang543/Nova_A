import { reactive } from 'vue'
import { loadPerformanceRuntimeSettings } from './largeWorldPerformance'

export type TestKind = 'unit' | 'integration' | 'scene' | 'ui' | 'physics' | 'animation' | 'regression' | 'headless'
export type TestAssertionKind = 'entityCountAtLeast' | 'entityExists' | 'finitePhysics' | 'checksumEquals' | 'noRuntimeErrors'
export type NetworkRole = 'client' | 'server' | 'host'
export type NetworkTransportKind = 'websocket' | 'native-udp'
export type NetworkSessionMode = 'local' | 'direct'
export type NetworkDelivery = 'reliable-ordered' | 'unreliable-sequenced'
export type NetworkPayloadSchema = 'any' | 'boolean' | 'number' | 'integer' | 'string' | 'vec2' | 'object' | 'array'

export interface ProjectTestAssertion {
  kind: TestAssertionKind
  target: string
  expected: string
}

export interface ProjectTestDefinition {
  id: string
  name: string
  kind: TestKind
  sceneUuid: string
  steps: number
  timeoutMs: number
  captureScreenshot: boolean
  tags: string[]
  fixture: string
  setup: string
  teardown: string
  seed: number
  retries: number
  flakyInfrastructure: boolean
  assertions: ProjectTestAssertion[]
}

export interface SaveMigrationDefinition {
  fromVersion: number
  toVersion: number
  renames: Record<string, string>
  defaults: Record<string, boolean | number | string | null>
  remove: string[]
}

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

export interface ProductionProjectSettings {
  performance: {
    traceCapacity: number
    memoryBudgetMb: number
    assetBudgetMb: number
    animationBudgetMs: number
    uiBudgetMs: number
    frameBudgetMs: number
    renderingBudgetMs: number
    audioBudgetMs: number
    gpuBudgetMs: number
    drawCallBudget: number
    textureBudgetMb: number
    particleBudgetMs: number
    profilerOverheadBudgetPercent: number
    leakWindowFrames: number
    lifetimeCapacity: number
    adaptiveQuality: boolean
    frameWorkBudgetMs: number
    streamingBudgetMs: number
    maximumCommandsPerFrame: number
    reactivePublishInterval: number
    spatialCellSize: number
  }
  replay: {
    seed: number
    capacity: number
    strictChecksums: boolean
  }
  testing: {
    defaultTimeoutMs: number
    tests: ProjectTestDefinition[]
  }
  data: {
    saveSchemaVersion: number
    saveMigrations: SaveMigrationDefinition[]
  }
  jobs: {
    maxWorkers: number
    maxQueued: number
    timeoutMs: number
  }
  networking: {
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
    allowAuthorityTransfer: boolean
    allowSceneHandoff: boolean
    replicatedEntities: ReplicatedEntityDefinition[]
  }
}

const DEFAULTS: ProductionProjectSettings = {
  performance: { traceCapacity: 600, memoryBudgetMb: 300, assetBudgetMb: 512, animationBudgetMs: 2, uiBudgetMs: 2, frameBudgetMs: 16.667, renderingBudgetMs: 8, audioBudgetMs: 2, gpuBudgetMs: 8, drawCallBudget: 500, textureBudgetMb: 256, particleBudgetMs: 2, profilerOverheadBudgetPercent: 5, leakWindowFrames: 600, lifetimeCapacity: 2_000, adaptiveQuality: true, frameWorkBudgetMs: 2.5, streamingBudgetMs: 1.5, maximumCommandsPerFrame: 2_048, reactivePublishInterval: 4, spatialCellSize: 16 },
  replay: { seed: 0x4e4f5641, capacity: 3_600, strictChecksums: true },
  testing: { defaultTimeoutMs: 10_000, tests: [] },
  data: { saveSchemaVersion: 1, saveMigrations: [] },
  jobs: { maxWorkers: 2, maxQueued: 256, timeoutMs: 15_000 },
  networking: {
    enabled: false, permissionGranted: false, autoStart: false, role: 'client', sessionMode: 'local', sessionName: 'Local game', playerName: 'Player', maxPeers: 8,
    transport: 'websocket', transportAdapterId: '', endpoint: 'ws://127.0.0.1:7777', bindAddress: '127.0.0.1:0',
    snapshotRate: 20, interpolationMs: 100, rollbackFrames: 120, bandwidthKbps: 256, reconnect: true, reconnectMaxAttempts: 8,
    protocolVersion: 2, schemaVersion: 1, maximumPacketBytes: 65_507, maximumMessagesPerSecond: 240, maximumPendingReliable: 512,
    reliableRetryMs: 120, reliableMaximumAttempts: 8, reconciliationThreshold: .05, lateJoin: true,
    channels: [
      { id: 'state', delivery: 'unreliable-sequenced', maximumPayloadBytes: 48_000, messagesPerSecond: 120, priority: 2 },
      { id: 'input', delivery: 'unreliable-sequenced', maximumPayloadBytes: 16_000, messagesPerSecond: 240, priority: 3 },
      { id: 'events', delivery: 'reliable-ordered', maximumPayloadBytes: 32_000, messagesPerSecond: 120, priority: 4 }
    ],
    rpcContracts: [],
    simulation: { enabled: false, latencyMs: 0, jitterMs: 0, lossPercent: 0, duplicatePercent: 0, reorderPercent: 0, seed: 0x4e455457 },
    authentication: { mode: 'none', providerId: '', requireVerifiedPeers: false, handshakeTimeoutMs: 5_000 },
    security: { requireEncryption: false, maximumPacketAgeMs: 15_000, replayWindow: 2_048 },
    interest: { enabled: false, defaultRadius: 64, maximumRadius: 4_096 },
    multiInstance: { peerCount: 2, separateLogs: true, separateInspectors: true },
    allowAuthorityTransfer: true,
    allowSceneHandoff: true,
    replicatedEntities: []
  }
}

export const productionSettings = reactive<ProductionProjectSettings>(structuredClone(DEFAULTS))

function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
function bounded(value: unknown, fallback: number, minimum: number, maximum: number, integer = false): number {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  const result = Math.min(maximum, Math.max(minimum, number))
  return integer ? Math.round(result) : result
}
function text(value: unknown, fallback: string, maximum: number): string { return typeof value === 'string' ? (value.trim().slice(0, maximum) || fallback) : fallback }
function id(value: unknown, fallback: string): string { return text(value, fallback, 80).replace(/[^a-zA-Z0-9_.-]/g, '_') }

function normalizeTest(value: unknown, index: number): ProjectTestDefinition {
  const source = object(value)
  const kinds: TestKind[] = ['unit', 'integration', 'scene', 'ui', 'physics', 'animation', 'regression', 'headless']
  const assertionKinds: TestAssertionKind[] = ['entityCountAtLeast', 'entityExists', 'finitePhysics', 'checksumEquals', 'noRuntimeErrors']
  return {
    id: id(source.id, `test-${index + 1}`), name: text(source.name, `Test ${index + 1}`, 120),
    kind: kinds.includes(source.kind as TestKind) ? source.kind as TestKind : 'scene', sceneUuid: text(source.sceneUuid, '', 128),
    steps: bounded(source.steps, 60, 0, 60_000, true), timeoutMs: bounded(source.timeoutMs, 10_000, 100, 120_000, true),
    captureScreenshot: source.captureScreenshot === true,
    tags: [...new Set((Array.isArray(source.tags) ? source.tags : []).flatMap(value => typeof value === 'string' ? [id(value, '')] : []).filter(Boolean))].slice(0, 32),
    fixture: text(source.fixture, '', 256), setup: text(source.setup, '', 80), teardown: text(source.teardown, '', 80),
    seed: bounded(source.seed, 1, 0, 0xffff_ffff, true) >>> 0,
    retries: source.flakyInfrastructure === true ? bounded(source.retries, 0, 0, 3, true) : 0,
    flakyInfrastructure: source.flakyInfrastructure === true,
    assertions: (Array.isArray(source.assertions) ? source.assertions : []).slice(0, 64).flatMap(raw => {
      const assertion = object(raw), kind = assertionKinds.includes(assertion.kind as TestAssertionKind) ? assertion.kind as TestAssertionKind : null
      return kind ? [{ kind, target: text(assertion.target, '', 128), expected: text(assertion.expected, '', 256) }] : []
    })
  }
}

function normalizeMigrations(value: unknown): SaveMigrationDefinition[] {
  return (Array.isArray(value) ? value : []).slice(0, 128).map(raw => {
    const source = object(raw), renames: Record<string, string> = {}, defaults: Record<string, boolean | number | string | null> = {}
    for (const [from, to] of Object.entries(object(source.renames)).slice(0, 256)) if (typeof to === 'string') renames[id(from, 'key')] = id(to, 'key')
    for (const [key, item] of Object.entries(object(source.defaults)).slice(0, 256)) if (item === null || ['boolean', 'number', 'string'].includes(typeof item)) defaults[id(key, 'key')] = typeof item === 'string' ? item.slice(0, 10_000) : item as boolean | number | null
    return {
      fromVersion: bounded(source.fromVersion, 1, 0, 65_535, true), toVersion: bounded(source.toVersion, 2, 1, 65_535, true), renames, defaults,
      remove: (Array.isArray(source.remove) ? source.remove : []).slice(0, 256).flatMap(item => typeof item === 'string' ? [id(item, 'key')] : [])
    }
  }).filter(item => item.toVersion > item.fromVersion).sort((a, b) => a.fromVersion - b.fromVersion)
}

export function normalizeProductionSettings(value: unknown): ProductionProjectSettings {
  const source = object(value), performance = object(source.performance), replay = object(source.replay), testing = object(source.testing), data = object(source.data), jobs = object(source.jobs), networking = object(source.networking)
  const roles: NetworkRole[] = ['client', 'server', 'host'], transports: NetworkTransportKind[] = ['websocket', 'native-udp']
  const seenTests = new Set<string>()
  const tests = (Array.isArray(testing.tests) ? testing.tests : []).slice(0, 256).map(normalizeTest).filter(test => !seenTests.has(test.id) && Boolean(seenTests.add(test.id)))
  const replicatedEntities = (Array.isArray(networking.replicatedEntities) ? networking.replicatedEntities : []).slice(0, 2_000).flatMap(raw => {
    const item = object(raw), entityUuid = text(item.entityUuid, '', 128)
    if (!entityUuid) return []
    const allowedProperties = new Set(['transform', 'rotation', 'velocity'])
    return [{
      entityUuid, authority: item.authority === 'owner' ? 'owner' as const : 'server' as const,
      properties: [...new Set((Array.isArray(item.properties) ? item.properties : ['transform', 'velocity']).flatMap(property => typeof property === 'string' && allowedProperties.has(property) ? [property] : []))],
      interpolate: item.interpolate !== false, predict: item.predict === true,
      ownerPeerId: text(item.ownerPeerId, '', 80), alwaysRelevant: item.alwaysRelevant === true,
      interestRadius: bounded(item.interestRadius, DEFAULTS.networking.interest.defaultRadius, 0, DEFAULTS.networking.interest.maximumRadius),
      sceneUuid: text(item.sceneUuid, '', 128)
    }]
  })
  const deliveries: NetworkDelivery[] = ['reliable-ordered', 'unreliable-sequenced']
  const schemas: NetworkPayloadSchema[] = ['any', 'boolean', 'number', 'integer', 'string', 'vec2', 'object', 'array']
  const channelIds = new Set<string>()
  const channels = (Array.isArray(networking.channels) ? networking.channels : DEFAULTS.networking.channels).slice(0, 32).flatMap((raw, index) => {
    const item = object(raw), channelId = id(item.id, `channel-${index + 1}`)
    if (channelIds.has(channelId)) return []
    channelIds.add(channelId)
    return [{ id: channelId, delivery: deliveries.includes(item.delivery as NetworkDelivery) ? item.delivery as NetworkDelivery : 'reliable-ordered' as const, maximumPayloadBytes: bounded(item.maximumPayloadBytes, 16_000, 32, 65_507, true), messagesPerSecond: bounded(item.messagesPerSecond, 120, 1, 2_000, true), priority: bounded(item.priority, 0, -16, 16, true) }]
  })
  if (!channels.length) channels.push(...structuredClone(DEFAULTS.networking.channels))
  const rpcNames = new Set<string>()
  const rpcContracts = (Array.isArray(networking.rpcContracts) ? networking.rpcContracts : []).slice(0, 256).flatMap((raw, index) => {
    const item = object(raw), name = id(item.name, `rpc-${index + 1}`)
    if (rpcNames.has(name)) return []
    rpcNames.add(name)
    const direction: NetworkRpcDefinition['direction'] = item.direction === 'server-to-client' || item.direction === 'bidirectional' ? item.direction : 'client-to-server'
    const authority: NetworkRpcDefinition['authority'] = item.authority === 'owner' || item.authority === 'any' ? item.authority : 'server'
    return [{ name, channelId: channelIds.has(String(item.channelId)) ? String(item.channelId) : channels[0].id, direction, authority, payloadSchema: schemas.includes(item.payloadSchema as NetworkPayloadSchema) ? item.payloadSchema as NetworkPayloadSchema : 'any', maximumPayloadBytes: bounded(item.maximumPayloadBytes, 8_192, 2, 65_507, true), callsPerSecond: bounded(item.callsPerSecond, 30, 1, 1_000, true) }]
  })
  const simulation = object(networking.simulation), authentication = object(networking.authentication), security = object(networking.security), interest = object(networking.interest), multiInstance = object(networking.multiInstance)
  return {
    performance: {
      traceCapacity: bounded(performance.traceCapacity, DEFAULTS.performance.traceCapacity, 60, 10_000, true),
      memoryBudgetMb: bounded(performance.memoryBudgetMb, DEFAULTS.performance.memoryBudgetMb, 16, 65_536),
      assetBudgetMb: bounded(performance.assetBudgetMb, DEFAULTS.performance.assetBudgetMb, 1, 1_048_576),
      animationBudgetMs: bounded(performance.animationBudgetMs, DEFAULTS.performance.animationBudgetMs, .05, 100),
      uiBudgetMs: bounded(performance.uiBudgetMs, DEFAULTS.performance.uiBudgetMs, .05, 100),
      frameBudgetMs: bounded(performance.frameBudgetMs, DEFAULTS.performance.frameBudgetMs, 1, 1000),
      renderingBudgetMs: bounded(performance.renderingBudgetMs, DEFAULTS.performance.renderingBudgetMs, .05, 1000),
      audioBudgetMs: bounded(performance.audioBudgetMs, DEFAULTS.performance.audioBudgetMs, .05, 1000),
      gpuBudgetMs: bounded(performance.gpuBudgetMs, DEFAULTS.performance.gpuBudgetMs, .05, 1000),
      drawCallBudget: bounded(performance.drawCallBudget, DEFAULTS.performance.drawCallBudget, 1, 100_000, true),
      textureBudgetMb: bounded(performance.textureBudgetMb, DEFAULTS.performance.textureBudgetMb, 1, 65_536),
      particleBudgetMs: bounded(performance.particleBudgetMs, DEFAULTS.performance.particleBudgetMs, .05, 1000),
      profilerOverheadBudgetPercent: bounded(performance.profilerOverheadBudgetPercent, DEFAULTS.performance.profilerOverheadBudgetPercent, 0, 100),
      leakWindowFrames: bounded(performance.leakWindowFrames, DEFAULTS.performance.leakWindowFrames, 60, 60_000, true),
      lifetimeCapacity: bounded(performance.lifetimeCapacity, DEFAULTS.performance.lifetimeCapacity, 100, 20_000, true)
      , adaptiveQuality: performance.adaptiveQuality !== false
      , frameWorkBudgetMs: bounded(performance.frameWorkBudgetMs, DEFAULTS.performance.frameWorkBudgetMs, .1, 20)
      , streamingBudgetMs: bounded(performance.streamingBudgetMs, DEFAULTS.performance.streamingBudgetMs, .1, 20)
      , maximumCommandsPerFrame: bounded(performance.maximumCommandsPerFrame, DEFAULTS.performance.maximumCommandsPerFrame, 32, 100_000, true)
      , reactivePublishInterval: bounded(performance.reactivePublishInterval, DEFAULTS.performance.reactivePublishInterval, 1, 120, true)
      , spatialCellSize: bounded(performance.spatialCellSize, DEFAULTS.performance.spatialCellSize, .01, 1_000_000)
    },
    replay: { seed: bounded(replay.seed, DEFAULTS.replay.seed, 0, 0xffff_ffff, true) >>> 0, capacity: bounded(replay.capacity, DEFAULTS.replay.capacity, 60, 60_000, true), strictChecksums: replay.strictChecksums !== false },
    testing: { defaultTimeoutMs: bounded(testing.defaultTimeoutMs, DEFAULTS.testing.defaultTimeoutMs, 100, 120_000, true), tests },
    data: { saveSchemaVersion: bounded(data.saveSchemaVersion, 1, 1, 65_535, true), saveMigrations: normalizeMigrations(data.saveMigrations) },
    jobs: { maxWorkers: bounded(jobs.maxWorkers, DEFAULTS.jobs.maxWorkers, 1, 8, true), maxQueued: bounded(jobs.maxQueued, DEFAULTS.jobs.maxQueued, 8, 2_048, true), timeoutMs: bounded(jobs.timeoutMs, DEFAULTS.jobs.timeoutMs, 100, 120_000, true) },
    networking: {
      enabled: networking.enabled === true, permissionGranted: networking.permissionGranted === true, autoStart: networking.autoStart === true,
      role: roles.includes(networking.role as NetworkRole) ? networking.role as NetworkRole : 'client',
      sessionMode: networking.sessionMode === 'direct' ? 'direct' : 'local', sessionName: text(networking.sessionName, DEFAULTS.networking.sessionName, 80), playerName: text(networking.playerName, DEFAULTS.networking.playerName, 80),
      maxPeers: bounded(networking.maxPeers, DEFAULTS.networking.maxPeers, 1, 64, true),
      transport: transports.includes(networking.transport as NetworkTransportKind) ? networking.transport as NetworkTransportKind : 'websocket',
      transportAdapterId: id(networking.transportAdapterId, ''), endpoint: text(networking.endpoint, DEFAULTS.networking.endpoint, 512), bindAddress: text(networking.bindAddress, DEFAULTS.networking.bindAddress, 256),
      snapshotRate: bounded(networking.snapshotRate, 20, 1, 120, true), interpolationMs: bounded(networking.interpolationMs, 100, 0, 2_000, true),
      rollbackFrames: bounded(networking.rollbackFrames, 120, 0, 600, true), bandwidthKbps: bounded(networking.bandwidthKbps, 256, 8, 1_000_000, true),
      reconnect: networking.reconnect !== false, reconnectMaxAttempts: bounded(networking.reconnectMaxAttempts, DEFAULTS.networking.reconnectMaxAttempts, 0, 32, true),
      protocolVersion: 2, schemaVersion: bounded(networking.schemaVersion, 1, 1, 65_535, true), maximumPacketBytes: bounded(networking.maximumPacketBytes, DEFAULTS.networking.maximumPacketBytes, 512, 65_507, true),
      maximumMessagesPerSecond: bounded(networking.maximumMessagesPerSecond, DEFAULTS.networking.maximumMessagesPerSecond, 1, 10_000, true), maximumPendingReliable: bounded(networking.maximumPendingReliable, DEFAULTS.networking.maximumPendingReliable, 1, 4_096, true),
      reliableRetryMs: bounded(networking.reliableRetryMs, DEFAULTS.networking.reliableRetryMs, 10, 5_000, true), reliableMaximumAttempts: bounded(networking.reliableMaximumAttempts, DEFAULTS.networking.reliableMaximumAttempts, 1, 32, true),
      reconciliationThreshold: bounded(networking.reconciliationThreshold, DEFAULTS.networking.reconciliationThreshold, 0, 1_000), lateJoin: networking.lateJoin !== false,
      channels, rpcContracts,
      simulation: { enabled: simulation.enabled === true, latencyMs: bounded(simulation.latencyMs, 0, 0, 10_000, true), jitterMs: bounded(simulation.jitterMs, 0, 0, 10_000, true), lossPercent: bounded(simulation.lossPercent, 0, 0, 100), duplicatePercent: bounded(simulation.duplicatePercent, 0, 0, 100), reorderPercent: bounded(simulation.reorderPercent, 0, 0, 100), seed: bounded(simulation.seed, DEFAULTS.networking.simulation.seed, 0, 0xffff_ffff, true) >>> 0 },
      authentication: { mode: authentication.mode === 'hook' ? 'hook' : 'none', providerId: id(authentication.providerId, ''), requireVerifiedPeers: authentication.requireVerifiedPeers === true, handshakeTimeoutMs: bounded(authentication.handshakeTimeoutMs, DEFAULTS.networking.authentication.handshakeTimeoutMs, 250, 30_000, true) },
      security: { requireEncryption: security.requireEncryption === true, maximumPacketAgeMs: bounded(security.maximumPacketAgeMs, DEFAULTS.networking.security.maximumPacketAgeMs, 1_000, 120_000, true), replayWindow: bounded(security.replayWindow, DEFAULTS.networking.security.replayWindow, 64, 16_384, true) },
      interest: { enabled: interest.enabled === true, defaultRadius: bounded(interest.defaultRadius, DEFAULTS.networking.interest.defaultRadius, 0, 1_000_000), maximumRadius: bounded(interest.maximumRadius, DEFAULTS.networking.interest.maximumRadius, 1, 1_000_000) },
      multiInstance: { peerCount: bounded(multiInstance.peerCount, DEFAULTS.networking.multiInstance.peerCount, 2, 8, true), separateLogs: multiInstance.separateLogs !== false, separateInspectors: multiInstance.separateInspectors !== false },
      allowAuthorityTransfer: networking.allowAuthorityTransfer !== false,
      allowSceneHandoff: networking.allowSceneHandoff !== false,
      replicatedEntities
    }
  }
}

export function loadProductionSettings(value: unknown): void {
  Object.assign(productionSettings, normalizeProductionSettings(value))
  loadPerformanceRuntimeSettings({
    adaptiveQuality: productionSettings.performance.adaptiveQuality,
    targetFrameMs: productionSettings.performance.frameBudgetMs,
    frameWorkBudgetMs: productionSettings.performance.frameWorkBudgetMs,
    streamingBudgetMs: productionSettings.performance.streamingBudgetMs,
    maximumCommandsPerFrame: productionSettings.performance.maximumCommandsPerFrame,
    reactivePublishInterval: productionSettings.performance.reactivePublishInterval,
    spatialCellSize: productionSettings.performance.spatialCellSize
  })
}
export function serializeProductionSettings(): ProductionProjectSettings { return normalizeProductionSettings(productionSettings) }
export function resetProductionSettings(): void { Object.assign(productionSettings, structuredClone(DEFAULTS)) }
