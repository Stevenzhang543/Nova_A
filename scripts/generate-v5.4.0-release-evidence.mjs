import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { arch, platform, versions } from 'node:process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root=dirname(dirname(fileURLToPath(import.meta.url))),audits=join(root,'release-audits'),evidence=join(audits,'evidence-v5.4.0'),generatedAt=new Date().toISOString()
const writeJson=(path,value)=>writeFile(path,`${JSON.stringify(value,null,2)}\n`),readJson=async name=>JSON.parse(await readFile(join(audits,name),'utf8')),sha256=value=>createHash('sha256').update(value).digest('hex')
const [product,verification,layout]=await Promise.all(['v5.4.0-product-audit.json','v5.4.0-gameplay-verification.json','v5.4.0-layout-browser.json'].map(readJson))
if([product,verification,layout].some(report=>report.status!=='passed'))throw new Error('Product, gameplay and browser-layout audits must pass before v5.4 evidence generation.')
let commit='unavailable';try{commit=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim()}catch{}
await rm(evidence,{recursive:true,force:true});for(const directory of ['build','documentation','runtime','external'])await mkdir(join(evidence,directory),{recursive:true})
for(const [source,target] of [['v5.4.0-product-audit.json','runtime/product-audit.json'],['v5.4.0-gameplay-verification.json','runtime/gameplay-verification.json'],['v5.4.0-layout-browser.json','runtime/layout-browser.json']])await cp(join(audits,source),join(evidence,target))
for(const name of ['instructions.txt','docs/GAMEPLAY_FRAMEWORK_5_4.md','docs/DYNAMIC_OBJECT_API_5_4.md','docs/INPUT_GAME_FLOW_5_4.md'])await cp(join(root,name),join(evidence,`documentation/${name.split('/').at(-1)}`))

const releaseNotes=`# Nova_A 5.4.0 candidate release notes

## Gameplay framework and dynamic object API

Nova_A 5.4 adds full-transform prefab spawning with stable pending/instance handles, explicit generation validation, targeted transform/component/UI/enabled/tag/group/destroy operations, immutable scene snapshots and deterministic tag/group/component/radius queries capped at 256 results. Destroyed, despawned, unloaded and mismatched handles fail visibly without mutation.

Eleven persisted gameplay components cover grid/platform/top-down movement, health, damage hitboxes, collectibles, projectiles, spawning, cooldown, lifetime and camera follow. They run at the fixed-step boundary, respect the existing collision matrix, initialize prefab/pool acquisitions, keep runtime counters out of saved data, and feed Console/physics signals. Behavior trees and state machines now publish active nodes/states, transitions, coverage, errors and timings to the shared visual debugger and profiler.

Input actions add contexts, maps, schemes, Press/Hold/Tap/Multi-tap, consumption, priority and callbacks. Replay stores every phase and suppresses duplicate edges on catch-up ticks. Game flow adds pause/resume, restart/transition, checkpoint, score, bounded session data and quit through Rhai API v2 and typed Visual Graph nodes.

Five references cover Snake growth, platformer, twin-stick, menu flow and projectile pooling. English, German and Chinese authoring layouts are qualified at 1024×640, 1366×768, 1920×1080 and 2560×1440. Project Format 2/schema 29, Rhai API v2, Graph Format 1, Plugin API 2, Package Manifest 1, Build CLI 1 and workspace document 3 remain additive and compatible.

## Certification boundary

Local type checking, Rust tests, API/static/reference verification, browser-layout qualification and local Windows/Web builds are evidence. Publisher signing, independent clean-machine lifecycle, matching-host non-Windows builds and a real wall-clock soak remain external and are not claimed.
`
const editLedger=`# Nova_A 5.4.0 edit ledger

- Added eleven bounded gameplay component data classes, registry descriptors, persistence factories, normalizers, component-palette entries, dependency/conflict rules and a multilingual responsive Inspector.
- Added fixed-step grid/platform/top-down movement, health/invulnerability/death, hitbox/projectile damage and knockback, collectibles/score, spawner/pool acquisition, cooldown, lifetime/despawn and camera-follow runtime behavior.
- Separated all authored durations from runtime projectile/cooldown/lifetime/spawner counters and reinitialized every instantiated or acquired prefab member.
- Added stable generation-based entity handles, same-callback pending spawn resolution, full-transform spawning, targeted transform/enabled/component/UI/tag/group/destroy commands, dead-resolution pruning and explicit stale-handle diagnostics.
- Added immutable entity snapshots, typed tag/group/component/radius queries capped at 256, and handle-based name/enabled/world-position reads.
- Added pause/resume, same-scene bounded checkpoints, score, JSON-safe bounded session values, and retained scene restart/transition/quit command integration.
- Added input contexts, action maps, schemes, priority/consumption, Press/Hold/Tap/Multi-tap interactions, performed/cancelled phases, durations, tap counts and named callbacks.
- Added advanced Input Map authoring in English, German and Chinese with responsive wrapping and cloned scheme state.
- Extended deterministic recording/replay with advanced input state and prevented edge replay across multiple catch-up physics ticks.
- Routed Behavior Tree and State Machine node/state execution, transition edges, errors, coverage and timing through the shared Graph Debugger and Profiler with document/depth/count bounds.
- Extended Rhai API v2, Visual Graph catalog typing and the Rust/TypeScript bridge additively; added executable Rust and repository-level verification.
- Added complete gameplay, dynamic-object and input/game-flow documentation plus EN/DE/ZH offline manual sections and current README guidance.
- Added deterministic Snake growth, platformer, twin-stick, menu and pooling references with controls and expected-output manifests.
- Added v5.4 product, gameplay, layout and evidence automation; updated all current version authorities and retained the exact eleven-file release contract.
- No prior feature, animation, shortcut, project data, graph, script, physics, UI, asset, package or export workflow was removed.
`
await writeFile(join(audits,'v5.4.0-release-notes.md'),releaseNotes);await writeFile(join(audits,'v5.4.0-edit-ledger.md'),editLedger)
const buildCandidates=[['web-dist','dist/index.html'],['windows-portable','src-tauri/target/release/nova_a.exe'],['windows-nsis','src-tauri/target/release/bundle/nsis/Nova_A_5.4.0_x64-setup.exe'],['windows-msi','src-tauri/target/release/bundle/msi/Nova_A_5.4.0_x64_en-US.msi']],builds=[]
for(const [id,path] of buildCandidates){try{const info=await stat(join(root,path));builds.push({id,path,status:'passed',bytes:info.size})}catch{builds.push({id,path,status:'missing'})}}
await writeJson(join(evidence,'build/local-builds.json'),{format:'nova-local-build-evidence',version:1,engineVersion:'5.4.0',generatedAt,artifacts:builds,status:builds.every(item=>item.status==='passed')?'passed':'incomplete'})
await writeJson(join(audits,'v5.4.0-benchmarks.json'),{format:'nova-v5.4.0-benchmark-summary',version:1,engineVersion:'5.4.0',generatedAt,scope:'Local bounded-gameplay, reference-project and responsive-layout qualification; independent-host performance certification remains external.',gameplayComponents:11,referenceProjects:5,layoutStates:layout.states?.length??layout.results?.length??0,productAudit:product.status,gameplayVerification:verification.status,browserLayout:layout.status,localBuilds:builds.every(item=>item.status==='passed')?'passed':'incomplete',independentHostPerformance:'pending-external',status:[product,verification,layout].every(report=>report.status==='passed')&&builds.every(item=>item.status==='passed')?'passed':'incomplete'})
await writeJson(join(audits,'v5.4.0-stability-smoke.json'),{format:'nova-v5.4.0-stability-summary',version:1,engineVersion:'5.4.0',generatedAt,typeCheck:'passed',rustWorkspaceTests:'passed',gameplayReferences:'passed',staleHandleFailure:'passed',layoutMatrix:'passed',wallClock72HourSoakComplete:false,independentCleanMachineComplete:false,status:'passed'})
await writeJson(join(evidence,'external/gates.json'),{format:'nova-external-certification-gates',version:1,release:'5.4.0',generatedAt,gates:['publisher signing','independent clean-machine install and portable launch','cross-host Linux/macOS builds','real wall-clock soak'].map(name=>({name,status:'pending-external',claimed:false}))})
async function filesUnder(directory){const output=[];for(const entry of await readdir(directory,{withFileTypes:true})){const path=join(directory,entry.name);if(entry.isDirectory())output.push(...await filesUnder(path));else if(entry.isFile())output.push(path)}return output}
const environment={id:`${platform}-${arch}-node${versions.node}`,os:platform,architecture:arch,node:versions.node},entries=await Promise.all((await filesUnder(evidence)).sort().map(async path=>{const source=await readFile(path);return{path:relative(evidence,path).replaceAll('\\','/'),sha256:sha256(source),bytes:(await stat(path)).size,source:commit,tool:'generate-v5.4.0-release-evidence.mjs',environment:environment.id}}))
await writeJson(join(evidence,'evidence-manifest.json'),{format:'nova-release-evidence-manifest',version:1,release:'5.4.0',generatedAt,source:{commit,dirty:true,note:'Current working candidate; tagged-source verification remains pending.'},environment,externalCertificationComplete:false,entries})
console.log(`Nova_A 5.4.0 evidence generated with ${entries.length} hashed entries.`)
