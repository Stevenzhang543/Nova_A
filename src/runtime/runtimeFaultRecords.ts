/** 故障状态中心：登记与聚合编辑异常，管理详情查看及恢复相关状态。 */
import type { EditorLogCategory } from '../contracts/applicationLog'

export type FaultSeverity = 'recoverable' | 'fatal'
export interface AppFault {
  id: number
  severity: FaultSeverity
  context: string
  message: string
  stack: string
  timestamp: string
  occurrences: number
}

/** One application-level record Owner. The optional view wraps this exact raw object. */
export interface FaultCenterState { activeFatal: AppFault | null; recent: AppFault[] }
const rawFaultCenterState: FaultCenterState = { activeFatal: null, recent: [] }
export let faultCenterState: FaultCenterState = rawFaultCenterState
let stateAdapterInstalled = false
export interface FaultCenterStateAdapter {
  wrap: (target: FaultCenterState) => FaultCenterState
  unwrap: (target: FaultCenterState) => FaultCenterState
}
export function installFaultCenterStateAdapter(adapter: FaultCenterStateAdapter): void {
  if (stateAdapterInstalled) return
  const view = adapter.wrap(rawFaultCenterState)
  if (!view || adapter.unwrap(view) !== rawFaultCenterState) throw new TypeError('Fault state adapter must retain the existing raw Owner')
  faultCenterState = view
  stateAdapterInstalled = true
}
export type FaultLogLevel = 'error' | 'fatal'
export type FaultLogHost = (message: string, category: EditorLogCategory, level: FaultLogLevel, source?: string) => void
interface PendingFaultLog { faultId: number; category: EditorLogCategory; level: FaultLogLevel; payloadBytes: number }
const PENDING_FAULT_LOG_CAPACITY = 65
// This counts UTF8 JSON descriptor payload, not engine-specific JS heap overhead. Fault payload is owned solely by the existing record.
const PENDING_FAULT_LOG_BYTE_LIMIT = 8_192
const faultNoticeEncoder = new TextEncoder()
let pendingFaultLogBytes = 0
let byteBackpressure = 0
const pendingFaultLogs: PendingFaultLog[] = []
let logHost: { log: FaultLogHost } | null = null
let drainingFaultLogs = false
let pendingAccepted = 0
let pendingDelivered = 0
let pendingOverflow = 0
let lastOverflowFaultId: number | null = null
let hostFailures = 0
/** Accepted records remain readable under the original64-record policy. Any undelivered notice retired with an expired record is counted explicitly. */
function retireExpiredPendingFaultLogs(): void {
  const retained = new Set(faultCenterState.recent.map(fault => fault.id))
  if (faultCenterState.activeFatal) retained.add(faultCenterState.activeFatal.id)
  for (let index = pendingFaultLogs.length - 1; index >= 0; index--) {
    const row = pendingFaultLogs[index]
    if (!retained.has(row.faultId)) {
      pendingFaultLogs.splice(index, 1)
      pendingFaultLogBytes -= row.payloadBytes
      pendingOverflow++
      lastOverflowFaultId = row.faultId
    }
  }
}
/** Same call signature as the legacy logger; installed Host throws synchronously as before. */
function addEditorLog(message: string, category: EditorLogCategory, level: FaultLogLevel, source = ''): void {
  const host = logHost
  if (host) {
    try { host.log(message, category, level, source) }
    catch (error) { hostFailures++; throw error }
    return
  }
  retireExpiredPendingFaultLogs()
  const faultId = faultCenterState.recent[faultCenterState.recent.length - 1]?.id
  if (faultId === undefined || pendingFaultLogs.length >= PENDING_FAULT_LOG_CAPACITY) throw new Error('Fault log pending capacity invariant violated')
  pendingAccepted++
  // Bound malformed untyped category input before descriptor serialization; every valid category remains unchanged.
  if (category.length > PENDING_FAULT_LOG_BYTE_LIMIT) {
    byteBackpressure++; pendingOverflow++; lastOverflowFaultId = faultId
    return
  }
  const payloadBytes = faultNoticeEncoder.encode(JSON.stringify({ faultId, category, level })).byteLength
  if (payloadBytes > PENDING_FAULT_LOG_BYTE_LIMIT - pendingFaultLogBytes) {
    // The accepted fault remains in its original record. A notice that cannot be admitted is observable, never silently truncated.
    byteBackpressure++; pendingOverflow++; lastOverflowFaultId = faultId
    return
  }
  pendingFaultLogs.push({ faultId, category, level, payloadBytes })
  pendingFaultLogBytes += payloadBytes
}
/** Explicit finite drain; no timer, background polling or independent record state. Failure leaves the notice pending and propagates. */
export function drainPendingFaultLogs(maximum = PENDING_FAULT_LOG_CAPACITY): number {
  if (!logHost || drainingFaultLogs || reporting) return 0
  const limit = Number.isFinite(maximum) ? Math.min(PENDING_FAULT_LOG_CAPACITY, Math.max(0, Math.floor(maximum))) : 0
  const host = logHost
  retireExpiredPendingFaultLogs()
  let delivered = 0
  drainingFaultLogs = true
  reporting = true
  try {
    while (delivered < limit && pendingFaultLogs.length && logHost === host) {
      const row = pendingFaultLogs[0]
      const fault = faultCenterState.recent.find(fault => fault.id === row.faultId) ?? (faultCenterState.activeFatal?.id === row.faultId ? faultCenterState.activeFatal : null)
      if (!fault) throw new Error('Fault log record lifetime invariant violated')
      try { host.log(`${fault.context}: ${fault.message}`, row.category, row.level, fault.stack) }
      catch (error) { hostFailures++; throw error }
      pendingFaultLogs.shift()
      pendingFaultLogBytes -= row.payloadBytes
      pendingDelivered++
      delivered++
    }
    return delivered
  } finally { reporting = false; drainingFaultLogs = false }
}
/** Replacement/disposal checks binding identity so late cleanup cannot unregister a newer Host. Installing does not implicitly consume pending data. */
export function installFaultLogHost(log: FaultLogHost): () => void {
  const binding = { log }
  logHost = binding
  let disposed = false
  return () => { if (disposed) return; disposed = true; if (logHost === binding) logHost = null }
}
export function faultDeliveryDiagnostics(): Readonly<{ capacity: number; payloadByteLimit: number; payloadBytes: number; byteBackpressure: number; pending: number; accepted: number; delivered: number; overflow: number; lastOverflowFaultId: number | null; hostFailures: number; hostInstalled: boolean; pendingFaultIds: readonly number[] }> {
  return Object.freeze({ capacity: PENDING_FAULT_LOG_CAPACITY, payloadByteLimit: PENDING_FAULT_LOG_BYTE_LIMIT, payloadBytes: pendingFaultLogBytes, byteBackpressure, pending: pendingFaultLogs.length, accepted: pendingAccepted, delivered: pendingDelivered, overflow: pendingOverflow, lastOverflowFaultId, hostFailures, hostInstalled: logHost !== null, pendingFaultIds: Object.freeze(pendingFaultLogs.map(row => row.faultId)) })
}
let nextFaultId = 1
let reporting = false

/* 调用 String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, maximum) 并返回调用结果。 */ function bounded(value: unknown, maximum: number): string {
  return String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, maximum)
}

/** 识别 AbortError 和用户主动取消文本，避免将正常取消记录为应用故障。 */ export function isExpectedCancellation(reason: unknown): boolean {
  const error = reason instanceof Error ? reason : null
  return error?.name === 'AbortError' || /(?:cancelled|canceled) by (?:the )?user/i.test(String(error?.message ?? reason))
}

/** 防止报告重入并合并短时间相同故障，限制诊断大小和历史数量，同时写入日志和致命提示。 */ function recordFault(reason: unknown, context: string, severity: FaultSeverity, category: EditorLogCategory): AppFault | null {
  if (isExpectedCancellation(reason) || reporting) return null
  reporting = true
  try {
    const error = reason instanceof Error ? reason : new Error(String(reason))
    const message = bounded(error.message || 'Unknown application failure', 1_000)
    const now = Date.now()
    const previous = faultCenterState.recent[faultCenterState.recent.length - 1]
    if (previous && previous.message === message && previous.context === context && now - Date.parse(previous.timestamp) < 2_000) {
      previous.occurrences++
      if (severity === 'fatal') faultCenterState.activeFatal = previous
      return previous
    }
    const fault: AppFault = {
      id: nextFaultId++, severity, context: bounded(context || 'Application', 160), message,
      stack: bounded(error.stack ?? '', 16_384), timestamp: new Date(now).toISOString(), occurrences: 1
    }
    faultCenterState.recent.push(fault)
    if (faultCenterState.recent.length > 64) faultCenterState.recent.splice(0, faultCenterState.recent.length - 64)
    addEditorLog(`${fault.context}: ${fault.message}`, category, severity === 'fatal' ? 'fatal' : 'error', fault.stack)
    if (severity === 'fatal') faultCenterState.activeFatal = fault
    return fault
  } finally {
    reporting = false
  }
}

/* 调用 recordFault(reason, context, 'recoverable', category) 并返回调用结果。 */ export function reportRecoverableError(reason: unknown, context: string, category: EditorLogCategory = 'Editor'): AppFault | null {
  return recordFault(reason, context, 'recoverable', category)
}

/* 调用 recordFault(reason, context, 'fatal', category) 并返回调用结果。 */ export function reportFatalError(reason: unknown, context: string, category: EditorLogCategory = 'Engine'): AppFault | null {
  return recordFault(reason, context, 'fatal', category)
}

/** 将 null 赋给 faultCenterState.activeFatal，不显式返回值。 */ export function dismissActiveFault(): void { faultCenterState.activeFatal = null }

/** 复制最近故障信息并输出带生成时间的 JSON 诊断。 */ export function faultDiagnostics(): string {
  return JSON.stringify({ generatedAt: new Date().toISOString(), faults: faultCenterState.recent.map(/** 构造并返回记录 { ...fault }，字段按当前实参及捕获状态求值。 */ fault => ({ ...fault })) }, null, 2)
}

/** 等待给定异步操作，失败记录可恢复错误并返回 undefined。 */ export async function guardAsync<T>(operation: Promise<T>, context: string, category: EditorLogCategory = 'Editor'): Promise<T | undefined> {
  try { return await operation }
  catch (error) { reportRecoverableError(error, context, category); return undefined }
}
