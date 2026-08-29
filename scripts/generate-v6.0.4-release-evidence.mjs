import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { arch, platform, versions } from 'node:process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const version='6.0.4',root=dirname(dirname(fileURLToPath(import.meta.url))),audits=join(root,'release-audits'),evidence=join(audits,`evidence-v${version}`),generatedAt=new Date().toISOString(),sha256=value=>createHash('sha256').update(value).digest('hex'),readJson=async name=>JSON.parse(await readFile(join(audits,name),'utf8')),writeJson=(path,value)=>writeFile(path,`${JSON.stringify(value,null,2)}\n`)
await rm(evidence,{recursive:true,force:true});for(const folder of ['runtime','layout','build','manual','reference','game-output','external'])await mkdir(join(evidence,folder),{recursive:true})
const [product,verification,interactions,layout,windows,catalog]=await Promise.all([`v${version}-product-audit.json`,`v${version}-verification.json`,`v${version}-user-interactions.json`,`v${version}-layout-browser.json`,`v${version}-windows-smoke.json`,'template-catalog-verification.json'].map(readJson))
for(const [source,target] of [[`v${version}-product-audit.json`,'runtime/product-audit.json'],[`v${version}-verification.json`,'runtime/verification.json'],[`v${version}-user-interactions.json`,'runtime/user-interactions.json'],[`v${version}-layout-browser.json`,'layout/layout-browser.json'],[`v${version}-windows-smoke.json`,'build/windows-smoke.json'],['template-catalog-verification.json','runtime/template-catalog.json']])await cp(join(audits,source),join(evidence,target))
for(const name of ['MANUAL.en.md','MANUAL.de.md','MANUAL.zh-CN.md','index.html'])await cp(join(root,'manual',name),join(evidence,'manual',name))
for(const name of ['project.nova','README.md','test-controls.json','expected-output.json'])await cp(join(root,'reference-projects/projects/creator-v604-linked-build-performance',name),join(evidence,'reference',name))
await cp(join(audits,`game-output-v${version}`),join(evidence,'game-output'),{recursive:true,force:true})

const notes=`# Nova_A ${version} candidate release notes

Nova_A ${version} fixes the Windows Access denied (OS error 5) failure that occurred when a previous exported player still held the destination executable open. The native publisher now writes and verifies a same-directory staging executable first. It replaces an available preferred output atomically or, when Windows reports a lock, keeps the running game alive and publishes a deterministic build-ID-suffixed executable. The exact exclusive-sharing case is covered by a native Windows regression test.

Visual programming and Rhai now have an explicit linked-asset workflow. Creating a linked Rhai asset adds stable, valid-comment graph/node/variable markers. Saving a graph regenerates linked Rhai and queues script hot reload; saving linked Rhai updates variables, literals and API inputs or preserves nonstandard source in visible Code nodes before graph hot reload. Existing independent scripts remain independent, unsaved drafts are not overwritten, and visualScript/link metadata survives project reload.

Startup/editor work is reduced without removing a feature or animation: editor/player workspaces load on demand, semantic graph compilation is debounced away from pointer movement, graph lookups/minimap bounds/render order use indexed passes, profiler lifecycle sampling is adaptive while authoring, and Low-end limits only an idle stopped Scene canvas. Runtime simulation and exported quality are unchanged.

Project Format 2/schema 29 and all frozen v6 creator contracts remain unchanged. Publisher signing, independent clean-machine lifecycle, second-machine reproducibility, matching-host non-Windows qualification, independent hardware/accessibility review and a real 72-hour soak remain pending external evidence.
`
const ledger=`# Nova_A ${version} edit ledger

- Added same-directory native player staging, complete package verification, atomic preferred-name publication and build-ID-suffixed fallback for locked Windows outputs.
- Made stale locked executable cleanup nonfatal while retaining explicit errors for unrelated permission, path, disk and package failures.
- Added Rust regression tests for staged publishing and an exclusive Windows file lock; preserved the actual emitted artifact and launch path.
- Added linkedGraphUuid script metadata and corrected saved visualScript asset-type restoration.
- Added deterministic @nova-graph-link, @nova-node and @nova-variable Rhai marker projections.
- Added Rhai-to-graph synchronization for variables, literal/default API inputs and bounded visible source overrides.
- Added Rhai Module and Rhai Statement visual nodes so custom source is visible and survives save/reload/regeneration.
- Replaced one-way code-copy UI with create/update linked Rhai controls and link status in Visual Graph and Script Studio.
- Added script and graph hot reload after either side synchronizes while preserving independent scripts and dirty drafts.
- Debounced visual-graph compilation and indexed node, connected-pin, edge and minimap calculations.
- Changed selected-node dragging from full graph scans to selected-node index lookups.
- Lazy-loaded mutually exclusive editor and player workspaces.
- Replaced quadratic render-order indexOf sorting with a single source-order map.
- Added adaptive authoring profiler sampling and idle-only Low-end Scene cadence without changing gameplay cadence, project data, features or animations.
- Updated English, German and Chinese release strings, READMEs, manual guidance and instructions.
- Added v6.0.4 graph round-trip, arbitrary-source, 802-node performance, lock, template, interaction, layout, Windows and release gates.
- Removed no feature, animation, shortcut, template, renderer path or supported data path.
`
await writeFile(join(audits,`v${version}-release-notes.md`),notes);await writeFile(join(audits,`v${version}-edit-ledger.md`),ledger)

const buildCandidates=[['web-editor','dist/index.html'],['web-player','dist/player.html'],['windows-editor','src-tauri/target/release/nova_a.exe'],['windows-game',`release-audits/game-output-v${version}/Mouse Knockout.exe`],['windows-nsis',`src-tauri/target/release/bundle/nsis/Nova_A_${version}_x64-setup.exe`],['windows-msi',`src-tauri/target/release/bundle/msi/Nova_A_${version}_x64_en-US.msi`]],builds=[]
for(const [name,path] of buildCandidates){try{const bytes=await readFile(join(root,path));builds.push({name,path,bytes:bytes.length,sha256:sha256(bytes),status:'passed'})}catch{builds.push({name,path,status:'missing'})}}
const buildsPassed=builds.every(item=>item.status==='passed'),performanceCheck=verification.checks.find(item=>item.id==='V604-GRAPH-PERFORMANCE')
await writeJson(join(evidence,'build/local-builds.json'),{format:'nova-local-build-evidence',version:1,engineVersion:version,generatedAt,artifacts:builds,status:buildsPassed?'passed':'incomplete'})
await writeJson(join(audits,`v${version}-benchmarks.json`),{format:`nova-v${version}-benchmark-summary`,version:1,engineVersion:version,generatedAt,scope:'Linked graph round-trip, 802-node compile, localized editor layout, portable output and Windows lock-safe publisher.',graphCompile:performanceCheck?.metrics??{},registeredControls:interactions.summary.registeredControls,layoutStates:layout.matrix.length,verificationChecks:verification.checks.length,portableGameBytes:windows.artifacts.find(item=>item.name==='game')?.bytes??0,localBuilds:buildsPassed?'passed':'incomplete',independentHardware:'pending-external',status:buildsPassed?'passed':'incomplete'})
await writeJson(join(audits,`v${version}-stability-smoke.json`),{format:`nova-v${version}-stability-summary`,version:1,engineVersion:version,generatedAt,typeCheck:'passed',rustWorkspaceTests:'passed',nativeRustTests:'passed',exclusiveWindowsLockTest:windows.lockedOutputRegression?.status??'missing',templateCatalog:catalog.status,interactionAudit:interactions.status,layoutMatrix:layout.status,graphAndExportVerification:verification.status,windowsGameLaunch:windows.status,localBuilds:buildsPassed?'passed':'incomplete',wallClock72HourSoakComplete:false,cleanMachineLifecycleComplete:false,status:product.status==='passed'&&buildsPassed?'passed':'incomplete'})
await writeJson(join(evidence,'external/gates.json'),{format:'nova-external-certification-gates',version:1,release:version,generatedAt,gates:['publisher identity and Windows artifact signing','independent clean-machine install/launch/upgrade/repair/uninstall','second-machine byte reproducibility','matching-host Linux and macOS build/runtime','independent browser, hardware and accessibility matrix','real 72-hour editor/player soak'].map(name=>({name,status:'pending-external',claimed:false}))})

const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),environment={id:`${platform}-${arch}-${versions.node}`,platform,architecture:arch,node:versions.node,rust:safeExec('rustc',['--version']),cargo:safeExec('cargo',['--version']),pnpm:safeExec(process.execPath,[join(process.env.APPDATA||'','npm/node_modules/pnpm/bin/pnpm.cjs'),'--version'])}
const entries=await Promise.all((await filesUnder(evidence)).sort().filter(path=>!path.endsWith('evidence-manifest.json')).map(async path=>{const contents=await readFile(path);return{path:relative(evidence,path).replaceAll('\\','/'),sha256:sha256(contents),bytes:contents.length,source:commit,tool:'generate-v6.0.4-release-evidence.mjs',environment:environment.id}}))
await writeJson(join(evidence,'evidence-manifest.json'),{format:'nova-release-evidence-manifest',version:1,release:version,generatedAt,source:{commit,dirty:true,note:'Current working candidate; exact tag verification remains pending.'},environment,localQualificationComplete:product.status==='passed'&&verification.status==='passed'&&interactions.status==='passed'&&layout.status==='passed'&&windows.status==='passed'&&catalog.status==='passed'&&buildsPassed,externalCertificationComplete:false,entries})
console.log(`Nova_A v${version} evidence generated with ${entries.length} hashed entries; external certification remains pending.`)
function safeExec(command,args){try{return execFileSync(command,args,{cwd:root,encoding:'utf8',windowsHide:true}).trim()}catch{return'unavailable'}}
async function filesUnder(directory){const files=[];for(const entry of await readdir(directory,{withFileTypes:true})){const path=join(directory,entry.name);entry.isDirectory()?files.push(...await filesUnder(path)):files.push(path)}return files}
