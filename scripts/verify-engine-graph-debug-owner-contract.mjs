/** Portable qualification: actual nine sources and bounded guards; no absolute historical cache dependency. */
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash,webcrypto} from 'node:crypto'
import {pathToFileURL,fileURLToPath} from 'node:url'
import {build} from 'vite'
import {assertGraphDebugOwnerQualification,canonicalBeforeGraphDebugOwner} from './lib/graphDebugOwnerContract.mjs'
import {canonicalBeforeNetworkSources} from './lib/networkSourceProjection.mjs'
import {networkOwnerMigrationFixture} from './lib/networkOwnerContract.mjs'
import {createVerifiedScriptDebugHotReloadSourceReader,scriptDebugHotReloadSourceEvidence} from './lib/scriptDebugHotReloadSourceProjection.mjs'
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1]},root=path.resolve(arg('--source-root')??process.cwd()),reportRoot=path.resolve(arg('--report-dir')??path.join(process.cwd(),'.cache/verification-engine-graph-debug-owner'))
await fsp.mkdir(reportRoot,{recursive:true});const run=await fsp.mkdtemp(path.join(reportRoot,'run-')),hash=v=>createHash('sha256').update(v).digest('hex'),norm=p=>p.replaceAll('\\','/')
const fixture=JSON.parse(fs.readFileSync(new URL('./lib/fixtures/graph-debug-owner-transform-v1.json',import.meta.url),'utf8')),rawReader=p=>fs.readFileSync(path.join(root,p),'utf8'),reader=createVerifiedScriptDebugHotReloadSourceReader(rawReader),rawUpstreamGuards=scriptDebugHotReloadSourceEvidence().rows.map(row=>({path:row.path,actualRawSha256:hash(rawReader(row.path)),expectedRawSha256:row.rawSha256})),checks=[],loaded=[],cleanup=[]
const networkActualGuards=networkOwnerMigrationFixture().rows.map(row=>({path:row.path,actualRawSha256:hash(rawReader(row.path)),qualified661Sha256:hash(reader(row.path)),expectedQualified661Sha256:row.afterSha256}))
let failure=null,qualification=null,api=null,core=null,host=null,liveState=null,originalState=null
const check=(name,fn)=>{fn();checks.push({name,status:'PASSED'})}
try{
 qualification=assertGraphDebugOwnerQualification(reader)
 check('strict-nine-linked-sources-15-declarations-19-initializers-and-seven-whole-inverses',()=>{assert.equal(qualification.sourceFiles,9);assert.equal(qualification.originalFunctions.length,15);assert.equal(qualification.originalFields.length,19);assert.equal(qualification.wholeInverse.length,7)})
 check('all-seven-normalizers-return-the-entire-approved-before-source',()=>{for(const row of fixture.files.filter(r=>!r.created))assert.equal(canonicalBeforeGraphDebugOwner(row.path,reader(row.path),reader),row.before)})
 const corePath='src/runtime/GameplayRuntimeCore.ts',ownerPath='src/runtime/graphDebugOwner.ts',adapterPath='src/editor/graphDebugAdapter.ts',coreSource=reader(corePath)
 check('missing-linked-provider-rejected-for-post-image',()=>assert.throws(()=>canonicalBeforeGraphDebugOwner(corePath,coreSource)))
 check('missing-new-Owner-and-Adapter-rejected',()=>{for(const missing of[ownerPath,adapterPath])assert.throws(()=>canonicalBeforeGraphDebugOwner(corePath,coreSource,p=>p===missing?undefined:reader(p)))})
 check('changed-linked-Owner-Adapter-and-known-source-rejected',()=>{for(const changed of[ownerPath,adapterPath])assert.throws(()=>canonicalBeforeGraphDebugOwner(corePath,coreSource,p=>reader(p)+(p===changed?'\n/* unapproved change */':'')));assert.throws(()=>canonicalBeforeGraphDebugOwner(corePath,coreSource+'\n/* change */',reader))})
 check('changed-algorithm-limit-and-late-World-guard-rejected',()=>{assert.throws(()=>assertGraphDebugOwnerQualification(p=>p===ownerPath?reader(p).replace('MAX_TRACE_ENTRIES = 5_000','MAX_TRACE_ENTRIES = 4_999'):reader(p)));assert.throws(()=>assertGraphDebugOwnerQualification(p=>p===corePath?reader(p).replace('this.graphDebugOwner.world!==this.worldHost.state.world','false'):reader(p)))})
 check('approved-before-early-return-is-exact-and-unknown-path-remains-neutral',()=>{const row=fixture.files.find(r=>r.path===corePath);assert.equal(canonicalBeforeGraphDebugOwner(corePath,row.before),row.before);assert.throws(()=>canonicalBeforeGraphDebugOwner(corePath,row.before+' '));assert.equal(canonicalBeforeGraphDebugOwner('unrelated.ts','unchanged'),'unchanged')})
 // Real current modules are imported only to execute guards; this is not another whole build or graph audit.
 globalThis.crypto??=webcrypto
 for(const name of['HTMLElement','HTMLInputElement','HTMLTextAreaElement','HTMLSelectElement'])globalThis[name]??=class{}
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[],maxTouchPoints:0,platform:'Win32'}})
 const entries={'src/runtime/graphDebugOwner.ts':'GraphDebugOwner','src/runtime/GameplayRuntimeCore.ts':'GameplayRuntime as GameplayRuntimeCore','src/editor/gameplayWorldHost.ts':'createEditorGameplayWorldHost','src/editor/gameplayScriptServices.ts':'createEditorGameplayScriptServices','src/store/physics.ts':'physicsState,createEditorWorld'}
 const entry=path.join(run,'entry.ts');await fsp.writeFile(entry,Object.entries(entries).map(([p,n])=>'export {'+n+"} from '"+norm(path.join(root,p))+"';").join('\n')+'\n',{flag:'wx'})
 const seen=new Set()
 await build({root,configFile:false,logLevel:'error',ssr:{noExternal:true},plugins:[{name:'qualified-current-graph-module-hashes',enforce:'pre',async load(id){const clean=norm(id.split('?')[0]),prefix=norm(root)+'/';if(clean.startsWith(prefix)){const relative=clean.slice(prefix.length);if(!relative.startsWith('src/'))return;const bytes=await fsp.readFile(id.split('?')[0]);const row=fixture.files.find(r=>r.path===relative),projectedBytes=canonicalBeforeNetworkSources(relative,bytes.toString(),rawReader);if(row)assert.equal(hash(projectedBytes),row.afterSha256,relative);if(!seen.has(relative)){seen.add(relative);loaded.push({path:relative,sha256:hash(bytes),projectedSha256:hash(projectedBytes),bytes:bytes.length})}}}}],build:{ssr:true,outDir:run,emptyOutDir:false,rollupOptions:{input:entry,output:{entryFileNames:'actual.mjs',inlineDynamicImports:true}}}})
 api=await import(pathToFileURL(path.join(run,'actual.mjs')).href)
 globalThis.window=Object.assign(new EventTarget(),{performance,setTimeout,clearTimeout});globalThis.document=Object.assign(new EventTarget(),{hidden:false,activeElement:null});globalThis.CustomEvent=class extends Event{constructor(name,options){super(name);this.detail=options?.detail}}
 const world=api.physicsState.world,foreignWorld=api.createEditorWorld(),catalog=api.createEditorGameplayScriptServices(),otherCatalog=api.createEditorGameplayScriptServices(),clock={nowMilliseconds:()=>performance.now()}
 check('actual-pure-Owner-missing-World-rejected',()=>assert.throws(()=>new api.GraphDebugOwner(null,catalog,clock),/GRAPH_DEBUG_WORLD_REQUIRED/))
 check('actual-pure-Owner-missing-real-catalog-capability-rejected',()=>assert.throws(()=>new api.GraphDebugOwner(world,{...catalog,readSource:undefined},clock),/GRAPH_DEBUG_CATALOG_REQUIRED/))
 check('actual-pure-Owner-missing-clock-rejected',()=>assert.throws(()=>new api.GraphDebugOwner(world,catalog,undefined),/GRAPH_DEBUG_CAPABILITIES_REQUIRED/))
 const actualHost=api.createEditorGameplayWorldHost({legacyAnimationRoot:false,legacySaveRoot:false})
 check('actual-Core-missing-Owner-rejected-before-input-start',()=>assert.throws(()=>new api.GameplayRuntimeCore(catalog,{...actualHost,createGraphDebugOwner(){return null}}),/GRAPH_DEBUG_WORLD_CATALOG_OWNER_MISMATCH/))
 check('actual-Core-wrong-World-and-different-real-catalog-rejected',()=>{for(const [boundWorld,boundCatalog]of[[foreignWorld,catalog],[world,otherCatalog]])assert.throws(()=>new api.GameplayRuntimeCore(catalog,{...actualHost,createGraphDebugOwner(){return new api.GraphDebugOwner(boundWorld,boundCatalog,clock)}}),/GRAPH_DEBUG_WORLD_CATALOG_OWNER_MISMATCH/)})
 originalState=api.physicsState;liveState=originalState;host={...actualHost,get state(){return liveState}}
 core=new api.GameplayRuntimeCore(catalog,host)
 check('actual-Core-passes-exact-real-catalog-and-fixed-World-to-WGO',()=>{assert.equal(core.graphDebug.catalogIdentity,catalog);assert.equal(core.graphDebug.world,world);assert.equal(core.worldGameplayOwner.graphDebugOwner,core.graphDebug);assert.equal(core.input.attached,false);assert.equal(core.isActive,false)})
 liveState={...originalState,world:foreignWorld}
 check('actual-late-World-getter-and-begin-guard-reject-before-input-or-VM',()=>{assert.throws(()=>core.graphDebug,/GRAPH_DEBUG_WORLD_CHANGED/);assert.throws(()=>core.beginSession(),/WORLD_CHANGED|OWNER_CHANGED/);assert.equal(core.input.attached,false);assert.equal(core.isActive,false);assert.equal(core.scriptRuntime,null)})
 liveState=originalState
 check('actual-clock-and-original-capture-v1-remain-usable',()=>{const owner=new api.GraphDebugOwner(world,catalog,clock);owner.beginGraphDebugSession();owner.recordGraphTrace({type:'graphTrace',graphUuid:'guard-fixture',scopeUuid:'scope',nodeUuid:'node',edgeUuid:'',depth:999,durationMicros:12,values:{hp:7}});assert.equal(owner.state.trace[0].depth,32);assert(Number.isFinite(owner.state.trace[0].at));assert.equal(owner.state.timings.node.totalMicros,12);assert.equal(owner.graphStateValues().hp,7);assert.equal(JSON.parse(owner.graphDebugSnapshot()).version,1)})
}catch(error){failure=error.stack??String(error);process.exitCode=1}finally{
 if(core)try{liveState=originalState;core.stopSession(false);cleanup.push({kind:'Core',active:core.isActive,inputAttached:core.input.attached,vmReleased:core.scriptRuntime===null})}catch(error){cleanup.push({kind:'Core',error:String(error)});process.exitCode=1}
 const sourceChanges=[];for(const row of fixture.files){try{if(hash(canonicalBeforeNetworkSources(row.path,reader(row.path),reader))!==row.afterSha256)sourceChanges.push(row.path)}catch{sourceChanges.push(row.path)}}
 for(const row of networkActualGuards)if(hash(rawReader(row.path))!==row.actualRawSha256||hash(reader(row.path))!==row.qualified661Sha256||row.qualified661Sha256!==row.expectedQualified661Sha256)sourceChanges.push(row.path)
 for(const row of rawUpstreamGuards)if(hash(rawReader(row.path))!==row.actualRawSha256||row.actualRawSha256!==row.expectedRawSha256)sourceChanges.push(row.path)
 if(sourceChanges.length)process.exitCode=1
 const report={schema:'nova-graph-debug-owner-portable-contract-v1',sourceRoot:root,fixtureSha256:hash(fs.readFileSync(new URL('./lib/fixtures/graph-debug-owner-transform-v1.json',import.meta.url))),qualification,checks,failure,loadedSources:loaded,sourceChanges,networkActualGuards,rawUpstreamGuards,identityScope:{SSR:'actual raw665 bytes',qualification:'Network661 -> approved Graph/Particle/Tile view',networkExpectedSHA:'qualified661 only; actualRawSha256 is separate'},cleanup,scope:{formalWrites:0,historicalCacheRequired:false,sealedActual16:'Optional references only, no runtime read.',freshRuntime:'Actual Owner/Core constructors and required capability/identity/late-begin guards. No WASM session initialized; full two-Core/Rhai/AI evidence remains the separate sealed16.',gpu:false,browser:false,performance:'NOT_MEASURED',platformFixture:'DOM EventTarget/classes/navigator only; no business functions replaced.'}}
 await fsp.writeFile(path.join(run,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({run,checks:checks.length,allPassed:!failure&&!sourceChanges.length&&checks.every(c=>c.status==='PASSED'),failure,sourceChanges,cleanup}))
}
