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
  | 'SpriteRenderer2D'
  | 'TextRenderer2D'
  | 'Camera2D'
  | 'Script2D'
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
  strokeColor = { r: 0, g: 90, b: 155 }
  strokeOpacity = 100
  strokeWidth = 1
  material = 'Default'
  filterMode: 'Nearest' | 'Linear' = 'Linear'
  textureAsset: string | null = null
  texture: string | null = null
  textureImage?: HTMLImageElement
  sortingLayer = 1
  orderInLayer = 0

  constructor(shape: RendererShape2D, uuid?: string) {
    super(uuid)
    this.shape = shape
  }
}

export class SpriteRenderer2D extends ComponentBase {
  readonly kind = 'SpriteRenderer2D' as const
  spriteAsset: string | null = null
  tint = { r: 255, g: 255, b: 255 }
  opacity = 100
  flipX = false
  flipY = false
  pivot: Vec2 = { x: .5, y: .5 }
  size: Vec2 = { x: 1, y: 1 }
  sortingLayer = 1
  orderInLayer = 0
  material = 'Default'
  filterMode: 'Nearest' | 'Linear' = 'Linear'

  constructor(uuid?: string) { super(uuid) }
}

export class TextRenderer2D extends ComponentBase {
  readonly kind = 'TextRenderer2D' as const
  text = 'Text'
  fontAsset: string | null = null
  fontFamily = 'Segoe UI Variable Text, sans-serif'
  fontSize = 1
  fontWeight = 500
  lineHeight = 1.2
  align: CanvasTextAlign = 'center'
  color = { r: 255, g: 255, b: 255 }
  opacity = 100
  maxWidth = 0
  sortingLayer = 1
  orderInLayer = 0
  material = 'Default'

  constructor(uuid?: string) { super(uuid) }
}

export class Camera2D extends ComponentBase {
  readonly kind = 'Camera2D' as const
  active = true
  orthographicSize = 10
  viewport = { x: 0, y: 0, width: 1, height: 1 }
  backgroundColor = { r: 17, g: 21, b: 27 }
  nearSortingLayer = -1_000_000
  farSortingLayer = 1_000_000
  pixelPerfect = false
  zoom = 1

  constructor(uuid?: string) { super(uuid) }
}

export type ScriptPropertyValue = number | string | boolean

export class Script2D extends ComponentBase {
  readonly kind = 'Script2D' as const
  scriptAsset: string | null = null
  properties: Record<string, ScriptPropertyValue> = {}
  lastError: string | null = null

  constructor(uuid?: string) { super(uuid) }
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

export type EntityComponent = ShapeRenderer2D | SpriteRenderer2D | TextRenderer2D | Camera2D | Script2D | RigidBody2D | Collider2D

function clonePersistedValue<T>(value: T): T {
  if (value === undefined) return value
  return JSON.parse(JSON.stringify(value)) as T
}

export function copyComponentValues<T extends Component2D>(component: T): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(component)) {
    if (key === 'uuid' || key === 'kind' || key === 'removed' || key === 'textureImage' || key === 'lastError') continue
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
