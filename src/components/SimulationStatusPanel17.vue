<!-- 仿真状态面板：展示运行状态并提供导航烘焙及原点移动。 -->
<template>
  <section class="simulation-status17" :aria-label="text('title')" data-audit="simulation-status17">
    <details>
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
<style scoped>
.simulation-status17{min-width:0;container-type:inline-size;padding:10px;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-1);color:var(--text-primary);font-size:inherit;line-height:1.5}
summary{cursor:pointer;font-weight:650;overflow-wrap:anywhere}h4{margin:12px 0 6px}.guide{color:var(--text-secondary);overflow-wrap:anywhere}p{margin:8px 0}dl{margin:8px 0;min-width:0}.observations{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr));gap:8px}.observations>div{padding:8px;background:var(--surface-2);border-radius:6px;min-width:0}dt{overflow-wrap:anywhere}dd{margin:4px 0 0;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}button{min-height:36px;padding:8px 12px;max-width:100%;white-space:normal;overflow-wrap:anywhere;border:1px solid var(--border-subtle);border-radius:7px;background:var(--surface-2);color:var(--text-primary);font:inherit}button:disabled{opacity:.55}button:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.status{display:flex;flex-wrap:wrap;gap:8px;overflow-wrap:anywhere}progress{width:100%;margin:8px 0}.error{color:var(--danger,#d95065);overflow-wrap:anywhere}.cells{list-style:none;padding:0;display:grid;gap:8px}.cells li{min-width:0;padding:8px;border:1px solid var(--border-subtle);border-radius:7px;display:flex;flex-wrap:wrap;gap:8px}.cells p{flex-basis:100%}
.simulation-status17>details>summary{position:sticky;top:-10px;z-index:1;margin-inline:-10px;padding:10px;background:var(--bg-base)}
</style>
