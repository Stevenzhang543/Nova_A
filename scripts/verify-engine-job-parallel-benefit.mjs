/** Optimized isolated native-browser Worker exploration. No production/config/package edits. */
import { build } from 'vite'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { appendFile, mkdir, mkdtemp, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'

const option = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3)
const root = process.cwd(), reportDir = resolve(option('report-dir') ?? 'release-audits/engine-job-parallel-benefit-20261006')
const sourceManifest = resolve(option('source-manifest') ?? '.cache/engine-overhaul/boundaries-4304a/engine-build-manifest.json')
const sourceFiles = ['src/runtime/jobScheduler.ts', 'src/runtime/jobScheduler.worker.ts', 'src/runtime/dataResources.ts', 'src/runtime/performance/coordinator.ts', 'src/runtime/performance/workScheduler.ts', 'src/runtime/performance/byteBounds.ts', 'src/runtime/performance/services.ts']
const testFiles = ['scripts/verify-engine-job-parallel-benefit.mjs', 'scripts/verify-engine-job-parallel-benefit-cases.mjs', 'tests/fixtures/v1_1_2_project.json', 'package.json', 'pnpm-lock.yaml']
const digest = async path => createHash('sha256').update(await readFile(path)).digest('hex')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const manifest = JSON.parse(await readFile(sourceManifest, 'utf8'))
const sourceHashes = Object.fromEntries(await Promise.all([...sourceFiles, ...testFiles].map(async path => [path, await digest(path)])))
for (const path of sourceFiles) if (manifest.source.find(value => value.path === path)?.sha256 !== sourceHashes[path]) throw Error('Production job input differs from frozen manifest: ' + path)
await mkdir(reportDir, { recursive: true })
const rawPath = join(reportDir, 'raw-events.ndjson')
await writeFile(rawPath, '', { flag: 'wx' })
const artifact = await mkdtemp(join(tmpdir(), 'nova-job-benefit-')), buildDir = join(artifact, 'optimized-host'), profile = join(artifact, 'edge-profile')
const modules = new Set(), workerTargets = [], events = []
let server, browser, socket, report, fatalError = null
const sourceGraph = [], artifacts = []
let artifactManifest
try {
  const buildStarted = Date.now()
  const capture = () => ({ name: 'job-benefit-source-capture', moduleParsed(module) { modules.add(module.id) } })
  const buildDefines = { 'process.env.NODE_ENV': '"production"' }
  await build({ configFile: false, root, logLevel: 'warn', define: buildDefines, plugins: [capture()], worker: { format: 'es', plugins: () => [capture()] }, build: { outDir: buildDir, emptyOutDir: false, target: 'es2022', minify: 'esbuild', sourcemap: false, lib: { entry: resolve('scripts/verify-engine-job-parallel-benefit-cases.mjs'), formats: ['es'], fileName: () => 'job-parallel.js' } } })
  for (const id of [...modules].filter(id => !id.startsWith('\0') && !id.includes('?')).sort()) {
    if (!id.replaceAll('\\', '/').startsWith(root.replaceAll('\\', '/') + '/')) continue
    const path = relative(root, id).replaceAll('\\', '/')
    if (path.startsWith('node_modules/')) continue
    const sha256 = await digest(path), frozen = manifest.source.find(value => value.path === path)?.sha256 ?? null
    sourceGraph.push({ path, sha256, recordedFrozenHash: frozen, matchesFrozen: frozen === null ? null : frozen === sha256 })
    if (sourceFiles.includes(path) && frozen !== sha256) throw Error('Locked production job input differs from 4304 snapshot: ' + path)
  }
  const inventory = async directory => {
    for (const file of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, file.name)
      if (file.isDirectory()) await inventory(path)
      else { const info = await stat(path); artifacts.push({ path: relative(buildDir, path).replaceAll('\\', '/'), bytes: info.size, sha256: await digest(path) }) }
    }
  }
  await inventory(buildDir)
  const isolatedBuildId = 'engine-job-exploration-' + createHash('sha256').update(JSON.stringify({ sourceHashes, sourceGraph, artifacts })).digest('hex').slice(0, 20)
  artifactManifest = { format: 'nova-job-benefit-isolated-artifact', version: 1, buildId: isolatedBuildId, generatedAt: new Date().toISOString(), frozenProductionBuildId: manifest.buildId, sourceManifest, sourceManifestSha256: await digest(sourceManifest), sourceHashes, sourceGraph, artifacts, buildDefines, buildMs: Date.now() - buildStarted, mode: 'Optimized isolated browser/module-Worker host (es2022/esbuild), actual production algorithms and import merge; temporary output, no profile-dist/pkg overwrite.', directory: buildDir, sourceInputMode: 'Seven production algorithm/scheduler/service inputs strictly paired with 4304. Other actual transitive host inputs use individually recorded current hashes and matchesFrozen flags. All candidates use this one independent artifact, never the frozen full Editor artifact or a mixture of builds.', hostInitializationFix: 'Vite lib-mode keeps dependency process.env.NODE_ENV by default. Explicit compile-time production substitution matches the production application mode; no process polyfill, source stub or algorithm replacement.' }
  await writeFile(join(reportDir, 'artifact-manifest.json'), JSON.stringify(artifactManifest, null, 2) + '\n', { flag: 'wx' })
  const fixture = JSON.parse(await readFile('tests/fixtures/v1_1_2_project.json', 'utf8'))
  let writes = Promise.resolve()
  const html = '<!doctype html><meta charset="utf-8"><title>Nova Actual Job Exploration</title><script>window.jobBenefitErrors=[];addEventListener("error",event=>window.jobBenefitErrors.push({message:event.message,filename:event.filename,line:event.lineno,stack:String(event.error?.stack??"")}));addEventListener("unhandledrejection",event=>window.jobBenefitErrors.push({message:String(event.reason),stack:String(event.reason?.stack??"")}));</script><script type="module">import {runJobParallelBenefit} from "/job-parallel.js"; window.jobBenefitRun=()=>runJobParallelBenefit({rows:' + Number(option('rows') ?? 12000) + ',repetitions:' + Number(option('repetitions') ?? 5) + ',fixture:' + JSON.stringify(fixture).replaceAll('<', '\\u003c') + ',publish:async record=>{const response=await fetch("/record",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(record)});if(!response.ok)throw Error("Raw evidence recording failed")}});</script>'
  server = createServer(async (request, response) => {
    try {
      if (request.url === '/record' && request.method === 'POST') {
        const chunks = []; let bytes = 0
        for await (const chunk of request) { bytes += chunk.length; if (bytes > 10 * 1024 * 1024) throw Error('Evidence record too large'); chunks.push(chunk) }
        const body = Buffer.concat(chunks).toString('utf8'), event = JSON.parse(body)
        events.push(event); writes = writes.then(() => appendFile(rawPath, body + '\n')); await writes
        if (event.kind === 'sample') { const sample = event.payload; console.log(`SAMPLE ${sample.scenario} ${sample.temperature} helpers=${sample.helpersRequested} repeat=${sample.repetition} wall=${sample.totalWallMs.toFixed(2)}ms active=${sample.peaks.activeWorkerJobs}/${sample.snapshot.computeHelperLimit} global=${sample.peaks.activeHeavyJobs}/${sample.snapshot.heavyJobAdmissionLimit}`) }
        response.writeHead(201); response.end('saved'); return
      }
      const pathname = new URL(request.url, 'http://127.0.0.1').pathname
      if (pathname === '/') { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(html); return }
      const path = resolve(buildDir, '.' + decodeURIComponent(pathname))
      if (!path.startsWith(buildDir + sep)) { response.writeHead(403); response.end(); return }
      response.setHeader('Content-Type', ['.js', '.mjs'].includes(extname(path)) ? 'text/javascript; charset=utf-8' : extname(path) === '.wasm' ? 'application/wasm' : 'application/octet-stream')
      response.end(await readFile(path))
    } catch (error) { response.writeHead(500); response.end(String(error)) }
  })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  const port = server.address().port
  const executable = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
  if (!executable) throw Error('Native Microsoft Edge not available; actual module Worker experiment cannot proceed')
  browser = spawn(executable, ['--headless=new', '--no-first-run', '--disable-extensions', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `http://127.0.0.1:${port}/`], { stdio: 'ignore', windowsHide: true })
  let debuggerPort
  for (let attempt = 0; attempt < 200 && !debuggerPort; attempt++) { try { debuggerPort = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch {} if (!debuggerPort) await wait(100) }
  if (!debuggerPort) throw Error('Native browser debugging unavailable')
  const target = (await fetch(`http://127.0.0.1:${debuggerPort}/json/list`).then(response => response.json())).find(target => target.type === 'page')
  socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  let sequence = 0; const pending = new Map()
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.method === 'Target.targetCreated' && message.params.targetInfo.type === 'worker') workerTargets.push(message.params.targetInfo)
    const item = pending.get(message.id); if (!item) return
    pending.delete(message.id); clearTimeout(item.timer); message.error ? item.reject(Error(message.error.message)) : item.resolve(message.result)
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence, timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout: ' + method)) }, 900000); pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result.value }
  await send('Target.setDiscoverTargets', { discover: true })
  for (let attempt = 0; attempt < 100 && !await evaluate('typeof window.jobBenefitRun==="function"'); attempt++) await wait(100)
  if (!await evaluate('typeof window.jobBenefitRun==="function"')) throw Error('Actual optimized import host did not initialize: ' + JSON.stringify(await evaluate('window.jobBenefitErrors')))
  report = await evaluate('window.jobBenefitRun()')
  report.browser = await send('Browser.getVersion'); report.realWorkerTargets = workerTargets
  report.format = 'nova-engine-job-parallel-net-benefit-exploration'; report.version = 1; report.generatedAt = new Date().toISOString()
  report.artifact = artifactManifest; report.rawEventsSha256 = await digest(rawPath)
  report.scope = 'Read-only exploration using actual optimized production scheduler/module Workers and original dataResources validation/merge. Fixed workload/input/result hashes, all cold/warm samples retained. No formal120s×5 X2/H qualification, no UI/input/tail rendering or hardware-core/energy claim; no production changes.'
  for (const [path, hash] of Object.entries(sourceHashes)) if (await digest(path) !== hash) throw Error('Inputs changed during exploration: ' + path)
  for (const input of sourceGraph) if (await digest(input.path) !== input.sha256) throw Error('Transitive source changed during exploration: ' + input.path)
  assertRealWorkers(report)
  await writeFile(join(reportDir, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' })
  const ledger = { format: 'nova-engine-job-parallel-exploration-ledger', version: 1, generatedAt: new Date().toISOString(), commit: '82c9c03118848df1c07af323c38a3abade7dd21b', sourceBuildId: manifest.buildId, status: report.status, productionEdited: false,
    artifactBuildId: artifactManifest.buildId,
    added: await Promise.all(testFiles.slice(0, 2).map(async path => ({ path: resolve(path).replaceAll('\\', '/'), before: null, after: await digest(path) }))),
    evidence: await Promise.all(['report.json', 'artifact-manifest.json', 'raw-events.ndjson'].map(async name => ({ path: join(reportDir, name).replaceAll('\\', '/'), sha256: await digest(join(reportDir, name)) }))),
    scope: report.scope, summary: report.summary, cleanup: report.cleanup, restored: events.findLast(event => event.kind === 'restored')?.payload,
    limits: ['hardwareConcurrency is an actual browser logical hint, never physical/free-core or affinity evidence.', 'Created Worker targets differ from peak active compute jobs; both recorded.', 'Total wall includes all actual serial/parallel import/normalization boundaries. Per-job phases overlap and cannot be summed as total wall.', 'Cold means fresh worker pool in initialized browser/artifact-cache host; warm group/order/prewarm costs fully retained.', 'Generated deterministic entity data uses existing project fixture and actual parser/schema APIs; not a saved-project import/UI interaction or formal X2 workload.', 'No production default was changed; helpers3/4 are explicit isolated policy interventions subject to actual global cap.', 'No positive range separation alone enables production parallelism: input/UI p95/p99, target Tauri/Web hosts and sustained repeats remain untested.'] }
  await writeFile(join(reportDir, 'ledger.json'), JSON.stringify(ledger, null, 2) + '\n', { flag: 'wx' })
  for (const summary of report.summary) console.log(`SUMMARY ${summary.scenario} ${summary.temperature} helpers=${summary.helpersRequested} actual=${summary.actualHelperLimit} median=${summary.timing.medianMs.toFixed(2)}ms serial=${summary.serialTiming.medianMs.toFixed(2)}ms net=${summary.medianNetChangePercent.toFixed(1)}% ${summary.decision}`)
  console.log(report.status.toUpperCase() + ' actual job exploration saved ' + reportDir)
  if (report.status !== 'passed') process.exitCode = 1
  try { await send('Browser.close') } catch {}
} catch (error) {
  fatalError = String(error.stack ?? error)
  await writeFile(join(reportDir, 'failure.json'), JSON.stringify({ status: 'failed', fatalError, artifactManifest, eventsCompleted: events.length, realWorkerTargets: workerTargets, sourceHashes }, null, 2) + '\n', { flag: 'wx' })
  console.error(fatalError); process.exitCode = 1
} finally { socket?.close(); browser?.kill(); server?.closeAllConnections(); await new Promise(resolve => server ? server.close(resolve) : resolve()) }

function assertRealWorkers(report) {
  if (report.environment.hardwareConcurrencyHint === null || !report.realWorkerTargets.length) throw Error('No observed real native Worker targets; no multicore result can be claimed')
  if (!report.samples.filter(sample => sample.helpersRequested > 0).every(sample => sample.peaks.activeWorkerJobs > 0 && sample.fallbackJobs === 0)) throw Error('A helper candidate did not use actual native Workers')
}
