import { resolveTexture } from '../assets/AssetDatabase'
import type { Renderer2D } from '../renderer'
import type { ParticleEmitter2D } from '../world/components'
import type { Entity } from '../world/Entity'
import { finiteNumber } from '../world/geometry'
import { localPointToWorld, worldTransform } from '../world/hierarchy'
import type { Vec2 } from '../world/types'
import { reactive } from 'vue'
import { renderingSettings } from '../renderer/renderSettings'

interface Particle {
  position: Vec2
  velocity: Vec2
  age: number
  lifetime: number
  rotation: number
  angularVelocity: number
  trail: Vec2[]
}

interface EmitterState {
  particles: Particle[]
  emissionAccumulator: number
  burstEmitted: boolean
  seed: number
}

const states = new Map<string, EmitterState>()
export const particleDiagnostics = reactive({ activeParticles: 0, emitterCount: 0, updateMs: 0, budget: 10_000, budgetExceeded: false, subemissions: 0, collisions: 0, cpuSimulated: 0, gpuRendered: 0, events: [] as Array<{ time: number; emitterUuid: string; kind: 'collision' | 'death' | 'subemit'; signal: string }> })

function clamp(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, finiteNumber(value, fallback)))
}

export function normalizeParticleEmitter(component: ParticleEmitter2D): void {
  component.textureAsset = typeof component.textureAsset === 'string' ? component.textureAsset : null
  if (!['Auto', 'CPU', 'GPU'].includes(component.simulationBackend)) component.simulationBackend = 'Auto'
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
  if (!['Point', 'Box', 'Circle', 'Edge'].includes(component.emissionShape)) component.emissionShape = 'Point'
  component.shapeSize = safeVector(component.shapeSize, { x: 1, y: 1 }); component.shapeSize.x = Math.abs(component.shapeSize.x); component.shapeSize.y = Math.abs(component.shapeSize.y)
  component.shapeRadius = clamp(component.shapeRadius, .5, 0, 1e6)
  component.scaleCurve = safeCurve(component.scaleCurve, [{ time: 0, value: 1 }, { time: 1, value: 1 }])
  component.colorGradient = safeGradient(component.colorGradient)
  component.subEmitterUuid = typeof component.subEmitterUuid === 'string' && component.subEmitterUuid ? component.subEmitterUuid.slice(0, 128) : null
  component.subEmitterCount = Math.round(clamp(component.subEmitterCount, 1, 0, 1_000))
  component.previewInEditor = component.previewInEditor !== false
  if (!['None', 'Bounce', 'Stop'].includes(component.collisionMode)) component.collisionMode = 'None'
  component.collisionRestitution = clamp(component.collisionRestitution, .5, 0, 1)
  component.collisionLayerMask = Math.round(clamp(component.collisionLayerMask, 0xffff_ffff, 0, 0xffff_ffff)) >>> 0
  component.eventSignal = typeof component.eventSignal === 'string' ? component.eventSignal.slice(0, 128) : 'particle.event'
  component.trailEnabled = component.trailEnabled === true
  component.trailLength = Math.round(clamp(component.trailLength, 12, 2, 32))
  component.trailWidth = clamp(component.trailWidth, .08, .001, 1e6)
  for (const color of [component.startColor, component.endColor]) {
    color.r = Math.round(clamp(color.r, 255, 0, 255)); color.g = Math.round(clamp(color.g, 255, 0, 255)); color.b = Math.round(clamp(color.b, 255, 0, 255))
  }
}

function safeCurve(value: unknown, fallback: Array<{ time: number; value: number }>) {
  if (!Array.isArray(value)) return fallback
  const points = value.slice(0, 16).flatMap(item => item && typeof item === 'object' ? [{ time: clamp((item as { time?: unknown }).time, 0, 0, 1), value: clamp((item as { value?: unknown }).value, 1, -100, 100) }] : []).sort((a, b) => a.time - b.time)
  return points.length >= 2 ? points : fallback
}
function safeGradient(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 16).flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const source = item as { time?: unknown; color?: { r?: unknown; g?: unknown; b?: unknown }; opacity?: unknown }, color = source.color ?? {}
    return [{ time: clamp(source.time, 0, 0, 1), color: { r: Math.round(clamp(color.r, 255, 0, 255)), g: Math.round(clamp(color.g, 255, 0, 255)), b: Math.round(clamp(color.b, 255, 0, 255)) }, opacity: clamp(source.opacity, 100, 0, 100) }]
  }).sort((a, b) => a.time - b.time)
}
function sampleCurve(points: Array<{ time: number; value: number }>, time: number): number {
  if (!points.length) return 1; if (time <= points[0].time) return points[0].value
  for (let index = 1; index < points.length; index++) if (time <= points[index].time) { const first = points[index - 1], second = points[index], amount = (time - first.time) / Math.max(1e-9, second.time - first.time); return first.value + (second.value - first.value) * amount }
  return points[points.length - 1].value
}
function sampleGradient(component: ParticleEmitter2D, time: number) {
  const points = component.colorGradient.length ? component.colorGradient : [{ time: 0, color: component.startColor, opacity: component.startOpacity }, { time: 1, color: component.endColor, opacity: component.endOpacity }]
  if (time <= points[0].time) return points[0]
  for (let index = 1; index < points.length; index++) if (time <= points[index].time) { const first = points[index - 1], second = points[index], amount = (time - first.time) / Math.max(1e-9, second.time - first.time); return { time, color: { r: first.color.r + (second.color.r - first.color.r) * amount, g: first.color.g + (second.color.g - first.color.g) * amount, b: first.color.b + (second.color.b - first.color.b) * amount }, opacity: first.opacity + (second.opacity - first.opacity) * amount } }
  return points[points.length - 1]
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

function emissionOffset(component: ParticleEmitter2D, state: EmitterState): Vec2 {
  if (component.emissionShape === 'Circle') { const angle = random(state) * Math.PI * 2, radius = Math.sqrt(random(state)) * component.shapeRadius; return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius } }
  if (component.emissionShape === 'Box') return { x: between(state, -component.shapeSize.x * .5, component.shapeSize.x * .5), y: between(state, -component.shapeSize.y * .5, component.shapeSize.y * .5) }
  if (component.emissionShape === 'Edge') { const horizontal = random(state) < component.shapeSize.x / Math.max(1e-9, component.shapeSize.x + component.shapeSize.y); return horizontal ? { x: between(state, -component.shapeSize.x * .5, component.shapeSize.x * .5), y: (random(state) < .5 ? -1 : 1) * component.shapeSize.y * .5 } : { x: (random(state) < .5 ? -1 : 1) * component.shapeSize.x * .5, y: between(state, -component.shapeSize.y * .5, component.shapeSize.y * .5) } }
  return { x: 0, y: 0 }
}
function emit(entity: Entity, component: ParticleEmitter2D, state: EmitterState, count: number, entities: Entity[], globalCapacity = Number.POSITIVE_INFINITY, worldOrigin?: Vec2): number {
  const capacity = Math.max(0, Math.min(globalCapacity, component.maxParticles - state.particles.length))
  const transform = worldTransform(entity, entities)
  const emitted = Math.min(capacity, count)
  for (let index = 0; index < emitted; index++) {
    const offset = emissionOffset(component, state)
    const localVelocity = {
      x: between(state, component.initialVelocityMin.x, component.initialVelocityMax.x),
      y: between(state, component.initialVelocityMin.y, component.initialVelocityMax.y)
    }
    const position = component.worldSpace ? (worldOrigin ? { ...worldOrigin } : localPointToWorld(entity, offset, entities)) : offset
    state.particles.push({
      position,
      velocity: component.worldSpace ? rotate({ x: localVelocity.x * transform.scale.x, y: localVelocity.y * transform.scale.y }, transform.rotation) : localVelocity,
      age: 0,
      lifetime: component.lifetime,
      rotation: between(state, component.rotationMin, component.rotationMax) + (component.worldSpace ? transform.rotation : 0),
      angularVelocity: between(state, component.angularVelocityMin, component.angularVelocityMax),
      trail: [{ ...position }]
    })
  }
  return emitted
}

function collideParticle(particle: Particle, component: ParticleEmitter2D, owner: Entity, entities: Entity[]): number {
  for (const target of entities) {
    if (target === owner || !target.enabled) continue
    const collider = target.getCollider()
    if (!collider?.enabled || collider.sensor || ((component.collisionLayerMask >>> collider.physicsLayer) & 1) === 0) continue
    const transform = worldTransform(target, entities), center = localPointToWorld(target, collider.offset, entities), rotation = transform.rotation + collider.rotation
    const relative = rotate({ x: particle.position.x - center.x, y: particle.position.y - center.y }, -rotation)
    let normalLocal: Vec2 | null = null, corrected: Vec2 | null = null
    if (collider.shapeModel === 'Circle') {
      const radiusX = Math.max(1e-6, Math.abs(collider.radiusX * transform.scale.x)), radiusY = Math.max(1e-6, Math.abs(collider.radiusY * transform.scale.y))
      const normalized = relative.x * relative.x / (radiusX * radiusX) + relative.y * relative.y / (radiusY * radiusY)
      if (normalized >= 1) continue
      if (normalized <= 1e-12) { normalLocal = { x: 0, y: 1 }; corrected = { x: 0, y: radiusY } }
      else { const factor = 1 / Math.sqrt(normalized); corrected = { x: relative.x * factor, y: relative.y * factor }; const nx = corrected.x / (radiusX * radiusX), ny = corrected.y / (radiusY * radiusY), length = Math.hypot(nx, ny) || 1; normalLocal = { x: nx / length, y: ny / length } }
    } else {
      let halfX = Math.max(1e-6, Math.abs(collider.size.x * transform.scale.x) * .5), halfY = Math.max(1e-6, Math.abs(collider.size.y * transform.scale.y) * .5)
      if (collider.shapeModel === 'ConvexPolygon' && collider.vertices.length) { halfX = Math.max(halfX, ...collider.vertices.map(point => Math.abs(point.x * transform.scale.x))); halfY = Math.max(halfY, ...collider.vertices.map(point => Math.abs(point.y * transform.scale.y))) }
      if (Math.abs(relative.x) >= halfX || Math.abs(relative.y) >= halfY) continue
      const penetrationX = halfX - Math.abs(relative.x), penetrationY = halfY - Math.abs(relative.y)
      if (penetrationX < penetrationY) { normalLocal = { x: relative.x < 0 ? -1 : 1, y: 0 }; corrected = { x: normalLocal.x * halfX, y: relative.y } }
      else { normalLocal = { x: 0, y: relative.y < 0 ? -1 : 1 }; corrected = { x: relative.x, y: normalLocal.y * halfY } }
    }
    const normal = rotate(normalLocal, rotation), worldPoint = rotate(corrected, rotation)
    particle.position = { x: center.x + worldPoint.x, y: center.y + worldPoint.y }
    if (component.collisionMode === 'Stop') particle.velocity = { x: 0, y: 0 }
    else { const inward = particle.velocity.x * normal.x + particle.velocity.y * normal.y; if (inward < 0) { particle.velocity.x -= (1 + component.collisionRestitution) * inward * normal.x; particle.velocity.y -= (1 + component.collisionRestitution) * inward * normal.y } }
    return 1
  }
  return 0
}

export class ParticleRuntime {
  update(entities: Entity[], delta: number, playing: boolean): void {
    const started = performance.now()
    const dt = clamp(delta, 0, 0, .25)
    const live = new Set<string>()
    let activeParticles = [...states.values()].reduce((total, state) => total + state.particles.length, 0), emitterCount = 0, subemissions = 0, collisions = 0, cpuSimulated = 0
    const globalBudget = renderingSettings.particleBudget
    for (const entity of entities) {
      const component = entity.getComponent<ParticleEmitter2D>('ParticleEmitter2D')
      if (!component || !component.enabled || component.removed || !entity.enabled) continue
      normalizeParticleEmitter(component)
      if (!playing && !component.previewInEditor) continue
      live.add(component.uuid)
      emitterCount++
      const state = emitterState(component)
      cpuSimulated += state.particles.length
      if (component.autoplay) {
        if (!state.burstEmitted) { activeParticles += emit(entity, component, state, component.burst, entities, globalBudget - activeParticles); state.burstEmitted = true }
        state.emissionAccumulator += component.emissionRate * dt
        const count = Math.min(component.maxParticles, Math.floor(state.emissionAccumulator))
        if (count > 0) { const emitted = emit(entity, component, state, count, entities, globalBudget - activeParticles); activeParticles += emitted; state.emissionAccumulator -= emitted }
      }
      for (const particle of state.particles) {
        particle.age += dt
        particle.velocity.x += component.gravity.x * dt
        particle.velocity.y += component.gravity.y * dt
        particle.position.x += particle.velocity.x * dt
        particle.position.y += particle.velocity.y * dt
        if (component.worldSpace && component.collisionMode !== 'None') { const hit = collideParticle(particle, component, entity, entities); collisions += hit; if (hit) this.noteEvent(component, 'collision') }
        particle.rotation += particle.angularVelocity * dt
        if (component.trailEnabled && (particle.trail.length === 0 || Math.hypot(particle.position.x - particle.trail[particle.trail.length - 1].x, particle.position.y - particle.trail[particle.trail.length - 1].y) > .01)) { particle.trail.push({ ...particle.position }); if (particle.trail.length > component.trailLength) particle.trail.splice(0, particle.trail.length - component.trailLength) }
      }
      const expired = state.particles.filter(particle => particle.age >= particle.lifetime)
      if (expired.length) this.noteEvent(component, 'death')
      state.particles = state.particles.filter(particle => particle.age < particle.lifetime)
      activeParticles = Math.max(0, activeParticles - expired.length)
      const target = component.subEmitterUuid ? entities.flatMap(candidate => { const emitter = candidate.getComponent<ParticleEmitter2D>('ParticleEmitter2D'); return emitter?.uuid === component.subEmitterUuid ? [{ entity: candidate, component: emitter }] : [] })[0] : null
      if (target && expired.length && activeParticles < globalBudget) { const targetState = emitterState(target.component); normalizeParticleEmitter(target.component); for (const particle of expired) { const amount = emit(target.entity, target.component, targetState, component.subEmitterCount, entities, globalBudget - activeParticles, component.worldSpace ? particle.position : localPointToWorld(entity, particle.position, entities)); activeParticles += amount; subemissions += amount; if (amount) this.noteEvent(component, 'subemit'); if (activeParticles >= globalBudget) break } }
      if (!component.looping && state.burstEmitted) component.autoplay = false
    }
    for (const uuid of [...states.keys()]) if (!live.has(uuid)) states.delete(uuid)
    activeParticles = [...states.values()].reduce((total, state) => total + state.particles.length, 0)
    Object.assign(particleDiagnostics, { activeParticles, emitterCount, updateMs: performance.now() - started, budget: globalBudget, budgetExceeded: activeParticles >= globalBudget, subemissions, collisions, cpuSimulated, gpuRendered: 0 })
  }

  submit(renderer: Renderer2D, entities: Entity[]): void {
    particleDiagnostics.gpuRendered = renderer.stats.backend === 'WebGL2' ? particleDiagnostics.activeParticles : 0
    for (const entity of entities) {
      const component = entity.getComponent<ParticleEmitter2D>('ParticleEmitter2D')
      const state = component ? states.get(component.uuid) : null
      if (!component || !state || !component.enabled || component.removed || !entity.enabled) continue
      const texture = resolveTexture(component.textureAsset)
      const transform = worldTransform(entity, entities)
      for (const particle of state.particles) {
        const ratio = Math.min(1, Math.max(0, particle.age / Math.max(1e-9, particle.lifetime)))
        const scale = (component.startScale + (component.endScale - component.startScale) * ratio) * sampleCurve(component.scaleCurve, ratio)
        const gradient = sampleGradient(component, ratio)
        const color = { r: gradient.color.r, g: gradient.color.g, b: gradient.color.b, a: gradient.opacity / 100 }
        const position = component.worldSpace ? particle.position : localPointToWorld(entity, particle.position, entities)
        const rotation = particle.rotation + (component.worldSpace ? 0 : transform.rotation)
        if (component.trailEnabled && particle.trail.length > 1) {
          const points = component.worldSpace ? particle.trail : particle.trail.map(point => localPointToWorld(entity, point, entities))
          for (let index = 1; index < points.length; index++) renderer.submitShape({ shape: 'Line', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, vertices: [points[index - 1], points[index]], radiusX: 0, radiusY: 0, fill: { ...color, a: 0 }, stroke: { ...color, a: color.a * index / points.length }, strokeWidth: component.trailWidth * index / points.length, sortingLayer: component.sortingLayer, orderInLayer: component.orderInLayer - .001, material: component.material, blendMode: component.blendMode })
        }
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

  private noteEvent(component: ParticleEmitter2D, kind: 'collision' | 'death' | 'subemit'): void {
    particleDiagnostics.events.unshift({ time: performance.now(), emitterUuid: component.uuid, kind, signal: component.eventSignal })
    particleDiagnostics.events.splice(128)
  }
}

export const particleRuntime = new ParticleRuntime()
