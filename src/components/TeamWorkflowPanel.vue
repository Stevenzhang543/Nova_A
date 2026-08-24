<template>
  <section class="team-workflow" data-doc="manual/source-control">
    <header><div><strong>{{ t('sourceControl') }}</strong><small>{{ t('sourceControlHint') }}</small></div><span :class="['status-pill', changes.length ? 'dirty' : 'clean']">{{ changes.length ? t('changesCount', { count: changes.length }) : t('workingTreeClean') }}</span></header>
    <div class="team-grid">
      <section class="changes-card">
        <div class="card-title"><strong>{{ t('sourceStatus') }}</strong><button @click="refresh">{{ t('refresh') }}</button></div>
        <div class="change-list">
          <article v-for="change in changes" :key="`${change.kind}:${change.id}`" :class="{ selected: selectedChange === change.id }" @click="selectedChange = change.id"><span :class="change.change">{{ change.change.slice(0, 1).toUpperCase() }}</span><div><strong>{{ change.path }}</strong><small>{{ change.kind }} · {{ t(`source_${change.change}`) }}</small></div></article>
          <p v-if="!changes.length">{{ t('workingTreeCleanHint') }}</p>
        </div>
        <footer><button @click="downloadNovaIgnoreFile">{{ t('generateIgnore') }}</button><button @click="downloadPreCommitHook">{{ t('preCommitHook') }}</button><button @click="downloadCiValidationTemplate">{{ t('ciTemplate') }}</button><button @click="openDiff">{{ t('openExternalDiff') }}</button></footer>
        <label class="incoming-picker"><span>{{ t('incomingProject') }}</span><button @click="incomingInput?.click()">{{ team.incomingFileName || t('chooseFile') }}</button><input ref="incomingInput" hidden type="file" accept=".nova,.json,application/json" @change="readIncoming"></label>
        <div v-if="team.incomingSource" class="conflict-summary"><span>{{ t('conflictsFound', { count: team.conflicts.length }) }}</span><button @click="reloadIncoming">{{ t('reloadExternal') }}</button><button :disabled="!team.mergeTool.trim()" @click="openMerge">{{ t('openExternalMerge') }}</button></div>
        <div v-if="selectedDiff" class="inline-diff"><header><strong>{{ selectedDiff.path }}</strong><span>{{ t('before') }} / {{ t('after') }}</span></header><div><pre>{{ selectedDiff.before }}</pre><pre>{{ selectedDiff.after }}</pre></div></div>
      </section>
      <section class="repository-card">
        <strong>{{ t('repositorySetup') }}</strong><label><span>{{ t('projectDirectory') }}</span><input v-model="repositoryPath" :placeholder="t('projectDirectoryHint')"></label><button class="primary" @click="initializeRepository">{{ t('initializeRepository') }}</button><p>{{ repositoryStatus || t('repositorySetupHint') }}</p>
      </section>
      <section class="settings-card">
        <strong>{{ t('externalTools') }}</strong>
        <label><span>{{ t('diffExecutable') }}</span><input v-model="team.diffTool" :placeholder="t('optionalExecutablePath')" @change="persistTeamWorkflowSettings"></label>
        <label><span>{{ t('diffArguments') }}</span><input v-model="team.diffArguments" placeholder="{left} {right}" @change="persistTeamWorkflowSettings"></label>
        <label><span>{{ t('mergeExecutable') }}</span><input v-model="team.mergeTool" :placeholder="t('optionalExecutablePath')" @change="persistTeamWorkflowSettings"></label>
        <label><span>{{ t('mergeArguments') }}</span><input v-model="team.mergeArguments" placeholder="{base} {ours} {theirs} {output}" @change="persistTeamWorkflowSettings"></label>
        <p>{{ t('externalToolSafety') }}</p>
      </section>
      <section class="lock-card">
        <div><strong>{{ t('safeProjectLock') }}</strong><small>{{ lockSummary }}</small></div>
        <label><span>{{ t('lockOwner') }}</span><input v-model="lockOwner" maxlength="120"></label>
        <div class="lock-actions"><button v-if="!team.lockToken" class="primary" @click="acquireLock">{{ t('acquireLock') }}</button><template v-else><button @click="downloadProjectLock(project.id, lockOwner)">{{ t('downloadLockFile') }}</button><button class="danger" @click="releaseLock">{{ t('releaseLock') }}</button></template></div>
        <p>{{ t('lockFileHint') }}</p>
      </section>
      <section class="format-card"><strong>{{ t('teamSafeFormat') }}</strong><ul><li>{{ t('stableTextOutput') }}</li><li>{{ t('conflictDetection') }}</li><li>{{ t('cacheIgnored') }}</li></ul></section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { t } from '../i18n'
import { getSceneJSON, loadProject } from '../store/physics'
import { projectSessionState as project } from '../projects/projectSession'
import { acquireProjectLock, downloadCiValidationTemplate, downloadNovaIgnoreFile, downloadPreCommitHook, downloadProjectLock, incomingProjectSource, initializeGitRepository, openExternalDiff, openExternalMerge, persistTeamWorkflowSettings, refreshSourceStatus, releaseProjectLock, setIncomingProject, sourceDiffFor, teamWorkflowState as team } from '../runtime/teamWorkflow'

const lockOwner = ref('Whitelist')
const incomingInput = ref<HTMLInputElement | null>(null)
const selectedChange = ref(''), repositoryPath = ref(''), repositoryStatus = ref('')
const changes = computed(() => team.changes)
const selectedDiff = computed(() => selectedChange.value ? sourceDiffFor(selectedChange.value, getSceneJSON()) : null)
const lockSummary = computed(() => team.lockToken ? `${t('lockedUntil')} ${new Date(team.lockExpiresAt).toLocaleTimeString()}` : t('unlocked'))
function refresh(): void { refreshSourceStatus(getSceneJSON()) }
async function openDiff(): Promise<void> { try { await openExternalDiff(getSceneJSON()) } catch (error) { team.status = error instanceof Error ? error.message : String(error) } }
async function openMerge(): Promise<void> { try { await openExternalMerge(getSceneJSON()) } catch (error) { team.status = error instanceof Error ? error.message : String(error) } }
function readIncoming(event: Event): void {
  const input = event.target as HTMLInputElement, file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try { if (typeof reader.result === 'string') setIncomingProject(getSceneJSON(), reader.result, file.name) }
    catch (error) { team.status = error instanceof Error ? error.message : String(error) }
  }
  reader.onerror = () => { team.status = reader.error?.message ?? 'Unable to read incoming project.' }
  reader.readAsText(file); input.value = ''
}
function acquireLock(): void { acquireProjectLock(project.id, lockOwner.value) }
function releaseLock(): void { releaseProjectLock(project.id) }
function reloadIncoming(): void { const source = incomingProjectSource(); if (source && loadProject(source)) { team.incomingSource = ''; team.incomingFileName = ''; refresh() } }
async function initializeRepository(): Promise<void> { try { repositoryStatus.value = await initializeGitRepository(repositoryPath.value) } catch (error) { repositoryStatus.value = error instanceof Error ? error.message : String(error) } }
onMounted(refresh)
</script>

<style scoped>
.team-workflow{height:100%;min-width:0;display:flex;flex-direction:column;container-type:inline-size}.team-workflow>header{min-height:45px;padding:7px 10px;display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid var(--border-subtle)}.team-workflow>header>div{min-width:0;display:grid}.team-workflow>header small{color:var(--text-muted);font-size:11px}.status-pill{padding:4px 8px;border-radius:999px;font-size:11px;white-space:nowrap}.status-pill.clean{color:var(--success);background:color-mix(in srgb,var(--success) 12%,transparent)}.status-pill.dirty{color:var(--warning);background:color-mix(in srgb,var(--warning) 12%,transparent)}.team-grid{min-height:0;flex:1;padding:9px;display:grid;grid-template-columns:minmax(280px,1.2fr) minmax(240px,1fr);grid-auto-rows:minmax(150px,auto);gap:8px;overflow:auto}.team-grid>section{min-width:0;padding:10px;border:1px solid var(--border-subtle);border-radius:11px;background:var(--surface-2)}.card-title{display:flex;align-items:center;justify-content:space-between}.card-title button{min-height:27px}.change-list{height:126px;margin-top:7px;overflow:auto}.change-list article{min-width:0;min-height:38px;padding:4px;display:grid;grid-template-columns:25px minmax(0,1fr);align-items:center;gap:7px;border-bottom:1px solid var(--border-subtle)}.change-list article>span{width:23px;height:23px;display:grid;place-items:center;border-radius:6px;font-size:11px;font-weight:750}.change-list .added{color:var(--success);background:color-mix(in srgb,var(--success) 12%,transparent)}.change-list .modified{color:var(--warning);background:color-mix(in srgb,var(--warning) 12%,transparent)}.change-list .deleted,.change-list .conflict{color:var(--danger);background:var(--danger-soft)}.change-list article div{min-width:0;display:grid}.change-list article strong,.change-list article small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.change-list article strong{font-size:11px}.change-list article small,.change-list p,.team-grid p,.team-grid li{color:var(--text-muted);font-size:11px}.changes-card footer{margin-top:7px;display:flex;gap:5px}.team-grid button{min-height:29px;padding:0 9px;border:1px solid var(--border-subtle);border-radius:7px;background:var(--surface-3)}.settings-card,.lock-card{display:flex;flex-direction:column;gap:7px}.team-grid label{min-height:30px;display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--text-muted);font-size:11px}.team-grid label input{width:58%;min-width:0}.incoming-picker{margin-top:6px}.incoming-picker button{max-width:62%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.conflict-summary{min-height:34px;margin-top:5px;padding:5px 7px;display:flex;align-items:center;justify-content:space-between;gap:7px;border-radius:8px;color:var(--danger);background:var(--danger-soft);font-size:11px}.lock-card>div:first-child{display:grid}.lock-card small{color:var(--text-muted);font-size:11px}.lock-actions{display:flex;gap:5px}.lock-actions button{flex:1}.lock-actions .primary{color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}.lock-actions .danger{color:var(--danger)}.format-card ul{padding-left:17px}.format-card li{margin:6px 0}@container(max-width:620px){.team-grid{grid-template-columns:1fr}.change-list{height:110px}}
</style>
<style scoped>
.repository-card{display:flex;flex-direction:column;gap:7px}.repository-card button{align-self:flex-start}.change-list article.selected{background:var(--accent-soft)}
.inline-diff{margin-top:7px;border:1px solid var(--border-subtle);border-radius:8px;overflow:hidden}.inline-diff header{min-height:30px;padding:5px 7px;display:flex;justify-content:space-between;background:var(--surface-3);font-size:11px}.inline-diff>div{display:grid;grid-template-columns:1fr 1fr}.inline-diff pre{max-height:160px;margin:0;padding:7px;overflow:auto;border-right:1px solid var(--border-subtle);font:11px/1.45 var(--font-mono);white-space:pre-wrap;overflow-wrap:anywhere}.inline-diff pre:last-child{border-right:0}
</style>
