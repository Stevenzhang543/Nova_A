import { reactive } from 'vue'
import { getSceneJSON, loadProject, physicsState } from '../store/physics'
import { beginProjectSession, newProjectMetadata, projectSessionState, safeProjectName, touchProjectMetadata } from './projectSession'
import { createTemplateProjectJson, type ProjectTemplateId } from './templates'

const RECENT_KEY = 'nova_a.recent_projects.v2'
const MAX_RECENT_PROJECTS = 8
const MAX_SNAPSHOT_BYTES = 1_750_000

export interface RecentProject {
  id: string
  name: string
  updatedAt: string
  template: string
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
      return [{ id: item.id.slice(0, 128), name: safeProjectName(item.name), updatedAt: item.updatedAt, template: typeof item.template === 'string' ? item.template.slice(0, 40) : 'imported', snapshot: typeof item.snapshot === 'string' ? item.snapshot : null }]
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
  currentSnapshot: null as string | null
})

export async function createNewProject(name: string, template: ProjectTemplateId): Promise<boolean> {
  projectManagerState.busy = true
  projectManagerState.error = ''
  try {
    await physicsState.world.wasmReady
    const source = createTemplateProjectJson(template, safeProjectName(name))
    if (!loadProject(source)) throw new Error('The selected template did not pass project validation.')
    projectManagerState.currentSnapshot = getSceneJSON()
    rememberCurrentProject(projectManagerState.currentSnapshot)
    projectManagerState.visible = false
    return true
  } catch (error) {
    projectManagerState.error = error instanceof Error ? error.message : String(error)
    return false
  } finally { projectManagerState.busy = false }
}

export async function openProjectDocument(source: string, fileName = 'project.nova', importAsCopy = false): Promise<boolean> {
  projectManagerState.busy = true
  projectManagerState.error = ''
  try {
    await physicsState.world.wasmReady
    let existingMetadata = false
    try {
      const parsed = JSON.parse(source) as Record<string, unknown>
      existingMetadata = !!parsed?.projectMetadata
    } catch { /* The canonical loader reports the useful parse error. */ }
    if (!loadProject(source)) throw new Error('The project is invalid, unsupported, or newer than this Nova_A version.')
    if (importAsCopy || !existingMetadata) {
      const baseName = fileName.replace(/\.(nova|json)$/i, '')
      beginProjectSession(newProjectMetadata(`${safeProjectName(baseName)}${importAsCopy ? ' (Imported)' : ''}`, 'imported'))
    }
    projectManagerState.currentSnapshot = getSceneJSON()
    rememberCurrentProject(projectManagerState.currentSnapshot)
    projectManagerState.visible = false
    return true
  } catch (error) {
    projectManagerState.error = error instanceof Error ? error.message : String(error)
    return false
  } finally { projectManagerState.busy = false }
}

export async function openRecentProject(id: string): Promise<boolean> {
  const recent = projectManagerState.recents.find(item => item.id === id)
  if (!recent?.snapshot) {
    projectManagerState.error = 'This recent project is too large for a local snapshot. Choose Open Project and select its .nova file.'
    return false
  }
  return openProjectDocument(recent.snapshot, `${recent.name}.nova`)
}

export function rememberCurrentProject(source = getSceneJSON()): void {
  touchProjectMetadata()
  source = getSceneJSON()
  const snapshot = source.length <= MAX_SNAPSHOT_BYTES ? source : null
  const recent: RecentProject = {
    id: projectSessionState.id,
    name: projectSessionState.name,
    updatedAt: new Date().toISOString(),
    template: projectSessionState.template,
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
  try { rememberCurrentProject() } catch { /* An empty startup session does not need a recent entry. */ }
  projectManagerState.visible = true
  projectManagerState.error = ''
}

export function continueCurrentProject(): void {
  projectManagerState.visible = false
  projectManagerState.error = ''
}
