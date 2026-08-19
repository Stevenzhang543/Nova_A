<template>
  <Teleport to="body">
    <section v-if="fault" class="fault-overlay" data-doc="manual/recovery" role="alertdialog" aria-modal="true" :aria-label="t('fatalErrorTitle')" @keydown.esc="dismissActiveFault">
      <article>
        <header><span>!</span><div><strong>{{ t('fatalErrorTitle') }}</strong><small>{{ t('fatalErrorContained') }}</small></div></header>
        <p>{{ fault.message }}</p><code>{{ fault.context }} · {{ timestamp }}</code>
        <details v-if="fault.stack"><summary>{{ t('technicalDetails') }}</summary><pre>{{ fault.stack }}</pre></details>
        <footer><button @click="copy">{{ copied ? t('copied') : t('copyDiagnostics') }}</button><button @click="download">{{ t('downloadDiagnostics') }}</button><button @click="dismissActiveFault">{{ t('continueSafely') }}</button><button class="primary" @click="safeRestart">{{ t('restartSafeMode') }}</button></footer>
      </article>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../i18n'
import { dismissActiveFault, faultCenterState, faultDiagnostics, reportRecoverableError } from '../runtime/faultCenter'
import { stableContractDiagnostics } from '../runtime/stableContracts'

const copied = ref(false)
const fault = computed(() => faultCenterState.activeFatal)
const timestamp = computed(() => fault.value ? new Date(fault.value.timestamp).toLocaleString() : '')
function diagnosticText(): string { return `${stableContractDiagnostics()}\n\n${faultDiagnostics()}` }
async function copy(): Promise<void> {
  try { await navigator.clipboard.writeText(diagnosticText()); copied.value = true; window.setTimeout(() => { copied.value = false }, 1_500) }
  catch (error) { reportRecoverableError(error, 'Copy diagnostics') }
}
function download(): void {
  const url = URL.createObjectURL(new Blob([diagnosticText()], { type: 'application/json' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `nova-a-diagnostics-${Date.now()}.json`; anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
function safeRestart(): void {
  const url = new URL(location.href); url.searchParams.set('safe-mode', '1'); url.searchParams.set('safe-layout', '1'); location.assign(url.toString())
}
</script>

<style scoped>
.fault-overlay{position:fixed;inset:0;z-index:9000;padding:20px;display:grid;place-items:center;background:var(--scrim);backdrop-filter:blur(10px)}article{width:min(680px,100%);max-height:min(680px,92vh);padding:18px;overflow:auto;border:1px solid var(--danger);border-radius:var(--radius-lg);background:var(--surface-1);box-shadow:var(--shadow-lg)}header{display:flex;align-items:center;gap:12px}header>span{width:38px;height:38px;display:grid;place-items:center;border-radius:11px;color:#fff;background:var(--danger);font-size:20px;font-weight:800}header div{display:grid;gap:3px}header strong{font-size:16px}header small,p,code,summary{font-size:12px;line-height:1.5}header small,code{color:var(--text-muted)}p{margin:16px 0 8px;overflow-wrap:anywhere}code{display:block}details{margin-top:12px}summary{cursor:pointer}pre{max-height:220px;padding:10px;overflow:auto;border-radius:8px;background:var(--bg-canvas);font:11px/1.5 ui-monospace,SFMono-Regular,Cascadia Code,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}footer{margin-top:16px;display:flex;justify-content:flex-end;flex-wrap:wrap;gap:7px}button{min-height:34px;padding:0 12px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-3)}button.primary{color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}
</style>
