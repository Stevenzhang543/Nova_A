/** 实体生命周期代数：用弱引用记录对象的当前生命期，防止对象池复用使旧句柄重新有效。 */
import type { Entity } from '../world/Entity'
import { toRaw } from 'vue'

interface EntityLifetime { generation: number; active: boolean }
let nextGeneration = 0
const lifetimes = new WeakMap<Entity, EntityLifetime>()

/** Generations belong to a lifetime, so pooled reuse of the same UUID cannot revive an old handle. */
/** 为原始实体对象分配单调递增的活动代数；达到 32 位上限时拒绝继续分配。 */ export function beginEntityLifetime(entity: Entity): number {
  entity = toRaw(entity)
  if (nextGeneration >= 0xffff_ffff) throw Error('Runtime entity lifetime generations exhausted; restart the player.')
  const generation = ++nextGeneration
  lifetimes.set(entity, { generation, active: true })
  return generation
}
/** 读取实体已有代数；尚未登记时创建新生命期。 */ export function entityLifetimeGeneration(entity: Entity): number {
  entity = toRaw(entity)
  return lifetimes.get(entity)?.generation ?? beginEntityLifetime(entity)
}
/* 比较 lifetimes.get(toRaw(entity))?.active 与 false，返回严格不等的判断结果。 */ export function entityLifetimeActive(entity: Entity): boolean { return lifetimes.get(toRaw(entity))?.active !== false }
/** 只返回仍活动的生命期代数，未知或已退休的对象返回 null。 */ export function inspectEntityLifetimeGeneration(entity: Entity): number | null { const lifetime = lifetimes.get(toRaw(entity)); return lifetime?.active ? lifetime.generation : null }
/** 将已有生命期标为失效；未知对象也登记为失效，避免后续误认为活动对象。 */ export function retireEntityLifetime(entity: Entity): void {
  entity = toRaw(entity)
  const lifetime = lifetimes.get(entity)
  if (lifetime) lifetime.active = false
  else lifetimes.set(entity, { generation: 0, active: false })
}
