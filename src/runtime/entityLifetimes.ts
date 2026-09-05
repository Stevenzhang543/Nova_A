import type { Entity } from '../world/Entity'
import { toRaw } from 'vue'

interface EntityLifetime { generation: number; active: boolean }
let nextGeneration = 0
const lifetimes = new WeakMap<Entity, EntityLifetime>()

/** Generations belong to a lifetime, so pooled reuse of the same UUID cannot revive an old handle. */
export function beginEntityLifetime(entity: Entity): number {
  entity = toRaw(entity)
  if (nextGeneration >= 0xffff_ffff) throw Error('Runtime entity lifetime generations exhausted; restart the player.')
  const generation = ++nextGeneration
  lifetimes.set(entity, { generation, active: true })
  return generation
}
export function entityLifetimeGeneration(entity: Entity): number {
  entity = toRaw(entity)
  return lifetimes.get(entity)?.generation ?? beginEntityLifetime(entity)
}
export function entityLifetimeActive(entity: Entity): boolean { return lifetimes.get(toRaw(entity))?.active !== false }
export function inspectEntityLifetimeGeneration(entity: Entity): number | null { const lifetime = lifetimes.get(toRaw(entity)); return lifetime?.active ? lifetime.generation : null }
export function retireEntityLifetime(entity: Entity): void {
  entity = toRaw(entity)
  const lifetime = lifetimes.get(entity)
  if (lifetime) lifetime.active = false
  else lifetimes.set(entity, { generation: 0, active: false })
}
