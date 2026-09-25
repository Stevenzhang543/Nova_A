/** 26.26 内容库定向回归：真实一万资源依赖投影的时间/堆内存与有界遍历、包提交通知异常和回滚记录。 */
import assert from 'node:assert/strict'
import {mkdir,writeFile,readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {build} from 'vite'
const out=resolve('.cache/library26-tests');await mkdir(out,{recursive:true})
await build({configFile:false,logLevel:'error',build:{ssr:true,outDir:out,emptyOutDir:false,rollupOptions:{input:{library:resolve('src/assets/contentLibrary26.ts'),importCopy:resolve('src/assets/assetImportCopy.ts'),copy:resolve('src/assets/contentProfileCopy.ts'),types:resolve('src/assets/types.ts'),packages:resolve('src/runtime/packages.ts')},output:{entryFileNames:'[name].mjs'}}}})
const library=await import(pathToFileURL(resolve(out,'library.mjs'))),{defaultImportSettings}=await import(pathToFileURL(resolve(out,'types.mjs'))),pkg=await import(pathToFileURL(resolve(out,'packages.mjs')))
/** 生成合法且稳定的资源身份，避免把任意字符串误当成真实 UUID 测试。 */
const uuid=index=>`00000000-0000-4000-8000-${String(index).padStart(12,'0')}`
/** 每个资源独立设置和内容，包含完整路径，以覆盖大库常见资源模型。 */
const records=Array.from({length:10000},/** 创建各自独立的资源记录及默认设置。 */ (_,index)=>({uuid:uuid(index),name:`资源 ${index}`,path:`Assets/Long folder/资源 ${index}.nova-resource`,assetType:'resource',mimeType:'application/json',byteLength:2,source:'{}',sourceModified:0,importedAt:0,width:0,height:0,duration:0,fontFamily:'',settings:defaultImportSettings()}))
records[0].source=JSON.stringify({references:records.slice(1).map(/** 所有叶节点都被根引用，重现单次广度扩展突破预算。 */ item=>`asset://${item.uuid}`)})
const heapBefore=process.memoryUsage().heapUsed,start=performance.now(),view=library.buildAssetDependencyView(records[0].uuid,records,64),elapsedMs=performance.now()-start,heapDelta=process.memoryUsage().heapUsed-heapBefore
assert.equal(view.nodes.length,64);assert.equal(view.visited,64);assert.equal(view.truncated,true);assert.equal(view.directDependencies,9999)
assert.ok(elapsedMs<30000,`10k projection exceeded30s: ${elapsedMs}`);assert.ok(heapDelta<512*1024*1024,`10k projection exceeded512MiB additional heap: ${heapDelta}`)
for(const limit of [0,-5,NaN,Infinity]){const projected=library.buildAssetDependencyView(records[0].uuid,records.slice(0,10),limit);assert.ok(projected.nodes.length>=1&&projected.nodes.length<=2048);assert.ok(projected.visited<=4096)}
const {localizeContentProfile}=await import(pathToFileURL(resolve(out,'copy.mjs')))
for(const locale of ['de','zh']){const features=library.assetContentProfile(records[0]),translated=localizeContentProfile(features,locale);assert.ok(translated.every(/** 确认每个界面标题都已翻译。 */ (feature,index)=>feature.label!==features[index].label));assert.equal(translated.length,features.length)}
const {assetImportFailureSummary,assetImportTechnicalLabel}=await import(pathToFileURL(resolve(out,'importCopy.mjs')))
for(const diagnostic of ['IMAGE_DECODE','IMPORT_QUEUE_LIMIT','ASSET_BATCH_STALE','ASSET_BATCH_SOURCE','aborted','invalid schema','unknown error']){
 const messages=['en','de','zh'].map(/** 三种语言都应提供独立可操作的本地化说明。 */ locale=>assetImportFailureSummary(diagnostic,locale));assert.equal(new Set(messages).size,3)
}
assert.equal(assetImportTechnicalLabel('zh'),'技术详情')
const id=pkg.packageState.registryCatalog[0].id;assert.equal(pkg.enableOfficialPackage(id),true)
const notifications=[],stopBroken=pkg.onPackageLifecycle(/** 插件回调故障不得回滚已提交包，也不得阻止后续订阅者。 */ ()=>{throw new Error('injected observer failure')}),stopHealthy=pkg.onPackageLifecycle(/** 记录真实消费者通知顺序。 */ (id,action)=>notifications.push({id,action}))
assert.equal(pkg.setPackageEnabled(id,false),true);assert.equal(pkg.packageState.installed.find(/** 定位目标包。 */ item=>item.manifest.id===id).enabled,false);assert.equal(notifications.at(-1).action,'disable');assert.ok(pkg.packageState.errors.at(-1).includes('committed'))
stopBroken();stopHealthy()
const installed=pkg.packageState.installed.find(/** 定位升级包。 */ item=>item.manifest.id===id),oldVersion=installed.manifest.version
// 预览通道中的可信测试数据只用于验证提交顺序；不伪造发行认证或执行插件。
const replacement={...JSON.parse(JSON.stringify(installed.manifest)),version:'999.0.0'}
pkg.packageState.registryCatalog.push(replacement) // 隔离测试注册表固定该测试版本，不修改生产信任规则。
const upgraded=pkg.installPackageManifest(replacement,{kind:'local',location:'regression fixture'})
assert.equal(upgraded.manifest.version,'999.0.0');assert.equal(pkg.packageState.rollback[id][0].version,oldVersion)
const before=JSON.stringify({installed:pkg.packageState.installed,cache:pkg.packageState.offlineCache,lock:pkg.packageState.lockfile,rollback:pkg.packageState.rollback})
assert.throws(/** 缺失依赖必须在任何内容提交前拒绝。 */ ()=>pkg.installPackageManifest({...replacement,version:'999.0.1',dependencies:{'missing.dependency':'1.0.0'},dependencyHashes:{'missing.dependency':'0'.repeat(64)}}))
assert.equal(JSON.stringify({installed:pkg.packageState.installed,cache:pkg.packageState.offlineCache,lock:pkg.packageState.lockfile,rollback:pkg.packageState.rollback}),before)
const engineVersion=JSON.parse(await readFile('package.json','utf8')).version
await mkdir('release-audits',{recursive:true});await writeFile('release-audits/v26.26-library-regression.json',JSON.stringify({format:'nova-library-regression',version:1,release:'26.26',engineVersion,generatedAt:new Date().toISOString(),status:'passed',checks:['fanout traversal budget','invalid caller limits','10k library memory/latency','package observer fault isolation','import upgrade rollback baseline','failed package preflight leaves content unchanged'],measurement:{assets:records.length,elapsedMs,heapBefore,heapDelta,renderableNodes:view.nodes.length,visited:view.visited},scope:'Node actual dependency projection heap delta and wall time; no browser FPS or post-GC leak certification.'},null,2));console.log('PASS26.26library',JSON.stringify({elapsedMs,heapDelta,visited:view.visited}))
