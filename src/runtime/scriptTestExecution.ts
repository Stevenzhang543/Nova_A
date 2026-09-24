/** 脚本测试执行桥接：组织脚本测试运行请求和结果回传。 */
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
/** 使用独立虚拟机执行套件与逐例前后钩子，复制上下文、固定种子并记录超时和失败，最终释放虚拟机。 */ export function executeScriptTestSuite(options: ScriptSuiteOptions): ScriptTestResult[] {
  const results: ScriptTestResult[] = [], now = options.now ?? (/* 调用 performance.now() 并返回调用结果。 */ () => performance.now())
  const clone = /** 用 JSON 往返复制测试数据，隔离套件与每个用例的可变上下文。 */ <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
  const message = /* 根据 error instanceof Error 的真假，分别返回 error.message 或 String(error)。 */ (error: unknown) => error instanceof Error ? error.message : String(error)
  let vm: IsolatedTestVm | null = null, suiteError: string | null = null, initialized = false
  const suiteContext = clone(options.context), suiteStarted = now()
  const recordSuiteFailure = /** 将初始化、套件清理等错误记录为独立失败结果并附带套件耗时。 */ (test: string, error: unknown) => results.push({ script: options.scriptName, test, passed: false, skipped: false, durationMs: now() - suiteStarted, seed: Number(suiteContext.randomSeed) || 1, caseName: '', tags: [], message: message(error) })
  const invoke = /** 仅调用存在的测试回调，回写执行属性并通知观察者，发现错误日志时抛错。 */ (callback: string, context: Record<string, unknown>) => {
    if (!options.functions.has(callback)) return
    const execution = options.parseExecution(vm!.execute_cached_json(options.scriptUuid, callback, JSON.stringify(context)))
    context.properties = execution.properties
    options.onExecution?.(callback, execution)
    const failure = execution.logs.find(/* 比较 log.level 与 'error'，返回严格相等的判断结果。 */ log => log.level === 'error')
    if (failure) throw Error(`${callback}: ${failure.message}`)
  }
  try {
    if (options.tests.some(/* 先计算 !test.skipped；仅当其为假值时求右侧 options.includeSkipped，返回短路求值结果。 */ test => !test.skipped || options.includeSkipped)) {
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
