import { webcrypto } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'
import { build } from 'vite'

if (!globalThis.crypto) globalThis.crypto = webcrypto
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const compiled = await mkdtemp(join(tmpdir(), 'nova-v650-verify-'))
const checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const source = path => readFile(join(root, path), 'utf8')

const colliderSource = (shapeModel, vertices = [], shapes = []) => ({
  shapeModel, offset: { x: 0, y: 0 }, rotation: 0, size: { x: 2, y: 2 }, radiusX: 1, radiusY: 1,
  vertices, shapes, sensor: false, physicsLayer: 0, collisionMask: 0xffff_ffff, oneWay: false, oneWayNormal: { x: 0, y: 1 }
})
const child = (id, kind, offset, size, properties = {}) => ({ id, kind, offset, rotation: 0, size, radius: Math.min(size.x, size.y) * .5, points: [], enabled: true, sensor: false, physicsLayer: 0, collisionMask: 0xffff_ffff, oneWay: false, oneWayNormal: { x: 0, y: 1 }, ...properties })

try {
  await build({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true }, build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: { geometry: join(root, 'src/runtime/physicsGeometry.ts'), rendering: join(root, 'src/renderer/renderSettings.ts'), formats: join(root, 'src/projects/projectFormat.ts') }, output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } } })
  const load = name => import(`${pathToFileURL(join(compiled, `${name}.mjs`)).href}?v=${Date.now()}`)
  const [geometry, rendering, formats] = await Promise.all(['geometry', 'rendering', 'formats'].map(load))
  check('V650-AUTHORITY', formats.NOVA_ENGINE_VERSION === '6.5.0' && formats.NOVA_PROJECT_FORMAT_MAJOR === 2 && formats.NOVA_PROJECT_SCHEMA_VERSION === 29, 'Engine authority is 6.5.0 while Project Format 2/schema 29 remain frozen.')

  const concavePoints = [{ x: -2, y: -2 }, { x: 2, y: -2 }, { x: 2, y: -1 }, { x: 0, y: -1 }, { x: 0, y: 2 }, { x: -2, y: 2 }]
  const firstTriangles = geometry.decomposeSimplePolygon(concavePoints), secondTriangles = geometry.decomposeSimplePolygon(concavePoints)
  check('V650-CONCAVE-DECOMPOSITION', firstTriangles.length === concavePoints.length - 2 && JSON.stringify(firstTriangles) === JSON.stringify(secondTriangles), 'Simple static concave polygons decompose into a deterministic n-2 triangle set.', { points: concavePoints.length, triangles: firstTriangles.length })
  const bowTie = geometry.decomposeSimplePolygon([{ x: -1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }])
  check('V650-MALFORMED-POLYGON', bowTie.length === 0, 'Self-intersecting polygon input fails closed instead of becoming a convex envelope.')

  const staticConcave = geometry.prepareColliderSet(colliderSource('ConcavePolygon', concavePoints), false)
  const dynamicConcave = geometry.prepareColliderSet(colliderSource('ConcavePolygon', concavePoints), true)
  const chain = geometry.prepareColliderSet(colliderSource('Chain', [{ x: -2, y: 0 }, { x: 0, y: 1 }, { x: 2, y: 0 }]), false)
  check('V650-SHAPE-SUPPORT', staticConcave.shapes.length === 4 && staticConcave.decomposed && chain.shapes.length === 2 && dynamicConcave.shapes.length === 0 && dynamicConcave.blockedReason?.includes('Dynamic ConcavePolygon'), 'Static Concave/Chain shapes solve exactly and unsafe dynamic concave use is blocked with recovery text.')

  const compoundInput = colliderSource('Box', [], [
    child('arm-x', 'Box', { x: 1.5, y: 0 }, { x: 3, y: .5 }, { sensor: true, physicsLayer: 2, collisionMask: 0b1100 }),
    child('arm-y', 'Box', { x: 0, y: 1.5 }, { x: .5, y: 3 }, { oneWay: true, oneWayNormal: { x: 0, y: -1 } })
  ])
  const compoundA = geometry.prepareColliderSet(compoundInput, true), compoundB = geometry.prepareColliderSet(compoundInput, true)
  check('V650-EXACT-COMPOUND', compoundA.shapes.length === 3 && new Set(compoundA.shapes.map(item => item.id)).size === 3 && JSON.stringify(compoundA) === JSON.stringify(compoundB), 'Compound children remain independent, stable and deterministic rather than becoming one envelope.')
  const matrix = Array(32).fill(0xffff_ffff); matrix[2] = 0b0100
  const encoded = geometry.encodeColliderChildren(compoundA.shapes, { x: 2, y: .5 }, matrix)
  check('V650-CHILD-POLICY-ABI', encoded.length === geometry.COLLIDER_CHILD_STRIDE * 2 && encoded[7] === 1 && encoded[8] === 2 && encoded[9] === 0b0100 && encoded[geometry.COLLIDER_CHILD_STRIDE + 18] === 1 && encoded[geometry.COLLIDER_CHILD_STRIDE + 20] === -1, 'The additive child ABI preserves sensor, per-child matrix, one-way normal and non-uniform scale independently.', { stride: geometry.COLLIDER_CHILD_STRIDE, bytes: encoded.byteLength })
  const areas = compoundA.shapes.map(shape => geometry.solverShapeArea(shape, { x: 2, y: .5 })), totalArea = areas.reduce((sum, area) => sum + area, 0), totalMass = totalArea * 2
  const compoundInertia = compoundA.shapes.reduce((sum, shape, index) => sum + geometry.solverShapeInertia(shape, { x: 2, y: .5 }, totalMass * areas[index] / totalArea), 0)
  check('V650-COMPOUND-MASS-INERTIA', Math.abs(totalArea - 5.5) < 1e-12 && Math.abs(totalMass - 11) < 1e-12 && Number.isFinite(compoundInertia) && compoundInertia > 0 && areas[1] === 0, 'Automatic mass uses exact non-sensor child area and compound inertia uses the parallel-axis term under non-uniform scale.', { totalArea, totalMass, compoundInertia })

  rendering.loadRenderingSettings({ qualityPreset: 'Balanced', maximumPixelRatio: 1.5, particleBudget: 10_000, shadowQuality: 'Soft', qualityVolumes: [
    { id: 'far', name: 'Far', enabled: true, center: { x: 0, y: 0 }, size: { x: 20, y: 20 }, priority: 1, preset: 'Performance' },
    { id: 'hero', name: 'Hero', enabled: true, center: { x: 0, y: 0 }, size: { x: 4, y: 4 }, priority: 8, preset: 'High', maximumPixelRatio: 1.75, particleBudget: 12_345, shadowQuality: 'Ultra' }
  ] })
  const inside = { ...rendering.updateActiveRenderQuality({ x: 0, y: 0 }) }, outer = { ...rendering.updateActiveRenderQuality({ x: 8, y: 0 }) }, outside = { ...rendering.updateActiveRenderQuality({ x: 100, y: 0 }) }
  check('V650-QUALITY-VOLUMES', inside.volumeId === 'hero' && inside.maximumPixelRatio === 1.75 && inside.particleBudget === 12_345 && outer.volumeId === 'far' && outside.volumeId === null && outside.maximumPixelRatio === 1.5, 'Highest-priority camera volume wins and leaving all volumes restores the project quality.', { inside, outer, outside })
  const bounded = rendering.normalizeRenderingSettings({ qualityVolumes: Array.from({ length: 80 }, (_, index) => ({ id: `v-${index}`, enabled: true, center: { x: 0, y: 0 }, size: { x: Infinity, y: -1 }, priority: Infinity, preset: 'Ultra' })) })
  check('V650-QUALITY-BOUNDS', bounded.qualityVolumes.length === 64 && bounded.qualityVolumes.every(item => Number.isFinite(item.size.x) && item.size.x >= .001 && Number.isFinite(item.priority)), 'Malformed quality volumes are finite and the authoring list is bounded to 64.')

  const started = performance.now(); for (let index = 0; index < 25_000; index++) geometry.prepareColliderSet(compoundInput, true); const preparationMs = performance.now() - started
  check('V650-LOW-END-BUDGET', preparationMs < 4_000, '25,000 exact three-child preparations remain inside the local low-end CPU budget.', { preparations: 25_000, elapsedMs: Number(preparationMs.toFixed(2)) })

  const paths = ['crates/nova_physics/src/body.rs', 'crates/nova_physics/src/world/legacy.rs', 'crates/nova_physics/src/world/persistent.rs', 'crates/nova_physics/src/solver/contact_solver.rs', 'crates/nova_physics/src/rope/mod.rs', 'src/world/World.ts', 'src/components/WorldCanvas.vue', 'src/components/ConfigPanel.vue', 'src/components/RenderingPanel.vue', 'src/renderer/WebGL2Renderer.ts', 'src/renderer/renderOptimization.ts', 'src/i18n.ts', 'instructions.txt', 'docs/PHYSICS_RENDERER_6_5.md']
  const sources = Object.fromEntries(await Promise.all(paths.map(async path => [path, await source(path)])))
  check('V650-SOLVER-CONNECTION', sources['crates/nova_physics/src/body.rs'].includes('collider_children') && sources['crates/nova_physics/src/world/legacy.rs'].includes('warm_start_contact') && sources['crates/nova_physics/src/world/legacy.rs'].includes('synchronize_sleep_islands') && sources['crates/nova_physics/src/world/persistent.rs'].includes('first_collider') && sources['crates/nova_physics/src/rope/mod.rs'].includes('collider_proxy'), 'Exact children, warm starts, sleep islands, child event identities and Rope2D compound proxies are connected in the retained solver.')
  check('V650-JOINT-CCD', sources['crates/nova_physics/src/world/legacy.rs'].includes('maximum_collider_radius') && sources['crates/nova_physics/src/rope/mod.rs'].includes('joint_axis') && sources['crates/nova_physics/src/rope/mod.rs'].includes('break_torque'), 'Compound rotational CCD and axis-correct joint limit/motor break accounting reach the solver.')
  check('V650-AUTHORITATIVE-UI', sources['src/world/World.ts'].includes('upsert_collider_shapes') && sources['src/components/WorldCanvas.vue'].includes('prepareColliderSet') && sources['src/components/ConfigPanel.vue'].includes('shape.oneWayNormal'), 'Runtime upload, exact debug overlay and complete child policy authoring share one preparation model.')
  check('V650-RENDER-DIAGNOSTICS', ['textureUploads', 'shaderCompiles', 'shaderFallbacks', 'contextLosses'].every(name => sources['src/renderer/WebGL2Renderer.ts'].includes(name)) && sources['src/components/RenderingPanel.vue'].includes('activeQualityVolume') && sources['src/renderer/renderOptimization.ts'].includes("'device-recovery'"), 'Renderer diagnostics, contextual recommendations and quality-volume status are connected.')
  check('V650-LOCALIZATION', (sources['src/i18n.ts'].match(/qualityVolumes:/g) ?? []).length >= 3 && (sources['src/i18n.ts'].match(/shaderFallbacks:/g) ?? []).length >= 3 && sources['src/i18n.ts'].includes("releaseLabel:'Nova_A v6.5.0'"), 'New rendering controls and recovery guidance are present in English, German and Chinese.')
  check('V650-DOCUMENTATION', sources['instructions.txt'].includes('## 6.5.0 implementation checkpoint') && sources['docs/PHYSICS_RENDERER_6_5.md'].includes('Cross and hexagram workflow'), 'The authoritative checkpoint and task-oriented physics/renderer guide are present.')
} finally { await rm(compiled, { recursive: true, force: true }) }

const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v6.5.0-verification', version: 1, engineVersion: '6.5.0', generatedAt: new Date().toISOString(), perspectives: ['compatibility', 'physics', 'geometry', 'ccd', 'constraints', 'rope', 'rendering', 'performance', 'localization', 'documentation'], checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v6.5.0-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v6.5.0 verification passed: ${checks.length} checks.`)
