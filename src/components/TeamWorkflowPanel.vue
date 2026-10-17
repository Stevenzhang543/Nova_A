<!-- 团队工作流面板：配置协作规则、代码所有权与项目审核。 -->
<template>
  <section class="team-workflow" data-doc="manual/source-control">
    <header><div><strong>{{ t('sourceControl') }}</strong><small>{{ t('sourceControlHint') }}</small></div><label class="workflow-toggle"><input v-model="team.enabled" type="checkbox" @change="persistTeamWorkflowSettings"><span>{{ t('optionalTeamWorkflow') }}</span></label><span :class="['status-pill', changes.length ? 'dirty' : 'clean']">{{ changes.length ? t('changesCount', { count: changes.length }) : t('workingTreeClean') }}</span></header>
    <div v-if="team.enabled" class="team-grid">
      <section class="changes-card">
        <div class="card-title"><strong>{{ t('sourceStatus') }}</strong><UiButton icon="refresh" :label="t('refresh')" @click="refresh" /></div>
        <div class="change-list">
          <button type="button" class="change-select" :aria-pressed="selectedChange === change.id" v-for="change in changes" :key="`${change.kind}:${change.id}`" :class="{ selected: selectedChange === change.id }" @click="selectedChange = change.id"><span :class="change.change">{{ change.change.slice(0, 1).toUpperCase() }}</span><span class="change-description"><strong>{{ change.path }}</strong><small>{{ change.kind }} · {{ t(`source_${change.change}`) }}</small></span></button>
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
            <details data-ui-motion-disclosure><summary>{{ deliveryLabel19('base') }}</summary><pre>{{ conflictValue19(conflict.base) }}</pre></details>
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
import UiButton from '../ui/components/UiButton.vue'
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
.team-workflow{height:100%;min-width:0;display:flex;flex-direction:column;container:team-workflow/inline-size}.team-workflow>header{display:flex;align-items:center;gap:var(--ui-space-sm);flex-wrap:wrap;padding:var(--ui-space-sm);border-bottom:1px solid var(--border-subtle)}.team-workflow>header>div{display:grid;flex:1;min-width:20ch}.team-workflow>header small,.team-grid p,.team-grid li,.team-grid small{color:var(--text-muted);font-size:var(--type-caption)}.status-pill{font-size:var(--type-caption)}.status-pill.clean{color:var(--success)}.status-pill.dirty{color:var(--warning)}.workflow-toggle{display:flex;gap:var(--ui-space-xs);align-items:center}.team-grid{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1.4fr) minmax(26ch,1fr);gap:0 var(--ui-space-lg);align-content:start;align-items:start;overflow:auto;padding:var(--ui-space-sm)}.team-grid>section{min-width:0;display:grid;gap:var(--ui-space-sm);padding-block:var(--ui-space-sm);border-bottom:1px solid var(--border-subtle);overflow-wrap:anywhere}.changes-card{grid-column:1;grid-row:span 8;border-right:1px solid var(--border-subtle);padding-right:var(--ui-space-lg)}.team-grid>section:not(.changes-card){grid-column:2}.card-title,.semantic-merge>header,.change-list-editor>header{display:flex;justify-content:space-between;align-items:center;gap:var(--ui-space-sm);flex-wrap:wrap}.change-list{max-height:30vh;overflow:auto}.change-list .change-select{display:grid;width:100%;grid-template-columns:3ch minmax(0,1fr);align-items:center;gap:var(--ui-space-sm);padding:var(--ui-space-xs);text-align:left;border:0;border-bottom:1px solid var(--border-subtle);border-radius:0;background:transparent}.change-list .change-description{display:grid;min-width:0}.change-list strong,.change-list small{white-space:normal;overflow-wrap:anywhere}.change-select.selected{background:var(--selection-bg)}.change-list .added{color:var(--success)}.change-list .modified{color:var(--warning)}.change-list .deleted,.change-list .conflict{color:var(--danger)}.changes-card footer,.lock-actions,.conflict-summary{display:flex;gap:var(--ui-control-gap);flex-wrap:wrap;align-items:center}.team-grid label{display:grid;grid-template-columns:var(--ui-label-width) minmax(0,1fr);gap:var(--ui-space-sm);align-items:center}.team-grid label input{min-width:0}.incoming-picker button{min-width:0;overflow:hidden;text-overflow:ellipsis}.conflict-summary{color:var(--warning)}.lock-card>div:first-child{display:grid}.metadata-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:var(--ui-space-xs)}.metadata-row>*{min-width:0}.metadata-card ul,.binary-card ul{max-height:18vh;margin:0;padding:0;list-style:none;overflow:auto}.metadata-card li,.binary-card li{display:flex;justify-content:space-between;gap:var(--ui-space-xs);padding-block:var(--ui-space-xs);border-bottom:1px solid var(--border-subtle)}.network-card dl{margin:0}.network-card dl>div{display:grid;grid-template-columns:12ch minmax(0,1fr);gap:var(--ui-space-xs)}.network-card dd{margin:0;overflow-wrap:anywhere}.network-card dt{color:var(--text-muted)}
.inline-diff,.semantic-merge,.change-list-editor{border-top:1px solid var(--border-subtle);padding-top:var(--ui-space-sm)}.inline-diff header{display:flex;justify-content:space-between;gap:var(--ui-space-sm)}.inline-diff>div,.conflict-values19{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--ui-space-sm)}.inline-diff pre,.merge-conflict19 pre{max-height:280px;overflow:auto;padding:var(--ui-space-sm);background:var(--input-bg);font:var(--type-caption)/var(--line-body) var(--font-mono);white-space:pre-wrap;overflow-wrap:anywhere;min-width:0}.merge-conflict19{display:grid;gap:var(--ui-space-sm);padding-block:var(--ui-space-sm);border-bottom:1px solid var(--border-subtle)}.conflict-heading19{display:flex;flex-wrap:wrap;gap:var(--ui-space-xs)}.conflict-heading19 code{overflow-wrap:anywhere;white-space:pre-wrap}.conflict-values19>section{min-width:0;display:grid;gap:var(--ui-space-xs)}.change-list-editor>article{display:flex;justify-content:space-between;gap:var(--ui-space-sm);padding-block:var(--ui-space-xs);border-bottom:1px solid var(--border-subtle)}.change-list-editor>article>div{display:grid;min-width:0}.change-list-editor small{overflow-wrap:anywhere}.team-disabled{max-width:60ch;margin:auto;padding:var(--ui-space-xl);text-align:center}.team-disabled p{color:var(--text-muted)}
@container team-workflow(max-width:800px){.team-grid{grid-template-columns:minmax(0,1fr)}.team-grid>section,.team-grid>section:not(.changes-card){grid-column:1;grid-row:auto}.changes-card{border-right:0;padding-right:0}.metadata-row{grid-template-columns:minmax(0,1fr)}.conflict-values19{grid-template-columns:minmax(0,1fr)}}
</style>
