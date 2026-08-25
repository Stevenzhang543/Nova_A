import type { Vec2 } from '../world/types'

export type PhysicsInterpolationMode = 'Interpolate' | 'None'
export type PhysicsCombineMode = 'Average' | 'Minimum' | 'Maximum' | 'Multiply'
export type PhysicsShapeKind = 'Box' | 'Circle' | 'Capsule' | 'Segment' | 'Chain' | 'WorldBoundary' | 'ConvexPolygon' | 'ConcavePolygon'
export type PhysicsBodyRole2D = 'Static' | 'DynamicRigid' | 'Animatable' | 'Character' | 'Area'
export type PhysicsDroppedTimePolicy = 'Drop' | 'PreserveBacklog' | 'SlowMotion'
export type PhysicsProfileId = 'Accurate' | 'Balanced' | 'Fast' | 'Custom'
export type PhysicsStabilityLabel = 'stable' | 'nondeterministic' | 'experimental'

export interface PhysicsSimulationProfile2D {
  id: PhysicsProfileId
  name: string
  tickRate: number
  maxCatchUpSteps: number
  minimumSubsteps: number
  velocityIterations: number
  positionIterations: number
  interpolation: PhysicsInterpolationMode
  droppedTimePolicy: PhysicsDroppedTimePolicy
  sleepLinearThreshold: number
  sleepAngularThreshold: number
  timeToSleep: number
  physicsBudgetMs: number
}

export interface PhysicsQueryOptions2D {
  layerMask: number
  includeSensors: boolean
  excludeEntityUuids: string[]
  maximumResults: number
  sort: 'distance' | 'entity'
}

export interface PhysicsAnalyticalTolerance {
  id: string
  absolute: number
  relative: number
  unit: string
  rationale: string
}

export interface PhysicsComparisonResult {
  id: string
  expected: number
  actual: number
  absoluteError: number
  relativeError: number
  tolerance: PhysicsAnalyticalTolerance
  passed: boolean
}

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
  WorldBoundary: { simulation: 'convex-approximation', note: 'Static finite boundary segment; editor validation prevents dynamic ownership.' },
  ConvexPolygon: { simulation: 'exact', note: 'Exact for three or four vertices in the current stable ABI.' },
  ConcavePolygon: { simulation: 'query-only', note: 'Requires decomposition; validation prevents silent dynamic simulation.' }
})

export const PHYSICS_PROFILE_LIBRARY: Readonly<Record<Exclude<PhysicsProfileId, 'Custom'>, PhysicsSimulationProfile2D>> = Object.freeze({
  Accurate: Object.freeze({ id: 'Accurate', name: 'Accurate', tickRate: 120, maxCatchUpSteps: 12, minimumSubsteps: 12, velocityIterations: 32, positionIterations: 24, interpolation: 'Interpolate', droppedTimePolicy: 'PreserveBacklog', sleepLinearThreshold: .0005, sleepAngularThreshold: .0005, timeToSleep: .75, physicsBudgetMs: 6 }),
  Balanced: Object.freeze({ id: 'Balanced', name: 'Balanced', tickRate: 60, maxCatchUpSteps: 8, minimumSubsteps: 8, velocityIterations: 20, positionIterations: 16, interpolation: 'Interpolate', droppedTimePolicy: 'Drop', sleepLinearThreshold: .001, sleepAngularThreshold: .001, timeToSleep: .5, physicsBudgetMs: 4 }),
  Fast: Object.freeze({ id: 'Fast', name: 'Fast', tickRate: 60, maxCatchUpSteps: 4, minimumSubsteps: 4, velocityIterations: 12, positionIterations: 8, interpolation: 'Interpolate', droppedTimePolicy: 'SlowMotion', sleepLinearThreshold: .0025, sleepAngularThreshold: .0025, timeToSleep: .35, physicsBudgetMs: 2 })
})

export function defaultPhysicsProfile(): PhysicsSimulationProfile2D {
  return { ...PHYSICS_PROFILE_LIBRARY.Balanced }
}

export function normalizePhysicsProfile(value: unknown): PhysicsSimulationProfile2D {
  const raw = value && typeof value === 'object' ? value as Partial<PhysicsSimulationProfile2D> : {}
  const preset = raw.id && raw.id !== 'Custom' && raw.id in PHYSICS_PROFILE_LIBRARY
    ? PHYSICS_PROFILE_LIBRARY[raw.id as Exclude<PhysicsProfileId, 'Custom'>]
    : defaultPhysicsProfile()
  const profile: PhysicsSimulationProfile2D = {
    ...preset,
    id: raw.id === 'Accurate' || raw.id === 'Fast' || raw.id === 'Custom' ? raw.id : 'Balanced',
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 64) : preset.name,
    tickRate: Math.min(1_000, Math.max(1, Math.round(finite(raw.tickRate, preset.tickRate)))),
    maxCatchUpSteps: Math.min(240, Math.max(1, Math.round(finite(raw.maxCatchUpSteps, preset.maxCatchUpSteps)))),
    minimumSubsteps: Math.min(128, Math.max(1, Math.round(finite(raw.minimumSubsteps, preset.minimumSubsteps)))),
    velocityIterations: Math.min(128, Math.max(1, Math.round(finite(raw.velocityIterations, preset.velocityIterations)))),
    positionIterations: Math.min(128, Math.max(1, Math.round(finite(raw.positionIterations, preset.positionIterations)))),
    interpolation: raw.interpolation === 'None' ? 'None' : preset.interpolation,
    droppedTimePolicy: raw.droppedTimePolicy === 'PreserveBacklog' || raw.droppedTimePolicy === 'SlowMotion' ? raw.droppedTimePolicy : 'Drop',
    sleepLinearThreshold: Math.max(0, finite(raw.sleepLinearThreshold, preset.sleepLinearThreshold)),
    sleepAngularThreshold: Math.max(0, finite(raw.sleepAngularThreshold, preset.sleepAngularThreshold)),
    timeToSleep: Math.max(0, finite(raw.timeToSleep, preset.timeToSleep)),
    physicsBudgetMs: Math.min(1_000, Math.max(.1, finite(raw.physicsBudgetMs, preset.physicsBudgetMs)))
  }
  return profile
}

export function applyPhysicsProfile(id: Exclude<PhysicsProfileId, 'Custom'>): PhysicsSimulationProfile2D {
  return { ...PHYSICS_PROFILE_LIBRARY[id] }
}

export const PHYSICS_QUERY_CATALOG = Object.freeze([
  { id: 'ray', stability: 'stable' as PhysicsStabilityLabel },
  { id: 'point', stability: 'stable' as PhysicsStabilityLabel },
  { id: 'shape', stability: 'stable' as PhysicsStabilityLabel },
  { id: 'overlap', stability: 'stable' as PhysicsStabilityLabel },
  { id: 'sweep', stability: 'stable' as PhysicsStabilityLabel },
  { id: 'nearest', stability: 'stable' as PhysicsStabilityLabel },
  { id: 'contact', stability: 'stable' as PhysicsStabilityLabel }
])

export const PHYSICS_EVENT_CATALOG = Object.freeze([
  'collisionStarted', 'collisionStayed', 'collisionEnded',
  'triggerEntered', 'triggerStayed', 'triggerExited',
  'jointBroken', 'ropeBroken', 'bodySleeping', 'bodyWoke'
])

/** Stable designer-facing export metadata consumed by the Script2D Inspector and offline API reference. */
export const PHYSICS_SCRIPT_EXPORT_BINDINGS = Object.freeze({
  CharacterBody2D: Object.freeze([
    { name: 'move_speed', type: 'number', unit: 'm/s', minimum: 0, step: .1 },
    { name: 'jump_speed', type: 'number', unit: 'm/s', minimum: 0, step: .1 },
    { name: 'gravity', type: 'number', unit: 'm/s²', minimum: 0, step: .1 },
    { name: 'maximum_slope', type: 'number', unit: 'deg', minimum: 0, maximum: 89, step: 1 },
    { name: 'step_height', type: 'number', unit: 'm', minimum: 0, step: .01 },
    { name: 'floor_snap', type: 'number', unit: 'm', minimum: 0, step: .01 }
  ]),
  RigidBody2D: Object.freeze([
    { name: 'gravity_scale', type: 'number', unit: 'ratio', step: .05 },
    { name: 'linear_damping', type: 'number', unit: 's⁻¹', minimum: 0, step: .05 },
    { name: 'angular_damping', type: 'number', unit: 's⁻¹', minimum: 0, step: .05 }
  ]),
  Rope2D: Object.freeze([
    { name: 'segments', type: 'integer', unit: 'count', minimum: 3, maximum: 32, step: 1 },
    { name: 'compliance', type: 'number', unit: 'm/N', minimum: 0, step: .001 },
    { name: 'damping', type: 'number', unit: 'N·s/m', minimum: 0, step: .05 },
    { name: 'break_force', type: 'number', unit: 'N', minimum: 0, step: 1 }
  ])
})

export const PHYSICS_ANALYTICAL_TOLERANCES: Readonly<Record<string, PhysicsAnalyticalTolerance>> = Object.freeze({
  gravity: { id: 'gravity', absolute: 1e-9, relative: 1e-8, unit: 'm', rationale: 'Semi-implicit Euler fixed-step position fixture.' },
  velocity: { id: 'velocity', absolute: 1e-10, relative: 1e-9, unit: 'm/s', rationale: 'Fixed-step velocity integration.' },
  momentum: { id: 'momentum', absolute: 1e-8, relative: 1e-7, unit: 'kg·m/s', rationale: 'Impulse/contact rounding across supported Tier-1 runtimes.' },
  energy: { id: 'energy', absolute: 1e-7, relative: 5e-5, unit: 'J', rationale: 'Iterative contact and constraint solver tolerance.' },
  query: { id: 'query', absolute: 1e-7, relative: 1e-7, unit: 'm', rationale: 'Bounded convex query and sweep binary search.' },
  joint: { id: 'joint', absolute: 5e-5, relative: 1e-4, unit: 'm', rationale: 'Iterative joint positional correction.' },
  rope: { id: 'rope', absolute: 1e-4, relative: 5e-4, unit: 'm', rationale: 'Compliant segmented Rope2D constraint.' }
})

export function analyticalGravityPosition(initialPosition: number, initialVelocity: number, acceleration: number, fixedDelta: number, steps: number): number {
  let position = finite(initialPosition, 0), velocity = finite(initialVelocity, 0)
  const dt = Math.max(0, finite(fixedDelta, 0)), count = Math.max(0, Math.round(finite(steps, 0)))
  for (let step = 0; step < count; step++) { velocity += acceleration * dt; position += velocity * dt }
  return position
}

export function analyticalDampedVelocity(initialVelocity: number, damping: number, elapsed: number): number {
  return finite(initialVelocity, 0) * Math.exp(-Math.max(0, finite(damping, 0)) * Math.max(0, finite(elapsed, 0)))
}

export function analyticalRestitutionVelocity(incomingNormalVelocity: number, restitution: number, threshold = 0): number {
  const incoming = finite(incomingNormalVelocity, 0)
  return Math.abs(incoming) < Math.max(0, finite(threshold, 0)) ? 0 : -incoming * Math.min(1, Math.max(0, finite(restitution, 0)))
}

export function momentum2D(mass: number, velocity: Vec2): Vec2 {
  const safeMass = Math.max(0, finite(mass, 0))
  return { x: safeMass * finite(velocity.x, 0), y: safeMass * finite(velocity.y, 0) }
}

export function kineticEnergy2D(mass: number, velocity: Vec2, inertia = 0, angularVelocity = 0): number {
  return .5 * Math.max(0, finite(mass, 0)) * (finite(velocity.x, 0) ** 2 + finite(velocity.y, 0) ** 2) + .5 * Math.max(0, finite(inertia, 0)) * finite(angularVelocity, 0) ** 2
}

export function ropeStrain(restLength: number, currentLength: number): number {
  const rest = Math.max(1e-12, finite(restLength, 1))
  return Math.max(0, finite(currentLength, rest) / rest - 1)
}

export function springForce(stiffness: number, restLength: number, currentLength: number, damping: number, relativeSpeed: number): number {
  return -Math.max(0, finite(stiffness, 0)) * (finite(currentLength, 0) - Math.max(0, finite(restLength, 0))) - Math.max(0, finite(damping, 0)) * finite(relativeSpeed, 0)
}

export function comparePhysicsValue(id: string, expected: number, actual: number, tolerance: PhysicsAnalyticalTolerance): PhysicsComparisonResult {
  const safeExpected = finite(expected, 0), safeActual = finite(actual, 0), absoluteError = Math.abs(safeActual - safeExpected)
  const relativeError = absoluteError / Math.max(Math.abs(safeExpected), 1e-12)
  return { id, expected: safeExpected, actual: safeActual, absoluteError, relativeError, tolerance, passed: absoluteError <= tolerance.absolute || relativeError <= tolerance.relative }
}

export function physicsBodyRole(bodyType: string, character: boolean, sensor: boolean): PhysicsBodyRole2D {
  if (sensor) return 'Area'
  if (character) return 'Character'
  if (bodyType === 'Static') return 'Static'
  if (bodyType === 'Kinematic') return 'Animatable'
  return 'DynamicRigid'
}

export function physicsInstabilityWarnings(input: { bodyCount: number; contactCount: number; connectionCount: number; droppedSeconds: number; elapsedMs: number; profile: PhysicsSimulationProfile2D }): string[] {
  const warnings: string[] = []
  if (input.elapsedMs > input.profile.physicsBudgetMs) warnings.push(`Physics exceeded the ${input.profile.physicsBudgetMs.toFixed(1)} ms profile budget.`)
  if (input.droppedSeconds > 0) warnings.push(`Fixed-step catch-up dropped ${input.droppedSeconds.toFixed(4)} s.`)
  if (input.contactCount > 20_000) warnings.push('Contact count exceeds the validated interactive diagnostic budget.')
  if (input.connectionCount > 2_000) warnings.push('Joint/Rope2D count may require a faster quality profile or collision simplification.')
  if (input.bodyCount > 20_000) warnings.push('Body count exceeds the validated authoring reference range.')
  return warnings
}

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
  'nearest-query', 'joint-break-event', 'rope-break-event', 'sleep-wake',
  'ccd-tunneling', 'thin-obstacle', 'large-coordinate', 'tiny-object', 'compound-collider',
  'fixed-profile-roundtrip', 'dropped-time-policy', 'deterministic-event-order', 'named-layer-roundtrip'
])

export function stablePhysicsEventOrder<T extends { type?: string; first?: number; second?: number }>(events: T[]): T[] {
  const phase = (type = '') => type.endsWith('Started') || type.endsWith('Entered') ? 0 : type.endsWith('Stayed') ? 1 : type.endsWith('Ended') || type.endsWith('Exited') ? 2 : 3
  return events.map((event, index) => ({ event, index })).sort((a, b) => {
    const pairA = [Math.min(a.event.first ?? -1, a.event.second ?? -1), Math.max(a.event.first ?? -1, a.event.second ?? -1)]
    const pairB = [Math.min(b.event.first ?? -1, b.event.second ?? -1), Math.max(b.event.first ?? -1, b.event.second ?? -1)]
    return pairA[0] - pairB[0] || pairA[1] - pairB[1] || phase(a.event.type) - phase(b.event.type) || a.index - b.index
  }).map(item => item.event)
}
