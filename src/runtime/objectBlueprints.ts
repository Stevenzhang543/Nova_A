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

function cleanText(value: unknown, fallback = '', maximum = 160): string { return (typeof value === 'string' ? value : fallback).replace(/[\u0000-\u001f]/g, '').trim().slice(0, maximum) }
function cleanReference(value: unknown): string | null { const reference = cleanText(value, '', 512); return reference || null }
function cleanMembers(value: unknown): string[] { return [...new Set((Array.isArray(value) ? value : []).map(item => cleanText(item, '', 80)).filter(Boolean))].slice(0, 32) }
function cleanComponents(value: unknown): ComponentKind[] { return [...new Set((Array.isArray(value) ? value : []).filter(item => STABLE_COMPONENT_KINDS.includes(item as ComponentKind)) as ComponentKind[])].slice(0, STABLE_COMPONENT_KINDS.length) }

export function defaultObjectBlueprint(name = 'Object Blueprint'): ObjectBlueprintDocument {
  return { format: OBJECT_BLUEPRINT_FORMAT, version: OBJECT_BLUEPRINT_VERSION, uuid: graphUuid(), name: cleanText(name, 'Object Blueprint', 120), prefabAsset: null, eventSheetAsset: null, baseBlueprintAsset: null, requiredComponents: ['Transform2D'], excludedComponents: [], tags: [], groups: [] }
}

export function normalizeObjectBlueprint(source: unknown): ObjectBlueprintDocument {
  if (!source || typeof source !== 'object') throw new Error('Object Blueprint root must be an object.')
  const item = source as Record<string, unknown>
  if (item.format !== OBJECT_BLUEPRINT_FORMAT || Number(item.version) !== OBJECT_BLUEPRINT_VERSION) throw new Error('Unsupported Object Blueprint format.')
  return { format: OBJECT_BLUEPRINT_FORMAT, version: OBJECT_BLUEPRINT_VERSION, uuid: cleanText(item.uuid, graphUuid(), 128).toLowerCase(), name: cleanText(item.name, 'Object Blueprint', 120), prefabAsset: cleanReference(item.prefabAsset), eventSheetAsset: cleanReference(item.eventSheetAsset), baseBlueprintAsset: cleanReference(item.baseBlueprintAsset), requiredComponents: cleanComponents(item.requiredComponents), excludedComponents: cleanComponents(item.excludedComponents), tags: cleanMembers(item.tags), groups: cleanMembers(item.groups) }
}

export function parseObjectBlueprint(source: string): ObjectBlueprintDocument { return normalizeObjectBlueprint(JSON.parse(source)) }
export function serializeObjectBlueprint(document: ObjectBlueprintDocument): string { return `${JSON.stringify(normalizeObjectBlueprint(document), null, 2)}\n` }

export function readObjectBlueprint(reference: string | null | undefined): ObjectBlueprintDocument | null {
  const record = resolveAsset(reference), source = readTextAsset(reference)
  if (!record || record.assetType !== 'objectBlueprint' || !source) return null
  try { return parseObjectBlueprint(source) } catch { return null }
}

export function createObjectBlueprintAsset(documentInput: ObjectBlueprintDocument): AssetRecord {
  const document = normalizeObjectBlueprint(documentInput)
  const record = createTextAsset(document.name, 'objectBlueprint', serializeObjectBlueprint(document), 'Assets/Object Blueprints')
  synchronizeObjectBlueprintDependencies(record, document)
  return record
}

function synchronizeObjectBlueprintDependencies(record: AssetRecord, document: ObjectBlueprintDocument): void { if(record.pipeline)record.pipeline.dependencies=[...new Set([document.prefabAsset,document.eventSheetAsset,document.baseBlueprintAsset].flatMap(reference=>assetGuid(reference)??[]))].sort() }
export function saveObjectBlueprintAsset(assetUuid: string, document: ObjectBlueprintDocument): boolean { if(!updateTextAssetTransactional(assetUuid, serializeObjectBlueprint(document)))return false;const record=resolveAsset(assetUuid);if(record)synchronizeObjectBlueprintDependencies(record,document);return true }

export function resolvedObjectBlueprint(reference: string | null | undefined, visited = new Set<string>()): ObjectBlueprintDocument | null { return resolveObjectBlueprintUsing(reference, visited, readObjectBlueprint) }

function resolveObjectBlueprintUsing(reference: string | null | undefined, visited: Set<string>, read: typeof readObjectBlueprint): ObjectBlueprintDocument | null {
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

export function validateObjectBlueprint(reference: string | null | undefined, records: readonly AssetRecord[] = []): ObjectBlueprintDiagnostic[] { return validateObjectBlueprintUsing(reference, records, readObjectBlueprint) }

function validateObjectBlueprintUsing(reference: string | null | undefined, records: readonly AssetRecord[], read: typeof readObjectBlueprint): ObjectBlueprintDiagnostic[] {
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
  if (records.length && !records.some(record => record.uuid === assetGuid(reference) && record.assetType === 'objectBlueprint')) diagnostics.push({ severity: 'warning', code: 'OBJECT-NOT-INDEXED', message: 'The Object Blueprint is not present in the current asset index.' })
  return diagnostics
}

/** Validate an existing asset's draft through the same bounded resolver without writing it. */
export function validateObjectBlueprintDraft(assetUuid: string, document: ObjectBlueprintDocument, records: readonly AssetRecord[] = []): ObjectBlueprintDiagnostic[] {
  const record = resolveAsset(assetUuid)
  if (!record || record.assetType !== 'objectBlueprint') return [{ severity:'error',code:'OBJECT-DRAFT-IDENTITY',message:'The Object Blueprint asset is no longer available.' }]
  const current = readObjectBlueprint(record.uuid)
  if (!current || document.uuid !== current.uuid || document.format !== OBJECT_BLUEPRINT_FORMAT || document.version !== OBJECT_BLUEPRINT_VERSION) return [{severity:'error',code:'OBJECT-DRAFT-IDENTITY',message:'The draft must preserve its saved Object Blueprint identity.'}]
  const read: typeof readObjectBlueprint = reference => assetGuid(reference) === record.uuid ? document : readObjectBlueprint(reference)
  try { return validateObjectBlueprintUsing(assetReference(record.uuid), records, read) }
  catch { return [{severity:'error',code:'OBJECT-DRAFT-SHAPE',message:'The blueprint draft contains malformed authoring fields.'}] }
}
export function createObjectBlueprintFromEntity(entity: Entity, eventSheetAsset: string | null = entity.script2D?.eventSheetAsset ?? null): string | null {
  const prefabAsset = createPrefabFromEntities([entity.id], entity.name)
  if (!prefabAsset) return null
  const document = defaultObjectBlueprint(entity.name)
  document.prefabAsset = prefabAsset
  document.eventSheetAsset = eventSheetAsset
  document.requiredComponents = entity.components.map(component => component.kind)
  document.tags = [...entity.tags]
  document.groups = [...entity.groups]
  const asset = createObjectBlueprintAsset(document)
  const reference = assetReference(asset.uuid)
  entity.objectBlueprintAsset = reference
  const script = entity.script2D
  if (script) script.objectBlueprintAsset = reference
  return reference
}

export function instantiateObjectBlueprint(reference: string, position = { x: 0, y: 0 }): Entity[] {
  if (validateObjectBlueprint(reference).some(issue => issue.severity === 'error')) return []
  const blueprint = resolvedObjectBlueprint(reference)
  if (!blueprint?.prefabAsset) return []
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) return []
  const world = physicsState.world, previousEntities = new Set(world.entities), previousConnections = new Set(world.connections)
  try {
    const entities = instantiatePrefab(blueprint.prefabAsset, position, false, false)
    if (!entities.length) return []
    const ids = new Set(entities.map(entity => entity.uuid)), roots = entities.filter(entity => !entity.parentUuid || !ids.has(entity.parentUuid))
    if (!roots.length) throw Error('Blueprint prefab has no valid hierarchy root.')
    const required: ComponentKind[] = [...blueprint.requiredComponents, ...(blueprint.eventSheetAsset ? ['Script2D' as const] : [])]
    const plans = roots.map(entity => ({ entity, plan: planObjectComposition(entity, required, blueprint.excludedComponents) }))
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
    selectEntities(roots.map(entity => entity.id), 'replace'); world.invalidateRuntime()
    return entities
  } catch {
    // Only newly inserted instances are rolled back; existing entities and monotonic IDs remain untouched.
    world.entities.splice(0, world.entities.length, ...world.entities.filter(entity => previousEntities.has(entity)))
    world.connections.splice(0, world.connections.length, ...world.connections.filter(connection => previousConnections.has(connection)))
    return []
  }
}

function quickLogicSource(name: string): string {
  return `// ${name} — Event Sheet logic\n@export(type="float", min=0, max=30, step=0.1, group="Movement") let move_speed = 6.0;\n\nfn awake() { log_debug(${JSON.stringify(`${name} awake`)}); }\nfn start() { }\nfn update(dt) {\n  let movement = input_vector("Move");\n  set_velocity(movement.x * move_speed, movement.y * move_speed);\n}\nfn fixed_update(dt) { }\nfn on_timer(name) { }\nfn on_signal(name, payload, source) { }\nfn on_collision_enter(other, px, py, nx, ny, rvx, rvy) { }\nfn on_trigger_enter(other, px, py, nx, ny, rvx, rvy) { }\n`
}

/** Sprite/Shape → Object → Event → Scene guided path. */
export function createQuickObjectWorkflow(kind: AuthoringObjectKind = 'Rectangle', name = 'Gameplay Object'): QuickObjectWorkflowResult | null {
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
