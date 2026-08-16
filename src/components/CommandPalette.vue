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
import { editorState as state, type BottomPanelTab, type EditorWorkspace } from '../store/editor'
import { applyEditorWorkspace, openEditorTool, resetEditorLayout, toggleEditorPanel, toggleFocusMode } from '../editor/workspaces'
import { pluginRuntime, pluginState } from '../runtime/plugins'

type TranslationKey = Parameters<typeof t>[0]
interface EditorCommand { id: string; label: TranslationKey; group: TranslationKey; icon: string; shortcut?: string; keywords: string; run: () => void }

const searchInput = ref<HTMLInputElement | null>(null)
const dialog = ref<HTMLElement | null>(null)
const query = ref('')
const activeIndex = ref(0)

const workspaceCommand = (workspace: EditorWorkspace, label: TranslationKey, icon: string): EditorCommand => ({
  id: `workspace-${workspace}`, label, group: 'workspaces', icon, keywords: `${workspace} layout workspace`, run: () => applyEditorWorkspace(workspace)
})
const toolCommand = (tab: BottomPanelTab, label: TranslationKey, icon: string): EditorCommand => ({
  id: `tool-${tab}`, label, group: 'tools', icon, keywords: `${tab} panel tool bottom`, run: () => openEditorTool(tab)
})
const commands = computed<EditorCommand[]>(() => [
  workspaceCommand('design', 'workspaceDesign', '◇'), workspaceCommand('script', 'workspaceScript', '</>'), workspaceCommand('animation', 'workspaceAnimation', '◆'), workspaceCommand('interface', 'workspaceInterface', '▣'), workspaceCommand('debug', 'workspaceDebug', '◎'),
  { id: 'scene', label: 'sceneView', group: 'navigation', icon: 'S', keywords: 'scene edit view', run: () => { state.currentPage = 'scene' } },
  { id: 'game', label: 'gameView', group: 'navigation', icon: 'G', keywords: 'game play view', run: () => { state.currentPage = 'game' } },
  { id: 'settings', label: 'settings', group: 'navigation', icon: '⚙', keywords: 'settings preferences', run: () => { state.currentPage = 'settings' } },
  toolCommand('assets', 'assets', 'A'), toolCommand('packages', 'packages', 'PK'), toolCommand('console', 'console', '>_'), toolCommand('animation', 'animation', '◆'), toolCommand('tilemap', 'tilemap', '▦'), toolCommand('world', 'worldTools', 'W'), toolCommand('presentation', 'presentationStudio', 'UI'), toolCommand('profiler', 'productionLab', '⌁'), toolCommand('rendering', 'renderingStudio', 'R'), toolCommand('project', 'projectPanel', 'P'), toolCommand('build', 'buildPanel', 'B'),
  { id: 'toggle-hierarchy', label: 'toggleHierarchy', group: 'layoutPanels', icon: 'H', keywords: 'panel hierarchy outliner', run: () => toggleEditorPanel('hierarchy') },
  { id: 'toggle-inspector', label: 'toggleInspector', group: 'layoutPanels', icon: 'I', keywords: 'panel inspector properties', run: () => toggleEditorPanel('inspector') },
  { id: 'toggle-bottom', label: 'toggleBottomPanel', group: 'layoutPanels', icon: 'B', keywords: 'drawer panel bottom', run: () => toggleEditorPanel('bottom') },
  { id: 'focus', label: 'focusMode', group: 'layoutPanels', icon: '⛶', keywords: 'focus distraction free fullscreen', run: toggleFocusMode },
  { id: 'reset-layout', label: 'resetLayout', group: 'layoutPanels', icon: '↺', keywords: 'restore default reset panels', run: resetEditorLayout },
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
  if (!commandKey || (key !== 'k' && !(event.shiftKey && key === 'p'))) return
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
header { min-height: 52px; padding: 7px 12px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border-subtle); }header > span { color: var(--accent); font-size: 20px; }header input { min-width: 0; flex: 1; border: 0; background: transparent; font-size: 14px; box-shadow: none; }kbd { padding: 2px 6px; border: 1px solid var(--border-subtle); border-radius: 5px; color: var(--text-muted); background: var(--surface-2); font: 9px/1.4 inherit; }
.command-results { min-height: 80px; padding: 7px; overflow: auto; }.command-results button { width: 100%; min-height: 46px; padding: 6px 10px; display: grid; grid-template-columns: 30px 1fr auto; align-items: center; gap: 8px; border: 0; border-radius: 9px; color: var(--text-secondary); background: transparent; text-align: left; }.command-results button.active { color: var(--text-primary); background: var(--accent-soft); }.command-icon { width: 27px; height: 27px; display: grid; place-items: center; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--accent); background: var(--surface-2); font: 600 9px/1 ui-monospace, SFMono-Regular, Consolas, monospace; }.command-results button > span:nth-child(2) { min-width: 0; display: flex; flex-direction: column; gap: 2px; }.command-results strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.command-results small { color: var(--text-muted); font-size:11px; }.command-results p { padding: 22px; color: var(--text-muted); text-align: center; font-size: 11px; }
footer { min-height: 30px; padding: 0 12px; display: flex; align-items: center; gap: 15px; border-top: 1px solid var(--border-subtle); color: var(--text-muted); font-size:11px; }
.palette-enter-active, .palette-leave-active { transition: opacity 130ms ease; }.palette-enter-active .command-palette, .palette-leave-active .command-palette { transition: transform 160ms cubic-bezier(.2,.8,.2,1), opacity 130ms ease; }.palette-enter-from, .palette-leave-to { opacity: 0; }.palette-enter-from .command-palette, .palette-leave-to .command-palette { opacity: 0; transform: translateY(-8px) scale(.985); }
</style>
