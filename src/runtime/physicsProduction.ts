import type { Vec2 } from '../world/types'

export type PhysicsInterpolationMode = 'Interpolate' | 'None'
export type PhysicsCombineMode = 'Average' | 'Minimum' | 'Maximum' | 'Multiply'
export type PhysicsShapeKind = 'Box' | 'Circle' | 'Capsule' | 'Segment' | 'Chain' | 'ConvexPolygon' | 'ConcavePolygon'

export interface PhysicsLayerDefinition {
  id: number
  name: string
  description: string
  color: string
}

export interface PhysicsMaterialAsset2D {
  format: 'nova-physics-material'
  version: 1
  name: string
  density: number
  staticFriction: number
  dynamicFriction: number
  restitution: number
  restitutionThreshold: number
  frictionCombine: PhysicsCombineMode
  restitutionCombine: PhysicsCombineMode
}

export interface ColliderShapeDescriptor2D {
  id: string
  kind: PhysicsShapeKind
  offset: Vec2
  rotation: number
  size: Vec2
  radius: number
  points: Vec2[]
  enabled: boolean
}

export interface PhysicsValidationIssue {
  severity: 'error' | 'warning' | 'info'
  path: string
  message: string
}

const LAYER_COLORS = ['#62a8ff', '#ff8c62', '#7bd88f', '#d994ff', '#ffd166', '#5ed4d4', '#ff6b96', '#a9b7c9']

export function defaultPhysicsLayers(): PhysicsLayerDefinition[] {
  return Array.from({ length: 32 }, (_, id) => ({
    id,
    name: id === 0 ? 'Default' : `Layer ${id}`,
    description: id === 0 ? 'Default world collision' : '',
    color: LAYER_COLORS[id % LAYER_COLORS.length]
  }))
}

export function normalizePhysicsLayers(value: unknown): PhysicsLayerDefinition[] {
  const source = Array.isArray(value) ? value : []
  const used = new Set<string>()
  return defaultPhysicsLayers().map((fallback, id) => {
    const raw = source[id] && typeof source[id] === 'object' ? source[id] as Partial<PhysicsLayerDefinition> : {}
    let name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 48) : fallback.name
    if (!name) name = fallback.name
    const stem = name
    let suffix = 2
    while (used.has(name.toLocaleLowerCase())) name = `${stem} ${suffix++}`.slice(0, 48)
    used.add(name.toLocaleLowerCase())
    const color = typeof raw.color === 'string' && /^#[0-9a-f]{6}$/i.test(raw.color) ? raw.color : fallback.color
    return { id, name, color, description: typeof raw.description === 'string' ? raw.description.trim().slice(0, 240) : fallback.description }
  })
}

export function layerName(layers: PhysicsLayerDefinition[], id: number): string {
  return layers[id]?.name ?? `Layer ${id}`
}

export function defaultPhysicsMaterial(name = 'Default Physics Material'): PhysicsMaterialAsset2D {
  return {
    format: 'nova-physics-material', version: 1, name,
    density: 1, staticFriction: .5, dynamicFriction: .35,
    restitution: 0, restitutionThreshold: 1,
    frictionCombine: 'Average', restitutionCombine: 'Maximum'
  }
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function normalizePhysicsMaterial(value: unknown): PhysicsMaterialAsset2D {
  const fallback = defaultPhysicsMaterial()
  const raw = value && typeof value === 'object' ? value as Partial<PhysicsMaterialAsset2D> : {}
  const modes: PhysicsCombineMode[] = ['Average', 'Minimum', 'Maximum', 'Multiply']
  return {
    ...fallback,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 80) : fallback.name,
    density: Math.max(1e-9, finite(raw.density, fallback.density)),
    staticFriction: Math.max(0, finite(raw.staticFriction, fallback.staticFriction)),
    dynamicFriction: Math.max(0, finite(raw.dynamicFriction, fallback.dynamicFriction)),
    restitution: Math.min(1, Math.max(0, finite(raw.restitution, fallback.restitution))),
    restitutionThreshold: Math.max(0, finite(raw.restitutionThreshold, fallback.restitutionThreshold)),
    frictionCombine: modes.includes(raw.frictionCombine as PhysicsCombineMode) ? raw.frictionCombine as PhysicsCombineMode : fallback.frictionCombine,
    restitutionCombine: modes.includes(raw.restitutionCombine as PhysicsCombineMode) ? raw.restitutionCombine as PhysicsCombineMode : fallback.restitutionCombine
  }
}

export function combinePhysicsValue(first: number, second: number, mode: PhysicsCombineMode): number {
  if (mode === 'Minimum') return Math.min(first, second)
  if (mode === 'Maximum') return Math.max(first, second)
  if (mode === 'Multiply') return first * second
  return (first + second) * .5
}

export const PHYSICS_UNITS = Object.freeze({
  distance: 'm', angle: 'deg', time: 's', mass: 'kg', density2D: 'kg/m²',
  speed: 'm/s', acceleration: 'm/s²', force: 'N', impulse: 'N·s', torque: 'N·m'
})

export const PHYSICS_SHAPE_SUPPORT: Readonly<Record<PhysicsShapeKind, { simulation: 'exact' | 'convex-approximation' | 'query-only'; note: string }>> = Object.freeze({
  Box: { simulation: 'exact', note: 'Oriented convex box.' },
  Circle: { simulation: 'exact', note: 'Circle and non-uniform ellipse.' },
  Capsule: { simulation: 'convex-approximation', note: 'Deterministic 12-vertex convex approximation.' },
  Segment: { simulation: 'convex-approximation', note: 'Finite segment with an explicit collision thickness.' },
  Chain: { simulation: 'query-only', note: 'Available to author and query; dynamic solver support is intentionally disabled.' },
  ConvexPolygon: { simulation: 'exact', note: 'Exact for three or four vertices in the current stable ABI.' },
  ConcavePolygon: { simulation: 'query-only', note: 'Requires decomposition; validation prevents silent dynamic simulation.' }
})

export function validatePhysicsNumber(path: string, value: number, options: { minimum?: number; maximum?: number; positive?: boolean } = {}): PhysicsValidationIssue[] {
  if (!Number.isFinite(value)) return [{ severity: 'error', path, message: `${path} must be a finite number.` }]
  if (options.positive && value <= 0) return [{ severity: 'error', path, message: `${path} must be greater than zero.` }]
  if (options.minimum !== undefined && value < options.minimum) return [{ severity: 'error', path, message: `${path} must be at least ${options.minimum}.` }]
  if (options.maximum !== undefined && value > options.maximum) return [{ severity: 'error', path, message: `${path} must be at most ${options.maximum}.` }]
  return []
}

export const PHYSICS_CONFORMANCE_CASES = Object.freeze([
  'static-body', 'kinematic-body', 'character-body', 'rigid-body', 'area-trigger',
  'box-shape', 'circle-shape', 'capsule-shape', 'segment-shape', 'convex-polygon',
  'ray-cast', 'shape-cast', 'point-query', 'overlap-query', 'contact-query',
  'trigger-enter-stay-exit', 'collision-enter-stay-exit', 'one-way-platform',
  'character-slope', 'character-step', 'moving-platform', 'character-ceiling',
  'distance-joint', 'revolute-joint', 'prismatic-joint', 'weld-joint', 'spring-joint', 'rope-joint',
  'ccd-tunneling', 'sleep-wake', 'deterministic-event-order', 'named-layer-roundtrip'
])

export function stablePhysicsEventOrder<T extends { type?: string; first?: number; second?: number }>(events: T[]): T[] {
  const phase = (type = '') => type.endsWith('Started') || type.endsWith('Entered') ? 0 : type.endsWith('Stayed') ? 1 : type.endsWith('Ended') || type.endsWith('Exited') ? 2 : 3
  return events.map((event, index) => ({ event, index })).sort((a, b) => {
    const pairA = [Math.min(a.event.first ?? -1, a.event.second ?? -1), Math.max(a.event.first ?? -1, a.event.second ?? -1)]
    const pairB = [Math.min(b.event.first ?? -1, b.event.second ?? -1), Math.max(b.event.first ?? -1, b.event.second ?? -1)]
    return pairA[0] - pairB[0] || pairA[1] - pairB[1] || phase(a.event.type) - phase(b.event.type) || a.index - b.index
  }).map(item => item.event)
}
