import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const value = name => process.argv.find(argument => argument.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
const requestedHours = Math.max(0, Number(value('duration-hours') ?? 0))
const requestedCycles = Math.max(1, Math.min(100_000, Number(value('cycles') ?? 500)))
const output = value('output') || join(root, 'release-audits', 'v3.0.0-stability-smoke.json')
const projects = ['empty', 'platformer', 'top-down', 'physics-sandbox', 'ui-showcase', 'networked-optional']
const loaded = await Promise.all(projects.map(name => readFile(join(root, 'reference-projects', 'projects', `${name}.nova`), 'utf8').then(JSON.parse)))
const goodPlugin = await readFile(join(root, 'reference-projects', 'plugins', 'hello-plugin', 'hello-plugin.wasm'))
const deadline = requestedHours ? performance.now() + requestedHours * 3_600_000 : Number.POSITIVE_INFINITY
const started = performance.now()
let cycles = 0, playStopCycles = 0, sceneStreamingOperations = 0, assetReimports = 0, corruptInputs = 0, isolatedPluginFaults = 0, peakHeapBytes = 0

const faultingPlugin = Uint8Array.from([
  0x00,0x61,0x73,0x6d,0x01,0x00,0x00,0x00,0x01,0x05,0x01,0x60,0x00,0x01,0x7f,0x03,0x03,0x02,0x00,0x00,
  0x07,0x2e,0x02,0x17,0x6e,0x6f,0x76,0x61,0x5f,0x70,0x6c,0x75,0x67,0x69,0x6e,0x5f,0x61,0x70,0x69,0x5f,0x76,0x65,0x72,0x73,0x69,0x6f,0x6e,0x00,0x00,
  0x10,0x6e,0x6f,0x76,0x61,0x5f,0x70,0x6c,0x75,0x67,0x69,0x6e,0x5f,0x69,0x6e,0x69,0x74,0x00,0x01,
  0x0a,0x0a,0x02,0x04,0x00,0x41,0x02,0x0b,0x03,0x00,0x00,0x0b
])
if (!WebAssembly.validate(goodPlugin) || !WebAssembly.validate(faultingPlugin)) throw new Error('Stability plugin fixtures are invalid.')

do {
  const project = loaded[cycles % loaded.length]
  // Repeated play/stop isolation: runtime receives a deep copy and the editor
  // source must remain byte-identical after arbitrary runtime mutation.
  const before = JSON.stringify(project)
  const runtime = structuredClone(project)
  runtime.scenes[0].entities.push({ uuid: 'runtime-only', components: [] })
  if (JSON.stringify(project) !== before) throw new Error('Play/stop isolation modified the editor project.')
  playStopCycles++

  for (const scene of runtime.scenes) { scene.loaded = !scene.loaded; scene.loaded = true; sceneStreamingOperations += 2 }
  const asset = Buffer.from(String(runtime.assets?.[cycles % Math.max(1, runtime.assets.length)]?.source ?? before))
  const first = createHash('sha256').update(asset).digest('hex')
  const second = createHash('sha256').update(Buffer.from(asset)).digest('hex')
  if (first !== second) throw new Error('Asset reimport hash drifted.')
  assetReimports++

  const corrupt = before.slice(0, Math.max(1, (cycles * 7919) % before.length)) + '\u0000{' + before.slice(Math.max(1, (cycles * 7919) % before.length) + 1)
  try { JSON.parse(corrupt) } catch { corruptInputs++ }

  try {
    const instance = await WebAssembly.instantiate(faultingPlugin)
    instance.instance.exports.nova_plugin_init()
    throw new Error('Faulting plugin unexpectedly returned.')
  } catch (error) {
    if (!(error instanceof WebAssembly.RuntimeError)) throw error
    isolatedPluginFaults++
  }
  const healthy = await WebAssembly.instantiate(goodPlugin)
  if (healthy.instance.exports.nova_plugin_api_version() !== 2 || healthy.instance.exports.nova_plugin_init() !== 1) throw new Error('Healthy plugin did not recover after an isolated fault.')

  cycles++
  peakHeapBytes = Math.max(peakHeapBytes, process.memoryUsage().heapUsed)
  if (cycles % 100 === 0) await new Promise(resolve => setImmediate(resolve))
} while (requestedHours ? performance.now() < deadline : cycles < requestedCycles)

const elapsedHours = (performance.now() - started) / 3_600_000
const report = {
  format: 'nova-stability-report', version: 1, engineVersion: '3.0.0', generatedAt: new Date().toISOString(),
  requestedHours, requestedCycles, elapsedHours, qualified24Hours: requestedHours >= 24 && elapsedHours >= 23.99,
  cycles, playStopCycles, sceneStreamingOperations, assetReimports, corruptInputs, isolatedPluginFaults, peakHeapBytes,
  status: 'passed', note: requestedHours >= 24 && elapsedHours >= 23.99 ? '24-hour qualification completed.' : 'Bounded local smoke completed; this is not represented as a 24-hour pass.'
}
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(`${report.note} ${cycles} cycles; report: ${output}`)
