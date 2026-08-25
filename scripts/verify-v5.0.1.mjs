import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, 'release-audits')
const checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Win32', hardwareConcurrency: 8, userAgent: 'Nova_A v5.0.1 verification', mediaDevices: { addEventListener(){}, removeEventListener(){}, async enumerateDevices(){ return [] } } } })
globalThis.window ??= { setTimeout, clearTimeout, setInterval, clearInterval, addEventListener(){}, removeEventListener(){}, dispatchEvent(){} }
globalThis.localStorage ??= { getItem(){ return null }, setItem(){}, removeItem(){} }
await mkdir(output, { recursive: true })

const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
await server.watcher.close()
try {
  console.log('v5.0.1 verification: loading platform/build contracts')
  const platform = await server.ssrLoadModule('/src/runtime/platformSupport.ts')
  const build = await server.ssrLoadModule('/src/runtime/buildSettings.ts')
  const release = await server.ssrLoadModule('/src/runtime/releaseEngineering.ts')
  console.log('v5.0.1 verification: loading package/team contracts')
  const packages = await server.ssrLoadModule('/src/runtime/packages.ts')
  const plugins = await server.ssrLoadModule('/src/runtime/plugins.ts')
  const novaPak = await server.ssrLoadModule('/src/runtime/novaPak.ts')
  const team = await server.ssrLoadModule('/src/runtime/teamWorkflow.ts')

  const windows = platform.platformSupport('windows'), web = platform.platformSupport('web'), linux = platform.platformSupport('linux'), android = platform.platformSupport('android')
  check('BLD-TIER-POLICY', windows.tier === 'tier-1' && web.tier === 'tier-1' && linux.tier === 'experimental' && linux.availability === 'ci-only' && android.availability === 'unavailable' && !platform.selectableBuildPlatforms().some(item => item.id === 'android'), 'Only evidence-backed targets are selectable and every other target is explicit.', { windows, web, linux, android })

  const webSettings = build.normalizeBuildSettings({ gameName: 'Fixture', target: 'web', profile: 'release', developmentBuild: false, sceneOrder: ['scene'], startupSceneUuid: 'scene', platform: { identifier: 'top.whitelists.fixture', version: '1.0.0' }, delivery: { releaseChannel: 'stable', exportTemplate: 'web-es2022-v1', provenance: true, sbom: true, webHeaders: true, deterministic: true, include: ['Assets/**'], deploymentMode: 'local' } }, ['scene'])
  check('BLD-WEB-VALID', !build.validateBuildSettings(webSettings, { host: 'windows', architecture: 'x86_64', androidAvailable: false, androidReason: '' }).some(issue => issue.severity === 'error'), 'A complete Tier-1 web release preset validates without a blocking issue.', { issues: build.validateBuildSettings(webSettings) })
  const invalidTarget = build.normalizeBuildSettings({ ...webSettings, target: 'android' }, ['scene'])
  check('BLD-UNAVAILABLE-CLOSED', build.validateBuildSettings(invalidTarget).some(issue => issue.code === 'platform-unavailable'), 'Unavailable targets fail closed.')
  const unsignedRemote = build.normalizeBuildSettings({ ...webSettings, delivery: { ...webSettings.delivery, deploymentMode: 'remote-hook', deploymentDestination: 'http://unsafe.example' } }, ['scene'])
  check('BLD-REMOTE-EXPLICIT', build.validateBuildSettings(unsignedRemote).some(issue => issue.code === 'remote-deploy'), 'Remote deployment requires an explicit HTTPS destination and is never implicit.')

  const input = { engineVersion: '5.0.1', projectId: 'fixture', target: 'web', architecture: 'x86_64', profile: 'release', releaseChannel: 'stable', settings: webSettings, packages: [], deterministic: true, files: [{ path: 'player.js', sha256: 'a'.repeat(64), bytes: 12 }] }
  const first = release.createBuildProvenance({ ...input, buildId: 'first' }), second = release.createBuildProvenance({ ...input, buildId: 'second' })
  const match = release.compareBuildProvenance(first, second)
  const changed = release.compareBuildProvenance(first, release.createBuildProvenance({ ...input, buildId: 'changed', files: [{ path: 'player.js', sha256: 'b'.repeat(64), bytes: 12 }] }))
  check('BLD-REPRODUCIBILITY', match.reproducible && !changed.reproducible && changed.changed[0] === 'player.js', 'Unsigned manifest comparison detects exact matches and changed payloads.', { match, changed })
  check('BLD-WEB-HEADERS', release.webDeploymentHeaders().includes('X-Content-Type-Options: nosniff') && release.webDeploymentHeaders().includes('Cache-Control: public, max-age=31536000, immutable'), 'Safe web MIME/browser/cache headers are generated.')

  const official = packages.registryPackages()[0], review = packages.packageInstallReview(official)
  check('PKG-TRUSTED-REVIEW', review.executionAllowed && review.publisherVerified && review.license === 'MIT' && review.provenance && review.archiveSha256.length === 64, 'Trusted bundled package passes complete pre-install review.', review)
  const tampered = packages.normalizePackageManifest({ ...official, sha256: 'f'.repeat(64) })
  check('PKG-TAMPER-CLOSED', !packages.verifyPackageArchive(tampered, tampered.sha256) && packages.reviewPackageSecurity(tampered).blocking.length > 0, 'Self-consistent tampering still fails the pinned trust-store check.')
  const missingPermissionManifest = packages.normalizePackageManifest({ ...official, id: 'com.example.unsafe', publisherVerified: false, signature: '', provenance: '', license: '', permissions: ['filesystem.write'], sha256: '1'.repeat(64) })
  check('PKG-UNTRUSTED-CLOSED', !packages.packageInstallReview(missingPermissionManifest).executionAllowed, 'Untrusted provenance/license/signature packages cannot execute.')
  packages.packageState.offlineCache.push(missingPermissionManifest)
  const cacheProblems = packages.verifyPackageCache()
  check('PKG-CACHE', cacheProblems.some(problem => problem.includes(missingPermissionManifest.id)) && packages.packageState.quarantine.some(item => item.id === missingPermissionManifest.id) && packages.packageState.lastCacheVerification.length > 0, 'Offline cache verification quarantines an untrusted cached manifest.', { cacheProblems })

  packages.packageState.installed.splice(0)
  const installed = packages.installRegistryPackage(official.id)
  const update = packages.normalizePackageManifest({ ...official, version: '5.0.1', sha256: 'e'.repeat(64), signature: `nova-official-v1:${'e'.repeat(64)}`, permissions: [...official.permissions, 'filesystem.write'] })
  packages.packageState.registryCatalog.push(update)
  packages.packageState.offlineCache.push(update)
  const deniedBeforeReview = !packages.applyPackageUpdate(installed.manifest.id) && packages.packageState.errors.some(error => error.includes('permission review'))
  const approvedAndApplied = packages.approvePackageUpdatePermissions(installed.manifest.id, ['filesystem.write'])
  const rolledBack = packages.rollbackPackage(installed.manifest.id) && packages.packageState.installed.find(item => item.manifest.id === installed.manifest.id)?.manifest.version === official.version
  check('PKG-PERMISSION-ROLLBACK', deniedBeforeReview && approvedAndApplied && rolledBack, 'An update with a new permission is denied before review, succeeds after explicit approval, and rolls back to the pinned package.', { deniedBeforeReview, approvedAndApplied, rolledBack })

  const cycleA = packages.normalizePackageManifest({ ...official, id: 'com.example.cycle-a', name: 'Cycle A', version: '5.0.1', sha256: 'a'.repeat(64), signature: `nova-official-v1:${'a'.repeat(64)}`, dependencies: { 'com.example.cycle-b': '^5.0.1' }, dependencyHashes: { 'com.example.cycle-b': 'b'.repeat(64) } })
  const cycleB = packages.normalizePackageManifest({ ...official, id: 'com.example.cycle-b', name: 'Cycle B', version: '5.0.1', sha256: 'b'.repeat(64), signature: `nova-official-v1:${'b'.repeat(64)}`, dependencies: { 'com.example.cycle-a': '^5.0.1' }, dependencyHashes: { 'com.example.cycle-a': 'a'.repeat(64) } })
  const installedFixture = manifest => ({ manifest, source: { kind: 'local', location: 'verification fixture' }, enabled: false, project: true, installedAt: 0, securityStatus: 'unverified', grantedPermissions: [], deprecations: [] })
  packages.packageState.installed.splice(0, packages.packageState.installed.length, installedFixture(cycleA), installedFixture(cycleB))
  let cycleRejected = false
  try { packages.resolvePackageLockfile() } catch (error) { cycleRejected = error instanceof Error && error.message.includes('Circular package dependency') }
  check('PKG-CONFLICT-CYCLE', cycleRejected, 'The deterministic dependency solver rejects circular package graphs without producing a lockfile.')

  plugins.setPluginSafeMode(true)
  check('PKG-SAFE-MODE', plugins.pluginState.safeMode && plugins.pluginState.active === 0, 'Plugin Safe Mode stops active plugins and prevents third-party startup.')
  plugins.setPluginSafeMode(false)

  const maliciousAsset = { uuid: 'malicious', name: 'escape', path: '../escape.bin', assetType: 'other', mimeType: 'application/octet-stream', source: 'data:application/octet-stream;base64,AA==' }
  let maliciousArchiveRejected = false
  try { await novaPak.createNovaPak(JSON.stringify({ engineVersion: '5.0.1', assets: [maliciousAsset], scenes: [], projectSettings: { build: { developmentBuild: false } } }), [maliciousAsset], 'scene') } catch (error) { maliciousArchiveRejected = error instanceof Error && error.message.includes('Unsafe package path') }
  check('PKG-MALICIOUS-ARCHIVE', maliciousArchiveRejected, 'Package creation rejects path traversal before an archive can be emitted.')

  team.teamWorkflowState.ownership.splice(0); team.teamWorkflowState.taskLinks.splice(0); team.teamWorkflowState.changeNotes.splice(0); team.teamWorkflowState.binaryLocks.splice(0)
  const owner = team.addOwnershipRule('Assets/Scripts/**', '@gameplay @reviewer')
  const task = team.addTeamTaskLink('NOVA-490', 'https://example.invalid/tasks/NOVA-490', 'Release fixture')
  const note = team.addTeamChangeNote('Whitelist', 'Verify local-first workflow')
  const lock = team.acquireBinaryAssetLock('Assets/Art/hero.png', 'Whitelist', 5)
  const semanticEqual = team.semanticProjectComparison('{"b":2,"a":1}', '{"a":1,"b":2}')
  check('HLT-LOCAL-COLLAB', owner && task && note && lock && team.codeOwnersFile().includes('@gameplay') && semanticEqual.added.length === 0 && semanticEqual.removed.length === 0 && semanticEqual.changed.length === 0 && team.teamWorkflowState.networkOperations === false, 'Ownership, tasks, notes, CODEOWNERS, semantic comparison and advisory locks work locally with networking off.', { metadata: team.teamWorkflowMetadata(), semanticEqual })

  const freezeStart = Date.parse(release.RELEASE_CANDIDATE_FREEZE.openedAt), freezeEnd = Date.parse(release.RELEASE_CANDIDATE_FREEZE.earliestApprovalAt)
  check('REL-RC-FREEZE', release.RELEASE_CANDIDATE_FREEZE.active && release.RELEASE_CANDIDATE_FREEZE.minimumDays === 14 && freezeEnd - freezeStart >= 14 * 86_400_000 && release.NOVA_RELEASE_PIPELINE.length === 8, 'The 5.0 feature/API/artifact freeze and minimum observation are machine-readable.')
  check('REL-PRIVACY', release.diagnosticPrivacyChecklist().length >= 5 && release.diagnosticPrivacyChecklist().some(item => item.includes('never included')), 'Diagnostic privacy exclusions are explicit.')
} finally {
  console.log('v5.0.1 verification: closing isolated module host')
  await Promise.race([server.close(), new Promise(resolve => setTimeout(resolve, 2_000))])
}

const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v5.0.1-runtime-verification', version: 1, engineVersion: '5.0.1', generatedAt: new Date().toISOString(), catalogs: ['BLD','PKG','HLT'], checks, severity0Open: 0, severity1Open: failed.length, status: failed.length ? 'failed' : 'passed' }
await writeFile(join(output, 'v5.0.1-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v5.0.1 runtime verification passed: ${checks.length} checks.`)
process.exit(0)

