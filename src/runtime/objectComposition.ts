/** 对象组合工具：解析组件及蓝图组合关系，并检查组合数据。 */
import { componentAuthoringRule } from '../editor/sceneAuthoring'
import type { Entity } from '../world/Entity'
import * as constructors from '../world/components'
import { Collider2D, Joint2D, ShapeRenderer2D, type ColliderKind2D, type Component2D, type ComponentKind, type JointKind2D } from '../world/components'
import { STABLE_COMPONENT_KINDS } from '../world/componentRegistry'

export interface ObjectCompositionPlan { remove: ComponentKind[]; add: Component2D[]; kinds: ComponentKind[] }
const colliderKinds: ColliderKind2D[] = ['BoxCollider2D', 'EllipseCollider2D', 'PolygonCollider2D']

/** 按类型构造渲染、碰撞、关节或注册组件，拒绝不可作为实体组件创建的类型。 */ function createComponent(kind: ComponentKind): Component2D {
  if (kind === 'ShapeRenderer2D') return new ShapeRenderer2D('Rectangle')
  if (colliderKinds.includes(kind as ColliderKind2D)) return new Collider2D(kind as ColliderKind2D)
  if (kind.endsWith('Joint2D')) return new Joint2D(kind as JointKind2D)
  const Constructor = (constructors as unknown as Partial<Record<ComponentKind, new () => Component2D>>)[kind]
  if (!Constructor) throw Error(`${kind} cannot be created as an entity component. Rope2D is authored as a scene connection.`)
  return new Constructor()
}

/** Validate the whole resulting composition and allocate defaults before changing an entity. */
/** 计算组件增删与依赖闭包，保证变换存在，拒绝排除冲突或不兼容组件后预构造新增实例。 */ export function planObjectComposition(entity: Entity, required: readonly ComponentKind[], excluded: readonly ComponentKind[]): ObjectCompositionPlan {
  const removed = new Set(excluded), existing = new Set(entity.components.map(/* 返回 component.kind 的当前值。 */ component => component.kind))
  if (removed.has('Transform2D')) throw Error('Object composition cannot exclude Transform2D.')
  const kinds = new Set<ComponentKind>([...existing].filter(/* 返回 removed.has(kind) 的逻辑取反结果。 */ kind => !removed.has(kind)))
  for (const kind of required) {
    if (removed.has(kind)) throw Error(`${kind} cannot be both required and excluded.`)
    kinds.add(kind)
  }
  kinds.add('Transform2D')
  for (const kind of kinds) {
    if (!STABLE_COMPONENT_KINDS.includes(kind)) throw Error(`Unknown component requirement: ${kind}.`)
    const dependencies = [...componentAuthoringRule(kind).required]
    if (kind === 'Area2D' && !colliderKinds.some(/* 调用 kinds.has(collider) 并返回调用结果。 */ collider => kinds.has(collider))) {
      const collider = colliderKinds.find(/* 返回 removed.has(candidate) 的逻辑取反结果。 */ candidate => !removed.has(candidate))
      if (!collider) throw Error('Area2D requires a collider, but all collider kinds are excluded.')
      dependencies.push(collider)
    }
    for (const dependency of dependencies) {
      if (removed.has(dependency)) throw Error(`${kind} requires excluded component ${dependency}.`)
      kinds.add(dependency)
    }
  }
  for (const kind of kinds) for (const conflict of componentAuthoringRule(kind).conflicts) {
    if (kinds.has(conflict)) throw Error(`${kind} conflicts with ${conflict} in the final object composition.`)
  }
  const add = [...kinds].filter(/* 返回 existing.has(kind) 的逻辑取反结果。 */ kind => !existing.has(kind)).map(createComponent)
  return { remove: [...removed].filter(/* 调用 existing.has(kind) 并返回调用结果。 */ kind => existing.has(kind)), add, kinds: [...kinds] }
}

/** 移除计划排除组件并写入新构造的默认实例，避免复用旧移除状态。 */ export function applyObjectComposition(entity: Entity, plan: ObjectCompositionPlan): void {
  for (const kind of plan.remove) entity.removeComponent(kind)
  // A previously removed component must receive freshly planned defaults, not stale disabled state.
  for (const component of plan.add) entity.componentMap.set(component.kind, component)
}
