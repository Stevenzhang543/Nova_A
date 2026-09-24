/** 对象蓝图系统：维护蓝图定义、派生关系、实例配置和字段覆盖。 */
import { assetGuid, assetReference, createTextAsset, readTextAsset, resolveAsset, updateTextAssetTransactional } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import { createAuthoringObject } from '../editor/authoring2d'
import { beginHistoryTransaction, cancelHistoryTransaction, commitHistoryTransaction, physicsState, selectEntities } from '../store/physics'
import { STABLE_COMPONENT_KINDS } from '../world/componentRegistry'
import type { AuthoringObjectKind, Entity } from '../world/Entity'
import type { ComponentKind } from '../world/components'
import { graphUuid } from '../visual/graphTypes'
import { attachEventSheet, createEventSheetAsset, defaultEventSheet, readEventSheet, saveEventSheetAsset, validateEventSheet } from './eventSheets'
import { capturePrefabOverrides, createPrefabFromEntities, instantiatePrefab } from './prefabs'
import { applyObjectComposition, planObjectComposition } from './objectComposition'

export const OBJECT_BLUEPRINT_FORMAT = 'nova-object-blueprint' as const
export const OBJECT_BLUEPRINT_VERSION = 1 as const

export interface ObjectBlueprintDocument {
  format: typeof OBJECT_BLUEPRINT_FORMAT
  version: typeof OBJECT_BLUEPRINT_VERSION
  uuid: string
  name: string
  prefabAsset: string | null
  eventSheetAsset: string | null
  baseBlueprintAsset: string | null
  requiredComponents: ComponentKind[]
  excludedComponents: ComponentKind[]
  tags: string[]
  groups: string[]
}

export interface ObjectBlueprintDiagnostic { severity: 'error' | 'warning'; code: string; message: string }
export interface QuickObjectWorkflowResult { entity: Entity; eventSheetAsset: string; logicAsset: string; prefabAsset: string; blueprintAsset: string }

/* 调用 (typeof value === 'string' ? value : fallback).replace(/[\u0000-\u001f]/g, '').trim().slice(0, maximum) 并返回调用结果。 */ function cleanText(value: unknown, fallback = '', maximum = 160): string { return (typeof value === 'string' ? value : fallback).replace(/[\u0000-\u001f]/g, '').trim().slice(0, maximum) }
/** 结构说明（自动提取）：cleanReference；输入 value；直接调用 cleanText。 */ function cleanReference(value: unknown): string | null { const reference = cleanText(value, '', 512); return reference || null }
/* 调用 [...new Set((Array.isArray(value) ? value : []).map(item => cleanText(item, '', 80)).filter(Boolean))].slice(0, 32) 并返回调用结果。 */ function cleanMembers(value: unknown): string[] { return [...new Set((Array.isArray(value) ? value : []).map(/* 调用 cleanText(item, '', 80) 并返回调用结果。 */ item => cleanText(item, '', 80)).filter(Boolean))].slice(0, 32) }
/** 结构说明（自动提取）：cleanComponents；输入 value；直接调用 slice、Set、filter、Array.isArray。 */ function cleanComponents(value: unknown): ComponentKind[] { return [...new Set((Array.isArray(value) ? value : []).filter(/* 调用 STABLE_COMPONENT_KINDS.includes(item as ComponentKind) 并返回调用结果。 */ item => STABLE_COMPONENT_KINDS.includes(item as ComponentKind)) as ComponentKind[])].slice(0, STABLE_COMPONENT_KINDS.length) }

/** 结构说明（自动提取）：defaultObjectBlueprint；输入 name；直接调用 graphUuid、cleanText。 */ export function defaultObjectBlueprint(name = 'Object Blueprint'): ObjectBlueprintDocument {
  return { format: OBJECT_BLUEPRINT_FORMAT, version: OBJECT_BLUEPRINT_VERSION, uuid: graphUuid(), name: cleanText(name, 'Object Blueprint', 120), prefabAsset: null, eventSheetAsset: null, baseBlueprintAsset: null, requiredComponents: ['Transform2D'], excludedComponents: [], tags: [], groups: [] }
}

/** 结构说明（自动提取）：normalizeObjectBlueprint；输入 source；直接调用 Error、Number、toLowerCase、cleanText、graphUuid 等；包含显式抛错路径。 */ export function normalizeObjectBlueprint(source: unknown): ObjectBlueprintDocument {
  if (!source || typeof source !== 'object') throw new Error('Object Blueprint root must be an object.')
  const item = source as Record<string, unknown>
  if (item.format !== OBJECT_BLUEPRINT_FORMAT || Number(item.version) !== OBJECT_BLUEPRINT_VERSION) throw new Error('Unsupported Object Blueprint format.')
  return { format: OBJECT_BLUEPRINT_FORMAT, version: OBJECT_BLUEPRINT_VERSION, uuid: cleanText(item.uuid, graphUuid(), 128).toLowerCase(), name: cleanText(item.name, 'Object Blueprint', 120), prefabAsset: cleanReference(item.prefabAsset), eventSheetAsset: cleanReference(item.eventSheetAsset), baseBlueprintAsset: cleanReference(item.baseBlueprintAsset), requiredComponents: cleanComponents(item.requiredComponents), excludedComponents: cleanComponents(item.excludedComponents), tags: cleanMembers(item.tags), groups: cleanMembers(item.groups) }
}

/* 调用 normalizeObjectBlueprint(JSON.parse(source)) 并返回调用结果。 */ export function parseObjectBlueprint(source: string): ObjectBlueprintDocument { return normalizeObjectBlueprint(JSON.parse(source)) }
/** 按模板 `${JSON.stringify(normalizeObjectBlueprint(document), null, 2)}\n` 生成并返回字符串。 */ export function serializeObjectBlueprint(document: ObjectBlueprintDocument): string { return `${JSON.stringify(normalizeObjectBlueprint(document), null, 2)}\n` }

/** 结构说明（自动提取）：readObjectBlueprint；输入 reference；直接调用 resolveAsset、readTextAsset、parseObjectBlueprint。 */ export function readObjectBlueprint(reference: string | null | undefined): ObjectBlueprintDocument | null {
  const record = resolveAsset(reference), source = readTextAsset(reference)
  if (!record || record.assetType !== 'objectBlueprint' || !source) return null
  try { return parseObjectBlueprint(source) } catch { return null }
}

/** 结构说明（自动提取）：createObjectBlueprintAsset；输入 documentInput；直接调用 normalizeObjectBlueprint、createTextAsset、serializeObjectBlueprint、synchronizeObjectBlueprintDependencies；返回路径包含 record。 */ export function createObjectBlueprintAsset(documentInput: ObjectBlueprintDocument): AssetRecord {
  const document = normalizeObjectBlueprint(documentInput)
  const record = createTextAsset(document.name, 'objectBlueprint', serializeObjectBlueprint(document), 'Assets/Object Blueprints')
  synchronizeObjectBlueprintDependencies(record, document)
  return record
}

/** 结构说明（自动提取）：synchronizeObjectBlueprintDependencies；输入 record、document；直接调用 sort、Set、flatMap；写入 record.pipeline.dependencies。 */ function synchronizeObjectBlueprintDependencies(record: AssetRecord, document: ObjectBlueprintDocument): void { if(record.pipeline)record.pipeline.dependencies=[...new Set([document.prefabAsset,document.eventSheetAsset,document.baseBlueprintAsset].flatMap(/* 当 assetGuid(reference) 为 null 或 undefined 时返回 []，否则保留左侧值。 */ reference=>assetGuid(reference)??[]))].sort() }
/** 结构说明（自动提取）：saveObjectBlueprintAsset；输入 assetUuid、document；直接调用 updateTextAssetTransactional、serializeObjectBlueprint、resolveAsset、synchronizeObjectBlueprintDependencies。 */ export function saveObjectBlueprintAsset(assetUuid: string, document: ObjectBlueprintDocument): boolean { if(!updateTextAssetTransactional(assetUuid, serializeObjectBlueprint(document)))return false;const record=resolveAsset(assetUuid);if(record)synchronizeObjectBlueprintDependencies(record,document);return true }

/* 调用 resolveObjectBlueprintUsing(reference, visited, readObjectBlueprint) 并返回调用结果。 */ export function resolvedObjectBlueprint(reference: string | null | undefined, visited = new Set<string>()): ObjectBlueprintDocument | null { return resolveObjectBlueprintUsing(reference, visited, readObjectBlueprint) }

/** 结构说明（自动提取）：resolveObjectBlueprintUsing；输入 reference、visited、read；直接调用 assetGuid、visited.has、visited.add、read、resolveObjectBlueprintUsing 等；返回路径包含 current。 */ function resolveObjectBlueprintUsing(reference: string | null | undefined, visited: Set<string>, read: typeof readObjectBlueprint): ObjectBlueprintDocument | null {
  const uuid = assetGuid(reference)
  if (!uuid || visited.has(uuid) || visited.size >= 64) return null
  visited.add(uuid)
  const current = read(reference)
  if (!current) return null
  const base = resolveObjectBlueprintUsing(current.baseBlueprintAsset, visited, read)
  if (current.baseBlueprintAsset && !base) return null
  if (!base) return current
  return { ...base, ...current, prefabAsset: current.prefabAsset ?? base.prefabAsset, eventSheetAsset: current.eventSheetAsset ?? base.eventSheetAsset, requiredComponents: [...new Set([...base.requiredComponents, ...current.requiredComponents])], excludedComponents: [...new Set([...base.excludedComponents, ...current.excludedComponents])], tags: [...new Set([...base.tags, ...current.tags])], groups: [...new Set([...base.groups, ...current.groups])] }
}

/* 调用 validateObjectBlueprintUsing(reference, records, readObjectBlueprint) 并返回调用结果。 */ export function validateObjectBlueprint(reference: string | null | undefined, records: readonly AssetRecord[] = []): ObjectBlueprintDiagnostic[] { return validateObjectBlueprintUsing(reference, records, readObjectBlueprint) }

/** 结构说明（自动提取）：validateObjectBlueprintUsing；输入 reference、records、read；直接调用 Set、assetGuid、diagnostics.push、visited.has、visited.add 等；写入 cursor；返回路径包含 diagnostics；包含循环处理。 */ function validateObjectBlueprintUsing(reference: string | null | undefined, records: readonly AssetRecord[], read: typeof readObjectBlueprint): ObjectBlueprintDiagnostic[] {
  const diagnostics: ObjectBlueprintDiagnostic[] = [], visited = new Set<string>()
  let cursor = reference
  while (cursor) {
    const uuid = assetGuid(cursor)
    if (!uuid) { diagnostics.push({ severity: 'error', code: 'OBJECT-REFERENCE', message: 'Blueprint inheritance contains an invalid asset reference.' }); break }
    if (visited.has(uuid)) { diagnostics.push({ severity: 'error', code: 'OBJECT-INHERIT-CYCLE', message: 'Object Blueprint inheritance contains a cycle.' }); break }
    if (visited.size >= 64) { diagnostics.push({ severity: 'error', code: 'OBJECT-INHERIT-DEPTH', message: 'Object Blueprint inheritance exceeds 64 assets.' }); break }
    visited.add(uuid)
    const document = read(cursor)
    if (!document) { diagnostics.push({ severity: 'error', code: 'OBJECT-MISSING', message: 'Object Blueprint source is missing or invalid.' }); break }
    cursor = document.baseBlueprintAsset
  }
  const document = resolveObjectBlueprintUsing(reference, new Set(), read)
  if (!document) return diagnostics
  if (!resolveAsset(document.prefabAsset) || resolveAsset(document.prefabAsset)?.assetType !== 'prefab') diagnostics.push({ severity: 'error', code: 'OBJECT-PREFAB-MISSING', message: 'Select a valid prefab composition.' })
  if (document.eventSheetAsset && !readEventSheet(document.eventSheetAsset)) diagnostics.push({ severity: 'error', code: 'OBJECT-EVENTS-MISSING', message: 'The attached Event Sheet is missing or invalid.' })
  const events = readEventSheet(document.eventSheetAsset)
  if (events) for (const issue of validateEventSheet(events)) if (issue.severity === 'error') diagnostics.push({ severity: 'error', code: `OBJECT-${issue.code}`, message: issue.message })
  if (document.excludedComponents.includes('Transform2D')) diagnostics.push({ severity: 'error', code: 'OBJECT-TRANSFORM-EXCLUDED', message: 'Object roots require Transform2D.' })
  if (document.eventSheetAsset && document.excludedComponents.includes('Script2D')) diagnostics.push({ severity: 'error', code: 'OBJECT-SCRIPT-EXCLUDED', message: 'An Event Sheet requires Script2D, but this blueprint excludes it.' })
  for (const kind of document.requiredComponents) if (document.excludedComponents.includes(kind)) diagnostics.push({ severity: 'error', code: 'OBJECT-COMPONENT-CONFLICT', message: `${kind} cannot be both required and excluded.` })
  if (records.length && !records.some(/* 先计算 record.uuid === assetGuid(reference)；仅当其为真值时求右侧 record.assetType === 'objectBlueprint'，返回短路求值结果。 */ record => record.uuid === assetGuid(reference) && record.assetType === 'objectBlueprint')) diagnostics.push({ severity: 'warning', code: 'OBJECT-NOT-INDEXED', message: 'The Object Blueprint is not present in the current asset index.' })
  return diagnostics
}

/** Validate an existing asset's draft through the same bounded resolver without writing it. */
/** 结构说明（自动提取）：validateObjectBlueprintDraft；输入 assetUuid、document、records；直接调用 resolveAsset、readObjectBlueprint、validateObjectBlueprintUsing、assetReference。 */ export function validateObjectBlueprintDraft(assetUuid: string, document: ObjectBlueprintDocument, records: readonly AssetRecord[] = []): ObjectBlueprintDiagnostic[] {
  const record = resolveAsset(assetUuid)
  if (!record || record.assetType !== 'objectBlueprint') return [{ severity:'error',code:'OBJECT-DRAFT-IDENTITY',message:'The Object Blueprint asset is no longer available.' }]
  const current = readObjectBlueprint(record.uuid)
  if (!current || document.uuid !== current.uuid || document.format !== OBJECT_BLUEPRINT_FORMAT || document.version !== OBJECT_BLUEPRINT_VERSION) return [{severity:'error',code:'OBJECT-DRAFT-IDENTITY',message:'The draft must preserve its saved Object Blueprint identity.'}]
  const read: typeof readObjectBlueprint = /* 根据 assetGuid(reference) === record.uuid 的真假，分别返回 document 或 readObjectBlueprint(reference)。 */ reference => assetGuid(reference) === record.uuid ? document : readObjectBlueprint(reference)
  try { return validateObjectBlueprintUsing(assetReference(record.uuid), records, read) }
  catch { return [{severity:'error',code:'OBJECT-DRAFT-SHAPE',message:'The blueprint draft contains malformed authoring fields.'}] }
}
/** 结构说明（自动提取）：createObjectBlueprintFromEntity；输入 entity、eventSheetAsset；直接调用 createPrefabFromEntities、defaultObjectBlueprint、entity.components.map、createObjectBlueprintAsset、assetReference；写入 document.prefabAsset、document.eventSheetAsset、document.requiredComponents、document.tags 等；返回路径包含 reference。 */ export function createObjectBlueprintFromEntity(entity: Entity, eventSheetAsset: string | null = entity.script2D?.eventSheetAsset ?? null): string | null {
  const prefabAsset = createPrefabFromEntities([entity.id], entity.name)
  if (!prefabAsset) return null
  const document = defaultObjectBlueprint(entity.name)
  document.prefabAsset = prefabAsset
  document.eventSheetAsset = eventSheetAsset
  document.requiredComponents = entity.components.map(/* 返回 component.kind 的当前值。 */ component => component.kind)
  document.tags = [...entity.tags]
  document.groups = [...entity.groups]
  const asset = createObjectBlueprintAsset(document)
  const reference = assetReference(asset.uuid)
  entity.objectBlueprintAsset = reference
  const script = entity.script2D
  if (script) script.objectBlueprintAsset = reference
  return reference
}

/** 结构说明（自动提取）：instantiateObjectBlueprint；输入 reference、position；直接调用 some、validateObjectBlueprint、resolvedObjectBlueprint、Number.isFinite、Set 等；写入 entity.tags、entity.groups、entity.objectBlueprintAsset、entity.script2D.objectBlueprintAsset；返回路径包含 entities；包含循环处理；包含显式抛错路径。 */ export function instantiateObjectBlueprint(reference: string, position = { x: 0, y: 0 }): Entity[] {
  if (validateObjectBlueprint(reference).some(/* 比较 issue.severity 与 'error'，返回严格相等的判断结果。 */ issue => issue.severity === 'error')) return []
  const blueprint = resolvedObjectBlueprint(reference)
  if (!blueprint?.prefabAsset) return []
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) return []
  const world = physicsState.world, previousEntities = new Set(world.entities), previousConnections = new Set(world.connections)
  try {
    const entities = instantiatePrefab(blueprint.prefabAsset, position, false, false)
    if (!entities.length) return []
    const ids = new Set(entities.map(/* 返回 entity.uuid 的当前值。 */ entity => entity.uuid)), roots = entities.filter(/* 先计算 !entity.parentUuid；仅当其为假值时求右侧 !ids.has(entity.parentUuid)，返回短路求值结果。 */ entity => !entity.parentUuid || !ids.has(entity.parentUuid))
    if (!roots.length) throw Error('Blueprint prefab has no valid hierarchy root.')
    const required: ComponentKind[] = [...blueprint.requiredComponents, ...(blueprint.eventSheetAsset ? ['Script2D' as const] : [])]
    const plans = roots.map(/** 构造并返回记录 { entity, plan: planObjectComposition(entity, required, blueprint.excludedComponents) }，字段按当前实参及捕获状态求值。 */ entity => ({ entity, plan: planObjectComposition(entity, required, blueprint.excludedComponents) }))
    const blueprintReference = assetReference(assetGuid(reference) ?? '')
    for (const { entity, plan } of plans) {
      applyObjectComposition(entity, plan)
      entity.tags = [...new Set([...entity.tags, ...blueprint.tags])]
      entity.groups = [...new Set([...entity.groups, ...blueprint.groups])]
      if (blueprint.eventSheetAsset && !attachEventSheet(entity, blueprint.eventSheetAsset)) throw Error('The Event Sheet could not be attached.')
      entity.objectBlueprintAsset = blueprintReference
      if (entity.script2D) entity.script2D.objectBlueprintAsset = blueprintReference
      capturePrefabOverrides(entity)
    }
    selectEntities(roots.map(/* 返回 entity.id 的当前值。 */ entity => entity.id), 'replace'); world.invalidateRuntime()
    return entities
  } catch {
    // Only newly inserted instances are rolled back; existing entities and monotonic IDs remain untouched.
    world.entities.splice(0, world.entities.length, ...world.entities.filter(/* 调用 previousEntities.has(entity) 并返回调用结果。 */ entity => previousEntities.has(entity)))
    world.connections.splice(0, world.connections.length, ...world.connections.filter(/* 调用 previousConnections.has(connection) 并返回调用结果。 */ connection => previousConnections.has(connection)))
    return []
  }
}

/** 结构说明（自动提取）：quickLogicSource；输入 name；直接调用 JSON.stringify。 */ function quickLogicSource(name: string): string {
  return `// ${name} — Event Sheet logic\n@export(type="float", min=0, max=30, step=0.1, group="Movement") let move_speed = 6.0;\n\nfn awake() { log_debug(${JSON.stringify(`${name} awake`)}); }\nfn start() { }\nfn update(dt) {\n  let movement = input_vector("Move");\n  set_velocity(movement.x * move_speed, movement.y * move_speed);\n}\nfn fixed_update(dt) { }\nfn on_timer(name) { }\nfn on_signal(name, payload, source) { }\nfn on_collision_enter(other, px, py, nx, ny, rvx, rvy) { }\nfn on_trigger_enter(other, px, py, nx, ny, rvx, rvy) { }\n`
}

/** Sprite/Shape → Object → Event → Scene guided path. */
/** 结构说明（自动提取）：createQuickObjectWorkflow；输入 kind、name；直接调用 beginHistoryTransaction、createAuthoringObject、cleanText、createTextAsset、quickLogicSource 等；写入 entity.name；包含显式抛错路径。 */ export function createQuickObjectWorkflow(kind: AuthoringObjectKind = 'Rectangle', name = 'Gameplay Object'): QuickObjectWorkflowResult | null {
  if (!beginHistoryTransaction('Create gameplay object workflow')) return null
  try {
  const entity = createAuthoringObject(kind, { x: 0, y: 0 })
  entity.name = cleanText(name, 'Gameplay Object', 80)
  const logic = createTextAsset(`${entity.name} Logic`, 'script', quickLogicSource(entity.name), 'Assets/Scripts')
  const logicReference = assetReference(logic.uuid), eventAsset = createEventSheetAsset(`${entity.name} Events`, logicReference)
  const sheet = readEventSheet(eventAsset.uuid) ?? defaultEventSheet(`${entity.name} Events`, logicReference)
  if (!saveEventSheetAsset(eventAsset.uuid, sheet)) throw Error('The Event Sheet could not be saved.')
  const eventReference = assetReference(eventAsset.uuid)
  if (!attachEventSheet(entity, eventReference)) throw Error('The Event Sheet could not be attached.')
  const blueprintReference = createObjectBlueprintFromEntity(entity, eventReference)
  if (!blueprintReference) throw Error('The object blueprint could not be created.')
  physicsState.world.invalidateRuntime()
  commitHistoryTransaction()
  return { entity, eventSheetAsset: eventReference, logicAsset: logicReference, prefabAsset: entity.prefabAsset ?? '', blueprintAsset: blueprintReference }
  } catch {
    cancelHistoryTransaction()
    return null
  }
}
