import { Transform } from './Transform'
import type { Vec2 } from './types'

export abstract class Entity {
  readonly id: number
  name: string
  readonly shapeType: string
  transform = new Transform()
  
  layer = 1 // NEW: Layer System Property
  
  color = { r: 0, g: 180, b: 255 }
  transparency = 100
  
  velocity: Vec2 = { x: 0, y: 0 }
  angularVelocity = 0
  linearDamping = 0.0
  angularDamping = 0.0
  
  density = 1.0
  mass = 1.0
  autoInertia = true
  inertia = 100.0
  gravityScale = 1.0
  
  force: Vec2 = { x: 0, y: 0 }
  torque = 0
  gravity = 0.0 
  acceleration: Vec2 = { x: 0, y: 0 } 
  
  restitution = 0.0 
  restitutionThreshold = 1.0 
  staticFriction = 0.0 
  dynamicFriction = 0.0 
  isSensor = false 
  
  isStatic = false
  isKinematic = false

  contactCount = 0
  contactNormal: Vec2 = { x: 0, y: 0 }
  penetrationDepth = 0

  constructor(id: number, name = 'Entity') {
    this.id = id
    this.name = name
    this.shapeType = name
  }
}