<template>
  <nav class="workspace-bar" role="toolbar" :aria-label="t('workspaces')">
    <div class="workspace-list">
      <button
        v-for="preset in visiblePresets"
        :key="preset.id"
        :class="{ active: state.activeWorkspace === preset.id }"
        @click="selectWorkspace(preset.id)"
      :title="`${t(preset.label)} · ${t('workspacePreset')}`"
      ><span aria-hidden="true">{{ workspaceIcon(preset.id) }}</span><span class="label">{{ preset.id === 'custom' ? activeCustomName : t(preset.label) }}</span></button>
    </div>
    <span class="workspace-spacer"></span>
    <div class="panel-controls" :aria-label="t('layoutPanels')">
      <button :disabled="!workspaceState.navigationBack.length" :title="`${t('navigateBack')} (Alt+←)`" data-doc="manual/navigation-history" @click="navigateHistory('back')"><span aria-hidden="true">←</span><span class="control-label">{{ t('back') }}</span></button>
      <button :disabled="!workspaceState.navigationForward.length" :title="`${t('navigateForward')} (Alt+→)`" data-doc="manual/navigation-history" @click="navigateHistory('forward')"><span aria-hidden="true">→</span><span class="control-label">{{ t('forward') }}</span></button>
      <button :class="{ active: state.hierarchyVisible && !state.distractionFree }" :title="t('toggleHierarchy')" data-doc="manual/hierarchy" @click="toggleEditorPanel('hierarchy')"><span aria-hidden="true">☷</span><span class="control-label">{{ t('hierarchy') }}</span></button>
      <button :class="{ active: state.inspectorVisible && !state.distractionFree }" :title="t('toggleInspector')" data-doc="manual/inspector" @click="toggleEditorPanel('inspector')"><span aria-hidden="true">◫</span><span class="control-label">{{ t('inspector') }}</span></button>
      <button :class="{ active: state.bottomPanelVisible && !state.distractionFree }" :title="t('toggleBottomPanel')" data-doc="manual/bottom-panel" @click="toggleEditorPanel('bottom')"><span aria-hidden="true">▤</span><span class="control-label">{{ t('bottomPanel') }}</span></button>
      <button :class="{ active: state.distractionFree }" :title="t('focusMode')" data-doc="manual/focus-mode" @click="toggleFocusMode"><span aria-hidden="true">⛶</span><span class="control-label">{{ t('focusMode') }}</span></button>
      <button :title="`${t('manageWorkspaces')} (Ctrl+Alt+W)`" data-doc="manual/workspaces" @click="state.workspaceManagerOpen = true"><span aria-hidden="true">⚙</span><span class="control-label">{{ t('manage') }}</span></button>
      <button class="command-trigger" :title="t('commandPalette')" @click="state.commandPaletteOpen = true"><span>⌘</span> K</button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../i18n'
import { editorState as state, type EditorWorkspace } from '../store/editor'
import { applyEditorWorkspace, navigateHistory, toggleEditorPanel, toggleFocusMode, WORKSPACE_PRESETS, workspaceState } from '../editor/workspaces'

const visiblePresets = computed(() => WORKSPACE_PRESETS.filter(preset => preset.id !== 'custom' || workspaceState.custom.length > 0))
const activeCustomName = computed(() => workspaceState.custom.find(item => item.id === workspaceState.selectedCustomId)?.name ?? t('workspaceCustom'))

function workspaceIcon(workspace: EditorWorkspace): string {
  return ({ design: '◇', script: '</>', animation: '◆', ui: '▣', debug: '◎', custom: '✦' })[workspace]
}

function selectWorkspace(workspace: EditorWorkspace): void {
  applyEditorWorkspace(workspace)
  state.statusText = t('workspaceActivated', { workspace: t(WORKSPACE_PRESETS.find(preset => preset.id === workspace)!.label) })
}
</script>

<style scoped>
.workspace-bar { min-height: 42px; flex: 0 0 42px; padding: 4px 8px; display: flex; align-items: center; gap: 6px; overflow: hidden; background: transparent; z-index: 250; }
.workspace-list, .panel-controls { min-width: 0; display: flex; align-items: center; gap: 3px; }
.workspace-list { overflow-x: auto; scrollbar-width: none; }.workspace-list::-webkit-scrollbar { display: none; }
.workspace-spacer { flex: 1; }
button { min-height: 34px; padding: 0 10px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; flex: 0 0 auto; border: 1px solid transparent; border-radius: 8px; color: var(--text-muted); background: transparent; font-size:11px; white-space: nowrap; }
button:hover { color: var(--text-primary); background: var(--surface-hover); }
button.active { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 30%, transparent); background: var(--accent-soft); }
.workspace-list button span { min-width: 15px; color: currentColor; font: 600 11px/1 ui-monospace, SFMono-Regular, Consolas, monospace; }
.panel-controls { flex: 0 0 auto; padding-left: 6px; border-left: 1px solid var(--border-subtle); }.panel-controls button { padding: 0 7px; font-size:11px; font-weight: 650; }.panel-controls .command-trigger { padding: 0 8px; font-weight: 550; }.command-trigger span { color: var(--text-muted); }
@media (max-width: 1280px) { .control-label { position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%); }.panel-controls button { width:34px;padding:0; } }
@media (max-width: 900px) { .workspace-list .label { position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%); }.workspace-list button{width:34px;padding:0}.panel-controls button:nth-child(3),.panel-controls button:nth-child(4),.panel-controls button:nth-child(5){display:none} }
</style>
