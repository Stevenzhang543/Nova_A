import { reactive } from 'vue'

export interface DebugFrame {
  entityUuid: string
  entityName: string
  scriptUuid: string
  functionName: string
  line: number
}

export interface DebugWatch { id: number; expression: string; value: string; error: string | null }

export const scriptDebugState = reactive({
  enabled: true,
  paused: false,
  reason: '',
  callStack: [] as DebugFrame[],
  locals: {} as Record<string, unknown>,
  watches: [] as DebugWatch[],
  testResults: [] as Array<{ script: string; test: string; passed: boolean; message: string }>,
  lastSignal: null as null | { name: string; source: string; target: string },
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
      const value = readPath(scriptDebugState.locals, watch.expression)
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
  scriptDebugState.callStack.splice(0, scriptDebugState.callStack.length, frame)
  scriptDebugState.locals = locals
  scriptDebugState.revision++
  evaluateDebugWatches()
}

export function clearScriptDebugger(): void {
  scriptDebugState.paused = false
  scriptDebugState.reason = ''
  scriptDebugState.callStack.splice(0)
  scriptDebugState.locals = {}
  scriptDebugState.revision++
  evaluateDebugWatches()
}
