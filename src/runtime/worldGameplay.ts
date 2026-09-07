import { reactive } from 'vue'
import { shiftParticleOrigin } from './particles'
import { physicsState, sceneManager, createEntityFromData, serializeEntity } from '../store/physics'
import { RuntimeSceneStreaming } from './runtimeSceneStreaming'
import type { Entity } from '../world/Entity'
import type { Area2D, AreaEffector2D, CharacterBody2D, Portal2D } from '../world/components'
import { finiteNumber } from '../world/geometry'
import { worldTransform, setWorldTransform } from '../world/hierarchy'
import { OFFICIAL_AI_PACKAGE_ID, OFFICIAL_OBJECT_POOL_PACKAGE_ID, packageEnabled } from './packages'
import { prepareObjectPools, resetObjectPools, setPoolSignalEmitter, updateObjectPools } from './objectPool'
import * as navigationRuntime from './navigation2d'
import { resetWorldStreaming, updateWorldStreaming as updateWorldStreamingRuntime, worldStreamingState, peekStreamedSaveState, handoffStreamedSaveState, shiftStreamingOrigin } from './worldStreaming'
import { resetTileSceneRuntime, tileSceneRuntimeState, updateTileSceneRuntime } from './tileSceneRuntime'
import { captureSimulationEvidence, clearSimulationEvidence } from './simulationAuthoring26'

export const worldGameplayState = reactive({
  navigationDebug: false,
  aiDebug: false,
  simulationDebug: false,
  areaDebug: false,
  chunkDebug: false,
  streamingEnabled: true,
  memoryBudgetMb: 256,
  originShiftThreshold: 10_000,
  originOffset: { x: 0, y: 0 },
  originShiftCount: 0,
  lastOriginShift: { x: 0, y: 0 },
  loadedChunks: 0,
  usedMemoryMb: 0,
  pendingStreams: 0,
  lastError: ''
})

export function serializeWorldGameplaySettings(): Record<string, unknown> {
  return {
    navigationDebug: worldGameplayState.navigationDebug, aiDebug: worldGameplayState.aiDebug, simulationDebug: worldGameplayState.simulationDebug, areaDebug: worldGameplayState.areaDebug, chunkDebug: worldGameplayState.chunkDebug,
    streamingEnabled: worldGameplayState.streamingEnabled,
    memoryBudgetMb: Math.min(65_536, Math.max(1, finiteNumber(worldGameplayState.memoryBudgetMb, 256))),
    originShiftThreshold: Math.min(1e12, Math.max(1, finiteNumber(worldGameplayState.originShiftThreshold, 10_000)))
  }
}

export function loadWorldGameplaySettings(value: unknown): void {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  worldGameplayState.navigationDebug = source.navigationDebug === true
  worldGameplayState.aiDebug = source.aiDebug === true
  worldGameplayState.simulationDebug = source.simulationDebug === true
  worldGameplayState.areaDebug = source.areaDebug === true
  worldGameplayState.chunkDebug = source.chunkDebug === true
  worldGameplayState.streamingEnabled = source.streamingEnabled !== false
  worldGameplayState.memoryBudgetMb = Math.min(65_536, Math.max(1, finiteNumber(source.memoryBudgetMb, 256)))
  worldGameplayState.originShiftThreshold = Math.min(1e12, Math.max(1, finiteNumber(source.originShiftThreshold, 10_000)))
}

let aiModule: typeof import('./aiTools') | null = null
let loadingAi: Promise<void> | null = null
const areaOccupants = new Map<string, Set<string>>()
const sceneStreamQueue = new Map<string, boolean>()
const activePortals = new Set<string>()
const prefetchedScenes = new Set<string>()
let portalArrival: { scene: string; portal: string; traveler: string } | null = null

async function ensureOptionalPackages(): Promise<void> {
  if (packageEnabled(OFFICIAL_AI_PACKAGE_ID) && !aiModule && !loadingAi) {
    loadingAi = import('./aiTools').then(module => { aiModule = module }).catch(error => { worldGameplayState.lastError = String(error) }).finally(() => { loadingAi = null })
  }
  await Promise.all([loadingAi].filter(Boolean))
}

function colliderSize(entity: Entity): { x: number; y: number } {
  const collider = entity.getCollider(), transform = worldTransform(entity, physicsState.world.entities)
  if (!collider) return { x: Math.abs(transform.scale.x), y: Math.abs(transform.scale.y) }
  if (collider.kind === 'EllipseCollider2D') return { x: collider.radiusX * 2 * transform.scale.x, y: collider.radiusY * 2 * transform.scale.y }
  if (['ConvexPolygon', 'ConcavePolygon', 'Chain'].includes(collider.shapeModel) && collider.vertices.length) return {
    x: (Math.max(...collider.vertices.map(point => point.x)) - Math.min(...collider.vertices.map(point => point.x))) * transform.scale.x,
    y: (Math.max(...collider.vertices.map(point => point.y)) - Math.min(...collider.vertices.map(point => point.y))) * transform.scale.y
  }
  return { x: collider.size.x * transform.scale.x, y: collider.size.y * transform.scale.y }
}

export function queueCharacterMotion(entity: Entity, displacement: { x: number; y: number }): boolean {
  const character = entity.getComponent<CharacterBody2D>('CharacterBody2D')
  if (!character?.enabled) return false
  character.requestedMotion.x += finiteNumber(displacement.x)
  character.requestedMotion.y += finiteNumber(displacement.y)
  return true
}

function moveCharacters(fixedDelta: number): void {
  for (const entity of physicsState.world.entities) {
    const character = entity.getComponent<CharacterBody2D>('CharacterBody2D')
    if (!entity.enabled || !character?.enabled || !entity.getCollider() || !entity.hasComponent('RigidBody2D')) continue
    const settings = { maxSlopeAngle: character.maxSlopeAngle * Math.PI / 180, stepHeight: character.stepHeight, floorSnap: character.floorSnap, maxSlides: character.maxSlides, safeMargin: character.safeMargin, collisionMask: character.collisionMask }
    // Refresh a moving support before carrying the character: source deletion,
    // masks, geometry or a changed velocity must take effect in this fixed tick.
    const probe = character.applyPlatformVelocity && character.onFloor && (character.platformVelocity.x || character.platformVelocity.y)
      ? physicsState.world.moveCharacterBox(entity, colliderSize(entity), { x: 0, y: 0 }, settings) : null
    const supported = probe ? probe.onFloor : character.onFloor
    const velocity = probe ? { x: probe.platformVelocity[0], y: probe.platformVelocity[1] } : character.platformVelocity
    const platform = character.applyPlatformVelocity && supported ? { x: velocity.x * fixedDelta, y: velocity.y * fixedDelta } : { x: 0, y: 0 }
    const requested = { x: character.requestedMotion.x + platform.x, y: character.requestedMotion.y + platform.y }
    const result = physicsState.world.moveCharacterBox(entity, colliderSize(entity), requested, settings)
    if (result && probe) { result.appliedMotion[0] += probe.appliedMotion[0]; result.appliedMotion[1] += probe.appliedMotion[1] }
    character.requestedMotion = { x: 0, y: 0 }
    if (!result) continue
    character.onFloor = result.onFloor; character.onWall = result.onWall; character.onCeiling = result.onCeiling
    character.floorNormal = { x: result.floorNormal[0], y: result.floorNormal[1] }
    character.wallNormal = { x: result.wallNormal[0], y: result.wallNormal[1] }
    character.ceilingNormal = { x: result.ceilingNormal[0], y: result.ceilingNormal[1] }
    character.platformVelocity = { x: result.platformVelocity[0], y: result.platformVelocity[1] }
    character.secondsSinceFloor = character.onFloor ? 0 : character.secondsSinceFloor + fixedDelta
    character.motionVelocity = { x: result.appliedMotion[0] / fixedDelta, y: result.appliedMotion[1] / fixedDelta }
    // The query already committed the collision-safe transform. A solver velocity here
    // would integrate the kinematic body a second time during the same fixed tick.
    entity.velocity = { x: 0, y: 0 }
  }
}

export function canUseCoyoteTime(entity: Entity): boolean {
  const character = entity.getComponent<CharacterBody2D>('CharacterBody2D')
  return Boolean(character && (character.onFloor || character.secondsSinceFloor <= character.coyoteTime))
}

function areaMembers(entity: Entity, area: Area2D): Entity[] {
  const transform = worldTransform(entity, physicsState.world.entities), center = transform.position
  const uuids = area.shape === 'Circle'
    ? physicsState.world.overlapCircle(center, area.radius * Math.max(Math.abs(transform.scale.x), Math.abs(transform.scale.y)), area.collisionMask)
    : physicsState.world.overlapBox(center, { x: area.size.x * Math.abs(transform.scale.x), y: area.size.y * Math.abs(transform.scale.y) }, transform.rotation, area.collisionMask)
  return uuids.flatMap(uuid => { const candidate = physicsState.world.entities.find(item => item.uuid === uuid); return candidate && candidate !== entity && candidate.hasComponent('RigidBody2D') && candidate.getComponent<Area2D>('Area2D')?.monitorable !== false ? [candidate] : [] })
}

function applyAreaEffects(fixedDelta: number, emitSignal: (name: string, payload: unknown, target: string, source: string) => void): void {
  const areas = physicsState.world.entities.flatMap(entity => {
    const area = entity.getComponent<Area2D>('Area2D'), effector = entity.getComponent<AreaEffector2D>('AreaEffector2D')
    return entity.enabled && area?.enabled ? [{ entity, area, effector: effector?.enabled ? effector : null }] : []
  }).sort((a, b) => (a.effector?.priority ?? 0) - (b.effector?.priority ?? 0) || a.entity.uuid.localeCompare(b.entity.uuid))
  const liveAreas = new Set(areas.map(value => value.entity.uuid))
  for (const [area, occupants] of areaOccupants) if (!liveAreas.has(area)) { for (const uuid of [...occupants].sort()) emitSignal('area.exited', { area }, uuid, area); areaOccupants.delete(area) }
  for (const { entity, area, effector } of areas) {
    const members = areaMembers(entity, area)
    const before = areaOccupants.get(entity.uuid) ?? new Set<string>(), current = new Set(members.map(member => member.uuid))
    for (const uuid of current) if (!before.has(uuid)) emitSignal('area.entered', { area: entity.uuid }, uuid, entity.uuid)
    for (const uuid of before) if (!current.has(uuid)) emitSignal('area.exited', { area: entity.uuid }, uuid, entity.uuid)
    areaOccupants.set(entity.uuid, current)
    for (const member of members) for (const effect of effector?.effectors.slice(0, 32) ?? []) {
      if (!effect.enabled) continue
      const directionLength = Math.hypot(effect.direction.x, effect.direction.y) || 1
      if (effect.kind === 'Gravity' || effect.kind === 'Wind') physicsState.world.applyTransientForce(member, { x: effect.direction.x / directionLength * effect.strength * member.mass, y: effect.direction.y / directionLength * effect.strength * member.mass })
      else if (effect.kind === 'Drag') physicsState.world.applyTransientForce(member, { x: -member.velocity.x * Math.max(0, effect.drag), y: -member.velocity.y * Math.max(0, effect.drag) })
      else if (effect.kind === 'Buoyancy') physicsState.world.applyTransientForce(member, { x: 0, y: Math.max(0, effect.fluidDensity) * 9.80665 * member.mass })
      else if (effect.kind === 'Damage') emitSignal('area.damage', { amount: Math.max(0, effect.damagePerSecond) * fixedDelta, area: entity.uuid }, member.uuid, entity.uuid)
      else emitSignal(effect.signal || 'area.effect', { area: entity.uuid, strength: effect.strength }, member.uuid, entity.uuid)
    }
  }
}

function focusPosition(): { x: number; y: number } {
  const activeCamera = physicsState.world.entities.find(entity => entity.camera2D?.active)
  const focus = activeCamera ?? physicsState.world.entities[0]
  return focus ? worldTransform(focus, physicsState.world.entities).position : { x: 0, y: 0 }
}

function updatePortals(requestSceneLoad: (scene: string) => void, emitSignal: (name: string, payload: unknown, target: string, source: string) => void): void {
  const desiredPrefetch = new Set(physicsState.world.entities.flatMap(entity => { const portal = entity.getComponent<Portal2D>('Portal2D'); return entity.enabled && portal?.enabled && portal.preload && portal.targetSceneUuid ? [portal.targetSceneUuid] : [] }))
  for (const scene of prefetchedScenes) if (!desiredPrefetch.has(scene)) { prefetchedScenes.delete(scene); scheduleSceneStream(scene, false) }
  for (const scene of desiredPrefetch) if (!prefetchedScenes.has(scene)) { prefetchedScenes.add(scene); scheduleSceneStream(scene, true) }
  const travelers = physicsState.world.entities.filter(entity => entity.enabled && (entity.tags.includes('player') || entity.hasComponent('CharacterBody2D')))
  for (const entity of physicsState.world.entities) {
    const portal = entity.getComponent<Portal2D>('Portal2D')
    if (!entity.enabled || !portal?.enabled || !portal.targetSceneUuid) continue
    const center = worldTransform(entity, physicsState.world.entities).position
    const traveler = travelers.find(candidate => candidate !== entity && Math.hypot(worldTransform(candidate, physicsState.world.entities).position.x - center.x, worldTransform(candidate, physicsState.world.entities).position.y - center.y) <= Math.max(0.01, finiteNumber(portal.triggerRadius, 1)))
    if (!traveler) { activePortals.delete(entity.uuid); continue }
    if (activePortals.has(entity.uuid)) continue
    activePortals.add(entity.uuid)
    emitSignal('portal.entered', { portal: entity.uuid, targetScene: portal.targetSceneUuid, targetPortal: portal.targetPortal }, traveler.uuid, entity.uuid)
    portalArrival = { scene: portal.targetSceneUuid, portal: portal.targetPortal, traveler: traveler.uuid }
    requestSceneLoad(portal.targetSceneUuid)
    break
  }
}

let sceneStreaming: RuntimeSceneStreaming | null = null
function streamedScenes(): RuntimeSceneStreaming {
  return sceneStreaming ??= new RuntimeSceneStreaming({ world: physicsState.world, scenes: sceneManager, origin: () => worldGameplayState.originOffset, createEntity: createEntityFromData, serializeEntity, readHandoff: peekStreamedSaveState, writeHandoff: handoffStreamedSaveState })
}
export function inspectStreamedScenes() { return sceneStreaming?.inspect() ?? [] }

function scheduleSceneStream(uuid: string, loaded: boolean): void {
  if (!uuid || sceneStreamQueue.get(uuid) === loaded) return
  sceneStreamQueue.set(uuid, loaded); worldGameplayState.pendingStreams = sceneStreamQueue.size
  queueMicrotask(() => {
    const value = sceneStreamQueue.get(uuid); sceneStreamQueue.delete(uuid); worldGameplayState.pendingStreams = sceneStreamQueue.size
    if (value !== undefined) { try { streamedScenes().setOwner('preload:' + uuid, uuid, value, false) } catch (error) { worldGameplayState.lastError = error instanceof Error ? error.message : String(error) } }
  })
}

function updateWorldStreaming(): void {
  const focus = focusPosition()
  updateWorldStreamingRuntime(physicsState.world.entities, focus, worldGameplayState.memoryBudgetMb, worldGameplayState.streamingEnabled, (sceneUuid, loaded, owner, active) => streamedScenes().setOwner(owner, sceneUuid, loaded, active))
  worldGameplayState.loadedChunks = worldStreamingState.loaded
  worldGameplayState.usedMemoryMb = worldStreamingState.memoryMb
  worldGameplayState.pendingStreams = worldStreamingState.pending
  if (Math.hypot(focus.x, focus.y) >= worldGameplayState.originShiftThreshold) {
    try { shiftWorldOrigin(focus) } catch (error) { worldGameplayState.lastError = error instanceof Error ? error.message : String(error) }
  }
}

/** Positions exposed to gameplay are relative to this offset; persistent absolute coordinates add it. */
export function shiftWorldOrigin(offset: { x: number; y: number }): void {
  physicsState.world.shiftOrigin(offset)
  navigationRuntime.shiftNavigationOrigin(offset, physicsState.world.entities)
  shiftParticleOrigin(offset, physicsState.world.entities)
  sceneStreaming?.shiftOrigin(offset)
  shiftStreamingOrigin(offset)
  physicsState.camera.offset.x += offset.x * physicsState.camera.scale; physicsState.camera.offset.y -= offset.y * physicsState.camera.scale
  if (physicsState.camera.targetOffset) { physicsState.camera.targetOffset.x += offset.x * physicsState.camera.scale; physicsState.camera.targetOffset.y -= offset.y * physicsState.camera.scale }
  worldGameplayState.originOffset.x += offset.x; worldGameplayState.originOffset.y += offset.y
  worldGameplayState.originShiftCount++; worldGameplayState.lastOriginShift = { ...offset }
}

export async function beginWorldGameplay(emitSignal: (name: string, payload: unknown, target: string, source: string) => void, isCurrent: () => boolean = () => true): Promise<void> {
  if (!isCurrent()) return
  // Reviewed local pools are synchronous: awake/start may spawn immediately.
  setPoolSignalEmitter((name, entity) => emitSignal(name, null, entity.uuid, 'pool'))
  if (packageEnabled(OFFICIAL_OBJECT_POOL_PACKAGE_ID)) prepareObjectPools()
  await ensureOptionalPackages()
  if (!isCurrent()) return
  if (aiModule) aiModule.setAiSignalEmitter((name, entity) => { if (name) emitSignal(name, null, entity.uuid, 'ai') })
}

export function beforeWorldPhysicsStep(fixedDelta: number, nowSeconds: number, frame: number, emitSignal: (name: string, payload: unknown, target: string, source: string) => void, requestSceneLoad: (scene: string) => void = () => {}): void {
  moveCharacters(fixedDelta)
  applyAreaEffects(fixedDelta, emitSignal)
  navigationRuntime.updateNavigation(physicsState.world.entities, fixedDelta, nowSeconds)
  if (aiModule && packageEnabled(OFFICIAL_AI_PACKAGE_ID)) aiModule.updateAi(physicsState.world.entities, fixedDelta, frame)
  captureSimulationEvidence(frame, physicsState.world.entities, physicsState.world.connections)
  if (packageEnabled(OFFICIAL_OBJECT_POOL_PACKAGE_ID)) updateObjectPools(nowSeconds)
  updateWorldStreaming()
  updateTileSceneRuntime(physicsState.world.entities, focusPosition())
  updatePortals(requestSceneLoad, emitSignal)
}

export function finishWorldSceneTransition(): void {
  sceneStreaming?.detachAfterSceneTransition(); sceneStreaming = null; sceneStreamQueue.clear(); prefetchedScenes.clear(); activePortals.clear(); areaOccupants.clear(); navigationRuntime.resetNavigation(); resetWorldStreaming(true); resetTileSceneRuntime(true)
  const arrival = portalArrival; portalArrival = null
  if (arrival?.portal && sceneManager.activeSceneUuid === arrival.scene) {
    const entities = physicsState.world.entities, target = entities.find(entity => entity.enabled && (entity.uuid === arrival.portal || entity.name === arrival.portal)), traveler = entities.find(entity => entity.uuid === arrival.traveler) ?? entities.find(entity => entity.enabled && entity.tags.includes('player')) ?? entities.find(entity => entity.enabled && entity.hasComponent('CharacterBody2D'))
    if (!target || !traveler) { worldGameplayState.lastError = 'PORTAL_TARGET_MISSING: choose a destination entity UUID/name and an enabled player.'; return }
    setWorldTransform(traveler, { ...worldTransform(traveler, entities), position: { ...worldTransform(target, entities).position } }, entities); traveler.velocity = { x: 0, y: 0 }; activePortals.add(target.uuid)
  }
}
export function retireWorldGameplayEntity(uuid: string): void { aiModule?.retireAiEntity(uuid) }
export function resetWorldGameplay(): void {
  areaOccupants.clear(); sceneStreamQueue.clear(); prefetchedScenes.clear(); portalArrival = null; activePortals.clear(); navigationRuntime.resetNavigation(); aiModule?.resetAi(); resetObjectPools(); sceneStreaming?.reset(); sceneStreaming = null; resetWorldStreaming(); resetTileSceneRuntime()
  worldGameplayState.lastError = ''; worldGameplayState.loadedChunks = 0; worldGameplayState.usedMemoryMb = 0; worldGameplayState.pendingStreams = 0; worldGameplayState.originOffset = { x: 0, y: 0 }; worldGameplayState.originShiftCount = 0; worldGameplayState.lastOriginShift = { x: 0, y: 0 }; clearSimulationEvidence()
}

export function navigationPaths(): readonly import('./navigation2d').NavigationDebugPath[] { return [...navigationRuntime.navigationDebugPaths.values()] }
export function tileSceneRuntimeSnapshot(): typeof tileSceneRuntimeState { return tileSceneRuntimeState }
