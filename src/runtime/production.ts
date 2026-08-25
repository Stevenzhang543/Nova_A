import { reactive } from 'vue'

export type TestKind = 'unit' | 'integration' | 'scene' | 'ui' | 'physics' | 'animation' | 'regression' | 'headless'
export type TestAssertionKind = 'entityCountAtLeast' | 'entityExists' | 'finitePhysics' | 'checksumEquals' | 'noRuntimeErrors'
export type NetworkRole = 'client' | 'server' | 'host'
export type NetworkTransportKind = 'websocket' | 'native-udp'

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
    role: NetworkRole
    transport: NetworkTransportKind
    endpoint: string
    bindAddress: string
    snapshotRate: number
    interpolationMs: number
    rollbackFrames: number
    bandwidthKbps: number
    reconnect: boolean
    replicatedEntities: ReplicatedEntityDefinition[]
  }
}

const DEFAULTS: ProductionProjectSettings = {
  performance: { traceCapacity: 600, memoryBudgetMb: 300, assetBudgetMb: 512, animationBudgetMs: 2, uiBudgetMs: 2, frameBudgetMs: 16.667, renderingBudgetMs: 8, audioBudgetMs: 2, gpuBudgetMs: 8, drawCallBudget: 500, textureBudgetMb: 256, particleBudgetMs: 2, profilerOverheadBudgetPercent: 5, leakWindowFrames: 600, lifetimeCapacity: 2_000 },
  replay: { seed: 0x4e4f5641, capacity: 3_600, strictChecksums: true },
  testing: { defaultTimeoutMs: 10_000, tests: [] },
  data: { saveSchemaVersion: 1, saveMigrations: [] },
  jobs: { maxWorkers: 2, maxQueued: 256, timeoutMs: 15_000 },
  networking: {
    enabled: false, role: 'client', transport: 'websocket', endpoint: 'ws://127.0.0.1:7777', bindAddress: '127.0.0.1:0',
    snapshotRate: 20, interpolationMs: 100, rollbackFrames: 120, bandwidthKbps: 256, reconnect: true, replicatedEntities: []
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
      interpolate: item.interpolate !== false, predict: item.predict === true
    }]
  })
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
    },
    replay: { seed: bounded(replay.seed, DEFAULTS.replay.seed, 0, 0xffff_ffff, true) >>> 0, capacity: bounded(replay.capacity, DEFAULTS.replay.capacity, 60, 60_000, true), strictChecksums: replay.strictChecksums !== false },
    testing: { defaultTimeoutMs: bounded(testing.defaultTimeoutMs, DEFAULTS.testing.defaultTimeoutMs, 100, 120_000, true), tests },
    data: { saveSchemaVersion: bounded(data.saveSchemaVersion, 1, 1, 65_535, true), saveMigrations: normalizeMigrations(data.saveMigrations) },
    jobs: { maxWorkers: bounded(jobs.maxWorkers, DEFAULTS.jobs.maxWorkers, 1, 8, true), maxQueued: bounded(jobs.maxQueued, DEFAULTS.jobs.maxQueued, 8, 2_048, true), timeoutMs: bounded(jobs.timeoutMs, DEFAULTS.jobs.timeoutMs, 100, 120_000, true) },
    networking: {
      enabled: networking.enabled === true, role: roles.includes(networking.role as NetworkRole) ? networking.role as NetworkRole : 'client',
      transport: transports.includes(networking.transport as NetworkTransportKind) ? networking.transport as NetworkTransportKind : 'websocket',
      endpoint: text(networking.endpoint, DEFAULTS.networking.endpoint, 512), bindAddress: text(networking.bindAddress, DEFAULTS.networking.bindAddress, 256),
      snapshotRate: bounded(networking.snapshotRate, 20, 1, 120, true), interpolationMs: bounded(networking.interpolationMs, 100, 0, 2_000, true),
      rollbackFrames: bounded(networking.rollbackFrames, 120, 0, 600, true), bandwidthKbps: bounded(networking.bandwidthKbps, 256, 8, 1_000_000, true),
      reconnect: networking.reconnect !== false, replicatedEntities
    }
  }
}

export function loadProductionSettings(value: unknown): void { Object.assign(productionSettings, normalizeProductionSettings(value)) }
export function serializeProductionSettings(): ProductionProjectSettings { return normalizeProductionSettings(productionSettings) }
export function resetProductionSettings(): void { Object.assign(productionSettings, structuredClone(DEFAULTS)) }
