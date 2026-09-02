<template>
  <section class="script-workspace">
    <nav class="logic-mode" role="tablist" :aria-label="t('logicAuthoringMode')">
      <button role="tab" :aria-selected="studio.mode === 'code'" :class="{ active: studio.mode === 'code' }" @click="setMode('code')"><span>{ }</span>{{ t('rhaiCode') }}</button>
      <button role="tab" :aria-selected="studio.mode === 'graph'" :class="{ active: studio.mode === 'graph' }" @click="setMode('graph')"><span>⌘</span>{{ t('visualGraph') }}</button>
      <button role="tab" :aria-selected="studio.mode === 'events'" :class="{ active: studio.mode === 'events' }" @click="setMode('events')"><span>⚡</span>{{ t('eventSheet') }}</button>
      <p>{{ studio.mode === 'graph' ? t('visualGraphContract') : studio.mode === 'events' ? t('eventSheetContract') : t('rhaiContract') }}</p>
    </nav>
    <ScriptStudio v-if="studio.mode === 'code'" class="logic-editor" />
    <VisualGraphEditor v-else-if="studio.mode === 'graph'" class="logic-editor" />
    <EventSheetEditor v-else class="logic-editor" />
  </section>
</template>

<script setup lang="ts">
import ScriptStudio from './ScriptStudio.vue'
import VisualGraphEditor from './VisualGraphEditor.vue'
import EventSheetEditor from './EventSheetEditor.vue'
import { graphStudioState as studio } from '../visual/graphStudioState'
import { t } from '../i18n'
import { assetState, readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import { openScriptAsset, scriptStudioState } from '../editor/scriptStudioState'
import { ensureLinkedGraphForScript, linkedScriptGraphUuid } from '../visual/graphCodeSync'
import { openGraphAsset } from '../visual/graphStudioState'
import { parseGraphDocument } from '../visual/graphTypes'
import { addEditorLog } from '../store/editor'
import { readEventSheet } from '../runtime/eventSheets'

async function setMode(mode: 'code' | 'graph' | 'events'): Promise<void> {
  if (mode === studio.mode) return
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
    if (scriptStudioState.activeDirty && scriptStudioState.saveActiveDraft && !await scriptStudioState.saveActiveDraft()) return
    const source = readTextAsset(script.uuid) ?? ''
    try {
      const synchronized = ensureLinkedGraphForScript(script.uuid, source)
      if (!synchronized) return
      openGraphAsset(synchronized.graphAssetUuid)
      assetState.selectedGuid = synchronized.graphAssetUuid
      addEditorLog(t(synchronized.created ? 'linkedGraphCreatedFromCode' : 'linkedGraphUpdatedFromCode'), 'Script', 'info', synchronized.graphAssetUuid)
    } catch (error) { addEditorLog(error instanceof Error ? error.message : String(error), 'Script', 'error', script.uuid) }
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
.logic-mode{position:relative;z-index:2;min-height:38px;padding:4px 8px;display:flex;align-items:center;gap:4px;border-bottom:1px solid var(--border-subtle);background:var(--surface-1)}
.logic-mode button{min-height:30px;padding:0 11px;display:flex;align-items:center;gap:7px;border:1px solid transparent;border-radius:8px;color:var(--text-muted);background:transparent;font-size:12px}.logic-mode button span{color:var(--accent);font:700 12px var(--font-mono)}.logic-mode button.active{color:var(--text-primary);border-color:var(--border-strong);background:var(--surface-3);box-shadow:var(--shadow-sm)}
.logic-mode p{min-width:0;margin:0 0 0 8px;overflow:hidden;color:var(--text-muted);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.script-workspace>.logic-editor{position:relative;inset:auto;min-height:0;flex:1}
@media(max-width:760px){.logic-mode p{display:none}.logic-mode button{flex:1;justify-content:center}}
</style>
