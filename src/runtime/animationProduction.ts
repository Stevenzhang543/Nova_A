import { readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import type { Entity } from '../world/Entity'
import { animationClipLength, normalizeAnimationClip, normalizeAnimatorController, readAnimationClip, readAnimatorController, sampleAnimationTrack, type AnimationClipDocument } from './animation'

export type AnimationValidationSeverity = 'error' | 'warning' | 'info'
export interface AnimationValidationIssue { code: string; severity: AnimationValidationSeverity; assetUuid: string; source: string; message: string; targetEntityUuid: string | null }
export interface AnimationSamplingResult { assetUuid: string; sampleRate: number; samples: number; nonFinite: number; maximumError: number; events: number; status: 'passed' | 'failed' }

function issue(asset: AssetRecord, code: string, severity: AnimationValidationSeverity, path: string, message: string, targetEntityUuid: string | null = null): AnimationValidationIssue {
  return { code, severity, assetUuid: asset.uuid, source: `${asset.path}/${path}`, message, targetEntityUuid }
}
function scriptSymbols(assets: AssetRecord[]): Set<string> {
  const symbols = new Set<string>()
  for (const asset of assets) if (asset.assetType === 'script') for (const match of (readTextAsset(asset.uuid) ?? '').matchAll(/\bfn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) symbols.add(match[1])
  return symbols
}

export function validateAnimationProject(assets: AssetRecord[], entities: Entity[]): AnimationValidationIssue[] {
  const issues: AnimationValidationIssue[] = [], entityUuids = new Set(entities.map(entity => entity.uuid)), functions = scriptSymbols(assets)
  for (const asset of assets) {
    if (asset.assetType === 'animation') {
      const clip = readAnimationClip(asset.uuid)
      if (!clip) { issues.push(issue(asset, 'NOVA-ANM-PARSE', 'error', '', 'Animation clip cannot be parsed.')); continue }
      clip.tracks.forEach((track, index) => {
        if (track.targetEntityUuid && !entityUuids.has(track.targetEntityUuid)) issues.push(issue(asset, 'NOVA-ANM-TARGET', 'error', `tracks[${index}]`, 'Animation track target no longer exists.', track.targetEntityUuid))
        for (let key = 1; key < track.keyframes.length; key++) if (track.keyframes[key].time <= track.keyframes[key - 1].time) issues.push(issue(asset, 'NOVA-ANM-KEY-ORDER', 'error', `tracks[${index}].keyframes[${key}]`, 'Key times must increase strictly.'))
      })
      clip.events.forEach((event, index) => { const parts = event.signal.split('.'), callback = parts[parts.length - 1] || event.signal; if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(callback) && !functions.has(callback)) issues.push(issue(asset, 'NOVA-ANM-EVENT-SYMBOL', 'warning', `events[${index}]`, `No Script Studio symbol matches ${callback}.`)) })
      clip.commandTracks.forEach((track, trackIndex) => track.commands.forEach((command, commandIndex) => {
        const path = `commandTracks[${trackIndex}].commands[${commandIndex}]`
        if (track.kind === 'Method' && !functions.has(command.value)) issues.push(issue(asset, 'NOVA-ANM-METHOD-SYMBOL', 'error', path, `Method ${command.value} is not defined by a project script.`))
        if (track.kind === 'Audio' && resolveAsset(command.value)?.assetType !== 'audio') issues.push(issue(asset, 'NOVA-ANM-AUDIO-REFERENCE', 'error', path, 'Audio track reference is missing or not audio.'))
        if (track.kind === 'NestedAnimation' && resolveAsset(command.value)?.assetType !== 'animation') issues.push(issue(asset, 'NOVA-ANM-NESTED-REFERENCE', 'error', path, 'Nested track reference is missing or not an animation.'))
        if (track.kind === 'Timeline' && resolveAsset(command.value)?.assetType !== 'timeline') issues.push(issue(asset, 'NOVA-ANM-TIMELINE-REFERENCE', 'error', path, 'Timeline command reference is missing or not a timeline.'))
        if (track.kind === 'VisualGraph' && !command.value.trim()) issues.push(issue(asset, 'NOVA-ANM-GRAPH-SIGNAL', 'error', path, 'Visual Graph command requires a signal name.'))
      }))
      const sampling = validateAnimationSampling(asset.uuid, clip)
      if (sampling.status === 'failed') issues.push(issue(asset, 'NOVA-ANM-SAMPLING', 'error', 'tracks', `${sampling.nonFinite} non-finite runtime samples detected.`))
    } else if (asset.assetType === 'controller') {
      const controller = readAnimatorController(asset.uuid)
      if (!controller) { issues.push(issue(asset, 'NOVA-ANM-CONTROLLER-PARSE', 'error', '', 'Animator controller cannot be parsed.')); continue }
      controller.states.forEach((state, index) => {
        if (state.clipAsset && !readAnimationClip(state.clipAsset)) issues.push(issue(asset, 'NOVA-ANM-STATE-CLIP', 'error', `states[${index}].clipAsset`, `State ${state.name} has a missing clip.`))
        if (state.blendTree && !controller.parameters.some(parameter => parameter.name === state.blendTree!.parameter && (parameter.type === 'Float' || parameter.type === 'Integer'))) issues.push(issue(asset, 'NOVA-ANM-BLEND-PARAMETER', 'error', `states[${index}].blendTree`, 'Blend tree requires a numeric parameter.'))
        if (state.blendTree?.type === '2D' && !controller.parameters.some(parameter => parameter.name === state.blendTree!.parameterY && (parameter.type === 'Float' || parameter.type === 'Integer'))) issues.push(issue(asset, 'NOVA-ANM-BLEND-PARAMETER-Y', 'error', `states[${index}].blendTree.parameterY`, 'A 2D blend tree requires a second numeric parameter.'))
        state.blendTree?.children.forEach((child, childIndex) => { if (child.clipAsset && !readAnimationClip(child.clipAsset)) issues.push(issue(asset, 'NOVA-ANM-BLEND-CLIP', 'error', `states[${index}].blendTree.children[${childIndex}]`, 'Blend-tree child clip is missing.')) })
      })
      controller.transitions.forEach((transition, index) => {
        if (transition.from === transition.to && !transition.conditions.length && !transition.hasExitTime) issues.push(issue(asset, 'NOVA-ANM-TRANSITION-LOOP', 'warning', `transitions[${index}]`, 'Unconditional self-transition can restart every frame.'))
        if (transition.syncMode === 'Marker') { const source = controller.states.find(state => state.id === transition.from), destination = controller.states.find(state => state.id === transition.to), sourceClip = source ? readAnimationClip(source.clipAsset) : null, destinationClip = destination ? readAnimationClip(destination.clipAsset) : null; if (!transition.syncMarker || !sourceClip?.markers.some(marker => marker.name === transition.syncMarker) || !destinationClip?.markers.some(marker => marker.name === transition.syncMarker)) issues.push(issue(asset, 'NOVA-ANM-SYNC-MARKER', 'warning', `transitions[${index}]`, 'Marker synchronization requires the named marker in both source and destination clips.')) }
      })
    }
  }
  return issues.sort((a, b) => a.source.localeCompare(b.source) || a.code.localeCompare(b.code))
}

export function validateAnimationSampling(assetUuid: string, clip: AnimationClipDocument, sampleRate = clip.frameRate): AnimationSamplingResult {
  const rate = Math.min(1_000, Math.max(1, Number.isFinite(sampleRate) ? sampleRate : clip.frameRate)), length = animationClipLength(clip), count = Math.min(1_000_000, Math.ceil(length * rate) + 1)
  let nonFinite = 0, maximumError = 0
  for (const track of clip.tracks) for (let index = 0; index < count; index++) {
    const time = Math.min(length, index / rate), value = sampleAnimationTrack(track.keyframes, time)
    if (value !== null && !Number.isFinite(value)) nonFinite++
    if (value !== null && track.keyframes.length) maximumError = Math.max(maximumError, Math.min(...track.keyframes.map(key => Math.abs(key.value - value))))
  }
  return { assetUuid, sampleRate: rate, samples: count * clip.tracks.length, nonFinite, maximumError, events: clip.events.length, status: nonFinite ? 'failed' : 'passed' }
}

export function animationGoldenSamples(clip: AnimationClipDocument, times: number[]): Array<{ time: number; values: Record<string, number | null> }> {
  const normalized = normalizeAnimationClip(clip)
  return times.map(time => ({ time, values: Object.fromEntries(normalized.tracks.map((track, index) => [`${index}:${track.targetEntityUuid ?? 'owner'}:${track.property}`, sampleAnimationTrack(track.keyframes, time)])) }))
}

export function animationPerformanceSnapshot(assets: AssetRecord[], entities: Entity[]): { clips: number; controllers: number; tracks: number; keys: number; states: number; transitions: number; animatedEntities: number; estimatedSamplesPerSecond: number } {
  const clips = assets.flatMap(asset => asset.assetType === 'animation' ? [readAnimationClip(asset.uuid)].filter((value): value is AnimationClipDocument => value !== null) : [])
  const controllers = assets.flatMap(asset => {
    if (asset.assetType !== 'controller') return []
    const source = readTextAsset(asset.uuid); if (!source) return []
    try { return [normalizeAnimatorController(JSON.parse(source))] } catch { return [] }
  })
  return { clips: clips.length, controllers: controllers.length, tracks: clips.reduce((sum, clip) => sum + clip.tracks.length + clip.commandTracks.length, 0), keys: clips.reduce((sum, clip) => sum + clip.tracks.reduce((keys, track) => keys + track.keyframes.length, 0), 0), states: controllers.reduce((sum, controller) => sum + controller.states.length, 0), transitions: controllers.reduce((sum, controller) => sum + controller.transitions.length, 0), animatedEntities: entities.filter(entity => entity.hasComponent('Animator')).length, estimatedSamplesPerSecond: clips.reduce((sum, clip) => sum + clip.tracks.length * clip.frameRate, 0) }
}
