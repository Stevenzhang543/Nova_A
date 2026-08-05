import { reactive, markRaw } from 'vue'
import { World, type GlobalPhysicsSettings } from '../world/World'
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

interface PhysicsState {
  world: World
  camera: Camera
  selectedEntityId: number | null
  focusEntityID: number | null
  activeTool: 'rectangle' | 'circle' | 'triangle'
  globalSettings: GlobalPhysicsSettings
  simulationRunning: boolean
}

interface SceneEntityData {
  [key: string]: unknown
  id?: number
  name?: string
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
}

interface SceneConnectionData extends Partial<Connection> {
  id?: number
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
  globalSettings: { gravity: 9.8, airFriction: 0.01, timeScale: 1 },
  simulationRunning: false
})

export function normalizeGlobalSettings(): void {
  physicsState.globalSettings.gravity = finiteNumber(physicsState.globalSettings.gravity, 9.8)
  physicsState.globalSettings.airFriction = Math.max(0, finiteNumber(physicsState.globalSettings.airFriction, 0.01))
  physicsState.globalSettings.timeScale = Math.max(0, finiteNumber(physicsState.globalSettings.timeScale, 1))
}

export function enterEditMode(id: number | null): void {
  physicsState.selectedEntityId = id
  physicsState.focusEntityID = id
}

function serializeEntity(entity: Entity): Record<string, unknown> {
  normalizeEntity(entity)
  const data: Record<string, unknown> = {
    id: entity.id,
    name: entity.name,
    shapeType: entity.shapeType,
    layer: entity.layer,
    texture: entity.texture,
    transparency: entity.transparency,
    angularVelocity: entity.angularVelocity,
    linearDamping: entity.linearDamping,
    angularDamping: entity.angularDamping,
    density: entity.density,
    mass: entity.mass,
    autoInertia: entity.autoInertia,
    inertia: entity.inertia,
    gravityScale: entity.gravityScale,
    torque: entity.torque,
    gravity: entity.gravity,
    restitution: entity.restitution,
    restitutionThreshold: entity.restitutionThreshold,
    staticFriction: entity.staticFriction,
    dynamicFriction: entity.dynamicFriction,
    isSensor: entity.isSensor,
    isStatic: entity.isStatic,
    isKinematic: entity.isKinematic,
    transform: {
      position: { ...entity.transform.position },
      scale: { ...entity.transform.scale },
      rotation: entity.transform.rotation
    },
    velocity: { ...entity.velocity },
    acceleration: { ...entity.acceleration },
    force: { ...entity.force },
    color: { ...entity.color }
  }

  if (entity instanceof BoxEntity || entity instanceof TriangleEntity) {
    data.vertices = entity.vertices.map(vertex => ({ ...vertex }))
  } else if (entity instanceof CircleEntity) {
    data.radiusX = entity.radiusX
    data.radiusY = entity.radiusY
  }
  return data
}

export function getSceneJSON(): string {
  normalizeGlobalSettings()
  return JSON.stringify({
    formatVersion: 5,
    layers: [...editorState.layers],
    activeLayer: editorState.activeLayer,
    renderLayer: editorState.renderLayer,
    globalSettings: { ...physicsState.globalSettings },
    entities: physicsState.world.entities.map(serializeEntity),
    connections: physicsState.world.connections.map(connection => ({
      ...connection,
      anchors: connection.anchors.map(anchor => ({ ...anchor, localPoint: { ...anchor.localPoint } })),
      restLengths: [...connection.restLengths],
      manualSegments: connection.manualSegments.map(segment => segment.map(point => ({ ...point }))),
      ropeNodes: connection.ropeNodes.map(node => ({ position: { ...node.position }, velocity: { ...node.velocity } }))
    }))
  })
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

function createShapeEntity(item: SceneEntityData, id: number, position: { x: number; y: number }): Entity {
  const shapeType = item.shapeType ?? item.name
  if (shapeType === 'Circle') {
    const radiusX = finiteNumber(item.radiusX, 1)
    return new CircleEntity(id, position, radiusX, finiteNumber(item.radiusY, radiusX))
  }
  const vertices = normalizedVertices(item.vertices)
  if (shapeType === 'Box') {
    const entity = new BoxEntity(id, position, { x: 1, y: 1 })
    if (vertices) entity.vertices = vertices
    return entity
  }
  if (shapeType === 'Triangle') {
    const entity = new TriangleEntity(id, position, { x: 1, y: 1 })
    if (vertices) entity.vertices = vertices
    return entity
  }
  throw new Error(t('unsupportedShape', { shape: String(shapeType) }))
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
  applyStoredProperties(entity, source)
  applyStoredAppearance(entity, source)
  applyStoredTransform(entity, item, source)

  if (entity.isStatic) entity.isKinematic = false
  normalizeEntity(entity)
  syncDensityFromMass(entity)
  return entity
}

export function cloneEntity(original: Entity, layer = original.layer, offset = { x: 0, y: 0 }): Entity {
  const data = serializeEntity(original) as SceneEntityData
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
    const clone = structuredClone(original) as Connection
    clone.id = physicsState.world.allocateConnectionId()
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

function loadEntities(records: SceneEntityData[]): { entities: Entity[]; maximumId: number } {
  const usedIds = new Set<number>()
  let maximumId = 0
  const entities = records.map(item => {
    const id = claimIdentifier(item.id, maximumId + 1, usedIds)
    if (id === null) throw new Error('Entity ID space is exhausted')
    maximumId = Math.max(maximumId, id)
    return createEntityFromData(item, id)
  })
  return { entities, maximumId }
}

function loadConnections(records: unknown[], entities: Entity[]): { connections: Connection[]; maximumId: number } {
  const usedIds = new Set<number>()
  let maximumId = 0
  const connections: Connection[] = []
  for (const raw of records) {
    const item = raw as SceneConnectionData
    if (!item || typeof item !== 'object' || !Array.isArray(item.anchors)) continue
    const id = claimIdentifier(item.id, maximumId + 1, usedIds)
    if (id === null) continue
    const connection = structuredClone(item) as Connection
    connection.id = id
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
  normalizeGlobalSettings()
}

export function loadProject(jsonString: string): boolean {
  try {
    const parsed: unknown = JSON.parse(jsonString)
    const root = Array.isArray(parsed) ? { entities: parsed } : parsed
    if (!root || typeof root !== 'object') throw new Error(t('invalidProjectRoot'))
    const scene = root as Record<string, unknown>
    if (!Array.isArray(scene.entities)) throw new Error(t('missingEntitiesArray'))

    const { entities, maximumId } = loadEntities(scene.entities as SceneEntityData[])
    const { connections, maximumId: maximumConnectionId } = loadConnections(
      Array.isArray(scene.connections) ? scene.connections : [],
      entities
    )

    const parsedLayers = Array.isArray(scene.layers)
      ? scene.layers.map(layer => normalizeIdentifier(layer))
      : entities.map(entity => entity.layer)
    const layers = [...new Set([1, ...parsedLayers, ...entities.map(entity => entity.layer)])].sort((a, b) => a - b)

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
