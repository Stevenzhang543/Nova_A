<!-- 工作室状态对话框：展示稳定契约、兼容政策、已知问题及经隐私确认的诊断导出入口。 -->
<template>
  <Teleport to="body">
    <UiDialog v-if="state.visible" :title="`${t('studioStatus')} · ${NOVA_RELEASE_NAME}`" @close="closeStudioStatus">
      <p class="dialog-hint">{{ t('stableContractHint') }}</p>
        <div class="contracts"><section v-for="contract in NOVA_STABLE_CONTRACTS" :key="contract.id"><span>{{ t(`contract_${contract.id}`) }}</span><strong>v{{ contract.version }}</strong><small>{{ contract.compatibility }}</small></section></div>
        <aside><strong>{{ t('compatibilityPromise') }}</strong><p>{{ t('compatibilityPromiseHint') }}</p></aside>
        <section class="support-grid"><div><strong>{{ t('migrationCenter') }}</strong><p>{{ t('schemaFreezeSummary') }}</p></div><div><strong>{{ t('knownIssues') }}</strong><small>{{ KNOWN_ISSUES_FEED.updatedAt }} · {{ KNOWN_ISSUES_FEED.source }}</small><p v-for="issue in KNOWN_ISSUES" :key="`${issue.area}:${issue.issue}`"><b>{{ issue.severity }} · {{ issue.area }}</b> — {{ issue.issue }} {{ issue.workaround }}</p></div></section>
        <section class="release-channels"><header><strong>{{ t('releaseChannels') }}</strong><select v-model="support.releaseChannel"><option v-for="channel in RELEASE_CHANNELS" :key="channel.id" :value="channel.id">{{ channel.label }}</option></select></header><article v-for="channel in RELEASE_CHANNELS" :key="channel.id" :class="{ active: support.releaseChannel === channel.id }"><b>{{ channel.label }}</b><span>{{ channel.purpose }}</span><small>{{ channel.policy }} {{ channel.cadence }}</small></article></section>
        <section class="privacy-review"><strong>{{ t('diagnosticBundle') }}</strong><p>{{ t('diagnosticBundleHint') }}</p><label><input v-model="support.includeProjectIdentifiers" type="checkbox">{{ t('includeProjectIdentifiers') }}</label><label><input v-model="support.includeFilePaths" type="checkbox">{{ t('includeFilePaths') }}</label><label><input v-model="support.privacyReviewed" type="checkbox">{{ t('privacyReviewed') }}</label><button :disabled="!support.privacyReviewed" @click="exportDiagnosticBundle">{{ t('exportDiagnosticBundle') }}</button><small v-if="support.lastExport">{{ support.lastExport }}</small><div class="crash-consent"><p>{{ t('crashPrivacyNotice') }}</p><label><input v-model="support.crashReportingOptIn" type="checkbox">{{ t('crashReportingOptIn') }}</label><button :disabled="!support.privacyReviewed || !support.crashReportingOptIn" @click="exportCrashReportPackage">{{ t('exportCrashReport') }}</button><small v-if="support.lastCrashExport">{{ support.lastCrashExport }}</small></div></section>
        <footer><button @click="copy">{{ copied ? t('copied') : t('copyDiagnostics') }}</button><button @click="openManual">{{ t('manual') }}</button><UiButton variant="primary" @click="closeStudioStatus">{{ t('done') }}</UiButton></footer>
    </UiDialog>
  </Teleport>
</template>

<script setup lang="ts">
import UiDialog from '../ui/components/UiDialog.vue'
import UiButton from '../ui/components/UiButton.vue'
import { NOVA_RELEASE_NAME } from '../projects/projectFormat'
import { ref } from 'vue'
import { t } from '../i18n'
import { reportRecoverableError } from '../runtime/faultCenter'
import { openBundledManual } from '../runtime/openManual'
import { closeStudioStatus, NOVA_STABLE_CONTRACTS, stableContractDiagnostics, studioStatusState as state } from '../runtime/stableContracts'
import { exportCrashReportPackage, exportDiagnosticBundle, KNOWN_ISSUES, KNOWN_ISSUES_FEED, RELEASE_CHANNELS, supportState as support } from '../runtime/support'
const copied = ref(false)
/** 复制稳定契约诊断并显示短暂成功反馈，剪贴板错误交给可恢复错误中心。 */ async function copy(): Promise<void> { try { await navigator.clipboard.writeText(stableContractDiagnostics()); copied.value = true; window.setTimeout(/** 复制提示到期后恢复未复制状态。 */ () => { copied.value = false }, 1_500) } catch (error) { reportRecoverableError(error, 'Copy Studio diagnostics') } }
/** 关闭状态对话框并异步打开内置手册。 */ function openManual(): void { closeStudioStatus(); void openBundledManual() }
</script>

<style scoped>
.dialog-hint{margin:0 0 var(--ui-space-sm);color:var(--text-muted)}.scope,.profiles,.actions,.io,footer{display:flex;align-items:center;flex-wrap:wrap;gap:var(--ui-space-xs);padding-block:var(--ui-space-sm)}.manager-grid{display:grid;grid-template-columns:minmax(18ch,30%) minmax(0,1fr);gap:var(--ui-space-lg)}.manager-grid>nav{display:flex;flex-direction:column;gap:var(--ui-space-xs);border-right:1px solid var(--border-subtle);padding-right:var(--ui-space-sm);max-height:50vh;overflow:auto}.manager-grid>nav button{display:flex;flex-direction:column;align-items:flex-start;text-align:left;flex:none;min-height:calc(2 * var(--ui-control-height))}.manager-grid>main{min-width:0}.manager-grid label{display:flex;gap:var(--ui-space-xs);align-items:center;flex-wrap:wrap}.manager-grid label input:not([type=checkbox]){flex:1;min-width:8ch}.dock-grid{display:grid;gap:var(--ui-space-sm)}.dock-grid fieldset{display:flex;gap:var(--ui-space-xs);flex-wrap:wrap;padding:var(--ui-space-sm);border:1px solid var(--border-subtle)}.status,.conflict{overflow-wrap:anywhere}.conflict{color:var(--danger)}
.search{display:flex;gap:var(--ui-space-xs);align-items:center}.search input{flex:1;min-width:0}.shortcut-list{margin-block:var(--ui-space-sm)}.shortcut-list>section{display:grid;grid-template-columns:minmax(0,1fr) minmax(14ch,auto) var(--ui-control-height);gap:var(--ui-space-sm);align-items:center;padding-block:var(--ui-space-xs);border-bottom:1px solid var(--border-subtle)}.shortcut-list small{display:block;color:var(--text-muted);font-size:var(--type-caption)}.recording{color:var(--warning)}
.contracts{display:grid;grid-template-columns:repeat(auto-fit,minmax(20ch,1fr));gap:var(--ui-space-sm)}.contracts>section{display:grid;gap:var(--ui-space-xs);padding-block:var(--ui-space-sm);border-bottom:1px solid var(--border-subtle)}.contracts small,.support-grid small{color:var(--text-muted)}.support-grid,.release-channels,.privacy-review{display:grid;gap:var(--ui-space-sm);padding-block:var(--ui-space-sm);border-top:1px solid var(--border-subtle)}.release-channels>header{display:flex;justify-content:space-between}.release-channels>article{display:grid;grid-template-columns:12ch minmax(0,1fr);gap:var(--ui-space-xs);padding:var(--ui-space-xs)}.release-channels>article small{grid-column:2}.release-channels>article.active{background:var(--selection-bg)}.privacy-review label{display:flex;gap:var(--ui-space-xs);align-items:center}.crash-consent{border-top:1px solid var(--border-subtle);padding-top:var(--ui-space-sm)}
@media(max-width:600px){.manager-grid{grid-template-columns:minmax(0,1fr)}.manager-grid>nav{max-height:22vh;border-right:0;border-bottom:1px solid var(--border-subtle)}.shortcut-list>section{grid-template-columns:minmax(0,1fr) var(--ui-control-height)}.shortcut-list>section>span{grid-column:1/-1}}
</style>
