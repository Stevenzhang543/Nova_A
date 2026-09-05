import { reactive } from 'vue'
import { assetReference, assetState, createTextAsset, readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import type { Entity } from '../world/Entity'
import { finiteNumber } from '../world/geometry'
import type { Canvas, TimelinePlayer } from '../world/components'
import { audioRuntime, type TimelineAudioVoiceRequest } from './audio'
import { MediaClock, mediaFrameTime } from './mediaClock'
import { localizationSettings, localizeUiLabel } from './localization'
import { animationRuntime, type TimelineAnimationSample } from './animation'
import { setTimelineCameraBlend } from '../renderer/sceneRenderer'

export type TimelineTrackType = 'Animation' | 'Audio' | 'Camera' | 'Event' | 'Visibility' | 'ScriptCall' | 'NestedTimeline' | 'Subtitle' | 'Branch'
export type SubtitleSafeArea = 'TitleSafe' | 'ActionSafe' | 'FullFrame'
export interface TimelineMarker { id: string; name: string; time: number; color: string }
export interface TimelineClip {
  id: string
  start: number
  duration: number
  offset: number
  playbackRate: number
  blendIn: number
  blendOut: number
  asset: string | null
  targetEntityUuid: string | null
  value: string | number | boolean
  payload: string
  locale: string
  safeArea: SubtitleSafeArea
  skippable: boolean
}
export interface TimelineTrack { id: string; name: string; type: TimelineTrackType; muted: boolean; clips: TimelineClip[] }
export interface TimelineDocument {
  version: 2
  name: string
  duration: number
  frameRate: number
  markers: TimelineMarker[]
  skipMarker: string
  resumeMarker: string
  tracks: TimelineTrack[]
}

export interface ActiveTimelineSubtitle { ownerUuid: string; clipId: string; text: string; locale: string; safeArea: SubtitleSafeArea; progress: number }
export interface ActiveTimelineCameraBlend { ownerUuid: string; clipId: string; fromEntityUuid: string | null; toEntityUuid: string; weight: number }
export const timelinePresentationState = reactive({
  subtitles: [] as ActiveTimelineSubtitle[], cameraBlends: [] as ActiveTimelineCameraBlend[], processedClips: 0, nestedDepth: 0,
  lastUpdateMs: 0, longTimelineWarning: '', diagnostics: [] as string[], eventOrder: [] as string[]
})

const TRACK_TYPES = new Set<TimelineTrackType>(['Animation', 'Audio', 'Camera', 'Event', 'Visibility', 'ScriptCall', 'NestedTimeline', 'Subtitle', 'Branch'])
const SAFE_AREAS = new Set<SubtitleSafeArea>(['TitleSafe', 'ActionSafe', 'FullFrame'])
function id(value: unknown, fallback: string): string { const safe = typeof value === 'string' ? value.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) : ''; return safe || fallback }

export function defaultTimeline(name = 'New Timeline'): TimelineDocument { return { version: 2, name, duration: 5, frameRate: 60, markers: [], skipMarker: '', resumeMarker: '', tracks: [] } }

export function normalizeTimeline(source: unknown): TimelineDocument {
  const item = source && typeof source === 'object' ? source as Partial<TimelineDocument> : {}, duration = Math.min(86_400, Math.max(1 / 240, finiteNumber(item.duration, 5)))
  const markers = (Array.isArray(item.markers) ? item.markers : []).slice(0, 10_000).map((marker, index) => ({
    id: id(marker?.id, `marker_${index + 1}`), name: typeof marker?.name === 'string' ? marker.name.trim().slice(0, 128) : `Marker ${index + 1}`,
    time: Math.min(duration, Math.max(0, finiteNumber(marker?.time))), color: typeof marker?.color === 'string' && /^#[0-9a-f]{6}$/i.test(marker.color) ? marker.color : '#6ea8ff'
  })).sort((a, b) => a.time - b.time || a.id.localeCompare(b.id))
  const requestedTracks=Array.isArray(item.tracks)?item.tracks:[]
  if(requestedTracks.reduce((sum,track)=>sum+(Array.isArray(track?.clips)?track.clips.length:0),0)>100000)throw new Error('TIMELINE_DOCUMENT_LIMIT: A timeline supports at most 100,000 clips.')
  const tracks = (Array.isArray(item.tracks) ? item.tracks : []).slice(0, 512).map((track, index) => ({
    id: id(track?.id, `track_${index + 1}`), name: typeof track?.name === 'string' ? track.name.slice(0, 80) : `Track ${index + 1}`,
    type: TRACK_TYPES.has(track?.type as TimelineTrackType) ? track!.type as TimelineTrackType : 'Animation', muted: track?.muted === true,
    clips: (Array.isArray(track?.clips) ? track.clips : []).slice(0, 10_000).map((clip, clipIndex) => ({
      id: id(clip?.id, `clip_${index + 1}_${clipIndex + 1}`), start: Math.min(duration, Math.max(0, finiteNumber(clip?.start))),
      duration: Math.min(duration, Math.max(1 / 1000, finiteNumber(clip?.duration, 1))), offset: Math.max(0, finiteNumber(clip?.offset)),
      playbackRate: Math.min(100, Math.max(.001, finiteNumber(clip?.playbackRate, 1))), blendIn: Math.min(duration, Math.max(0, finiteNumber(clip?.blendIn))), blendOut: Math.min(duration, Math.max(0, finiteNumber(clip?.blendOut))),
      asset: typeof clip?.asset === 'string' ? clip.asset : null, targetEntityUuid: typeof clip?.targetEntityUuid === 'string' ? clip.targetEntityUuid : null,
      value: typeof clip?.value === 'string' || typeof clip?.value === 'boolean' || typeof clip?.value === 'number' && Number.isFinite(clip.value) ? clip.value : '', payload: typeof clip?.payload === 'string' ? clip.payload.slice(0, 16_384) : '',
      locale: typeof clip?.locale === 'string' ? clip.locale.slice(0, 24) : '', safeArea: SAFE_AREAS.has(clip?.safeArea as SubtitleSafeArea) ? clip!.safeArea as SubtitleSafeArea : 'TitleSafe', skippable: clip?.skippable !== false
    })).sort((a, b) => a.start - b.start || a.id.localeCompare(b.id))
  }))
  return { version: 2, name: typeof item.name === 'string' ? item.name.slice(0, 120) : 'Timeline', duration, frameRate: Math.min(240, Math.max(1, finiteNumber(item.frameRate, 60))), markers,
    skipMarker: typeof item.skipMarker === 'string' && markers.some(marker => marker.id === item.skipMarker || marker.name === item.skipMarker) ? item.skipMarker : '',
    resumeMarker: typeof item.resumeMarker === 'string' && markers.some(marker => marker.id === item.resumeMarker || marker.name === item.resumeMarker) ? item.resumeMarker : '', tracks }
}

const cache = new Map<string, { generation: number; value: TimelineDocument | null }>()
let cacheGeneration=-1
export function readTimeline(reference: string | null): TimelineDocument | null {
  if (!reference) return null
  if(cacheGeneration!==assetState.generation){cache.clear();cacheGeneration=assetState.generation}while(cache.size>=256)cache.delete(cache.keys().next().value!)
  const cached = cache.get(reference); if (cached?.generation === assetState.generation) return cached.value
  const asset = resolveAsset(reference), source = readTextAsset(reference); let value: TimelineDocument | null = null
  if (asset?.assetType === 'timeline' && source) try { value = normalizeTimeline(JSON.parse(source)) } catch { value = null }
  cache.set(reference, { generation: assetState.generation, value }); return value
}
export function createTimelineAsset(name = 'New Timeline'): AssetRecord { return createTextAsset(name, 'timeline', JSON.stringify(defaultTimeline(name), null, 2), 'Assets/Timelines') }
export function timelineAssetReference(asset: AssetRecord): string { return assetReference(asset.uuid) }

interface TimelineState { asset: string | null; time: number; clock:MediaClock; publishedTime:number; initialized:boolean; suppressDispatch:boolean; fired: Set<string>; lastUnskippedTime: number; activeCameraUuid: string | null }
interface PendingTimelineEvent { order: number; crossed: number; target: Entity; clip: TimelineClip; type: TimelineTrackType; branchDestination?:number }


/** Half-open traversal prevents duplicate endpoints; explicit seeks do not dispatch events. */
export function timelineCrossings(time:number,previous:number,next:number,duration:number,loop:boolean,includePrevious=false):number[]{
  if(![time,previous,next,duration].every(Number.isFinite)||duration<=0)return []
  const forward=next>=previous,low=Math.min(previous,next),high=Math.max(previous,next),output:number[]=[]
  const first=loop?Math.ceil((low-time)/duration):0,last=loop?Math.floor((high-time)/duration):0
  if(last-first>10000)throw new Error('TIMELINE_EVENT_LIMIT: One update crosses more than 10,000 clip occurrences.')
  for(let cycle=first;cycle<=last;cycle++){const crossed=time+cycle*duration;if(forward?(crossed>previous||includePrevious&&crossed===previous)&&crossed<=next:crossed>=next&&(crossed<previous||includePrevious&&crossed===previous))output.push(crossed)}
  return forward?output:output.reverse()
}

class TimelineRuntime {
  private states = new Map<string, TimelineState>()
  private animationSamples:TimelineAnimationSample[]=[]
  private audioVoices:TimelineAudioVoiceRequest[]=[]
  private traversalVisits=0
  private visibilityPose=new Map<Entity,{base:boolean;output:boolean}>()
  private cameraPose=new Map<Entity,{base:boolean;output:boolean}>()
  onEvent: ((owner: Entity, clip: TimelineClip, type: TimelineTrackType) => void) | null = null
  reset(): void { this.restoreSceneFlags();this.visibilityPose.clear();this.cameraPose.clear();audioRuntime.reconcileTimelineVoices([],[]);this.states.clear();timelinePresentationState.diagnostics.splice(0); timelinePresentationState.subtitles.splice(0); timelinePresentationState.cameraBlends.splice(0); timelinePresentationState.eventOrder.splice(0); setTimelineCameraBlend(null) }

  skip(ownerUuid: string, entities: Entity[]): boolean {
    const owner = entities.find(entity => entity.uuid === ownerUuid), player = owner?.getComponent<TimelinePlayer>('TimelinePlayer'), timeline = readTimeline(player?.timelineAsset ?? null), state = this.states.get(ownerUuid)
    if (!owner || !player || !timeline || !state) return false
    const blocksSkip = timeline.tracks.some(track => !track.muted && track.clips.some(clip => !clip.skippable && state.time >= clip.start && state.time <= clip.start + clip.duration))
    if (blocksSkip) return false
    const marker = this.marker(timeline, timeline.skipMarker) ?? timeline.markers.find(candidate => candidate.time > state.time); if (!marker) return false
    state.lastUnskippedTime = state.time;this.seek(ownerUuid,entities,marker.time);player.skipped=true;return true
  }
  resume(ownerUuid: string, entities: Entity[]): boolean {
    const owner = entities.find(entity => entity.uuid === ownerUuid), player = owner?.getComponent<TimelinePlayer>('TimelinePlayer'), timeline = readTimeline(player?.timelineAsset ?? null), state = this.states.get(ownerUuid)
    if (!owner || !player || !timeline || !state) return false
    const destination = this.marker(timeline, timeline.resumeMarker)?.time ?? state.lastUnskippedTime; if (!Number.isFinite(destination)) return false
    player.playing=true;this.seek(ownerUuid,entities,destination);player.skipped=false;return true
  }

  seek(ownerUuid:string,entities:Entity[],seconds:number):boolean{
    if(!Number.isFinite(seconds))return false
    const owner=entities.find(entity=>entity.uuid===ownerUuid),player=owner?.getComponent<TimelinePlayer>('TimelinePlayer'),timeline=readTimeline(player?.timelineAsset??null)
    if(!owner||!player||!timeline)return false
    const time=Math.min(timeline.duration,Math.max(0,mediaFrameTime(seconds,timeline.frameRate)))
    let state=this.states.get(ownerUuid)
    if(!state||state.asset!==player.timelineAsset){state={asset:player.timelineAsset,time,clock:new MediaClock(time),publishedTime:time,initialized:true,suppressDispatch:true,fired:new Set(),lastUnskippedTime:0,activeCameraUuid:null};this.states.set(ownerUuid,state)}
    state.time=time;state.clock.seek(time);state.publishedTime=time;state.suppressDispatch=true;state.fired.clear();player.currentTime=time;this.update(entities,0);return true
  }

  update(entities: Entity[], delta: number): void {
    this.restoreSceneFlags();this.animationSamples=[];this.audioVoices=[];this.traversalVisits=0
    const started = performance.now(), alive = new Set(entities.map(entity => entity.uuid)), pending: PendingTimelineEvent[] = []
    for (const uuid of this.states.keys()) if (!alive.has(uuid)) this.states.delete(uuid)
    for(const entity of this.visibilityPose.keys())if(!alive.has(entity.uuid))this.visibilityPose.delete(entity)
    for(const entity of this.cameraPose.keys())if(!alive.has(entity.uuid))this.cameraPose.delete(entity)
    timelinePresentationState.subtitles.splice(0); timelinePresentationState.cameraBlends.splice(0); timelinePresentationState.processedClips = 0; timelinePresentationState.nestedDepth = 0; timelinePresentationState.eventOrder.splice(0); setTimelineCameraBlend(null)
    for (const owner of entities) {
      const player = owner.getComponent<TimelinePlayer>('TimelinePlayer'); if (!owner.enabled || !player?.enabled || !player.timelineAsset) continue
      const timeline = readTimeline(player.timelineAsset); if (!timeline) continue
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
          this.collectEvents(owner,entities,timeline,start,finish,player.loop,includeStart,candidates,new Set([player.timelineAsset]),0,time=>time)
          const direction=finish>=start?1:-1
          candidates.sort((a,b)=>direction*(a.crossed-b.crossed)||a.order-b.order)
          const branch=candidates.find(event=>event.branchDestination!==undefined)
          const accepted=branch?candidates.slice(0,candidates.indexOf(branch)+1):candidates
          // Event order follows traversal, including reverse playback and marker jumps.
          for(const event of accepted)pending.push({...event,order:pending.length})
          if(!branch)break
          if(jump>=63)throw new Error('TIMELINE_BRANCH_LIMIT: An update exceeds 64 marker jumps.')
          finish=branch.branchDestination!+(finish-branch.crossed);start=branch.branchDestination!;includeStart=false
        }
        state.clock.advance(finish-raw);raw=state.clock.seconds
        }catch(error){pending.splice(checkpoint);state.clock.seek(clockCheckpoint);player.playing=false;const message=error instanceof Error?error.message:String(error);if(!timelinePresentationState.diagnostics.includes(message))timelinePresentationState.diagnostics.push(message);timelinePresentationState.diagnostics.splice(32);continue}
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
    for(const diagnostic of [...animationRuntime.applyTimelineSamples(this.animationSamples,entities),...audioRuntime.reconcileTimelineVoices(this.audioVoices,entities)]){const message=diagnostic.key+': '+diagnostic.message;if(!timelinePresentationState.diagnostics.includes(message))timelinePresentationState.diagnostics.push(message)}
    timelinePresentationState.diagnostics.splice(32)
    pending.sort((a,b)=>a.order-b.order)
    for (const event of pending) { timelinePresentationState.eventOrder.push(`${event.crossed.toFixed(6)}:${event.type}:${event.clip.id}`); this.onEvent?.(event.target, event.clip, event.type) }
    if (timelinePresentationState.eventOrder.length > 256) timelinePresentationState.eventOrder.splice(0, timelinePresentationState.eventOrder.length - 256)
    timelinePresentationState.lastUpdateMs = performance.now() - started
    timelinePresentationState.longTimelineWarning = timelinePresentationState.processedClips > 20_000 || timelinePresentationState.lastUpdateMs > 8 ? `${timelinePresentationState.processedClips} clips in ${timelinePresentationState.lastUpdateMs.toFixed(2)} ms` : ''
  }

  /** Collect commands independently from the final pose, so a crossed nested clip is not lost. */
  private collectEvents(owner:Entity,entities:Entity[],timeline:TimelineDocument,previous:number,next:number,loop:boolean,includeStart:boolean,pending:PendingTimelineEvent[],visited:Set<string>,depth:number,mapTime:(time:number)=>number):void{
    if(depth>8)throw new Error('TIMELINE_DEPTH_LIMIT: Nested timelines exceed eight levels.')
    const low=Math.min(previous,next),high=Math.max(previous,next),forward=next>=previous
    for(const track of timeline.tracks){if(track.muted)continue
      for(const clip of track.clips){
        if(++this.traversalVisits>100000)throw new Error('TIMELINE_WORK_LIMIT: An update exceeds 100,000 clip visits.')
        const target=clip.targetEntityUuid?entities.find(entity=>entity.uuid===clip.targetEntityUuid):owner;if(!target)continue
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
          const nested=readTimeline(clip.asset);if(!nested)continue
          const end=Math.min(timeline.duration,clip.start+clip.duration),first=loop?Math.floor((low-end)/timeline.duration):0,last=loop?Math.floor((high-clip.start)/timeline.duration):0
          if(last-first>10000)throw new Error('TIMELINE_EVENT_LIMIT: Too many nested clip occurrences.')
          const nestedVisited=new Set(visited);nestedVisited.add(clip.asset)
          for(let cycle=first;cycle<=last;cycle++){
            const start=clip.start+cycle*timeline.duration,stop=end+cycle*timeline.duration,from=Math.max(low,start),to=Math.min(high,stop)
            if(to<from||to===from&&!(includeStart&&from===previous))continue
            const local=(time:number)=>Math.min(nested.duration,Math.max(0,clip.offset+(time-start)*clip.playbackRate)),a=local(forward?from:to),b=local(forward?to:from)
            this.collectEvents(target,entities,nested,a,b,false,includeStart&&from===previous||forward&&from===start&&start>previous,pending,nestedVisited,depth+1,time=>mapTime(start+(time-clip.offset)/clip.playbackRate))
          }
        }
      }
    }
  }

  private applyTimeline(owner: Entity, entities: Entity[], timeline: TimelineDocument, state: TimelineState, _previous: number, current: number, movingForward: boolean, _wrapped: boolean, scrubbing: boolean, pending: PendingTimelineEvent[], depth: number, visited: Set<string>, _rawEnd=current,path=owner.uuid,rate=1,playing=false,preciseTime=current): void {
    if (depth > 8) return; timelinePresentationState.nestedDepth = Math.max(timelinePresentationState.nestedDepth, depth)
    for (let trackIndex = 0; trackIndex < timeline.tracks.length; trackIndex++) {
      const track = timeline.tracks[trackIndex]; if (track.muted) continue
      for (let clipIndex = 0; clipIndex < track.clips.length; clipIndex++) {
        const clip = track.clips[clipIndex]; timelinePresentationState.processedClips++
        const target = clip.targetEntityUuid ? entities.find(entity => entity.uuid === clip.targetEntityUuid) : owner; if (!target) continue
        const clipEnd = Math.min(timeline.duration, clip.start + clip.duration), active = current >= clip.start && (current < clipEnd || track.type==='Animation'&&current===timeline.duration&&clipEnd===timeline.duration)
        const instance=`${path}:${trackIndex}:${clipIndex}`
        if (track.type === 'Visibility' && current>=clip.start){let pose=this.visibilityPose.get(target);if(!pose){pose={base:target.enabled,output:target.enabled};this.visibilityPose.set(target,pose)}target.enabled=clip.value!==false&&clip.value!=='false';pose.output=target.enabled}
        else if (track.type === 'Camera' && current>=clip.start) this.applyCamera(owner, entities, state, clip, current)
        else if (track.type === 'Subtitle' && active) this.applySubtitle(owner, clip, current)
        else if(track.type==='Audio'&&active&&clip.asset){const local=Math.max(0,preciseTime-clip.start),weight=Math.min(clip.blendIn>0?Math.min(1,local/clip.blendIn):1,clip.blendOut>0?Math.min(1,Math.max(0,clipEnd-current)/clip.blendOut):1);this.audioVoices.push({key:instance,ownerUuid:owner.uuid,entity:target,reference:clip.asset,time:clip.offset+local*clip.playbackRate,playbackRate:clip.playbackRate*rate,gain:weight,playing:playing&&!scrubbing})}
        else if(track.type==='Animation'&&active&&clip.asset){const local=Math.max(0,current-clip.start),weight=Math.min(clip.blendIn>0?Math.min(1,local/clip.blendIn):1,clip.blendOut>0?Math.min(1,Math.max(0,clipEnd-current)/clip.blendOut):1);this.animationSamples.push({key:instance,owner:target,clipAsset:clip.asset,time:clip.offset+local*clip.playbackRate,weight})}
        else if (track.type === 'NestedTimeline' && active && clip.asset && !visited.has(clip.asset)) {
          const nested = readTimeline(clip.asset); if (nested) {
            const exact=Math.min(nested.duration,clip.offset+Math.max(0,preciseTime-clip.start)*clip.playbackRate),local=exact===nested.duration?exact:mediaFrameTime(exact,nested.frameRate),nestedVisited=new Set(visited)
            nestedVisited.add(clip.asset)
            this.applyTimeline(target,entities,nested,state,local,local,movingForward,false,scrubbing,pending,depth+1,nestedVisited,local,instance,rate*clip.playbackRate,playing,exact)
          }

        }
      }
    }
  }

  private restoreSceneFlags():void{
    for(const [entity,pose] of this.visibilityPose){if(entity.enabled!==pose.output)pose.base=entity.enabled;entity.enabled=pose.base;pose.output=pose.base}
    for(const [entity,pose] of this.cameraPose)if(entity.camera2D){if(entity.camera2D.active!==pose.output)pose.base=entity.camera2D.active;entity.camera2D.active=pose.base;pose.output=pose.base}
  }
  private applySubtitle(owner: Entity, clip: TimelineClip, time: number): void {
    const progress = Math.min(1, Math.max(0, time - clip.start) / Math.max(.001, clip.duration)); let text = String(clip.value)
    try { const payload = clip.payload ? JSON.parse(clip.payload) as { text?: string } : null; if (payload?.text) text = String(payload.text) } catch { /* Text payload remains literal. */ }
    const locale = clip.locale || owner.getComponent<Canvas>('Canvas')?.localePreview || localizationSettings.previewLocale
    timelinePresentationState.subtitles.push({ ownerUuid: owner.uuid, clipId: clip.id, text: localizeUiLabel(text.slice(0, 4096), locale).slice(0, 4096), locale, safeArea: clip.safeArea, progress })
  }
  private applyCamera(owner: Entity, entities: Entity[], state: TimelineState, clip: TimelineClip, time: number): void {
    const target = entities.find(entity => entity.uuid === clip.targetEntityUuid) ?? owner; if (!target.camera2D) return
    const previous = state.activeCameraUuid && state.activeCameraUuid !== target.uuid ? state.activeCameraUuid : entities.find(entity => entity.camera2D?.active && entity.uuid !== target.uuid)?.uuid ?? null
    const local = Math.max(0, time - clip.start), blendIn = Math.min(clip.duration, clip.blendIn), blendOut = Math.min(clip.duration, clip.blendOut); let weight = blendIn > 0 ? Math.min(1, local / blendIn) : 1
    if (blendOut > 0 && local > clip.duration - blendOut) weight = Math.min(weight, Math.max(0, (clip.duration - local) / blendOut))
    if(time>=clip.start+clip.duration)weight=1
    for (const entity of entities) if (entity.camera2D){let pose=this.cameraPose.get(entity);if(!pose){pose={base:entity.camera2D.active,output:entity.camera2D.active};this.cameraPose.set(entity,pose)}entity.camera2D.active=entity===target;pose.output=entity.camera2D.active}
    state.activeCameraUuid = target.uuid; const value = { ownerUuid: owner.uuid, clipId: clip.id, fromEntityUuid: previous, toEntityUuid: target.uuid, weight }; timelinePresentationState.cameraBlends.push(value); setTimelineCameraBlend(value)
  }
  private branchMatches(clip: TimelineClip, player: TimelinePlayer | null | undefined): boolean {
    if (!clip.payload.trim()) return true
    try { const condition = JSON.parse(clip.payload) as { variable?: string; equals?: string | number | boolean; notEquals?: string | number | boolean }; if (!condition.variable) return true; const actual = player?.variables[condition.variable]; return condition.notEquals !== undefined ? actual !== condition.notEquals : actual === condition.equals } catch { return false }
  }
  private marker(timeline: TimelineDocument, identifier: string): TimelineMarker | undefined { return identifier ? timeline.markers.find(marker => marker.id === identifier || marker.name === identifier) : undefined }
}

export const timelineRuntime = new TimelineRuntime()
