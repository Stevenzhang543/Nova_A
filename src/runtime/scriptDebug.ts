import { reactive } from 'vue'

export interface DebugFrame {
  entityUuid: string
  entityName: string
  scriptUuid: string
  functionName: string
  line: number
  sourcePath?: string
  depth?: number
}

export interface DebugWatch { id: number; expression: string; value: string; error: string | null }
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

export const scriptDebugState = reactive({
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
})

let nextWatchId = 1

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
  mappings.sort((first, second) => first.generatedLine - second.generatedLine || first.generatedColumn - second.generatedColumn || first.sourcePath.localeCompare(second.sourcePath))
  return { mappings, diagnostics: diagnostics.slice(0, 1_000) }
}

function readPath(root: unknown, path: string): unknown {
  const parts = path.trim().split('.').filter(Boolean)
  let value = root
  for (const part of parts) {
    if (!value || typeof value !== 'object' || !(part in value)) throw new Error(`Unknown value: ${path}`)
    value = (value as Record<string, unknown>)[part]
  }
  return value
}

function scalar(value: string, root: unknown): unknown {
  const clean = value.trim()
  if (clean === 'true') return true
  if (clean === 'false') return false
  if (clean === 'null') return null
  if (/^-?\d+(?:\.\d+)?$/.test(clean)) return Number(clean)
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) return clean.slice(1, -1)
  return readPath(root, clean)
}

export function evaluateDebugExpression(expression: string, root: unknown = scriptDebugState.locals): unknown {
  const clean = expression.trim().slice(0, 512)
  const comparison = clean.match(/^(.+?)\s*(===|!==|==|!=|>=|<=|>|<)\s*(.+)$/)
  if (!comparison) return scalar(clean, root)
  const left = scalar(comparison[1], root), right = scalar(comparison[3], root)
  if (comparison[2] === '===' || comparison[2] === '==') return left === right
  if (comparison[2] === '!==' || comparison[2] === '!=') return left !== right
  const first = Number(left), second = Number(right)
  if (!Number.isFinite(first) || !Number.isFinite(second)) throw new Error('Ordered comparisons require finite numbers')
  if (comparison[2] === '>=') return first >= second
  if (comparison[2] === '<=') return first <= second
  if (comparison[2] === '>') return first > second
  return first < second
}

export function inspectDebugObject(path: string): void {
  scriptDebugState.inspectedPath = path.trim().slice(0, 160)
  try {
    const value = evaluateDebugExpression(scriptDebugState.inspectedPath)
    scriptDebugState.inspectedValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  } catch (error) { scriptDebugState.inspectedValue = error instanceof Error ? error.message : String(error) }
}

export function addDebugWatch(expression: string): void {
  const clean = expression.trim().slice(0, 160)
  if (!clean || scriptDebugState.watches.some(watch => watch.expression === clean)) return
  scriptDebugState.watches.push({ id: nextWatchId++, expression: clean, value: '—', error: null })
  evaluateDebugWatches()
}

export function removeDebugWatch(id: number): void {
  const index = scriptDebugState.watches.findIndex(watch => watch.id === id)
  if (index >= 0) scriptDebugState.watches.splice(index, 1)
}

export function evaluateDebugWatches(): void {
  for (const watch of scriptDebugState.watches) {
    try {
      const value = evaluateDebugExpression(watch.expression)
      watch.value = typeof value === 'string' ? value : JSON.stringify(value)
      watch.error = null
    } catch (error) {
      watch.value = '—'
      watch.error = error instanceof Error ? error.message : String(error)
    }
  }
}

export function pauseScriptDebugger(frame: DebugFrame, locals: Record<string, unknown>, reason: string): void {
  scriptDebugState.paused = true
  scriptDebugState.reason = reason
  scriptDebugState.callStack.splice(0, scriptDebugState.callStack.length, frame, ...scriptDebugState.callStack.filter(item => item.entityUuid !== frame.entityUuid || item.functionName !== frame.functionName).slice(0, 31))
  scriptDebugState.locals = locals
  scriptDebugState.selectedFrame = 0
  scriptDebugState.pauseCount++
  scriptDebugState.revision++
  evaluateDebugWatches()
}

export function clearScriptDebugger(): void {
  scriptDebugState.paused = false
  scriptDebugState.reason = ''
  scriptDebugState.callStack.splice(0)
  scriptDebugState.locals = {}
  scriptDebugState.selectedFrame = 0
  scriptDebugState.stepMode = 'continue'
  scriptDebugState.revision++
  evaluateDebugWatches()
}

export function beginDebugSession(): void { scriptDebugState.sessionRevision++; scriptDebugState.pauseCount = 0; clearScriptDebugger() }
export function requestDebugStep(mode: DebugStepMode): void { scriptDebugState.stepMode = mode; scriptDebugState.revision++ }

export function selectDebugFrame(index: number): void {
  scriptDebugState.selectedFrame = Math.min(Math.max(0, Math.round(index)), Math.max(0, scriptDebugState.callStack.length - 1))
  scriptDebugState.revision++
}

export function updateDebugTask(task: DebugTask): void {
  const normalized = { ...task, id: task.id.slice(0, 128), name: task.name.slice(0, 160), entityUuid: task.entityUuid.slice(0, 128), detail: task.detail.slice(0, 1_024) }
  const index = scriptDebugState.tasks.findIndex(item => item.id === normalized.id)
  if (index >= 0) scriptDebugState.tasks[index] = normalized
  else scriptDebugState.tasks.unshift(normalized)
  if (scriptDebugState.tasks.length > 512) scriptDebugState.tasks.splice(512)
}

export function markDebugTaskCancelled(taskId: string, detail = 'Cancellation requested by debugger'): DebugTask | null {
  const task = scriptDebugState.tasks.find(item => item.id === taskId)
  if (!task || !['queued', 'running', 'waiting'].includes(task.state)) return null
  updateDebugTask({ ...task, state: 'cancelled', detail: detail.slice(0, 1_024) })
  return task
}

function secureTokenMatch(received: string, expected: string): boolean {
  const first = received.toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 128), second = expected.toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 128)
  let mismatch = first.length ^ second.length
  const length = Math.max(first.length, second.length)
  for (let index = 0; index < length; index++) mismatch |= (first.charCodeAt(index) || 0) ^ (second.charCodeAt(index) || 0)
  return second.length >= 32 && mismatch === 0
}

export function handleDebugProtocol(request: DebugProtocolRequest, policy: { enabled: boolean; expectedTokenHash: string; allowExportedPlayers: boolean }): { id: string; result?: unknown; error?: { code: string; message: string } } {
  if (request.method === 'initialize') {
    const local = request.address === '127.0.0.1' || request.address === '::1' || request.address === 'localhost'
    const accepted = policy.enabled && policy.allowExportedPlayers && local && secureTokenMatch(request.tokenHash, policy.expectedTokenHash)
    scriptDebugState.remoteAudit.unshift({ at: new Date().toISOString(), event: 'initialize', accepted, detail: `${request.address} · ${request.playerVersion}` })
    if (scriptDebugState.remoteAudit.length > 200) scriptDebugState.remoteAudit.splice(200)
    if (!accepted) return { id: request.id, error: { code: 'NOVA-DEBUG-AUTH', message: 'Remote debugging requires explicit local-player enablement and a valid authentication token.' } }
    scriptDebugState.remotePeer = { id: `peer-${Date.now()}`, address: request.address, authenticated: true, connectedAt: new Date().toISOString(), playerVersion: request.playerVersion.slice(0, 40) }
    return { id: request.id, result: { protocol: 'nova-rhai-debug', version: 3, capabilities: ['statementMaps', 'statementStepping', 'breakpoints', 'conditionalBreakpoints', 'hitCounts', 'logpoints', 'stackTrace', 'scopes', 'evaluate', 'tasks', 'taskCancellation', 'hotReload'] } }
  }
  if (!scriptDebugState.remotePeer?.authenticated) return { id: request.id, error: { code: 'NOVA-DEBUG-NOT-AUTHENTICATED', message: 'Initialize an authenticated local session first.' } }
  if (request.method === 'threads') return { id: request.id, result: [{ id: 1, name: 'Main callbacks' }, ...scriptDebugState.tasks.map((task, index) => ({ id: index + 2, name: `${task.name} · ${task.state}` }))] }
  if (request.method === 'stackTrace') return { id: request.id, result: scriptDebugState.callStack.map((frame, index) => ({ id: index, ...frame })) }
  if (request.method === 'scopes') return { id: request.id, result: [{ name: 'Locals', variables: scriptDebugState.locals }, { name: 'Watches', variables: scriptDebugState.watches }] }
  if (request.method === 'evaluate') {
    try { return { id: request.id, result: evaluateDebugExpression(request.expression) } } catch (error) { return { id: request.id, error: { code: 'NOVA-DEBUG-EVALUATE', message: error instanceof Error ? error.message : String(error) } } }
  }
  if (request.method === 'cancelTask') {
    const task = markDebugTaskCancelled(request.taskId, 'Cancellation accepted by remote debugger')
    return task ? { id: request.id, result: { accepted: true, taskId: task.id } } : { id: request.id, error: { code: 'NOVA-DEBUG-TASK', message: 'Task is not cancellable.' } }
  }
  const mode: DebugStepMode = request.method === 'continue' ? 'continue' : request.method === 'stepIn' ? 'into' : request.method === 'stepOut' ? 'out' : 'over'
  requestDebugStep(mode)
  return { id: request.id, result: { accepted: true, mode } }
}

export function disconnectRemoteDebugger(reason = 'Session closed'): void {
  if (scriptDebugState.remotePeer) scriptDebugState.remoteAudit.unshift({ at: new Date().toISOString(), event: 'disconnect', accepted: true, detail: reason.slice(0, 256) })
  scriptDebugState.remotePeer = null
}
