<template>
  <section class="save-settings">
    <p>{{ t('saveDataDescription') }}</p>
    <label><span>{{ t('saveSlot') }}</span><input v-model.trim="slot" maxlength="80"></label>
    <div class="actions"><button @click="load">{{ t('loadSlot') }}</button><button class="primary" @click="commit">{{ t('commitSlot') }}</button><button class="danger" @click="clear">{{ t('clearWorkingSave') }}</button></div>
    <div class="summary"><span>{{ t('saveKeys') }}</span><strong>{{ Object.keys(saveGameState.values).length }}</strong><span>{{ t('unsavedChanges') }}</span><strong>{{ saveGameState.dirty ? t('yes') : t('no') }}</strong></div>
    <pre>{{ preview }}</pre>
    <p v-if="message || saveGameState.error" :class="{ error: !!saveGameState.error }" role="status">{{ saveGameState.error || message }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../i18n'
import { clearSaveValues, commitSaveSlot, loadSaveSlot, saveGameState, useSaveProject } from '../runtime/saveGame'

useSaveProject()
const slot = ref(saveGameState.slot)
const message = ref('')
const preview = computed(() => JSON.stringify(saveGameState.values, null, 2))
function load(): void { message.value = loadSaveSlot(slot.value) ? t('saveLoaded') : t('emptySaveLoaded') }
function commit(): void { message.value = commitSaveSlot(slot.value) ? t('saveCommitted') : '' }
function clear(): void { clearSaveValues(); message.value = t('workingSaveCleared') }
</script>

<style scoped>
.save-settings > p { margin: 0 0 8px; }.save-settings > label { min-height: 32px; display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--text-muted); font-size: 9px; }.save-settings input { width: 55%; min-height: 27px; }.actions { display: flex; flex-wrap: wrap; gap: 5px; margin: 7px 0; }.actions button { min-height: 28px; padding: 0 8px; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--text-secondary); background: var(--surface-2); font-size: 8.5px; }.actions .primary { color: var(--accent); border-color: var(--accent); }.actions .danger { color: var(--danger); }.summary { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; padding: 7px; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--text-muted); font-size: 8.5px; }.summary strong { color: var(--accent); }.save-settings pre { max-height: 130px; margin: 7px 0 0; padding: 8px; overflow: auto; border-radius: 7px; color: var(--text-secondary); background: var(--surface-3); font: 8px/1.5 ui-monospace, monospace; white-space: pre-wrap; word-break: break-word; }.save-settings p.error { color: var(--danger); }
.save-settings > label { min-height: 34px; font-size: 11px; }.save-settings input { min-height: 29px; }.actions button { min-height: 31px; font-size: 10.5px; }
.summary { font-size: 10.5px; }.save-settings pre { max-height: 150px; font-size: 10px; }
</style>
