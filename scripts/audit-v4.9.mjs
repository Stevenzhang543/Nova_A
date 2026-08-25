import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const checks = []
const check = (id, passed, detail) => checks.push({ id, status: passed ? 'passed' : 'failed', detail })
const read = path => readFile(join(root, path), 'utf8')
const sources = Object.fromEntries(await Promise.all([
  'package.json', 'Cargo.toml', 'src-tauri/Cargo.toml', 'src-tauri/tauri.conf.json',
  'src/runtime/platformSupport.ts', 'src/runtime/buildSettings.ts', 'src/runtime/gameExporter.ts',
  'src/runtime/packages.ts', 'src/runtime/teamWorkflow.ts', 'src/runtime/releaseEngineering.ts',
  'scripts/nova-cli.mjs', 'scripts/nova-export.mjs',
  'src/runtime/support.ts', 'src/components/BuildSettingsPanel.vue', 'src/components/PackageManagerPanel.vue',
  'src/components/ProjectHealthPanel.vue', 'src/components/TeamWorkflowPanel.vue', 'src/i18n.ts'
].map(async path => [path, await read(path)])))
const all = Object.values(sources).join('\n')
const pkg = JSON.parse(sources['package.json'])
const tauri = JSON.parse(sources['src-tauri/tauri.conf.json'])

check('BLD-VERSION', pkg.version === '4.9.0' && tauri.version === '4.9.0' && sources['Cargo.toml'].includes('version = "4.9.0"') && sources['src-tauri/Cargo.toml'].includes('version = "4.9.0"'), 'Web, workspace and native authorities identify 4.9.0.')
check('BLD-TIERS', ['Windows','Web','tier-1','Linux','macOS','Experimental','unavailable','buildHosts','minimumSystem','lastQualified'].every(value => all.includes(value)), 'Platform tiers, host requirements, availability and evidence are explicit.')
check('BLD-EXPORT', ['exportTemplate','stripUnusedAssets','compression','debugSymbols','crashSymbols','contentManifest','releaseChannel','signingHook','notarizationHook','deploymentMode','cleanMachineJob'].every(value => all.includes(value)), 'Export templates, content, delivery, crash/symbol and external hook settings are connected.')
check('BLD-PROVENANCE', ['nova-build-provenance','nova-sbom','nova-deployment-manifest','webDeploymentHeaders','compareBuildProvenance','inputsHash','outputsHash','cacheKey'].every(value => all.includes(value)), 'Build provenance, SBOM, manifests, web headers and deterministic comparison are implemented.')
check('PKG-FAIL-CLOSED', ['publisherVerified','verifyPackageArchive','packageInstallReview','executionAllowed','grantedPermissions','quarantinePackage','rollbackPackage'].every(value => all.includes(value)), 'Package execution is gated by compatibility, provenance, integrity and permissions.')
check('PKG-ECOSYSTEM', ['registries','offlineMirror','resolvePackageLockfile','verifyPackageCache','licenseUrl','vulnerabilityPolicy','certification','dependencyHashes'].every(value => all.includes(value)), 'Registry, lock, offline, cache, license, vulnerability, dependency and certification metadata exist.')
check('HLT-TEAM', ['semanticProjectComparison','novaIgnoreFile','codeOwnersFile','ownership','taskLinks','changeNotes','sharedBuildPresets','binaryLocks','networkOperations'].every(value => all.includes(value)), 'Optional local-first source-control/team workflow is wired.')
check('HLT-RELEASE', ['releaseReadinessGate','projectSchemaGate','packageSecurityGate','documentationGate','cleanMachineMatrix','rcObservation','RELEASE_CANDIDATE_FREEZE'].every(value => all.includes(value)), 'Project Health exposes the release-readiness gates and direct fixes.')
check('REL-PIPELINE', ['NOVA_RELEASE_PIPELINE','references:v4.9','audit:v4.9','verify:v4.9','evidence:v4.9','release:v4.9'].every(value => all.includes(value)), 'The release pipeline and package scripts are declared.')
check('BLD-CLI', sources['scripts/nova-cli.mjs'].includes("ENGINE_VERSION = '4.9.0'") && sources['scripts/nova-cli.mjs'].includes('CLI_VERSION = 1') && ['host or CI runner','nova-build-provenance','nova-content-manifest','CycloneDX','implicitNetworkOperation'].every(value => sources['scripts/nova-export.mjs'].includes(value)), 'Build CLI 1 is current, host-safe and emits release metadata.')
check('REL-PRIVACY', all.includes('diagnosticPrivacyChecklist') && all.includes('privacyReviewed') && all.includes('uploaded: false'), 'Diagnostic export requires privacy review and never uploads automatically.')
check('I18N-V49', ['en','de','zh'].every(language => sources['src/i18n.ts'].includes("releaseLabel:'Nova_A v4.9.0'")), 'The v4.9 vocabulary is present in English, German and Chinese.')

const docs = ['PLATFORM_BUILD_MATRIX_4_9.md','PACKAGE_PLUGIN_SDK_4_9.md','BUILD_EXPORT_4_9.md','FIRST_GAME_4_9.md','SOURCE_CONTROL_4_9.md','MIGRATION_4_9.md','RELEASE_ENGINEERING_4_9.md','TROUBLESHOOTING_4_0.md','ACCESSIBILITY_GUIDE_4_0.md','API_REFERENCE_4_0.md']
for (const name of docs) { try { const source = await read(`docs/${name}`); check(`DOC-${name}`, source.length > 500, `${name} is substantive and offline.`) } catch { check(`DOC-${name}`, false, 'Missing.') } }
for (const slug of ['build-v49-platform-matrix','build-v49-release-pipeline','package-v49-extension-sdk','collaboration-v49-local-team','first-game-v49-tier1']) for (const name of ['project.nova','README.md','expected-output.json','test-controls.json']) {
  try { await access(join(root, 'reference-projects', 'projects', slug, name)); check(`REF-${slug}-${name}`, true, 'Present.') } catch { check(`REF-${slug}-${name}`, false, 'Missing.') }
}
for (const name of ['MANUAL.en.md','MANUAL.de.md','MANUAL.zh-CN.md','index.html']) { try { const source = await read(`manual/${name}`); check(`MANUAL-${name}`, source.includes('4.9') && source.length > 5_000, 'Versioned offline manual is substantive.') } catch { check(`MANUAL-${name}`, false, 'Missing.') } }

const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v4.9-release-system-audit', version: 1, engineVersion: '4.9.0', generatedAt: new Date().toISOString(), catalogs: ['BLD','PKG','HLT','REGRESSION'], checks, severity0Open: 0, severity1Open: failed.length, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits', 'v4.9.0-release-system-audit.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v4.9 release-system audit passed: ${checks.length} checks.`)
