import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const [settings, panel, exporter, pack, cli, tauri, shipping, crash, team, teamPanel, packages, packagePanel, upgrade, manager, templates, format, project, bottom, i18n, manualEn, manualDe, manualZh, manualHtml, readme, readmeZh, packageJson, cargo, tauriCargo, tauriConfig] = await Promise.all([
  read('src/runtime/buildSettings.ts'), read('src/components/BuildSettingsPanel.vue'), read('src/runtime/gameExporter.ts'), read('src/runtime/novaPak.ts'), read('scripts/nova-export.mjs'), read('src-tauri/src/lib.rs'), read('src/runtime/shipping.ts'), read('src/runtime/crashReporter.ts'), read('src/runtime/teamWorkflow.ts'), read('src/components/TeamWorkflowPanel.vue'), read('src/runtime/packages.ts'), read('src/components/PackageManagerPanel.vue'), read('src/runtime/projectUpgrade.ts'), read('src/components/ProjectManager.vue'), read('src/projects/templates.ts'), read('crates/nova_format/src/lib.rs'), read('src/projects/projectFormat.ts'), read('src/components/EditorBottomPanel.vue'), read('src/i18n.ts'), read('manual/MANUAL.en.md'), read('manual/MANUAL.de.md'), read('manual/MANUAL.zh-CN.md'), read('manual/index.html'), read('README.md'), read('README.zh-CN.md'), read('package.json'), read('Cargo.toml'), read('src-tauri/Cargo.toml'), read('src-tauri/tauri.conf.json')
])
const assert = (condition, message) => { if (!condition) throw new Error(message) }

for (const target of ["'windows'", "'linux'", "'macos'", "'web'", "'android'"]) assert(settings.includes(target), `platform model lacks ${target}`)
for (const property of ['profile', 'architecture', 'iconAsset', 'splashAsset', 'orientation', 'permissions', 'signingMode', 'signingIdentity', 'notarizationProfile']) assert(settings.includes(property) && panel.includes(property), `platform option ${property} is not modeled and editable`)
for (const tab of ["'overview'", "'platform'", "'delivery'", "'team'"]) assert(panel.includes(tab), `focused build layout lacks ${tab}`)
assert(settings.includes('OFFICIAL_ANDROID_PACKAGE_ID') && settings.includes('androidAvailable') && tauri.includes('NOVA_A_ANDROID_TEMPLATE'), 'conditional Android package/toolchain validation is incomplete')
assert(settings.includes('validateBuildSettings') && exporter.includes('validationErrors') && panel.includes('validation-list'), 'pre-build validation does not gate the exporter and explain results')

for (const option of ['deterministic', 'incremental', 'compression', 'patchManifest', 'structuredLogs', 'crashReports', 'telemetryEnabled']) assert(`${settings}${panel}${exporter}`.includes(option), `delivery option ${option} is disconnected`)
for (const artifact of ['nova-build-report', 'nova-patch-manifest', '.nova-build-cache/manifest', 'sha256', 'build_id', 'cache_hits', 'changed_files']) assert(`${tauri}${exporter}${cli}`.includes(artifact), `reproducible build output lacks ${artifact}`)
assert(pack.includes("createdAt: options.deterministic === false") && pack.includes("compression === 'store'"), 'Nova package timestamps/compression are not deterministic and selectable')
for (const argument of ['--architecture', '--runtime', '--compression', '--no-incremental', '--no-patch']) assert(cli.includes(argument), `headless exporter lacks ${argument}`)
assert(cli.includes('gzipSync') && cli.includes('nova-build-report.json') && cli.includes('added:') && cli.includes('removed:'), 'CLI compression/report/delta output is incomplete')
assert(tauri.includes('nova-symbol-map') && crash.includes('write_crash_log'), 'player crash and symbol mapping workflow is incomplete')
assert(shipping.includes('MAX_EVENTS') && shipping.includes("/^https:\\/\\//i") && shipping.includes('telemetryEnabled') && settings.includes('telemetryEnabled: false'), 'telemetry is not bounded, HTTPS-only, opt-in, and disabled by default')

for (const feature of ['stableProjectText', 'refreshSourceStatus', 'novaIgnoreFile', 'detectIncomingConflicts', 'openExternalDiff', 'openExternalMerge', 'acquireProjectLock', 'expiresAt']) assert(team.includes(feature), `team workflow lacks ${feature}`)
assert(teamPanel.includes('incomingInput') && teamPanel.includes('openMerge') && tauri.includes('open_external_merge') && tauri.includes('external_tool_directory'), 'incoming conflict/merge UI or bounded native hook is disconnected')
assert(tauri.includes('Duration::from_secs(24 * 60 * 60)') && tauri.includes('.take(512)'), 'external-tool temporary data is not lifetime/count bounded')

for (const field of ['publisher', 'publisherVerified', 'permissions', 'rating', 'securityUrl', 'documentationUrl']) assert(packages.includes(field) && packagePanel.includes(field), `registry metadata ${field} is not visible`)
assert(packages.includes('registryCatalog') && packages.includes('offlineMirror') && packages.includes('installRegistryPackage') && packagePanel.includes('installSelectedRegistry'), 'registry browse/install/offline mirror flow is incomplete')
assert(packagePanel.includes("t('packageBrowsingSafety')") && i18n.includes('Browsing reads bounded manifest metadata only'), 'registry browsing safety is not stated in the UI')

for (const feature of ['analyzeProjectUpgrade', 'packageProblems', 'downloadProjectBackup', 'storeUpgradeRollback', 'readUpgradeRollback']) assert(`${upgrade}${manager}`.includes(feature), `upgrade workflow lacks ${feature}`)
assert(manager.includes('backupBeforeUpgrade') && manager.includes('downloadLastUpgradeRollback') && manager.includes('migrateAndOpen'), 'backup/apply/rollback controls are incomplete')
for (const template of ['empty', 'platformer', 'top-down', 'physics-sandbox', 'ui-showcase', 'networked-optional']) assert(templates.includes(`'${template}'`), `example template ${template} is missing`)
assert(templates.includes('auditTemplateProject') && templates.includes('Responsive Canvas') && templates.includes('top.whitelists.novaa.networking'), 'UI/network template content or creation audit is incomplete')

assert(bottom.includes('compact-tab-select') && bottom.includes('@container(max-width:760px)'), 'narrow bottom-toolbar layout does not collapse safely')
assert(panel.includes('@container(max-width:720px)') && teamPanel.includes('@container(max-width:620px)'), 'shipping/team layouts are not panel-responsive')
for (const locale of ['Object.assign(en', 'Object.assign(de', 'Object.assign(zh']) assert(i18n.split(locale).slice(1).some(block => block.slice(0, 24_000).includes('sourceControl') && block.slice(0, 24_000).includes('optInTelemetry')), `${locale} lacks v2.9 shipping/team localization`)

assert(format.includes('CURRENT_FORMAT_VERSION: u32 = 29') && format.includes('CURRENT_ENGINE_VERSION: &str = "4.0.0"'), 'Rust format authority is not frozen schema 29 / engine 4.0')
assert(project.includes('NOVA_PROJECT_SCHEMA_VERSION = 29') && project.includes("NOVA_ENGINE_VERSION = '4.0.0'"), 'frontend format authority is not frozen schema 29 / engine 4.0')
assert(format.includes('projectSettings.build.delivery') && format.includes('bounded HTTPS URL'), 'schema 22 does not validate delivery/privacy settings')
for (const metadata of [packageJson, cargo, tauriCargo, tauriConfig]) assert(metadata.includes('4.0.0'), 'release metadata is not synchronized to 4.0.0')

for (const [manual, topics] of [[manualEn, ['3.9.0', 'Build Settings', 'telemetry', 'rollback']], [manualDe, ['3.9.0', 'Build Settings', 'Telemetrie', 'Rückrollkopie']], [manualZh, ['3.9.0', '构建设置', '遥测', '回滚']]]) for (const topic of topics) assert(manual.toLocaleLowerCase().includes(topic.toLocaleLowerCase()), `localized manual lacks ${topic}`)
assert(manualHtml.includes('<title>Nova_A 4.0 Manual</title>') && manualHtml.includes('data-section="shipping"') && manualHtml.includes('#en-v29'), 'bookmarkable multilingual HTML manual lacks v2.9 shipping documentation')
assert(readme.includes('4.0.0') && readme.includes('schema 29') && readmeZh.includes('4.0.0') && readmeZh.includes('Schema 29'), 'release README metadata/documentation is stale')

console.log('v2.9 audit passed: platform exports, deterministic cache/deltas/CLI, operations/privacy, team workflow, registry safety, upgrades, templates, responsive layout, schema 22, localization, and documentation are connected.')
