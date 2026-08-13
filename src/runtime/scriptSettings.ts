import { reactive } from 'vue'

export interface ScriptProjectSettings {
  customSignals: string[]
  maxConsoleEntries: number
  debuggerEnabled: boolean
}

export const scriptProjectSettings = reactive<ScriptProjectSettings>({
  customSignals: [],
  maxConsoleEntries: 2000,
  debuggerEnabled: true
})

export function normalizeScriptSettings(source: unknown): ScriptProjectSettings {
  const item = source && typeof source === 'object' ? source as Partial<ScriptProjectSettings> : {}
  return {
    customSignals: Array.isArray(item.customSignals)
      ? [...new Set(item.customSignals.filter(value => typeof value === 'string').map(value => value.trim().slice(0, 128)).filter(Boolean))].slice(0, 256)
      : [],
    maxConsoleEntries: Math.min(10_000, Math.max(100, Math.round(Number(item.maxConsoleEntries) || 2000))),
    debuggerEnabled: item.debuggerEnabled !== false
  }
}

export function serializeScriptSettings(): ScriptProjectSettings {
  return normalizeScriptSettings(scriptProjectSettings)
}
