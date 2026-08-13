import { assetReference, assetState, createTextAsset, readTextAsset, resolveAsset, updateTextAsset } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import { finiteNumber } from '../world/geometry'
import type { Entity } from '../world/Entity'
import type { Animator, AnimatorParameterValue } from '../world/components'

export type AnimatableProperty = 'Transform.position.x' | 'Transform.position.y' | 'Transform.rotation' | 'Transform.scale.x' | 'Transform.scale.y' | 'SpriteRenderer.opacity' | 'UI.opacity'
export type AnimatorParameterType = 'Bool' | 'Float' | 'Integer' | 'Trigger'
export type KeyTangentMode = 'Auto' | 'Linear' | 'Constant' | 'Free'

export interface AnimationKeyframe { time: number; value: number; tangentMode: KeyTangentMode; inTangent: number; outTangent: number }
export interface AnimationTrack { property: AnimatableProperty; targetEntityUuid: string | null; keyframes: AnimationKeyframe[] }
export interface SpriteAnimationFrame { spriteAsset: string | null; duration: number }
export interface AnimationEvent { time: number; signal: string; payload: string }
export interface AnimationClipDocument {
  version: 3
  name: string
  loop: boolean
  frameRate: number
  spriteFrames: SpriteAnimationFrame[]
  tracks: AnimationTrack[]
  events: AnimationEvent[]
}
export interface AnimatorParameter { name: string; type: AnimatorParameterType; defaultValue: AnimatorParameterValue }
export interface BlendTreeChild { clipAsset: string | null; threshold: number; speed: number }
export interface BlendTree1D { parameter: string; children: BlendTreeChild[] }
export interface AnimatorState { id: string; name: string; clipAsset: string | null; speed: number; x: number; y: number; subgraph: string; blendTree: BlendTree1D | null }
export interface TransitionCondition { parameter: string; operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'trigger'; value: AnimatorParameterValue }
export type TransitionInterruption = 'None' | 'Source' | 'Destination' | 'SourceThenDestination'
export interface AnimatorTransition { id: string; from: string; to: string; hasExitTime: boolean; exitTime: number; duration: number; interruption: TransitionInterruption; conditions: TransitionCondition[] }
export interface AnimatorLayer { id: string; name: string; defaultState: string; weight: number; additive: boolean; maskAsset: string | null }
export interface AnimatorControllerDocument {
  version: 2
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
const INTERRUPTIONS = new Set<TransitionInterruption>(['None', 'Source', 'Destination', 'SourceThenDestination'])

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
  return { version: 3, name, loop: true, frameRate: 12, spriteFrames: [], tracks: [], events: [] }
}

export function defaultAnimatorController(name = 'New Controller'): AnimatorControllerDocument {
  const stateId = 'idle'
  return {
    version: 2, name, defaultState: stateId, parameters: [], transitions: [],
    states: [{ id: stateId, name: 'Idle', clipAsset: null, speed: 1, x: 80, y: 80, subgraph: 'Base', blendTree: null }],
    layers: [{ id: 'base', name: 'Base', defaultState: stateId, weight: 1, additive: false, maskAsset: null }]
  }
}

export function defaultAnimationMask(name = 'New Animation Mask'): AnimationMaskDocument { return { version: 1, name, properties: [...TRACKS] } }

export function normalizeAnimationClip(source: unknown): AnimationClipDocument {
  const item = source && typeof source === 'object' ? source as Partial<AnimationClipDocument> : {}
  return {
    version: 3,
    name: typeof item.name === 'string' ? item.name.slice(0, 120) : 'Animation',
    loop: item.loop !== false,
    frameRate: Math.min(240, Math.max(1, finiteNumber(item.frameRate, 12))),
    spriteFrames: (Array.isArray(item.spriteFrames) ? item.spriteFrames : []).slice(0, 10_000).map(frame => ({
      spriteAsset: typeof frame?.spriteAsset === 'string' ? frame.spriteAsset : null,
      duration: Math.min(3600, Math.max(1 / 1000, finiteNumber(frame?.duration, 1 / 12)))
    })),
    tracks: (Array.isArray(item.tracks) ? item.tracks : []).slice(0, 100).flatMap(track => {
      if (!track || !TRACKS.has(track.property as AnimatableProperty)) return []
      const keyframes = (Array.isArray(track.keyframes) ? track.keyframes : []).slice(0, 10_000).map(frame => ({
        time: Math.max(0, finiteNumber(frame?.time)), value: finiteNumber(frame?.value),
        tangentMode: TANGENTS.has(frame?.tangentMode as KeyTangentMode) ? frame!.tangentMode as KeyTangentMode : 'Auto',
        inTangent: finiteNumber(frame?.inTangent), outTangent: finiteNumber(frame?.outTangent)
      })).sort((first, second) => first.time - second.time)
      return [{ property: track.property as AnimatableProperty, targetEntityUuid: typeof track.targetEntityUuid === 'string' ? track.targetEntityUuid : null, keyframes }]
    }),
    events: (Array.isArray(item.events) ? item.events : []).slice(0, 1000).flatMap(event => {
      if (!event || typeof event.signal !== 'string' || !event.signal.trim()) return []
      return [{ time: Math.max(0, finiteNumber(event.time)), signal: event.signal.trim().slice(0, 128), payload: typeof event.payload === 'string' ? event.payload.slice(0, 4096) : '' }]
    }).sort((first, second) => first.time - second.time)
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
      x: finiteNumber(state?.x, 80 + index * 180), y: finiteNumber(state?.y, 80),
      subgraph: typeof state?.subgraph === 'string' ? state.subgraph.slice(0, 80) : 'Base',
      blendTree: state?.blendTree && typeof state.blendTree === 'object' ? {
        parameter: id(state.blendTree.parameter, ''),
        children: (Array.isArray(state.blendTree.children) ? state.blendTree.children : []).slice(0, 64).map(child => ({
          clipAsset: typeof child?.clipAsset === 'string' ? child.clipAsset : null,
          threshold: finiteNumber(child?.threshold), speed: Math.min(100, Math.max(-100, finiteNumber(child?.speed, 1)))
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
    maskAsset: typeof layer?.maskAsset === 'string' ? layer.maskAsset : null
  }))
  if (!layers.length) layers.push({ id: 'base', name: 'Base', defaultState: usedStates.has(String(item.defaultState)) ? String(item.defaultState) : states[0].id, weight: 1, additive: false, maskAsset: null })
  return {
    version: 2, name: typeof item.name === 'string' ? item.name.slice(0, 120) : 'Animator Controller',
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
      if (value !== null) keyframes.push({ time, value, tangentMode: 'Linear', inTangent: 0, outTangent: 0 })
    }
    return { property, targetEntityUuid: track.targetEntityUuid, keyframes }
  })
  const imported = normalizeAnimationClip({
    ...source, name: asset.name.replace(/\.nova-anim$/i, ''), frameRate: sampleRate, tracks,
    events: source.events.map(event => ({ ...event })), spriteFrames: source.spriteFrames.map(frame => ({ ...frame }))
  })
  settings.sourceFrameRate = source.frameRate
  settings.sampleRate = sampleRate
  settings.lastImportedAt = Date.now()
  return updateTextAsset(asset.uuid, JSON.stringify(imported, null, 2)) ? imported : null
}

export function animationClipLength(clip: AnimationClipDocument): number {
  const sprite = clip.spriteFrames.reduce((sum, frame) => sum + frame.duration, 0)
  const tracks = clip.tracks.reduce((maximum, track) => Math.max(maximum, track.keyframes[track.keyframes.length - 1]?.time ?? 0), 0)
  return Math.max(sprite, tracks, 1 / clip.frameRate)
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
    const ratio = (time - previous.time) / range
    if (previous.tangentMode === 'Constant') return previous.value
    if (previous.tangentMode === 'Linear' || next.tangentMode === 'Linear') return previous.value + (next.value - previous.value) * ratio
    const slope = (next.value - previous.value) / range
    const m0 = (previous.tangentMode === 'Free' ? previous.outTangent : slope) * range
    const m1 = (next.tangentMode === 'Free' ? next.inTangent : slope) * range
    const ratio2 = ratio * ratio, ratio3 = ratio2 * ratio
    return (2 * ratio3 - 3 * ratio2 + 1) * previous.value + (ratio3 - 2 * ratio2 + ratio) * m0 + (-2 * ratio3 + 3 * ratio2) * next.value + (ratio3 - ratio2) * m1
  }
  return last.value
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

class AnimationRuntime {
  private runtime = new Map<string, AnimatorRuntimeState>()
  onEvent: ((entity: Entity, event: AnimationEvent) => void) | null = null

  reset(): void { this.runtime.clear() }

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
          layerState.previousStateId = layerState.stateId; layerState.previousTime = layerState.time
          layerState.stateId = transition.to; layerState.time = 0; layerState.blendTime = 0; layerState.blendDuration = transition.duration
          activeState = controller.states.find(candidate => candidate.id === transition.to) ?? activeState
        }
        const clip = this.stateClip(activeState, animator)
        const length = clip ? animationClipLength(clip) : 0
        const previousTime = layerState.time
        const scaledDelta = Math.max(0, delta) * animator.speed * activeState.speed
        layerState.time += scaledDelta
        if (clip && length > 0) {
          if (clip.loop) layerState.time = ((layerState.time % length) + length) % length
          else layerState.time = Math.min(length, Math.max(0, layerState.time))
          this.emitEvents(entity, clip, previousTime, layerState.time)
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
          this.applySample(entity, entities, sampled, weight, layer.additive, mask ? new Set(mask.properties) : null)
        }
        if (layerIndex === 0) animator.currentState = activeState.id
      })
    }
  }

  private stateClip(state: AnimatorState, animator: Animator): AnimationClipDocument | null {
    if (!state.blendTree?.children.length) return readAnimationClip(state.clipAsset)
    const value = Number(animator.parameters[state.blendTree.parameter] ?? 0)
    const nearest = [...state.blendTree.children].sort((first, second) => Math.abs(first.threshold - value) - Math.abs(second.threshold - value))[0]
    return readAnimationClip(nearest?.clipAsset ?? state.clipAsset)
  }

  private sampleState(state: AnimatorState, animator: Animator, time: number, previous = false): SampledClip {
    const tree = state.blendTree
    if (!tree?.children.length) return this.sampleClip(readAnimationClip(state.clipAsset), time)
    const parameter = Number(animator.parameters[tree.parameter] ?? 0)
    const children = tree.children
    let upperIndex = children.findIndex(child => child.threshold >= parameter)
    if (upperIndex < 0) upperIndex = children.length - 1
    const lowerIndex = Math.max(0, upperIndex - 1)
    const lower = children[lowerIndex], upper = children[upperIndex]
    if (!upper || lower === upper) return this.sampleClip(readAnimationClip(lower?.clipAsset ?? null), time * (lower?.speed ?? 1))
    const ratio = Math.min(1, Math.max(0, (parameter - lower.threshold) / Math.max(1e-9, upper.threshold - lower.threshold)))
    return this.blendSamples(this.sampleClip(readAnimationClip(lower.clipAsset), time * lower.speed), this.sampleClip(readAnimationClip(upper.clipAsset), time * upper.speed), previous ? Math.min(.999, ratio) : ratio)
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

  private applySample(owner: Entity, entities: Entity[], sample: SampledClip, weight: number, additive: boolean, mask: Set<AnimatableProperty> | null): void {
    if (sample.spriteAsset && owner.spriteRenderer && weight >= .5) owner.spriteRenderer.spriteAsset = sample.spriteAsset
    for (const sampled of sample.values.values()) {
      if (mask && !mask.has(sampled.property)) continue
      const entity = sampled.targetEntityUuid ? entities.find(candidate => candidate.uuid === sampled.targetEntityUuid) : owner
      if (!entity) continue
      const current = this.propertyValue(entity, sampled.property)
      if (current === null) continue
      const value = additive ? current + sampled.value * weight : current + (sampled.value - current) * weight
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

  private emitEvents(entity: Entity, clip: AnimationClipDocument, previousTime: number, time: number): void {
    const wrapped = clip.loop && time < previousTime
    for (const event of clip.events) if ((wrapped && (event.time > previousTime || event.time <= time)) || (!wrapped && event.time > previousTime && event.time <= time)) this.onEvent?.(entity, event)
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
