<template>
  <Teleport to="body">
    <Transition name="palette">
      <div v-if="state.commandPaletteOpen" class="palette-scrim" role="presentation" @mousedown.self="close">
        <section ref="dialog" class="command-palette" role="dialog" aria-modal="true" :aria-label="t('commandPalette')">
          <header>
            <span>⌕</span>
            <input ref="searchInput" v-model="query" type="search" :placeholder="t('searchCommands')" @keydown="onKeyDown">
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { t } from '../i18n'
import { addEditorLog, editorState as state, type BottomPanelTab, type EditorWorkspace } from '../store/editor'
import { applyEditorWorkspace, navigateHistory, openEditorTool, resetEditorLayout, toggleEditorPanel, toggleFocusMode, workspaceState } from '../editor/workspaces'
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

type TranslationKey = Parameters<typeof t>[0]
interface EditorCommand { id: string; label: TranslationKey; group: TranslationKey; icon: string; shortcut?: string; keywords: string; run: () => void }

const searchInput = ref<HTMLInputElement | null>(null)
const dialog = ref<HTMLElement | null>(null)
const query = ref('')
const activeIndex = ref(0)
const isEditing = computed(() => physicsState.playMode === 'editing')

async function saveFromPalette(): Promise<void> {
  if (!isEditing.value) return
  const task = startTask(t('saveProject'), { detail: t('atomicSaveInProgress') })
  try {
    const saved = await saveProject()
    completeTask(task, t(saved ? 'atomicSaveComplete' : 'saveCancelled'))
  } catch (error) { failTask(task, error) }
}
async function deleteFromPalette(): Promise<void> {
  if (!isEditing.value || !physicsState.selectedEntityIds.length) return
  const approved = !preferencesState.confirmDestructiveActions || await requestConfirmation({ title: t('deleteObjectTitle'), message: t('confirmDeleteObject'), confirmLabel: t('confirmAction'), cancelLabel: t('cancel'), destructive: true })
  if (approved) { deleteSelected(); pushHistory('Delete entities') }
}
async function playFromPalette(): Promise<void> {
  await physicsState.world.wasmReady
  if (physicsState.world.wasmError) return
  toggleSimulation(true); gameplayRuntime.beginSession(); addEditorLog(t('physicsRunning'), 'Physics')
}
function stopFromPalette(): void { gameplayRuntime.stopSession(); stopPlayMode(); addEditorLog(t('simulationRestored'), 'Physics') }
function validateFromPalette(): void { const report = validateCurrentProject(); openEditorTool('project'); addEditorLog(t(report.valid ? 'projectValidationPassed' : 'projectValidationFailed', { count: report.issues.length }), 'Project', report.valid ? 'info' : 'error') }
async function repairFromPalette(): Promise<void> { const report = previewCurrentProjectRepair(); const approved = await requestConfirmation({ title: t('repairProject'), message: `${report.changes.join('\n')}\n\n${t('repairRemainingIssues', { count: report.remaining.length })}`, confirmLabel: t('repairProject'), cancelLabel: t('cancel'), destructive: false }); if (approved) { applyCurrentProjectRepair(report); openEditorTool('project') } }

const workspaceCommand = (workspace: EditorWorkspace, label: TranslationKey, icon: string): EditorCommand => ({
  id: `workspace-${workspace}`, label, group: 'workspaces', icon, keywords: `${workspace} layout workspace`, run: () => applyEditorWorkspace(workspace)
})
const toolCommand = (tab: BottomPanelTab, label: TranslationKey, icon: string): EditorCommand => ({
  id: `tool-${tab}`, label, group: 'tools', icon, keywords: `${tab} panel tool bottom`, run: () => openEditorTool(tab)
})
const commands = computed<EditorCommand[]>(() => [
  { id: 'project-save', label: 'saveProject', group: 'file', icon: 'SV', keywords: 'save atomic project file', shortcut: 'Ctrl+S', run: () => { void saveFromPalette() } },
  { id: 'project-validate', label: 'validateProject', group: 'file', icon: '✓', keywords: 'validate project format references schema repair', run: validateFromPalette },
  { id: 'project-repair', label: 'repairProject', group: 'file', icon: '↺', keywords: 'repair project format schema dependencies backup rollback', run: () => { void repairFromPalette() } },
  { id: 'edit-undo', label: 'undo', group: 'edit', icon: '↶', keywords: 'undo history transaction', shortcut: 'Ctrl+Z', run: () => { if (isEditing.value && historyState.canUndo) undo() } },
  { id: 'edit-redo', label: 'redo', group: 'edit', icon: '↷', keywords: 'redo history transaction', shortcut: 'Ctrl+Y', run: () => { if (isEditing.value && historyState.canRedo) redo() } },
  { id: 'edit-copy', label: 'copy', group: 'edit', icon: 'CP', keywords: 'copy selected objects entities', shortcut: 'Ctrl+C', run: () => { copySelectedEntities() } },
  { id: 'edit-paste', label: 'paste', group: 'edit', icon: 'PS', keywords: 'paste copied objects entities', shortcut: 'Ctrl+V', run: () => { if (isEditing.value) pasteEntities() } },
  { id: 'edit-duplicate', label: 'duplicate', group: 'edit', icon: 'D+', keywords: 'duplicate selected objects entities', shortcut: 'Ctrl+D', run: () => { if (isEditing.value) duplicateSelectedEntities() } },
  { id: 'edit-delete', label: 'deleteSelected', group: 'edit', icon: '⌫', keywords: 'delete selected objects entities', shortcut: 'Delete', run: () => { void deleteFromPalette() } },
  { id: 'runtime-play', label: 'play', group: 'runtime', icon: '▶', keywords: 'play run game physics simulation', run: () => { void playFromPalette() } },
  { id: 'runtime-stop', label: 'stop', group: 'runtime', icon: '■', keywords: 'stop game physics simulation restore', run: stopFromPalette },
  workspaceCommand('design', 'workspaceDesign', '◇'), workspaceCommand('script', 'workspaceScript', '</>'), workspaceCommand('animation', 'workspaceAnimation', '◆'), workspaceCommand('ui', 'workspaceUi', '▣'), workspaceCommand('debug', 'workspaceDebug', '◎'),
  ...(workspaceState.custom.length ? [workspaceCommand('custom', 'workspaceCustom', '✦')] : []),
  { id: 'scene', label: 'sceneView', group: 'navigation', icon: 'S', keywords: 'scene edit view', run: () => { state.currentPage = 'scene' } },
  { id: 'game', label: 'gameView', group: 'navigation', icon: 'G', keywords: 'game play view', run: () => { state.currentPage = 'game' } },
  { id: 'settings', label: 'settings', group: 'navigation', icon: '⚙', keywords: 'settings preferences', run: () => { state.currentPage = 'settings' } },
  toolCommand('assets', 'assets', '▧'), toolCommand('packages', 'packages', '◇'), toolCommand('console', 'console', '>_'), toolCommand('animation', 'animation', '◆'), toolCommand('tilemap', 'tilemap', '▦'), toolCommand('world', 'worldTools', '◎'), toolCommand('profiler', 'profiler', '⌁'), toolCommand('rendering', 'renderingStudio', '◈'), toolCommand('project', 'projectHealth', '✓'), toolCommand('build', 'buildPanel', '▶'),
  { id: 'toggle-hierarchy', label: 'toggleHierarchy', group: 'layoutPanels', icon: 'H', keywords: 'panel hierarchy outliner', run: () => toggleEditorPanel('hierarchy') },
  { id: 'toggle-inspector', label: 'toggleInspector', group: 'layoutPanels', icon: 'I', keywords: 'panel inspector properties', run: () => toggleEditorPanel('inspector') },
  { id: 'toggle-bottom', label: 'toggleBottomPanel', group: 'layoutPanels', icon: 'B', keywords: 'drawer panel bottom', run: () => toggleEditorPanel('bottom') },
  { id: 'focus', label: 'focusMode', group: 'layoutPanels', icon: '⛶', keywords: 'focus distraction free fullscreen', run: toggleFocusMode },
  { id: 'reset-layout', label: 'resetLayout', group: 'layoutPanels', icon: '↺', keywords: 'restore default reset panels', run: resetEditorLayout },
  { id: 'navigation-back', label: 'navigateBack', group: 'navigation', icon: '←', keywords: 'back previous history', shortcut: shortcutState.definitions.find(item => item.id === 'navigateBack')?.binding, run: () => { navigateHistory('back') } },
  { id: 'navigation-forward', label: 'navigateForward', group: 'navigation', icon: '→', keywords: 'forward next history', shortcut: shortcutState.definitions.find(item => item.id === 'navigateForward')?.binding, run: () => { navigateHistory('forward') } },
  { id: 'fullscreen', label: 'toggleFullscreen', group: 'layoutPanels', icon: '⛶', keywords: 'fullscreen window F11', shortcut: shortcutState.definitions.find(item => item.id === 'fullscreen')?.binding, run: () => { void toggleEditorFullscreen() } },
  { id: 'workspace-manager', label: 'manageWorkspaces', group: 'workspaces', icon: '⚙', keywords: 'save duplicate rename import export custom layout', run: () => { state.workspaceManagerOpen = true } },
  { id: 'shortcut-editor', label: 'shortcutEditor', group: 'settings', icon: '⌨', keywords: 'keyboard shortcuts bindings edit viewer', run: () => { state.shortcutEditorOpen = true } },
  { id: 'status-center', label: 'statusCenter', group: 'tools', icon: '◴', keywords: 'tasks import build package migration save progress diagnostics', run: () => { state.statusCenterOpen = true } },
  ...assetState.records.map(asset => ({ id: `asset-${asset.uuid}`, label: asset.name, group: asset.assetType === 'script' ? 'scripts' : 'assets', icon: asset.assetType === 'script' ? '{ }' : '▧', keywords: `${asset.path} ${asset.assetType} asset`, run: () => { assetState.selectedGuid = asset.uuid; assetState.currentFolder = asset.path.slice(0, asset.path.lastIndexOf('/')) || 'Assets'; openEditorTool('assets') } } as EditorCommand)),
  ...sceneManager.scenes.map(scene => ({ id: `scene-${scene.uuid}`, label: scene.name, group: 'scenes', icon: '◇', keywords: 'scene navigation object', run: () => { setActiveScene(scene.uuid); state.currentPage = 'scene' } } as EditorCommand)),
  ...physicsState.world.entities.map(entity => ({ id: `entity-${entity.uuid}`, label: entity.name, group: 'entities', icon: '□', keywords: `${entity.uuid} ${entity.tags.join(' ')} ${entity.components.map(component => component.kind).join(' ')}`, run: () => { selectEntities([entity.id], 'replace', entity.id); state.currentPage = 'scene' } } as EditorCommand)),
  ...['appearanceSettings','physicsSettings','audioSettings','inputMap','canvasSettings','collisionMatrix','projectSettings','defaultsSettings'].map(label => ({ id: `setting-${label}`, label: label as TranslationKey, group: 'settings' as TranslationKey, icon: '⚙', keywords: `${label} editor project runtime preference`, run: () => { state.currentPage = 'settings'; state.settingsSearch = t(label as TranslationKey) } })),
  ...pluginState.contributions.filter(contribution => contribution.kind === 'commands').map(contribution => ({
    id: `plugin-${contribution.pluginId}-${contribution.id}`, label: contribution.label as TranslationKey, group: 'plugins' as TranslationKey,
    icon: 'PX', keywords: `plugin extension ${contribution.pluginName} ${contribution.id}`, run: () => { pluginRuntime.invokeCommand(contribution.id, contribution.pluginId) }
  }))
])
const filteredCommands = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase()
  if (!needle) return commands.value
  return commands.value.filter(command => `${t(command.label)} ${t(command.group)} ${command.keywords}`.toLocaleLowerCase().includes(needle))
})

function close(): void { state.commandPaletteOpen = false }
function run(command: EditorCommand): void { command.run(); close() }
function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') { event.preventDefault(); activeIndex.value = Math.min(filteredCommands.value.length - 1, activeIndex.value + 1) }
  else if (event.key === 'ArrowUp') { event.preventDefault(); activeIndex.value = Math.max(0, activeIndex.value - 1) }
  else if (event.key === 'Enter' && filteredCommands.value[activeIndex.value]) { event.preventDefault(); run(filteredCommands.value[activeIndex.value]) }
  else if (event.key === 'Escape') { event.preventDefault(); close() }
}
function globalShortcut(event: KeyboardEvent): void {
  const commandKey = event.ctrlKey || event.metaKey
  const key = event.key.toLocaleLowerCase()
  if (!shortcutMatches(event, 'commandPalette') && !(commandKey && event.shiftKey && key === 'p')) return
  event.preventDefault()
  state.commandPaletteOpen = !state.commandPaletteOpen
}

watch(() => state.commandPaletteOpen, open => {
  if (open) { query.value = ''; activeIndex.value = 0; void nextTick(() => searchInput.value?.focus()) }
})
watch(filteredCommands, () => { activeIndex.value = 0 })
onMounted(() => window.addEventListener('keydown', globalShortcut))
onUnmounted(() => window.removeEventListener('keydown', globalShortcut))
</script>

<style scoped>
.palette-scrim { position: fixed; inset: 0; z-index: 1200; padding-top: min(14vh, 110px); display: flex; justify-content: center; align-items: flex-start; background: var(--scrim); backdrop-filter: blur(5px); }
.command-palette { width: min(620px, calc(100vw - 32px)); max-height: min(620px, calc(100vh - 130px)); display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-strong); border-radius: 16px; background: var(--surface-1); box-shadow: var(--shadow-lg); }
header { min-height: 52px; padding: 7px 12px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border-subtle); }header > span { color: var(--accent); font-size: 20px; }header input { min-width: 0; flex: 1; border: 0; background: transparent; font-size: 14px; box-shadow: none; }kbd { padding: 2px 6px; border: 1px solid var(--border-subtle); border-radius: 5px; color: var(--text-muted); background: var(--surface-2); font: 11px/1.4 inherit; }
.command-results { min-height: 80px; padding: 7px; overflow: auto; }.command-results button { width: 100%; min-height: 46px; padding: 6px 10px; display: grid; grid-template-columns: 30px 1fr auto; align-items: center; gap: 8px; border: 0; border-radius: 9px; color: var(--text-secondary); background: transparent; text-align: left; }.command-results button.active { color: var(--text-primary); background: var(--accent-soft); }.command-icon { width: 27px; height: 27px; display: grid; place-items: center; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--accent); background: var(--surface-2); font: 600 11px/1 ui-monospace, SFMono-Regular, Consolas, monospace; }.command-results button > span:nth-child(2) { min-width: 0; display: flex; flex-direction: column; gap: 2px; }.command-results strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.command-results small { color: var(--text-muted); font-size:11px; }.command-results p { padding: 22px; color: var(--text-muted); text-align: center; font-size: 11px; }
footer { min-height: 30px; padding: 0 12px; display: flex; align-items: center; gap: 15px; border-top: 1px solid var(--border-subtle); color: var(--text-muted); font-size:11px; }
.palette-enter-active, .palette-leave-active { transition: opacity 130ms ease; }.palette-enter-active .command-palette, .palette-leave-active .command-palette { transition: transform 160ms cubic-bezier(.2,.8,.2,1), opacity 130ms ease; }.palette-enter-from, .palette-leave-to { opacity: 0; }.palette-enter-from .command-palette, .palette-leave-to .command-palette { opacity: 0; transform: translateY(-8px) scale(.985); }
</style>
