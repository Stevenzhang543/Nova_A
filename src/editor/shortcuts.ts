import { reactive } from 'vue'

export type ShortcutCommand = 'commandPalette' | 'fullscreen' | 'navigateBack' | 'navigateForward' | 'shortcutEditor' | 'workspaceManager' | 'statusCenter'
export interface ShortcutDefinition { id: ShortcutCommand; label: string; defaultBinding: string; binding: string }
const STORAGE_KEY = 'nova-a-editor-shortcuts-v1'
const defaults: Array<Omit<ShortcutDefinition, 'binding'>> = [
  { id: 'commandPalette', label: 'commandPalette', defaultBinding: 'Ctrl+K' },
  { id: 'fullscreen', label: 'toggleFullscreen', defaultBinding: 'F11' },
  { id: 'navigateBack', label: 'navigateBack', defaultBinding: 'Alt+ArrowLeft' },
  { id: 'navigateForward', label: 'navigateForward', defaultBinding: 'Alt+ArrowRight' },
  { id: 'shortcutEditor', label: 'shortcutEditor', defaultBinding: 'Ctrl+Alt+K' },
  { id: 'workspaceManager', label: 'manageWorkspaces', defaultBinding: 'Ctrl+Alt+W' },
  { id: 'statusCenter', label: 'statusCenter', defaultBinding: 'Ctrl+Alt+J' }
]

function stored(): Partial<Record<ShortcutCommand, string>> { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Record<ShortcutCommand, string>> } catch { return {} } }
const saved = typeof localStorage === 'undefined' ? {} : stored()
export const shortcutState = reactive({ definitions: defaults.map(item => ({ ...item, binding: saved[item.id] || item.defaultBinding })) as ShortcutDefinition[] })

function normalizePart(value: string): string { return value === 'Control' ? 'Ctrl' : value === ' ' ? 'Space' : value.length === 1 ? value.toUpperCase() : value }
export function shortcutFromEvent(event: KeyboardEvent): string {
  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')
  if (!['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) parts.push(normalizePart(event.key))
  return parts.join('+')
}
export function shortcutMatches(event: KeyboardEvent, command: ShortcutCommand): boolean { const definition = shortcutState.definitions.find(item => item.id === command); return Boolean(definition && shortcutFromEvent(event).toLocaleLowerCase() === definition.binding.toLocaleLowerCase()) }
export function setShortcut(command: ShortcutCommand, binding: string): boolean { const item = shortcutState.definitions.find(value => value.id === command); const safe = binding.trim().slice(0, 80); if (!item || !safe) return false; item.binding = safe; persistShortcuts(); return true }
export function shortcutConflicts(binding: string, except?: ShortcutCommand): ShortcutDefinition[] { return shortcutState.definitions.filter(item => item.id !== except && item.binding.toLocaleLowerCase() === binding.toLocaleLowerCase()) }
export function resetShortcuts(): void { for (const item of shortcutState.definitions) item.binding = item.defaultBinding; persistShortcuts() }
function persistShortcuts(): void { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(shortcutState.definitions.map(item => [item.id, item.binding])))) } catch { /* Shortcut persistence is optional. */ } }
