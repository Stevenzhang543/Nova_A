import { reactive } from 'vue'
import { physicsState, sceneManager } from '../store/physics'
import type { Entity } from '../world/Entity'
import type { Area2D, AreaEffector2D, CharacterBody2D, Portal2D } from '../world/components'
import { finiteNumber } from '../world/geometry'
import { worldTransform } from '../world/hierarchy'
import { OFFICIAL_AI_PACKAGE_ID, OFFICIAL_OBJECT_POOL_PACKAGE_ID, packageEnabled } from './packages'
import { prepareObjectPools, resetObjectPools, setPoolSignalEmitter, updateObjectPools } from './objectPool'
import * as navigationRuntime from './navigation2d'
import { resetWorldStreaming, updateWorldStreaming as updateWorldStreamingRuntime, worldStreamingState } from './worldStreaming'
import { resetTileSceneRuntime, tileSceneRuntimeState, updateTileSceneRuntime } from './tileSceneRuntime'

export const worldGameplayState = reactive({
  navigationDebug: false,
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
    navigationDebug: worldGameplayState.navigationDebug, areaDebug: worldGameplayState.areaDebug, chunkDebug: worldGameplayState.chunkDebug,
    streamingEnabled: worldGameplayState.streamingEnabled,
    memoryBudgetMb: Math.min(65_536, Math.max(1, finiteNumber(worldGameplayState.memoryBudgetMb, 256))),
    originShiftThreshold: Math.min(1e12, Math.max(1, finiteNumber(worldGameplayState.originShiftThreshold, 10_000)))
  }
}

export function loadWorldGameplaySettings(value: unknown): void {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  worldGameplayState.navigationDebug = source.navigationDebug === true
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
  if (collider.vertices.length) return {
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
    const platform = character.applyPlatformVelocity && character.onFloor ? { x: character.platformVelocity.x * fixedDelta, y: character.platformVelocity.y * fixedDelta } : { x: 0, y: 0 }
    const requested = { x: character.requestedMotion.x + platform.x, y: character.requestedMotion.y + platform.y }
    if (requested.x === 0 && requested.y === 0) { character.motionVelocity = { x: 0, y: 0 }; entity.velocity = { x: 0, y: 0 }; character.secondsSinceFloor = character.onFloor ? 0 : character.secondsSinceFloor + fixedDelta; continue }
    const result = physicsState.world.moveCharacterBox(entity, colliderSize(entity), requested, {
      maxSlopeAngle: character.maxSlopeAngle * Math.PI / 180, stepHeight: character.stepHeight, floorSnap: character.floorSnap,
      maxSlides: character.maxSlides, safeMargin: character.safeMargin, collisionMask: character.collisionMask
    })
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
  const center = worldTransform(entity, physicsState.world.entities).position
  const uuids = area.shape === 'Circle'
    ? physicsState.world.overlapCircle(center, area.radius, area.collisionMask)
    : physicsState.world.overlapBox(center, area.size, worldTransform(entity, physicsState.world.entities).rotation, area.collisionMask)
  return uuids.flatMap(uuid => { const candidate = physicsState.world.entities.find(item => item.uuid === uuid); return candidate && candidate !== entity && candidate.hasComponent('RigidBody2D') ? [candidate] : [] })
}

function applyAreaEffects(fixedDelta: number, emitSignal: (name: string, payload: unknown, target: string, source: string) => void): void {
  const areas = physicsState.world.entities.flatMap(entity => {
    const area = entity.getComponent<Area2D>('Area2D'), effector = entity.getComponent<AreaEffector2D>('AreaEffector2D')
    return entity.enabled && area?.enabled && effector?.enabled ? [{ entity, area, effector }] : []
  }).sort((a, b) => a.effector.priority - b.effector.priority)
  for (const { entity, area, effector } of areas) {
    const members = areaMembers(entity, area)
    const before = areaOccupants.get(entity.uuid) ?? new Set<string>(), current = new Set(members.map(member => member.uuid))
    for (const uuid of current) if (!before.has(uuid)) emitSignal('area.entered', { area: entity.uuid }, uuid, entity.uuid)
    for (const uuid of before) if (!current.has(uuid)) emitSignal('area.exited', { area: entity.uuid }, uuid, entity.uuid)
    areaOccupants.set(entity.uuid, current)
    for (const member of members) for (const effect of effector.effectors.slice(0, 32)) {
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
  const travelers = physicsState.world.entities.filter(entity => entity.enabled && (entity.tags.includes('player') || entity.hasComponent('CharacterBody2D')))
  for (const entity of physicsState.world.entities) {
    const portal = entity.getComponent<Portal2D>('Portal2D')
    if (!entity.enabled || !portal?.enabled || !portal.targetSceneUuid) continue
    if (portal.preload) scheduleSceneStream(portal.targetSceneUuid, true)
    const center = worldTransform(entity, physicsState.world.entities).position
    const traveler = travelers.find(candidate => candidate !== entity && Math.hypot(worldTransform(candidate, physicsState.world.entities).position.x - center.x, worldTransform(candidate, physicsState.world.entities).position.y - center.y) <= Math.max(0.01, finiteNumber(portal.triggerRadius, 1)))
    if (!traveler) { activePortals.delete(entity.uuid); continue }
    if (activePortals.has(entity.uuid)) continue
    activePortals.add(entity.uuid)
    emitSignal('portal.entered', { portal: entity.uuid, targetScene: portal.targetSceneUuid, targetPortal: portal.targetPortal }, traveler.uuid, entity.uuid)
    requestSceneLoad(portal.targetSceneUuid)
  }
}

function scheduleSceneStream(uuid: string, loaded: boolean): void {
  if (!uuid || sceneStreamQueue.get(uuid) === loaded) return
  sceneStreamQueue.set(uuid, loaded); worldGameplayState.pendingStreams = sceneStreamQueue.size
  queueMicrotask(() => {
    const value = sceneStreamQueue.get(uuid); sceneStreamQueue.delete(uuid); worldGameplayState.pendingStreams = sceneStreamQueue.size
    const scene = sceneManager.scenes.find(candidate => candidate.uuid === uuid)
    if (scene && scene.uuid !== sceneManager.activeSceneUuid && value !== undefined) scene.loaded = value
  })
}

function updateWorldStreaming(): void {
  const focus = focusPosition()
  updateWorldStreamingRuntime(physicsState.world.entities, focus, worldGameplayState.memoryBudgetMb, worldGameplayState.streamingEnabled, (sceneUuid, loaded) => {
    const scene = sceneManager.scenes.find(candidate => candidate.uuid === sceneUuid)
    if (scene && scene.uuid !== sceneManager.activeSceneUuid) scene.loaded = loaded
  })
  worldGameplayState.loadedChunks = worldStreamingState.loaded
  worldGameplayState.usedMemoryMb = worldStreamingState.memoryMb
  worldGameplayState.pendingStreams = worldStreamingState.pending
  if (Math.hypot(focus.x, focus.y) >= worldGameplayState.originShiftThreshold) {
    worldGameplayState.originOffset.x += focus.x; worldGameplayState.originOffset.y += focus.y
    worldGameplayState.originShiftCount++; worldGameplayState.lastOriginShift = { ...focus }
    for (const entity of physicsState.world.entities.filter(candidate => !candidate.parentUuid)) { entity.transform.position.x -= focus.x; entity.transform.position.y -= focus.y }
    physicsState.world.invalidateRuntime()
  }
}

export async function beginWorldGameplay(emitSignal: (name: string, payload: unknown, target: string, source: string) => void): Promise<void> {
  await ensureOptionalPackages()
  if (aiModule) aiModule.setAiSignalEmitter((name, entity) => { if (name) emitSignal(name, null, entity.uuid, 'ai') })
  setPoolSignalEmitter((name, entity) => emitSignal(name, null, entity.uuid, 'pool'))
  if (packageEnabled(OFFICIAL_OBJECT_POOL_PACKAGE_ID)) prepareObjectPools()
}

export function beforeWorldPhysicsStep(fixedDelta: number, nowSeconds: number, frame: number, emitSignal: (name: string, payload: unknown, target: string, source: string) => void, requestSceneLoad: (scene: string) => void = () => {}): void {
  moveCharacters(fixedDelta)
  applyAreaEffects(fixedDelta, emitSignal)
  navigationRuntime.updateNavigation(physicsState.world.entities, fixedDelta, nowSeconds)
  if (aiModule) aiModule.updateAi(physicsState.world.entities, fixedDelta, frame)
  if (packageEnabled(OFFICIAL_OBJECT_POOL_PACKAGE_ID)) updateObjectPools(nowSeconds)
  updateWorldStreaming()
  updateTileSceneRuntime(physicsState.world.entities, focusPosition())
  updatePortals(requestSceneLoad, emitSignal)
}

export function resetWorldGameplay(): void {
  areaOccupants.clear(); sceneStreamQueue.clear(); activePortals.clear(); navigationRuntime.resetNavigation(); aiModule?.resetAi(); resetObjectPools(); resetWorldStreaming(); resetTileSceneRuntime()
  worldGameplayState.loadedChunks = 0; worldGameplayState.usedMemoryMb = 0; worldGameplayState.pendingStreams = 0; worldGameplayState.originOffset = { x: 0, y: 0 }; worldGameplayState.originShiftCount = 0; worldGameplayState.lastOriginShift = { x: 0, y: 0 }
}

export function navigationPaths(): readonly import('./navigation2d').NavigationDebugPath[] { return [...navigationRuntime.navigationDebugPaths.values()] }
export function tileSceneRuntimeSnapshot(): typeof tileSceneRuntimeState { return tileSceneRuntimeState }
