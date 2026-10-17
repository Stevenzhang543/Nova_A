/** 编辑会话恢复：保存和读取恢复数据，验证可恢复内容并协调恢复操作。 */
import { reactive } from 'vue'
import { projectSessionState } from '../projects/projectSession'
import { canonicalProjectText, semanticProjectDiff, validateProjectDocument, type SemanticProjectChange } from '../projects/projectData'
import { interruptedProjectSource, projectChecksum, projectTransactionState, recoverInterruptedProjectTransactions } from './projectTransactions'

export type SnapshotReason = 'autosave' | 'manual-checkpoint' | 'crash'
export interface RecoverySnapshot { id: string; projectId: string; projectName: string; timestamp: string; reason: SnapshotReason; checksum: string; source: string; verified: boolean; manualChecksum: string }
export interface RecoveryPreview { snapshotId: string; valid: boolean; sourceChecksum: string; manualChecksum: string; semanticChanges: SemanticProjectChange[]; conflict: boolean; message: string }

const SNAPSHOT_KEY = 'nova-a-recovery-snapshots-v1'
const SESSION_KEY = 'nova-a-recovery-session-v1'
const MANUAL_SAVE_KEY = 'nova-a-last-manual-save-v1'
const MAX_SNAPSHOTS = 12
const MAX_TOTAL_BYTES = 12_000_000
let initialized = false

export const recoveryState = reactive({ visible: false, previousSessionCrashed: false, safeMode: false, readOnly: false, invalidSnapshots: 0, selectedId: '', snapshots: [] as RecoverySnapshot[], lastManualSave: '', preview: null as RecoveryPreview | null })

/** 遍历 UTF-16 码元生成双路快速摘要，用于恢复快照完整性比较。 */ function checksum(source: string): string {
  let first = 0x811c9dc5, second = 0x9e3779b9
  for (let index = 0; index < source.length; index++) { const code = source.charCodeAt(index); first = Math.imul(first ^ code, 0x01000193) >>> 0; second = Math.imul(second ^ (code + index), 0x85ebca6b) >>> 0 }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`
}

/** 验证快照必要字段、原因、摘要及项目模式，返回限制名称长度的规范化快照。 */ function validSnapshot(value: unknown): RecoverySnapshot | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<RecoverySnapshot>
  if (typeof item.id !== 'string' || typeof item.projectId !== 'string' || typeof item.projectName !== 'string' || typeof item.timestamp !== 'string' || typeof item.source !== 'string' || typeof item.checksum !== 'string') return null
  if (item.reason !== 'autosave' && item.reason !== 'manual-checkpoint' && item.reason !== 'crash') return null
  if (checksum(item.source) !== item.checksum) return null
  try { const parsed = JSON.parse(item.source); if (!parsed || typeof parsed !== 'object') return null } catch { return null }
  const validation = validateProjectDocument(item.source)
  if (!validation.valid) return null
  return { id: item.id.slice(0, 100), projectId: item.projectId.slice(0, 128), projectName: item.projectName.slice(0, 80), timestamp: item.timestamp, reason: item.reason, checksum: item.checksum, source: canonicalProjectText(item.source), verified: true, manualChecksum: typeof item.manualChecksum === 'string' ? item.manualChecksum : '' }
}

/** 读取并逐项验证本地快照，统计损坏记录，按时间倒序保留数量上限。 */ function readSnapshots(): RecoverySnapshot[] {
  recoveryState.invalidSnapshots = 0
  try {
    const values = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) ?? '[]') as unknown
    if (!Array.isArray(values)) return []
    const result: RecoverySnapshot[] = []
    for (const value of values) { const valid = validSnapshot(value); if (valid) result.push(valid); else recoveryState.invalidSnapshots++ }
    return result.sort(/* 调用 b.timestamp.localeCompare(a.timestamp) 并返回调用结果。 */ (a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, MAX_SNAPSHOTS)
  } catch { recoveryState.invalidSnapshots++; return [] }
}

/** 限制快照数量，并在超过文本预算时逐项移除最旧记录，再写入本地存储。 */ function persistSnapshots(values: RecoverySnapshot[]): void {
  const bounded = values.slice(0, MAX_SNAPSHOTS)
  while (bounded.length > 1 && JSON.stringify(bounded).length > MAX_TOTAL_BYTES) bounded.pop()
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(bounded))
}

/** 读取恢复模式与异常退出标记，收集中断事务和有效快照，标记新会话活跃并安装退出清理监听。 */ export function initializeRecoverySession(): void {
  if (initialized || typeof localStorage === 'undefined') return
  initialized = true
  const params = new URLSearchParams(location.search)
  recoveryState.safeMode = params.get('safe-mode') === '1'; recoveryState.readOnly = params.get('read-only') === '1'
  recoveryState.previousSessionCrashed = localStorage.getItem(SESSION_KEY) === 'active'; recoveryState.lastManualSave = localStorage.getItem(MANUAL_SAVE_KEY) ?? ''
  const interrupted = recoverInterruptedProjectTransactions()
  recoveryState.snapshots.splice(0, recoveryState.snapshots.length, ...readSnapshots()); recoveryState.selectedId = recoveryState.snapshots[0]?.id ?? ''
  const temporary = interruptedProjectSource()
  if (interrupted.length && temporary && !recoveryState.snapshots.some(/* 比较 item.checksum 与 checksum(temporary)，返回严格相等的判断结果。 */ item => item.checksum === checksum(temporary))) storeRecoverySnapshot(temporary, 'crash')
  recoveryState.visible = (recoveryState.previousSessionCrashed || interrupted.length > 0) && recoveryState.snapshots.length > 0
  localStorage.setItem(SESSION_KEY, 'active')
  for (const key of Object.keys(localStorage)) if (key.startsWith('nova-a-tmp-')) localStorage.removeItem(key)
  window.addEventListener('beforeunload', markRecoverySessionClean)
}

/** 尽力将本次会话标记为正常结束。 */ export function markRecoverySessionClean(): void { try { localStorage.setItem(SESSION_KEY, 'clean') } catch { /* best effort */ } }
/** 尽力将本次会话标记为未正常结束以触发后续恢复提示。 */ export function markRecoverySessionCrashed(): void { try { localStorage.setItem(SESSION_KEY, 'active') } catch { /* best effort */ } }

/** 仅为可写且有效的项目生成规范化快照，按项目和摘要去重，持久化成功后更新选择。 */ export function storeRecoverySnapshot(source: string, reason: SnapshotReason = 'autosave'): RecoverySnapshot | null {
  if (typeof localStorage === 'undefined' || recoveryState.readOnly) return null
  let canonical: string
  try { canonical = canonicalProjectText(source); if (!validateProjectDocument(canonical).valid) return null } catch { return null }
  const item: RecoverySnapshot = { id: crypto.randomUUID?.() ?? `${Date.now()}-${checksum(canonical)}`, projectId: projectSessionState.id, projectName: projectSessionState.name, timestamp: new Date().toISOString(), reason, checksum: checksum(canonical), source: canonical, verified: true, manualChecksum: projectTransactionState.lastManualChecksum }
  try {
    const existing = readSnapshots().filter(/* 先计算 candidate.checksum !== item.checksum；仅当其为假值时求右侧 candidate.projectId !== item.projectId，返回短路求值结果。 */ candidate => candidate.checksum !== item.checksum || candidate.projectId !== item.projectId)
    persistSnapshots([item, ...existing]); recoveryState.snapshots.splice(0, recoveryState.snapshots.length, item, ...existing.slice(0, MAX_SNAPSHOTS - 1)); recoveryState.selectedId = item.id; return item
  } catch { return null }
}

/** 更新最近手动保存时间，并尽力保存到本地。 */ export function recordManualSave(): void { const timestamp = new Date().toISOString(); recoveryState.lastManualSave = timestamp; try { localStorage.setItem(MANUAL_SAVE_KEY, timestamp) } catch { /* best effort */ } }
/** 按快照身份取得源码，未找到返回 null。 */ export function selectedRecoverySource(id = recoveryState.selectedId): string | null { return recoveryState.snapshots.find(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id)?.source ?? null }
/** 验证选择快照并比较手动基线，计算语义差异和冲突标记供恢复前审阅。 */ export function previewRecoverySnapshot(id = recoveryState.selectedId, manualSource = ''): RecoveryPreview | null {
  const snapshot = recoveryState.snapshots.find(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id)
  if (!snapshot) { recoveryState.preview = null; return null }
  const valid = validateProjectDocument(snapshot.source).valid
  let changes: SemanticProjectChange[] = []
  try { if (manualSource) changes = semanticProjectDiff(manualSource, snapshot.source) } catch { /* The validity flag carries the actionable failure. */ }
  const preview: RecoveryPreview = { snapshotId: snapshot.id, valid, sourceChecksum: snapshot.checksum, manualChecksum: manualSource ? projectChecksum(canonicalProjectText(manualSource)) : snapshot.manualChecksum, semanticChanges: changes, conflict: Boolean(manualSource && projectChecksum(canonicalProjectText(manualSource)) !== snapshot.manualChecksum && changes.length), message: valid ? changes.length ? `${changes.length} authored resource change(s) require review.` : 'The checkpoint is valid and has no scene/prefab/resource changes.' : 'The checkpoint failed schema validation.' }
  recoveryState.preview = preview; return preview
}

/** 为恢复快照分配新项目身份和副本名称，同步清单后返回规范化文本。 */ export function recoveryCopySource(id = recoveryState.selectedId): string | null {
  const source = selectedRecoverySource(id)
  if (!source) return null
  try {
    const project = JSON.parse(source) as Record<string, unknown>, metadata = project.projectMetadata && typeof project.projectMetadata === 'object' ? project.projectMetadata as Record<string, unknown> : {}
    const newId = crypto.randomUUID(); metadata.id = newId; metadata.name = `${String(metadata.name ?? projectSessionState.name)} (Recovered Copy)`.slice(0, 80); metadata.updatedAt = new Date().toISOString(); project.projectMetadata = metadata
    if (project.manifest && typeof project.manifest === 'object') { (project.manifest as Record<string, unknown>).projectUuid = newId; (project.manifest as Record<string, unknown>).name = metadata.name }
    return canonicalProjectText(project)
  } catch { return null }
}
/** 将 false 赋给 recoveryState.visible，不显式返回值。 */ export function dismissRecovery(): void { recoveryState.visible = false }
/** 移除指定恢复快照、更新选择并清除预览，尽力持久化剩余记录。 */ export function discardRecoverySnapshot(id: string): void { const next = recoveryState.snapshots.filter(/* 比较 item.id 与 id，返回严格不等的判断结果。 */ item => item.id !== id); recoveryState.snapshots.splice(0, recoveryState.snapshots.length, ...next); recoveryState.selectedId = next[0]?.id ?? ''; recoveryState.preview = null; try { persistSnapshots(next) } catch { /* best effort */ } }

/** 安全模式下延迟加载包状态并禁用非指定已验证发布者的包。 */ export async function applySafeModeRestrictions(): Promise<void> {
  if (!recoveryState.safeMode) return
  const { packageState } = await import('./packages')
  for (const item of packageState.installed) if (!item.manifest.publisherVerified || item.manifest.publisher !== 'Whitelist') item.enabled = false
}

/** 导出恢复状态和不含源码的快照元信息及文本长度统计。 */ export function recoveryDiagnostics(): string { return JSON.stringify({ generatedAt: new Date().toISOString(), previousSessionCrashed: recoveryState.previousSessionCrashed, safeMode: recoveryState.safeMode, readOnly: recoveryState.readOnly, invalidSnapshots: recoveryState.invalidSnapshots, lastManualSave: recoveryState.lastManualSave, snapshots: recoveryState.snapshots.map(/** 构造并返回记录 { ...item, bytes: source.length }，字段按当前实参及捕获状态求值。 */ ({ source, ...item }) => ({ ...item, bytes: source.length })) }, null, 2) }
