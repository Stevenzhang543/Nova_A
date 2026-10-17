/** 物理查询与控制接口：向二维求解器及场景暴露运动、碰撞和力相关操作。 */
import { physicsState } from '../store/physics'
import type { PhysicsQueryHit2D, PhysicsQueryRequest2D } from '../world/World'
import type { Entity } from '../world/Entity'
import type { CharacterBody2D } from '../world/components'
import type { Vec2 } from '../world/types'
import { queueCharacterMotion } from './worldGameplay'
import type { PhysicsQueryOptions2D } from './physicsProduction'

export interface PhysicsQueryResult2D extends PhysicsQueryHit2D {
  bodyType: string
  colliderType: string
  sensor: boolean
  physicsLayer: number
}

const DEFAULT_QUERY_OPTIONS: PhysicsQueryOptions2D = { layerMask: 0xffff_ffff, includeSensors: true, excludeEntityUuids: [], maximumResults: 256, sort: 'distance' }

/** 结构说明（自动提取）：options；输入 value；直接调用 Array.isArray、Set、Error、Number.isFinite、Number 等；包含显式抛错路径。 */ function options(value: Partial<PhysicsQueryOptions2D> = {}): PhysicsQueryOptions2D {
  if (Array.isArray(value.excludeEntityUuids) && new Set(value.excludeEntityUuids).size > 1024) throw new Error('PHYSICS_QUERY_LIMIT: at most 1024 excluded entities are supported.')
  return {
    layerMask: Number.isFinite(value.layerMask) ? Number(value.layerMask) >>> 0 : DEFAULT_QUERY_OPTIONS.layerMask,
    includeSensors: value.includeSensors !== false,
    excludeEntityUuids: Array.isArray(value.excludeEntityUuids) ? [...new Set(value.excludeEntityUuids.filter(/* 比较 typeof item 与 'string'，返回严格相等的判断结果。 */ item => typeof item === 'string'))].slice(0, 1_024) : [],
    maximumResults: Math.min(4_096, Math.max(1, Math.round(Number(value.maximumResults) || DEFAULT_QUERY_OPTIONS.maximumResults))),
    sort: value.sort === 'entity' ? 'entity' : 'distance'
  }
}

/** 结构说明（自动提取）：enrich；输入 hit、entities；直接调用 entities.get、entity.getCollider、entity.getComponent。 */ function enrich(hit: PhysicsQueryHit2D, entities: ReadonlyMap<string, Entity>): PhysicsQueryResult2D | null {
  const entity = entities.get(hit.entityUuid)
  const collider = entity?.getCollider(), tileMap = entity?.getComponent<import('../world/components').TileMap2D>('TileMap2D')
  if (!entity || (!collider && !tileMap)) return null
  return { ...hit, bodyType: hit.bodyType ?? (tileMap && !collider ? 'Static' : entity.rigidBody.bodyType), colliderType: collider?.shapeModel ?? 'TileMap2D', sensor: hit.sensor ?? collider?.sensor ?? false, physicsLayer: hit.physicsLayer ?? collider?.physicsLayer ?? tileMap!.physicsLayer }
}

/** 结构说明（自动提取）：filterHits；输入 hits、value；直接调用 options、Set、Map、physicsState.world.entities.map、hits.flatMap 等。 */ function filterHits(hits: PhysicsQueryHit2D[], value: Partial<PhysicsQueryOptions2D> = {}): PhysicsQueryResult2D[] {
  const settings = options(value), excluded = new Set(settings.excludeEntityUuids)
  const entities = new Map(physicsState.world.entities.map(/* 返回按声明顺序构造的数组 [entity.uuid, entity]。 */ entity => [entity.uuid, entity]))
  const result = hits.flatMap(/** 结构说明（自动提取）：hits.flatMap 回调；输入 hit；直接调用 enrich、excluded.has。 */ hit => { const enriched = enrich(hit, entities); return enriched && !excluded.has(enriched.entityUuid) && (settings.includeSensors || !enriched.sensor) ? [enriched] : [] })
  result.sort(settings.sort === 'entity' ? /* 先计算 a.entityUuid.localeCompare(b.entityUuid)；仅当其为假值时求右侧 a.distance - b.distance，返回短路求值结果。 */ (a, b) => a.entityUuid.localeCompare(b.entityUuid) || a.distance - b.distance : /* 先计算 a.distance - b.distance；仅当其为假值时求右侧 a.entityUuid.localeCompare(b.entityUuid)，返回短路求值结果。 */ (a, b) => a.distance - b.distance || a.entityUuid.localeCompare(b.entityUuid))
  return result.slice(0, settings.maximumResults)
}

/** 结构说明（自动提取）：query；输入 request、value；直接调用 options、filterHits、physicsState.world.queryPhysics。 */ function query(request: PhysicsQueryRequest2D, value: Partial<PhysicsQueryOptions2D>): PhysicsQueryResult2D[] {
  const settings = options(value)
  return filterHits(physicsState.world.queryPhysics({ ...request, layerMask: settings.layerMask, includeSensors: settings.includeSensors, excludeEntityUuids: settings.excludeEntityUuids, maximumResults: 4096 }), settings)
}

/** Public runtime query facade. Masks address physics layers, never rendering layers. */
export const Physics2D = {
  /* 调用 physicsState.world.raycast(origin, direction, distance, mask) 并返回调用结果。 */ raycast(origin: Vec2, direction: Vec2, distance: number, mask = 0xffff_ffff): PhysicsQueryHit2D | null {
    return physicsState.world.raycast(origin, direction, distance, mask)
  },
  /* 调用 physicsState.world.raycastAll(origin, direction, distance, mask) 并返回调用结果。 */ raycastAll(origin: Vec2, direction: Vec2, distance: number, mask = 0xffff_ffff): PhysicsQueryHit2D[] {
    return physicsState.world.raycastAll(origin, direction, distance, mask)
  },
  /* 调用 physicsState.world.overlapPoint(point, mask) 并返回调用结果。 */ overlapPoint(point: Vec2, mask = 0xffff_ffff): string[] { return physicsState.world.overlapPoint(point, mask) },
  /* 调用 physicsState.world.overlapCircle(center, radius, mask) 并返回调用结果。 */ overlapCircle(center: Vec2, radius: number, mask = 0xffff_ffff): string[] { return physicsState.world.overlapCircle(center, radius, mask) },
  /* 调用 physicsState.world.overlapBox(center, size, angle, mask) 并返回调用结果。 */ overlapBox(center: Vec2, size: Vec2, angle = 0, mask = 0xffff_ffff): string[] { return physicsState.world.overlapBox(center, size, angle, mask) },
  /* 调用 physicsState.world.shapeCast(center, size, angle, direction, distance, mask) 并返回调用结果。 */ shapeCast(center: Vec2, size: Vec2, angle: number, direction: Vec2, distance: number, mask = 0xffff_ffff): PhysicsQueryHit2D | null {
    return physicsState.world.shapeCast(center, size, angle, direction, distance, mask)
  },
  /* 调用 physicsState.world.contactQuery(entityUuid) 并返回调用结果。 */ contacts(entityUuid: string) { return physicsState.world.contactQuery(entityUuid) },
  /* 调用 query({ kind: 'Ray', origin, direction, distance }, queryOptions) 并返回调用结果。 */ rayQuery(origin: Vec2, direction: Vec2, distance: number, queryOptions: Partial<PhysicsQueryOptions2D> = {}): PhysicsQueryResult2D[] {
    return query({ kind: 'Ray', origin, direction, distance }, queryOptions)
  },
  /* 调用 query({ kind: 'Point', origin: point }, queryOptions) 并返回调用结果。 */ pointQuery(point: Vec2, queryOptions: Partial<PhysicsQueryOptions2D> = {}): PhysicsQueryResult2D[] {
    return query({ kind: 'Point', origin: point }, queryOptions)
  },
  /** 结构说明（自动提取）：overlapQuery；输入 center、shape、queryOptions；直接调用 query。 */ overlapQuery(center: Vec2, shape: { kind: 'circle'; radius: number } | { kind: 'box'; size: Vec2; angle?: number }, queryOptions: Partial<PhysicsQueryOptions2D> = {}): PhysicsQueryResult2D[] {
    return query(shape.kind === 'circle' ? { kind: 'Circle', origin: center, radius: shape.radius } : { kind: 'Box', origin: center, size: shape.size, angle: shape.angle }, queryOptions)
  },
  /* 当 query({ kind: 'Sweep', origin: center, size, angle, direction, distance }, queryOptions)[0] 为 null 或 undefined 时返回 null，否则保留左侧值。 */ sweep(center: Vec2, size: Vec2, angle: number, direction: Vec2, distance: number, queryOptions: Partial<PhysicsQueryOptions2D> = {}): PhysicsQueryResult2D | null {
    return query({ kind: 'Sweep', origin: center, size, angle, direction, distance }, queryOptions)[0] ?? null
  },
  /* 当 query({ kind: 'Nearest', origin: center, distance: maximumDistance }, queryOptions)[0] 为 null 或 undefined 时返回 null，否则保留左侧值。 */ nearest(center: Vec2, maximumDistance: number, queryOptions: Partial<PhysicsQueryOptions2D> = {}): PhysicsQueryResult2D | null {
    return query({ kind: 'Nearest', origin: center, distance: maximumDistance }, queryOptions)[0] ?? null
  },
  /* 调用 physicsState.world.contactQuery(entityUuid).map(event => ({ ...event })) 并返回调用结果。 */ contactQuery(entityUuid: string) { return physicsState.world.contactQuery(entityUuid).map(/** 构造并返回记录 { ...event }，字段按当前实参及捕获状态求值。 */ event => ({ ...event })) },
  /* 调用 physicsState.world.teleport(entity, position, angle) 并返回调用结果。 */ teleport(entity: Entity, position: Vec2, angle?: number) { return physicsState.world.teleport(entity, position, angle) },
  /** 结构说明（自动提取）：moveAndSlide；输入 entity、velocity、delta；直接调用 Math.max、Number.isFinite、entity.getComponent、queueCharacterMotion；写入 character.motionVelocity。 */ moveAndSlide(entity: Entity, velocity: Vec2, delta: number) {
    const fixedDelta = Math.max(0, Number.isFinite(delta) ? delta : 0)
    const character = entity.getComponent<CharacterBody2D>('CharacterBody2D')
    if (!character) return false
    character.motionVelocity = { x: velocity.x, y: velocity.y }
    return queueCharacterMotion(entity, { x: velocity.x * fixedDelta, y: velocity.y * fixedDelta })
  },
  /** 结构说明（自动提取）：characterState；输入 entity；直接调用 entity.getComponent。 */ characterState(entity: Entity) {
    const character = entity.getComponent<CharacterBody2D>('CharacterBody2D')
    return character ? { onFloor: character.onFloor, onWall: character.onWall, onCeiling: character.onCeiling, floorNormal: { ...character.floorNormal }, wallNormal: { ...character.wallNormal }, ceilingNormal: { ...character.ceilingNormal }, platformVelocity: { ...character.platformVelocity } } : null
  }
}
