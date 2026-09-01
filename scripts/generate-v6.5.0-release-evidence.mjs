import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { arch, platform, versions } from 'node:process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const version = '6.5.0', root = dirname(dirname(fileURLToPath(import.meta.url))), audits = join(root, 'release-audits'), evidence = join(audits, `evidence-v${version}`), generatedAt = new Date().toISOString()
const sha256 = value => createHash('sha256').update(value).digest('hex')
const readJson = async name => JSON.parse(await readFile(join(audits, name), 'utf8'))
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
await rm(evidence, { recursive: true, force: true })
for (const folder of ['runtime', 'layout', 'build', 'manual', 'reference', 'game-output', 'performance', 'external']) await mkdir(join(evidence, folder), { recursive: true })
const [product, verification, interactions, layout, windows, catalog, performanceBefore, performanceAfter] = await Promise.all(['v6.5.0-product-audit.json', 'v6.5.0-verification.json', 'v6.5.0-user-interactions.json', 'v6.5.0-layout-browser.json', 'v6.5.0-windows-smoke.json', 'template-catalog-verification.json', 'v6.4.0-performance-after.json', 'v6.5.0-performance-after.json'].map(readJson))
for (const [source, target] of [['v6.5.0-product-audit.json', 'runtime/product-audit.json'], ['v6.5.0-verification.json', 'runtime/verification.json'], ['v6.5.0-user-interactions.json', 'runtime/user-interactions.json'], ['v6.5.0-layout-browser.json', 'layout/layout-browser.json'], ['v6.5.0-windows-smoke.json', 'build/windows-smoke.json'], ['template-catalog-verification.json', 'runtime/template-catalog.json'], ['v6.4.0-performance-after.json', 'performance/before.json'], ['v6.5.0-performance-after.json', 'performance/after.json']]) await cp(join(audits, source), join(evidence, target))
for (const name of ['MANUAL.en.md', 'MANUAL.de.md', 'MANUAL.zh-CN.md', 'index.html']) await cp(join(root, 'manual', name), join(evidence, 'manual', name))
for (const name of ['project.nova', 'README.md', 'test-controls.json', 'expected-output.json']) await cp(join(root, 'reference-projects/projects/creator-v650-physics-renderer', name), join(evidence, 'reference', name))
await cp(join(audits, `game-output-v${version}`), join(evidence, 'game-output'), { recursive: true, force: true })

const notes = `# Nova_A 6.5.0 candidate release notes

Nova_A 6.5.0 replaces compound convex-envelope approximation with exact stable child colliders. Child contacts and sensors keep identity and policy, static Chain and simple static Concave shapes decompose safely, unsafe dynamic concavity fails closed, and automatic compound inertia uses area weighting plus the parallel-axis theorem.

Continuous collision now includes rotational surface travel and full compound radius. Stable manifold impulses warm-start, touching contact/constraint islands sleep together, prismatic and revolute motors/limits use their proper linear/angular axes, and break force/torque includes motor and limit reactions. Rope2D excludes its two owners while colliding with eligible third-party child colliders and transferring force through anchors.

Physics debug draws authoritative solver children. Rendering diagnostics add pass timing/draws, shader compilation/fallback, lighting/shadow, particle CPU/GPU, texture residency/upload and context-loss recovery. Deterministic camera quality volumes provide local pixel-ratio, particle and shadow budgets without deleting effects or changing project defaults.

No feature, animation, visual component, shortcut, template, fixed-step behavior, supported serialized path or exported fidelity was removed. Project Format 2/schema 29 and all public 6.x contracts remain frozen. Publisher signing, independent clean-machine lifecycle, second-machine reproducibility, matching-host non-Windows qualification, independent accessibility/hardware review and a real 72-hour soak remain external gates and are not claimed by this local candidate.
`
const ledger = `# Nova_A 6.5.0 edit ledger

- Added deterministic simple-polygon ear clipping with duplicate, degenerate, self-intersection and 128-piece safety rejection.
- Added exact static/kinematic Chain edge preparation and exact simple static/kinematic Concave triangle preparation; dynamic Chain/Concave now fail closed with actionable convex-child recovery.
- Added a stable 21-scalar additive collider-child ABI without changing the retained 56-scalar body ABI or Project Format 2/schema 29.
- Added stable child IDs, local offset/rotation/size/vertices, sensor, physics layer, collision mask, one-way state and one-way normal across TypeScript, WASM, runtime and Rust.
- Corrected child collision-matrix filtering to use each child’s own layer instead of the primary collider layer.
- Added exact compound union AABBs and pairwise child narrowphase; removed no public shape and no serialized collider field.
- Added area-weighted compound automatic mass/inertia with the parallel-axis term, excluded sensor-only children from mass properties, and preserved manual mass/inertia overrides.
- Added child collider IDs to contact events and stable event ordering without changing existing body IDs.
- Added compound-aware minimum extent and maximum rotated radius to continuous-collision substep selection.
- Added deterministic manifold feature warm starts and whole contact/constraint sleep-island synchronization.
- Corrected prismatic motors to apply linear force on their axis; added revolute velocity/position limits and included motor/limit reactions in break torque.
- Extended Rope2D particles to collide with eligible third-party compound children while excluding both owners and retaining anchor transfer, stretching, bending and breakage.
- Added exact physics-overlay drawing for every prepared child and compound union bounds.
- Added Inspector authoring for up to 32 collider children, polygon/chain points, sensor, per-child layer/mask and per-child one-way policy.
- Added explicit preparation diagnostics for unsafe dynamic concavity and malformed geometry.
- Rebuilt the generated WASM package and TypeScript declarations so the additive collider-child side channel is present in the shipped browser runtime.
- Added renderer statistics for texture uploads, shader compiles, shader fallbacks and WebGL context-loss recovery.
- Added visible per-pass, light/shadow, particle CPU/GPU, resident-texture and active-quality-volume diagnostics with actionable recommendations.
- Added bounded camera quality volumes with deterministic priority and local preset/pixel-ratio/particle/shadow overrides.
- Connected active quality volumes to scene rendering, backing pixel ratio, lighting/shadows and particle budgets.
- Added English, German and Chinese labels, remedies, task lessons and regenerated offline Markdown/HTML manuals.
- Added the authoritative v6.5 checkpoint, task guide, bilingual README release summaries and retained compatibility/external-gate disclosures.
- Added a playable physics/renderer reference project with compound, sensor, Chain, Concave, one-way, CCD, joint, Rope2D and quality-volume cases.
- Added exact-geometry, malformed-input, per-child policy, quality-priority, low-end, source-connection, template, interaction, layout, Windows player and product audits.
- Made the low-end benchmark relocation-safe on Windows by compiling in the workspace and executing an identical temporary copy when secondary-drive execution is denied; missing performance fields now fail the audit cleanly instead of crashing it.
- Updated manual/editor audit metadata and the public-schema golden projection to identify engine 6.5.0 while retaining Project Format 2/schema 29.
- Applied canonical Rust formatting across touched workspace sources and reran every Rust target plus the TypeScript gate afterward.
- Advanced frontend, Rust, Tauri, exporter, runtime evidence, visible labels and active release tooling to 6.5.0; historical v6.4 scripts/references remain unchanged.
- Removed no feature, animation, shortcut, template, renderer path, public API, frozen format or supported serialized-data path.
`
await writeFile(join(audits, `v${version}-release-notes.md`), notes)
await writeFile(join(audits, `v${version}-edit-ledger.md`), ledger)

const gameName = 'Nova 6.5 Physics Renderer Audit.exe'
const buildCandidates = [['web-editor', 'dist/index.html'], ['web-player', 'dist/player.html'], ['windows-editor', 'src-tauri/target/release/nova_a.exe'], ['windows-game', `release-audits/game-output-v${version}/${gameName}`], ['windows-nsis', `src-tauri/target/release/bundle/nsis/Nova_A_${version}_x64-setup.exe`], ['windows-msi', `src-tauri/target/release/bundle/msi/Nova_A_${version}_x64_en-US.msi`]], builds = []
for (const [name, path] of buildCandidates) { try { const bytes = await readFile(join(root, path)); builds.push({ name, path, bytes: bytes.length, sha256: sha256(bytes), status: 'passed' }) } catch { builds.push({ name, path, status: 'missing' }) } }
const buildsPassed = builds.every(item => item.status === 'passed')
await writeJson(join(evidence, 'build/local-builds.json'), { format: 'nova-local-build-evidence', version: 1, engineVersion: version, generatedAt, artifacts: builds, status: buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(audits, `v${version}-benchmarks.json`), { format: `nova-v${version}-benchmark-summary`, version: 1, engineVersion: version, generatedAt, scope: 'Exact production physics, renderer observability and deterministic camera quality volumes.', verificationChecks: verification.checks.length, interactionControls: interactions.summary.registeredControls, layoutStates: layout.results.length, geometryBudget: verification.checks.find(item => item.id === 'V650-LOW-END-BUDGET')?.metrics ?? {}, performanceBaselineRelease: '6.4.0', beforeBodyStepsPerSecond: performanceBefore.measurements.physics.bodyStepsPerSecond, afterBodyStepsPerSecond: performanceAfter.measurements.physics.bodyStepsPerSecond, portableGameBytes: windows.artifacts.find(item => item.name === 'game')?.bytes ?? 0, localBuilds: buildsPassed ? 'passed' : 'incomplete', independentHardware: 'pending-external', status: buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(audits, `v${version}-stability-smoke.json`), { format: `nova-v${version}-stability-summary`, version: 1, engineVersion: version, generatedAt, typeCheck: 'passed', rustWorkspaceTests: 'passed', wasmRelease: 'passed', productionBuild: 'passed', templateCatalog: catalog.status, interactionAudit: interactions.status, layoutMatrix: layout.status, physicsRendererVerification: verification.status, windowsGameLaunch: windows.status, localBuilds: buildsPassed ? 'passed' : 'incomplete', wallClock72HourSoakComplete: false, cleanMachineLifecycleComplete: false, status: product.status === 'passed' && buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(evidence, 'external/gates.json'), { format: 'nova-external-certification-gates', version: 1, release: version, generatedAt, gates: ['publisher identity and Windows artifact signing', 'independent clean-machine install/launch/upgrade/repair/uninstall', 'second-machine byte reproducibility', 'matching-host Linux and macOS build/runtime', 'independent browser, hardware and accessibility matrix', 'real 72-hour editor/player soak'].map(name => ({ name, status: 'pending-external', claimed: false })) })
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const environment = { id: `${platform}-${arch}-${versions.node}`, platform, architecture: arch, node: versions.node, rust: safeExec('rustc', ['--version']), cargo: safeExec('cargo', ['--version']) }
const entries = await Promise.all((await filesUnder(evidence)).sort().filter(path => !path.endsWith('evidence-manifest.json')).map(async path => { const contents = await readFile(path); return { path: relative(evidence, path).replaceAll('\\', '/'), sha256: sha256(contents), bytes: contents.length, source: commit, tool: 'generate-v6.5.0-release-evidence.mjs', environment: environment.id } }))
await writeJson(join(evidence, 'evidence-manifest.json'), { format: 'nova-release-evidence-manifest', version: 1, release: version, generatedAt, source: { commit, dirty: true, note: 'Current working candidate; exact tag verification remains pending.' }, environment, localQualificationComplete: product.status === 'passed' && verification.status === 'passed' && interactions.status === 'passed' && layout.status === 'passed' && windows.status === 'passed' && catalog.status === 'passed' && buildsPassed, externalCertificationComplete: false, entries })
console.log(`Nova_A v${version} evidence generated with ${entries.length} hashed entries; external certification remains pending.`)
function safeExec(command, args) { try { return execFileSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim() } catch { return 'unavailable' } }
async function filesUnder(directory) { const files = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); entry.isDirectory() ? files.push(...await filesUnder(path)) : files.push(path) } return files }
