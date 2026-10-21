/** 26.45: carrying a prefab change to where the prefab is used without opening it: instances in scenes
 * that are not open (stored scene documents) and prefab variants. An instance (or a variant) keeps what
 * it changed: the differences of each of its records from that record's source in the old version of
 * the prefab are applied to the source in the new version. Pure functions on documents; no editor
 * state, so they also run headless. */
import type { Connection } from '../world/Connection'
import type { EntityBundle, PrefabDocument, SceneEntityData } from '../world/sceneEntityData'
import { canonicalProjectText } from '../projects/projectCanonicalValues'

function clone<T>(value: T): T { return value === undefined ? value : JSON.parse(JSON.stringify(value)) as T }

function transformData(record: SceneEntityData): Record<string, unknown> | null {
  const component = record.components?.find(candidate => candidate.kind === 'Transform2D')
  return component?.data && typeof component.data === 'object' ? component.data : null
}

/** Arrays of records with distinct `kind`s (an entity's components) are compared kind by kind, so an
 * override names one field of one component (`components.RigidBody2D.data.gravityScale`) and a base
 * change to another field still reaches the instance. */
function kindKeyed(value: unknown): Map<string, unknown> | null {
  if (!Array.isArray(value)) return null
  const byKind = new Map<string, unknown>()
  for (const item of value) {
    const kind = item && typeof item === 'object' ? (item as { kind?: unknown }).kind : undefined
    if (typeof kind !== 'string' || !kind || /^\d+$/.test(kind) || byKind.has(kind)) return null
    byKind.set(kind, item)
  }
  return byKind
}

/** Records the differences from `base` to `current` as `path → value`. Plain arrays count as a whole;
 * kind-keyed arrays per kind (a component the instance added is recorded whole, one it removed as null). */
export function diffPrefabValues(base: unknown, current: unknown, path: string, output: Record<string, unknown>): void {
  if (Object.is(base, current)) return
  if (Array.isArray(base) && Array.isArray(current)) {
    const before = kindKeyed(base), after = kindKeyed(current)
    if (path && before && after) {
      for (const [kind, item] of after) diffPrefabValues(before.get(kind), item, `${path}.${kind}`, output)
      for (const kind of before.keys()) if (!after.has(kind)) output[`${path}.${kind}`] = null
      return
    }
    if (canonicalProjectText(base) !== canonicalProjectText(current)) output[path] = clone(current)
    return
  }
  if (base && current && typeof base === 'object' && typeof current === 'object') {
    const keys = new Set([...Object.keys(base as object), ...Object.keys(current as object)])
    for (const key of keys) diffPrefabValues((base as Record<string, unknown>)[key], (current as Record<string, unknown>)[key], path ? `${path}.${key}` : key, output)
    return
  }
  output[path] = clone(current)
}

/** One step of a path: array index, the element of a kind-keyed array, or an object key. */
function step(cursor: unknown, segment: string): unknown {
  if (!cursor || typeof cursor !== 'object') return undefined
  if (Array.isArray(cursor)) return /^\d+$/.test(segment) ? cursor[Number(segment)] : cursor.find(item => item && typeof item === 'object' && (item as { kind?: unknown }).kind === segment)
  return (cursor as Record<string, unknown>)[segment]
}

/** The value at a dotted override path (see diffPrefabValues). */
export function readPrefabPath(target: unknown, path: string): unknown {
  let cursor = target
  for (const segment of path.split('.').filter(Boolean)) cursor = step(cursor, segment)
  return cursor
}

/** Writes `value` at an override path; missing parents are skipped. In a kind-keyed array a missing
 * kind is added and null removes it. */
export function applyPrefabOverride(target: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split('.').filter(Boolean)
  let cursor: unknown = target
  for (let index = 0; index < segments.length - 1; index++) cursor = step(cursor, segments[index])
  if (!cursor || typeof cursor !== 'object' || !segments.length) return
  const last = segments[segments.length - 1]
  if (Array.isArray(cursor) && !/^\d+$/.test(last)) {
    const at = cursor.findIndex(item => item && typeof item === 'object' && (item as { kind?: unknown }).kind === last)
    if (value === null || value === undefined) { if (at >= 0) cursor.splice(at, 1) }
    else if (at >= 0) cursor[at] = clone(value)
    else if (value && typeof value === 'object') cursor.push(clone(value))
    return
  }
  ;(cursor as Record<string, unknown>)[Array.isArray(cursor) ? Number(last) : last] = value === undefined ? undefined : clone(value)
}

/** A record as compared with its source: no identity or provenance, parents named by source uuid. */
function canonical(record: SceneEntityData, toSource: ReadonlyMap<string, string>): Record<string, unknown> {
  const value = clone(record) as Record<string, unknown>
  for (const key of ['uuid', 'id', 'prefabAsset', 'prefabInstanceUuid', 'prefabSourceUuid', 'prefabOverrides', 'prefabLayers', 'sceneLayers']) delete value[key]
  if (Array.isArray(value.components)) for (const raw of value.components) {
    if (!raw || typeof raw !== 'object') continue
    const component = raw as Record<string, unknown>
    delete component.uuid
    const data = component.data && typeof component.data === 'object' ? component.data as Record<string, unknown> : null
    if (!data) continue
    if (component.kind === 'Script2D') delete data.lastError
    if (component.kind === 'Transform2D' && typeof data.parentUuid === 'string' && toSource.has(data.parentUuid)) data.parentUuid = toSource.get(data.parentUuid)
  }
  return value
}

export interface PrefabInstanceRecord {
  record: SceneEntityData
  /** The uuid of its source record in the prefab. */
  sourceUuid: string
}

export interface RebasedPrefabInstance {
  /** The instance's records on the new version, in the prefab's order. */
  records: Array<{ record: SceneEntityData; source: SceneEntityData; existing: SceneEntityData | null; overrides: Record<string, unknown> }>
  /** Uuids of instance records whose source was removed from the prefab. */
  removed: string[]
  /** Source uuid → uuid of the record in the instance (old and new). */
  uuidBySource: Map<string, string>
}

/** Rebuilds one instance (or a variant's records of its base) on the new version of the prefab. */
export function rebasePrefabInstance(links: readonly PrefabInstanceRecord[], before: PrefabDocument, after: PrefabDocument, newUuid: () => string): RebasedPrefabInstance {
  const bySource = new Map(links.map(link => [link.sourceUuid, link.record]))
  const toSource = new Map(links.flatMap(link => link.record.uuid ? [[link.record.uuid, link.sourceUuid] as const] : []))
  const beforeSources = new Map(before.bundle.entities.flatMap(record => record.uuid ? [[record.uuid, record] as const] : []))
  const uuidBySource = new Map<string, string>()
  for (const source of after.bundle.entities) if (source.uuid) uuidBySource.set(source.uuid, bySource.get(source.uuid)?.uuid ?? newUuid())
  const identity = new Map<string, string>()
  const records: RebasedPrefabInstance['records'] = []
  for (const source of after.bundle.entities) {
    if (!source.uuid) continue
    const existing = bySource.get(source.uuid) ?? null
    const overrides: Record<string, unknown> = {}
    if (existing) {
      const previous = beforeSources.get(source.uuid) ?? source
      diffPrefabValues(canonical(previous, identity), canonical(existing, toSource), '', overrides)
      delete overrides['']
    }
    const record = clone(source)
    for (const [path, value] of Object.entries(overrides)) applyPrefabOverride(record as Record<string, unknown>, path, value)
    record.uuid = uuidBySource.get(source.uuid)
    if (existing?.id !== undefined) record.id = existing.id
    else delete record.id
    const componentUuids = new Map(existing?.components?.map(component => [component.kind, component.uuid]) ?? [])
    for (const component of record.components ?? []) if (component.kind && componentUuids.has(component.kind)) component.uuid = componentUuids.get(component.kind)
    const transform = transformData(record)
    if (transform && typeof transform.parentUuid === 'string' && uuidBySource.has(transform.parentUuid)) transform.parentUuid = uuidBySource.get(transform.parentUuid)
    records.push({ record, source, existing, overrides })
  }
  const removed = links.filter(link => !uuidBySource.has(link.sourceUuid)).flatMap(link => link.record.uuid ? [link.record.uuid] : [])
  return { records, removed, uuidBySource }
}

/** The stored form of a prefab connection in a scene document (anchors by entity uuid). */
function storedConnection(connection: Connection, anchorUuids: readonly string[], uuid: string): Record<string, unknown> {
  const { id: _id, ...stored } = clone(connection) as Connection & Record<string, unknown>
  void _id
  return {
    ...stored, uuid, breakState: 'intact', breakLink: -1,
    breakForce: Number.isFinite(connection.breakForce) ? connection.breakForce : null,
    breakTorque: Number.isFinite(connection.breakTorque) ? connection.breakTorque : null,
    anchors: connection.anchors.map((anchor, index) => { const { entityId: _entity, ...rest } = clone(anchor) as typeof anchor & Record<string, unknown>; void _entity; return { ...rest, entityUuid: anchorUuids[index] } })
  }
}

/** Refreshes the instances of a prefab in a stored scene document (a scene that is not open).
 * `matches` tells whether a record's `prefabAsset` names the prefab. Returns the number of instances. */
export function rebaseStoredScenePrefab(scene: Record<string, unknown>, matches: (reference: string | null | undefined) => boolean, before: PrefabDocument, after: PrefabDocument, newUuid: () => string): number {
  if (!Array.isArray(scene.entities)) return 0
  const entities = scene.entities as SceneEntityData[]
  const groups = new Map<string, SceneEntityData[]>()
  for (const record of entities) {
    if (!record || typeof record !== 'object' || !matches(record.prefabAsset) || !record.prefabInstanceUuid || !record.prefabSourceUuid) continue
    const group = groups.get(record.prefabInstanceUuid) ?? []
    group.push(record); groups.set(record.prefabInstanceUuid, group)
  }
  if (!groups.size) return 0
  let nextId = entities.reduce((maximum, record) => Math.max(maximum, Number.isSafeInteger(record?.id) ? Number(record.id) : 0), 0) + 1
  const replacements = new Map<string, SceneEntityData[]>(), dropped = new Set<string>(), instanceUuids = new Set<string>()
  const added: Array<Record<string, unknown>> = []
  for (const [instanceUuid, group] of groups) {
    const rebased = rebasePrefabInstance(group.map(record => ({ record, sourceUuid: record.prefabSourceUuid! })), before, after, newUuid)
    const prefabAsset = group[0].prefabAsset ?? null
    replacements.set(instanceUuid, rebased.records.map(({ record, source, existing, overrides }) => {
      record.id ??= nextId++
      record.prefabAsset = prefabAsset; record.prefabInstanceUuid = instanceUuid; record.prefabSourceUuid = source.uuid; record.prefabOverrides = overrides
      record.ownership = existing?.ownership ?? 'Prefab'
      if (existing?.persistentAcrossScenes !== undefined) record.persistentAcrossScenes = existing.persistentAcrossScenes
      return record
    }))
    for (const uuid of rebased.removed) dropped.add(uuid)
    for (const record of group) if (record.uuid) instanceUuids.add(record.uuid)
    for (const uuid of rebased.uuidBySource.values()) instanceUuids.add(uuid)
    // As in the open scene, the connections inside an instance are the prefab's: rebuilt from the new version.
    for (const stored of after.bundle.connections) {
      if (stored.anchorUuids.every(uuid => rebased.uuidBySource.has(uuid))) added.push(storedConnection(stored.connection, stored.anchorUuids.map(uuid => rebased.uuidBySource.get(uuid)!), newUuid()))
    }
  }
  const rebuilt: SceneEntityData[] = [], placed = new Set<string>()
  for (const record of entities) {
    const instance = record?.prefabInstanceUuid && matches(record.prefabAsset) ? record.prefabInstanceUuid : null
    if (instance && replacements.has(instance)) {
      if (!placed.has(instance)) { placed.add(instance); rebuilt.push(...replacements.get(instance)!) }
      continue
    }
    rebuilt.push(record)
  }
  entities.splice(0, entities.length, ...rebuilt)
  const previous = Array.isArray(scene.connections) ? scene.connections as Array<Record<string, unknown>> : []
  const kept = previous.filter(connection => {
    const anchors = Array.isArray(connection?.anchors) ? connection.anchors as Array<{ entityUuid?: string }> : []
    if (anchors.some(anchor => anchor.entityUuid && dropped.has(anchor.entityUuid))) return false
    return !(anchors.length && anchors.every(anchor => anchor.entityUuid && instanceUuids.has(anchor.entityUuid)))
  })
  if (Array.isArray(scene.connections)) (scene.connections as unknown[]).splice(0, previous.length, ...kept, ...added)
  else if (added.length) scene.connections = added
  return groups.size
}

/** A variant's bundle on the new version of its base (`baseReference`): the variant's records keep
 * their own changes; records the base removed are dropped, records it added appear in the variant;
 * records only the variant has stay. */
export function rebaseVariantBundle(variant: EntityBundle, baseReference: string, matches: (reference: string | null | undefined) => boolean, before: PrefabDocument, after: PrefabDocument, newUuid: () => string): EntityBundle {
  const layerOf = (record: SceneEntityData) => [...(record.prefabLayers ?? [])].reverse().find(layer => matches(layer.asset) && layer.sourceUuid)
  const linked = variant.entities.flatMap(record => { const layer = layerOf(record); return layer ? [{ record, sourceUuid: layer.sourceUuid!, layer }] : [] })
  const instanceUuid = linked[0]?.layer.instanceUuid ?? newUuid()
  const rebased = rebasePrefabInstance(linked, before, after, newUuid)
  const ownRecords = variant.entities.filter(record => !layerOf(record))
  const entities: SceneEntityData[] = rebased.records.map(({ record, source, overrides }) => {
    record.prefabLayers = [...(Array.isArray(source.prefabLayers) ? clone(source.prefabLayers) : []), { asset: baseReference, instanceUuid, sourceUuid: source.uuid, overrides }]
    return record
  })
  const removed = new Set(rebased.removed)
  const rootUuids = [...variant.rootUuids.filter(uuid => !removed.has(uuid))]
  for (const root of after.bundle.rootUuids) { const uuid = rebased.uuidBySource.get(root); if (uuid && !rootUuids.includes(uuid)) rootUuids.push(uuid) }
  const beforeConnections = new Set(before.bundle.connections.map(stored => stored.connection.uuid))
  const live = new Set([...entities, ...ownRecords].flatMap(record => record.uuid ? [record.uuid] : []))
  const connections = variant.connections.filter(stored => stored.anchorUuids.every(uuid => live.has(uuid)))
  for (const stored of after.bundle.connections) {
    if (beforeConnections.has(stored.connection.uuid) || !stored.anchorUuids.every(uuid => rebased.uuidBySource.has(uuid))) continue
    const connection = clone(stored.connection); connection.uuid = newUuid()
    connections.push({ connection, anchorUuids: stored.anchorUuids.map(uuid => rebased.uuidBySource.get(uuid)!) })
  }
  return { entities: [...entities, ...ownRecords], connections, rootUuids }
}
