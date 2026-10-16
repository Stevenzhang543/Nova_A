/** Fixed-World script debugger. Algorithms remain the original closure functions. */
import { snapshotPath, snapshotPreview, snapshotValueType, snapshotComparison } from './dynamicInspection'
import type { GameplayScriptServices } from './scriptServices'
export interface DebugFrame {
  entityUuid: string
  entityName: string
  scriptUuid: string
  functionName: string
  line: number
  sourcePath?: string
  depth?: number
  sourceRevision?: string
  sessionRevision?: number
  pauseId?: number
}

export interface DebugWatch { id: number; expression: string; value: string; error: string | null; valueType?: string }
export type DebugStepMode = 'continue' | 'into' | 'over' | 'out'
export type DebugExceptionPolicy = 'never' | 'uncaught' | 'all'
export interface DebugTask { id: string; name: string; state: 'queued' | 'running' | 'waiting' | 'completed' | 'cancelled' | 'failed'; entityUuid: string; detail: string }
export interface RemoteDebugPeer { id: string; address: string; authenticated: boolean; connectedAt: string; playerVersion: string }
export interface DebugSourceMapping { generatedLine: number; generatedColumn: number; sourcePath: string; sourceLine: number; sourceColumn: number }
export interface DebugSourceMap { mappings: DebugSourceMapping[]; diagnostics: string[] }
export type DebugProtocolRequest =
  | { id: string; method: 'initialize'; tokenHash: string; playerVersion: string; address: string }
  | { id: string; method: 'threads' }
  | { id: string; method: 'stackTrace' }
  | { id: string; method: 'scopes'; frame: number }
  | { id: string; method: 'evaluate'; expression: string; frame: number }
  | { id: string; method: 'cancelTask'; taskId: string }
  | { id: string; method: 'continue' | 'next' | 'stepIn' | 'stepOut' }
export interface ScriptTestResult {
  script: string
  test: string
  passed: boolean
  skipped: boolean
  durationMs: number
  seed: number
  caseName: string
  tags: string[]
  message: string
}


export interface DebugHost { continue(): void; step(mode: Exclude<DebugStepMode, 'continue'>): void; cancelTask(id: string): boolean }
export const DEBUG_CAPABILITIES = Object.freeze({ vmSuspension: false, vmStack: false, vmLocals: false, callbackBreakpoints: true, callbackStep: true, commandReplayStep: true, snapshotWatches: true, caughtExceptionPause: false })
export interface ScriptDebugWorld { readonly entities: readonly unknown[] }
export function createInitialScriptDebugState() { return {
  enabled: true,
  paused: false,
  reason: '',
  stepMode: 'continue' as DebugStepMode,
  pauseCount: 0,
  sessionRevision: 0,
  selectedFrame: 0,
  exceptionPolicy: 'uncaught' as DebugExceptionPolicy,
  callStack: [] as DebugFrame[],
  locals: {} as Record<string, unknown>,
  watches: [] as DebugWatch[],
  testResults: [] as ScriptTestResult[],
  lastSignal: null as null | { name: string; source: string; target: string },
  hotReload: { status: 'idle' as 'idle' | 'pending' | 'applied' | 'rejected' | 'disabled', scriptUuid: '', message: '', frame: 0 },
  tasks: [] as DebugTask[],
  remotePeer: null as RemoteDebugPeer | null,
  remoteAudit: [] as Array<{ at: string; event: string; accepted: boolean; detail: string }>,
  inspectedPath: '',
  inspectedValue: '—',
  revision: 0
} }
export type ScriptDebugState = ReturnType<typeof createInitialScriptDebugState>
export function debugSourceRevision(source: string): string { let hash = 2166136261; for (let index = 0; index < source.length; index++) hash = Math.imul(hash ^ source.charCodeAt(index), 16777619); return `${source.length}:${(hash >>> 0).toString(16)}` }

export function normalizeDebugSourceMap(value: unknown): DebugSourceMap {
  const diagnostics: string[] = [], mappings: DebugSourceMapping[] = []
  const source = value && typeof value === 'object' ? value as { mappings?: unknown } : null
  if (!Array.isArray(source?.mappings)) return { mappings, diagnostics: ['NOVA-DEBUG-SOURCEMAP: mappings must be an array.'] }
  for (const [index, raw] of source.mappings.slice(0, 50_000).entries()) {
    if (!raw || typeof raw !== 'object') { diagnostics.push(`NOVA-DEBUG-SOURCEMAP: mapping ${index} is not an object.`); continue }
    const item = raw as Record<string, unknown>, generatedLine = Number(item.generatedLine), generatedColumn = Number(item.generatedColumn), sourceLine = Number(item.sourceLine), sourceColumn = Number(item.sourceColumn), sourcePath = typeof item.sourcePath === 'string' ? item.sourcePath.replace(/\\/g, '/').slice(0, 1_024) : ''
    if (![generatedLine, generatedColumn, sourceLine, sourceColumn].every(Number.isFinite) || generatedLine < 1 || sourceLine < 1 || generatedColumn < 0 || sourceColumn < 0) { diagnostics.push(`NOVA-DEBUG-SOURCEMAP: mapping ${index} has an invalid finite one-based location.`); continue }
    if (!sourcePath || sourcePath.startsWith('/') || /^[A-Za-z]:\//.test(sourcePath) || sourcePath.split('/').includes('..')) { diagnostics.push(`NOVA-DEBUG-SOURCEMAP: mapping ${index} has an unsafe source path.`); continue }
    mappings.push({ generatedLine: Math.round(generatedLine), generatedColumn: Math.round(generatedColumn), sourcePath, sourceLine: Math.round(sourceLine), sourceColumn: Math.round(sourceColumn) })
  }
  if (source.mappings.length > 50_000) diagnostics.push('NOVA-DEBUG-SOURCEMAP: mapping limit exceeded; excess entries were ignored.')
  mappings.sort(/** 按生成行、列及来源路径依次稳定排序调试位置。 */ (first, second) => first.generatedLine - second.generatedLine || first.generatedColumn - second.generatedColumn || first.sourcePath.localeCompare(second.sourcePath))
  return { mappings, diagnostics: diagnostics.slice(0, 1_000) }
}

function scalar(value: string, root: unknown): unknown {
  const clean = value.trim()
  if (clean === 'true') return true
  if (clean === 'false') return false
  if (clean === 'null') return null
  if (/^-?\d+(?:\.\d+)?$/.test(clean)) return Number(clean)
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) return clean.slice(1, -1)
  return snapshotPath(root, clean)
}

export function evaluateDebugExpression(expression: string, root: unknown): unknown {
  if (expression.length > 512) throw new Error('Snapshot expressions are limited to 512 characters')
  const clean = expression.trim()
  const comparison = snapshotComparison(clean)
  if (!comparison) return scalar(clean, root)
  const left = scalar(comparison[0], root), right = scalar(comparison[2], root)
  if (comparison[1] === '===' || comparison[1] === '==') return left === right
  if (comparison[1] === '!==' || comparison[1] === '!=') return left !== right
  if ([left, right].some(/* 先计算 value !== null；仅当其为真值时求右侧 ['object', 'function', 'symbol'].includes(typeof value)，返回短路求值结果。 */ value => value !== null && ['object', 'function', 'symbol'].includes(typeof value))) throw new Error('Ordered comparisons require scalar values')
  const first = Number(left), second = Number(right)
  if (!Number.isFinite(first) || !Number.isFinite(second)) throw new Error('Ordered comparisons require finite numbers')
  if (comparison[1] === '>=') return first >= second
  if (comparison[1] === '<=') return first <= second
  if (comparison[1] === '>') return first > second
  return first < second
}

function secureTokenMatch(received: string, expected: string): boolean {
  const first = received.toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 128), second = expected.toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 128)
  let mismatch = first.length ^ second.length
  const length = Math.max(first.length, second.length)
  for (let index = 0; index < length; index++) mismatch |= (first.charCodeAt(index) || 0) ^ (second.charCodeAt(index) || 0)
  return second.length >= 32 && mismatch === 0
}
const evaluateSnapshotDebugExpression = evaluateDebugExpression
function createScriptDebugRuntime(scriptDebugState: ScriptDebugState) {
let nextWatchId = 1
let debugHost: DebugHost | null = null
let authenticatedToken = ''
function evaluateDebugExpression(expression: string, root: unknown = scriptDebugState.locals): unknown { return evaluateSnapshotDebugExpression(expression, root) }
function bindDebugHost(host: DebugHost | null): void { debugHost = host; if (!host) { disconnectRemoteDebugger(); scriptDebugState.tasks.splice(0); clearScriptDebugger() } }

function inspectDebugObject(path: string): void {
  scriptDebugState.inspectedPath = path.trim().slice(0, 160)
  try {
    const value = evaluateDebugExpression(scriptDebugState.inspectedPath)
    scriptDebugState.inspectedValue = `${snapshotValueType(value)} · ${snapshotPreview(value)}`
  } catch (error) { scriptDebugState.inspectedValue = error instanceof Error ? error.message : String(error) }
}

function addDebugWatch(expression: string): void {
  const clean = expression.trim().slice(0, 160)
  if (!clean || scriptDebugState.watches.some(/* 比较 watch.expression 与 clean，返回严格相等的判断结果。 */ watch => watch.expression === clean)) return
  scriptDebugState.watches.push({ id: nextWatchId++, expression: clean, value: '—', error: null })
  evaluateDebugWatches()
}

function removeDebugWatch(id: number): void {
  const index = scriptDebugState.watches.findIndex(/* 比较 watch.id 与 id，返回严格相等的判断结果。 */ watch => watch.id === id)
  if (index >= 0) scriptDebugState.watches.splice(index, 1)
}

function evaluateDebugWatches(): void {
  for (const watch of scriptDebugState.watches) {
    try {
      const value = evaluateDebugExpression(watch.expression)
      watch.value = typeof value === 'string' ? value.slice(0, 2048) + (value.length > 2048 ? '…[truncated]' : '') : snapshotPreview(value, 4096)
      watch.valueType = snapshotValueType(value)
      watch.error = null
    } catch (error) {
      watch.value = '—'
      watch.valueType = undefined
      watch.error = error instanceof Error ? error.message : String(error)
    }
  }
}

function pauseScriptDebugger(frame: DebugFrame, locals: Record<string, unknown>, reason: string): void {
  scriptDebugState.paused = true
  scriptDebugState.reason = reason
  // 旧回调不是当前调用栈；只保存宿主确实提供的这一个快照位置。
  scriptDebugState.callStack.splice(0, scriptDebugState.callStack.length, { ...frame, sessionRevision: scriptDebugState.sessionRevision, pauseId: scriptDebugState.pauseCount + 1 })
  scriptDebugState.locals = locals
  scriptDebugState.selectedFrame = 0
  scriptDebugState.pauseCount++
  scriptDebugState.revision++
  evaluateDebugWatches()
}

function clearScriptDebugger(): void {
  scriptDebugState.paused = false
  scriptDebugState.reason = ''
  scriptDebugState.callStack.splice(0)
  scriptDebugState.locals = {}
  scriptDebugState.selectedFrame = 0
  scriptDebugState.stepMode = 'continue'
  scriptDebugState.revision++
  evaluateDebugWatches()
}

function beginDebugSession(): void { disconnectRemoteDebugger(); scriptDebugState.tasks.splice(0); scriptDebugState.sessionRevision++; scriptDebugState.pauseCount = 0; clearScriptDebugger() }

function requestDebugStep(mode: DebugStepMode): void { scriptDebugState.stepMode = mode; scriptDebugState.revision++ }

function selectDebugFrame(index: number): void {
  scriptDebugState.selectedFrame = Math.min(Math.max(0, Math.round(index)), Math.max(0, scriptDebugState.callStack.length - 1))
  scriptDebugState.revision++
}

function updateDebugTask(task: DebugTask): void {
  const normalized = { ...task, id: task.id.slice(0, 128), name: task.name.slice(0, 160), entityUuid: task.entityUuid.slice(0, 128), detail: task.detail.slice(0, 1_024) }
  const index = scriptDebugState.tasks.findIndex(/* 比较 item.id 与 normalized.id，返回严格相等的判断结果。 */ item => item.id === normalized.id)
  if (index >= 0) scriptDebugState.tasks[index] = normalized
  else scriptDebugState.tasks.unshift(normalized)
  if (scriptDebugState.tasks.length > 512) scriptDebugState.tasks.splice(512)
}

function markDebugTaskCancelled(taskId: string, detail = 'Cancellation requested by debugger'): DebugTask | null {
  const task = scriptDebugState.tasks.find(/* 比较 item.id 与 taskId，返回严格相等的判断结果。 */ item => item.id === taskId)
  if (!task || !['queued', 'running', 'waiting'].includes(task.state)) return null
  updateDebugTask({ ...task, state: 'cancelled', detail: detail.slice(0, 1_024) })
  return task
}

function handleDebugProtocol(request: DebugProtocolRequest & { sessionRevision?: number; pauseId?: number }, policy: { enabled: boolean; expectedTokenHash: string; allowExportedPlayers: boolean }): { id: string; result?: unknown; error?: { code: string; message: string } } {
  if (request.method === 'initialize') {
    const local = request.address === '127.0.0.1' || request.address === '::1' || request.address === 'localhost'
    const accepted = policy.enabled && policy.allowExportedPlayers && local && secureTokenMatch(request.tokenHash, policy.expectedTokenHash)
    scriptDebugState.remoteAudit.unshift({ at: new Date().toISOString(), event: 'initialize', accepted, detail: `${request.address} · ${request.playerVersion}` })
    if (scriptDebugState.remoteAudit.length > 200) scriptDebugState.remoteAudit.splice(200)
    if (!accepted) { disconnectRemoteDebugger('Authentication rejected'); return { id: request.id, error: { code: 'NOVA-DEBUG-AUTH', message: 'Remote debugging requires explicit local-player enablement and a valid authentication token.' } } }
    authenticatedToken = policy.expectedTokenHash
    scriptDebugState.remotePeer = { id: `peer-${Date.now()}`, address: request.address, authenticated: true, connectedAt: new Date().toISOString(), playerVersion: request.playerVersion.slice(0, 40) }
    return { id: request.id, result: { protocol: 'nova-rhai-debug', version: 4, sessionRevision: scriptDebugState.sessionRevision, pauseId: scriptDebugState.pauseCount, capabilities: DEBUG_CAPABILITIES } }
  }
  if (!policy.enabled || !policy.allowExportedPlayers || (scriptDebugState.remotePeer && authenticatedToken !== policy.expectedTokenHash)) { disconnectRemoteDebugger('Permission revoked'); return { id: request.id, error: { code: 'NOVA-DEBUG-AUTH', message: 'Debug permission is disabled.' } } }
  if (request.sessionRevision !== scriptDebugState.sessionRevision) return { id: request.id, error: { code: 'NOVA-DEBUG-STALE', message: 'Execution session changed; initialize again.' } }
  if (['scopes', 'evaluate', 'continue', 'next', 'stepIn', 'stepOut'].includes(request.method) && (!scriptDebugState.paused || request.pauseId !== scriptDebugState.pauseCount)) return { id: request.id, error: { code: 'NOVA-DEBUG-STALE', message: 'The requested pause is no longer active.' } }
  if ((request.method === 'scopes' || request.method === 'evaluate') && (request.frame !== 0 || !scriptDebugState.callStack.length)) return { id: request.id, error: { code: 'NOVA-DEBUG-FRAME', message: 'Only the current host snapshot is available; VM frames are unsupported.' } }
  if (!scriptDebugState.remotePeer?.authenticated) return { id: request.id, error: { code: 'NOVA-DEBUG-NOT-AUTHENTICATED', message: 'Initialize an authenticated local session first.' } }
  if (request.method === 'threads') return { id: request.id, result: [{ id: 1, name: 'Main callbacks' }, ...scriptDebugState.tasks.map(/** 构造并返回记录 { id: index + 2, name: `${task.name} · ${task.state}` }，字段按当前实参及捕获状态求值。 */ (task, index) => ({ id: index + 2, name: `${task.name} · ${task.state}` }))] }
  if (request.method === 'stackTrace') return { id: request.id, result: scriptDebugState.callStack.map(/** 构造并返回记录 { id: index, ...frame }，字段按当前实参及捕获状态求值。 */ (frame, index) => ({ id: index, ...frame })) }
  if (request.method === 'scopes') return { id: request.id, result: [{ name: 'Locals', variables: scriptDebugState.locals }, { name: 'Watches', variables: scriptDebugState.watches }] }
  if (request.method === 'evaluate') {
    try { return { id: request.id, result: evaluateDebugExpression(request.expression) } } catch (error) { return { id: request.id, error: { code: 'NOVA-DEBUG-EVALUATE', message: error instanceof Error ? error.message : String(error) } } }
  }
  if (request.method === 'cancelTask') {
    const task = debugHost?.cancelTask(request.taskId) ? scriptDebugState.tasks.find(/** 获取宿主真正取消的任务。 */ item => item.id === request.taskId) : null
    return task ? { id: request.id, result: { accepted: true, taskId: task.id } } : { id: request.id, error: { code: 'NOVA-DEBUG-TASK', message: 'Task is not cancellable.' } }
  }
  const mode: DebugStepMode = request.method === 'continue' ? 'continue' : request.method === 'stepIn' ? 'into' : request.method === 'stepOut' ? 'out' : 'over'
  if (!debugHost) return { id: request.id, error: { code: 'NOVA-DEBUG-HOST', message: 'No active execution host.' } }
  if (mode === 'continue') debugHost.continue(); else debugHost.step(mode)
  return { id: request.id, result: { accepted: true, mode } }
}

function disconnectRemoteDebugger(reason = 'Session closed'): void {
  if (scriptDebugState.remotePeer) scriptDebugState.remoteAudit.unshift({ at: new Date().toISOString(), event: 'disconnect', accepted: true, detail: reason.slice(0, 256) })
  authenticatedToken = ''
  scriptDebugState.remotePeer = null
}
return { bindDebugHost, inspectDebugObject, addDebugWatch, removeDebugWatch, evaluateDebugWatches, pauseScriptDebugger, clearScriptDebugger, beginDebugSession, requestDebugStep, selectDebugFrame, updateDebugTask, markDebugTaskCancelled, handleDebugProtocol, disconnectRemoteDebugger, evaluateDebugExpression }
}
export class ScriptDebugOwner {
 readonly state: ScriptDebugState
 readonly bindDebugHost!: ReturnType<typeof createScriptDebugRuntime>['bindDebugHost']
 readonly inspectDebugObject!: ReturnType<typeof createScriptDebugRuntime>['inspectDebugObject']
 readonly addDebugWatch!: ReturnType<typeof createScriptDebugRuntime>['addDebugWatch']
 readonly removeDebugWatch!: ReturnType<typeof createScriptDebugRuntime>['removeDebugWatch']
 readonly evaluateDebugWatches!: ReturnType<typeof createScriptDebugRuntime>['evaluateDebugWatches']
 readonly pauseScriptDebugger!: ReturnType<typeof createScriptDebugRuntime>['pauseScriptDebugger']
 readonly clearScriptDebugger!: ReturnType<typeof createScriptDebugRuntime>['clearScriptDebugger']
 readonly beginDebugSession!: ReturnType<typeof createScriptDebugRuntime>['beginDebugSession']
 readonly requestDebugStep!: ReturnType<typeof createScriptDebugRuntime>['requestDebugStep']
 readonly selectDebugFrame!: ReturnType<typeof createScriptDebugRuntime>['selectDebugFrame']
 readonly updateDebugTask!: ReturnType<typeof createScriptDebugRuntime>['updateDebugTask']
 readonly markDebugTaskCancelled!: ReturnType<typeof createScriptDebugRuntime>['markDebugTaskCancelled']
 readonly handleDebugProtocol!: ReturnType<typeof createScriptDebugRuntime>['handleDebugProtocol']
 readonly disconnectRemoteDebugger!: ReturnType<typeof createScriptDebugRuntime>['disconnectRemoteDebugger']
 readonly evaluateDebugExpression!: ReturnType<typeof createScriptDebugRuntime>['evaluateDebugExpression']
 constructor(readonly world: ScriptDebugWorld, readonly catalogIdentity: GameplayScriptServices, state?: ScriptDebugState) {
  if (!world || !Array.isArray(world.entities)) throw new Error('SCRIPT_DEBUG_WORLD_REQUIRED: Supply the fixed World.')
  if (!catalogIdentity || ['resolveAsset','resolveModuleAsset','readSource','revision','listIdentities','compileVisual'].some(key=>typeof catalogIdentity[key as keyof GameplayScriptServices]!=='function')) throw new Error('SCRIPT_DEBUG_CATALOG_REQUIRED: Supply actual GameplayScriptServices.')
  this.state=state??createInitialScriptDebugState()
  Object.assign(this,createScriptDebugRuntime(this.state))
 }
}
