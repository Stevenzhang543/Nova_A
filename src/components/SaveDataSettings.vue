<template>
  <section class="save-settings">
    <p>{{ t('saveDataDescription') }}</p>
    <label><span>{{ t('saveSlot') }}</span><input v-model.trim="slot" maxlength="80"></label>
    <div class="actions"><button :disabled="saveGameState.busy" @click="load">{{ t('loadSlot') }}</button><button class="primary" :disabled="saveGameState.busy" @click="commit">{{ t('commitSlot') }}</button><button v-if="saveGameState.busy" @click="cancel">{{ t('cancel') }}</button><button class="danger" :disabled="saveGameState.busy" @click="clear">{{ t('clearWorkingSave') }}</button></div>
    <progress v-if="saveGameState.busy" :value="saveGameState.progress" max="1"></progress><small v-if="saveGameState.progressMessage">{{ saveGameState.progressMessage }}</small>
    <button v-if="saveGameState.recoveryAvailable" class="recovery" @click="recover">{{ t('recover') }} · {{ saveGameState.recoverySource }}</button>
    <p v-if="saveGameState.recoveryMessage">{{ saveGameState.recoveryMessage }}</p>
    <div class="summary"><span>{{ t('saveKeys') }}</span><strong>{{ Object.keys(saveGameState.values).length }}</strong><span>{{ t('unsavedChanges') }}</span><strong>{{ saveGameState.dirty ? t('yes') : t('no') }}</strong></div>
    <pre>{{ preview }}</pre>
    <details><summary>{{ t('saveSlot') }} · {{ slots.length }}</summary><button v-for="item in slots" :key="item.slot" @click="slot = item.slot"><strong>{{ item.slot }}</strong><span>schema {{ item.schemaVersion }} · {{ Math.ceil(item.bytes / 1024) }} KB</span><small>{{ item.valid ? item.savedAt : 'checksum failed' }}{{ item.backupAvailable ? ' · backup' : '' }}</small></button><small>{{ saveGameState.platformLocation }}</small></details>
    <p v-if="message || saveGameState.error" :class="{ error: !!saveGameState.error }" role="status">{{ saveGameState.error || message }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../i18n'
import { clearSaveValues, commitSaveSlotAsync, listSaveSlots, loadSaveSlotAsync, recoverSaveSlot, saveGameState, useSaveProject } from '../runtime/saveGame'

useSaveProject()
const slot = ref(saveGameState.slot)
const message = ref('')
const refresh = ref(0)
let controller: AbortController | null = null
const preview = computed(() => JSON.stringify(saveGameState.values, null, 2))
const slots = computed(() => { void refresh.value; return listSaveSlots() })
async function load(): Promise<void> { controller?.abort(); controller = new AbortController(); try { message.value = await loadSaveSlotAsync(slot.value, { signal: controller.signal }) ? t('saveLoaded') : t('emptySaveLoaded') } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) message.value = String(error) } finally { controller = null; refresh.value++ } }
async function commit(): Promise<void> { controller?.abort(); controller = new AbortController(); try { message.value = await commitSaveSlotAsync(slot.value, { signal: controller.signal }) ? t('saveCommitted') : '' } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) message.value = String(error) } finally { controller = null; refresh.value++ } }
function cancel(): void { controller?.abort() }
function recover(): void { message.value = recoverSaveSlot(slot.value) ? t('saveLoaded') : ''; refresh.value++ }
function clear(): void { clearSaveValues(); message.value = t('workingSaveCleared') }
</script>

<style scoped>
.save-settings > p { margin: 0 0 8px; }.save-settings > label { min-height: 32px; display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--text-muted); font-size:11px; }.save-settings input { width: 55%; min-height: 27px; }.actions { display: flex; flex-wrap: wrap; gap: 5px; margin: 7px 0; }.actions button { min-height: 28px; padding: 0 8px; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--text-secondary); background: var(--surface-2); font-size:11px; }.actions .primary { color: var(--accent); border-color: var(--accent); }.actions .danger { color: var(--danger); }.summary { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; padding: 7px; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--text-muted); font-size:11px; }.summary strong { color: var(--accent); }.save-settings pre { max-height: 130px; margin: 7px 0 0; padding: 8px; overflow: auto; border-radius: 7px; color: var(--text-secondary); background: var(--surface-3); font: 11px/1.5 ui-monospace, monospace; white-space: pre-wrap; word-break: break-word; }.save-settings p.error { color: var(--danger); }
.save-settings > label { min-height: 34px; font-size: 11px; }.save-settings input { min-height: 29px; }.actions button { min-height: 31px; font-size:11px; }
.summary { font-size:11px; }.save-settings pre { max-height: 150px; font-size:11px; }
.save-settings progress{width:100%}.save-settings>small{display:block;margin:4px 0;color:var(--text-muted)}.recovery{width:100%;min-height:32px;border:1px solid var(--warning);border-radius:7px;color:var(--warning);background:color-mix(in srgb,var(--warning) 8%,transparent)}.save-settings details>summary{min-height:24px;display:flex;align-items:center;line-height:1.4;color:var(--text-secondary);cursor:pointer}.save-settings details>button{width:100%;padding:6px;display:grid;grid-template-columns:minmax(0,1fr) auto;text-align:left;border:0;border-top:1px solid var(--border-subtle);background:transparent;color:var(--text-secondary)}.save-settings details>button span,.save-settings details>button strong{min-width:0;overflow-wrap:anywhere}.save-settings details>button small{grid-column:1/-1;color:var(--text-muted);overflow-wrap:anywhere}
</style>
