<template>
  <Teleport to="body">
    <section v-if="state.visible" class="studio-overlay" role="dialog" aria-modal="true" :aria-label="t('studioStatus')" @keydown.esc="closeStudioStatus">
      <article>
        <header><div><strong>Nova_A Studio 3.0.0</strong><small>{{ t('stableContractHint') }}</small></div><button :title="t('close')" @click="closeStudioStatus">×</button></header>
        <div class="contracts"><section v-for="contract in NOVA_STABLE_CONTRACTS" :key="contract.id"><span>{{ t(`contract_${contract.id}`) }}</span><strong>v{{ contract.version }}</strong><small>{{ contract.compatibility }}</small></section></div>
        <aside><strong>{{ t('compatibilityPromise') }}</strong><p>{{ t('compatibilityPromiseHint') }}</p></aside>
        <footer><button @click="copy">{{ copied ? t('copied') : t('copyDiagnostics') }}</button><button @click="openManual">{{ t('manual') }}</button><button class="primary" @click="closeStudioStatus">{{ t('done') }}</button></footer>
      </article>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { t } from '../i18n'
import { reportRecoverableError } from '../runtime/faultCenter'
import { openBundledManual } from '../runtime/openManual'
import { closeStudioStatus, NOVA_STABLE_CONTRACTS, stableContractDiagnostics, studioStatusState as state } from '../runtime/stableContracts'
const copied = ref(false)
async function copy(): Promise<void> { try { await navigator.clipboard.writeText(stableContractDiagnostics()); copied.value = true; window.setTimeout(() => { copied.value = false }, 1_500) } catch (error) { reportRecoverableError(error, 'Copy Studio diagnostics') } }
function openManual(): void { closeStudioStatus(); void openBundledManual() }
</script>

<style scoped>
.studio-overlay{position:fixed;inset:0;z-index:8000;padding:20px;display:grid;place-items:center;background:var(--scrim);backdrop-filter:blur(10px)}article{width:min(760px,100%);max-height:92vh;padding:16px;overflow:auto;border:1px solid var(--border-strong);border-radius:var(--radius-lg);background:var(--surface-1);box-shadow:var(--shadow-lg)}header{display:flex;align-items:center;justify-content:space-between;gap:12px}header div{display:grid;gap:3px}header strong{font-size:17px}header small,.contracts small,aside p{color:var(--text-muted);font-size:12px;line-height:1.5}header button{width:34px;height:34px;border:1px solid var(--border-subtle);border-radius:8px;color:var(--danger);background:var(--surface-3)}.contracts{margin:14px 0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.contracts section{min-width:0;padding:10px;display:grid;grid-template-columns:1fr auto;gap:3px 8px;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-2)}.contracts section>span{font-size:12px}.contracts section>strong{color:var(--accent);font-size:12px}.contracts small{grid-column:1/-1}aside{padding:11px;border-radius:10px;background:var(--accent-soft)}aside strong{font-size:13px}aside p{margin:5px 0 0}footer{margin-top:14px;display:flex;justify-content:flex-end;gap:7px}footer button{min-height:34px;padding:0 12px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-3)}footer button.primary{color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}@media(max-width:600px){.contracts{grid-template-columns:1fr}footer{flex-wrap:wrap}}
</style>
