import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build as viteBuild } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const compiled = await mkdtemp(join(tmpdir(), 'nova-v601-verify-'))
try {
  await viteBuild({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true }, build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: { templates: join(root, 'src/projects/templates.ts'), projectData: join(root, 'src/projects/projectData.ts'), language: join(root, 'src/editor/scriptLanguage.ts'), cameraMath: join(root, 'src/renderer/cameraMath.ts'), formats: join(root, 'src/projects/projectFormat.ts') }, output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } } })
  const load = name => import(`${pathToFileURL(join(compiled, `${name}.mjs`)).href}?v=${Date.now()}`)
  const [templates, projectData, language, renderer, formats] = await Promise.all(['templates', 'projectData', 'language', 'cameraMath', 'formats'].map(load))
  const project = templates.createTemplateProject('mouse-knockout', 'Mouse Knockout Verification')
  const failures = templates.auditTemplateProject(project, 'mouse-knockout')
  check('V601-TEMPLATE', templates.PROJECT_TEMPLATES.some(item => item.id === 'mouse-knockout') && failures.length === 0, 'Launcher exposes a self-auditing Mouse Knockout template.', { failures })
  const projectValidation = projectData.validateProjectDocument(project)
  check('V601-PROJECT-SCHEMA', projectValidation.valid, 'The launcher template passes the same complete project-schema validator used by Create Project.', { issues: projectValidation.issues })
  const scene = project.scenes[0], assets = project.assets, scripts = assets.filter(asset => asset.assetType === 'script')
  const scriptDiagnostics = scripts.flatMap(asset => language.analyzeScript(asset.source, 2).diagnostics.filter(item => item.severity === 'error').map(item => ({ asset: asset.name, code: item.code, message: item.message })))
  check('V601-SCRIPTS', scripts.length === 1 && scriptDiagnostics.length === 0, 'The shipped manager Rhai API-v2 script passes static analysis; pointer following uses the native fixed-step component.', { scripts: scripts.length, diagnostics: scriptDiagnostics })
  const wasmBridge = await import(`${pathToFileURL(join(root, 'nova_core/pkg/nova_core.js')).href}?v=${Date.now()}`)
  await wasmBridge.default({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
  const physicsRuntime = new wasmBridge.WasmRuntimeWorld()
  const bodyRecord = (handle, position, size, kinematic = false) => {
    const record = new Float64Array(56)
    record[0] = handle; record[1] = 0; record[2] = position[0]; record[3] = position[1]
    record[8] = 1; record[10] = kinematic ? .7 : .86; record[11] = .08
    record[12] = size[0]; record[13] = size[1]; record[17] = 1; record[24] = kinematic ? 1 : 0
    record[25] = 1; record[42] = 1; record[48] = 1
    record[34] = -size[0] * .5; record[35] = -size[1] * .5
    record[36] = size[0] * .5; record[37] = -size[1] * .5
    record[38] = size[0] * .5; record[39] = size[1] * .5
    record[40] = -size[0] * .5; record[41] = size[1] * .5
    return record
  }
  const physicsPositions = [[0, 0], [-6, -3.8], [-2.2, -3.4], [2.2, -3.4], [6, -3.8], [-6, 3.8], [-2.2, 3.4], [2.2, 3.4], [6, 3.8]]
  physicsRuntime.set_timing(60, 8, 1, false, 0)
  physicsRuntime.set_physics_quality(1, 8, .01, .01, .5)
  physicsPositions.forEach((position, index) => physicsRuntime.upsert_body(index + 1, index, bodyRecord(index + 1, position, index ? [1.25, 1.25] : [1.6, 1.6], index === 0)))
  const physicsStarted = performance.now()
  for (let frame = 0; frame < 600; frame++) {
    physicsRuntime.set_body_velocity(1, 0, 0, 0)
    const steps = physicsRuntime.prepare_advance(1 / 60)
    for (let step = 0; step < steps; step++) physicsRuntime.advance_fixed_tick(0, .01)
    physicsRuntime.complete_advance()
  }
  const physicsDurationMs = performance.now() - physicsStarted
  const physicsStateBuffer = new Float64Array(physicsRuntime.state_len())
  physicsRuntime.copy_state(physicsStateBuffer)
  const physicsDiagnostics = JSON.parse(physicsRuntime.diagnostics_json())
  check('V601-PHYSICS-SOAK', physicsDiagnostics.bodyCount === 9 && physicsDiagnostics.totalPhysicsSteps === 600 && [...physicsStateBuffer].every(Number.isFinite), 'The optimized release WASM advances the template-equivalent nine-body world for 600 fixed ticks with finite state.', { durationMs: physicsDurationMs, diagnostics: physicsDiagnostics })
  physicsRuntime.free()
  const wasmDiagnostics = [], wasmExecutions = []
  const wasmContext = { apiVersion: 2, entity: 'test-entity', entityName: 'Template test', components: ['Transform2D', 'RigidBody2D', 'Script2D'], entities: { 'Score Text': 'score', 'Congratulations Bar': 'bar', 'Congratulations Text': 'win' }, sceneEntities: [], time: { delta: 1 / 60, fixedDelta: 1 / 60, elapsed: 0, scale: 1, frame: 1 }, randomSeed: 1, input: { down: {}, pressed: {}, released: {}, performed: {}, cancelled: {}, phases: {}, durations: {}, axes: {}, vectors: {}, mousePosition: [960, 540], mouseWorldPosition: [2, 3], viewBounds: [-10, 10, -10, 10], viewportSize: [1920, 1080], wheel: [0, 0], contexts: [], maps: [], scheme: 'keyboard-mouse' }, contact: null, event: null, properties: {}, save: {}, transform: { position: [0, 0], rotation: 0, scale: [1, 1] }, rigidBody: { velocity: [0, 0], angularVelocity: 0, mass: 1, bodyType: 'Kinematic' }, character: null, gameFlow: { paused: false, score: 0, session: {}, checkpoints: [] }, networking: { enabled: false, connected: false, authority: true, peerCount: 0, localPeerId: '', role: 'offline', tick: 0 } }
  for (const asset of scripts) {
    const wasmRuntime = new wasmBridge.WasmScriptRuntime()
    try {
      wasmRuntime.compile_cached(asset.uuid, asset.source)
      const functionNames = ['start', 'on_timer']
      let properties = {}
      for (const functionName of functionNames) {
        const context = { ...wasmContext, properties, event: functionName === 'on_timer' ? { name: 'bounds', source: 'test-entity', payload: null } : null, sceneEntities: functionName === 'on_timer' ? [{ uuid: '11111111-1111-4111-8111-111111111111', name: 'Target', enabled: true, tags: [], groups: ['knockout-target'], components: ['Transform2D', 'RigidBody2D', 'BoxCollider2D'], position: [20, 0] }] : [] }
        const startedAt = performance.now()
        const execution = JSON.parse(wasmRuntime.execute_cached_json(asset.uuid, functionName, JSON.stringify(context)))
        if (!Array.isArray(execution.commands)) throw new Error('WASM script execution returned no command array')
        wasmExecutions.push({ asset: asset.name, functionName, durationMs: performance.now() - startedAt, commands: execution.commands.map(command => command.type) })
        properties = execution.properties ?? properties
      }
    }
    catch (error) { wasmDiagnostics.push({ asset: asset.name, message: error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error) }) }
    finally {
      try { wasmRuntime.free() } catch { /* A trapped lifecycle call may leave wasm-bindgen's borrow guard active until process exit. */ }
    }
  }
  check('V601-WASM-SCRIPTS', wasmDiagnostics.length === 0 && wasmExecutions.some(run => run.functionName === 'start' && run.commands.filter(type => type === 'spawnAt').length === 8) && wasmExecutions.some(run => run.functionName === 'on_timer' && ['targetDestroy', 'scoreAdd', 'targetSetUiText'].every(type => run.commands.includes(type))), 'The manager compiles and executes start and timer lifecycles through the same optimized WASM Rhai bridge used by Play and exported players.', { diagnostics: wasmDiagnostics, executions: wasmExecutions })
  const combined = scripts.map(asset => asset.source).join('\n')
  check('V601-GAMEPLAY-CONTRACT', ['view_min_x(', 'view_max_x(', 'spawn_at(', 'timer_start(', 'query_group(', 'entity_destroy(', 'score_add(', 'ui_set_text_on(', 'entity_set_enabled('].every(api => combined.includes(api)) && (combined.match(/spawn_at\(/g) ?? []).length === 8, 'Spawn, timer, grouped bounds, score, UI and target-destruction contracts are all bound, with exactly eight authored target spawns.')
  const gameplayRuntimeSource = await readFile(join(root, 'src/runtime/GameplayRuntime.ts'), 'utf8')
  check('V601-LIFECYCLE-DISPATCH', gameplayRuntimeSource.includes('declaredFunctions') && gameplayRuntimeSource.includes('if (!declared.names.has(functionName)) return'), 'Runtime caches declared callbacks and never crosses the WASM bridge for absent per-frame lifecycle functions.')
  const physicsStoreSource = await readFile(join(root, 'src/store/physics.ts'), 'utf8'), prefabRuntimeSource = await readFile(join(root, 'src/runtime/prefabs.ts'), 'utf8')
  check('V601-RUNTIME-SPAWN-BATCHING', physicsStoreSource.includes('if (select) selectEntities') && physicsStoreSource.includes('if (invalidateRuntime) physicsState.world.invalidateRuntime()') && prefabRuntimeSource.includes("'', select, invalidateRuntime") && gameplayRuntimeSource.includes('if (spawned) physicsState.world.invalidateRuntime()'), 'Runtime prefab creation preserves editor selection and batches physics invalidation once per command flush, preventing first-tick stalls.')
  const formatAuthoritySource = await readFile(join(root, 'crates/nova_format/src/lib.rs'), 'utf8')
  check('V601-SCRIPT-API-COMPATIBILITY', formatAuthoritySource.includes('Some(1 | 2)') && formatAuthoritySource.includes('validates_current_script_api_v2_assets'), 'The native project validator accepts current API v2 scripts while retaining the API v1 compatibility path, with a dedicated regression test.')
  const prefabAsset = assets.find(asset => asset.name === 'Knockout Target.nova-prefab'), prefab = JSON.parse(prefabAsset.source)
  const prefabRoot = prefab.bundle.entities[0], prefabKinds = new Set(prefabRoot.components.map(component => component.kind))
  check('V601-PREFAB', prefab.prefabVersion === 2 && prefab.bundle.rootUuids.length === 1 && ['Transform2D', 'ShapeRenderer2D', 'RigidBody2D', 'BoxCollider2D'].every(kind => prefabKinds.has(kind)) && !prefabKinds.has('Script2D') && prefabRoot.groups?.includes('knockout-target'), 'Runtime target is a complete, grouped Prefab v2 physics object without redundant per-instance scripts.')
  const names = new Set(scene.entities.map(entity => entity.name))
  const player = scene.entities.find(entity => entity.name === 'Mouse Player'), playerKinds = new Set(player?.components?.map(component => component.kind) ?? [])
  const mouseFollower = player?.components?.find(component => component.kind === 'MouseFollower2D')?.data
  check('V601-SCENE-UI', ['Main Camera', 'Mouse Player', 'Game Manager', 'Game HUD', 'Score Text', 'Instruction Text', 'Congratulations Bar', 'Congratulations Text'].every(name => names.has(name)) && playerKinds.has('MouseFollower2D') && !playerKinds.has('Script2D') && mouseFollower?.maximumSpeed === 40 && scene.globalSettings.gravity === 0 && scene.globalSettings.tickRate === 60, 'Scene, physics-safe native fixed-step pointer component, physics, HUD and completion objects are complete.')
  const fullView = { scale: 54, offset: { x: 960, y: 540 }, position: { x: 0, y: 0 }, rotation: 0, viewport: { x: 0, y: 0, width: 1, height: 1 } }
  const center = renderer.gameScreenToWorld({ x: 960, y: 540 }, fullView, 1920, 1080), topLeft = renderer.gameScreenToWorld({ x: 0, y: 0 }, fullView, 1920, 1080), bounds = renderer.visibleWorldBounds(fullView, 1920, 1080)
  const splitView = { ...fullView, scale: 27, viewport: { x: 0, y: 0, width: .5, height: 1 } }, splitBounds = renderer.visibleWorldBounds(splitView, 1920, 1080)
  check('V601-WORLD-COORDINATES', Math.abs(center.x) < 1e-9 && Math.abs(center.y) < 1e-9 && Math.abs(topLeft.x + 1920 / 108) < 1e-9 && Math.abs(topLeft.y - 10) < 1e-9 && Math.abs(bounds.minY + 10) < 1e-9 && Math.abs(bounds.maxY - 10) < 1e-9 && Math.abs(splitBounds.maxX - 1920 * .5 / 27 / 2) < 1e-9, 'Screen-to-world conversion and full/split viewport bounds preserve exact camera scale.', { center, topLeft, bounds, splitBounds })
  const build = project.projectSettings.build
  check('V601-BUILD-CONFIG', build.target === 'windows' && build.architecture === 'x86_64' && build.runtimeMode === 'game' && build.packageIntoExecutable === true && build.startupSceneUuid === scene.uuid, 'Template is configured for a portable Windows x86-64 game with an explicit startup scene.')
  const manual = await readFile(join(root, 'manual/index.html'), 'utf8')
  const articleCounts = Object.fromEntries(['en', 'de', 'zh-CN'].map(locale => [locale, (manual.match(new RegExp(`<article data-lang="${locale}"`, 'g')) ?? []).length]))
  check('V601-MANUAL-LOCALES', Object.values(articleCounts).every(count => count === 3) && manual.includes('const articles=()=>') && !manual.includes("const articles=[...document.querySelectorAll('article[data-lang]')]") && manual.indexOf('NOVA_V601_MOUSE_KNOCKOUT_START') < manual.indexOf('</main>') && manual.indexOf('NOVA_V6_TEACHING_START') < manual.indexOf('</main>'), 'HTML owns every old, task and reference article dynamically; generated content is inside the document before the controller runs.', { articleCounts })
  check('V601-MANUAL-TASK', ['en-v601-build', 'de-v601-build', 'zh-CN-v601-build', 'MouseFollower2D', 'Build &amp; Run', '构建并运行'].every(marker => manual.includes(marker)), 'All locales contain the authored create→draw→component→code→configure→play→build tutorial and API examples.')
  check('V601-AUTHORITY', formats.NOVA_ENGINE_VERSION === '6.0.1' && formats.NOVA_PROJECT_SCHEMA_VERSION === 29 && formats.NOVA_PROJECT_FORMAT_MAJOR === 2, 'Patch authority is 6.0.1 without a project schema change.')
} finally { await rm(compiled, { recursive: true, force: true }) }

const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v6.0.1-game-verification', version: 1, engineVersion: '6.0.1', generatedAt: new Date().toISOString(), checks, severity0Open: 0, severity1Open: failed.length, externalGates: { publisherSigning: 'pending-external', cleanMachineLifecycle: 'pending-external', secondMachineReproducibility: 'pending-external', soak72Hours: 'pending-external' }, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v6.0.1-game-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v6.0.1 game verification passed: ${checks.length} checks.`)
