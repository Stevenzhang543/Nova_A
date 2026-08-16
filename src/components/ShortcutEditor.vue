<template>
  <Teleport to="body">
    <section v-if="state.shortcutEditorOpen" class="scrim" role="dialog" aria-modal="true" :aria-label="t('shortcutEditor')" @mousedown.self="close" @keydown.esc="close">
      <article>
        <header><div><strong>{{ t('shortcutEditor') }}</strong><small>{{ t('shortcutEditorHint') }}</small></div><button :title="t('close')" @click="close">×</button></header>
        <label class="search"><span>⌕</span><input v-model="query" type="search" :placeholder="t('searchShortcuts')"></label>
        <div class="shortcut-list">
          <section v-for="item in visible" :key="item.id">
            <span><strong>{{ t(item.label) }}</strong><small>{{ t('defaultShortcut') }}: {{ item.defaultBinding }}</small></span>
            <button :class="{ recording: recording === item.id }" @click="recording = item.id" @keydown="capture($event, item.id)">{{ recording === item.id ? t('pressShortcut') : item.binding }}</button>
            <button :title="t('reset')" @click="setShortcut(item.id, item.defaultBinding)">↺</button>
          </section>
          <p v-if="!visible.length">{{ t('noCommandsFound') }}</p>
        </div>
        <p v-if="conflict" class="conflict" role="alert">{{ conflict }}</p>
        <footer><button @click="resetShortcuts">{{ t('resetAllShortcuts') }}</button><button class="primary" @click="close">{{ t('done') }}</button></footer>
      </article>
    </section>
  </Teleport>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../i18n'
import { editorState as state } from '../store/editor'
import { resetShortcuts, setShortcut, shortcutConflicts, shortcutFromEvent, shortcutState, type ShortcutCommand } from '../editor/shortcuts'
const query = ref(''), recording = ref<ShortcutCommand | null>(null), conflict = ref('')
const visible = computed(() => { const needle = query.value.trim().toLocaleLowerCase(); return shortcutState.definitions.filter(item => !needle || `${t(item.label)} ${item.binding} ${item.defaultBinding}`.toLocaleLowerCase().includes(needle)) })
function close() { recording.value = null; state.shortcutEditorOpen = false }
function capture(event: KeyboardEvent, id: ShortcutCommand) { event.preventDefault(); event.stopPropagation(); const binding = shortcutFromEvent(event); if (!binding || ['Ctrl', 'Alt', 'Shift'].includes(binding)) return; const duplicates = shortcutConflicts(binding, id); if (duplicates.length) { conflict.value = t('shortcutConflict', { command: t(duplicates[0].label) }); return } setShortcut(id, binding); recording.value = null; conflict.value = '' }
</script>
<style scoped>
.scrim{position:fixed;inset:0;z-index:1850;padding:20px;display:grid;place-items:center;background:var(--scrim);backdrop-filter:blur(8px)}article{width:min(650px,100%);max-height:90vh;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--border-strong);border-radius:16px;background:var(--surface-1);box-shadow:var(--shadow-lg)}header{min-height:58px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-subtle)}header div{display:grid;gap:3px}header strong{font-size:15px}header small,.shortcut-list small{color:var(--text-muted);font-size:12px}button{min-height:34px;padding:0 10px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-2)}.search{margin:10px 12px;padding:0 9px;display:flex;align-items:center;gap:7px;border:1px solid var(--border-subtle);border-radius:9px;background:var(--input-bg)}.search input{min-width:0;flex:1;border:0;background:transparent}.shortcut-list{min-height:0;padding:0 12px;overflow:auto}.shortcut-list section{min-height:55px;display:grid;grid-template-columns:minmax(0,1fr) 145px 36px;gap:7px;align-items:center;border-top:1px solid var(--border-subtle)}.shortcut-list section>span{min-width:0;display:grid;gap:3px}.shortcut-list button.recording{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}.conflict{margin:8px 12px;color:var(--danger)}footer{padding:10px 12px;display:flex;justify-content:flex-end;gap:7px;border-top:1px solid var(--border-subtle)}button.primary{color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}
</style>
