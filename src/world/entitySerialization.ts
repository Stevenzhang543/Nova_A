/** Unique authoring serialization shared by Editor and Runtime. */
import { Entity, type AuthoringMetadata2D } from './Entity'
import { normalizeEntity } from './geometry'
import { Camera2D, Collider2D, RigidBody2D, Script2D, ShapeRenderer2D, SpriteRenderer2D, TextRenderer2D, copyComponentValues, type Component2D } from './components'
import { Transform } from './Transform'

function serializeComponent(component: Component2D): Record<string, unknown> {
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
      // 26.45: written only when set, so existing projects keep their files unchanged.
      ...(component.surfaceSpeed ? { surfaceSpeed: component.surfaceSpeed } : {}),
      ...(component.rollingResistance ? { rollingResistance: component.rollingResistance } : {}),
      materialAsset: component.materialAsset,
      material: { ...component.material }
    })
  } else {
    Object.assign(data, copyComponentValues(component))
  }
  return { uuid: component.uuid, kind: component.kind, enabled: component.enabled, removed: component.removed, data }
}

function entityAuthoringData(entity: Entity): Record<string, unknown> {
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

export function serializeEntity(entity: Entity): Record<string, unknown> {
  normalizeEntity(entity)
  return entityAuthoringData(entity)
}

export function readEntityAuthoringData(entity: Entity): Record<string, unknown> {
  return JSON.parse(JSON.stringify(entityAuthoringData(entity))) as Record<string, unknown>
}
