/** Public keyboard/browser lifecycle on a frozen Editor artifact. Software SHORT_SMOKE only. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'

const root = resolve(process.env.NOVA_AUDIT_ROOT || process.cwd())
const dist = resolve(root, process.env.NOVA_AUDIT_DIST_DIRECTORY || '.cache/engine-overhaul/profile-dist')
const output = process.argv.find(x => x.startsWith('--output='))?.slice(9) || '.cache/engine-overhaul/input-cdp-smoke'
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const manifestBytes = await readFile(resolve(dist, 'engine-build-manifest.json')), manifest = JSON.parse(manifestBytes)
assert.equal(manifest.mode, 'optimized-profiling'); assert.equal(manifest.profilingApiEnabled, true)
for (const item of manifest.artifacts) assert.equal(sha256(await readFile(resolve(dist, item.path))), item.sha256, 'Frozen artifact changed: ' + item.path)
await mkdir(resolve(root, output), { recursive: true })
await writeFile(resolve(root, output, 'profile-build-manifest.json'), manifestBytes)
await writeFile(resolve(root, output, 'profile-module-graph.json'), await readFile(resolve(dist, 'engine-module-graph.json')))
const fixture = resolve(root, 'reference-projects/projects/physics-v2617-platformer/project.nova')
process.env.NOVA_AUDIT_REPORT_DIRECTORY = output
const evidence = { scope: 'SHORT_SMOKE', kind: 'ACTUAL_PRODUCTION_INPUT_SUBMISSION', buildId: manifest.buildId,
  artifactSourceHash: manifest.sourceHash, manifestSha256: sha256(manifestBytes), fixture, fixtureSourceSha256: sha256(await readFile(fixture)),
  graphicsEvidence: 'HEADLESS_EDGE_SWIFTSHADER_SOFTWARE', recordingEnabled: false, phases: [],
  metricScope: 'Physical keyboard receipt consumed by the current successful Gameplay frame to actual world graphics CPU API submission. HUD/DOM completion, GPU completion and physical display are excluded.',
  caveats: ['Finite inputToSubmitMs is not input-to-photon.', 'Unknown GPU execution and physical display latency remain null.',
    'DPR is observed; physical monitor DPI and real GPU performance are unavailable.', 'Not B0–B8/X01–X15/H1/H2 or formal warm10s/sample120s/5runs.'] }

await withBrowserAudit({ root, release: '26.37', name: 'engine-observability-input', width: 1600, height: 900,
  development: true, expectedRelease: '26.37', qualifyRelease: false }, async a => {
  const ui = worldUserControls17(a), surface = 'canvas.overlay-canvas[data-game-input-surface]'
  const metadata = () => a.evaluate('window.novaPerformanceDiagnosticsV1.metadata()')
  const runtimeCard = () => a.evaluate(`(()=>{const card=[...document.querySelectorAll('.production-panel section.card')].find(e=>e.querySelector('header>strong')?.textContent==='Large-world runtime');return card?{counts:card.querySelector('header>span').textContent,fields:[...card.querySelectorAll('dl>div')].map(e=>({label:e.querySelector('dt').textContent,value:e.querySelector('dd').textContent}))}:null})()`)
  const drain = async () => {
    const batch = await a.evaluate('window.novaPerformanceDiagnosticsV1.drain(128)')
    assert.equal(batch.schemaVersion, 1); assert.equal(batch.droppedSamples, 0)
    assert.ok(batch.samples.length <= 128 && batch.queuedBytes <= 1048576)
    for (const row of batch.samples) for (const key of ['rafIntervalMs','cpuFrameMs','submissionIntervalMs','inputToSubmitMs','gpuMs'])
      assert.ok(row[key] === null || Number.isFinite(row[key]) && row[key] >= 0, key + ' nullable contract')
    return batch.samples
  }
  const clear = async () => { await a.evaluate('window.novaPerformanceDiagnosticsV1.drain(8192)') }
  const collect = async (name, action, durationMs = 1200, clearFirst = true) => {
    if (clearFirst) await clear()
    const phase = { name, before: await metadata(), startedAt: new Date().toISOString(), samples: [] }
    evidence.phases.push(phase)
    if (action) await action()
    const start = performance.now()
    do { phase.samples.push(...await drain()); assert.ok(phase.samples.length <= 256, 'Diagnostic phase retention bounded'); await wait(70) } while (performance.now() - start < durationMs)
    phase.samples.push(...await drain()); phase.sampledWallMs = performance.now() - start; phase.after = await metadata()
    assert.equal(phase.before.contentHash, phase.after.contentHash); assert.equal(phase.before.qualitySignature, phase.after.qualitySignature)
    assert.ok(phase.samples.length > 0, 'Actual production frames required: ' + name)
    return phase
  }
  const nullInput = phase => assert.ok(phase.samples.every(x => x.inputToSubmitMs === null), phase.name + ' must not invent a receipt')
  try {
    await ui.open(fixture); await a.until('!!window.novaPerformanceDiagnosticsV1')
    await a.check('actual production metadata serializes and identifies the frozen artifact', async () => {
      evidence.metadata = await metadata(); assert.equal(evidence.metadata.buildId, manifest.buildId)
      assert.equal(evidence.metadata.actualBenchmarkMode, 'off')
      // The tool returns the actual call result, exercising metadata() rather than a fixture clone.
      assert.ok(typeof evidence.metadata.contentHash === 'string')
    })
    await ui.workspace('Debug'); await ui.bottom('profiler', 'Profiler')
    await a.check('existing render canvas reports its actual WebGL context', async () => {
      evidence.rendererStats = await a.evaluate("[...document.querySelectorAll('.presentation-diagnostics dl>div')].map(e=>({label:e.querySelector('dt')?.textContent,value:e.querySelector('dd')?.textContent}))")
      assert.ok(evidence.rendererStats.some(x => x.value === 'WebGL2'))
      // Backend was already reported by production RendererStats; this gets that existing context only.
      evidence.actualContext = await a.evaluate(`(()=>{const c=document.querySelector('canvas.render-canvas'),gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info'),r=c.getBoundingClientRect();return {backend:'WebGL2',lost:gl.isContextLost(),renderer:gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER),vendor:gl.getParameter(ext?ext.UNMASKED_VENDOR_WEBGL:gl.VENDOR),backingWidth:c.width,backingHeight:c.height,cssWidth:r.width,cssHeight:r.height,dpr:devicePixelRatio,physicalMonitorDpi:null,timeOrigin:performance.timeOrigin}})()`)
      assert.equal(evidence.actualContext.lost, false)
    })
    await a.click('.sidebar nav button', 0)
    await a.until(`document.querySelector(${JSON.stringify(surface)})?.getAttribute('aria-label')==='Game'`)
    if(process.argv.includes('--expect-live-state')){
      await a.clickText('.production-panel>.ui-tabs button','Jobs',true);evidence.runtimeCardBeforePlay=await runtimeCard()
      assert.ok(evidence.runtimeCardBeforePlay&&Number(evidence.runtimeCardBeforePlay.counts.split('/')[0])>0,'Existing authoring world is synchronized even before Play')
      assert.equal(evidence.runtimeCardBeforePlay.fields.find(x=>x.label==='Dirty transforms')?.value,'0','The resting fixture has no moving transforms before Play')
      await a.check('final policy panel preserves Comfortable type, geometry and independent UI scale',async()=>{
        evidence.policyGeometry=await a.evaluate(`(()=>{const p=document.querySelector('[data-performance-policy=v1]'),s=getComputedStyle(p),h=getComputedStyle(p.querySelector('header'));return {font:parseFloat(getComputedStyle(document.body).fontSize),rootZoom:getComputedStyle(document.documentElement).zoom,padding:[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft],radius:s.borderRadius,margin:[s.marginTop,s.marginRight,s.marginBottom,s.marginLeft],headerGap:h.gap,controls:[...p.querySelectorAll('input,select')].map(e=>({label:e.getAttribute('aria-label'),font:parseFloat(getComputedStyle(e).fontSize),height:e.getBoundingClientRect().height}))}})()`)
        const g=evidence.policyGeometry;assert.equal(g.font,16);assert.equal(g.rootZoom,'1');assert.deepEqual(g.padding,Array(4).fill('20px'));assert.equal(g.radius,'16px');assert.deepEqual(g.margin,Array(4).fill('8px'));assert.equal(g.headerGap,'12px');assert.equal(g.controls.length,6)
        for(const c of g.controls){assert.ok(c.font>=16);assert.ok(c.height>=43.9,c.label)}
      })
    }
    await a.click('.actionbar button', 0)
    await a.until("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')==='true'")
    await a.click(surface); await wait(450)
    if(process.argv.includes('--expect-live-state'))await a.check('actual Editor runtime card refreshes from the same live state after Play',async()=>{
      await a.until("[...document.querySelectorAll('.production-panel section.card')].some(e=>e.querySelector('header>strong')?.textContent==='Large-world runtime'&&[...e.querySelectorAll('dl>div')].some(row=>row.querySelector('dt').textContent==='Dirty transforms'&&Number(row.querySelector('dd').textContent)>0))")
      evidence.runtimeCardAfterPlay=await runtimeCard();assert.notEqual(evidence.runtimeCardAfterPlay.fields.find(x=>x.label==='Dirty transforms').value,evidence.runtimeCardBeforePlay.fields.find(x=>x.label==='Dirty transforms').value)
    })
    await a.check('idle current Gameplay frames leave input latency unavailable', async () => nullInput(await collect('idle', null)))
    await a.check('real mapped keyboard pulse measures current world API submission', async () => {
      const phase = await collect('mapped-space', () => a.press('Space'))
      assert.ok(phase.samples.some(x => x.inputToSubmitMs !== null), 'Mapped current input must reach an actual CPU world submission')
    })
    await a.check('later repeated drawings do not reuse the consumed keyboard receipt', async () => nullInput(await collect('after-consumption-idle', null)))
    await a.check('unmapped keyboard leaves input latency unavailable', async () => nullInput(await collect('unmapped-q', () => a.press('q'))))
    await a.check('paused keyboard and resumed idle do not revive old receipts', async () => {
      await a.click('.actionbar button', 1); await a.until("document.querySelectorAll('.actionbar button')[1]?.getAttribute('aria-pressed')==='true'")
      await a.click(surface); nullInput(await collect('paused-space', () => a.press('Space')))
      await a.click('.actionbar button', 0); await a.until("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')==='true'")
      await a.click(surface); nullInput(await collect('resumed-idle', null))
    })
    await a.check('real text focus excludes mapped keyboard from gameplay receipt latency', async () => {
      await a.press('p', 10); await a.until("document.activeElement?.matches('.command-palette input[type=search]')")
      nullInput(await collect('text-space', () => a.press('Space')))
      await a.press('Escape'); await a.until("!document.querySelector('.command-palette')"); await a.click(surface)
    })
    // A real tab activation may be unavailable in a headless host. Do not emulate visibility with a synthetic event.
    await clear()
    const original = (await a.client.send('Target.getTargetInfo')).targetInfo.targetId
    let other, hiddenObserved = false
    try {
      other = (await a.client.send('Target.createTarget', { url: 'about:blank' })).targetId
      await a.client.send('Target.activateTarget', { targetId: other })
      const deadline = performance.now() + 2000
      while (performance.now() < deadline) { if (await a.evaluate('document.hidden')) { hiddenObserved = true; break } await wait(75) }
      evidence.visibility = { status: hiddenObserved ? 'OBSERVED_HIDDEN' : 'NOT_TESTED', method: 'Actual browser tab activation', hiddenObserved }
      if (hiddenObserved) { await clear(); await wait(500); evidence.visibility.hiddenSamples = await drain(); assert.equal(evidence.visibility.hiddenSamples.length, 0, 'Hidden production host must not advance frames') }
    } finally {
      await a.client.send('Target.activateTarget', { targetId: original }); await a.client.send('Page.bringToFront')
      if (other) await a.client.send('Target.closeTarget', { targetId: other })
    }
    if (hiddenObserved) await a.check('actual hidden resume rebases first interval and does not fabricate input', async () => {
      // Keep the first resume event already queued while CDP brings the actual tab forward.
      const phase = await collect('visible-resume', null, 1200, false)
      nullInput(phase); assert.equal(phase.samples[0].rafIntervalMs, null); assert.equal(phase.samples[0].submissionIntervalMs, null)
      assert.ok(phase.samples.slice(1).some(x => x.rafIntervalMs !== null && x.submissionIntervalMs !== null))
      evidence.visibility.status = 'VERIFIED_ACTUAL_HOST_VISIBILITY_AND_REBASE'
    })
    else evidence.visibility.reason = 'This headless browser did not expose a hidden document after actual tab activation; deterministic actual host-body/WASM rebase evidence is separate.'
    await a.capture('actual-game-submission')
    await a.click('.actionbar button', 3)
    await a.check('public Stop completes its existing session lifecycle',async()=>{
      await a.until("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')==='false'&&document.querySelectorAll('.actionbar button')[1]?.disabled&&document.querySelectorAll('.actionbar button')[3]?.disabled")
      evidence.stoppedRuntimeCard=await runtimeCard()
    })
    evidence.finalQueue = await a.evaluate('window.novaPerformanceDiagnosticsV1.snapshot()')
    assert.ok(evidence.finalQueue.queuedSamples <= 8192 && evidence.finalQueue.queuedBytes <= 1048576)
    evidence.browser = await a.client.send('Browser.getVersion'); evidence.completedAt = new Date().toISOString()
  } finally { await writeFile(resolve(a.evidence, 'engine-observability-input-raw.json'), JSON.stringify(evidence, null, 2) + '\n') }
})
assert.equal(sha256(await readFile(resolve(dist, 'engine-build-manifest.json'))), evidence.manifestSha256)
console.log(JSON.stringify({ status: process.exitCode ? 'failed' : 'verified', scope: 'SHORT_SMOKE', buildId: manifest.buildId, output: resolve(root, output) }))
