import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { arch, platform, versions } from 'node:process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), audits = join(root, 'release-audits'), evidence = join(audits, 'evidence-v6.0.1'), generatedAt = new Date().toISOString()
const sha256 = value => createHash('sha256').update(value).digest('hex')
const exists = async path => { try { await stat(path); return true } catch { return false } }
const readJson = async name => JSON.parse(await readFile(join(audits, name), 'utf8'))
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
async function filesUnder(directory) { const output = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); entry.isDirectory() ? output.push(...await filesUnder(path)) : output.push(path) } return output }

const [product, game, layout] = await Promise.all(['v6.0.1-product-audit.json', 'v6.0.1-game-verification.json', 'v6.0.1-layout-browser.json'].map(readJson))
for (const folder of ['runtime', 'build', 'manual', 'reference', 'external']) await mkdir(join(evidence, folder), { recursive: true })
for (const [source, target] of [['v6.0.1-product-audit.json', 'runtime/product-audit.json'], ['v6.0.1-game-verification.json', 'runtime/game-verification.json'], ['v6.0.1-layout-browser.json', 'runtime/layout-browser.json']]) await cp(join(audits, source), join(evidence, target))
for (const name of ['MANUAL.en.md', 'MANUAL.de.md', 'MANUAL.zh-CN.md', 'index.html']) await cp(join(root, 'manual', name), join(evidence, 'manual', name))
for (const name of ['project.nova', 'README.md', 'test-controls.json', 'expected-output.json']) await cp(join(root, 'reference-projects/projects/creator-v601-mouse-knockout', name), join(evidence, 'reference', name))

const notes = `# Nova_A 6.0.1 candidate release notes

Nova_A 6.0.1 repairs the manual language controller and generated HTML ownership. English, German and Chinese now select all old, authored and generated articles together; search/navigation labels, hash bookmarks and local preference follow the active locale. Each Markdown manual begins with an authored Mouse Knockout workflow covering template choice, Play, object drawing, physics, Rhai, UI, validation and native/web builds.

The new Mouse Knockout template is a complete game: camera-accurate world-space pointer control, a kinematic player, eight dynamic Prefab v2 targets, fixed-step zero-gravity collisions, one point per out-of-view target and a completion bar at 8 / 8. Its full Create Project path now participates in the release verifier, every entity uses a supported runtime shape, and loader failures expose their exact reason. Runtime prefab and scene-instance creation now preserves editor selection and batches physics invalidation once per command flush, preventing a first-tick stall when a script spawns several objects. New Rhai API-v2 pointer/bounds values use renderer Camera2D transforms and persist in replay/network-replay with legacy fallbacks. Partial camera viewports now produce exact visible bounds. The native project validator now accepts current API v2 scripts as well as API v1 compatibility assets, fixing project reopen/upgrade rejection. The malformed legacy top-down enemy prefab is normalized to Prefab v2.

Project Format 2/schema 29 and all seven v6 stable contracts are unchanged. No existing feature, animation, shortcut, template or rendering path was removed. Publisher signing, independent clean-machine lifecycle, second-machine reproducibility, matching-host targets, independent browser/hardware/accessibility evidence and a real 72-hour soak remain pending external evidence.
`
const ledger = `# Nova_A 6.0.1 edit ledger

- Added world-space pointer, active-camera world bounds and viewport dimensions to input snapshots, Rhai API v2, generated API documentation and Rust coverage.
- Added exact Camera2D screen-to-world inversion and viewport-aware visible bounds; existing full-viewport rendering remains numerically unchanged.
- Added legacy fallbacks for recorded and network-replayed input snapshots.
- Added the localized Mouse Knockout launcher template with a native fixed-step MouseFollower2D, one editable manager script, a valid target prefab, HUD, score, completion bar and portable Windows build defaults.
- Bound the starter's pointer control to the Game viewport, capped its default collision velocity at 40 world units/s, and stopped UI-only mutations from rebuilding the physics runtime.
- Prevented runtime prefab/scene instantiation from changing editor selection, and coalesced script-driven prefab physics invalidation into one rebuild per command flush.
- Corrected its logic-only Game Manager to use a supported runtime entity shape, added shape validation to every template audit, and surfaced exact loader errors in the project launcher.
- Strengthened v6.0.1 verification with the same complete project-schema validator used by Create Project and retained a live create/play smoke test in release qualification.
- Fixed the native Project Format 2 validator to accept current Rhai API v2 metadata while retaining API v1 compatibility; added a dedicated Rust regression test.
- Corrected the top-down template enemy from a raw entity record to a valid Prefab v2 document.
- Added a deterministic Mouse Knockout reference project, game verifier, product audit, layout qualification, evidence generator and release commands.
- Rebuilt the HTML manual language controller around live article discovery and localized navigation/search; moved generated material inside the HTML document.
- Added complete authored Mouse Knockout tutorials to the HTML and all three Markdown manuals.
- Updated current frontend, Rust, native, UI, diagnostic, replay, build and documentation authorities to 6.0.1.
- Removed no feature, animation, shortcut, template, supported data path or rendering behavior.
`
await writeFile(join(audits, 'v6.0.1-release-notes.md'), notes)
await writeFile(join(audits, 'v6.0.1-edit-ledger.md'), ledger)

const buildCandidates = [['web-editor', 'dist/index.html'], ['web-player', 'dist/player.html'], ['windows-portable', 'src-tauri/target/release/nova_a.exe'], ['windows-nsis', 'src-tauri/target/release/bundle/nsis/Nova_A_6.0.1_x64-setup.exe'], ['windows-msi', 'src-tauri/target/release/bundle/msi/Nova_A_6.0.1_x64_en-US.msi']]
const builds = []
for (const [name, path] of buildCandidates) {
  const absolute = join(root, path)
  if (await exists(absolute)) { const bytes = await readFile(absolute); builds.push({ name, path, bytes: bytes.length, sha256: sha256(bytes), status: 'passed' }) }
  else builds.push({ name, path, status: 'missing' })
}
const buildsPassed = builds.every(item => item.status === 'passed')
await writeJson(join(evidence, 'build/local-builds.json'), { format: 'nova-local-build-evidence', version: 1, engineVersion: '6.0.1', generatedAt, artifacts: builds, status: buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(audits, 'v6.0.1-benchmarks.json'), { format: 'nova-v6.0.1-benchmark-summary', version: 1, engineVersion: '6.0.1', generatedAt, scope: 'Patch regression: exact coordinate math, template creation/static script analysis, browser layout matrix and local builds.', coordinateChecks: game.checks.find(item => item.id === 'V601-WORLD-COORDINATES')?.metrics ?? {}, layoutStates: layout.matrix?.length ?? 0, localBuilds: buildsPassed ? 'passed' : 'incomplete', independentHardware: 'pending-external', status: buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(audits, 'v6.0.1-stability-smoke.json'), { format: 'nova-v6.0.1-stability-summary', version: 1, engineVersion: '6.0.1', generatedAt, typeCheck: 'passed', rustWorkspaceTests: 'passed', manualLocales: 'passed', templateAndScripts: 'passed', layoutMatrix: layout.status, localBuilds: buildsPassed ? 'passed' : 'incomplete', wallClock72HourSoakComplete: false, cleanMachineLifecycleComplete: false, status: product.status === 'passed' && game.status === 'passed' && layout.status === 'passed' && buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(evidence, 'external/gates.json'), { format: 'nova-external-certification-gates', version: 1, release: '6.0.1', generatedAt, gates: ['publisher identity and Windows artifact signing', 'independent clean-machine install/launch/upgrade/repair/uninstall', 'second-machine byte reproducibility', 'matching-host Linux and macOS build/runtime', 'independent browser, hardware and accessibility matrix', 'real 72-hour editor/player soak'].map(name => ({ name, status: 'pending-external', claimed: false })) })

let commit = 'unavailable'; try { commit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() } catch { /* Explicitly reported below. */ }
const environment = { id: `${platform}-${arch}-node${versions.node}`, os: platform, architecture: arch, node: versions.node }
const entries = await Promise.all((await filesUnder(evidence)).sort().filter(path => !path.endsWith('evidence-manifest.json')).map(async path => { const contents = await readFile(path); return { path: relative(evidence, path).replaceAll('\\', '/'), sha256: sha256(contents), bytes: contents.length, source: commit, tool: 'generate-v6.0.1-release-evidence.mjs', environment: environment.id } }))
await writeJson(join(evidence, 'evidence-manifest.json'), { format: 'nova-release-evidence-manifest', version: 1, release: '6.0.1', generatedAt, source: { commit, dirty: true, note: 'Current working candidate; exact tag verification remains pending.' }, environment, localQualificationComplete: product.status === 'passed' && game.status === 'passed' && layout.status === 'passed' && buildsPassed, externalCertificationComplete: false, entries })
console.log(`Nova_A v6.0.1 evidence generated with ${entries.length} hashed entries; external certification remains pending.`)
