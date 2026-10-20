/** 26.43 全局脚本（autoload）：项目设置中声明的脚本在每次运行开始时挂到持久的运行时对象上。
 *
 * A global script behaves like Godot's autoload singletons: one instance per play session that is
 * created before the scene's scripts awaken, survives scene changes (persistentAcrossScenes) and is
 * reachable from every script with call_global(name, function, args) or find_entity_handle(name).
 * The host object is a plain runtime entity without a shape or physics, so all existing script APIs
 * (timers, signals, session values, saves, audio) work unchanged inside a global script. */
import type { Entity } from '../world/Entity'
import { Script2D } from '../world/components'
import type { Vec2 } from '../world/types'
import type { GlobalScriptEntry } from './globalScriptSettings'
export { normalizeGlobalScripts, nextGlobalScriptName, MAX_GLOBAL_SCRIPTS, type GlobalScriptEntry } from './globalScriptSettings'

export interface GlobalScriptWorld {
  entities: Entity[]
  addBox(position: Vec2, size: Vec2): Entity
  invalidateRuntime(): void
}

export interface GlobalScriptHost { name: string; uuid: string }

/** Creates one shapeless, physics-free host entity per enabled global script and places the hosts at
 * the front of the world in declaration order; entries without a resolvable script are reported and skipped. */
export function createGlobalScriptHosts(
  world: GlobalScriptWorld,
  entries: readonly GlobalScriptEntry[],
  resolveScript: (reference: string) => string | null,
  log: (message: string, level: 'warning' | 'error') => void
): GlobalScriptHost[] {
  const hosts: GlobalScriptHost[] = []
  const sceneNames = new Set(world.entities.map(entity => entity.name))
  for (const entry of entries) {
    if (!entry.enabled) continue
    const script = entry.scriptAsset ? resolveScript(entry.scriptAsset) : null
    if (!script) { log(`Global script “${entry.name}” has no script asset; it was not started.`, 'error'); continue }
    if (sceneNames.has(entry.name)) log(`Global script “${entry.name}” shares its name with a scene object; find_entity_handle("${entry.name}") may return either. call_global() is unaffected.`, 'warning')
    const entity = world.addBox({ x: 0, y: 0 }, { x: 1, y: 1 })
    entity.removeComponent('ShapeRenderer2D')
    entity.removeComponent('RigidBody2D')
    const collider = entity.getCollider()
    if (collider) entity.removeComponent(collider.kind)
    entity.name = entry.name
    entity.authoring.kind = 'ScriptHost'
    entity.ownership = 'Runtime'
    entity.runtimePersistence = 'Session'
    entity.persistentAcrossScenes = true
    entity.editorLocked = true
    const component = entity.addComponent(new Script2D())
    component.scriptAsset = script
    hosts.push({ name: entry.name, uuid: entity.uuid })
  }
  if (hosts.length) {
    // Globals run first in every phase (awake/start/update), like autoloads: move them to the front.
    const uuids = new Set(hosts.map(host => host.uuid))
    const globals = world.entities.filter(entity => uuids.has(entity.uuid))
    for (let index = world.entities.length - 1; index >= 0; index--) if (uuids.has(world.entities[index].uuid)) world.entities.splice(index, 1)
    world.entities.unshift(...globals)
    world.invalidateRuntime()
  }
  return hosts
}

/** Removes the session's global hosts from the world (the editor also restores its snapshot). */
export function removeGlobalScriptHosts(world: GlobalScriptWorld, hosts: readonly GlobalScriptHost[]): void {
  if (!hosts.length) return
  const uuids = new Set(hosts.map(host => host.uuid))
  let removed = false
  for (let index = world.entities.length - 1; index >= 0; index--) if (uuids.has(world.entities[index].uuid)) { world.entities.splice(index, 1); removed = true }
  if (removed) world.invalidateRuntime()
}
