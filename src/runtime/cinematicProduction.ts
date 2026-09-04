import { readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import type { Entity } from '../world/Entity'
import { normalizeTimeline, readTimeline, type TimelineDocument } from './timeline'
import { renderingSettings } from '../renderer/renderSettings'

export type CinematicIssueSeverity = 'error' | 'warning' | 'info'
export interface CinematicValidationIssue { code: string; severity: CinematicIssueSeverity; assetUuid: string; source: string; message: string }
export interface TimelinePerformanceEstimate { tracks: number; clips: number; nestedReferences: number; peakActiveClips: number; estimatedChecksPerTick: number; status: 'healthy' | 'review' }
export interface MediaFrameClock { frame: number; timeSeconds: number; audioSampleStart: number; audioSampleEnd: number; audioSamples: number }
export interface DeterministicCapturePlan { frameRate: number; sampleRate: number; duration: number; frames: number; clocks: MediaFrameClock[]; deterministic: true; truncated: boolean }

function issue(asset: AssetRecord, code: string, severity: CinematicIssueSeverity, source: string, message: string): CinematicValidationIssue { return { code, severity, assetUuid: asset.uuid, source: `${asset.path}/${source}`, message } }
function parsedTimeline(asset: AssetRecord): TimelineDocument | null { const source = readTextAsset(asset.uuid); if (!source) return null; try { return normalizeTimeline(JSON.parse(source)) } catch { return null } }

export function validateCinematicProject(assets: AssetRecord[], entities: Entity[]): CinematicValidationIssue[] {
  const result: CinematicValidationIssue[] = [], entityByUuid = new Map(entities.map(entity => [entity.uuid, entity]))
  for (const asset of assets.filter(candidate => candidate.assetType === 'timeline')) {
    const timeline = parsedTimeline(asset)
    if (!timeline) { result.push(issue(asset, 'NOVA-CIN-PARSE', 'error', '', 'Timeline cannot be parsed.')); continue }
    const markerIds = new Set(timeline.markers.flatMap(marker => [marker.id, marker.name]))
    if (timeline.skipMarker && !markerIds.has(timeline.skipMarker)) result.push(issue(asset, 'NOVA-CIN-SKIP-MARKER', 'error', 'skipMarker', 'Skip marker does not exist.'))
    if (timeline.resumeMarker && !markerIds.has(timeline.resumeMarker)) result.push(issue(asset, 'NOVA-CIN-RESUME-MARKER', 'error', 'resumeMarker', 'Resume marker does not exist.'))
    timeline.tracks.forEach((track, trackIndex) => track.clips.forEach((clip, clipIndex) => {
      const path = `tracks[${trackIndex}].clips[${clipIndex}]`, target = clip.targetEntityUuid ? entityByUuid.get(clip.targetEntityUuid) : null
      if (clip.start + clip.duration > timeline.duration + 1e-6) result.push(issue(asset, 'NOVA-CIN-CLIP-BOUNDS', 'warning', path, 'Clip extends past the timeline duration and will be clamped.'))
      if (clip.targetEntityUuid && !target) result.push(issue(asset, 'NOVA-CIN-TARGET', 'error', `${path}.targetEntityUuid`, 'Target entity does not exist.'))
      if (track.type === 'Audio' && resolveAsset(clip.asset)?.assetType !== 'audio') result.push(issue(asset, 'NOVA-CIN-AUDIO', 'error', `${path}.asset`, 'Audio clip reference is missing or invalid.'))
      if (track.type === 'NestedTimeline' && (!clip.asset || resolveAsset(clip.asset)?.assetType !== 'timeline' || !readTimeline(clip.asset))) result.push(issue(asset, 'NOVA-CIN-NESTED', 'error', `${path}.asset`, 'Nested timeline reference is missing or invalid.'))
      if (track.type === 'Camera' && target && !target.camera2D) result.push(issue(asset, 'NOVA-CIN-CAMERA', 'error', `${path}.targetEntityUuid`, 'Camera track target has no Camera2D component.'))
      if (track.type === 'Camera' && clip.blendIn + clip.blendOut > clip.duration) result.push(issue(asset, 'NOVA-CIN-CAMERA-BLEND', 'warning', path, 'Camera blend-in and blend-out overlap; the smaller weight wins.'))
      if (track.type === 'Subtitle') {
        if (!String(clip.value).trim() && !clip.payload.trim()) result.push(issue(asset, 'NOVA-CIN-SUBTITLE-EMPTY', 'error', `${path}.value`, 'Subtitle text is empty.'))
        if (String(clip.value).length > 160) result.push(issue(asset, 'NOVA-CIN-SUBTITLE-LENGTH', 'warning', `${path}.value`, 'Subtitle may exceed the selected safe area; split it into shorter captions.'))
        if (clip.duration < Math.max(1, String(clip.value).length / 18)) result.push(issue(asset, 'NOVA-CIN-SUBTITLE-READING', 'warning', `${path}.duration`, 'Subtitle duration may be too short for comfortable reading.'))
      }
      if (track.type === 'Branch' && !markerIds.has(String(clip.value))) result.push(issue(asset, 'NOVA-CIN-BRANCH-MARKER', 'error', `${path}.value`, 'Branch destination marker does not exist.'))
    }))
    const performance = estimateTimelinePerformance(timeline)
    if (performance.status === 'review') result.push(issue(asset, 'NOVA-CIN-PERFORMANCE', 'warning', 'tracks', `Timeline may inspect ${performance.estimatedChecksPerTick} clips per tick; split long sequences into nested sections.`))
    const capture = deterministicCapturePlan(timeline.duration, renderingSettings.deterministicCapture.frameRate, renderingSettings.deterministicCapture.sampleRate, renderingSettings.deterministicCapture.maximumFrames)
    if (capture.truncated) result.push(issue(asset, 'NOVA-CIN-CAPTURE-TRUNCATED', 'warning', 'duration', `The current capture limit records ${capture.frames} frames, shorter than this ${timeline.duration.toFixed(3)} s timeline.`))
  }
  return result.sort((a, b) => a.source.localeCompare(b.source) || a.code.localeCompare(b.code))
}

export function estimateTimelinePerformance(timeline: TimelineDocument): TimelinePerformanceEstimate {
  const clips = timeline.tracks.reduce((total, track) => total + track.clips.length, 0), nestedReferences = timeline.tracks.reduce((total, track) => total + (track.type === 'NestedTimeline' ? track.clips.length : 0), 0)
  const boundaries = timeline.tracks.flatMap(track => track.clips.flatMap(clip => [{ time: clip.start, delta: 1 }, { time: clip.start + clip.duration, delta: -1 }])).sort((a, b) => a.time - b.time || b.delta - a.delta)
  let active = 0, peakActiveClips = 0; for (const boundary of boundaries) { active += boundary.delta; peakActiveClips = Math.max(peakActiveClips, active) }
  const estimatedChecksPerTick = clips + nestedReferences * 2
  return { tracks: timeline.tracks.length, clips, nestedReferences, peakActiveClips, estimatedChecksPerTick, status: estimatedChecksPerTick > 20_000 || peakActiveClips > 1_000 ? 'review' : 'healthy' }
}

/** Maps a visual frame to exact integer audio sample boundaries without accumulating floating-point drift. */
export function mediaFrameClock(frame: number, frameRate = 60, sampleRate = 48_000): MediaFrameClock {
  const safeFrame = Math.max(0, Math.floor(Number.isFinite(frame) ? frame : 0))
  const safeFrameRate = Math.min(240, Math.max(1, Math.round(Number.isFinite(frameRate) ? frameRate : 60)))
  const safeSampleRate = Math.min(192_000, Math.max(8_000, Math.round(Number.isFinite(sampleRate) ? sampleRate : 48_000)))
  const audioSampleStart = Math.round(safeFrame * safeSampleRate / safeFrameRate)
  const audioSampleEnd = Math.round((safeFrame + 1) * safeSampleRate / safeFrameRate)
  return { frame: safeFrame, timeSeconds: safeFrame / safeFrameRate, audioSampleStart, audioSampleEnd, audioSamples: audioSampleEnd - audioSampleStart }
}

/** Produces a bounded, repeatable timeline/audio sampling plan for editor or exported capture. */
export function deterministicCapturePlan(duration: number, frameRate = 60, sampleRate = 48_000, maximumFrames = 18_000): DeterministicCapturePlan {
  const safeDuration = Math.min(3_600, Math.max(0, Number.isFinite(duration) ? duration : 0))
  const safeFrameRate = Math.min(240, Math.max(1, Math.round(Number.isFinite(frameRate) ? frameRate : 60)))
  const requestedFrames = Math.max(1, Math.ceil(safeDuration * safeFrameRate))
  const limit = Math.min(18_000, Math.max(1, Math.round(Number.isFinite(maximumFrames) ? maximumFrames : 18_000)))
  const frames = Math.min(requestedFrames, limit)
  return { frameRate: safeFrameRate, sampleRate: Math.min(192_000, Math.max(8_000, Math.round(Number.isFinite(sampleRate) ? sampleRate : 48_000))), duration: safeDuration, frames, clocks: Array.from({ length: frames }, (_, frame) => mediaFrameClock(frame, safeFrameRate, sampleRate)), deterministic: true, truncated: frames < requestedFrames }
}
