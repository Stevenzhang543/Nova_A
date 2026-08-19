import { physicsState } from '../store/physics'
import type { PhysicsQueryHit2D } from '../world/World'
import type { Entity } from '../world/Entity'
import type { CharacterBody2D } from '../world/components'
import type { Vec2 } from '../world/types'
import { queueCharacterMotion } from './worldGameplay'

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
