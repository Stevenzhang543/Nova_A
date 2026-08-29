import { assetGuid, assetReference, createTextAsset, readTextAsset, resolveAsset, updateTextAssetTransactional } from '../assets/AssetDatabase'
import { subtreeEntities } from '../editor/selection'
import {
  captureEntityBundle,
  createEntityFromData,
  instantiateEntityBundle,
  physicsState,
  pushHistory,
  selectEntities,
  serializeEntity,
  type EntityBundle,
  type SceneEntityData
} from '../store/physics'
import type { Entity } from '../world/Entity'
import { setParent, translateEntityTree, worldTransform } from '../world/hierarchy'
import { normalizeUuid } from '../world/identity'
import { normalizeConnection, type Connection } from '../world/Connection'
import type { Vec2 } from '../world/types'
import { canonicalProjectText } from '../projects/projectData'

export interface PrefabDocument {
  prefabVersion: 2
  name: string
  bundle: EntityBundle
  variantOf: string | null
  sourceChecksum: string
  createdAt: string
}

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T }
function checksum(value: unknown): string { const source = canonicalProjectText(value); let hash = 0x811c9dc5; for (let index = 0; index < source.length; index++) hash = Math.imul(hash ^ source.charCodeAt(index), 0x01000193) >>> 0; return hash.toString(16).padStart(8, '0') }
function deterministicPrefabText(document: PrefabDocument): string { const value = clone(document); value.sourceChecksum = checksum(value.bundle); return canonicalProjectText(value) }

function prefabRecord(assetRef: string | null | undefined): { reference: string; document: PrefabDocument } | null {
  const asset = resolveAsset(assetRef)
  const source = readTextAsset(assetRef)
  if (!asset || asset.assetType !== 'prefab' || !source) return null
  try {
    const document = JSON.parse(source) as Partial<PrefabDocument> & { prefabVersion?: number }
    if (![1, 2].includes(document.prefabVersion ?? 0) || !document.bundle || !Array.isArray(document.bundle.entities) || !Array.isArray(document.bundle.rootUuids)) return null
    const normalized: PrefabDocument = { prefabVersion: 2, name: String(document.name ?? asset.name).slice(0, 80), bundle: document.bundle, variantOf: typeof document.variantOf === 'string' ? document.variantOf : null, sourceChecksum: typeof document.sourceChecksum === 'string' ? document.sourceChecksum : checksum(document.bundle), createdAt: typeof document.createdAt === 'string' ? document.createdAt : new Date(0).toISOString() }
    return { reference: assetReference(asset.uuid), document: normalized }
  } catch {
    return null
  }
}

function storedTransform(record: SceneEntityData): Record<string, unknown> | null {
  const component = record.components?.find(candidate => candidate.kind === 'Transform2D')
  return component?.data && typeof component.data === 'object' ? component.data : null
}

function prepareBundleForPrefab(bundle: EntityBundle): EntityBundle {
  const prepared = clone(bundle)
  const rootSet = new Set(prepared.rootUuids)
  for (const record of prepared.entities) {
    if (record.prefabAsset && record.prefabInstanceUuid && record.prefabSourceUuid) {
      record.prefabLayers = [
        ...(Array.isArray(record.prefabLayers) ? record.prefabLayers : []),
        { asset: record.prefabAsset, instanceUuid: record.prefabInstanceUuid, sourceUuid: record.prefabSourceUuid, overrides: clone(record.prefabOverrides ?? {}) }
      ]
    }
    delete record.prefabAsset
    delete record.prefabInstanceUuid
    delete record.prefabSourceUuid
    delete record.prefabOverrides
    if (record.uuid && rootSet.has(record.uuid)) {
      const transform = storedTransform(record)
      if (transform) transform.parentUuid = null
    }
  }
  return prepared
}

export function createPrefabFromEntities(entityIds: number[], requestedName?: string): string | null {
  const bundle = captureEntityBundle(entityIds)
  if (!bundle) return null
  const root = physicsState.world.entities.find(entity => entity.uuid === bundle.rootUuids[0])
  const name = (requestedName?.trim() || root?.name || 'Prefab').slice(0, 80)
  const prepared = prepareBundleForPrefab(bundle)
  const document: PrefabDocument = { prefabVersion: 2, name, bundle: prepared, variantOf: null, sourceChecksum: checksum(prepared), createdAt: new Date().toISOString() }
  const asset = createTextAsset(name, 'prefab', deterministicPrefabText(document), 'Assets/Prefabs')
  const reference = assetReference(asset.uuid)
  const instanceUuid = normalizeUuid(undefined)
  for (const entity of subtreeEntities(entityIds, physicsState.world.entities)) {
    if (entity.prefabAsset && entity.prefabInstanceUuid && entity.prefabSourceUuid) {
      entity.prefabLayers.push({ asset: entity.prefabAsset, instanceUuid: entity.prefabInstanceUuid, sourceUuid: entity.prefabSourceUuid, overrides: clone(entity.prefabOverrides) })
    }
    entity.prefabAsset = reference
    entity.prefabInstanceUuid = instanceUuid
    entity.prefabSourceUuid = entity.uuid
    entity.prefabOverrides = {}
    entity.ownership = 'Prefab'
    entity.ownerUuid = root?.uuid ?? null
  }
  pushHistory('Create prefab')
  return reference
}

export function instantiatePrefab(
  assetRef: string,
  position?: Vec2,
  select = true,
  invalidateRuntime = true
): Entity[] {
  const prefab = prefabRecord(assetRef)
  if (!prefab) return []
  const instance = instantiateEntityBundle(prefab.document.bundle, { x: 0, y: 0 }, '', select, invalidateRuntime)
  const instanceUuid = normalizeUuid(undefined)
  for (const [sourceUuid, entity] of instance.sourceToEntity) {
    entity.prefabAsset = prefab.reference
    entity.prefabInstanceUuid = instanceUuid
    entity.prefabSourceUuid = sourceUuid
    entity.prefabOverrides = {}
    entity.ownership = 'Prefab'
  }
  const instanceRootUuid = instance.roots[0]?.uuid ?? null
  for (const entity of instance.entities) entity.ownerUuid = instanceRootUuid
  if (position && instance.roots.length) {
    const origin = worldTransform(instance.roots[0], physicsState.world.entities).position
    const delta = { x: position.x - origin.x, y: position.y - origin.y }
    for (const root of instance.roots) translateEntityTree(root, delta, physicsState.world.entities)
  }
  return instance.entities
}

export function prefabInstanceEntities(entity: Entity): Entity[] {
  if (!entity.prefabInstanceUuid) return []
  return physicsState.world.entities.filter(candidate => candidate.prefabInstanceUuid === entity.prefabInstanceUuid)
}

function canonicalRecord(record: SceneEntityData, instanceEntities: Entity[]): Record<string, unknown> {
  const sourceByCurrent = new Map(instanceEntities.map(entity => [entity.uuid, entity.prefabSourceUuid]))
  const value = clone(record) as Record<string, unknown>
  delete value.uuid
  delete value.prefabAsset
  delete value.prefabInstanceUuid
  delete value.prefabSourceUuid
  delete value.prefabOverrides
  const components = value.components
  if (Array.isArray(components)) {
    for (const raw of components) {
      if (!raw || typeof raw !== 'object') continue
      const component = raw as Record<string, unknown>
      delete component.uuid
      if (component.kind === 'Script2D' && component.data && typeof component.data === 'object') delete (component.data as Record<string, unknown>).lastError
      if (component.kind === 'Transform2D' && component.data && typeof component.data === 'object') {
        const data = component.data as Record<string, unknown>
        if (typeof data.parentUuid === 'string' && sourceByCurrent.has(data.parentUuid)) data.parentUuid = sourceByCurrent.get(data.parentUuid)
      }
    }
  }
  return value
}

function diffValues(base: unknown, current: unknown, path: string, output: Record<string, unknown>): void {
  if (Object.is(base, current)) return
  if (Array.isArray(base) && Array.isArray(current)) {
    if (JSON.stringify(base) !== JSON.stringify(current)) output[path] = clone(current)
    return
  }
  if (base && current && typeof base === 'object' && typeof current === 'object') {
    const keys = new Set([...Object.keys(base as object), ...Object.keys(current as object)])
    for (const key of keys) diffValues((base as Record<string, unknown>)[key], (current as Record<string, unknown>)[key], path ? `${path}.${key}` : key, output)
    return
  }
  output[path] = clone(current)
}

function applyOverride(target: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split('.').filter(Boolean)
  let cursor: unknown = target
  for (let index = 0; index < segments.length - 1; index++) {
    const segment = segments[index]
    const numeric = /^\d+$/.test(segment) ? Number(segment) : segment
    if (!cursor || typeof cursor !== 'object') return
    cursor = (cursor as Record<PropertyKey, unknown>)[numeric]
  }
  if (!cursor || typeof cursor !== 'object' || !segments.length) return
  const last = segments[segments.length - 1]
  ;(cursor as Record<string, unknown>)[last] = clone(value)
}

function sourceRecord(document: PrefabDocument, sourceUuid: string | null): SceneEntityData | null {
  return sourceUuid ? document.bundle.entities.find(record => record.uuid === sourceUuid) ?? null : null
}

export function capturePrefabOverrides(entity: Entity): Record<string, unknown> {
  const prefab = prefabRecord(entity.prefabAsset)
  const source = prefab ? sourceRecord(prefab.document, entity.prefabSourceUuid) : null
  if (!source) return {}
  const current = canonicalRecord(serializeEntity(entity) as SceneEntityData, prefabInstanceEntities(entity))
  const baseline = canonicalRecord(source, [])
  const overrides: Record<string, unknown> = {}
  diffValues(baseline, current, '', overrides)
  delete overrides['']
  entity.prefabOverrides = overrides
  return overrides
}

function replacePrefabInstance(instanceEntities: Entity[], document: PrefabDocument, preserveOverrides: boolean): Entity[] {
  if (!instanceEntities.length) return []
  const currentBySource = new Map(instanceEntities.flatMap(entity => entity.prefabSourceUuid ? [[entity.prefabSourceUuid, entity] as const] : []))
  const prefabAsset = instanceEntities[0].prefabAsset
  const prefabInstanceUuid = instanceEntities[0].prefabInstanceUuid
  if (!prefabAsset || !prefabInstanceUuid) return []
  const overridesBySource = new Map<string, Record<string, unknown>>()
  for (const [sourceUuid, current] of currentBySource) {
    overridesBySource.set(sourceUuid, preserveOverrides ? capturePrefabOverrides(current) : {})
  }
  const sourceToCurrentUuid = new Map<string, string>()
  const sourceToRuntimeId = new Map<string, number>()
  for (const source of document.bundle.entities) {
    if (!source.uuid) continue
    const current = currentBySource.get(source.uuid)
    sourceToCurrentUuid.set(source.uuid, current?.uuid ?? normalizeUuid(undefined))
    sourceToRuntimeId.set(source.uuid, current?.id ?? physicsState.world.allocateId())
  }
  const replacements: Entity[] = []
  for (const source of document.bundle.entities) {
    if (!source.uuid) continue
    const current = currentBySource.get(source.uuid)
    const record = clone(source)
    const overrides = overridesBySource.get(source.uuid) ?? {}
    for (const [path, value] of Object.entries(overrides)) applyOverride(record as Record<string, unknown>, path, value)
    record.uuid = sourceToCurrentUuid.get(source.uuid)
    record.prefabAsset = prefabAsset
    record.prefabInstanceUuid = prefabInstanceUuid
    record.prefabSourceUuid = source.uuid
    record.prefabOverrides = overrides
    const transform = storedTransform(record)
    if (transform && typeof transform.parentUuid === 'string') transform.parentUuid = sourceToCurrentUuid.get(transform.parentUuid) ?? null
    const componentUuidByKind = new Map(current?.components.map(component => [component.kind, component.uuid]) ?? [])
    record.components?.forEach(component => { component.uuid = component.kind ? componentUuidByKind.get(component.kind) : undefined })
    const replacement = createEntityFromData(record, sourceToRuntimeId.get(source.uuid)!)
    replacement.persistentAcrossScenes = current?.persistentAcrossScenes ?? false
    replacement.prefabAsset = prefabAsset
    replacement.prefabInstanceUuid = prefabInstanceUuid
    replacement.prefabSourceUuid = source.uuid
    replacement.prefabOverrides = overrides
    replacements.push(replacement)
  }
  const instanceIds = new Set(instanceEntities.map(entity => entity.id))
  const validSources = new Set(document.bundle.entities.flatMap(source => source.uuid ? [source.uuid] : []))
  const staleIds = new Set(instanceEntities.filter(entity => !entity.prefabSourceUuid || !validSources.has(entity.prefabSourceUuid)).map(entity => entity.id))
  for (let index = physicsState.world.connections.length - 1; index >= 0; index--) {
    const connection = physicsState.world.connections[index]
    if (connection.anchors.every(anchor => instanceIds.has(anchor.entityId)) || connection.anchors.some(anchor => staleIds.has(anchor.entityId))) {
      physicsState.world.connections.splice(index, 1)
    }
  }
  for (let index = physicsState.world.entities.length - 1; index >= 0; index--) {
    if (staleIds.has(physicsState.world.entities[index].id)) physicsState.world.entities.splice(index, 1)
  }
  for (const replacement of replacements) {
    const index = physicsState.world.entities.findIndex(entity => entity.id === replacement.id)
    if (index >= 0) physicsState.world.entities.splice(index, 1, replacement)
    else physicsState.world.entities.push(replacement)
  }
  for (const stored of document.bundle.connections) {
    if (!stored.anchorUuids.every(uuid => sourceToRuntimeId.has(uuid))) continue
    const connection = clone(stored.connection) as Connection
    connection.id = physicsState.world.allocateConnectionId()
    connection.uuid = normalizeUuid(undefined)
    connection.anchors.forEach((anchor, index) => { anchor.entityId = sourceToRuntimeId.get(stored.anchorUuids[index])! })
    connection.breakState = 'intact'
    connection.breakLink = -1
    if (normalizeConnection(connection, physicsState.world.entities)) physicsState.world.connections.push(connection)
  }
  const validSelection = physicsState.selectedEntityIds.filter(id => physicsState.world.entities.some(entity => entity.id === id))
  if (validSelection.length !== physicsState.selectedEntityIds.length) selectEntities(validSelection, 'replace')
  physicsState.world.invalidateRuntime()
  return replacements
}

export function revertPrefabInstance(entity: Entity): boolean {
  const prefab = prefabRecord(entity.prefabAsset)
  if (!prefab) return false
  const replaced = replacePrefabInstance(prefabInstanceEntities(entity), prefab.document, false)
  if (!replaced.length) return false
  selectEntities(replaced.map(candidate => candidate.id), 'replace', entity.id)
  pushHistory('Revert prefab instance')
  return true
}

export function applyPrefabFromInstance(entity: Entity): boolean {
  const prefab = prefabRecord(entity.prefabAsset)
  const guid = assetGuid(entity.prefabAsset)
  if (!prefab || !guid) return false
  const sourceInstance = prefabInstanceEntities(entity)
  if (!sourceInstance.length) return false

  const otherInstances = new Map<string, Entity[]>()
  for (const candidate of physicsState.world.entities) {
    if (candidate.prefabAsset !== prefab.reference || !candidate.prefabInstanceUuid || candidate.prefabInstanceUuid === entity.prefabInstanceUuid) continue
    const values = otherInstances.get(candidate.prefabInstanceUuid) ?? []
    values.push(candidate)
    otherInstances.set(candidate.prefabInstanceUuid, values)
  }
  for (const entities of otherInstances.values()) for (const candidate of entities) capturePrefabOverrides(candidate)

  const bundle = captureEntityBundle(sourceInstance.map(candidate => candidate.id))
  if (!bundle) return false
  const sourceByCurrent = new Map(sourceInstance.map(candidate => [candidate.uuid, candidate.prefabSourceUuid ?? candidate.uuid]))
  for (const record of bundle.entities) {
    if (!record.uuid) continue
    const sourceUuid = sourceByCurrent.get(record.uuid) ?? record.uuid
    record.uuid = sourceUuid
    delete record.prefabAsset; delete record.prefabInstanceUuid; delete record.prefabSourceUuid; delete record.prefabOverrides
    const transform = storedTransform(record)
    if (transform && typeof transform.parentUuid === 'string') transform.parentUuid = sourceByCurrent.get(transform.parentUuid) ?? null
  }
  bundle.rootUuids = bundle.rootUuids.map(uuid => sourceByCurrent.get(uuid) ?? uuid)
  for (const connection of bundle.connections) connection.anchorUuids = connection.anchorUuids.map(uuid => sourceByCurrent.get(uuid) ?? uuid)
  const prepared = prepareBundleForPrefab(bundle)
  if (prefabBundleCreatesCycle(prefab.reference, prepared)) return false
  const document: PrefabDocument = { ...prefab.document, prefabVersion: 2, name: prefab.document.name, bundle: prepared, sourceChecksum: checksum(prepared) }
  if (!updateTextAssetTransactional(guid, deterministicPrefabText(document))) return false
  for (const candidate of sourceInstance) candidate.prefabOverrides = {}
  for (const entities of otherInstances.values()) replacePrefabInstance(entities, document, true)
  pushHistory('Apply prefab')
  return true
}

export function unpackPrefabInstance(entity: Entity): boolean {
  const entities = prefabInstanceEntities(entity)
  if (!entities.length) return false
  for (const candidate of entities) {
    candidate.prefabAsset = null
    candidate.prefabInstanceUuid = null
    candidate.prefabSourceUuid = null
    candidate.prefabOverrides = {}
    const nested = candidate.prefabLayers.pop()
    if (nested) {
      candidate.prefabAsset = nested.asset
      candidate.prefabInstanceUuid = nested.instanceUuid
      candidate.prefabSourceUuid = nested.sourceUuid
      candidate.prefabOverrides = clone(nested.overrides)
      candidate.ownership = 'Prefab'
    } else {
      candidate.ownership = 'Scene'
      candidate.ownerUuid = null
    }
  }
  pushHistory('Unpack prefab')
  return true
}

export function comparePrefabInstance(entity: Entity): Array<{ path: string; value: unknown }> {
  return Object.entries(capturePrefabOverrides(entity)).sort(([left], [right]) => left.localeCompare(right)).map(([path, value]) => ({ path, value: clone(value) }))
}

export function resetPrefabOverride(entity: Entity, path: string): boolean {
  const prefab = prefabRecord(entity.prefabAsset)
  const source = prefab ? sourceRecord(prefab.document, entity.prefabSourceUuid) : null
  if (!source || !Object.prototype.hasOwnProperty.call(capturePrefabOverrides(entity), path)) return false
  const baseline = canonicalRecord(source, [])
  const segments = path.split('.').filter(Boolean)
  let value: unknown = baseline
  for (const segment of segments) {
    if (!value || typeof value !== 'object') return false
    value = (value as Record<string, unknown>)[segment]
  }
  const current = serializeEntity(entity) as SceneEntityData
  applyOverride(current as Record<string, unknown>, path, value)
  const replacement = createEntityFromData(current, entity.id)
  const index = physicsState.world.entities.findIndex(candidate => candidate.id === entity.id)
  if (index < 0) return false
  replacement.prefabOverrides = { ...entity.prefabOverrides }
  delete replacement.prefabOverrides[path]
  physicsState.world.entities.splice(index, 1, replacement)
  selectEntities([replacement.id], 'replace')
  physicsState.world.invalidateRuntime()
  pushHistory('Reset prefab override')
  return true
}

export function refreshPrefabAssetInstances(assetRef: string): number {
  const prefab = prefabRecord(assetRef)
  if (!prefab) return 0
  const instances = new Map<string, Entity[]>()
  for (const entity of physicsState.world.entities) {
    if (entity.prefabAsset !== prefab.reference || !entity.prefabInstanceUuid) continue
    const values = instances.get(entity.prefabInstanceUuid) ?? []
    values.push(entity)
    instances.set(entity.prefabInstanceUuid, values)
  }
  let count = 0
  for (const values of instances.values()) count += replacePrefabInstance(values, prefab.document, true).length
  return count
}

function bundlePrefabReferences(bundle: EntityBundle): string[] {
  const references = new Set<string>()
  for (const entity of bundle.entities) {
    if (typeof entity.prefabAsset === 'string') references.add(entity.prefabAsset)
    for (const layer of entity.prefabLayers ?? []) if (typeof layer.asset === 'string') references.add(layer.asset)
  }
  return [...references].sort((a, b) => a.localeCompare(b))
}

function prefabDependsOn(reference: string, target: string, visited = new Set<string>()): boolean {
  if (reference === target) return true
  if (visited.has(reference) || visited.size > 256) return false
  visited.add(reference)
  const prefab = prefabRecord(reference)
  return Boolean(prefab && bundlePrefabReferences(prefab.document.bundle).some(child => prefabDependsOn(child, target, visited)))
}

export function prefabBundleCreatesCycle(targetReference: string, bundle: EntityBundle): boolean {
  return bundlePrefabReferences(bundle).some(reference => prefabDependsOn(reference, targetReference))
}

export interface PrefabConflict { code: 'missing-source' | 'circular-dependency' | 'orphan-source' | 'stale-source' | 'override'; severity: 'error' | 'warning' | 'info'; message: string; path?: string }
export function prefabConflictReport(entity: Entity): PrefabConflict[] {
  if (!entity.prefabAsset) return []
  const prefab = prefabRecord(entity.prefabAsset)
  if (!prefab) return [{ code: 'missing-source', severity: 'error', message: 'Prefab source is missing or invalid.' }]
  const source = sourceRecord(prefab.document, entity.prefabSourceUuid)
  const output: PrefabConflict[] = []
  if (!source) output.push({ code: 'orphan-source', severity: 'error', message: 'Prefab source entity no longer exists.' })
  if (prefabBundleCreatesCycle(prefab.reference, prefab.document.bundle)) output.push({ code: 'circular-dependency', severity: 'error', message: 'Prefab dependency graph is circular.' })
  if (prefab.document.sourceChecksum !== checksum(prefab.document.bundle)) output.push({ code: 'stale-source', severity: 'warning', message: 'Prefab checksum does not match its authored bundle.' })
  for (const [path] of Object.entries(capturePrefabOverrides(entity))) output.push({ code: 'override', severity: 'info', message: `Instance overrides ${path}.`, path })
  return output.sort((left, right) => left.severity.localeCompare(right.severity) || (left.path ?? '').localeCompare(right.path ?? ''))
}

export function createPrefabVariantFromInstance(entity: Entity, requestedName?: string): string | null {
  const base = prefabRecord(entity.prefabAsset)
  const entities = prefabInstanceEntities(entity)
  if (!base || !entities.length) return null
  const bundle = captureEntityBundle(entities.map(candidate => candidate.id))
  if (!bundle) return null
  const prepared = prepareBundleForPrefab(bundle)
  // A variant is expected to retain a direct layer/reference to its base.
  // The new asset has no identity yet, so the existing graph cannot point
  // back to it; treating the base edge as a cycle rejects every valid variant.
  const name = (requestedName?.trim() || `${base.document.name} Variant`).slice(0, 80)
  const document: PrefabDocument = { prefabVersion: 2, name, bundle: prepared, variantOf: base.reference, sourceChecksum: checksum(prepared), createdAt: new Date().toISOString() }
  const asset = createTextAsset(name, 'prefab', deterministicPrefabText(document), 'Assets/Prefabs')
  const reference = assetReference(asset.uuid), instanceUuid = normalizeUuid(undefined)
  for (const candidate of entities) { candidate.prefabLayers.push({ asset: candidate.prefabAsset!, instanceUuid: candidate.prefabInstanceUuid!, sourceUuid: candidate.prefabSourceUuid!, overrides: clone(candidate.prefabOverrides) }); candidate.prefabAsset = reference; candidate.prefabInstanceUuid = instanceUuid; candidate.prefabSourceUuid = candidate.uuid; candidate.prefabOverrides = {}; candidate.ownership = 'Prefab' }
  pushHistory('Create prefab variant', `prefab:${asset.uuid}`)
  return reference
}

export function replaceEntitiesWithPrefab(entityIds: number[], assetRef: string): Entity[] {
  const roots = physicsState.world.entities.filter(entity => entityIds.includes(entity.id))
  if (!roots.length || !prefabRecord(assetRef)) return []
  const selected = subtreeEntities(roots.map(entity => entity.id), physicsState.world.entities)
  const center = roots.reduce((value, entity) => { const point = worldTransform(entity, physicsState.world.entities).position; value.x += point.x / roots.length; value.y += point.y / roots.length; return value }, { x: 0, y: 0 })
  const selectedSet = new Set(selected.map(entity => entity.id)), selectedUuids = new Set(selected.map(entity => entity.uuid))
  const externalChildren = physicsState.world.entities.filter(entity => entity.parentUuid && selectedUuids.has(entity.parentUuid) && !selectedSet.has(entity.id))
  const sharedParent = roots.every(entity => entity.parentUuid === roots[0].parentUuid) ? roots[0].parentUuid : null
  for (let index = physicsState.world.connections.length - 1; index >= 0; index--) if (physicsState.world.connections[index].anchors.some(anchor => selectedSet.has(anchor.entityId))) physicsState.world.connections.splice(index, 1)
  for (let index = physicsState.world.entities.length - 1; index >= 0; index--) if (selectedSet.has(physicsState.world.entities[index].id)) physicsState.world.entities.splice(index, 1)
  const replacements = instantiatePrefab(assetRef, center, true)
  const replacementRoot = replacements.find(entity => !entity.parentUuid || !replacements.some(candidate => candidate.uuid === entity.parentUuid)) ?? replacements[0]
  if (replacementRoot) {
    if (sharedParent && physicsState.world.entities.some(entity => entity.uuid === sharedParent)) setParent(replacementRoot, sharedParent, physicsState.world.entities, true)
    for (const child of externalChildren) setParent(child, replacementRoot.uuid, physicsState.world.entities, true)
    pushHistory('Replace selection with prefab')
  }
  return replacements
}
