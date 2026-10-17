/** Shared animation values and exact curve/event sampling; adopted by the existing runtime and authoring facades. */
import { finiteNumber } from '../world/geometry'
type AnimatorParameterValue = boolean | number


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
export interface RootMotionPreview { duration: number; delta: { x: number; y: number; rotation: number }; distance: number; samples: number }
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

export const TRACKS = new Set<AnimatableProperty>(['Transform.position.x', 'Transform.position.y', 'Transform.rotation', 'Transform.scale.x', 'Transform.scale.y', 'SpriteRenderer.opacity', 'UI.opacity'])
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

/** 结构说明（自动提取）：id；输入 value、fallback；直接调用 slice、replace、value.trim。 */ function id(value: unknown, fallback: string): string {
  const safe = typeof value === 'string' ? value.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) : ''
  return safe || fallback
}

/** 结构说明（自动提取）：parameterValue；输入 value、type；直接调用 finiteNumber、Math.round。 */ export function parameterValue(value: unknown, type: AnimatorParameterType): AnimatorParameterValue {
  if (type === 'Bool' || type === 'Trigger') return value === true
  const number = finiteNumber(value, 0)
  return type === 'Integer' ? Math.round(number) : number
}

/** 构造并返回记录 { version: 4, name, loop: true, frameRate: 12, playbackSpeed: 1, onionSkin: false, spriteFrames: [], tracks: [], events: [], markers: [], commandTracks: [] }，字段按当前实参及捕获状态求值。 */ export function defaultAnimationClip(name = 'New Animation'): AnimationClipDocument {
  return { version: 4, name, loop: true, frameRate: 12, playbackSpeed: 1, onionSkin: false, spriteFrames: [], tracks: [], events: [], markers: [], commandTracks: [] }
}

/** 结构说明（自动提取）：defaultAnimatorController；输入 name。 */ export function defaultAnimatorController(name = 'New Controller'): AnimatorControllerDocument {
  const stateId = 'idle'
  return {
    version: 3, name, defaultState: stateId, parameters: [], transitions: [],
    states: [{ id: stateId, name: 'Idle', clipAsset: null, speed: 1, speedParameter: null, cycleOffset: 0, mirrorX: false, mirrorY: false, rootMotion: 'Apply', x: 80, y: 80, subgraph: 'Base', blendTree: null }],
    layers: [{ id: 'base', name: 'Base', defaultState: stateId, weight: 1, additive: false, maskAsset: null, synchronizedLayer: null, synchronizedTiming: false }]
  }
}

/* 返回具有所列字段的新对象 { version: 1, name, properties: [...TRACKS] }。 */ export function defaultAnimationMask(name = 'New Animation Mask'): AnimationMaskDocument { return { version: 1, name, properties: [...TRACKS] } }

/** 结构说明（自动提取）：normalizeAnimationClip；输入 source；直接调用 item.name.slice、Math.min、Math.max、finiteNumber、map 等。 */ export function normalizeAnimationClip(source: unknown): AnimationClipDocument {
  const item = source && typeof source === 'object' ? source as Partial<AnimationClipDocument> : {}
  return {
    version: 4,
    name: typeof item.name === 'string' ? item.name.slice(0, 120) : 'Animation',
    loop: item.loop !== false,
    frameRate: Math.min(240, Math.max(1, finiteNumber(item.frameRate, 12))),
    playbackSpeed: Math.min(100, Math.max(0.001, finiteNumber(item.playbackSpeed, 1))),
    onionSkin: item.onionSkin === true,
    spriteFrames: (Array.isArray(item.spriteFrames) ? item.spriteFrames : []).slice(0, 10_000).map(/** 结构说明（自动提取）：map 回调；输入 frame；直接调用 Math.min、Math.max、finiteNumber；返回表达式求值结果。 */ frame => ({
      spriteAsset: typeof frame?.spriteAsset === 'string' ? frame.spriteAsset : null,
      duration: Math.min(3600, Math.max(1 / 1000, finiteNumber(frame?.duration, 1 / 12)))
    })),
    tracks: (Array.isArray(item.tracks) ? item.tracks : []).slice(0, 100).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 track；直接调用 TRACKS.has、sort、map、slice、Array.isArray。 */ track => {
      if (!track || !TRACKS.has(track.property as AnimatableProperty)) return []
      const keyframes = (Array.isArray(track.keyframes) ? track.keyframes : []).slice(0, 10_000).map(/** 结构说明（自动提取）：map 回调；输入 frame；直接调用 Math.max、finiteNumber、TANGENTS.has、EASINGS.has、INTERPOLATIONS.has；返回表达式求值结果。 */ frame => ({
        time: Math.max(0, finiteNumber(frame?.time)), value: finiteNumber(frame?.value),
        tangentMode: TANGENTS.has(frame?.tangentMode as KeyTangentMode) ? frame!.tangentMode as KeyTangentMode : 'Auto',
        inTangent: finiteNumber(frame?.inTangent), outTangent: finiteNumber(frame?.outTangent),
        easing: EASINGS.has(frame?.easing as KeyEasing) ? frame!.easing as KeyEasing : 'Linear',
        interpolation: INTERPOLATIONS.has(frame?.interpolation as AnimationInterpolation) ? frame!.interpolation as AnimationInterpolation : frame?.tangentMode === 'Constant' ? 'Step' : frame?.tangentMode === 'Linear' ? 'Linear' : 'Cubic'
      })).sort(/* 计算表达式 first.time - second.time 并返回结果，沿用操作数的原有类型规则。 */ (first, second) => first.time - second.time)
      return [{ property: track.property as AnimatableProperty, targetEntityUuid: typeof track.targetEntityUuid === 'string' ? track.targetEntityUuid : null, keyframes }]
    }),
    events: (Array.isArray(item.events) ? item.events : []).slice(0, 1000).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 event；直接调用 event.signal.trim、Math.max、finiteNumber、slice、event.payload.slice。 */ event => {
      if (!event || typeof event.signal !== 'string' || !event.signal.trim()) return []
      return [{ time: Math.max(0, finiteNumber(event.time)), signal: event.signal.trim().slice(0, 128), payload: typeof event.payload === 'string' ? event.payload.slice(0, 4096) : '' }]
    }).sort(/* 计算表达式 first.time - second.time 并返回结果，沿用操作数的原有类型规则。 */ (first, second) => first.time - second.time),
    markers: (Array.isArray(item.markers) ? item.markers : []).slice(0, 1000).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 marker；直接调用 marker.name.trim、Math.max、finiteNumber、slice；返回表达式求值结果。 */ marker => marker && typeof marker.name === 'string' && marker.name.trim()
      ? [{ time: Math.max(0, finiteNumber(marker.time)), name: marker.name.trim().slice(0, 128) }] : []).sort(/* 计算表达式 first.time - second.time 并返回结果，沿用操作数的原有类型规则。 */ (first, second) => first.time - second.time),
    commandTracks: (Array.isArray(item.commandTracks) ? item.commandTracks : []).slice(0, 256).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 track；直接调用 COMMAND_KINDS.has、sort、flatMap、slice、Array.isArray。 */ track => {
      if (!track || !COMMAND_KINDS.has(track.kind as AnimationCommandKind)) return []
      const commands = (Array.isArray(track.commands) ? track.commands : []).slice(0, 10_000).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 command；直接调用 command.value.trim、Math.max、finiteNumber、slice、command.payload.slice；返回表达式求值结果。 */ command => command && typeof command.value === 'string' && command.value.trim()
        ? [{ time: Math.max(0, finiteNumber(command.time)), value: command.value.trim().slice(0, 512), payload: typeof command.payload === 'string' ? command.payload.slice(0, 4096) : '' }] : []).sort(/* 计算表达式 first.time - second.time 并返回结果，沿用操作数的原有类型规则。 */ (first, second) => first.time - second.time)
      return [{ kind: track.kind as AnimationCommandKind, targetEntityUuid: typeof track.targetEntityUuid === 'string' ? track.targetEntityUuid : null, commands }]
    })
  }
}

/** 结构说明（自动提取）：normalizeAnimatorController；输入 source；直接调用 Set、map、slice、Array.isArray、states.push 等；写入 layer.synchronizedLayer；包含循环处理。 */ export function normalizeAnimatorController(source: unknown): AnimatorControllerDocument {
  const item = source && typeof source === 'object' ? source as Partial<AnimatorControllerDocument> : {}
  const usedStates = new Set<string>()
  const states = (Array.isArray(item.states) ? item.states : []).slice(0, 1000).map(/** 结构说明（自动提取）：map 回调；输入 state、index；直接调用 id、usedStates.has、usedStates.add、state.name.slice、Math.min 等；写入 stateId；包含循环处理。 */ (state, index) => {
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
        children: (Array.isArray(state.blendTree.children) ? state.blendTree.children : []).slice(0, 64).map(/** 结构说明（自动提取）：map 回调；输入 child；直接调用 finiteNumber、Math.min、Math.max；返回表达式求值结果。 */ child => ({
          clipAsset: typeof child?.clipAsset === 'string' ? child.clipAsset : null,
          threshold: finiteNumber(child?.threshold),
          positionX: finiteNumber(child?.positionX, finiteNumber(child?.threshold)), positionY: finiteNumber(child?.positionY),
          speed: Math.min(100, Math.max(-100, finiteNumber(child?.speed, 1)))
        })).sort(/* 计算表达式 first.threshold - second.threshold 并返回结果，沿用操作数的原有类型规则。 */ (first, second) => first.threshold - second.threshold)
      } : null
    }
  })
  if (!states.length) states.push(defaultAnimatorController().states[0])
  const usedParameters = new Set<string>()
  const parameters = (Array.isArray(item.parameters) ? item.parameters : []).slice(0, 256).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 parameter、index；直接调用 id、usedParameters.has、usedParameters.add、PARAMETER_TYPES.has、parameterValue。 */ (parameter, index) => {
    if (!parameter) return []
    const name = id(parameter.name, `parameter_${index + 1}`)
    if (usedParameters.has(name)) return []
    usedParameters.add(name)
    const type = PARAMETER_TYPES.has(parameter.type as AnimatorParameterType) ? parameter.type as AnimatorParameterType : 'Bool'
    return [{ name, type, defaultValue: parameterValue(parameter.defaultValue, type) }]
  })
  const transitions = (Array.isArray(item.transitions) ? item.transitions : []).slice(0, 2000).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 transition、index；直接调用 usedStates.has、String、id、Math.min、Math.max 等。 */ (transition, index) => {
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
      conditions: (Array.isArray(transition.conditions) ? transition.conditions : []).slice(0, 64).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 condition；直接调用 parameters.find、OPERATORS.has、parameterValue。 */ condition => {
        const parameter = parameters.find(/* 比较 candidate.name 与 condition?.parameter，返回严格相等的判断结果。 */ candidate => candidate.name === condition?.parameter)
        if (!parameter) return []
        const operator = OPERATORS.has(condition.operator as TransitionCondition['operator']) ? condition.operator as TransitionCondition['operator'] : '=='
        return [{ parameter: parameter.name, operator, value: parameterValue(condition.value, parameter.type) }]
      })
    }]
  })
  const layers = (Array.isArray(item.layers) ? item.layers : []).slice(0, 32).map(/** 结构说明（自动提取）：map 回调；输入 layer、index；直接调用 id、layer.name.slice、usedStates.has、String、Math.min 等；返回表达式求值结果。 */ (layer, index) => ({
    id: id(layer?.id, index ? `layer_${index + 1}` : 'base'), name: typeof layer?.name === 'string' ? layer.name.slice(0, 80) : `Layer ${index + 1}`,
    defaultState: usedStates.has(String(layer?.defaultState)) ? String(layer?.defaultState) : states[0].id,
    weight: Math.min(1, Math.max(0, finiteNumber(layer?.weight, index ? 0 : 1))), additive: layer?.additive === true,
    maskAsset: typeof layer?.maskAsset === 'string' ? layer.maskAsset : null,
    synchronizedLayer: typeof layer?.synchronizedLayer === 'string' && String(layer.synchronizedLayer) !== String(layer?.id) ? id(layer.synchronizedLayer, '') || null : null,
    synchronizedTiming: layer?.synchronizedTiming === true
  }))
  if (!layers.length) layers.push({ id: 'base', name: 'Base', defaultState: usedStates.has(String(item.defaultState)) ? String(item.defaultState) : states[0].id, weight: 1, additive: false, maskAsset: null, synchronizedLayer: null, synchronizedTiming: false })
  const layerIds = new Set(layers.map(/* 返回 layer.id 的当前值。 */ layer => layer.id))
  for (const layer of layers) if (layer.synchronizedLayer && !layerIds.has(layer.synchronizedLayer)) layer.synchronizedLayer = null
  return {
    version: 3, name: typeof item.name === 'string' ? item.name.slice(0, 120) : 'Animator Controller',
    defaultState: usedStates.has(String(item.defaultState)) ? String(item.defaultState) : states[0].id,
    parameters, states, transitions, layers
  }
}

/** 结构说明（自动提取）：normalizeAnimationMask；输入 source；直接调用 filter、Array.isArray、item.name.slice、Set。 */ export function normalizeAnimationMask(source: unknown): AnimationMaskDocument {
  const item = source && typeof source === 'object' ? source as Partial<AnimationMaskDocument> : {}
  const properties = (Array.isArray(item.properties) ? item.properties : []).filter(/* 调用 TRACKS.has(value as AnimatableProperty) 并返回调用结果。 */ (value): value is AnimatableProperty => TRACKS.has(value as AnimatableProperty))
  return { version: 1, name: typeof item.name === 'string' ? item.name.slice(0, 120) : 'Animation Mask', properties: [...new Set(properties)] }
}

/** 结构说明（自动提取）：animationClipLength；输入 clip；直接调用 clip.spriteFrames.reduce、clip.tracks.reduce、clip.markers.reduce、clip.commandTracks.reduce、clip.events.reduce 等。 */ export function animationClipLength(clip: AnimationClipDocument): number {
  const sprite = clip.spriteFrames.reduce(/* 计算表达式 sum + frame.duration 并返回结果，沿用操作数的原有类型规则。 */ (sum, frame) => sum + frame.duration, 0)
  const tracks = clip.tracks.reduce(/* 调用 Math.max(maximum, track.keyframes[track.keyframes.length - 1]?.time ?? 0) 并返回调用结果。 */ (maximum, track) => Math.max(maximum, track.keyframes[track.keyframes.length - 1]?.time ?? 0), 0)
  const markers = clip.markers.reduce(/* 调用 Math.max(maximum, marker.time) 并返回调用结果。 */ (maximum, marker) => Math.max(maximum, marker.time), 0)
  const commands = clip.commandTracks.reduce(/* 调用 Math.max(maximum, track.commands[track.commands.length - 1]?.time ?? 0) 并返回调用结果。 */ (maximum, track) => Math.max(maximum, track.commands[track.commands.length - 1]?.time ?? 0), 0)
  const events = clip.events.reduce(/* 调用 Math.max(maximum, event.time) 并返回调用结果。 */ (maximum, event) => Math.max(maximum, event.time), 0)
  return Math.max(sprite, tracks, markers, commands, events, 1 / clip.frameRate)
}

/** 结构说明（自动提取）：easeRatio；输入 ratio、easing；直接调用 Math.pow；返回路径包含 ratio。 */ function easeRatio(ratio: number, easing: KeyEasing | undefined): number {
  if (easing === 'EaseIn') return ratio * ratio
  if (easing === 'EaseOut') return 1 - (1 - ratio) * (1 - ratio)
  if (easing === 'EaseInOut') return ratio < .5 ? 2 * ratio * ratio : 1 - Math.pow(-2 * ratio + 2, 2) / 2
  return ratio
}

/** 结构说明（自动提取）：sampleAnimationTrack；输入 keyframes、time；直接调用 Number.isFinite、Math.max、easeRatio；写入 low、high；返回路径包含 keyframes[…].value、last.value、previous.value；包含循环处理。 */ export function sampleAnimationTrack(keyframes: AnimationKeyframe[], time: number): number | null {
  if(!keyframes.length||!Number.isFinite(time))return null
  if(time<=keyframes[0].time)return keyframes[0].value
  const last=keyframes[keyframes.length-1];if(time>=last.time)return last.value
  let low=1,high=keyframes.length-1
  while(low<high){const middle=(low+high)>>>1;if(keyframes[middle].time<=time)low=middle+1;else high=middle}
  const index=low,next=keyframes[index],previous=keyframes[index-1],range=Math.max(1e-9,next.time-previous.time),ratio=easeRatio((time-previous.time)/range,previous.easing)
  const interpolation=previous.interpolation??(previous.tangentMode==='Constant'?'Step':previous.tangentMode==='Linear'?'Linear':'Cubic')
  if(interpolation==='Step')return previous.value
  if(interpolation==='Linear')return previous.value+(next.value-previous.value)*ratio
  const slope=(next.value-previous.value)/range,left=keyframes[index-2]??previous,right=keyframes[index+1]??next
  const outgoing=previous.tangentMode==='Free'?previous.outTangent:previous.tangentMode==='Constant'?0:previous.tangentMode==='Auto'?(next.value-left.value)/Math.max(1e-9,next.time-left.time):slope
  const incoming=next.tangentMode==='Free'?next.inTangent:next.tangentMode==='Constant'?0:next.tangentMode==='Auto'?(right.value-previous.value)/Math.max(1e-9,right.time-previous.time):slope
  const m0=outgoing*range,m1=incoming*range,ratio2=ratio*ratio,ratio3=ratio2*ratio
  return (2*ratio3-3*ratio2+1)*previous.value+(ratio3-2*ratio2+ratio)*m0+(-2*ratio3+3*ratio2)*next.value+(ratio3-ratio2)*m1
}

export interface AnimationRootMotionDelta {x:number;y:number;rotation:number}
/** Extract local root displacement, including whole loop traversals; does not redefine Apply. */
/** 结构说明（自动提取）：animationRootMotionDelta；输入 clip、previous、next；直接调用 Number.isFinite、Error、animationClipLength、value；包含显式抛错路径。 */ export function animationRootMotionDelta(clip:AnimationClipDocument,previous:number,next:number):AnimationRootMotionDelta{
  if(!Number.isFinite(previous)||!Number.isFinite(next))throw new Error('ANIMATION_TIME: Root motion requires finite sample times.')
  const length=animationClipLength(clip),value=/** 结构说明（自动提取）：value；输入 property、time；直接调用 clip.tracks.find、sampleAnimationTrack、Math.max、Math.min、Math.floor。 */ (property:AnimatableProperty,time:number)=>{const track=clip.tracks.find(/* 先计算 !track.targetEntityUuid；仅当其为真值时求右侧 track.property===property，返回短路求值结果。 */ track=>!track.targetEntityUuid&&track.property===property);if(!track)return 0
    if(!clip.loop)return sampleAnimationTrack(track.keyframes,Math.max(0,Math.min(length,time)))??0
    const cycle=Math.floor(time/length),local=((time%length)+length)%length,start=sampleAnimationTrack(track.keyframes,0)??0,end=sampleAnimationTrack(track.keyframes,length)??0
    return (sampleAnimationTrack(track.keyframes,local)??0)+cycle*(end-start)
  }
  return {x:value('Transform.position.x',next)-value('Transform.position.x',previous),y:value('Transform.position.y',next)-value('Transform.position.y',previous),rotation:value('Transform.rotation',next)-value('Transform.rotation',previous)}
}

/** Samples the exact runtime interpolation used by animation playback and reports cumulative root travel. */
/** 结构说明（自动提取）：previewRootMotion；输入 clipValue、sampleRate；直接调用 normalizeAnimationClip、animationClipLength、Math.min、Math.max、Math.round 等；写入 distance、previous；包含循环处理；包含显式抛错路径。 */ export function previewRootMotion(clipValue: AnimationClipDocument, sampleRate = 60): RootMotionPreview {
  const clip = normalizeAnimationClip(clipValue), duration = animationClipLength(clip), rate = Math.min(240, Math.max(1, Math.round(finiteNumber(sampleRate, clip.frameRate))))
  const tracks = new Map(clip.tracks.filter(/** 结构说明（自动提取）：clip.tracks.filter 回调；输入 track；直接调用 includes；返回表达式求值结果。 */ track => !track.targetEntityUuid && ['Transform.position.x', 'Transform.position.y', 'Transform.rotation'].includes(track.property)).map(/* 返回按声明顺序构造的数组 [track.property, track]。 */ track => [track.property, track]))
  const samples=Math.max(2,Math.ceil(duration*rate)+1)
  if(samples>100000)throw new Error('ANIMATION_PREVIEW_LIMIT: Root-motion preview exceeds 100,000 samples; reduce sample rate or slice the clip.')
  const point=/** 结构说明（自动提取）：point；输入 time；直接调用 sampleAnimationTrack、tracks.get；返回表达式求值结果。 */ (time:number)=>({x:sampleAnimationTrack(tracks.get('Transform.position.x')?.keyframes??[],time)??0,y:sampleAnimationTrack(tracks.get('Transform.position.y')?.keyframes??[],time)??0,rotation:sampleAnimationTrack(tracks.get('Transform.rotation')?.keyframes??[],time)??0})
  const first=point(0);let previous=first,distance=0
  for(let index=1;index<samples;index++){const next=point(duration*index/(samples-1));distance+=Math.hypot(next.x-previous.x,next.y-previous.y);previous=next}
  return {duration,delta:{x:previous.x-first.x,y:previous.y-first.y,rotation:previous.rotation-first.rotation},distance,samples}
}

/** 结构说明（自动提取）：reduceAnimationKeys；输入 keyframes、tolerance；直接调用 Math.min、Math.max、finiteNumber、keyframes.map、result.push 等；返回路径包含 result；包含循环处理。 */ export function reduceAnimationKeys(keyframes: AnimationKeyframe[], tolerance = .0001): AnimationKeyframe[] {
  const safeTolerance = Math.min(1e9, Math.max(0, finiteNumber(tolerance, .0001)))
  if (keyframes.length < 3) return keyframes.map(/** 构造并返回记录 { ...key }，字段按当前实参及捕获状态求值。 */ key => ({ ...key }))
  const result: AnimationKeyframe[] = [{ ...keyframes[0] }]
  for (let index = 1; index < keyframes.length - 1; index++) {
    const previous = result[result.length - 1], current = keyframes[index], next = keyframes[index + 1]
    if ((previous.interpolation ?? (previous.tangentMode==='Linear'?'Linear':'Cubic')) !== 'Linear' || (current.interpolation ?? (current.tangentMode==='Linear'?'Linear':'Cubic')) !== 'Linear' || previous.easing && previous.easing !== 'Linear' || current.easing && current.easing !== 'Linear' || previous.tangentMode === 'Free' || current.tangentMode === 'Free') { result.push({ ...current }); continue }
    const ratio = (current.time - previous.time) / Math.max(1e-9, next.time - previous.time), expected = previous.value + (next.value - previous.value) * ratio
    if (Math.abs(current.value - expected) > safeTolerance) result.push({ ...current })
  }
  result.push({ ...keyframes[keyframes.length - 1] }); return result
}

/** Preserves Step/Linear segments exactly; curved cut segments use bounded adaptive linear baking (1e-6 absolute value error at probes). */
/** 结构说明（自动提取）：bakeAnimationRange；输入 keys、from、to、cuts；直接调用 sort、Set、filter、keys.map、cuts.filter 等；写入 lo、hi；返回路径包含 output；包含循环处理。 */ function bakeAnimationRange(keys:AnimationKeyframe[],from:number,to:number,cuts:number[]=[]):AnimationKeyframe[]{
  if(!keys.length)return []
  const points=[...new Set([from,to,...keys.map(/* 返回 key.time 的当前值。 */ key=>key.time).filter(/* 先计算 time>from；仅当其为真值时求右侧 time<to，返回短路求值结果。 */ time=>time>from&&time<to),...cuts.filter(/* 先计算 time>from；仅当其为真值时求右侧 time<to，返回短路求值结果。 */ time=>time>from&&time<to)])].sort(/* 计算表达式 a-b 并返回结果，沿用操作数的原有类型规则。 */ (a,b)=>a-b),output:AnimationKeyframe[]=[]
  const key=/** 构造并返回记录 {time,value,tangentMode:interpolation==='Step'?'Constant':'Linear',inTangent:0,outTangent:0,easing:'Linear',interpolation}，字段按当前实参及捕获状态求值。 */ (time:number,value:number,interpolation:AnimationInterpolation='Linear'):AnimationKeyframe=>({time,value,tangentMode:interpolation==='Step'?'Constant':'Linear',inTangent:0,outTangent:0,easing:'Linear',interpolation})
  const push=/** 结构说明（自动提取）：push；输入 value；直接调用 Error、output.at、output.push；写入 output[…]；包含显式抛错路径。 */ (value:AnimationKeyframe)=>{if(output.length>=10000)throw new Error('ANIMATION_EDIT_LIMIT: Curve-preserving edit exceeds 10,000 keys per track.');if(output.at(-1)?.time!==value.time)output.push(value);else output[output.length-1]=value}
  const subdivide=/** 结构说明（自动提取）：subdivide；输入 start、end、a、b、depth；直接调用 Math.max、probes.map、push、key、Error 等；包含显式抛错路径。 */ (start:number,end:number,a:number,b:number,depth:number)=>{const probes=[.25,.5,.75],error=Math.max(...probes.map(/* 调用 Math.abs((sampleAnimationTrack(keys,start+(end-start)*ratio)??0)-(a+(b-a)*ratio)) 并返回调用结果。 */ ratio=>Math.abs((sampleAnimationTrack(keys,start+(end-start)*ratio)??0)-(a+(b-a)*ratio))));if(error<=1e-6){push(key(start,a));return}if(depth>=24)throw new Error('ANIMATION_EDIT_PRECISION: Curve cannot be preserved within the edit sampling budget.');const middle=(start+end)/2,value=sampleAnimationTrack(keys,middle)??0;subdivide(start,middle,a,value,depth+1);subdivide(middle,end,value,b,depth+1)}
  for(let index=0;index+1<points.length;index++){const start=points[index],end=points[index+1];let lo=0,hi=keys.length;while(lo<hi){const mid=(lo+hi)>>>1;if(keys[mid].time<=start)lo=mid+1;else hi=mid}const left=keys[lo-1],step=left&&(left.interpolation==='Step'||!left.interpolation&&left.tangentMode==='Constant');if(step)push(key(start,sampleAnimationTrack(keys,start)??0,'Step'));else subdivide(start,end,sampleAnimationTrack(keys,start)??0,sampleAnimationTrack(keys,end)??0,0)}
  push(key(to,sampleAnimationTrack(keys,to)??0));return output
}

/** 结构说明（自动提取）：retimeAnimationClip；输入 clip、start、end、timeScale、ripple；直接调用 every、Error、normalizeAnimationClip、Math.max、Math.min 等；写入 value.spriteFrames；返回路径包含 value；包含显式抛错路径。 */ export function retimeAnimationClip(clip: AnimationClipDocument, start: number, end: number, timeScale: number, ripple = true): AnimationClipDocument {
  if(![start,end,timeScale].every(Number.isFinite))throw new Error('ANIMATION_RETIME: Range and scale must be finite.')
  const value = normalizeAnimationClip(clip), from = Math.max(0, Math.min(start, end)), to = Math.max(from, Math.max(start, end)), scale = Math.min(1_000, Math.max(.001, finiteNumber(timeScale, 1))), oldRange = to - from, delta = oldRange * (scale - 1)
  if(scale===1)return value
  const retime = /* 根据 time < from 的真假，分别返回 time 或 time <= to ? from + (time - from) * scale : ripple ? time + delta : time。 */ (time: number) => time < from ? time : time <= to ? from + (time - from) * scale : ripple ? time + delta : time
  value.tracks.forEach(/** 结构说明（自动提取）：value.tracks.forEach 回调；输入 track；直接调用 track.keyframes.at、map、bakeAnimationRange、Math.min；写入 track.keyframes。 */ track=>{if(!track.keyframes.length)return;const last=track.keyframes.at(-1)!.time;track.keyframes=bakeAnimationRange(track.keyframes,Math.min(0,track.keyframes[0].time),last,[from,to]).map(/** 构造并返回记录 {...key,time:retime(key.time)}，字段按当前实参及捕获状态求值。 */ key=>({...key,time:retime(key.time)}))})
  let spriteTime=0;value.spriteFrames=value.spriteFrames.map(/** 结构说明（自动提取）：value.spriteFrames.map 回调；输入 frame；直接调用 Math.max、retime；写入 spriteTime。 */ frame=>{const start=spriteTime;spriteTime+=frame.duration;return {...frame,duration:Math.max(.001,retime(spriteTime)-retime(start))}})
  value.events.forEach(/** 将 retime(event.time) 赋给 event.time，不显式返回值。 */ event => { event.time = retime(event.time) }); value.markers.forEach(/** 将 retime(marker.time) 赋给 marker.time，不显式返回值。 */ marker => { marker.time = retime(marker.time) })
  value.commandTracks.forEach(/* 调用 track.commands.forEach(command => { command.time = retime(command.time) }) 并返回调用结果。 */ track => track.commands.forEach(/** 将 retime(command.time) 赋给 command.time，不显式返回值。 */ command => { command.time = retime(command.time) }))
  return normalizeAnimationClip(value)
}

/** 结构说明（自动提取）：sliceAnimationClip；输入 clip、start、end、name；直接调用 every、Error、Math.max、Math.min、normalizeAnimationClip 等；写入 value.name、value.events、value.markers、cursor 等；包含循环处理；包含显式抛错路径。 */ export function sliceAnimationClip(clip: AnimationClipDocument, start: number, end: number, name = `${clip.name} Slice`): AnimationClipDocument {
  if(![start,end].every(Number.isFinite))throw new Error('ANIMATION_SLICE: Range must be finite.')
  const from = Math.max(0, Math.min(start, end)), to = Math.max(from + 1e-6, Math.max(start, end)), value = normalizeAnimationClip(clip)
  value.name = name.slice(0, 120)
  value.tracks.forEach(/** 将 bakeAnimationRange(track.keyframes,from,to).map(key=>({...key,time:key.time-from})) 赋给 track.keyframes，不显式返回值。 */ track => { track.keyframes = bakeAnimationRange(track.keyframes,from,to).map(/** 构造并返回记录 {...key,time:key.time-from}，字段按当前实参及捕获状态求值。 */ key=>({...key,time:key.time-from})) })
  value.events = value.events.filter(/* 先计算 event.time >= from；仅当其为真值时求右侧 event.time <= to，返回短路求值结果。 */ event => event.time >= from && event.time <= to).map(/** 构造并返回记录 { ...event, time: event.time - from }，字段按当前实参及捕获状态求值。 */ event => ({ ...event, time: event.time - from }))
  value.markers = value.markers.filter(/* 先计算 marker.time >= from；仅当其为真值时求右侧 marker.time <= to，返回短路求值结果。 */ marker => marker.time >= from && marker.time <= to).map(/** 构造并返回记录 { ...marker, time: marker.time - from }，字段按当前实参及捕获状态求值。 */ marker => ({ ...marker, time: marker.time - from }))
  value.commandTracks.forEach(/** 结构说明（自动提取）：value.commandTracks.forEach 回调；输入 track；直接调用 map、track.commands.filter；写入 track.commands。 */ track => { track.commands = track.commands.filter(/* 先计算 command.time >= from；仅当其为真值时求右侧 command.time <= to，返回短路求值结果。 */ command => command.time >= from && command.time <= to).map(/** 构造并返回记录 { ...command, time: command.time - from }，字段按当前实参及捕获状态求值。 */ command => ({ ...command, time: command.time - from })) })
  const spriteFrames: SpriteAnimationFrame[] = []; let cursor = 0
  for (const frame of value.spriteFrames) { const frameEnd = cursor + frame.duration, overlap = Math.max(0, Math.min(to, frameEnd) - Math.max(from, cursor)); if (overlap > 0) spriteFrames.push({ ...frame, duration: overlap }); cursor = frameEnd }
  value.spriteFrames = spriteFrames
  return normalizeAnimationClip(value)
}

interface TimedOccurrence<T> { item: T; crossed: number; itemIndex: number }
/** 结构说明（自动提取）：timedOccurrences；输入 items、previous、rawNext、length、loop；直接调用 Math.min、Math.max、sort、filter、items.map 等；包含循环处理。 */ function timedOccurrences<T extends { time: number }>(items: T[], previous: number, rawNext: number, length: number, loop: boolean): TimedOccurrence<T>[] {
  if (!items.length || length <= 0 || rawNext === previous) return []
  const result: TimedOccurrence<T>[] = [], forward = rawNext > previous, lower = Math.min(previous, rawNext), upper = Math.max(previous, rawNext)
  if (!loop) return items.map(/** 构造并返回记录 { item, itemIndex, crossed: item.time }，字段按当前实参及捕获状态求值。 */ (item, itemIndex) => ({ item, itemIndex, crossed: item.time })).filter(/* 根据 forward 的真假，分别返回 entry.crossed > lower && entry.crossed <= upper 或 entry.crossed >= lower && entry.crossed < upper。 */ entry => forward ? entry.crossed > lower && entry.crossed <= upper : entry.crossed >= lower && entry.crossed < upper).sort(/* 根据 forward 的真假，分别返回 a.crossed - b.crossed || a.itemIndex - b.itemIndex 或 b.crossed - a.crossed || b.itemIndex - a.itemIndex。 */ (a, b) => forward ? a.crossed - b.crossed || a.itemIndex - b.itemIndex : b.crossed - a.crossed || b.itemIndex - a.itemIndex)
  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const item = items[itemIndex]
    const firstCycle = Math.ceil((lower - item.time) / length), lastCycle = Math.floor((upper - item.time) / length)
    for (let cycle = firstCycle; cycle <= lastCycle && result.length < 10_000; cycle++) {
      const crossed = item.time + cycle * length
      if (forward ? crossed > previous && crossed <= rawNext : crossed >= rawNext && crossed < previous) result.push({ item, crossed, itemIndex })
    }
  }
  return result.sort(/* 根据 forward 的真假，分别返回 a.crossed - b.crossed || a.itemIndex - b.itemIndex 或 b.crossed - a.crossed || b.itemIndex - a.itemIndex。 */ (a, b) => forward ? a.crossed - b.crossed || a.itemIndex - b.itemIndex : b.crossed - a.crossed || b.itemIndex - a.itemIndex)
}

/** 结构说明（自动提取）：occurrences；输入 items、previous、rawNext、length、loop；直接调用 map、timedOccurrences。 */ function occurrences<T extends { time: number }>(items: T[], previous: number, rawNext: number, length: number, loop: boolean): T[] {
  return timedOccurrences(items, previous, rawNext, length, loop).map(/* 返回 entry.item 的当前值。 */ entry => entry.item)
}

/* 调用 occurrences(clip.events, previous, rawNext, animationClipLength(clip), clip.loop) 并返回调用结果。 */ export function animationEventsBetween(clip: AnimationClipDocument, previous: number, rawNext: number): AnimationEvent[] { return occurrences(clip.events, previous, rawNext, animationClipLength(clip), clip.loop) }
/* 调用 occurrences(track.commands, previous, rawNext, animationClipLength(clip), clip.loop) 并返回调用结果。 */ export function animationCommandsBetween(track: AnimationCommandTrack, clip: AnimationClipDocument, previous: number, rawNext: number): AnimationCommand[] { return occurrences(track.commands, previous, rawNext, animationClipLength(clip), clip.loop) }
export type AnimationDispatch = { kind: 'event'; event: AnimationEvent; crossed: number; order: number } | { kind: 'command'; track: AnimationCommandTrack; command: AnimationCommand; crossed: number; order: number }
/** 结构说明（自动提取）：animationDispatchesBetween；输入 clip、previous、rawNext；直接调用 animationClipLength、forEach、timedOccurrences、clip.commandTracks.forEach、result.sort。 */ export function animationDispatchesBetween(clip: AnimationClipDocument, previous: number, rawNext: number): AnimationDispatch[] {
  const length = animationClipLength(clip), forward = rawNext >= previous, result: AnimationDispatch[] = []
  timedOccurrences(clip.events, previous, rawNext, length, clip.loop).forEach(/* 调用 result.push({ kind: 'event', event: entry.item, crossed: entry.crossed, order: entry.itemIndex }) 并返回调用结果。 */ entry => result.push({ kind: 'event', event: entry.item, crossed: entry.crossed, order: entry.itemIndex }))
  clip.commandTracks.forEach(/** 结构说明（自动提取）：clip.commandTracks.forEach 回调；输入 track、trackIndex；直接调用 forEach、timedOccurrences；返回表达式求值结果。 */ (track, trackIndex) => timedOccurrences(track.commands, previous, rawNext, length, clip.loop).forEach(/** 结构说明（自动提取）：forEach 回调；输入 entry；直接调用 result.push；返回表达式求值结果。 */ entry => result.push({ kind: 'command', track, command: entry.item, crossed: entry.crossed, order: 1_000_000 + trackIndex * 10_000 + entry.itemIndex })))
  return result.sort(/** 结构说明（自动提取）：result.sort 回调；输入 first、second；返回表达式求值结果。 */ (first, second) => forward ? first.crossed - second.crossed || first.order - second.order : second.crossed - first.crossed || second.order - first.order)
}

/** 结构说明（自动提取）：conditionMatches；输入 value、condition；直接调用 Number。 */ export function conditionMatches(value: AnimatorParameterValue, condition: TransitionCondition): boolean {
  if (condition.operator === 'trigger') return value === true
  if (condition.operator === '==') return value === condition.value
  if (condition.operator === '!=') return value !== condition.value
  const left = Number(value); const right = Number(condition.value)
  if (condition.operator === '>') return left > right
  if (condition.operator === '<') return left < right
  if (condition.operator === '>=') return left >= right
  return left <= right
}
