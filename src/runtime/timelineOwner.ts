/** Fixed-World timeline execution, sharing its exact AnimationOwner and existing media-clock semantics. */
import type {Entity} from '../world/Entity'
import type {Canvas,TimelinePlayer} from '../world/components'
import {finiteNumber} from '../world/geometry'
import {MediaClock,mediaFrameTime} from './mediaClock'
import {timelineCrossings,type TimelineDocument,type TimelineClip,type TimelineTrackType,type TimelineMarker} from './timelineDocuments'
import type {TimelineAnimationSample} from './animationOwner'
import {AnimationOwner} from './animationOwner'
import {AnimationTimelineDocumentReader} from './animationTimelineDocumentReader'
import {validateAnimationTimelinePorts,type AnimationWorld,type AnimationTimelinePorts,type TimelinePresentation,type TimelineVoiceRequest} from './animationTimelineContracts'
interface TimelineState { asset: string | null; time: number; clock:MediaClock; publishedTime:number; initialized:boolean; suppressDispatch:boolean; fired: Set<string>; lastUnskippedTime: number; activeCameraUuid: string | null }
interface PendingTimelineEvent { order: number; crossed: number; target: Entity; clip: TimelineClip; type: TimelineTrackType; branchDestination?:number }
export class TimelineOwner {
 constructor(readonly world:AnimationWorld,readonly ports:AnimationTimelinePorts,readonly documents:AnimationTimelineDocumentReader,readonly animation:AnimationOwner,readonly presentation:TimelinePresentation){validateAnimationTimelinePorts(world,ports);if(animation.world!==world||animation.documents!==documents||animation.ports!==ports)throw new Error('ANIMATION_TIMELINE_CHILD_MISMATCH')}
 assertEntities(entities:Entity[]):void{this.animation.assertEntities(entities)}

  private states = new Map<string, TimelineState>()
  private animationSamples:TimelineAnimationSample[]=[]
  private audioVoices:TimelineVoiceRequest[]=[]
  private traversalVisits=0
  private visibilityPose=new Map<Entity,{base:boolean;output:boolean}>()
  private cameraPose=new Map<Entity,{base:boolean;output:boolean}>()
  onEvent: ((owner: Entity, clip: TimelineClip, type: TimelineTrackType) => void) | null = null
  /** 结构说明（自动提取）：reset；无显式参数；直接调用 restoreSceneFlags、visibilityPose.clear、cameraPose.clear、this.ports.audio.reconcileTimelineVoices、states.clear 等。 */ reset(): void { this.restoreSceneFlags();this.visibilityPose.clear();this.cameraPose.clear();this.ports.audio.reconcileTimelineVoices([],[]);this.states.clear();this.presentation.diagnostics.splice(0); this.presentation.subtitles.splice(0); this.presentation.cameraBlends.splice(0); this.presentation.eventOrder.splice(0); this.ports.camera.publishBlend(null) }

  /** 结构说明（自动提取）：skip；输入 ownerUuid、entities；直接调用 entities.find、owner.getComponent、readTimeline、states.get、timeline.tracks.some 等；写入 state.lastUnskippedTime、player.skipped。 */ skip(ownerUuid: string, entities: Entity[]): boolean {
    this.assertEntities(entities)
    const owner = entities.find(/* 比较 entity.uuid 与 ownerUuid，返回严格相等的判断结果。 */ entity => entity.uuid === ownerUuid), player = owner?.getComponent<TimelinePlayer>('TimelinePlayer'), timeline = this.documents.readTimeline(player?.timelineAsset ?? null), state = this.states.get(ownerUuid)
    if (!owner || !player || !timeline || !state) return false
    const blocksSkip = timeline.tracks.some(/** 结构说明（自动提取）：timeline.tracks.some 回调；输入 track；直接调用 track.clips.some；返回表达式求值结果。 */ track => !track.muted && track.clips.some(/* 先计算 !clip.skippable && state.time >= clip.start；仅当其为真值时求右侧 state.time <= clip.start + clip.duration，返回短路求值结果。 */ clip => !clip.skippable && state.time >= clip.start && state.time <= clip.start + clip.duration))
    if (blocksSkip) return false
    const marker = this.marker(timeline, timeline.skipMarker) ?? timeline.markers.find(/* 比较 candidate.time 与 state.time，返回大于的判断结果。 */ candidate => candidate.time > state.time); if (!marker) return false
    state.lastUnskippedTime = state.time;this.seek(ownerUuid,entities,marker.time);player.skipped=true;return true
  }
  /** 结构说明（自动提取）：resume；输入 ownerUuid、entities；直接调用 entities.find、owner.getComponent、readTimeline、states.get、marker 等；写入 player.playing、player.skipped。 */ resume(ownerUuid: string, entities: Entity[]): boolean {
    this.assertEntities(entities)
    const owner = entities.find(/* 比较 entity.uuid 与 ownerUuid，返回严格相等的判断结果。 */ entity => entity.uuid === ownerUuid), player = owner?.getComponent<TimelinePlayer>('TimelinePlayer'), timeline = this.documents.readTimeline(player?.timelineAsset ?? null), state = this.states.get(ownerUuid)
    if (!owner || !player || !timeline || !state) return false
    const destination = this.marker(timeline, timeline.resumeMarker)?.time ?? state.lastUnskippedTime; if (!Number.isFinite(destination)) return false
    player.playing=true;this.seek(ownerUuid,entities,destination);player.skipped=false;return true
  }

  /** 结构说明（自动提取）：seek；输入 ownerUuid、entities、seconds；直接调用 Number.isFinite、entities.find、owner.getComponent、readTimeline、Math.min 等；写入 state、state.time、state.publishedTime、state.suppressDispatch 等。 */ seek(ownerUuid:string,entities:Entity[],seconds:number):boolean{
    this.assertEntities(entities)
    if(!Number.isFinite(seconds))return false
    const owner=entities.find(/* 比较 entity.uuid 与 ownerUuid，返回严格相等的判断结果。 */ entity=>entity.uuid===ownerUuid),player=owner?.getComponent<TimelinePlayer>('TimelinePlayer'),timeline=this.documents.readTimeline(player?.timelineAsset??null)
    if(!owner||!player||!timeline)return false
    const time=Math.min(timeline.duration,Math.max(0,mediaFrameTime(seconds,timeline.frameRate)))
    let state=this.states.get(ownerUuid)
    if(!state||state.asset!==player.timelineAsset){state={asset:player.timelineAsset,time,clock:new MediaClock(time),publishedTime:time,initialized:true,suppressDispatch:true,fired:new Set(),lastUnskippedTime:0,activeCameraUuid:null};this.states.set(ownerUuid,state)}
    state.time=time;state.clock.seek(time);state.publishedTime=time;state.suppressDispatch=true;state.fired.clear();player.currentTime=time;this.update(entities,0);return true
  }

  /** 结构说明（自动提取）：update；输入 entities、delta；直接调用 restoreSceneFlags、performance.now、Set、entities.map、states.keys 等；写入 animationSamples、audioVoices、traversalVisits、this.presentation.processedClips 等；包含循环处理；包含显式抛错路径。 */ update(entities: Entity[], delta: number): void {
    this.assertEntities(entities)
    this.restoreSceneFlags();this.animationSamples=[];this.audioVoices=[];this.traversalVisits=0
    const started = this.ports.trace.nowMilliseconds(), alive = new Set(entities.map(/* 返回 entity.uuid 的当前值。 */ entity => entity.uuid)), pending: PendingTimelineEvent[] = []
    for (const uuid of this.states.keys()) if (!alive.has(uuid)) this.states.delete(uuid)
    for(const entity of this.visibilityPose.keys())if(!alive.has(entity.uuid))this.visibilityPose.delete(entity)
    for(const entity of this.cameraPose.keys())if(!alive.has(entity.uuid))this.cameraPose.delete(entity)
    this.presentation.subtitles.splice(0); this.presentation.cameraBlends.splice(0); this.presentation.processedClips = 0; this.presentation.nestedDepth = 0; this.presentation.eventOrder.splice(0); this.ports.camera.publishBlend(null)
    for (const owner of entities) {
      const player = owner.getComponent<TimelinePlayer>('TimelinePlayer'); if (!owner.enabled || !player?.enabled || !player.timelineAsset) continue
      const timeline = this.documents.readTimeline(player.timelineAsset); if (!timeline) continue
      let state = this.states.get(owner.uuid)
      if (!state || state.asset !== player.timelineAsset) {const time=Math.min(timeline.duration,Math.max(0,finiteNumber(player.currentTime)));state = { asset: player.timelineAsset, time:mediaFrameTime(time,timeline.frameRate),clock:new MediaClock(time),publishedTime:player.currentTime,initialized:false,suppressDispatch:false,fired: new Set(), lastUnskippedTime: 0, activeCameraUuid: null }; this.states.set(owner.uuid, state); player.playing = player.playing||player.autoplay }
      const previous=state.time,externalSeek=player.currentTime!==state.publishedTime
      if(externalSeek){state.clock.seek(Math.min(timeline.duration,Math.max(0,finiteNumber(player.currentTime))));state.suppressDispatch=true;state.fired.clear()}
      const scrubbing=!player.playing||state.suppressDispatch
      let raw=state.clock.seconds
      if(player.playing&&!state.suppressDispatch)raw=state.clock.advance(Math.max(0,finiteNumber(delta)),finiteNumber(player.speed,1))
      if(!scrubbing){
        const checkpoint=pending.length,clockCheckpoint=raw-Math.max(0,finiteNumber(delta))*finiteNumber(player.speed,1)
        try{
        let start=previous,finish=raw,includeStart=!state.initialized
        for(let jump=0;;jump++){
          const candidates:PendingTimelineEvent[]=[]
          this.collectEvents(owner,entities,timeline,start,finish,player.loop,includeStart,candidates,new Set([player.timelineAsset]),0,/* 返回 time 的当前值。 */ time=>time)
          const direction=finish>=start?1:-1
          candidates.sort(/* 先计算 direction*(a.crossed-b.crossed)；仅当其为假值时求右侧 a.order-b.order，返回短路求值结果。 */ (a,b)=>direction*(a.crossed-b.crossed)||a.order-b.order)
          const branch=candidates.find(/* 比较 event.branchDestination 与 undefined，返回严格不等的判断结果。 */ event=>event.branchDestination!==undefined)
          const accepted=branch?candidates.slice(0,candidates.indexOf(branch)+1):candidates
          // Event order follows traversal, including reverse playback and marker jumps.
          for(const event of accepted)pending.push({...event,order:pending.length})
          if(!branch)break
          if(jump>=63)throw new Error('TIMELINE_BRANCH_LIMIT: An update exceeds 64 marker jumps.')
          finish=branch.branchDestination!+(finish-branch.crossed);start=branch.branchDestination!;includeStart=false
        }
        state.clock.advance(finish-raw);raw=state.clock.seconds
        }catch(error){pending.splice(checkpoint);state.clock.seek(clockCheckpoint);player.playing=false;const message=error instanceof Error?error.message:String(error);if(!this.presentation.diagnostics.includes(message))this.presentation.diagnostics.push(message);this.presentation.diagnostics.splice(32);continue}
      }
      let cycles=0
      if(player.loop){cycles=Math.floor(raw/timeline.duration);if(cycles){state.clock.advance(-cycles*timeline.duration);raw=state.clock.seconds}}
      else if(raw>=timeline.duration||raw<0){raw=Math.min(timeline.duration,Math.max(0,raw));state.clock.seek(raw);player.playing=false}
      state.time=raw===timeline.duration?timeline.duration:Math.min(timeline.duration,Math.max(0,mediaFrameTime(raw,timeline.frameRate)))
      const unwrapped=state.time+cycles*timeline.duration
      player.currentTime=state.time;state.publishedTime=state.time
      this.applyTimeline(owner,entities,timeline,state,previous,state.time,unwrapped>=previous,cycles!==0,scrubbing,pending,0,new Set([player.timelineAsset]),unwrapped,owner.uuid,player.speed,player.playing,state.clock.seconds)
      state.initialized=true;state.suppressDispatch=false
    }
    for(const diagnostic of [...this.animation.applyTimelineSamples(this.animationSamples,entities),...this.ports.audio.reconcileTimelineVoices(this.audioVoices,entities)]){const message=diagnostic.key+': '+diagnostic.message;if(!this.presentation.diagnostics.includes(message))this.presentation.diagnostics.push(message)}
    this.presentation.diagnostics.splice(32)
    pending.sort(/* 计算表达式 a.order-b.order 并返回结果，沿用操作数的原有类型规则。 */ (a,b)=>a.order-b.order)
    for (const event of pending) { this.presentation.eventOrder.push(`${event.crossed.toFixed(6)}:${event.type}:${event.clip.id}`); this.onEvent?.(event.target, event.clip, event.type) }
    if (this.presentation.eventOrder.length > 256) this.presentation.eventOrder.splice(0, this.presentation.eventOrder.length - 256)
    this.presentation.lastUpdateMs = this.ports.trace.nowMilliseconds() - started
    this.presentation.longTimelineWarning = this.presentation.processedClips > 20_000 || this.presentation.lastUpdateMs > 8 ? `${this.presentation.processedClips} clips in ${this.presentation.lastUpdateMs.toFixed(2)} ms` : ''
  }

  /** Collect commands independently from the final pose, so a crossed nested clip is not lost. */
  /** 结构说明（自动提取）：collectEvents；输入 owner、entities、timeline、previous、next、loop、includeStart、pending、visited、depth、mapTime；直接调用 Error、Math.min、Math.max、entities.find、timelineCrossings 等；包含循环处理；包含显式抛错路径。 */ private collectEvents(owner:Entity,entities:Entity[],timeline:TimelineDocument,previous:number,next:number,loop:boolean,includeStart:boolean,pending:PendingTimelineEvent[],visited:Set<string>,depth:number,mapTime:(time:number)=>number):void{
    if(depth>8)throw new Error('TIMELINE_DEPTH_LIMIT: Nested timelines exceed eight levels.')
    const low=Math.min(previous,next),high=Math.max(previous,next),forward=next>=previous
    for(const track of timeline.tracks){if(track.muted)continue
      for(const clip of track.clips){
        if(++this.traversalVisits>100000)throw new Error('TIMELINE_WORK_LIMIT: An update exceeds 100,000 clip visits.')
        const target=clip.targetEntityUuid?entities.find(/* 比较 entity.uuid 与 clip.targetEntityUuid，返回严格相等的判断结果。 */ entity=>entity.uuid===clip.targetEntityUuid):owner;if(!target)continue
        if(track.type==='Event'||track.type==='ScriptCall'||track.type==='Animation'&&!clip.asset||track.type==='Branch'){
          for(const crossed of timelineCrossings(clip.start,previous,next,timeline.duration,loop,includeStart)){
            const marker=track.type==='Branch'&&this.branchMatches(clip,owner.getComponent<TimelinePlayer>('TimelinePlayer'))?this.marker(timeline,String(clip.value)):undefined
            if(track.type==='Branch'&&!marker)continue
            if(pending.length>=10000)throw new Error('TIMELINE_EVENT_LIMIT: An update exceeds 10,000 commands.')
            const cycle=loop?Math.floor((crossed-clip.start)/timeline.duration):0
            pending.push({order:pending.length,crossed:mapTime(crossed),target,clip,type:track.type,...(marker?{branchDestination:mapTime(cycle*timeline.duration+marker.time)}:{})})
          }
        }else if(track.type==='NestedTimeline'&&clip.asset){
          if(visited.has(clip.asset))throw new Error('TIMELINE_CYCLE: A nested timeline contains itself.')
          const nested=this.documents.readTimeline(clip.asset);if(!nested)continue
          const end=Math.min(timeline.duration,clip.start+clip.duration),first=loop?Math.floor((low-end)/timeline.duration):0,last=loop?Math.floor((high-clip.start)/timeline.duration):0
          if(last-first>10000)throw new Error('TIMELINE_EVENT_LIMIT: Too many nested clip occurrences.')
          const nestedVisited=new Set(visited);nestedVisited.add(clip.asset)
          for(let cycle=first;cycle<=last;cycle++){
            const start=clip.start+cycle*timeline.duration,stop=end+cycle*timeline.duration,from=Math.max(low,start),to=Math.min(high,stop)
            if(to<from||to===from&&!(includeStart&&from===previous))continue
            const local=/* 调用 Math.min(nested.duration,Math.max(0,clip.offset+(time-start)*clip.playbackRate)) 并返回调用结果。 */ (time:number)=>Math.min(nested.duration,Math.max(0,clip.offset+(time-start)*clip.playbackRate)),a=local(forward?from:to),b=local(forward?to:from)
            this.collectEvents(target,entities,nested,a,b,false,includeStart&&(forward?from:to)===previous||forward&&from===start&&start>previous||!forward&&to===stop&&stop<previous,pending,nestedVisited,depth+1,/* 调用 mapTime(start+(time-clip.offset)/clip.playbackRate) 并返回调用结果。 */ time=>mapTime(start+(time-clip.offset)/clip.playbackRate))
          }
        }
      }
    }
  }

  /** 结构说明（自动提取）：applyTimeline；输入 owner、entities、timeline、state、_previous、current、movingForward、_wrapped、scrubbing、pending、depth、visited、_rawEnd、path、rate、playing、preciseTime；直接调用 Math.max、entities.find、Math.min、visibilityPose.get、visibilityPose.set 等；写入 this.presentation.nestedDepth、pose、target.enabled、pose.output；包含循环处理。 */ private applyTimeline(owner: Entity, entities: Entity[], timeline: TimelineDocument, state: TimelineState, _previous: number, current: number, movingForward: boolean, _wrapped: boolean, scrubbing: boolean, pending: PendingTimelineEvent[], depth: number, visited: Set<string>, _rawEnd=current,path=owner.uuid,rate=1,playing=false,preciseTime=current,inheritedWeight=1): void {
    if (depth > 8) return; this.presentation.nestedDepth = Math.max(this.presentation.nestedDepth, depth)
    for (let trackIndex = 0; trackIndex < timeline.tracks.length; trackIndex++) {
      const track = timeline.tracks[trackIndex]; if (track.muted) continue
      for (let clipIndex = 0; clipIndex < track.clips.length; clipIndex++) {
        const clip = track.clips[clipIndex]; this.presentation.processedClips++
        const target = clip.targetEntityUuid ? entities.find(/* 比较 entity.uuid 与 clip.targetEntityUuid，返回严格相等的判断结果。 */ entity => entity.uuid === clip.targetEntityUuid) : owner; if (!target) continue
        const clipEnd = Math.min(timeline.duration, clip.start + clip.duration), active = current >= clip.start && (current < clipEnd || (track.type==='Animation'||track.type==='NestedTimeline')&&current===timeline.duration&&clipEnd===timeline.duration)
        const instance=`${path}:${trackIndex}:${clipIndex}`
        if (track.type === 'Visibility' && current>=clip.start){let pose=this.visibilityPose.get(target);if(!pose){pose={base:target.enabled,output:target.enabled};this.visibilityPose.set(target,pose)}target.enabled=clip.value!==false&&clip.value!=='false';pose.output=target.enabled}
        else if (track.type === 'Camera' && current>=clip.start) this.applyCamera(owner, entities, state, clip, current)
        else if (track.type === 'Subtitle' && active) this.applySubtitle(owner, clip, current)
        else if(track.type==='Audio'&&active&&clip.asset){const local=Math.max(0,preciseTime-clip.start),weight=Math.min(clip.blendIn>0?Math.min(1,local/clip.blendIn):1,clip.blendOut>0?Math.min(1,Math.max(0,clipEnd-current)/clip.blendOut):1);this.audioVoices.push({key:instance,ownerUuid:owner.uuid,entity:target,reference:clip.asset,time:clip.offset+local*clip.playbackRate,playbackRate:clip.playbackRate*rate,gain:weight*inheritedWeight,playing:playing&&!scrubbing})}
        else if(track.type==='Animation'&&active&&clip.asset){const local=Math.max(0,current-clip.start),weight=Math.min(clip.blendIn>0?Math.min(1,local/clip.blendIn):1,clip.blendOut>0?Math.min(1,Math.max(0,clipEnd-current)/clip.blendOut):1);this.animationSamples.push({key:instance,owner:target,clipAsset:clip.asset,time:clip.offset+local*clip.playbackRate,weight:weight*inheritedWeight})}
        else if (track.type === 'NestedTimeline' && active && clip.asset && !visited.has(clip.asset)) {
          const nested = this.documents.readTimeline(clip.asset); if (nested) {
            const exact=Math.min(nested.duration,clip.offset+Math.max(0,preciseTime-clip.start)*clip.playbackRate),local=exact===nested.duration?exact:mediaFrameTime(exact,nested.frameRate),nestedVisited=new Set(visited)
            nestedVisited.add(clip.asset)
            // 父片段淡入淡出逐层乘入子动画权重与音频增益，不影响事件派发。
            const elapsed=Math.max(0,preciseTime-clip.start),envelope=Math.min(clip.blendIn>0?Math.min(1,elapsed/clip.blendIn):1,clip.blendOut>0?Math.min(1,Math.max(0,clipEnd-preciseTime)/clip.blendOut):1)
            this.applyTimeline(target,entities,nested,state,local,local,movingForward,false,scrubbing,pending,depth+1,nestedVisited,local,instance,rate*clip.playbackRate,playing,exact,inheritedWeight*envelope)
          }

        }
      }
    }
  }

  /** 结构说明（自动提取）：restoreSceneFlags；无显式参数；写入 pose.base、entity.enabled、pose.output、entity.camera2D.active；包含循环处理。 */ private restoreSceneFlags():void{
    for(const [entity,pose] of this.visibilityPose){if(entity.enabled!==pose.output)pose.base=entity.enabled;entity.enabled=pose.base;pose.output=pose.base}
    for(const [entity,pose] of this.cameraPose)if(entity.camera2D){if(entity.camera2D.active!==pose.output)pose.base=entity.camera2D.active;entity.camera2D.active=pose.base;pose.output=pose.base}
  }
  /** 结构说明（自动提取）：applySubtitle；输入 owner、clip、time；直接调用 Math.min、Math.max、String、JSON.parse、owner.getComponent 等；写入 text。 */ private applySubtitle(owner: Entity, clip: TimelineClip, time: number): void {
    const progress = Math.min(1, Math.max(0, time - clip.start) / Math.max(.001, clip.duration)); let text = String(clip.value)
    try { const payload = clip.payload ? JSON.parse(clip.payload) as { text?: string } : null; if (payload?.text) text = String(payload.text) } catch { /* Text payload remains literal. */ }
    const locale = clip.locale || owner.getComponent<Canvas>('Canvas')?.localePreview || this.ports.locale.currentLocale()
    this.presentation.subtitles.push({ ownerUuid: owner.uuid, clipId: clip.id, text: this.ports.locale.localize(text.slice(0, 4096), locale).slice(0, 4096), locale, safeArea: clip.safeArea, progress })
  }
  /** 结构说明（自动提取）：applyCamera；输入 owner、entities、state、clip、time；直接调用 entities.find、Math.max、Math.min、cameraPose.get、cameraPose.set 等；写入 weight、pose、entity.camera2D.active、pose.output 等；包含循环处理。 */ private applyCamera(owner: Entity, entities: Entity[], state: TimelineState, clip: TimelineClip, time: number): void {
    const target = entities.find(/* 比较 entity.uuid 与 clip.targetEntityUuid，返回严格相等的判断结果。 */ entity => entity.uuid === clip.targetEntityUuid) ?? owner; if (!target.camera2D) return
    const previous = state.activeCameraUuid && state.activeCameraUuid !== target.uuid ? state.activeCameraUuid : entities.find(/* 先计算 entity.camera2D?.active；仅当其为真值时求右侧 entity.uuid !== target.uuid，返回短路求值结果。 */ entity => entity.camera2D?.active && entity.uuid !== target.uuid)?.uuid ?? null
    const local = Math.max(0, time - clip.start), blendIn = Math.min(clip.duration, clip.blendIn), blendOut = Math.min(clip.duration, clip.blendOut); let weight = blendIn > 0 ? Math.min(1, local / blendIn) : 1
    if (blendOut > 0 && local > clip.duration - blendOut) weight = Math.min(weight, Math.max(0, (clip.duration - local) / blendOut))
    if(time>=clip.start+clip.duration)weight=1
    for (const entity of entities) if (entity.camera2D){let pose=this.cameraPose.get(entity);if(!pose){pose={base:entity.camera2D.active,output:entity.camera2D.active};this.cameraPose.set(entity,pose)}entity.camera2D.active=entity===target;pose.output=entity.camera2D.active}
    state.activeCameraUuid = target.uuid; const value = { ownerUuid: owner.uuid, clipId: clip.id, fromEntityUuid: previous, toEntityUuid: target.uuid, weight }; this.presentation.cameraBlends.push(value); this.ports.camera.publishBlend(value)
  }
  /** 结构说明（自动提取）：branchMatches；输入 clip、player；直接调用 clip.payload.trim、JSON.parse。 */ private branchMatches(clip: TimelineClip, player: TimelinePlayer | null | undefined): boolean {
    if (!clip.payload.trim()) return true
    try { const condition = JSON.parse(clip.payload) as { variable?: string; equals?: string | number | boolean; notEquals?: string | number | boolean }; if (!condition.variable) return true; const actual = player?.variables[condition.variable]; return condition.notEquals !== undefined ? actual !== condition.notEquals : actual === condition.equals } catch { return false }
  }
  /* 根据 identifier 的真假，分别返回 timeline.markers.find(marker => marker.id === identifier || marker.name === identifier) 或 undefined。 */ private marker(timeline: TimelineDocument, identifier: string): TimelineMarker | undefined { return identifier ? timeline.markers.find(/* 先计算 marker.id === identifier；仅当其为假值时求右侧 marker.name === identifier，返回短路求值结果。 */ marker => marker.id === identifier || marker.name === identifier) : undefined }
}
