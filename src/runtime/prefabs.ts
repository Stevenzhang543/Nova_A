import { assetGuid, assetReference, createTextAsset, readTextAsset, resolveAsset, updateTextAsset } from '../assets/AssetDatabase'
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
import { translateEntityTree, worldTransform } from '../world/hierarchy'
import { normalizeUuid } from '../world/identity'
import { normalizeConnection, type Connection } from '../world/Connection'
import type { Vec2 } from '../world/types'

export interface PrefabDocument {
  prefabVersion: 1
  name: string
  bundle: EntityBundle
}

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T }

function prefabRecord(assetRef: string | null | undefined): { reference: string; document: PrefabDocument } | null {
  const asset = resolveAsset(assetRef)
  const source = readTextAsset(assetRef)
  if (!asset || asset.assetType !== 'prefab' || !source) return null
  try {
    const document = JSON.parse(source) as Partial<PrefabDocument>
    if (document.prefabVersion !== 1 || !document.bundle || !Array.isArray(document.bundle.entities) || !Array.isArray(document.bundle.rootUuids)) return null
    return { reference: assetReference(asset.uuid), document: document as PrefabDocument }
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
  const document: PrefabDocument = { prefabVersion: 1, name, bundle: prepareBundleForPrefab(bundle) }
  const asset = createTextAsset(name, 'prefab', JSON.stringify(document, null, 2), 'Assets/Prefabs')
  const reference = assetReference(asset.uuid)
  const instanceUuid = normalizeUuid(undefined)
  for (const entity of subtreeEntities(entityIds, physicsState.world.entities)) {
    entity.prefabAsset = reference
    entity.prefabInstanceUuid = instanceUuid
    entity.prefabSourceUuid = entity.uuid
    entity.prefabOverrides = {}
  }
  pushHistory('Create prefab')
  return reference
}

export function instantiatePrefab(
  assetRef: string,
  position?: Vec2,
  select = true
): Entity[] {
  const prefab = prefabRecord(assetRef)
  if (!prefab) return []
  const instance = instantiateEntityBundle(prefab.document.bundle, { x: 0, y: 0 }, '')
  const instanceUuid = normalizeUuid(undefined)
  for (const [sourceUuid, entity] of instance.sourceToEntity) {
    entity.prefabAsset = prefab.reference
    entity.prefabInstanceUuid = instanceUuid
    entity.prefabSourceUuid = sourceUuid
    entity.prefabOverrides = {}
  }
  if (position && instance.roots.length) {
    const origin = worldTransform(instance.roots[0], physicsState.world.entities).position
    const delta = { x: position.x - origin.x, y: position.y - origin.y }
    for (const root of instance.roots) translateEntityTree(root, delta, physicsState.world.entities)
  }
  if (select) selectEntities(instance.roots.map(entity => entity.id), 'replace')
  physicsState.world.invalidateRuntime()
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
  const document: PrefabDocument = { prefabVersion: 1, name: prefab.document.name, bundle: prepareBundleForPrefab(bundle) }
  if (!updateTextAsset(guid, JSON.stringify(document, null, 2))) return false
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
  }
  pushHistory('Unpack prefab')
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
