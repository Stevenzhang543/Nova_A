import { reactive } from 'vue'
import { canonicalProjectText, validateProjectDocument } from '../projects/projectData'

export type SourceChangeKind = 'added' | 'modified' | 'deleted' | 'conflict'
export type SourceEntryKind = 'scene' | 'asset' | 'prefab' | 'resource' | 'settings' | 'packages' | 'project'

export interface SourceChange {
  id: string
  path: string
  kind: SourceEntryKind
  change: SourceChangeKind
}

export interface TeamOwnershipRule { path: string; owners: string[] }
export interface TeamTaskLink { id: string; url: string; summary: string }
export interface TeamChangeNote { id: string; owner: string; note: string; createdAt: string }
export interface TeamBuildPreset { id: string; name: string; target: string; profile: string; settings: string }
export interface BinaryAssetLock { path: string; owner: string; token: string; expiresAt: number }
export interface TeamChangeList { id: string; name: string; owner: string; createdAt: string; status: 'open' | 'ready' | 'merged'; changes: SourceChange[]; noteIds: string[]; fingerprint: string; baseFingerprint: string; currentFingerprint: string; generation: number; stale: boolean }
export interface SemanticMergeConflict { id: string; path: string; kind: 'scene' | 'graph' | 'asset' | 'settings' | 'project'; base: unknown; ours: unknown; theirs: unknown; resolution: 'unresolved' | 'ours' | 'theirs' }
export interface SemanticMergePlan { format: 'nova-semantic-merge'; version: 1; merged: Record<string, unknown>; conflicts: SemanticMergeConflict[]; autoMerged: string[]; fingerprint: string }

interface SnapshotEntry { path: string; kind: SourceEntryKind; fingerprint: string }

const SETTINGS_KEY = 'nova_a.team_workflow.v1'
const LOCK_KEY_PREFIX = 'nova_a.project_lock.'
const MAX_CHANGES = 5_000
const MAX_MERGE_DEPTH = 64
const MAX_MERGE_NODES = 250_000
let sourceGeneration = 0

function storedSettings(): { enabled: boolean; networkOperations: boolean; diffTool: string; mergeTool: string; diffArguments: string; mergeArguments: string } {
  if (typeof localStorage === 'undefined') return { enabled: false, networkOperations: false, diffTool: '', mergeTool: '', diffArguments: '{left} {right}', mergeArguments: '{base} {ours} {theirs} {output}' }
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Record<string, unknown>
    const read = (key: string, fallback = '') => typeof value[key] === 'string' ? String(value[key]).slice(0, 1_024) : fallback
    return { enabled: value.enabled === true, networkOperations: value.networkOperations === true, diffTool: read('diffTool'), mergeTool: read('mergeTool'), diffArguments: read('diffArguments', '{left} {right}'), mergeArguments: read('mergeArguments', '{base} {ours} {theirs} {output}') }
  } catch { return { enabled: false, networkOperations: false, diffTool: '', mergeTool: '', diffArguments: '{left} {right}', mergeArguments: '{base} {ours} {theirs} {output}' } }
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
  operationSummary: [] as string[],
  ownership: [] as TeamOwnershipRule[],
  taskLinks: [] as TeamTaskLink[],
  changeNotes: [] as TeamChangeNote[],
  sharedBuildPresets: [] as TeamBuildPreset[],
  binaryLocks: [] as BinaryAssetLock[],
  repositoryBranch: '',
  repositoryRoot: '',
  changeLists: [] as TeamChangeList[],
  activeChangeListId: '',
  semanticMerge: null as SemanticMergePlan | null
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
  const source = JSON.stringify(normalized(value)) ?? 'null'
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
    const kind: SourceEntryKind = asset.assetType === 'prefab' ? 'prefab' : ['dataSchema', 'dataTable', 'material', 'localization', 'uiTheme', 'resource'].includes(String(asset.assetType)) ? 'resource' : 'asset'
    // Script, graph, localization, and text source is authoritative authored
    // content. Excluding it made real edits invisible to change lists.
    output.set(id, { path: String(asset.path ?? id), kind, fingerprint: fingerprint(asset) })
  }
  return output
}

export function markSourceBaseline(source: string): void {
  teamWorkflowState.baseline = stableProjectText(source)
  sourceGeneration++
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
  const currentFingerprint = fingerprint(JSON.parse(stableProjectText(currentSource)))
  for (const list of teamWorkflowState.changeLists) list.stale = list.currentFingerprint !== currentFingerprint
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
    enabled: teamWorkflowState.enabled, networkOperations: teamWorkflowState.networkOperations,
    diffTool: teamWorkflowState.diffTool.slice(0, 1_024), mergeTool: teamWorkflowState.mergeTool.slice(0, 1_024),
    diffArguments: teamWorkflowState.diffArguments.slice(0, 1_024), mergeArguments: teamWorkflowState.mergeArguments.slice(0, 1_024)
  }))
}

export function teamWorkflowMetadata(): Record<string, unknown> {
  return {
    format: 'nova-team-workflow', version: 1, optional: true, cloudRequired: false,
    networkOperationsEnabled: teamWorkflowState.networkOperations,
    ownership: teamWorkflowState.ownership.map(rule => ({ path: rule.path, owners: [...rule.owners] })),
    taskLinks: teamWorkflowState.taskLinks.map(link => ({ ...link })),
    changeNotes: teamWorkflowState.changeNotes.map(note => ({ ...note })),
    sharedBuildPresets: teamWorkflowState.sharedBuildPresets.map(preset => ({ ...preset })),
    binaryLocks: teamWorkflowState.binaryLocks.map(lock => ({ path: lock.path, owner: lock.owner, expiresAt: new Date(lock.expiresAt).toISOString() }))
  }
}

export function addOwnershipRule(path: string, owners: string): boolean {
  const cleanPath = path.trim().replace(/\\/g, '/').slice(0, 500)
  const cleanOwners = [...new Set(owners.split(/[\s,]+/).map(owner => owner.trim().replace(/^@/, '')).filter(Boolean))].slice(0, 32)
  if (!cleanPath || !cleanOwners.length) return false
  const existing = teamWorkflowState.ownership.find(rule => rule.path === cleanPath)
  if (existing) existing.owners = cleanOwners; else teamWorkflowState.ownership.push({ path: cleanPath, owners: cleanOwners })
  return true
}

export function addTeamTaskLink(id: string, url: string, summary: string): boolean {
  const cleanId = id.trim().slice(0, 80), cleanUrl = url.trim().slice(0, 500), cleanSummary = summary.trim().slice(0, 240)
  if (!cleanId || !/^(https?:\/\/|[A-Za-z]+-\d+$)/.test(cleanUrl || cleanId)) return false
  const entry = { id: cleanId, url: cleanUrl, summary: cleanSummary }
  const index = teamWorkflowState.taskLinks.findIndex(item => item.id === cleanId)
  if (index >= 0) teamWorkflowState.taskLinks.splice(index, 1, entry); else teamWorkflowState.taskLinks.unshift(entry)
  return true
}

export function addTeamChangeNote(owner: string, note: string): boolean {
  const cleanOwner = owner.trim().slice(0, 120), cleanNote = note.trim().slice(0, 1_000)
  if (!cleanOwner || !cleanNote) return false
  teamWorkflowState.changeNotes.unshift({ id: crypto.randomUUID(), owner: cleanOwner, note: cleanNote, createdAt: new Date().toISOString() })
  if (teamWorkflowState.changeNotes.length > 256) teamWorkflowState.changeNotes.splice(256)
  return true
}

function matchesOwnershipPath(pattern: string, path: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')
  try { return new RegExp(`^${escaped}$`, 'i').test(path) } catch { return pattern === path }
}

export function ownershipForPath(path: string): string[] {
  return [...new Set(teamWorkflowState.ownership.filter(rule => matchesOwnershipPath(rule.path, path)).flatMap(rule => rule.owners))]
}

export function createTeamChangeList(name: string, owner: string, changeIds: string[], currentSource: string): TeamChangeList | null {
  refreshSourceStatus(currentSource)
  const cleanName = name.trim().slice(0, 120), cleanOwner = owner.trim().replace(/^@/, '').slice(0, 120)
  const selected = teamWorkflowState.changes.filter(change => changeIds.includes(change.id)).slice(0, MAX_CHANGES)
  if (!cleanName || !cleanOwner || !selected.length) return null
  const denied = selected.filter(change => { const owners = ownershipForPath(change.path); return owners.length > 0 && !owners.includes(cleanOwner) })
  const changeList: TeamChangeList = {
    id: crypto.randomUUID(), name: cleanName, owner: cleanOwner, createdAt: new Date().toISOString(), status: denied.length ? 'open' : 'ready',
    changes: selected.map(change => ({ ...change })), noteIds: teamWorkflowState.changeNotes.filter(note => note.owner === cleanOwner).map(note => note.id),
    fingerprint: fingerprint({ owner: cleanOwner, changes: selected.map(change => ({ id: change.id, change: change.change, path: change.path })) }),
    baseFingerprint: fingerprint(JSON.parse(teamWorkflowState.baseline || stableProjectText(currentSource))),
    currentFingerprint: fingerprint(JSON.parse(stableProjectText(currentSource))), generation: sourceGeneration, stale: false
  }
  teamWorkflowState.changeLists.unshift(changeList); if (teamWorkflowState.changeLists.length > 256) teamWorkflowState.changeLists.splice(256)
  teamWorkflowState.activeChangeListId = changeList.id
  return changeList
}

function same(left: unknown, right: unknown): boolean { return JSON.stringify(normalized(left)) === JSON.stringify(normalized(right)) }
function mergeKind(path: string, ...values: unknown[]): SemanticMergeConflict['kind'] {
  if (path.startsWith('/scenes/')) return 'scene'
  if (/(?:graph|visualGraph)/i.test(path) || values.some(value => plain(value) && /graph/i.test(String(value.assetType ?? value.type ?? '')))) return 'graph'
  return path.startsWith('/assets/') ? 'asset' : path.startsWith('/projectSettings') ? 'settings' : 'project'
}
function plain(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === 'object' && !Array.isArray(value)) }
function arrayIdentity(value: unknown): string | null {
  if (!plain(value)) return null
  for (const key of ['uuid', 'id', 'key', 'name']) if (typeof value[key] === 'string' && String(value[key]).trim()) return `${key}:${String(value[key])}`
  return null
}
function semanticMergeValue(base: unknown, ours: unknown, theirs: unknown, path: string, conflicts: SemanticMergeConflict[], autoMerged: string[], state: { nodes: number }, depth = 0): unknown {
  state.nodes++
  if (depth > MAX_MERGE_DEPTH || state.nodes > MAX_MERGE_NODES) throw new Error('Semantic merge exceeds the safe depth or node limit.')
  if (same(ours, theirs)) return ours
  if (same(ours, base)) { autoMerged.push(path); return theirs }
  if (same(theirs, base)) { autoMerged.push(path); return ours }
  if (plain(ours) && plain(theirs) && (plain(base) || base === undefined)) {
    const source = plain(base) ? base : {}, output: Record<string, unknown> = {}
    for (const key of [...new Set([...Object.keys(source), ...Object.keys(ours), ...Object.keys(theirs)])].sort()) {
      const merged = semanticMergeValue(source[key], ours[key], theirs[key], `${path}/${key}`, conflicts, autoMerged, state, depth + 1)
      if (merged !== undefined) output[key] = merged
    }
    return output
  }
  if (Array.isArray(ours) && Array.isArray(theirs)) {
    const baseArray = Array.isArray(base) ? base : []
    const allIdentifiable = [...baseArray, ...ours, ...theirs].every(value => arrayIdentity(value) !== null)
    if (!allIdentifiable) {
      if (conflicts.length >= MAX_CHANGES) throw new Error('Semantic merge conflict limit exceeded; no partial plan was created.')
      const conflict: SemanticMergeConflict = { id: fingerprint({ path, base, ours, theirs }), path, kind: mergeKind(path, base, ours, theirs), base, ours, theirs, resolution: 'unresolved' }
      conflicts.push(conflict); return ours
    }
    const keyed = (items: unknown[]) => new Map(items.map(value => [arrayIdentity(value)!, value]))
    const baseMap = keyed(baseArray), oursMap = keyed(ours), theirsMap = keyed(theirs)
    // Retain authored base order, then append each side's additions in their
    // authored order. Sorting UUIDs used to reorder scenes and runtime tracks.
    const ids = [...new Set([...baseMap.keys(), ...oursMap.keys(), ...theirsMap.keys()])]
    return ids.flatMap(id => {
      const merged = semanticMergeValue(baseMap.get(id), oursMap.get(id), theirsMap.get(id), `${path}/${id.split('/').join('~1')}`, conflicts, autoMerged, state, depth + 1)
      return merged === undefined ? [] : [merged]
    })
  }
  if (conflicts.length >= MAX_CHANGES) throw new Error('Semantic merge conflict limit exceeded; no partial plan was created.')
  const conflict: SemanticMergeConflict = { id: fingerprint({ path, base, ours, theirs }), path, kind: mergeKind(path, base, ours, theirs), base, ours, theirs, resolution: 'unresolved' }
  conflicts.push(conflict)
  return ours
}

export function createSemanticMergePlan(baseSource: string, oursSource: string, theirsSource: string): SemanticMergePlan {
  const base = JSON.parse(stableProjectText(baseSource)) as Record<string, unknown>, ours = JSON.parse(stableProjectText(oursSource)) as Record<string, unknown>, theirs = JSON.parse(stableProjectText(theirsSource)) as Record<string, unknown>
  const conflicts: SemanticMergeConflict[] = [], autoMerged: string[] = []
  const merged = semanticMergeValue(base, ours, theirs, '', conflicts, autoMerged, { nodes: 0 }) as Record<string, unknown>
  const plan: SemanticMergePlan = { format: 'nova-semantic-merge', version: 1, merged, conflicts, autoMerged: [...new Set(autoMerged)].slice(0, MAX_CHANGES), fingerprint: fingerprint({ base, ours, theirs }) }
  teamWorkflowState.semanticMerge = plan
  return plan
}

function assignSemanticPath(root: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('/').filter(Boolean); let cursor: unknown = root
  for (let index = 0; index < parts.length - 1; index++) {
    const part = parts[index].split('~1').join('/')
    if (Array.isArray(cursor)) cursor = cursor.find(item => arrayIdentity(item) === part)
    else if (plain(cursor)) cursor = cursor[part]
    if (cursor === undefined) throw new Error(`Semantic merge path no longer exists: ${path}`)
  }
  const last = parts[parts.length - 1]; if (!last) throw new Error('Cannot replace the merge root.')
  const decodedLast = last.split('~1').join('/')
  if (Array.isArray(cursor)) {
    const index = cursor.findIndex(item => arrayIdentity(item) === decodedLast)
    if (index < 0) throw new Error(`Semantic merge identity is missing: ${decodedLast}`)
    if (value === undefined) cursor.splice(index, 1); else cursor[index] = value
  }
  else if (plain(cursor)) { if (value === undefined) delete cursor[decodedLast]; else cursor[decodedLast] = value }
  else throw new Error(`Semantic merge path is not assignable: ${path}`)
}

export function resolveSemanticMergeConflict(conflictId: string, resolution: 'ours' | 'theirs'): boolean {
  const plan = teamWorkflowState.semanticMerge, conflict = plan?.conflicts.find(item => item.id === conflictId)
  if (!plan || !conflict) return false
  assignSemanticPath(plan.merged, conflict.path, resolution === 'ours' ? conflict.ours : conflict.theirs)
  conflict.resolution = resolution
  return true
}

export function finalizeSemanticMerge(): string {
  const plan = teamWorkflowState.semanticMerge
  if (!plan) throw new Error('No semantic merge is active.')
  const unresolved = plan.conflicts.filter(conflict => conflict.resolution === 'unresolved')
  if (unresolved.length) throw new Error(`${unresolved.length} semantic conflicts still require a choice.`)
  const source = stableProjectText(plan.merged)
  const validation = validateProjectDocument(source)
  if (!validation.valid) throw new Error(`Merged project failed validation: ${validation.issues[0]?.message ?? 'unknown schema error'}`)
  return source
}

export function shareTeamBuildPreset(name: string, target: string, profile: string, settings: unknown): TeamBuildPreset | null {
  const cleanName = name.trim().slice(0, 120), cleanTarget = target.trim().slice(0, 40), cleanProfile = profile.trim().slice(0, 40)
  if (!cleanName || !cleanTarget || !cleanProfile) return null
  const preset = { id: crypto.randomUUID(), name: cleanName, target: cleanTarget, profile: cleanProfile, settings: `${JSON.stringify(normalized(settings), null, 2)}\n` }
  teamWorkflowState.sharedBuildPresets.unshift(preset)
  if (teamWorkflowState.sharedBuildPresets.length > 64) teamWorkflowState.sharedBuildPresets.splice(64)
  return preset
}

export function acquireBinaryAssetLock(path: string, owner: string, durationMinutes = 120): BinaryAssetLock | null {
  const cleanPath = path.trim().replace(/\\/g, '/').slice(0, 500), cleanOwner = owner.trim().slice(0, 120), now = Date.now()
  if (!cleanPath || !cleanOwner) return null
  const existing = teamWorkflowState.binaryLocks.find(lock => lock.path === cleanPath && lock.expiresAt > now)
  if (existing && existing.owner !== cleanOwner) return null
  const lock = { path: cleanPath, owner: cleanOwner, token: crypto.randomUUID(), expiresAt: now + Math.min(1_440, Math.max(5, durationMinutes)) * 60_000 }
  const index = teamWorkflowState.binaryLocks.findIndex(item => item.path === cleanPath)
  if (index >= 0) teamWorkflowState.binaryLocks.splice(index, 1, lock); else teamWorkflowState.binaryLocks.push(lock)
  return lock
}

export function releaseBinaryAssetLock(path: string, owner: string): boolean {
  const index = teamWorkflowState.binaryLocks.findIndex(lock => lock.path === path && lock.owner === owner)
  if (index < 0) return false
  teamWorkflowState.binaryLocks.splice(index, 1); return true
}

export function codeOwnersFile(): string {
  return teamWorkflowState.ownership.map(rule => `${rule.path} ${rule.owners.map(owner => `@${owner}`).join(' ')}`).join('\n') + (teamWorkflowState.ownership.length ? '\n' : '')
}

export function semanticProjectComparison(currentSource: string, incomingSource: string): Record<string, unknown> {
  const before = snapshot(currentSource), after = snapshot(incomingSource), added: string[] = [], removed: string[] = [], changed: string[] = []
  for (const [id, entry] of after) { const previous = before.get(id); if (!previous) added.push(entry.path); else if (previous.fingerprint !== entry.fingerprint) changed.push(entry.path) }
  for (const [id, entry] of before) if (!after.has(id)) removed.push(entry.path)
  return { format: 'nova-semantic-project-comparison', version: 1, added: added.sort(), removed: removed.sort(), changed: changed.sort(), binaryFilesComparedByIdentityOnly: true }
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
export function downloadCodeOwnersFile(): void { download('CODEOWNERS', codeOwnersFile()) }

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

export function inspectProjectLock(projectId: string): { locked: boolean; owner: string; expiresAt: number } {
  if (typeof localStorage === 'undefined') return { locked:false, owner:'', expiresAt:0 }
  try {
    const lock=JSON.parse(localStorage.getItem(lockStorageKey(projectId))??'null') as ProjectLock|null
    return lock&&lock.expiresAt>Date.now()&&lock.token!==teamWorkflowState.lockToken?{locked:true,owner:lock.owner,expiresAt:lock.expiresAt}:{locked:false,owner:'',expiresAt:0}
  } catch { return {locked:false,owner:'',expiresAt:0} }
}

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
