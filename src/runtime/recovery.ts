import { reactive } from 'vue'
import { projectSessionState } from '../projects/projectSession'

export type SnapshotReason = 'autosave' | 'manual-checkpoint' | 'crash'
export interface RecoverySnapshot { id: string; projectId: string; projectName: string; timestamp: string; reason: SnapshotReason; checksum: string; source: string }

const SNAPSHOT_KEY = 'nova-a-recovery-snapshots-v1'
const SESSION_KEY = 'nova-a-recovery-session-v1'
const MANUAL_SAVE_KEY = 'nova-a-last-manual-save-v1'
const MAX_SNAPSHOTS = 12
const MAX_TOTAL_BYTES = 12_000_000
let initialized = false

export const recoveryState = reactive({ visible: false, previousSessionCrashed: false, safeMode: false, readOnly: false, invalidSnapshots: 0, selectedId: '', snapshots: [] as RecoverySnapshot[], lastManualSave: '' })

function checksum(source: string): string {
  let first = 0x811c9dc5, second = 0x9e3779b9
  for (let index = 0; index < source.length; index++) { const code = source.charCodeAt(index); first = Math.imul(first ^ code, 0x01000193) >>> 0; second = Math.imul(second ^ (code + index), 0x85ebca6b) >>> 0 }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`
}

function validSnapshot(value: unknown): RecoverySnapshot | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<RecoverySnapshot>
  if (typeof item.id !== 'string' || typeof item.projectId !== 'string' || typeof item.projectName !== 'string' || typeof item.timestamp !== 'string' || typeof item.source !== 'string' || typeof item.checksum !== 'string') return null
  if (item.reason !== 'autosave' && item.reason !== 'manual-checkpoint' && item.reason !== 'crash') return null
  if (checksum(item.source) !== item.checksum) return null
  try { const parsed = JSON.parse(item.source); if (!parsed || typeof parsed !== 'object') return null } catch { return null }
  return { id: item.id.slice(0, 100), projectId: item.projectId.slice(0, 128), projectName: item.projectName.slice(0, 80), timestamp: item.timestamp, reason: item.reason, checksum: item.checksum, source: item.source }
}

function readSnapshots(): RecoverySnapshot[] {
  recoveryState.invalidSnapshots = 0
  try {
    const values = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) ?? '[]') as unknown
    if (!Array.isArray(values)) return []
    const result: RecoverySnapshot[] = []
    for (const value of values) { const valid = validSnapshot(value); if (valid) result.push(valid); else recoveryState.invalidSnapshots++ }
    return result.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, MAX_SNAPSHOTS)
  } catch { recoveryState.invalidSnapshots++; return [] }
}

function persistSnapshots(values: RecoverySnapshot[]): void {
  const bounded = values.slice(0, MAX_SNAPSHOTS)
  while (bounded.length > 1 && JSON.stringify(bounded).length > MAX_TOTAL_BYTES) bounded.pop()
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(bounded))
}

export function initializeRecoverySession(): void {
  if (initialized || typeof localStorage === 'undefined') return
  initialized = true
  const params = new URLSearchParams(location.search)
  recoveryState.safeMode = params.get('safe-mode') === '1'; recoveryState.readOnly = params.get('read-only') === '1'
  recoveryState.previousSessionCrashed = localStorage.getItem(SESSION_KEY) === 'active'; recoveryState.lastManualSave = localStorage.getItem(MANUAL_SAVE_KEY) ?? ''
  recoveryState.snapshots.splice(0, recoveryState.snapshots.length, ...readSnapshots()); recoveryState.selectedId = recoveryState.snapshots[0]?.id ?? ''
  recoveryState.visible = recoveryState.previousSessionCrashed && recoveryState.snapshots.length > 0
  localStorage.setItem(SESSION_KEY, 'active')
  for (const key of Object.keys(localStorage)) if (key.startsWith('nova-a-tmp-')) localStorage.removeItem(key)
  window.addEventListener('beforeunload', markRecoverySessionClean)
}

export function markRecoverySessionClean(): void { try { localStorage.setItem(SESSION_KEY, 'clean') } catch { /* best effort */ } }
export function markRecoverySessionCrashed(): void { try { localStorage.setItem(SESSION_KEY, 'active') } catch { /* best effort */ } }

export function storeRecoverySnapshot(source: string, reason: SnapshotReason = 'autosave'): RecoverySnapshot | null {
  if (typeof localStorage === 'undefined' || recoveryState.readOnly) return null
  const item: RecoverySnapshot = { id: crypto.randomUUID?.() ?? `${Date.now()}-${checksum(source)}`, projectId: projectSessionState.id, projectName: projectSessionState.name, timestamp: new Date().toISOString(), reason, checksum: checksum(source), source }
  try {
    const existing = readSnapshots().filter(candidate => candidate.checksum !== item.checksum || candidate.projectId !== item.projectId)
    persistSnapshots([item, ...existing]); recoveryState.snapshots.splice(0, recoveryState.snapshots.length, item, ...existing.slice(0, MAX_SNAPSHOTS - 1)); recoveryState.selectedId = item.id; return item
  } catch { return null }
}

export function recordManualSave(): void { const timestamp = new Date().toISOString(); recoveryState.lastManualSave = timestamp; try { localStorage.setItem(MANUAL_SAVE_KEY, timestamp) } catch { /* best effort */ } }
export function selectedRecoverySource(id = recoveryState.selectedId): string | null { return recoveryState.snapshots.find(item => item.id === id)?.source ?? null }
export function dismissRecovery(): void { recoveryState.visible = false }
export function discardRecoverySnapshot(id: string): void { const next = recoveryState.snapshots.filter(item => item.id !== id); recoveryState.snapshots.splice(0, recoveryState.snapshots.length, ...next); recoveryState.selectedId = next[0]?.id ?? ''; try { persistSnapshots(next) } catch { /* best effort */ } }

export async function applySafeModeRestrictions(): Promise<void> {
  if (!recoveryState.safeMode) return
  const { packageState } = await import('./packages')
  for (const item of packageState.installed) if (!item.manifest.publisherVerified || item.manifest.publisher !== 'Whitelist') item.enabled = false
}

export function recoveryDiagnostics(): string { return JSON.stringify({ generatedAt: new Date().toISOString(), previousSessionCrashed: recoveryState.previousSessionCrashed, safeMode: recoveryState.safeMode, readOnly: recoveryState.readOnly, invalidSnapshots: recoveryState.invalidSnapshots, lastManualSave: recoveryState.lastManualSave, snapshots: recoveryState.snapshots.map(({ source, ...item }) => ({ ...item, bytes: source.length })) }, null, 2) }
