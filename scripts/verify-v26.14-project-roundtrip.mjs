import assert from 'node:assert/strict'
import {build} from 'vite'
import {existsSync,readFileSync} from 'node:fs'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {runtimeAudit14Paths} from './lib/runtimeAudit14.mjs'
const paths=runtimeAudit14Paths(import.meta.url),{stage,root,integrated,reportDir}=paths,out=join(paths.cacheDir,'project-roundtrip-compiled'),checks=[]
const norm=path=>path.replaceAll('\\','/'),overlay=file=>{const value=norm(file),prefix=norm(root)+'/';return value.startsWith(prefix)?join(stage,value.slice(prefix.length)):null}
await build({configFile:false,root,logLevel:'error',ssr:{noExternal:true},plugins:[{name:'actual-project14-overlay',enforce:'pre',resolveId(specifier,importer){const entry=overlay(specifier);if(!importer&&entry&&existsSync(entry))return norm(specifier);if(importer&&specifier.startsWith('.')&&!importer.startsWith('\0'))for(const suffix of['','.ts','.js']){const file=resolve(dirname(importer),specifier+suffix),candidate=overlay(file);if(candidate&&existsSync(candidate))return norm(file)}},load(id){const candidate=overlay(id);if(candidate&&existsSync(candidate))return readFileSync(candidate,'utf8')}}],build:{ssr:true,outDir:out,emptyOutDir:true,rollupOptions:{input:{worldGameplay:join(root,'src/runtime/worldGameplay.ts'),pools:join(root,'src/runtime/objectPool.ts'),packages:join(root,'src/runtime/packages.ts'),worldComponents:join(root,'src/world/components.ts'),blueprints:join(root,'src/runtime/objectBlueprints.ts'),authoring:join(root,'src/editor/objectBlueprintAuthoring.ts'),physics:join(root,'src/store/physics.ts'),assets:join(root,'src/assets/AssetDatabase.ts'),validation:join(root,'src/projects/projectData.ts'),templates:join(root,'src/projects/templates.ts'),components:join(root,'src/world/componentRegistry.ts')},output:{entryFileNames:'[name].mjs'}}}})
const load=name=>import(pathToFileURL(join(out,name+'.mjs'))),[blueprints,authoring,physics,assets,validation,templates,components]=await Promise.all(['blueprints','authoring','physics','assets','validation','templates','components'].map(load))
const [worldGameplay,pools,packages,worldComponents]=await Promise.all(['worldGameplay','pools','packages','worldComponents'].map(load))
// History uses browser timers; defer only those background autosave/source-control callbacks in this Node fixture.
globalThis.window={setTimeout:()=>0,clearTimeout:()=>{}}
const wasmDir=integrated?join(root,'nova_core/pkg'):join(stage,'wasm'),wasm=await import(pathToFileURL(join(wasmDir,'nova_core.js')));wasm.initSync({module:await readFile(join(wasmDir,'nova_core_bg.wasm'))})
const check=async(name,fn)=>{try{await fn();checks.push({name,status:'passed'});console.log('PASS '+name)}catch(error){checks.push({name,status:'failed',error:error.stack??String(error)});console.error('FAIL '+name+': '+String(error))}}
const validate=source=>{const report=validation.validateProjectDocument(source);assert.equal(report.valid,true,JSON.stringify(report.issues.filter(issue=>issue.severity==='error')))}
await check('actual quick object, inherited child, instance override and embedded prefab survive serialize/WASM/load',()=>{
 const blank=wasm.migrate_project_json(templates.createTemplateProjectJson('empty','Roundtrip Fixture'));assert.equal(physics.loadProject(blank),true);physics.physicsState.playMode='editing'
 const quick=blueprints.createQuickObjectWorkflow('Rectangle','Roundtrip Enemy');assert.ok(quick,'Quick workflow failed')
 const child=authoring.authorDerivedBlueprint(assets.assetGuid(quick.blueprintAsset),'Roundtrip Child'),instances=authoring.authorBlueprintInstance(child);assert.equal(instances.length,1)
 instances[0].script2D.properties.move_speed=9;const id=instances[0].uuid,source=physics.getSceneJSON();validate(source)
 const prefab=JSON.parse(source).assets.find(asset=>asset.assetType==='prefab');assert.ok(prefab.source.startsWith('data:'),'Fixture did not exercise embedded prefab')
 const migrated=wasm.migrate_project_json(source);validate(migrated);assert.equal(physics.loadProject(migrated),true)
 const reopened=physics.physicsState.world.entities.find(entity=>entity.uuid===id);assert.equal(reopened.script2D.properties.move_speed,9);assert.equal(reopened.objectBlueprintAsset,assets.assetReference(child));assert.ok(assets.readTextAsset(reopened.prefabAsset));validate(physics.getSceneJSON())
})

await check('actual enabled pools prewarm synchronously before start-time spawns and cancelled startup cannot reinitialize later',async()=>{
 const blank=wasm.migrate_project_json(templates.createTemplateProjectJson('empty','Prewarm order'));assert.equal(physics.loadProject(blank),true);physics.physicsState.playMode='editing'
 const quick=blueprints.createQuickObjectWorkflow('Rectangle','Prewarm Source');assert.ok(quick);const config=new worldComponents.ObjectPool2D();config.prefabAsset=quick.prefabAsset;config.prewarm=1;config.capacity=1;config.autoExpand=false;quick.entity.addComponent(config);assert.equal(packages.enableOfficialPackage(packages.OFFICIAL_OBJECT_POOL_PACKAGE_ID),true)
 let current=true,guardCalls=0;const pending=worldGameplay.beginWorldGameplay(()=>{},()=>{guardCalls++;return current})
 assert.equal(pools.objectPoolDiagnostics()[0].allocated,1,'Pool must be ready before the caller reaches lifecycle start')
 const first=pools.acquirePooled(quick.prefabAsset,{x:0,y:0});assert.equal(first.length,1);assert.equal(config.reusedCount,1);await pending
 assert.equal(pools.releasePooled(physics.physicsState.world.entities.find(entity=>entity.uuid===first[0].uuid)),true)
 assert.equal(pools.acquirePooled(quick.prefabAsset,{x:1,y:0})[0],first[0]);assert.equal(config.reusedCount,2)
 worldGameplay.resetWorldGameplay();const stopped=worldGameplay.beginWorldGameplay(()=>{},()=>{guardCalls++;return current});current=false;worldGameplay.resetWorldGameplay();await stopped;assert.equal(pools.objectPoolDiagnostics()[0].allocated,0,'Cancelled startup must not prepare pools after its await');assert.ok(guardCalls>=4)
})

await check('raw, percent-encoded and base64 prefab documents validate; malformed bytes remain rejected',()=>{
 const source=JSON.parse(physics.getSceneJSON()),prefab=source.assets.find(asset=>asset.assetType==='prefab'),decoded=assets.readTextAsset(prefab.uuid)
 for(const encoded of[decoded,'data:application/json;charset=utf-8,'+encodeURIComponent(decoded),'data:application/json;base64,'+Buffer.from(decoded).toString('base64')]){prefab.source=encoded;const result=validation.validateProjectDocument(source);assert.ok(!result.issues.some(issue=>issue.code.startsWith('prefab-')),JSON.stringify(result.issues))}
 for(const encoded of['data:application/json,%FF','data:application/json;base64,not!base64','{invalid']){prefab.source=encoded;const result=validation.validateProjectDocument(source);assert.ok(result.issues.some(issue=>issue.code==='prefab-json'&&issue.severity==='error'),'Malformed prefab was accepted')}
})
await check('every published template passes actual WASM format roundtrip and production entity hydration',()=>{
 for(const template of templates.PROJECT_TEMPLATES){console.log('Template '+template.id);const source=wasm.migrate_project_json(templates.createTemplateProjectJson(template.id,'Template '+template.id));validate(source);assert.equal(physics.loadProject(source),true,template.id);const serialized=physics.getSceneJSON();wasm.migrate_project_json(serialized);validate(serialized)}
})
await check('all registry component kinds remain accepted and unknown future components stay rejected',()=>{
 const project=JSON.parse(wasm.migrate_project_json(templates.createTemplateProjectJson('empty','Registry'))),scene=project.scenes[0]
 scene.entities=components.STABLE_COMPONENT_KINDS.filter(kind=>kind!=='Transform2D').map(kind=>({uuid:crypto.randomUUID(),name:kind,components:[{uuid:crypto.randomUUID(),kind:'Transform2D',data:{}},...(kind==='CharacterBody2D'?[{uuid:crypto.randomUUID(),kind:'RigidBody2D',data:{}}]:[]),...(kind==='Area2D'?[{uuid:crypto.randomUUID(),kind:'BoxCollider2D',data:{}}]:[]),{uuid:crypto.randomUUID(),kind,data:{}}]}))
 const result=JSON.parse(wasm.migrate_project_json(JSON.stringify(project)));assert.equal(result.scenes[0].entities.length,scene.entities.length)
 project.scenes[0].entities[0].components[1].kind='UnknownFutureComponent2D';assert.throws(()=>wasm.migrate_project_json(JSON.stringify(project)),/unsupported component/)
})
await check('removed component tombstones cannot conflict or satisfy required active composition',()=>{
 const project=JSON.parse(wasm.migrate_project_json(templates.createTemplateProjectJson('empty','Tombstones'))),entity=project.scenes[0].entities[0],transform=entity.components.find(component=>component.kind==='Transform2D')
 const body={uuid:crypto.randomUUID(),kind:'RigidBody2D',removed:true,enabled:false,data:{}},canvas={uuid:crypto.randomUUID(),kind:'Canvas',enabled:true,data:{}}
 entity.components=[transform,body,canvas];validate(project)
 body.removed=false;assert.ok(validation.validateProjectDocument(project).issues.some(issue=>issue.code==='component-conflict'))
 body.removed=true;canvas.kind='CharacterBody2D';assert.ok(validation.validateProjectDocument(project).issues.some(issue=>issue.code==='component-dependency'&&issue.message.includes('RigidBody2D')))
})
await mkdir(reportDir,{recursive:true});await writeFile(join(reportDir,integrated?'v26.14-project-roundtrip.json':'project-roundtrip.json'),JSON.stringify({format:'nova-v26.14-project-roundtrip',version:1,...paths.metadata,status:checks.length&&checks.every(check=>check.status==='passed')?'passed':'failed',generatedAt:new Date().toISOString(),scope:'Actual production quick-object/blueprint/prefab/serializer/validator/hydrator modules without runtime host stubs, plus actual WASM format boundary; Node host, not user-click evidence.',checks},null,2)+'\n');if(checks.some(check=>check.status!=='passed'))process.exitCode=1
