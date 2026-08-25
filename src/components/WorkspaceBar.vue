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
    <div class="history-controls" :aria-label="t('navigationHistory')">
      <button :disabled="!workspaceState.navigationBack.length" :title="`${t('navigateBack')} (Alt+←)`" data-doc="manual/navigation-history" @click="navigateHistory('back')"><span aria-hidden="true">←</span><span class="control-label">{{ t('back') }}</span></button>
      <button :disabled="!workspaceState.navigationForward.length" :title="`${t('navigateForward')} (Alt+→)`" data-doc="manual/navigation-history" @click="navigateHistory('forward')"><span aria-hidden="true">→</span><span class="control-label">{{ t('forward') }}</span></button>
    </div>
    <details class="workspace-menu layout-menu">
      <summary :title="t('layoutPanels')"><span aria-hidden="true">◫</span><span>{{ t('layout') }}</span></summary>
      <div class="workspace-popover" role="group" :aria-label="t('layoutPanels')">
        <h3>{{ t('layoutPanels') }}</h3>
        <button :class="{ active: state.hierarchyVisible && !state.distractionFree }" :title="t('toggleHierarchy')" data-doc="manual/hierarchy" @click="toggleEditorPanel('hierarchy')"><span aria-hidden="true">☷</span><span>{{ t('hierarchy') }}</span><i>{{ state.hierarchyVisible && !state.distractionFree ? '✓' : '' }}</i></button>
        <button :class="{ active: state.inspectorVisible && !state.distractionFree }" :title="t('toggleInspector')" data-doc="manual/inspector" @click="toggleEditorPanel('inspector')"><span aria-hidden="true">◫</span><span>{{ t('inspector') }}</span><i>{{ state.inspectorVisible && !state.distractionFree ? '✓' : '' }}</i></button>
        <button :class="{ active: state.bottomPanelVisible && !state.distractionFree }" :title="t('toggleBottomPanel')" data-doc="manual/bottom-panel" @click="toggleEditorPanel('bottom')"><span aria-hidden="true">▤</span><span>{{ t('bottomPanel') }}</span><i>{{ state.bottomPanelVisible && !state.distractionFree ? '✓' : '' }}</i></button>
        <button :class="{ active: state.distractionFree }" :title="t('focusMode')" data-doc="manual/focus-mode" @click="toggleFocusMode"><span aria-hidden="true">⛶</span><span>{{ t('focusMode') }}</span><i>{{ state.distractionFree ? '✓' : '' }}</i></button>
        <button :title="`${t('manageWorkspaces')} (Ctrl+Alt+W)`" data-doc="manual/workspaces" @click="state.workspaceManagerOpen = true"><span aria-hidden="true">⚙</span><span>{{ t('manageWorkspaces') }}</span><i></i></button>
      </div>
    </details>
    <details class="workspace-menu command-menu">
      <summary :title="t('commands')"><span aria-hidden="true">⌕</span><span>{{ t('commands') }}</span></summary>
      <div class="workspace-popover command-popover" role="group" :aria-label="t('commands')">
        <h3>{{ t('commandsAndSearch') }}</h3>
        <button class="quick-trigger" data-shortcut="Ctrl+P" @click="openPalette('quick')"><span aria-hidden="true">⌕</span><span>{{ t('quickOpen') }}</span><kbd>Ctrl P</kbd></button>
        <button class="command-trigger" data-shortcut="Ctrl+Shift+P" @click="openPalette('commands')"><span aria-hidden="true">⌘</span><span>{{ t('commandPalette') }}</span><kbd>Ctrl Shift P</kbd></button>
      </div>
    </details>
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
.workspace-bar { min-height: 48px; flex: 0 0 48px; padding: 5px 9px; display: flex; align-items: center; gap: 7px; overflow: visible; border-bottom:1px solid var(--border-subtle); background:color-mix(in srgb,var(--surface-1) 92%,transparent); z-index: 350; }
.workspace-list, .history-controls { min-width: 0; display: flex; align-items: center; gap: 3px; }
.workspace-list { padding:3px; overflow-x:auto; border:1px solid var(--border-subtle); border-radius:var(--radius-control); background:var(--surface-2); scrollbar-width:none; }.workspace-list::-webkit-scrollbar { display: none; }
.workspace-spacer { flex: 1; }
.context-title{min-width:140px;max-width:min(290px,23vw);display:grid;align-content:center;padding:0 10px;border-left:1px solid var(--border-subtle)}.context-title small,.context-title strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.context-title small{color:var(--text-muted);font-size:var(--type-caption);font-weight:500}.context-title strong{font-size:var(--type-dense)}
button,summary { min-height: 34px; padding: 0 10px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; flex: 0 0 auto; border: 1px solid transparent; border-radius: 9px; color: var(--text-muted); background: transparent; font-size:var(--type-caption); white-space: nowrap; }
button:hover { color: var(--text-primary); background: var(--surface-hover); }
button.active { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 30%, transparent); background: var(--accent-soft); }
.workspace-list button span:first-child { min-width: 15px; color: currentColor; font: 600 var(--type-caption)/1 var(--font-mono); }
.workspace-list button i.dirty{width:6px;height:6px;min-width:6px;border-radius:50%;background:var(--warning);font-size:0;font-style:normal;box-shadow:0 0 0 2px color-mix(in srgb,var(--warning) 18%,transparent)}
.history-controls { flex:0 0 auto; padding-left:6px; border-left:1px solid var(--border-subtle) }.history-controls button{padding:0 8px}.workspace-menu{position:relative;flex:0 0 auto}.workspace-menu summary{min-width:82px;list-style:none;cursor:pointer;border-color:var(--border-subtle);background:var(--surface-2);font-weight:650}.workspace-menu summary::-webkit-details-marker{display:none}.workspace-menu[open] summary{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 40%,var(--border-strong));background:var(--accent-soft)}.workspace-popover{position:absolute;top:calc(100% + 7px);right:0;width:260px;padding:8px;display:grid;gap:3px;border:1px solid var(--border-strong);border-radius:var(--radius-panel);background:var(--surface-1);box-shadow:var(--shadow-float)}.workspace-popover h3{margin:2px 7px 6px;color:var(--text-muted);font-size:var(--type-caption);font-weight:750;letter-spacing:.035em;text-transform:uppercase}.workspace-popover button{width:100%;justify-content:flex-start}.workspace-popover button span:nth-child(2){min-width:0;overflow:hidden;text-overflow:ellipsis}.workspace-popover button i{margin-left:auto;font-style:normal}.command-popover{width:300px}.command-popover kbd{margin-left:auto;padding:2px 6px;border:1px solid var(--border-subtle);border-radius:5px;color:var(--text-muted);background:var(--surface-2);font:500 11px/1.2 var(--font-mono)}
@media (max-width: 1280px) { .control-label { position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%); }.history-controls button { width:34px;padding:0; }.context-title{max-width:180px}.workspace-menu summary{min-width:44px;padding:0 9px}.workspace-menu summary span:last-child{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)} }
@media (max-width: 920px) { .workspace-list .label { position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%); }.workspace-list button{width:34px;padding:0}.context-title{display:none} }
@media(max-width:680px){.workspace-list button{width:31px;min-height:31px}.workspace-bar{gap:4px;padding-inline:5px}.history-controls{display:none}}
</style>
