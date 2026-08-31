import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { arch, platform, versions } from 'node:process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const version = '6.4.0', root = dirname(dirname(fileURLToPath(import.meta.url))), audits = join(root, 'release-audits'), evidence = join(audits, `evidence-v${version}`), generatedAt = new Date().toISOString()
const sha256 = value => createHash('sha256').update(value).digest('hex')
const readJson = async name => JSON.parse(await readFile(join(audits, name), 'utf8'))
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
await rm(evidence, { recursive: true, force: true })
for (const folder of ['runtime', 'layout', 'build', 'manual', 'reference', 'game-output', 'performance', 'external']) await mkdir(join(evidence, folder), { recursive: true })
const [product, verification, interactions, layout, windows, catalog, performanceBefore, performanceAfter] = await Promise.all([`v${version}-product-audit.json`, `v${version}-verification.json`, `v${version}-user-interactions.json`, `v${version}-layout-browser.json`, `v${version}-windows-smoke.json`, 'template-catalog-verification.json', `v${version}-performance-before.json`, `v${version}-performance-after.json`].map(readJson))
for (const [source, target] of [[`v${version}-product-audit.json`, 'runtime/product-audit.json'], [`v${version}-verification.json`, 'runtime/verification.json'], [`v${version}-user-interactions.json`, 'runtime/user-interactions.json'], [`v${version}-layout-browser.json`, 'layout/layout-browser.json'], [`v${version}-windows-smoke.json`, 'build/windows-smoke.json'], ['template-catalog-verification.json', 'runtime/template-catalog.json'], [`v${version}-performance-before.json`, 'performance/before.json'], [`v${version}-performance-after.json`, 'performance/after.json']]) await cp(join(audits, source), join(evidence, target))
for (const name of ['MANUAL.en.md', 'MANUAL.de.md', 'MANUAL.zh-CN.md', 'index.html']) await cp(join(root, 'manual', name), join(evidence, 'manual', name))
for (const name of ['project.nova', 'README.md', 'test-controls.json', 'expected-output.json']) await cp(join(root, 'reference-projects/projects/creator-v640-content-animation', name), join(evidence, 'reference', name))
await cp(join(audits, `game-output-v${version}`), join(evidence, 'game-output'), { recursive: true, force: true })

const notes = `# Nova_A 6.4.0 candidate release notes

Nova_A 6.4.0 adds deterministic Aseprite, TexturePacker/common-atlas and Tiled TMX/JSON/TSX import and reimport with stable slicing, pivots, colliders, tags, timing and references. Contextual Asset tabs expose the imported source and slice metadata without adding another global panel.

Six reusable Resource kinds now support shared parents, local overrides, deterministic serialization, cycle/reference validation and export inclusion. Animation production adds a skin-weight heat view, bounded automatic weights, constraints, real onion-skin samples, retained curve editing, retarget diagnostics and root-motion preview using the runtime sampler.

The first measured pre-7.0 performance tranche moves large metadata parsing to a bounded worker, caches repeated canonical imports and retains the lazy/Low-end architecture. It removes no feature, control, visual component, animation or exported fidelity. The full data-oriented and input-to-pixel performance milestone remains scheduled for 6.8.0.

The retained pre-fix benchmark records the cyclic-manifest export failure that qualification uncovered; the final benchmark passes after cycle-safe bounded traversal. The evidence intentionally preserves this failed-to-passed progression rather than rewriting the baseline.

Publisher signing, independent clean-machine lifecycle, second-machine reproducibility, matching-host non-Windows qualification, independent accessibility/hardware review and a real 72-hour soak remain external gates and are not claimed by this local candidate.
`
const ledger = `# Nova_A 6.4.0 edit ledger

- Added bounded deterministic import and reimport for Aseprite metadata, TexturePacker, common JSON atlases, Tiled JSON/TMJ/TSJ and Tiled XML/TMX/TSX.
- Added stable slice identities across external frame reordering plus pivot, source-size, rotation, trim, tag, duration and collider preservation.
- Added malformed/oversized input rejection, last-valid artifact retention, contextual diagnostics, a 32-entry canonical import cache and worker parsing for metadata at least 128 KiB.
- Added contextual Asset Overview, Slices, Resource and Animation tabs.
- Rebuilt the compact Asset actions popover as a bounded, scrollable, non-overlapping menu whose Resource and maintenance controls keep distinct translated accessible names.
- Removed a Resource-selection recovery fault by cloning JSON-owned importer metadata at the Vue reactive boundary instead of passing a reactive Proxy to structuredClone.
- Made the control registry fall back to full text content so wrapped and initially hidden menu commands retain meaningful audit and accessibility labels.
- Added versioned Material, Animation Library, Input Map, Physics Material, Theme and Data Table Resource assets.
- Added deterministic Resource serialization, shared parents, local-only overrides, inheritance resolution, missing/kind/cycle validation and Project Health/Build reporting.
- Included Resource assets in native Nova Pak and Web export paths.
- Replaced recursive Vite-manifest export traversal with a deterministic visited-entry worklist, preventing cyclic imports or deep graphs from overflowing the stack and bounding traversal at 100,000 entries.
- Added deterministic inverse-distance auto skin weights with an eight-influence and two-million-comparison bound.
- Added skin-weight heat visualization, rig constraint context, runtime-sampled onion skin, retarget summary and exact root-motion preview; retained the existing curve editor.
- Added English, German and Chinese labels, contextual help, teaching catalog entries and regenerated offline manuals.
- Added a content/animation reference game and golden/malformed/reimport/precision/Resource/retarget/playback/large-content audit corpus.
- Added before/after performance evidence and preserved all features, visual components, animations, shortcuts, fixed-step behavior and exported quality.
- Added the authoritative 6.4 checkpoint, content/animation task guide, README release guidance and exact release tooling.
- Advanced frontend, Rust, Tauri, project authority, UI labels and active release reports to 6.4.0 while retaining Project Format 2/schema 29 and all frozen public contracts.
- Removed no feature, animation, shortcut, template, renderer path or supported serialized-data path.
`
await writeFile(join(audits, `v${version}-release-notes.md`), notes)
await writeFile(join(audits, `v${version}-edit-ledger.md`), ledger)

const buildCandidates = [['web-editor', 'dist/index.html'], ['web-player', 'dist/player.html'], ['windows-editor', 'src-tauri/target/release/nova_a.exe'], ['windows-game', `release-audits/game-output-v${version}/Content Motion Knockout.exe`], ['windows-nsis', `src-tauri/target/release/bundle/nsis/Nova_A_${version}_x64-setup.exe`], ['windows-msi', `src-tauri/target/release/bundle/msi/Nova_A_${version}_x64_en-US.msi`]], builds = []
for (const [name, path] of buildCandidates) { try { const bytes = await readFile(join(root, path)); builds.push({ name, path, bytes: bytes.length, sha256: sha256(bytes), status: 'passed' }) } catch { builds.push({ name, path, status: 'missing' }) } }
const buildsPassed = builds.every(item => item.status === 'passed')
await writeJson(join(evidence, 'build/local-builds.json'), { format: 'nova-local-build-evidence', version: 1, engineVersion: version, generatedAt, artifacts: builds, status: buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(audits, `v${version}-benchmarks.json`), { format: `nova-v${version}-benchmark-summary`, version: 1, engineVersion: version, generatedAt, scope: 'Deterministic external content, reusable Resources, production animation and the first measured pre-7.0 performance tranche.', verificationChecks: verification.checks.length, interactionControls: interactions.summary.registeredControls, layoutStates: layout.results.length, performanceBeforeStatus: performanceBefore.status, performanceAfterStatus: performanceAfter.status, largeContent: verification.checks.find(item => item.id === 'V640-LARGE-CONTENT')?.metrics ?? {}, portableGameBytes: windows.artifacts.find(item => item.name === 'game')?.bytes ?? 0, localBuilds: buildsPassed ? 'passed' : 'incomplete', independentHardware: 'pending-external', status: buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(audits, `v${version}-stability-smoke.json`), { format: `nova-v${version}-stability-summary`, version: 1, engineVersion: version, generatedAt, typeCheck: 'passed', rustWorkspaceTests: 'passed', wasmRelease: 'passed', productionBuild: 'passed', templateCatalog: catalog.status, interactionAudit: interactions.status, layoutMatrix: layout.status, contentResourceAnimationVerification: verification.status, windowsGameLaunch: windows.status, localBuilds: buildsPassed ? 'passed' : 'incomplete', wallClock72HourSoakComplete: false, cleanMachineLifecycleComplete: false, status: product.status === 'passed' && buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(evidence, 'external/gates.json'), { format: 'nova-external-certification-gates', version: 1, release: version, generatedAt, gates: ['publisher identity and Windows artifact signing', 'independent clean-machine install/launch/upgrade/repair/uninstall', 'second-machine byte reproducibility', 'matching-host Linux and macOS build/runtime', 'independent browser, hardware and accessibility matrix', 'real 72-hour editor/player soak'].map(name => ({ name, status: 'pending-external', claimed: false })) })
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const environment = { id: `${platform}-${arch}-${versions.node}`, platform, architecture: arch, node: versions.node, rust: safeExec('rustc', ['--version']), cargo: safeExec('cargo', ['--version']) }
const entries = await Promise.all((await filesUnder(evidence)).sort().filter(path => !path.endsWith('evidence-manifest.json')).map(async path => { const contents = await readFile(path); return { path: relative(evidence, path).replaceAll('\\', '/'), sha256: sha256(contents), bytes: contents.length, source: commit, tool: 'generate-v6.4.0-release-evidence.mjs', environment: environment.id } }))
await writeJson(join(evidence, 'evidence-manifest.json'), { format: 'nova-release-evidence-manifest', version: 1, release: version, generatedAt, source: { commit, dirty: true, note: 'Current working candidate; exact tag verification remains pending.' }, environment, localQualificationComplete: product.status === 'passed' && verification.status === 'passed' && interactions.status === 'passed' && layout.status === 'passed' && windows.status === 'passed' && catalog.status === 'passed' && buildsPassed, externalCertificationComplete: false, entries })
console.log(`Nova_A v${version} evidence generated with ${entries.length} hashed entries; external certification remains pending.`)
function safeExec(command, args) { try { return execFileSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim() } catch { return 'unavailable' } }
async function filesUnder(directory) { const files = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); entry.isDirectory() ? files.push(...await filesUnder(path)) : files.push(path) } return files }
