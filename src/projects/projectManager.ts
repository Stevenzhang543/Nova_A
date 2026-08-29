import { reactive } from 'vue'
import { editorState } from '../store/editor'
import { beginProjectSession, newProjectMetadata, projectSessionState, safeProjectName, touchProjectMetadata } from './projectSession'
import { createTemplateProjectJson, type ProjectTemplateId } from './templates'
import { analyzeProjectUpgrade, downloadProjectBackup, dryRunProjectMigration, readUpgradeRollback, recordMigrationApplied, storeUpgradeRollback, type UpgradePreview } from '../runtime/projectUpgrade'
import { acquireProjectLock, inspectProjectLock, markSourceBaseline, releaseProjectLock } from '../runtime/teamWorkflow'
import { canonicalProjectText, MAX_PROJECT_DOCUMENT_CHARACTERS, validateProjectDocument, type ProjectValidationReport } from './projectData'
import { recoveryState } from '../runtime/recovery'
import { appendTaskLog, completeTask, failTask, startTask } from '../runtime/editorFeedback'
import { markProjectDirty, setProjectTransactionDirectory } from '../runtime/projectTransactions'

const RECENT_KEY = 'nova_a.recent_projects.v2'
const MAX_RECENT_PROJECTS = 8
const MAX_SNAPSHOT_BYTES = 1_750_000
const physicsModule = () => import('../store/physics')

export interface RecentProject {
  id: string
  name: string
  updatedAt: string
  template: string
  location: string
  snapshot: string | null
}

function readRecents(): RecentProject[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap(value => {
      if (!value || typeof value !== 'object') return []
      const item = value as Partial<RecentProject>
      if (typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.updatedAt !== 'string') return []
      return [{ id: item.id.slice(0, 128), name: safeProjectName(item.name), updatedAt: item.updatedAt, template: typeof item.template === 'string' ? item.template.slice(0, 40) : 'imported', location: typeof item.location === 'string' ? item.location.slice(0, 500) : '', snapshot: typeof item.snapshot === 'string' && item.snapshot.length <= MAX_SNAPSHOT_BYTES ? item.snapshot : null }]
    }).slice(0, MAX_RECENT_PROJECTS)
  } catch { return [] }
}

function persistRecents(): void {
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
  pendingUpgrade: null as null | { source: string; fileName: string; importAsCopy: boolean; preview: UpgradePreview },
  readOnlyDocument: null as null | { source: string; fileName: string; preview: UpgradePreview },
  backupBeforeUpgrade: true,
  lastUpgradeValidation: null as ProjectValidationReport | null
  ,rollbackAvailable: readUpgradeRollback() !== null,
  lockConflict: null as null | { projectId:string; owner:string; expiresAt:number }
})

export async function createNewProject(name: string, template: ProjectTemplateId, location = ''): Promise<boolean> {
  projectManagerState.busy = true
  projectManagerState.error = ''
  try {
    const { clearEditorHistory, getSceneJSON, loadProject, physicsState } = await physicsModule()
    await physicsState.world.wasmReady
    const source = createTemplateProjectJson(template, safeProjectName(name))
    const previousId = projectSessionState.id
    if (!loadProject(source)) throw new Error(editorState.statusText || 'The selected template did not pass project validation.')
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

export async function openProjectDocument(source: string, fileName = 'project.nova', importAsCopy = false, projectDirectory = ''): Promise<boolean> {
  try {
    if (source.length > MAX_PROJECT_DOCUMENT_CHARACTERS) throw new Error('This project exceeds Nova_A\'s 192 MB safe document limit. Store large media as external project assets before opening it.')
    projectManagerState.currentLocation = projectDirectory.trim().slice(0, 500)
    setProjectTransactionDirectory(projectManagerState.currentLocation)
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
    projectManagerState.pendingUpgrade = { source, fileName, importAsCopy, preview }
    projectManagerState.visible = true
    projectManagerState.error = ''
    return false
  } catch (error) {
    projectManagerState.error = error instanceof Error ? error.message : String(error)
    return false
  }
  return openProjectDocumentNow(source, fileName, importAsCopy)
}

async function openProjectDocumentNow(source: string, fileName = 'project.nova', importAsCopy = false, forceReadOnly = false): Promise<boolean> {
  projectManagerState.busy = true
  projectManagerState.error = ''
  try {
    const { clearEditorHistory, getSceneJSON, loadProject, physicsState } = await physicsModule()
    await physicsState.world.wasmReady
    let previousProject: string | null = null
    try { previousProject = getSceneJSON() } catch { previousProject = null }
    let existingMetadata = false
    try {
      const parsed = JSON.parse(source) as Record<string, unknown>
      existingMetadata = !!parsed?.projectMetadata
    } catch { /* The canonical loader reports the useful parse error. */ }
    const previousId = projectSessionState.id
    if (!loadProject(source)) {
      if (previousProject) loadProject(previousProject)
      throw new Error('The project is invalid, unsupported, or newer than this Nova_A version. The previous project was restored.')
    }
    if (importAsCopy || !existingMetadata) {
      const baseName = fileName.replace(/\.(nova|json)$/i, '')
      beginProjectSession(newProjectMetadata(`${safeProjectName(baseName)}${importAsCopy ? ' (Imported)' : ''}`, 'imported'))
    }
    if (projectSessionState.id !== previousId) releaseProjectLock(previousId)
    recoveryState.readOnly = forceReadOnly || !acquireProjectLock(projectSessionState.id, 'Nova_A Editor')
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

export function closeReadOnlyDocument(): void { projectManagerState.readOnlyDocument = null }

export function downloadReadOnlyDocument(): void {
  const document = projectManagerState.readOnlyDocument
  if (!document) return
  const url = URL.createObjectURL(new Blob([document.source], { type: 'application/json' }))
  const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = document.fileName; anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function applyPendingProjectUpgrade(forceReadOnly = false): Promise<boolean> {
  const pending = projectManagerState.pendingUpgrade
  if (!pending) return false
  projectManagerState.busy = true
  projectManagerState.error = ''
  const task = startTask('Project migration', { detail: `Schema ${pending.preview.sourceSchema} → ${pending.preview.targetSchema}`, progress: .05, logs: ['Dry run started'], resources: [{ label: pending.preview.projectName, href: pending.fileName }] })
  try {
    const { physicsState } = await physicsModule()
    await physicsState.world.wasmReady
    const dryRun = dryRunProjectMigration(pending.source, value => physicsState.world.formatProjectJson(value))
    for (const entry of dryRun.log) appendTaskLog(task, `${entry.status.toUpperCase()} · ${entry.message}`)
    if (!dryRun.valid) throw new Error(dryRun.log.find(item => item.status === 'blocked')?.message || 'Migration dry run failed before mutation.')
    if (pending.preview.requiresMigration) {
      downloadProjectBackup(pending.source, pending.fileName.replace(/\.(nova|json)$/i, ''))
      storeUpgradeRollback(pending.source, pending.fileName)
      projectManagerState.rollbackAvailable = true
    }
    const migrated = dryRun.output
    const validation = validateProjectDocument(migrated)
    projectManagerState.lastUpgradeValidation = validation
    const blocking = validation.issues.filter(issue => issue.severity === 'error')
    if (blocking.length) throw new Error(`Migration validation failed: ${blocking[0].path || '<project>'}: ${blocking[0].message}`)
    const canonical = canonicalProjectText(migrated)
    projectManagerState.pendingUpgrade = null
    if (projectManagerState.lockConflict && !forceReadOnly) throw new Error(`Project is locked by ${projectManagerState.lockConflict.owner}. Open it read-only or close the other editor.`)
    const opened = await openProjectDocumentNow(canonical, pending.fileName, pending.importAsCopy, forceReadOnly)
    if (!opened) throw new Error(projectManagerState.error || 'Migrated project could not be opened.')
    recordMigrationApplied(dryRun); projectManagerState.lockConflict=null; completeTask(task, `Migration ${dryRun.id} committed; rollback retained.`)
    return true
  } catch (error) {
    projectManagerState.error = error instanceof Error ? error.message : String(error)
    failTask(task, error)
    return false
  } finally { projectManagerState.busy = false }
}

export function cancelPendingProjectUpgrade(): void { projectManagerState.pendingUpgrade = null; projectManagerState.lockConflict = null }

export function downloadLastUpgradeRollback(): boolean {
  const rollback = readUpgradeRollback()
  if (!rollback) return false
  downloadProjectBackup(rollback.source, rollback.fileName.replace(/\.(nova|json)$/i, ''))
  projectManagerState.rollbackAvailable = true
  return true
}

export async function restoreLastUpgradeRollback(): Promise<boolean> {
  const rollback = readUpgradeRollback()
  if (!rollback) return false
  const validation = validateProjectDocument(rollback.source)
  if (!validation.valid) { projectManagerState.error = validation.issues.find(item => item.severity === 'error')?.message ?? 'Rollback is invalid.'; return false }
  return openProjectDocumentNow(canonicalProjectText(rollback.source), rollback.fileName, false)
}

export async function openRecentProject(id: string): Promise<boolean> {
  const recent = projectManagerState.recents.find(item => item.id === id)
  if (!recent?.snapshot) {
    projectManagerState.error = 'This recent project is too large for a local snapshot. Choose Open Project and select its .nova file.'
    return false
  }
  return openProjectDocument(recent.snapshot, `${recent.name}.nova`, false, recent.location)
}

export async function rememberCurrentProject(): Promise<void> {
  const { getSceneJSON } = await physicsModule()
  touchProjectMetadata()
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
    ...projectManagerState.recents.filter(item => item.id !== recent.id).slice(0, MAX_RECENT_PROJECTS - 1))
  projectManagerState.currentSnapshot = source
  persistRecents()
}

export function removeRecentProject(id: string): void {
  const index = projectManagerState.recents.findIndex(item => item.id === id)
  if (index !== -1) projectManagerState.recents.splice(index, 1)
  persistRecents()
}

export function showProjectManager(): void {
  void rememberCurrentProject().catch(() => { /* An empty startup session does not need a recent entry. */ })
  projectManagerState.visible = true
  projectManagerState.error = ''
}

export function continueCurrentProject(): void {
  projectManagerState.visible = false
  projectManagerState.error = ''
}
