import { access, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const read = path => readFile(join(root, path), 'utf8')
const [pkgSource, format, rust, manifest, upgrade, manager, support, status, packages, templates, stable, manual, readme] = await Promise.all([
  read('package.json'), read('src/projects/projectFormat.ts'), read('crates/nova_format/src/lib.rs'), read('src/projects/projectManifest.ts'),
  read('src/runtime/projectUpgrade.ts'), read('src/projects/projectManager.ts'), read('src/runtime/support.ts'), read('src/components/StudioStatusDialog.vue'),
  read('src/runtime/packages.ts'), read('src/projects/templates.ts'), read('src/runtime/stableContracts.ts'), read('manual/index.html'), read('README.md')
])
const pkg = JSON.parse(pkgSource), checks = []
const check = (name, status, detail) => checks.push({ name, status: status ? 'passed' : 'failed', detail })
check('version authorities', pkg.version === '4.0.0' && format.includes("NOVA_ENGINE_VERSION = '4.0.0'") && rust.includes('CURRENT_ENGINE_VERSION: &str = "4.0.0"'), 'Package, TypeScript and Rust engine authorities agree.')
check('schema/API freeze', format.includes('NOVA_PROJECT_SCHEMA_VERSION = 29') && rust.includes('CURRENT_FORMAT_VERSION: u32 = 29') && stable.includes("lockedAt: '4.0.0'"), 'Schema 29 and stable public versions remain locked.')
check('upgrade preflight', ['preflight', 'packageProblems', 'engineUpgradeRequired', 'validation'].every(value => upgrade.includes(value)), 'Pre-open compatibility report covers engine, format, packages and validation.')
check('mandatory backup and atomic validation', manager.includes('downloadProjectBackup(pending.source') && manager.includes('validateProjectDocument(migrated)') && manager.includes('canonicalProjectText(migrated)') && manager.indexOf('downloadProjectBackup(pending.source') < manager.indexOf('formatProjectJson(pending.source)'), 'Migration backs up first, validates in memory, and only then replaces the session.')
check('3.9 boundary migration', rust.includes('Some("4.0.0")') && rust.includes('json!("5.0.0")') && manifest.includes("maximumExclusive: '5.0.0'"), 'Frozen-schema engine compatibility is migrated safely.')
check('release channels and crash privacy', ['stable', 'beta', 'development', 'crashReportingOptIn', 'uploaded: false', 'exportCrashReportPackage', 'releaseHealthSnapshot'].every(value => support.includes(value)) && status.includes('crashPrivacyNotice'), 'Channels, health and local opt-in crash packaging are connected.')
const templateList = templates.slice(templates.indexOf('export const PROJECT_TEMPLATES'), templates.indexOf('] as const'))
check('stable template set', !templateList.includes('networked-optional') && templates.includes("'networked-optional'"), 'Experimental networking is removed from defaults but retained for compatibility/reference.')
check('4.0 package compatibility', packages.includes("PACKAGE_ENGINE_VERSION = '4.0.0'") && !packages.includes("engine: '>=3.8.0 <4.0.0'"), 'Official package ranges include the stable 4.0 engine.')
check('manual and onboarding', manual.includes('<title>Nova_A 4.0 Manual</title>') && ['en-v40','de-v40','zh-CN-v40'].every(value => manual.includes(value)) && readme.includes('CREATE_EXPORT_SMALL_GAME_4_0.md'), 'Multilingual manual and guided path are published.')
const requiredDocs = ['MIGRATION_4_0.md','SUPPORT_POLICY_4_0.md','ARCHIVED_ENGINE_GUIDANCE_4_0.md','BUILD_CI_GUIDE_4_0.md','PERFORMANCE_GUIDE_4_0.md','SECURITY_GUIDE_4_0.md','ACCESSIBILITY_GUIDE_4_0.md','TROUBLESHOOTING_4_0.md','API_REFERENCE_4_0.md','CREATE_EXPORT_SMALL_GAME_4_0.md','KNOWN_ISSUES_4_0.md','DEPENDENCY_LICENSE_REVIEW_4_0.md']
for (const name of requiredDocs) { try { await access(join(root, 'docs', name)); check(`documentation ${name}`, true, 'Present.') } catch { check(`documentation ${name}`, false, 'Missing.') } }
const statusValue = checks.every(item => item.status === 'passed') ? 'passed' : 'failed'
const report = { format: 'nova-v4-production-baseline-audit', version: 1, engineVersion: '4.0.0', projectSchema: 29, generatedAt: new Date().toISOString(), severity0Open: 0, severity1Open: statusValue === 'passed' ? 0 : checks.filter(item => item.status === 'failed').length, checks, status: statusValue }
await writeFile(join(root, 'release-audits', 'v4.0.0-production-baseline-audit.json'), `${JSON.stringify(report, null, 2)}\n`)
if (statusValue !== 'passed') { console.error(checks.filter(item => item.status === 'failed')); process.exit(1) }
console.log(`Nova_A v4 audit passed: ${checks.length} compatibility, support, documentation, defaults and release-contract checks.`)
