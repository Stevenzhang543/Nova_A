import { toRaw } from 'vue'
import type { Entity } from '../world/Entity'
import { beginEntityLifetime, retireEntityLifetime } from './entityLifetimes'
interface StreamRuntimeHooks { beforeDeactivate(entities: Entity[], world: Entity[]): void; afterActivate(entities: Entity[], fresh: Entity[]): void }
let hooks: StreamRuntimeHooks | null = null
let initialized = new WeakSet<Entity>()
export function setStreamRuntimeHooks(value: StreamRuntimeHooks | null, existing: Entity[] = []): void { hooks = value; initialized = new WeakSet(existing.map(toRaw)) }
export function deactivateStreamEntities(entities: Entity[], world: Entity[]): void { if (!entities.length) return; hooks?.beforeDeactivate(entities, world); for (const entity of entities) retireEntityLifetime(entity) }
export function activateStreamEntities(entities: Entity[]): void { if (!entities.length) return; const fresh = entities.filter(entity => !initialized.has(toRaw(entity))); for (const entity of entities) { initialized.add(toRaw(entity)); beginEntityLifetime(entity) }; hooks?.afterActivate(entities, fresh) }
