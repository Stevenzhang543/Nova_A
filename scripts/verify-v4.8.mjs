import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), output = join(root, 'release-audits'), generatedAt = new Date().toISOString(), checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
globalThis.navigator ??= { hardwareConcurrency: 4, userAgent: 'Nova_A v4.8 verification', mediaDevices: { addEventListener(){}, removeEventListener(){}, async enumerateDevices(){ return [] } } }
globalThis.window ??= { setTimeout, clearTimeout, setInterval, clearInterval, addEventListener(){}, removeEventListener(){}, dispatchEvent(){} }
globalThis.localStorage ??= { getItem(){ return null }, setItem(){}, removeItem(){} }
await mkdir(output, { recursive: true })
console.log('v4.8 verification: starting isolated module host')
const assetDatabaseStub = '\0nova-v48-asset-database-stub'
const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true }, plugins: [{
  name: 'nova-v48-isolated-asset-database', enforce: 'pre',
  resolveId(id) { return id.endsWith('/assets/AssetDatabase') || id === '../assets/AssetDatabase' ? assetDatabaseStub : null },
  load(id) { return id === assetDatabaseStub ? 'export const assetState={records:[]}; export function resolveAsset(){return null}; export function readTextAsset(){return null}; export function resolveTexture(){return null}' : null }
}] })
// The deterministic fixture loader does not need a filesystem watcher; closing
// it prevents cloud-synchronized workspaces from waiting on watcher shutdown.
await server.watcher.close()
try {
  console.log('v4.8 verification: loading renderer and runtime contracts')
  const render = await server.ssrLoadModule('/src/renderer/renderSettings.ts')
  console.log('v4.8 verification: renderer settings loaded')
  const materials = await server.ssrLoadModule('/src/renderer/materials.ts')
  console.log('v4.8 verification: materials loaded')
  const audio = await server.ssrLoadModule('/src/runtime/audio.ts')
  console.log('v4.8 verification: audio loaded')
  const production = await server.ssrLoadModule('/src/runtime/production.ts')
  console.log('v4.8 verification: production settings loaded')
  const components = await server.ssrLoadModule('/src/world/components.ts')
  console.log('v4.8 verification: components loaded')
  const particles = await server.ssrLoadModule('/src/runtime/particles.ts')
  console.log('v4.8 verification: particles loaded')
  const profiler = await server.ssrLoadModule('/src/runtime/profiler.ts')
  console.log('v4.8 verification: profiler loaded')
  const performanceTools = await server.ssrLoadModule('/src/runtime/performanceTools.ts')
  console.log('v4.8 verification: executing deterministic fixtures')

  const settings = render.normalizeRenderingSettings({ rendererPath: 'Native', unsupportedPolicy: 'Block', maximumPixelRatio: 99, budgets: { drawCalls: -4, textureMemoryMb: 999999, overdraw: 0, gpuMs: -1, particleMs: 9999 } })
  check('REN-SETTINGS-BOUNDS', settings.rendererPath === 'Native' && settings.unsupportedPolicy === 'Block' && settings.maximumPixelRatio === 4 && settings.budgets.drawCalls === 1 && settings.budgets.textureMemoryMb === 65536 && settings.budgets.overdraw === 1 && settings.budgets.gpuMs === .1 && settings.budgets.particleMs === 100, 'Renderer path, fallback policy and every budget normalize to documented bounds.', settings)

  const valid = materials.defaultMaterial('Valid'), invalid = materials.defaultMaterial('Invalid'); invalid.fragment = '#include <missing>\nvec4 nova_material(vec4 c, vec2 uv) { return c; }'
  const validDiagnostics = materials.compileMaterialPreview(valid.fragment, valid.includes), invalidDiagnostics = materials.compileMaterialPreview(invalid.fragment, invalid.includes)
  const fallbackBefore = materials.materialRuntimeDiagnostics.fallbackCount
  materials.reportMaterialFallback('fixture-invalid', 'Unsupported recursive/platform shader fixture')
  const platformDiagnostics = materials.validateMaterialForPlatform(invalid, 'web', 'Canvas2D')
  check('REN-SHADER-DIAGNOSTICS', validDiagnostics.every(item => item.severity !== 'error') && invalidDiagnostics.some(item => item.severity === 'error') && platformDiagnostics.some(item => item.severity === 'error') && materials.materialRuntimeDiagnostics.fallbackCount === fallbackBefore + 1, 'Valid shaders pass; invalid/platform-divergent shaders fail visibly and fallback is recorded.', { validDiagnostics, invalidDiagnostics, platformDiagnostics })
  for (let index = 0; index < 80; index++) materials.reportMaterialFallback(`fixture-${index}`, 'bounded diagnostic')
  check('REN-FALLBACK-BOUNDED', materials.materialRuntimeDiagnostics.fallbackEvents.length <= 64, 'Shader fallback history is bounded.', { events: materials.materialRuntimeDiagnostics.fallbackEvents.length })

  const normalizedAudio = audio.normalizeAudioSettings({ sampleRate: 47_000, mixer: { outputDeviceId: 'fixture', limiterEnabled: true, limiterCeilingDb: 3, masterVoiceLimit: 9999, buses: [{ id: 'Master', parent: null, automation: [{ time: 4, gain: 2 }, { time: 1, gain: -.5 }] }, { id: 'Loop', parent: 'Loop', sends: [{ target: 'Loop', gain: 1 }] }] } })
  const loopBus = normalizedAudio.mixer.buses.find(bus => bus.id === 'Loop')
  check('AUD-GRAPH-NORMALIZATION', normalizedAudio.sampleRate === 48000 && normalizedAudio.mixer.limiterCeilingDb === 0 && normalizedAudio.mixer.masterVoiceLimit === 1024 && loopBus?.parent === 'Master' && loopBus.sends.length === 0 && normalizedAudio.mixer.buses[0].automation[0].time === 1, 'Audio device, limiter, graph-cycle and automation inputs normalize deterministically.', normalizedAudio.mixer)

  const emitter = new components.ParticleEmitter2D(); Object.assign(emitter, { emissionRate: Infinity, lifetime: -4, collisionMode: 'Invalid', collisionRestitution: 9, collisionLayerMask: -1 })
  particles.normalizeParticleEmitter(emitter)
  check('REN-PARTICLE-NORMALIZATION', Number.isFinite(emitter.emissionRate) && emitter.lifetime >= 1e-4 && ['None','Bounce','Stop'].includes(emitter.collisionMode) && emitter.collisionRestitution <= 1 && emitter.collisionLayerMask >= 0, 'Particle rates, lifetime and collision settings remain finite and bounded.', { emissionRate: emitter.emissionRate, lifetime: emitter.lifetime, collisionMode: emitter.collisionMode, restitution: emitter.collisionRestitution, mask: emitter.collisionLayerMask })

  const normalizedProduction = production.normalizeProductionSettings({ performance: { frameBudgetMs: -1, gpuBudgetMs: 1e9, drawCallBudget: 0, textureBudgetMb: Infinity, profilerOverheadBudgetPercent: 900 } })
  check('PRF-BUDGET-NORMALIZATION', normalizedProduction.performance.frameBudgetMs === 1 && normalizedProduction.performance.gpuBudgetMs === 1000 && normalizedProduction.performance.drawCallBudget === 1 && normalizedProduction.performance.textureBudgetMb === 256 && normalizedProduction.performance.profilerOverheadBudgetPercent === 100, 'CI performance budgets reject invalid or unbounded values.', normalizedProduction.performance)

  profiler.profilerState.samples.splice(0); profiler.profilerState.samples.push({ frame: 1, frameMs: 5, inputMs: .2, physicsMs: .5, scriptsMs: .5, animationMs: .2, audioMs: .2, renderingMs: 2, uiMs: .2, gpuPasses: 1, memoryMb: 50, allocations: 0, assetJobs: 0, timestamp: 1 })
  const rendererStats = { backend: 'WebGL2', drawCalls: 2, batches: 1, triangles: 2, sprites: 1, textures: 1, textureMemoryBytes: 1024, renderTargets: 0, lights: 0, particles: 0, gpuMs: 1, contextLost: false, fallbackReason: '', batchBreakReasons: {} }
  const captureA = performanceTools.capturePerformance('baseline', rendererStats), captureB = performanceTools.capturePerformance('candidate', { ...rendererStats, drawCalls: 3 })
  const comparison = performanceTools.comparePerformanceCaptures(captureA.id, captureB.id), serialized = JSON.parse(performanceTools.serializePerformanceCapture(captureA)), ci = performanceTools.performanceCaptureCiReport(captureA)
  check('PRF-CAPTURE-CI', serialized.engineVersion === '4.8.0' && serialized.version === 2 && ci.status === 'passed' && comparison?.drawCallDelta === 1 && Array.isArray(captureA.markers) && Array.isArray(captureA.counters) && Array.isArray(captureA.annotations), 'Captures save, compare and export deterministic CI budget results.', { ci, comparison })
} finally { console.log('v4.8 verification: closing isolated module host'); await Promise.race([server.close(), new Promise(resolve => setTimeout(resolve, 2_000))]) }

const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v4.8-renderer-audio-verification', version: 1, engineVersion: '4.8.0', generatedAt, checks, severity0Open: 0, severity1Open: failed.length, status: failed.length ? 'failed' : 'passed' }
await writeFile(join(output, 'v4.8.0-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) console.error(failed)
else console.log(`Nova_A v4.8 verification passed: ${checks.length} runtime checks.`)
process.exit(failed.length ? 1 : 0)
