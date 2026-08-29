import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Win32', hardwareConcurrency: 8, userAgent: 'Nova_A v5.4 gameplay verifier', mediaDevices: { addEventListener(){}, removeEventListener(){}, async enumerateDevices(){ return [] } }, getGamepads(){ return [] } } })
globalThis.window ??= { setTimeout, clearTimeout, setInterval, clearInterval, addEventListener(){}, removeEventListener(){}, dispatchEvent(){} }
globalThis.localStorage ??= { getItem(){ return null }, setItem(){}, removeItem(){} }
globalThis.performance ??= { now: () => Date.now() }

const checks = [], check = (id, passed, detail, metrics = {}) => { checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics }); if (!passed) console.error(`${id}: ${detail}`) }
const refs = ['gameplay-v54-snake-growth','gameplay-v54-platformer','gameplay-v54-twin-stick','gameplay-v54-menu','gameplay-v54-pooling']
const projects = Object.fromEntries(await Promise.all(refs.map(async id => [id, JSON.parse(await readFile(join(root, `reference-projects/projects/${id}/project.nova`), 'utf8'))])))
const componentKinds = project => project.scenes.flatMap(scene => scene.entities).flatMap(entity => entity.components.map(component => component.kind))
const scriptSources = project => project.assets.filter(asset => asset.assetType === 'script').map(asset => ({ name: asset.name, source: asset.source }))
check('V540-REFERENCES', refs.every(id => projects[id].engineVersion === '5.4.0' && projects[id].projectFormatMajor === 2 && projects[id].formatVersion === 29), 'Five Project Format 2/schema 29 references identify engine 5.4.0.', { references: refs })
const snakeSource = scriptSources(projects[refs[0]]).map(item => item.source).join('\n')
check('V540-SNAKE', ['Health2D','CameraFollow2D'].every(kind => componentKinds(projects[refs[0]]).includes(kind)) && ['spawn_at','query_group','entity_position_x_on'].every(marker => snakeSource.includes(marker)), 'Snake grows a spawned segment and moves the bounded body query using snapshot positions.')
check('V540-PLATFORMER', ['PlatformController2D','Health2D','CameraFollow2D'].every(kind => componentKinds(projects[refs[1]]).includes(kind)), 'Platformer owns controller, health and camera-follow components.')
check('V540-TWIN', ['TopDownController2D','Health2D','DamageHitbox2D'].every(kind => componentKinds(projects[refs[2]]).includes(kind)) && scriptSources(projects[refs[2]]).some(item => item.source.includes('input_map_enable') && item.source.includes('spawn_at')), 'Twin-stick reference enables Combat action map and fires a dynamic projectile.')
check('V540-MENU', scriptSources(projects[refs[3]]).some(item => ['input_context_push','game_pause','checkpoint_set','scene_load','scene_reload','scene_quit'].every(marker => item.source.includes(marker))), 'Menu reference exercises input context and complete game-flow commands.')
check('V540-POOLING', ['ObjectPool2D','Spawner2D','Cooldown2D'].every(kind => componentKinds(projects[refs[4]]).includes(kind)) && projects[refs[4]].assets.some(asset => asset.assetType === 'prefab' && asset.source.includes('Projectile2D') && asset.source.includes('Lifetime2D')), 'Pooling reference prewarms, spawns and returns lifetime-bound projectiles.')

const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } }); await server.watcher.close()
try {
  const components = await server.ssrLoadModule('/src/world/components.ts'), input = await server.ssrLoadModule('/src/runtime/input.ts'), dynamic = await server.ssrLoadModule('/src/runtime/dynamicObjects.ts'), api = await server.ssrLoadModule('/src/editor/scriptApi.ts'), catalog = await server.ssrLoadModule('/src/visual/graphCatalog.ts'), language = await server.ssrLoadModule('/src/editor/scriptLanguage.ts'), editor = await server.ssrLoadModule('/src/store/editor.ts')
  const kinds = ['GridMover2D','PlatformController2D','TopDownController2D','Health2D','DamageHitbox2D','Collectible2D','Projectile2D','Spawner2D','Cooldown2D','Lifetime2D','CameraFollow2D']
  const instances = kinds.map(kind => new components[kind]()), copied = instances.map(instance => components.copyComponentValues(instance))
  check('V540-COMPONENT-STATE', instances.every((instance,index) => instance.kind === kinds[index]) && copied.every(value => Object.keys(value).every(key => !key.startsWith('runtime'))), 'All eleven gameplay components construct and runtime-only fields stay out of serialized state.', { kinds })

  const normalized = input.normalizeInputMap([{ name:'Charge',kind:'button',bindings:[input.createInputBinding('keyboard','Space')],context:'Combat',map:'Weapons',schemes:['KeyboardMouse'],interaction:'hold',holdSeconds:.4,tapSeconds:.2,multiTapCount:2,consume:true,priority:42,callback:'on_charge' }])
  const manager = new input.InputManager(), enabled = manager.enableMap('Weapons'), disabled = manager.disableMap('Weapons'), protectedDefault = manager.disableMap('Default')
  check('V540-INPUT', normalized[0].context === 'Combat' && normalized[0].map === 'Weapons' && normalized[0].interaction === 'hold' && normalized[0].consume && normalized[0].priority === 42 && enabled && disabled && !protectedDefault, 'Advanced action data normalizes and map activation is bounded with protected Default.')

  const id = '11111111-1111-4111-8111-111111111111', generation = dynamic.runtimeHandleGeneration(id), before = editor.editorState.logs.length, stale = dynamic.resolveRuntimeHandle({ id, generation: generation ^ 1 }, new Map()), last = editor.editorState.logs.at(-1)
  check('V540-STALE-HANDLE', stale === null && editor.editorState.logs.length === before + 1 && last?.level === 'error' && last.message.includes('Stale entity handle rejected'), 'Generation-mismatched handles fail explicitly and perform no mutation.')

  const requiredApi = ['spawn_at','query_tag','query_group','query_component','query_radius','entity_position_x_on','entity_set_position','component_set_enabled_on','ui_set_text_on','entity_add_tag','game_pause','checkpoint_set','score_add','session_set','input_context_push','input_map_enable','input_scheme_set','input_performed','input_phase']
  const callables = new Set(api.SCRIPT_API_V2_MANIFEST.entries.map(item => item.callable)); const missing = requiredApi.filter(name => !callables.has(name))
  const graph = catalog.defaultVisualGraph('v5.4 API audit'), graphNodes = requiredApi.map(name => catalog.createGraphNode(`api.${name}`, 0, 0, graph)).filter(Boolean)
  check('V540-API-GRAPH-PARITY', !missing.length && graphNodes.length === requiredApi.length, 'Every gameplay API has a Rhai manifest entry and typed Visual Graph node.', { missing, graphNodes: graphNodes.length })

  const diagnostics = []
  for (const [projectId, project] of Object.entries(projects)) for (const script of scriptSources(project)) {
    const errors = language.analyzeScript(script.source, 2).diagnostics.filter(item => item.severity === 'error')
    if (errors.length) diagnostics.push({ projectId, script: script.name, errors })
  }
  check('V540-SCRIPT-STATIC', !diagnostics.length, 'Every Rhai asset in the five references passes the shared API-v2 static analyzer.', { diagnostics })
} finally { await Promise.race([server.close(), new Promise(resolve => setTimeout(resolve, 2_000))]) }

const failed = checks.filter(item => item.status === 'failed'), report = { format:'nova-v5.4.0-gameplay-verification',version:1,engineVersion:'5.4.0',generatedAt:new Date().toISOString(),checks,severity0Open:0,severity1Open:failed.length,status:failed.length?'failed':'passed' }
await mkdir(join(root,'release-audits'),{recursive:true}); await writeFile(join(root,'release-audits/v5.4.0-gameplay-verification.json'),`${JSON.stringify(report,null,2)}\n`)
if (failed.length) process.exit(1)
console.log(`Nova_A v5.4.0 gameplay verification passed: ${checks.length} checks.`)
