import { toRaw } from 'vue'
import { worldTransform } from '../world/hierarchy'
import type { Entity } from '../world/Entity'
import type { SceneManager } from '../world/SceneManager'
import type { World } from '../world/World'
import { normalizeConnection, type Connection } from '../world/Connection'
import type { NavigationAgent2D } from '../world/components'
import type { Vec2 } from '../world/types'
import { activateStreamEntities, deactivateStreamEntities } from './streamLifecycle'

export interface StreamSceneHost {
  world: Pick<World, 'entities' | 'connections' | 'allocateId' | 'allocateConnectionId'>; scenes: Pick<SceneManager, 'scenes' | 'activeSceneUuid'>; origin(): Vec2
  createEntity(data: Record<string, unknown>, id: number): Entity
  serializeEntity(entity: Entity): Record<string, unknown>
  readHandoff(key: string): unknown; writeHandoff(key: string, value: unknown): void
}
interface SceneLease { sceneUuid: string; active: boolean }
interface SceneInstance { source: string; entities: Entity[]; connections: Connection[]; owners: Map<string, boolean>; originalLoaded: boolean }
interface SceneHandoff { format: 'nova-stream-scene'; source: string; origin: Vec2; entities: Record<string, unknown>[]; connections: Connection[] }
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/** Runtime scene leases install real entities/connections; authored scene documents stay immutable. */
export class RuntimeSceneStreaming {
  private instances = new Map<string, SceneInstance>()
  private promoted = new Map<string, Entity>()
  private leases = new Map<string, SceneLease>()
  constructor(private host: StreamSceneHost) {}

  private prepare(uuid: string): SceneInstance {
    const scene = this.host.scenes.scenes.find(scene => scene.uuid === uuid)
    if (!scene) throw new Error('STREAM_SCENE_MISSING: ' + uuid)
    const source = JSON.stringify(scene.data), cached = this.instances.get(uuid)
    if (cached) { if (cached.source !== source) throw new Error('STREAM_SCENE_STALE: release this scene before loading edited source data.'); return cached }
    if (this.instances.size >= 1024) throw new Error('STREAM_SCENE_LIMIT: at most 1024 cached scenes are supported.')
    const saved = this.host.readHandoff('scene:' + uuid) as SceneHandoff | undefined
    const handoff = saved?.format === 'nova-stream-scene' && saved.source === source ? saved : undefined
    const data = handoff ?? clone(scene.data)
    if (!Array.isArray(data.entities) || data.entities.length > 100_000 || data.connections !== undefined && (!Array.isArray(data.connections) || data.connections.length > 100_000)) throw new Error('STREAM_SCENE_FORMAT: scene requires bounded entity and connection arrays.')
    const total = [...this.instances.values()].reduce((count, instance) => count + instance.entities.length, 0)
    if (total + data.entities.length > 100_000) throw new Error('STREAM_SCENE_LIMIT: cached scenes exceed 100000 entities.')
    const entities: Entity[] = [], ids = new Map<number, number>(), uuids = new Map<string, Entity>()
    const existing = new Map(this.host.world.entities.map(entity => [entity.uuid, entity]))
    for (const raw of data.entities) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) || typeof raw.uuid !== 'string') throw new Error('STREAM_SCENE_FORMAT: each entity needs a stable UUID.')
      if (uuids.has(raw.uuid) || existing.has(raw.uuid) && this.promoted.get(raw.uuid) !== toRaw(existing.get(raw.uuid)!)) throw new Error('STREAM_SCENE_IDENTITY: duplicate live entity UUID ' + raw.uuid)
      const entity = existing.get(raw.uuid) ?? this.host.createEntity(raw, this.host.world.allocateId())
      if (typeof raw.id === 'number') { if (ids.has(raw.id)) throw new Error('STREAM_SCENE_IDENTITY: duplicate stored entity ID.'); ids.set(raw.id, entity.id) }
      entities.push(entity); uuids.set(entity.uuid, entity)
    }
    for (const entity of entities) {
      if (entity.parentUuid && !uuids.has(entity.parentUuid) && !this.promoted.has(entity.uuid)) throw new Error('STREAM_SCENE_PARENT: parent must belong to the same streamed scene.')
      const seen = new Set<string>(); let parent: Entity | undefined = entity
      while (parent) { if (seen.has(parent.uuid)) throw new Error('STREAM_SCENE_PARENT: cyclic hierarchy.'); seen.add(parent.uuid); parent = parent.parentUuid ? uuids.get(parent.parentUuid) : undefined }
    }
    const connections: Connection[] = [], connectionUuids = new Set<string>()
    for (const raw of data.connections ?? []) {
      if (!raw || typeof raw !== 'object' || !Array.isArray((raw as Connection).anchors)) throw new Error('STREAM_SCENE_CONNECTION: invalid connection record.')
      const connection = clone(raw) as Connection
      if (typeof connection.uuid !== 'string' || connectionUuids.has(connection.uuid) || this.host.world.connections.some(value => value.uuid === connection.uuid && !value.anchors.every(anchor => this.host.world.entities.some(entity => entity.id === anchor.entityId && this.promoted.has(entity.uuid))))) throw new Error('STREAM_SCENE_IDENTITY: duplicate or missing connection UUID.')
      const retained = this.host.world.connections.find(value => value.uuid === connection.uuid)
      if (retained) { connections.push(retained); connectionUuids.add(connection.uuid); continue }
      connection.id = this.host.world.allocateConnectionId()
      for (const anchor of connection.anchors) { const stored = anchor as typeof anchor & { entityUuid?: string }; const id = stored.entityUuid ? uuids.get(stored.entityUuid)?.id : ids.get(anchor.entityId); if (id === undefined) throw new Error('STREAM_SCENE_CONNECTION: missing anchor entity.'); anchor.entityId = id }
      if (!normalizeConnection(connection, entities)) throw new Error('STREAM_SCENE_CONNECTION: invalid normalized connection.')
      connections.push(connection); connectionUuids.add(connection.uuid)
    }
    const origin = this.host.origin(), previous = handoff?.origin ?? { x: 0, y: 0 }
    const instance: SceneInstance = { source, entities, connections, owners: new Map(), originalLoaded: scene.loaded }
    this.translateInstance(instance, { x: origin.x - previous.x, y: origin.y - previous.y }, false)
    return instance
  }

  setOwner(owner: string, sceneUuid: string, loaded: boolean, active: boolean): void {
    if (!owner) throw new Error('STREAM_OWNER: a stable owner is required.')
    if (sceneUuid === this.host.scenes.activeSceneUuid) { this.releaseOwner(owner); return }
    const previous = this.leases.get(owner), instance = loaded ? this.prepare(sceneUuid) : undefined
    if (instance && active) {
      const live = new Map(this.host.world.entities.map(entity => [entity.uuid, entity]))
      for (const entity of instance.entities) if (live.has(entity.uuid) && toRaw(live.get(entity.uuid)!) !== toRaw(entity)) throw new Error('STREAM_SCENE_IDENTITY: another scene owns live UUID ' + entity.uuid)
    }
    // Decode and validate before releasing the owner's previous scene.
    if (previous && (previous.sceneUuid !== sceneUuid || !loaded)) this.releaseOwner(owner)
    if (!instance) return
    this.instances.set(sceneUuid, instance); instance.owners.set(owner, active); this.leases.set(owner, { sceneUuid, active })
    this.reconcile(sceneUuid, instance)
  }
  releaseOwner(owner: string): void {
    const lease = this.leases.get(owner)
    if (!lease) return
    const instance = this.instances.get(lease.sceneUuid)
    if (!instance) { this.leases.delete(owner); return }
    if (instance.owners.size === 1) {
      const origin = this.host.origin(), records = instance.entities.map(entity => this.host.serializeEntity(entity))
      this.host.writeHandoff('scene:' + lease.sceneUuid, { format: 'nova-stream-scene', source: instance.source, origin: { ...origin }, entities: records, connections: instance.connections.map(connection => ({ ...clone(connection), anchors: connection.anchors.map(anchor => ({ ...clone(anchor), entityUuid: instance.entities.find(entity => entity.id === anchor.entityId)?.uuid })) })) } satisfies SceneHandoff)
    }
    this.leases.delete(owner); instance.owners.delete(owner); this.reconcile(lease.sceneUuid, instance)
    if (!instance.owners.size) {
      this.instances.delete(lease.sceneUuid)
      const scene = this.host.scenes.scenes.find(scene => scene.uuid === lease.sceneUuid); if (scene) scene.loaded = instance.originalLoaded
    }
  }
  private reconcile(uuid: string, instance: SceneInstance): void {
    const active = [...instance.owners.values()].some(Boolean), world = this.host.world, entities = new Set(instance.entities), ids = new Set(instance.entities.map(entity => entity.id))
    if (active) {
      const added = instance.entities.filter(entity => !world.entities.includes(entity))
      for (const entity of added) world.entities.push(entity)
      for (const connection of instance.connections) if (!world.connections.includes(connection)) world.connections.push(connection)
      activateStreamEntities(added)
    } else {
      const retained = new Set(instance.entities.filter(entity => entity.persistentAcrossScenes || this.promoted.has(entity.uuid)).map(entity => entity.uuid))
      const children = new Map<string, Entity[]>()
      for (const entity of instance.entities) if (entity.parentUuid) { const values = children.get(entity.parentUuid) ?? []; values.push(entity); children.set(entity.parentUuid, values) }
      const pending = [...retained]; while (pending.length) for (const child of children.get(pending.pop()!) ?? []) if (!retained.has(child.uuid)) { retained.add(child.uuid); pending.push(child.uuid) }
      for (const entity of instance.entities) if (retained.has(entity.uuid) && world.entities.includes(entity)) {
        if (entity.parentUuid && !retained.has(entity.parentUuid)) { const transform = worldTransform(entity, world.entities); entity.parentUuid = null; Object.assign(entity.transform, transform) }
        this.promoted.set(entity.uuid, toRaw(entity)); entities.delete(entity); ids.delete(entity.id)
      }
      deactivateStreamEntities(instance.entities.filter(entity => !retained.has(entity.uuid)).filter(entity => world.entities.includes(entity)), [...world.entities])
      // Removing membership leaves authored enable flags and cached runtime state intact.
      for (let index = world.connections.length - 1; index >= 0; index--) if (world.connections[index].anchors.some(anchor => ids.has(anchor.entityId))) world.connections.splice(index, 1)
      for (let index = world.entities.length - 1; index >= 0; index--) if (entities.has(toRaw(world.entities[index])) || ids.has(world.entities[index].id)) world.entities.splice(index, 1)
    }
    const scene = this.host.scenes.scenes.find(scene => scene.uuid === uuid); if (scene) scene.loaded = instance.owners.size > 0 || instance.originalLoaded
    // The retained World synchronizes only changed membership on its next fixed tick/query.
  }
  private translateInstance(instance: SceneInstance, offset: Vec2, skipLive: boolean): void {
    const live = new Set((skipLive ? this.host.world.entities : []).map(entity => entity.uuid)), liveConnections = new Set(this.host.world.connections.map(connection => connection.uuid))
    for (const entity of instance.entities) {
      if (live.has(entity.uuid) || this.promoted.get(entity.uuid) === toRaw(entity)) continue
      if (!entity.parentUuid) { entity.transform.position.x -= offset.x; entity.transform.position.y -= offset.y }
      const agent = entity.getComponent<NavigationAgent2D>('NavigationAgent2D', true)
      if (agent) { agent.targetPosition.x -= offset.x; agent.targetPosition.y -= offset.y; for (const point of agent.path) { point.x -= offset.x; point.y -= offset.y } }
    }
    for (const connection of instance.connections) if (!liveConnections.has(connection.uuid)) for (const node of connection.ropeNodes) { node.position.x -= offset.x; node.position.y -= offset.y }
  }
  shiftOrigin(offset: Vec2): void { for (const instance of this.instances.values()) this.translateInstance(instance, offset, true) }
  detachAfterSceneTransition(): void { for (const [uuid, instance] of this.instances) { const scene = this.host.scenes.scenes.find(value => value.uuid === uuid); if (scene && uuid !== this.host.scenes.activeSceneUuid) scene.loaded = instance.originalLoaded }; this.instances.clear(); this.leases.clear(); this.promoted.clear() }
  reset(): void { for (const owner of [...this.leases.keys()]) this.releaseOwner(owner); this.instances.clear(); this.leases.clear(); this.promoted.clear() }
  inspect(): Array<{ sceneUuid: string; owners: number; activeOwners: number; entities: number; connections: number }> { return [...this.instances].map(([sceneUuid, instance]) => ({ sceneUuid, owners: instance.owners.size, activeOwners: [...instance.owners.values()].filter(Boolean).length, entities: instance.entities.length, connections: instance.connections.length })) }
}
