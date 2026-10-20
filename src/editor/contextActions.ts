/** 26.44 G1: the workspace context tools (scene/game view, bottom tools, debug monitors, Create).
 * One list for both places that show it: the top of the docked Hierarchy panel (the rail merged into
 * it) and the narrow rail that remains when the Hierarchy is hidden, floating or an overlay. */
import { computed, type ComputedRef } from 'vue'
import type { EditorIconName } from '../components/EditorIcon.vue'
import { t } from '../i18n'
import { editorState as state, type ManageSection } from '../store/editor'
import { applyEditorWorkspace, openEditorTool, openManageSection } from './workspaces'

export type TranslationKey = Parameters<typeof t>[0]
export interface ContextAction { id: string; label: TranslationKey; hint: TranslationKey; icon: EditorIconName; active: boolean; run: () => void }
const tool = /** 构造指定底部工具的上下文动作及活动标记。 */ (id: string, label: TranslationKey, icon: EditorIconName, tab: Parameters<typeof openEditorTool>[0]): ContextAction => ({ id, label, hint: 'openContextTool', icon, active: state.bottomPanelOpen && state.bottomPanelTab === tab, run: /** 打开指定底部工具。 */ () => openEditorTool(tab) })
const manage = /** 构造指定管理栏目的上下文动作。 */ (section: ManageSection, label: TranslationKey, icon: EditorIconName): ContextAction => ({ id: section, label, hint: 'openManageTool', icon, active: state.manageSection === section, run: /** 打开指定管理栏目。 */ () => openManageSection(section) })
const contextActions = computed<ContextAction[]>(/** 按调试、管理、脚本、动画、界面或设计工作区生成上下文入口。 */ () => {
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

/** The tools of the active workspace (shared, recomputed when the workspace or tool state changes). */
export function useContextActions(): ComputedRef<ContextAction[]> { return contextActions }
