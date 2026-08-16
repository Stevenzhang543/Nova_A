import { reactive } from 'vue'
import { addEditorLog, type EditorLogCategory } from '../store/editor'

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

export const faultCenterState = reactive({ activeFatal: null as AppFault | null, recent: [] as AppFault[] })
let nextFaultId = 1
let reporting = false

function bounded(value: unknown, maximum: number): string {
  return String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, maximum)
}

export function isExpectedCancellation(reason: unknown): boolean {
  const error = reason instanceof Error ? reason : null
  return error?.name === 'AbortError' || /(?:cancelled|canceled) by (?:the )?user/i.test(String(error?.message ?? reason))
}

function recordFault(reason: unknown, context: string, severity: FaultSeverity, category: EditorLogCategory): AppFault | null {
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

export function reportRecoverableError(reason: unknown, context: string, category: EditorLogCategory = 'Editor'): AppFault | null {
  return recordFault(reason, context, 'recoverable', category)
}

export function reportFatalError(reason: unknown, context: string, category: EditorLogCategory = 'Engine'): AppFault | null {
  return recordFault(reason, context, 'fatal', category)
}

export function dismissActiveFault(): void { faultCenterState.activeFatal = null }

export function faultDiagnostics(): string {
  return JSON.stringify({ generatedAt: new Date().toISOString(), faults: faultCenterState.recent.map(fault => ({ ...fault })) }, null, 2)
}

export async function guardAsync<T>(operation: Promise<T>, context: string, category: EditorLogCategory = 'Editor'): Promise<T | undefined> {
  try { return await operation }
  catch (error) { reportRecoverableError(error, context, category); return undefined }
}
