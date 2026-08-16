import { reactive } from 'vue'
import type { Entity } from '../world/Entity'
import type { EngineDiagnostics, RuntimePhysicsEvent } from '../world/World'

export interface PhysicsBodyTelemetry {
  uuid: string
  name: string
  layer: number
  bodyType: string
  position: { x: number; y: number }
  velocity: { x: number; y: number }
  directionDegrees: number
  speed: number
  acceleration: { x: number; y: number }
  accelerationMagnitude: number
  force: { x: number; y: number }
  forceMagnitude: number
  angularVelocity: number
  mass: number
  kineticEnergy: number
  contactCount: number
  sleeping: boolean
}

export interface CollisionTelemetry {
  id: number
  step: number
  type: RuntimePhysicsEvent['type']
  firstUuid?: string
  secondUuid?: string
  firstName: string
  secondName: string
  point: [number, number]
  normal: [number, number]
  incomingRelativeVelocity: [number, number]
  resultingRelativeVelocity: [number, number]
  directionChangeDegrees: number
  normalImpulse: number
  tangentImpulse: number
  impulseMagnitude: number
  normalForce: number
  tangentForce: number
  forceMagnitude: number
  penetration: number
  recordedAt: number
}

const COLLISION_HISTORY_LIMIT = 500
let nextCollisionId = 1
let lastPhysicsStep = -1
let previousBodyState = new Map<string, { velocity: { x: number; y: number } }>()

export const physicsMonitorState = reactive({
  bodies: [] as PhysicsBodyTelemetry[],
  collisions: [] as CollisionTelemetry[],
  activeTab: 'bodies' as 'bodies' | 'collisions',
  query: '',
  frozen: false,
  collapsed: false,
  sessionStartedAt: 0
})

function magnitude(vector: { x: number; y: number } | [number, number]): number {
  const x = Array.isArray(vector) ? vector[0] : vector.x
  const y = Array.isArray(vector) ? vector[1] : vector.y
  return Math.hypot(x, y)
}

function finite(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function vector(value: unknown): [number, number] {
  if (!Array.isArray(value)) return [0, 0]
  return [finite(value[0]), finite(value[1])]
}

function directionDegrees(from: [number, number], to: [number, number]): number {
  if (magnitude(from) < 1e-12 || magnitude(to) < 1e-12) return 0
  let delta = Math.atan2(to[1], to[0]) - Math.atan2(from[1], from[0])
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  return delta * 180 / Math.PI
}

export function beginPhysicsMonitorSession(): void {
  physicsMonitorState.bodies.splice(0)
  physicsMonitorState.collisions.splice(0)
  physicsMonitorState.query = ''
  physicsMonitorState.frozen = false
  physicsMonitorState.collapsed = false
  physicsMonitorState.sessionStartedAt = performance.now()
  lastPhysicsStep = -1
  nextCollisionId = 1
  previousBodyState = new Map()
}

export function clearCollisionTimeline(): void {
  physicsMonitorState.collisions.splice(0)
}

export function recordPhysicsTelemetry(
  entities: Entity[],
  events: RuntimePhysicsEvent[],
  diagnostics: EngineDiagnostics,
  tickRate = 60
): void {
  if (physicsMonitorState.frozen || diagnostics.totalPhysicsSteps === lastPhysicsStep) return
  const stepDelta = Math.max(1, diagnostics.totalPhysicsSteps - Math.max(0, lastPhysicsStep))
  lastPhysicsStep = diagnostics.totalPhysicsSteps

  const monitored = entities.filter(entity => entity.enabled && entity.hasComponent('RigidBody2D')).slice(0, 2_000)
  const fixedDelta = 1 / Math.min(1_000, Math.max(1, finite(tickRate) || 60))
  physicsMonitorState.bodies.splice(0, physicsMonitorState.bodies.length, ...monitored.map(entity => {
    const speed = magnitude(entity.velocity)
    const previous = previousBodyState.get(entity.uuid)
    const measuredAcceleration = previous ? {
      x: (entity.velocity.x - previous.velocity.x) / (stepDelta * fixedDelta),
      y: (entity.velocity.y - previous.velocity.y) / (stepDelta * fixedDelta)
    } : { ...entity.acceleration }
    const accelerationMagnitude = magnitude(measuredAcceleration)
    const forceMagnitude = magnitude(entity.force)
    return {
      uuid: entity.uuid,
      name: entity.name,
      layer: entity.layer,
      bodyType: entity.rigidBody.bodyType,
      position: { ...entity.transform.position },
      velocity: { ...entity.velocity },
      directionDegrees: speed > 1e-12 ? Math.atan2(entity.velocity.y, entity.velocity.x) * 180 / Math.PI : 0,
      speed,
      acceleration: measuredAcceleration,
      accelerationMagnitude,
      force: { ...entity.force },
      forceMagnitude,
      angularVelocity: entity.angularVelocity,
      mass: entity.mass,
      kineticEnergy: .5 * entity.mass * speed * speed + .5 * entity.inertia * entity.angularVelocity * entity.angularVelocity,
      contactCount: entity.contactCount,
      sleeping: entity.rigidBody.sleeping
    }
  }))
  previousBodyState = new Map(monitored.map(entity => [entity.uuid, { velocity: { ...entity.velocity } }]))

  const names = new Map(entities.map(entity => [entity.uuid, entity.name]))
  for (const event of events) {
    if (!['collisionStarted', 'collisionStayed', 'collisionEnded', 'triggerEntered', 'triggerExited'].includes(event.type)) continue
    // Start/end events stay permanently useful in the timeline. A contact may
    // stay active for hundreds of fixed steps, so retain only the latest row
    // for that pair instead of allowing duplicate DOM/history growth.
    if (event.type === 'collisionStayed') {
      const existing = physicsMonitorState.collisions.findIndex(item => item.type === event.type && item.firstUuid === event.firstEntityUuid && item.secondUuid === event.secondEntityUuid)
      if (existing >= 0) physicsMonitorState.collisions.splice(existing, 1)
    }
    const incoming = vector(event.initialRelativeVelocity)
    const resulting = vector(event.relativeVelocity)
    const normalImpulse = finite(event.normalImpulse)
    const tangentImpulse = finite(event.tangentImpulse)
    const normalForce = finite(event.normalForce)
    const tangentForce = finite(event.tangentForce)
    physicsMonitorState.collisions.unshift({
      id: nextCollisionId++,
      step: diagnostics.totalPhysicsSteps,
      type: event.type,
      firstUuid: event.firstEntityUuid,
      secondUuid: event.secondEntityUuid,
      firstName: names.get(event.firstEntityUuid ?? '') ?? 'Unknown',
      secondName: names.get(event.secondEntityUuid ?? '') ?? 'Unknown',
      point: vector(event.point),
      normal: vector(event.normal),
      incomingRelativeVelocity: incoming,
      resultingRelativeVelocity: resulting,
      directionChangeDegrees: directionDegrees(incoming, resulting),
      normalImpulse,
      tangentImpulse,
      impulseMagnitude: Math.hypot(normalImpulse, tangentImpulse),
      normalForce,
      tangentForce,
      forceMagnitude: Math.hypot(normalForce, tangentForce),
      penetration: Math.max(0, finite(event.penetration)),
      recordedAt: performance.now() - physicsMonitorState.sessionStartedAt
    })
  }
  if (physicsMonitorState.collisions.length > COLLISION_HISTORY_LIMIT) {
    physicsMonitorState.collisions.splice(COLLISION_HISTORY_LIMIT)
  }
}
