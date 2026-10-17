/** Local software Edge production adapter. Only SHORT_SMOKE; never H1/H2 hardware qualification. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'

const argument = key => process.argv.find(value => value.startsWith('--' + key + '='))?.slice(key.length + 3)

export async function createBenchmarkRun({ mode, run, signal }) {
  assert.ok(!signal.aborted, 'Benchmark adapter cancelled')
  assert.ok(process.argv.includes('--short-smoke'), 'This adapter forces SwiftShader. Use --short-smoke; provide a separate verified hardware adapter for formal collection.')
  const fixtureArgument = argument('fixture')
  assert.ok(fixtureArgument, '--fixture=<existing real project.nova> is required; this adapter does not generate or substitute a benchmark world')
  const root = resolve(process.env.NOVA_AUDIT_ROOT || process.cwd()), fixture = resolve(root, fixtureArgument)
  const fixtureBytes = await readFile(fixture), fixtureSourceSha256 = createHash('sha256').update(fixtureBytes).digest('hex')
  const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
  const release = packageJson.version.split('.').slice(0, 2).join('.')
  const priorReportDirectory = process.env.NOVA_AUDIT_REPORT_DIRECTORY
  process.env.NOVA_AUDIT_REPORT_DIRECTORY = '.cache/engine-observability-cdp'
  let start, rejectStart, stop, terminalError, disposed = false, delivered = 0
  const started = new Promise((resolveStarted, rejectStarted) => { start = resolveStarted; rejectStart = rejectStarted })
  const stopped = new Promise(resolveStopped => { stop = resolveStopped })
  const aborted = () => { stop(); rejectStart(new Error('Benchmark adapter cancelled')) }
  signal.addEventListener('abort', aborted, { once: true })
  if (signal.aborted) aborted()
  const lifecycle = withBrowserAudit({ release, name: 'engine-observability-' + mode + '-' + run, root, width: 1600, height: 900, development: true, expectedRelease: release, qualifyRelease: false }, async a => {
    const queryUrl = await a.evaluate('location.origin') + '/?novaBenchmarkMode=' + encodeURIComponent(mode)
    await a.client.send('Page.navigate', { url: queryUrl })
    await a.until("location.search.includes('novaBenchmarkMode=')&&!!document.querySelector('.project-manager,.editor-root')", 30000)
    assert.ok(!signal.aborted, 'Benchmark adapter cancelled before opening project')
    await worldUserControls17(a).open(fixture)
    await a.until('!!window.novaPerformanceDiagnosticsV1', 10000)
    await a.click('.actionbar button', 0)
    await a.until("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')==='true'", 10000)
    const readMetadata = () => a.evaluate('window.novaPerformanceDiagnosticsV1.metadata()')
    const metadata = await readMetadata()
    assert.equal(metadata.actualBenchmarkMode, mode, 'The actual owner must apply the requested mode; diagnostics never mutates policy')
    const canvasIdentity = await a.evaluate("(()=>{const canvas=document.querySelector('canvas.render-canvas'),rect=canvas?.getBoundingClientRect();return{timeOrigin:performance.timeOrigin,renderCanvas:canvas&&rect?{backingWidth:canvas.width,backingHeight:canvas.height,cssWidth:rect.width,cssHeight:rect.height}:null}})()")
    metadata.environment = { ...metadata.environment, ...canvasIdentity, fixtureSourceSha256, browser: await a.client.send('Browser.getVersion'), graphicsEvidence: 'HEADLESS_EDGE_SWIFTSHADER_SOFTWARE', scope: 'SHORT_SMOKE', recordingEnabled: false }
    let qualitySignature = metadata.qualitySignature, pending = []
    await a.evaluate('window.novaPerformanceDiagnosticsV1.drain(8192)')
    await a.check('profiling hook reads actual production owner mode', async () => {
      const snapshot = await a.evaluate('window.novaPerformanceDiagnosticsV1.snapshot()')
      assert.ok(snapshot.queuedSamples <= 8192 && snapshot.queuedBytes <= 1024 * 1024)
    })
    const adapter = {
      metadata,
      async nextSample({ signal: sampleSignal }) {
        while (!disposed && !sampleSignal.aborted) {
          if (terminalError) throw terminalError
          if (pending.length) { delivered++; return pending.shift() }
          const batch = await a.evaluate('window.novaPerformanceDiagnosticsV1.drain(128)')
          assert.equal(batch.schemaVersion, 1); assert.equal(batch.droppedSamples, 0, 'Overflowed trace is incomplete and must be rerun')
          assert.ok(batch.samples.length <= 128 && batch.queuedBytes <= 1024 * 1024)
          pending = batch.samples
          if (pending.length) {
            const current = await readMetadata()
            assert.equal(current.actualBenchmarkMode, mode); assert.equal(current.contentHash, metadata.contentHash, 'Running world changed during collection')
            if (current.qualitySignature !== qualitySignature) {
              assert.equal(mode, 'adaptive-experience', 'QualityLocked content/quality must remain frozen')
              const policy = current.environment?.policyTransition
              assert.ok(policy?.oldValues && policy?.newValues && Number.isInteger(policy.revision) && typeof policy.reason === 'string', 'Adaptive changes need actual owner policy-transition evidence')
              pending[0] = { ...pending[0], policy }; qualitySignature = current.qualitySignature
            }
            continue
          }
          await wait(25)
        }
        throw new Error('Benchmark adapter disposed or cancelled')
      },
      async dispose() {
        if (disposed) return
        disposed = true; pending = []; stop()
        await lifecycle
      }
    }
    start(adapter)
    await stopped
    await a.check('bounded trace consumed and browser lifecycle released', async () => { assert.ok(delivered > 0, 'A real observation must have been consumed'); assert.ok(pending.length <= 128) })
  }).catch(error => { terminalError = error; rejectStart(error); throw error }).finally(() => {
    signal.removeEventListener('abort', aborted)
    if (priorReportDirectory === undefined) delete process.env.NOVA_AUDIT_REPORT_DIRECTORY
    else process.env.NOVA_AUDIT_REPORT_DIRECTORY = priorReportDirectory
  })
  // The consumer awaits the same failure during startup or disposal; avoid an unhandled parallel lifecycle rejection.
  void lifecycle.catch(() => {})
  return started
}
