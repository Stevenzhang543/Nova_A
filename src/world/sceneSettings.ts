/** Shared persisted scene settings; Editor validation remains in sceneAuthoring. */
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

