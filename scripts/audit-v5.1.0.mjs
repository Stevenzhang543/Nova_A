import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Win32', hardwareConcurrency: 8, userAgent: 'Nova_A v5.1.0 audit', mediaDevices: { addEventListener(){}, removeEventListener(){}, async enumerateDevices(){ return [] } } } })
globalThis.window ??= { setTimeout, clearTimeout, setInterval, clearInterval, addEventListener(){}, removeEventListener(){}, dispatchEvent(){} }
globalThis.localStorage ??= { getItem(){ return null }, setItem(){}, removeItem(){} }

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
check('V510-ROADMAP', ['## 5.1.0','## 5.2.0','## 5.3.0','## 5.4.0','## 5.5.0','## 5.6.0','## 5.7.0','## 5.8.0','## 5.9.0','## 6.0.0','Required 6.0 teaching manual'].every(marker => instructions.includes(marker)), 'The authoritative roadmap covers every feature release through 6.0 and the teaching manual.')
check('V510-PLAYER-ISOLATION', app.includes('<template v-if="mode === \'editor\'">') && app.includes('<PlayerApp v-else-if="mode === \'player\'"') && !main.includes('installStableControlRegistry') && !main.includes('installProjectMutationRouter'), 'Standalone players do not mount or initialize editor-only UI and services.')
check('V510-EMBEDDED-INTEGRITY', ['NOVAPK2!','MAX_EMBEDDED_PACKAGE_BYTES','Sha256::digest(pack)','failed its SHA-256 integrity check','embedded_package_rejects_corrupted_payload'].every(marker => rust.includes(marker)), 'Embedded native players use a bounded, hashed v2 footer and retain a corruption test.')
check('V510-BUILD-UX', ['artifact-card','portableApplicationArtifact','playerAndPackArtifact','webFolderArtifact'].every(marker => buildPanel.includes(marker)) && ['portableApplicationArtifactHint','playerAndPackArtifactHint','webFolderArtifactHint'].every(key => ['en','de','zh'].every(locale => i18n.includes(`Object.assign(${locale}, {`) && i18n.includes(`${key}:`))), 'Build artifact types are visible and localized in English, German and Chinese.')
check('V510-AUDIO-DEFAULT', audio.includes("await context.setSinkId('')") && audio.includes("Keep the browser's implicit default route") && audio.includes("requestedDevice !== 'default'"), 'System-default audio routing is best effort while explicit unavailable devices still report a blocking failure.')

const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
await server.watcher.close()
try {
  const templates = await server.ssrLoadModule('/src/projects/templates.ts')
  const build = await server.ssrLoadModule('/src/runtime/buildSettings.ts')
  const language = await server.ssrLoadModule('/src/editor/scriptLanguage.ts')
  const snake = templates.createTemplateProject('snake', 'Snake Audit')
  const assets = snake.assets.filter(asset => asset.assetType === 'script')
  const diagnostics = assets.flatMap(asset => language.analyzeScript(asset.source, 2).diagnostics.filter(issue => issue.severity === 'error').map(issue => ({ asset: asset.path, ...issue })))
  const scene = snake.scenes[0]
  const inputMap = snake.projectSettings.inputMap
  const uiEntities = scene.entities.filter(entity => ['HUD Canvas','Score','Controls'].includes(entity.name))
  const uiNavigationSafe = uiEntities.length === 3 && uiEntities.every(entity => entity.components.find(component => component.kind === 'RectTransform')?.data?.focusable === false)
  const contentRulesReady = snake.projectSettings.build.delivery.include.includes('Assets/**')
  const signalNumbersNormalized = assets.filter(asset => asset.name.startsWith('SnakeSegment')).every(asset => asset.source.includes('payload.x.to_float()') && asset.source.includes('payload.y.to_float()'))
  check('V510-SNAKE-TEMPLATE', templates.PROJECT_TEMPLATES.some(item => item.id === 'snake') && assets.length === 6 && scene.entities.some(entity => entity.name === 'Snake Head') && scene.entities.filter(entity => String(entity.name).startsWith('Snake Segment')).length === 3 && diagnostics.length === 0 && uiNavigationSafe && contentRulesReady && signalNumbersNormalized, 'The launcher Snake template is visible, audited, scripted, build-ready, and statically valid.', { scripts: assets.length, entities: scene.entities.length, diagnostics, uiNavigationSafe, contentRulesReady, signalNumbersNormalized })
  check('V510-SNAKE-INPUT', ['MoveUp','MoveDown','MoveLeft','MoveRight'].every(name => inputMap.some(action => action.name === name && action.bindings.some(binding => binding.device === 'keyboard') && action.bindings.some(binding => binding.device === 'gamepad-button'))), 'Snake demonstrates keyboard and gamepad action bindings.')
  const fresh = build.normalizeBuildSettings({ gameName:'Fresh', target:'windows', sceneOrder:['scene'], startupSceneUuid:'scene', platform:{ identifier:'top.whitelists.fresh', version:'1.0.0' } }, ['scene'])
  const legacy = build.normalizeBuildSettings({ ...fresh, packageIntoExecutable:false }, ['scene'])
  check('V510-PORTABLE-DEFAULT', fresh.packageIntoExecutable === true && legacy.packageIntoExecutable === false && build.validateBuildSettings(legacy, { host:'windows', architecture:'x86_64', androidAvailable:false, androidReason:'' }).some(issue => issue.code === 'sidecar-player' && issue.severity === 'info'), 'New desktop projects default to one file while an explicit legacy sidecar choice is preserved and explained.')
} finally {
  await Promise.race([server.close(), new Promise(resolve => setTimeout(resolve, 2_000))])
}

const failed = checks.filter(item => item.status === 'failed')
const report = { format:'nova-v5.1.0-product-audit', version:1, engineVersion:'5.1.0', generatedAt:new Date().toISOString(), catalogs:['ROADMAP','PLAYER','BUILD','TEMPLATE','I18N'], checks, severity0Open:0, severity1Open:failed.length, status:failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive:true })
await writeFile(join(root, 'release-audits/v5.1.0-product-audit.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v5.1.0 product audit passed: ${checks.length} checks.`)
