<template>
  <nav class="workspace-bar" role="toolbar" :aria-label="t('workspaces')">
    <div class="workspace-list">
      <button
        v-for="preset in visiblePresets"
        :key="preset.id"
        :class="{ active: state.activeWorkspace === preset.id }"
        :aria-pressed="state.activeWorkspace === preset.id"
        @click="selectWorkspace(preset.id)"
      :title="`${t(preset.label)} · ${t('workspacePreset')}`"
      ><span aria-hidden="true">{{ workspaceIcon(preset.id) }}</span><span class="label">{{ t(preset.label) }}</span><i v-if="workspaceDirty(preset.id)" class="dirty" :title="t('unsavedChanges')">●</i></button>
    </div>
    <div class="context-title" :title="contextTitle"><small>{{ t('currentContext') }}</small><strong>{{ contextTitle }}</strong></div>
    <span class="workspace-spacer"></span>
    <div class="panel-controls" :aria-label="t('layoutPanels')">
      <button :disabled="!workspaceState.navigationBack.length" :title="`${t('navigateBack')} (Alt+←)`" data-doc="manual/navigation-history" @click="navigateHistory('back')"><span aria-hidden="true">←</span><span class="control-label">{{ t('back') }}</span></button>
      <button :disabled="!workspaceState.navigationForward.length" :title="`${t('navigateForward')} (Alt+→)`" data-doc="manual/navigation-history" @click="navigateHistory('forward')"><span aria-hidden="true">→</span><span class="control-label">{{ t('forward') }}</span></button>
      <button :class="{ active: state.hierarchyVisible && !state.distractionFree }" :title="t('toggleHierarchy')" data-doc="manual/hierarchy" @click="toggleEditorPanel('hierarchy')"><span aria-hidden="true">☷</span><span class="control-label">{{ t('hierarchy') }}</span></button>
      <button :class="{ active: state.inspectorVisible && !state.distractionFree }" :title="t('toggleInspector')" data-doc="manual/inspector" @click="toggleEditorPanel('inspector')"><span aria-hidden="true">◫</span><span class="control-label">{{ t('inspector') }}</span></button>
      <button :class="{ active: state.bottomPanelVisible && !state.distractionFree }" :title="t('toggleBottomPanel')" data-doc="manual/bottom-panel" @click="toggleEditorPanel('bottom')"><span aria-hidden="true">▤</span><span class="control-label">{{ t('bottomPanel') }}</span></button>
      <button :class="{ active: state.distractionFree }" :title="t('focusMode')" data-doc="manual/focus-mode" @click="toggleFocusMode"><span aria-hidden="true">⛶</span><span class="control-label">{{ t('focusMode') }}</span></button>
      <button :title="`${t('manageWorkspaces')} (Ctrl+Alt+W)`" data-doc="manual/workspaces" @click="state.workspaceManagerOpen = true"><span aria-hidden="true">⚙</span><span class="control-label">{{ t('manage') }}</span></button>
      <button class="quick-trigger" :title="`${t('quickOpen')} (Ctrl+P)`" data-shortcut="Ctrl+P" @click="openPalette('quick')"><span>⌕</span>P</button>
      <button class="command-trigger" :title="`${t('commandPalette')} (Ctrl+Shift+P)`" data-shortcut="Ctrl+Shift+P" @click="openPalette('commands')"><span>⌘</span>P</button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../i18n'
import { editorState as state, type EditorWorkspace } from '../store/editor'
import { applyEditorWorkspace, navigateHistory, toggleEditorPanel, toggleFocusMode, WORKSPACE_PRESETS, workspaceState } from '../editor/workspaces'
import { projectSessionState } from '../projects/projectSession'
import { physicsState } from '../store/physics'
import { projectScopeDirty } from '../runtime/projectTransactions'

const visiblePresets = computed(() => WORKSPACE_PRESETS.filter(preset => preset.id !== 'custom'))
const contextTitle = computed(() => {
  const selected = physicsState.world.entities.find(entity => entity.id === physicsState.selectedEntityId)
  if (state.activeWorkspace === 'manage') return `${projectSessionState.name} / ${t(state.manageSection === 'project' ? 'projectHealth' : state.manageSection === 'build' ? 'buildPanel' : state.manageSection === 'rendering' ? 'renderingStudio' : state.manageSection === 'packages' ? 'packages' : 'projectSettings')}`
  return `${projectSessionState.name} / ${selected?.name ?? t(WORKSPACE_PRESETS.find(item => item.id === state.activeWorkspace)?.label ?? 'workspaceDesign')}`
})

function workspaceIcon(workspace: EditorWorkspace): string {
  return ({ design: '◇', script: '</>', animation: '◆', ui: '▣', debug: '◎', manage: '⚙', custom: '✦' })[workspace]
}
function workspaceDirty(workspace: EditorWorkspace): boolean { const scopes = workspace==='script'?['script']:workspace==='animation'?['animation']:workspace==='ui'?['ui']:workspace==='manage'?['settings','packages','build','project']:workspace==='design'?['scene','asset']:[]; return scopes.some(scope=>projectScopeDirty(scope as Parameters<typeof projectScopeDirty>[0])) }
function openPalette(mode: 'commands' | 'quick'): void { state.commandPaletteMode = mode; state.commandPaletteOpen = true }

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
.context-title{min-width:0;max-width:min(300px,24vw);display:grid;align-content:center;padding:0 9px;border-left:1px solid var(--border-subtle)}.context-title small,.context-title strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.context-title small{color:var(--text-muted);font-size:var(--type-caption);font-weight:400}.context-title strong{font-size:var(--type-dense)}
button { min-height: 34px; padding: 0 10px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; flex: 0 0 auto; border: 1px solid transparent; border-radius: 8px; color: var(--text-muted); background: transparent; font-size:11px; white-space: nowrap; }
button:hover { color: var(--text-primary); background: var(--surface-hover); }
button.active { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 30%, transparent); background: var(--accent-soft); }
.workspace-list button span { min-width: 15px; color: currentColor; font: 600 11px/1 var(--font-mono); }
.workspace-list button i.dirty{width:6px;height:6px;min-width:6px;border-radius:50%;background:var(--warning);font-size:0;font-style:normal;box-shadow:0 0 0 2px color-mix(in srgb,var(--warning) 18%,transparent)}
.panel-controls { flex: 0 0 auto; padding-left: 6px; border-left: 1px solid var(--border-subtle); }.panel-controls button { padding: 0 7px; font-size:var(--type-caption); font-weight:600; }.panel-controls .command-trigger,.panel-controls .quick-trigger { padding: 0 8px; font-weight:600; }.command-trigger span,.quick-trigger span { color: var(--text-muted); }
@media (max-width: 1280px) { .control-label { position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%); }.panel-controls button { width:34px;padding:0; } }
@media (max-width: 900px) { .workspace-list .label { position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%); }.workspace-list button{width:34px;padding:0}.panel-controls button:nth-child(3),.panel-controls button:nth-child(4),.panel-controls button:nth-child(5){display:none} }
@media(max-width:1100px){.context-title{display:none}}
</style>
