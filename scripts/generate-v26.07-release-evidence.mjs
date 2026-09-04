import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { arch, platform, versions } from 'node:process'
import { copyFile, cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const release = '26.07', machineVersion = '26.7.0'
const root = dirname(dirname(fileURLToPath(import.meta.url))), audits = join(root, 'release-audits'), evidence = join(audits, `evidence-v${release}`), generatedAt = new Date().toISOString()
const sha256 = value => createHash('sha256').update(value).digest('hex')
const readJson = async name => JSON.parse(await readFile(join(audits, name), 'utf8'))
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)

await mkdir(audits, { recursive: true })
await copyFile(join(root, 'docs/RELEASE_NOTES_26_07.md'), join(audits, 'v26.07-release-notes.md'))
await writeFile(join(audits, 'v26.07-edit-ledger.md'), editLedger())
await rm(evidence, { recursive: true, force: true })
for (const folder of ['runtime','layout','build','manual','documentation','performance','external']) await mkdir(join(evidence, folder), { recursive: true })

const reports = {
  product: await readJson('v26.07-product-audit.json'), verification: await readJson('v26.07-verification.json'), network: await readJson('v26.07-network-verification.json'),
  processes: await readJson('v26.07-process-regression.json'),
  interactions: await readJson('v26.07-user-interactions.json'), history: await readJson('v26.07-history-verification.json'), headless: await readJson('v26.07-headless-smoke.json'),
  layout: await readJson('v26.07-layout-browser.json'), layoutContract: await readJson('v26.07-layout-contract.json'), templates: await readJson('template-catalog-verification.json'),
  security: await readJson('v26.07-dependency-audit.json'), windows: await readJson('v26.07-windows-smoke.json'), performance: await readJson('v26.07-benchmarks.json'), stability: await readJson('v26.07-stability-smoke.json')
}
const reportSpecifications = {
  product: { format: 'nova-v26.07-product-audit', releaseField: 'release' }, verification: { format: 'nova-v26.07-verification', releaseField: 'release' },
  network: { format: 'nova-v26.07-network-verification', releaseField: 'release' }, interactions: { format: 'nova-v26.07-user-interactions', releaseField: 'release' },
  processes: { format: 'nova-v26.07-process-regression', releaseField: 'release' },
  history: { format: 'nova-v26.07-history-verification', releaseField: 'releaseLabel' }, headless: { format: 'nova-v26.07-headless-authority-verification', releaseField: 'release' },
  layout: { format: 'nova-v26.07-layout-qualification', releaseField: 'release' }, layoutContract: { format: 'nova-v26.07-layout-contract', releaseField: 'release' },
  templates: { format: 'nova-template-catalog-verification', releaseField: 'release' }, security: { format: 'nova-v26.7.0-dependency-lock-audit' },
  windows: { format: 'nova-v26.7.0-windows-game-smoke' }, performance: { format: 'nova-benchmark-report' }, stability: { format: 'nova-stability-report' }
}
// Qualification reports must postdate the product/docs and the verifier that
// produced them. Evidence/audit/package orchestrators are intentionally not
// inputs here: changing their sealing logic cannot invalidate a completed
// runtime, browser, native, or process qualification.
const qualificationInputs = [
  'package.json','Cargo.toml','README.md','README.zh-CN.md','src-tauri/tauri.conf.json','src-tauri/src/lib.rs','src/PlayerApp.vue','src/components/NetworkStudioPanel.vue','src/components/EditorBottomPanel.vue','src/i18n.ts','src/assets/main.css',
  'src/runtime/networkInput.ts','src/runtime/networkProduction.ts','src/runtime/networkProtocol.ts','src/runtime/networkRollback.ts','src/runtime/networking.ts','src/runtime/networkReplay.ts','src/runtime/networkServices.ts','src/runtime/production.ts','src/runtime/productionRuntime.ts','src/runtime/productionValidation.ts','src/runtime/buildSettings.ts',
  'scripts/nova-export.mjs','scripts/nova-cli.mjs','scripts/generate-v6.0.0-teaching-manual.mjs','scripts/generate-v26.07-reference-projects.mjs','scripts/network-peer-v6.6.0.mjs','scripts/verify-v6.6.0-networking.mjs','scripts/verify-v26.07-process-regression.mjs','scripts/verify-v26.07-networking.mjs','scripts/verify-v26.07-headless.mjs','scripts/verify-v26.07-interactions.mjs','scripts/verify-v26.07-history.mjs','scripts/verify-v26.07-layout-contract.mjs','scripts/qualify-layout-v26.07.mjs','scripts/verify-v26.07-windows.mjs','scripts/verify-v26.07.mjs','scripts/audit-dependencies-v26.07.mjs',
  'manual/MANUAL.en.md','manual/MANUAL.de.md','manual/MANUAL.zh-CN.md','manual/index.html','docs/MULTIPLAYER_PRODUCTION_26_07.md','docs/UI_LAYOUT_AUDIT_26_07.md','docs/RELEASE_NOTES_26_07.md','reference-projects/README.md',
  'reference-projects/projects/multiplayer-v2607-coop-rollback/project.nova','reference-projects/projects/multiplayer-v2607-coop-rollback/README.md','reference-projects/projects/multiplayer-v2607-coop-rollback/expected-output.json','reference-projects/projects/multiplayer-v2607-coop-rollback/test-controls.json',
  'reference-projects/projects/multiplayer-v2607-headless-authority/project.nova','reference-projects/projects/multiplayer-v2607-headless-authority/README.md','reference-projects/projects/multiplayer-v2607-headless-authority/expected-output.json','reference-projects/projects/multiplayer-v2607-headless-authority/test-controls.json'
]
const latestQualificationInputAt = Math.max(...await Promise.all(qualificationInputs.map(path => stat(join(root, path)).then(value => value.mtimeMs))))
const authorityIssues = Object.entries(reports).flatMap(([name, report]) => {
  const issues = [], specification = reportSpecifications[name]
  if (report.status !== 'passed') issues.push(`${name}: status=${String(report.status)}`)
  if (!specification || report.format !== specification.format || report.version !== (name === 'templates' ? 3 : 1)) issues.push(`${name}: format/version=${String(report.format)}/${String(report.version)}`)
  if (report.engineVersion !== machineVersion) issues.push(`${name}: engineVersion=${String(report.engineVersion)}`)
  if (specification?.releaseField && report[specification.releaseField] !== release) issues.push(`${name}: ${specification.releaseField}=${String(report[specification.releaseField])}`)
  if (!Number.isFinite(Date.parse(report.generatedAt)) || Date.parse(report.generatedAt) > Date.now() + 300_000) issues.push(`${name}: generatedAt=${String(report.generatedAt)}`)
  else if (Date.parse(report.generatedAt) + 1_000 < latestQualificationInputAt) issues.push(`${name}: report predates the final 26.07 implementation/support inputs`)
  if (Number(report.severity0Open ?? 0) !== 0 || Number(report.severity1Open ?? 0) !== 0) issues.push(`${name}: open severity 0/1 findings`)
  return issues
})
for (const [source, target] of [
  ['v26.07-product-audit.json','runtime/product-audit.json'], ['v26.07-verification.json','runtime/verification.json'], ['v26.07-network-verification.json','runtime/network-verification.json'],
  ['v26.07-process-regression.json','runtime/process-regression.json'],
  ['v26.07-user-interactions.json','runtime/user-interactions.json'], ['v26.07-history-verification.json','runtime/migration-history.json'], ['template-catalog-verification.json','runtime/template-catalog.json'],
  ['v26.07-headless-smoke.json','build/headless-authority.json'], ['v26.07-windows-smoke.json','build/windows-smoke.json'], ['v26.07-dependency-audit.json','runtime/dependency-audit.json'],
  ['v26.07-layout-browser.json','layout/layout-browser.json'], ['v26.07-layout-contract.json','layout/layout-contract.json'], ['v26.07-benchmarks.json','performance/benchmarks.json'], ['v26.07-stability-smoke.json','performance/stability-local.json']
]) await cp(join(audits, source), join(evidence, target))
for (const name of ['MANUAL.en.md','MANUAL.de.md','MANUAL.zh-CN.md','index.html']) await cp(join(root, 'manual', name), join(evidence, 'manual', name))
for (const name of ['VERSIONING_2026.md','FEATURE_INVENTORY_26_06.md','COMPETITIVE_REVIEW_26_01.md','ROADMAP_26_01_TO_26_10.md','MULTIPLAYER_PRODUCTION_26_07.md','UI_LAYOUT_AUDIT_26_07.md','RELEASE_NOTES_26_07.md','COMPATIBILITY.md','STABLE_CONTRACTS.md','KNOWN_LIMITATIONS.md']) await cp(join(root, 'docs', name), join(evidence, 'documentation', name))

const artifactInputs = [
  ['web-editor','dist/index.html'], ['web-player','dist/player.html'], ['windows-editor','src-tauri/target/release/nova_a.exe'],
  ['windows-nsis',`src-tauri/target/release/bundle/nsis/Nova_A_${machineVersion}_x64-setup.exe`], ['windows-msi',`src-tauri/target/release/bundle/msi/Nova_A_${machineVersion}_x64_en-US.msi`],
  ['windows-headless-authority','release-audits/headless-output-v26.07/Nova 26.07 Headless Authority.exe']
]
const artifacts = await Promise.all(artifactInputs.map(async ([name, path]) => { try { const bytes = await readFile(join(root, path)); return { name, path, bytes: bytes.length, sha256: sha256(bytes), status: 'passed' } } catch { return { name, path, status: 'missing' } } }))
const buildsPassed = artifacts.every(item => item.status === 'passed')
const artifactByName = new Map(artifacts.map(item => [item.name, item]))
for (const [reportName, localName] of [['editor','windows-editor'], ['msi','windows-msi'], ['setup','windows-nsis']]) {
  const qualified = reports.windows.artifacts?.filter(item => item?.name === reportName) ?? [], current = artifactByName.get(localName)
  if (qualified.length !== 1 || !current || current.status !== 'passed' || qualified[0].sha256 !== current.sha256 || Number(qualified[0].bytes) !== current.bytes) authorityIssues.push(`windows: ${reportName} artifact does not match the current local build`)
}
const currentHeadless = artifactByName.get('windows-headless-authority')
if (!currentHeadless || currentHeadless.status !== 'passed' || reports.headless.artifact?.sha256 !== currentHeadless.sha256 || Number(reports.headless.artifact?.bytes) !== currentHeadless.bytes) authorityIssues.push('headless: qualified artifact does not match the current exported authority')
await writeJson(join(evidence, 'build/local-builds.json'), { format: 'nova-local-build-evidence', version: 1, release, engineVersion: machineVersion, generatedAt, artifacts, status: buildsPassed ? 'passed' : 'incomplete' })

const externalGates = { publisherSigning: 'pending-external', cleanMachineLifecycle: 'pending-external', secondMachineReproducibility: 'pending-external', matchingHostLinuxMacos: 'pending-external', publicRelayNat: 'pending-external', encryptedPublicDeployment: 'pending-external', hostileNetworkReview: 'pending-external', independentUsabilityAccessibilitySecurity: 'pending-external', soak72Hours: 'pending-external' }
await writeJson(join(evidence, 'external/gates.json'), { format: 'nova-external-certification-gates', version: 1, release, generatedAt, gates: Object.entries(externalGates).map(([name, status]) => ({ name, status, claimed: false })) })

const commit = safeExec('git', ['-c', `safe.directory=${root.replaceAll('\\','/')}`, 'rev-parse', 'HEAD'])
const gitWorkingTree = safeExec('git', ['-c', `safe.directory=${root.replaceAll('\\','/')}`, 'status', '--porcelain'])
const sourceHasCommit = /^[a-f0-9]{40,64}$/.test(commit)
const sourceState = sourceHasCommit ? (gitWorkingTree && gitWorkingTree !== 'unavailable' ? 'git-working-tree' : 'git-commit') : 'filesystem-snapshot'
const sourceCommit = sourceHasCommit ? commit : 'unavailable-source-snapshot'
const environment = { id: `${platform}-${arch}-${versions.node}`, platform, architecture: arch, node: versions.node, rust: safeExec('rustc',['--version']), cargo: safeExec('cargo',['--version']) }
const localQualificationComplete = authorityIssues.length === 0 && buildsPassed
const entries = await Promise.all((await filesUnder(evidence)).sort().filter(path => !path.endsWith('evidence-manifest.json')).map(async path => { const contents = await readFile(path); return { path: relative(evidence,path).replaceAll('\\','/'), sha256: sha256(contents), bytes: contents.length, source: sourceCommit, tool: 'generate-v26.07-release-evidence.mjs', environment: environment.id } }))
await writeJson(join(evidence, 'evidence-manifest.json'), { format: 'nova-release-evidence-manifest', version: 1, release, machineVersion, engineVersion: machineVersion, generatedAt, source: { commit: sourceCommit, state: sourceState, dirty: sourceState !== 'git-commit', note: sourceState === 'git-working-tree' ? 'Working-tree source snapshot, based on the recorded commit and including the packaged uncommitted changes; an exact signed tag remains external.' : sourceState === 'git-commit' ? 'Clean Git commit; an exact signed tag remains external.' : 'Filesystem source snapshot without an available Git commit; an exact signed tag remains external.' }, environment, localQualificationComplete, localReportAuthorities: { status: authorityIssues.length ? 'failed' : 'passed', issues: authorityIssues }, externalCertificationComplete: false, externalGates, entries })
if (!localQualificationComplete) {
  const detail = [...authorityIssues, ...artifacts.filter(item => item.status !== 'passed').map(item => `missing build artifact: ${item.path}`)]
  throw new Error(`The Nova_A ${release} local evidence tree is incomplete; release packaging is blocked. ${detail.join('; ')}`)
}
console.log(`Nova_A ${release} evidence generated with ${entries.length} hashed entries; external certification remains pending.`)

function safeExec(command, args) { try { return execFileSync(command,args,{ cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['ignore','pipe','ignore'] }).trim() } catch { return 'unavailable' } }
async function filesUnder(directory) { const files = []; for (const entry of await readdir(directory,{withFileTypes:true})) { const path = join(directory,entry.name); entry.isDirectory() ? files.push(...await filesUnder(path)) : files.push(path) } return files }
function editLedger() { return `# Nova_A 26.07 edit ledger

This ledger records the 26.07 multiplayer, service, replay, server-output, Network Studio, reference, audit and release-support work. No public feature, animation, format field, API, template, or historical compatibility path was removed.

## Files changed and added

### Runtime, protocol, replay, and services

- \`src/runtime/networkInput.ts\`: finite, bounded shared network input normalization and cloning.
- \`src/runtime/networkRollback.ts\`: deterministic replicated transform/rotation/velocity rollback replay.
- \`src/runtime/networking.ts\`: fixed-rate snapshots, immutable admitted role/source checks with explicit transport trust boundaries, bounded reliable ordering, authoritative state-delta reconciliation, cancellable impairment delivery and complete disconnect cleanup.
- \`src/runtime/networkReplay.ts\`: deterministic save identity, bounded normalization of recorded InputSnapshot documents, and fail-closed 5.8.0-through-current version-1 save compatibility with current schema/session; playback does not itself rerun physics or Rhai.
- \`src/runtime/networkServices.ts\`: reviewed, permission-gated identity/lobby/relay provider registry.
- \`src/runtime/production.ts\`, \`src/runtime/productionValidation.ts\`, \`src/runtime/buildSettings.ts\`, \`src/runtime/productionRuntime.ts\`, and \`src/PlayerApp.vue\`: additive networking settings, validation, lifecycle and server-runtime bindings.

### Native lifecycle, editor UI, and output security

- \`src-tauri/src/lib.rs\`: bounded native UDP permission checks; explicit logical-peer admit/forget lifecycle so malformed datagrams cannot exhaust peer capacity; declared-plus-granted client/listen, Protocol 2, and plaintext/encryption policy attestation; isolated 2/4/8 process status/stop support with actual endpoint/bind-address results; and fail-closed launch validation against an adjacent current format-v2 build report, exact executable record/hash/size, embedded project, runtime policy, host, and architecture.
- \`src/components/NetworkStudioPanel.vue\` and \`src/components/EditorBottomPanel.vue\`: task-based Network Studio, per-instance endpoint/bind-address display, editor-event Logs filter, player-Inspector launch, Stop control, diagnostics and contained responsive layout.
- \`scripts/nova-export.mjs\` and \`scripts/nova-cli.mjs\`: fail-closed server export policy, matching-host output, canonical asset containment, nested-player-payload rejection, and feature-gated web dynamic-import traversal that omits unavailable optional and Tauri-only chunks.
- \`src/i18n.ts\` and \`src/assets/main.css\`: localized Network Studio text and retained all-panel type/containment rules.

### Documentation and authored references

- \`docs/MULTIPLAYER_PRODUCTION_26_07.md\`, \`docs/UI_LAYOUT_AUDIT_26_07.md\`, and \`docs/RELEASE_NOTES_26_07.md\`: production behavior, honest boundaries, user layout matrix and release contract.
- \`scripts/generate-v26.07-reference-projects.mjs\`, \`reference-projects/projects/multiplayer-v2607-coop-rollback/*\`, \`reference-projects/projects/multiplayer-v2607-headless-authority/*\`, and \`reference-projects/README.md\`: bounded state-delta co-op rollback and renderer-disabled headless-authority fixtures.
- \`README.md\`, \`README.zh-CN.md\`, \`scripts/generate-v6.0.0-teaching-manual.mjs\`, and \`manual/*\`: current 26.07 entry points and generated English, German, Chinese, and browser teaching content.

### Verification, evidence, and exact release packaging

- \`scripts/verify-v26.07-networking.mjs\`, \`scripts/verify-v26.07-process-regression.mjs\`, \`scripts/verify-v26.07-headless.mjs\`, \`scripts/verify-v26.07.mjs\`, \`scripts/verify-v26.07-interactions.mjs\`, \`scripts/verify-v26.07-history.mjs\`, \`scripts/verify-v26.07-layout-contract.mjs\`, \`scripts/qualify-layout-v26.07.mjs\`, \`scripts/verify-v26.07-windows.mjs\`, \`scripts/audit-dependencies-v26.07.mjs\`, and \`scripts/audit-v26.07.mjs\`: behavior, current 2/4/8-process regression, compatibility, user, layout, native, dependency and product gates.
- \`scripts/generate-v26.07-release-evidence.mjs\`, \`scripts/package-release.ps1\`, \`scripts/verify-release-package.ps1\`, and \`package.json\`: current hashed evidence, honest external gates and exactly eleven root artifacts.
- \`release-audits/v26.07-*\`, \`release-audits/evidence-v26.07/*\`, and \`releases/v26.07/*\`: generated reports, evidence and release payloads after every prerequisite passes.

## Removed

- No user-visible feature, animation, template, public API, schema field, project data, or compatibility path was removed.
` }
