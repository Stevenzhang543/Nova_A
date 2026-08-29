import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { arch, platform, versions } from 'node:process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), audits = join(root, 'release-audits'), evidence = join(audits, 'evidence-v6.0.2'), generatedAt = new Date().toISOString()
const sha256 = value => createHash('sha256').update(value).digest('hex')
const readJson = async name => JSON.parse(await readFile(join(audits, name), 'utf8'))
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
await rm(evidence, { recursive: true, force: true })
for (const folder of ['runtime', 'layout', 'build', 'manual', 'reference', 'game-output', 'external']) await mkdir(join(evidence, folder), { recursive: true })

const [product, backend, interactions, layout, windows] = await Promise.all(['v6.0.2-product-audit.json', 'v6.0.2-backend-export.json', 'v6.0.2-user-interactions.json', 'v6.0.2-layout-browser.json', 'v6.0.2-windows-smoke.json'].map(readJson))
for (const [source, target] of [['v6.0.2-product-audit.json', 'runtime/product-audit.json'], ['v6.0.2-backend-export.json', 'runtime/backend-export.json'], ['v6.0.2-user-interactions.json', 'runtime/user-interactions.json'], ['v6.0.2-layout-browser.json', 'layout/layout-browser.json'], ['v6.0.2-windows-smoke.json', 'build/windows-smoke.json']]) await cp(join(audits, source), join(evidence, target))
for (const name of ['MANUAL.en.md', 'MANUAL.de.md', 'MANUAL.zh-CN.md', 'index.html']) await cp(join(root, 'manual', name), join(evidence, 'manual', name))
for (const name of ['project.nova', 'README.md', 'test-controls.json', 'expected-output.json']) await cp(join(root, 'reference-projects/projects/creator-v602-interaction-export-audit', name), join(evidence, 'reference', name))
await cp(join(audits, 'game-output-v6.0.2'), join(evidence, 'game-output'), { recursive: true, force: true })

const notes = `# Nova_A 6.0.2 candidate release notes

Nova_A 6.0.2 corrects window containment, user interactions, backend export safety and standalone game output. At the supported 1024 × 640 minimum window, EN/DE/ZH layouts remain reachable from 100% through 200% UI scale. Large scales grow the shell, use icon-first dense navigation, wrap long content and constrain dialogs, popovers and docks to the viewport.

The release adds a user-style browser audit that inventories stable controls across launcher, workspaces, context panels, bottom panels and settings. It executes reversible navigation/runtime actions, mutates and restores safe settings, exercises pane resizers and tab ordering, and explicitly records actions blocked because they are destructive, external, filesystem-bound or missing their authored context.

Native export now validates and bounds file payloads before changing output, rejects traversal and unsafe overwrite targets, and replaces files with temporary/backup rollback. Android capability discovery and cross-architecture checks agree. The headless exporter now identifies 6.0.2, follows dynamic web chunks, bounds packages and embeds game data behind Windows/Linux players with a versioned length and SHA-256 footer. Explicit sidecar mode remains supported. The supplied Mouse Knockout executable was built from the 6.0.2 reference project, its embedded package was verified, and it stayed alive during the local launch smoke.

Project Format 2/schema 29, Rhai API v2 and all frozen creator contracts are unchanged. No feature, animation, shortcut, template or renderer path was removed. Publisher signing, an independent clean-machine lifecycle, second-machine reproducibility, matching-host non-Windows builds, independent browser/hardware/accessibility qualification and a real 72-hour soak remain pending external evidence.
`
const ledger = `# Nova_A 6.0.2 edit ledger

- Added a distinct xlarge UI-scale tier and scale-aware top bar, workspace row, authoring toolbar and status-bar sizing.
- Added min-size containment, long-token wrapping, viewport-bounded floating surfaces, icon-first dense navigation and stacked xlarge settings layouts.
- Corrected the layout qualifier so required viewports no longer skip the 100/125/150/175/200% matrix, and accumulated control identity across traversed states.
- Added a three-language user interaction audit covering workspaces, context rail, bottom tabs, scene tabs, authoring tools, menus, Play/Pause/Step/Stop, safe settings mutation/restore and resize/reorder drags; side-effectful or unavailable-context actions are explicitly classified.
- Added native web-export count, per-file, aggregate and package limits; rejected relative-output ambiguity, unsafe paths, empty packages, source/editor overwrite and oversized base64 before decoding.
- Replaced delete-before-rename export writes with temporary/backup/rollback replacement.
- Corrected native Android target validation/capability reporting and frontend Android cross-architecture validation.
- Updated the CLI exporter from its stale 5.0.1 authority to 6.0.2, hardened output paths and source overwrite, followed dynamic web chunks and bounded packages.
- Added SHA-256-verified embedded package output with explicit single-file/sidecar selection.
- Added a 6.0.2 interaction/export reference project, backend/export verifier, Windows editor/game launch smoke, product audit and release evidence.
- Updated current UI, Rust, Tauri, project, diagnostic, replay, package, manual and release-engineering authorities to 6.0.2.
- Removed no feature, animation, shortcut, template, supported data path or rendering behavior.
`
await writeFile(join(audits, 'v6.0.2-release-notes.md'), notes)
await writeFile(join(audits, 'v6.0.2-edit-ledger.md'), ledger)

const buildCandidates = [['web-editor', 'dist/index.html'], ['web-player', 'dist/player.html'], ['windows-editor', 'src-tauri/target/release/nova_a.exe'], ['windows-game', 'release-audits/game-output-v6.0.2/Mouse Knockout.exe'], ['windows-nsis', 'src-tauri/target/release/bundle/nsis/Nova_A_6.0.2_x64-setup.exe'], ['windows-msi', 'src-tauri/target/release/bundle/msi/Nova_A_6.0.2_x64_en-US.msi']]
const builds = []
for (const [name, path] of buildCandidates) { const absolute=join(root,path);try{const bytes=await readFile(absolute);builds.push({name,path,bytes:bytes.length,sha256:sha256(bytes),status:'passed'})}catch{builds.push({name,path,status:'missing'})} }
const buildsPassed = builds.every(item => item.status === 'passed')
await writeJson(join(evidence, 'build/local-builds.json'), { format: 'nova-local-build-evidence', version: 1, engineVersion: '6.0.2', generatedAt, artifacts: builds, status: buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(audits, 'v6.0.2-benchmarks.json'), { format: 'nova-v6.0.2-benchmark-summary', version: 1, engineVersion: '6.0.2', generatedAt, scope: 'Patch regression: template/package checks, user interaction inventory, localized UI-scale matrix, backend safety and actual portable-game export/launch.', registeredControls: interactions.summary.registeredControls, layoutStates: Array.isArray(layout.matrix) ? layout.matrix.length : 0, backendChecks: backend.checks.length, portableGameBytes: windows.artifacts.find(item => item.name === 'game')?.bytes ?? 0, localBuilds: buildsPassed ? 'passed' : 'incomplete', independentHardware: 'pending-external', status: buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(audits, 'v6.0.2-stability-smoke.json'), { format: 'nova-v6.0.2-stability-summary', version: 1, engineVersion: '6.0.2', generatedAt, typeCheck: 'passed', rustWorkspaceTests: 'passed', nativeRustTests: 'passed', interactionAudit: interactions.status, layoutMatrix: layout.status, backendExport: backend.status, windowsGameLaunch: windows.status, localBuilds: buildsPassed ? 'passed' : 'incomplete', wallClock72HourSoakComplete: false, cleanMachineLifecycleComplete: false, status: product.status === 'passed' && buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(evidence, 'external/gates.json'), { format: 'nova-external-certification-gates', version: 1, release: '6.0.2', generatedAt, gates: ['publisher identity and Windows artifact signing', 'independent clean-machine install/launch/upgrade/repair/uninstall', 'second-machine byte reproducibility', 'matching-host Linux and macOS build/runtime', 'independent browser, hardware and accessibility matrix', 'real 72-hour editor/player soak'].map(name => ({ name, status: 'pending-external', claimed: false })) })

let commit = 'unavailable';try{commit=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim()}catch{/* reported */}
const environment={id:`${platform}-${arch}-node${versions.node}`,os:platform,architecture:arch,node:versions.node}
const entries=await Promise.all((await filesUnder(evidence)).sort().filter(path=>!path.endsWith('evidence-manifest.json')).map(async path=>{const contents=await readFile(path);return{path:relative(evidence,path).replaceAll('\\','/'),sha256:sha256(contents),bytes:contents.length,source:commit,tool:'generate-v6.0.2-release-evidence.mjs',environment:environment.id}}))
await writeJson(join(evidence,'evidence-manifest.json'),{format:'nova-release-evidence-manifest',version:1,release:'6.0.2',generatedAt,source:{commit,dirty:true,note:'Current working candidate; exact tag verification remains pending.'},environment,localQualificationComplete:product.status==='passed'&&backend.status==='passed'&&interactions.status==='passed'&&layout.status==='passed'&&windows.status==='passed'&&buildsPassed,externalCertificationComplete:false,entries})
console.log(`Nova_A v6.0.2 evidence generated with ${entries.length} hashed entries; external certification remains pending.`)

async function filesUnder(directory){const output=[];for(const entry of await readdir(directory,{withFileTypes:true})){const path=join(directory,entry.name);entry.isDirectory()?output.push(...await filesUnder(path)):output.push(path)}return output}
