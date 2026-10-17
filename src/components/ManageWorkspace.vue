<!-- 管理工作区：按需加载各管理面板并显示对应脏状态。 -->
<template>
  <section class="manage-workspace" data-control-scope="manage-workspace">
    <UiPanelHeader class="manage-header" :title="t('workspaceManage')" :description="t(active.description)" />
    <div class="manage-body">
      <UiTabs :aria-label="t('workspaceManage')" :items="tabs" :model-value="state.manageSection" @update:model-value="state.manageSection = $event as ManageSection" />
      <main>
        <UiAsyncWorkspace :view="state.manageSection" :loaders="loaders" />
      </main>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { type EditorIconName } from './EditorIcon.vue'
import UiAsyncWorkspace from '../ui/components/UiAsyncWorkspace.vue'
import { t } from '../i18n'
import { editorState as state, type ManageSection } from '../store/editor'
import { projectScopeDirty } from '../runtime/projectTransactions'

const loaders = {
  settings: () => import('../panels/SettingsPanel.vue'), packages: () => import('./PackageManagerPanel.vue'),
  project: () => import('./ProjectHealthPanel.vue'), rendering: () => import('./RenderingPanel.vue'),
  build: () => import('./BuildSettingsPanel.vue'), learn: () => import('./CreatorLearningCenter.vue'),
  automation: () => import('./AutomationStudio.vue')
}

type TranslationKey = Parameters<typeof t>[0]
const sections: ReadonlyArray<{ id: ManageSection; label: TranslationKey; description: TranslationKey; short: TranslationKey; icon: EditorIconName }> = [
  { id: 'learn', label: 'creatorLearning', description: 'creatorLearningHint', short: 'learnByBuilding', icon: 'learn' },
  { id: 'settings', label: 'projectSettings', description: 'manageSettingsHint', short: 'settings', icon: 'settings' },
  { id: 'automation', label: 'automationStudio', description: 'automationStudioHint', short: 'safeEditorAutomation', icon: 'tools' },
  { id: 'packages', label: 'packages', description: 'managePackagesHint', short: 'pluginApiCompatibility', icon: 'package' },
  { id: 'project', label: 'projectHealth', description: 'projectHealthHint', short: 'projectValidation', icon: 'check' },
  { id: 'rendering', label: 'renderingStudio', description: 'manageRenderingHint', short: 'renderingQuality', icon: 'render' },
  { id: 'build', label: 'buildPanel', description: 'manageBuildHint', short: 'buildReadiness', icon: 'build' }
]
const active = computed(/** 选择当前管理栏目，未知栏目回退到首项。 */ () => sections.find(/* 比较 item.id 与 state.manageSection，返回严格相等的判断结果。 */ item => item.id === state.manageSection) ?? sections[0])
const tabs = computed(() => sections.map(item => ({ id: item.id, icon: item.icon, label: `${t(item.label)}${sectionDirty(item.id) ? ' *' : ''}` })))
/** 把栏目映射至项目修改范围，学习与自动化栏目不单独标记脏状态。 */ function sectionDirty(id:ManageSection){return id==='learn'||id==='automation'?false:id==='packages'?projectScopeDirty('packages'):id==='build'?projectScopeDirty('build'):id==='project'?projectScopeDirty('project'):projectScopeDirty('settings')}
</script>

<style scoped>
.manage-workspace { position: absolute; inset: 0; display: flex; flex-direction: column; min-width: 0; min-height: 0; background: var(--surface-1); }
.manage-body { display: flex; flex: 1; flex-direction: column; min-width: 0; min-height: 0; }
.manage-body > nav { border-bottom: var(--ui-border-width) solid var(--border-subtle); padding-inline: var(--space-2); }
.manage-body > main { position: relative; flex: 1; min-width: 0; min-height: 0; overflow: hidden; }
</style>