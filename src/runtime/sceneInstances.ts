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

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T }

function sceneDocument(reference: string): { reference: string; document: SceneAssetDocument } | null {
  const asset = resolveAsset(reference)
  const source = readTextAsset(reference)
  if (!asset || asset.assetType !== 'scene' || !source) return null
  try {
    const document = JSON.parse(source) as Partial<SceneAssetDocument>
    if (document.sceneAssetVersion !== 1 || !document.bundle || !Array.isArray(document.bundle.entities) || !Array.isArray(document.bundle.rootUuids)) return null
    return { reference: assetReference(asset.uuid), document: document as SceneAssetDocument }
  } catch { return null }
}

export function createSceneAssetFromEntities(entityIds: number[], requestedName = 'Instanced Scene'): string | null {
  const bundle = captureEntityBundle(entityIds)
  if (!bundle) return null
  const document: SceneAssetDocument = { sceneAssetVersion: 1, name: requestedName.trim().slice(0, 80) || 'Instanced Scene', bundle: clone(bundle) }
  const asset = createTextAsset(document.name, 'scene', JSON.stringify(document, null, 2), 'Assets/Scenes')
  pushHistory('Create scene asset')
  return assetReference(asset.uuid)
}

export function instantiateSceneAsset(reference: string, position?: Vec2, select = true, invalidateRuntime = true): Entity[] {
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

export function sceneInstanceEntities(entity: Entity): Entity[] {
  const layer = entity.sceneLayers[entity.sceneLayers.length - 1]
  if (!layer) return []
  return physicsState.world.entities.filter(candidate => candidate.sceneLayers[candidate.sceneLayers.length - 1]?.instanceUuid === layer.instanceUuid)
}

export function unpackSceneInstance(entity: Entity): boolean {
  const entities = sceneInstanceEntities(entity)
  if (!entities.length) return false
  for (const candidate of entities) candidate.sceneLayers.pop()
  pushHistory('Unpack scene instance')
  return true
}
