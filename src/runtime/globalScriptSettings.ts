/** 26.43 全局脚本设置：项目设置 scripting.globalScripts 的类型与规范化（无运行时依赖）。 */

export interface GlobalScriptEntry {
  /** Name used by call_global() and as the host entity name: a letter or _, then letters, digits, _ (max 64). */
  name: string
  /** Script asset reference (uuid, asset:// URI or Assets/ path). */
  scriptAsset: string | null
  enabled: boolean
}

export const MAX_GLOBAL_SCRIPTS = 32
const NAME = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/

/** Bounded, de-duplicated list; invalid names are dropped, the first entry of a name wins. */
export function normalizeGlobalScripts(value: unknown): GlobalScriptEntry[] {
  if (!Array.isArray(value)) return []
  const names = new Set<string>(), entries: GlobalScriptEntry[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const record = item as Partial<GlobalScriptEntry>
    const name = typeof record.name === 'string' ? record.name.trim() : ''
    if (!NAME.test(name) || names.has(name.toLowerCase())) continue
    names.add(name.toLowerCase())
    const scriptAsset = typeof record.scriptAsset === 'string' && record.scriptAsset.trim() ? record.scriptAsset.trim().slice(0, 512) : null
    entries.push({ name, scriptAsset, enabled: record.enabled !== false })
    if (entries.length >= MAX_GLOBAL_SCRIPTS) break
  }
  return entries
}

/** Suggests a free global name ("Game", "Game2", ...). */
export function nextGlobalScriptName(entries: readonly GlobalScriptEntry[], base = 'Game'): string {
  const taken = new Set(entries.map(entry => entry.name.toLowerCase()))
  if (!taken.has(base.toLowerCase())) return base
  for (let index = 2; ; index++) if (!taken.has(`${base}${index}`.toLowerCase())) return `${base}${index}`
}
