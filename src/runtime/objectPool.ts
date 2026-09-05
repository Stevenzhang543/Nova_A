import { toRaw } from 'vue'
import type { Entity } from '../world/Entity'
import type { ObjectPool2D } from '../world/components'
import type { Vec2 } from '../world/types'
import { setWorldTransform, worldTransform } from '../world/hierarchy'
import { physicsState } from '../store/physics'
import { instantiatePrefab } from './prefabs'
import { copyComponentValues, pasteComponentValues } from '../world/components'
import { beginEntityLifetime, retireEntityLifetime } from './entityLifetimes'

interface PooledInstance {
  owner: Entity
  ownerUuid: string
  prefab: string
  entities: Entity[]
  active: boolean
  releasing: boolean
  acquiredAt: number
  initial: Array<{ entityUuid: string; transform: ReturnType<typeof worldTransform>; components: Record<string, Record<string, unknown>> }>
}
const instances: PooledInstance[] = []
let beforeRelease: (entities: readonly Entity[]) => void = () => undefined
let runtimeClock = () => performance.now() / 1_000
export function setPoolRuntimeHooks(hooks: { beforeRelease?: (entities: readonly Entity[]) => void; clock?: () => number } = {}): void {
  beforeRelease = hooks.beforeRelease ?? (() => undefined)
  runtimeClock = hooks.clock ?? (() => performance.now() / 1_000)
}
export let emitPoolSignal: (name: string, entity: Entity) => void = () => undefined
export function setPoolSignalEmitter(emitter: typeof emitPoolSignal): void { emitPoolSignal = emitter }

function poolOwners(): Array<{ entity: Entity; pool: ObjectPool2D }> {
  return physicsState.world.entities.flatMap(entity => { const pool = entity.getComponent<ObjectPool2D>('ObjectPool2D'); return pool?.enabled && pool.prefabAsset ? [{ entity, pool }] : [] })
}

export function hasObjectPool(prefab: string): boolean { return poolOwners().some(owner => owner.pool.prefabAsset === prefab) }

function create(owner: Entity, pool: ObjectPool2D): PooledInstance | null {
  if (!pool.prefabAsset || instances.filter(item => item.ownerUuid === owner.uuid).length >= pool.capacity) return null
  const entities = instantiatePrefab(pool.prefabAsset, worldTransform(owner, physicsState.world.entities).position, false)
  if (!entities.length) return null
  entities.forEach(entity => { entity.enabled = false; retireEntityLifetime(entity) })
  const item: PooledInstance = {
    owner: toRaw(owner), ownerUuid: owner.uuid, prefab: pool.prefabAsset, entities, active: false, releasing: false, acquiredAt: 0,
    initial: entities.map(entity => ({ entityUuid: entity.uuid, transform: worldTransform(entity, physicsState.world.entities), components: Object.fromEntries(entity.components.map(component => [component.kind, copyComponentValues(component)])) }))
  }
  instances.push(item); pool.createdCount++; return item
}

export function prepareObjectPools(): void {
  const live = new Set(physicsState.world.entities.map(entity => toRaw(entity)))
  for (let index = instances.length - 1; index >= 0; index--) {
    const item = instances[index]
    if (!live.has(item.owner) || item.entities.some(entity => !live.has(toRaw(entity)))) instances.splice(index, 1)
  }
  for (const { entity, pool } of poolOwners()) while (instances.filter(item => item.ownerUuid === entity.uuid).length < Math.min(pool.prewarm, pool.capacity)) if (!create(entity, pool)) break
  for (const { entity, pool } of poolOwners()) pool.activeCount = instances.filter(item => item.ownerUuid === entity.uuid && item.active).length
}

export function acquirePooled(prefab: string, position: Vec2): Entity[] | null {
  const owner = poolOwners().find(item => item.pool.prefabAsset === prefab)
  if (!owner) return null
  const reusable = instances.find(candidate => candidate.owner === toRaw(owner.entity) && candidate.prefab === prefab && !candidate.active && !candidate.releasing)
  const item = reusable ?? (owner.pool.autoExpand ? create(owner.entity, owner.pool) : null)
  if (!item) return null
  if (reusable) owner.pool.reusedCount++
  item.active = true; item.acquiredAt = runtimeClock(); item.entities.forEach(entity => { beginEntityLifetime(entity); entity.enabled = true })
  const roots = item.entities.filter(entity => !entity.parentUuid || !item.entities.some(candidate => candidate.uuid === entity.parentUuid))
  const origin = roots[0] ? worldTransform(roots[0], physicsState.world.entities).position : position
  for (const root of roots) { const transform = worldTransform(root, physicsState.world.entities); setWorldTransform(root, { ...transform, position: { x: transform.position.x + position.x - origin.x, y: transform.position.y + position.y - origin.y } }, physicsState.world.entities) }
  owner.pool.activeCount = instances.filter(candidate => candidate.ownerUuid === owner.entity.uuid && candidate.active).length
  if (roots[0]) emitPoolSignal('pool.spawned', roots[0])
  physicsState.world.invalidateRuntime()
  return item.entities
}

export function releasePooled(entity: Entity): boolean {
  const item = instances.find(candidate => candidate.active && candidate.entities.some(member => toRaw(member) === toRaw(entity))); if (!item) return false
  const owner = poolOwners().find(candidate => candidate.entity.uuid === item.ownerUuid)
  // Releasing objects cannot be recursively released or acquired by a cleanup callback.
  item.active = false; item.releasing = true
  let failure: unknown = null
  try { beforeRelease(item.entities) } catch (error) { failure = error }
  for (const member of item.entities) {
    try {
      member.velocity = { x: 0, y: 0 }; member.angularVelocity = 0
      const initial = item.initial.find(candidate => candidate.entityUuid === member.uuid)
      if (initial && owner?.pool.resetContract !== 'CustomSignal') setWorldTransform(member, initial.transform, physicsState.world.entities)
      if (owner?.pool.resetContract === 'FullSerializedState' && initial) {
        for (const component of member.components) if (initial.components[component.kind]) pasteComponentValues(component, initial.components[component.kind])
      } else if (owner?.pool.resetContract === 'CustomSignal') emitPoolSignal('pool.reset', member)
    } catch (error) { failure ??= error }
    finally { member.enabled = false; retireEntityLifetime(member) }
  }
  item.releasing = false
  if (owner) owner.pool.activeCount = instances.filter(candidate => candidate.ownerUuid === item.ownerUuid && candidate.active).length
  emitPoolSignal('pool.despawned', entity); physicsState.world.invalidateRuntime()
  if (failure) throw failure
  return true
}

export function updateObjectPools(nowSeconds = runtimeClock()): void {
  for (const item of [...instances]) {
    const owner = poolOwners().find(candidate => candidate.entity.uuid === item.ownerUuid)
    if (item.active && owner && owner.pool.maximumLifetime > 0 && nowSeconds - item.acquiredAt >= owner.pool.maximumLifetime && item.entities[0]) releasePooled(item.entities[0])
  }
}

export function objectPoolDiagnostics(): Array<{ ownerUuid: string; capacity: number; allocated: number; active: number; inactive: number; created: number; reused: number; leaked: number; resetContract: ObjectPool2D['resetContract'] }> {
  return poolOwners().map(({ entity, pool }) => {
    const owned = instances.filter(item => item.ownerUuid === entity.uuid), active = owned.filter(item => item.active).length
    return { ownerUuid: entity.uuid, capacity: pool.capacity, allocated: owned.length, active, inactive: owned.length - active, created: pool.createdCount, reused: pool.reusedCount, leaked: pool.leakedCount, resetContract: pool.resetContract }
  })
}

export function resetObjectPools(): void {
  for (const { entity, pool } of poolOwners()) pool.leakedCount += instances.filter(item => item.ownerUuid === entity.uuid && item.active).length
  instances.splice(0)
}
