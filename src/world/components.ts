import { normalizeUuid } from './identity'
import type { Vec2 } from './types'
import type { ColliderShapeDescriptor2D, PhysicsShapeKind } from '../runtime/physicsProduction'

export type BodyType2D = 'Dynamic' | 'Kinematic' | 'Static'
export type MassMode2D = 'Automatic' | 'Manual'
export type CollisionMode2D = 'Discrete' | 'Continuous'
export type TileCollision2D = 'None' | 'Box' | 'Polygon' | 'OneWay'
export type TileBlendMode2D = 'Alpha' | 'Additive' | 'Multiply' | 'Screen'
export type TileCellTransform2D = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15
export type AreaEffectKind2D = 'Gravity' | 'Wind' | 'Drag' | 'Buoyancy' | 'Damage' | 'Signal'
export type NavigationAlgorithm2D = 'AStar' | 'HierarchicalAStar' | 'FlowField'
export type JointKind2D = 'FixedJoint2D' | 'WeldJoint2D' | 'DistanceJoint2D' | 'RopeJoint2D' | 'RevoluteJoint2D' | 'MotorJoint2D' | 'PrismaticJoint2D' | 'SpringJoint2D'
export type RendererShape2D = 'Rectangle' | 'Ellipse' | 'Polygon' | 'Line'
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
  | 'GridMover2D'
  | 'PlatformController2D'
  | 'TopDownController2D'
  | 'Health2D'
  | 'DamageHitbox2D'
  | 'Collectible2D'
  | 'Projectile2D'
  | 'Spawner2D'
  | 'Cooldown2D'
  | 'Lifetime2D'
  | 'MouseFollower2D'
  | 'CameraFollow2D'
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
  // World-space width chosen to remain a crisp, unobtrusive outline at the
  // default editor zoom. Older value 1 produced the large dark border shown
  // around newly drawn primitives.
  strokeWidth = 0.04
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
  smoothing = { enabled: false, speed: 5 }
  limits = { enabled: false, left: -100, right: 100, bottom: -100, top: 100 }
  dragMargins = { enabled: false, left: .1, right: .1, top: .1, bottom: .1 }
  previewInEditor = true
  followTargetUuid: string | null = null
  priority = 0
  stackOrder = 0
  cullingMask = 0xffff_ffff
  clearColor = true
  renderTexture = ''

  constructor(uuid?: string) { super(uuid) }
}

export type ScriptPropertyValue = null | number | string | boolean | ScriptPropertyValue[] | { [key: string]: ScriptPropertyValue }

export interface ScriptPropertyMetadata {
  name: string
  valueType: string
  defaultValue: ScriptPropertyValue
  minimum: number | null
  maximum: number | null
  step: number | null
  enumValues: string[]
  resourceType: string | null
  group: string
  tooltip: string
  serialized: boolean
}

export class Script2D extends ComponentBase {
  readonly kind = 'Script2D' as const
  scriptAsset: string | null = null
  /** Optional designer-facing event index. Runtime still executes scriptAsset. */
  eventSheetAsset: string | null = null
  /** Reusable authored-object source, retained through scene and prefab round trips. */
  objectBlueprintAsset: string | null = null
  properties: Record<string, ScriptPropertyValue> = {}
  propertyMetadata: Record<string, ScriptPropertyMetadata> = {}
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
  skipped = false
  variables: Record<string, string | number | boolean> = {}

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
  polyphony = 1
  randomPitch = 0
  randomVolume = 0
  virtualizeWhenLimited = true
  streamOverride: 'ImportSetting' | 'Stream' | 'Buffer' = 'ImportSetting'
  startOffsetSeconds = 0
  fadeInSeconds = 0
  fadeOutSeconds = 0
  dopplerScale = 0
  playlist: string[] = []
  playlistMode: 'Single' | 'Sequential' | 'Random' = 'Single'
  playlistIndex = 0

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
  dpiScale = 1
  localePreview = ''
  themeAsset: string | null = null
  themeVariant = 'default'

  constructor(uuid?: string) { super(uuid) }
}

export class RectTransform extends ComponentBase {
  readonly kind = 'RectTransform' as const
  layoutMode: 'Responsive' | 'Fixed' = 'Responsive'
  anchorPreset: AnchorPreset = 'center'
  pivot: Vec2 = { x: .5, y: .5 }
  position: Vec2 = { x: 0, y: 0 }
  size: Vec2 = { x: 240, y: 80 }
  preferredSize: Vec2 = { x: 240, y: 80 }
  anchorMin: Vec2 = { x: .5, y: .5 }
  anchorMax: Vec2 = { x: .5, y: .5 }
  offsets = { left: 0, top: 0, right: 0, bottom: 0 }
  margins = { left: 0, top: 0, right: 0, bottom: 0 }
  horizontalPolicy: 'Fixed' | 'Fill' | 'Content' = 'Fixed'
  verticalPolicy: 'Fixed' | 'Fill' | 'Content' = 'Fixed'
  minSize: Vec2 = { x: 0, y: 0 }
  maxSize: Vec2 = { x: 100_000, y: 100_000 }
  aspectRatio = 0
  aspectConstraint: 'None' | 'Fit' | 'WidthControlsHeight' | 'HeightControlsWidth' = 'None'
  breakpoints: Array<{ minWidth: number; maxWidth: number; visible: boolean; position: Vec2; size: Vec2 }> = []
  mirrorInRtl = true
  zOrder = 0
  componentSource: string | null = null
  componentVariant = 'default'
  // A layout rectangle is passive by default. Interactive UI components opt in explicitly.
  focusable = false
  tabIndex = 0
  focusUp: string | null = null
  focusDown: string | null = null
  focusLeft: string | null = null
  focusRight: string | null = null
  accessibilityRole = ''
  accessibilityLabel = ''
  accessibilityDescription = ''
  accessibilityState = ''
  accessibilityValue = ''
  accessibilityLive: 'Off' | 'Polite' | 'Assertive' = 'Off'
  accessibilityHidden = false
  readingOrder = 0
  skipNavigation = true
  remapAction = ''
  remapBindingIndex = 0

  constructor(uuid?: string) { super(uuid) }
}

export class Panel extends ComponentBase {
  readonly kind = 'Panel' as const
  color = { r: 35, g: 41, b: 52 }
  opacity = 92
  cornerRadius = 14
  layout: 'None' | 'Row' | 'Column' | 'Grid' | 'Flow' | 'Overlay' | 'Center' | 'Margin' | 'Aspect' | 'Split' | 'Horizontal' | 'Vertical' = 'None'
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
  behavior: 'Normal' | 'Modal' | 'Popup' | 'Tooltip' = 'Normal'
  visible = true
  closeOnOutside = true
  draggable = false
  dropGroup = ''
  tooltipText = ''
  tooltipDelay = .45
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
  wrap: 'None' | 'Word' | 'Character' = 'Word'
  overflow: 'Clip' | 'Ellipsis' | 'Visible' = 'Clip'
  inputPromptAction = ''
  captionCategory: 'None' | 'Dialogue' | 'Effects' | 'Music' = 'None'

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
  pressAudio: string | null = null
  hoverAudio: string | null = null
  focusAudio: string | null = null
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
  layers: Array<{
    id: string
    name: string
    visible: boolean
    locked: boolean
    opacity: number
    blendMode: TileBlendMode2D
    parallax: Vec2
    zOrder: number
    collisionEnabled: boolean
    navigationEnabled: boolean
    occlusionEnabled: boolean
    tiles: number[]
    transforms: TileCellTransform2D[]
  }> = [
    { id: 'base', name: 'Base', visible: true, locked: false, opacity: 1, blendMode: 'Alpha', parallax: { x: 1, y: 1 }, zOrder: 0, collisionEnabled: true, navigationEnabled: true, occlusionEnabled: true, tiles: this.tiles, transforms: Array(32 * 18).fill(0) }
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
  navigationMode: 'Grid' | 'Polygon' = 'Grid'
  algorithm: NavigationAlgorithm2D = 'AStar'
  allowDiagonal = true
  dynamic = false
  rebakeInterval = 0.5
  navigationLayer = 1
  navigationMask = 1
  traversalCost = 1
  source: 'SceneGeometry' | 'TileMap' | 'Manual' = 'Manual'
  sourceEntityUuid: string | null = null
  agentRadius = 0.4
  clusterSize = 16
  links: Array<{ id: string; start: Vec2; end: Vec2; bidirectional: boolean; cost: number; enabled: boolean }> = []
  costAreas: Array<{ id: string; name: string; shape: 'Box' | 'Circle'; center: Vec2; size: Vec2; radius: number; multiplier: number; navigationLayer: number; enabled: boolean }> = []
  bakedRevision = 0

  constructor(uuid?: string) { super(uuid) }
}

export class NavigationObstacle2D extends ComponentBase {
  readonly kind = 'NavigationObstacle2D' as const
  shape: 'Box' | 'Circle' = 'Circle'
  size: Vec2 = { x: 1, y: 1 }
  radius = 0.5
  dynamic = true
  navigationLayer = 1
  avoidanceVelocity: Vec2 = { x: 0, y: 0 }

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
  navigationMask = 1
  avoidancePriority = 0.5
  maximumAvoidanceNeighbors = 16
  path: Vec2[] = []
  pathIndex = 0
  velocity: Vec2 = { x: 0, y: 0 }
  pathStatus: 'Idle' | 'Pending' | 'Ready' | 'Unreachable' = 'Idle'

  constructor(uuid?: string) { super(uuid) }
}

export class BehaviorTree2D extends ComponentBase {
  readonly kind = 'BehaviorTree2D' as const
  treeAsset: string | null = null
  tickRate = 10
  currentNode = ''
  blackboardOverrides: Record<string, boolean | number | string> = {}

  constructor(uuid?: string) { super(uuid) }
}

export class StateMachine2D extends ComponentBase {
  readonly kind = 'StateMachine2D' as const
  machineAsset: string | null = null
  currentState = ''

  constructor(uuid?: string) { super(uuid) }
}

export class GridMover2D extends ComponentBase {
  readonly kind = 'GridMover2D' as const
  action = 'Move'
  cellSize: Vec2 = { x: 1, y: 1 }
  repeatDelay = 0.12
  allowDiagonal = false
  localSpace = false
  runtimeCooldown = 0

  constructor(uuid?: string) { super(uuid) }
}

export class PlatformController2D extends ComponentBase {
  readonly kind = 'PlatformController2D' as const
  moveAction = 'Horizontal'
  jumpAction = 'Jump'
  speed = 6
  acceleration = 36
  airControl = 0.55
  jumpImpulse = 10
  maximumFallSpeed = 30

  constructor(uuid?: string) { super(uuid) }
}

export class TopDownController2D extends ComponentBase {
  readonly kind = 'TopDownController2D' as const
  moveAction = 'Move'
  speed = 5
  acceleration = 30
  rotateToMovement = false

  constructor(uuid?: string) { super(uuid) }
}

export class Health2D extends ComponentBase {
  readonly kind = 'Health2D' as const
  maximum = 100
  current = 100
  invulnerabilitySeconds = 0
  destroyOnZero = true
  damagedSignal = 'health.damaged'
  diedSignal = 'health.died'
  runtimeInvulnerability = 0

  constructor(uuid?: string) { super(uuid) }
}

export class DamageHitbox2D extends ComponentBase {
  readonly kind = 'DamageHitbox2D' as const
  damage = 10
  knockback = 0
  targetTag = 'damageable'
  hitCooldown = 0.1
  destroyOnHit = false
  hitSignal = 'damage.hit'

  constructor(uuid?: string) { super(uuid) }
}

export class Collectible2D extends ComponentBase {
  readonly kind = 'Collectible2D' as const
  collectorTag = 'player'
  score = 1
  destroyOnCollect = true
  collectedSignal = 'collectible.collected'

  constructor(uuid?: string) { super(uuid) }
}

export class Projectile2D extends ComponentBase {
  readonly kind = 'Projectile2D' as const
  speed = 12
  direction: Vec2 = { x: 1, y: 0 }
  damage = 10
  ownerUuid = ''
  destroyOnImpact = true
  lifetime = 5
  runtimeLifetime = 5

  constructor(uuid?: string) { super(uuid) }
}

export class Spawner2D extends ComponentBase {
  readonly kind = 'Spawner2D' as const
  prefabAsset: string | null = null
  interval = 1
  initialDelay = 0
  burst = 1
  maximumAlive = 32
  autoStart = true
  inheritRotation = true
  runtimeRemaining = 0
  runtimeStarted = false
  runtimeSpawned: string[] = []

  constructor(uuid?: string) { super(uuid) }
}

export class Cooldown2D extends ComponentBase {
  readonly kind = 'Cooldown2D' as const
  duration = 1
  autoStart = false
  readySignal = 'cooldown.ready'
  runtimeRemaining = 0
  runtimeReady = true

  constructor(uuid?: string) { super(uuid) }
}

export class Lifetime2D extends ComponentBase {
  readonly kind = 'Lifetime2D' as const
  seconds = 5
  useDespawn = true
  runtimeRemaining = 5

  constructor(uuid?: string) { super(uuid) }
}

/** Drives an entity toward the active Game-view pointer in world space.
 * A maximumSpeed of zero means an exact, unrestricted pointer lock. */
export class MouseFollower2D extends ComponentBase {
  readonly kind = 'MouseFollower2D' as const
  offset: Vec2 = { x: 0, y: 0 }
  maximumSpeed = 0

  constructor(uuid?: string) { super(uuid) }
}

export class CameraFollow2D extends ComponentBase {
  readonly kind = 'CameraFollow2D' as const
  targetUuid = ''
  targetTag = 'player'
  offset: Vec2 = { x: 0, y: 0 }
  smoothing = 8
  deadZone: Vec2 = { x: 0, y: 0 }
  followX = true
  followY = true

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
  ownership = 'scene'
  dependencies: string[] = []
  prefetchDistance = 160
  cachePolicy: 'Release' | 'Retain' | 'LRU' = 'LRU'
  saveStateKey = ''

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
  resetContract: 'TransformAndPhysics' | 'FullSerializedState' | 'CustomSignal' = 'TransformAndPhysics'
  maximumLifetime = 0
  activeCount = 0
  createdCount = 0
  reusedCount = 0
  leakedCount = 0

  constructor(uuid?: string) { super(uuid) }
}

export class ParticleEmitter2D extends ComponentBase {
  readonly kind = 'ParticleEmitter2D' as const
  particleSystemAsset: string | null = null
  simulationBackend: 'Auto' | 'CPU' | 'GPU' = 'Auto'
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
  emissionShape: 'Point' | 'Box' | 'Circle' | 'Edge' = 'Point'
  shapeSize: Vec2 = { x: 1, y: 1 }
  shapeRadius = 0.5
  scaleCurve: Array<{ time: number; value: number }> = [{ time: 0, value: 1 }, { time: 1, value: 1 }]
  colorGradient: Array<{ time: number; color: { r: number; g: number; b: number }; opacity: number }> = []
  subEmitterUuid: string | null = null
  subEmitterCount = 1
  previewInEditor = true
  collisionMode: 'None' | 'Bounce' | 'Stop' = 'None'
  collisionRestitution = 0.5
  collisionLayerMask = 0xffff_ffff
  eventSignal = 'particle.event'
  trailEnabled = false
  trailLength = 12
  trailWidth = .08

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
  motorEnabled = false
  motorSpeed = 0
  maxMotorForce = 1000
  breakForce = Number.POSITIVE_INFINITY
  breakTorque = Number.POSITIVE_INFINITY
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
  transformOwnership: 'Physics' | 'Animation' = 'Physics'
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
  density: number
  frictionCombine: 'Average' | 'Minimum' | 'Maximum' | 'Multiply'
  restitutionCombine: 'Average' | 'Minimum' | 'Maximum' | 'Multiply'
}

export class Collider2D extends ComponentBase {
  readonly kind: ColliderKind2D
  offset: Vec2 = { x: 0, y: 0 }
  rotation = 0
  size: Vec2 = { x: 1, y: 1 }
  radiusX = 1
  radiusY = 1
  vertices: Vec2[] = []
  shapeModel: PhysicsShapeKind
  /** Supplementary local shapes. The retained solver resolves every child
   * independently while the body keeps one authoritative transform/velocity. */
  shapes: ColliderShapeDescriptor2D[] = []
  sensor = false
  physicsLayer = 0
  collisionMask = 1
  oneWay = false
  oneWayNormal: Vec2 = { x: 0, y: 1 }
  materialAsset: string | null = null
  material: PhysicsMaterial2D = {
    restitution: 0,
    restitutionThreshold: 1,
    staticFriction: 0,
    dynamicFriction: 0
    , density: 1
    , frictionCombine: 'Average'
    , restitutionCombine: 'Maximum'
  }

  constructor(kind: ColliderKind2D, uuid?: string) {
    super(uuid)
    this.kind = kind
    this.shapeModel = kind === 'EllipseCollider2D' ? 'Circle' : kind === 'PolygonCollider2D' ? 'ConvexPolygon' : 'Box'
  }
}

export type EntityComponent =
  | ShapeRenderer2D | SpriteRenderer2D | TextRenderer2D | Camera2D | Script2D
  | Animator | Skeleton2D | TimelinePlayer | AudioSource | AudioListener | Canvas | RectTransform | Panel | Image
  | Text | Button | Slider | ProgressBar | Checkbox | TextInput
  | TileMap2D | CharacterBody2D | Area2D | AreaEffector2D | NavigationRegion2D | NavigationObstacle2D | NavigationAgent2D
  | BehaviorTree2D | StateMachine2D | GridMover2D | PlatformController2D | TopDownController2D | Health2D | DamageHitbox2D
  | Collectible2D | Projectile2D | Spawner2D | Cooldown2D | Lifetime2D | MouseFollower2D | CameraFollow2D | WorldChunk2D | Portal2D | ObjectPool2D
  | ParticleEmitter2D | Light2D | ShadowCaster2D | Joint2D | RigidBody2D | Collider2D

function clonePersistedValue<T>(value: T): T {
  if (value === undefined) return value
  return JSON.parse(JSON.stringify(value)) as T
}

export function copyComponentValues<T extends Component2D>(component: T): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(component)) {
    if (key === 'uuid' || key === 'kind' || key === 'removed' || key === 'textureImage' || key === 'lastError' || key === 'state'
      || ['requestedMotion', 'motionVelocity', 'onFloor', 'onWall', 'onCeiling', 'floorNormal', 'wallNormal', 'ceilingNormal', 'platformVelocity', 'secondsSinceFloor', 'path', 'pathIndex', 'velocity', 'pathStatus', 'currentNode', 'currentState', 'activeCount', 'runtimeCooldown', 'runtimeInvulnerability', 'runtimeRemaining', 'runtimeStarted', 'runtimeSpawned', 'runtimeReady', 'runtimeLifetime'].includes(key)) continue
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
