/** 团队协作数据：比较、审阅并合并项目修改，组织分支及冲突解决资料。 */
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
export interface SemanticMergeConflict { id: string; path: string; kind: 'scene' | 'graph' | 'asset' | 'settings' | 'project'; base: unknown; ours: unknown; theirs: unknown; resolution: 'unresolved' | 'ours' | 'theirs'; orderOnly?: boolean; siblingOrder?: string[] }
export interface SemanticMergePlan { format: 'nova-semantic-merge'; version: 1; merged: Record<string, unknown>; conflicts: SemanticMergeConflict[]; autoMerged: string[]; fingerprint: string; sourceFingerprint?: string }

interface SnapshotEntry { path: string; kind: SourceEntryKind; fingerprint: string }

const SETTINGS_KEY = 'nova_a.team_workflow.v1'
const LOCK_KEY_PREFIX = 'nova_a.project_lock.'
const MAX_CHANGES = 5_000
const MAX_MERGE_DEPTH = 64
const MAX_MERGE_NODES = 250_000
let sourceGeneration = 0
let lockedProjectId = ''

/** 结构说明（自动提取）：storedSettings；无显式参数；直接调用 JSON.parse、localStorage.getItem、read。 */ function storedSettings(): { enabled: boolean; networkOperations: boolean; diffTool: string; mergeTool: string; diffArguments: string; mergeArguments: string } {
  if (typeof localStorage === 'undefined') return { enabled: false, networkOperations: false, diffTool: '', mergeTool: '', diffArguments: '{left} {right}', mergeArguments: '{base} {ours} {theirs} {output}' }
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Record<string, unknown>
    const read = /* 根据 typeof value[key] === 'string' 的真假，分别返回 String(value[key]).slice(0, 1_024) 或 fallback。 */ (key: string, fallback = '') => typeof value[key] === 'string' ? String(value[key]).slice(0, 1_024) : fallback
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

/** 结构说明（自动提取）：normalized；输入 value；直接调用 Array.isArray、value.map、Object.create、sort、Object.keys 等；写入 output[…]；返回路径包含 value、output；包含循环处理。 */ function normalized(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalized)
  if (!value || typeof value !== 'object') return value
  const output: Record<string, unknown> = Object.create(null)
  for (const key of Object.keys(value as Record<string, unknown>).sort()) output[key] = normalized((value as Record<string, unknown>)[key])
  return output
}

/** Stable text keeps scene/prefab diffs reviewable without changing array order. */
/* 调用 canonicalProjectText(source) 并返回调用结果。 */ export function stableProjectText(source: string | unknown): string {
  return canonicalProjectText(source)
}

/** 结构说明（自动提取）：fingerprint；输入 value；直接调用 JSON.stringify、normalized、source.charCodeAt、Math.imul、padStart 等；写入 first、second；包含循环处理。 */ function fingerprint(value: unknown): string {
  const source = JSON.stringify(normalized(value)) ?? 'null'
  let first = 0x811c9dc5, second = 0x9e3779b9
  for (let index = 0; index < source.length; index++) {
    const code = source.charCodeAt(index)
    first = Math.imul(first ^ code, 0x01000193) >>> 0
    second = Math.imul(second ^ code, 0x85ebca6b) >>> 0
  }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`
}

/** 结构说明（自动提取）：snapshot；输入 source；直接调用 JSON.parse、Map、output.set、fingerprint、Array.isArray 等；返回路径包含 output；包含循环处理。 */ function snapshot(source: string): Map<string, SnapshotEntry> {
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

/** 结构说明（自动提取）：markSourceBaseline；输入 source；直接调用 stableProjectText、teamWorkflowState.changes.splice、teamWorkflowState.conflicts.splice；写入 teamWorkflowState.baseline、teamWorkflowState.status。 */ export function markSourceBaseline(source: string): void {
  teamWorkflowState.baseline = stableProjectText(source)
  sourceGeneration++
  teamWorkflowState.changes.splice(0)
  teamWorkflowState.conflicts.splice(0)
  teamWorkflowState.status = 'clean'
}

/** 结构说明（自动提取）：refreshSourceStatus；输入 currentSource；直接调用 markSourceBaseline、snapshot、before.get、changes.push、after.has 等；写入 teamWorkflowState.status、list.stale；返回路径包含 changes；包含循环处理。 */ export function refreshSourceStatus(currentSource: string): SourceChange[] {
  if (!teamWorkflowState.baseline) { markSourceBaseline(currentSource); return [] }
  const before = snapshot(teamWorkflowState.baseline), after = snapshot(currentSource), changes: SourceChange[] = []
  for (const [id, entry] of after) {
    const previous = before.get(id)
    if (!previous) changes.push({ id, path: entry.path, kind: entry.kind, change: 'added' })
    else if (previous.fingerprint !== entry.fingerprint) changes.push({ id, path: entry.path, kind: entry.kind, change: 'modified' })
  }
  for (const [id, entry] of before) if (!after.has(id)) changes.push({ id, path: entry.path, kind: entry.kind, change: 'deleted' })
  changes.sort(/* 调用 a.path.localeCompare(b.path) 并返回调用结果。 */ (a, b) => a.path.localeCompare(b.path))
  teamWorkflowState.changes.splice(0, teamWorkflowState.changes.length, ...changes.slice(0, MAX_CHANGES))
  teamWorkflowState.operationSummary.splice(0, teamWorkflowState.operationSummary.length, ...changes.slice(0, 100).map(/** 按模板 `${change.change.toUpperCase()} ${change.path}` 生成并返回字符串。 */ change => `${change.change.toUpperCase()} ${change.path}`))
  teamWorkflowState.status = changes.length ? 'changes' : 'clean'
  const currentFingerprint = fingerprint(JSON.parse(stableProjectText(currentSource)))
  for (const list of teamWorkflowState.changeLists) list.stale = list.currentFingerprint !== currentFingerprint
  return changes
}

/** 结构说明（自动提取）：sourceStatusFor；输入 id；直接调用 teamWorkflowState.changes.find。 */ export function sourceStatusFor(id: string): SourceChangeKind | null {
  return teamWorkflowState.changes.find(/* 比较 change.id 与 id，返回严格相等的判断结果。 */ change => change.id === id)?.change ?? null
}

/** 结构说明（自动提取）：sourceEntry；输入 project、change；直接调用 find、Array.isArray；返回路径包含 project.projectSettings。 */ function sourceEntry(project: Record<string, unknown>, change: SourceChange): unknown {
  if (change.kind === 'project') return { projectFormat: project.projectFormat, formatVersion: project.formatVersion, engineVersion: project.engineVersion, activeSceneUuid: project.activeSceneUuid, manifest: project.manifest, projectMetadata: project.projectMetadata }
  if (change.kind === 'settings') return project.projectSettings
  if (change.kind === 'packages') return { packages: project.packages, plugins: project.plugins }
  if (change.kind === 'scene') return (Array.isArray(project.scenes) ? project.scenes : []).find(/* 先计算 item && typeof item === 'object'；仅当其为真值时求右侧 (item as Record<string, unknown>).uuid === change.id，返回短路求值结果。 */ (item: unknown) => item && typeof item === 'object' && (item as Record<string, unknown>).uuid === change.id)
  return (Array.isArray(project.assets) ? project.assets : []).find(/* 先计算 item && typeof item === 'object'；仅当其为真值时求右侧 (item as Record<string, unknown>).uuid === change.id，返回短路求值结果。 */ (item: unknown) => item && typeof item === 'object' && (item as Record<string, unknown>).uuid === change.id)
}

/** 结构说明（自动提取）：sourceDiffFor；输入 id、currentSource；直接调用 teamWorkflowState.changes.find、JSON.parse、stableProjectText、format、sourceEntry。 */ export function sourceDiffFor(id: string, currentSource: string): { path: string; before: string; after: string } | null {
  const change = teamWorkflowState.changes.find(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id)
  if (!change) return null
  const beforeProject = JSON.parse(teamWorkflowState.baseline || currentSource) as Record<string, unknown>, afterProject = JSON.parse(stableProjectText(currentSource)) as Record<string, unknown>
  const format = /* 根据 value === undefined 的真假，分别返回 '(missing)' 或 `${JSON.stringify(normalized(value), null, 2)}\n`。 */ (value: unknown) => value === undefined ? '(missing)' : `${JSON.stringify(normalized(value), null, 2)}\n`
  return { path: change.path, before: format(sourceEntry(beforeProject, change)), after: format(sourceEntry(afterProject, change)) }
}

/** 结构说明（自动提取）：detectIncomingConflicts；输入 currentSource、incomingSource；直接调用 snapshot、base.get、ours.get、conflicts.push、teamWorkflowState.conflicts.splice 等；返回路径包含 conflicts；包含循环处理。 */ export function detectIncomingConflicts(currentSource: string, incomingSource: string): SourceChange[] {
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

/** 结构说明（自动提取）：persistTeamWorkflowSettings；无显式参数；直接调用 localStorage.setItem、JSON.stringify、teamWorkflowState.diffTool.slice、teamWorkflowState.mergeTool.slice、teamWorkflowState.diffArguments.slice 等。 */ export function persistTeamWorkflowSettings(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    enabled: teamWorkflowState.enabled, networkOperations: teamWorkflowState.networkOperations,
    diffTool: teamWorkflowState.diffTool.slice(0, 1_024), mergeTool: teamWorkflowState.mergeTool.slice(0, 1_024),
    diffArguments: teamWorkflowState.diffArguments.slice(0, 1_024), mergeArguments: teamWorkflowState.mergeArguments.slice(0, 1_024)
  }))
}

/** 结构说明（自动提取）：teamWorkflowMetadata；无显式参数；直接调用 teamWorkflowState.ownership.map、teamWorkflowState.taskLinks.map、teamWorkflowState.changeNotes.map、teamWorkflowState.sharedBuildPresets.map、teamWorkflowState.binaryLocks.map。 */ export function teamWorkflowMetadata(): Record<string, unknown> {
  return {
    format: 'nova-team-workflow', version: 1, optional: true, cloudRequired: false,
    networkOperationsEnabled: teamWorkflowState.networkOperations,
    ownership: teamWorkflowState.ownership.map(/** 构造并返回记录 { path: rule.path, owners: [...rule.owners] }，字段按当前实参及捕获状态求值。 */ rule => ({ path: rule.path, owners: [...rule.owners] })),
    taskLinks: teamWorkflowState.taskLinks.map(/** 构造并返回记录 { ...link }，字段按当前实参及捕获状态求值。 */ link => ({ ...link })),
    changeNotes: teamWorkflowState.changeNotes.map(/** 构造并返回记录 { ...note }，字段按当前实参及捕获状态求值。 */ note => ({ ...note })),
    sharedBuildPresets: teamWorkflowState.sharedBuildPresets.map(/** 构造并返回记录 { ...preset }，字段按当前实参及捕获状态求值。 */ preset => ({ ...preset })),
    binaryLocks: teamWorkflowState.binaryLocks.map(/** 构造并返回记录 { path: lock.path, owner: lock.owner, expiresAt: new Date(lock.expiresAt).toISOString() }，字段按当前实参及捕获状态求值。 */ lock => ({ path: lock.path, owner: lock.owner, expiresAt: new Date(lock.expiresAt).toISOString() }))
  }
}

/** 结构说明（自动提取）：addOwnershipRule；输入 path、owners；直接调用 slice、replace、path.trim、Set、filter 等；写入 existing.owners。 */ export function addOwnershipRule(path: string, owners: string): boolean {
  const cleanPath = path.trim().replace(/\\/g, '/').slice(0, 500)
  const cleanOwners = [...new Set(owners.split(/[\s,]+/).map(/* 调用 owner.trim().replace(/^@/, '') 并返回调用结果。 */ owner => owner.trim().replace(/^@/, '')).filter(Boolean))].slice(0, 32)
  if (!cleanPath || !cleanOwners.length) return false
  const existing = teamWorkflowState.ownership.find(/* 比较 rule.path 与 cleanPath，返回严格相等的判断结果。 */ rule => rule.path === cleanPath)
  if (existing) existing.owners = cleanOwners; else teamWorkflowState.ownership.push({ path: cleanPath, owners: cleanOwners })
  return true
}

/** 结构说明（自动提取）：addTeamTaskLink；输入 id、url、summary；直接调用 slice、id.trim、url.trim、summary.trim、test 等。 */ export function addTeamTaskLink(id: string, url: string, summary: string): boolean {
  const cleanId = id.trim().slice(0, 80), cleanUrl = url.trim().slice(0, 500), cleanSummary = summary.trim().slice(0, 240)
  if (!cleanId || !/^(https?:\/\/|[A-Za-z]+-\d+$)/.test(cleanUrl || cleanId)) return false
  const entry = { id: cleanId, url: cleanUrl, summary: cleanSummary }
  const index = teamWorkflowState.taskLinks.findIndex(/* 比较 item.id 与 cleanId，返回严格相等的判断结果。 */ item => item.id === cleanId)
  if (index >= 0) teamWorkflowState.taskLinks.splice(index, 1, entry); else teamWorkflowState.taskLinks.unshift(entry)
  return true
}

/** 结构说明（自动提取）：addTeamChangeNote；输入 owner、note；直接调用 slice、owner.trim、note.trim、teamWorkflowState.changeNotes.unshift、crypto.randomUUID 等。 */ export function addTeamChangeNote(owner: string, note: string): boolean {
  const cleanOwner = owner.trim().slice(0, 120), cleanNote = note.trim().slice(0, 1_000)
  if (!cleanOwner || !cleanNote) return false
  teamWorkflowState.changeNotes.unshift({ id: crypto.randomUUID(), owner: cleanOwner, note: cleanNote, createdAt: new Date().toISOString() })
  if (teamWorkflowState.changeNotes.length > 256) teamWorkflowState.changeNotes.splice(256)
  return true
}

/** 结构说明（自动提取）：matchesOwnershipPath；输入 pattern、path；直接调用 replace、pattern.replace、test、RegExp。 */ function matchesOwnershipPath(pattern: string, path: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')
  try { return new RegExp(`^${escaped}$`, 'i').test(path) } catch { return pattern === path }
}

/** 结构说明（自动提取）：ownershipForPath；输入 path；直接调用 Set、flatMap、teamWorkflowState.ownership.filter。 */ export function ownershipForPath(path: string): string[] {
  return [...new Set(teamWorkflowState.ownership.filter(/* 调用 matchesOwnershipPath(rule.path, path) 并返回调用结果。 */ rule => matchesOwnershipPath(rule.path, path)).flatMap(/* 返回 rule.owners 的当前值。 */ rule => rule.owners))]
}

/** 结构说明（自动提取）：createTeamChangeList；输入 name、owner、changeIds、currentSource；直接调用 refreshSourceStatus、slice、name.trim、replace、owner.trim 等；写入 teamWorkflowState.activeChangeListId；返回路径包含 changeList。 */ export function createTeamChangeList(name: string, owner: string, changeIds: string[], currentSource: string): TeamChangeList | null {
  refreshSourceStatus(currentSource)
  const cleanName = name.trim().slice(0, 120), cleanOwner = owner.trim().replace(/^@/, '').slice(0, 120)
  const selected = teamWorkflowState.changes.filter(/* 调用 changeIds.includes(change.id) 并返回调用结果。 */ change => changeIds.includes(change.id)).slice(0, MAX_CHANGES)
  if (!cleanName || !cleanOwner || !selected.length) return null
  const denied = selected.filter(/** 结构说明（自动提取）：selected.filter 回调；输入 change；直接调用 ownershipForPath、owners.includes。 */ change => { const owners = ownershipForPath(change.path); return owners.length > 0 && !owners.includes(cleanOwner) })
  const changeList: TeamChangeList = {
    id: crypto.randomUUID(), name: cleanName, owner: cleanOwner, createdAt: new Date().toISOString(), status: denied.length ? 'open' : 'ready',
    changes: selected.map(/** 构造并返回记录 { ...change }，字段按当前实参及捕获状态求值。 */ change => ({ ...change })), noteIds: teamWorkflowState.changeNotes.filter(/* 比较 note.owner 与 cleanOwner，返回严格相等的判断结果。 */ note => note.owner === cleanOwner).map(/* 返回 note.id 的当前值。 */ note => note.id),
    fingerprint: fingerprint({ owner: cleanOwner, changes: selected.map(/** 构造并返回记录 { id: change.id, change: change.change, path: change.path }，字段按当前实参及捕获状态求值。 */ change => ({ id: change.id, change: change.change, path: change.path })) }),
    baseFingerprint: fingerprint(JSON.parse(teamWorkflowState.baseline || stableProjectText(currentSource))),
    currentFingerprint: fingerprint(JSON.parse(stableProjectText(currentSource))), generation: sourceGeneration, stale: false
  }
  teamWorkflowState.changeLists.unshift(changeList); if (teamWorkflowState.changeLists.length > 256) teamWorkflowState.changeLists.splice(256)
  teamWorkflowState.activeChangeListId = changeList.id
  return changeList
}

/* 比较 JSON.stringify(normalized(left)) 与 JSON.stringify(normalized(right))，返回严格相等的判断结果。 */ function same(left: unknown, right: unknown): boolean { return JSON.stringify(normalized(left)) === JSON.stringify(normalized(right)) }
/** 结构说明（自动提取）：mergeKind；输入 path、values；直接调用 path.startsWith、test、values.some。 */ function mergeKind(path: string, ...values: unknown[]): SemanticMergeConflict['kind'] {
  if (path.startsWith('/scenes/')) return 'scene'
  if (/(?:graph|visualGraph)/i.test(path) || values.some(/* 先计算 plain(value)；仅当其为真值时求右侧 /graph/i.test(String(value.assetType ?? value.type ?? ''))，返回短路求值结果。 */ value => plain(value) && /graph/i.test(String(value.assetType ?? value.type ?? '')))) return 'graph'
  return path.startsWith('/assets/') ? 'asset' : path.startsWith('/projectSettings') ? 'settings' : 'project'
}
/* 调用 Boolean(value && typeof value === 'object' && !Array.isArray(value)) 并返回调用结果。 */ function plain(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === 'object' && !Array.isArray(value)) }
/** 结构说明（自动提取）：arrayIdentity；输入 value；直接调用 plain、trim、String；包含循环处理。 */ function arrayIdentity(value: unknown): string | null {
  if (!plain(value)) return null
  for (const key of ['uuid', 'id', 'key', 'name']) if (typeof value[key] === 'string' && String(value[key]).trim()) return `${key}:${String(value[key])}`
  return null
}
/* 调用 value.replace(/~/g, '~0').replace(/\//g, '~1') 并返回调用结果。 */ function escapeSemanticPart(value: string): string { return value.replace(/~/g, '~0').replace(/\//g, '~1') }
/* 调用 value.replace(/~1/g, '/').replace(/~0/g, '~') 并返回调用结果。 */ function decodeSemanticPart(value: string): string { return value.replace(/~1/g, '/').replace(/~0/g, '~') }
/** 结构说明（自动提取）：weaveSemanticOrder；输入 preferred、additional；直接调用 Set、Map、seen.has、before.set、before.get 等；写入 pending；包含循环处理。 */ function weaveSemanticOrder(preferred: string[], additional: string[]): string[] {
  const seen = new Set(preferred), before = new Map<string, string[]>(); let pending: string[] = []
  for (const id of additional) {
    if (seen.has(id)) { if (pending.length) { before.set(id, [...(before.get(id) ?? []), ...pending]); pending = [] } }
    else { seen.add(id); pending.push(id) }
  }
  return preferred.flatMap(/* 返回按声明顺序构造的数组 [...(before.get(id) ?? []), id]。 */ id => [...(before.get(id) ?? []), id]).concat(pending)
}
/** 结构说明（自动提取）：semanticMergeValue；输入 base、ours、theirs、path、conflicts、autoMerged、state、depth；直接调用 Error、same、autoMerged.push、plain、Object.create 等；写入 output[…]；返回路径包含 ours、theirs、output；包含循环处理；包含显式抛错路径。 */ function semanticMergeValue(base: unknown, ours: unknown, theirs: unknown, path: string, conflicts: SemanticMergeConflict[], autoMerged: string[], state: { nodes: number }, depth = 0): unknown {
  state.nodes++
  if (depth > MAX_MERGE_DEPTH || state.nodes > MAX_MERGE_NODES) throw new Error('Semantic merge exceeds the safe depth or node limit.')
  if (same(ours, theirs)) return ours
  if (same(ours, base)) { autoMerged.push(path); return theirs }
  if (same(theirs, base)) { autoMerged.push(path); return ours }
  if (plain(ours) && plain(theirs) && (plain(base) || base === undefined)) {
    const source = plain(base) ? base : {}, output: Record<string, unknown> = Object.create(null)
    for (const key of [...new Set([...Object.keys(source), ...Object.keys(ours), ...Object.keys(theirs)])].sort()) {
      const merged = semanticMergeValue(Object.prototype.hasOwnProperty.call(source, key) ? source[key] : undefined, Object.prototype.hasOwnProperty.call(ours, key) ? ours[key] : undefined, Object.prototype.hasOwnProperty.call(theirs, key) ? theirs[key] : undefined, `${path}/${escapeSemanticPart(key)}`, conflicts, autoMerged, state, depth + 1)
      if (merged !== undefined) output[key] = merged
    }
    return output
  }
  if (Array.isArray(ours) && Array.isArray(theirs)) {
    const baseArray = Array.isArray(base) ? base : []
    const allIdentifiable = [...baseArray, ...ours, ...theirs].every(/* 比较 arrayIdentity(value) 与 null，返回严格不等的判断结果。 */ value => arrayIdentity(value) !== null)
    if (!allIdentifiable) {
      if (conflicts.length >= MAX_CHANGES) throw new Error('Semantic merge conflict limit exceeded; no partial plan was created.')
      const conflict: SemanticMergeConflict = { id: fingerprint({ path, base, ours, theirs }), path, kind: mergeKind(path, base, ours, theirs), base, ours, theirs, resolution: 'unresolved' }
      conflicts.push(conflict); return ours
    }
    const keyed = /** 结构说明（自动提取）：keyed；输入 items；直接调用 Map、arrayIdentity、result.has、Error、result.set；返回路径包含 result；包含循环处理；包含显式抛错路径。 */ (items: unknown[]) => {
      const result = new Map<string, unknown>()
      for (const value of items) { const id = arrayIdentity(value)!; if (result.has(id)) throw new Error('Duplicate semantic merge identity: ' + id); result.set(id, value) }
      return result
    }
    const baseMap = keyed(baseArray), oursMap = keyed(ours), theirsMap = keyed(theirs)
    const baseIds = [...baseMap.keys()], oursIds = [...oursMap.keys()], theirsIds = [...theirsMap.keys()]
    const common = baseIds.filter(/* 先计算 oursMap.has(id)；仅当其为真值时求右侧 theirsMap.has(id)，返回短路求值结果。 */ id => oursMap.has(id) && theirsMap.has(id))
    const commonSet = new Set(common)
    const retained = /* 调用 ids.filter(id => commonSet.has(id)) 并返回调用结果。 */ (ids: string[]) => ids.filter(/* 调用 commonSet.has(id) 并返回调用结果。 */ id => commonSet.has(id))
    const oursReordered = !same(retained(oursIds), common), theirsReordered = !same(retained(theirsIds), common)
    const sharedNew = oursIds.filter(/* 先计算 !baseMap.has(id)；仅当其为真值时求右侧 theirsMap.has(id)，返回短路求值结果。 */ id => !baseMap.has(id) && theirsMap.has(id)), shared = new Set([...common, ...sharedNew])
    const orderConflict = oursReordered && theirsReordered && !same(retained(oursIds), retained(theirsIds)) || sharedNew.length > 0 && !same(oursIds.filter(/* 调用 shared.has(id) 并返回调用结果。 */ id => shared.has(id)), theirsIds.filter(/* 调用 shared.has(id) 并返回调用结果。 */ id => shared.has(id)))
    // A one-sided reorder remains authoritative even when the other side edits values.
    const preferred = theirsReordered && !oursReordered ? theirsIds : oursReordered ? oursIds : baseIds
    const ids = weaveSemanticOrder(weaveSemanticOrder(weaveSemanticOrder(preferred, oursIds), theirsIds), baseIds)
    const result = ids.flatMap(/** 结构说明（自动提取）：ids.flatMap 回调；输入 id；直接调用 escapeSemanticPart、semanticMergeValue、baseMap.get、oursMap.get、theirsMap.get；写入 conflict.siblingOrder。 */ id => {
      const childPath = path + '/' + escapeSemanticPart(id)
      const conflictStart = conflicts.length
      const merged = semanticMergeValue(baseMap.get(id), oursMap.get(id), theirsMap.get(id), childPath, conflicts, autoMerged, state, depth + 1)
      const conflict = conflicts[conflictStart]
      if (conflict?.path === childPath) conflict.siblingOrder = ids
      return merged === undefined ? [] : [merged]
    })
    if (orderConflict) {
      if (conflicts.length >= MAX_CHANGES) throw new Error('Semantic merge conflict limit exceeded.')
      conflicts.push({ id: fingerprint({ path, order: true, baseIds, oursIds, theirsIds }), path, kind: mergeKind(path), base: baseIds, ours: weaveSemanticOrder(oursIds, ids), theirs: weaveSemanticOrder(theirsIds, ids), resolution: 'unresolved', orderOnly: true })
    }
    return result
  }
  if (conflicts.length >= MAX_CHANGES) throw new Error('Semantic merge conflict limit exceeded; no partial plan was created.')
  const conflict: SemanticMergeConflict = { id: fingerprint({ path, base, ours, theirs }), path, kind: mergeKind(path, base, ours, theirs), base, ours, theirs, resolution: 'unresolved' }
  conflicts.push(conflict)
  return ours
}

/** 结构说明（自动提取）：createSemanticMergePlan；输入 baseSource、oursSource、theirsSource；直接调用 JSON.parse、stableProjectText、pending.pop、Error、Array.isArray 等；写入 teamWorkflowState.semanticMerge；返回路径包含 plan；包含循环处理；包含显式抛错路径。 */ export function createSemanticMergePlan(baseSource: string, oursSource: string, theirsSource: string): SemanticMergePlan {
  const base = JSON.parse(stableProjectText(baseSource)) as Record<string, unknown>, ours = JSON.parse(stableProjectText(oursSource)) as Record<string, unknown>, theirs = JSON.parse(stableProjectText(theirsSource)) as Record<string, unknown>
  for (const root of [base, ours, theirs]) {
    const pending: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 0 }]; let nodes = 0
    while (pending.length) {
      const { value, depth } = pending.pop()!
      if (++nodes > MAX_MERGE_NODES || depth > MAX_MERGE_DEPTH) throw new Error('Semantic merge exceeds the safe depth or node limit.')
      if (Array.isArray(value)) {
        const identities = value.map(arrayIdentity)
        if (identities.every(/* 比较 id 与 null，返回严格不等的判断结果。 */ id => id !== null) && new Set(identities).size !== identities.length) throw new Error('Duplicate semantic merge identity.')
        for (const child of value) pending.push({ value: child, depth: depth + 1 })
      } else if (plain(value)) for (const child of Object.values(value)) pending.push({ value: child, depth: depth + 1 })
    }
  }
  const conflicts: SemanticMergeConflict[] = [], autoMerged: string[] = []
  const merged = semanticMergeValue(base, ours, theirs, '', conflicts, autoMerged, { nodes: 0 }) as Record<string, unknown>
  const plan: SemanticMergePlan = { format: 'nova-semantic-merge', version: 1, merged, conflicts, autoMerged: [...new Set(autoMerged)].slice(0, MAX_CHANGES), fingerprint: fingerprint({ base, ours, theirs }), sourceFingerprint: fingerprint(ours) }
  teamWorkflowState.semanticMerge = plan
  return plan
}

/** 结构说明（自动提取）：assignSemanticPath；输入 root、path、value、conflict；直接调用 filter、path.split、decodeSemanticPart、Array.isArray、cursor.find 等；写入 cursor、cursor[…]；包含循环处理；包含显式抛错路径。 */ function assignSemanticPath(root: Record<string, unknown>, path: string, value: unknown, conflict: SemanticMergeConflict): void {
  const parts = path.split('/').filter(Boolean); let cursor: unknown = root
  for (let index = 0; index < parts.length - 1; index++) {
    const part = decodeSemanticPart(parts[index])
    if (Array.isArray(cursor)) cursor = cursor.find(/* 比较 arrayIdentity(item) 与 part，返回严格相等的判断结果。 */ item => arrayIdentity(item) === part)
    else if (plain(cursor)) cursor = cursor[part]
    if (cursor === undefined) throw new Error(`Semantic merge path no longer exists: ${path}`)
  }
  const last = parts[parts.length - 1]; if (!last) throw new Error('Cannot replace the merge root.')
  const decodedLast = decodeSemanticPart(last)
  if (Array.isArray(cursor)) {
    const index = cursor.findIndex(/* 比较 arrayIdentity(item) 与 decodedLast，返回严格相等的判断结果。 */ item => arrayIdentity(item) === decodedLast)
    if (index < 0) {
      if (value !== undefined) {
        const order = new Map((conflict.siblingOrder ?? []).map(/* 返回按声明顺序构造的数组 [id, index]。 */ (id, index) => [id, index])), rank = order.get(decodedLast) ?? order.size
        const before = cursor.findIndex(/* 比较 (order.get(arrayIdentity(item) ?? '') ?? order.size) 与 rank，返回大于的判断结果。 */ item => (order.get(arrayIdentity(item) ?? '') ?? order.size) > rank)
        cursor.splice(before < 0 ? cursor.length : before, 0, value)
      }
    } else if (value === undefined) cursor.splice(index, 1); else cursor[index] = value
  }
  else if (plain(cursor)) {
    if (conflict.orderOnly) {
      const array = cursor[decodedLast]
      if (!Array.isArray(array) || !Array.isArray(value)) throw new Error('Semantic order target is invalid.')
      const order = new Map(value.map(/* 返回按声明顺序构造的数组 [id, index]。 */ (id, index) => [id, index]))
      array.sort(/* 计算表达式 (order.get(arrayIdentity(left)) ?? value.length) - (order.get(arrayIdentity(right)) ?? value.length) 并返回结果，沿用操作数的原有类型规则。 */ (left, right) => (order.get(arrayIdentity(left)) ?? value.length) - (order.get(arrayIdentity(right)) ?? value.length))
    } else if (value === undefined) delete cursor[decodedLast]; else Object.defineProperty(cursor, decodedLast, { value, writable: true, enumerable: true, configurable: true })
  }
  else throw new Error(`Semantic merge path is not assignable: ${path}`)
}

/** 结构说明（自动提取）：resolveSemanticMergeConflict；输入 conflictId、resolution；直接调用 plan.conflicts.find、assignSemanticPath、JSON.parse、JSON.stringify、sibling.path.slice 等；写入 sibling.siblingOrder、conflict.resolution；包含循环处理。 */ export function resolveSemanticMergeConflict(conflictId: string, resolution: 'ours' | 'theirs'): boolean {
  const plan = teamWorkflowState.semanticMerge, conflict = plan?.conflicts.find(/* 比较 item.id 与 conflictId，返回严格相等的判断结果。 */ item => item.id === conflictId)
  if (!plan || !conflict) return false
  assignSemanticPath(plan.merged, conflict.path, JSON.parse(JSON.stringify({ value: resolution === 'ours' ? conflict.ours : conflict.theirs })).value, conflict)
  if (conflict.orderOnly) for (const sibling of plan.conflicts) if (sibling.siblingOrder && sibling.path.slice(0, sibling.path.lastIndexOf('/')) === conflict.path) sibling.siblingOrder = [...(resolution === 'ours' ? conflict.ours : conflict.theirs) as string[]]
  conflict.resolution = resolution
  return true
}

/** 结构说明（自动提取）：finalizeSemanticMerge；输入 currentSource；直接调用 Error、fingerprint、JSON.parse、stableProjectText、plan.conflicts.filter 等；返回路径包含 source；包含显式抛错路径。 */ export function finalizeSemanticMerge(currentSource?: string): string {
  const plan = teamWorkflowState.semanticMerge
  if (!plan) throw new Error('No semantic merge is active.')
  if (currentSource !== undefined && plan.sourceFingerprint !== fingerprint(JSON.parse(stableProjectText(currentSource)))) throw new Error('The project changed during merge review. Import the incoming project again to refresh the preview.')
  const unresolved = plan.conflicts.filter(/* 比较 conflict.resolution 与 'unresolved'，返回严格相等的判断结果。 */ conflict => conflict.resolution === 'unresolved')
  if (unresolved.length) throw new Error(`${unresolved.length} semantic conflicts still require a choice.`)
  const source = stableProjectText(plan.merged)
  const validation = validateProjectDocument(source)
  if (!validation.valid) throw new Error(`Merged project failed validation: ${validation.issues[0]?.message ?? 'unknown schema error'}`)
  return source
}

/** 结构说明（自动提取）：shareTeamBuildPreset；输入 name、target、profile、settings；直接调用 slice、name.trim、target.trim、profile.trim、crypto.randomUUID 等；返回路径包含 preset。 */ export function shareTeamBuildPreset(name: string, target: string, profile: string, settings: unknown): TeamBuildPreset | null {
  const cleanName = name.trim().slice(0, 120), cleanTarget = target.trim().slice(0, 40), cleanProfile = profile.trim().slice(0, 40)
  if (!cleanName || !cleanTarget || !cleanProfile) return null
  const preset = { id: crypto.randomUUID(), name: cleanName, target: cleanTarget, profile: cleanProfile, settings: `${JSON.stringify(normalized(settings), null, 2)}\n` }
  teamWorkflowState.sharedBuildPresets.unshift(preset)
  if (teamWorkflowState.sharedBuildPresets.length > 64) teamWorkflowState.sharedBuildPresets.splice(64)
  return preset
}

/** 结构说明（自动提取）：acquireBinaryAssetLock；输入 path、owner、durationMinutes；直接调用 slice、replace、path.trim、owner.trim、Date.now 等；返回路径包含 lock。 */ export function acquireBinaryAssetLock(path: string, owner: string, durationMinutes = 120): BinaryAssetLock | null {
  const cleanPath = path.trim().replace(/\\/g, '/').slice(0, 500), cleanOwner = owner.trim().slice(0, 120), now = Date.now()
  if (!cleanPath || !cleanOwner) return null
  const existing = teamWorkflowState.binaryLocks.find(/* 先计算 lock.path === cleanPath；仅当其为真值时求右侧 lock.expiresAt > now，返回短路求值结果。 */ lock => lock.path === cleanPath && lock.expiresAt > now)
  if (existing && existing.owner !== cleanOwner) return null
  const lock = { path: cleanPath, owner: cleanOwner, token: crypto.randomUUID(), expiresAt: now + Math.min(1_440, Math.max(5, durationMinutes)) * 60_000 }
  const index = teamWorkflowState.binaryLocks.findIndex(/* 比较 item.path 与 cleanPath，返回严格相等的判断结果。 */ item => item.path === cleanPath)
  if (index >= 0) teamWorkflowState.binaryLocks.splice(index, 1, lock); else teamWorkflowState.binaryLocks.push(lock)
  return lock
}

/** 结构说明（自动提取）：releaseBinaryAssetLock；输入 path、owner；直接调用 teamWorkflowState.binaryLocks.findIndex、teamWorkflowState.binaryLocks.splice。 */ export function releaseBinaryAssetLock(path: string, owner: string): boolean {
  const index = teamWorkflowState.binaryLocks.findIndex(/* 先计算 lock.path === path；仅当其为真值时求右侧 lock.owner === owner，返回短路求值结果。 */ lock => lock.path === path && lock.owner === owner)
  if (index < 0) return false
  teamWorkflowState.binaryLocks.splice(index, 1); return true
}

/** 结构说明（自动提取）：codeOwnersFile；无显式参数；直接调用 join、teamWorkflowState.ownership.map。 */ export function codeOwnersFile(): string {
  return teamWorkflowState.ownership.map(/** 按模板 `${rule.path} ${rule.owners.map(owner => `@${owner}`).join(' ')}` 生成并返回字符串。 */ rule => `${rule.path} ${rule.owners.map(/** 按模板 `@${owner}` 生成并返回字符串。 */ owner => `@${owner}`).join(' ')}`).join('\n') + (teamWorkflowState.ownership.length ? '\n' : '')
}

/** 结构说明（自动提取）：semanticProjectComparison；输入 currentSource、incomingSource；直接调用 snapshot、before.get、added.push、changed.push、after.has 等；包含循环处理。 */ export function semanticProjectComparison(currentSource: string, incomingSource: string): Record<string, unknown> {
  const before = snapshot(currentSource), after = snapshot(incomingSource), added: string[] = [], removed: string[] = [], changed: string[] = []
  for (const [id, entry] of after) { const previous = before.get(id); if (!previous) added.push(entry.path); else if (previous.fingerprint !== entry.fingerprint) changed.push(entry.path) }
  for (const [id, entry] of before) if (!after.has(id)) removed.push(entry.path)
  return { format: 'nova-semantic-project-comparison', version: 1, added: added.sort(), removed: removed.sort(), changed: changed.sort(), binaryFilesComparedByIdentityOnly: true }
}

/** 结构说明（自动提取）：novaIgnoreFile；无显式参数；直接调用 join。 */ export function novaIgnoreFile(): string {
  return ['# Nova_A generated/disposable data (regenerated; never hand-edit)', '.nova/cache/', '.nova/imported/', '.nova/build-cache/', '.nova/diagnostics/', 'Builds/', '*.nova-user', '', '# Binary locks are optional and team-controlled', '*.nova-lock', '', '# Keep authoritative project sources and deterministic package locks', '!project.nova', '!Packages.lock'].join('\n') + '\n'
}

/** 结构说明（自动提取）：novaPreCommitHook；无显式参数；直接调用 join。 */ export function novaPreCommitHook(): string {
  return ['#!/bin/sh', 'set -eu', 'pnpm nova validate --project project.nova --jsonl', 'pnpm package:validate -- --manifest Packages/manifest.json --jsonl 2>/dev/null || true', 'git diff --check'].join('\n') + '\n'
}

/** 结构说明（自动提取）：novaCiValidationTemplate；无显式参数；直接调用 join。 */ export function novaCiValidationTemplate(): string {
  return ['name: Nova_A validation', 'on: [push, pull_request]', 'jobs:', '  validate:', '    runs-on: windows-latest', '    steps:', '      - uses: actions/checkout@v4', '      - uses: pnpm/action-setup@v4', '        with: { version: 10.30.0 }', '      - uses: actions/setup-node@v4', '        with: { node-version: 20, cache: pnpm }', '      - run: pnpm install --frozen-lockfile', '      - run: pnpm nova validate --project project.nova --jsonl', '      - run: pnpm check', '      - run: cargo test --workspace --all-targets'].join('\n') + '\n'
}

/** 结构说明（自动提取）：download；输入 name、contents、type；直接调用 URL.createObjectURL、Blob、document.createElement、anchor.click、window.setTimeout；写入 anchor.href、anchor.download。 */ function download(name: string, contents: string, type = 'text/plain'): void {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click()
  window.setTimeout(/* 调用 URL.revokeObjectURL(url) 并返回调用结果。 */ () => URL.revokeObjectURL(url), 0)
}

/** 结构说明（自动提取）：textBase64；输入 value；直接调用 encode、TextEncoder、String.fromCharCode、bytes.subarray、btoa；写入 offset、binary；包含循环处理。 */ function textBase64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  return btoa(binary)
}

/** 执行时调用 download('.gitignore', novaIgnoreFile())；不显式返回调用结果。 */ export function downloadNovaIgnoreFile(): void { download('.gitignore', novaIgnoreFile()) }
/** 执行时调用 download('pre-commit', novaPreCommitHook())；不显式返回调用结果。 */ export function downloadPreCommitHook(): void { download('pre-commit', novaPreCommitHook()) }
/** 执行时调用 download('nova-validation.yml', novaCiValidationTemplate(), 'text/yaml')；不显式返回调用结果。 */ export function downloadCiValidationTemplate(): void { download('nova-validation.yml', novaCiValidationTemplate(), 'text/yaml') }
/** 执行时调用 download('CODEOWNERS', codeOwnersFile())；不显式返回调用结果。 */ export function downloadCodeOwnersFile(): void { download('CODEOWNERS', codeOwnersFile()) }

/** 结构说明（自动提取）：initializeGitRepository；输入 projectDirectory；直接调用 projectDirectory.trim、Error、invoke、novaIgnoreFile、novaPreCommitHook 等；等待异步结果；包含显式抛错路径。 */ export async function initializeGitRepository(projectDirectory: string): Promise<string> {
  const directory = projectDirectory.trim()
  if (!directory) throw new Error('Choose an existing project directory before initializing Git.')
  if (!('__TAURI_INTERNALS__' in window)) throw new Error('Repository initialization is available in the desktop editor. The generated templates can still be downloaded in a browser.')
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<string>('initialize_git_repository', { projectDirectory: directory, ignoreContents: novaIgnoreFile(), preCommitContents: novaPreCommitHook(), ciContents: novaCiValidationTemplate() })
}

/* 先计算 teamWorkflowState.incomingSource；仅当其为假值时求右侧 null，返回短路求值结果。 */ export function incomingProjectSource(): string | null { return teamWorkflowState.incomingSource || null }

/** 结构说明（自动提取）：openExternalDiff；输入 currentSource；直接调用 teamWorkflowState.diffTool.trim、invoke、textBase64、stableProjectText、download；等待异步结果。 */ export async function openExternalDiff(currentSource: string): Promise<void> {
  const baseline = teamWorkflowState.baseline || currentSource
  if ('__TAURI_INTERNALS__' in window && teamWorkflowState.diffTool.trim()) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('open_external_diff', { request: { executable: teamWorkflowState.diffTool, arguments: teamWorkflowState.diffArguments, left: textBase64(baseline), right: textBase64(stableProjectText(currentSource)) } })
    return
  }
  download('project.saved.nova', baseline, 'application/json')
  download('project.current.nova', stableProjectText(currentSource), 'application/json')
}

/** 结构说明（自动提取）：setIncomingProject；输入 currentSource、incomingSource、fileName；直接调用 stableProjectText、fileName.slice、detectIncomingConflicts；写入 teamWorkflowState.incomingSource、teamWorkflowState.incomingFileName。 */ export function setIncomingProject(currentSource: string, incomingSource: string, fileName: string): SourceChange[] {
  const stableIncoming = stableProjectText(incomingSource)
  teamWorkflowState.incomingSource = stableIncoming
  teamWorkflowState.incomingFileName = fileName.slice(0, 180)
  return detectIncomingConflicts(currentSource, stableIncoming)
}

/** 结构说明（自动提取）：openExternalMerge；输入 currentSource；直接调用 stableProjectText、Error、teamWorkflowState.mergeTool.trim、invoke、textBase64 等；等待异步结果；包含显式抛错路径。 */ export async function openExternalMerge(currentSource: string): Promise<void> {
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

/** 按模板 `${LOCK_KEY_PREFIX}${projectId.slice(0, 128)}` 生成并返回字符串。 */ function lockStorageKey(projectId: string): string { return `${LOCK_KEY_PREFIX}${projectId.slice(0, 128)}` }

/** 结构说明（自动提取）：inspectProjectLock；输入 projectId；直接调用 JSON.parse、localStorage.getItem、lockStorageKey、Date.now。 */ export function inspectProjectLock(projectId: string): { locked: boolean; owner: string; expiresAt: number } {
  if (typeof localStorage === 'undefined') return { locked:false, owner:'', expiresAt:0 }
  try {
    const lock=JSON.parse(localStorage.getItem(lockStorageKey(projectId))??'null') as ProjectLock|null
    return lock&&lock.expiresAt>Date.now()&&lock.token!==teamWorkflowState.lockToken?{locked:true,owner:lock.owner,expiresAt:lock.expiresAt}:{locked:false,owner:'',expiresAt:0}
  } catch { return {locked:false,owner:'',expiresAt:0} }
}

/** 结构说明（自动提取）：acquireProjectLock；输入 projectId、owner、durationMinutes；直接调用 lockStorageKey、Date.now、JSON.parse、localStorage.getItem、crypto.randomUUID 等；写入 teamWorkflowState.status、lockedProjectId、teamWorkflowState.lockToken、teamWorkflowState.lockExpiresAt。 */ export function acquireProjectLock(projectId: string, owner: string, durationMinutes = 120): boolean {
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
  localStorage.setItem(key, JSON.stringify(lock))
  if (lockedProjectId && lockStorageKey(lockedProjectId) !== key) releaseProjectLock(lockedProjectId)
  lockedProjectId = projectId
  teamWorkflowState.lockToken = token; teamWorkflowState.lockExpiresAt = lock.expiresAt; teamWorkflowState.status = 'locked-by-me'
  return true
}

/** 结构说明（自动提取）：releaseProjectLock；输入 projectId；直接调用 lockStorageKey、JSON.parse、localStorage.getItem、localStorage.removeItem；写入 lockedProjectId、teamWorkflowState.lockToken、teamWorkflowState.lockExpiresAt、teamWorkflowState.status。 */ export function releaseProjectLock(projectId: string): void {
  if (typeof localStorage === 'undefined' || !teamWorkflowState.lockToken || !lockedProjectId) return
  const key = lockStorageKey(projectId)
  if (key !== lockStorageKey(lockedProjectId)) return
  try {
    const lock = JSON.parse(localStorage.getItem(key) ?? 'null') as ProjectLock | null
    if (lock?.token === teamWorkflowState.lockToken) localStorage.removeItem(key)
  } catch { /* Unreadable storage cannot establish ownership; never remove it. */ }
  finally { lockedProjectId = ''; teamWorkflowState.lockToken = ''; teamWorkflowState.lockExpiresAt = 0; teamWorkflowState.status = '' }
}

// A normal reload/close destroys this document's in-memory token. Release only
// its exact lease first; cached pages retain their token and must keep the lease.
// Do not persist ownership credentials in sessionStorage, which tabs can clone.
if (typeof window !== 'undefined') window.addEventListener('pagehide', /** 结构说明（自动提取）：window.addEventListener 回调；输入 event；直接调用 releaseProjectLock。 */ (event: PageTransitionEvent) => {
  if (!event.persisted && lockedProjectId) releaseProjectLock(lockedProjectId)
})

/** 结构说明（自动提取）：downloadProjectLock；输入 projectId、owner；直接调用 owner.slice、toISOString、Date、download、JSON.stringify。 */ export function downloadProjectLock(projectId: string, owner: string): void {
  const lock = { format: 'nova-project-lock', version: 1, projectId, owner: owner.slice(0, 120), token: teamWorkflowState.lockToken, expiresAt: new Date(teamWorkflowState.lockExpiresAt).toISOString() }
  download(`${projectId}.nova-lock`, `${JSON.stringify(lock, null, 2)}\n`, 'application/json')
}
