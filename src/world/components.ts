import { normalizeUuid } from './identity'
import type { Vec2 } from './types'

export type BodyType2D = 'Dynamic' | 'Kinematic' | 'Static'
export type MassMode2D = 'Automatic' | 'Manual'
export type CollisionMode2D = 'Discrete' | 'Continuous'
export type RendererShape2D = 'Rectangle' | 'Ellipse' | 'Polygon'
export type ColliderKind2D = 'BoxCollider2D' | 'EllipseCollider2D' | 'PolygonCollider2D'
export type ComponentKind =
  | 'Transform2D'
  | 'ShapeRenderer2D'
  | 'RigidBody2D'
  | ColliderKind2D
  | 'FixedJoint2D'
  | 'Rope2D'

export interface Component2D {
  readonly uuid: string
  readonly kind: ComponentKind
  enabled: boolean
  removed: boolean
}

abstract class ComponentBase implements Component2D {
  readonly uuid: string
  abstract readonly kind: ComponentKind
  enabled = true
  removed = false

  protected constructor(uuid?: string) {
    this.uuid = normalizeUuid(uuid)
  }
}

export class ShapeRenderer2D extends ComponentBase {
  readonly kind = 'ShapeRenderer2D' as const
  shape: RendererShape2D
  vertices: Vec2[] = []
  radiusX = 1
  radiusY = 1
  color = { r: 0, g: 180, b: 255 }
  opacity = 100
  texture: string | null = null
  textureImage?: HTMLImageElement
  sortingLayer = 1
  orderInLayer = 0

  constructor(shape: RendererShape2D, uuid?: string) {
    super(uuid)
    this.shape = shape
  }
}

export class RigidBody2D extends ComponentBase {
  readonly kind = 'RigidBody2D' as const
  bodyType: BodyType2D = 'Dynamic'
  massMode: MassMode2D = 'Automatic'
  density = 1
  mass = 1
  autoInertia = true
  inertia = 100
  gravityScale = 1
  localGravity = 0
  velocity: Vec2 = { x: 0, y: 0 }
  acceleration: Vec2 = { x: 0, y: 0 }
  angularVelocity = 0
  linearDamping = 0
  angularDamping = 0
  force: Vec2 = { x: 0, y: 0 }
  torque = 0
  continuousCollision: CollisionMode2D = 'Continuous'
  sleepingAllowed = true
  sleeping = false
  sleepTimer = 0
  freezeRotation = false
  contactCount = 0
  contactNormal: Vec2 = { x: 0, y: 0 }
  penetrationDepth = 0

  constructor(uuid?: string) {
    super(uuid)
  }
}

export interface PhysicsMaterial2D {
  restitution: number
  restitutionThreshold: number
  staticFriction: number
  dynamicFriction: number
}

export class Collider2D extends ComponentBase {
  readonly kind: ColliderKind2D
  offset: Vec2 = { x: 0, y: 0 }
  rotation = 0
  size: Vec2 = { x: 1, y: 1 }
  radiusX = 1
  radiusY = 1
  vertices: Vec2[] = []
  sensor = false
  physicsLayer = 0
  collisionMask = 1
  material: PhysicsMaterial2D = {
    restitution: 0,
    restitutionThreshold: 1,
    staticFriction: 0,
    dynamicFriction: 0
  }

  constructor(kind: ColliderKind2D, uuid?: string) {
    super(uuid)
    this.kind = kind
  }
}

export type EntityComponent = ShapeRenderer2D | RigidBody2D | Collider2D

function clonePersistedValue<T>(value: T): T {
  if (value === undefined) return value
  return JSON.parse(JSON.stringify(value)) as T
}

export function copyComponentValues<T extends Component2D>(component: T): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(component)) {
    if (key === 'uuid' || key === 'kind' || key === 'removed' || key === 'textureImage') continue
    values[key] = clonePersistedValue(value)
  }
  return values
}

export function pasteComponentValues(component: Component2D, values: Record<string, unknown>): void {
  const target = component as unknown as Record<string, unknown>
  for (const [key, value] of Object.entries(clonePersistedValue(values))) {
    if (key === 'uuid' || key === 'kind' || key === 'removed') continue
    if (key in target) target[key] = value
  }
}
