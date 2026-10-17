/** Fixed-World animation execution. Original curves, clocks, blending, dispatch and Transform phase remain unchanged. */
import { PlainKeyMap } from '../world/plainView'
import {finiteNumber} from '../world/geometry'
import type {Entity} from '../world/Entity'
import type {Animator,AnimatorParameterValue} from '../world/components'
import type {AssetRecord} from './runtimeAssetRecordContracts'
import {MediaClock} from './mediaClock'
import {TRACKS,defaultAnimationClip,normalizeAnimationClip,animationClipLength,sampleAnimationTrack,reduceAnimationKeys,animationDispatchesBetween,parameterValue,conditionMatches,type AnimatableProperty,type AnimationKeyframe,type AnimationEvent,type AnimationCommand,type AnimationCommandTrack,type AnimationClipDocument,type BlendTreeChild,type AnimatorState,type AnimatorTransition} from './animationDocuments'
import {validateAnimationTimelinePorts,type AnimationWorld,type AnimationTimelinePorts,type AnimationRecordingObservers,type AnimationAuthoring} from './animationTimelineContracts'
import {AnimationTimelineDocumentReader} from './animationTimelineDocumentReader'
interface LayerRuntimeState { stateId: string; time: number; clock:MediaClock; previousClock:MediaClock|null; previousStateId: string | null; previousTime: number; blendTime: number; blendDuration: number; interruption: AnimatorTransition['interruption'] }
interface AnimatorRuntimeState { controllerAsset: string | null; layers: Map<string, LayerRuntimeState> }
interface SampledClip { values: Map<string, { property: AnimatableProperty; targetEntityUuid: string | null; value: number }>; spriteAsset: string | null }
export interface AnimatorRuntimeInspection { entityUuid: string; controllerAsset: string | null; layers: Array<{ layerId: string; stateId: string; time: number; previousStateId: string | null; blendProgress: number }> }
export interface RuntimeAnimationRecordingStatus { active: boolean; entityUuid: string; elapsed: number; frameRate: number; samples: number; targetAssetUuid: string | null; limited:boolean }
interface RuntimeAnimationRecordingSession { entityUuid:string;elapsed:number;clock:MediaClock;nextFrame:number;frameRate:number;targetAssetUuid:string|null;tracks:Map<AnimatableProperty,AnimationKeyframe[]>;previous:Map<AnimatableProperty,number>;limited:boolean }
interface DirectClipPlayback { reference: string; time: number; clock: MediaClock }
interface AppliedAnimationProperty {entity:Entity;property:AnimatableProperty;base:number;output:number;touched:boolean}
export interface TimelineAnimationSample {key:string;owner:Entity;clipAsset:string;time:number;weight:number;additive?:boolean;loop?:boolean}
export class AnimationOwner {
 private memberObjects=new Map<unknown,{entity:Entity;index:number}>()
 private animatorOwners=new Map<unknown,{entity:Entity;index:number}>()
 private membershipSource:Entity[]|null=null
 private membershipLength=-1
 private membershipDirty=true
 constructor(readonly world:AnimationWorld,readonly ports:AnimationTimelinePorts,readonly documents:AnimationTimelineDocumentReader,observers:AnimationRecordingObservers=new Set()) {validateAnimationTimelinePorts(world,ports);if(documents.resources!==ports.resources)throw new Error('ANIMATION_RESOURCES_MISMATCH');this.recordingResetObservers=observers;this.synchronizeWorldMembers()}
 markMembershipDirty():void{this.membershipDirty=true}
 synchronizeWorldMembers(force=true):void{
  const entities=this.world.entities
  if(!force&&!this.membershipDirty&&this.membershipSource===entities&&this.membershipLength===entities.length)return
  this.memberObjects.clear();this.animatorOwners.clear()
  for(let index=0;index<entities.length;index++){const entity=entities[index],record={entity,index};this.memberObjects.set(this.ports.unwrapEntity(entity),record);const animator=entity.getComponent<Animator>('Animator');if(animator)this.animatorOwners.set(this.ports.unwrapEntity(animator),record)}
  this.membershipSource=entities;this.membershipLength=entities.length;this.membershipDirty=false
 }
 private memberRecordCurrent(record:{entity:Entity;index:number}|undefined):boolean{return !!record&&this.ports.unwrapEntity(this.world.entities[record.index])===this.ports.unwrapEntity(record.entity)}
 private requireAuthoring():AnimationAuthoring {if(!this.ports.authoring)throw new Error('ANIMATION_AUTHORING_PORT_REQUIRED: Recording cannot write through a read-only Player.');return this.ports.authoring}
 assertEntities(entities:Entity[]):void {
  if(entities===this.world.entities)return
  if(!Array.isArray(entities))throw new Error('ANIMATION_WORLD_ENTITIES_MISMATCH')
  this.synchronizeWorldMembers(false)
  const current=()=>entities.every(entity=>this.memberRecordCurrent(this.memberObjects.get(this.ports.unwrapEntity(entity))))
  if(!current()){this.synchronizeWorldMembers();if(!current())throw new Error('ANIMATION_WORLD_ENTITIES_MISMATCH')}
 }
 assertTimelineOwners(requests:readonly TimelineAnimationSample[]):void{
  this.synchronizeWorldMembers(false)
  const current=()=>requests.every(request=>this.memberRecordCurrent(this.memberObjects.get(this.ports.unwrapEntity(request.owner))))
  if(!current()){this.synchronizeWorldMembers();if(!current())throw new Error('ANIMATION_TIMELINE_OWNER_MISMATCH')}
 }
 setAnimatorParameter(animator:Animator,name:string,value:AnimatorParameterValue):void {
  this.synchronizeWorldMembers(false);const identity=this.ports.unwrapEntity(animator)
  let record=this.animatorOwners.get(identity)
  const current=()=>this.memberRecordCurrent(record)&&this.ports.unwrapEntity(record!.entity.getComponent<Animator>('Animator'))===identity
  if(!current()){this.synchronizeWorldMembers();record=this.animatorOwners.get(identity)}
  if(!current())throw new Error('ANIMATION_COMPONENT_WORLD_MISMATCH')
  applyAnimatorParameterFromDocuments(animator,name,value,this.documents)
 }

  private runtime = new Map<string, AnimatorRuntimeState>()
  private recording: RuntimeAnimationRecordingSession | null = null
  private directPlayback = new Map<string, DirectClipPlayback>()
  private appliedPose=new Map<string,AppliedAnimationProperty>()
  private timelinePose=new Map<string,{entity:Entity;property:AnimatableProperty;base:number;output:number}>()
  private frameSerial=0
  private timelineFrame=-1
  private evaluationOwner:Entity|null=null
  private evaluationEntities:Entity[]=[]
  private spritePose=new PlainKeyMap<Entity,{base:string|null;output:string|null;touched:boolean}>()
  private timelineSprites=new PlainKeyMap<Entity,{base:string|null;output:string|null}>()
  onEvent: ((entity: Entity, event: AnimationEvent) => void) | null = null
  onCommand: ((entity: Entity, track: AnimationCommandTrack, command: AnimationCommand) => void) | null = null

  private recordingResetObservers:AnimationRecordingObservers
  /** Editor preview owners can transfer the exact recording before a global Stop clears runtime state. */
  /** 结构说明（自动提取）：observeRecordingReset；输入 observer；直接调用 recordingResetObservers.add。 */ observeRecordingReset(observer:(document:AnimationClipDocument)=>void):()=>void {this.recordingResetObservers.add(observer);return/* 调用 this.recordingResetObservers.delete(observer) 并返回调用结果。 */ ()=>this.recordingResetObservers.delete(observer)}
  /** 结构说明（自动提取）：reset；无显式参数；直接调用 readRuntimeRecordingDraft、observer、structuredClone、runtime.clear、directPlayback.clear 等；写入 recording、frameSerial、timelineFrame、evaluationOwner 等；包含循环处理。 */ reset(): void { const captured=this.recordingResetObservers.size?this.readRuntimeRecordingDraft():null;if(captured)for(const observer of this.recordingResetObservers)observer(structuredClone(captured));this.runtime.clear(); this.recording = null; this.directPlayback.clear();this.appliedPose.clear();this.timelinePose.clear();this.frameSerial=0;this.timelineFrame=-1;this.spritePose.clear();this.timelineSprites.clear();this.evaluationOwner=null;this.evaluationEntities=[] }
  /** 结构说明（自动提取）：playClipOnce；输入 entityUuid、reference；直接调用 readAnimationClip、directPlayback.set、MediaClock。 */ playClipOnce(entityUuid: string, reference: string): boolean { if (!entityUuid || !this.documents.readAnimationClip(reference)) return false; this.directPlayback.set(entityUuid, { reference, time: 0, clock: new MediaClock() }); return true }
  /** Detached transport state for the editor; does not advance or initialize playback. */
  /** 结构说明（自动提取）：inspectClipPlayback；输入 entityUuid；直接调用 directPlayback.get、readAnimationClip、animationClipLength。 */ inspectClipPlayback(entityUuid: string): { reference: string; time: number; duration: number } | null {
    const playback = this.directPlayback.get(entityUuid)
    if (!playback) return null
    const clip = this.documents.readAnimationClip(playback.reference)
    return clip ? { reference: playback.reference, time: playback.time, duration: animationClipLength(clip) } : null
  }
  /** Sample through the runtime evaluator without dispatching events crossed by a seek.
   * The caller retains Play/Pause ownership; this method never changes simulation state. */
  /** 结构说明（自动提取）：seekClipPlayback；输入 entityUuid、reference、seconds、entities；直接调用 Number.isFinite、RangeError、entities.find、readAnimationClip、MediaClock 等；写入 evaluationOwner、evaluationEntities；包含显式抛错路径。 */ seekClipPlayback(entityUuid: string, reference: string, seconds: number, entities: Entity[]): boolean {
    this.assertEntities(entities)
    if (!Number.isFinite(seconds)) throw new RangeError('ANIMATION_SEEK_TIME: A finite time is required.')
    const entity = entities.find(/* 比较 candidate.uuid 与 entityUuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === entityUuid), clip = this.documents.readAnimationClip(reference)
    if (!entity || !clip) return false
    const clock = new MediaClock(Math.min(animationClipLength(clip), Math.max(0, seconds))), time = Math.min(animationClipLength(clip), clock.seconds)
    this.directPlayback.set(entityUuid, { reference, time, clock })
    this.evaluationOwner = entity; this.evaluationEntities = entities
    const state: AnimatorState = { id: 'direct', name: 'Direct', clipAsset: reference, speed: 1, speedParameter: null, cycleOffset: 0, mirrorX: false, mirrorY: false, rootMotion: 'Apply', x: 0, y: 0, subgraph: 'Direct', blendTree: null }
    this.applySample(entity, entities, this.sampleClip(clip, time, false), 1, false, null, state)
    return true
  }
  /** Stop this transport only. The owning runtime session restores the authored scene. */
  /* 调用 this.directPlayback.delete(entityUuid) 并返回调用结果。 */ stopClipPlayback(entityUuid: string): boolean { return this.directPlayback.delete(entityUuid) }
  /** 结构说明（自动提取）：recordingStatus；无显式参数；直接调用 next、value.tracks.values。 */ recordingStatus(): RuntimeAnimationRecordingStatus {
    const value = this.recording
    return value ? { active: true, entityUuid: value.entityUuid, elapsed: value.elapsed, frameRate: value.frameRate, samples: value.tracks.values().next().value?.length ?? 0, targetAssetUuid: value.targetAssetUuid,limited:value.limited } : { active: false, entityUuid: '', elapsed: 0, frameRate: 60, samples: 0, targetAssetUuid: null,limited:false }
  }
  /** 结构说明（自动提取）：beginRuntimeRecording；输入 entityUuid、frameRate、targetAssetUuid；直接调用 MediaClock、Map、Math.min、Math.max、Math.round 等；写入 recording。 */ beginRuntimeRecording(entityUuid: string, frameRate = 60, targetAssetUuid: string | null = null): boolean {
    if (!entityUuid || this.recording) return false
    this.recording = { entityUuid, elapsed: 0,clock:new MediaClock(),nextFrame:1,previous:new Map(),limited:false, frameRate: Math.min(240, Math.max(1, Math.round(finiteNumber(frameRate, 60)))), targetAssetUuid, tracks: new Map() }
    return true
  }
  /** Detached evaluated clip for editor draft capture; does not persist or clear recording. */
  /** 结构说明（自动提取）：readRuntimeRecordingDraft；输入 name；直接调用 normalizeAnimationClip、defaultAnimationClip、map、recording.tracks.entries。 */ readRuntimeRecordingDraft(name = 'Runtime Recording'): AnimationClipDocument | null {
    const recording = this.recording
    if (!recording || !recording.tracks.size) return null
    return normalizeAnimationClip({
      ...defaultAnimationClip(name), frameRate: recording.frameRate, loop: false,
      tracks: [...recording.tracks.entries()].map(/** 构造并返回记录 { property, targetEntityUuid: null, keyframes: reduceAnimationKeys(keyframes, 1e-6) }，字段按当前实参及捕获状态求值。 */ ([property, keyframes]) => ({ property, targetEntityUuid: null, keyframes: reduceAnimationKeys(keyframes, 1e-6) }))
    })
  }
  /** 结构说明（自动提取）：finishRuntimeRecording；输入 name；直接调用 readRuntimeRecordingDraft、assetState.records.find、updateTextAsset、JSON.stringify、createTextAsset；写入 recording；返回路径包含 target、created。 */ finishRuntimeRecording(name = 'Runtime Recording'): AssetRecord | null {
    const recording = this.recording, clip = this.readRuntimeRecordingDraft(name)
    if (!recording || !clip) return null
    const target = recording.targetAssetUuid ? this.requireAuthoring().listRecords().find(/* 先计算 asset.uuid === recording.targetAssetUuid；仅当其为真值时求右侧 asset.assetType === 'animation'，返回短路求值结果。 */ asset => asset.uuid === recording.targetAssetUuid && asset.assetType === 'animation') : null
    if(target){if(!this.requireAuthoring().writeText(target.uuid,JSON.stringify(clip,null,2)))return null;this.recording=null;return target}
    const created=this.requireAuthoring().createText(name,'animation',JSON.stringify(clip,null,2),'Assets/Animations/Recordings');this.recording=null;return created
  }
  /** 将 null 赋给 this.recording，不显式返回值。 */ cancelRuntimeRecording(): void { this.recording = null }
  /** 结构说明（自动提取）：inspect；输入 entityUuid；直接调用 map、filter、runtime.entries。 */ inspect(entityUuid?: string): AnimatorRuntimeInspection[] {
    return [...this.runtime.entries()].filter(/* 先计算 !entityUuid；仅当其为假值时求右侧 uuid === entityUuid，返回短路求值结果。 */ ([uuid]) => !entityUuid || uuid === entityUuid).map(/** 结构说明（自动提取）：map 回调；输入 [uuid, state]；直接调用 map、state.layers.entries；返回表达式求值结果。 */ ([uuid, state]) => ({ entityUuid: uuid, controllerAsset: state.controllerAsset, layers: [...state.layers.entries()].map(/** 结构说明（自动提取）：map 回调；输入 [layerId, layer]；直接调用 Math.min；返回表达式求值结果。 */ ([layerId, layer]) => ({ layerId, stateId: layer.stateId, time: layer.time, previousStateId: layer.previousStateId, blendProgress: layer.blendDuration > 0 ? Math.min(1, layer.blendTime / layer.blendDuration) : 1 })) }))
  }

  /** 结构说明（自动提取）：update；输入 entities、delta；直接调用 initializeRecordingPose、entities.includes、spritePose.delete、Set、propertyValue 等；写入 evaluationEntities、pose.base、entity.spriteRenderer.spriteAsset、pose.output 等；包含循环处理。 */ update(entities: Entity[], delta: number): void {
    this.synchronizeWorldMembers();this.assertEntities(entities)
    this.initializeRecordingPose(entities)
    this.frameSerial++;this.evaluationEntities=entities
    for(const [entity,pose] of this.spritePose){if(!entities.includes(entity)||!entity.spriteRenderer){this.spritePose.delete(entity);continue}if(entity.spriteRenderer.spriteAsset!==pose.output)pose.base=entity.spriteRenderer.spriteAsset;entity.spriteRenderer.spriteAsset=pose.base;pose.output=pose.base;pose.touched=false}
    const identities=new Set(entities)
    for(const [key,entry] of this.appliedPose){const current=this.propertyValue(entry.entity,entry.property);if(!identities.has(entry.entity)||current===null){this.appliedPose.delete(key);continue}entry.base+=current-entry.output;this.setPropertyValue(entry.entity,entry.property,entry.base);entry.output=this.propertyValue(entry.entity,entry.property)??entry.base;entry.touched=false}
    const alive = new Set(entities.map(/* 返回 entity.uuid 的当前值。 */ entity => entity.uuid))
    for (const uuid of this.runtime.keys()) if (!alive.has(uuid)) this.runtime.delete(uuid)
    const animatorIndices = this.ports.animatorIndices(entities)
    for (let sourceIndex = 0; sourceIndex < (animatorIndices?.length ?? entities.length); sourceIndex++) {
      const entity = entities[animatorIndices ? animatorIndices[sourceIndex] : sourceIndex]
      this.evaluationOwner=entity
      const animator = entity.getComponent<Animator>('Animator')
      if (!entity.enabled || !animator?.enabled) continue
      const controller = this.documents.readAnimatorController(animator.controllerAsset)
      if (!controller) continue
      let state = this.runtime.get(entity.uuid)
      if (!state && !animator.autoplay && !animator.currentState) continue
      if (!state || state.controllerAsset !== animator.controllerAsset) {
        state = { controllerAsset: animator.controllerAsset, layers: new Map() }
        this.runtime.set(entity.uuid, state)
      }
      for (const parameter of controller.parameters) {
        if (!(parameter.name in animator.parameters)) animator.parameters[parameter.name] = parameter.defaultValue
      }
      const consumedTriggers=new Set<string>()
      controller.layers.forEach(/** 结构说明（自动提取）：controller.layers.forEach 回调；输入 layer、layerIndex；直接调用 Math.min、Math.max、layers.get、controller.states.some、MediaClock 等；写入 layerState、layerState.previousStateId、layerState.previousClock、layerState.previousTime 等；包含循环处理。 */ (layer, layerIndex) => {
        const weight = Math.min(1, Math.max(0, animator.layerWeights[layer.id] ?? layer.weight))
        let layerState = state!.layers.get(layer.id)
        const requested = layerIndex === 0 && animator.currentState && controller.states.some(/* 比较 candidate.id 与 animator.currentState，返回严格相等的判断结果。 */ candidate => candidate.id === animator.currentState) ? animator.currentState : ''
        if (!layerState || !controller.states.some(/* 比较 candidate.id 与 layerState!.stateId，返回严格相等的判断结果。 */ candidate => candidate.id === layerState!.stateId)) {
          layerState = { stateId: requested || layer.defaultState, time: 0,clock:new MediaClock(),previousClock:null, previousStateId: null, previousTime: 0, blendTime: 0, blendDuration: 0, interruption: 'None' }
          state!.layers.set(layer.id, layerState)
        } else if (requested && requested !== layerState.stateId) {
          layerState.previousStateId = null;layerState.previousClock=null; layerState.previousTime = layerState.time
          layerState.stateId = requested; layerState.time = 0;layerState.clock.seek(0); layerState.blendTime = 0; layerState.blendDuration = 0
        }
        const synchronized = layer.synchronizedTiming && layer.synchronizedLayer ? state!.layers.get(layer.synchronizedLayer) : null
        let activeState = controller.states.find(/* 比较 candidate.id 与 layerState!.stateId，返回严格相等的判断结果。 */ candidate => candidate.id === layerState!.stateId) ?? controller.states[0]
        const activeClip = this.stateClip(activeState, animator)
        const activeLength = activeClip ? animationClipLength(activeClip) : 0
        if(synchronized&&!layerState.previousStateId){const sourceState=controller.states.find(/* 比较 candidate.id 与 synchronized.stateId，返回严格相等的判断结果。 */ candidate=>candidate.id===synchronized.stateId),sourceClip=sourceState?this.stateClip(sourceState,animator):null,sourceLength=sourceClip?animationClipLength(sourceClip):activeLength;layerState.clock.seek(sourceLength>0?synchronized.clock.seconds/sourceLength*activeLength:synchronized.clock.seconds);layerState.time=activeLength>0?((layerState.clock.seconds%activeLength)+activeLength)%activeLength:0}
        const normalizedTime = activeLength > 0 ? layerState.clock.seconds / activeLength : 1
        const transitionSources=!layerState.previousStateId?[activeState.id]:layerState.interruption==='Source'?[layerState.previousStateId]:layerState.interruption==='Destination'?[activeState.id]:layerState.interruption==='SourceThenDestination'?[layerState.previousStateId,activeState.id]:[]
        let transition:AnimatorTransition|undefined
        for(const sourceId of transitionSources){
          const sourceState=controller.states.find(/* 比较 candidate.id 与 sourceId，返回严格相等的判断结果。 */ candidate=>candidate.id===sourceId),sourceClip=sourceState?this.stateClip(sourceState,animator):null,sourceLength=sourceClip?animationClipLength(sourceClip):0
          const phase=sourceId===activeState.id?normalizedTime:sourceLength>0?(layerState.previousClock?.seconds??layerState.previousTime)/sourceLength:1
          transition=controller.transitions.find(/** 结构说明（自动提取）：controller.transitions.find 回调；输入 candidate；直接调用 candidate.conditions.every；返回表达式求值结果。 */ candidate=>candidate.from===sourceId&&candidate.to!==activeState.id&&(!candidate.hasExitTime||phase>=candidate.exitTime)&&candidate.conditions.every(/* 调用 conditionMatches(animator.parameters[condition.parameter]??false,condition) 并返回调用结果。 */ condition=>conditionMatches(animator.parameters[condition.parameter]??false,condition)))
          if(transition)break
        }
        if (transition) {
          for (const condition of transition.conditions) {
            const parameter = controller.parameters.find(/* 比较 candidate.name 与 condition.parameter，返回严格相等的判断结果。 */ candidate => candidate.name === condition.parameter)
            if (parameter?.type === 'Trigger') consumedTriggers.add(parameter.name)
          }
          const destination = controller.states.find(/* 比较 candidate.id 与 transition.to，返回严格相等的判断结果。 */ candidate => candidate.id === transition.to) ?? activeState
          const destinationClip = this.stateClip(destination, animator)
          layerState.previousStateId = layerState.stateId; layerState.previousTime = layerState.time;layerState.previousClock=new MediaClock(layerState.clock.seconds)
          layerState.stateId = transition.to
          layerState.time = this.synchronizedTransitionTime(transition, activeClip, destinationClip, layerState.previousTime)
          layerState.clock.seek(layerState.time);layerState.blendTime = 0; layerState.blendDuration = transition.duration;layerState.interruption=transition.interruption
          if(transition.duration<=0){layerState.previousStateId=null;layerState.previousClock=null}
          activeState = destination
        }
        const clip = this.stateClip(activeState, animator)
        const length = clip ? animationClipLength(clip) : 0
        const previousTime = layerState.clock.seconds
        const parameterSpeed = activeState.speedParameter ? finiteNumber(animator.parameters[activeState.speedParameter], 1) : 1
        const speed=animator.speed*activeState.speed*parameterSpeed*(clip?.playbackSpeed??1)
        const rawTime = layerState.clock.advance(synchronized&&!layerState.previousStateId?0:Math.max(0,finiteNumber(delta)),speed)
        layerState.time = rawTime
        if (clip && length > 0) {
          if (clip.loop) layerState.time = ((layerState.time % length) + length) % length
          else {layerState.time = Math.min(length, Math.max(0, layerState.time));layerState.clock.seek(layerState.time)}
          this.emitDispatches(entity, clip, previousTime, clip.loop ? rawTime : layerState.time)
          let sampled = this.sampleState(activeState, animator, layerState.time)
          if (layerState.previousStateId && layerState.blendDuration > 0) {
            const previousState = controller.states.find(/* 比较 candidate.id 与 layerState!.previousStateId，返回严格相等的判断结果。 */ candidate => candidate.id === layerState!.previousStateId)
            layerState.blendTime += Math.max(0,finiteNumber(delta))*Math.abs(animator.speed)
            if (previousState) {
              const previousClip = this.stateClip(previousState, animator)
              const previousLength = previousClip ? animationClipLength(previousClip) : 0
              const previousSpeedParameter=previousState.speedParameter?finiteNumber(animator.parameters[previousState.speedParameter],1):1
              layerState.previousClock??=new MediaClock(layerState.previousTime)
              layerState.previousTime=layerState.previousClock.advance(Math.max(0,finiteNumber(delta)),animator.speed*previousState.speed*previousSpeedParameter*(previousClip?.playbackSpeed??1))
              if (previousClip?.loop && previousLength > 0) layerState.previousTime = ((layerState.previousTime % previousLength) + previousLength) % previousLength
              else if (previousLength > 0) layerState.previousTime = Math.min(previousLength, Math.max(0, layerState.previousTime))
            }
            const ratio = Math.min(1, layerState.blendTime / layerState.blendDuration)
            if (previousState) sampled = this.blendSamples(this.sampleState(previousState, animator, layerState.previousTime, ratio < 1), sampled, ratio)
            if (ratio >= 1) {layerState.previousStateId = null;layerState.previousClock=null}
          }
          const mask = this.documents.readAnimationMask(layer.maskAsset)
          this.applySample(entity, entities, sampled, weight, layer.additive, mask ? new Set(mask.properties) : null, activeState)
        }
        if (layerIndex === 0) animator.currentState = activeState.id
      })
      for(const name of consumedTriggers)animator.parameters[name]=false
    }
    for (const [entityUuid, playback] of this.directPlayback) {
      const entity = entities.find(/* 比较 candidate.uuid 与 entityUuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === entityUuid), clip = this.documents.readAnimationClip(playback.reference)
      if (!entity || !clip) { this.directPlayback.delete(entityUuid); continue }
      const previous = playback.time, length = animationClipLength(clip); playback.time = Math.min(length, playback.clock.advance(Math.max(0, finiteNumber(delta)), clip.playbackSpeed))
      this.emitDispatches(entity, clip, previous, playback.time)
      const state: AnimatorState = { id: 'direct', name: 'Direct', clipAsset: playback.reference, speed: 1, speedParameter: null, cycleOffset: 0, mirrorX: false, mirrorY: false, rootMotion: 'Apply', x: 0, y: 0, subgraph: 'Direct', blendTree: null }
      this.applySample(entity, entities, this.sampleClip(clip, playback.time, false), 1, false, null, state)
      if (playback.time >= length) this.directPlayback.delete(entityUuid)
    }
    for(const [key,entry] of this.appliedPose)if(!entry.touched)this.appliedPose.delete(key)
    for(const [entity,entry] of this.spritePose)if(!entry.touched)this.spritePose.delete(entity)
    this.captureRuntimeRecording(entities, Math.max(0, delta))
  }

  /** 结构说明（自动提取）：recordingValues；输入 entity；直接调用 Map、propertyValue、values.set；返回路径包含 values；包含循环处理。 */ private recordingValues(entity:Entity):Map<AnimatableProperty,number>{
    const values=new Map<AnimatableProperty,number>();for(const property of TRACKS){const value=this.propertyValue(entity,property);if(value!==null)values.set(property,value)}return values
  }
  /** 结构说明（自动提取）：initializeRecordingPose；输入 entities；直接调用 entities.find、recordingValues、recording.tracks.set；写入 recording.previous；包含循环处理。 */ private initializeRecordingPose(entities:Entity[]):void{
    const recording=this.recording;if(!recording||recording.previous.size)return
    const entity=entities.find(/* 比较 value.uuid 与 recording.entityUuid，返回严格相等的判断结果。 */ value=>value.uuid===recording.entityUuid);if(!entity)return
    recording.previous=this.recordingValues(entity)
    for(const [property,value] of recording.previous)recording.tracks.set(property,[{time:0,value,tangentMode:'Linear',inTangent:0,outTangent:0,easing:'Linear',interpolation:'Linear'}])
  }
  /** 结构说明（自动提取）：captureRuntimeRecording；输入 entities、delta；直接调用 entities.find、recordingValues、Math.min、recording.clock.advance、Math.max 等；写入 recording.elapsed、recording.previous、recording.limited；包含循环处理。 */ private captureRuntimeRecording(entities:Entity[],delta:number):void{
    const recording=this.recording;if(!recording||recording.limited)return
    const entity=entities.find(/* 比较 value.uuid 与 recording.entityUuid，返回严格相等的判断结果。 */ value=>value.uuid===recording.entityUuid);if(!entity)return
    const previousTime=recording.elapsed,values=this.recordingValues(entity),maximum=Math.min(14400,9999/recording.frameRate)
    recording.elapsed=Math.min(maximum,recording.clock.advance(Math.max(0,finiteNumber(delta))))
    const lastFrame=Math.min(9999,Math.floor(recording.elapsed*recording.frameRate+1e-9))
    for(;recording.nextFrame<=lastFrame;recording.nextFrame++){
      const time=recording.nextFrame/recording.frameRate,ratio=recording.elapsed>previousTime?Math.max(0,Math.min(1,(time-previousTime)/Math.max(1e-9,recording.clock.seconds-previousTime))):1
      for(const [property,value] of values){const previous=recording.previous.get(property)??value,keys=recording.tracks.get(property)??[];keys.push({time,value:previous+(value-previous)*ratio,tangentMode:'Linear',inTangent:0,outTangent:0,easing:'Linear',interpolation:'Linear'});recording.tracks.set(property,keys)}
    }
    recording.previous=values;recording.limited=recording.elapsed>=maximum
  }

  /** 结构说明（自动提取）：stateClip；输入 state、animator；直接调用 readAnimationClip、Number、sort。 */ private stateClip(state: AnimatorState, animator: Animator): AnimationClipDocument | null {
    if (!state.blendTree?.children.length) return this.documents.readAnimationClip(state.clipAsset)
    const valueX = Number(animator.parameters[state.blendTree.parameter] ?? 0)
    const valueY = Number(animator.parameters[state.blendTree.parameterY] ?? 0)
    const nearest = [...state.blendTree.children].sort(/** 结构说明（自动提取）：sort 回调；输入 first、second；直接调用 Math.hypot、Math.abs。 */ (first, second) => {
      const firstDistance = state.blendTree!.type === '2D' ? Math.hypot(first.positionX - valueX, first.positionY - valueY) : Math.abs(first.threshold - valueX)
      const secondDistance = state.blendTree!.type === '2D' ? Math.hypot(second.positionX - valueX, second.positionY - valueY) : Math.abs(second.threshold - valueX)
      return firstDistance - secondDistance
    })[0]
    return this.documents.readAnimationClip(nearest?.clipAsset ?? state.clipAsset)
  }

  /** 结构说明（自动提取）：sampleState；输入 state、animator、time、previous；直接调用 stateClip、readAnimationClip、animationClipLength、sampleClip、Number 等；写入 upperIndex。 */ private sampleState(state: AnimatorState, animator: Animator, time: number, previous = false): SampledClip {
    const tree = state.blendTree
    const primaryClip = this.stateClip(state, animator) ?? this.documents.readAnimationClip(state.clipAsset)
    const primaryLength = primaryClip ? animationClipLength(primaryClip) : 0
    const offsetTime = primaryLength > 0 ? time + state.cycleOffset * primaryLength : time
    if (!tree?.children.length) return this.sampleClip(primaryClip, offsetTime)
    const parameter = Number(animator.parameters[tree.parameter] ?? 0)
    const children = tree.children
    const sampleChild = /** 结构说明（自动提取）：sampleChild；输入 child；直接调用 readAnimationClip、animationClipLength、sampleClip。 */ (child: BlendTreeChild): SampledClip => {
      const clip = this.documents.readAnimationClip(child.clipAsset)
      const length = clip ? animationClipLength(clip) : 0
      const synchronizedTime = tree.synchronizeNormalizedTime && primaryLength > 0 && length > 0 ? offsetTime / primaryLength * length : offsetTime
      return this.sampleClip(clip, synchronizedTime * child.speed)
    }
    if (tree.type === '2D') {
      const parameterY = Number(animator.parameters[tree.parameterY] ?? 0)
      const weighted = children.map(/** 构造并返回记录 { child, index, distance: Math.hypot(child.positionX - parameter, child.positionY - parameterY) }，字段按当前实参及捕获状态求值。 */ (child, index) => ({ child, index, distance: Math.hypot(child.positionX - parameter, child.positionY - parameterY) })).sort(/* 先计算 first.distance - second.distance；仅当其为假值时求右侧 first.index - second.index，返回短路求值结果。 */ (first, second) => first.distance - second.distance || first.index - second.index).slice(0, 4)
      if (weighted[0]?.distance <= 1e-9) return sampleChild(weighted[0].child)
      const weights = weighted.map(/* 计算表达式 1 / Math.max(1e-9, item.distance * item.distance) 并返回结果，沿用操作数的原有类型规则。 */ item => 1 / Math.max(1e-9, item.distance * item.distance))
      const total = weights.reduce(/* 计算表达式 sum + value 并返回结果，沿用操作数的原有类型规则。 */ (sum, value) => sum + value, 0)
      return this.blendWeighted(weighted.map(/** 构造并返回记录 { sample: sampleChild(item.child), weight: weights[index] / total }，字段按当前实参及捕获状态求值。 */ (item, index) => ({ sample: sampleChild(item.child), weight: weights[index] / total })))
    }
    let upperIndex = children.findIndex(/* 比较 child.threshold 与 parameter，返回大于或等于的判断结果。 */ child => child.threshold >= parameter)
    if (upperIndex < 0) upperIndex = children.length - 1
    const lowerIndex = Math.max(0, upperIndex - 1)
    const lower = children[lowerIndex], upper = children[upperIndex]
    if (!upper || lower === upper) return sampleChild(lower)
    const ratio = Math.min(1, Math.max(0, (parameter - lower.threshold) / Math.max(1e-9, upper.threshold - lower.threshold)))
    return this.blendSamples(sampleChild(lower), sampleChild(upper), previous ? Math.min(.999, ratio) : ratio)
  }

  /** 结构说明（自动提取）：synchronizedTransitionTime；输入 transition、source、destination、sourceTime；直接调用 animationClipLength、source.markers.find、destination.markers.find、Math.min、Math.max；写入 time。 */ private synchronizedTransitionTime(transition: AnimatorTransition, source: AnimationClipDocument | null, destination: AnimationClipDocument | null, sourceTime: number): number {
    const destinationLength = destination ? animationClipLength(destination) : 0
    if (destinationLength <= 0) return 0
    let time = transition.destinationOffset * destinationLength
    if (transition.syncMode === 'NormalizedTime' && source) {
      const sourceLength = animationClipLength(source)
      if (sourceLength > 0) time += sourceTime / sourceLength * destinationLength
    } else if (transition.syncMode === 'Marker' && source && transition.syncMarker) {
      const sourceMarker = source.markers.find(/* 比较 marker.name 与 transition.syncMarker，返回严格相等的判断结果。 */ marker => marker.name === transition.syncMarker)
      const destinationMarker = destination?.markers.find(/* 比较 marker.name 与 transition.syncMarker，返回严格相等的判断结果。 */ marker => marker.name === transition.syncMarker)
      if (sourceMarker && destinationMarker) time += destinationMarker.time + (sourceTime - sourceMarker.time)
    }
    return destination?.loop ? ((time % destinationLength) + destinationLength) % destinationLength : Math.min(destinationLength, Math.max(0, time))
  }

  /** 结构说明（自动提取）：sampleClip；输入 clip、time、loop；直接调用 Map、animationClipLength、Math.max、Math.min、clip.spriteFrames.at 等；写入 time、cursor、spriteAsset；包含循环处理。 */ private sampleClip(clip: AnimationClipDocument | null, time: number, loop=clip?.loop??false): SampledClip {
    const values = new Map<string, { property: AnimatableProperty; targetEntityUuid: string | null; value: number }>()
    let spriteAsset: string | null = null
    if (!clip) return { values, spriteAsset }
    const length=animationClipLength(clip)
    time=loop?((time%length)+length)%length:Math.max(0,Math.min(length,time))
    if (clip.spriteFrames.length) {
      let cursor = 0
      for (const frame of clip.spriteFrames) {
        cursor += frame.duration
        if (time < cursor) { spriteAsset = frame.spriteAsset; break }
      }
    }
    if(clip.spriteFrames.length&&!spriteAsset)spriteAsset=clip.spriteFrames.at(-1)!.spriteAsset
    for (const track of clip.tracks) {
      const value = sampleAnimationTrack(track.keyframes, time)
      if (value === null) continue
      values.set(`${track.targetEntityUuid ?? ''}:${track.property}`, { property: track.property, targetEntityUuid: track.targetEntityUuid, value })
    }
    return { values, spriteAsset }
  }

  /** 结构说明（自动提取）：baseSampleValue；输入 sample；直接调用 evaluationEntities.find、propertyValue、sample.property.includes。 */ private baseSampleValue(sample:{targetEntityUuid:string|null;property:AnimatableProperty}):number{
    const owner=sample.targetEntityUuid?this.evaluationEntities.find(/* 比较 entity.uuid 与 sample.targetEntityUuid，返回严格相等的判断结果。 */ entity=>entity.uuid===sample.targetEntityUuid):this.evaluationOwner
    return owner?this.propertyValue(owner,sample.property)??0:sample.property.includes('scale')||sample.property.includes('opacity')?1:0
  }
  /** 结构说明（自动提取）：blendSamples；输入 first、second、ratio；直接调用 Map、Set、first.values.keys、second.values.keys、first.values.get 等；包含循环处理。 */ private blendSamples(first:SampledClip,second:SampledClip,ratio:number):SampledClip{
    const values=new Map<string,{property:AnimatableProperty;targetEntityUuid:string|null;value:number}>()
    for(const key of new Set([...first.values.keys(),...second.values.keys()])){const a=first.values.get(key),b=second.values.get(key),definition=(b??a)!,base=this.baseSampleValue(definition);values.set(key,{...definition,value:(a?.value??base)+((b?.value??base)-(a?.value??base))*ratio})}
    return {values,spriteAsset:ratio>=.5?second.spriteAsset:first.spriteAsset}
  }

  /** 结构说明（自动提取）：blendWeighted；输入 samples；直接调用 Map、totals.get、totals.set、samples.reduce、values.set 等；写入 spriteAsset、spriteWeight、current.value、current.weight；包含循环处理。 */ private blendWeighted(samples: Array<{ sample: SampledClip; weight: number }>): SampledClip {
    const totals = new Map<string, { property: AnimatableProperty; targetEntityUuid: string | null; value: number; weight: number }>()
    let spriteAsset: string | null = null, spriteWeight = -1
    for (const entry of samples) {
      if (entry.sample.spriteAsset && entry.weight > spriteWeight) { spriteAsset = entry.sample.spriteAsset; spriteWeight = entry.weight }
      for (const [key, sampled] of entry.sample.values) {
        const current = totals.get(key)
        if (current) { current.value += sampled.value * entry.weight; current.weight += entry.weight }
        else totals.set(key, { ...sampled, value: sampled.value * entry.weight, weight: entry.weight })
      }
    }
    const values = new Map<string, { property: AnimatableProperty; targetEntityUuid: string | null; value: number }>()
    const totalWeight=samples.reduce(/* 计算表达式 sum+sample.weight 并返回结果，沿用操作数的原有类型规则。 */ (sum,sample)=>sum+sample.weight,0)
    for (const [key, value] of totals) values.set(key, { property: value.property, targetEntityUuid: value.targetEntityUuid, value: totalWeight>0?(value.value+Math.max(0,totalWeight-value.weight)*this.baseSampleValue(value))/totalWeight:this.baseSampleValue(value) })
    return { values, spriteAsset }
  }

  /** 结构说明（自动提取）：applySample；输入 owner、entities、sample、weight、additive、mask、state；直接调用 spritePose.get、spritePose.set、sample.values.values、mask.has、entities.find 等；写入 pose、owner.spriteRenderer.spriteAsset、pose.output、pose.touched 等；包含循环处理。 */ private applySample(owner: Entity, entities: Entity[], sample: SampledClip, weight: number, additive: boolean, mask: Set<AnimatableProperty> | null, state: AnimatorState): void {
    if(weight<=0)return
    if (sample.spriteAsset && owner.spriteRenderer && weight >= .5){let pose=this.spritePose.get(owner);if(!pose){pose={base:owner.spriteRenderer.spriteAsset,output:owner.spriteRenderer.spriteAsset,touched:true};this.spritePose.set(owner,pose)}owner.spriteRenderer.spriteAsset=sample.spriteAsset;pose.output=sample.spriteAsset;pose.touched=true}
    for (const sampled of sample.values.values()) {
      if (mask && !mask.has(sampled.property)) continue
      const entity = sampled.targetEntityUuid ? entities.find(/* 比较 candidate.uuid 与 sampled.targetEntityUuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === sampled.targetEntityUuid) : owner
      if (!entity) continue
      if (entity === owner && state.rootMotion === 'Ignore' && ['Transform.position.x','Transform.position.y','Transform.rotation'].includes(sampled.property)) continue
      const current = this.propertyValue(entity, sampled.property)
      if (current === null) continue
      const key=`${entity.uuid}:${sampled.property}`
      let applied=this.appliedPose.get(key)
      if(!applied||applied.entity!==entity){applied={entity,property:sampled.property,base:current,output:current,touched:true};this.appliedPose.set(key,applied)}
      applied.touched=true
      let sampledValue = sampled.value
      if (state.mirrorX && (sampled.property === 'Transform.position.x' || sampled.property === 'Transform.rotation')) sampledValue = -sampledValue
      if (state.mirrorY && (sampled.property === 'Transform.position.y' || sampled.property === 'Transform.rotation')) sampledValue = -sampledValue
      const value = additive ? current + (sampledValue-(sampled.property.includes('scale')||sampled.property.includes('opacity')?1:0)) * weight : current + (sampledValue - current) * weight
      this.setPropertyValue(entity, sampled.property, value)
      applied.output=this.propertyValue(entity,sampled.property)??value
    }
  }

  /** One transaction per timeline evaluation; repeated paused seeks restore the pre-timeline pose. */
  /** 结构说明（自动提取）：applyTimelineSamples；输入 requests、entities；直接调用 timelinePose.values、propertyValue、entities.includes、setPropertyValue、appliedPose.get 等；写入 entry.output、entity.spriteRenderer.spriteAsset、applied.output、timelineFrame 等；返回路径包含 diagnostics；包含循环处理。 */ applyTimelineSamples(requests:readonly TimelineAnimationSample[],entities:Entity[]):Array<{key:string;message:string}>{
    this.assertEntities(entities);this.assertTimelineOwners(requests)
    if(this.timelineFrame===this.frameSerial)for(const previous of this.timelinePose.values()){const current=this.propertyValue(previous.entity,previous.property);if(entities.includes(previous.entity)&&current!==null){const value=previous.base+current-previous.output;this.setPropertyValue(previous.entity,previous.property,value);const entry=this.appliedPose.get(`${previous.entity.uuid}:${previous.property}`);if(entry)entry.output=this.propertyValue(previous.entity,previous.property)??value}}
    if(this.timelineFrame===this.frameSerial)for(const [entity,pose] of this.timelineSprites){if(entities.includes(entity)&&entity.spriteRenderer){if(entity.spriteRenderer.spriteAsset===pose.output)entity.spriteRenderer.spriteAsset=pose.base;const applied=this.spritePose.get(entity);if(applied)applied.output=entity.spriteRenderer.spriteAsset}}
    this.timelinePose.clear();this.timelineSprites.clear();this.timelineFrame=this.frameSerial
    const diagnostics:Array<{key:string;message:string}>=[],totals=new Map<string,{entity:Entity;property:AnimatableProperty;value:number;weight:number;additive:number}>(),sprites=new Map<Entity,{asset:string;weight:number}>()
    for(const request of requests){const clip=this.documents.readAnimationClip(request.clipAsset);if(!clip){diagnostics.push({key:request.key,message:'Timeline animation asset is missing or invalid.'});continue}const sample=this.sampleClip(clip,request.time,request.loop??clip.loop),weight=Math.min(1,Math.max(0,finiteNumber(request.weight,1)))
      for(const value of sample.values.values()){const target=value.targetEntityUuid?entities.find(/* 比较 entity.uuid 与 value.targetEntityUuid，返回严格相等的判断结果。 */ entity=>entity.uuid===value.targetEntityUuid):request.owner;if(!target)continue;const key=`${target.uuid}:${value.property}`,current=this.propertyValue(target,value.property);if(current===null)continue;if(!this.timelinePose.has(key))this.timelinePose.set(key,{entity:target,property:value.property,base:current,output:current});const total=totals.get(key)??{entity:target,property:value.property,value:0,weight:0,additive:0};if(request.additive)total.additive+=(value.value-(value.property.includes('scale')||value.property.includes('opacity')?1:0))*weight;else{total.value+=value.value*weight;total.weight+=weight}totals.set(key,total)}
      if(sample.spriteAsset&&weight>=(sprites.get(request.owner)?.weight??.5))sprites.set(request.owner,{asset:sample.spriteAsset,weight})
    }
    const state:AnimatorState={id:'timeline',name:'Timeline',clipAsset:null,speed:1,speedParameter:null,cycleOffset:0,mirrorX:false,mirrorY:false,rootMotion:'Apply',x:0,y:0,subgraph:'Timeline',blendTree:null}
    for(const [key,total] of totals){const base=this.timelinePose.get(key)!.base,value=(total.weight>1?total.value/total.weight:base*(1-total.weight)+total.value)+total.additive;this.applySample(total.entity,entities,{values:new Map([[key,{property:total.property,targetEntityUuid:null,value}]]),spriteAsset:null},1,false,null,state)}
    for(const [entity,sprite] of sprites)if(entity.spriteRenderer){this.timelineSprites.set(entity,{base:entity.spriteRenderer.spriteAsset,output:sprite.asset});this.applySample(entity,entities,{values:new Map(),spriteAsset:sprite.asset},1,false,null,state)}

    for(const entry of this.timelinePose.values())entry.output=this.propertyValue(entry.entity,entry.property)??entry.output
    return diagnostics
  }

  /** 结构说明（自动提取）：propertyValue；输入 entity、property；直接调用 entity.getComponent；返回路径包含 entity.transform.position.x、entity.transform.position.y、entity.transform.rotation；包含循环处理。 */ private propertyValue(entity: Entity, property: AnimatableProperty): number | null {
    if (property === 'Transform.position.x') return entity.transform.position.x
    if (property === 'Transform.position.y') return entity.transform.position.y
    if (property === 'Transform.rotation') return entity.transform.rotation
    if (property === 'Transform.scale.x') return entity.transform.scale.x
    if (property === 'Transform.scale.y') return entity.transform.scale.y
    if (property === 'SpriteRenderer.opacity') return entity.spriteRenderer?.opacity ?? null
    for (const kind of ['Panel', 'Image', 'Text'] as const) { const component = entity.getComponent<{ opacity: number } & { readonly kind: typeof kind; enabled: boolean; removed: boolean; uuid: string }>(kind); if (component) return component.opacity }
    return null
  }

  /** 结构说明（自动提取）：setPropertyValue；输入 entity、property、value；直接调用 Math.max、Math.min、entity.getComponent；写入 entity.transform.position.x、entity.transform.position.y、entity.transform.rotation、entity.transform.scale.x 等；包含循环处理。 */ private setPropertyValue(entity: Entity, property: AnimatableProperty, value: number): void {
    if (property === 'Transform.position.x') entity.transform.position.x = value
    else if (property === 'Transform.position.y') entity.transform.position.y = value
    else if (property === 'Transform.rotation') entity.transform.rotation = value
    else if (property === 'Transform.scale.x') entity.transform.scale.x = Math.max(1e-6, value)
    else if (property === 'Transform.scale.y') entity.transform.scale.y = Math.max(1e-6, value)
    else if (property === 'SpriteRenderer.opacity' && entity.spriteRenderer) entity.spriteRenderer.opacity = Math.min(100, Math.max(0, value))
    else if (property === 'UI.opacity') for (const kind of ['Panel', 'Image', 'Text'] as const) { const component = entity.getComponent<{ opacity: number } & { readonly kind: typeof kind; enabled: boolean; removed: boolean; uuid: string }>(kind); if (component) component.opacity = Math.min(100, Math.max(0, value)) }
  }

  /** 结构说明（自动提取）：emitDispatches；输入 entity、clip、previousTime、rawTime；直接调用 animationDispatchesBetween、onEvent、onCommand；包含循环处理。 */ private emitDispatches(entity: Entity, clip: AnimationClipDocument, previousTime: number, rawTime: number): void {
    for (const dispatch of animationDispatchesBetween(clip, previousTime, rawTime)) {
      if (dispatch.kind === 'event') this.onEvent?.(entity, dispatch.event)
      else this.onCommand?.(entity, dispatch.track, dispatch.command)
    }
  }
}
export function applyAnimatorParameterFromDocuments(animator: Animator, name: string, value: AnimatorParameterValue, documents:AnimationTimelineDocumentReader): void {
  const controller = documents.readAnimatorController(animator.controllerAsset)
  const parameter = controller?.parameters.find(/* 比较 candidate.name 与 name，返回严格相等的判断结果。 */ candidate => candidate.name === name)
  if (!parameter) return
  animator.parameters[name] = parameterValue(value, parameter.type)
}
