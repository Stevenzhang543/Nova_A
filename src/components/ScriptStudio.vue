<template>
  <section class="script-studio" @keydown.ctrl.s.prevent="saveActive" @keydown.meta.s.prevent="saveActive">
    <header class="studio-toolbar">
      <div class="studio-title"><span class="studio-mark">{ }</span><div><strong>{{ t('scriptStudio') }}</strong><small>{{ t('scriptStudioDescription') }}</small></div></div>
      <div class="toolbar-actions">
        <button @click="createScript">＋ {{ t('newScript') }}</button>
        <button :disabled="!activeAsset || !activeDirty" class="primary" @click="saveActive">{{ t('saveScript') }}</button>
        <button :class="{ active: findOpen }" @click="findOpen = !findOpen">{{ t('findReplace') }}</button>
        <button @click="requestCompletions">{{ t('completion') }}</button>
        <button :disabled="!selectedIdentifier" @click="goToDefinition">F12 {{ t('goToDefinition') }}</button>
        <button @click="runTests">▷ {{ t('runTests') }}</button>
        <span class="toolbar-spacer"></span>
        <button :disabled="!debug.paused" @click="runtime.debugContinue">▶ {{ t('continueExecution') }}</button>
        <button :disabled="!debug.paused" @click="runtime.debugStep">↦ {{ t('stepExecution') }}</button>
      </div>
    </header>

    <div class="studio-grid">
      <aside class="project-scripts">
        <div class="pane-heading"><strong>{{ t('projectScripts') }}</strong><span>{{ scripts.length }}</span></div>
        <input v-model="projectQuery" type="search" :placeholder="t('searchProject')">
        <div class="script-list">
          <button v-for="asset in filteredScripts" :key="asset.uuid" :class="{ active: asset.uuid === activeAsset?.uuid }" @click="open(asset.uuid)">
            <span class="file-icon">R</span><span><strong>{{ asset.name }}</strong><small>{{ asset.path }}</small></span>
          </button>
        </div>
        <div v-if="projectQuery" class="search-results">
          <button v-for="result in projectMatches" :key="`${result.uuid}:${result.line}`" @click="openAt(result.uuid, result.line)">
            <strong>{{ result.name }}:{{ result.line }}</strong><small>{{ result.preview }}</small>
          </button>
          <p v-if="!projectMatches.length">{{ t('noResults') }}</p>
        </div>
      </aside>

      <main class="code-workspace">
        <nav class="file-tabs">
          <button v-for="asset in openAssets" :key="asset.uuid" :class="{ active: asset.uuid === activeAsset?.uuid }" @click="open(asset.uuid)">
            <span :class="['dirty-dot', { visible: dirtyUuids.has(asset.uuid) }]">●</span>{{ asset.name }}<i @click.stop="close(asset.uuid)">×</i>
          </button>
          <span></span>
          <button class="icon-button" :title="t('closeAll')" @click="closeAll">×</button>
        </nav>

        <div v-if="findOpen" class="find-bar">
          <input ref="findInput" v-model="findText" :placeholder="t('find')" @keydown.enter.prevent="findNext">
          <input v-model="replaceText" :placeholder="t('replace')">
          <button @click="findNext">↓</button><button @click="replaceOne">{{ t('replace') }}</button><button @click="replaceAll">{{ t('replaceAll') }}</button>
          <span>{{ findCount }}</span><button @click="findOpen = false">×</button>
        </div>

        <div v-if="activeAsset" class="editor-shell">
          <div class="gutter" aria-label="Breakpoints">
            <button v-for="line in lineCount" :key="line" :class="{ breakpoint: breakpoints.includes(line), error: diagnosticLines.has(line) }" :title="t('toggleBreakpoint')" @click="toggleBreakpoint(line)"><span></span>{{ line }}</button>
          </div>
          <textarea ref="editor" v-model="draft" spellcheck="false" autocomplete="off" autocapitalize="off" @input="sourceChanged" @click="cursorChanged" @keyup="cursorChanged" @scroll="syncScroll" @keydown.tab.prevent="insertTab"></textarea>
          <div v-if="completionOpen" class="completion-popover">
            <button v-for="item in completions" :key="item" @mousedown.prevent="insertCompletion(item)"><b>ƒ</b><span>{{ item }}</span></button>
            <p v-if="!completions.length">{{ t('noCompletions') }}</p>
          </div>
          <div v-if="contextApi" class="signature-help"><code>{{ contextApi.signature }}</code><span>{{ contextApi.detail }}</span></div>
        </div>
        <div v-else class="empty-editor"><span>{ }</span><h2>{{ t('openScriptPrompt') }}</h2><p>{{ t('openScriptDescription') }}</p><button class="primary" @click="createScript">{{ t('createFirstScript') }}</button></div>

        <footer class="editor-status">
          <span :class="validationError ? 'status-error' : 'status-ok'">{{ validationError ? t('errorsCount', { count: analysis.diagnostics.filter(item => item.severity === 'error').length || 1 }) : t('scriptValid') }}</span>
          <span>{{ t('lineColumn', { line: cursor.line, column: cursor.column }) }}</span>
          <span>Rhai · UTF-8</span><span>{{ t('engineVersion') }} 2.4.0</span>
        </footer>
      </main>

      <aside class="studio-inspector">
        <nav class="inspector-tabs">
          <button v-for="tab in inspectorTabs" :key="tab.id" :class="{ active: inspectorTab === tab.id }" @click="inspectorTab = tab.id">{{ t(tab.label) }}</button>
        </nav>

        <div v-if="inspectorTab === 'problems'" class="inspector-pane">
          <div class="pane-heading"><strong>{{ t('diagnostics') }}</strong><span>{{ analysis.diagnostics.length }}</span></div>
          <button v-for="item in analysis.diagnostics" :key="`${item.line}:${item.column}:${item.message}`" class="problem" @click="focusLine(item.line, item.column)"><i :class="item.severity"></i><span><strong>{{ item.message }}</strong><small>{{ t('lineColumn', { line: item.line, column: item.column }) }}</small></span></button>
          <p v-if="!analysis.diagnostics.length" class="empty-pane">✓ {{ t('noDiagnostics') }}</p>
        </div>

        <div v-else-if="inspectorTab === 'symbols'" class="inspector-pane">
          <div class="pane-heading"><strong>{{ t('symbols') }}</strong><button :disabled="!selectedIdentifier" @click="beginRenameSymbol">F2</button></div>
          <button v-for="symbol in analysis.symbols" :key="`${symbol.name}:${symbol.line}`" class="symbol" @click="focusLine(symbol.line, symbol.column)"><i>{{ symbol.kind === 'function' || symbol.kind === 'test' ? 'ƒ' : 'v' }}</i><span>{{ symbol.name }}</span><small>{{ symbol.line }}</small></button>
        </div>

        <div v-else-if="inspectorTab === 'modules'" class="inspector-pane">
          <div class="pane-heading"><strong>{{ t('scriptModules') }}</strong><span>{{ analysis.dependencies.length }}</span></div>
          <p class="pane-help">{{ t('moduleHelp') }}</p>
          <code v-for="dependency in analysis.dependencies" :key="dependency">{{ dependency }}</code>
          <div class="dependency-editor"><input v-model="packageDraft" :placeholder="t('packageDependency')" @keydown.enter="addPackage"><button @click="addPackage">＋</button></div>
          <label v-for="dependency in packageDependencies" :key="dependency"><span>◇ {{ dependency }}</span><button @click="removePackage(dependency)">×</button></label>
          <small>{{ t('readOnlyPackages') }}</small>
        </div>

        <div v-else-if="inspectorTab === 'debug'" class="inspector-pane debug-pane">
          <div class="pane-heading"><strong>{{ t('scriptDebugger') }}</strong><span :class="{ paused: debug.paused }">{{ debug.paused ? t('paused') : t('running') }}</span></div>
          <p>{{ debug.reason || t('debuggerWaiting') }}</p>
          <h3>{{ t('callStack') }}</h3><button v-for="frame in debug.callStack" :key="frame.entityUuid" @click="openAt(frame.scriptUuid, frame.line)">{{ frame.entityName }} · {{ frame.functionName }}:{{ frame.line }}</button>
          <h3>{{ t('locals') }}</h3><pre>{{ formattedLocals }}</pre>
          <h3>{{ t('watches') }}</h3><div class="dependency-editor"><input v-model="watchDraft" :placeholder="t('watchExpression')" @keydown.enter="addWatch"><button @click="addWatch">＋</button></div>
          <label v-for="watch in debug.watches" :key="watch.id"><span><b>{{ watch.expression }}</b><small :class="{ error: watch.error }">{{ watch.error || watch.value }}</small></span><button @click="removeDebugWatch(watch.id)">×</button></label>
        </div>

        <div v-else-if="inspectorTab === 'tests'" class="inspector-pane">
          <div class="pane-heading"><strong>{{ t('scriptTests') }}</strong><button @click="runTests">▷</button></div>
          <button v-for="result in debug.testResults" :key="`${result.script}:${result.test}`" class="test-result"><i :class="{ passed: result.passed }">{{ result.passed ? '✓' : '!' }}</i><span><strong>{{ result.test }}</strong><small>{{ result.script }} · {{ result.message }}</small></span></button>
          <p v-if="!debug.testResults.length" class="empty-pane">{{ t('noTestResults') }}</p>
        </div>

        <div v-else-if="inspectorTab === 'signals'" class="inspector-pane">
          <div class="pane-heading"><strong>{{ t('signals') }}</strong><span>{{ signals.length }}</span></div>
          <div class="dependency-editor"><input v-model="signalDraft" :placeholder="t('signalName')" @keydown.enter="addSignal"><button @click="addSignal">＋</button></div>
          <label v-for="signal in signals" :key="signal"><button class="emit" @click="runtime.emitSignal(signal)">●</button><span>{{ signal }}</span><button @click="removeSignal(signal)">×</button></label>
          <small>{{ t('signalSources') }}</small>
        </div>

        <div v-else class="inspector-pane api-reference">
          <div class="pane-heading"><strong>{{ t('engineApi') }}</strong><span>{{ filteredApi.length }}</span></div>
          <input v-model="apiQuery" type="search" :placeholder="t('searchApi')">
          <article v-for="entry in filteredApi" :key="entry.signature"><small>{{ entry.category }}</small><code>{{ entry.signature }}</code><p>{{ entry.detail }}</p></article>
        </div>
      </aside>
    </div>
    <div v-if="renameOpen" class="rename-overlay" @mousedown.self="renameOpen = false">
      <form class="rename-card" @submit.prevent="confirmRenameSymbol">
        <strong>{{ t('renameSymbol') }}</strong><p>{{ t('renameSymbolFrom', { name: renameSource }) }}</p>
        <input ref="renameInput" v-model="renameDraft" pattern="[A-Za-z_][A-Za-z0-9_]*" maxlength="80" required>
        <div><button type="button" @click="renameOpen = false">{{ t('cancel') }}</button><button class="primary" type="submit">{{ t('rename') }}</button></div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { createTextAsset, readTextAsset, updateTextAsset, assetState } from '../assets/AssetDatabase'
import { t } from '../i18n'
import { addEditorLog } from '../store/editor'
import { pushHistory } from '../store/physics'
import { requestConfirmation } from '../store/dialog'
import { DEFAULT_SCRIPT_SOURCE, gameplayRuntime as runtime } from '../runtime/GameplayRuntime'
import { scriptDebugState as debug, addDebugWatch, removeDebugWatch } from '../runtime/scriptDebug'
import { scriptProjectSettings } from '../runtime/scriptSettings'
import { SCRIPT_API, apiEntry } from '../editor/scriptApi'
import { ScriptLanguageService, analyzeScript, completionItems, type ScriptAnalysis } from '../editor/scriptLanguage'
import { closeScriptAsset, openScriptAsset, scriptStudioState } from '../editor/scriptStudioState'

const service = new ScriptLanguageService()
const editor = ref<HTMLTextAreaElement | null>(null), findInput = ref<HTMLInputElement | null>(null), renameInput = ref<HTMLInputElement | null>(null)
const drafts = reactive<Record<string, string>>({}), dirtyUuids = reactive(new Set<string>())
const draft = computed({ get: () => activeAsset.value ? drafts[activeAsset.value.uuid] ?? '' : '', set: value => { if (activeAsset.value) drafts[activeAsset.value.uuid] = value } })
const emptyAnalysis = (): ScriptAnalysis => ({ diagnostics: [], symbols: [], dependencies: [], functions: {} })
const analysis = ref<ScriptAnalysis>(emptyAnalysis()), validationError = ref('')
const projectQuery = ref(''), findOpen = ref(false), findText = ref(''), replaceText = ref(''), completionOpen = ref(false)
const cursor = reactive({ line: 1, column: 1 }), inspectorTab = ref<'problems' | 'symbols' | 'modules' | 'debug' | 'tests' | 'signals' | 'api'>('problems')
const packageDraft = ref(''), watchDraft = ref(''), signalDraft = ref(''), apiQuery = ref('')
const renameOpen = ref(false), renameSource = ref(''), renameDraft = ref('')
let analysisRevision = 0
const inspectorTabs = [
  { id: 'problems' as const, label: 'problems' }, { id: 'symbols' as const, label: 'symbols' }, { id: 'modules' as const, label: 'modules' },
  { id: 'debug' as const, label: 'debug' }, { id: 'tests' as const, label: 'tests' }, { id: 'signals' as const, label: 'signals' }, { id: 'api' as const, label: 'api' }
]
const scripts = computed(() => { void assetState.generation; return assetState.records.filter(asset => asset.assetType === 'script').sort((a, b) => a.path.localeCompare(b.path)) })
const activeAsset = computed(() => scripts.value.find(asset => asset.uuid === scriptStudioState.activeUuid) ?? null)
const activeDirty = computed(() => !!activeAsset.value && dirtyUuids.has(activeAsset.value.uuid))
const openAssets = computed(() => scriptStudioState.openTabs.flatMap(uuid => scripts.value.find(asset => asset.uuid === uuid) ?? []))
const filteredScripts = computed(() => { const q = projectQuery.value.trim().toLowerCase(); return q ? scripts.value.filter(asset => `${asset.name} ${asset.path}`.toLowerCase().includes(q)) : scripts.value })
const projectMatches = computed(() => {
  const q = projectQuery.value.trim().toLowerCase(); if (!q) return []
  return scripts.value.flatMap(asset => (drafts[asset.uuid] ?? readTextAsset(asset.uuid) ?? '').split(/\r?\n/).flatMap((line, index) => line.toLowerCase().includes(q) ? [{ uuid: asset.uuid, name: asset.name, line: index + 1, preview: line.trim().slice(0, 120) }] : [])).slice(0, 100)
})
const lineCount = computed(() => Math.max(1, draft.value.split(/\r?\n/).length))
const breakpoints = computed(() => activeAsset.value?.script?.breakpoints ?? [])
const diagnosticLines = computed(() => new Set(analysis.value.diagnostics.filter(item => item.severity === 'error').map(item => item.line)))
const packageDependencies = computed(() => activeAsset.value?.script?.packageDependencies ?? [])
const signals = computed(() => scriptProjectSettings.customSignals)
const completions = computed(() => completionItems(wordBeforeCursor.value))
const wordBeforeCursor = computed(() => { const pos = editor.value?.selectionStart ?? 0; return draft.value.slice(0, pos).match(/[A-Za-z_][A-Za-z0-9_]*$/)?.[0] ?? '' })
const selectedIdentifier = computed(() => { const el = editor.value; if (!el) return ''; const selected = draft.value.slice(el.selectionStart, el.selectionEnd); if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(selected)) return selected; const before = draft.value.slice(0, el.selectionStart).match(/[A-Za-z_][A-Za-z0-9_]*$/)?.[0] ?? ''; const after = draft.value.slice(el.selectionStart).match(/^[A-Za-z0-9_]*/)?.[0] ?? ''; return `${before}${after}` })
const contextApi = computed(() => apiEntry(selectedIdentifier.value || wordBeforeCursor.value))
const findCount = computed(() => findText.value ? (draft.value.match(new RegExp(escapeRegex(findText.value), 'gi')) ?? []).length : 0)
const formattedLocals = computed(() => JSON.stringify(debug.locals, null, 2).slice(0, 12000))
const filteredApi = computed(() => { const q = apiQuery.value.toLowerCase(); return q ? SCRIPT_API.filter(entry => `${entry.name} ${entry.category} ${entry.detail}`.toLowerCase().includes(q)) : SCRIPT_API })

watch(activeAsset, asset => { if (!asset) { analysis.value = emptyAnalysis(); return }; if (!(asset.uuid in drafts)) drafts[asset.uuid] = readTextAsset(asset.uuid) ?? ''; void analyzeCurrent() }, { immediate: true })
watch(findOpen, open => { if (open) void nextTick(() => findInput.value?.focus()) })
onMounted(() => { const selected = assetState.records.find(asset => asset.uuid === assetState.selectedGuid && asset.assetType === 'script'); if (selected) open(selected.uuid); else if (!activeAsset.value && scripts.value[0]) open(scripts.value[0].uuid) })
onBeforeUnmount(() => service.dispose())

function open(uuid: string) { openScriptAsset(uuid) }
function close(uuid: string) { if (dirtyUuids.has(uuid)) { scriptStudioState.activeUuid = uuid; return }; closeScriptAsset(uuid) }
function closeAll() { for (const uuid of [...scriptStudioState.openTabs]) close(uuid) }
function openAt(uuid: string, line: number) { open(uuid); void nextTick(() => focusLine(line, 1)) }
function createScript() { const asset = createTextAsset(t('newScriptName'), 'script', DEFAULT_SCRIPT_SOURCE, 'Assets/Scripts'); pushHistory('Create script asset'); open(asset.uuid); assetState.selectedGuid = asset.uuid; addEditorLog(t('scriptCreated', { name: asset.name }), 'Script') }
async function analyzeCurrent() { const revision = ++analysisRevision; const next = await service.analyze(draft.value); if (revision === analysisRevision) analysis.value = next }
function sourceChanged() { if (!activeAsset.value) return; dirtyUuids.add(activeAsset.value.uuid); validationError.value = ''; completionOpen.value = false; void analyzeCurrent(); cursorChanged() }
function cursorChanged() { const pos = editor.value?.selectionStart ?? 0; const before = draft.value.slice(0, pos); const lines = before.split(/\r?\n/); cursor.line = lines.length; cursor.column = (lines[lines.length - 1]?.length ?? 0) + 1 }
function syncScroll() { const gutter = document.querySelector<HTMLElement>('.script-studio .gutter'); if (gutter && editor.value) gutter.scrollTop = editor.value.scrollTop }
function insertTab() { replaceSelection('  ') }
function replaceSelection(value: string) { const el = editor.value; if (!el) return; const start = el.selectionStart, end = el.selectionEnd; draft.value = `${draft.value.slice(0, start)}${value}${draft.value.slice(end)}`; dirtyUuids.add(activeAsset.value!.uuid); void nextTick(() => { el.selectionStart = el.selectionEnd = start + value.length; el.focus(); sourceChanged() }) }
function requestCompletions() { completionOpen.value = true; editor.value?.focus() }
function insertCompletion(name: string) { const prefix = wordBeforeCursor.value; const el = editor.value; if (!el) return; el.selectionStart -= prefix.length; replaceSelection(name); completionOpen.value = false }
function focusLine(line: number, column = 1) { const el = editor.value; if (!el) return; const lines = draft.value.split(/\r?\n/); const pos = lines.slice(0, Math.max(0, line - 1)).reduce((sum, value) => sum + value.length + 1, 0) + Math.max(0, column - 1); el.focus(); el.setSelectionRange(pos, pos); el.scrollTop = Math.max(0, (line - 4) * 22); cursorChanged() }
function toggleBreakpoint(line: number) { const asset = activeAsset.value; if (!asset?.script) return; const index = asset.script.breakpoints.indexOf(line); if (index >= 0) asset.script.breakpoints.splice(index, 1); else asset.script.breakpoints.push(line); asset.script.breakpoints.sort((a, b) => a - b); pushHistory('Toggle script breakpoint', `script-breakpoint:${asset.uuid}`); assetState.generation++ }
async function saveActive() { const asset = activeAsset.value; if (!asset) return; const result = runtime.validateModuleSource(asset.uuid, draft.value); validationError.value = result.error ?? ''; if (result.error) { addEditorLog(result.error, 'Script', 'error', asset.uuid); inspectorTab.value = 'problems'; return }; asset.script ??= { version: 1, breakpoints: [], tests: [], packageDependencies: [] }; asset.script.tests = analysis.value.symbols.filter(symbol => symbol.kind === 'test').map(symbol => symbol.name); if (updateTextAsset(asset.uuid, draft.value)) { runtime.queueHotReload(asset.uuid, draft.value); dirtyUuids.delete(asset.uuid); pushHistory('Edit script asset', `script:${asset.uuid}`); addEditorLog(t('scriptSaved', { name: asset.name }), 'Script', 'info', asset.uuid) } }
function findNext() { const el = editor.value; if (!el || !findText.value) return; const lower = draft.value.toLowerCase(), needle = findText.value.toLowerCase(); let index = lower.indexOf(needle, el.selectionEnd); if (index < 0) index = lower.indexOf(needle); if (index >= 0) { el.focus(); el.setSelectionRange(index, index + needle.length); cursorChanged() } }
function replaceOne() { const el = editor.value; if (!el) return; if (draft.value.slice(el.selectionStart, el.selectionEnd).toLowerCase() !== findText.value.toLowerCase()) { findNext(); return }; replaceSelection(replaceText.value) }
function replaceAll() { if (!findText.value) return; draft.value = draft.value.replace(new RegExp(escapeRegex(findText.value), 'gi'), replaceText.value); sourceChanged() }
function beginRenameSymbol() { const name = selectedIdentifier.value; if (!name) return; renameSource.value = name; renameDraft.value = name; renameOpen.value = true; void nextTick(() => renameInput.value?.select()) }
async function confirmRenameSymbol() { const name = renameSource.value, replacement = renameDraft.value.trim(); if (!replacement || replacement === name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(replacement)) return; renameOpen.value = false; const approved = await requestConfirmation({ title: t('renameSymbol'), message: t('renameSymbolConfirm', { name, replacement }), confirmLabel: t('rename'), cancelLabel: t('cancel'), destructive: false }); if (!approved) return; const matcher = new RegExp(`\\b${escapeRegex(name)}\\b`, 'g'); const overrides = new Map<string, string>(); for (const asset of scripts.value) { const source = drafts[asset.uuid] ?? readTextAsset(asset.uuid) ?? ''; if (matcher.test(source)) overrides.set(asset.uuid, source.replace(matcher, replacement)); matcher.lastIndex = 0 } for (const [uuid, source] of overrides) { const validation = runtime.validateModuleSource(uuid, source, overrides); if (validation.error) { validationError.value = `${resolveName(uuid)}: ${validation.error}`; addEditorLog(validationError.value, 'Script', 'error', uuid); return } } for (const [uuid, source] of overrides) { drafts[uuid] = source; updateTextAsset(uuid, source); runtime.queueHotReload(uuid, source); dirtyUuids.delete(uuid) } pushHistory('Rename script symbol'); addEditorLog(t('symbolRenamed', { name, replacement }), 'Script') }
function goToDefinition() { const name = selectedIdentifier.value; if (!name) return; for (const asset of scripts.value) { const source = drafts[asset.uuid] ?? readTextAsset(asset.uuid) ?? ''; const symbol = analyzeScript(source).symbols.find(candidate => candidate.name === name); if (symbol) { openAt(asset.uuid, symbol.line); return } } }
function addPackage() { const asset = activeAsset.value, name = packageDraft.value.trim().slice(0, 256); if (!asset?.script || !name || asset.script.packageDependencies.includes(name)) return; asset.script.packageDependencies.push(name); packageDraft.value = ''; assetState.generation++; pushHistory('Add script package dependency') }
function removePackage(name: string) { const asset = activeAsset.value; if (!asset?.script) return; asset.script.packageDependencies = asset.script.packageDependencies.filter(value => value !== name); assetState.generation++; pushHistory('Remove script package dependency') }
function addWatch() { addDebugWatch(watchDraft.value); watchDraft.value = '' }
function addSignal() { const name = signalDraft.value.trim().slice(0, 128); if (!name || signals.value.includes(name)) return; signals.value.push(name); signalDraft.value = ''; pushHistory('Add custom signal') }
function removeSignal(name: string) { const index = signals.value.indexOf(name); if (index >= 0) { signals.value.splice(index, 1); pushHistory('Remove custom signal') } }
function runTests() { runtime.runScriptTests(activeAsset.value?.uuid); inspectorTab.value = 'tests' }
function resolveName(uuid: string) { return scripts.value.find(asset => asset.uuid === uuid)?.name ?? uuid }
function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
</script>

<style scoped>
.script-studio { position:absolute; inset:0; display:flex; flex-direction:column; min-width:0; min-height:0; color:var(--text-primary); background:var(--bg-base); font-size:13px; }
.studio-toolbar { min-height:58px; padding:8px 12px; display:flex; align-items:center; gap:16px; border-bottom:1px solid var(--border-subtle); background:var(--surface-1); }
.studio-title { min-width:220px; display:flex; align-items:center; gap:10px; }.studio-title div{display:grid;gap:2px}.studio-title strong{font-size:14px}.studio-title small{color:var(--text-muted);font-size:10px}.studio-mark{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;color:var(--accent);background:var(--accent-soft);font:700 13px ui-monospace,monospace}
.toolbar-actions{flex:1;display:flex;align-items:center;gap:6px;min-width:0;overflow-x:auto;scrollbar-width:thin}.toolbar-spacer{flex:1}.toolbar-actions button,.find-bar button,.pane-heading button,.dependency-editor button{min-height:32px;padding:0 11px;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-secondary);background:var(--surface-2);white-space:nowrap}.toolbar-actions button:hover,.toolbar-actions button.active{color:var(--text-primary);border-color:var(--accent);background:var(--accent-soft)}.toolbar-actions button.primary{color:var(--accent-contrast);background:var(--accent);border-color:var(--accent)}
.studio-grid{flex:1;min-height:0;display:grid;grid-template-columns:minmax(180px,230px) minmax(400px,1fr) minmax(230px,300px)}.project-scripts,.studio-inspector{min-height:0;overflow:hidden;background:var(--surface-1)}.project-scripts{padding:10px;border-right:1px solid var(--border-subtle);display:flex;flex-direction:column;gap:9px}.project-scripts>input,.api-reference>input,.dependency-editor input,.find-bar input{min-height:33px;padding:0 10px;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);background:var(--field-bg)}
.pane-heading{min-height:30px;display:flex;align-items:center;justify-content:space-between;gap:8px;text-transform:uppercase;letter-spacing:.06em;font-size:10px;color:var(--text-muted)}.pane-heading strong{font-size:10px}.pane-heading span{padding:2px 7px;border-radius:999px;background:var(--surface-3)}
.script-list,.search-results{display:grid;gap:3px;overflow:auto}.script-list{max-height:42%}.script-list button,.search-results button{width:100%;padding:7px;display:flex;align-items:center;gap:8px;text-align:left;border:1px solid transparent;border-radius:8px;color:var(--text-secondary);background:transparent;min-width:0}.script-list button:hover,.script-list button.active{background:var(--surface-3)}.script-list button.active{border-color:var(--accent);color:var(--text-primary)}.script-list button>span:last-child,.search-results button{min-width:0}.script-list strong,.script-list small,.search-results strong,.search-results small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.script-list strong,.search-results strong{font-size:12px}.script-list small,.search-results small{margin-top:2px;color:var(--text-muted);font-size:9px}.file-icon{width:25px;height:25px;display:grid;place-items:center;flex:0 0 auto;border-radius:7px;color:var(--accent);background:var(--accent-soft);font-weight:700}.search-results{padding-top:8px;border-top:1px solid var(--border-subtle)}.search-results button{display:block}
.code-workspace{min-width:0;min-height:0;display:flex;flex-direction:column;background:var(--bg-canvas)}.file-tabs{min-height:38px;display:flex;align-items:stretch;overflow-x:auto;border-bottom:1px solid var(--border-subtle);background:var(--surface-1)}.file-tabs>span{flex:1}.file-tabs button{padding:0 10px;display:flex;align-items:center;gap:6px;border:0;border-right:1px solid var(--border-subtle);color:var(--text-muted);background:transparent;white-space:nowrap}.file-tabs button.active{color:var(--text-primary);background:var(--bg-canvas);box-shadow:inset 0 2px var(--accent)}.file-tabs i{padding:2px 4px;font-style:normal}.dirty-dot{color:var(--accent);font-size:7px;visibility:hidden}.dirty-dot.visible{visibility:visible}.find-bar{padding:7px;display:flex;gap:5px;align-items:center;border-bottom:1px solid var(--border-subtle);background:var(--surface-2)}.find-bar input{width:min(210px,25%)}.find-bar span{color:var(--text-muted);font-size:10px}
.editor-shell{position:relative;flex:1;min-height:0;display:grid;grid-template-columns:54px 1fr;overflow:hidden}.gutter{padding-top:10px;overflow:hidden;border-right:1px solid var(--border-subtle);background:var(--surface-1)}.gutter button{width:100%;height:22px;padding:0 8px;display:flex;align-items:center;justify-content:flex-end;gap:6px;border:0;color:var(--text-muted);background:transparent;font:11px/22px ui-monospace,SFMono-Regular,Consolas,monospace}.gutter button span{width:7px;height:7px;border:1px solid transparent;border-radius:50%}.gutter button:hover span{border-color:var(--accent)}.gutter button.breakpoint span{border-color:var(--danger);background:var(--danger)}.gutter button.error{color:var(--danger)}.editor-shell textarea{width:100%;height:100%;padding:10px 16px;border:0;outline:0;resize:none;tab-size:2;white-space:pre;overflow:auto;color:var(--text-primary);caret-color:var(--accent);background:var(--bg-canvas);font:13px/22px ui-monospace,SFMono-Regular,Cascadia Code,Consolas,monospace}.completion-popover{position:absolute;left:90px;top:44px;z-index:4;width:250px;max-height:260px;padding:5px;display:grid;overflow:auto;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);box-shadow:var(--shadow-lg)}.completion-popover button{padding:6px 8px;display:flex;gap:8px;border:0;border-radius:6px;text-align:left;color:var(--text-primary);background:transparent}.completion-popover button:hover{background:var(--accent-soft)}.completion-popover b{color:var(--accent)}.signature-help{position:absolute;left:72px;bottom:12px;max-width:calc(100% - 100px);padding:8px 10px;display:grid;gap:4px;border:1px solid var(--border-subtle);border-radius:8px;background:color-mix(in srgb,var(--surface-2) 94%,transparent);box-shadow:var(--shadow-md)}.signature-help code{color:var(--accent)}.signature-help span{color:var(--text-muted);font-size:10px}.editor-status{min-height:28px;padding:0 10px;display:flex;align-items:center;gap:14px;justify-content:flex-end;border-top:1px solid var(--border-subtle);background:var(--surface-1);color:var(--text-muted);font-size:10px}.editor-status span:first-child{margin-right:auto}.status-ok{color:var(--success)}.status-error{color:var(--danger)}
.empty-editor{flex:1;display:grid;place-content:center;justify-items:center;text-align:center;color:var(--text-muted)}.empty-editor>span{font:700 34px ui-monospace;color:var(--accent)}.empty-editor h2{margin:12px 0 4px;color:var(--text-primary)}.empty-editor p{margin:0 0 14px}.empty-editor button{padding:9px 15px;border:0;border-radius:8px;background:var(--accent);color:var(--accent-contrast)}
.studio-inspector{border-left:1px solid var(--border-subtle);display:flex;flex-direction:column}.inspector-tabs{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--border-subtle)}.inspector-tabs button{min-height:31px;padding:0 4px;border:0;color:var(--text-muted);background:transparent;font-size:9px}.inspector-tabs button.active{color:var(--accent);box-shadow:inset 0 -2px var(--accent)}.inspector-pane{padding:10px;display:flex;flex-direction:column;gap:7px;overflow:auto}.empty-pane,.pane-help{color:var(--text-muted);font-size:11px;line-height:1.5}.problem,.symbol,.test-result{padding:7px;display:flex;align-items:flex-start;gap:8px;border:0;border-radius:7px;text-align:left;color:var(--text-secondary);background:transparent}.problem:hover,.symbol:hover{background:var(--surface-3)}.problem>span,.test-result>span{min-width:0;display:grid;gap:3px}.problem strong,.test-result strong{font-size:11px}.problem small,.test-result small{color:var(--text-muted);font-size:9px}.problem i{width:7px;height:7px;margin-top:4px;border-radius:50%;background:var(--warning)}.problem i.error{background:var(--danger)}.problem i.info{background:var(--accent)}.symbol i{width:18px;color:var(--accent);font-style:normal}.symbol span{flex:1}.symbol small{color:var(--text-muted)}.inspector-pane>code{padding:7px;border-radius:6px;overflow:hidden;text-overflow:ellipsis;background:var(--surface-2);color:var(--accent);font-size:10px}.dependency-editor{display:flex;gap:5px}.dependency-editor input{min-width:0;flex:1}.inspector-pane>label{min-height:34px;padding:5px 7px;display:flex;align-items:center;justify-content:space-between;gap:7px;border:1px solid var(--border-subtle);border-radius:7px}.inspector-pane>label span{min-width:0;display:grid;gap:2px}.inspector-pane>label small{overflow-wrap:anywhere;color:var(--text-muted)}.inspector-pane>label small.error{color:var(--danger)}.inspector-pane>label button,.emit{border:0;color:var(--text-muted);background:transparent}.emit{color:var(--accent)!important}.debug-pane p{padding:7px;border-radius:7px;background:var(--surface-2);color:var(--text-muted)}.debug-pane h3{margin:6px 0 0;font-size:10px;text-transform:uppercase;color:var(--text-muted)}.debug-pane pre{max-height:160px;margin:0;padding:8px;overflow:auto;border-radius:7px;background:var(--bg-canvas);font:10px/1.5 ui-monospace,monospace}.paused{color:var(--warning)}.test-result i{width:20px;height:20px;display:grid;place-items:center;border-radius:50%;font-style:normal;color:#fff;background:var(--danger)}.test-result i.passed{background:var(--success)}.api-reference article{padding:8px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-2)}.api-reference article small{color:var(--accent)}.api-reference article code{display:block;margin:5px 0;color:var(--text-primary);font-size:10px}.api-reference article p{margin:0;color:var(--text-muted);font-size:10px;line-height:1.45}
@media(max-width:1000px){.studio-grid{grid-template-columns:minmax(160px,190px) minmax(320px,1fr) minmax(220px,260px)}.studio-title{min-width:170px}.studio-title small{display:none}.inspector-tabs{grid-template-columns:repeat(3,1fr)}}
@media(max-width:800px){.studio-grid{grid-template-columns:minmax(340px,1fr) minmax(220px,250px)}.project-scripts{display:none}.studio-title{min-width:auto}.studio-title div{display:none}.toolbar-actions{overflow-x:auto}.editor-status span:nth-last-child(-n+2){display:none}}
@media(max-width:620px){.studio-grid{grid-template-columns:1fr;grid-template-rows:minmax(250px,1fr) minmax(170px,35%)}.code-workspace{grid-row:1}.studio-inspector{grid-row:2;border-top:1px solid var(--border-subtle);border-left:0}.studio-toolbar{gap:8px;padding-inline:8px}.studio-mark{width:30px;height:30px}.inspector-tabs{grid-template-columns:repeat(4,1fr)}.inspector-pane{padding:8px}.editor-shell{grid-template-columns:44px 1fr}.editor-shell textarea{padding-inline:10px}}
.rename-overlay{position:absolute;inset:0;z-index:20;display:grid;place-items:center;background:var(--scrim);backdrop-filter:blur(6px)}.rename-card{width:min(390px,calc(100% - 30px));padding:18px;display:grid;gap:10px;border:1px solid var(--border-strong);border-radius:14px;background:var(--surface-2);box-shadow:var(--shadow-lg)}.rename-card p{margin:0;color:var(--text-muted)}.rename-card>div{display:flex;justify-content:flex-end;gap:7px}.rename-card button{min-height:32px;padding:0 12px;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-secondary);background:var(--surface-3)}.rename-card button.primary{color:var(--accent-contrast);background:var(--accent);border-color:var(--accent)}
</style>
