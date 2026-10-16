/** The original scene runtime path; authoring capture/Undo stays in sceneInstances. */
import {instantiateEntityBundleInWorld,type RuntimeObjectsWorld,type RuntimePrefabPorts} from './runtimePrefabInstantiator'
import type {Entity} from '../world/Entity'
import type {EntityBundle} from '../world/sceneEntityData'
import {normalizeUuid} from '../world/identity'
import type {Vec2} from '../world/types'
import {translateEntityTree,worldTransform} from '../world/hierarchy'


export interface SceneAssetDocument {
  sceneAssetVersion: 1
  name: string
  bundle: EntityBundle
}
export interface RuntimeScenePorts {resolveAsset(reference:string):{uuid:string;assetType:string}|null;readTextAsset(reference:string):string|null;assetReference(uuid:string):string;createEntity:RuntimePrefabPorts['createEntity'];selectEntities?:RuntimePrefabPorts['selectEntities']}
function createSceneImplementation(world:RuntimeObjectsWorld,ports:RuntimeScenePorts){
 const physicsState={world},resolveAsset=ports.resolveAsset.bind(ports),readTextAsset=ports.readTextAsset.bind(ports),assetReference=ports.assetReference.bind(ports)
 const instantiateEntityBundle=(bundle:EntityBundle,position:Vec2,suffix:string,select:boolean,invalidate:boolean)=>instantiateEntityBundleInWorld(world,ports.createEntity.bind(ports),ports.selectEntities?.bind(ports),bundle,position,suffix,select,invalidate)
 

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

/** 结构说明（自动提取）：instantiateSceneAsset；输入 reference、position、select、invalidateRuntime；直接调用 sceneDocument、instantiateEntityBundle、normalizeUuid、entity.sceneLayers.push、worldTransform 等；返回路径包含 instance.entities；包含循环处理。 */ function instantiateSceneAsset(reference: string, position?: Vec2, select = true, invalidateRuntime = true): Entity[] {
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
 return {instantiateSceneAsset}
}
export class RuntimeSceneInstantiator {
 private readonly impl:ReturnType<typeof createSceneImplementation>
 constructor(readonly world:RuntimeObjectsWorld,ports:RuntimeScenePorts){if(!world||!Array.isArray(world.entities)||!Array.isArray(world.connections)||[world.allocateId,world.allocateConnectionId,world.invalidateRuntime].some(v=>typeof v!=='function'))throw new Error('TILE_SCENE_WORLD_REQUIRED');if(!ports||[ports.resolveAsset,ports.readTextAsset,ports.assetReference,ports.createEntity].some(v=>typeof v!=='function'))throw new Error('TILE_SCENE_PORTS_REQUIRED');this.impl=createSceneImplementation(world,ports)}
 instantiateSceneAsset(reference:string,position?:Vec2,select=true,invalidateRuntime=true){return this.impl.instantiateSceneAsset(reference,position,select,invalidateRuntime)}
}
