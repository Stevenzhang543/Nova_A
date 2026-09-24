/** 对象池运行：预备、取得和归还可复用实体，协调实例状态与池生命周期。 */
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
let beforeRelease: (entities: readonly Entity[]) => void = /* 返回 undefined 的当前值。 */ () => undefined
let runtimeClock = /* 计算表达式 performance.now() / 1_000 并返回结果，沿用操作数的原有类型规则。 */ () => performance.now() / 1_000
/** 结构说明（自动提取）：setPoolRuntimeHooks；输入 hooks；写入 beforeRelease、runtimeClock。 */ export function setPoolRuntimeHooks(hooks: { beforeRelease?: (entities: readonly Entity[]) => void; clock?: () => number } = {}): void {
  beforeRelease = hooks.beforeRelease ?? (/* 返回 undefined 的当前值。 */ () => undefined)
  runtimeClock = hooks.clock ?? (/* 计算表达式 performance.now() / 1_000 并返回结果，沿用操作数的原有类型规则。 */ () => performance.now() / 1_000)
}
export let emitPoolSignal: (name: string, entity: Entity) => void = /* 返回 undefined 的当前值。 */ () => undefined
/** 将 emitter 赋给 emitPoolSignal，不显式返回值。 */ export function setPoolSignalEmitter(emitter: typeof emitPoolSignal): void { emitPoolSignal = emitter }

/** 结构说明（自动提取）：poolOwners；无显式参数；直接调用 physicsState.world.entities.flatMap。 */ function poolOwners(): Array<{ entity: Entity; pool: ObjectPool2D }> {
  return physicsState.world.entities.flatMap(/** 结构说明（自动提取）：physicsState.world.entities.flatMap 回调；输入 entity；直接调用 entity.getComponent。 */ entity => { const pool = entity.getComponent<ObjectPool2D>('ObjectPool2D'); return pool?.enabled && pool.prefabAsset ? [{ entity, pool }] : [] })
}

/** 结构说明（自动提取）：hasObjectPool；输入 prefab；直接调用 some、poolOwners。 */ export function hasObjectPool(prefab: string): boolean { return poolOwners().some(/* 比较 owner.pool.prefabAsset 与 prefab，返回严格相等的判断结果。 */ owner => owner.pool.prefabAsset === prefab) }

/** 结构说明（自动提取）：create；输入 owner、pool；直接调用 instances.filter、instantiatePrefab、worldTransform、entities.forEach、toRaw 等；返回路径包含 item。 */ function create(owner: Entity, pool: ObjectPool2D): PooledInstance | null {
  if (!pool.prefabAsset || instances.filter(/* 比较 item.ownerUuid 与 owner.uuid，返回严格相等的判断结果。 */ item => item.ownerUuid === owner.uuid).length >= pool.capacity) return null
  const entities = instantiatePrefab(pool.prefabAsset, worldTransform(owner, physicsState.world.entities).position, false)
  if (!entities.length) return null
  entities.forEach(/** 结构说明（自动提取）：entities.forEach 回调；输入 entity；直接调用 retireEntityLifetime；写入 entity.enabled。 */ entity => { entity.enabled = false; retireEntityLifetime(entity) })
  const item: PooledInstance = {
    owner: toRaw(owner), ownerUuid: owner.uuid, prefab: pool.prefabAsset, entities, active: false, releasing: false, acquiredAt: 0,
    initial: entities.map(/** 结构说明（自动提取）：entities.map 回调；输入 entity；直接调用 worldTransform、Object.fromEntries、entity.components.map；返回表达式求值结果。 */ entity => ({ entityUuid: entity.uuid, transform: worldTransform(entity, physicsState.world.entities), components: Object.fromEntries(entity.components.map(/* 返回按声明顺序构造的数组 [component.kind, copyComponentValues(component)]。 */ component => [component.kind, copyComponentValues(component)])) }))
  }
  instances.push(item); pool.createdCount++; return item
}

/** 结构说明（自动提取）：prepareObjectPools；无显式参数；直接调用 Set、physicsState.world.entities.map、live.has、item.entities.some、instances.splice 等；写入 pool.activeCount；包含循环处理。 */ export function prepareObjectPools(): void {
  const live = new Set(physicsState.world.entities.map(/* 调用 toRaw(entity) 并返回调用结果。 */ entity => toRaw(entity)))
  for (let index = instances.length - 1; index >= 0; index--) {
    const item = instances[index]
    if (!live.has(item.owner) || item.entities.some(/* 返回 live.has(toRaw(entity)) 的逻辑取反结果。 */ entity => !live.has(toRaw(entity)))) instances.splice(index, 1)
  }
  for (const { entity, pool } of poolOwners()) while (instances.filter(/* 比较 item.ownerUuid 与 entity.uuid，返回严格相等的判断结果。 */ item => item.ownerUuid === entity.uuid).length < Math.min(pool.prewarm, pool.capacity)) if (!create(entity, pool)) break
  for (const { entity, pool } of poolOwners()) pool.activeCount = instances.filter(/* 先计算 item.ownerUuid === entity.uuid；仅当其为真值时求右侧 item.active，返回短路求值结果。 */ item => item.ownerUuid === entity.uuid && item.active).length
}

/** 结构说明（自动提取）：acquirePooled；输入 prefab、position；直接调用 find、poolOwners、instances.find、create、runtimeClock 等；写入 item.active、item.acquiredAt、owner.pool.activeCount；返回路径包含 item.entities；包含循环处理。 */ export function acquirePooled(prefab: string, position: Vec2): Entity[] | null {
  const owner = poolOwners().find(/* 比较 item.pool.prefabAsset 与 prefab，返回严格相等的判断结果。 */ item => item.pool.prefabAsset === prefab)
  if (!owner) return null
  const reusable = instances.find(/* 先计算 candidate.owner === toRaw(owner.entity) && candidate.prefab === prefab && !candidate.active；仅当其为真值时求右侧 !candidate.releasing，返回短路求值结果。 */ candidate => candidate.owner === toRaw(owner.entity) && candidate.prefab === prefab && !candidate.active && !candidate.releasing)
  const item = reusable ?? (owner.pool.autoExpand ? create(owner.entity, owner.pool) : null)
  if (!item) return null
  if (reusable) owner.pool.reusedCount++
  item.active = true; item.acquiredAt = runtimeClock(); item.entities.forEach(/** 结构说明（自动提取）：item.entities.forEach 回调；输入 entity；直接调用 beginEntityLifetime；写入 entity.enabled。 */ entity => { beginEntityLifetime(entity); entity.enabled = true })
  const roots = item.entities.filter(/** 结构说明（自动提取）：item.entities.filter 回调；输入 entity；直接调用 item.entities.some；返回表达式求值结果。 */ entity => !entity.parentUuid || !item.entities.some(/* 比较 candidate.uuid 与 entity.parentUuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === entity.parentUuid))
  const origin = roots[0] ? worldTransform(roots[0], physicsState.world.entities).position : position
  for (const root of roots) { const transform = worldTransform(root, physicsState.world.entities); setWorldTransform(root, { ...transform, position: { x: transform.position.x + position.x - origin.x, y: transform.position.y + position.y - origin.y } }, physicsState.world.entities) }
  owner.pool.activeCount = instances.filter(/* 先计算 candidate.ownerUuid === owner.entity.uuid；仅当其为真值时求右侧 candidate.active，返回短路求值结果。 */ candidate => candidate.ownerUuid === owner.entity.uuid && candidate.active).length
  if (roots[0]) emitPoolSignal('pool.spawned', roots[0])
  physicsState.world.invalidateRuntime()
  return item.entities
}

/** 结构说明（自动提取）：releasePooled；输入 entity；直接调用 instances.find、find、poolOwners、beforeRelease、item.initial.find 等；写入 item.active、item.releasing、failure、member.velocity 等；包含循环处理；包含显式抛错路径。 */ export function releasePooled(entity: Entity): boolean {
  const item = instances.find(/** 结构说明（自动提取）：instances.find 回调；输入 candidate；直接调用 candidate.entities.some；返回表达式求值结果。 */ candidate => candidate.active && candidate.entities.some(/* 比较 toRaw(member) 与 toRaw(entity)，返回严格相等的判断结果。 */ member => toRaw(member) === toRaw(entity))); if (!item) return false
  const owner = poolOwners().find(/* 比较 candidate.entity.uuid 与 item.ownerUuid，返回严格相等的判断结果。 */ candidate => candidate.entity.uuid === item.ownerUuid)
  // Releasing objects cannot be recursively released or acquired by a cleanup callback.
  item.active = false; item.releasing = true
  let failure: unknown = null
  try { beforeRelease(item.entities) } catch (error) { failure = error }
  for (const member of item.entities) {
    try {
      member.velocity = { x: 0, y: 0 }; member.angularVelocity = 0
      const initial = item.initial.find(/* 比较 candidate.entityUuid 与 member.uuid，返回严格相等的判断结果。 */ candidate => candidate.entityUuid === member.uuid)
      if (initial && owner?.pool.resetContract !== 'CustomSignal') setWorldTransform(member, initial.transform, physicsState.world.entities)
      if (owner?.pool.resetContract === 'FullSerializedState' && initial) {
        for (const component of member.components) if (initial.components[component.kind]) pasteComponentValues(component, initial.components[component.kind])
      } else if (owner?.pool.resetContract === 'CustomSignal') emitPoolSignal('pool.reset', member)
    } catch (error) { failure ??= error }
    finally { member.enabled = false; retireEntityLifetime(member) }
  }
  item.releasing = false
  if (owner) owner.pool.activeCount = instances.filter(/* 先计算 candidate.ownerUuid === item.ownerUuid；仅当其为真值时求右侧 candidate.active，返回短路求值结果。 */ candidate => candidate.ownerUuid === item.ownerUuid && candidate.active).length
  emitPoolSignal('pool.despawned', entity); physicsState.world.invalidateRuntime()
  if (failure) throw failure
  return true
}

/** 结构说明（自动提取）：updateObjectPools；输入 nowSeconds；直接调用 find、poolOwners、releasePooled；包含循环处理。 */ export function updateObjectPools(nowSeconds = runtimeClock()): void {
  for (const item of [...instances]) {
    const owner = poolOwners().find(/* 比较 candidate.entity.uuid 与 item.ownerUuid，返回严格相等的判断结果。 */ candidate => candidate.entity.uuid === item.ownerUuid)
    if (item.active && owner && owner.pool.maximumLifetime > 0 && nowSeconds - item.acquiredAt >= owner.pool.maximumLifetime && item.entities[0]) releasePooled(item.entities[0])
  }
}

/** 结构说明（自动提取）：objectPoolDiagnostics；无显式参数；直接调用 map、poolOwners。 */ export function objectPoolDiagnostics(): Array<{ ownerUuid: string; capacity: number; allocated: number; active: number; inactive: number; created: number; reused: number; leaked: number; resetContract: ObjectPool2D['resetContract'] }> {
  return poolOwners().map(/** 结构说明（自动提取）：map 回调；输入 { entity, pool }；直接调用 instances.filter、owned.filter。 */ ({ entity, pool }) => {
    const owned = instances.filter(/* 比较 item.ownerUuid 与 entity.uuid，返回严格相等的判断结果。 */ item => item.ownerUuid === entity.uuid), active = owned.filter(/* 返回 item.active 的当前值。 */ item => item.active).length
    return { ownerUuid: entity.uuid, capacity: pool.capacity, allocated: owned.length, active, inactive: owned.length - active, created: pool.createdCount, reused: pool.reusedCount, leaked: pool.leakedCount, resetContract: pool.resetContract }
  })
}

/** 结构说明（自动提取）：resetObjectPools；无显式参数；直接调用 poolOwners、instances.filter、instances.splice；写入 pool.leakedCount；包含循环处理。 */ export function resetObjectPools(): void {
  for (const { entity, pool } of poolOwners()) pool.leakedCount += instances.filter(/* 先计算 item.ownerUuid === entity.uuid；仅当其为真值时求右侧 item.active，返回短路求值结果。 */ item => item.ownerUuid === entity.uuid && item.active).length
  instances.splice(0)
}
