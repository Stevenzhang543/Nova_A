import { assetGuid, assetReference, createTextAsset, readTextAsset, resolveAsset, updateTextAssetTransactional } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import { createAuthoringObject } from '../editor/authoring2d'
import { physicsState } from '../store/physics'
import { STABLE_COMPONENT_KINDS } from '../world/componentRegistry'
import type { AuthoringObjectKind, Entity } from '../world/Entity'
import type { ComponentKind } from '../world/components'
import { graphUuid } from '../visual/graphTypes'
import { attachEventSheet, createEventSheetAsset, defaultEventSheet, readEventSheet, saveEventSheetAsset } from './eventSheets'
import { createPrefabFromEntities, instantiatePrefab } from './prefabs'

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

export function resolvedObjectBlueprint(reference: string | null | undefined, visited = new Set<string>()): ObjectBlueprintDocument | null {
  const uuid = assetGuid(reference)
  if (!uuid || visited.has(uuid) || visited.size >= 64) return null
  visited.add(uuid)
  const current = readObjectBlueprint(reference)
  if (!current) return null
  const base = resolvedObjectBlueprint(current.baseBlueprintAsset, visited)
  if (!base) return current
  return { ...base, ...current, prefabAsset: current.prefabAsset ?? base.prefabAsset, eventSheetAsset: current.eventSheetAsset ?? base.eventSheetAsset, requiredComponents: [...new Set([...base.requiredComponents, ...current.requiredComponents])], excludedComponents: [...new Set([...base.excludedComponents, ...current.excludedComponents])], tags: [...new Set([...base.tags, ...current.tags])], groups: [...new Set([...base.groups, ...current.groups])] }
}

export function validateObjectBlueprint(reference: string | null | undefined, records: readonly AssetRecord[] = []): ObjectBlueprintDiagnostic[] {
  const diagnostics: ObjectBlueprintDiagnostic[] = [], visited = new Set<string>()
  let cursor = reference
  while (cursor) {
    const uuid = assetGuid(cursor)
    if (!uuid) { diagnostics.push({ severity: 'error', code: 'OBJECT-REFERENCE', message: 'Blueprint inheritance contains an invalid asset reference.' }); break }
    if (visited.has(uuid)) { diagnostics.push({ severity: 'error', code: 'OBJECT-INHERIT-CYCLE', message: 'Object Blueprint inheritance contains a cycle.' }); break }
    visited.add(uuid)
    const document = readObjectBlueprint(cursor)
    if (!document) { diagnostics.push({ severity: 'error', code: 'OBJECT-MISSING', message: 'Object Blueprint source is missing or invalid.' }); break }
    cursor = document.baseBlueprintAsset
  }
  const document = resolvedObjectBlueprint(reference)
  if (!document) return diagnostics
  if (!resolveAsset(document.prefabAsset) || resolveAsset(document.prefabAsset)?.assetType !== 'prefab') diagnostics.push({ severity: 'error', code: 'OBJECT-PREFAB-MISSING', message: 'Select a valid prefab composition.' })
  if (document.eventSheetAsset && !readEventSheet(document.eventSheetAsset)) diagnostics.push({ severity: 'error', code: 'OBJECT-EVENTS-MISSING', message: 'The attached Event Sheet is missing or invalid.' })
  for (const kind of document.requiredComponents) if (document.excludedComponents.includes(kind)) diagnostics.push({ severity: 'error', code: 'OBJECT-COMPONENT-CONFLICT', message: `${kind} cannot be both required and excluded.` })
  if (records.length && !records.some(record => record.uuid === assetGuid(reference) && record.assetType === 'objectBlueprint')) diagnostics.push({ severity: 'warning', code: 'OBJECT-NOT-INDEXED', message: 'The Object Blueprint is not present in the current asset index.' })
  return diagnostics
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
  const script = entity.script2D
  if (script) script.objectBlueprintAsset = reference
  return reference
}

export function instantiateObjectBlueprint(reference: string, position = { x: 0, y: 0 }): Entity[] {
  if (validateObjectBlueprint(reference).some(issue => issue.severity === 'error')) return []
  const blueprint = resolvedObjectBlueprint(reference)
  if (!blueprint?.prefabAsset) return []
  const entities = instantiatePrefab(blueprint.prefabAsset, position)
  const blueprintReference = assetReference(assetGuid(reference) ?? '')
  for (const entity of entities) {
    entity.tags = [...new Set([...entity.tags, ...blueprint.tags])]
    entity.groups = [...new Set([...entity.groups, ...blueprint.groups])]
    if (blueprint.eventSheetAsset) attachEventSheet(entity, blueprint.eventSheetAsset)
    if (entity.script2D) entity.script2D.objectBlueprintAsset = blueprintReference
  }
  return entities
}

function quickLogicSource(name: string): string {
  return `// ${name} — Event Sheet logic\n@export(type="float", min=0, max=30, step=0.1, group="Movement") let move_speed = 6.0;\n\nfn awake() { log_debug("${name} awake"); }\nfn start() { }\nfn update(dt) {\n  let movement = input_vector("Move");\n  set_velocity(movement.x * move_speed, movement.y * move_speed);\n}\nfn fixed_update(dt) { }\nfn on_timer(name) { }\nfn on_signal(name, payload, source) { }\nfn on_collision_enter(other, px, py, nx, ny, rvx, rvy) { }\nfn on_trigger_enter(other, px, py, nx, ny, rvx, rvy) { }\n`
}

/** Sprite/Shape → Object → Event → Scene guided path. */
export function createQuickObjectWorkflow(kind: AuthoringObjectKind = 'Rectangle', name = 'Gameplay Object'): QuickObjectWorkflowResult | null {
  const entity = createAuthoringObject(kind, { x: 0, y: 0 })
  entity.name = cleanText(name, 'Gameplay Object', 80)
  const logic = createTextAsset(`${entity.name} Logic`, 'script', quickLogicSource(entity.name), 'Assets/Scripts')
  const logicReference = assetReference(logic.uuid), eventAsset = createEventSheetAsset(`${entity.name} Events`, logicReference)
  const sheet = readEventSheet(eventAsset.uuid) ?? defaultEventSheet(`${entity.name} Events`, logicReference)
  saveEventSheetAsset(eventAsset.uuid, sheet)
  const eventReference = assetReference(eventAsset.uuid)
  attachEventSheet(entity, eventReference)
  const blueprintReference = createObjectBlueprintFromEntity(entity, eventReference)
  if (!blueprintReference) return null
  physicsState.world.invalidateRuntime()
  return { entity, eventSheetAsset: eventReference, logicAsset: logicReference, prefabAsset: entity.prefabAsset ?? '', blueprintAsset: blueprintReference }
}
