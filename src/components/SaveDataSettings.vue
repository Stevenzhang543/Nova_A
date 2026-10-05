<!-- 游戏存档设置：查看数据与存档槽，执行可取消读写、恢复和工作值清空。 -->
<template>
  <section class="save-settings">
    <p>{{ t('saveDataDescription') }}</p>
    <label><span>{{ t('saveSlot') }}</span><input v-model.trim="slot" maxlength="80"></label>
    <div class="actions"><UiButton :disabled="saveGameState.busy" @click="load" icon="open" :label="t('loadSlot')" /><UiButton class="primary" :disabled="saveGameState.busy" @click="commit" icon="save" :label="t('commitSlot')" /><button v-if="saveGameState.busy" @click="cancel">{{ t('cancel') }}</button><UiButton class="danger" :disabled="saveGameState.busy" @click="clear" icon="clear" :label="t('clearWorkingSave')" /></div>
    <progress v-if="saveGameState.busy" :value="saveGameState.progress" max="1"></progress><small v-if="saveGameState.progressMessage">{{ saveGameState.progressMessage }}</small>
    <button v-if="saveGameState.recoveryAvailable" class="recovery" @click="recover">{{ t('recover') }} · {{ saveGameState.recoverySource }}</button>
    <p v-if="saveGameState.recoveryMessage">{{ saveGameState.recoveryMessage }}</p>
    <div class="summary"><span>{{ t('saveKeys') }}</span><strong>{{ Object.keys(saveGameState.values).length }}</strong><span>{{ t('unsavedChanges') }}</span><strong>{{ saveGameState.dirty ? t('yes') : t('no') }}</strong></div>
    <pre>{{ preview }}</pre>
    <details data-ui-motion-disclosure><summary>{{ t('saveSlot') }} · {{ slots.length }}</summary><button v-for="item in slots" :key="item.slot" @click="slot = item.slot"><strong>{{ item.slot }}</strong><span>schema {{ item.schemaVersion }} · {{ Math.ceil(item.bytes / 1024) }} KB</span><small>{{ item.valid ? item.savedAt : 'checksum failed' }}{{ item.backupAvailable ? ' · backup' : '' }}</small></button><small>{{ saveGameState.platformLocation }}</small></details>
    <p v-if="message || saveGameState.error" :class="{ error: !!saveGameState.error }" role="status">{{ saveGameState.error || message }}</p>
  </section>
</template>

<script setup lang="ts">
import UiButton from '../ui/components/UiButton.vue'
import { computed, ref } from 'vue'
import { t } from '../i18n'
import { clearSaveValues, commitSaveSlotAsync, listSaveSlots, loadSaveSlotAsync, recoverSaveSlot, saveGameState, useSaveProject } from '../runtime/saveGame'

useSaveProject()
const slot = ref(saveGameState.slot)
const message = ref('')
const refresh = ref(0)
let controller: AbortController | null = null
const preview = computed(/** 将工作存档值格式化为 JSON。 */ () => JSON.stringify(saveGameState.values, null, 2))
const slots = computed(/** 依赖刷新计数重新列出存档槽。 */ () => { void refresh.value; return listSaveSlots() })
/** 取消旧请求后读取槽，显示结果或非取消错误，结束时刷新槽列表。 */ async function load(): Promise<void> { controller?.abort(); controller = new AbortController(); try { message.value = await loadSaveSlotAsync(slot.value, { signal: controller.signal }) ? t('saveLoaded') : t('emptySaveLoaded') } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) message.value = String(error) } finally { controller = null; refresh.value++ } }
/** 取消旧请求后保存槽，显示结果或非取消错误，结束时刷新槽列表。 */ async function commit(): Promise<void> { controller?.abort(); controller = new AbortController(); try { message.value = await commitSaveSlotAsync(slot.value, { signal: controller.signal }) ? t('saveCommitted') : '' } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) message.value = String(error) } finally { controller = null; refresh.value++ } }
/** 中止当前异步存档操作。 */ function cancel(): void { controller?.abort() }
/** 恢复所选槽并刷新列表，成功时显示载入提示。 */ function recover(): void { message.value = recoverSaveSlot(slot.value) ? t('saveLoaded') : ''; refresh.value++ }
/** 清空工作存档值并显示提示。 */ function clear(): void { clearSaveValues(); message.value = t('workingSaveCleared') }
</script>

<style scoped> .save-settings{display:grid;gap:var(--ui-space-sm)}.save-settings>p{margin:0;color:var(--text-muted)}.save-settings>label{display:grid;grid-template-columns:var(--ui-label-width) minmax(0,1fr);gap:var(--ui-space-sm);align-items:center}.actions{display:flex;gap:var(--ui-control-gap);flex-wrap:wrap}.summary{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:var(--ui-space-xs);padding-block:var(--ui-space-sm);border-block:1px solid var(--border-subtle)}.save-settings pre{max-height:160px;margin:0;padding:var(--ui-space-sm);overflow:auto;background:var(--input-bg);font-family:var(--font-mono);white-space:pre-wrap;overflow-wrap:anywhere}.save-settings p.error{color:var(--danger)}.save-settings progress{width:100%}.save-settings>small{color:var(--text-muted)}.recovery{color:var(--warning);justify-self:start}.save-settings details>button{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;text-align:left;gap:var(--ui-control-gap);padding:var(--ui-space-xs);border:0;border-top:1px solid var(--border-subtle);border-radius:0;background:transparent}.save-settings details>button small{grid-column:1/-1;color:var(--text-muted);overflow-wrap:anywhere}</style>
