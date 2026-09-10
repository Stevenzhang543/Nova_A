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

export function suppressSelfProjectChange(sourceOrChecksum: string): void {
  externalChangeState.selfChangeChecksum = /^[0-9a-f]{16}$/i.test(sourceOrChecksum) ? sourceOrChecksum : projectChecksum(canonicalProjectText(sourceOrChecksum))
}

export function signalExternalProjectChange(source: string, fileName = 'project.nova', reason: 'external' | 'branch-switch' = 'external'): boolean {
  let incoming: string
  try { incoming = canonicalProjectText(source); if (!validateProjectDocument(incoming).valid) throw new Error('The external project failed schema validation.') } catch (error) { externalChangeState.error = error instanceof Error ? error.message : String(error); return false }
  const checksum = projectChecksum(incoming)
  if (checksum === externalChangeState.selfChangeChecksum || checksum === projectTransactionState.lastManualChecksum) { externalChangeState.selfChangeChecksum = ''; return false }
  const current = getSceneJSON(), changes = semanticProjectDiff(projectTransactionState.manualBaseline || current, incoming), conflicts = semanticProjectDiff(current, incoming)
  externalChangeState.fileName = fileName.slice(0, 180); externalChangeState.incomingSource = incoming; externalChangeState.incomingChecksum = checksum; externalChangeState.detectedAt = new Date().toISOString()
  externalChangeState.kind = changes.length > 100 ? 'large-update' : reason; externalChangeState.changes.splice(0, externalChangeState.changes.length, ...changes); externalChangeState.conflicts.splice(0, externalChangeState.conflicts.length, ...conflicts)
  externalChangeState.visible = true; externalChangeState.keepEditorAcknowledged = false; setIncomingProject(current, incoming, fileName); return true
}

async function poll(generation: number, sourceHandle: WatchHandle): Promise<void> {
  const current = () => generation === watchGeneration && handle === sourceHandle
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
  if (current()) timer = window.setTimeout(() => { void poll(generation, sourceHandle) }, POLL_MS)
}

export async function watchProjectFile(sourceHandle: WatchHandle): Promise<void> {
  stopProjectFileWatcher(); handle = sourceHandle
  const generation = watchGeneration
  try {
    const file = await sourceHandle.getFile()
    if (generation !== watchGeneration || handle !== sourceHandle) return
    knownStamp = file.lastModified + ':' + file.size; externalChangeState.watching = true; externalChangeState.error = ''
    timer = window.setTimeout(() => { void poll(generation, sourceHandle) }, POLL_MS)
  } catch (error) {
    if (generation !== watchGeneration || handle !== sourceHandle) return
    stopProjectFileWatcher(); externalChangeState.error = error instanceof Error ? error.message : String(error)
    throw error
  }
}

export function stopProjectFileWatcher(): void { watchGeneration++; if (timer !== null) window.clearTimeout(timer); timer = null; handle = null; knownStamp = ''; externalChangeState.watching = false }

export function compareExternalProject(): SemanticProjectChange[] { return [...externalChangeState.conflicts] }

export function keepEditorProjectVersion(): void { externalChangeState.visible = false; externalChangeState.keepEditorAcknowledged = true; markProjectDirty('project') }

export function keepDiskProjectVersion(): boolean {
  const source = externalChangeState.incomingSource
  if (!source || !loadProject(source)) return false
  clearEditorHistory('external-project-reload', source); markSourceBaseline(source); markTransactionBaseline(source); externalChangeState.visible = false; externalChangeState.incomingSource = ''; return true
}

export function reloadExternalProject(): boolean { return keepDiskProjectVersion() }

export function externalChangeDiagnostics(): string { return JSON.stringify({ generatedAt:new Date().toISOString(), watching:externalChangeState.watching, detectedAt:externalChangeState.detectedAt, kind:externalChangeState.kind, incomingChecksum:externalChangeState.incomingChecksum, changes:externalChangeState.changes, conflicts:externalChangeState.conflicts, error:externalChangeState.error },null,2) }
