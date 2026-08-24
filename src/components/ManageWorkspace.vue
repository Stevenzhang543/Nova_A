<template>
  <section class="manage-workspace" data-control-scope="manage-workspace">
    <header class="manage-header">
      <div><span>{{ t('workspaceManage') }}</span><h1>{{ t(active.label) }}</h1><small>{{ t(active.description) }}</small></div>
      <span class="lifecycle"><b>{{ t('stable') }}</b>{{ t('stableFeatureExplanation') }}</span>
    </header>
    <div class="manage-body">
      <nav :aria-label="t('workspaceManage')">
        <button v-for="item in sections" :key="item.id" :class="{ active: state.manageSection === item.id }" :aria-pressed="state.manageSection === item.id" @click="state.manageSection = item.id"><span aria-hidden="true">{{ item.icon }}</span><span><strong>{{ t(item.label) }} <i v-if="sectionDirty(item.id)">●</i></strong><small>{{ t(item.short) }}</small></span></button>
      </nav>
      <main :key="state.manageSection">
        <SettingsPanel v-if="state.manageSection === 'settings'" />
        <PackageManagerPanel v-else-if="state.manageSection === 'packages'" />
        <ProjectHealthPanel v-else-if="state.manageSection === 'project'" />
        <RenderingPanel v-else-if="state.manageSection === 'rendering'" />
        <BuildSettingsPanel v-else />
      </main>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../i18n'
import { editorState as state, type ManageSection } from '../store/editor'
import SettingsPanel from '../panels/SettingsPanel.vue'
import PackageManagerPanel from './PackageManagerPanel.vue'
import ProjectHealthPanel from './ProjectHealthPanel.vue'
import RenderingPanel from './RenderingPanel.vue'
import BuildSettingsPanel from './BuildSettingsPanel.vue'
import { projectScopeDirty } from '../runtime/projectTransactions'

type TranslationKey = Parameters<typeof t>[0]
const sections: ReadonlyArray<{ id: ManageSection; label: TranslationKey; description: TranslationKey; short: TranslationKey; icon: string }> = [
  { id: 'settings', label: 'projectSettings', description: 'manageSettingsHint', short: 'settings', icon: '⚙' },
  { id: 'packages', label: 'packages', description: 'managePackagesHint', short: 'pluginApiCompatibility', icon: '◇' },
  { id: 'project', label: 'projectHealth', description: 'projectHealthHint', short: 'projectValidation', icon: '✓' },
  { id: 'rendering', label: 'renderingStudio', description: 'manageRenderingHint', short: 'renderingQuality', icon: '◈' },
  { id: 'build', label: 'buildPanel', description: 'manageBuildHint', short: 'buildReadiness', icon: '▶' }
]
const active = computed(() => sections.find(item => item.id === state.manageSection) ?? sections[0])
function sectionDirty(id:ManageSection){return id==='packages'?projectScopeDirty('packages'):id==='build'?projectScopeDirty('build'):id==='project'?projectScopeDirty('project'):projectScopeDirty('settings')}
</script>

<style scoped>
.manage-workspace{position:absolute;inset:0;display:flex;flex-direction:column;min-width:0;min-height:0;background:var(--surface-1)}
.manage-header{min-height:76px;padding:var(--space-3) var(--space-4);display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);border-bottom:1px solid var(--border-subtle)}
.manage-header>div{min-width:0;display:grid;gap:2px}.manage-header span{color:var(--accent);font-size:var(--type-caption);font-weight:700}.manage-header h1{margin:0;font-size:var(--type-page);line-height:var(--line-page)}.manage-header small{color:var(--text-muted);font-size:var(--type-dense)}
.lifecycle{max-width:330px;padding:6px 9px;display:grid;border:1px solid var(--border-subtle);border-radius:var(--radius-panel);color:var(--text-muted)!important;background:var(--surface-2)}.lifecycle b{color:var(--success)}
.manage-body{min-height:0;flex:1;display:grid;grid-template-columns:220px minmax(0,1fr)}.manage-body>nav{padding:var(--space-2);display:flex;flex-direction:column;gap:4px;overflow:auto;border-right:1px solid var(--border-subtle)}
.manage-body>nav button{min-width:0;min-height:52px;padding:6px 8px;display:grid;grid-template-columns:28px minmax(0,1fr);align-items:center;gap:8px;border:1px solid transparent;border-radius:var(--radius-panel);color:var(--text-muted);background:transparent;text-align:left}.manage-body>nav button:hover{background:var(--surface-hover)}.manage-body>nav button.active{color:var(--text-primary);border-color:color-mix(in srgb,var(--accent) 45%,var(--border-subtle));background:var(--selection-bg)}.manage-body>nav button>span:first-child{width:28px;height:28px;display:grid;place-items:center;border-radius:var(--radius-input);color:var(--accent);background:var(--surface-3)}.manage-body>nav button>span:last-child{min-width:0;display:grid}.manage-body>nav strong,.manage-body>nav small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.manage-body>nav small{color:var(--text-muted);font-size:var(--type-caption);font-weight:400}
.manage-body>main{position:relative;min-width:0;min-height:0;overflow:hidden;background:var(--bg-base)}.manage-body>main>:deep(*){max-width:100%}
@media(max-width:760px){.manage-header{min-height:64px}.lifecycle{display:none}.manage-body{grid-template-columns:54px minmax(0,1fr)}.manage-body>nav button{grid-template-columns:1fr;padding:4px}.manage-body>nav button>span:last-child{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.manage-body>nav button>span:first-child{margin:auto}}
.manage-body>nav strong i{display:inline-block;width:6px;height:6px;margin-left:5px;border-radius:50%;background:var(--warning);font-size:0;font-style:normal;vertical-align:middle}
</style>
