import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const [
  panel, profiler, performance, replay, tests, data, jobs, worker, networking, production,
  productionRuntime, gameplay, scripts, scriptApi, saveGame, buildSettings, buildPanel, exporter,
  player, packages, assets, bottom, canvas, canvas2d, webgl, materials, css, format, project,
  tauri, capability, packageJson, manualEn, manualDe, manualZh, manualHtml, readme, readmeZh,
] = await Promise.all([
  read('src/components/ProfilerPanel.vue'), read('src/runtime/profiler.ts'), read('src/runtime/performanceTools.ts'),
  read('src/runtime/replay.ts'), read('src/runtime/testRunner.ts'), read('src/runtime/dataResources.ts'),
  read('src/runtime/jobScheduler.ts'), read('src/runtime/jobScheduler.worker.ts'), read('src/runtime/networking.ts'),
  read('src/runtime/production.ts'), read('src/runtime/productionRuntime.ts'), read('src/runtime/GameplayRuntime.ts'),
  read('crates/nova_script/src/lib.rs'), read('src/editor/scriptApi.ts'), read('src/runtime/saveGame.ts'),
  read('src/runtime/buildSettings.ts'), read('src/components/BuildSettingsPanel.vue'), read('src/runtime/gameExporter.ts'),
  read('src/PlayerApp.vue'), read('src/runtime/packages.ts'), read('src/assets/AssetDatabase.ts'),
  read('src/components/EditorBottomPanel.vue'), read('src/components/WorldCanvas.vue'),
  read('src/renderer/Canvas2DRenderer.ts'), read('src/renderer/WebGL2Renderer.ts'), read('src/renderer/materials.ts'),
  read('src/assets/main.css'), read('crates/nova_format/src/lib.rs'), read('src/projects/projectFormat.ts'),
  read('src-tauri/src/lib.rs'), read('src-tauri/capabilities/default.json'), read('package.json'),
  read('manual/MANUAL.en.md'), read('manual/MANUAL.de.md'), read('manual/MANUAL.zh-CN.md'),
  read('manual/index.html'), read('README.md'), read('README.zh-CN.md'),
])
const assert = (condition, message) => { if (!condition) throw new Error(message) }

for (const stage of ['inputMs', 'scriptsMs', 'animationMs', 'physicsMs', 'audioMs', 'renderingMs', 'assetsMs', 'allocations', 'gpuPasses']) {
  assert(`${profiler}${canvas}${performance}`.includes(stage), `frame trace is missing ${stage}`)
}
for (const feature of ['memoryBudgetExceeded', 'possibleLeak', 'lifetimeEvents', 'comparePerformanceCaptures', 'capturePerformance']) {
  assert(performance.includes(feature) && panel.includes(feature), `memory tooling lacks connected ${feature}`)
}

for (const feature of ['startReplayRecording', 'startReplayPlayback', 'physicsChecksum', 'deterministicRandom', 'mismatches']) assert(replay.includes(feature), `deterministic replay lacks ${feature}`)
for (const feature of ['startReplayRecording', 'startReplayPlayback', 'replayState.mismatches']) assert(panel.includes(feature), `replay UI lacks connected ${feature}`)
for (const feature of ['replayFixedInput', 'completeReplayFixedStep', 'deterministicRandom']) assert(gameplay.includes(feature), `gameplay runtime lacks connected ${feature}`)
assert(scripts.includes('random_seed') && scripts.includes('random_range') && scriptApi.includes('random_range'), 'script RNG is not seeded, bounded, and documented')
for (const kind of ["'unit'", "'scene'", "'integration'", "'headless'"]) assert(production.includes(kind) && panel.includes(kind.slice(1, -1)), `test definitions/UI lack ${kind}`)
for (const feature of ['timeoutMs', 'screenshot', 'testReportJUnit', 'JSON.stringify', 'runProjectTests']) assert(`${tests}${panel}`.includes(feature), `test tooling lacks ${feature}`)

for (const feature of ['validateDataRows', 'generateTypedDataAccessors', 'importDataText', "'csv' | 'json' | 'database'"]) assert(data.includes(feature), `data resource workflow lacks ${feature}`)
for (const feature of ['generateTypedDataAccessors', 'importDataText', 'dataSourceType']) assert(panel.includes(feature), `data resource UI lacks connected ${feature}`)
assert(assets.includes("'dataSchema'") && assets.includes("'dataTable'") && bottom.includes("'dataSchema'"), 'data resources are not discoverable in Assets')
assert(saveGame.includes('migrateSaveData') && saveGame.includes("format: 'nova-save'") && saveGame.includes('saveMigrations'), 'ordered save-data migrations are not applied')

for (const feature of ['workerAvailable', 'maxQueued', 'fallbackBusy', 'shutdownJobScheduler', 'cancel']) assert(jobs.includes(feature), `bounded scheduler lacks ${feature}`)
assert(jobs.includes("new URL('./jobScheduler.worker.ts'") && worker.includes("kind === 'parseJson'") && worker.includes("kind === 'hash'"), 'worker execution and fallback payloads are disconnected')

for (const feature of ['NetworkTransport', 'WebSocketTransport', 'NativeUdpTransport', 'callRpc', 'snapshots', 'interpolationMs', 'predictionCorrections', 'rollback', 'bandwidth']) {
  assert(networking.includes(feature), `optional networking lacks ${feature}`)
}
assert(networking.includes("definition.properties.includes('transform')") && networking.includes('receivesAuthority') && networking.includes('receiveBudgetBytes') && panel.includes('definition.properties'), 'replicated property selection, authority, or bidirectional bandwidth bounds are not applied')
assert(production.includes('enabled: false') && packages.includes('OFFICIAL_NETWORKING_PACKAGE_ID') && productionRuntime.includes("import('./networking')"), 'networking is not disabled and lazily excluded by default')
assert(exporter.includes('includeDynamicEntry') && exporter.includes('productionSettings.networking.enabled && packageEnabled(OFFICIAL_NETWORKING_PACKAGE_ID)'), 'disabled networking code is still traversed into exported Web Player files')
for (const command of ['udp_open', 'udp_send', 'udp_receive', 'udp_close']) assert(tauri.includes(command), `native UDP transport lacks ${command}`)
assert(capability.includes('opener:allow-open-url'), 'documented external URL capability was lost')
assert((await read('src-tauri/tauri.conf.json')).includes('wss:'), 'native content security policy blocks secure WebSocket endpoints')
assert(productionRuntime.includes('lifecycleGeneration'), 'async networking lifecycle is not cancellation-safe')

assert(buildSettings.includes("'headless-server'") && buildPanel.includes('headless-server') && exporter.includes("runtimeMode === 'headless-server'") && player.includes('setInterval'), 'authoritative headless export is not wired end to end')
assert(packages.includes("version: '2.9.0'") && packages.includes('novaa.networking') && packages.includes("PACKAGE_ENGINE_VERSION = '4.0.0'"), 'official optional networking package is not versioned or v4 compatible')

assert(webgl.includes('antialias: true') && materials.includes('antialias: true'), 'WebGL and material previews do not request multisampling')
assert(canvas2d.includes("imageSmoothingQuality = 'high'") && canvas.includes("imageSmoothingQuality = 'high'"), 'Canvas render paths do not use high-quality interpolation')
assert(css.includes('font-kerning: normal') && css.includes('font-optical-sizing: auto'), 'UI text rasterization does not enable kerning and optical sizing')

assert(format.includes('CURRENT_FORMAT_VERSION: u32 = 29') && format.includes('CURRENT_ENGINE_VERSION: &str = "4.0.0"'), 'Rust format authority is not frozen schema 29 / engine 4.0')
assert(project.includes('NOVA_PROJECT_SCHEMA_VERSION = 29') && project.includes("NOVA_ENGINE_VERSION = '4.0.0'"), 'frontend format authority is not frozen schema 29 / engine 4.0')
assert(format.includes('projectSettings.production') && format.includes('runtimeMode'), 'current schema does not migrate and validate production/headless settings')
assert(packageJson.includes('"version": "4.0.0"') && packageJson.includes('audit:v2.8'), 'package metadata/audit chain does not preserve v2.8')

for (const manual of [manualEn, manualDe, manualZh]) for (const topic of ['3.9.0', 'Profiler', 'Replay', 'Networking']) {
  assert(manual.includes(topic), `localized manual lacks ${topic}`)
}
assert(manualHtml.includes('<title>Nova_A 4.0 Manual</title>') && manualHtml.includes('data-section="production"'), 'bookmarkable HTML manual lacks Profiler documentation')
assert(readme.includes('4.0.0') && readmeZh.includes('4.0.0'), 'release README metadata is stale')

console.log('v2.8 audit passed: traces, budgets, replay/RNG, tests, data/migrations, bounded jobs, opt-in networking, headless export, antialiasing, schema, discovery, and localized documentation are connected.')
