<!-- 故障恢复提示：显示受控错误，提供诊断复制、下载和安全重启。 -->
<template>
  <Teleport to="body">
    <UiMotionTransition modal><UiDialog motion-owner="parent" role="alertdialog" v-if="fault" :title="t('fatalErrorTitle')" @close="dismissActiveFault"><p class="dialog-hint">{{ t('fatalErrorContained') }}</p>
        <p>{{ fault.message }}</p><code>{{ fault.context }} · {{ timestamp }}</code>
        <details data-ui-motion-disclosure v-if="fault.stack"><summary>{{ t('technicalDetails') }}</summary><pre>{{ fault.stack }}</pre></details>
        <footer><button @click="copy">{{ copied ? t('copied') : t('copyDiagnostics') }}</button><button @click="download">{{ t('downloadDiagnostics') }}</button><button @click="dismissActiveFault">{{ t('continueSafely') }}</button><button class="primary" @click="safeRestart">{{ t('restartSafeMode') }}</button></footer>
    </UiDialog></UiMotionTransition>
  </Teleport>
</template>

<script setup lang="ts">
import UiMotionTransition from '../ui/components/UiMotionTransition.vue'

import UiDialog from '../ui/components/UiDialog.vue'
import { computed, ref } from 'vue'
import { t } from '../i18n'
import { dismissActiveFault, faultCenterState, faultDiagnostics, reportRecoverableError } from '../runtime/faultCenter'
import { stableContractDiagnostics } from '../runtime/stableContracts'

const copied = ref(false)
const fault = computed(/* 返回 faultCenterState.activeFatal 的当前值。 */ () => faultCenterState.activeFatal)
const timestamp = computed(/** 将当前故障时间转换为本地日期时间，无故障时返回空文本。 */ () => fault.value ? new Date(fault.value.timestamp).toLocaleString() : '')
/** 合并稳定契约诊断和故障诊断作为统一导出内容。 */ function diagnosticText(): string { return `${stableContractDiagnostics()}\n\n${faultDiagnostics()}` }
/** 复制诊断并短暂提示成功，剪贴板异常交给可恢复错误中心。 */ async function copy(): Promise<void> {
  try { await navigator.clipboard.writeText(diagnosticText()); copied.value = true; window.setTimeout(/** 提示到期后恢复未复制状态。 */ () => { copied.value = false }, 1_500) }
  catch (error) { reportRecoverableError(error, 'Copy diagnostics') }
}
/** 生成诊断下载链接并触发下载，稍后释放对象地址。 */ function download(): void {
  const url = URL.createObjectURL(new Blob([diagnosticText()], { type: 'application/json' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `nova-a-diagnostics-${Date.now()}.json`; anchor.click()
  window.setTimeout(/** 下载触发后释放临时对象地址。 */ () => URL.revokeObjectURL(url), 0)
}
/** 保留当前地址，附加安全模式及安全布局参数后重启。 */ function safeRestart(): void {
  const url = new URL(location.href); url.searchParams.set('safe-mode', '1'); url.searchParams.set('safe-layout', '1'); location.assign(url.toString())
}
</script>

<style scoped>.dialog-hint{color:var(--text-muted);margin:0 0 var(--ui-space-sm)}p,code{overflow-wrap:anywhere}pre{max-height:40vh;overflow:auto;padding:var(--ui-space-sm);background:var(--input-bg);white-space:pre-wrap;overflow-wrap:anywhere;font:var(--type-caption)/var(--line-body) var(--font-mono)}footer{display:flex;gap:var(--ui-space-xs);flex-wrap:wrap;justify-content:flex-end;border-top:1px solid var(--border-subtle);padding-top:var(--ui-space-sm)}.recovery-layout{display:grid;grid-template-columns:minmax(18ch,30%) minmax(0,1fr);gap:var(--ui-space-sm)}.recovery-layout>nav{display:flex;flex-direction:column;max-height:50vh;overflow:auto;border-right:1px solid var(--border-subtle);padding-right:var(--ui-space-sm)}.recovery-layout>nav button{display:grid;gap:var(--ui-space-xs);text-align:left;flex:none;border-color:transparent;border-radius:0;background:transparent;padding:var(--ui-space-sm)}.recovery-layout>nav button.active{background:var(--selection-bg)}.recovery-layout small,.recovery-layout dt{color:var(--text-muted)}.recovery-layout main{min-width:0}.recovery-layout dl{display:grid;gap:var(--ui-space-xs);margin:0}.recovery-layout dl>div{display:grid;grid-template-columns:14ch minmax(0,1fr);gap:var(--ui-space-xs);padding-block:var(--ui-space-xs)}.recovery-layout dd{margin:0;overflow-wrap:anywhere}.recovery-preview{border-block:1px solid var(--border-subtle);padding-block:var(--ui-space-sm);margin-block:var(--ui-space-sm)}.recovery-preview header{display:flex;justify-content:space-between;align-items:center}.recovery-preview textarea{width:100%;height:24vh;font-family:var(--font-mono)}.recovery-preview li{overflow-wrap:anywhere}.warning{color:var(--warning)}@media(max-width:640px){.recovery-layout{grid-template-columns:minmax(0,1fr)}.recovery-layout>nav{max-height:20vh;border-right:0;border-bottom:1px solid var(--border-subtle)}}</style>
