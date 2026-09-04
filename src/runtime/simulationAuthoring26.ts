import { reactive } from 'vue'
import { readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import type { Entity } from '../world/Entity'
import { connectionSharesLayer, type Connection } from '../world/Connection'
import { PHYSICS_UNITS, PHYSICS_SHAPE_SUPPORT } from './physicsProduction'
import { blackboardSnapshot, normalizeBehaviorTree, normalizeStateMachine, type BehaviorTreeDocument, type StateMachineDocument } from './aiTools'
import type { NavigationAgent2D, NavigationRegion2D } from '../world/components'
import { worldTransform } from '../world/hierarchy'
import { prepareColliderSet } from './physicsGeometry'

export type SimulationCheckStatus = 'ready' | 'review' | 'blocked'
export interface SimulationLocalizedText { key: string; params: Record<string, string | number> }
export interface SimulationCheck {
  id: 'units' | 'colliders' | 'constraints' | 'navigation' | 'ai' | 'determinism'
  status: SimulationCheckStatus
  summary: string
  detail: string
  fix: string
  summaryText: SimulationLocalizedText
  detailText: SimulationLocalizedText
  fixText: SimulationLocalizedText
}
export interface SimulationProductionReport {
  generatedAt: string
  checks: SimulationCheck[]
  issues: Array<{
    code: string
    status: Exclude<SimulationCheckStatus, 'ready'>
    message: string
    fix: string
    messageText: SimulationLocalizedText
    fixText: SimulationLocalizedText
  }>
  metrics: { bodies: number; colliderChildren: number; ropePaths: number; clothNetworks: number; navigationRegions: number; navigationAgents: number; aiAgents: number }
  ready: boolean
  checksum: string
}

const MAX_EVIDENCE_FRAMES = 600
const finite = (value: number): boolean => Number.isFinite(value)
const fixed = (value: number): number => Math.round((Number.isFinite(value) ? value : 0) * 1e9) / 1e9

function stableFingerprint(value: unknown): string {
  const source = JSON.stringify(value); let first = 0x811c9dc5, second = 0x9e3779b9
  for (let index = 0; index < source.length; index++) { const code = source.charCodeAt(index); first = Math.imul(first ^ code, 0x01000193) >>> 0; second = Math.imul(second ^ code, 0x85ebca6b) >>> 0 }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`
}

export function simulationStateChecksum(entities: readonly Entity[], connections: readonly Connection[]): string {
  return stableFingerprint({
    entities: [...entities].sort((a, b) => a.uuid.localeCompare(b.uuid)).map(entity => {
      const transform = worldTransform(entity, entities as Entity[]), agent = entity.getComponent<NavigationAgent2D>('NavigationAgent2D')
      const behavior = entity.getComponent<import('../world/components').BehaviorTree2D>('BehaviorTree2D'), machine = entity.getComponent<import('../world/components').StateMachine2D>('StateMachine2D')
      const board = Object.entries(blackboardSnapshot(entity.uuid)).sort(([first], [second]) => first.localeCompare(second)).map(([key, value]) => [key, typeof value === 'number' ? fixed(value) : value])
      return [
        entity.uuid, entity.enabled, fixed(transform.position.x), fixed(transform.position.y), fixed(transform.rotation), fixed(entity.velocity.x), fixed(entity.velocity.y), fixed(entity.angularVelocity), entity.rigidBody.sleeping,
        agent ? [agent.pathStatus, agent.pathIndex, fixed(agent.velocity.x), fixed(agent.velocity.y), fixed(agent.targetPosition.x), fixed(agent.targetPosition.y), agent.targetEntityUuid ?? '', agent.path.map(point => [fixed(point.x), fixed(point.y)])] : null,
        behavior ? [behavior.currentNode, board] : null, machine?.currentState ?? ''
      ]
    }),
    connections: [...connections].sort((a, b) => a.uuid.localeCompare(b.uuid)).map(connection => [connection.uuid, connection.enabled, connection.componentType, connection.breakState, connection.breakLink, fixed(connection.tension), fixed(connection.strain), connection.ropeNodes.map(node => [fixed(node.position.x), fixed(node.position.y), fixed(node.velocity.x), fixed(node.velocity.y)])])
  })
}

function ropeNetworks(connections: readonly Connection[]): number {
  const ropes = connections.filter(connection => connection.enabled && connection.componentType === 'Rope2D' && connection.breakState === 'intact'), adjacency = new Map<number, Set<number>>()
  for (const rope of ropes) { const ids = rope.anchors.map(anchor => anchor.entityId); if (ids.length !== 2) continue; const first = adjacency.get(ids[0]) ?? new Set<number>(); first.add(ids[1]); adjacency.set(ids[0], first); const second = adjacency.get(ids[1]) ?? new Set<number>(); second.add(ids[0]); adjacency.set(ids[1], second) }
  const visited = new Set<number>(); let networks = 0
  for (const id of adjacency.keys()) { if (visited.has(id)) continue; const queue = [id]; let vertices = 0, edges = 0; while (queue.length) { const current = queue.shift()!; if (visited.has(current)) continue; visited.add(current); vertices++; const neighbors = adjacency.get(current) ?? new Set<number>(); edges += neighbors.size; for (const neighbor of neighbors) if (!visited.has(neighbor)) queue.push(neighbor) } if (vertices >= 3 && edges / 2 >= vertices) networks++ }
  return networks
}

function textDocument<T>(reference: string | null): T | null { const asset = resolveAsset(reference), source = readTextAsset(reference); if (!asset || !source) return null; try { return JSON.parse(source) as T } catch { return null } }

function polygonArea(points: readonly { x: number; y: number }[]): number {
  if (points.length < 3) return 0
  let twiceArea = 0
  for (let index = 0; index < points.length; index++) twiceArea += points[index].x * points[(index + 1) % points.length].y - points[index].y * points[(index + 1) % points.length].x
  return Math.abs(twiceArea) * .5
}

function validMask(value: number): boolean { return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff }
function finiteVector(value: { x: number; y: number } | undefined): boolean { return Boolean(value && finite(value.x) && finite(value.y)) }
function finiteOrUnbounded(value: number): boolean { return value === Number.POSITIVE_INFINITY || finite(value) && value >= 0 }

const issueTranslationStems: Readonly<Record<string, string>> = {
  'SIM-NONFINITE-SETTINGS': 'settings', 'SIM-NONFINITE-BODY': 'bodyFinite', 'SIM-BODY-BOUNDS': 'bodyBounds',
  'SIM-COLLIDER-GEOMETRY': 'colliderGeometry', 'SIM-COLLIDER-BOUNDS': 'colliderBounds', 'SIM-UNKNOWN-COLLIDER': 'colliderUnknown',
  'SIM-DYNAMIC-CONCAVE': 'colliderDynamicConcave', 'SIM-COLLIDER-POINTS': 'colliderPoints', 'SIM-CONSTRAINT-ANCHOR': 'constraintAnchor',
  'SIM-CONSTRAINT-LAYER': 'constraintLayer', 'SIM-CONSTRAINT-BOUNDS': 'constraintBounds', 'SIM-CONSTRAINT-LENGTH': 'constraintLength',
  'SIM-ROPE-BOUNDS': 'ropeBounds', 'SIM-ROPE-NONFINITE': 'ropeFinite', 'SIM-NAV-REGION': 'navRegion', 'SIM-NAV-COST': 'navCost',
  'SIM-NAV-LINK': 'navLink', 'SIM-NAV-TERRAIN': 'navTerrain', 'SIM-NAV-REBAKE': 'navRebake', 'SIM-NAV-AGENT': 'navAgent',
  'SIM-NAV-TARGET': 'navTarget', 'SIM-NAV-COVERAGE': 'navCoverage', 'SIM-NAV-CROWD': 'navCrowd', 'SIM-AI-BEHAVIOR': 'aiBehavior',
  'SIM-AI-HSM': 'aiHsm', 'SIM-AI-CROWD': 'aiCrowd'
}

export function buildSimulationProductionReport(entities: readonly Entity[], connections: readonly Connection[], settings: { gravity: number; tickRate: number; timeScale: number }): SimulationProductionReport {
  const issues: SimulationProductionReport['issues'] = [], issueKeys = new Set<string>()
  const add = (code: string, status: 'review' | 'blocked', message: string, fix: string, params: Record<string, string | number> = {}) => {
    const key = `${code}:${message}`; if (issueKeys.has(key)) return
    issueKeys.add(key)
    const stem = issueTranslationStems[code] ?? 'settings'
    issues.push({ code, status, message, fix, messageText: { key: `simulationIssue_${stem}_message`, params }, fixText: { key: `simulationIssue_${stem}_fix`, params } })
  }
  const bodies = entities.filter(entity => entity.enabled && entity.hasComponent('RigidBody2D')), colliders = entities.flatMap(entity => { const collider = entity.getCollider(); return collider?.enabled ? [{ entity, collider }] : [] })
  if (!finite(settings.gravity) || !finite(settings.tickRate) || settings.tickRate < 1 || settings.tickRate > 1000 || !finite(settings.timeScale) || settings.timeScale < 0) add('SIM-NONFINITE-SETTINGS', 'blocked', 'Physics settings contain a non-finite or unsupported value.', 'Use a 1–1000 Hz fixed rate, finite gravity and a non-negative time scale.')
  for (const entity of bodies) {
    const values = [entity.transform.position.x, entity.transform.position.y, entity.transform.rotation, entity.transform.scale.x, entity.transform.scale.y, entity.velocity.x, entity.velocity.y, entity.acceleration.x, entity.acceleration.y, entity.force.x, entity.force.y, entity.angularVelocity, entity.torque, entity.rigidBody.mass, entity.rigidBody.density, entity.rigidBody.inertia, entity.rigidBody.gravityScale, entity.rigidBody.localGravity, entity.rigidBody.linearDamping, entity.rigidBody.angularDamping]
    if (values.some(value => !finite(value))) add('SIM-NONFINITE-BODY', 'blocked', `${entity.name} contains a non-finite transform or physical property.`, 'Restore finite Inspector values before Play or export.', { name: entity.name })
    if (!(entity.transform.scale.x > 0) || !(entity.transform.scale.y > 0) || !(entity.rigidBody.mass > 0) || !(entity.rigidBody.density > 0) || !(entity.rigidBody.inertia > 0)) add('SIM-BODY-BOUNDS', 'blocked', `${entity.name} has non-positive scale, mass, density, or inertia.`, 'Use positive finite physical dimensions and mass properties.', { name: entity.name })
  }
  let children = 0
  for (const { entity, collider } of colliders) {
    const descriptors = [{ kind: collider.shapeModel, points: collider.vertices }, ...collider.shapes.filter(shape => shape.enabled).map(shape => ({ kind: shape.kind, points: shape.points }))]
    const prepared = prepareColliderSet(collider, entity.rigidBody.bodyType === 'Dynamic')
    children += prepared.shapes.length
    if (prepared.blockedReason) add('SIM-COLLIDER-GEOMETRY', 'blocked', `${entity.name}: ${prepared.blockedReason}`, 'Repair degenerate/crossing points, or use convex children for a dynamic body.', { name: entity.name })
    if (!finiteVector(collider.offset) || !finite(collider.rotation) || !finiteVector(collider.size) || collider.size.x <= 0 || collider.size.y <= 0 || !finite(collider.radiusX) || !finite(collider.radiusY) || collider.radiusX <= 0 || collider.radiusY <= 0 || !validMask(collider.collisionMask) || !Number.isInteger(collider.physicsLayer) || collider.physicsLayer < 0 || collider.physicsLayer > 31) add('SIM-COLLIDER-BOUNDS', 'blocked', `${entity.name} has invalid collider dimensions, transform, layer, or mask.`, 'Use finite positive collider dimensions and a physics layer from 0 through 31.', { name: entity.name })
    for (const descriptor of descriptors) {
      const support = PHYSICS_SHAPE_SUPPORT[descriptor.kind]
      if (!support) add('SIM-UNKNOWN-COLLIDER', 'blocked', `${entity.name} uses an unknown collider model.`, 'Choose a supported exact shape in Inspector → Physics.', { name: entity.name })
      if ((descriptor.kind === 'Chain' || descriptor.kind === 'ConcavePolygon') && entity.rigidBody.bodyType === 'Dynamic') add('SIM-DYNAMIC-CONCAVE', 'blocked', `${entity.name} uses dynamic ${descriptor.kind}.`, 'Use Static/Kinematic or author convex compound children.', { name: entity.name, shape: descriptor.kind })
      if ((descriptor.kind === 'Chain' || descriptor.kind.includes('Polygon')) && descriptor.points.length < (descriptor.kind === 'Chain' ? 2 : 3)) add('SIM-COLLIDER-POINTS', 'blocked', `${entity.name} has too few points for ${descriptor.kind}.`, 'Add the required non-degenerate collider points.', { name: entity.name, shape: descriptor.kind })
    }
  }
  for (const connection of connections.filter(value => value.enabled)) {
    if (connection.anchors.length !== 2 || connection.anchors.some(anchor => !entities.some(entity => entity.id === anchor.entityId))) add('SIM-CONSTRAINT-ANCHOR', 'blocked', `${connection.name} has a missing owner anchor.`, 'Reconnect the two existing objects in Connection Builder.', { name: connection.name })
    if (connection.anchors.length === 2 && !connectionSharesLayer(connection, entities as Entity[])) add('SIM-CONSTRAINT-LAYER', 'review', `${connection.name} crosses physics layers and therefore transmits no force.`, 'Move both owners to one physics layer if the constraint should interact.', { name: connection.name })
    const commonValues = [connection.stiffness, connection.damping, connection.maxStretchRatio, connection.bendingToleranceMass, connection.stretchingToleranceMass, connection.collisionRadius, connection.linearDensity, connection.motorSpeed, connection.maxMotorForce, connection.lowerLimit, connection.upperLimit]
    if (commonValues.some(value => !finite(value)) || connection.stiffness < 0 || connection.damping < 0 || connection.maxStretchRatio < 1 || connection.collisionRadius <= 0 || connection.linearDensity <= 0 || connection.maxMotorForce < 0 || connection.lowerLimit > connection.upperLimit || !finiteOrUnbounded(connection.breakForce) || !finiteOrUnbounded(connection.breakTorque)) add('SIM-CONSTRAINT-BOUNDS', 'blocked', `${connection.name} contains an invalid motor, limit, material, or break value.`, 'Use finite ordered limits, non-negative forces/damping, positive density/radius, and a stretch ratio of at least 1.', { name: connection.name })
    if (connection.restLengths.length !== connection.anchors.length - 1 || connection.restLengths.some(value => !finite(value) || value <= 0)) add('SIM-CONSTRAINT-LENGTH', 'blocked', `${connection.name} has invalid authored rest lengths.`, 'Repatch the connection between its current anchors.', { name: connection.name })
    if (connection.componentType === 'Rope2D' && (connection.segmentCount < 3 || connection.segmentCount > 32 || !Number.isInteger(connection.segmentCount))) add('SIM-ROPE-BOUNDS', 'blocked', `${connection.name} has an invalid rope sample count.`, 'Use 3–32 simulated nodes.', { name: connection.name })
    if (connection.componentType === 'Rope2D' && connection.collisionEnabled && connection.ropeNodes.some(node => !finiteVector(node.position) || !finiteVector(node.velocity))) add('SIM-ROPE-NONFINITE', 'blocked', `${connection.name} produced an invalid rope node.`, 'Repair the connection; the last valid authored route remains available.', { name: connection.name })
  }
  const regions = entities.flatMap(entity => { const value = entity.getComponent<NavigationRegion2D>('NavigationRegion2D'); return value?.enabled ? [{ entity, value }] : [] }), agents = entities.filter(entity => entity.getComponent<NavigationAgent2D>('NavigationAgent2D')?.enabled)
  for (const { entity, value } of regions) {
    if (value.polygon.length < 3 || value.polygon.some(point => !finiteVector(point)) || polygonArea(value.polygon) <= 1e-12 || !finite(value.cellSize) || value.cellSize < .01 || value.navigationLayer < 1 || value.navigationLayer > 32 || !validMask(value.navigationMask)) add('SIM-NAV-REGION', 'blocked', `${entity.name} has an invalid navigation polygon, cell size, layer, or mask.`, 'Repair the non-degenerate finite region and bake again.', { name: entity.name })
    if (!finite(value.traversalCost) || value.traversalCost <= 0 || !finite(value.agentRadius) || value.agentRadius < 0 || !['AStar', 'HierarchicalAStar', 'FlowField'].includes(value.algorithm)) add('SIM-NAV-COST', 'blocked', `${entity.name} has invalid terrain cost, clearance, or path algorithm settings.`, 'Use a positive finite traversal cost, non-negative clearance, and a supported algorithm.', { name: entity.name })
    if (value.links.some(link => !finiteVector(link.start) || !finiteVector(link.end) || !finite(link.cost) || link.cost <= 0)) add('SIM-NAV-LINK', 'blocked', `${entity.name} contains an invalid navigation link.`, 'Give every link finite endpoints and a positive traversal cost.', { name: entity.name })
    if (value.costAreas.some(area => !finiteVector(area.center) || !finiteVector(area.size) || !finite(area.radius) || !finite(area.multiplier) || area.multiplier <= 0 || area.navigationLayer < 1 || area.navigationLayer > 32)) add('SIM-NAV-TERRAIN', 'blocked', `${entity.name} contains an invalid terrain-cost area.`, 'Use finite shapes, positive multipliers, and layers from 1 through 32.', { name: entity.name })
    if (value.dynamic && (!finite(value.rebakeInterval) || value.rebakeInterval < .02)) add('SIM-NAV-REBAKE', 'review', `${entity.name} requests excessively frequent rebakes.`, 'Use at least 0.02 seconds, then profile the navigation budget.', { name: entity.name })
  }
  for (const entity of agents) {
    const agent = entity.getComponent<NavigationAgent2D>('NavigationAgent2D')!
    if (!finiteVector(agent.targetPosition) || !finiteVector(agent.velocity) || [agent.speed, agent.acceleration, agent.radius, agent.stoppingDistance, agent.avoidanceRadius, agent.repathInterval, agent.avoidancePriority].some(value => !finite(value)) || agent.speed < 0 || agent.acceleration < 0 || agent.radius <= 0 || agent.stoppingDistance < 0 || agent.avoidanceRadius < 0 || agent.repathInterval < .02 || agent.avoidancePriority < 0 || agent.avoidancePriority > 1 || !validMask(agent.navigationMask)) add('SIM-NAV-AGENT', 'blocked', `${entity.name} has invalid steering, avoidance, target, layer, or mask values.`, 'Repair the NavigationAgent2D values in World Studio.', { name: entity.name })
    if (agent.targetEntityUuid && !entities.some(candidate => candidate.uuid === agent.targetEntityUuid)) add('SIM-NAV-TARGET', 'blocked', `${entity.name} targets a missing navigation object.`, 'Choose an existing target object or use a world-space target position.', { name: entity.name })
    if (!regions.some(({ value }) => value.navigationLayer === agent.navigationLayer && (agent.navigationMask & (1 << ((value.navigationLayer - 1) & 31))) !== 0)) add('SIM-NAV-COVERAGE', 'review', `${entity.name} has no compatible enabled navigation region.`, 'Add/enable a matching region or align its navigation layer and mask.', { name: entity.name })
  }
  if (agents.length > 10_000) add('SIM-NAV-CROWD', 'blocked', `${agents.length} enabled navigation agents exceed the deterministic 10,000-agent scheduler.`, 'Partition the world or disable agents outside active streamed cells.', { count: agents.length, limit: 10_000 })
  const aiEntities = entities.filter(entity => entity.getComponent('BehaviorTree2D')?.enabled || entity.getComponent('StateMachine2D')?.enabled)
  for (const entity of aiEntities) {
    const behavior = entity.getComponent<import('../world/components').BehaviorTree2D>('BehaviorTree2D'), machine = entity.getComponent<import('../world/components').StateMachine2D>('StateMachine2D')
    if (behavior?.enabled && !normalizeBehaviorTree(textDocument<BehaviorTreeDocument>(behavior.treeAsset)!)) add('SIM-AI-BEHAVIOR', 'blocked', `${entity.name} has no valid bounded behavior tree.`, 'Assign or repair its Behavior Tree v1/v2 asset in World Studio.', { name: entity.name })
    if (machine?.enabled && !normalizeStateMachine(textDocument<StateMachineDocument>(machine.machineAsset)!)) add('SIM-AI-HSM', 'blocked', `${entity.name} has no valid acyclic hierarchical state machine.`, 'Assign a State Machine v1/v2 asset with valid parents and transitions.', { name: entity.name })
  }
  if (aiEntities.length > 10_000) add('SIM-AI-CROWD', 'blocked', `${aiEntities.length} enabled AI objects exceed the deterministic scheduler.`, 'Use streamed cells or disable distant AI objects.', { count: aiEntities.length, limit: 10_000 })
  const clothNetworks = ropeNetworks(connections), status = (codes: string[]): SimulationCheckStatus => issues.some(issue => codes.includes(issue.code) && issue.status === 'blocked') ? 'blocked' : issues.some(issue => codes.includes(issue.code)) ? 'review' : 'ready'
  const localized = (key: string, params: Record<string, string | number> = {}): SimulationLocalizedText => ({ key, params })
  const checks: SimulationCheck[] = [
    {
      id: 'units', status: status(['SIM-NONFINITE-SETTINGS', 'SIM-NONFINITE-BODY', 'SIM-BODY-BOUNDS']),
      summary: `1 grid unit = 1 ${PHYSICS_UNITS.distance}`, detail: `${settings.tickRate} Hz fixed step; Inspector angles use degrees and convert once to runtime radians; all distances, times, masses, forces and evidence use SI units.`, fix: 'Use finite values and compare the ruler with Inspector/runtime measurements.',
      summaryText: localized('simulationSummary_units', { unit: PHYSICS_UNITS.distance }), detailText: localized('simulationDetail_units', { tickRate: settings.tickRate }), fixText: localized('simulationFix_units')
    },
    {
      id: 'colliders', status: status(['SIM-UNKNOWN-COLLIDER', 'SIM-DYNAMIC-CONCAVE', 'SIM-COLLIDER-POINTS', 'SIM-COLLIDER-GEOMETRY', 'SIM-COLLIDER-BOUNDS']),
      summary: `${colliders.length} colliders · ${children} exact solver shapes`, detail: 'Compound children, static Chain/Concave contacts, manifolds, rotational CCD and stable sleep islands use the retained Rust/WASM solver.', fix: 'Repair the named collider; dynamic concave geometry must be decomposed into convex children.',
      summaryText: localized('simulationSummary_colliders', { colliders: colliders.length, children }), detailText: localized('simulationDetail_colliders'), fixText: localized('simulationFix_colliders')
    },
    {
      id: 'constraints', status: status(['SIM-CONSTRAINT-ANCHOR', 'SIM-CONSTRAINT-LAYER', 'SIM-CONSTRAINT-BOUNDS', 'SIM-CONSTRAINT-LENGTH', 'SIM-ROPE-BOUNDS', 'SIM-ROPE-NONFINITE']),
      summary: `${connections.length} joints/paths · ${clothNetworks} rope lattices`, detail: 'Motors, limits, break force/torque and owner-excluding Rope2D collision are runtime-bound. Connected Rope2D cycles form cloth-like constrained paths.', fix: 'Repair missing anchors or bounded rope values in Connection Builder.',
      summaryText: localized('simulationSummary_constraints', { connections: connections.length, cloth: clothNetworks }), detailText: localized('simulationDetail_constraints'), fixText: localized('simulationFix_constraints')
    },
    {
      id: 'navigation', status: status(['SIM-NAV-REGION', 'SIM-NAV-COST', 'SIM-NAV-LINK', 'SIM-NAV-TERRAIN', 'SIM-NAV-AGENT', 'SIM-NAV-TARGET', 'SIM-NAV-COVERAGE', 'SIM-NAV-REBAKE', 'SIM-NAV-CROWD']),
      summary: `${regions.length} regions · ${agents.length} agents`, detail: 'Grid, hierarchical A*, flow fields, links, terrain cost, cancellable rebake and priority-aware spatial avoidance are active.', fix: 'Bake valid regions and keep the crowd within the deterministic scheduler limit.',
      summaryText: localized('simulationSummary_navigation', { regions: regions.length, agents: agents.length }), detailText: localized('simulationDetail_navigation'), fixText: localized('simulationFix_navigation')
    },
    {
      id: 'ai', status: status(['SIM-AI-BEHAVIOR', 'SIM-AI-HSM', 'SIM-AI-CROWD']),
      summary: `${aiEntities.length} AI objects`, detail: 'Behavior trees, typed blackboards, spatial perception, utility selection and hierarchical state transitions share bounded deterministic scheduling.', fix: 'Assign valid behavior/state assets and inspect their live trace.',
      summaryText: localized('simulationSummary_ai', { aiAgents: aiEntities.length }), detailText: localized('simulationDetail_ai'), fixText: localized('simulationFix_ai')
    },
    {
      id: 'determinism', status: issues.some(issue => issue.status === 'blocked') ? 'blocked' : 'ready',
      summary: 'Stable-order state evidence', detail: 'Entity, constraint, navigation and AI state is sorted and quantized before each replay checksum.', fix: 'Resolve every blocked simulation check before recording or exporting.',
      summaryText: localized('simulationSummary_determinism'), detailText: localized('simulationDetail_determinism'), fixText: localized('simulationFix_determinism')
    }
  ]
  return { generatedAt: new Date().toISOString(), checks, issues, metrics: { bodies: bodies.length, colliderChildren: children, ropePaths: connections.filter(connection => connection.componentType === 'Rope2D').length, clothNetworks, navigationRegions: regions.length, navigationAgents: agents.length, aiAgents: aiEntities.length }, ready: checks.every(check => check.status !== 'blocked'), checksum: simulationStateChecksum(entities, connections) }
}

export function simulationPreflight(entities: readonly Entity[], connections: readonly Connection[], settings: { gravity: number; tickRate: number; timeScale: number }): { report: SimulationProductionReport; blocked: SimulationProductionReport['issues']; reviews: SimulationProductionReport['issues'] } {
  const report = buildSimulationProductionReport(entities, connections, settings)
  return { report, blocked: report.issues.filter(issue => issue.status === 'blocked'), reviews: report.issues.filter(issue => issue.status === 'review') }
}

export const simulationEvidenceState = reactive({ enabled: false, frames: [] as Array<{ frame: number; checksum: string }>, lastChecksum: '', divergentFrame: -1 })

export function captureSimulationEvidence(frame: number, entities: readonly Entity[], connections: readonly Connection[]): string {
  if (!simulationEvidenceState.enabled) return simulationEvidenceState.lastChecksum
  const checksum = simulationStateChecksum(entities, connections); simulationEvidenceState.lastChecksum = checksum
  const existing = simulationEvidenceState.frames.find(item => item.frame === frame)
  if (existing && existing.checksum !== checksum && simulationEvidenceState.divergentFrame < 0) simulationEvidenceState.divergentFrame = frame
  if (!existing && simulationEvidenceState.frames.length < MAX_EVIDENCE_FRAMES) simulationEvidenceState.frames.push({ frame, checksum })
  return checksum
}

export function clearSimulationEvidence(): void { simulationEvidenceState.frames.splice(0); simulationEvidenceState.lastChecksum = ''; simulationEvidenceState.divergentFrame = -1 }
