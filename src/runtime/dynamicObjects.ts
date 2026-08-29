import { addEditorLog } from '../store/editor'
import { physicsState } from '../store/physics'
import type { Entity } from '../world/Entity'
import type { ComponentKind, ProgressBar, Slider, Checkbox, Text as UIText, TextRenderer2D } from '../world/components'
import { STABLE_COMPONENT_KINDS } from '../world/componentRegistry'
import { finiteNumber, normalizeEntity } from '../world/geometry'
import { setWorldTransform, worldTransform } from '../world/hierarchy'
import { acquirePooled } from './objectPool'
import { instantiatePrefab } from './prefabs'
import { initializeGameplayEntities } from './gameplayComponents'

export interface RuntimeEntityHandle { id: string; generation: number }
export interface RuntimeEntitySnapshot { uuid: string; name: string; enabled: boolean; tags: string[]; groups: string[]; components: string[]; position: [number, number] }
export interface SpawnTransform { position: { x: number; y: number }; rotation: number; scale: { x: number; y: number } }

export type TargetMutation =
  | { type: 'position'; x: number; y: number }
  | { type: 'rotation'; radians: number }
  | { type: 'scale'; x: number; y: number }
  | { type: 'enabled'; enabled: boolean }
  | { type: 'componentEnabled'; component: string; enabled: boolean }
  | { type: 'uiText'; text: string }
  | { type: 'uiValue'; value: number }
  | { type: 'addTag' | 'removeTag'; value: string }
  | { type: 'addGroup' | 'removeGroup'; value: string }

export function runtimeHandleGeneration(id: string): number {
  let hash = 2_166_136_261 >>> 0
  for (const byte of new TextEncoder().encode(id)) hash = (Math.imul(hash, 16_777_619) ^ byte) >>> 0
  return hash
}

export function runtimeSceneEntitySnapshots(entities: readonly Entity[]): RuntimeEntitySnapshot[] {
  return entities.slice(0, 100_000).map(entity => {
    const position = worldTransform(entity, entities).position
    return { uuid: entity.uuid, name: entity.name, enabled: entity.enabled, tags: [...entity.tags], groups: [...entity.groups], components: entity.components.map(component => component.kind), position: [position.x, position.y] }
  })
}

export function spawnRuntimePrefab(reference: string, transform: SpawnTransform, invalidateRuntime = true): Entity | null {
  const clean = reference.trim().slice(0, 512)
  if (!clean) return null
  const position = { x: finiteNumber(transform.position.x), y: finiteNumber(transform.position.y) }
  const pooled = acquirePooled(clean, position)
  const values = pooled ?? instantiatePrefab(clean, position, false, invalidateRuntime)
  if (!values.length) return null
  const roots = values.filter(entity => !entity.parentUuid || !values.some(candidate => candidate.uuid === entity.parentUuid))
  const root = roots[0] ?? values[0]
  const current = worldTransform(root, physicsState.world.entities)
  setWorldTransform(root, {
    ...current,
    position,
    rotation: finiteNumber(transform.rotation),
    scale: {
      x: Math.sign(finiteNumber(transform.scale.x, 1) || 1) * Math.max(1e-9, Math.abs(finiteNumber(transform.scale.x, 1))),
      y: Math.sign(finiteNumber(transform.scale.y, 1) || 1) * Math.max(1e-9, Math.abs(finiteNumber(transform.scale.y, 1)))
    }
  }, physicsState.world.entities)
  root.ownership = 'Runtime'
  root.runtimePersistence = 'Transient'
  for (const entity of values) { entity.ownership = 'Runtime'; entity.runtimePersistence = 'Transient' }
  initializeGameplayEntities(values)
  if (invalidateRuntime && pooled) physicsState.world.invalidateRuntime()
  return root
}

export function resolveRuntimeHandle(handle: RuntimeEntityHandle, pending: ReadonlyMap<string, string>): Entity | null {
  const resolved = pending.get(handle.id) ?? handle.id
  if (!resolved || runtimeHandleGeneration(handle.id) !== (Math.round(handle.generation) >>> 0)) {
    addEditorLog(`Stale entity handle rejected: ${handle.id || '<empty>'}`, 'Runtime', 'error')
    return null
  }
  const entity = physicsState.world.entities.find(candidate => candidate.uuid === resolved)
  if (!entity) addEditorLog(`Stale entity handle rejected: ${handle.id}`, 'Runtime', 'error')
  return entity ?? null
}

function cleanMember(value: string): string { return value.trim().slice(0, 80) }
function toggleMember(values: string[], value: string, enabled: boolean): void {
  const clean = cleanMember(value); if (!clean) return
  const index = values.indexOf(clean)
  if (enabled && index < 0 && values.length < 32) values.push(clean)
  else if (!enabled && index >= 0) values.splice(index, 1)
}

export function applyTargetMutation(entity: Entity, mutation: TargetMutation): boolean {
  let physicsChanged = false
  if (mutation.type === 'position') { const transform = worldTransform(entity, physicsState.world.entities); setWorldTransform(entity, { ...transform, position: { x: finiteNumber(mutation.x), y: finiteNumber(mutation.y) } }, physicsState.world.entities); physicsChanged = true }
  else if (mutation.type === 'rotation') { const transform = worldTransform(entity, physicsState.world.entities); setWorldTransform(entity, { ...transform, rotation: finiteNumber(mutation.radians) }, physicsState.world.entities); physicsChanged = true }
  else if (mutation.type === 'scale') { const transform = worldTransform(entity, physicsState.world.entities); setWorldTransform(entity, { ...transform, scale: { x: Math.sign(mutation.x || 1) * Math.max(1e-9, Math.abs(finiteNumber(mutation.x, 1))), y: Math.sign(mutation.y || 1) * Math.max(1e-9, Math.abs(finiteNumber(mutation.y, 1))) } }, physicsState.world.entities); physicsChanged = true }
  else if (mutation.type === 'enabled') { entity.enabled = mutation.enabled; physicsChanged = true }
  else if (mutation.type === 'componentEnabled') {
    if (!STABLE_COMPONENT_KINDS.includes(mutation.component as ComponentKind)) { addEditorLog(`Unknown component kind rejected: ${mutation.component}`, 'Runtime', 'error'); return false }
    const component = entity.getComponent(mutation.component as ComponentKind, true)
    if (!component || component.removed) { addEditorLog(`${entity.name}: component not found: ${mutation.component}`, 'Runtime', 'error'); return false }
    component.enabled = mutation.enabled
    physicsChanged = true
  } else if (mutation.type === 'uiText') {
    const text = entity.getComponent<UIText>('Text') ?? entity.getComponent<TextRenderer2D>('TextRenderer2D')
    if (!text) { addEditorLog(`${entity.name}: targeted UI text requires Text or TextRenderer2D`, 'Runtime', 'error'); return false }
    text.text = mutation.text.slice(0, 16_384)
  } else if (mutation.type === 'uiValue') {
    const value = finiteNumber(mutation.value), slider = entity.getComponent<Slider>('Slider'), progress = entity.getComponent<ProgressBar>('ProgressBar'), checkbox = entity.getComponent<Checkbox>('Checkbox')
    if (slider) slider.value = Math.min(slider.max, Math.max(slider.min, value))
    else if (progress) progress.value = Math.min(progress.max, Math.max(progress.min, value))
    else if (checkbox) checkbox.checked = value >= .5
    else { addEditorLog(`${entity.name}: targeted UI value requires Slider, ProgressBar, or Checkbox`, 'Runtime', 'error'); return false }
  } else if (mutation.type === 'addTag' || mutation.type === 'removeTag') toggleMember(entity.tags, mutation.value, mutation.type === 'addTag')
  else toggleMember(entity.groups, mutation.value, mutation.type === 'addGroup')
  normalizeEntity(entity)
  if (physicsChanged) physicsState.world.invalidateRuntime()
  return true
}
