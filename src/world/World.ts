import { Entity } from './Entity'
import { BoxEntity } from './BoxEntity'
import { CircleEntity } from './CircleEntity'
import { TriangleEntity } from './TriangleEntity'
import type { Vec2 } from './types'
import { finiteNumber, normalizeEntity, syncMassFromDensity } from './geometry'
import {
  CONNECTION_STRIDE,
  connectionsFromJointComponents,
  ROPE_NODE_CAPACITY,
  ROPE_NODE_DATA_OFFSET,
  connectionSharesLayer,
  initializeRopeNodes,
  normalizeConnection,
  scaledLocalAnchor,
  type Connection
} from './Connection'
import init, {
  WasmRuntimeWorld,
  current_format_version,
  engine_version,
  migrate_project_json
} from '../../nova_core/pkg/nova_core.js'
import { localPointToWorld, setWorldTransform, worldTransform } from './hierarchy'
import { Collider2D, TileMap2D } from './components'
import { buildTileColliderDescriptors } from '../runtime/tilemap'
import { assetState, readTextAsset } from '../assets/AssetDatabase'
import { recordPhysicsTelemetry } from '../runtime/physicsMonitor'
import { defaultPhysicsLayers, defaultPhysicsProfile, normalizePhysicsMaterial, normalizePhysicsProfile, stablePhysicsEventOrder, type PhysicsInterpolationMode, type PhysicsLayerDefinition, type PhysicsShapeKind, type PhysicsSimulationProfile2D } from '../runtime/physicsProduction'

export const PHYSICS_STRIDE = 56
export const PHYSICS_LAYER_COUNT = 32

export function defaultCollisionMatrix(): number[] {
  return Array.from({ length: PHYSICS_LAYER_COUNT }, (_, layer) => (1 << layer) >>> 0)
}

export interface GlobalPhysicsSettings {
  gravity: number
  airFriction: number
  timeScale: number
  tickRate: number
  maxCatchUpSteps: number
  collisionMatrix: number[]
  interpolation: PhysicsInterpolationMode
  layers: PhysicsLayerDefinition[]
  profile: PhysicsSimulationProfile2D
}

export interface EngineDiagnostics {
  bodyCount: number
  connectionCount: number
  stepsLastFrame: number
  totalPhysicsSteps: number
  interpolationAlpha: number
  droppedSeconds: number
  eventCount: number
  configurationRebuilds: number
}

export interface RuntimePhysicsEvent {
  type: 'collisionStarted' | 'collisionStayed' | 'collisionEnded' | 'triggerEntered' | 'triggerStayed' | 'triggerExited' | string
  first?: number
  second?: number
  firstEntityUuid?: string
  secondEntityUuid?: string
  point?: [number, number]
  normal?: [number, number]
  relativeVelocity?: [number, number]
  initialRelativeVelocity?: [number, number]
  normalImpulse?: number
  tangentImpulse?: number
  normalForce?: number
  tangentForce?: number
  penetration?: number
  handle?: number
  jointKind?: number
  link?: number
  tension?: number
  strain?: number
  entityUuid?: string
  connectionUuid?: string
  [key: string]: unknown
}

export interface CharacterMoveResult2D {
  position: [number, number]
  appliedMotion: [number, number]
  remainingMotion: [number, number]
  floorNormal: [number, number]
  wallNormal: [number, number]
  ceilingNormal: [number, number]
  platformVelocity: [number, number]
  onFloor: boolean
  onWall: boolean
  onCeiling: boolean
  slideCount: number
}

export interface PhysicsQueryHit2D {
  entityUuid: string
  point: Vec2
  normal: Vec2
  distance: number
}

interface WasmQueryHit { handle: number; point: [number, number]; normal: [number, number]; distance: number }

interface ConnectionRecord {
  connection: Connection
  segment: number
  bodyA: number
  bodyB: number
}

function compoundColliderEnvelope(collider: Collider2D): Vec2[] | null {
  const supplementary = collider.shapes.filter(shape => shape.enabled)
  if (!supplementary.length) return null
  const points: Vec2[] = []
  const add = (kind: PhysicsShapeKind, offset: Vec2, angle: number, size: Vec2, radius: number, authored: Vec2[] = []) => {
    const width = Math.max(1e-9, Math.abs(size.x || radius * 2))
    const height = Math.max(1e-9, Math.abs(size.y || radius * 2))
    const local = (kind === 'ConvexPolygon' || kind === 'ConcavePolygon' || kind === 'Chain') && authored.length >= 2
      ? authored
      : [{ x: -width * .5, y: -height * .5 }, { x: width * .5, y: -height * .5 }, { x: width * .5, y: height * .5 }, { x: -width * .5, y: height * .5 }]
    const cosine = Math.cos(angle), sine = Math.sin(angle)
    for (const point of local) points.push({ x: offset.x + point.x * cosine - point.y * sine, y: offset.y + point.x * sine + point.y * cosine })
  }
  const primarySize = collider.kind === 'EllipseCollider2D'
    ? { x: collider.radiusX * 2, y: collider.radiusY * 2 }
    : collider.size
  add(collider.shapeModel, collider.offset, collider.rotation, primarySize, Math.min(primarySize.x, primarySize.y) * .5, collider.vertices)
  for (const shape of supplementary) add(shape.kind, shape.offset, shape.rotation, shape.size, shape.radius, shape.points)
  const xs = points.map(point => point.x), ys = points.map(point => point.y)
  const left = Math.min(...xs), right = Math.max(...xs), bottom = Math.min(...ys), top = Math.max(...ys)
  return [{ x: left, y: bottom }, { x: right, y: bottom }, { x: right, y: top }, { x: left, y: top }]
}

/** Writes one entity into the stable Float64 ABI shared with nova_core. */
function writeEntityRecord(data: Float64Array, entityIndex: number, entity: Entity, entities: Entity[], settings: GlobalPhysicsSettings, runtimeHandle = entity.id): void {
  const materialSource = readTextAsset(entity.collider.materialAsset)
  if (materialSource) {
    try {
      const value = JSON.parse(materialSource) as Record<string, unknown>
      if (value.format === 'nova-physics-material') {
        const material = normalizePhysicsMaterial(value)
        Object.assign(entity.collider.material, material)
        if (entity.rigidBody.massMode === 'Automatic') entity.rigidBody.density = material.density
      }
    } catch { /* A malformed optional asset is ignored; project validation reports it. */ }
  }
  normalizeEntity(entity)
  const transform = worldTransform(entity, entities)
  const collider = entity.collider
  const compoundEnvelope = compoundColliderEnvelope(collider)
  const index = entityIndex * PHYSICS_STRIDE
  data[index] = runtimeHandle
  data[index + 1] = compoundEnvelope ? 0 : collider.shapeModel === 'Circle' ? 1 : collider.shapeModel === 'Capsule' ? 2 : collider.shapeModel === 'Segment' || collider.shapeModel === 'WorldBoundary' ? 3 : 0
  data[index + 2] = transform.position.x
  data[index + 3] = transform.position.y
  data[index + 4] = entity.velocity.x
  data[index + 5] = entity.velocity.y
  data[index + 6] = entity.acceleration.x
  data[index + 7] = entity.acceleration.y
  data[index + 8] = entity.mass
  data[index + 9] = entity.isStatic || collider.shapeModel === 'WorldBoundary' ? 1 : 0
  data[index + 10] = entity.restitution
  data[index + 11] = entity.dynamicFriction

  if (compoundEnvelope) {
    const xs = compoundEnvelope.map(vertex => vertex.x * transform.scale.x)
    const ys = compoundEnvelope.map(vertex => vertex.y * transform.scale.y)
    data[index + 12] = Math.max(...xs) - Math.min(...xs)
    data[index + 13] = Math.max(...ys) - Math.min(...ys)
  } else if (collider.shapeModel === 'Circle') {
    data[index + 12] = (collider.kind === 'EllipseCollider2D' ? collider.radiusX : collider.size.x * .5) * transform.scale.x
    data[index + 13] = (collider.kind === 'EllipseCollider2D' ? collider.radiusY : collider.size.y * .5) * transform.scale.y
  } else {
    const xs = collider.vertices.map(vertex => vertex.x * transform.scale.x)
    const ys = collider.vertices.map(vertex => vertex.y * transform.scale.y)
    data[index + 12] = Math.max(...xs) - Math.min(...xs)
    data[index + 13] = Math.max(...ys) - Math.min(...ys)
  }

  data[index + 14] = transform.rotation
  data[index + 15] = entity.angularVelocity
  data[index + 16] = entity.torque
  data[index + 17] = entity.gravityScale
  data[index + 18] = entity.linearDamping
  data[index + 19] = entity.angularDamping
  data[index + 20] = entity.staticFriction
  data[index + 21] = entity.force.x
  data[index + 22] = entity.force.y
  data[index + 23] = entity.gravity
  data[index + 24] = entity.isKinematic ? 1 : 0
  data[index + 25] = entity.autoInertia ? 1 : 0
  data[index + 26] = entity.inertia
  data[index + 27] = entity.restitutionThreshold
  data[index + 28] = entity.isSensor ? 1 : 0
  data[index + 33] = collider.physicsLayer
  const matrixMask = settings.collisionMatrix[collider.physicsLayer] ?? (1 << collider.physicsLayer)
  data[index + 42] = (collider.collisionMask & matrixMask) >>> 0
  data[index + 43] = compoundEnvelope ? 0 : collider.offset.x * transform.scale.x
  data[index + 44] = compoundEnvelope ? 0 : collider.offset.y * transform.scale.y
  data[index + 45] = compoundEnvelope ? 0 : collider.rotation
  data[index + 46] = entity.rigidBody.freezeRotation ? 1 : 0
  data[index + 47] = entity.rigidBody.continuousCollision === 'Continuous' ? 1 : 0
  data[index + 48] = entity.rigidBody.sleepingAllowed ? 1 : 0
  data[index + 49] = entity.rigidBody.sleeping ? 1 : 0
  data[index + 50] = entity.rigidBody.sleepTimer
  data[index + 51] = collider.oneWay ? 1 : 0
  data[index + 52] = collider.oneWayNormal.x
  data[index + 53] = collider.oneWayNormal.y
  const combineCode = (mode: 'Average' | 'Minimum' | 'Maximum' | 'Multiply') => mode === 'Minimum' ? 1 : mode === 'Multiply' ? 2 : mode === 'Maximum' ? 3 : 0
  data[index + 54] = combineCode(collider.material.frictionCombine)
  data[index + 55] = combineCode(collider.material.restitutionCombine)

  const recordVertices = compoundEnvelope ?? (collider.kind !== 'EllipseCollider2D' ? collider.vertices : [])
  if (recordVertices.length) {
    for (let vertexIndex = 0; vertexIndex < recordVertices.length && vertexIndex < 4; vertexIndex++) {
      const vertex = recordVertices[vertexIndex]
      data[index + 34 + vertexIndex * 2] = vertex.x * transform.scale.x
      data[index + 35 + vertexIndex * 2] = vertex.y * transform.scale.y
    }
    if (recordVertices.length === 3) {
      data[index + 40] = recordVertices[2].x * transform.scale.x
      data[index + 41] = recordVertices[2].y * transform.scale.y
    }
  }
}

function readEntityRecord(output: Float64Array, entityIndex: number, entity: Entity, entities: Entity[]): void {
  const index = entityIndex * PHYSICS_STRIDE
  const transform = worldTransform(entity, entities)
  setWorldTransform(entity, {
    ...transform,
    position: {
      x: finiteNumber(output[index + 2], transform.position.x),
      y: finiteNumber(output[index + 3], transform.position.y)
    },
    rotation: finiteNumber(output[index + 14], transform.rotation)
  }, entities)
  entity.velocity.x = finiteNumber(output[index + 4], entity.velocity.x)
  entity.velocity.y = finiteNumber(output[index + 5], entity.velocity.y)
  entity.mass = finiteNumber(output[index + 8], entity.mass)
  entity.angularVelocity = finiteNumber(output[index + 15], entity.angularVelocity)
  entity.inertia = finiteNumber(output[index + 26], entity.inertia)
  entity.contactCount = Math.max(0, Math.round(finiteNumber(output[index + 29], 0)))
  entity.contactNormal.x = finiteNumber(output[index + 30], 0)
  entity.contactNormal.y = finiteNumber(output[index + 31], 0)
  entity.penetrationDepth = Math.max(0, finiteNumber(output[index + 32], 0))
  entity.rigidBody.sleeping = output[index + 49] > 0.5
  entity.rigidBody.sleepTimer = Math.max(0, finiteNumber(output[index + 50], 0))
}

function collectConnectionRecords(entities: Entity[], connections: Connection[], allEntities: Entity[] = entities): ConnectionRecord[] {
  const entityIndexes = new Map(entities.map((entity, index) => [entity.id, index]))
  const records: ConnectionRecord[] = []
  for (const connection of connections) {
    const remainsActive = connection.breakState === 'intact'
      || (connection.collisionEnabled && connection.ropeNodes.length > 0 && connection.breakLink >= 0)
    if (!connection.enabled || !normalizeConnection(connection, allEntities) || !connectionSharesLayer(connection, allEntities) || !remainsActive) continue
    if (connection.breakState === 'intact' && connection.collisionEnabled && connection.ropeNodes.length === 0) {
      initializeRopeNodes(connection, allEntities)
    }
    for (let segment = 0; segment < connection.anchors.length - 1; segment++) {
      const bodyA = entityIndexes.get(connection.anchors[segment].entityId)
      const bodyB = entityIndexes.get(connection.anchors[segment + 1].entityId)
      if (bodyA === undefined || bodyB === undefined || bodyA === bodyB) continue
      records.push({ connection, segment, bodyA, bodyB })
    }
  }
  return records
}

/** Writes one connection segment into the stable Float64 ABI shared with nova_core. */
function writeConnectionRecord(data: Float64Array, recordIndex: number, record: ConnectionRecord, entities: Entity[], allEntities: Entity[], runtimeHandle = record.connection.id): void {
  const { connection, segment, bodyA, bodyB } = record
  const anchorA = connection.anchors[segment]
  const anchorB = connection.anchors[segment + 1]
  const localA = scaledLocalAnchor(anchorA, entities[bodyA], allEntities)
  const localB = scaledLocalAnchor(anchorB, entities[bodyB], allEntities)
  const index = recordIndex * CONNECTION_STRIDE
  data[index] = runtimeHandle
  data[index + 1] = bodyA
  data[index + 2] = bodyB
  data[index + 3] = localA.x
  data[index + 4] = localA.y
  data[index + 5] = localB.x
  data[index + 6] = localB.y
  data[index + 7] = connection.restLengths[segment]
  data[index + 8] = connection.stretchable ? 1 : 0
  data[index + 9] = connection.bendable ? 1 : 0
  data[index + 10] = connection.stiffness
  data[index + 11] = connection.damping
  data[index + 12] = connection.maxStretchRatio
  data[index + 13] = connection.bendingToleranceMass
  data[index + 14] = connection.stretchingToleranceMass
  const manualBend = connection.style === 'manual'
    ? Math.max(0, ...(connection.manualSegments[segment] ?? []).map(point => Math.abs(point.y)))
    : 0
  data[index + 15] = connection.style === 'curved' ? Math.abs(connection.curvature) : manualBend
  data[index + 16] = 1
  data[index + 17] = connection.breakState === 'snapped' ? 1 : connection.breakState === 'torn' ? 2 : 0
  data[index + 18] = connection.componentType === 'FixedJoint2D' || connection.componentType === 'WeldJoint2D' ? 1
    : connection.componentType === 'DistanceJoint2D' || connection.componentType === 'RopeJoint2D' ? 2
      : connection.componentType === 'RevoluteJoint2D' || connection.componentType === 'MotorJoint2D' ? 3
        : connection.componentType === 'PrismaticJoint2D' ? 4
          : connection.componentType === 'SpringJoint2D' ? 5 : 0
  data[index + 20] = connection.binding ? 1 : 0
  data[index + 21] = connection.bindAngle
  data[index + 22] = connection.bindOffset.x
  data[index + 23] = connection.bindOffset.y
  data[index + 24] = connection.collisionEnabled && segment === 0 ? 1 : 0
  data[index + 25] = connection.collisionRadius
  data[index + 26] = connection.linearDensity
  const nodeCount = segment === 0 ? Math.min(ROPE_NODE_CAPACITY, connection.ropeNodes.length) : 0
  data[index + 27] = nodeCount
  data[index + 28] = connection.breakLink
  if (connection.componentType !== 'Rope2D') {
    data[index + 29] = connection.jointAxis.x
    data[index + 30] = connection.jointAxis.y
    data[index + 31] = connection.limitsEnabled ? 1 : 0
    data[index + 32] = connection.lowerLimit
    data[index + 33] = connection.upperLimit
    data[index + 34] = connection.collideConnected ? 1 : 0
    data[index + 35] = connection.motorEnabled ? 1 : 0
    data[index + 36] = connection.motorSpeed
    data[index + 37] = connection.maxMotorForce
    data[index + 38] = connection.breakForce
    data[index + 39] = connection.breakTorque
  }
  for (let nodeIndex = 0; nodeIndex < nodeCount; nodeIndex++) {
    const node = connection.ropeNodes[nodeIndex]
    const nodeOffset = index + ROPE_NODE_DATA_OFFSET + nodeIndex * 4
    data[nodeOffset] = node.position.x
    data[nodeOffset + 1] = node.position.y
    data[nodeOffset + 2] = node.velocity.x
    data[nodeOffset + 3] = node.velocity.y
  }
}

function readConnectionRecord(output: Float64Array, offset: number, recordIndex: number, record: ConnectionRecord): void {
  const { connection } = record
  const index = offset + recordIndex * CONNECTION_STRIDE
  const breakCode = Math.round(finiteNumber(output[index + 17]))
  connection.tension = Math.max(connection.tension, finiteNumber(output[index + 18]))
  connection.strain = Math.max(connection.strain, finiteNumber(output[index + 19]))
  if (breakCode === 1) connection.breakState = 'snapped'
  if (breakCode === 2) connection.breakState = 'torn'
  const nodeCount = Math.min(ROPE_NODE_CAPACITY, Math.max(0, Math.round(finiteNumber(output[index + 27], 0))))
  connection.breakLink = Math.min(nodeCount, Math.max(-1, Math.round(finiteNumber(output[index + 28], -1))))
  if (!connection.collisionEnabled || nodeCount === 0) return
  connection.ropeNodes = Array.from({ length: nodeCount }, (_, nodeIndex) => {
    const nodeOffset = index + ROPE_NODE_DATA_OFFSET + nodeIndex * 4
    return {
      position: { x: finiteNumber(output[nodeOffset]), y: finiteNumber(output[nodeOffset + 1]) },
      velocity: { x: finiteNumber(output[nodeOffset + 2]), y: finiteNumber(output[nodeOffset + 3]) }
    }
  })
}

export class World {
  private nextId = 1
  private nextConnectionId = 1
  entities: Entity[] = []
  connections: Connection[] = []
  private wasmLoaded = false
  private runtime: WasmRuntimeWorld | null = null
  private nextRuntimeHandle = 1
  private bodyHandles = new Map<number, number>()
  private connectionHandles = new Map<string, number>()
  private bodyRecords = new Map<number, Float64Array>()
  private connectionRecords = new Map<number, Float64Array>()
  private bodyOrders = new Map<number, number>()
  private connectionOrders = new Map<number, number>()
  private bodyScratch = new Float64Array(PHYSICS_STRIDE)
  private connectionScratch = new Float64Array(CONNECTION_STRIDE)
  private stateBuffer = new Float64Array(0)
  private previousBodyBuffer = new Float64Array(0)
  private activeBodies: Entity[] = []
  private tileCollisionBodies: Entity[] = []
  private tileCollisionOwners = new Map<number, Entity>()
  private tileCollisionSignature = ''
  private activeConnectionRecords: ConnectionRecord[] = []
  private timingSignature = ''
  private lastSettings: GlobalPhysicsSettings = { gravity: 9.8, airFriction: .01, timeScale: 1, tickRate: 60, maxCatchUpSteps: 8, collisionMatrix: defaultCollisionMatrix(), interpolation: 'Interpolate', layers: defaultPhysicsLayers(), profile: defaultPhysicsProfile() }
  wasmError: Error | null = null
  readonly wasmReady: Promise<void>
  diagnostics: EngineDiagnostics = {
    bodyCount: 0, connectionCount: 0, stepsLastFrame: 0, totalPhysicsSteps: 0,
    interpolationAlpha: 0, droppedSeconds: 0, eventCount: 0, configurationRebuilds: 0
  }
  events: RuntimePhysicsEvent[] = []
  projectFormatVersion = 29
  projectEngineVersion = '5.0.1'

  constructor() {
    // Vite's Node-side audit loader has no browser fetch implementation for file: WASM URLs.
    // Keep its deliberate headless fallback quiet; browsers and Tauri still initialize normally.
    const nodeRuntime = (globalThis as typeof globalThis & { process?: { versions?: { node?: string } } }).process?.versions?.node
    if (nodeRuntime || typeof document === 'undefined') {
      this.wasmReady = Promise.resolve()
      return
    }
    this.wasmReady = init()
      .then(() => {
        this.runtime = new WasmRuntimeWorld()
        this.projectFormatVersion = current_format_version()
        this.projectEngineVersion = engine_version()
        this.wasmLoaded = true
      })
      .catch((error: unknown) => {
        this.wasmError = error instanceof Error ? error : new Error(String(error))
        console.error('Failed to initialize Nova_A physics WASM', this.wasmError)
      })
  }

  allocateId(): number {
    if (this.nextId > Number.MAX_SAFE_INTEGER) throw new Error('Entity ID space is exhausted')
    return this.nextId++
  }

  setNextId(nextId: number): void {
    this.nextId = Math.min(Number.MAX_SAFE_INTEGER + 1, Math.max(1, Math.round(finiteNumber(nextId, 1))))
  }

  resetId(): void {
    this.nextId = 1
  }

  allocateConnectionId(): number {
    if (this.nextConnectionId > Number.MAX_SAFE_INTEGER) throw new Error('Connection ID space is exhausted')
    return this.nextConnectionId++
  }

  setNextConnectionId(nextId: number): void {
    this.nextConnectionId = Math.min(Number.MAX_SAFE_INTEGER + 1, Math.max(1, Math.round(finiteNumber(nextId, 1))))
  }

  resetConnectionId(): void {
    this.nextConnectionId = 1
  }

  addBox(pos: Vec2, size: Vec2): BoxEntity {
    const entity = new BoxEntity(this.allocateId(), pos, size)
    normalizeEntity(entity)
    syncMassFromDensity(entity)
    this.entities.push(entity)
    return entity
  }

  addCircle(pos: Vec2, radiusX: number, radiusY?: number): CircleEntity {
    const entity = new CircleEntity(this.allocateId(), pos, radiusX, radiusY)
    normalizeEntity(entity)
    syncMassFromDensity(entity)
    this.entities.push(entity)
    return entity
  }

  addTriangle(pos: Vec2, size: Vec2): TriangleEntity {
    const entity = new TriangleEntity(this.allocateId(), pos, size)
    normalizeEntity(entity)
    syncMassFromDensity(entity)
    this.entities.push(entity)
    return entity
  }

  update(
    dt: number,
    isRunning: boolean,
    globalSettings: GlobalPhysicsSettings,
    beforeFixedStep?: (fixedDelta: number) => void,
    afterFixedStep?: (fixedDelta: number) => void
  ): EngineDiagnostics {
    this.lastSettings = globalSettings
    if (!this.wasmLoaded || !this.runtime) return this.diagnostics
    this.configureTiming(globalSettings, !isRunning)
    if (isRunning && this.entities.length > 0) {
      const frameDelta = Math.min(Math.max(finiteNumber(dt, 0), 0), 0.25)
      const gravity = finiteNumber(globalSettings.gravity, 9.8)
      const airFriction = Math.max(0, finiteNumber(globalSettings.airFriction, 0.01))
      if (beforeFixedStep) {
        const steps = this.runtime.prepare_advance(frameDelta)
        const fixedDelta = 1 / Math.min(1000, Math.max(1, finiteNumber(globalSettings.tickRate, 60)))
        for (let step = 0; step < steps; step++) {
          beforeFixedStep(fixedDelta)
          this.updatePathFollowers(fixedDelta)
          this.synchronizeRuntime(globalSettings)
          this.runtime.advance_fixed_tick(gravity, airFriction)
          this.readRuntimeState(1, globalSettings)
          afterFixedStep?.(fixedDelta)
        }
        this.runtime.complete_advance()
      } else {
        this.updatePathFollowers(frameDelta)
        this.synchronizeRuntime(globalSettings)
        this.runtime.advance(frameDelta, gravity, airFriction)
      }
      this.readRuntimeState(this.runtime.interpolation_alpha(), globalSettings)
    } else {
      this.synchronizeRuntime(globalSettings)
    }
    this.readDiagnostics()
    return this.diagnostics
  }

  singleStep(globalSettings: GlobalPhysicsSettings): EngineDiagnostics {
    this.lastSettings = globalSettings
    if (!this.wasmLoaded || !this.runtime) return this.diagnostics
    this.updatePathFollowers(1 / Math.min(1000, Math.max(1, finiteNumber(globalSettings.tickRate, 60))))
    this.synchronizeRuntime(globalSettings)
    this.configureTiming(globalSettings, true)
    this.runtime.single_step(
      finiteNumber(globalSettings.gravity, 9.8),
      Math.max(0, finiteNumber(globalSettings.airFriction, 0.01))
    )
    this.readRuntimeState(1, globalSettings)
    this.readDiagnostics()
    return this.diagnostics
  }

  private updatePathFollowers(delta: number): void {
    for (const pathEntity of this.entities) {
      const path = pathEntity.authoring.path, target = pathEntity.authoring.kind === 'Path' && path.follower.targetUuid ? this.entities.find(entity => entity.uuid === path.follower.targetUuid) : null
      if (!target || path.points.length < 2 || !Number.isFinite(delta) || delta <= 0) continue
      const next = path.follower.progress + path.follower.speed * delta
      path.follower.progress = path.closed ? ((next % 1) + 1) % 1 : Math.min(1, Math.max(0, next))
      const segments = path.closed ? path.points.length : path.points.length - 1, scaled = path.follower.progress * segments, segment = Math.min(segments - 1, Math.floor(scaled)), amount = Math.min(1, scaled - segment)
      const first = path.points[segment], second = path.points[(segment + 1) % path.points.length], local = { x: first.x + (second.x - first.x) * amount, y: first.y + (second.y - first.y) * amount }, position = localPointToWorld(pathEntity, local, this.entities), transform = worldTransform(target, this.entities)
      setWorldTransform(target, { ...transform, position, rotation: path.follower.orient ? worldTransform(pathEntity, this.entities).rotation + Math.atan2(second.y - first.y, second.x - first.x) : transform.rotation }, this.entities)
    }
  }

  stateChecksum(): string {
    if (!this.runtime) return '0000000000000000'
    return (this.runtime as unknown as { state_checksum: () => string }).state_checksum()
  }

  formatProjectJson(source: string): string {
    return this.wasmLoaded ? migrate_project_json(source) : source
  }

  raycast(origin: Vec2, direction: Vec2, distance: number, mask = 0xffff_ffff): PhysicsQueryHit2D | null {
    this.prepareQuery()
    if (!this.runtime) return null
    return this.mapQueryHit(JSON.parse(this.runtime.raycast_json(origin.x, origin.y, direction.x, direction.y, distance, mask >>> 0)) as WasmQueryHit | null)
  }

  raycastAll(origin: Vec2, direction: Vec2, distance: number, mask = 0xffff_ffff): PhysicsQueryHit2D[] {
    this.prepareQuery()
    if (!this.runtime) return []
    const mapped = (JSON.parse(this.runtime.raycast_all_json(origin.x, origin.y, direction.x, direction.y, distance, mask >>> 0)) as WasmQueryHit[]).flatMap(hit => {
      const mapped = this.mapQueryHit(hit)
      return mapped ? [mapped] : []
    })
    const seen = new Set<string>()
    return mapped.filter(hit => !seen.has(hit.entityUuid) && Boolean(seen.add(hit.entityUuid)))
  }

  overlapPoint(point: Vec2, mask = 0xffff_ffff): string[] {
    this.prepareQuery()
    return this.runtime ? this.mapQueryHandles(JSON.parse(this.runtime.overlap_point_json(point.x, point.y, mask >>> 0)) as number[]) : []
  }

  overlapCircle(center: Vec2, radius: number, mask = 0xffff_ffff): string[] {
    this.prepareQuery()
    return this.runtime ? this.mapQueryHandles(JSON.parse(this.runtime.overlap_circle_json(center.x, center.y, radius, mask >>> 0)) as number[]) : []
  }

  overlapBox(center: Vec2, size: Vec2, angle = 0, mask = 0xffff_ffff): string[] {
    this.prepareQuery()
    return this.runtime ? this.mapQueryHandles(JSON.parse(this.runtime.overlap_box_json(center.x, center.y, size.x, size.y, angle, mask >>> 0)) as number[]) : []
  }

  shapeCast(center: Vec2, size: Vec2, angle: number, direction: Vec2, distance: number, mask = 0xffff_ffff): PhysicsQueryHit2D | null {
    this.prepareQuery()
    if (!this.runtime) return null
    return this.mapQueryHit(JSON.parse(this.runtime.shape_cast_json(center.x, center.y, size.x, size.y, angle, direction.x, direction.y, distance, mask >>> 0)) as WasmQueryHit | null)
  }

  nearest(center: Vec2, maximumDistance: number, mask = 0xffff_ffff, samples = 64): PhysicsQueryHit2D | null {
    const distance = Math.max(0, finiteNumber(maximumDistance, 0))
    const count = Math.min(256, Math.max(8, Math.round(finiteNumber(samples, 64))))
    let best: PhysicsQueryHit2D | null = null
    for (let index = 0; index < count; index++) {
      const angle = index * Math.PI * 2 / count
      const hit = this.raycast(center, { x: Math.cos(angle), y: Math.sin(angle) }, distance, mask)
      if (hit && (!best || hit.distance < best.distance || (hit.distance === best.distance && hit.entityUuid < best.entityUuid))) best = hit
    }
    return best
  }

  contactQuery(entityUuid: string): RuntimePhysicsEvent[] {
    return this.events.filter(event => event.firstEntityUuid === entityUuid || event.secondEntityUuid === entityUuid)
  }

  teleport(entity: Entity, position: Vec2, angle = worldTransform(entity, this.entities).rotation): boolean {
    const transform = worldTransform(entity, this.entities)
    const target = { x: finiteNumber(position.x, transform.position.x), y: finiteNumber(position.y, transform.position.y) }
    setWorldTransform(entity, { ...transform, position: target, rotation: finiteNumber(angle, transform.rotation) }, this.entities)
    const handle = this.bodyHandles.get(entity.id)
    if (!this.runtime || handle === undefined) return true
    try {
      const runtime = this.runtime as unknown as { teleport_body: (handle: number, x: number, y: number, angle: number) => void }
      runtime.teleport_body(handle, target.x, target.y, finiteNumber(angle, transform.rotation))
      return true
    } catch { return false }
  }

  moveCharacterBox(
    entity: Entity,
    size: Vec2,
    displacement: Vec2,
    settings: { maxSlopeAngle: number; stepHeight: number; floorSnap: number; maxSlides: number; safeMargin: number; collisionMask: number }
  ): CharacterMoveResult2D | null {
    this.prepareQuery()
    const handle = this.bodyHandles.get(entity.id)
    if (!this.runtime || handle === undefined) return null
    const runtime = this.runtime as unknown as {
      move_character_box_json: (handle: number, width: number, height: number, dx: number, dy: number, slope: number, step: number, snap: number, slides: number, margin: number, mask: number) => string
    }
    const result = JSON.parse(runtime.move_character_box_json(
      handle,
      Math.abs(finiteNumber(size.x, 1)), Math.abs(finiteNumber(size.y, 1)),
      finiteNumber(displacement.x), finiteNumber(displacement.y),
      finiteNumber(settings.maxSlopeAngle, Math.PI / 4), Math.max(0, finiteNumber(settings.stepHeight)),
      Math.max(0, finiteNumber(settings.floorSnap)), Math.min(32, Math.max(1, Math.round(finiteNumber(settings.maxSlides, 4)))),
      Math.max(1e-9, finiteNumber(settings.safeMargin, 1e-5)), settings.collisionMask >>> 0
    )) as CharacterMoveResult2D & { error?: string }
    if (result.error) return null
    setWorldTransform(entity, {
      ...worldTransform(entity, this.entities),
      position: { x: result.position[0], y: result.position[1] }
    }, this.entities)
    const record = this.bodyRecords.get(handle)
    if (record) {
      record[2] = result.position[0]
      record[3] = result.position[1]
    }
    return result
  }

  applyTransientForce(entity: Entity, force: Vec2, torque = 0): boolean {
    this.prepareQuery()
    const handle = this.bodyHandles.get(entity.id)
    if (!this.runtime || handle === undefined) return false
    const runtime = this.runtime as unknown as { apply_transient_force: (handle: number, x: number, y: number, torque: number) => void }
    runtime.apply_transient_force(handle, finiteNumber(force.x), finiteNumber(force.y), finiteNumber(torque))
    return true
  }

  invalidateRuntime(): void {
    this.runtime?.clear()
    this.bodyHandles.clear()
    this.connectionHandles.clear()
    this.bodyRecords.clear()
    this.connectionRecords.clear()
    this.bodyOrders.clear()
    this.connectionOrders.clear()
    this.activeConnectionRecords = []
    this.activeBodies = []
    this.tileCollisionBodies = []
    this.tileCollisionOwners.clear()
    this.tileCollisionSignature = ''
    this.nextRuntimeHandle = 1
    this.timingSignature = ''
  }

  private allocateRuntimeHandle(): number {
    if (this.nextRuntimeHandle >= 0xffff_ffff) throw new Error('Runtime handle space is exhausted')
    return this.nextRuntimeHandle++
  }

  private prepareQuery(): void { if (this.wasmLoaded) this.synchronizeRuntime(this.lastSettings) }

  private entityForHandle(handle: number): Entity | null {
    const entity = this.activeBodies.find(candidate => this.bodyHandles.get(candidate.id) === handle) ?? null
    return entity ? this.tileCollisionOwners.get(entity.id) ?? entity : null
  }

  private mapQueryHit(hit: WasmQueryHit | null): PhysicsQueryHit2D | null {
    if (!hit) return null
    const entity = this.entityForHandle(hit.handle)
    if (!entity) return null
    return { entityUuid: entity.uuid, point: { x: finiteNumber(hit.point?.[0]), y: finiteNumber(hit.point?.[1]) }, normal: { x: finiteNumber(hit.normal?.[0]), y: finiteNumber(hit.normal?.[1]) }, distance: Math.max(0, finiteNumber(hit.distance)) }
  }

  private mapQueryHandles(handles: number[]): string[] {
    return [...new Set(handles.flatMap(handle => {
      const entity = this.entityForHandle(handle)
      return entity ? [entity.uuid] : []
    }))]
  }

  private synchronizeRuntime(settings: GlobalPhysicsSettings): void {
    const runtime = this.runtime
    if (!runtime) return
    this.rebuildTileCollisionBodies()
    this.activeBodies = this.entities.filter(entity => entity.enabled
      && entity.hasComponent('RigidBody2D') && entity.rigidBody.enabled
      && entity.getCollider() !== null && entity.collider.enabled
      && entity.collider.shapeModel !== 'Chain' && entity.collider.shapeModel !== 'ConcavePolygon').concat(this.tileCollisionBodies)
    const liveBodies = new Set<number>()
    this.activeBodies.forEach((entity, order) => {
      let handle = this.bodyHandles.get(entity.id)
      if (handle === undefined) {
        handle = this.allocateRuntimeHandle()
        this.bodyHandles.set(entity.id, handle)
      }
      liveBodies.add(entity.id)
      this.bodyScratch.fill(0)
      writeEntityRecord(this.bodyScratch, 0, entity, this.entities, settings, handle)
      const cached = this.bodyRecords.get(handle)
      if (!cached || this.bodyOrders.get(handle) !== order || !recordsEqual(cached, this.bodyScratch)) {
        runtime.upsert_body(handle, order, this.bodyScratch)
        this.storeRecord(this.bodyRecords, handle, this.bodyScratch)
        this.bodyOrders.set(handle, order)
      }
    })
    for (const [entityId, handle] of [...this.bodyHandles]) {
      if (liveBodies.has(entityId)) continue
      runtime.destroy_body(handle)
      this.bodyHandles.delete(entityId)
      this.bodyRecords.delete(handle)
      this.bodyOrders.delete(handle)
    }

    const runtimeConnections = [...this.connections, ...connectionsFromJointComponents(this.entities)]
    this.activeConnectionRecords = collectConnectionRecords(this.activeBodies, runtimeConnections, this.entities)
    const liveConnections = new Set<string>()
    this.activeConnectionRecords.forEach((record, order) => {
      const key = `${record.connection.uuid}:${record.segment}`
      liveConnections.add(key)
      let handle = this.connectionHandles.get(key)
      if (handle === undefined) {
        handle = this.allocateRuntimeHandle()
        this.connectionHandles.set(key, handle)
      }
      this.connectionScratch.fill(0)
      writeConnectionRecord(this.connectionScratch, 0, record, this.activeBodies, this.entities, handle)
      const cached = this.connectionRecords.get(handle)
      if (!cached || this.connectionOrders.get(handle) !== order || !recordsEqual(cached, this.connectionScratch)) {
        runtime.upsert_connection(handle, order, this.connectionScratch)
        this.storeRecord(this.connectionRecords, handle, this.connectionScratch)
        this.connectionOrders.set(handle, order)
      }
    })
    for (const [key, handle] of [...this.connectionHandles]) {
      if (liveConnections.has(key)) continue
      runtime.destroy_connection(handle)
      this.connectionHandles.delete(key)
      this.connectionRecords.delete(handle)
      this.connectionOrders.delete(handle)
    }
  }

  private configureTiming(settings: GlobalPhysicsSettings, paused: boolean): void {
    if (!this.runtime) return
    const profile = normalizePhysicsProfile(settings.profile ?? defaultPhysicsProfile())
    const tickRate = Math.min(1000, Math.max(1, finiteNumber(settings.tickRate, profile.tickRate)))
    const catchUp = Math.min(240, Math.max(1, Math.round(finiteNumber(settings.maxCatchUpSteps, profile.maxCatchUpSteps))))
    const timeScale = Math.min(100, Math.max(0, finiteNumber(settings.timeScale, 1)))
    const dropCode = profile.droppedTimePolicy === 'PreserveBacklog' ? 1 : profile.droppedTimePolicy === 'SlowMotion' ? 2 : 0
    const solverIterations = Math.max(profile.velocityIterations, profile.positionIterations)
    const signature = `${tickRate}:${catchUp}:${timeScale}:${paused}:${dropCode}:${profile.minimumSubsteps}:${solverIterations}:${profile.sleepLinearThreshold}:${profile.sleepAngularThreshold}:${profile.timeToSleep}`
    if (signature === this.timingSignature) return
    const runtime = this.runtime as unknown as {
      set_timing: (tickRate: number, catchUp: number, scale: number, paused: boolean, droppedPolicy: number) => void
      set_physics_quality: (substeps: number, iterations: number, sleepLinear: number, sleepAngular: number, timeToSleep: number) => void
    }
    runtime.set_timing(tickRate, catchUp, timeScale, paused, dropCode)
    runtime.set_physics_quality(profile.minimumSubsteps, solverIterations, profile.sleepLinearThreshold, profile.sleepAngularThreshold, profile.timeToSleep)
    this.timingSignature = signature
  }

  private rebuildTileCollisionBodies(): void {
    const tileMaps = this.entities.flatMap(entity => {
      const component = entity.getComponent<TileMap2D>('TileMap2D')
      return component?.enabled && !component.removed && entity.enabled ? [{ entity, component }] : []
    })
    const signature = `${assetState.generation}|${tileMaps.map(({ entity, component }) => {
      const transform = worldTransform(entity, this.entities)
      return [entity.uuid, component.revision, component.tileSetAsset, component.width, component.height, component.tileSize.x, component.tileSize.y, component.physicsLayer, component.collisionMask, transform.position.x, transform.position.y, transform.rotation, transform.scale.x, transform.scale.y].join(':')
    }).join('|')}`
    if (signature === this.tileCollisionSignature) return
    this.tileCollisionSignature = signature
    this.tileCollisionBodies = []
    this.tileCollisionOwners.clear()
    let syntheticId = -1
    for (const { entity, component } of tileMaps) {
      const transform = worldTransform(entity, this.entities)
      for (const descriptor of buildTileColliderDescriptors(component)) {
        const center = {
          x: descriptor.center.x * transform.scale.x,
          y: descriptor.center.y * transform.scale.y
        }
        const cosine = Math.cos(transform.rotation), sine = Math.sin(transform.rotation)
        const worldCenter = {
          x: transform.position.x + center.x * cosine - center.y * sine,
          y: transform.position.y + center.x * sine + center.y * cosine
        }
        const body = new BoxEntity(syntheticId--, worldCenter, descriptor.size)
        body.name = `${entity.name} collision`
        body.editorVisible = false
        body.renderer.enabled = false
        body.isStatic = true
        body.transform.rotation = transform.rotation
        body.transform.scale = { x: transform.scale.x, y: transform.scale.y }
        if (descriptor.vertices.length >= 3) body.vertices = descriptor.vertices.map(point => ({ ...point }))
        body.collider.physicsLayer = component.physicsLayer
        body.collider.collisionMask = component.collisionMask >>> 0
        body.collider.oneWay = descriptor.oneWay
        body.collider.oneWayNormal = { x: 0, y: 1 }
        this.tileCollisionBodies.push(body)
        this.tileCollisionOwners.set(body.id, entity)
      }
    }
  }

  private readRuntimeState(alpha: number, settings: GlobalPhysicsSettings): void {
    if (!this.runtime) return
    const stateLength = this.runtime.state_len()
    const bodyLength = this.runtime.body_state_len()
    this.stateBuffer = ensureBuffer(this.stateBuffer, stateLength)
    this.previousBodyBuffer = ensureBuffer(this.previousBodyBuffer, bodyLength)
    if (this.runtime.copy_state(this.stateBuffer) !== stateLength) return
    const previousLength = this.runtime.copy_previous_body_state(this.previousBodyBuffer)
    this.activeBodies.forEach((entity, index) => {
      readEntityRecord(this.stateBuffer, index, entity, this.entities)
      if (settings.interpolation === 'Interpolate' && previousLength === bodyLength && alpha < 1) {
        const offset = index * PHYSICS_STRIDE
        const transform = worldTransform(entity, this.entities)
        setWorldTransform(entity, {
          ...transform,
          position: {
            x: interpolate(this.previousBodyBuffer[offset + 2], this.stateBuffer[offset + 2], alpha),
            y: interpolate(this.previousBodyBuffer[offset + 3], this.stateBuffer[offset + 3], alpha)
          },
          rotation: interpolateAngle(this.previousBodyBuffer[offset + 14], this.stateBuffer[offset + 14], alpha)
        }, this.entities)
      }
      const handle = this.bodyHandles.get(entity.id)
      if (handle !== undefined) {
        this.bodyScratch.fill(0)
        writeEntityRecord(this.bodyScratch, 0, entity, this.entities, settings, handle)
        this.storeRecord(this.bodyRecords, handle, this.bodyScratch)
      }
    })
    this.activeConnectionRecords.forEach((record, index) => {
      readConnectionRecord(this.stateBuffer, bodyLength, index, record)
      const handle = this.connectionHandles.get(`${record.connection.uuid}:${record.segment}`)
      if (handle !== undefined) {
        this.connectionScratch.fill(0)
        writeConnectionRecord(this.connectionScratch, 0, record, this.activeBodies, this.entities, handle)
        this.storeRecord(this.connectionRecords, handle, this.connectionScratch)
      }
    })
  }

  private readDiagnostics(): void {
    if (!this.runtime) return
    try {
      this.diagnostics = JSON.parse(this.runtime.diagnostics_json()) as EngineDiagnostics
      const rawEvents = JSON.parse(this.runtime.drain_events_json()) as RuntimePhysicsEvent[]
      const entityByHandle = new Map<number, Entity>()
      for (const entity of this.activeBodies) {
        const handle = this.bodyHandles.get(entity.id)
        if (handle !== undefined) entityByHandle.set(handle, this.tileCollisionOwners.get(entity.id) ?? entity)
      }
      const connectionByHandle = new Map<number, Connection>()
      for (const record of this.activeConnectionRecords) {
        const handle = this.connectionHandles.get(`${record.connection.uuid}:${record.segment}`)
        if (handle !== undefined) connectionByHandle.set(handle, record.connection)
      }
      this.events = stablePhysicsEventOrder(rawEvents.map(event => ({
        ...event,
        firstEntityUuid: typeof event.first === 'number' ? entityByHandle.get(event.first)?.uuid : undefined,
        secondEntityUuid: typeof event.second === 'number' ? entityByHandle.get(event.second)?.uuid : undefined,
        entityUuid: typeof event.handle === 'number' && (event.type === 'bodySleeping' || event.type === 'bodyWoke') ? entityByHandle.get(event.handle)?.uuid : undefined,
        connectionUuid: typeof event.handle === 'number' && event.type === 'jointBroken' ? connectionByHandle.get(event.handle)?.uuid : undefined
      })))
      recordPhysicsTelemetry(this.entities, this.connections, this.events, this.diagnostics, this.lastSettings.tickRate, this.lastSettings.profile)
    } catch (error) {
      console.warn('Nova_A received malformed runtime diagnostics', error)
    }
  }

  private storeRecord(records: Map<number, Float64Array>, handle: number, source: Float64Array): void {
    const cached = records.get(handle)
    if (cached) cached.set(source)
    else records.set(handle, source.slice())
  }
}

function recordsEqual(first: Float64Array, second: Float64Array): boolean {
  if (first.length !== second.length) return false
  for (let index = 0; index < first.length; index++) if (!Object.is(first[index], second[index])) return false
  return true
}

function ensureBuffer(buffer: Float64Array, length: number): Float64Array {
  return buffer.length === length ? buffer : new Float64Array(length)
}

function interpolate(from: number, to: number, alpha: number): number {
  return from + (to - from) * Math.min(1, Math.max(0, finiteNumber(alpha, 1)))
}

function interpolateAngle(from: number, to: number, alpha: number): number {
  const difference = ((to - from + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
  return from + difference * Math.min(1, Math.max(0, finiteNumber(alpha, 1)))
}
