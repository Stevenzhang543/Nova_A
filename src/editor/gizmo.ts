/** 场景变换手柄数学：捕获原始姿态并按枢轴及方向应用平移、旋转和缩放。 */
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

/** 仅为选中的层级根捕获独立世界变换快照，供整个拖动过程基于原姿态计算。 */ export function captureTransforms(ids: number[], entities: Entity[]): TransformSnapshot[] {
  return selectionRoots(ids, entities).map(/** 复制实体世界位置、旋转和缩放，同时保留对应实体引用。 */ entity => {
    const transform = worldTransform(entity, entities)
    return {
      entity,
      position: { ...transform.position },
      rotation: transform.rotation,
      scale: { ...transform.scale }
    }
  })
}

/** 中心模式或无主选对象时使用集合中心，否则使用主选对象世界位置。 */ export function gizmoPivot(ids: number[], primaryId: number | null, mode: PivotMode, entities: Entity[]): Vec2 {
  if (mode === 'center' || primaryId === null) return selectionCenter(ids, entities)
  const primary = entities.find(/* 比较 entity.id 与 primaryId，返回严格相等的判断结果。 */ entity => entity.id === primaryId)
  return primary ? { ...worldTransform(primary, entities).position } : selectionCenter(ids, entities)
}

/** 世界空间使用零旋转，本地空间使用主选对象世界旋转。 */ export function gizmoRotation(primaryId: number | null, space: TransformSpace, entities: Entity[]): number {
  if (space === 'world' || primaryId === null) return 0
  const primary = entities.find(/* 比较 entity.id 与 primaryId，返回严格相等的判断结果。 */ entity => entity.id === primaryId)
  return primary ? worldTransform(primary, entities).rotation : 0
}

/** 根据手柄轴和旋转返回单位方向，纵轴相对横轴旋转九十度。 */ export function axisVector(axis: Exclude<GizmoAxis, 'xy'>, rotation: number): Vec2 {
  const angle = rotation + (axis === 'y' ? Math.PI / 2 : 0)
  return { x: Math.cos(angle), y: Math.sin(angle) }
}

/** 双轴模式保留原位移，单轴模式将位移正交投影到指定旋转轴。 */ export function projectedDelta(delta: Vec2, axis: GizmoAxis, rotation: number): Vec2 {
  if (axis === 'xy') return delta
  const vector = axisVector(axis, rotation)
  const distance = delta.x * vector.x + delta.y * vector.y
  return { x: vector.x * distance, y: vector.y * distance }
}

/** 基于原始快照给每个选中根增加世界位移，再写回层级局部变换。 */ export function applyTranslation(snapshots: TransformSnapshot[], delta: Vec2, entities: Entity[]): void {
  for (const snapshot of snapshots) {
    setWorldTransform(snapshot.entity, {
      position: { x: snapshot.position.x + delta.x, y: snapshot.position.y + delta.y },
      rotation: snapshot.rotation,
      scale: { ...snapshot.scale }
    }, entities)
  }
}

/** 围绕共同枢轴旋转各对象原始世界位置，同时增加旋转角并保留原缩放。 */ export function applyRotation(snapshots: TransformSnapshot[], pivot: Vec2, delta: number, entities: Entity[]): void {
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

/** 以共同枢轴按轴缩放原始世界位置及尺寸，尺寸按现有约定限制为正的最小值。 */ export function applyScale(snapshots: TransformSnapshot[], pivot: Vec2, factor: Vec2, entities: Entity[]): void {
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
