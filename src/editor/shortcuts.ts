/** 编辑快捷键配置：解析键盘组合，查找冲突并持久化、导入或导出用户绑定。 */
import { reactive } from 'vue'

export type ShortcutCommand = 'commandPalette' | 'quickOpen' | 'globalSearch' | 'contextSearch' | 'fullscreen' | 'navigateBack' | 'navigateForward' | 'shortcutEditor' | 'workspaceManager' | 'statusCenter'
export interface ShortcutDefinition { id: ShortcutCommand; label: string; defaultBinding: string; binding: string }
const STORAGE_KEY = 'nova-a-editor-shortcuts-v1'
const defaults: Array<Omit<ShortcutDefinition, 'binding'>> = [
  { id: 'commandPalette', label: 'commandPalette', defaultBinding: 'Ctrl+Shift+P' },
  { id: 'quickOpen', label: 'quickOpen', defaultBinding: 'Ctrl+P' },
  { id: 'globalSearch', label: 'globalSearch', defaultBinding: 'Ctrl+Shift+F' },
  { id: 'contextSearch', label: 'contextSearch', defaultBinding: 'Ctrl+K' },
  { id: 'fullscreen', label: 'toggleFullscreen', defaultBinding: 'F11' },
  { id: 'navigateBack', label: 'navigateBack', defaultBinding: 'Alt+ArrowLeft' },
  { id: 'navigateForward', label: 'navigateForward', defaultBinding: 'Alt+ArrowRight' },
  { id: 'shortcutEditor', label: 'shortcutEditor', defaultBinding: 'Ctrl+Alt+K' },
  { id: 'workspaceManager', label: 'manageWorkspaces', defaultBinding: 'Ctrl+Alt+W' },
  { id: 'statusCenter', label: 'statusCenter', defaultBinding: 'Ctrl+Alt+J' }
]

/** 从本地存储读取用户快捷键映射，存储或 JSON 失败时返回空映射。 */ function stored(): Partial<Record<ShortcutCommand, string>> { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Record<ShortcutCommand, string>> } catch { return {} } }
const saved = typeof localStorage === 'undefined' ? {} : stored()
export const shortcutState = reactive({ definitions: defaults.map(/** 构造并返回记录 { ...item, binding: saved[item.id] || item.defaultBinding }，字段按当前实参及捕获状态求值。 */ item => ({ ...item, binding: saved[item.id] || item.defaultBinding })) as ShortcutDefinition[] })

/* 根据 value === 'Control' 的真假，分别返回 'Ctrl' 或 value === ' ' ? 'Space' : value.length === 1 ? value.toUpperCase() : value。 */ function normalizePart(value: string): string { return value === 'Control' ? 'Ctrl' : value === ' ' ? 'Space' : value.length === 1 ? value.toUpperCase() : value }
/** 把键盘事件规范化为修饰键和主键组合，将 Meta 与 Ctrl 统一匹配。 */ export function shortcutFromEvent(event: KeyboardEvent): string {
  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')
  if (!['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) parts.push(normalizePart(event.key))
  return parts.join('+')
}
/** 按命令查找当前绑定，并以不区分大小写的规范化事件字符串比较。 */ export function shortcutMatches(event: KeyboardEvent, command: ShortcutCommand): boolean { const definition = shortcutState.definitions.find(/* 比较 item.id 与 command，返回严格相等的判断结果。 */ item => item.id === command); return Boolean(definition && shortcutFromEvent(event).toLocaleLowerCase() === definition.binding.toLocaleLowerCase()) }
/** 更新已知命令的非空绑定并限制文本长度，随后保存用户配置。 */ export function setShortcut(command: ShortcutCommand, binding: string): boolean { const item = shortcutState.definitions.find(/* 比较 value.id 与 command，返回严格相等的判断结果。 */ value => value.id === command); const safe = binding.trim().slice(0, 80); if (!item || !safe) return false; item.binding = safe; persistShortcuts(); return true }
/** 列出使用相同绑定的其他命令，比较时忽略大小写。 */ export function shortcutConflicts(binding: string, except?: ShortcutCommand): ShortcutDefinition[] { return shortcutState.definitions.filter(/* 先计算 item.id !== except；仅当其为真值时求右侧 item.binding.toLocaleLowerCase() === binding.toLocaleLowerCase()，返回短路求值结果。 */ item => item.id !== except && item.binding.toLocaleLowerCase() === binding.toLocaleLowerCase()) }
/** 将所有命令恢复默认快捷键并持久化。 */ export function resetShortcuts(): void { for (const item of shortcutState.definitions) item.binding = item.defaultBinding; persistShortcuts() }
/** 将当前命令绑定导出为带格式和版本的 JSON 文档。 */ export function exportShortcuts(): string { return JSON.stringify({ format: 'nova-shortcuts', version: 1, bindings: Object.fromEntries(shortcutState.definitions.map(/* 返回按声明顺序构造的数组 [item.id, item.binding]。 */ item => [item.id, item.binding])) }, null, 2) }
/** 校验快捷键文档信封，依次接受已知命令的非空无冲突绑定，保存后返回变更数量。 */ export function importShortcuts(source: string): number {
  const parsed = JSON.parse(source) as { format?: unknown; version?: unknown; bindings?: unknown }
  if (parsed.format !== 'nova-shortcuts' || parsed.version !== 1 || !parsed.bindings || typeof parsed.bindings !== 'object') throw new Error('Unsupported Nova_A shortcut document.')
  let changed = 0
  for (const item of shortcutState.definitions) {
    const binding = (parsed.bindings as Record<string, unknown>)[item.id]
    if (typeof binding !== 'string' || !binding.trim() || shortcutConflicts(binding, item.id).length) continue
    item.binding = binding.trim().slice(0, 80)
    changed += 1
  }
  persistShortcuts()
  return changed
}
/** 保存当前快捷键映射，存储不可用时保持内存配置并忽略持久化失败。 */ function persistShortcuts(): void { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(shortcutState.definitions.map(/* 返回按声明顺序构造的数组 [item.id, item.binding]。 */ item => [item.id, item.binding])))) } catch { /* Shortcut persistence is optional. */ } }
