import { reactive } from 'vue'
import { canonicalProjectText, separateAuthoredAndGeneratedProjectData, semanticProjectDiff, validateProjectDocument, type SemanticProjectChange } from '../projects/projectData'
import { projectSessionState } from '../projects/projectSession'
import { sha256Text } from '../assets/contentHash'
import { appendTaskLog, completeTask, failTask, startTask, updateTask } from './editorFeedback'

export type ProjectMutationScope = 'scene' | 'asset' | 'script' | 'animation' | 'ui' | 'settings' | 'packages' | 'build' | 'project'
export type TransactionPhase = 'preflight' | 'prepared' | 'writing' | 'verifying' | 'committing' | 'committed' | 'cancelled' | 'failed' | 'rolling-back' | 'rolled-back'
export type TransactionErrorKind = 'cancelled' | 'validation' | 'disk-full' | 'permission-denied' | 'file-in-use' | 'path' | 'network' | 'antivirus-delay' | 'conflict' | 'read-only' | 'unknown'

export interface ProjectTransactionFile {
  path: string
  role: 'authored' | 'generated'
  scope: ProjectMutationScope
  checksum: string
  bytes: number
  contents: string
}

export interface ProjectTransactionJournal {
  format: 'nova-project-transaction'
  version: 1
  id: string
  projectId: string
  projectName: string
  createdAt: string
  updatedAt: string
  phase: TransactionPhase
  affectedFiles: Array<Omit<ProjectTransactionFile, 'contents'>>
  previousManualChecksum: string
  sourceChecksum: string
  recoveryState: 'not-required' | 'available' | 'verified' | 'rolled-back'
  errorKind: TransactionErrorKind | ''
  error: string
}

export interface ProjectTransactionPreflight {
  estimatedBytes: number
  availableBytes: number | null
  diskSpace: 'passed' | 'warning' | 'blocked'
  permission: 'passed' | 'warning' | 'blocked'
  path: 'passed' | 'blocked'
  validation: 'passed' | 'blocked'
  cancellation: 'ready' | 'cancelled'
  messages: string[]
}

export interface ProjectCommitSink {
  kind: 'browser-file' | 'download' | 'native-folder' | 'memory-test'
  writable: boolean
  destination?: string
  write(files: readonly ProjectTransactionFile[], journal: Readonly<ProjectTransactionJournal>, signal?: AbortSignal): Promise<void>
}

export interface CommitProjectOptions {
  label: string
  scopes?: ProjectMutationScope[]
  signal?: AbortSignal
  sink: ProjectCommitSink
  previousSource?: string
  faultAt?: TransactionPhase
  onPhase?: (phase: TransactionPhase, journal: Readonly<ProjectTransactionJournal>) => void
}

const JOURNAL_KEY = 'nova_a.project_transaction.journal.v1'
const LAST_GOOD_KEY = 'nova_a.project_transaction.last_good.v1'
const MAX_LOCAL_COPY_BYTES = 16_000_000
const ALL_SCOPES: ProjectMutationScope[] = ['scene', 'asset', 'script', 'animation', 'ui', 'settings', 'packages', 'build', 'project']

export const projectTransactionState = reactive({
  activeId: '', phase: 'committed' as TransactionPhase, busy: false, lastCommittedId: '', lastCommittedAt: '', lastManualChecksum: '',
  lastErrorKind: '' as TransactionErrorKind | '', lastError: '', preflight: null as ProjectTransactionPreflight | null,
  recent: [] as ProjectTransactionJournal[], interrupted: [] as ProjectTransactionJournal[], unsavedScopes: [] as ProjectMutationScope[],
  manualBaseline: '', semanticChanges: [] as SemanticProjectChange[], projectDirectory: ''
})

export function setProjectTransactionDirectory(value: string): void {
  projectTransactionState.projectDirectory = value.trim().replace(/[\\/]+$/, '').slice(0, 500)
}

function utf8Base64(source: string): string {
  const bytes = new TextEncoder().encode(source)
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  return btoa(binary)
}

/** Uses Tauri's same-directory staging/backup/rename transaction when a real project folder is available. */
export async function createNativeProjectTransactionSink(projectDirectory = projectTransactionState.projectDirectory): Promise<ProjectCommitSink | null> {
  const directory = projectDirectory.trim()
  if (!/^(?:[a-z]:[\\/]|\\\\)/i.test(directory)) return null
  try {
    const { invoke, isTauri } = await import('@tauri-apps/api/core')
    if (!isTauri()) return null
    return {
      kind: 'native-folder', writable: true, destination: directory,
      async write(files, journal) {
        await invoke('commit_project_transaction', { request: { projectDirectory: directory, transactionId: journal.id, files: files.map(item => ({ path: item.path, dataBase64: utf8Base64(item.contents), checksum: sha256Text(item.contents) })) } })
      }
    }
  } catch { return null }
}

export function projectChecksum(source: string): string {
  let first = 0x811c9dc5, second = 0x9e3779b9
  const bytes = new TextEncoder().encode(source)
  for (let index = 0; index < bytes.length; index++) {
    first = Math.imul(first ^ bytes[index], 0x01000193) >>> 0
    second = Math.imul(second ^ (bytes[index] + index), 0x85ebca6b) >>> 0
  }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`
}

function safeSegment(value: unknown, fallback: string): string {
  const cleaned = String(value ?? '').normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/^\.+|\.+$/g, '').trim()
  return cleaned.slice(0, 120) || fallback
}

function file(path: string, role: ProjectTransactionFile['role'], scope: ProjectMutationScope, contents: string): ProjectTransactionFile {
  const canonical = contents.endsWith('\n') ? contents.replace(/\r\n?/g, '\n') : `${contents.replace(/\r\n?/g, '\n')}\n`
  return { path, role, scope, checksum: projectChecksum(canonical), bytes: new TextEncoder().encode(canonical).byteLength, contents: canonical }
}

/** Produces the logical multi-file transaction while retaining project.nova as the portable authority. */
export function createProjectTransactionFiles(source: string): ProjectTransactionFile[] {
  const canonical = canonicalProjectText(source), project = JSON.parse(canonical) as Record<string, unknown>
  const separated = separateAuthoredAndGeneratedProjectData(project)
  const files: ProjectTransactionFile[] = [file('project.nova', 'authored', 'project', canonical)]
  for (const raw of Array.isArray(project.scenes) ? project.scenes : []) {
    if (!raw || typeof raw !== 'object') continue
    const scene = raw as Record<string, unknown>, id = safeSegment(scene.uuid, 'scene')
    files.push(file(`Assets/Scenes/${id}.nova-scene`, 'authored', 'scene', canonicalProjectText(scene)))
  }
  for (const raw of Array.isArray(project.assets) ? project.assets : []) {
    if (!raw || typeof raw !== 'object') continue
    const asset = raw as Record<string, unknown>, id = safeSegment(asset.uuid, 'asset'), assetType = String(asset.assetType ?? '')
    const scope: ProjectMutationScope = assetType === 'script' ? 'script' : ['animation', 'controller', 'timeline'].includes(assetType) ? 'animation' : ['uiTheme', 'localization'].includes(assetType) ? 'ui' : 'asset'
    files.push(file(`Assets/.nova-metadata/${id}.json`, 'authored', scope, canonicalProjectText(asset)))
  }
  files.push(file('ProjectSettings/project.json', 'authored', 'settings', canonicalProjectText(project.projectSettings ?? {})))
  files.push(file('Packages.lock', 'authored', 'packages', canonicalProjectText((project.packages as Record<string, unknown> | undefined)?.lockfile ?? [])))
  files.push(file('.nova/imported/manifest.json', 'generated', 'asset', canonicalProjectText(separated.generated)))
  return files.sort((a, b) => a.path.localeCompare(b.path))
}

export function markProjectDirty(scope: ProjectMutationScope | ProjectMutationScope[] = 'project'): void {
  for (const item of Array.isArray(scope) ? scope : [scope]) if (!projectTransactionState.unsavedScopes.includes(item)) projectTransactionState.unsavedScopes.push(item)
}

export function clearProjectDirty(source: string): void {
  const canonical = canonicalProjectText(source)
  projectTransactionState.unsavedScopes.splice(0)
  projectTransactionState.manualBaseline = canonical
  projectTransactionState.semanticChanges.splice(0)
}

export function projectScopeDirty(scope: ProjectMutationScope): boolean { return projectTransactionState.unsavedScopes.includes(scope) || projectTransactionState.unsavedScopes.includes('project') }

export function classifyTransactionError(error: unknown): TransactionErrorKind {
  if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
  const message = (error instanceof Error ? `${error.name} ${error.message}` : String(error)).toLowerCase()
  if (/cancel|abort/.test(message)) return 'cancelled'
  if (/valid|schema|parse|json/.test(message)) return 'validation'
  if (/quota|disk.?full|no space|enospc/.test(message)) return 'disk-full'
  if (/permission|denied|access|eperm|eacces/.test(message)) return 'permission-denied'
  if (/used by another|file.?in.?use|sharing violation|ebusy/.test(message)) return 'file-in-use'
  if (/read.?only|erofs/.test(message)) return 'read-only'
  if (/long path|name too long|enametoolong|unsafe path/.test(message)) return 'path'
  if (/network|offline|unreachable/.test(message)) return 'network'
  if (/antivirus|timed? out|delay/.test(message)) return 'antivirus-delay'
  if (/conflict|externally modified/.test(message)) return 'conflict'
  return 'unknown'
}

function assertBoundary(signal?: AbortSignal, faultAt?: TransactionPhase, phase?: TransactionPhase): void {
  if (signal?.aborted) throw new DOMException('Project transaction cancelled at a safe boundary.', 'AbortError')
  if (faultAt && phase === faultAt) throw new Error(`Injected transaction interruption at ${phase}`)
}

async function preflight(files: readonly ProjectTransactionFile[], sink: ProjectCommitSink, signal?: AbortSignal): Promise<ProjectTransactionPreflight> {
  const estimatedBytes = files.reduce((sum, item) => sum + item.bytes, 0), messages: string[] = []
  let availableBytes: number | null = null
  try {
    const estimate = typeof navigator !== 'undefined' ? await navigator.storage?.estimate?.() : undefined
    if (typeof estimate?.quota === 'number' && typeof estimate.usage === 'number') availableBytes = Math.max(0, estimate.quota - estimate.usage)
  } catch { messages.push('Storage quota could not be measured; the transactional write still verifies every file.') }
  const diskSpace = availableBytes !== null && availableBytes < estimatedBytes * 2 + 1_048_576 ? 'blocked' : availableBytes === null ? 'warning' : 'passed'
  const permission = sink.writable ? 'passed' : 'blocked'
  const path = sink.destination && sink.destination.length > 240 && !sink.destination.startsWith('\\\\?\\') ? 'blocked' : 'passed'
  const result: ProjectTransactionPreflight = { estimatedBytes, availableBytes, diskSpace, permission, path, validation: 'passed', cancellation: signal?.aborted ? 'cancelled' : 'ready', messages }
  if (diskSpace === 'blocked') messages.push(`The transaction needs ${estimatedBytes.toLocaleString()} bytes plus rollback space.`)
  if (permission === 'blocked') messages.push('The destination is read-only or did not grant write permission.')
  if (path === 'blocked') messages.push('The selected path exceeds the portable project-path limit.')
  if (signal?.aborted) messages.push('The operation was cancelled before mutation.')
  return result
}

function persistJournal(journal: ProjectTransactionJournal): void {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal)) } catch { /* The external sink still has its own journal. */ }
}

function transition(journal: ProjectTransactionJournal, phase: TransactionPhase, options: CommitProjectOptions): void {
  journal.phase = phase; journal.updatedAt = new Date().toISOString(); persistJournal(journal)
  projectTransactionState.phase = phase; options.onPhase?.(phase, journal)
}

export async function commitProjectTransaction(source: string, options: CommitProjectOptions): Promise<ProjectTransactionJournal> {
  if (projectTransactionState.busy) throw new Error('Another project transaction is already active.')
  const canonical = canonicalProjectText(source), validation = validateProjectDocument(canonical)
  if (!validation.valid) throw new Error(`Project validation blocked the save: ${validation.issues.find(item => item.severity === 'error')?.message ?? 'invalid project'}`)
  const files = createProjectTransactionFiles(canonical), id = crypto.randomUUID?.() ?? `transaction-${Date.now()}`
  const now = new Date().toISOString(), journal: ProjectTransactionJournal = {
    format: 'nova-project-transaction', version: 1, id, projectId: projectSessionState.id, projectName: projectSessionState.name,
    createdAt: now, updatedAt: now, phase: 'preflight', affectedFiles: files.map(({ contents: _contents, ...item }) => item),
    previousManualChecksum: projectTransactionState.lastManualChecksum, sourceChecksum: projectChecksum(canonical), recoveryState: projectTransactionState.manualBaseline ? 'available' : 'not-required', errorKind: '', error: ''
  }
  const task = startTask(options.label, { detail: `${files.length} affected project file(s)`, progress: 0, logs: [`Transaction ${id} queued`], resources: files.slice(0, 20).map(item => ({ label: item.path, href: item.path })) })
  const progress: Partial<Record<TransactionPhase, number>> = { preflight:.05, prepared:.2, writing:.4, verifying:.7, committing:.86, committed:1, failed:1, cancelled:1 }
  const move = (phase: TransactionPhase): void => { transition(journal, phase, options); appendTaskLog(task, `${phase}: ${journal.affectedFiles.length} file(s), ${journal.sourceChecksum}`); updateTask(task, { progress: progress[phase] ?? null, detail: `Transaction ${journal.id} · ${phase}` }) }
  projectTransactionState.busy = true; projectTransactionState.activeId = id; projectTransactionState.lastError = ''; projectTransactionState.lastErrorKind = ''
  try {
    move('preflight'); assertBoundary(options.signal, options.faultAt, 'preflight')
    const checked = await preflight(files, options.sink, options.signal); projectTransactionState.preflight = checked
    if (checked.validation === 'blocked' || checked.diskSpace === 'blocked' || checked.permission === 'blocked' || checked.path === 'blocked' || checked.cancellation === 'cancelled') throw new Error(checked.messages[0] || 'Project transaction preflight failed.')
    move('prepared'); assertBoundary(options.signal, options.faultAt, 'prepared')
    if (typeof localStorage !== 'undefined' && canonical.length <= MAX_LOCAL_COPY_BYTES) {
      const previous = projectTransactionState.manualBaseline || options.previousSource || ''
      localStorage.setItem(`${JOURNAL_KEY}.temporary`, canonical)
      if (previous) localStorage.setItem(`${LAST_GOOD_KEY}.backup`, previous)
    }
    move('writing'); assertBoundary(options.signal, options.faultAt, 'writing')
    await options.sink.write(files, journal, options.signal)
    move('verifying'); assertBoundary(options.signal, options.faultAt, 'verifying')
    if (files.find(item => item.path === 'project.nova')?.checksum !== projectChecksum(canonical)) throw new Error('The staged project checksum changed before commit.')
    move('committing'); assertBoundary(options.signal, options.faultAt, 'committing')
    if (typeof localStorage !== 'undefined') {
      if (canonical.length <= MAX_LOCAL_COPY_BYTES) localStorage.setItem(LAST_GOOD_KEY, canonical)
      localStorage.removeItem(`${JOURNAL_KEY}.temporary`)
    }
    journal.recoveryState = 'verified'; move('committed')
    projectTransactionState.lastCommittedId = id; projectTransactionState.lastCommittedAt = journal.updatedAt; projectTransactionState.lastManualChecksum = journal.sourceChecksum
    projectTransactionState.recent.unshift(structuredClone(journal)); projectTransactionState.recent.splice(20)
    clearProjectDirty(canonical); completeTask(task, `Committed ${files.length} verified file(s); transaction ${id}.`)
    return journal
  } catch (error) {
    const kind = classifyTransactionError(error); journal.errorKind = kind; journal.error = error instanceof Error ? error.message.slice(0, 2_000) : String(error).slice(0, 2_000)
    move(kind === 'cancelled' ? 'cancelled' : 'failed')
    if (kind === 'cancelled') updateTask(task, { status: 'cancelled', error: journal.error })
    else failTask(task, error)
    projectTransactionState.lastErrorKind = kind; projectTransactionState.lastError = journal.error
    projectTransactionState.recent.unshift(structuredClone(journal)); projectTransactionState.recent.splice(20)
    throw error
  } finally { projectTransactionState.busy = false; projectTransactionState.activeId = '' }
}

export function deterministicResave(source: string): { source: string; checksum: string; changed: boolean; semanticChanges: SemanticProjectChange[] } {
  const canonical = canonicalProjectText(source), canonicalAgain = canonicalProjectText(canonical)
  if (canonical !== canonicalAgain) throw new Error('Canonical project serialization is not idempotent.')
  const beforeCanonical = source.replace(/\r\n?/g, '\n').endsWith('\n') ? source.replace(/\r\n?/g, '\n') : `${source.replace(/\r\n?/g, '\n')}\n`
  return { source: canonical, checksum: projectChecksum(canonical), changed: beforeCanonical !== canonical, semanticChanges: semanticProjectDiff(source, canonical) }
}

export function recoverInterruptedProjectTransactions(): ProjectTransactionJournal[] {
  projectTransactionState.interrupted.splice(0)
  if (typeof localStorage === 'undefined') return []
  try {
    const journal = JSON.parse(localStorage.getItem(JOURNAL_KEY) ?? 'null') as ProjectTransactionJournal | null
    if (journal?.format === 'nova-project-transaction' && !['committed', 'cancelled', 'rolled-back'].includes(journal.phase)) projectTransactionState.interrupted.push(journal)
  } catch { /* Project Health reports malformed journals through diagnostics. */ }
  return projectTransactionState.interrupted
}

export function lastKnownGoodProjectSource(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const source = localStorage.getItem(LAST_GOOD_KEY)
    return source && validateProjectDocument(source).valid ? source : null
  } catch { return null }
}

export function interruptedProjectSource(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const source = localStorage.getItem(`${JOURNAL_KEY}.temporary`)
    return source && validateProjectDocument(source).valid ? canonicalProjectText(source) : null
  } catch { return null }
}

export function markTransactionBaseline(source: string): void {
  const canonical = canonicalProjectText(source)
  projectTransactionState.manualBaseline = canonical; projectTransactionState.lastManualChecksum = projectChecksum(canonical)
  projectTransactionState.unsavedScopes.splice(0); projectTransactionState.semanticChanges.splice(0)
}

export function refreshTransactionDiff(source: string): SemanticProjectChange[] {
  const baseline = projectTransactionState.manualBaseline || canonicalProjectText(source)
  const changes = semanticProjectDiff(baseline, source)
  projectTransactionState.semanticChanges.splice(0, projectTransactionState.semanticChanges.length, ...changes)
  return changes
}

export function transactionDiagnostics(): string {
  return JSON.stringify({ generatedAt: new Date().toISOString(), activeId: projectTransactionState.activeId, phase: projectTransactionState.phase, lastCommittedId: projectTransactionState.lastCommittedId, lastCommittedAt: projectTransactionState.lastCommittedAt, lastManualChecksum: projectTransactionState.lastManualChecksum, lastErrorKind: projectTransactionState.lastErrorKind, lastError: projectTransactionState.lastError, unsavedScopes: projectTransactionState.unsavedScopes, interrupted: projectTransactionState.interrupted, recent: projectTransactionState.recent }, null, 2)
}

export const PROJECT_MUTATION_SCOPES = Object.freeze([...ALL_SCOPES])
