/** 功能回归脚本：执行 verify-v26.14-project-roundtrip.mjs 对应场景，保留断言和证据输出。 */
import assert from 'node:assert/strict'
import {build} from 'vite'
import {existsSync,readFileSync} from 'node:fs'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {runtimeAudit14Paths} from './lib/runtimeAudit14.mjs'
const paths=runtimeAudit14Paths(import.meta.url),{stage,root,integrated,reportDir}=paths,out=join(paths.cacheDir,'project-roundtrip-compiled'),checks=[]
const norm=/* 调用 path.replaceAll('\\','/') 并返回调用结果。 */ path=>path.replaceAll('\\','/'),overlay=/** 结构说明（自动提取）：overlay；输入 file；直接调用 norm、value.startsWith、join、value.slice。 */ file=>{const value=norm(file),prefix=norm(root)+'/';return value.startsWith(prefix)?join(stage,value.slice(prefix.length)):null}
await build({configFile:false,root,logLevel:'error',ssr:{noExternal:true},plugins:[{name:'actual-project14-overlay',enforce:'pre',/** 结构说明（自动提取）：resolveId；输入 specifier、importer；直接调用 overlay、existsSync、norm、specifier.startsWith、importer.startsWith 等；包含循环处理。 */ resolveId(specifier,importer){const entry=overlay(specifier);if(!importer&&entry&&existsSync(entry))return norm(specifier);if(importer&&specifier.startsWith('.')&&!importer.startsWith('\0'))for(const suffix of['','.ts','.js']){const file=resolve(dirname(importer),specifier+suffix),candidate=overlay(file);if(candidate&&existsSync(candidate))return norm(file)}},/** 结构说明（自动提取）：load；输入 id；直接调用 overlay、existsSync、readFileSync。 */ load(id){const candidate=overlay(id);if(candidate&&existsSync(candidate))return readFileSync(candidate,'utf8')}}],build:{ssr:true,outDir:out,emptyOutDir:true,rollupOptions:{input:{worldGameplay:join(root,'src/runtime/worldGameplay.ts'),pools:join(root,'src/runtime/objectPool.ts'),packages:join(root,'src/runtime/packages.ts'),worldComponents:join(root,'src/world/components.ts'),blueprints:join(root,'src/runtime/objectBlueprints.ts'),authoring:join(root,'src/editor/objectBlueprintAuthoring.ts'),physics:join(root,'src/store/physics.ts'),assets:join(root,'src/assets/AssetDatabase.ts'),validation:join(root,'src/projects/projectData.ts'),templates:join(root,'src/projects/templates.ts'),components:join(root,'src/world/componentRegistry.ts')},output:{entryFileNames:'[name].mjs'}}}})
const load=/* 调用 import(pathToFileURL(join(out,name+'.mjs'))) 并返回调用结果。 */ name=>import(pathToFileURL(join(out,name+'.mjs'))),[blueprints,authoring,physics,assets,validation,templates,components]=await Promise.all(['blueprints','authoring','physics','assets','validation','templates','components'].map(load))
const [worldGameplay,pools,packages,worldComponents]=await Promise.all(['worldGameplay','pools','packages','worldComponents'].map(load))
// History uses browser timers; defer only those background autosave/source-control callbacks in this Node fixture.
globalThis.window={setTimeout:/* 返回固定值 0。 */ ()=>0,clearTimeout:/** 提供不执行额外操作的空回调，用于测试接口占位。 */ ()=>{}}
const wasmDir=integrated?join(root,'nova_core/pkg'):join(stage,'wasm'),wasm=await import(pathToFileURL(join(wasmDir,'nova_core.js')));wasm.initSync({module:await readFile(join(wasmDir,'nova_core_bg.wasm'))})
const check=/** 结构说明（自动提取）：check；输入 name、fn；直接调用 fn、checks.push、console.log、String、console.error；等待异步结果。 */ async(name,fn)=>{try{await fn();checks.push({name,status:'passed'});console.log('PASS '+name)}catch(error){checks.push({name,status:'failed',error:error.stack??String(error)});console.error('FAIL '+name+': '+String(error))}}
const validate=/** 结构说明（自动提取）：validate；输入 source；直接调用 validation.validateProjectDocument、assert.equal、JSON.stringify、report.issues.filter。 */ source=>{const report=validation.validateProjectDocument(source);assert.equal(report.valid,true,JSON.stringify(report.issues.filter(/* 比较 issue.severity 与 'error'，返回严格相等的判断结果。 */ issue=>issue.severity==='error')))}
await check('non-object JSON roots return bounded validation diagnostics instead of throwing',/** null、数组和原始值须在资源预算遍历前被明确拒绝。 */ ()=>{
 for(const input of [null,undefined,true,42,[], 'null','[]','true','42','"text"']){
  const report=validation.validateProjectDocument(input)
  assert.equal(report.valid,false);assert.equal(report.issues[0].code,'invalid-root');assert.equal(report.issues[0].repairable,false)
  assert.equal(report.sceneCount+report.entityCount+report.assetCount,0)
 }
})
await check('actual quick object, inherited child, instance override and embedded prefab survive serialize/WASM/load',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 wasm.migrate_project_json、templates.createTemplateProjectJson、assert.equal、physics.loadProject、blueprints.createQuickObjectWorkflow 等；写入 physics.physicsState.playMode、instances[…].script2D.properties.move_speed。 */ ()=>{
 const blank=wasm.migrate_project_json(templates.createTemplateProjectJson('empty','Roundtrip Fixture'));assert.equal(physics.loadProject(blank),true);physics.physicsState.playMode='editing'
 const quick=blueprints.createQuickObjectWorkflow('Rectangle','Roundtrip Enemy');assert.ok(quick,'Quick workflow failed')
 const child=authoring.authorDerivedBlueprint(assets.assetGuid(quick.blueprintAsset),'Roundtrip Child'),instances=authoring.authorBlueprintInstance(child);assert.equal(instances.length,1)
 instances[0].script2D.properties.move_speed=9;const id=instances[0].uuid,source=physics.getSceneJSON();validate(source)
 const prefab=JSON.parse(source).assets.find(/* 比较 asset.assetType 与 'prefab'，返回严格相等的判断结果。 */ asset=>asset.assetType==='prefab');assert.ok(prefab.source.startsWith('data:'),'Fixture did not exercise embedded prefab')
 const migrated=wasm.migrate_project_json(source);validate(migrated);assert.equal(physics.loadProject(migrated),true)
 const reopened=physics.physicsState.world.entities.find(/* 比较 entity.uuid 与 id，返回严格相等的判断结果。 */ entity=>entity.uuid===id);assert.equal(reopened.script2D.properties.move_speed,9);assert.equal(reopened.objectBlueprintAsset,assets.assetReference(child));assert.ok(assets.readTextAsset(reopened.prefabAsset));validate(physics.getSceneJSON())
})

await check('actual enabled pools prewarm synchronously before start-time spawns and cancelled startup cannot reinitialize later',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 wasm.migrate_project_json、templates.createTemplateProjectJson、assert.equal、physics.loadProject、blueprints.createQuickObjectWorkflow 等；写入 physics.physicsState.playMode、config.prefabAsset、config.prewarm、config.capacity 等；等待异步结果。 */ async()=>{
 const blank=wasm.migrate_project_json(templates.createTemplateProjectJson('empty','Prewarm order'));assert.equal(physics.loadProject(blank),true);physics.physicsState.playMode='editing'
 const quick=blueprints.createQuickObjectWorkflow('Rectangle','Prewarm Source');assert.ok(quick);const config=new worldComponents.ObjectPool2D();config.prefabAsset=quick.prefabAsset;config.prewarm=1;config.capacity=1;config.autoExpand=false;quick.entity.addComponent(config);assert.equal(packages.enableOfficialPackage(packages.OFFICIAL_OBJECT_POOL_PACKAGE_ID),true)
 let current=true,guardCalls=0;const pending=worldGameplay.beginWorldGameplay(/** 提供不执行额外操作的空回调，用于测试接口占位。 */ ()=>{},/** 结构说明（自动提取）：worldGameplay.beginWorldGameplay 回调；无显式参数；返回路径包含 current。 */ ()=>{guardCalls++;return current})
 assert.equal(pools.objectPoolDiagnostics()[0].allocated,1,'Pool must be ready before the caller reaches lifecycle start')
 const first=pools.acquirePooled(quick.prefabAsset,{x:0,y:0});assert.equal(first.length,1);assert.equal(config.reusedCount,1);await pending
 assert.equal(pools.releasePooled(physics.physicsState.world.entities.find(/* 比较 entity.uuid 与 first[0].uuid，返回严格相等的判断结果。 */ entity=>entity.uuid===first[0].uuid)),true)
 assert.equal(pools.acquirePooled(quick.prefabAsset,{x:1,y:0})[0],first[0]);assert.equal(config.reusedCount,2)
 worldGameplay.resetWorldGameplay();const stopped=worldGameplay.beginWorldGameplay(/** 提供不执行额外操作的空回调，用于测试接口占位。 */ ()=>{},/** 结构说明（自动提取）：worldGameplay.beginWorldGameplay 回调；无显式参数；返回路径包含 current。 */ ()=>{guardCalls++;return current});current=false;worldGameplay.resetWorldGameplay();await stopped;assert.equal(pools.objectPoolDiagnostics()[0].allocated,0,'Cancelled startup must not prepare pools after its await');assert.ok(guardCalls>=4)
})

await check('raw, percent-encoded and base64 prefab documents validate; malformed bytes remain rejected',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 JSON.parse、physics.getSceneJSON、source.assets.find、assets.readTextAsset、encodeURIComponent 等；写入 prefab.source；包含循环处理。 */ ()=>{
 const source=JSON.parse(physics.getSceneJSON()),prefab=source.assets.find(/* 比较 asset.assetType 与 'prefab'，返回严格相等的判断结果。 */ asset=>asset.assetType==='prefab'),decoded=assets.readTextAsset(prefab.uuid)
 for(const encoded of[decoded,'data:application/json;charset=utf-8,'+encodeURIComponent(decoded),'data:application/json;base64,'+Buffer.from(decoded).toString('base64')]){prefab.source=encoded;const result=validation.validateProjectDocument(source);assert.ok(!result.issues.some(/* 调用 issue.code.startsWith('prefab-') 并返回调用结果。 */ issue=>issue.code.startsWith('prefab-')),JSON.stringify(result.issues))}
 for(const encoded of['data:application/json,%FF','data:application/json;base64,not!base64','{invalid']){prefab.source=encoded;const result=validation.validateProjectDocument(source);assert.ok(result.issues.some(/* 先计算 issue.code==='prefab-json'；仅当其为真值时求右侧 issue.severity==='error'，返回短路求值结果。 */ issue=>issue.code==='prefab-json'&&issue.severity==='error'),'Malformed prefab was accepted')}
})
await check('every published template passes actual WASM format roundtrip and production entity hydration',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 console.log、wasm.migrate_project_json、templates.createTemplateProjectJson、validate、assert.equal 等；包含循环处理。 */ ()=>{
 for(const template of templates.PROJECT_TEMPLATES){console.log('Template '+template.id);const source=wasm.migrate_project_json(templates.createTemplateProjectJson(template.id,'Template '+template.id));validate(source);assert.equal(physics.loadProject(source),true,template.id);const serialized=physics.getSceneJSON();wasm.migrate_project_json(serialized);validate(serialized)}
})
await check('all registry component kinds remain accepted and unknown future components stay rejected',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 JSON.parse、wasm.migrate_project_json、templates.createTemplateProjectJson、map、components.STABLE_COMPONENT_KINDS.filter 等；写入 scene.entities、project.scenes[…].entities[…].components[…].kind。 */ ()=>{
 const project=JSON.parse(wasm.migrate_project_json(templates.createTemplateProjectJson('empty','Registry'))),scene=project.scenes[0]
 scene.entities=components.STABLE_COMPONENT_KINDS.filter(/* 比较 kind 与 'Transform2D'，返回严格不等的判断结果。 */ kind=>kind!=='Transform2D').map(/** 结构说明（自动提取）：map 回调；输入 kind；直接调用 crypto.randomUUID；返回表达式求值结果。 */ kind=>({uuid:crypto.randomUUID(),name:kind,components:[{uuid:crypto.randomUUID(),kind:'Transform2D',data:{}},...(kind==='CharacterBody2D'?[{uuid:crypto.randomUUID(),kind:'RigidBody2D',data:{}}]:[]),...(kind==='Area2D'?[{uuid:crypto.randomUUID(),kind:'BoxCollider2D',data:{}}]:[]),{uuid:crypto.randomUUID(),kind,data:{}}]}))
 const result=JSON.parse(wasm.migrate_project_json(JSON.stringify(project)));assert.equal(result.scenes[0].entities.length,scene.entities.length)
 project.scenes[0].entities[0].components[1].kind='UnknownFutureComponent2D';assert.throws(/* 调用 wasm.migrate_project_json(JSON.stringify(project)) 并返回调用结果。 */ ()=>wasm.migrate_project_json(JSON.stringify(project)),/unsupported component/)
})
await check('removed component tombstones cannot conflict or satisfy required active composition',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 JSON.parse、wasm.migrate_project_json、templates.createTemplateProjectJson、entity.components.find、crypto.randomUUID 等；写入 entity.components、body.removed、canvas.kind。 */ ()=>{
 const project=JSON.parse(wasm.migrate_project_json(templates.createTemplateProjectJson('empty','Tombstones'))),entity=project.scenes[0].entities[0],transform=entity.components.find(/* 比较 component.kind 与 'Transform2D'，返回严格相等的判断结果。 */ component=>component.kind==='Transform2D')
 const body={uuid:crypto.randomUUID(),kind:'RigidBody2D',removed:true,enabled:false,data:{}},canvas={uuid:crypto.randomUUID(),kind:'Canvas',enabled:true,data:{}}
 entity.components=[transform,body,canvas];validate(project)
 body.removed=false;assert.ok(validation.validateProjectDocument(project).issues.some(/* 比较 issue.code 与 'component-conflict'，返回严格相等的判断结果。 */ issue=>issue.code==='component-conflict'))
 body.removed=true;canvas.kind='CharacterBody2D';assert.ok(validation.validateProjectDocument(project).issues.some(/* 先计算 issue.code==='component-dependency'；仅当其为真值时求右侧 issue.message.includes('RigidBody2D')，返回短路求值结果。 */ issue=>issue.code==='component-dependency'&&issue.message.includes('RigidBody2D')))
})
await mkdir(reportDir,{recursive:true});await writeFile(join(reportDir,integrated?'v26.14-project-roundtrip.json':'project-roundtrip.json'),JSON.stringify({format:'nova-v26.14-project-roundtrip',version:1,...paths.metadata,status:checks.length&&checks.every(/* 比较 check.status 与 'passed'，返回严格相等的判断结果。 */ check=>check.status==='passed')?'passed':'failed',generatedAt:new Date().toISOString(),scope:'Actual production quick-object/blueprint/prefab/serializer/validator/hydrator modules without runtime host stubs, plus actual WASM format boundary; Node host, not user-click evidence.',checks},null,2)+'\n');if(checks.some(/* 比较 check.status 与 'passed'，返回严格不等的判断结果。 */ check=>check.status!=='passed'))process.exitCode=1
