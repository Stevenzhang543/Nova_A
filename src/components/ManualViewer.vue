<template>
  <Teleport to="body">
    <section v-if="state.visible" class="manual-viewer" role="dialog" aria-modal="true" :aria-label="t('manual')" @keydown.esc="closeBundledManual">
      <header><div><strong>{{ t('manual') }}</strong><span>{{ t('bundledManual') }}</span></div><nav><button @click="reloadBundledManual">{{ t('reload') }}</button><button class="close" :title="t('close')" @click="closeBundledManual">×</button></nav></header>
      <iframe :key="state.reloadToken" :src="manualSource" :title="t('manual')" @load="loaded = true"></iframe>
      <div v-if="!loaded" class="manual-loading">{{ t('loadingManual') }}</div>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { t } from '../i18n'
import { closeBundledManual, manualViewerState as state, reloadBundledManual } from '../runtime/openManual'

const loaded = ref(false)
const manualSource = computed(() => `./manual/index.html${state.section ? `#${state.section}` : ''}`)
watch(() => state.reloadToken, () => { loaded.value = false })
</script>

<style scoped>
.manual-viewer{position:fixed;inset:12px;z-index:5000;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--border-strong);border-radius:16px;background:var(--surface-1);box-shadow:var(--shadow-lg)}.manual-viewer>header{min-height:46px;padding:6px 9px 6px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-subtle);background:var(--surface-2)}.manual-viewer>header div{display:flex;align-items:baseline;gap:9px}.manual-viewer strong{font-size:13px}.manual-viewer span{color:var(--text-muted);font-size:11px}.manual-viewer nav{display:flex;gap:5px}.manual-viewer button{min-height:30px;padding:0 10px;border:1px solid var(--border-subtle);border-radius:7px;color:var(--text-secondary);background:var(--surface-3);font-size:11px}.manual-viewer button.close{width:30px;padding:0;color:var(--danger)}.manual-viewer iframe{min-width:0;min-height:0;flex:1;border:0;background:#11151b}.manual-loading{position:absolute;inset:47px 0 0;display:grid;place-items:center;color:var(--text-muted);background:var(--surface-1)}@media(max-width:720px){.manual-viewer{inset:4px;border-radius:10px}.manual-viewer span{display:none}}
</style>
