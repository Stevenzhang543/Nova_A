/** 26.28 媒体绑定回归：真实资源导入、历史事务、序列化和运行时读取；音频元信息仅使用宿主桩。 */
import assert from 'node:assert/strict'
import {File} from 'node:buffer'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {openMediaAuditModules} from './lib/mediaAudit16.mjs'
const checks=[],opened=await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()],initializeBundledWasm:true},{physics:'store/physics',assets:'assets/AssetDatabase',animation:'runtime/animation',timeline:'runtime/timeline',locale:'runtime/localization',hash:'assets/contentHash'})
globalThis.File=File
/** 为真实 Blob 导入提供浏览器数据 URI 编码。 */ globalThis.FileReader=class{/** 读取完整源字节。 */ readAsDataURL(blob){blob.arrayBuffer().then(/** 异步报告真实编码结果。 */ bytes=>{this.result=`data:${blob.type};base64,${Buffer.from(bytes).toString('base64')}`;this.onload?.()})}}
/** 隔离硬件音频解码，仅提供资源数据库需要的元信息完成事件。 */ globalThis.Audio=class{duration=30;value='';/** 保存源并异步报告元信息。 */ set src(value){this.value=value;if(value)queueMicrotask(/** 完成当前加载。 */ ()=>this.onloadedmetadata?.())}/** 返回当前源。 */ get src(){return this.value}/** 释放媒体源。 */ removeAttribute(){this.value=''} /** 加载清理不生成第二次回调。 */ load(){} /** 清理历史播放器。 */ pause(){} }
/** 保留每个断言异常，同时写明真正执行的范围。 */ async function check(name,run){try{await run();checks.push({name,status:'passed'})}catch(error){checks.push({name,status:'failed',error:String(error.stack??error)});throw error}}
try{
 const {physics:p,assets:a,animation,timeline,locale,hash}=opened.modules
 assert.ok(p.loadProject(await readFile('reference-projects/projects/creator-v2628-animated-menu/project.nova','utf8')))
 const animationId=a.assetState.records.find(/** 指定动画资源。 */ item=>item.assetType==='animation').uuid,timelineId=a.assetState.records.find(/** 指定时间线资源。 */ item=>item.assetType==='timeline').uuid,audioId=a.assetState.records.find(/** 音乐与点击音不能混淆。 */ item=>item.name==='Menu Music.wav').uuid,localeId=a.assetState.records.find(/** 指定英语源表。 */ item=>item.name==='en.nova-locale').uuid
 const ids=[animationId,timelineId,audioId,localeId],initialBindings=JSON.parse(p.getSceneJSON()).scenes,animationBefore=animation.readAnimationClip('asset://'+animationId),targetId=animationBefore.tracks[0].targetEntityUuid,property=animationBefore.tracks[0].property;assert.ok(targetId)
 /** 同时核对时间线传递引用及场景作者引用，没有因资源名称改变而重写身份。 */ function assertBindings(){
  const doc=timeline.readTimeline('asset://'+timelineId),raw=JSON.stringify(doc);assert.ok(raw.includes('asset://'+animationId));assert.ok(raw.includes('asset://'+audioId));assert.equal(animation.readAnimationClip('asset://'+animationId).tracks[0].targetEntityUuid,targetId);assert.equal(animation.readAnimationClip('asset://'+animationId).tracks[0].property,property)
  const snapshot=JSON.parse(p.getSceneJSON());assert.deepEqual(snapshot.scenes,initialBindings);for(const id of ids)assert.ok(a.resolveAsset('asset://'+id));return snapshot
 }
 for(const id of ids){
  const kind=a.resolveAsset(id).assetType
  await check(`${kind}: rename, undo and redo retain UUID and authored consumer bindings`,/** 用正式命令栈撤销资源元数据变更。 */ ()=>{
   p.clearEditorHistory('binding rename '+kind);const before=a.resolveAsset(id).name;assert.ok(p.beginHistoryTransaction('Rename '+kind,null,id));assert.ok(a.renameAsset(id,'Renamed '+before));assert.ok(p.commitHistoryTransaction());const after=a.resolveAsset(id).name;assert.notEqual(after,before);assertBindings();p.undo();assert.equal(a.resolveAsset(id).name,before);assertBindings();p.redo();assert.equal(a.resolveAsset(id).name,after);assertBindings()
  })
  await check(`${kind}: reimport, undo and redo retain UUID/path and restore exact source bytes`,/** 不绕过导入流水线；音频只隔离设备解码。 */ async()=>{
   p.clearEditorHistory('binding reimport '+kind);const before=a.resolveAsset(id),oldSource=before.source,path=before.path,settings=JSON.stringify(before.settings);let bytes,name,type
   if(kind==='audio'){bytes=hash.assetSourceBytes(oldSource).slice();bytes[bytes.length-1]^=1;name='replacement.wav';type='audio/wav'}else{const value=JSON.parse(a.readTextAsset(id));if(kind==='animation')value.name='Reimported animation';else if(kind==='timeline')value.markers[0].name='Reimported marker';else value.entries['menu.title']='Reimported localized menu';bytes=JSON.stringify(value);name=kind==='animation'?'replacement.nova-anim':kind==='timeline'?'replacement.nova-timeline':'replacement.nova-locale';type='application/json'}
   assert.ok(p.beginHistoryTransaction('Reimport '+kind,null,id));assert.equal(await a.reimportAsset(id,new File([bytes],name,{type})),true);assert.ok(p.commitHistoryTransaction());const newSource=a.resolveAsset(id).source;assert.notEqual(newSource,oldSource);assert.equal(a.resolveAsset(id).path,path);assert.equal(JSON.stringify(a.resolveAsset(id).settings),settings);assertBindings();p.undo();assert.equal(a.resolveAsset(id).source,oldSource);assertBindings();p.redo();assert.equal(a.resolveAsset(id).source,newSource);assertBindings();assert.equal(a.resolveAsset(id).pipeline.artifactHash,hash.sha256Bytes(hash.assetSourceBytes(newSource)))
  })
 }
 await check('Full project save/reopen preserves changed media bytes, target UUIDs, event actions and runtime readers',/** 重开后验证真实消费者，而不只检查 JSON 字符串。 */ ()=>{
  const saved=p.getSceneJSON(),sources=new Map(ids.map(/** 保存最终源供重开核验。 */ id=>[id,a.resolveAsset(id).source]));assert.ok(p.loadProject(saved));assertBindings();for(const id of ids)assert.equal(a.resolveAsset(id).source,sources.get(id));assert.equal(animation.readAnimationClip('asset://'+animationId).name,'Reimported animation');assert.equal(timeline.readTimeline('asset://'+timelineId).markers[0].name,'Reimported marker');assert.equal(locale.localize('menu.title',{},'', 'en'),'Reimported localized menu')
  const entities=p.physicsState.world.entities,target=entities.find(/** 使用作者记录的稳定目标。 */ e=>e.uuid===targetId);assert.ok(target);assert.ok(animation.animationRuntime.seekClipPlayback(targetId,'asset://'+animationId,1,entities));assert.equal(target.getComponent('Text').opacity,62.5)
 })
}catch(error){if(!checks.some(/** 避免重复记录已捕获的用例失败。 */ c=>c.status==='failed'))checks.push({name:'setup/completion',status:'failed',error:String(error.stack??error)});process.exitCode=1}finally{
 await opened.close();await mkdir('release-audits',{recursive:true});const report={format:'nova-media-bindings',version:1,release:'26.28',engineVersion:JSON.parse(await readFile('package.json','utf8')).version,generatedAt:new Date().toISOString(),status:checks.length===9&&checks.every(/** 汇总实际运行结果。 */ c=>c.status==='passed')?'passed':'failed',checks,scope:'Current actual AssetDatabase import pipeline, physics history commands, full project serializer/loader and runtime readers. Browser file encoding and audio metadata host are explicit fixtures; hardware audio, physical inputs and actual exported browser playback are separate gates.'};await writeFile('release-audits/v26.28-media-bindings.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.status!=='passed')process.exitCode=1
}
