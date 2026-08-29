<template>
  <section class="learning-center" data-control-scope="creator-learning">
    <header class="learning-header">
      <div><span>{{ t('creatorLearning') }}</span><h2>{{ t('learnByBuilding') }}</h2><p>{{ t('creatorLearningHint') }}</p></div>
      <div class="learning-progress" role="status"><strong>{{ progress.completed }} / {{ progress.total }}</strong><progress :value="progress.completed" :max="progress.total"></progress><small>{{ Math.round(progress.ratio * 100) }}%</small></div>
      <button @click="restartCreatorOnboarding">{{ t('restartOnboarding') }}</button>
      <button @click="openBundledManual('v6-teaching')">{{ t('openTeachingManual') }}</button>
    </header>

    <nav class="learning-tabs" role="tablist" :aria-label="t('creatorLearning')">
      <button v-for="item in tabs" :key="item.id" role="tab" :aria-selected="activeTab === item.id" :class="{ active: activeTab === item.id }" @click="activeTab = item.id">{{ t(item.label) }}</button>
    </nav>

    <div v-if="activeTab === 'guides'" class="guide-layout">
      <aside class="guide-catalog">
        <input v-model="learning.query" type="search" :placeholder="t('searchEveryFeature')" :aria-label="t('searchEveryFeature')">
        <div class="catalog-filters"><select v-model="learning.panel" :aria-label="t('panel')"><option value="all">{{ t('allPanels') }}</option><option v-for="panel in panels" :key="panel" :value="panel">{{ panel }}</option></select><label><input v-model="learning.taskProjectsOnly" type="checkbox">{{ t('guidedProjectsOnly') }}</label></div>
        <div class="guide-list" role="listbox" :aria-label="t('featureGuides')">
          <button v-for="guide in guides" :key="guide.id" role="option" :aria-selected="learning.activeGuideId === guide.id" :class="{ active: learning.activeGuideId === guide.id, complete: learning.completed.includes(guide.id) }" @click="learning.activeGuideId = guide.id">
            <span aria-hidden="true">{{ learning.completed.includes(guide.id) ? '✓' : guide.taskProject ? '▶' : '○' }}</span><span><strong>{{ guide.feature }}</strong><small>{{ guide.panel }} · {{ guide.workspace }}</small></span>
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
      <header><div><span>{{ t('stableContractFreeze') }}</span><h2>Nova_A 6.0</h2></div><strong>{{ contracts.every(item => item.frozen) ? t('allContractsFrozen') : t('attentionRequired') }}</strong></header>
      <article v-for="contract in contracts" :key="contract.id"><div><span>{{ contract.id }}</span><strong>v{{ contract.version }}</strong></div><p>{{ contract.compatibility }}</p><small>{{ contract.migration }}</small><b>{{ contract.frozen ? t('frozen') : t('development') }}</b></article>
      <section class="migration-matrix"><h3>{{ t('migrationMatrix') }}</h3><p v-for="check in matrix" :key="check.contract"><span>{{ check.supported ? '✓' : '!' }}</span><strong>{{ check.contract }}</strong><small>{{ check.message }}</small></p></section>
    </div>

    <div v-else class="profile-view">
      <header><div><span>{{ t('performanceProfiles') }}</span><h2>{{ t('chooseEditorProfile') }}</h2></div><p>{{ t('profileDoesNotChangeGame') }}</p></header>
      <div class="profile-grid"><button v-for="profile in profiles" :key="profile.id" :class="{ active: prefs.performanceProfile === profile.id }" @click="applyCreatorPerformanceProfile(profile.id)"><span>{{ prefs.performanceProfile === profile.id ? '✓' : '○' }}</span><strong>{{ profile.label }}</strong><p>{{ profile.description }}</p><small>DPI {{ profile.maximumPixelRatio }}× · {{ profile.hierarchyPerformanceMode ? t('boundedViewportSampling') : t('fullViewportSampling') }}</small></button></div>
      <section class="qualification-targets"><h3>{{ t('qualificationTargets') }}</h3><div><span>10,000</span><small>{{ t('hierarchyObjects') }}</small></div><div><span>50,000</span><small>{{ t('assetRecords') }}</small></div><div><span>1,000</span><small>{{ t('graphNodes') }}</small></div><div><span>60 Hz</span><small>{{ t('fixedRuntimeEvidence') }}</small></div></section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../i18n'
import { editorState } from '../store/editor'
import { preferencesState as prefs } from '../store/preferences'
import { openBundledManual } from '../runtime/openManual'
import { NOVA_STABLE_CONTRACTS, stableContractMatrix } from '../runtime/stableContracts'
import { CREATOR_LEARNING_GUIDES, CREATOR_PERFORMANCE_PROFILES, applyCreatorPerformanceProfile, completeLearningGuide, creatorLearningProgress, creatorLearningState as learning, filteredCreatorGuides, localizedLearningGuide, restartCreatorOnboarding, type LearningGuide } from '../runtime/creatorLearning'

type TranslationKey = Parameters<typeof t>[0]
const tabs: ReadonlyArray<{ id: 'guides' | 'contracts' | 'profiles'; label: TranslationKey }> = [{ id: 'guides', label: 'featureGuides' }, { id: 'contracts', label: 'stableContracts' }, { id: 'profiles', label: 'performanceProfiles' }]
const activeTab = ref<'guides' | 'contracts' | 'profiles'>('guides')
const progress = creatorLearningProgress, guides = filteredCreatorGuides, contracts = NOVA_STABLE_CONTRACTS, matrix = stableContractMatrix()
const panels = [...new Set(CREATOR_LEARNING_GUIDES.map(guide => guide.panel))].sort()
const profiles = Object.values(CREATOR_PERFORMANCE_PROFILES)
const activeGuide = computed(() => CREATOR_LEARNING_GUIDES.find(guide => guide.id === learning.activeGuideId) ?? guides.value[0] ?? null)
const localized = computed(() => activeGuide.value ? localizedLearningGuide(activeGuide.value, prefs.locale) : null)

function openGuideWorkspace(guide: LearningGuide): void {
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
.learning-center{height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;color:var(--text-primary);background:var(--bg-base)}
.learning-header{min-height:88px;padding:12px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border-subtle);background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 8%,var(--surface-1)),var(--surface-1))}.learning-header>div:first-child{min-width:220px;flex:1}.learning-header span,.contract-view header span,.profile-view header span{color:var(--accent);font-size:var(--type-caption);font-weight:800;text-transform:uppercase;letter-spacing:.08em}.learning-header h2,.guide-detail h2,.contract-view h2,.profile-view h2{margin:1px 0;font-size:var(--type-page);line-height:var(--line-page)}.learning-header p,.profile-view header p{margin:0;color:var(--text-muted);font-size:var(--type-dense)}.learning-progress{width:150px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:6px}.learning-progress progress{width:100%;height:6px}.learning-progress small{color:var(--text-muted)}.learning-header>button{min-height:34px;padding:0 10px;border:1px solid var(--border-subtle);border-radius:var(--radius-control);background:var(--surface-2)}
.learning-tabs{min-height:42px;padding:5px 12px;display:flex;gap:5px;border-bottom:1px solid var(--border-subtle);background:var(--surface-1)}.learning-tabs button{padding:0 12px;border:1px solid transparent;border-radius:var(--radius-control);background:transparent}.learning-tabs button.active{border-color:var(--accent);background:var(--accent-soft)}
.guide-layout{min-height:0;flex:1;display:grid;grid-template-columns:minmax(250px,320px) minmax(0,1fr)}.guide-catalog{min-height:0;padding:10px;display:flex;flex-direction:column;gap:8px;border-right:1px solid var(--border-subtle);background:var(--surface-1)}.guide-catalog>input,.catalog-filters select{width:100%;min-height:34px}.catalog-filters{display:grid;gap:6px}.catalog-filters label{display:flex;align-items:center;gap:6px;color:var(--text-muted);font-size:var(--type-dense)}.guide-list{min-height:0;display:flex;flex-direction:column;gap:3px;overflow:auto}.guide-list button{min-height:48px;padding:5px 8px;display:grid;grid-template-columns:20px minmax(0,1fr);align-items:center;gap:6px;border:1px solid transparent;border-radius:var(--radius-control);background:transparent;text-align:left}.guide-list button:hover{background:var(--surface-hover)}.guide-list button.active{border-color:var(--accent);background:var(--selection-bg)}.guide-list button.complete>span:first-child{color:var(--success)}.guide-list button span:last-child{min-width:0;display:grid}.guide-list strong,.guide-list small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.guide-list small{color:var(--text-muted);font-size:var(--type-caption)}
.guide-detail{min-height:0;padding:18px clamp(16px,3vw,32px) 32px;overflow:auto}.guide-detail>header{display:flex;align-items:center;justify-content:space-between;gap:12px}.guide-detail>header span{color:var(--accent);font-size:var(--type-caption)}.primary{border-color:var(--accent)!important;background:var(--accent-soft)!important}.classification{margin:10px 0;display:flex;flex-wrap:wrap;gap:5px}.classification span{padding:3px 7px;border:1px solid var(--border-subtle);border-radius:999px;background:var(--surface-2);color:var(--text-secondary);font-size:var(--type-caption)}.guide-detail section{padding:12px 0;border-top:1px solid var(--border-subtle)}.guide-detail h3{margin:0 0 5px;font-size:var(--type-section)}.guide-detail p,.guide-detail li{color:var(--text-muted);font-size:var(--type-body);line-height:1.55}.guide-detail ol,.guide-detail ul{margin:6px 0;padding-left:22px}.two-column,.api-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.expected{margin-top:10px;padding:9px 11px;border-left:3px solid var(--success);border-radius:var(--radius-control);background:color-mix(in srgb,var(--success) 8%,var(--surface-2))}.expected p{margin:3px 0}.api-links code{display:block;padding:8px;overflow:auto;border-radius:var(--radius-control);background:var(--surface-2);white-space:normal}.guide-detail>footer{display:flex;align-items:center;justify-content:space-between;gap:8px}.guide-detail>footer label{display:flex;align-items:center;gap:7px;font-weight:700}
.contract-view,.profile-view{min-height:0;padding:18px clamp(16px,3vw,34px) 34px;overflow:auto}.contract-view>header,.profile-view>header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:12px}.contract-view>article{display:grid;grid-template-columns:120px minmax(240px,1fr) minmax(280px,1.2fr) auto;align-items:center;gap:12px;padding:12px;border-top:1px solid var(--border-subtle)}.contract-view>article>div{display:grid}.contract-view>article p,.contract-view>article small{margin:0;color:var(--text-muted)}.contract-view>article b{color:var(--success)}.migration-matrix{margin-top:16px;padding:12px;border:1px solid var(--border-subtle);border-radius:var(--radius-panel);background:var(--surface-1)}.migration-matrix p{display:grid;grid-template-columns:20px 90px 1fr;gap:8px}.migration-matrix span{color:var(--success)}
.profile-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.profile-grid button{min-height:160px;padding:14px;display:grid;align-content:start;gap:6px;border:1px solid var(--border-subtle);border-radius:var(--radius-panel);background:var(--surface-1);text-align:left}.profile-grid button.active{border-color:var(--accent);background:var(--selection-bg)}.profile-grid button>span{color:var(--accent);font-size:20px}.profile-grid p{margin:0;color:var(--text-muted)}.profile-grid small{color:var(--text-secondary)}.qualification-targets{margin-top:14px;padding:14px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;border:1px solid var(--border-subtle);border-radius:var(--radius-panel);background:var(--surface-1)}.qualification-targets h3{grid-column:1/-1;margin:0}.qualification-targets div{padding:10px;border-radius:var(--radius-control);background:var(--surface-2)}.qualification-targets span{display:block;color:var(--accent);font-size:20px;font-weight:800}.qualification-targets small{color:var(--text-muted)}
@media(max-width:900px){.learning-header{align-items:flex-start;flex-wrap:wrap}.learning-progress{margin-left:auto}.guide-layout{grid-template-columns:minmax(220px,36%) minmax(0,1fr)}.contract-view>article{grid-template-columns:90px 1fr}.contract-view>article small,.contract-view>article b{grid-column:2}.profile-grid{grid-template-columns:1fr}.qualification-targets{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:650px){.guide-layout{display:flex;flex-direction:column}.guide-catalog{max-height:38%;border-right:0;border-bottom:1px solid var(--border-subtle)}.two-column,.api-links{grid-template-columns:1fr}.learning-header>button{flex:1}.contract-view>article{grid-template-columns:1fr}.contract-view>article small,.contract-view>article b{grid-column:1}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
</style>
