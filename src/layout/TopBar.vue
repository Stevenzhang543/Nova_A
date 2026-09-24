<!-- 顶部菜单栏：执行项目和编辑命令，管理短暂弹出菜单、焦点及全局快捷键。 -->
<template>
  <header ref="topBar" class="top-bar" :style="{ '--menu-left': `${menuLeft}px` }">
    <a class="brand" href="https://whitelists.top" target="_blank" rel="noreferrer" aria-label="Nova_A by Whitelist">
      <span class="brand-mark">N</span><span>Nova_A</span>
    </a>
    <nav class="menu-container" @scroll="closeMenu">
      <div class="menu-item">
        <button @click="toggleMenu('file')" :class="{ active: activeMenu === 'file' }">{{ t('file') }}</button>

      </div>
      <div class="menu-item">
        <button @click="toggleMenu('edit')" :class="{ active: activeMenu === 'edit' }">{{ t('edit') }}</button>

      </div>
      <div class="menu-item">
        <button @click="toggleMenu('project')" :class="{ active: activeMenu === 'project' }">{{ t('project') }}</button>

      </div>
      <div class="menu-item">
        <button @click="toggleMenu('debug')" :class="{ active: activeMenu === 'debug' }">{{ t('debug') }}</button>

      </div>
      <div class="menu-item">
        <button @click="toggleMenu('view')" :class="{ active: activeMenu === 'view' }">{{ t('view') }}</button>

      </div>
      <div class="menu-item">
        <button @click="toggleMenu('help')" :class="{ active: activeMenu === 'help' }">{{ t('help') }}</button>

      </div>
      <div class="menu-item menu-popover-host">
        <Transition name="menu" mode="out-in" @enter="positionMenu" @before-leave="deactivateMenu">
          <div v-if="activeMenu === 'file'" :key="'file'" class="dropdown">
          <button :disabled="!isEditing" @click="handleProjectManager"><span>{{ t('projectManager') }}</span></button>
          <hr>
          <button :disabled="!isEditing" @click="handleSave"><span>{{ t('saveProject') }}</span><kbd>Ctrl S</kbd></button>
          <button :disabled="!isEditing" @click="triggerLoad"><span>{{ t('loadProject') }}</span></button>
          <hr><button class="danger" :disabled="!isEditing" @click="handleClearScene"><span>{{ t('clearScene') }}</span></button>
        </div>
          <div v-else-if="activeMenu === 'edit'" :key="'edit'" class="dropdown">
          <button :disabled="!isEditing || !historyState.canUndo" @click="handleUndo"><span>{{ historyState.undoLabel ? `${t('undo')} · ${historyState.undoLabel}` : t('undo') }}</span><kbd>Ctrl Z</kbd></button>
          <button :disabled="!isEditing || !historyState.canRedo" @click="handleRedo"><span>{{ historyState.redoLabel ? `${t('redo')} · ${historyState.redoLabel}` : t('redo') }}</span><kbd>Ctrl Y</kbd></button>
          <button @click="handleUndoHistory"><span>{{ t('undoHistory') }}</span><kbd>Ctrl Alt H</kbd></button>
          <hr><button :disabled="!isEditing || !physicsState.selectedEntityIds.length" @click="handleCopy"><span>{{ t('copy') }}</span><kbd>Ctrl C</kbd></button>
          <button :disabled="!isEditing" @click="handlePaste"><span>{{ t('paste') }}</span><kbd>Ctrl V</kbd></button>
          <button :disabled="!isEditing || !physicsState.selectedEntityIds.length" @click="handleDuplicate"><span>{{ t('duplicate') }}</span><kbd>Ctrl D</kbd></button>
          <button :disabled="!isEditing || physicsState.selectedEntityId === null" @click="handleRename"><span>{{ t('rename') }}</span><kbd>F2</kbd></button>
          <hr><button :disabled="!isEditing || !physicsState.selectedEntityIds.length" @click="handleDelete"><span>{{ t('deleteSelected') }}</span><kbd>Del</kbd></button>
          <button class="danger" :disabled="!isEditing" @click="handleDeleteAll"><span>{{ t('deleteAll') }}</span></button>
          <hr><button @click="handleDeselect"><span>{{ t('deselectAll') }}</span><kbd>Esc</kbd></button>
        </div>
          <div v-else-if="activeMenu === 'project'" :key="'project'" class="dropdown">
          <button @click="openBottomPanel('project')"><span>{{ t('projectHealth') }}</span></button>
          <button @click="openBottomPanel('build')"><span>{{ t('buildPanel') }}</span></button>
        </div>
          <div v-else-if="activeMenu === 'debug'" :key="'debug'" class="dropdown">
          <button @click="openBottomPanel('console')"><span>{{ t('console') }}</span></button>
          <button @click="openBottomPanel('profiler')"><span>{{ t('profiler') }}</span></button>
          <button @click="handleStatusCenter"><span>{{ t('statusCenter') }}</span></button>
        </div>
          <div v-else-if="activeMenu === 'view'" :key="'view'" class="dropdown">
          <button @click="handleToggleGrid"><span>{{ t(editorState.showGrid ? 'hideGrid' : 'showGrid') }}</span><span class="check">{{ editorState.showGrid ? '✓' : '' }}</span></button>
          <hr>
          <button @click="toggleAxis('x')"><span>{{ t(editorState.showXAxis ? 'hideXAxis' : 'showXAxis') }}</span><span class="check">{{ editorState.showXAxis ? '✓' : '' }}</span></button>
          <button @click="toggleAxis('y')"><span>{{ t(editorState.showYAxis ? 'hideYAxis' : 'showYAxis') }}</span><span class="check">{{ editorState.showYAxis ? '✓' : '' }}</span></button>
          <button @click="handleToggleAllAxes"><span>{{ t((editorState.showXAxis || editorState.showYAxis) ? 'hideAllAxes' : 'showAllAxes') }}</span></button>
          <hr><button @click="handleResetCamera"><span>{{ t('resetCamera') }}</span></button>
          <hr>
          <button @click="handleTogglePanel('hierarchy')"><span>{{ t('toggleHierarchy') }}</span><span class="check">{{ editorState.hierarchyVisible ? '✓' : '' }}</span></button>
          <button @click="handleTogglePanel('inspector')"><span>{{ t('toggleInspector') }}</span><span class="check">{{ editorState.inspectorVisible ? '✓' : '' }}</span></button>
          <button @click="handleTogglePanel('bottom')"><span>{{ t('toggleBottomPanel') }}</span><span class="check">{{ editorState.bottomPanelVisible ? '✓' : '' }}</span></button>
          <button @click="handleFocusMode"><span>{{ t('focusMode') }}</span><span class="check">{{ editorState.distractionFree ? '✓' : '' }}</span></button>
          <button @click="handleResetLayout"><span>{{ t('resetLayout') }}</span></button>
          <button @click="handleWorkspaceManager"><span>{{ t('manageWorkspaces') }}</span><kbd>Ctrl Alt W</kbd></button>
          <hr>
          <button @click="handleFullscreen"><span>{{ t('toggleFullscreen') }}</span><kbd>F11</kbd></button>
          <button @click="handleCommandPalette"><span>{{ t('commandPalette') }}</span><kbd>Ctrl K</kbd></button>
          <button @click="handleShortcutEditor"><span>{{ t('shortcutEditor') }}</span><kbd>Ctrl Alt K</kbd></button>
        </div>
          <div v-else-if="activeMenu === 'help'" :key="'help'" class="dropdown dropdown-right">
          <button @click="handleManual"><span>{{ t('manual') }}</span><kbd>5.0 · {{ t('offline') }}</kbd></button>
          <button @click="handleManualSection('first-game')"><span>{{ t('firstGameTutorial') }}</span></button>
          <button @click="handleManualSection('package-sdk')"><span>{{ t('packageSdk') }}</span></button>
          <button @click="handleManualSection('release-engineering')"><span>{{ t('releaseEngineeringGuide') }}</span></button>
          <button @click="handleStudioStatus"><span>{{ t('studioStatus') }}</span></button>
          <button @click="handleAbout"><span>{{ t('about') }}</span></button>
        </div>
        </Transition>
      </div>
    </nav>
    <div class="top-spacer"></div>
    <span v-if="recoveryState.safeMode" class="safe-pill">{{ t('safeMode') }}</span>
    <span v-if="historyState.dirty" class="dirty-pill" :title="projectTransactionState.unsavedScopes.join(', ')">● {{ t('unsavedChanges') }}</span>
    <span class="release-pill">{{ NOVA_RELEASE_NAME }}</span>
    <input ref="fileInput" type="file" hidden accept="application/json,.nova,.json" @change="handleFileSelected">
  </header>
</template>

<script setup lang="ts">
import { installTransientPopover } from '../editor/transientPopover'
import { openExternalUrl } from '../runtime/externalLinks'
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { t } from '../i18n'
import { addEditorLog, editorState } from '../store/editor'
import { clearScene, copySelectedEntities, deleteSelected, duplicateSelectedEntities, historyState, pasteEntities, physicsState, pushHistory, redo, resetCamera, saveProject, selectEntities, undo } from '../store/physics'
import { preferencesState } from '../store/preferences'
import { confirmDialogState, requestConfirmation } from '../store/dialog'
import { openProjectDocument, rememberCurrentProject, showProjectManager } from '../projects/projectManager'
import { openEditorTool, resetEditorLayout, toggleEditorPanel, toggleFocusMode } from '../editor/workspaces'
import { openBundledManual } from '../runtime/openManual'
import { openStudioStatus } from '../runtime/stableContracts'
import { recoveryState } from '../runtime/recovery'
import { completeTask, failTask, startTask } from '../runtime/editorFeedback'
import { toggleEditorFullscreen } from '../runtime/editorWindow'
import { projectTransactionState } from '../runtime/projectTransactions'
import { NOVA_RELEASE_NAME } from '../projects/projectFormat'

const activeMenu = ref<string | null>(null)
const topBar = ref<HTMLElement | null>(null)
const menuLeft = ref(0)
const fileInput = ref<HTMLInputElement | null>(null)
let disposeMenu: (() => void) | undefined
const projectUrl = 'https://github.com/Stevenzhang543/Nova_A/'
const isEditing = computed(/** 只有编辑模式且非只读恢复会话才允许项目编辑。 */ () => physicsState.playMode === 'editing' && !recoveryState.readOnly)

/** 按偏好决定直接允许或显示破坏性确认对话框。 */ function confirmDestructive(title: string, message: string): Promise<boolean> {
  if (!preferencesState.confirmDestructiveActions) return Promise.resolve(true)
  return requestConfirmation({ title, message, confirmLabel: t('confirmAction'), cancelLabel: t('cancel'), destructive: true })
}

/** 编辑模式执行保存任务，报告成功或取消，成功记入最近项目和日志，最后关闭菜单。 */ async function handleSave() {
  if (!isEditing.value) { editorState.statusText = t('runtimeIsolation'); return }
  const task = startTask(t('saveProject'), { detail: t('atomicSaveInProgress'), progress: null })
  let saved = false
  try { saved = await saveProject(); if (saved) completeTask(task, t('atomicSaveComplete')); else completeTask(task, t('saveCancelled')) }
  catch (error) { failTask(task, error) }
  editorState.statusText = t(saved ? 'saved' : 'saveCancelled')
  if (saved) { void rememberCurrentProject(); addEditorLog(t('saved'), 'Project') }
  activeMenu.value = null
}
/** 触发项目文件选择并关闭菜单。 */ function triggerLoad() { fileInput.value?.click(); activeMenu.value = null }
/** 编辑模式确认清空对象及连接后清空场景、记录历史并关闭菜单。 */ async function handleClearScene() {
  if (!isEditing.value) return
  if (!await confirmDestructive(t('clearSceneTitle'), t('confirmClearCount', { objects: physicsState.world.entities.length, connections: physicsState.world.connections.length }))) return
  clearScene(); pushHistory(); activeMenu.value = null
}
/** 编辑模式有选择时确认删除，成功删除并记录历史及关闭菜单。 */ async function handleDelete() { if (!isEditing.value || !physicsState.selectedEntityIds.length) return; if (!await confirmDestructive(t('deleteObjectTitle'), t('confirmDeleteObjectCount', { count: physicsState.selectedEntityIds.length }))) return; deleteSelected(); pushHistory('Delete entities'); activeMenu.value = null }
/** 异步执行清空场景操作。 */ function handleDeleteAll() { void handleClearScene() }
/** 清空实体选择并关闭菜单。 */ function handleDeselect() { selectEntities([], 'replace'); activeMenu.value = null }
/** 复制选中实体，非空结果记录数量并关闭菜单。 */ function handleCopy() { const count = copySelectedEntities(); if (count) addEditorLog(`Copied ${count} ${count === 1 ? 'entity' : 'entities'}`); activeMenu.value = null }
/** 编辑模式粘贴实体，记录非空结果数量并关闭菜单。 */ function handlePaste() { if (!isEditing.value) return; const pasted = pasteEntities(); if (pasted.length) addEditorLog(`Pasted ${pasted.length} ${pasted.length === 1 ? 'entity' : 'entities'}`); activeMenu.value = null }
/** 编辑模式创建选择副本，记录非空结果数量并关闭菜单。 */ function handleDuplicate() { if (!isEditing.value) return; const duplicated = duplicateSelectedEntities(); if (duplicated.length) addEditorLog(`Duplicated ${duplicated.length} ${duplicated.length === 1 ? 'entity' : 'entities'}`); activeMenu.value = null }
/** 存在主选择时发出重命名请求，然后关闭菜单。 */ function handleRename() { if (physicsState.selectedEntityId !== null) editorState.renameRequestId = physicsState.selectedEntityId; activeMenu.value = null }
/** 打开指定底部工具并关闭菜单。 */ function openBottomPanel(tab: 'console' | 'profiler' | 'project' | 'build') {
  openEditorTool(tab)
  activeMenu.value = null
}
/** 切换网格可见性并关闭菜单。 */ function handleToggleGrid() { editorState.showGrid = !editorState.showGrid; activeMenu.value = null }
/** 切换指定坐标轴可见性。 */ function toggleAxis(axis: 'x' | 'y') {
  if (axis === 'x') editorState.showXAxis = !editorState.showXAxis
  else editorState.showYAxis = !editorState.showYAxis
}
/** 任一坐标轴显示时关闭全部，否则开启全部，并关闭菜单。 */ function handleToggleAllAxes() {
  const visible = !(editorState.showXAxis || editorState.showYAxis)
  editorState.showXAxis = visible; editorState.showYAxis = visible; activeMenu.value = null
}
/** 重置相机并关闭菜单。 */ function handleResetCamera() { resetCamera(); activeMenu.value = null }
/** 切换指定布局面板并关闭菜单。 */ function handleTogglePanel(panel: 'hierarchy' | 'inspector' | 'bottom') { toggleEditorPanel(panel); activeMenu.value = null }
/** 切换专注模式并关闭菜单。 */ function handleFocusMode() { toggleFocusMode(); activeMenu.value = null }
/** 恢复默认布局并关闭菜单。 */ function handleResetLayout() { resetEditorLayout(); activeMenu.value = null }
/** 打开工作区管理器并关闭菜单。 */ function handleWorkspaceManager() { editorState.workspaceManagerOpen = true; activeMenu.value = null }
/** 打开快捷键设置并关闭菜单。 */ function handleShortcutEditor() { editorState.shortcutEditorOpen = true; activeMenu.value = null }
/** 打开任务状态中心并关闭菜单。 */ function handleStatusCenter() { editorState.statusCenterOpen = true; activeMenu.value = null }
/** 打开撤销历史并关闭菜单。 */ function handleUndoHistory() { editorState.undoHistoryOpen = true; activeMenu.value = null }
/** 打开命令面板并关闭菜单。 */ function handleCommandPalette() { editorState.commandPaletteOpen = true; activeMenu.value = null }
/** 关闭菜单后异步切换全屏。 */ function handleFullscreen() { activeMenu.value = null; void toggleEditorFullscreen() }
/** 关闭菜单后使用统一外部链接入口打开项目网站。 */ async function handleAbout() {
  activeMenu.value = null
  await openExternalUrl(projectUrl)
}
/** 关闭菜单后异步打开手册。 */ function handleManual() { activeMenu.value = null; void openBundledManual() }
/** 关闭菜单后打开指定手册章节。 */ function handleManualSection(section: string) { activeMenu.value = null; void openBundledManual(section) }
/** 关闭菜单后打开工作室状态。 */ function handleStudioStatus() { activeMenu.value = null; openStudioStatus() }
// Keep the menu mounted through the activating click. The entire TopBar unmounts when
// the manager appears; clearing it first can expose the workspace strip to pointer-up.
/** 显示项目管理启动页。 */ function handleProjectManager() { showProjectManager() }
/** 编辑模式执行撤销，然后关闭菜单。 */ function handleUndo() { if (isEditing.value) undo(); activeMenu.value = null }
/** 编辑模式执行重做，然后关闭菜单。 */ function handleRedo() { if (isEditing.value) redo(); activeMenu.value = null }
/** 点击同一菜单时关闭，否则切换到指定菜单。 */ function toggleMenu(menu: string) {
  activeMenu.value = activeMenu.value === menu ? null : menu
}
/** 根据活动按钮及下拉宽度计算菜单横向位置，限制在栏内边距范围。 */ function positionMenu(element: Element) {
  const dropdown = element as HTMLElement
  const bar = topBar.value, button = bar?.querySelector<HTMLElement>('.menu-item > button.active')
  if (!bar || !button) return
  const barRect = bar.getBoundingClientRect(), buttonRect = button.getBoundingClientRect()
  const preferred = dropdown.classList.contains('dropdown-right') ? buttonRect.right - dropdown.offsetWidth : buttonRect.left
  menuLeft.value = Math.max(8, Math.min(preferred - barRect.left, barRect.width - dropdown.offsetWidth - 8))
}
/** 将离场菜单设为 inert，避免动画期间继续接受操作。 */ function deactivateMenu(element: Element) { (element as HTMLElement).inert = true }
/** 清空活动菜单。 */ function closeMenu() { activeMenu.value = null }

/** 读取用户选择的项目文件，安装加载及错误回调，开始读取后清空输入。 */ function handleFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = /** 文件文本打开成功后记录历史及载入状态日志。 */ async event => {
    if (typeof event.target?.result === 'string' && await openProjectDocument(event.target.result, file.name)) {
      pushHistory()
      editorState.statusText = t('loaded')
      addEditorLog(t('loaded'), 'Project')
    }
  }
  reader.onerror = /** 文件读取失败时显示带具体原因的本地化状态。 */ () => { editorState.statusText = t('loadFailed', { message: reader.error?.message ?? t('fileReadFailed') }) }
  reader.readAsText(file)
  target.value = ''
}

/** 优先处理保存并使失焦字段提交；避开文本输入的原生快捷键，处理撤销、复制、删除等编辑命令。 */ function handleKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented) return
  if (confirmDialogState.visible) return
  const commandKey = event.ctrlKey || event.metaKey
  if (commandKey && event.key.toLowerCase() === 's' && !event.isComposing) {
    event.preventDefault()
    // Commit blur-based fields before serializing; keep native text editing shortcuts.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    void nextTick().then(handleSave)
    return
  }
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (commandKey && event.shiftKey && event.key.toLowerCase() === 'z') { event.preventDefault(); handleRedo() }
  else if (commandKey && event.key.toLowerCase() === 'z') { event.preventDefault(); handleUndo() }
  else if (commandKey && event.key.toLowerCase() === 'y') { event.preventDefault(); handleRedo() }
  else if (commandKey && event.altKey && event.key.toLowerCase() === 'h') { event.preventDefault(); handleUndoHistory() }
  else if (commandKey && event.key.toLowerCase() === 'c') { event.preventDefault(); handleCopy() }
  else if (commandKey && event.key.toLowerCase() === 'v') { event.preventDefault(); handlePaste() }
  else if (commandKey && event.key.toLowerCase() === 'd') { event.preventDefault(); handleDuplicate() }
  else if (event.key === 'Delete' || event.key === 'Backspace') { void handleDelete() }
  else if (event.key === 'F2') { event.preventDefault(); handleRename() }
  else if (event.key === 'Escape') { selectEntities([], 'replace'); activeMenu.value = null }
}

onMounted(/** 挂载时注册具有容错区域的短暂弹出菜单行为及全局监听，并记录初始历史。 */ () => { disposeMenu = installTransientPopover({ isOpen: /* 比较 activeMenu.value 与 null，返回严格不等的判断结果。 */ () => activeMenu.value !== null, regions: /** 返回菜单容器及尚可交互的下拉区域作为指针容错范围。 */ () => Array.from(topBar.value?.querySelectorAll<HTMLElement>('.menu-container, .dropdown:not([inert])') ?? []), close: /** 关闭弹出菜单，按请求把焦点还给原活动菜单按钮。 */ restoreFocus => { const button = topBar.value?.querySelector<HTMLElement>('.menu-item > button.active'); closeMenu(); if (restoreFocus) button?.focus() } }); window.addEventListener('keydown', handleKeyDown); window.addEventListener('resize', closeMenu); pushHistory() })
onUnmounted(/** 卸载时移除键盘和尺寸监听并释放弹出菜单行为。 */ () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('resize', closeMenu); disposeMenu?.() })
</script>

<style scoped>
/* Above the workspace toolbar (600), below dialogs and palettes (1200+). */
.top-bar { height: 44px; flex: 0 0 44px; display: flex; align-items: center; gap: 12px; padding: 0 12px; color: var(--text-secondary); background: color-mix(in srgb,var(--surface-1) 96%,var(--bg-base)); border-bottom: 1px solid var(--border-subtle); box-shadow:inset 0 -1px color-mix(in srgb,var(--accent) 4%,transparent); backdrop-filter: var(--glass-blur); position: relative; z-index: 650; }
.brand { display: flex; align-items: center; gap: 8px; color: var(--text-primary); text-decoration: none; font-size: var(--type-dense); font-weight: 700; letter-spacing: -.01em; }
.brand-mark { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 8px; color: var(--accent-contrast); background: linear-gradient(145deg, var(--accent), var(--accent-secondary)); font-size: var(--type-caption); box-shadow: 0 5px 16px var(--accent-soft); }
.menu-container { height: 100%; display: flex; align-items: center; gap: 2px; }
.menu-item { height: 100%; position: relative; display: flex; align-items: center; }
.menu-item > button { height: 30px; padding: 0 10px; border: 0; border-radius: 8px; color: var(--text-secondary); background: transparent; font-size: var(--type-caption); }
.menu-item > button:hover, .menu-item > button.active { color: var(--text-primary); background: var(--surface-hover); }
.dropdown { position: absolute; top: 38px; left: 0; min-width: 250px; padding: 7px; display: flex; flex-direction: column; border: 1px solid var(--border-strong); border-radius: var(--radius-panel); background: var(--surface-1); backdrop-filter: var(--glass-blur); box-shadow: var(--shadow-float); }
.dropdown-right { right: 0; left: auto; }
.dropdown button { min-height: 36px; padding: 0 10px; display: flex; align-items: center; justify-content: space-between; gap: 18px; border: 0; border-radius: 8px; background: transparent; color: var(--text-secondary); text-align: left; font-size: var(--type-caption); }
.dropdown button:hover { color: var(--text-primary); background: var(--accent-soft); }
.dropdown button.danger { color: var(--danger); }
.dropdown button.danger:hover { background: var(--danger-soft); }
.dropdown hr { width: 100%; margin: 5px 0; border: 0; border-top: 1px solid var(--border-subtle); }
kbd { color: var(--text-muted); font-family: inherit; font-size:var(--type-caption); }
.check { color: var(--accent); }
.top-spacer { flex: 1; }
.release-pill { padding: 3px 8px; border: 1px solid var(--border-subtle); border-radius: 999px; color: var(--text-muted); font-size:var(--type-caption); white-space:nowrap }
.safe-pill{padding:3px 8px;border:1px solid var(--warning);border-radius:999px;color:var(--warning);font-size:var(--type-caption)}
.dirty-pill{padding:3px 8px;border:1px solid color-mix(in srgb,var(--warning) 60%,var(--border-subtle));border-radius:999px;color:var(--warning);font-size:var(--type-caption);white-space:nowrap}
@media(max-width:980px){.release-pill{display:none}.top-bar{gap:7px}.menu-item>button{padding-inline:7px}}
@media(max-width:720px){.brand>span:last-child{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.brand{gap:0}.top-bar{padding-inline:7px}.menu-container{min-width:0;overflow-x:auto;scrollbar-width:none}.menu-container::-webkit-scrollbar{display:none}}
.menu-popover-host { flex: 0 0 0; width: 0; }
.dropdown[inert] { pointer-events: none; }
.menu-enter-active, .menu-leave-active { transition: opacity 130ms ease, transform 130ms ease; transform-origin: top left; }
.menu-enter-from, .menu-leave-to { opacity: 0; transform: translateY(-4px) scale(.98); }
/* Keep translated menu labels intrinsic-sized. The positioned top bar, outside
   the scroller, owns dropdown geometry so scrolling never clips open commands. */
.menu-container { min-width: 0; flex: 0 1 auto; overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; overscroll-behavior-inline: contain; }
.menu-container::-webkit-scrollbar { display: initial; height: 4px; }
.brand, .safe-pill, .dirty-pill, .release-pill { flex-shrink: 0; }
.menu-item { position: static; flex: 0 0 auto; }
.menu-item > button { flex: 0 0 auto; width: max-content; white-space: nowrap; }
.dropdown, .dropdown-right { top: 100%; left: var(--menu-left, 8px); right: auto; min-width: min(250px, calc(100vw - 16px)); max-width: calc(100vw - 16px); max-height: calc(100vh - 74px); overflow: auto; }
.dropdown > button { flex: 0 0 auto; white-space: normal; }
</style>
