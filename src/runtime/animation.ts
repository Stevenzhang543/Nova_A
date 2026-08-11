import { assetReference, assetState, createTextAsset, readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import { finiteNumber } from '../world/geometry'
import type { Entity } from '../world/Entity'
import type { Animator, AnimatorParameterValue } from '../world/components'

export type AnimatableProperty = 'Transform.position.x' | 'Transform.position.y' | 'Transform.rotation' | 'SpriteRenderer.opacity' | 'UI.opacity'
export type AnimatorParameterType = 'Bool' | 'Float' | 'Integer' | 'Trigger'

export interface AnimationKeyframe { time: number; value: number }
export interface AnimationTrack { property: AnimatableProperty; keyframes: AnimationKeyframe[] }
export interface SpriteAnimationFrame { spriteAsset: string | null; duration: number }
export interface AnimationClipDocument {
  version: 1
  name: string
  loop: boolean
  frameRate: number
  spriteFrames: SpriteAnimationFrame[]
  tracks: AnimationTrack[]
}
export interface AnimatorParameter { name: string; type: AnimatorParameterType; defaultValue: AnimatorParameterValue }
export interface AnimatorState { id: string; name: string; clipAsset: string | null; speed: number; x: number; y: number }
export interface TransitionCondition { parameter: string; operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'trigger'; value: AnimatorParameterValue }
export interface AnimatorTransition { id: string; from: string; to: string; hasExitTime: boolean; exitTime: number; duration: number; conditions: TransitionCondition[] }
export interface AnimatorControllerDocument {
  version: 1
  name: string
  defaultState: string
  parameters: AnimatorParameter[]
  states: AnimatorState[]
  transitions: AnimatorTransition[]
}

const TRACKS = new Set<AnimatableProperty>(['Transform.position.x', 'Transform.position.y', 'Transform.rotation', 'SpriteRenderer.opacity', 'UI.opacity'])
const PARAMETER_TYPES = new Set<AnimatorParameterType>(['Bool', 'Float', 'Integer', 'Trigger'])
const OPERATORS = new Set<TransitionCondition['operator']>(['==', '!=', '>', '<', '>=', '<=', 'trigger'])

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
  return { version: 1, name, loop: true, frameRate: 12, spriteFrames: [], tracks: [] }
}

export function defaultAnimatorController(name = 'New Controller'): AnimatorControllerDocument {
  const stateId = 'idle'
  return {
    version: 1, name, defaultState: stateId, parameters: [], transitions: [],
    states: [{ id: stateId, name: 'Idle', clipAsset: null, speed: 1, x: 80, y: 80 }]
  }
}

export function normalizeAnimationClip(source: unknown): AnimationClipDocument {
  const item = source && typeof source === 'object' ? source as Partial<AnimationClipDocument> : {}
  return {
    version: 1,
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
        time: Math.max(0, finiteNumber(frame?.time)), value: finiteNumber(frame?.value)
      })).sort((first, second) => first.time - second.time)
      return [{ property: track.property as AnimatableProperty, keyframes }]
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
      x: finiteNumber(state?.x, 80 + index * 180), y: finiteNumber(state?.y, 80)
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
      conditions: (Array.isArray(transition.conditions) ? transition.conditions : []).slice(0, 64).flatMap(condition => {
        const parameter = parameters.find(candidate => candidate.name === condition?.parameter)
        if (!parameter) return []
        const operator = OPERATORS.has(condition.operator as TransitionCondition['operator']) ? condition.operator as TransitionCondition['operator'] : '=='
        return [{ parameter: parameter.name, operator, value: parameterValue(condition.value, parameter.type) }]
      })
    }]
  })
  return {
    version: 1, name: typeof item.name === 'string' ? item.name.slice(0, 120) : 'Animator Controller',
    defaultState: usedStates.has(String(item.defaultState)) ? String(item.defaultState) : states[0].id,
    parameters, states, transitions
  }
}

function parseAsset<T>(reference: string | null, type: 'animation' | 'controller', normalize: (source: unknown) => T): T | null {
  const asset = resolveAsset(reference)
  const source = readTextAsset(reference)
  if (!asset || asset.assetType !== type || !source) return null
  try { return normalize(JSON.parse(source)) } catch { return null }
}

const clipCache = new Map<string, { generation: number; value: AnimationClipDocument | null }>()
const controllerCache = new Map<string, { generation: number; value: AnimatorControllerDocument | null }>()

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

export function createAnimationClipAsset(name = 'New Animation'): AssetRecord {
  return createTextAsset(name, 'animation', JSON.stringify(defaultAnimationClip(name), null, 2), 'Assets/Animations')
}

export function createAnimatorControllerAsset(name = 'New Controller'): AssetRecord {
  return createTextAsset(name, 'controller', JSON.stringify(defaultAnimatorController(name), null, 2), 'Assets/Controllers')
}

function clipLength(clip: AnimationClipDocument): number {
  const sprite = clip.spriteFrames.reduce((sum, frame) => sum + frame.duration, 0)
  const tracks = clip.tracks.reduce((maximum, track) => Math.max(maximum, track.keyframes[track.keyframes.length - 1]?.time ?? 0), 0)
  return Math.max(sprite, tracks, 1 / clip.frameRate)
}

function sampleTrack(keyframes: AnimationKeyframe[], time: number): number | null {
  if (!keyframes.length) return null
  if (time <= keyframes[0].time) return keyframes[0].value
  const last = keyframes[keyframes.length - 1]
  if (time >= last.time) return last.value
  for (let index = 1; index < keyframes.length; index++) {
    const next = keyframes[index]
    if (time > next.time) continue
    const previous = keyframes[index - 1]
    const range = Math.max(1e-9, next.time - previous.time)
    return previous.value + (next.value - previous.value) * ((time - previous.time) / range)
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

interface AnimatorRuntimeState { controllerAsset: string | null; stateId: string; time: number }

class AnimationRuntime {
  private runtime = new Map<string, AnimatorRuntimeState>()

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
      if (!state || state.controllerAsset !== animator.controllerAsset || !controller.states.some(candidate => candidate.id === state!.stateId)) {
        state = { controllerAsset: animator.controllerAsset, stateId: animator.currentState || controller.defaultState, time: 0 }
        this.runtime.set(entity.uuid, state)
      }
      if (animator.currentState && animator.currentState !== state.stateId && controller.states.some(candidate => candidate.id === animator.currentState)) {
        state.stateId = animator.currentState; state.time = 0
      }
      for (const parameter of controller.parameters) {
        if (!(parameter.name in animator.parameters)) animator.parameters[parameter.name] = parameter.defaultValue
      }
      let animatorState = controller.states.find(candidate => candidate.id === state!.stateId) ?? controller.states[0]
      const clip = readAnimationClip(animatorState.clipAsset)
      const length = clip ? clipLength(clip) : 0
      const normalizedTime = length > 0 ? state.time / length : 1
      const transition = controller.transitions.find(candidate => candidate.from === animatorState.id
        && (!candidate.hasExitTime || normalizedTime >= candidate.exitTime)
        && candidate.conditions.every(condition => conditionMatches(animator.parameters[condition.parameter] ?? false, condition)))
      if (transition) {
        for (const condition of transition.conditions) {
          const parameter = controller.parameters.find(candidate => candidate.name === condition.parameter)
          if (parameter?.type === 'Trigger') animator.parameters[parameter.name] = false
        }
        state.stateId = transition.to; state.time = 0
        animatorState = controller.states.find(candidate => candidate.id === transition.to) ?? animatorState
      }
      const activeClip = transition ? readAnimationClip(animatorState.clipAsset) : clip
      const activeLength = activeClip ? clipLength(activeClip) : 0
      state.time += Math.max(0, delta) * animator.speed * animatorState.speed
      if (activeClip && activeLength > 0) {
        if (activeClip.loop) state.time = ((state.time % activeLength) + activeLength) % activeLength
        else state.time = Math.min(activeLength, Math.max(0, state.time))
        this.apply(entity, activeClip, state.time)
      }
      animator.currentState = animatorState.id
    }
  }

  private apply(entity: Entity, clip: AnimationClipDocument, time: number): void {
    if (clip.spriteFrames.length && entity.spriteRenderer) {
      let cursor = 0
      for (const frame of clip.spriteFrames) {
        cursor += frame.duration
        if (time <= cursor) { entity.spriteRenderer.spriteAsset = frame.spriteAsset; break }
      }
    }
    for (const track of clip.tracks) {
      const value = sampleTrack(track.keyframes, time)
      if (value === null) continue
      if (track.property === 'Transform.position.x') entity.transform.position.x = value
      else if (track.property === 'Transform.position.y') entity.transform.position.y = value
      else if (track.property === 'Transform.rotation') entity.transform.rotation = value
      else if (track.property === 'SpriteRenderer.opacity' && entity.spriteRenderer) entity.spriteRenderer.opacity = Math.min(100, Math.max(0, value))
      else if (track.property === 'UI.opacity') {
        for (const kind of ['Panel', 'Image', 'Text'] as const) {
          const component = entity.getComponent<{ opacity: number } & { readonly kind: typeof kind; enabled: boolean; removed: boolean; uuid: string }>(kind)
          if (component) component.opacity = Math.min(100, Math.max(0, value))
        }
      }
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
