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

function options(value: Partial<PhysicsQueryOptions2D> = {}): PhysicsQueryOptions2D {
  if (Array.isArray(value.excludeEntityUuids) && new Set(value.excludeEntityUuids).size > 1024) throw new Error('PHYSICS_QUERY_LIMIT: at most 1024 excluded entities are supported.')
  return {
    layerMask: Number.isFinite(value.layerMask) ? Number(value.layerMask) >>> 0 : DEFAULT_QUERY_OPTIONS.layerMask,
    includeSensors: value.includeSensors !== false,
    excludeEntityUuids: Array.isArray(value.excludeEntityUuids) ? [...new Set(value.excludeEntityUuids.filter(item => typeof item === 'string'))].slice(0, 1_024) : [],
    maximumResults: Math.min(4_096, Math.max(1, Math.round(Number(value.maximumResults) || DEFAULT_QUERY_OPTIONS.maximumResults))),
    sort: value.sort === 'entity' ? 'entity' : 'distance'
  }
}

function enrich(hit: PhysicsQueryHit2D, entities: ReadonlyMap<string, Entity>): PhysicsQueryResult2D | null {
  const entity = entities.get(hit.entityUuid)
  const collider = entity?.getCollider(), tileMap = entity?.getComponent<import('../world/components').TileMap2D>('TileMap2D')
  if (!entity || (!collider && !tileMap)) return null
  return { ...hit, bodyType: hit.bodyType ?? (tileMap && !collider ? 'Static' : entity.rigidBody.bodyType), colliderType: collider?.shapeModel ?? 'TileMap2D', sensor: hit.sensor ?? collider?.sensor ?? false, physicsLayer: hit.physicsLayer ?? collider?.physicsLayer ?? tileMap!.physicsLayer }
}

function filterHits(hits: PhysicsQueryHit2D[], value: Partial<PhysicsQueryOptions2D> = {}): PhysicsQueryResult2D[] {
  const settings = options(value), excluded = new Set(settings.excludeEntityUuids)
  const entities = new Map(physicsState.world.entities.map(entity => [entity.uuid, entity]))
  const result = hits.flatMap(hit => { const enriched = enrich(hit, entities); return enriched && !excluded.has(enriched.entityUuid) && (settings.includeSensors || !enriched.sensor) ? [enriched] : [] })
  result.sort(settings.sort === 'entity' ? (a, b) => a.entityUuid.localeCompare(b.entityUuid) || a.distance - b.distance : (a, b) => a.distance - b.distance || a.entityUuid.localeCompare(b.entityUuid))
  return result.slice(0, settings.maximumResults)
}

function query(request: PhysicsQueryRequest2D, value: Partial<PhysicsQueryOptions2D>): PhysicsQueryResult2D[] {
  const settings = options(value)
  return filterHits(physicsState.world.queryPhysics({ ...request, layerMask: settings.layerMask, includeSensors: settings.includeSensors, excludeEntityUuids: settings.excludeEntityUuids, maximumResults: 4096 }), settings)
}

/** Public runtime query facade. Masks address physics layers, never rendering layers. */
export const Physics2D = {
  raycast(origin: Vec2, direction: Vec2, distance: number, mask = 0xffff_ffff): PhysicsQueryHit2D | null {
    return physicsState.world.raycast(origin, direction, distance, mask)
  },
  raycastAll(origin: Vec2, direction: Vec2, distance: number, mask = 0xffff_ffff): PhysicsQueryHit2D[] {
    return physicsState.world.raycastAll(origin, direction, distance, mask)
  },
  overlapPoint(point: Vec2, mask = 0xffff_ffff): string[] { return physicsState.world.overlapPoint(point, mask) },
  overlapCircle(center: Vec2, radius: number, mask = 0xffff_ffff): string[] { return physicsState.world.overlapCircle(center, radius, mask) },
  overlapBox(center: Vec2, size: Vec2, angle = 0, mask = 0xffff_ffff): string[] { return physicsState.world.overlapBox(center, size, angle, mask) },
  shapeCast(center: Vec2, size: Vec2, angle: number, direction: Vec2, distance: number, mask = 0xffff_ffff): PhysicsQueryHit2D | null {
    return physicsState.world.shapeCast(center, size, angle, direction, distance, mask)
  },
  contacts(entityUuid: string) { return physicsState.world.contactQuery(entityUuid) },
  rayQuery(origin: Vec2, direction: Vec2, distance: number, queryOptions: Partial<PhysicsQueryOptions2D> = {}): PhysicsQueryResult2D[] {
    return query({ kind: 'Ray', origin, direction, distance }, queryOptions)
  },
  pointQuery(point: Vec2, queryOptions: Partial<PhysicsQueryOptions2D> = {}): PhysicsQueryResult2D[] {
    return query({ kind: 'Point', origin: point }, queryOptions)
  },
  overlapQuery(center: Vec2, shape: { kind: 'circle'; radius: number } | { kind: 'box'; size: Vec2; angle?: number }, queryOptions: Partial<PhysicsQueryOptions2D> = {}): PhysicsQueryResult2D[] {
    return query(shape.kind === 'circle' ? { kind: 'Circle', origin: center, radius: shape.radius } : { kind: 'Box', origin: center, size: shape.size, angle: shape.angle }, queryOptions)
  },
  sweep(center: Vec2, size: Vec2, angle: number, direction: Vec2, distance: number, queryOptions: Partial<PhysicsQueryOptions2D> = {}): PhysicsQueryResult2D | null {
    return query({ kind: 'Sweep', origin: center, size, angle, direction, distance }, queryOptions)[0] ?? null
  },
  nearest(center: Vec2, maximumDistance: number, queryOptions: Partial<PhysicsQueryOptions2D> = {}): PhysicsQueryResult2D | null {
    return query({ kind: 'Nearest', origin: center, distance: maximumDistance }, queryOptions)[0] ?? null
  },
  contactQuery(entityUuid: string) { return physicsState.world.contactQuery(entityUuid).map(event => ({ ...event })) },
  teleport(entity: Entity, position: Vec2, angle?: number) { return physicsState.world.teleport(entity, position, angle) },
  moveAndSlide(entity: Entity, velocity: Vec2, delta: number) {
    const fixedDelta = Math.max(0, Number.isFinite(delta) ? delta : 0)
    const character = entity.getComponent<CharacterBody2D>('CharacterBody2D')
    if (!character) return false
    character.motionVelocity = { x: velocity.x, y: velocity.y }
    return queueCharacterMotion(entity, { x: velocity.x * fixedDelta, y: velocity.y * fixedDelta })
  },
  characterState(entity: Entity) {
    const character = entity.getComponent<CharacterBody2D>('CharacterBody2D')
    return character ? { onFloor: character.onFloor, onWall: character.onWall, onCeiling: character.onCeiling, floorNormal: { ...character.floorNormal }, wallNormal: { ...character.wallNormal }, ceilingNormal: { ...character.ceilingNormal }, platformVelocity: { ...character.platformVelocity } } : null
  }
}
