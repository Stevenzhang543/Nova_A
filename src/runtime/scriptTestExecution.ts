import type { ScriptTestMetadata } from '../editor/scriptLanguage'
import type { ScriptTestResult } from './scriptDebug'

export interface TestExecutionResult { properties: Record<string, unknown>; logs: Array<{ level: string; message: string }> }
export interface IsolatedTestVm {
  compile_cached(id: string, source: string): string
  execute_cached_json(id: string, callback: string, context: string): string
  free(): void
}
export interface ScriptSuiteOptions {
  scriptUuid: string
  scriptName: string
  source: string
  functions: ReadonlySet<string>
  tests: readonly ScriptTestMetadata[]
  includeSkipped?: boolean
  context: Record<string, unknown>
  createVm(): IsolatedTestVm
  parseExecution(json: string): TestExecutionResult
  onExecution?(callback: string, execution: TestExecutionResult): void
  now?(): number
}

/** One compiled VM per suite, isolated case properties, and teardown/free on every failure path. */
export function executeScriptTestSuite(options: ScriptSuiteOptions): ScriptTestResult[] {
  const results: ScriptTestResult[] = [], now = options.now ?? (() => performance.now())
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
  const message = (error: unknown) => error instanceof Error ? error.message : String(error)
  let vm: IsolatedTestVm | null = null, suiteError: string | null = null, initialized = false
  const suiteContext = clone(options.context), suiteStarted = now()
  const recordSuiteFailure = (test: string, error: unknown) => results.push({ script: options.scriptName, test, passed: false, skipped: false, durationMs: now() - suiteStarted, seed: Number(suiteContext.randomSeed) || 1, caseName: '', tags: [], message: message(error) })
  const invoke = (callback: string, context: Record<string, unknown>) => {
    if (!options.functions.has(callback)) return
    const execution = options.parseExecution(vm!.execute_cached_json(options.scriptUuid, callback, JSON.stringify(context)))
    context.properties = execution.properties
    options.onExecution?.(callback, execution)
    const failure = execution.logs.find(log => log.level === 'error')
    if (failure) throw Error(`${callback}: ${failure.message}`)
  }
  try {
    if (options.tests.some(test => !test.skipped || options.includeSkipped)) {
      vm = options.createVm(); vm.compile_cached(options.scriptUuid, options.source); initialized = true
      try { invoke('before_all', suiteContext) } catch (error) { suiteError = `before_all: ${message(error)}` }
    }
    for (const test of options.tests) for (const caseName of test.cases.length ? test.cases : ['']) {
      const started = now(), skipped = test.skipped && !options.includeSkipped
      if (skipped) {
        results.push({ script: options.scriptName, test: test.name, passed: true, skipped: true, durationMs: 0, seed: test.seed, caseName, tags: [...test.tags], message: 'Skipped by @test metadata' }); continue
      }
      const context = clone(suiteContext), failures: string[] = []
      context.randomSeed = test.seed || suiteContext.randomSeed
      context.event = { name: 'test.run', source: 'Script Studio', payload: { test: test.name, case: caseName, seed: context.randomSeed } }
      if (suiteError) failures.push(suiteError)
      else {
        try {
          invoke('before_each', context)
          if (now() - started > test.timeoutMs) throw Error(`Timed out after ${test.timeoutMs} ms during before_each`)
          invoke(test.name, context)
        } catch (error) { failures.push(message(error)) }
        finally { try { invoke('after_each', context) } catch (error) { failures.push(`after_each: ${message(error)}`) } }
      }
      if (now() - started > test.timeoutMs) failures.push(`Timed out after ${test.timeoutMs} ms`)
      results.push({ script: options.scriptName, test: test.name, passed: failures.length === 0, skipped: false, durationMs: now() - started, seed: Number(context.randomSeed) || 1, caseName, tags: [...test.tags], message: failures.join(' | ') || `Passed with deterministic seed ${context.randomSeed}` })
    }
  } catch (error) { recordSuiteFailure('suite initialization', error) }
  finally {
    if (vm) {
      if (initialized) try { invoke('after_all', suiteContext) } catch (error) { recordSuiteFailure('after_all', error) }
      try { vm.free() } catch (error) { recordSuiteFailure('VM cleanup', error) }
    }
  }
  return results
}
