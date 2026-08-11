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
import {
  Animator, AudioListener, AudioSource, Button, Camera2D, Canvas, Checkbox, Collider2D,
  Image as UIImage, Joint2D, Panel, ParticleEmitter2D, ProgressBar, RectTransform, RigidBody2D, Script2D,
  ShapeRenderer2D, Slider, SpriteRenderer2D, Text as UIText, TextInput, TextRenderer2D, TileMap2D,
  copyComponentValues, pasteComponentValues, type Component2D, type ComponentKind
} from '../world/components'
import { Transform } from '../world/Transform'
import { SceneManager } from '../world/SceneManager'
import { translateEntityTree, worldTransform } from '../world/hierarchy'
import { CommandHistory, DocumentMutationCommand } from '../editor/commands'
import { subtreeEntities, updateSelection, type SelectionMode } from '../editor/selection'
import { assetReference, assetState, loadAssets, readTextAsset, registerEmbeddedImage, serializeAssetFolders, serializeAssets, updateTextAsset } from '../assets/AssetDatabase'
import { defaultInputMap, normalizeInputMap, type InputAction } from '../runtime/input'
import { defaultAudioSettings, normalizeAudioSettings, type AudioProjectSettings } from '../runtime/audio'
import { normalizeParticleEmitter } from '../runtime/particles'
import { invalidateTileMap, normalizeTileMap } from '../runtime/tilemap'

interface PhysicsState {
  world: World
  camera: Camera
  selectedEntityId: number | null
  selectedEntityIds: number[]
  focusEntityID: number | null
  activeTool: 'select' | 'move' | 'rotate' | 'scale' | 'rectangle' | 'circle' | 'triangle'
  globalSettings: GlobalPhysicsSettings
  simulationRunning: boolean
  playMode: 'editing' | 'playing' | 'paused'
  engineDiagnostics: EngineDiagnostics
  inputMap: InputAction[]
  audioSettings: AudioProjectSettings
}

export interface SceneEntityData {
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
  editorVisible?: boolean
  editorLocked?: boolean
  tags?: string[]
  persistentAcrossScenes?: boolean
  prefabAsset?: string | null
  prefabInstanceUuid?: string | null
  prefabSourceUuid?: string | null
  prefabOverrides?: Record<string, unknown>
  components?: SceneComponentData[]
}

export interface SceneComponentData {
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
  selectedEntityIds: [],
  focusEntityID: null,
  activeTool: 'select',
  globalSettings: {
    gravity: 9.8,
    airFriction: 0.01,
    timeScale: 1,
    tickRate: 60,
    maxCatchUpSteps: 8,
    collisionMatrix: defaultCollisionMatrix()
  },
  simulationRunning: false,
  playMode: 'editing',
  engineDiagnostics: { ...rawWorld.diagnostics },
  inputMap: defaultInputMap(),
  audioSettings: defaultAudioSettings()
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
  physicsState.selectedEntityIds.splice(0, physicsState.selectedEntityIds.length, ...(id === null ? [] : [id]))
  physicsState.focusEntityID = id
}

export function selectEntities(ids: number[], mode: SelectionMode = 'replace', primaryId?: number | null): void {
  const valid = new Set(physicsState.world.entities.map(entity => entity.id))
  const requested = ids.filter((id, index) => valid.has(id) && ids.indexOf(id) === index)
  const next = updateSelection(physicsState.selectedEntityIds, requested, mode)
  physicsState.selectedEntityIds.splice(0, physicsState.selectedEntityIds.length, ...next)
  const preferred = primaryId !== undefined && primaryId !== null && next.includes(primaryId)
    ? primaryId
    : next[next.length - 1] ?? null
  physicsState.selectedEntityId = preferred
}

export function selectedEntities(): Entity[] {
  const ids = new Set(physicsState.selectedEntityIds)
  return physicsState.world.entities.filter(entity => ids.has(entity.id))
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
    data.strokeColor = { ...component.strokeColor }
    data.strokeOpacity = component.strokeOpacity
    data.strokeWidth = component.strokeWidth
    data.material = component.material
    data.filterMode = component.filterMode
    data.textureAsset = component.textureAsset
    data.texture = component.texture
    data.sortingLayer = component.sortingLayer
    data.orderInLayer = component.orderInLayer
  } else if (component instanceof SpriteRenderer2D) {
    Object.assign(data, {
      spriteAsset: component.spriteAsset,
      tint: { ...component.tint }, opacity: component.opacity,
      flipX: component.flipX, flipY: component.flipY,
      pivot: { ...component.pivot }, size: { ...component.size },
      sortingLayer: component.sortingLayer, orderInLayer: component.orderInLayer,
      material: component.material, filterMode: component.filterMode
    })
  } else if (component instanceof TextRenderer2D) {
    Object.assign(data, {
      text: component.text, fontAsset: component.fontAsset, fontFamily: component.fontFamily,
      fontSize: component.fontSize, fontWeight: component.fontWeight, lineHeight: component.lineHeight,
      align: component.align, color: { ...component.color }, opacity: component.opacity,
      maxWidth: component.maxWidth, sortingLayer: component.sortingLayer,
      orderInLayer: component.orderInLayer, material: component.material
    })
  } else if (component instanceof Camera2D) {
    Object.assign(data, {
      active: component.active, orthographicSize: component.orthographicSize,
      viewport: { ...component.viewport }, backgroundColor: { ...component.backgroundColor },
      nearSortingLayer: component.nearSortingLayer, farSortingLayer: component.farSortingLayer,
      pixelPerfect: component.pixelPerfect, zoom: component.zoom
    })
  } else if (component instanceof Script2D) {
    Object.assign(data, {
      scriptAsset: component.scriptAsset,
      properties: JSON.parse(JSON.stringify(component.properties)) as Record<string, unknown>
    })
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
      oneWay: component.oneWay,
      oneWayNormal: { ...component.oneWayNormal },
      material: { ...component.material }
    })
  } else {
    Object.assign(data, copyComponentValues(component))
  }
  return { uuid: component.uuid, kind: component.kind, enabled: component.enabled, removed: component.removed, data }
}

export function serializeEntity(entity: Entity): Record<string, unknown> {
  normalizeEntity(entity)
  return {
    uuid: entity.uuid,
    name: entity.name,
    enabled: entity.enabled,
    editorVisible: entity.editorVisible,
    editorLocked: entity.editorLocked,
    tags: [...entity.tags],
    persistentAcrossScenes: entity.persistentAcrossScenes,
    prefabAsset: entity.prefabAsset,
    prefabInstanceUuid: entity.prefabInstanceUuid,
    prefabSourceUuid: entity.prefabSourceUuid,
    prefabOverrides: JSON.parse(JSON.stringify(entity.prefabOverrides)) as Record<string, unknown>,
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
    assets: serializeAssets(),
    assetFolders: serializeAssetFolders(),
    projectSettings: { inputMap: normalizeInputMap(physicsState.inputMap), audio: normalizeAudioSettings(physicsState.audioSettings) },
    projectStructure: {
      assetsRoot: 'Assets', settingsRoot: 'ProjectSettings', cacheRoot: '.nova/cache', importedRoot: '.nova/imported'
    },
    activeSceneUuid: sceneManager.activeSceneUuid,
    scenes: sceneManager.serialize()
  }
}

export function getSceneJSON(): string {
  const source = JSON.stringify(projectSource())
  return physicsState.world.formatProjectJson(source)
}

const ASSET_COMPONENT_FIELDS: Partial<Record<ComponentKind, 'textureAsset' | 'spriteAsset' | 'fontAsset' | 'scriptAsset' | 'controllerAsset' | 'audioClip' | 'tileSetAsset'>> = {
  ShapeRenderer2D: 'textureAsset',
  SpriteRenderer2D: 'spriteAsset',
  TextRenderer2D: 'fontAsset',
  Script2D: 'scriptAsset',
  Animator: 'controllerAsset',
  AudioSource: 'audioClip',
  Image: 'spriteAsset',
  Text: 'fontAsset',
  TileMap2D: 'tileSetAsset',
  ParticleEmitter2D: 'textureAsset'
}

function matchesAssetReference(value: unknown, uuid: string): boolean {
  return value === uuid || value === `asset://${uuid}`
}

function visitStoredAssetReferences(scene: Record<string, unknown>, uuid: string, clear: boolean): number {
  if (!Array.isArray(scene.entities)) return 0
  let count = 0
  for (const entity of scene.entities) {
    if (!entity || typeof entity !== 'object' || !Array.isArray((entity as SceneEntityData).components)) continue
    const storedEntity = entity as SceneEntityData
    if (matchesAssetReference(storedEntity.prefabAsset, uuid)) {
      count++
      if (clear) {
        storedEntity.prefabAsset = null
        storedEntity.prefabInstanceUuid = null
        storedEntity.prefabSourceUuid = null
        storedEntity.prefabOverrides = {}
      }
    }
    for (const rawComponent of storedEntity.components ?? []) {
      if (!rawComponent || typeof rawComponent !== 'object') continue
      const component = rawComponent as { kind?: ComponentKind; data?: Record<string, unknown> }
      const field = component.kind ? ASSET_COMPONENT_FIELDS[component.kind] : undefined
      if (!field || !component.data || !matchesAssetReference(component.data[field], uuid)) continue
      count++
      if (clear) component.data[field] = null
    }
  }
  return count
}

function visitLiveAssetReferences(uuid: string, clear: boolean): number {
  let count = 0
  for (const entity of physicsState.world.entities) {
    if (matchesAssetReference(entity.prefabAsset, uuid)) {
      count++
      if (clear) {
        entity.prefabAsset = null
        entity.prefabInstanceUuid = null
        entity.prefabSourceUuid = null
        entity.prefabOverrides = {}
      }
    }
    for (const component of entity.componentMap.values()) {
      const field = ASSET_COMPONENT_FIELDS[component.kind]
      if (!field || !matchesAssetReference((component as unknown as Record<string, unknown>)[field], uuid)) continue
      count++
      if (clear) (component as unknown as Record<string, unknown>)[field] = null
    }
  }
  return count
}

function visitDocumentAssetReferences(uuid: string, clear: boolean): number {
  let count = 0
  const target = `asset://${uuid}`
  const visit = (value: unknown): unknown => {
    if (value === uuid || value === target) { count++; return clear ? null : value }
    if (Array.isArray(value)) return value.map(visit)
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) (value as Record<string, unknown>)[key] = visit(child)
    }
    return value
  }
  for (const asset of assetState.records) {
    if (asset.uuid === uuid || !['animation', 'controller', 'tileset'].includes(asset.assetType)) continue
    const source = readTextAsset(asset.uuid)
    if (!source) continue
    try {
      const document = JSON.parse(source) as unknown
      const before = count
      visit(document)
      if (clear && count > before) updateTextAsset(asset.uuid, JSON.stringify(document, null, 2))
    } catch { /* Invalid editor documents are left untouched. */ }
  }
  return count
}

/** Counts references in the live scene and every unloaded scene document. */
export function countAssetReferences(uuid: string): number {
  let count = visitLiveAssetReferences(uuid, false)
  for (const scene of sceneManager.scenes) {
    if (scene.uuid !== sceneManager.activeSceneUuid) count += visitStoredAssetReferences(scene.data, uuid, false)
  }
  return count + visitDocumentAssetReferences(uuid, false)
}

/** Clears an asset reference everywhere so deleting an asset cannot leave a broken scene. */
export function clearAssetReferences(uuid: string): number {
  let count = visitLiveAssetReferences(uuid, true)
  for (const scene of sceneManager.scenes) {
    if (scene.uuid !== sceneManager.activeSceneUuid) count += visitStoredAssetReferences(scene.data, uuid, true)
  }
  return count + visitDocumentAssetReferences(uuid, true)
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

const EXTENDED_COMPONENT_KINDS = [
  'Animator', 'AudioSource', 'AudioListener', 'Canvas', 'RectTransform', 'Panel', 'Image',
  'Text', 'Button', 'Slider', 'ProgressBar', 'Checkbox', 'TextInput', 'TileMap2D', 'ParticleEmitter2D',
  'FixedJoint2D', 'DistanceJoint2D', 'RevoluteJoint2D', 'PrismaticJoint2D', 'SpringJoint2D'
] as const

function createExtendedComponent(kind: typeof EXTENDED_COMPONENT_KINDS[number], uuid?: string): Component2D {
  if (kind === 'Animator') return new Animator(uuid)
  if (kind === 'AudioSource') return new AudioSource(uuid)
  if (kind === 'AudioListener') return new AudioListener(uuid)
  if (kind === 'Canvas') return new Canvas(uuid)
  if (kind === 'RectTransform') return new RectTransform(uuid)
  if (kind === 'Panel') return new Panel(uuid)
  if (kind === 'Image') return new UIImage(uuid)
  if (kind === 'Text') return new UIText(uuid)
  if (kind === 'Button') return new Button(uuid)
  if (kind === 'Slider') return new Slider(uuid)
  if (kind === 'ProgressBar') return new ProgressBar(uuid)
  if (kind === 'Checkbox') return new Checkbox(uuid)
  if (kind === 'TextInput') return new TextInput(uuid)
  if (kind === 'TileMap2D') return new TileMap2D(uuid)
  if (kind === 'ParticleEmitter2D') return new ParticleEmitter2D(uuid)
  return new Joint2D(kind, uuid)
}

function clamp(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, finiteNumber(value, fallback)))
}

function safeVector(value: unknown, fallback: { x: number; y: number }): { x: number; y: number } {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return { x: finiteNumber(source.x, fallback.x), y: finiteNumber(source.y, fallback.y) }
}

function safeColor(value: unknown, fallback: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    r: Math.round(clamp(source.r, fallback.r, 0, 255)),
    g: Math.round(clamp(source.g, fallback.g, 0, 255)),
    b: Math.round(clamp(source.b, fallback.b, 0, 255))
  }
}

function normalizeExtendedComponent(component: Component2D): void {
  if (component instanceof Animator) {
    component.controllerAsset = typeof component.controllerAsset === 'string' ? component.controllerAsset : null
    component.speed = clamp(component.speed, 1, -100, 100)
    component.currentState = typeof component.currentState === 'string' ? component.currentState.slice(0, 80) : ''
    const parameters: Record<string, boolean | number> = {}
    if (component.parameters && typeof component.parameters === 'object') for (const [name, value] of Object.entries(component.parameters).slice(0, 256)) {
      if (typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) parameters[name.slice(0, 80)] = value
    }
    component.parameters = parameters
  } else if (component instanceof AudioSource) {
    component.audioClip = typeof component.audioClip === 'string' ? component.audioClip : null
    component.volume = clamp(component.volume, 1, 0, 1); component.pitch = clamp(component.pitch, 1, .25, 4)
    component.spatialBlend = clamp(component.spatialBlend, 0, 0, 1); component.minDistance = clamp(component.minDistance, 1, 0, 1e9)
    component.maxDistance = clamp(component.maxDistance, 50, component.minDistance + 1e-6, 1e9)
    if (!['Master', 'Music', 'SFX', 'UI'].includes(component.bus)) component.bus = 'SFX'
  } else if (component instanceof Canvas) {
    component.referenceSize = safeVector(component.referenceSize, { x: 1920, y: 1080 })
    component.referenceSize.x = clamp(component.referenceSize.x, 1920, 1, 100_000)
    component.referenceSize.y = clamp(component.referenceSize.y, 1080, 1, 100_000)
    component.sortingOrder = Math.round(clamp(component.sortingOrder, 0, -1_000_000, 1_000_000))
  } else if (component instanceof RectTransform) {
    if (!['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right', 'stretch'].includes(component.anchorPreset)) component.anchorPreset = 'center'
    component.pivot = safeVector(component.pivot, { x: .5, y: .5 }); component.position = safeVector(component.position, { x: 0, y: 0 }); component.size = safeVector(component.size, { x: 240, y: 80 })
    component.pivot.x = clamp(component.pivot.x, .5, 0, 1); component.pivot.y = clamp(component.pivot.y, .5, 0, 1)
    component.size.x = clamp(component.size.x, 240, 0, 1e9); component.size.y = clamp(component.size.y, 80, 0, 1e9)
    if (!component.margins || typeof component.margins !== 'object') component.margins = { left: 0, top: 0, right: 0, bottom: 0 }
    for (const side of ['left', 'top', 'right', 'bottom'] as const) component.margins[side] = finiteNumber(component.margins[side])
  } else if (component instanceof Panel) {
    component.color = safeColor(component.color, { r: 35, g: 41, b: 52 })
    component.opacity = clamp(component.opacity, 92, 0, 100); component.cornerRadius = clamp(component.cornerRadius, 14, 0, 1e6)
  } else if (component instanceof UIImage) {
    component.tint = safeColor(component.tint, { r: 255, g: 255, b: 255 })
    component.spriteAsset = typeof component.spriteAsset === 'string' ? component.spriteAsset : null
    component.opacity = clamp(component.opacity, 100, 0, 100)
  } else if (component instanceof UIText) {
    component.color = safeColor(component.color, { r: 245, g: 248, b: 252 })
    component.text = typeof component.text === 'string' ? component.text.slice(0, 100_000) : 'Text'
    component.fontAsset = typeof component.fontAsset === 'string' ? component.fontAsset : null
    component.fontFamily = typeof component.fontFamily === 'string' ? component.fontFamily.slice(0, 200) : 'Nunito Sans, sans-serif'
    component.fontSize = clamp(component.fontSize, 24, 1, 1000); component.fontWeight = Math.round(clamp(component.fontWeight, 600, 100, 900)); component.opacity = clamp(component.opacity, 100, 0, 100)
    if (!['left', 'right', 'center', 'start', 'end'].includes(component.align)) component.align = 'center'
  } else if (component instanceof Button) {
    component.normalColor = safeColor(component.normalColor, { r: 45, g: 106, b: 214 }); component.hoveredColor = safeColor(component.hoveredColor, { r: 61, g: 126, b: 235 }); component.pressedColor = safeColor(component.pressedColor, { r: 31, g: 82, b: 174 }); component.disabledColor = safeColor(component.disabledColor, { r: 90, g: 97, b: 110 })
    component.state = component.interactable ? 'Normal' : 'Disabled'
    component.onPressed = typeof component.onPressed === 'string' ? component.onPressed.slice(0, 80) : 'on_pressed'; component.onHoverEnter = typeof component.onHoverEnter === 'string' ? component.onHoverEnter.slice(0, 80) : 'on_hover_enter'; component.onHoverExit = typeof component.onHoverExit === 'string' ? component.onHoverExit.slice(0, 80) : 'on_hover_exit'
  } else if (component instanceof Slider || component instanceof ProgressBar) {
    component.min = finiteNumber(component.min); component.max = Math.max(component.min + 1e-9, finiteNumber(component.max, 1)); component.value = clamp(component.value, .5, component.min, component.max)
    if (component instanceof ProgressBar) { component.fillColor = safeColor(component.fillColor, { r: 79, g: 150, b: 255 }); component.backgroundColor = safeColor(component.backgroundColor, { r: 31, g: 37, b: 47 }) }
  } else if (component instanceof Checkbox) {
    component.label = typeof component.label === 'string' ? component.label.slice(0, 1000) : 'Checkbox'
  } else if (component instanceof TextInput) {
    component.value = typeof component.value === 'string' ? component.value.slice(0, 100_000) : ''
    component.placeholder = typeof component.placeholder === 'string' ? component.placeholder.slice(0, 1000) : ''
    component.maxLength = Math.round(clamp(component.maxLength, 256, 0, 100_000)); component.value = component.value.slice(0, component.maxLength)
  } else if (component instanceof TileMap2D) {
    normalizeTileMap(component)
    invalidateTileMap(component)
  } else if (component instanceof ParticleEmitter2D) {
    normalizeParticleEmitter(component)
  } else if (component instanceof Joint2D) {
    component.targetEntityUuid = typeof component.targetEntityUuid === 'string' ? component.targetEntityUuid : null
    component.anchor = safeVector(component.anchor, { x: 0, y: 0 }); component.connectedAnchor = safeVector(component.connectedAnchor, { x: 0, y: 0 })
    component.axis = safeVector(component.axis, { x: 1, y: 0 }); const axisLength = Math.hypot(component.axis.x, component.axis.y)
    component.axis = axisLength > 1e-9 ? { x: component.axis.x / axisLength, y: component.axis.y / axisLength } : { x: 1, y: 0 }
    component.distance = clamp(component.distance, 1, 0, 1e9); component.stiffness = clamp(component.stiffness, 1200, 0, 1e12); component.damping = clamp(component.damping, 35, 0, 1e9)
    component.lowerLimit = finiteNumber(component.lowerLimit, -1); component.upperLimit = Math.max(component.lowerLimit, finiteNumber(component.upperLimit, 1))
    component.referenceOffset = safeVector(component.referenceOffset, { x: 0, y: 0 }); component.referenceAngle = finiteNumber(component.referenceAngle)
  }
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
    if (data.strokeColor && typeof data.strokeColor === 'object') {
      const color = data.strokeColor as Record<string, unknown>
      renderer.strokeColor = { r: finiteNumber(color.r, renderer.strokeColor.r), g: finiteNumber(color.g, renderer.strokeColor.g), b: finiteNumber(color.b, renderer.strokeColor.b) }
    }
    renderer.strokeOpacity = finiteNumber(data.strokeOpacity, renderer.strokeOpacity)
    renderer.strokeWidth = Math.max(0, finiteNumber(data.strokeWidth, renderer.strokeWidth))
    renderer.material = typeof data.material === 'string' ? data.material.slice(0, 80) : renderer.material
    renderer.filterMode = data.filterMode === 'Nearest' ? 'Nearest' : 'Linear'
    renderer.textureAsset = typeof data.textureAsset === 'string' ? data.textureAsset : null
    renderer.texture = typeof data.texture === 'string' ? data.texture : null
    renderer.sortingLayer = normalizeIdentifier(data.sortingLayer, renderer.sortingLayer)
    renderer.orderInLayer = Math.round(finiteNumber(data.orderInLayer, renderer.orderInLayer))
    entity.componentMap.set('ShapeRenderer2D', renderer)
  } else {
    entity.removeComponent('ShapeRenderer2D')
  }

  const spriteSource = storedComponent(item, 'SpriteRenderer2D')
  if (spriteSource) {
    const data = recordData(spriteSource)
    const sprite = new SpriteRenderer2D(spriteSource.uuid)
    applyComponentMetadata(sprite, spriteSource)
    sprite.spriteAsset = typeof data.spriteAsset === 'string' ? data.spriteAsset : null
    if (data.tint && typeof data.tint === 'object') {
      const color = data.tint as Record<string, unknown>
      sprite.tint = { r: finiteNumber(color.r, 255), g: finiteNumber(color.g, 255), b: finiteNumber(color.b, 255) }
    }
    sprite.opacity = finiteNumber(data.opacity, sprite.opacity)
    sprite.flipX = data.flipX === true; sprite.flipY = data.flipY === true
    copyVector(sprite.pivot, data.pivot); copyVector(sprite.size, data.size)
    sprite.sortingLayer = normalizeIdentifier(data.sortingLayer, sprite.sortingLayer)
    sprite.orderInLayer = Math.round(finiteNumber(data.orderInLayer, sprite.orderInLayer))
    sprite.material = typeof data.material === 'string' ? data.material.slice(0, 80) : sprite.material
    sprite.filterMode = data.filterMode === 'Nearest' ? 'Nearest' : 'Linear'
    entity.componentMap.set('SpriteRenderer2D', sprite)
  }

  const textSource = storedComponent(item, 'TextRenderer2D')
  if (textSource) {
    const data = recordData(textSource)
    const text = new TextRenderer2D(textSource.uuid)
    applyComponentMetadata(text, textSource)
    text.text = typeof data.text === 'string' ? data.text.slice(0, 10_000) : text.text
    text.fontAsset = typeof data.fontAsset === 'string' ? data.fontAsset : null
    text.fontFamily = typeof data.fontFamily === 'string' ? data.fontFamily.slice(0, 200) : text.fontFamily
    text.fontSize = Math.max(.000001, finiteNumber(data.fontSize, text.fontSize))
    text.fontWeight = Math.min(900, Math.max(100, Math.round(finiteNumber(data.fontWeight, text.fontWeight))))
    text.lineHeight = Math.min(10, Math.max(.1, finiteNumber(data.lineHeight, text.lineHeight)))
    if (['left', 'right', 'center', 'start', 'end'].includes(String(data.align))) text.align = data.align as CanvasTextAlign
    if (data.color && typeof data.color === 'object') {
      const color = data.color as Record<string, unknown>
      text.color = { r: finiteNumber(color.r, 255), g: finiteNumber(color.g, 255), b: finiteNumber(color.b, 255) }
    }
    text.opacity = finiteNumber(data.opacity, text.opacity)
    text.maxWidth = Math.max(0, finiteNumber(data.maxWidth, text.maxWidth))
    text.sortingLayer = normalizeIdentifier(data.sortingLayer, text.sortingLayer)
    text.orderInLayer = Math.round(finiteNumber(data.orderInLayer, text.orderInLayer))
    text.material = typeof data.material === 'string' ? data.material.slice(0, 80) : text.material
    entity.componentMap.set('TextRenderer2D', text)
  }

  const cameraSource = storedComponent(item, 'Camera2D')
  if (cameraSource) {
    const data = recordData(cameraSource)
    const camera = new Camera2D(cameraSource.uuid)
    applyComponentMetadata(camera, cameraSource)
    camera.active = data.active !== false
    camera.orthographicSize = Math.max(.000001, finiteNumber(data.orthographicSize, camera.orthographicSize))
    if (data.viewport && typeof data.viewport === 'object') {
      const viewport = data.viewport as Record<string, unknown>
      camera.viewport = {
        x: Math.min(1, Math.max(0, finiteNumber(viewport.x))), y: Math.min(1, Math.max(0, finiteNumber(viewport.y))),
        width: Math.min(1, Math.max(.000001, finiteNumber(viewport.width, 1))), height: Math.min(1, Math.max(.000001, finiteNumber(viewport.height, 1)))
      }
    }
    if (data.backgroundColor && typeof data.backgroundColor === 'object') {
      const color = data.backgroundColor as Record<string, unknown>
      camera.backgroundColor = { r: finiteNumber(color.r, 17), g: finiteNumber(color.g, 21), b: finiteNumber(color.b, 27) }
    }
    camera.nearSortingLayer = Math.round(finiteNumber(data.nearSortingLayer, camera.nearSortingLayer))
    camera.farSortingLayer = Math.round(finiteNumber(data.farSortingLayer, camera.farSortingLayer))
    camera.pixelPerfect = data.pixelPerfect === true
    camera.zoom = Math.max(.000001, finiteNumber(data.zoom, camera.zoom))
    entity.componentMap.set('Camera2D', camera)
  }

  const scriptSource = storedComponent(item, 'Script2D')
  if (scriptSource) {
    const data = recordData(scriptSource)
    const script = new Script2D(scriptSource.uuid)
    applyComponentMetadata(script, scriptSource)
    script.scriptAsset = typeof data.scriptAsset === 'string' ? data.scriptAsset : null
    if (data.properties && typeof data.properties === 'object' && !Array.isArray(data.properties)) {
      for (const [name, value] of Object.entries(data.properties as Record<string, unknown>)) {
        if (typeof value === 'number' && Number.isFinite(value)) script.properties[name] = value
        else if (typeof value === 'string' || typeof value === 'boolean') script.properties[name] = value
      }
    }
    entity.componentMap.set('Script2D', script)
  }

  for (const kind of EXTENDED_COMPONENT_KINDS) {
    const source = storedComponent(item, kind)
    if (!source) continue
    const component = createExtendedComponent(kind, source.uuid)
    applyComponentMetadata(component, source)
    pasteComponentValues(component, recordData(source))
    normalizeExtendedComponent(component)
    entity.componentMap.set(kind, component)
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
    body.continuousCollision = data.continuousCollision === 'Continuous' ? 'Continuous' : 'Discrete'
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
    collider.oneWay = data.oneWay === true
    copyVector(collider.oneWayNormal, data.oneWayNormal)
    const oneWayLength = Math.hypot(collider.oneWayNormal.x, collider.oneWayNormal.y)
    collider.oneWayNormal = oneWayLength > 1e-9 ? { x: collider.oneWayNormal.x / oneWayLength, y: collider.oneWayNormal.y / oneWayLength } : { x: 0, y: 1 }
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

export function createEntityFromData(item: SceneEntityData, forcedId?: number): Entity {
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
  entity.editorVisible = item.editorVisible !== false
  entity.editorLocked = item.editorLocked === true
  entity.tags = Array.isArray(item.tags) ? item.tags.filter(tag => typeof tag === 'string').map(tag => tag.slice(0, 80)) : []
  entity.persistentAcrossScenes = item.persistentAcrossScenes === true
  entity.prefabAsset = typeof item.prefabAsset === 'string' ? item.prefabAsset : null
  entity.prefabInstanceUuid = typeof item.prefabInstanceUuid === 'string' ? item.prefabInstanceUuid : null
  entity.prefabSourceUuid = typeof item.prefabSourceUuid === 'string' ? item.prefabSourceUuid : null
  entity.prefabOverrides = item.prefabOverrides && typeof item.prefabOverrides === 'object' && !Array.isArray(item.prefabOverrides)
    ? JSON.parse(JSON.stringify(item.prefabOverrides)) as Record<string, unknown>
    : {}

  if (entity.isStatic) entity.isKinematic = false
  normalizeEntity(entity)
  syncDensityFromMass(entity)
  return entity
}

export type UiElementKind = 'Canvas' | 'Panel' | 'Image' | 'Text' | 'Button' | 'Slider' | 'ProgressBar' | 'Checkbox' | 'TextInput'

/** Creates a renderer-independent runtime UI entity without a physics body or collider. */
export function createUiEntity(kind: UiElementKind, parentUuid: string | null = null): Entity {
  const entity = physicsState.world.addBox({ x: 0, y: 0 }, { x: 1, y: 1 })
  entity.name = kind
  entity.layer = editorState.activeLayer
  entity.renderer.enabled = false
  entity.removeComponent('RigidBody2D')
  const collider = entity.getCollider()
  if (collider) entity.removeComponent(collider.kind)
  entity.addComponent(new RectTransform())
  entity.parentUuid = parentUuid
  if (kind === 'Canvas') {
    entity.addComponent(new Canvas())
    const rect = entity.getComponent<RectTransform>('RectTransform')!
    rect.anchorPreset = 'stretch'
  } else if (kind === 'Panel') entity.addComponent(new Panel())
  else if (kind === 'Image') entity.addComponent(new UIImage())
  else if (kind === 'Text') entity.addComponent(new UIText())
  else if (kind === 'Button') {
    entity.addComponent(new Button())
    const text = entity.addComponent(new UIText()); text.text = 'Button'
  } else if (kind === 'Slider') entity.addComponent(new Slider())
  else if (kind === 'ProgressBar') entity.addComponent(new ProgressBar())
  else if (kind === 'Checkbox') entity.addComponent(new Checkbox())
  else entity.addComponent(new TextInput())
  selectEntities([entity.id], 'replace', entity.id)
  pushHistory(`Create UI ${kind}`)
  return entity
}

/** Creates a tilemap host entity; tile collision is generated in merged runtime batches. */
export function createTileMapEntity(): Entity {
  const entity = physicsState.world.addBox({ x: 0, y: 0 }, { x: 1, y: 1 })
  entity.name = 'TileMap'
  entity.layer = editorState.activeLayer
  entity.renderer.enabled = false
  entity.removeComponent('RigidBody2D')
  const collider = entity.getCollider()
  if (collider) entity.removeComponent(collider.kind)
  entity.addComponent(new TileMap2D())
  selectEntities([entity.id], 'replace', entity.id)
  pushHistory('Create TileMap')
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

export interface EntityBundle {
  entities: SceneEntityData[]
  connections: Array<{ connection: Connection; anchorUuids: string[] }>
  rootUuids: string[]
}

export interface EntityBundleInstance {
  entities: Entity[]
  roots: Entity[]
  sourceToEntity: Map<string, Entity>
}

let entityClipboard: EntityBundle | null = null

export function captureEntityBundle(ids: number[]): EntityBundle | null {
  const entities = subtreeEntities(ids, physicsState.world.entities)
  if (!entities.length) return null
  const includedIds = new Set(entities.map(entity => entity.id))
  const includedUuids = new Set(entities.map(entity => entity.uuid))
  const rootUuids = entities
    .filter(entity => !entity.parentUuid || !includedUuids.has(entity.parentUuid))
    .map(entity => entity.uuid)
  const uuidById = new Map(physicsState.world.entities.map(entity => [entity.id, entity.uuid]))
  const connections = physicsState.world.connections.flatMap(connection => {
    if (!connection.anchors.every(anchor => includedIds.has(anchor.entityId))) return []
    return [{
      connection: JSON.parse(JSON.stringify(connection)) as Connection,
      anchorUuids: connection.anchors.map(anchor => uuidById.get(anchor.entityId) ?? '')
    }]
  })
  return {
    entities: entities.map(entity => JSON.parse(JSON.stringify(serializeEntity(entity))) as SceneEntityData),
    connections,
    rootUuids
  }
}

export function copySelectedEntities(): number {
  entityClipboard = captureEntityBundle(physicsState.selectedEntityIds)
  return entityClipboard?.entities.length ?? 0
}

export function instantiateEntityBundle(
  clipboard: EntityBundle,
  offset: { x: number; y: number },
  rootNameSuffix = ' copy'
): EntityBundleInstance {
  const sourceToClone = new Map<string, Entity>()
  const sourceToRuntimeId = new Map<number, number>()
  const pendingParents = new Map<Entity, string | null>()
  const clonedPrefabInstances = new Map<string, string>()
  for (const record of clipboard.entities) {
    const sourceUuid = normalizeUuid(record.uuid)
    const sourceRuntimeId = typeof record.id === 'number' ? record.id : null
    const sourceTransform = storedComponent(record, 'Transform2D')
    const sourceParent = typeof sourceTransform?.data?.parentUuid === 'string'
      ? sourceTransform.data.parentUuid
      : null
    const cloneRecord = JSON.parse(JSON.stringify(record)) as SceneEntityData
    delete cloneRecord.uuid
    cloneRecord.components?.forEach(component => { delete component.uuid })
    const clone = createEntityFromData(cloneRecord, physicsState.world.allocateId())
    if (record.prefabInstanceUuid) {
      let instanceUuid = clonedPrefabInstances.get(record.prefabInstanceUuid)
      if (!instanceUuid) {
        instanceUuid = normalizeUuid(undefined)
        clonedPrefabInstances.set(record.prefabInstanceUuid, instanceUuid)
      }
      clone.prefabInstanceUuid = instanceUuid
    }
    sourceToClone.set(sourceUuid, clone)
    if (sourceRuntimeId !== null) sourceToRuntimeId.set(sourceRuntimeId, clone.id)
    pendingParents.set(clone, sourceParent)
    physicsState.world.entities.push(clone)
  }

  for (const [clone, sourceParent] of pendingParents) {
    clone.parentUuid = sourceParent
      ? sourceToClone.get(sourceParent)?.uuid
        ?? (physicsState.world.entities.some(entity => entity.uuid === sourceParent) ? sourceParent : null)
      : null
  }

  for (const sourceUuid of clipboard.rootUuids) {
    const clone = sourceToClone.get(sourceUuid)
    if (!clone) continue
    translateEntityTree(clone, { x: finiteNumber(offset.x), y: finiteNumber(offset.y) }, physicsState.world.entities)
    if (rootNameSuffix) clone.name = `${clone.name}${rootNameSuffix}`.slice(0, 80)
  }

  for (const stored of clipboard.connections) {
    const connection = JSON.parse(JSON.stringify(stored.connection)) as Connection
    connection.id = physicsState.world.allocateConnectionId()
    connection.uuid = normalizeUuid(undefined)
    if (rootNameSuffix) connection.name = `${connection.name}${rootNameSuffix}`.slice(0, 80)
    connection.anchors.forEach((anchor, index) => {
      const sourceUuid = stored.anchorUuids[index]
      const clone = sourceToClone.get(sourceUuid)
      if (clone) anchor.entityId = clone.id
      else if (sourceToRuntimeId.has(anchor.entityId)) anchor.entityId = sourceToRuntimeId.get(anchor.entityId)!
    })
    connection.breakState = 'intact'
    connection.breakLink = -1
    connection.tension = 0
    connection.strain = 0
    if (normalizeConnection(connection, physicsState.world.entities)) physicsState.world.connections.push(connection)
  }

  const pastedRoots = clipboard.rootUuids.flatMap(uuid => {
    const entity = sourceToClone.get(uuid)
    return entity ? [entity] : []
  })
  selectEntities(pastedRoots.map(entity => entity.id), 'replace')
  physicsState.world.invalidateRuntime()
  return { entities: [...sourceToClone.values()], roots: pastedRoots, sourceToEntity: sourceToClone }
}

export function pasteEntities(offset = { x: 10, y: -10 }): Entity[] {
  if (!entityClipboard) return []
  const pasted = instantiateEntityBundle(entityClipboard, offset)
  if (pasted.entities.length) pushHistory('Paste entities')
  return pasted.entities
}

export function duplicateSelectedEntities(): Entity[] {
  const clipboard = captureEntityBundle(physicsState.selectedEntityIds)
  if (!clipboard) return []
  const pasted = instantiateEntityBundle(clipboard, { x: 10, y: -10 })
  if (pasted.entities.length) pushHistory('Duplicate entities')
  return pasted.entities
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

export function loadProject(jsonString: string, preserveRuntimeSession = false): boolean {
  try {
    const migrated = physicsState.world.formatProjectJson(jsonString)
    const parsed: unknown = JSON.parse(migrated)
    const root = Array.isArray(parsed) ? { entities: parsed } : parsed
    if (!root || typeof root !== 'object') throw new Error(t('invalidProjectRoot'))
    const project = root as Record<string, unknown>
    loadAssets(project.assets, project.assetFolders)
    const projectSettings = project.projectSettings && typeof project.projectSettings === 'object'
      ? project.projectSettings as Record<string, unknown>
      : {}
    physicsState.inputMap.splice(0, physicsState.inputMap.length, ...normalizeInputMap(projectSettings.inputMap))
    Object.assign(physicsState.audioSettings, normalizeAudioSettings(projectSettings.audio))
    const sceneRecords = Array.isArray(project.scenes)
      ? project.scenes
      : [{ uuid: normalizeUuid(undefined), name: 'Main Scene', ...project }]
    sceneManager.importProject(sceneRecords, project.activeSceneUuid)
    const scene = sceneManager.activeScene.data
    if (!Array.isArray(scene.entities)) throw new Error(t('missingEntitiesArray'))

    const { entities, maximumId, uuidToId } = loadEntities(scene.entities as SceneEntityData[])
    for (const entity of entities) {
      const renderer = entity.getComponent<ShapeRenderer2D>('ShapeRenderer2D')
      if (renderer?.texture && !renderer.textureAsset) {
        const asset = registerEmbeddedImage(renderer.texture, `${entity.name} texture`)
        renderer.textureAsset = assetReference(asset.uuid)
      }
    }
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
    if (!preserveRuntimeSession) {
      physicsState.simulationRunning = false
      physicsState.playMode = 'editing'
      simulationSnapshot = null
    }
    editorState.manualConnectionId = null
    editorState.manualConnectionPoints.splice(0)
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

    const validSelection = physicsState.selectedEntityIds.filter(id => entities.some(entity => entity.id === id))
    selectEntities(validSelection, 'replace', validSelection.includes(physicsState.selectedEntityId ?? -1)
      ? physicsState.selectedEntityId
      : validSelection[validSelection.length - 1] ?? null)
    return true
  } catch (error) {
    console.error('Failed to load project', error)
    editorState.statusText = t('loadFailed', { message: error instanceof Error ? error.message : t('unknownError') })
    return false
  }
}

function reloadSceneManagerProject(preserveRuntimeSession = false): boolean {
  const source = JSON.stringify({
    formatVersion: physicsState.world.projectFormatVersion,
    engineVersion: physicsState.world.projectEngineVersion,
    assets: serializeAssets(),
    assetFolders: serializeAssetFolders(),
    projectSettings: { inputMap: normalizeInputMap(physicsState.inputMap), audio: normalizeAudioSettings(physicsState.audioSettings) },
    activeSceneUuid: sceneManager.activeSceneUuid,
    scenes: sceneManager.serialize()
  })
  return loadProject(source, preserveRuntimeSession)
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

function persistentEntityRecords(): EntityBundle | null {
  const persistentIds = physicsState.world.entities
    .filter(entity => entity.persistentAcrossScenes)
    .map(entity => entity.id)
  const snapshot = captureEntityBundle(persistentIds)
  if (!snapshot) return null
  for (const rootUuid of snapshot.rootUuids) {
    const source = physicsState.world.entities.find(entity => entity.uuid === rootUuid)
    const record = snapshot.entities.find(entity => entity.uuid === rootUuid)
    const transform = record?.components?.find(component => component.kind === 'Transform2D')?.data
    if (!source || !transform || typeof transform !== 'object') continue
    const absolute = worldTransform(source, physicsState.world.entities)
    transform.parentUuid = null
    transform.position = { ...absolute.position }
    transform.rotation = absolute.rotation
    transform.scale = { ...absolute.scale }
  }
  return snapshot
}

function restorePersistentEntities(snapshot: EntityBundle | null): void {
  if (!snapshot) return
  const existing = new Set(physicsState.world.entities.map(entity => entity.uuid))
  const runtimeIdByUuid = new Map(physicsState.world.entities.map(entity => [entity.uuid, entity.id]))
  for (const record of snapshot.entities) {
    if (!record.uuid || existing.has(record.uuid)) continue
    const entity = createEntityFromData(record, physicsState.world.allocateId())
    physicsState.world.entities.push(entity)
    existing.add(entity.uuid)
    runtimeIdByUuid.set(entity.uuid, entity.id)
    if (!editorState.layers.includes(entity.layer)) editorState.layers.push(entity.layer)
  }
  const existingConnections = new Set(physicsState.world.connections.map(connection => connection.uuid))
  for (const stored of snapshot.connections) {
    if (existingConnections.has(stored.connection.uuid)) continue
    const connection = JSON.parse(JSON.stringify(stored.connection)) as Connection
    connection.id = physicsState.world.allocateConnectionId()
    connection.anchors.forEach((anchor, index) => {
      const runtimeId = runtimeIdByUuid.get(stored.anchorUuids[index])
      if (runtimeId !== undefined) anchor.entityId = runtimeId
    })
    if (connection.anchors.every((_, index) => runtimeIdByUuid.has(stored.anchorUuids[index]))
      && normalizeConnection(connection, physicsState.world.entities)) {
      physicsState.world.connections.push(connection)
      existingConnections.add(connection.uuid)
    }
  }
  editorState.layers.sort((first, second) => first - second)
  physicsState.world.invalidateRuntime()
}

/** Runtime-only scene switch. Persistent entities retain their UUID and state. */
export function runtimeLoadScene(identifier: string): boolean {
  const target = sceneManager.scenes.find(scene => scene.uuid === identifier || scene.name === identifier)
  if (!target) return false
  const persistent = persistentEntityRecords()
  if (!sceneManager.setActive(target.uuid) || !reloadSceneManagerProject(true)) return false
  restorePersistentEntities(persistent)
  return true
}

export function runtimeReloadScene(): boolean {
  const persistent = persistentEntityRecords()
  if (!reloadSceneManagerProject(true)) return false
  restorePersistentEntities(persistent)
  return true
}

export function toggleSimulation(state: boolean): void {
  if (state && !physicsState.simulationRunning && simulationSnapshot === null) {
    simulationSnapshot = getSceneJSON()
  }
  physicsState.simulationRunning = state
  physicsState.playMode = state ? 'playing' : simulationSnapshot === null ? 'editing' : 'paused'
}

export function resetSimulation(): void {
  const snapshot = simulationSnapshot
  physicsState.simulationRunning = false
  physicsState.playMode = 'editing'
  simulationSnapshot = null
  if (snapshot) loadProject(snapshot)
}

export function singleStepSimulation(): void {
  physicsState.simulationRunning = false
  if (simulationSnapshot === null) simulationSnapshot = getSceneJSON()
  physicsState.playMode = 'paused'
  Object.assign(physicsState.engineDiagnostics, physicsState.world.singleStep(physicsState.globalSettings))
}

export function stopPlayMode(): void {
  resetSimulation()
}

export function hasRuntimeSession(): boolean {
  return simulationSnapshot !== null
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
          suggestedName: 'project.nova',
          types: [{ description: 'Nova_A Project', accept: { 'application/json': ['.nova', '.json'] } }]
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
  anchor.download = 'project.nova'
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
  return true
}

export function clearScene(): void {
  physicsState.simulationRunning = false
  physicsState.playMode = 'editing'
  simulationSnapshot = null
  physicsState.world.entities.splice(0, physicsState.world.entities.length)
  physicsState.world.connections.splice(0, physicsState.world.connections.length)
  physicsState.world.invalidateRuntime()
  enterEditMode(null)
  physicsState.world.resetId()
  physicsState.world.resetConnectionId()
}

export function deleteSelected(): void {
  const ids = new Set(subtreeEntities(physicsState.selectedEntityIds, physicsState.world.entities).map(entity => entity.id))
  if (!ids.size) return
  for (const id of ids) detachEntityFromConnections(id)
  for (let index = physicsState.world.entities.length - 1; index >= 0; index--) {
    if (ids.has(physicsState.world.entities[index].id)) physicsState.world.entities.splice(index, 1)
  }
  enterEditMode(null)
  if (physicsState.world.entities.length === 0) {
    physicsState.world.resetId()
    physicsState.world.resetConnectionId()
  }
}

export function deleteEntity(id: number): void {
  const ids = new Set(subtreeEntities([id], physicsState.world.entities).map(entity => entity.id))
  if (!ids.size) return
  for (const entityId of ids) detachEntityFromConnections(entityId)
  for (let index = physicsState.world.entities.length - 1; index >= 0; index--) {
    if (ids.has(physicsState.world.entities[index].id)) physicsState.world.entities.splice(index, 1)
  }
  const selection = physicsState.selectedEntityIds.filter(entityId => !ids.has(entityId))
  selectEntities(selection, 'replace')
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
  const clipboard = captureEntityBundle([id])
  if (!clipboard) return null
  const clone = instantiateEntityBundle(clipboard, { x: 10, y: -10 }).entities[0] ?? null
  return clone
}

const commandHistory = new CommandHistory(100)
let historyBaseline: string | null = null
let applyingHistory = false
export const historyState = reactive({
  length: 0,
  index: -1,
  canUndo: false,
  canRedo: false,
  undoLabel: null as string | null,
  redoLabel: null as string | null
})

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

function syncHistoryState(): void {
  historyState.length = commandHistory.length
  historyState.index = commandHistory.index
  historyState.canUndo = commandHistory.canUndo
  historyState.canRedo = commandHistory.canRedo
  historyState.undoLabel = commandHistory.undoLabel
  historyState.redoLabel = commandHistory.redoLabel
}

/** Keep non-command editor navigation from becoming the implicit undo target. */
export function synchronizeHistoryBaseline(): void {
  if (physicsState.playMode !== 'editing' || applyingHistory) return
  historyBaseline = getSceneJSON()
  syncHistoryState()
}

function applyHistoryDocument(document: string): void {
  applyingHistory = true
  try {
    if (loadProject(document)) historyBaseline = document
  } finally {
    applyingHistory = false
  }
}

export function pushHistory(label = 'Edit scene', mergeKey: string | null = null): void {
  if (physicsState.playMode !== 'editing' || applyingHistory) return
  const stateString = getSceneJSON()
  if (historyBaseline === null) {
    historyBaseline = stateString
    syncHistoryState()
    scheduleAutosave()
    return
  }
  if (historyBaseline === stateString) return
  commandHistory.commit(new DocumentMutationCommand({
    label,
    before: historyBaseline,
    after: stateString,
    apply: applyHistoryDocument,
    mergeKey
  }), true)
  historyBaseline = stateString
  syncHistoryState()
  scheduleAutosave()
}

export function undo(): void {
  if (!commandHistory.undo()) return
  syncHistoryState()
  editorState.statusText = t('undoSuccess')
}

export function redo(): void {
  if (!commandHistory.redo()) return
  syncHistoryState()
  editorState.statusText = t('redoSuccess')
}
