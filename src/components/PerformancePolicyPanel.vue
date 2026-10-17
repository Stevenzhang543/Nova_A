<template>
  <section class="card performance-policy-panel" data-performance-policy="v1">
    <header><strong>{{ copy.title }}</strong><span>{{ budget.heavyJobAdmissionLimit }} {{ copy.admitted }}</span></header>
    <UiPropertyRow :label="copy.mode" stacked><select v-model="draft.experienceMode" @change="apply"><option value="balanced">{{ copy.balanced }}</option><option value="responsive">{{ copy.responsive }}</option><option value="quiet">{{ copy.quiet }}</option><option value="quality">{{ copy.quality }}</option></select></UiPropertyRow>
    <UiPropertyRow :label="copy.track" stacked><select v-model="draft.benchmarkMode" @change="apply"><option value="off">{{ copy.normal }}</option><option value="quality-locked">QualityLocked</option><option value="adaptive-experience">AdaptiveExperience</option></select></UiPropertyRow>
    <UiPropertyRow :label="copy.total" :help="copy.totalHelp" stacked><input v-model.number="draft.maxAuxiliaryHeavyJobs" type="number" min="0" max="8" @change="apply"></UiPropertyRow>
    <UiPropertyRow :label="copy.assets" stacked><input v-model.number="draft.maxAssetWorkers" type="number" min="1" max="4" @change="apply"></UiPropertyRow>
    <UiPropertyRow :label="copy.compute" stacked><input v-model.number="draft.maxComputeHelpers" type="number" min="0" max="8" @change="apply"></UiPropertyRow>
    <UiPropertyRow :label="copy.credits" :help="copy.creditHelp" stacked><input v-model.number="draft.maxSubmissionCredits" type="number" min="1" max="3" @change="apply"></UiPropertyRow>
    <dl><div><dt>{{ copy.active }}</dt><dd>{{ resources.activeHeavyJobs }}</dd></div><div><dt>{{ copy.queued }}</dt><dd>{{ resources.queued }}</dd></div><div><dt>{{ copy.bytes }}</dt><dd>{{ (resources.inputBytes / 1048576).toFixed(2) }} MiB</dd></div></dl>
    <p>{{ copy.preserved }}</p><p class="policy-status" role="status">{{ saved ? copy.saved : budget.reasonCodes.join(', ') }}</p>
  </section>
</template>
<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, shallowRef } from 'vue'
import UiPropertyRow from '../ui/components/UiPropertyRow.vue'
import { preferencesState } from '../store/preferences'
import { auxiliaryWork, performanceCoordinator } from '../runtime/performance/services'
import { configurePerformancePreferences } from '../platform/performanceHost'
const words = {
  en: { title: 'Shared performance policy', admitted: 'current heavy-task slots', mode: 'Experience', balanced: 'Balanced', responsive: 'Responsive', quiet: 'Quiet', quality: 'Quality', track: 'Benchmark track', normal: 'Normal use', total: 'Total auxiliary CPU limit', totalHelp: 'All asset and compute owners share this limit. Zero pauses optional work; required work can use the serial path.', assets: 'Asset worker limit', compute: 'Compute helper limit', credits: 'GPU submissions in flight', creditHelp: 'Bounded GPU command completion; this does not measure physical display latency.', active: 'Active auxiliary tasks', queued: 'Queued auxiliary tasks', bytes: 'Retained input reservations', preserved: 'Text, spacing, rounded panels and core motion stay unchanged. Scene quality tuning remains disabled until measured.', saved: 'Preference saved for this device.' },
  zh: { title: '统一性能策略', admitted: '个当前重任务名额', mode: '体验模式', balanced: '均衡', responsive: '响应优先', quiet: '安静', quality: '画质优先', track: '基准轨道', normal: '正常使用', total: '辅助 CPU 总额度', totalHelp: '资源与计算任务共享额度。设为零暂停可选工作，必需工作仍可串行完成。', assets: '资源 Worker 上限', compute: '计算助手上限', credits: '在途 GPU 提交上限', creditHelp: '限制尚未完成的 GPU 命令；此指标不是屏幕显示延迟。', active: '正在执行的辅助任务', queued: '等待中的辅助任务', bytes: '保留输入的字节预算', preserved: '字号、留白、圆角与核心动效保持不变。场景画质调优在取得测量依据前保持关闭。', saved: '已保存此设备的偏好。' },
  de: { title: 'Gemeinsame Leistungsrichtlinie', admitted: 'aktuelle Rechenplätze', mode: 'Erlebnis', balanced: 'Ausgewogen', responsive: 'Reaktionsschnell', quiet: 'Leise', quality: 'Qualität', track: 'Benchmark-Modus', normal: 'Normalbetrieb', total: 'CPU-Gesamtlimit für Hilfsaufgaben', totalHelp: 'Ressourcen und Berechnungen teilen dieses Limit. Null pausiert optionale Arbeit; notwendige Arbeit bleibt seriell möglich.', assets: 'Limit für Ressourcen-Worker', compute: 'Limit für Rechenhelfer', credits: 'Ausstehende GPU-Einreichungen', creditHelp: 'Begrenzt noch nicht abgeschlossene GPU-Befehle, keine gemessene Bildschirm-Latenz.', active: 'Aktive Hilfsaufgaben', queued: 'Wartende Hilfsaufgaben', bytes: 'Reservierte Eingabedaten', preserved: 'Schrift, Abstände, Rundungen und Kernbewegungen bleiben erhalten. Szenenqualität wird erst mit Messnachweisen angepasst.', saved: 'Einstellung auf diesem Gerät gespeichert.' }
}
const copy = computed(() => words[preferencesState.locale])
const draft = reactive({ ...performanceCoordinator.config })
const budget = shallowRef(performanceCoordinator.snapshot), resources = shallowRef(auxiliaryWork.state), saved = ref(false)
const update = () => { budget.value = performanceCoordinator.snapshot; resources.value = auxiliaryWork.state }
const stopBudget = performanceCoordinator.subscribe(update), stopWork = auxiliaryWork.subscribe(update)
onUnmounted(() => { stopBudget(); stopWork() })
function apply() { Object.assign(draft, configurePerformancePreferences(draft)); saved.value = true }
</script>
<style scoped>
.card.performance-policy-panel { display: flex; flex-direction: column; gap: var(--ui-field-gap); width: auto; margin: var(--ui-panel-gutter); padding: var(--ui-panel-inset); border: var(--ui-border-width) solid var(--border-subtle); border-radius: var(--radius-panel); background: var(--surface-panel); }
.performance-policy-panel > header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--ui-label-control-gap); line-height: var(--line-body); }
.performance-policy-panel > header strong { min-width: 0; overflow-wrap: anywhere; }
.performance-policy-panel > header span { color: var(--text-muted); font-size: var(--type-caption); }
.performance-policy-panel :deep(input), .performance-policy-panel :deep(select) { width: min(100%, var(--ui-field-width)); min-width: 0; }
.performance-policy-panel p { margin: 0; line-height: var(--line-body); }
.policy-status { color: var(--text-muted); font-size: var(--type-caption); }
</style>
