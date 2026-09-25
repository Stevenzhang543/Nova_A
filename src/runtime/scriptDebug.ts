/** 脚本调试工具：求值受控调试表达式，维护断点及观察值相关状态。 */
import { reactive } from 'vue'
import { snapshotPath, snapshotPreview, snapshotValueType, snapshotComparison } from './dynamicInspection'

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

/** 宿主提供可执行的继续、命令/回调步进和取消；同步 Rhai 调用不具有可恢复的 VM 栈。 */
export interface DebugHost { continue(): void; step(mode: Exclude<DebugStepMode, 'continue'>): void; cancelTask(id: string): boolean }
let debugHost: DebugHost | null = null
let authenticatedToken = ''
export const DEBUG_CAPABILITIES = Object.freeze({ vmSuspension: false, vmStack: false, vmLocals: false, callbackBreakpoints: true, callbackStep: true, commandReplayStep: true, snapshotWatches: true, caughtExceptionPause: false })
/** 登记宿主操作，停止时撤销旧会话的权限与未完成任务。 */
export function bindDebugHost(host: DebugHost | null): void { debugHost = host; if (!host) { disconnectRemoteDebugger(); scriptDebugState.tasks.splice(0); clearScriptDebugger() } }
/** 对实际执行源码计算稳定身份，用于阻止将旧位置投射到已编辑草稿。 */
export function debugSourceRevision(source: string): string { let hash = 2166136261; for (let index = 0; index < source.length; index++) hash = Math.imul(hash ^ source.charCodeAt(index), 16777619); return `${source.length}:${(hash >>> 0).toString(16)}` }


/** 验证有数量上限的调试映射，拒绝非法坐标与绝对或父级路径，排序有效结果并限制诊断数量。 */ export function normalizeDebugSourceMap(value: unknown): DebugSourceMap {
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


/** 解析布尔、空值、数值及简单引号字符串，否则按快照属性路径读取，不执行脚本。 */ function scalar(value: string, root: unknown): unknown {
  const clean = value.trim()
  if (clean === 'true') return true
  if (clean === 'false') return false
  if (clean === 'null') return null
  if (/^-?\d+(?:\.\d+)?$/.test(clean)) return Number(clean)
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) return clean.slice(1, -1)
  return snapshotPath(root, clean)
}

/** 限制表达式长度并支持只读快照标量比较，相等比较统一严格语义，有序比较仅接受有限数值。 */ export function evaluateDebugExpression(expression: string, root: unknown = scriptDebugState.locals): unknown {
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

/** 保存受限属性路径并生成类型与有界预览，求值失败显示原因。 */ export function inspectDebugObject(path: string): void {
  scriptDebugState.inspectedPath = path.trim().slice(0, 160)
  try {
    const value = evaluateDebugExpression(scriptDebugState.inspectedPath)
    scriptDebugState.inspectedValue = `${snapshotValueType(value)} · ${snapshotPreview(value)}`
  } catch (error) { scriptDebugState.inspectedValue = error instanceof Error ? error.message : String(error) }
}

/** 去重新增非空观察表达式并立即刷新全部观察值。 */ export function addDebugWatch(expression: string): void {
  const clean = expression.trim().slice(0, 160)
  if (!clean || scriptDebugState.watches.some(/* 比较 watch.expression 与 clean，返回严格相等的判断结果。 */ watch => watch.expression === clean)) return
  scriptDebugState.watches.push({ id: nextWatchId++, expression: clean, value: '—', error: null })
  evaluateDebugWatches()
}

/** 按观察项身份移除对应表达式。 */ export function removeDebugWatch(id: number): void {
  const index = scriptDebugState.watches.findIndex(/* 比较 watch.id 与 id，返回严格相等的判断结果。 */ watch => watch.id === id)
  if (index >= 0) scriptDebugState.watches.splice(index, 1)
}

/** 逐项只读求值，限制字符串或结构预览长度，并记录类型及独立错误。 */ export function evaluateDebugWatches(): void {
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

/** 记录暂停原因、当前栈帧和局部变量，限制去重栈列表并刷新观察表达式。 */ export function pauseScriptDebugger(frame: DebugFrame, locals: Record<string, unknown>, reason: string): void {
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

/** 清空暂停、调用栈和局部快照，恢复继续模式并重新计算观察项。 */ export function clearScriptDebugger(): void {
  scriptDebugState.paused = false
  scriptDebugState.reason = ''
  scriptDebugState.callStack.splice(0)
  scriptDebugState.locals = {}
  scriptDebugState.selectedFrame = 0
  scriptDebugState.stepMode = 'continue'
  scriptDebugState.revision++
  evaluateDebugWatches()
}

/** 开启新的调试会话代次、重置暂停计数并清理旧调试状态。 */ export function beginDebugSession(): void { disconnectRemoteDebugger(); scriptDebugState.tasks.splice(0); scriptDebugState.sessionRevision++; scriptDebugState.pauseCount = 0; clearScriptDebugger() }
/** 记录请求的步进模式并递增状态版本，供执行宿主消费。 */ export function requestDebugStep(mode: DebugStepMode): void { scriptDebugState.stepMode = mode; scriptDebugState.revision++ }

/** 把选择索引限制到现有调用栈范围并更新状态版本。 */ export function selectDebugFrame(index: number): void {
  scriptDebugState.selectedFrame = Math.min(Math.max(0, Math.round(index)), Math.max(0, scriptDebugState.callStack.length - 1))
  scriptDebugState.revision++
}

/** 限制任务描述文本后按身份更新或插入调试任务，保留最多五百一十二项。 */ export function updateDebugTask(task: DebugTask): void {
  const normalized = { ...task, id: task.id.slice(0, 128), name: task.name.slice(0, 160), entityUuid: task.entityUuid.slice(0, 128), detail: task.detail.slice(0, 1_024) }
  const index = scriptDebugState.tasks.findIndex(/* 比较 item.id 与 normalized.id，返回严格相等的判断结果。 */ item => item.id === normalized.id)
  if (index >= 0) scriptDebugState.tasks[index] = normalized
  else scriptDebugState.tasks.unshift(normalized)
  if (scriptDebugState.tasks.length > 512) scriptDebugState.tasks.splice(512)
}

/** 仅允许排队、运行或等待任务转为取消状态，其他状态返回 null。 */ export function markDebugTaskCancelled(taskId: string, detail = 'Cancellation requested by debugger'): DebugTask | null {
  const task = scriptDebugState.tasks.find(/* 比较 item.id 与 taskId，返回严格相等的判断结果。 */ item => item.id === taskId)
  if (!task || !['queued', 'running', 'waiting'].includes(task.state)) return null
  updateDebugTask({ ...task, state: 'cancelled', detail: detail.slice(0, 1_024) })
  return task
}

/** 规范化十六进制摘要后逐位累计差异，要求期望摘要至少三十二字符且完全相同。 */ function secureTokenMatch(received: string, expected: string): boolean {
  const first = received.toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 128), second = expected.toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 128)
  let mismatch = first.length ^ second.length
  const length = Math.max(first.length, second.length)
  for (let index = 0; index < length; index++) mismatch |= (first.charCodeAt(index) || 0) ^ (second.charCodeAt(index) || 0)
  return second.length >= 32 && mismatch === 0
}

/** 校验显式启用的本地播放器令牌会话后处理线程、栈、变量、只读求值、任务取消和步进协议请求。 */ export function handleDebugProtocol(request: DebugProtocolRequest & { sessionRevision?: number; pauseId?: number }, policy: { enabled: boolean; expectedTokenHash: string; allowExportedPlayers: boolean }): { id: string; result?: unknown; error?: { code: string; message: string } } {
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

/** 记录远程调试断开原因并清除已认证端点。 */ export function disconnectRemoteDebugger(reason = 'Session closed'): void {
  if (scriptDebugState.remotePeer) scriptDebugState.remoteAudit.unshift({ at: new Date().toISOString(), event: 'disconnect', accepted: true, detail: reason.slice(0, 256) })
  authenticatedToken = ''
  scriptDebugState.remotePeer = null
}
