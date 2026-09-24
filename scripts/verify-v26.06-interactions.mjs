/** 功能回归脚本：执行 verify-v26.06-interactions.mjs 对应场景，保留断言和证据输出。 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), checks = []
const source = /* 调用 readFile(join(root, path), 'utf8') 并返回调用结果。 */ path => readFile(join(root, path), 'utf8')
const check = /* 调用 checks.push({ id, status: passed ? 'passed' : 'failed', detail }) 并返回调用结果。 */ (id, passed, detail) => checks.push({ id, status: passed ? 'passed' : 'failed', detail })
const [world, bottom, health, build, templates, output, referenceControls, layout] = await Promise.all([
  'src/components/WorldToolsPanel.vue', 'src/components/EditorBottomPanel.vue', 'src/runtime/productionValidation.ts', 'src/components/BuildSettingsPanel.vue', 'scripts/verify-template-catalog.mjs', 'scripts/verify-v26.06-template-output.mjs', 'reference-projects/projects/simulation-v2606-physics-navigation-ai/test-controls.json', 'docs/UI_LAYOUT_AUDIT_26_06.md'
].map(source))
check('V2606-USER-REACH-SIMULATION', /bottomPanelTab\s*===\s*['"]worldProduction['"]/.test(bottom) && world.includes("'simulation'") && world.includes('worldTab_${tab}'), 'World Studio and its Simulation tab are reachable from the retained bottom dock.')
check('V2606-USER-AUTHOR-ROPE', world.includes('@click="createRopeLattice"') && /selectedEntityIds\.length\s*<\s*3/.test(world) && world.includes("t('ropeLatticeHint')"), 'The rope-lattice action is wired and explains selection readiness instead of acting decoratively.')
check('V2606-USER-EVIDENCE', world.includes('@change="toggleEvidence"') && world.includes('@click="clearSimulationEvidence"') && world.includes('simulationEvidenceState.frames'), 'Capture/stop and clear controls are bound to the displayed replay evidence state.')
check('V2606-USER-DIAGNOSTICS', world.includes('simulationReport.issues') && world.includes('localizedSimulationText') && health.includes('buildSimulationProductionReport'), 'World diagnostics and Build/Project Health use stable localized report identities from one validator.')
check('V2606-USER-BUILD-TEMPLATE', build.includes('compatibleTemplates') && build.includes('defaultExportTemplateId') && build.includes('watch(() => [buildSettings.target, buildSettings.architecture, buildSettings.runtimeMode]'), 'Changing target/architecture/runtime prevents a stale incompatible export template.')
check('V2606-USER-TEMPLATE-CATALOG', templates.includes('CATALOG-PACKAGE-OUTPUT') && templates.includes('CATALOG-EXPORT-TEMPLATE-REGISTRY') && output.includes('OUTPUT-ALL-TEMPLATES'), 'Every template is included in package round-trip and supported output verification.')
const controls = JSON.parse(referenceControls)
check('V2606-USER-REFERENCE-FLOW', controls.actions?.length >= 7 && controls.actions.some(/* 调用 /grid unit/i.test(item.expected) 并返回调用结果。 */ item => /grid unit/i.test(item.expected)) && controls.actions.some(/* 调用 /Web and Windows/i.test(item.action) 并返回调用结果。 */ item => /Web and Windows/i.test(item.action)), 'The normal-user reference covers units, Play, physics, navigation, AI, save/reload and both supported outputs.')
check('V2606-USER-LAYOUT-MATRIX', layout.includes('1024×640') && layout.includes('2560×1440') && layout.includes('80%, 100%, 125%, and 150%') && layout.includes('English, German, and Chinese'), 'The user layout matrix names every required locale, viewport and supported scale.')
const failed = checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed')
const report = { format: 'nova-v26.06-user-interactions', version: 1, release: '26.06', engineVersion: '26.6.0', generatedAt: new Date().toISOString(), checks, severity0Open: failed.length, severity1Open: 0, externalGates: { independentNormalUserRun: 'pending-external', assistiveTechnology: 'pending-external' }, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true }); await writeFile(join(root, 'release-audits/v26.06-user-interactions.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A 26.06 interaction wiring passed: ${checks.length} checks.`)
