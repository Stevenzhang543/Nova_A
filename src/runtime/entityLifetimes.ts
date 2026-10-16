/** Per-fixed-World lifetime identity; no Vue or hidden platform default. */
import type { Entity } from '../world/Entity'
export interface EntityLifetimeWorld { readonly entities: readonly Entity[] }
interface EntityLifetime { generation: number; active: boolean }
export class EntityLifetimeOwner {
  private nextGeneration = 0
  private readonly lifetimes = new WeakMap<Entity, EntityLifetime>()
  constructor(readonly world: EntityLifetimeWorld, readonly unwrapEntity: (entity: Entity) => Entity) {
    if (!world || typeof unwrapEntity !== 'function') throw new Error('ENTITY_LIFETIME_PORT_REQUIRED: Supply the fixed World and its actual identity port.')
  }
  begin(entity: Entity): number {
  entity = this.unwrapEntity(entity)
  if (this.nextGeneration >= 0xffff_ffff) throw Error('Runtime entity lifetime generations exhausted; restart the player.')
  const generation = ++this.nextGeneration
  this.lifetimes.set(entity, { generation, active: true })
  return generation
}
  generation(entity: Entity): number {
  entity = this.unwrapEntity(entity)
  return this.lifetimes.get(entity)?.generation ?? this.begin(entity)
}
  active(entity: Entity): boolean { return this.lifetimes.get(this.unwrapEntity(entity))?.active !== false }
  inspect(entity: Entity): number | null { const lifetime = this.lifetimes.get(this.unwrapEntity(entity)); return lifetime?.active ? lifetime.generation : null }
  retire(entity: Entity): void {
  entity = this.unwrapEntity(entity)
  const lifetime = this.lifetimes.get(entity)
  if (lifetime) lifetime.active = false
  else this.lifetimes.set(entity, { generation: 0, active: false })
}
}
interface LegacyEntityLifetimePort { getOwner(): EntityLifetimeOwner }
let legacyPort: LegacyEntityLifetimePort | null = null
export function installLegacyEntityLifetimePort(port: LegacyEntityLifetimePort): () => void {
  if (!port || typeof port.getOwner !== 'function') throw new Error('ENTITY_LIFETIME_LEGACY_PORT_REQUIRED')
  legacyPort = port
  return () => { if (legacyPort === port) legacyPort = null }
}
export function getLegacyEntityLifetimeOwner(): EntityLifetimeOwner {
  const owner = legacyPort?.getOwner()
  if (!(owner instanceof EntityLifetimeOwner)) throw new Error('ENTITY_LIFETIME_LEGACY_PORT_NOT_INSTALLED')
  return owner
}
export function beginEntityLifetime(entity: Entity): number { return getLegacyEntityLifetimeOwner().begin(entity) }
export function entityLifetimeGeneration(entity: Entity): number { return getLegacyEntityLifetimeOwner().generation(entity) }
export function entityLifetimeActive(entity: Entity): boolean { return getLegacyEntityLifetimeOwner().active(entity) }
export function inspectEntityLifetimeGeneration(entity: Entity): number | null { return getLegacyEntityLifetimeOwner().inspect(entity) }
export function retireEntityLifetime(entity: Entity): void { getLegacyEntityLifetimeOwner().retire(entity) }
