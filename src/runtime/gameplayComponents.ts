import { reactive } from 'vue'
import type { Entity } from '../world/Entity'
import type {
  CameraFollow2D, CharacterBody2D, Collectible2D, Cooldown2D, DamageHitbox2D, GridMover2D, Health2D,
  Lifetime2D, MouseFollower2D, PlatformController2D, Projectile2D, Spawner2D, TopDownController2D
} from '../world/components'
import type { RuntimePhysicsEvent } from '../world/World'
import { finiteNumber } from '../world/geometry'
import { setWorldTransform, worldTransform } from '../world/hierarchy'
import type { InputSnapshot } from './input'
import { addRuntimeScore } from './gameFlow'

type Emit = (name: string, payload: unknown, target: string, source: string) => void
type Spawn = (prefab: string, entity: Entity) => Entity | null
type Remove = (entity: Entity, despawn: boolean) => void

export const gameplayComponentDiagnostics = reactive({ controllers: 0, spawns: 0, damageEvents: 0, collections: 0, expired: 0, lastError: '' })
const verticalVelocity = new Map<string, number>()
const hitCooldowns = new Map<string, number>()

function approach(value: number, target: number, maximumDelta: number): number { return value < target ? Math.min(target, value + maximumDelta) : Math.max(target, value - maximumDelta) }
function normalized(x: number, y: number): { x: number; y: number } { const length = Math.hypot(x, y); return length > 1e-9 ? { x: x / length, y: y / length } : { x: 0, y: 0 } }

export function initializeGameplayEntities(entities: readonly Entity[]): void {
  for (const entity of entities) {
    const health = entity.getComponent<Health2D>('Health2D'); if (health) { health.current = Math.min(health.maximum, Math.max(0, finiteNumber(health.current, health.maximum))); health.runtimeInvulnerability = 0 }
    const cooldown = entity.getComponent<Cooldown2D>('Cooldown2D'); if (cooldown) { cooldown.runtimeRemaining = cooldown.autoStart ? cooldown.duration : 0; cooldown.runtimeReady = !cooldown.autoStart }
    const lifetime = entity.getComponent<Lifetime2D>('Lifetime2D'); if (lifetime) lifetime.runtimeRemaining = lifetime.seconds
    const spawner = entity.getComponent<Spawner2D>('Spawner2D'); if (spawner) { spawner.runtimeRemaining = spawner.initialDelay; spawner.runtimeStarted = spawner.autoStart; spawner.runtimeSpawned = [] }
    const projectile = entity.getComponent<Projectile2D>('Projectile2D'); if (projectile) { const direction = normalized(projectile.direction.x, projectile.direction.y); entity.velocity = { x: direction.x * projectile.speed, y: direction.y * projectile.speed }; projectile.runtimeLifetime = Math.max(0, projectile.lifetime) }
  }
}

export function beginGameplayComponents(entities: readonly Entity[]): void {
  verticalVelocity.clear(); hitCooldowns.clear(); gameplayComponentDiagnostics.controllers = 0; gameplayComponentDiagnostics.spawns = 0; gameplayComponentDiagnostics.damageEvents = 0; gameplayComponentDiagnostics.collections = 0; gameplayComponentDiagnostics.expired = 0; gameplayComponentDiagnostics.lastError = ''
  initializeGameplayEntities(entities)
}

export function updateGameplayComponents(entities: readonly Entity[], input: InputSnapshot, fixedDelta: number, emit: Emit, spawn: Spawn, remove: Remove): void {
  const dt = Math.min(.25, Math.max(0, finiteNumber(fixedDelta)))
  gameplayComponentDiagnostics.controllers = 0
  for (const [key, remaining] of [...hitCooldowns]) if (remaining <= dt) hitCooldowns.delete(key); else hitCooldowns.set(key, remaining - dt)
  for (const entity of entities) {
    if (!entity.enabled) continue
    const health = entity.getComponent<Health2D>('Health2D'); if (health?.enabled) health.runtimeInvulnerability = Math.max(0, health.runtimeInvulnerability - dt)
    const mouseFollower = entity.getComponent<MouseFollower2D>('MouseFollower2D')
    if (mouseFollower?.enabled && dt > 0) {
      const pointerInsideViewport = input.viewportSize[0] > 0 && input.viewportSize[1] > 0
        && input.mousePosition[0] >= 0 && input.mousePosition[0] <= input.viewportSize[0]
        && input.mousePosition[1] >= 0 && input.mousePosition[1] <= input.viewportSize[1]
      if (!pointerInsideViewport) {
        if (entity.hasComponent('RigidBody2D')) entity.velocity = { x: 0, y: 0 }
        continue
      }
      const transform = worldTransform(entity, entities)
      const difference = {
        x: input.mouseWorldPosition[0] + mouseFollower.offset.x - transform.position.x,
        y: input.mouseWorldPosition[1] + mouseFollower.offset.y - transform.position.y
      }
      let velocity = { x: difference.x / dt, y: difference.y / dt }
      const speed = Math.hypot(velocity.x, velocity.y)
      if (mouseFollower.maximumSpeed > 0 && speed > mouseFollower.maximumSpeed) {
        const scale = mouseFollower.maximumSpeed / speed
        velocity = { x: velocity.x * scale, y: velocity.y * scale }
      }
      if (entity.hasComponent('RigidBody2D')) entity.velocity = velocity
      else setWorldTransform(entity, { ...transform, position: { x: transform.position.x + velocity.x * dt, y: transform.position.y + velocity.y * dt } }, entities)
      gameplayComponentDiagnostics.controllers++
    }
    const grid = entity.getComponent<GridMover2D>('GridMover2D'); if (grid?.enabled) {
      grid.runtimeCooldown = Math.max(0, grid.runtimeCooldown - dt)
      const vector = input.vectors[grid.action] ?? [0, 0], trigger = input.performed[grid.action] || input.pressed[grid.action] || grid.repeatDelay > 0 && input.down[grid.action] && grid.runtimeCooldown <= 0
      if (trigger && grid.runtimeCooldown <= 0 && (vector[0] || vector[1])) {
        let direction = normalized(vector[0], vector[1]); if (!grid.allowDiagonal && direction.x && direction.y) direction = Math.abs(direction.x) >= Math.abs(direction.y) ? { x: Math.sign(direction.x), y: 0 } : { x: 0, y: Math.sign(direction.y) }
        const transform = worldTransform(entity, entities), angle = grid.localSpace ? transform.rotation : 0, x = direction.x * Math.cos(angle) - direction.y * Math.sin(angle), y = direction.x * Math.sin(angle) + direction.y * Math.cos(angle)
        setWorldTransform(entity, { ...transform, position: { x: transform.position.x + Math.round(x) * grid.cellSize.x, y: transform.position.y + Math.round(y) * grid.cellSize.y } }, entities); grid.runtimeCooldown = grid.repeatDelay; gameplayComponentDiagnostics.controllers++
      }
    }
    const platform = entity.getComponent<PlatformController2D>('PlatformController2D'), character = entity.getComponent<CharacterBody2D>('CharacterBody2D')
    if (platform?.enabled && character?.enabled) {
      const horizontal = Math.min(1, Math.max(-1, input.axes[platform.moveAction] ?? 0)), control = character.onFloor ? 1 : platform.airControl
      character.motionVelocity.x = approach(character.motionVelocity.x, horizontal * platform.speed, platform.acceleration * control * dt)
      let vertical = verticalVelocity.get(entity.uuid) ?? 0
      if (character.onFloor && vertical < 0) vertical = 0
      if (input.performed[platform.jumpAction] || input.pressed[platform.jumpAction]) { if (character.onFloor || character.secondsSinceFloor <= character.coyoteTime) vertical = platform.jumpImpulse }
      vertical = Math.max(-platform.maximumFallSpeed, vertical - 9.80665 * dt); verticalVelocity.set(entity.uuid, vertical)
      character.requestedMotion.x += character.motionVelocity.x * dt; character.requestedMotion.y += vertical * dt; gameplayComponentDiagnostics.controllers++
    }
    const topDown = entity.getComponent<TopDownController2D>('TopDownController2D')
    if (topDown?.enabled && character?.enabled) {
      const vector = input.vectors[topDown.moveAction] ?? [0, 0], direction = normalized(vector[0], vector[1])
      character.motionVelocity.x = approach(character.motionVelocity.x, direction.x * topDown.speed, topDown.acceleration * dt); character.motionVelocity.y = approach(character.motionVelocity.y, direction.y * topDown.speed, topDown.acceleration * dt)
      character.requestedMotion.x += character.motionVelocity.x * dt; character.requestedMotion.y += character.motionVelocity.y * dt
      if (topDown.rotateToMovement && (direction.x || direction.y)) { const transform = worldTransform(entity, entities); setWorldTransform(entity, { ...transform, rotation: Math.atan2(direction.y, direction.x) }, entities) }
      gameplayComponentDiagnostics.controllers++
    }
    const projectile = entity.getComponent<Projectile2D>('Projectile2D')
    if (projectile?.enabled && !entity.hasComponent('Lifetime2D')) { projectile.runtimeLifetime -= dt; if (projectile.runtimeLifetime <= 0) { remove(entity, true); gameplayComponentDiagnostics.expired++; continue } }
    const cooldown = entity.getComponent<Cooldown2D>('Cooldown2D')
    if (cooldown?.enabled && !cooldown.runtimeReady) { cooldown.runtimeRemaining = Math.max(0, cooldown.runtimeRemaining - dt); if (cooldown.runtimeRemaining <= 0) { cooldown.runtimeReady = true; emit(cooldown.readySignal, { entity: entity.uuid }, entity.uuid, entity.uuid) } }
    const lifetime = entity.getComponent<Lifetime2D>('Lifetime2D')
    if (lifetime?.enabled) { lifetime.runtimeRemaining -= dt; if (lifetime.runtimeRemaining <= 0) { remove(entity, lifetime.useDespawn); gameplayComponentDiagnostics.expired++; continue } }
    const spawner = entity.getComponent<Spawner2D>('Spawner2D')
    if (spawner?.enabled && spawner.runtimeStarted && spawner.prefabAsset) {
      spawner.runtimeSpawned = spawner.runtimeSpawned.filter(uuid => entities.some(candidate => candidate.uuid === uuid && candidate.enabled))
      spawner.runtimeRemaining -= dt
      if (spawner.runtimeRemaining <= 0 && spawner.runtimeSpawned.length < spawner.maximumAlive) {
        const count = Math.min(spawner.burst, spawner.maximumAlive - spawner.runtimeSpawned.length)
        for (let index = 0; index < count; index++) { const created = spawn(spawner.prefabAsset, entity); if (!created) { gameplayComponentDiagnostics.lastError = `Spawner ${entity.name} could not resolve ${spawner.prefabAsset}`; break }; spawner.runtimeSpawned.push(created.uuid); gameplayComponentDiagnostics.spawns++ }
        spawner.runtimeRemaining += Math.max(.000001, spawner.interval)
      }
    }
    const follow = entity.getComponent<CameraFollow2D>('CameraFollow2D')
    if (follow?.enabled && entity.camera2D) {
      const target = entities.find(candidate => candidate.uuid === follow.targetUuid) ?? entities.find(candidate => candidate.tags.includes(follow.targetTag)); if (!target) continue
      const transform = worldTransform(entity, entities), targetTransform = worldTransform(target, entities), desired = { x: targetTransform.position.x + follow.offset.x, y: targetTransform.position.y + follow.offset.y }, difference = { x: desired.x - transform.position.x, y: desired.y - transform.position.y }, alpha = follow.smoothing <= 0 ? 1 : 1 - Math.exp(-follow.smoothing * dt)
      const next = { x: follow.followX && Math.abs(difference.x) > follow.deadZone.x ? transform.position.x + difference.x * alpha : transform.position.x, y: follow.followY && Math.abs(difference.y) > follow.deadZone.y ? transform.position.y + difference.y * alpha : transform.position.y }
      setWorldTransform(entity, { ...transform, position: next }, entities)
    }
  }
}

function applyDamage(source: Entity, target: Entity, damage: number, knockback: number, signal: string, cooldown: number, emit: Emit, remove: Remove, destroySource: boolean): boolean {
  const health = target.getComponent<Health2D>('Health2D'); if (!health?.enabled || health.runtimeInvulnerability > 0 || damage <= 0) return false
  const key = `${source.uuid}:${target.uuid}`; if (hitCooldowns.has(key)) return false; hitCooldowns.set(key, Math.max(0, cooldown))
  health.current = Math.max(0, health.current - damage); health.runtimeInvulnerability = health.invulnerabilitySeconds; gameplayComponentDiagnostics.damageEvents++
  const from = worldTransform(source, [source, target]).position, to = worldTransform(target, [source, target]).position, direction = normalized(to.x - from.x, to.y - from.y)
  if (knockback > 0 && target.hasComponent('RigidBody2D') && target.mass > 0) { target.velocity.x += direction.x * knockback / target.mass; target.velocity.y += direction.y * knockback / target.mass }
  const primarySignal = signal || health.damagedSignal, payload = { amount: damage, remaining: health.current, source: source.uuid }
  emit(primarySignal, payload, target.uuid, source.uuid)
  if (health.damagedSignal && health.damagedSignal !== primarySignal) emit(health.damagedSignal, payload, target.uuid, source.uuid)
  if (health.current <= 0) { emit(health.diedSignal, { source: source.uuid }, target.uuid, source.uuid); if (health.destroyOnZero) remove(target, true) }
  if (destroySource) remove(source, true)
  return true
}

export function processGameplayContacts(events: readonly RuntimePhysicsEvent[], entities: readonly Entity[], emit: Emit, remove: Remove): void {
  for (const event of events) {
    if (!['collisionStarted', 'triggerEntered'].includes(event.type) || !event.firstEntityUuid || !event.secondEntityUuid) continue
    const first = entities.find(entity => entity.uuid === event.firstEntityUuid), second = entities.find(entity => entity.uuid === event.secondEntityUuid); if (!first || !second) continue
    for (const [source, target] of [[first, second], [second, first]] as const) {
      const hitbox = source.getComponent<DamageHitbox2D>('DamageHitbox2D'), projectile = source.getComponent<Projectile2D>('Projectile2D')
      if (hitbox?.enabled && (!hitbox.targetTag || target.tags.includes(hitbox.targetTag))) applyDamage(source, target, hitbox.damage, hitbox.knockback, hitbox.hitSignal, hitbox.hitCooldown, emit, remove, hitbox.destroyOnHit)
      if (projectile?.enabled && target.uuid !== projectile.ownerUuid) {
        applyDamage(source, target, projectile.damage, 0, 'projectile.hit', .05, emit, remove, false)
        if (projectile.destroyOnImpact) remove(source, true)
      }
      const collectible = source.getComponent<Collectible2D>('Collectible2D')
      if (collectible?.enabled && (!collectible.collectorTag || target.tags.includes(collectible.collectorTag))) { addRuntimeScore(collectible.score); emit(collectible.collectedSignal, { score: collectible.score, collector: target.uuid }, target.uuid, source.uuid); gameplayComponentDiagnostics.collections++; if (collectible.destroyOnCollect) remove(source, true) }
    }
  }
}
