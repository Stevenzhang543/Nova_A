/** Shared timeline values and exact traversal sampling; adopted by the existing runtime and authoring facades. */
import { finiteNumber } from '../world/geometry'


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

const TRACK_TYPES = new Set<TimelineTrackType>(['Animation', 'Audio', 'Camera', 'Event', 'Visibility', 'ScriptCall', 'NestedTimeline', 'Subtitle', 'Branch'])
const SAFE_AREAS = new Set<SubtitleSafeArea>(['TitleSafe', 'ActionSafe', 'FullFrame'])
/** 结构说明（自动提取）：id；输入 value、fallback；直接调用 slice、replace、value.trim。 */ function id(value: unknown, fallback: string): string { const safe = typeof value === 'string' ? value.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) : ''; return safe || fallback }

/* 返回具有所列字段的新对象 { version: 2, name, duration: 5, frameRate: 60, markers: [], skipMarker: '', resumeMarker: '', tracks: [] }。 */ export function defaultTimeline(name = 'New Timeline'): TimelineDocument { return { version: 2, name, duration: 5, frameRate: 60, markers: [], skipMarker: '', resumeMarker: '', tracks: [] } }

/** 结构说明（自动提取）：normalizeTimeline；输入 source；直接调用 Math.min、Math.max、finiteNumber、sort、map 等；包含显式抛错路径。 */ export function normalizeTimeline(source: unknown): TimelineDocument {
  const item = source && typeof source === 'object' ? source as Partial<TimelineDocument> : {}, duration = Math.min(86_400, Math.max(1 / 240, finiteNumber(item.duration, 5)))
  const markers = (Array.isArray(item.markers) ? item.markers : []).slice(0, 10_000).map(/** 结构说明（自动提取）：map 回调；输入 marker、index；直接调用 id、slice、marker.name.trim、Math.min、Math.max 等；返回表达式求值结果。 */ (marker, index) => ({
    id: id(marker?.id, `marker_${index + 1}`), name: typeof marker?.name === 'string' ? marker.name.trim().slice(0, 128) : `Marker ${index + 1}`,
    time: Math.min(duration, Math.max(0, finiteNumber(marker?.time))), color: typeof marker?.color === 'string' && /^#[0-9a-f]{6}$/i.test(marker.color) ? marker.color : '#6ea8ff'
  })).sort(/* 先计算 a.time - b.time；仅当其为假值时求右侧 a.id.localeCompare(b.id)，返回短路求值结果。 */ (a, b) => a.time - b.time || a.id.localeCompare(b.id))
  const requestedTracks=Array.isArray(item.tracks)?item.tracks:[]
  if(requestedTracks.reduce(/* 计算表达式 sum+(Array.isArray(track?.clips)?track.clips.length:0) 并返回结果，沿用操作数的原有类型规则。 */ (sum,track)=>sum+(Array.isArray(track?.clips)?track.clips.length:0),0)>100000)throw new Error('TIMELINE_DOCUMENT_LIMIT: A timeline supports at most 100,000 clips.')
  const tracks = (Array.isArray(item.tracks) ? item.tracks : []).slice(0, 512).map(/** 结构说明（自动提取）：map 回调；输入 track、index；直接调用 id、track.name.slice、TRACK_TYPES.has、sort、map 等；返回表达式求值结果。 */ (track, index) => ({
    id: id(track?.id, `track_${index + 1}`), name: typeof track?.name === 'string' ? track.name.slice(0, 80) : `Track ${index + 1}`,
    type: TRACK_TYPES.has(track?.type as TimelineTrackType) ? track!.type as TimelineTrackType : 'Animation', muted: track?.muted === true,
    clips: (Array.isArray(track?.clips) ? track.clips : []).slice(0, 10_000).map(/** 结构说明（自动提取）：map 回调；输入 clip、clipIndex；直接调用 id、Math.min、Math.max、finiteNumber、Number.isFinite 等；返回表达式求值结果。 */ (clip, clipIndex) => ({
      id: id(clip?.id, `clip_${index + 1}_${clipIndex + 1}`), start: Math.min(duration, Math.max(0, finiteNumber(clip?.start))),
      duration: Math.min(duration, Math.max(1 / 1000, finiteNumber(clip?.duration, 1))), offset: Math.max(0, finiteNumber(clip?.offset)),
      playbackRate: Math.min(100, Math.max(.001, finiteNumber(clip?.playbackRate, 1))), blendIn: Math.min(duration, Math.max(0, finiteNumber(clip?.blendIn))), blendOut: Math.min(duration, Math.max(0, finiteNumber(clip?.blendOut))),
      asset: typeof clip?.asset === 'string' ? clip.asset : null, targetEntityUuid: typeof clip?.targetEntityUuid === 'string' ? clip.targetEntityUuid : null,
      value: typeof clip?.value === 'string' || typeof clip?.value === 'boolean' || typeof clip?.value === 'number' && Number.isFinite(clip.value) ? clip.value : '', payload: typeof clip?.payload === 'string' ? clip.payload.slice(0, 16_384) : '',
      locale: typeof clip?.locale === 'string' ? clip.locale.slice(0, 24) : '', safeArea: SAFE_AREAS.has(clip?.safeArea as SubtitleSafeArea) ? clip!.safeArea as SubtitleSafeArea : 'TitleSafe', skippable: clip?.skippable !== false
    })).sort(/* 先计算 a.start - b.start；仅当其为假值时求右侧 a.id.localeCompare(b.id)，返回短路求值结果。 */ (a, b) => a.start - b.start || a.id.localeCompare(b.id))
  }))
  return { version: 2, name: typeof item.name === 'string' ? item.name.slice(0, 120) : 'Timeline', duration, frameRate: Math.min(240, Math.max(1, finiteNumber(item.frameRate, 60))), markers,
    skipMarker: typeof item.skipMarker === 'string' && markers.some(/* 先计算 marker.id === item.skipMarker；仅当其为假值时求右侧 marker.name === item.skipMarker，返回短路求值结果。 */ marker => marker.id === item.skipMarker || marker.name === item.skipMarker) ? item.skipMarker : '',
    resumeMarker: typeof item.resumeMarker === 'string' && markers.some(/* 先计算 marker.id === item.resumeMarker；仅当其为假值时求右侧 marker.name === item.resumeMarker，返回短路求值结果。 */ marker => marker.id === item.resumeMarker || marker.name === item.resumeMarker) ? item.resumeMarker : '', tracks }
}


/** Half-open traversal prevents duplicate endpoints; explicit seeks do not dispatch events. */
/** 结构说明（自动提取）：timelineCrossings；输入 time、previous、next、duration、loop、includePrevious；直接调用 every、Math.min、Math.max、Math.ceil、Math.floor 等；包含循环处理；包含显式抛错路径。 */ export function timelineCrossings(time:number,previous:number,next:number,duration:number,loop:boolean,includePrevious=false):number[]{
  if(![time,previous,next,duration].every(Number.isFinite)||duration<=0)return []
  const forward=next>=previous,low=Math.min(previous,next),high=Math.max(previous,next),output:number[]=[]
  const first=loop?Math.ceil((low-time)/duration):0,last=loop?Math.floor((high-time)/duration):0
  if(last-first>10000)throw new Error('TIMELINE_EVENT_LIMIT: One update crosses more than 10,000 clip occurrences.')
  for(let cycle=first;cycle<=last;cycle++){const crossed=time+cycle*duration;if(forward?(crossed>previous||includePrevious&&crossed===previous)&&crossed<=next:crossed>=next&&(crossed<previous||includePrevious&&crossed===previous))output.push(crossed)}
  return forward?output:output.reverse()
}
