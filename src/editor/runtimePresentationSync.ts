/**
 * Playing frames write the plain world objects (see World.withPlainAccess), so Vue observers are not
 * notified on every simulated change. This refreshes them at a presentation rate instead: the
 * hierarchy (structure, names, enabled state) and the selected objects shown in the Inspector.
 *
 * Notification uses the observed value as the reference: the plain field is momentarily set back to
 * the value the observers last saw and the current value is written through the proxy, which makes
 * Vue's own change check fire. Nothing is copied or replaced, so object identity is kept.
 */
import { reactive, toRaw } from 'vue'
import type { Entity } from '../world/Entity'
import type { Connection } from '../world/Connection'
import { physicsState } from '../store/physics'

const PRESENTATION_INTERVAL_MS = 100
type Fields = Record<string, unknown>

let lastSync = 0
let shownEntities: Entity[] | null = null
let shownConnections: Connection[] | null = null
const shownHeader = new WeakMap<object, { name: string; enabled: boolean }>()
const shownFields = new WeakMap<object, Fields>()
const shownComponents = new WeakMap<object, Array<[unknown, unknown]>>()

function plainRecord(value: unknown): value is Fields {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value instanceof Map || value instanceof Set) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/** Restores the last observed array contents on the plain array, then writes the current contents through the proxy. */
function notifyArray<T>(observed: T[], shown: T[] | null): T[] {
  const plain = toRaw(observed), current = plain.slice()
  if (shown && shown.length === current.length && shown.every((item, index) => item === current[index])) return shown
  if (shown) {
    plain.splice(0, plain.length, ...shown)
    observed.splice(0, observed.length, ...current)
  }
  return current
}

function notifyField(proxy: Fields, plain: Fields, key: string, shown: unknown): void {
  const current = plain[key]
  if (Object.is(current, shown)) return
  plain[key] = shown
  proxy[key] = current
}

/**
 * Fields of one object: scalars by value and object fields by identity (a component or value record that
 * the Runtime replaced). Plain value records such as {x, y} are followed one level down.
 */
function notifyRecord(target: object, depth = 0): void {
  const plain = toRaw(target) as Fields, proxy = reactive(plain) as Fields
  let shown = shownFields.get(plain)
  if (!shown) { shown = {}; shownFields.set(plain, shown) }
  for (const key of Object.keys(plain)) {
    const value = plain[key]
    if (typeof value === 'function') continue
    if (key in shown) notifyField(proxy, plain, key, shown[key])
    shown[key] = value
    if (depth === 0 && plainRecord(value)) notifyRecord(value, 1)
  }
}

/** Components the Runtime added, replaced or removed in an entity's component map. */
function notifyComponentMap(map: Map<unknown, unknown>): void {
  const plain = toRaw(map), proxy = reactive(plain) as Map<unknown, unknown>
  const shown = shownComponents.get(plain)
  const current = [...plain.entries()]
  shownComponents.set(plain, current)
  if (!shown) return
  if (shown.length === current.length && shown.every(([key, value], index) => current[index][0] === key && current[index][1] === value)) return
  const before = new Map(shown)
  for (const [key, value] of current) {
    if (!before.has(key)) { plain.delete(key); proxy.set(key, value) }
    else if (before.get(key) !== value) { plain.set(key, before.get(key)); proxy.set(key, value) }
  }
  for (const [key, value] of before) if (!plain.has(key)) { plain.set(key, value); proxy.delete(key) }
}

function notifyEntity(entity: Entity, deep: boolean): void {
  const plain = toRaw(entity), proxy = reactive(plain) as unknown as Entity
  const shown = shownHeader.get(plain)
  if (shown) {
    if (plain.name !== shown.name) { const current = plain.name; plain.name = shown.name; proxy.name = current }
    if (plain.enabled !== shown.enabled) { const current = plain.enabled; plain.enabled = shown.enabled; proxy.enabled = current }
  }
  shownHeader.set(plain, { name: plain.name, enabled: plain.enabled })
  notifyComponentMap(plain.componentMap as Map<unknown, unknown>)
  if (!deep) return
  notifyRecord(plain)
  for (const component of plain.componentMap.values()) notifyRecord(component)
}

/** Called once per editor frame. Refreshes observers at the presentation rate while playing and once when play pauses or steps. */
export function syncRuntimePresentation(now: number, force = false): void {
  const world = physicsState.world
  if (!force && now - lastSync < PRESENTATION_INTERVAL_MS) return
  lastSync = now
  shownEntities = notifyArray(world.entities, shownEntities)
  shownConnections = notifyArray(world.connections, shownConnections)
  const selected = new Set(physicsState.selectedEntityIds)
  if (physicsState.selectedEntityId !== null) selected.add(physicsState.selectedEntityId)
  for (const entity of shownEntities) notifyEntity(entity, selected.has(entity.id))
}

/** Forget the observed baseline when a session starts or the document is reloaded. */
export function resetRuntimePresentation(): void {
  lastSync = 0
  shownEntities = null
  shownConnections = null
}
