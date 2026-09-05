<template>
  <button type="button" class="panel-maximize" :data-panel-maximize="panel" :aria-label="label" :title="label" :aria-pressed="active" @click.stop="togglePanelMaximize(panel)">{{ active ? '↙' : '⛶' }}</button>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { preferencesState } from '../store/preferences'
import { togglePanelMaximize,workspaceState } from '../editor/workspaces'
const props=defineProps<{panel:'hierarchy'|'inspector'|'bottom'}>()
const active=computed(()=>workspaceState.maximizedPanel===props.panel)
const copy={en:{maximize:'Maximize panel',restore:'Restore panel layout'},de:{maximize:'Bereich maximieren',restore:'Bereichslayout wiederherstellen'},zh:{maximize:'最大化面板',restore:'恢复面板布局'}}
const label=computed(()=>copy[preferencesState.locale][active.value?'restore':'maximize'])
</script>
<style scoped>
.panel-maximize{flex:0 0 auto;min-width:30px!important;min-height:30px!important;padding:3px 6px!important;border:1px solid var(--border-subtle)!important;border-radius:6px!important;background:var(--surface-2)!important;color:var(--text-primary)!important;font:15px/1 var(--font-sans)!important}
.panel-maximize[aria-pressed=true]{border-color:var(--accent)!important;background:var(--accent-soft)!important}
</style>
