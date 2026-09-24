/** 实体层级变换：缓存标识索引，合成父子变换，并在重设父级时防止环和保持世界姿态。 */
import type { Entity } from './Entity'
import { finiteNumber, normalizeAngle, positiveNumber } from './geometry'
import type { Vec2 } from './types'

export interface WorldTransform2D {
  position: Vec2
  rotation: number
  scale: Vec2
}

/** 按弧度旋转二维向量，返回新坐标而不修改输入。 */ function rotate(point: Vec2, angle: number): Vec2 {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  return { x: point.x * cosine - point.y * sine, y: point.x * sine + point.y * cosine }
}

interface HierarchyLookup { entities: readonly Entity[]; byUuid: Map<string, Entity>; length: number; first: Entity | undefined; last: Entity | undefined }
let preparedLookup: HierarchyLookup | null = null

/** Build the hierarchy identity table once for a frame or batch operation.
 * Lookups remain exact for transform edits because entity identity and parent
 * UUIDs are authoritative; structural array changes trigger a rebuild. */
/** 按数组身份、长度和首尾对象复用标识索引；检测到这些结构变化时重新建立映射。 */ export function prepareHierarchyIndex(entities: readonly Entity[]): void {
  if (preparedLookup?.entities === entities && preparedLookup.length === entities.length && preparedLookup.first === entities[0] && preparedLookup.last === entities[entities.length - 1]) return
  preparedLookup = { entities, byUuid: new Map(entities.map(/* 返回按声明顺序构造的数组 [entity.uuid, entity]。 */ entity => [entity.uuid, entity])), length: entities.length, first: entities[0], last: entities[entities.length - 1] }
}

/** 清空层级索引，使下一次查询重新读取实体集合。 */ export function invalidateHierarchyIndex(): void { preparedLookup = null }

/** 确保当前实体集合已建立索引，并返回 UUID 到实体的映射。 */ function hierarchyLookup(entities: readonly Entity[]): Map<string, Entity> {
  prepareHierarchyIndex(entities)
  return preparedLookup!.byUuid
}

/** 递归合成祖先平移、旋转及带符号缩放；遇到缺失父级或环时退回当前局部变换。 */ export function worldTransform(entity: Entity, entities: readonly Entity[], visiting = new Set<string>()): WorldTransform2D {
  const local: WorldTransform2D = {
    position: { x: finiteNumber(entity.transform.position.x), y: finiteNumber(entity.transform.position.y) },
    rotation: normalizeAngle(entity.transform.rotation),
    scale: {
      x: (entity.transform.scale.x < 0 ? -1 : 1) * positiveNumber(entity.transform.scale.x, 1),
      y: (entity.transform.scale.y < 0 ? -1 : 1) * positiveNumber(entity.transform.scale.y, 1)
    }
  }
  const parentUuid = entity.parentUuid
  if (!parentUuid || visiting.has(entity.uuid)) return local
  const parent = hierarchyLookup(entities).get(parentUuid)
  if (!parent || parent === entity) return local
  visiting.add(entity.uuid)
  const parentWorld = worldTransform(parent, entities, visiting)
  visiting.delete(entity.uuid)
  const offset = rotate({
    x: local.position.x * parentWorld.scale.x,
    y: local.position.y * parentWorld.scale.y
  }, parentWorld.rotation)
  return {
    position: {
      x: parentWorld.position.x + offset.x,
      y: parentWorld.position.y + offset.y
    },
    rotation: normalizeAngle(parentWorld.rotation + local.rotation * Math.sign(parentWorld.scale.x * parentWorld.scale.y)),
    scale: {
      x: parentWorld.scale.x * local.scale.x,
      y: parentWorld.scale.y * local.scale.y
    }
  }
}

/** 用层级世界变换先缩放和旋转局部点，再加世界平移。 */ export function localPointToWorld(entity: Entity, point: Vec2, entities: readonly Entity[]): Vec2 {
  const transform = worldTransform(entity, entities)
  const rotated = rotate({ x: point.x * transform.scale.x, y: point.y * transform.scale.y }, transform.rotation)
  return { x: transform.position.x + rotated.x, y: transform.position.y + rotated.y }
}

/** 先移除世界平移和旋转，再除以世界缩放，得到实体局部点。 */ export function worldPointToLocal(entity: Entity, point: Vec2, entities: readonly Entity[]): Vec2 {
  const transform = worldTransform(entity, entities)
  const rotated = rotate({ x: point.x - transform.position.x, y: point.y - transform.position.y }, -transform.rotation)
  return {
    x: rotated.x / transform.scale.x,
    y: rotated.y / transform.scale.y
  }
}

/** 把目标世界姿态逆变换为父级下的局部姿态；无父级时直接写入规范化姿态。 */ export function setWorldTransform(entity: Entity, value: WorldTransform2D, entities: readonly Entity[]): void {
  const parent = entity.parentUuid ? hierarchyLookup(entities).get(entity.parentUuid) : null
  if (!parent) {
    entity.transform.position = { ...value.position }
    entity.transform.rotation = normalizeAngle(value.rotation)
    entity.transform.scale = { ...value.scale }
    return
  }
  const parentWorld = worldTransform(parent, entities)
  const position = rotate({
    x: value.position.x - parentWorld.position.x,
    y: value.position.y - parentWorld.position.y
  }, -parentWorld.rotation)
  entity.transform.position = {
    x: position.x / parentWorld.scale.x,
    y: position.y / parentWorld.scale.y
  }
  entity.transform.rotation = normalizeAngle((value.rotation - parentWorld.rotation) * Math.sign(parentWorld.scale.x * parentWorld.scale.y))
  entity.transform.scale = {
    x: value.scale.x / parentWorld.scale.x,
    y: value.scale.y / parentWorld.scale.y
  }
}

/** 沿候选父级链检查重复 UUID，识别自指及已有父级环。 */ export function wouldCreateParentCycle(entity: Entity, parentUuid: string | null, entities: readonly Entity[]): boolean {
  if (!parentUuid) return false
  if (parentUuid === entity.uuid) return true
  const visited = new Set<string>([entity.uuid])
  const byUuid = hierarchyLookup(entities)
  let current = byUuid.get(parentUuid)
  while (current) {
    if (visited.has(current.uuid)) return true
    visited.add(current.uuid)
    current = current.parentUuid ? byUuid.get(current.parentUuid) : undefined
  }
  return false
}

/** 拒绝产生环的父级变更；必要时将未知父级清空，并按选项保持原世界姿态。 */ export function setParent(entity: Entity, parentUuid: string | null, entities: readonly Entity[], preserveWorldTransform = true): boolean {
  if (wouldCreateParentCycle(entity, parentUuid, entities)) return false
  const nextParentUuid = parentUuid && hierarchyLookup(entities).has(parentUuid) ? parentUuid : null
  if (entity.parentUuid === nextParentUuid) return false
  const currentWorld = preserveWorldTransform ? worldTransform(entity, entities) : null
  entity.parentUuid = nextParentUuid
  if (currentWorld) setWorldTransform(entity, currentWorld, entities)
  return true
}

/** 按广度优先收集后代，并用已访问集合防止异常层级重复遍历。 */ export function descendantsOf(entity: Entity, entities: readonly Entity[]): Entity[] {
  const descendants: Entity[] = []
  const pending = [entity.uuid]
  const visited = new Set<string>()
  while (pending.length) {
    const parentUuid = pending.shift()!
    if (visited.has(parentUuid)) continue
    visited.add(parentUuid)
    for (const child of entities) {
      if (child.parentUuid !== parentUuid || visited.has(child.uuid)) continue
      descendants.push(child)
      pending.push(child.uuid)
    }
  }
  return descendants
}

/** 对根实体世界位置施加增量，再转换回局部姿态，使其后代自然随层级移动。 */ export function translateEntityTree(entity: Entity, delta: Vec2, entities: readonly Entity[]): void {
  const transform = worldTransform(entity, entities)
  setWorldTransform(entity, {
    ...transform,
    position: { x: transform.position.x + delta.x, y: transform.position.y + delta.y }
  }, entities)
}
