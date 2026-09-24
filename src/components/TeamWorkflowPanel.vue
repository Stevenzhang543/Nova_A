<!-- 团队工作流面板：配置协作规则、代码所有权与项目审核。 -->
<template>
  <section class="team-workflow" data-doc="manual/source-control">
    <header><div><strong>{{ t('sourceControl') }}</strong><small>{{ t('sourceControlHint') }}</small></div><label class="workflow-toggle"><input v-model="team.enabled" type="checkbox" @change="persistTeamWorkflowSettings"><span>{{ t('optionalTeamWorkflow') }}</span></label><span :class="['status-pill', changes.length ? 'dirty' : 'clean']">{{ changes.length ? t('changesCount', { count: changes.length }) : t('workingTreeClean') }}</span></header>
    <div v-if="team.enabled" class="team-grid">
      <section class="changes-card">
        <div class="card-title"><strong>{{ t('sourceStatus') }}</strong><button @click="refresh">{{ t('refresh') }}</button></div>
        <div class="change-list">
          <article v-for="change in changes" :key="`${change.kind}:${change.id}`" :class="{ selected: selectedChange === change.id }" @click="selectedChange = change.id"><span :class="change.change">{{ change.change.slice(0, 1).toUpperCase() }}</span><div><strong>{{ change.path }}</strong><small>{{ change.kind }} · {{ t(`source_${change.change}`) }}</small></div></article>
          <p v-if="!changes.length">{{ t('workingTreeCleanHint') }}</p>
        </div>
        <footer><button @click="downloadNovaIgnoreFile">{{ t('generateIgnore') }}</button><button @click="downloadPreCommitHook">{{ t('preCommitHook') }}</button><button @click="downloadCiValidationTemplate">{{ t('ciTemplate') }}</button><button @click="openDiff">{{ t('openExternalDiff') }}</button></footer>
        <label class="incoming-picker"><span>{{ t('incomingProject') }}</span><button @click="incomingInput?.click()">{{ team.incomingFileName || t('chooseFile') }}</button><input ref="incomingInput" hidden type="file" accept=".nova,.json,application/json" @change="readIncoming"></label>
        <div v-if="team.incomingSource" class="conflict-summary"><span>{{ t('conflictsFound', { count: team.conflicts.length }) }}</span><button @click="reloadIncoming">{{ t('reloadExternal') }}</button><button :disabled="!team.mergeTool.trim()" @click="openMerge">{{ t('openExternalMerge') }}</button></div>
        <section v-if="team.semanticMerge" class="semantic-merge">
          <header><strong>{{ t('semanticMerge') }}</strong><span>{{ team.semanticMerge.autoMerged.length }} {{ t('autoMerged') }} · {{ unresolvedConflicts }} {{ t('unresolved') }}</span></header>
          <p>{{ deliveryLabel19('review') }}</p>
          <article v-for="conflict in team.semanticMerge.conflicts" :key="conflict.id" class="merge-conflict19">
            <div class="conflict-heading19"><b>{{ conflict.kind }}</b><code>{{ conflict.path }}</code><span v-if="conflict.orderOnly">{{ deliveryLabel19('order') }}</span></div>
            <details><summary>{{ deliveryLabel19('base') }}</summary><pre>{{ conflictValue19(conflict.base) }}</pre></details>
            <div class="conflict-values19">
              <section><strong>{{ deliveryLabel19('ours') }}</strong><pre tabindex="0">{{ conflictValue19(conflict.ours) }}</pre><button :aria-pressed="conflict.resolution === 'ours'" :class="{ selected: conflict.resolution === 'ours' }" @click="chooseConflict(conflict.id, 'ours')">{{ t('keepOurs') }}</button></section>
              <section><strong>{{ deliveryLabel19('theirs') }}</strong><pre tabindex="0">{{ conflictValue19(conflict.theirs) }}</pre><button :aria-pressed="conflict.resolution === 'theirs'" :class="{ selected: conflict.resolution === 'theirs' }" @click="chooseConflict(conflict.id, 'theirs')">{{ t('takeTheirs') }}</button></section>
            </div>
          </article>
          <button class="primary" :disabled="unresolvedConflicts > 0" @click="applySemanticMerge">{{ t('applySemanticMerge') }}</button>
        </section>
        <section class="change-list-editor"><header><strong>{{ t('changeLists') }}</strong><span>{{ team.changeLists.length }}</span></header><div class="metadata-row"><input v-model="changeListName" :placeholder="t('changeListName')"><input v-model="changeListOwner" :placeholder="t('owner')"><button :disabled="!changes.length" @click="createChangeList">{{ t('createChangeList') }}</button></div><article v-for="list in team.changeLists.slice(0, 4)" :key="list.id"><div><b>{{ list.name }}</b><small>@{{ list.owner }} · {{ list.changes.length }} · {{ list.fingerprint }}</small></div><span :class="list.status">{{ list.status }}</span></article></section>
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
      <section class="metadata-card">
        <strong>{{ t('ownershipAndTasks') }}</strong>
        <div class="metadata-row"><input v-model="ownershipPath" placeholder="Assets/Scenes/**"><input v-model="ownershipOwners" placeholder="owner, reviewer"><button @click="addOwnership">{{ t('add') }}</button></div>
<!-- 拥有者映射回调为每个名称添加 @ 前缀用于规则展示。 -->        <ul><li v-for="rule in team.ownership" :key="rule.path"><code>{{ rule.path }}</code><span>{{ rule.owners.map(owner => `@${owner}`).join(' ') }}</span></li></ul>
        <button :disabled="!team.ownership.length" @click="downloadCodeOwnersFile">{{ t('downloadCodeOwners') }}</button>
        <div class="metadata-row"><input v-model="taskId" placeholder="NOVA-123"><input v-model="taskUrl" placeholder="https://…"><button @click="addTask">{{ t('addTaskLink') }}</button></div>
        <div class="metadata-row"><input v-model="changeOwner" :placeholder="t('lockOwner')"><input v-model="changeNote" :placeholder="t('changeNote')"><button @click="addNote">{{ t('add') }}</button></div>
      </section>
      <section class="network-card"><strong>{{ t('localFirstWorkflow') }}</strong><label><input v-model="team.networkOperations" type="checkbox" @change="persistTeamWorkflowSettings"><span>{{ t('allowExplicitNetworkOperations') }}</span></label><p>{{ t('teamNetworkTransparency') }}</p><dl><div><dt>{{ t('localFiles') }}</dt><dd>project.nova · Packages.lock · CODEOWNERS · .nova-lock</dd></div><div><dt>{{ t('network') }}</dt><dd>{{ team.networkOperations ? t('explicitOnly') : t('disabled') }}</dd></div></dl></section>
      <section class="binary-card"><strong>{{ t('binaryAssetLocks') }}</strong><div class="metadata-row"><input v-model="binaryPath" placeholder="Assets/Art/hero.png"><input v-model="binaryOwner" :placeholder="t('lockOwner')"><button @click="lockBinary">{{ t('acquireLock') }}</button></div><ul><li v-for="lock in team.binaryLocks" :key="lock.token"><code>{{ lock.path }}</code><span>{{ lock.owner }} · {{ new Date(lock.expiresAt).toLocaleTimeString() }}</span></li></ul><p>{{ t('binaryLockGuidance') }}</p></section>
    </div>
    <div v-else class="team-disabled"><strong>{{ t('teamWorkflowDisabled') }}</strong><p>{{ t('teamWorkflowDisabledHint') }}</p></div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { t } from '../i18n'
import { conflictValue19, deliveryLabel19 } from '../editor/deliveryLabels19'
import { getSceneJSON, loadProject } from '../store/physics'
import {applyReviewedProjectMerge} from '../editor/semanticMergeCommand'
import { projectSessionState as project } from '../projects/projectSession'
import { acquireBinaryAssetLock, acquireProjectLock, addOwnershipRule, addTeamChangeNote, addTeamTaskLink, createSemanticMergePlan, createTeamChangeList, downloadCiValidationTemplate, downloadCodeOwnersFile, downloadNovaIgnoreFile, downloadPreCommitHook, downloadProjectLock, incomingProjectSource, initializeGitRepository, openExternalDiff, openExternalMerge, persistTeamWorkflowSettings, refreshSourceStatus, releaseProjectLock, resolveSemanticMergeConflict, setIncomingProject, sourceDiffFor, teamWorkflowState as team } from '../runtime/teamWorkflow'

const lockOwner = ref('Whitelist')
const incomingInput = ref<HTMLInputElement | null>(null)
const selectedChange = ref(''), repositoryPath = ref(''), repositoryStatus = ref('')
const ownershipPath = ref('Assets/**'), ownershipOwners = ref('Whitelist'), taskId = ref(''), taskUrl = ref(''), changeOwner = ref('Whitelist'), changeNote = ref(''), binaryPath = ref(''), binaryOwner = ref('Whitelist')
const changeListName = ref('Release candidate'), changeListOwner = ref('Whitelist')
const changes = computed(/* 返回 team.changes 的当前值。 */ () => team.changes)
const unresolvedConflicts = computed(/** 统计语义合并中尚未解决的冲突，无合并计划时返回零。 */ () => team.semanticMerge?.conflicts.filter(/* 比较 conflict.resolution 与 'unresolved'，返回严格相等的判断结果。 */ conflict => conflict.resolution === 'unresolved').length ?? 0)
const selectedDiff = computed(/* 根据 selectedChange.value 的真假，分别返回 sourceDiffFor(selectedChange.value, getSceneJSON()) 或 null。 */ () => selectedChange.value ? sourceDiffFor(selectedChange.value, getSceneJSON()) : null)
const lockSummary = computed(/* 根据 team.lockToken 的真假，分别返回 `${t('lockedUntil')} ${new Date(team.lockExpiresAt).toLocaleTimeString()}` 或 t('unlocked')。 */ () => team.lockToken ? `${t('lockedUntil')} ${new Date(team.lockExpiresAt).toLocaleTimeString()}` : t('unlocked'))
/** 用当前场景序列化结果刷新源码状态。 */ function refresh(): void { refreshSourceStatus(getSceneJSON()) }
/** 打开外部差异工具，失败显示状态错误。 */ async function openDiff(): Promise<void> { try { await openExternalDiff(getSceneJSON()) } catch (error) { team.status = error instanceof Error ? error.message : String(error) } }
/** 打开外部合并工具，失败显示状态错误。 */ async function openMerge(): Promise<void> { try { await openExternalMerge(getSceneJSON()) } catch (error) { team.status = error instanceof Error ? error.message : String(error) } }
/** 读取用户选中的传入项目文件，并安装成功与失败回调后清空选择输入。 */ function readIncoming(event: Event): void {
  const input = event.target as HTMLInputElement, file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = /** 文件读成文本后登记传入版本，并以基线或当前版本创建语义合并计划。 */ () => {
    try { if (typeof reader.result === 'string') { const current = getSceneJSON(); setIncomingProject(current, reader.result, file.name); createSemanticMergePlan(team.baseline || current, current, reader.result) } }
    catch (error) { team.status = error instanceof Error ? error.message : String(error) }
  }
  reader.onerror = /** 文件读取失败时将具体错误或默认提示写入状态。 */ () => { team.status = reader.error?.message ?? 'Unable to read incoming project.' }
  reader.readAsText(file); input.value = ''
}
/** 以当前项目标识和输入拥有者申请项目锁。 */ function acquireLock(): void { acquireProjectLock(project.id, lockOwner.value) }
/** 释放当前项目锁。 */ function releaseLock(): void { releaseProjectLock(project.id) }
/** 载入传入项目成功后清除传入记录并刷新状态。 */ function reloadIncoming(): void { const source = incomingProjectSource(); if (source && loadProject(source)) { team.incomingSource = ''; team.incomingFileName = ''; refresh() } }
/** 尝试初始化指定路径的 Git 仓库，显示返回结果或错误。 */ async function initializeRepository(): Promise<void> { try { repositoryStatus.value = await initializeGitRepository(repositoryPath.value) } catch (error) { repositoryStatus.value = error instanceof Error ? error.message : String(error) } }
/** 添加所有权规则成功后清空路径输入。 */ function addOwnership(): void { if (addOwnershipRule(ownershipPath.value, ownershipOwners.value)) ownershipPath.value = '' }
/** 添加任务链接成功后清空任务编号和地址。 */ function addTask(): void { if (addTeamTaskLink(taskId.value, taskUrl.value, '')) { taskId.value = ''; taskUrl.value = '' } }
/** 添加团队变更说明成功后清空说明文本。 */ function addNote(): void { if (addTeamChangeNote(changeOwner.value, changeNote.value)) changeNote.value = '' }
/** 申请二进制资源锁成功后清空路径输入。 */ function lockBinary(): void { if (acquireBinaryAssetLock(binaryPath.value, binaryOwner.value)) binaryPath.value = '' }
/** 以当前变更标识和项目源创建变更清单，成功后清空名称。 */ function createChangeList(): void { const list = createTeamChangeList(changeListName.value, changeListOwner.value, changes.value.map(/* 返回 change.id 的当前值。 */ change => change.id), getSceneJSON()); if (list) changeListName.value = '' }
/** 选择冲突一侧，失败显示状态错误。 */ function chooseConflict(id: string, side: 'ours' | 'theirs'): void { try { resolveSemanticMergeConflict(id, side) } catch (error) { team.status = error instanceof Error ? error.message : String(error) } }
/** 应用已审核项目合并，成功清空传入内容与计划并刷新，失败显示状态错误。 */ function applySemanticMerge(): void {
  try {
    applyReviewedProjectMerge()
    team.incomingSource = ''; team.incomingFileName = ''; team.semanticMerge = null; refresh()
  } catch (error) { team.status = error instanceof Error ? error.message : String(error) }
}
onMounted(refresh)
</script>

<style scoped>
.team-workflow{height:100%;min-width:0;display:flex;flex-direction:column;container-type:inline-size}.team-workflow>header{min-height:45px;padding:7px 10px;display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid var(--border-subtle)}.team-workflow>header>div{min-width:0;display:grid}.team-workflow>header small{color:var(--text-muted);font-size:11px}.status-pill{padding:4px 8px;border-radius:999px;font-size:11px;white-space:nowrap}.status-pill.clean{color:var(--success);background:color-mix(in srgb,var(--success) 12%,transparent)}.status-pill.dirty{color:var(--warning);background:color-mix(in srgb,var(--warning) 12%,transparent)}.team-grid{min-height:0;flex:1;padding:9px;display:grid;grid-template-columns:minmax(280px,1.2fr) minmax(240px,1fr);grid-auto-rows:minmax(150px,auto);gap:8px;overflow:auto}.team-grid>section{min-width:0;padding:10px;border:1px solid var(--border-subtle);border-radius:11px;background:var(--surface-2)}.card-title{display:flex;align-items:center;justify-content:space-between}.card-title button{min-height:27px}.change-list{height:126px;margin-top:7px;overflow:auto}.change-list article{min-width:0;min-height:38px;padding:4px;display:grid;grid-template-columns:25px minmax(0,1fr);align-items:center;gap:7px;border-bottom:1px solid var(--border-subtle)}.change-list article>span{width:23px;height:23px;display:grid;place-items:center;border-radius:6px;font-size:11px;font-weight:750}.change-list .added{color:var(--success);background:color-mix(in srgb,var(--success) 12%,transparent)}.change-list .modified{color:var(--warning);background:color-mix(in srgb,var(--warning) 12%,transparent)}.change-list .deleted,.change-list .conflict{color:var(--danger);background:var(--danger-soft)}.change-list article div{min-width:0;display:grid}.change-list article strong,.change-list article small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.change-list article strong{font-size:11px}.change-list article small,.change-list p,.team-grid p,.team-grid li{color:var(--text-muted);font-size:11px}.changes-card footer{margin-top:7px;display:flex;gap:5px}.team-grid button{min-height:29px;padding:0 9px;border:1px solid var(--border-subtle);border-radius:7px;background:var(--surface-3)}.settings-card,.lock-card{display:flex;flex-direction:column;gap:7px}.team-grid label{min-height:30px;display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--text-muted);font-size:11px}.team-grid label input{width:58%;min-width:0}.incoming-picker{margin-top:6px}.incoming-picker button{max-width:62%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.conflict-summary{min-height:34px;margin-top:5px;padding:5px 7px;display:flex;align-items:center;justify-content:space-between;gap:7px;border-radius:8px;color:var(--danger);background:var(--danger-soft);font-size:11px}.lock-card>div:first-child{display:grid}.lock-card small{color:var(--text-muted);font-size:11px}.lock-actions{display:flex;gap:5px}.lock-actions button{flex:1}.lock-actions .primary{color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}.lock-actions .danger{color:var(--danger)}.format-card ul{padding-left:17px}.format-card li{margin:6px 0}@container(max-width:620px){.team-grid{grid-template-columns:1fr}.change-list{height:110px}}
</style>
<style scoped>
.repository-card{display:flex;flex-direction:column;gap:7px}.repository-card button{align-self:flex-start}.change-list article.selected{background:var(--accent-soft)}
.inline-diff{margin-top:7px;border:1px solid var(--border-subtle);border-radius:8px;overflow:hidden}.inline-diff header{min-height:30px;padding:5px 7px;display:flex;justify-content:space-between;background:var(--surface-3);font-size:11px}.inline-diff>div{display:grid;grid-template-columns:1fr 1fr}.inline-diff pre{max-height:160px;margin:0;padding:7px;overflow:auto;border-right:1px solid var(--border-subtle);font:11px/1.45 var(--font-mono);white-space:pre-wrap;overflow-wrap:anywhere}.inline-diff pre:last-child{border-right:0}
.workflow-toggle{display:flex;align-items:center;gap:5px;color:var(--text-muted);font-size:11px}.team-disabled{margin:auto;width:min(520px,calc(100% - 24px));padding:22px;border:1px solid var(--border-subtle);border-radius:12px;background:var(--surface-2);text-align:center}.team-disabled p{color:var(--text-muted)}.metadata-card,.network-card,.binary-card{display:flex;flex-direction:column;gap:7px}.metadata-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:5px}.metadata-row>*{min-width:0}.metadata-card ul,.binary-card ul{max-height:100px;margin:0;padding:0;overflow:auto;list-style:none}.metadata-card li,.binary-card li{padding:4px 0;display:flex;justify-content:space-between;gap:6px;border-bottom:1px solid var(--border-subtle);font-size:11px}.network-card dl{margin:0}.network-card dl div{display:grid;grid-template-columns:80px minmax(0,1fr);gap:6px}.network-card dt{color:var(--text-muted)}.network-card dd{margin:0;overflow-wrap:anywhere}
.semantic-merge,.change-list-editor{margin-top:7px;padding:7px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-1)}.semantic-merge>header,.change-list-editor>header{min-height:28px;display:flex;align-items:center;justify-content:space-between;gap:7px;font-size:11px}.semantic-merge>article{min-width:0;min-height:34px;display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:5px;border-top:1px solid var(--border-subtle)}.semantic-merge>article>div,.change-list-editor>article>div{min-width:0;display:grid}.semantic-merge code,.change-list-editor small{overflow:hidden;color:var(--text-muted);text-overflow:ellipsis;white-space:nowrap}.semantic-merge button.selected{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}.semantic-merge>.primary{width:100%;margin-top:6px;color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}.change-list-editor>article{min-height:34px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px;border-top:1px solid var(--border-subtle)}.change-list-editor>article>span{padding:3px 6px;border-radius:999px;background:var(--surface-3);font-size:11px}.change-list-editor>article>span.ready{color:var(--success)}
</style>

<style scoped>
.semantic-merge .merge-conflict19{display:flex;flex-direction:column;align-items:stretch;gap:10px;padding:12px;min-width:0}
.conflict-heading19{display:flex;flex-wrap:wrap;gap:8px;min-width:0}.conflict-heading19 code{overflow-wrap:anywhere;white-space:pre-wrap}
.conflict-values19{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.conflict-values19>section{min-width:0;display:flex;flex-direction:column;gap:8px}
.merge-conflict19 pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:280px;overflow:auto;margin:0;padding:8px;background:var(--surface-1);font-size:var(--type-caption);min-width:0}
.semantic-merge header,.conflict-summary{flex-wrap:wrap}.semantic-merge p{white-space:normal;overflow-wrap:anywhere}.conflict-values19 button{white-space:normal;height:auto;padding:8px;min-height:32px}
@container(max-width:700px){.conflict-values19{grid-template-columns:minmax(0,1fr)}}
</style>
<style scoped>
.team-grid{grid-auto-rows:max-content;align-content:start;align-items:start}
.team-grid>section{height:auto;overflow-wrap:anywhere}
.team-workflow>header,.changes-card footer,.lock-actions{flex-wrap:wrap}
.team-workflow>header>div{flex:1 1 220px}.team-workflow>header small{white-space:normal}
.team-grid button{white-space:normal;height:auto;padding:6px 9px}
@container(max-width:620px){.team-grid{grid-template-columns:minmax(0,1fr)}.metadata-row{grid-template-columns:minmax(0,1fr)}.team-grid label:not(.workflow-toggle){flex-wrap:wrap}.team-grid label input:not([type=checkbox]){width:100%}.incoming-picker button{max-width:100%}}
</style>
