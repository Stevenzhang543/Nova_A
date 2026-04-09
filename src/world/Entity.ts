import { Transform } from './Transform'
import type { Vec2 } from './types'

export abstract class Entity {
  readonly id: number
  name: string
  readonly shapeType: string
  transform = new Transform()
  
  // Appearance
  color = { r: 0, g: 180, b: 255 }
  transparency = 100
  
  // Motion
  velocity: Vec2 = { x: 0, y: 0 }
  angularVelocity = 0
  linearDamping = 0.0
  angularDamping = 0.0
  
  // Mass & Behavior
  mass = 1.0
  autoInertia = true
  inertia = 100.0
  gravityScale = 1.0
  
  // Forces
  force: Vec2 = { x: 0, y: 0 }
  torque = 0
  gravity = 0.0 // FIX: Default 0.0
  acceleration: Vec2 = { x: 0, y: 0 } 
  
  // Materials
  restitution = 0.0 // FIX: Default 0.00
  staticFriction = 0.0 // FIX: Default 0.00
  dynamicFriction = 0.0 // FIX: Default 0.00
  
  // States
  isStatic = false
  isKinematic = false

  constructor(id: number, name = 'Entity') {
    this.id = id
    this.name = name
    this.shapeType = name
  }
}