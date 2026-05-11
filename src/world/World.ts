import { Entity } from './Entity'
import { BoxEntity } from './BoxEntity'
import { CircleEntity } from './CircleEntity'
import { TriangleEntity } from './TriangleEntity'
import type { Vec2 } from './types'
import init, { step_physics } from '../../nova_core/pkg/nova_core.js'

export class World {
  private nextId = 1
  entities: Entity[] = []
  private wasmLoaded = false

  constructor() { init().then(() => { this.wasmLoaded = true }) }

  resetId() { this.nextId = 1 }

  addBox(pos: Vec2, size: Vec2) { const b = new BoxEntity(this.nextId++, pos, size); this.entities.push(b); return b }
  addCircle(pos: Vec2, rx: number, ry?: number) { const c = new CircleEntity(this.nextId++, pos, rx, ry); this.entities.push(c); return c }
  addTriangle(pos: Vec2, size: Vec2) { const t = new TriangleEntity(this.nextId++, pos, size); this.entities.push(t); return t }

  update(dt: number, isRunning: boolean, globalSettings: any) {
    if (!isRunning || !this.wasmLoaded || this.entities.length === 0) return

    const scaledDt = dt * globalSettings.timeScale
    const stride = 42 // UPGRADED: 8 extra floats for 4 (x,y) vertices!
    const data = new Float32Array(this.entities.length * stride)

    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i]
      const idx = i * stride
      data[idx] = e.id
      data[idx + 1] = e.shapeType === 'Circle' ? 1 : 0 
      data[idx + 2] = e.transform.position.x; data[idx + 3] = e.transform.position.y
      data[idx + 4] = e.velocity.x; data[idx + 5] = e.velocity.y
      data[idx + 6] = e.acceleration.x; data[idx + 7] = e.acceleration.y
      data[idx + 8] = e.mass; data[idx + 9] = e.isStatic ? 1.0 : 0.0
      data[idx + 10] = e.restitution; data[idx + 11] = e.dynamicFriction
      
      if (e.shapeType === 'Circle') {
        data[idx + 12] = (e as any).radiusX * e.transform.scale.x; data[idx + 13] = (e as any).radiusY * e.transform.scale.y
      } else {
        const vs = (e as any).vertices
        let minX = Infinity, minY = Infinity, mxX = -Infinity, mxY = -Infinity
        for (const v of vs) {
            if (v.x < minX) minX = v.x; if (v.y < minY) minY = v.y
            if (v.x > mxX) mxX = v.x; if (v.y > mxY) mxY = v.y
        }
        data[idx + 12] = (mxX - minX) * e.transform.scale.x; data[idx + 13] = (mxY - minY) * e.transform.scale.y 
      }

      data[idx + 14] = e.transform.rotation; data[idx + 15] = e.angularVelocity
      data[idx + 16] = e.torque; data[idx + 17] = e.gravityScale
      data[idx + 18] = e.linearDamping; data[idx + 19] = e.angularDamping
      data[idx + 20] = e.staticFriction; data[idx + 21] = e.force.x; data[idx + 22] = e.force.y
      data[idx + 23] = e.gravity; data[idx + 24] = e.isKinematic ? 1.0 : 0.0
      data[idx + 25] = e.autoInertia ? 1.0 : 0.0; data[idx + 26] = e.inertia
      data[idx + 27] = e.restitutionThreshold; data[idx + 28] = e.isSensor ? 1.0 : 0.0
      data[idx + 29] = 0; data[idx + 30] = 0; data[idx + 31] = 0; data[idx + 32] = 0; 
      data[idx + 33] = e.layer 

      // NEW: Send Exact Vertices to Rust!
      for (let k = 34; k < 42; k++) data[idx + k] = 0;
      if (e.shapeType === 'Box' || e.shapeType === 'Triangle') {
          const vs = (e as any).vertices;
          for (let v = 0; v < vs.length && v < 4; v++) {
              data[idx + 34 + v * 2] = vs[v].x * e.transform.scale.x;
              data[idx + 35 + v * 2] = vs[v].y * e.transform.scale.y;
          }
          if (vs.length === 3) { // Pad Triangles to 4 points for the WASM Loop
              data[idx + 40] = vs[2].x * e.transform.scale.x;
              data[idx + 41] = vs[2].y * e.transform.scale.y;
          }
      }
    }

    const newData = step_physics(data, scaledDt, globalSettings.gravity, globalSettings.airFriction)

    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i]
      const idx = i * stride
      e.transform.position.x = newData[idx + 2]; e.transform.position.y = newData[idx + 3]
      e.velocity.x = newData[idx + 4]; e.velocity.y = newData[idx + 5]
      e.transform.rotation = newData[idx + 14]; e.angularVelocity = newData[idx + 15]
      e.contactCount = newData[idx + 29]; e.contactNormal.x = newData[idx + 30]
      e.contactNormal.y = newData[idx + 31]; e.penetrationDepth = newData[idx + 32]
    }
  }
}