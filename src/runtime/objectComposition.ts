import { componentAuthoringRule } from '../editor/sceneAuthoring'
import type { Entity } from '../world/Entity'
import * as constructors from '../world/components'
import { Collider2D, Joint2D, ShapeRenderer2D, type ColliderKind2D, type Component2D, type ComponentKind, type JointKind2D } from '../world/components'
import { STABLE_COMPONENT_KINDS } from '../world/componentRegistry'

export interface ObjectCompositionPlan { remove: ComponentKind[]; add: Component2D[]; kinds: ComponentKind[] }
const colliderKinds: ColliderKind2D[] = ['BoxCollider2D', 'EllipseCollider2D', 'PolygonCollider2D']

function createComponent(kind: ComponentKind): Component2D {
  if (kind === 'ShapeRenderer2D') return new ShapeRenderer2D('Rectangle')
  if (colliderKinds.includes(kind as ColliderKind2D)) return new Collider2D(kind as ColliderKind2D)
  if (kind.endsWith('Joint2D')) return new Joint2D(kind as JointKind2D)
  const Constructor = (constructors as unknown as Partial<Record<ComponentKind, new () => Component2D>>)[kind]
  if (!Constructor) throw Error(`${kind} cannot be created as an entity component. Rope2D is authored as a scene connection.`)
  return new Constructor()
}

/** Validate the whole resulting composition and allocate defaults before changing an entity. */
export function planObjectComposition(entity: Entity, required: readonly ComponentKind[], excluded: readonly ComponentKind[]): ObjectCompositionPlan {
  const removed = new Set(excluded), existing = new Set(entity.components.map(component => component.kind))
  if (removed.has('Transform2D')) throw Error('Object composition cannot exclude Transform2D.')
  const kinds = new Set<ComponentKind>([...existing].filter(kind => !removed.has(kind)))
  for (const kind of required) {
    if (removed.has(kind)) throw Error(`${kind} cannot be both required and excluded.`)
    kinds.add(kind)
  }
  kinds.add('Transform2D')
  for (const kind of kinds) {
    if (!STABLE_COMPONENT_KINDS.includes(kind)) throw Error(`Unknown component requirement: ${kind}.`)
    const dependencies = [...componentAuthoringRule(kind).required]
    if (kind === 'Area2D' && !colliderKinds.some(collider => kinds.has(collider))) {
      const collider = colliderKinds.find(candidate => !removed.has(candidate))
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
  const add = [...kinds].filter(kind => !existing.has(kind)).map(createComponent)
  return { remove: [...removed].filter(kind => existing.has(kind)), add, kinds: [...kinds] }
}

export function applyObjectComposition(entity: Entity, plan: ObjectCompositionPlan): void {
  for (const kind of plan.remove) entity.removeComponent(kind)
  // A previously removed component must receive freshly planned defaults, not stale disabled state.
  for (const component of plan.add) entity.componentMap.set(component.kind, component)
}
