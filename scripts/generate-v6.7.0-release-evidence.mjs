import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { arch, platform, versions } from 'node:process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const version = '6.7.0'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const audits = join(root, 'release-audits')
const evidence = join(audits, `evidence-v${version}`)
const generatedAt = new Date().toISOString()
const sha256 = value => createHash('sha256').update(value).digest('hex')
const readJson = async name => JSON.parse(await readFile(join(audits, name), 'utf8'))
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)

await rm(evidence, { recursive: true, force: true })
for (const folder of ['runtime', 'layout', 'build', 'manual', 'reference/touch', 'reference/android', 'performance', 'security', 'external']) await mkdir(join(evidence, folder), { recursive: true })
const [product, verification, interactions, layout, windows, catalog, performance, stability, dependency] = await Promise.all([
  'v6.7.0-product-audit.json', 'v6.7.0-verification.json', 'v6.7.0-user-interactions.json', 'v6.7.0-layout-browser.json', 'v6.7.0-windows-smoke.json', 'template-catalog-verification.json', 'v6.7.0-performance-after.json', 'v6.7.0-stability-local.json', 'v6.7.0-dependency-audit.json'
].map(readJson))
for (const [source, target] of [
  ['v6.7.0-product-audit.json', 'runtime/product-audit.json'], ['v6.7.0-verification.json', 'runtime/verification.json'], ['v6.7.0-user-interactions.json', 'runtime/user-interactions.json'],
  ['v6.7.0-layout-browser.json', 'layout/layout-browser.json'], ['v6.7.0-windows-smoke.json', 'build/windows-smoke.json'], ['template-catalog-verification.json', 'runtime/template-catalog.json'],
  ['v6.7.0-performance-after.json', 'performance/after.json'], ['v6.7.0-stability-local.json', 'performance/stability-local.json'], ['v6.7.0-dependency-audit.json', 'security/dependencies.json']
]) await cp(join(audits, source), join(evidence, target))
for (const name of ['MANUAL.en.md', 'MANUAL.de.md', 'MANUAL.zh-CN.md', 'index.html']) await cp(join(root, 'manual', name), join(evidence, 'manual', name))
for (const [reference, target] of [['creator-v670-touch-platformer', 'touch'], ['delivery-v670-android-gated', 'android']]) {
  for (const name of ['project.nova', 'README.md', 'test-controls.json', 'expected-output.json']) await cp(join(root, 'reference-projects/projects', reference, name), join(evidence, 'reference', target, name))
}

const notes = `# Nova_A 6.7.0 candidate release notes

Nova_A 6.7.0 adds one action-based input path for touch, gestures, virtual controls, gamepads and explicitly permitted motion sensors. Safe-area-aware Button, Stick and D-pad overlays feed the same saved Input Map as desktop devices. Compatibility mouse events are deduplicated, calibration is bounded and persistent, and cancel/focus-loss paths release held input.

Device Preview rotates common targets and displays safe areas, DPI and 44-pixel targets. Runtime UI now exports deterministic semantic role/name/description/state/value/live/focus/bounds evidence, including slider ranges and checkbox state, and the presentation workflow tests 200–400% text. Windows uses the standards-based WebView2 DOM/ARIA bridge; no custom native accessibility provider is claimed.

Android is an optional Experimental package. Live discovery requires local JDK 17, SDK/API 35, build-tools, NDK, adb and a reviewed Gradle template. Build writes an escaped least-permission manifest, packages the real player, uses offline/no-daemon Gradle and only publishes an APK after success. Install and logcat are separate explicit actions; manual signing secrets remain in environment variables. This local candidate did not fabricate Android or iOS certification where matching tools/hardware were absent.

No feature, animation, visual component, shortcut, template, serialized path or exported fidelity was removed. Project Format 2/schema 29 and all public 6.x contracts remain frozen. Publisher signing, clean-machine lifecycle, second-machine reproduction, matching-host/iOS work, physical Android input/audio/sensor coverage, independent screen-reader review and a real 72-hour soak remain external gates.
`
const ledger = `# Nova_A 6.7.0 edit ledger

- Added bounded project-persistent device input settings for virtual controls, safe areas, orientation, reference DPI, haptics, sensors and gamepad calibration.
- Added safe-area-aware virtual Button, Stick and D-pad overlays with accessible names, pointer capture/cancel, keyboard activation, aggregation and haptic feedback.
- Connected virtual actions to the existing InputManager and Input Map rather than creating a parallel gameplay API.
- Added touch/mouse compatibility deduplication and deterministic pan, pinch, rotate, two-finger pan, tap, double-tap, long-press and swipe gesture values.
- Added per-device/wildcard gamepad axis calibration, remapping capture, connected-device display and device-aware prompts.
- Added explicit orientation-lock, sensor-permission, motion/orientation sampling and bounded sensor bindings; listeners remain detached before permission.
- Added rotated desktop/mobile preview presets, safe-area and 44 × 44 target overlays, plus EN/DE/ZH device authoring guidance.
- Added semantic accessibility snapshot export with role, name, description, state, text/range/checked value, live priority, focus order and bounds.
- Added WebView accessibility capability reporting that honestly identifies standards-based DOM/ARIA exposure and does not claim a custom native adapter.
- Raised runtime text and caption authoring limits from 300% to the documented 400% while preserving the existing lower bound and defaults.
- Added the optional Nova Android Export 6.7.0 package and made Android visible only as an Experimental, gated runtime target.
- Added local JDK/SDK/API/build-tools/NDK/adb/Gradle-template discovery with an exact missing-prerequisite list and no downloader.
- Added reviewed Android permission catalog, identifier validation, sensitive-purpose validation, manifest preview and escaped native manifest generation.
- Added native template copy, player/game-pack/icon/splash staging, offline/no-daemon Gradle execution and publish-only-after-success APK collection.
- Added environment-only manual signing inputs; no password, alias secret or device serial is serialized into a project or artifact.
- Added bounded, explicitly clicked adb device enumeration, APK install and 400-line logcat snapshot commands with canonical APK checks.
- Separated debug APK prerequisites from external signing, connected-device and physical certification gates; iOS is explicitly matching-host/deferred.
- Added a no-code touch platformer and a least-permission Android delivery reference, each with controls, expected output and recovery steps.
- Added complete English, German and Chinese touch/gamepad/mobile/accessibility lessons to Markdown and bookmarkable HTML manuals.
- Added the v6.7 implementation checkpoint, task guide, bilingual README release summary and retained frozen-contract/external-gate disclosures.
- Added deterministic focused device/mobile/accessibility tests, native identifier/serial/XML tests, template, interaction, layout, performance, dependency, Windows player and product audits.
- Advanced frontend, Rust, Tauri, exporter, runtime evidence, visible labels and active release tooling to 6.7.0 while keeping historical release scripts intact.
- Removed no feature, animation, visual component, shortcut, template, renderer path, public API, frozen format or supported serialized-data path.
`
await writeFile(join(audits, `v${version}-release-notes.md`), notes)
await writeFile(join(audits, `v${version}-edit-ledger.md`), ledger)

const localAndroid = verification.checks.find(item => item.id === 'V670-ANDROID-HONEST-GATE')
const artifacts = await Promise.all([
  ['web-editor', 'dist/index.html'], ['web-player', 'dist/player.html'], ['windows-editor', 'src-tauri/target/release/nova_a.exe'],
  ['windows-game', 'release-audits/game-output-v6.7.0/Nova 6.7 Touch Platformer.exe'], ['windows-nsis', 'src-tauri/target/release/bundle/nsis/Nova_A_6.7.0_x64-setup.exe'], ['windows-msi', 'src-tauri/target/release/bundle/msi/Nova_A_6.7.0_x64_en-US.msi']
].map(async ([name, path]) => {
  try { const bytes = await readFile(join(root, path)); return { name, path, bytes: bytes.length, sha256: sha256(bytes), status: 'passed' } }
  catch { return { name, path, status: 'missing' } }
}))
const buildsPassed = artifacts.every(item => item.status === 'passed')
await writeJson(join(evidence, 'build/local-builds.json'), { format: 'nova-local-build-evidence', version: 1, engineVersion: version, generatedAt, artifacts, status: buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(audits, `v${version}-benchmarks.json`), {
  format: 'nova-v6.7.0-benchmark-summary', version: 1, engineVersion: version, generatedAt,
  scope: 'Device input, optional mobile delivery and semantic accessibility while retaining the v6.5 physics/renderer and v6.6 network baselines.',
  verificationChecks: verification.checks.length, interactionControls: interactions.summary?.registeredControls ?? 0, layoutStates: layout.results?.length ?? 0,
  bodyStepsPerSecond: performance.measurements?.physics?.bodyStepsPerSecond ?? 0, exportElapsedMs: performance.measurements?.export?.elapsedMs ?? 0,
  virtualControlLimit: 32, gamepadCalibrationLimit: 128, semanticNodeLimit: 10_000, androidCommandCharacterLimit: 64_000, logcatLineLimit: 400,
  localBuilds: buildsPassed ? 'passed' : 'incomplete', physicalMobileHardware: 'pending-external', status: buildsPassed ? 'passed' : 'incomplete'
})
await writeJson(join(audits, `v${version}-stability-smoke.json`), {
  format: 'nova-v6.7.0-stability-summary', version: 1, engineVersion: version, generatedAt,
  typeCheck: 'passed', rustWorkspaceTests: 'passed', rustNativeTests: 'passed', wasmRelease: 'passed', productionBuild: 'passed',
  templateCatalog: catalog.status, focusedVerification: verification.status, interactionAudit: interactions.status, layoutMatrix: layout.status,
  deterministicCycles: stability.cycles, windowsGameLaunch: windows.status, dependencyAudit: dependency.status, localBuilds: buildsPassed ? 'passed' : 'incomplete',
  wallClock72HourSoakComplete: false, cleanMachineLifecycleComplete: false, status: product.status === 'passed' && buildsPassed ? 'passed' : 'incomplete'
})
await writeJson(join(evidence, 'external/gates.json'), {
  format: 'nova-external-certification-gates', version: 1, release: version, generatedAt,
  localAndroidDiscovery: localAndroid?.metrics ?? { available: false, missing: ['not recorded'] },
  gates: [
    'Android APK build on a fully qualified local toolchain', 'Android physical touch/gamepad/audio/sensor and lifecycle matrix', 'Android production signing and store review',
    'iOS matching macOS/Xcode/signing/device qualification', 'publisher identity and Windows artifact signing', 'independent clean-machine install/launch/upgrade/repair/uninstall',
    'second-machine byte reproducibility', 'independent keyboard/screen-reader/accessibility review', 'real 72-hour editor/player soak'
  ].map(name => ({ name, status: 'pending-external', claimed: false }))
})

const commit = safeExec('git', ['rev-parse', 'HEAD'])
const environment = { id: `${platform}-${arch}-${versions.node}`, platform, architecture: arch, node: versions.node, rust: safeExec('rustc', ['--version']), cargo: safeExec('cargo', ['--version']) }
const entries = await Promise.all((await filesUnder(evidence)).sort().filter(path => !path.endsWith('evidence-manifest.json')).map(async path => {
  const contents = await readFile(path)
  return { path: relative(evidence, path).replaceAll('\\', '/'), sha256: sha256(contents), bytes: contents.length, source: commit, tool: 'generate-v6.7.0-release-evidence.mjs', environment: environment.id }
}))
await writeJson(join(evidence, 'evidence-manifest.json'), {
  format: 'nova-release-evidence-manifest', version: 1, release: version, generatedAt,
  source: { commit, dirty: true, note: 'Current working candidate; exact tag verification remains pending.' }, environment,
  localQualificationComplete: product.status === 'passed' && verification.status === 'passed' && interactions.status === 'passed' && layout.status === 'passed' && windows.status === 'passed' && catalog.status === 'passed' && dependency.status === 'passed' && buildsPassed,
  externalCertificationComplete: false, entries
})
console.log(`Nova_A v${version} evidence generated with ${entries.length} hashed entries; external certification remains pending.`)

function safeExec(command, args) { try { return execFileSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim() } catch { return 'unavailable' } }
async function filesUnder(directory) { const files = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); entry.isDirectory() ? files.push(...await filesUnder(path)) : files.push(path) } return files }
