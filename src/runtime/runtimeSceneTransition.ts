/** 运行场景切换边界：准备持久对象及状态交接，在场景替换后完成恢复。 */
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
/** 预构造目标场景实体和连接，保留持久实体子树、应用世界原点偏移，返回一次性可回滚提交事务。 */ export function prepareRuntimeSceneTransition<View>(host: RuntimeSceneHost<View>, identifier?: string): PreparedRuntimeSceneTransition {
  const target = identifier === undefined ? host.scenes.activeScene : host.scenes.scenes.find(/* 先计算 scene.uuid === identifier；仅当其为假值时求右侧 scene.name === identifier，返回短路求值结果。 */ scene => scene.uuid === identifier || scene.name === identifier)
  if (!target) throw Error(`Scene not found: ${identifier}`)
  const targetSource = JSON.stringify(target.data), data = JSON.parse(targetSource) as Record<string, unknown>
  if (!Array.isArray(data.entities) || data.entities.length > 100_000) throw Error('A runtime scene requires an entities array of at most100,000 records.')
  const previousEntities = [...host.world.entities], previousConnections = [...host.world.connections]
  const persistent = new Set(previousEntities.filter(/* 返回 entity.persistentAcrossScenes 的当前值。 */ entity => entity.persistentAcrossScenes).map(/* 返回 entity.uuid 的当前值。 */ entity => entity.uuid))
  const descendants = new Map<string, Entity[]>()
  for (const entity of previousEntities) if (entity.parentUuid) { const children = descendants.get(entity.parentUuid) ?? []; children.push(entity); descendants.set(entity.parentUuid, children) }
  const pending = [...persistent]
  while (pending.length) for (const entity of descendants.get(pending.pop()!) ?? []) if (!persistent.has(entity.uuid)) { persistent.add(entity.uuid); pending.push(entity.uuid) }
  const retained = previousEntities.filter(/* 调用 persistent.has(entity.uuid) 并返回调用结果。 */ entity => persistent.has(entity.uuid)), retainedIds = new Set(retained.map(/* 返回 entity.id 的当前值。 */ entity => entity.id))
  const retainedConnections = previousConnections.filter(/* 调用 connection.anchors.every(anchor => retainedIds.has(anchor.entityId)) 并返回调用结果。 */ connection => connection.anchors.every(/* 调用 retainedIds.has(anchor.entityId) 并返回调用结果。 */ anchor => retainedIds.has(anchor.entityId)))
  const byUuid = new Map(retained.map(/* 返回按声明顺序构造的数组 [entity.uuid, entity]。 */ entity => [entity.uuid, entity])), byStoredId = new Map<number, number>(), entities = [...retained]
  for (const raw of data.entities) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Runtime scene entity records must be objects.')
    const record = raw as Record<string, unknown>, uuid = typeof record.uuid === 'string' ? record.uuid : ''
    let entity = uuid ? byUuid.get(uuid) : undefined
    if (entity && !persistent.has(entity.uuid)) throw Error(`Duplicate runtime scene entity UUID: ${entity.uuid}`)
    if (!entity) { entity = host.createEntity(record, host.world.allocateId()); if (byUuid.has(entity.uuid)) throw Error(`Duplicate runtime scene entity UUID: ${entity.uuid}`); byUuid.set(entity.uuid, entity); entities.push(entity) }
    if (typeof record.id === 'number') { if (byStoredId.has(record.id)) throw Error(`Duplicate runtime scene entity ID: ${record.id}`); byStoredId.set(record.id, entity.id) }
  }
  const connections = [...retainedConnections], connectionUuids = new Set(connections.map(/* 返回 connection.uuid 的当前值。 */ connection => connection.uuid))
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
    preservedEntityUuids: [...persistent], /* 返回 error 的当前值。 */ get error() { return error },
    /** 提交前确认世界与目标未变，替换实体和视图；异常恢复旧实体、变换、场景导航与视图。 */ commit() {
      if (attempted) { error = 'A runtime scene transaction can only be committed once.'; return false }
      attempted = true
      if (!host.scenes.scenes.includes(target) || JSON.stringify(target.data) !== targetSource || host.world.entities.length !== previousEntities.length || host.world.entities.some(/* 比较 entity 与 previousEntities[index]，返回严格不等的判断结果。 */ (entity, index) => entity !== previousEntities[index]) || host.world.connections.length !== previousConnections.length || host.world.connections.some(/* 比较 connection 与 previousConnections[index]，返回严格不等的判断结果。 */ (connection, index) => connection !== previousConnections[index])) { error = 'The source world or destination scene changed during transition preparation.'; return false }
      const view = host.captureView(), active = host.scenes.activeSceneUuid, history = [...host.scenes.navigationHistory], historyIndex = host.scenes.navigationIndex
      const targetState = { loaded: target.loaded, visitedAt: target.visitedAt }, transforms = retained.filter(/* 先计算 entity.parentUuid；仅当其为真值时求右侧 !persistent.has(entity.parentUuid)，返回短路求值结果。 */ entity => entity.parentUuid && !persistent.has(entity.parentUuid)).map(/** 保存即将脱离非持久父节点的实体局部与世界变换，支持提交保持位置和失败回滚。 */ entity => ({ entity, parent: entity.parentUuid, local: { position: { ...entity.transform.position }, rotation: entity.transform.rotation, scale: { ...entity.transform.scale } }, world: worldTransform(entity, previousEntities) }))
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
