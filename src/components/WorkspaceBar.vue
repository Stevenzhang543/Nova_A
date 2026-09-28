<!-- 工作区导航栏：展示当前位置、未保存状态并提供工作区和命令入口。 -->
<template>
  <nav class="workspace-bar" role="toolbar" :aria-label="t('workspaces')">
    <div class="workspace-list">
      <UiButton
        v-for="preset in visiblePresets"
      :key="preset.id"
      :class="{ active: state.activeWorkspace === preset.id }"
      :aria-pressed="state.activeWorkspace === preset.id"
      :aria-label="`${t(preset.label)} · ${t('workspacePreset')}`"
        @click="selectWorkspace(preset.id)"
      :title="`${t(preset.label)} · ${t('workspacePreset')}`"
      ><EditorIcon :name="preset.id" /><span class="label">{{ t(preset.label) }}</span><i v-if="workspaceDirty(preset.id)" class="dirty" :title="t('unsavedChanges')"></i></UiButton>
    </div>
    <div class="context-title" :title="contextTitle"><small>{{ t('currentContext') }}</small><strong>{{ contextTitle }}</strong></div>
    <span class="workspace-spacer"></span>
    <div class="history-controls" :aria-label="t('navigationHistory')">
      <UiButton :aria-label="t('navigateBack')" :disabled="!workspaceState.navigationBack.length" :title="`${t('navigateBack')} (Alt+←)`" data-doc="manual/navigation-history" @click="navigateHistory('back')"><EditorIcon name="back" /><span class="control-label">{{ t('back') }}</span></UiButton>
      <UiButton :aria-label="t('navigateForward')" :disabled="!workspaceState.navigationForward.length" :title="`${t('navigateForward')} (Alt+→)`" data-doc="manual/navigation-history" @click="navigateHistory('forward')"><EditorIcon name="forward" /><span class="control-label">{{ t('forward') }}</span></UiButton>
    </div>
    <details v-transient-popover class="workspace-menu layout-menu">
      <summary :aria-label="t('layoutPanels')" :title="t('layoutPanels')"><EditorIcon name="layout" /><span>{{ t('layout') }}</span></summary>
      <div class="workspace-popover" role="group" :aria-label="t('layoutPanels')">
        <h3>{{ t('layoutPanels') }}</h3>
        <UiButton :class="{ active: state.hierarchyVisible && !state.distractionFree }" :title="t('toggleHierarchy')" data-doc="manual/hierarchy" @click="toggleEditorPanel('hierarchy')"><EditorIcon name="hierarchy" /><span>{{ t('hierarchy') }}</span><EditorIcon v-if="state.hierarchyVisible && !state.distractionFree" name="check" /></UiButton>
        <UiButton :class="{ active: state.inspectorVisible && !state.distractionFree }" :title="t('toggleInspector')" data-doc="manual/inspector" @click="toggleEditorPanel('inspector')"><EditorIcon name="layout" /><span>{{ t('inspector') }}</span><EditorIcon v-if="state.inspectorVisible && !state.distractionFree" name="check" /></UiButton>
        <UiButton :class="{ active: state.bottomPanelVisible && !state.distractionFree }" :title="t('toggleBottomPanel')" data-doc="manual/bottom-panel" @click="toggleEditorPanel('bottom')"><EditorIcon name="bottom" /><span>{{ t('bottomPanel') }}</span><EditorIcon v-if="state.bottomPanelVisible && !state.distractionFree" name="check" /></UiButton>
        <UiButton :class="{ active: state.distractionFree }" :title="t('focusMode')" data-doc="manual/focus-mode" @click="toggleFocusMode"><EditorIcon name="maximize" /><span>{{ t('focusMode') }}</span><EditorIcon v-if="state.distractionFree" name="check" /></UiButton>
        <UiButton :title="`${t('manageWorkspaces')} (Ctrl+Alt+W)`" data-doc="manual/workspaces" @click="state.workspaceManagerOpen = true"><EditorIcon name="manage" /><span>{{ t('manageWorkspaces') }}</span><i></i></UiButton>
      </div>
    </details>
    <details v-transient-popover class="workspace-menu command-menu">
      <summary :aria-label="t('commands')" :title="t('commands')"><EditorIcon name="search" /><span>{{ t('commands') }}</span></summary>
      <div class="workspace-popover command-popover" role="group" :aria-label="t('commands')">
        <h3>{{ t('commandsAndSearch') }}</h3>
        <UiButton class="quick-trigger" data-shortcut="Ctrl+P" @click="openPalette('quick')"><EditorIcon name="search" /><span>{{ t('quickOpen') }}</span><kbd>Ctrl P</kbd></UiButton>
        <UiButton class="command-trigger" data-shortcut="Ctrl+Shift+P" @click="openPalette('commands')"><EditorIcon name="command" /><span>{{ t('commandPalette') }}</span><kbd>Ctrl Shift P</kbd></UiButton>
      </div>
    </details>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EditorIcon from './EditorIcon.vue'
import UiButton from '../ui/components/UiButton.vue'
import { vTransientPopover } from '../editor/transientPopover'
import { t } from '../i18n'
import { editorState as state, type EditorWorkspace } from '../store/editor'
import { applyEditorWorkspace, navigateHistory, toggleEditorPanel, toggleFocusMode, WORKSPACE_PRESETS, workspaceState } from '../editor/workspaces'
import { projectSessionState } from '../projects/projectSession'
import { physicsState } from '../store/physics'
import { projectScopeDirty } from '../runtime/projectTransactions'

const visiblePresets = computed(/** 过滤自定义占位项，返回可展示的预设工作区。 */ () => WORKSPACE_PRESETS.filter(/* 比较 preset.id 与 'custom'，返回严格不等的判断结果。 */ preset => preset.id !== 'custom'))
const contextTitle = computed(/** 生成项目与当前栏目、选中实体或工作区名称组成的位置文本。 */ () => {
  const selected = physicsState.world.entities.find(/* 比较 entity.id 与 physicsState.selectedEntityId，返回严格相等的判断结果。 */ entity => entity.id === physicsState.selectedEntityId)
  if (state.activeWorkspace === 'manage') return `${projectSessionState.name} / ${t(state.manageSection === 'project' ? 'projectHealth' : state.manageSection === 'build' ? 'buildPanel' : state.manageSection === 'rendering' ? 'renderingStudio' : state.manageSection === 'packages' ? 'packages' : 'projectSettings')}`
  return `${projectSessionState.name} / ${selected?.name ?? t(WORKSPACE_PRESETS.find(/* 比较 item.id 与 state.activeWorkspace，返回严格相等的判断结果。 */ item => item.id === state.activeWorkspace)?.label ?? 'workspaceDesign')}`
})

/** 将工作区映射至项目修改范围，任一相关范围未保存即标脏。 */ function workspaceDirty(workspace: EditorWorkspace): boolean { const scopes = workspace==='script'?['script']:workspace==='animation'?['animation']:workspace==='ui'?['ui']:workspace==='manage'?['settings','packages','build','project']:workspace==='design'?['scene','asset']:[]; return scopes.some(/** 检查指定项目范围是否未保存。 */ scope=>projectScopeDirty(scope as Parameters<typeof projectScopeDirty>[0])) }
/** 设置命令面板模式并打开面板。 */ function openPalette(mode: 'commands' | 'quick'): void { state.commandPaletteMode = mode; state.commandPaletteOpen = true }

/** 应用所选工作区并更新本地化状态提示。 */ function selectWorkspace(workspace: EditorWorkspace): void {
  applyEditorWorkspace(workspace)
  state.statusText = t('workspaceActivated', { workspace: t(WORKSPACE_PRESETS.find(/* 比较 preset.id 与 workspace，返回严格相等的判断结果。 */ preset => preset.id === workspace)!.label) })
}
</script>

<style scoped>
.workspace-bar { flex:1 1 auto; min-width:0; display:flex; align-items:center; gap:var(--ui-space-xs); padding-inline:var(--ui-space-xs); overflow:visible; z-index:350; }
.workspace-list,.history-controls { display:flex; align-items:center; gap:var(--ui-space-micro); min-width:0; }
.workspace-list { overflow-x:auto; scrollbar-width:thin; }.workspace-list .ui-button { flex:none; }.workspace-spacer{flex:1}
.workspace-list .active{box-shadow:inset 0 -2px var(--accent)}
.dirty{inline-size:var(--ui-space-xs);block-size:var(--ui-space-xs);border-radius:50%;background:var(--warning);flex:none}
.context-title{min-width:0;max-width:24ch;display:grid;padding-inline:var(--ui-space-sm);border-left:1px solid var(--border-subtle)}
.context-title small,.context-title strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.context-title small{display:none}.context-title strong{font-size:var(--type-dense);font-weight:500}
.history-controls{flex:none;border-left:1px solid var(--border-subtle);padding-inline-start:var(--ui-space-xs)}.control-label{display:none}
.workspace-menu{position:relative;flex:none}.workspace-menu summary{display:flex;align-items:center;gap:var(--ui-space-xs)}
.workspace-popover{position:absolute;top:100%;right:0;min-width:24ch;max-width:min(38ch,90vw);padding:var(--ui-space-xs);display:grid;gap:var(--ui-space-micro);border:1px solid var(--border-strong);background:var(--surface-popover);box-shadow:var(--shadow-md);z-index:500}
.workspace-popover h3{font-size:var(--type-caption);color:var(--text-muted);margin:var(--ui-space-xs)}.workspace-popover .ui-button{justify-content:flex-start}.workspace-popover .ui-button>span{flex:1;text-align:left}.workspace-popover kbd{margin-left:auto;font-size:var(--type-caption)}
@media(max-width:1280px){.context-title{display:none}.workspace-menu summary>span{display:none}}
@media(max-width:1100px){.workspace-list .label{display:none}.workspace-list .ui-button{padding-inline:var(--ui-space-xs)}}
@media(max-width:680px){.history-controls{display:none}}
</style>
