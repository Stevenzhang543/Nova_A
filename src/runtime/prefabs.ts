/** 预制体系统：创建、实例化和更新预制资源，跟踪嵌套来源及字段覆盖。 */
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
  readEntityAuthoringData,
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

/** 结构说明（自动提取）：clone；输入 value；直接调用 JSON.parse、JSON.stringify。 */ function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T }
/** 结构说明（自动提取）：checksum；输入 value；直接调用 canonicalProjectText、Math.imul、source.charCodeAt、padStart、hash.toString；写入 hash；包含循环处理。 */ function checksum(value: unknown): string { const source = canonicalProjectText(value); let hash = 0x811c9dc5; for (let index = 0; index < source.length; index++) hash = Math.imul(hash ^ source.charCodeAt(index), 0x01000193) >>> 0; return hash.toString(16).padStart(8, '0') }
/** 结构说明（自动提取）：deterministicPrefabText；输入 document；直接调用 clone、checksum、canonicalProjectText；写入 value.sourceChecksum。 */ function deterministicPrefabText(document: PrefabDocument): string { const value = clone(document); value.sourceChecksum = checksum(value.bundle); return canonicalProjectText(value) }

/** 结构说明（自动提取）：prefabRecord；输入 assetRef；直接调用 resolveAsset、readTextAsset、JSON.parse、includes、Array.isArray 等。 */ function prefabRecord(assetRef: string | null | undefined): { reference: string; document: PrefabDocument } | null {
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

/** 结构说明（自动提取）：storedTransform；输入 record；直接调用 record.components.find。 */ function storedTransform(record: SceneEntityData): Record<string, unknown> | null {
  const component = record.components?.find(/* 比较 candidate.kind 与 'Transform2D'，返回严格相等的判断结果。 */ candidate => candidate.kind === 'Transform2D')
  return component?.data && typeof component.data === 'object' ? component.data : null
}

/** 结构说明（自动提取）：prepareBundleForPrefab；输入 bundle；直接调用 clone、Set、Array.isArray、rootSet.has、storedTransform；写入 record.prefabLayers、transform.parentUuid；返回路径包含 prepared；包含循环处理。 */ function prepareBundleForPrefab(bundle: EntityBundle): EntityBundle {
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

/** 结构说明（自动提取）：createPrefabFromEntities；输入 entityIds、requestedName；直接调用 captureEntityBundle、physicsState.world.entities.find、slice、requestedName.trim、prepareBundleForPrefab 等；写入 entity.prefabAsset、entity.prefabInstanceUuid、entity.prefabSourceUuid、entity.prefabOverrides 等；返回路径包含 reference；包含循环处理。 */ export function createPrefabFromEntities(entityIds: number[], requestedName?: string): string | null {
  const bundle = captureEntityBundle(entityIds)
  if (!bundle) return null
  const root = physicsState.world.entities.find(/* 比较 entity.uuid 与 bundle.rootUuids[0]，返回严格相等的判断结果。 */ entity => entity.uuid === bundle.rootUuids[0])
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

/** 结构说明（自动提取）：instantiatePrefab；输入 assetRef、position、select、invalidateRuntime；直接调用 prefabRecord、instantiateEntityBundle、normalizeUuid、worldTransform、translateEntityTree；写入 entity.prefabAsset、entity.prefabInstanceUuid、entity.prefabSourceUuid、entity.prefabOverrides 等；返回路径包含 instance.entities；包含循环处理。 */ export function instantiatePrefab(
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

/** 结构说明（自动提取）：prefabInstanceEntities；输入 entity；直接调用 physicsState.world.entities.filter。 */ export function prefabInstanceEntities(entity: Entity): Entity[] {
  if (!entity.prefabInstanceUuid) return []
  return physicsState.world.entities.filter(/* 比较 candidate.prefabInstanceUuid 与 entity.prefabInstanceUuid，返回严格相等的判断结果。 */ candidate => candidate.prefabInstanceUuid === entity.prefabInstanceUuid)
}

/** 结构说明（自动提取）：canonicalRecord；输入 record、instanceEntities；直接调用 Map、instanceEntities.map、clone、Array.isArray、sourceByCurrent.has 等；写入 data.parentUuid；返回路径包含 value；包含循环处理。 */ function canonicalRecord(record: SceneEntityData, instanceEntities: Entity[]): Record<string, unknown> {
  const sourceByCurrent = new Map(instanceEntities.map(/* 返回按声明顺序构造的数组 [entity.uuid, entity.prefabSourceUuid]。 */ entity => [entity.uuid, entity.prefabSourceUuid]))
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

/** 结构说明（自动提取）：diffValues；输入 base、current、path、output；直接调用 Object.is、Array.isArray、canonicalProjectText、clone、Set 等；写入 output[…]；包含循环处理。 */ function diffValues(base: unknown, current: unknown, path: string, output: Record<string, unknown>): void {
  if (Object.is(base, current)) return
  if (Array.isArray(base) && Array.isArray(current)) {
    if (canonicalProjectText(base) !== canonicalProjectText(current)) output[path] = clone(current)
    return
  }
  if (base && current && typeof base === 'object' && typeof current === 'object') {
    const keys = new Set([...Object.keys(base as object), ...Object.keys(current as object)])
    for (const key of keys) diffValues((base as Record<string, unknown>)[key], (current as Record<string, unknown>)[key], path ? `${path}.${key}` : key, output)
    return
  }
  output[path] = clone(current)
}

/** 结构说明（自动提取）：applyOverride；输入 target、path、value；直接调用 filter、path.split、test、Number、clone；写入 cursor、[…]；包含循环处理。 */ function applyOverride(target: Record<string, unknown>, path: string, value: unknown): void {
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

/** 结构说明（自动提取）：sourceRecord；输入 document、sourceUuid；直接调用 document.bundle.entities.find。 */ function sourceRecord(document: PrefabDocument, sourceUuid: string | null): SceneEntityData | null {
  return sourceUuid ? document.bundle.entities.find(/* 比较 record.uuid 与 sourceUuid，返回严格相等的判断结果。 */ record => record.uuid === sourceUuid) ?? null : null
}

/** 结构说明（自动提取）：calculatePrefabOverrides；输入 entity、snapshot；直接调用 prefabRecord、sourceRecord、canonicalRecord、snapshot、prefabInstanceEntities 等；返回路径包含 overrides。 */ function calculatePrefabOverrides(entity: Entity, snapshot: (entity: Entity) => Record<string, unknown>): Record<string, unknown> | null {
  const prefab = prefabRecord(entity.prefabAsset)
  const source = prefab ? sourceRecord(prefab.document, entity.prefabSourceUuid) : null
  if (!source) return null
  const current = canonicalRecord(snapshot(entity) as SceneEntityData, prefabInstanceEntities(entity))
  const baseline = canonicalRecord(source, [])
  const overrides: Record<string, unknown> = {}
  diffValues(baseline, current, '', overrides)
  delete overrides['']
  return overrides
}

/** Inspector queries are pure: they neither normalize components nor write reactive overrides. */
/* 当 calculatePrefabOverrides(entity, readEntityAuthoringData) 为 null 或 undefined 时返回 {}，否则保留左侧值。 */ export function readPrefabOverrides(entity: Entity): Record<string, unknown> { return calculatePrefabOverrides(entity, readEntityAuthoringData) ?? {} }

/** 结构说明（自动提取）：capturePrefabOverrides；输入 entity；直接调用 calculatePrefabOverrides；写入 entity.prefabOverrides；返回路径包含 overrides。 */ export function capturePrefabOverrides(entity: Entity): Record<string, unknown> {
  const overrides = calculatePrefabOverrides(entity, serializeEntity)
  if (!overrides) return {}
  entity.prefabOverrides = overrides
  return overrides
}

/** 结构说明（自动提取）：replacePrefabInstance；输入 instanceEntities、document、preserveOverrides；直接调用 Map、instanceEntities.flatMap、overridesBySource.set、capturePrefabOverrides、currentBySource.get 等；写入 record.uuid、record.prefabAsset、record.prefabInstanceUuid、record.prefabSourceUuid 等；返回路径包含 replacements；包含循环处理。 */ function replacePrefabInstance(instanceEntities: Entity[], document: PrefabDocument, preserveOverrides: boolean): Entity[] {
  if (!instanceEntities.length) return []
  const currentBySource = new Map(instanceEntities.flatMap(/* 根据 entity.prefabSourceUuid 的真假，分别返回 [[entity.prefabSourceUuid, entity] as const] 或 []。 */ entity => entity.prefabSourceUuid ? [[entity.prefabSourceUuid, entity] as const] : []))
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
    const componentUuidByKind = new Map(current?.components.map(/* 返回按声明顺序构造的数组 [component.kind, component.uuid]。 */ component => [component.kind, component.uuid]) ?? [])
    record.components?.forEach(/** 将 component.kind ? componentUuidByKind.get(component.kind) : undefined 赋给 component.uuid，不显式返回值。 */ component => { component.uuid = component.kind ? componentUuidByKind.get(component.kind) : undefined })
    const replacement = createEntityFromData(record, sourceToRuntimeId.get(source.uuid)!)
    replacement.persistentAcrossScenes = current?.persistentAcrossScenes ?? false
    replacement.prefabAsset = prefabAsset
    replacement.prefabInstanceUuid = prefabInstanceUuid
    replacement.prefabSourceUuid = source.uuid
    replacement.prefabOverrides = overrides
    replacements.push(replacement)
  }
  const instanceIds = new Set(instanceEntities.map(/* 返回 entity.id 的当前值。 */ entity => entity.id))
  const validSources = new Set(document.bundle.entities.flatMap(/* 根据 source.uuid 的真假，分别返回 [source.uuid] 或 []。 */ source => source.uuid ? [source.uuid] : []))
  const staleIds = new Set(instanceEntities.filter(/* 先计算 !entity.prefabSourceUuid；仅当其为假值时求右侧 !validSources.has(entity.prefabSourceUuid)，返回短路求值结果。 */ entity => !entity.prefabSourceUuid || !validSources.has(entity.prefabSourceUuid)).map(/* 返回 entity.id 的当前值。 */ entity => entity.id))
  for (let index = physicsState.world.connections.length - 1; index >= 0; index--) {
    const connection = physicsState.world.connections[index]
    if (connection.anchors.every(/* 调用 instanceIds.has(anchor.entityId) 并返回调用结果。 */ anchor => instanceIds.has(anchor.entityId)) || connection.anchors.some(/* 调用 staleIds.has(anchor.entityId) 并返回调用结果。 */ anchor => staleIds.has(anchor.entityId))) {
      physicsState.world.connections.splice(index, 1)
    }
  }
  for (let index = physicsState.world.entities.length - 1; index >= 0; index--) {
    if (staleIds.has(physicsState.world.entities[index].id)) physicsState.world.entities.splice(index, 1)
  }
  for (const replacement of replacements) {
    const index = physicsState.world.entities.findIndex(/* 比较 entity.id 与 replacement.id，返回严格相等的判断结果。 */ entity => entity.id === replacement.id)
    if (index >= 0) physicsState.world.entities.splice(index, 1, replacement)
    else physicsState.world.entities.push(replacement)
  }
  for (const stored of document.bundle.connections) {
    if (!stored.anchorUuids.every(/* 调用 sourceToRuntimeId.has(uuid) 并返回调用结果。 */ uuid => sourceToRuntimeId.has(uuid))) continue
    const connection = clone(stored.connection) as Connection
    connection.id = physicsState.world.allocateConnectionId()
    connection.uuid = normalizeUuid(undefined)
    connection.anchors.forEach(/** 将 sourceToRuntimeId.get(stored.anchorUuids[index])! 赋给 anchor.entityId，不显式返回值。 */ (anchor, index) => { anchor.entityId = sourceToRuntimeId.get(stored.anchorUuids[index])! })
    connection.breakState = 'intact'
    connection.breakLink = -1
    if (normalizeConnection(connection, physicsState.world.entities)) physicsState.world.connections.push(connection)
  }
  const validSelection = physicsState.selectedEntityIds.filter(/** 结构说明（自动提取）：physicsState.selectedEntityIds.filter 回调；输入 id；直接调用 physicsState.world.entities.some；返回表达式求值结果。 */ id => physicsState.world.entities.some(/* 比较 entity.id 与 id，返回严格相等的判断结果。 */ entity => entity.id === id))
  if (validSelection.length !== physicsState.selectedEntityIds.length) selectEntities(validSelection, 'replace')
  physicsState.world.invalidateRuntime()
  return replacements
}

/** 结构说明（自动提取）：revertPrefabInstance；输入 entity；直接调用 prefabRecord、replacePrefabInstance、prefabInstanceEntities、selectEntities、replaced.map 等。 */ export function revertPrefabInstance(entity: Entity): boolean {
  const prefab = prefabRecord(entity.prefabAsset)
  if (!prefab) return false
  const replaced = replacePrefabInstance(prefabInstanceEntities(entity), prefab.document, false)
  if (!replaced.length) return false
  selectEntities(replaced.map(/* 返回 candidate.id 的当前值。 */ candidate => candidate.id), 'replace', entity.id)
  pushHistory('Revert prefab instance')
  return true
}

/** 结构说明（自动提取）：applyPrefabFromInstance；输入 entity；直接调用 prefabRecord、assetGuid、prefabInstanceEntities、Map、otherInstances.get 等；写入 record.uuid、transform.parentUuid、bundle.rootUuids、connection.anchorUuids 等；包含循环处理。 */ export function applyPrefabFromInstance(entity: Entity): boolean {
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

  const bundle = captureEntityBundle(sourceInstance.map(/* 返回 candidate.id 的当前值。 */ candidate => candidate.id))
  if (!bundle) return false
  const sourceByCurrent = new Map(sourceInstance.map(/* 返回按声明顺序构造的数组 [candidate.uuid, candidate.prefabSourceUuid ?? candidate.uuid]。 */ candidate => [candidate.uuid, candidate.prefabSourceUuid ?? candidate.uuid]))
  for (const record of bundle.entities) {
    if (!record.uuid) continue
    const sourceUuid = sourceByCurrent.get(record.uuid) ?? record.uuid
    record.uuid = sourceUuid
    delete record.prefabAsset; delete record.prefabInstanceUuid; delete record.prefabSourceUuid; delete record.prefabOverrides
    const transform = storedTransform(record)
    if (transform && typeof transform.parentUuid === 'string') transform.parentUuid = sourceByCurrent.get(transform.parentUuid) ?? null
  }
  bundle.rootUuids = bundle.rootUuids.map(/* 当 sourceByCurrent.get(uuid) 为 null 或 undefined 时返回 uuid，否则保留左侧值。 */ uuid => sourceByCurrent.get(uuid) ?? uuid)
  for (const connection of bundle.connections) connection.anchorUuids = connection.anchorUuids.map(/* 当 sourceByCurrent.get(uuid) 为 null 或 undefined 时返回 uuid，否则保留左侧值。 */ uuid => sourceByCurrent.get(uuid) ?? uuid)
  const prepared = prepareBundleForPrefab(bundle)
  if (prefabBundleCreatesCycle(prefab.reference, prepared)) return false
  const document: PrefabDocument = { ...prefab.document, prefabVersion: 2, name: prefab.document.name, bundle: prepared, sourceChecksum: checksum(prepared) }
  if (!updateTextAssetTransactional(guid, deterministicPrefabText(document))) return false
  for (const candidate of sourceInstance) candidate.prefabOverrides = {}
  for (const entities of otherInstances.values()) replacePrefabInstance(entities, document, true)
  pushHistory('Apply prefab')
  return true
}

/** 结构说明（自动提取）：unpackPrefabInstance；输入 entity；直接调用 prefabInstanceEntities、candidate.prefabLayers.pop、clone、pushHistory；写入 candidate.prefabAsset、candidate.prefabInstanceUuid、candidate.prefabSourceUuid、candidate.prefabOverrides 等；包含循环处理。 */ export function unpackPrefabInstance(entity: Entity): boolean {
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

/** 结构说明（自动提取）：comparePrefabInstance；输入 entity；直接调用 map、sort、Object.entries、readPrefabOverrides。 */ export function comparePrefabInstance(entity: Entity): Array<{ path: string; value: unknown }> {
  return Object.entries(readPrefabOverrides(entity)).sort(/* 调用 left.localeCompare(right) 并返回调用结果。 */ ([left], [right]) => left.localeCompare(right)).map(/** 构造并返回记录 { path, value: clone(value) }，字段按当前实参及捕获状态求值。 */ ([path, value]) => ({ path, value: clone(value) }))
}

/** 结构说明（自动提取）：resetPrefabOverride；输入 entity、path；直接调用 prefabRecord、sourceRecord、Object.prototype.hasOwnProperty.call、capturePrefabOverrides、canonicalRecord 等；写入 value、replacement.prefabOverrides；包含循环处理。 */ export function resetPrefabOverride(entity: Entity, path: string): boolean {
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
  const index = physicsState.world.entities.findIndex(/* 比较 candidate.id 与 entity.id，返回严格相等的判断结果。 */ candidate => candidate.id === entity.id)
  if (index < 0) return false
  replacement.prefabOverrides = { ...entity.prefabOverrides }
  delete replacement.prefabOverrides[path]
  physicsState.world.entities.splice(index, 1, replacement)
  selectEntities([replacement.id], 'replace')
  physicsState.world.invalidateRuntime()
  pushHistory('Reset prefab override')
  return true
}

/** 结构说明（自动提取）：refreshPrefabAssetInstances；输入 assetRef；直接调用 prefabRecord、Map、instances.get、values.push、instances.set 等；写入 count；返回路径包含 count；包含循环处理。 */ export function refreshPrefabAssetInstances(assetRef: string): number {
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

/** 结构说明（自动提取）：bundlePrefabReferences；输入 bundle；直接调用 Set、references.add、sort；包含循环处理。 */ function bundlePrefabReferences(bundle: EntityBundle): string[] {
  const references = new Set<string>()
  for (const entity of bundle.entities) {
    if (typeof entity.prefabAsset === 'string') references.add(entity.prefabAsset)
    for (const layer of entity.prefabLayers ?? []) if (typeof layer.asset === 'string') references.add(layer.asset)
  }
  return [...references].sort(/* 调用 a.localeCompare(b) 并返回调用结果。 */ (a, b) => a.localeCompare(b))
}

/** 结构说明（自动提取）：prefabDependsOn；输入 reference、target、visited；直接调用 visited.has、visited.add、prefabRecord、Boolean、some 等。 */ function prefabDependsOn(reference: string, target: string, visited = new Set<string>()): boolean {
  if (reference === target) return true
  if (visited.has(reference) || visited.size > 256) return false
  visited.add(reference)
  const prefab = prefabRecord(reference)
  return Boolean(prefab && bundlePrefabReferences(prefab.document.bundle).some(/* 调用 prefabDependsOn(child, target, visited) 并返回调用结果。 */ child => prefabDependsOn(child, target, visited)))
}

/* 调用 bundlePrefabReferences(bundle).some(reference => prefabDependsOn(reference, targetReference)) 并返回调用结果。 */ export function prefabBundleCreatesCycle(targetReference: string, bundle: EntityBundle): boolean {
  return bundlePrefabReferences(bundle).some(/* 调用 prefabDependsOn(reference, targetReference) 并返回调用结果。 */ reference => prefabDependsOn(reference, targetReference))
}

export interface PrefabConflict { code: 'missing-source' | 'circular-dependency' | 'orphan-source' | 'stale-source' | 'override'; severity: 'error' | 'warning' | 'info'; message: string; path?: string }
/** 结构说明（自动提取）：prefabConflictReport；输入 entity；直接调用 prefabRecord、sourceRecord、output.push、prefabBundleCreatesCycle、checksum 等；包含循环处理。 */ export function prefabConflictReport(entity: Entity): PrefabConflict[] {
  if (!entity.prefabAsset) return []
  const prefab = prefabRecord(entity.prefabAsset)
  if (!prefab) return [{ code: 'missing-source', severity: 'error', message: 'Prefab source is missing or invalid.' }]
  const source = sourceRecord(prefab.document, entity.prefabSourceUuid)
  const output: PrefabConflict[] = []
  if (!source) output.push({ code: 'orphan-source', severity: 'error', message: 'Prefab source entity no longer exists.' })
  if (prefabBundleCreatesCycle(prefab.reference, prefab.document.bundle)) output.push({ code: 'circular-dependency', severity: 'error', message: 'Prefab dependency graph is circular.' })
  if (prefab.document.sourceChecksum !== checksum(prefab.document.bundle)) output.push({ code: 'stale-source', severity: 'warning', message: 'Prefab checksum does not match its authored bundle.' })
  for (const [path] of Object.entries(readPrefabOverrides(entity))) output.push({ code: 'override', severity: 'info', message: `Instance overrides ${path}.`, path })
  return output.sort(/* 先计算 left.severity.localeCompare(right.severity)；仅当其为假值时求右侧 (left.path ?? '').localeCompare(right.path ?? '')，返回短路求值结果。 */ (left, right) => left.severity.localeCompare(right.severity) || (left.path ?? '').localeCompare(right.path ?? ''))
}

/** 结构说明（自动提取）：createPrefabVariantFromInstance；输入 entity、requestedName；直接调用 prefabRecord、prefabInstanceEntities、captureEntityBundle、entities.map、prepareBundleForPrefab 等；写入 candidate.prefabAsset、candidate.prefabInstanceUuid、candidate.prefabSourceUuid、candidate.prefabOverrides 等；返回路径包含 reference；包含循环处理。 */ export function createPrefabVariantFromInstance(entity: Entity, requestedName?: string): string | null {
  const base = prefabRecord(entity.prefabAsset)
  const entities = prefabInstanceEntities(entity)
  if (!base || !entities.length) return null
  const bundle = captureEntityBundle(entities.map(/* 返回 candidate.id 的当前值。 */ candidate => candidate.id))
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

/** 结构说明（自动提取）：replaceEntitiesWithPrefab；输入 entityIds、assetRef；直接调用 physicsState.world.entities.filter、prefabRecord、subtreeEntities、roots.map、roots.reduce 等；返回路径包含 replacements；包含循环处理。 */ export function replaceEntitiesWithPrefab(entityIds: number[], assetRef: string): Entity[] {
  const roots = physicsState.world.entities.filter(/* 调用 entityIds.includes(entity.id) 并返回调用结果。 */ entity => entityIds.includes(entity.id))
  if (!roots.length || !prefabRecord(assetRef)) return []
  const selected = subtreeEntities(roots.map(/* 返回 entity.id 的当前值。 */ entity => entity.id), physicsState.world.entities)
  const center = roots.reduce(/** 结构说明（自动提取）：roots.reduce 回调；输入 value、entity；直接调用 worldTransform；写入 value.x、value.y；返回路径包含 value。 */ (value, entity) => { const point = worldTransform(entity, physicsState.world.entities).position; value.x += point.x / roots.length; value.y += point.y / roots.length; return value }, { x: 0, y: 0 })
  const selectedSet = new Set(selected.map(/* 返回 entity.id 的当前值。 */ entity => entity.id)), selectedUuids = new Set(selected.map(/* 返回 entity.uuid 的当前值。 */ entity => entity.uuid))
  const externalChildren = physicsState.world.entities.filter(/* 先计算 entity.parentUuid && selectedUuids.has(entity.parentUuid)；仅当其为真值时求右侧 !selectedSet.has(entity.id)，返回短路求值结果。 */ entity => entity.parentUuid && selectedUuids.has(entity.parentUuid) && !selectedSet.has(entity.id))
  const sharedParent = roots.every(/* 比较 entity.parentUuid 与 roots[0].parentUuid，返回严格相等的判断结果。 */ entity => entity.parentUuid === roots[0].parentUuid) ? roots[0].parentUuid : null
  for (let index = physicsState.world.connections.length - 1; index >= 0; index--) if (physicsState.world.connections[index].anchors.some(/* 调用 selectedSet.has(anchor.entityId) 并返回调用结果。 */ anchor => selectedSet.has(anchor.entityId))) physicsState.world.connections.splice(index, 1)
  for (let index = physicsState.world.entities.length - 1; index >= 0; index--) if (selectedSet.has(physicsState.world.entities[index].id)) physicsState.world.entities.splice(index, 1)
  const replacements = instantiatePrefab(assetRef, center, true)
  const replacementRoot = replacements.find(/** 结构说明（自动提取）：replacements.find 回调；输入 entity；直接调用 replacements.some；返回表达式求值结果。 */ entity => !entity.parentUuid || !replacements.some(/* 比较 candidate.uuid 与 entity.parentUuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === entity.parentUuid)) ?? replacements[0]
  if (replacementRoot) {
    if (sharedParent && physicsState.world.entities.some(/* 比较 entity.uuid 与 sharedParent，返回严格相等的判断结果。 */ entity => entity.uuid === sharedParent)) setParent(replacementRoot, sharedParent, physicsState.world.entities, true)
    for (const child of externalChildren) setParent(child, replacementRoot.uuid, physicsState.world.entities, true)
    pushHistory('Replace selection with prefab')
  }
  return replacements
}
