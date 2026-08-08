import type { Entity } from '../world/Entity'
import { descendantsOf, worldTransform } from '../world/hierarchy'
import type { Vec2 } from '../world/types'

export type SelectionMode = 'replace' | 'add' | 'toggle'

export function updateSelection(current: number[], ids: number[], mode: SelectionMode): number[] {
  const next = mode === 'replace' ? [] : [...current]
  for (const id of ids) {
    const index = next.indexOf(id)
    if (mode === 'toggle' && index !== -1) next.splice(index, 1)
    else if (index === -1) next.push(id)
  }
  return next
}

export function selectedEntities(ids: number[], entities: Entity[]): Entity[] {
  const selected = new Set(ids)
  return entities.filter(entity => selected.has(entity.id))
}

/** Remove selected descendants whose selected ancestor already carries them. */
export function selectionRoots(ids: number[], entities: Entity[]): Entity[] {
  const selected = new Set(ids)
  return selectedEntities(ids, entities).filter(entity => {
    let parentUuid = entity.parentUuid
    const visited = new Set<string>()
    while (parentUuid && !visited.has(parentUuid)) {
      visited.add(parentUuid)
      const parent = entities.find(candidate => candidate.uuid === parentUuid)
      if (!parent) return true
      if (selected.has(parent.id)) return false
      parentUuid = parent.parentUuid
    }
    return true
  })
}

export function subtreeEntities(rootIds: number[], entities: Entity[]): Entity[] {
  const included = new Set<number>()
  for (const root of selectedEntities(rootIds, entities)) {
    included.add(root.id)
    for (const child of descendantsOf(root, entities)) included.add(child.id)
  }
  return entities.filter(entity => included.has(entity.id))
}

export function selectionCenter(ids: number[], entities: Entity[]): Vec2 {
  const selection = selectedEntities(ids, entities)
  if (!selection.length) return { x: 0, y: 0 }
  const total = selection.reduce((sum, entity) => {
    const position = worldTransform(entity, entities).position
    sum.x += position.x
    sum.y += position.y
    return sum
  }, { x: 0, y: 0 })
  return { x: total.x / selection.length, y: total.y / selection.length }
}
