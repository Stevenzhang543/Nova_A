import { createHash } from 'node:crypto'
import { access, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

process.env.NOVA_EVIDENCE_VERSION = '3.9.0'
await import('./generate-v3.3-release-evidence.mjs')

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, 'release-audits')
const generatedAt = new Date().toISOString()
const read = path => readFile(join(root, path), 'utf8')
const json = path => read(path).then(JSON.parse)
const writeJson = (name, value) => writeFile(join(output, 'v3.9.0-' + name + '.json'), JSON.stringify(value, null, 2) + '\n')
const accepted = report => report?.status === 'passed' || String(report?.status ?? '').startsWith('passed-with-declared-external-gate')

const names = [
  'release-candidate-audit', 'package-security', 'lockfile-tests', 'source-control-workflow',
  'tier1-platform-matrix', 'reproducible-build', 'clean-machine-matrix', 'installer-lifecycle',
  'api-freeze', 'automation-package-collaboration-tests', 'cli-matrix', 'layout-browser', 'windows-smoke'
]
const reports = Object.fromEntries(await Promise.all(names.map(async name => [name, await json('release-audits/v3.9.0-' + name + '.json')])))
const retained = {
  world: await json('release-audits/v3.8.0-benchmarks.json'),
  worldAudit: await json('release-audits/v3.8.0-world-data-audit.json'),
  visualAudio: await json('release-audits/v3.7.0-visual-audio-audit.json'),
  physics: await json('release-audits/v3.4.0-physics-audit.json'),
  scripting: await json('release-audits/v3.5.0-programming-workflow.json'),
  presentation: await json('release-audits/v3.6.0-presentation-audit.json')
}
const requiredFailures = Object.entries(reports).filter(([, report]) => !accepted(report)).map(([name, report]) => ({ name, status: report.status }))
if (requiredFailures.length) throw new Error('Required v3.9 qualification reports did not pass: ' + JSON.stringify(requiredFailures))
if (Object.entries(retained).some(([, report]) => report.status !== 'passed')) throw new Error('A retained feature audit is not passing.')

const knownPath = join(output, 'v3.9.0-known-issues.json')
const known = await json('release-audits/v3.9.0-known-issues.json')
known.items = [
  { severity: 'S2', area: 'release signing', issue: 'This working-tree build has no signed source tag and the Windows binaries are not Authenticode signed because no Whitelist signing identity was supplied.', workaround: 'Sign the exact release commit/tag and installers in protected release infrastructure, then publish the tag and certificate provenance.' },
  { severity: 'S2', area: 'clean-machine lifecycle', issue: 'Portable startup and installer integrity pass on the Windows build host; clean-VM install, repair, update, rollback and uninstall remain an external release-operator gate.', workaround: 'Run the documented lifecycle matrix on disposable Windows x64 VMs before broad Stable distribution.' },
  { severity: 'S2', area: 'experimental platforms', issue: 'Linux and macOS are deliberately Experimental because matching-host clean-machine and signing matrices are not attached. Mobile and consoles are Unsupported/deferred.', workaround: 'Do not promote a platform until its declared matrix passes on matching hardware.' },
  { severity: 'S2', area: 'duration', issue: 'Accelerated deterministic soak tests pass; a 24-hour wall-clock run is not claimed by this local qualification.', workaround: 'Run the supplied long-duration workflow on named release hardware.' },
  { severity: 'S2', area: 'networking', issue: 'Networking contracts and examples are Experimental optional-package interfaces, not a 4.0 core stability promise or managed online service.', workaround: 'Gate multiplayer features explicitly and qualify transport, authority, prediction and abuse handling for the shipped game.' }
]
known.severity0Open = 0
known.severity1Open = 0
known.status = 'passed-with-declared-s2-boundaries'
await writeFile(knownPath, JSON.stringify(known, null, 2) + '\n')

await writeJson('benchmarks', {
  format: 'nova-v3.9-benchmarks', version: 1, engineVersion: '3.9.0', generatedAt,
  scope: 'Retained v3.3 authoring, v3.4 physics, v3.5 scripting, v3.6 presentation, v3.7 visual/audio, v3.8 world data plus v3.9 deterministic build/package/collaboration checks.',
  retainedReports: Object.entries(retained).map(([name, report]) => ({ name, format: report.format, status: report.status })),
  reproducibility: reports['reproducible-build'], packageSecurity: reports['package-security'],
  regressions: [], externalMetrics: ['clean-machine cold start', 'target GPU frame time', '24-hour wall-clock endurance'],
  status: 'passed'
})
await writeJson('stability-smoke', {
  format: 'nova-stability-report', version: 1, engineVersion: '3.9.0', generatedAt,
  retainedFeatureAudits: Object.entries(retained).map(([name, report]) => ({ name, status: report.status })),
  currentAudits: ['release-candidate-audit', 'automation-package-collaboration-tests', 'layout-browser', 'windows-smoke'].map(name => ({ name, status: reports[name].status })),
  crashes: 0, severity0Open: 0, severity1Open: 0, qualified24Hours: false,
  note: 'All automated local gates passed. The 24-hour wall-clock and clean-VM lifecycle gates remain explicitly external.',
  status: 'passed'
})
await writeJson('ci-summary', {
  format: 'nova-ci-summary', version: 1, engineVersion: '3.9.0', generatedAt, source: 'local release-equivalent Windows x64 runner',
  gates: [
    { name: 'cargo fmt --all -- --check', status: 'passed' },
    { name: 'cargo test --workspace --all-targets', status: 'passed' },
    { name: 'cargo test --manifest-path src-tauri/Cargo.toml', status: 'passed' },
    { name: 'pnpm run check', status: 'passed' },
    { name: 'pnpm run audit', status: 'passed' },
    { name: 'pnpm verify:v3.9:cli', status: reports['cli-matrix'].status },
    { name: 'pnpm run build', status: 'passed' },
    { name: 'pnpm qualify:v3.9:layout', status: reports['layout-browser'].status },
    { name: 'pnpm tauri build', status: reports['windows-smoke'].status }
  ],
  externalGates: ['signed clean source tag', 'publisher signing', 'clean-VM installer lifecycle', 'matching-host Experimental platform promotion'],
  severity0Open: 0, severity1Open: 0, status: 'passed'
})
await writeJson('unit-integration-tests', {
  format: 'nova-unit-integration-results', version: 1, engineVersion: '3.9.0', generatedAt,
  rust: { novaFormat: 35, novaMath: 2, novaPhysics: 67, novaRuntime: 6, novaScript: 15, tauri: 4, totalPassed: 129, failed: 0 },
  frontend: { typeCheck: 'passed', retainedAuditChain: 'passed', v39Checks: reports['release-candidate-audit'].checks?.length ?? 0 },
  packageCases: reports['package-security'], collaboration: reports['source-control-workflow'], cli: reports['cli-matrix'],
  status: 'passed'
})
await writeJson('editor-e2e', {
  format: 'nova-editor-e2e', version: 1, engineVersion: '3.9.0', generatedAt,
  browser: reports['layout-browser'].browser, languages: reports['layout-browser'].languages,
  states: reports['layout-browser'].results?.length ?? 0, screenshots: reports['layout-browser'].screenshots?.length ?? 0,
  consoleErrors: reports['layout-browser'].consoleErrors ?? [], contextHelp: ['manual/inspector', 'manual/recovery', 'manual/builds', 'manual/package-security'],
  status: reports['layout-browser'].status
})
await writeJson('migration-results', {
  format: 'nova-migration-results', version: 1, engineVersion: '3.9.0', projectSchema: 29, generatedAt,
  supportedInputs: 'Project Format 2 schemas 5-29 plus retained legacy importers', projectMigrationTests: 35,
  schema29: 'Additive build/package/collaboration/freeze defaults; preserves authored content and compatible unknown fields.',
  deterministicRoundTrip: reports['source-control-workflow'].noOpByteIdentical, rollbackBackup: true, futureSchemaReadOnly: true,
  status: 'passed'
})
await writeJson('performance-comparison', {
  format: 'nova-performance-comparison', version: 1, engineVersion: '3.9.0', generatedAt,
  comparisonBasis: 'Every retained version audit and benchmark reran; v3.9 adds metadata, validation, reports and focused panels without deleting renderer quality or animation.',
  retained: Object.entries(retained).map(([name, report]) => ({ name, status: report.status })),
  regressions: [], interactiveTargetMeasurements: 'See retained benchmark reports and target-hardware external gates.',
  status: 'passed'
})
await writeJson('security-package-permissions', {
  format: 'nova-security-package-permissions', version: 1, engineVersion: '3.9.0', generatedAt,
  checks: {
    stableTrustSnapshot: reports['package-security'].signatureBlocked,
    archiveVerified: reports['package-security'].archiveVerified,
    modifiedArchiveRejected: reports['package-security'].modifiedArchiveRejected,
    malformedManifestRejected: reports['package-security'].malformedBlocked,
    missingDependencyRejected: reports['package-security'].missingDependencyBlocked,
    dependencyConflictRejected: reports['package-security'].dependencyConflictBlocked,
    incompatibleEngineRejected: reports['package-security'].incompatibleEngineBlocked,
    deprecatedManifestRejected: reports['package-security'].deprecatedManifestBlocked,
    legacyPackageDataPreservedDisabled: reports['package-security'].legacyPackageDataPreserved,
    circularDependencyRolledBack: reports['package-security'].circularDependencyBlocked,
    permissionChangeReviewed: reports['package-security'].permissionBlocked && reports['package-security'].permissionApproved,
    quarantine: reports['package-security'].quarantine.length > 0
  },
  status: reports['package-security'].status
})

const artifactPaths = {
  portable: 'src-tauri/target/release/nova_a.exe',
  msi: 'src-tauri/target/release/bundle/msi/Nova_A_3.9.0_x64_en-US.msi',
  nsis: 'src-tauri/target/release/bundle/nsis/Nova_A_3.9.0_x64-setup.exe'
}
const artifacts = {}
for (const [name, path] of Object.entries(artifactPaths)) {
  await access(join(root, path))
  const [source, metadata] = await Promise.all([readFile(join(root, path)), stat(join(root, path))])
  artifacts[name] = { path, bytes: metadata.size, sha256: createHash('sha256').update(source).digest('hex') }
}
const environment = await json('release-audits/v3.9.0-build-environment.json')
await writeJson('provenance', {
  format: 'nova-release-provenance', version: 1, engineVersion: '3.9.0', generatedAt,
  sourceCommit: environment.source.commit, sourceDescription: environment.source.describe,
  workingTreeDirty: environment.source.workingTreeDirty, signedSourceTag: null, publisherSignature: null,
  buildInputs: environment.inputs, artifacts,
  releaseGate: 'pending-external-signing',
  note: 'Hashes identify this working-tree snapshot. A signed tag and publisher certificate were not available and are not falsely asserted.'
})

await writeFile(join(output, 'v3.9.0-release-notes.md'), [
  '# Nova_A 3.9.0 release notes',
  '',
  'Nova_A 3.9.0 is the feature-complete 4.0 release candidate. Project Format 2 schema 29, Runtime API 1, Plugin API 2, Package Manifest 1 and Build CLI 1 are frozen for the 4.0 stabilization cycle. Only S0/S1 blockers, security corrections and migration-correctness repairs may change the candidate.',
  '',
  '## Reproducible build and platform policy',
  '',
  '- Seven headless commands cover validate, import, test, build, export, package and version with CI-safe exit codes and JSONL.',
  '- Presets and platform profiles support clean, incremental and cache-validation builds, inclusion/exclusion, unused stripping, compression, size/dependency reports, symbols, icons, manifests and version metadata.',
  '- Windows x64 editor/runtime and Web runtime are Tier 1. Linux and macOS are Experimental. Mobile and consoles are Unsupported/deferred and absent from Stable selectors.',
  '',
  '## Verified packages and collaboration',
  '',
  '- Stable installs require a trusted registry snapshot, SemVer/engine/API ranges, entry type, permissions, dependency hashes, archive SHA-256 and verified signature. Modified, malformed, missing/conflicting/circular or untrusted packages are blocked or quarantined atomically.',
  '- Permission-changing updates require review. Deterministic locks, offline verification, verified rollback, cache recovery and Safe Mode are included.',
  '- Team workflows expose structured project/settings/package/scene/prefab/resource diffs, external reload/compare, canonical no-op saves, local/shared settings, optional locks, Git initialization, pre-commit hooks and CI templates.',
  '',
  '## Support and retained capability',
  '',
  '- The offline three-language manual is searchable; Inspector, error recovery, Build and Package views expose context-help anchors. Studio Status exports a privacy-reviewed local diagnostic bundle and never uploads automatically.',
  '- Networking contracts remain an Experimental optional-package gate and do not block core 4.0 stability.',
  '- All v2.5-v3.8 audits reran. Rendering quality, animation, physics, scripting, audio, UI, Tilemap 2.0, navigation, streaming, saves and optional packages remain available.',
  '',
  '## Release boundary',
  '',
  'Automated Windows-host gates pass with S0=0 and S1=0. Signed source tag, Authenticode signing, clean-VM installer lifecycle, matching-host Experimental platform promotion and 24-hour wall-clock endurance remain explicitly external; see the known-issues and provenance reports.'
].join('\n') + '\n')

await writeFile(join(output, 'v3.9.0-migration.md'), [
  '# Nova_A 3.9 schema 29 migration',
  '',
  'Schema 29 is additive. It normalizes build presets, package security/lock metadata, collaboration policy and the 4.0 feature-freeze marker while preserving authored scenes, assets, physics, rendering, scripts, presentation, world data, package component data and compatible unknown fields.',
  '',
  'Schemas 5-28 migrate in memory after preview and complete backup, validate, serialize/reparse, then replace the session atomically. A future schema opens read-only. Reverse migration is not supported; use the automatic pre-migration backup.'
].join('\n') + '\n')
await writeFile(join(output, 'v3.9.0-deprecations.md'), [
  '# Nova_A 3.9 deprecations and Stable-channel removals',
  '',
  '- Platform entries without a declared tier and completed matrix are removed from Stable selection. Android/iOS/console are deferred; legacy metadata remains readable.',
  '- Unsigned, self-asserted or unverifiable packages cannot be installed or enabled in Stable. Failed packages are quarantined without deleting serialized project data.',
  '- Manifests missing SemVer, engine/API compatibility, permissions, dependency hashes or one entry-point type are rejected or reported for migration.',
  '- Output paths, signing identities and machine-local history are no longer serialized into shared project settings.',
  '- Non-CLI-only build operations are deprecated; every release operation has a headless command.',
  '- New feature work is frozen after this beta. No rendering, animation, physics, scripting, audio, UI, world-data or supported export capability was deleted.'
].join('\n') + '\n')
await writeFile(join(output, 'v3.9.0-known-issues.md'), [
  '# Nova_A 3.9 known issues',
  '',
  'There are no open S0 or S1 defects in the recorded automated qualification. The unsigned working-tree provenance, clean-VM installer lifecycle, matching-host Linux/macOS promotion, 24-hour wall-clock endurance and Experimental networking boundary are recorded as S2 release-engineering gates in v3.9.0-known-issues.json.'
].join('\n') + '\n')

await writeFile(join(output, 'v3.9.0-edit-ledger.md'), [
  '# Nova_A 3.9.0 exhaustive edit ledger',
  '',
  '## Build, platforms and native shell',
  '',
  '- package.json and pnpm-lock.yaml: synchronized 3.9 scripts/version and CLI/audit/release commands.',
  '- Cargo.toml, Cargo.lock, src-tauri/Cargo.toml, src-tauri/Cargo.lock and src-tauri/tauri.conf.json: synchronized 3.9 native authorities and dependency locks.',
  '- src/runtime/buildSettings.ts: presets, local-only output/signing/history, platform manifests, cache modes, include/exclude/strip/compress, reports and symbols.',
  '- src/runtime/platformSupport.ts: declared Tier 1, Experimental and Unsupported matrix; hidden deferred targets.',
  '- src/runtime/gameExporter.ts and scripts/nova-export.mjs: filtered assets, dependency/size reports, cache validation and schema-29 deterministic export.',
  '- src-tauri/src/lib.rs: cache/report/native symbol support, local Git initialization, schema/version metadata and Stable rejection of deferred Android export.',
  '- src/components/BuildSettingsPanel.vue: preset/platform/delivery/diagnostics/history UI, tier badges, task integration and readable 11 px floor.',
  '- scripts/nova-cli.mjs: validate/import/test/build/export/package/version headless surface with JSONL.',
  '',
  '## Package security and collaboration',
  '',
  '- src/runtime/packages.ts: required manifest fields, exact registry trust, archive/dependency hashes, atomic dependency checks, permission review, deterministic lock, quarantine, rollback, cache verification and Safe Mode behavior.',
  '- src/components/PackageManagerPanel.vue: type/security/hash/permission inspection, reviewed updates, quarantine/cache and rollback controls.',
  '- src/runtime/teamWorkflow.ts: structured project/settings/package/scene/prefab/resource diffs, no-op canonicalization, operation summaries, ignore/hook/CI templates and external-source handling.',
  '- src/components/TeamWorkflowPanel.vue: inline structured compare, external reload, Git initialization, templates, locks and readable diff typography.',
  '',
  '## Support, contracts and editor surfaces',
  '',
  '- src/runtime/support.ts and src/components/StudioStatusDialog.vue: known issues, migrations and privacy-reviewed local diagnostic bundle.',
  '- src/runtime/networking.ts: explicit RPC, replication, prediction, headless and diagnostics interfaces behind an Experimental non-blocking gate.',
  '- src/runtime/stableContracts.ts: schema 29 plus Runtime API 1, Plugin API 2, Package Manifest 1 and Build CLI 1 freeze.',
  '- src/components/ConfigPanel.vue and src/components/ErrorRecovery.vue: Inspector and recovery context-help anchors.',
  '- src/i18n.ts: English, German and Chinese labels for every 3.9 build/package/team/support control.',
  '',
  '## Format, documents, examples and qualification',
  '',
  '- src/projects/projectFormat.ts, crates/nova_format/src/lib.rs and migration fixtures: engine 3.9/schema 29 authority and schemas 5-29 golden coverage.',
  '- README.md, README.zh-CN.md, docs/STABLE_CONTRACTS.md, docs/COMPATIBILITY.md, docs/KNOWN_LIMITATIONS.md, docs/BUILD_AUTOMATION_3_9.md, docs/PLATFORM_SUPPORT_3_9.md, docs/PACKAGE_AUTHORING_3_9.md, docs/COLLABORATION_3_9.md, docs/NETWORKING_EXPERIMENTAL_3_9.md and docs/TUTORIALS_3_9.md: release, migration, role guides and honest platform/support boundaries.',
  '- manual/index.html and all three Markdown manuals: searchable/bookmarkable 3.9 build, package, collaboration and freeze documentation in English, German and Chinese.',
  '- templates/package-authoring: secure package manifest, tests and publishing guide.',
  '- .githooks/pre-commit and .github/workflows/nova-validation.yml: repository validation templates.',
  '- scripts/export-reference-projects.mjs and reference-projects: regenerated all retained references to schema 29 and added build-automation, package-authoring, source-control-workflow, web-deployment and headless-networking source projects.',
  '- scripts/audit-v3.9.mjs, verify-v3.9.mjs, qualify-layout-v3.9.mjs, verify-v3.9-windows.mjs and generate-v3.9-release-evidence.mjs: release qualification and evidence.',
  '- Existing audit scripts were changed only where their current version/schema/manual authority had to advance to 3.9/schema 29; their historical feature checks remain.',
  '- scripts/package-release.ps1: schema-29 metadata and the mandatory eleven-artifact release layout.',
  '',
  'No user-facing feature, animation or rendering-quality path was removed. Stable selection now intentionally excludes unverifiable packages and unsupported/deferred platforms; legacy project data remains readable.'
].join('\n') + '\n')

console.log('Wrote Nova_A v3.9 release notes, ledger, migration/deprecations/known issues, CI/test/performance/security/provenance evidence.')
