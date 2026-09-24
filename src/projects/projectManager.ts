/** 项目会话流程：处理创建、打开、最近项目、升级及只读回退，保护当前编辑草稿。 */
import { reactive } from 'vue'
import { editorState } from '../store/editor'
import { beginProjectSession, newProjectMetadata, projectSessionState, safeProjectName } from './projectSession'
import { createTemplateProjectJson, type ProjectTemplateId } from './templates'
import { analyzeProjectUpgrade, downloadProjectBackup, dryRunProjectMigration, readUpgradeRollback, recordMigrationApplied, storeUpgradeRollback, type UpgradePreview } from '../runtime/projectUpgrade'
import { acquireProjectLock, inspectProjectLock, markSourceBaseline, releaseProjectLock } from '../runtime/teamWorkflow'
import { canonicalProjectText, MAX_PROJECT_DOCUMENT_CHARACTERS, validateProjectDocument, type ProjectValidationReport } from './projectData'
import { recoveryState } from '../runtime/recovery'
import { appendTaskLog, cancelTask, completeTask, failTask, startTask } from '../runtime/editorFeedback'
import { markProjectDirty, setProjectTransactionDirectory } from '../runtime/projectTransactions'
import { assetState, readTextAsset } from '../assets/AssetDatabase'
import { listPendingAuthoringDrafts, restoreAuthoringDrafts, snapshotAuthoringDrafts } from '../editor/studioDraftRetention'
import { createProjectDepartureGuard } from '../editor/projectDepartureGuard'
import { projectDepartureCopy } from '../editor/projectDepartureCopy'
import { requestConfirmation } from '../store/dialog'

const RECENT_KEY = 'nova_a.recent_projects.v2'
const MAX_RECENT_PROJECTS = 8
const MAX_SNAPSHOT_BYTES = 1_750_000
const physicsModule = /* 调用 import('../store/physics') 并返回调用结果。 */ () => import('../store/physics')
let replacementDeclined = false
const mayReplaceProject = createProjectDepartureGuard({
  context: /* 返回 projectSessionState.id 的当前值。 */ () => projectSessionState.id,
  pending: /* 调用 listPendingAuthoringDrafts(projectSessionState.id, assetState.records) 并返回调用结果。 */ () => listPendingAuthoringDrafts(projectSessionState.id, assetState.records),
  chooseDiscard: /** 展示本地化的未保存草稿列表，要求用户明确确认放弃后才允许项目离开。 */ drafts => { const copy = projectDepartureCopy(); return requestConfirmation({ title: copy.title, message: `${copy.message}\n\n${drafts.map(/* 返回 draft.name 的当前值。 */ draft => draft.name).join('\n')}`, confirmLabel: copy.discard, cancelLabel: copy.cancel, destructive: true }) },
  stale: /** 将 projectDepartureCopy().stale 赋给 projectManagerState.error，不显式返回值。 */ () => { projectManagerState.error = projectDepartureCopy().stale }
})
/** 项目加载失败后恢复原作者草稿，若部分资源无法恢复则抛出具体资源提示。 */ function restoreDraftsAfterFailedOpen(projectId: string, snapshots: ReturnType<typeof snapshotAuthoringDrafts>) {
  const rejected = restoreAuthoringDrafts(projectId, assetState.records, snapshots, /* 调用 readTextAsset(record.uuid) 并返回调用结果。 */ record => readTextAsset(record.uuid))
  if (rejected.length) throw new Error(`${projectDepartureCopy().restoreFailed} ${rejected.join(', ')}`)
}

export interface RecentProject {
  id: string
  name: string
  updatedAt: string
  template: string
  location: string
  snapshot: string | null
}

/** 从本地存储读取最近项目，校验元信息并限制条目和快照大小，失败时返回空列表。 */ function readRecents(): RecentProject[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap(/** 校验单个最近项目的身份、名称和时间，限制文本及快照容量并补齐模板来源。 */ value => {
      if (!value || typeof value !== 'object') return []
      const item = value as Partial<RecentProject>
      if (typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.updatedAt !== 'string') return []
      return [{ id: item.id.slice(0, 128), name: safeProjectName(item.name), updatedAt: item.updatedAt, template: typeof item.template === 'string' ? item.template.slice(0, 40) : 'imported', location: typeof item.location === 'string' ? item.location.slice(0, 500) : '', snapshot: typeof item.snapshot === 'string' && item.snapshot.length <= MAX_SNAPSHOT_BYTES ? item.snapshot : null }]
    }).slice(0, MAX_RECENT_PROJECTS)
  } catch { return [] }
}

/** 保存最近项目列表，存储失败不影响项目本身的保存能力。 */ function persistRecents(): void {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(projectManagerState.recents)) } catch { /* Recents are a convenience, never a project-storage dependency. */ }
}

export const projectManagerState = reactive({
  visible: true,
  busy: false,
  error: '',
  recents: readRecents() as RecentProject[],
  currentSnapshot: null as string | null,
  currentLocation: '',
  pendingUpgrade: null as null | { source: string; fileName: string; importAsCopy: boolean; projectDirectory: string; preview: UpgradePreview },
  readOnlyDocument: null as null | { source: string; fileName: string; preview: UpgradePreview },
  backupBeforeUpgrade: true,
  lastUpgradeValidation: null as ProjectValidationReport | null
  ,rollbackAvailable: readUpgradeRollback() !== null,
  lockConflict: null as null | { projectId:string; owner:string; expiresAt:number }
})

/** 等待物理就绪并通过离开守卫后加载模板，失败时恢复原项目草稿，成功则更新锁、基线、历史及最近项目。 */ export async function createNewProject(name: string, template: ProjectTemplateId, location = ''): Promise<boolean> {
  if (projectManagerState.busy) return false
  projectManagerState.busy = true
  projectManagerState.error = ''
  try {
    const { clearEditorHistory, getSceneJSON, loadProject, physicsState } = await physicsModule()
    await physicsState.world.wasmReady
    const source = createTemplateProjectJson(template, safeProjectName(name))
    if (!await mayReplaceProject()) return false
    const previousId = projectSessionState.id
    const previousSource = getSceneJSON(), previousDrafts = snapshotAuthoringDrafts(previousId, assetState.records, /* 调用 readTextAsset(record.uuid) 并返回调用结果。 */ record => readTextAsset(record.uuid))
    if (!loadProject(source)) {
      const message = editorState.statusText || 'The selected template did not pass project validation.'
      if (loadProject(previousSource)) restoreDraftsAfterFailedOpen(previousId, previousDrafts)
      throw new Error(message)
    }
    releaseProjectLock(previousId); recoveryState.readOnly = !acquireProjectLock(projectSessionState.id, 'Nova_A Editor')
    projectManagerState.currentSnapshot = getSceneJSON()
    projectManagerState.currentLocation = location.trim().slice(0, 500)
    setProjectTransactionDirectory(projectManagerState.currentLocation)
    markSourceBaseline(projectManagerState.currentSnapshot)
    clearEditorHistory('new-project', projectManagerState.currentSnapshot, false); markProjectDirty('project')
    await rememberCurrentProject()
    projectManagerState.visible = false
    return true
  } catch (error) {
    projectManagerState.error = error instanceof Error ? error.message : String(error)
    return false
  } finally { projectManagerState.busy = false }
}

/** 预检文档大小和升级兼容性，登记只读预览或待升级项目与锁冲突，暂不替换当前项目。 */ export async function openProjectDocument(source: string, fileName = 'project.nova', importAsCopy = false, projectDirectory = ''): Promise<boolean> {
  try {
    if (source.length > MAX_PROJECT_DOCUMENT_CHARACTERS) throw new Error('This project exceeds Nova_A\'s 192 MB safe document limit. Store large media as external project assets before opening it.')
    const preview = analyzeProjectUpgrade(source)
    if (!preview.supported && preview.sourceSchema > preview.targetSchema) {
      projectManagerState.readOnlyDocument = { source, fileName, preview }
      projectManagerState.visible = true
      projectManagerState.error = ''
      return false
    }
    if (!preview.supported) throw new Error(preview.warnings[0] || 'This project cannot be opened safely by this Nova_A version.')
    let sourceProjectId=''
    try { const parsed=JSON.parse(source) as Record<string,unknown>, metadata=parsed.projectMetadata as Record<string,unknown>|undefined; sourceProjectId=String(metadata?.id??'') } catch { /* analyzeProjectUpgrade already parsed safely. */ }
    const lock=sourceProjectId&&!importAsCopy?inspectProjectLock(sourceProjectId):{locked:false,owner:'',expiresAt:0}
    projectManagerState.lockConflict=lock.locked?{projectId:sourceProjectId,owner:lock.owner,expiresAt:lock.expiresAt}:null
    projectManagerState.pendingUpgrade = { source, fileName, importAsCopy, projectDirectory: projectDirectory.trim().slice(0, 500), preview }
    projectManagerState.visible = true
    projectManagerState.error = ''
    return false
  } catch (error) {
    projectManagerState.error = error instanceof Error ? error.message : String(error)
    return false
  }
}

/** 通过离开守卫后实际加载项目，失败时尝试恢复原内容与草稿，成功后更新身份、锁、目录及保存基线。 */ async function openProjectDocumentNow(source: string, fileName = 'project.nova', importAsCopy = false, forceReadOnly = false, projectDirectory = projectManagerState.currentLocation): Promise<boolean> {
  replacementDeclined = false
  projectManagerState.busy = true
  projectManagerState.error = ''
  try {
    const { clearEditorHistory, getSceneJSON, loadProject, physicsState } = await physicsModule()
    await physicsState.world.wasmReady
    if (!await mayReplaceProject()) { replacementDeclined = true; return false }
    let previousProject: string | null = null
    try { previousProject = getSceneJSON() } catch { previousProject = null }
    let existingMetadata = false
    try {
      const parsed = JSON.parse(source) as Record<string, unknown>
      existingMetadata = !!parsed?.projectMetadata
    } catch { /* The canonical loader reports the useful parse error. */ }
    const previousId = projectSessionState.id
    const previousDrafts = snapshotAuthoringDrafts(previousId, assetState.records, /* 调用 readTextAsset(record.uuid) 并返回调用结果。 */ record => readTextAsset(record.uuid))
    if (!loadProject(source)) {
      if (previousProject && loadProject(previousProject)) restoreDraftsAfterFailedOpen(previousId, previousDrafts)
      throw new Error('The project is invalid, unsupported, or newer than this Nova_A version. The previous project was restored.')
    }
    if (importAsCopy || !existingMetadata) {
      const baseName = fileName.replace(/\.(nova|json)$/i, '')
      beginProjectSession(newProjectMetadata(`${safeProjectName(baseName)}${importAsCopy ? ' (Imported)' : ''}`, 'imported'))
    }
    if (projectSessionState.id !== previousId) releaseProjectLock(previousId)
    recoveryState.readOnly = forceReadOnly || !acquireProjectLock(projectSessionState.id, 'Nova_A Editor')
    projectManagerState.currentLocation = projectDirectory
    setProjectTransactionDirectory(projectDirectory)
    projectManagerState.currentSnapshot = getSceneJSON()
    markSourceBaseline(projectManagerState.currentSnapshot)
    clearEditorHistory('project-open', projectManagerState.currentSnapshot)
    await rememberCurrentProject()
    projectManagerState.visible = false
    return true
  } catch (error) {
    projectManagerState.error = error instanceof Error ? error.message : String(error)
    return false
  } finally { projectManagerState.busy = false }
}

/** 将 null 赋给 projectManagerState.readOnlyDocument，不显式返回值。 */ export function closeReadOnlyDocument(): void { projectManagerState.readOnlyDocument = null }

/** 将不支持编辑的原始文档下载为 JSON，并在点击后释放临时对象 URL。 */ export function downloadReadOnlyDocument(): void {
  const document = projectManagerState.readOnlyDocument
  if (!document) return
  const url = URL.createObjectURL(new Blob([document.source], { type: 'application/json' }))
  const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = document.fileName; anchor.click()
  window.setTimeout(/* 调用 URL.revokeObjectURL(url) 并返回调用结果。 */ () => URL.revokeObjectURL(url), 0)
}

/** 对待打开项目执行迁移试运行和校验，按需备份，再处理锁和加载，完整记录任务成功、取消或失败。 */ export async function applyPendingProjectUpgrade(forceReadOnly = false): Promise<boolean> {
  if (projectManagerState.busy) return false
  const pending = projectManagerState.pendingUpgrade
  if (!pending) return false
  projectManagerState.busy = true
  projectManagerState.error = ''
  const task = startTask('Project migration', { detail: `Schema ${pending.preview.sourceSchema} → ${pending.preview.targetSchema}`, progress: .05, logs: ['Dry run started'], resources: [{ label: pending.preview.projectName, href: pending.fileName }] })
  try {
    const { physicsState } = await physicsModule()
    await physicsState.world.wasmReady
    const dryRun = dryRunProjectMigration(pending.source, /* 调用 physicsState.world.formatProjectJson(value) 并返回调用结果。 */ value => physicsState.world.formatProjectJson(value))
    for (const entry of dryRun.log) appendTaskLog(task, `${entry.status.toUpperCase()} · ${entry.message}`)
    if (!dryRun.valid) throw new Error(dryRun.log.find(/* 比较 item.status 与 'blocked'，返回严格相等的判断结果。 */ item => item.status === 'blocked')?.message || 'Migration dry run failed before mutation.')
    if (pending.preview.requiresMigration) {
      downloadProjectBackup(pending.source, pending.fileName.replace(/\.(nova|json)$/i, ''))
      storeUpgradeRollback(pending.source, pending.fileName)
      projectManagerState.rollbackAvailable = true
    }
    const migrated = dryRun.output
    const validation = validateProjectDocument(migrated)
    projectManagerState.lastUpgradeValidation = validation
    const blocking = validation.issues.filter(/* 比较 issue.severity 与 'error'，返回严格相等的判断结果。 */ issue => issue.severity === 'error')
    if (blocking.length) throw new Error(`Migration validation failed: ${blocking[0].path || '<project>'}: ${blocking[0].message}`)
    const canonical = canonicalProjectText(migrated)
    if (projectManagerState.lockConflict && !forceReadOnly) throw new Error(`Project is locked by ${projectManagerState.lockConflict.owner}. Open it read-only or close the other editor.`)
    const opened = await openProjectDocumentNow(canonical, pending.fileName, pending.importAsCopy, forceReadOnly, pending.projectDirectory)
    if (!opened && replacementDeclined) { cancelTask(task); return false }
    if (!opened) throw new Error(projectManagerState.error || 'Migrated project could not be opened.')
    projectManagerState.pendingUpgrade = null
    recordMigrationApplied(dryRun); projectManagerState.lockConflict=null; completeTask(task, `Migration ${dryRun.id} committed; rollback retained.`)
    return true
  } catch (error) {
    projectManagerState.error = error instanceof Error ? error.message : String(error)
    failTask(task, error)
    return false
  } finally { projectManagerState.busy = false }
}

/** 清空待升级项目及关联锁冲突状态。 */ export function cancelPendingProjectUpgrade(): void { projectManagerState.pendingUpgrade = null; projectManagerState.lockConflict = null }

/** 读取最近升级回退内容并下载原始备份，存在时标记回退可用。 */ export function downloadLastUpgradeRollback(): boolean {
  const rollback = readUpgradeRollback()
  if (!rollback) return false
  downloadProjectBackup(rollback.source, rollback.fileName.replace(/\.(nova|json)$/i, ''))
  projectManagerState.rollbackAvailable = true
  return true
}

/** 空闲时验证最近回退文档，合法则规范化后走正常项目加载流程。 */ export async function restoreLastUpgradeRollback(): Promise<boolean> {
  if (projectManagerState.busy) return false
  const rollback = readUpgradeRollback()
  if (!rollback) return false
  const validation = validateProjectDocument(rollback.source)
  if (!validation.valid) { projectManagerState.error = validation.issues.find(/* 比较 item.severity 与 'error'，返回严格相等的判断结果。 */ item => item.severity === 'error')?.message ?? 'Rollback is invalid.'; return false }
  return openProjectDocumentNow(canonicalProjectText(rollback.source), rollback.fileName, false)
}

/** 读取最近项目的本地快照并进入打开预检，快照缺失时提示选择原文件。 */ export async function openRecentProject(id: string): Promise<boolean> {
  const recent = projectManagerState.recents.find(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id)
  if (!recent?.snapshot) {
    projectManagerState.error = 'This recent project is too large for a local snapshot. Choose Open Project and select its .nova file.'
    return false
  }
  return openProjectDocument(recent.snapshot, `${recent.name}.nova`, false, recent.location)
}

/** 将当前项目加入最近列表，仅为有界文档保留快照，更新当前快照但不修改项目内保存时间。 */ export async function rememberCurrentProject(): Promise<void> {
  const { getSceneJSON } = await physicsModule()
  // Recent-list timestamps are bookkeeping; remembering must not dirty the saved document.
  const source = getSceneJSON()
  const snapshot = source.length <= MAX_SNAPSHOT_BYTES ? source : null
  const recent: RecentProject = {
    id: projectSessionState.id,
    name: projectSessionState.name,
    updatedAt: new Date().toISOString(),
    template: projectSessionState.template,
    location: projectManagerState.currentLocation,
    snapshot
  }
  projectManagerState.recents.splice(0, projectManagerState.recents.length,
    recent,
    ...projectManagerState.recents.filter(/* 比较 item.id 与 recent.id，返回严格不等的判断结果。 */ item => item.id !== recent.id).slice(0, MAX_RECENT_PROJECTS - 1))
  projectManagerState.currentSnapshot = source
  persistRecents()
}

/** 按身份移除最近项目条目并保存列表。 */ export function removeRecentProject(id: string): void {
  const index = projectManagerState.recents.findIndex(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id)
  if (index !== -1) projectManagerState.recents.splice(index, 1)
  persistRecents()
}

/** 尝试登记当前项目后显示项目管理页，清除旧错误并容忍空启动会话无法登记。 */ export function showProjectManager(): void {
  void rememberCurrentProject().catch(/** 忽略空启动会话登记最近项目失败，使项目管理页仍可正常打开。 */ () => { /* An empty startup session does not need a recent entry. */ })
  projectManagerState.visible = true
  projectManagerState.error = ''
}

/** 隐藏项目管理页并清除错误，返回当前编辑项目。 */ export function continueCurrentProject(): void {
  projectManagerState.visible = false
  projectManagerState.error = ''
}
