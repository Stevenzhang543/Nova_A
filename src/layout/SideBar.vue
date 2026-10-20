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
import EditorIcon from '../components/EditorIcon.vue'
import { t } from '../i18n'
import { editorState as state } from '../store/editor'
import { useContextActions } from '../editor/contextActions'

// 26.44 G1: the rail only appears when the docked Hierarchy panel (which now carries these tools) is not shown.
const actions = useContextActions()
</script>

<style scoped>
.sidebar{inline-size:var(--ui-rail-width);flex:none;padding:var(--space-1) 0;display:flex;flex-direction:column;align-items:center;gap:var(--space-1);border-radius:var(--radius-panel);background:var(--surface-1);box-shadow:inset 0 0 0 var(--ui-border-width) var(--border-separator);z-index:160}
.sidebar>header{display:none}
nav{display:flex;flex:1;min-height:0;flex-direction:column;align-items:center;gap:2px;overflow-y:auto;scrollbar-width:none}
.sidebar .ui-button{flex:none;width:calc(var(--ui-rail-width) - 2 * var(--space-1));height:calc(var(--ui-rail-width) - 2 * var(--space-1));color:var(--text-muted)}
.sidebar .ui-button:hover:not(:disabled){color:var(--text-primary)}
.sidebar .ui-button.active{background:var(--selection-bg);color:var(--text-primary)}
.create{margin-top:auto;color:var(--creation)!important}
</style>
