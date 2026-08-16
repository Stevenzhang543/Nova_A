import { reactive } from 'vue'
import { projectSessionState } from '../projects/projectSession'
import { productionSettings } from './production'

export type SaveScalar = boolean | number | string | null
export type SaveValue = SaveScalar | SaveValue[] | { [key: string]: SaveValue }

const SAVE_PREFIX = 'nova_a.game_save.v1'
const MAX_SAVE_BYTES = 1_000_000
const MAX_DEPTH = 8
const MAX_COLLECTION_SIZE = 2_000

export const saveGameState = reactive({
  projectId: '',
  slot: 'slot1',
  values: {} as Record<string, SaveValue>,
  dirty: false,
  lastCommittedAt: null as string | null,
  error: ''
})

function safeName(value: string, fallback: string): string {
  const safe = value.trim().replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 80)
  return safe || fallback
}

function storageKey(projectId: string, slot: string): string {
  return `${SAVE_PREFIX}:${safeName(projectId, 'project')}:${safeName(slot, 'slot1')}`
}

interface SaveEnvelope {
  format: 'nova-save'
  version: number
  values: Record<string, SaveValue>
}

function saveEnvelope(value: unknown): { version: number; values: unknown } {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const source = value as Record<string, unknown>
    if (source.format === 'nova-save' && Number.isInteger(source.version) && source.values && typeof source.values === 'object' && !Array.isArray(source.values)) {
      return { version: Math.max(1, Math.min(65_535, Number(source.version))), values: source.values }
    }
  }
  return { version: 1, values: value }
}

/** Applies the project's ordered, bounded top-level save-data migrations. */
export function migrateSaveData(value: unknown, storedVersion = 1): SaveEnvelope {
  const normalized = normalizeSaveValue(value)
  if (!normalized || Array.isArray(normalized) || typeof normalized !== 'object') throw new Error('The save slot root must be a map.')
  const values = { ...(normalized as Record<string, SaveValue>) }
  const targetVersion = productionSettings.data.saveSchemaVersion
  let version = Math.max(1, Math.min(65_535, Math.round(storedVersion)))
  if (version > targetVersion) throw new Error(`Save data schema ${version} is newer than supported schema ${targetVersion}.`)
  while (version < targetVersion) {
    const migration = productionSettings.data.saveMigrations.find(item => item.fromVersion === version)
    if (!migration) throw new Error(`Save data requires a migration from schema ${version} to ${targetVersion}.`)
    for (const [from, to] of Object.entries(migration.renames)) {
      if (Object.prototype.hasOwnProperty.call(values, from) && !Object.prototype.hasOwnProperty.call(values, to)) values[to] = values[from]
      delete values[from]
    }
    for (const [key, fallback] of Object.entries(migration.defaults)) if (!Object.prototype.hasOwnProperty.call(values, key)) values[key] = normalizeSaveValue(fallback)
    for (const key of migration.remove) delete values[key]
    version = migration.toVersion
  }
  return { format: 'nova-save', version, values }
}

export function normalizeSaveValue(value: unknown, depth = 0): SaveValue {
  if (depth > MAX_DEPTH) throw new Error(`Save data exceeds the maximum depth of ${MAX_DEPTH}.`)
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return typeof value === 'string' ? value.slice(0, 100_000) : value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Save data numbers must be finite.')
    return value
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_COLLECTION_SIZE) throw new Error(`Save arrays may contain at most ${MAX_COLLECTION_SIZE} items.`)
    return value.map(item => normalizeSaveValue(item, depth + 1))
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length > MAX_COLLECTION_SIZE) throw new Error(`Save maps may contain at most ${MAX_COLLECTION_SIZE} keys.`)
    return Object.fromEntries(entries.map(([key, item]) => [safeName(key, 'key'), normalizeSaveValue(item, depth + 1)]))
  }
  throw new Error('Save data only supports booleans, finite numbers, strings, null, arrays, and maps.')
}

export function useSaveProject(projectId = projectSessionState.id, slot = 'slot1'): void {
  const safeProject = safeName(projectId, 'project')
  const safeSlot = safeName(slot, 'slot1')
  if (saveGameState.projectId === safeProject && saveGameState.slot === safeSlot) return
  saveGameState.projectId = safeProject
  loadSaveSlot(safeSlot)
}

export function loadSaveSlot(slot: string): boolean {
  const safeSlot = safeName(slot, 'slot1')
  const projectId = saveGameState.projectId || safeName(projectSessionState.id, 'project')
  saveGameState.projectId = projectId
  saveGameState.slot = safeSlot
  saveGameState.error = ''
  try {
    const source = typeof localStorage === 'undefined' ? null : localStorage.getItem(storageKey(projectId, safeSlot))
    const parsed = source ? JSON.parse(source) : {}
    const envelope = source ? saveEnvelope(parsed) : { version: productionSettings.data.saveSchemaVersion, values: {} }
    saveGameState.values = migrateSaveData(envelope.values, envelope.version).values
    saveGameState.dirty = false
    return source !== null
  } catch (error) {
    saveGameState.values = {}
    saveGameState.dirty = false
    saveGameState.error = error instanceof Error ? error.message : String(error)
    return false
  }
}

export function saveSnapshot(): Record<string, SaveValue> {
  useSaveProject()
  return normalizeSaveValue(saveGameState.values) as Record<string, SaveValue>
}

export function setSaveValue(key: string, value: unknown): void {
  useSaveProject()
  saveGameState.values[safeName(key, 'key')] = normalizeSaveValue(value)
  saveGameState.dirty = true
}

export function deleteSaveValue(key: string): void {
  useSaveProject()
  delete saveGameState.values[safeName(key, 'key')]
  saveGameState.dirty = true
}

export function clearSaveValues(): void {
  useSaveProject()
  saveGameState.values = {}
  saveGameState.dirty = true
}

export function commitSaveSlot(slot = saveGameState.slot): boolean {
  useSaveProject(projectSessionState.id, saveGameState.slot)
  saveGameState.slot = safeName(slot, 'slot1')
  saveGameState.error = ''
  try {
    const source = JSON.stringify(migrateSaveData(saveGameState.values, productionSettings.data.saveSchemaVersion))
    if (new Blob([source]).size > MAX_SAVE_BYTES) throw new Error(`Save data exceeds the ${MAX_SAVE_BYTES} byte limit.`)
    if (typeof localStorage === 'undefined') throw new Error('Persistent storage is unavailable in this runtime.')
    localStorage.setItem(storageKey(saveGameState.projectId, saveGameState.slot), source)
    saveGameState.dirty = false
    saveGameState.lastCommittedAt = new Date().toISOString()
    return true
  } catch (error) {
    saveGameState.error = error instanceof Error ? error.message : String(error)
    return false
  }
}

export function removeSaveSlot(slot = saveGameState.slot): void {
  useSaveProject()
  if (typeof localStorage !== 'undefined') localStorage.removeItem(storageKey(saveGameState.projectId, safeName(slot, 'slot1')))
  if (safeName(slot, 'slot1') === saveGameState.slot) clearSaveValues()
}
