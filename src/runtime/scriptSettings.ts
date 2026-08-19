import { reactive } from 'vue'

export interface ScriptProjectSettings {
  apiVersion: 1
  customSignals: string[]
  maxConsoleEntries: number
  debuggerEnabled: boolean
  hotReloadEnabled: boolean
  breakOnRuntimeError: boolean
  deterministicTestSeed: number
  externalEditorProtocol: boolean
}

export const scriptProjectSettings = reactive<ScriptProjectSettings>({
  apiVersion: 1,
  customSignals: [],
  maxConsoleEntries: 2000,
  debuggerEnabled: true,
  hotReloadEnabled: true,
  breakOnRuntimeError: true,
  deterministicTestSeed: 1,
  externalEditorProtocol: true
})

export function normalizeScriptSettings(source: unknown): ScriptProjectSettings {
  const item = source && typeof source === 'object' ? source as Partial<ScriptProjectSettings> : {}
  return {
    apiVersion: 1,
    customSignals: Array.isArray(item.customSignals)
      ? [...new Set(item.customSignals.filter(value => typeof value === 'string').map(value => value.trim().slice(0, 128)).filter(Boolean))].slice(0, 256)
      : [],
    maxConsoleEntries: Math.min(10_000, Math.max(100, Math.round(Number(item.maxConsoleEntries) || 2000))),
    debuggerEnabled: item.debuggerEnabled !== false,
    hotReloadEnabled: item.hotReloadEnabled !== false,
    breakOnRuntimeError: item.breakOnRuntimeError !== false,
    deterministicTestSeed: Number.isFinite(Number(item.deterministicTestSeed)) ? Number(item.deterministicTestSeed) >>> 0 : 1,
    externalEditorProtocol: item.externalEditorProtocol !== false
  }
}

export function serializeScriptSettings(): ScriptProjectSettings {
  return normalizeScriptSettings(scriptProjectSettings)
}
