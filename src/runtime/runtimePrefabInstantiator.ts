/** One shared bundle/prefab algorithm; each instantiator captures a fixed World. */
import type {Entity} from '../world/Entity'
import type {World} from '../world/World'
import {normalizeUuid} from '../world/identity'
import {finiteNumber} from '../world/geometry'
import {translateEntityTree,worldTransform} from '../world/hierarchy'
import {normalizeConnection,type Connection} from '../world/Connection'
import {storedComponent,type SceneEntityData,type EntityBundle,type EntityBundleInstance,type PrefabDocument} from '../world/sceneEntityData'
export type RuntimeObjectsWorld = Pick<World,'entities'|'connections'|'allocateId'|'allocateConnectionId'|'invalidateRuntime'>
export interface RuntimeEntityLifetimePort { begin(entity:Entity):number; retire(entity:Entity):void; active(entity:Entity):boolean; generation(entity:Entity):number }
export interface RuntimePrefabPorts { readPrefab(reference:string):{reference:string;document:PrefabDocument}|null; createEntity(record:SceneEntityData,id:number):Entity; selectEntities?(ids:number[],mode:'replace'):void }
export interface RuntimeObjectPorts extends RuntimePrefabPorts { unwrapEntity(entity:Entity):Entity; lifetimes:RuntimeEntityLifetimePort; log(message:string,source:'Runtime',level:'info'|'warning'|'error'):void; defaultClockSeconds():number }
export function bindRuntimeObjectPorts(ports:RuntimeObjectPorts):RuntimeObjectPorts {
  const capabilities=[ports?.readPrefab,ports?.createEntity,ports?.unwrapEntity,ports?.lifetimes?.begin,ports?.lifetimes?.retire,ports?.lifetimes?.active,ports?.lifetimes?.generation,ports?.log,ports?.defaultClockSeconds]
  if(capabilities.some(value=>typeof value!=='function')) throw new Error('RUNTIME_OBJECT_PORTS_REQUIRED: Supply real catalog, builder, identity, lifetime, log and clock services.')
  return Object.freeze({readPrefab:ports.readPrefab.bind(ports),createEntity:ports.createEntity.bind(ports),selectEntities:ports.selectEntities?.bind(ports),unwrapEntity:ports.unwrapEntity.bind(ports),lifetimes:Object.freeze({begin:ports.lifetimes.begin.bind(ports.lifetimes),retire:ports.lifetimes.retire.bind(ports.lifetimes),active:ports.lifetimes.active.bind(ports.lifetimes),generation:ports.lifetimes.generation.bind(ports.lifetimes)}),log:ports.log.bind(ports),defaultClockSeconds:ports.defaultClockSeconds.bind(ports)})
}
export function instantiateEntityBundleInWorld(world:RuntimeObjectsWorld,createEntity:RuntimePrefabPorts['createEntity'],selectEntities:RuntimePrefabPorts['selectEntities'],clipboard:EntityBundle,offset:{x:number;y:number},rootNameSuffix=' copy',select=true,invalidateRuntime=true):EntityBundleInstance {
  if (select && typeof selectEntities !== 'function') throw new Error('RUNTIME_PREFAB_SELECTION_PORT_REQUIRED: Supply the authoring selection port.')
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
    const clone = createEntity(cloneRecord, world.allocateId())
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
    world.entities.push(clone)
  }

  for (const [clone, sourceParent] of pendingParents) {
    clone.parentUuid = sourceParent
      ? sourceToClone.get(sourceParent)?.uuid
        ?? (world.entities.some(/* 比较 entity.uuid 与 sourceParent，返回严格相等的判断结果。 */ entity => entity.uuid === sourceParent) ? sourceParent : null)
      : null
  }

  for (const sourceUuid of clipboard.rootUuids) {
    const clone = sourceToClone.get(sourceUuid)
    if (!clone) continue
    translateEntityTree(clone, { x: finiteNumber(offset.x), y: finiteNumber(offset.y) }, world.entities)
    if (rootNameSuffix) clone.name = `${clone.name}${rootNameSuffix}`.slice(0, 80)
  }

  for (const stored of clipboard.connections) {
    const connection = JSON.parse(JSON.stringify(stored.connection)) as Connection
    connection.id = world.allocateConnectionId()
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
    if (normalizeConnection(connection, world.entities)) world.connections.push(connection)
  }

  const pastedRoots = clipboard.rootUuids.flatMap(/** 从源根身份提取成功克隆的根实体，跳过不存在的映射。 */ uuid => {
    const entity = sourceToClone.get(uuid)
    return entity ? [entity] : []
  })
  if (select && selectEntities) selectEntities(pastedRoots.map(/* 返回 entity.id 的当前值。 */ entity => entity.id), 'replace')
  if (invalidateRuntime) world.invalidateRuntime()
  return { entities: [...sourceToClone.values()], roots: pastedRoots, sourceToEntity: sourceToClone }
}

export class RuntimePrefabInstantiator {
  private readonly ports:RuntimePrefabPorts
  constructor(readonly world:RuntimeObjectsWorld,ports:RuntimePrefabPorts) {
    if(!world || !Array.isArray(world.entities) || !Array.isArray(world.connections) || [world.allocateId,world.allocateConnectionId,world.invalidateRuntime].some(value=>typeof value!=='function')) throw new Error('RUNTIME_OBJECT_WORLD_REQUIRED: Supply the fixed owning World.')
    if([ports?.readPrefab,ports?.createEntity].some(value=>typeof value!=='function')) throw new Error('RUNTIME_PREFAB_PORTS_REQUIRED: Supply the actual catalog and entity builder.')
    this.ports=Object.freeze({readPrefab:ports.readPrefab.bind(ports),createEntity:ports.createEntity.bind(ports),selectEntities:ports.selectEntities?.bind(ports)})
  }
  instantiatePrefab(assetRef:string,position?:{x:number;y:number},select=false,invalidateRuntime=true):Entity[] {
  const prefab = this.ports.readPrefab(assetRef)
  if (!prefab) return []
  const instance = instantiateEntityBundleInWorld(this.world, this.ports.createEntity, this.ports.selectEntities, prefab.document.bundle, { x: 0, y: 0 }, '', select, invalidateRuntime)
  const instanceUuid = normalizeUuid(undefined)
  for (const [sourceUuid, entity] of instance.sourceToEntity) {
    entity.prefabAsset = prefab.reference
    entity.prefabInstanceUuid = instanceUuid
    entity.prefabSourceUuid = sourceUuid
    entity.prefabOverrides = {}
    entity.ownership = 'Prefab'
  }
  const instanceRootUuid = instance.roots[0]?.uuid ?? null
  for (const entity of instance.entities) entity.ownerUuid = instanceRootUuid
  if (position && instance.roots.length) {
    const origin = worldTransform(instance.roots[0], this.world.entities).position
    const delta = { x: position.x - origin.x, y: position.y - origin.y }
    for (const root of instance.roots) translateEntityTree(root, delta, this.world.entities)
  }
  return instance.entities
}
}
