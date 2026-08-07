import { Entity } from './Entity'
import { BoxEntity } from './BoxEntity'
import { CircleEntity } from './CircleEntity'
import { TriangleEntity } from './TriangleEntity'
import type { Vec2 } from './types'
import { finiteNumber, normalizeEntity, syncMassFromDensity } from './geometry'
import {
  CONNECTION_STRIDE,
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

export const PHYSICS_STRIDE = 42

export interface GlobalPhysicsSettings {
  gravity: number
  airFriction: number
  timeScale: number
  tickRate: number
  maxCatchUpSteps: number
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

interface ConnectionRecord {
  connection: Connection
  segment: number
  bodyA: number
  bodyB: number
}

/** Writes one entity into the stable Float64 ABI shared with nova_core. */
function writeEntityRecord(data: Float64Array, entityIndex: number, entity: Entity, runtimeHandle = entity.id): void {
  normalizeEntity(entity)
  const index = entityIndex * PHYSICS_STRIDE
  data[index] = runtimeHandle
  data[index + 1] = entity.shapeType === 'Circle' ? 1 : 0
  data[index + 2] = entity.transform.position.x
  data[index + 3] = entity.transform.position.y
  data[index + 4] = entity.velocity.x
  data[index + 5] = entity.velocity.y
  data[index + 6] = entity.acceleration.x
  data[index + 7] = entity.acceleration.y
  data[index + 8] = entity.mass
  data[index + 9] = entity.isStatic ? 1 : 0
  data[index + 10] = entity.restitution
  data[index + 11] = entity.dynamicFriction

  if (entity instanceof CircleEntity) {
    data[index + 12] = entity.radiusX * entity.transform.scale.x
    data[index + 13] = entity.radiusY * entity.transform.scale.y
  } else if (entity instanceof BoxEntity || entity instanceof TriangleEntity) {
    const xs = entity.vertices.map(vertex => vertex.x * entity.transform.scale.x)
    const ys = entity.vertices.map(vertex => vertex.y * entity.transform.scale.y)
    data[index + 12] = Math.max(...xs) - Math.min(...xs)
    data[index + 13] = Math.max(...ys) - Math.min(...ys)
  }

  data[index + 14] = entity.transform.rotation
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
  data[index + 33] = entity.layer

  if (entity instanceof BoxEntity || entity instanceof TriangleEntity) {
    for (let vertexIndex = 0; vertexIndex < entity.vertices.length && vertexIndex < 4; vertexIndex++) {
      const vertex = entity.vertices[vertexIndex]
      data[index + 34 + vertexIndex * 2] = vertex.x * entity.transform.scale.x
      data[index + 35 + vertexIndex * 2] = vertex.y * entity.transform.scale.y
    }
    if (entity.vertices.length === 3) {
      data[index + 40] = entity.vertices[2].x * entity.transform.scale.x
      data[index + 41] = entity.vertices[2].y * entity.transform.scale.y
    }
  }
}

function readEntityRecord(output: Float64Array, entityIndex: number, entity: Entity): void {
  const index = entityIndex * PHYSICS_STRIDE
  entity.transform.position.x = finiteNumber(output[index + 2], entity.transform.position.x)
  entity.transform.position.y = finiteNumber(output[index + 3], entity.transform.position.y)
  entity.velocity.x = finiteNumber(output[index + 4], entity.velocity.x)
  entity.velocity.y = finiteNumber(output[index + 5], entity.velocity.y)
  entity.mass = finiteNumber(output[index + 8], entity.mass)
  entity.transform.rotation = finiteNumber(output[index + 14], entity.transform.rotation)
  entity.angularVelocity = finiteNumber(output[index + 15], entity.angularVelocity)
  entity.inertia = finiteNumber(output[index + 26], entity.inertia)
  entity.contactCount = Math.max(0, Math.round(finiteNumber(output[index + 29], 0)))
  entity.contactNormal.x = finiteNumber(output[index + 30], 0)
  entity.contactNormal.y = finiteNumber(output[index + 31], 0)
  entity.penetrationDepth = Math.max(0, finiteNumber(output[index + 32], 0))
}

function collectConnectionRecords(entities: Entity[], connections: Connection[]): ConnectionRecord[] {
  const entityIndexes = new Map(entities.map((entity, index) => [entity.id, index]))
  const records: ConnectionRecord[] = []
  for (const connection of connections) {
    const remainsActive = connection.breakState === 'intact'
      || (connection.collisionEnabled && connection.ropeNodes.length > 0 && connection.breakLink >= 0)
    if (!normalizeConnection(connection, entities) || !connectionSharesLayer(connection, entities) || !remainsActive) continue
    if (connection.breakState === 'intact' && connection.collisionEnabled && connection.ropeNodes.length === 0) {
      initializeRopeNodes(connection, entities)
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
function writeConnectionRecord(data: Float64Array, recordIndex: number, record: ConnectionRecord, entities: Entity[], runtimeHandle = record.connection.id): void {
  const { connection, segment, bodyA, bodyB } = record
  const anchorA = connection.anchors[segment]
  const anchorB = connection.anchors[segment + 1]
  const localA = scaledLocalAnchor(anchorA, entities[bodyA])
  const localB = scaledLocalAnchor(anchorB, entities[bodyB])
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
  private activeConnectionRecords: ConnectionRecord[] = []
  private timingSignature = ''
  wasmError: Error | null = null
  readonly wasmReady: Promise<void>
  diagnostics: EngineDiagnostics = {
    bodyCount: 0, connectionCount: 0, stepsLastFrame: 0, totalPhysicsSteps: 0,
    interpolationAlpha: 0, droppedSeconds: 0, eventCount: 0, configurationRebuilds: 0
  }
  events: Array<Record<string, unknown>> = []
  projectFormatVersion = 6
  projectEngineVersion = '1.2.0'

  constructor() {
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

  update(dt: number, isRunning: boolean, globalSettings: GlobalPhysicsSettings): EngineDiagnostics {
    if (!this.wasmLoaded || !this.runtime) return this.diagnostics
    this.synchronizeRuntime()
    this.configureTiming(globalSettings, !isRunning)
    if (isRunning && this.entities.length > 0) {
      this.runtime.advance(
        Math.min(Math.max(finiteNumber(dt, 0), 0), 0.25),
        finiteNumber(globalSettings.gravity, 9.8),
        Math.max(0, finiteNumber(globalSettings.airFriction, 0.01))
      )
      this.readRuntimeState(this.runtime.interpolation_alpha())
    }
    this.readDiagnostics()
    return this.diagnostics
  }

  singleStep(globalSettings: GlobalPhysicsSettings): EngineDiagnostics {
    if (!this.wasmLoaded || !this.runtime) return this.diagnostics
    this.synchronizeRuntime()
    this.configureTiming(globalSettings, true)
    this.runtime.single_step(
      finiteNumber(globalSettings.gravity, 9.8),
      Math.max(0, finiteNumber(globalSettings.airFriction, 0.01))
    )
    this.readRuntimeState(1)
    this.readDiagnostics()
    return this.diagnostics
  }

  formatProjectJson(source: string): string {
    return this.wasmLoaded ? migrate_project_json(source) : source
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
    this.nextRuntimeHandle = 1
    this.timingSignature = ''
  }

  private allocateRuntimeHandle(): number {
    if (this.nextRuntimeHandle >= 0xffff_ffff) throw new Error('Runtime handle space is exhausted')
    return this.nextRuntimeHandle++
  }

  private synchronizeRuntime(): void {
    const runtime = this.runtime
    if (!runtime) return
    const liveBodies = new Set<number>()
    this.entities.forEach((entity, order) => {
      let handle = this.bodyHandles.get(entity.id)
      if (handle === undefined) {
        handle = this.allocateRuntimeHandle()
        this.bodyHandles.set(entity.id, handle)
      }
      liveBodies.add(entity.id)
      this.bodyScratch.fill(0)
      writeEntityRecord(this.bodyScratch, 0, entity, handle)
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

    this.activeConnectionRecords = collectConnectionRecords(this.entities, this.connections)
    const liveConnections = new Set<string>()
    this.activeConnectionRecords.forEach((record, order) => {
      const key = `${record.connection.id}:${record.segment}`
      liveConnections.add(key)
      let handle = this.connectionHandles.get(key)
      if (handle === undefined) {
        handle = this.allocateRuntimeHandle()
        this.connectionHandles.set(key, handle)
      }
      this.connectionScratch.fill(0)
      writeConnectionRecord(this.connectionScratch, 0, record, this.entities, handle)
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
    const tickRate = Math.min(1000, Math.max(1, finiteNumber(settings.tickRate, 60)))
    const catchUp = Math.min(240, Math.max(1, Math.round(finiteNumber(settings.maxCatchUpSteps, 8))))
    const timeScale = Math.min(100, Math.max(0, finiteNumber(settings.timeScale, 1)))
    const signature = `${tickRate}:${catchUp}:${timeScale}:${paused}`
    if (signature === this.timingSignature) return
    this.runtime.set_timing(tickRate, catchUp, timeScale, paused)
    this.timingSignature = signature
  }

  private readRuntimeState(alpha: number): void {
    if (!this.runtime) return
    const stateLength = this.runtime.state_len()
    const bodyLength = this.runtime.body_state_len()
    this.stateBuffer = ensureBuffer(this.stateBuffer, stateLength)
    this.previousBodyBuffer = ensureBuffer(this.previousBodyBuffer, bodyLength)
    if (this.runtime.copy_state(this.stateBuffer) !== stateLength) return
    const previousLength = this.runtime.copy_previous_body_state(this.previousBodyBuffer)
    this.entities.forEach((entity, index) => {
      readEntityRecord(this.stateBuffer, index, entity)
      if (previousLength === bodyLength && alpha < 1) {
        const offset = index * PHYSICS_STRIDE
        entity.transform.position.x = interpolate(this.previousBodyBuffer[offset + 2], this.stateBuffer[offset + 2], alpha)
        entity.transform.position.y = interpolate(this.previousBodyBuffer[offset + 3], this.stateBuffer[offset + 3], alpha)
        entity.transform.rotation = interpolateAngle(this.previousBodyBuffer[offset + 14], this.stateBuffer[offset + 14], alpha)
      }
      const handle = this.bodyHandles.get(entity.id)
      if (handle !== undefined) {
        this.bodyScratch.fill(0)
        writeEntityRecord(this.bodyScratch, 0, entity, handle)
        this.storeRecord(this.bodyRecords, handle, this.bodyScratch)
      }
    })
    this.activeConnectionRecords.forEach((record, index) => {
      readConnectionRecord(this.stateBuffer, bodyLength, index, record)
      const handle = this.connectionHandles.get(`${record.connection.id}:${record.segment}`)
      if (handle !== undefined) {
        this.connectionScratch.fill(0)
        writeConnectionRecord(this.connectionScratch, 0, record, this.entities, handle)
        this.storeRecord(this.connectionRecords, handle, this.connectionScratch)
      }
    })
  }

  private readDiagnostics(): void {
    if (!this.runtime) return
    try {
      this.diagnostics = JSON.parse(this.runtime.diagnostics_json()) as EngineDiagnostics
      this.events = JSON.parse(this.runtime.drain_events_json()) as Array<Record<string, unknown>>
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
