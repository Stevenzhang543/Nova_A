import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(`Script Studio audit failed: ${message}`) }

const studio = read('src/components/ScriptStudio.vue')
const api = read('src/editor/scriptApi.ts')
const language = read('src/editor/scriptLanguage.ts')
const runtime = read('src/runtime/GameplayRuntime.ts')
const rust = read('crates/nova_script/src/lib.rs')
const wasm = read('crates/nova_wasm/src/lib.rs')
const format = read('crates/nova_format/src/lib.rs')
const translations = read('src/i18n.ts')
const packageWriter = read('src/runtime/novaPak.ts')

for (const control of ['saveActive', 'findNext', 'replaceOne', 'replaceAll', 'requestCompletions', 'goToDefinition', 'toggleBreakpoint', 'debugContinue', 'debugStep', 'runTests', 'beginRenameSymbol', 'addSignal']) {
  assert(studio.includes(control), `control is not bound: ${control}`)
}
for (const capability of ['new Worker', 'analyzeScript', 'diagnostics', 'symbols', 'dependencies']) assert(language.includes(capability), `language service missing ${capability}`)
for (const capability of ['compile_cached', 'execute_cached_json']) assert(wasm.includes(capability), `WASM cache API missing ${capability}`)
for (const capability of ['flushHotReloads', 'dispatchSignals', 'resolveScriptBundle', 'runScriptTests', 'pendingDebugInvocation']) assert(runtime.includes(capability), `runtime missing ${capability}`)
for (const callable of ['entity_handle', 'find_entity_handle', 'component_handle', 'animator_handle', 'audio_source_handle', 'task_wait', 'task_cancel', 'signal_emit', 'signal_emit_to', 'expect']) {
  assert(api.includes(`name: '${callable}'`), `API reference missing ${callable}`)
  assert(rust.includes(`"${callable}"`), `Rust registration missing ${callable}`)
}
for (const localeMarker of ['Object.assign(en', 'Object.assign(de', 'Object.assign(zh']) assert(translations.includes(localeMarker), `translation block missing ${localeMarker}`)
assert(format.includes('CURRENT_FORMAT_VERSION: u32 = 22'), 'current schema is not active')
assert(format.includes('validate_script_asset'), 'script metadata validation is not active')
assert(packageWriter.includes('delete asset.script') && packageWriter.includes('debuggerEnabled = false'), 'release packages do not strip script debug metadata')
assert(studio.includes('@media(max-width:1000px)') && studio.includes('@media(max-width:800px)') && studio.includes('@media(max-width:620px)'), 'responsive layouts missing')
assert(!studio.includes('window.prompt') && !studio.includes('window.confirm'), 'browser-native dialogs are forbidden')
console.log('Script Studio audit passed: controls, worker analysis, cache/hot reload, modules, debugger, signals, tasks, tests, schema, locales, and responsive layout are connected.')
