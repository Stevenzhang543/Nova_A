/** Strict Audio migration proof. No mutable registry, fallback or normalization of unapproved known sources. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import ts from 'typescript'
import {canonicalBeforePresentationOwner} from './presentationOwnerContract.mjs'
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/audio-owner-transform-v1.json',import.meta.url),'utf8')),hash=b=>createHash('sha256').update(b).digest('hex'),parse=(p,t)=>ts.createSourceFile(p,t,ts.ScriptTarget.Latest,true),actual=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8')
const source=(p,provider=actual)=>{const text=typeof provider==='function'?provider(p):provider[p];assert.equal(typeof text,'string',p+': synchronous real source required');return canonicalBeforePresentationOwner(text,p,provider)},once=(s,from,to,count=1)=>{assert.equal(s.split(from).length-1,count,'Exact Audio anchor '+from.slice(0,70));return s.split(from).join(to)},classNode=(sf,name)=>sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===name)
function beforeGuards(p,text){const row=fixture.files.find(r=>r.path===p);for(const step of [...(row?.guards??[])].reverse())text=once(text,step.to,step.from,step.count);return text}
function audioProof(provider){
 const original=fixture.originals['src/runtime/audio.ts'],old=parse('audio.ts',original),current=classNode(parse('audioRuntime.ts',beforeGuards('src/runtime/audioRuntime.ts',source('src/runtime/audioRuntime.ts',provider))),'AudioRuntime'),klass=classNode(old,'AudioRuntime'),docs=parse('docs',source('src/runtime/audioDocuments.ts',provider)),proof=[]
 let expected=klass.getText(old);for(const step of fixture.mechanical)expected=expected.split(step.from).join(step.to)
 expected=once(expected,'export class AudioRuntime {',"export class AudioRuntime {\n  constructor(readonly capabilities:AudioRuntimeCapabilities){if(!capabilities?.resources||!capabilities.platform||typeof capabilities.resources.resolveAsset!=='function')throw new Error('AUDIO_SERVICES_REQUIRED: Supply explicit audio resources and platform services.')}")
 expected=once(expected,'new AudioBufferCache(this.context)','new AudioBufferCache(this.context,this.capabilities.platform.readAudioBytes.bind(this.capabilities.platform))')
 assert.equal(current.getText(),expected,'Complete original AudioRuntime class plus enumerated mechanical capabilities only')
 for(const node of old.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.body)){const n=docs.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===node.name.text);assert(n);assert.equal(n.body.getText(docs),node.body.getText(old));proof.push({name:node.name.text,sha256:hash(n.body.getText(docs))})}
 const oldTypes=original.slice(original.indexOf('export interface TimelineAudioVoiceRequest'),original.indexOf('const DEFAULT_BUS_IDS'));assert(source('src/runtime/audioRuntimeContracts.ts',provider).includes(oldTypes),'All original Audio diagnostics/request/time types must remain exact')
 return {source:original,wholeClassSha256:hash(klass.getText(old)),methods:klass.members.filter(n=>n.body).length,fields:klass.members.filter(ts.isPropertyDeclaration).length,valueFunctions:proof}
}
function bufferInverse(text){text=beforeGuards('src/runtime/audioBuffers.ts',text);text=once(text,"constructor(private context:BaseAudioContext,private readBytes:(source:string,maximumBytes:number,signal?:AbortSignal)=>Promise<ArrayBuffer>){if(typeof readBytes!=='function')throw new Error('AUDIO_BYTE_READ_REQUIRED')}",'constructor(private context:BaseAudioContext){}');const original=fixture.originals['src/runtime/audioBuffers.ts'],start=original.indexOf('const response=await fetch(source);'),end=original.indexOf('const buffer=await this.context.decodeAudioData(data)',start);assert(start>=0&&end>start);text=once(text,'const data=await this.readBytes(source,MAX_AUDIO_CLIP_BYTES);',original.slice(start,end));assert.equal(text,original);return text}
function wiringInverse(p,text){
 if(p==='src/runtime/GameplayRuntimeCore.ts'){
  text=once(text,"import { RuntimeAudioOwner } from './audioOwner'","import { audioRuntime } from './audio'")
  text=once(text,"  private readonly audioOwner: RuntimeAudioOwner\n  get audio(): RuntimeAudioOwner {\n    if(this.audioOwner.world!==this.worldHost.state.world)throw new Error('AUDIO_WORLD_CHANGED: Stop and recreate the Core before replacing its World.')\n    return this.audioOwner\n  }\n\n",'')
  text=once(text,"'createAnimationTimelineOwner', 'createSaveOwner', 'createAudioOwner'","'createAnimationTimelineOwner', 'createSaveOwner'")
  text=once(text,'\n      createAudioOwner: worldHost.createAudioOwner.bind(worldHost),','')
  text=once(text,"    const audioOwner=this.worldHost.createAudioOwner(this.scriptServices)\n    if(!(audioOwner instanceof RuntimeAudioOwner)||audioOwner.world!==this.worldHost.state.world||audioOwner.resources!==this.scriptServices)throw new Error('AUDIO_OWNER_MISMATCH: Supply this World and Core catalog composition.')\n    this.audioOwner=audioOwner\n    const animationTimelineOwner=this.worldHost.createAnimationTimelineOwner(this.scriptServices,audioOwner)",'    const animationTimelineOwner=this.worldHost.createAnimationTimelineOwner(this.scriptServices)')
  text=text.replaceAll('this.audio.','audioRuntime.').replaceAll('    void this.audio\n','')
 }else if(p==='src/runtime/gameplayWorldHost.ts'){
  text=once(text,"\nimport type { RuntimeAudioOwner } from './audioOwner'\nimport type { AudioResources } from './audioRuntimeContracts'",'')
  text=once(text,'createAnimationTimelineOwner(resources: AnimationResources, audio: RuntimeAudioOwner): AnimationTimelineOwner\n  createAudioOwner(resources: AudioResources): RuntimeAudioOwner','createAnimationTimelineOwner(resources: AnimationResources): AnimationTimelineOwner')
 }else if(p==='src/editor/gameplayWorldHost.ts'){
  text=once(text,"\nimport { createEditorRuntimeAudioOwner } from './audioAdapter'",'')
  text=once(text,'    createAudioOwner(resources) {\n      return createEditorRuntimeAudioOwner(this.state.world, resources, {legacyRoot:options.legacyAnimationRoot})\n    },\n    createAnimationTimelineOwner(resources, audio) {\n      return createEditorAnimationTimelineOwner(this.state.world, resources, {legacyRoot:options.legacyAnimationRoot}, audio)\n    },','    createAnimationTimelineOwner(resources) {\n      return createEditorAnimationTimelineOwner(this.state.world, resources, {legacyRoot:options.legacyAnimationRoot})\n    },')
 }else if(p==='src/editor/animationTimelineAdapter.ts'){
  text=once(text,"\nimport type {RuntimeAudioOwner} from '../runtime/audioOwner'",'')
  text=once(text,"options:{legacyRoot:boolean},audio:Pick<RuntimeAudioOwner,'reconcileTimelineVoices'>=audioRuntime):AnimationTimelineOwner",'options:{legacyRoot:boolean}):AnimationTimelineOwner')
  text=once(text,'audio.reconcileTimelineVoices(requests,entities)','audioRuntime.reconcileTimelineVoices(requests,entities)')
 }else if(p==='src/runtime/gameUi.ts'){
  text=once(text,"\n  constructor(private readonly audio:Pick<typeof audioRuntime,'playUiClip'>=audioRuntime){}",'')
  text=text.replaceAll('this.audio.playUiClip(','audioRuntime.playUiClip(')
 }else if(p==='src/components/WorldCanvas.vue'){
  text=once(text,"import { GameUiRuntime, gameUiRuntime as editorGameUiRuntime, type UiAccessibilityNode } from '../runtime/gameUi'","import { gameUiRuntime, type UiAccessibilityNode } from '../runtime/gameUi'")
  text=once(text,'\n// The Player Canvas owns its UI interaction controller and uses this Core audio; the Editor retains its existing singleton.\nconst gameUiRuntime = props.runtime ? new GameUiRuntime(gameplayRuntime.audio) : editorGameUiRuntime','')
 }else throw new Error('AUDIO_INVERSE_UNACCOUNTED '+p)
 assert.equal(text,fixture.originals[p],p+': entire previous file exact inverse');return text
}
export function validateAudioOwnerMigration(provider=actual){for(const row of fixture.files)assert.equal(hash(source(row.path,provider)),row.sha256,'Unapproved actual Audio source '+row.path);const audio=audioProof(provider),buffer=bufferInverse(source('src/runtime/audioBuffers.ts',provider)),wiring=Object.keys(fixture.originals).filter(p=>p!=='src/runtime/audio.ts'&&p!=='src/runtime/audioBuffers.ts').map(p=>({path:p,sha256:hash(wiringInverse(p,source(p,provider)))}));return {sourceFiles:fixture.files.length,audio:{wholeFileSha256:hash(audio.source),wholeClassSha256:audio.wholeClassSha256,methods:audio.methods,fields:audio.fields,valueFunctions:audio.valueFunctions},buffer:{wholeFileSha256:hash(buffer)},wiring}}
export function canonicalBeforeAudioOwner(text,p,provider=actual){const prior=fixture.acceptedEarlier.find(r=>r.path===p.replaceAll('\\','/'))?.sha256??[];if(prior.includes(hash(text)))return text;text=canonicalBeforePresentationOwner(text,p,provider);p=p.replaceAll('\\','/');const row=fixture.files.find(r=>r.path===p);if(!row)return text;const digest=hash(text),earlier=fixture.acceptedEarlier.find(r=>r.path===p)?.sha256??[];if(earlier.includes(digest))return text;assert.equal(digest,row.sha256,'Unapproved known Audio source '+p);if(p==='src/runtime/audio.ts'){const scoped=name=>name===p?text:source(name,provider);validateAudioOwnerMigration(scoped);return audioProof(scoped).source}if(p==='src/runtime/audioBuffers.ts')return bufferInverse(text);if(fixture.originals[p])return wiringInverse(p,text);return text}
