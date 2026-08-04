import { Entity } from './Entity'
import { BoxEntity } from './BoxEntity'
import { CircleEntity } from './CircleEntity'
import { TriangleEntity } from './TriangleEntity'
import type { Vec2 } from './types'
import { finiteNumber, normalizeEntity, syncMassFromDensity } from './geometry'
import {
  CONNECTION_STRIDE,
  normalizeConnection,
  scaledLocalAnchor,
  type Connection
} from './Connection'
import init, { step_physics_with_connections } from '../../nova_core/pkg/nova_core.js'

export const PHYSICS_STRIDE = 42

export interface GlobalPhysicsSettings {
  gravity: number
  airFriction: number
  timeScale: number
}

export class World {
  private nextId = 1
  private nextConnectionId = 1
  entities: Entity[] = []
  connections: Connection[] = []
  private wasmLoaded = false
  wasmError: Error | null = null
  readonly wasmReady: Promise<void>

  constructor() {
    this.wasmReady = init()
      .then(() => { this.wasmLoaded = true })
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

  update(dt: number, isRunning: boolean, globalSettings: GlobalPhysicsSettings): void {
    if (!isRunning || !this.wasmLoaded || this.entities.length === 0) return

    const timeScale = Math.max(0, finiteNumber(globalSettings.timeScale, 1))
    const scaledDt = Math.min(Math.max(finiteNumber(dt, 0) * timeScale, 0), 0.25)
    if (scaledDt <= 0) return

    const data = new Float64Array(this.entities.length * PHYSICS_STRIDE)

    for (let entityIndex = 0; entityIndex < this.entities.length; entityIndex++) {
      const entity = this.entities[entityIndex]
      normalizeEntity(entity)
      const index = entityIndex * PHYSICS_STRIDE
      data[index] = entity.id
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

    const entityIndexes = new Map(this.entities.map((entity, index) => [entity.id, index]))
    const activeConnections = this.connections.filter(connection => {
      return normalizeConnection(connection, this.entities) && connection.breakState === 'intact'
    })
    activeConnections.forEach(connection => { connection.tension = 0; connection.strain = 0 })
    const segmentRecords: Array<{ connection: Connection; segment: number }> = []
    for (const connection of activeConnections) {
      for (let segment = 0; segment < connection.anchors.length - 1; segment++) {
        const bodyA = entityIndexes.get(connection.anchors[segment].entityId)
        const bodyB = entityIndexes.get(connection.anchors[segment + 1].entityId)
        if (bodyA === undefined || bodyB === undefined || bodyA === bodyB) continue
        segmentRecords.push({ connection, segment })
      }
    }
    const connectionData = new Float64Array(segmentRecords.length * CONNECTION_STRIDE)
    for (let recordIndex = 0; recordIndex < segmentRecords.length; recordIndex++) {
      const { connection, segment } = segmentRecords[recordIndex]
      const anchorA = connection.anchors[segment]
      const anchorB = connection.anchors[segment + 1]
      const entityA = this.entities[entityIndexes.get(anchorA.entityId)!]
      const entityB = this.entities[entityIndexes.get(anchorB.entityId)!]
      const localA = scaledLocalAnchor(anchorA, entityA)
      const localB = scaledLocalAnchor(anchorB, entityB)
      const index = recordIndex * CONNECTION_STRIDE
      connectionData[index] = connection.id
      connectionData[index + 1] = entityIndexes.get(anchorA.entityId)!
      connectionData[index + 2] = entityIndexes.get(anchorB.entityId)!
      connectionData[index + 3] = localA.x
      connectionData[index + 4] = localA.y
      connectionData[index + 5] = localB.x
      connectionData[index + 6] = localB.y
      connectionData[index + 7] = connection.restLengths[segment]
      connectionData[index + 8] = connection.stretchable ? 1 : 0
      connectionData[index + 9] = connection.bendable ? 1 : 0
      connectionData[index + 10] = connection.stiffness
      connectionData[index + 11] = connection.damping
      connectionData[index + 12] = connection.maxStretchRatio
      connectionData[index + 13] = connection.bendingToleranceMass
      connectionData[index + 14] = connection.stretchingToleranceMass
      const manualBend = connection.style === 'manual'
        ? Math.max(0, ...(connection.manualSegments[segment] ?? []).map(point => Math.abs(point.y)))
        : 0
      connectionData[index + 15] = connection.style === 'curved' ? Math.abs(connection.curvature) : manualBend
      connectionData[index + 16] = 1
    }

    const output = step_physics_with_connections(
      data,
      connectionData,
      scaledDt,
      finiteNumber(globalSettings.gravity, 9.8),
      Math.max(0, finiteNumber(globalSettings.airFriction, 0.01))
    )
    const expectedLength = data.length + connectionData.length
    if (output.length !== expectedLength) {
      this.wasmError = new Error(`Physics output length ${output.length} did not match expected length ${expectedLength}`)
      console.error(this.wasmError)
      return
    }

    for (let entityIndex = 0; entityIndex < this.entities.length; entityIndex++) {
      const entity = this.entities[entityIndex]
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

    const connectionOffset = data.length
    for (let recordIndex = 0; recordIndex < segmentRecords.length; recordIndex++) {
      const { connection } = segmentRecords[recordIndex]
      const index = connectionOffset + recordIndex * CONNECTION_STRIDE
      const breakCode = Math.round(finiteNumber(output[index + 17]))
      connection.tension = Math.max(connection.tension, finiteNumber(output[index + 18]))
      connection.strain = Math.max(connection.strain, finiteNumber(output[index + 19]))
      if (breakCode === 1) connection.breakState = 'snapped'
      if (breakCode === 2) connection.breakState = 'torn'
    }
  }
}
