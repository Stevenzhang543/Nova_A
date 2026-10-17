/** Identity-only Editor composition; no World construction or second lifetime state. */
import { toRaw } from 'vue'
import { EntityLifetimeOwner, type EntityLifetimeWorld } from '../runtime/entityLifetimes'
import { StreamLifecycleOwner } from '../runtime/streamLifecycle'
const owners = new WeakMap<EntityLifetimeWorld, { lifetimes: EntityLifetimeOwner; streams: StreamLifecycleOwner }>()
export function createEditorEntityLifecycle(world: EntityLifetimeWorld) {
  let owner = owners.get(world)
  if (!owner) { const lifetimes = new EntityLifetimeOwner(world, toRaw); owner = { lifetimes, streams: new StreamLifecycleOwner(lifetimes) }; owners.set(world, owner) }
  return owner
}
