import { reactive } from 'vue'
import { canonicalProjectText } from '../projects/projectData'

export type SourceChangeKind = 'added' | 'modified' | 'deleted' | 'conflict'
export type SourceEntryKind = 'scene' | 'asset' | 'prefab' | 'resource' | 'settings' | 'packages' | 'project'

export interface SourceChange {
  id: string
  path: string
  kind: SourceEntryKind
  change: SourceChangeKind
}

interface SnapshotEntry { path: string; kind: SourceEntryKind; fingerprint: string }

const SETTINGS_KEY = 'nova_a.team_workflow.v1'
const LOCK_KEY_PREFIX = 'nova_a.project_lock.'
const MAX_CHANGES = 5_000

function storedSettings(): { diffTool: string; mergeTool: string; diffArguments: string; mergeArguments: string } {
  if (typeof localStorage === 'undefined') return { diffTool: '', mergeTool: '', diffArguments: '{left} {right}', mergeArguments: '{base} {ours} {theirs} {output}' }
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Record<string, unknown>
    const read = (key: string, fallback = '') => typeof value[key] === 'string' ? String(value[key]).slice(0, 1_024) : fallback
    return { diffTool: read('diffTool'), mergeTool: read('mergeTool'), diffArguments: read('diffArguments', '{left} {right}'), mergeArguments: read('mergeArguments', '{base} {ours} {theirs} {output}') }
  } catch { return { diffTool: '', mergeTool: '', diffArguments: '{left} {right}', mergeArguments: '{base} {ours} {theirs} {output}' } }
}

export const teamWorkflowState = reactive({
  ...storedSettings(),
  baseline: '' as string,
  changes: [] as SourceChange[],
  conflicts: [] as SourceChange[],
  incomingSource: '' as string,
  incomingFileName: '' as string,
  lockToken: '' as string,
  lockExpiresAt: 0,
  status: '',
  operationSummary: [] as string[]
})

function normalized(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalized)
  if (!value || typeof value !== 'object') return value
  const output: Record<string, unknown> = {}
  for (const key of Object.keys(value as Record<string, unknown>).sort()) output[key] = normalized((value as Record<string, unknown>)[key])
  return output
}

/** Stable text keeps scene/prefab diffs reviewable without changing array order. */
export function stableProjectText(source: string | unknown): string {
  return canonicalProjectText(source)
}

function fingerprint(value: unknown): string {
  const source = JSON.stringify(normalized(value))
  let first = 0x811c9dc5, second = 0x9e3779b9
  for (let index = 0; index < source.length; index++) {
    const code = source.charCodeAt(index)
    first = Math.imul(first ^ code, 0x01000193) >>> 0
    second = Math.imul(second ^ code, 0x85ebca6b) >>> 0
  }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`
}

function snapshot(source: string): Map<string, SnapshotEntry> {
  const project = JSON.parse(source) as Record<string, unknown>
  const output = new Map<string, SnapshotEntry>()
  output.set('project', { path: 'project.nova', kind: 'project', fingerprint: fingerprint({ projectFormat: project.projectFormat, formatVersion: project.formatVersion, engineVersion: project.engineVersion, activeSceneUuid: project.activeSceneUuid, manifest: project.manifest, projectMetadata: project.projectMetadata }) })
  output.set('settings', { path: 'ProjectSettings/shared.json', kind: 'settings', fingerprint: fingerprint(project.projectSettings) })
  output.set('packages', { path: 'Packages.lock', kind: 'packages', fingerprint: fingerprint({ installed: (project.packages as Record<string, unknown> | undefined)?.installed, lockfile: (project.packages as Record<string, unknown> | undefined)?.lockfile, plugins: project.plugins }) })
  for (const raw of Array.isArray(project.scenes) ? project.scenes : []) {
    if (!raw || typeof raw !== 'object') continue
    const scene = raw as Record<string, unknown>, id = String(scene.uuid ?? '')
    if (id) output.set(id, { path: `Assets/Scenes/${String(scene.name ?? id)}.nova-scene`, kind: 'scene', fingerprint: fingerprint(scene) })
  }
  for (const raw of Array.isArray(project.assets) ? project.assets : []) {
    if (!raw || typeof raw !== 'object') continue
    const asset = raw as Record<string, unknown>, id = String(asset.uuid ?? '')
    if (!id) continue
    const kind: SourceEntryKind = asset.assetType === 'prefab' ? 'prefab' : ['dataSchema', 'dataTable', 'material', 'localization', 'uiTheme'].includes(String(asset.assetType)) ? 'resource' : 'asset'
    output.set(id, { path: String(asset.path ?? id), kind, fingerprint: fingerprint({ ...asset, source: undefined }) })
  }
  return output
}

export function markSourceBaseline(source: string): void {
  teamWorkflowState.baseline = stableProjectText(source)
  teamWorkflowState.changes.splice(0)
  teamWorkflowState.conflicts.splice(0)
  teamWorkflowState.status = 'clean'
}

export function refreshSourceStatus(currentSource: string): SourceChange[] {
  if (!teamWorkflowState.baseline) { markSourceBaseline(currentSource); return [] }
  const before = snapshot(teamWorkflowState.baseline), after = snapshot(currentSource), changes: SourceChange[] = []
  for (const [id, entry] of after) {
    const previous = before.get(id)
    if (!previous) changes.push({ id, path: entry.path, kind: entry.kind, change: 'added' })
    else if (previous.fingerprint !== entry.fingerprint) changes.push({ id, path: entry.path, kind: entry.kind, change: 'modified' })
  }
  for (const [id, entry] of before) if (!after.has(id)) changes.push({ id, path: entry.path, kind: entry.kind, change: 'deleted' })
  changes.sort((a, b) => a.path.localeCompare(b.path))
  teamWorkflowState.changes.splice(0, teamWorkflowState.changes.length, ...changes.slice(0, MAX_CHANGES))
  teamWorkflowState.operationSummary.splice(0, teamWorkflowState.operationSummary.length, ...changes.slice(0, 100).map(change => `${change.change.toUpperCase()} ${change.path}`))
  teamWorkflowState.status = changes.length ? 'changes' : 'clean'
  return changes
}

export function sourceStatusFor(id: string): SourceChangeKind | null {
  return teamWorkflowState.changes.find(change => change.id === id)?.change ?? null
}

function sourceEntry(project: Record<string, unknown>, change: SourceChange): unknown {
  if (change.kind === 'project') return { projectFormat: project.projectFormat, formatVersion: project.formatVersion, engineVersion: project.engineVersion, activeSceneUuid: project.activeSceneUuid, manifest: project.manifest, projectMetadata: project.projectMetadata }
  if (change.kind === 'settings') return project.projectSettings
  if (change.kind === 'packages') return { packages: project.packages, plugins: project.plugins }
  if (change.kind === 'scene') return (Array.isArray(project.scenes) ? project.scenes : []).find((item: unknown) => item && typeof item === 'object' && (item as Record<string, unknown>).uuid === change.id)
  return (Array.isArray(project.assets) ? project.assets : []).find((item: unknown) => item && typeof item === 'object' && (item as Record<string, unknown>).uuid === change.id)
}

export function sourceDiffFor(id: string, currentSource: string): { path: string; before: string; after: string } | null {
  const change = teamWorkflowState.changes.find(item => item.id === id)
  if (!change) return null
  const beforeProject = JSON.parse(teamWorkflowState.baseline || currentSource) as Record<string, unknown>, afterProject = JSON.parse(stableProjectText(currentSource)) as Record<string, unknown>
  const format = (value: unknown) => value === undefined ? '(missing)' : `${JSON.stringify(normalized(value), null, 2)}\n`
  return { path: change.path, before: format(sourceEntry(beforeProject, change)), after: format(sourceEntry(afterProject, change)) }
}

export function detectIncomingConflicts(currentSource: string, incomingSource: string): SourceChange[] {
  const base = snapshot(teamWorkflowState.baseline || currentSource), ours = snapshot(currentSource), theirs = snapshot(incomingSource)
  const conflicts: SourceChange[] = []
  for (const [id, incoming] of theirs) {
    const original = base.get(id), current = ours.get(id)
    const oursChanged = current?.fingerprint !== original?.fingerprint
    const theirsChanged = incoming.fingerprint !== original?.fingerprint
    if (oursChanged && theirsChanged && current?.fingerprint !== incoming.fingerprint) conflicts.push({ id, path: incoming.path, kind: incoming.kind, change: 'conflict' })
  }
  teamWorkflowState.conflicts.splice(0, teamWorkflowState.conflicts.length, ...conflicts.slice(0, MAX_CHANGES))
  return conflicts
}

export function persistTeamWorkflowSettings(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    diffTool: teamWorkflowState.diffTool.slice(0, 1_024), mergeTool: teamWorkflowState.mergeTool.slice(0, 1_024),
    diffArguments: teamWorkflowState.diffArguments.slice(0, 1_024), mergeArguments: teamWorkflowState.mergeArguments.slice(0, 1_024)
  }))
}

export function novaIgnoreFile(): string {
  return ['# Nova_A generated/disposable data (regenerated; never hand-edit)', '.nova/cache/', '.nova/imported/', '.nova/build-cache/', '.nova/diagnostics/', 'Builds/', '*.nova-user', '', '# Binary locks are optional and team-controlled', '*.nova-lock', '', '# Keep authoritative project sources and deterministic package locks', '!project.nova', '!Packages.lock'].join('\n') + '\n'
}

export function novaPreCommitHook(): string {
  return ['#!/bin/sh', 'set -eu', 'pnpm nova validate --project project.nova --jsonl', 'pnpm package:validate -- --manifest Packages/manifest.json --jsonl 2>/dev/null || true', 'git diff --check'].join('\n') + '\n'
}

export function novaCiValidationTemplate(): string {
  return ['name: Nova_A validation', 'on: [push, pull_request]', 'jobs:', '  validate:', '    runs-on: windows-latest', '    steps:', '      - uses: actions/checkout@v4', '      - uses: pnpm/action-setup@v4', '        with: { version: 10.30.0 }', '      - uses: actions/setup-node@v4', '        with: { node-version: 20, cache: pnpm }', '      - run: pnpm install --frozen-lockfile', '      - run: pnpm nova validate --project project.nova --jsonl', '      - run: pnpm check', '      - run: cargo test --workspace --all-targets'].join('\n') + '\n'
}

function download(name: string, contents: string, type = 'text/plain'): void {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function textBase64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  return btoa(binary)
}

export function downloadNovaIgnoreFile(): void { download('.gitignore', novaIgnoreFile()) }
export function downloadPreCommitHook(): void { download('pre-commit', novaPreCommitHook()) }
export function downloadCiValidationTemplate(): void { download('nova-validation.yml', novaCiValidationTemplate(), 'text/yaml') }

export async function initializeGitRepository(projectDirectory: string): Promise<string> {
  const directory = projectDirectory.trim()
  if (!directory) throw new Error('Choose an existing project directory before initializing Git.')
  if (!('__TAURI_INTERNALS__' in window)) throw new Error('Repository initialization is available in the desktop editor. The generated templates can still be downloaded in a browser.')
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<string>('initialize_git_repository', { projectDirectory: directory, ignoreContents: novaIgnoreFile(), preCommitContents: novaPreCommitHook(), ciContents: novaCiValidationTemplate() })
}

export function incomingProjectSource(): string | null { return teamWorkflowState.incomingSource || null }

export async function openExternalDiff(currentSource: string): Promise<void> {
  const baseline = teamWorkflowState.baseline || currentSource
  if ('__TAURI_INTERNALS__' in window && teamWorkflowState.diffTool.trim()) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('open_external_diff', { request: { executable: teamWorkflowState.diffTool, arguments: teamWorkflowState.diffArguments, left: textBase64(baseline), right: textBase64(stableProjectText(currentSource)) } })
    return
  }
  download('project.saved.nova', baseline, 'application/json')
  download('project.current.nova', stableProjectText(currentSource), 'application/json')
}

export function setIncomingProject(currentSource: string, incomingSource: string, fileName: string): SourceChange[] {
  const stableIncoming = stableProjectText(incomingSource)
  teamWorkflowState.incomingSource = stableIncoming
  teamWorkflowState.incomingFileName = fileName.slice(0, 180)
  return detectIncomingConflicts(currentSource, stableIncoming)
}

export async function openExternalMerge(currentSource: string): Promise<void> {
  const baseline = teamWorkflowState.baseline || stableProjectText(currentSource)
  const ours = stableProjectText(currentSource)
  const theirs = teamWorkflowState.incomingSource
  if (!theirs) throw new Error('Choose an incoming .nova project before opening a merge tool.')
  if ('__TAURI_INTERNALS__' in window && teamWorkflowState.mergeTool.trim()) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('open_external_merge', { request: {
      executable: teamWorkflowState.mergeTool, arguments: teamWorkflowState.mergeArguments,
      base: textBase64(baseline), ours: textBase64(ours), theirs: textBase64(theirs)
    } })
    return
  }
  download('project.base.nova', baseline, 'application/json')
  download('project.ours.nova', ours, 'application/json')
  download('project.theirs.nova', theirs, 'application/json')
}

interface ProjectLock { token: string; owner: string; createdAt: number; expiresAt: number }

function lockStorageKey(projectId: string): string { return `${LOCK_KEY_PREFIX}${projectId.slice(0, 128)}` }

export function acquireProjectLock(projectId: string, owner: string, durationMinutes = 120): boolean {
  if (typeof localStorage === 'undefined') return false
  const key = lockStorageKey(projectId), now = Date.now()
  try {
    const previous = JSON.parse(localStorage.getItem(key) ?? 'null') as ProjectLock | null
    if (previous && previous.expiresAt > now && previous.token !== teamWorkflowState.lockToken) {
      teamWorkflowState.status = `locked:${previous.owner}`
      return false
    }
  } catch { /* A malformed expired lock is replaced safely. */ }
  const token = crypto.randomUUID(), lock: ProjectLock = { token, owner: owner.slice(0, 120), createdAt: now, expiresAt: now + Math.min(1_440, Math.max(5, durationMinutes)) * 60_000 }
  localStorage.setItem(key, JSON.stringify(lock)); teamWorkflowState.lockToken = token; teamWorkflowState.lockExpiresAt = lock.expiresAt; teamWorkflowState.status = 'locked-by-me'
  return true
}

export function releaseProjectLock(projectId: string): void {
  if (typeof localStorage === 'undefined' || !teamWorkflowState.lockToken) return
  const key = lockStorageKey(projectId)
  try {
    const lock = JSON.parse(localStorage.getItem(key) ?? 'null') as ProjectLock | null
    if (lock?.token === teamWorkflowState.lockToken) localStorage.removeItem(key)
  } finally { teamWorkflowState.lockToken = ''; teamWorkflowState.lockExpiresAt = 0; teamWorkflowState.status = '' }
}

export function downloadProjectLock(projectId: string, owner: string): void {
  const lock = { format: 'nova-project-lock', version: 1, projectId, owner: owner.slice(0, 120), token: teamWorkflowState.lockToken, expiresAt: new Date(teamWorkflowState.lockExpiresAt).toISOString() }
  download(`${projectId}.nova-lock`, `${JSON.stringify(lock, null, 2)}\n`, 'application/json')
}
