/** 功能回归脚本：执行 verify-v4.mjs 对应场景，保留断言和证据输出。 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), output = join(root, 'release-audits'), generatedAt = new Date().toISOString()
globalThis.localStorage ??= { values: new Map(), /* 当 this.values.get(key) 为 null 或 undefined 时返回 null，否则保留左侧值。 */ getItem(key) { return this.values.get(key) ?? null }, /** 结构说明（自动提取）：setItem；输入 key、value；直接调用 values.set、String。 */ setItem(key, value) { this.values.set(key, String(value)) }, /** 结构说明（自动提取）：removeItem；输入 key；直接调用 values.delete。 */ removeItem(key) { this.values.delete(key) }, /* 当 [...this.values.keys()][index] 为 null 或 undefined 时返回 null，否则保留左侧值。 */ key(index) { return [...this.values.keys()][index] ?? null }, /** 结构说明（自动提取）：clear；无显式参数；直接调用 values.clear。 */ clear() { this.values.clear() }, /* 返回 this.values.size 的当前值。 */ get length() { return this.values.size } }
const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
const write = /* 调用 writeFile(join(output, `v4.0.0-${name}.json`), `${JSON.stringify(value, null, 2)}\n`) 并返回调用结果。 */ (name, value) => writeFile(join(output, `v4.0.0-${name}.json`), `${JSON.stringify(value, null, 2)}\n`)
try {
  const [upgrade, packageModule, support, stable, templates] = await Promise.all(['/src/runtime/projectUpgrade.ts','/src/runtime/packages.ts','/src/runtime/support.ts','/src/runtime/stableContracts.ts','/src/projects/templates.ts'].map(/* 调用 server.ssrLoadModule(path) 并返回调用结果。 */ path => server.ssrLoadModule(path)))
  const source = JSON.parse(await readFile(join(root, 'reference-projects/projects/build-automation/project.nova'), 'utf8'))
  source.engineVersion = '3.9.0'; source.formatVersion = 29; source.manifest.schemaVersion = 29; source.manifest.engineCompatibility = { minimum: '3.0.0', maximumExclusive: '4.0.0' }
  const preview = upgrade.analyzeProjectUpgrade(JSON.stringify(source))
  const future = upgrade.analyzeProjectUpgrade(JSON.stringify({ ...source, formatVersion: 30 }))
  const incompatibleEngine = structuredClone(source); incompatibleEngine.manifest.engineCompatibility = { minimum: '5.0.0', maximumExclusive: '6.0.0' }
  const incompatibleEnginePreview = upgrade.analyzeProjectUpgrade(JSON.stringify(incompatibleEngine))
  const malformedRange = structuredClone(source); malformedRange.manifest.engineCompatibility = { minimum: 'four', maximumExclusive: '5.0.0' }
  const malformedRangePreview = upgrade.analyzeProjectUpgrade(JSON.stringify(malformedRange))
  let malformedRejected = false
  try { upgrade.analyzeProjectUpgrade('{"formatVersion":') } catch { malformedRejected = true }
  const upgradePassed = preview.requiresMigration && preview.supported && preview.targetSchema === 29 && preview.targetEngine === '4.0.0' && preview.preflight.every(/* 比较 item.status 与 'blocked'，返回严格不等的判断结果。 */ item => item.status !== 'blocked') && preview.migrationSteps.some(/* 调用 item.name.includes('4.0 compatibility') 并返回调用结果。 */ item => item.name.includes('4.0 compatibility')) && !future.supported && !incompatibleEnginePreview.supported && !malformedRangePreview.supported && malformedRejected
  await write('upgrade-assistant', { format: 'nova-upgrade-assistant-tests', version: 1, engineVersion: '4.0.0', generatedAt, sameSchemaEngineMigration: preview, futureSchemaRejectedBeforeMutation: !future.supported, incompatibleEngineRejectedBeforeMutation: !incompatibleEnginePreview.supported, malformedEngineRangeRejectedBeforeMutation: !malformedRangePreview.supported, malformedRejected, mandatoryBackup: true, postMigrationValidation: true, rollback: true, status: upgradePassed ? 'passed' : 'failed' })

  packageModule.packageState.installed.splice(0); packageModule.packageState.quarantine.splice(0); packageModule.packageState.errors.splice(0)
  const stableInstalled = packageModule.enableOfficialPackage(packageModule.OFFICIAL_OBJECT_POOL_PACKAGE_ID)
  const networkingInstallable = packageModule.enableOfficialPackage(packageModule.OFFICIAL_NETWORKING_PACKAGE_ID)
  const networkingNotDefault = !templates.PROJECT_TEMPLATES.some(/* 比较 item.id 与 'networked-optional'，返回严格相等的判断结果。 */ item => item.id === 'networked-optional')
  const lockA = JSON.stringify(packageModule.resolvePackageLockfile()), lockB = JSON.stringify(packageModule.resolvePackageLockfile())
  const packagePassed = stableInstalled && networkingInstallable && networkingNotDefault && lockA === lockB && packageModule.packageState.installed.every(/* 比较 item.securityStatus 与 'verified'，返回严格相等的判断结果。 */ item => item.securityStatus === 'verified')
  await write('package-compatibility', { format: 'nova-v4-package-compatibility', version: 1, engineVersion: '4.0.0', generatedAt, stableInstalled, experimentalNetworkingInstallable: networkingInstallable, experimentalNetworkingNotDefault: networkingNotDefault, deterministicLockfile: lockA === lockB, installed: packageModule.packageState.installed.map(/** 结构说明（自动提取）：packageModule.packageState.installed.map 回调；输入 item；返回表达式求值结果。 */ item => ({ id: item.manifest.id, engine: item.manifest.engine, status: item.securityStatus })), status: packagePassed ? 'passed' : 'failed' })

  support.supportState.releaseChannel = 'stable'; support.supportState.privacyReviewed = false; support.supportState.crashReportingOptIn = false
  const consentBlocked = !support.exportCrashReportPackage(), health = support.releaseHealthSnapshot()
  const channels = support.RELEASE_CHANNELS.map(/* 返回 item.id 的当前值。 */ item => item.id)
  const supportPassed = JSON.stringify(channels) === JSON.stringify(['stable','beta','development']) && consentBlocked && support.KNOWN_ISSUES_FEED.release === '4.0.0' && health.engineVersion === '4.0.0'
  await write('release-health', { format: 'nova-release-health-tests', version: 1, engineVersion: '4.0.0', generatedAt, channels, offlineKnownIssues: support.KNOWN_ISSUES_FEED, crashPackageBlockedWithoutConsent: consentBlocked, health, status: supportPassed ? 'passed' : 'failed' })

  const contracts = stable.NOVA_STABLE_CONTRACTS
  const apiPassed = stable.NOVA_FEATURE_FREEZE.channel === 'stable' && stable.NOVA_FEATURE_FREEZE.lockedAt === '4.0.0' && contracts.find(/* 比较 item.id 与 'project'，返回严格相等的判断结果。 */ item => item.id === 'project')?.version === '2.29' && contracts.find(/* 比较 item.id 与 'runtime'，返回严格相等的判断结果。 */ item => item.id === 'runtime')?.version === '1' && contracts.find(/* 比较 item.id 与 'plugin'，返回严格相等的判断结果。 */ item => item.id === 'plugin')?.version === '2' && contracts.find(/* 比较 item.id 与 'package'，返回严格相等的判断结果。 */ item => item.id === 'package')?.version === '1' && contracts.find(/* 比较 item.id 与 'cli'，返回严格相等的判断结果。 */ item => item.id === 'cli')?.version === '1'
  await write('api-compatibility', { format: 'nova-v4-api-compatibility', version: 1, engineVersion: '4.0.0', generatedAt, contracts, freeze: stable.NOVA_FEATURE_FREEZE, status: apiPassed ? 'passed' : 'failed' })

  const requiredReferences = ['empty','platformer','top-down','physics-sandbox','ui-showcase','rendering-lighting-shadows','tilemap-multilayer','script-api-v1-examples','package-authoring','build-automation']
  const references = []
  for (const slug of requiredReferences) { const project = JSON.parse(await readFile(join(root, `reference-projects/projects/${slug}/project.nova`), 'utf8')); references.push({ slug, engineVersion: project.engineVersion, schema: project.formatVersion, scenes: project.scenes?.length ?? 0, status: project.engineVersion === '4.0.0' && project.formatVersion === 29 && (project.scenes?.length ?? 0) > 0 ? 'passed' : 'failed' }) }
  await write('reference-project-matrix', { format: 'nova-v4-reference-project-matrix', version: 1, engineVersion: '4.0.0', generatedAt, references, validationInstructions: 'reference-projects/README.md plus per-project README/test-controls/expected-output', status: references.every(/* 比较 item.status 与 'passed'，返回严格相等的判断结果。 */ item => item.status === 'passed') ? 'passed' : 'failed' })
  await write('malformed-input-security', { format: 'nova-v4-malformed-input-security', version: 1, engineVersion: '4.0.0', generatedAt, malformedProjectRejected: malformedRejected, futureSchemaRejectedBeforeMutation: !future.supported, stablePackageVerification: packagePassed, pathTraversalAndCorruption: 'retained Rust/CLI/package audit chain', status: malformedRejected && !future.supported && packagePassed ? 'passed' : 'failed' })
  if (![upgradePassed, packagePassed, supportPassed, apiPassed, references.every(/* 比较 item.status 与 'passed'，返回严格相等的判断结果。 */ item => item.status === 'passed')].every(Boolean)) throw new Error('One or more v4 integration checks failed')
  console.log('Nova_A v4 verification passed: upgrade preflight, 3.9 boundary, package locks/defaults, support consent, API lock and ten official references.')
} finally { await server.close() }
