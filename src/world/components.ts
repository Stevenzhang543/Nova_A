import { normalizeUuid } from './identity'
import type { Vec2 } from './types'

export type BodyType2D = 'Dynamic' | 'Kinematic' | 'Static'
export type MassMode2D = 'Automatic' | 'Manual'
export type CollisionMode2D = 'Discrete' | 'Continuous'
export type TileCollision2D = 'None' | 'Box' | 'Polygon' | 'OneWay'
export type JointKind2D = 'FixedJoint2D' | 'DistanceJoint2D' | 'RevoluteJoint2D' | 'PrismaticJoint2D' | 'SpringJoint2D'
export type RendererShape2D = 'Rectangle' | 'Ellipse' | 'Polygon'
export type ColliderKind2D = 'BoxCollider2D' | 'EllipseCollider2D' | 'PolygonCollider2D'
export type ComponentKind =
  | 'Transform2D'
  | 'ShapeRenderer2D'
  | 'SpriteRenderer2D'
  | 'TextRenderer2D'
  | 'Camera2D'
  | 'Script2D'
  | 'Animator'
  | 'AudioSource'
  | 'AudioListener'
  | 'Canvas'
  | 'RectTransform'
  | 'Panel'
  | 'Image'
  | 'Text'
  | 'Button'
  | 'Slider'
  | 'ProgressBar'
  | 'Checkbox'
  | 'TextInput'
  | 'TileMap2D'
  | 'ParticleEmitter2D'
  | 'RigidBody2D'
  | ColliderKind2D
  | JointKind2D
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

export type AnimatorParameterValue = boolean | number

export class Animator extends ComponentBase {
  readonly kind = 'Animator' as const
  controllerAsset: string | null = null
  speed = 1
  autoplay = true
  currentState = ''
  parameters: Record<string, AnimatorParameterValue> = {}

  constructor(uuid?: string) { super(uuid) }
}

export type AudioBus = 'Master' | 'Music' | 'SFX' | 'UI'

export class AudioSource extends ComponentBase {
  readonly kind = 'AudioSource' as const
  audioClip: string | null = null
  volume = 1
  pitch = 1
  loop = false
  autoplay = false
  spatialBlend = 0
  minDistance = 1
  maxDistance = 50
  bus: AudioBus = 'SFX'

  constructor(uuid?: string) { super(uuid) }
}

export class AudioListener extends ComponentBase {
  readonly kind = 'AudioListener' as const
  active = true

  constructor(uuid?: string) { super(uuid) }
}

export type AnchorPreset =
  | 'top-left' | 'top' | 'top-right'
  | 'left' | 'center' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right' | 'stretch'

export class Canvas extends ComponentBase {
  readonly kind = 'Canvas' as const
  referenceSize: Vec2 = { x: 1920, y: 1080 }
  scaleWithScreen = true
  sortingOrder = 0

  constructor(uuid?: string) { super(uuid) }
}

export class RectTransform extends ComponentBase {
  readonly kind = 'RectTransform' as const
  anchorPreset: AnchorPreset = 'center'
  pivot: Vec2 = { x: .5, y: .5 }
  position: Vec2 = { x: 0, y: 0 }
  size: Vec2 = { x: 240, y: 80 }
  margins = { left: 0, top: 0, right: 0, bottom: 0 }

  constructor(uuid?: string) { super(uuid) }
}

export class Panel extends ComponentBase {
  readonly kind = 'Panel' as const
  color = { r: 35, g: 41, b: 52 }
  opacity = 92
  cornerRadius = 14

  constructor(uuid?: string) { super(uuid) }
}

export class Image extends ComponentBase {
  readonly kind = 'Image' as const
  spriteAsset: string | null = null
  tint = { r: 255, g: 255, b: 255 }
  opacity = 100
  preserveAspect = true

  constructor(uuid?: string) { super(uuid) }
}

export class Text extends ComponentBase {
  readonly kind = 'Text' as const
  text = 'Text'
  fontAsset: string | null = null
  fontFamily = 'Nunito Sans, Segoe UI Variable Text, sans-serif'
  fontSize = 24
  fontWeight = 600
  align: CanvasTextAlign = 'center'
  color = { r: 245, g: 248, b: 252 }
  opacity = 100

  constructor(uuid?: string) { super(uuid) }
}

export type ButtonVisualState = 'Normal' | 'Hovered' | 'Pressed' | 'Disabled'

export class Button extends ComponentBase {
  readonly kind = 'Button' as const
  interactable = true
  state: ButtonVisualState = 'Normal'
  normalColor = { r: 45, g: 106, b: 214 }
  hoveredColor = { r: 61, g: 126, b: 235 }
  pressedColor = { r: 31, g: 82, b: 174 }
  disabledColor = { r: 90, g: 97, b: 110 }
  onPressed = 'on_pressed'
  onHoverEnter = 'on_hover_enter'
  onHoverExit = 'on_hover_exit'

  constructor(uuid?: string) { super(uuid) }
}

export class Slider extends ComponentBase {
  readonly kind = 'Slider' as const
  min = 0
  max = 1
  value = .5
  wholeNumbers = false
  interactable = true

  constructor(uuid?: string) { super(uuid) }
}

export class ProgressBar extends ComponentBase {
  readonly kind = 'ProgressBar' as const
  min = 0
  max = 1
  value = .5
  fillColor = { r: 79, g: 150, b: 255 }
  backgroundColor = { r: 31, g: 37, b: 47 }

  constructor(uuid?: string) { super(uuid) }
}

export class Checkbox extends ComponentBase {
  readonly kind = 'Checkbox' as const
  checked = false
  interactable = true
  label = 'Checkbox'

  constructor(uuid?: string) { super(uuid) }
}

export class TextInput extends ComponentBase {
  readonly kind = 'TextInput' as const
  value = ''
  placeholder = 'Enter text…'
  maxLength = 256
  interactable = true
  password = false

  constructor(uuid?: string) { super(uuid) }
}

export class TileMap2D extends ComponentBase {
  readonly kind = 'TileMap2D' as const
  tileSetAsset: string | null = null
  width = 32
  height = 18
  tileSize: Vec2 = { x: 1, y: 1 }
  chunkSize = 32
  tiles: number[] = Array(32 * 18).fill(-1)
  tint = { r: 255, g: 255, b: 255 }
  opacity = 100
  sortingLayer = 0
  orderInLayer = 0
  material = 'Default'
  filterMode: 'Nearest' | 'Linear' = 'Nearest'
  physicsLayer = 0
  collisionMask = 1
  revision = 0

  constructor(uuid?: string) { super(uuid) }
}

export class ParticleEmitter2D extends ComponentBase {
  readonly kind = 'ParticleEmitter2D' as const
  textureAsset: string | null = null
  emissionRate = 20
  burst = 0
  lifetime = 1
  initialVelocityMin: Vec2 = { x: -1, y: 1 }
  initialVelocityMax: Vec2 = { x: 1, y: 3 }
  gravity: Vec2 = { x: 0, y: -9.80665 }
  rotationMin = 0
  rotationMax = Math.PI * 2
  angularVelocityMin = -1
  angularVelocityMax = 1
  startScale = 0.2
  endScale = 0
  startColor = { r: 255, g: 196, b: 92 }
  endColor = { r: 255, g: 76, b: 36 }
  startOpacity = 100
  endOpacity = 0
  maxParticles = 1000
  autoplay = true
  looping = true
  worldSpace = true
  sortingLayer = 0
  orderInLayer = 0
  material = 'Particles'
  blendMode: 'Alpha' | 'Additive' = 'Alpha'

  constructor(uuid?: string) { super(uuid) }
}

export class Joint2D extends ComponentBase {
  readonly kind: JointKind2D
  targetEntityUuid: string | null = null
  anchor: Vec2 = { x: 0, y: 0 }
  connectedAnchor: Vec2 = { x: 0, y: 0 }
  collideConnected = false
  distance = 1
  stiffness = 1200
  damping = 35
  axis: Vec2 = { x: 1, y: 0 }
  limitsEnabled = false
  lowerLimit = -1
  upperLimit = 1
  referenceOffset: Vec2 = { x: 0, y: 0 }
  referenceAngle = 0
  initialized = false

  constructor(kind: JointKind2D, uuid?: string) {
    super(uuid)
    this.kind = kind
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
  continuousCollision: CollisionMode2D = 'Discrete'
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
  oneWay = false
  oneWayNormal: Vec2 = { x: 0, y: 1 }
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

export type EntityComponent =
  | ShapeRenderer2D | SpriteRenderer2D | TextRenderer2D | Camera2D | Script2D
  | Animator | AudioSource | AudioListener | Canvas | RectTransform | Panel | Image
  | Text | Button | Slider | ProgressBar | Checkbox | TextInput
  | TileMap2D | ParticleEmitter2D | Joint2D | RigidBody2D | Collider2D

function clonePersistedValue<T>(value: T): T {
  if (value === undefined) return value
  return JSON.parse(JSON.stringify(value)) as T
}

export function copyComponentValues<T extends Component2D>(component: T): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(component)) {
    if (key === 'uuid' || key === 'kind' || key === 'removed' || key === 'textureImage' || key === 'lastError' || key === 'state') continue
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
