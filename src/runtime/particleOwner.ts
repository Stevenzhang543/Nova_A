/** Fixed-World particle state; original emission, integration and submission algorithms. */
import { normalizeParticleEmitter, clamp } from './particleEmitterValues'
import { localPointToWorld, worldTransform } from '../world/hierarchy'
import type { Entity } from '../world/Entity'
import type { ParticleEmitter2D } from '../world/components'
import type { Vec2 } from '../world/types'
import type { Renderer2D } from '../renderer/types'
import type { RendererAssetSource } from '../renderer/RendererEnvironment'

export interface ParticleWorld { readonly entities: Entity[] }
export interface ParticlePorts {
 readonly resources: Pick<RendererAssetSource, 'resolveTexture' | 'generation'>
 readBudget(): {particleBudget:number;adaptiveParticleScale:number}
 /** null is the original full-scan branch; indices must describe this exact World array. */
 emitterIndices(entities:readonly Entity[]):Uint32Array|null
 nowMs():number
}
export function createInitialParticleDiagnostics(){return { activeParticles: 0, emitterCount: 0, updateMs: 0, budget: 10_000, budgetExceeded: false, subemissions: 0, collisions: 0, cpuSimulated: 0, gpuRendered: 0, events: [] as Array<{ time: number; emitterUuid: string; kind: 'collision' | 'death' | 'subemit'; signal: string }> }}
export type ParticleDiagnostics=ReturnType<typeof createInitialParticleDiagnostics>
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



/** 结构说明（自动提取）：sampleCurve；输入 points、time；直接调用 Math.max；返回路径包含 points[…].value；包含循环处理。 */ function sampleCurve(points: Array<{ time: number; value: number }>, time: number): number {
  if (!points.length) return 1; if (time <= points[0].time) return points[0].value
  for (let index = 1; index < points.length; index++) if (time <= points[index].time) { const first = points[index - 1], second = points[index], amount = (time - first.time) / Math.max(1e-9, second.time - first.time); return first.value + (second.value - first.value) * amount }
  return points[points.length - 1].value
}

/** 结构说明（自动提取）：sampleGradient；输入 component、time；直接调用 Math.max；返回路径包含 points[…]；包含循环处理。 */ function sampleGradient(component: ParticleEmitter2D, time: number) {
  const points = component.colorGradient.length ? component.colorGradient : [{ time: 0, color: component.startColor, opacity: component.startOpacity }, { time: 1, color: component.endColor, opacity: component.endOpacity }]
  if (time <= points[0].time) return points[0]
  for (let index = 1; index < points.length; index++) if (time <= points[index].time) { const first = points[index - 1], second = points[index], amount = (time - first.time) / Math.max(1e-9, second.time - first.time); return { time, color: { r: first.color.r + (second.color.r - first.color.r) * amount, g: first.color.g + (second.color.g - first.color.g) * amount, b: first.color.b + (second.color.b - first.color.b) * amount }, opacity: first.opacity + (second.opacity - first.opacity) * amount } }
  return points[points.length - 1]
}


/** 结构说明（自动提取）：random；输入 state；直接调用 Math.imul；写入 state.seed。 */ function random(state: EmitterState): number {
  state.seed = (Math.imul(state.seed, 1_664_525) + 1_013_904_223) >>> 0
  return state.seed / 0x1_0000_0000
}


/** 结构说明（自动提取）：between；输入 state、minimum、maximum；直接调用 Math.min、Math.max、random。 */ function between(state: EmitterState, minimum: number, maximum: number): number {
  const low = Math.min(minimum, maximum), high = Math.max(minimum, maximum)
  return low + (high - low) * random(state)
}


/** 结构说明（自动提取）：emitterState；输入 component；直接调用 states.get、reduce、component.uuid.split、states.set；写入 state；返回路径包含 state。 */ function emitterState(states: Map<string, EmitterState>, component: ParticleEmitter2D): EmitterState {
  let state = states.get(component.uuid)
  if (!state) {
    state = { particles: [], emissionAccumulator: 0, burstEmitted: false, seed: component.uuid.split('').reduce(/* 调用 Math.imul(value ^ character.charCodeAt(0), 16_777_619) 并返回调用结果。 */ (value, character) => Math.imul(value ^ character.charCodeAt(0), 16_777_619), 2_166_136_261) >>> 0 }
    states.set(component.uuid, state)
  }
  return state
}


/** 结构说明（自动提取）：rotate；输入 point、angle；直接调用 Math.cos、Math.sin。 */ function rotate(point: Vec2, angle: number): Vec2 {
  const cosine = Math.cos(angle), sine = Math.sin(angle)
  return { x: point.x * cosine - point.y * sine, y: point.x * sine + point.y * cosine }
}


/** 结构说明（自动提取）：emissionOffset；输入 component、state；直接调用 random、Math.sqrt、Math.cos、Math.sin、between 等。 */ function emissionOffset(component: ParticleEmitter2D, state: EmitterState): Vec2 {
  if (component.emissionShape === 'Circle') { const angle = random(state) * Math.PI * 2, radius = Math.sqrt(random(state)) * component.shapeRadius; return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius } }
  if (component.emissionShape === 'Box') return { x: between(state, -component.shapeSize.x * .5, component.shapeSize.x * .5), y: between(state, -component.shapeSize.y * .5, component.shapeSize.y * .5) }
  if (component.emissionShape === 'Edge') { const horizontal = random(state) < component.shapeSize.x / Math.max(1e-9, component.shapeSize.x + component.shapeSize.y); return horizontal ? { x: between(state, -component.shapeSize.x * .5, component.shapeSize.x * .5), y: (random(state) < .5 ? -1 : 1) * component.shapeSize.y * .5 } : { x: (random(state) < .5 ? -1 : 1) * component.shapeSize.x * .5, y: between(state, -component.shapeSize.y * .5, component.shapeSize.y * .5) } }
  return { x: 0, y: 0 }
}

/** 结构说明（自动提取）：emit；输入 entity、component、state、count、entities、globalCapacity、worldOrigin；直接调用 Math.max、Math.min、worldTransform、emissionOffset、between 等；返回路径包含 emitted；包含循环处理。 */ function emit(entity: Entity, component: ParticleEmitter2D, state: EmitterState, count: number, entities: Entity[], globalCapacity = Number.POSITIVE_INFINITY, worldOrigin?: Vec2): number {
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


/** 结构说明（自动提取）：collideParticle；输入 particle、component、owner、entities；直接调用 target.getCollider、worldTransform、localPointToWorld、rotate、Math.max 等；写入 normalLocal、corrected、halfX、halfY 等；包含循环处理。 */ function collideParticle(particle: Particle, component: ParticleEmitter2D, owner: Entity, entities: Entity[]): number {
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
      if (collider.shapeModel === 'ConvexPolygon' && collider.vertices.length) { halfX = Math.max(halfX, ...collider.vertices.map(/* 调用 Math.abs(point.x * transform.scale.x) 并返回调用结果。 */ point => Math.abs(point.x * transform.scale.x))); halfY = Math.max(halfY, ...collider.vertices.map(/* 调用 Math.abs(point.y * transform.scale.y) 并返回调用结果。 */ point => Math.abs(point.y * transform.scale.y))) }
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

export class RuntimeParticleOwner {
 private readonly states=new Map<string,EmitterState>()
 private disposed=false
 readonly ports:ParticlePorts
 constructor(readonly world:ParticleWorld,ports:ParticlePorts,readonly diagnostics:ParticleDiagnostics=createInitialParticleDiagnostics()){
  if(!world||!Array.isArray(world.entities))throw new Error('PARTICLE_WORLD_REQUIRED')
  if(!ports?.resources||typeof ports.resources.resolveTexture!=='function'||['readBudget','emitterIndices','nowMs'].some(k=>typeof ports[k as keyof ParticlePorts]!=='function'))throw new Error('PARTICLE_PORTS_REQUIRED')
  this.ports=Object.freeze({resources:ports.resources,readBudget:ports.readBudget.bind(ports),emitterIndices:ports.emitterIndices.bind(ports),nowMs:ports.nowMs.bind(ports)})
 }
 get isDisposed(){return this.disposed}
 private requireActive(){if(this.disposed)throw new Error('PARTICLE_OWNER_DISPOSED')}
 dispose():void{if(this.disposed)return;this.disposed=true;this.states.clear()}

  /** 结构说明（自动提取）：update；输入 entities、delta、playing；直接调用 performance.now、clamp、Set、reduce、states.values 等；写入 cpuSimulated、activeParticles、state.burstEmitted、state.emissionAccumulator 等；包含循环处理。 */ update(delta: number, playing: boolean): void {
    this.requireActive()
    const entities = this.world.entities
    const started = this.ports.nowMs()
    const dt = clamp(delta, 0, 0, .25)
    const live = new Set<string>()
    let activeParticles = [...this.states.values()].reduce(/* 计算表达式 total + state.particles.length 并返回结果，沿用操作数的原有类型规则。 */ (total, state) => total + state.particles.length, 0), emitterCount = 0, subemissions = 0, collisions = 0, cpuSimulated = 0
    const budget = this.ports.readBudget()
    const globalBudget = Math.max(100, Math.floor(budget.particleBudget * budget.adaptiveParticleScale))
    const emitterIndices = this.ports.emitterIndices(entities)
    for (let sourceIndex = 0; sourceIndex < (emitterIndices?.length ?? entities.length); sourceIndex++) {
      const entity = entities[emitterIndices ? emitterIndices[sourceIndex] : sourceIndex]
      const component = entity.getComponent<ParticleEmitter2D>('ParticleEmitter2D')
      if (!component || !component.enabled || component.removed || !entity.enabled) continue
      normalizeParticleEmitter(component)
      if (!playing && !component.previewInEditor) continue
      live.add(component.uuid)
      emitterCount++
      const state = emitterState(this.states, component)
      cpuSimulated += state.particles.length
      // Completion belongs to this runtime session, never to the authored autoplay setting.
      if (component.autoplay && (component.looping || !state.burstEmitted)) {
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
      const expired = state.particles.filter(/* 比较 particle.age 与 particle.lifetime，返回大于或等于的判断结果。 */ particle => particle.age >= particle.lifetime)
      if (expired.length) this.noteEvent(component, 'death')
      state.particles = state.particles.filter(/* 比较 particle.age 与 particle.lifetime，返回小于的判断结果。 */ particle => particle.age < particle.lifetime)
      activeParticles = Math.max(0, activeParticles - expired.length)
      const target = component.subEmitterUuid ? entities.flatMap(/** 结构说明（自动提取）：entities.flatMap 回调；输入 candidate；直接调用 candidate.getComponent。 */ candidate => { const emitter = candidate.getComponent<ParticleEmitter2D>('ParticleEmitter2D'); return emitter?.uuid === component.subEmitterUuid ? [{ entity: candidate, component: emitter }] : [] })[0] : null
      if (target && expired.length && activeParticles < globalBudget) { const targetState = emitterState(this.states, target.component); normalizeParticleEmitter(target.component); for (const particle of expired) { const amount = emit(target.entity, target.component, targetState, component.subEmitterCount, entities, globalBudget - activeParticles, component.worldSpace ? particle.position : localPointToWorld(entity, particle.position, entities)); activeParticles += amount; subemissions += amount; if (amount) this.noteEvent(component, 'subemit'); if (activeParticles >= globalBudget) break } }
    }
    for (const uuid of [...this.states.keys()]) if (!live.has(uuid)) this.states.delete(uuid)
    activeParticles = [...this.states.values()].reduce(/* 计算表达式 total + state.particles.length 并返回结果，沿用操作数的原有类型规则。 */ (total, state) => total + state.particles.length, 0)
    Object.assign(this.diagnostics, { activeParticles, emitterCount, updateMs: this.ports.nowMs() - started, budget: globalBudget, budgetExceeded: activeParticles >= globalBudget, subemissions, collisions, cpuSimulated, gpuRendered: 0 })
  }


  /** 结构说明（自动提取）：submit；输入 renderer、entities；直接调用 entity.getComponent、states.get、resolveTexture、worldTransform、Math.min 等；写入 this.diagnostics.gpuRendered；包含循环处理。 */ submit(renderer: Renderer2D, entities: Entity[]): void {
    this.requireActive()
    this.diagnostics.gpuRendered = renderer.stats.backend === 'WebGL2' ? this.diagnostics.activeParticles : 0
    for (const entity of entities) {
      const component = entity.getComponent<ParticleEmitter2D>('ParticleEmitter2D')
      const state = component ? this.states.get(component.uuid) : null
      if (!component || !state || !component.enabled || component.removed || !entity.enabled) continue
      const texture = this.ports.resources.resolveTexture(component.textureAsset)
      const transform = worldTransform(entity, entities)
      for (const particle of state.particles) {
        const ratio = Math.min(1, Math.max(0, particle.age / Math.max(1e-9, particle.lifetime)))
        const scale = (component.startScale + (component.endScale - component.startScale) * ratio) * sampleCurve(component.scaleCurve, ratio)
        const gradient = sampleGradient(component, ratio)
        const color = { r: gradient.color.r, g: gradient.color.g, b: gradient.color.b, a: gradient.opacity / 100 }
        const position = component.worldSpace ? particle.position : localPointToWorld(entity, particle.position, entities)
        const rotation = particle.rotation + (component.worldSpace ? 0 : transform.rotation)
        if (component.trailEnabled && particle.trail.length > 1) {
          const points = component.worldSpace ? particle.trail : particle.trail.map(/* 调用 localPointToWorld(entity, point, entities) 并返回调用结果。 */ point => localPointToWorld(entity, point, entities))
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


  /** 执行时调用 this.states.clear()；不显式返回调用结果。 */ reset(): void { this.states.clear() }


  /** 结构说明（自动提取）：noteEvent；输入 component、kind；直接调用 this.diagnostics.events.unshift、performance.now、this.diagnostics.events.splice。 */ private noteEvent(component: ParticleEmitter2D, kind: 'collision' | 'death' | 'subemit'): void {
    this.diagnostics.events.unshift({ time: this.ports.nowMs(), emitterUuid: component.uuid, kind, signal: component.eventSignal })
    this.diagnostics.events.splice(128)
  }


/** A frame translation preserves live world-space particles and trail history. */
/** 结构说明（自动提取）：shiftParticleOrigin；输入 offset、entities；直接调用 entity.getComponent、states.get；写入 particle.position.x、particle.position.y、point.x、point.y；包含循环处理。 */ shiftOrigin(offset: Vec2): void {
    this.requireActive()
    const entities = this.world.entities
  for (const entity of entities) {
    const component = entity.getComponent<ParticleEmitter2D>('ParticleEmitter2D', true)
    if (!component?.worldSpace) continue
    const state = this.states.get(component.uuid)
    if (!state) continue
    for (const particle of state.particles) { particle.position.x -= offset.x; particle.position.y -= offset.y; for (const point of particle.trail) { point.x -= offset.x; point.y -= offset.y } }
  }
}
}
