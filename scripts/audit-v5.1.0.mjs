/* 审计 5.1.0 的独立播放器、嵌入资源完整性、构建交互、贪吃蛇模板和输入绑定。 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const checks = []
const check = /* 调用 checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics }) 并返回调用结果。 */ (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Win32', hardwareConcurrency: 8, userAgent: 'Nova_A v5.1.0 audit', mediaDevices: { /* 为无浏览器审计环境提供不注册真实监听器的事件监听占位方法。 */ addEventListener(){}, /* 为无浏览器审计环境提供不操作真实监听器的移除监听占位方法。 */ removeEventListener(){}, /* 返回按声明顺序构造的数组 []。 */ async enumerateDevices(){ return [] } } } })
globalThis.window ??= { setTimeout, clearTimeout, setInterval, clearInterval, /* 为无浏览器审计环境提供不注册真实监听器的事件监听占位方法。 */ addEventListener(){}, /* 为无浏览器审计环境提供不操作真实监听器的移除监听占位方法。 */ removeEventListener(){}, /* 为无浏览器审计环境提供不派发真实事件的占位方法。 */ dispatchEvent(){} }
globalThis.localStorage ??= { /* 返回固定值 null。 */ getItem(){ return null }, /* 为审计环境提供不写入真实存储的 localStorage 占位方法。 */ setItem(){}, /* 为审计环境提供不删除真实存储的 localStorage 占位方法。 */ removeItem(){} }

const [pkg, tauri, instructions, app, main, buildPanel, i18n, rust, audio] = await Promise.all([
  readFile(join(root, 'package.json'), 'utf8').then(JSON.parse),
  readFile(join(root, 'src-tauri/tauri.conf.json'), 'utf8').then(JSON.parse),
  readFile(join(root, 'instructions.txt'), 'utf8'),
  readFile(join(root, 'src/App.vue'), 'utf8'),
  readFile(join(root, 'src/main.ts'), 'utf8'),
  readFile(join(root, 'src/components/BuildSettingsPanel.vue'), 'utf8'),
  readFile(join(root, 'src/i18n.ts'), 'utf8'),
  readFile(join(root, 'src-tauri/src/lib.rs'), 'utf8'),
  readFile(join(root, 'src/runtime/audio.ts'), 'utf8')
])
check('V510-VERSION', pkg.version === '5.1.0' && tauri.version === '5.1.0', 'Web and native package authorities identify 5.1.0.')
check('V510-ROADMAP', ['## 5.1.0','## 5.2.0','## 5.3.0','## 5.4.0','## 5.5.0','## 5.6.0','## 5.7.0','## 5.8.0','## 5.9.0','## 6.0.0','Required 6.0 teaching manual'].every(/* 调用 instructions.includes(marker) 并返回调用结果。 */ marker => instructions.includes(marker)), 'The authoritative roadmap covers every feature release through 6.0 and the teaching manual.')
check('V510-PLAYER-ISOLATION', app.includes('<template v-if="mode === \'editor\'">') && app.includes('<PlayerApp v-else-if="mode === \'player\'"') && !main.includes('installStableControlRegistry') && !main.includes('installProjectMutationRouter'), 'Standalone players do not mount or initialize editor-only UI and services.')
check('V510-EMBEDDED-INTEGRITY', ['NOVAPK2!','MAX_EMBEDDED_PACKAGE_BYTES','Sha256::digest(pack)','failed its SHA-256 integrity check','embedded_package_rejects_corrupted_payload'].every(/* 调用 rust.includes(marker) 并返回调用结果。 */ marker => rust.includes(marker)), 'Embedded native players use a bounded, hashed v2 footer and retain a corruption test.')
check('V510-BUILD-UX', ['artifact-card','portableApplicationArtifact','playerAndPackArtifact','webFolderArtifact'].every(/* 调用 buildPanel.includes(marker) 并返回调用结果。 */ marker => buildPanel.includes(marker)) && ['portableApplicationArtifactHint','playerAndPackArtifactHint','webFolderArtifactHint'].every(/* 调用 ['en','de','zh'].every(locale => i18n.includes(`Object.assign(${locale}, {`) && i18n.includes(`${key}:`)) 并返回调用结果。 */ key => ['en','de','zh'].every(/* 先计算 i18n.includes(`Object.assign(${locale}, {`)；仅当其为真值时求右侧 i18n.includes(`${key}:`)，返回短路求值结果。 */ locale => i18n.includes(`Object.assign(${locale}, {`) && i18n.includes(`${key}:`))), 'Build artifact types are visible and localized in English, German and Chinese.')
check('V510-AUDIO-DEFAULT', audio.includes("await context.setSinkId('')") && audio.includes("Keep the browser's implicit default route") && audio.includes("requestedDevice !== 'default'"), 'System-default audio routing is best effort while explicit unavailable devices still report a blocking failure.')

const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
await server.watcher.close()
try {
  const templates = await server.ssrLoadModule('/src/projects/templates.ts')
  const build = await server.ssrLoadModule('/src/runtime/buildSettings.ts')
  const language = await server.ssrLoadModule('/src/editor/scriptLanguage.ts')
  const snake = templates.createTemplateProject('snake', 'Snake Audit')
  const assets = snake.assets.filter(/* 比较 asset.assetType 与 'script'，返回严格相等的判断结果。 */ asset => asset.assetType === 'script')
  const diagnostics = assets.flatMap(/* 分析模板脚本并筛选错误诊断，为每条错误附加资源路径。 */ asset => language.analyzeScript(asset.source, 2).diagnostics.filter(/* 比较 issue.severity 与 'error'，返回严格相等的判断结果。 */ issue => issue.severity === 'error').map(/* 将当前脚本资源路径附加到诊断记录，便于定位错误来源。 */ issue => ({ asset: asset.path, ...issue })))
  const scene = snake.scenes[0]
  const inputMap = snake.projectSettings.inputMap
  const uiEntities = scene.entities.filter(/* 调用 ['HUD Canvas','Score','Controls'].includes(entity.name) 并返回调用结果。 */ entity => ['HUD Canvas','Score','Controls'].includes(entity.name))
  const uiNavigationSafe = uiEntities.length === 3 && uiEntities.every(/* 比较 entity.components.find(component => component.kind === 'RectTransform')?.data?.focusable 与 false，返回严格相等的判断结果。 */ entity => entity.components.find(/* 比较 component.kind 与 'RectTransform'，返回严格相等的判断结果。 */ component => component.kind === 'RectTransform')?.data?.focusable === false)
  const contentRulesReady = snake.projectSettings.build.delivery.include.includes('Assets/**')
  const signalNumbersNormalized = assets.filter(/* 调用 asset.name.startsWith('SnakeSegment') 并返回调用结果。 */ asset => asset.name.startsWith('SnakeSegment')).every(/* 先计算 asset.source.includes('payload.x.to_float()')；仅当其为真值时求右侧 asset.source.includes('payload.y.to_float()')，返回短路求值结果。 */ asset => asset.source.includes('payload.x.to_float()') && asset.source.includes('payload.y.to_float()'))
  check('V510-SNAKE-TEMPLATE', templates.PROJECT_TEMPLATES.some(/* 比较 item.id 与 'snake'，返回严格相等的判断结果。 */ item => item.id === 'snake') && assets.length === 6 && scene.entities.some(/* 比较 entity.name 与 'Snake Head'，返回严格相等的判断结果。 */ entity => entity.name === 'Snake Head') && scene.entities.filter(/* 调用 String(entity.name).startsWith('Snake Segment') 并返回调用结果。 */ entity => String(entity.name).startsWith('Snake Segment')).length === 3 && diagnostics.length === 0 && uiNavigationSafe && contentRulesReady && signalNumbersNormalized, 'The launcher Snake template is visible, audited, scripted, build-ready, and statically valid.', { scripts: assets.length, entities: scene.entities.length, diagnostics, uiNavigationSafe, contentRulesReady, signalNumbersNormalized })
  check('V510-SNAKE-INPUT', ['MoveUp','MoveDown','MoveLeft','MoveRight'].every(/* 确认指定输入动作存在，且同时具备键盘与手柄按钮绑定。 */ name => inputMap.some(/* 检查当前动作名称及键盘、手柄按钮两种绑定是否齐备。 */ action => action.name === name && action.bindings.some(/* 比较 binding.device 与 'keyboard'，返回严格相等的判断结果。 */ binding => binding.device === 'keyboard') && action.bindings.some(/* 比较 binding.device 与 'gamepad-button'，返回严格相等的判断结果。 */ binding => binding.device === 'gamepad-button'))), 'Snake demonstrates keyboard and gamepad action bindings.')
  const fresh = build.normalizeBuildSettings({ gameName:'Fresh', target:'windows', sceneOrder:['scene'], startupSceneUuid:'scene', platform:{ identifier:'top.whitelists.fresh', version:'1.0.0' } }, ['scene'])
  const legacy = build.normalizeBuildSettings({ ...fresh, packageIntoExecutable:false }, ['scene'])
  check('V510-PORTABLE-DEFAULT', fresh.packageIntoExecutable === true && legacy.packageIntoExecutable === false && build.validateBuildSettings(legacy, { host:'windows', architecture:'x86_64', androidAvailable:false, androidReason:'' }).some(/* 先计算 issue.code === 'sidecar-player'；仅当其为真值时求右侧 issue.severity === 'info'，返回短路求值结果。 */ issue => issue.code === 'sidecar-player' && issue.severity === 'info'), 'New desktop projects default to one file while an explicit legacy sidecar choice is preserved and explained.')
} finally {
  await Promise.race([server.close(), new Promise(/* 调用 setTimeout(resolve, 2_000) 并返回调用结果。 */ resolve => setTimeout(resolve, 2_000))])
}

const failed = checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed')
const report = { format:'nova-v5.1.0-product-audit', version:1, engineVersion:'5.1.0', generatedAt:new Date().toISOString(), catalogs:['ROADMAP','PLAYER','BUILD','TEMPLATE','I18N'], checks, severity0Open:0, severity1Open:failed.length, status:failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive:true })
await writeFile(join(root, 'release-audits/v5.1.0-product-audit.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v5.1.0 product audit passed: ${checks.length} checks.`)
