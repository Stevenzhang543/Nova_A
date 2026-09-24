/** 场景选择工具：更新选中标识，解析选中根对象及子树，并计算集合中心。 */
import type { Entity } from '../world/Entity'
import { descendantsOf, worldTransform } from '../world/hierarchy'
import type { Vec2 } from '../world/types'

export type SelectionMode = 'replace' | 'add' | 'toggle'

/** 按替换、追加或切换模式生成独立的选中 ID 列表，避免重复 ID。 */ export function updateSelection(current: number[], ids: number[], mode: SelectionMode): number[] {
  const next = mode === 'replace' ? [] : [...current]
  for (const id of ids) {
    const index = next.indexOf(id)
    if (mode === 'toggle' && index !== -1) next.splice(index, 1)
    else if (index === -1) next.push(id)
  }
  return next
}

/** 将选中 ID 转为集合，并按场景原顺序返回命中的实体。 */ export function selectedEntities(ids: number[], entities: Entity[]): Entity[] {
  const selected = new Set(ids)
  return entities.filter(/* 调用 selected.has(entity.id) 并返回调用结果。 */ entity => selected.has(entity.id))
}

/** Remove selected descendants whose selected ancestor already carries them. */
/** 剔除已有选中祖先的后代，防止层级变换重复应用。 */ export function selectionRoots(ids: number[], entities: Entity[]): Entity[] {
  const selected = new Set(ids)
  return selectedEntities(ids, entities).filter(/** 沿父链检查是否已有选中祖先，并用访问集合避免异常层级环。 */ entity => {
    let parentUuid = entity.parentUuid
    const visited = new Set<string>()
    while (parentUuid && !visited.has(parentUuid)) {
      visited.add(parentUuid)
      const parent = entities.find(/* 比较 candidate.uuid 与 parentUuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === parentUuid)
      if (!parent) return true
      if (selected.has(parent.id)) return false
      parentUuid = parent.parentUuid
    }
    return true
  })
}

/** 把选中根及所有后代加入集合，再按场景顺序返回完整子树。 */ export function subtreeEntities(rootIds: number[], entities: Entity[]): Entity[] {
  const included = new Set<number>()
  for (const root of selectedEntities(rootIds, entities)) {
    included.add(root.id)
    for (const child of descendantsOf(root, entities)) included.add(child.id)
  }
  return entities.filter(/* 调用 included.has(entity.id) 并返回调用结果。 */ entity => included.has(entity.id))
}

/** 对选中实体的世界位置求平均；无选择时返回原点。 */ export function selectionCenter(ids: number[], entities: Entity[]): Vec2 {
  const selection = selectedEntities(ids, entities)
  if (!selection.length) return { x: 0, y: 0 }
  const total = selection.reduce(/** 累加每个实体的世界位置，用于计算选择中心。 */ (sum, entity) => {
    const position = worldTransform(entity, entities).position
    sum.x += position.x
    sum.y += position.y
    return sum
  }, { x: 0, y: 0 })
  return { x: total.x / selection.length, y: total.y / selection.length }
}
