import { reactive } from 'vue'

export interface ScriptProjectSettings {
  apiVersion: 1 | 2
  customSignals: string[]
  maxConsoleEntries: number
  debuggerEnabled: boolean
  hotReloadEnabled: boolean
  breakOnRuntimeError: boolean
  exceptionPolicy: 'never' | 'uncaught' | 'all'
  deterministicTestSeed: number
  externalEditorProtocol: boolean
  formatting: { indentSize: 2 | 4; lineWidth: number; finalNewline: boolean }
  lint: { deprecatedApi: 'off' | 'warning' | 'error'; shadowing: 'off' | 'warning'; unusedSymbols: 'off' | 'warning' }
  indexing: { persist: boolean; maxScripts: number; interactiveBudgetMs: number }
  testing: { parallelism: number; defaultTimeoutMs: number; coverageEnabled: boolean; failOnEmpty: boolean }
  remoteDebug: { enabled: boolean; host: '127.0.0.1' | 'localhost'; port: number; authentication: 'token'; tokenHash: string; allowExportedPlayers: boolean }
}

export const scriptProjectSettings = reactive<ScriptProjectSettings>({
  apiVersion: 2,
  customSignals: [],
  maxConsoleEntries: 2000,
  debuggerEnabled: true,
  hotReloadEnabled: true,
  breakOnRuntimeError: true,
  exceptionPolicy: 'uncaught',
  deterministicTestSeed: 1,
  externalEditorProtocol: true,
  formatting: { indentSize: 2, lineWidth: 100, finalNewline: true },
  lint: { deprecatedApi: 'warning', shadowing: 'warning', unusedSymbols: 'warning' },
  indexing: { persist: true, maxScripts: 10_000, interactiveBudgetMs: 50 },
  testing: { parallelism: 1, defaultTimeoutMs: 10_000, coverageEnabled: true, failOnEmpty: false },
  remoteDebug: { enabled: false, host: '127.0.0.1', port: 47960, authentication: 'token', tokenHash: '', allowExportedPlayers: false }
})

export function normalizeScriptSettings(source: unknown): ScriptProjectSettings {
  const item = source && typeof source === 'object' ? source as Partial<ScriptProjectSettings> : {}
  const formatting = item.formatting && typeof item.formatting === 'object' ? item.formatting : {} as Partial<ScriptProjectSettings['formatting']>
  const lint = item.lint && typeof item.lint === 'object' ? item.lint : {} as Partial<ScriptProjectSettings['lint']>
  const indexing = item.indexing && typeof item.indexing === 'object' ? item.indexing : {} as Partial<ScriptProjectSettings['indexing']>
  const testing = item.testing && typeof item.testing === 'object' ? item.testing : {} as Partial<ScriptProjectSettings['testing']>
  const remoteDebug = item.remoteDebug && typeof item.remoteDebug === 'object' ? item.remoteDebug : {} as Partial<ScriptProjectSettings['remoteDebug']>
  return {
    apiVersion: Number(item.apiVersion) === 1 ? 1 : 2,
    customSignals: Array.isArray(item.customSignals)
      ? [...new Set(item.customSignals.filter(value => typeof value === 'string').map(value => value.trim().slice(0, 128)).filter(Boolean))].slice(0, 256)
      : [],
    maxConsoleEntries: Math.min(10_000, Math.max(100, Math.round(Number(item.maxConsoleEntries) || 2000))),
    debuggerEnabled: item.debuggerEnabled !== false,
    hotReloadEnabled: item.hotReloadEnabled !== false,
    breakOnRuntimeError: item.breakOnRuntimeError !== false,
    exceptionPolicy: ['never', 'uncaught', 'all'].includes(String(item.exceptionPolicy)) ? item.exceptionPolicy as ScriptProjectSettings['exceptionPolicy'] : 'uncaught',
    deterministicTestSeed: Number.isFinite(Number(item.deterministicTestSeed)) ? Number(item.deterministicTestSeed) >>> 0 : 1,
    externalEditorProtocol: item.externalEditorProtocol !== false,
    formatting: {
      indentSize: Number(formatting.indentSize) === 4 ? 4 : 2,
      lineWidth: Math.min(240, Math.max(60, Math.round(Number(formatting.lineWidth) || 100))),
      finalNewline: formatting.finalNewline !== false
    },
    lint: {
      deprecatedApi: ['off', 'warning', 'error'].includes(String(lint.deprecatedApi)) ? lint.deprecatedApi as ScriptProjectSettings['lint']['deprecatedApi'] : 'warning',
      shadowing: lint.shadowing === 'off' ? 'off' : 'warning',
      unusedSymbols: lint.unusedSymbols === 'off' ? 'off' : 'warning'
    },
    indexing: {
      persist: indexing.persist !== false,
      maxScripts: Math.min(50_000, Math.max(100, Math.round(Number(indexing.maxScripts) || 10_000))),
      interactiveBudgetMs: Math.min(500, Math.max(10, Math.round(Number(indexing.interactiveBudgetMs) || 50)))
    },
    testing: {
      parallelism: Math.min(16, Math.max(1, Math.round(Number(testing.parallelism) || 1))),
      defaultTimeoutMs: Math.min(120_000, Math.max(100, Math.round(Number(testing.defaultTimeoutMs) || 10_000))),
      coverageEnabled: testing.coverageEnabled !== false,
      failOnEmpty: testing.failOnEmpty === true
    },
    remoteDebug: {
      enabled: remoteDebug.enabled === true,
      host: remoteDebug.host === 'localhost' ? 'localhost' : '127.0.0.1',
      port: Math.min(65_535, Math.max(1_024, Math.round(Number(remoteDebug.port) || 47_960))),
      authentication: 'token',
      tokenHash: typeof remoteDebug.tokenHash === 'string' ? remoteDebug.tokenHash.replace(/[^a-f0-9]/gi, '').slice(0, 128).toLowerCase() : '',
      allowExportedPlayers: remoteDebug.allowExportedPlayers === true
    }
  }
}

export function serializeScriptSettings(): ScriptProjectSettings {
  return normalizeScriptSettings(scriptProjectSettings)
}
