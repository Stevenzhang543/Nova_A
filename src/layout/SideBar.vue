<!-- 上下文侧栏：按活动工作区提供工具入口和当前激活状态。 -->
<template>
  <aside v-if="state.activeWorkspace !== 'manage'" class="sidebar" data-control-scope="context-rail" :aria-label="t('contextTools')">
    <header><EditorIcon :name="state.activeWorkspace" /><small>{{ t('context') }}</small></header>
    <nav>
      <UiButton v-for="item in actions" :icon="item.icon" :label="`${t(item.label)} · ${t(item.hint)}`" :key="item.id" :class="{ active: item.active }" :aria-pressed="item.active" :title="`${t(item.label)} · ${t(item.hint)}`" @click="item.run"></UiButton>
    </nav>
    <UiButton class="create" icon="add" :label="t('createObject')" @click="state.createObjectPaletteOpen = true" />
  </aside>
</template>

<script setup lang="ts">
import UiButton from '../ui/components/UiButton.vue'
import { computed } from 'vue'
import EditorIcon, { type EditorIconName } from '../components/EditorIcon.vue'
import { t } from '../i18n'
import { editorState as state, type ManageSection } from '../store/editor'
import { applyEditorWorkspace, openEditorTool, openManageSection } from '../editor/workspaces'

type TranslationKey = Parameters<typeof t>[0]
interface ContextAction { id: string; label: TranslationKey; hint: TranslationKey; icon: EditorIconName; active: boolean; run: () => void }
const tool = /** 构造指定底部工具的上下文动作及活动标记。 */ (id: string, label: TranslationKey, icon: EditorIconName, tab: Parameters<typeof openEditorTool>[0]): ContextAction => ({ id, label, hint: 'openContextTool', icon, active: state.bottomPanelOpen && state.bottomPanelTab === tab, run: /** 打开指定底部工具。 */ () => openEditorTool(tab) })
const manage = /** 构造指定管理栏目的上下文动作。 */ (section: ManageSection, label: TranslationKey, icon: EditorIconName): ContextAction => ({ id: section, label, hint: 'openManageTool', icon, active: state.manageSection === section, run: /** 打开指定管理栏目。 */ () => openManageSection(section) })
const actions = computed<ContextAction[]>(/** 按调试、管理、脚本、动画、界面或设计工作区生成上下文入口。 */ () => {
  if (state.activeWorkspace === 'debug') return [
    { id: 'runtime', label: 'gameView', hint: 'embeddedRuntime', icon: 'play', active: state.currentPage === 'game', run: /** 打开游戏视图。 */ () => { state.currentPage = 'game' } },
    tool('console', 'console', 'terminal', 'console'), tool('profiler', 'profiler', 'profiler', 'profiler'),
    { id: 'physics-monitor', label: 'physicsMonitor', hint: 'physicsMonitorContextHint', icon: 'physics', active: state.physicsMonitorOpen, run: /** 切换物理监视器显示。 */ () => { state.physicsMonitorOpen = !state.physicsMonitorOpen } }
  ]
  if (state.activeWorkspace === 'manage') return [manage('settings', 'projectSettings', 'settings'),manage('automation','automationStudio','tools'), manage('packages', 'packages', 'design'), manage('project', 'projectHealth', 'check'), manage('rendering', 'renderingStudio', 'render'), manage('build', 'buildPanel', 'play')]
  if (state.activeWorkspace === 'script') return [
    { id: 'script', label: 'workspaceScript', hint: 'scriptStudioAssetHint', icon: 'script', active: true, run: /** 应用脚本工作区。 */ () => applyEditorWorkspace('script') },
    { id: 'quick-open', label: 'quickOpen', hint: 'quickOpenHint', icon: 'search', active: false, run: /** 设置快速打开模式并打开命令面板。 */ () => { state.commandPaletteMode = 'quick'; state.commandPaletteOpen = true } }
  ]
  if (state.activeWorkspace === 'animation') return [tool('timeline', 'animation', 'animation', 'animation'), tool('assets', 'assets', 'assets', 'assets')]
  if (state.activeWorkspace === 'ui') return [tool('ui-assets', 'assets', 'assets', 'assets'), tool('ui-audio', 'audioMixer', 'audio', 'audio')]
  return [
    { id: 'scene', label: 'sceneView', hint: 'scene', icon: 'design', active: state.currentPage === 'scene', run: /** 应用设计工作区。 */ () => applyEditorWorkspace('design') },
    tool('assets', 'assets', 'assets', 'assets'), tool('console', 'console', 'terminal', 'console')
  ]
})
</script>

<style scoped>
.sidebar{inline-size:calc(var(--ui-control-height) + 2 * var(--ui-space-xs));flex:none;padding:var(--ui-space-xs);display:flex;flex-direction:column;gap:var(--ui-space-sm);border-right:1px solid var(--border-subtle);background:var(--surface-1);z-index:160}.sidebar>header{display:none}nav{display:flex;flex:1;min-height:0;flex-direction:column;gap:var(--ui-space-xs);overflow-y:auto;scrollbar-width:thin}.sidebar .ui-button{flex:none}.create{margin-top:auto;color:var(--creation)}
</style>
