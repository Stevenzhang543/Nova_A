/** Read-only ownership projection. Inputs are detached authored/runtime snapshots. */
export type ObjectValueOrigin = 'local' | 'inherited' | 'overridden' | 'unresolved'
export interface OwnershipAsset { uuid: string; name: string; path: string; assetType: string }
export interface ObjectSource { asset: OwnershipAsset; relationship: 'blueprint' | 'base-blueprint' | 'prefab' | 'prefab-layer' | 'events' | 'base-events' | 'logic'; inherited: boolean }
export interface OwnershipDiagnostic { code: string; message: string; assetUuid?: string }
export interface ObjectPropertyOwnership {
  path: string; label: string; component: string; origin: ObjectValueOrigin; owner: OwnershipAsset | null
  authored: unknown; baseline: unknown; hasBaseline: boolean; runtime: unknown; hasRuntime: boolean; runtimeChanged: boolean
}
export interface ObjectEventOwnership {
  uuid: string; kind: string; selector: string; callback: string; origin: Exclude<ObjectValueOrigin, 'unresolved'>
  sheet: OwnershipAsset | null; logic: OwnershipAsset | null; enabled: boolean; priority: number
}
export interface ObjectRuntimeInspection {
  active: boolean; entityUuid: string; generation: number | null
  authoredOrigin: 'scene' | 'runtime-spawned' | null; authoredEntity: Record<string, unknown> | null
  behaviors: Array<{ scriptUuid: string; sourcePath: string; primary: boolean; authoredProperties: Record<string, unknown>; properties: Record<string, unknown> }>
  subscriptions: Array<{ sourceSheetAsset: string | null; scriptUuid: string; signal: string; callback: string; source: string; target: string }>
  timers: Array<{ name: string; kind: 'timer' | 'task'; remaining: number; paused: boolean }>
}
export interface ObjectProvenanceInput {
  authored: Record<string, unknown>; current: Record<string, unknown>
  prefab: { asset: OwnershipAsset; entity: Record<string, unknown> | null } | null
  hasPrefabReference: boolean; sources: ObjectSource[]; events: ObjectEventOwnership[]; diagnostics: OwnershipDiagnostic[]
  runtime: ObjectRuntimeInspection
  declaredBaselines?: Record<string, { value: unknown; owner: OwnershipAsset }>
  composition?: Array<{ kind: string; policy: 'required' | 'excluded'; owner: OwnershipAsset }>
}
export interface ObjectProvenance {
  name: string; entityUuid: string; sources: ObjectSource[]; properties: ObjectPropertyOwnership[]; events: ObjectEventOwnership[]
  diagnostics: OwnershipDiagnostic[]; runtime: ObjectRuntimeInspection
  composition: NonNullable<ObjectProvenanceInput['composition']>
}
type Fields = Map<string, { label: string; component: string; value: unknown }>
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
export function ownershipValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item, index) => ownershipValuesEqual(item, right[index]))
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false
  const a = object(left), b = object(right), keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every(key => Object.prototype.hasOwnProperty.call(b, key) && ownershipValuesEqual(a[key], b[key]))
}
function fields(record: Record<string, unknown>): Fields {
  const rows: Fields = new Map()
  for (const key of ['name', 'enabled', 'tags', 'groups', 'namedLayer', 'ownership', 'editorOnly', 'runtimePersistence', 'persistentAcrossScenes']) if (Object.prototype.hasOwnProperty.call(record, key)) rows.set(`Entity.${key}`, { label: key, component: 'Entity', value: record[key] })
  for (const component of Array.isArray(record.components) ? record.components : []) {
    const entry = object(component), kind = String(entry.kind ?? ''), data = object(entry.data)
    if (!kind || entry.removed === true) continue
    rows.set(`${kind}.enabled`, { label: 'enabled', component: kind, value: entry.enabled !== false })
    for (const [key, value] of Object.entries(data)) {
      if (key === 'lastError') continue
      if (kind === 'Script2D' && key === 'properties') {
        for (const [name, property] of Object.entries(object(value))) rows.set(`Script.${name}`, { label: name, component: kind, value: property })
      } else rows.set(`${kind}.${key}`, { label: key, component: kind, value })
    }
  }
  return rows
}
/** Arrays in prefabOverrides describe a serialization patch, not individual property ownership. */
export function buildObjectProvenance(input: ObjectProvenanceInput): ObjectProvenance {
  const authored = fields(input.authored), baseline = input.prefab?.entity ? fields(input.prefab.entity) : new Map(), current = fields(input.current)
  const primary = input.runtime.behaviors.find(behavior => behavior.primary)
  if (input.runtime.active && primary) {
    for (const [name, value] of Object.entries(primary.authoredProperties)) authored.set(`Script.${name}`, { label: name, component: 'Script2D', value })
    for (const [name, value] of Object.entries(primary.properties)) current.set(`Script.${name}`, { label: name, component: 'Script2D', value })
  }
  const properties = [...authored].map(([path, field]): ObjectPropertyOwnership => {
    const declaration = input.declaredBaselines?.[path], source = declaration ? { value: declaration.value } : baseline.get(path), live = current.get(path), hasBaseline = Boolean(declaration) || baseline.has(path)
    const origin: ObjectValueOrigin = hasBaseline ? ownershipValuesEqual(field.value, source!.value) ? 'inherited' : 'overridden' : input.hasPrefabReference && !input.prefab?.entity ? 'unresolved' : 'local'
    return { path, label: field.label, component: field.component, authored: field.value, baseline: source?.value, hasBaseline, origin, owner: declaration?.owner ?? (hasBaseline ? input.prefab!.asset : null), runtime: live?.value, hasRuntime: input.runtime.active && current.has(path), runtimeChanged: input.runtime.active && current.has(path) && !ownershipValuesEqual(field.value, live!.value) }
  })
  // Runtime-created primary properties have no authored value; do not relabel them as authored defaults.
  return { name: String(input.authored.name ?? input.current.name ?? ''), entityUuid: String(input.authored.uuid ?? input.current.uuid ?? ''), sources: input.sources, properties, events: input.events, diagnostics: input.diagnostics, runtime: input.runtime, composition: input.composition ?? [] }
}
