<template>
  <section class="script-studio" :class="{'compact-toolbar':scriptStudioState.layout.compactToolbar}" @keydown.ctrl.s.prevent="saveActive" @keydown.meta.s.prevent="saveActive">
    <header class="studio-toolbar">
      <div class="studio-title"><span class="studio-mark">{ }</span><div><strong>{{ t('scriptStudio') }}</strong><small>{{ t('scriptStudioDescription') }}</small></div></div>
      <div class="toolbar-actions">
        <select v-model="templateId" :title="t('scriptTemplate')"><option v-for="template in SCRIPT_TEMPLATES" :key="template.id" :value="template.id">{{ template.name }}</option></select>
        <button @click="createScript">＋ {{ t('newScript') }}</button>
        <button :disabled="!activeAsset || !activeDirty" class="primary" @click="saveActive">{{ t('saveScript') }}</button>
        <button :class="{ active: findOpen }" @click="findOpen = !findOpen">{{ t('findReplace') }}</button>
        <button :aria-pressed="scriptStudioState.layout.codeFocused" :aria-label="scriptStudioState.layout.codeFocused?layoutLabels.restorePanels:layoutLabels.focusCode" :title="scriptStudioState.layout.codeFocused?layoutLabels.restorePanels:layoutLabels.focusCode" @click="scriptStudioState.layout.codeFocused=!scriptStudioState.layout.codeFocused">⛶</button>
        <button :aria-expanded="paneLayout.primaryVisible" @click="toggleExplorer">{{ paneLayout.primaryVisible?t('hideExplorer'):t('showExplorer') }}</button>
        <button :aria-expanded="detailVisible" @click="toggleDetails">{{ layoutLabels.scriptDetails }}</button>
        <details class="studio-more"><summary>{{ layoutLabels.commands }}</summary><div class="studio-commands">
        <button :disabled="!selectedIdentifier" @click="goToDefinition">F12 {{ t('goToDefinition') }}</button>
        <button :disabled="!activeAsset" @click="formatActive">{{ t('formatCode') }}</button>
        <button :disabled="!selectedIdentifier" @click="showReferences">{{ t('references') }}</button>
        <div class="split-action"><button @click="runTests">▷ {{ t('runTests') }}</button><select v-model="testScope" :title="t('testScope')"><option value="file">{{ t('currentFile') }}</option><option value="project">{{ t('currentProject') }}</option><option value="tags">{{ t('selectedTags') }}</option><option value="failed">{{ t('failedTests') }}</option><option value="headless">{{ t('copyHeadlessCommand') }}</option></select></div>
        <button @click="toggleScriptDetailDock">{{ scriptStudioState.layout.detailDock === 'right' ? t('dockBottom') : t('dockRight') }}</button>
        <span class="toolbar-spacer"></span>
        <button :disabled="!debug.paused" @click="runtime.debugContinue">▶ {{ t('continueExecution') }}</button>
        <button :disabled="!debug.paused" @click="runtime.debugStep('into')">↓ {{ t('stepInto') }}</button>
        <button :disabled="!debug.paused" @click="runtime.debugStep('over')">↦ {{ t('stepOver') }}</button>
        <button :disabled="!debug.paused" @click="runtime.debugStep('out')">↑ {{ t('stepOut') }}</button>
        <button @click="runtime.debugRestart">↻ {{ t('restart') }}</button>
        <label class="compact-setting"><input v-model="scriptStudioState.layout.compactToolbar" type="checkbox">{{ layoutLabels.compactToolbar }}</label>
        </div></details>
      </div>
    </header>
    <StudioDraftConflict v-if="sourceDraftConflict" :saved-source="currentSavedSource" :draft-source="draft" @keep="acceptSourceDraftBase" @discard="discardSourceDraft" />

    <div ref="studioGrid" data-measured-studio-layout :style="gridStyle" :class="['studio-grid', { 'detail-bottom': detailBottom, 'explorer-hidden': !paneLayout.primaryVisible, 'detail-hidden': !detailVisible, 'drawer-layout':paneLayout.drawer }]">
      <aside v-show="paneLayout.primaryVisible" class="project-scripts" :style="{width:paneLayout.primaryWidth+'px'}">
        <PanelResizeHandle v-if="!paneLayout.drawer" v-model="scriptStudioState.layout.explorerWidth" orientation="vertical" :minimum="184" :maximum="Math.max(184,Math.min(480,studioSize.width-440))" :reset-value="224" :label="layoutLabels.resizeExplorer" style="right:0;top:0;bottom:0" />
        <div class="pane-heading"><strong>{{ t('projectScripts') }}</strong><span>{{ scripts.length }}</span><button :aria-label="t('hideExplorer')" @click="scriptStudioState.layout.explorerVisible=false">×</button></div>
        <input v-model="projectQuery" type="search" :placeholder="t('searchProject')">
        <div class="script-list">
          <button v-for="asset in filteredScripts" :key="asset.uuid" :class="{ active: asset.uuid === activeAsset?.uuid }" @click="open(asset.uuid)">
            <span class="file-icon">R</span><span><strong>{{ asset.name }}</strong><small>{{ asset.path }}</small></span>
          </button>
        </div>
        <div v-if="projectQuery" class="search-results">
          <button v-for="result in projectMatches" :key="`${result.uuid}:${result.line}`" @click="openAt(result.uuid, result.line)">
            <strong>{{ result.name }}:{{ result.line }}</strong><small>{{ result.preview }}</small>
          </button>
          <p v-if="!projectMatches.length">{{ t('noResults') }}</p>
        </div>
      </aside>

      <main class="code-workspace">
        <nav class="file-tabs">
          <div v-for="asset in openAssets" :key="asset.uuid" class="file-tab" :class="{active:asset.uuid===activeAsset?.uuid}"><button :class="{ active: asset.uuid === activeAsset?.uuid }" @click="open(asset.uuid)"><span :class="['dirty-dot', { visible: dirtyUuids.has(asset.uuid) }]">●</span>{{ asset.name }}</button><button :aria-label="t('close')+' '+asset.name" class="close-file" @click="close(asset.uuid)">×</button></div>
          <span></span>
          <button class="icon-button" :title="t('closeAll')" @click="closeAll">×</button>
        </nav>

        <div v-if="findOpen" class="find-bar">
          <input ref="findInput" v-model="findText" :placeholder="t('find')" @keydown.enter.prevent="findNext">
          <input v-model="replaceText" :placeholder="t('replace')">
          <button @click="findNext">↓</button><button @click="replaceOne">{{ t('replace') }}</button><button @click="replaceAll">{{ t('replaceAll') }}</button>
          <span>{{ findCount }}</span><button @click="findOpen = false">×</button>
        </div>

        <div v-if="activeAsset" class="editor-shell">
          <div class="gutter" aria-label="Breakpoints">
            <button v-for="line in lineCount" :key="line" :class="{ breakpoint: breakpoints.includes(line), error: diagnosticLines.has(line) }" :title="t('toggleBreakpoint')" @click="toggleBreakpoint(line)"><span></span>{{ line }}</button>
          </div>
          <textarea ref="editor" v-model="draft" :aria-label="activeAsset.name" spellcheck="false" autocomplete="off" autocapitalize="off" @input="sourceChanged" @click="cursorChanged" @keyup="cursorChanged" @scroll="syncScroll" @keydown.tab.prevent="insertTab" @keydown.ctrl.space.prevent="requestCompletions" @keydown.meta.space.prevent="requestCompletions"></textarea>
          <div v-if="completionOpen" class="completion-popover">
            <button v-for="item in completions" :key="item" @mousedown.prevent="insertCompletion(item)"><b>ƒ</b><span>{{ item }}</span></button>
            <p v-if="!completions.length">{{ t('noCompletions') }}</p>
          </div>
          <div v-if="contextApi" class="signature-help"><code>{{ contextApi.signature }}</code><span>{{ contextApi.detail }}</span></div>
        </div>
        <div v-else class="empty-editor"><span>{ }</span><h2>{{ t('openScriptPrompt') }}</h2><p>{{ t('openScriptDescription') }}</p><button class="primary" @click="createScript">{{ t('createFirstScript') }}</button></div>

        <footer class="editor-status">
          <span :class="scriptHasErrors ? 'status-error' : 'status-ok'">{{ scriptHasErrors ? t('errorsCount', { count: analysis.diagnostics.filter(item => item.severity === 'error').length || 1 }) : t('scriptValid') }}</span>
          <span v-if="linkedGraphUuid" class="linked-graph-status">↔ {{ t('linkedVisualGraph') }}</span>
          <span :class="scriptIndexState.status === 'error' ? 'status-error' : 'status-ok'">Index {{ scriptIndexState.documentCount }} / {{ scriptIndexState.symbolCount }}</span>
          <span>{{ t('lineColumn', { line: cursor.line, column: cursor.column }) }}</span>
      <span>Rhai API v{{ activeAsset?.script?.apiVersion ?? 2 }} · UTF-8 · {{ analysis.elapsedMs.toFixed(1) }} ms</span><span>{{ t('engineVersion') }} {{ NOVA_RELEASE_NAME }}</span>
        </footer>
      </main>

      <aside v-show="detailVisible" class="studio-inspector" :style="inspectorStyle">
        <PanelResizeHandle v-if="!paneLayout.drawer" v-model="scriptStudioState.layout.detailWidth" v-show="!detailBottom" orientation="vertical" :minimum="224" :maximum="Math.max(224,Math.min(560,studioSize.width-440))" :reset-value="328" reverse :label="layoutLabels.resizeInspector" style="left:0;top:0;bottom:0" />
        <PanelResizeHandle v-if="!paneLayout.drawer" v-model="scriptStudioState.layout.detailHeight" v-show="detailBottom" orientation="horizontal" :minimum="140" :maximum="Math.max(140,studioSize.height-220)" :reset-value="220" reverse :label="layoutLabels.resizeInspector" style="left:0;top:0;right:0" />
        <button class="close-inspector" :aria-label="t('close')" @click="scriptStudioState.layout.detailVisible=false">×</button>
        <nav class="inspector-tabs">
          <button :class="{ active: inspectorTab === 'conversion' }" @click="inspectorTab = 'conversion'">{{ conversionLabels.title }}</button>
          <button v-for="tab in inspectorTabs" :key="tab.id" :class="{ active: inspectorTab === tab.id }" @click="inspectorTab = tab.id">{{ t(tab.label) }}</button>
        </nav>

        <ScriptConversionPanel v-if="inspectorTab === 'conversion'" class="inspector-pane" :assessment="conversionAssessment" :source="draft" @navigate="navigateConversion" />
        <div v-else-if="inspectorTab === 'problems'" class="inspector-pane">
          <div class="pane-heading"><strong>{{ t('diagnostics') }}</strong><span>{{ analysis.diagnostics.length }}</span><button :aria-label="t('documentation')" @click="openBundledManual('script-studio')">?</button></div>
          <p v-if="validationError" class="source-save-error" role="alert">{{ validationError }}</p>
          <button v-for="item in analysis.diagnostics" :key="`${item.code}:${item.line}:${item.column}`" class="problem" @click="focusSourceRange(spanAt(draft,item.line,item.column,item.endLine,item.endColumn))"><i :class="item.severity"></i><span><strong>{{ item.message }}</strong><small>{{ item.code }} · {{ item.phase }} · {{ t('lineColumn', { line: item.line, column: item.column }) }}</small></span></button>
          <button v-for="action in codeActions" :key="`${action.code}:${action.line}`" class="code-action" @click="applyCodeAction(action)">⚡ {{ action.title }}</button>
          <p v-if="!analysis.diagnostics.length" class="empty-pane">✓ {{ t('noDiagnostics') }}</p>
        </div>

        <div v-else-if="inspectorTab === 'symbols'" class="inspector-pane">
          <div class="pane-heading"><strong>{{ t('outline') }}</strong><button :disabled="!selectedIdentifier" @click="beginRenameSymbol">F2</button></div>
          <button v-for="symbol in analysis.symbols" :key="`${symbol.name}:${symbol.line}`" class="symbol" @click="focusLine(symbol.line, symbol.column)"><i>{{ symbol.kind === 'function' || symbol.kind === 'test' ? 'ƒ' : 'v' }}</i><span>{{ symbol.name }}</span><small>{{ symbol.line }}</small></button>
          <h3 v-if="referenceResults.length">{{ t('references') }}</h3><button v-for="reference in referenceResults" :key="`${reference.uuid}:${reference.line}:${reference.column}`" class="symbol" @click="openAt(reference.uuid, reference.line)"><i>↗</i><span>{{ reference.name }}</span><small>{{ reference.line }}:{{ reference.column }}</small></button>
        </div>

        <div v-else-if="inspectorTab === 'types'" class="inspector-pane type-pane">
          <div class="pane-heading"><strong>{{ t('typesAndStatements') }}</strong><span>{{ analysis.types.length }} · {{ analysis.statements.length }}</span></div>
          <p class="pane-help">{{ t('optionalTypeHint') }}</p>
          <h3>{{ t('inferredTypes') }}</h3>
          <button v-for="item in analysis.types" :key="`${item.name}:${item.line}`" class="symbol type-symbol" @click="focusLine(item.line)"><i>{{ item.declared ? 'T' : '≈' }}</i><span><b>{{ item.name }}</b><small>{{ item.confidence }} · {{ item.source }}</small></span><code>{{ item.type }}</code></button>
          <p v-if="!analysis.types.length" class="empty-pane">{{ t('noTypeInformation') }}</p>
          <h3>{{ t('dataStructures') }}</h3>
          <article v-for="structure in analysis.structures" :key="`${structure.name}:${structure.line}`" class="type-structure"><strong>{{ structure.name }}</strong><small>{{ structure.fields.map(field => `${field.name}${field.optional ? '?' : ''}: ${field.type}`).join(' · ') }}</small></article>
          <h3>{{ t('genericHelpers') }}</h3>
          <article v-for="helper in analysis.genericHelpers" :key="`${helper.functionName}:${helper.line}`" class="type-structure"><strong>{{ helper.functionName }}&lt;{{ helper.parameters.join(', ') }}&gt;</strong><small>{{ Object.entries(helper.constraints).map(([name, values]) => `${name}: ${values.join(' | ')}`).join(' · ') }}</small></article>
          <h3>{{ t('statementMap') }}</h3>
          <button v-for="statement in analysis.statements.slice(0, 500)" :key="statement.id" class="symbol statement" @click="focusLine(statement.line,statement.column)"><i>{{ statement.kind.slice(0,1).toUpperCase() }}</i><span><b>{{ statement.functionName || t('moduleScope') }}</b><small>{{ statement.normalized }}</small></span><code>{{ statement.line }}</code></button>
        </div>

        <div v-else-if="inspectorTab === 'modules'" class="inspector-pane">
          <div class="pane-heading"><strong>{{ t('scriptModules') }}</strong><span>{{ analysis.dependencies.length }}</span></div>
          <p class="pane-help">{{ t('moduleHelp') }}</p>
          <button v-for="item in projectModuleDiagnostics" :key="item.cycle.join('|')" class="problem" @click="openModuleDiagnostic(item.uri)"><i class="error"></i><span><strong>{{ item.message }}</strong><small>{{ item.code }}</small></span></button>
          <label><span>{{ t('scriptApiVersion') }}</span><select :value="activeAsset?.script?.apiVersion ?? 2" @change="setApiVersion(Number(($event.target as HTMLSelectElement).value))"><option :value="2">API v2</option><option v-if="activeAsset?.script?.apiVersion === 1" :value="1" disabled>API v1 · {{ t('compatibilityMode') }}</option></select></label>
          <label><span>{{ t('scriptPackage') }}</span><input :value="activeAsset?.script?.packageName" maxlength="128" @change="setPackageName(($event.target as HTMLInputElement).value)"></label>
          <label><span>{{ t('hotReloadPolicy') }}</span><select :value="activeAsset?.script?.reloadPolicy" @change="setReloadPolicy(($event.target as HTMLSelectElement).value)"><option value="preserve">{{ t('preserveState') }}</option><option value="recreate">{{ t('recreateState') }}</option><option value="disabled">{{ t('disabled') }}</option></select></label>
          <p :class="['hot-reload-state', debug.hotReload.status]">{{ debug.hotReload.message || t('hotReloadWaiting') }}</p>
          <button :disabled="!activeAsset || !canRollbackReload" @click="rollbackReload">↶ {{ t('rollbackHotReload') }}</button>
          <details v-if="reloadHistory.length"><summary>{{ t('reloadHistory') }} · {{ reloadHistory.length }}</summary><article v-for="entry in reloadHistory.slice(0,12)" :key="entry.id" class="reload-entry"><strong>{{ entry.status }} · {{ entry.classification }}</strong><small>{{ entry.candidateHash }} · {{ entry.message }}</small></article></details>
          <code v-for="dependency in analysis.dependencies" :key="dependency">{{ dependency }}</code>
          <div class="dependency-editor"><input v-model="packageDraft" :placeholder="t('packageDependency')" @keydown.enter="addPackage"><button @click="addPackage">＋</button></div>
          <label v-for="dependency in packageDependencies" :key="dependency"><span>◇ {{ dependency }}</span><button @click="removePackage(dependency)">×</button></label>
          <small>{{ t('readOnlyPackages') }}</small>
        </div>

        <div v-else-if="inspectorTab === 'contract'" class="inspector-pane contract-pane">
          <div class="pane-heading"><strong>{{ t('behaviorContract') }}</strong><span :class="contractReport.valid ? 'contract-valid' : 'contract-invalid'">{{ t(contractReport.valid ? 'contractValid' : 'contractInvalid') }}</span></div>
          <p class="pane-help">{{ t('behaviorContractHint') }}</p>
          <button class="contract-action" @click="insertContractHeader">＋ {{ t('addContractHeader') }}</button>
          <div class="contract-flags"><span :class="{ enabled: contractReport.contract.strict }">{{ t('strictBehavior') }}</span><span :class="{ enabled: contractReport.contract.deterministic }">{{ t('deterministicBehavior') }}</span></div>
          <h3>{{ t('runtimeBudgets') }}</h3>
          <div class="contract-metrics"><article><span>{{ t('commandsPerCallback') }}</span><strong>{{ contractReport.contract.budgets.commands }}</strong></article><article><span>{{ t('logsPerCallback') }}</span><strong>{{ contractReport.contract.budgets.logs }}</strong></article></div>
          <h3>{{ t('requirements') }}</h3>
          <article v-for="requirement in contractReport.contract.requirements" :key="`${requirement.kind}:${requirement.value}`" class="contract-row"><span>{{ requirement.kind }}</span><code>{{ requirement.value }}</code><small>{{ t('lineColumn', { line: requirement.line, column: 1 }) }}</small></article>
          <p v-if="!contractReport.contract.requirements.length" class="empty-pane">{{ t('noContractRequirements') }}</p>
          <h3>{{ t('apiUsage') }}</h3>
          <article v-for="entry in contractReport.apiUsage" :key="entry.name" class="contract-row api"><span>{{ entry.module }}</span><code>{{ entry.name }}</code><small>{{ entry.threadRule }} · {{ entry.determinism }}<template v-if="entry.permissions.length"> · {{ entry.permissions.join(', ') }}</template></small></article>
          <p v-if="!contractReport.apiUsage.length" class="empty-pane">{{ t('noApiUsage') }}</p>
          <h3 v-if="contractReport.diagnostics.length">{{ t('diagnostics') }}</h3>
          <button v-for="item in contractReport.diagnostics" :key="`${item.code}:${item.line}`" class="problem" @click="focusLine(item.line, 1)"><i :class="item.severity"></i><span><strong>{{ item.message }}</strong><small>{{ item.code }} · {{ t('lineColumn', { line: item.line, column: 1 }) }}</small></span></button>
        </div>

        <div v-else-if="inspectorTab === 'debug'" class="inspector-pane debug-pane">
          <div class="pane-heading"><strong>{{ t('scriptDebugger') }}</strong><span :class="{ paused: debug.paused }">{{ debug.paused ? t('paused') : t('running') }}</span></div>
          <p>{{ debug.reason || t('debuggerWaiting') }}</p>
          <h3>{{ t('callStack') }}</h3><button v-for="(frame,index) in debug.callStack" :key="`${frame.entityUuid}:${index}`" :class="{ active: debug.selectedFrame === index }" @click="selectFrame(index,frame.scriptUuid,frame.line)">{{ frame.entityName }} · {{ frame.functionName }}:{{ frame.line }}</button>
          <h3>{{ t('breakpoints') }}</h3><article v-for="point in breakpointDetails" :key="point.id" class="breakpoint-detail"><label><input v-model="point.enabled" type="checkbox"><span>{{ point.line }}</span></label><input v-model="point.group" :placeholder="t('breakpointGroup')"><input v-model="point.functionName" :placeholder="t('functionBreakpoint')"><input v-model="point.condition" :placeholder="t('condition')"><input v-model.number="point.hitCondition" type="number" min="0" max="1000000" :placeholder="t('hitCount')"><input v-model="point.logMessage" :placeholder="t('logpointMessage')"><button @click="removeDetailedBreakpoint(point.id)">×</button></article>
          <button @click="addFunctionBreakpoint">＋ {{ t('functionBreakpoint') }}</button>
          <h3>{{ t('exceptionPolicy') }}</h3><select v-model="scriptProjectSettings.exceptionPolicy"><option value="never">{{ t('never') }}</option><option value="uncaught">{{ t('uncaught') }}</option><option value="all">{{ t('allExceptions') }}</option></select>
          <h3>{{ t('tasks') }}</h3><label v-for="task in debug.tasks" :key="task.id"><span><b>{{ task.name }}</b><small>{{ task.state }} · {{ task.detail }}</small></span><button v-if="['queued','running','waiting'].includes(task.state)" :title="t('cancelTask')" @click="runtime.cancelDebugTask(task.id)">×</button></label><p v-if="!debug.tasks.length" class="empty-pane">{{ t('noDebugTasks') }}</p>
          <h3>{{ t('remoteDebugging') }}</h3><p>{{ scriptProjectSettings.remoteDebug.enabled ? `${scriptProjectSettings.remoteDebug.host}:${scriptProjectSettings.remoteDebug.port} · ${debug.remotePeer?.authenticated ? t('authenticated') : t('waitingForAuthenticatedPlayer')}` : t('remoteDebugDisabled') }}</p>
          <h3>{{ t('locals') }}</h3><pre>{{ formattedLocals }}</pre>
          <h3>{{ t('watches') }}</h3><div class="dependency-editor"><input v-model="watchDraft" :placeholder="t('watchExpression')" @keydown.enter="addWatch"><button @click="addWatch">＋</button></div>
          <label v-for="watch in debug.watches" :key="watch.id"><span><b>{{ watch.expression }}</b><small :class="{ error: watch.error }">{{ watch.error || watch.value }}</small></span><button @click="removeDebugWatch(watch.id)">×</button></label>
        </div>

        <div v-else-if="inspectorTab === 'tests'" class="inspector-pane">
          <div class="pane-heading"><strong>{{ t('scriptTests') }}</strong><button @click="runTests">▷</button></div>
          <div class="coverage-summary"><span>{{ t('functionCoverage') }} <b>{{ percent(coverage.functionRate) }}</b></span><span>{{ t('lineCoverage') }} <b>{{ percent(coverage.lineRate) }}</b></span><span>{{ t('apiCoverage') }} <b>{{ percent(coverage.bindingRate) }}</b></span></div>
          <input v-model="testTags" :placeholder="t('testTags')">
          <article v-for="result in debug.testResults" :key="`${result.script}:${result.test}:${result.caseName}`" class="test-result"><i :class="{ passed: result.passed, skipped: result.skipped }">{{ result.skipped ? '–' : result.passed ? '✓' : '!' }}</i><span><strong>{{ result.test }}{{ result.caseName ? ` · ${result.caseName}` : '' }}</strong><small>{{ result.script }} · {{ result.durationMs.toFixed(2) }} ms · seed {{ result.seed }} · {{ result.message }}</small><small v-if="result.tags.length">#{{ result.tags.join(' #') }}</small></span></article>
          <p v-if="!debug.testResults.length" class="empty-pane">{{ t('noTestResults') }}</p>
        </div>

        <div v-else-if="inspectorTab === 'signals'" class="inspector-pane">
          <div class="pane-heading"><strong>{{ t('signals') }}</strong><span>{{ signals.length }}</span></div>
          <div class="dependency-editor"><input v-model="signalDraft" :placeholder="t('signalName')" @keydown.enter="addSignal"><button @click="addSignal">＋</button></div>
          <label v-for="signal in signals" :key="signal"><button class="emit" @click="runtime.emitSignal(signal)">●</button><span>{{ signal }}</span><button @click="removeSignal(signal)">×</button></label>
          <div class="dependency-editor"><input v-model="connectionSignalDraft" :placeholder="t('signalName')"><input v-model="connectionCallbackDraft" :placeholder="t('callback')"><button @click="addSignalConnection">＋</button></div>
          <label v-for="(connection,index) in signalConnections" :key="`${connection.signal}:${connection.callback}:${index}`"><input v-model="connection.enabled" type="checkbox"><span>{{ connection.signal }} → {{ connection.callback }}</span><button @click="removeSignalConnection(index)">×</button></label>
          <small>{{ t('signalSources') }}</small>
        </div>

        <div v-else class="inspector-pane api-reference">
          <div class="pane-heading"><strong>{{ t('engineApi') }} v2</strong><span>{{ filteredApi.length }} · {{ deprecatedCount }} {{ t('deprecated') }}</span></div>
          <input v-model="apiQuery" type="search" :placeholder="t('searchApi')">
          <article v-for="entry in filteredApi" :key="entry.signature"><small>{{ entry.namespace }} · API {{ entry.since }}</small><code>{{ entry.signature }}</code><p>{{ entry.detail }}</p><pre>{{ entry.example }}</pre><b v-if="entry.deprecated">{{ t('deprecated') }} → {{ entry.deprecated.replacement }} ({{ entry.deprecated.removal }})</b><button @click="openBundledManual">{{ t('documentation') }}</button></article>
        </div>
      </aside>
    </div>
    <div v-if="renameOpen" class="rename-overlay" @mousedown.self="renameOpen = false">
      <form class="rename-card" @submit.prevent="confirmRenameSymbol">
        <strong>{{ t('renameSymbol') }}</strong><p>{{ conversionLabels.renameScope.replace('{name}',renameSource) }}</p>
        <input ref="renameInput" v-model="renameDraft" pattern="[A-Za-z_][A-Za-z0-9_]*" maxlength="80" required>
        <div><button type="button" @click="renameOpen = false">{{ t('cancel') }}</button><button class="primary" type="submit">{{ t('rename') }}</button></div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { NOVA_RELEASE_NAME } from '../projects/projectFormat'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { createTextAsset, readTextAsset, updateTextAsset, assetState } from '../assets/AssetDatabase'
import { defaultScriptMetadata, type ScriptBreakpointMetadata } from '../assets/types'
import { t } from '../i18n'
import { addEditorLog } from '../store/editor'
import { pushHistory } from '../store/physics'
import { requestConfirmation } from '../store/dialog'
import { gameplayRuntime as runtime } from '../runtime/GameplayRuntime'
import { scriptDebugState as debug, addDebugWatch, removeDebugWatch, selectDebugFrame } from '../runtime/scriptDebug'
import { scriptProjectSettings } from '../runtime/scriptSettings'
import { SCRIPT_API, apiEntry } from '../editor/scriptApi'
import { ScriptLanguageService, analyzeScript, applyScriptLintPolicy, completionItems, type ScriptAnalysis } from '../editor/scriptLanguage'
import { closeScriptAsset, openScriptAsset, scriptStudioState, toggleScriptDetailDock } from '../editor/scriptStudioState'
import { findScriptReferences, formatScript, renameScriptSymbol, scriptCodeActions, type ScriptCodeAction } from '../editor/scriptLanguage'
import { openBundledManual } from '../runtime/openManual'
import { SCRIPT_TEMPLATES, scriptTemplate, type ScriptTemplateId } from '../editor/scriptTemplates'
import { hotReloadHistory, scriptHotReloadState } from '../runtime/scriptHotReload'
import { scriptCoverageReport, scriptCoverageState } from '../runtime/scriptCoverage'
import { markScriptIndexApiChanged, rebuildAndPersistScriptIndex, restoreScriptIndex, scriptIndexState } from '../editor/scriptIndexPersistence'
import { assessRhaiConversion, ensureLinkedGraphForScript, linkedScriptGraphUuid } from '../visual/graphCodeSync'
import { parseGraphDocument } from '../visual/graphTypes'
import { preferencesState } from '../store/preferences'
import ScriptConversionPanel from './ScriptConversionPanel.vue'
import { conversionCopy, sourceOffsetFromTextarea, spanAt, textareaSelection, type ConversionNavigation, type ConversionSnapshot, type ConversionSpan } from '../editor/scriptConversionPresentation'
import { parseScriptContract, scriptContractHeader } from '../runtime/scriptContracts'
import { analyzeModuleGraph, remapStatementLines } from '../editor/scriptLanguage26'
import { parseRhai } from '../visual/rhaiSyntax'
import PanelResizeHandle from './PanelResizeHandle.vue'
import { studioPaneLayout } from '../editor/studioPaneLayout'
import { studioLayoutCopy } from '../editor/studioLayoutCopy'
import {projectSessionState} from '../projects/projectSession'
import {retainStudioDraft,readStudioDraft,clearStudioDraft,registerStudioDraftOwner,type StudioDraftCandidate} from '../editor/studioDraftRetention'
import {queueInitialGraphLayout} from '../visual/graphStudioState'
import StudioDraftConflict from './StudioDraftConflict.vue'
import {objectOwnershipCopy} from '../editor/objectOwnershipCopy'
import {pendingObjectAuthorNavigation,objectCallbackSpan} from '../editor/objectAuthorNavigation'

const service = new ScriptLanguageService()
const studioGrid=ref<HTMLElement|null>(null),studioSize=reactive({width:1200,height:600})
let studioResizeObserver:ResizeObserver|null=null
const layoutLabels=computed(()=>studioLayoutCopy[preferencesState.locale])
const detailBottom=computed(()=>scriptStudioState.layout.detailDock==='bottom'&&studioSize.width>=640&&studioSize.height>=360)
const paneLayout=computed(()=>studioPaneLayout({width:studioSize.width,primaryOpen:scriptStudioState.layout.explorerVisible,secondaryOpen:scriptStudioState.layout.detailVisible&&!detailBottom.value,primaryWidth:scriptStudioState.layout.explorerWidth,secondaryWidth:scriptStudioState.layout.detailWidth,activePanel:scriptStudioState.layout.activePanel==='explorer'?'primary':'secondary',focused:scriptStudioState.layout.codeFocused}))
const detailVisible=computed(()=>detailBottom.value?scriptStudioState.layout.detailVisible&&!scriptStudioState.layout.codeFocused:paneLayout.value.secondaryVisible)
const detailHeight=computed(()=>Math.max(140,Math.min(scriptStudioState.layout.detailHeight,studioSize.height-220)))
const gridStyle=computed(()=>({gridTemplateColumns:paneLayout.value.columns,gridTemplateRows:detailBottom.value&&detailVisible.value?`minmax(0,1fr) ${detailHeight.value}px`:'minmax(0,1fr)'}))
const inspectorStyle=computed(()=>({width:detailBottom.value?'auto':paneLayout.value.secondaryWidth+'px',height:detailBottom.value?detailHeight.value+'px':'auto'}))
function toggleExplorer(){if(paneLayout.value.primaryVisible){scriptStudioState.layout.explorerVisible=false;return}scriptStudioState.layout.codeFocused=false;scriptStudioState.layout.explorerVisible=true;scriptStudioState.layout.activePanel='explorer'}
function toggleDetails(){if(detailVisible.value){scriptStudioState.layout.detailVisible=false;return}scriptStudioState.layout.codeFocused=false;scriptStudioState.layout.detailVisible=true;scriptStudioState.layout.activePanel='detail'}
const emit = defineEmits<{ navigate: [request: ConversionNavigation] }>()
const conversionLabels = computed(() => conversionCopy[preferencesState.locale])
const editor = ref<HTMLTextAreaElement | null>(null), findInput = ref<HTMLInputElement | null>(null), renameInput = ref<HTMLInputElement | null>(null)
const drafts = reactive<Record<string, string>>({}), dirtyUuids = reactive(new Set<string>())
const draft = computed({ get: () => activeAsset.value ? drafts[activeAsset.value.uuid] ?? '' : '', set: value => { if (activeAsset.value) drafts[activeAsset.value.uuid] = value } })
const emptyAnalysis = (): ScriptAnalysis => ({ apiVersion: 2, revision: 0, elapsedMs: 0, diagnostics: [], symbols: [], dependencies: [], functions: {}, references: [], tests: [], semanticTokens: [], apiUsage: [], types: [], structures: [], genericHelpers: [], statements: [] })
const analysis = ref<ScriptAnalysis>(emptyAnalysis()), validationError = ref('')
const scriptHasErrors = computed(() => !!validationError.value || analysis.value.diagnostics.some(item=>item.severity==='error'))
const projectQuery = ref(''), findOpen = ref(false), findText = ref(''), replaceText = ref(''), completionOpen = ref(false)
const templateId = ref<ScriptTemplateId>('component')
const cursor = reactive({ line: 1, column: 1 }), inspectorTab = ref<'conversion' | 'problems' | 'symbols' | 'types' | 'modules' | 'contract' | 'debug' | 'tests' | 'signals' | 'api'>('problems')
const packageDraft = ref(''), watchDraft = ref(''), signalDraft = ref(''), connectionSignalDraft = ref(''), connectionCallbackDraft = ref(''), apiQuery = ref('')
const testScope = ref<'file' | 'project' | 'tags' | 'failed' | 'headless'>('file'), testTags = ref('')
const renameOpen = ref(false), renameSource = ref(''), renameDraft = ref('')
let renameSelection:{uuid:string;source:string;offset:number}|null=null
const referenceResults = ref<Array<{ uuid: string; name: string; line: number; column: number }>>([])
let analysisRevision = 0
const inspectorTabs = [
  { id: 'problems' as const, label: 'problems' }, { id: 'symbols' as const, label: 'symbols' }, { id: 'types' as const, label: 'types' }, { id: 'modules' as const, label: 'modules' }, { id: 'contract' as const, label: 'behaviorContract' },
  { id: 'debug' as const, label: 'debug' }, { id: 'tests' as const, label: 'tests' }, { id: 'signals' as const, label: 'signals' }, { id: 'api' as const, label: 'api' }
]
const scripts = computed(() => { void assetState.generation; return assetState.records.filter(asset => asset.assetType === 'script').sort((a, b) => a.path.localeCompare(b.path)) })
const activeAsset = computed(() => scripts.value.find(asset => asset.uuid === scriptStudioState.activeUuid) ?? null)
const draftProjectId=projectSessionState.id,baseSources=reactive<Record<string,string|null>>({})
const currentSavedSource=computed(()=>{void assetState.generation;return activeAsset.value?readTextAsset(activeAsset.value.uuid):null})
const sourceDraftConflict=computed(()=>!!activeAsset.value&&dirtyUuids.has(activeAsset.value.uuid)&&baseSources[activeAsset.value.uuid]!==currentSavedSource.value)
function sourceDraftCandidate():StudioDraftCandidate|null {const asset=activeAsset.value;return asset&&dirtyUuids.has(asset.uuid)?{record:asset,projectId:draftProjectId,kind:'code',source:draft.value,baseSource:baseSources[asset.uuid]??null}:null}
const unregisterDraftOwner=registerStudioDraftOwner({read:sourceDraftCandidate,discard:discardSourceDraft})
function retainSourceDraft(){const candidate=sourceDraftCandidate();if(candidate)retainStudioDraft(candidate)}
function acceptSourceDraftBase(){if(!activeAsset.value)return;baseSources[activeAsset.value.uuid]=currentSavedSource.value;validationError.value='';retainSourceDraft()}
function discardSourceDraft(){const asset=activeAsset.value;if(!asset)return;const saved=readTextAsset(asset.uuid);drafts[asset.uuid]=saved??'';baseSources[asset.uuid]=saved;dirtyUuids.delete(asset.uuid);if(asset.script)asset.script.recoverySource='';clearStudioDraft(asset,draftProjectId);scriptStudioState.activeDirty=false;validationError.value='';void analyzeCurrent()}
const activeDirty = computed(() => !!activeAsset.value && dirtyUuids.has(activeAsset.value.uuid))
const contractReport = computed(() => parseScriptContract(draft.value))
const linkedGraphUuid = computed(() => activeAsset.value ? linkedScriptGraphUuid(activeAsset.value.uuid) : '')
const linkedGraph = computed(() => {
  void assetState.generation
  if (!linkedGraphUuid.value) return undefined
  for (const asset of assetState.records.filter(item => item.assetType === 'visualScript')) {
    try { const document = parseGraphDocument(readTextAsset(asset.uuid) ?? ''); if (document.uuid === linkedGraphUuid.value) return document } catch { /* A malformed linked graph is reported by its editor. */ }
  }
  return undefined
})
const conversionAssessment = computed(() => assessRhaiConversion(draft.value, activeAsset.value?.name, linkedGraph.value))
function getConversionSnapshot(): ConversionSnapshot | null { return activeAsset.value ? { source: draft.value, assetUuid: activeAsset.value.uuid, assessment: conversionAssessment.value } : null }
function navigateConversion(request: ConversionNavigation) { if (request.target === 'code') focusSourceRange(request.span); else emit('navigate', request) }
defineExpose({ getConversionSnapshot, focusSourceRange })
const openAssets = computed(() => scriptStudioState.openTabs.flatMap(uuid => scripts.value.find(asset => asset.uuid === uuid) ?? []))
const filteredScripts = computed(() => { const q = projectQuery.value.trim().toLowerCase(); return q ? scripts.value.filter(asset => `${asset.name} ${asset.path}`.toLowerCase().includes(q)) : scripts.value })
const projectMatches = computed(() => {
  const q = projectQuery.value.trim().toLowerCase(); if (!q) return []
  return scripts.value.flatMap(asset => (drafts[asset.uuid] ?? readTextAsset(asset.uuid) ?? '').split(/\r?\n/).flatMap((line, index) => line.toLowerCase().includes(q) ? [{ uuid: asset.uuid, name: asset.name, line: index + 1, preview: line.trim().slice(0, 120) }] : [])).slice(0, 100)
})
const lineCount = computed(() => Math.max(1, draft.value.split(/\r?\n/).length))
const breakpoints = computed(() => activeAsset.value?.script?.breakpoints ?? [])
const breakpointDetails = computed(() => activeAsset.value?.script?.breakpointDetails ?? [])
const diagnosticLines = computed(() => new Set(analysis.value.diagnostics.filter(item => item.severity === 'error').map(item => item.line)))
const packageDependencies = computed(() => activeAsset.value?.script?.packageDependencies ?? [])
const signals = computed(() => scriptProjectSettings.customSignals)
const signalConnections = computed(() => activeAsset.value?.script?.signalConnections ?? [])
const completions = computed(() => completionItems(wordBeforeCursor.value, analysis.value))
const codeActions = computed(() => scriptCodeActions(analysis.value))
const wordBeforeCursor = computed(() => { const pos = editor.value?.selectionStart ?? 0; return draft.value.slice(0, pos).match(/[A-Za-z_][A-Za-z0-9_]*$/)?.[0] ?? '' })
const selectedIdentifier = computed(() => { void cursor.line;void cursor.column;const el = editor.value; if (!el) return ''; const start=sourceOffsetFromTextarea(draft.value,el.selectionStart),end=sourceOffsetFromTextarea(draft.value,el.selectionEnd),selected = draft.value.slice(start,end); if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(selected)) return selected; const before = draft.value.slice(0,start).match(/[A-Za-z_][A-Za-z0-9_]*$/)?.[0] ?? ''; const after = draft.value.slice(start).match(/^[A-Za-z0-9_]*/)?.[0] ?? ''; return `${before}${after}` })
const contextApi = computed(() => apiEntry(selectedIdentifier.value || wordBeforeCursor.value))
const findCount = computed(() => findText.value ? (draft.value.match(new RegExp(escapeRegex(findText.value), 'gi')) ?? []).length : 0)
const formattedLocals = computed(() => JSON.stringify(debug.locals, null, 2).slice(0, 12000))
const filteredApi = computed(() => { const q = apiQuery.value.toLowerCase(); return q ? SCRIPT_API.filter(entry => `${entry.name} ${entry.category} ${entry.detail}`.toLowerCase().includes(q)) : SCRIPT_API })
const deprecatedCount = computed(() => analysis.value.diagnostics.filter(item => item.code === 'NOVA-COMPAT-001').length)
const reloadHistory = computed(() => hotReloadHistory(activeAsset.value?.uuid))
const canRollbackReload = computed(() => Boolean(activeAsset.value && scriptHotReloadState.rollbackSources[activeAsset.value.uuid]))
const coverage = computed(() => { void scriptCoverageState.revision; return scriptCoverageReport() })
const projectModuleDiagnostics = computed(() => analyzeModuleGraph(scripts.value.map(asset => ({ uri: asset.path, dependencies: analyzeScript(drafts[asset.uuid] ?? readTextAsset(asset.uuid) ?? '').dependencies }))))

watch(activeAsset,asset=>{
  if(!asset){analysis.value=emptyAnalysis();scriptStudioState.activeDirty=false;return}
  if(!(asset.uuid in drafts)){
    const saved=readTextAsset(asset.uuid),retained=readStudioDraft(asset,draftProjectId,'code',saved),recovery=asset.script?.recoverySource??''
    drafts[asset.uuid]=retained?.entry.source??(recovery&&recovery!==saved?recovery:saved??'');baseSources[asset.uuid]=retained?retained.entry.baseSource:saved
    if(retained||recovery&&recovery!==saved)dirtyUuids.add(asset.uuid)
  }
  if(!dirtyUuids.has(asset.uuid)){const saved=readTextAsset(asset.uuid);drafts[asset.uuid]=saved??'';baseSources[asset.uuid]=saved}
  scriptStudioState.activeDirty=dirtyUuids.has(asset.uuid);void analyzeCurrent()
},{immediate:true})
watch([activeAsset,pendingObjectAuthorNavigation],async()=>{
  const request=pendingObjectAuthorNavigation.value
  if(!request||request.projectId!==projectSessionState.id||request.record!==activeAsset.value)return
  await nextTick()
  if(pendingObjectAuthorNavigation.value!==request||request.record!==activeAsset.value)return
  const span=objectCallbackSpan(draft.value,request.callback)
  pendingObjectAuthorNavigation.value=null
  if(span)focusSourceRange(span)
  else{validationError.value=objectOwnershipCopy[preferencesState.locale].callbackLocationFailed+' · '+request.callback;inspectorTab.value='problems'}
},{immediate:true,flush:'post'})
watch(activeDirty, value => { scriptStudioState.activeDirty = value })
watch(()=>assetState.generation,()=>{const asset=activeAsset.value;if(!asset)return;if(!dirtyUuids.has(asset.uuid)){const saved=readTextAsset(asset.uuid);drafts[asset.uuid]=saved??'';baseSources[asset.uuid]=saved}void analyzeCurrent()})
watch(findOpen, open => { if (open) void nextTick(() => findInput.value?.focus()) })
onMounted(() => { studioResizeObserver=new ResizeObserver(entries=>{const bounds=entries[0]?.contentRect;if(bounds){studioSize.width=Math.max(1,bounds.width);studioSize.height=Math.max(1,bounds.height)}});if(studioGrid.value)studioResizeObserver.observe(studioGrid.value);scriptStudioState.saveActiveDraft = saveActive; restoreScriptIndex(); rebuildProjectIndex(); const selected = assetState.records.find(asset => asset.uuid === assetState.selectedGuid && asset.assetType === 'script'); if (selected) open(selected.uuid); else if (!activeAsset.value && scripts.value[0]) open(scripts.value[0].uuid) })
onBeforeUnmount(() => { for(const uuid of dirtyUuids){const record=scripts.value.find(asset=>asset.uuid===uuid);if(record)retainStudioDraft({record,projectId:draftProjectId,kind:'code',source:drafts[uuid],baseSource:baseSources[uuid]??null})}unregisterDraftOwner();studioResizeObserver?.disconnect();if (scriptStudioState.saveActiveDraft === saveActive) scriptStudioState.saveActiveDraft = null; service.dispose() })

function open(uuid: string) { openScriptAsset(uuid) }
function close(uuid: string) { if (dirtyUuids.has(uuid)) { scriptStudioState.activeUuid = uuid; return }; closeScriptAsset(uuid) }
function closeAll() { for (const uuid of [...scriptStudioState.openTabs]) close(uuid) }
function openAt(uuid: string, line: number) { open(uuid); void nextTick(() => focusLine(line, 1)) }
function createScript() { const template = scriptTemplate(templateId.value), asset = createTextAsset(`${template.name} ${t('newScriptName')}`, 'script', template.source, 'Assets/Scripts'); pushHistory('Create script asset'); open(asset.uuid); assetState.selectedGuid = asset.uuid; addEditorLog(t('scriptCreated', { name: asset.name }), 'Script') }
function rebuildProjectIndex() { rebuildAndPersistScriptIndex(scripts.value.map(asset => ({ uri: asset.path, source: drafts[asset.uuid] ?? readTextAsset(asset.uuid) ?? '', apiVersion: asset.script?.apiVersion ?? scriptProjectSettings.apiVersion, revision: Math.max(0, Math.round(asset.sourceModified || 0)) }))) }
async function analyzeCurrent() {
  const revision=++analysisRevision,asset=activeAsset.value,source=draft.value
  const bundled=asset?runtime.resolveModuleSource(asset.uuid,source):{source:null,error:null}
  const program=bundled.source?parseRhai(bundled.source,{moduleMode:'host',limits:{maxSourceLength:1_000_000}}):null
  const externalFunctions=program?.body.filter(node=>node.kind==='FunctionDeclaration').map(node=>node.name) ?? []
  const next=await service.analyze(source,{apiVersion:asset?.script?.apiVersion??scriptProjectSettings.apiVersion,revision,externalFunctions})
  const moduleError=bundled.error??program?.diagnostics.find(item=>item.code.startsWith('RHAI-LIMIT-'))?.message
  if(moduleError){const match=asset&&moduleError.startsWith(asset.path+':')?/^(\d+):(\d+):/.exec(moduleError.slice(asset.path.length+1)):null,line=Number(match?.[1]??1),column=Number(match?.[2]??1),endColumn=Math.max(column,(source.split(/\r?\n/)[line-1]?.length??0)+1);next.diagnostics.push({code:'NOVA-MODULE-RESOLUTION',severity:'error',phase:'semantic',message:moduleError,line,column,endLine:line,endColumn,range:{start:{line,column},end:{line,column:endColumn}},source:'Nova Rhai',documentation:'manual/index.html#script-modules'})}
  if(revision===analysisRevision)analysis.value=applyScriptLintPolicy(next,scriptProjectSettings.lint)
}
function sourceChanged() { const asset = activeAsset.value; if (!asset) return; asset.script ??= defaultScriptMetadata(); asset.script.recoverySource = draft.value.slice(0, 1_000_000); dirtyUuids.add(asset.uuid);retainSourceDraft(); validationError.value = ''; void analyzeCurrent(); cursorChanged(); void nextTick(() => { completionOpen.value = wordBeforeCursor.value.length >= 2 && completions.value.length > 0 }) }
function cursorChanged() { const pos = editor.value?.selectionStart ?? 0; const before = draft.value.slice(0, pos); const lines = before.split(/\r?\n/); cursor.line = lines.length; cursor.column = (lines[lines.length - 1]?.length ?? 0) + 1 }
function syncScroll() { const gutter = document.querySelector<HTMLElement>('.script-studio .gutter'); if (gutter && editor.value) gutter.scrollTop = editor.value.scrollTop }
function insertTab() { replaceSelection('  ') }
function replaceSelection(value: string) { const el = editor.value; if (!el) return; const start = el.selectionStart, end = el.selectionEnd; draft.value = `${draft.value.slice(0, start)}${value}${draft.value.slice(end)}`; dirtyUuids.add(activeAsset.value!.uuid); void nextTick(() => { el.selectionStart = el.selectionEnd = start + value.length; el.focus(); sourceChanged() }) }
function requestCompletions() { completionOpen.value = true; editor.value?.focus() }
function insertCompletion(name: string) { const prefix = wordBeforeCursor.value; const el = editor.value; if (!el) return; el.selectionStart -= prefix.length; replaceSelection(name); completionOpen.value = false }
function focusSourceRange(span: ConversionSpan) { const el = editor.value; if (!el) return; const [start,end] = textareaSelection(draft.value,span); el.focus(); el.setSelectionRange(start,end); const height = Number.parseFloat(getComputedStyle(el).lineHeight) || 22; el.scrollTop = Math.max(0,(span.line-4)*height); cursorChanged(); syncScroll() }
function focusLine(line: number, column = 1) { focusSourceRange(spanAt(draft.value,line,column)) }
function toggleBreakpoint(line: number) { const asset = activeAsset.value; if (!asset) return; asset.script ??= defaultScriptMetadata(); const index = asset.script.breakpoints.indexOf(line); if (index >= 0) { asset.script.breakpoints.splice(index, 1); asset.script.breakpointDetails = asset.script.breakpointDetails.filter(point => point.line !== line || point.functionName) } else { asset.script.breakpoints.push(line); asset.script.breakpointDetails.push({ id: `line-${line}-${Date.now()}`, line, functionName: '', condition: '', hitCondition: 0, logMessage: '', enabled: true, hitCount: 0 }) } asset.script.breakpoints.sort((a, b) => a - b); pushHistory('Toggle script breakpoint', `script-breakpoint:${asset.uuid}`); assetState.generation++ }
async function saveActive(): Promise<boolean> {
  const asset=activeAsset.value;if(!asset)return false
  if(sourceDraftConflict.value){validationError.value=layoutLabels.value.resolveDraftConflict;return false}
  const result=runtime.validateModuleSource(asset.uuid,draft.value);validationError.value=result.error??''
  if(result.error){addEditorLog(result.error,'Script','error',asset.uuid);inspectorTab.value='problems';return false}
  const previousScript=readTextAsset(asset.uuid)??'',previousGraphs=new Map(assetState.records.filter(item=>item.assetType==='visualScript').map(item=>[item.uuid,readTextAsset(item.uuid)??''])),previousMetadata=asset.script?JSON.parse(JSON.stringify(asset.script)) as typeof asset.script:undefined
  asset.script??=defaultScriptMetadata();const remapped=remapStatementLines(analyzeScript(previousScript).statements,analysis.value.statements,asset.script.breakpoints);const lineMap=new Map(remapped.map(item=>[item.from,item.to]));asset.script.breakpoints=remapped.map(item=>item.to).sort((a,b)=>a-b);asset.script.breakpointDetails=asset.script.breakpointDetails.map(point=>({...point,line:lineMap.get(point.line)??point.line}));asset.script.tests=analysis.value.tests.map(test=>test.name);asset.script.recoverySource='';asset.script.lastSavedHash=sourceHash(draft.value)
  if(!updateTextAsset(asset.uuid,draft.value)){asset.script=previousMetadata;return false}
  try{
    const synchronized=ensureLinkedGraphForScript(asset.uuid,draft.value)
    if(synchronized){if(synchronized.created){const created=assetState.records.find(record=>record.uuid===synchronized.graphAssetUuid);if(created)queueInitialGraphLayout(created)}const graphSource=readTextAsset(synchronized.graphAssetUuid)??'';runtime.queueGraphHotReload(synchronized.graphAssetUuid,graphSource,previousGraphs.get(synchronized.graphAssetUuid)??'');window.dispatchEvent(new CustomEvent('nova-linked-graph-synchronized',{detail:{graphAssetUuid:synchronized.graphAssetUuid,scriptUuid:asset.uuid}}));addEditorLog(t(synchronized.created?'linkedGraphCreatedFromCode':'linkedGraphUpdatedFromCode'),'Script','info',synchronized.graphAssetUuid)}
  }catch(error){updateTextAsset(asset.uuid,previousScript);asset.script=previousMetadata;validationError.value=error instanceof Error?error.message:String(error);addEditorLog(validationError.value,'Script','error',asset.uuid);inspectorTab.value='problems';return false}
  runtime.queueHotReload(asset.uuid,draft.value);baseSources[asset.uuid]=draft.value;clearStudioDraft(asset,draftProjectId);dirtyUuids.delete(asset.uuid);scriptStudioState.activeDirty=false;rebuildProjectIndex();pushHistory('Edit script asset',`script:${asset.uuid}`);addEditorLog(t('scriptSaved',{name:asset.name}),'Script','info',asset.uuid);return true
}
function openModuleDiagnostic(uri:string){const asset=scripts.value.find(item=>item.path===uri);if(asset)openAt(asset.uuid,1)}
function findNext() { const el = editor.value; if (!el || !findText.value) return; const lower = draft.value.toLowerCase(), needle = findText.value.toLowerCase(); let index = lower.indexOf(needle, el.selectionEnd); if (index < 0) index = lower.indexOf(needle); if (index >= 0) { el.focus(); el.setSelectionRange(index, index + needle.length); cursorChanged() } }
function replaceOne() { const el = editor.value; if (!el) return; if (draft.value.slice(el.selectionStart, el.selectionEnd).toLowerCase() !== findText.value.toLowerCase()) { findNext(); return }; replaceSelection(replaceText.value) }
function replaceAll() { if (!findText.value) return; draft.value = draft.value.replace(new RegExp(escapeRegex(findText.value), 'gi'), replaceText.value); sourceChanged() }
function beginRenameSymbol() { cursorChanged();const name = selectedIdentifier.value,asset=activeAsset.value; if (!name||!asset||!editor.value) return; renameSelection={uuid:asset.uuid,source:draft.value,offset:sourceOffsetFromTextarea(draft.value,editor.value.selectionStart)};renameSource.value = name; renameDraft.value = name; renameOpen.value = true; void nextTick(() => renameInput.value?.select()) }
async function confirmRenameSymbol() {
  const name=renameSource.value,replacement=renameDraft.value.trim(),selection=renameSelection
  if(!selection||!replacement||replacement===name||!/^[A-Za-z_][A-Za-z0-9_]*$/.test(replacement))return
  renameOpen.value=false
  try{
    if(activeAsset.value?.uuid!==selection.uuid||draft.value!==selection.source)throw Error(conversionLabels.value.renameChanged)
    const renamed=renameScriptSymbol(selection.source,name,replacement,{offset:selection.offset,externalSources:scripts.value.filter(asset=>asset.uuid!==selection.uuid).map(asset=>drafts[asset.uuid]??readTextAsset(asset.uuid)??'')})
    const validation=runtime.validateModuleSource(selection.uuid,renamed);if(validation.error)throw Error(validation.error)
    const approved=await requestConfirmation({title:t('renameSymbol'),message:conversionLabels.value.renameConfirm.replace('{name}',name).replace('{replacement}',replacement),confirmLabel:t('rename'),cancelLabel:t('cancel'),destructive:false})
    if(!approved)return
    if(activeAsset.value?.uuid!==selection.uuid||draft.value!==selection.source)throw Error(conversionLabels.value.renameChanged)
    draft.value=renamed;sourceChanged();await analyzeCurrent()
    if(await saveActive())addEditorLog(t('symbolRenamed',{name,replacement}),'Script')
  }catch(error){validationError.value=error instanceof Error?error.message:String(error);inspectorTab.value='problems';addEditorLog(validationError.value,'Script','error',selection.uuid)}
}
function goToDefinition() { const name = selectedIdentifier.value; if (!name) return; for (const asset of scripts.value) { const source = drafts[asset.uuid] ?? readTextAsset(asset.uuid) ?? ''; const symbol = analyzeScript(source).symbols.find(candidate => candidate.name === name); if (symbol) { openAt(asset.uuid, symbol.line); return } } }
function showReferences() { const name = selectedIdentifier.value; if (!name) return; referenceResults.value = scripts.value.flatMap(asset => findScriptReferences(drafts[asset.uuid] ?? readTextAsset(asset.uuid) ?? '', name).map(reference => ({ uuid: asset.uuid, name: asset.name, line: reference.line, column: reference.column }))); inspectorTab.value = 'symbols' }
function formatActive() { if (!activeAsset.value) return; try{const formatted = formatScript(draft.value, scriptProjectSettings.formatting); if (formatted !== draft.value) { draft.value = formatted; sourceChanged(); pushHistory('Format script', `script-format:${activeAsset.value.uuid}`) }}catch(error){validationError.value=error instanceof Error?error.message:String(error);inspectorTab.value='problems'} }
function applyCodeAction(action: ScriptCodeAction) { if (action.code === 'NOVA-COMPAT-001') { focusLine(action.line); const deprecated = analysis.value.diagnostics.find(item => item.line === action.line && item.code === action.code)?.message.match(/“([^”]+)”/)?.[1]; if (deprecated) { draft.value = draft.value.replace(new RegExp(`\\b${escapeRegex(deprecated)}\\b`, 'g'), action.replacement); sourceChanged() } } else if (action.code === 'NOVA-PARSE-003') { draft.value = `${draft.value.replace(/\s*$/, '')}\n${action.replacement}\n`; sourceChanged() } }
function addPackage() { const asset = activeAsset.value, name = packageDraft.value.trim().slice(0, 256); if (!asset?.script || !name || asset.script.packageDependencies.includes(name)) return; asset.script.packageDependencies.push(name); packageDraft.value = ''; assetState.generation++; pushHistory('Add script package dependency') }
function removePackage(name: string) { const asset = activeAsset.value; if (!asset?.script) return; asset.script.packageDependencies = asset.script.packageDependencies.filter(value => value !== name); assetState.generation++; pushHistory('Remove script package dependency') }
function setPackageName(value: string) { const asset = activeAsset.value; if (!asset) return; asset.script ??= defaultScriptMetadata(); asset.script.packageName = value.trim().slice(0, 128); assetState.generation++; pushHistory('Set script package') }
function setReloadPolicy(value: string) { const asset = activeAsset.value; if (!asset || !['preserve', 'recreate', 'disabled'].includes(value)) return; asset.script ??= defaultScriptMetadata(); asset.script.reloadPolicy = value as 'preserve' | 'recreate' | 'disabled'; assetState.generation++; pushHistory('Set hot reload policy') }
function setApiVersion(value: number) { const asset = activeAsset.value; if (!asset) return; asset.script ??= defaultScriptMetadata(); asset.script.apiVersion = value === 2 ? 2 : asset.script.apiVersion === 1 ? 1 : 2; assetState.generation++; markScriptIndexApiChanged(); rebuildProjectIndex(); pushHistory('Set script API version'); void analyzeCurrent() }
function insertContractHeader() { if (!activeAsset.value || /^\s*\/\/\s*@nova\b/m.test(draft.value)) { inspectorTab.value = 'contract'; return }; draft.value = `${scriptContractHeader()}\n\n${draft.value}`; sourceChanged(); inspectorTab.value = 'contract'; pushHistory('Add script behavior contract') }
function rollbackReload() { if (activeAsset.value && runtime.rollbackHotReload(activeAsset.value.uuid)) addEditorLog(t('hotReloadRollbackQueued'), 'Script', 'warning', activeAsset.value.uuid) }
function addFunctionBreakpoint() { const asset = activeAsset.value; if (!asset) return; asset.script ??= defaultScriptMetadata(); const point: ScriptBreakpointMetadata = { id: `function-${Date.now()}`, line: cursor.line, functionName: analysis.value.symbols.find(symbol => symbol.kind === 'function' && symbol.line <= cursor.line && symbol.endLine >= cursor.line)?.name ?? '', condition: '', hitCondition: 0, logMessage: '', enabled: true, hitCount: 0 }; asset.script.breakpointDetails.push(point); assetState.generation++; pushHistory('Add function breakpoint') }
function removeDetailedBreakpoint(id: string) { const asset = activeAsset.value; if (!asset?.script) return; const point = asset.script.breakpointDetails.find(item => item.id === id); asset.script.breakpointDetails = asset.script.breakpointDetails.filter(item => item.id !== id); if (point && !asset.script.breakpointDetails.some(item => item.line === point.line)) asset.script.breakpoints = asset.script.breakpoints.filter(line => line !== point.line); assetState.generation++; pushHistory('Remove script breakpoint') }
function addWatch() { addDebugWatch(watchDraft.value); watchDraft.value = '' }
function addSignal() { const name = signalDraft.value.trim().slice(0, 128); if (!name || signals.value.includes(name)) return; signals.value.push(name); signalDraft.value = ''; pushHistory('Add custom signal') }
function removeSignal(name: string) { const index = signals.value.indexOf(name); if (index >= 0) { signals.value.splice(index, 1); pushHistory('Remove custom signal') } }
function addSignalConnection() { const asset = activeAsset.value, signal = connectionSignalDraft.value.trim().slice(0, 128), callback = connectionCallbackDraft.value.trim().slice(0, 80); if (!asset || !signal || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(callback)) return; asset.script ??= defaultScriptMetadata(); asset.script.signalConnections.push({ signal, callback, source: '', target: '', enabled: true }); connectionSignalDraft.value = ''; connectionCallbackDraft.value = ''; assetState.generation++; pushHistory('Connect script signal') }
function removeSignalConnection(index: number) { const asset = activeAsset.value; if (!asset?.script) return; asset.script.signalConnections.splice(index, 1); assetState.generation++; pushHistory('Disconnect script signal') }
async function runTests() {
  if (testScope.value === 'headless') { const command = `pnpm nova script-test Assets/Scripts --format json --output reports/rhai-tests.json --coverage-output reports/rhai-coverage.json${testTags.value.trim() ? ` --tag ${testTags.value.trim().split(/[,\s]+/).filter(Boolean)[0]}` : ''}`; await navigator.clipboard?.writeText(command); addEditorLog(t('headlessCommandCopied'), 'Script'); return }
  const tags = testTags.value.trim().split(/[,\s]+/).filter(Boolean)
  const target = testScope.value === 'file' ? activeAsset.value?.uuid : undefined
  const failed = testScope.value === 'failed' ? [...new Set(debug.testResults.filter(result => !result.passed && !result.skipped).map(result => result.test))] : undefined
  runtime.runScriptTests(target, { tags: testScope.value === 'tags' ? tags : undefined, testNames: failed })
  inspectorTab.value = 'tests'
}
function selectFrame(index: number, uuid: string, line: number) { selectDebugFrame(index); openAt(uuid, line) }
function percent(value: number) { return `${(Math.max(0, Math.min(1, value)) * 100).toFixed(1)}%` }
function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
function sourceHash(value: string) { let hash = 2166136261; for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0; return hash.toString(16).padStart(8, '0') }
</script>

<style scoped>
.source-save-error{margin:8px 0;padding:9px;border-left:3px solid var(--danger,#f87171);background:var(--surface-2);color:var(--danger,#f87171);font-size:12px;line-height:1.5;overflow-wrap:anywhere;white-space:pre-wrap}
.script-studio { position:absolute; inset:0; display:flex; flex-direction:column; min-width:0; min-height:0; color:var(--text-primary); background:var(--bg-base); font-size:13px; }
.studio-toolbar { min-height:58px; padding:8px 12px; display:flex; flex-wrap:wrap; align-items:center; gap:8px 16px; border-bottom:1px solid var(--border-subtle); background:var(--surface-1); }
.studio-title { min-width:220px; display:flex; align-items:center; gap:10px; }.studio-title div{display:grid;gap:2px}.studio-title strong{font-size:14px}.studio-title small{color:var(--text-muted);font-size:11px}.studio-mark{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;color:var(--accent);background:var(--accent-soft);font:700 13px var(--font-mono)}
.toolbar-actions{flex:1;display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:min(100%,620px);overflow:visible}.toolbar-spacer{flex:1 1 16px}.toolbar-actions button,.find-bar button,.pane-heading button,.dependency-editor button{min-height:32px;padding:0 10px;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-secondary);background:var(--surface-2);white-space:nowrap}.toolbar-actions button:hover,.toolbar-actions button.active{color:var(--text-primary);border-color:var(--accent);background:var(--accent-soft)}.toolbar-actions button.primary{color:var(--accent-contrast);background:var(--accent);border-color:var(--accent)}
.split-action{display:flex;min-width:0}.split-action button{border-radius:8px 0 0 8px}.split-action select{min-height:32px;max-width:132px;padding:0 7px;border:1px solid var(--border-subtle);border-left:0;border-radius:0 8px 8px 0;color:var(--text-secondary);background:var(--surface-2)}
.studio-grid{flex:1;min-height:0;display:grid;grid-template-columns:clamp(176px,17vw,224px) minmax(340px,1fr) clamp(248px,22vw,328px)}.project-scripts,.studio-inspector{min-width:0;min-height:0;overflow:hidden;background:var(--surface-1)}.project-scripts{padding:10px;border-right:1px solid var(--border-subtle);display:flex;flex-direction:column;gap:9px}.project-scripts>input,.api-reference>input,.dependency-editor input,.find-bar input,.inspector-pane input,.inspector-pane select{min-width:0;min-height:33px;padding:0 10px;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-primary);background:var(--field-bg)}
.studio-grid.explorer-hidden{grid-template-columns:minmax(340px,1fr) clamp(248px,22vw,328px)}.studio-grid.detail-hidden{grid-template-columns:clamp(176px,17vw,224px) minmax(340px,1fr)}.studio-grid.explorer-hidden.detail-hidden{grid-template-columns:1fr}.studio-grid.detail-bottom{grid-template-columns:clamp(176px,17vw,224px) minmax(340px,1fr);grid-template-rows:minmax(260px,1fr) clamp(190px,30vh,320px)}.studio-grid.detail-bottom .project-scripts{grid-row:1/3}.studio-grid.detail-bottom .studio-inspector{grid-column:2;grid-row:2;border-left:0;border-top:1px solid var(--border-subtle)}.studio-grid.detail-bottom.explorer-hidden{grid-template-columns:1fr}.studio-grid.detail-bottom.explorer-hidden .code-workspace,.studio-grid.detail-bottom.explorer-hidden .studio-inspector{grid-column:1}.studio-grid.detail-bottom.detail-hidden{grid-template-rows:1fr}
.pane-heading{min-height:30px;display:flex;align-items:center;justify-content:space-between;gap:8px;text-transform:uppercase;letter-spacing:.06em;font-size:11px;color:var(--text-muted)}.pane-heading strong{font-size:11px}.pane-heading span{padding:2px 7px;border-radius:999px;background:var(--surface-3)}
.script-list,.search-results{display:grid;gap:3px;overflow:auto}.script-list{max-height:42%}.script-list button,.search-results button{width:100%;padding:7px;display:flex;align-items:center;gap:8px;text-align:left;border:1px solid transparent;border-radius:8px;color:var(--text-secondary);background:transparent;min-width:0}.script-list button:hover,.script-list button.active{background:var(--surface-3)}.script-list button.active{border-color:var(--accent);color:var(--text-primary)}.script-list button>span:last-child,.search-results button{min-width:0}.script-list strong,.script-list small,.search-results strong,.search-results small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.script-list strong,.search-results strong{font-size:12px}.script-list small,.search-results small{margin-top:2px;color:var(--text-muted);font-size:11px}.file-icon{width:25px;height:25px;display:grid;place-items:center;flex:0 0 auto;border-radius:7px;color:var(--accent);background:var(--accent-soft);font-weight:700}.search-results{padding-top:8px;border-top:1px solid var(--border-subtle)}.search-results button{display:block}
.code-workspace{min-width:0;min-height:0;display:flex;flex-direction:column;background:var(--bg-canvas)}.file-tabs{min-height:38px;display:flex;align-items:stretch;overflow-x:auto;border-bottom:1px solid var(--border-subtle);background:var(--surface-1)}.file-tabs>span{flex:1}.file-tabs button{padding:0 10px;display:flex;align-items:center;gap:6px;border:0;border-right:1px solid var(--border-subtle);color:var(--text-muted);background:transparent;white-space:nowrap}.file-tabs button.active{color:var(--text-primary);background:var(--bg-canvas);box-shadow:inset 0 2px var(--accent)}.file-tabs i{padding:2px 4px;font-style:normal}.dirty-dot{color:var(--accent);font-size:11px;visibility:hidden}.dirty-dot.visible{visibility:visible}.find-bar{padding:7px;display:flex;gap:5px;align-items:center;border-bottom:1px solid var(--border-subtle);background:var(--surface-2)}.find-bar input{width:min(210px,25%)}.find-bar span{color:var(--text-muted);font-size:11px}
.editor-shell{position:relative;flex:1;min-height:0;display:grid;grid-template-columns:54px 1fr;overflow:hidden}.gutter{padding-top:10px;overflow:hidden;border-right:1px solid var(--border-subtle);background:var(--surface-1)}.gutter button{width:100%;height:22px;padding:0 8px;display:flex;align-items:center;justify-content:flex-end;gap:6px;border:0;color:var(--text-muted);background:transparent;font:11px/22px var(--font-mono)}.gutter button span{width:7px;height:7px;border:1px solid transparent;border-radius:50%}.gutter button:hover span{border-color:var(--accent)}.gutter button.breakpoint span{border-color:var(--danger);background:var(--danger)}.gutter button.error{color:var(--danger)}.editor-shell textarea{width:100%;height:100%;padding:10px 16px;border:0;outline:0;resize:none;tab-size:2;white-space:pre;overflow:auto;color:var(--text-primary);caret-color:var(--accent);background:var(--bg-canvas);font:13px/22px var(--font-mono)}.completion-popover{position:absolute;left:90px;top:44px;z-index:4;width:250px;max-height:260px;padding:5px;display:grid;overflow:auto;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-2);box-shadow:var(--shadow-lg)}.completion-popover button{padding:6px 8px;display:flex;gap:8px;border:0;border-radius:6px;text-align:left;color:var(--text-primary);background:transparent}.completion-popover button:hover{background:var(--accent-soft)}.completion-popover b{color:var(--accent)}.signature-help{position:absolute;left:72px;bottom:12px;max-width:calc(100% - 100px);padding:8px 10px;display:grid;gap:4px;border:1px solid var(--border-subtle);border-radius:8px;background:color-mix(in srgb,var(--surface-2) 94%,transparent);box-shadow:var(--shadow-md)}.signature-help code{color:var(--accent)}.signature-help span{color:var(--text-muted);font-size:11px}.editor-status{min-height:28px;padding:0 10px;display:flex;align-items:center;gap:14px;justify-content:flex-end;border-top:1px solid var(--border-subtle);background:var(--surface-1);color:var(--text-muted);font-size:11px}.editor-status span:first-child{margin-right:auto}.status-ok{color:var(--success)}.status-error{color:var(--danger)}
.empty-editor{flex:1;display:grid;place-content:center;justify-items:center;text-align:center;color:var(--text-muted)}.empty-editor>span{font:700 34px var(--font-mono);color:var(--accent)}.empty-editor h2{margin:12px 0 4px;color:var(--text-primary)}.empty-editor p{margin:0 0 14px}.empty-editor button{padding:9px 15px;border:0;border-radius:8px;background:var(--accent);color:var(--accent-contrast)}
.studio-inspector{border-left:1px solid var(--border-subtle);display:flex;flex-direction:column}.inspector-tabs{display:grid;grid-template-columns:repeat(auto-fit,minmax(76px,1fr));border-bottom:1px solid var(--border-subtle)}.inspector-tabs button{min-width:0;min-height:31px;padding:3px 5px;border:0;color:var(--text-muted);background:transparent;font-size:11px;line-height:1.2;overflow-wrap:anywhere}.inspector-tabs button.active{color:var(--accent);box-shadow:inset 0 -2px var(--accent)}.inspector-pane{min-height:0;padding:10px;display:flex;flex-direction:column;gap:7px;overflow:auto}.empty-pane,.pane-help{color:var(--text-muted);font-size:11px;line-height:1.5}.problem,.symbol,.test-result{padding:7px;display:flex;align-items:flex-start;gap:8px;border:0;border-radius:7px;text-align:left;color:var(--text-secondary);background:transparent}.problem:hover,.symbol:hover{background:var(--surface-3)}.problem>span,.test-result>span{min-width:0;display:grid;gap:3px}.problem strong,.test-result strong{font-size:11px}.problem small,.test-result small{color:var(--text-muted);font-size:11px;overflow-wrap:anywhere}.problem i{width:7px;height:7px;margin-top:4px;flex:0 0 auto;border-radius:50%;background:var(--warning)}.problem i.error{background:var(--danger)}.problem i.info{background:var(--accent)}.symbol i{width:18px;color:var(--accent);font-style:normal}.symbol span{min-width:0;flex:1;overflow-wrap:anywhere}.symbol small{color:var(--text-muted)}.inspector-pane>code{padding:7px;border-radius:6px;overflow:hidden;text-overflow:ellipsis;background:var(--surface-2);color:var(--accent);font-size:11px}.dependency-editor{display:flex;flex-wrap:wrap;gap:5px}.dependency-editor input{min-width:110px;flex:1}.inspector-pane>label{min-height:34px;padding:5px 7px;display:flex;align-items:center;justify-content:space-between;gap:7px;border:1px solid var(--border-subtle);border-radius:7px}.inspector-pane>label span{min-width:0;display:grid;gap:2px;overflow-wrap:anywhere}.inspector-pane>label small{overflow-wrap:anywhere;color:var(--text-muted)}.inspector-pane>label small.error{color:var(--danger)}.inspector-pane>label button,.emit{border:0;color:var(--text-muted);background:transparent}.emit{color:var(--accent)!important}.debug-pane p{padding:7px;border-radius:7px;background:var(--surface-2);color:var(--text-muted)}.debug-pane h3,.inspector-pane>h3{margin:6px 0 0;font-size:11px;text-transform:uppercase;color:var(--text-muted)}.debug-pane pre{max-height:160px;margin:0;padding:8px;overflow:auto;border-radius:7px;background:var(--bg-canvas);font:11px/1.5 var(--font-mono)}.paused{color:var(--warning)}.test-result i{width:20px;height:20px;flex:0 0 auto;display:grid;place-items:center;border-radius:50%;font-style:normal;color:#fff;background:var(--danger)}.test-result i.passed{background:var(--success)}.test-result i.skipped{background:var(--text-muted)}.api-reference article{padding:9px;display:grid;gap:5px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-2)}.api-reference article small{color:var(--accent)}.api-reference article code{display:block;color:var(--text-primary);font-size:11px;overflow-wrap:anywhere}.api-reference article p{margin:0;color:var(--text-muted);font-size:11px;line-height:1.45}.api-reference article pre{margin:0;padding:6px;overflow:auto;border-radius:5px;background:var(--bg-canvas);font-size:11px}.api-reference article b{color:var(--warning);font-size:11px}.api-reference article button,.code-action{min-height:30px;border:1px solid var(--border-subtle);border-radius:7px;color:var(--accent);background:var(--surface-3)}.breakpoint-detail{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:5px;padding:7px;border:1px solid var(--border-subtle);border-radius:8px}.breakpoint-detail>label{display:flex;align-items:center;gap:4px}.breakpoint-detail>input{grid-column:2}.breakpoint-detail>button{grid-column:3;grid-row:1/6;border:0;color:var(--danger);background:transparent}.hot-reload-state{margin:0;padding:7px;border-radius:7px;background:var(--surface-2);font-size:11px;overflow-wrap:anywhere}.hot-reload-state.applied{color:var(--success)}.hot-reload-state.rejected{color:var(--danger)}
.reload-entry{padding:6px;display:grid;gap:2px;border-top:1px solid var(--border-subtle)}.reload-entry small{overflow-wrap:anywhere;color:var(--text-muted)}.coverage-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.coverage-summary span{padding:6px;display:grid;gap:2px;border:1px solid var(--border-subtle);border-radius:7px;color:var(--text-muted);background:var(--surface-2)}.coverage-summary b{color:var(--accent)}
.contract-action{min-height:32px;border:1px solid var(--accent);border-radius:8px;color:var(--accent);background:var(--accent-soft)}.contract-flags{display:flex;flex-wrap:wrap;gap:6px}.contract-flags span{padding:4px 8px;border:1px solid var(--border-subtle);border-radius:999px;color:var(--text-muted);font-size:11px}.contract-flags span.enabled{border-color:var(--success);color:var(--success);background:color-mix(in srgb,var(--success) 10%,transparent)}.contract-valid{color:var(--success)}.contract-invalid{color:var(--danger)}.contract-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.contract-metrics article{padding:8px;display:grid;gap:3px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-2)}.contract-metrics span,.contract-row small{color:var(--text-muted);font-size:11px}.contract-metrics strong{color:var(--accent);font-size:15px}.contract-row{padding:7px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:3px 7px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-2)}.contract-row>span{padding:2px 5px;border-radius:999px;color:var(--accent);background:var(--accent-soft);font-size:11px;text-transform:uppercase}.contract-row code{min-width:0;overflow-wrap:anywhere;color:var(--text-primary)}.contract-row small{grid-column:1/-1}.contract-row.api small{grid-column:2}
.rename-overlay{position:absolute;inset:0;z-index:20;display:grid;place-items:center;background:var(--scrim);backdrop-filter:blur(6px)}.rename-card{width:min(390px,calc(100% - 30px));padding:18px;display:grid;gap:10px;border:1px solid var(--border-strong);border-radius:14px;background:var(--surface-2);box-shadow:var(--shadow-lg)}.rename-card p{margin:0;color:var(--text-muted)}.rename-card>div{display:flex;justify-content:flex-end;gap:7px}.rename-card button{min-height:32px;padding:0 12px;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-secondary);background:var(--surface-3)}.rename-card button.primary{color:var(--accent-contrast);background:var(--accent);border-color:var(--accent)}
.toolbar-actions select{min-height:32px;max-width:150px;padding:0 9px;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-secondary);background:var(--surface-2)}
@media(max-width:1000px){.studio-mark{flex:0 0 auto}}
.type-symbol{align-items:center}.type-symbol>span{display:grid;gap:2px}.type-symbol>span small{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.type-symbol code,.statement code{flex:0 0 auto;padding:3px 6px;border-radius:999px;color:var(--accent);background:var(--accent-soft);font:11px/1.35 var(--font-mono)}.type-structure{padding:8px;display:grid;gap:4px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-2)}.type-structure small{overflow-wrap:anywhere;color:var(--text-muted);line-height:1.45}.statement>span{display:grid;gap:2px;overflow:hidden}.statement>span small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.type-pane{contain:content}
.script-studio{container:source-studio/inline-size;min-width:0;min-height:0;overflow:hidden}
.studio-toolbar{position:relative;z-index:15;flex:0 0 auto;align-items:center;gap:7px;padding:6px 9px}.studio-title{min-width:0;flex:0 0 auto}.studio-title div{display:block}.studio-title small{display:block;white-space:normal}.compact-toolbar .studio-title small{display:none}.compact-toolbar .studio-mark{width:26px;height:26px}.compact-toolbar .studio-title strong{font-size:12px}
.toolbar-actions{min-width:0;flex:1 1 460px;gap:5px;flex-wrap:wrap;overflow:visible}.toolbar-actions>button,.toolbar-actions>select{flex-shrink:0;height:auto;min-height:32px;padding:4px 8px;white-space:normal;overflow-wrap:anywhere}.toolbar-actions>select{max-width:136px}
.studio-more{position:relative;margin-left:auto;flex:0 0 auto}.studio-more>summary{min-height:32px;padding:7px 9px;cursor:pointer;border:1px solid var(--border-subtle);border-radius:8px;font-size:var(--type-dense)}
.studio-commands{position:absolute;z-index:30;right:0;top:calc(100% + 5px);width:min(370px,calc(100cqw - 24px));max-height:min(470px,65vh);padding:10px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;overflow:auto;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-1);box-shadow:var(--shadow-lg)}
.studio-more:not([open]) .studio-commands{display:none}.studio-commands button{height:auto;min-height:36px;min-width:0;white-space:normal;overflow-wrap:anywhere}.studio-commands>.split-action,.studio-commands>.compact-setting{grid-column:1/-1}.studio-commands .split-action>*{min-width:0;max-width:none;flex:1}.toolbar-spacer{display:none}.compact-setting{display:flex;align-items:center;gap:7px;font-size:var(--type-dense)}
.studio-grid{position:relative;min-width:0;min-height:0;overflow:hidden;isolation:isolate}.project-scripts,.studio-inspector{position:relative;z-index:2;box-sizing:border-box;max-width:100%}.project-scripts{display:flex;padding-right:12px}.project-scripts .pane-heading button{min-width:28px;min-height:28px;border:0;background:var(--surface-2)}
.project-scripts>input,.project-scripts>.pane-heading{flex-shrink:0}.script-list{max-height:none;min-height:0;flex:1;align-content:start;grid-auto-rows:max-content}.search-results{max-height:45%;min-height:0;flex:1}.script-list strong,.script-list small,.search-results strong,.search-results small{white-space:normal;overflow-wrap:anywhere}
.studio-inspector{padding-left:5px;overflow:hidden}.studio-grid.detail-bottom .studio-inspector{padding:6px 0 0}.inspector-tabs{flex:0 0 auto;padding-right:28px;grid-template-columns:repeat(auto-fit,minmax(86px,1fr))}.inspector-tabs button{height:auto;min-height:34px;white-space:normal;overflow-wrap:anywhere;line-height:1.4;padding:5px 6px}.inspector-pane{flex:1;min-height:0;overflow:auto}.inspector-pane>*{flex-shrink:0}.close-inspector{position:absolute;z-index:3;top:3px;right:3px;min-width:26px;min-height:26px;padding:2px;border:0;background:var(--surface-2)}
.code-workspace{min-height:0}.file-tabs{flex:0 0 auto;min-height:34px;max-height:72px}.file-tab{display:flex;flex:0 0 auto;max-width:260px}.file-tab>button:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.file-tab .close-file{flex:0 0 28px;padding:3px;border-right:1px solid var(--border-subtle)}.file-tab.active{background:var(--bg-canvas)}
.find-bar{flex:0 0 auto;min-width:0;flex-wrap:wrap}.find-bar input{flex:1 1 120px;width:120px}.find-bar button{flex-shrink:0;min-height:30px;white-space:normal}
.editor-shell{flex:1;min-height:0}.editor-shell textarea{min-height:0}.editor-status{flex:0 0 auto;max-height:78px;overflow:auto;gap:4px 12px;padding:5px 8px}.editor-status span{display:inline;white-space:normal;overflow-wrap:anywhere}.editor-status .linked-graph-status{white-space:normal}
.drawer-layout .project-scripts,.drawer-layout .studio-inspector{position:absolute;z-index:10;top:0;bottom:0;box-shadow:var(--shadow-lg)}.drawer-layout .project-scripts{left:0}.drawer-layout .studio-inspector{right:0}.drawer-layout .code-workspace{grid-column:1;grid-row:1}
@container source-studio (max-width:1000px){.compact-toolbar .studio-title{display:none}.studio-toolbar{padding:5px}.toolbar-actions{flex-basis:100%}.toolbar-actions>button{font-size:var(--type-caption)}}
@container source-studio (max-width:640px){.toolbar-actions>select{max-width:110px}.studio-commands{grid-template-columns:1fr}.editor-shell{grid-template-columns:42px minmax(0,1fr)}.editor-shell textarea{padding-inline:9px}.editor-status{max-height:60px;font-size:var(--type-caption)}}
</style>
