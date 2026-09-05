<template>
  <section class="conversion-panel" :aria-label="copy.title" data-conversion-panel>
    <strong>{{ copy.title }}</strong>
    <dl class="conversion-counts">
      <div><dt>{{ copy.structural }}</dt><dd data-coverage="structural">{{ assessment.structural }}</dd></div>
      <div><dt>{{ copy.sourceBacked }}</dt><dd data-coverage="source-backed">{{ assessment.sourceBacked }}</dd></div>
      <div><dt>{{ copy.unpreservable }}</dt><dd data-coverage="unpreservable">{{ assessment.unpreservable }}</dd></div>
    </dl>
    <p>{{ copy.explanation }}</p>
    <p :class="['conversion-state', gate]" role="status">{{ gate === 'blocked' ? copy.blocked : gate === 'review' ? copy.review : copy.ready }}</p>
    <article v-for="(diagnostic, index) in assessment.diagnostics" :key="`${diagnostic.code}:${diagnostic.span.start}:${index}`" :class="['conversion-region', diagnostic.severity]">
      <strong>{{ diagnostic.code }} · {{ diagnostic.severity }}</strong><p>{{ diagnostic.message }}</p>
      <small>{{ location(diagnostic.span) }}</small>
      <div class="conversion-actions"><button @click="navigate('code', diagnostic)">{{ copy.code }}</button><button v-if="graphNavigationEnabled && (diagnostic.nodeUuid || regionAt(assessment,diagnostic.span)?.nodeUuid)" @click="navigate('graph', diagnostic)">{{ copy.graph }}</button></div>
    </article>
    <details :open="gate !== 'ready'">
      <summary>{{ copy.structural }} / {{ copy.sourceBacked }} · {{ assessment.regions.length }}</summary>
      <article v-for="region in regions.slice(0, limit)" :key="region.id" :class="['conversion-region', region.classification]" :data-conversion-region="region.classification">
        <strong>{{ region.kind }} · {{ classificationLabel(region.classification) }}</strong><small>{{ location(region.span) }}</small>
        <p v-if="region.reason">{{ region.reason }}</p><pre>{{ source.slice(region.span.start, region.span.end).slice(0, 600) }}{{ region.span.end-region.span.start > 600 ? '…' : '' }}</pre>
        <div class="conversion-actions"><button @click="navigate('code', region)">{{ copy.code }}</button><button v-if="graphNavigationEnabled && region.nodeUuid" @click="navigate('graph', region)">{{ copy.graph }}</button></div>
      </article>
      <button v-if="regions.length > limit" @click="limit += 60">{{ copy.more }} ({{ regions.length - limit }})</button>
      <p v-if="!regions.length">{{ copy.noRegions }}</p>
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SourceConversionAssessment } from '../visual/graphCodeSync'
import { preferencesState } from '../store/preferences'
import { conversionCopy, conversionGate, regionAt, type ConversionNavigation, type ConversionSpan } from '../editor/scriptConversionPresentation'
const props = withDefaults(defineProps<{ assessment: SourceConversionAssessment; source: string; graphNavigationEnabled?: boolean }>(), { graphNavigationEnabled:true })
const emit = defineEmits<{ navigate: [request: ConversionNavigation] }>()
const copy = computed(() => conversionCopy[preferencesState.locale]), gate = computed(() => conversionGate(props.assessment)), limit = ref(60)
const regions = computed(() => [...props.assessment.regions].sort((a, b) => Number(a.classification === 'structural') - Number(b.classification === 'structural') || a.span.start - b.span.start))
watch(() => props.source, () => { limit.value = 60 })
function location(span: ConversionSpan) { return `${span.line}:${span.column}–${span.endLine}:${span.endColumn}` }
function classificationLabel(kind: string) { return kind === 'structural' ? copy.value.structural : kind === 'source-backed' ? copy.value.sourceBacked : copy.value.unpreservable }
function navigate(target: 'code' | 'graph', item: { span: ConversionSpan; nodeUuid?: string; scopeUuid?: string }) { const region = item.nodeUuid ? item : regionAt(props.assessment,item.span); emit('navigate', { target, span: item.span, nodeUuid: region?.nodeUuid, scopeUuid: region?.scopeUuid }) }
</script>

<style scoped>
.conversion-panel{min-width:0;padding:12px;display:grid;gap:10px;color:var(--text-primary);font-size:12px}.conversion-panel p{margin:0;color:var(--text-muted);line-height:1.5;overflow-wrap:anywhere}.conversion-counts{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:6px;margin:0}.conversion-counts div{padding:8px;border:1px solid var(--border-subtle);border-radius:6px}.conversion-counts dt{font-size:11px;color:var(--text-muted);overflow-wrap:anywhere}.conversion-counts dd{margin:4px 0 0;font-weight:700}.conversion-panel .conversion-state{padding:8px;border-left:3px solid var(--accent);background:var(--surface-2)}.conversion-panel .conversion-state.blocked{border-color:var(--danger,#f87171)}.conversion-region{display:grid;gap:6px;margin:8px 0;padding:9px;border:1px solid var(--border-subtle);border-radius:6px;min-width:0}.conversion-region.source-backed{border-left:3px solid #d3a657}.conversion-region.unpreservable,.conversion-region.error{border-left:3px solid var(--danger,#f87171)}.conversion-region strong,.conversion-panel summary{overflow-wrap:anywhere;line-height:1.4}.conversion-region small{color:var(--text-muted)}.conversion-region pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:130px;overflow:auto;margin:0;padding:7px;background:var(--bg-canvas);font:11px/1.5 var(--font-mono)}.conversion-actions{display:flex;gap:6px;flex-wrap:wrap}.conversion-panel button{height:auto;min-height:28px;padding:5px 8px;white-space:normal;overflow-wrap:anywhere;text-align:left;border:1px solid var(--border-subtle);border-radius:5px;background:var(--surface-3);color:var(--text-primary)}.conversion-panel summary{cursor:pointer}
</style>
