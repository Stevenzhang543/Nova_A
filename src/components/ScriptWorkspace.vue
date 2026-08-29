<template>
  <section class="script-workspace">
    <nav class="logic-mode" role="tablist" :aria-label="t('logicAuthoringMode')">
      <button role="tab" :aria-selected="studio.mode === 'code'" :class="{ active: studio.mode === 'code' }" @click="studio.mode = 'code'"><span>{ }</span>{{ t('rhaiCode') }}</button>
      <button role="tab" :aria-selected="studio.mode === 'graph'" :class="{ active: studio.mode === 'graph' }" @click="studio.mode = 'graph'"><span>⌘</span>{{ t('visualGraph') }}</button>
      <p>{{ studio.mode === 'graph' ? t('visualGraphContract') : t('rhaiContract') }}</p>
    </nav>
    <ScriptStudio v-if="studio.mode === 'code'" class="logic-editor" />
    <VisualGraphEditor v-else class="logic-editor" />
  </section>
</template>

<script setup lang="ts">
import ScriptStudio from './ScriptStudio.vue'
import VisualGraphEditor from './VisualGraphEditor.vue'
import { graphStudioState as studio } from '../visual/graphStudioState'
import { t } from '../i18n'
</script>

<style scoped>
.script-workspace{position:absolute;inset:0;display:flex;flex-direction:column;min-width:0;min-height:0;background:var(--bg-canvas)}
.logic-mode{position:relative;z-index:2;min-height:38px;padding:4px 8px;display:flex;align-items:center;gap:4px;border-bottom:1px solid var(--border-subtle);background:var(--surface-1)}
.logic-mode button{min-height:30px;padding:0 11px;display:flex;align-items:center;gap:7px;border:1px solid transparent;border-radius:8px;color:var(--text-muted);background:transparent;font-size:12px}.logic-mode button span{color:var(--accent);font:700 12px var(--font-mono)}.logic-mode button.active{color:var(--text-primary);border-color:var(--border-strong);background:var(--surface-3);box-shadow:var(--shadow-sm)}
.logic-mode p{min-width:0;margin:0 0 0 8px;overflow:hidden;color:var(--text-muted);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.script-workspace>.logic-editor{position:relative;inset:auto;min-height:0;flex:1}
@media(max-width:760px){.logic-mode p{display:none}.logic-mode button{flex:1;justify-content:center}}
</style>
