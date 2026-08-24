<template>
  <section class="script-studio" @keydown.ctrl.s.prevent="saveActive" @keydown.meta.s.prevent="saveActive">
    <header class="studio-toolbar">
      <div class="studio-title"><span class="studio-mark">{ }</span><div><strong>{{ t('scriptStudio') }}</strong><small>{{ t('scriptStudioDescription') }}</small></div></div>
      <div class="toolbar-actions">
        <select v-model="templateId" :title="t('scriptTemplate')"><option v-for="template in SCRIPT_TEMPLATES" :key="template.id" :value="template.id">{{ template.name }}</option></select>
        <button @click="createScript">＋ {{ t('newScript') }}</button>
        <button :disabled="!activeAsset || !activeDirty" class="primary" @click="saveActive">{{ t('saveScript') }}</button>
        <button :class="{ active: findOpen }" @click="findOpen = !findOpen">{{ t('findReplace') }}</button>
        <button :disabled="!selectedIdentifier" @click="goToDefinition">F12 {{ t('goToDefinition') }}</button>
        <button :disabled="!activeAsset" @click="formatActive">{{ t('formatCode') }}</button>
        <button :disabled="!selectedIdentifier" @click="showReferences">{{ t('references') }}</button>
        <button @click="runTests">▷ {{ t('runTests') }}</button>
        <span class="toolbar-spacer"></span>
        <button :disabled="!debug.paused" @click="runtime.debugContinue">▶ {{ t('continueExecution') }}</button>
        <button :disabled="!debug.paused" @click="runtime.debugStep('into')">↓ {{ t('stepInto') }}</button>
        <button :disabled="!debug.paused" @click="runtime.debugStep('over')">↦ {{ t('stepOver') }}</button>
        <button :disabled="!debug.paused" @click="runtime.debugStep('out')">↑ {{ t('stepOut') }}</button>
        <button @click="runtime.debugRestart">↻ {{ t('restart') }}</button>
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
          <textarea ref="editor" v-model="draft" spellcheck="false" autocomplete="off" autocapitalize="off" @input="sourceChanged" @click="cursorChanged" @keyup="cursorChanged" @scroll="syncScroll" @keydown.tab.prevent="insertTab" @keydown.ctrl.space.prevent="requestCompletions" @keydown.meta.space.prevent="requestCompletions"></textarea>
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
          <span>Rhai API v1 · UTF-8</span><span>{{ t('engineVersion') }} 4.4.0</span>
        </footer>
      </main>

      <aside class="studio-inspector">
        <nav class="inspector-tabs">
          <button v-for="tab in inspectorTabs" :key="tab.id" :class="{ active: inspectorTab === tab.id }" @click="inspectorTab = tab.id">{{ t(tab.label) }}</button>
        </nav>

        <div v-if="inspectorTab === 'problems'" class="inspector-pane">
          <div class="pane-heading"><strong>{{ t('diagnostics') }}</strong><span>{{ analysis.diagnostics.length }}</span></div>
          <button v-for="item in analysis.diagnostics" :key="`${item.code}:${item.line}:${item.column}`" class="problem" @click="focusLine(item.line, item.column)"><i :class="item.severity"></i><span><strong>{{ item.message }}</strong><small>{{ item.code }} · {{ item.phase }} · {{ t('lineColumn', { line: item.line, column: item.column }) }}</small></span></button>
          <button v-for="action in codeActions" :key="`${action.code}:${action.line}`" class="code-action" @click="applyCodeAction(action)">⚡ {{ action.title }}</button>
          <p v-if="!analysis.diagnostics.length" class="empty-pane">✓ {{ t('noDiagnostics') }}</p>
        </div>

        <div v-else-if="inspectorTab === 'symbols'" class="inspector-pane">
          <div class="pane-heading"><strong>{{ t('outline') }}</strong><button :disabled="!selectedIdentifier" @click="beginRenameSymbol">F2</button></div>
          <button v-for="symbol in analysis.symbols" :key="`${symbol.name}:${symbol.line}`" class="symbol" @click="focusLine(symbol.line, symbol.column)"><i>{{ symbol.kind === 'function' || symbol.kind === 'test' ? 'ƒ' : 'v' }}</i><span>{{ symbol.name }}</span><small>{{ symbol.line }}</small></button>
          <h3 v-if="referenceResults.length">{{ t('references') }}</h3><button v-for="reference in referenceResults" :key="`${reference.uuid}:${reference.line}:${reference.column}`" class="symbol" @click="openAt(reference.uuid, reference.line)"><i>↗</i><span>{{ reference.name }}</span><small>{{ reference.line }}:{{ reference.column }}</small></button>
        </div>

        <div v-else-if="inspectorTab === 'modules'" class="inspector-pane">
          <div class="pane-heading"><strong>{{ t('scriptModules') }}</strong><span>{{ analysis.dependencies.length }}</span></div>
          <p class="pane-help">{{ t('moduleHelp') }}</p>
          <label><span>{{ t('scriptPackage') }}</span><input :value="activeAsset?.script?.packageName" maxlength="128" @change="setPackageName(($event.target as HTMLInputElement).value)"></label>
          <label><span>{{ t('hotReloadPolicy') }}</span><select :value="activeAsset?.script?.reloadPolicy" @change="setReloadPolicy(($event.target as HTMLSelectElement).value)"><option value="preserve">{{ t('preserveState') }}</option><option value="recreate">{{ t('recreateState') }}</option><option value="disabled">{{ t('disabled') }}</option></select></label>
          <p :class="['hot-reload-state', debug.hotReload.status]">{{ debug.hotReload.message || t('hotReloadWaiting') }}</p>
          <code v-for="dependency in analysis.dependencies" :key="dependency">{{ dependency }}</code>
          <div class="dependency-editor"><input v-model="packageDraft" :placeholder="t('packageDependency')" @keydown.enter="addPackage"><button @click="addPackage">＋</button></div>
          <label v-for="dependency in packageDependencies" :key="dependency"><span>◇ {{ dependency }}</span><button @click="removePackage(dependency)">×</button></label>
          <small>{{ t('readOnlyPackages') }}</small>
        </div>

        <div v-else-if="inspectorTab === 'debug'" class="inspector-pane debug-pane">
          <div class="pane-heading"><strong>{{ t('scriptDebugger') }}</strong><span :class="{ paused: debug.paused }">{{ debug.paused ? t('paused') : t('running') }}</span></div>
          <p>{{ debug.reason || t('debuggerWaiting') }}</p>
          <h3>{{ t('callStack') }}</h3><button v-for="frame in debug.callStack" :key="frame.entityUuid" @click="openAt(frame.scriptUuid, frame.line)">{{ frame.entityName }} · {{ frame.functionName }}:{{ frame.line }}</button>
          <h3>{{ t('breakpoints') }}</h3><article v-for="point in breakpointDetails" :key="point.id" class="breakpoint-detail"><label><input v-model="point.enabled" type="checkbox"><span>{{ point.line }}</span></label><input v-model="point.functionName" :placeholder="t('functionBreakpoint')"><input v-model="point.condition" :placeholder="t('condition')"><input v-model.number="point.hitCondition" type="number" min="0" max="1000000" :placeholder="t('hitCount')"><input v-model="point.logMessage" :placeholder="t('logpointMessage')"><button @click="removeDetailedBreakpoint(point.id)">×</button></article>
          <button @click="addFunctionBreakpoint">＋ {{ t('functionBreakpoint') }}</button>
          <h3>{{ t('locals') }}</h3><pre>{{ formattedLocals }}</pre>
          <h3>{{ t('watches') }}</h3><div class="dependency-editor"><input v-model="watchDraft" :placeholder="t('watchExpression')" @keydown.enter="addWatch"><button @click="addWatch">＋</button></div>
          <label v-for="watch in debug.watches" :key="watch.id"><span><b>{{ watch.expression }}</b><small :class="{ error: watch.error }">{{ watch.error || watch.value }}</small></span><button @click="removeDebugWatch(watch.id)">×</button></label>
        </div>

        <div v-else-if="inspectorTab === 'tests'" class="inspector-pane">
          <div class="pane-heading"><strong>{{ t('scriptTests') }}</strong><button @click="runTests">▷</button></div>
          <article v-for="result in debug.testResults" :key="`${result.script}:${result.test}:${result.caseName}`" class="test-result"><i :class="{ passed: result.passed, skipped: result.skipped }">{{ result.skipped ? '–' : result.passed ? '✓' : '!' }}</i><span><strong>{{ result.test }}{{ result.caseName ? ` · ${result.caseName}` : '' }}</strong><small>{{ result.script }} · {{ result.durationMs.toFixed(2) }} ms · seed {{ result.seed }} · {{ result.message }}</small><small v-if="result.tags.length">#{{ result.tags.join(' #') }}</small></span></article>
          <p v-if="!debug.testResults.length" class="empty-pane">{{ t('noTestResults') }}</p>
        </div>

        <div v-else-if="inspectorTab === 'signals'" class="inspector-pane">
          <div class="pane-heading"><strong>{{ t('signals') }}</strong><span>{{ signals.length }}</span></div>
          <div class="dependency-editor"><input v-model="signalDraft" :placeholder="t('signalName')" @keydown.enter="addSignal"><button @click="addSignal">＋</button></div>
          <label v-for="signal in signals" :key="signal"><button class="emit" @click="runtime.emitSignal(signal)">●</button><span>{{ signal }}</span><button @click="removeSignal(signal)">×</button></label>
          <div class="dependency-editor"><input v-model="connectionSignalDraft" :placeholder="t('signalName')"><input v-model="connectionCallbackDraft" :placeholder="t('callback')"><button @click="addSignalConnection">＋</button></div>
          <label v-for="(connection,index) in signalConnections" :key="`${connection.signal}:${connection.callback}:${index}`"><input v-model="connection.enabled" type="checkbox"><span>{{ connection.signal }} → {{ connection.callback }}</span><button @click="removeSignalConnection(index)">×</button></label>
          <small>{{ t('signalSources') }}</small>
        </div>

        <div v-else class="inspector-pane api-reference">
          <div class="pane-heading"><strong>{{ t('engineApi') }}</strong><span>{{ filteredApi.length }}</span></div>
          <input v-model="apiQuery" type="search" :placeholder="t('searchApi')">
          <article v-for="entry in filteredApi" :key="entry.signature"><small>{{ entry.namespace }} · API {{ entry.since }}</small><code>{{ entry.signature }}</code><p>{{ entry.detail }}</p><pre>{{ entry.example }}</pre><b v-if="entry.deprecated">{{ t('deprecated') }} → {{ entry.deprecated.replacement }} ({{ entry.deprecated.removal }})</b><button @click="openBundledManual">{{ t('documentation') }}</button></article>
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
import { defaultScriptMetadata, type ScriptBreakpointMetadata } from '../assets/types'
import { t } from '../i18n'
import { addEditorLog } from '../store/editor'
import { pushHistory } from '../store/physics'
import { requestConfirmation } from '../store/dialog'
import { gameplayRuntime as runtime } from '../runtime/GameplayRuntime'
import { scriptDebugState as debug, addDebugWatch, removeDebugWatch } from '../runtime/scriptDebug'
import { scriptProjectSettings } from '../runtime/scriptSettings'
import { SCRIPT_API, apiEntry } from '../editor/scriptApi'
import { ScriptLanguageService, analyzeScript, completionItems, type ScriptAnalysis } from '../editor/scriptLanguage'
import { closeScriptAsset, openScriptAsset, scriptStudioState } from '../editor/scriptStudioState'
import { findScriptReferences, formatScript, scriptCodeActions, type ScriptCodeAction } from '../editor/scriptLanguage'
import { openBundledManual } from '../runtime/openManual'
import { SCRIPT_TEMPLATES, scriptTemplate, type ScriptTemplateId } from '../editor/scriptTemplates'

const service = new ScriptLanguageService()
const editor = ref<HTMLTextAreaElement | null>(null), findInput = ref<HTMLInputElement | null>(null), renameInput = ref<HTMLInputElement | null>(null)
const drafts = reactive<Record<string, string>>({}), dirtyUuids = reactive(new Set<string>())
const draft = computed({ get: () => activeAsset.value ? drafts[activeAsset.value.uuid] ?? '' : '', set: value => { if (activeAsset.value) drafts[activeAsset.value.uuid] = value } })
const emptyAnalysis = (): ScriptAnalysis => ({ diagnostics: [], symbols: [], dependencies: [], functions: {}, references: [], tests: [], semanticTokens: [], apiUsage: [] })
const analysis = ref<ScriptAnalysis>(emptyAnalysis()), validationError = ref('')
const projectQuery = ref(''), findOpen = ref(false), findText = ref(''), replaceText = ref(''), completionOpen = ref(false)
const templateId = ref<ScriptTemplateId>('component')
const cursor = reactive({ line: 1, column: 1 }), inspectorTab = ref<'problems' | 'symbols' | 'modules' | 'debug' | 'tests' | 'signals' | 'api'>('problems')
const packageDraft = ref(''), watchDraft = ref(''), signalDraft = ref(''), connectionSignalDraft = ref(''), connectionCallbackDraft = ref(''), apiQuery = ref('')
const renameOpen = ref(false), renameSource = ref(''), renameDraft = ref('')
const referenceResults = ref<Array<{ uuid: string; name: string; line: number; column: number }>>([])
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
const breakpointDetails = computed(() => activeAsset.value?.script?.breakpointDetails ?? [])
const diagnosticLines = computed(() => new Set(analysis.value.diagnostics.filter(item => item.severity === 'error').map(item => item.line)))
const packageDependencies = computed(() => activeAsset.value?.script?.packageDependencies ?? [])
const signals = computed(() => scriptProjectSettings.customSignals)
const signalConnections = computed(() => activeAsset.value?.script?.signalConnections ?? [])
const completions = computed(() => completionItems(wordBeforeCursor.value, analysis.value))
const codeActions = computed(() => scriptCodeActions(analysis.value))
const wordBeforeCursor = computed(() => { const pos = editor.value?.selectionStart ?? 0; return draft.value.slice(0, pos).match(/[A-Za-z_][A-Za-z0-9_]*$/)?.[0] ?? '' })
const selectedIdentifier = computed(() => { const el = editor.value; if (!el) return ''; const selected = draft.value.slice(el.selectionStart, el.selectionEnd); if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(selected)) return selected; const before = draft.value.slice(0, el.selectionStart).match(/[A-Za-z_][A-Za-z0-9_]*$/)?.[0] ?? ''; const after = draft.value.slice(el.selectionStart).match(/^[A-Za-z0-9_]*/)?.[0] ?? ''; return `${before}${after}` })
const contextApi = computed(() => apiEntry(selectedIdentifier.value || wordBeforeCursor.value))
const findCount = computed(() => findText.value ? (draft.value.match(new RegExp(escapeRegex(findText.value), 'gi')) ?? []).length : 0)
const formattedLocals = computed(() => JSON.stringify(debug.locals, null, 2).slice(0, 12000))
const filteredApi = computed(() => { const q = apiQuery.value.toLowerCase(); return q ? SCRIPT_API.filter(entry => `${entry.name} ${entry.category} ${entry.detail}`.toLowerCase().includes(q)) : SCRIPT_API })

watch(activeAsset, asset => { if (!asset) { analysis.value = emptyAnalysis(); return }; if (!(asset.uuid in drafts)) { const saved = readTextAsset(asset.uuid) ?? '', recovery = asset.script?.recoverySource ?? ''; drafts[asset.uuid] = recovery && recovery !== saved ? recovery : saved; if (recovery && recovery !== saved) dirtyUuids.add(asset.uuid) } void analyzeCurrent() }, { immediate: true })
watch(findOpen, open => { if (open) void nextTick(() => findInput.value?.focus()) })
onMounted(() => { const selected = assetState.records.find(asset => asset.uuid === assetState.selectedGuid && asset.assetType === 'script'); if (selected) open(selected.uuid); else if (!activeAsset.value && scripts.value[0]) open(scripts.value[0].uuid) })
onBeforeUnmount(() => service.dispose())

function open(uuid: string) { openScriptAsset(uuid) }
function close(uuid: string) { if (dirtyUuids.has(uuid)) { scriptStudioState.activeUuid = uuid; return }; closeScriptAsset(uuid) }
function closeAll() { for (const uuid of [...scriptStudioState.openTabs]) close(uuid) }
function openAt(uuid: string, line: number) { open(uuid); void nextTick(() => focusLine(line, 1)) }
function createScript() { const template = scriptTemplate(templateId.value), asset = createTextAsset(`${template.name} ${t('newScriptName')}`, 'script', template.source, 'Assets/Scripts'); pushHistory('Create script asset'); open(asset.uuid); assetState.selectedGuid = asset.uuid; addEditorLog(t('scriptCreated', { name: asset.name }), 'Script') }
async function analyzeCurrent() { const revision = ++analysisRevision; const next = await service.analyze(draft.value); if (revision === analysisRevision) analysis.value = next }
function sourceChanged() { const asset = activeAsset.value; if (!asset) return; asset.script ??= defaultScriptMetadata(); asset.script.recoverySource = draft.value.slice(0, 1_000_000); dirtyUuids.add(asset.uuid); validationError.value = ''; void analyzeCurrent(); cursorChanged(); void nextTick(() => { completionOpen.value = wordBeforeCursor.value.length >= 2 && completions.value.length > 0 }) }
function cursorChanged() { const pos = editor.value?.selectionStart ?? 0; const before = draft.value.slice(0, pos); const lines = before.split(/\r?\n/); cursor.line = lines.length; cursor.column = (lines[lines.length - 1]?.length ?? 0) + 1 }
function syncScroll() { const gutter = document.querySelector<HTMLElement>('.script-studio .gutter'); if (gutter && editor.value) gutter.scrollTop = editor.value.scrollTop }
function insertTab() { replaceSelection('  ') }
function replaceSelection(value: string) { const el = editor.value; if (!el) return; const start = el.selectionStart, end = el.selectionEnd; draft.value = `${draft.value.slice(0, start)}${value}${draft.value.slice(end)}`; dirtyUuids.add(activeAsset.value!.uuid); void nextTick(() => { el.selectionStart = el.selectionEnd = start + value.length; el.focus(); sourceChanged() }) }
function requestCompletions() { completionOpen.value = true; editor.value?.focus() }
function insertCompletion(name: string) { const prefix = wordBeforeCursor.value; const el = editor.value; if (!el) return; el.selectionStart -= prefix.length; replaceSelection(name); completionOpen.value = false }
function focusLine(line: number, column = 1) { const el = editor.value; if (!el) return; const lines = draft.value.split(/\r?\n/); const pos = lines.slice(0, Math.max(0, line - 1)).reduce((sum, value) => sum + value.length + 1, 0) + Math.max(0, column - 1); el.focus(); el.setSelectionRange(pos, pos); el.scrollTop = Math.max(0, (line - 4) * 22); cursorChanged() }
function toggleBreakpoint(line: number) { const asset = activeAsset.value; if (!asset) return; asset.script ??= defaultScriptMetadata(); const index = asset.script.breakpoints.indexOf(line); if (index >= 0) { asset.script.breakpoints.splice(index, 1); asset.script.breakpointDetails = asset.script.breakpointDetails.filter(point => point.line !== line || point.functionName) } else { asset.script.breakpoints.push(line); asset.script.breakpointDetails.push({ id: `line-${line}-${Date.now()}`, line, functionName: '', condition: '', hitCondition: 0, logMessage: '', enabled: true, hitCount: 0 }) } asset.script.breakpoints.sort((a, b) => a - b); pushHistory('Toggle script breakpoint', `script-breakpoint:${asset.uuid}`); assetState.generation++ }
async function saveActive() { const asset = activeAsset.value; if (!asset) return; const result = runtime.validateModuleSource(asset.uuid, draft.value); validationError.value = result.error ?? ''; if (result.error) { addEditorLog(result.error, 'Script', 'error', asset.uuid); inspectorTab.value = 'problems'; return }; asset.script ??= defaultScriptMetadata(); asset.script.tests = analysis.value.tests.map(test => test.name); asset.script.recoverySource = ''; asset.script.lastSavedHash = sourceHash(draft.value); if (updateTextAsset(asset.uuid, draft.value)) { runtime.queueHotReload(asset.uuid, draft.value); dirtyUuids.delete(asset.uuid); pushHistory('Edit script asset', `script:${asset.uuid}`); addEditorLog(t('scriptSaved', { name: asset.name }), 'Script', 'info', asset.uuid) } }
function findNext() { const el = editor.value; if (!el || !findText.value) return; const lower = draft.value.toLowerCase(), needle = findText.value.toLowerCase(); let index = lower.indexOf(needle, el.selectionEnd); if (index < 0) index = lower.indexOf(needle); if (index >= 0) { el.focus(); el.setSelectionRange(index, index + needle.length); cursorChanged() } }
function replaceOne() { const el = editor.value; if (!el) return; if (draft.value.slice(el.selectionStart, el.selectionEnd).toLowerCase() !== findText.value.toLowerCase()) { findNext(); return }; replaceSelection(replaceText.value) }
function replaceAll() { if (!findText.value) return; draft.value = draft.value.replace(new RegExp(escapeRegex(findText.value), 'gi'), replaceText.value); sourceChanged() }
function beginRenameSymbol() { const name = selectedIdentifier.value; if (!name) return; renameSource.value = name; renameDraft.value = name; renameOpen.value = true; void nextTick(() => renameInput.value?.select()) }
async function confirmRenameSymbol() { const name = renameSource.value, replacement = renameDraft.value.trim(); if (!replacement || replacement === name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(replacement)) return; renameOpen.value = false; const approved = await requestConfirmation({ title: t('renameSymbol'), message: t('renameSymbolConfirm', { name, replacement }), confirmLabel: t('rename'), cancelLabel: t('cancel'), destructive: false }); if (!approved) return; const matcher = new RegExp(`\\b${escapeRegex(name)}\\b`, 'g'); const overrides = new Map<string, string>(); for (const asset of scripts.value) { const source = drafts[asset.uuid] ?? readTextAsset(asset.uuid) ?? ''; if (matcher.test(source)) overrides.set(asset.uuid, source.replace(matcher, replacement)); matcher.lastIndex = 0 } for (const [uuid, source] of overrides) { const validation = runtime.validateModuleSource(uuid, source, overrides); if (validation.error) { validationError.value = `${resolveName(uuid)}: ${validation.error}`; addEditorLog(validationError.value, 'Script', 'error', uuid); return } } for (const [uuid, source] of overrides) { drafts[uuid] = source; updateTextAsset(uuid, source); runtime.queueHotReload(uuid, source); dirtyUuids.delete(uuid) } pushHistory('Rename script symbol'); addEditorLog(t('symbolRenamed', { name, replacement }), 'Script') }
function goToDefinition() { const name = selectedIdentifier.value; if (!name) return; for (const asset of scripts.value) { const source = drafts[asset.uuid] ?? readTextAsset(asset.uuid) ?? ''; const symbol = analyzeScript(source).symbols.find(candidate => candidate.name === name); if (symbol) { openAt(asset.uuid, symbol.line); return } } }
function showReferences() { const name = selectedIdentifier.value; if (!name) return; referenceResults.value = scripts.value.flatMap(asset => findScriptReferences(drafts[asset.uuid] ?? readTextAsset(asset.uuid) ?? '', name).map(reference => ({ uuid: asset.uuid, name: asset.name, line: reference.line, column: reference.column }))); inspectorTab.value = 'symbols' }
function formatActive() { if (!activeAsset.value) return; const formatted = formatScript(draft.value); if (formatted !== draft.value) { draft.value = formatted; sourceChanged(); pushHistory('Format script', `script-format:${activeAsset.value.uuid}`) } }
function applyCodeAction(action: ScriptCodeAction) { if (action.code === 'NOVA-COMPAT-001') { focusLine(action.line); const deprecated = analysis.value.diagnostics.find(item => item.line === action.line && item.code === action.code)?.message.match(/“([^”]+)”/)?.[1]; if (deprecated) { draft.value = draft.value.replace(new RegExp(`\\b${escapeRegex(deprecated)}\\b`, 'g'), action.replacement); sourceChanged() } } else if (action.code === 'NOVA-PARSE-003') { draft.value = `${draft.value.replace(/\s*$/, '')}\n${action.replacement}\n`; sourceChanged() } }
function addPackage() { const asset = activeAsset.value, name = packageDraft.value.trim().slice(0, 256); if (!asset?.script || !name || asset.script.packageDependencies.includes(name)) return; asset.script.packageDependencies.push(name); packageDraft.value = ''; assetState.generation++; pushHistory('Add script package dependency') }
function removePackage(name: string) { const asset = activeAsset.value; if (!asset?.script) return; asset.script.packageDependencies = asset.script.packageDependencies.filter(value => value !== name); assetState.generation++; pushHistory('Remove script package dependency') }
function setPackageName(value: string) { const asset = activeAsset.value; if (!asset) return; asset.script ??= defaultScriptMetadata(); asset.script.packageName = value.trim().slice(0, 128); assetState.generation++; pushHistory('Set script package') }
function setReloadPolicy(value: string) { const asset = activeAsset.value; if (!asset || !['preserve', 'recreate', 'disabled'].includes(value)) return; asset.script ??= defaultScriptMetadata(); asset.script.reloadPolicy = value as 'preserve' | 'recreate' | 'disabled'; assetState.generation++; pushHistory('Set hot reload policy') }
function addFunctionBreakpoint() { const asset = activeAsset.value; if (!asset) return; asset.script ??= defaultScriptMetadata(); const point: ScriptBreakpointMetadata = { id: `function-${Date.now()}`, line: cursor.line, functionName: analysis.value.symbols.find(symbol => symbol.kind === 'function' && symbol.line <= cursor.line && symbol.endLine >= cursor.line)?.name ?? '', condition: '', hitCondition: 0, logMessage: '', enabled: true, hitCount: 0 }; asset.script.breakpointDetails.push(point); assetState.generation++; pushHistory('Add function breakpoint') }
function removeDetailedBreakpoint(id: string) { const asset = activeAsset.value; if (!asset?.script) return; const point = asset.script.breakpointDetails.find(item => item.id === id); asset.script.breakpointDetails = asset.script.breakpointDetails.filter(item => item.id !== id); if (point && !asset.script.breakpointDetails.some(item => item.line === point.line)) asset.script.breakpoints = asset.script.breakpoints.filter(line => line !== point.line); assetState.generation++; pushHistory('Remove script breakpoint') }
function addWatch() { addDebugWatch(watchDraft.value); watchDraft.value = '' }
function addSignal() { const name = signalDraft.value.trim().slice(0, 128); if (!name || signals.value.includes(name)) return; signals.value.push(name); signalDraft.value = ''; pushHistory('Add custom signal') }
function removeSignal(name: string) { const index = signals.value.indexOf(name); if (index >= 0) { signals.value.splice(index, 1); pushHistory('Remove custom signal') } }
function addSignalConnection() { const asset = activeAsset.value, signal = connectionSignalDraft.value.trim().slice(0, 128), callback = connectionCallbackDraft.value.trim().slice(0, 80); if (!asset || !signal || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(callback)) return; asset.script ??= defaultScriptMetadata(); asset.script.signalConnections.push({ signal, callback, source: '', target: '', enabled: true }); connectionSignalDraft.value = ''; connectionCallbackDraft.value = ''; assetState.generation++; pushHistory('Connect script signal') }
function removeSignalConnection(index: number) { const asset = activeAsset.value; if (!asset?.script) return; asset.script.signalConnections.splice(index, 1); assetState.generation++; pushHistory('Disconnect script signal') }
function runTests() { runtime.runScriptTests(activeAsset.value?.uuid); inspectorTab.value = 'tests' }
function resolveName(uuid: string) { return scripts.value.find(asset => asset.uuid === uuid)?.name ?? uuid }
function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
function sourceHash(value: string) { let hash = 2166136261; for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0; return hash.toString(16).padStart(8, '0') }
</script>

<style scoped>
.script-studio { position:absolute; inset:0; display:flex; flex-direction:column; min-width:0; min-height:0; color:var(--text-primary); background:var(--bg-base); font-size:13px; }
.studio-toolbar { min-height:58px; padding:8px 12px; display:flex; flex-wrap:wrap; align-items:center; gap:8px 16px; border-bottom:1px solid var(--border-subtle); background:var(--surface-1); }
.studio-title { min-width:220px; display:flex; align-items:center; gap:10px; }.studio-title div{display:grid;gap:2px}.studio-title strong{font-size:14px}.studio-title small{color:var(--text-muted);font-size:11px}.studio-mark{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;color:var(--accent);background:var(--accent-soft);font:700 13px var(--font-mono)}
.toolbar-actions{flex:1;display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:min(100%,620px);overflow:visible}.toolbar-spacer{flex:1 1 16px}.toolbar-actions button,.find-bar button,.pane-heading button,.dependency-editor button{min-height:32px;padding:0 10px;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-secondary);background:var(--surface-2);white-space:nowrap}.toolbar-actions button:hover,.toolbar-actions button.active{color:var(--text-primary);border-color:var(--accent);background:var(--accent-soft)}.toolbar-actions button.primary{color:var(--accent-contrast);background:var(--accent);border-color:var(--accent)}
.studio-grid{flex:1;min-height:0;display:grid;grid-template-columns:clamp(176px,17vw,224px) minmax(340px,1fr) clamp(248px,22vw,328px)}.project-scripts,.studio-inspector{min-width:0;min-height:0;overflow:hidden;background:var(--surface-1)}.project-scripts{padding:10px;border-right:1px solid var(--border-subtle);display:flex;flex-direction:column;gap:9px}.project-scripts>input,.api-reference>input,.dependency-editor input,.find-bar input,.inspector-pane input,.inspector-pane select{min-width:0;min-height:33px;padding:0 10px;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);background:var(--field-bg)}
.pane-heading{min-height:30px;display:flex;align-items:center;justify-content:space-between;gap:8px;text-transform:uppercase;letter-spacing:.06em;font-size:11px;color:var(--text-muted)}.pane-heading strong{font-size:11px}.pane-heading span{padding:2px 7px;border-radius:999px;background:var(--surface-3)}
.script-list,.search-results{display:grid;gap:3px;overflow:auto}.script-list{max-height:42%}.script-list button,.search-results button{width:100%;padding:7px;display:flex;align-items:center;gap:8px;text-align:left;border:1px solid transparent;border-radius:8px;color:var(--text-secondary);background:transparent;min-width:0}.script-list button:hover,.script-list button.active{background:var(--surface-3)}.script-list button.active{border-color:var(--accent);color:var(--text-primary)}.script-list button>span:last-child,.search-results button{min-width:0}.script-list strong,.script-list small,.search-results strong,.search-results small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.script-list strong,.search-results strong{font-size:12px}.script-list small,.search-results small{margin-top:2px;color:var(--text-muted);font-size:11px}.file-icon{width:25px;height:25px;display:grid;place-items:center;flex:0 0 auto;border-radius:7px;color:var(--accent);background:var(--accent-soft);font-weight:700}.search-results{padding-top:8px;border-top:1px solid var(--border-subtle)}.search-results button{display:block}
.code-workspace{min-width:0;min-height:0;display:flex;flex-direction:column;background:var(--bg-canvas)}.file-tabs{min-height:38px;display:flex;align-items:stretch;overflow-x:auto;border-bottom:1px solid var(--border-subtle);background:var(--surface-1)}.file-tabs>span{flex:1}.file-tabs button{padding:0 10px;display:flex;align-items:center;gap:6px;border:0;border-right:1px solid var(--border-subtle);color:var(--text-muted);background:transparent;white-space:nowrap}.file-tabs button.active{color:var(--text-primary);background:var(--bg-canvas);box-shadow:inset 0 2px var(--accent)}.file-tabs i{padding:2px 4px;font-style:normal}.dirty-dot{color:var(--accent);font-size:11px;visibility:hidden}.dirty-dot.visible{visibility:visible}.find-bar{padding:7px;display:flex;gap:5px;align-items:center;border-bottom:1px solid var(--border-subtle);background:var(--surface-2)}.find-bar input{width:min(210px,25%)}.find-bar span{color:var(--text-muted);font-size:11px}
.editor-shell{position:relative;flex:1;min-height:0;display:grid;grid-template-columns:54px 1fr;overflow:hidden}.gutter{padding-top:10px;overflow:hidden;border-right:1px solid var(--border-subtle);background:var(--surface-1)}.gutter button{width:100%;height:22px;padding:0 8px;display:flex;align-items:center;justify-content:flex-end;gap:6px;border:0;color:var(--text-muted);background:transparent;font:11px/22px var(--font-mono)}.gutter button span{width:7px;height:7px;border:1px solid transparent;border-radius:50%}.gutter button:hover span{border-color:var(--accent)}.gutter button.breakpoint span{border-color:var(--danger);background:var(--danger)}.gutter button.error{color:var(--danger)}.editor-shell textarea{width:100%;height:100%;padding:10px 16px;border:0;outline:0;resize:none;tab-size:2;white-space:pre;overflow:auto;color:var(--text-primary);caret-color:var(--accent);background:var(--bg-canvas);font:13px/22px var(--font-mono)}.completion-popover{position:absolute;left:90px;top:44px;z-index:4;width:250px;max-height:260px;padding:5px;display:grid;overflow:auto;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);box-shadow:var(--shadow-lg)}.completion-popover button{padding:6px 8px;display:flex;gap:8px;border:0;border-radius:6px;text-align:left;color:var(--text-primary);background:transparent}.completion-popover button:hover{background:var(--accent-soft)}.completion-popover b{color:var(--accent)}.signature-help{position:absolute;left:72px;bottom:12px;max-width:calc(100% - 100px);padding:8px 10px;display:grid;gap:4px;border:1px solid var(--border-subtle);border-radius:8px;background:color-mix(in srgb,var(--surface-2) 94%,transparent);box-shadow:var(--shadow-md)}.signature-help code{color:var(--accent)}.signature-help span{color:var(--text-muted);font-size:11px}.editor-status{min-height:28px;padding:0 10px;display:flex;align-items:center;gap:14px;justify-content:flex-end;border-top:1px solid var(--border-subtle);background:var(--surface-1);color:var(--text-muted);font-size:11px}.editor-status span:first-child{margin-right:auto}.status-ok{color:var(--success)}.status-error{color:var(--danger)}
.empty-editor{flex:1;display:grid;place-content:center;justify-items:center;text-align:center;color:var(--text-muted)}.empty-editor>span{font:700 34px var(--font-mono);color:var(--accent)}.empty-editor h2{margin:12px 0 4px;color:var(--text-primary)}.empty-editor p{margin:0 0 14px}.empty-editor button{padding:9px 15px;border:0;border-radius:8px;background:var(--accent);color:var(--accent-contrast)}
.studio-inspector{border-left:1px solid var(--border-subtle);display:flex;flex-direction:column}.inspector-tabs{display:grid;grid-template-columns:repeat(auto-fit,minmax(76px,1fr));border-bottom:1px solid var(--border-subtle)}.inspector-tabs button{min-width:0;min-height:31px;padding:3px 5px;border:0;color:var(--text-muted);background:transparent;font-size:11px;line-height:1.2;overflow-wrap:anywhere}.inspector-tabs button.active{color:var(--accent);box-shadow:inset 0 -2px var(--accent)}.inspector-pane{min-height:0;padding:10px;display:flex;flex-direction:column;gap:7px;overflow:auto}.empty-pane,.pane-help{color:var(--text-muted);font-size:11px;line-height:1.5}.problem,.symbol,.test-result{padding:7px;display:flex;align-items:flex-start;gap:8px;border:0;border-radius:7px;text-align:left;color:var(--text-secondary);background:transparent}.problem:hover,.symbol:hover{background:var(--surface-3)}.problem>span,.test-result>span{min-width:0;display:grid;gap:3px}.problem strong,.test-result strong{font-size:11px}.problem small,.test-result small{color:var(--text-muted);font-size:11px;overflow-wrap:anywhere}.problem i{width:7px;height:7px;margin-top:4px;flex:0 0 auto;border-radius:50%;background:var(--warning)}.problem i.error{background:var(--danger)}.problem i.info{background:var(--accent)}.symbol i{width:18px;color:var(--accent);font-style:normal}.symbol span{min-width:0;flex:1;overflow-wrap:anywhere}.symbol small{color:var(--text-muted)}.inspector-pane>code{padding:7px;border-radius:6px;overflow:hidden;text-overflow:ellipsis;background:var(--surface-2);color:var(--accent);font-size:11px}.dependency-editor{display:flex;flex-wrap:wrap;gap:5px}.dependency-editor input{min-width:110px;flex:1}.inspector-pane>label{min-height:34px;padding:5px 7px;display:flex;align-items:center;justify-content:space-between;gap:7px;border:1px solid var(--border-subtle);border-radius:7px}.inspector-pane>label span{min-width:0;display:grid;gap:2px;overflow-wrap:anywhere}.inspector-pane>label small{overflow-wrap:anywhere;color:var(--text-muted)}.inspector-pane>label small.error{color:var(--danger)}.inspector-pane>label button,.emit{border:0;color:var(--text-muted);background:transparent}.emit{color:var(--accent)!important}.debug-pane p{padding:7px;border-radius:7px;background:var(--surface-2);color:var(--text-muted)}.debug-pane h3,.inspector-pane>h3{margin:6px 0 0;font-size:11px;text-transform:uppercase;color:var(--text-muted)}.debug-pane pre{max-height:160px;margin:0;padding:8px;overflow:auto;border-radius:7px;background:var(--bg-canvas);font:11px/1.5 var(--font-mono)}.paused{color:var(--warning)}.test-result i{width:20px;height:20px;flex:0 0 auto;display:grid;place-items:center;border-radius:50%;font-style:normal;color:#fff;background:var(--danger)}.test-result i.passed{background:var(--success)}.test-result i.skipped{background:var(--text-muted)}.api-reference article{padding:9px;display:grid;gap:5px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-2)}.api-reference article small{color:var(--accent)}.api-reference article code{display:block;color:var(--text-primary);font-size:11px;overflow-wrap:anywhere}.api-reference article p{margin:0;color:var(--text-muted);font-size:11px;line-height:1.45}.api-reference article pre{margin:0;padding:6px;overflow:auto;border-radius:5px;background:var(--bg-canvas);font-size:11px}.api-reference article b{color:var(--warning);font-size:11px}.api-reference article button,.code-action{min-height:30px;border:1px solid var(--border-subtle);border-radius:7px;color:var(--accent);background:var(--surface-3)}.breakpoint-detail{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:5px;padding:7px;border:1px solid var(--border-subtle);border-radius:8px}.breakpoint-detail>label{display:flex;align-items:center;gap:4px}.breakpoint-detail>input{grid-column:2}.breakpoint-detail>button{grid-column:3;grid-row:1/6;border:0;color:var(--danger);background:transparent}.hot-reload-state{margin:0;padding:7px;border-radius:7px;background:var(--surface-2);font-size:11px;overflow-wrap:anywhere}.hot-reload-state.applied{color:var(--success)}.hot-reload-state.rejected{color:var(--danger)}
@media(max-width:1100px){.studio-grid{grid-template-columns:minmax(340px,1fr) minmax(248px,30vw)}.project-scripts{display:none}.studio-title{min-width:170px}.studio-title small{display:none}}
@media(max-width:800px){.studio-grid{grid-template-columns:minmax(320px,1fr) minmax(220px,34vw)}.studio-title{min-width:auto}.studio-title div{display:none}.toolbar-actions{min-width:100%}.editor-status span:nth-last-child(-n+2){display:none}}
@media(max-width:620px){.studio-grid{grid-template-columns:1fr;grid-template-rows:minmax(250px,1fr) minmax(170px,35%)}.code-workspace{grid-row:1}.studio-inspector{grid-row:2;border-top:1px solid var(--border-subtle);border-left:0}.studio-toolbar{gap:8px;padding-inline:8px}.studio-mark{width:30px;height:30px}.inspector-tabs{grid-template-columns:repeat(4,1fr)}.inspector-pane{padding:8px}.editor-shell{grid-template-columns:44px 1fr}.editor-shell textarea{padding-inline:10px}}
.rename-overlay{position:absolute;inset:0;z-index:20;display:grid;place-items:center;background:var(--scrim);backdrop-filter:blur(6px)}.rename-card{width:min(390px,calc(100% - 30px));padding:18px;display:grid;gap:10px;border:1px solid var(--border-strong);border-radius:14px;background:var(--surface-2);box-shadow:var(--shadow-lg)}.rename-card p{margin:0;color:var(--text-muted)}.rename-card>div{display:flex;justify-content:flex-end;gap:7px}.rename-card button{min-height:32px;padding:0 12px;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-secondary);background:var(--surface-3)}.rename-card button.primary{color:var(--accent-contrast);background:var(--accent);border-color:var(--accent)}
.toolbar-actions select{min-height:32px;max-width:150px;padding:0 9px;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-secondary);background:var(--surface-2)}
@media(max-width:1000px){.studio-mark{flex:0 0 auto}}
</style>
