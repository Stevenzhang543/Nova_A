/** 26.45: the player's own key bindings. A game's input map is the project's; players can change
 * bindings at run time (a remap button in the game UI, or `input_rebind` from a script) and the
 * Player keeps those changes in its storage, per project, so they survive restarts. Only the bindings
 * that differ from the project's are stored. Plain TypeScript with a storage port; no editor state. */
import { normalizeInputMap, rebindInputAction, type InputAction, type InputBinding } from './input'

export interface InputBindingStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export type InputBindingOverrides = Record<string, Array<{ index: number; device: InputBinding['device']; code: string }>>

const FORMAT = 'nova-input-bindings'
const MAX_ACTIONS = 256

export function inputBindingStorageKey(projectId: string): string { return `nova-input-bindings:${String(projectId || 'default').slice(0, 128)}` }

/** The bindings of `actions` that differ from `defaults` (by action name and binding index). */
export function inputBindingOverrides(defaults: readonly InputAction[], actions: readonly InputAction[]): InputBindingOverrides {
  const result: InputBindingOverrides = {}
  for (const action of actions.slice(0, MAX_ACTIONS)) {
    const original = defaults.find(candidate => candidate.name === action.name)
    action.bindings.slice(0, 32).forEach((binding, index) => {
      const before = original?.bindings[index]
      if (before && before.device === binding.device && before.code === binding.code) return
      ;(result[action.name] ??= []).push({ index, device: binding.device, code: binding.code })
    })
  }
  return result
}

/** Applies stored overrides to an input map; unknown actions and invalid entries are skipped.
 * Returns the number of bindings changed. */
export function applyInputBindingOverrides(actions: InputAction[], overrides: unknown): number {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return 0
  let changed = 0
  for (const [name, entries] of Object.entries(overrides as Record<string, unknown>).slice(0, MAX_ACTIONS)) {
    if (!Array.isArray(entries)) continue
    for (const entry of entries.slice(0, 32)) {
      const item = entry && typeof entry === 'object' ? entry as { index?: unknown; device?: unknown; code?: unknown } : null
      if (!item || !Number.isInteger(item.index) || typeof item.device !== 'string' || typeof item.code !== 'string') continue
      if (rebindInputAction(actions, name, Number(item.index), { device: item.device as InputBinding['device'], code: item.code.slice(0, 64) })) changed++
    }
  }
  return changed
}

/** Reads the stored bindings of a project into `actions`; returns the number applied (0 when none or unreadable). */
export function loadInputBindings(storage: InputBindingStorage | undefined, projectId: string, actions: InputAction[]): number {
  try {
    const raw = storage?.getItem(inputBindingStorageKey(projectId))
    if (!raw) return 0
    const value = JSON.parse(raw) as { format?: unknown; overrides?: unknown }
    return value?.format === FORMAT ? applyInputBindingOverrides(actions, value.overrides) : 0
  } catch { return 0 }
}

/** Stores the bindings that differ from the project's (or clears the entry when none do). */
export function saveInputBindings(storage: InputBindingStorage | undefined, projectId: string, defaults: readonly InputAction[], actions: readonly InputAction[]): boolean {
  if (!storage) return false
  try {
    const overrides = inputBindingOverrides(defaults, actions)
    if (!Object.keys(overrides).length) storage.removeItem(inputBindingStorageKey(projectId))
    else storage.setItem(inputBindingStorageKey(projectId), JSON.stringify({ format: FORMAT, version: 1, overrides }))
    return true
  } catch { return false }
}

/** Puts the project's bindings back into `actions` (in place) and forgets the stored ones. */
export function resetInputBindings(storage: InputBindingStorage | undefined, projectId: string, defaults: readonly InputAction[], actions: InputAction[]): void {
  const fresh = normalizeInputMap(JSON.parse(JSON.stringify(defaults)))
  for (const action of actions) { const original = fresh.find(candidate => candidate.name === action.name); if (original) action.bindings = original.bindings }
  try { storage?.removeItem(inputBindingStorageKey(projectId)) } catch { /* storage unavailable */ }
}

/** `{input:Action}` in a text becomes the action's prompt symbol for the current device. */
export const INPUT_PROMPT_TOKEN = /\{input:([^{}]{1,120})\}/g
export function replaceInputPromptTokens(text: string, symbol: (action: string) => string): string {
  return text.includes('{input:') ? text.replace(INPUT_PROMPT_TOKEN, (_, action: string) => symbol(action.trim())) : text
}
