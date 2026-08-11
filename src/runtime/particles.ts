import { resolveTexture } from '../assets/AssetDatabase'
import type { Renderer2D } from '../renderer'
import type { ParticleEmitter2D } from '../world/components'
import type { Entity } from '../world/Entity'
import { finiteNumber } from '../world/geometry'
import { localPointToWorld, worldTransform } from '../world/hierarchy'
import type { Vec2 } from '../world/types'

interface Particle {
  position: Vec2
  velocity: Vec2
  age: number
  lifetime: number
  rotation: number
  angularVelocity: number
}

interface EmitterState {
  particles: Particle[]
  emissionAccumulator: number
  burstEmitted: boolean
  seed: number
}

const states = new Map<string, EmitterState>()

function clamp(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, finiteNumber(value, fallback)))
}

export function normalizeParticleEmitter(component: ParticleEmitter2D): void {
  component.textureAsset = typeof component.textureAsset === 'string' ? component.textureAsset : null
  component.emissionRate = clamp(component.emissionRate, 20, 0, 100_000)
  component.burst = Math.round(clamp(component.burst, 0, 0, 100_000))
  component.lifetime = clamp(component.lifetime, 1, 1e-4, 86_400)
  component.initialVelocityMin = safeVector(component.initialVelocityMin, { x: -1, y: 1 })
  component.initialVelocityMax = safeVector(component.initialVelocityMax, { x: 1, y: 3 })
  component.gravity = safeVector(component.gravity, { x: 0, y: -9.80665 })
  component.rotationMin = finiteNumber(component.rotationMin)
  component.rotationMax = finiteNumber(component.rotationMax, Math.PI * 2)
  component.angularVelocityMin = finiteNumber(component.angularVelocityMin, -1)
  component.angularVelocityMax = finiteNumber(component.angularVelocityMax, 1)
  component.startScale = clamp(component.startScale, .2, 0, 1e6)
  component.endScale = clamp(component.endScale, 0, 0, 1e6)
  component.startOpacity = clamp(component.startOpacity, 100, 0, 100)
  component.endOpacity = clamp(component.endOpacity, 0, 0, 100)
  component.maxParticles = Math.round(clamp(component.maxParticles, 1000, 0, 100_000))
  component.sortingLayer = Math.round(clamp(component.sortingLayer, 0, -1_000_000, 1_000_000))
  component.orderInLayer = Math.round(clamp(component.orderInLayer, 0, -1_000_000, 1_000_000))
  component.material = typeof component.material === 'string' ? component.material.slice(0, 80) : 'Particles'
  if (component.blendMode !== 'Additive') component.blendMode = 'Alpha'
  for (const color of [component.startColor, component.endColor]) {
    color.r = Math.round(clamp(color.r, 255, 0, 255)); color.g = Math.round(clamp(color.g, 255, 0, 255)); color.b = Math.round(clamp(color.b, 255, 0, 255))
  }
}

function safeVector(value: unknown, fallback: Vec2): Vec2 {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return { x: finiteNumber(source.x, fallback.x), y: finiteNumber(source.y, fallback.y) }
}

function random(state: EmitterState): number {
  state.seed = (Math.imul(state.seed, 1_664_525) + 1_013_904_223) >>> 0
  return state.seed / 0x1_0000_0000
}

function between(state: EmitterState, minimum: number, maximum: number): number {
  const low = Math.min(minimum, maximum), high = Math.max(minimum, maximum)
  return low + (high - low) * random(state)
}

function emitterState(component: ParticleEmitter2D): EmitterState {
  let state = states.get(component.uuid)
  if (!state) {
    state = { particles: [], emissionAccumulator: 0, burstEmitted: false, seed: component.uuid.split('').reduce((value, character) => Math.imul(value ^ character.charCodeAt(0), 16_777_619), 2_166_136_261) >>> 0 }
    states.set(component.uuid, state)
  }
  return state
}

function rotate(point: Vec2, angle: number): Vec2 {
  const cosine = Math.cos(angle), sine = Math.sin(angle)
  return { x: point.x * cosine - point.y * sine, y: point.x * sine + point.y * cosine }
}

function emit(entity: Entity, component: ParticleEmitter2D, state: EmitterState, count: number, entities: Entity[]): void {
  const capacity = Math.max(0, component.maxParticles - state.particles.length)
  const transform = worldTransform(entity, entities)
  for (let index = 0; index < Math.min(capacity, count); index++) {
    const localVelocity = {
      x: between(state, component.initialVelocityMin.x, component.initialVelocityMax.x),
      y: between(state, component.initialVelocityMin.y, component.initialVelocityMax.y)
    }
    state.particles.push({
      position: component.worldSpace ? { ...transform.position } : { x: 0, y: 0 },
      velocity: component.worldSpace ? rotate({ x: localVelocity.x * transform.scale.x, y: localVelocity.y * transform.scale.y }, transform.rotation) : localVelocity,
      age: 0,
      lifetime: component.lifetime,
      rotation: between(state, component.rotationMin, component.rotationMax) + (component.worldSpace ? transform.rotation : 0),
      angularVelocity: between(state, component.angularVelocityMin, component.angularVelocityMax)
    })
  }
}

export class ParticleRuntime {
  update(entities: Entity[], delta: number, playing: boolean): void {
    if (!playing) return
    const dt = clamp(delta, 0, 0, .25)
    const live = new Set<string>()
    for (const entity of entities) {
      const component = entity.getComponent<ParticleEmitter2D>('ParticleEmitter2D')
      if (!component || !component.enabled || component.removed || !entity.enabled) continue
      normalizeParticleEmitter(component)
      live.add(component.uuid)
      const state = emitterState(component)
      if (component.autoplay) {
        if (!state.burstEmitted) { emit(entity, component, state, component.burst, entities); state.burstEmitted = true }
        state.emissionAccumulator += component.emissionRate * dt
        const count = Math.min(component.maxParticles, Math.floor(state.emissionAccumulator))
        if (count > 0) { emit(entity, component, state, count, entities); state.emissionAccumulator -= count }
      }
      for (const particle of state.particles) {
        particle.age += dt
        particle.velocity.x += component.gravity.x * dt
        particle.velocity.y += component.gravity.y * dt
        particle.position.x += particle.velocity.x * dt
        particle.position.y += particle.velocity.y * dt
        particle.rotation += particle.angularVelocity * dt
      }
      state.particles = state.particles.filter(particle => particle.age < particle.lifetime)
      if (!component.looping && state.burstEmitted) component.autoplay = false
    }
    for (const uuid of [...states.keys()]) if (!live.has(uuid)) states.delete(uuid)
  }

  submit(renderer: Renderer2D, entities: Entity[]): void {
    for (const entity of entities) {
      const component = entity.getComponent<ParticleEmitter2D>('ParticleEmitter2D')
      const state = component ? states.get(component.uuid) : null
      if (!component || !state || !component.enabled || component.removed || !entity.enabled) continue
      const texture = resolveTexture(component.textureAsset)
      const transform = worldTransform(entity, entities)
      for (const particle of state.particles) {
        const ratio = Math.min(1, Math.max(0, particle.age / Math.max(1e-9, particle.lifetime)))
        const scale = component.startScale + (component.endScale - component.startScale) * ratio
        const color = {
          r: component.startColor.r + (component.endColor.r - component.startColor.r) * ratio,
          g: component.startColor.g + (component.endColor.g - component.startColor.g) * ratio,
          b: component.startColor.b + (component.endColor.b - component.startColor.b) * ratio,
          a: (component.startOpacity + (component.endOpacity - component.startOpacity) * ratio) / 100
        }
        const position = component.worldSpace ? particle.position : localPointToWorld(entity, particle.position, entities)
        const rotation = particle.rotation + (component.worldSpace ? 0 : transform.rotation)
        if (texture) renderer.submitSprite({
          position, rotation, scale: { x: 1, y: 1 }, size: { x: scale, y: scale }, pivot: { x: .5, y: .5 }, flipX: false, flipY: false,
          tint: color, texture, sortingLayer: component.sortingLayer, orderInLayer: component.orderInLayer,
          material: component.material, blendMode: component.blendMode
        })
        else renderer.submitShape({
          shape: 'Ellipse', position, rotation, scale: { x: 1, y: 1 }, vertices: [], radiusX: scale * .5, radiusY: scale * .5,
          fill: color, stroke: { ...color, a: 0 }, strokeWidth: 0, sortingLayer: component.sortingLayer,
          orderInLayer: component.orderInLayer, material: component.material, blendMode: component.blendMode
        })
      }
    }
  }

  reset(): void { states.clear() }
}

export const particleRuntime = new ParticleRuntime()
