import { Entity } from './Entity'
import { BoxEntity } from './BoxEntity'
import { CircleEntity } from './CircleEntity'
import { TriangleEntity } from './TriangleEntity'
import type { Vec2 } from './types'

// Import the Rust WASM module
import init, { step_physics } from '../../nova_core/pkg/nova_core.js'

export class World {
  private nextId = 1
  entities: Entity[] = []
  private wasmLoaded = false

  constructor() {
    // Initialize WASM asynchronously when the world is created
    init().then(() => {
      this.wasmLoaded = true
      console.log("Rust Physics Engine Initialized!")
    })
  }

  addBox(pos: Vec2, size: Vec2) {
    const box = new BoxEntity(this.nextId++, pos, size)
    this.entities.push(box)
    return box
  }

  addCircle(pos: Vec2, rx: number, ry?: number) {
    const circle = new CircleEntity(this.nextId++, pos, rx, ry)
    this.entities.push(circle)
    return circle
  }

  addTriangle(pos: Vec2, size: Vec2) {
    const triangle = new TriangleEntity(this.nextId++, pos, size)
    this.entities.push(triangle)
    return triangle
  }

  update(dt: number, isRunning: boolean, globalSettings: any) {
    if (!isRunning || !this.wasmLoaded || this.entities.length === 0) return

    const scaledDt = dt * globalSettings.timeScale
    const stride = 27 // UPGRADED: Full Rigid Body Stride
    const data = new Float32Array(this.entities.length * stride)

    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i]
      const idx = i * stride
      data[idx] = e.id
      data[idx + 1] = e.shapeType === 'Circle' ? 1 : 0 
      data[idx + 2] = e.transform.position.x
      data[idx + 3] = e.transform.position.y
      data[idx + 4] = e.velocity.x
      data[idx + 5] = e.velocity.y
      data[idx + 6] = e.acceleration.x
      data[idx + 7] = e.acceleration.y
      data[idx + 8] = e.mass
      data[idx + 9] = e.isStatic ? 1.0 : 0.0
      data[idx + 10] = e.restitution
      data[idx + 11] = e.dynamicFriction
      
      if (e.shapeType === 'Circle') {
        data[idx + 12] = (e as any).radiusX * e.transform.scale.x
        data[idx + 13] = (e as any).radiusY * e.transform.scale.y
      } else {
        const vertices = (e as any).vertices
        if (vertices && vertices.length > 0) {
          let minX = Infinity, minY = Infinity, mxX = -Infinity, mxY = -Infinity
          for (const v of vertices) {
            if (v.x < minX) minX = v.x; if (v.y < minY) minY = v.y
            if (v.x > mxX) mxX = v.x; if (v.y > mxY) mxY = v.y
          }
          data[idx + 12] = (mxX - minX) * e.transform.scale.x 
          data[idx + 13] = (mxY - minY) * e.transform.scale.y 
        }
      }

      data[idx + 14] = e.transform.rotation
      data[idx + 15] = e.angularVelocity
      data[idx + 16] = e.torque
      data[idx + 17] = e.gravityScale
      data[idx + 18] = e.linearDamping
      data[idx + 19] = e.angularDamping
      data[idx + 20] = e.staticFriction
      data[idx + 21] = e.force.x
      data[idx + 22] = e.force.y
      data[idx + 23] = e.gravity 
      data[idx + 24] = e.isKinematic ? 1.0 : 0.0
      data[idx + 25] = e.autoInertia ? 1.0 : 0.0
      data[idx + 26] = e.inertia
    }

    const newData = step_physics(data, scaledDt, globalSettings.gravity, globalSettings.airFriction)

    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i]
      const idx = i * stride
      e.transform.position.x = newData[idx + 2]
      e.transform.position.y = newData[idx + 3]
      e.velocity.x = newData[idx + 4]
      e.velocity.y = newData[idx + 5]
      e.transform.rotation = newData[idx + 14]
      e.angularVelocity = newData[idx + 15]
    }
  }
}