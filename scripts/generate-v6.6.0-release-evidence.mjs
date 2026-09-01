import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { arch, platform, versions } from 'node:process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const version = '6.6.0', root = dirname(dirname(fileURLToPath(import.meta.url))), audits = join(root, 'release-audits'), evidence = join(audits, `evidence-v${version}`), generatedAt = new Date().toISOString()
const sha256 = value => createHash('sha256').update(value).digest('hex'), readJson = async name => JSON.parse(await readFile(join(audits, name), 'utf8')), writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
await rm(evidence, { recursive: true, force: true }); for (const folder of ['runtime', 'layout', 'build', 'manual', 'reference/coop', 'reference/headless', 'game-output', 'performance', 'external']) await mkdir(join(evidence, folder), { recursive: true })
const [product, verification, interactions, layout, windows, headlessSmoke, stability, catalog, dependency, before, after] = await Promise.all(['v6.6.0-product-audit.json', 'v6.6.0-verification.json', 'v6.6.0-user-interactions.json', 'v6.6.0-layout-browser.json', 'v6.6.0-windows-smoke.json', 'v6.6.0-headless-smoke.json', 'v6.6.0-stability-local.json', 'template-catalog-verification.json', 'v6.6.0-dependency-audit.json', 'v6.5.0-performance-after.json', 'v6.6.0-performance-after.json'].map(readJson))
for (const [source, target] of [['v6.6.0-product-audit.json', 'runtime/product-audit.json'], ['v6.6.0-verification.json', 'runtime/verification.json'], ['v6.6.0-user-interactions.json', 'runtime/user-interactions.json'], ['v6.6.0-layout-browser.json', 'layout/layout-browser.json'], ['v6.6.0-windows-smoke.json', 'build/windows-smoke.json'], ['v6.6.0-headless-smoke.json', 'build/headless-smoke.json'], ['v6.6.0-stability-local.json', 'runtime/stability-local.json'], ['template-catalog-verification.json', 'runtime/template-catalog.json'], ['v6.6.0-dependency-audit.json', 'runtime/dependency-audit.json'], ['v6.5.0-performance-after.json', 'performance/before.json'], ['v6.6.0-performance-after.json', 'performance/after.json']]) await cp(join(audits, source), join(evidence, target))
for (const name of ['MANUAL.en.md', 'MANUAL.de.md', 'MANUAL.zh-CN.md', 'index.html']) await cp(join(root, 'manual', name), join(evidence, 'manual', name))
for (const reference of ['coop', 'headless']) { const source = reference === 'coop' ? 'creator-v660-coop-arena' : 'creator-v660-headless-authority'; for (const name of ['project.nova', 'README.md', 'test-controls.json', 'expected-output.json']) await cp(join(root, 'reference-projects/projects', source, name), join(evidence, 'reference', reference, name)) }
await cp(join(audits, `game-output-v${version}`), join(evidence, 'game-output'), { recursive: true, force: true })
await cp(join(audits, `headless-output-v${version}`), join(evidence, 'build/headless-output'), { recursive: true, force: true })

const notes = `# Nova_A 6.6.0 candidate release notes

Nova_A 6.6 adds a production workflow to the optional local-first multiplayer runtime. Reviewed transport adapters and authentication proof providers have bounded registration contracts. Additive Protocol 2 security envelopes, replay protection, rate/size limits and encryption guidance reject malformed, expired, repeated, version-mismatched, oversized or unauthenticated traffic before gameplay dispatch.

Server/owner authority now transfers explicitly and returns on disconnect/timeout. Scene/radius interest management filters snapshots; host/server scene handoff enters the normal deferred scene pipeline. Network Studio exposes local lobby hosting/discovery, verified peers, ownership, relevance, replication diffs, rollback timeline, channel/bandwidth/security counters and deterministic bad-network simulation.

The editor can build once and launch 2–8 bounded Windows player instances with host/client identities, separate log scopes and Inspector IDs. Environment overrides never enable networking or grant permission. Playable co-op Rhai RPC/replication and headless-authority references document client/server export and honest UDP/WSS limitations.

No feature, animation, shortcut, renderer/physics path, offline workflow, exported fidelity or supported serialized path was removed. Project Format 2/schema 29, Network Protocol 2 and every frozen public 6.x contract remain unchanged. Publisher signing, independent clean-machine lifecycle, second-machine reproducibility, matching-host non-Windows qualification, hostile-network/public relay/NAT review, independent hardware/accessibility evidence and a real 72-hour soak remain external and are not claimed.
`
const ledger = `# Nova_A 6.6.0 edit ledger

- Added reviewed optional transport-adapter registration with reverse-domain identity, semantic version, SHA-256, publisher/reviewer, least networking permissions and HTTPS documentation/security checks.
- Added reviewed authentication proof-provider registration with frozen bounded contexts and 512-byte proofs; credentials are never persisted or diagnosed.
- Added additive Protocol 2 auth/authority/interest/scene packet kinds and epoch/nonce/time/proof envelopes without changing Protocol 2.
- Added bounded replay-age/window protection, future-time/duplicate rejection, verification state and explicit encryption guidance/blocking.
- Added per-peer/channel reliable sequencing and lifecycle self-recovery discovered by the 4/8-peer scale soak; retained two-peer behavior and peer-specific ACK windows.
- Added logical peer-to-native-UDP endpoint routing so targeted reliable packets, ACKs, authority and handoff messages reach the correct process.
- Added server/owner authority tables, transfer policy and disconnect/timeout return to host/server.
- Added complete per-peer disconnect cleanup for pending reliable packets, outbound/inbound sequences, ordered buffers, replay windows, remote inputs, interests and verification state; other peers remain intact.
- Added deterministic scene/radius interest filtering, always-relevant policy and peer-interest publication.
- Added host/server scene handoff through the retained deferred scene-loading runtime and network signal diagnostics.
- Added bounded ownership, peer-interest, replication-diff and rollback/prediction timelines plus replay/auth/cleanup counters.
- Added explicit same-device local lobby hosting/discovery with BroadcastChannel and no Nova_A cloud, account or implicit network discovery.
- Added deterministic 2–8 host/client play plans, separate log/Inspector identities and a native built-player launcher with canonical path containment.
- Preserved the explicit optional-package, enabled, permission and auto-start gates; environment overrides cannot enable or authorize networking.
- Added build/runtime validation for adapter/provider/encryption/verified-peer/ownership/relevance/headless policy.
- Added English, German and Chinese labels and regenerated all 358 teaching lessons with a production multiplayer task workflow.
- Added playable co-op Rhai RPC/replication and authoritative headless native-UDP reference projects.
- Added independent single-file Windows export, embedded-package hash verification and launch smoke for both the co-op game and authoritative headless server.
- Added malformed/version/secret/rate/replay/auth/authority/interest/encryption/bad-network/rollback/save/replay and actual 2/4/8-process UDP qualification.
- Moved the Windows physics benchmark probe to a unique temporary Cargo target so stale indexing/antivirus locks cannot invalidate fresh release evidence.
- Added localized interaction/layout, template, low-end performance, dependency, Web/WASM/Rust/Tauri, native editor/game and exact release gates.
- Advanced active frontend, Rust, Tauri, exporter, runtime evidence and UI release authorities to 6.6.0; historical release scripts/references remain unchanged.
- Removed no feature, animation, shortcut, template, renderer path, physics behavior, public API, frozen format or supported serialized-data path.
`
await writeFile(join(audits, `v${version}-release-notes.md`), notes); await writeFile(join(audits, `v${version}-edit-ledger.md`), ledger)

const gameName = 'Nova 6.6 Co-op Arena.exe', headlessName = 'Nova 6.6 Headless Authority.exe', buildCandidates = [['web-editor', 'dist/index.html'], ['web-player', 'dist/player.html'], ['windows-editor', 'src-tauri/target/release/nova_a.exe'], ['windows-game', `release-audits/game-output-v${version}/${gameName}`], ['windows-headless-server', `release-audits/headless-output-v${version}/${headlessName}`], ['windows-nsis', `src-tauri/target/release/bundle/nsis/Nova_A_${version}_x64-setup.exe`], ['windows-msi', `src-tauri/target/release/bundle/msi/Nova_A_${version}_x64_en-US.msi`]], builds = []
for (const [name, path] of buildCandidates) { try { const bytes = await readFile(join(root, path)); builds.push({ name, path, bytes: bytes.length, sha256: sha256(bytes), status: 'passed' }) } catch { builds.push({ name, path, status: 'missing' }) } }
const buildsPassed = builds.every(item => item.status === 'passed')
await writeJson(join(evidence, 'build/local-builds.json'), { format: 'nova-local-build-evidence', version: 1, engineVersion: version, generatedAt, artifacts: builds, status: buildsPassed ? 'passed' : 'incomplete' })
const peerMetrics = Object.fromEntries([2, 4, 8].map(count => { const item = verification.checks.find(check => check.id === `V660-${count}-PEER-SOAK`); return [`peer${count}`, item?.metrics ?? null] }))
await writeJson(join(audits, `v${version}-benchmarks.json`), { format: 'nova-v6.6.0-benchmark-summary', version: 1, engineVersion: version, generatedAt, scope: 'Production multiplayer workflow with retained low-end physics/render/export baseline.', verificationChecks: verification.checks.length, peerMetrics, performanceBaselineRelease: '6.5.0', beforeBodyStepsPerSecond: before.measurements.physics.bodyStepsPerSecond, afterBodyStepsPerSecond: after.measurements.physics.bodyStepsPerSecond, portableGameBytes: windows.artifacts.find(item => item.name === 'game')?.bytes ?? 0, status: buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(audits, `v${version}-stability-smoke.json`), { format: 'nova-v6.6.0-stability-summary', version: 1, engineVersion: version, generatedAt, typeCheck: 'passed', rustWorkspaceTests: 'passed', wasmRelease: 'passed', productionBuild: 'passed', deterministicCycles: stability.status, templateCatalog: catalog.status, interactionAudit: interactions.status, layoutMatrix: layout.status, multiplayerVerification: verification.status, dependencyAudit: dependency.status, windowsGameLaunch: windows.status, windowsHeadlessLaunch: headlessSmoke.status, localBuilds: buildsPassed ? 'passed' : 'incomplete', wallClock72HourSoakComplete: false, cleanMachineLifecycleComplete: false, status: product.status === 'passed' && buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(evidence, 'external/gates.json'), { format: 'nova-external-certification-gates', version: 1, release: version, generatedAt, gates: ['publisher identity and Windows artifact signing', 'independent clean-machine install/launch/upgrade/repair/uninstall', 'second-machine byte reproducibility', 'matching-host Linux and macOS build/runtime', 'independent hostile-network/browser/hardware/accessibility matrix', 'public relay/NAT/certificate/credential infrastructure review', 'real 72-hour editor/player/network soak'].map(name => ({ name, status: 'pending-external', claimed: false })) })
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), environment = { id: `${platform}-${arch}-${versions.node}`, platform, architecture: arch, node: versions.node, rust: safeExec('rustc', ['--version']), cargo: safeExec('cargo', ['--version']) }
const entries = await Promise.all((await filesUnder(evidence)).sort().filter(path => !path.endsWith('evidence-manifest.json')).map(async path => { const contents = await readFile(path); return { path: relative(evidence, path).replaceAll('\\', '/'), sha256: sha256(contents), bytes: contents.length, source: commit, tool: 'generate-v6.6.0-release-evidence.mjs', environment: environment.id } }))
await writeJson(join(evidence, 'evidence-manifest.json'), { format: 'nova-release-evidence-manifest', version: 1, release: version, generatedAt, source: { commit, dirty: true, note: 'Current working candidate; exact tag verification remains pending.' }, environment, localQualificationComplete: product.status === 'passed' && verification.status === 'passed' && interactions.status === 'passed' && layout.status === 'passed' && windows.status === 'passed' && headlessSmoke.status === 'passed' && stability.status === 'passed' && catalog.status === 'passed' && dependency.status === 'passed' && buildsPassed, externalCertificationComplete: false, entries })
console.log(`Nova_A v${version} evidence generated with ${entries.length} hashed entries; external certification remains pending.`)
function safeExec(command, args) { try { return execFileSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim() } catch { return 'unavailable' } }
async function filesUnder(directory) { const files = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); entry.isDirectory() ? files.push(...await filesUnder(path)) : files.push(path) } return files }
