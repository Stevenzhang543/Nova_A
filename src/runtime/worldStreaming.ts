import { reactive } from 'vue'
import { activateStreamEntities, deactivateStreamEntities } from './streamLifecycle'
import type { Entity } from '../world/Entity'
import type { WorldChunk2D } from '../world/components'
import { worldTransform } from '../world/hierarchy'
import type { Vec2 } from '../world/types'
import { performanceRuntimeSettings, performanceRuntimeState } from './largeWorldPerformance'

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
  saveStateKey: string
  error: string
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
  lastUpdateMilliseconds: 0,
  frameBudgetMs: 0,
  processedThisFrame: 0,
  deferredThisFrame: 0
})

const controllers = new Map<string, AbortController>()
const desiredTargets = new Map<string, 'Active' | 'Loaded' | 'Unloaded'>()
const snapshots = new Map<string, StreamCellSnapshot>()
const saveHandoffs = new Map<string, unknown>()
const handoffBytes = new Map<string, number>()
const MAX_HANDOFF_BYTES = 32 * 1024 * 1024, MAX_TOTAL_HANDOFF_BYTES = 128 * 1024 * 1024
function validatedHandoff(value: unknown): { value: unknown; bytes: number } {
  const visiting = new Set<object>(); let nodes = 0
  const visit = (entry: unknown, depth: number): void => {
    if (++nodes > 2_000_000 || depth > 64) throw Error('STREAM_HANDOFF_LIMIT: at most 2000000 values and 64 levels are supported.')
    if (entry === null || typeof entry === 'string' || typeof entry === 'boolean') return
    if (typeof entry === 'number' && Number.isFinite(entry)) return
    if (!entry || typeof entry !== 'object' || visiting.has(entry) || !Array.isArray(entry) && ![Object.prototype, null].includes(Object.getPrototypeOf(entry))) throw Error('STREAM_HANDOFF_FORMAT: finite JSON values without cycles are required.')
    visiting.add(entry); for (const child of Object.values(entry)) visit(child, depth + 1); visiting.delete(entry)
  }
  visit(value, 0); const source = JSON.stringify(value), bytes = new TextEncoder().encode(source).length
  if (bytes > MAX_HANDOFF_BYTES) throw Error('STREAM_HANDOFF_LIMIT: one handoff exceeds 32 MiB.')
  return { value: JSON.parse(source), bytes }
}
const settledTargets = new Map<string, 'Active' | 'Loaded' | 'Unloaded'>()
const suspended = new Map<string, string>()
const loadingReservations = new Set<string>()
const sourceSignatures = new Map<string, string>()
const initializedMembers = new Set<string>()
export type StreamSceneSetter = (sceneUuid: string, loaded: boolean, owner: string, active: boolean) => void
let eventId = 1

interface StreamedEntityState {
  uuid: string
  enabled: boolean
  position: Vec2
  rotation: number
  scale: Vec2
  velocity: Vec2
  angularVelocity: number
}

function event(cell: string, action: StreamEvent['action'], started: number, memoryMb: number, message: string): void {
  worldStreamingState.events.unshift({ id: eventId++, at: new Date().toISOString(), cell, action, milliseconds: performance.now() - started, memoryMb, message })
  worldStreamingState.events.splice(500)
}

function abortError(): DOMException { return new DOMException('World stream operation was cancelled.', 'AbortError') }
async function checkpoint(signal: AbortSignal): Promise<void> { if (signal.aborted) throw abortError(); await Promise.resolve(); if (signal.aborted) throw abortError() }

function bounds(entity: Entity, chunk: WorldChunk2D, entities: Entity[]): StreamCellSnapshot['bounds'] {
  const transform = worldTransform(entity, entities), x = Math.abs(chunk.size.x * transform.scale.x) / 2, y = Math.abs(chunk.size.y * transform.scale.y) / 2
  const halfX = Math.abs(Math.cos(transform.rotation)) * x + Math.abs(Math.sin(transform.rotation)) * y, halfY = Math.abs(Math.sin(transform.rotation)) * x + Math.abs(Math.cos(transform.rotation)) * y
  return { min: { x: transform.position.x - halfX, y: transform.position.y - halfY }, max: { x: transform.position.x + halfX, y: transform.position.y + halfY } }
}
function distanceToBounds(point: Vec2, value: StreamCellSnapshot['bounds']): number { return Math.hypot(Math.max(value.min.x - point.x, 0, point.x - value.max.x), Math.max(value.min.y - point.y, 0, point.y - value.max.y)) }
function refreshSnapshot(entity: Entity, chunk: WorldChunk2D, entities: Entity[]): StreamCellSnapshot {
  const snapshot = snapshots.get(entity.uuid) ?? { entityUuid: entity.uuid, owner: '', sceneUuid: '', bounds: bounds(entity, chunk, entities), status: 'Unloaded', memoryMb: 0, dependencies: [], cachePolicy: chunk.cachePolicy, saveStateKey: '', error: '', lastUsedAt: performance.now() }
  Object.assign(snapshot, { owner: chunk.ownership || 'scene', sceneUuid: chunk.sceneUuid, bounds: bounds(entity, chunk, entities), memoryMb: Number.isFinite(chunk.memoryEstimateMb) ? Math.max(0, chunk.memoryEstimateMb) : 0, dependencies: [...new Set(chunk.dependencies.filter(Boolean))].slice(0, 128), cachePolicy: chunk.cachePolicy, saveStateKey: chunk.saveStateKey || entity.uuid })
  snapshots.set(entity.uuid, snapshot); if (!settledTargets.has(entity.uuid)) settledTargets.set(entity.uuid, 'Unloaded')
  return snapshot
}
function publishStreamingState(): void {
  const cells = [...snapshots.values()]
  worldStreamingState.cells.splice(0, worldStreamingState.cells.length, ...cells.map(snapshot => ({ ...snapshot, bounds: { min: { ...snapshot.bounds.min }, max: { ...snapshot.bounds.max } }, dependencies: [...snapshot.dependencies] })))
  worldStreamingState.pending = controllers.size
  worldStreamingState.loaded = cells.filter(cell => settledTargets.get(cell.entityUuid) !== 'Unloaded').length
  worldStreamingState.active = cells.filter(cell => settledTargets.get(cell.entityUuid) === 'Active').length
  worldStreamingState.memoryMb = cells.filter(cell => settledTargets.get(cell.entityUuid) !== 'Unloaded' || loadingReservations.has(cell.entityUuid)).reduce((sum, cell) => sum + cell.memoryMb, 0)
  worldStreamingState.peakMemoryMb = Math.max(worldStreamingState.peakMemoryMb, worldStreamingState.memoryMb)
}
function membersActive(cellUuid: string, active: boolean, entities: Entity[]): void {
  const members = cellMembers(cellUuid, entities)
  if (active) { restoreStreamCellState(cellUuid, entities); activateStreamEntities(members.filter(entity => entity.enabled)) }
  else { captureStreamCellState(cellUuid, entities); deactivateStreamEntities(members.filter(entity => entity.enabled), entities); for (const entity of members) entity.enabled = false }
}
async function transition(snapshot: StreamCellSnapshot, target: 'Active' | 'Loaded' | 'Unloaded', setScene: StreamSceneSetter, entities: Entity[]): Promise<void> {
  const controller = new AbortController(), uuid = snapshot.entityUuid, started = performance.now(), previous = settledTargets.get(uuid) ?? 'Unloaded'
  controllers.set(uuid, controller); if (previous === 'Unloaded' && target !== 'Unloaded') loadingReservations.add(uuid)
  snapshot.error = ''; snapshot.status = target === 'Unloaded' ? 'Unloading' : target === 'Active' ? previous === 'Unloaded' ? 'Loading' : 'Activating' : previous === 'Active' ? 'Deactivating' : 'Loading'
  publishStreamingState()
  try {
    await checkpoint(controller.signal)
    if (controllers.get(uuid) !== controller || snapshots.get(uuid) !== snapshot) throw abortError()
    // One synchronous commit after cancellation checks; no partially activated intermediate state.
    if (snapshot.sceneUuid) setScene(snapshot.sceneUuid, target !== 'Unloaded', uuid, target === 'Active')
    if (previous === 'Active' && target !== 'Active') membersActive(uuid, false, entities)
    if (target === 'Active' && previous !== 'Active') membersActive(uuid, true, entities)
    snapshot.status = target; settledTargets.set(uuid, target); snapshot.lastUsedAt = performance.now()
    if (previous === 'Unloaded' && target !== 'Unloaded') worldStreamingState.loads++
    if (previous !== 'Unloaded' && target === 'Unloaded') worldStreamingState.unloads++
    event(uuid, target === 'Active' ? 'activate' : target === 'Loaded' ? previous === 'Active' ? 'deactivate' : 'prefetch' : 'unload', started, target === 'Unloaded' ? 0 : snapshot.memoryMb, 'Committed owned scene and member state: ' + target)
  } catch (error) {
    if (controllers.get(uuid) !== controller || snapshots.get(uuid) !== snapshot) return
    if (error instanceof DOMException && error.name === 'AbortError') { snapshot.status = previous; worldStreamingState.cancelled++; event(uuid, 'cancel', started, snapshot.memoryMb, error.message) }
    else { snapshot.status = 'Failed'; snapshot.error = error instanceof Error ? error.message : String(error); suspended.set(uuid, sourceSignatures.get(uuid) ?? ''); worldStreamingState.failures++; event(uuid, 'error', started, snapshot.memoryMb, snapshot.error) }
  } finally {
    if (controllers.get(uuid) === controller) { controllers.delete(uuid); loadingReservations.delete(uuid); publishStreamingState() }
  }
}
export function updateWorldStreaming(entities: Entity[], focus: Vec2, memoryBudgetMb: number, enabled: boolean, setScene: StreamSceneSetter): void {
  const started = performance.now(), byEntity = new Map(entities.map(entity => [entity.uuid, entity]))
  const raw = entities.flatMap(entity => { const chunk = entity.getComponent<WorldChunk2D>('WorldChunk2D'); return entity.enabled && chunk?.enabled ? [{ entity, chunk }] : [] })
  if (raw.length > 10_000) throw new Error('STREAM_LIMIT: at most 10000 authored cells are supported.')
  const live = new Set(raw.map(value => value.entity.uuid))
  for (const [uuid, snapshot] of snapshots) if (!live.has(uuid)) {
    controllers.get(uuid)?.abort(); controllers.delete(uuid); loadingReservations.delete(uuid)
    if (snapshot.sceneUuid) setScene(snapshot.sceneUuid, false, uuid, false)
    if (settledTargets.get(uuid) === 'Active') membersActive(uuid, false, entities)
    snapshots.delete(uuid); desiredTargets.delete(uuid); settledTargets.delete(uuid); sourceSignatures.delete(uuid); suspended.delete(uuid); initializedMembers.delete(uuid)
  }
  const candidates = raw.map(({ entity, chunk }) => {
    const signature = JSON.stringify([chunk.sceneUuid, chunk.dependencies, chunk.saveStateKey, chunk.ownership]), old = snapshots.get(entity.uuid)
    if (sourceSignatures.has(entity.uuid) && sourceSignatures.get(entity.uuid) !== signature) {
      controllers.get(entity.uuid)?.abort(); controllers.delete(entity.uuid); loadingReservations.delete(entity.uuid)
      if (old?.sceneUuid) setScene(old.sceneUuid, false, entity.uuid, false)
      if (settledTargets.get(entity.uuid) === 'Active') membersActive(entity.uuid, false, entities)
      settledTargets.set(entity.uuid, 'Unloaded'); if (old) { old.status = 'Unloaded'; old.error = '' }; suspended.delete(entity.uuid)
    }
    sourceSignatures.set(entity.uuid, signature)
    const initial = !initializedMembers.has(entity.uuid), snapshot = refreshSnapshot(entity, chunk, entities)
    if (initial) { membersActive(entity.uuid, false, entities); initializedMembers.add(entity.uuid) }
    return { entity, chunk, snapshot, initial }
  }).sort((a, b) => b.chunk.preloadPriority - a.chunk.preloadPriority || distanceToBounds(focus, a.snapshot.bounds) - distanceToBounds(focus, b.snapshot.bounds) || a.entity.uuid.localeCompare(b.entity.uuid))
  const budget = Number.isFinite(memoryBudgetMb) ? Math.max(0, memoryBudgetMb) : 0, byUuid = new Map(candidates.map(value => [value.entity.uuid, value])), desired = new Map<string, 'Active' | 'Loaded' | 'Unloaded'>(candidates.map(value => [value.entity.uuid, 'Unloaded']))
  let reservedMb = 0
  const reserved = new Set<string>()
  const closure = (uuid: string): string[] => {
    const output: string[] = [], done = new Set<string>(), visiting = new Set<string>()
    const visit = (id: string, depth: number) => {
      if (depth > 128 || output.length > 10_000) throw new Error('STREAM_DEPENDENCY_LIMIT: dependency closure is too deep or large.')
      if (visiting.has(id)) throw new Error('STREAM_DEPENDENCY_CYCLE: ' + id)
      if (done.has(id)) return
      const candidate = byUuid.get(id); if (!candidate) throw new Error('STREAM_DEPENDENCY_MISSING: ' + id)
      visiting.add(id); for (const dependency of candidate.snapshot.dependencies) visit(dependency, depth + 1); visiting.delete(id); done.add(id); output.push(id)
    }; visit(uuid, 0); return output
  }
  const reserve = (candidate: typeof candidates[number], target: 'Active' | 'Loaded') => {
    let group: string[]
    try { group = closure(candidate.entity.uuid) } catch (error) { if (candidate.snapshot.status !== 'Failed') { candidate.snapshot.status = 'Failed'; candidate.snapshot.error = String(error); suspended.set(candidate.entity.uuid, sourceSignatures.get(candidate.entity.uuid)!); worldStreamingState.failures++; event(candidate.entity.uuid, 'error', started, candidate.snapshot.memoryMb, candidate.snapshot.error) }; return }
    const additional = group.filter(uuid => !reserved.has(uuid)).reduce((sum, uuid) => sum + byUuid.get(uuid)!.snapshot.memoryMb, 0)
    if (reservedMb + additional > budget) { if (desiredTargets.get(candidate.entity.uuid) !== 'Unloaded') event(candidate.entity.uuid, 'budget', started, reservedMb, 'Memory budget rejected this cell and its dependency closure.'); return }
    for (const uuid of group) { if (!reserved.has(uuid)) { reserved.add(uuid); reservedMb += byUuid.get(uuid)!.snapshot.memoryMb }; if (desired.get(uuid) !== 'Active') desired.set(uuid, 'Loaded') }
    if (target === 'Active' || desired.get(candidate.entity.uuid) !== 'Active') desired.set(candidate.entity.uuid, target)
  }
  for (const candidate of candidates) {
    const distance = distanceToBounds(focus, candidate.snapshot.bounds), active = !enabled || candidate.initial && candidate.chunk.initiallyLoaded || distance <= candidate.chunk.loadDistance || settledTargets.get(candidate.entity.uuid) === 'Active' && distance <= candidate.chunk.unloadDistance
    if (active || distance <= Math.max(candidate.chunk.prefetchDistance, candidate.chunk.loadDistance)) reserve(candidate, active ? 'Active' : 'Loaded')
  }
  for (const candidate of candidates.filter(value => value.chunk.cachePolicy === 'Retain' && settledTargets.get(value.entity.uuid) !== 'Unloaded' && desired.get(value.entity.uuid) === 'Unloaded').sort((a, b) => b.snapshot.lastUsedAt - a.snapshot.lastUsedAt)) reserve(candidate, 'Loaded')
  let processed = 0, deferred = 0
  const transitionStarted = performance.now(), limit = Math.max(1, Math.floor(performanceRuntimeSettings.streamingBudgetMs * 8))
  const ordered = [...candidates].sort((a, b) => Number(desired.get(a.entity.uuid) !== 'Unloaded') - Number(desired.get(b.entity.uuid) !== 'Unloaded'))
  for (const candidate of ordered) {
    const uuid = candidate.entity.uuid, target = desired.get(uuid)!, previousTarget = desiredTargets.get(uuid)
    desiredTargets.set(uuid, target)
    if (controllers.has(uuid)) { if (previousTarget !== target) controllers.get(uuid)?.abort(); continue }
    if (suspended.has(uuid)) continue
    const settled = settledTargets.get(uuid) ?? 'Unloaded'
    if (target === settled) { if (candidate.snapshot.status !== 'Failed') candidate.snapshot.status = settled; continue }
    if (target !== 'Unloaded' && candidate.snapshot.dependencies.some(uuid => (settledTargets.get(uuid) ?? 'Unloaded') === 'Unloaded')) { deferred++; continue }
    const occupied = [...snapshots.values()].filter(value => settledTargets.get(value.entityUuid) !== 'Unloaded' || loadingReservations.has(value.entityUuid)).reduce((sum, value) => sum + value.memoryMb, 0)
    if (settled === 'Unloaded' && target !== 'Unloaded' && occupied + candidate.snapshot.memoryMb > budget) { deferred++; continue }
    if (processed >= limit || performance.now() - transitionStarted > performanceRuntimeSettings.streamingBudgetMs) { deferred++; continue }
    processed++; void transition(candidate.snapshot, target, setScene, entities)
  }
  // Disabled authored children remain disabled after activation; missing parents do not create phantom members.
  for (const uuid of initializedMembers) if (!byEntity.has(uuid)) initializedMembers.delete(uuid)
  publishStreamingState(); worldStreamingState.lastUpdateMilliseconds = performance.now() - started; worldStreamingState.frameBudgetMs = performanceRuntimeSettings.streamingBudgetMs
  worldStreamingState.processedThisFrame = processed; worldStreamingState.deferredThisFrame = deferred; performanceRuntimeState.streamingProcessed = processed; performanceRuntimeState.streamingDeferred = deferred
}

export function handoffStreamedSaveState(cellUuid: string, value: unknown): void {
  if (!cellUuid || cellUuid.length > 512 || !saveHandoffs.has(cellUuid) && saveHandoffs.size >= 100_000) throw Error('STREAM_HANDOFF_KEY: a bounded unique key is required.')
  const checked = validatedHandoff(value), total = [...handoffBytes.values()].reduce((sum, bytes) => sum + bytes, 0) - (handoffBytes.get(cellUuid) ?? 0) + checked.bytes
  if (total > MAX_TOTAL_HANDOFF_BYTES) throw Error('STREAM_HANDOFF_LIMIT: retained handoffs exceed 128 MiB.')
  saveHandoffs.set(cellUuid, checked.value); handoffBytes.set(cellUuid, checked.bytes); event(cellUuid, 'save-handoff', performance.now(), snapshots.get(cellUuid)?.memoryMb ?? 0, 'Cell save state captured for unload/reload handoff.')
}
export function consumeStreamedSaveState(cellUuid: string): unknown {
  const value = saveHandoffs.get(cellUuid); saveHandoffs.delete(cellUuid); handoffBytes.delete(cellUuid); return value === undefined ? undefined : structuredClone(value)
}

function cellMembers(cellUuid: string, entities: Entity[]): Entity[] {
  const result: Entity[] = [], queued = [cellUuid], visited = new Set<string>()
  while (queued.length) {
    const parent = queued.shift()!
    if (visited.has(parent)) continue
    visited.add(parent)
    for (const entity of entities) if (entity.parentUuid === parent) { result.push(entity); queued.push(entity.uuid) }
  }
  return result.sort((a, b) => a.uuid.localeCompare(b.uuid))
}

export function captureStreamCellState(cellUuid: string, entities: Entity[]): StreamedEntityState[] {
  const state = cellMembers(cellUuid, entities).map(entity => ({
    uuid: entity.uuid, enabled: entity.enabled, position: { ...entity.transform.position }, rotation: entity.transform.rotation, scale: { ...entity.transform.scale },
    velocity: { ...entity.velocity }, angularVelocity: entity.angularVelocity
  }))
  handoffStreamedSaveState(snapshots.get(cellUuid)?.saveStateKey || cellUuid, state)
  return structuredClone(state)
}

export function restoreStreamCellState(cellUuid: string, entities: Entity[]): boolean {
  const value = consumeStreamedSaveState(snapshots.get(cellUuid)?.saveStateKey || cellUuid)
  if (!Array.isArray(value)) return false
  const byUuid = new Map(entities.map(entity => [entity.uuid, entity]))
  for (const raw of value.slice(0, 100_000)) {
    if (!raw || typeof raw !== 'object') continue
    const state = raw as Partial<StreamedEntityState>, entity = typeof state.uuid === 'string' ? byUuid.get(state.uuid) : undefined
    if (!entity) continue
    entity.enabled = state.enabled !== false
    if (state.position && Number.isFinite(state.position.x) && Number.isFinite(state.position.y)) entity.transform.position = { ...state.position }
    if (Number.isFinite(state.rotation)) entity.transform.rotation = state.rotation!
    if (state.scale && Number.isFinite(state.scale.x) && Number.isFinite(state.scale.y)) entity.transform.scale = { ...state.scale }
    if (state.velocity && Number.isFinite(state.velocity.x) && Number.isFinite(state.velocity.y)) entity.velocity = { ...state.velocity }
    if (Number.isFinite(state.angularVelocity)) entity.angularVelocity = state.angularVelocity!
  }
  return true
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, stableValue(entry)]))
  return value
}

export function exportWorldStreamingHandoffs(): string {
  return JSON.stringify([...saveHandoffs.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([uuid, value]) => [uuid, stableValue(value)]))
}

export function importWorldStreamingHandoffs(source: string): number {
  if (new TextEncoder().encode(source).length > MAX_TOTAL_HANDOFF_BYTES) throw Error('STREAM_HANDOFF_LIMIT: import exceeds 128 MiB.')
  const parsed: unknown = JSON.parse(source)
  if (!Array.isArray(parsed) || parsed.length > 100_000) throw Error('STREAM_HANDOFF_FORMAT: a bounded entry array is required.')
  const pending = new Map<string, { value: unknown; bytes: number }>(); let total = 0
  for (const entry of parsed) {
    if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string' || !entry[0] || entry[0].length > 512 || pending.has(entry[0])) throw Error('STREAM_HANDOFF_FORMAT: duplicate or invalid entry key.')
    const checked = validatedHandoff(entry[1]); total += checked.bytes; if (total > MAX_TOTAL_HANDOFF_BYTES) throw Error('STREAM_HANDOFF_LIMIT: import exceeds 128 MiB.'); pending.set(entry[0], checked)
  }
  saveHandoffs.clear(); handoffBytes.clear(); for (const [key, checked] of pending) { saveHandoffs.set(key, checked.value); handoffBytes.set(key, checked.bytes) }
  return saveHandoffs.size
}
export function peekStreamedSaveState(key: string): unknown { const value = saveHandoffs.get(key); return value === undefined ? undefined : structuredClone(value) }
export function cancelWorldStreaming(cellUuid?: string): void {
  for (const [uuid, controller] of controllers) if (!cellUuid || uuid === cellUuid) { suspended.set(uuid, sourceSignatures.get(uuid) ?? ''); controller.abort() }
}
export function retryWorldStreaming(cellUuid?: string): void { for (const uuid of suspended.keys()) if (!cellUuid || uuid === cellUuid) { suspended.delete(uuid); const snapshot = snapshots.get(uuid); if (snapshot) { snapshot.error = ''; snapshot.status = settledTargets.get(uuid) ?? 'Unloaded' } } }
export function shiftStreamingOrigin(offset: Vec2): void { for (const snapshot of snapshots.values()) { snapshot.bounds.min.x -= offset.x; snapshot.bounds.min.y -= offset.y; snapshot.bounds.max.x -= offset.x; snapshot.bounds.max.y -= offset.y }; publishStreamingState() }
export function resetWorldStreaming(preserveHandoffs = false): void {
  cancelWorldStreaming(); controllers.clear(); desiredTargets.clear(); snapshots.clear(); if (!preserveHandoffs) { saveHandoffs.clear(); handoffBytes.clear() }; settledTargets.clear(); suspended.clear(); loadingReservations.clear(); sourceSignatures.clear(); initializedMembers.clear();
  Object.assign(worldStreamingState, { cells: [], events: [], pending: 0, loaded: 0, active: 0, memoryMb: 0, peakMemoryMb: 0, loads: 0, unloads: 0, failures: 0, cancelled: 0, lastUpdateMilliseconds: 0, frameBudgetMs: 0, processedThisFrame: 0, deferredThisFrame: 0 })
}
