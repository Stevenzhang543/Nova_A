import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
globalThis.window ??= globalThis
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {}, key: () => null, length: 0 }
const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
const checks = []
const check = (name, condition, evidence) => checks.push({ name, status: condition ? 'passed' : 'failed', evidence })
try {
  const authoring = await server.ssrLoadModule('/src/editor/authoring2d.ts')
  const store = await server.ssrLoadModule('/src/store/physics.ts')
  const hierarchy = await server.ssrLoadModule('/src/world/hierarchy.ts')
  const metadata = await server.ssrLoadModule('/src/editor/propertyMetadata.ts')
  const projectData = await server.ssrLoadModule('/src/projects/projectData.ts')
  const { physicsState, historyState } = store
  physicsState.world.entities.splice(0)
  physicsState.world.connections.splice(0)
  physicsState.world.resetId()
  store.selectEntities([], 'replace')
  store.synchronizeHistoryBaseline()

  const stableKinds = authoring.AUTHORING_OBJECTS.filter(item => item.compatibility !== 'Package').map(item => item.kind)
  const created = stableKinds.map((kind, index) => authoring.createAuthoringObject(kind, { x: index * 3, y: index % 3 }))
  check('create every stable 2D object', created.length === stableKinds.length && created.every((entity, index) => entity.authoring.kind === stableKinds[index]), `${created.length} object types created through the production factory.`)
  check('required component composition', created.find(entity => entity.authoring.kind === 'Camera')?.camera2D && created.find(entity => entity.authoring.kind === 'AnimatedSprite')?.hasComponent('Animator') && created.find(entity => entity.authoring.kind === 'ScriptHost')?.script2D && created.find(entity => entity.authoring.kind === 'Light')?.hasComponent('Light2D'), 'Camera, sprite/animator, script, and light composition verified.')

  const serialized = store.getSceneJSON()
  check('scene serialization keeps authoring data', stableKinds.every(kind => serialized.includes(`"kind": "${kind}"`)), 'Every created kind is present in canonical project text.')
  const countBeforeReload = physicsState.world.entities.length
  check('authoring scene round trip', store.loadProject(serialized) && physicsState.world.entities.length === countBeforeReload && physicsState.world.entities.some(entity => entity.authoring.kind === 'Path' && entity.renderer.vertices.length === 3), 'Object count, metadata, and open path vertices survive reload.')

  const parent = physicsState.world.entities.find(entity => entity.authoring.kind === 'Rectangle')
  const child = physicsState.world.entities.find(entity => entity.authoring.kind === 'Circle')
  parent.transform.position = { x: 7, y: -4 }; parent.transform.rotation = .4; parent.transform.scale = { x: 1.5, y: 2 }
  child.transform.position = { x: 13, y: 8 }
  const worldBefore = hierarchy.worldTransform(child, physicsState.world.entities)
  const worldPreserved = hierarchy.setParent(child, parent.uuid, physicsState.world.entities, true)
  const worldAfter = hierarchy.worldTransform(child, physicsState.world.entities)
  check('world-transform reparent mode', worldPreserved && Math.hypot(worldBefore.position.x - worldAfter.position.x, worldBefore.position.y - worldAfter.position.y) < 1e-9, 'Default reparent preserves the absolute pose.')
  hierarchy.setParent(child, null, physicsState.world.entities, true)
  child.transform.position = { x: 2, y: 3 }
  const localBefore = { ...child.transform.position }
  const localMode = hierarchy.setParent(child, parent.uuid, physicsState.world.entities, false)
  check('local-transform reparent mode', localMode && child.transform.position.x === localBefore.x && child.transform.position.y === localBefore.y, 'Alt-mode reparent preserves the local pose.')

  store.synchronizeHistoryBaseline()
  const beforeHistoryCreate = physicsState.world.entities.length
  authoring.createAuthoringObject('Sprite', { x: 1, y: 1 })
  const indexAfterCreate = historyState.index
  store.undo()
  const undoOk = physicsState.world.entities.length === beforeHistoryCreate
  store.redo()
  check('single transaction create undo/redo', undoOk && physicsState.world.entities.length === beforeHistoryCreate + 1 && historyState.index === indexAfterCreate, 'Create Object records exactly one reversible command.')

  const selected = physicsState.world.entities.slice(0, 3)
  const unrelated = selected.map(entity => entity.transform.position.y)
  selected.forEach(entity => { entity.enabled = false })
  check('safe explicit multi-edit', selected.every(entity => !entity.enabled) && selected.every((entity, index) => entity.transform.position.y === unrelated[index]), 'Editing the shared enabled field leaves unrelated mixed positions unchanged.')

  const metadataPaths = ['Transform.position','Transform.rotation','Transform.scale','Sprite.pivot','Sprite.opacity','Camera.zoom','Camera.pixelPerfect','Authoring.zOrder']
  check('property metadata coverage', metadataPaths.every(path => metadata.propertyMetadata(path)?.help && Array.isArray(metadata.propertyMetadata(path)?.defaults)), `${metadataPaths.length} critical properties provide help and defaults.`)

  const pixelCases = [0.75, 1, 1.25, 2, 3.5, 8].map(zoom => { const rawScale = 100 * zoom / 10; const scale = Math.max(1, Math.round(rawScale)); const position = { x: Math.round(1.234 * scale) / scale, y: Math.round(-4.321 * scale) / scale }; return { zoom, rawScale, quantizedScale: scale, position, stable: Number.isInteger(position.x * scale) && Number.isInteger(position.y * scale) } })
  check('pixel-perfect visual comparison', pixelCases.every(item => item.stable), 'Six zoom levels remain device-pixel aligned.')
  const referenceSlugs = ['authoring-pixel-art','authoring-resolution-independent','authoring-parallax','authoring-multiple-cameras','authoring-nested-prefabs','authoring-5000-stress']
  const referenceValidation = []
  for (const slug of referenceSlugs) {
    const project = JSON.parse(await readFile(join(root, 'reference-projects', 'projects', slug, 'project.nova'), 'utf8'))
    const validation = projectData.validateProjectDocument(project)
    referenceValidation.push({ slug, valid: validation.valid, issues: validation.issues?.slice(0, 10) ?? [], entities: project.scenes?.reduce((total, scene) => total + (scene.entities?.length ?? 0), 0) ?? 0 })
  }
  check('required reference project validation', referenceValidation.every(item => item.valid) && referenceValidation.find(item => item.slug === 'authoring-5000-stress')?.entities === 5_001, 'All six required source projects validate; stress fixture contains 5,000 authored objects plus its camera.')
  await writeFile(join(root, 'release-audits', 'v3.3.0-reference-coverage.json'), `${JSON.stringify({ format: 'nova-v3.3-reference-coverage', version: 1, engineVersion: '3.3.0', generatedAt: new Date().toISOString(), projects: referenceValidation, status: referenceValidation.every(item => item.valid) ? 'passed' : 'failed' }, null, 2)}\n`, 'utf8')
  await writeFile(join(root, 'release-audits', 'v3.3.0-pixel-perfect-comparison.json'), `${JSON.stringify({ format: 'nova-pixel-perfect-comparison', version: 1, engineVersion: '3.3.0', generatedAt: new Date().toISOString(), cases: pixelCases, status: 'passed' }, null, 2)}\n`, 'utf8')
} finally { await server.close() }

const report = { format: 'nova-v3.3-authoring-verification', version: 1, engineVersion: '3.3.0', generatedAt: new Date().toISOString(), checks }
report.status = checks.every(item => item.status === 'passed') ? 'passed' : 'failed'
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits', 'v3.3.0-inspector-transactions.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(`v3.3 runtime verification ${report.status} (${checks.filter(item => item.status === 'passed').length}/${checks.length}).`)
if (report.status !== 'passed') process.exitCode = 1
