<!-- 工作区导航：标题栏中部的工作区切换器（switcher）与右侧的命令、布局入口（tools）。 -->
<template>
  <nav v-if="section === 'switcher'" class="workspace-bar" role="toolbar" :aria-label="t('workspaces')">
    <div class="history-controls" :aria-label="t('navigationHistory')">
      <UiButton icon="back" :label="`${t('navigateBack')} (${shortcutLabel('navigateBack', 'inline')})`" :disabled="!workspaceState.navigationBack.length" data-doc="manual/navigation-history" @click="navigateHistory('back')" />
      <UiButton icon="forward" :label="`${t('navigateForward')} (${shortcutLabel('navigateForward', 'inline')})`" :disabled="!workspaceState.navigationForward.length" data-doc="manual/navigation-history" @click="navigateHistory('forward')" />
    </div>
    <div ref="switcher" class="workspace-list" role="tablist" :aria-label="t('workspaces')">
      <span class="workspace-thumb" aria-hidden="true" :style="thumbStyle"></span>
      <button
        v-for="preset in visiblePresets"
        :key="preset.id"
        type="button"
        role="tab"
        :data-workspace="preset.id"
        :class="{ active: shownWorkspace === preset.id }"
        :aria-selected="shownWorkspace === preset.id"
        :title="`${t(preset.label)} · ${t('workspacePreset')}`"
        @click="selectWorkspace(preset.id)"
      ><EditorIcon :name="preset.id" /><span class="label">{{ t(preset.label) }}</span><i v-if="workspaceDirty(preset.id)" class="dirty" :title="t('unsavedChanges')"></i></button>
    </div>
  </nav>
  <div v-else class="workspace-tools">
    <details data-ui-motion-popover v-transient-popover class="workspace-menu command-menu">
      <summary class="command-field" :aria-label="t('commands')" :title="`${t('commandPalette')} (${shortcutLabel('commandPalette', 'inline')})`"><EditorIcon name="search" /><span>{{ t('commands') }}</span><kbd>{{ shortcutLabel('commandPalette') }}</kbd></summary>
      <div class="workspace-popover command-popover" role="group" :aria-label="t('commands')">
        <UiButton class="quick-trigger" :data-shortcut="shortcutLabel('quickOpen', 'inline')" @click="openPalette('quick')"><EditorIcon name="search" /><span>{{ t('quickOpen') }}</span><kbd>{{ shortcutLabel('quickOpen') }}</kbd></UiButton>
        <UiButton class="command-trigger" :data-shortcut="shortcutLabel('commandPalette', 'inline')" @click="openPalette('commands')"><EditorIcon name="command" /><span>{{ t('commandPalette') }}</span><kbd>{{ shortcutLabel('commandPalette') }}</kbd></UiButton>
        <hr>
        <UiButton data-doc="manual/navigation-history" :disabled="!workspaceState.navigationBack.length" :title="`${t('navigateBack')} (${shortcutLabel('navigateBack', 'inline')})`" @click="navigateHistory('back'); ($event.currentTarget as HTMLElement).closest('details')?.removeAttribute('open')"><EditorIcon name="back" /><span>{{ t('navigateBack') }}</span><kbd>{{ shortcutLabel('navigateBack') }}</kbd></UiButton>
        <UiButton data-doc="manual/navigation-history" :disabled="!workspaceState.navigationForward.length" :title="`${t('navigateForward')} (${shortcutLabel('navigateForward', 'inline')})`" @click="navigateHistory('forward'); ($event.currentTarget as HTMLElement).closest('details')?.removeAttribute('open')"><EditorIcon name="forward" /><span>{{ t('navigateForward') }}</span><kbd>{{ shortcutLabel('navigateForward') }}</kbd></UiButton>
      </div>
    </details>
    <details data-ui-motion-popover v-transient-popover class="workspace-menu layout-menu">
      <summary :aria-label="t('layoutPanels')" :title="t('layoutPanels')"><EditorIcon name="layout" /></summary>
      <div class="workspace-popover" role="group" :aria-label="t('layoutPanels')">
        <h3>{{ t('layoutPanels') }}</h3>
        <UiButton :class="{ checked: state.hierarchyVisible && !state.distractionFree }" :title="t('toggleHierarchy')" data-doc="manual/hierarchy" @click="toggleEditorPanel('hierarchy')"><EditorIcon name="hierarchy" /><span>{{ t('hierarchy') }}</span><EditorIcon v-if="state.hierarchyVisible && !state.distractionFree" name="check" /></UiButton>
        <UiButton :class="{ checked: state.inspectorVisible && !state.distractionFree }" :title="t('toggleInspector')" data-doc="manual/inspector" @click="toggleEditorPanel('inspector')"><EditorIcon name="layout" /><span>{{ t('inspector') }}</span><EditorIcon v-if="state.inspectorVisible && !state.distractionFree" name="check" /></UiButton>
        <UiButton :class="{ checked: state.bottomPanelVisible && !state.distractionFree }" :title="t('toggleBottomPanel')" data-doc="manual/bottom-panel" @click="toggleEditorPanel('bottom')"><EditorIcon name="bottom" /><span>{{ t('bottomPanel') }}</span><EditorIcon v-if="state.bottomPanelVisible && !state.distractionFree" name="check" /></UiButton>
        <UiButton :class="{ checked: state.distractionFree }" :title="t('focusMode')" data-doc="manual/focus-mode" @click="toggleFocusMode"><EditorIcon name="maximize" /><span>{{ t('focusMode') }}</span><EditorIcon v-if="state.distractionFree" name="check" /></UiButton>
        <hr>
        <UiButton :title="`${t('manageWorkspaces')} (${shortcutLabel('workspaceManager', 'inline')})`" data-doc="manual/workspaces" @click="state.workspaceManagerOpen = true"><EditorIcon name="manage" /><span>{{ t('manageWorkspaces') }}</span><kbd>{{ shortcutLabel('workspaceManager') }}</kbd></UiButton>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import EditorIcon from './EditorIcon.vue'
import UiButton from '../ui/components/UiButton.vue'
import { vTransientPopover } from '../editor/transientPopover'
import { t } from '../i18n'
import { shortcutLabel } from '../editor/shortcuts'
import { editorState as state, type EditorWorkspace } from '../store/editor'
import { applyEditorWorkspace, navigateHistory, toggleEditorPanel, toggleFocusMode, WORKSPACE_PRESETS, workspaceState } from '../editor/workspaces'
import { projectScopeDirty } from '../runtime/projectTransactions'
import { preferencesState } from '../store/preferences'

defineProps<{ section: 'switcher' | 'tools' }>()
// The switcher answers the click on the next paint; the (possibly heavy) workspace swap follows right after,
// so the selection never waits for a large panel to mount.
const pendingWorkspace = ref<EditorWorkspace | null>(null)
const shownWorkspace = computed(() => pendingWorkspace.value ?? state.activeWorkspace)
let pendingFrame = 0
const switcher = ref<HTMLElement | null>(null)
const thumb = ref({ left: 0, width: 0, ready: false })
const thumbStyle = computed(() => ({ transform: `translateX(${thumb.value.left}px)`, inlineSize: `${thumb.value.width}px`, opacity: thumb.value.ready ? 1 : 0 }))
/** Measure the active workspace once per change; the thumb glides there with CSS, never per frame. */
function placeThumb(): void {
  const list = switcher.value, active = list?.querySelector<HTMLElement>('button.active')
  if (!list || !active) { thumb.value = { ...thumb.value, ready: false }; return }
  thumb.value = { left: active.offsetLeft, width: active.offsetWidth, ready: true }
}
let resizeObserver: ResizeObserver | undefined
onMounted(() => { void nextTick(placeThumb); if (switcher.value && typeof ResizeObserver !== 'undefined') { resizeObserver = new ResizeObserver(() => placeThumb()); resizeObserver.observe(switcher.value) } })
onBeforeUnmount(() => { resizeObserver?.disconnect(); cancelAnimationFrame(pendingFrame) })
watch(() => [shownWorkspace.value, preferencesState.locale, preferencesState.uiScale], () => void nextTick(placeThumb))
const visiblePresets = computed(/** 过滤自定义占位项，返回可展示的预设工作区。 */ () => WORKSPACE_PRESETS.filter(/* 比较 preset.id 与 'custom'，返回严格不等的判断结果。 */ preset => preset.id !== 'custom'))

/** 将工作区映射至项目修改范围，任一相关范围未保存即标脏。 */ function workspaceDirty(workspace: EditorWorkspace): boolean { const scopes = workspace==='script'?['script']:workspace==='animation'?['animation']:workspace==='ui'?['ui']:workspace==='manage'?['settings','packages','build','project']:workspace==='design'?['scene','asset']:[]; return scopes.some(/** 检查指定项目范围是否未保存。 */ scope=>projectScopeDirty(scope as Parameters<typeof projectScopeDirty>[0])) }
/** 设置命令面板模式并打开面板。 */ function openPalette(mode: 'commands' | 'quick'): void { state.commandPaletteMode = mode; state.commandPaletteOpen = true }

/** 应用所选工作区并更新本地化状态提示。 */ function selectWorkspace(workspace: EditorWorkspace): void {
  if (workspace === state.activeWorkspace && !pendingWorkspace.value) return
  pendingWorkspace.value = workspace
  cancelAnimationFrame(pendingFrame)
  pendingFrame = requestAnimationFrame(() => { pendingFrame = requestAnimationFrame(() => { pendingFrame = 0; commitWorkspace(workspace) }) })
}
function commitWorkspace(workspace: EditorWorkspace): void {
  if (pendingWorkspace.value !== workspace) return
  pendingWorkspace.value = null
  applyEditorWorkspace(workspace)
  state.statusText = t('workspaceActivated', { workspace: t(WORKSPACE_PRESETS.find(/* 比较 preset.id 与 workspace，返回严格相等的判断结果。 */ preset => preset.id === workspace)!.label) })
}
</script>

<style scoped>
.workspace-bar{display:flex;align-items:center;gap:var(--space-2);min-width:0;container:workspace-chrome/inline-size}
.history-controls{display:flex;align-items:center;flex:none;gap:0}
.history-controls .ui-button{width:calc(var(--ui-control-height) - 4px);min-width:0;color:var(--text-muted)}
.workspace-list{
  position:relative;display:flex;align-items:center;gap:0;min-width:0;padding:2px;
  border-radius:calc(var(--radius-control) + 2px);background:var(--surface-inset);
  box-shadow:inset 0 0 0 var(--ui-border-width) var(--border-separator);overflow-x:auto;scrollbar-width:none;
}
.workspace-list::-webkit-scrollbar{display:none}
.workspace-thumb{
  position:absolute;inset-block:2px;inset-inline-start:0;border-radius:var(--radius-control);
  background:var(--surface-raised);box-shadow:var(--shadow-xs),var(--hairline-highlight);pointer-events:none;
  transition:transform var(--motion-standard) var(--ease-snappy),inline-size var(--motion-standard) var(--ease-snappy),opacity var(--motion-fast) var(--ease-standard);
}
.workspace-list>button{
  position:relative;z-index:1;display:inline-flex;align-items:center;gap:var(--space-1);flex:none;
  min-height:calc(var(--ui-control-height) - 4px);padding:0 var(--space-3);border:0;border-radius:var(--radius-control);
  background:transparent;color:var(--text-muted);font-weight:var(--weight-medium);font-size:var(--type-dense);
}
.workspace-list>button:hover:not(.active){background:transparent;color:var(--text-primary)}
.workspace-list>button.active{background:transparent;color:var(--text-primary)}
.workspace-list>button .editor-icon{width:calc(14px * var(--ui-scale));height:calc(14px * var(--ui-scale));flex-basis:calc(14px * var(--ui-scale))}
.dirty{inline-size:5px;block-size:5px;margin-inline-start:1px;border-radius:50%;background:var(--warning);flex:none;align-self:center}
.workspace-tools{display:flex;align-items:center;gap:var(--space-1);flex:none}
.workspace-menu{position:relative;flex:none}
.workspace-menu>summary{display:flex;align-items:center;gap:var(--space-2);list-style:none;color:var(--text-secondary)}
.workspace-menu>summary::-webkit-details-marker{display:none}
.layout-menu>summary{width:var(--ui-control-height);padding:0;justify-content:center}
.command-field{
  min-width:calc(150px * var(--ui-scale));padding-inline:var(--space-2) var(--space-2);
  background:var(--surface-inset)!important;box-shadow:inset 0 0 0 var(--ui-border-width) var(--border-separator);font-weight:var(--weight-regular);
}
.command-field:hover{box-shadow:inset 0 0 0 var(--ui-border-width) var(--border-subtle)}
.command-field>span{flex:1;color:var(--text-muted);font-size:var(--type-dense)}
.command-field>kbd{font-size:var(--type-caption);color:var(--text-tertiary)}
.workspace-popover{position:absolute;top:calc(100% + var(--space-1));right:0;min-width:28ch;max-width:min(40ch,90vw);padding:var(--space-1);display:grid;gap:1px;border:var(--ui-border-width) solid var(--border-subtle);border-radius:var(--radius-floating);background:var(--surface-popover);box-shadow:var(--shadow-md);z-index:500}
.workspace-popover h3{font-size:var(--type-caption);font-weight:var(--weight-medium);color:var(--text-muted);margin:var(--space-1) var(--space-2)}
.workspace-popover hr{margin:var(--space-1) var(--space-2)}
.workspace-popover .ui-button{justify-content:flex-start;font-weight:var(--weight-regular);border-radius:var(--radius-xs);min-height:calc(var(--ui-control-height) - 2px)}
.workspace-popover .ui-button:hover:not(:disabled){background:var(--accent-fill);color:var(--accent-contrast)}
.workspace-popover .ui-button:hover:not(:disabled) kbd{color:inherit}
.workspace-popover .ui-button>span{flex:1;text-align:left}
.workspace-popover kbd{margin-left:auto;font-size:var(--type-caption)}
@container workspace-chrome (max-width:46em){.workspace-list>button .editor-icon{display:none}.history-controls{display:none}.workspace-list>button{padding-inline:var(--space-2)}}
@container workspace-chrome (max-width:24em){.workspace-list>button .label{display:none}.workspace-list>button .editor-icon{display:block}}
@media(max-width:1440px){.command-field{min-width:0}.command-field>kbd{display:none}}
@media(max-width:1366px){.command-field>span{display:none}}
</style>
