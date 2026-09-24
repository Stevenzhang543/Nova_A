<!-- 命令面板：搜索并执行编辑命令，支持快速导航。 -->
<template>
  <Teleport to="body">
    <Transition name="palette">
      <div v-if="state.commandPaletteOpen" class="palette-scrim" role="presentation" @mousedown.self="close">
        <section ref="dialog" class="command-palette" role="dialog" aria-modal="true" v-modal-focus :aria-label="t('commandPalette')">
          <header>
            <span>⌕</span>
            <input ref="searchInput" v-model="query" type="search" :placeholder="palettePlaceholder" @keydown="onKeyDown">
            <kbd>Esc</kbd>
          </header>
          <div class="command-results" role="listbox">
            <button
              v-for="(command, index) in filteredCommands"
              :key="command.id"
              :class="{ active: index === activeIndex }"
              role="option"
              :aria-selected="index === activeIndex"
              @mouseenter="activeIndex = index"
              @click="run(command)"
            ><span class="command-icon">{{ command.icon }}</span><span><strong>{{ t(command.label) }}</strong><small>{{ t(command.group) }}</small></span><kbd v-if="command.shortcut">{{ command.shortcut }}</kbd></button>
            <p v-if="!filteredCommands.length">{{ t('noCommandsFound') }}</p>
          </div>
          <footer><span>↑↓ {{ t('navigate') }}</span><span>↵ {{ t('runCommand') }}</span></footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { vModalFocus } from '../editor/modalFocus'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { t } from '../i18n'
import { addEditorLog, editorState as state, type BottomPanelTab, type EditorWorkspace } from '../store/editor'
import { applyEditorWorkspace, navigateHistory, openEditorTool, openManageSection, resetEditorLayout, toggleEditorPanel, toggleFocusMode, workspaceState } from '../editor/workspaces'
import { pluginRuntime, pluginState } from '../runtime/plugins'
import { assetState } from '../assets/AssetDatabase'
import { copySelectedEntities, deleteSelected, duplicateSelectedEntities, historyState, pasteEntities, physicsState, pushHistory, redo, saveProject, sceneManager, selectEntities, setActiveScene, stopPlayMode, toggleSimulation, undo } from '../store/physics'
import { shortcutMatches, shortcutState } from '../editor/shortcuts'
import { toggleEditorFullscreen } from '../runtime/editorWindow'
import { preferencesState } from '../store/preferences'
import { requestConfirmation } from '../store/dialog'
import { completeTask, failTask, startTask } from '../runtime/editorFeedback'
import { gameplayRuntime } from '../runtime/GameplayRuntime'
import { applyCurrentProjectRepair, previewCurrentProjectRepair, validateCurrentProject } from '../runtime/projectIntegrity'
import { focusStableControl, stableControlInventory } from '../runtime/controlRegistry'
import { simulationPreflight } from '../runtime/simulationAuthoring26'

type TranslationKey = Parameters<typeof t>[0]
interface EditorCommand { id: string; label: TranslationKey; group: TranslationKey; icon: string; shortcut?: string; keywords: string; run: () => void }

const searchInput = ref<HTMLInputElement | null>(null)
const dialog = ref<HTMLElement | null>(null)
const query = ref('')
const activeIndex = ref(0)
const isEditing = computed(/* 比较 physicsState.playMode 与 'editing'，返回严格相等的判断结果。 */ () => physicsState.playMode === 'editing')
const palettePlaceholder = computed(/** 根据快速、全局、上下文或命令模式返回面板标题。 */ () => t(state.commandPaletteMode === 'quick' ? 'quickOpen' : state.commandPaletteMode === 'global' ? 'globalSearch' : state.commandPaletteMode === 'context' ? 'contextSearch' : 'searchCommands'))

/** 仅在编辑模式执行项目保存任务，显示保存完成或取消，异常记为任务失败。 */ async function saveFromPalette(): Promise<void> {
  if (!isEditing.value) return
  const task = startTask(t('saveProject'), { detail: t('atomicSaveInProgress') })
  try {
    const saved = await saveProject()
    completeTask(task, t(saved ? 'atomicSaveComplete' : 'saveCancelled'))
  } catch (error) { failTask(task, error) }
}
/** 有可编辑选择时按偏好确认删除，成功删除并记录历史。 */ async function deleteFromPalette(): Promise<void> {
  if (!isEditing.value || !physicsState.selectedEntityIds.length) return
  const approved = !preferencesState.confirmDestructiveActions || await requestConfirmation({ title: t('deleteObjectTitle'), message: t('confirmDeleteObject'), confirmLabel: t('confirmAction'), cancelLabel: t('cancel'), destructive: true })
  if (approved) { deleteSelected(); pushHistory('Delete entities') }
}
/** 等待物理模块并执行仿真预检，阻断则显示问题，复核项记录日志，通过后启动会话。 */ async function playFromPalette(): Promise<void> {
  await physicsState.world.wasmReady
  if (physicsState.world.wasmError) return
  const { blocked, reviews } = simulationPreflight(physicsState.world.entities, physicsState.world.connections, physicsState.globalSettings)
  if (blocked.length) {
    const summary = `${t('simulationReadiness')}: ${t('blocked')} (${blocked.length}) · ${blocked.map(/* 返回 issue.code 的当前值。 */ issue => issue.code).join(', ')}`
    state.statusText = summary; addEditorLog(summary, 'Physics')
    return
  }
  if (reviews.length) addEditorLog(`${t('simulationReadiness')}: ${t('mediaStatus_review')} (${reviews.length}) · ${reviews.map(/* 返回 issue.code 的当前值。 */ issue => issue.code).join(', ')}`, 'Physics')
  if (!toggleSimulation(true)) return; gameplayRuntime.beginSession(); addEditorLog(t('physicsRunning'), 'Physics')
}
/** 停止游戏会话及播放模式并记录恢复日志。 */ function stopFromPalette(): void { gameplayRuntime.stopSession(); stopPlayMode(); addEditorLog(t('simulationRestored'), 'Physics') }
/** 验证当前项目，打开健康工具并记录通过或失败及问题数。 */ function validateFromPalette(): void { const report = validateCurrentProject(); openEditorTool('project'); addEditorLog(t(report.valid ? 'projectValidationPassed' : 'projectValidationFailed', { count: report.issues.length }), 'Project', report.valid ? 'info' : 'error') }
/** 预览修复并确认变更，同意后应用并打开健康工具，失败记录错误。 */ async function repairFromPalette(): Promise<void> { const report = previewCurrentProjectRepair(); const approved = await requestConfirmation({ title: t('repairProject'), message: `${report.changes.join('\n')}\n\n${t('repairRemainingIssues', { count: report.remaining.length })}`, confirmLabel: t('repairProject'), cancelLabel: t('cancel'), destructive: false }); if (approved) { if (!applyCurrentProjectRepair(report)) addEditorLog(t('projectRepairFailed'), 'Project', 'error'); openEditorTool('project') } }

const workspaceCommand = /** 构造应用指定工作区的命令描述。 */ (workspace: EditorWorkspace, label: TranslationKey, icon: string): EditorCommand => ({
  id: `workspace-${workspace}`, label, group: 'workspaces', icon, keywords: `${workspace} layout workspace`, run: /* 调用 applyEditorWorkspace(workspace) 并返回调用结果。 */ () => applyEditorWorkspace(workspace)
})
const toolCommand = /** 构造打开指定底部工具的命令描述。 */ (tab: BottomPanelTab, label: TranslationKey, icon: string): EditorCommand => ({
  id: `tool-${tab}`, label, group: 'tools', icon, keywords: `${tab} panel tool bottom`, run: /* 调用 openEditorTool(tab) 并返回调用结果。 */ () => openEditorTool(tab)
})
const commands = computed<EditorCommand[]>(/** 组装编辑、运行、工作区、资源、场景、实体、设置、控件与插件命令列表。 */ () => [
  { id: 'create-object', label: 'createObject', group: 'edit', icon: '＋', keywords: 'add create object sprite camera text collider script light', shortcut: 'Shift+A', run: /** 打开对象创建面板。 */ () => { state.createObjectPaletteOpen = true } },
  { id: 'project-save', label: 'saveProject', group: 'file', icon: 'SV', keywords: 'save atomic project file', shortcut: 'Ctrl+S', run: /** 异步启动项目保存命令。 */ () => { void saveFromPalette() } },
  { id: 'project-validate', label: 'validateProject', group: 'file', icon: '✓', keywords: 'validate project format references schema repair', run: validateFromPalette },
  { id: 'project-repair', label: 'repairProject', group: 'file', icon: '↺', keywords: 'repair project format schema dependencies backup rollback', run: /** 异步启动项目修复命令。 */ () => { void repairFromPalette() } },
  { id: 'edit-undo', label: 'undo', group: 'edit', icon: '↶', keywords: 'undo history transaction', shortcut: 'Ctrl+Z', run: /** 仅在编辑模式且可撤销时执行撤销。 */ () => { if (isEditing.value && historyState.canUndo) undo() } },
  { id: 'edit-redo', label: 'redo', group: 'edit', icon: '↷', keywords: 'redo history transaction', shortcut: 'Ctrl+Y', run: /** 仅在编辑模式且可重做时执行重做。 */ () => { if (isEditing.value && historyState.canRedo) redo() } },
  { id: 'edit-copy', label: 'copy', group: 'edit', icon: 'CP', keywords: 'copy selected objects entities', shortcut: 'Ctrl+C', run: /** 复制已选实体。 */ () => { copySelectedEntities() } },
  { id: 'edit-paste', label: 'paste', group: 'edit', icon: 'PS', keywords: 'paste copied objects entities', shortcut: 'Ctrl+V', run: /** 仅在编辑模式粘贴实体。 */ () => { if (isEditing.value) pasteEntities() } },
  { id: 'edit-duplicate', label: 'duplicate', group: 'edit', icon: 'D+', keywords: 'duplicate selected objects entities', shortcut: 'Ctrl+D', run: /** 仅在编辑模式复制出已选实体副本。 */ () => { if (isEditing.value) duplicateSelectedEntities() } },
  { id: 'edit-delete', label: 'deleteSelected', group: 'edit', icon: '⌫', keywords: 'delete selected objects entities', shortcut: 'Delete', run: /** 异步启动删除选择命令。 */ () => { void deleteFromPalette() } },
  { id: 'runtime-play', label: 'play', group: 'runtime', icon: '▶', keywords: 'play run game physics simulation', run: /** 异步启动仿真命令。 */ () => { void playFromPalette() } },
  { id: 'runtime-stop', label: 'stop', group: 'runtime', icon: '■', keywords: 'stop game physics simulation restore', run: stopFromPalette },
  workspaceCommand('design', 'workspaceDesign', '◇'), workspaceCommand('script', 'workspaceScript', '</>'), workspaceCommand('animation', 'workspaceAnimation', '◆'), workspaceCommand('ui', 'workspaceUi', '▣'), workspaceCommand('debug', 'workspaceDebug', '◎'), workspaceCommand('manage', 'workspaceManage', '⚙'),
  ...(workspaceState.custom.length ? [workspaceCommand('custom', 'workspaceCustom', '✦')] : []),
  { id: 'scene', label: 'sceneView', group: 'navigation', icon: 'S', keywords: 'scene edit view', run: /** 切换为场景视图。 */ () => { state.currentPage = 'scene' } },
  { id: 'game', label: 'gameView', group: 'navigation', icon: 'G', keywords: 'game play view', run: /** 切换为游戏视图。 */ () => { state.currentPage = 'game' } },
  { id: 'settings', label: 'settings', group: 'navigation', icon: '⚙', keywords: 'settings preferences manage', run: /** 打开管理设置栏目。 */ () => { openManageSection('settings') } },
  { id: 'creator-learning', label: 'creatorLearning', group: 'navigation', icon: '◉', keywords: 'learn onboarding tutorial manual guide every feature project task', run: /** 打开管理学习栏目。 */ () => { openManageSection('learn') } },
  { id: 'automation-studio', label: 'automationStudio', group: 'navigation', icon: '✦', keywords: 'automation batch edit dry run transaction plugin rhai', run: /** 打开管理自动化栏目。 */ () => { openManageSection('automation') } },
  toolCommand('assets', 'assets', '▧'), toolCommand('packages', 'packages', '◇'), toolCommand('console', 'console', '>_'), toolCommand('animation', 'animation', '◆'),
  { id: 'tool-tilemap', label: 'tilemap', group: 'tools', icon: '▦', keywords: 'tilemap contextual selected map terrain paint', run: /** 找到首个瓦片地图实体后选中并打开瓦片工具。 */ () => { const map = physicsState.world.entities.find(/* 调用 entity.hasComponent('TileMap2D') 并返回调用结果。 */ entity => entity.hasComponent('TileMap2D')); if (map) { selectEntities([map.id]); openEditorTool('tilemap') } } },
  toolCommand('profiler', 'profiler', '⌁'), toolCommand('rendering', 'renderingStudio', '◈'), toolCommand('project', 'projectHealth', '✓'), toolCommand('build', 'buildPanel', '▶'),
  { id: 'toggle-hierarchy', label: 'toggleHierarchy', group: 'layoutPanels', icon: 'H', keywords: 'panel hierarchy outliner', run: /* 调用 toggleEditorPanel('hierarchy') 并返回调用结果。 */ () => toggleEditorPanel('hierarchy') },
  { id: 'toggle-inspector', label: 'toggleInspector', group: 'layoutPanels', icon: 'I', keywords: 'panel inspector properties', run: /* 调用 toggleEditorPanel('inspector') 并返回调用结果。 */ () => toggleEditorPanel('inspector') },
  { id: 'toggle-bottom', label: 'toggleBottomPanel', group: 'layoutPanels', icon: 'B', keywords: 'drawer panel bottom', run: /* 调用 toggleEditorPanel('bottom') 并返回调用结果。 */ () => toggleEditorPanel('bottom') },
  { id: 'focus', label: 'focusMode', group: 'layoutPanels', icon: '⛶', keywords: 'focus distraction free fullscreen', run: toggleFocusMode },
  { id: 'reset-layout', label: 'resetLayout', group: 'layoutPanels', icon: '↺', keywords: 'restore default reset panels', run: resetEditorLayout },
  { id: 'navigation-back', label: 'navigateBack', group: 'navigation', icon: '←', keywords: 'back previous history', shortcut: shortcutState.definitions.find(/* 比较 item.id 与 'navigateBack'，返回严格相等的判断结果。 */ item => item.id === 'navigateBack')?.binding, run: /** 返回上一导航历史。 */ () => { navigateHistory('back') } },
  { id: 'navigation-forward', label: 'navigateForward', group: 'navigation', icon: '→', keywords: 'forward next history', shortcut: shortcutState.definitions.find(/* 比较 item.id 与 'navigateForward'，返回严格相等的判断结果。 */ item => item.id === 'navigateForward')?.binding, run: /** 前往下一导航历史。 */ () => { navigateHistory('forward') } },
  { id: 'fullscreen', label: 'toggleFullscreen', group: 'layoutPanels', icon: '⛶', keywords: 'fullscreen window F11', shortcut: shortcutState.definitions.find(/* 比较 item.id 与 'fullscreen'，返回严格相等的判断结果。 */ item => item.id === 'fullscreen')?.binding, run: /** 异步切换编辑器全屏。 */ () => { void toggleEditorFullscreen() } },
  { id: 'workspace-manager', label: 'manageWorkspaces', group: 'workspaces', icon: '⚙', keywords: 'save duplicate rename import export custom layout', run: /** 打开工作区管理窗口。 */ () => { state.workspaceManagerOpen = true } },
  { id: 'shortcut-editor', label: 'shortcutEditor', group: 'settings', icon: '⌨', keywords: 'keyboard shortcuts bindings edit viewer', run: /** 打开快捷键窗口。 */ () => { state.shortcutEditorOpen = true } },
  { id: 'status-center', label: 'statusCenter', group: 'tools', icon: '◴', keywords: 'tasks import build package migration save progress diagnostics', run: /** 打开任务状态中心。 */ () => { state.statusCenterOpen = true } },
  ...[...assetState.records].sort(/** 优先按最近资源顺序排序，其他资源按路径排序。 */ (a, b) => { const left = assetState.recentGuids.indexOf(a.uuid), right = assetState.recentGuids.indexOf(b.uuid); return (left < 0 ? 999 : left) - (right < 0 ? 999 : right) || a.path.localeCompare(b.path) }).map(/** 为单个资源生成具有搜索关键词和定位操作的命令。 */ asset => ({ id: `asset-${asset.uuid}`, label: asset.name, group: asset.assetType === 'script' ? 'scripts' : 'assets', icon: asset.assetType === 'script' ? '{ }' : '▧', keywords: `${asset.path} ${asset.assetType} asset ${assetState.recentGuids.includes(asset.uuid) ? 'recent' : ''}`, run: /** 选中资源及其文件夹并打开资源浏览工具。 */ () => { assetState.selectedGuid = asset.uuid; assetState.currentFolder = asset.path.slice(0, asset.path.lastIndexOf('/')) || 'Assets'; openEditorTool('assets') } } as EditorCommand)),
  ...sceneManager.scenes.map(/** 为场景生成切换命令。 */ scene => ({ id: `scene-${scene.uuid}`, label: scene.name, group: 'scenes', icon: '◇', keywords: 'scene navigation object', run: /** 激活目标场景并打开场景视图。 */ () => { setActiveScene(scene.uuid); state.currentPage = 'scene' } } as EditorCommand)),
  ...physicsState.world.entities.map(/** 为实体生成含标签与组件关键词的选择命令。 */ entity => ({ id: `entity-${entity.uuid}`, label: entity.name, group: 'entities', icon: '□', keywords: `${entity.uuid} ${entity.tags.join(' ')} ${entity.components.map(/* 返回 component.kind 的当前值。 */ component => component.kind).join(' ')}`, run: /** 替换选择为目标实体并打开场景视图。 */ () => { selectEntities([entity.id], 'replace', entity.id); state.currentPage = 'scene' } } as EditorCommand)),
  ...['appearanceSettings','physicsSettings','audioSettings','inputMap','canvasSettings','collisionMatrix','projectSettings','defaultsSettings'].map(/** 为设置栏目生成打开并搜索对应标签的命令。 */ label => ({ id: `setting-${label}`, label: label as TranslationKey, group: 'settings' as TranslationKey, icon: '⚙', keywords: `${label} editor project runtime preference`, run: /** 打开管理设置并以当前标签作为搜索词。 */ () => { openManageSection('settings'); state.settingsSearch = t(label as TranslationKey) } })),
  ...stableControlInventory().filter(/* 返回 control.disabled 的逻辑取反结果。 */ control => !control.disabled).map(/** 为稳定控件生成聚焦命令。 */ control => ({ id: `control-${control.testId}`, label: control.label as TranslationKey, group: 'controls' as TranslationKey, icon: '↗', keywords: `${control.surface} ${control.testId} control`, run: /** 按稳定标识聚焦目标控件。 */ () => { focusStableControl(control.testId) } } as EditorCommand)),
  ...pluginState.contributions.filter(/* 比较 contribution.kind 与 'commands'，返回严格相等的判断结果。 */ contribution => contribution.kind === 'commands').map(/** 将插件命令贡献转换为命令面板条目。 */ contribution => ({
    id: `plugin-${contribution.pluginId}-${contribution.id}`, label: contribution.label as TranslationKey, group: 'plugins' as TranslationKey,
    icon: 'PX', keywords: `plugin extension ${contribution.pluginName} ${contribution.id}`, run: /** 按插件标识调用其命令贡献。 */ () => { pluginRuntime.invokeCommand(contribution.id, contribution.pluginId) }
  }))
])
const filteredCommands = computed(/** 先按面板模式限定命令范围，再按本地化标签、组及关键词搜索。 */ () => {
  const needle = query.value.trim().toLocaleLowerCase()
  const mode = state.commandPaletteMode
  const scoped = commands.value.filter(/** 按快速、全局或上下文模式判定命令是否属于当前范围。 */ command => {
    if (mode === 'quick') return /^(asset|scene|entity)-/.test(command.id)
    if (mode === 'global') return /^(asset|scene|entity|setting|plugin)-/.test(command.id)
    if (mode === 'context') return command.id.includes(state.activeWorkspace) || command.keywords.includes(state.activeWorkspace) || command.id.startsWith('control-')
    return true
  })
  if (!needle) return scoped
  return scoped.filter(/* 调用 `${t(command.label)} ${t(command.group)} ${command.keywords}`.toLocaleLowerCase().includes(needle) 并返回调用结果。 */ command => `${t(command.label)} ${t(command.group)} ${command.keywords}`.toLocaleLowerCase().includes(needle))
})

/** 关闭命令面板。 */ function close(): void { state.commandPaletteOpen = false }
/** 执行指定命令并关闭面板。 */ function run(command: EditorCommand): void { command.run(); close() }
/** 用上下键移动选项、Enter 执行、Escape 关闭，消费已处理按键。 */ function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') { event.preventDefault(); activeIndex.value = Math.min(filteredCommands.value.length - 1, activeIndex.value + 1) }
  else if (event.key === 'ArrowUp') { event.preventDefault(); activeIndex.value = Math.max(0, activeIndex.value - 1) }
  else if (event.key === 'Enter' && filteredCommands.value[activeIndex.value]) { event.preventDefault(); run(filteredCommands.value[activeIndex.value]) }
  else if (event.key === 'Escape') { event.preventDefault(); close() }
}
/** 匹配全局搜索快捷键，同一已打开模式再次触发时关闭，否则切换模式并打开。 */ function globalShortcut(event: KeyboardEvent): void {
  const mode = shortcutMatches(event, 'commandPalette') ? 'commands' : shortcutMatches(event, 'quickOpen') ? 'quick' : shortcutMatches(event, 'globalSearch') ? 'global' : shortcutMatches(event, 'contextSearch') ? 'context' : null
  if (!mode) return
  event.preventDefault()
  if (state.commandPaletteOpen && state.commandPaletteMode === mode) state.commandPaletteOpen = false
  else { state.commandPaletteMode = mode; state.commandPaletteOpen = true }
}

watch(/* 返回 state.commandPaletteOpen 的当前值。 */ () => state.commandPaletteOpen, /** 面板打开时重置搜索与选择，等待 DOM 后聚焦搜索框。 */ open => {
  if (open) { query.value = ''; activeIndex.value = 0; void nextTick(/* 调用 searchInput.value?.focus() 并返回调用结果。 */ () => searchInput.value?.focus()) }
})
watch(filteredCommands, /** 筛选结果变化时将活动索引重置为首项。 */ () => { activeIndex.value = 0 })
onMounted(/* 调用 window.addEventListener('keydown', globalShortcut) 并返回调用结果。 */ () => window.addEventListener('keydown', globalShortcut))
onUnmounted(/* 调用 window.removeEventListener('keydown', globalShortcut) 并返回调用结果。 */ () => window.removeEventListener('keydown', globalShortcut))
</script>

<style scoped>
.palette-scrim { position: fixed; inset: 0; z-index: 1200; padding-top: min(14vh, 110px); display: flex; justify-content: center; align-items: flex-start; background: var(--scrim); backdrop-filter: blur(5px); }
.command-palette { width: min(620px, calc(100vw - 32px)); max-height: min(620px, calc(100vh - 130px)); display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-strong); border-radius: 16px; background: var(--surface-1); box-shadow: var(--shadow-lg); }
header { min-height: 52px; padding: 7px 12px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border-subtle); }header > span { color: var(--accent); font-size: 20px; }header input { min-width: 0; flex: 1; border: 0; background: transparent; font-size: 14px; box-shadow: none; }kbd { padding: 2px 6px; border: 1px solid var(--border-subtle); border-radius: 5px; color: var(--text-muted); background: var(--surface-2); font: 11px/1.4 inherit; }
.command-results { min-height: 80px; padding: 7px; overflow: auto; }.command-results button { width: 100%; min-height: 46px; padding: 6px 10px; display: grid; grid-template-columns: 30px 1fr auto; align-items: center; gap: 8px; border: 0; border-radius: 9px; color: var(--text-secondary); background: transparent; text-align: left; }.command-results button.active { color: var(--text-primary); background: var(--accent-soft); }.command-icon { width: 27px; height: 27px; display: grid; place-items: center; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--accent); background: var(--surface-2); font: 600 11px/1 var(--font-mono); }.command-results button > span:nth-child(2) { min-width: 0; display: flex; flex-direction: column; gap: 2px; }.command-results strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.command-results small { color: var(--text-muted); font-size:11px; }.command-results p { padding: 22px; color: var(--text-muted); text-align: center; font-size: 11px; }
footer { min-height: 30px; padding: 0 12px; display: flex; align-items: center; gap: 15px; border-top: 1px solid var(--border-subtle); color: var(--text-muted); font-size:11px; }
.palette-enter-active, .palette-leave-active { transition: opacity 130ms ease; }.palette-enter-active .command-palette, .palette-leave-active .command-palette { transition: transform 160ms cubic-bezier(.2,.8,.2,1), opacity 130ms ease; }.palette-enter-from, .palette-leave-to { opacity: 0; }.palette-enter-from .command-palette, .palette-leave-to .command-palette { opacity: 0; transform: translateY(-8px) scale(.985); }
</style>
