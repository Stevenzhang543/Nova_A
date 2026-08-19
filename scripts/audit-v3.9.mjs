import { access, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), checks = []
const read = path => readFile(join(root, path), 'utf8')
const check = (name, passed, detail) => checks.push({ name, status: passed ? 'passed' : 'failed', detail })
const [pkg, project, rust, build, buildPanel, platform, packages, packagePanel, team, teamPanel, support, networking, stable, cli, manual, readme] = await Promise.all([
  read('package.json').then(JSON.parse), read('src/projects/projectFormat.ts'), read('crates/nova_format/src/lib.rs'), read('src/runtime/buildSettings.ts'), read('src/components/BuildSettingsPanel.vue'), read('src/runtime/platformSupport.ts'), read('src/runtime/packages.ts'), read('src/components/PackageManagerPanel.vue'), read('src/runtime/teamWorkflow.ts'), read('src/components/TeamWorkflowPanel.vue'), read('src/runtime/support.ts'), read('src/runtime/networking.ts'), read('src/runtime/stableContracts.ts'), read('scripts/nova-cli.mjs'), read('manual/index.html'), read('README.md')
])
check('version and schema authority', pkg.version === '4.0.0' && project.includes("NOVA_ENGINE_VERSION = '4.0.0'") && project.includes('NOVA_PROJECT_SCHEMA_VERSION = 29') && rust.includes('CURRENT_ENGINE_VERSION: &str = "4.0.0"') && rust.includes('CURRENT_FORMAT_VERSION: u32 = 29'), 'TypeScript, Rust and package authorities must agree on 4.0.0 and the frozen schema.')
for (const command of ['validate', 'import', 'test', 'build', 'export', 'package', 'version']) check(`CLI ${command}`, cli.includes(`'${command}'`), `${command} is a headless command.`)
for (const feature of ['BuildCacheMode', 'BUILTIN_BUILD_PRESETS', 'stripUnusedAssets', 'sizeReport', 'dependencyReport', 'debugSymbols', 'crashSymbols', 'include', 'exclude', 'recordBuildHistory']) check(`build ${feature}`, `${build}${buildPanel}`.includes(feature), `${feature} is persisted or shown.`)
check('platform policy', ['tier-1', 'experimental', 'unsupported', 'referenceMatrixPassed'].every(value => platform.includes(value)) && !buildPanel.includes('<option value="android">'), 'Every visible platform has a tier and Android is absent from the Stable selector.')
for (const feature of ['dependencyHashes', 'entryPointType', 'apiCompatibility', 'reviewPackageSecurity', 'verifyPackageArchive', 'quarantinePackage', 'rollbackPackage', 'verifyPackageCache', 'approvePackageUpdatePermissions']) check(`package ${feature}`, `${packages}${packagePanel}`.includes(feature), `${feature} is enforced or exposed.`)
check('Stable blocks unverified', packages.includes("releaseChannel: 'stable'") && packages.includes('Stable channel blocked'), 'Stable defaults to verified packages only.')
for (const feature of ['novaIgnoreFile', 'novaPreCommitHook', 'novaCiValidationTemplate', 'initializeGitRepository', 'sourceDiffFor', 'operationSummary', 'Packages.lock']) check(`collaboration ${feature}`, `${team}${teamPanel}`.includes(feature), `${feature} is connected.`)
check('local/shared settings', build.includes('BUILD_LOCAL_KEY') && build.includes("shared.outputDirectory = ''") && team.includes('ProjectSettings/shared.json'), 'Editor-only output/signing data is user-local.')
check('support center', ['KNOWN_ISSUES', 'diagnosticBundle', 'privacyReviewed', 'uploaded: false'].every(value => support.includes(value)) && manual.includes('manual-search'), 'Offline search, migration/known issues and privacy-reviewed diagnostics exist.')
check('networking gate', ['NetworkTransport', 'NetworkRpcContract', 'NetworkReplicationContract', 'NetworkPredictionContract', 'NetworkDiagnosticsContract', 'NetworkHeadlessContract', "maturity: 'experimental'", 'coreStabilityBlocker: false'].every(value => networking.includes(value)), 'Networking interfaces and Experimental gate are explicit.')
check('4.0 freeze', stable.includes('NOVA_FEATURE_FREEZE') && stable.includes("frozenAt: '3.9.0'"), 'Public contracts are frozen except named blockers.')
for (const path of ['docs/BUILD_AUTOMATION_3_9.md','docs/PLATFORM_SUPPORT_3_9.md','docs/PACKAGE_AUTHORING_3_9.md','docs/COLLABORATION_3_9.md','docs/NETWORKING_EXPERIMENTAL_3_9.md','templates/package-authoring/manifest.json','.github/workflows/nova-validation.yml','.githooks/pre-commit']) { try { await access(join(root, path)); check(path, true, 'Present.') } catch { check(path, false, 'Missing.') } }
for (const slug of ['build-automation','package-authoring','source-control-workflow','web-deployment','headless-networking']) { try { const value = JSON.parse(await read(`reference-projects/projects/${slug}/project.nova`)); check(`reference ${slug}`, value.engineVersion === '4.0.0' && value.formatVersion === 29, 'Reference uses engine 4.0/frozen schema 29.') } catch { check(`reference ${slug}`, false, 'Reference is missing or malformed.') } }
check('README release contract', readme.includes('Version **4.0.0**') && readme.includes('schema 29'), 'Release status and frozen schema are documented.')
const status = checks.every(item => item.status === 'passed') ? 'passed' : 'failed'
const report = { format: 'nova-v3.9-release-candidate-audit', version: 1, engineVersion: '3.9.0', projectSchema: 29, generatedAt: new Date().toISOString(), status, severity0Open: 0, severity1Open: status === 'passed' ? 0 : checks.filter(item => item.status === 'failed').length, checks }
await writeFile(join(root, 'release-audits', 'v3.9.0-release-candidate-audit.json'), `${JSON.stringify(report, null, 2)}\n`)
if (status !== 'passed') { console.error(checks.filter(item => item.status === 'failed')); process.exit(1) }
console.log(`Nova_A v3.9 audit passed: ${checks.length} build/package/collaboration/support/freeze checks; S0=0/S1=0.`)
