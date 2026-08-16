import { createHash } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = process.argv.find(value => value.startsWith('--output='))?.slice(9) || join(root, 'release-audits', 'v3.0.0-benchmarks.json')
const percentile = (values, fraction) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * fraction))]
const result = {
  format: 'nova-benchmark-report', version: 1, engineVersion: '3.0.0', generatedAt: new Date().toISOString(),
  machine: { platform: process.platform, architecture: process.arch, node: process.version, cpuCount: (await import('node:os')).cpus().length, totalMemoryBytes: (await import('node:os')).totalmem() },
  methodology: {
    physics: 'Release-mode legacy bridge, 2,000 separated dynamic bodies, 240 fixed 60 Hz steps; includes record decode/encode and finite-value validation.',
    scriptReload: 'Rhai editor language analysis of a representative gameplay source, 1,000 warm iterations; p95 reported.',
    assetImportCore: 'Decode/hash/compress a deterministic 16 MiB source buffer 20 times; p95 reported. Browser image decode is intentionally excluded.',
    export: 'Headless deterministic web export of the platformer reference project against the production dist.',
    artifactSize: 'On-disk bytes of available native executable and production web assets.'
  },
  measurements: {}, exceptions: []
}

const physics = spawnSync('cargo', ['run', '--release', '-q', '-p', 'nova_physics', '--example', 'v3_benchmark'], { cwd: root, encoding: 'utf8' })
if (physics.status === 0) result.measurements.physics = JSON.parse(physics.stdout.trim().split(/\r?\n/).at(-1))
else result.exceptions.push({ metric: 'physics', reason: physics.stderr.trim().slice(0, 2_000), plan: 'Run the benchmark on a provisioned Rust release runner.' })

const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
try {
  const { analyzeScript } = await server.ssrLoadModule('/src/editor/scriptLanguage.ts')
  const source = '@export let speed = 8.0;\nfn awake(){ print("ready"); }\nfn fixed_update(dt){ let x=input_axis("Move"); set_velocity(x*speed, rigid_body().velocity_y); }\nfn on_trigger_enter(other,px,py,nx,ny,rvx,rvy){ save_set("last",other); }'
  for (let index = 0; index < 50; index++) analyzeScript(source)
  const samples = []
  for (let index = 0; index < 1_000; index++) { const start = performance.now(); analyzeScript(source); samples.push(performance.now() - start) }
  result.measurements.scriptReload = { iterations: samples.length, medianMs: percentile(samples, .5), p95Ms: percentile(samples, .95), maximumMs: Math.max(...samples) }
} finally { await server.close() }

const bytes = Buffer.alloc(16 * 1024 * 1024)
for (let index = 0; index < bytes.length; index += 4096) bytes[index] = index & 255
const importSamples = []
const { gzipSync } = await import('node:zlib')
for (let index = 0; index < 20; index++) { const start = performance.now(); createHash('sha256').update(bytes).digest(); gzipSync(bytes, { level: 6, mtime: 0 }); importSamples.push(performance.now() - start) }
result.measurements.assetImportCore = { sourceBytes: bytes.length, iterations: importSamples.length, medianMs: percentile(importSamples, .5), p95Ms: percentile(importSamples, .95) }

const temporary = await mkdtemp(join(tmpdir(), 'nova-v3-benchmark-'))
try {
  const project = join(root, 'reference-projects', 'projects', 'platformer.nova')
  const start = performance.now()
  const exported = spawnSync(process.execPath, [join(root, 'scripts', 'nova-export.mjs'), '--project', project, '--target', 'web', '--output', temporary, '--profile', 'release'], { cwd: root, encoding: 'utf8' })
  if (exported.status === 0) result.measurements.export = { elapsedMs: performance.now() - start, report: JSON.parse(exported.stdout.trim()) }
  else result.exceptions.push({ metric: 'export', reason: exported.stderr.trim().slice(0, 2_000), plan: 'Build the production dist and rerun the deterministic reference export.' })
} finally { await rm(temporary, { recursive: true, force: true }) }

const sizes = {}
for (const [name, path] of Object.entries({ nativeWindows: join(root, 'src-tauri', 'target', 'release', 'nova_a.exe'), webIndex: join(root, 'dist', 'index.html'), webPlayer: join(root, 'dist', 'player.html') })) {
  try { sizes[name] = (await stat(path)).size } catch { sizes[name] = null }
}
try {
  const assetRoot = join(root, 'dist', 'assets')
  const assetNames = await readdir(assetRoot)
  const javascript = assetNames.filter(name => name.endsWith('.js'))
  const javascriptSizes = await Promise.all(javascript.map(async name => {
    const contents = await readFile(join(assetRoot, name))
    return { name, bytes: contents.length, gzipBytes: gzipSync(contents, { level: 9, mtime: 0 }).length }
  }))
  const largest = javascriptSizes.sort((first, second) => second.bytes - first.bytes)[0] ?? null
  sizes.webJavascriptFiles = javascriptSizes.length
  sizes.webJavascriptBytes = javascriptSizes.reduce((total, entry) => total + entry.bytes, 0)
  sizes.webJavascriptGzipBytes = javascriptSizes.reduce((total, entry) => total + entry.gzipBytes, 0)
  sizes.largestWebJavascript = largest
} catch {
  sizes.webJavascriptFiles = null
  sizes.webJavascriptBytes = null
  sizes.webJavascriptGzipBytes = null
  sizes.largestWebJavascript = null
}
result.measurements.artifactSize = sizes
for (const metric of ['editorColdStartMs', 'editorIdleWorkingSetBytes', 'frameTimeP95Ms', 'workspaceSwitchP95Ms']) {
  result.measurements[metric] = null
  result.exceptions.push({ metric, reason: 'Requires an instrumented interactive native/GPU session; the headless benchmark does not invent a result.', plan: 'Capture on the published reference machine and attach the JSON result to the release evidence.' })
}
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
console.log(`Wrote honest v3 benchmark evidence to ${output}`)
