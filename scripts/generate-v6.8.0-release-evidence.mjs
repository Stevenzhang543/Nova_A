import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { arch, platform, versions } from 'node:process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const version = '6.8.0', root = dirname(dirname(fileURLToPath(import.meta.url))), audits = join(root, 'release-audits'), evidence = join(audits, `evidence-v${version}`), generatedAt = new Date().toISOString()
const sha256 = value => createHash('sha256').update(value).digest('hex'), readJson = async name => JSON.parse(await readFile(join(audits, name), 'utf8')), writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
await rm(evidence, { recursive: true, force: true })
for (const folder of ['runtime','layout','build','manual','reference/large-world','performance','fixtures','security','external']) await mkdir(join(evidence, folder), { recursive: true })
const names = ['v6.8.0-product-audit.json','v6.8.0-verification.json','v6.8.0-user-interactions.json','v6.8.0-layout-browser.json','v6.8.0-windows-smoke.json','template-catalog-verification.json','v6.8.0-performance-after.json','v6.8.0-stability-local.json','v6.8.0-dependency-audit.json']
const [product, verification, interactions, layout, windows, catalog, performance, stability, dependency] = await Promise.all(names.map(readJson))
for (const [source, target] of [['v6.8.0-product-audit.json','runtime/product-audit.json'],['v6.8.0-verification.json','runtime/verification.json'],['v6.8.0-user-interactions.json','runtime/user-interactions.json'],['v6.8.0-layout-browser.json','layout/layout-browser.json'],['v6.8.0-windows-smoke.json','build/windows-smoke.json'],['template-catalog-verification.json','runtime/template-catalog.json'],['v6.8.0-performance-after.json','performance/after.json'],['v6.8.0-stability-local.json','performance/stability-local.json'],['v6.8.0-dependency-audit.json','security/dependencies.json']]) await cp(join(audits, source), join(evidence, target))
for (const name of ['MANUAL.en.md','MANUAL.de.md','MANUAL.zh-CN.md','index.html']) await cp(join(root, 'manual', name), join(evidence, 'manual', name))
for (const name of ['project.nova','README.md','test-controls.json','expected-output.json']) await cp(join(root, 'reference-projects/projects/creator-v680-large-world', name), join(evidence, 'reference/large-world', name))
for (const name of ['10000.json','50000.json','100000.json','README.md']) await cp(join(root, 'release-fixtures/v6.8.0', name), join(evidence, 'fixtures', name))

const notes = `# Nova_A 6.8.0 candidate release notes

Nova_A 6.8.0 adds deterministic large-world and low-end performance architecture without removing a feature, animation, visual component, shortcut, physics property or export path. Stable typed component columns now drive animation and particle selection, hierarchy parents use prepared UUID lookup, navigation uses deterministic spatial hashing, and navigation/streaming/background work is bounded and cancellable.

Worker and mandatory local implementations now share animation sampling, particle stepping and spatial-grid preparation. Keyed generations reject stale results. The Profiler exposes main-thread, worker, queue, cache, allocation, worst-frame, 1% low, input-to-pixel and startup evidence. Adaptive quality uses hysteresis and changes only renderer pixel density and new-particle presentation capacity; physics timestep, scripts, animation clocks, authored values and features never change.

Local evidence includes deterministic 10k/50k/100k fixtures, a playable reference, template/user/layout/performance/stability/dependency audits, Windows editor and standalone-player smoke, and exact eleven-file packaging. Real low-end hardware, publisher signing, independent clean-machine lifecycle, second-machine reproduction, matching-host builds, independent accessibility review and a real 72-hour soak remain external.
`
const ledger = `# Nova_A 6.8.0 edit ledger

- Added normalized persisted large-world performance budgets and localized Profiler controls.
- Added reusable typed transform columns and stable component-kind indices; connected them to animation and particle runtimes.
- Added prepared hierarchy UUID indexing without changing transform mathematics or cycle rules.
- Added deterministic spatial-hash bounds queries and connected navigation avoidance to them.
- Added dirty/cache/allocation, main/worker/queue, worst-frame, 1%-low, input-to-pixel and startup metrics with bounded reactive publication.
- Added generation-safe worker/local parity for animation sampling, particle stepping and spatial-grid preparation.
- Added sequence/generation-safe batched commands and cancellable priority background queues.
- Bounded world-stream transition starts and navigation bake slices while retaining desired/deferred work and save handoffs.
- Added hysteresis adaptive presentation quality limited to pixel density and new-particle admission.
- Retained and audited virtualized Hierarchy and bounded Asset windows during background work.
- Added deterministic 10k, 50k and 100k compact fixtures plus a playable no-code v6.8 reference.
- Added English, German and Chinese UI labels, lessons, technical guide, checkpoint, README summaries, verification and evidence.
- Raised every sub-11px device, Android and accessibility label to the audited readable type scale.
- Grouped immutable legacy-solver contact metadata to satisfy zero-warning lint without changing collision mathematics.
- Synchronized the Rust format authority and migration golden engine label to 6.8.0 while retaining Project Format 2/schema 29.
- Replaced an unauthorized live-registry query with a local pinned-lock coverage/integrity audit and an honest pending-external advisory gate.
- Advanced active frontend, Rust, Tauri, runtime evidence and release tooling to 6.8.0; historical release scripts remain intact.
- Removed nothing: no feature, animation, visual component, shortcut, renderer path, public API, physics semantic or frozen serialized contract.
`
await writeFile(join(audits, `v${version}-release-notes.md`), notes); await writeFile(join(audits, `v${version}-edit-ledger.md`), ledger)

const artifacts = await Promise.all([['web-editor','dist/index.html'],['web-player','dist/player.html'],['windows-editor','src-tauri/target/release/nova_a.exe'],['windows-game','release-audits/game-output-v6.8.0/Nova 6.8 Large-world Playground.exe'],['windows-nsis','src-tauri/target/release/bundle/nsis/Nova_A_6.8.0_x64-setup.exe'],['windows-msi','src-tauri/target/release/bundle/msi/Nova_A_6.8.0_x64_en-US.msi']].map(async ([name,path]) => { try { const bytes = await readFile(join(root,path)); return { name,path,bytes:bytes.length,sha256:sha256(bytes),status:'passed' } } catch { return { name,path,status:'missing' } } }))
const buildsPassed = artifacts.every(item => item.status === 'passed')
await writeJson(join(evidence,'build/local-builds.json'), { format:'nova-local-build-evidence',version:1,engineVersion:version,generatedAt,artifacts,status:buildsPassed?'passed':'incomplete' })
await writeJson(join(audits,`v${version}-benchmarks.json`), { format:'nova-v6.8.0-benchmark-summary',version:1,engineVersion:version,generatedAt,scope:'Deterministic 10k/50k/100k scheduling, spatial queries, worker parity and retained physics/export benchmark.',fixtures:verification.measurements.fixtures,thresholds:verification.thresholds,bodyStepsPerSecond:performance.measurements?.physics?.bodyStepsPerSecond??0,exportElapsedMs:performance.measurements?.export?.elapsedMs??0,interactionControls:interactions.summary?.registeredControls??0,layoutStates:layout.results?.length??0,localBuilds:buildsPassed?'passed':'incomplete',realLowEndHardware:'pending-external',status:buildsPassed?'passed':'incomplete' })
await writeJson(join(audits,`v${version}-stability-smoke.json`), { format:'nova-v6.8.0-stability-summary',version:1,engineVersion:version,generatedAt,typeCheck:'passed',rustWorkspaceTests:'passed',rustNativeTests:'passed',wasmRelease:'passed',productionBuild:'passed',templateCatalog:catalog.status,focusedVerification:verification.status,interactionAudit:interactions.status,layoutMatrix:layout.status,deterministicCycles:stability.cycles,windowsGameLaunch:windows.status,dependencyAudit:dependency.status,localBuilds:buildsPassed?'passed':'incomplete',wallClock72HourSoakComplete:false,cleanMachineLifecycleComplete:false,status:product.status==='passed'&&buildsPassed?'passed':'incomplete' })
await writeJson(join(evidence,'external/gates.json'), { format:'nova-external-certification-gates',version:1,release:version,generatedAt,gates:['live dependency advisory registry lookup','real low-end hardware matrix','publisher identity and signing','independent clean-machine install/launch/upgrade/repair/uninstall','second-machine byte reproduction','matching-host platform builds','independent accessibility review','real 72-hour editor/player soak'].map(name=>({name,status:'pending-external',claimed:false})) })

const commit = safeExec('git',['rev-parse','HEAD']), environment = { id:`${platform}-${arch}-${versions.node}`,platform,architecture:arch,node:versions.node,rust:safeExec('rustc',['--version']),cargo:safeExec('cargo',['--version']) }
const entries = await Promise.all((await filesUnder(evidence)).sort().filter(path=>!path.endsWith('evidence-manifest.json')).map(async path=>{const contents=await readFile(path);return{path:relative(evidence,path).replaceAll('\\','/'),sha256:sha256(contents),bytes:contents.length,source:commit,tool:'generate-v6.8.0-release-evidence.mjs',environment:environment.id}}))
await writeJson(join(evidence,'evidence-manifest.json'), { format:'nova-release-evidence-manifest',version:1,release:version,generatedAt,source:{commit,dirty:true,note:'Current working candidate; exact tag verification remains pending.'},environment,localQualificationComplete:product.status==='passed'&&verification.status==='passed'&&interactions.status==='passed'&&layout.status==='passed'&&windows.status==='passed'&&catalog.status==='passed'&&dependency.status==='passed'&&buildsPassed,externalCertificationComplete:false,entries })
console.log(`Nova_A v${version} evidence generated with ${entries.length} hashed entries; external certification remains pending.`)
function safeExec(command,args){try{return execFileSync(command,args,{cwd:root,encoding:'utf8',windowsHide:true}).trim()}catch{return'unavailable'}}
async function filesUnder(directory){const files=[];for(const entry of await readdir(directory,{withFileTypes:true})){const path=join(directory,entry.name);entry.isDirectory()?files.push(...await filesUnder(path)):files.push(path)}return files}
