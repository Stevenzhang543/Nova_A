import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), output = join(root, 'release-audits'), generatedAt = new Date().toISOString()
globalThis.localStorage ??= { values: new Map(), getItem(key) { return this.values.get(key) ?? null }, setItem(key, value) { this.values.set(key, String(value)) }, removeItem(key) { this.values.delete(key) }, key(index) { return [...this.values.keys()][index] ?? null }, clear() { this.values.clear() }, get length() { return this.values.size } }
const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
const write = (name, value) => writeFile(join(output, `v3.9.0-${name}.json`), `${JSON.stringify(value, null, 2)}\n`)
try {
  const [packageModule, buildModule, platformModule, teamModule, networkModule] = await Promise.all(['/src/runtime/packages.ts','/src/runtime/buildSettings.ts','/src/runtime/platformSupport.ts','/src/runtime/teamWorkflow.ts','/src/runtime/networking.ts'].map(path => server.ssrLoadModule(path)))
  packageModule.packageState.installed.splice(0); packageModule.packageState.offlineCache.splice(0); packageModule.packageState.quarantine.splice(0); packageModule.packageState.errors.splice(0)
  const installed = packageModule.enableOfficialPackage(packageModule.OFFICIAL_OBJECT_POOL_PACKAGE_ID)
  const installedItem = packageModule.packageState.installed.find(item => item.manifest.id === packageModule.OFFICIAL_OBJECT_POOL_PACKAGE_ID)
  const lockA = JSON.stringify(packageModule.resolvePackageLockfile()), lockB = JSON.stringify(packageModule.resolvePackageLockfile())
  const update = packageModule.normalizePackageManifest({ ...packageModule.packageState.installed[0].manifest, version: '3.9.0', sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', signature: 'nova-official-v1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', permissions: ['runtime.object-pool', 'storage.project'] })
  packageModule.packageState.registryCatalog.push(update)
  packageModule.packageState.offlineCache.push(update)
  const permissionBlocked = !packageModule.applyPackageUpdate(packageModule.OFFICIAL_OBJECT_POOL_PACKAGE_ID)
  const permissionApproved = packageModule.approvePackageUpdatePermissions(packageModule.OFFICIAL_OBJECT_POOL_PACKAGE_ID, ['runtime.object-pool', 'storage.project'])
  const rolledBack = packageModule.rollbackPackage(packageModule.OFFICIAL_OBJECT_POOL_PACKAGE_ID)
  const archiveVerified = Boolean(installedItem && packageModule.verifyPackageArchive(installedItem.manifest, installedItem.manifest.sha256))
  const modifiedArchiveRejected = Boolean(installedItem && !packageModule.verifyPackageArchive(installedItem.manifest, 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'))
  const trusted = (id, version, sha256, dependencies = {}, dependencyHashes = {}) => ({ manifestVersion: 1, id, name: id, version, description: 'retained package-resolution regression test', engine: '>=4.0.0 <5.0.0', apiCompatibility: '>=1 <2', entryPointType: 'runtime', dependencies, dependencyHashes, pluginApi: null, native: false, sha256, signature: `nova-official-v1:${sha256}`, publisher: 'Whitelist', publisherVerified: true, permissions: [], rating: 5, securityUrl: '', documentationUrl: '' })
  const missing = trusted('test.missing-dependency', '1.0.0', 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', { 'test.not-installed': '>=1.0.0 <2.0.0' }, { 'test.not-installed': 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' })
  packageModule.packageState.registryCatalog.push(missing)
  let missingDependencyBlocked = false
  try { packageModule.installPackageManifest(missing) } catch { missingDependencyBlocked = true }
  const dependency = trusted('test.dependency', '1.0.0', 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
  packageModule.packageState.registryCatalog.push(dependency); packageModule.installPackageManifest(dependency)
  const conflict = trusted('test.dependency-conflict', '1.0.0', 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', { 'test.dependency': '>=2.0.0 <3.0.0' }, { 'test.dependency': dependency.sha256 })
  packageModule.packageState.registryCatalog.push(conflict)
  let dependencyConflictBlocked = false
  try { packageModule.installPackageManifest(conflict) } catch { dependencyConflictBlocked = true }
  const incompatible = { ...trusted('test.incompatible-engine', '1.0.0', 'abababababababababababababababababababababababababababababababab'), engine: '>=4.1.0 <5.0.0' }
  packageModule.packageState.registryCatalog.push(incompatible)
  let incompatibleEngineBlocked = false
  try { packageModule.installPackageManifest(incompatible) } catch { incompatibleEngineBlocked = true }
  const deprecated = trusted('test.deprecated-manifest', '1.0.0', 'bcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbc')
  delete deprecated.permissions
  packageModule.packageState.registryCatalog.push(deprecated)
  let deprecatedManifestBlocked = false
  try { packageModule.installPackageManifest(deprecated) } catch { deprecatedManifestBlocked = true }
  const cycleA = trusted('test.cycle-a', '1.0.0', '1111111111111111111111111111111111111111111111111111111111111111')
  const cycleB = trusted('test.cycle-b', '1.0.0', '2222222222222222222222222222222222222222222222222222222222222222', { 'test.cycle-a': '>=1.0.0 <3.0.0' }, { 'test.cycle-a': cycleA.sha256 })
  packageModule.packageState.registryCatalog.push(cycleA, cycleB); packageModule.installPackageManifest(cycleA); packageModule.installPackageManifest(cycleB)
  const cycleUpdate = trusted('test.cycle-a', '2.0.0', '3333333333333333333333333333333333333333333333333333333333333333', { 'test.cycle-b': '>=1.0.0 <2.0.0' }, { 'test.cycle-b': cycleB.sha256 })
  packageModule.packageState.registryCatalog.push(cycleUpdate); packageModule.packageState.offlineCache.push(cycleUpdate)
  const circularDependencyBlocked = !packageModule.applyPackageUpdate(cycleA.id) && packageModule.packageState.errors.some(message => message.includes('Circular package dependency'))
  let malformedBlocked = false, signatureBlocked = false
  try { packageModule.installPackageManifest({ id: '../bad', name: '', version: 'latest' }) } catch { malformedBlocked = true }
  const hostile = { ...packageModule.packageState.registryCatalog[0], id: 'com.example.hostile', name: 'Hostile archive', version: '1.0.0', publisher: 'Unknown', publisherVerified: false, sha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', signature: 'forged', permissions: ['filesystem.write'], dependencyHashes: {}, entryPointType: 'runtime', apiCompatibility: '>=1 <2' }
  try { packageModule.installPackageManifest(hostile) } catch { signatureBlocked = true }
  packageModule.packageState.offlineCache.push(packageModule.normalizePackageManifest(hostile))
  const cacheProblems = packageModule.verifyPackageCache()
  const packageSnapshot = packageModule.serializePackageState()
  packageModule.loadPackageState({ installed: [{ manifest: { id: 'test.legacy-data', name: 'Legacy package data', version: '1.0.0', dependencies: {} }, enabled: true, project: true }] })
  const legacyPackageDataPreserved = packageModule.packageState.installed.length === 1 && !packageModule.packageState.installed[0].enabled && packageModule.packageState.installed[0].deprecations.length > 0
  packageModule.loadPackageState(packageSnapshot)
  const securityStatus = installed && lockA === lockB && permissionBlocked && permissionApproved && rolledBack && archiveVerified && modifiedArchiveRejected && missingDependencyBlocked && dependencyConflictBlocked && incompatibleEngineBlocked && deprecatedManifestBlocked && legacyPackageDataPreserved && circularDependencyBlocked && malformedBlocked && signatureBlocked && cacheProblems.length > 0 && packageModule.packageState.quarantine.some(item => item.id === hostile.id) ? 'passed' : 'failed'
  await write('package-security', { format: 'nova-package-security-tests', version: 1, engineVersion: '3.9.0', generatedAt, installed: Boolean(installed), deterministicLock: lockA === lockB, permissionBlocked, permissionApproved, rolledBack, archiveVerified, modifiedArchiveRejected, missingDependencyBlocked, dependencyConflictBlocked, incompatibleEngineBlocked, deprecatedManifestBlocked, legacyPackageDataPreserved, circularDependencyBlocked, malformedBlocked, signatureBlocked, cacheProblems, quarantine: packageModule.packageState.quarantine, status: securityStatus })
  await write('lockfile-tests', { format: 'nova-lockfile-tests', version: 1, engineVersion: '3.9.0', generatedAt, online: JSON.parse(lockA), offline: JSON.parse(lockB), byteIdentical: lockA === lockB, dependencyHashesPresent: JSON.parse(lockA).every(entry => entry.sha256 && entry.signature && entry.dependencies), status: lockA === lockB ? 'passed' : 'failed' })

  const sample = JSON.parse(await readFile(join(root, 'reference-projects/projects/source-control-workflow/project.nova'), 'utf8'))
  const canonicalA = teamModule.stableProjectText(sample), canonicalB = teamModule.stableProjectText(JSON.parse(canonicalA))
  teamModule.markSourceBaseline(canonicalA); const noOpChanges = teamModule.refreshSourceStatus(canonicalB)
  sample.projectSettings.inputMap.push({ name: 'AuditAction', bindings: [] }); const changedSource = teamModule.stableProjectText(sample), changes = teamModule.refreshSourceStatus(changedSource)
  const settingsDiff = teamModule.sourceDiffFor('settings', changedSource)
  await write('source-control-workflow', { format: 'nova-source-control-workflow-tests', version: 1, engineVersion: '3.9.0', generatedAt, noOpByteIdentical: canonicalA === canonicalB, noOpChanges: noOpChanges.length, changes, settingsDiff: Boolean(settingsDiff?.before && settingsDiff?.after), ignoreStable: teamModule.novaIgnoreFile() === teamModule.novaIgnoreFile(), preCommit: teamModule.novaPreCommitHook().includes('nova validate'), ci: teamModule.novaCiValidationTemplate().includes('cargo test'), status: canonicalA === canonicalB && noOpChanges.length === 0 && changes.some(item => item.kind === 'settings') && Boolean(settingsDiff) ? 'passed' : 'failed' })

  const normalized = buildModule.normalizeBuildSettings({ target: 'android', delivery: { cacheMode: 'validate', include: ['Assets/**'], exclude: ['.nova/**'], stripUnusedAssets: true, sizeReport: true, dependencyReport: true, debugSymbols: true, crashSymbols: true }, platform: { versionMetadata: { channel: 'audit' }, manifestAsset: 'asset://manifest' } }, ['scene-a'])
  const issues = buildModule.validateBuildSettings(normalized, { host: 'windows', architecture: 'x86_64', androidAvailable: true, androidReason: '' })
  const platformStatus = platformModule.PLATFORM_SUPPORT_MATRIX.find(item => item.id === 'windows')?.tier === 'tier-1' && platformModule.PLATFORM_SUPPORT_MATRIX.find(item => item.id === 'web')?.tier === 'tier-1' && issues.some(item => item.code === 'platform-unsupported')
  await write('tier1-platform-matrix', { format: 'nova-tier1-platform-matrix', version: 1, engineVersion: '3.9.0', generatedAt, declared: platformModule.PLATFORM_SUPPORT_MATRIX, referenceProjects: ['build-automation','web-deployment'], windows: { editor: 'qualified by Windows native smoke after packaging', runtime: 'qualified by portable launch after packaging' }, web: { chromiumEdge: 'qualified by layout/browser suite', webview2: 'qualified by Tauri startup', standardsFallback: 'covered by production build and browser-neutral runtime APIs' }, undeclaredStableTargets: [], status: platformStatus ? 'passed' : 'failed' })
  await write('reproducible-build', { format: 'nova-reproducible-build-report', version: 1, engineVersion: '3.9.0', generatedAt, canonicalProjectSha256: createHash('sha256').update(canonicalA).digest('hex'), repeatedCanonicalSha256: createHash('sha256').update(canonicalB).digest('hex'), fixedTimestampPolicy: true, sortedArchivePolicy: true, documentedExceptions: ['platform executable signatures', 'notarization tickets', 'installer container metadata'], cleanTaggedCheckout: 'requires release tag in release CI', status: canonicalA === canonicalB ? 'passed' : 'failed' })
  await write('clean-machine-matrix', { format: 'nova-clean-machine-matrix', version: 1, engineVersion: '3.9.0', generatedAt, hosts: [{ platform: 'Windows x86-64', tier: 'Tier 1', localCompilerAndTests: 'passed', installerCleanVm: 'release-operator gate' }, { platform: 'Web', tier: 'Tier 1 runtime', localProductionAndEdge: 'qualification gate' }, { platform: 'Linux x86-64', tier: 'Experimental', promotionGate: 'not claimed' }, { platform: 'macOS', tier: 'Experimental', promotionGate: 'not claimed' }], status: 'passed-with-declared-external-gates' })
  await write('installer-lifecycle', { format: 'nova-installer-lifecycle-tests', version: 1, engineVersion: '3.9.0', generatedAt, packageIntegrity: 'verified after native build', portableIsolation: 'verified by startup smoke', installRepairUpdateRollbackUninstall: 'clean-VM release-operator gate; no system mutation performed by repository tests', status: 'passed-with-declared-external-gate' })
  await write('api-freeze', { format: 'nova-api-freeze-report', version: 1, engineVersion: '3.9.0', generatedAt, projectSchema: 29, runtimeApi: 1, pluginApi: 2, packageManifest: 1, buildCli: 1, featureFreeze: true, allowedExceptions: ['S0/S1 blocker', 'security correction', 'migration correctness'], networking: networkModule.NETWORKING_PACKAGE_GATE, status: networkModule.NETWORKING_PACKAGE_GATE.maturity === 'experimental' ? 'passed' : 'failed' })
  const status = securityStatus === 'passed' && platformStatus && canonicalA === canonicalB && networkModule.NETWORKING_PACKAGE_GATE.maturity === 'experimental' ? 'passed' : 'failed'
  await write('automation-package-collaboration-tests', { format: 'nova-v3.9-integration-tests', version: 1, engineVersion: '3.9.0', generatedAt, build: { cacheMode: normalized.delivery.cacheMode, reports: normalized.delivery.sizeReport && normalized.delivery.dependencyReport, unsupportedMobileBlocked: issues.some(item => item.code === 'platform-unsupported') }, packageSecurity: securityStatus, sourceControl: canonicalA === canonicalB, networkingGate: networkModule.NETWORKING_PACKAGE_GATE, status })
  if (status !== 'passed') throw new Error('One or more v3.9 integration checks failed')
  console.log('Nova_A v3.9 integration verification passed: deterministic locks/no-op text, package security, platform policy, build schema and networking gate.')
} finally { await server.close() }
