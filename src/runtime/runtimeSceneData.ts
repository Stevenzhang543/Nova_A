/** One shared scene-record decoder; callers own insertion and transactions. */
import type { Entity } from '../world/Entity'
import type { SceneEntityData } from '../world/sceneEntityData'
import { defaultCollisionMatrix, PHYSICS_LAYER_COUNT, type GlobalPhysicsSettings } from '../world/World'
import { normalizeConnection, type Connection } from '../world/Connection'
import { finiteNumber } from '../world/geometry'
import { normalizeUuid } from '../world/identity'
import { DEFAULT_MAX_CATCH_UP_STEPS } from './engineTiming'
import { defaultPhysicsProfile, normalizePhysicsLayers, normalizePhysicsProfile } from './physicsProduction'

interface SceneConnectionData extends Omit<Partial<Connection>, 'anchors'> {
  id?: number
  uuid?: string
  anchors?: Array<Partial<Connection['anchors'][number]> & { entityUuid?: string }>
}

export interface RuntimeSceneDataPorts {
  readonly state: { globalSettings: GlobalPhysicsSettings }
  createEntityFromData(item: SceneEntityData, forcedId?: number): Entity
  normalizeIdentifier(value: unknown, fallback?: number): number
}

export function createRuntimeSceneData(ports: RuntimeSceneDataPorts) {
  if (!ports?.state?.globalSettings || typeof ports.createEntityFromData !== 'function' || typeof ports.normalizeIdentifier !== 'function') throw new Error('RUNTIME_SCENE_DATA_PORTS_REQUIRED: Supply state and the actual entity builder.')
  const physicsState = ports.state
  const createEntityFromData = ports.createEntityFromData.bind(ports)
  const normalizeIdentifier = ports.normalizeIdentifier.bind(ports)

function claimIdentifier(value: unknown, fallback: number, used: Set<number>): number | null {
  let id = normalizeIdentifier(value, fallback)
  while (used.has(id) && id < Number.MAX_SAFE_INTEGER) id++
  if (used.has(id)) {
    id = 1
    while (used.has(id) && id < Number.MAX_SAFE_INTEGER) id++
  }
  if (used.has(id)) return null
  used.add(id)
  return id
}

function loadEntities(records: SceneEntityData[]): { entities: Entity[]; maximumId: number; uuidToId: Map<string, number> } {
  const usedIds = new Set<number>()
  const usedUuids = new Set<string>()
  const uuidToId = new Map<string, number>()
  let maximumId = 0
  const entities = records.map(/** 为单条实体记录分配未占用的数字和稳定身份，再构造实体并登记映射。 */ item => {
    const id = claimIdentifier(item.id, maximumId + 1, usedIds)
    if (id === null) throw new Error('Entity ID space is exhausted')
    maximumId = Math.max(maximumId, id)
    let uuid = normalizeUuid(item.uuid)
    while (usedUuids.has(uuid)) uuid = normalizeUuid(undefined)
    usedUuids.add(uuid)
    const entity = createEntityFromData({ ...item, uuid }, id)
    uuidToId.set(entity.uuid, id)
    return entity
  })
  return { entities, maximumId, uuidToId }
}

function loadConnections(records: unknown[], entities: Entity[], uuidToId: Map<string, number>): { connections: Connection[]; maximumId: number } {
  const usedIds = new Set<number>()
  let maximumId = 0
  const connections: Connection[] = []
  for (const raw of records) {
    const item = raw as SceneConnectionData
    if (!item || typeof item !== 'object' || !Array.isArray(item.anchors)) continue
    const id = claimIdentifier(item.id, maximumId + 1, usedIds)
    if (id === null) continue
    const connection = JSON.parse(JSON.stringify(item)) as Connection
    connection.id = id
    connection.uuid = normalizeUuid(item.uuid)
    connection.anchors = item.anchors.flatMap(/** 将锚点的数字或稳定实体引用转换为运行身份，丢弃无法解析的锚点。 */ anchor => {
      const runtimeId = typeof anchor.entityId === 'number'
        ? normalizeIdentifier(anchor.entityId)
        : typeof anchor.entityUuid === 'string' ? uuidToId.get(anchor.entityUuid) : undefined
      return runtimeId === undefined ? [] : [{ ...anchor, entityId: runtimeId } as Connection['anchors'][number]]
    })
    if (!normalizeConnection(connection, entities)) continue
    maximumId = Math.max(maximumId, id)
    connections.push(connection)
  }
  return { connections, maximumId }
}

function normalizeGlobalSettings(): void {
  physicsState.globalSettings.gravity = finiteNumber(physicsState.globalSettings.gravity, 9.8)
  physicsState.globalSettings.airFriction = Math.max(0, finiteNumber(physicsState.globalSettings.airFriction, 0.01))
  physicsState.globalSettings.timeScale = Math.max(0, finiteNumber(physicsState.globalSettings.timeScale, 1))
  physicsState.globalSettings.tickRate = Math.min(1000, Math.max(1, finiteNumber(physicsState.globalSettings.tickRate, 60)))
  physicsState.globalSettings.maxCatchUpSteps = Math.min(240, Math.max(1, Math.round(finiteNumber(physicsState.globalSettings.maxCatchUpSteps, DEFAULT_MAX_CATCH_UP_STEPS))))
  physicsState.globalSettings.interpolation = physicsState.globalSettings.interpolation === 'None' ? 'None' : 'Interpolate'
  // Only an explicit fixed clock is stored, so projects saved before 26.42 keep their exact content.
  if (physicsState.globalSettings.timerClock !== 'fixed') delete physicsState.globalSettings.timerClock
  physicsState.globalSettings.profile = normalizePhysicsProfile({
    ...(physicsState.globalSettings.profile ?? defaultPhysicsProfile()),
    tickRate: physicsState.globalSettings.tickRate,
    maxCatchUpSteps: physicsState.globalSettings.maxCatchUpSteps,
    interpolation: physicsState.globalSettings.interpolation
  })
  physicsState.globalSettings.layers = normalizePhysicsLayers(physicsState.globalSettings.layers)
  const source = Array.isArray(physicsState.globalSettings.collisionMatrix)
    ? physicsState.globalSettings.collisionMatrix
    : defaultCollisionMatrix()
  physicsState.globalSettings.collisionMatrix = Array.from({ length: PHYSICS_LAYER_COUNT }, /** 限制每层碰撞位掩码到无符号三十二位范围，缺失时默认仅与自身层碰撞。 */ (_, layer) => {
    const value = finiteNumber(source[layer], 1 << layer)
    return Math.min(0xffff_ffff, Math.max(0, Math.round(value))) >>> 0
  })
}

function loadGlobalSettings(scene: Record<string, unknown>): void {
  if (!scene.globalSettings || typeof scene.globalSettings !== 'object') return
  const settings = scene.globalSettings as Record<string, unknown>
  physicsState.globalSettings.gravity = finiteNumber(settings.gravity, physicsState.globalSettings.gravity)
  physicsState.globalSettings.airFriction = finiteNumber(settings.airFriction, physicsState.globalSettings.airFriction)
  physicsState.globalSettings.timeScale = finiteNumber(settings.timeScale, physicsState.globalSettings.timeScale)
  physicsState.globalSettings.tickRate = finiteNumber(settings.tickRate, physicsState.globalSettings.tickRate)
  physicsState.globalSettings.maxCatchUpSteps = finiteNumber(settings.maxCatchUpSteps, physicsState.globalSettings.maxCatchUpSteps)
  physicsState.globalSettings.interpolation = settings.interpolation === 'None' ? 'None' : 'Interpolate'
  if (settings.timerClock === 'fixed') physicsState.globalSettings.timerClock = 'fixed'
  else delete physicsState.globalSettings.timerClock
  physicsState.globalSettings.profile = normalizePhysicsProfile(settings.profile ?? {
    tickRate: physicsState.globalSettings.tickRate,
    maxCatchUpSteps: physicsState.globalSettings.maxCatchUpSteps,
    interpolation: physicsState.globalSettings.interpolation
  })
  physicsState.globalSettings.layers = normalizePhysicsLayers(settings.layers)
  if (Array.isArray(settings.collisionMatrix)) {
    physicsState.globalSettings.collisionMatrix = settings.collisionMatrix.map(/* 调用 finiteNumber(value) 并返回调用结果。 */ value => finiteNumber(value))
  }
  normalizeGlobalSettings()
}

function loadPhysicsProjectSettings(value: unknown): void {
  if (!value || typeof value !== 'object') return
  const settings = value as Record<string, unknown>
  physicsState.globalSettings.gravity = finiteNumber(settings.gravity, physicsState.globalSettings.gravity)
  physicsState.globalSettings.airFriction = finiteNumber(settings.airFriction, physicsState.globalSettings.airFriction)
  physicsState.globalSettings.timeScale = finiteNumber(settings.timeScale, physicsState.globalSettings.timeScale)
  physicsState.globalSettings.profile = normalizePhysicsProfile(settings.profile)
  physicsState.globalSettings.tickRate = physicsState.globalSettings.profile.tickRate
  physicsState.globalSettings.maxCatchUpSteps = physicsState.globalSettings.profile.maxCatchUpSteps
  physicsState.globalSettings.interpolation = physicsState.globalSettings.profile.interpolation
  physicsState.globalSettings.layers = normalizePhysicsLayers(settings.layers)
  if (Array.isArray(settings.collisionMatrix)) physicsState.globalSettings.collisionMatrix = settings.collisionMatrix.map(/** 将碰撞矩阵值规范化为有限数值并转换为无符号三十二位位掩码。 */ value => finiteNumber(value, 0) >>> 0)
  normalizeGlobalSettings()
}

  return { loadEntities, loadConnections, normalizeGlobalSettings, loadGlobalSettings, loadPhysicsProjectSettings }
}
export type RuntimeSceneData = ReturnType<typeof createRuntimeSceneData>
