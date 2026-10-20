/** 物理调试绘制（编辑器与独立播放器共用）：碰撞轮廓、休眠、包围盒、质心、速度与力、关节、
 * 角色控制器接触法线、绳节点、接触点与法线。调用方先把画布变换到世界坐标（y 轴向上）。 */
import { prepareColliderSet } from '../runtime/physicsGeometry'
import { localPointToWorld, worldTransform } from '../world/hierarchy'
import type { CharacterBody2D, Joint2D } from '../world/components'
import type { Entity } from '../world/Entity'
import type { Connection } from '../world/Connection'
import type { Vec2 } from '../world/types'
import type { CameraRenderView } from './types'

export interface PhysicsDebugOptions {
  showColliders: boolean
  showContactPoints: boolean
  showNormals: boolean
  showSleepingBodies: boolean
  showAabbs: boolean
  showJointConstraints: boolean
  showRopeNodes: boolean
  showCharacterContacts: boolean
  showCentersOfMass: boolean
  showVelocities: boolean
  showForces: boolean
  colorByPhysicsLayer: boolean
}
export const DEFAULT_PHYSICS_DEBUG_OPTIONS: Readonly<PhysicsDebugOptions> = Object.freeze({
  showColliders: true, showContactPoints: true, showNormals: true, showSleepingBodies: true, showAabbs: false, showJointConstraints: true,
  showRopeNodes: true, showCharacterContacts: true, showCentersOfMass: false, showVelocities: false, showForces: false, colorByPhysicsLayer: false
})
export interface PhysicsDebugFrame {
  readonly entities: readonly Entity[]
  readonly connections: readonly Connection[]
  /** This frame's physics events (contact point/normal arrays when the solver reported them). */
  readonly events: readonly { point?: unknown; normal?: unknown }[]
  readonly layerColors?: readonly ({ color?: string } | undefined)[]
  /** Screen pixels per world unit, so lines and markers keep a constant on-screen size. */
  readonly pixelsPerUnit: number
  readonly include?: (entity: Entity) => boolean
}
export interface PhysicsDebugCounts { colliders: number; sleeping: number; characters: number; contacts: number }

const JOINT_KINDS = ['FixedJoint2D', 'WeldJoint2D', 'DistanceJoint2D', 'RopeJoint2D', 'RevoluteJoint2D', 'MotorJoint2D', 'PrismaticJoint2D', 'SpringJoint2D'] as const

function rotateLocal(point: Vec2, angle: number): Vec2 {
  const cosine = Math.cos(angle), sine = Math.sin(angle)
  return { x: point.x * cosine - point.y * sine, y: point.x * sine + point.y * cosine }
}

/** World-space outlines of an entity's enabled collider shapes (circles sampled, boxes closed). */
export function colliderOutlines(entity: Entity, entities: readonly Entity[]): { points: Vec2[]; id: string | number; sensor: boolean; physicsLayer: number }[] {
  const collider = entity.getCollider()
  if (!collider?.enabled) return []
  const prepared = prepareColliderSet(collider, !entity.isStatic && !entity.isKinematic)
  return prepared.shapes.map(shape => {
    let authored = shape.points
    if (!authored.length && shape.kind === 'Circle') authored = Array.from({ length: 49 }, (_, index) => { const angle = index / 48 * Math.PI * 2; return { x: Math.cos(angle) * shape.size.x * .5, y: Math.sin(angle) * shape.size.y * .5 } })
    else if (!authored.length) authored = [{ x: -shape.size.x * .5, y: -shape.size.y * .5 }, { x: shape.size.x * .5, y: -shape.size.y * .5 }, { x: shape.size.x * .5, y: shape.size.y * .5 }, { x: -shape.size.x * .5, y: shape.size.y * .5 }, { x: -shape.size.x * .5, y: -shape.size.y * .5 }]
    else authored = [...authored, authored[0]]
    const points = authored.map(vertex => { const rotated = rotateLocal(vertex, shape.rotation); return localPointToWorld(entity, { x: shape.offset.x + rotated.x, y: shape.offset.y + rotated.y }, entities as Entity[]) })
    return { points, id: shape.id, sensor: shape.sensor, physicsLayer: shape.physicsLayer }
  })
}

function path(context: CanvasRenderingContext2D, points: readonly Vec2[]): void {
  context.beginPath(); context.moveTo(points[0].x, points[0].y)
  for (let index = 1; index < points.length; index++) context.lineTo(points[index].x, points[index].y)
}
function arrow(context: CanvasRenderingContext2D, from: Vec2, direction: Vec2, length: number, color: string): void {
  context.beginPath(); context.moveTo(from.x, from.y); context.lineTo(from.x + direction.x * length, from.y + direction.y * length); context.strokeStyle = color; context.stroke()
}

/** Draws the enabled layers on a context already in world space (y up). Returns what was drawn. */
export function drawPhysicsDebug(context: CanvasRenderingContext2D, frame: PhysicsDebugFrame, options: PhysicsDebugOptions): PhysicsDebugCounts {
  const counts: PhysicsDebugCounts = { colliders: 0, sleeping: 0, characters: 0, contacts: 0 }
  const unit = 1 / Math.max(1e-6, frame.pixelsPerUnit), entities = frame.entities as Entity[]
  context.save()
  context.lineWidth = 1.5 * unit
  for (const entity of entities) {
    if (!entity.enabled || frame.include && !frame.include(entity)) continue
    const outlines = colliderOutlines(entity, entities)
    const allPoints = outlines.flatMap(outline => outline.points)
    if (!allPoints.length) continue
    counts.colliders += outlines.length
    if (entity.rigidBody.sleeping) counts.sleeping++
    if (options.showSleepingBodies && entity.rigidBody.sleeping) {
      context.fillStyle = 'rgba(92,156,255,.13)'
      for (const { points } of outlines) { if (points.length < 2) continue; path(context, points); context.closePath(); context.fill() }
    }
    if (options.showColliders) {
      for (const outline of outlines) {
        const { points } = outline
        if (points.length < 2) continue
        context.strokeStyle = options.colorByPhysicsLayer ? (frame.layerColors?.[outline.physicsLayer]?.color ?? '#62d8a0') : outline.sensor ? '#f2b45f' : entity.rigidBody.sleeping ? '#669ce8' : '#62d8a0'
        path(context, points); context.stroke()
        if (outlines.length > 1) {
          const center = points.reduce((sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }), { x: 0, y: 0 })
          // Labels are drawn upright (the world transform flips y).
          context.save(); context.translate(center.x + 3 * unit, center.y - 3 * unit); context.scale(1, -1)
          context.fillStyle = context.strokeStyle; context.font = `${10 * unit}px ui-monospace, monospace`; context.fillText(`#${String(outline.id).slice(-5)}`, 0, 0)
          context.restore()
        }
      }
    }
    if (options.showAabbs) {
      let left = Infinity, right = -Infinity, bottom = Infinity, top = -Infinity
      for (const point of allPoints) { left = Math.min(left, point.x); right = Math.max(right, point.x); bottom = Math.min(bottom, point.y); top = Math.max(top, point.y) }
      context.setLineDash([4 * unit, 4 * unit]); context.strokeStyle = '#b786f5'; context.strokeRect(left, bottom, right - left, top - bottom); context.setLineDash([])
    }
    const center = worldTransform(entity, entities).position
    if (options.showCentersOfMass) {
      const radius = 5 * unit
      context.beginPath(); context.arc(center.x, center.y, radius, 0, Math.PI * 2); context.strokeStyle = '#ffffff'; context.stroke()
      context.beginPath(); context.moveTo(center.x - radius, center.y); context.lineTo(center.x + radius, center.y); context.moveTo(center.x, center.y - radius); context.lineTo(center.x, center.y + radius); context.strokeStyle = '#ff9f57'; context.stroke()
    }
    const speed = Math.hypot(entity.velocity.x, entity.velocity.y)
    if (options.showVelocities && speed > 1e-9) arrow(context, center, { x: entity.velocity.x / speed, y: entity.velocity.y / speed }, Math.min(80 * unit, 12 * unit * Math.log2(2 + speed)), '#55c8ff')
    const force = Math.hypot(entity.force.x, entity.force.y)
    if (options.showForces && force > 1e-9) arrow(context, center, { x: entity.force.x / force, y: entity.force.y / force }, Math.min(80 * unit, 10 * unit * Math.log2(2 + force)), '#ff7f8a')
  }
  if (options.showJointConstraints) {
    context.strokeStyle = '#e6b35a'; context.setLineDash([5 * unit, 3 * unit])
    for (const entity of entities) for (const kind of JOINT_KINDS) {
      const joint = entity.getComponent<Joint2D>(kind)
      const target = joint?.targetEntityUuid ? entities.find(candidate => candidate.uuid === joint.targetEntityUuid) : null
      if (!joint?.enabled || !target) continue
      const first = localPointToWorld(entity, joint.anchor, entities), second = localPointToWorld(target, joint.connectedAnchor, entities)
      context.beginPath(); context.moveTo(first.x, first.y); context.lineTo(second.x, second.y); context.stroke()
    }
    context.setLineDash([])
  }
  for (const entity of entities) {
    const character = entity.getComponent<CharacterBody2D>('CharacterBody2D')
    if (!character?.enabled || !entity.enabled) continue
    counts.characters++
    if (!options.showCharacterContacts) continue
    const position = worldTransform(entity, entities).position
    const states = [[character.onFloor, character.floorNormal, '#70df9d'], [character.onWall, character.wallNormal, '#6cb5ff'], [character.onCeiling, character.ceilingNormal, '#ffbc68']] as const
    for (const [active, normal, color] of states) if (active) arrow(context, position, normal, 30 * unit, color)
    // Requested motion this step (what the script asked for), as a thin line.
    if (Math.hypot(character.motionVelocity.x, character.motionVelocity.y) > 1e-6) { context.save(); context.setLineDash([3 * unit, 3 * unit]); arrow(context, position, character.motionVelocity, .25, '#c9a2ff'); context.restore() }
  }
  if (options.showRopeNodes) {
    context.fillStyle = '#8bb8ff'
    for (const connection of frame.connections) for (const node of connection.ropeNodes) { context.beginPath(); context.arc(node.position.x, node.position.y, 2.5 * unit, 0, Math.PI * 2); context.fill() }
  }
  for (const event of frame.events) {
    if (!Array.isArray(event.point)) continue
    counts.contacts++
    if (!options.showContactPoints && !options.showNormals) continue
    const point = { x: Number(event.point[0]), y: Number(event.point[1]) }
    if (options.showContactPoints) { context.beginPath(); context.arc(point.x, point.y, 4 * unit, 0, Math.PI * 2); context.fillStyle = '#ff6b78'; context.fill() }
    if (options.showNormals && Array.isArray(event.normal)) arrow(context, point, { x: Number(event.normal[0]), y: Number(event.normal[1]) }, 24 * unit, '#ffdf73')
  }
  context.restore()
  return counts
}

/** Sets a context (in CSS pixels) to the world space of a camera view, as the scene renderer draws it. */
export function applyCameraWorldTransform(context: CanvasRenderingContext2D, camera: CameraRenderView, width: number, height: number): void {
  if (!camera.position) { context.translate(camera.offset.x, camera.offset.y); context.scale(camera.scale, -camera.scale); return }
  const viewport = camera.viewport ?? { x: 0, y: 0, width: 1, height: 1 }
  context.translate(viewport.x * width + viewport.width * width * .5, (1 - viewport.y - viewport.height) * height + viewport.height * height * .5)
  context.scale(camera.scale, -camera.scale)
  context.rotate(-(camera.rotation ?? 0))
  context.translate(-camera.position.x, -camera.position.y)
}
