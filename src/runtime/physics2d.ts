import { physicsState } from '../store/physics'
import type { PhysicsQueryHit2D } from '../world/World'
import type { Vec2 } from '../world/types'

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
  }
}
