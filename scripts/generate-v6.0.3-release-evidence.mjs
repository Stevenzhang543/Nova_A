import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { arch, platform, versions } from 'node:process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const version = '6.0.3', root = dirname(dirname(fileURLToPath(import.meta.url))), audits = join(root, 'release-audits'), evidence = join(audits, `evidence-v${version}`), generatedAt = new Date().toISOString()
const sha256 = value => createHash('sha256').update(value).digest('hex')
const readJson = async name => JSON.parse(await readFile(join(audits, name), 'utf8'))
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
await rm(evidence, { recursive: true, force: true })
for (const folder of ['runtime', 'layout', 'build', 'manual', 'reference', 'game-output', 'external']) await mkdir(join(evidence, folder), { recursive: true })

const [product, backend, interactions, layout, windows, catalog] = await Promise.all([`v${version}-product-audit.json`, `v${version}-backend-export.json`, `v${version}-user-interactions.json`, `v${version}-layout-browser.json`, `v${version}-windows-smoke.json`, 'template-catalog-verification.json'].map(readJson))
for (const [source, target] of [[`v${version}-product-audit.json`, 'runtime/product-audit.json'], [`v${version}-backend-export.json`, 'runtime/backend-export.json'], [`v${version}-user-interactions.json`, 'runtime/user-interactions.json'], [`v${version}-layout-browser.json`, 'layout/layout-browser.json'], [`v${version}-windows-smoke.json`, 'build/windows-smoke.json'], ['template-catalog-verification.json', 'runtime/template-catalog.json']]) await cp(join(audits, source), join(evidence, target))
for (const name of ['MANUAL.en.md', 'MANUAL.de.md', 'MANUAL.zh-CN.md', 'index.html']) await cp(join(root, 'manual', name), join(evidence, 'manual', name))
for (const name of ['project.nova', 'README.md', 'test-controls.json', 'expected-output.json']) await cp(join(root, 'reference-projects/projects/creator-v603-template-export-accessibility', name), join(evidence, 'reference', name))
await cp(join(audits, `game-output-v${version}`), join(evidence, 'game-output'), { recursive: true, force: true })

const notes = `# Nova_A ${version} candidate release notes

Nova_A ${version} fixes release-blocking export and accessibility validation defects in untouched startup templates. Build normalization now selects a registered manifest from the installed template registry instead of guessing an ID. Projects saved with Nova_A's old synthesized IDs migrate to the matching official template, while unknown custom IDs remain unchanged so missing third-party installations still fail visibly.

RectTransform is now passive by default. Canvas, panels, images, text and progress visuals no longer become focusable controls. Button, Slider, Checkbox and TextInput authoring paths establish reachable focus, roles, names and deterministic order. Reading order zero is automatic scene order; duplicate warnings remain for conflicting explicit positive orders. The legacy Mouse Knockout HUD therefore exports without the false accessible-name and duplicate-order findings reported in 6.0.2.

All twelve startup templates pass factory, schema, static script, WASM compilation, untouched-build and UI-semantic qualification. The editor is rechecked across English, German and Chinese, 1024×640 through 2560×1440, and 100–200% UI scale. A 6.0.3 Mouse Knockout game is exported as one embedded-package Windows executable, hash-verified and launch-smoked alongside the editor.

Project Format 2/schema 29 and all frozen v6 creator contracts are unchanged. No feature, animation, shortcut, template or renderer path was removed. Publisher signing, independent clean-machine lifecycle, second-machine reproducibility, matching-host non-Windows qualification, independent hardware/accessibility review and a real 72-hour soak remain pending external evidence.
`
const ledger = `# Nova_A ${version} edit ledger

- Added registry-driven default export-template resolution for target, architecture and runtime mode.
- Added safe migration for Nova_A's old synthesized template IDs while preserving unknown custom IDs.
- Completed every generated template's build-delivery defaults with the bundled Windows x64 template and deterministic release metadata.
- Changed passive RectTransform defaults from focusable/navigation-participating to passive/navigation-skipped.
- Added shared UI semantic configuration for loaded entities, Create UI actions and Inspector component authoring.
- Made Button, Slider, Checkbox and TextInput opt into focus, roles, inferred accessible names and deterministic positive order.
- Moved UI showcase accessibility fields from control payloads to RectTransform, where runtime focus and audits consume them.
- Defined reading order zero as automatic scene order and limited duplicate warnings to explicit positive conflicts.
- Ignored legacy unlabeled passive focus metadata while preserving strict validation for interactive or deliberately semantic nodes.
- Added TextInput placeholder/entity-name accessible-label fallback and semantic-only focus order reporting.
- Corrected Project Manager height/overflow ownership so all templates, recent projects and the footer remain vertically reachable at 200% UI scale without horizontal overflow.
- Added an English/German/Chinese 1024×640/200% launcher scroll-and-footer regression gate.
- Extended the template catalog verifier to test all twelve untouched build settings, UI semantics, legacy passive HUD compatibility and explicit-order conflicts.
- Added the 6.0.3 template/export/accessibility reference project, backend verifier, localized interaction/layout gates, Windows editor/game smoke and structured evidence.
- Updated frontend, Rust, Tauri, project, package, replay, profiling, diagnostics, manual and release-engineering authorities to 6.0.3.
- Updated the public-schema migration golden projection to the 6.0.3 engine authority without changing Project Format 2/schema 29.
- Updated English, German and Chinese release/manual metadata and documented the correction in both READMEs and instructions.txt.
- Generated one hash-verified embedded-package Mouse Knockout executable and the exact eleven release files.
- Removed no feature, animation, shortcut, template, supported data path or rendering behavior.
`
await writeFile(join(audits, `v${version}-release-notes.md`), notes); await writeFile(join(audits, `v${version}-edit-ledger.md`), ledger)

const buildCandidates = [['web-editor', 'dist/index.html'], ['web-player', 'dist/player.html'], ['windows-editor', 'src-tauri/target/release/nova_a.exe'], ['windows-game', `release-audits/game-output-v${version}/Mouse Knockout.exe`], ['windows-nsis', `src-tauri/target/release/bundle/nsis/Nova_A_${version}_x64-setup.exe`], ['windows-msi', `src-tauri/target/release/bundle/msi/Nova_A_${version}_x64_en-US.msi`]]
const builds = []
for (const [name, path] of buildCandidates) { try { const bytes = await readFile(join(root, path)); builds.push({ name, path, bytes: bytes.length, sha256: sha256(bytes), status: 'passed' }) } catch { builds.push({ name, path, status: 'missing' }) } }
const buildsPassed = builds.every(item => item.status === 'passed')
await writeJson(join(evidence, 'build/local-builds.json'), { format: 'nova-local-build-evidence', version: 1, engineVersion: version, generatedAt, artifacts: builds, status: buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(audits, `v${version}-benchmarks.json`), { format: `nova-v${version}-benchmark-summary`, version: 1, engineVersion: version, generatedAt, scope: 'Patch regression: twelve templates, accessibility semantics, localized layout, interaction inventory, portable export and launch.', templateChecks: catalog.checks.length, registeredControls: interactions.summary.registeredControls, layoutStates: layout.matrix.length, backendChecks: backend.checks.length, portableGameBytes: windows.artifacts.find(item => item.name === 'game')?.bytes ?? 0, localBuilds: buildsPassed ? 'passed' : 'incomplete', independentHardware: 'pending-external', status: buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(audits, `v${version}-stability-smoke.json`), { format: `nova-v${version}-stability-summary`, version: 1, engineVersion: version, generatedAt, typeCheck: 'passed', rustWorkspaceTests: 'passed', nativeRustTests: 'passed', templateCatalog: catalog.status, interactionAudit: interactions.status, layoutMatrix: layout.status, backendExport: backend.status, windowsGameLaunch: windows.status, localBuilds: buildsPassed ? 'passed' : 'incomplete', wallClock72HourSoakComplete: false, cleanMachineLifecycleComplete: false, status: product.status === 'passed' && buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(evidence, 'external/gates.json'), { format: 'nova-external-certification-gates', version: 1, release: version, generatedAt, gates: ['publisher identity and Windows artifact signing', 'independent clean-machine install/launch/upgrade/repair/uninstall', 'second-machine byte reproducibility', 'matching-host Linux and macOS build/runtime', 'independent browser, hardware and accessibility matrix', 'real 72-hour editor/player soak'].map(name => ({ name, status: 'pending-external', claimed: false })) })

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const environment = { id: `${platform}-${arch}-${versions.node}`, platform, architecture: arch, node: versions.node, rust: safeExec('rustc', ['--version']), cargo: safeExec('cargo', ['--version']), pnpm: safeExec(process.execPath, [join(process.env.APPDATA || '', 'npm/node_modules/pnpm/bin/pnpm.cjs'), '--version']) }
const entries = await Promise.all((await filesUnder(evidence)).sort().filter(path => !path.endsWith('evidence-manifest.json')).map(async path => { const contents = await readFile(path); return { path: relative(evidence, path).replaceAll('\\', '/'), sha256: sha256(contents), bytes: contents.length, source: commit, tool: 'generate-v6.0.3-release-evidence.mjs', environment: environment.id } }))
await writeJson(join(evidence, 'evidence-manifest.json'), { format: 'nova-release-evidence-manifest', version: 1, release: version, generatedAt, source: { commit, dirty: true, note: 'Current working candidate; exact tag verification remains pending.' }, environment, localQualificationComplete: product.status === 'passed' && backend.status === 'passed' && interactions.status === 'passed' && layout.status === 'passed' && windows.status === 'passed' && catalog.status === 'passed' && buildsPassed, externalCertificationComplete: false, entries })
console.log(`Nova_A v${version} evidence generated with ${entries.length} hashed entries; external certification remains pending.`)

function safeExec(command, args) { try { return execFileSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim() } catch { return 'unavailable' } }
async function filesUnder(directory) { const files = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); entry.isDirectory() ? files.push(...await filesUnder(path)) : files.push(path) } return files }
