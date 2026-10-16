/** Real collection/capture modules and actual Vue template fragments. Functional smoke, not GUI or performance qualification. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { compileTemplate, parse } from 'vue/compiler-sfc'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { transformWithEsbuild } from 'vite'
import ts from 'typescript'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'

const root = process.cwd()
const output = resolve(process.argv.find(value => value.startsWith('--report='))?.slice(9) || '.cache/engine-overhaul/profiler-collection-integration/presentation-first.json')
const beforeDirectory = resolve('.cache/engine-overhaul/profiler-collection-integration/before')
const sha = value => createHash('sha256').update(value).digest('hex')
const checks = [], observations = {}, hashes = {}
let opened, temporary
const check = async (name, run) => { try { await run(); checks.push({ name, status: 'passed' }) } catch (error) { checks.push({ name, status: 'failed', error: String(error.stack ?? error) }) } }
const functionText = (source, name) => {
  const file = ts.createSourceFile('audit.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const statement = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name)
  assert.ok(statement, 'Missing actual function ' + name)
  return statement.getText(file)
}
try {
  opened = await openMediaAuditModules({ repository: root, bases: [root] }, {
    profiler: 'runtime/profiler', tools: 'runtime/performanceTools', copy: 'editor/profilerMeasurementCopy'
  })
  const { profiler: p, tools: t, copy: c } = opened.modules
  const renderer = { gpuMs: null, drawCalls: 1, textureMemoryBytes: 0, renderTargets: 0, batchBreakReasons: {} }
  const sample = { frameMs: 16, physicsMs: 0, renderingMs: 2, scriptsMs: 0, animationMs: 0, audioMs: 0, assetsMs: 0, otherMs: 0, fps: 62.5, memoryMb: null, rafIntervalMs: 16, cpuFrameMs: 3 }
  let scriptCapture, performanceCapture, savedEvidence
  await check('Real bounded owner snapshots flow into v1 script and v4 general captures without inventing heap or GPU measurements', () => {
    p.clearProfiler(); Object.assign(p.profilerState, { enabled: true, frozen: false, overheadMode: 'Full' })
    p.recordScriptFunction('accepted', 'Original', 'update', 1, 7)
    p.recordScriptFunction('rejected', 'x'.repeat(2097152), 'update', 2, 9)
    const current = p.currentScriptProfileCollection()
    assert.equal(current.admittedEntries, 1); assert.equal(current.rejectedCalls, 1)
    assert.equal(current.collectionTruncated, true); assert.equal(current.displayTruncated, false)
    p.recordFrameProfile(sample)
    scriptCapture = p.captureScriptProfile('collection integration')
    performanceCapture = t.capturePerformance('collection integration', renderer)
    savedEvidence = performanceCapture.scriptCollection
    assert.equal(scriptCapture.version, 1); assert.equal(performanceCapture.version, 4)
    assert.deepEqual(scriptCapture.collection, current); assert.deepEqual(savedEvidence, current)
    assert.ok(Object.isFrozen(current) && Object.isFrozen(savedEvidence))
    assert.equal(performanceCapture.renderer.gpuMs, null); assert.equal(performanceCapture.memoryMb, null)
    assert.equal(scriptCapture.entries.length, 1); assert.equal(scriptCapture.entries[0].allocationEstimateBytes, 7)
    observations.captured = { script: scriptCapture, performance: JSON.parse(t.serializePerformanceCapture(performanceCapture)) }
  })
  await check('JSON export preserves optional evidence and resetting current statistics leaves saved capture coverage unchanged', () => {
    const encoded = JSON.parse(t.serializePerformanceCapture(performanceCapture))
    assert.deepEqual(encoded.scriptCollection, savedEvidence)
    assert.deepEqual(p.scriptProfileCaptureCollectionEvidence({ collection: encoded.scriptCollection }), savedEvidence)
    const previous = JSON.stringify(savedEvidence)
    p.clearProfiler(); p.recordScriptFunction('fresh', 'Fresh', 'awake', 1, 2)
    assert.notEqual(p.currentScriptProfileCollection(), savedEvidence)
    assert.equal(JSON.stringify(performanceCapture.scriptCollection), previous)
    assert.equal(JSON.stringify(scriptCapture.collection), previous)
  })
  await check('Archived v2/v3/v4 and v1 captures without metadata remain explicitly unknown rather than receiving current capacity values', () => {
    for (const version of [2, 3, 4]) {
      const legacy = { ...performanceCapture, version }; delete legacy.scriptCollection
      const encoded = JSON.parse(t.serializePerformanceCapture(legacy))
      assert.equal(Object.hasOwn(encoded, 'scriptCollection'), false)
      assert.equal(p.scriptProfileCaptureCollectionEvidence({ collection: encoded.scriptCollection }), null)
    }
    const legacyScript = { ...scriptCapture }; delete legacyScript.collection
    assert.equal(p.scriptProfileCaptureCollectionEvidence(legacyScript), null)
    assert.deepEqual(p.compareScriptProfiles(legacyScript, scriptCapture), p.compareScriptProfiles(scriptCapture, scriptCapture))
    for (const corrupt of [{ ...savedEvidence, rejectedCalls: -1 }, { ...savedEvidence, collectionTruncated: false }, { ...savedEvidence, rankingScope: 'all-world' }]) {
      assert.equal(p.scriptProfileCaptureCollectionEvidence({ collection: corrupt }), null)
    }
  })
  await check('Collection metadata does not change frame budget IDs, comparisons, or CI qualification', () => {
    const other = { ...performanceCapture, id: performanceCapture.id + '-legacy' }; delete other.scriptCollection
    t.performanceToolsState.captures.push(other)
    const compare = t.comparePerformanceCaptures(performanceCapture.id, other.id)
    assert.ok(compare); assert.equal(compare.averageFrameDeltaMs, 0); assert.equal(compare.gpuDeltaMs, null)
    assert.deepEqual(t.performanceCaptureCiReport(other), t.performanceCaptureCiReport(performanceCapture))
    assert.deepEqual(performanceCapture.budget.checks.map(value => value.id), ['frame.average', 'render.average', 'audio.average', 'gpu.frame', 'renderer.drawCalls', 'renderer.textureMemory', 'particles.update', 'profiler.overhead'])
  })
  const panelSource = await readFile(resolve('src/components/ProfilerPanel.vue'), 'utf8')
  const descriptor = parse(panelSource).descriptor
  await check('Exact existing comfort styles and capture/export/compare logic remain unchanged', async () => {
    const beforePanel = await readFile(join(beforeDirectory, 'ProfilerPanel.vue'), 'utf8')
    const previous = parse(beforePanel).descriptor
    assert.deepEqual(descriptor.styles.map(value => value.content), previous.styles.map(value => value.content))
    for (const name of ['takeCapture', 'compareCaptures', 'exportPerformanceCapture', 'takeScriptCapture', 'compareScriptCaptures', 'exportCurrentScriptProfile']) {
      assert.equal(functionText(descriptor.scriptSetup.content, name), functionText(previous.scriptSetup.content, name), name)
    }
    const beforeTools = await readFile(join(beforeDirectory, 'performanceTools.ts'), 'utf8')
    const afterTools = await readFile(resolve('src/runtime/performanceTools.ts'), 'utf8')
    for (const name of ['comparePerformanceCaptures', 'serializePerformanceCapture', 'performanceCaptureCiReport', 'evaluateCapture']) {
      assert.equal(functionText(afterTools, name), functionText(beforeTools, name), name)
    }
    assert.equal(functionText(afterTools, 'capturePerformance').replace('    scriptCollection: currentScriptProfileCollection(),\n', '').replace('    scriptCollection: currentScriptProfileCollection(),\r\n', ''), functionText(beforeTools, 'capturePerformance'))
    observations.comfortStyleHashes = descriptor.styles.map(value => sha(value.content))
  })
  await check('Three languages explain admitted ranking, call rejections, metadata estimates, display truncation and unknown archives separately', () => {
    for (const locale of ['en', 'de', 'zh']) {
      const known = c.scriptProfileCollectionCopy(savedEvidence, locale), unknown = c.scriptProfileCollectionCopy(null, locale)
      assert.ok(known.includes('4096') && known.includes('2097152') && known.includes('2000'))
      assert.ok(!unknown.includes('4096') && !unknown.includes('2097152'))
      assert.ok(c.scriptAllocationEstimateCopy[locale].length > 20)
      const displayOnly = c.scriptProfileCollectionCopy({ ...savedEvidence, admittedEntries: 2001, rejectedCalls: 0, collectionTruncated: false, displayTruncated: true }, locale)
      const both = c.scriptProfileCollectionCopy({ ...savedEvidence, admittedEntries: 2001, displayTruncated: true }, locale)
      assert.notEqual(known, displayOnly); assert.notEqual(both, displayOnly)
      observations[locale] = { known, unknown, displayOnly, both, allocation: c.scriptAllocationEstimateCopy[locale] }
    }
  })
  await check('Actual Scripts template and saved A/B/general-capture notes render real collection evidence without the old allocation-byte suffix', async () => {
    const template = descriptor.template.content
    const scripts = template.slice(template.indexOf('    <div v-else-if="activeTab === \'scripts\'"'), template.indexOf('\n    <div v-else', template.indexOf('    <div v-else-if="activeTab === \'scripts\'"') + 1))
    assert.ok(scripts.includes('script-collection-budget') && scripts.includes('script-capture-collection-b'))
    const general = template.match(/<p data-audit="performance-capture-script-collection">[\s\S]*?<\/p>/)?.[0]
    assert.ok(general)
    const fragment = '<div>' + scripts.replace('v-else-if=', 'v-if=') + general + '</div>'
    const compiled = compileTemplate({ source: fragment, filename: 'ProfilerPanel.vue', id: 'collection-evidence-contract', ssr: true })
    assert.deepEqual(compiled.errors, [])
    temporary = await mkdtemp(resolve('.cache/profiler-collection-ssr-'))
    const file = join(temporary, 'render.mjs')
    await writeFile(file, (await transformWithEsbuild(compiled.code, 'ProfilerPanel.template.ts', { loader: 'ts', format: 'esm' })).code)
    const { ssrRender } = await import(pathToFileURL(file).href)
    const archived = { ...scriptCapture }; delete archived.collection
    for (const locale of ['en', 'de', 'zh']) {
      const context = { activeTab: 'scripts', t: key => key, preferencesState: { locale },
        profilerState: { scriptFunctions: scriptCapture.entries, scriptCaptures: [scriptCapture, archived] },
        scriptCaptureA: 0, scriptCaptureB: 1, scriptComparison: [{ key: 'accepted:update', callsDelta: 0, totalMsDelta: 0, allocationDelta: 7 }],
        scriptCollectionCopy: c.scriptProfileCollectionCopy(savedEvidence, locale),
        scriptAllocationEstimateCopy: c.scriptAllocationEstimateCopy,
        performanceCaptureCollectionCopy: c.scriptProfileCollectionCopy(savedEvidence, locale),
        scriptCaptureCollectionCopy: index => c.scriptProfileCollectionCopy(p.scriptProfileCaptureCollectionEvidence([scriptCapture, archived][index]), locale),
        takeScriptCapture() {}, exportCurrentScriptProfile() {}, clearProfiler() {}, compareScriptCaptures() {},
        signed: value => (value >= 0 ? '+' : '') + value.toFixed(2), signedInteger: value => (value >= 0 ? '+' : '') + Math.round(value) }
      const html = await renderToString(createSSRApp({ ssrRender, setup: () => context }))
      for (const id of ['script-collection-budget', 'script-allocation-estimate-scope', 'script-capture-collection-a', 'script-capture-collection-b', 'performance-capture-script-collection']) assert.ok(html.includes('data-audit="' + id + '"'))
      assert.ok(html.includes('>7</output>')); assert.ok(!html.includes('>7 B</output>') && !html.includes('+7 B'))
      assert.ok(html.includes(c.scriptProfileCollectionCopy(null, locale)))
      await writeFile(join(dirname(output), 'template-' + locale + '.html'), html)
      observations[locale].renderedHtmlSha256 = sha(html)
    }
  })
  for (const file of ['src/runtime/performanceTools.ts', 'src/runtime/profiler.ts', 'src/runtime/profilerCollectionBudget.ts', 'src/editor/profilerMeasurementCopy.ts', 'src/components/ProfilerPanel.vue', 'scripts/verify-engine-profiler-collection-presentation.mjs']) hashes[file] = sha(await readFile(resolve(file)))
} finally {
  if (opened) await opened.close()
  if (temporary) { assert.ok(temporary.startsWith(resolve('.cache') + '\\') || temporary.startsWith(resolve('.cache') + '/')); await rm(temporary, { recursive: true, force: true }) }
}
await mkdir(dirname(output), { recursive: true })
const status = checks.every(value => value.status === 'passed') ? 'passed' : 'failed'
await writeFile(output, JSON.stringify({ format: 'nova-script-collection-presentation-contract', version: 1, status, scope: 'SHORT_SMOKE: actual production modules and Vue template fragments; Node browser-surface stubs. Not full SFC setup, visual/motion, physical GPU, native host or formal overhead qualification.', checks, observations, hashes, notTested: ['New uniform optimized artifact GUI', 'Real heap allocation or collection overhead', 'All M1 dependency boundaries', 'B0–B8/X01–X15/H1/H2 formal sampling'] }, null, 2) + '\n')
console.log(JSON.stringify({ status, checks: checks.length, report: output, scope: 'SHORT_SMOKE' }))
if (status !== 'passed') process.exitCode = 1
