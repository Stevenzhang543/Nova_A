import { reactive } from 'vue'
import { assetReference, assetState, createTextAsset, readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import type { Entity } from '../world/Entity'
import { finiteNumber } from '../world/geometry'
import type { AudioSource, TimelinePlayer } from '../world/components'
import { audioRuntime } from './audio'
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
  lastUpdateMs: 0, longTimelineWarning: '', eventOrder: [] as string[]
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
export function readTimeline(reference: string | null): TimelineDocument | null {
  if (!reference) return null
  const cached = cache.get(reference); if (cached?.generation === assetState.generation) return cached.value
  const asset = resolveAsset(reference), source = readTextAsset(reference); let value: TimelineDocument | null = null
  if (asset?.assetType === 'timeline' && source) try { value = normalizeTimeline(JSON.parse(source)) } catch { value = null }
  cache.set(reference, { generation: assetState.generation, value }); return value
}
export function createTimelineAsset(name = 'New Timeline'): AssetRecord { return createTextAsset(name, 'timeline', JSON.stringify(defaultTimeline(name), null, 2), 'Assets/Timelines') }
export function timelineAssetReference(asset: AssetRecord): string { return assetReference(asset.uuid) }

interface TimelineState { asset: string | null; time: number; fired: Set<string>; lastUnskippedTime: number; activeCameraUuid: string | null }
interface PendingTimelineEvent { order: number; crossed: number; target: Entity; clip: TimelineClip; type: TimelineTrackType }

class TimelineRuntime {
  private states = new Map<string, TimelineState>()
  onEvent: ((owner: Entity, clip: TimelineClip, type: TimelineTrackType) => void) | null = null
  reset(): void { this.states.clear(); timelinePresentationState.subtitles.splice(0); timelinePresentationState.cameraBlends.splice(0); timelinePresentationState.eventOrder.splice(0); setTimelineCameraBlend(null) }

  skip(ownerUuid: string, entities: Entity[]): boolean {
    const owner = entities.find(entity => entity.uuid === ownerUuid), player = owner?.getComponent<TimelinePlayer>('TimelinePlayer'), timeline = readTimeline(player?.timelineAsset ?? null), state = this.states.get(ownerUuid)
    if (!owner || !player || !timeline || !state) return false
    const blocksSkip = timeline.tracks.some(track => !track.muted && track.clips.some(clip => !clip.skippable && state.time >= clip.start && state.time <= clip.start + clip.duration))
    if (blocksSkip) return false
    const marker = this.marker(timeline, timeline.skipMarker) ?? timeline.markers.find(candidate => candidate.time > state.time); if (!marker) return false
    state.lastUnskippedTime = state.time; state.time = marker.time; state.fired.clear(); player.currentTime = state.time; player.skipped = true; return true
  }
  resume(ownerUuid: string, entities: Entity[]): boolean {
    const owner = entities.find(entity => entity.uuid === ownerUuid), player = owner?.getComponent<TimelinePlayer>('TimelinePlayer'), timeline = readTimeline(player?.timelineAsset ?? null), state = this.states.get(ownerUuid)
    if (!owner || !player || !timeline || !state) return false
    const destination = this.marker(timeline, timeline.resumeMarker)?.time ?? state.lastUnskippedTime; if (!Number.isFinite(destination)) return false
    state.time = Math.min(timeline.duration, Math.max(0, destination)); state.fired.clear(); player.currentTime = state.time; player.skipped = false; player.playing = true; return true
  }

  update(entities: Entity[], delta: number): void {
    const started = performance.now(), alive = new Set(entities.map(entity => entity.uuid)), pending: PendingTimelineEvent[] = []
    for (const uuid of this.states.keys()) if (!alive.has(uuid)) this.states.delete(uuid)
    timelinePresentationState.subtitles.splice(0); timelinePresentationState.cameraBlends.splice(0); timelinePresentationState.processedClips = 0; timelinePresentationState.nestedDepth = 0; timelinePresentationState.eventOrder.splice(0); setTimelineCameraBlend(null)
    for (const owner of entities) {
      const player = owner.getComponent<TimelinePlayer>('TimelinePlayer'); if (!owner.enabled || !player?.enabled || !player.timelineAsset) continue
      const timeline = readTimeline(player.timelineAsset); if (!timeline) continue
      let state = this.states.get(owner.uuid)
      if (!state || state.asset !== player.timelineAsset) { state = { asset: player.timelineAsset, time: Math.min(timeline.duration, Math.max(0, player.currentTime)), fired: new Set(), lastUnskippedTime: 0, activeCameraUuid: null }; this.states.set(owner.uuid, state); player.playing = player.autoplay }
      if (!player.playing) { const previous = state.time; state.time = Math.min(timeline.duration, Math.max(0, player.currentTime)); this.applyTimeline(owner, entities, timeline, state, previous, state.time, false, false, true, pending, 0, new Set([player.timelineAsset])); continue }
      const previous = state.time; state.time += Math.max(0, delta) * player.speed; let wrapped = false
      if (player.loop) { if (state.time >= timeline.duration || state.time < 0) { state.time = ((state.time % timeline.duration) + timeline.duration) % timeline.duration; state.fired.clear(); wrapped = true } }
      else if (state.time >= timeline.duration || state.time < 0) { state.time = Math.min(timeline.duration, Math.max(0, state.time)); player.playing = false }
      player.currentTime = state.time; this.applyTimeline(owner, entities, timeline, state, previous, state.time, state.time >= previous || wrapped, wrapped, false, pending, 0, new Set([player.timelineAsset]))
    }
    pending.sort((a, b) => a.crossed - b.crossed || a.order - b.order)
    for (const event of pending) { timelinePresentationState.eventOrder.push(`${event.crossed.toFixed(6)}:${event.type}:${event.clip.id}`); this.onEvent?.(event.target, event.clip, event.type) }
    if (timelinePresentationState.eventOrder.length > 256) timelinePresentationState.eventOrder.splice(0, timelinePresentationState.eventOrder.length - 256)
    timelinePresentationState.lastUpdateMs = performance.now() - started
    timelinePresentationState.longTimelineWarning = timelinePresentationState.processedClips > 20_000 || timelinePresentationState.lastUpdateMs > 8 ? `${timelinePresentationState.processedClips} clips in ${timelinePresentationState.lastUpdateMs.toFixed(2)} ms` : ''
  }

  private applyTimeline(owner: Entity, entities: Entity[], timeline: TimelineDocument, state: TimelineState, previous: number, current: number, movingForward: boolean, wrapped: boolean, scrubbing: boolean, pending: PendingTimelineEvent[], depth: number, visited: Set<string>): void {
    if (depth > 8) return; timelinePresentationState.nestedDepth = Math.max(timelinePresentationState.nestedDepth, depth)
    for (let trackIndex = 0; trackIndex < timeline.tracks.length; trackIndex++) {
      const track = timeline.tracks[trackIndex]; if (track.muted) continue
      for (let clipIndex = 0; clipIndex < track.clips.length; clipIndex++) {
        const clip = track.clips[clipIndex]; timelinePresentationState.processedClips++
        const target = clip.targetEntityUuid ? entities.find(entity => entity.uuid === clip.targetEntityUuid) : owner; if (!target) continue
        const clipEnd = Math.min(timeline.duration, clip.start + clip.duration), active = current >= clip.start && current <= clipEnd
        const crossedStart = movingForward && (wrapped ? clip.start > previous || clip.start <= current : clip.start >= previous && clip.start <= current)
        const order = depth * 100_000_000 + trackIndex * 100_000 + clipIndex, firedId = `${depth}:${timeline.name}:${track.id}:${clip.id}`
        if (track.type === 'Visibility' && active) target.enabled = clip.value !== false && clip.value !== 'false'
        else if (track.type === 'Camera' && active) this.applyCamera(owner, entities, state, clip, current)
        else if (track.type === 'Subtitle' && active) this.applySubtitle(owner, clip, current)
        else if (track.type === 'Audio' && active && scrubbing) { const audio = target.getComponent<AudioSource>('AudioSource'); if (audio && clip.asset) audio.audioClip = clip.asset; audioRuntime.scrub(target, clip.offset + Math.max(0, current - clip.start) * clip.playbackRate) }
        else if (track.type === 'Audio' && crossedStart && !state.fired.has(firedId)) { const audio = target.getComponent<AudioSource>('AudioSource'); if (audio && clip.asset) { audio.audioClip = clip.asset; audio.startOffsetSeconds = clip.offset }; audioRuntime.play(target, entities); state.fired.add(firedId) }
        else if ((track.type === 'Event' || track.type === 'ScriptCall' || track.type === 'Animation') && (track.type === 'Animation' ? active : crossedStart) && (!state.fired.has(firedId) || track.type === 'Animation')) { pending.push({ order, crossed: track.type === 'Animation' ? current : clip.start, target, clip, type: track.type }); if (track.type !== 'Animation') state.fired.add(firedId) }
        else if (track.type === 'NestedTimeline' && active && clip.asset && !visited.has(clip.asset)) {
          const nested = readTimeline(clip.asset); if (nested) { const local = Math.min(nested.duration, clip.offset + Math.max(0, current - clip.start) * clip.playbackRate), localPrevious = Math.min(nested.duration, clip.offset + Math.max(0, previous - clip.start) * clip.playbackRate), nestedVisited = new Set(visited); nestedVisited.add(clip.asset); this.applyTimeline(target, entities, nested, state, localPrevious, local, movingForward, false, scrubbing, pending, depth + 1, nestedVisited) }
        } else if (track.type === 'Branch' && crossedStart && !state.fired.has(firedId) && this.branchMatches(clip, owner.getComponent<TimelinePlayer>('TimelinePlayer'))) {
          state.fired.add(firedId); const marker = this.marker(timeline, String(clip.value)); if (marker) { state.time = marker.time; const player = owner.getComponent<TimelinePlayer>('TimelinePlayer'); if (player) player.currentTime = marker.time }; pending.push({ order, crossed: clip.start, target, clip, type: 'Branch' })
        }
      }
    }
  }

  private applySubtitle(owner: Entity, clip: TimelineClip, time: number): void {
    const progress = Math.min(1, Math.max(0, time - clip.start) / Math.max(.001, clip.duration)); let text = String(clip.value)
    try { const payload = clip.payload ? JSON.parse(clip.payload) as { text?: string } : null; if (payload?.text) text = String(payload.text) } catch { /* Text payload remains literal. */ }
    timelinePresentationState.subtitles.push({ ownerUuid: owner.uuid, clipId: clip.id, text: text.slice(0, 4096), locale: clip.locale, safeArea: clip.safeArea, progress })
  }
  private applyCamera(owner: Entity, entities: Entity[], state: TimelineState, clip: TimelineClip, time: number): void {
    const target = entities.find(entity => entity.uuid === clip.targetEntityUuid) ?? owner; if (!target.camera2D) return
    const previous = state.activeCameraUuid && state.activeCameraUuid !== target.uuid ? state.activeCameraUuid : entities.find(entity => entity.camera2D?.active && entity.uuid !== target.uuid)?.uuid ?? null
    const local = Math.max(0, time - clip.start), blendIn = Math.min(clip.duration, clip.blendIn), blendOut = Math.min(clip.duration, clip.blendOut); let weight = blendIn > 0 ? Math.min(1, local / blendIn) : 1
    if (blendOut > 0 && local > clip.duration - blendOut) weight = Math.min(weight, Math.max(0, (clip.duration - local) / blendOut))
    for (const entity of entities) if (entity.camera2D) entity.camera2D.active = entity === target
    state.activeCameraUuid = target.uuid; const value = { ownerUuid: owner.uuid, clipId: clip.id, fromEntityUuid: previous, toEntityUuid: target.uuid, weight }; timelinePresentationState.cameraBlends.push(value); setTimelineCameraBlend(value)
  }
  private branchMatches(clip: TimelineClip, player: TimelinePlayer | null | undefined): boolean {
    if (!clip.payload.trim()) return true
    try { const condition = JSON.parse(clip.payload) as { variable?: string; equals?: string | number | boolean; notEquals?: string | number | boolean }; if (!condition.variable) return true; const actual = player?.variables[condition.variable]; return condition.notEquals !== undefined ? actual !== condition.notEquals : actual === condition.equals } catch { return false }
  }
  private marker(timeline: TimelineDocument, identifier: string): TimelineMarker | undefined { return identifier ? timeline.markers.find(marker => marker.id === identifier || marker.name === identifier) : undefined }
}

export const timelineRuntime = new TimelineRuntime()
