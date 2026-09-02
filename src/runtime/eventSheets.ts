import { assetGuid, createTextAsset, readTextAsset, resolveAsset, updateTextAssetTransactional } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import { executableGraphSource } from '../visual/graphCompiler'
import { graphUuid } from '../visual/graphTypes'
import type { Entity } from '../world/Entity'
import { Script2D } from '../world/components'

export const EVENT_SHEET_FORMAT = 'nova-event-sheet' as const
export const EVENT_SHEET_VERSION = 1 as const
export const MAX_EVENT_HANDLERS = 10_000

export type ObjectEventKind =
  | 'awake' | 'start' | 'update' | 'fixed-update'
  | 'input-pressed' | 'input-released' | 'timer' | 'signal'
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
export interface ScheduledObjectEvent { sheetUuid: string; handlerUuid: string; entityUuid: string; callback: string; priority: number; order: number }

export const OBJECT_EVENT_KINDS: readonly ObjectEventKind[] = Object.freeze([
  'awake', 'start', 'update', 'fixed-update', 'input-pressed', 'input-released', 'timer', 'signal',
  'collision-enter', 'collision-stay', 'collision-exit', 'trigger-enter', 'trigger-stay', 'trigger-exit',
  'ui', 'animation', 'network'
])

const CALLBACK_BY_EVENT: Record<ObjectEventKind, string> = {
  awake: 'awake', start: 'start', update: 'update', 'fixed-update': 'fixed_update',
  'input-pressed': 'update', 'input-released': 'update', timer: 'on_timer', signal: 'on_signal',
  'collision-enter': 'on_collision_enter', 'collision-stay': 'on_collision_stay', 'collision-exit': 'on_collision_exit',
  'trigger-enter': 'on_trigger_enter', 'trigger-stay': 'on_trigger_stay', 'trigger-exit': 'on_trigger_exit',
  ui: 'on_signal', animation: 'on_signal', network: 'on_signal'
}

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
  if (!updateTextAssetTransactional(assetUuid, serializeEventSheet(document))) return false
  const record = resolveAsset(assetUuid)
  if (record) synchronizeEventSheetDependencies(record, document)
  return true
}

export function logicSourceForEventSheet(document: EventSheetDocument): string {
  const record = resolveAsset(document.logicAsset), source = readTextAsset(document.logicAsset)
  if (!record || !source) return ''
  try { return record.assetType === 'visualScript' ? executableGraphSource(source) : record.assetType === 'script' ? source : '' } catch { return '' }
}

export function callbackNamesInLogic(document: EventSheetDocument): Set<string> {
  const names = new Set<string>()
  for (const match of logicSourceForEventSheet(document).matchAll(/\bfn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) names.add(match[1])
  return names
}

export function validateEventSheet(documentInput: EventSheetDocument, records: readonly AssetRecord[] = []): EventSheetDiagnostic[] {
  const document = normalizeEventSheet(documentInput), diagnostics: EventSheetDiagnostic[] = [], seen = new Map<string, string>(), names = callbackNamesInLogic(document)
  const logic = resolveAsset(document.logicAsset)
  if (!logic || (logic.assetType !== 'script' && logic.assetType !== 'visualScript')) diagnostics.push({ severity: 'error', code: 'EVENT-LOGIC-MISSING', message: 'Select a Rhai or Visual Graph logic asset.' })
  const availableRecords = records.length ? records : []
  for (const handler of document.handlers) {
    const key = `${handler.kind}:${handler.selector.toLowerCase()}:${handler.callback}`
    if (seen.has(key)) diagnostics.push({ severity: 'error', code: 'EVENT-DUPLICATE', message: `Duplicate ${handler.kind} callback “${handler.callback}”.`, handlerUuid: handler.uuid })
    else seen.set(key, handler.uuid)
    if (!names.has(handler.callback)) diagnostics.push({ severity: 'warning', code: 'EVENT-CALLBACK-MISSING', message: `Callback “${handler.callback}” is not present in the selected logic asset.`, handlerUuid: handler.uuid })
    if (['input-pressed', 'input-released', 'timer', 'signal', 'ui', 'animation', 'network'].includes(handler.kind) && !handler.selector) diagnostics.push({ severity: 'warning', code: 'EVENT-SELECTOR-MISSING', message: `${handler.kind} needs an action, timer, signal, control, animation, or RPC selector.`, handlerUuid: handler.uuid })
  }
  if (availableRecords.length && document.baseSheetAsset && !availableRecords.some(record => record.assetType === 'eventSheet' && record.uuid === assetGuid(document.baseSheetAsset))) diagnostics.push({ severity: 'error', code: 'EVENT-BASE-MISSING', message: 'The inherited Event Sheet asset is missing.' })
  const inherited = new Set<string>([document.uuid]); let base = document.baseSheetAsset
  while (base && inherited.size <= 64) { const sheet=readEventSheet(base);if(!sheet)break;if(inherited.has(sheet.uuid)){diagnostics.push({severity:'error',code:'EVENT-INHERIT-CYCLE',message:'Event Sheet inheritance contains a cycle.'});break}inherited.add(sheet.uuid);base=sheet.baseSheetAsset }
  return diagnostics
}

export function attachEventSheet(entity: Entity, eventSheetReference: string): Script2D | null {
  const document = readEventSheet(eventSheetReference)
  if (!document) return null
  const script = entity.script2D ?? entity.addComponent(new Script2D())
  script.eventSheetAsset = eventSheetReference
  script.scriptAsset = document.logicAsset
  return script
}

export function eventHandlerKey(handler: ObjectEventHandler): string { return `${handler.kind}:${handler.selector.toLowerCase()}` }

export function resolveEventHandlers(reference: string | null | undefined, visited = new Set<string>()): ObjectEventHandler[] {
  const uuid = assetGuid(reference) ?? cleanReference(reference)
  if (!uuid || visited.has(uuid) || visited.size >= 64) return []
  visited.add(uuid)
  const document = readEventSheet(reference)
  if (!document || !document.enabled) return []
  const inherited = resolveEventHandlers(document.baseSheetAsset, visited), byKey = new Map(inherited.map(handler => [eventHandlerKey(handler), handler]))
  for (const handler of document.handlers) {
    const key = eventHandlerKey(handler)
    if (handler.overrideInherited || !byKey.has(key)) byKey.set(key, handler)
  }
  return [...byKey.values()].filter(handler => handler.enabled).sort((a, b) => b.priority - a.priority || a.uuid.localeCompare(b.uuid))
}

/** Deterministic bounded dispatch planner used by editor audit and runtime bridges. */
export function scheduleObjectEvents(entities: readonly Entity[], kind: ObjectEventKind, selector = ''): ScheduledObjectEvent[] {
  const scheduled: ScheduledObjectEvent[] = []
  for (const entity of [...entities].sort((a, b) => a.uuid.localeCompare(b.uuid))) {
    if (!entity.enabled || !entity.script2D?.enabled || !entity.script2D.eventSheetAsset) continue
    const sheet = readEventSheet(entity.script2D.eventSheetAsset)
    if (!sheet?.enabled) continue
    for (const handler of resolveEventHandlers(entity.script2D.eventSheetAsset)) {
      if (handler.kind !== kind || (selector && handler.selector !== selector)) continue
      scheduled.push({ sheetUuid: sheet.uuid, handlerUuid: handler.uuid, entityUuid: entity.uuid, callback: handler.callback, priority: handler.priority, order: scheduled.length })
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
