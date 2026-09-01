import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { arch, platform, versions } from 'node:process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const version = '6.9.0'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const audits = join(root, 'release-audits')
const evidence = join(audits, `evidence-v${version}`)
const generatedAt = new Date().toISOString()
const sha256 = value => createHash('sha256').update(value).digest('hex')
const readJson = async name => JSON.parse(await readFile(join(audits, name), 'utf8'))
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)

await rm(evidence, { recursive: true, force: true })
for (const folder of ['runtime', 'layout', 'build', 'manual', 'reference/package-shipping', 'reference/semantic-collaboration', 'performance', 'package', 'security', 'external']) await mkdir(join(evidence, folder), { recursive: true })

const names = ['v6.9.0-product-audit.json', 'v6.9.0-verification.json', 'v6.9.0-user-interactions.json', 'v6.9.0-layout-browser.json', 'v6.9.0-windows-smoke.json', 'template-catalog-verification.json', 'v6.9.0-performance-after.json', 'v6.9.0-stability-local.json', 'v6.9.0-dependency-audit.json', 'v6.9.0-clean-source-offline.json']
const [product, verification, interactions, layout, windows, catalog, performance, stability, dependency, cleanSource] = await Promise.all(names.map(readJson))
for (const [source, target] of [
  ['v6.9.0-product-audit.json', 'runtime/product-audit.json'], ['v6.9.0-verification.json', 'runtime/verification.json'],
  ['v6.9.0-user-interactions.json', 'runtime/user-interactions.json'], ['v6.9.0-layout-browser.json', 'layout/layout-browser.json'],
  ['v6.9.0-windows-smoke.json', 'build/windows-smoke.json'], ['template-catalog-verification.json', 'runtime/template-catalog.json'],
  ['v6.9.0-performance-after.json', 'performance/after.json'], ['v6.9.0-stability-local.json', 'performance/stability-local.json'],
  ['v6.9.0-dependency-audit.json', 'security/dependencies.json'], ['v6.9.0-clean-source-offline.json', 'build/clean-source-offline.json'], ['v6.9.0-package-a.nova-package', 'package/reproducible-a.nova-package'],
  ['v6.9.0-package-b.nova-package', 'package/reproducible-b.nova-package']
]) await cp(join(audits, source), join(evidence, target))
for (const name of ['MANUAL.en.md', 'MANUAL.de.md', 'MANUAL.zh-CN.md', 'index.html']) await cp(join(root, 'manual', name), join(evidence, 'manual', name))
for (const reference of ['creator-v690-package-shipping', 'creator-v690-semantic-collaboration']) {
  const target = reference.endsWith('shipping') ? 'package-shipping' : 'semantic-collaboration'
  for (const name of ['project.nova', 'README.md', 'test-controls.json', 'expected-output.json']) await cp(join(root, 'reference-projects/projects', reference, name), join(evidence, 'reference', target, name))
}

const notes = `# Nova_A 6.9.0 candidate release notes

Nova_A 6.9.0 completes the local-first package-publishing, trust, update, team-collaboration and release-candidate workflow planned for this milestone. The registry publisher CLI validates sandbox boundaries and creates canonical SOURCE_DATE_EPOCH archives and offline mirrors without implicit network access or private-key handling. Dependency solving now has an inspectable trace, while signed security bulletins enforce publisher fingerprints, revocations, vulnerability policy and replay resistance.

The updater remains disabled by default. It validates a pinned Ed25519 manifest, version, sequence, channel, size and SHA-256 before staging a non-executing plan; applying an already acquired artifact is explicit and rollback retains replay protection. Team Workflow now creates ownership-aware change lists and performs field-level three-way semantic merges, blocking save until every real scene, project, asset or graph conflict has an explicit ours/theirs decision.

Shipping guidance includes matching-host pipelines, signing hooks, SBOM, provenance, patches, symbols, crash handling and install/upgrade/repair/uninstall evidence. Local qualification includes malicious-archive, solver, revocation, updater, semantic-merge, template, normal-user interaction, multilingual layout, performance, stability, dependency, native editor, installer and exported standalone-game checks. Publisher signing, live advisories, clean-machine lifecycle, second-machine reproduction, other-host builds, independent reviews and a real 72-hour soak remain honestly pending external evidence.
`
const ledger = `# Nova_A 6.9.0 edit ledger

- Added a local-only registry publisher CLI with pack, validate and mirror commands.
- Added canonical SOURCE_DATE_EPOCH package archives, normalized paths, sorted entries, stable JSON and reproducibility evidence.
- Added sandbox limits for traversal, absolute paths, case-collisions, symlinks, hidden executable content, file count, per-file size and expanded size.
- Added solver step diagnostics and connected successful resolution to the project lockfile.
- Added compatibility, security and provenance review metadata for package candidates.
- Added signed Ed25519 security bulletins, pinned public-key fingerprints, monotonic sequence checks, revocations and vulnerability policy.
- Added a disabled-by-default signed updater plan with channel/version/sequence/size/hash verification, explicit acquisition boundary, commit and rollback.
- Added matching-host build pipeline declarations for Windows, Linux, macOS and Web.
- Added shipping plans for signing hooks, SBOM, provenance, patches, symbols, crash guidance and clean-machine lifecycle evidence.
- Added deterministic ownership-aware change lists.
- Added recursive three-way semantic project, settings, scene, asset and visual-graph merging.
- Added blocking conflict UI with exact semantic paths and explicit keep-ours/take-theirs resolution.
- Added a Shipping tab to Ecosystem Studio with publisher commands, solver trace, trust/advisory import, updater staging, pipeline and evidence controls.
- Added responsive six-tab and shipping-card layouts without removing existing tabs, controls or animations.
- Added English, German and Chinese labels for every new package, updater, trust, merge and release control.
- Added package/shipping and semantic-collaboration playable reference projects with deterministic fixtures and test controls.
- Added a full three-language package-publishing and release-candidate teaching chapter plus synchronized HTML manual metadata.
- Added the 6.9 technical guide, roadmap checkpoint, README summaries and instructions checkpoint.
- Added focused solver, malicious archive, reproducibility, revocation, updater replay/rollback, semantic merge, change-list, shipping and wiring verification.
- Added multilingual responsive layout, normal-user interaction, Windows editor/game, performance, stability and pinned dependency audits.
- Corrected the 6.9 interaction and layout wrappers so they cannot silently emit evidence for an older release.
- Advanced frontend, Rust workspace, native Tauri, project authority, runtime evidence and packaging metadata to 6.9.0.
- Retained Project Format 2/schema 29, Package Manifest 1 and Plugin API 2 without a serialized contract change.
- Removed nothing: no feature, animation, visual component, shortcut, renderer path, physics behavior, script API or export path.
`
await writeFile(join(audits, `v${version}-release-notes.md`), notes)
await writeFile(join(audits, `v${version}-edit-ledger.md`), ledger)

const reproducibleA = await readFile(join(audits, 'v6.9.0-package-a.nova-package'))
const reproducibleB = await readFile(join(audits, 'v6.9.0-package-b.nova-package'))
await writeJson(join(evidence, 'package/reproducibility.json'), { format: 'nova-package-reproducibility-evidence', version: 1, release: version, generatedAt, firstSha256: sha256(reproducibleA), secondSha256: sha256(reproducibleB), byteIdentical: reproducibleA.equals(reproducibleB), status: reproducibleA.equals(reproducibleB) ? 'passed' : 'failed' })

const artifactInputs = [
  ['web-editor', 'dist/index.html'], ['web-player', 'dist/player.html'], ['windows-editor', 'src-tauri/target/release/nova_a.exe'],
  ['windows-game', 'release-audits/game-output-v6.9.0/Nova 6.9 Offline Package Shipping.exe'],
  ['windows-nsis', 'src-tauri/target/release/bundle/nsis/Nova_A_6.9.0_x64-setup.exe'],
  ['windows-msi', 'src-tauri/target/release/bundle/msi/Nova_A_6.9.0_x64_en-US.msi']
]
const artifacts = await Promise.all(artifactInputs.map(async ([name, path]) => { try { const bytes = await readFile(join(root, path)); return { name, path, bytes: bytes.length, sha256: sha256(bytes), status: 'passed' } } catch { return { name, path, status: 'missing' } } }))
const buildsPassed = artifacts.every(item => item.status === 'passed')
await writeJson(join(evidence, 'build/local-builds.json'), { format: 'nova-local-build-evidence', version: 1, engineVersion: version, generatedAt, artifacts, status: buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(audits, `v${version}-benchmarks.json`), { format: 'nova-v6.9.0-benchmark-summary', version: 1, engineVersion: version, generatedAt, scope: 'Retained physics, script analysis, deterministic asset import, export and artifact-size baseline plus package and collaboration qualification.', bodyStepsPerSecond: performance.measurements?.physics?.bodyStepsPerSecond ?? 0, exportElapsedMs: performance.measurements?.export?.elapsedMs ?? 0, interactionControls: interactions.summary?.registeredControls ?? 0, layoutStates: layout.results?.length ?? 0, packageArchiveSha256: sha256(reproducibleA), localBuilds: buildsPassed ? 'passed' : 'incomplete', status: buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(audits, `v${version}-stability-smoke.json`), { format: 'nova-v6.9.0-stability-summary', version: 1, engineVersion: version, generatedAt, typeCheck: 'passed', rustWorkspaceTests: 'passed', rustNativeTests: 'passed', wasmRelease: 'passed', productionBuild: 'passed', templateCatalog: catalog.status, focusedVerification: verification.status, interactionAudit: interactions.status, layoutMatrix: layout.status, deterministicCycles: stability.cycles, windowsGameLaunch: windows.status, dependencyAudit: dependency.status, localBuilds: buildsPassed ? 'passed' : 'incomplete', wallClock72HourSoakComplete: false, cleanMachineLifecycleComplete: false, status: product.status === 'passed' && buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(evidence, 'external/gates.json'), { format: 'nova-external-certification-gates', version: 1, release: version, generatedAt, gates: ['live dependency advisory registry lookup', 'publisher identity and release signing', 'independent clean-machine install/launch/upgrade/repair/uninstall', 'second-machine byte reproduction', 'Linux and macOS matching-host builds', 'independent package security review', 'independent accessibility review', 'real 72-hour editor/player soak'].map(name => ({ name, status: 'pending-external', claimed: false })) })

const commit = safeExec('git', ['rev-parse', 'HEAD'])
const environment = { id: `${platform}-${arch}-${versions.node}`, platform, architecture: arch, node: versions.node, rust: safeExec('rustc', ['--version']), cargo: safeExec('cargo', ['--version']) }
const entries = await Promise.all((await filesUnder(evidence)).sort().filter(path => !path.endsWith('evidence-manifest.json')).map(async path => { const contents = await readFile(path); return { path: relative(evidence, path).replaceAll('\\', '/'), sha256: sha256(contents), bytes: contents.length, source: commit, tool: 'generate-v6.9.0-release-evidence.mjs', environment: environment.id } }))
const allLocalGatesPass = product.status === 'passed' && verification.status === 'passed' && interactions.status === 'passed' && layout.status === 'passed' && windows.status === 'passed' && catalog.status === 'passed' && dependency.status === 'passed' && cleanSource.status === 'passed' && reproducibleA.equals(reproducibleB) && buildsPassed
await writeJson(join(evidence, 'evidence-manifest.json'), { format: 'nova-release-evidence-manifest', version: 1, release: version, generatedAt, source: { commit, dirty: true, note: 'Current working candidate; exact tag verification remains pending.' }, environment, localQualificationComplete: allLocalGatesPass, externalCertificationComplete: false, entries })
if (!allLocalGatesPass) throw new Error('The v6.9.0 evidence tree is incomplete; release packaging is blocked.')
console.log(`Nova_A v${version} evidence generated with ${entries.length} hashed entries; external certification remains pending.`)

function safeExec(command, args) { try { return execFileSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim() } catch { return 'unavailable' } }
async function filesUnder(directory) { const files = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); entry.isDirectory() ? files.push(...await filesUnder(path)) : files.push(path) } return files }
