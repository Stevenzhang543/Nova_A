/** 功能回归脚本：执行 verify-v5.4.0-gameplay.mjs 对应场景，保留断言和证据输出。 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Win32', hardwareConcurrency: 8, userAgent: 'Nova_A v5.4 gameplay verifier', mediaDevices: { /** 提供不注册监听器的测试事件接口。 */ addEventListener(){}, /** 提供无需移除监听器的测试事件接口。 */ removeEventListener(){}, /* 返回按声明顺序构造的数组 []。 */ async enumerateDevices(){ return [] } }, /* 返回按声明顺序构造的数组 []。 */ getGamepads(){ return [] } } })
globalThis.window ??= { setTimeout, clearTimeout, setInterval, clearInterval, /** 提供不注册监听器的测试事件接口。 */ addEventListener(){}, /** 提供无需移除监听器的测试事件接口。 */ removeEventListener(){}, /** 生成器环境桩忽略事件派发。 */ dispatchEvent(){} }
globalThis.localStorage ??= { /* 返回固定值 null。 */ getItem(){ return null }, /** 隔离存储桩忽略写入，不持久化生成过程数据。 */ setItem(){}, /** 隔离存储桩忽略删除请求。 */ removeItem(){} }
globalThis.performance ??= { now: /* 调用 Date.now() 并返回调用结果。 */ () => Date.now() }

const checks = [], check = /** 记录检查结果、详情和指标，失败时同步输出错误信息。 */ (id, passed, detail, metrics = {}) => { checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics }); if (!passed) console.error(`${id}: ${detail}`) }
const refs = ['gameplay-v54-snake-growth','gameplay-v54-platformer','gameplay-v54-twin-stick','gameplay-v54-menu','gameplay-v54-pooling']
const projects = Object.fromEntries(await Promise.all(refs.map(/* 返回按声明顺序构造的数组 [id, JSON.parse(await readFile(join(root, `reference-projects/projects/${id}/project.nova`), 'utf8'))]。 */ async id => [id, JSON.parse(await readFile(join(root, `reference-projects/projects/${id}/project.nova`), 'utf8'))])))
const componentKinds = /** 结构说明（自动提取）：componentKinds；输入 project；直接调用 flatMap、project.scenes.flatMap；返回表达式求值结果。 */ project => project.scenes.flatMap(/* 返回 scene.entities 的当前值。 */ scene => scene.entities).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 entity；直接调用 entity.components.map；返回表达式求值结果。 */ entity => entity.components.map(/* 返回 component.kind 的当前值。 */ component => component.kind))
const scriptSources = /** 结构说明（自动提取）：scriptSources；输入 project；直接调用 map、project.assets.filter；返回表达式求值结果。 */ project => project.assets.filter(/* 比较 asset.assetType 与 'script'，返回严格相等的判断结果。 */ asset => asset.assetType === 'script').map(/** 结构说明（自动提取）：map 回调；输入 asset；返回表达式求值结果。 */ asset => ({ name: asset.name, source: asset.source }))
check('V540-REFERENCES', refs.every(/* 先计算 projects[id].engineVersion === '5.4.0' && projects[id].projectFormatMajor === 2；仅当其为真值时求右侧 projects[id].formatVersion === 29，返回短路求值结果。 */ id => projects[id].engineVersion === '5.4.0' && projects[id].projectFormatMajor === 2 && projects[id].formatVersion === 29), 'Five Project Format 2/schema 29 references identify engine 5.4.0.', { references: refs })
const snakeSource = scriptSources(projects[refs[0]]).map(/* 返回 item.source 的当前值。 */ item => item.source).join('\n')
check('V540-SNAKE', ['Health2D','CameraFollow2D'].every(/* 调用 componentKinds(projects[refs[0]]).includes(kind) 并返回调用结果。 */ kind => componentKinds(projects[refs[0]]).includes(kind)) && ['spawn_at','query_group','entity_position_x_on'].every(/* 调用 snakeSource.includes(marker) 并返回调用结果。 */ marker => snakeSource.includes(marker)), 'Snake grows a spawned segment and moves the bounded body query using snapshot positions.')
check('V540-PLATFORMER', ['PlatformController2D','Health2D','CameraFollow2D'].every(/* 调用 componentKinds(projects[refs[1]]).includes(kind) 并返回调用结果。 */ kind => componentKinds(projects[refs[1]]).includes(kind)), 'Platformer owns controller, health and camera-follow components.')
check('V540-TWIN', ['TopDownController2D','Health2D','DamageHitbox2D'].every(/* 调用 componentKinds(projects[refs[2]]).includes(kind) 并返回调用结果。 */ kind => componentKinds(projects[refs[2]]).includes(kind)) && scriptSources(projects[refs[2]]).some(/* 先计算 item.source.includes('input_map_enable')；仅当其为真值时求右侧 item.source.includes('spawn_at')，返回短路求值结果。 */ item => item.source.includes('input_map_enable') && item.source.includes('spawn_at')), 'Twin-stick reference enables Combat action map and fires a dynamic projectile.')
check('V540-MENU', scriptSources(projects[refs[3]]).some(/** 结构说明（自动提取）：some 回调；输入 item；直接调用 every；返回表达式求值结果。 */ item => ['input_context_push','game_pause','checkpoint_set','scene_load','scene_reload','scene_quit'].every(/* 调用 item.source.includes(marker) 并返回调用结果。 */ marker => item.source.includes(marker))), 'Menu reference exercises input context and complete game-flow commands.')
check('V540-POOLING', ['ObjectPool2D','Spawner2D','Cooldown2D'].every(/* 调用 componentKinds(projects[refs[4]]).includes(kind) 并返回调用结果。 */ kind => componentKinds(projects[refs[4]]).includes(kind)) && projects[refs[4]].assets.some(/* 先计算 asset.assetType === 'prefab' && asset.source.includes('Projectile2D')；仅当其为真值时求右侧 asset.source.includes('Lifetime2D')，返回短路求值结果。 */ asset => asset.assetType === 'prefab' && asset.source.includes('Projectile2D') && asset.source.includes('Lifetime2D')), 'Pooling reference prewarms, spawns and returns lifetime-bound projectiles.')

const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } }); await server.watcher.close()
try {
  const components = await server.ssrLoadModule('/src/world/components.ts'), input = await server.ssrLoadModule('/src/runtime/input.ts'), dynamic = await server.ssrLoadModule('/src/runtime/dynamicObjects.ts'), api = await server.ssrLoadModule('/src/editor/scriptApi.ts'), catalog = await server.ssrLoadModule('/src/visual/graphCatalog.ts'), language = await server.ssrLoadModule('/src/editor/scriptLanguage.ts'), editor = await server.ssrLoadModule('/src/store/editor.ts')
  const kinds = ['GridMover2D','PlatformController2D','TopDownController2D','Health2D','DamageHitbox2D','Collectible2D','Projectile2D','Spawner2D','Cooldown2D','Lifetime2D','CameraFollow2D']
  const instances = kinds.map(/** 结构说明（自动提取）：kinds.map 回调；输入 kind；直接调用 components[…]；返回表达式求值结果。 */ kind => new components[kind]()), copied = instances.map(/* 调用 components.copyComponentValues(instance) 并返回调用结果。 */ instance => components.copyComponentValues(instance))
  check('V540-COMPONENT-STATE', instances.every(/* 比较 instance.kind 与 kinds[index]，返回严格相等的判断结果。 */ (instance,index) => instance.kind === kinds[index]) && copied.every(/** 结构说明（自动提取）：copied.every 回调；输入 value；直接调用 every、Object.keys；返回表达式求值结果。 */ value => Object.keys(value).every(/* 返回 key.startsWith('runtime') 的逻辑取反结果。 */ key => !key.startsWith('runtime'))), 'All eleven gameplay components construct and runtime-only fields stay out of serialized state.', { kinds })

  const normalized = input.normalizeInputMap([{ name:'Charge',kind:'button',bindings:[input.createInputBinding('keyboard','Space')],context:'Combat',map:'Weapons',schemes:['KeyboardMouse'],interaction:'hold',holdSeconds:.4,tapSeconds:.2,multiTapCount:2,consume:true,priority:42,callback:'on_charge' }])
  const manager = new input.InputManager(), enabled = manager.enableMap('Weapons'), disabled = manager.disableMap('Weapons'), protectedDefault = manager.disableMap('Default')
  check('V540-INPUT', normalized[0].context === 'Combat' && normalized[0].map === 'Weapons' && normalized[0].interaction === 'hold' && normalized[0].consume && normalized[0].priority === 42 && enabled && disabled && !protectedDefault, 'Advanced action data normalizes and map activation is bounded with protected Default.')

  const id = '11111111-1111-4111-8111-111111111111', generation = dynamic.runtimeHandleGeneration(id), before = editor.editorState.logs.length, stale = dynamic.resolveRuntimeHandle({ id, generation: generation ^ 1 }, new Map()), last = editor.editorState.logs.at(-1)
  check('V540-STALE-HANDLE', stale === null && editor.editorState.logs.length === before + 1 && last?.level === 'error' && last.message.includes('Stale entity handle rejected'), 'Generation-mismatched handles fail explicitly and perform no mutation.')

  const requiredApi = ['spawn_at','query_tag','query_group','query_component','query_radius','entity_position_x_on','entity_set_position','component_set_enabled_on','ui_set_text_on','entity_add_tag','game_pause','checkpoint_set','score_add','session_set','input_context_push','input_map_enable','input_scheme_set','input_performed','input_phase']
  const callables = new Set(api.SCRIPT_API_V2_MANIFEST.entries.map(/* 返回 item.callable 的当前值。 */ item => item.callable)); const missing = requiredApi.filter(/* 返回 callables.has(name) 的逻辑取反结果。 */ name => !callables.has(name))
  const graph = catalog.defaultVisualGraph('v5.4 API audit'), graphNodes = requiredApi.map(/* 调用 catalog.createGraphNode(`api.${name}`, 0, 0, graph) 并返回调用结果。 */ name => catalog.createGraphNode(`api.${name}`, 0, 0, graph)).filter(Boolean)
  check('V540-API-GRAPH-PARITY', !missing.length && graphNodes.length === requiredApi.length, 'Every gameplay API has a Rhai manifest entry and typed Visual Graph node.', { missing, graphNodes: graphNodes.length })

  const diagnostics = []
  for (const [projectId, project] of Object.entries(projects)) for (const script of scriptSources(project)) {
    const errors = language.analyzeScript(script.source, 2).diagnostics.filter(/* 比较 item.severity 与 'error'，返回严格相等的判断结果。 */ item => item.severity === 'error')
    if (errors.length) diagnostics.push({ projectId, script: script.name, errors })
  }
  check('V540-SCRIPT-STATIC', !diagnostics.length, 'Every Rhai asset in the five references passes the shared API-v2 static analyzer.', { diagnostics })
} finally { await Promise.race([server.close(), new Promise(/* 调用 setTimeout(resolve, 2_000) 并返回调用结果。 */ resolve => setTimeout(resolve, 2_000))]) }

const failed = checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed'), report = { format:'nova-v5.4.0-gameplay-verification',version:1,engineVersion:'5.4.0',generatedAt:new Date().toISOString(),checks,severity0Open:0,severity1Open:failed.length,status:failed.length?'failed':'passed' }
await mkdir(join(root,'release-audits'),{recursive:true}); await writeFile(join(root,'release-audits/v5.4.0-gameplay-verification.json'),`${JSON.stringify(report,null,2)}\n`)
if (failed.length) process.exit(1)
console.log(`Nova_A v5.4.0 gameplay verification passed: ${checks.length} checks.`)
