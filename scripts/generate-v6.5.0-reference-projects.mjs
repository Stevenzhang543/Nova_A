import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, 'reference-projects/projects/creator-v650-physics-renderer')
const compiled = await mkdtemp(join(tmpdir(), 'nova-v650-reference-'))
const shape = (id, kind, offset, size, properties = {}) => ({ id, kind, offset, rotation: 0, size, radius: Math.min(size.x, size.y) * .5, points: [], enabled: true, sensor: false, physicsLayer: 0, collisionMask: 0xffff_ffff, oneWay: false, oneWayNormal: { x: 0, y: 1 }, ...properties })
try {
  await build({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true }, build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: { templates: join(root, 'src/projects/templates.ts') }, output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } } })
  const templates = await import(`${pathToFileURL(join(compiled, 'templates.mjs')).href}?v=${Date.now()}`)
  const project = templates.createTemplateProject('physics-sandbox', 'Nova 6.5 Physics and Renderer Audit')
  project.projectMetadata.description = 'Exact compound, Chain/Concave, CCD, joints, Rope2D and renderer-quality reference.'
  project.projectSettings.build.gameName = 'Nova 6.5 Physics Renderer Audit'
  project.projectSettings.rendering = { ...(project.projectSettings.rendering ?? {}), rendererPath: 'Auto', unsupportedPolicy: 'WarnAndFallback', qualityPreset: 'Balanced', maximumPixelRatio: 1.5, particleBudget: 10_000, shadowQuality: 'Soft', budgets: { drawCalls: 500, textureMemoryMb: 256, overdraw: 4, gpuMs: 8, particleMs: 2 }, qualityVolumes: [
    { id: 'low-end-outer', name: 'Low-end outer field', enabled: true, center: { x: 0, y: 0 }, size: { x: 40, y: 24 }, priority: 1, preset: 'Performance', maximumPixelRatio: 1, particleBudget: 2_500, shadowQuality: 'Off' },
    { id: 'hero-fidelity', name: 'Hero fidelity', enabled: true, center: { x: 0, y: 0 }, size: { x: 10, y: 8 }, priority: 10, preset: 'High', maximumPixelRatio: 1.75, particleBudget: 15_000, shadowQuality: 'Soft' }
  ] }
  const scene = project.scenes[0]
  const colliderOf = name => scene.entities.find(entity => entity.name === name)?.components.find(component => component.kind.endsWith('Collider2D'))?.data
  const bodyOf = name => scene.entities.find(entity => entity.name === name)?.components.find(component => component.kind === 'RigidBody2D')?.data
  const cross = colliderOf('Jointed Box')
  if (!cross) throw new Error('Physics Sandbox Jointed Box collider is missing.')
  cross.shapes = [
    shape('cross-horizontal', 'Box', { x: 0, y: 0 }, { x: 3.6, y: .65 }),
    shape('cross-vertical', 'Box', { x: 0, y: 0 }, { x: .65, y: 3.6 }),
    shape('cross-sensor', 'Circle', { x: 0, y: 1.9 }, { x: .35, y: .35 }, { sensor: true, physicsLayer: 2, collisionMask: 0b0100 })
  ]
  const crossBody = bodyOf('Jointed Box'); if (crossBody) { crossBody.continuousCollision = 'Continuous'; crossBody.autoInertia = true }
  const ground = colliderOf('Ground')
  if (!ground) throw new Error('Physics Sandbox Ground collider is missing.')
  ground.shapes = [
    shape('terrain-chain', 'Chain', { x: 0, y: 2.2 }, { x: 1, y: .04 }, { points: [{ x: -7, y: 0 }, { x: -3, y: .5 }, { x: 0, y: 0 }, { x: 3, y: .5 }, { x: 7, y: 0 }] }),
    shape('terrain-concave', 'ConcavePolygon', { x: 5.5, y: 2.8 }, { x: 1, y: 1 }, { points: [{ x: -1.5, y: -1.5 }, { x: 1.5, y: -1.5 }, { x: 1.5, y: -.5 }, { x: 0, y: -.5 }, { x: 0, y: 1.5 }, { x: -1.5, y: 1.5 }] }),
    shape('one-way-shelf', 'Box', { x: -4.5, y: 3.5 }, { x: 3, y: .25 }, { oneWay: true, oneWayNormal: { x: 0, y: 1 } })
  ]
  const ropeBall = colliderOf('Rope Ball')
  if (ropeBall) ropeBall.shapes = [shape('rope-ball-lobe', 'Circle', { x: .65, y: 0 }, { x: .55, y: .55 })]

  const failures = templates.auditTemplateProject(project, 'physics-sandbox')
  if (failures.length) throw new Error(`Physics reference failed: ${failures.join('; ')}`)
  await mkdir(output, { recursive: true })
  await writeFile(join(output, 'project.nova'), `${JSON.stringify(project, null, 2)}\n`)
  await writeFile(join(output, 'README.md'), `# Nova_A 6.5.0 physics and renderer audit

Engine **6.5.0** · Project Format 2 · schema 29

Open **project.nova**. The retained Physics Sandbox remains playable and exportable as **Nova 6.5 Physics Renderer Audit**.

1. Enable physics debug. **Jointed Box** has exact crossing horizontal/vertical children and a blue sensor lobe; contacts must show stable child IDs and no filled convex envelope. Drag, resize and rotate it, then run continuously so the outer arm exercises rotational CCD.
2. **Ground** adds a five-point Chain, a six-point static concave L shape and a one-way shelf. Their debug outlines must match the pieces without a seam. Temporarily make the Ground dynamic and confirm Project Health blocks it; undo.
3. Run the joint and Rope2D sample. The prismatic/revolute settings use linear/angular motors and limits; break reactions appear in Physics Monitor. Rope particles ignore the two rope owners, collide with Ground/Jointed Box, and transfer force through the anchors.
4. Bind two overlapping rectangles into a cross or two triangles into a hexagram, move/run/separate them, and confirm one transform/collision response with restored originals. Change a child layer/mask and confirm only eligible contacts remain.
5. In Rendering → Quality, move the active camera through **Hero fidelity**, **Low-end outer field**, and outside both. Diagnostics must report the active volume plus passes, lights, particles, textures, uploads, shader fallbacks and context recovery.
6. Repeat in English, German and Chinese at 100–200% UI scale. One grid unit, one Inspector unit and one physics meter must match. Build & Run and confirm the output launches independently.

Publisher signing, independent clean-machine/hardware/accessibility certification, matching-host non-Windows builds and a real-duration soak remain external gates.
`)
  await writeFile(join(output, 'test-controls.json'), `${JSON.stringify({ engineVersion: '6.5.0', reference: 'creator-v650-physics-renderer', locales: ['en', 'de', 'zh'], uiScales: [1, 1.25, 1.5, 1.75, 2], actions: ['inspect exact child overlay', 'drag resize and rotate compound', 'block dynamic concave then undo', 'run motors limits and break reaction', 'run rope owner exclusion and third-body collision', 'bind cross and hexagram then separate', 'isolate child layer and mask', 'move camera through quality volumes', 'inspect renderer counters', 'play and build game'], expected: { projectFormat: 2, schema: 29, compoundChildren: 5, chainEdges: 4, concaveTriangles: 4, qualityVolumes: 2, featuresRemoved: 0, animationsRemoved: 0, portableBuildConfigured: true } }, null, 2)}\n`)
  await writeFile(join(output, 'expected-output.json'), `${JSON.stringify({ engineVersion: '6.5.0', status: 'passed', physics: { exactCompound: true, staticChain: true, staticConcave: true, rotationalCcd: true, warmStart: true, sleepIslands: true, jointMotorsLimitsBreaks: true, ropeOwnerExclusion: true }, rendering: { authoritativeOverlay: true, shaderParticleLightPassTextureDiagnostics: true, qualityVolumes: true }, compatibility: { projectFormat: 2, schema: 29, frozenPublicApis: true }, externalCertification: 'pending' }, null, 2)}\n`)
} finally { await rm(compiled, { recursive: true, force: true }) }

const indexPath = join(root, 'reference-projects/README.md')
let index = await readFile(indexPath, 'utf8')
const start = '<!-- NOVA_V650_REFERENCES_START -->', end = '<!-- NOVA_V650_REFERENCES_END -->'
const block = `${start}\n## Nova_A 6.5.0 physics and renderer project\n\n- [Physics and renderer audit](projects/creator-v650-physics-renderer/README.md) — exact compound/Chain/static-concave collision, rotational CCD, joints, Rope2D, authoritative overlays, renderer diagnostics, quality volumes, and portable output.\n${end}`
const expression = new RegExp(`${start}[\\s\\S]*?${end}`, 'm')
index = expression.test(index) ? index.replace(expression, block) : `${index.trimEnd()}\n\n${block}\n`
await writeFile(indexPath, index, 'utf8')
console.log('Generated the Nova_A v6.5.0 physics and renderer reference project.')
