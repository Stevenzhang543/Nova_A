/** Shared structural removal for one explicitly supplied World. Lifecycle and Undo remain with their callers. */
import type { World } from './World'
import { subtreeEntities } from './hierarchy'
import { normalizeConnection } from './Connection'

/** Remove this entity endpoint using the original per-ID connection normalization order. */
export function detachEntityFromConnectionsInWorld(world: Pick<World, 'entities' | 'connections'>, entityId: number): void {
  for (let index = world.connections.length - 1; index >= 0; index--) {
    const connection = world.connections[index]
    connection.anchors = connection.anchors.filter(/* 比较 anchor.entityId 与 entityId，返回严格不等的判断结果。 */ anchor => anchor.entityId !== entityId)
    if (!normalizeConnection(connection, world.entities.filter(/* 比较 entity.id 与 entityId，返回严格不等的判断结果。 */ entity => entity.id !== entityId))) {
      world.connections.splice(index, 1)
    }
  }
}

/** Remove the exact scene-ordered subtree in place; return its IDs for the authoring selection facade. */
export function deleteEntitySubtreeInWorld(world: Pick<World, 'entities' | 'connections'>, id: number): Set<number> {
  const ids = new Set(subtreeEntities([id], world.entities).map(/* 返回 entity.id 的当前值。 */ entity => entity.id))
  if (!ids.size) return ids
  for (const entityId of ids) detachEntityFromConnectionsInWorld(world, entityId)
  for (let index = world.entities.length - 1; index >= 0; index--) {
    if (ids.has(world.entities[index].id)) world.entities.splice(index, 1)
  }
  return ids
}
