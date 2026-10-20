/** Fixed-World orchestration. Original service Owners are supplied explicitly;
 * their legacy global caches remain a separate migration obligation. */
import {RuntimePrefabInstantiator,type RuntimeObjectPorts} from './runtimePrefabInstantiator'
import { EntityLifetimeOwner } from './entityLifetimes'
import { StreamLifecycleOwner } from './streamLifecycle'
import { WorldStreamingOwner } from './worldStreamingOwner'
import {ObjectPoolOwner} from './objectPoolOwner'
import {DynamicObjectsOwner} from './dynamicObjectsOwner'
import { GameplayComponentsOwner, type GameplayComponentDiagnostics } from './gameplayComponentsOwner'
import { NavigationOwner } from './navigationOwner'
import { GraphDebugOwner } from './graphDebugOwner'
import {TileMapOwner} from './tileMapOwner'
import {TileSceneOwner,type TileSceneState} from './tileSceneOwner'
import {RuntimeSceneInstantiator} from './runtimeSceneInstantiator'
import type { Entity } from '../world/Entity'
import type { World } from '../world/World'
import type { Connection } from '../world/Connection'
import type { Vec2 } from '../world/types'
import type { Area2D, AreaEffector2D, CharacterBody2D, Portal2D, RigidBody2D } from '../world/components'
import { finiteNumber } from '../world/geometry'
import { worldTransform, setWorldTransform } from '../world/hierarchy'

export interface WorldGameplayCamera { scale: number; offset: Vec2; targetOffset?: Vec2 | null }
export interface WorldGameplayState {
  navigationDebug: boolean; aiDebug: boolean; simulationDebug: boolean; areaDebug: boolean; chunkDebug: boolean
  streamingEnabled: boolean; memoryBudgetMb: number; originShiftThreshold: number
  originOffset: Vec2; originShiftCount: number; lastOriginShift: Vec2
  loadedChunks: number; usedMemoryMb: number; pendingStreams: number; lastError: string
}
/** Project `world` settings (debug views, streaming, budgets) as plain values; owners and the independent Player share it. */
export function normalizeWorldGameplaySettings(value: unknown): Pick<WorldGameplayState, 'navigationDebug' | 'aiDebug' | 'simulationDebug' | 'areaDebug' | 'chunkDebug' | 'streamingEnabled' | 'memoryBudgetMb' | 'originShiftThreshold'> {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    navigationDebug: source.navigationDebug === true, aiDebug: source.aiDebug === true, simulationDebug: source.simulationDebug === true,
    areaDebug: source.areaDebug === true, chunkDebug: source.chunkDebug === true, streamingEnabled: source.streamingEnabled !== false,
    memoryBudgetMb: Math.min(65_536, Math.max(1, finiteNumber(source.memoryBudgetMb, 256))),
    originShiftThreshold: Math.min(1e12, Math.max(1, finiteNumber(source.originShiftThreshold, 10_000)))
  }
}
export function createInitialWorldGameplayState(): WorldGameplayState { return {
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
} }
export type WorldGameplayWorld = Pick<World, 'entities' | 'connections' | 'moveCharacterBox' | 'overlapCircle' | 'overlapBox' | 'applyTransientForce' | 'shiftOrigin' | 'allocateId' | 'allocateConnectionId' | 'invalidateRuntime'> & Partial<Pick<World, 'entityForBodyHandle'>>
export interface WorldGameplayOwnerHost {
  readonly world: WorldGameplayWorld
  readonly camera: WorldGameplayCamera
  readonly activeSceneUuid: string
}
export interface WorldGameplayNavigationDebugPath { entityUuid: string; points: Vec2[]; status: 'Ready' | 'Unreachable' }
export interface WorldGameplayTileState { activePlacements: number; cachedPlacements: number; spawned: number; deferred: number; invalidAssets: number }
export interface WorldGameplaySceneStreaming {
  setOwner(owner: string, sceneUuid: string, loaded: boolean, active: boolean): void
  inspect(): Array<{ sceneUuid: string; owners: number; activeOwners: number; entities: number; connections: number }>
  shiftOrigin(offset: Vec2): void
  detachAfterSceneTransition(): void
  reset(): void
}
export interface WorldGameplayAi {
  readonly world: { readonly entities: readonly Entity[] }
  setAiSignalEmitter(emitter: (name: string, entity: Entity) => void): void
  updateAi(entities: Entity[], dt: number, frame: number): void
  retireAiEntity(uuid: string): void
  resetAi(): void
}
export interface WorldGameplayPorts {
  graphDebug: GraphDebugOwner
  packages: { aiEnabled(): boolean; objectPoolEnabled(): boolean }
  loadAi(): Promise<WorldGameplayAi>
  runtimeObjects: RuntimeObjectPorts
  lifecycle: { lifetimes: EntityLifetimeOwner; streams: StreamLifecycleOwner }
  navigation: NavigationOwner
  streaming: WorldStreamingOwner
  createSceneStreaming(host: { world: WorldGameplayWorld; lifecycle: StreamLifecycleOwner; streamingOwner: WorldStreamingOwner; origin(): Vec2; activeSceneUuid(): string }): WorldGameplaySceneStreaming
  tile: {map:TileMapOwner;scene:RuntimeSceneInstantiator;state?:TileSceneState}
  evidence: { captureSimulationEvidence(frame: number, entities: readonly Entity[], connections: readonly Connection[]): string; clearSimulationEvidence(): void }
  particles: { shiftParticleOrigin(offset: Vec2, entities: Entity[]): void }
}

/** No default services: a standalone host supplies every real capability. */
export class WorldGameplayOwner {
  readonly world: WorldGameplayWorld
  readonly entityLifetimes: EntityLifetimeOwner
  readonly streamLifecycle: StreamLifecycleOwner
  readonly streamingOwner: WorldStreamingOwner
  readonly navigationOwner: NavigationOwner
  readonly graphDebugOwner: GraphDebugOwner
  readonly componentsOwner: GameplayComponentsOwner
  readonly prefabInstantiator: RuntimePrefabInstantiator
  readonly objectPoolOwner: ObjectPoolOwner
  readonly dynamicObjectsOwner: DynamicObjectsOwner
  readonly tileMapOwner:TileMapOwner
  readonly tileSceneOwner:TileSceneOwner
  private aiModule: WorldGameplayAi | null = null
  private loadingAi: Promise<void> | null = null
  private areaOccupants = new Map<string, Set<string>>()
  private sceneStreamQueue = new Map<string, boolean>()
  private streamGeneration = 0
  private activePortals = new Set<string>()
  private prefetchedScenes = new Set<string>()
  private portalArrival: { scene: string; portal: string; traveler: string } | null = null
  private sceneStreaming: WorldGameplaySceneStreaming | null = null

  constructor(private host: WorldGameplayOwnerHost, private ports: WorldGameplayPorts, readonly state: WorldGameplayState = createInitialWorldGameplayState(), componentsDiagnostics?: GameplayComponentDiagnostics) {
    if (!host?.world) throw new Error('WORLD_GAMEPLAY_HOST_REQUIRED: Supply a fixed World host.')
    const required = [ports?.packages?.aiEnabled, ports?.packages?.objectPoolEnabled, ports?.loadAi,
      ports?.navigation?.updateNavigation, ports?.navigation?.shiftNavigationOrigin, ports?.navigation?.resetNavigation,
      ports?.streaming?.updateWorldStreaming, ports?.streaming?.resetWorldStreaming, ports?.streaming?.shiftStreamingOrigin,
      ports?.createSceneStreaming, ports?.tile?.map?.tileChunkCommands, ports?.tile?.scene?.instantiateSceneAsset,
      ports?.evidence?.captureSimulationEvidence, ports?.evidence?.clearSimulationEvidence, ports?.particles?.shiftParticleOrigin]
    if (required.some(capability => typeof capability !== 'function') || !ports.navigation.navigationDebugPaths || !ports.streaming.state) throw new Error('WORLD_GAMEPLAY_PORTS_REQUIRED: Supply all real gameplay service ports.')
    this.world = host.world
    if (!(ports.graphDebug instanceof GraphDebugOwner) || ports.graphDebug.world !== this.world) throw new Error('WORLD_GAMEPLAY_GRAPH_DEBUG_WORLD_MISMATCH: Supply this World graph debug Owner.')
    this.graphDebugOwner = ports.graphDebug
    if (!(ports.lifecycle?.lifetimes instanceof EntityLifetimeOwner) || !(ports.lifecycle?.streams instanceof StreamLifecycleOwner) || ports.lifecycle.lifetimes.world !== this.world || ports.lifecycle.streams.lifetimes !== ports.lifecycle.lifetimes || ports.runtimeObjects.lifetimes !== ports.lifecycle.lifetimes) throw new Error('WORLD_GAMEPLAY_LIFECYCLE_OWNER_MISMATCH: Supply one same-fixed-World lifecycle composition.')
    this.entityLifetimes = ports.lifecycle.lifetimes; this.streamLifecycle = ports.lifecycle.streams
    if (!(ports.streaming instanceof WorldStreamingOwner) || ports.streaming.world !== this.world || ports.streaming.lifecycle !== this.streamLifecycle || ports.streaming.isDisposed) throw new Error('WORLD_GAMEPLAY_STREAMING_WORLD_MISMATCH')
    this.streamingOwner = ports.streaming
    if (!(ports.navigation instanceof NavigationOwner) || ports.navigation.world !== this.world) throw new Error('WORLD_GAMEPLAY_NAVIGATION_WORLD_MISMATCH: Supply this World navigation Owner.')
    this.navigationOwner = ports.navigation
    this.componentsOwner = new GameplayComponentsOwner(this.world, componentsDiagnostics)
    this.prefabInstantiator = new RuntimePrefabInstantiator(this.world, ports.runtimeObjects)
    this.objectPoolOwner = new ObjectPoolOwner(this.world, this.prefabInstantiator, ports.runtimeObjects)
    this.dynamicObjectsOwner = new DynamicObjectsOwner(this.world, this.objectPoolOwner, this.prefabInstantiator, ports.runtimeObjects)
    if(!(ports.tile.map instanceof TileMapOwner)||!(ports.tile.scene instanceof RuntimeSceneInstantiator)||ports.tile.map.world!==this.world||ports.tile.scene.world!==this.world)throw new Error('WORLD_GAMEPLAY_TILE_WORLD_MISMATCH')
    this.tileMapOwner=ports.tile.map
    this.tileSceneOwner=new TileSceneOwner(this.world,{tile:this.tileMapOwner,scene:ports.tile.scene,prefab:this.prefabInstantiator,lifecycle:this.streamLifecycle},ports.tile.state)
  }

  serializeWorldGameplaySettings(): Record<string, unknown> {
    return {
      navigationDebug: this.state.navigationDebug, aiDebug: this.state.aiDebug, simulationDebug: this.state.simulationDebug, areaDebug: this.state.areaDebug, chunkDebug: this.state.chunkDebug,
      streamingEnabled: this.state.streamingEnabled,
      memoryBudgetMb: Math.min(65_536, Math.max(1, finiteNumber(this.state.memoryBudgetMb, 256))),
      originShiftThreshold: Math.min(1e12, Math.max(1, finiteNumber(this.state.originShiftThreshold, 10_000)))
    }
  }

  loadWorldGameplaySettings(value: unknown): void { Object.assign(this.state, normalizeWorldGameplaySettings(value)) }

  private async ensureOptionalPackages(): Promise<void> {
    if (this.ports.packages.aiEnabled() && !this.aiModule && !this.loadingAi) {
      this.loadingAi = this.ports.loadAi().then(/** 将 module 赋给 this.aiModule，不显式返回值。 */ module => { if (module.world !== this.world) throw new Error('WORLD_GAMEPLAY_AI_WORLD_MISMATCH: Load the AI Owner for this fixed World.'); this.aiModule = module }).catch(/** 将 String(error) 赋给 this.state.lastError，不显式返回值。 */ error => { this.state.lastError = String(error) }).finally(/** 将 null 赋给 this.loadingAi，不显式返回值。 */ () => { this.loadingAi = null })
    }
    await Promise.all([this.loadingAi].filter(Boolean))
  }

  private colliderSize(entity: Entity): { x: number; y: number } {
    const collider = entity.getCollider(), transform = worldTransform(entity, this.world.entities)
    if (!collider) return { x: Math.abs(transform.scale.x), y: Math.abs(transform.scale.y) }
    if (collider.kind === 'EllipseCollider2D') return { x: collider.radiusX * 2 * transform.scale.x, y: collider.radiusY * 2 * transform.scale.y }
    if (['ConvexPolygon', 'ConcavePolygon', 'Chain'].includes(collider.shapeModel) && collider.vertices.length) return {
      x: (Math.max(...collider.vertices.map(/* 返回 point.x 的当前值。 */ point => point.x)) - Math.min(...collider.vertices.map(/* 返回 point.x 的当前值。 */ point => point.x))) * transform.scale.x,
      y: (Math.max(...collider.vertices.map(/* 返回 point.y 的当前值。 */ point => point.y)) - Math.min(...collider.vertices.map(/* 返回 point.y 的当前值。 */ point => point.y))) * transform.scale.y
    }
    return { x: collider.size.x * transform.scale.x, y: collider.size.y * transform.scale.y }
  }

  queueCharacterMotion(entity: Entity, displacement: { x: number; y: number }): boolean {
    const character = entity.getComponent<CharacterBody2D>('CharacterBody2D')
    if (!character?.enabled) return false
    character.requestedMotion.x += finiteNumber(displacement.x)
    character.requestedMotion.y += finiteNumber(displacement.y)
    return true
  }

  // 26.44: where each character's floor was after its last move, and how that floor was moving
  // then. A floor moved by a script or an animation (not by its velocity) is followed next tick.
  private characterSupports = new Map<string, { support: string; x: number; y: number; rotation: number; vx: number; vy: number; w: number }>()

  /** 26.44: displacement that keeps a character on a floor that was moved by a script or an
   * animation since the last tick (the part not explained by the floor's velocity, which is carried
   * through platformVelocity), turning with the floor around its centre. Far jumps are not followed. */
  private supportFollow(entity: Entity, character: CharacterBody2D, fixedDelta: number): { x: number; y: number } {
    const record = this.characterSupports.get(entity.uuid)
    if (!record || !character.onFloor || !character.applyPlatformVelocity) return { x: 0, y: 0 }
    // By uuid: the editor's world hands out reactive proxies outside a frame and plain objects inside.
    const support = this.world.entities.find(candidate => candidate.uuid === record.support)
    if (!support?.enabled) return { x: 0, y: 0 }
    const now = worldTransform(support, this.world.entities)
    const expected = { x: record.x + record.vx * fixedDelta, y: record.y + record.vy * fixedDelta, rotation: record.rotation + record.w * fixedDelta }
    let turn = now.rotation - expected.rotation
    turn = Math.atan2(Math.sin(turn), Math.cos(turn))
    const position = worldTransform(entity, this.world.entities).position
    const relative = { x: position.x - expected.x, y: position.y - expected.y }
    const cos = Math.cos(turn), sin = Math.sin(turn)
    const follow = { x: now.position.x + cos * relative.x - sin * relative.y - position.x, y: now.position.y + sin * relative.x + cos * relative.y - position.y }
    if (!Number.isFinite(follow.x) || !Number.isFinite(follow.y) || Math.hypot(follow.x, follow.y) > 4) return { x: 0, y: 0 }
    return Math.hypot(follow.x, follow.y) > 1e-9 ? follow : { x: 0, y: 0 }
  }

  private moveCharacters(fixedDelta: number): void {
    for (const entity of this.world.entities) {
      const character = entity.getComponent<CharacterBody2D>('CharacterBody2D')
      if (!entity.enabled || !character?.enabled || !entity.getCollider() || !entity.hasComponent('RigidBody2D')) { this.characterSupports.delete(entity.uuid); continue }
      const settings = { maxSlopeAngle: character.maxSlopeAngle * Math.PI / 180, stepHeight: character.stepHeight, floorSnap: character.floorSnap, maxSlides: character.maxSlides, safeMargin: character.safeMargin, collisionMask: character.collisionMask }
      // Refresh a moving support before carrying the character: source deletion,
      // masks, geometry or a changed velocity must take effect in this fixed tick.
      // 26.44: the same move first follows a floor moved by a script or an animation.
      const follow = this.supportFollow(entity, character, fixedDelta)
      const moving = character.applyPlatformVelocity && character.onFloor && (character.platformVelocity.x || character.platformVelocity.y)
      const probe = moving || follow.x || follow.y ? this.world.moveCharacterBox(entity, this.colliderSize(entity), follow, settings) : null
      const supported = probe ? probe.onFloor : character.onFloor
      const velocity = probe ? { x: probe.platformVelocity[0], y: probe.platformVelocity[1] } : character.platformVelocity
      const platform = character.applyPlatformVelocity && supported ? { x: velocity.x * fixedDelta, y: velocity.y * fixedDelta } : { x: 0, y: 0 }
      const requested = { x: character.requestedMotion.x + platform.x, y: character.requestedMotion.y + platform.y }
      const result = this.world.moveCharacterBox(entity, this.colliderSize(entity), requested, settings)
      if (result && probe) {
        result.appliedMotion[0] += probe.appliedMotion[0]; result.appliedMotion[1] += probe.appliedMotion[1]
        // Following a moved floor is a correction like a step lift, not velocity.
        const probeVelocity = follow.x || follow.y ? [0, 0] : probe.velocityMotion ?? [0, 0]
        if (result.velocityMotion) { result.velocityMotion[0] += probeVelocity[0]; result.velocityMotion[1] += probeVelocity[1] }
      }
      character.requestedMotion = { x: 0, y: 0 }
      if (!result) { this.characterSupports.delete(entity.uuid); continue }
      character.onFloor = result.onFloor; character.onWall = result.onWall; character.onCeiling = result.onCeiling
      character.floorNormal = { x: result.floorNormal[0], y: result.floorNormal[1] }
      character.wallNormal = { x: result.wallNormal[0], y: result.wallNormal[1] }
      character.ceilingNormal = { x: result.ceilingNormal[0], y: result.ceilingNormal[1] }
      character.platformVelocity = { x: result.platformVelocity[0], y: result.platformVelocity[1] }
      character.secondsSinceFloor = character.onFloor ? 0 : character.secondsSinceFloor + fixedDelta
      const support = result.onFloor ? this.world.entityForBodyHandle?.(result.floorHandle) ?? null : null
      character.floorEntity = support?.uuid ?? ''
      character.floorOneWay = Boolean(result.onFloor && result.floorOneWay)
      if (support) {
        const transform = worldTransform(support, this.world.entities), body = support.getComponent<RigidBody2D>('RigidBody2D')
        const moves = body && body.bodyType !== 'Static'
        this.characterSupports.set(entity.uuid, { support: support.uuid, x: transform.position.x, y: transform.position.y, rotation: transform.rotation, vx: moves ? finiteNumber(body.velocity.x) : 0, vy: moves ? finiteNumber(body.velocity.y) : 0, w: moves ? finiteNumber(body.angularVelocity) : 0 })
      } else this.characterSupports.delete(entity.uuid)
      // 26.43: velocity comes from the requested motion that was travelled. Step lifts and floor
      // snapping move the character but are not velocity; before 26.43 a 0.35 m step taken mid-air
      // became 42 m/s upward at 120 Hz and scripts reading rigid_body().velocity_y kept rising.
      const travelled = result.velocityMotion ?? result.appliedMotion
      character.motionVelocity = { x: travelled[0] / fixedDelta, y: travelled[1] / fixedDelta }
      // The query already committed the collision-safe transform. A solver velocity here
      // would integrate the kinematic body a second time during the same fixed tick.
      entity.velocity = { x: 0, y: 0 }
    }
  }

  canUseCoyoteTime(entity: Entity): boolean {
    const character = entity.getComponent<CharacterBody2D>('CharacterBody2D')
    return Boolean(character && (character.onFloor || character.secondsSinceFloor <= character.coyoteTime))
  }

  private areaMembers(entity: Entity, area: Area2D): Entity[] {
    const transform = worldTransform(entity, this.world.entities), center = transform.position
    const uuids = area.shape === 'Circle'
      ? this.world.overlapCircle(center, area.radius * Math.max(Math.abs(transform.scale.x), Math.abs(transform.scale.y)), area.collisionMask)
      : this.world.overlapBox(center, { x: area.size.x * Math.abs(transform.scale.x), y: area.size.y * Math.abs(transform.scale.y) }, transform.rotation, area.collisionMask)
    return uuids.flatMap(/** 结构说明（自动提取）：uuids.flatMap 回调；输入 uuid；直接调用 this.world.entities.find、candidate.hasComponent、candidate.getComponent。 */ uuid => { const candidate = this.world.entities.find(/* 比较 item.uuid 与 uuid，返回严格相等的判断结果。 */ item => item.uuid === uuid); return candidate && candidate !== entity && candidate.hasComponent('RigidBody2D') && candidate.getComponent<Area2D>('Area2D')?.monitorable !== false ? [candidate] : [] })
  }

  private applyAreaEffects(fixedDelta: number, emitSignal: (name: string, payload: unknown, target: string, source: string) => void): void {
    const areas = this.world.entities.flatMap(/** 结构说明（自动提取）：this.world.entities.flatMap 回调；输入 entity；直接调用 entity.getComponent。 */ entity => {
      const area = entity.getComponent<Area2D>('Area2D'), effector = entity.getComponent<AreaEffector2D>('AreaEffector2D')
      return entity.enabled && area?.enabled ? [{ entity, area, effector: effector?.enabled ? effector : null }] : []
    }).sort(/* 先计算 (a.effector?.priority ?? 0) - (b.effector?.priority ?? 0)；仅当其为假值时求右侧 a.entity.uuid.localeCompare(b.entity.uuid)，返回短路求值结果。 */ (a, b) => (a.effector?.priority ?? 0) - (b.effector?.priority ?? 0) || a.entity.uuid.localeCompare(b.entity.uuid))
    const liveAreas = new Set(areas.map(/* 返回 value.entity.uuid 的当前值。 */ value => value.entity.uuid))
    for (const [area, occupants] of this.areaOccupants) if (!liveAreas.has(area)) { for (const uuid of [...occupants].sort()) emitSignal('area.exited', { area }, uuid, area); this.areaOccupants.delete(area) }
    for (const { entity, area, effector } of areas) {
      const members = this.areaMembers(entity, area)
      const before = this.areaOccupants.get(entity.uuid) ?? new Set<string>(), current = new Set(members.map(/* 返回 member.uuid 的当前值。 */ member => member.uuid))
      for (const uuid of current) if (!before.has(uuid)) emitSignal('area.entered', { area: entity.uuid }, uuid, entity.uuid)
      for (const uuid of before) if (!current.has(uuid)) emitSignal('area.exited', { area: entity.uuid }, uuid, entity.uuid)
      this.areaOccupants.set(entity.uuid, current)
      for (const member of members) for (const effect of effector?.effectors.slice(0, 32) ?? []) {
        if (!effect.enabled) continue
        const directionLength = Math.hypot(effect.direction.x, effect.direction.y) || 1
        if (effect.kind === 'Gravity' || effect.kind === 'Wind') this.world.applyTransientForce(member, { x: effect.direction.x / directionLength * effect.strength * member.mass, y: effect.direction.y / directionLength * effect.strength * member.mass })
        else if (effect.kind === 'Drag') this.world.applyTransientForce(member, { x: -member.velocity.x * Math.max(0, effect.drag), y: -member.velocity.y * Math.max(0, effect.drag) })
        else if (effect.kind === 'Buoyancy') this.world.applyTransientForce(member, { x: 0, y: Math.max(0, effect.fluidDensity) * 9.80665 * member.mass })
        else if (effect.kind === 'Damage') emitSignal('area.damage', { amount: Math.max(0, effect.damagePerSecond) * fixedDelta, area: entity.uuid }, member.uuid, entity.uuid)
        else emitSignal(effect.signal || 'area.effect', { area: entity.uuid, strength: effect.strength }, member.uuid, entity.uuid)
      }
    }
  }

  private focusPosition(): { x: number; y: number } {
    const activeCamera = this.world.entities.find(/* 返回 entity.camera2D?.active 的当前值。 */ entity => entity.camera2D?.active)
    const focus = activeCamera ?? this.world.entities[0]
    return focus ? worldTransform(focus, this.world.entities).position : { x: 0, y: 0 }
  }

  private updatePortals(requestSceneLoad: (scene: string) => void, emitSignal: (name: string, payload: unknown, target: string, source: string) => void): void {
    const desiredPrefetch = new Set(this.world.entities.flatMap(/** 结构说明（自动提取）：this.world.entities.flatMap 回调；输入 entity；直接调用 entity.getComponent。 */ entity => { const portal = entity.getComponent<Portal2D>('Portal2D'); return entity.enabled && portal?.enabled && portal.preload && portal.targetSceneUuid ? [portal.targetSceneUuid] : [] }))
    for (const scene of this.prefetchedScenes) if (!desiredPrefetch.has(scene)) { this.prefetchedScenes.delete(scene); this.scheduleSceneStream(scene, false) }
    for (const scene of desiredPrefetch) if (!this.prefetchedScenes.has(scene)) { this.prefetchedScenes.add(scene); this.scheduleSceneStream(scene, true) }
    const travelers = this.world.entities.filter(/* 先计算 entity.enabled；仅当其为真值时求右侧 (entity.tags.includes('player') || entity.hasComponent('CharacterBody2D'))，返回短路求值结果。 */ entity => entity.enabled && (entity.tags.includes('player') || entity.hasComponent('CharacterBody2D')))
    for (const entity of this.world.entities) {
      const portal = entity.getComponent<Portal2D>('Portal2D')
      if (!entity.enabled || !portal?.enabled || !portal.targetSceneUuid) continue
      const center = worldTransform(entity, this.world.entities).position
      const traveler = travelers.find(/** 结构说明（自动提取）：travelers.find 回调；输入 candidate；直接调用 Math.hypot、worldTransform、Math.max、finiteNumber；返回表达式求值结果。 */ candidate => candidate !== entity && Math.hypot(worldTransform(candidate, this.world.entities).position.x - center.x, worldTransform(candidate, this.world.entities).position.y - center.y) <= Math.max(0.01, finiteNumber(portal.triggerRadius, 1)))
      if (!traveler) { this.activePortals.delete(entity.uuid); continue }
      if (this.activePortals.has(entity.uuid)) continue
      this.activePortals.add(entity.uuid)
      emitSignal('portal.entered', { portal: entity.uuid, targetScene: portal.targetSceneUuid, targetPortal: portal.targetPortal }, traveler.uuid, entity.uuid)
      this.portalArrival = { scene: portal.targetSceneUuid, portal: portal.targetPortal, traveler: traveler.uuid }
      requestSceneLoad(portal.targetSceneUuid)
      break
    }
  }

  private streamedScenes(): WorldGameplaySceneStreaming {
    return this.sceneStreaming ??= this.ports.createSceneStreaming({ world: this.world, lifecycle: this.streamLifecycle, streamingOwner: this.streamingOwner, origin: () => this.state.originOffset, activeSceneUuid: () => this.host.activeSceneUuid })
  }

  inspectStreamedScenes() { return this.sceneStreaming?.inspect() ?? [] }

  private scheduleSceneStream(uuid: string, loaded: boolean): void {
    if (!uuid || this.sceneStreamQueue.get(uuid) === loaded) return
    this.sceneStreamQueue.set(uuid, loaded); this.state.pendingStreams = this.sceneStreamQueue.size
    const generation = this.streamGeneration
    queueMicrotask(/** 结构说明（自动提取）：queueMicrotask 回调；无显式参数；直接调用 this.sceneStreamQueue.get、this.sceneStreamQueue.delete、setOwner、streamedScenes、String；写入 this.state.pendingStreams、this.state.lastError。 */ () => {
      if (generation !== this.streamGeneration || this.streamingOwner.isDisposed) return
      const value = this.sceneStreamQueue.get(uuid); this.sceneStreamQueue.delete(uuid); this.state.pendingStreams = this.sceneStreamQueue.size
      if (value !== undefined) { try { this.streamedScenes().setOwner('preload:' + uuid, uuid, value, false) } catch (error) { this.state.lastError = error instanceof Error ? error.message : String(error) } }
    })
  }

  private updateWorldStreaming(): void {
    const focus = this.focusPosition()
    this.ports.streaming.updateWorldStreaming(this.world.entities, focus, this.state.memoryBudgetMb, this.state.streamingEnabled, /* 调用 this.streamedScenes().setOwner(owner, sceneUuid, loaded, active) 并返回调用结果。 */ (sceneUuid, loaded, owner, active) => this.streamedScenes().setOwner(owner, sceneUuid, loaded, active))
    this.state.loadedChunks = this.ports.streaming.state.loaded
    this.state.usedMemoryMb = this.ports.streaming.state.memoryMb
    this.state.pendingStreams = this.ports.streaming.state.pending
    if (Math.hypot(focus.x, focus.y) >= this.state.originShiftThreshold) {
      try { this.shiftWorldOrigin(focus) } catch (error) { this.state.lastError = error instanceof Error ? error.message : String(error) }
    }
  }

  shiftWorldOrigin(offset: { x: number; y: number }): void {
    this.world.shiftOrigin(offset)
    this.characterSupports.clear()
    this.ports.navigation.shiftNavigationOrigin(offset, this.world.entities)
    this.ports.particles.shiftParticleOrigin(offset, this.world.entities)
    this.sceneStreaming?.shiftOrigin(offset)
    this.ports.streaming.shiftStreamingOrigin(offset)
    this.host.camera.offset.x += offset.x * this.host.camera.scale; this.host.camera.offset.y -= offset.y * this.host.camera.scale
    if (this.host.camera.targetOffset) { this.host.camera.targetOffset.x += offset.x * this.host.camera.scale; this.host.camera.targetOffset.y -= offset.y * this.host.camera.scale }
    this.state.originOffset.x += offset.x; this.state.originOffset.y += offset.y
    this.state.originShiftCount++; this.state.lastOriginShift = { ...offset }
  }

  async beginWorldGameplay(emitSignal: (name: string, payload: unknown, target: string, source: string) => void, isCurrent: () => boolean = /* 返回固定值 true。 */ () => true): Promise<void> {
    if (!isCurrent()) return
    // Reviewed local pools are synchronous: awake/start may spawn immediately.
    this.objectPoolOwner.setPoolSignalEmitter(/* 调用 emitSignal(name, null, entity.uuid, 'pool') 并返回调用结果。 */ (name, entity) => emitSignal(name, null, entity.uuid, 'pool'))
    if (this.ports.packages.objectPoolEnabled()) this.objectPoolOwner.prepareObjectPools()
    await this.ensureOptionalPackages()
    if (!isCurrent()) return
    if (this.aiModule) this.aiModule.setAiSignalEmitter(/** 结构说明（自动提取）：this.aiModule.setAiSignalEmitter 回调；输入 name、entity；直接调用 emitSignal。 */ (name, entity) => { if (name) emitSignal(name, null, entity.uuid, 'ai') })
  }

  beforeWorldPhysicsStep(fixedDelta: number, nowSeconds: number, frame: number, emitSignal: (name: string, payload: unknown, target: string, source: string) => void, requestSceneLoad: (scene: string) => void = /** 提供不执行额外操作的空回调，用于测试接口占位。 */ () => {}): void {
    this.moveCharacters(fixedDelta)
    this.applyAreaEffects(fixedDelta, emitSignal)
    this.ports.navigation.updateNavigation(this.world.entities, fixedDelta, nowSeconds)
    if (this.aiModule && this.ports.packages.aiEnabled()) this.aiModule.updateAi(this.world.entities, fixedDelta, frame)
    this.ports.evidence.captureSimulationEvidence(frame, this.world.entities, this.world.connections)
    if (this.ports.packages.objectPoolEnabled()) this.objectPoolOwner.updateObjectPools(nowSeconds)
    this.updateWorldStreaming()
    this.tileSceneOwner.updateTileSceneRuntime(this.world.entities, this.focusPosition())
    this.updatePortals(requestSceneLoad, emitSignal)
  }

  finishWorldSceneTransition(): void {
    this.streamGeneration++
    this.characterSupports.clear()
    this.sceneStreaming?.detachAfterSceneTransition(); this.sceneStreaming = null; this.sceneStreamQueue.clear(); this.state.pendingStreams = this.sceneStreamQueue.size; this.prefetchedScenes.clear(); this.activePortals.clear(); this.areaOccupants.clear(); this.ports.navigation.resetNavigation(); this.ports.streaming.resetWorldStreaming(true); this.tileSceneOwner.resetTileSceneRuntime(true)
    const arrival = this.portalArrival; this.portalArrival = null
    if (arrival?.portal && this.host.activeSceneUuid === arrival.scene) {
      const entities = this.world.entities, target = entities.find(/* 先计算 entity.enabled；仅当其为真值时求右侧 (entity.uuid === arrival.portal || entity.name === arrival.portal)，返回短路求值结果。 */ entity => entity.enabled && (entity.uuid === arrival.portal || entity.name === arrival.portal)), traveler = entities.find(/* 比较 entity.uuid 与 arrival.traveler，返回严格相等的判断结果。 */ entity => entity.uuid === arrival.traveler) ?? entities.find(/* 先计算 entity.enabled；仅当其为真值时求右侧 entity.tags.includes('player')，返回短路求值结果。 */ entity => entity.enabled && entity.tags.includes('player')) ?? entities.find(/* 先计算 entity.enabled；仅当其为真值时求右侧 entity.hasComponent('CharacterBody2D')，返回短路求值结果。 */ entity => entity.enabled && entity.hasComponent('CharacterBody2D'))
      if (!target || !traveler) { this.state.lastError = 'PORTAL_TARGET_MISSING: choose a destination entity UUID/name and an enabled player.'; return }
      setWorldTransform(traveler, { ...worldTransform(traveler, entities), position: { ...worldTransform(target, entities).position } }, entities); traveler.velocity = { x: 0, y: 0 }; this.activePortals.add(target.uuid)
    }
  }

  retireWorldGameplayEntity(uuid: string): void { this.aiModule?.retireAiEntity(uuid); this.characterSupports.delete(uuid) }

  resetWorldGameplay(): void {
    this.streamGeneration++
    this.characterSupports.clear()
    this.areaOccupants.clear(); this.sceneStreamQueue.clear(); this.prefetchedScenes.clear(); this.portalArrival = null; this.activePortals.clear(); this.ports.navigation.resetNavigation(); this.aiModule?.resetAi(); this.objectPoolOwner.resetObjectPools(); this.sceneStreaming?.reset(); this.sceneStreaming = null; this.ports.streaming.resetWorldStreaming(); this.tileSceneOwner.resetTileSceneRuntime()
    this.state.lastError = ''; this.state.loadedChunks = 0; this.state.usedMemoryMb = 0; this.state.pendingStreams = 0; this.state.originOffset = { x: 0, y: 0 }; this.state.originShiftCount = 0; this.state.lastOriginShift = { x: 0, y: 0 }; this.ports.evidence.clearSimulationEvidence()
  }

  navigationPaths(): readonly WorldGameplayNavigationDebugPath[] { return [...this.ports.navigation.navigationDebugPaths.values()] }

  tileSceneRuntimeSnapshot(): WorldGameplayTileState { return this.tileSceneOwner.state }
}
