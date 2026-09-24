/** 项目外部变更：比较磁盘或外部来源与当前项目，组织重新加载及冲突处理。 */
import { reactive } from 'vue'
import { canonicalProjectText, semanticProjectDiff, validateProjectDocument, type SemanticProjectChange } from '../projects/projectData'
import { getSceneJSON, loadProject, clearEditorHistory } from '../store/physics'
import { markSourceBaseline, setIncomingProject } from './teamWorkflow'
import { markProjectDirty, markTransactionBaseline, projectChecksum, projectTransactionState } from './projectTransactions'

interface WatchFile { name: string; size: number; lastModified: number; text(): Promise<string> }
interface WatchHandle { getFile(): Promise<WatchFile> }
const POLL_MS = 2_000
let timer: number | null = null, handle: WatchHandle | null = null, knownStamp = '', watchGeneration = 0

export const externalChangeState = reactive({
  visible: false, fileName: '', incomingSource: '', incomingChecksum: '', detectedAt: '', kind: 'external' as 'external' | 'branch-switch' | 'large-update',
  conflicts: [] as SemanticProjectChange[], changes: [] as SemanticProjectChange[], error: '', selfChangeChecksum: '', watching: false, keepEditorAcknowledged: false
})

/** 将 /^[0-9a-f]{16}$/i.test(sourceOrChecksum) ? sourceOrChecksum : projectChecksum(canonicalProjectText(sourceOrChecksum)) 赋给 externalChangeState.selfChangeChecksum，不显式返回值。 */ export function suppressSelfProjectChange(sourceOrChecksum: string): void {
  externalChangeState.selfChangeChecksum = /^[0-9a-f]{16}$/i.test(sourceOrChecksum) ? sourceOrChecksum : projectChecksum(canonicalProjectText(sourceOrChecksum))
}

/** 验证并规范化磁盘版本，忽略自身保存摘要，计算基线变化和当前冲突后展示外部变更。 */ export function signalExternalProjectChange(source: string, fileName = 'project.nova', reason: 'external' | 'branch-switch' = 'external'): boolean {
  let incoming: string
  try { incoming = canonicalProjectText(source); if (!validateProjectDocument(incoming).valid) throw new Error('The external project failed schema validation.') } catch (error) { externalChangeState.error = error instanceof Error ? error.message : String(error); return false }
  const checksum = projectChecksum(incoming)
  if (checksum === externalChangeState.selfChangeChecksum || checksum === projectTransactionState.lastManualChecksum) { externalChangeState.selfChangeChecksum = ''; return false }
  const current = getSceneJSON(), changes = semanticProjectDiff(projectTransactionState.manualBaseline || current, incoming), conflicts = semanticProjectDiff(current, incoming)
  externalChangeState.fileName = fileName.slice(0, 180); externalChangeState.incomingSource = incoming; externalChangeState.incomingChecksum = checksum; externalChangeState.detectedAt = new Date().toISOString()
  externalChangeState.kind = changes.length > 100 ? 'large-update' : reason; externalChangeState.changes.splice(0, externalChangeState.changes.length, ...changes); externalChangeState.conflicts.splice(0, externalChangeState.conflicts.length, ...conflicts)
  externalChangeState.visible = true; externalChangeState.keepEditorAcknowledged = false; setIncomingProject(current, incoming, fileName); return true
}

/** 按观察代次和句柄检查文件时间尺寸，读取变化并报告；无效或半写文件保留旧标记以便重试。 */ async function poll(generation: number, sourceHandle: WatchHandle): Promise<void> {
  const current = /* 先计算 generation === watchGeneration；仅当其为真值时求右侧 handle === sourceHandle，返回短路求值结果。 */ () => generation === watchGeneration && handle === sourceHandle
  if (!current()) return
  try {
    const file = await sourceHandle.getFile()
    if (!current()) return
    const stamp = file.lastModified + ':' + file.size
    if (knownStamp && stamp !== knownStamp) {
      const source = await file.text()
      if (!current()) return
      externalChangeState.error = ''
      signalExternalProjectChange(source, file.name)
      // Retry invalid or partially written files; keep the diagnostic visible.
      if (!externalChangeState.error) knownStamp = stamp
    } else { knownStamp = stamp; externalChangeState.error = '' }
  } catch (error) { if (current()) externalChangeState.error = error instanceof Error ? error.message : String(error) }
  if (current()) timer = window.setTimeout(/** 在当前观察代次下异步执行下一轮文件检查。 */ () => { void poll(generation, sourceHandle) }, POLL_MS)
}

/** 替换当前文件观察器，异步取得初始时间尺寸后启动轮询；失效代次不再写状态。 */ export async function watchProjectFile(sourceHandle: WatchHandle): Promise<void> {
  stopProjectFileWatcher(); handle = sourceHandle
  const generation = watchGeneration
  try {
    const file = await sourceHandle.getFile()
    if (generation !== watchGeneration || handle !== sourceHandle) return
    knownStamp = file.lastModified + ':' + file.size; externalChangeState.watching = true; externalChangeState.error = ''
    timer = window.setTimeout(/** 在初始文件读取完成后开始对应代次的异步轮询。 */ () => { void poll(generation, sourceHandle) }, POLL_MS)
  } catch (error) {
    if (generation !== watchGeneration || handle !== sourceHandle) return
    stopProjectFileWatcher(); externalChangeState.error = error instanceof Error ? error.message : String(error)
    throw error
  }
}

/** 递增观察代次、清理轮询计时与句柄，并清空观察状态。 */ export function stopProjectFileWatcher(): void { watchGeneration++; if (timer !== null) window.clearTimeout(timer); timer = null; handle = null; knownStamp = ''; externalChangeState.watching = false }

/* 返回按声明顺序构造的数组 [...externalChangeState.conflicts]。 */ export function compareExternalProject(): SemanticProjectChange[] { return [...externalChangeState.conflicts] }

/** 关闭外部变更提示并确认保留编辑器版本，将项目标为未保存。 */ export function keepEditorProjectVersion(): void { externalChangeState.visible = false; externalChangeState.keepEditorAcknowledged = true; markProjectDirty('project') }

/** 加载传入磁盘文本，成功后重置历史和事务基线并清除外部更新提示。 */ export function keepDiskProjectVersion(): boolean {
  const source = externalChangeState.incomingSource
  if (!source || !loadProject(source)) return false
  clearEditorHistory('external-project-reload', source); markSourceBaseline(source); markTransactionBaseline(source); externalChangeState.visible = false; externalChangeState.incomingSource = ''; return true
}

/* 调用 keepDiskProjectVersion() 并返回调用结果。 */ export function reloadExternalProject(): boolean { return keepDiskProjectVersion() }

/** 导出观察状态、变更摘要、冲突和错误的诊断文本。 */ export function externalChangeDiagnostics(): string { return JSON.stringify({ generatedAt:new Date().toISOString(), watching:externalChangeState.watching, detectedAt:externalChangeState.detectedAt, kind:externalChangeState.kind, incomingChecksum:externalChangeState.incomingChecksum, changes:externalChangeState.changes, conflicts:externalChangeState.conflicts, error:externalChangeState.error },null,2) }
