/** Pool instances and runtime hooks belong to one captured World. */
import type {Entity} from '../world/Entity'
import type {ObjectPool2D} from '../world/components'
import type {Vec2} from '../world/types'
import {setWorldTransform,worldTransform} from '../world/hierarchy'
import {copyComponentValues,pasteComponentValues} from '../world/components'
import {RuntimePrefabInstantiator,bindRuntimeObjectPorts,type RuntimeObjectsWorld,type RuntimeObjectPorts} from './runtimePrefabInstantiator'
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
export class ObjectPoolOwner {
  private instances:PooledInstance[]=[]
  private beforeRelease:(entities:readonly Entity[])=>void=()=>undefined
  private runtimeClock:()=>number
  emitPoolSignal:(name:string,entity:Entity)=>void=()=>undefined
  private readonly ports:RuntimeObjectPorts
  constructor(readonly world:RuntimeObjectsWorld,readonly prefabInstantiator:RuntimePrefabInstantiator,ports:RuntimeObjectPorts) {
    if(prefabInstantiator?.world!==world)throw new Error('RUNTIME_OBJECT_WORLD_OWNER_MISMATCH: Use one fixed World for pool and instantiator.')
    this.ports=bindRuntimeObjectPorts(ports);this.runtimeClock=()=>this.ports.defaultClockSeconds()
  }
  setPoolRuntimeHooks(hooks: { beforeRelease?: (entities: readonly Entity[]) => void; clock?: () => number } = {}): void {
  this.beforeRelease = hooks.beforeRelease ?? (/* 返回 undefined 的当前值。 */ () => undefined)
  this.runtimeClock = hooks.clock ?? (/* 计算表达式 this.ports.defaultClockSeconds() 并返回结果，沿用操作数的原有类型规则。 */ () => this.ports.defaultClockSeconds())
}

  setPoolSignalEmitter(emitter: (name:string,entity:Entity)=>void): void { this.emitPoolSignal = emitter }

  private poolOwners(): Array<{ entity: Entity; pool: ObjectPool2D }> {
  return this.world.entities.flatMap(/** 结构说明（自动提取）：this.world.entities.flatMap 回调；输入 entity；直接调用 entity.getComponent。 */ entity => { const pool = entity.getComponent<ObjectPool2D>('ObjectPool2D'); return pool?.enabled && pool.prefabAsset ? [{ entity, pool }] : [] })
}

  hasObjectPool(prefab: string): boolean { return this.poolOwners().some(/* 比较 owner.pool.prefabAsset 与 prefab，返回严格相等的判断结果。 */ owner => owner.pool.prefabAsset === prefab) }

  private create(owner: Entity, pool: ObjectPool2D): PooledInstance | null {
  if (!pool.prefabAsset || this.instances.filter(/* 比较 item.ownerUuid 与 owner.uuid，返回严格相等的判断结果。 */ item => item.ownerUuid === owner.uuid).length >= pool.capacity) return null
  const entities = this.prefabInstantiator.instantiatePrefab(pool.prefabAsset, worldTransform(owner, this.world.entities).position, false)
  if (!entities.length) return null
  entities.forEach(/** 结构说明（自动提取）：entities.forEach 回调；输入 entity；直接调用 retireEntityLifetime；写入 entity.enabled。 */ entity => { entity.enabled = false; this.ports.lifetimes.retire(entity) })
  const item: PooledInstance = {
    owner: this.ports.unwrapEntity(owner), ownerUuid: owner.uuid, prefab: pool.prefabAsset, entities, active: false, releasing: false, acquiredAt: 0,
    initial: entities.map(/** 结构说明（自动提取）：entities.map 回调；输入 entity；直接调用 worldTransform、Object.fromEntries、entity.components.map；返回表达式求值结果。 */ entity => ({ entityUuid: entity.uuid, transform: worldTransform(entity, this.world.entities), components: Object.fromEntries(entity.components.map(/* 返回按声明顺序构造的数组 [component.kind, copyComponentValues(component)]。 */ component => [component.kind, copyComponentValues(component)])) }))
  }
  this.instances.push(item); pool.createdCount++; return item
}

  prepareObjectPools(): void {
  const live = new Set(this.world.entities.map(/* 调用 this.ports.unwrapEntity(entity) 并返回调用结果。 */ entity => this.ports.unwrapEntity(entity)))
  for (let index = this.instances.length - 1; index >= 0; index--) {
    const item = this.instances[index]
    if (!live.has(item.owner) || item.entities.some(/* 返回 live.has(this.ports.unwrapEntity(entity)) 的逻辑取反结果。 */ entity => !live.has(this.ports.unwrapEntity(entity)))) this.instances.splice(index, 1)
  }
  for (const { entity, pool } of this.poolOwners()) while (this.instances.filter(/* 比较 item.ownerUuid 与 entity.uuid，返回严格相等的判断结果。 */ item => item.ownerUuid === entity.uuid).length < Math.min(pool.prewarm, pool.capacity)) if (!this.create(entity, pool)) break
  for (const { entity, pool } of this.poolOwners()) pool.activeCount = this.instances.filter(/* 先计算 item.ownerUuid === entity.uuid；仅当其为真值时求右侧 item.active，返回短路求值结果。 */ item => item.ownerUuid === entity.uuid && item.active).length
}

  acquirePooled(prefab: string, position: Vec2): Entity[] | null {
  const owner = this.poolOwners().find(/* 比较 item.pool.prefabAsset 与 prefab，返回严格相等的判断结果。 */ item => item.pool.prefabAsset === prefab)
  if (!owner) return null
  const reusable = this.instances.find(/* 先计算 candidate.owner === this.ports.unwrapEntity(owner.entity) && candidate.prefab === prefab && !candidate.active；仅当其为真值时求右侧 !candidate.releasing，返回短路求值结果。 */ candidate => candidate.owner === this.ports.unwrapEntity(owner.entity) && candidate.prefab === prefab && !candidate.active && !candidate.releasing)
  const item = reusable ?? (owner.pool.autoExpand ? this.create(owner.entity, owner.pool) : null)
  if (!item) return null
  if (reusable) owner.pool.reusedCount++
  item.active = true; item.acquiredAt = this.runtimeClock(); item.entities.forEach(/** 结构说明（自动提取）：item.entities.forEach 回调；输入 entity；直接调用 beginEntityLifetime；写入 entity.enabled。 */ entity => { this.ports.lifetimes.begin(entity); entity.enabled = true })
  const roots = item.entities.filter(/** 结构说明（自动提取）：item.entities.filter 回调；输入 entity；直接调用 item.entities.some；返回表达式求值结果。 */ entity => !entity.parentUuid || !item.entities.some(/* 比较 candidate.uuid 与 entity.parentUuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === entity.parentUuid))
  const origin = roots[0] ? worldTransform(roots[0], this.world.entities).position : position
  for (const root of roots) { const transform = worldTransform(root, this.world.entities); setWorldTransform(root, { ...transform, position: { x: transform.position.x + position.x - origin.x, y: transform.position.y + position.y - origin.y } }, this.world.entities) }
  owner.pool.activeCount = this.instances.filter(/* 先计算 candidate.ownerUuid === owner.entity.uuid；仅当其为真值时求右侧 candidate.active，返回短路求值结果。 */ candidate => candidate.ownerUuid === owner.entity.uuid && candidate.active).length
  if (roots[0]) this.emitPoolSignal('pool.spawned', roots[0])
  this.world.invalidateRuntime()
  return item.entities
}

  releasePooled(entity: Entity): boolean {
  const item = this.instances.find(/** 结构说明（自动提取）：this.instances.find 回调；输入 candidate；直接调用 candidate.entities.some；返回表达式求值结果。 */ candidate => candidate.active && candidate.entities.some(/* 比较 this.ports.unwrapEntity(member) 与 this.ports.unwrapEntity(entity)，返回严格相等的判断结果。 */ member => this.ports.unwrapEntity(member) === this.ports.unwrapEntity(entity))); if (!item) return false
  const owner = this.poolOwners().find(/* 比较 candidate.entity.uuid 与 item.ownerUuid，返回严格相等的判断结果。 */ candidate => candidate.entity.uuid === item.ownerUuid)
  // Releasing objects cannot be recursively released or acquired by a cleanup callback.
  item.active = false; item.releasing = true
  let failure: unknown = null
  try { this.beforeRelease(item.entities) } catch (error) { failure = error }
  for (const member of item.entities) {
    try {
      member.velocity = { x: 0, y: 0 }; member.angularVelocity = 0
      const initial = item.initial.find(/* 比较 candidate.entityUuid 与 member.uuid，返回严格相等的判断结果。 */ candidate => candidate.entityUuid === member.uuid)
      if (initial && owner?.pool.resetContract !== 'CustomSignal') setWorldTransform(member, initial.transform, this.world.entities)
      if (owner?.pool.resetContract === 'FullSerializedState' && initial) {
        for (const component of member.components) if (initial.components[component.kind]) pasteComponentValues(component, initial.components[component.kind])
      } else if (owner?.pool.resetContract === 'CustomSignal') this.emitPoolSignal('pool.reset', member)
    } catch (error) { failure ??= error }
    finally { member.enabled = false; this.ports.lifetimes.retire(member) }
  }
  item.releasing = false
  if (owner) owner.pool.activeCount = this.instances.filter(/* 先计算 candidate.ownerUuid === item.ownerUuid；仅当其为真值时求右侧 candidate.active，返回短路求值结果。 */ candidate => candidate.ownerUuid === item.ownerUuid && candidate.active).length
  this.emitPoolSignal('pool.despawned', entity); this.world.invalidateRuntime()
  if (failure) throw failure
  return true
}

  updateObjectPools(nowSeconds = this.runtimeClock()): void {
  for (const item of [...this.instances]) {
    const owner = this.poolOwners().find(/* 比较 candidate.entity.uuid 与 item.ownerUuid，返回严格相等的判断结果。 */ candidate => candidate.entity.uuid === item.ownerUuid)
    if (item.active && owner && owner.pool.maximumLifetime > 0 && nowSeconds - item.acquiredAt >= owner.pool.maximumLifetime && item.entities[0]) this.releasePooled(item.entities[0])
  }
}

  objectPoolDiagnostics(): Array<{ ownerUuid: string; capacity: number; allocated: number; active: number; inactive: number; created: number; reused: number; leaked: number; resetContract: ObjectPool2D['resetContract'] }> {
  return this.poolOwners().map(/** 结构说明（自动提取）：map 回调；输入 { entity, pool }；直接调用 this.instances.filter、owned.filter。 */ ({ entity, pool }) => {
    const owned = this.instances.filter(/* 比较 item.ownerUuid 与 entity.uuid，返回严格相等的判断结果。 */ item => item.ownerUuid === entity.uuid), active = owned.filter(/* 返回 item.active 的当前值。 */ item => item.active).length
    return { ownerUuid: entity.uuid, capacity: pool.capacity, allocated: owned.length, active, inactive: owned.length - active, created: pool.createdCount, reused: pool.reusedCount, leaked: pool.leakedCount, resetContract: pool.resetContract }
  })
}

  resetObjectPools(): void {
  for (const { entity, pool } of this.poolOwners()) pool.leakedCount += this.instances.filter(/* 先计算 item.ownerUuid === entity.uuid；仅当其为真值时求右侧 item.active，返回短路求值结果。 */ item => item.ownerUuid === entity.uuid && item.active).length
  this.instances.splice(0)
}
}
