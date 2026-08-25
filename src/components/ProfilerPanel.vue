<template>
  <section class="production-panel">
    <header class="production-header">
      <div><strong>{{ t('profiler') }}</strong><span>{{ t('profilerHint') }}</span></div>
      <nav>
        <button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" @click="selectTab(tab.id)">{{ t(tab.label) }}</button>
      </nav>
    </header>

    <div v-if="activeTab === 'trace'" class="panel-scroll trace-layout">
      <section class="card metrics-card">
        <header><strong>{{ t('frameTrace') }}</strong><span>{{ profilerState.samples.length }}/{{ settings.performance.traceCapacity }}</span></header>
        <div class="metrics">
          <article v-for="metric in timingMetrics" :key="metric.label"><span>{{ t(metric.label) }}</span><strong>{{ metric.value.toFixed(2) }} ms</strong></article>
          <article><span>{{ t('fps') }}</span><strong>{{ current.fps.toFixed(0) }}</strong></article>
          <article><span>{{ t('memory') }}</span><strong>{{ current.memoryMb === null ? 'n/a' : `${current.memoryMb.toFixed(1)} MB` }}</strong></article>
          <article><span>{{ t('gpuPasses') }}</span><strong>{{ current.gpuPasses }}</strong></article>
          <article><span>{{ t('lifetimeChanges') }}</span><strong>{{ current.allocations }}</strong></article>
          <article><span>{{ t('assetJobs') }}</span><strong>{{ current.assetJobs }}</strong></article>
          <article><span>{{ t('drawCalls') }}</span><strong>{{ editorState.rendererStats.drawCalls }}</strong></article>
          <article><span>{{ t('runtimeBodies') }}</span><strong>{{ physicsState.engineDiagnostics.bodyCount }}</strong></article>
          <article><span>{{ t('activeContacts') }}</span><strong>{{ activeContacts }}</strong></article>
          <article><span>{{ t('sleepingBodies') }}</span><strong>{{ sleepingBodies }}</strong></article>
          <article><span>{{ t('continuousBodies') }}</span><strong>{{ continuousBodies }}</strong></article>
          <article><span>{{ t('jointConstraints') }}</span><strong>{{ jointConstraints }}</strong></article>
          <article><span>{{ t('activeVoices') }}</span><strong>{{ audioRuntime.diagnostics.activeVoices }}</strong></article>
          <article><span>{{ t('audioLatency') }}</span><strong>{{ audioRuntime.diagnostics.baseLatencyMs === null ? 'n/a' : `${audioRuntime.diagnostics.baseLatencyMs.toFixed(1)} ms` }}</strong></article>
          <article><span>{{ t('audioUnderruns') }}</span><strong>{{ audioRuntime.diagnostics.underruns }}</strong></article>
        </div>
        <svg class="trace-chart" viewBox="0 0 600 110" preserveAspectRatio="none" :aria-label="t('frameHistory')"><line x1="0" y1="93.3" x2="600" y2="93.3"/><line x1="0" y1="76.7" x2="600" y2="76.7"/><polyline :points="chartPoints" /></svg>
        <div class="flame-view"><article v-for="metric in timingMetrics.filter(item => item.value > 0)" :key="metric.label" :style="{ width: `${Math.max(8, metric.value / Math.max(.001,current.frameMs) * 100)}%` }"><span>{{ t(metric.label) }}</span><output>{{ metric.value.toFixed(2) }} ms</output></article></div>
        <div class="button-row"><button @click="profilerState.frozen = !profilerState.frozen">{{ t(profilerState.frozen ? 'resumeProfiler' : 'freezeProfiler') }}</button><button @click="clearProfiler">{{ t('clearSamples') }}</button><button class="primary" @click="takeCapture">{{ t('capturePerformance') }}</button></div>
      </section>
      <section class="card settings-card">
        <header><strong>{{ t('traceSettings') }}</strong></header>
        <label><span>{{ t('traceCapacity') }}</span><input v-model.number="settings.performance.traceCapacity" type="number" min="60" max="10000" @change="commit"></label>
        <label><span>{{ t('inputTime') }}</span><output>{{ current.inputMs.toFixed(2) }} ms</output></label>
        <label><span>{{ t('physicsTime') }}</span><output>{{ current.physicsMs.toFixed(2) }} ms</output></label>
        <label><span>{{ t('scriptsTime') }}</span><output>{{ current.scriptsMs.toFixed(2) }} ms</output></label>
        <label><span>{{ t('animationTime') }}</span><output>{{ current.animationMs.toFixed(2) }} ms</output></label>
        <label><span>{{ t('animationBudget') }}</span><input v-model.number="settings.performance.animationBudgetMs" type="number" min="0.05" max="100" step="0.05" @change="commit"></label>
        <label><span>{{ t('uiBudget') }}</span><input v-model.number="settings.performance.uiBudgetMs" type="number" min="0.05" max="100" step="0.05" @change="commit"></label>
        <label><span>{{ t('frameBudget') }}</span><input v-model.number="settings.performance.frameBudgetMs" type="number" min="1" max="1000" step=".1" @change="commit"></label>
        <label><span>{{ t('renderGpuBudget') }}</span><div><input v-model.number="settings.performance.renderingBudgetMs" type="number" min=".05" step=".1" @change="commit"><input v-model.number="settings.performance.gpuBudgetMs" type="number" min=".05" step=".1" @change="commit"></div></label>
        <label><span>{{ t('audioParticleBudget') }}</span><div><input v-model.number="settings.performance.audioBudgetMs" type="number" min=".05" step=".1" @change="commit"><input v-model.number="settings.performance.particleBudgetMs" type="number" min=".05" step=".1" @change="commit"></div></label>
        <label><span>{{ t('profilerMode') }}</span><select v-model="profilerState.overheadMode"><option>Full</option><option>Low overhead</option><option>Off</option></select></label>
        <label><span>{{ t('overheadBudget') }} %</span><input v-model.number="settings.performance.profilerOverheadBudgetPercent" type="number" min="0" max="100" step=".1" @change="commit"></label>
        <label><span>{{ t('remotePlayer') }}</span><input v-model="profilerState.remotePeer" maxlength="160" placeholder="exported-player:port"></label>
        <label><span>{{ t('annotation') }}</span><div><input v-model="annotationDraft" maxlength="500"><button @click="annotate">＋</button></div></label>
        <p>{{ profilerState.markers.length }} markers · {{ profilerState.counters.length }} counters · {{ profilerState.annotations.length }} annotations · {{ profilerState.estimatedOverheadPercent.toFixed(2) }}% overhead</p>
        <p :class="{ danger: current.animationMs > settings.performance.animationBudgetMs }">{{ current.animationMs > settings.performance.animationBudgetMs ? t('animationBudgetExceeded') : t('animationWithinBudget') }}</p>
        <label><span>{{ t('audioTime') }}</span><output>{{ current.audioMs.toFixed(2) }} ms</output></label>
        <label><span>{{ t('renderingTime') }}</span><output>{{ current.renderingMs.toFixed(2) }} ms</output></label>
        <p>{{ t('traceCorrelationHint') }}</p>
      </section>
      <section class="card debug-card">
        <header><strong>{{ t('physicsDebugger') }}</strong><input v-model="physicsDebugState.enabled" type="checkbox"></header>
        <label v-for="option in debugOptions" :key="option.key"><span>{{ t(option.label) }}</span><input v-model="physicsDebugState[option.key]" type="checkbox" :disabled="!physicsDebugState.enabled"></label>
      </section>
    </div>

    <div v-else-if="activeTab === 'memory'" class="panel-scroll studio-grid">
      <section class="card">
        <header><strong>{{ t('budgets') }}</strong><span :class="{ danger: tools.memoryBudgetExceeded || tools.assetBudgetExceeded }">{{ tools.memoryBudgetExceeded || tools.assetBudgetExceeded ? t('budgetExceeded') : t('withinBudget') }}</span></header>
        <label><span>{{ t('memoryBudget') }}</span><input v-model.number="settings.performance.memoryBudgetMb" type="number" min="16" max="65536" @change="commit"></label>
        <label><span>{{ t('assetBudget') }}</span><input v-model.number="settings.performance.assetBudgetMb" type="number" min="1" max="1048576" @change="commit"></label>
        <label><span>{{ t('memory') }}</span><output>{{ tools.memoryMb === null ? 'n/a' : `${tools.memoryMb.toFixed(1)} MB` }}</output></label>
        <label><span>{{ t('assetMemory') }}</span><output>{{ tools.assetMb.toFixed(2) }} MB</output></label>
        <label><span>{{ t('liveObjects') }}</span><output>{{ tools.liveEntities }}</output></label>
        <label><span>{{ t('createdReleased') }}</span><output>{{ tools.createdEntities }} / {{ tools.releasedEntities }}</output></label>
        <label><span>{{ t('leakWindow') }}</span><input v-model.number="settings.performance.leakWindowFrames" type="number" min="60" max="60000" @change="commit"></label>
        <p :class="{ danger: tools.possibleLeak }">{{ tools.possibleLeak ? t('possibleLeak', { rate: tools.leakSlopeMbPerMinute.toFixed(2) }) : t('noLeakTrend') }}</p>
      </section>
      <section class="card capture-card">
        <header><strong>{{ t('captureComparison') }}</strong><button @click="takeCapture">+ {{ t('capturePerformance') }}</button></header>
        <label><span>A</span><select v-model="captureA"><option value="">{{ t('none') }}</option><option v-for="capture in tools.captures" :key="capture.id" :value="capture.id">{{ capture.name }}</option></select></label>
        <label><span>B</span><select v-model="captureB"><option value="">{{ t('none') }}</option><option v-for="capture in tools.captures" :key="capture.id" :value="capture.id">{{ capture.name }}</option></select></label>
        <button :disabled="!captureA || !captureB || captureA === captureB" @click="compareCaptures">{{ t('compareCaptures') }}</button>
        <button :disabled="!selectedPerformanceCapture" @click="exportPerformanceCapture">{{ t('exportCaptureCi') }}</button>
        <dl v-if="tools.comparison"><div><dt>{{ t('averageFrameDelta') }}</dt><dd>{{ signed(tools.comparison.averageFrameDeltaMs) }} ms</dd></div><div><dt>{{ t('peakFrameDelta') }}</dt><dd>{{ signed(tools.comparison.peakFrameDeltaMs) }} ms</dd></div><div><dt>GPU delta</dt><dd>{{ tools.comparison.gpuDeltaMs === null ? 'n/a' : `${signed(tools.comparison.gpuDeltaMs)} ms` }}</dd></div><div><dt>Draw-call delta</dt><dd>{{ signedInteger(tools.comparison.drawCallDelta) }}</dd></div><div><dt>Texture delta</dt><dd>{{ signed(tools.comparison.textureMemoryDeltaMb) }} MB</dd></div><div><dt>{{ t('memoryDelta') }}</dt><dd>{{ tools.comparison.memoryDeltaMb === null ? 'n/a' : `${signed(tools.comparison.memoryDeltaMb)} MB` }}</dd></div><div><dt>{{ t('assetDelta') }}</dt><dd>{{ signed(tools.comparison.assetDeltaMb) }} MB</dd></div><div><dt>{{ t('entityDelta') }}</dt><dd>{{ signed(tools.comparison.entityDelta) }}</dd></div></dl>
        <div v-if="selectedPerformanceCapture" class="budget-checks"><strong :class="{ danger: !selectedPerformanceCapture.budget.passed }">CI {{ selectedPerformanceCapture.budget.passed ? 'PASSED' : 'FAILED' }}</strong><article v-for="check in selectedPerformanceCapture.budget.checks" :key="check.id" :class="{ danger: !check.passed }"><span>{{ check.id }}</span><output>{{ check.actual === null ? 'n/a' : check.actual.toFixed(2) }} / {{ check.limit }} {{ check.unit }}</output></article></div>
      </section>
      <section class="card lifetime-card">
        <header><strong>{{ t('objectLifetimes') }}</strong><span>{{ tools.lifetimeEvents.length }}</span></header>
        <label><span>{{ t('lifetimeCapacity') }}</span><input v-model.number="settings.performance.lifetimeCapacity" type="number" min="100" max="20000" @change="commit"></label>
        <div class="event-list"><article v-for="event in recentLifetimeEvents" :key="`${event.frame}:${event.kind}:${event.id}:${event.action}`"><code>#{{ event.frame }}</code><span>{{ event.kind }}</span><strong>{{ event.action }}</strong><em>{{ event.id }}</em></article></div>
        <button @click="clearPerformanceTools">{{ t('clearLifetimeData') }}</button>
      </section>
    </div>

    <div v-else-if="activeTab === 'replay'" class="panel-scroll studio-grid">
      <section class="card">
        <header><strong>{{ t('deterministicReplay') }}</strong><span>{{ replayState.status || t('idle') }}</span></header>
        <label><span>{{ t('randomSeed') }}</span><input v-model.number="settings.replay.seed" type="number" min="0" max="4294967295" @change="commit"></label>
        <label><span>{{ t('replayCapacity') }}</span><input v-model.number="settings.replay.capacity" type="number" min="60" max="60000" @change="commit"></label>
        <label><span>{{ t('strictChecksums') }}</span><input v-model="settings.replay.strictChecksums" type="checkbox" @change="commit"></label>
        <label><span>{{ t('recordedFrames') }}</span><output>{{ replayState.frames.length }}</output></label>
        <label><span>{{ t('checksumMismatches') }}</span><output :class="{ danger: replayState.mismatches.length }">{{ replayState.mismatches.length }}</output></label>
        <div class="button-row"><button class="primary" :disabled="replayState.mode !== 'idle'" @click="recordReplay">{{ t('recordReplay') }}</button><button :disabled="replayState.mode === 'idle'" @click="finishReplay">{{ t('stopReplay') }}</button></div>
        <p>{{ t('determinismLimit') }}</p>
      </section>
      <section class="card">
        <header><strong>{{ t('replayAssets') }}</strong><span>{{ replayAssets.length }}</span></header>
        <label><span>{{ t('replayAsset') }}</span><select v-model="selectedReplay"><option value="">{{ t('none') }}</option><option v-for="asset in replayAssets" :key="asset.uuid" :value="asset.uuid">{{ asset.name }}</option></select></label>
        <div class="button-row"><button :disabled="!selectedReplay || replayState.mode !== 'idle'" @click="playReplay">{{ t('playReplay') }}</button><button :disabled="!selectedReplay" @click="downloadReplay">{{ t('exportJson') }}</button></div>
        <div class="event-list"><article v-for="mismatch in replayState.mismatches.slice(-32)" :key="mismatch.tick"><code>#{{ mismatch.tick }}</code><strong class="danger">{{ t('checksumMismatch') }}</strong><em>{{ mismatch.expected }} → {{ mismatch.actual }}</em></article></div>
      </section>
    </div>

    <div v-else-if="activeTab === 'tests'" class="tests-layout">
      <aside class="test-list card">
        <header><strong>{{ t('projectTests') }}</strong><button @click="addTest">+ {{ t('newTest') }}</button></header>
        <button v-for="test in settings.testing.tests" :key="test.id" :class="{ active: selectedTestId === test.id }" @click="selectedTestId = test.id"><strong>{{ test.name }}</strong><span>{{ test.kind }}</span></button>
        <p v-if="!settings.testing.tests.length">{{ t('noProjectTests') }}</p>
      </aside>
      <main class="card test-editor">
        <template v-if="selectedTest">
          <header><strong>{{ selectedTest.name }}</strong><button class="danger-button" @click="removeTest">{{ t('delete') }}</button></header>
          <div class="form-grid"><label><span>{{ t('name') }}</span><input v-model="selectedTest.name" maxlength="120" @change="commit"></label><label><span>{{ t('testKind') }}</span><select v-model="selectedTest.kind" @change="commit"><option>unit</option><option>integration</option><option>scene</option><option>ui</option><option>physics</option><option>animation</option><option>regression</option><option>headless</option></select></label><label><span>{{ t('scene') }}</span><select v-model="selectedTest.sceneUuid" @change="commit"><option value="">{{ t('activeScene') }}</option><option v-for="scene in sceneManager.scenes" :key="scene.uuid" :value="scene.uuid">{{ scene.name }}</option></select></label><label><span>{{ t('simulationSteps') }}</span><input v-model.number="selectedTest.steps" type="number" min="0" max="60000" @change="commit"></label><label><span>{{ t('timeoutMs') }}</span><input v-model.number="selectedTest.timeoutMs" type="number" min="100" max="120000" @change="commit"></label><label class="check"><input v-model="selectedTest.captureScreenshot" type="checkbox" :disabled="selectedTest.kind === 'headless'" @change="commit"><span>{{ t('captureScreenshot') }}</span></label></div>
          <header><strong>{{ t('assertions') }}</strong><button @click="addAssertion">+ {{ t('assertion') }}</button></header>
          <div class="assertion-list"><article v-for="(assertion, index) in selectedTest.assertions" :key="index"><select v-model="assertion.kind" @change="commit"><option>entityCountAtLeast</option><option>entityExists</option><option>finitePhysics</option><option>checksumEquals</option><option>noRuntimeErrors</option></select><input v-model="assertion.target" :placeholder="t('target')" maxlength="128" @change="commit"><input v-model="assertion.expected" :placeholder="t('expected')" maxlength="256" @change="commit"><button @click="selectedTest.assertions.splice(index, 1); commit()">×</button></article></div>
          <div class="button-row"><button class="primary" :disabled="testRunnerState.running" @click="runTests(selectedTest.id)">{{ t('runSelectedTest') }}</button><button :disabled="testRunnerState.running" @click="runTests()">{{ t('runAllTests') }}</button><button :disabled="!testRunnerState.lastReport" @click="downloadTestReport('json')">{{ t('exportJson') }}</button><button :disabled="!testRunnerState.lastReport" @click="downloadTestReport('junit')">JUnit XML</button></div>
        </template>
        <p v-else>{{ t('selectProjectTest') }}</p>
      </main>
      <aside class="card results-card">
        <header><strong>{{ t('testResults') }}</strong><span>{{ testRunnerState.completed }}/{{ testRunnerState.total }}</span></header>
        <p v-if="testRunnerState.running">{{ t('runningTest', { name: testRunnerState.activeTest }) }}</p>
        <article v-for="result in testRunnerState.results" :key="result.id" :class="result.status"><strong>{{ result.name }}</strong><span>{{ result.status }} · {{ result.durationMs.toFixed(1) }} ms</span><small v-if="result.error">{{ result.error }}</small><small v-for="assertion in result.assertions.filter(item => !item.passed)" :key="assertion.kind">{{ assertion.message }}</small><img v-if="result.screenshot" :src="result.screenshot" :alt="result.name"></article>
      </aside>
    </div>

    <div v-else-if="activeTab === 'data'" class="data-layout">
      <aside class="card data-assets">
        <header><strong>{{ t('dataResources') }}</strong></header>
        <button @click="newSchema">+ {{ t('dataSchema') }}</button><button @click="newTable">+ {{ t('dataTable') }}</button>
        <label><span>{{ t('dataSchema') }}</span><select v-model="schemaGuid"><option value="">{{ t('none') }}</option><option v-for="asset in schemaAssets" :key="asset.uuid" :value="asset.uuid">{{ asset.name }}</option></select></label>
        <label><span>{{ t('dataTable') }}</span><select v-model="tableGuid"><option value="">{{ t('none') }}</option><option v-for="asset in tableAssets" :key="asset.uuid" :value="asset.uuid">{{ asset.name }}</option></select></label>
        <p>{{ t('dataResourceHint') }}</p>
      </aside>
      <main class="card data-editor">
        <template v-if="schemaDraft">
          <header><strong>{{ t('schemaFields') }}</strong><div><button @click="addField">+ {{ t('field') }}</button><button class="primary" :disabled="!schemaGuid" @click="saveSchemaDraft">{{ t('saveAsset') }}</button><button @click="downloadAccessors">{{ t('typedAccessors') }}</button></div></header>
          <div class="form-grid"><label><span>{{ t('schemaName') }}</span><input v-model="schemaDraft.name" maxlength="80"></label><label><span>{{ t('schemaVersion') }}</span><input v-model.number="schemaDraft.schemaVersion" type="number" min="1" max="65535"></label><label><span>{{ t('keyField') }}</span><select v-model="schemaDraft.keyField"><option v-for="field in schemaDraft.fields" :key="field.name">{{ field.name }}</option></select></label></div>
          <div class="field-list"><article v-for="(field, index) in schemaDraft.fields" :key="index"><input v-model="field.name" maxlength="80"><select v-model="field.type"><option>string</option><option>number</option><option>integer</option><option>boolean</option><option>json</option></select><label><input v-model="field.required" type="checkbox">{{ t('required') }}</label><input :value="String(field.default ?? '')" :placeholder="t('defaultValue')" @change="setFieldDefault(field, $event)"><button :disabled="schemaDraft.fields.length <= 1" @click="schemaDraft.fields.splice(index, 1)">×</button></article></div>
        </template>
      </main>
      <aside class="card import-card">
        <header><strong>{{ t('importData') }}</strong><span>{{ tableDraft?.rows.length ?? 0 }} {{ t('rows') }}</span></header>
        <label><span>{{ t('sourceType') }}</span><select v-model="dataSourceType"><option value="csv">CSV</option><option value="json">JSON</option><option value="database">{{ t('databaseJson') }}</option></select></label>
        <textarea v-model="dataImportSource" :placeholder="t('pasteDataSource')"></textarea>
        <div class="button-row"><button :disabled="!schemaDraft || !tableGuid || !dataImportSource" @click="importData">{{ t('validateImport') }}</button><button class="primary" :disabled="!tableGuid || !tableDraft" @click="saveTableDraft">{{ t('saveAsset') }}</button></div>
        <p :class="{ danger: dataIssues.length }">{{ dataStatus }}</p>
        <div class="issue-list"><article v-for="issue in dataIssues.slice(0, 100)" :key="`${issue.row}:${issue.field}:${issue.message}`"><code>#{{ issue.row }}</code><strong>{{ issue.field }}</strong><span>{{ issue.message }}</span></article></div>
      </aside>
    </div>

    <div v-else-if="activeTab === 'jobs'" class="panel-scroll studio-grid">
      <section class="card">
        <header><strong>{{ t('jobScheduler') }}</strong><span>{{ jobs.workerAvailable ? t('workersAvailable') : t('singleThreadFallback') }}</span></header>
        <label><span>{{ t('maxWorkers') }}</span><input v-model.number="settings.jobs.maxWorkers" type="number" min="1" max="8" @change="commit"></label>
        <label><span>{{ t('maxQueuedJobs') }}</span><input v-model.number="settings.jobs.maxQueued" type="number" min="8" max="2048" @change="commit"></label>
        <label><span>{{ t('jobTimeout') }}</span><input v-model.number="settings.jobs.timeoutMs" type="number" min="100" max="120000" @change="commit"></label>
        <dl><div><dt>{{ t('active') }}</dt><dd>{{ jobs.active }}</dd></div><div><dt>{{ t('queued') }}</dt><dd>{{ jobs.queued }}</dd></div><div><dt>{{ t('completed') }}</dt><dd>{{ jobs.completed }}</dd></div><div><dt>{{ t('failed') }}</dt><dd>{{ jobs.failed }}</dd></div><div><dt>{{ t('cancelled') }}</dt><dd>{{ jobs.cancelled }}</dd></div><div><dt>{{ t('averageTime') }}</dt><dd>{{ jobs.averageMs.toFixed(2) }} ms</dd></div></dl>
        <div class="button-row"><button @click="runJob('hash')">{{ t('testHashJob') }}</button><button @click="runJob('parseJson')">{{ t('testJsonJob') }}</button><button :disabled="!cancelJob" @click="cancelActiveJob">{{ t('cancelJob') }}</button></div>
        <p>{{ jobResult || jobs.lastError || t('jobSchedulerHint') }}</p>
      </section>
    </div>

    <div v-else-if="activeTab === 'scripts'" class="panel-scroll script-profile-layout">
      <section class="card script-profile-table">
        <header><strong>{{ t('scriptProfiler') }}</strong><span>{{ profilerState.scriptFunctions.length }} {{ t('functions') }}</span></header>
        <div class="button-row"><button @click="takeScriptCapture">{{ t('capturePerformance') }}</button><button :disabled="!profilerState.scriptFunctions.length" @click="exportCurrentScriptProfile">{{ t('exportJson') }}</button><button @click="clearProfiler">{{ t('clearSamples') }}</button></div>
        <div class="profile-heading"><span>{{ t('function') }}</span><span>{{ t('calls') }}</span><span>{{ t('totalTime') }}</span><span>{{ t('maximumTime') }}</span><span>{{ t('allocationEstimate') }}</span></div>
        <article v-for="entry in profilerState.scriptFunctions" :key="`${entry.scriptUuid}:${entry.functionName}`" class="profile-row"><span><strong>{{ entry.functionName }}</strong><small>{{ entry.scriptName }}</small></span><output>{{ entry.calls }}</output><output>{{ entry.totalMs.toFixed(3) }} ms</output><output>{{ entry.maximumMs.toFixed(3) }} ms</output><output>{{ entry.allocationEstimateBytes }} B</output></article>
        <p v-if="!profilerState.scriptFunctions.length">{{ t('scriptProfilerEmpty') }}</p>
      </section>
      <section class="card script-capture-card">
        <header><strong>{{ t('captureComparison') }}</strong><span>{{ profilerState.scriptCaptures.length }}</span></header>
        <label><span>A</span><select v-model.number="scriptCaptureA"><option :value="-1">{{ t('none') }}</option><option v-for="(capture, index) in profilerState.scriptCaptures" :key="capture.createdAt" :value="index">{{ new Date(capture.createdAt).toLocaleTimeString() }}</option></select></label>
        <label><span>B</span><select v-model.number="scriptCaptureB"><option :value="-1">{{ t('none') }}</option><option v-for="(capture, index) in profilerState.scriptCaptures" :key="capture.createdAt" :value="index">{{ new Date(capture.createdAt).toLocaleTimeString() }}</option></select></label>
        <button :disabled="scriptCaptureA < 0 || scriptCaptureB < 0 || scriptCaptureA === scriptCaptureB" @click="compareScriptCaptures">{{ t('compareCaptures') }}</button>
        <div class="profile-comparison"><article v-for="entry in scriptComparison" :key="entry.key"><strong>{{ entry.key }}</strong><span>{{ t('calls') }} {{ signedInteger(entry.callsDelta) }}</span><span>{{ t('totalTime') }} {{ signed(entry.totalMsDelta) }} ms</span><span>{{ t('allocationEstimate') }} {{ signedInteger(entry.allocationDelta) }} B</span></article></div>
      </section>
    </div>

    <div v-else-if="activeTab === 'runtime'" class="panel-scroll runtime-layout">
      <section class="card">
        <header><strong>{{ t('engineDiagnostics') }}</strong><span>{{ physicsState.simulationRunning ? t('live') : t('paused') }}</span></header>
        <dl><div><dt>{{ t('runtimeBodies') }}</dt><dd>{{ physicsState.engineDiagnostics.bodyCount }}</dd></div><div><dt>{{ t('runtimeConnections') }}</dt><dd>{{ physicsState.engineDiagnostics.connectionCount }}</dd></div><div><dt>{{ t('stepsLastFrame') }}</dt><dd>{{ physicsState.engineDiagnostics.stepsLastFrame }}</dd></div><div><dt>{{ t('totalPhysicsSteps') }}</dt><dd>{{ physicsState.engineDiagnostics.totalPhysicsSteps }}</dd></div><div><dt>{{ t('interpolationAlpha') }}</dt><dd>{{ physicsState.engineDiagnostics.interpolationAlpha.toFixed(3) }}</dd></div><div><dt>{{ t('droppedTime') }}</dt><dd>{{ physicsState.engineDiagnostics.droppedSeconds.toFixed(4) }} s</dd></div><div><dt>{{ t('pendingEvents') }}</dt><dd>{{ physicsState.engineDiagnostics.eventCount }}</dd></div><div><dt>{{ t('configurationRebuilds') }}</dt><dd>{{ physicsState.engineDiagnostics.configurationRebuilds }}</dd></div></dl>
      </section>
      <section class="card save-data-card"><header><strong>{{ t('saveData') }}</strong><span>{{ t('runtimeScope') }}</span></header><SaveDataSettings /></section>
      <section class="card">
        <header><strong>{{ t('diagnostics') }}</strong><span>{{ faultCenterState.recent.length }} {{ t('errors') }}</span></header>
        <p>{{ t('diagnosticDetailsHint') }}</p>
        <div class="event-list"><article v-for="fault in faultCenterState.recent.slice(-20).reverse()" :key="fault.id"><code>{{ new Date(fault.timestamp).toLocaleTimeString() }}</code><span>{{ fault.severity }}</span><strong>{{ fault.context }}</strong><em>{{ fault.message }}</em></article></div>
        <button @click="copyDiagnostics">{{ diagnosticsCopied ? t('copied') : t('copyDiagnostics') }}</button>
      </section>
    </div>

    <div v-else class="panel-scroll network-layout">
      <section class="card">
        <header><strong>{{ t('optionalNetworking') }}</strong><span>{{ networkPackageEnabled ? t('installed') : t('excludedByDefault') }}</span></header>
        <p>{{ t('networkingOptionalHint') }}</p>
        <button v-if="!networkPackageEnabled" class="primary" @click="installNetworking">{{ t('enableNetworkingPackage') }}</button>
        <template v-else>
          <label><span>{{ t('networkingEnabled') }}</span><input v-model="settings.networking.enabled" type="checkbox" @change="commit"></label>
          <label><span>{{ t('networkRole') }}</span><select v-model="settings.networking.role" @change="commit"><option value="client">Client</option><option value="server">Server</option><option value="host">Host</option></select></label>
          <label><span>{{ t('transport') }}</span><select v-model="settings.networking.transport" @change="commit"><option value="websocket">WebSocket</option><option value="native-udp">Native UDP</option></select></label>
          <label><span>{{ t('endpoint') }}</span><input v-model="settings.networking.endpoint" maxlength="512" @change="commit"></label>
          <label><span>{{ t('bindAddress') }}</span><input v-model="settings.networking.bindAddress" maxlength="256" @change="commit"></label>
          <label><span>{{ t('snapshotRate') }}</span><input v-model.number="settings.networking.snapshotRate" type="number" min="1" max="120" @change="commit"></label>
          <label><span>{{ t('interpolationMs') }}</span><input v-model.number="settings.networking.interpolationMs" type="number" min="0" max="2000" @change="commit"></label>
          <label><span>{{ t('rollbackFrames') }}</span><input v-model.number="settings.networking.rollbackFrames" type="number" min="0" max="600" @change="commit"></label>
          <label><span>{{ t('bandwidthLimit') }}</span><input v-model.number="settings.networking.bandwidthKbps" type="number" min="8" max="1000000" @change="commit"></label>
          <label><span>{{ t('autoReconnect') }}</span><input v-model="settings.networking.reconnect" type="checkbox" @change="commit"></label>
          <div class="button-row"><button :disabled="!settings.networking.enabled || networkBusy" @click="startNetwork">{{ t('connect') }}</button><button :disabled="networkBusy" @click="stopNetwork">{{ t('disconnect') }}</button><button @click="replicateSelected">{{ t('replicateSelected') }}</button></div>
        </template>
      </section>
      <section class="card">
        <header><strong>{{ t('multiplayerDiagnostics') }}</strong><span>{{ networkState?.status ?? 'disabled' }}</span></header>
        <dl v-if="networkState"><div><dt>{{ t('peers') }}</dt><dd>{{ networkState.peers }}</dd></div><div><dt>{{ t('ping') }}</dt><dd>{{ networkState.pingMs === null ? 'n/a' : `${networkState.pingMs.toFixed(1)} ms` }}</dd></div><div><dt>{{ t('sentReceived') }}</dt><dd>{{ networkState.sentBytes }} / {{ networkState.receivedBytes }} B</dd></div><div><dt>{{ t('packets') }}</dt><dd>{{ networkState.sentPackets }} / {{ networkState.receivedPackets }}</dd></div><div><dt>{{ t('droppedPackets') }}</dt><dd>{{ networkState.droppedPackets }}</dd></div><div><dt>RPC</dt><dd>{{ networkState.rpcCalls }}</dd></div><div><dt>{{ t('snapshots') }}</dt><dd>{{ networkState.snapshots }}</dd></div><div><dt>{{ t('rollbacks') }}</dt><dd>{{ networkState.rollbacks }}</dd></div><div><dt>{{ t('predictionCorrections') }}</dt><dd>{{ networkState.predictionCorrections }}</dd></div></dl>
        <p v-if="networkState?.lastError" class="danger">{{ networkState.lastError }}</p>
        <div class="event-list"><article v-for="event in networkState?.events.slice(-30) ?? []" :key="event.at"><code>{{ new Date(event.at).toLocaleTimeString() }}</code><span>{{ event.message }}</span></article></div>
      </section>
      <section class="card">
        <header><strong>{{ t('replicatedProperties') }}</strong><span>{{ settings.networking.replicatedEntities.length }}</span></header>
        <article v-for="definition in settings.networking.replicatedEntities" :key="definition.entityUuid" class="replication-row"><strong>{{ entityName(definition.entityUuid) }}</strong><select v-model="definition.authority" @change="commit"><option value="server">Server</option><option value="owner">Owner</option></select><div class="property-toggles"><label><input v-model="definition.properties" type="checkbox" value="transform" @change="commit">Transform</label><label><input v-model="definition.properties" type="checkbox" value="rotation" @change="commit">Rotation</label><label><input v-model="definition.properties" type="checkbox" value="velocity" @change="commit">Velocity</label></div><label><input v-model="definition.interpolate" type="checkbox" @change="commit">{{ t('interpolate') }}</label><label><input v-model="definition.predict" type="checkbox" @change="commit">{{ t('predict') }}</label><button aria-label="Remove replication" @click="removeReplication(definition.entityUuid)">×</button></article>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { assetState, createTextAsset, readTextAsset } from '../assets/AssetDatabase'
import type { DataFieldSchema, DataSchemaResource, DataTableResource, DataValidationIssue } from '../runtime/dataResources'
import { createDataSchemaAsset, createDataTableAsset, generateTypedDataAccessors, importDataText, readDataSchema, readDataTable, saveDataSchema, saveDataTable } from '../runtime/dataResources'
import { gameplayRuntime } from '../runtime/GameplayRuntime'
import { faultCenterState, faultDiagnostics, reportRecoverableError } from '../runtime/faultCenter'
import { jobSchedulerState as jobs, scheduleJob } from '../runtime/jobScheduler'
import { comparePerformanceCaptures, capturePerformance, clearPerformanceTools, performanceCaptureCiReport, performanceToolsState as tools, serializePerformanceCapture } from '../runtime/performanceTools'
import { physicsDebugState } from '../runtime/physicsDebug'
import { addProfilerAnnotation, captureScriptProfile, clearProfiler, compareScriptProfiles, profilerState } from '../runtime/profiler'
import { loadProductionSettings, productionSettings as settings, serializeProductionSettings } from '../runtime/production'
import { enableOfficialPackage, OFFICIAL_NETWORKING_PACKAGE_ID, packageEnabled } from '../runtime/packages'
import { exportReplay, normalizeReplayDocument, replayState, startReplayPlayback, startReplayRecording, stopReplay } from '../runtime/replay'
import { runProjectTests, testReportJUnit, testRunnerState } from '../runtime/testRunner'
import { t } from '../i18n'
import { audioRuntime } from '../runtime/audio'
import { requestConfirmation } from '../store/dialog'
import { editorState } from '../store/editor'
import { getSceneJSON, loadProject, physicsState, pushHistory, sceneManager, toggleSimulation } from '../store/physics'
import SaveDataSettings from './SaveDataSettings.vue'
import { feedbackDiagnostics } from '../runtime/editorFeedback'
import { recoveryDiagnostics } from '../runtime/recovery'

type TabId = 'trace' | 'memory' | 'replay' | 'tests' | 'data' | 'jobs' | 'scripts' | 'runtime' | 'network'
const activeTab = ref<TabId>('trace')
const current = computed(() => profilerState.current)
const timingMetrics = computed(() => [{ label: 'frameTime' as const, value: current.value.frameMs }, { label: 'inputTime' as const, value: current.value.inputMs }, { label: 'physicsTime' as const, value: current.value.physicsMs }, { label: 'renderingTime' as const, value: current.value.renderingMs }, { label: 'scriptsTime' as const, value: current.value.scriptsMs }, { label: 'animationTime' as const, value: current.value.animationMs }, { label: 'audioTime' as const, value: current.value.audioMs }, { label: 'assetsTime' as const, value: current.value.assetsMs }, { label: 'otherTime' as const, value: current.value.otherMs }])
const activeContacts = computed(() => Math.round(physicsState.world.entities.reduce((total, entity) => total + entity.contactCount, 0) / 2))
const sleepingBodies = computed(() => physicsState.world.entities.filter(entity => entity.rigidBody.sleeping).length)
const continuousBodies = computed(() => physicsState.world.entities.filter(entity => entity.rigidBody.continuousCollision === 'Continuous').length)
const jointConstraints = computed(() => physicsState.world.entities.filter(entity => entity.components.some(component => component.kind.endsWith('Joint2D'))).length + physicsState.world.connections.length)
const chartPoints = computed(() => profilerState.samples.map((sample, index, all) => `${all.length <= 1 ? 0 : index / (all.length - 1) * 600},${110 - Math.min(100, sample.frameMs * 3)}`).join(' '))
const debugOptions = [{ key: 'showColliders', label: 'showColliders' }, { key: 'showContactPoints', label: 'showContactPoints' }, { key: 'showNormals', label: 'showNormals' }, { key: 'showSleepingBodies', label: 'showSleepingBodies' }, { key: 'showAabbs', label: 'showAabbs' }, { key: 'showJointConstraints', label: 'showJointConstraints' }, { key: 'showRopeNodes', label: 'showRopeNodes' }, { key: 'showCharacterContacts', label: 'showCharacterContacts' }, { key: 'showCentersOfMass', label: 'showCentersOfMass' }, { key: 'showVelocities', label: 'showVelocities' }, { key: 'showForces', label: 'showForces' }, { key: 'colorByPhysicsLayer', label: 'colorByPhysicsLayer' }] as const
const recentLifetimeEvents = computed(() => tools.lifetimeEvents.slice(-200).reverse())
const captureA = ref(''), captureB = ref('')
const annotationDraft = ref('')
const selectedPerformanceCapture = computed(() => tools.captures.find(capture => capture.id === (captureB.value || captureA.value)) ?? null)
const replayAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'replay'))
const selectedReplay = ref('')
const selectedTestId = ref(settings.testing.tests[0]?.id ?? '')
const selectedTest = computed(() => settings.testing.tests.find(test => test.id === selectedTestId.value) ?? null)
const schemaAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'dataSchema'))
const tableAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'dataTable'))
const schemaGuid = ref(schemaAssets.value[0]?.uuid ?? ''), tableGuid = ref(tableAssets.value[0]?.uuid ?? '')
const schemaDraft = ref<DataSchemaResource | null>(null), tableDraft = ref<DataTableResource | null>(null)
const dataSourceType = ref<'csv' | 'json' | 'database'>('csv'), dataImportSource = ref(''), dataIssues = ref<DataValidationIssue[]>([]), dataStatus = ref('')
const jobResult = ref(''), cancelJob = ref<(() => void) | null>(null)
type NetworkModule = typeof import('../runtime/networking')
const networkModule = shallowRef<NetworkModule | null>(null), networkState = shallowRef<NetworkModule['networkingState'] | null>(null), networkBusy = ref(false)
const networkPackageEnabled = computed(() => packageEnabled(OFFICIAL_NETWORKING_PACKAGE_ID))
const tabs = computed<Array<{ id: TabId; label: Parameters<typeof t>[0] }>>(() => [
  { id: 'trace', label: 'frameTrace' }, { id: 'memory', label: 'memoryAndLifetimes' }, { id: 'replay', label: 'replay' },
  { id: 'tests', label: 'tests' }, { id: 'data', label: 'data' }, { id: 'jobs', label: 'jobs' }, { id: 'scripts', label: 'scriptProfiler' }, { id: 'runtime', label: 'debug' },
  ...(networkPackageEnabled.value ? [{ id: 'network' as const, label: 'networking' as const }] : [])
])
const diagnosticsCopied = ref(false)
const scriptCaptureA = ref(-1), scriptCaptureB = ref(-1)
const scriptComparison = ref<ReturnType<typeof compareScriptProfiles>>([])

watch(schemaGuid, guid => { schemaDraft.value = guid ? readDataSchema(guid) : null }, { immediate: true })
watch(tableGuid, guid => { tableDraft.value = guid ? readDataTable(guid) : null }, { immediate: true })

function selectTab(tab: TabId) { activeTab.value = tab; if (tab === 'network' && networkPackageEnabled.value) void safeLoadNetworkModule() }
async function copyDiagnostics() { try { await navigator.clipboard.writeText(`${faultDiagnostics()}\n\n${feedbackDiagnostics()}\n\n${recoveryDiagnostics()}`); diagnosticsCopied.value = true; setTimeout(() => { diagnosticsCopied.value = false }, 1500) } catch (error) { reportRecoverableError(error, 'Copy Debug diagnostics') } }
function commit() { loadProductionSettings(serializeProductionSettings()); pushHistory('Edit production settings', 'project:production') }
function signed(value: number) { return `${value >= 0 ? '+' : ''}${value.toFixed(2)}` }
function signedInteger(value: number) { return `${value >= 0 ? '+' : ''}${Math.round(value)}` }
function takeCapture() { const capture = capturePerformance(`Capture ${tools.captures.length + 1}`, editorState.rendererStats); if (!captureA.value) captureA.value = capture.id; else captureB.value = capture.id }
function compareCaptures() { comparePerformanceCaptures(captureA.value, captureB.value) }
function annotate() { addProfilerAnnotation(annotationDraft.value); annotationDraft.value = '' }
function exportPerformanceCapture() { const capture = selectedPerformanceCapture.value; if (!capture) return; download(`${capture.id}.nova-perf.json`, serializePerformanceCapture(capture)); download(`${capture.id}.ci.json`, JSON.stringify(performanceCaptureCiReport(capture), null, 2)) }
function takeScriptCapture() { const capture = captureScriptProfile(); const index = profilerState.scriptCaptures.indexOf(capture); if (scriptCaptureA.value < 0) scriptCaptureA.value = index; else scriptCaptureB.value = index }
function compareScriptCaptures() { const first = profilerState.scriptCaptures[scriptCaptureA.value], second = profilerState.scriptCaptures[scriptCaptureB.value]; scriptComparison.value = first && second ? compareScriptProfiles(first, second) : [] }
function exportCurrentScriptProfile() { const capture = captureScriptProfile(); download(`nova-script-profile-${Date.now()}.json`, JSON.stringify(capture, null, 2)) }

function recordReplay() { startReplayRecording(getSceneJSON(), physicsState.globalSettings.tickRate); toggleSimulation(true); gameplayRuntime.beginSession() }
function finishReplay() { const wasRecording = replayState.mode === 'recording'; const document = wasRecording ? exportReplay(physicsState.globalSettings.tickRate) : null; stopReplay(); if (document) { const asset = createTextAsset(`Replay ${new Date().toISOString().replace(/[:.]/g, '-')}`, 'replay', JSON.stringify(document, null, 2), 'Assets/Replays'); selectedReplay.value = asset.uuid; pushHistory('Record deterministic replay') } }
function playReplay() { const source = readTextAsset(selectedReplay.value); if (!source) return; const document = normalizeReplayDocument(JSON.parse(source)); if (!loadProject(document.initialProject)) return; toggleSimulation(true); gameplayRuntime.beginSession(); startReplayPlayback(document) }
function download(name: string, source: string, type = 'application/json') { const url = URL.createObjectURL(new Blob([source], { type })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0) }
function downloadReplay() { const source = readTextAsset(selectedReplay.value); if (source) download('recording.nova-replay', source) }

function addTest() { const id = `test-${Date.now().toString(36)}`; settings.testing.tests.push({ id, name: t('newTest'), kind: 'scene', sceneUuid: sceneManager.activeSceneUuid, steps: 60, timeoutMs: settings.testing.defaultTimeoutMs, captureScreenshot: false, tags: [], fixture: '', setup: '', teardown: '', seed: 1, retries: 0, flakyInfrastructure: false, assertions: [{ kind: 'finitePhysics', target: '', expected: '' }] }); selectedTestId.value = id; commit() }
async function removeTest() { const test = selectedTest.value; if (!test || !await requestConfirmation({ title: t('delete'), message: test.name, confirmLabel: t('delete'), cancelLabel: t('cancel'), destructive: true })) return; settings.testing.tests.splice(settings.testing.tests.indexOf(test), 1); selectedTestId.value = settings.testing.tests[0]?.id ?? ''; commit() }
function addAssertion() { selectedTest.value?.assertions.push({ kind: 'finitePhysics', target: '', expected: '' }); commit() }
async function runTests(id?: string) { try { await runProjectTests(id) } catch (error) { testRunnerState.error = error instanceof Error ? error.message : String(error) } }
function downloadTestReport(format: 'json' | 'junit') { const report = testRunnerState.lastReport; if (!report) return; download(format === 'json' ? 'nova-test-report.json' : 'nova-test-report.xml', format === 'json' ? JSON.stringify(report, null, 2) : testReportJUnit(report), format === 'json' ? 'application/json' : 'application/xml') }

function newSchema() { const asset = createDataSchemaAsset(); schemaGuid.value = asset.uuid; pushHistory('Create data schema') }
function newTable() { const asset = createDataTableAsset('Data Table', schemaGuid.value || null); tableGuid.value = asset.uuid; pushHistory('Create data table') }
function addField() { schemaDraft.value?.fields.push({ name: `field_${(schemaDraft.value?.fields.length ?? 0) + 1}`, type: 'string', required: false, default: '' }) }
function setFieldDefault(field: DataFieldSchema, event: Event) { const value = (event.target as HTMLInputElement).value; field.default = field.type === 'boolean' ? value === 'true' : field.type === 'number' || field.type === 'integer' ? Number(value) || 0 : value }
function saveSchemaDraft() { if (schemaDraft.value && schemaGuid.value && saveDataSchema(schemaGuid.value, schemaDraft.value)) { schemaDraft.value = readDataSchema(schemaGuid.value); pushHistory('Save data schema') } }
function saveTableDraft() { if (tableDraft.value && tableGuid.value && saveDataTable(tableGuid.value, tableDraft.value)) pushHistory('Save data table') }
function downloadAccessors() { if (!schemaDraft.value) return; download(`${schemaDraft.value.name}.generated.ts`, generateTypedDataAccessors(schemaDraft.value), 'text/typescript') }
async function importData() { if (!schemaDraft.value || !tableDraft.value) return; try { const result = await importDataText(dataImportSource.value, dataSourceType.value, schemaDraft.value); tableDraft.value.rows = result.rows; tableDraft.value.source = dataSourceType.value; tableDraft.value.schemaAsset = schemaGuid.value || null; dataIssues.value = result.issues; dataStatus.value = result.issues.length ? t('dataValidationIssues', { count: result.issues.length }) : t('dataValidationPassed', { count: result.rows.length }) } catch (error) { dataIssues.value = []; dataStatus.value = error instanceof Error ? error.message : String(error) } }

function runJob(kind: 'hash' | 'parseJson') { jobResult.value = ''; const job = scheduleJob(kind, kind === 'hash' ? getSceneJSON() : '{"nova":2.8}'); cancelJob.value = job.cancel; void job.promise.then(value => { jobResult.value = typeof value === 'string' ? value : JSON.stringify(value); cancelJob.value = null }).catch(error => { jobResult.value = error instanceof Error ? error.message : String(error); cancelJob.value = null }) }
function cancelActiveJob() { cancelJob.value?.(); cancelJob.value = null }

async function loadNetworkModule() { if (!networkModule.value) networkModule.value = await import('../runtime/networking'); networkState.value = networkModule.value.networkingState }
async function safeLoadNetworkModule() { try { await loadNetworkModule() } catch (error) { reportRecoverableError(error, 'Load optional networking', 'Runtime') } }
function installNetworking() { if (enableOfficialPackage(OFFICIAL_NETWORKING_PACKAGE_ID)) { commit(); void safeLoadNetworkModule() } }
async function startNetwork() { networkBusy.value = true; try { await loadNetworkModule(); await networkModule.value?.startNetworking() } catch (error) { reportRecoverableError(error, 'Start optional networking', 'Runtime') } finally { networkBusy.value = false } }
async function stopNetwork() { networkBusy.value = true; try { await networkModule.value?.stopNetworking() } catch (error) { reportRecoverableError(error, 'Stop optional networking', 'Runtime') } finally { networkBusy.value = false } }
function replicateSelected() { const entity = physicsState.world.entities.find(item => item.id === physicsState.selectedEntityId); if (!entity || settings.networking.replicatedEntities.some(item => item.entityUuid === entity.uuid)) return; settings.networking.replicatedEntities.push({ entityUuid: entity.uuid, authority: 'server', properties: ['transform', 'velocity'], interpolate: true, predict: false }); commit() }
function removeReplication(uuid: string) {
  const index = settings.networking.replicatedEntities.findIndex(item => item.entityUuid === uuid)
  if (index < 0) return
  settings.networking.replicatedEntities.splice(index, 1)
  commit()
}
function entityName(uuid: string) { return physicsState.world.entities.find(entity => entity.uuid === uuid)?.name ?? uuid }
</script>

<style scoped>
.runtime-layout{display:grid;grid-template-columns:minmax(240px,.8fr) minmax(320px,1.3fr) minmax(260px,1fr);gap:9px;align-items:start}.save-data-card :deep(.save-data-settings){padding:0}
@media(max-width:1050px){.runtime-layout{grid-template-columns:1fr 1fr}.runtime-layout .card:last-child{grid-column:1/-1}}@media(max-width:720px){.runtime-layout{display:flex;flex-direction:column}.runtime-layout .card{width:100%}}
.production-panel{height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;background:var(--surface-1)}.production-header{min-height:46px;padding:6px 10px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid var(--border-subtle)}.production-header>div{min-width:170px;display:flex;flex-direction:column}.production-header span,.card p{color:var(--text-muted);font-size:11px;line-height:1.45}.production-header nav,.button-row{display:flex;gap:5px;flex-wrap:wrap}.production-header button,.card button{min-height:29px;padding:0 9px;border:1px solid var(--border-subtle);border-radius:7px;color:var(--text-secondary);background:var(--surface-2);font-size:11px}.production-header button.active,.card button.primary{color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}.panel-scroll{min-height:0;flex:1;padding:9px;overflow:auto}.trace-layout,.studio-grid,.network-layout{display:grid;grid-template-columns:minmax(360px,1.5fr) minmax(240px,.8fr) minmax(240px,.8fr);gap:9px;align-items:start}.studio-grid{grid-template-columns:repeat(3,minmax(250px,1fr))}.network-layout{grid-template-columns:repeat(3,minmax(270px,1fr))}.card{min-width:0;padding:10px;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-2);overflow:auto}.card>header{min-height:31px;display:flex;align-items:center;justify-content:space-between;gap:8px}.card>header span{color:var(--text-muted);font-size:11px}.card label{min-height:33px;display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-size:11px}.card label input:not([type=checkbox]),.card label select{width:55%;min-width:0}.card output{color:var(--text-primary)}.metrics{display:grid;grid-template-columns:repeat(3,minmax(105px,1fr));gap:5px}.metrics article,.card dl div{min-width:0;padding:6px 8px;display:flex;justify-content:space-between;gap:6px;border-radius:6px;background:var(--surface-3);font-size:11px}.metrics span,.card dt{color:var(--text-muted)}.metrics strong,.card dd{margin:0;color:var(--text-primary)}.trace-chart{width:100%;height:110px;margin:8px 0;display:block;border:1px solid var(--border-subtle);border-radius:7px;background:var(--surface-1)}.trace-chart line{stroke:var(--border-subtle);stroke-width:1}.trace-chart polyline{fill:none;stroke:var(--accent);stroke-width:2;vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round}.card dl{display:grid;gap:5px}.event-list,.field-list,.assertion-list{min-height:0;max-height:250px;margin:7px 0;overflow:auto}.event-list article{min-height:27px;padding:4px;display:grid;grid-template-columns:55px 70px 70px minmax(80px,1fr);gap:5px;align-items:center;border-bottom:1px solid var(--border-subtle);font-size:11px}.event-list em{overflow:hidden;color:var(--text-muted);font-style:normal;text-overflow:ellipsis;white-space:nowrap}.danger{color:var(--danger)!important}.danger-button{color:var(--danger)!important;border-color:var(--danger)!important}.tests-layout,.data-layout{min-height:0;flex:1;padding:8px;display:grid;grid-template-columns:minmax(180px,22%) minmax(390px,1fr) minmax(230px,28%);gap:8px;overflow:hidden}.test-list,.data-assets{display:flex;flex-direction:column;gap:5px}.test-list>button{min-height:40px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center}.test-list>button.active{border-color:var(--accent);background:var(--accent-soft)}.test-list>button span{font-size:11px}.test-editor,.data-editor,.results-card,.import-card{min-height:0;overflow:auto}.form-grid{display:grid;grid-template-columns:repeat(3,minmax(120px,1fr));gap:6px}.form-grid label{align-items:stretch;flex-direction:column}.form-grid label input,.form-grid label select{width:100%!important}.form-grid .check{flex-direction:row;align-items:center;justify-content:flex-start}.assertion-list article{display:grid;grid-template-columns:minmax(125px,1fr) 1fr 1fr 27px;gap:5px;margin-bottom:5px}.assertion-list>*{min-width:0}.results-card>article{margin-top:6px;padding:7px;display:flex;flex-direction:column;gap:3px;border-left:3px solid var(--border-strong);border-radius:5px;background:var(--surface-3);font-size:11px}.results-card>article.passed{border-color:var(--success)}.results-card>article.failed,.results-card>article.error,.results-card>article.timeout{border-color:var(--danger)}.results-card img{max-width:100%;border-radius:5px}.data-assets>button{width:100%}.data-editor>header>div{display:flex;gap:5px}.field-list article{display:grid;grid-template-columns:1fr 100px 85px 1fr 28px;gap:5px;margin-bottom:5px}.field-list label{justify-content:flex-start;border:0}.import-card textarea{width:100%;min-height:145px;margin:7px 0;resize:vertical;font:11px/1.45 var(--font-mono)}.issue-list{max-height:170px;overflow:auto}.issue-list article{display:grid;grid-template-columns:35px 70px 1fr;gap:5px;font-size:11px}.replication-row{padding:5px 0;display:grid;grid-template-columns:minmax(80px,1fr) 75px 90px 75px 27px;gap:5px;align-items:center;border-bottom:1px solid var(--border-subtle);font-size:11px}.replication-row label{min-height:25px;justify-content:flex-start;border:0}.replication-row select{width:100%!important}@media(max-width:1050px){.trace-layout,.studio-grid,.network-layout{grid-template-columns:repeat(2,minmax(250px,1fr))}.tests-layout,.data-layout{grid-template-columns:190px minmax(360px,1fr)}.results-card,.import-card{grid-column:1/-1;max-height:260px}.production-header{align-items:flex-start;flex-direction:column}.production-header nav{width:100%}}@media(max-width:720px){.trace-layout,.studio-grid,.network-layout,.tests-layout,.data-layout{display:flex;flex-direction:column;overflow:auto}.card{width:100%;overflow:visible}.form-grid{grid-template-columns:1fr 1fr}.metrics{grid-template-columns:1fr 1fr}.field-list article,.assertion-list article{grid-template-columns:1fr 1fr}.production-header nav{flex-wrap:nowrap;overflow-x:auto}.production-header nav button{flex:0 0 auto}}
.replication-row{grid-template-columns:minmax(80px,1fr) 75px minmax(160px,1.25fr) 85px 70px 27px}.property-toggles{display:flex;gap:7px;flex-wrap:wrap}.property-toggles label{font-size:11px}@media(max-width:1050px){.replication-row{grid-template-columns:1fr 75px 1fr 27px}.property-toggles{grid-column:1/-1}}@media(max-width:720px){.replication-row{display:flex;flex-wrap:wrap}.replication-row>strong,.property-toggles{width:100%}}
.production-panel{container-type:inline-size}@container(max-width:900px){.trace-layout,.studio-grid,.network-layout{grid-template-columns:repeat(2,minmax(240px,1fr))}.tests-layout,.data-layout{grid-template-columns:180px minmax(320px,1fr)}.results-card,.import-card{grid-column:1/-1;max-height:260px}}@container(max-width:620px){.trace-layout,.studio-grid,.network-layout,.tests-layout,.data-layout{display:flex;flex-direction:column;overflow:auto}.card{width:100%;overflow:visible}.production-header{align-items:flex-start;flex-direction:column}.production-header nav{width:100%;flex-wrap:nowrap;overflow-x:auto}.production-header nav button{flex:0 0 auto}.form-grid{grid-template-columns:1fr 1fr}.metrics{grid-template-columns:1fr 1fr}.field-list article,.assertion-list article{grid-template-columns:1fr 1fr}}
.script-profile-layout{display:grid;grid-template-columns:minmax(480px,1.6fr) minmax(260px,.7fr);gap:9px;align-items:start}.profile-heading,.profile-row{display:grid;grid-template-columns:minmax(160px,1.6fr) 62px 92px 92px 110px;gap:7px;align-items:center}.profile-heading{padding:8px;color:var(--text-muted);font-size:11px;text-transform:uppercase}.profile-row{min-height:39px;padding:5px 8px;border-top:1px solid var(--border-subtle);font-size:11px}.profile-row>span{min-width:0;display:flex;flex-direction:column}.profile-row strong,.profile-row small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.profile-row small{color:var(--text-muted)}.profile-comparison{display:grid;gap:6px;margin-top:8px}.profile-comparison article{padding:7px;display:grid;gap:3px;border-radius:7px;background:var(--surface-3);font-size:11px}.profile-comparison span{color:var(--text-muted)}@media(max-width:900px){.script-profile-layout{grid-template-columns:1fr}.profile-heading,.profile-row{grid-template-columns:minmax(130px,1fr) 48px 78px 78px 90px}}@media(max-width:620px){.script-profile-layout{display:flex;flex-direction:column}.script-profile-table,.script-capture-card{width:100%}.profile-heading{display:none}.profile-row{grid-template-columns:1fr 1fr}.profile-row>span{grid-column:1/-1}}
.flame-view{margin:8px 0;display:flex;flex-direction:column;align-items:flex-start;gap:2px}.flame-view article{min-width:120px;padding:4px 7px;display:flex;justify-content:space-between;border-left:3px solid var(--accent);border-radius:4px;background:var(--accent-soft);font-size:11px}.budget-checks{margin-top:8px;display:grid;gap:3px}.budget-checks article{padding:4px 6px;display:flex;justify-content:space-between;border-radius:4px;background:var(--surface-3);font-size:11px}
</style>
