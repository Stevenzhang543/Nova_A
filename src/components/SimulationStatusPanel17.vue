<!-- 仿真状态面板：展示运行状态并提供导航烘焙及原点移动。 -->
<template>
  <section class="simulation-status17" :aria-label="text('title')" data-audit="simulation-status17">
    <details data-ui-motion-disclosure>
      <summary>{{ text('title') }}</summary>
      <p class="guide"><strong>{{ text('authored') }}.</strong> {{ text('authoredHint') }}</p>
      <h4>{{ text('runtime') }}</h4>
      <dl class="observations">
        <div><dt>{{ text('bodies') }}</dt><dd>{{ physicsState.engineDiagnostics.bodyCount }}</dd></div>
        <div><dt>{{ text('builds') }}</dt><dd>{{ physicsState.engineDiagnostics.configurationRebuilds }}</dd></div>
        <div><dt>{{ text('query') }}</dt><dd>{{ navigationProfile.lastQueryMilliseconds.toFixed(3) }}</dd></div>
        <div><dt>{{ text('loaded') }}</dt><dd>{{ streams.loaded }} / {{ streams.active }}</dd></div>
        <div><dt>{{ text('memory') }}</dt><dd>{{ streams.memoryMb.toFixed(2) }}</dd></div>
        <div><dt>{{ text('trace') }}</dt><dd>{{ ai.recordedTraces }} / {{ ai.skippedTraces }}</dd></div>
      </dl>
      <div class="status" role="status" aria-live="polite">
        {{ bake.error || (bake.active ? text('baking') : bake.cancelled ? text('cancelled') : text('ready')) }}
        <span>{{ bake.regions }} / {{ bake.cells }} {{ text('cells') }}</span>
      </div>
      <progress v-if="bake.active" :value="bake.progress" max="1" :aria-label="text('baking')" />
      <div class="actions"><button :disabled="bake.active" @click="requestBake">{{ text('bake') }}</button><button :disabled="!bake.active" @click="cancelNavigationBake">{{ text('cancel') }}</button><button :disabled="streams.pending === 0" @click="cancelWorldStreaming()">{{ text('cancelStreams') }}</button><button @click="retryWorldStreaming()">{{ text('retry') }}</button></div>
      <p class="guide">{{ text('repair') }}</p>
      <dl><dt>{{ text('origin') }}</dt><dd>{{ world.originOffset.x.toFixed(3) }}, {{ world.originOffset.y.toFixed(3) }}</dd></dl>
      <button :disabled="physicsState.playMode === 'editing' || !selected" @click="shift">{{ text('shift') }}</button><p class="guide">{{ text('shiftHint') }}</p>
      <p v-if="error || world.lastError" class="error" role="alert">{{ error || world.lastError }}</p>
      <ul v-if="streams.cells.length" class="cells"><li v-for="cell in streams.cells.slice(0, 64)" :key="cell.entityUuid"><strong>{{ cell.entityUuid.slice(0, 8) }} · {{ cell.status }}</strong><span>{{ cell.memoryMb.toFixed(2) }} MiB</span><p v-if="cell.error" class="error">{{ cell.error }}</p><button v-if="cell.error" @click="retryWorldStreaming(cell.entityUuid)">{{ text('retry') }}</button></li></ul>
      <p v-if="streams.cells.length > 64">{{ text('more') }}</p>
    </details>
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { simulationLabel17 as text } from '../editor/simulationLabels17'
import { physicsState } from '../store/physics'
import { aiDebugState as ai } from '../runtime/aiTools'
import { navigationBakeState as bake, navigationProfile, requestNavigationBake, cancelNavigationBake } from '../runtime/navigation2d'
import { worldStreamingState as streams, cancelWorldStreaming, retryWorldStreaming } from '../runtime/worldStreaming'
import { worldGameplayState as world, shiftWorldOrigin } from '../runtime/worldGameplay'
import { worldTransform } from '../world/hierarchy'
const error = ref(''), selected = computed(/** 取得选中世界实体供原点操作使用。 */ () => physicsState.world.entities.find(/* 比较 entity.id 与 physicsState.selectedEntityId，返回严格相等的判断结果。 */ entity => entity.id === physicsState.selectedEntityId))
/** 请求世界导航烘焙，清除旧错误并显示本次失败。 */ async function requestBake(): Promise<void> { try { error.value = ''; await requestNavigationBake(physicsState.world.entities) } catch (failure) { error.value = String(failure) } }
/** 仅在运行且有选中实体时将原点移至其世界位置，失败显示错误。 */ function shift(): void { if (!selected.value || physicsState.playMode === 'editing') return; try { error.value = ''; shiftWorldOrigin(worldTransform(selected.value, physicsState.world.entities).position) } catch (failure) { error.value = String(failure) } }
</script>
<style scoped>.simulation-status17{min-width:0;border-top:1px solid var(--border-subtle);padding-block:var(--ui-space-sm)}h4{margin:var(--ui-space-sm) 0}.guide{color:var(--text-muted);overflow-wrap:anywhere}p,dl{margin-block:var(--ui-space-sm)}.observations{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(18ch,100%),1fr));gap:var(--ui-space-sm)}.observations>div{border-bottom:1px solid var(--border-subtle);padding-block:var(--ui-space-xs);min-width:0}dt{overflow-wrap:anywhere;color:var(--text-muted);font-size:var(--type-caption)}dd{margin:var(--ui-space-xs) 0;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.actions,.status{display:flex;flex-wrap:wrap;gap:var(--ui-control-gap)}progress{width:100%}.error{color:var(--danger);overflow-wrap:anywhere}.cells{list-style:none;padding:0;display:grid;gap:var(--ui-space-xs)}.cells li{min-width:0;padding-block:var(--ui-space-sm);border-bottom:1px solid var(--border-subtle);display:flex;flex-wrap:wrap;gap:var(--ui-space-xs)}.cells p{flex-basis:100%}</style>
