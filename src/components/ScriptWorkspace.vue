<template>
  <section class="script-workspace">
    <nav class="logic-mode" :aria-label="t('logicAuthoringMode')" :aria-busy="switching" :inert="switching || undefined" @keydown="modeNavigation">
      <div class="logic-tabs" role="tablist" :aria-label="t('logicAuthoringMode')">
      <button id="logic-code-tab" role="tab" :tabindex="studio.mode==='code'?0:-1" aria-controls="logic-authoring-panel" :aria-selected="studio.mode === 'code'" :class="{ active: studio.mode === 'code' }" @click="setMode('code')"><span>{ }</span>{{ t('rhaiCode') }}</button>
      <button id="logic-graph-tab" role="tab" :tabindex="studio.mode==='graph'?0:-1" aria-controls="logic-authoring-panel" :aria-selected="studio.mode === 'graph'" :class="{ active: studio.mode === 'graph' }" @click="setMode('graph')"><span>⌘</span>{{ t('visualGraph') }}</button>
      <button id="logic-events-tab" role="tab" :tabindex="studio.mode==='events'?0:-1" aria-controls="logic-authoring-panel" :aria-selected="studio.mode === 'events'" :class="{ active: studio.mode === 'events' }" @click="setMode('events')"><span>⚡</span>{{ t('eventSheet') }}</button>
      </div><details class="logic-help"><summary>{{ t('help') }}</summary><p>{{ studio.mode === 'graph' ? t('visualGraphContract') : studio.mode === 'events' ? t('eventSheetContract') : t('rhaiContract') }}</p></details>
    </nav>
    <section v-if="preview" class="conversion-review" :aria-label="copy.title">
      <div class="conversion-review-actions"><button v-if="conversionGate(preview.assessment) === 'review'" :disabled="switching" @click="continueConversion">{{ copy.continue }}</button><button @click="preview = null">{{ copy.cancel }}</button></div>
      <ScriptConversionPanel :assessment="preview.assessment" :source="preview.source" :graph-navigation-enabled="studio.mode === 'graph'" @navigate="navigatePreview" />
    </section>
    <p v-if="switchError" class="switch-error" role="alert">{{ switchError }}</p>
    <ScriptStudio v-if="studio.mode === 'code'" id="logic-authoring-panel" role="tabpanel" aria-labelledby="logic-code-tab" ref="codeEditor" class="logic-editor" @navigate="navigate" />
    <VisualGraphEditor v-else-if="studio.mode === 'graph'" id="logic-authoring-panel" role="tabpanel" aria-labelledby="logic-graph-tab" ref="graphEditor" class="logic-editor" @navigate="navigate" />
    <EventSheetEditor v-else ref="eventEditor" id="logic-authoring-panel" role="tabpanel" aria-labelledby="logic-events-tab" class="logic-editor" />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, shallowRef } from 'vue'
import ScriptStudio from './ScriptStudio.vue'
import VisualGraphEditor from './VisualGraphEditor.vue'
import EventSheetEditor from './EventSheetEditor.vue'
import ScriptConversionPanel from './ScriptConversionPanel.vue'
import { preferencesState } from '../store/preferences'
import { acceptsConversionReview, conversionCopy, conversionGate, saveBeforeNavigation, type ConversionNavigation, type ConversionSnapshot, type ConversionSpan } from '../editor/scriptConversionPresentation'
import { graphStudioState as studio } from '../visual/graphStudioState'
import { t } from '../i18n'
import { assetState, readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import { openScriptAsset, scriptStudioState } from '../editor/scriptStudioState'
import { ensureLinkedGraphForScript, linkedScriptGraphUuid } from '../visual/graphCodeSync'
import { openGraphAsset, queueInitialGraphLayout } from '../visual/graphStudioState'
import { parseGraphDocument } from '../visual/graphTypes'
import { addEditorLog } from '../store/editor'
import { readEventSheet } from '../runtime/eventSheets'
function modeNavigation(event:KeyboardEvent){if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const tabs=[...(event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role=tab]')],current=tabs.indexOf(event.target as HTMLButtonElement);if(current<0)return;event.preventDefault();tabs[event.key==='Home'?0:event.key==='End'?tabs.length-1:(current+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length]?.focus()}

const codeEditor = ref<{ getConversionSnapshot: () => ConversionSnapshot | null; focusSourceRange: (span: ConversionSpan) => void } | null>(null)
const graphEditor = ref<{ getConversionSnapshot: () => ConversionSnapshot | null; focusConversionNode: (request: ConversionNavigation) => void } | null>(null)
const eventEditor = ref<{ requestLeave: () => Promise<boolean> } | null>(null)
const switching = ref(false), switchError = ref(''), preview = shallowRef<ConversionSnapshot | null>(null)
const copy = computed(() => conversionCopy[preferencesState.locale])
let pendingNavigation: ConversionNavigation | undefined
function currentSnapshot() { return studio.mode === 'code' ? codeEditor.value?.getConversionSnapshot() : graphEditor.value?.getConversionSnapshot() }
async function navigate(request: ConversionNavigation) { await setMode(request.target, false, request) }
function navigatePreview(request: ConversionNavigation) { if (request.target === studio.mode) focusNavigation(request) }
function focusNavigation(request: ConversionNavigation) { if (request.target === 'code') codeEditor.value?.focusSourceRange(request.span); else graphEditor.value?.focusConversionNode(request) }
async function continueConversion() {
  const accepted = acceptsConversionReview(currentSnapshot(),preview.value)
  await setMode('graph', accepted, pendingNavigation)
}
async function setMode(mode: 'code' | 'graph' | 'events', acceptedSourceBacked = false, request?: ConversionNavigation): Promise<void> {
  if (switching.value) return
  if (mode === studio.mode) { if (request) focusNavigation(request); return }
  switchError.value = ''
  const snapshot = currentSnapshot()
  if (mode !== 'events' && snapshot) {
    const gate = conversionGate(snapshot.assessment, mode === 'code' || acceptedSourceBacked)
    if (gate !== 'ready') { preview.value = snapshot; pendingNavigation = request; return }
  }
  switching.value = true
  try {
    const saved = studio.mode === 'graph' ? await saveBeforeNavigation(studio.activeGraphDirty,studio.saveActiveGraph) : studio.mode === 'code' ? await saveBeforeNavigation(scriptStudioState.activeDirty,scriptStudioState.saveActiveDraft) : await eventEditor.value?.requestLeave() ?? false
    if (!saved) { switchError.value = copy.value.failed; return }
    await switchSavedMode(mode)
    if (studio.mode === mode) {
      preview.value = null; pendingNavigation = undefined
      if (request) { await nextTick(); focusNavigation(request) }
    }
  } catch (error) { switchError.value = error instanceof Error ? error.message : String(error); addEditorLog(switchError.value,'Script','error') }
  finally { switching.value = false }
}
async function switchSavedMode(mode: 'code' | 'graph' | 'events'): Promise<void> {
  // Every destination unmounts the active editor, including Event Sheets.
  // Complete its save before changing mode so failed validation retains edits.
  if (mode === 'events') { studio.mode = 'events'; return }
  if (studio.mode === 'events') {
    const sheet = readEventSheet(studio.activeEventSheetUuid)
    const logic = resolveAsset(sheet?.logicAsset)
    if (logic?.assetType === 'visualScript') {
      if (mode === 'graph') openGraphAsset(logic.uuid)
      else {
        const source = readTextAsset(logic.uuid)
        let graphDocumentUuid = ''
        try { graphDocumentUuid = source ? parseGraphDocument(source).uuid : '' } catch { /* Keep the Event Sheet recoverable. */ }
        const linked = graphDocumentUuid ? assetState.records.find(asset => asset.assetType === 'script' && linkedScriptGraphUuid(asset.uuid) === graphDocumentUuid) : null
        if (linked) openScriptAsset(linked.uuid); else studio.mode = 'code'
      }
      return
    }
    if (logic?.assetType === 'script') {
      openScriptAsset(logic.uuid)
      if (mode === 'code') { studio.mode = 'code'; return }
    }
  }
  if (mode === 'graph') {
    const script = assetState.records.find(asset => asset.assetType === 'script' && asset.uuid === (scriptStudioState.activeUuid || assetState.selectedGuid))
    if (!script) { studio.mode = 'graph'; return }
    const source = readTextAsset(script.uuid) ?? ''
    try {
      const synchronized = ensureLinkedGraphForScript(script.uuid, source)
      if (!synchronized) { switchError.value = copy.value.failed; return }
      if(synchronized.created){const created=assetState.records.find(record=>record.uuid===synchronized.graphAssetUuid);if(created)queueInitialGraphLayout(created)}
      openGraphAsset(synchronized.graphAssetUuid)
      assetState.selectedGuid = synchronized.graphAssetUuid
      addEditorLog(t(synchronized.created ? 'linkedGraphCreatedFromCode' : 'linkedGraphUpdatedFromCode'), 'Script', 'info', synchronized.graphAssetUuid)
    } catch (error) { switchError.value = error instanceof Error ? error.message : String(error); addEditorLog(switchError.value, 'Script', 'error', script.uuid) }
    return
  }
  const graphUuid = studio.activeGraphUuid
  const graphSource = readTextAsset(graphUuid)
  let graphDocumentUuid = ''
  try { graphDocumentUuid = graphSource ? parseGraphDocument(graphSource).uuid : '' } catch { /* Invalid graphs remain open for recovery. */ }
  const script = graphDocumentUuid
    ? assetState.records.find(asset => asset.assetType === 'script' && linkedScriptGraphUuid(asset.uuid) === graphDocumentUuid)
    : null
  if (script) { assetState.selectedGuid = script.uuid; openScriptAsset(script.uuid) }
  else studio.mode = 'code'
}
</script>

<style scoped>
.script-workspace{position:absolute;inset:0;display:flex;flex-direction:column;min-width:0;min-height:0;background:var(--bg-canvas)}
.conversion-review{flex:0 1 auto;max-height:48%;overflow:auto;border-bottom:1px solid var(--border-strong);background:var(--surface-1)}.conversion-review-actions{display:flex;gap:8px;flex-wrap:wrap;padding:8px 12px}.conversion-review-actions button{min-height:30px;height:auto;white-space:normal;padding:6px 10px;color:var(--text-primary);background:var(--surface-3);border:1px solid var(--border-strong);border-radius:6px}.switch-error{margin:0;padding:8px 12px;color:var(--danger,#f87171);font-size:12px}
.logic-mode{position:relative;z-index:50;flex:0 0 auto;min-height:38px;padding:4px 8px;display:flex;align-items:center;gap:4px;border-bottom:1px solid var(--border-subtle);background:var(--surface-1);overflow:visible;flex-wrap:wrap}
.logic-mode button{min-height:30px;padding:0 11px;display:flex;align-items:center;gap:7px;border:1px solid transparent;border-radius:8px;color:var(--text-muted);background:transparent;font-size:12px}.logic-mode button span{color:var(--accent);font:700 12px var(--font-mono)}.logic-mode button.active{color:var(--text-primary);border-color:var(--border-strong);background:var(--surface-3);box-shadow:var(--shadow-sm)}
.logic-tabs{display:flex;flex-wrap:wrap;gap:4px;min-width:0}.logic-help{margin-left:auto}.logic-help summary{cursor:pointer;padding:7px 10px;min-height:30px;color:var(--text-secondary);font-size:12px}.logic-help p{position:absolute;z-index:1;top:100%;right:8px;width:min(520px,calc(100% - 16px));max-height:min(300px,50vh);box-sizing:border-box;margin:0;padding:12px;overflow:auto;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface-2);box-shadow:var(--shadow-lg);color:var(--text-primary);font-size:12px;line-height:1.6;white-space:normal;overflow-wrap:anywhere}.script-workspace>.logic-editor{position:relative;inset:auto;min-height:0;flex:1}
.logic-mode button{flex-shrink:0;min-width:max-content;height:auto;padding-block:5px;white-space:normal}
.script-workspace{container:script-modes/inline-size}@container script-modes(max-width:760px){.logic-tabs{flex:1}.logic-mode button{flex:1;justify-content:center}}
</style>
