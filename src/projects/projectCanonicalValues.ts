/** Unique shared canonical project values; original budgets, sorting and number/UUID semantics. No authoring services. */

export const MAX_PROJECT_DOCUMENT_CHARACTERS = 192 * 1024 * 1024
const MAX_PROJECT_NESTING_DEPTH = 96
const MAX_PROJECT_VALUE_NODES = 2_000_000
const MAX_PROJECT_SCENES = 4_096
const MAX_PROJECT_ENTITIES = 100_000
const MAX_PROJECT_ASSETS = 100_000

/** 迭代检查场景、资源、实体、结构节点和嵌套深度预算，超限时返回首个问题。 */ export function projectResourceBudgetIssue(project: Record<string, unknown>): string | null {
  const scenes = Array.isArray(project.scenes) ? project.scenes : []
  const assets = Array.isArray(project.assets) ? project.assets : []
  if (scenes.length > MAX_PROJECT_SCENES) return `Project contains more than ${MAX_PROJECT_SCENES.toLocaleString()} scenes.`
  if (assets.length > MAX_PROJECT_ASSETS) return `Project contains more than ${MAX_PROJECT_ASSETS.toLocaleString()} assets.`
  let entities = 0
  for (const rawScene of scenes) {
    if (!rawScene || typeof rawScene !== 'object') continue
    const sceneEntities = (rawScene as Record<string, unknown>).entities
    if (Array.isArray(sceneEntities)) entities += sceneEntities.length
    if (entities > MAX_PROJECT_ENTITIES) return `Project contains more than ${MAX_PROJECT_ENTITIES.toLocaleString()} entities.`
  }
  const pending: Array<{ value: unknown; depth: number }> = [{ value: project, depth: 0 }]
  let nodes = 0
  while (pending.length) {
    const current = pending.pop()!
    if (++nodes > MAX_PROJECT_VALUE_NODES) return `Project contains more than ${MAX_PROJECT_VALUE_NODES.toLocaleString()} structured values.`
    if (current.depth > MAX_PROJECT_NESTING_DEPTH) return `Project nesting exceeds the safe depth of ${MAX_PROJECT_NESTING_DEPTH}.`
    if (Array.isArray(current.value)) {
      for (const value of current.value) pending.push({ value, depth: current.depth + 1 })
    } else if (current.value && typeof current.value === 'object') {
      for (const value of Object.values(current.value as Record<string, unknown>)) pending.push({ value, depth: current.depth + 1 })
    }
  }
  return null
}
/* 根据 Object.is(value, -0) 的真假，分别返回 0 或 value。 */ function normalizedNumber(value: number): number { return Object.is(value, -0) ? 0 : value }

const UUID_FIELD = /(?:^uuid$|Uuid$|UUID$|^projectUuid$)/
const UUID_VALUE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** 将身份字段及已识别资源 URI 中的 UUID 和协议名统一为小写，其余字符串保持不变。 */ function canonicalString(value: string, key: string): string {
  if (UUID_FIELD.test(key) && UUID_VALUE.test(value)) return value.toLowerCase()
  if (/^(?:asset|scene|prefab|resource):\/\/[0-9a-f-]{36}$/i.test(value)) {
    const [scheme, identity] = value.split('://')
    return `${scheme.toLowerCase()}://${identity.toLowerCase()}`
  }
  return value
}

/** 递归拒绝非有限数值并规范化对象键、身份字符串与指定集合顺序，保留有语义的数组顺序。 */ export function canonicalValue(value: unknown, path: string, key = ''): unknown {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Non-finite number at ${path || '<root>'}`)
    return normalizedNumber(value)
  }
  if (Array.isArray(value)) {
    const items = value.map(/* 调用 canonicalValue(item, `${path}[${index}]`) 并返回调用结果。 */ (item, index) => canonicalValue(item, `${path}[${index}]`))
    if (path === 'assets') return items.sort(/** 先按资源路径排序，路径相同时按 UUID 稳定比较。 */ (a, b) => String((a as Record<string, unknown>)?.path ?? '').localeCompare(String((b as Record<string, unknown>)?.path ?? '')) || String((a as Record<string, unknown>)?.uuid ?? '').localeCompare(String((b as Record<string, unknown>)?.uuid ?? '')))
    if (path === 'assetFolders' || path.endsWith('.buildPresets')) return [...new Set(items.map(String))].sort(/* 调用 a.localeCompare(b) 并返回调用结果。 */ (a, b) => a.localeCompare(b))
    if (path.endsWith('.dependencies') || path.endsWith('.reverseDependencies')) return [...new Set(items.map(String))].sort(/* 调用 a.localeCompare(b) 并返回调用结果。 */ (a, b) => a.localeCompare(b))
    return items
  }
  if (typeof value === 'string') return canonicalString(value, key)
  if (!value || typeof value !== 'object') return value
  const source = value as Record<string, unknown>, output: Record<string, unknown> = Object.create(null)
  for (const childKey of Object.keys(source).sort(/* 调用 a.localeCompare(b) 并返回调用结果。 */ (a, b) => a.localeCompare(b))) output[childKey] = canonicalValue(source[childKey], path ? `${path}.${childKey}` : childKey, childKey)
  return output
}

/** Canonical project JSON is UTF-8 text, LF terminated, two-space indented, and lexicographically keyed. */
/** 检查项目文本与结构预算后输出规范排序、缩进及末尾换行的 JSON。 */ export function canonicalProjectText(source: string | unknown): string {
  if (typeof source === 'string' && source.length > MAX_PROJECT_DOCUMENT_CHARACTERS) throw new Error('Project text exceeds the safe size limit.')
  const value = typeof source === 'string' ? JSON.parse(source) : source
  if (value && typeof value === 'object') { const issue = projectResourceBudgetIssue(value as Record<string, unknown>); if (issue) throw new Error(issue) }
  return `${JSON.stringify(canonicalValue(value, ''), null, 2)}\n`
}
