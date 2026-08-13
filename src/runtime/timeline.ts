import { assetReference, assetState, createTextAsset, readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import type { Entity } from '../world/Entity'
import { finiteNumber } from '../world/geometry'
import type { AudioSource, TimelinePlayer } from '../world/components'
import { audioRuntime } from './audio'

export type TimelineTrackType = 'Animation' | 'Audio' | 'Camera' | 'Event' | 'Visibility' | 'ScriptCall'
export interface TimelineClip {
  id: string
  start: number
  duration: number
  asset: string | null
  targetEntityUuid: string | null
  value: string | number | boolean
  payload: string
}
export interface TimelineTrack { id: string; name: string; type: TimelineTrackType; muted: boolean; clips: TimelineClip[] }
export interface TimelineDocument { version: 1; name: string; duration: number; frameRate: number; tracks: TimelineTrack[] }

function id(value: unknown, fallback: string): string {
  const safe = typeof value === 'string' ? value.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) : ''
  return safe || fallback
}

export function defaultTimeline(name = 'New Timeline'): TimelineDocument {
  return { version: 1, name, duration: 5, frameRate: 60, tracks: [] }
}

export function normalizeTimeline(source: unknown): TimelineDocument {
  const item = source && typeof source === 'object' ? source as Partial<TimelineDocument> : {}
  const types = new Set<TimelineTrackType>(['Animation', 'Audio', 'Camera', 'Event', 'Visibility', 'ScriptCall'])
  const duration = Math.min(86_400, Math.max(1 / 240, finiteNumber(item.duration, 5)))
  const tracks = (Array.isArray(item.tracks) ? item.tracks : []).slice(0, 512).map((track, index) => ({
    id: id(track?.id, `track_${index + 1}`), name: typeof track?.name === 'string' ? track.name.slice(0, 80) : `Track ${index + 1}`,
    type: types.has(track?.type as TimelineTrackType) ? track!.type as TimelineTrackType : 'Animation', muted: track?.muted === true,
    clips: (Array.isArray(track?.clips) ? track.clips : []).slice(0, 10_000).map((clip, clipIndex) => ({
      id: id(clip?.id, `clip_${index + 1}_${clipIndex + 1}`), start: Math.min(duration, Math.max(0, finiteNumber(clip?.start))),
      duration: Math.min(duration, Math.max(1 / 1000, finiteNumber(clip?.duration, 1))), asset: typeof clip?.asset === 'string' ? clip.asset : null,
      targetEntityUuid: typeof clip?.targetEntityUuid === 'string' ? clip.targetEntityUuid : null,
      value: typeof clip?.value === 'string' || typeof clip?.value === 'boolean' || typeof clip?.value === 'number' && Number.isFinite(clip.value) ? clip.value : '',
      payload: typeof clip?.payload === 'string' ? clip.payload.slice(0, 4096) : ''
    })).sort((first, second) => first.start - second.start)
  }))
  return { version: 1, name: typeof item.name === 'string' ? item.name.slice(0, 120) : 'Timeline', duration, frameRate: Math.min(240, Math.max(1, finiteNumber(item.frameRate, 60))), tracks }
}

const cache = new Map<string, { generation: number; value: TimelineDocument | null }>()
export function readTimeline(reference: string | null): TimelineDocument | null {
  if (!reference) return null
  const cached = cache.get(reference); if (cached?.generation === assetState.generation) return cached.value
  const asset = resolveAsset(reference); const source = readTextAsset(reference)
  let value: TimelineDocument | null = null
  if (asset?.assetType === 'timeline' && source) try { value = normalizeTimeline(JSON.parse(source)) } catch { value = null }
  cache.set(reference, { generation: assetState.generation, value }); return value
}

export function createTimelineAsset(name = 'New Timeline'): AssetRecord { return createTextAsset(name, 'timeline', JSON.stringify(defaultTimeline(name), null, 2), 'Assets/Timelines') }
export function timelineAssetReference(asset: AssetRecord): string { return assetReference(asset.uuid) }

interface TimelineState { asset: string | null; time: number; fired: Set<string> }

class TimelineRuntime {
  private states = new Map<string, TimelineState>()
  onEvent: ((owner: Entity, clip: TimelineClip, type: TimelineTrackType) => void) | null = null

  reset(): void { this.states.clear() }

  update(entities: Entity[], delta: number): void {
    const alive = new Set(entities.map(entity => entity.uuid)); for (const uuid of this.states.keys()) if (!alive.has(uuid)) this.states.delete(uuid)
    for (const owner of entities) {
      const player = owner.getComponent<TimelinePlayer>('TimelinePlayer')
      if (!owner.enabled || !player?.enabled || !player.timelineAsset) continue
      const timeline = readTimeline(player.timelineAsset); if (!timeline) continue
      let state = this.states.get(owner.uuid)
      if (!state || state.asset !== player.timelineAsset) { state = { asset: player.timelineAsset, time: Math.min(timeline.duration, Math.max(0, player.currentTime)), fired: new Set() }; this.states.set(owner.uuid, state); player.playing = player.autoplay }
      if (!player.playing) { state.time = Math.min(timeline.duration, Math.max(0, player.currentTime)); this.applyAt(owner, entities, timeline, state, state.time, false, false); continue }
      const previous = state.time
      state.time += Math.max(0, delta) * player.speed
      let wrapped = false
      if (player.loop) {
        if (state.time >= timeline.duration || state.time < 0) { state.time = ((state.time % timeline.duration) + timeline.duration) % timeline.duration; state.fired.clear(); wrapped = true }
      } else if (state.time >= timeline.duration || state.time < 0) { state.time = Math.min(timeline.duration, Math.max(0, state.time)); player.playing = false }
      player.currentTime = state.time
      this.applyAt(owner, entities, timeline, state, previous, state.time >= previous || wrapped, wrapped)
    }
  }

  private applyAt(owner: Entity, entities: Entity[], timeline: TimelineDocument, state: TimelineState, previous: number, movingForward: boolean, wrapped: boolean): void {
    for (const track of timeline.tracks) {
      if (track.muted) continue
      for (const clip of track.clips) {
        const target = clip.targetEntityUuid ? entities.find(entity => entity.uuid === clip.targetEntityUuid) : owner
        if (!target) continue
        const active = state.time >= clip.start && state.time <= clip.start + clip.duration
        const crossedStart = movingForward && (wrapped ? clip.start > previous || clip.start <= state.time : clip.start >= previous && clip.start <= state.time)
        if (track.type === 'Visibility' && active) target.enabled = clip.value !== false && clip.value !== 'false'
        else if (track.type === 'Camera' && active) {
          for (const entity of entities) if (entity.camera2D) entity.camera2D.active = entity === target
        }
        else if (track.type === 'Audio' && crossedStart && !state.fired.has(clip.id)) {
          const audio = target.getComponent<AudioSource>('AudioSource'); if (audio && clip.asset) audio.audioClip = clip.asset
          audioRuntime.play(target, entities); state.fired.add(clip.id)
        } else if ((track.type === 'Event' || track.type === 'ScriptCall') && crossedStart && !state.fired.has(clip.id)) {
          this.onEvent?.(owner, clip, track.type); state.fired.add(clip.id)
        } else if (track.type === 'Animation' && active) this.onEvent?.(target, clip, track.type)
      }
    }
  }
}

export const timelineRuntime = new TimelineRuntime()
