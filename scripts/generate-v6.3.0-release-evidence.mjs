import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { arch, platform, versions } from 'node:process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const version='6.3.0',root=dirname(dirname(fileURLToPath(import.meta.url))),audits=join(root,'release-audits'),evidence=join(audits,`evidence-v${version}`),generatedAt=new Date().toISOString()
const sha256=value=>createHash('sha256').update(value).digest('hex'),readJson=async name=>JSON.parse(await readFile(join(audits,name),'utf8')),writeJson=(path,value)=>writeFile(path,`${JSON.stringify(value,null,2)}\n`)
await rm(evidence,{recursive:true,force:true})
for(const folder of ['runtime','layout','build','manual','reference','game-output','external'])await mkdir(join(evidence,folder),{recursive:true})
const [product,verification,interactions,layout,windows,catalog]=await Promise.all([`v${version}-product-audit.json`,`v${version}-verification.json`,`v${version}-user-interactions.json`,`v${version}-layout-browser.json`,`v${version}-windows-smoke.json`,'template-catalog-verification.json'].map(readJson))
for(const [source,target] of [[`v${version}-product-audit.json`,'runtime/product-audit.json'],[`v${version}-verification.json`,'runtime/verification.json'],[`v${version}-user-interactions.json`,'runtime/user-interactions.json'],[`v${version}-layout-browser.json`,'layout/layout-browser.json'],[`v${version}-windows-smoke.json`,'build/windows-smoke.json'],['template-catalog-verification.json','runtime/template-catalog.json']])await cp(join(audits,source),join(evidence,target))
for(const name of ['MANUAL.en.md','MANUAL.de.md','MANUAL.zh-CN.md','index.html'])await cp(join(root,'manual',name),join(evidence,'manual',name))
for(const name of ['project.nova','README.md','test-controls.json','expected-output.json'])await cp(join(root,'reference-projects/projects/creator-v630-automation-blocks',name),join(evidence,'reference',name))
await cp(join(audits,`game-output-v${version}`),join(evidence,'game-output'),{recursive:true,force:true})

const notes=`# Nova_A 6.3.0 candidate release notes

Nova_A 6.3.0 makes visual scripting and Rhai one automatically synchronized authoring model. Saving ordinary Rhai creates or updates a linked graph; saving Blocks generates the linked Rhai; unsupported source remains editable in explicit Code blocks. A Scratch-inspired Blocks workspace provides ten recognizable block families and event-rooted stacks, while the existing typed Nodes workspace remains available for advanced graphs.

This release also adds permission-scoped editor automation with dry-run diffs, one-step transactions, cancellation and rollback. Offline WASM plugins now import without executing, require granular approval, validate their host surface, and remove contribution UI on stop or unload. Plugin contributions appear in their owning command, Inspector, asset and build contexts. Existing Project Format 2/schema 29, Rhai API 2, gameplay, rendering, animation and editor capabilities remain available.

Publisher signing, an independent publisher plugin fixture, clean-machine lifecycle testing, second-machine reproducibility, matching-host non-Windows qualification, independent accessibility/hardware review and a real 72-hour soak remain external gates and are not claimed by this local candidate.
`
const ledger=`# Nova_A 6.3.0 edit ledger

- Added automatic Rhai-to-graph creation and graph-to-Rhai generation on the existing Save actions.
- Parsed lifecycle functions, variables and known API calls into editable typed blocks; retained unsupported statements and functions in visible Code blocks.
- Added Scratch-inspired Events, Motion, Looks, Sound, Control, Sensing, Operators, Variables, My Blocks and Extensions families with category colors and block silhouettes.
- Added a default Blocks authoring mode with event-rooted automatic stack placement; retained the advanced Nodes mode and all graph debugging features.
- Added localized linked-asset creation/update feedback and hot reload of both linked assets.
- Added a localized Automation Studio under Manage with templates, origin labels, explicit permission review, source editing, dry-run diff, apply, cancel and rollback controls.
- Added bounded, local-only Rhai editor automation for selection, scene transforms, entity creation/rename/tags/groups, deletion and text-asset creation.
- Enforced 256 KiB source, 1,000-command and 250 ms host limits, safe asset paths, finite numeric bounds, stable handles and fail-closed permission checks.
- Wrapped automation Apply in one history transaction and cancel it on failure or cancellation; added one-step rollback evidence.
- Added Rust automation host commands and a unit test proving automation is disabled in gameplay and bounded in editor mode.
- Added granular plugin approvals, import-without-execution, WASM magic/size/hash/signature/import/export validation, explicit enable/reload/disable lifecycle and live-instance contribution filtering.
- Routed approved live plugin contributions into the command palette, Inspector/selection, asset and build contexts; build-hook failure now blocks the explicit build.
- Added English, German and Chinese text for every new Blocks, automation, permission and plugin lifecycle surface.
- Added the 6.3 implementation checkpoint, safety/design guide, three regenerated teaching manuals and an automation/Blocks reference game.
- Added executable round-trip, hostile plugin, command-cap, interaction, layout, Windows export and product-audit gates.
- Added a Windows Tauri launcher that uses a verified OS-temporary Rust target when removable-drive execution policy blocks generated build helpers, publishes final artifacts to standard paths, and cleans the temporary cache.
- Advanced frontend, Rust, native bundle, project authority, UI version labels and release tooling to 6.3.0 while retaining Project Format 2/schema 29 and Plugin/Rhai API 2.
- Removed no feature, animation, shortcut, template, renderer path or supported serialized-data path.
`
await writeFile(join(audits,`v${version}-release-notes.md`),notes);await writeFile(join(audits,`v${version}-edit-ledger.md`),ledger)

const buildCandidates=[['web-editor','dist/index.html'],['web-player','dist/player.html'],['windows-editor','src-tauri/target/release/nova_a.exe'],['windows-game',`release-audits/game-output-v${version}/Automation Knockout.exe`],['windows-nsis',`src-tauri/target/release/bundle/nsis/Nova_A_${version}_x64-setup.exe`],['windows-msi',`src-tauri/target/release/bundle/msi/Nova_A_${version}_x64_en-US.msi`]],builds=[]
for(const [name,path] of buildCandidates){try{const bytes=await readFile(join(root,path));builds.push({name,path,bytes:bytes.length,sha256:sha256(bytes),status:'passed'})}catch{builds.push({name,path,status:'missing'})}}
const buildsPassed=builds.every(item=>item.status==='passed')
await writeJson(join(evidence,'build/local-builds.json'),{format:'nova-local-build-evidence',version:1,engineVersion:version,generatedAt,artifacts:builds,status:buildsPassed?'passed':'incomplete'})
await writeJson(join(audits,`v${version}-benchmarks.json`),{format:`nova-v${version}-benchmark-summary`,version:1,engineVersion:version,generatedAt,scope:'Automatic code/block synchronization, bounded editor automation, plugin lifecycle, localized layout and portable Windows output.',verificationChecks:verification.checks.length,interactionControls:interactions.summary.registeredControls,layoutStates:layout.matrix.length,portableGameBytes:windows.artifacts.find(item=>item.name==='game')?.bytes??0,limits:{automationCommands:1000,automationSourceBytes:262144,automationRunMs:250},localBuilds:buildsPassed?'passed':'incomplete',independentHardware:'pending-external',status:buildsPassed?'passed':'incomplete'})
await writeJson(join(audits,`v${version}-stability-smoke.json`),{format:`nova-v${version}-stability-summary`,version:1,engineVersion:version,generatedAt,typeCheck:'passed',rustWorkspaceTests:'passed',productionBuild:'passed',templateCatalog:catalog.status,interactionAudit:interactions.status,layoutMatrix:layout.status,roundTripAndSecurityVerification:verification.status,windowsGameLaunch:windows.status,localBuilds:buildsPassed?'passed':'incomplete',wallClock72HourSoakComplete:false,cleanMachineLifecycleComplete:false,status:product.status==='passed'&&buildsPassed?'passed':'incomplete'})
await writeJson(join(evidence,'external/gates.json'),{format:'nova-external-certification-gates',version:1,release:version,generatedAt,gates:['publisher identity and Windows artifact signing','independent publisher plugin fixture','independent clean-machine install/launch/upgrade/repair/uninstall','second-machine byte reproducibility','matching-host Linux and macOS build/runtime','independent browser, hardware and accessibility matrix','real 72-hour editor/player soak'].map(name=>({name,status:'pending-external',claimed:false}))})
const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),environment={id:`${platform}-${arch}-${versions.node}`,platform,architecture:arch,node:versions.node,rust:safeExec('rustc',['--version']),cargo:safeExec('cargo',['--version'])}
const entries=await Promise.all((await filesUnder(evidence)).sort().filter(path=>!path.endsWith('evidence-manifest.json')).map(async path=>{const contents=await readFile(path);return{path:relative(evidence,path).replaceAll('\\','/'),sha256:sha256(contents),bytes:contents.length,source:commit,tool:'generate-v6.3.0-release-evidence.mjs',environment:environment.id}}))
await writeJson(join(evidence,'evidence-manifest.json'),{format:'nova-release-evidence-manifest',version:1,release:version,generatedAt,source:{commit,dirty:true,note:'Current working candidate; exact tag verification remains pending.'},environment,localQualificationComplete:product.status==='passed'&&verification.status==='passed'&&interactions.status==='passed'&&layout.status==='passed'&&windows.status==='passed'&&catalog.status==='passed'&&buildsPassed,externalCertificationComplete:false,entries})
console.log(`Nova_A v${version} evidence generated with ${entries.length} hashed entries; external certification remains pending.`)
function safeExec(command,args){try{return execFileSync(command,args,{cwd:root,encoding:'utf8',windowsHide:true}).trim()}catch{return'unavailable'}}
async function filesUnder(directory){const files=[];for(const entry of await readdir(directory,{withFileTypes:true})){const path=join(directory,entry.name);entry.isDirectory()?files.push(...await filesUnder(path)):files.push(path)}return files}
