<template>
  <Teleport to="body">
    <section v-if="state.workspaceManagerOpen" class="scrim" role="dialog" aria-modal="true" :aria-label="t('manageWorkspaces')" @mousedown.self="close" @keydown.esc="close">
      <article>
        <header><div><strong>{{ t('manageWorkspaces') }}</strong><small>{{ t('workspaceManagerHint') }}</small></div><button :title="t('close')" @click="close">×</button></header>
        <div class="scope"><span>{{ t('layoutScope') }}</span><button :class="{ active: prefs.workspaceLayoutScope === 'user' }" @click="prefs.workspaceLayoutScope = 'user'">{{ t('editorScope') }}</button><button :class="{ active: prefs.workspaceLayoutScope === 'project' }" @click="prefs.workspaceLayoutScope = 'project'">{{ t('projectScope') }}</button></div>
        <div class="manager-grid">
          <nav>
            <button v-for="preset in WORKSPACE_PRESETS.filter(item => item.id !== 'custom')" :key="preset.id" :class="{ active: selected === preset.id }" @click="selected = preset.id"><strong>{{ t(preset.label) }}</strong><small>{{ t('builtInWorkspace') }}</small></button>
            <button v-for="workspace in workspaceState.custom" :key="workspace.id" :class="{ active: selected === workspace.id }" @click="selected = workspace.id"><strong>{{ workspace.name }}</strong><small>{{ t('customWorkspace') }}</small></button>
            <p v-if="!workspaceState.custom.length">{{ t('noCustomWorkspaces') }}</p>
          </nav>
          <main>
            <label><span>{{ t('workspaceName') }}</span><input v-model.trim="name" maxlength="48" :placeholder="t('workspaceName')"></label>
            <div class="actions"><button class="primary" @click="saveNew">{{ t('saveCurrentWorkspace') }}</button><button :disabled="!selected" @click="duplicate">{{ t('duplicateWorkspace') }}</button><button :disabled="!selectedCustom || !name" @click="rename">{{ t('renameWorkspace') }}</button><button :disabled="!selectedCustom" @click="saveChanges">{{ t('updateWorkspace') }}</button></div>
            <div class="dock-grid"><label><span>{{ t('hierarchyDock') }}</span><select v-model="state.hierarchyDock"><option value="left">{{ t('left') }}</option><option value="right">{{ t('right') }}</option></select></label><label><span>{{ t('inspectorDock') }}</span><select v-model="state.inspectorDock"><option value="left">{{ t('left') }}</option><option value="right">{{ t('right') }}</option></select></label></div>
            <section class="io"><button @click="download">{{ t('exportWorkspaces') }}</button><button @click="fileInput?.click()">{{ t('importWorkspaces') }}</button><input ref="fileInput" hidden type="file" accept="application/json,.nova-workspaces" @change="upload"><button @click="resetEditorLayout">{{ t('resetLayout') }}</button><button v-if="selectedCustom" class="danger" @click="remove">{{ t('deleteWorkspace') }}</button></section>
            <p class="status" aria-live="polite">{{ status }}</p>
          </main>
        </div>
      </article>
    </section>
  </Teleport>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { t } from '../i18n'
import { editorState as state } from '../store/editor'
import { preferencesState as prefs } from '../store/preferences'
import { WORKSPACE_PRESETS, duplicateWorkspace, exportWorkspaces, importWorkspaces, removeWorkspace, renameWorkspace, resetEditorLayout, saveCurrentWorkspace, workspaceState } from '../editor/workspaces'
import { reportRecoverableError } from '../runtime/faultCenter'
const selected = ref('design'), name = ref(''), status = ref(''), fileInput = ref<HTMLInputElement | null>(null)
const selectedCustom = computed(() => workspaceState.custom.find(item => item.id === selected.value) ?? null)
watch(selectedCustom, item => { name.value = item?.name ?? '' }, { immediate: true })
function close() { state.workspaceManagerOpen = false }
function saveNew() { const item = saveCurrentWorkspace(name.value || undefined); selected.value = item.id; name.value = item.name; status.value = t('workspaceSaved') }
function duplicate() { const item = duplicateWorkspace(selected.value, name.value ? `${name.value} Copy` : undefined); if (item) { selected.value = item.id; name.value = item.name; status.value = t('workspaceDuplicated') } }
function rename() { if (selectedCustom.value && renameWorkspace(selectedCustom.value.id, name.value)) status.value = t('workspaceRenamed') }
function saveChanges() { if (selectedCustom.value) { workspaceState.selectedCustomId = selectedCustom.value.id; saveCurrentWorkspace(); status.value = t('workspaceUpdated') } }
function remove() { if (selectedCustom.value && removeWorkspace(selectedCustom.value.id)) { selected.value = 'design'; name.value = ''; status.value = t('workspaceDeleted') } }
function download() { const url = URL.createObjectURL(new Blob([exportWorkspaces()], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'Nova_A-workspaces.nova-workspaces'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 0) }
async function upload(event: Event) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return; try { const count = importWorkspaces(await file.text()); status.value = t('workspacesImported', { count }) } catch (error) { reportRecoverableError(error, 'Import workspaces'); status.value = error instanceof Error ? error.message : String(error) } finally { input.value = '' } }
</script>
<style scoped>
.scrim{position:fixed;inset:0;z-index:1800;padding:20px;display:grid;place-items:center;background:var(--scrim);backdrop-filter:blur(8px)}article{width:min(820px,100%);max-height:92vh;overflow:hidden;border:1px solid var(--border-strong);border-radius:16px;background:var(--surface-1);box-shadow:var(--shadow-lg)}header{min-height:58px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-subtle)}header div{display:grid;gap:3px}header strong{font-size:15px}header small,.status,nav p{color:var(--text-muted);font-size:12px}header button{width:36px;height:36px}.scope{min-height:45px;padding:6px 12px;display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--border-subtle)}.scope>span{margin-right:auto;color:var(--text-muted)}button{min-height:34px;padding:0 10px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-2)}button.active,button.primary{color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}.manager-grid{min-height:400px;display:grid;grid-template-columns:240px minmax(0,1fr)}nav{padding:8px;overflow:auto;border-right:1px solid var(--border-subtle)}nav button{width:100%;min-height:48px;margin-bottom:5px;display:flex;align-items:flex-start;justify-content:center;flex-direction:column}nav small{color:var(--text-muted)}main{padding:16px;overflow:auto}main>label,.dock-grid label{display:grid;gap:6px;color:var(--text-muted)}.actions,.io{margin-top:14px;display:flex;gap:7px;flex-wrap:wrap}.dock-grid{margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:10px}.dock-grid select{width:100%}.io{padding-top:14px;border-top:1px solid var(--border-subtle)}button.danger{color:var(--danger)}@media(max-width:620px){.manager-grid{grid-template-columns:1fr}nav{max-height:180px;border-right:0;border-bottom:1px solid var(--border-subtle)}}
</style>
