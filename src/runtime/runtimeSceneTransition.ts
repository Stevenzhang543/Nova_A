import type { Entity } from '../world/Entity'
import type { Vec2 } from '../world/types'
import type { NavigationAgent2D } from '../world/components'
import type { SceneManager } from '../world/SceneManager'
import { normalizeConnection, type Connection } from '../world/Connection'
import { worldTransform } from '../world/hierarchy'

export interface RuntimeSceneHost<View> {
  scenes: Pick<SceneManager, 'scenes' | 'activeScene' | 'activeSceneUuid' | 'navigationHistory' | 'navigationIndex' | 'setActive'>
  world: { entities: Entity[]; connections: Connection[]; allocateId(): number; allocateConnectionId(): number; invalidateRuntime(): void }
  createEntity(data: Record<string, unknown>, id: number): Entity
  origin?(): Vec2
  captureView(): View
  restoreView(view: View): void
  applyView(scene: Record<string, unknown>, entities: Entity[]): void
}
export interface PreparedRuntimeSceneTransition {
  preservedEntityUuids: readonly string[]
  commit(): boolean
  readonly error: string | null
}

/** Decode into detached entities. Failed preparation may consume monotonic IDs,
 * but never replaces live objects, assets, metadata, settings or scene identity. */
export function prepareRuntimeSceneTransition<View>(host: RuntimeSceneHost<View>, identifier?: string): PreparedRuntimeSceneTransition {
  const target = identifier === undefined ? host.scenes.activeScene : host.scenes.scenes.find(scene => scene.uuid === identifier || scene.name === identifier)
  if (!target) throw Error(`Scene not found: ${identifier}`)
  const targetSource = JSON.stringify(target.data), data = JSON.parse(targetSource) as Record<string, unknown>
  if (!Array.isArray(data.entities) || data.entities.length > 100_000) throw Error('A runtime scene requires an entities array of at most100,000 records.')
  const previousEntities = [...host.world.entities], previousConnections = [...host.world.connections]
  const persistent = new Set(previousEntities.filter(entity => entity.persistentAcrossScenes).map(entity => entity.uuid))
  const descendants = new Map<string, Entity[]>()
  for (const entity of previousEntities) if (entity.parentUuid) { const children = descendants.get(entity.parentUuid) ?? []; children.push(entity); descendants.set(entity.parentUuid, children) }
  const pending = [...persistent]
  while (pending.length) for (const entity of descendants.get(pending.pop()!) ?? []) if (!persistent.has(entity.uuid)) { persistent.add(entity.uuid); pending.push(entity.uuid) }
  const retained = previousEntities.filter(entity => persistent.has(entity.uuid)), retainedIds = new Set(retained.map(entity => entity.id))
  const retainedConnections = previousConnections.filter(connection => connection.anchors.every(anchor => retainedIds.has(anchor.entityId)))
  const byUuid = new Map(retained.map(entity => [entity.uuid, entity])), byStoredId = new Map<number, number>(), entities = [...retained]
  for (const raw of data.entities) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Runtime scene entity records must be objects.')
    const record = raw as Record<string, unknown>, uuid = typeof record.uuid === 'string' ? record.uuid : ''
    let entity = uuid ? byUuid.get(uuid) : undefined
    if (entity && !persistent.has(entity.uuid)) throw Error(`Duplicate runtime scene entity UUID: ${entity.uuid}`)
    if (!entity) { entity = host.createEntity(record, host.world.allocateId()); if (byUuid.has(entity.uuid)) throw Error(`Duplicate runtime scene entity UUID: ${entity.uuid}`); byUuid.set(entity.uuid, entity); entities.push(entity) }
    if (typeof record.id === 'number') { if (byStoredId.has(record.id)) throw Error(`Duplicate runtime scene entity ID: ${record.id}`); byStoredId.set(record.id, entity.id) }
  }
  const connections = [...retainedConnections], connectionUuids = new Set(connections.map(connection => connection.uuid))
  if (data.connections !== undefined && !Array.isArray(data.connections)) throw Error('Runtime scene connections must be an array.')
  for (const raw of (data.connections ?? []) as unknown[]) {
    if (!raw || typeof raw !== 'object' || !Array.isArray((raw as Connection).anchors)) throw Error('Runtime scene connection records require anchors.')
    const connection = JSON.parse(JSON.stringify(raw)) as Connection
    if (connectionUuids.has(connection.uuid)) continue
    connection.id = host.world.allocateConnectionId()
    for (const anchor of connection.anchors) {
      const stored = anchor as typeof anchor & { entityUuid?: string }
      const entityId = stored.entityUuid ? byUuid.get(stored.entityUuid)?.id : byStoredId.get(anchor.entityId)
      if (entityId === undefined) throw Error(`Runtime scene connection has a missing entity: ${stored.entityUuid ?? anchor.entityId}`)
      anchor.entityId = entityId
    }
    if (!normalizeConnection(connection, entities)) throw Error(`Runtime scene connection is invalid: ${connection.uuid ?? connection.id}`)
    connections.push(connection); connectionUuids.add(connection.uuid)
  }
  const origin = host.origin?.() ?? { x: 0, y: 0 }
  if (![origin.x, origin.y].every(Number.isFinite)) throw Error('Runtime scene origin must be finite.')
  for (const entity of entities) if (!persistent.has(entity.uuid)) {
    if (!entity.parentUuid) { entity.transform.position.x -= origin.x; entity.transform.position.y -= origin.y }
    const agent = entity.getComponent<NavigationAgent2D>('NavigationAgent2D', true)
    if (agent) { agent.targetPosition.x -= origin.x; agent.targetPosition.y -= origin.y; for (const point of agent.path) { point.x -= origin.x; point.y -= origin.y } }
  }
  for (const connection of connections) if (!retainedConnections.includes(connection)) for (const node of connection.ropeNodes) { node.position.x -= origin.x; node.position.y -= origin.y }
  let attempted = false, error: string | null = null
  return {
    preservedEntityUuids: [...persistent], get error() { return error },
    commit() {
      if (attempted) { error = 'A runtime scene transaction can only be committed once.'; return false }
      attempted = true
      if (!host.scenes.scenes.includes(target) || JSON.stringify(target.data) !== targetSource || host.world.entities.length !== previousEntities.length || host.world.entities.some((entity, index) => entity !== previousEntities[index]) || host.world.connections.length !== previousConnections.length || host.world.connections.some((connection, index) => connection !== previousConnections[index])) { error = 'The source world or destination scene changed during transition preparation.'; return false }
      const view = host.captureView(), active = host.scenes.activeSceneUuid, history = [...host.scenes.navigationHistory], historyIndex = host.scenes.navigationIndex
      const targetState = { loaded: target.loaded, visitedAt: target.visitedAt }, transforms = retained.filter(entity => entity.parentUuid && !persistent.has(entity.parentUuid)).map(entity => ({ entity, parent: entity.parentUuid, local: { position: { ...entity.transform.position }, rotation: entity.transform.rotation, scale: { ...entity.transform.scale } }, world: worldTransform(entity, previousEntities) }))
      try {
        host.world.invalidateRuntime()
        for (const { entity, world } of transforms) { entity.parentUuid = null; entity.transform.position = { ...world.position }; entity.transform.rotation = world.rotation; entity.transform.scale = { ...world.scale } }
        host.world.entities.splice(0, host.world.entities.length, ...entities)
        host.world.connections.splice(0, host.world.connections.length, ...connections)
        if (!host.scenes.setActive(target.uuid)) throw Error('Prepared scene disappeared before commit.')
        host.applyView(data, entities)
        return true
      } catch (failure) {
        error = failure instanceof Error ? failure.message : String(failure)
        host.world.entities.splice(0, host.world.entities.length, ...previousEntities)
        host.world.connections.splice(0, host.world.connections.length, ...previousConnections)
        for (const { entity, parent, local } of transforms) { entity.parentUuid = parent; entity.transform.position = local.position; entity.transform.rotation = local.rotation; entity.transform.scale = local.scale }
        host.scenes.activeSceneUuid = active; host.scenes.navigationHistory = history; host.scenes.navigationIndex = historyIndex; Object.assign(target, targetState)
        host.restoreView(view)
        try { host.world.invalidateRuntime() } catch { /* The original failure remains the transaction error. */ }
        return false
      }
    }
  }
}
