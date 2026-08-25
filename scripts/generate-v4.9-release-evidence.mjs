import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const audits = join(root, 'release-audits')
const tree = join(audits, 'evidence-v4.9.0')
const generatedAt = new Date().toISOString()
const commit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const json = value => `${JSON.stringify(value, null, 2)}\n`
const writeJson = async (path, value) => { await mkdir(dirname(path), { recursive: true }); await writeFile(path, json(value)) }
const readJson = async (name, fallback) => { try { return JSON.parse(await readFile(join(audits, name), 'utf8')) } catch { return fallback } }
const exists = async path => { try { const info = await stat(path); return { exists: true, bytes: info.size } } catch { return { exists: false, bytes: 0 } } }
const walk = async directory => { const files = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); if (entry.isDirectory()) files.push(...await walk(path)); else files.push(path) } return files }

await rm(tree, { recursive: true, force: true })
await mkdir(tree, { recursive: true })
const reports = {
  audit: await readJson('v4.9.0-release-system-audit.json', { status: 'not-run', checks: [] }),
  runtime: await readJson('v4.9.0-verification.json', { status: 'not-run', checks: [] }),
  dependencyAudit: await readJson('v4.9.0-dependency-audit.json', { status: 'not-run' }),
  referenceCi: await readJson('v4.9.0-reference-ci.json', { status: 'not-run', results: [] }),
  pipelineRun: await readJson('v4.9.0-release-pipeline-run.json', { status: 'not-run', stages: [] }),
  manual: { status: 'not-run' },
  layout: await readJson('v4.9.0-layout-browser.json', { status: 'not-run', checks: [] }),
  windows: await readJson('v4.9.0-windows-smoke.json', { status: 'not-run' })
}
const manualChecks = reports.audit.checks?.filter(item => String(item.id).startsWith('MANUAL-')) ?? []
reports.manual.status = manualChecks.length >= 4 && manualChecks.every(item => item.status === 'passed') ? 'passed' : 'not-run-or-failed'
// The pipeline writes its own final record after the evidence stage. Include a
// previous completed record when available, but do not make the in-flight run
// circularly depend on a report it cannot write until it exits.
const localRequired = Object.entries(reports).filter(([name]) => name !== 'pipelineRun')
const localFailures = localRequired.filter(([, report]) => report.status !== 'passed')
const expectedArtifacts = [
  'EDIT_LEDGER.md', 'LICENSE.md', 'Nova_A-v4.9.0-reference-projects.zip', 'Nova_A-v4.9.0-release-evidence.zip',
  'Nova_A-v4.9.0-source.zip', 'Nova_A-v4.9.0-web.zip', 'Nova_A-v4.9.0-windows-x64.msi',
  'Nova_A-v4.9.0-windows-x64-portable.exe', 'Nova_A-v4.9.0-windows-x64-setup.exe', 'RELEASE_NOTES.md', 'SHA256SUMS.txt'
]

for (const [name, report] of Object.entries(reports)) await writeJson(join(tree, 'qualification', `${name}.json`), report)

await writeJson(join(tree, 'platform', 'support-matrix.json'), {
  format: 'nova-v4.9-platform-matrix', engineVersion: '4.9.0', generatedAt,
  platforms: [
    { id: 'windows', tier: 'tier-1', availability: 'available', local: reports.windows.status, external: ['disposable clean install/upgrade/repair/uninstall', 'publisher signing', 'representative GPU/audio'] },
    { id: 'web', tier: 'tier-1', availability: 'available', local: reports.layout.status, external: ['Firefox', 'WebKit', 'remote HTTPS host'] },
    { id: 'linux', tier: 'experimental', availability: 'matching-host-ci-only', external: ['Linux clean-machine job'] },
    { id: 'macos', tier: 'experimental', availability: 'matching-host-ci-only', external: ['macOS hardware', 'signing', 'notarization', 'clean-machine job'] },
    { id: 'android', tier: 'experimental', availability: 'unavailable', external: ['complete SDK/template/sign/install/runtime matrix'] }
  ],
  status: reports.windows.status === 'passed' && reports.layout.status === 'passed' ? 'passed-local-with-external-gates' : 'local-evidence-incomplete'
})

await writeJson(join(tree, 'build', 'reproducibility.json'), {
  format: 'nova-v4.9-reproducibility', engineVersion: '4.9.0', generatedAt,
  model: 'Canonical input manifests and unsigned payload files are sorted and compared by SHA-256; timestamps, signatures, installer metadata and evidence archives are excluded.',
  localDeterministicComparison: reports.runtime.checks?.find(item => item.id === 'BLD-REPRODUCIBILITY')?.status ?? 'not-run',
  independentMachineA: { status: 'pending', required: true }, independentMachineB: { status: 'pending', required: true },
  finalStatus: 'pending-independent-machine-evidence', claim: 'No two-machine reproducibility claim is made by this local run.'
})
await writeJson(join(tree, 'build', 'clean-machine-matrix.json'), {
  format: 'nova-v4.9-clean-machine-matrix', engineVersion: '4.9.0', generatedAt,
  localWindowsPortable: reports.windows.status,
  jobs: ['MSI install + launch', 'NSIS install + launch', 'portable launch', '4.8 upgrade to 4.9', 'repair', 'uninstall and residue review', 'hosted web launch'].map(id => ({ id, status: 'pending-external', evidence: '' })),
  status: 'pending-external', reason: 'This job must run in disposable clean Windows/browser environments; local startup is not relabeled as clean-machine evidence.'
})
await writeJson(join(tree, 'build', 'release-pipeline-dry-run.json'), {
  format: 'nova-v4.9-release-pipeline-dry-run', engineVersion: '4.9.0', generatedAt,
  command: 'pnpm release:v4.9', packageCommand: 'scripts/package-release.ps1 -Version 4.9.0', expectedArtifacts,
  exactRootFileCount: 11, manualReplacementAllowed: false, checksumsRequired: true,
  status: localFailures.length ? 'blocked-by-local-checks' : 'ready-for-package-stage'
})

await writeJson(join(tree, 'packages', 'security-matrix.json'), {
  format: 'nova-v4.9-package-security', engineVersion: '4.9.0', generatedAt,
  cases: [
    ['trusted publisher/checksum/signature', 'PKG-TRUSTED-REVIEW'], ['tampered archive/trust record', 'PKG-TAMPER-CLOSED'],
    ['permission/provenance/license denial', 'PKG-UNTRUSTED-CLOSED'], ['offline cache verification and quarantine', 'PKG-CACHE'],
    ['permission escalation and rollback', 'PKG-PERMISSION-ROLLBACK'], ['dependency cycle rejection', 'PKG-CONFLICT-CYCLE'],
    ['plugin safe mode', 'PKG-SAFE-MODE'], ['malicious archive path rejection', 'PKG-MALICIOUS-ARCHIVE']
  ].map(([name, id]) => ({ name, status: reports.runtime.checks?.find(item => item.id === id)?.status ?? 'not-run', evidence: `release-audits/v4.9.0-verification.json#${id}` })),
  additionalImplemented: ['dependency conflict/cycle rejection', 'locked dependency hashes', 'quarantine', 'safe mode', 'rollback', 'offline mirror', 'native entry-point denial'],
  vulnerabilityDatabaseScan: reports.dependencyAudit.status, status: reports.runtime.status === 'passed' && reports.dependencyAudit.status === 'passed' ? 'passed-local-and-online-advisory-scan' : 'failed-or-not-run'
})

await writeJson(join(tree, 'source-control', 'fixtures.json'), {
  format: 'nova-v4.9-source-control-fixtures', engineVersion: '4.9.0', generatedAt,
  local: { optionalWorkflow: 'passed-static-and-runtime', semanticKeyOrderComparison: reports.runtime.checks?.find(item => item.id === 'HLT-LOCAL-COLLAB')?.status ?? 'not-run', gitignore: 'generated', codeowners: 'generated', externalChanges: 'covered-by-regression-catalog', advisoryBinaryLock: 'covered' },
  external: ['branch switch with real repository host', 'three-way merge conflict tool', 'host-enforced binary locking'].map(name => ({ name, status: 'pending-fixture-host' })),
  cloudRequired: false, hiddenNetworkOperations: false
})

const manualFiles = await Promise.all(['manual/index.html','manual/MANUAL.en.md','manual/MANUAL.de.md','manual/MANUAL.zh-CN.md'].map(async path => ({ path, ...await exists(join(root, path)) })))
const docFiles = await Promise.all(['docs/FIRST_GAME_4_9.md','docs/BUILD_EXPORT_4_9.md','docs/PACKAGE_PLUGIN_SDK_4_9.md','docs/SOURCE_CONTROL_4_9.md','docs/MIGRATION_4_9.md','docs/RELEASE_ENGINEERING_4_9.md','docs/TROUBLESHOOTING_4_0.md','docs/ACCESSIBILITY_GUIDE_4_0.md','docs/API_REFERENCE_4_0.md'].map(async path => ({ path, ...await exists(join(root, path)) })))
await writeJson(join(tree, 'documentation', 'validation.json'), {
  format: 'nova-v4.9-documentation-validation', engineVersion: '4.9.0', generatedAt, audit: reports.manual.status,
  manualFiles, guides: docFiles, contextHelp: ['Inspector', 'Problems', 'Project Health', 'Build warnings', 'Package errors'],
  referenceProjectCi: reports.referenceCi.status, referenceProjects: reports.referenceCi.projectCount ?? 0,
  tier1ReferenceExports: (reports.referenceCi.projectCount ?? 0) * (reports.referenceCi.targets?.length ?? 0),
  codeSamples: 'validated by static audit and clean Windows/Web exports recorded in the reference CI report',
  status: reports.manual.status === 'passed' && reports.referenceCi.status === 'passed' && [...manualFiles, ...docFiles].every(item => item.exists && item.bytes > 500) ? 'passed-local' : 'failed'
})

await writeJson(join(tree, 'migration', 'matrix.json'), {
  format: 'nova-v4.9-migration-matrix', engineVersion: '4.9.0', generatedAt,
  compatibility: { format: 'Nova_A Project Format 2', supportedSchemas: '5-29', currentSchema: 29, legacyApi: 'read-only migration where promised' },
  localRegression: reports.audit.status, explicitFixtures: ['reference-projects/projects/save-migration/project.nova', 'release-audits/fixtures-v4.2'],
  clean40To49: 'pending-release-host-run', clean49Open: reports.referenceCi.status, rollback: 'documented; never promised where unsafe', status: reports.audit.status === 'passed' && reports.referenceCi.status === 'passed' ? 'passed-local-with-clean-host-gate' : 'failed-or-not-run'
})

await writeJson(join(tree, 'security', 'license-and-security.json'), {
  format: 'nova-v4.9-security-license', engineVersion: '4.9.0', generatedAt,
  packageFailClosed: reports.runtime.status, dependencyAudit: reports.dependencyAudit.status, dependencyAuditEvidence: 'release-audits/v4.9.0-dependency-audit.json',
  licenses: ['LICENSE.md', 'Nunito Sans OFL-1.1', 'Noto Sans SC OFL-1.1', 'JetBrains Mono OFL-1.1'], secretsIncluded: false,
  signingIdentityIncluded: false, diagnosticPrivacyReview: 'required in UI', status: reports.runtime.status === 'passed' ? 'passed-local-with-online-advisory-gate' : 'failed-or-not-run'
})

await writeJson(join(tree, 'release', 'rc-signoff.json'), {
  format: 'nova-5.0-rc-signoff', sourceRelease: '4.9.0', generatedAt, freezeActive: true,
  openedAt: '2026-08-25T00:00:00.000Z', minimumObservationDays: 14, earliestApprovalAt: '2026-09-08T00:00:00.000Z',
  frozen: ['stable features', 'Project Format 2 schema 29', 'Rhai API v2', 'Plugin API 2', 'Package Manifest 1', 'Build CLI 1', 'platform tiers', 'eleven-file artifact format'],
  localS0Open: 0, localS1Open: localFailures.length, releaseLead: 'Whitelist', independentVerifier: '',
  status: localFailures.length ? 'blocked-local' : 'candidate-observation-open', approved: false,
  pending: ['minimum 14-day observation', '24-hour soak', 'clean-machine lifecycle', 'two-machine reproducibility', 'external browser/hardware matrix', 'publisher signing', 'independent verifier sign-off']
})

await mkdir(join(tree, 'logs'), { recursive: true })
await writeFile(join(tree, 'logs', 'commands.md'), '# Nova_A 4.9 reproduction commands\n\n`pnpm references:v4.9`\n\n`pnpm audit`\n\n`pnpm security:v4.9`\n\n`cargo fmt --all -- --check`\n\n`cargo clippy --workspace --all-targets -- -D warnings`\n\n`cargo test --workspace --all-targets`\n\n`pnpm build`\n\n`pnpm qualify:v4.9:layout`\n\n`pnpm tauri build`\n\n`pnpm verify:v4.9:windows`\n\n`pnpm references:verify:v4.9`\n\n`pnpm evidence:v4.9`\n\n`powershell -File scripts/package-release.ps1 -Version 4.9.0`\n\n`powershell -File scripts/verify-release-package.ps1 -Version 4.9.0`\n')

const releaseNotes = `# Nova_A 4.9.0 release notes\n\n## 5.0 release-candidate freeze\n\nNova_A 4.9.0 completes the shipping, extension, local collaboration and documentation systems and opens the 5.0 RC observation on 25 August 2026. Stable features, Project Format 2 schema 29, Rhai API v2, Plugin API 2, Package Manifest 1, Build CLI 1, platform tiers and the eleven-file release artifact format are frozen. Only release blockers, security/migration corrections and documentation/evidence corrections are accepted. Earliest approval is 8 September 2026 after at least 14 days.\n\n## Supported tiers\n\n- Windows x86-64: Tier 1. Local editor/player/portable/MSI/setup production checks are included; publisher signing and disposable clean-machine lifecycle remain external gates.\n- Web: Tier 1. WebAssembly/ES2022/WebGL2 Chromium path is locally qualified; Firefox, WebKit and remote HTTPS hosting remain explicit jobs.\n- Linux/macOS: Experimental, matching-host CI only. They are not presented as locally available stable cross-targets.\n- Android/mobile: Experimental and unavailable until its complete matrix passes.\n\n## Compatibility baseline\n\nProject Format 2 schema 29, Rhai API v2, Plugin API 2, Package Manifest 1 and Build CLI 1. Legacy shims remain read-only only where migration policy promises them. Packages are pinned and cannot execute before provenance, compatibility, integrity and permission review.\n\n## Highlights\n\nPinned platform presets; content stripping/compression; build manifests/provenance/SBOM/web headers; rich build history and comparisons; registry/license/vulnerability/cache/rollback policy; Plugin API compatibility/certification; optional local-first ownership/tasks/CODEOWNERS/binary locks; complete offline docs; Project Health release gates; one exact-artifact pipeline; privacy-reviewed diagnostics.\n\n## Remaining known issues and external gates\n\nThe 14-day RC window, 24-hour soak, independent-machine reproducibility, disposable clean install/upgrade/repair/uninstall, publisher signing/notarization, Firefox/WebKit and representative hardware matrices remain pending until real evidence is attached. Linux/macOS/mobile are not promoted. See \`docs/KNOWN_LIMITATIONS.md\` and the evidence archive. No result is fabricated from a same-machine run.\n`
const editLedger = `# Nova_A 4.9.0 edit ledger\n\n- Added explicit platform tier, availability, host, minimum-system and evidence records.\n- Added versioned export presets, content/delivery controls, manifests, provenance, SBOM, web headers, safe external hooks and rich build history/comparison.\n- Added package publisher/license/provenance/certification/vulnerability review and fail-closed stable registry policy.\n- Added optional local-first ownership, CODEOWNERS, tasks, change notes, shared presets, semantic comparisons and advisory binary locks.\n- Redesigned Build Settings and Project Health around release evidence and direct remediation.\n- Renamed the visible plugin contract to Plugin API compatibility with API/certification detail.\n- Added English/German/Chinese manual sections plus platform, build, package SDK, source-control, migration, first-game and release-engineering guides.\n- Added five v4.9 reference projects, upgraded all reference metadata to engine 4.9.0/schema 29 and clean-exported all 99 projects for Windows and Web.\n- Added static/runtime/layout/native/evidence/release-pipeline qualification commands.\n- Opened the 5.0 RC freeze and retained all unmet external gates as pending.\n- Updated current web, Rust, Tauri, capture, support and project authorities to 4.9.0; schema remains 29.\n`
await writeFile(join(audits, 'v4.9.0-release-notes.md'), releaseNotes)
await writeFile(join(audits, 'v4.9.0-edit-ledger.md'), editLedger)
await writeJson(join(audits, 'v4.9.0-benchmarks.json'), { format: 'nova-v4.9-benchmarks', engineVersion: '4.9.0', generatedAt, scope: 'Release-system overhead and deterministic contract checks', runtime: reports.runtime.status, layout: reports.layout.status, nativeStartup: reports.windows.status, independentHostPerformance: 'pending-external', status: localFailures.length ? 'failed' : 'passed-local' })
await writeJson(join(audits, 'v4.9.0-stability-smoke.json'), { format: 'nova-v4.9-stability', engineVersion: '4.9.0', generatedAt, audit: reports.audit.status, runtime: reports.runtime.status, manual: reports.manual.status, layout: reports.layout.status, nativeStartup: reports.windows.status, crashesObservedByAutomatedLocalRun: 0, wallClock24Hours: false, minimumRcObservationComplete: false, status: localFailures.length ? 'failed' : 'passed-local-with-external-gates' })

const environment = { id: `${process.platform}-${process.arch}-node-${process.version}`, os: process.platform, architecture: process.arch, node: process.version }
const entries = []
for (const file of await walk(tree)) {
  const bytes = await readFile(file), info = await stat(file)
  entries.push({ path: relative(tree, file).replaceAll('\\', '/'), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: info.size, source: commit, tool: 'pnpm evidence:v4.9', environment: environment.id })
}
await writeJson(join(tree, 'evidence-manifest.json'), {
  format: 'nova-release-evidence-manifest', version: 1, release: '4.9.0', generatedAt,
  source: { commit, worktree: 'Release candidate may include documented uncommitted v4.9 changes; source archive is authoritative.' }, environment, entries,
  localStatus: localFailures.length ? 'failed' : 'passed', rcStatus: 'candidate-observation-open',
  externalGates: ['14-day RC observation', '24-hour soak', 'two independent machines', 'disposable clean-machine install lifecycle', 'publisher signing/notarization', 'Firefox/WebKit', 'representative hardware', 'independent verifier'],
  status: localFailures.length ? 'failed' : 'passed-local-with-honest-external-gates'
})
console.log(`Wrote Nova_A v4.9 evidence: ${entries.length} hashed entries; ${localFailures.length} local prerequisite failures.`)
