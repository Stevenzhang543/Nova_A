import assert from 'node:assert/strict'
import ts from 'typescript'
import{createHash}from'node:crypto'
import{mkdir,readFile,writeFile}from'node:fs/promises'
import{dirname,join}from'node:path'
import{resolveMilestoneAuditContext}from'./lib/milestoneAuditContext.mjs'
import{openMediaAuditModules,mediaUuid as uuid}from'./lib/mediaAudit16.mjs'
import{mediaFieldFixture,interfaceExamples,enumCoverage}from'./fixtures/v26.16-media-fields.mjs'
const context=resolveMilestoneAuditContext(import.meta.url,{release:'26.16',reportName:'media-roundtrip'}),checks=[],observations=[],fixture=mediaFieldFixture()
const opened=await openMediaAuditModules(context,{animation:'runtime/animation',timeline:'runtime/timeline',rigging:'runtime/rigging',authoring:'editor/animationAuthoring',physics:'store/physics',assets:'assets/AssetDatabase',types:'assets/types',pak:'runtime/novaPak',templates:'projects/templates',box:'world/BoxEntity',components:'world/components'})
const m=opened.modules,check=async(name,fn)=>{try{await fn();checks.push({name,status:'passed'});console.log('PASS '+name)}catch(error){checks.push({name,status:'failed',error:error.stack??String(error)});console.error('FAIL '+name+': '+error.message)}}
try{
 const declarations=new Map(),aliases=new Map()
 for(const file of['runtime/animation','runtime/rigging','runtime/timeline']){const source=ts.createSourceFile(file,await readFile(opened.locate(file),'utf8'),ts.ScriptTarget.Latest,true);for(const node of source.statements){if(ts.isInterfaceDeclaration(node))declarations.set(node.name.text,node);if(ts.isTypeAliasDeclaration(node)&&ts.isUnionTypeNode(node.type)&&node.type.types.every(n=>ts.isLiteralTypeNode(n)&&ts.isStringLiteral(n.literal)))aliases.set(node.name.text,node.type.types.map(n=>n.literal.text))}}
 await check('Every declared serializable media interface field has an explicit fixture and every public enum value is covered',()=>{
  const examples=interfaceExamples(fixture)
  for(const[name,values]of Object.entries(examples)){const declaration=declarations.get(name);assert.ok(declaration,name);const fields=declaration.members.map(member=>member.name?.getText()).sort();assert.ok(values.length,name);for(const value of values)assert.deepEqual(Object.keys(value).sort(),fields,name);observations.push({interface:name,fields,examples:values.length})}
  for(const[name,values]of Object.entries(enumCoverage))assert.deepEqual([...values].sort(),[...aliases.get(name)].sort(),name)
  assert.deepEqual(new Set(fixture.controller.transitions.flatMap(v=>v.conditions.map(c=>c.operator))),new Set(['==','!=','>','<','>=','<=','trigger']))
  assert.deepEqual(fixture.rig.constraints.map(v=>v.type),['RotationLimit','CopyRotation','PositionLimit'])
 })
 for(const[type,document]of Object.entries(fixture))await check(type+': every raw field survives actual lossless authoring validation and draft encode/decode',()=>{
  const before=structuredClone(document),result=m.authoring.inspectAnimationDraft(type,document);assert.deepEqual(result.issues,[],JSON.stringify(result.issues));assert.deepEqual(result.normalized,document);assert.deepEqual(m.authoring.decodeAnimationDraft(m.authoring.encodeAnimationDraft(document)),document);assert.deepEqual(document,before)
 })
 const wasm=await opened.wasm();observations.push({wasm:{path:wasm.path,bytes:wasm.bytes.length,sha256:createHash('sha256').update(wasm.bytes).digest('hex')},scope:'Actual Rust/WASM project format boundary preserves embedded media bytes; TypeScript normalizers validate document semantics.'})
 await check('Actual project serializer, WASM migration and component hydration retain all media asset fields and component authoring values',()=>{
  assert.equal(m.physics.loadProject(wasm.module.migrate_project_json(m.templates.createTemplateProjectJson('empty','Media fields'))),true)
  const records=Object.entries(fixture).map(([type,document],i)=>{const source=JSON.stringify(document);return{uuid:uuid(i+1),name:type,path:'Assets/Media/'+type+'.json',assetType:type,mimeType:'application/json',source,byteLength:Buffer.byteLength(source),sourceModified:1,importedAt:1,width:0,height:0,duration:0,fontFamily:'',settings:m.types.defaultImportSettings()}})
  m.assets.loadAssets(records)
  const owner=new m.box.BoxEntity(100,{x:2,y:3},{x:1,y:1},uuid(100));owner.name='Media owner';owner.enabled=false
  Object.assign(owner.addComponent(new m.components.Animator()),{controllerAsset:'asset://'+uuid(2),speed:-.5,autoplay:false,currentState:'walk',parameters:{enabled:true,speed:1.25,count:3,fire:false},layerWeights:{base:1,upper:.5}})
  Object.assign(owner.addComponent(new m.components.Skeleton2D()),{rigAsset:'asset://'+uuid(4),skinAsset:'asset://'+uuid(5),previewEnabled:false,pose:[{boneId:'root',position:{x:1,y:-2},rotation:.75,scale:{x:-1,y:2}}]})
  Object.assign(owner.addComponent(new m.components.TimelinePlayer()),{timelineAsset:'asset://'+uuid(6),autoplay:false,loop:true,speed:-1,currentTime:2.5,playing:false,skipped:true,variables:{route:'left',count:3,ready:true}})
  m.physics.physicsState.world.entities.push(owner)
  const serialized=m.physics.getSceneJSON(),authored=JSON.parse(serialized).scenes.flatMap(s=>s.entities).find(e=>e.uuid===owner.uuid)
  observations.push({componentAuthoring:authored.components.filter(c=>['Animator','Skeleton2D','TimelinePlayer'].includes(c.kind))})
  assert.equal(m.physics.loadProject(wasm.module.migrate_project_json(serialized)),true)
  const after=JSON.parse(m.physics.getSceneJSON()).scenes.flatMap(s=>s.entities).find(e=>e.uuid===owner.uuid)
  assert.deepEqual([...after.components].sort((a,b)=>a.uuid.localeCompare(b.uuid)),[...authored.components].sort((a,b)=>a.uuid.localeCompare(b.uuid)))
  for(const[type,document]of Object.entries(fixture)){const asset=m.assets.assetState.records.find(a=>a.assetType===type);assert.ok(asset,type);assert.deepEqual(JSON.parse(m.assets.readTextAsset(asset.uuid)),document)}
  observations.push({phase:'WASM-project-hydration',serializedBytes:Buffer.byteLength(serialized),assets:m.assets.assetState.records.length})
 })
 await check('Actual deterministic NovaPak asset closure, unpacking, WASM migration and production reopening retain every field',async()=>{
  const source=m.physics.getSceneJSON(),project=JSON.parse(source),bytes=await m.pak.createNovaPak(source,m.assets.assetState.records,project.activeSceneUuid,{compression:'balanced',deterministic:true}),second=await m.pak.createNovaPak(source,m.assets.assetState.records,project.activeSceneUuid,{compression:'balanced',deterministic:true});assert.deepEqual(bytes,second)
  const parsed=await m.pak.parseNovaPak(bytes),unpacked=await m.pak.projectJsonFromNovaPak(bytes);assert.equal(m.physics.loadProject(wasm.module.migrate_project_json(unpacked)),true)
  for(const[type,document]of Object.entries(fixture)){const asset=m.assets.assetState.records.find(a=>a.assetType===type);assert.ok(asset,type);const reopened=JSON.parse(m.assets.readTextAsset(asset.uuid));assert.deepEqual(reopened,document);assert.deepEqual(m.authoring.inspectAnimationDraft(type,reopened).issues,[])}
  assert.deepEqual(JSON.parse(m.physics.getSceneJSON()).scenes,project.scenes)
  observations.push({phase:'NovaPak-WASM-reopen',bytes:bytes.length,entries:parsed.index.entries.length,sha256:createHash('sha256').update(bytes).digest('hex')})
 })
 await check('Unsupported bone masks, serialized skin bind poses and submachine documents are refused without mutating drafts',()=>{
  for(const[type,key,value]of[['animationMask','bones',['root']],['skin','bindPoses',[{boneId:'root',matrix:[1,0,0,1,0,0]}]],['controller','submachines',[{id:'nested'}]]]){const document={...structuredClone(fixture[type]),[key]:value},before=structuredClone(document),result=m.authoring.inspectAnimationDraft(type,document);assert.ok(result.issues.some(i=>i.path==='$.'+key),JSON.stringify(result.issues));assert.deepEqual(document,before)}
 })
 await check('Timeline clip zero/negative rates are refused atomically; signed/zero player transport speed survives hydration',()=>{
  for(const rate of[0,-1]){const document=structuredClone(fixture.timeline);document.tracks[0].clips[0].playbackRate=rate;const before=structuredClone(document);assert.ok(m.authoring.inspectAnimationDraft('timeline',document).issues.some(i=>i.path.endsWith('playbackRate')));assert.deepEqual(document,before)}
  for(const speed of[0,-2]){const source=JSON.parse(m.physics.getSceneJSON()),owner=source.scenes.flatMap(s=>s.entities).find(e=>e.uuid===uuid(100)),player=owner.components.find(c=>c.kind==='TimelinePlayer');player.data.speed=speed;assert.equal(m.physics.loadProject(wasm.module.migrate_project_json(JSON.stringify(source))),true);assert.equal(m.physics.physicsState.world.entities.find(e=>e.uuid===uuid(100)).getComponent('TimelinePlayer').speed,speed)}
 })
 await check('Runtime-only pose samples, clocks, callback queues and caches do not appear in serialized media documents',()=>{
  for(const[type,document]of Object.entries(fixture))assert.deepEqual(Object.keys(document).sort(),Object.keys(m.authoring.normalizeAnimationDocument(type,document)).sort())
  const pose=m.rigging.evaluateRigPose(fixture.rig,new m.components.Skeleton2D());assert.ok(pose.size>0);assert.deepEqual(fixture,mediaFieldFixture())
  observations.push({omissions:['AnimationMask has properties only; no bone masks.','Skin bind transforms are derived from RigDocument, not a serialized bindPoses field.','Controller subgraph is a state label plus layers; no nested submachine document.','RootMotionPreview, SkinnedMesh2D and evaluator clocks/maps/callback queues are runtime outputs, not media assets.','Timeline clip playbackRate is positive .001..100; TimelinePlayer.speed supports signed/zero transport.','All9 timeline kinds are covered, including Branch.'],qualification:'Field retention and normalizer validation do not prove every playback combination or browser authoring interaction.'})
 })
}finally{
 m.animation.animationRuntime.reset();m.timeline.timelineRuntime.reset();m.assets.loadAssets([])
 const status=checks.length&&checks.every(c=>c.status==='passed')?'passed':'failed';await mkdir(dirname(context.reportPath),{recursive:true});await writeFile(context.reportPath,JSON.stringify({...context.metadata(),status,checks,observations,scope:'Independent complete-field media corpus: actual source declarations, production authoring normalizers, project serializer/hydrator, actual Rust/WASM migration and NovaPak. No user-click, hardware audio or exhaustive playback claim.'},null,2)+'\n');await opened.close();if(status!=='passed')process.exitCode=1
}
