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

export function componentAuthoringRule(kind: ComponentKind): ComponentAuthoringRule {
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

export function defaultSceneAuthoringSettings(index = 0): SceneAuthoringSettings {
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

function cleanNames(source: unknown, maximum = 32): string[] {
  return Array.isArray(source)
    ? [...new Set(source.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean))].slice(0, maximum)
    : []
}

export function normalizeSceneAuthoringSettings(source: unknown, index = 0): SceneAuthoringSettings {
  const fallback = defaultSceneAuthoringSettings(index)
  if (!source || typeof source !== 'object' || Array.isArray(source)) return fallback
  const value = source as Record<string, unknown>
  const layers = Array.isArray(value.namedLayers) ? value.namedLayers.flatMap((raw): NamedSceneLayer[] => {
    if (!raw || typeof raw !== 'object') return []
    const layer = raw as Record<string, unknown>, id = Number(layer.id)
    if (!Number.isSafeInteger(id) || id < 1) return []
    return [{ id, name: String(layer.name ?? `Layer ${id}`).trim().slice(0, 80) || `Layer ${id}`, visible: layer.visible !== false, locked: layer.locked === true }]
  }) : []
  const uniqueLayers = [...new Map(layers.map(layer => [layer.id, layer])).values()].sort((a, b) => a.id - b.id)
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

export function validateEntityAuthoring(entity: Entity, entities: Entity[]): AuthoringValidationIssue[] {
  entity = toRaw(entity)
  entities = toRaw(entities)
  const issues: AuthoringValidationIssue[] = []
  const add = (severity: AuthoringValidationIssue['severity'], code: string, component: ComponentKind | null, message: string, fix: AuthoringValidationIssue['fix']) => issues.push({ severity, code, entityUuid: entity.uuid, component, message, fix })
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(entity.uuid)) add('error', 'identity', null, 'Entity requires a stable lowercase UUID.', 'repair-identity')
  if (entity.parentUuid && !entities.some(candidate => candidate.uuid === entity.parentUuid)) add('error', 'missing-parent', 'Transform2D', 'Hierarchy parent no longer exists.', 'repair-parent')
  const kinds = new Set(entity.components.map(component => component.kind))
  for (const kind of kinds) {
    const rule = componentAuthoringRule(kind)
    for (const dependency of rule.required) if (!kinds.has(dependency)) add('error', 'component-dependency', kind, `${kind} requires ${dependency}.`, 'add-dependency')
    for (const conflict of rule.conflicts) if (kinds.has(conflict)) add('error', 'component-conflict', kind, `${kind} conflicts with ${conflict}.`, 'remove-conflict')
  }
  if (kinds.has('Area2D') && ![...kinds].some(kind => kind.endsWith('Collider2D'))) add('error', 'component-dependency', 'Area2D', 'Area2D requires a Collider2D.', 'add-dependency')
  if (entity.ownership === 'Prefab' && !entity.prefabAsset) add('warning', 'prefab-owner', null, 'Prefab-owned entity has no prefab source.', 'none')
  if (entity.runtimePersistence === 'SaveGame' && entity.editorOnly) add('warning', 'editor-only-persistence', null, 'Editor-only entities cannot persist in a player save.', 'none')
  return issues
}

export function validateSceneAuthoring(entities: Entity[]): AuthoringValidationIssue[] {
  const rawEntities = toRaw(entities).map(entity => toRaw(entity))
  const output = rawEntities.flatMap(entity => validateEntityAuthoring(entity, rawEntities))
  const identities = new Set<string>()
  for (const entity of rawEntities) {
    if (identities.has(entity.uuid)) output.push({ severity: 'error', code: 'duplicate-identity', entityUuid: entity.uuid, component: null, message: `Duplicate entity UUID ${entity.uuid}.`, fix: 'repair-identity' })
    identities.add(entity.uuid)
  }
  return output
}

/** Safe arithmetic evaluator for Inspector fields; no eval, properties, calls, or allocation-heavy syntax. */
export function evaluateNumericExpression(source: string, currentValue = 0): number | null {
  const tokens = source.trim().toLocaleLowerCase().match(/(?:\d+(?:\.\d+)?(?:e[+-]?\d+)?)|pi|tau|current|[()+\-*/]/g)
  if (!tokens || tokens.join('') !== source.trim().toLocaleLowerCase().replace(/\s+/g, '') || tokens.length > 128) return null
  let index = 0
  const primary = (): number | null => {
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
  const product = (): number | null => {
    let value = primary(); if (value === null) return null
    while (tokens[index] === '*' || tokens[index] === '/') {
      const operator = tokens[index++], right = primary(); if (right === null || (operator === '/' && right === 0)) return null
      value = operator === '*' ? value * right : value / right
      if (!Number.isFinite(value)) return null
    }
    return value
  }
  const expression = (): number | null => {
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
