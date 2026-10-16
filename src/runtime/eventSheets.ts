/** Event Sheet authoring compatibility facade over the same pure runtime reader. */
import { validateEventSheetDraft } from '../editor/eventSheetDraftValidation'
import { assetGuid, assetState, createTextAsset, readTextAsset, resolveAsset, updateTextAssetTransactional } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import { executableGraphSource } from '../visual/graphCompiler'
import type { Entity } from '../world/Entity'
import { Script2D } from '../world/components'
import { parseRhai } from '../visual/rhaiSyntax'
import { resolveProjectScriptBundle } from './scriptModules'
import { readEventSheet as readFromCatalog, resolveEventSheetPrimaryLogic as primaryFromCatalog, resolveEventHandlers as handlersFromCatalog, normalizeEventSheet, defaultEventSheet, serializeEventSheet, eventHandlerKey, OBJECT_EVENT_KINDS, MAX_EVENT_HANDLERS, type EventSheetDocument, type EventSheetDiagnostic, type ResolvedObjectEventHandler, type ObjectEventKind, type ScheduledObjectEvent } from './eventSheetReader'
export { EVENT_SHEET_FORMAT, EVENT_SHEET_VERSION, MAX_EVENT_HANDLERS, OBJECT_EVENT_KINDS, eventCallbackFamily, defaultEventHandler, defaultEventSheet, normalizeEventSheet, parseEventSheet, serializeEventSheet, eventHandlerKey, createEventRandomStream } from './eventSheetReader'
export type { ObjectEventKind, ObjectEventHandler, ResolvedObjectEventHandler, EventSheetDocument, EventSheetDiagnostic, ScheduledObjectEvent } from './eventSheetReader'

const eventReadHost = { resolveAsset, readSource: readTextAsset }
export function readEventSheet(reference: string | null | undefined): EventSheetDocument | null { return readFromCatalog(reference, eventReadHost) }
export function resolveEventSheetPrimaryLogic(document: EventSheetDocument): string | null { return primaryFromCatalog(document, eventReadHost) }
export function resolveEventHandlers(reference: string | null | undefined, visited = new Set<string>(), draft?: EventSheetDocument): ResolvedObjectEventHandler[] { return handlersFromCatalog(reference, eventReadHost, visited, draft) }

/** 结构说明（自动提取）：createEventSheetAsset；输入 name、logicAsset；直接调用 defaultEventSheet、createTextAsset、serializeEventSheet、synchronizeEventSheetDependencies；返回路径包含 record。 */ export function createEventSheetAsset(name: string, logicAsset: string | null = null): AssetRecord {
  const document = defaultEventSheet(name, logicAsset)
  const record = createTextAsset(document.name, 'eventSheet', serializeEventSheet(document), 'Assets/Event Sheets')
  synchronizeEventSheetDependencies(record, document)
  return record
}

/** 结构说明（自动提取）：synchronizeEventSheetDependencies；输入 record、document；直接调用 sort、Set、flatMap；写入 record.pipeline.dependencies。 */ function synchronizeEventSheetDependencies(record: AssetRecord, document: EventSheetDocument): void {
  if (!record.pipeline) return
  record.pipeline.dependencies = [...new Set([document.logicAsset, document.baseSheetAsset].flatMap(/* 当 assetGuid(reference) 为 null 或 undefined 时返回 []，否则保留左侧值。 */ reference => assetGuid(reference) ?? []))].sort()
}

/** 结构说明（自动提取）：saveEventSheetAsset；输入 assetUuid、document；直接调用 resolveAsset、Array.isArray、document.handlers.some、validateEventSheetDraft、updateTextAssetTransactional 等。 */ export function saveEventSheetAsset(assetUuid: string, document: EventSheetDocument): boolean {
  const destination = resolveAsset(assetUuid)
  if (!destination || destination.assetType !== 'eventSheet' || !document || !Array.isArray(document.handlers)) return false
  if (document.handlers.some(/* 先计算 !handler；仅当其为假值时求右侧 !OBJECT_EVENT_KINDS.includes(handler.kind)，返回短路求值结果。 */ handler => !handler || !OBJECT_EVENT_KINDS.includes(handler.kind))) return false
  if (validateEventSheetDraft(document).length) return false
  // 保存边界保护资源身份与继承链；未配置逻辑的工作中草稿仍可保存。
  const saved = readEventSheet(assetUuid)
  if (!saved || saved.uuid !== document.uuid || document.format !== saved.format || document.version !== saved.version) return false
  if (validateEventSheet(document).some(/** 仅阻断结构和继承错误，允许尚未绑定逻辑的草稿。 */ issue => issue.code.startsWith('EVENT-INHERIT-') || issue.code === 'EVENT-BASE-MISSING' || issue.code === 'EVENT-DUPLICATE')) return false
  if (!updateTextAssetTransactional(assetUuid, serializeEventSheet(document))) return false
  const record = resolveAsset(assetUuid)
  if (record) synchronizeEventSheetDependencies(record, document)
  return true
}

/** 结构说明（自动提取）：logicSourceForEventSheet；输入 document；直接调用 resolvedEventLogicSource。 */ export function logicSourceForEventSheet(document: EventSheetDocument): string {
  try { return resolvedEventLogicSource(document) } catch { return '' }
}

/** 结构说明（自动提取）：resolvedEventLogicSource；输入 document；直接调用 resolveAsset、resolveEventSheetPrimaryLogic、resolveProjectScriptBundle。 */ function resolvedEventLogicSource(document: EventSheetDocument): string {
  const record = resolveAsset(resolveEventSheetPrimaryLogic(document)); if (!record) return ''
  return resolveProjectScriptBundle(record.uuid, {
    resolveAsset: /** 结构说明（自动提取）：匿名回调；输入 reference；直接调用 resolveAsset、assetState.records.find。 */ reference => { const asset = resolveAsset(reference) ?? assetState.records.find(/* 比较 item.path 与 reference，返回严格相等的判断结果。 */ item => item.path === reference); return asset && (asset.assetType === 'script' || asset.assetType === 'visualScript') ? { uuid: asset.uuid, path: asset.path, assetType: asset.assetType } : null },
    readSource: /* 调用 readTextAsset(uuid) 并返回调用结果。 */ uuid => readTextAsset(uuid), compileVisual: executableGraphSource
  }) ?? ''
}

/** 结构说明（自动提取）：callbackNamesInLogic；输入 document；直接调用 parseRhai、logicSourceForEventSheet、Set、program.body.flatMap。 */ export function callbackNamesInLogic(document: EventSheetDocument): Set<string> {
  const program = parseRhai(logicSourceForEventSheet(document), { moduleMode: 'host' })
  return new Set(program.body.flatMap(/* 根据 node.kind === 'FunctionDeclaration' && !node.receiver 的真假，分别返回 [node.name] 或 []。 */ node => node.kind === 'FunctionDeclaration' && !node.receiver ? [node.name] : []))
}

/** 结构说明（自动提取）：validateEventSheet；输入 documentInput、records；直接调用 normalizeEventSheet、Map、callbackNamesInLogic、resolveAsset、resolveEventSheetPrimaryLogic 等；写入 base；返回路径包含 diagnostics；包含循环处理。 */ export function validateEventSheet(documentInput: EventSheetDocument, records: readonly AssetRecord[] = []): EventSheetDiagnostic[] {
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
  if (availableRecords.length && document.baseSheetAsset && !availableRecords.some(/* 先计算 record.assetType === 'eventSheet'；仅当其为真值时求右侧 record.uuid === assetGuid(document.baseSheetAsset)，返回短路求值结果。 */ record => record.assetType === 'eventSheet' && record.uuid === assetGuid(document.baseSheetAsset))) diagnostics.push({ severity: 'error', code: 'EVENT-BASE-MISSING', message: 'The inherited Event Sheet asset is missing.' })
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

/** 结构说明（自动提取）：attachEventSheet；输入 entity、eventSheetReference；直接调用 readEventSheet、resolveEventSheetPrimaryLogic、some、validateEventSheet、entity.addComponent 等；写入 script.eventSheetAsset、script.scriptAsset；返回路径包含 script。 */ export function attachEventSheet(entity: Entity, eventSheetReference: string): Script2D | null {
  const document = readEventSheet(eventSheetReference)
  if (!document) return null
  const logic = resolveEventSheetPrimaryLogic(document)
  if (!logic || validateEventSheet(document).some(/* 比较 diagnostic.severity 与 'error'，返回严格相等的判断结果。 */ diagnostic => diagnostic.severity === 'error')) return null
  const script = entity.script2D ?? entity.addComponent(new Script2D())
  script.eventSheetAsset = eventSheetReference
  script.scriptAsset = logic
  return script
}

/** Deterministic bounded dispatch planner used by editor audit and runtime bridges. */
/** 结构说明（自动提取）：scheduleObjectEvents；输入 entities、kind、selector；直接调用 sort、readEventSheet、resolveEventHandlers、scheduled.push、scheduled.sort；包含循环处理。 */ export function scheduleObjectEvents(entities: readonly Entity[], kind: ObjectEventKind, selector = ''): ScheduledObjectEvent[] {
  const scheduled: ScheduledObjectEvent[] = []
  for (const entity of [...entities].sort(/* 调用 a.uuid.localeCompare(b.uuid) 并返回调用结果。 */ (a, b) => a.uuid.localeCompare(b.uuid))) {
    if (!entity.enabled || !entity.script2D?.enabled || !entity.script2D.eventSheetAsset) continue
    const sheet = readEventSheet(entity.script2D.eventSheetAsset)
    if (!sheet?.enabled) continue
    for (const handler of resolveEventHandlers(entity.script2D.eventSheetAsset)) {
      if (handler.kind !== kind || (handler.selector && handler.selector !== selector)) continue
      scheduled.push({ sheetUuid: handler.sourceSheetUuid, sourceSheetAsset: handler.sourceSheetAsset, logicAsset: handler.logicAsset, handlerUuid: handler.uuid, entityUuid: entity.uuid, callback: handler.callback, priority: handler.priority, order: scheduled.length })
      if (scheduled.length >= MAX_EVENT_HANDLERS) return scheduled.sort(/* 先计算 b.priority - a.priority || a.entityUuid.localeCompare(b.entityUuid)；仅当其为假值时求右侧 a.order - b.order，返回短路求值结果。 */ (a, b) => b.priority - a.priority || a.entityUuid.localeCompare(b.entityUuid) || a.order - b.order)
    }
  }
  return scheduled.sort(/* 先计算 b.priority - a.priority || a.entityUuid.localeCompare(b.entityUuid)；仅当其为假值时求右侧 a.order - b.order，返回短路求值结果。 */ (a, b) => b.priority - a.priority || a.entityUuid.localeCompare(b.entityUuid) || a.order - b.order)
}
