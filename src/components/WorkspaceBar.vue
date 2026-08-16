<template>
  <nav class="workspace-bar" :aria-label="t('workspaces')">
    <div class="workspace-list">
      <button
        v-for="preset in WORKSPACE_PRESETS"
        :key="preset.id"
        :class="{ active: state.activeWorkspace === preset.id }"
        @click="selectWorkspace(preset.id)"
      ><span>{{ workspaceIcon(preset.id) }}</span>{{ t(preset.label) }}</button>
    </div>
    <span class="workspace-spacer"></span>
    <div class="panel-controls" :aria-label="t('layoutPanels')">
      <button :class="{ active: state.hierarchyVisible && !state.distractionFree }" :title="t('toggleHierarchy')" @click="toggleEditorPanel('hierarchy')">H</button>
      <button :class="{ active: state.inspectorVisible && !state.distractionFree }" :title="t('toggleInspector')" @click="toggleEditorPanel('inspector')">I</button>
      <button :class="{ active: state.bottomPanelVisible && !state.distractionFree }" :title="t('toggleBottomPanel')" @click="toggleEditorPanel('bottom')">B</button>
      <button :class="{ active: state.distractionFree }" :title="t('focusMode')" @click="toggleFocusMode">⛶</button>
      <button class="command-trigger" :title="t('commandPalette')" @click="state.commandPaletteOpen = true"><span>⌘</span> K</button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { t } from '../i18n'
import { editorState as state, type EditorWorkspace } from '../store/editor'
import { applyEditorWorkspace, toggleEditorPanel, toggleFocusMode, WORKSPACE_PRESETS } from '../editor/workspaces'

function workspaceIcon(workspace: EditorWorkspace): string {
  return ({ design: '◇', script: '</>', animation: '◆', interface: '▣', debug: '◎' })[workspace]
}

function selectWorkspace(workspace: EditorWorkspace): void {
  applyEditorWorkspace(workspace)
  state.statusText = t('workspaceActivated', { workspace: t(WORKSPACE_PRESETS.find(preset => preset.id === workspace)!.label) })
}
</script>

<style scoped>
.workspace-bar { min-height: 38px; flex: 0 0 38px; padding: 4px 8px; display: flex; align-items: center; gap: 6px; overflow: hidden; background: transparent; z-index: 250; }
.workspace-list, .panel-controls { min-width: 0; display: flex; align-items: center; gap: 3px; }
.workspace-list { overflow-x: auto; scrollbar-width: none; }.workspace-list::-webkit-scrollbar { display: none; }
.workspace-spacer { flex: 1; }
button { height: 29px; padding: 0 10px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; flex: 0 0 auto; border: 1px solid transparent; border-radius: 8px; color: var(--text-muted); background: transparent; font-size:11px; white-space: nowrap; }
button:hover { color: var(--text-primary); background: var(--surface-hover); }
button.active { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 30%, transparent); background: var(--accent-soft); }
.workspace-list button span { min-width: 15px; color: currentColor; font: 600 10px/1 ui-monospace, SFMono-Regular, Consolas, monospace; }
.panel-controls { flex: 0 0 auto; padding-left: 6px; border-left: 1px solid var(--border-subtle); }.panel-controls button { width: 29px; padding: 0; font-size:11px; font-weight: 700; }.panel-controls .command-trigger { width: auto; padding: 0 8px; font-weight: 550; }.command-trigger span { color: var(--text-muted); }
@media (max-width: 1180px) { .workspace-list button { width: 31px; padding: 0; font-size: 0; }.workspace-list button span { font-size:11px; }.panel-controls { padding-left: 3px; }.panel-controls button:nth-child(-n+3) { display: none; } }
</style>
