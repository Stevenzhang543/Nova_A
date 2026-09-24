/** 场景编辑与物理状态桥接：序列化和加载项目，创建及修改实体，协调播放、保存与撤销历史。 */
import { notify } from '../runtime/editorFeedback'
import { assertStudioDraftsSaved } from '../editor/studioSaveBoundary'
import { validateComponentValues } from '../world/componentValidation'
import { preflightProjectValues, validateEntityMetadataValues } from '../projects/projectPreflight'
import { cancelPendingProjectMutations, flushPendingProjectMutations, setProjectMutationRecorder } from '../runtime/projectMutationRouter'
import { cancelEditorDrafts, settleEditorDrafts } from '../editor/pendingDrafts'
import { truncateUtf16 } from '../runtime/uiTextLayout'
import { reactive, markRaw } from 'vue'
import { World, defaultCollisionMatrix, PHYSICS_LAYER_COUNT, type EngineDiagnostics, type GlobalPhysicsSettings } from '../world/World'
import { Camera } from '../world/Camera'
import { Entity, type AuthoringMetadata2D } from '../world/Entity'
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
  Animator, Area2D, AreaEffector2D, AudioListener, AudioSource, BehaviorTree2D, Button, Camera2D, CameraFollow2D, Canvas, CharacterBody2D, Checkbox, Collider2D, Collectible2D, Cooldown2D,
  DamageHitbox2D, GridMover2D, Health2D, Lifetime2D, MouseFollower2D, PlatformController2D, Projectile2D, Spawner2D, TopDownController2D,
  Image as UIImage, Joint2D, Light2D, Panel, ParticleEmitter2D, ProgressBar, RectTransform, RigidBody2D, Script2D, ShadowCaster2D,
  NavigationAgent2D, NavigationObstacle2D, NavigationRegion2D, ObjectPool2D, Portal2D, ShapeRenderer2D, Skeleton2D, Slider, SpriteRenderer2D, StateMachine2D,
  Text as UIText, TextInput, TextRenderer2D, TileMap2D, TimelinePlayer, WorldChunk2D,
  copyComponentValues, normalizeJointBreakThreshold, pasteComponentValues, type Component2D, type ComponentKind, type ScriptPropertyValue
} from '../world/components'
import { Transform } from '../world/Transform'
import { SceneManager } from '../world/SceneManager'
import { translateEntityTree } from '../world/hierarchy'
import { CommandHistory, DocumentMutationCommand } from '../editor/commands'
import { subtreeEntities, updateSelection, type SelectionMode } from '../editor/selection'
import { assetReference, assetState, loadAssets, readTextAsset, registerEmbeddedImage, serializeAssetDatabaseSettings, serializeAssetFolders, serializeAssets, synchronizeAssetDependencyMetadata, updateTextAsset } from '../assets/AssetDatabase'
import { defaultInputMap, normalizeInputMap, type InputAction } from '../runtime/input'
import { loadDeviceInputSettings, serializeDeviceInputSettings } from '../runtime/deviceInput'
import { defaultAudioSettings, normalizeAudioSettings, type AudioProjectSettings } from '../runtime/audio'
import { normalizeParticleEmitter } from '../runtime/particles'
import { invalidateTileMap, normalizeTileMap } from '../runtime/tilemap'
import { buildSettings, normalizeBuildSettings, serializeBuildSettings } from '../runtime/buildSettings'
import { normalizeScriptSettings, scriptProjectSettings, serializeScriptSettings } from '../runtime/scriptSettings'
import { hydrateProjectMetadata, serializeProjectMetadata } from '../projects/projectSession'
import { NOVA_PROJECT_FORMAT, NOVA_PROJECT_FORMAT_MAJOR, NOVA_PROJECT_SCHEMA_VERSION, projectCompatibility } from '../projects/projectFormat'
import { hydrateProjectManifest, serializeProjectManifest } from '../projects/projectManifest'
import { canonicalProjectText } from '../projects/projectData'
import { recordManualSave, recoveryState, storeRecoverySnapshot } from '../runtime/recovery'
import { loadPluginManifests, serializePluginManifests } from '../runtime/plugins'
import { useSaveProject } from '../runtime/saveGame'
import { loadRenderingSettings, serializeRenderingSettings } from '../renderer/renderSettings'
import { clearRenderTextures } from '../renderer/renderTextures'
import { beginPhysicsMonitorSession } from '../runtime/physicsMonitor'
import { loadPackageState, serializePackageState } from '../runtime/packages'
import { loadWorldGameplaySettings, serializeWorldGameplaySettings, worldGameplayState } from '../runtime/worldGameplay'
import { loadLocalizationSettings, serializeLocalizationSettings } from '../runtime/localization'
import { loadRuntimeAccessibilitySettings, loadUiAudioSettings, serializeRuntimeAccessibilitySettings, serializeUiAudioSettings } from '../runtime/presentation'
import { configureUiAccessibility } from '../runtime/uiAccessibility'
import { loadProductionSettings, serializeProductionSettings } from '../runtime/production'
import { markSourceBaseline, refreshSourceStatus, stableProjectText } from '../runtime/teamWorkflow'
import { defaultPhysicsLayers, defaultPhysicsProfile, MAX_AUTHORED_COLLIDER_POINTS, normalizePhysicsLayers, normalizePhysicsProfile } from '../runtime/physicsProduction'
import { commitProjectTransaction, createNativeProjectTransactionSink, markProjectDirty, markTransactionBaseline, projectChecksum, projectTransactionState, type ProjectMutationScope } from '../runtime/projectTransactions'
import { loadProjectTrash, serializeProjectTrash } from '../runtime/projectTrash'
import { prepareRuntimeSceneTransition as prepareSceneTransition, type PreparedRuntimeSceneTransition } from '../runtime/runtimeSceneTransition'

interface PhysicsState {
  world: World
  camera: Camera
  selectedEntityId: number | null
  selectedEntityIds: number[]
  focusEntityID: number | null
  activeTool: 'select' | 'move' | 'rotate' | 'scale' | 'pivot' | 'rect' | 'path' | 'polygon' | 'collider' | 'measure' | 'rectangle' | 'circle' | 'triangle'
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
  groups?: string[]
  namedLayer?: string
  ownerUuid?: string | null
  ownership?: 'Scene' | 'Prefab' | 'Runtime'
  editorOnly?: boolean
  runtimePersistence?: 'Scene' | 'Session' | 'SaveGame' | 'Transient'
  persistentAcrossScenes?: boolean
  objectBlueprintAsset?: string | null
  prefabAsset?: string | null
  prefabInstanceUuid?: string | null
  prefabSourceUuid?: string | null
  prefabOverrides?: Record<string, unknown>
  prefabLayers?: Array<{ asset?: string; instanceUuid?: string; sourceUuid?: string; overrides?: Record<string, unknown> }>
  sceneLayers?: Array<{ asset?: string; instanceUuid?: string; sourceUuid?: string }>
  authoring?: Partial<AuthoringMetadata2D>
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
    collisionMatrix: defaultCollisionMatrix(),
    interpolation: 'Interpolate',
    layers: defaultPhysicsLayers(),
    profile: defaultPhysicsProfile()
  },
  simulationRunning: false,
  playMode: 'editing',
  engineDiagnostics: { ...rawWorld.diagnostics },
  inputMap: defaultInputMap(),
  audioSettings: defaultAudioSettings()
})

export const sceneManager = reactive(new SceneManager())

/** 约束重力、阻力、时间倍率及步进参数，规范化物理档案和固定长度无符号碰撞矩阵。 */ export function normalizeGlobalSettings(): void {
  physicsState.globalSettings.gravity = finiteNumber(physicsState.globalSettings.gravity, 9.8)
  physicsState.globalSettings.airFriction = Math.max(0, finiteNumber(physicsState.globalSettings.airFriction, 0.01))
  physicsState.globalSettings.timeScale = Math.max(0, finiteNumber(physicsState.globalSettings.timeScale, 1))
  physicsState.globalSettings.tickRate = Math.min(1000, Math.max(1, finiteNumber(physicsState.globalSettings.tickRate, 60)))
  physicsState.globalSettings.maxCatchUpSteps = Math.min(240, Math.max(1, Math.round(finiteNumber(physicsState.globalSettings.maxCatchUpSteps, 8))))
  physicsState.globalSettings.interpolation = physicsState.globalSettings.interpolation === 'None' ? 'None' : 'Interpolate'
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

/** 同步单选、选择列表和聚焦实体身份，传 null 时清空选择。 */ export function enterEditMode(id: number | null): void {
  physicsState.selectedEntityId = id
  physicsState.selectedEntityIds.splice(0, physicsState.selectedEntityIds.length, ...(id === null ? [] : [id]))
  physicsState.focusEntityID = id
}

/** 过滤不存在与重复实体，再按选择模式更新集合，并确定合法主选择。 */ export function selectEntities(ids: number[], mode: SelectionMode = 'replace', primaryId?: number | null): void {
  const valid = new Set(physicsState.world.entities.map(/* 返回 entity.id 的当前值。 */ entity => entity.id))
  const requested = [...new Set(ids)].filter(/* 调用 valid.has(id) 并返回调用结果。 */ id => valid.has(id))
  const next = updateSelection(physicsState.selectedEntityIds, requested, mode)
  physicsState.selectedEntityIds.splice(0, physicsState.selectedEntityIds.length, ...next)
  const preferred = primaryId !== undefined && primaryId !== null && next.includes(primaryId)
    ? primaryId
    : next[next.length - 1] ?? null
  physicsState.selectedEntityId = preferred
}

/** 按世界原有顺序返回当前选择身份对应的实体列表。 */ export function selectedEntities(): Entity[] {
  const ids = new Set(physicsState.selectedEntityIds)
  return physicsState.world.entities.filter(/* 调用 ids.has(entity.id) 并返回调用结果。 */ entity => ids.has(entity.id))
}

/** 按组件类型复制可持久化字段，脚本仅保存允许序列化的属性，附带组件身份及启用移除状态。 */ function serializeComponent(component: Component2D): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  if (component instanceof Transform) {
    data.parentUuid = component.parentUuid
    data.position = { ...component.position }
    data.rotation = component.rotation
    data.scale = { ...component.scale }
  } else if (component instanceof ShapeRenderer2D) {
    data.shape = component.shape
    data.vertices = component.vertices.map(/** 构造并返回记录 { ...vertex }，字段按当前实参及捕获状态求值。 */ vertex => ({ ...vertex }))
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
      material: component.material, filterMode: component.filterMode,
      normalMapAsset: component.normalMapAsset, lightMask: component.lightMask >>> 0,
      nineSlice: { ...component.nineSlice }
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
      pixelPerfect: component.pixelPerfect, zoom: component.zoom,
      smoothing: { ...component.smoothing }, limits: { ...component.limits },
      dragMargins: { ...component.dragMargins }, previewInEditor: component.previewInEditor,
      followTargetUuid: component.followTargetUuid,
      priority: component.priority, stackOrder: component.stackOrder,
      cullingMask: component.cullingMask >>> 0, clearColor: component.clearColor,
      renderTexture: component.renderTexture
    })
  } else if (component instanceof Script2D) {
    Object.assign(data, {
      scriptAsset: component.scriptAsset,
      eventSheetAsset: component.eventSheetAsset,
      objectBlueprintAsset: component.objectBlueprintAsset,
      properties: Object.fromEntries(Object.entries(component.properties).filter(/* 比较 component.propertyMetadata[name]?.serialized 与 false，返回严格不等的判断结果。 */ ([name]) => component.propertyMetadata[name]?.serialized !== false))
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
      freezeRotation: component.freezeRotation,
      transformOwnership: component.transformOwnership
    })
  } else if (component instanceof Collider2D) {
    Object.assign(data, {
      offset: { ...component.offset },
      rotation: component.rotation,
      size: { ...component.size },
      radiusX: component.radiusX,
      radiusY: component.radiusY,
      vertices: component.vertices.map(/** 构造并返回记录 { ...vertex }，字段按当前实参及捕获状态求值。 */ vertex => ({ ...vertex })),
      shapeModel: component.shapeModel,
      shapes: component.shapes.map(/** 构造并返回记录 { ...shape, offset: { ...shape.offset }, size: { ...shape.size }, points: shape.points.map(point => ({ ...point })) }，字段按当前实参及捕获状态求值。 */ shape => ({ ...shape, offset: { ...shape.offset }, size: { ...shape.size }, points: shape.points.map(/** 构造并返回记录 { ...point }，字段按当前实参及捕获状态求值。 */ point => ({ ...point })) })),
      sensor: component.sensor,
      physicsLayer: component.physicsLayer,
      collisionMask: component.collisionMask >>> 0,
      oneWay: component.oneWay,
      oneWayNormal: { ...component.oneWayNormal },
      materialAsset: component.materialAsset,
      material: { ...component.material }
    })
  } else {
    Object.assign(data, copyComponentValues(component))
  }
  return { uuid: component.uuid, kind: component.kind, enabled: component.enabled, removed: component.removed, data }
}

/** 规范化实体后生成持久化的创作数据。 */ export function serializeEntity(entity: Entity): Record<string, unknown> {
  normalizeEntity(entity)
  return entityAuthoringData(entity)
}

/** Detached authoring values for inspectors; does not normalize or mutate the entity. */
/** 深复制实体创作数据，向调用方提供不共享可变对象的读取快照。 */ export function readEntityAuthoringData(entity: Entity): Record<string, unknown> {
  return JSON.parse(JSON.stringify(entityAuthoringData(entity))) as Record<string, unknown>
}

/** 汇集实体身份、编辑属性、实例覆盖、创作元数据和组件记录，不含运行时数字身份。 */ function entityAuthoringData(entity: Entity): Record<string, unknown> {
  return {
    uuid: entity.uuid,
    name: entity.name,
    enabled: entity.enabled,
    editorVisible: entity.editorVisible,
    editorLocked: entity.editorLocked,
    tags: [...entity.tags],
    groups: [...entity.groups],
    namedLayer: entity.namedLayer,
    ownerUuid: entity.ownerUuid,
    ownership: entity.ownership,
    editorOnly: entity.editorOnly,
    runtimePersistence: entity.runtimePersistence,
    persistentAcrossScenes: entity.persistentAcrossScenes,
    objectBlueprintAsset: entity.objectBlueprintAsset ?? entity.script2D?.objectBlueprintAsset ?? null,
    prefabAsset: entity.prefabAsset,
    prefabInstanceUuid: entity.prefabInstanceUuid,
    prefabSourceUuid: entity.prefabSourceUuid,
    prefabOverrides: JSON.parse(JSON.stringify(entity.prefabOverrides)) as Record<string, unknown>,
    prefabLayers: JSON.parse(JSON.stringify(entity.prefabLayers)) as typeof entity.prefabLayers,
    sceneLayers: JSON.parse(JSON.stringify(entity.sceneLayers)) as typeof entity.sceneLayers,
    authoring: JSON.parse(JSON.stringify(entity.authoring)) as AuthoringMetadata2D,
    entityType: entity.entityType,
    components: [...entity.componentMap.values()].map(serializeComponent)
  }
}

/** 规范化设置并捕获活动场景实体、图层和连接，将连接实体数字身份转换为稳定引用。 */ function serializeActiveScene(): Record<string, unknown> {
  normalizeGlobalSettings()
  const entitiesById = new Map(physicsState.world.entities.map(/* 返回按声明顺序构造的数组 [entity.id, entity]。 */ entity => [entity.id, entity]))
  return {
    layers: [...editorState.layers],
    activeLayer: editorState.activeLayer,
    renderLayer: editorState.renderLayer,
    globalSettings: {
      ...physicsState.globalSettings,
      collisionMatrix: [...physicsState.globalSettings.collisionMatrix],
      layers: physicsState.globalSettings.layers.map(/** 构造并返回记录 { ...layer }，字段按当前实参及捕获状态求值。 */ layer => ({ ...layer })),
      profile: { ...physicsState.globalSettings.profile }
    },
    entities: physicsState.world.entities.map(serializeEntity),
    connections: physicsState.world.connections.map(/** 复制连接持久化字段并去除运行身份，将无限断裂阈值编码为空值以供存储。 */ connection => {
      const { id: _runtimeId, ...stored } = connection
      void _runtimeId
      return {
      ...stored,
      breakForce: Number.isFinite(connection.breakForce) ? connection.breakForce : null,
      breakTorque: Number.isFinite(connection.breakTorque) ? connection.breakTorque : null,
      anchors: connection.anchors.map(/** 用实体稳定身份替换锚点运行身份，并复制局部位置。 */ anchor => {
        const { entityId, ...storedAnchor } = anchor
        return { ...storedAnchor, entityUuid: entitiesById.get(entityId)?.uuid, localPoint: { ...anchor.localPoint } }
      }),
      restLengths: [...connection.restLengths],
      manualSegments: connection.manualSegments.map(/* 调用 segment.map(point => ({ ...point })) 并返回调用结果。 */ segment => segment.map(/** 构造并返回记录 { ...point }，字段按当前实参及捕获状态求值。 */ point => ({ ...point }))),
      ropeNodes: connection.ropeNodes.map(/** 构造并返回记录 { position: { ...node.position }, velocity: { ...node.velocity } }，字段按当前实参及捕获状态求值。 */ node => ({ position: { ...node.position }, velocity: { ...node.velocity } }))
    }} )
  }
}

/** 捕获当前场景并同步资源依赖元数据，汇集可保存的项目版本、资源、设置、回收站和所有场景。 */ function projectSource(): Record<string, unknown> {
  // serializeActiveScene creates persistence-owned component/metadata values,
  // including copies of global arrays. Avoid cloning that complete fresh tree
  // again before canonical serialization.
  sceneManager.captureActive(serializeActiveScene(), false)
  const scenes = sceneManager.serialize()
  synchronizeAssetDependencyMetadata({ scenes })
  return {
    projectFormat: NOVA_PROJECT_FORMAT,
    projectFormatMajor: NOVA_PROJECT_FORMAT_MAJOR,
    formatVersion: physicsState.world.projectFormatVersion,
    engineVersion: physicsState.world.projectEngineVersion,
    compatibility: projectCompatibility(),
    projectMetadata: serializeProjectMetadata(),
    manifest: serializeProjectManifest(),
    assets: serializeAssets(),
    assetFolders: serializeAssetFolders(),
    assetDatabase: serializeAssetDatabaseSettings(),
    plugins: serializePluginManifests(),
    packages: serializePackageState(),
    projectTrash: serializeProjectTrash(),
    projectSettings: { inputMap: normalizeInputMap(physicsState.inputMap), deviceInput: serializeDeviceInputSettings(), audio: normalizeAudioSettings(physicsState.audioSettings), physics: serializePhysicsProjectSettings(), build: serializeBuildSettings(sceneManager.scenes.map(/* 返回 scene.uuid 的当前值。 */ scene => scene.uuid)), scripting: serializeScriptSettings(), rendering: serializeRenderingSettings(), world: serializeWorldGameplaySettings(), presentation: { localization: serializeLocalizationSettings(), accessibility: serializeRuntimeAccessibilitySettings(), uiAudio: serializeUiAudioSettings() }, production: serializeProductionSettings() },
    projectStructure: {
      assetsRoot: 'Assets', settingsRoot: 'ProjectSettings', cacheRoot: '.nova/cache', importedRoot: '.nova/imported'
    },
    activeSceneUuid: sceneManager.activeSceneUuid,
    scenes
  }
}

/* 调用 canonicalProjectText(projectSource()) 并返回调用结果。 */ export function getSceneJSON(): string {
  // projectSource is already normalized to the current schema. Passing it
  // through the migration boundary would parse and allocate the complete
  // document twice more, which is particularly costly for 10k-object scenes.
  return canonicalProjectText(projectSource())
}

const ASSET_COMPONENT_FIELDS: Partial<Record<ComponentKind, string[]>> = {
  ShapeRenderer2D: ['textureAsset'],
  SpriteRenderer2D: ['spriteAsset', 'normalMapAsset'],
  TextRenderer2D: ['fontAsset'],
  Script2D: ['scriptAsset', 'eventSheetAsset', 'objectBlueprintAsset'],
  Animator: ['controllerAsset'],
  Skeleton2D: ['rigAsset', 'skinAsset'],
  TimelinePlayer: ['timelineAsset'],
  AudioSource: ['audioClip'],
  Canvas: ['themeAsset'],
  Image: ['spriteAsset'],
  Text: ['fontAsset'],
  TileMap2D: ['tileSetAsset'],
  BehaviorTree2D: ['treeAsset'],
  StateMachine2D: ['machineAsset'],
  Spawner2D: ['prefabAsset'],
  ObjectPool2D: ['prefabAsset'],
  ParticleEmitter2D: ['particleSystemAsset', 'textureAsset', 'material']
}

/* 先计算 value === uuid；仅当其为假值时求右侧 value === `asset://${uuid}`，返回短路求值结果。 */ function matchesAssetReference(value: unknown, uuid: string): boolean {
  return value === uuid || value === `asset://${uuid}`
}

/** 遍历存储场景实体及已知组件资源字段，统计引用并按需替换，变更预制体引用时清除实例覆盖。 */ function visitStoredAssetReferences(scene: Record<string, unknown>, uuid: string, clear: boolean, replacementUuid?: string): number {
  if (!Array.isArray(scene.entities)) return 0
  let count = 0
  const replacement = replacementUuid ? `asset://${replacementUuid}` : null
  for (const entity of scene.entities) {
    if (!entity || typeof entity !== 'object' || !Array.isArray((entity as SceneEntityData).components)) continue
    const storedEntity = entity as SceneEntityData
    if (matchesAssetReference(storedEntity.objectBlueprintAsset, uuid)) {
      count++
      if (clear) storedEntity.objectBlueprintAsset = replacement
    }
    if (matchesAssetReference(storedEntity.prefabAsset, uuid)) {
      count++
      if (clear) {
        storedEntity.prefabAsset = replacement
        storedEntity.prefabInstanceUuid = null
        storedEntity.prefabSourceUuid = null
        storedEntity.prefabOverrides = {}
      }
    }
    for (const rawComponent of storedEntity.components ?? []) {
      if (!rawComponent || typeof rawComponent !== 'object') continue
      const component = rawComponent as { kind?: ComponentKind; data?: Record<string, unknown> }
      const fields = component.kind ? ASSET_COMPONENT_FIELDS[component.kind] : undefined
      if (!fields || !component.data) continue
      for (const field of fields) if (matchesAssetReference(component.data[field], uuid)) {
        count++
        if (clear) component.data[field] = replacement
      }
    }
  }
  return count
}

/** 遍历活动世界实体及已知组件资源字段，统计或替换资源引用，重置受影响预制体绑定。 */ function visitLiveAssetReferences(uuid: string, clear: boolean, replacementUuid?: string): number {
  let count = 0
  const replacement = replacementUuid ? `asset://${replacementUuid}` : null
  for (const entity of physicsState.world.entities) {
    if (matchesAssetReference(entity.objectBlueprintAsset, uuid)) {
      count++
      if (clear) entity.objectBlueprintAsset = replacement
    }
    if (matchesAssetReference(entity.prefabAsset, uuid)) {
      count++
      if (clear) {
        entity.prefabAsset = replacement
        entity.prefabInstanceUuid = null
        entity.prefabSourceUuid = null
        entity.prefabOverrides = {}
      }
    }
    for (const component of entity.componentMap.values()) {
      const fields = ASSET_COMPONENT_FIELDS[component.kind]
      if (!fields) continue
      for (const field of fields) if (matchesAssetReference((component as unknown as Record<string, unknown>)[field], uuid)) {
        count++
        if (clear) (component as unknown as Record<string, unknown>)[field] = replacement
      }
    }
  }
  return count
}

/** 解析动画、控制器和瓦片集文本，递归统计或替换目标资源引用，仅写回有变化的有效文档。 */ function visitDocumentAssetReferences(uuid: string, clear: boolean, replacementUuid?: string): number {
  let count = 0
  const target = `asset://${uuid}`
  const replacement = replacementUuid ? `asset://${replacementUuid}` : null
  const visit = /** 递归遍历数组和对象，识别裸身份或资源地址并统计，修改模式下替换匹配值。 */ (value: unknown): unknown => {
    if (value === uuid || value === target) { count++; return clear ? replacement : value }
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
/** 汇总活动世界、非活动场景以及支持的资源文档中的目标引用数量。 */ export function countAssetReferences(uuid: string): number {
  let count = visitLiveAssetReferences(uuid, false)
  for (const scene of sceneManager.scenes) {
    if (scene.uuid !== sceneManager.activeSceneUuid) count += visitStoredAssetReferences(scene.data, uuid, false)
  }
  return count + visitDocumentAssetReferences(uuid, false)
}

/** Clears an asset reference everywhere so deleting an asset cannot leave a broken scene. */
/** 清空活动世界、非活动场景和支持文档中的目标资源引用，返回修改次数。 */ export function clearAssetReferences(uuid: string): number {
  let count = visitLiveAssetReferences(uuid, true)
  for (const scene of sceneManager.scenes) {
    if (scene.uuid !== sceneManager.activeSceneUuid) count += visitStoredAssetReferences(scene.data, uuid, true)
  }
  return count + visitDocumentAssetReferences(uuid, true)
}

/** Replaces a missing GUID in live, unloaded-scene, and editor-document references. */
/** 校验新旧资源身份后在活动世界、非活动场景与支持文档中替换引用并汇总数量。 */ export function replaceAssetReferences(uuid: string, replacementUuid: string): number {
  if (!uuid || !replacementUuid || uuid === replacementUuid) return 0
  let count = visitLiveAssetReferences(uuid, true, replacementUuid)
  for (const scene of sceneManager.scenes) {
    if (scene.uuid !== sceneManager.activeSceneUuid) count += visitStoredAssetReferences(scene.data, uuid, true, replacementUuid)
  }
  return count + visitDocumentAssetReferences(uuid, true, replacementUuid)
}

/** 仅从对象读取有限坐标值写入目标向量，非法分量沿用原坐标。 */ function copyVector(target: { x: number; y: number }, source: unknown): void {
  if (!source || typeof source !== 'object') return
  const vector = source as { x?: unknown; y?: unknown }
  target.x = finiteNumber(vector.x, target.x)
  target.y = finiteNumber(vector.y, target.y)
}

/* 调用 Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, Math.round(finiteNumber(value, fallback)))) 并返回调用结果。 */ function normalizeIdentifier(value: unknown, fallback = 1): number {
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, Math.round(finiteNumber(value, fallback))))
}

const SCALAR_ENTITY_PROPERTIES = [
  'layer', 'density', 'restitutionThreshold', 'transparency', 'angularVelocity',
  'linearDamping', 'angularDamping', 'mass', 'inertia', 'gravityScale', 'torque',
  'gravity', 'restitution', 'staticFriction', 'dynamicFriction'
] as const

const BOOLEAN_ENTITY_PROPERTIES = ['autoInertia', 'isSensor', 'isStatic', 'isKinematic'] as const

/** 要求最小顶点数并限制读取长度，保留一个超限哨兵点供物理准备明确报错。 */ function normalizedVertices(vertices: SceneEntityData['vertices'], minimum = 3): Array<{ x: number; y: number }> | null {
  if (!Array.isArray(vertices) || vertices.length < minimum) return null
  // Preserve a bounded one-point-over-limit sentinel. Physics preparation can
  // then produce an explicit diagnostic instead of silently truncating while
  // hostile multi-million-point payloads never reach quadratic validation.
  return vertices.slice(0, MAX_AUTHORED_COLLIDER_POINTS + 1).map(/** 构造并返回记录 { x: finiteNumber(vertex.x, 0), y: finiteNumber(vertex.y, 0) }，字段按当前实参及捕获状态求值。 */ vertex => ({ x: finiteNumber(vertex.x, 0), y: finiteNumber(vertex.y, 0) }))
}

/** 按组件类型查找存储实体的首个组件记录。 */ function storedComponent(item: SceneEntityData, kind: ComponentKind): SceneComponentData | undefined {
  return item.components?.find(/* 比较 component.kind 与 kind，返回严格相等的判断结果。 */ component => component.kind === kind)
}

/** 优先使用实体类型，再由渲染器几何推断基础形状，最后兼容旧形状或名称字段。 */ function storedShapeType(item: SceneEntityData): string | undefined {
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

/** 按存储形状构造圆、矩形或三角形实体，兼容旧顶点数据，不支持类型抛错。 */ function createShapeEntity(item: SceneEntityData, id: number, position: { x: number; y: number }): Entity {
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

/* 根据 component?.data && typeof component.data === 'object' 的真假，分别返回 component.data 或 {}。 */ function recordData(component: SceneComponentData | undefined): Record<string, unknown> {
  return component?.data && typeof component.data === 'object' ? component.data : {}
}

/** 恢复启用与移除标记，已移除组件始终禁用。 */ function applyComponentMetadata(target: { enabled: boolean; removed: boolean }, source: SceneComponentData): void {
  target.enabled = source.enabled !== false
  target.removed = source.removed === true
  if (target.removed) target.enabled = false
}

const EXTENDED_COMPONENT_KINDS = [
  'Animator', 'Skeleton2D', 'TimelinePlayer', 'AudioSource', 'AudioListener', 'Canvas', 'RectTransform', 'Panel', 'Image',
  'Text', 'Button', 'Slider', 'ProgressBar', 'Checkbox', 'TextInput', 'TileMap2D', 'ParticleEmitter2D', 'Light2D', 'ShadowCaster2D',
  'CharacterBody2D', 'Area2D', 'AreaEffector2D', 'NavigationRegion2D', 'NavigationObstacle2D', 'NavigationAgent2D', 'BehaviorTree2D', 'StateMachine2D',
  'GridMover2D', 'PlatformController2D', 'TopDownController2D', 'Health2D', 'DamageHitbox2D', 'Collectible2D', 'Projectile2D', 'Spawner2D', 'Cooldown2D', 'Lifetime2D', 'MouseFollower2D', 'CameraFollow2D',
  'WorldChunk2D', 'Portal2D', 'ObjectPool2D',
  'FixedJoint2D', 'WeldJoint2D', 'DistanceJoint2D', 'RopeJoint2D', 'RevoluteJoint2D', 'MotorJoint2D', 'PrismaticJoint2D', 'SpringJoint2D'
] as const

/** 按扩展组件类型构造对应实例，未命中已列类型时交给关节组件构造器。 */ function createExtendedComponent(kind: typeof EXTENDED_COMPONENT_KINDS[number], uuid?: string): Component2D {
  if (kind === 'Animator') return new Animator(uuid)
  if (kind === 'Skeleton2D') return new Skeleton2D(uuid)
  if (kind === 'TimelinePlayer') return new TimelinePlayer(uuid)
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
  if (kind === 'CharacterBody2D') return new CharacterBody2D(uuid)
  if (kind === 'Area2D') return new Area2D(uuid)
  if (kind === 'AreaEffector2D') return new AreaEffector2D(uuid)
  if (kind === 'NavigationRegion2D') return new NavigationRegion2D(uuid)
  if (kind === 'NavigationObstacle2D') return new NavigationObstacle2D(uuid)
  if (kind === 'NavigationAgent2D') return new NavigationAgent2D(uuid)
  if (kind === 'BehaviorTree2D') return new BehaviorTree2D(uuid)
  if (kind === 'StateMachine2D') return new StateMachine2D(uuid)
  if (kind === 'GridMover2D') return new GridMover2D(uuid)
  if (kind === 'PlatformController2D') return new PlatformController2D(uuid)
  if (kind === 'TopDownController2D') return new TopDownController2D(uuid)
  if (kind === 'Health2D') return new Health2D(uuid)
  if (kind === 'DamageHitbox2D') return new DamageHitbox2D(uuid)
  if (kind === 'Collectible2D') return new Collectible2D(uuid)
  if (kind === 'Projectile2D') return new Projectile2D(uuid)
  if (kind === 'Spawner2D') return new Spawner2D(uuid)
  if (kind === 'Cooldown2D') return new Cooldown2D(uuid)
  if (kind === 'Lifetime2D') return new Lifetime2D(uuid)
  if (kind === 'MouseFollower2D') return new MouseFollower2D(uuid)
  if (kind === 'CameraFollow2D') return new CameraFollow2D(uuid)
  if (kind === 'WorldChunk2D') return new WorldChunk2D(uuid)
  if (kind === 'Portal2D') return new Portal2D(uuid)
  if (kind === 'ObjectPool2D') return new ObjectPool2D(uuid)
  if (kind === 'ParticleEmitter2D') return new ParticleEmitter2D(uuid)
  if (kind === 'Light2D') return new Light2D(uuid)
  if (kind === 'ShadowCaster2D') return new ShadowCaster2D(uuid)
  return new Joint2D(kind, uuid)
}

/* 调用 Math.min(maximum, Math.max(minimum, finiteNumber(value, fallback))) 并返回调用结果。 */ function clamp(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, finiteNumber(value, fallback)))
}

/** 将任意输入转换为有限二维坐标，缺失或非法分量使用回退值。 */ function safeVector(value: unknown, fallback: { x: number; y: number }): { x: number; y: number } {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return { x: finiteNumber(source.x, fallback.x), y: finiteNumber(source.y, fallback.y) }
}

/** 把输入颜色转换为零至二百五十五的整数通道，缺失或非法值使用默认颜色。 */ function safeColor(value: unknown, fallback: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    r: Math.round(clamp(source.r, fallback.r, 0, 255)),
    g: Math.round(clamp(source.g, fallback.g, 0, 255)),
    b: Math.round(clamp(source.b, fallback.b, 0, 255))
  }
}

/** 仅保留允许覆盖的样式字段，限制字符串长度并剔除非有限数值。 */ function safeStyleOverrides(value: unknown): Record<string, string | number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const allowed = new Set(['background', 'foreground', 'border', 'borderWidth', 'cornerRadius', 'fontSize', 'fontWeight', 'opacity'])
  const result: Record<string, string | number> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!allowed.has(key)) continue
    if (typeof raw === 'string') result[key] = raw.slice(0, 80)
    else if (typeof raw === 'number' && Number.isFinite(raw)) result[key] = raw
  }
  return result
}

/** 按实际扩展组件类型限制数值、列表、文本和枚举，恢复缺省结构并失效需要重建的瓦片缓存。 */ function normalizeExtendedComponent(component: Component2D): void {
  if (component instanceof Animator) {
    component.controllerAsset = typeof component.controllerAsset === 'string' ? component.controllerAsset : null
    component.speed = clamp(component.speed, 1, -100, 100)
    component.currentState = typeof component.currentState === 'string' ? component.currentState.slice(0, 80) : ''
    const parameters: Record<string, boolean | number> = {}
    if (component.parameters && typeof component.parameters === 'object') for (const [name, value] of Object.entries(component.parameters).slice(0, 256)) {
      if (typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) parameters[name.slice(0, 80)] = value
    }
    component.parameters = parameters
    const layerWeights: Record<string, number> = {}
    if (component.layerWeights && typeof component.layerWeights === 'object') for (const [name, value] of Object.entries(component.layerWeights).slice(0, 32)) {
      layerWeights[name.slice(0, 80)] = clamp(value, 1, 0, 1)
    }
    component.layerWeights = layerWeights
  } else if (component instanceof Skeleton2D) {
    component.rigAsset = typeof component.rigAsset === 'string' ? component.rigAsset : null
    component.skinAsset = typeof component.skinAsset === 'string' ? component.skinAsset : null
    component.pose = (Array.isArray(component.pose) ? component.pose : []).slice(0, 512).flatMap(/** 保留有骨骼身份的姿态记录，限制身份长度并规范化位置、旋转和缩放。 */ value => {
      if (!value || typeof value.boneId !== 'string') return []
      return [{ boneId: value.boneId.slice(0, 80), position: safeVector(value.position, { x: 0, y: 0 }), rotation: finiteNumber(value.rotation), scale: safeVector(value.scale, { x: 1, y: 1 }) }]
    })
  } else if (component instanceof TimelinePlayer) {
    component.timelineAsset = typeof component.timelineAsset === 'string' ? component.timelineAsset : null
    component.speed = clamp(component.speed, 1, -100, 100)
    component.currentTime = clamp(component.currentTime, 0, 0, 86_400)
  } else if (component instanceof AudioSource) {
    component.audioClip = typeof component.audioClip === 'string' ? component.audioClip : null
    component.volume = clamp(component.volume, 1, 0, 1); component.pitch = clamp(component.pitch, 1, .25, 4)
    component.spatialBlend = clamp(component.spatialBlend, 0, 0, 1); component.minDistance = clamp(component.minDistance, 1, 0, 1e9)
    component.maxDistance = clamp(component.maxDistance, 50, component.minDistance + 1e-6, 1e9)
    component.bus = typeof component.bus === 'string' && component.bus.trim() ? component.bus.trim().slice(0, 80) : 'SFX'
    if (!['Linear', 'Inverse', 'Exponential', 'Custom'].includes(component.attenuationCurve)) component.attenuationCurve = 'Linear'
    component.voicePriority = Math.round(clamp(component.voicePriority, 50, 0, 255))
    if (!['ImportSetting', 'Stream', 'Buffer'].includes(component.streamOverride)) component.streamOverride = 'ImportSetting'
    component.customAttenuation = (Array.isArray(component.customAttenuation) ? component.customAttenuation : []).slice(0, 64).map(/** 构造并返回记录 { distance: clamp(point?.distance, 0, 0, 1), gain: clamp(point?.gain, 1, 0, 1) }，字段按当前实参及捕获状态求值。 */ point => ({ distance: clamp(point?.distance, 0, 0, 1), gain: clamp(point?.gain, 1, 0, 1) })).sort(/* 计算表达式 a.distance - b.distance 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a.distance - b.distance)
    if (component.customAttenuation.length < 2) component.customAttenuation = [{ distance: 0, gain: 1 }, { distance: 1, gain: 0 }]
  } else if (component instanceof Canvas) {
    component.referenceSize = safeVector(component.referenceSize, { x: 1920, y: 1080 })
    component.referenceSize.x = clamp(component.referenceSize.x, 1920, 1, 100_000)
    component.referenceSize.y = clamp(component.referenceSize.y, 1080, 1, 100_000)
    component.sortingOrder = Math.round(clamp(component.sortingOrder, 0, -1_000_000, 1_000_000))
    component.dpiScale = clamp(component.dpiScale, 1, .25, 8)
    component.localePreview = typeof component.localePreview === 'string' ? component.localePreview.slice(0, 35) : ''
    if (!component.safeAreaInsets || typeof component.safeAreaInsets !== 'object') component.safeAreaInsets = { left: 0, top: 0, right: 0, bottom: 0 }
    for (const side of ['left', 'top', 'right', 'bottom'] as const) component.safeAreaInsets[side] = clamp(component.safeAreaInsets[side], 0, 0, 100_000)
    component.themeAsset = typeof component.themeAsset === 'string' ? component.themeAsset.slice(0, 160) : null
    component.themeVariant = typeof component.themeVariant === 'string' && component.themeVariant.trim() ? component.themeVariant.trim().slice(0, 80) : 'default'
  } else if (component instanceof RectTransform) {
    if (!['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right', 'stretch'].includes(component.anchorPreset)) component.anchorPreset = 'center'
    component.pivot = safeVector(component.pivot, { x: .5, y: .5 }); component.position = safeVector(component.position, { x: 0, y: 0 }); component.size = safeVector(component.size, { x: 240, y: 80 }); component.preferredSize = safeVector(component.preferredSize, component.size); component.anchorMin = safeVector(component.anchorMin, { x: .5, y: .5 }); component.anchorMax = safeVector(component.anchorMax, { x: .5, y: .5 })
    component.pivot.x = clamp(component.pivot.x, .5, 0, 1); component.pivot.y = clamp(component.pivot.y, .5, 0, 1)
    component.anchorMin.x = clamp(component.anchorMin.x, .5, 0, 1); component.anchorMin.y = clamp(component.anchorMin.y, .5, 0, 1); component.anchorMax.x = clamp(component.anchorMax.x, .5, component.anchorMin.x, 1); component.anchorMax.y = clamp(component.anchorMax.y, .5, component.anchorMin.y, 1)
    component.size.x = clamp(component.size.x, 240, 0, 1e9); component.size.y = clamp(component.size.y, 80, 0, 1e9)
    component.preferredSize.x = clamp(component.preferredSize.x, component.size.x, 0, 1e9); component.preferredSize.y = clamp(component.preferredSize.y, component.size.y, 0, 1e9)
    if (!component.margins || typeof component.margins !== 'object') component.margins = { left: 0, top: 0, right: 0, bottom: 0 }
    for (const side of ['left', 'top', 'right', 'bottom'] as const) component.margins[side] = finiteNumber(component.margins[side])
    if (!component.offsets || typeof component.offsets !== 'object') component.offsets = { left: 0, top: 0, right: 0, bottom: 0 }
    for (const side of ['left', 'top', 'right', 'bottom'] as const) component.offsets[side] = finiteNumber(component.offsets[side])
    if (!['Fixed', 'Fill', 'Content'].includes(component.horizontalPolicy)) component.horizontalPolicy = 'Fixed'
    if (!['Fixed', 'Fill', 'Content'].includes(component.verticalPolicy)) component.verticalPolicy = 'Fixed'
    component.minSize = safeVector(component.minSize, { x: 0, y: 0 }); component.maxSize = safeVector(component.maxSize, { x: 100_000, y: 100_000 })
    component.minSize.x = clamp(component.minSize.x, 0, 0, 1e9); component.minSize.y = clamp(component.minSize.y, 0, 0, 1e9)
    component.maxSize.x = clamp(component.maxSize.x, 100_000, component.minSize.x, 1e9); component.maxSize.y = clamp(component.maxSize.y, 100_000, component.minSize.y, 1e9)
    component.aspectRatio = clamp(component.aspectRatio, 0, 0, 1e6)
    if (!['None', 'Fit', 'WidthControlsHeight', 'HeightControlsWidth'].includes(component.aspectConstraint)) component.aspectConstraint = 'None'
    component.breakpoints = (Array.isArray(component.breakpoints) ? component.breakpoints : []).slice(0, 32).map(/** 限制响应断点宽度并恢复可见性与布局坐标，缺失位置尺寸采用当前组件值。 */ point => ({ minWidth: clamp(point?.minWidth, 0, 0, 100_000), maxWidth: clamp(point?.maxWidth, 100_000, 0, 100_000), visible: point?.visible !== false, position: safeVector(point?.position, component.position), size: safeVector(point?.size, component.size) })).filter(/* 比较 point.maxWidth 与 point.minWidth，返回大于或等于的判断结果。 */ point => point.maxWidth >= point.minWidth)
    component.tabIndex = Math.round(clamp(component.tabIndex, 0, -1, 100_000)); component.remapBindingIndex = Math.round(clamp(component.remapBindingIndex, 0, 0, 31))
    for (const key of ['focusUp', 'focusDown', 'focusLeft', 'focusRight'] as const) component[key] = typeof component[key] === 'string' && component[key] ? component[key]!.slice(0, 160) : null
    component.accessibilityRole = typeof component.accessibilityRole === 'string' ? component.accessibilityRole.slice(0, 80) : ''
    component.accessibilityLabel = typeof component.accessibilityLabel === 'string' ? component.accessibilityLabel.slice(0, 500) : ''
    component.accessibilityDescription = typeof component.accessibilityDescription === 'string' ? component.accessibilityDescription.slice(0, 1000) : ''
    component.accessibilityState = typeof component.accessibilityState === 'string' ? component.accessibilityState.slice(0, 500) : ''
    component.accessibilityValue = typeof component.accessibilityValue === 'string' ? component.accessibilityValue.slice(0, 500) : ''
    if (!['Off', 'Polite', 'Assertive'].includes(component.accessibilityLive)) component.accessibilityLive = 'Off'
    component.readingOrder = Math.round(clamp(component.readingOrder, component.tabIndex, 0, 100_000))
    component.remapAction = typeof component.remapAction === 'string' ? component.remapAction.slice(0, 80) : ''
  } else if (component instanceof Panel) {
    component.color = safeColor(component.color, { r: 35, g: 41, b: 52 })
    component.opacity = clamp(component.opacity, 92, 0, 100); component.cornerRadius = clamp(component.cornerRadius, 14, 0, 1e6)
    if (!['None', 'Row', 'Column', 'Grid', 'Flow', 'Overlay', 'Center', 'Margin', 'Aspect', 'Split', 'Horizontal', 'Vertical'].includes(component.layout)) component.layout = 'None'
    component.gap = clamp(component.gap, 8, 0, 1e6); component.columns = Math.round(clamp(component.columns, 2, 1, 64)); component.scrollSpeed = clamp(component.scrollSpeed, 42, 0, 1e6)
    if (!component.padding || typeof component.padding !== 'object') component.padding = { left: 0, top: 0, right: 0, bottom: 0 }
    for (const side of ['left', 'top', 'right', 'bottom'] as const) component.padding[side] = finiteNumber(component.padding[side])
    component.scrollOffset = safeVector(component.scrollOffset, { x: 0, y: 0 }); component.contentSize = safeVector(component.contentSize, { x: 0, y: 0 })
    if (!['Normal', 'Modal', 'Popup', 'Tooltip'].includes(component.behavior)) component.behavior = 'Normal'
    component.dropGroup = typeof component.dropGroup === 'string' ? component.dropGroup.slice(0, 80) : ''
    component.tooltipText = typeof component.tooltipText === 'string' ? component.tooltipText.slice(0, 2000) : ''
    component.tooltipDelay = clamp(component.tooltipDelay, .45, 0, 10)
    component.styleClass = typeof component.styleClass === 'string' ? component.styleClass.slice(0, 80) : 'panel'
    component.styleOverrides = safeStyleOverrides(component.styleOverrides)
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
    component.localizationKey = typeof component.localizationKey === 'string' ? component.localizationKey.slice(0, 240) : ''
    if (!component.localizationVariables || typeof component.localizationVariables !== 'object' || Array.isArray(component.localizationVariables)) component.localizationVariables = {}
  } else if (component instanceof Button) {
    component.normalColor = safeColor(component.normalColor, { r: 45, g: 106, b: 214 }); component.hoveredColor = safeColor(component.hoveredColor, { r: 61, g: 126, b: 235 }); component.pressedColor = safeColor(component.pressedColor, { r: 31, g: 82, b: 174 }); component.disabledColor = safeColor(component.disabledColor, { r: 90, g: 97, b: 110 })
    component.state = component.interactable ? 'Normal' : 'Disabled'
    component.onPressed = typeof component.onPressed === 'string' ? component.onPressed.slice(0, 80) : 'on_pressed'; component.onHoverEnter = typeof component.onHoverEnter === 'string' ? component.onHoverEnter.slice(0, 80) : 'on_hover_enter'; component.onHoverExit = typeof component.onHoverExit === 'string' ? component.onHoverExit.slice(0, 80) : 'on_hover_exit'
    component.pressAudio = typeof component.pressAudio === 'string' ? component.pressAudio.slice(0, 160) : null; component.hoverAudio = typeof component.hoverAudio === 'string' ? component.hoverAudio.slice(0, 160) : null; component.focusAudio = typeof component.focusAudio === 'string' ? component.focusAudio.slice(0, 160) : null
    component.styleClass = typeof component.styleClass === 'string' ? component.styleClass.slice(0, 80) : 'button'
    component.styleOverrides = safeStyleOverrides(component.styleOverrides)
  } else if (component instanceof Slider || component instanceof ProgressBar) {
    component.min = finiteNumber(component.min); component.max = Math.max(component.min + 1e-9, finiteNumber(component.max, 1)); component.value = clamp(component.value, .5, component.min, component.max)
    if (component instanceof ProgressBar) { component.fillColor = safeColor(component.fillColor, { r: 79, g: 150, b: 255 }); component.backgroundColor = safeColor(component.backgroundColor, { r: 31, g: 37, b: 47 }) }
    component.styleClass = typeof component.styleClass === 'string' ? component.styleClass.slice(0, 80) : component instanceof ProgressBar ? 'progress' : 'slider'
    component.styleOverrides = safeStyleOverrides(component.styleOverrides)
  } else if (component instanceof Checkbox) {
    component.label = typeof component.label === 'string' ? component.label.slice(0, 1000) : 'Checkbox'
    component.localizationKey = typeof component.localizationKey === 'string' ? component.localizationKey.slice(0, 240) : ''
    component.styleClass = typeof component.styleClass === 'string' ? component.styleClass.slice(0, 80) : 'checkbox'; component.styleOverrides = safeStyleOverrides(component.styleOverrides)
  } else if (component instanceof TextInput) {
    component.value = typeof component.value === 'string' ? truncateUtf16(component.value, 100_000) : ''
    component.placeholder = typeof component.placeholder === 'string' ? component.placeholder.slice(0, 1000) : ''
    component.maxLength = Math.round(clamp(component.maxLength, 256, 0, 100_000)); component.value = truncateUtf16(component.value, component.maxLength)
    component.styleClass = typeof component.styleClass === 'string' ? component.styleClass.slice(0, 80) : 'input'; component.styleOverrides = safeStyleOverrides(component.styleOverrides)
  } else if (component instanceof TileMap2D) {
    normalizeTileMap(component)
    invalidateTileMap(component)
  } else if (component instanceof CharacterBody2D) {
    component.maxSlopeAngle = clamp(component.maxSlopeAngle, 45, 0, 89.9); component.stepHeight = clamp(component.stepHeight, .35, 0, 1e6)
    component.floorSnap = clamp(component.floorSnap, .15, 0, 1e6); component.safeMargin = clamp(component.safeMargin, .001, 1e-9, 1e3)
    component.maxSlides = Math.round(clamp(component.maxSlides, 4, 1, 32)); component.coyoteTime = clamp(component.coyoteTime, .12, 0, 60)
    component.collisionMask = Math.round(clamp(component.collisionMask, 0xffff_ffff, 0, 0xffff_ffff)) >>> 0
  } else if (component instanceof Area2D) {
    component.size = safeVector(component.size, { x: 4, y: 4 }); component.size.x = clamp(component.size.x, 4, 1e-6, 1e9); component.size.y = clamp(component.size.y, 4, 1e-6, 1e9)
    component.radius = clamp(component.radius, 2, 1e-6, 1e9); component.collisionMask = Math.round(clamp(component.collisionMask, 0xffff_ffff, 0, 0xffff_ffff)) >>> 0
    if (!['Box', 'Circle'].includes(component.shape)) component.shape = 'Box'
  } else if (component instanceof AreaEffector2D) {
    component.priority = Math.round(clamp(component.priority, 0, -10_000, 10_000)); component.effectors = (Array.isArray(component.effectors) ? component.effectors : []).slice(0, 32).map(/** 规范化区域效果类型、身份、方向和受力参数，非法类型回退为信号效果。 */ (effect, index) => ({
      id: typeof effect.id === 'string' ? effect.id.slice(0, 80) : `effect-${index}`, kind: ['Gravity', 'Wind', 'Drag', 'Buoyancy', 'Damage', 'Signal'].includes(effect.kind) ? effect.kind : 'Signal',
      enabled: effect.enabled !== false, direction: safeVector(effect.direction, { x: 0, y: -1 }), strength: finiteNumber(effect.strength), drag: clamp(effect.drag, 0, 0, 1e9),
      fluidDensity: clamp(effect.fluidDensity, 1, 0, 1e9), damagePerSecond: clamp(effect.damagePerSecond, 0, 0, 1e9), signal: typeof effect.signal === 'string' ? effect.signal.slice(0, 128) : 'area.effect'
    }))
  } else if (component instanceof NavigationRegion2D) {
    component.polygon = (Array.isArray(component.polygon) ? component.polygon : []).slice(0, 4096).map(/* 调用 safeVector(point, { x: 0, y: 0 }) 并返回调用结果。 */ point => safeVector(point, { x: 0, y: 0 }))
    component.cellSize = clamp(component.cellSize, .5, .01, 1e6); component.clusterSize = Math.round(clamp(component.clusterSize, 16, 4, 64)); component.rebakeInterval = clamp(component.rebakeInterval, .5, .02, 60); component.navigationLayer = Math.round(clamp(component.navigationLayer, 1, 1, 32)); component.navigationMask = Math.round(clamp(component.navigationMask, 1, 0, 0xffff_ffff)) >>> 0; component.traversalCost = clamp(component.traversalCost, 1, .001, 1e6); component.agentRadius = clamp(component.agentRadius, .4, 0, 1e6)
    if (!['Grid', 'Polygon'].includes(component.navigationMode)) component.navigationMode = 'Grid'
    if (!['SceneGeometry', 'TileMap', 'Manual'].includes(component.source)) component.source = 'Manual'
    component.sourceEntityUuid = typeof component.sourceEntityUuid === 'string' ? component.sourceEntityUuid.slice(0, 128) : null
    component.links = (Array.isArray(component.links) ? component.links : []).slice(0, 2048).map(/** 规范化导航连接身份、端点、代价及方向启用标记。 */ (link, index) => ({ id: typeof link.id === 'string' ? link.id.slice(0, 80) : `link-${index}`, start: safeVector(link.start, { x: 0, y: 0 }), end: safeVector(link.end, { x: 1, y: 0 }), bidirectional: link.bidirectional !== false, cost: clamp(link.cost, 1, .001, 1e6), enabled: link.enabled !== false }))
    component.costAreas = (Array.isArray(component.costAreas) ? component.costAreas : []).slice(0, 2048).map(/** 规范化导航代价区域的形状、位置尺寸、倍率和导航层。 */ (area, index) => { const size = safeVector(area.size, { x: 1, y: 1 }); return { id: typeof area.id === 'string' ? area.id.slice(0, 80) : `cost-${index}`, name: typeof area.name === 'string' ? area.name.slice(0, 80) : `Cost ${index + 1}`, shape: area.shape === 'Circle' ? 'Circle' as const : 'Box' as const, center: safeVector(area.center, { x: 0, y: 0 }), size: { x: clamp(size.x, 1, .001, 1e6), y: clamp(size.y, 1, .001, 1e6) }, radius: clamp(area.radius, 1, .001, 1e6), multiplier: clamp(area.multiplier, 1, .001, 1_000), navigationLayer: Math.round(clamp(area.navigationLayer, component.navigationLayer, 1, 32)), enabled: area.enabled !== false } })
    if (!['AStar', 'HierarchicalAStar', 'FlowField'].includes(component.algorithm)) component.algorithm = 'AStar'
  } else if (component instanceof NavigationObstacle2D) {
    component.size = safeVector(component.size, { x: 1, y: 1 }); component.size.x = clamp(component.size.x, 1, .001, 1e6); component.size.y = clamp(component.size.y, 1, .001, 1e6); component.radius = clamp(component.radius, .5, .001, 1e6); component.navigationLayer = Math.round(clamp(component.navigationLayer, 1, 1, 32)); component.avoidanceVelocity = safeVector(component.avoidanceVelocity, { x: 0, y: 0 }); component.dynamic = component.dynamic !== false; if (!['Box', 'Circle'].includes(component.shape)) component.shape = 'Circle'
  } else if (component instanceof NavigationAgent2D) {
    component.targetPosition = safeVector(component.targetPosition, { x: 0, y: 0 }); component.targetEntityUuid = typeof component.targetEntityUuid === 'string' ? component.targetEntityUuid.slice(0, 128) : null
    component.speed = clamp(component.speed, 4, 0, 1e6); component.acceleration = clamp(component.acceleration, 20, 0, 1e9); component.radius = clamp(component.radius, .4, .001, 1e6); component.stoppingDistance = clamp(component.stoppingDistance, .1, 0, 1e6); component.avoidanceRadius = clamp(component.avoidanceRadius, 1.2, 0, 1e6); component.maximumAvoidanceNeighbors = Math.round(clamp(component.maximumAvoidanceNeighbors, 16, 1, 32)); component.repathInterval = clamp(component.repathInterval, .25, .02, 60); component.navigationLayer = Math.round(clamp(component.navigationLayer, 1, 1, 32)); component.navigationMask = Math.round(clamp(component.navigationMask, 1, 0, 0xffff_ffff)) >>> 0; component.avoidancePriority = clamp(component.avoidancePriority, .5, 0, 1); component.velocity = safeVector(component.velocity, { x: 0, y: 0 }); component.path = (Array.isArray(component.path) ? component.path : []).slice(0, 65_536).map(/* 调用 safeVector(point, { x: 0, y: 0 }) 并返回调用结果。 */ point => safeVector(point, { x: 0, y: 0 })); component.pathIndex = Math.round(clamp(component.pathIndex, 0, 0, component.path.length)); if (!['Idle', 'Pending', 'Ready', 'Unreachable'].includes(component.pathStatus)) component.pathStatus = 'Idle'
  } else if (component instanceof BehaviorTree2D) {
    component.treeAsset = typeof component.treeAsset === 'string' ? component.treeAsset : null; component.tickRate = clamp(component.tickRate, 10, 1, 1000); component.blackboardOverrides = Object.fromEntries(Object.entries(component.blackboardOverrides && typeof component.blackboardOverrides === 'object' ? component.blackboardOverrides : {}).slice(0, 256).flatMap(/** 保留布尔、有限数字及受限长度文本黑板值，并限制键长度。 */ ([key, value]) => typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value) || typeof value === 'string' ? [[key.slice(0, 80), typeof value === 'string' ? value.slice(0, 256) : value]] : []))
  } else if (component instanceof StateMachine2D) component.machineAsset = typeof component.machineAsset === 'string' ? component.machineAsset : null
  else if (component instanceof GridMover2D) { component.action = typeof component.action === 'string' ? component.action.slice(0, 80) : 'Move'; component.cellSize = safeVector(component.cellSize, { x: 1, y: 1 }); component.cellSize.x = clamp(component.cellSize.x, 1, .000001, 1e9); component.cellSize.y = clamp(component.cellSize.y, 1, .000001, 1e9); component.repeatDelay = clamp(component.repeatDelay, .12, 0, 60) }
  else if (component instanceof PlatformController2D) { component.moveAction = typeof component.moveAction === 'string' ? component.moveAction.slice(0, 80) : 'Horizontal'; component.jumpAction = typeof component.jumpAction === 'string' ? component.jumpAction.slice(0, 80) : 'Jump'; component.speed = clamp(component.speed, 6, 0, 1e6); component.acceleration = clamp(component.acceleration, 36, 0, 1e9); component.airControl = clamp(component.airControl, .55, 0, 1); component.jumpImpulse = clamp(component.jumpImpulse, 10, 0, 1e9); component.maximumFallSpeed = clamp(component.maximumFallSpeed, 30, 0, 1e9) }
  else if (component instanceof TopDownController2D) { component.moveAction = typeof component.moveAction === 'string' ? component.moveAction.slice(0, 80) : 'Move'; component.speed = clamp(component.speed, 5, 0, 1e6); component.acceleration = clamp(component.acceleration, 30, 0, 1e9) }
  else if (component instanceof Health2D) { component.maximum = clamp(component.maximum, 100, .000001, 1e12); component.current = clamp(component.current, component.maximum, 0, component.maximum); component.invulnerabilitySeconds = clamp(component.invulnerabilitySeconds, 0, 0, 86_400); component.damagedSignal = typeof component.damagedSignal === 'string' ? component.damagedSignal.slice(0, 128) : 'health.damaged'; component.diedSignal = typeof component.diedSignal === 'string' ? component.diedSignal.slice(0, 128) : 'health.died' }
  else if (component instanceof DamageHitbox2D) { component.damage = clamp(component.damage, 10, 0, 1e12); component.knockback = clamp(component.knockback, 0, 0, 1e12); component.targetTag = typeof component.targetTag === 'string' ? component.targetTag.slice(0, 80) : 'damageable'; component.hitCooldown = clamp(component.hitCooldown, .1, 0, 86_400); component.hitSignal = typeof component.hitSignal === 'string' ? component.hitSignal.slice(0, 128) : 'damage.hit' }
  else if (component instanceof Collectible2D) { component.collectorTag = typeof component.collectorTag === 'string' ? component.collectorTag.slice(0, 80) : 'player'; component.score = finiteNumber(component.score, 1); component.collectedSignal = typeof component.collectedSignal === 'string' ? component.collectedSignal.slice(0, 128) : 'collectible.collected' }
  else if (component instanceof Projectile2D) { component.speed = clamp(component.speed, 12, 0, 1e9); component.direction = safeVector(component.direction, { x: 1, y: 0 }); component.damage = clamp(component.damage, 10, 0, 1e12); component.ownerUuid = typeof component.ownerUuid === 'string' ? component.ownerUuid.slice(0, 128) : ''; component.lifetime = clamp(component.lifetime, 5, 0, 86_400) }
  else if (component instanceof Spawner2D) { component.prefabAsset = typeof component.prefabAsset === 'string' ? component.prefabAsset : null; component.interval = clamp(component.interval, 1, .000001, 86_400); component.initialDelay = clamp(component.initialDelay, 0, 0, 86_400); component.burst = Math.round(clamp(component.burst, 1, 1, 256)); component.maximumAlive = Math.round(clamp(component.maximumAlive, 32, 1, 100_000)) }
  else if (component instanceof Cooldown2D) { component.duration = clamp(component.duration, 1, .000001, 86_400); component.readySignal = typeof component.readySignal === 'string' ? component.readySignal.slice(0, 128) : 'cooldown.ready' }
  else if (component instanceof Lifetime2D) component.seconds = clamp(component.seconds, 5, .000001, 86_400)
  else if (component instanceof MouseFollower2D) { component.offset = safeVector(component.offset, { x: 0, y: 0 }); component.maximumSpeed = clamp(component.maximumSpeed, 0, 0, 1e9) }
  else if (component instanceof CameraFollow2D) { component.targetUuid = typeof component.targetUuid === 'string' ? component.targetUuid.slice(0, 128) : ''; component.targetTag = typeof component.targetTag === 'string' ? component.targetTag.slice(0, 80) : 'player'; component.offset = safeVector(component.offset, { x: 0, y: 0 }); component.smoothing = clamp(component.smoothing, 8, 0, 1e6); component.deadZone = safeVector(component.deadZone, { x: 0, y: 0 }); component.deadZone.x = clamp(component.deadZone.x, 0, 0, 1e9); component.deadZone.y = clamp(component.deadZone.y, 0, 0, 1e9) }
  else if (component instanceof WorldChunk2D) {
    component.size = safeVector(component.size, { x: 64, y: 64 }); component.loadDistance = clamp(component.loadDistance, 96, 0, 1e9); component.unloadDistance = clamp(component.unloadDistance, 128, component.loadDistance, 1e9); component.preloadPriority = Math.round(clamp(component.preloadPriority, 0, -1e6, 1e6)); component.memoryEstimateMb = clamp(component.memoryEstimateMb, 8, .001, 1e6); component.sceneUuid = typeof component.sceneUuid === 'string' ? component.sceneUuid.slice(0, 128) : ''
  } else if (component instanceof Portal2D) {
    component.targetSceneUuid = typeof component.targetSceneUuid === 'string' ? component.targetSceneUuid.slice(0, 128) : ''; component.targetPortal = typeof component.targetPortal === 'string' ? component.targetPortal.slice(0, 128) : ''; component.triggerRadius = clamp(component.triggerRadius, 1, .001, 1e6)
  } else if (component instanceof ObjectPool2D) {
    component.prefabAsset = typeof component.prefabAsset === 'string' ? component.prefabAsset : null; component.prewarm = Math.round(clamp(component.prewarm, 8, 0, 100_000)); component.capacity = Math.round(clamp(component.capacity, 32, Math.max(1, component.prewarm), 100_000))
  } else if (component instanceof ParticleEmitter2D) {
    normalizeParticleEmitter(component)
  } else if (component instanceof Light2D) {
    if (!['Point', 'Spot', 'Directional', 'Area'].includes(component.lightType)) component.lightType = 'Point'
    component.color = safeColor(component.color, { r: 255, g: 235, b: 196 })
    component.intensity = clamp(component.intensity, 1, 0, 32)
    component.range = clamp(component.range, 8, .001, 1e6)
    component.innerAngle = clamp(component.innerAngle, 30, 0, 179)
    component.outerAngle = clamp(component.outerAngle, 55, component.innerAngle, 179)
    component.areaSize = safeVector(component.areaSize, { x: 4, y: 2 })
    component.areaSize.x = clamp(component.areaSize.x, 4, .001, 1e6); component.areaSize.y = clamp(component.areaSize.y, 2, .001, 1e6)
    component.layerMask = Math.round(clamp(component.layerMask, 0xffff_ffff, 0, 0xffff_ffff)) >>> 0
    component.shadowSoftness = clamp(component.shadowSoftness, .5, 0, 1)
  } else if (component instanceof ShadowCaster2D) {
    component.layerMask = Math.round(clamp(component.layerMask, 0xffff_ffff, 0, 0xffff_ffff)) >>> 0
    component.opacity = clamp(component.opacity, .85, 0, 1)
  } else if (component instanceof Joint2D) {
    component.targetEntityUuid = typeof component.targetEntityUuid === 'string' ? component.targetEntityUuid : null
    component.anchor = safeVector(component.anchor, { x: 0, y: 0 }); component.connectedAnchor = safeVector(component.connectedAnchor, { x: 0, y: 0 })
    component.axis = safeVector(component.axis, { x: 1, y: 0 }); const axisLength = Math.hypot(component.axis.x, component.axis.y)
    component.axis = axisLength > 1e-9 ? { x: component.axis.x / axisLength, y: component.axis.y / axisLength } : { x: 1, y: 0 }
    component.distance = clamp(component.distance, 1, 0, 1e9); component.stiffness = clamp(component.stiffness, 1200, 0, 1e12); component.damping = clamp(component.damping, 35, 0, 1e9)
    component.lowerLimit = finiteNumber(component.lowerLimit, -1); component.upperLimit = Math.max(component.lowerLimit, finiteNumber(component.upperLimit, 1))
    component.referenceOffset = safeVector(component.referenceOffset, { x: 0, y: 0 }); component.referenceAngle = finiteNumber(component.referenceAngle)
    component.motorSpeed = finiteNumber(component.motorSpeed); component.maxMotorForce = clamp(component.maxMotorForce, 1000, 0, 1e12)
    // JSON uses null for an authored unlimited threshold; keep that sentinel unlimited.
    component.breakForce = normalizeJointBreakThreshold(component.breakForce)
    component.breakTorque = normalizeJointBreakThreshold(component.breakTorque)
  }
}

/** 从组件记录重建变换、渲染、脚本、扩展和物理组件，保留作者组件顺序与必要旧格式默认值。 */ function applyStoredComponents(entity: Entity, item: SceneEntityData): void {
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
    const shape = data.shape === 'Ellipse' || data.shape === 'Polygon' || data.shape === 'Line' ? data.shape : 'Rectangle'
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
    sprite.normalMapAsset = typeof data.normalMapAsset === 'string' ? data.normalMapAsset : null
    sprite.lightMask = Math.round(clamp(data.lightMask, 0xffff_ffff, 0, 0xffff_ffff)) >>> 0
    if (data.nineSlice && typeof data.nineSlice === 'object') Object.assign(sprite.nineSlice, data.nineSlice)
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
    camera.priority = Math.round(finiteNumber(data.priority, 0)); camera.stackOrder = Math.round(finiteNumber(data.stackOrder, 0))
    camera.cullingMask = Math.round(clamp(data.cullingMask, 0xffff_ffff, 0, 0xffff_ffff)) >>> 0
    camera.clearColor = data.clearColor !== false
    camera.renderTexture = typeof data.renderTexture === 'string' ? data.renderTexture.slice(0, 120) : ''
    camera.previewInEditor = data.previewInEditor !== false
    camera.followTargetUuid = typeof data.followTargetUuid === 'string' ? data.followTargetUuid : null
    if (data.smoothing && typeof data.smoothing === 'object') { const value = data.smoothing as Record<string, unknown>; camera.smoothing = { enabled: value.enabled === true, speed: Math.max(0, finiteNumber(value.speed, 5)) } }
    if (data.limits && typeof data.limits === 'object') { const value = data.limits as Record<string, unknown>; camera.limits = { enabled: value.enabled === true, left: finiteNumber(value.left, -100), right: finiteNumber(value.right, 100), bottom: finiteNumber(value.bottom, -100), top: finiteNumber(value.top, 100) } }
    if (data.dragMargins && typeof data.dragMargins === 'object') { const value = data.dragMargins as Record<string, unknown>; camera.dragMargins = { enabled: value.enabled === true, left: Math.min(1, Math.max(0, finiteNumber(value.left, .1))), right: Math.min(1, Math.max(0, finiteNumber(value.right, .1))), top: Math.min(1, Math.max(0, finiteNumber(value.top, .1))), bottom: Math.min(1, Math.max(0, finiteNumber(value.bottom, .1))) } }
    entity.componentMap.set('Camera2D', camera)
  }

  const scriptSource = storedComponent(item, 'Script2D')
  if (scriptSource) {
    const data = recordData(scriptSource)
    const script = new Script2D(scriptSource.uuid)
    applyComponentMetadata(script, scriptSource)
    script.scriptAsset = typeof data.scriptAsset === 'string' ? data.scriptAsset : null
    script.eventSheetAsset = typeof data.eventSheetAsset === 'string' ? data.eventSheetAsset : null
    script.objectBlueprintAsset = typeof data.objectBlueprintAsset === 'string' ? data.objectBlueprintAsset : null
    const safeScriptProperty = /** 限制脚本属性嵌套深度与集合规模，仅保留可序列化基础值和有限数值，非法值返回 undefined。 */ (value: unknown, depth = 0): ScriptPropertyValue | undefined => {
      if (depth > 8) return undefined
      if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
      if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
      if (Array.isArray(value)) return value.slice(0, 1024).flatMap(/** 递归规范化脚本数组成员并过滤不支持的值。 */ item => { const safe = safeScriptProperty(item, depth + 1); return safe === undefined ? [] : [safe] })
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 1024).flatMap(/** 递归规范化脚本对象字段，限制键长度并过滤不支持的值。 */ ([key, item]) => { const safe = safeScriptProperty(item, depth + 1); return safe === undefined ? [] : [[key.slice(0, 128), safe]] }))
      return undefined
    }
    if (data.properties && typeof data.properties === 'object' && !Array.isArray(data.properties)) {
      for (const [name, value] of Object.entries(data.properties as Record<string, unknown>)) {
        const safe = safeScriptProperty(value)
        if (safe !== undefined) script.properties[name] = safe
      }
    }
    entity.componentMap.set('Script2D', script)
  }

  for (const kind of EXTENDED_COMPONENT_KINDS) {
    const source = storedComponent(item, kind)
    if (!source) continue
    const component = createExtendedComponent(kind, source.uuid)
    pasteComponentValues(component, recordData(source))
    // Envelope metadata is authoritative; a stale data.enabled must not re-enable a removed component.
    applyComponentMetadata(component, source)
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
    body.transformOwnership = data.transformOwnership === 'Animation' ? 'Animation' : 'Physics'
    entity.componentMap.set('RigidBody2D', body)
  } else {
    entity.removeComponent('RigidBody2D')
  }

  const colliderSources = item.components.filter(/* 先计算 component.kind === 'BoxCollider2D' || component.kind === 'EllipseCollider2D'；仅当其为假值时求右侧 component.kind === 'PolygonCollider2D'，返回短路求值结果。 */ component => component.kind === 'BoxCollider2D' || component.kind === 'EllipseCollider2D' || component.kind === 'PolygonCollider2D')
  if (colliderSources.length) {
    for (const kind of ['BoxCollider2D', 'EllipseCollider2D', 'PolygonCollider2D'] as const) entity.componentMap.delete(kind)
    for (const colliderSource of colliderSources) {
    const data = recordData(colliderSource)
    const collider = new Collider2D(colliderSource.kind as 'BoxCollider2D' | 'EllipseCollider2D' | 'PolygonCollider2D', colliderSource.uuid)
    applyComponentMetadata(collider, colliderSource)
    copyVector(collider.offset, data.offset)
    copyVector(collider.size, data.size)
    collider.rotation = finiteNumber(data.rotation, collider.rotation)
    collider.radiusX = Math.max(1e-9, finiteNumber(data.radiusX, collider.radiusX))
    collider.radiusY = Math.max(1e-9, finiteNumber(data.radiusY, collider.radiusY))
    const shapeModels = ['Box', 'Circle', 'Capsule', 'Segment', 'Chain', 'WorldBoundary', 'ConvexPolygon', 'ConcavePolygon'] as const
    if (shapeModels.includes(data.shapeModel as typeof shapeModels[number])) collider.shapeModel = data.shapeModel as typeof collider.shapeModel
    const vertices = normalizedVertices(data.vertices as SceneEntityData['vertices'], collider.shapeModel === 'Chain' ? 2 : 3)
    if (vertices) collider.vertices = vertices
    collider.shapes = Array.isArray(data.shapes) ? data.shapes.slice(0, 128).flatMap(/** 过滤无效复合碰撞形状，规范化几何和碰撞属性，并从主碰撞体继承缺省层与传感器设置。 */ (value, index) => {
      if (!value || typeof value !== 'object') return []
      const raw = value as Record<string, unknown>
      const kind = shapeModels.includes(raw.kind as typeof shapeModels[number]) ? raw.kind as typeof collider.shapeModel : 'Box'
      const offset = { x: 0, y: 0 }, size = { x: 1, y: 1 }
      copyVector(offset, raw.offset); copyVector(size, raw.size)
      size.x = Math.max(1e-9, Math.abs(size.x)); size.y = Math.max(1e-9, Math.abs(size.y))
      const physicsLayer=Math.min(31,Math.max(0,Math.round(finiteNumber(raw.physicsLayer,data.physicsLayer as number)))); const oneWayNormal={x:0,y:1};copyVector(oneWayNormal,raw.oneWayNormal)
      return [{ id: typeof raw.id === 'string' && raw.id ? raw.id : `shape-${index + 1}`, kind, offset, rotation: finiteNumber(raw.rotation), size, radius: Math.max(1e-9, finiteNumber(raw.radius, .5)), points: normalizedVertices(raw.points as SceneEntityData['vertices'], kind === 'Chain' ? 2 : 3) ?? [], enabled: raw.enabled !== false, sensor: typeof raw.sensor==='boolean'?raw.sensor:data.sensor===true, physicsLayer, collisionMask: Math.min(0xffff_ffff,Math.max(0,Math.round(finiteNumber(raw.collisionMask,data.collisionMask as number))))>>>0, oneWay: raw.oneWay===true, oneWayNormal }]
    }) : []
    collider.sensor = data.sensor === true
    collider.physicsLayer = Math.min(31, Math.max(0, Math.round(finiteNumber(data.physicsLayer))))
    collider.collisionMask = Math.min(0xffff_ffff, Math.max(0, Math.round(finiteNumber(data.collisionMask, 1 << collider.physicsLayer)))) >>> 0
    collider.oneWay = data.oneWay === true
    collider.materialAsset = typeof data.materialAsset === 'string' ? data.materialAsset : null
    copyVector(collider.oneWayNormal, data.oneWayNormal)
    const oneWayLength = Math.hypot(collider.oneWayNormal.x, collider.oneWayNormal.y)
    collider.oneWayNormal = oneWayLength > 1e-9 ? { x: collider.oneWayNormal.x / oneWayLength, y: collider.oneWayNormal.y / oneWayLength } : { x: 0, y: 1 }
    const material = data.material && typeof data.material === 'object' ? data.material as Record<string, unknown> : {}
    collider.material.density = Math.max(1e-9, finiteNumber(material.density, 1))
    collider.material.frictionCombine = ['Average', 'Minimum', 'Maximum', 'Multiply'].includes(String(material.frictionCombine)) ? material.frictionCombine as typeof collider.material.frictionCombine : 'Average'
    collider.material.restitutionCombine = ['Average', 'Minimum', 'Maximum', 'Multiply'].includes(String(material.restitutionCombine)) ? material.restitutionCombine as typeof collider.material.restitutionCombine : 'Maximum'
    if (data.material && typeof data.material === 'object') {
      const material = data.material as Record<string, unknown>
      collider.material.restitution = finiteNumber(material.restitution, collider.material.restitution)
      collider.material.restitutionThreshold = finiteNumber(material.restitutionThreshold, collider.material.restitutionThreshold)
      collider.material.staticFriction = finiteNumber(material.staticFriction, collider.material.staticFriction)
      collider.material.dynamicFriction = finiteNumber(material.dynamicFriction, collider.material.dynamicFriction)
    }
    entity.componentMap.set(collider.kind, collider)
    }
  } else {
    const collider = entity.getCollider(true)
    if (collider) entity.removeComponent(collider.kind)
  }
  // Hydration replaces collider instances, but must not change authored list order.
  const remainingComponents = new Map(entity.componentMap)
  entity.componentMap.clear()
  for (const source of item.components) {
    const component = remainingComponents.get(source.kind as ComponentKind)
    if (!component) continue
    entity.componentMap.set(component.kind, component)
    remainingComponents.delete(component.kind)
  }
  // Keep required constructor defaults absent from legacy component documents.
  for (const component of remainingComponents.values()) entity.componentMap.set(component.kind, component)
}

/** 将旧格式白名单数值和布尔实体属性写入实例，非法数值保留原值。 */ function applyStoredProperties(entity: Entity, source: Record<string, unknown>): void {
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

/** 恢复旧格式名称、纹理及有限颜色分量。 */ function applyStoredAppearance(entity: Entity, source: Record<string, unknown>): void {
  if (typeof source.name === 'string' && source.name.trim()) entity.name = source.name.trim()
  if (typeof source.texture === 'string' || source.texture === null) entity.texture = source.texture
  if (!source.color || typeof source.color !== 'object') return
  const color = source.color as { r?: unknown; g?: unknown; b?: unknown }
  entity.color.r = finiteNumber(color.r, entity.color.r)
  entity.color.g = finiteNumber(color.g, entity.color.g)
  entity.color.b = finiteNumber(color.b, entity.color.b)
}

/** 恢复旧格式变换、速度、加速度和力，非法坐标沿用当前分量。 */ function applyStoredTransform(entity: Entity, item: SceneEntityData, source: Record<string, unknown>): void {
  if (item.transform) {
    copyVector(entity.transform.position, item.transform.position)
    copyVector(entity.transform.scale, item.transform.scale)
    entity.transform.rotation = finiteNumber(item.transform.rotation, entity.transform.rotation)
  }
  copyVector(entity.velocity, source.velocity)
  copyVector(entity.acceleration, source.acceleration)
  copyVector(entity.force, source.force)
}

/** 先校验实体和组件数据，再兼容新旧记录重建实体、实例与创作元数据，规范化后恢复作者显式无障碍设置。 */ export function createEntityFromData(item: SceneEntityData, forcedId?: number): Entity {
  if (!item || typeof item !== 'object') throw new Error(t('invalidEntityRecord'))
  validateEntityMetadataValues(item)
  if (Array.isArray(item.components)) for (const component of item.components) {
    if (!component || typeof component !== 'object') throw new Error(t('invalidEntityRecord'))
    if (component.data != null) {
      if (typeof component.data !== 'object' || Array.isArray(component.data)) throw new Error(`${component.kind}.data: expected an object.`)
      validateComponentValues(String(component.kind), component.data)
    }
  }
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
  entity.tags = Array.isArray(item.tags) ? item.tags.filter(/* 比较 typeof tag 与 'string'，返回严格相等的判断结果。 */ tag => typeof tag === 'string').map(/* 调用 tag.slice(0, 80) 并返回调用结果。 */ tag => tag.slice(0, 80)) : []
  entity.groups = Array.isArray(item.groups) ? [...new Set(item.groups.filter(/* 比较 typeof group 与 'string'，返回严格相等的判断结果。 */ group => typeof group === 'string').map(/* 调用 group.trim().slice(0, 80) 并返回调用结果。 */ group => group.trim().slice(0, 80)).filter(Boolean))].slice(0, 32) : []
  entity.namedLayer = typeof item.namedLayer === 'string' && item.namedLayer.trim() ? item.namedLayer.trim().slice(0, 80) : `Layer ${entity.layer}`
  entity.ownerUuid = typeof item.ownerUuid === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.ownerUuid) ? normalizeUuid(item.ownerUuid) : null
  entity.ownership = item.ownership === 'Prefab' || item.ownership === 'Runtime' ? item.ownership : 'Scene'
  entity.editorOnly = item.editorOnly === true
  entity.runtimePersistence = item.runtimePersistence === 'Session' || item.runtimePersistence === 'SaveGame' || item.runtimePersistence === 'Transient' ? item.runtimePersistence : 'Scene'
  entity.persistentAcrossScenes = item.persistentAcrossScenes === true
  entity.objectBlueprintAsset = typeof item.objectBlueprintAsset === 'string' ? item.objectBlueprintAsset : item.objectBlueprintAsset === null ? null : entity.script2D?.objectBlueprintAsset ?? null
  if (entity.script2D) entity.script2D.objectBlueprintAsset = entity.objectBlueprintAsset
  entity.prefabAsset = typeof item.prefabAsset === 'string' ? item.prefabAsset : null
  entity.prefabInstanceUuid = typeof item.prefabInstanceUuid === 'string' ? item.prefabInstanceUuid : null
  entity.prefabSourceUuid = typeof item.prefabSourceUuid === 'string' ? item.prefabSourceUuid : null
  entity.prefabOverrides = item.prefabOverrides && typeof item.prefabOverrides === 'object' && !Array.isArray(item.prefabOverrides)
    ? JSON.parse(JSON.stringify(item.prefabOverrides)) as Record<string, unknown>
    : {}
  entity.prefabLayers = Array.isArray(item.prefabLayers) ? item.prefabLayers.flatMap(/** 过滤无效预制体层，规范化实例来源身份并深复制覆盖值。 */ layer => {
    if (!layer || typeof layer.asset !== 'string' || typeof layer.instanceUuid !== 'string' || typeof layer.sourceUuid !== 'string') return []
    return [{ asset: layer.asset, instanceUuid: normalizeUuid(layer.instanceUuid), sourceUuid: normalizeUuid(layer.sourceUuid), overrides: layer.overrides && typeof layer.overrides === 'object' ? JSON.parse(JSON.stringify(layer.overrides)) as Record<string, unknown> : {} }]
  }).slice(0, 32) : []
  entity.sceneLayers = Array.isArray(item.sceneLayers) ? item.sceneLayers.flatMap(/** 过滤无效场景实例层，规范化实例身份和来源身份。 */ layer => {
    if (!layer || typeof layer.asset !== 'string' || typeof layer.instanceUuid !== 'string' || typeof layer.sourceUuid !== 'string') return []
    return [{ asset: layer.asset, instanceUuid: normalizeUuid(layer.instanceUuid), sourceUuid: normalizeUuid(layer.sourceUuid) }]
  }).slice(0, 32) : []
  if (!item.authoring) {
    if (entity.camera2D) entity.authoring.kind = 'Camera'
    else if (entity.spriteRenderer) entity.authoring.kind = entity.hasComponent('Animator') ? 'AnimatedSprite' : 'Sprite'
    else if (entity.textRenderer) entity.authoring.kind = 'WorldText'
  }
  if (item.authoring && typeof item.authoring === 'object') {
    const authoring = item.authoring
    const knownKinds = new Set(['Empty', 'Sprite', 'AnimatedSprite', 'WorldText', 'Polygon', 'Line', 'Path', 'Camera', 'CanvasLayer', 'ParallaxLayer', 'Rectangle', 'Circle', 'Triangle', 'Collider', 'ScriptHost', 'AudioEmitter', 'Light', 'NavigationRegion', 'PackageObject'])
    if (typeof authoring.kind === 'string' && knownKinds.has(authoring.kind)) entity.authoring.kind = authoring.kind as AuthoringMetadata2D['kind']
    if (authoring.origin) copyVector(entity.authoring.origin, authoring.origin)
    entity.authoring.visible = authoring.visible !== false
    entity.authoring.zOrder = Math.trunc(finiteNumber(authoring.zOrder, entity.authoring.zOrder))
    entity.authoring.renderLayer = Math.max(0, Math.trunc(finiteNumber(authoring.renderLayer, entity.layer)))
    entity.authoring.sortMode = authoring.sortMode === 'YSort' ? 'YSort' : 'LayerThenOrder'
    if (authoring.canvasLayer) entity.authoring.canvasLayer = {
      screenSpace: authoring.canvasLayer.screenSpace === true,
      followCamera: authoring.canvasLayer.followCamera !== false
    }
    if (authoring.parallax) {
      copyVector(entity.authoring.parallax.motionScale, authoring.parallax.motionScale)
      copyVector(entity.authoring.parallax.repeat, authoring.parallax.repeat)
      entity.authoring.parallax.mirror = authoring.parallax.mirror === true
      entity.authoring.parallax.depth = Math.min(1_000_000, Math.max(-1_000_000, finiteNumber(authoring.parallax.depth)))
    }
    if (authoring.path) {
      entity.authoring.path.closed = authoring.path.closed === true
      entity.authoring.path.smoothing = Math.min(1, Math.max(0, finiteNumber(authoring.path.smoothing, entity.authoring.path.smoothing)))
      entity.authoring.path.points = Array.isArray(authoring.path.points)
        ? authoring.path.points.slice(0, 10_000).map(/** 构造并返回记录 { x: finiteNumber(point.x), y: finiteNumber(point.y) }，字段按当前实参及捕获状态求值。 */ point => ({ x: finiteNumber(point.x), y: finiteNumber(point.y) }))
        : entity.authoring.path.points
      entity.authoring.path.tangents = Array.isArray(authoring.path.tangents)
        ? authoring.path.tangents.slice(0, entity.authoring.path.points.length).map(/** 把路径切线的入向和出向控制坐标转换为有限数值。 */ tangent => ({ incoming: { x: finiteNumber(tangent?.incoming?.x), y: finiteNumber(tangent?.incoming?.y) }, outgoing: { x: finiteNumber(tangent?.outgoing?.x), y: finiteNumber(tangent?.outgoing?.y) } }))
        : entity.authoring.path.tangents
      entity.authoring.path.asset = typeof authoring.path.asset === 'string' ? authoring.path.asset.slice(0, 256) : null
      if (authoring.path.follower) entity.authoring.path.follower = {
        targetUuid: typeof authoring.path.follower.targetUuid === 'string' ? normalizeUuid(authoring.path.follower.targetUuid) : null,
        progress: Math.min(1, Math.max(0, finiteNumber(authoring.path.follower.progress))),
        speed: Math.min(1_000_000, Math.max(-1_000_000, finiteNumber(authoring.path.follower.speed))),
        orient: authoring.path.follower.orient !== false
      }
    }
  }

  if (entity.isStatic) entity.isKinematic = false
  normalizeEntity(entity)
  const storedRectData = item.components?.find(/* 比较 component.kind 与 'RectTransform'，返回严格相等的判断结果。 */ component => component.kind === 'RectTransform')?.data
  const rect = entity.getComponent<RectTransform>('RectTransform')
  if (rect && (entity.hasComponent('Button') || entity.hasComponent('Slider') || entity.hasComponent('Checkbox') || entity.hasComponent('TextInput')) && storedRectData?.skipNavigation !== true) rect.skipNavigation = false
  configureUiAccessibility(entity)
  // Defaults repair omitted legacy metadata; explicit author choices must survive reopening.
  if (rect && typeof storedRectData?.focusable === 'boolean') rect.focusable = storedRectData.focusable
  if (rect && typeof storedRectData?.skipNavigation === 'boolean') rect.skipNavigation = storedRectData.skipNavigation
  const authoredBody = storedComponent(item, 'RigidBody2D')
  if (!authoredBody || typeof recordData(authoredBody).density !== 'number') syncDensityFromMass(entity)
  return entity
}

export type UiElementKind = 'Canvas' | 'Panel' | 'Image' | 'Text' | 'Button' | 'Slider' | 'ProgressBar' | 'Checkbox' | 'TextInput'

/** Creates a renderer-independent runtime UI entity without a physics body or collider. */
/** 创建无物理碰撞的界面实体，必要时建立根画布，配置默认组件尺寸、位置和无障碍行为，并按选项记录历史。 */ export function createUiEntity(kind: UiElementKind, parentUuid: string | null = null, recordHistory = true): Entity {
  if (kind !== 'Canvas' && !parentUuid) {
    const canvas = physicsState.world.entities.find(/* 先计算 entity.hasComponent('Canvas')；仅当其为真值时求右侧 !entity.parentUuid，返回短路求值结果。 */ entity => entity.hasComponent('Canvas') && !entity.parentUuid)
    parentUuid = canvas?.uuid ?? createUiEntity('Canvas', null, false).uuid
  }
  const entity = physicsState.world.addBox({ x: 0, y: 0 }, { x: 1, y: 1 })
  const sameKind = physicsState.world.entities.filter(/* 先计算 candidate.name === kind；仅当其为假值时求右侧 candidate.name.startsWith(`${kind} `)，返回短路求值结果。 */ candidate => candidate.name === kind || candidate.name.startsWith(`${kind} `)).length
  entity.name = sameKind ? `${kind} ${sameKind + 1}` : kind
  entity.layer = editorState.activeLayer
  entity.renderer.enabled = false
  entity.removeComponent('ShapeRenderer2D')
  entity.removeComponent('RigidBody2D')
  const collider = entity.getCollider()
  if (collider) entity.removeComponent(collider.kind)
  const rect = entity.addComponent(new RectTransform())
  entity.parentUuid = kind === 'Canvas' ? null : parentUuid
  if (kind === 'Canvas') {
    entity.addComponent(new Canvas())
    rect.anchorPreset = 'stretch'
  } else if (kind === 'Panel') { entity.addComponent(new Panel()); rect.size = { x: 1200, y: 720 } }
  else if (kind === 'Image') { entity.addComponent(new UIImage()); rect.size = { x: 420, y: 260 } }
  else if (kind === 'Text') { entity.addComponent(new UIText()); rect.size = { x: 520, y: 96 } }
  else if (kind === 'Button') {
    entity.addComponent(new Button())
    const text = entity.addComponent(new UIText()); text.text = 'Button'
    rect.size = { x: 360, y: 104 }
  } else if (kind === 'Slider') { entity.addComponent(new Slider()); rect.size = { x: 480, y: 80 } }
  else if (kind === 'ProgressBar') { entity.addComponent(new ProgressBar()); rect.size = { x: 480, y: 64 } }
  else if (kind === 'Checkbox') { entity.addComponent(new Checkbox()); rect.size = { x: 360, y: 72 } }
  else { entity.addComponent(new TextInput()); rect.size = { x: 300, y: 96 } }
  if (kind === 'Button' || kind === 'Slider' || kind === 'Checkbox' || kind === 'TextInput') rect.skipNavigation = false
  configureUiAccessibility(entity, physicsState.world.entities)
  if (kind !== 'Canvas') {
    const defaultPositions: Record<Exclude<UiElementKind, 'Canvas'>, { x: number; y: number }> = {
      Panel: { x: 0, y: 0 }, Image: { x: -300, y: -100 }, Text: { x: 220, y: -250 },
      Button: { x: 210, y: -140 }, Slider: { x: 210, y: -35 }, ProgressBar: { x: 210, y: 60 },
      Checkbox: { x: 210, y: 145 }, TextInput: { x: 0, y: 270 }
    }
    const sameKindSiblingCount = physicsState.world.entities.filter(/* 先计算 candidate !== entity && candidate.parentUuid === entity.parentUuid；仅当其为真值时求右侧 candidate.hasComponent(kind)，返回短路求值结果。 */ candidate => candidate !== entity && candidate.parentUuid === entity.parentUuid && candidate.hasComponent(kind)).length
    const position = defaultPositions[kind]
    rect.position = { x: position.x + sameKindSiblingCount * 24, y: position.y + sameKindSiblingCount * 20 }
  }
  if (recordHistory) {
    selectEntities([entity.id], 'replace', entity.id)
    pushHistory(`Create UI ${kind}`)
  }
  return entity
}

/** Creates a tilemap host entity; tile collision is generated in merged runtime batches. */
/** 在当前图层创建瓦片地图实体，去除刚体与碰撞组件，选中新实体并记录历史。 */ export function createTileMapEntity(): Entity {
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

/** 序列化原实体并去除实体及组件身份，以新运行身份重建后应用图层和位移、规范化结果。 */ export function cloneEntity(original: Entity, layer = original.layer, offset = { x: 0, y: 0 }): Entity {
  const data = serializeEntity(original) as SceneEntityData
  delete data.uuid
  data.components?.forEach(/** 移除复制数据中的组件稳定身份，确保重建时产生独立身份。 */ component => { delete component.uuid })
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

/** 捕获所选实体子树和内部连接，保存根身份及锚点稳定身份，返回独立可复制数据包。 */ export function captureEntityBundle(ids: number[]): EntityBundle | null {
  const entities = subtreeEntities(ids, physicsState.world.entities)
  if (!entities.length) return null
  const includedIds = new Set(entities.map(/* 返回 entity.id 的当前值。 */ entity => entity.id))
  const includedUuids = new Set(entities.map(/* 返回 entity.uuid 的当前值。 */ entity => entity.uuid))
  const rootUuids = entities
    .filter(/* 先计算 !entity.parentUuid；仅当其为假值时求右侧 !includedUuids.has(entity.parentUuid)，返回短路求值结果。 */ entity => !entity.parentUuid || !includedUuids.has(entity.parentUuid))
    .map(/* 返回 entity.uuid 的当前值。 */ entity => entity.uuid)
  const uuidById = new Map(physicsState.world.entities.map(/* 返回按声明顺序构造的数组 [entity.id, entity.uuid]。 */ entity => [entity.id, entity.uuid]))
  const connections = physicsState.world.connections.flatMap(/** 仅捕获全部锚点都属于复制集合的连接，并记录锚点稳定身份。 */ connection => {
    if (!connection.anchors.every(/* 调用 includedIds.has(anchor.entityId) 并返回调用结果。 */ anchor => includedIds.has(anchor.entityId))) return []
    return [{
      connection: JSON.parse(JSON.stringify(connection)) as Connection,
      anchorUuids: connection.anchors.map(/* 当 uuidById.get(anchor.entityId) 为 null 或 undefined 时返回 ''，否则保留左侧值。 */ anchor => uuidById.get(anchor.entityId) ?? '')
    }]
  })
  return {
    entities: entities.map(/** 将实体序列化后深复制，使剪贴板内容独立于当前对象。 */ entity => JSON.parse(JSON.stringify(serializeEntity(entity))) as SceneEntityData),
    connections,
    rootUuids
  }
}

/** 将当前选择子树保存到实体剪贴板，返回捕获实体数量。 */ export function copySelectedEntities(): number {
  entityClipboard = captureEntityBundle(physicsState.selectedEntityIds)
  return entityClipboard?.entities.length ?? 0
}

/** 为复制包分配实体和实例新身份，重连父子与连接锚点，平移根子树并按选项更新选择和运行时。 */ export function instantiateEntityBundle(
  clipboard: EntityBundle,
  offset: { x: number; y: number },
  rootNameSuffix = ' copy',
  select = true,
  invalidateRuntime = true
): EntityBundleInstance {
  const sourceToClone = new Map<string, Entity>()
  const sourceToRuntimeId = new Map<number, number>()
  const pendingParents = new Map<Entity, string | null>()
  const clonedPrefabInstances = new Map<string, string>()
  const clonedSceneInstances = new Map<string, string>()
  for (const record of clipboard.entities) {
    const sourceUuid = normalizeUuid(record.uuid)
    const sourceRuntimeId = typeof record.id === 'number' ? record.id : null
    const sourceTransform = storedComponent(record, 'Transform2D')
    const sourceParent = typeof sourceTransform?.data?.parentUuid === 'string'
      ? sourceTransform.data.parentUuid
      : null
    const cloneRecord = JSON.parse(JSON.stringify(record)) as SceneEntityData
    delete cloneRecord.uuid
    cloneRecord.components?.forEach(/** 移除组件身份，防止复制实体与源实体共享组件稳定身份。 */ component => { delete component.uuid })
    const clone = createEntityFromData(cloneRecord, physicsState.world.allocateId())
    if (record.prefabInstanceUuid) {
      let instanceUuid = clonedPrefabInstances.get(record.prefabInstanceUuid)
      if (!instanceUuid) {
        instanceUuid = normalizeUuid(undefined)
        clonedPrefabInstances.set(record.prefabInstanceUuid, instanceUuid)
      }
      clone.prefabInstanceUuid = instanceUuid
    }
    clone.prefabLayers = clone.prefabLayers.map(/** 为复制预制体层复用或分配新实例身份，保留层内其他记录。 */ layer => {
      let instanceUuid = clonedPrefabInstances.get(layer.instanceUuid)
      if (!instanceUuid) { instanceUuid = normalizeUuid(undefined); clonedPrefabInstances.set(layer.instanceUuid, instanceUuid) }
      return { ...layer, instanceUuid }
    })
    clone.sceneLayers = clone.sceneLayers.map(/** 为复制场景层复用或分配新实例身份，保留层内其他记录。 */ layer => {
      let instanceUuid = clonedSceneInstances.get(layer.instanceUuid)
      if (!instanceUuid) { instanceUuid = normalizeUuid(undefined); clonedSceneInstances.set(layer.instanceUuid, instanceUuid) }
      return { ...layer, instanceUuid }
    })
    sourceToClone.set(sourceUuid, clone)
    if (sourceRuntimeId !== null) sourceToRuntimeId.set(sourceRuntimeId, clone.id)
    pendingParents.set(clone, sourceParent)
    physicsState.world.entities.push(clone)
  }

  for (const [clone, sourceParent] of pendingParents) {
    clone.parentUuid = sourceParent
      ? sourceToClone.get(sourceParent)?.uuid
        ?? (physicsState.world.entities.some(/* 比较 entity.uuid 与 sourceParent，返回严格相等的判断结果。 */ entity => entity.uuid === sourceParent) ? sourceParent : null)
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
    connection.anchors.forEach(/** 优先按稳定身份查找克隆实体，回退到数字身份映射更新连接锚点。 */ (anchor, index) => {
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

  const pastedRoots = clipboard.rootUuids.flatMap(/** 从源根身份提取成功克隆的根实体，跳过不存在的映射。 */ uuid => {
    const entity = sourceToClone.get(uuid)
    return entity ? [entity] : []
  })
  if (select) selectEntities(pastedRoots.map(/* 返回 entity.id 的当前值。 */ entity => entity.id), 'replace')
  if (invalidateRuntime) physicsState.world.invalidateRuntime()
  return { entities: [...sourceToClone.values()], roots: pastedRoots, sourceToEntity: sourceToClone }
}

/** 实例化当前剪贴板，有实体时记录粘贴历史，并返回新实体。 */ export function pasteEntities(offset = { x: 10, y: -10 }): Entity[] {
  if (!entityClipboard) return []
  const pasted = instantiateEntityBundle(entityClipboard, offset)
  if (pasted.entities.length) pushHistory('Paste entities')
  return pasted.entities
}

/** 捕获当前选择并以默认偏移实例化，有复制结果时记录历史。 */ export function duplicateSelectedEntities(): Entity[] {
  const clipboard = captureEntityBundle(physicsState.selectedEntityIds)
  if (!clipboard) return []
  const pasted = instantiateEntityBundle(clipboard, { x: 10, y: -10 })
  if (pasted.entities.length) pushHistory('Duplicate entities')
  return pasted.entities
}

/** 分配连接身份并按指定实体与模式创建连接模型，追加到当前世界。 */ export function addConnection(entityIds: number[], modes: AnchorMode[] = []): Connection {
  const connection = createConnectionModel(
    physicsState.world.allocateConnectionId(),
    physicsState.world.entities,
    entityIds,
    modes
  )
  physicsState.world.connections.push(connection)
  return connection
}

/** 按运行身份移除对应连接，未找到时不更改世界。 */ export function deleteConnection(connectionId: number): void {
  const index = physicsState.world.connections.findIndex(/* 比较 connection.id 与 connectionId，返回严格相等的判断结果。 */ connection => connection.id === connectionId)
  if (index !== -1) physicsState.world.connections.splice(index, 1)
}

/** 重置连接断裂和受力状态，启用碰撞时重新生成绳索节点。 */ export function repairConnection(connectionId: number): void {
  const connection = physicsState.world.connections.find(/* 比较 candidate.id 与 connectionId，返回严格相等的判断结果。 */ candidate => candidate.id === connectionId)
  if (!connection) return
  connection.breakState = 'intact'
  connection.breakLink = -1
  connection.tension = 0
  connection.strain = 0
  if (connection.collisionEnabled) initializeRopeNodes(connection, physicsState.world.entities)
}

/** 从全部连接删除指定实体锚点，并移除失去有效结构的连接。 */ export function detachEntityFromConnections(entityId: number): void {
  for (let index = physicsState.world.connections.length - 1; index >= 0; index--) {
    const connection = physicsState.world.connections[index]
    connection.anchors = connection.anchors.filter(/* 比较 anchor.entityId 与 entityId，返回严格不等的判断结果。 */ anchor => anchor.entityId !== entityId)
    if (!normalizeConnection(connection, physicsState.world.entities.filter(/* 比较 entity.id 与 entityId，返回严格不等的判断结果。 */ entity => entity.id !== entityId))) {
      physicsState.world.connections.splice(index, 1)
    }
  }
}

/** 仅复制所有锚点都在实体映射中的连接，分配新身份并重映射锚点、清空受力状态。 */ export function duplicateConnections(entityIdMap: Map<number, number>): void {
  const originals = [...physicsState.world.connections]
  for (const original of originals) {
    if (!original.anchors.every(/* 调用 entityIdMap.has(anchor.entityId) 并返回调用结果。 */ anchor => entityIdMap.has(anchor.entityId))) continue
    const clone = JSON.parse(JSON.stringify(original)) as Connection
    clone.id = physicsState.world.allocateConnectionId()
    clone.uuid = normalizeUuid(undefined)
    clone.name = `${original.name} copy`
    clone.anchors.forEach(/** 将 entityIdMap.get(anchor.entityId)! 赋给 anchor.entityId，不显式返回值。 */ anchor => { anchor.entityId = entityIdMap.get(anchor.entityId)! })
    clone.breakState = 'intact'
    clone.tension = 0
    clone.strain = 0
    if (normalizeConnection(clone, physicsState.world.entities)) physicsState.world.connections.push(clone)
  }
}

/** 从规范化候选开始寻找未占用安全整数身份，必要时从一重新搜索，耗尽返回 null。 */ function claimIdentifier(value: unknown, fallback: number, used: Set<number>): number | null {
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

/** 重建实体列表并保证数字身份和稳定身份唯一，同时生成身份映射及最大数字身份。 */ function loadEntities(records: SceneEntityData[]): { entities: Entity[]; maximumId: number; uuidToId: Map<string, number> } {
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

/** 过滤不合法连接记录，分配唯一数字身份、解析锚点实体引用并保留规范化成功的连接。 */ function loadConnections(records: unknown[], entities: Entity[], uuidToId: Map<string, number>): { connections: Connection[]; maximumId: number } {
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

/** 从场景读取有限数值、插值、物理档案和碰撞矩阵，再统一规范化全局设置。 */ function loadGlobalSettings(scene: Record<string, unknown>): void {
  if (!scene.globalSettings || typeof scene.globalSettings !== 'object') return
  const settings = scene.globalSettings as Record<string, unknown>
  physicsState.globalSettings.gravity = finiteNumber(settings.gravity, physicsState.globalSettings.gravity)
  physicsState.globalSettings.airFriction = finiteNumber(settings.airFriction, physicsState.globalSettings.airFriction)
  physicsState.globalSettings.timeScale = finiteNumber(settings.timeScale, physicsState.globalSettings.timeScale)
  physicsState.globalSettings.tickRate = finiteNumber(settings.tickRate, physicsState.globalSettings.tickRate)
  physicsState.globalSettings.maxCatchUpSteps = finiteNumber(settings.maxCatchUpSteps, physicsState.globalSettings.maxCatchUpSteps)
  physicsState.globalSettings.interpolation = settings.interpolation === 'None' ? 'None' : 'Interpolate'
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

/** 规范化物理设置并复制可保存的重力、时间、求解档案及碰撞层矩阵。 */ function serializePhysicsProjectSettings(): Record<string, unknown> {
  normalizeGlobalSettings()
  return {
    gravity: physicsState.globalSettings.gravity,
    airFriction: physicsState.globalSettings.airFriction,
    timeScale: physicsState.globalSettings.timeScale,
    profile: { ...physicsState.globalSettings.profile },
    layers: physicsState.globalSettings.layers.map(/** 构造并返回记录 { ...layer }，字段按当前实参及捕获状态求值。 */ layer => ({ ...layer })),
    collisionMatrix: [...physicsState.globalSettings.collisionMatrix]
  }
}

/** 读取项目级物理设置，从规范化档案同步步频和插值，再规范化碰撞层矩阵。 */ function loadPhysicsProjectSettings(value: unknown): void {
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

/** Recover the authored document if a later hydration/normalization owner rejects it. */
/** 加载前保留运行、选择、场景及历史状态，装载失败且已修改文档时恢复旧文档并保留原错误。 */ export function loadProject(jsonString: string, preserveRuntimeSession = false): boolean {
  const rollback = {
    source: null as string | null,
    mode: physicsState.playMode, running: physicsState.simulationRunning, simulation: simulationSnapshot,
    selected: new Set(selectedEntities().map(/* 返回 entity.uuid 的当前值。 */ entity => entity.uuid)),
    primary: physicsState.world.entities.find(/* 比较 entity.id 与 physicsState.selectedEntityId，返回严格相等的判断结果。 */ entity => entity.id === physicsState.selectedEntityId)?.uuid,
    scenes: new Map(sceneManager.scenes.map(/* 返回按声明顺序构造的数组 [scene.uuid, {externalState:scene.externalState,validationState:scene.validationState,dirty:scene.dirty}]。 */ scene => [scene.uuid, {externalState:scene.externalState,validationState:scene.validationState,dirty:scene.dirty}])),
    navigation: [...sceneManager.navigationHistory], navigationIndex: sceneManager.navigationIndex,
    transactions: [...activeHistoryTransactions], baseline: historyBaseline
  }
  const loaded = hydrateProjectDocument(jsonString, preserveRuntimeSession, /** 将 getSceneJSON() 赋给 rollback.source，不显式返回值。 */ () => { rollback.source = getSceneJSON() })
  if (loaded || rollback.source === null) return loaded
  const failure = editorState.statusText
  if (!hydrateProjectDocument(rollback.source, true)) {
    editorState.statusText = failure + ' Previous document recovery also failed: ' + editorState.statusText
    return false
  }
  physicsState.playMode = rollback.mode; physicsState.simulationRunning = rollback.running; simulationSnapshot = rollback.simulation
  const ids = physicsState.world.entities.filter(/* 调用 rollback.selected.has(entity.uuid) 并返回调用结果。 */ entity => rollback.selected.has(entity.uuid)).map(/* 返回 entity.id 的当前值。 */ entity => entity.id)
  selectEntities(ids, 'replace', physicsState.world.entities.find(/* 比较 entity.uuid 与 rollback.primary，返回严格相等的判断结果。 */ entity => entity.uuid === rollback.primary)?.id ?? ids.at(-1) ?? null)
  for (const scene of sceneManager.scenes) {
    const previous = rollback.scenes.get(scene.uuid)
    if (previous) Object.assign(scene, previous)
  }
  sceneManager.navigationHistory = rollback.navigation
  sceneManager.navigationIndex = rollback.navigationIndex
  activeHistoryTransactions = rollback.transactions
  historyBaseline = rollback.baseline
  editorState.statusText = failure
  return false
}

/** 校验版本与场景数据后加载资源、项目设置和活动世界，恢复有效选择；异常转换为加载失败状态。 */ function hydrateProjectDocument(jsonString: string, preserveRuntimeSession = false, beforeHydrate?: () => void): boolean {
  const selectedUuids = new Set(selectedEntities().map(/* 返回 entity.uuid 的当前值。 */ entity => entity.uuid))
  const primaryUuid = physicsState.world.entities.find(/* 比较 entity.id 与 physicsState.selectedEntityId，返回严格相等的判断结果。 */ entity => entity.id === physicsState.selectedEntityId)?.uuid
  try {
    const preliminary: unknown = JSON.parse(jsonString)
    const preliminaryRecord = !Array.isArray(preliminary) && preliminary && typeof preliminary === 'object' ? preliminary as Record<string, unknown> : null
    const sourceSchema = Number(preliminaryRecord?.formatVersion)
    if (Number.isFinite(sourceSchema) && sourceSchema > NOVA_PROJECT_SCHEMA_VERSION) throw new Error(`Project schema ${sourceSchema} is newer than supported schema ${NOVA_PROJECT_SCHEMA_VERSION}.`)
    const isCurrent = preliminaryRecord?.projectFormat === NOVA_PROJECT_FORMAT && Number(preliminaryRecord.projectFormatMajor) === NOVA_PROJECT_FORMAT_MAJOR && sourceSchema === NOVA_PROJECT_SCHEMA_VERSION
    const parsed: unknown = isCurrent ? preliminary : JSON.parse(physicsState.world.formatProjectJson(jsonString))
    const root = Array.isArray(parsed) ? { entities: parsed } : parsed
    if (!root || typeof root !== 'object') throw new Error(t('invalidProjectRoot'))
    const project = root as Record<string, unknown>
    preflightProjectValues(project)
    const preflightScenes = Array.isArray(project.scenes) ? project.scenes : [project]
    for (const scene of preflightScenes) for (const entity of (scene as {entities: SceneEntityData[]}).entities) {
      const shape = storedShapeType(entity)
      if (shape !== 'Circle' && shape !== 'Box' && shape !== 'Triangle') throw new Error(t('unsupportedShape', {shape: String(shape)}))
    }
    beforeHydrate?.()
    hydrateProjectMetadata(project.projectMetadata)
    hydrateProjectManifest(project.manifest)
    useSaveProject()
    loadAssets(project.assets, project.assetFolders, project.assetDatabase)
    loadPluginManifests(project.plugins)
    loadPackageState(project.packages)
    loadProjectTrash(project.projectTrash)
    const projectSettings = project.projectSettings && typeof project.projectSettings === 'object'
      ? project.projectSettings as Record<string, unknown>
      : {}
    physicsState.inputMap.splice(0, physicsState.inputMap.length, ...normalizeInputMap(projectSettings.inputMap))
    loadDeviceInputSettings(projectSettings.deviceInput)
    Object.assign(physicsState.audioSettings, normalizeAudioSettings(projectSettings.audio))
    loadPhysicsProjectSettings(projectSettings.physics)
    Object.assign(scriptProjectSettings, normalizeScriptSettings(projectSettings.scripting))
    loadRenderingSettings(projectSettings.rendering)
    loadWorldGameplaySettings(projectSettings.world)
    loadProductionSettings(projectSettings.production)
    const presentation = projectSettings.presentation && typeof projectSettings.presentation === 'object' ? projectSettings.presentation as Record<string, unknown> : {}
    loadLocalizationSettings(presentation.localization)
    loadRuntimeAccessibilitySettings(presentation.accessibility)
    loadUiAudioSettings(presentation.uiAudio)
    const sceneRecords = Array.isArray(project.scenes)
      ? project.scenes
      : [{ uuid: normalizeUuid(undefined), name: 'Main Scene', ...project }]
    sceneManager.importProject(sceneRecords, project.activeSceneUuid)
    Object.assign(buildSettings, normalizeBuildSettings(projectSettings.build, sceneManager.scenes.map(/* 返回 scene.uuid 的当前值。 */ scene => scene.uuid)))
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
      ? scene.layers.map(/* 调用 normalizeIdentifier(layer) 并返回调用结果。 */ layer => normalizeIdentifier(layer))
      : entities.map(/* 返回 entity.layer 的当前值。 */ entity => entity.layer)
    const layers = [...new Set([1, ...parsedLayers, ...entities.map(/* 返回 entity.layer 的当前值。 */ entity => entity.layer)])].sort(/* 计算表达式 a - b 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a - b)
    const namedLayers = sceneManager.activeScene.settings.namedLayers
    for (const layer of layers) if (!namedLayers.some(/* 比较 candidate.id 与 layer，返回严格相等的判断结果。 */ candidate => candidate.id === layer)) namedLayers.push({ id: layer, name: `Layer ${layer}`, visible: true, locked: false })
    namedLayers.sort(/* 计算表达式 first.id - second.id 并返回结果，沿用操作数的原有类型规则。 */ (first, second) => first.id - second.id)
    for (const entity of entities) {
      const definition = namedLayers.find(/* 比较 layer.id 与 entity.layer，返回严格相等的判断结果。 */ layer => layer.id === entity.layer)
      if (definition && (!entity.namedLayer || /^Layer \d+$/.test(entity.namedLayer))) entity.namedLayer = definition.name
    }

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

    cancelEditorDrafts()
    cancelPendingProjectMutations()
    const validSelection = entities.filter(/* 调用 selectedUuids.has(entity.uuid) 并返回调用结果。 */ entity => selectedUuids.has(entity.uuid)).map(/* 返回 entity.id 的当前值。 */ entity => entity.id)
    selectEntities(validSelection, 'replace', entities.find(/* 比较 entity.uuid 与 primaryUuid，返回严格相等的判断结果。 */ entity => entity.uuid === primaryUuid)?.id ?? validSelection.at(-1) ?? null)
    return true
  } catch (error) {
    console.error('Failed to load project', error)
    editorState.statusText = t('loadFailed', { message: error instanceof Error ? error.message : t('unknownError') })
    return false
  }
}

/** 序列化当前场景管理器及项目设置并重新加载，成功后恢复仍有效的有限导航历史。 */ function reloadSceneManagerProject(preserveRuntimeSession = false): boolean {
  const navigationHistory = [...sceneManager.navigationHistory]
  const navigationIndex = sceneManager.navigationIndex
  const source = JSON.stringify({
    projectFormat: NOVA_PROJECT_FORMAT,
    projectFormatMajor: NOVA_PROJECT_FORMAT_MAJOR,
    formatVersion: physicsState.world.projectFormatVersion,
    engineVersion: physicsState.world.projectEngineVersion,
    compatibility: projectCompatibility(),
    projectMetadata: serializeProjectMetadata(),
    manifest: serializeProjectManifest(),
    assets: serializeAssets(),
    assetFolders: serializeAssetFolders(),
    assetDatabase: serializeAssetDatabaseSettings(),
    plugins: serializePluginManifests(),
    packages: serializePackageState(),
    projectSettings: { inputMap: normalizeInputMap(physicsState.inputMap), deviceInput: serializeDeviceInputSettings(), audio: normalizeAudioSettings(physicsState.audioSettings), physics: serializePhysicsProjectSettings(), build: serializeBuildSettings(sceneManager.scenes.map(/* 返回 scene.uuid 的当前值。 */ scene => scene.uuid)), scripting: serializeScriptSettings(), rendering: serializeRenderingSettings(), world: serializeWorldGameplaySettings(), presentation: { localization: serializeLocalizationSettings(), accessibility: serializeRuntimeAccessibilitySettings(), uiAudio: serializeUiAudioSettings() }, production: serializeProductionSettings() },
    activeSceneUuid: sceneManager.activeSceneUuid,
    scenes: sceneManager.serialize()
  })
  const loaded = loadProject(source, preserveRuntimeSession)
  if (loaded) {
    const known = new Set(sceneManager.scenes.map(/* 返回 scene.uuid 的当前值。 */ scene => scene.uuid))
    sceneManager.navigationHistory = navigationHistory.filter(/* 调用 known.has(uuid) 并返回调用结果。 */ uuid => known.has(uuid)).slice(-100)
    if (!sceneManager.navigationHistory.length) sceneManager.navigationHistory = [sceneManager.activeSceneUuid]
    sceneManager.navigationIndex = Math.min(sceneManager.navigationHistory.length - 1, Math.max(0, navigationIndex))
  }
  return loaded
}

/** 结算编辑后捕获当前场景、清空选择和纹理，创建并切换新场景后重建项目世界。 */ export function createScene(name?: string): boolean {
  if (!settlePendingDocumentEdits()) return false
  selectEntities([], 'replace')
  clearRenderTextures()
  sceneManager.captureActive(serializeActiveScene())
  const scene = sceneManager.create(name)
  sceneManager.setActive(scene.uuid)
  return reloadSceneManagerProject()
}

/** 验证目标场景并结算编辑，保存当前场景后切换目标并重新加载世界。 */ export function setActiveScene(uuid: string): boolean {
  if (uuid === sceneManager.activeSceneUuid) return true
  if (!sceneManager.scenes.some(/* 比较 scene.uuid 与 uuid，返回严格相等的判断结果。 */ scene => scene.uuid === uuid) || !settlePendingDocumentEdits()) return false
  selectEntities([], 'replace')
  clearRenderTextures()
  sceneManager.captureActive(serializeActiveScene())
  if (!sceneManager.setActive(uuid)) return false
  return reloadSceneManagerProject()
}

/** Navigate only after the outgoing world's drafts have reached their original scene. */
/** 验证历史导航目标并结算编辑，捕获当前场景后移动历史位置并重建世界。 */ export function navigateScene(offset: -1 | 1): boolean {
  const index = sceneManager.navigationIndex + offset
  const uuid = sceneManager.navigationHistory[index]
  if (!uuid || !sceneManager.scenes.some(/* 比较 scene.uuid 与 uuid，返回严格相等的判断结果。 */ scene => scene.uuid === uuid) || !settlePendingDocumentEdits()) return false
  sceneManager.captureActive(serializeActiveScene())
  if (!sceneManager.navigate(offset)) return false
  selectEntities([], 'replace')
  clearRenderTextures()
  return reloadSceneManagerProject()
}

/** 结算编辑并清空选择和渲染纹理，再从场景管理器重新加载项目。 */ export function reloadActiveScene(): boolean {
  if (!settlePendingDocumentEdits()) return false
  selectEntities([], 'replace')
  clearRenderTextures()
  return reloadSceneManagerProject()
}

/** 验证加载开关和场景身份，结算编辑并捕获场景后更新加载状态、重建世界。 */ export function setSceneLoaded(uuid: string, loaded: boolean): boolean {
  if (typeof loaded !== 'boolean') return false
  if (!sceneManager.scenes.some(/* 比较 scene.uuid 与 uuid，返回严格相等的判断结果。 */ scene => scene.uuid === uuid) || !settlePendingDocumentEdits()) return false
  sceneManager.captureActive(serializeActiveScene())
  if (!sceneManager.setLoaded(uuid, loaded)) return false
  return reloadSceneManagerProject()
}

/** Runtime-only scene switch. Persistent entities retain their UUID and state. */
/** 准备可提交的运行时场景切换，提供实体构造、全局设置与选择图层视图的捕获恢复适配器。 */ export function prepareRuntimeSceneTransition(identifier?: string): PreparedRuntimeSceneTransition {
  return prepareSceneTransition({
    scenes: sceneManager, world: physicsState.world, origin: /** 构造并返回记录 { ...worldGameplayState.originOffset }，字段按当前实参及捕获状态求值。 */ () => ({ ...worldGameplayState.originOffset }),
    createEntity: /* 调用 createEntityFromData(record, id) 并返回调用结果。 */ (record, id) => createEntityFromData(record, id),
    captureView: /** 深复制全局物理设置并保存图层和选择，供场景切换失败时恢复。 */ () => ({ settings: JSON.parse(JSON.stringify(physicsState.globalSettings)) as GlobalPhysicsSettings, layers: [...editorState.layers], activeLayer: editorState.activeLayer, renderLayer: editorState.renderLayer, selection: [...physicsState.selectedEntityIds], selected: physicsState.selectedEntityId }),
    restoreView: /** 恢复场景切换前的全局设置、图层和实体选择。 */ view => { Object.assign(physicsState.globalSettings, view.settings); editorState.layers.splice(0, editorState.layers.length, ...view.layers); editorState.activeLayer = view.activeLayer; editorState.renderLayer = view.renderLayer; physicsState.selectedEntityIds.splice(0, physicsState.selectedEntityIds.length, ...view.selection); physicsState.selectedEntityId = view.selected },
    applyView: /** 根据新场景及实体建立合法图层，加载场景设置并过滤不存在的选择。 */ (scene, entities) => {
      const layers = [...new Set([1, ...(Array.isArray(scene.layers) ? scene.layers.map(/* 调用 normalizeIdentifier(layer) 并返回调用结果。 */ layer => normalizeIdentifier(layer)) : []), ...entities.map(/* 返回 entity.layer 的当前值。 */ entity => entity.layer)])].sort(/* 计算表达式 a - b 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a - b)
      editorState.layers.splice(0, editorState.layers.length, ...layers)
      loadGlobalSettings(scene)
      const activeLayer = normalizeIdentifier(scene.activeLayer, layers[0]), renderLayer = normalizeIdentifier(scene.renderLayer, layers[0])
      editorState.activeLayer = layers.includes(activeLayer) ? activeLayer : layers[0]
      editorState.renderLayer = scene.renderLayer === 'all' || !layers.includes(renderLayer) ? 'all' : renderLayer
      selectEntities(physicsState.selectedEntityIds.filter(/** 仅保留新场景实体列表中仍存在的选择身份。 */ id => entities.some(/* 比较 entity.id 与 id，返回严格相等的判断结果。 */ entity => entity.id === id)), 'replace', physicsState.selectedEntityId)
    }
  }, identifier)
}

/** 准备并提交指定运行时场景，失败时显示原因并返回 false。 */ export function runtimeLoadScene(identifier: string): boolean {
  try { return prepareRuntimeSceneTransition(identifier).commit() } catch (error) { editorState.statusText = `Runtime scene preparation failed: ${error instanceof Error ? error.message : String(error)}`; return false }
}
/** 准备并提交当前运行时场景的重新加载，失败时更新状态提示。 */ export function runtimeReloadScene(): boolean {
  try { return prepareRuntimeSceneTransition().commit() } catch (error) { editorState.statusText = `Runtime scene preparation failed: ${error instanceof Error ? error.message : String(error)}`; return false }
}

/** 播放前结算文档编辑，并按预览选项检查工作室草稿是否已保存。 */ function settlePlaybackEdits(allowStudioDrafts = false): boolean {
  if (!settlePendingDocumentEdits()) return false
  if (!allowStudioDrafts) {
    try { assertStudioDraftsSaved() } catch (error) {
      editorState.statusText = error instanceof Error ? error.message : String(error)
      notify(editorState.statusText, 'error')
      return false
    }
  }
  return true
}

/** Asset preview owners may retain drafts while previewing an explicitly selected asset. */
/** 首次播放前结算编辑并保存恢复快照，切换运行标记以及播放、暂停或编辑状态。 */ export function toggleSimulation(state: boolean, options: { assetPreview?: boolean } = {}): boolean {
  if (state && physicsState.playMode === 'editing' && !settlePlaybackEdits(options.assetPreview === true)) return false
  if (state && !physicsState.simulationRunning && simulationSnapshot === null) {
    simulationSnapshot = getSceneJSON()
    beginPhysicsMonitorSession()
  }
  physicsState.simulationRunning = state
  physicsState.playMode = state ? 'playing' : simulationSnapshot === null ? 'editing' : 'paused'
  return true
}

/** 停止仿真并恢复编辑模式，存在播放前快照时重新加载该文档。 */ export function resetSimulation(): void {
  const snapshot = simulationSnapshot
  physicsState.simulationRunning = false
  physicsState.playMode = 'editing'
  simulationSnapshot = null
  if (snapshot) loadProject(snapshot)
}

/** 结算首次步进前编辑并保存恢复快照，在暂停状态执行一个物理步并更新诊断。 */ export function singleStepSimulation(): boolean {
  if (physicsState.playMode === 'editing' && !settlePlaybackEdits()) return false
  physicsState.simulationRunning = false
  if (simulationSnapshot === null) simulationSnapshot = getSceneJSON()
  physicsState.playMode = 'paused'
  Object.assign(physicsState.engineDiagnostics, physicsState.world.singleStep(physicsState.globalSettings))
  return true
}

/** 执行时调用 resetSimulation()；不显式返回调用结果。 */ export function stopPlayMode(): void {
  resetSimulation()
}

/* 比较 simulationSnapshot 与 null，返回严格不等的判断结果。 */ export function hasRuntimeSession(): boolean {
  return simulationSnapshot !== null
}

/** 结算编辑并检查只读状态，选择原生事务、浏览器文件或下载保存通道，成功后更新手动保存与外部变更基线。 */ export async function saveProject(): Promise<boolean> {
  if (!settlePendingDocumentEdits()) return false
  assertStudioDraftsSaved()
  const jsonString = stableProjectText(getSceneJSON())
  if (recoveryState.readOnly) throw new Error('This project is open read-only. Use Open as copy or choose a new writable project folder.')
  const nativeSink = await createNativeProjectTransactionSink()
  if (nativeSink) {
    await commitProjectTransaction(jsonString, { label: 'Save project', scopes: [...projectTransactionState.unsavedScopes], sink: nativeSink })
  } else if ('showSaveFilePicker' in window) {
    const saveState: { staged: { write: (value: string) => Promise<void>; close: () => Promise<void>; abort?: () => Promise<void> } | null } = { staged: null }
    try {
      const handle = await (window as unknown as { showSaveFilePicker: (options: unknown) => Promise<{ createWritable: () => Promise<{ write: (value: string) => Promise<void>; close: () => Promise<void>; abort?: () => Promise<void> }> }> }).showSaveFilePicker({ suggestedName: 'project.nova', types: [{ description: 'Nova_A Project', accept: { 'application/json': ['.nova', '.json'] } }] })
      await commitProjectTransaction(jsonString, { label: 'Save project', scopes: [...projectTransactionState.unsavedScopes], sink: {
        kind: 'browser-file', writable: true, destination: 'project.nova',
        /** 从保存事务提取项目文本，写入浏览器文件并关闭句柄，成功后清空暂存引用。 */ async write(files) {
          const project = files.find(/* 比较 file.path 与 'project.nova'，返回严格相等的判断结果。 */ file => file.path === 'project.nova'); if (!project) throw new Error('The project transaction did not contain project.nova.')
          saveState.staged = await handle.createWritable(); await saveState.staged.write(project.contents); await saveState.staged.close(); saveState.staged = null
        }
      } })
    } catch (error) {
      if (saveState.staged?.abort) try { await saveState.staged.abort() } catch { /* Preserve the original transaction error. */ }
      if (error instanceof DOMException && error.name === 'AbortError') return false
      throw error
    }
  } else {
    await commitProjectTransaction(jsonString, { label: 'Save project', scopes: [...projectTransactionState.unsavedScopes], sink: {
      kind: 'download', writable: true, destination: 'project.nova',
      /** 从保存事务提取项目文本，创建临时地址触发文件下载，随后释放地址。 */ async write(files) {
        const project = files.find(/* 比较 file.path 与 'project.nova'，返回严格相等的判断结果。 */ file => file.path === 'project.nova'); if (!project) throw new Error('The project transaction did not contain project.nova.')
        const url = URL.createObjectURL(new Blob([project.contents], { type: 'application/json' })), anchor = document.createElement('a')
        anchor.href = url; anchor.download = 'project.nova'; anchor.click(); window.setTimeout(/* 调用 URL.revokeObjectURL(url) 并返回调用结果。 */ () => URL.revokeObjectURL(url), 0)
      }
    } })
  }
  const { suppressSelfProjectChange } = await import('../runtime/projectExternalChanges')
  suppressSelfProjectChange(jsonString)
  markSourceBaseline(jsonString)
  recordManualSave()
  sceneManager.markSaved()
  syncHistoryState()
  return true
}

/** 停止仿真并清空实体连接，失效运行时、清空选择并重置数字身份计数。 */ export function clearScene(): void {
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

/** 删除全部选择子树并先清除关联连接，恢复编辑选择状态，空世界重置身份计数。 */ export function deleteSelected(): void {
  const ids = new Set(subtreeEntities(physicsState.selectedEntityIds, physicsState.world.entities).map(/* 返回 entity.id 的当前值。 */ entity => entity.id))
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

/** 删除指定实体及其子树和关联连接，再过滤已删除对象的选择。 */ export function deleteEntity(id: number): void {
  const ids = new Set(subtreeEntities([id], physicsState.world.entities).map(/* 返回 entity.id 的当前值。 */ entity => entity.id))
  if (!ids.size) return
  for (const entityId of ids) detachEntityFromConnections(entityId)
  for (let index = physicsState.world.entities.length - 1; index >= 0; index--) {
    if (ids.has(physicsState.world.entities[index].id)) physicsState.world.entities.splice(index, 1)
  }
  const selection = physicsState.selectedEntityIds.filter(/* 返回 ids.has(entityId) 的逻辑取反结果。 */ entityId => !ids.has(entityId))
  selectEntities(selection, 'replace')
}

/** 恢复编辑摄像机缩放和目标状态，将原点偏移设置到首个画布中心。 */ export function resetCamera(): void {
  physicsState.camera.scale = 40
  physicsState.camera.targetScale = null
  physicsState.camera.targetOffset = null
  const canvas = document.querySelector('canvas')
  physicsState.camera.offset = canvas
    ? { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 }
    : { x: 0, y: 0 }
}

/** 将指定实体移至绘制列表末尾，缺失时保持原状态。 */ export function moveToFront(id: number): void {
  const index = physicsState.world.entities.findIndex(/* 比较 entity.id 与 id，返回严格相等的判断结果。 */ entity => entity.id === id)
  if (index === -1) return
  const [entity] = physicsState.world.entities.splice(index, 1)
  physicsState.world.entities.push(entity)
}

/** 将指定实体移至绘制列表开头，缺失时保持原状态。 */ export function moveToBack(id: number): void {
  const index = physicsState.world.entities.findIndex(/* 比较 entity.id 与 id，返回严格相等的判断结果。 */ entity => entity.id === id)
  if (index === -1) return
  const [entity] = physicsState.world.entities.splice(index, 1)
  physicsState.world.entities.unshift(entity)
}

/** 捕获实体子树包并按默认偏移实例化，返回首个克隆或 null。 */ export function duplicateEntity(id: number): Entity | null {
  const clipboard = captureEntityBundle([id])
  if (!clipboard) return null
  const clone = instantiateEntityBundle(clipboard, { x: 10, y: -10 }).entities[0] ?? null
  return clone
}

const commandHistory = new CommandHistory(500, 64 * 1024 * 1024)
let historyBaseline: string | null = null
let applyingHistory = false
let activeHistoryTransactions: Array<{ label: string; mergeKey: string | null; affectedResource: string; before: string }> = []
export const historyState = reactive({
  length: 0,
  index: -1,
  canUndo: false,
  canRedo: false,
  undoLabel: null as string | null,
  redoLabel: null as string | null,
  entries: [] as Array<{ id: string; label: string; timestamp: string; affectedResource: string; scope: string; byteSize: number; applied: boolean }>,
  memoryBytes: 0,
  memoryBudgetBytes: commandHistory.memoryBudgetBytes,
  lastClearReason: commandHistory.lastClearReason,
  dirty: false
})

const AUTOSAVE_KEY = 'nova_a.autosave.v2'
let autosaveTimer: number | null = null

/** 安全读取本地自动保存文本，存储不可用或失败返回 null。 */ function readAutosave(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage.getItem(AUTOSAVE_KEY)
  } catch {
    return null
  }
}

export const autosaveState = reactive({ available: readAutosave() !== null })

/** 启用自动保存时重置防抖计时，在配置间隔后保存当前项目和恢复快照。 */ function scheduleAutosave(): void {
  if (!preferencesState.autosave || typeof window === 'undefined') return
  if (autosaveTimer !== null) window.clearTimeout(autosaveTimer)
  autosaveTimer = window.setTimeout(/** 保存当前项目至本地及恢复快照，写入失败只记录警告，最后释放计时句柄。 */ () => {
    try {
      const source = getSceneJSON()
      localStorage.setItem(AUTOSAVE_KEY, source)
      storeRecoverySnapshot(source, 'autosave')
      autosaveState.available = true
    } catch (error) {
      console.warn('Nova_A could not write the local autosave.', error)
    }
    autosaveTimer = null
  }, preferencesState.autosaveInterval * 1000)
}

/** 更新自动保存可用状态，有内容时通过正常项目加载入口恢复。 */ export function restoreAutosave(): boolean {
  const value = readAutosave()
  autosaveState.available = value !== null
  return value ? loadProject(value) : false
}

/* 返回 autosaveState.available 的当前值。 */ export function hasAutosave(): boolean {
  return autosaveState.available
}

/** 同步撤销栈状态和内存用量，结合未保存作用域及手动基线摘要更新脏标记。 */ function syncHistoryState(): void {
  historyState.length = commandHistory.length
  historyState.index = commandHistory.index
  historyState.canUndo = commandHistory.canUndo
  historyState.canRedo = commandHistory.canRedo
  historyState.undoLabel = commandHistory.undoLabel
  historyState.redoLabel = commandHistory.redoLabel
  historyState.entries.splice(0, historyState.entries.length, ...commandHistory.entries)
  historyState.memoryBytes = commandHistory.memoryBytes
  historyState.lastClearReason = commandHistory.lastClearReason
  try { historyState.dirty = projectTransactionState.unsavedScopes.length > 0 || Boolean(projectTransactionState.lastManualChecksum) && projectChecksum(getSceneJSON()) !== projectTransactionState.lastManualChecksum } catch { historyState.dirty = projectTransactionState.unsavedScopes.length > 0 }
  if (!historyState.dirty) projectTransactionState.unsavedScopes.splice(0)
}

/** Keep non-command editor navigation from becoming the implicit undo target. */
/** 仅在普通编辑状态更新历史文档基线，避免历史恢复期间覆盖基线。 */ export function synchronizeHistoryBaseline(): void {
  if (physicsState.playMode !== 'editing' || applyingHistory) return
  historyBaseline = getSceneJSON()
  syncHistoryState()
}

/** 取消未提交草稿后恢复历史文档，保留场景外部状态及仍有效导航，并用重入标记保护恢复过程。 */ function applyHistoryDocument(document: string): void {
  const externalStates = new Map(sceneManager.scenes.map(/* 返回按声明顺序构造的数组 [scene.uuid, {externalState: scene.externalState, validationState: scene.validationState}]。 */ scene => [scene.uuid, {externalState: scene.externalState, validationState: scene.validationState}]))
  const navigation = [...sceneManager.navigationHistory], navigationIndex = sceneManager.navigationIndex
  cancelEditorDrafts()
  cancelPendingProjectMutations()
  applyingHistory = true
  try {
    if (!loadProject(document)) throw new Error('History document could not be restored.')
    for (const scene of sceneManager.scenes) {
      const external = externalStates.get(scene.uuid)
      if (external) Object.assign(scene, external)
    }
    sceneManager.navigationHistory = navigation.filter(/** 只保留历史恢复后仍存在场景的导航身份。 */ uuid => sceneManager.scenes.some(/* 比较 scene.uuid 与 uuid，返回严格相等的判断结果。 */ scene => scene.uuid === uuid))
    if (!sceneManager.navigationHistory.length) sceneManager.navigationHistory = [sceneManager.activeSceneUuid]
    sceneManager.navigationIndex = Math.min(navigationIndex, sceneManager.navigationHistory.length - 1)
    historyBaseline = getSceneJSON()
  } finally {
    applyingHistory = false
  }
}

/** 依据操作标签关键词推断修改作用域，用于脏状态和资源历史分类。 */ function commandScope(label: string): ProjectMutationScope {
  const value = label.toLowerCase()
  if (/asset|import|prefab|folder|sprite|texture|material|shader/.test(value)) return 'asset'
  if (/script|code|rhai/.test(value)) return 'script'
  if (/animat|keyframe|timeline|controller/.test(value)) return 'animation'
  if (/ui|canvas|layout|widget|presentation|localization/.test(value)) return 'ui'
  if (/package|plugin/.test(value)) return 'packages'
  if (/build|preset|export/.test(value)) return 'build'
  if (/setting|physics layer|input|audio|render/.test(value)) return 'settings'
  return 'scene'
}

/** 在编辑模式比较序列化文档基线，提交实际变化或更新活动事务，标记脏状态并安排自动保存。 */ export function pushHistory(label = 'Edit scene', mergeKey: string | null = null, affectedResource = 'project.nova'): void {
  if (physicsState.playMode !== 'editing' || applyingHistory) return
  const stateString = getSceneJSON()
  if (activeHistoryTransactions.length) { historyBaseline = stateString; scheduleAutosave(); return }
  if (historyBaseline === null) {
    historyBaseline = stateString
    syncHistoryState()
    scheduleAutosave()
    return
  }
  if (historyBaseline === stateString) return
  const scope = commandScope(label)
  commandHistory.commit(new DocumentMutationCommand({
    label,
    before: historyBaseline,
    after: stateString,
    apply: applyHistoryDocument,
    mergeKey,
    affectedResource,
    scope
  }), true)
  markProjectDirty(scope)
  if (scope === 'scene' || scope === 'asset') sceneManager.markDirty()
  historyBaseline = stateString
  syncHistoryState()
  scheduleAutosave()
  window.setTimeout(/* 调用 refreshSourceStatus(getSceneJSON()) 并返回调用结果。 */ () => refreshSourceStatus(getSceneJSON()), 0)
}

/** Settle valid drafts and implicit edits before a document/history boundary. */
/** 提交有效控件草稿和待处理修改，记录文档差异并关闭活动事务，非法草稿返回 false。 */ export function settlePendingDocumentEdits(): boolean {
  if (applyingHistory || physicsState.playMode !== 'editing') return true
  if (!settleEditorDrafts()) return false
  flushPendingProjectMutations()
  cancelPendingProjectMutations()
  pushHistory('Commit pending property edits')
  while (activeHistoryTransactions.length) commitHistoryTransaction()
  return true
}

/** Groups any number of document mutations into one named, reversible command. */
/** 仅在编辑且非历史恢复状态开启事务，最外层先结算待处理编辑，再保存事务前文档。 */ export function beginHistoryTransaction(label: string, mergeKey: string | null = null, affectedResource = mergeKey ?? 'project.nova'): boolean {
  if (physicsState.playMode !== 'editing' || applyingHistory) return false
  if (!activeHistoryTransactions.length && !settlePendingDocumentEdits()) return false
  const before = getSceneJSON(); if (historyBaseline === null) historyBaseline = before
  activeHistoryTransactions.push({ label: label.trim().slice(0, 160) || 'Edit scene', mergeKey, affectedResource, before })
  return true
}

/** 先序列化验证当前文档再出栈，嵌套事务只更新基线，最外层提交单个历史命令和脏状态。 */ export function commitHistoryTransaction(): boolean {
  const transaction = activeHistoryTransactions[activeHistoryTransactions.length - 1]; if (!transaction) return false
  // Serialization can reject a malformed draft; retain the transaction for correction/cancel.
  const after = getSceneJSON()
  activeHistoryTransactions.pop()
  historyBaseline = after
  if (activeHistoryTransactions.length) { scheduleAutosave(); return true }
  if (after === transaction.before) { syncHistoryState(); return false }
  const scope = commandScope(transaction.label)
  commandHistory.commit(new DocumentMutationCommand({ label: transaction.label, before: transaction.before, after, apply: applyHistoryDocument, mergeKey: transaction.mergeKey, scope, affectedResource: transaction.affectedResource }), true)
  markProjectDirty(scope)
  if (scope === 'scene' || scope === 'asset') sceneManager.markDirty()
  syncHistoryState(); scheduleAutosave(); window.setTimeout(/* 调用 refreshSourceStatus(getSceneJSON()) 并返回调用结果。 */ () => refreshSourceStatus(getSceneJSON()), 0); return true
}

/** 先恢复最内层事务前文档，成功后移除事务并同步历史状态。 */ export function cancelHistoryTransaction(): boolean {
  const transaction = activeHistoryTransactions[activeHistoryTransactions.length - 1]; if (!transaction) return false
  applyHistoryDocument(transaction.before); activeHistoryTransactions.pop(); syncHistoryState(); return true
}

/** 清空命令和活动事务并更新文档基线，按需建立手动保存基线。 */ export function clearEditorHistory(reason = 'project-open', source = getSceneJSON(), establishManualBaseline = true): void {
  commandHistory.clear(reason); activeHistoryTransactions = []; historyBaseline = source; if (establishManualBaseline) markTransactionBaseline(source); syncHistoryState()
}

/** 先结算待处理编辑，再撤销一条命令并刷新历史、状态提示及源码状态。 */ export function undo(): void {
  if (!settlePendingDocumentEdits()) return
  if (!commandHistory.undo()) return
  syncHistoryState()
  editorState.statusText = t('undoSuccess')
  window.setTimeout(/* 调用 refreshSourceStatus(getSceneJSON()) 并返回调用结果。 */ () => refreshSourceStatus(getSceneJSON()), 0)
}

/** 先结算待处理编辑，再重做一条命令并刷新历史、状态提示及源码状态。 */ export function redo(): void {
  if (!settlePendingDocumentEdits()) return
  if (!commandHistory.redo()) return
  syncHistoryState()
  editorState.statusText = t('redoSuccess')
  window.setTimeout(/* 调用 refreshSourceStatus(getSceneJSON()) 并返回调用结果。 */ () => refreshSourceStatus(getSceneJSON()), 0)
}

setProjectMutationRecorder(/** 仅在编辑状态把项目修改通知转换为带合并键和资源定位的历史记录。 */ (label, mergeKey, resource) => {
  if (physicsState.playMode === 'editing') pushHistory(label, mergeKey, resource)
})
