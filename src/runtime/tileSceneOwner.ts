/** Original bounded placement/lifecycle algorithm, captured to one fixed World. */
import {TileMapOwner} from './tileMapOwner'
import {RuntimePrefabInstantiator,type RuntimeObjectsWorld} from './runtimePrefabInstantiator'
import {RuntimeSceneInstantiator} from './runtimeSceneInstantiator'
import type {StreamLifecycleOwner} from './streamLifecycle'
import type {Entity} from '../world/Entity'
import type {TileMap2D} from '../world/components'
import type {Vec2} from '../world/types'
export interface TileSceneState {activePlacements:number;cachedPlacements:number;spawned:number;deferred:number;invalidAssets:number}
export function createInitialTileSceneState():TileSceneState{return { activePlacements: 0, cachedPlacements: 0, spawned: 0, deferred: 0, invalidAssets: 0 }}
export interface TileScenePorts {tile:TileMapOwner;prefab:RuntimePrefabInstantiator;scene:RuntimeSceneInstantiator;lifecycle:StreamLifecycleOwner}
function createPlacementImplementation(world:RuntimeObjectsWorld,ports:TileScenePorts,tileSceneRuntimeState:TileSceneState){
 const physicsState={world},tilePlacementDescriptors=ports.tile.tilePlacementDescriptors.bind(ports.tile),worldToTile=ports.tile.worldToTile.bind(ports.tile),instantiatePrefab=ports.prefab.instantiatePrefab.bind(ports.prefab),instantiateSceneAsset=ports.scene.instantiateSceneAsset.bind(ports.scene),getLegacyStreamLifecycleOwner=()=>ports.lifecycle
 const MAX_ACTIVE_TILE_PLACEMENTS = 50_000
 const instances = new Map<string, { entities: Entity[]; enabled: Map<string, boolean>; active: boolean }>()
 

/** 按模板 `${host.uuid}:${descriptor.layerId}:${descriptor.cell.x}:${descriptor.cell.y}:${descriptor.kind}:${descriptor.asset}` 生成并返回字符串。 */ function key(host: Entity, descriptor: ReturnType<typeof tilePlacementDescriptors>[number]): string {
  return `${host.uuid}:${descriptor.layerId}:${descriptor.cell.x}:${descriptor.cell.y}:${descriptor.kind}:${descriptor.asset}`
}

/** 结构说明（自动提取）：chunksNearFocus；输入 entity、component、focus、entities；直接调用 worldToTile、Math.floor、Math.ceil、Math.max、Math.min 等；返回路径包含 result；包含循环处理。 */ function chunksNearFocus(entity: Entity, component: TileMap2D, focus: Vec2, entities: Entity[]): Array<{ x: number; y: number }> {
  const cell = worldToTile(entity, component, focus, entities) ?? { x: Math.floor(component.width * .5), y: Math.floor(component.height * .5) }
  const centerX = Math.floor(cell.x / component.chunkSize), centerY = Math.floor(cell.y / component.chunkSize), result: Array<{ x: number; y: number }> = []
  const maximumX = Math.ceil(component.width / component.chunkSize), maximumY = Math.ceil(component.height / component.chunkSize), radius = Math.max(1, Math.min(64, component.streamingRadius))
  for (let y = Math.max(0, centerY - radius); y <= Math.min(maximumY - 1, centerY + radius); y++) for (let x = Math.max(0, centerX - radius); x <= Math.min(maximumX - 1, centerX + radius); x++) result.push({ x, y })
  return result
}

/** 结构说明（自动提取）：updateTileSceneRuntime；输入 entities、focus；直接调用 Map、host.getComponent、chunksNearFocus、tilePlacementDescriptors、desired.set 等；写入 tileSceneRuntimeState.deferred、tileSceneRuntimeState.invalidAssets、instance.enabled、entity.enabled 等；包含循环处理。 */ function updateTileSceneRuntime(entities: Entity[], focus: Vec2, lifecycle: StreamLifecycleOwner = getLegacyStreamLifecycleOwner()): void {
  const desired = new Map<string, { host: Entity; descriptor: ReturnType<typeof tilePlacementDescriptors>[number] }>()
  tileSceneRuntimeState.deferred = 0; tileSceneRuntimeState.invalidAssets = 0
  for (const host of entities) {
    const component = host.getComponent<TileMap2D>('TileMap2D')
    if (!host.enabled || !component?.enabled) continue
    for (const chunk of chunksNearFocus(host, component, focus, entities)) for (const descriptor of tilePlacementDescriptors(host, component, entities, chunk.x, chunk.y)) {
      if (desired.size >= MAX_ACTIVE_TILE_PLACEMENTS) { tileSceneRuntimeState.deferred++; continue }
      desired.set(key(host, descriptor), { host, descriptor })
    }
  }
  for (const [instanceKey, instance] of instances) {
    const active = desired.has(instanceKey)
    if (instance.active !== active) {
      if (!active) { instance.enabled = new Map(instance.entities.map(/* 返回按声明顺序构造的数组 [entity.uuid, entity.enabled]。 */ entity => [entity.uuid, entity.enabled])); lifecycle.deactivateStreamEntities(instance.entities.filter(/* 返回 entity.enabled 的当前值。 */ entity => entity.enabled), entities) }
      for (const entity of instance.entities) entity.enabled = active && instance.enabled.get(entity.uuid) !== false
      if (active) lifecycle.activateStreamEntities(instance.entities.filter(/* 返回 entity.enabled 的当前值。 */ entity => entity.enabled))
    }
    instance.active = active
  }
  for (const [instanceKey, value] of desired) {
    const cached = instances.get(instanceKey)
    if (cached) continue
    if (instances.size >= MAX_ACTIVE_TILE_PLACEMENTS) { tileSceneRuntimeState.deferred++; continue }
    const created = value.descriptor.kind === 'scene'
      ? instantiateSceneAsset(value.descriptor.asset, value.descriptor.position, false)
      : instantiatePrefab(value.descriptor.asset, value.descriptor.position, false)
    if (!created.length) { tileSceneRuntimeState.invalidAssets++; continue }
    const createdSet = new Set(created.map(/* 返回 entity.uuid 的当前值。 */ entity => entity.uuid)), roots = created.filter(/* 先计算 !entity.parentUuid；仅当其为假值时求右侧 !createdSet.has(entity.parentUuid)，返回短路求值结果。 */ entity => !entity.parentUuid || !createdSet.has(entity.parentUuid))
    for (const root of roots) {
      root.transform.rotation += value.descriptor.rotation
      root.transform.scale.x *= value.descriptor.flipX ? -1 : 1
      root.transform.scale.y *= value.descriptor.flipY ? -1 : 1
      root.ownerUuid = value.host.uuid
      root.runtimePersistence = 'Scene'
    }
    instances.set(instanceKey, { entities: created, enabled: new Map(created.map(/* 返回按声明顺序构造的数组 [entity.uuid, entity.enabled]。 */ entity => [entity.uuid, entity.enabled])), active: true }); tileSceneRuntimeState.spawned += created.length; lifecycle.activateStreamEntities(created)
  }
  tileSceneRuntimeState.activePlacements = [...instances.values()].filter(/* 返回 instance.active 的当前值。 */ instance => instance.active).length
  tileSceneRuntimeState.cachedPlacements = instances.size
}

/** 结构说明（自动提取）：resetTileSceneRuntime；输入 detachOnly；直接调用 Set、flatMap、instances.values、physicsState.world.connections[…].anchors.some、physicsState.world.connections.splice 等；包含循环处理。 */ function resetTileSceneRuntime(detachOnly = false): void {
  const entityIds = new Set([...instances.values()].flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 instance；直接调用 instance.entities.map；返回表达式求值结果。 */ instance => instance.entities.map(/* 返回 entity.id 的当前值。 */ entity => entity.id)))
  if (!detachOnly) {
  for (let index = physicsState.world.connections.length - 1; index >= 0; index--) if (physicsState.world.connections[index].anchors.some(/* 调用 entityIds.has(anchor.entityId) 并返回调用结果。 */ anchor => entityIds.has(anchor.entityId))) physicsState.world.connections.splice(index, 1)
  for (let index = physicsState.world.entities.length - 1; index >= 0; index--) if (entityIds.has(physicsState.world.entities[index].id)) physicsState.world.entities.splice(index, 1)
  }
  instances.clear()
  Object.assign(tileSceneRuntimeState, { activePlacements: 0, cachedPlacements: 0, spawned: 0, deferred: 0, invalidAssets: 0 })
}
 return {updateTileSceneRuntime,resetTileSceneRuntime}
}
export class TileSceneOwner {
 readonly state:TileSceneState
 private readonly impl:ReturnType<typeof createPlacementImplementation>
 constructor(readonly world:RuntimeObjectsWorld,ports:TileScenePorts,state:TileSceneState=createInitialTileSceneState()){if(!world||ports?.tile?.world!==world||ports?.prefab?.world!==world||ports?.scene?.world!==world||ports?.lifecycle?.lifetimes?.world!==world)throw new Error('TILE_SCENE_OWNER_WORLD_MISMATCH');this.state=state;this.impl=createPlacementImplementation(world,ports,state)}
 updateTileSceneRuntime(entities:Entity[],focus:Vec2){if(entities!==this.world.entities)throw new Error('TILE_SCENE_MEMBERSHIP_REQUIRED');this.impl.updateTileSceneRuntime(entities,focus)}
 resetTileSceneRuntime(detachOnly=false){this.impl.resetTileSceneRuntime(detachOnly)}
}
