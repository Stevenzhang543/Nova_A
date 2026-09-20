import assert from 'node:assert/strict'
import { build } from 'vite'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { watch } from 'vue'
const root=process.cwd(), out=resolve('.cache/verification-v26.23/runtime'), checks=[]
const version=JSON.parse(await readFile('package.json','utf8')).version
await build({configFile:false,root,logLevel:'error',plugins:[{name:'profiler-test-settings',enforce:'pre',resolveId(source,importer){if(importer?.replaceAll('\\','/').endsWith('/src/runtime/profiler.ts')&&['./production','../projects/projectFormat'].includes(source))return '\0settings23:'+source},load(id){if(id==='\0settings23:./production')return 'export const productionSettings={performance:{traceCapacity:180}}';if(id==='\0settings23:../projects/projectFormat')return `export const NOVA_ENGINE_VERSION=${JSON.stringify(version)}`}}],build:{ssr:true,outDir:out,emptyOutDir:false,rollupOptions:{input:Object.fromEntries(['scriptHotReload','scriptDebug','dynamicInspection','profiler'].map(name=>[name,resolve('src/runtime',name+'.ts')])),output:{entryFileNames:'[name].mjs'}}}})
const load=name=>import(pathToFileURL(resolve(out,name+'.mjs')))
const [reload,debug,inspection,profiler]=await Promise.all(['scriptHotReload','scriptDebug','dynamicInspection','profiler'].map(load))
const check=(name,run)=>{try{run();checks.push({name,status:'passed'});console.log('PASS '+name)}catch(error){checks.push({name,status:'failed',error:String(error)});console.error('FAIL '+name+': '+error)}}
check('Concurrent reload metadata is independent and empty previous source remains rollbackable',()=>{
 const now=Date.now;let a,b;try{Date.now=()=>123456789;a=reload.prepareHotReload('a','','fn start(){}',[],[],'preserve');b=reload.prepareHotReload('b','','fn start(){}',[],[],'preserve')}finally{Date.now=now}
 assert.notEqual(a.id,b.id);reload.commitHotReload(a,'');assert.equal(reload.hotReloadHistory('a')[0].status,'committed');assert.equal(reload.hotReloadHistory('b')[0].status,'prepared');assert.equal(reload.scriptHotReloadState.activePlan.id,b.id);assert.equal(reload.rollbackHotReload('a'),'');assert.equal(reload.peekHotReloadRollback('a'),null)
 assert.ok(reload.scriptHotReloadState.history.every(item=>!('previousSource'in item)&&!('candidateSource'in item)))
 b.reasons[0]='caller mutation';assert.notEqual(reload.hotReloadHistory('b')[0].reasons[0],'caller mutation');reload.commitHotReload(b);reload.clearHotReloadSession();assert.equal(reload.peekHotReloadRollback('b'),null);assert.ok(reload.hotReloadHistory('b').length)
})
check('Snapshot inspection handles maps and arrays without invoking accessors, prototypes or object conversion',()=>{
 let touched=0;const root={bag:{'a>b':4,'escaped"key':7},items:[{count:3}],dangerous:{valueOf(){touched++;return 1}}};Object.defineProperty(root,'getter',{get(){touched++;return 1},enumerable:true})
 assert.equal(debug.evaluateDebugExpression('bag["a>b"] >= 4',root),true);assert.equal(debug.evaluateDebugExpression('items[0].count',root),3);assert.equal(debug.evaluateDebugExpression('items.0.count',root),3);assert.equal(debug.evaluateDebugExpression('bag["escaped\\"key"] == 7',root),true)
 for(const expression of ['getter','constructor','items[0].__proto__','dangerous > 0','items[0].count()'])assert.throws(()=>debug.evaluateDebugExpression(expression,root))
 assert.equal(touched,0);assert.match(inspection.snapshotPreview(root),/accessor omitted/);assert.equal(touched,0)
 const cyclic={};cyclic.self=cyclic;assert.match(inspection.snapshotPreview(cyclic),/circular/);assert.ok(inspection.snapshotPreview({huge:'x'.repeat(100000)},128).length<=128)
 debug.scriptDebugState.locals={bag:{coins:3}};debug.addDebugWatch('bag');assert.equal(debug.scriptDebugState.watches.at(-1).valueType,'map');assert.match(debug.scriptDebugState.watches.at(-1).value,/coins/)
})
check('Bounded profiler history preserves sequence/reactivity and obeys capture lifetime',()=>{
 profiler.clearProfiler();profiler.profilerState.overheadMode='Full';profiler.profilerState.counters=Array.from({length:9999},(_,frame)=>({frame,name:'seed',value:frame,unit:''}));let updates=0;const stop=watch(()=>profiler.profilerState.counters.at(-1)?.value,()=>updates++,{flush:'sync'})
 profiler.recordProfilerCounter('new',10001);profiler.recordProfilerCounter('new',10002);assert.equal(profiler.profilerState.counters.length,10000);assert.equal(profiler.profilerState.counters[0].value,1);assert.equal(profiler.profilerState.counters.at(-1).value,10002);assert.ok(updates);stop()
 const stale=profiler.beginProfilerMarker('stale');profiler.clearProfiler();stale();assert.equal(profiler.profilerState.markers.length,0);const once=profiler.beginProfilerMarker('once');once();once();assert.equal(profiler.profilerState.markers.length,1)
 profiler.profilerState.frozen=true;profiler.recordProfilerCounter('ignored',1);assert.equal(profiler.profilerState.counters.length,0);profiler.profilerState.frozen=false;profiler.profilerState.enabled=false;profiler.recordProfilerCounter('ignored',1);assert.equal(profiler.profilerState.counters.length,0);profiler.profilerState.enabled=true
})
await mkdir('release-audits',{recursive:true});const report={format:'nova-v26.23-runtime-regressions',version:1,release:'26.23',engineVersion:version,expectedRelease:'26.23',qualifiedRelease:'26.23',development:version!=='26.23.0',generatedAt:new Date().toISOString(),status:checks.every(c=>c.status==='passed')?'passed':'failed',scope:'Actual metadata/parser/debug/profiler owners; profiler settings are a controlled capacity fixture. Separate runtime and browser tests cover gameplay, links and UI.',checks};await writeFile('release-audits/v26.23-runtime-regressions.json',JSON.stringify(report,null,2));if(report.status!=='passed')process.exitCode=1
