<template>
  <Teleport to="body">
    <section v-if="recovery.visible" class="recovery-screen" role="dialog" aria-modal="true" :aria-label="t('crashRecovery')">
      <article>
        <header><span>↻</span><div><strong>{{ t('crashRecovery') }}</strong><small>{{ t('crashRecoveryHint') }}</small></div></header>
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
      </article>
    </section>
  </Teleport>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { t } from '../i18n'
import { clearEditorHistory, getSceneJSON, loadProject } from '../store/physics'
import { projectManagerState } from '../projects/projectManager'
import { discardRecoverySnapshot, dismissRecovery, previewRecoverySnapshot, recoveryCopySource, recoveryState as recovery, selectedRecoverySource } from '../runtime/recovery'
import { notify } from '../runtime/editorFeedback'
import { markProjectDirty, projectTransactionState } from '../runtime/projectTransactions'
const openReadOnly = ref(false)
const selected = computed(() => recovery.snapshots.find(item => item.id === recovery.selectedId) ?? null)
const preview = computed(() => recovery.preview)
function formatTime(value: string) { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleString() : value }
function formatBytes(value: number) { return value < 1024 ? `${value} B` : value < 1_048_576 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1_048_576).toFixed(1)} MB` }
function discard() { if (selected.value) discardRecoverySnapshot(selected.value.id) }
function currentManualSource(): string { try { return projectTransactionState.manualBaseline || getSceneJSON() } catch { return projectTransactionState.manualBaseline } }
function refreshPreview() { previewRecoverySnapshot(recovery.selectedId, currentManualSource()) }
function loadRecovered(source: string, reason: string) { if (!loadProject(source)) { notify(t('recoveryFailed'), 'error'); return false } recovery.readOnly = openReadOnly.value; projectManagerState.visible = false; clearEditorHistory(reason, source, false); markProjectDirty('project'); dismissRecovery(); notify(t('recoveryRestored'), 'success'); return true }
function restore() { const source = selectedRecoverySource(); if (source) loadRecovered(source, 'recovery-restore') }
function openCopy() { const source = recoveryCopySource(); if (source) loadRecovered(source, 'recovery-open-copy') }
function openSafe() { const source = selectedRecoverySource(); if (source) try { sessionStorage.setItem('nova-a-safe-recovery-source', source) } catch { /* URL mode remains available. */ }; const url = new URL(location.href); url.searchParams.set('safe-mode', '1'); url.searchParams.set('safe-layout', '1'); if (openReadOnly.value) url.searchParams.set('read-only', '1'); location.assign(url.toString()) }
watch(() => recovery.selectedId, refreshPreview, { immediate: true })
</script>
<style scoped>
.recovery-screen{position:fixed;inset:0;z-index:9500;padding:20px;display:grid;place-items:center;background:linear-gradient(145deg,var(--bg-base),var(--surface-2))}article{width:min(860px,100%);max-height:94vh;overflow:hidden;border:1px solid var(--border-strong);border-radius:18px;background:var(--surface-1);box-shadow:var(--shadow-lg)}header{padding:18px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--border-subtle)}header>span{width:42px;height:42px;display:grid;place-items:center;border-radius:12px;color:var(--accent);background:var(--accent-soft);font-size:22px}header div{display:grid;gap:3px}header strong{font-size:18px}header small,main p{color:var(--text-muted)}.warning{margin:10px 16px;color:var(--warning)}.recovery-layout{min-height:360px;display:grid;grid-template-columns:minmax(240px,34%) minmax(0,1fr)}nav{padding:8px;overflow:auto;border-right:1px solid var(--border-subtle)}nav button{width:100%;min-height:68px;margin-bottom:6px;padding:8px 10px;display:grid;gap:3px;border:1px solid transparent;border-radius:9px;background:transparent;text-align:left}nav button.active{border-color:var(--accent);background:var(--accent-soft)}nav span,nav small{color:var(--text-muted)}main{padding:20px;overflow:auto}dl{display:grid;gap:7px}dl div{padding:8px;display:grid;grid-template-columns:120px minmax(0,1fr);border-bottom:1px solid var(--border-subtle)}dt{color:var(--text-muted)}dd{margin:0}main label{margin-top:18px;display:flex;align-items:center;gap:8px}footer{padding:12px 16px;display:flex;justify-content:flex-end;flex-wrap:wrap;gap:7px;border-top:1px solid var(--border-subtle)}footer button{min-height:36px;padding:0 12px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-2)}footer button.primary{color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}footer button.danger{color:var(--danger)}@media(max-width:640px){.recovery-layout{display:flex;flex-direction:column}.recovery-layout nav{max-height:210px;border-right:0;border-bottom:1px solid var(--border-subtle)}}
.recovery-preview{margin-top:12px;padding:9px;border:1px solid var(--border-subtle);border-radius:9px;background:var(--surface-2)}.recovery-preview header{min-height:30px;padding:0;justify-content:space-between;border:0}.recovery-preview header button{min-height:28px;padding:0 8px;border:1px solid var(--border-subtle);border-radius:7px;background:var(--surface-3)}.recovery-preview p.warning{margin:6px 0;color:var(--warning)}.recovery-preview ol{max-height:150px;margin:5px 0;padding-left:20px;overflow:auto}.recovery-preview li{display:flex;gap:7px}.recovery-preview li b{color:var(--accent)}.recovery-preview li span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.recovery-preview textarea{width:100%;min-height:120px;resize:vertical;font:var(--type-code)/1.45 var(--font-mono)}
</style>
