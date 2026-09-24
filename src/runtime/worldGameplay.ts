/** 世界玩法编排：协调角色运动、区域效果、传送、流送及场景切换前后的游戏状态。 */
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

/** 结构说明（自动提取）：serializeWorldGameplaySettings；无显式参数；直接调用 Math.min、Math.max、finiteNumber。 */ export function serializeWorldGameplaySettings(): Record<string, unknown> {
  return {
    navigationDebug: worldGameplayState.navigationDebug, aiDebug: worldGameplayState.aiDebug, simulationDebug: worldGameplayState.simulationDebug, areaDebug: worldGameplayState.areaDebug, chunkDebug: worldGameplayState.chunkDebug,
    streamingEnabled: worldGameplayState.streamingEnabled,
    memoryBudgetMb: Math.min(65_536, Math.max(1, finiteNumber(worldGameplayState.memoryBudgetMb, 256))),
    originShiftThreshold: Math.min(1e12, Math.max(1, finiteNumber(worldGameplayState.originShiftThreshold, 10_000)))
  }
}

/** 结构说明（自动提取）：loadWorldGameplaySettings；输入 value；直接调用 Math.min、Math.max、finiteNumber；写入 worldGameplayState.navigationDebug、worldGameplayState.aiDebug、worldGameplayState.simulationDebug、worldGameplayState.areaDebug 等。 */ export function loadWorldGameplaySettings(value: unknown): void {
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

/** 结构说明（自动提取）：ensureOptionalPackages；无显式参数；直接调用 packageEnabled、finally、catch、then、Promise.all 等；写入 loadingAi；等待异步结果。 */ async function ensureOptionalPackages(): Promise<void> {
  if (packageEnabled(OFFICIAL_AI_PACKAGE_ID) && !aiModule && !loadingAi) {
    loadingAi = import('./aiTools').then(/** 将 module 赋给 aiModule，不显式返回值。 */ module => { aiModule = module }).catch(/** 将 String(error) 赋给 worldGameplayState.lastError，不显式返回值。 */ error => { worldGameplayState.lastError = String(error) }).finally(/** 将 null 赋给 loadingAi，不显式返回值。 */ () => { loadingAi = null })
  }
  await Promise.all([loadingAi].filter(Boolean))
}

/** 结构说明（自动提取）：colliderSize；输入 entity；直接调用 entity.getCollider、worldTransform、Math.abs、includes、Math.max 等。 */ function colliderSize(entity: Entity): { x: number; y: number } {
  const collider = entity.getCollider(), transform = worldTransform(entity, physicsState.world.entities)
  if (!collider) return { x: Math.abs(transform.scale.x), y: Math.abs(transform.scale.y) }
  if (collider.kind === 'EllipseCollider2D') return { x: collider.radiusX * 2 * transform.scale.x, y: collider.radiusY * 2 * transform.scale.y }
  if (['ConvexPolygon', 'ConcavePolygon', 'Chain'].includes(collider.shapeModel) && collider.vertices.length) return {
    x: (Math.max(...collider.vertices.map(/* 返回 point.x 的当前值。 */ point => point.x)) - Math.min(...collider.vertices.map(/* 返回 point.x 的当前值。 */ point => point.x))) * transform.scale.x,
    y: (Math.max(...collider.vertices.map(/* 返回 point.y 的当前值。 */ point => point.y)) - Math.min(...collider.vertices.map(/* 返回 point.y 的当前值。 */ point => point.y))) * transform.scale.y
  }
  return { x: collider.size.x * transform.scale.x, y: collider.size.y * transform.scale.y }
}

/** 结构说明（自动提取）：queueCharacterMotion；输入 entity、displacement；直接调用 entity.getComponent、finiteNumber；写入 character.requestedMotion.x、character.requestedMotion.y。 */ export function queueCharacterMotion(entity: Entity, displacement: { x: number; y: number }): boolean {
  const character = entity.getComponent<CharacterBody2D>('CharacterBody2D')
  if (!character?.enabled) return false
  character.requestedMotion.x += finiteNumber(displacement.x)
  character.requestedMotion.y += finiteNumber(displacement.y)
  return true
}

/** 结构说明（自动提取）：moveCharacters；输入 fixedDelta；直接调用 entity.getComponent、entity.getCollider、entity.hasComponent、physicsState.world.moveCharacterBox、colliderSize；写入 result.appliedMotion[…]、character.requestedMotion、character.onFloor、character.onWall 等；包含循环处理。 */ function moveCharacters(fixedDelta: number): void {
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

/** 结构说明（自动提取）：canUseCoyoteTime；输入 entity；直接调用 entity.getComponent、Boolean。 */ export function canUseCoyoteTime(entity: Entity): boolean {
  const character = entity.getComponent<CharacterBody2D>('CharacterBody2D')
  return Boolean(character && (character.onFloor || character.secondsSinceFloor <= character.coyoteTime))
}

/** 结构说明（自动提取）：areaMembers；输入 entity、area；直接调用 worldTransform、physicsState.world.overlapCircle、Math.max、Math.abs、physicsState.world.overlapBox 等。 */ function areaMembers(entity: Entity, area: Area2D): Entity[] {
  const transform = worldTransform(entity, physicsState.world.entities), center = transform.position
  const uuids = area.shape === 'Circle'
    ? physicsState.world.overlapCircle(center, area.radius * Math.max(Math.abs(transform.scale.x), Math.abs(transform.scale.y)), area.collisionMask)
    : physicsState.world.overlapBox(center, { x: area.size.x * Math.abs(transform.scale.x), y: area.size.y * Math.abs(transform.scale.y) }, transform.rotation, area.collisionMask)
  return uuids.flatMap(/** 结构说明（自动提取）：uuids.flatMap 回调；输入 uuid；直接调用 physicsState.world.entities.find、candidate.hasComponent、candidate.getComponent。 */ uuid => { const candidate = physicsState.world.entities.find(/* 比较 item.uuid 与 uuid，返回严格相等的判断结果。 */ item => item.uuid === uuid); return candidate && candidate !== entity && candidate.hasComponent('RigidBody2D') && candidate.getComponent<Area2D>('Area2D')?.monitorable !== false ? [candidate] : [] })
}

/** 结构说明（自动提取）：applyAreaEffects；输入 fixedDelta、emitSignal；直接调用 sort、physicsState.world.entities.flatMap、Set、areas.map、liveAreas.has 等；包含循环处理。 */ function applyAreaEffects(fixedDelta: number, emitSignal: (name: string, payload: unknown, target: string, source: string) => void): void {
  const areas = physicsState.world.entities.flatMap(/** 结构说明（自动提取）：physicsState.world.entities.flatMap 回调；输入 entity；直接调用 entity.getComponent。 */ entity => {
    const area = entity.getComponent<Area2D>('Area2D'), effector = entity.getComponent<AreaEffector2D>('AreaEffector2D')
    return entity.enabled && area?.enabled ? [{ entity, area, effector: effector?.enabled ? effector : null }] : []
  }).sort(/* 先计算 (a.effector?.priority ?? 0) - (b.effector?.priority ?? 0)；仅当其为假值时求右侧 a.entity.uuid.localeCompare(b.entity.uuid)，返回短路求值结果。 */ (a, b) => (a.effector?.priority ?? 0) - (b.effector?.priority ?? 0) || a.entity.uuid.localeCompare(b.entity.uuid))
  const liveAreas = new Set(areas.map(/* 返回 value.entity.uuid 的当前值。 */ value => value.entity.uuid))
  for (const [area, occupants] of areaOccupants) if (!liveAreas.has(area)) { for (const uuid of [...occupants].sort()) emitSignal('area.exited', { area }, uuid, area); areaOccupants.delete(area) }
  for (const { entity, area, effector } of areas) {
    const members = areaMembers(entity, area)
    const before = areaOccupants.get(entity.uuid) ?? new Set<string>(), current = new Set(members.map(/* 返回 member.uuid 的当前值。 */ member => member.uuid))
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

/** 结构说明（自动提取）：focusPosition；无显式参数；直接调用 physicsState.world.entities.find、worldTransform。 */ function focusPosition(): { x: number; y: number } {
  const activeCamera = physicsState.world.entities.find(/* 返回 entity.camera2D?.active 的当前值。 */ entity => entity.camera2D?.active)
  const focus = activeCamera ?? physicsState.world.entities[0]
  return focus ? worldTransform(focus, physicsState.world.entities).position : { x: 0, y: 0 }
}

/** 结构说明（自动提取）：updatePortals；输入 requestSceneLoad、emitSignal；直接调用 Set、physicsState.world.entities.flatMap、desiredPrefetch.has、prefetchedScenes.delete、scheduleSceneStream 等；写入 portalArrival；包含循环处理。 */ function updatePortals(requestSceneLoad: (scene: string) => void, emitSignal: (name: string, payload: unknown, target: string, source: string) => void): void {
  const desiredPrefetch = new Set(physicsState.world.entities.flatMap(/** 结构说明（自动提取）：physicsState.world.entities.flatMap 回调；输入 entity；直接调用 entity.getComponent。 */ entity => { const portal = entity.getComponent<Portal2D>('Portal2D'); return entity.enabled && portal?.enabled && portal.preload && portal.targetSceneUuid ? [portal.targetSceneUuid] : [] }))
  for (const scene of prefetchedScenes) if (!desiredPrefetch.has(scene)) { prefetchedScenes.delete(scene); scheduleSceneStream(scene, false) }
  for (const scene of desiredPrefetch) if (!prefetchedScenes.has(scene)) { prefetchedScenes.add(scene); scheduleSceneStream(scene, true) }
  const travelers = physicsState.world.entities.filter(/* 先计算 entity.enabled；仅当其为真值时求右侧 (entity.tags.includes('player') || entity.hasComponent('CharacterBody2D'))，返回短路求值结果。 */ entity => entity.enabled && (entity.tags.includes('player') || entity.hasComponent('CharacterBody2D')))
  for (const entity of physicsState.world.entities) {
    const portal = entity.getComponent<Portal2D>('Portal2D')
    if (!entity.enabled || !portal?.enabled || !portal.targetSceneUuid) continue
    const center = worldTransform(entity, physicsState.world.entities).position
    const traveler = travelers.find(/** 结构说明（自动提取）：travelers.find 回调；输入 candidate；直接调用 Math.hypot、worldTransform、Math.max、finiteNumber；返回表达式求值结果。 */ candidate => candidate !== entity && Math.hypot(worldTransform(candidate, physicsState.world.entities).position.x - center.x, worldTransform(candidate, physicsState.world.entities).position.y - center.y) <= Math.max(0.01, finiteNumber(portal.triggerRadius, 1)))
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
/** 结构说明（自动提取）：streamedScenes；无显式参数；直接调用 RuntimeSceneStreaming；写入 sceneStreaming。 */ function streamedScenes(): RuntimeSceneStreaming {
  return sceneStreaming ??= new RuntimeSceneStreaming({ world: physicsState.world, scenes: sceneManager, origin: /* 返回 worldGameplayState.originOffset 的当前值。 */ () => worldGameplayState.originOffset, createEntity: createEntityFromData, serializeEntity, readHandoff: peekStreamedSaveState, writeHandoff: handoffStreamedSaveState })
}
/* 当 sceneStreaming?.inspect() 为 null 或 undefined 时返回 []，否则保留左侧值。 */ export function inspectStreamedScenes() { return sceneStreaming?.inspect() ?? [] }

/** 结构说明（自动提取）：scheduleSceneStream；输入 uuid、loaded；直接调用 sceneStreamQueue.get、sceneStreamQueue.set、queueMicrotask；写入 worldGameplayState.pendingStreams。 */ function scheduleSceneStream(uuid: string, loaded: boolean): void {
  if (!uuid || sceneStreamQueue.get(uuid) === loaded) return
  sceneStreamQueue.set(uuid, loaded); worldGameplayState.pendingStreams = sceneStreamQueue.size
  queueMicrotask(/** 结构说明（自动提取）：queueMicrotask 回调；无显式参数；直接调用 sceneStreamQueue.get、sceneStreamQueue.delete、setOwner、streamedScenes、String；写入 worldGameplayState.pendingStreams、worldGameplayState.lastError。 */ () => {
    const value = sceneStreamQueue.get(uuid); sceneStreamQueue.delete(uuid); worldGameplayState.pendingStreams = sceneStreamQueue.size
    if (value !== undefined) { try { streamedScenes().setOwner('preload:' + uuid, uuid, value, false) } catch (error) { worldGameplayState.lastError = error instanceof Error ? error.message : String(error) } }
  })
}

/** 结构说明（自动提取）：updateWorldStreaming；无显式参数；直接调用 focusPosition、updateWorldStreamingRuntime、Math.hypot、shiftWorldOrigin、String；写入 worldGameplayState.loadedChunks、worldGameplayState.usedMemoryMb、worldGameplayState.pendingStreams、worldGameplayState.lastError。 */ function updateWorldStreaming(): void {
  const focus = focusPosition()
  updateWorldStreamingRuntime(physicsState.world.entities, focus, worldGameplayState.memoryBudgetMb, worldGameplayState.streamingEnabled, /* 调用 streamedScenes().setOwner(owner, sceneUuid, loaded, active) 并返回调用结果。 */ (sceneUuid, loaded, owner, active) => streamedScenes().setOwner(owner, sceneUuid, loaded, active))
  worldGameplayState.loadedChunks = worldStreamingState.loaded
  worldGameplayState.usedMemoryMb = worldStreamingState.memoryMb
  worldGameplayState.pendingStreams = worldStreamingState.pending
  if (Math.hypot(focus.x, focus.y) >= worldGameplayState.originShiftThreshold) {
    try { shiftWorldOrigin(focus) } catch (error) { worldGameplayState.lastError = error instanceof Error ? error.message : String(error) }
  }
}

/** Positions exposed to gameplay are relative to this offset; persistent absolute coordinates add it. */
/** 结构说明（自动提取）：shiftWorldOrigin；输入 offset；直接调用 physicsState.world.shiftOrigin、navigationRuntime.shiftNavigationOrigin、shiftParticleOrigin、sceneStreaming.shiftOrigin、shiftStreamingOrigin；写入 physicsState.camera.offset.x、physicsState.camera.offset.y、physicsState.camera.targetOffset.x、physicsState.camera.targetOffset.y 等。 */ export function shiftWorldOrigin(offset: { x: number; y: number }): void {
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

/** 结构说明（自动提取）：beginWorldGameplay；输入 emitSignal、isCurrent；直接调用 isCurrent、setPoolSignalEmitter、packageEnabled、prepareObjectPools、ensureOptionalPackages 等；等待异步结果。 */ export async function beginWorldGameplay(emitSignal: (name: string, payload: unknown, target: string, source: string) => void, isCurrent: () => boolean = /* 返回固定值 true。 */ () => true): Promise<void> {
  if (!isCurrent()) return
  // Reviewed local pools are synchronous: awake/start may spawn immediately.
  setPoolSignalEmitter(/* 调用 emitSignal(name, null, entity.uuid, 'pool') 并返回调用结果。 */ (name, entity) => emitSignal(name, null, entity.uuid, 'pool'))
  if (packageEnabled(OFFICIAL_OBJECT_POOL_PACKAGE_ID)) prepareObjectPools()
  await ensureOptionalPackages()
  if (!isCurrent()) return
  if (aiModule) aiModule.setAiSignalEmitter(/** 结构说明（自动提取）：aiModule.setAiSignalEmitter 回调；输入 name、entity；直接调用 emitSignal。 */ (name, entity) => { if (name) emitSignal(name, null, entity.uuid, 'ai') })
}

/** 结构说明（自动提取）：beforeWorldPhysicsStep；输入 fixedDelta、nowSeconds、frame、emitSignal、requestSceneLoad；直接调用 moveCharacters、applyAreaEffects、navigationRuntime.updateNavigation、packageEnabled、aiModule.updateAi 等。 */ export function beforeWorldPhysicsStep(fixedDelta: number, nowSeconds: number, frame: number, emitSignal: (name: string, payload: unknown, target: string, source: string) => void, requestSceneLoad: (scene: string) => void = /** 提供不执行额外操作的空回调，用于测试接口占位。 */ () => {}): void {
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

/** 结构说明（自动提取）：finishWorldSceneTransition；无显式参数；直接调用 sceneStreaming.detachAfterSceneTransition、sceneStreamQueue.clear、prefetchedScenes.clear、activePortals.clear、areaOccupants.clear 等；写入 sceneStreaming、portalArrival、worldGameplayState.lastError、traveler.velocity。 */ export function finishWorldSceneTransition(): void {
  sceneStreaming?.detachAfterSceneTransition(); sceneStreaming = null; sceneStreamQueue.clear(); prefetchedScenes.clear(); activePortals.clear(); areaOccupants.clear(); navigationRuntime.resetNavigation(); resetWorldStreaming(true); resetTileSceneRuntime(true)
  const arrival = portalArrival; portalArrival = null
  if (arrival?.portal && sceneManager.activeSceneUuid === arrival.scene) {
    const entities = physicsState.world.entities, target = entities.find(/* 先计算 entity.enabled；仅当其为真值时求右侧 (entity.uuid === arrival.portal || entity.name === arrival.portal)，返回短路求值结果。 */ entity => entity.enabled && (entity.uuid === arrival.portal || entity.name === arrival.portal)), traveler = entities.find(/* 比较 entity.uuid 与 arrival.traveler，返回严格相等的判断结果。 */ entity => entity.uuid === arrival.traveler) ?? entities.find(/* 先计算 entity.enabled；仅当其为真值时求右侧 entity.tags.includes('player')，返回短路求值结果。 */ entity => entity.enabled && entity.tags.includes('player')) ?? entities.find(/* 先计算 entity.enabled；仅当其为真值时求右侧 entity.hasComponent('CharacterBody2D')，返回短路求值结果。 */ entity => entity.enabled && entity.hasComponent('CharacterBody2D'))
    if (!target || !traveler) { worldGameplayState.lastError = 'PORTAL_TARGET_MISSING: choose a destination entity UUID/name and an enabled player.'; return }
    setWorldTransform(traveler, { ...worldTransform(traveler, entities), position: { ...worldTransform(target, entities).position } }, entities); traveler.velocity = { x: 0, y: 0 }; activePortals.add(target.uuid)
  }
}
/** 执行时调用 aiModule?.retireAiEntity(uuid)；不显式返回调用结果。 */ export function retireWorldGameplayEntity(uuid: string): void { aiModule?.retireAiEntity(uuid) }
/** 结构说明（自动提取）：resetWorldGameplay；无显式参数；直接调用 areaOccupants.clear、sceneStreamQueue.clear、prefetchedScenes.clear、activePortals.clear、navigationRuntime.resetNavigation 等；写入 portalArrival、sceneStreaming、worldGameplayState.lastError、worldGameplayState.loadedChunks 等。 */ export function resetWorldGameplay(): void {
  areaOccupants.clear(); sceneStreamQueue.clear(); prefetchedScenes.clear(); portalArrival = null; activePortals.clear(); navigationRuntime.resetNavigation(); aiModule?.resetAi(); resetObjectPools(); sceneStreaming?.reset(); sceneStreaming = null; resetWorldStreaming(); resetTileSceneRuntime()
  worldGameplayState.lastError = ''; worldGameplayState.loadedChunks = 0; worldGameplayState.usedMemoryMb = 0; worldGameplayState.pendingStreams = 0; worldGameplayState.originOffset = { x: 0, y: 0 }; worldGameplayState.originShiftCount = 0; worldGameplayState.lastOriginShift = { x: 0, y: 0 }; clearSimulationEvidence()
}

/* 返回按声明顺序构造的数组 [...navigationRuntime.navigationDebugPaths.values()]。 */ export function navigationPaths(): readonly import('./navigation2d').NavigationDebugPath[] { return [...navigationRuntime.navigationDebugPaths.values()] }
/* 返回 tileSceneRuntimeState 的当前值。 */ export function tileSceneRuntimeSnapshot(): typeof tileSceneRuntimeState { return tileSceneRuntimeState }
