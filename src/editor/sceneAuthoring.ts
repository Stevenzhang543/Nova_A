/** 场景编辑约定：规范场景设置与对象所有权，检查场景数据并求值数值编辑表达式。 */
import { toRaw } from 'vue'
import type { Entity } from '../world/Entity'
import type { ComponentKind } from '../world/components'
import { componentDescriptor } from '../world/componentRegistry'

export type EntityOwnership = 'Scene' | 'Prefab' | 'Runtime'
export type RuntimePersistencePolicy = 'Scene' | 'Session' | 'SaveGame' | 'Transient'
export type SceneValidationState = 'valid' | 'warning' | 'error'
export type SceneExternalState = 'clean' | 'changed' | 'conflict'

export interface NamedSceneLayer {
  id: number
  name: string
  visible: boolean
  locked: boolean
}

export interface SceneAuthoringSettings {
  sceneVersion: 2
  templateId: string | null
  templateVersion: number
  inheritanceSourceUuid: string | null
  tags: string[]
  namedLayers: NamedSceneLayer[]
  runtimePolicy: 'Replace' | 'Additive' | 'Overlay'
}

export interface AuthoringValidationIssue {
  severity: 'error' | 'warning'
  code: string
  entityUuid: string
  component: ComponentKind | null
  message: string
  fix: 'add-dependency' | 'remove-conflict' | 'repair-parent' | 'repair-identity' | 'none'
}

export interface ComponentAuthoringRule {
  required: ComponentKind[]
  conflicts: ComponentKind[]
  documentation: string
  allowMultiple: boolean
}

const componentRules: Partial<Record<ComponentKind, Omit<ComponentAuthoringRule, 'documentation' | 'allowMultiple'>>> = {
  CharacterBody2D: { required: ['RigidBody2D'], conflicts: [] },
  PlatformController2D: { required: ['CharacterBody2D'], conflicts: ['TopDownController2D'] },
  TopDownController2D: { required: ['CharacterBody2D'], conflicts: ['PlatformController2D'] },
  MouseFollower2D: { required: ['RigidBody2D'], conflicts: [] },
  DamageHitbox2D: { required: ['RigidBody2D'], conflicts: [] },
  Projectile2D: { required: ['RigidBody2D'], conflicts: [] },
  AreaEffector2D: { required: ['Area2D'], conflicts: [] },
  Area2D: { required: [], conflicts: [] },
  Button: { required: ['RectTransform'], conflicts: [] },
  Slider: { required: ['RectTransform'], conflicts: [] },
  ProgressBar: { required: ['RectTransform'], conflicts: [] },
  Checkbox: { required: ['RectTransform'], conflicts: [] },
  TextInput: { required: ['RectTransform'], conflicts: [] },
  Panel: { required: ['RectTransform'], conflicts: [] },
  Image: { required: ['RectTransform'], conflicts: [] },
  Text: { required: ['RectTransform'], conflicts: [] },
  Canvas: { required: [], conflicts: ['RigidBody2D'] },
  Camera2D: { required: [], conflicts: [] },
  AudioListener: { required: [], conflicts: [] }
}

/** 组合组件依赖、冲突、文档锚点与多实例规则，所有关节统一要求刚体。 */ export function componentAuthoringRule(kind: ComponentKind): ComponentAuthoringRule {
  const descriptor = componentDescriptor(kind)
  const rule = componentRules[kind]
  const required = kind.endsWith('Joint2D') ? ['RigidBody2D'] as ComponentKind[] : [...(rule?.required ?? [])]
  return {
    required,
    conflicts: [...(rule?.conflicts ?? [])],
    documentation: `manual/index.html#component-${kind.toLocaleLowerCase()}`,
    allowMultiple: descriptor?.unique === false
  }
}

/** 生成场景作者设置默认值，首场景关联空白二维模板并创建可见世界层。 */ export function defaultSceneAuthoringSettings(index = 0): SceneAuthoringSettings {
  return {
    sceneVersion: 2,
    templateId: index === 0 ? 'empty-2d' : null,
    templateVersion: 1,
    inheritanceSourceUuid: null,
    tags: [],
    namedLayers: [{ id: 1, name: 'World', visible: true, locked: false }],
    runtimePolicy: 'Replace'
  }
}

/** 从字符串数组中清理首尾空白、去重并限制名称数量。 */ function cleanNames(source: unknown, maximum = 32): string[] {
  return Array.isArray(source)
    ? [...new Set(source.filter(/* 比较 typeof item 与 'string'，返回严格相等的判断结果。 */ (item): item is string => typeof item === 'string').map(/* 调用 item.trim() 并返回调用结果。 */ item => item.trim()).filter(Boolean))].slice(0, maximum)
    : []
}

/** 规范化场景模板、继承、标签及命名层，按层标识去重排序并补齐默认设置。 */ export function normalizeSceneAuthoringSettings(source: unknown, index = 0): SceneAuthoringSettings {
  const fallback = defaultSceneAuthoringSettings(index)
  if (!source || typeof source !== 'object' || Array.isArray(source)) return fallback
  const value = source as Record<string, unknown>
  const layers = Array.isArray(value.namedLayers) ? value.namedLayers.flatMap(/** 保留具有正安全整数标识的命名层，限制名称并规范化可见与锁定状态。 */ (raw): NamedSceneLayer[] => {
    if (!raw || typeof raw !== 'object') return []
    const layer = raw as Record<string, unknown>, id = Number(layer.id)
    if (!Number.isSafeInteger(id) || id < 1) return []
    return [{ id, name: String(layer.name ?? `Layer ${id}`).trim().slice(0, 80) || `Layer ${id}`, visible: layer.visible !== false, locked: layer.locked === true }]
  }) : []
  const uniqueLayers = [...new Map(layers.map(/* 返回按声明顺序构造的数组 [layer.id, layer]。 */ layer => [layer.id, layer])).values()].sort(/* 计算表达式 a.id - b.id 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a.id - b.id)
  const runtimePolicy = value.runtimePolicy === 'Additive' || value.runtimePolicy === 'Overlay' ? value.runtimePolicy : 'Replace'
  return {
    sceneVersion: 2,
    templateId: typeof value.templateId === 'string' && value.templateId.trim() ? value.templateId.trim().slice(0, 100) : fallback.templateId,
    templateVersion: Math.max(1, Math.min(1_000_000, Math.trunc(Number(value.templateVersion) || 1))),
    inheritanceSourceUuid: typeof value.inheritanceSourceUuid === 'string' ? value.inheritanceSourceUuid.toLowerCase() : null,
    tags: cleanNames(value.tags),
    namedLayers: uniqueLayers.length ? uniqueLayers : fallback.namedLayers,
    runtimePolicy
  }
}

/** 检查实体身份、父对象、组件依赖冲突与所有权持久化组合，返回可定位的修复建议。 */ export function validateEntityAuthoring(entity: Entity, entities: Entity[]): AuthoringValidationIssue[] {
  entity = toRaw(entity)
  entities = toRaw(entities)
  const issues: AuthoringValidationIssue[] = []
  const add = /* 调用 issues.push({ severity, code, entityUuid: entity.uuid, component, message, fix }) 并返回调用结果。 */ (severity: AuthoringValidationIssue['severity'], code: string, component: ComponentKind | null, message: string, fix: AuthoringValidationIssue['fix']) => issues.push({ severity, code, entityUuid: entity.uuid, component, message, fix })
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(entity.uuid)) add('error', 'identity', null, 'Entity requires a stable lowercase UUID.', 'repair-identity')
  if (entity.parentUuid && !entities.some(/* 比较 candidate.uuid 与 entity.parentUuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === entity.parentUuid)) add('error', 'missing-parent', 'Transform2D', 'Hierarchy parent no longer exists.', 'repair-parent')
  const kinds = new Set(entity.components.map(/* 返回 component.kind 的当前值。 */ component => component.kind))
  for (const kind of kinds) {
    const rule = componentAuthoringRule(kind)
    for (const dependency of rule.required) if (!kinds.has(dependency)) add('error', 'component-dependency', kind, `${kind} requires ${dependency}.`, 'add-dependency')
    for (const conflict of rule.conflicts) if (kinds.has(conflict)) add('error', 'component-conflict', kind, `${kind} conflicts with ${conflict}.`, 'remove-conflict')
  }
  if (kinds.has('Area2D') && ![...kinds].some(/* 调用 kind.endsWith('Collider2D') 并返回调用结果。 */ kind => kind.endsWith('Collider2D'))) add('error', 'component-dependency', 'Area2D', 'Area2D requires a Collider2D.', 'add-dependency')
  if (entity.ownership === 'Prefab' && !entity.prefabAsset) add('warning', 'prefab-owner', null, 'Prefab-owned entity has no prefab source.', 'none')
  if (entity.runtimePersistence === 'SaveGame' && entity.editorOnly) add('warning', 'editor-only-persistence', null, 'Editor-only entities cannot persist in a player save.', 'none')
  return issues
}

/** 汇总每个实体的作者校验，并额外报告场景内重复 UUID。 */ export function validateSceneAuthoring(entities: Entity[]): AuthoringValidationIssue[] {
  const rawEntities = toRaw(entities).map(/* 调用 toRaw(entity) 并返回调用结果。 */ entity => toRaw(entity))
  const output = rawEntities.flatMap(/* 调用 validateEntityAuthoring(entity, rawEntities) 并返回调用结果。 */ entity => validateEntityAuthoring(entity, rawEntities))
  const identities = new Set<string>()
  for (const entity of rawEntities) {
    if (identities.has(entity.uuid)) output.push({ severity: 'error', code: 'duplicate-identity', entityUuid: entity.uuid, component: null, message: `Duplicate entity UUID ${entity.uuid}.`, fix: 'repair-identity' })
    identities.add(entity.uuid)
  }
  return output
}

/** Safe arithmetic evaluator for Inspector fields; no eval, properties, calls, or allocation-heavy syntax. */
/** 以最多 128 个词元解析四则算术及 pi、tau、current，拒绝未知字符、除零和非有限结果。 */ export function evaluateNumericExpression(source: string, currentValue = 0): number | null {
  const tokens = source.trim().toLocaleLowerCase().match(/(?:(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)|pi|tau|current|[()+\-*/]/g)
  if (!tokens || tokens.join('') !== source.trim().toLocaleLowerCase().replace(/\s+/g, '') || tokens.length > 128) return null
  let index = 0
  const primary = /** 读取数字、常量、一元正负或括号表达式，缺失词元或闭括号时拒绝。 */ (): number | null => {
    const token = tokens[index++]
    if (token === undefined) return null
    if (token === '+' || token === '-') { const value = primary(); return value === null ? null : token === '-' ? -value : value }
    if (token === '(') { const value = expression(); if (tokens[index++] !== ')') return null; return value }
    if (token === 'pi') return Math.PI
    if (token === 'tau') return Math.PI * 2
    if (token === 'current') return currentValue
    const number = Number(token)
    return Number.isFinite(number) ? number : null
  }
  const product = /** 按优先级计算连续乘除运算，拒绝缺失操作数、除零和溢出。 */ (): number | null => {
    let value = primary(); if (value === null) return null
    while (tokens[index] === '*' || tokens[index] === '/') {
      const operator = tokens[index++], right = primary(); if (right === null || (operator === '/' && right === 0)) return null
      value = operator === '*' ? value * right : value / right
      if (!Number.isFinite(value)) return null
    }
    return value
  }
  const expression = /** 在乘除子表达式之上按左结合计算加减，拒绝缺失操作数及非有限结果。 */ (): number | null => {
    let value = product(); if (value === null) return null
    while (tokens[index] === '+' || tokens[index] === '-') {
      const operator = tokens[index++], right = product(); if (right === null) return null
      value = operator === '+' ? value + right : value - right
      if (!Number.isFinite(value)) return null
    }
    return value
  }
  const result = expression()
  return result !== null && index === tokens.length && Number.isFinite(result) ? Object.is(result, -0) ? 0 : result : null
}
