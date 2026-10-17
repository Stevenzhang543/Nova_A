<!-- 项目恢复中心：预览快照并恢复版本、打开副本或安全重启。 -->
<template>
  <Teleport to="body">
    <UiMotionTransition modal><UiDialog motion-owner="parent" v-if="recovery.visible" :title="t('crashRecovery')" @close="dismissRecovery"><p class="dialog-hint">{{ t('crashRecoveryHint') }}</p>
        <p v-if="recovery.invalidSnapshots" class="warning">{{ t('invalidSnapshotsSkipped', { count: recovery.invalidSnapshots }) }}</p>
        <div class="recovery-layout">
          <nav>
            <button v-for="snapshot in recovery.snapshots" :key="snapshot.id" :class="{ active: recovery.selectedId === snapshot.id }" @click="recovery.selectedId = snapshot.id"><strong>{{ snapshot.projectName }}</strong><span>{{ formatTime(snapshot.timestamp) }}</span><small>{{ t(`snapshot_${snapshot.reason}`) }}</small></button>
          </nav>
          <main v-if="selected">
            <dl><div><dt>{{ t('project') }}</dt><dd>{{ selected.projectName }}</dd></div><div><dt>{{ t('timestamp') }}</dt><dd>{{ formatTime(selected.timestamp) }}</dd></div><div><dt>{{ t('snapshotReason') }}</dt><dd>{{ t(`snapshot_${selected.reason}`) }}</dd></div><div><dt>{{ t('snapshotSize') }}</dt><dd>{{ formatBytes(selected.source.length) }}</dd></div></dl>
            <section class="recovery-preview"><header><strong>{{ t('recoveryPreview') }}</strong><button @click="refreshPreview">{{ t('compare') }}</button></header><p v-if="preview" :class="{ warning: preview.conflict }">{{ preview.message }}</p><ol v-if="preview?.semanticChanges.length"><li v-for="change in preview.semanticChanges.slice(0,30)" :key="`${change.kind}:${change.uuid}`"><b>{{ change.kind }}</b><span>{{ change.resourceType }} · {{ change.path }}</span></li></ol><textarea v-else readonly :value="selected.source.slice(0,4000)"></textarea></section>
            <label><input v-model="openReadOnly" type="checkbox">{{ t('openReadOnly') }}</label>
            <p>{{ t('recoveryManualSaveHint', { time: recovery.lastManualSave ? formatTime(recovery.lastManualSave) : t('unknown') }) }}</p>
          </main>
        </div>
        <footer><button @click="dismissRecovery">{{ t('skipRecovery') }}</button><button :disabled="!selected" class="danger" @click="discard">{{ t('discardSnapshot') }}</button><button :disabled="!selected" @click="openCopy">{{ t('openRecoveryCopy') }}</button><button :disabled="!selected" @click="openSafe">{{ t('openInSafeMode') }}</button><button :disabled="!selected || preview?.valid === false" class="primary" @click="restore">{{ t('restoreSnapshot') }}</button></footer>
    </UiDialog></UiMotionTransition>
  </Teleport>
</template>
<script setup lang="ts">
import UiMotionTransition from '../ui/components/UiMotionTransition.vue'

import UiDialog from '../ui/components/UiDialog.vue'
import { computed, ref, watch } from 'vue'
import { t } from '../i18n'
import { clearEditorHistory, getSceneJSON, loadProject } from '../store/physics'
import { projectManagerState } from '../projects/projectManager'
import { discardRecoverySnapshot, dismissRecovery, previewRecoverySnapshot, recoveryCopySource, recoveryState as recovery, selectedRecoverySource } from '../runtime/recovery'
import { notify } from '../runtime/editorFeedback'
import { markProjectDirty, projectTransactionState } from '../runtime/projectTransactions'
const openReadOnly = ref(false)
const selected = computed(/** 查找所选恢复快照，找不到时返回空值。 */ () => recovery.snapshots.find(/* 比较 item.id 与 recovery.selectedId，返回严格相等的判断结果。 */ item => item.id === recovery.selectedId) ?? null)
const preview = computed(/* 返回 recovery.preview 的当前值。 */ () => recovery.preview)
/** 有效时间按本地日期时间显示，否则保留原文。 */ function formatTime(value: string) { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleString() : value }
/** 按字节、千字节或兆字节显示快照大小。 */ function formatBytes(value: number) { return value < 1024 ? `${value} B` : value < 1_048_576 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1_048_576).toFixed(1)} MB` }
/** 存在选中项时删除该恢复快照。 */ function discard() { if (selected.value) discardRecoverySnapshot(selected.value.id) }
/** 优先返回手动保存基线，否则序列化场景；失败时回退基线。 */ function currentManualSource(): string { try { return projectTransactionState.manualBaseline || getSceneJSON() } catch { return projectTransactionState.manualBaseline } }
/** 以当前手动版本刷新恢复快照对比。 */ function refreshPreview() { previewRecoverySnapshot(recovery.selectedId, currentManualSource()) }
/** 加载恢复源；成功设置只读状态、关闭启动页、重建历史、标脏并提示完成。 */ function loadRecovered(source: string, reason: string) { if (!loadProject(source)) { notify(t('recoveryFailed'), 'error'); return false } recovery.readOnly = openReadOnly.value; projectManagerState.visible = false; clearEditorHistory(reason, source, false); markProjectDirty('project'); dismissRecovery(); notify(t('recoveryRestored'), 'success'); return true }
/** 读取所选快照源并以恢复原因加载。 */ function restore() { const source = selectedRecoverySource(); if (source) loadRecovered(source, 'recovery-restore') }
/** 生成恢复副本并以副本原因加载。 */ function openCopy() { const source = recoveryCopySource(); if (source) loadRecovered(source, 'recovery-open-copy') }
/** 尽可能缓存恢复源，并携安全模式、安全布局及可选只读参数重新打开应用。 */ function openSafe() { const source = selectedRecoverySource(); if (source) try { sessionStorage.setItem('nova-a-safe-recovery-source', source) } catch { /* URL mode remains available. */ }; const url = new URL(location.href); url.searchParams.set('safe-mode', '1'); url.searchParams.set('safe-layout', '1'); if (openReadOnly.value) url.searchParams.set('read-only', '1'); location.assign(url.toString()) }
watch(/* 返回 recovery.selectedId 的当前值。 */ () => recovery.selectedId, refreshPreview, { immediate: true })
</script>
<style scoped>.dialog-hint{color:var(--text-muted);margin:0 0 var(--ui-space-sm)}p,code{overflow-wrap:anywhere}pre{max-height:40vh;overflow:auto;padding:var(--ui-space-sm);background:var(--input-bg);white-space:pre-wrap;overflow-wrap:anywhere;font:var(--type-caption)/var(--line-body) var(--font-mono)}footer{display:flex;gap:var(--ui-space-xs);flex-wrap:wrap;justify-content:flex-end;border-top:1px solid var(--border-subtle);padding-top:var(--ui-space-sm)}.recovery-layout{display:grid;grid-template-columns:minmax(18ch,30%) minmax(0,1fr);gap:var(--ui-space-sm)}.recovery-layout>nav{display:flex;flex-direction:column;max-height:50vh;overflow:auto;border-right:1px solid var(--border-subtle);padding-right:var(--ui-space-sm)}.recovery-layout>nav button{display:grid;gap:var(--ui-space-xs);text-align:left;flex:none;border-color:transparent;border-radius:0;background:transparent;padding:var(--ui-space-sm)}.recovery-layout>nav button.active{background:var(--selection-bg)}.recovery-layout small,.recovery-layout dt{color:var(--text-muted)}.recovery-layout main{min-width:0}.recovery-layout dl{display:grid;gap:var(--ui-space-xs);margin:0}.recovery-layout dl>div{display:grid;grid-template-columns:14ch minmax(0,1fr);gap:var(--ui-space-xs);padding-block:var(--ui-space-xs)}.recovery-layout dd{margin:0;overflow-wrap:anywhere}.recovery-preview{border-block:1px solid var(--border-subtle);padding-block:var(--ui-space-sm);margin-block:var(--ui-space-sm)}.recovery-preview header{display:flex;justify-content:space-between;align-items:center}.recovery-preview textarea{width:100%;height:24vh;font-family:var(--font-mono)}.recovery-preview li{overflow-wrap:anywhere}.warning{color:var(--warning)}@media(max-width:640px){.recovery-layout{grid-template-columns:minmax(0,1fr)}.recovery-layout>nav{max-height:20vh;border-right:0;border-bottom:1px solid var(--border-subtle)}}</style>
