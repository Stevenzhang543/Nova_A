<!-- 学习中心：展示学习指南及能力清单，并导航至对应工作区。 -->
<template>
  <section class="learning-center" data-control-scope="creator-learning">
    <UiPanelHeader :title="t('creatorLearning')" :description="t('creatorLearningHint')">
      <template #actions><span class="learning-progress" role="status">{{ progress.completed }} / {{ progress.total }} · {{ Math.round(progress.ratio * 100) }}%</span><UiButton icon="reset" :label="t('restartOnboarding')" @click="restartCreatorOnboarding" /><UiButton icon="learn" :label="t('openTeachingManual')" @click="openBundledManual('v6-teaching')" /></template>
    </UiPanelHeader>
    <UiTabs :model-value="activeTab" :items="tabs.map(item => ({ id: item.id, label: t(item.label) }))" :aria-label="t('creatorLearning')" @change="selectTab" />

    <div v-if="activeTab === 'guides'" class="guide-layout">
      <aside class="guide-catalog">
        <input v-model="learning.query" type="search" :placeholder="t('searchEveryFeature')" :aria-label="t('searchEveryFeature')">
        <div class="catalog-filters"><select v-model="learning.panel" :aria-label="t('panel')"><option value="all">{{ t('allPanels') }}</option><option v-for="panel in panels" :key="panel" :value="panel">{{ panel }}</option></select><label><input v-model="learning.taskProjectsOnly" type="checkbox">{{ t('guidedProjectsOnly') }}</label></div>
        <div class="guide-list" role="listbox" :aria-label="t('featureGuides')">
          <button v-for="guide in guides" :key="guide.id" role="option" :aria-selected="learning.activeGuideId === guide.id" :class="{ active: learning.activeGuideId === guide.id, complete: learning.completed.includes(guide.id) }" @click="learning.activeGuideId = guide.id">
            <EditorIcon :name="learning.completed.includes(guide.id) ? 'check' : guide.taskProject ? 'play' : 'learn'" /><span><strong>{{ guide.feature }}</strong><small>{{ guide.panel }} · {{ guide.workspace }}</small></span>
          </button>
          <p v-if="!guides.length">{{ t('noGuidesFound') }}</p>
        </div>
      </aside>

      <article v-if="activeGuide && localized" class="guide-detail">
        <header><div><span>{{ activeGuide.panel }} · {{ activeGuide.workspace }}</span><h2>{{ localized.title }}</h2></div><button class="primary" @click="openGuideWorkspace(activeGuide)">{{ t('openWorkspace') }}</button></header>
        <div class="classification"><span v-for="classification in activeGuide.classifications" :key="classification">{{ classification }}</span></div>
        <section><h3>{{ t('purposeAndWhen') }}</h3><p>{{ localized.purpose }}</p><p>{{ localized.whenToUse }}</p></section>
        <section><h3>{{ t('preconditions') }}</h3><ul><li v-for="item in localized.prerequisites" :key="item">{{ item }}</li></ul></section>
        <section><h3>{{ t('exactWorkflow') }}</h3><ol><li v-for="step in localized.steps" :key="step">{{ step }}</li></ol><div class="expected"><strong>{{ t('expectedResult') }}</strong><p>{{ localized.expectedResult }}</p></div></section>
        <section class="two-column"><div><h3>{{ t('persistenceAndExport') }}</h3><p>{{ localized.persistence }}</p></div><div><h3>{{ t('undoAndRecovery') }}</h3><p>{{ localized.undoRecovery }}</p></div></section>
        <section><h3>{{ t('commonMistakes') }}</h3><ul><li v-for="mistake in localized.mistakes" :key="mistake">{{ mistake }}</li></ul></section>
        <section><h3>{{ t('keyboardAccessibleAlternative') }}</h3><p>{{ localized.accessibility }}</p></section>
        <section class="two-column"><div><h3>{{ t('minimalExample') }}</h3><p>{{ localized.minimalExample }}</p></div><div><h3>{{ t('productionExample') }}</h3><p>{{ localized.productionExample }}</p></div></section>
        <section class="api-links"><div><h3>{{ t('relatedRhaiApi') }}</h3><code v-if="localized.relatedRhai.length">{{ localized.relatedRhai.join(' · ') }}</code><span v-else>{{ t('notApplicable') }}</span></div><div><h3>{{ t('relatedGraphApi') }}</h3><code v-if="localized.relatedGraph.length">{{ localized.relatedGraph.join(' · ') }}</code><span v-else>{{ t('notApplicable') }}</span></div></section>
        <footer><label><input :checked="learning.completed.includes(activeGuide.id)" type="checkbox" @change="completeLearningGuide(activeGuide.id, ($event.target as HTMLInputElement).checked)">{{ t('markGuideComplete') }}</label><button v-if="activeGuide.taskProject" @click="openBundledManual(`v6-${activeGuide.id}`)">{{ t('openFullTutorial') }}</button></footer>
      </article>
    </div>

    <div v-else-if="activeTab === 'contracts'" class="contract-view">
<!-- 契约检查回调读取各项冻结状态，所有契约冻结时显示完成标签。 -->      <header><div><span>{{ t('stableContractFreeze') }}</span><h2>Nova_A 7.0</h2></div><strong>{{ contracts.every(item => item.frozen) ? t('allContractsFrozen') : t('attentionRequired') }}</strong></header>
      <article v-for="contract in contracts" :key="contract.id"><div><span>{{ contract.id }}</span><strong>v{{ contract.version }}</strong></div><p>{{ contract.compatibility }}</p><small>{{ contract.migration }}</small><b>{{ contract.frozen ? t('frozen') : t('development') }}</b></article>
      <section class="migration-matrix"><h3>{{ t('migrationMatrix') }}</h3><p v-for="check in matrix" :key="check.contract"><EditorIcon :name="check.supported ? 'check' : 'warning'" /><strong>{{ check.contract }}</strong><small>{{ check.message }}</small></p></section>
    </div>

    <div v-else-if="activeTab === 'readiness'" class="readiness-view">
      <header><div><span>{{ t('stableCreatorPlatform') }}</span><h2>{{ t('platformReadiness') }}</h2><p>{{ t('platformReadinessHint') }}</p></div><button @click="openBundledManual('v7-platform')">{{ t('openTeachingManual') }}</button></header>
      <section class="readiness-summary"><article><strong>{{ readinessSummary.features }}</strong><span>{{ t('inventoryFeatures') }}</span></article><article><strong>{{ readinessSummary.dimensions }}</strong><span>{{ t('auditDimensions') }}</span></article><article><strong>{{ readinessSummary.covered }}</strong><span>{{ t('covered') }}</span></article><article><strong>{{ readinessSummary.external }}</strong><span>{{ t('pendingExternal') }}</span></article></section>
      <section class="contract-decision"><div><strong>{{ t('contractReview') }}</strong><span>{{ contractReview.nextContractDecision }}</span></div><p>{{ contractReview.decision }}</p><ul><li v-for="reason in contractReview.reasons" :key="reason">{{ reason }}</li></ul><small>{{ t('nextContractReview') }}: {{ contractReview.earliestNextReview }}</small></section>
      <section class="readiness-catalog">
        <header><input v-model="readinessQuery" type="search" :placeholder="t('searchEveryFeature')" :aria-label="t('searchEveryFeature')"><select v-model="readinessPanel" :aria-label="t('panel')"><option value="all">{{ t('allPanels') }}</option><option v-for="panel in panels" :key="panel" :value="panel">{{ panel }}</option></select><span>{{ filteredReadiness.length }} / {{ readinessSummary.features }}</span></header>
        <div class="readiness-table" role="table" :aria-label="t('platformReadiness')"><article v-for="item in filteredReadiness" :key="item.id" role="row"><div><strong>{{ item.feature }}</strong><small>{{ item.panel }} · {{ item.workspace }}</small></div><span v-for="dimension in readinessDimensions" :key="dimension" :class="item.dimensions[dimension].status" :title="item.dimensions[dimension].detail">{{ t(readinessLabels[dimension]) }}<EditorIcon :name="item.dimensions[dimension].status === 'covered' ? 'check' : item.dimensions[dimension].status === 'external' ? 'warning' : 'close'" /></span></article></div>
      </section>
      <section class="support-matrix"><h3>{{ t('supportMatrix') }}</h3><article v-for="target in supportMatrix" :key="target.target"><div><strong>{{ target.target }}</strong><span :class="target.status">{{ target.status }}</span></div><p>{{ target.evidence }}</p></article></section>
    </div>

    <div v-else class="profile-view">
      <header><div><span>{{ t('performanceProfiles') }}</span><h2>{{ t('chooseEditorProfile') }}</h2></div><p>{{ t('profileDoesNotChangeGame') }}</p></header>
      <div class="profile-grid"><button v-for="profile in profiles" :key="profile.id" :class="{ active: prefs.performanceProfile === profile.id }" @click="applyCreatorPerformanceProfile(profile.id)"><EditorIcon :name="prefs.performanceProfile === profile.id ? 'check' : 'settings'" /><strong>{{ profile.label }}</strong><p>{{ profile.description }}</p><small>DPI {{ profile.maximumPixelRatio }}× · {{ profile.hierarchyPerformanceMode ? t('boundedViewportSampling') : t('fullViewportSampling') }}</small></button></div>
      <section class="qualification-targets"><h3>{{ t('qualificationTargets') }}</h3><div><span>10,000</span><small>{{ t('hierarchyObjects') }}</small></div><div><span>50,000</span><small>{{ t('assetRecords') }}</small></div><div><span>1,000</span><small>{{ t('graphNodes') }}</small></div><div><span>60 Hz</span><small>{{ t('fixedRuntimeEvidence') }}</small></div></section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../i18n'
import EditorIcon from './EditorIcon.vue'
import { editorState } from '../store/editor'
import { preferencesState as prefs } from '../store/preferences'
import { openBundledManual } from '../runtime/openManual'
import { NOVA_STABLE_CONTRACTS, stableContractMatrix } from '../runtime/stableContracts'
import { CREATOR_LEARNING_GUIDES, CREATOR_PERFORMANCE_PROFILES, applyCreatorPerformanceProfile, completeLearningGuide, creatorLearningProgress, creatorLearningState as learning, filteredCreatorGuides, localizedLearningGuide, restartCreatorOnboarding, type LearningGuide } from '../runtime/creatorLearning'
import { CREATOR_CONTRACT_REVIEW, CREATOR_PLATFORM_READINESS, CREATOR_PLATFORM_SUMMARY, CREATOR_READINESS_DIMENSIONS, CREATOR_SUPPORT_MATRIX, type ReadinessDimension } from '../runtime/stableCreatorPlatform'

type TranslationKey = Parameters<typeof t>[0]
const tabs: ReadonlyArray<{ id: 'guides' | 'contracts' | 'readiness' | 'profiles'; label: TranslationKey }> = [{ id: 'guides', label: 'featureGuides' }, { id: 'contracts', label: 'stableContracts' }, { id: 'readiness', label: 'platformReadiness' }, { id: 'profiles', label: 'performanceProfiles' }]
function selectTab(id: string): void { if (tabs.some(item => item.id === id)) activeTab.value = id as typeof activeTab.value }
const activeTab = ref<'guides' | 'contracts' | 'readiness' | 'profiles'>('guides')
const progress = creatorLearningProgress, guides = filteredCreatorGuides, contracts = NOVA_STABLE_CONTRACTS, matrix = stableContractMatrix()
const panels = [...new Set(CREATOR_LEARNING_GUIDES.map(/* 返回 guide.panel 的当前值。 */ guide => guide.panel))].sort()
const profiles = Object.values(CREATOR_PERFORMANCE_PROFILES)
const readinessQuery = ref(''), readinessPanel = ref('all'), readinessSummary = CREATOR_PLATFORM_SUMMARY, readinessDimensions = CREATOR_READINESS_DIMENSIONS, contractReview = CREATOR_CONTRACT_REVIEW, supportMatrix = CREATOR_SUPPORT_MATRIX
const readinessLabels: Record<ReadinessDimension, TranslationKey> = { binding:'bindingCoverage', validation:'validation', undo:'undo', persistence:'persistence', runtimeExport:'runtimeExport', documentation:'documentation', tests:'tests' }
const filteredReadiness = computed(/** 按面板和规范化搜索词筛选能力清单。 */ () => { const query = readinessQuery.value.trim().toLocaleLowerCase(); return CREATOR_PLATFORM_READINESS.filter(/** 匹配面板选择及功能、面板、工作区中的搜索词。 */ item => (readinessPanel.value === 'all' || item.panel === readinessPanel.value) && (!query || `${item.feature} ${item.panel} ${item.workspace}`.toLocaleLowerCase().includes(query))) })
const activeGuide = computed(/** 优先使用已选指南，否则回退当前列表首项或空值。 */ () => CREATOR_LEARNING_GUIDES.find(/* 比较 guide.id 与 learning.activeGuideId，返回严格相等的判断结果。 */ guide => guide.id === learning.activeGuideId) ?? guides.value[0] ?? null)
const localized = computed(/** 存在指南时返回当前语言的指南内容。 */ () => activeGuide.value ? localizedLearningGuide(activeGuide.value, prefs.locale) : null)

/** 根据指南工作区或面板线索切换管理、脚本、动画、界面、调试或设计工作区。 */ function openGuideWorkspace(guide: LearningGuide): void {
  const workspace = guide.workspace.toLocaleLowerCase()
  if (workspace.includes('manage') || guide.panel.includes('Settings') || guide.panel.includes('Build')) { editorState.activeWorkspace = 'manage'; editorState.currentPage = 'manage'; return }
  if (workspace.includes('script')) { editorState.activeWorkspace = 'script'; editorState.currentPage = 'script'; return }
  if (workspace.includes('animation')) { editorState.activeWorkspace = 'animation'; editorState.currentPage = 'scene'; return }
  if (workspace.includes('interface')) { editorState.activeWorkspace = 'ui'; editorState.currentPage = 'scene'; return }
  if (workspace.includes('debug')) { editorState.activeWorkspace = 'debug'; editorState.currentPage = 'scene'; return }
  editorState.activeWorkspace = 'design'; editorState.currentPage = 'scene'
}
</script>

<style scoped>
.learning-center{height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;color:var(--text-primary);background:var(--bg-base);container-type:inline-size}
.learning-progress{color:var(--text-muted);white-space:nowrap;font-variant-numeric:tabular-nums}
.guide-layout{min-height:0;flex:1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,3fr)}
.guide-catalog{min-height:0;padding:var(--space-2);display:flex;flex-direction:column;gap:var(--space-2);border-right:1px solid var(--border-subtle);background:var(--surface-1)}
.catalog-filters{display:grid;gap:var(--space-1)}.catalog-filters label{display:flex;align-items:center;gap:var(--ui-control-gap);color:var(--text-muted)}
.guide-list{min-height:0;display:flex;flex-direction:column;overflow:auto}.guide-list button{flex-shrink:0;height:auto;padding:var(--space-2);display:grid;grid-template-columns:var(--ui-icon-size) minmax(0,1fr);gap:var(--space-2);border:0;border-bottom:1px solid var(--border-subtle);background:transparent;text-align:left;border-radius:var(--radius-control);}.guide-list button.active{background:var(--selection-bg);box-shadow:inset var(--space-0) 0 var(--accent)}.guide-list button.complete :deep(svg){color:var(--success)}.guide-list button span{min-width:0;display:grid;overflow-wrap:anywhere}.guide-list small{color:var(--text-muted);font-size:var(--type-caption)}
.guide-detail,.contract-view,.profile-view,.readiness-view{min-height:0;padding:var(--space-4);overflow:auto;flex:1}
.guide-detail>header,.contract-view>header,.profile-view>header,.readiness-view>header,.guide-detail>footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-2)}
h2{margin:var(--space-0) 0;font-size:var(--type-section)}h3{margin:0 0 var(--space-1);font-size:var(--type-section)}p,li{color:var(--text-secondary);line-height:var(--line-body)}small{color:var(--text-muted)}
.classification{margin:var(--space-2) 0;display:flex;flex-wrap:wrap;gap:var(--space-1)}.classification span{padding:var(--space-0) var(--space-1);background:var(--surface-2);color:var(--text-secondary);font-size:var(--type-caption)}
.guide-detail section{padding:var(--space-3) 0;border-top:1px solid var(--border-subtle)}.guide-detail ul,.guide-detail ol{padding-left:var(--space-4)}
.two-column,.api-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-4)}.expected{margin-top:var(--space-2);padding:var(--space-2);border-left:var(--space-0) solid var(--success);background:var(--surface-1)}.expected p{margin:var(--space-1) 0}.api-links code{display:block;padding:var(--space-2);background:var(--surface-1);overflow-wrap:anywhere}.guide-detail>footer label{display:flex;align-items:center;gap:var(--space-2)}
.contract-view>article{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,3fr) minmax(0,3fr) auto;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--border-subtle)}.contract-view>article>div{display:grid}.contract-view p{margin:0}.contract-view b{color:var(--success)}
.migration-matrix,.contract-decision,.readiness-catalog,.support-matrix,.qualification-targets{margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--border-subtle)}.migration-matrix p{display:grid;grid-template-columns:var(--ui-icon-size) minmax(0,1fr) minmax(0,4fr);gap:var(--space-2)}
.readiness-summary{margin:var(--space-3) 0;display:flex;flex-wrap:wrap;gap:var(--space-4)}.readiness-summary article{display:flex;gap:var(--space-1)}.readiness-summary strong{color:var(--accent)}
.contract-decision>div{display:flex;justify-content:space-between;gap:var(--space-2)}.contract-decision>div span{color:var(--warning)}
.readiness-catalog>header{display:flex;flex-wrap:wrap;gap:var(--space-2);align-items:center}.readiness-table{margin-top:var(--space-2);overflow:auto}.readiness-table article{padding:var(--space-2) 0;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:var(--space-1);border-bottom:1px solid var(--border-subtle)}.readiness-table article>div{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:var(--space-2)}.readiness-table article>span{display:flex;align-items:center;justify-content:space-between;gap:var(--space-1);font-size:var(--type-caption);color:var(--text-secondary);overflow-wrap:anywhere}.readiness-table :deep(svg){flex-shrink:0;color:var(--success)}.readiness-table .external :deep(svg){color:var(--warning)}.readiness-table .not-applicable :deep(svg){color:var(--text-muted)}
.support-matrix article{padding:var(--space-2) 0;border-bottom:1px solid var(--border-subtle)}.support-matrix article>div{display:flex;justify-content:space-between;gap:var(--space-2)}.support-matrix article span{color:var(--warning)}.support-matrix article .tier-1-local{color:var(--success)}
.profile-grid{display:flex;flex-direction:column;margin-top:var(--space-3)}.profile-grid button{height:auto;display:grid;grid-template-columns:var(--ui-icon-size) minmax(0,1fr);gap:var(--space-1) var(--space-2);padding:var(--space-3);text-align:left;border:0;border-bottom:1px solid var(--border-subtle);background:transparent;border-radius:var(--radius-control);}.profile-grid button.active{background:var(--selection-bg)}.profile-grid p,.profile-grid small{grid-column:2;margin:0}.qualification-targets{display:flex;flex-wrap:wrap;gap:var(--space-4)}.qualification-targets h3{flex-basis:100%}.qualification-targets div{display:grid}.qualification-targets span{color:var(--accent)}
@container(max-width:750px){.guide-layout{grid-template-columns:minmax(0,1fr) minmax(0,2fr)}.two-column,.api-links{grid-template-columns:1fr}.contract-view>article{grid-template-columns:minmax(0,1fr) minmax(0,3fr)}.readiness-table article{grid-template-columns:repeat(3,minmax(0,1fr))}}
@container(max-width:480px){.guide-layout{display:flex;flex-direction:column}.guide-catalog{flex:0 0 35%;border-right:0;border-bottom:1px solid var(--border-subtle)}.readiness-table article{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
