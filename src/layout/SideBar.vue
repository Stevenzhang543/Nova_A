<template>
  <aside class="sidebar" data-control-scope="context-rail" :aria-label="t('contextTools')">
    <header><span>{{ workspaceGlyph }}</span><small>{{ t('context') }}</small></header>
    <nav>
      <button v-for="item in actions" :key="item.id" :class="{ active: item.active }" :aria-pressed="item.active" :title="`${t(item.label)} · ${t(item.hint)}`" @click="item.run"><span aria-hidden="true">{{ item.icon }}</span><strong>{{ t(item.label) }}</strong></button>
    </nav>
    <button class="create" :title="t('createObject')" @click="state.createObjectPaletteOpen = true"><span>＋</span><strong>{{ t('create') }}</strong></button>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../i18n'
import { editorState as state, type ManageSection } from '../store/editor'
import { applyEditorWorkspace, openEditorTool, openManageSection } from '../editor/workspaces'

type TranslationKey = Parameters<typeof t>[0]
interface ContextAction { id: string; label: TranslationKey; hint: TranslationKey; icon: string; active: boolean; run: () => void }
const workspaceGlyph = computed(() => ({ design: '◇', script: '</>', animation: '◆', ui: '▣', debug: '◎', manage: '⚙', custom: '✦' })[state.activeWorkspace])
const tool = (id: string, label: TranslationKey, icon: string, tab: Parameters<typeof openEditorTool>[0]): ContextAction => ({ id, label, hint: 'openContextTool', icon, active: state.bottomPanelOpen && state.bottomPanelTab === tab, run: () => openEditorTool(tab) })
const manage = (section: ManageSection, label: TranslationKey, icon: string): ContextAction => ({ id: section, label, hint: 'openManageTool', icon, active: state.manageSection === section, run: () => openManageSection(section) })
const actions = computed<ContextAction[]>(() => {
  if (state.activeWorkspace === 'debug') return [
    { id: 'runtime', label: 'gameView', hint: 'embeddedRuntime', icon: '▶', active: state.currentPage === 'game', run: () => { state.currentPage = 'game' } },
    tool('console', 'console', '>_', 'console'), tool('profiler', 'profiler', '⌁', 'profiler'),
    { id: 'physics-monitor', label: 'physicsMonitor', hint: 'physicsMonitorContextHint', icon: 'ϟ', active: state.physicsMonitorOpen, run: () => { state.physicsMonitorOpen = !state.physicsMonitorOpen } }
  ]
  if (state.activeWorkspace === 'manage') return [manage('settings', 'projectSettings', '⚙'), manage('packages', 'packages', '◇'), manage('project', 'projectHealth', '✓'), manage('rendering', 'renderingStudio', '◈'), manage('build', 'buildPanel', '▶')]
  if (state.activeWorkspace === 'script') return [
    { id: 'script', label: 'workspaceScript', hint: 'scriptStudioAssetHint', icon: '{ }', active: true, run: () => applyEditorWorkspace('script') },
    { id: 'quick-open', label: 'quickOpen', hint: 'quickOpenHint', icon: '⌕', active: false, run: () => { state.commandPaletteMode = 'quick'; state.commandPaletteOpen = true } }
  ]
  if (state.activeWorkspace === 'animation') return [tool('timeline', 'animation', '◆', 'animation'), tool('assets', 'assets', '▧', 'assets')]
  if (state.activeWorkspace === 'ui') return [tool('ui-assets', 'assets', '▧', 'assets'), tool('ui-audio', 'audioMixer', '♫', 'audio')]
  return [
    { id: 'scene', label: 'sceneView', hint: 'scene', icon: '◇', active: state.currentPage === 'scene', run: () => applyEditorWorkspace('design') },
    tool('assets', 'assets', '▧', 'assets'), tool('console', 'console', '>_', 'console')
  ]
})
</script>

<style scoped>
.sidebar{width:68px;flex:0 0 68px;padding:6px;display:flex;flex-direction:column;gap:7px;border-right:1px solid var(--border-subtle);background:var(--surface-1);z-index:160}.sidebar>header{height:43px;display:grid;place-items:center;border-bottom:1px solid var(--border-subtle)}.sidebar>header span{color:var(--accent);font:700 var(--type-dense)/1 var(--font-mono)}.sidebar>header small{color:var(--text-muted);font-size:var(--type-caption)}nav{min-height:0;display:flex;flex:1;flex-direction:column;gap:4px;overflow-y:auto;scrollbar-width:none}nav::-webkit-scrollbar{display:none}button{width:100%;min-width:0;min-height:48px;padding:4px 2px;display:flex;overflow:hidden;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:1px solid transparent;border-radius:var(--radius-panel);color:var(--text-muted);background:transparent}button>span{font:600 var(--type-dense)/1 var(--font-mono)}button strong{width:100%;max-width:100%;overflow:hidden;font-size:var(--type-caption);font-weight:600;text-overflow:ellipsis;white-space:nowrap}button:hover{color:var(--text-primary);background:var(--surface-hover)}button.active{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 35%,transparent);background:var(--selection-bg)}.create{margin-top:auto;color:var(--accent);border-color:color-mix(in srgb,var(--accent) 35%,transparent);background:var(--accent-soft)}
@media(max-width:720px){.sidebar{width:54px;flex-basis:54px}.sidebar>header small,button strong{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}button{min-height:42px}}
</style>
