/** 脚本动态对象支持：管理运行时对象值、引用及相关更新操作。 */
import { addEditorLog } from '../store/editor'
import { physicsState } from '../store/physics'
import type { Entity } from '../world/Entity'
import type { ComponentKind, ProgressBar, Slider, Checkbox, Text as UIText, TextRenderer2D } from '../world/components'
import { STABLE_COMPONENT_KINDS } from '../world/componentRegistry'
import { finiteNumber, normalizeEntity } from '../world/geometry'
import { setWorldTransform, worldTransform } from '../world/hierarchy'
import { acquirePooled, hasObjectPool } from './objectPool'
import { instantiatePrefab } from './prefabs'
import { initializeGameplayEntities } from './gameplayComponents'
import { entityLifetimeActive, entityLifetimeGeneration } from './entityLifetimes'

export interface RuntimeEntityHandle { id: string; generation: number }
export interface RuntimeEntitySnapshot { uuid: string; generation: number; name: string; enabled: boolean; tags: string[]; groups: string[]; components: string[]; position: [number, number] }
export interface PendingEntityResolution { uuid: string; generation: number }
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

/** 将句柄字符串编码为 UTF-8 并计算稳定的无符号代次摘要。 */ export function runtimeHandleGeneration(id: string): number {
  let hash = 2_166_136_261 >>> 0
  for (const byte of new TextEncoder().encode(id)) hash = (Math.imul(hash, 16_777_619) ^ byte) >>> 0
  return hash
}

/** 筛选有效生命周期实体，生成有数量上限的稳定身份、代次、组件与世界位置快照。 */ export function runtimeSceneEntitySnapshots(entities: readonly Entity[]): RuntimeEntitySnapshot[] {
  return entities.filter(entityLifetimeActive).slice(0, 100_000).map(/** 读取实体世界坐标并复制标签、分组和组件类型到动态脚本快照。 */ entity => {
    const position = worldTransform(entity, entities).position
    return { uuid: entity.uuid, generation: entityLifetimeGeneration(entity), name: entity.name, enabled: entity.enabled, tags: [...entity.tags], groups: [...entity.groups], components: entity.components.map(/* 返回 component.kind 的当前值。 */ component => component.kind), position: [position.x, position.y] }
  })
}

/** 优先从对象池获取预制体，容量不足拒绝生成；应用世界变换并初始化临时运行实体。 */ export function spawnRuntimePrefab(reference: string, transform: SpawnTransform, invalidateRuntime = true): Entity | null {
  const clean = reference.trim().slice(0, 512)
  if (!clean) return null
  const position = { x: finiteNumber(transform.position.x), y: finiteNumber(transform.position.y) }
  const pooled = acquirePooled(clean, position)
  if (!pooled && hasObjectPool(clean)) { addEditorLog(`Object pool capacity unavailable for ${clean}; spawn was refused.`, 'Runtime', 'warning'); return null }
  const values = pooled ?? instantiatePrefab(clean, position, false, invalidateRuntime)
  if (!values.length) return null
  const roots = values.filter(/** 识别本次生成集合中没有内部父节点的根实体。 */ entity => !entity.parentUuid || !values.some(/* 比较 candidate.uuid 与 entity.parentUuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === entity.parentUuid))
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

/** 解析延迟身份映射并校验当前实体生命周期代次，拒绝过期句柄并记录错误。 */ export function resolveRuntimeHandle(handle: RuntimeEntityHandle, pending: ReadonlyMap<string, PendingEntityResolution>): Entity | null {
  const resolution = pending.get(handle.id), resolved = resolution?.uuid ?? handle.id
  const entity = physicsState.world.entities.find(/* 比较 candidate.uuid 与 resolved，返回严格相等的判断结果。 */ candidate => candidate.uuid === resolved)
  const generation = resolution ? runtimeHandleGeneration(handle.id) : entity ? entityLifetimeGeneration(entity) : 0
  if (!entity || !entityLifetimeActive(entity) || generation !== (Math.round(handle.generation) >>> 0) || resolution && resolution.generation !== entityLifetimeGeneration(entity)) {
    addEditorLog(`Stale entity handle rejected: ${handle.id || '<empty>'}`, 'Runtime', 'error')
    return null
  }
  return entity
}

/* 调用 value.trim().slice(0, 80) 并返回调用结果。 */ function cleanMember(value: string): string { return value.trim().slice(0, 80) }
/** 清理标签或分组文本，在容量内按启用状态增删唯一成员。 */ function toggleMember(values: string[], value: string, enabled: boolean): void {
  const clean = cleanMember(value); if (!clean) return
  const index = values.indexOf(clean)
  if (enabled && index < 0 && values.length < 32) values.push(clean)
  else if (!enabled && index >= 0) values.splice(index, 1)
}

/** 按动态命令修改实体变换、启用、界面值或成员，验证组件可用性并按需重建物理运行时。 */ export function applyTargetMutation(entity: Entity, mutation: TargetMutation): boolean {
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
