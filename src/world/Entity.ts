import { Transform } from './Transform'
import type { Vec2 } from './types'
import { normalizeUuid } from './identity'

export abstract class Entity {
  readonly id: number
  readonly uuid: string
  name: string
  readonly shapeType: string
  transform = new Transform()
  
  layer = 1 
  
  color = { r: 0, g: 180, b: 255 }
  transparency = 100
  
  // NEW: Image Textures
  texture: string | null = null
  textureImage?: HTMLImageElement // Non-serialized cache for Canvas rendering
  
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

  constructor(id: number, name = 'Entity', uuid?: string) {
    this.id = id
    this.uuid = normalizeUuid(uuid)
    this.name = name
    this.shapeType = name
  }
}
