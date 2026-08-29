<template>
  <Transition name="onboarding">
    <div v-if="learning.onboardingVisible" ref="dialog" class="onboarding-scrim" role="dialog" aria-modal="true" tabindex="-1" :aria-labelledby="`onboarding-title-${learning.onboardingStep}`" @keydown="onKeyDown">
      <section class="onboarding-card">
        <header><span>Nova_A 6.0 · {{ t('firstRunOnboarding') }}</span><button :aria-label="t('close')" @click="finishCreatorOnboarding">×</button></header>
        <div class="step-visual" aria-hidden="true"><span>{{ current.icon }}</span><i v-for="(_, index) in steps" :key="index" :class="{ active: index <= learning.onboardingStep }"></i></div>
        <main>
          <small>{{ t('stepOf', { current: learning.onboardingStep + 1, total: steps.length }) }}</small>
          <h2 :id="`onboarding-title-${learning.onboardingStep}`">{{ t(current.title) }}</h2>
          <p>{{ t(current.description) }}</p>
          <ul><li v-for="item in current.points" :key="item">{{ t(item) }}</li></ul>
        </main>
        <footer><button :disabled="learning.onboardingStep === 0" @click="learning.onboardingStep--">{{ t('back') }}</button><button @click="finishCreatorOnboarding">{{ t('skipForNow') }}</button><button class="primary" @click="next">{{ t(learning.onboardingStep === steps.length - 1 ? 'startCreating' : 'next') }}</button></footer>
      </section>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { t } from '../i18n'
import { creatorLearningState as learning, finishCreatorOnboarding } from '../runtime/creatorLearning'
import { editorState } from '../store/editor'
type TranslationKey = Parameters<typeof t>[0]
const steps: ReadonlyArray<{ icon: string; title: TranslationKey; description: TranslationKey; points: TranslationKey[] }> = [
  { icon: '◇', title: 'onboardingChooseGoal', description: 'onboardingChooseGoalHint', points: ['onboardingTemplatePoint', 'onboardingGuidePoint', 'onboardingLocalPoint'] },
  { icon: '▣', title: 'onboardingUnderstandLayout', description: 'onboardingUnderstandLayoutHint', points: ['onboardingLeftPoint', 'onboardingCenterPoint', 'onboardingRightPoint', 'onboardingBottomPoint'] },
  { icon: '</>', title: 'onboardingCreateLogic', description: 'onboardingCreateLogicHint', points: ['onboardingRhaiPoint', 'onboardingGraphPoint', 'onboardingApiParityPoint'] },
  { icon: '◎', title: 'onboardingTestRecover', description: 'onboardingTestRecoverHint', points: ['onboardingPlayPoint', 'onboardingHealthPoint', 'onboardingRecoveryPoint'] },
  { icon: '▶', title: 'onboardingBuildShip', description: 'onboardingBuildShipHint', points: ['onboardingBuildPoint', 'onboardingEvidencePoint', 'onboardingExternalPoint'] }
]
const current = computed(() => steps[Math.min(steps.length - 1, Math.max(0, learning.onboardingStep))])
const dialog = ref<HTMLElement | null>(null)
watch(() => learning.onboardingVisible, visible => { if (visible) void nextTick(() => dialog.value?.focus()) }, { immediate: true })
function next(): void { if (learning.onboardingStep < steps.length - 1) learning.onboardingStep++; else { finishCreatorOnboarding(); editorState.activeWorkspace = 'manage'; editorState.currentPage = 'manage'; editorState.manageSection = 'learn' } }
function onKeyDown(event: KeyboardEvent): void { if (event.key === 'Escape') finishCreatorOnboarding(); else if (event.key === 'ArrowLeft' && learning.onboardingStep > 0) learning.onboardingStep--; else if (event.key === 'ArrowRight' || event.key === 'Enter') next(); else return; event.preventDefault() }
</script>

<style scoped>
.onboarding-scrim{position:fixed;inset:0;z-index:1600;padding:20px;display:grid;place-items:center;background:color-mix(in srgb,var(--scrim) 88%,transparent);backdrop-filter:blur(12px)}.onboarding-card{width:min(660px,100%);max-height:min(760px,calc(100vh - 40px));display:flex;flex-direction:column;overflow:auto;border:1px solid var(--border-strong);border-radius:22px;background:linear-gradient(145deg,var(--surface-1),var(--surface-2));box-shadow:var(--shadow-lg)}.onboarding-card>header{min-height:52px;padding:0 12px 0 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-subtle)}.onboarding-card>header span{color:var(--accent);font-size:var(--type-caption);font-weight:800;letter-spacing:.08em;text-transform:uppercase}.onboarding-card>header button{width:34px;height:34px;border:0;border-radius:50%;background:var(--surface-3);font-size:18px}.step-visual{min-height:140px;padding:26px 30px 18px;display:grid;grid-template-columns:repeat(5,1fr);align-items:end;gap:7px;background:radial-gradient(circle at 50% 0,color-mix(in srgb,var(--accent) 18%,transparent),transparent 64%)}.step-visual>span{grid-column:1/-1;justify-self:center;width:62px;height:62px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--accent) 55%,var(--border-subtle));border-radius:20px;color:var(--accent);background:var(--accent-soft);font:800 20px/1 var(--font-ui);box-shadow:0 16px 42px color-mix(in srgb,var(--accent) 20%,transparent)}.step-visual i{height:5px;border-radius:999px;background:var(--surface-3)}.step-visual i.active{background:var(--accent)}.onboarding-card>main{padding:22px 34px}.onboarding-card>main small{color:var(--accent);font-size:var(--type-caption);font-weight:700}.onboarding-card h2{margin:4px 0 8px;font-size:clamp(24px,4vw,34px);line-height:1.1}.onboarding-card p,.onboarding-card li{color:var(--text-muted);font-size:var(--type-body);line-height:1.6}.onboarding-card ul{padding-left:22px}.onboarding-card>footer{min-height:62px;padding:10px 16px;display:flex;gap:8px;justify-content:flex-end;border-top:1px solid var(--border-subtle)}.onboarding-card>footer button{min-height:38px;padding:0 14px;border:1px solid var(--border-subtle);border-radius:var(--radius-control);background:var(--surface-2)}.onboarding-card>footer .primary{border-color:var(--accent);background:var(--accent-soft)}.onboarding-enter-active,.onboarding-leave-active{transition:opacity 160ms ease}.onboarding-enter-active .onboarding-card,.onboarding-leave-active .onboarding-card{transition:transform 220ms cubic-bezier(.2,.8,.2,1),opacity 160ms ease}.onboarding-enter-from,.onboarding-leave-to{opacity:0}.onboarding-enter-from .onboarding-card,.onboarding-leave-to .onboarding-card{opacity:0;transform:translateY(10px) scale(.98)}@media(max-width:560px){.onboarding-card>main{padding:18px 22px}.step-visual{min-height:115px}.onboarding-card>footer{flex-wrap:wrap}.onboarding-card>footer button{flex:1}}@media(prefers-reduced-motion:reduce){.onboarding-enter-active,.onboarding-leave-active,.onboarding-enter-active .onboarding-card,.onboarding-leave-active .onboarding-card{transition:none}}
</style>
