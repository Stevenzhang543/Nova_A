<!-- 撤销历史面板：展示编辑记录及内存使用，提供撤销、重做和经确认的历史清空。 -->
<template>
  <Teleport to="body">
    <aside v-if="state.undoHistoryOpen" class="history-panel" role="dialog" aria-modal="false" :aria-label="t('undoHistory')">
      <header><div><strong>{{ t('undoHistory') }}</strong><small>{{ history.length }} · {{ formatBytes(history.memoryBytes) }} / {{ formatBytes(history.memoryBudgetBytes) }}</small></div><UiButton :aria-label="t('close')" @click="state.undoHistoryOpen=false" icon="close" /></header>
      <div class="history-actions"><UiButton :disabled="!history.canUndo" @click="undo" icon="undo" :label="t('undo')" /><UiButton :disabled="!history.canRedo" @click="redo" icon="redo" :label="t('redo')" /><UiButton :disabled="!history.length" @click="clear" icon="clear" :label="t('clearHistory')" /></div>
      <ol v-if="history.entries.length" reversed>
        <li v-for="entry in reversed" :key="entry.id" :class="{ future: !entry.applied }">
          <span :class="entry.scope"><EditorIcon :name="entry.applied ? 'check' : 'circle'" /></span><div><strong>{{ entry.label }}</strong><small>{{ entry.affectedResource }}</small><time>{{ formatTime(entry.timestamp) }} · {{ formatBytes(entry.byteSize) }}</time></div>
        </li>
      </ol>
      <div v-else class="empty"><EditorIcon name="undo" /><p>{{ t('noUndoHistory') }}</p></div>
      <footer><span>{{ t('historyClearRule') }}</span><b :class="{ dirty: history.dirty }">{{ t(history.dirty ? 'unsavedChanges' : 'manualSaveCurrent') }}</b></footer>
    </aside>
  </Teleport>
</template>
<script setup lang="ts">
import UiButton from '../ui/components/UiButton.vue'
import EditorIcon from './EditorIcon.vue'
import { computed } from 'vue'
import { t } from '../i18n'
import { editorState as state } from '../store/editor'
import { clearEditorHistory, historyState as history, redo, undo } from '../store/physics'
import { requestConfirmation } from '../store/dialog'
const reversed = computed(/** 复制历史条目后逆序展示，避免修改共享历史数组。 */ () => [...history.entries].reverse())
/** 将有效时间转换为本地时间格式，无法解析时保留原始字符串。 */ function formatTime(value: string): string { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleTimeString() : value }
/** 按字节、千字节或兆字节格式显示历史占用量。 */ function formatBytes(value: number): string { return value < 1024 ? `${value} B` : value < 1_048_576 ? `${(value/1024).toFixed(1)} KB` : `${(value/1_048_576).toFixed(1)} MB` }
/** 请求用户确认清空历史，获同意后以用户主动清空原因重置历史记录。 */ async function clear(): Promise<void> { if (await requestConfirmation({ title:t('clearHistory'), message:t('clearHistoryConfirm',{count:history.length}), confirmLabel:t('clearHistory'), cancelLabel:t('cancel'), destructive:false })) clearEditorHistory('user-cleared-history', undefined, false) }
</script>
<style scoped>.history-panel{position:fixed;z-index:760;top:calc(2 * var(--ui-control-height));right:var(--ui-space-sm);width:min(48ch,calc(100vw - var(--ui-space-xl)));max-height:calc(100vh - 3 * var(--ui-control-height));display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--border-strong);border-radius:var(--radius-dialog);background:var(--surface-popover);box-shadow:var(--shadow-lg)}header{display:flex;align-items:center;justify-content:space-between;gap:var(--ui-space-sm);padding:var(--ui-space-sm);border-bottom:1px solid var(--border-subtle)}header>div{display:grid}header small,li small,li time,footer span{color:var(--text-muted);font-size:var(--type-caption)}.history-actions{display:flex;gap:var(--ui-control-gap);padding:var(--ui-space-xs) var(--ui-space-sm)}ol{min-height:0;overflow:auto;list-style:none;padding:0;margin:0}li{display:grid;grid-template-columns:var(--ui-icon-size) minmax(0,1fr);gap:var(--ui-space-sm);padding:var(--ui-space-sm);border-bottom:1px solid var(--border-subtle)}li>div{display:grid;gap:var(--ui-space-xs)}li strong,li small{overflow-wrap:anywhere}li.future{opacity:var(--disabled-opacity)}footer{display:grid;gap:var(--ui-space-xs);padding:var(--ui-space-sm);border-top:1px solid var(--border-subtle);font-size:var(--type-caption)}footer .dirty{color:var(--warning)}.empty{padding:var(--ui-space-xl);color:var(--text-muted);text-align:center}</style>
