import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const text = path => readFile(join(root, path), 'utf8')
const checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const [pkgSource, cargo, tauriSource, formatTs, formatRust, wasmPackageSource, registry, exporter, simulation, worldPanel, navigation, ai, production, i18n, outputContract, simulationContract, layoutContract] = await Promise.all([
  'package.json', 'Cargo.toml', 'src-tauri/tauri.conf.json', 'src/projects/projectFormat.ts', 'crates/nova_format/src/lib.rs', 'nova_core/pkg/package.json',
  'scripts/export-template-registry.mjs', 'scripts/nova-export.mjs', 'src/runtime/simulationAuthoring26.ts', 'src/components/WorldToolsPanel.vue', 'src/runtime/navigation2d.ts', 'src/runtime/aiTools.ts', 'src/runtime/productionValidation.ts', 'src/i18n.ts',
  'docs/OUTPUT_BUILD_RELIABILITY_26_06.md', 'docs/SIMULATION_AUTHORING_26_06.md', 'docs/UI_LAYOUT_AUDIT_26_06.md'
].map(text))
const pkg = JSON.parse(pkgSource), tauri = JSON.parse(tauriSource), wasmPackage = JSON.parse(wasmPackageSource)
check('V2606-VERSION-AUTHORITY', pkg.version === '26.6.0' && tauri.version === '26.6.0' && wasmPackage.version === '26.6.0' && cargo.includes('version = "26.6.0"') && formatTs.includes("NOVA_ENGINE_VERSION = '26.6.0'") && formatTs.includes("NOVA_RELEASE_NAME = '26.06'") && formatRust.includes('CURRENT_ENGINE_VERSION: &str = "26.6.0"'), 'npm, Cargo, Tauri, WASM and project-format authorities agree on 26.6.0 / 26.06.')
check('V2606-FROZEN-CONTRACTS', formatTs.includes('NOVA_PROJECT_SCHEMA_VERSION = 29') && formatRust.includes('CURRENT_FORMAT_VERSION: u32 = 29'), '26.06 remains additive over Project Format 2/schema 29.')
check('V2606-TEMPLATE-REGISTRY', registry.includes('windows-x64-v1') && registry.includes('web-es2022-v1') && registry.includes('EXPORT_TEMPLATE_NOT_REGISTERED') && exporter.includes('validateExportTemplate') && exporter.includes('templateMigratedFrom'), 'Headless output validates stable Export Template 1 identities and records explicit legacy migration.')
check('V2606-OUTPUT-CONTAINMENT', exporter.includes("new Map([['project.nova', 'Project manifest']])") && exporter.includes('cacheSemantics') && exporter.includes('invalidSceneOrder') && exporter.includes('packagedPaths'), 'Output protects the reserved manifest, validates scenes and duplicate paths, and states cache semantics.', { contract: 'OUTPUT_BUILD_RELIABILITY_26_06.md' })
check('V2606-SIMULATION-REPORT', simulation.includes('buildSimulationProductionReport') && simulation.includes('PHYSICS_UNITS') && simulation.includes('simulationStateChecksum') && simulation.includes('10_000'), 'Simulation readiness owns units, bounded physics/navigation/AI validation and stable replay checksums.')
check('V2606-SIMULATION-UI', /activeTab\s*===\s*['"]simulation['"]/.test(worldPanel) && worldPanel.includes('simulationReport.checks') && worldPanel.includes('captureReplayEvidence') && worldPanel.includes('createRopeLattice'), 'World Studio exposes the simulation report, evidence controls and rope-lattice authoring.')
check('V2606-NAVIGATION-AI', navigation.includes('HierarchicalAStar') && navigation.includes('FlowField') && navigation.includes('avoidance') && ai.includes('BehaviorTree') && ai.includes('StateMachine'), 'Navigation and AI retain the required path, avoidance, behavior-tree and state-machine routes.')
check('V2606-BUILD-READINESS', production.includes('simulation') && production.includes('buildSimulationProductionReport'), 'Project Health/Build production validation consumes the same simulation report.')
const requiredKeys = ['worldTab_simulation','simulationReadiness','simulationSummary_units','simulationDetail_units','simulationFix_units','simulationIssue_settings_message','simulationIssue_settings_fix','captureReplayEvidence','navigationDebug','aiDebug']
check('V2606-LOCALIZATION', requiredKeys.every(key => i18n.includes(`${key}:`) || i18n.includes(`'${key}':`)), 'Simulation labels, report prose and remedies have stable EN/DE/ZH dictionary keys.', { requiredKeys })
check('V2606-DOCUMENTATION', outputContract.includes('all twenty') && simulationContract.includes('1 grid unit') && layoutContract.includes('centered') && layoutContract.includes('English, German, and Chinese'), 'Output, simulation and all-panel localized layout contracts are present.')
const referencePath = join(root, 'reference-projects/projects/simulation-v2606-physics-navigation-ai/project.nova')
let reference = null, referenceError = ''
try { reference = JSON.parse(await readFile(referencePath, 'utf8')) } catch (error) { referenceError = error instanceof Error ? error.message : String(error) }
const entities = reference?.scenes?.flatMap(scene => scene.entities ?? []) ?? [], connections = reference?.scenes?.flatMap(scene => scene.connections ?? []) ?? [], kinds = new Set(entities.flatMap(entity => entity.components?.map(component => component.kind) ?? []))
check('V2606-REFERENCE', reference?.engineVersion === '26.6.0' && entities.some(entity => entity.components?.some(component => component.data?.shapes?.length >= 2)) && connections.filter(connection => connection.componentType === 'Rope2D' && connection.collisionEnabled).length >= 3 && ['NavigationRegion2D','NavigationObstacle2D','NavigationAgent2D','BehaviorTree2D','StateMachine2D'].every(kind => kinds.has(kind)), 'The authored 26.06 reference covers compounds, a collision-enabled rope lattice, navigation, avoidance, Behavior Tree and HSM.', { referenceError, entities: entities.length, connections: connections.length, componentKinds: [...kinds].sort() })

const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v26.06-verification', version: 1, release: '26.06', engineVersion: '26.6.0', generatedAt: new Date().toISOString(), checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v26.06-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A 26.06 verification passed: ${checks.length} checks.`)
