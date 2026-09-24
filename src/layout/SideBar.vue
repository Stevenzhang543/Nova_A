<!-- 上下文侧栏：按活动工作区提供工具入口和当前激活状态。 -->
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
const workspaceGlyph = computed(/* 返回 ({ design: '◇', script: '</>', animation: '◆', ui: '▣', debug: '◎', manage: '⚙', custom: '✦' })[state.activeWorkspace] 的当前值。 */ () => ({ design: '◇', script: '</>', animation: '◆', ui: '▣', debug: '◎', manage: '⚙', custom: '✦' })[state.activeWorkspace])
const tool = /** 构造指定底部工具的上下文动作及活动标记。 */ (id: string, label: TranslationKey, icon: string, tab: Parameters<typeof openEditorTool>[0]): ContextAction => ({ id, label, hint: 'openContextTool', icon, active: state.bottomPanelOpen && state.bottomPanelTab === tab, run: /** 打开指定底部工具。 */ () => openEditorTool(tab) })
const manage = /** 构造指定管理栏目的上下文动作。 */ (section: ManageSection, label: TranslationKey, icon: string): ContextAction => ({ id: section, label, hint: 'openManageTool', icon, active: state.manageSection === section, run: /** 打开指定管理栏目。 */ () => openManageSection(section) })
const actions = computed<ContextAction[]>(/** 按调试、管理、脚本、动画、界面或设计工作区生成上下文入口。 */ () => {
  if (state.activeWorkspace === 'debug') return [
    { id: 'runtime', label: 'gameView', hint: 'embeddedRuntime', icon: '▶', active: state.currentPage === 'game', run: /** 打开游戏视图。 */ () => { state.currentPage = 'game' } },
    tool('console', 'console', '>_', 'console'), tool('profiler', 'profiler', '⌁', 'profiler'),
    { id: 'physics-monitor', label: 'physicsMonitor', hint: 'physicsMonitorContextHint', icon: 'ϟ', active: state.physicsMonitorOpen, run: /** 切换物理监视器显示。 */ () => { state.physicsMonitorOpen = !state.physicsMonitorOpen } }
  ]
  if (state.activeWorkspace === 'manage') return [manage('settings', 'projectSettings', '⚙'),manage('automation','automationStudio','✦'), manage('packages', 'packages', '◇'), manage('project', 'projectHealth', '✓'), manage('rendering', 'renderingStudio', '◈'), manage('build', 'buildPanel', '▶')]
  if (state.activeWorkspace === 'script') return [
    { id: 'script', label: 'workspaceScript', hint: 'scriptStudioAssetHint', icon: '{ }', active: true, run: /** 应用脚本工作区。 */ () => applyEditorWorkspace('script') },
    { id: 'quick-open', label: 'quickOpen', hint: 'quickOpenHint', icon: '⌕', active: false, run: /** 设置快速打开模式并打开命令面板。 */ () => { state.commandPaletteMode = 'quick'; state.commandPaletteOpen = true } }
  ]
  if (state.activeWorkspace === 'animation') return [tool('timeline', 'animation', '◆', 'animation'), tool('assets', 'assets', '▧', 'assets')]
  if (state.activeWorkspace === 'ui') return [tool('ui-assets', 'assets', '▧', 'assets'), tool('ui-audio', 'audioMixer', '♫', 'audio')]
  return [
    { id: 'scene', label: 'sceneView', hint: 'scene', icon: '◇', active: state.currentPage === 'scene', run: /** 应用设计工作区。 */ () => applyEditorWorkspace('design') },
    tool('assets', 'assets', '▧', 'assets'), tool('console', 'console', '>_', 'console')
  ]
})
</script>

<style scoped>
.sidebar{width:var(--context-rail-width,116px);flex:0 0 var(--context-rail-width,116px);padding:7px;display:flex;flex-direction:column;gap:8px;border-right:1px solid var(--border-subtle);background:color-mix(in srgb,var(--surface-1) 97%,var(--bg-base));box-shadow:inset -1px 0 color-mix(in srgb,var(--accent) 4%,transparent);z-index:160}.sidebar>header{height:auto;min-height:46px;flex-shrink:0;padding-block:6px;display:grid;place-items:center;border-bottom:1px solid var(--border-subtle)}.sidebar>header span{color:var(--accent);font:700 var(--type-dense)/1 var(--font-mono)}.sidebar>header small{color:var(--text-muted);font-size:var(--type-caption)}nav{min-height:0;display:flex;flex:1;flex-direction:column;gap:5px;overflow-y:auto;scrollbar-width:thin}button{flex-shrink:0;position:relative;width:100%;min-width:0;min-height:56px;padding:6px 4px;display:flex;overflow:hidden;flex-direction:column;align-items:center;justify-content:center;gap:5px;border:1px solid transparent;border-radius:var(--radius-panel);color:var(--text-muted);background:transparent}button::before{content:"";position:absolute;left:0;top:13px;bottom:13px;width:3px;border-radius:0 3px 3px 0;background:transparent}button>span{font:650 var(--type-dense)/1 var(--font-mono)}button strong{width:100%;max-width:100%;display:block;overflow:visible;font-size:var(--type-caption);font-weight:650;line-height:1.35;text-align:center;text-overflow:ellipsis;overflow-wrap:normal;word-break:normal;hyphens:auto;white-space:normal}button:hover{color:var(--text-primary);background:var(--surface-hover)}button.active{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 35%,transparent);background:var(--selection-bg)}button.active::before{background:var(--accent)}.create{margin-top:auto;color:var(--creation,var(--accent));border-color:color-mix(in srgb,var(--creation,var(--accent)) 38%,transparent);background:var(--creation-soft,var(--accent-soft))}.create::before{background:var(--creation,var(--accent))}
@media(max-width:720px){.sidebar{width:56px;flex-basis:56px;padding:6px}.sidebar>header small,button strong{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}button{min-height:44px}}
</style>
