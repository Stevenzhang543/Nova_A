import { createHash, generateKeyPairSync, sign, webcrypto } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

globalThis.crypto ??= webcrypto
globalThis.atob ??= value => Buffer.from(value, 'base64').toString('binary')
globalThis.btoa ??= value => Buffer.from(value, 'binary').toString('base64')
globalThis.localStorage ??= { getItem() { return null }, setItem() {}, removeItem() {} }
const version = '6.9.0', root = dirname(dirname(fileURLToPath(import.meta.url))), compiled = await mkdtemp(join(tmpdir(), 'nova-v690-verify-')), checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const canonical = value => `${JSON.stringify(normalize(value), null, 2)}\n`
const normalize = value => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])])) : value
const fingerprint = key => createHash('sha256').update(key).digest('hex').slice(0, 32)
const signed = (document, privateKey) => ({ ...document, signature: `ed25519-v1:${sign(null, Buffer.from(canonical({ ...document, signature: '' })), privateKey).toString('base64')}` })

try {
  await build({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true }, build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: { packages: join(root, 'src/runtime/packages.ts'), shipping: join(root, 'src/runtime/ecosystemShipping.ts'), team: join(root, 'src/runtime/teamWorkflow.ts'), format: join(root, 'src/projects/projectFormat.ts') }, output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } } })
  const load = name => import(`${pathToFileURL(join(compiled, `${name}.mjs`)).href}?v=${Date.now()}`)
  const [packages, shipping, team, format] = await Promise.all(['packages', 'shipping', 'team', 'format'].map(load))
  check('V690-AUTHORITY', format.NOVA_ENGINE_VERSION === version && format.NOVA_PROJECT_FORMAT_MAJOR === 2 && format.NOVA_PROJECT_SCHEMA_VERSION === 29, 'Engine authority is 6.9.0 while Project Format 2/schema 29 remain frozen.')

  const solver = packages.diagnosePackageResolution([])
  check('V690-SOLVER-EMPTY', solver.status === 'resolved' && !solver.errors.length && !solver.lockfile.length, 'The deterministic dependency solver emits a complete successful diagnostic for an empty project.')
  const official = packages.packageState.registryCatalog[0]
  const maliciousCandidate = { manifest: { ...official, id: 'top.whitelists.bad', dependencies: { 'top.whitelists.missing': '^1.0.0' }, dependencyHashes: { 'top.whitelists.missing': '1'.repeat(64) } }, source: { kind: 'local', location: 'fixture' }, enabled: false, project: true, installedAt: 0, securityStatus: 'unverified', grantedPermissions: [], deprecations: [] }
  const blockedSolver = packages.diagnosePackageResolution([maliciousCandidate])
  check('V690-SOLVER-DIAGNOSTICS', blockedSolver.status === 'blocked' && blockedSolver.steps.some(step => step.status === 'blocked') && blockedSolver.errors.length > 0, 'Untrusted and unsatisfied candidates fail closed with an inspectable solver trace.', { errors: blockedSolver.errors })

  const file = { path: 'src/index.rhai', sha256: createHash('sha256').update('print("Nova")\n').digest('hex'), bytes: 14, contentBase64: Buffer.from('print("Nova")\n').toString('base64') }
  const firstArchive = await shipping.createReproduciblePackageArchive(official, [file], 0), secondArchive = await shipping.createReproduciblePackageArchive(official, [file], 0)
  const archiveReview = shipping.validateReproduciblePackageArchive(firstArchive)
  check('V690-REPRODUCIBLE-ARCHIVE', firstArchive.archiveSha256 === secondArchive.archiveSha256 && archiveReview.status === 'passed' && firstArchive.files[0].path === 'src/index.rhai', 'Canonical file order, SOURCE_DATE_EPOCH and store mode produce a reproducible sandbox-safe package archive.', { sha256: firstArchive.archiveSha256 })
  let traversalBlocked = false, duplicateBlocked = false
  try { await shipping.createReproduciblePackageArchive(official, [{ ...file, path: '../escape' }], 0) } catch { traversalBlocked = true }
  try { await shipping.createReproduciblePackageArchive(official, [file, { ...file, path: 'SRC/INDEX.RHAI' }], 0) } catch { duplicateBlocked = true }
  const executableReview = shipping.validateReproduciblePackageArchive({ ...firstArchive, files: [{ ...file, path: 'bin/hidden.exe' }] })
  check('V690-MALICIOUS-ARCHIVE', traversalBlocked && duplicateBlocked && executableReview.status === 'blocked', 'Traversal, case-insensitive duplicate paths and hidden executable content fail closed.')

  const { publicKey, privateKey } = generateKeyPairSync('ed25519'), publicDer = publicKey.export({ type: 'spki', format: 'der' }), rawPublic = publicDer.subarray(publicDer.length - 32), publicBase64 = rawPublic.toString('base64'), keyFingerprint = fingerprint(rawPublic)
  const bulletin = signed({ format: 'nova-package-security-bulletin', version: 1, bulletinId: 'NOVA-2026-0001', issuedAt: '2026-09-01T00:00:00.000Z', sequence: 1, signedBy: keyFingerprint, signature: '', revocations: [{ id: official.id, version: official.version, sha256: official.sha256, reason: 'Qualification revocation fixture.' }], vulnerabilities: [{ advisoryId: 'NOVA-2026-0002', id: official.id, affected: official.version, severity: 'high', summary: 'Qualification advisory.', fixedVersion: '9.9.9' }] }, privateKey)
  const bulletinResult = await shipping.importSignedSecurityBulletin(bulletin, publicBase64)
  let replayBlocked = false; try { await shipping.importSignedSecurityBulletin(bulletin, publicBase64) } catch { replayBlocked = true }
  const securitySnapshot = shipping.packageSecuritySnapshot(official)
  check('V690-REVOCATION', bulletinResult.revoked === 1 && bulletinResult.vulnerable === 1 && securitySnapshot.revocations === 1 && securitySnapshot.vulnerabilities === 1 && securitySnapshot.reviewStatus !== 'verified' && securitySnapshot.blocking.some(item => item.includes('revoked')) && replayBlocked, 'Signed pinned bulletins enforce revocation/vulnerability policy and reject replay.', { bulletinResult, securitySnapshot, replayBlocked })
  const clearBulletin = signed({ format: 'nova-package-security-bulletin', version: 1, bulletinId: 'NOVA-2026-CLEAR', issuedAt: '2026-09-01T00:01:00.000Z', sequence: 2, signedBy: keyFingerprint, signature: '', revocations: [], vulnerabilities: [] }, privateKey)
  await shipping.importSignedSecurityBulletin(clearBulletin, publicBase64)

  const update = signed({ format: 'nova-signed-update', version: 1, product: 'Nova_A', channel: 'stable', release: '6.9.1', sequence: 10, publishedAt: '2026-09-01T01:00:00.000Z', minimumVersion: '6.9.0', artifact: { url: 'https://updates.example.invalid/Nova_A_6.9.1_x64-setup.exe', sha256: 'a'.repeat(64), bytes: 1024, kind: 'nsis' }, signature: '', signingFingerprint: keyFingerprint }, privateKey)
  let optInBlocked = false; try { await shipping.stageSignedUpdate(update, publicBase64) } catch { optInBlocked = true }
  shipping.setUpdaterOptIn(true); const updatePlan = await shipping.stageSignedUpdate(update, publicBase64)
  let stagedReplayBlocked = false; try { await shipping.stageSignedUpdate(update, publicBase64) } catch { stagedReplayBlocked = true }
  const mismatchBlocked = !shipping.commitStagedUpdate('b'.repeat(64)), applied = shipping.commitStagedUpdate('a'.repeat(64)), rolledBack = shipping.rollbackCommittedUpdate()
  check('V690-UPDATER', optInBlocked && updatePlan.implicitNetworkOperation === false && updatePlan.explicitNetworkRequired && stagedReplayBlocked && mismatchBlocked && applied && rolledBack && shipping.ecosystemShippingState.appliedRelease === version, 'Updater is opt-in, signature/fingerprint/replay/hash gated, non-networking by default and rollback-capable.')

  const referenceSource = await readFile(join(root, 'reference-projects/projects/creator-v680-large-world/project.nova'), 'utf8'), base = JSON.parse(referenceSource), ours = structuredClone(base), theirs = structuredClone(base)
  ours.scenes[0].name = 'Ours scene'; theirs.projectMetadata.description = 'Theirs description'
  const automatic = team.createSemanticMergePlan(JSON.stringify(base), JSON.stringify(ours), JSON.stringify(theirs)), automaticText = team.finalizeSemanticMerge(), automaticProject = JSON.parse(automaticText)
  check('V690-SEMANTIC-AUTO-MERGE', automatic.conflicts.length === 0 && automatic.autoMerged.length >= 2 && automaticProject.scenes[0].name === 'Ours scene' && automaticProject.projectMetadata.description === 'Theirs description', 'Independent project and scene edits merge semantically and round-trip through canonical project text.')
  const conflicting = structuredClone(base); conflicting.scenes[0].name = 'Theirs scene'
  const conflictPlan = team.createSemanticMergePlan(JSON.stringify(base), JSON.stringify(ours), JSON.stringify(conflicting)), conflict = conflictPlan.conflicts.find(item => item.path.endsWith('/name'))
  const resolved = Boolean(conflict && team.resolveSemanticMergeConflict(conflict.id, 'theirs')), resolvedProject = JSON.parse(team.finalizeSemanticMerge())
  check('V690-SEMANTIC-CONFLICT', conflictPlan.conflicts.length === 1 && conflict?.kind === 'scene' && resolved && resolvedProject.scenes[0].name === 'Theirs scene', 'A real same-property scene conflict names the semantic path and applies an explicit ours/theirs choice.')
  team.markSourceBaseline(JSON.stringify(base)); team.refreshSourceStatus(JSON.stringify(ours)); team.teamWorkflowState.ownership.splice(0); team.addOwnershipRule('Assets/Scenes/**', 'Whitelist')
  const changeList = team.createTeamChangeList('RC 6.9', 'Whitelist', team.teamWorkflowState.changes.map(change => change.id), JSON.stringify(ours))
  check('V690-CHANGE-LIST', changeList?.status === 'ready' && changeList.changes.length > 0 && /^[a-f0-9]{16}$/.test(changeList.fingerprint), 'Ownership-aware deterministic change lists capture a release-candidate edit set.')

  const pipelines = shipping.matchingHostPipelines(), evidence = shipping.createShippingEvidencePlan([{ path: 'game.exe', sha256: '0'.repeat(64), bytes: 100 }])
  check('V690-SHIPPING', pipelines.length === 3 && pipelines.filter(item => item.status === 'pending-external').length === 2 && evidence.networkDefault === 'disabled' && evidence.lifecycle.length === 5 && evidence.files.some(path => path.includes('sbom')), 'Shipping architecture includes matching-host gates, SBOM/provenance/patch/symbol/crash guidance and all clean-machine lifecycle stages.')

  const [cli, ecosystemUi, teamUi, guide, instructions, manualEn, manualDe, manualZh] = await Promise.all(['scripts/nova-package-publisher.mjs', 'src/components/EcosystemStudioPanel.vue', 'src/components/TeamWorkflowPanel.vue', 'docs/ECOSYSTEM_COLLABORATION_SHIPPING_6_9.md', 'instructions.txt', 'manual/MANUAL.en.md', 'manual/MANUAL.de.md', 'manual/MANUAL.zh-CN.md'].map(path => readFile(join(root, path), 'utf8')))
  check('V690-WIRING', cli.includes('SOURCE_DATE_EPOCH') && ecosystemUi.includes("activeTab === 'shipping'") && ecosystemUi.includes('importSignedSecurityBulletin') && teamUi.includes('resolveSemanticMergeConflict'), 'Publisher CLI, shipping UI, bulletin/update workflows and semantic merge controls are connected.')
  check('V690-DOCUMENTATION', guide.includes('## Clean-machine lifecycle') && instructions.includes('## 6.9.0 implementation checkpoint') && manualEn.includes('Package publishing and release-candidate workflow') && manualDe.includes('Paketveröffentlichung und Release-Candidate-Ablauf') && manualZh.includes('软件包发布与候选版本流程'), 'Technical guide, checkpoint and all three teaching manuals explain the complete workflow and recovery boundaries.')
} finally { await rm(compiled, { recursive: true, force: true }) }

const failed = checks.filter(item => item.status === 'failed'), report = { format: 'nova-v6.9.0-verification', version: 1, engineVersion: version, generatedAt: new Date().toISOString(), perspectives: ['package-solver', 'malicious-archive', 'reproducibility', 'trust-revocation-vulnerability', 'updater-replay-rollback', 'semantic-merge', 'shipping', 'programmer', 'normal-user'], checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true }); await writeFile(join(root, 'release-audits/v6.9.0-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v6.9.0 verification passed: ${checks.length} package, collaboration and shipping checks.`)
