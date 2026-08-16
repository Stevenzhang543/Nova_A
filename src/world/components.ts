import { normalizeUuid } from './identity'
import type { Vec2 } from './types'

export type BodyType2D = 'Dynamic' | 'Kinematic' | 'Static'
export type MassMode2D = 'Automatic' | 'Manual'
export type CollisionMode2D = 'Discrete' | 'Continuous'
export type TileCollision2D = 'None' | 'Box' | 'Polygon' | 'OneWay'
export type AreaEffectKind2D = 'Gravity' | 'Wind' | 'Drag' | 'Buoyancy' | 'Damage' | 'Signal'
export type NavigationAlgorithm2D = 'AStar' | 'FlowField'
export type JointKind2D = 'FixedJoint2D' | 'DistanceJoint2D' | 'RevoluteJoint2D' | 'PrismaticJoint2D' | 'SpringJoint2D'
export type RendererShape2D = 'Rectangle' | 'Ellipse' | 'Polygon'
export type LightKind2D = 'Point' | 'Spot' | 'Directional' | 'Area'
export type ColliderKind2D = 'BoxCollider2D' | 'EllipseCollider2D' | 'PolygonCollider2D'
export type ComponentKind =
  | 'Transform2D'
  | 'ShapeRenderer2D'
  | 'SpriteRenderer2D'
  | 'TextRenderer2D'
  | 'Camera2D'
  | 'Script2D'
  | 'Animator'
  | 'Skeleton2D'
  | 'TimelinePlayer'
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
  | 'CharacterBody2D'
  | 'Area2D'
  | 'AreaEffector2D'
  | 'NavigationRegion2D'
  | 'NavigationObstacle2D'
  | 'NavigationAgent2D'
  | 'BehaviorTree2D'
  | 'StateMachine2D'
  | 'WorldChunk2D'
  | 'Portal2D'
  | 'ObjectPool2D'
  | 'ParticleEmitter2D'
  | 'Light2D'
  | 'ShadowCaster2D'
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
  normalMapAsset: string | null = null
  lightMask = 0xffff_ffff
  nineSlice = { enabled: false, left: 0, top: 0, right: 0, bottom: 0 }

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
  priority = 0
  stackOrder = 0
  cullingMask = 0xffff_ffff
  clearColor = true
  renderTexture = ''

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
  layerWeights: Record<string, number> = {}

  constructor(uuid?: string) { super(uuid) }
}

export interface BonePose2D {
  boneId: string
  position: Vec2
  rotation: number
  scale: Vec2
}

export class Skeleton2D extends ComponentBase {
  readonly kind = 'Skeleton2D' as const
  rigAsset: string | null = null
  skinAsset: string | null = null
  pose: BonePose2D[] = []
  previewEnabled = true

  constructor(uuid?: string) { super(uuid) }
}

export class TimelinePlayer extends ComponentBase {
  readonly kind = 'TimelinePlayer' as const
  timelineAsset: string | null = null
  autoplay = true
  loop = false
  speed = 1
  currentTime = 0
  playing = false

  constructor(uuid?: string) { super(uuid) }
}

export type AudioBus = string
export type AudioAttenuationCurve = 'Linear' | 'Inverse' | 'Exponential' | 'Custom'

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
  attenuationCurve: AudioAttenuationCurve = 'Linear'
  customAttenuation: Array<{ distance: number; gain: number }> = [{ distance: 0, gain: 1 }, { distance: 1, gain: 0 }]
  voicePriority = 50
  streamOverride: 'ImportSetting' | 'Stream' | 'Buffer' = 'ImportSetting'

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
  safeArea = false
  safeAreaInsets = { left: 0, top: 0, right: 0, bottom: 0 }
  themeAsset: string | null = null

  constructor(uuid?: string) { super(uuid) }
}

export class RectTransform extends ComponentBase {
  readonly kind = 'RectTransform' as const
  anchorPreset: AnchorPreset = 'center'
  pivot: Vec2 = { x: .5, y: .5 }
  position: Vec2 = { x: 0, y: 0 }
  size: Vec2 = { x: 240, y: 80 }
  margins = { left: 0, top: 0, right: 0, bottom: 0 }
  horizontalPolicy: 'Fixed' | 'Fill' | 'Content' = 'Fixed'
  verticalPolicy: 'Fixed' | 'Fill' | 'Content' = 'Fixed'
  minSize: Vec2 = { x: 0, y: 0 }
  maxSize: Vec2 = { x: 100_000, y: 100_000 }
  aspectRatio = 0
  aspectConstraint: 'None' | 'Fit' | 'WidthControlsHeight' | 'HeightControlsWidth' = 'None'
  breakpoints: Array<{ minWidth: number; maxWidth: number; visible: boolean; position: Vec2; size: Vec2 }> = []
  focusable = true
  tabIndex = 0
  focusUp: string | null = null
  focusDown: string | null = null
  focusLeft: string | null = null
  focusRight: string | null = null
  accessibilityRole = ''
  accessibilityLabel = ''
  accessibilityDescription = ''
  accessibilityHidden = false
  remapAction = ''
  remapBindingIndex = 0

  constructor(uuid?: string) { super(uuid) }
}

export class Panel extends ComponentBase {
  readonly kind = 'Panel' as const
  color = { r: 35, g: 41, b: 52 }
  opacity = 92
  cornerRadius = 14
  layout: 'None' | 'Horizontal' | 'Vertical' | 'Grid' = 'None'
  gap = 8
  padding = { left: 0, top: 0, right: 0, bottom: 0 }
  columns = 2
  wrap = false
  align: 'Start' | 'Center' | 'End' | 'Stretch' = 'Start'
  justify: 'Start' | 'Center' | 'End' | 'SpaceBetween' = 'Start'
  clipChildren = false
  maskChildren = false
  scrollHorizontal = false
  scrollVertical = false
  scrollOffset: Vec2 = { x: 0, y: 0 }
  contentSize: Vec2 = { x: 0, y: 0 }
  showScrollbars = true
  scrollSpeed = 42
  styleClass = 'panel'
  styleOverrides: Record<string, string | number> = {}

  constructor(uuid?: string) { super(uuid) }
}

export class Image extends ComponentBase {
  readonly kind = 'Image' as const
  spriteAsset: string | null = null
  tint = { r: 255, g: 255, b: 255 }
  opacity = 100
  preserveAspect = true
  nineSlice = { enabled: false, left: 0, top: 0, right: 0, bottom: 0 }

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
  localizationKey = ''
  localizationVariables: Record<string, string | number | boolean> = {}

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
  styleClass = 'button'
  styleOverrides: Record<string, string | number> = {}

  constructor(uuid?: string) { super(uuid) }
}

export class Slider extends ComponentBase {
  readonly kind = 'Slider' as const
  min = 0
  max = 1
  value = .5
  wholeNumbers = false
  interactable = true
  styleClass = 'slider'
  styleOverrides: Record<string, string | number> = {}

  constructor(uuid?: string) { super(uuid) }
}

export class ProgressBar extends ComponentBase {
  readonly kind = 'ProgressBar' as const
  min = 0
  max = 1
  value = .5
  fillColor = { r: 79, g: 150, b: 255 }
  backgroundColor = { r: 31, g: 37, b: 47 }
  styleClass = 'progress'
  styleOverrides: Record<string, string | number> = {}

  constructor(uuid?: string) { super(uuid) }
}

export class Checkbox extends ComponentBase {
  readonly kind = 'Checkbox' as const
  checked = false
  interactable = true
  label = 'Checkbox'
  localizationKey = ''
  styleClass = 'checkbox'
  styleOverrides: Record<string, string | number> = {}

  constructor(uuid?: string) { super(uuid) }
}

export class TextInput extends ComponentBase {
  readonly kind = 'TextInput' as const
  value = ''
  placeholder = 'Enter text…'
  maxLength = 256
  interactable = true
  password = false
  styleClass = 'input'
  styleOverrides: Record<string, string | number> = {}

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
  layers: Array<{ id: string; name: string; visible: boolean; locked: boolean; opacity: number; tiles: number[] }> = [
    { id: 'base', name: 'Base', visible: true, locked: false, opacity: 1, tiles: this.tiles }
  ]
  activeLayer = 0
  streamingEnabled = false
  streamingRadius = 3
  bakeCollision = true
  bakeNavigation = false
  bakeOccluders = false
  revision = 0

  constructor(uuid?: string) { super(uuid) }
}

export class CharacterBody2D extends ComponentBase {
  readonly kind = 'CharacterBody2D' as const
  maxSlopeAngle = 45
  stepHeight = 0.35
  floorSnap = 0.15
  safeMargin = 0.001
  maxSlides = 4
  coyoteTime = 0.12
  applyPlatformVelocity = true
  collisionMask = 0xffff_ffff
  requestedMotion: Vec2 = { x: 0, y: 0 }
  motionVelocity: Vec2 = { x: 0, y: 0 }
  onFloor = false
  onWall = false
  onCeiling = false
  floorNormal: Vec2 = { x: 0, y: 1 }
  wallNormal: Vec2 = { x: 0, y: 0 }
  ceilingNormal: Vec2 = { x: 0, y: -1 }
  platformVelocity: Vec2 = { x: 0, y: 0 }
  secondsSinceFloor = Number.POSITIVE_INFINITY

  constructor(uuid?: string) { super(uuid) }
}

export class Area2D extends ComponentBase {
  readonly kind = 'Area2D' as const
  shape: 'Box' | 'Circle' = 'Box'
  size: Vec2 = { x: 4, y: 4 }
  radius = 2
  collisionMask = 0xffff_ffff
  monitorable = true

  constructor(uuid?: string) { super(uuid) }
}

export interface AreaEffect2D {
  id: string
  kind: AreaEffectKind2D
  enabled: boolean
  direction: Vec2
  strength: number
  drag: number
  fluidDensity: number
  damagePerSecond: number
  signal: string
}

export class AreaEffector2D extends ComponentBase {
  readonly kind = 'AreaEffector2D' as const
  priority = 0
  effectors: AreaEffect2D[] = [{
    id: 'gravity', kind: 'Gravity', enabled: true, direction: { x: 0, y: -1 }, strength: 9.80665,
    drag: 0, fluidDensity: 1, damagePerSecond: 0, signal: 'area.effect'
  }]

  constructor(uuid?: string) { super(uuid) }
}

export class NavigationRegion2D extends ComponentBase {
  readonly kind = 'NavigationRegion2D' as const
  polygon: Vec2[] = [{ x: -5, y: -5 }, { x: 5, y: -5 }, { x: 5, y: 5 }, { x: -5, y: 5 }]
  cellSize = 0.5
  algorithm: NavigationAlgorithm2D = 'AStar'
  allowDiagonal = true
  dynamic = false
  rebakeInterval = 0.5
  navigationLayer = 1
  traversalCost = 1

  constructor(uuid?: string) { super(uuid) }
}

export class NavigationObstacle2D extends ComponentBase {
  readonly kind = 'NavigationObstacle2D' as const
  shape: 'Box' | 'Circle' = 'Circle'
  size: Vec2 = { x: 1, y: 1 }
  radius = 0.5
  dynamic = true
  navigationLayer = 1

  constructor(uuid?: string) { super(uuid) }
}

export class NavigationAgent2D extends ComponentBase {
  readonly kind = 'NavigationAgent2D' as const
  targetPosition: Vec2 = { x: 0, y: 0 }
  targetEntityUuid: string | null = null
  speed = 4
  acceleration = 20
  radius = 0.4
  stoppingDistance = 0.1
  avoidance = true
  avoidanceRadius = 1.2
  pathSmoothing = true
  repathInterval = 0.25
  navigationLayer = 1
  path: Vec2[] = []
  pathIndex = 0
  velocity: Vec2 = { x: 0, y: 0 }
  pathStatus: 'Idle' | 'Ready' | 'Unreachable' = 'Idle'

  constructor(uuid?: string) { super(uuid) }
}

export class BehaviorTree2D extends ComponentBase {
  readonly kind = 'BehaviorTree2D' as const
  treeAsset: string | null = null
  tickRate = 10
  currentNode = ''

  constructor(uuid?: string) { super(uuid) }
}

export class StateMachine2D extends ComponentBase {
  readonly kind = 'StateMachine2D' as const
  machineAsset: string | null = null
  currentState = ''

  constructor(uuid?: string) { super(uuid) }
}

export class WorldChunk2D extends ComponentBase {
  readonly kind = 'WorldChunk2D' as const
  size: Vec2 = { x: 64, y: 64 }
  loadDistance = 96
  unloadDistance = 128
  preloadPriority = 0
  memoryEstimateMb = 8
  sceneUuid = ''
  initiallyLoaded = true

  constructor(uuid?: string) { super(uuid) }
}

export class Portal2D extends ComponentBase {
  readonly kind = 'Portal2D' as const
  targetSceneUuid = ''
  targetPortal = ''
  triggerRadius = 1
  preload = true

  constructor(uuid?: string) { super(uuid) }
}

export class ObjectPool2D extends ComponentBase {
  readonly kind = 'ObjectPool2D' as const
  prefabAsset: string | null = null
  prewarm = 8
  capacity = 32
  autoExpand = true
  activeCount = 0

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

export class Light2D extends ComponentBase {
  readonly kind = 'Light2D' as const
  lightType: LightKind2D = 'Point'
  color = { r: 255, g: 235, b: 196 }
  intensity = 1
  range = 8
  innerAngle = 30
  outerAngle = 55
  areaSize: Vec2 = { x: 4, y: 2 }
  layerMask = 0xffff_ffff
  castsShadows = true
  shadowSoftness = .5

  constructor(uuid?: string) { super(uuid) }
}

export class ShadowCaster2D extends ComponentBase {
  readonly kind = 'ShadowCaster2D' as const
  layerMask = 0xffff_ffff
  selfShadows = false
  opacity = .85

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
  | Animator | Skeleton2D | TimelinePlayer | AudioSource | AudioListener | Canvas | RectTransform | Panel | Image
  | Text | Button | Slider | ProgressBar | Checkbox | TextInput
  | TileMap2D | CharacterBody2D | Area2D | AreaEffector2D | NavigationRegion2D | NavigationObstacle2D | NavigationAgent2D
  | BehaviorTree2D | StateMachine2D | WorldChunk2D | Portal2D | ObjectPool2D
  | ParticleEmitter2D | Light2D | ShadowCaster2D | Joint2D | RigidBody2D | Collider2D

function clonePersistedValue<T>(value: T): T {
  if (value === undefined) return value
  return JSON.parse(JSON.stringify(value)) as T
}

export function copyComponentValues<T extends Component2D>(component: T): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(component)) {
    if (key === 'uuid' || key === 'kind' || key === 'removed' || key === 'textureImage' || key === 'lastError' || key === 'state'
      || ['requestedMotion', 'motionVelocity', 'onFloor', 'onWall', 'onCeiling', 'floorNormal', 'wallNormal', 'ceilingNormal', 'platformVelocity', 'secondsSinceFloor', 'path', 'pathIndex', 'velocity', 'pathStatus', 'currentNode', 'currentState', 'activeCount'].includes(key)) continue
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
