<!-- 创作者引导：管理步骤、焦点、键盘翻页及学习入口。 -->
<template>
  <UiMotionTransition modal>
    <div v-if="learning.onboardingVisible" ref="dialog" class="onboarding-scrim" role="dialog" aria-modal="true" v-modal-focus tabindex="-1" :aria-labelledby="`onboarding-title-${learning.onboardingStep}`" @keydown="onKeyDown">
      <section class="onboarding-card">
        <header><span>Nova_A {{ NOVA_RELEASE_NAME }} · {{ t('firstRunOnboarding') }}</span><UiButton icon="close" :label="t('close')" @click="finishCreatorOnboarding" /></header>
        <div class="step-visual" aria-hidden="true"><EditorIcon :name="current.icon" /><i v-for="(_, index) in steps" :key="index" :class="{ active: index <= learning.onboardingStep }"></i></div>
        <main data-ui-motion-surface="smooth" :data-ui-motion-key="learning.onboardingStep">
          <small>{{ t('stepOf', { current: learning.onboardingStep + 1, total: steps.length }) }}</small>
          <h2 :id="`onboarding-title-${learning.onboardingStep}`">{{ t(current.title) }}</h2>
          <p>{{ t(current.description) }}</p>
          <ul><li v-for="item in current.points" :key="item">{{ t(item) }}</li></ul>
        </main>
        <footer><button :disabled="learning.onboardingStep === 0" @click="learning.onboardingStep--">{{ t('back') }}</button><button @click="finishCreatorOnboarding">{{ t('skipForNow') }}</button><button class="primary" @click="next">{{ t(learning.onboardingStep === steps.length - 1 ? 'startCreating' : 'next') }}</button></footer>
      </section>
    </div>
  </UiMotionTransition>
</template>

<script setup lang="ts">
import EditorIcon, { type EditorIconName } from './EditorIcon.vue'
import UiMotionTransition from '../ui/components/UiMotionTransition.vue'
import UiButton from '../ui/components/UiButton.vue'
import { vModalFocus } from '../editor/modalFocus'
import { computed, nextTick, ref, watch } from 'vue'
import { t } from '../i18n'
import { creatorLearningState as learning, finishCreatorOnboarding } from '../runtime/creatorLearning'
import { editorState } from '../store/editor'
import { NOVA_RELEASE_NAME } from '../projects/projectFormat'
type TranslationKey = Parameters<typeof t>[0]
const steps: ReadonlyArray<{ icon: EditorIconName; title: TranslationKey; description: TranslationKey; points: TranslationKey[] }> = [
  { icon: 'design', title: 'onboardingChooseGoal', description: 'onboardingChooseGoalHint', points: ['onboardingTemplatePoint', 'onboardingGuidePoint', 'onboardingLocalPoint'] },
  { icon: 'layout', title: 'onboardingUnderstandLayout', description: 'onboardingUnderstandLayoutHint', points: ['onboardingLeftPoint', 'onboardingCenterPoint', 'onboardingRightPoint', 'onboardingBottomPoint'] },
  { icon: 'code', title: 'onboardingCreateLogic', description: 'onboardingCreateLogicHint', points: ['onboardingRhaiPoint', 'onboardingGraphPoint', 'onboardingApiParityPoint'] },
  { icon: 'physics', title: 'onboardingTestRecover', description: 'onboardingTestRecoverHint', points: ['onboardingPlayPoint', 'onboardingHealthPoint', 'onboardingRecoveryPoint'] },
  { icon: 'build', title: 'onboardingBuildShip', description: 'onboardingBuildShipHint', points: ['onboardingBuildPoint', 'onboardingEvidencePoint', 'onboardingExternalPoint'] }
]
const current = computed(/* 返回 steps[Math.min(steps.length - 1, Math.max(0, learning.onboardingStep))] 的当前值。 */ () => steps[Math.min(steps.length - 1, Math.max(0, learning.onboardingStep))])
const dialog = ref<HTMLElement | null>(null)
watch(/* 返回 learning.onboardingVisible 的当前值。 */ () => learning.onboardingVisible, /** 引导显示时等待 DOM 更新后聚焦对话框。 */ visible => { if (visible) void nextTick(/** 对话框存在时设置键盘焦点。 */ () => dialog.value?.focus()) }, { immediate: true })
/** 推进引导步骤，最后一步结束引导并打开管理工作区学习栏目。 */ function next(): void { if (learning.onboardingStep < steps.length - 1) learning.onboardingStep++; else { finishCreatorOnboarding(); editorState.activeWorkspace = 'manage'; editorState.currentPage = 'manage'; editorState.manageSection = 'learn' } }
/** 处理未消费的退出键及根容器翻页键，阻止已处理事件继续传播。 */ function onKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented) return
  if (event.key !== 'Escape' && event.target !== event.currentTarget) return
  if (event.key === 'Escape') finishCreatorOnboarding()
  else if (event.key === 'ArrowLeft' && learning.onboardingStep > 0) learning.onboardingStep--
  else if (event.key === 'ArrowRight' || event.key === 'Enter') next()
  else return
  event.preventDefault(); event.stopPropagation()
}
</script>

<style scoped>.onboarding-scrim{position:fixed;inset:0;z-index:1600;display:grid;place-items:center;padding:var(--ui-space-xl);background:var(--scrim)}.onboarding-card{width:min(72ch,100%);max-height:calc(100vh - 2 * var(--ui-space-xl));overflow:auto;background:var(--surface-1);border:1px solid var(--border-strong);border-radius:var(--radius-dialog);box-shadow:var(--shadow-lg)}.onboarding-card>header{display:flex;align-items:center;justify-content:space-between;gap:var(--ui-space-sm);padding:var(--ui-space-sm);border-bottom:1px solid var(--border-subtle)}.onboarding-card>header>span{font-size:var(--type-caption);color:var(--text-muted)}.step-visual{display:flex;align-items:center;gap:var(--ui-space-xs);padding:var(--ui-space-lg);color:var(--accent)}.step-visual i{height:var(--ui-space-xs);flex:1;background:var(--border-subtle)}.step-visual i.active{background:var(--accent)}main{padding:0 var(--ui-space-lg) var(--ui-space-lg)}main small{color:var(--text-muted);font-size:var(--type-caption)}main h2{font-size:var(--type-page)}main p,main li{color:var(--text-secondary);line-height:var(--line-body)}footer{display:flex;justify-content:flex-end;gap:var(--ui-space-xs);flex-wrap:wrap;padding:var(--ui-space-sm);border-top:1px solid var(--border-subtle)}</style>
