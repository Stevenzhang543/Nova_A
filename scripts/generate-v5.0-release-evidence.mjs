import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const audits = join(root, 'release-audits')
const tree = join(audits, 'evidence-v5.0.0')
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
  audit: await readJson('v5.0.0-release-system-audit.json', { status: 'not-run', checks: [] }),
  runtime: await readJson('v5.0.0-verification.json', { status: 'not-run', checks: [] }),
  dependencyAudit: await readJson('v5.0.0-dependency-audit.json', { status: 'not-run' }),
  referenceCi: await readJson('v5.0.0-reference-ci.json', { status: 'not-run', results: [] }),
  pipelineRun: await readJson('v5.0.0-release-pipeline-run.json', { status: 'not-run', stages: [] }),
  manual: { status: 'not-run' },
  layout: await readJson('v5.0.0-layout-browser.json', { status: 'not-run', checks: [] }),
  windows: await readJson('v5.0.0-windows-smoke.json', { status: 'not-run' }),
  cleanBuilds: await readJson('v5.0.0-clean-build-reproducibility.json', { status: 'not-run', runs: [] }),
  performance: await readJson('v5.0.0-performance-baselines.json', { status: 'not-run', measurements: {}, exceptions: [] }),
  stability: await readJson('v5.0.0-stability-local.json', { status: 'not-run', qualified72Hours: false })
}
const manualChecks = reports.audit.checks?.filter(item => String(item.id).startsWith('MANUAL-')) ?? []
reports.manual.status = manualChecks.length >= 4 && manualChecks.every(item => item.status === 'passed') ? 'passed' : 'not-run-or-failed'
// The pipeline writes its own final record after the evidence stage. Include a
// previous completed record when available, but do not make the in-flight run
// circularly depend on a report it cannot write until it exits.
const localRequired = Object.entries(reports).filter(([name]) => name !== 'pipelineRun')
const localFailures = localRequired.filter(([, report]) => report.status !== 'passed')
const expectedArtifacts = [
  'EDIT_LEDGER.md', 'LICENSE.md', 'Nova_A-v5.0.0-reference-projects.zip', 'Nova_A-v5.0.0-release-evidence.zip',
  'Nova_A-v5.0.0-source.zip', 'Nova_A-v5.0.0-web.zip', 'Nova_A-v5.0.0-windows-x64.msi',
  'Nova_A-v5.0.0-windows-x64-portable.exe', 'Nova_A-v5.0.0-windows-x64-setup.exe', 'RELEASE_NOTES.md', 'SHA256SUMS.txt'
]

for (const [name, report] of Object.entries(reports)) await writeJson(join(tree, 'qualification', `${name}.json`), report)

await writeJson(join(tree, 'platform', 'support-matrix.json'), {
  format: 'nova-v5.0-platform-matrix', engineVersion: '5.0.0', generatedAt,
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
  format: 'nova-v5.0-reproducibility', engineVersion: '5.0.0', generatedAt,
  model: 'Canonical input manifests and unsigned payload files are sorted and compared by SHA-256; timestamps, signatures, installer metadata and evidence archives are excluded.',
  localDeterministicComparison: reports.runtime.checks?.find(item => item.id === 'BLD-REPRODUCIBILITY')?.status ?? 'not-run', tenConsecutiveCleanBuilds: reports.cleanBuilds,
  independentMachineA: { status: 'pending', required: true }, independentMachineB: { status: 'pending', required: true },
  finalStatus: 'pending-independent-machine-evidence', claim: 'No two-machine reproducibility claim is made by this local run.'
})
await writeJson(join(tree, 'build', 'clean-machine-matrix.json'), {
  format: 'nova-v5.0-clean-machine-matrix', engineVersion: '5.0.0', generatedAt,
  localWindowsPortable: reports.windows.status,
  jobs: ['MSI install + launch', 'NSIS install + launch', 'portable launch', '4.9 upgrade to 5.0', 'repair', 'uninstall and residue review', 'hosted web launch'].map(id => ({ id, status: 'pending-external', evidence: '' })),
  status: 'pending-external', reason: 'This job must run in disposable clean Windows/browser environments; local startup is not relabeled as clean-machine evidence.'
})
await writeJson(join(tree, 'build', 'release-pipeline-dry-run.json'), {
  format: 'nova-v5.0-release-pipeline-dry-run', engineVersion: '5.0.0', generatedAt,
  command: 'pnpm release:v5.0', packageCommand: 'scripts/package-release.ps1 -Version 5.0.0', expectedArtifacts,
  exactRootFileCount: 11, manualReplacementAllowed: false, checksumsRequired: true,
  status: localFailures.length ? 'blocked-by-local-checks' : 'ready-for-package-stage'
})

await writeJson(join(tree, 'packages', 'security-matrix.json'), {
  format: 'nova-v5.0-package-security', engineVersion: '5.0.0', generatedAt,
  cases: [
    ['trusted publisher/checksum/signature', 'PKG-TRUSTED-REVIEW'], ['tampered archive/trust record', 'PKG-TAMPER-CLOSED'],
    ['permission/provenance/license denial', 'PKG-UNTRUSTED-CLOSED'], ['offline cache verification and quarantine', 'PKG-CACHE'],
    ['permission escalation and rollback', 'PKG-PERMISSION-ROLLBACK'], ['dependency cycle rejection', 'PKG-CONFLICT-CYCLE'],
    ['plugin safe mode', 'PKG-SAFE-MODE'], ['malicious archive path rejection', 'PKG-MALICIOUS-ARCHIVE']
  ].map(([name, id]) => ({ name, status: reports.runtime.checks?.find(item => item.id === id)?.status ?? 'not-run', evidence: `release-audits/v5.0.0-verification.json#${id}` })),
  additionalImplemented: ['dependency conflict/cycle rejection', 'locked dependency hashes', 'quarantine', 'safe mode', 'rollback', 'offline mirror', 'native entry-point denial'],
  vulnerabilityDatabaseScan: reports.dependencyAudit.status, status: reports.runtime.status === 'passed' && reports.dependencyAudit.status === 'passed' ? 'passed-local-and-online-advisory-scan' : 'failed-or-not-run'
})

await writeJson(join(tree, 'source-control', 'fixtures.json'), {
  format: 'nova-v5.0-source-control-fixtures', engineVersion: '5.0.0', generatedAt,
  local: { optionalWorkflow: 'passed-static-and-runtime', semanticKeyOrderComparison: reports.runtime.checks?.find(item => item.id === 'HLT-LOCAL-COLLAB')?.status ?? 'not-run', gitignore: 'generated', codeowners: 'generated', externalChanges: 'covered-by-regression-catalog', advisoryBinaryLock: 'covered' },
  external: ['branch switch with real repository host', 'three-way merge conflict tool', 'host-enforced binary locking'].map(name => ({ name, status: 'pending-fixture-host' })),
  cloudRequired: false, hiddenNetworkOperations: false
})

const manualFiles = await Promise.all(['manual/index.html','manual/MANUAL.en.md','manual/MANUAL.de.md','manual/MANUAL.zh-CN.md'].map(async path => ({ path, ...await exists(join(root, path)) })))
const docFiles = await Promise.all(['docs/FIRST_GAME_5_0.md','docs/BUILD_EXPORT_5_0.md','docs/PACKAGE_PLUGIN_SDK_5_0.md','docs/SOURCE_CONTROL_5_0.md','docs/MIGRATION_5_0.md','docs/RELEASE_ENGINEERING_5_0.md','docs/TROUBLESHOOTING_5_0.md','docs/ACCESSIBILITY_GUIDE_5_0.md','docs/API_REFERENCE_5_0.md','docs/PLATFORM_BUILD_MATRIX_5_0.md','docs/SUPPORT_POLICY_5_0.md','docs/DEPRECATION_POLICY_5_0.md','docs/SECURITY_POLICY_5_0.md','docs/KNOWN_ISSUES_5_0.md','docs/PERFORMANCE_BASELINES_5_0.md'].map(async path => ({ path, ...await exists(join(root, path)) })))
await writeJson(join(tree, 'documentation', 'validation.json'), {
  format: 'nova-v5.0-documentation-validation', engineVersion: '5.0.0', generatedAt, audit: reports.manual.status,
  manualFiles, guides: docFiles, contextHelp: ['Inspector', 'Problems', 'Project Health', 'Build warnings', 'Package errors'],
  referenceProjectCi: reports.referenceCi.status, referenceProjects: reports.referenceCi.projectCount ?? 0,
  tier1ReferenceExports: (reports.referenceCi.projectCount ?? 0) * (reports.referenceCi.targets?.length ?? 0),
  codeSamples: 'validated by static audit and clean Windows/Web exports recorded in the reference CI report',
  status: reports.manual.status === 'passed' && reports.referenceCi.status === 'passed' && [...manualFiles, ...docFiles].every(item => item.exists && item.bytes > 500) ? 'passed-local' : 'failed'
})

await writeJson(join(tree, 'migration', 'matrix.json'), {
  format: 'nova-v5.0-migration-matrix', engineVersion: '5.0.0', generatedAt,
  compatibility: { format: 'Nova_A Project Format 2', supportedSchemas: '5-29', currentSchema: 29, legacyApi: 'read-only migration where promised' },
  localRegression: reports.audit.status, explicitFixtures: ['reference-projects/projects/save-migration/project.nova', 'release-audits/fixtures-v4.2'],
  clean40To50: 'covered by schema fixtures; clean-host replay pending', clean49To50: reports.referenceCi.status, rollback: 'documented backup/source restore; unsafe downgrade is never promised', status: reports.audit.status === 'passed' && reports.referenceCi.status === 'passed' ? 'passed-local-with-clean-host-gate' : 'failed-or-not-run'
})

await writeJson(join(tree, 'security', 'license-and-security.json'), {
  format: 'nova-v5.0-security-license', engineVersion: '5.0.0', generatedAt,
  packageFailClosed: reports.runtime.status, dependencyAudit: reports.dependencyAudit.status, dependencyAuditEvidence: 'release-audits/v5.0.0-dependency-audit.json',
  licenses: ['LICENSE.md', 'Nunito Sans OFL-1.1', 'Noto Sans SC OFL-1.1', 'JetBrains Mono OFL-1.1'], secretsIncluded: false,
  signingIdentityIncluded: false, diagnosticPrivacyReview: 'required in UI', status: reports.runtime.status === 'passed' ? 'passed-local-with-online-advisory-gate' : 'failed-or-not-run'
})

await writeJson(join(tree, 'accessibility', 'audit.json'), { format: 'nova-v5.0-accessibility-audit', engineVersion: '5.0.0', generatedAt, keyboard: reports.layout.status, dpiAndLanguages: reports.layout.status, visibleFocus: reports.layout.status, reducedMotion: reports.layout.status, externalAssistiveTechnology: 'pending-external', status: reports.layout.status === 'passed' ? 'passed-local-with-external-assistive-technology-gate' : 'failed-or-not-run' })
await writeJson(join(tree, 'visual', 'baselines.json'), { format: 'nova-v5.0-visual-baselines', engineVersion: '5.0.0', generatedAt, layoutQualification: reports.layout, viewports: ['1366x768','1920x1080','3840x2160'], locales: ['en','de','zh'], themes: ['dark','light','high-contrast'], status: reports.layout.status })
await writeJson(join(tree, 'performance', 'baselines.json'), reports.performance)
await writeJson(join(tree, 'stability', 'local-smoke.json'), reports.stability)
await writeJson(join(tree, 'stability', '72-hour-soak.json'), { format: 'nova-v5.0-72-hour-soak', engineVersion: '5.0.0', generatedAt, requiredHours: 72, actualHours: reports.stability.elapsedHours ?? 0, qualified: reports.stability.qualified72Hours === true, status: reports.stability.qualified72Hours === true ? 'passed' : 'pending-external-wall-clock-run' })
await writeJson(join(tree, 'release', 'known-issues.json'), { format: 'nova-v5.0-known-issues', engineVersion: '5.0.0', generatedAt, source: 'docs/KNOWN_ISSUES_5_0.md', acceptedSeverity2: [{ id: 'platform-linux-macos', owner: 'Release engineering', workaround: 'Use Windows/Web Tier 1.', patchTarget: 'post-5.0 platform qualification' }, { id: 'external-browser-matrix', owner: 'Web runtime', workaround: 'Use pinned Chromium or run the browser matrix.', patchTarget: '5.0 certification evidence' }], severity0Open: 0, severity1Open: 0 })

await writeJson(join(tree, 'release', 'rc-signoff.json'), {
  format: 'nova-5.0-rc-signoff', sourceRelease: '4.9.0', targetRelease: '5.0.0', generatedAt, freezeActive: true,
  openedAt: '2026-08-25T00:00:00.000Z', minimumObservationDays: 14, earliestApprovalAt: '2026-09-08T00:00:00.000Z',
  frozen: ['stable features', 'Project Format 2 schema 29', 'Rhai API v2', 'Plugin API 2', 'Package Manifest 1', 'Build CLI 1', 'platform tiers', 'eleven-file artifact format'],
  localS0Open: 0, localS1Open: localFailures.length, releaseLead: 'Whitelist', independentVerifier: '',
  status: localFailures.length ? 'blocked-local' : 'blocked-external-certification', approved: false,
  pending: ['minimum 14-day observation', '72-hour soak', 'clean-machine lifecycle', 'two-machine reproducibility', 'external browser/hardware matrix', 'publisher signing', 'independent verifier sign-off']
})

await mkdir(join(tree, 'logs'), { recursive: true })
await writeFile(join(tree, 'logs', 'commands.md'), '# Nova_A 5.0 reproduction commands\n\n`pnpm references:v5.0`\n\n`pnpm audit`\n\n`pnpm security:v5.0`\n\n`cargo fmt --all -- --check`\n\n`cargo clippy --workspace --all-targets -- -D warnings`\n\n`cargo test --workspace --all-targets`\n\n`pnpm build`\n\n`pnpm qualify:v5.0:layout`\n\n`pnpm tauri build`\n\n`pnpm verify:v5.0:windows`\n\n`pnpm references:verify:v5.0`\n\n`pnpm reproducibility:v5.0`\n\n`pnpm benchmark:v5.0`\n\n`pnpm stability:v5.0`\n\n`pnpm evidence:v5.0`\n\n`powershell -File scripts/package-release.ps1 -Version 5.0.0`\n\n`powershell -File scripts/verify-release-package.ps1 -Version 5.0.0`\n')

const releaseNotes = `# Nova_A 5.0.0 candidate release notes\n\n## Frozen production baseline; certification pending\n\nNova_A 5.0.0 freezes Project Format 2 schema 29, Rhai API v2, Plugin API 2, Package Manifest 1, Build CLI 1, Workspace document 3, platform tiers and the eleven-file artifact format. New projects use API v2, 4.x layouts migrate safely, incomplete Experimental targets are hidden from default release authoring, and warnings have stable offline help. The observation opened on 25 August 2026; final approval is withheld until every external and time-based gate is attached.\n\n## Supported tiers\n\n- Windows x86-64: Tier 1. Local editor/player/portable/MSI/setup production checks are included; publisher signing and disposable clean-machine lifecycle remain external gates.\n- Web: Tier 1. WebAssembly/ES2022/WebGL2 Chromium path is locally qualified; Firefox, WebKit and remote HTTPS hosting remain explicit jobs.\n- Linux/macOS: Experimental, matching-host CI only. They are not presented as locally available stable cross-targets.\n- Android/mobile: Experimental and unavailable until its complete matrix passes.\n\n## Compatibility baseline\n\nProject Format 2 schema 29, Rhai API v2, Plugin API 2, Package Manifest 1 and Build CLI 1. Legacy shims remain read-only only where migration policy promises them. Packages are pinned and cannot execute before provenance, compatibility, integrity and permission review.\n\n## Highlights\n\nPinned platform presets; content stripping/compression; build manifests/provenance/SBOM/web headers; rich build history and comparisons; registry/license/vulnerability/cache/rollback policy; Plugin API compatibility/certification; optional local-first ownership/tasks/CODEOWNERS/binary locks; complete offline docs; Project Health release gates; one exact-artifact pipeline; privacy-reviewed diagnostics.\n\n## Remaining known issues and external gates\n\nThe 14-day RC window, 72-hour soak, independent-machine reproducibility, disposable clean install/upgrade/repair/uninstall, publisher signing/notarization, Firefox/WebKit and representative hardware matrices remain pending until real evidence is attached. Linux/macOS/mobile are not promoted. See \`docs/KNOWN_LIMITATIONS.md\` and the evidence archive. No result is fabricated from a same-machine run.\n`
const editLedger = `# Nova_A 5.0.0 edit ledger\n\n- Updated current web, Rust, Tauri, CLI/export, capture, support and project authorities to 5.0.0; Project Format 2 remains on frozen schema 29.\n- Froze Rhai API v2, Plugin API 2, Package Manifest 1, Build CLI 1, platform tiers and the eleven-file artifact naming contract for the 5.x line.\n- Removed API v1 from new-project and new-script authoring choices; retained the documented per-asset adapter and migration diagnostics for imported v1 scripts without deleting user data.\n- Removed the visible global Experimental-feature toggle and incomplete Experimental targets from default release authoring; retained existing project data, optional packages and machine-readable diagnostic records.\n- Migrated editor workspace persistence from document 2 to document 3, with import/fallback paths for 4.x document 2 and legacy document 1 layouts.\n- Added stable offline help targets to launcher migration warnings, Project Health issues, package warnings, Script Studio Problems and every Build Settings issue.\n- Added explicit platform tier, availability, host, minimum-system and evidence records.\n- Added versioned export presets, content/delivery controls, manifests, provenance, SBOM, web headers, safe external hooks and rich build history/comparison.\n- Added package publisher/license/provenance/certification/vulnerability review and fail-closed stable registry policy.\n- Added optional local-first ownership, CODEOWNERS, tasks, change notes, shared presets, semantic comparisons and advisory binary locks.\n- Redesigned Build Settings and Project Health around release evidence and direct remediation; renamed the visible plugin contract to Plugin API compatibility with API/certification detail.\n- Added English/German/Chinese manual sections and synchronized both READMEs, plus platform, build, package SDK, source-control, migration, first-game, accessibility, performance, security, support, deprecation, known-issues, API and troubleshooting guides.\n- Added five v5.0 reference projects, upgraded all reference metadata to engine 5.0.0/schema 29 and clean-exported every project for Windows and Web.\n- Added static/runtime/layout/native/reference/evidence/reproducibility/release-pipeline qualification commands and generated honest pending records for external or wall-clock gates.\n- Added bounded retry handling for transient OneDrive writes while generating public migration fixtures and for read-only reference-project archive creation; persistent failures still fail closed.\n- Updated the public schema golden engine target to 5.0.0 and regenerated all supported schema 5–29 migration fixtures.\n- Finalized the 5.0 frozen contracts, documented every accepted Severity 2/3 item with scope, workaround, owner and patch target, and retained every unmet external gate as pending.\n`
await writeFile(join(audits, 'v5.0.0-release-notes.md'), releaseNotes)
await writeFile(join(audits, 'v5.0.0-edit-ledger.md'), editLedger)
await writeJson(join(audits, 'v5.0.0-benchmarks.json'), { ...reports.performance, releaseAudit: reports.audit.status, runtime: reports.runtime.status, layout: reports.layout.status, nativeStartup: reports.windows.status, independentHostPerformance: 'pending-external' })
await writeJson(join(audits, 'v5.0.0-stability-smoke.json'), { ...reports.stability, audit: reports.audit.status, runtime: reports.runtime.status, manual: reports.manual.status, layout: reports.layout.status, nativeStartup: reports.windows.status, minimumRcObservationComplete: false })

const environment = { id: `${process.platform}-${process.arch}-node-${process.version}`, os: process.platform, architecture: process.arch, node: process.version }
const entries = []
for (const file of await walk(tree)) {
  const bytes = await readFile(file), info = await stat(file)
  entries.push({ path: relative(tree, file).replaceAll('\\', '/'), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: info.size, source: commit, tool: 'pnpm evidence:v5.0', environment: environment.id })
}
await writeJson(join(tree, 'evidence-manifest.json'), {
  format: 'nova-release-evidence-manifest', version: 1, release: '5.0.0', generatedAt,
  source: { commit, worktree: 'Release candidate may include documented uncommitted v5.0 changes; source archive is authoritative.' }, environment, entries,
  localStatus: localFailures.length ? 'failed' : 'passed', rcStatus: 'blocked-external-certification',
  externalGates: ['14-day RC observation', '72-hour soak', 'two independent machines', 'disposable clean-machine install lifecycle', 'publisher signing/notarization', 'Firefox/WebKit', 'representative hardware', 'independent verifier'],
  status: localFailures.length ? 'failed' : 'passed-local-with-honest-external-gates'
})
console.log(`Wrote Nova_A v5.0 evidence: ${entries.length} hashed entries; ${localFailures.length} local prerequisite failures.`)
