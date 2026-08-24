import { reactive } from 'vue'
import { getSceneJSON, loadProject, physicsState, resetSimulation, sceneManager, setActiveScene, toggleSimulation } from '../store/physics'
import { gameplayRuntime } from './GameplayRuntime'
import { productionSettings, type ProjectTestAssertion, type ProjectTestDefinition } from './production'

export interface TestAssertionResult extends ProjectTestAssertion { passed: boolean; actual: string; message: string }
export interface ProjectTestResult {
  id: string
  name: string
  kind: ProjectTestDefinition['kind']
  status: 'passed' | 'failed' | 'timeout' | 'error'
  durationMs: number
  assertions: TestAssertionResult[]
  screenshot: string | null
  error: string
}

export interface ProjectTestReport { format: 'nova-test-report'; version: 1; engineVersion: '4.4.0'; startedAt: string; durationMs: number; passed: number; failed: number; results: ProjectTestResult[] }

export const testRunnerState = reactive({ running: false, activeTest: '', completed: 0, total: 0, results: [] as ProjectTestResult[], lastReport: null as ProjectTestReport | null, error: '' })

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

async function runOne(test: ProjectTestDefinition): Promise<ProjectTestResult> {
  const started = performance.now(), assertions: TestAssertionResult[] = []
  try {
    if (test.sceneUuid && sceneManager.scenes.some(scene => scene.uuid === test.sceneUuid) && !setActiveScene(test.sceneUuid)) throw new Error(`Scene ${test.sceneUuid} could not be loaded`)
    if (test.kind !== 'unit') {
      await physicsState.world.wasmReady
      if (physicsState.world.wasmError) throw physicsState.world.wasmError
      toggleSimulation(true); gameplayRuntime.beginSession()
      for (let step = 0; step < test.steps; step++) {
        if (performance.now() - started > test.timeoutMs) return { id: test.id, name: test.name, kind: test.kind, status: 'timeout', durationMs: performance.now() - started, assertions, screenshot: null, error: `Timed out after ${test.timeoutMs} ms` }
        gameplayRuntime.stepOnce()
        if (step % 120 === 0) await new Promise<void>(resolve => window.setTimeout(resolve, 0))
      }
    }
    assertions.push(...test.assertions.map(assertionResult))
    const passed = assertions.every(assertion => assertion.passed)
    return { id: test.id, name: test.name, kind: test.kind, status: passed ? 'passed' : 'failed', durationMs: performance.now() - started, assertions, screenshot: test.captureScreenshot && test.kind !== 'headless' ? screenshot() : null, error: '' }
  } catch (error) {
    return { id: test.id, name: test.name, kind: test.kind, status: 'error', durationMs: performance.now() - started, assertions, screenshot: null, error: error instanceof Error ? error.message : String(error) }
  } finally { gameplayRuntime.stopSession(false); resetSimulation() }
}

export async function runProjectTests(testId?: string): Promise<ProjectTestReport> {
  if (testRunnerState.running) throw new Error('A project test run is already active')
  const selected = productionSettings.testing.tests.filter(test => !testId || test.id === testId), project = getSceneJSON(), started = performance.now(), startedAt = new Date().toISOString()
  testRunnerState.running = true; testRunnerState.activeTest = ''; testRunnerState.completed = 0; testRunnerState.total = selected.length; testRunnerState.error = ''; testRunnerState.results.splice(0)
  try {
    for (const test of selected) {
      testRunnerState.activeTest = test.name
      if (!loadProject(project, true)) throw new Error('Could not restore the test project snapshot')
      const result = await runOne(test); testRunnerState.results.push(result); testRunnerState.completed++
    }
    const results = testRunnerState.results.map(result => ({ ...result, assertions: result.assertions.map(assertion => ({ ...assertion })) }))
    const report: ProjectTestReport = { format: 'nova-test-report', version: 1, engineVersion: '4.4.0', startedAt, durationMs: performance.now() - started, passed: results.filter(result => result.status === 'passed').length, failed: results.filter(result => result.status !== 'passed').length, results }
    testRunnerState.lastReport = report
    return report
  } finally {
    gameplayRuntime.stopSession(false); resetSimulation(); loadProject(project, true)
    testRunnerState.running = false; testRunnerState.activeTest = ''
  }
}

function xml(value: string): string { return value.replace(/[<>&"']/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character] ?? character) }
export function testReportJUnit(report = testRunnerState.lastReport): string {
  if (!report) return '<?xml version="1.0" encoding="UTF-8"?><testsuite name="Nova_A" tests="0"/>'
  const cases = report.results.map(result => `<testcase classname="Nova_A.${xml(result.kind)}" name="${xml(result.name)}" time="${(result.durationMs / 1_000).toFixed(6)}">${result.status === 'passed' ? '' : `<failure message="${xml(result.error || result.assertions.filter(item => !item.passed).map(item => item.message).join('; '))}"/>`}</testcase>`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><testsuite name="Nova_A" tests="${report.results.length}" failures="${report.failed}" time="${(report.durationMs / 1_000).toFixed(6)}">${cases}</testsuite>`
}
