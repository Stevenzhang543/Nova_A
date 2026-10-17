/** Per-fixed-World stream hook registry; registration cleanup cannot clear a successor. */
import type { Entity } from '../world/Entity'
import { EntityLifetimeOwner } from './entityLifetimes'
export interface StreamRuntimeHooks { beforeDeactivate(entities: Entity[], world: Entity[]): void; afterActivate(entities: Entity[], fresh: Entity[]): void }
export class StreamLifecycleOwner {
  private hooks: StreamRuntimeHooks | null = null
  private initialized = new WeakSet<Entity>()
  private registration: object | null = null
  constructor(readonly lifetimes: EntityLifetimeOwner) {
    if (!(lifetimes instanceof EntityLifetimeOwner)) throw new Error('STREAM_LIFETIME_OWNER_REQUIRED')
  }
  setStreamRuntimeHooks(value: StreamRuntimeHooks | null, existing: Entity[] = []): () => void { this.hooks = value; this.initialized = new WeakSet(existing.map(this.lifetimes.unwrapEntity)) ; const registration = {}; this.registration = registration; return () => { if (this.registration !== registration) return; this.hooks = null; this.initialized = new WeakSet(); this.registration = null } }
  deactivateStreamEntities(entities: Entity[], world: Entity[]): void { if (!entities.length) return; this.hooks?.beforeDeactivate(entities, world); for (const entity of entities) this.lifetimes.retire(entity) }
  activateStreamEntities(entities: Entity[]): void { if (!entities.length) return; const fresh = entities.filter(/* 返回 this.initialized.has(this.lifetimes.unwrapEntity(entity)) 的逻辑取反结果。 */ entity => !this.initialized.has(this.lifetimes.unwrapEntity(entity))); for (const entity of entities) { this.initialized.add(this.lifetimes.unwrapEntity(entity)); this.lifetimes.begin(entity) }; this.hooks?.afterActivate(entities, fresh) }
}
interface LegacyStreamLifecyclePort { getOwner(): StreamLifecycleOwner }
let legacyPort: LegacyStreamLifecyclePort | null = null
export function installLegacyStreamLifecyclePort(port: LegacyStreamLifecyclePort): () => void {
  if (!port || typeof port.getOwner !== 'function') throw new Error('STREAM_LIFECYCLE_LEGACY_PORT_REQUIRED')
  legacyPort = port
  return () => { if (legacyPort === port) legacyPort = null }
}
export function getLegacyStreamLifecycleOwner(): StreamLifecycleOwner {
  const owner = legacyPort?.getOwner()
  if (!(owner instanceof StreamLifecycleOwner)) throw new Error('STREAM_LIFECYCLE_LEGACY_PORT_NOT_INSTALLED')
  return owner
}
export function setStreamRuntimeHooks(value: StreamRuntimeHooks | null, existing: Entity[] = []): void { getLegacyStreamLifecycleOwner().setStreamRuntimeHooks(value, existing) }
export function deactivateStreamEntities(entities: Entity[], world: Entity[]): void { getLegacyStreamLifecycleOwner().deactivateStreamEntities(entities, world) }
export function activateStreamEntities(entities: Entity[]): void { getLegacyStreamLifecycleOwner().activateStreamEntities(entities) }
