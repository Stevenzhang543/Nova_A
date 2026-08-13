import type { ComponentKind } from './components'

export const STABLE_COMPONENT_API_VERSION = '2.0'

export interface ComponentDescriptor {
  kind: ComponentKind
  category: 'Core' | 'Rendering' | 'Physics' | 'Gameplay' | 'Audio' | 'UI' | 'World'
  unique: boolean
  summary: string
}

export const STABLE_COMPONENTS: readonly ComponentDescriptor[] = [
  { kind: 'Transform2D', category: 'Core', unique: true, summary: 'Local position, rotation, scale, and hierarchy parent.' },
  { kind: 'Camera2D', category: 'Rendering', unique: true, summary: 'Orthographic game camera and viewport.' },
  { kind: 'SpriteRenderer2D', category: 'Rendering', unique: true, summary: 'Draws an imported sprite asset.' },
  { kind: 'ShapeRenderer2D', category: 'Rendering', unique: true, summary: 'Draws rectangles, ellipses, and polygons.' },
  { kind: 'TextRenderer2D', category: 'Rendering', unique: true, summary: 'Draws world-space text.' },
  { kind: 'RigidBody2D', category: 'Physics', unique: true, summary: 'Dynamic, kinematic, or static body state.' },
  { kind: 'BoxCollider2D', category: 'Physics', unique: true, summary: 'Rectangular collision geometry.' },
  { kind: 'EllipseCollider2D', category: 'Physics', unique: true, summary: 'Elliptical collision geometry.' },
  { kind: 'PolygonCollider2D', category: 'Physics', unique: true, summary: 'Convex polygon collision geometry.' },
  { kind: 'FixedJoint2D', category: 'Physics', unique: false, summary: 'Locks two bodies together.' },
  { kind: 'DistanceJoint2D', category: 'Physics', unique: false, summary: 'Maintains a configured distance.' },
  { kind: 'RevoluteJoint2D', category: 'Physics', unique: false, summary: 'Allows rotation around an anchor.' },
  { kind: 'PrismaticJoint2D', category: 'Physics', unique: false, summary: 'Allows motion along one axis.' },
  { kind: 'SpringJoint2D', category: 'Physics', unique: false, summary: 'Applies damped spring forces.' },
  { kind: 'Rope2D', category: 'Physics', unique: false, summary: 'Segmented stretchable, bendable, breakable connection.' },
  { kind: 'Script2D', category: 'Gameplay', unique: true, summary: 'Runs sandboxed Rhai lifecycle code.' },
  { kind: 'Animator', category: 'Gameplay', unique: true, summary: 'Animation state machine and parameters.' },
  { kind: 'Skeleton2D', category: 'Gameplay', unique: true, summary: '2D bone rig, skin, pose, IK, and constraint playback.' },
  { kind: 'TimelinePlayer', category: 'Gameplay', unique: true, summary: 'Deterministic animation, audio, camera, event, visibility, and script sequence playback.' },
  { kind: 'AudioSource', category: 'Audio', unique: true, summary: 'Plays a clip through an audio bus.' },
  { kind: 'AudioListener', category: 'Audio', unique: true, summary: 'Receives spatial game audio.' },
  { kind: 'ParticleEmitter2D', category: 'Rendering', unique: true, summary: 'Emits lifetime-controlled 2D particles.' },
  { kind: 'Light2D', category: 'Rendering', unique: true, summary: 'Point, spot, directional, or area lighting with masks and shadows.' },
  { kind: 'ShadowCaster2D', category: 'Rendering', unique: true, summary: 'Makes entity geometry occlude compatible 2D lights.' },
  { kind: 'Canvas', category: 'UI', unique: true, summary: 'Root screen-space UI surface.' },
  { kind: 'RectTransform', category: 'UI', unique: true, summary: 'Anchored screen-space layout rectangle.' },
  { kind: 'Panel', category: 'UI', unique: true, summary: 'Colored UI container.' },
  { kind: 'Image', category: 'UI', unique: true, summary: 'Screen-space image.' },
  { kind: 'Text', category: 'UI', unique: true, summary: 'Screen-space label.' },
  { kind: 'Button', category: 'UI', unique: true, summary: 'Clickable UI control.' },
  { kind: 'Slider', category: 'UI', unique: true, summary: 'Interactive bounded numeric control.' },
  { kind: 'ProgressBar', category: 'UI', unique: true, summary: 'Read-only normalized progress display.' },
  { kind: 'Checkbox', category: 'UI', unique: true, summary: 'Boolean UI control.' },
  { kind: 'TextInput', category: 'UI', unique: true, summary: 'Native text-entry control with IME support.' },
  { kind: 'TileMap2D', category: 'World', unique: true, summary: 'Chunked tile layer with optional collision.' }
] as const

export const STABLE_COMPONENT_KINDS = STABLE_COMPONENTS.map(component => component.kind) as readonly ComponentKind[]

export function componentDescriptor(kind: ComponentKind): ComponentDescriptor | undefined {
  return STABLE_COMPONENTS.find(component => component.kind === kind)
}
