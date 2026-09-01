import type { Entity } from './Entity'
import { finiteNumber, normalizeAngle, positiveNumber } from './geometry'
import type { Vec2 } from './types'

export interface WorldTransform2D {
  position: Vec2
  rotation: number
  scale: Vec2
}

function rotate(point: Vec2, angle: number): Vec2 {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  return { x: point.x * cosine - point.y * sine, y: point.x * sine + point.y * cosine }
}

interface HierarchyLookup { entities: readonly Entity[]; byUuid: Map<string, Entity>; length: number; first: Entity | undefined; last: Entity | undefined }
let preparedLookup: HierarchyLookup | null = null

/** Build the hierarchy identity table once for a frame or batch operation.
 * Lookups remain exact for transform edits because entity identity and parent
 * UUIDs are authoritative; structural array changes trigger a rebuild. */
export function prepareHierarchyIndex(entities: readonly Entity[]): void {
  if (preparedLookup?.entities === entities && preparedLookup.length === entities.length && preparedLookup.first === entities[0] && preparedLookup.last === entities[entities.length - 1]) return
  preparedLookup = { entities, byUuid: new Map(entities.map(entity => [entity.uuid, entity])), length: entities.length, first: entities[0], last: entities[entities.length - 1] }
}

export function invalidateHierarchyIndex(): void { preparedLookup = null }

function hierarchyLookup(entities: readonly Entity[]): Map<string, Entity> {
  prepareHierarchyIndex(entities)
  return preparedLookup!.byUuid
}

export function worldTransform(entity: Entity, entities: readonly Entity[], visiting = new Set<string>()): WorldTransform2D {
  const local: WorldTransform2D = {
    position: { x: finiteNumber(entity.transform.position.x), y: finiteNumber(entity.transform.position.y) },
    rotation: normalizeAngle(entity.transform.rotation),
    scale: {
      x: positiveNumber(entity.transform.scale.x, 1),
      y: positiveNumber(entity.transform.scale.y, 1)
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
    rotation: normalizeAngle(parentWorld.rotation + local.rotation),
    scale: {
      x: parentWorld.scale.x * local.scale.x,
      y: parentWorld.scale.y * local.scale.y
    }
  }
}

export function localPointToWorld(entity: Entity, point: Vec2, entities: readonly Entity[]): Vec2 {
  const transform = worldTransform(entity, entities)
  const rotated = rotate({ x: point.x * transform.scale.x, y: point.y * transform.scale.y }, transform.rotation)
  return { x: transform.position.x + rotated.x, y: transform.position.y + rotated.y }
}

export function worldPointToLocal(entity: Entity, point: Vec2, entities: readonly Entity[]): Vec2 {
  const transform = worldTransform(entity, entities)
  const rotated = rotate({ x: point.x - transform.position.x, y: point.y - transform.position.y }, -transform.rotation)
  return {
    x: rotated.x / Math.max(transform.scale.x, 1e-12),
    y: rotated.y / Math.max(transform.scale.y, 1e-12)
  }
}

export function setWorldTransform(entity: Entity, value: WorldTransform2D, entities: readonly Entity[]): void {
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
    x: position.x / Math.max(parentWorld.scale.x, 1e-12),
    y: position.y / Math.max(parentWorld.scale.y, 1e-12)
  }
  entity.transform.rotation = normalizeAngle(value.rotation - parentWorld.rotation)
  entity.transform.scale = {
    x: value.scale.x / Math.max(parentWorld.scale.x, 1e-12),
    y: value.scale.y / Math.max(parentWorld.scale.y, 1e-12)
  }
}

export function wouldCreateParentCycle(entity: Entity, parentUuid: string | null, entities: readonly Entity[]): boolean {
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

export function setParent(entity: Entity, parentUuid: string | null, entities: readonly Entity[], preserveWorldTransform = true): boolean {
  if (wouldCreateParentCycle(entity, parentUuid, entities)) return false
  const nextParentUuid = parentUuid && hierarchyLookup(entities).has(parentUuid) ? parentUuid : null
  if (entity.parentUuid === nextParentUuid) return false
  const currentWorld = preserveWorldTransform ? worldTransform(entity, entities) : null
  entity.parentUuid = nextParentUuid
  if (currentWorld) setWorldTransform(entity, currentWorld, entities)
  return true
}

export function descendantsOf(entity: Entity, entities: readonly Entity[]): Entity[] {
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

export function translateEntityTree(entity: Entity, delta: Vec2, entities: readonly Entity[]): void {
  const transform = worldTransform(entity, entities)
  setWorldTransform(entity, {
    ...transform,
    position: { x: transform.position.x + delta.x, y: transform.position.y + delta.y }
  }, entities)
}
