import { reactive } from 'vue'
import type { Entity } from '../world/Entity'
import type { Connection } from '../world/Connection'
import type { EngineDiagnostics, RuntimePhysicsEvent } from '../world/World'
import { kineticEnergy2D, physicsBodyRole, physicsInstabilityWarnings, type PhysicsSimulationProfile2D } from './physicsProduction'

export interface PhysicsBodyTelemetry {
  uuid: string
  name: string
  layer: number
  bodyType: string
  role: string
  position: { x: number; y: number }
  velocity: { x: number; y: number }
  directionDegrees: number
  speed: number
  deltaSpeed: number
  speedHistory: number[]
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
export interface PhysicsConstraintTelemetry {
  uuid: string
  name: string
  kind: string
  firstName: string
  secondName: string
  tension: number
  strain: number
  segmentCount: number
  collisionEnabled: boolean
  collideConnected: boolean
  breakState: string
  breakLink: number
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

export interface PhysicsMonitorCapture {
  id: string
  name: string
  createdAt: string
  step: number
  diagnostics: EngineDiagnostics
  bodies: PhysicsBodyTelemetry[]
  constraints: PhysicsConstraintTelemetry[]
  collisions: CollisionTelemetry[]
}

const COLLISION_HISTORY_LIMIT = 500
let nextCollisionId = 1
let lastPhysicsStep = -1
let previousBodyState = new Map<string, { velocity: { x: number; y: number } }>()
let speedHistory = new Map<string, number[]>()
let lastDiagnostics: EngineDiagnostics = { bodyCount: 0, connectionCount: 0, stepsLastFrame: 0, totalPhysicsSteps: 0, interpolationAlpha: 0, droppedSeconds: 0, eventCount: 0, configurationRebuilds: 0 }

export const physicsMonitorState = reactive({
  bodies: [] as PhysicsBodyTelemetry[],
  collisions: [] as CollisionTelemetry[],
  constraints: [] as PhysicsConstraintTelemetry[],
  captures: [] as PhysicsMonitorCapture[],
  warnings: [] as string[],
  pinnedUuids: [] as string[],
  activeTab: 'bodies' as 'bodies' | 'collisions' | 'constraints' | 'captures',
  query: '',
  sortKey: 'name' as 'name' | 'speed' | 'acceleration' | 'force' | 'energy' | 'contacts',
  sortDirection: 'ascending' as 'ascending' | 'descending',
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
  physicsMonitorState.constraints.splice(0)
  physicsMonitorState.warnings.splice(0)
  physicsMonitorState.query = ''
  physicsMonitorState.frozen = false
  physicsMonitorState.collapsed = false
  physicsMonitorState.sessionStartedAt = performance.now()
  lastPhysicsStep = -1
  nextCollisionId = 1
  previousBodyState = new Map()
  speedHistory = new Map()
}

export function clearCollisionTimeline(): void {
  physicsMonitorState.collisions.splice(0)
}

export function togglePhysicsPin(uuid: string): void {
  const index = physicsMonitorState.pinnedUuids.indexOf(uuid)
  if (index >= 0) physicsMonitorState.pinnedUuids.splice(index, 1)
  else if (physicsMonitorState.pinnedUuids.length < 256) physicsMonitorState.pinnedUuids.push(uuid)
}

export function capturePhysicsSnapshot(name = `Physics capture ${physicsMonitorState.captures.length + 1}`): PhysicsMonitorCapture {
  const capture: PhysicsMonitorCapture = {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 80) || 'Physics capture',
    createdAt: new Date().toISOString(),
    step: lastPhysicsStep,
    diagnostics: { ...lastDiagnostics },
    bodies: structuredClone(physicsMonitorState.bodies),
    constraints: structuredClone(physicsMonitorState.constraints),
    collisions: structuredClone(physicsMonitorState.collisions)
  }
  physicsMonitorState.captures.push(capture)
  if (physicsMonitorState.captures.length > 32) physicsMonitorState.captures.splice(0, physicsMonitorState.captures.length - 32)
  return capture
}

export function comparePhysicsSnapshots(first: PhysicsMonitorCapture, second: PhysicsMonitorCapture): Array<{ uuid: string; name: string; speedDelta: number; energyDelta: number; contactDelta: number }> {
  const before = new Map(first.bodies.map(body => [body.uuid, body]))
  return second.bodies.map(body => {
    const previous = before.get(body.uuid)
    return { uuid: body.uuid, name: body.name, speedDelta: body.speed - (previous?.speed ?? 0), energyDelta: body.kineticEnergy - (previous?.kineticEnergy ?? 0), contactDelta: body.contactCount - (previous?.contactCount ?? 0) }
  }).sort((a, b) => Math.abs(b.energyDelta) - Math.abs(a.energyDelta) || a.uuid.localeCompare(b.uuid))
}

export function physicsCaptureJson(capture: PhysicsMonitorCapture): string {
  return `${JSON.stringify({ format: 'nova-physics-capture', version: 1, engineVersion: '6.1.0', units: { position: 'm', velocity: 'm/s', acceleration: 'm/s²', force: 'N', energy: 'J' }, capture }, null, 2)}\n`
}

export function recordPhysicsTelemetry(
  entities: Entity[],
  connections: Connection[],
  events: RuntimePhysicsEvent[],
  diagnostics: EngineDiagnostics,
  tickRate = 60,
  profile?: PhysicsSimulationProfile2D,
  elapsedMs = 0
): void {
  if (physicsMonitorState.frozen || diagnostics.totalPhysicsSteps === lastPhysicsStep) return
  const stepDelta = Math.max(1, diagnostics.totalPhysicsSteps - Math.max(0, lastPhysicsStep))
  lastPhysicsStep = diagnostics.totalPhysicsSteps
  lastDiagnostics = { ...diagnostics }

  const monitored = entities.filter(entity => entity.enabled && entity.hasComponent('RigidBody2D')).slice(0, 20_000)
  const fixedDelta = 1 / Math.min(1_000, Math.max(1, finite(tickRate) || 60))
  physicsMonitorState.bodies.splice(0, physicsMonitorState.bodies.length, ...monitored.map(entity => {
    const speed = magnitude(entity.velocity)
    const previous = previousBodyState.get(entity.uuid)
    const measuredAcceleration = previous ? {
      x: (entity.velocity.x - previous.velocity.x) / (stepDelta * fixedDelta),
      y: (entity.velocity.y - previous.velocity.y) / (stepDelta * fixedDelta)
    } : { ...entity.acceleration }
    const history = [...(speedHistory.get(entity.uuid) ?? []), speed].slice(-60)
    speedHistory.set(entity.uuid, history)
    return {
      uuid: entity.uuid,
      name: entity.name,
      layer: entity.collider.physicsLayer,
      bodyType: entity.rigidBody.bodyType,
      role: physicsBodyRole(entity.rigidBody.bodyType, entity.hasComponent('CharacterBody2D'), entity.isSensor),
      position: { ...entity.transform.position },
      velocity: { ...entity.velocity },
      directionDegrees: speed > 1e-12 ? Math.atan2(entity.velocity.y, entity.velocity.x) * 180 / Math.PI : 0,
      speed,
      deltaSpeed: speed - magnitude(previous?.velocity ?? { x: 0, y: 0 }),
      speedHistory: history,
      acceleration: measuredAcceleration,
      accelerationMagnitude: magnitude(measuredAcceleration),
      force: { ...entity.force },
      forceMagnitude: magnitude(entity.force),
      angularVelocity: entity.angularVelocity,
      mass: entity.mass,
      kineticEnergy: kineticEnergy2D(entity.mass, entity.velocity, entity.inertia, entity.angularVelocity),
      contactCount: entity.contactCount,
      sleeping: entity.rigidBody.sleeping
    }
  }))
  previousBodyState = new Map(monitored.map(entity => [entity.uuid, { velocity: { ...entity.velocity } }]))
  const liveUuids = new Set(monitored.map(entity => entity.uuid))
  for (const uuid of speedHistory.keys()) if (!liveUuids.has(uuid)) speedHistory.delete(uuid)

  const namesById = new Map(entities.map(entity => [entity.id, entity.name]))
  physicsMonitorState.constraints.splice(0, physicsMonitorState.constraints.length, ...connections.map(connection => ({
    uuid: connection.uuid,
    name: connection.name,
    kind: connection.componentType,
    firstName: namesById.get(connection.anchors[0]?.entityId) ?? 'Unknown',
    secondName: namesById.get(connection.anchors[1]?.entityId) ?? 'Unknown',
    tension: finite(connection.tension),
    strain: finite(connection.strain),
    segmentCount: connection.segmentCount || connection.ropeNodes.length,
    collisionEnabled: connection.collisionEnabled,
    collideConnected: connection.collideConnected,
    breakState: connection.breakState,
    breakLink: connection.breakLink
  })).sort((a, b) => a.name.localeCompare(b.name) || a.uuid.localeCompare(b.uuid)))

  const activeProfile = profile ?? { id: 'Balanced', name: 'Balanced', tickRate, maxCatchUpSteps: 8, minimumSubsteps: 8, velocityIterations: 20, positionIterations: 16, interpolation: 'Interpolate', droppedTimePolicy: 'Drop', sleepLinearThreshold: .001, sleepAngularThreshold: .001, timeToSleep: .5, physicsBudgetMs: 4 }
  physicsMonitorState.warnings.splice(0, physicsMonitorState.warnings.length, ...physicsInstabilityWarnings({ bodyCount: diagnostics.bodyCount, contactCount: monitored.reduce((total, entity) => total + entity.contactCount, 0) / 2, connectionCount: diagnostics.connectionCount, droppedSeconds: diagnostics.droppedSeconds, elapsedMs, profile: activeProfile }))

  const names = new Map(entities.map(entity => [entity.uuid, entity.name]))
  for (const event of events) {
    if (!['collisionStarted', 'collisionStayed', 'collisionEnded', 'triggerEntered', 'triggerStayed', 'triggerExited'].includes(event.type)) continue
    if (event.type === 'collisionStayed' || event.type === 'triggerStayed') {
      const existing = physicsMonitorState.collisions.findIndex(item => item.type === event.type && item.firstUuid === event.firstEntityUuid && item.secondUuid === event.secondEntityUuid)
      if (existing >= 0) physicsMonitorState.collisions.splice(existing, 1)
    }
    const incoming = vector(event.initialRelativeVelocity)
    const resulting = vector(event.relativeVelocity)
    const normalImpulse = finite(event.normalImpulse), tangentImpulse = finite(event.tangentImpulse), normalForce = finite(event.normalForce), tangentForce = finite(event.tangentForce)
    physicsMonitorState.collisions.unshift({
      id: nextCollisionId++, step: diagnostics.totalPhysicsSteps, type: event.type,
      firstUuid: event.firstEntityUuid, secondUuid: event.secondEntityUuid,
      firstName: names.get(event.firstEntityUuid ?? '') ?? 'Unknown', secondName: names.get(event.secondEntityUuid ?? '') ?? 'Unknown',
      point: vector(event.point), normal: vector(event.normal), incomingRelativeVelocity: incoming, resultingRelativeVelocity: resulting,
      directionChangeDegrees: directionDegrees(incoming, resulting), normalImpulse, tangentImpulse,
      impulseMagnitude: Math.hypot(normalImpulse, tangentImpulse), normalForce, tangentForce,
      forceMagnitude: Math.hypot(normalForce, tangentForce), penetration: Math.max(0, finite(event.penetration)),
      recordedAt: performance.now() - physicsMonitorState.sessionStartedAt
    })
  }
  if (physicsMonitorState.collisions.length > COLLISION_HISTORY_LIMIT) physicsMonitorState.collisions.splice(COLLISION_HISTORY_LIMIT)
}
