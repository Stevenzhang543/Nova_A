import { reactive } from 'vue'
import type { Entity } from '../world/Entity'
import type { WorldChunk2D } from '../world/components'
import { worldTransform } from '../world/hierarchy'
import type { Vec2 } from '../world/types'

export type StreamCellStatus = 'Unloaded' | 'Loading' | 'Loaded' | 'Activating' | 'Active' | 'Deactivating' | 'Unloading' | 'Failed'

export interface StreamCellSnapshot {
  entityUuid: string
  owner: string
  sceneUuid: string
  bounds: { min: Vec2; max: Vec2 }
  status: StreamCellStatus
  memoryMb: number
  dependencies: string[]
  cachePolicy: WorldChunk2D['cachePolicy']
  lastUsedAt: number
}

export interface StreamEvent {
  id: number
  at: string
  cell: string
  action: 'prefetch' | 'load' | 'activate' | 'deactivate' | 'unload' | 'cancel' | 'budget' | 'error' | 'save-handoff'
  milliseconds: number
  memoryMb: number
  message: string
}

export const worldStreamingState = reactive({
  cells: [] as StreamCellSnapshot[],
  events: [] as StreamEvent[],
  pending: 0,
  loaded: 0,
  active: 0,
  memoryMb: 0,
  peakMemoryMb: 0,
  loads: 0,
  unloads: 0,
  failures: 0,
  cancelled: 0,
  lastUpdateMilliseconds: 0
})

const controllers = new Map<string, AbortController>()
const desiredTargets = new Map<string, 'Active' | 'Loaded' | 'Unloaded'>()
const snapshots = new Map<string, StreamCellSnapshot>()
const saveHandoffs = new Map<string, unknown>()
let eventId = 1

function event(cell: string, action: StreamEvent['action'], started: number, memoryMb: number, message: string): void {
  worldStreamingState.events.unshift({ id: eventId++, at: new Date().toISOString(), cell, action, milliseconds: performance.now() - started, memoryMb, message })
  worldStreamingState.events.splice(500)
}

function abortError(): DOMException { return new DOMException('World stream operation was cancelled.', 'AbortError') }
async function checkpoint(signal: AbortSignal): Promise<void> { if (signal.aborted) throw abortError(); await Promise.resolve(); if (signal.aborted) throw abortError() }

function bounds(entity: Entity, chunk: WorldChunk2D, entities: Entity[]): StreamCellSnapshot['bounds'] {
  const transform = worldTransform(entity, entities), halfX = Math.abs(chunk.size.x * transform.scale.x) * .5, halfY = Math.abs(chunk.size.y * transform.scale.y) * .5
  return { min: { x: transform.position.x - halfX, y: transform.position.y - halfY }, max: { x: transform.position.x + halfX, y: transform.position.y + halfY } }
}

function distanceToBounds(point: Vec2, value: StreamCellSnapshot['bounds']): number {
  const dx = Math.max(value.min.x - point.x, 0, point.x - value.max.x), dy = Math.max(value.min.y - point.y, 0, point.y - value.max.y)
  return Math.hypot(dx, dy)
}

function refreshSnapshot(entity: Entity, chunk: WorldChunk2D, entities: Entity[]): StreamCellSnapshot {
  const existing = snapshots.get(entity.uuid)
  if (existing) {
    existing.owner = chunk.ownership || 'scene'; existing.sceneUuid = chunk.sceneUuid; existing.bounds = bounds(entity, chunk, entities); existing.memoryMb = Math.max(0, chunk.memoryEstimateMb); existing.dependencies = [...new Set(chunk.dependencies.filter(Boolean))].slice(0, 128); existing.cachePolicy = chunk.cachePolicy
    return existing
  }
  const snapshot: StreamCellSnapshot = {
    entityUuid: entity.uuid,
    owner: chunk.ownership || 'scene',
    sceneUuid: chunk.sceneUuid,
    bounds: bounds(entity, chunk, entities),
    status: chunk.initiallyLoaded ? 'Active' : 'Unloaded',
    memoryMb: Math.max(0, chunk.memoryEstimateMb),
    dependencies: [...new Set(chunk.dependencies.filter(Boolean))].slice(0, 128),
    cachePolicy: chunk.cachePolicy,
    lastUsedAt: performance.now()
  }
  snapshots.set(entity.uuid, snapshot)
  return snapshot
}

async function transition(
  snapshot: StreamCellSnapshot,
  target: 'Active' | 'Loaded' | 'Unloaded',
  setSceneLoaded: (sceneUuid: string, loaded: boolean) => void,
  setMembersEnabled: (cellUuid: string, enabled: boolean) => void
): Promise<void> {
  const current = controllers.get(snapshot.entityUuid)
  current?.abort()
  const controller = new AbortController(); controllers.set(snapshot.entityUuid, controller)
  worldStreamingState.pending = controllers.size
  const started = performance.now()
  const stableStatus: 'Active' | 'Loaded' | 'Unloaded' = snapshot.status === 'Active' ? 'Active' : snapshot.status === 'Loaded' ? 'Loaded' : 'Unloaded'
  try {
    if (target === 'Active') {
      if (snapshot.status === 'Unloaded' || snapshot.status === 'Failed') {
        snapshot.status = 'Loading'; event(snapshot.entityUuid, 'load', started, snapshot.memoryMb, 'Loading owned cell data and dependencies.')
        await checkpoint(controller.signal)
        if (snapshot.sceneUuid) setSceneLoaded(snapshot.sceneUuid, true)
        snapshot.status = 'Loaded'; worldStreamingState.loads++
      }
      if (snapshot.status !== 'Active') {
        snapshot.status = 'Activating'; await checkpoint(controller.signal); setMembersEnabled(snapshot.entityUuid, true); snapshot.status = 'Active'; snapshot.lastUsedAt = performance.now()
        event(snapshot.entityUuid, 'activate', started, snapshot.memoryMb, 'Cell activated after asynchronous load.')
      }
    } else if (target === 'Loaded') {
      if (snapshot.status === 'Unloaded' || snapshot.status === 'Failed') {
        snapshot.status = 'Loading'; event(snapshot.entityUuid, 'prefetch', started, snapshot.memoryMb, 'Dependency prefetch started.'); await checkpoint(controller.signal)
        if (snapshot.sceneUuid) setSceneLoaded(snapshot.sceneUuid, true)
        snapshot.status = 'Loaded'; worldStreamingState.loads++
      } else if (snapshot.status === 'Active') {
        snapshot.status = 'Deactivating'; await checkpoint(controller.signal); setMembersEnabled(snapshot.entityUuid, false); snapshot.status = 'Loaded'
        event(snapshot.entityUuid, 'deactivate', started, snapshot.memoryMb, 'Cell deactivated but retained by cache policy.')
      }
    } else if (snapshot.status !== 'Unloaded') {
      if (snapshot.status === 'Active') { snapshot.status = 'Deactivating'; await checkpoint(controller.signal); setMembersEnabled(snapshot.entityUuid, false) }
      snapshot.status = 'Unloading'; await checkpoint(controller.signal)
      if (snapshot.sceneUuid) setSceneLoaded(snapshot.sceneUuid, false)
      snapshot.status = 'Unloaded'; worldStreamingState.unloads++
      event(snapshot.entityUuid, 'unload', started, 0, 'Cell assets released according to cache policy.')
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') { snapshot.status = stableStatus; worldStreamingState.cancelled++; event(snapshot.entityUuid, 'cancel', started, snapshot.memoryMb, error.message) }
    else { snapshot.status = 'Failed'; worldStreamingState.failures++; event(snapshot.entityUuid, 'error', started, snapshot.memoryMb, error instanceof Error ? error.message : String(error)) }
  } finally {
    if (controllers.get(snapshot.entityUuid) === controller) {
      controllers.delete(snapshot.entityUuid)
      const desired = desiredTargets.get(snapshot.entityUuid)
      if (desired && desired !== snapshot.status) queueMicrotask(() => { if (!controllers.has(snapshot.entityUuid) && desiredTargets.get(snapshot.entityUuid) === desired) void transition(snapshot, desired, setSceneLoaded, setMembersEnabled) })
    }
    worldStreamingState.pending = controllers.size
  }
}

export function updateWorldStreaming(
  entities: Entity[],
  focus: Vec2,
  memoryBudgetMb: number,
  enabled: boolean,
  setSceneLoaded: (sceneUuid: string, loaded: boolean) => void
): void {
  const started = performance.now()
  const candidates = entities.flatMap(entity => { const chunk = entity.getComponent<WorldChunk2D>('WorldChunk2D'); return entity.enabled && chunk?.enabled ? [{ entity, chunk, snapshot: refreshSnapshot(entity, chunk, entities) }] : [] })
    .sort((first, second) => second.chunk.preloadPriority - first.chunk.preloadPriority || distanceToBounds(focus, first.snapshot.bounds) - distanceToBounds(focus, second.snapshot.bounds))
  const live = new Set(candidates.map(candidate => candidate.entity.uuid))
  for (const [uuid, controller] of controllers) if (!live.has(uuid)) { controller.abort(); controllers.delete(uuid) }
  for (const uuid of [...snapshots.keys()]) if (!live.has(uuid)) { snapshots.delete(uuid); desiredTargets.delete(uuid) }
  const budget = Math.max(0, memoryBudgetMb), desired = new Map<string, 'Active' | 'Loaded' | 'Unloaded'>(candidates.map(candidate => [candidate.entity.uuid, 'Unloaded']))
  const byUuid = new Map(candidates.map(candidate => [candidate.entity.uuid, candidate])), reserved = new Set<string>()
  let reservedMb = 0
  const dependencyClosure = (uuid: string, visiting = new Set<string>()): string[] => {
    if (visiting.has(uuid) || !byUuid.has(uuid)) return []
    visiting.add(uuid)
    const result = [uuid]
    for (const dependency of byUuid.get(uuid)!.snapshot.dependencies) result.push(...dependencyClosure(dependency, visiting))
    visiting.delete(uuid)
    return [...new Set(result)]
  }
  const reserve = (candidate: typeof candidates[number], target: 'Active' | 'Loaded'): boolean => {
    const group = dependencyClosure(candidate.entity.uuid), additional = group.filter(uuid => !reserved.has(uuid)).reduce((sum, uuid) => sum + (byUuid.get(uuid)?.snapshot.memoryMb ?? 0), 0)
    if (reservedMb + additional > budget) return false
    for (const uuid of group) {
      if (!reserved.has(uuid)) { reserved.add(uuid); reservedMb += byUuid.get(uuid)?.snapshot.memoryMb ?? 0 }
      if (uuid !== candidate.entity.uuid && desired.get(uuid) !== 'Active') desired.set(uuid, 'Loaded')
    }
    if (target === 'Active' || desired.get(candidate.entity.uuid) !== 'Active') desired.set(candidate.entity.uuid, target)
    return true
  }
  for (const candidate of candidates) {
    const distance = distanceToBounds(focus, candidate.snapshot.bounds)
    const wantsActive = !enabled || distance <= candidate.chunk.loadDistance || candidate.snapshot.status === 'Active' && distance <= candidate.chunk.unloadDistance
    const wantsPrefetch = wantsActive || distance <= Math.max(candidate.chunk.prefetchDistance, candidate.chunk.loadDistance)
    const requested = wantsActive ? 'Active' : wantsPrefetch ? 'Loaded' : null
    if (requested && !reserve(candidate, requested)) event(candidate.entity.uuid, 'budget', started, reservedMb, `Memory budget ${memoryBudgetMb} MB rejected this cell and its dependency closure.`)
  }
  // Retained cells are considered only after requested/prefetched groups and
  // can never force the runtime above the configured budget.
  for (const candidate of candidates.filter(item => item.chunk.cachePolicy === 'Retain' && item.snapshot.status !== 'Unloaded' && desired.get(item.entity.uuid) === 'Unloaded').sort((a, b) => b.snapshot.lastUsedAt - a.snapshot.lastUsedAt)) reserve(candidate, 'Loaded')
  const memberSetter = (cellUuid: string, active: boolean) => { for (const entity of entities) if (entity.parentUuid === cellUuid) entity.enabled = active }
  for (const candidate of candidates) {
    const target = desired.get(candidate.entity.uuid) ?? 'Unloaded'
    const previousTarget = desiredTargets.get(candidate.entity.uuid)
    desiredTargets.set(candidate.entity.uuid, target)
    const settled = target === candidate.snapshot.status || target === 'Loaded' && candidate.snapshot.status === 'Loaded'
    if (controllers.has(candidate.entity.uuid) && previousTarget && previousTarget !== target) controllers.get(candidate.entity.uuid)?.abort()
    else if (!settled && !controllers.has(candidate.entity.uuid)) void transition(candidate.snapshot, target, setSceneLoaded, memberSetter)
  }
  worldStreamingState.cells.splice(0, worldStreamingState.cells.length, ...candidates.map(candidate => ({ ...candidate.snapshot, bounds: { min: { ...candidate.snapshot.bounds.min }, max: { ...candidate.snapshot.bounds.max } }, dependencies: [...candidate.snapshot.dependencies] })))
  worldStreamingState.loaded = candidates.filter(candidate => candidate.snapshot.status !== 'Unloaded' && candidate.snapshot.status !== 'Failed').length
  worldStreamingState.active = candidates.filter(candidate => candidate.snapshot.status === 'Active').length
  worldStreamingState.memoryMb = candidates.filter(candidate => !['Unloaded', 'Failed'].includes(candidate.snapshot.status)).reduce((sum, candidate) => sum + candidate.snapshot.memoryMb, 0)
  worldStreamingState.peakMemoryMb = Math.max(worldStreamingState.peakMemoryMb, worldStreamingState.memoryMb)
  worldStreamingState.lastUpdateMilliseconds = performance.now() - started
}

export function handoffStreamedSaveState(cellUuid: string, value: unknown): void {
  saveHandoffs.set(cellUuid, structuredClone(value)); event(cellUuid, 'save-handoff', performance.now(), snapshots.get(cellUuid)?.memoryMb ?? 0, 'Cell save state captured for unload/reload handoff.')
}
export function consumeStreamedSaveState(cellUuid: string): unknown {
  const value = saveHandoffs.get(cellUuid); saveHandoffs.delete(cellUuid); return value === undefined ? undefined : structuredClone(value)
}
export function cancelWorldStreaming(cellUuid?: string): void { if (cellUuid) controllers.get(cellUuid)?.abort(); else for (const controller of controllers.values()) controller.abort() }
export function resetWorldStreaming(): void {
  cancelWorldStreaming(); controllers.clear(); desiredTargets.clear(); snapshots.clear(); saveHandoffs.clear();
  Object.assign(worldStreamingState, { cells: [], events: [], pending: 0, loaded: 0, active: 0, memoryMb: 0, peakMemoryMb: 0, loads: 0, unloads: 0, failures: 0, cancelled: 0, lastUpdateMilliseconds: 0 })
}
