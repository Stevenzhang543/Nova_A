import type { Entity } from '../world/Entity'
import { setWorldTransform, worldTransform } from '../world/hierarchy'
import type { Vec2 } from '../world/types'
import { selectionCenter, selectionRoots } from './selection'

export type TransformTool = 'select' | 'move' | 'rotate' | 'scale' | 'pivot' | 'rect' | 'path' | 'polygon' | 'collider' | 'measure'
export type TransformSpace = 'local' | 'world'
export type PivotMode = 'pivot' | 'center'
export type GizmoAxis = 'x' | 'y' | 'xy'

export interface TransformSnapshot {
  entity: Entity
  position: Vec2
  rotation: number
  scale: Vec2
}

export function captureTransforms(ids: number[], entities: Entity[]): TransformSnapshot[] {
  return selectionRoots(ids, entities).map(entity => {
    const transform = worldTransform(entity, entities)
    return {
      entity,
      position: { ...transform.position },
      rotation: transform.rotation,
      scale: { ...transform.scale }
    }
  })
}

export function gizmoPivot(ids: number[], primaryId: number | null, mode: PivotMode, entities: Entity[]): Vec2 {
  if (mode === 'center' || primaryId === null) return selectionCenter(ids, entities)
  const primary = entities.find(entity => entity.id === primaryId)
  return primary ? { ...worldTransform(primary, entities).position } : selectionCenter(ids, entities)
}

export function gizmoRotation(primaryId: number | null, space: TransformSpace, entities: Entity[]): number {
  if (space === 'world' || primaryId === null) return 0
  const primary = entities.find(entity => entity.id === primaryId)
  return primary ? worldTransform(primary, entities).rotation : 0
}

export function axisVector(axis: Exclude<GizmoAxis, 'xy'>, rotation: number): Vec2 {
  const angle = rotation + (axis === 'y' ? Math.PI / 2 : 0)
  return { x: Math.cos(angle), y: Math.sin(angle) }
}

export function projectedDelta(delta: Vec2, axis: GizmoAxis, rotation: number): Vec2 {
  if (axis === 'xy') return delta
  const vector = axisVector(axis, rotation)
  const distance = delta.x * vector.x + delta.y * vector.y
  return { x: vector.x * distance, y: vector.y * distance }
}

export function applyTranslation(snapshots: TransformSnapshot[], delta: Vec2, entities: Entity[]): void {
  for (const snapshot of snapshots) {
    setWorldTransform(snapshot.entity, {
      position: { x: snapshot.position.x + delta.x, y: snapshot.position.y + delta.y },
      rotation: snapshot.rotation,
      scale: { ...snapshot.scale }
    }, entities)
  }
}

export function applyRotation(snapshots: TransformSnapshot[], pivot: Vec2, delta: number, entities: Entity[]): void {
  const cosine = Math.cos(delta)
  const sine = Math.sin(delta)
  for (const snapshot of snapshots) {
    const offset = { x: snapshot.position.x - pivot.x, y: snapshot.position.y - pivot.y }
    setWorldTransform(snapshot.entity, {
      position: {
        x: pivot.x + offset.x * cosine - offset.y * sine,
        y: pivot.y + offset.x * sine + offset.y * cosine
      },
      rotation: snapshot.rotation + delta,
      scale: { ...snapshot.scale }
    }, entities)
  }
}

export function applyScale(snapshots: TransformSnapshot[], pivot: Vec2, factor: Vec2, entities: Entity[]): void {
  for (const snapshot of snapshots) {
    setWorldTransform(snapshot.entity, {
      position: {
        x: pivot.x + (snapshot.position.x - pivot.x) * factor.x,
        y: pivot.y + (snapshot.position.y - pivot.y) * factor.y
      },
      rotation: snapshot.rotation,
      scale: {
        x: Math.max(1e-9, snapshot.scale.x * factor.x),
        y: Math.max(1e-9, snapshot.scale.y * factor.y)
      }
    }, entities)
  }
}
