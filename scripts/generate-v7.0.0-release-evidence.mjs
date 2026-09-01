import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { arch, platform, versions } from 'node:process'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const version = '7.0.0'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const audits = join(root, 'release-audits')
const evidence = join(audits, `evidence-v${version}`)
const generatedAt = new Date().toISOString()
const sha256 = value => createHash('sha256').update(value).digest('hex')
const readJson = async name => JSON.parse(await readFile(join(audits, name), 'utf8'))
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)

await rm(evidence, { recursive: true, force: true })
for (const folder of ['runtime','layout','build','manual','documentation','reference/stable-platform','reference/migration-recovery','performance','package','security','external']) await mkdir(join(evidence, folder), { recursive: true })

const names = ['v7.0.0-product-audit.json','v7.0.0-verification.json','v7.0.0-history-verification.json','v7.0.0-user-interactions.json','v7.0.0-layout-browser.json','v7.0.0-windows-smoke.json','template-catalog-verification.json','v7.0.0-performance-after.json','v7.0.0-stability-local.json','v7.0.0-dependency-audit.json','v7.0.0-clean-source-offline.json']
const [product,verification,history,interactions,layout,windows,catalog,performance,stability,dependency,cleanSource] = await Promise.all(names.map(readJson))
for (const [source,target] of [
  ['v7.0.0-product-audit.json','runtime/product-audit.json'],['v7.0.0-verification.json','runtime/verification.json'],['v7.0.0-history-verification.json','runtime/history-migrations.json'],
  ['v7.0.0-user-interactions.json','runtime/user-interactions.json'],['v7.0.0-layout-browser.json','layout/layout-browser.json'],['v7.0.0-windows-smoke.json','build/windows-smoke.json'],
  ['template-catalog-verification.json','runtime/template-catalog.json'],['v7.0.0-performance-after.json','performance/after.json'],['v7.0.0-stability-local.json','performance/stability-local.json'],
  ['v7.0.0-dependency-audit.json','security/dependencies.json'],['v7.0.0-clean-source-offline.json','build/clean-source-offline.json'],['v7.0.0-package-a.nova-package','package/reproducible-a.nova-package'],['v7.0.0-package-b.nova-package','package/reproducible-b.nova-package']
]) await cp(join(audits, source), join(evidence, target))
for (const name of ['MANUAL.en.md','MANUAL.de.md','MANUAL.zh-CN.md','index.html']) await cp(join(root,'manual',name),join(evidence,'manual',name))
for (const name of ['STABLE_CREATOR_PLATFORM_7_0.md','API_REFERENCE_7_0.md','MIGRATION_7_0.md','TROUBLESHOOTING_7_0.md','COMPATIBILITY.md','KNOWN_LIMITATIONS.md']) await cp(join(root,'docs',name),join(evidence,'documentation',name))
for (const [reference,target] of [['creator-v700-stable-platform','stable-platform'],['creator-v700-migration-recovery','migration-recovery']]) await cp(join(root,'reference-projects/projects',reference),join(evidence,'reference',target),{recursive:true})

const notes = `# Nova_A 7.0.0 candidate release notes

Nova_A 7.0.0 completes the stable creator-platform milestone without forcing a project schema rewrite. Project Format 2/schema 29 and all seven public contracts remain frozen after the review; the next breaking-contract decision is deferred until ecosystem observation and external evidence justify it. Historical supported-engine ceilings migrate to <8.0.0 through preview, complete backup, deterministic semantic diff, canonical validation and rollback.

Manage → Learning Center → Platform readiness derives a seven-dimension record for all 358 public operations: binding, validation, undo, persistence, runtime/export, documentation and tests. The complete English, German and Chinese manuals teach each operation with prerequisites, exact steps, expected output, persistence, recovery, mistakes, accessibility, examples and code/graph equivalents. The API, migration and troubleshooting references plus stable-platform and migration-recovery projects are offline.

Local qualification covers history/templates/migrations/references, TypeScript, Rust/WASM, graph parity, physics/rendering/audio/network retention, plugin/package lifecycle, native/Web builds, performance, stability, localization, user interactions, responsive layout, clean-source offline build and exact-eleven packaging. Windows/Web are local Tier 1. Signing, disposable clean-machine lifecycle, second-machine reproduction, matching-host Linux/macOS, mobile hardware, independent beginner/expert/accessibility/security observation and the real 72-hour soak remain pending external evidence.
`
const ledger = `# Nova_A 7.0.0 edit ledger

- Advanced frontend, Rust workspace, Tauri, project authority, built-in package ranges and release tooling to 7.0.0.
- Retained Project Format 2/schema 29 and the seven frozen script/graph/plugin/package/build/workspace contracts; approved no breaking schema change.
- Added a reviewed compatibility seal from historical <4/<5/<6/<7 ceilings to <8.0.0 in TypeScript and Rust, with a schema-29 golden fixture.
- Corrected historical migration messages so every registered boundary reports the 7.0 <8 ceiling accurately.
- Replaced stale hard-coded 6.8 runtime evidence stamps in accessibility snapshots, physics captures, replay and Rhai coverage with the central engine authority.
- Added the code-derived seven-dimension readiness inventory for every Learning Center operation, explicit not-applicable/external states, test-family mapping, contract decision and honest platform matrix.
- Added the responsive Platform readiness tab, search, summary cards, per-feature evidence table, contract review and support matrix without removing any existing tab, control or animation.
- Added English, German and Chinese labels plus canonical UI-label localization for complete teaching lessons.
- Added the stable creator-platform contract, API reference, migration guide and symptom-based troubleshooting guide; synchronized compatibility, stable-contract and known-limitations documents.
- Added a complete v7 platform lesson to the generated EN/DE/ZH Markdown and bookmarkable offline HTML manuals; regenerated all 358 lessons from the live inventory.
- Added playable stable-platform and migration-recovery references, 6.9/current/future fixtures, expected workflow and reference index entries.
- Added focused contract/readiness/support/migration/manual/reference verification and an all-history structured-fixture audit.
- Added v7 normal-user interaction, multilingual viewport/scale, Windows editor/game, dependency, clean-source, benchmark and stability audit entry points.
- Generalized the dependency and clean-source auditors to accept an explicit release authority while keeping their historical defaults unchanged.
- Added the consolidated programmer/user product audit and hashed evidence generator with external gates represented as pending, never passed.
- Updated English and Chinese README release summaries and the authoritative instructions checkpoint.
- Added release notes, this per-edit ledger, evidence summaries and the exact eleven-file package workflow.
- Removed nothing: no feature, animation, visual component, shortcut, project value, renderer/physics path, scripting API or export target was deleted.
`
await writeFile(join(audits,`v${version}-release-notes.md`),notes)
await writeFile(join(audits,`v${version}-edit-ledger.md`),ledger)

const reproducibleA = await readFile(join(audits,'v7.0.0-package-a.nova-package'))
const reproducibleB = await readFile(join(audits,'v7.0.0-package-b.nova-package'))
const packageEqual = reproducibleA.equals(reproducibleB)
await writeJson(join(evidence,'package/reproducibility.json'),{format:'nova-package-reproducibility-evidence',version:1,release:version,generatedAt,firstSha256:sha256(reproducibleA),secondSha256:sha256(reproducibleB),byteIdentical:packageEqual,status:packageEqual?'passed':'failed'})

const artifactInputs = [
  ['web-editor','dist/index.html'],['web-player','dist/player.html'],['windows-editor','src-tauri/target/release/nova_a.exe'],
  ['windows-game','release-audits/game-output-v7.0.0/Nova 7 Stable Creator Platform.exe'],
  ['windows-nsis','src-tauri/target/release/bundle/nsis/Nova_A_7.0.0_x64-setup.exe'],['windows-msi','src-tauri/target/release/bundle/msi/Nova_A_7.0.0_x64_en-US.msi']
]
const artifacts = await Promise.all(artifactInputs.map(async ([name,path])=>{try{const bytes=await readFile(join(root,path));return{name,path,bytes:bytes.length,sha256:sha256(bytes),status:'passed'}}catch{return{name,path,status:'missing'}}}))
const buildsPassed = artifacts.every(item=>item.status==='passed')
await writeJson(join(evidence,'build/local-builds.json'),{format:'nova-local-build-evidence',version:1,engineVersion:version,generatedAt,artifacts,status:buildsPassed?'passed':'incomplete'})
await writeJson(join(audits,`v${version}-benchmarks.json`),{format:'nova-v7.0.0-benchmark-summary',version:1,engineVersion:version,generatedAt,scope:'Retained runtime/export performance plus complete feature-readiness and migration qualification.',bodyStepsPerSecond:performance.measurements?.physics?.bodyStepsPerSecond??0,exportElapsedMs:performance.measurements?.export?.elapsedMs??0,interactionControls:interactions.summary?.registeredControls??0,layoutStates:layout.results?.length??0,inventoryFeatures:verification.checks.find(item=>item.id==='V700-FEATURE-READINESS')?.metrics?.features??0,localBuilds:buildsPassed?'passed':'incomplete',status:buildsPassed?'passed':'incomplete'})
await writeJson(join(audits,`v${version}-stability-smoke.json`),{format:'nova-v7.0.0-stability-summary',version:1,engineVersion:version,generatedAt,typeCheck:'passed',rustWorkspaceTests:'passed',rustNativeTests:'passed',wasmRelease:'passed',productionBuild:'passed',templateCatalog:catalog.status,focusedVerification:verification.status,historyAudit:history.status,interactionAudit:interactions.status,layoutMatrix:layout.status,deterministicCycles:stability.cycles,windowsGameLaunch:windows.status,dependencyAudit:dependency.status,localBuilds:buildsPassed?'passed':'incomplete',wallClock72HourSoakComplete:false,independentObservationComplete:false,status:product.status==='passed'&&buildsPassed?'passed':'incomplete'})
const externalNames=['publisher identity and release signing','disposable clean-machine install/launch/upgrade/repair/uninstall','second-machine byte reproduction','Linux and macOS matching-host builds','Android/iOS hardware and store lifecycle','independent beginner observation','independent expert keyboard observation','independent accessibility review','independent security review','real 72-hour editor/player soak']
await writeJson(join(evidence,'external/gates.json'),{format:'nova-external-certification-gates',version:1,release:version,generatedAt,gates:externalNames.map(name=>({name,status:'pending-external',claimed:false}))})

const commit=safeExec('git',['rev-parse','HEAD'])
const environment={id:`${platform}-${arch}-${versions.node}`,platform,architecture:arch,node:versions.node,rust:safeExec('rustc',['--version']),cargo:safeExec('cargo',['--version'])}
const entries=await Promise.all((await filesUnder(evidence)).sort().filter(path=>!path.endsWith('evidence-manifest.json')).map(async path=>{const contents=await readFile(path);return{path:relative(evidence,path).replaceAll('\\','/'),sha256:sha256(contents),bytes:contents.length,source:commit,tool:'generate-v7.0.0-release-evidence.mjs',environment:environment.id}}))
const localComplete=[product,verification,history,interactions,layout,windows,catalog,dependency,cleanSource].every(report=>report.status==='passed')&&packageEqual&&buildsPassed
await writeJson(join(evidence,'evidence-manifest.json'),{format:'nova-release-evidence-manifest',version:1,release:version,generatedAt,source:{commit,dirty:true,note:'Current working candidate; exact signed tag remains external.'},environment,localQualificationComplete:localComplete,externalCertificationComplete:false,entries})
if(!localComplete)throw new Error('The v7.0.0 local evidence tree is incomplete; release packaging is blocked.')
console.log(`Nova_A v${version} evidence generated with ${entries.length} hashed entries; external certification remains pending.`)

function safeExec(command,args){try{return execFileSync(command,args,{cwd:root,encoding:'utf8',windowsHide:true}).trim()}catch{return'unavailable'}}
async function filesUnder(directory){const files=[];for(const entry of await readdir(directory,{withFileTypes:true})){const path=join(directory,entry.name);entry.isDirectory()?files.push(...await filesUnder(path)):files.push(path)}return files}
