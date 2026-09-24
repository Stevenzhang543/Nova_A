/** 游戏存档系统：选择可保存运行数据，校验、序列化并恢复存档状态。 */
import { reactive } from 'vue'
import { projectSessionState } from '../projects/projectSession'
import { productionSettings } from './production'

export type SaveScalar = boolean | number | string | null
export type SaveValue = SaveScalar | SaveValue[] | { [key: string]: SaveValue }
export type SaveProgress = { phase: 'reading' | 'validating' | 'migrating' | 'serializing' | 'writing' | 'committing' | 'complete'; progress: number; message: string }

const SAVE_PREFIX = 'nova_a.game_save.v2'
const LEGACY_SAVE_PREFIX = 'nova_a.game_save.v1'
const MAX_SAVE_BYTES = 10_000_000
const MAX_DEPTH = 16
const MAX_COLLECTION_SIZE = 20_000

interface SaveEnvelope {
  format: 'nova-save'
  envelopeVersion: 2
  version: number
  projectId: string
  slot: string
  savedAt: string
  checksum: string
  values: Record<string, SaveValue>
}

interface MigratedSave { format: 'nova-save'; version: number; values: Record<string, SaveValue> }
export interface SaveSlotMetadata { slot: string; projectId: string; schemaVersion: number; savedAt: string; bytes: number; checksum: string; valid: boolean; backupAvailable: boolean; location: string }
export interface SaveSerializer { serialize(): unknown; deserialize(value: SaveValue | undefined): void }

export const saveGameState = reactive({
  projectId: '', slot: 'slot1', values: {} as Record<string, SaveValue>, dirty: false,
  lastCommittedAt: null as string | null, error: '', busy: false, progress: 0, progressMessage: '',
  recoveryAvailable: false, recoverySource: '' as '' | 'backup' | 'temporary', recoveryMessage: '', platformLocation: ''
})

const serializers = new Map<string, SaveSerializer>()
const recoveryCandidates = new Map<string, string>()

/** 结构说明（自动提取）：safeName；输入 value、fallback；直接调用 slice、replace、value.trim。 */ function safeName(value: string, fallback: string): string { const safe = value.trim().replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 80); return safe || fallback }
/** 按模板 `${SAVE_PREFIX}:${safeName(projectId, 'project')}:${safeName(slot, 'slot1')}${suffix}` 生成并返回字符串。 */ function storageKey(projectId: string, slot: string, suffix = ''): string { return `${SAVE_PREFIX}:${safeName(projectId, 'project')}:${safeName(slot, 'slot1')}${suffix}` }
/** 按模板 `${LEGACY_SAVE_PREFIX}:${safeName(projectId, 'project')}:${safeName(slot, 'slot1')}` 生成并返回字符串。 */ function legacyStorageKey(projectId: string, slot: string): string { return `${LEGACY_SAVE_PREFIX}:${safeName(projectId, 'project')}:${safeName(slot, 'slot1')}` }

/** 结构说明（自动提取）：platformSaveLocation；输入 projectId；直接调用 safeName。 */ export function platformSaveLocation(projectId = saveGameState.projectId): string {
  const origin = typeof location === 'undefined' ? 'headless-runtime' : location.origin
  return `Web Storage · ${origin} · ${safeName(projectId || projectSessionState.id, 'project')}`
}

/** 结构说明（自动提取）：checksum；输入 source；直接调用 source.charCodeAt、Math.imul、padStart、toString、source.length.toString；写入 first、second；包含循环处理。 */ function checksum(source: string): string {
  let first = 0x811c9dc5, second = 0x9e3779b9
  for (let index = 0; index < source.length; index++) { const value = source.charCodeAt(index); first = Math.imul(first ^ value, 0x01000193); second = Math.imul(second ^ value, 0x85ebca6b); second ^= second >>> 13 }
  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}${source.length.toString(16).padStart(8, '0')}`
}

/** 结构说明（自动提取）：envelopePayload；输入 envelope；直接调用 JSON.stringify。 */ function envelopePayload(envelope: Omit<SaveEnvelope, 'checksum'> | SaveEnvelope): string {
  return JSON.stringify({ format: envelope.format, envelopeVersion: envelope.envelopeVersion, version: envelope.version, projectId: envelope.projectId, slot: envelope.slot, savedAt: envelope.savedAt, values: envelope.values })
}

/** 结构说明（自动提取）：createEnvelope；输入 projectId、slot、values；直接调用 toISOString、Date、checksum、envelopePayload。 */ function createEnvelope(projectId: string, slot: string, values: Record<string, SaveValue>): SaveEnvelope {
  const base = { format: 'nova-save' as const, envelopeVersion: 2 as const, version: productionSettings.data.saveSchemaVersion, projectId, slot, savedAt: new Date().toISOString(), values }
  return { ...base, checksum: checksum(envelopePayload(base)) }
}

/** 结构说明（自动提取）：parseEnvelope；输入 source；直接调用 JSON.parse、Array.isArray、Error、Number.isInteger、checksum 等；返回路径包含 envelope；包含显式抛错路径。 */ function parseEnvelope(source: string): SaveEnvelope {
  const value = JSON.parse(source) as unknown
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The save envelope is not an object.')
  const raw = value as Record<string, unknown>
  if (raw.format !== 'nova-save' || raw.envelopeVersion !== 2 || !Number.isInteger(raw.version) || typeof raw.projectId !== 'string' || typeof raw.slot !== 'string' || typeof raw.savedAt !== 'string' || typeof raw.checksum !== 'string' || !raw.values || typeof raw.values !== 'object' || Array.isArray(raw.values)) throw new Error('The save envelope is incomplete or uses an unsupported envelope version.')
  const envelope = raw as unknown as SaveEnvelope
  if (checksum(envelopePayload(envelope)) !== envelope.checksum) throw new Error('Save checksum mismatch.')
  return envelope
}

/** 结构说明（自动提取）：legacyEnvelope；输入 value；直接调用 Array.isArray、Number.isInteger、Math.max、Math.min、Number。 */ function legacyEnvelope(value: unknown): { version: number; values: unknown } {
  if (value && typeof value === 'object' && !Array.isArray(value)) { const source = value as Record<string, unknown>; if (source.format === 'nova-save' && Number.isInteger(source.version) && source.values && typeof source.values === 'object' && !Array.isArray(source.values)) return { version: Math.max(1, Math.min(65_535, Number(source.version))), values: source.values } }
  return { version: 1, values: value }
}

/** Applies the project's ordered, bounded and deterministic top-level save-data migrations. */
/** 结构说明（自动提取）：migrateSaveData；输入 value、storedVersion；直接调用 normalizeSaveValue、Array.isArray、Error、Math.max、Math.min 等；写入 values[…]、version；包含循环处理；包含显式抛错路径。 */ export function migrateSaveData(value: unknown, storedVersion = 1): MigratedSave {
  const normalized = normalizeSaveValue(value)
  if (!normalized || Array.isArray(normalized) || typeof normalized !== 'object') throw new Error('The save slot root must be a map.')
  const values = { ...(normalized as Record<string, SaveValue>) }, targetVersion = productionSettings.data.saveSchemaVersion
  let version = Math.max(1, Math.min(65_535, Math.round(storedVersion)))
  if (version > targetVersion) throw new Error(`Save data schema ${version} is newer than supported schema ${targetVersion}.`)
  const visited = new Set<number>()
  while (version < targetVersion) {
    if (visited.has(version)) throw new Error(`Save migration cycle detected at schema ${version}.`)
    visited.add(version)
    const migration = productionSettings.data.saveMigrations.find(/* 比较 item.fromVersion 与 version，返回严格相等的判断结果。 */ item => item.fromVersion === version)
    if (!migration || migration.toVersion <= version || migration.toVersion > targetVersion) throw new Error(`Save data requires a valid migration from schema ${version} to ${targetVersion}.`)
    for (const [from, to] of Object.entries(migration.renames).sort(/* 调用 first.localeCompare(second) 并返回调用结果。 */ ([first], [second]) => first.localeCompare(second))) { if (Object.prototype.hasOwnProperty.call(values, from) && !Object.prototype.hasOwnProperty.call(values, to)) values[to] = values[from]; delete values[from] }
    for (const [key, fallback] of Object.entries(migration.defaults).sort(/* 调用 first.localeCompare(second) 并返回调用结果。 */ ([first], [second]) => first.localeCompare(second))) if (!Object.prototype.hasOwnProperty.call(values, key)) values[key] = normalizeSaveValue(fallback)
    for (const key of [...migration.remove].sort()) delete values[key]
    version = migration.toVersion
  }
  return { format: 'nova-save', version, values }
}

/** 结构说明（自动提取）：normalizeSaveValue；输入 value、depth；直接调用 Error、value.slice、Number.isFinite、Array.isArray、value.map 等；返回路径包含 value；包含显式抛错路径。 */ export function normalizeSaveValue(value: unknown, depth = 0): SaveValue {
  if (depth > MAX_DEPTH) throw new Error(`Save data exceeds the maximum depth of ${MAX_DEPTH}.`)
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return typeof value === 'string' ? value.slice(0, 1_000_000) : value
  if (typeof value === 'number') { if (!Number.isFinite(value)) throw new Error('Save data numbers must be finite.'); return value }
  if (Array.isArray(value)) { if (value.length > MAX_COLLECTION_SIZE) throw new Error(`Save arrays may contain at most ${MAX_COLLECTION_SIZE} items.`); return value.map(/* 调用 normalizeSaveValue(item, depth + 1) 并返回调用结果。 */ item => normalizeSaveValue(item, depth + 1)) }
  if (value && typeof value === 'object') { const entries = Object.entries(value as Record<string, unknown>); if (entries.length > MAX_COLLECTION_SIZE) throw new Error(`Save maps may contain at most ${MAX_COLLECTION_SIZE} keys.`); return Object.fromEntries(entries.sort(/* 调用 first.localeCompare(second) 并返回调用结果。 */ ([first], [second]) => first.localeCompare(second)).map(/* 返回按声明顺序构造的数组 [safeName(key, 'key'), normalizeSaveValue(item, depth + 1)]。 */ ([key, item]) => [safeName(key, 'key'), normalizeSaveValue(item, depth + 1)])) }
  throw new Error('Save data only supports booleans, finite numbers, strings, null, arrays, and maps.')
}

/** 结构说明（自动提取）：registerSaveSerializer；输入 namespace、serializer；直接调用 safeName、serializers.has、Error、serializers.set；包含显式抛错路径。 */ export function registerSaveSerializer(namespace: string, serializer: SaveSerializer): () => void {
  const key = safeName(namespace, '')
  if (!key || serializers.has(key)) throw new Error(`Save serializer namespace ${namespace} is invalid or already registered.`)
  serializers.set(key, serializer); return /** 结构说明（自动提取）：匿名回调；无显式参数；直接调用 serializers.get、serializers.delete。 */ () => { if (serializers.get(key) === serializer) serializers.delete(key) }
}

/** 结构说明（自动提取）：serializeCustomValues；输入 values；直接调用 sort、normalizeSaveValue、serializer.serialize；写入 result[…]；返回路径包含 result；包含循环处理。 */ function serializeCustomValues(values: Record<string, SaveValue>): Record<string, SaveValue> { const result = { ...values }; for (const [namespace, serializer] of [...serializers].sort(/* 调用 first.localeCompare(second) 并返回调用结果。 */ ([first], [second]) => first.localeCompare(second))) result[`@custom.${namespace}`] = normalizeSaveValue(serializer.serialize()); return result }
/** 结构说明（自动提取）：deserializeCustomValues；输入 values；直接调用 serializer.deserialize；包含循环处理。 */ function deserializeCustomValues(values: Record<string, SaveValue>): void { for (const [namespace, serializer] of serializers) serializer.deserialize(values[`@custom.${namespace}`]) }
/** 结构说明（自动提取）：report；输入 progress、phase、value、message；直接调用 progress；写入 saveGameState.progress、saveGameState.progressMessage。 */ function report(progress: ((value: SaveProgress) => void) | undefined, phase: SaveProgress['phase'], value: number, message: string): void { saveGameState.progress = value; saveGameState.progressMessage = message; progress?.({ phase, progress: value, message }) }
/** 结构说明（自动提取）：checkAbort；输入 signal；直接调用 DOMException；包含显式抛错路径。 */ function checkAbort(signal?: AbortSignal): void { if (signal?.aborted) throw new DOMException('Save operation was cancelled.', 'AbortError') }
/** 结构说明（自动提取）：asyncCheckpoint；输入 signal；直接调用 checkAbort、Promise.resolve；等待异步结果。 */ async function asyncCheckpoint(signal?: AbortSignal): Promise<void> { checkAbort(signal); await Promise.resolve(); checkAbort(signal) }

/** 结构说明（自动提取）：useSaveProject；输入 projectId、slot；直接调用 safeName、platformSaveLocation、loadSaveSlot；写入 saveGameState.platformLocation、saveGameState.projectId。 */ export function useSaveProject(projectId = projectSessionState.id, slot = 'slot1'): void {
  const safeProject = safeName(projectId, 'project'), safeSlot = safeName(slot, 'slot1'); saveGameState.platformLocation = platformSaveLocation(safeProject)
  if (saveGameState.projectId === safeProject && saveGameState.slot === safeSlot) return
  saveGameState.projectId = safeProject; loadSaveSlot(safeSlot)
}

/** 结构说明（自动提取）：recoveryCandidate；输入 projectId、slot；直接调用 localStorage.getItem、storageKey、parseEnvelope；包含循环处理。 */ function recoveryCandidate(projectId: string, slot: string): { source: 'backup' | 'temporary'; value: string } | null {
  if (typeof localStorage === 'undefined') return null
  for (const [source, suffix] of [['temporary', '.tmp'], ['backup', '.backup']] as const) { const value = localStorage.getItem(storageKey(projectId, slot, suffix)); if (!value) continue; try { parseEnvelope(value); return { source, value } } catch { /* try next recovery source */ } }
  return null
}

/** 结构说明（自动提取）：loadSaveSlot；输入 slot；直接调用 safeName、Object.assign、Error、storageKey、localStorage.getItem 等；写入 saveGameState.values、saveGameState.lastCommittedAt、saveGameState.dirty、saveGameState.recoveryAvailable 等；包含显式抛错路径。 */ export function loadSaveSlot(slot: string): boolean {
  const safeSlot = safeName(slot, 'slot1'), projectId = saveGameState.projectId || safeName(projectSessionState.id, 'project')
  Object.assign(saveGameState, { projectId, slot: safeSlot, error: '', recoveryAvailable: false, recoverySource: '', recoveryMessage: '' })
  try {
    if (typeof localStorage === 'undefined') throw new Error('Persistent storage is unavailable in this runtime.')
    const key = storageKey(projectId, safeSlot), source = localStorage.getItem(key)
    if (source) {
      try { const envelope = parseEnvelope(source), migrated = migrateSaveData(envelope.values, envelope.version); saveGameState.values = migrated.values; deserializeCustomValues(migrated.values); saveGameState.lastCommittedAt = envelope.savedAt; saveGameState.dirty = false; localStorage.removeItem(`${key}.journal`); localStorage.removeItem(`${key}.tmp`); return true }
      catch (primaryError) { const candidate = recoveryCandidate(projectId, safeSlot); if (candidate) { recoveryCandidates.set(key, candidate.value); saveGameState.recoveryAvailable = true; saveGameState.recoverySource = candidate.source; saveGameState.recoveryMessage = `The primary save is invalid. A valid ${candidate.source} copy is available.` } throw primaryError }
    }
    const legacySource = localStorage.getItem(legacyStorageKey(projectId, safeSlot))
    if (legacySource) { const legacy = legacyEnvelope(JSON.parse(legacySource)), migrated = migrateSaveData(legacy.values, legacy.version); saveGameState.values = migrated.values; deserializeCustomValues(migrated.values); saveGameState.dirty = true; saveGameState.recoveryMessage = 'A legacy or unversioned save was loaded and will be upgraded on commit.'; return true }
    const interrupted = recoveryCandidate(projectId, safeSlot)
    if (interrupted) { recoveryCandidates.set(key, interrupted.value); saveGameState.recoveryAvailable = true; saveGameState.recoverySource = interrupted.source; saveGameState.recoveryMessage = `An interrupted transaction left a valid ${interrupted.source} copy. Choose Recover to restore it.` }
    saveGameState.values = {}; saveGameState.dirty = false; return false
  } catch (error) { saveGameState.values = {}; saveGameState.dirty = false; saveGameState.error = error instanceof Error ? error.message : String(error); return false }
}

/** 结构说明（自动提取）：recoverSaveSlot；输入 slot；直接调用 storageKey、safeName、recoveryCandidates.get、parseEnvelope、localStorage.setItem 等；写入 saveGameState.recoveryAvailable、saveGameState.error。 */ export function recoverSaveSlot(slot = saveGameState.slot): boolean {
  if (typeof localStorage === 'undefined') return false
  const key = storageKey(saveGameState.projectId, safeName(slot, 'slot1')), candidate = recoveryCandidates.get(key)
  if (!candidate) return false
  try { parseEnvelope(candidate); localStorage.setItem(key, candidate); recoveryCandidates.delete(key); saveGameState.recoveryAvailable = false; return loadSaveSlot(slot) } catch (error) { saveGameState.error = error instanceof Error ? error.message : String(error); return false }
}

/** 结构说明（自动提取）：loadSaveSlotAsync；输入 slot、options；直接调用 report、asyncCheckpoint、loadSaveSlot、checkAbort；写入 saveGameState.busy；返回路径包含 loaded；等待异步结果。 */ export async function loadSaveSlotAsync(slot: string, options: { signal?: AbortSignal; onProgress?: (value: SaveProgress) => void } = {}): Promise<boolean> {
  saveGameState.busy = true
  try { report(options.onProgress, 'reading', .1, 'Reading save slot'); await asyncCheckpoint(options.signal); report(options.onProgress, 'validating', .35, 'Validating checksum and journal'); await asyncCheckpoint(options.signal); const loaded = loadSaveSlot(slot); checkAbort(options.signal); report(options.onProgress, 'migrating', .75, 'Applying deterministic migrations'); await asyncCheckpoint(options.signal); report(options.onProgress, 'complete', 1, loaded ? 'Save loaded' : 'Empty slot loaded'); return loaded } finally { saveGameState.busy = false }
}

/** 结构说明（自动提取）：saveSnapshot；无显式参数；直接调用 useSaveProject、normalizeSaveValue。 */ export function saveSnapshot(): Record<string, SaveValue> { useSaveProject(); return normalizeSaveValue(saveGameState.values) as Record<string, SaveValue> }
/** 结构说明（自动提取）：setSaveValue；输入 key、value；直接调用 useSaveProject、safeName、normalizeSaveValue；写入 saveGameState.values[…]、saveGameState.dirty。 */ export function setSaveValue(key: string, value: unknown): void { useSaveProject(); saveGameState.values[safeName(key, 'key')] = normalizeSaveValue(value); saveGameState.dirty = true }
/** 结构说明（自动提取）：deleteSaveValue；输入 key；直接调用 useSaveProject、safeName；写入 saveGameState.dirty。 */ export function deleteSaveValue(key: string): void { useSaveProject(); delete saveGameState.values[safeName(key, 'key')]; saveGameState.dirty = true }
/** 结构说明（自动提取）：clearSaveValues；无显式参数；直接调用 useSaveProject；写入 saveGameState.values、saveGameState.dirty。 */ export function clearSaveValues(): void { useSaveProject(); saveGameState.values = {}; saveGameState.dirty = true }

/** 结构说明（自动提取）：commitSaveSlot；输入 slot；直接调用 useSaveProject、safeName、Object.assign、Error、migrateSaveData 等；写入 saveGameState.values、saveGameState.dirty、saveGameState.lastCommittedAt、saveGameState.error；包含显式抛错路径。 */ export function commitSaveSlot(slot = saveGameState.slot): boolean {
  useSaveProject(projectSessionState.id, saveGameState.slot)
  const safeSlot = safeName(slot, 'slot1'), projectId = saveGameState.projectId
  Object.assign(saveGameState, { slot: safeSlot, error: '', recoveryAvailable: false, recoverySource: '', recoveryMessage: '' })
  try {
    if (typeof localStorage === 'undefined') throw new Error('Persistent storage is unavailable in this runtime.')
    const migrated = migrateSaveData(serializeCustomValues(saveGameState.values), productionSettings.data.saveSchemaVersion), envelope = createEnvelope(projectId, safeSlot, migrated.values), source = JSON.stringify(envelope)
    if (source.length * 2 > MAX_SAVE_BYTES) throw new Error(`Save data exceeds the ${MAX_SAVE_BYTES} byte limit.`)
    const key = storageKey(projectId, safeSlot), previous = localStorage.getItem(key)
    localStorage.setItem(`${key}.journal`, JSON.stringify({ format: 'nova-save-journal', version: 1, phase: 'prepared', slot: safeSlot, checksum: envelope.checksum, startedAt: new Date().toISOString() }))
    localStorage.setItem(`${key}.tmp`, source); parseEnvelope(localStorage.getItem(`${key}.tmp`) ?? '')
    if (previous) localStorage.setItem(`${key}.backup`, previous)
    localStorage.setItem(key, source); parseEnvelope(localStorage.getItem(key) ?? '')
    localStorage.removeItem(`${key}.tmp`); localStorage.removeItem(`${key}.journal`)
    saveGameState.values = migrated.values; saveGameState.dirty = false; saveGameState.lastCommittedAt = envelope.savedAt; return true
  } catch (error) { saveGameState.error = error instanceof Error ? error.message : String(error); return false }
}

/** 结构说明（自动提取）：commitSaveSlotAsync；输入 slot、options；直接调用 report、asyncCheckpoint、migrateSaveData、serializeCustomValues、checkAbort 等；写入 saveGameState.busy；返回路径包含 committed；等待异步结果。 */ export async function commitSaveSlotAsync(slot = saveGameState.slot, options: { signal?: AbortSignal; onProgress?: (value: SaveProgress) => void } = {}): Promise<boolean> {
  saveGameState.busy = true
  try { report(options.onProgress, 'serializing', .1, 'Serializing structured save data'); await asyncCheckpoint(options.signal); report(options.onProgress, 'validating', .3, 'Validating schema and custom serializers'); migrateSaveData(serializeCustomValues(saveGameState.values), productionSettings.data.saveSchemaVersion); await asyncCheckpoint(options.signal); report(options.onProgress, 'writing', .55, 'Writing temporary transaction and checksum'); await asyncCheckpoint(options.signal); checkAbort(options.signal); const committed = commitSaveSlot(slot); report(options.onProgress, 'committing', .9, 'Verifying committed slot and backup'); await Promise.resolve(); report(options.onProgress, 'complete', 1, committed ? 'Save committed atomically' : 'Save failed'); return committed } finally { saveGameState.busy = false }
}

/** 结构说明（自动提取）：listSaveSlots；输入 projectId；直接调用 safeName、localStorage.key、key.startsWith、test、localStorage.getItem 等；包含循环处理。 */ export function listSaveSlots(projectId = saveGameState.projectId || safeName(projectSessionState.id, 'project')): SaveSlotMetadata[] {
  if (typeof localStorage === 'undefined') return []
  const prefix = `${SAVE_PREFIX}:${safeName(projectId, 'project')}:`, results: SaveSlotMetadata[] = []
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index)
    if (!key?.startsWith(prefix) || /\.(tmp|backup|journal)$/.test(key)) continue
    const source = localStorage.getItem(key) ?? '', slot = key.slice(prefix.length)
    try { const envelope = parseEnvelope(source); results.push({ slot, projectId, schemaVersion: envelope.version, savedAt: envelope.savedAt, bytes: source.length * 2, checksum: envelope.checksum, valid: true, backupAvailable: localStorage.getItem(`${key}.backup`) !== null, location: platformSaveLocation(projectId) }) }
    catch { results.push({ slot, projectId, schemaVersion: 0, savedAt: '', bytes: source.length * 2, checksum: '', valid: false, backupAvailable: localStorage.getItem(`${key}.backup`) !== null, location: platformSaveLocation(projectId) }) }
  }
  return results.sort(/* 先计算 second.savedAt.localeCompare(first.savedAt)；仅当其为假值时求右侧 first.slot.localeCompare(second.slot)，返回短路求值结果。 */ (first, second) => second.savedAt.localeCompare(first.savedAt) || first.slot.localeCompare(second.slot))
}

/** 结构说明（自动提取）：removeSaveSlot；输入 slot；直接调用 useSaveProject、storageKey、safeName、localStorage.removeItem、legacyStorageKey 等；包含循环处理。 */ export function removeSaveSlot(slot = saveGameState.slot): void {
  useSaveProject(); if (typeof localStorage === 'undefined') return
  const key = storageKey(saveGameState.projectId, safeName(slot, 'slot1'))
  for (const suffix of ['', '.tmp', '.journal', '.backup']) localStorage.removeItem(`${key}${suffix}`)
  localStorage.removeItem(legacyStorageKey(saveGameState.projectId, safeName(slot, 'slot1'))); recoveryCandidates.delete(key)
  if (safeName(slot, 'slot1') === saveGameState.slot) clearSaveValues()
}
