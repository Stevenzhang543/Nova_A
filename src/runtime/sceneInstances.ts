/** 场景实例关系：维护嵌套场景来源与实例化记录。 */
import { assetReference, createTextAsset, readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import {RuntimeSceneInstantiator} from './runtimeSceneInstantiator'
import {
  captureEntityBundle,
  createEntityFromData,
  selectEntities,
  physicsState,
  pushHistory,

} from '../store/physics'
import type { Entity } from '../world/Entity'

import type { Vec2 } from '../world/types'

import type {SceneAssetDocument} from './runtimeSceneInstantiator'
export type {SceneAssetDocument} from './runtimeSceneInstantiator'


/** 结构说明（自动提取）：clone；输入 value；直接调用 JSON.parse、JSON.stringify。 */ function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T }

/** 结构说明（自动提取）：createSceneAssetFromEntities；输入 entityIds、requestedName；直接调用 captureEntityBundle、slice、requestedName.trim、clone、createTextAsset 等。 */ export function createSceneAssetFromEntities(entityIds: number[], requestedName = 'Instanced Scene'): string | null {
  const bundle = captureEntityBundle(entityIds)
  if (!bundle) return null
  const document: SceneAssetDocument = { sceneAssetVersion: 1, name: requestedName.trim().slice(0, 80) || 'Instanced Scene', bundle: clone(bundle) }
  const asset = createTextAsset(document.name, 'scene', JSON.stringify(document, null, 2), 'Assets/Scenes')
  pushHistory('Create scene asset')
  return assetReference(asset.uuid)
}
export function instantiateSceneAsset(reference:string,position?:Vec2,select=true,invalidateRuntime=true):Entity[]{return new RuntimeSceneInstantiator(physicsState.world,{resolveAsset,readTextAsset,assetReference,createEntity:createEntityFromData,selectEntities}).instantiateSceneAsset(reference,position,select,invalidateRuntime)}


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
