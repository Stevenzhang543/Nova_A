/** 实体层级变换：缓存标识索引，合成父子变换，并在重设父级时防止环和保持世界姿态。 */
import { plainView } from './plainView'
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

interface HierarchyEntry { entity: Entity; index: number }
interface HierarchyLookup { entities: readonly Entity[]; byUuid: Map<string, HierarchyEntry>; length: number; first: Entity | undefined; last: Entity | undefined }
let preparedLookup: HierarchyLookup | null = null

/** Build the hierarchy identity table once for a frame or batch operation.
 * Lookups remain exact for transform edits because entity identity and parent
 * UUIDs are authoritative; structural array changes trigger a rebuild. */
/** 按数组身份、长度和首尾对象复用标识索引；检测到这些结构变化时重新建立映射。 */ export function prepareHierarchyIndex(observed: readonly Entity[]): void {
  // Proxied and plain views of one world share one index (parents are only read through it).
  const entities = plainView(observed)
  if (preparedLookup?.entities === entities && preparedLookup.length === entities.length && preparedLookup.first === entities[0] && preparedLookup.last === entities[entities.length - 1]) return
  preparedLookup = { entities, byUuid: new Map(entities.map((entity, index) => [entity.uuid, { entity, index }])), length: entities.length, first: entities[0], last: entities[entities.length - 1] }
}

/** 清空层级索引，使下一次查询重新读取实体集合。 */ export function invalidateHierarchyIndex(): void { preparedLookup = null }

/** Resolve current identity even when an in-place replacement preserves length and endpoints.
 * Existing valid lookups stay O(1); a stale or missing identity rebuilds once for this query. */
function hierarchyEntity(uuid: string, observed: readonly Entity[]): Entity | undefined {
  const entities = plainView(observed)
  prepareHierarchyIndex(entities)
  const entry = preparedLookup!.byUuid.get(uuid)
  if (entry && entities[entry.index] === entry.entity) return entry.entity
  invalidateHierarchyIndex()
  prepareHierarchyIndex(entities)
  return preparedLookup!.byUuid.get(uuid)?.entity
}

/** 归一化实体自身的局部变换；负数缩放拆成符号与正量级。 */
export function localTransform(entity: Entity): WorldTransform2D {
  return {
    position: { x: finiteNumber(entity.transform.position.x), y: finiteNumber(entity.transform.position.y) },
    rotation: normalizeAngle(entity.transform.rotation),
    scale: {
      x: (entity.transform.scale.x < 0 ? -1 : 1) * positiveNumber(entity.transform.scale.x, 1),
      y: (entity.transform.scale.y < 0 ? -1 : 1) * positiveNumber(entity.transform.scale.y, 1)
    }
  }
}

/** 把父级世界变换与子级局部变换合成为一个世界变换。
 * 这是唯一的组合实现：递归版与批量版都调用它，避免两份公式各自漂移。 */
export function composeWorldTransform(parentWorld: WorldTransform2D, local: WorldTransform2D): WorldTransform2D {
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

/** 返回父级先于子级的实体顺序（拓扑序），同级保持输入数组中的相对次序。
 * 用途：生命周期派发。父先子先近似"进入树"，其逆序近似"就绪/退出树"。
 * 缺失父级、自引用与环中的实体都保证被包含且函数一定终止——顺序问题不能让实体消失。 */
export function hierarchyOrder(entities: readonly Entity[]): Entity[] {
  const byUuid = new Map(entities.map(/* 建立 uuid 索引，父级查找保持 O(1)。 */ entity => [entity.uuid, entity]))
  const children = new Map<string, Entity[]>()
  const roots: Entity[] = []
  for (const entity of entities) {
    const parent = entity.parentUuid ? byUuid.get(entity.parentUuid) : undefined
    if (!parent || parent === entity) { roots.push(entity); continue }
    const siblings = children.get(parent.uuid)
    if (siblings) siblings.push(entity)
    else children.set(parent.uuid, [entity])
  }
  const ordered: Entity[] = []
  const visited = new Set<string>()
  const visit = (/** 深度优先展开子树；已访问即返回，避免环导致无限递归。 */ entity: Entity): void => {
    if (visited.has(entity.uuid)) return
    visited.add(entity.uuid)
    ordered.push(entity)
    for (const child of children.get(entity.uuid) ?? []) visit(child)
  }
  for (const root of roots) visit(root)
  // 仅出现在环中的实体不会从任何根到达，这里兜底收录，保证输出是输入的一个排列。
  for (const entity of entities) visit(entity)
  return ordered
}

/** 检测层级环：沿 parentUuid 上溯，当前路径上重复出现同一实体即为环。
 * 环状文档没有合法的世界变换（实测递归版与批量版会给出不同且互不自洽的结果），
 * 因此调用方应据此拒绝或修复文档，而不是依赖任意一个变换结果。本函数只做检测，不修改数据。 */
export function hierarchyHasCycle(entities: readonly Entity[]): boolean {
  const byUuid = new Map(entities.map(/* 建立 uuid 到实体的映射以保持线性成本。 */ entity => [entity.uuid, entity]))
  for (const start of entities) {
    const seen = new Set<string>()
    let current: Entity | undefined = start
    while (current && byUuid.has(current.uuid)) {
      if (seen.has(current.uuid)) return true
      seen.add(current.uuid)
      const parentUuid: string | null = current.parentUuid
      current = parentUuid ? byUuid.get(parentUuid) : undefined
    }
  }
  return false
}

/** 递归合成祖先平移、旋转及带符号缩放；遇到缺失父级或环时退回当前局部变换。 */ export function worldTransform(entity: Entity, entities: readonly Entity[], visiting = new Set<string>()): WorldTransform2D {
  const local = localTransform(entity)
  const parentUuid = entity.parentUuid
  if (!parentUuid || visiting.has(entity.uuid)) return local
  const parent = hierarchyEntity(parentUuid, entities)
  if (!parent || parent === entity) return local
  visiting.add(entity.uuid)
  const parentWorld = worldTransform(parent, entities, visiting)
  visiting.delete(entity.uuid)
  return composeWorldTransform(parentWorld, local)
}

/** 一次性求解一批实体的世界变换：每个祖先只计算一次，结果由调用方持有。
 * 生命周期归调用方（一次渲染抽取或一次排序），因此不需要全局失效信号；
 * 缺失父级或环仍按 worldTransform 的语义退回局部变换。 */
export function worldTransformsFor(entities: readonly Entity[], subset: readonly Entity[]): Map<string, WorldTransform2D> {
  const cache = new Map<string, WorldTransform2D>()
  const resolving = new Set<string>()
  const resolve = (entity: Entity): WorldTransform2D => {
    const cached = cache.get(entity.uuid)
    if (cached) return cached
    const local = localTransform(entity)
    const parentUuid = entity.parentUuid
    if (!parentUuid || resolving.has(entity.uuid)) { cache.set(entity.uuid, local); return local }
    const parent = hierarchyEntity(parentUuid, entities)
    if (!parent || parent === entity) { cache.set(entity.uuid, local); return local }
    resolving.add(entity.uuid)
    const parentWorld = resolve(parent)
    resolving.delete(entity.uuid)
    const world = composeWorldTransform(parentWorld, local)
    cache.set(entity.uuid, world)
    return world
  }
  for (const entity of subset) resolve(entity)
  return cache
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
  const parent = entity.parentUuid ? hierarchyEntity(entity.parentUuid, entities) : null
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
  let current = hierarchyEntity(parentUuid, entities)
  while (current) {
    if (visited.has(current.uuid)) return true
    visited.add(current.uuid)
    current = current.parentUuid ? hierarchyEntity(current.parentUuid, entities) : undefined
  }
  return false
}

/** 拒绝产生环的父级变更；必要时将未知父级清空，并按选项保持原世界姿态。 */ export function setParent(entity: Entity, parentUuid: string | null, entities: readonly Entity[], preserveWorldTransform = true): boolean {
  if (wouldCreateParentCycle(entity, parentUuid, entities)) return false
  const nextParentUuid = parentUuid && hierarchyEntity(parentUuid, entities) ? parentUuid : null
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

/** Collect roots and descendants in scene order, preserving the original entity references. */
export function subtreeEntities(rootIds: readonly number[], entities: Entity[]): Entity[] {
  const selected = new Set(rootIds), included = new Set<number>()
  for (const root of entities.filter(entity => selected.has(entity.id))) {
    included.add(root.id)
    for (const child of descendantsOf(root, entities)) included.add(child.id)
  }
  return entities.filter(entity => included.has(entity.id))
}
