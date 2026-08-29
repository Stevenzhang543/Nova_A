import { reactive } from 'vue'
import { getSceneJSON, loadProject, physicsState, resetSimulation, sceneManager, setActiveScene, toggleSimulation } from '../store/physics'
import { gameplayRuntime } from './GameplayRuntime'
import { productionSettings, type ProjectTestAssertion, type ProjectTestDefinition } from './production'
import { resetScriptCoverage, scriptCoverageReport, type ScriptCoverageReport } from './scriptCoverage'
import { NOVA_ENGINE_VERSION } from '../projects/projectFormat'

export interface TestAssertionResult extends ProjectTestAssertion { passed: boolean; actual: string; message: string }
export interface ProjectTestResult {
  id: string
  name: string
  kind: ProjectTestDefinition['kind']
  status: 'passed' | 'failed' | 'timeout' | 'error' | 'cancelled'
  durationMs: number
  assertions: TestAssertionResult[]
  screenshot: string | null
  error: string
  seed: number
  attempts: number
  tags: string[]
  fixture: string
}

export interface ProjectTestReport { format: 'nova-test-report'; version: 2; engineVersion: string; startedAt: string; durationMs: number; seed: number; shard: { index: number; count: number }; filters: { tags: string[]; changed: string[] }; passed: number; failed: number; cancelled: number; coverage: ScriptCoverageReport; results: ProjectTestResult[] }
export interface ProjectTestRunOptions { tags?: string[]; changed?: string[]; shardIndex?: number; shardCount?: number; seed?: number; signal?: AbortSignal }

export const testRunnerState = reactive({ running: false, activeTest: '', completed: 0, total: 0, results: [] as ProjectTestResult[], lastReport: null as ProjectTestReport | null, error: '' })
let activeController: AbortController | null = null

function screenshot(): string | null {
  const canvas = document.querySelector<HTMLCanvasElement>('.overlay-canvas')
  try { return canvas?.toDataURL('image/png') ?? null } catch { return null }
}

function assertionResult(assertion: ProjectTestAssertion): TestAssertionResult {
  let passed = false, actual = '', message = ''
  if (assertion.kind === 'entityCountAtLeast') {
    actual = String(physicsState.world.entities.length); passed = physicsState.world.entities.length >= Math.max(0, Number(assertion.expected) || 0)
  } else if (assertion.kind === 'entityExists') {
    const exists = physicsState.world.entities.some(entity => entity.uuid === assertion.target || entity.name === assertion.target); actual = String(exists); passed = exists
  } else if (assertion.kind === 'finitePhysics') {
    const invalid = physicsState.world.entities.find(entity => ![entity.transform.position.x, entity.transform.position.y, entity.velocity.x, entity.velocity.y, entity.angularVelocity].every(Number.isFinite))
    actual = invalid?.uuid ?? 'finite'; passed = !invalid
  } else if (assertion.kind === 'checksumEquals') {
    actual = physicsState.world.stateChecksum(); passed = Boolean(assertion.expected) && actual === assertion.expected
  } else {
    actual = String(gameplayRuntime.diagnostics.scriptErrors); passed = gameplayRuntime.diagnostics.scriptErrors === 0
  }
  if (!passed) message = `${assertion.kind} expected ${assertion.expected || 'success'}, received ${actual}`
  return { ...assertion, passed, actual, message }
}

async function runOne(test: ProjectTestDefinition, signal?: AbortSignal, attempt = 1): Promise<ProjectTestResult> {
  const started = performance.now(), assertions: TestAssertionResult[] = []
  try {
    if (signal?.aborted) return { id: test.id, name: test.name, kind: test.kind, status: 'cancelled', durationMs: 0, assertions, screenshot: null, error: 'Cancelled before start', seed: test.seed, attempts: attempt, tags: [...test.tags], fixture: test.fixture }
    if (test.sceneUuid && sceneManager.scenes.some(scene => scene.uuid === test.sceneUuid) && !setActiveScene(test.sceneUuid)) throw new Error(`Scene ${test.sceneUuid} could not be loaded`)
    if (test.kind !== 'unit') {
      await physicsState.world.wasmReady
      if (physicsState.world.wasmError) throw physicsState.world.wasmError
      toggleSimulation(true); gameplayRuntime.beginSession()
      for (let step = 0; step < test.steps; step++) {
        if (signal?.aborted) return { id: test.id, name: test.name, kind: test.kind, status: 'cancelled', durationMs: performance.now() - started, assertions, screenshot: null, error: 'Cancelled', seed: test.seed, attempts: attempt, tags: [...test.tags], fixture: test.fixture }
        if (performance.now() - started > test.timeoutMs) return { id: test.id, name: test.name, kind: test.kind, status: 'timeout', durationMs: performance.now() - started, assertions, screenshot: null, error: `Timed out after ${test.timeoutMs} ms`, seed: test.seed, attempts: attempt, tags: [...test.tags], fixture: test.fixture }
        gameplayRuntime.stepOnce()
        if (step % 120 === 0) await new Promise<void>(resolve => window.setTimeout(resolve, 0))
      }
    }
    assertions.push(...test.assertions.map(assertionResult))
    const passed = assertions.every(assertion => assertion.passed)
    return { id: test.id, name: test.name, kind: test.kind, status: passed ? 'passed' : 'failed', durationMs: performance.now() - started, assertions, screenshot: test.captureScreenshot && test.kind !== 'headless' ? screenshot() : null, error: '', seed: test.seed, attempts: attempt, tags: [...test.tags], fixture: test.fixture }
  } catch (error) {
    return { id: test.id, name: test.name, kind: test.kind, status: 'error', durationMs: performance.now() - started, assertions, screenshot: null, error: error instanceof Error ? error.message : String(error), seed: test.seed, attempts: attempt, tags: [...test.tags], fixture: test.fixture }
  } finally { gameplayRuntime.stopSession(false); resetSimulation() }
}

function shardHash(value: string): number { let hash = 2166136261; for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0; return hash }

export async function runProjectTests(testId?: string, options: ProjectTestRunOptions = {}): Promise<ProjectTestReport> {
  if (testRunnerState.running) throw new Error('A project test run is already active')
  const shardCount = Math.min(256, Math.max(1, Math.round(options.shardCount ?? 1))), shardIndex = Math.min(shardCount - 1, Math.max(0, Math.round(options.shardIndex ?? 0)))
  const tags = [...new Set(options.tags?.map(tag => tag.trim()).filter(Boolean) ?? [])], changed = [...new Set(options.changed?.map(id => id.trim()).filter(Boolean) ?? [])]
  const selected = productionSettings.testing.tests.filter(test => (!testId || test.id === testId) && (!tags.length || tags.every(tag => test.tags.includes(tag))) && (!changed.length || changed.includes(test.id)) && shardHash(test.id) % shardCount === shardIndex)
  const project = getSceneJSON(), started = performance.now(), startedAt = new Date().toISOString(), seed = Number.isFinite(options.seed) ? Number(options.seed) >>> 0 : 1
  const controller = new AbortController()
  activeController = controller
  options.signal?.addEventListener('abort', () => controller.abort(), { once: true })
  resetScriptCoverage()
  testRunnerState.running = true; testRunnerState.activeTest = ''; testRunnerState.completed = 0; testRunnerState.total = selected.length; testRunnerState.error = ''; testRunnerState.results.splice(0)
  try {
    for (const test of selected) {
      testRunnerState.activeTest = test.name
      if (!loadProject(project, true)) throw new Error('Could not restore the test project snapshot')
      let result = await runOne({ ...test, seed: test.seed || seed }, controller.signal)
      const retries = test.flakyInfrastructure ? Math.min(3, test.retries) : 0
      for (let attempt = 2; result.status !== 'passed' && result.status !== 'cancelled' && attempt <= retries + 1; attempt++) result = await runOne({ ...test, seed: test.seed || seed }, controller.signal, attempt)
      testRunnerState.results.push(result); testRunnerState.completed++
      if (result.status === 'cancelled') break
    }
    const results = testRunnerState.results.map(result => ({ ...result, assertions: result.assertions.map(assertion => ({ ...assertion })) }))
    const report: ProjectTestReport = { format: 'nova-test-report', version: 2, engineVersion: NOVA_ENGINE_VERSION, startedAt, durationMs: performance.now() - started, seed, shard: { index: shardIndex, count: shardCount }, filters: { tags, changed }, passed: results.filter(result => result.status === 'passed').length, failed: results.filter(result => !['passed', 'cancelled'].includes(result.status)).length, cancelled: results.filter(result => result.status === 'cancelled').length, coverage: scriptCoverageReport(), results }
    testRunnerState.lastReport = report
    return report
  } finally {
    gameplayRuntime.stopSession(false); resetSimulation(); loadProject(project, true)
    testRunnerState.running = false; testRunnerState.activeTest = ''; activeController = null
  }
}

function xml(value: string): string { return value.replace(/[<>&"']/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character] ?? character) }
export function testReportJUnit(report = testRunnerState.lastReport): string {
  if (!report) return '<?xml version="1.0" encoding="UTF-8"?><testsuite name="Nova_A" tests="0"/>'
  const cases = report.results.map(result => `<testcase classname="Nova_A.${xml(result.kind)}" name="${xml(result.name)}" time="${(result.durationMs / 1_000).toFixed(6)}"><properties><property name="seed" value="${result.seed}"/><property name="attempts" value="${result.attempts}"/><property name="tags" value="${xml(result.tags.join(','))}"/></properties>${result.status === 'passed' ? '' : result.status === 'cancelled' ? '<skipped message="cancelled"/>' : `<failure message="${xml(result.error || result.assertions.filter(item => !item.passed).map(item => item.message).join('; '))}"/>`}</testcase>`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><testsuite name="Nova_A" tests="${report.results.length}" failures="${report.failed}" skipped="${report.cancelled}" time="${(report.durationMs / 1_000).toFixed(6)}">${cases}</testsuite>`
}

export function testReportJson(report = testRunnerState.lastReport): string { return `${JSON.stringify(report ?? { format: 'nova-test-report', version: 2, engineVersion: NOVA_ENGINE_VERSION, results: [] }, null, 2)}\n` }
export function cancelProjectTests(): void { activeController?.abort() }
