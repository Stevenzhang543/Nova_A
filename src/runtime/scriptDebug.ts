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
  callStack: [] as DebugFrame[],
  locals: {} as Record<string, unknown>,
  watches: [] as DebugWatch[],
  testResults: [] as ScriptTestResult[],
  lastSignal: null as null | { name: string; source: string; target: string },
  hotReload: { status: 'idle' as 'idle' | 'pending' | 'applied' | 'rejected' | 'disabled', scriptUuid: '', message: '', frame: 0 },
  inspectedPath: '',
  inspectedValue: '—',
  revision: 0
})

let nextWatchId = 1

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
  scriptDebugState.pauseCount++
  scriptDebugState.revision++
  evaluateDebugWatches()
}

export function clearScriptDebugger(): void {
  scriptDebugState.paused = false
  scriptDebugState.reason = ''
  scriptDebugState.callStack.splice(0)
  scriptDebugState.locals = {}
  scriptDebugState.stepMode = 'continue'
  scriptDebugState.revision++
  evaluateDebugWatches()
}

export function beginDebugSession(): void { scriptDebugState.sessionRevision++; scriptDebugState.pauseCount = 0; clearScriptDebugger() }
export function requestDebugStep(mode: DebugStepMode): void { scriptDebugState.stepMode = mode; scriptDebugState.revision++ }
