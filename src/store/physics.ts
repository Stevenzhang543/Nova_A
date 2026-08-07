import { reactive, markRaw } from 'vue'
import { World, defaultCollisionMatrix, PHYSICS_LAYER_COUNT, type EngineDiagnostics, type GlobalPhysicsSettings } from '../world/World'
import { Camera } from '../world/Camera'
import { Entity } from '../world/Entity'
import { BoxEntity } from '../world/BoxEntity'
import { CircleEntity } from '../world/CircleEntity'
import { TriangleEntity } from '../world/TriangleEntity'
import {
  finiteNumber,
  normalizeEntity,
  syncDensityFromMass
} from '../world/geometry'
import {
  createConnection as createConnectionModel,
  initializeRopeNodes,
  normalizeConnection,
  type AnchorMode,
  type Connection
} from '../world/Connection'
import { editorState } from './editor'
import { preferencesState } from './preferences'
import { t } from '../i18n'
import { normalizeUuid } from '../world/identity'
import { Collider2D, RigidBody2D, ShapeRenderer2D, type Component2D, type ComponentKind } from '../world/components'
import { Transform } from '../world/Transform'
import { SceneManager } from '../world/SceneManager'

interface PhysicsState {
  world: World
  camera: Camera
  selectedEntityId: number | null
  focusEntityID: number | null
  activeTool: 'rectangle' | 'circle' | 'triangle'
  globalSettings: GlobalPhysicsSettings
  simulationRunning: boolean
  engineDiagnostics: EngineDiagnostics
}

interface SceneEntityData {
  [key: string]: unknown
  id?: number
  uuid?: string
  name?: string
  entityType?: string
  shapeType?: string
  layer?: number
  transform?: {
    position?: { x?: number; y?: number }
    scale?: { x?: number; y?: number }
    rotation?: number
  }
  vertices?: Array<{ x?: number; y?: number }>
  radiusX?: number
  radiusY?: number
  enabled?: boolean
  tags?: string[]
  components?: SceneComponentData[]
}

interface SceneComponentData {
  uuid?: string
  kind?: ComponentKind
  enabled?: boolean
  removed?: boolean
  data?: Record<string, unknown>
}

interface SceneConnectionData extends Omit<Partial<Connection>, 'anchors'> {
  id?: number
  uuid?: string
  anchors?: Array<Partial<Connection['anchors'][number]> & { entityUuid?: string }>
}

const rawWorld = new World()
const rawCamera = new Camera()

let simulationSnapshot: string | null = null
rawWorld.entities = reactive([])
rawWorld.connections = reactive([])

export const physicsState = reactive<PhysicsState>({
  world: markRaw(rawWorld),
  camera: markRaw(rawCamera),
  selectedEntityId: null,
  focusEntityID: null,
  activeTool: 'rectangle',
  globalSettings: {
    gravity: 9.8,
    airFriction: 0.01,
    timeScale: 1,
    tickRate: 60,
    maxCatchUpSteps: 8,
    collisionMatrix: defaultCollisionMatrix()
  },
  simulationRunning: false,
  engineDiagnostics: { ...rawWorld.diagnostics }
})

export const sceneManager = reactive(new SceneManager())

export function normalizeGlobalSettings(): void {
  physicsState.globalSettings.gravity = finiteNumber(physicsState.globalSettings.gravity, 9.8)
  physicsState.globalSettings.airFriction = Math.max(0, finiteNumber(physicsState.globalSettings.airFriction, 0.01))
  physicsState.globalSettings.timeScale = Math.max(0, finiteNumber(physicsState.globalSettings.timeScale, 1))
  physicsState.globalSettings.tickRate = Math.min(1000, Math.max(1, finiteNumber(physicsState.globalSettings.tickRate, 60)))
  physicsState.globalSettings.maxCatchUpSteps = Math.min(240, Math.max(1, Math.round(finiteNumber(physicsState.globalSettings.maxCatchUpSteps, 8))))
  const source = Array.isArray(physicsState.globalSettings.collisionMatrix)
    ? physicsState.globalSettings.collisionMatrix
    : defaultCollisionMatrix()
  physicsState.globalSettings.collisionMatrix = Array.from({ length: PHYSICS_LAYER_COUNT }, (_, layer) => {
    const value = finiteNumber(source[layer], 1 << layer)
    return Math.min(0xffff_ffff, Math.max(0, Math.round(value))) >>> 0
  })
}

export function enterEditMode(id: number | null): void {
  physicsState.selectedEntityId = id
  physicsState.focusEntityID = id
}

function serializeComponent(component: Component2D): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  if (component instanceof Transform) {
    data.parentUuid = component.parentUuid
    data.position = { ...component.position }
    data.rotation = component.rotation
    data.scale = { ...component.scale }
  } else if (component instanceof ShapeRenderer2D) {
    data.shape = component.shape
    data.vertices = component.vertices.map(vertex => ({ ...vertex }))
    data.radiusX = component.radiusX
    data.radiusY = component.radiusY
    data.color = { ...component.color }
    data.opacity = component.opacity
    data.texture = component.texture
    data.sortingLayer = component.sortingLayer
    data.orderInLayer = component.orderInLayer
  } else if (component instanceof RigidBody2D) {
    Object.assign(data, {
      bodyType: component.bodyType,
      massMode: component.massMode,
      density: component.density,
      mass: component.mass,
      autoInertia: component.autoInertia,
      inertia: component.inertia,
      gravityScale: component.gravityScale,
      localGravity: component.localGravity,
      velocity: { ...component.velocity },
      acceleration: { ...component.acceleration },
      angularVelocity: component.angularVelocity,
      linearDamping: component.linearDamping,
      angularDamping: component.angularDamping,
      force: { ...component.force },
      torque: component.torque,
      continuousCollision: component.continuousCollision,
      sleepingAllowed: component.sleepingAllowed,
      freezeRotation: component.freezeRotation
    })
  } else if (component instanceof Collider2D) {
    Object.assign(data, {
      offset: { ...component.offset },
      rotation: component.rotation,
      size: { ...component.size },
      radiusX: component.radiusX,
      radiusY: component.radiusY,
      vertices: component.vertices.map(vertex => ({ ...vertex })),
      sensor: component.sensor,
      physicsLayer: component.physicsLayer,
      collisionMask: component.collisionMask >>> 0,
      material: { ...component.material }
    })
  }
  return { uuid: component.uuid, kind: component.kind, enabled: component.enabled, removed: component.removed, data }
}

function serializeEntity(entity: Entity): Record<string, unknown> {
  normalizeEntity(entity)
  return {
    uuid: entity.uuid,
    name: entity.name,
    enabled: entity.enabled,
    tags: [...entity.tags],
    entityType: entity.entityType,
    components: [...entity.componentMap.values()].map(serializeComponent)
  }
}

function serializeActiveScene(): Record<string, unknown> {
  normalizeGlobalSettings()
  const entitiesById = new Map(physicsState.world.entities.map(entity => [entity.id, entity]))
  return {
    layers: [...editorState.layers],
    activeLayer: editorState.activeLayer,
    renderLayer: editorState.renderLayer,
    globalSettings: { ...physicsState.globalSettings },
    entities: physicsState.world.entities.map(serializeEntity),
    connections: physicsState.world.connections.map(connection => {
      const { id: _runtimeId, ...stored } = connection
      void _runtimeId
      return {
      ...stored,
      anchors: connection.anchors.map(anchor => {
        const { entityId, ...storedAnchor } = anchor
        return { ...storedAnchor, entityUuid: entitiesById.get(entityId)?.uuid, localPoint: { ...anchor.localPoint } }
      }),
      restLengths: [...connection.restLengths],
      manualSegments: connection.manualSegments.map(segment => segment.map(point => ({ ...point }))),
      ropeNodes: connection.ropeNodes.map(node => ({ position: { ...node.position }, velocity: { ...node.velocity } }))
    }} )
  }
}

function projectSource(): Record<string, unknown> {
  sceneManager.captureActive(serializeActiveScene())
  return {
    formatVersion: physicsState.world.projectFormatVersion,
    engineVersion: physicsState.world.projectEngineVersion,
    activeSceneUuid: sceneManager.activeSceneUuid,
    scenes: sceneManager.serialize()
  }
}

export function getSceneJSON(): string {
  const source = JSON.stringify(projectSource())
  return physicsState.world.formatProjectJson(source)
}

function copyVector(target: { x: number; y: number }, source: unknown): void {
  if (!source || typeof source !== 'object') return
  const vector = source as { x?: unknown; y?: unknown }
  target.x = finiteNumber(vector.x, target.x)
  target.y = finiteNumber(vector.y, target.y)
}

function normalizeIdentifier(value: unknown, fallback = 1): number {
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, Math.round(finiteNumber(value, fallback))))
}

const SCALAR_ENTITY_PROPERTIES = [
  'layer', 'density', 'restitutionThreshold', 'transparency', 'angularVelocity',
  'linearDamping', 'angularDamping', 'mass', 'inertia', 'gravityScale', 'torque',
  'gravity', 'restitution', 'staticFriction', 'dynamicFriction'
] as const

const BOOLEAN_ENTITY_PROPERTIES = ['autoInertia', 'isSensor', 'isStatic', 'isKinematic'] as const

function normalizedVertices(vertices: SceneEntityData['vertices']): Array<{ x: number; y: number }> | null {
  if (!Array.isArray(vertices) || vertices.length < 3) return null
  return vertices.map(vertex => ({ x: finiteNumber(vertex.x, 0), y: finiteNumber(vertex.y, 0) }))
}

function storedComponent(item: SceneEntityData, kind: ComponentKind): SceneComponentData | undefined {
  return item.components?.find(component => component.kind === kind)
}

function storedShapeType(item: SceneEntityData): string | undefined {
  if (item.entityType) return item.entityType
  const renderer = storedComponent(item, 'ShapeRenderer2D')?.data
  if (renderer?.shape === 'Ellipse') return 'Circle'
  if (renderer?.shape === 'Rectangle') return 'Box'
  if (renderer?.shape === 'Polygon') {
    const vertices = renderer.vertices
    return Array.isArray(vertices) && vertices.length === 3 ? 'Triangle' : 'Box'
  }
  return item.shapeType ?? item.name
}

function createShapeEntity(item: SceneEntityData, id: number, position: { x: number; y: number }): Entity {
  const shapeType = storedShapeType(item)
  if (shapeType === 'Circle') {
    const radiusX = finiteNumber(item.radiusX, 1)
    return new CircleEntity(id, position, radiusX, finiteNumber(item.radiusY, radiusX), item.uuid)
  }
  const vertices = normalizedVertices(item.vertices)
  if (shapeType === 'Box') {
    const entity = new BoxEntity(id, position, { x: 1, y: 1 }, item.uuid)
    if (vertices) entity.vertices = vertices
    return entity
  }
  if (shapeType === 'Triangle') {
    const entity = new TriangleEntity(id, position, { x: 1, y: 1 }, item.uuid)
    if (vertices) entity.vertices = vertices
    return entity
  }
  throw new Error(t('unsupportedShape', { shape: String(shapeType) }))
}

function recordData(component: SceneComponentData | undefined): Record<string, unknown> {
  return component?.data && typeof component.data === 'object' ? component.data : {}
}

function applyComponentMetadata(target: { enabled: boolean; removed: boolean }, source: SceneComponentData): void {
  target.enabled = source.enabled !== false
  target.removed = source.removed === true
  if (target.removed) target.enabled = false
}

function applyStoredComponents(entity: Entity, item: SceneEntityData): void {
  if (!Array.isArray(item.components)) return

  const transformSource = storedComponent(item, 'Transform2D')
  if (transformSource) {
    const data = recordData(transformSource)
    const transform = new Transform(transformSource.uuid)
    applyComponentMetadata(transform, transformSource)
    transform.parentUuid = typeof data.parentUuid === 'string' ? data.parentUuid : null
    copyVector(transform.position, data.position)
    copyVector(transform.scale, data.scale)
    transform.rotation = finiteNumber(data.rotation, transform.rotation)
    transform.removed = false
    transform.enabled = true
    entity.componentMap.set('Transform2D', transform)
  }

  const rendererSource = storedComponent(item, 'ShapeRenderer2D')
  if (rendererSource) {
    const data = recordData(rendererSource)
    const shape = data.shape === 'Ellipse' || data.shape === 'Polygon' ? data.shape : 'Rectangle'
    const renderer = new ShapeRenderer2D(shape, rendererSource.uuid)
    applyComponentMetadata(renderer, rendererSource)
    const vertices = normalizedVertices(data.vertices as SceneEntityData['vertices'])
    if (vertices) renderer.vertices = vertices
    renderer.radiusX = Math.max(1e-9, finiteNumber(data.radiusX, renderer.radiusX))
    renderer.radiusY = Math.max(1e-9, finiteNumber(data.radiusY, renderer.radiusY))
    if (data.color && typeof data.color === 'object') {
      const color = data.color as Record<string, unknown>
      renderer.color = {
        r: finiteNumber(color.r, renderer.color.r),
        g: finiteNumber(color.g, renderer.color.g),
        b: finiteNumber(color.b, renderer.color.b)
      }
    }
    renderer.opacity = finiteNumber(data.opacity, renderer.opacity)
    renderer.texture = typeof data.texture === 'string' ? data.texture : null
    renderer.sortingLayer = normalizeIdentifier(data.sortingLayer, renderer.sortingLayer)
    renderer.orderInLayer = Math.round(finiteNumber(data.orderInLayer, renderer.orderInLayer))
    entity.componentMap.set('ShapeRenderer2D', renderer)
  } else {
    entity.removeComponent('ShapeRenderer2D')
  }

  const bodySource = storedComponent(item, 'RigidBody2D')
  if (bodySource) {
    const data = recordData(bodySource)
    const body = new RigidBody2D(bodySource.uuid)
    applyComponentMetadata(body, bodySource)
    if (data.bodyType === 'Static' || data.bodyType === 'Kinematic') body.bodyType = data.bodyType
    if (data.massMode === 'Manual') body.massMode = 'Manual'
    if (typeof data.autoInertia === 'boolean') body.autoInertia = data.autoInertia
    for (const property of ['density', 'mass', 'inertia', 'gravityScale', 'localGravity', 'angularVelocity', 'linearDamping', 'angularDamping', 'torque'] as const) {
      body[property] = finiteNumber(data[property], body[property])
    }
    copyVector(body.velocity, data.velocity)
    copyVector(body.acceleration, data.acceleration)
    copyVector(body.force, data.force)
    if (data.continuousCollision === 'Discrete') body.continuousCollision = 'Discrete'
    if (typeof data.sleepingAllowed === 'boolean') body.sleepingAllowed = data.sleepingAllowed
    if (typeof data.freezeRotation === 'boolean') body.freezeRotation = data.freezeRotation
    entity.componentMap.set('RigidBody2D', body)
  } else {
    entity.removeComponent('RigidBody2D')
  }

  const colliderSource = item.components.find(component => component.kind?.endsWith('Collider2D'))
  if (colliderSource?.kind === 'BoxCollider2D' || colliderSource?.kind === 'EllipseCollider2D' || colliderSource?.kind === 'PolygonCollider2D') {
    for (const kind of ['BoxCollider2D', 'EllipseCollider2D', 'PolygonCollider2D'] as const) entity.componentMap.delete(kind)
    const data = recordData(colliderSource)
    const collider = new Collider2D(colliderSource.kind, colliderSource.uuid)
    applyComponentMetadata(collider, colliderSource)
    copyVector(collider.offset, data.offset)
    copyVector(collider.size, data.size)
    collider.rotation = finiteNumber(data.rotation, collider.rotation)
    collider.radiusX = Math.max(1e-9, finiteNumber(data.radiusX, collider.radiusX))
    collider.radiusY = Math.max(1e-9, finiteNumber(data.radiusY, collider.radiusY))
    const vertices = normalizedVertices(data.vertices as SceneEntityData['vertices'])
    if (vertices) collider.vertices = vertices
    collider.sensor = data.sensor === true
    collider.physicsLayer = Math.min(31, Math.max(0, Math.round(finiteNumber(data.physicsLayer))))
    collider.collisionMask = Math.min(0xffff_ffff, Math.max(0, Math.round(finiteNumber(data.collisionMask, 1 << collider.physicsLayer)))) >>> 0
    if (data.material && typeof data.material === 'object') {
      const material = data.material as Record<string, unknown>
      collider.material.restitution = finiteNumber(material.restitution, collider.material.restitution)
      collider.material.restitutionThreshold = finiteNumber(material.restitutionThreshold, collider.material.restitutionThreshold)
      collider.material.staticFriction = finiteNumber(material.staticFriction, collider.material.staticFriction)
      collider.material.dynamicFriction = finiteNumber(material.dynamicFriction, collider.material.dynamicFriction)
    }
    entity.componentMap.set(collider.kind, collider)
  } else {
    const collider = entity.getCollider(true)
    if (collider) entity.removeComponent(collider.kind)
  }
}

function applyStoredProperties(entity: Entity, source: Record<string, unknown>): void {
  const mutableEntity = entity as unknown as Record<string, unknown>
  for (const property of SCALAR_ENTITY_PROPERTIES) {
    if (source[property] !== undefined) {
      mutableEntity[property] = finiteNumber(source[property], mutableEntity[property] as number)
    }
  }
  for (const property of BOOLEAN_ENTITY_PROPERTIES) {
    if (typeof source[property] === 'boolean') mutableEntity[property] = source[property]
  }
}

function applyStoredAppearance(entity: Entity, source: Record<string, unknown>): void {
  if (typeof source.name === 'string' && source.name.trim()) entity.name = source.name.trim()
  if (typeof source.texture === 'string' || source.texture === null) entity.texture = source.texture
  if (!source.color || typeof source.color !== 'object') return
  const color = source.color as { r?: unknown; g?: unknown; b?: unknown }
  entity.color.r = finiteNumber(color.r, entity.color.r)
  entity.color.g = finiteNumber(color.g, entity.color.g)
  entity.color.b = finiteNumber(color.b, entity.color.b)
}

function applyStoredTransform(entity: Entity, item: SceneEntityData, source: Record<string, unknown>): void {
  if (item.transform) {
    copyVector(entity.transform.position, item.transform.position)
    copyVector(entity.transform.scale, item.transform.scale)
    entity.transform.rotation = finiteNumber(item.transform.rotation, entity.transform.rotation)
  }
  copyVector(entity.velocity, source.velocity)
  copyVector(entity.acceleration, source.acceleration)
  copyVector(entity.force, source.force)
}

function createEntityFromData(item: SceneEntityData, forcedId?: number): Entity {
  if (!item || typeof item !== 'object') throw new Error(t('invalidEntityRecord'))
  const id = normalizeIdentifier(forcedId ?? item.id)
  const position = {
    x: finiteNumber(item.transform?.position?.x, 0),
    y: finiteNumber(item.transform?.position?.y, 0)
  }
  const source = item as Record<string, unknown>
  const entity = createShapeEntity(item, id, position)
  if (Array.isArray(item.components)) applyStoredComponents(entity, item)
  else {
    applyStoredProperties(entity, source)
    applyStoredAppearance(entity, source)
    applyStoredTransform(entity, item, source)
  }
  if (typeof item.name === 'string' && item.name.trim()) entity.name = item.name.trim()
  entity.enabled = item.enabled !== false
  entity.tags = Array.isArray(item.tags) ? item.tags.filter(tag => typeof tag === 'string').map(tag => tag.slice(0, 80)) : []

  if (entity.isStatic) entity.isKinematic = false
  normalizeEntity(entity)
  syncDensityFromMass(entity)
  return entity
}

export function cloneEntity(original: Entity, layer = original.layer, offset = { x: 0, y: 0 }): Entity {
  const data = serializeEntity(original) as SceneEntityData
  delete data.uuid
  data.components?.forEach(component => { delete component.uuid })
  const clone = createEntityFromData(data, physicsState.world.allocateId())
  clone.layer = layer
  clone.transform.position.x += finiteNumber(offset.x)
  clone.transform.position.y += finiteNumber(offset.y)
  normalizeEntity(clone)
  return clone
}

export function addConnection(entityIds: number[], modes: AnchorMode[] = []): Connection {
  const connection = createConnectionModel(
    physicsState.world.allocateConnectionId(),
    physicsState.world.entities,
    entityIds,
    modes
  )
  physicsState.world.connections.push(connection)
  return connection
}

export function deleteConnection(connectionId: number): void {
  const index = physicsState.world.connections.findIndex(connection => connection.id === connectionId)
  if (index !== -1) physicsState.world.connections.splice(index, 1)
}

export function repairConnection(connectionId: number): void {
  const connection = physicsState.world.connections.find(candidate => candidate.id === connectionId)
  if (!connection) return
  connection.breakState = 'intact'
  connection.breakLink = -1
  connection.tension = 0
  connection.strain = 0
  if (connection.collisionEnabled) initializeRopeNodes(connection, physicsState.world.entities)
}

export function detachEntityFromConnections(entityId: number): void {
  for (let index = physicsState.world.connections.length - 1; index >= 0; index--) {
    const connection = physicsState.world.connections[index]
    connection.anchors = connection.anchors.filter(anchor => anchor.entityId !== entityId)
    if (!normalizeConnection(connection, physicsState.world.entities.filter(entity => entity.id !== entityId))) {
      physicsState.world.connections.splice(index, 1)
    }
  }
}

export function duplicateConnections(entityIdMap: Map<number, number>): void {
  const originals = [...physicsState.world.connections]
  for (const original of originals) {
    if (!original.anchors.every(anchor => entityIdMap.has(anchor.entityId))) continue
    const clone = JSON.parse(JSON.stringify(original)) as Connection
    clone.id = physicsState.world.allocateConnectionId()
    clone.uuid = normalizeUuid(undefined)
    clone.name = `${original.name} copy`
    clone.anchors.forEach(anchor => { anchor.entityId = entityIdMap.get(anchor.entityId)! })
    clone.breakState = 'intact'
    clone.tension = 0
    clone.strain = 0
    if (normalizeConnection(clone, physicsState.world.entities)) physicsState.world.connections.push(clone)
  }
}

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
  const entities = records.map(item => {
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
    connection.anchors = item.anchors.flatMap(anchor => {
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

function loadGlobalSettings(scene: Record<string, unknown>): void {
  if (!scene.globalSettings || typeof scene.globalSettings !== 'object') return
  const settings = scene.globalSettings as Record<string, unknown>
  physicsState.globalSettings.gravity = finiteNumber(settings.gravity, physicsState.globalSettings.gravity)
  physicsState.globalSettings.airFriction = finiteNumber(settings.airFriction, physicsState.globalSettings.airFriction)
  physicsState.globalSettings.timeScale = finiteNumber(settings.timeScale, physicsState.globalSettings.timeScale)
  physicsState.globalSettings.tickRate = finiteNumber(settings.tickRate, physicsState.globalSettings.tickRate)
  physicsState.globalSettings.maxCatchUpSteps = finiteNumber(settings.maxCatchUpSteps, physicsState.globalSettings.maxCatchUpSteps)
  if (Array.isArray(settings.collisionMatrix)) {
    physicsState.globalSettings.collisionMatrix = settings.collisionMatrix.map(value => finiteNumber(value))
  }
  normalizeGlobalSettings()
}

export function loadProject(jsonString: string): boolean {
  try {
    const migrated = physicsState.world.formatProjectJson(jsonString)
    const parsed: unknown = JSON.parse(migrated)
    const root = Array.isArray(parsed) ? { entities: parsed } : parsed
    if (!root || typeof root !== 'object') throw new Error(t('invalidProjectRoot'))
    const project = root as Record<string, unknown>
    const sceneRecords = Array.isArray(project.scenes)
      ? project.scenes
      : [{ uuid: normalizeUuid(undefined), name: 'Main Scene', ...project }]
    sceneManager.importProject(sceneRecords, project.activeSceneUuid)
    const scene = sceneManager.activeScene.data
    if (!Array.isArray(scene.entities)) throw new Error(t('missingEntitiesArray'))

    const { entities, maximumId, uuidToId } = loadEntities(scene.entities as SceneEntityData[])
    const { connections, maximumId: maximumConnectionId } = loadConnections(
      Array.isArray(scene.connections) ? scene.connections : [],
      entities,
      uuidToId
    )

    const parsedLayers = Array.isArray(scene.layers)
      ? scene.layers.map(layer => normalizeIdentifier(layer))
      : entities.map(entity => entity.layer)
    const layers = [...new Set([1, ...parsedLayers, ...entities.map(entity => entity.layer)])].sort((a, b) => a - b)

    physicsState.world.invalidateRuntime()
    physicsState.world.entities.splice(0, physicsState.world.entities.length, ...entities)
    physicsState.world.connections.splice(0, physicsState.world.connections.length, ...connections)
    physicsState.simulationRunning = false
    simulationSnapshot = null
    editorState.layers.splice(0, editorState.layers.length, ...layers)
    physicsState.world.setNextId(maximumId + 1)
    physicsState.world.setNextConnectionId(maximumConnectionId + 1)

    loadGlobalSettings(scene)

    const requestedActiveLayer = normalizeIdentifier(scene.activeLayer, layers[0])
    editorState.activeLayer = layers.includes(requestedActiveLayer) ? requestedActiveLayer : layers[0]
    if (scene.renderLayer === 'all') editorState.renderLayer = 'all'
    else {
      const requestedRenderLayer = normalizeIdentifier(scene.renderLayer, layers[0])
      editorState.renderLayer = layers.includes(requestedRenderLayer) ? requestedRenderLayer : 'all'
    }

    if (physicsState.selectedEntityId !== null
      && !entities.some(entity => entity.id === physicsState.selectedEntityId)) {
      enterEditMode(null)
    }
    return true
  } catch (error) {
    console.error('Failed to load project', error)
    editorState.statusText = t('loadFailed', { message: error instanceof Error ? error.message : t('unknownError') })
    return false
  }
}

function reloadSceneManagerProject(): boolean {
  const source = JSON.stringify({
    formatVersion: physicsState.world.projectFormatVersion,
    engineVersion: physicsState.world.projectEngineVersion,
    activeSceneUuid: sceneManager.activeSceneUuid,
    scenes: sceneManager.serialize()
  })
  return loadProject(source)
}

export function createScene(name?: string): boolean {
  sceneManager.captureActive(serializeActiveScene())
  const scene = sceneManager.create(name)
  sceneManager.setActive(scene.uuid)
  return reloadSceneManagerProject()
}

export function setActiveScene(uuid: string): boolean {
  if (uuid === sceneManager.activeSceneUuid) return true
  sceneManager.captureActive(serializeActiveScene())
  if (!sceneManager.setActive(uuid)) return false
  return reloadSceneManagerProject()
}

export function reloadActiveScene(): boolean {
  return reloadSceneManagerProject()
}

export function setSceneLoaded(uuid: string, loaded: boolean): boolean {
  sceneManager.captureActive(serializeActiveScene())
  if (!sceneManager.setLoaded(uuid, loaded)) return false
  return reloadSceneManagerProject()
}

export function toggleSimulation(state: boolean): void {
  if (state && !physicsState.simulationRunning && simulationSnapshot === null) {
    simulationSnapshot = getSceneJSON()
  }
  physicsState.simulationRunning = state
}

export function resetSimulation(): void {
  const snapshot = simulationSnapshot
  physicsState.simulationRunning = false
  simulationSnapshot = null
  if (snapshot) loadProject(snapshot)
}

export function singleStepSimulation(): void {
  physicsState.simulationRunning = false
  if (simulationSnapshot === null) simulationSnapshot = getSceneJSON()
  Object.assign(physicsState.engineDiagnostics, physicsState.world.singleStep(physicsState.globalSettings))
}

export async function saveProject(): Promise<boolean> {
  const jsonString = getSceneJSON()
  try {
    if ('showSaveFilePicker' in window) {
      const handle = await (window as unknown as {
        showSaveFilePicker: (options: unknown) => Promise<{
          createWritable: () => Promise<{ write: (value: string) => Promise<void>; close: () => Promise<void> }>
        }>
      }).showSaveFilePicker({
        suggestedName: 'nova_scene.json',
        types: [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }]
      })
      const writable = await handle.createWritable()
      await writable.write(jsonString)
      await writable.close()
      return true
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false
    console.warn('File System API failed', error)
  }

  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'nova_scene.json'
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
  return true
}

export function clearScene(): void {
  physicsState.simulationRunning = false
  simulationSnapshot = null
  physicsState.world.entities.splice(0, physicsState.world.entities.length)
  physicsState.world.connections.splice(0, physicsState.world.connections.length)
  physicsState.world.invalidateRuntime()
  enterEditMode(null)
  physicsState.world.resetId()
  physicsState.world.resetConnectionId()
}

export function deleteSelected(): void {
  if (physicsState.selectedEntityId === null) return
  const index = physicsState.world.entities.findIndex(entity => entity.id === physicsState.selectedEntityId)
  if (index !== -1) {
    detachEntityFromConnections(physicsState.selectedEntityId)
    physicsState.world.entities.splice(index, 1)
  }
  enterEditMode(null)
  if (physicsState.world.entities.length === 0) {
    physicsState.world.resetId()
    physicsState.world.resetConnectionId()
  }
}

export function deleteEntity(id: number): void {
  const index = physicsState.world.entities.findIndex(entity => entity.id === id)
  if (index === -1) return
  detachEntityFromConnections(id)
  physicsState.world.entities.splice(index, 1)
  if (physicsState.selectedEntityId === id) enterEditMode(null)
}

export function resetCamera(): void {
  physicsState.camera.scale = 0.5
  physicsState.camera.targetScale = null
  physicsState.camera.targetOffset = null
  const canvas = document.querySelector('canvas')
  physicsState.camera.offset = canvas
    ? { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 }
    : { x: 0, y: 0 }
}

export function moveToFront(id: number): void {
  const index = physicsState.world.entities.findIndex(entity => entity.id === id)
  if (index === -1) return
  const [entity] = physicsState.world.entities.splice(index, 1)
  physicsState.world.entities.push(entity)
}

export function moveToBack(id: number): void {
  const index = physicsState.world.entities.findIndex(entity => entity.id === id)
  if (index === -1) return
  const [entity] = physicsState.world.entities.splice(index, 1)
  physicsState.world.entities.unshift(entity)
}

export function duplicateEntity(id: number): Entity | null {
  const original = physicsState.world.entities.find(entity => entity.id === id)
  if (!original) return null
  const clone = cloneEntity(original, original.layer, { x: 10, y: -10 })
  physicsState.world.entities.push(clone)
  return clone
}

export const historyState = reactive({ stack: [] as string[], index: -1 })

const AUTOSAVE_KEY = 'nova_a.autosave.v2'
let autosaveTimer: number | null = null

function readAutosave(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage.getItem(AUTOSAVE_KEY)
  } catch {
    return null
  }
}

export const autosaveState = reactive({ available: readAutosave() !== null })

function scheduleAutosave(): void {
  if (!preferencesState.autosave || typeof window === 'undefined') return
  if (autosaveTimer !== null) window.clearTimeout(autosaveTimer)
  autosaveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, getSceneJSON())
      autosaveState.available = true
    } catch (error) {
      console.warn('Nova_A could not write the local autosave.', error)
    }
    autosaveTimer = null
  }, preferencesState.autosaveInterval * 1000)
}

export function restoreAutosave(): boolean {
  const value = readAutosave()
  autosaveState.available = value !== null
  return value ? loadProject(value) : false
}

export function hasAutosave(): boolean {
  return autosaveState.available
}

export function pushHistory(): void {
  if (physicsState.simulationRunning) return
  const stateString = getSceneJSON()
  if (historyState.index >= 0 && historyState.stack[historyState.index] === stateString) return
  historyState.stack = historyState.stack.slice(0, historyState.index + 1)
  historyState.stack.push(stateString)
  if (historyState.stack.length > 50) historyState.stack.shift()
  historyState.index = historyState.stack.length - 1
  scheduleAutosave()
}

export function undo(): void {
  if (historyState.index <= 0) return
  historyState.index--
  if (loadProject(historyState.stack[historyState.index])) editorState.statusText = t('undoSuccess')
}

export function redo(): void {
  if (historyState.index >= historyState.stack.length - 1) return
  historyState.index++
  if (loadProject(historyState.stack[historyState.index])) editorState.statusText = t('redoSuccess')
}
