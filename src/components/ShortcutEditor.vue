<!-- 快捷键编辑器：搜索、录制、检查冲突及导入导出按键配置。 -->
<template>
  <Teleport to="body">
    <UiMotionTransition modal><UiDialog motion-owner="parent" v-if="state.shortcutEditorOpen" :title="t('shortcutEditor')" @close="close">
        <p class="dialog-hint">{{ t('shortcutEditorHint') }}</p>
        <label class="search"><EditorIcon name="search" /><input v-model="query" type="search" :placeholder="t('searchShortcuts')"></label>
        <div class="shortcut-list">
          <section v-for="item in visible" :key="item.id">
            <span><strong>{{ t(item.label) }}</strong><small>{{ t('defaultShortcut') }}: {{ item.defaultBinding }}</small></span>
            <button :class="{ recording: recording === item.id }" @click="recording = item.id" @keydown="capture($event, item.id)">{{ recording === item.id ? t('pressShortcut') : item.binding }}</button>
            <UiButton :label="t('reset')" @click="setShortcut(item.id, item.defaultBinding)" icon="reset" />
          </section>
          <p v-if="!visible.length">{{ t('noCommandsFound') }}</p>
        </div>
        <p v-if="conflict" class="conflict" role="alert">{{ conflict }}</p>
        <input ref="importInput" hidden type="file" accept="application/json,.json" @change="loadShortcuts">
        <footer><button @click="importInput?.click()">{{ t('importShortcuts') }}</button><button @click="saveShortcuts">{{ t('exportShortcuts') }}</button><button @click="resetShortcuts">{{ t('resetAllShortcuts') }}</button><button class="primary" @click="close">{{ t('done') }}</button></footer>
    </UiDialog></UiMotionTransition>
  </Teleport>
</template>
<script setup lang="ts">
import UiMotionTransition from '../ui/components/UiMotionTransition.vue'

import UiDialog from '../ui/components/UiDialog.vue'
import UiButton from '../ui/components/UiButton.vue'
import EditorIcon from './EditorIcon.vue'
import { computed, ref } from 'vue'
import { t } from '../i18n'
import { editorState as state } from '../store/editor'
import { exportShortcuts, importShortcuts, resetShortcuts, setShortcut, shortcutConflicts, shortcutFromEvent, shortcutState, type ShortcutCommand } from '../editor/shortcuts'
const query = ref(''), recording = ref<ShortcutCommand | null>(null), conflict = ref('')
const importInput = ref<HTMLInputElement | null>(null)
const visible = computed(/** 按规范化搜索词筛选命令名称、现有与默认组合键。 */ () => { const needle = query.value.trim().toLocaleLowerCase(); return shortcutState.definitions.filter(/** 空搜索保留全部，否则匹配名称或组合键文本。 */ item => !needle || `${t(item.label)} ${item.binding} ${item.defaultBinding}`.toLocaleLowerCase().includes(needle)) })
/** 结束录制并关闭快捷键窗口。 */ function close() { recording.value = null; state.shortcutEditorOpen = false }
/** 消费录制按键，忽略无效和纯修饰键组合；无冲突才保存新绑定并结束录制。 */ function capture(event: KeyboardEvent, id: ShortcutCommand) { event.preventDefault(); event.stopPropagation(); const binding = shortcutFromEvent(event); if (!binding || ['Ctrl', 'Alt', 'Shift'].includes(binding)) return; const duplicates = shortcutConflicts(binding, id); if (duplicates.length) { conflict.value = t('shortcutConflict', { command: t(duplicates[0].label) }); return } setShortcut(id, binding); recording.value = null; conflict.value = '' }
/** 下载快捷键 JSON 并释放临时对象地址。 */ function saveShortcuts() { const url = URL.createObjectURL(new Blob([exportShortcuts()], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'nova-shortcuts.json'; link.click(); URL.revokeObjectURL(url) }
/** 读取并导入文件，显示数量或错误，最后清空文件输入。 */ async function loadShortcuts(event: Event) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return; try { const count = importShortcuts(await file.text()); conflict.value = t('shortcutsImported', { count }) } catch (error) { conflict.value = error instanceof Error ? error.message : String(error) } finally { input.value = '' } }
</script>
<style scoped>
.dialog-hint{margin:0 0 var(--ui-space-sm);color:var(--text-muted)}.scope,.profiles,.actions,.io,footer{display:flex;align-items:center;flex-wrap:wrap;gap:var(--ui-control-gap);padding-block:var(--ui-space-sm)}.manager-grid{display:grid;grid-template-columns:minmax(18ch,30%) minmax(0,1fr);gap:var(--ui-space-lg)}.manager-grid>nav{display:flex;flex-direction:column;gap:var(--ui-space-xs);border-right:1px solid var(--border-subtle);padding-right:var(--ui-space-sm);max-height:50vh;overflow:auto}.manager-grid>nav button{display:flex;flex-direction:column;align-items:flex-start;text-align:left;flex:none;min-height:calc(2 * var(--ui-control-height))}.manager-grid>main{min-width:0}.manager-grid label{display:flex;gap:var(--ui-control-gap);align-items:center;flex-wrap:wrap}.manager-grid label input:not([type=checkbox]){flex:1;min-width:8ch}.dock-grid{display:grid;gap:var(--ui-space-sm)}.dock-grid fieldset{display:flex;gap:var(--ui-control-gap);flex-wrap:wrap;padding:var(--ui-space-sm);border:1px solid var(--border-subtle)}.status,.conflict{overflow-wrap:anywhere}.conflict{color:var(--danger)}
.search{display:flex;gap:var(--ui-space-xs);align-items:center}.search input{flex:1;min-width:0}.shortcut-list{margin-block:var(--ui-space-sm)}.shortcut-list>section{display:grid;grid-template-columns:minmax(0,1fr) minmax(14ch,auto) var(--ui-control-height);gap:var(--ui-space-sm);align-items:center;padding-block:var(--ui-space-xs);border-bottom:1px solid var(--border-subtle)}.shortcut-list small{display:block;color:var(--text-muted);font-size:var(--type-caption)}.recording{color:var(--warning)}
.contracts{display:grid;grid-template-columns:repeat(auto-fit,minmax(20ch,1fr));gap:var(--ui-space-sm)}.contracts>section{display:grid;gap:var(--ui-space-xs);padding-block:var(--ui-space-sm);border-bottom:1px solid var(--border-subtle)}.contracts small,.support-grid small{color:var(--text-muted)}.support-grid,.release-channels,.privacy-review{display:grid;gap:var(--ui-space-sm);padding-block:var(--ui-space-sm);border-top:1px solid var(--border-subtle)}.release-channels>header{display:flex;justify-content:space-between}.release-channels>article{display:grid;grid-template-columns:12ch minmax(0,1fr);gap:var(--ui-space-xs);padding:var(--ui-space-xs)}.release-channels>article small{grid-column:2}.release-channels>article.active{background:var(--selection-bg)}.privacy-review label{display:flex;gap:var(--ui-control-gap);align-items:center}.crash-consent{border-top:1px solid var(--border-subtle);padding-top:var(--ui-space-sm)}
@media(max-width:600px){.manager-grid{grid-template-columns:minmax(0,1fr)}.manager-grid>nav{max-height:22vh;border-right:0;border-bottom:1px solid var(--border-subtle)}.shortcut-list>section{grid-template-columns:minmax(0,1fr) var(--ui-control-height)}.shortcut-list>section>span{grid-column:1/-1}}
</style>
