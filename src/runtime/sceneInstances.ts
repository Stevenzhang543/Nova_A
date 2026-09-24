/** 场景实例关系：维护嵌套场景来源与实例化记录。 */
import { assetReference, createTextAsset, readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import {
  captureEntityBundle,
  instantiateEntityBundle,
  physicsState,
  pushHistory,
  type EntityBundle
} from '../store/physics'
import type { Entity } from '../world/Entity'
import { normalizeUuid } from '../world/identity'
import type { Vec2 } from '../world/types'
import { translateEntityTree, worldTransform } from '../world/hierarchy'

export interface SceneAssetDocument {
  sceneAssetVersion: 1
  name: string
  bundle: EntityBundle
}

/** 结构说明（自动提取）：clone；输入 value；直接调用 JSON.parse、JSON.stringify。 */ function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T }

/** 结构说明（自动提取）：sceneDocument；输入 reference；直接调用 resolveAsset、readTextAsset、JSON.parse、Array.isArray、assetReference。 */ function sceneDocument(reference: string): { reference: string; document: SceneAssetDocument } | null {
  const asset = resolveAsset(reference)
  const source = readTextAsset(reference)
  if (!asset || asset.assetType !== 'scene' || !source) return null
  try {
    const document = JSON.parse(source) as Partial<SceneAssetDocument>
    if (document.sceneAssetVersion !== 1 || !document.bundle || !Array.isArray(document.bundle.entities) || !Array.isArray(document.bundle.rootUuids)) return null
    return { reference: assetReference(asset.uuid), document: document as SceneAssetDocument }
  } catch { return null }
}

/** 结构说明（自动提取）：createSceneAssetFromEntities；输入 entityIds、requestedName；直接调用 captureEntityBundle、slice、requestedName.trim、clone、createTextAsset 等。 */ export function createSceneAssetFromEntities(entityIds: number[], requestedName = 'Instanced Scene'): string | null {
  const bundle = captureEntityBundle(entityIds)
  if (!bundle) return null
  const document: SceneAssetDocument = { sceneAssetVersion: 1, name: requestedName.trim().slice(0, 80) || 'Instanced Scene', bundle: clone(bundle) }
  const asset = createTextAsset(document.name, 'scene', JSON.stringify(document, null, 2), 'Assets/Scenes')
  pushHistory('Create scene asset')
  return assetReference(asset.uuid)
}

/** 结构说明（自动提取）：instantiateSceneAsset；输入 reference、position、select、invalidateRuntime；直接调用 sceneDocument、instantiateEntityBundle、normalizeUuid、entity.sceneLayers.push、worldTransform 等；返回路径包含 instance.entities；包含循环处理。 */ export function instantiateSceneAsset(reference: string, position?: Vec2, select = true, invalidateRuntime = true): Entity[] {
  const stored = sceneDocument(reference)
  if (!stored) return []
  const instance = instantiateEntityBundle(stored.document.bundle, { x: 0, y: 0 }, '', select, invalidateRuntime)
  const instanceUuid = normalizeUuid(undefined)
  for (const [sourceUuid, entity] of instance.sourceToEntity) {
    entity.sceneLayers.push({ asset: stored.reference, instanceUuid, sourceUuid })
  }
  if (position && instance.roots.length) {
    const origin = worldTransform(instance.roots[0], physicsState.world.entities).position
    const delta = { x: position.x - origin.x, y: position.y - origin.y }
    for (const root of instance.roots) translateEntityTree(root, delta, physicsState.world.entities)
  }
  return instance.entities
}

/** 结构说明（自动提取）：sceneInstanceEntities；输入 entity；直接调用 physicsState.world.entities.filter。 */ export function sceneInstanceEntities(entity: Entity): Entity[] {
  const layer = entity.sceneLayers[entity.sceneLayers.length - 1]
  if (!layer) return []
  return physicsState.world.entities.filter(/* 比较 candidate.sceneLayers[candidate.sceneLayers.length - 1]?.instanceUuid 与 layer.instanceUuid，返回严格相等的判断结果。 */ candidate => candidate.sceneLayers[candidate.sceneLayers.length - 1]?.instanceUuid === layer.instanceUuid)
}

/** 结构说明（自动提取）：unpackSceneInstance；输入 entity；直接调用 sceneInstanceEntities、candidate.sceneLayers.pop、pushHistory；包含循环处理。 */ export function unpackSceneInstance(entity: Entity): boolean {
  const entities = sceneInstanceEntities(entity)
  if (!entities.length) return false
  for (const candidate of entities) candidate.sceneLayers.pop()
  pushHistory('Unpack scene instance')
  return true
}
