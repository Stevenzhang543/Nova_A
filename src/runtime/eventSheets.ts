import { validateEventSheetDraft } from '../editor/eventSheetDraftValidation'
import { assetGuid, assetState, createTextAsset, readTextAsset, resolveAsset, updateTextAssetTransactional } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import { executableGraphSource } from '../visual/graphCompiler'
import { graphUuid } from '../visual/graphTypes'
import type { Entity } from '../world/Entity'
import { Script2D } from '../world/components'
import { parseRhai } from '../visual/rhaiSyntax'
import { resolveProjectScriptBundle } from './scriptModules'

export const EVENT_SHEET_FORMAT = 'nova-event-sheet' as const
export const EVENT_SHEET_VERSION = 1 as const
export const MAX_EVENT_HANDLERS = 10_000

export type ObjectEventKind =
  | 'awake' | 'start' | 'update' | 'fixed-update' | 'destroy'
  | 'input-pressed' | 'input-released' | 'timer' | 'task' | 'signal'
  | 'collision-enter' | 'collision-stay' | 'collision-exit'
  | 'trigger-enter' | 'trigger-stay' | 'trigger-exit'
  | 'ui' | 'animation' | 'network'

export interface ObjectEventHandler {
  uuid: string
  kind: ObjectEventKind
  name: string
  selector: string
  callback: string
  enabled: boolean
  priority: number
  overrideInherited: boolean
}

/** Derived dispatch provenance; never persisted into an Event Sheet document. */
export interface ResolvedObjectEventHandler extends ObjectEventHandler {
  sourceSheetAsset: string
  sourceSheetUuid: string
  logicAsset: string | null
  inherited: boolean
}

export interface EventSheetDocument {
  format: typeof EVENT_SHEET_FORMAT
  version: typeof EVENT_SHEET_VERSION
  uuid: string
  name: string
  enabled: boolean
  ownerComponent: string
  logicAsset: string | null
  baseSheetAsset: string | null
  deterministicSeed: number
  handlers: ObjectEventHandler[]
}

export interface EventSheetDiagnostic { severity: 'error' | 'warning'; code: string; message: string; handlerUuid?: string }
export interface ScheduledObjectEvent { sheetUuid: string; sourceSheetAsset: string; logicAsset: string | null; handlerUuid: string; entityUuid: string; callback: string; priority: number; order: number }

export const OBJECT_EVENT_KINDS: readonly ObjectEventKind[] = Object.freeze([
  'awake', 'start', 'update', 'fixed-update', 'destroy', 'input-pressed', 'input-released', 'timer', 'task', 'signal',
  'collision-enter', 'collision-stay', 'collision-exit', 'trigger-enter', 'trigger-stay', 'trigger-exit',
  'ui', 'animation', 'network'
])

const CALLBACK_BY_EVENT: Record<ObjectEventKind, string> = {
  awake: 'awake', start: 'start', update: 'update', 'fixed-update': 'fixed_update', destroy: 'on_destroy',
  'input-pressed': 'update', 'input-released': 'update', timer: 'on_timer', task: 'on_task', signal: 'on_signal',
  'collision-enter': 'on_collision_enter', 'collision-stay': 'on_collision_stay', 'collision-exit': 'on_collision_exit',
  'trigger-enter': 'on_trigger_enter', 'trigger-stay': 'on_trigger_stay', 'trigger-exit': 'on_trigger_exit',
  ui: 'on_signal', animation: 'on_signal', network: 'on_signal'
}
export function eventCallbackFamily(kind: ObjectEventKind): string { return CALLBACK_BY_EVENT[kind] }

function cleanText(value: unknown, fallback = '', maximum = 160): string { return (typeof value === 'string' ? value : fallback).replace(/[\u0000-\u001f]/g, '').trim().slice(0, maximum) }
function finiteInteger(value: unknown, fallback = 0, minimum = -1_000_000, maximum = 1_000_000): number { const number = Math.round(Number(value)); return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback }
function cleanReference(value: unknown): string | null { const reference = cleanText(value, '', 512); return reference ? reference : null }

export function defaultEventHandler(kind: ObjectEventKind = 'start'): ObjectEventHandler {
  return { uuid: graphUuid(), kind, name: kind.replace(/-/g, ' '), selector: '', callback: CALLBACK_BY_EVENT[kind], enabled: true, priority: 0, overrideInherited: true }
}

export function defaultEventSheet(name = 'Object Events', logicAsset: string | null = null): EventSheetDocument {
  return { format: EVENT_SHEET_FORMAT, version: EVENT_SHEET_VERSION, uuid: graphUuid(), name: cleanText(name, 'Object Events', 120), enabled: true, ownerComponent: 'Entity', logicAsset, baseSheetAsset: null, deterministicSeed: 1, handlers: [defaultEventHandler('awake'), defaultEventHandler('start'), defaultEventHandler('update')] }
}

export function normalizeEventSheet(source: unknown): EventSheetDocument {
  if (!source || typeof source !== 'object') throw new Error('Event Sheet root must be an object.')
  const item = source as Record<string, unknown>
  if (item.format !== EVENT_SHEET_FORMAT || Number(item.version) !== EVENT_SHEET_VERSION) throw new Error('Unsupported Event Sheet format.')
  const rawHandlers = Array.isArray(item.handlers) ? item.handlers : []
  if (rawHandlers.length > MAX_EVENT_HANDLERS) throw new Error(`Event Sheet exceeds the ${MAX_EVENT_HANDLERS.toLocaleString('en-US')} handler limit.`)
  const handlers = rawHandlers.map((entry): ObjectEventHandler => {
    const handler = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}
    const kind = OBJECT_EVENT_KINDS.includes(handler.kind as ObjectEventKind) ? handler.kind as ObjectEventKind : 'start'
    return { uuid: cleanText(handler.uuid, graphUuid(), 128).toLowerCase(), kind, name: cleanText(handler.name, kind.replace(/-/g, ' '), 120), selector: cleanText(handler.selector, '', 256), callback: cleanText(handler.callback, CALLBACK_BY_EVENT[kind], 120).replace(/[^A-Za-z0-9_]/g, '_') || CALLBACK_BY_EVENT[kind], enabled: handler.enabled !== false, priority: finiteInteger(handler.priority), overrideInherited: handler.overrideInherited !== false }
  })
  return { format: EVENT_SHEET_FORMAT, version: EVENT_SHEET_VERSION, uuid: cleanText(item.uuid, graphUuid(), 128).toLowerCase(), name: cleanText(item.name, 'Object Events', 120), enabled: item.enabled !== false, ownerComponent: cleanText(item.ownerComponent, 'Entity', 80), logicAsset: cleanReference(item.logicAsset), baseSheetAsset: cleanReference(item.baseSheetAsset), deterministicSeed: finiteInteger(item.deterministicSeed, 1, 1, 0x7fff_ffff), handlers }
}

export function parseEventSheet(source: string): EventSheetDocument { return normalizeEventSheet(JSON.parse(source)) }
export function serializeEventSheet(document: EventSheetDocument): string { return `${JSON.stringify(normalizeEventSheet(document), null, 2)}\n` }

export function readEventSheet(reference: string | null | undefined): EventSheetDocument | null {
  const record = resolveAsset(reference), source = readTextAsset(reference)
  if (!record || record.assetType !== 'eventSheet' || !source) return null
  try { return parseEventSheet(source) } catch { return null }
}

export function createEventSheetAsset(name: string, logicAsset: string | null = null): AssetRecord {
  const document = defaultEventSheet(name, logicAsset)
  const record = createTextAsset(document.name, 'eventSheet', serializeEventSheet(document), 'Assets/Event Sheets')
  synchronizeEventSheetDependencies(record, document)
  return record
}

function synchronizeEventSheetDependencies(record: AssetRecord, document: EventSheetDocument): void {
  if (!record.pipeline) return
  record.pipeline.dependencies = [...new Set([document.logicAsset, document.baseSheetAsset].flatMap(reference => assetGuid(reference) ?? []))].sort()
}

export function saveEventSheetAsset(assetUuid: string, document: EventSheetDocument): boolean {
  const destination = resolveAsset(assetUuid)
  if (!destination || destination.assetType !== 'eventSheet' || !document || !Array.isArray(document.handlers)) return false
  if (document.handlers.some(handler => !handler || !OBJECT_EVENT_KINDS.includes(handler.kind))) return false
  if (validateEventSheetDraft(document).length) return false
  if (!updateTextAssetTransactional(assetUuid, serializeEventSheet(document))) return false
  const record = resolveAsset(assetUuid)
  if (record) synchronizeEventSheetDependencies(record, document)
  return true
}

export function logicSourceForEventSheet(document: EventSheetDocument): string {
  try { return resolvedEventLogicSource(document) } catch { return '' }
}

export function resolveEventSheetPrimaryLogic(document: EventSheetDocument): string | null {
  const visited = new Set<string>(); let current: EventSheetDocument | null = document
  while (current && current.enabled && visited.size < 64 && !visited.has(current.uuid)) {
    visited.add(current.uuid)
    if (current.logicAsset) { const asset = resolveAsset(current.logicAsset); return asset && (asset.assetType === 'script' || asset.assetType === 'visualScript') ? current.logicAsset : null }
    current = readEventSheet(current.baseSheetAsset)
  }
  return null
}
function resolvedEventLogicSource(document: EventSheetDocument): string {
  const record = resolveAsset(resolveEventSheetPrimaryLogic(document)); if (!record) return ''
  return resolveProjectScriptBundle(record.uuid, {
    resolveAsset: reference => { const asset = resolveAsset(reference) ?? assetState.records.find(item => item.path === reference); return asset && (asset.assetType === 'script' || asset.assetType === 'visualScript') ? { uuid: asset.uuid, path: asset.path, assetType: asset.assetType } : null },
    readSource: uuid => readTextAsset(uuid), compileVisual: executableGraphSource
  }) ?? ''
}

export function callbackNamesInLogic(document: EventSheetDocument): Set<string> {
  const program = parseRhai(logicSourceForEventSheet(document), { moduleMode: 'host' })
  return new Set(program.body.flatMap(node => node.kind === 'FunctionDeclaration' && !node.receiver ? [node.name] : []))
}

export function validateEventSheet(documentInput: EventSheetDocument, records: readonly AssetRecord[] = []): EventSheetDiagnostic[] {
  const document = normalizeEventSheet(documentInput), diagnostics: EventSheetDiagnostic[] = [], seen = new Map<string, string>(), names = callbackNamesInLogic(document)
  const logic = resolveAsset(resolveEventSheetPrimaryLogic(document))
  if (!logic || (logic.assetType !== 'script' && logic.assetType !== 'visualScript')) diagnostics.push({ severity: 'error', code: 'EVENT-LOGIC-MISSING', message: 'Select a Rhai or Visual Graph logic asset.' })
  else { try { resolvedEventLogicSource(document) } catch (error) { diagnostics.push({ severity: 'error', code: 'EVENT-LOGIC-SOURCE', message: error instanceof Error ? error.message : String(error) }) } }
  const availableRecords = records.length ? records : []
  for (const handler of document.handlers) {
    const key = eventHandlerKey(handler)
    if (seen.has(key)) diagnostics.push({ severity: 'error', code: 'EVENT-DUPLICATE', message: `Duplicate ${handler.kind} callback “${handler.callback}”.`, handlerUuid: handler.uuid })
    else seen.set(key, handler.uuid)
    if (!names.has(handler.callback)) diagnostics.push({ severity: 'warning', code: 'EVENT-CALLBACK-MISSING', message: `Callback “${handler.callback}” is not present in the selected logic asset.`, handlerUuid: handler.uuid })
    if (['input-pressed', 'input-released', 'timer', 'task', 'signal', 'ui', 'animation', 'network'].includes(handler.kind) && !handler.selector) diagnostics.push({ severity: 'warning', code: 'EVENT-SELECTOR-MISSING', message: `${handler.kind} needs an action, timer, task, signal, control, animation, or RPC selector.`, handlerUuid: handler.uuid })
  }
  if (availableRecords.length && document.baseSheetAsset && !availableRecords.some(record => record.assetType === 'eventSheet' && record.uuid === assetGuid(document.baseSheetAsset))) diagnostics.push({ severity: 'error', code: 'EVENT-BASE-MISSING', message: 'The inherited Event Sheet asset is missing.' })
  const inherited = new Set<string>([document.uuid]); let base = document.baseSheetAsset
  while (base) {
    if (inherited.size >= 64) { diagnostics.push({ severity: 'error', code: 'EVENT-INHERIT-DEPTH', message: 'Event Sheet inheritance exceeds 64 sheets.' }); break }
    const sheet = readEventSheet(base)
    if (!sheet) { diagnostics.push({ severity: 'error', code: 'EVENT-BASE-MISSING', message: `Inherited Event Sheet is missing or invalid: ${base}.` }); break }
    if (inherited.has(sheet.uuid)) { diagnostics.push({ severity: 'error', code: 'EVENT-INHERIT-CYCLE', message: 'Event Sheet inheritance contains a cycle.' }); break }
    inherited.add(sheet.uuid); base = sheet.baseSheetAsset
  }
  return diagnostics
}

export function attachEventSheet(entity: Entity, eventSheetReference: string): Script2D | null {
  const document = readEventSheet(eventSheetReference)
  if (!document) return null
  const logic = resolveEventSheetPrimaryLogic(document)
  if (!logic || validateEventSheet(document).some(diagnostic => diagnostic.severity === 'error')) return null
  const script = entity.script2D ?? entity.addComponent(new Script2D())
  script.eventSheetAsset = eventSheetReference
  script.scriptAsset = logic
  return script
}

export function eventHandlerKey(handler: ObjectEventHandler): string { return JSON.stringify([handler.kind, handler.selector, handler.callback]) }

export function resolveEventHandlers(reference: string | null | undefined, visited = new Set<string>()): ResolvedObjectEventHandler[] {
  const chain: Array<{ asset: string; document: EventSheetDocument }> = []
  const seen = new Set(visited)
  let cursor = reference
  while (cursor) {
    const asset = assetGuid(cursor), document = readEventSheet(cursor)
    // A broken chain cannot silently execute a partial inheritance result.
    if (!asset || !document || seen.has(asset) || seen.size >= 64) return []
    seen.add(asset)
    if (!document.enabled) break
    chain.push({ asset, document }); cursor = document.baseSheetAsset
  }
  const resolved = new Map<string, ResolvedObjectEventHandler>()
  for (const { asset, document } of chain.reverse()) {
    for (const handler of document.handlers) {
      const key = eventHandlerKey(handler)
      if (handler.overrideInherited) for (const [provenance, inherited] of resolved) {
        if (inherited.sourceSheetAsset !== asset && eventHandlerKey(inherited) === key) resolved.delete(provenance)
      }
      // Same callback in different authors remains distinct when inheritance is additive.
      resolved.set(`${asset}:${key}`, { ...handler, sourceSheetAsset: asset, sourceSheetUuid: document.uuid, logicAsset: resolveEventSheetPrimaryLogic(document), inherited: asset !== assetGuid(reference) })
      if (resolved.size > MAX_EVENT_HANDLERS) return []
    }
  }
  return [...resolved.values()].filter(handler => handler.enabled).sort((a, b) => b.priority - a.priority || a.sourceSheetAsset.localeCompare(b.sourceSheetAsset) || a.uuid.localeCompare(b.uuid))
}

/** Deterministic bounded dispatch planner used by editor audit and runtime bridges. */
export function scheduleObjectEvents(entities: readonly Entity[], kind: ObjectEventKind, selector = ''): ScheduledObjectEvent[] {
  const scheduled: ScheduledObjectEvent[] = []
  for (const entity of [...entities].sort((a, b) => a.uuid.localeCompare(b.uuid))) {
    if (!entity.enabled || !entity.script2D?.enabled || !entity.script2D.eventSheetAsset) continue
    const sheet = readEventSheet(entity.script2D.eventSheetAsset)
    if (!sheet?.enabled) continue
    for (const handler of resolveEventHandlers(entity.script2D.eventSheetAsset)) {
      if (handler.kind !== kind || (handler.selector && handler.selector !== selector)) continue
      scheduled.push({ sheetUuid: handler.sourceSheetUuid, sourceSheetAsset: handler.sourceSheetAsset, logicAsset: handler.logicAsset, handlerUuid: handler.uuid, entityUuid: entity.uuid, callback: handler.callback, priority: handler.priority, order: scheduled.length })
      if (scheduled.length >= MAX_EVENT_HANDLERS) return scheduled.sort((a, b) => b.priority - a.priority || a.entityUuid.localeCompare(b.entityUuid) || a.handlerUuid.localeCompare(b.handlerUuid))
    }
  }
  return scheduled.sort((a, b) => b.priority - a.priority || a.entityUuid.localeCompare(b.entityUuid) || a.handlerUuid.localeCompare(b.handlerUuid))
}

/** Stable per-sheet random stream; save/load and hot reload reproduce the same sequence. */
export function createEventRandomStream(seed: number): () => number {
  let state = (finiteInteger(seed, 1, 1, 0x7fff_ffff) >>> 0) || 1
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 0x1_0000_0000 }
}
