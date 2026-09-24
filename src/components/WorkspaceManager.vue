<!-- 工作区管理器：应用、保存、复制及维护布局，支持配置导入导出。 -->
<template>
  <Teleport to="body">
    <section v-if="state.workspaceManagerOpen" class="scrim" role="dialog" aria-modal="true" v-modal-focus :aria-label="t('manageWorkspaces')" @mousedown.self="close" @keydown.esc.stop="close">
      <article>
        <header><div><strong>{{ t('manageWorkspaces') }}</strong><small>{{ t('workspaceManagerHint') }}</small></div><button :title="t('close')" @click="close">×</button></header>
        <div class="scope"><span>{{ t('layoutScope') }}</span><button :class="{ active: prefs.workspaceLayoutScope === 'user' }" @click="prefs.workspaceLayoutScope = 'user'">{{ t('editorScope') }}</button><button :class="{ active: prefs.workspaceLayoutScope === 'project' }" @click="prefs.workspaceLayoutScope = 'project'">{{ t('projectScope') }}</button></div>
        <section class="profiles"><span>{{ t('workspaceProfiles') }}</span><button v-for="profile in WORKSPACE_PROFILE_PRESETS" :key="profile.id" @click="useProfile(profile.id)">{{ t(profile.label) }}</button></section>
        <div class="manager-grid">
          <nav>
<!-- 预设过滤回调排除 custom 占位项，只展示内置布局。 -->            <button v-for="preset in WORKSPACE_PRESETS.filter(item => item.id !== 'custom')" :key="preset.id" :class="{ active: selected === preset.id }" @click="selected = preset.id"><strong>{{ t(preset.label) }}</strong><small>{{ t('builtInWorkspace') }}</small></button>
            <button v-for="workspace in workspaceState.custom" :key="workspace.id" :class="{ active: selected === workspace.id }" @click="selected = workspace.id"><strong>{{ workspace.name }}</strong><small>{{ t('customWorkspace') }}</small></button>
            <p v-if="!workspaceState.custom.length">{{ t('noCustomWorkspaces') }}</p>
          </nav>
          <main>
            <label><span>{{ t('workspaceName') }}</span><input v-model.trim="name" maxlength="48" :placeholder="t('workspaceName')"></label>
            <div class="actions"><button class="primary" :disabled="!selected" @click="applySelected">{{ applyLabel }}</button><button @click="saveNew">{{ t('saveCurrentWorkspace') }}</button><button :disabled="!selected" @click="duplicate">{{ t('duplicateWorkspace') }}</button><button :disabled="!selectedCustom || !name" @click="rename">{{ t('renameWorkspace') }}</button><button :disabled="!selectedCustom" @click="saveChanges">{{ t('updateWorkspace') }}</button></div>
            <div class="dock-grid">
              <fieldset><legend>{{ t('hierarchyDock') }}</legend><button :class="{ active: state.hierarchyDock === 'left' && !workspaceState.floatingPanels.includes('hierarchy') }" @click="dockEditorPanel('hierarchy','left')">{{ t('left') }}</button><button :class="{ active: state.hierarchyDock === 'right' && !workspaceState.floatingPanels.includes('hierarchy') }" @click="dockEditorPanel('hierarchy','right')">{{ t('right') }}</button><button :class="{ active: workspaceState.floatingPanels.includes('hierarchy') }" @click="dockEditorPanel('hierarchy','floating')">{{ t('floating') }}</button><label><input :checked="workspaceState.hierarchyPinned" type="checkbox" @change="setPanelPinned('hierarchy', ($event.target as HTMLInputElement).checked)">{{ t('pinPanel') }}</label></fieldset>
              <fieldset><legend>{{ t('inspectorDock') }}</legend><button :class="{ active: state.inspectorDock === 'left' && !workspaceState.floatingPanels.includes('inspector') }" @click="dockEditorPanel('inspector','left')">{{ t('left') }}</button><button :class="{ active: state.inspectorDock === 'right' && !workspaceState.floatingPanels.includes('inspector') }" @click="dockEditorPanel('inspector','right')">{{ t('right') }}</button><button :class="{ active: workspaceState.floatingPanels.includes('inspector') }" @click="dockEditorPanel('inspector','floating')">{{ t('floating') }}</button><label><input :checked="workspaceState.inspectorPinned" type="checkbox" @change="setPanelPinned('inspector', ($event.target as HTMLInputElement).checked)">{{ t('pinPanel') }}</label></fieldset>
              <label class="toggle"><input v-model="workspaceState.splitDocking" type="checkbox">{{ t('splitDocking') }}</label><label class="toggle"><input :checked="state.bottomPanelPinned" type="checkbox" @change="setPanelPinned('bottom', ($event.target as HTMLInputElement).checked)">{{ t('pinBottomPanel') }}</label>
            </div>
            <section class="io"><button @click="download">{{ t('exportWorkspaces') }}</button><button @click="fileInput?.click()">{{ t('importWorkspaces') }}</button><input ref="fileInput" hidden type="file" accept="application/json,.nova-workspaces" @change="upload"><button @click="resetEditorLayout">{{ t('resetLayout') }}</button><button v-if="selectedCustom" class="danger" @click="remove">{{ t('deleteWorkspace') }}</button></section>
            <p class="status" aria-live="polite">{{ status }}</p>
          </main>
        </div>
      </article>
    </section>
  </Teleport>
</template>
<script setup lang="ts">
import { vModalFocus } from '../editor/modalFocus'
import { computed, ref, watch } from 'vue'
import { t } from '../i18n'
import { editorState as state } from '../store/editor'
import { preferencesState as prefs } from '../store/preferences'
import { WORKSPACE_PRESETS, WORKSPACE_PROFILE_PRESETS, applyNamedWorkspace, applyWorkspaceProfile, dockEditorPanel, duplicateWorkspace, exportWorkspaces, importWorkspaces, removeWorkspace, renameWorkspace, resetEditorLayout, saveCurrentWorkspace, setPanelPinned, workspaceState } from '../editor/workspaces'
import { reportRecoverableError } from '../runtime/faultCenter'
const selected = ref('design'), name = ref(''), status = ref(''), fileInput = ref<HTMLInputElement | null>(null)
const selectedCustom = computed(/** 查找选中自定义工作区，预设或无效选择返回空值。 */ () => workspaceState.custom.find(/* 比较 item.id 与 selected.value，返回严格相等的判断结果。 */ item => item.id === selected.value) ?? null)
const applyLabel = computed(/* 返回 ({ en: 'Apply workspace', de: 'Arbeitsbereich anwenden', zh: '应用工作区' })[prefs.locale] 的当前值。 */ () => ({ en: 'Apply workspace', de: 'Arbeitsbereich anwenden', zh: '应用工作区' })[prefs.locale])
watch(selectedCustom, /** 选择变化时同步名称输入。 */ item => { name.value = item?.name ?? '' }, { immediate: true })
/** 关闭管理窗口。 */ function close() { state.workspaceManagerOpen = false }
/** 应用所选布局，成功更新名称提示并关闭窗口。 */ function applySelected() {
  if (!applyNamedWorkspace(selected.value)) return
  const label = selectedCustom.value?.name ?? t(WORKSPACE_PRESETS.find(/* 比较 item.id 与 selected.value，返回严格相等的判断结果。 */ item => item.id === selected.value)!.label)
  state.statusText = t('workspaceActivated', { workspace: label })
  close()
}
/** 应用指定配置档，成功提示并关闭窗口。 */ function useProfile(id: string) { if (applyWorkspaceProfile(id)) { status.value = t('workspaceProfileApplied'); close() } }
/** 保存当前布局，选中新工作区并显示成功或异常。 */ function saveNew() { try { const item = saveCurrentWorkspace(name.value || undefined); selected.value = item.id; name.value = item.name; status.value = t('workspaceSaved') } catch(error) { status.value = error instanceof Error ? error.message : String(error) } }
/** 复制选中布局，更新选择和名称，异常显示为状态。 */ function duplicate() { try { const item = duplicateWorkspace(selected.value, name.value ? `${name.value} Copy` : undefined); if (item) { selected.value = item.id; name.value = item.name; status.value = t('workspaceDuplicated') } } catch(error) { status.value = error instanceof Error ? error.message : String(error) } }
/** 重命名选中的自定义工作区，成功时提示。 */ function rename() { if (selectedCustom.value && renameWorkspace(selectedCustom.value.id, name.value)) status.value = t('workspaceRenamed') }
/** 把当前布局保存到所选自定义工作区并提示。 */ function saveChanges() { if (selectedCustom.value) { workspaceState.selectedCustomId = selectedCustom.value.id; saveCurrentWorkspace(); status.value = t('workspaceUpdated') } }
/** 删除所选自定义布局，成功后回到设计预设并清空名称。 */ function remove() { if (selectedCustom.value && removeWorkspace(selectedCustom.value.id)) { selected.value = 'design'; name.value = ''; status.value = t('workspaceDeleted') } }
/** 下载工作区配置并延迟释放临时对象地址。 */ function download() { const url = URL.createObjectURL(new Blob([exportWorkspaces()], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'Nova_A-workspaces.nova-workspaces'; anchor.click(); setTimeout(/** 下载启动后释放临时对象地址。 */ () => URL.revokeObjectURL(url), 0) }
/** 读取并导入工作区配置，显示导入数或报告可恢复错误，最后清空文件输入。 */ async function upload(event: Event) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return; try { const count = importWorkspaces(await file.text()); status.value = t('workspacesImported', { count }) } catch (error) { reportRecoverableError(error, 'Import workspaces'); status.value = error instanceof Error ? error.message : String(error) } finally { input.value = '' } }
</script>
<style scoped>
.scrim{position:fixed;inset:0;z-index:1800;padding:20px;display:grid;place-items:center;background:var(--scrim);backdrop-filter:blur(8px)}article{width:min(900px,100%);max-height:92vh;overflow:hidden;border:1px solid var(--border-strong);border-radius:16px;background:var(--surface-1);box-shadow:var(--shadow-lg)}header{min-height:58px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-subtle)}header div{display:grid;gap:3px}header strong{font-size:15px}header small,.status,nav p{color:var(--text-muted);font-size:12px}header button{width:36px;height:36px}.scope,.profiles{min-height:45px;padding:6px 12px;display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--border-subtle)}.scope>span{margin-right:auto;color:var(--text-muted)}.profiles{overflow:auto}.profiles>span{flex:0 0 auto;color:var(--text-muted)}.profiles button{white-space:nowrap}button{min-height:34px;padding:0 10px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-2)}button.active,button.primary{color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}.manager-grid{min-height:400px;display:grid;grid-template-columns:240px minmax(0,1fr)}nav{padding:8px;overflow:auto;border-right:1px solid var(--border-subtle)}nav button{width:100%;min-height:48px;margin-bottom:5px;display:flex;align-items:flex-start;justify-content:center;flex-direction:column}nav small{color:var(--text-muted)}main{padding:16px;overflow:auto}main>label,.dock-grid label{display:grid;gap:6px;color:var(--text-muted)}.actions,.io{margin-top:14px;display:flex;gap:7px;flex-wrap:wrap}.dock-grid{margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:10px}.dock-grid fieldset{padding:9px;display:flex;gap:5px;flex-wrap:wrap;border:1px solid var(--border-subtle);border-radius:9px}.dock-grid legend{padding:0 4px;color:var(--text-muted)}.dock-grid fieldset label{width:100%;display:flex;align-items:center;gap:6px}.dock-grid .toggle{display:flex;grid-template-columns:auto 1fr;align-items:center}.io{padding-top:14px;border-top:1px solid var(--border-subtle)}button.danger{color:var(--danger)}@media(max-width:620px){.manager-grid{grid-template-columns:1fr}nav{max-height:180px;border-right:0;border-bottom:1px solid var(--border-subtle)}.dock-grid{grid-template-columns:1fr}}
</style>
