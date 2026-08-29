import { reactive } from 'vue'
import { physicsState } from '../store/physics'
import type { Entity } from '../world/Entity'
import type { TileMap2D } from '../world/components'
import type { Vec2 } from '../world/types'
import { instantiatePrefab } from './prefabs'
import { instantiateSceneAsset } from './sceneInstances'
import { tilePlacementDescriptors, worldToTile } from './tilemap'

const MAX_ACTIVE_TILE_PLACEMENTS = 50_000
const instances = new Map<string, { entities: Entity[]; active: boolean }>()
export const tileSceneRuntimeState = reactive({ activePlacements: 0, cachedPlacements: 0, spawned: 0, deferred: 0, invalidAssets: 0 })

function key(host: Entity, descriptor: ReturnType<typeof tilePlacementDescriptors>[number]): string {
  return `${host.uuid}:${descriptor.layerId}:${descriptor.cell.x}:${descriptor.cell.y}:${descriptor.kind}:${descriptor.asset}`
}

function chunksNearFocus(entity: Entity, component: TileMap2D, focus: Vec2, entities: Entity[]): Array<{ x: number; y: number }> {
  const cell = worldToTile(entity, component, focus, entities) ?? { x: Math.floor(component.width * .5), y: Math.floor(component.height * .5) }
  const centerX = Math.floor(cell.x / component.chunkSize), centerY = Math.floor(cell.y / component.chunkSize), result: Array<{ x: number; y: number }> = []
  const maximumX = Math.ceil(component.width / component.chunkSize), maximumY = Math.ceil(component.height / component.chunkSize), radius = Math.max(1, Math.min(64, component.streamingRadius))
  for (let y = Math.max(0, centerY - radius); y <= Math.min(maximumY - 1, centerY + radius); y++) for (let x = Math.max(0, centerX - radius); x <= Math.min(maximumX - 1, centerX + radius); x++) result.push({ x, y })
  return result
}

export function updateTileSceneRuntime(entities: Entity[], focus: Vec2): void {
  const desired = new Map<string, { host: Entity; descriptor: ReturnType<typeof tilePlacementDescriptors>[number] }>()
  let dirty = false
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
    if (instance.active !== active) { for (const entity of instance.entities) entity.enabled = active; dirty = true }
    instance.active = active
  }
  for (const [instanceKey, value] of desired) {
    const cached = instances.get(instanceKey)
    if (cached) { cached.active = true; for (const entity of cached.entities) entity.enabled = true; continue }
    const created = value.descriptor.kind === 'scene'
      ? instantiateSceneAsset(value.descriptor.asset, value.descriptor.position, false)
      : instantiatePrefab(value.descriptor.asset, value.descriptor.position, false)
    if (!created.length) { tileSceneRuntimeState.invalidAssets++; continue }
    const createdSet = new Set(created.map(entity => entity.uuid)), roots = created.filter(entity => !entity.parentUuid || !createdSet.has(entity.parentUuid))
    for (const root of roots) {
      root.transform.rotation += value.descriptor.rotation
      root.transform.scale.x *= value.descriptor.flipX ? -1 : 1
      root.transform.scale.y *= value.descriptor.flipY ? -1 : 1
      root.ownerUuid = value.host.uuid
      root.runtimePersistence = 'Scene'
    }
    instances.set(instanceKey, { entities: created, active: true }); tileSceneRuntimeState.spawned += created.length; dirty = true
  }
  tileSceneRuntimeState.activePlacements = [...instances.values()].filter(instance => instance.active).length
  tileSceneRuntimeState.cachedPlacements = instances.size
  if (dirty) physicsState.world.invalidateRuntime()
}

export function resetTileSceneRuntime(): void {
  const entityIds = new Set([...instances.values()].flatMap(instance => instance.entities.map(entity => entity.id)))
  for (let index = physicsState.world.connections.length - 1; index >= 0; index--) if (physicsState.world.connections[index].anchors.some(anchor => entityIds.has(anchor.entityId))) physicsState.world.connections.splice(index, 1)
  for (let index = physicsState.world.entities.length - 1; index >= 0; index--) if (entityIds.has(physicsState.world.entities[index].id)) physicsState.world.entities.splice(index, 1)
  instances.clear()
  Object.assign(tileSceneRuntimeState, { activePlacements: 0, cachedPlacements: 0, spawned: 0, deferred: 0, invalidAssets: 0 })
  if (entityIds.size) physicsState.world.invalidateRuntime()
}
