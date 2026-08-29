import { assetReference, assetState, createTextAsset, readTextAsset, resolveAsset, updateTextAsset } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import { finiteNumber } from '../world/geometry'
import type { Entity } from '../world/Entity'
import type { Animator, AnimatorParameterValue } from '../world/components'

export type AnimatableProperty = 'Transform.position.x' | 'Transform.position.y' | 'Transform.rotation' | 'Transform.scale.x' | 'Transform.scale.y' | 'SpriteRenderer.opacity' | 'UI.opacity'
export type AnimatorParameterType = 'Bool' | 'Float' | 'Integer' | 'Trigger'
export type KeyTangentMode = 'Auto' | 'Linear' | 'Constant' | 'Free'
export type KeyEasing = 'Linear' | 'EaseIn' | 'EaseOut' | 'EaseInOut'
export type AnimationInterpolation = 'Step' | 'Linear' | 'Cubic'
export type AnimationCommandKind = 'Method' | 'Audio' | 'NestedAnimation' | 'Timeline' | 'VisualGraph' | 'Custom'

export interface AnimationKeyframe { time: number; value: number; tangentMode: KeyTangentMode; inTangent: number; outTangent: number; easing?: KeyEasing; interpolation?: AnimationInterpolation }
export interface AnimationTrack { property: AnimatableProperty; targetEntityUuid: string | null; keyframes: AnimationKeyframe[] }
export interface SpriteAnimationFrame { spriteAsset: string | null; duration: number }
export interface AnimationEvent { time: number; signal: string; payload: string }
export interface AnimationMarker { time: number; name: string }
export interface AnimationCommand { time: number; value: string; payload: string }
export interface AnimationCommandTrack { kind: AnimationCommandKind; targetEntityUuid: string | null; commands: AnimationCommand[] }
export interface AnimationClipDocument {
  version: 4
  name: string
  loop: boolean
  frameRate: number
  playbackSpeed: number
  onionSkin: boolean
  spriteFrames: SpriteAnimationFrame[]
  tracks: AnimationTrack[]
  events: AnimationEvent[]
  markers: AnimationMarker[]
  commandTracks: AnimationCommandTrack[]
}
export interface AnimatorParameter { name: string; type: AnimatorParameterType; defaultValue: AnimatorParameterValue }
export type BlendTreeType = '1D' | '2D'
export interface BlendTreeChild { clipAsset: string | null; threshold: number; positionX: number; positionY: number; speed: number }
export interface BlendTree { type: BlendTreeType; parameter: string; parameterY: string; synchronizeNormalizedTime: boolean; children: BlendTreeChild[] }
export type RootMotionMode = 'Apply' | 'Ignore'
export interface AnimatorState {
  id: string
  name: string
  clipAsset: string | null
  speed: number
  speedParameter: string | null
  cycleOffset: number
  mirrorX: boolean
  mirrorY: boolean
  rootMotion: RootMotionMode
  x: number
  y: number
  subgraph: string
  blendTree: BlendTree | null
}
export interface TransitionCondition { parameter: string; operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'trigger'; value: AnimatorParameterValue }
export type TransitionInterruption = 'None' | 'Source' | 'Destination' | 'SourceThenDestination'
export type TransitionSyncMode = 'None' | 'NormalizedTime' | 'Marker'
export interface AnimatorTransition { id: string; from: string; to: string; hasExitTime: boolean; exitTime: number; duration: number; interruption: TransitionInterruption; syncMode: TransitionSyncMode; syncMarker: string; destinationOffset: number; conditions: TransitionCondition[] }
export interface AnimatorLayer { id: string; name: string; defaultState: string; weight: number; additive: boolean; maskAsset: string | null; synchronizedLayer: string | null; synchronizedTiming: boolean }
export interface AnimatorControllerDocument {
  version: 3
  name: string
  defaultState: string
  parameters: AnimatorParameter[]
  states: AnimatorState[]
  transitions: AnimatorTransition[]
  layers: AnimatorLayer[]
}

export interface AnimationMaskDocument { version: 1; name: string; properties: AnimatableProperty[] }

const TRACKS = new Set<AnimatableProperty>(['Transform.position.x', 'Transform.position.y', 'Transform.rotation', 'Transform.scale.x', 'Transform.scale.y', 'SpriteRenderer.opacity', 'UI.opacity'])
const PARAMETER_TYPES = new Set<AnimatorParameterType>(['Bool', 'Float', 'Integer', 'Trigger'])
const OPERATORS = new Set<TransitionCondition['operator']>(['==', '!=', '>', '<', '>=', '<=', 'trigger'])
const TANGENTS = new Set<KeyTangentMode>(['Auto', 'Linear', 'Constant', 'Free'])
const EASINGS = new Set<KeyEasing>(['Linear', 'EaseIn', 'EaseOut', 'EaseInOut'])
const INTERPOLATIONS = new Set<AnimationInterpolation>(['Step', 'Linear', 'Cubic'])
const COMMAND_KINDS = new Set<AnimationCommandKind>(['Method', 'Audio', 'NestedAnimation', 'Timeline', 'VisualGraph', 'Custom'])
const INTERRUPTIONS = new Set<TransitionInterruption>(['None', 'Source', 'Destination', 'SourceThenDestination'])
const BLEND_TREE_TYPES = new Set<BlendTreeType>(['1D', '2D'])
const ROOT_MOTION_MODES = new Set<RootMotionMode>(['Apply', 'Ignore'])
const TRANSITION_SYNC_MODES = new Set<TransitionSyncMode>(['None', 'NormalizedTime', 'Marker'])

function id(value: unknown, fallback: string): string {
  const safe = typeof value === 'string' ? value.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) : ''
  return safe || fallback
}

function parameterValue(value: unknown, type: AnimatorParameterType): AnimatorParameterValue {
  if (type === 'Bool' || type === 'Trigger') return value === true
  const number = finiteNumber(value, 0)
  return type === 'Integer' ? Math.round(number) : number
}

export function defaultAnimationClip(name = 'New Animation'): AnimationClipDocument {
  return { version: 4, name, loop: true, frameRate: 12, playbackSpeed: 1, onionSkin: false, spriteFrames: [], tracks: [], events: [], markers: [], commandTracks: [] }
}

export function defaultAnimatorController(name = 'New Controller'): AnimatorControllerDocument {
  const stateId = 'idle'
  return {
    version: 3, name, defaultState: stateId, parameters: [], transitions: [],
    states: [{ id: stateId, name: 'Idle', clipAsset: null, speed: 1, speedParameter: null, cycleOffset: 0, mirrorX: false, mirrorY: false, rootMotion: 'Apply', x: 80, y: 80, subgraph: 'Base', blendTree: null }],
    layers: [{ id: 'base', name: 'Base', defaultState: stateId, weight: 1, additive: false, maskAsset: null, synchronizedLayer: null, synchronizedTiming: false }]
  }
}

export function defaultAnimationMask(name = 'New Animation Mask'): AnimationMaskDocument { return { version: 1, name, properties: [...TRACKS] } }

export function normalizeAnimationClip(source: unknown): AnimationClipDocument {
  const item = source && typeof source === 'object' ? source as Partial<AnimationClipDocument> : {}
  return {
    version: 4,
    name: typeof item.name === 'string' ? item.name.slice(0, 120) : 'Animation',
    loop: item.loop !== false,
    frameRate: Math.min(240, Math.max(1, finiteNumber(item.frameRate, 12))),
    playbackSpeed: Math.min(100, Math.max(0.001, finiteNumber(item.playbackSpeed, 1))),
    onionSkin: item.onionSkin === true,
    spriteFrames: (Array.isArray(item.spriteFrames) ? item.spriteFrames : []).slice(0, 10_000).map(frame => ({
      spriteAsset: typeof frame?.spriteAsset === 'string' ? frame.spriteAsset : null,
      duration: Math.min(3600, Math.max(1 / 1000, finiteNumber(frame?.duration, 1 / 12)))
    })),
    tracks: (Array.isArray(item.tracks) ? item.tracks : []).slice(0, 100).flatMap(track => {
      if (!track || !TRACKS.has(track.property as AnimatableProperty)) return []
      const keyframes = (Array.isArray(track.keyframes) ? track.keyframes : []).slice(0, 10_000).map(frame => ({
        time: Math.max(0, finiteNumber(frame?.time)), value: finiteNumber(frame?.value),
        tangentMode: TANGENTS.has(frame?.tangentMode as KeyTangentMode) ? frame!.tangentMode as KeyTangentMode : 'Auto',
        inTangent: finiteNumber(frame?.inTangent), outTangent: finiteNumber(frame?.outTangent),
        easing: EASINGS.has(frame?.easing as KeyEasing) ? frame!.easing as KeyEasing : 'Linear',
        interpolation: INTERPOLATIONS.has(frame?.interpolation as AnimationInterpolation) ? frame!.interpolation as AnimationInterpolation : frame?.tangentMode === 'Constant' ? 'Step' : frame?.tangentMode === 'Linear' ? 'Linear' : 'Cubic'
      })).sort((first, second) => first.time - second.time)
      return [{ property: track.property as AnimatableProperty, targetEntityUuid: typeof track.targetEntityUuid === 'string' ? track.targetEntityUuid : null, keyframes }]
    }),
    events: (Array.isArray(item.events) ? item.events : []).slice(0, 1000).flatMap(event => {
      if (!event || typeof event.signal !== 'string' || !event.signal.trim()) return []
      return [{ time: Math.max(0, finiteNumber(event.time)), signal: event.signal.trim().slice(0, 128), payload: typeof event.payload === 'string' ? event.payload.slice(0, 4096) : '' }]
    }).sort((first, second) => first.time - second.time),
    markers: (Array.isArray(item.markers) ? item.markers : []).slice(0, 1000).flatMap(marker => marker && typeof marker.name === 'string' && marker.name.trim()
      ? [{ time: Math.max(0, finiteNumber(marker.time)), name: marker.name.trim().slice(0, 128) }] : []).sort((first, second) => first.time - second.time),
    commandTracks: (Array.isArray(item.commandTracks) ? item.commandTracks : []).slice(0, 256).flatMap(track => {
      if (!track || !COMMAND_KINDS.has(track.kind as AnimationCommandKind)) return []
      const commands = (Array.isArray(track.commands) ? track.commands : []).slice(0, 10_000).flatMap(command => command && typeof command.value === 'string' && command.value.trim()
        ? [{ time: Math.max(0, finiteNumber(command.time)), value: command.value.trim().slice(0, 512), payload: typeof command.payload === 'string' ? command.payload.slice(0, 4096) : '' }] : []).sort((first, second) => first.time - second.time)
      return [{ kind: track.kind as AnimationCommandKind, targetEntityUuid: typeof track.targetEntityUuid === 'string' ? track.targetEntityUuid : null, commands }]
    })
  }
}

export function normalizeAnimatorController(source: unknown): AnimatorControllerDocument {
  const item = source && typeof source === 'object' ? source as Partial<AnimatorControllerDocument> : {}
  const usedStates = new Set<string>()
  const states = (Array.isArray(item.states) ? item.states : []).slice(0, 1000).map((state, index) => {
    let stateId = id(state?.id, `state_${index + 1}`)
    while (usedStates.has(stateId)) stateId = `${stateId}_${index + 1}`
    usedStates.add(stateId)
    return {
      id: stateId,
      name: typeof state?.name === 'string' ? state.name.slice(0, 80) : `State ${index + 1}`,
      clipAsset: typeof state?.clipAsset === 'string' ? state.clipAsset : null,
      speed: Math.min(100, Math.max(-100, finiteNumber(state?.speed, 1))),
      speedParameter: typeof state?.speedParameter === 'string' ? id(state.speedParameter, '') || null : null,
      cycleOffset: Math.min(1, Math.max(0, finiteNumber(state?.cycleOffset))),
      mirrorX: state?.mirrorX === true, mirrorY: state?.mirrorY === true,
      rootMotion: ROOT_MOTION_MODES.has(state?.rootMotion as RootMotionMode) ? state!.rootMotion as RootMotionMode : 'Apply',
      x: finiteNumber(state?.x, 80 + index * 180), y: finiteNumber(state?.y, 80),
      subgraph: typeof state?.subgraph === 'string' ? state.subgraph.slice(0, 80) : 'Base',
      blendTree: state?.blendTree && typeof state.blendTree === 'object' ? {
        type: BLEND_TREE_TYPES.has(state.blendTree.type as BlendTreeType) ? state.blendTree.type as BlendTreeType : '1D',
        parameter: id(state.blendTree.parameter, ''),
        parameterY: id(state.blendTree.parameterY, ''),
        synchronizeNormalizedTime: state.blendTree.synchronizeNormalizedTime !== false,
        children: (Array.isArray(state.blendTree.children) ? state.blendTree.children : []).slice(0, 64).map(child => ({
          clipAsset: typeof child?.clipAsset === 'string' ? child.clipAsset : null,
          threshold: finiteNumber(child?.threshold),
          positionX: finiteNumber(child?.positionX, finiteNumber(child?.threshold)), positionY: finiteNumber(child?.positionY),
          speed: Math.min(100, Math.max(-100, finiteNumber(child?.speed, 1)))
        })).sort((first, second) => first.threshold - second.threshold)
      } : null
    }
  })
  if (!states.length) states.push(defaultAnimatorController().states[0])
  const usedParameters = new Set<string>()
  const parameters = (Array.isArray(item.parameters) ? item.parameters : []).slice(0, 256).flatMap((parameter, index) => {
    if (!parameter) return []
    const name = id(parameter.name, `parameter_${index + 1}`)
    if (usedParameters.has(name)) return []
    usedParameters.add(name)
    const type = PARAMETER_TYPES.has(parameter.type as AnimatorParameterType) ? parameter.type as AnimatorParameterType : 'Bool'
    return [{ name, type, defaultValue: parameterValue(parameter.defaultValue, type) }]
  })
  const transitions = (Array.isArray(item.transitions) ? item.transitions : []).slice(0, 2000).flatMap((transition, index) => {
    if (!transition || !usedStates.has(String(transition.from)) || !usedStates.has(String(transition.to))) return []
    return [{
      id: id(transition.id, `transition_${index + 1}`), from: String(transition.from), to: String(transition.to),
      hasExitTime: transition.hasExitTime !== false,
      exitTime: Math.min(1, Math.max(0, finiteNumber(transition.exitTime, 1))),
      duration: Math.min(60, Math.max(0, finiteNumber(transition.duration, .1))),
      interruption: INTERRUPTIONS.has(transition.interruption as TransitionInterruption) ? transition.interruption as TransitionInterruption : 'SourceThenDestination',
      syncMode: TRANSITION_SYNC_MODES.has(transition.syncMode as TransitionSyncMode) ? transition.syncMode as TransitionSyncMode : 'None',
      syncMarker: typeof transition.syncMarker === 'string' ? transition.syncMarker.trim().slice(0, 128) : '',
      destinationOffset: Math.min(1, Math.max(0, finiteNumber(transition.destinationOffset))),
      conditions: (Array.isArray(transition.conditions) ? transition.conditions : []).slice(0, 64).flatMap(condition => {
        const parameter = parameters.find(candidate => candidate.name === condition?.parameter)
        if (!parameter) return []
        const operator = OPERATORS.has(condition.operator as TransitionCondition['operator']) ? condition.operator as TransitionCondition['operator'] : '=='
        return [{ parameter: parameter.name, operator, value: parameterValue(condition.value, parameter.type) }]
      })
    }]
  })
  const layers = (Array.isArray(item.layers) ? item.layers : []).slice(0, 32).map((layer, index) => ({
    id: id(layer?.id, index ? `layer_${index + 1}` : 'base'), name: typeof layer?.name === 'string' ? layer.name.slice(0, 80) : `Layer ${index + 1}`,
    defaultState: usedStates.has(String(layer?.defaultState)) ? String(layer?.defaultState) : states[0].id,
    weight: Math.min(1, Math.max(0, finiteNumber(layer?.weight, index ? 0 : 1))), additive: layer?.additive === true,
    maskAsset: typeof layer?.maskAsset === 'string' ? layer.maskAsset : null,
    synchronizedLayer: typeof layer?.synchronizedLayer === 'string' && String(layer.synchronizedLayer) !== String(layer?.id) ? id(layer.synchronizedLayer, '') || null : null,
    synchronizedTiming: layer?.synchronizedTiming === true
  }))
  if (!layers.length) layers.push({ id: 'base', name: 'Base', defaultState: usedStates.has(String(item.defaultState)) ? String(item.defaultState) : states[0].id, weight: 1, additive: false, maskAsset: null, synchronizedLayer: null, synchronizedTiming: false })
  const layerIds = new Set(layers.map(layer => layer.id))
  for (const layer of layers) if (layer.synchronizedLayer && !layerIds.has(layer.synchronizedLayer)) layer.synchronizedLayer = null
  return {
    version: 3, name: typeof item.name === 'string' ? item.name.slice(0, 120) : 'Animator Controller',
    defaultState: usedStates.has(String(item.defaultState)) ? String(item.defaultState) : states[0].id,
    parameters, states, transitions, layers
  }
}

export function normalizeAnimationMask(source: unknown): AnimationMaskDocument {
  const item = source && typeof source === 'object' ? source as Partial<AnimationMaskDocument> : {}
  const properties = (Array.isArray(item.properties) ? item.properties : []).filter((value): value is AnimatableProperty => TRACKS.has(value as AnimatableProperty))
  return { version: 1, name: typeof item.name === 'string' ? item.name.slice(0, 120) : 'Animation Mask', properties: [...new Set(properties)] }
}

function parseAsset<T>(reference: string | null, type: 'animation' | 'controller' | 'animationMask', normalize: (source: unknown) => T): T | null {
  const asset = resolveAsset(reference)
  const source = readTextAsset(reference)
  if (!asset || asset.assetType !== type || !source) return null
  try { return normalize(JSON.parse(source)) } catch { return null }
}

const clipCache = new Map<string, { generation: number; value: AnimationClipDocument | null }>()
const controllerCache = new Map<string, { generation: number; value: AnimatorControllerDocument | null }>()
const maskCache = new Map<string, { generation: number; value: AnimationMaskDocument | null }>()

export function readAnimationClip(reference: string | null): AnimationClipDocument | null {
  if (!reference) return null
  const cached = clipCache.get(reference)
  if (cached?.generation === assetState.generation) return cached.value
  const value = parseAsset(reference, 'animation', normalizeAnimationClip)
  clipCache.set(reference, { generation: assetState.generation, value })
  return value
}

export function readAnimatorController(reference: string | null): AnimatorControllerDocument | null {
  if (!reference) return null
  const cached = controllerCache.get(reference)
  if (cached?.generation === assetState.generation) return cached.value
  const value = parseAsset(reference, 'controller', normalizeAnimatorController)
  controllerCache.set(reference, { generation: assetState.generation, value })
  return value
}

export function readAnimationMask(reference: string | null): AnimationMaskDocument | null {
  if (!reference) return null
  const cached = maskCache.get(reference); if (cached?.generation === assetState.generation) return cached.value
  const value = parseAsset(reference, 'animationMask', normalizeAnimationMask)
  maskCache.set(reference, { generation: assetState.generation, value }); return value
}

export function createAnimationClipAsset(name = 'New Animation'): AssetRecord {
  return createTextAsset(name, 'animation', JSON.stringify(defaultAnimationClip(name), null, 2), 'Assets/Animations')
}

export function createAnimatorControllerAsset(name = 'New Controller'): AssetRecord {
  return createTextAsset(name, 'controller', JSON.stringify(defaultAnimatorController(name), null, 2), 'Assets/Controllers')
}

export function createAnimationMaskAsset(name = 'New Animation Mask'): AssetRecord {
  return createTextAsset(name, 'animationMask', JSON.stringify(defaultAnimationMask(name), null, 2), 'Assets/AnimationMasks')
}

export function reimportAnimationClip(asset: AssetRecord): AnimationClipDocument | null {
  const settings = asset.animationImport
  if (asset.assetType !== 'animation' || !settings?.sourceAsset || resolveAsset(settings.sourceAsset)?.uuid === asset.uuid) return null
  const source = readAnimationClip(settings.sourceAsset)
  if (!source) return null
  const sampleRate = Math.min(240, Math.max(1, finiteNumber(settings.sampleRate, source.frameRate)))
  const mapping = new Map(settings.trackMappings.flatMap(item => TRACKS.has(item.source as AnimatableProperty) && TRACKS.has(item.target as AnimatableProperty)
    ? [[item.source as AnimatableProperty, item.target as AnimatableProperty] as const]
    : []))
  const length = animationClipLength(source)
  const tracks = source.tracks.map(track => {
    const property = mapping.get(track.property) ?? track.property
    const keyframes: AnimationKeyframe[] = []
    for (let index = 0; index <= Math.ceil(length * sampleRate); index++) {
      const time = Math.min(length, index / sampleRate)
      const value = sampleAnimationTrack(track.keyframes, time)
      if (value !== null) keyframes.push({ time, value, tangentMode: 'Linear', inTangent: 0, outTangent: 0, interpolation: 'Linear' })
    }
    return { property, targetEntityUuid: track.targetEntityUuid, keyframes: reduceAnimationKeys(keyframes, settings.compressionTolerance) }
  })
  const imported = normalizeAnimationClip({
    ...source, name: asset.name.replace(/\.nova-anim$/i, ''), frameRate: sampleRate, tracks,
    events: settings.preserveEvents ? source.events.map(event => ({ ...event })) : [], spriteFrames: source.spriteFrames.map(frame => ({ ...frame }))
  })
  settings.sourceFrameRate = source.frameRate
  settings.sampleRate = sampleRate
  settings.lastImportedAt = Date.now()
  return updateTextAsset(asset.uuid, JSON.stringify(imported, null, 2)) ? imported : null
}

export function animationClipLength(clip: AnimationClipDocument): number {
  const sprite = clip.spriteFrames.reduce((sum, frame) => sum + frame.duration, 0)
  const tracks = clip.tracks.reduce((maximum, track) => Math.max(maximum, track.keyframes[track.keyframes.length - 1]?.time ?? 0), 0)
  const markers = clip.markers.reduce((maximum, marker) => Math.max(maximum, marker.time), 0)
  const commands = clip.commandTracks.reduce((maximum, track) => Math.max(maximum, track.commands[track.commands.length - 1]?.time ?? 0), 0)
  const events = clip.events.reduce((maximum, event) => Math.max(maximum, event.time), 0)
  return Math.max(sprite, tracks, markers, commands, events, 1 / clip.frameRate)
}

function easeRatio(ratio: number, easing: KeyEasing | undefined): number {
  if (easing === 'EaseIn') return ratio * ratio
  if (easing === 'EaseOut') return 1 - (1 - ratio) * (1 - ratio)
  if (easing === 'EaseInOut') return ratio < .5 ? 2 * ratio * ratio : 1 - Math.pow(-2 * ratio + 2, 2) / 2
  return ratio
}

export function sampleAnimationTrack(keyframes: AnimationKeyframe[], time: number): number | null {
  if (!keyframes.length) return null
  if (time <= keyframes[0].time) return keyframes[0].value
  const last = keyframes[keyframes.length - 1]
  if (time >= last.time) return last.value
  for (let index = 1; index < keyframes.length; index++) {
    const next = keyframes[index]
    if (time > next.time) continue
    const previous = keyframes[index - 1]
    const range = Math.max(1e-9, next.time - previous.time)
    const ratio = easeRatio((time - previous.time) / range, previous.easing)
    const interpolation = previous.interpolation ?? (previous.tangentMode === 'Constant' ? 'Step' : previous.tangentMode === 'Linear' ? 'Linear' : 'Cubic')
    if (interpolation === 'Step') return previous.value
    if (interpolation === 'Linear') return previous.value + (next.value - previous.value) * ratio
    const slope = (next.value - previous.value) / range
    const m0 = (previous.tangentMode === 'Free' ? previous.outTangent : slope) * range
    const m1 = (next.tangentMode === 'Free' ? next.inTangent : slope) * range
    const ratio2 = ratio * ratio, ratio3 = ratio2 * ratio
    return (2 * ratio3 - 3 * ratio2 + 1) * previous.value + (ratio3 - 2 * ratio2 + ratio) * m0 + (-2 * ratio3 + 3 * ratio2) * next.value + (ratio3 - ratio2) * m1
  }
  return last.value
}

export function reduceAnimationKeys(keyframes: AnimationKeyframe[], tolerance = .0001): AnimationKeyframe[] {
  const safeTolerance = Math.min(1e9, Math.max(0, finiteNumber(tolerance, .0001)))
  if (keyframes.length < 3) return keyframes.map(key => ({ ...key }))
  const result: AnimationKeyframe[] = [{ ...keyframes[0] }]
  for (let index = 1; index < keyframes.length - 1; index++) {
    const previous = result[result.length - 1], current = keyframes[index], next = keyframes[index + 1]
    if ((current.interpolation ?? 'Cubic') === 'Step' || current.tangentMode === 'Free') { result.push({ ...current }); continue }
    const ratio = (current.time - previous.time) / Math.max(1e-9, next.time - previous.time), expected = previous.value + (next.value - previous.value) * ratio
    if (Math.abs(current.value - expected) > safeTolerance) result.push({ ...current })
  }
  result.push({ ...keyframes[keyframes.length - 1] }); return result
}

export function retimeAnimationClip(clip: AnimationClipDocument, start: number, end: number, timeScale: number, ripple = true): AnimationClipDocument {
  const value = normalizeAnimationClip(clip), from = Math.max(0, Math.min(start, end)), to = Math.max(from, Math.max(start, end)), scale = Math.min(1_000, Math.max(.001, finiteNumber(timeScale, 1))), oldRange = to - from, delta = oldRange * (scale - 1)
  const retime = (time: number) => time < from ? time : time <= to ? from + (time - from) * scale : ripple ? time + delta : time
  value.tracks.forEach(track => track.keyframes.forEach(key => { key.time = retime(key.time) }))
  value.events.forEach(event => { event.time = retime(event.time) }); value.markers.forEach(marker => { marker.time = retime(marker.time) })
  value.commandTracks.forEach(track => track.commands.forEach(command => { command.time = retime(command.time) }))
  return normalizeAnimationClip(value)
}

export function sliceAnimationClip(clip: AnimationClipDocument, start: number, end: number, name = `${clip.name} Slice`): AnimationClipDocument {
  const from = Math.max(0, Math.min(start, end)), to = Math.max(from + 1e-6, Math.max(start, end)), value = normalizeAnimationClip(clip)
  value.name = name.slice(0, 120)
  value.tracks.forEach(track => { track.keyframes = track.keyframes.filter(key => key.time >= from && key.time <= to).map(key => ({ ...key, time: key.time - from })) })
  value.events = value.events.filter(event => event.time >= from && event.time <= to).map(event => ({ ...event, time: event.time - from }))
  value.markers = value.markers.filter(marker => marker.time >= from && marker.time <= to).map(marker => ({ ...marker, time: marker.time - from }))
  value.commandTracks.forEach(track => { track.commands = track.commands.filter(command => command.time >= from && command.time <= to).map(command => ({ ...command, time: command.time - from })) })
  const spriteFrames: SpriteAnimationFrame[] = []; let cursor = 0
  for (const frame of value.spriteFrames) { const frameEnd = cursor + frame.duration, overlap = Math.max(0, Math.min(to, frameEnd) - Math.max(from, cursor)); if (overlap > 0) spriteFrames.push({ ...frame, duration: overlap }); cursor = frameEnd }
  value.spriteFrames = spriteFrames
  return normalizeAnimationClip(value)
}

interface TimedOccurrence<T> { item: T; crossed: number; itemIndex: number }
function timedOccurrences<T extends { time: number }>(items: T[], previous: number, rawNext: number, length: number, loop: boolean): TimedOccurrence<T>[] {
  if (!items.length || length <= 0 || rawNext === previous) return []
  const result: TimedOccurrence<T>[] = [], forward = rawNext > previous, lower = Math.min(previous, rawNext), upper = Math.max(previous, rawNext)
  if (!loop) return items.map((item, itemIndex) => ({ item, itemIndex, crossed: item.time })).filter(entry => forward ? entry.crossed > lower && entry.crossed <= upper : entry.crossed >= lower && entry.crossed < upper).sort((a, b) => forward ? a.crossed - b.crossed || a.itemIndex - b.itemIndex : b.crossed - a.crossed || b.itemIndex - a.itemIndex)
  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const item = items[itemIndex]
    const firstCycle = Math.ceil((lower - item.time) / length), lastCycle = Math.floor((upper - item.time) / length)
    for (let cycle = firstCycle; cycle <= lastCycle && result.length < 10_000; cycle++) {
      const crossed = item.time + cycle * length
      if (forward ? crossed > previous && crossed <= rawNext : crossed >= rawNext && crossed < previous) result.push({ item, crossed, itemIndex })
    }
  }
  return result.sort((a, b) => forward ? a.crossed - b.crossed || a.itemIndex - b.itemIndex : b.crossed - a.crossed || b.itemIndex - a.itemIndex)
}

function occurrences<T extends { time: number }>(items: T[], previous: number, rawNext: number, length: number, loop: boolean): T[] {
  return timedOccurrences(items, previous, rawNext, length, loop).map(entry => entry.item)
}

export function animationEventsBetween(clip: AnimationClipDocument, previous: number, rawNext: number): AnimationEvent[] { return occurrences(clip.events, previous, rawNext, animationClipLength(clip), clip.loop) }
export function animationCommandsBetween(track: AnimationCommandTrack, clip: AnimationClipDocument, previous: number, rawNext: number): AnimationCommand[] { return occurrences(track.commands, previous, rawNext, animationClipLength(clip), clip.loop) }
export type AnimationDispatch = { kind: 'event'; event: AnimationEvent; crossed: number; order: number } | { kind: 'command'; track: AnimationCommandTrack; command: AnimationCommand; crossed: number; order: number }
export function animationDispatchesBetween(clip: AnimationClipDocument, previous: number, rawNext: number): AnimationDispatch[] {
  const length = animationClipLength(clip), forward = rawNext >= previous, result: AnimationDispatch[] = []
  timedOccurrences(clip.events, previous, rawNext, length, clip.loop).forEach(entry => result.push({ kind: 'event', event: entry.item, crossed: entry.crossed, order: entry.itemIndex }))
  clip.commandTracks.forEach((track, trackIndex) => timedOccurrences(track.commands, previous, rawNext, length, clip.loop).forEach(entry => result.push({ kind: 'command', track, command: entry.item, crossed: entry.crossed, order: 1_000_000 + trackIndex * 10_000 + entry.itemIndex })))
  return result.sort((first, second) => forward ? first.crossed - second.crossed || first.order - second.order : second.crossed - first.crossed || second.order - first.order)
}

function conditionMatches(value: AnimatorParameterValue, condition: TransitionCondition): boolean {
  if (condition.operator === 'trigger') return value === true
  if (condition.operator === '==') return value === condition.value
  if (condition.operator === '!=') return value !== condition.value
  const left = Number(value); const right = Number(condition.value)
  if (condition.operator === '>') return left > right
  if (condition.operator === '<') return left < right
  if (condition.operator === '>=') return left >= right
  return left <= right
}

interface LayerRuntimeState { stateId: string; time: number; previousStateId: string | null; previousTime: number; blendTime: number; blendDuration: number }
interface AnimatorRuntimeState { controllerAsset: string | null; layers: Map<string, LayerRuntimeState> }
interface SampledClip { values: Map<string, { property: AnimatableProperty; targetEntityUuid: string | null; value: number }>; spriteAsset: string | null }
export interface AnimatorRuntimeInspection { entityUuid: string; controllerAsset: string | null; layers: Array<{ layerId: string; stateId: string; time: number; previousStateId: string | null; blendProgress: number }> }
export interface RuntimeAnimationRecordingStatus { active: boolean; entityUuid: string; elapsed: number; frameRate: number; samples: number; targetAssetUuid: string | null }
interface RuntimeAnimationRecordingSession { entityUuid: string; elapsed: number; accumulator: number; frameRate: number; targetAssetUuid: string | null; tracks: Map<AnimatableProperty, AnimationKeyframe[]> }
interface DirectClipPlayback { reference: string; time: number }

class AnimationRuntime {
  private runtime = new Map<string, AnimatorRuntimeState>()
  private recording: RuntimeAnimationRecordingSession | null = null
  private directPlayback = new Map<string, DirectClipPlayback>()
  onEvent: ((entity: Entity, event: AnimationEvent) => void) | null = null
  onCommand: ((entity: Entity, track: AnimationCommandTrack, command: AnimationCommand) => void) | null = null

  reset(): void { this.runtime.clear(); this.recording = null; this.directPlayback.clear() }
  playClipOnce(entityUuid: string, reference: string): boolean { if (!entityUuid || !readAnimationClip(reference)) return false; this.directPlayback.set(entityUuid, { reference, time: 0 }); return true }
  recordingStatus(): RuntimeAnimationRecordingStatus {
    const value = this.recording
    return value ? { active: true, entityUuid: value.entityUuid, elapsed: value.elapsed, frameRate: value.frameRate, samples: value.tracks.values().next().value?.length ?? 0, targetAssetUuid: value.targetAssetUuid } : { active: false, entityUuid: '', elapsed: 0, frameRate: 60, samples: 0, targetAssetUuid: null }
  }
  beginRuntimeRecording(entityUuid: string, frameRate = 60, targetAssetUuid: string | null = null): boolean {
    if (!entityUuid || this.recording) return false
    this.recording = { entityUuid, elapsed: 0, accumulator: 0, frameRate: Math.min(240, Math.max(1, Math.round(finiteNumber(frameRate, 60)))), targetAssetUuid, tracks: new Map() }
    return true
  }
  finishRuntimeRecording(name = 'Runtime Recording'): AssetRecord | null {
    const recording = this.recording; this.recording = null
    if (!recording || !recording.tracks.size) return null
    const clip = normalizeAnimationClip({
      ...defaultAnimationClip(name), frameRate: recording.frameRate, loop: false,
      tracks: [...recording.tracks.entries()].map(([property, keyframes]) => ({ property, targetEntityUuid: null, keyframes: reduceAnimationKeys(keyframes, 1e-6) }))
    })
    const target = recording.targetAssetUuid ? assetState.records.find(asset => asset.uuid === recording.targetAssetUuid && asset.assetType === 'animation') : null
    if (target && updateTextAsset(target.uuid, JSON.stringify(clip, null, 2))) return target
    return createTextAsset(name, 'animation', JSON.stringify(clip, null, 2), 'Assets/Animations/Recordings')
  }
  cancelRuntimeRecording(): void { this.recording = null }
  inspect(entityUuid?: string): AnimatorRuntimeInspection[] {
    return [...this.runtime.entries()].filter(([uuid]) => !entityUuid || uuid === entityUuid).map(([uuid, state]) => ({ entityUuid: uuid, controllerAsset: state.controllerAsset, layers: [...state.layers.entries()].map(([layerId, layer]) => ({ layerId, stateId: layer.stateId, time: layer.time, previousStateId: layer.previousStateId, blendProgress: layer.blendDuration > 0 ? Math.min(1, layer.blendTime / layer.blendDuration) : 1 })) }))
  }

  update(entities: Entity[], delta: number): void {
    const alive = new Set(entities.map(entity => entity.uuid))
    for (const uuid of this.runtime.keys()) if (!alive.has(uuid)) this.runtime.delete(uuid)
    for (const entity of entities) {
      const animator = entity.getComponent<Animator>('Animator')
      if (!entity.enabled || !animator?.enabled) continue
      const controller = readAnimatorController(animator.controllerAsset)
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
      controller.layers.forEach((layer, layerIndex) => {
        const weight = Math.min(1, Math.max(0, animator.layerWeights[layer.id] ?? layer.weight))
        if (weight <= 0) return
        let layerState = state!.layers.get(layer.id)
        const requested = layerIndex === 0 && animator.currentState && controller.states.some(candidate => candidate.id === animator.currentState) ? animator.currentState : ''
        if (!layerState || !controller.states.some(candidate => candidate.id === layerState!.stateId)) {
          layerState = { stateId: requested || layer.defaultState, time: 0, previousStateId: null, previousTime: 0, blendTime: 0, blendDuration: 0 }
          state!.layers.set(layer.id, layerState)
        } else if (requested && requested !== layerState.stateId) {
          layerState.previousStateId = layerState.stateId; layerState.previousTime = layerState.time
          layerState.stateId = requested; layerState.time = 0; layerState.blendTime = 0; layerState.blendDuration = 0
        }
        const synchronized = layer.synchronizedTiming && layer.synchronizedLayer ? state!.layers.get(layer.synchronizedLayer) : null
        if (synchronized && !layerState.previousStateId) layerState.time = synchronized.time
        let activeState = controller.states.find(candidate => candidate.id === layerState!.stateId) ?? controller.states[0]
        const activeClip = this.stateClip(activeState, animator)
        const activeLength = activeClip ? animationClipLength(activeClip) : 0
        const normalizedTime = activeLength > 0 ? layerState.time / activeLength : 1
        const mayInterrupt = !layerState.previousStateId || controller.transitions.some(candidate => candidate.to === layerState!.stateId && candidate.interruption !== 'None')
        const transition = mayInterrupt ? controller.transitions.find(candidate => candidate.from === activeState.id
          && (!candidate.hasExitTime || normalizedTime >= candidate.exitTime)
          && candidate.conditions.every(condition => conditionMatches(animator.parameters[condition.parameter] ?? false, condition))) : undefined
        if (transition) {
          for (const condition of transition.conditions) {
            const parameter = controller.parameters.find(candidate => candidate.name === condition.parameter)
            if (parameter?.type === 'Trigger') animator.parameters[parameter.name] = false
          }
          const destination = controller.states.find(candidate => candidate.id === transition.to) ?? activeState
          const destinationClip = this.stateClip(destination, animator)
          layerState.previousStateId = layerState.stateId; layerState.previousTime = layerState.time
          layerState.stateId = transition.to
          layerState.time = this.synchronizedTransitionTime(transition, activeClip, destinationClip, layerState.previousTime)
          layerState.blendTime = 0; layerState.blendDuration = transition.duration
          activeState = destination
        }
        const clip = this.stateClip(activeState, animator)
        const length = clip ? animationClipLength(clip) : 0
        const previousTime = layerState.time
        const parameterSpeed = activeState.speedParameter ? finiteNumber(animator.parameters[activeState.speedParameter], 1) : 1
        const scaledDelta = Math.max(0, delta) * animator.speed * activeState.speed * parameterSpeed * (clip?.playbackSpeed ?? 1)
        const rawTime = layerState.time + scaledDelta
        layerState.time = rawTime
        if (clip && length > 0) {
          if (clip.loop) layerState.time = ((layerState.time % length) + length) % length
          else layerState.time = Math.min(length, Math.max(0, layerState.time))
          this.emitDispatches(entity, clip, previousTime, clip.loop ? rawTime : layerState.time)
          let sampled = this.sampleState(activeState, animator, layerState.time)
          if (layerState.previousStateId && layerState.blendDuration > 0) {
            const previousState = controller.states.find(candidate => candidate.id === layerState!.previousStateId)
            layerState.blendTime += Math.abs(scaledDelta)
            if (previousState) {
              const previousClip = this.stateClip(previousState, animator)
              const previousLength = previousClip ? animationClipLength(previousClip) : 0
              layerState.previousTime += Math.max(0, delta) * animator.speed * previousState.speed
              if (previousClip?.loop && previousLength > 0) layerState.previousTime = ((layerState.previousTime % previousLength) + previousLength) % previousLength
              else if (previousLength > 0) layerState.previousTime = Math.min(previousLength, Math.max(0, layerState.previousTime))
            }
            const ratio = Math.min(1, layerState.blendTime / layerState.blendDuration)
            if (previousState) sampled = this.blendSamples(this.sampleState(previousState, animator, layerState.previousTime, ratio < 1), sampled, ratio)
            if (ratio >= 1) layerState.previousStateId = null
          }
          const mask = readAnimationMask(layer.maskAsset)
          this.applySample(entity, entities, sampled, weight, layer.additive, mask ? new Set(mask.properties) : null, activeState)
        }
        if (layerIndex === 0) animator.currentState = activeState.id
      })
    }
    for (const [entityUuid, playback] of this.directPlayback) {
      const entity = entities.find(candidate => candidate.uuid === entityUuid), clip = readAnimationClip(playback.reference)
      if (!entity || !clip) { this.directPlayback.delete(entityUuid); continue }
      const previous = playback.time, length = animationClipLength(clip); playback.time = Math.min(length, playback.time + Math.max(0, delta) * clip.playbackSpeed)
      this.emitDispatches(entity, clip, previous, playback.time)
      const state: AnimatorState = { id: 'direct', name: 'Direct', clipAsset: playback.reference, speed: 1, speedParameter: null, cycleOffset: 0, mirrorX: false, mirrorY: false, rootMotion: 'Apply', x: 0, y: 0, subgraph: 'Direct', blendTree: null }
      this.applySample(entity, entities, this.sampleClip(clip, playback.time), 1, false, null, state)
      if (playback.time >= length) this.directPlayback.delete(entityUuid)
    }
    this.captureRuntimeRecording(entities, Math.max(0, delta))
  }

  private captureRuntimeRecording(entities: Entity[], delta: number): void {
    const recording = this.recording
    if (!recording) return
    const entity = entities.find(candidate => candidate.uuid === recording.entityUuid)
    if (!entity) { this.recording = null; return }
    recording.elapsed = Math.min(14_400, recording.elapsed + delta)
    recording.accumulator += delta
    const interval = 1 / recording.frameRate
    if (recording.accumulator + 1e-9 < interval && recording.tracks.size) return
    recording.accumulator %= interval
    const properties: AnimatableProperty[] = ['Transform.position.x', 'Transform.position.y', 'Transform.rotation', 'Transform.scale.x', 'Transform.scale.y', 'SpriteRenderer.opacity', 'UI.opacity']
    for (const property of properties) {
      const value = this.propertyValue(entity, property)
      if (value === null) continue
      const keys = recording.tracks.get(property) ?? []
      if (keys.length >= 240_000) continue
      keys.push({ time: recording.elapsed, value, tangentMode: 'Linear', inTangent: 0, outTangent: 0, easing: 'Linear', interpolation: 'Linear' })
      recording.tracks.set(property, keys)
    }
  }

  private stateClip(state: AnimatorState, animator: Animator): AnimationClipDocument | null {
    if (!state.blendTree?.children.length) return readAnimationClip(state.clipAsset)
    const valueX = Number(animator.parameters[state.blendTree.parameter] ?? 0)
    const valueY = Number(animator.parameters[state.blendTree.parameterY] ?? 0)
    const nearest = [...state.blendTree.children].sort((first, second) => {
      const firstDistance = state.blendTree!.type === '2D' ? Math.hypot(first.positionX - valueX, first.positionY - valueY) : Math.abs(first.threshold - valueX)
      const secondDistance = state.blendTree!.type === '2D' ? Math.hypot(second.positionX - valueX, second.positionY - valueY) : Math.abs(second.threshold - valueX)
      return firstDistance - secondDistance
    })[0]
    return readAnimationClip(nearest?.clipAsset ?? state.clipAsset)
  }

  private sampleState(state: AnimatorState, animator: Animator, time: number, previous = false): SampledClip {
    const tree = state.blendTree
    const primaryClip = this.stateClip(state, animator) ?? readAnimationClip(state.clipAsset)
    const primaryLength = primaryClip ? animationClipLength(primaryClip) : 0
    const offsetTime = primaryLength > 0 ? time + state.cycleOffset * primaryLength : time
    if (!tree?.children.length) return this.sampleClip(primaryClip, offsetTime)
    const parameter = Number(animator.parameters[tree.parameter] ?? 0)
    const children = tree.children
    const sampleChild = (child: BlendTreeChild): SampledClip => {
      const clip = readAnimationClip(child.clipAsset)
      const length = clip ? animationClipLength(clip) : 0
      const synchronizedTime = tree.synchronizeNormalizedTime && primaryLength > 0 && length > 0 ? offsetTime / primaryLength * length : offsetTime
      return this.sampleClip(clip, synchronizedTime * child.speed)
    }
    if (tree.type === '2D') {
      const parameterY = Number(animator.parameters[tree.parameterY] ?? 0)
      const weighted = children.map((child, index) => ({ child, index, distance: Math.hypot(child.positionX - parameter, child.positionY - parameterY) })).sort((first, second) => first.distance - second.distance || first.index - second.index).slice(0, 4)
      if (weighted[0]?.distance <= 1e-9) return sampleChild(weighted[0].child)
      const weights = weighted.map(item => 1 / Math.max(1e-9, item.distance * item.distance))
      const total = weights.reduce((sum, value) => sum + value, 0)
      return this.blendWeighted(weighted.map((item, index) => ({ sample: sampleChild(item.child), weight: weights[index] / total })))
    }
    let upperIndex = children.findIndex(child => child.threshold >= parameter)
    if (upperIndex < 0) upperIndex = children.length - 1
    const lowerIndex = Math.max(0, upperIndex - 1)
    const lower = children[lowerIndex], upper = children[upperIndex]
    if (!upper || lower === upper) return sampleChild(lower)
    const ratio = Math.min(1, Math.max(0, (parameter - lower.threshold) / Math.max(1e-9, upper.threshold - lower.threshold)))
    return this.blendSamples(sampleChild(lower), sampleChild(upper), previous ? Math.min(.999, ratio) : ratio)
  }

  private synchronizedTransitionTime(transition: AnimatorTransition, source: AnimationClipDocument | null, destination: AnimationClipDocument | null, sourceTime: number): number {
    const destinationLength = destination ? animationClipLength(destination) : 0
    if (destinationLength <= 0) return 0
    let time = transition.destinationOffset * destinationLength
    if (transition.syncMode === 'NormalizedTime' && source) {
      const sourceLength = animationClipLength(source)
      if (sourceLength > 0) time += sourceTime / sourceLength * destinationLength
    } else if (transition.syncMode === 'Marker' && source && transition.syncMarker) {
      const sourceMarker = source.markers.find(marker => marker.name === transition.syncMarker)
      const destinationMarker = destination?.markers.find(marker => marker.name === transition.syncMarker)
      if (sourceMarker && destinationMarker) time += destinationMarker.time + (sourceTime - sourceMarker.time)
    }
    return destination?.loop ? ((time % destinationLength) + destinationLength) % destinationLength : Math.min(destinationLength, Math.max(0, time))
  }

  private sampleClip(clip: AnimationClipDocument | null, time: number): SampledClip {
    const values = new Map<string, { property: AnimatableProperty; targetEntityUuid: string | null; value: number }>()
    let spriteAsset: string | null = null
    if (!clip) return { values, spriteAsset }
    if (clip.spriteFrames.length) {
      let cursor = 0
      for (const frame of clip.spriteFrames) {
        cursor += frame.duration
        if (time <= cursor) { spriteAsset = frame.spriteAsset; break }
      }
    }
    for (const track of clip.tracks) {
      const value = sampleAnimationTrack(track.keyframes, time)
      if (value === null) continue
      values.set(`${track.targetEntityUuid ?? ''}:${track.property}`, { property: track.property, targetEntityUuid: track.targetEntityUuid, value })
    }
    return { values, spriteAsset }
  }

  private blendSamples(first: SampledClip, second: SampledClip, ratio: number): SampledClip {
    const values = new Map(first.values)
    for (const [key, next] of second.values) {
      const previous = values.get(key)
      values.set(key, { ...next, value: previous ? previous.value + (next.value - previous.value) * ratio : next.value })
    }
    return { values, spriteAsset: ratio >= .5 ? second.spriteAsset : first.spriteAsset }
  }

  private blendWeighted(samples: Array<{ sample: SampledClip; weight: number }>): SampledClip {
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
    for (const [key, value] of totals) values.set(key, { property: value.property, targetEntityUuid: value.targetEntityUuid, value: value.weight > 0 ? value.value / value.weight : value.value })
    return { values, spriteAsset }
  }

  private applySample(owner: Entity, entities: Entity[], sample: SampledClip, weight: number, additive: boolean, mask: Set<AnimatableProperty> | null, state: AnimatorState): void {
    if (sample.spriteAsset && owner.spriteRenderer && weight >= .5) owner.spriteRenderer.spriteAsset = sample.spriteAsset
    for (const sampled of sample.values.values()) {
      if (mask && !mask.has(sampled.property)) continue
      const entity = sampled.targetEntityUuid ? entities.find(candidate => candidate.uuid === sampled.targetEntityUuid) : owner
      if (!entity) continue
      if (entity === owner && state.rootMotion === 'Ignore' && sampled.property.startsWith('Transform.')) continue
      const current = this.propertyValue(entity, sampled.property)
      if (current === null) continue
      let sampledValue = sampled.value
      if (state.mirrorX && (sampled.property === 'Transform.position.x' || sampled.property === 'Transform.rotation')) sampledValue = -sampledValue
      if (state.mirrorY && (sampled.property === 'Transform.position.y' || sampled.property === 'Transform.rotation')) sampledValue = -sampledValue
      const value = additive ? current + sampledValue * weight : current + (sampledValue - current) * weight
      this.setPropertyValue(entity, sampled.property, value)
    }
  }

  private propertyValue(entity: Entity, property: AnimatableProperty): number | null {
    if (property === 'Transform.position.x') return entity.transform.position.x
    if (property === 'Transform.position.y') return entity.transform.position.y
    if (property === 'Transform.rotation') return entity.transform.rotation
    if (property === 'Transform.scale.x') return entity.transform.scale.x
    if (property === 'Transform.scale.y') return entity.transform.scale.y
    if (property === 'SpriteRenderer.opacity') return entity.spriteRenderer?.opacity ?? null
    for (const kind of ['Panel', 'Image', 'Text'] as const) { const component = entity.getComponent<{ opacity: number } & { readonly kind: typeof kind; enabled: boolean; removed: boolean; uuid: string }>(kind); if (component) return component.opacity }
    return null
  }

  private setPropertyValue(entity: Entity, property: AnimatableProperty, value: number): void {
    if (property === 'Transform.position.x') entity.transform.position.x = value
    else if (property === 'Transform.position.y') entity.transform.position.y = value
    else if (property === 'Transform.rotation') entity.transform.rotation = value
    else if (property === 'Transform.scale.x') entity.transform.scale.x = Math.max(1e-6, value)
    else if (property === 'Transform.scale.y') entity.transform.scale.y = Math.max(1e-6, value)
    else if (property === 'SpriteRenderer.opacity' && entity.spriteRenderer) entity.spriteRenderer.opacity = Math.min(100, Math.max(0, value))
    else if (property === 'UI.opacity') for (const kind of ['Panel', 'Image', 'Text'] as const) { const component = entity.getComponent<{ opacity: number } & { readonly kind: typeof kind; enabled: boolean; removed: boolean; uuid: string }>(kind); if (component) component.opacity = Math.min(100, Math.max(0, value)) }
  }

  private emitDispatches(entity: Entity, clip: AnimationClipDocument, previousTime: number, rawTime: number): void {
    for (const dispatch of animationDispatchesBetween(clip, previousTime, rawTime)) {
      if (dispatch.kind === 'event') this.onEvent?.(entity, dispatch.event)
      else this.onCommand?.(entity, dispatch.track, dispatch.command)
    }
  }
}

export const animationRuntime = new AnimationRuntime()

export function setAnimatorParameter(animator: Animator, name: string, value: AnimatorParameterValue): void {
  const controller = readAnimatorController(animator.controllerAsset)
  const parameter = controller?.parameters.find(candidate => candidate.name === name)
  if (!parameter) return
  animator.parameters[name] = parameterValue(value, parameter.type)
}

export function animationAssetReference(asset: AssetRecord): string { return assetReference(asset.uuid) }
