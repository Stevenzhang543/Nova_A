/** 26.28 媒体语义：真实时间轴、动画及独立试听；音频宿主桩只观察状态，不证明扬声器效果。 */
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {dirname} from 'node:path'
import {resolveMilestoneAuditContext} from './lib/milestoneAuditContext.mjs'
import {openMediaAuditModules,mediaUuid as uuid} from './lib/mediaAudit16.mjs'
const context=resolveMilestoneAuditContext(import.meta.url,{release:'26.28',reportName:'media'}),checks=[]
const opened=await openMediaAuditModules(context,{timeline:'runtime/timeline',animation:'runtime/animation',audio:'runtime/audio',audition:'editor/audioAudition',box:'world/BoxEntity',components:'world/components',assets:'assets/AssetDatabase',types:'assets/types'}),m=opened.modules,voices=[]
/** 提供可观察的浏览器媒体宿主，实际混音和时间轴仍由产品模块执行。 */
globalThis.Audio=class {
 currentTime=0;duration=10;volume=1;playbackRate=1;loop=false;paused=true;ended=false;listeners=new Map()
 /** 保存媒体来源并登记实例。 */ constructor(src=''){this.src=src;voices.push(this)}
 /** 模拟已获用户手势授权的播放。 */ play(){this.paused=false;return Promise.resolve()}
 /** 暂停宿主时间推进。 */ pause(){this.paused=true}
 /** 记录卸载后的媒体状态。 */ load(){}
 /** 释放媒体来源。 */ removeAttribute(){this.src=''}
 /** 登记可核对的监听器。 */ addEventListener(name,callback){this.listeners.set(name,callback)}
 /** 移除指定监听器。 */ removeEventListener(name){this.listeners.delete(name)}
}
/** 构造具有稳定 UUID 的真实资源记录。 */
function asset(n,type,value){return {uuid:uuid(n),name:'Asset '+n,path:'Assets/Long/Asset '+n,assetType:type,mimeType:type==='audio'?'audio/wav':'application/json',source:typeof value==='string'?value:JSON.stringify(value),byteLength:1,sourceModified:1,importedAt:1,width:0,height:0,duration:type==='audio'?10:0,fontFamily:'',settings:m.types.defaultImportSettings()}}
/** 创建真实播放器并装入父子资源。 */
function setup(parent,child,extra=[]){m.timeline.timelineRuntime.reset();m.animation.animationRuntime.reset();const owner=new m.box.BoxEntity(1,{x:0,y:0},{x:1,y:1},uuid(100)),player=owner.addComponent(new m.components.TimelinePlayer());player.timelineAsset='asset://'+uuid(1);player.autoplay=false;player.loop=false;player.playing=false;m.assets.loadAssets([asset(1,'timeline',m.timeline.normalizeTimeline(parent)),asset(2,'timeline',m.timeline.normalizeTimeline(child)),...extra]);return {owner,player}}
/** 执行具名断言并保留异常堆栈。 */
async function check(name,run){try{await run();checks.push({name,status:'passed'})}catch(error){checks.push({name,status:'failed',error:error.stack})}}
const motion=asset(3,'animation',m.animation.normalizeAnimationClip({loop:false,tracks:[{property:'Transform.position.x',keyframes:[{time:0,value:8},{time:2,value:8}]}]}))
/** 返回包含一层嵌套片段的父时间轴。 */
function parent(blendIn=0,blendOut=0,duration=2){return {duration,frameRate:60,tracks:[{type:'NestedTimeline',clips:[{id:'child',start:0,duration:2,asset:'asset://'+uuid(2),blendIn,blendOut}]}]}}
const child={duration:2,frameRate:60,tracks:[{type:'Animation',clips:[{start:0,duration:2,asset:'asset://'+uuid(3)}]}]}
try{
await check('Nested parent fade multiplies child pose and scrubbing reverses without accumulating drift',/** 验证父级淡入淡出对实际实体数值的影响及来回定位。 */ ()=>{const {owner}=setup(parent(1,1),child,[motion]);for(const [time,expected] of [[.25,2],[.75,6],[1.75,2],[.25,2]]){assert.equal(m.timeline.timelineRuntime.seek(owner.uuid,[owner],time),true);assert.ok(Math.abs(owner.transform.position.x-expected)<1e-6)}})
await check('Nested sequence preserves final animation pose at non-looping endpoint',/** 验证最后一帧继承子动画终点，不恢复初始值。 */ ()=>{const {owner}=setup(parent(),child,[motion]);m.timeline.timelineRuntime.seek(owner.uuid,[owner],2);assert.equal(owner.transform.position.x,8)})
await check('Two nested fade envelopes multiply rather than replacing each other',/** 验证两级半权重产生四分之一实际姿态。 */ ()=>{const nested={duration:2,frameRate:60,tracks:[{type:'NestedTimeline',clips:[{start:0,duration:2,blendIn:1,asset:'asset://'+uuid(4)}]}]};const {owner}=setup(parent(1),nested,[motion,asset(4,'timeline',m.timeline.normalizeTimeline(child))]);m.timeline.timelineRuntime.seek(owner.uuid,[owner],.5);assert.equal(owner.transform.position.x,2)})
await check('Reverse traversal enters nested endpoint once and explicit seek never emits commands',/** 倒放越过嵌套结束边界时发出边界事件，直接定位保持静默。 */ ()=>{const events=[],p=parent(0,0,3),c={duration:2,frameRate:60,tracks:[{type:'Event',clips:[{id:'edge',start:2,duration:.1,value:'edge'}]}]};const {owner,player}=setup(p,c);m.timeline.timelineRuntime.onEvent=/** 记录实际命令派发标识。 */ (_owner,clip)=>events.push(clip.id);m.timeline.timelineRuntime.seek(owner.uuid,[owner],2.5);assert.deepEqual(events,[]);player.playing=true;player.speed=-1;m.timeline.timelineRuntime.update([owner],1);assert.deepEqual(events,['edge']);m.timeline.timelineRuntime.update([owner],.25);assert.deepEqual(events,['edge']);m.timeline.timelineRuntime.seek(owner.uuid,[owner],0);assert.deepEqual(events,['edge'])})
await check('Nested audio gains inherit parent fade and seek voice sample remains exact',/** 核对实际音频宿主增益和暂停定位后的整数采样诊断。 */ ()=>{const sound=asset(5,'audio','data:audio/wav;base64,AA==');sound.settings.audioSettings.streaming=true;const {owner}=setup(parent(1),{duration:2,tracks:[{type:'Audio',clips:[{start:0,duration:2,asset:'asset://'+uuid(5)}]}]},[sound]);m.audio.audioRuntime.begin(m.audio.defaultAudioSettings());m.timeline.timelineRuntime.seek(owner.uuid,[owner],.25);const voice=voices.at(-1);assert.ok(voice);assert.ok(Math.abs(voice.volume-.25)<1e-6);const clocks=Object.values(m.audio.audioRuntime.diagnostics.voiceClocks);assert.ok(clocks.some(/** 匹配精确的四分之一秒静止采样。 */ clock=>clock.seconds===.25&&!clock.playing));m.timeline.timelineRuntime.reset();assert.equal(voice.src,'');assert.equal(voice.listeners.size,0)})
await check('Audition mute and solo are detached from authored data, reset and dispose release voices',/** 通过独立试听真实混音验证覆盖、原配置不变及监听器释放。 */ async()=>{const sound=asset(5,'audio','data:audio/wav;base64,AA==');sound.settings.audioSettings.streaming=true;m.assets.loadAssets([sound]);const settings=m.audio.defaultAudioSettings(),before=JSON.stringify(settings),audition=m.audition.createAudioAudition();audition.setMixOverrides({Music:{mute:true}});audition.configure('asset://'+uuid(5),'Music',settings);audition.play(.5);audition.tick(settings);const voice=voices.at(-1);assert.equal(voice.volume,0);assert.equal(JSON.stringify(settings),before);audition.setMixOverrides({SFX:{solo:true}});audition.tick(settings);assert.equal(voice.volume,0);audition.setMixOverrides({});audition.tick(settings);assert.equal(voice.volume,1);assert.equal(JSON.stringify(settings),before);audition.pause();audition.seek(1);audition.tick(settings);assert.equal(audition.inspect().playing,false);assert.equal(audition.inspect().time,1);await audition.dispose();assert.equal(voice.src,'');assert.equal(voice.listeners.size,0)})
}finally{m.timeline.timelineRuntime.onEvent=null;m.timeline.timelineRuntime.reset();m.animation.animationRuntime.reset();await m.audio.audioRuntime.dispose();m.assets.loadAssets([]);await opened.close()}
const report={...context.metadata(),status:checks.every(/** 只有每项真实断言通过才标记通过。 */ item=>item.status==='passed')?'passed':'failed',checks,scope:'Production timeline/animation/mixer/audition semantics with observable HTML media host. No physical audio, GPU or assistive-device qualification.'};await mkdir(dirname(context.reportPath),{recursive:true});await writeFile(context.reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(report.status!=='passed')process.exitCode=1
