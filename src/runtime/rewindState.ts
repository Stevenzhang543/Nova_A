/** 26.45: copies of runtime state for the debugger's rewind (physics recording keyframes). A copy
 * holds its own maps, sets, arrays, plain records and class instances such as media clocks; it keeps
 * entities, components and functions by reference (the rewind restores what they hold, not which
 * objects exist). Plain TypeScript with no editor or Vue imports. */
import type { Entity } from '../world/Entity'

/** True for objects kept by reference: entities and their components. */
function isWorldObject(value: object): boolean {
  return 'componentMap' in value || ('kind' in value && 'uuid' in value && 'enabled' in value && 'removed' in value)
}

function cloneValue(value: unknown, seen: Map<object, unknown>): unknown {
  if (value === null || typeof value !== 'object') return value
  const cached = seen.get(value)
  if (cached !== undefined) return cached
  if (isWorldObject(value)) return value
  if (ArrayBuffer.isView(value)) {
    const copy = (value as unknown as { slice(): unknown }).slice()
    seen.set(value, copy)
    return copy
  }
  if (Array.isArray(value)) {
    const copy: unknown[] = []
    seen.set(value, copy)
    for (const item of value) copy.push(cloneValue(item, seen))
    return copy
  }
  if (value instanceof Map) {
    const copy = new Map()
    seen.set(value, copy)
    for (const [key, item] of value) copy.set(key, cloneValue(item, seen))
    return copy
  }
  if (value instanceof Set) {
    const copy = new Set()
    seen.set(value, copy)
    for (const item of value) copy.add(cloneValue(item, seen))
    return copy
  }
  const copy = Object.create(Object.getPrototypeOf(value)) as Record<string, unknown>
  seen.set(value, copy)
  for (const key of Object.keys(value)) copy[key] = cloneValue((value as Record<string, unknown>)[key], seen)
  return copy
}

/** A deep copy of runtime state (see the module note for what stays shared). */
export function cloneRuntimeState<T>(value: T): T { return cloneValue(value, new Map()) as T }

/** Component fields that change while a game runs, by component kind; the rewind puts these back. */
const RUNTIME_FIELDS: Record<string, readonly string[]> = {
  Script2D: ['properties'],
  Animator: ['currentState', 'parameters', 'layerWeights', 'speed'],
  TimelinePlayer: ['currentTime', 'playing', 'skipped', 'speed', 'variables'],
  TargetJoint2D: ['target', 'enabled'],
  Collider2D: ['surfaceSpeed']
}

export interface ComponentFieldsSnapshot { entity: string; kind: string; fields: Record<string, unknown> }

/** Copies the runtime fields of the entities' components (see RUNTIME_FIELDS). */
export function captureComponentFields(entities: readonly Entity[]): ComponentFieldsSnapshot[] {
  const result: ComponentFieldsSnapshot[] = []
  for (const entity of entities) {
    for (const component of entity.componentMap.values()) {
      const kind = component.kind.endsWith('Collider2D') ? 'Collider2D' : component.kind
      const names = RUNTIME_FIELDS[kind]
      if (!names) continue
      const fields: Record<string, unknown> = {}
      for (const name of names) fields[name] = cloneRuntimeState((component as unknown as Record<string, unknown>)[name])
      result.push({ entity: entity.uuid, kind: component.kind, fields })
    }
  }
  return result
}

/** Puts captured component fields back (entities or components that no longer exist are skipped). */
export function restoreComponentFields(entities: readonly Entity[], snapshot: readonly ComponentFieldsSnapshot[]): number {
  const byUuid = new Map(entities.map(entity => [entity.uuid, entity]))
  let restored = 0
  for (const item of snapshot) {
    const component = byUuid.get(item.entity)?.componentMap.get(item.kind as never) as unknown as Record<string, unknown> | undefined
    if (!component) continue
    for (const [name, value] of Object.entries(item.fields)) component[name] = cloneRuntimeState(value)
    restored++
  }
  return restored
}
