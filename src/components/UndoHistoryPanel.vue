<template>
  <Teleport to="body">
    <aside v-if="state.undoHistoryOpen" class="history-panel" role="dialog" aria-modal="false" :aria-label="t('undoHistory')">
      <header><div><strong>{{ t('undoHistory') }}</strong><small>{{ history.length }} · {{ formatBytes(history.memoryBytes) }} / {{ formatBytes(history.memoryBudgetBytes) }}</small></div><button :aria-label="t('close')" @click="state.undoHistoryOpen=false">×</button></header>
      <div class="history-actions"><button :disabled="!history.canUndo" @click="undo">{{ t('undo') }}</button><button :disabled="!history.canRedo" @click="redo">{{ t('redo') }}</button><button :disabled="!history.length" @click="clear">{{ t('clearHistory') }}</button></div>
      <ol v-if="history.entries.length" reversed>
        <li v-for="entry in reversed" :key="entry.id" :class="{ future: !entry.applied }">
          <span :class="entry.scope">{{ entry.applied ? '●' : '○' }}</span><div><strong>{{ entry.label }}</strong><small>{{ entry.affectedResource }}</small><time>{{ formatTime(entry.timestamp) }} · {{ formatBytes(entry.byteSize) }}</time></div>
        </li>
      </ol>
      <div v-else class="empty"><span>↶</span><p>{{ t('noUndoHistory') }}</p></div>
      <footer><span>{{ t('historyClearRule') }}</span><b :class="{ dirty: history.dirty }">{{ t(history.dirty ? 'unsavedChanges' : 'manualSaveCurrent') }}</b></footer>
    </aside>
  </Teleport>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../i18n'
import { editorState as state } from '../store/editor'
import { clearEditorHistory, historyState as history, redo, undo } from '../store/physics'
import { requestConfirmation } from '../store/dialog'
const reversed = computed(() => [...history.entries].reverse())
function formatTime(value: string): string { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleTimeString() : value }
function formatBytes(value: number): string { return value < 1024 ? `${value} B` : value < 1_048_576 ? `${(value/1024).toFixed(1)} KB` : `${(value/1_048_576).toFixed(1)} MB` }
async function clear(): Promise<void> { if (await requestConfirmation({ title:t('clearHistory'), message:t('clearHistoryConfirm',{count:history.length}), confirmLabel:t('clearHistory'), cancelLabel:t('cancel'), destructive:false })) clearEditorHistory('user-cleared-history', undefined, false) }
</script>
<style scoped>
.history-panel{position:fixed;z-index:760;top:48px;right:10px;width:min(390px,calc(100vw - 20px));max-height:calc(100vh - 70px);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--border-strong);border-radius:var(--radius-dialog);background:var(--surface-1);box-shadow:var(--shadow-lg)}header{min-height:54px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-subtle)}header div{display:grid}header small,li small,li time,footer span{color:var(--text-muted)}header button{width:30px;height:30px;border:0;border-radius:var(--radius-input);background:var(--surface-3)}.history-actions{padding:7px;display:flex;gap:6px;border-bottom:1px solid var(--border-subtle)}.history-actions button{min-height:32px;padding:0 10px;border:1px solid var(--border-subtle);border-radius:var(--radius-input);background:var(--surface-2)}ol{min-height:0;margin:0;padding:6px;overflow:auto;list-style:none}li{min-height:54px;padding:6px;display:grid;grid-template-columns:18px minmax(0,1fr);gap:6px;border-bottom:1px solid var(--border-subtle)}li.future{opacity:.58}li>span{color:var(--accent)}li>div{min-width:0;display:grid;gap:1px}li strong,li small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}li time{font-size:var(--type-caption)}.empty{min-height:180px;display:grid;place-content:center;text-align:center;color:var(--text-muted)}.empty>span{font-size:30px}footer{padding:8px 10px;display:flex;justify-content:space-between;gap:8px;border-top:1px solid var(--border-subtle)}footer b{color:var(--success)}footer b.dirty{color:var(--warning)}
</style>
