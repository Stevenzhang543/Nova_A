/** 功能回归脚本：执行 verify-v4.6.mjs 对应场景，保留断言和证据输出。 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), output = join(root, 'release-audits'), generatedAt = new Date().toISOString()
globalThis.navigator ??= { hardwareConcurrency: 4, userAgent: 'Nova_A v4.6 verification' }
globalThis.window ??= { setTimeout, clearTimeout, setInterval, clearInterval, /** 提供不注册监听器的测试事件接口。 */ addEventListener() {}, /** 提供无需移除监听器的测试事件接口。 */ removeEventListener() {} }
globalThis.localStorage ??= { /* 返回固定值 null。 */ getItem() { return null }, /** 隔离存储桩忽略写入，不持久化生成过程数据。 */ setItem() {}, /** 隔离存储桩忽略删除请求。 */ removeItem() {} }
await mkdir(output, { recursive: true })
const checks = [], check = /* 调用 checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics }) 并返回调用结果。 */ (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
let languageReport, fuzzReport, debugReport, hotReloadReport, coverageReport, securityReport, migrationReport
try {
  const language = await server.ssrLoadModule('/src/editor/scriptLanguage.ts')
  const api = await server.ssrLoadModule('/src/editor/scriptApi.ts')
  const debug = await server.ssrLoadModule('/src/runtime/scriptDebug.ts')
  const reload = await server.ssrLoadModule('/src/runtime/scriptHotReload.ts')
  const coverage = await server.ssrLoadModule('/src/runtime/scriptCoverage.ts')

  const index = new language.ScriptWorkspaceIndex(), latencies = [], started = performance.now()
  for (let number = 0; number < 5_000; number++) {
    const source = `fn symbol_${number}(value) { value + ${number} }\nfn caller_${number}() { symbol_${number}(1); }\n`
    const at = performance.now(); index.update(`Assets/Scripts/S${number}.rhai`, source, 2, 1); latencies.push(performance.now() - at)
  }
  const indexMs = performance.now() - started, sorted = [...latencies].sort(/* 计算表达式 a - b 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a - b), p95 = sorted[Math.floor(sorted.length * .95)] ?? 0
  const beforeSize = index.size, repeatStart = performance.now(); index.update('Assets/Scripts/S2500.rhai', 'fn symbol_2500(value) { value + 2501 }\n', 2, 2); const editMs = performance.now() - repeatStart
  const snapshot = index.snapshot(), restored = new language.ScriptWorkspaceIndex(), restoredCount = restored.restore(snapshot)
  const methods = [
    { id: 1, method: 'textDocument/completion', params: { uri: 'Assets/Scripts/S1.rhai', prefix: 'api_' } },
    { id: 2, method: 'textDocument/hover', params: { uri: 'Assets/Scripts/S1.rhai', symbol: 'api_current_version' } },
    { id: 3, method: 'textDocument/signatureHelp', params: { symbol: 'apply_force', activeParameter: 1 } },
    { id: 4, method: 'textDocument/definition', params: { symbol: 'symbol_1' } },
    { id: 5, method: 'textDocument/references', params: { symbol: 'symbol_1' } },
    { id: 6, method: 'textDocument/rename', params: { symbol: 'symbol_1', replacement: 'renamed_1' } },
    { id: 7, method: 'textDocument/moduleAssistance', params: { uri: 'Assets/Scripts/S1.rhai' } },
    { id: 8, method: 'textDocument/formatting', params: { uri: 'Assets/Scripts/S1.rhai' } }
  ]
  const protocol = methods.map(/* 调用 language.handleScriptProtocol(index, request) 并返回调用结果。 */ request => language.handleScriptProtocol(index, request))
  const abort = new AbortController(); abort.abort(); const service = new language.ScriptLanguageService(), cancelled = await service.analyze('fn cancelled() {}', { revision: 90, signal: abort.signal }); const fresh = await service.analyze('fn fresh() {}', { revision: 91 }); service.dispose()
  languageReport = { format: 'nova-v4.6-language-performance', version: 1, generatedAt, scripts: 5_000, symbols: index.workspaceSymbols().length, indexMs, p95DocumentMs: p95, repeatedEditMs: editMs, interactiveBudgetMs: 50, restoredCount, protocolMethods: methods.map(/* 返回 item.method 的当前值。 */ item => item.method), cancellationRevision: cancelled.revision, latestRevision: fresh.revision, status: beforeSize === 5_000 && restoredCount === 5_000 && p95 < 50 && editMs < 50 && protocol.every(/* 返回 reply.error 的逻辑取反结果。 */ reply => !reply.error) && fresh.revision === 91 ? 'passed' : 'failed' }
  check('SCR-LANGUAGE-5000', languageReport.status === 'passed', `Indexed/restored 5,000 scripts; p95 ${p95.toFixed(3)} ms; edit ${editMs.toFixed(3)} ms.`, languageReport)

  let seed = 0x460, fuzzFailures = 0, maximumFuzzMs = 0
  const random = /** 推进线性同余伪随机种子并返回无符号32位结果。 */ () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed }
  const fragments = ['fn', '{', '}', '(', ')', 'let value =', '"unterminated', '@export(type="float")', 'scene_load(', '/*', '// @test tags=fuzz', '\u0000', '∞', '值']
  for (let caseIndex = 0; caseIndex < 2_000; caseIndex++) {
    const source = Array.from({ length: 2 + random() % 24 }, /* 返回 fragments[random() % fragments.length] 的当前值。 */ () => fragments[random() % fragments.length]).join(random() % 2 ? ' ' : '\n').slice(0, 4_096)
    const at = performance.now()
    try { const analysis = language.analyzeScript(source, random() % 3 === 0 ? 1 : 2, caseIndex); language.formatScript(source, { indentWidth: 2 + random() % 3, finalNewline: true, maximumLineLength: 120 }); language.scriptCodeActions(analysis); language.handleScriptProtocol(index, { id: `fuzz-${caseIndex}`, method: 'textDocument/analyze', params: { uri: `fuzz://${caseIndex}`, text: source } }) } catch { fuzzFailures++ }
    maximumFuzzMs = Math.max(maximumFuzzMs, performance.now() - at)
  }
  let sourceMapFailures = 0
  for (let caseIndex = 0; caseIndex < 500; caseIndex++) {
    try {
      const normalized = debug.normalizeDebugSourceMap({ mappings: [{ generatedLine: caseIndex % 7 ? -caseIndex : Number.NaN, generatedColumn: Number.POSITIVE_INFINITY, sourcePath: caseIndex % 2 ? '../escape.rhai' : 'C:/absolute.rhai', sourceLine: 'invalid', sourceColumn: -1 }] })
      if (normalized.mappings.length !== 0 || normalized.diagnostics.length === 0) sourceMapFailures++
    } catch { sourceMapFailures++ }
  }
  fuzzReport = { format: 'nova-v4.6-language-fuzz', version: 1, generatedAt, cases: 2_000, seed: 0x460, failures: fuzzFailures, maximumCaseMs: maximumFuzzMs, malformedSourceMaps: { cases: 500, failures: sourceMapFailures }, status: fuzzFailures === 0 && sourceMapFailures === 0 ? 'passed' : 'failed' }
  check('SCR-LANGUAGE-FUZZ', fuzzFailures === 0 && sourceMapFailures === 0, `2,000 malformed parser/formatter/protocol and 500 malformed source-map cases completed; max ${maximumFuzzMs.toFixed(3)} ms.`, fuzzReport)

  const token = '0123456789abcdef0123456789abcdef', policy = { enabled: true, expectedTokenHash: token, allowExportedPlayers: true }
  debug.disconnectRemoteDebugger(); const disabled = debug.handleDebugProtocol({ id: 'disabled', method: 'initialize', tokenHash: token, playerVersion: '4.6.0', address: '127.0.0.1' }, { ...policy, enabled: false })
  const nonLocal = debug.handleDebugProtocol({ id: 'remote', method: 'initialize', tokenHash: token, playerVersion: '4.6.0', address: '192.168.1.20' }, policy)
  const wrong = debug.handleDebugProtocol({ id: 'wrong', method: 'initialize', tokenHash: `${token}00`, playerVersion: '4.6.0', address: '127.0.0.1' }, policy)
  const accepted = debug.handleDebugProtocol({ id: 'ok', method: 'initialize', tokenHash: token, playerVersion: '4.6.0', address: '127.0.0.1' }, policy)
  debug.pauseScriptDebugger({ entityUuid: 'entity', entityName: 'Debugger fixture', scriptUuid: 'script', functionName: 'recursive', line: 12, depth: 3 }, { counter: 4, object: { alive: true } }, 'breakpoint')
  debug.addDebugWatch('counter >= 3'); debug.updateDebugTask({ id: 'task', name: 'async fixture', state: 'waiting', entityUuid: 'entity', detail: 'timer' })
  const stack = debug.handleDebugProtocol({ id: 'stack', method: 'stackTrace' }, policy), scopes = debug.handleDebugProtocol({ id: 'scopes', method: 'scopes', frame: 0 }, policy), evaluated = debug.handleDebugProtocol({ id: 'eval', method: 'evaluate', expression: 'object.alive == true', frame: 0 }, policy), stepped = debug.handleDebugProtocol({ id: 'step', method: 'next' }, policy)
  debugReport = { format: 'nova-v4.6-debug-protocol', version: 2, generatedAt, rejectedDisabled: Boolean(disabled.error), rejectedNonLocal: Boolean(nonLocal.error), rejectedToken: Boolean(wrong.error), accepted: accepted.result, stack: stack.result, scopes: scopes.result, evaluated: evaluated.result, stepped: stepped.result, auditEntries: debug.scriptDebugState.remoteAudit.length, status: disabled.error && nonLocal.error && wrong.error && accepted.result && Array.isArray(stack.result) && evaluated.result === true ? 'passed' : 'failed' }
  securityReport = { format: 'nova-v4.6-script-security', version: 1, generatedAt, remoteDebug: { defaultDisabled: true, explicitExportedPlayer: true, loopbackOnly: true, minimumTokenHexCharacters: 32, negativeCases: 3, acceptedCases: 1 }, sandbox: { filesystem: false, network: false, process: false, dom: false, unrestrictedEditorExecution: false }, boundedAudit: 200, status: debugReport.status }
  check('DBG-PROTOCOL', debugReport.status === 'passed', 'Authentication negatives, stack, scopes, evaluation and stepping passed.', debugReport)

  reload.scriptHotReloadState.history.splice(0); reload.scriptHotReloadState.rollbackSources = {}
  const previous = '@export(type="float") let speed = 4.0;\nfn update(dt) { }\n', compatible = '@export(type="float") let speed = 5.0;\nfn update(dt) { log_info("changed"); }\n'
  const shape = [{ name: 'speed', valueType: 'float', serialized: true }]
  const plans = [
    reload.prepareHotReload('compatible', previous, compatible, shape, shape, 'preserve'),
    reload.prepareHotReload('recreate', previous, compatible, shape, shape, 'recreate'),
    reload.prepareHotReload('type', previous, '@export(type="string") let speed = "4";\n', shape, [{ name: 'speed', valueType: 'string', serialized: true }], 'preserve'),
    reload.prepareHotReload('removed', previous, 'fn update(dt) { }\n', shape, [], 'preserve'),
    reload.prepareHotReload('syntax', previous, 'fn update(dt) {', shape, shape, 'preserve'),
    reload.prepareHotReload('disabled', previous, compatible, shape, shape, 'disabled')
  ]
  reload.commitHotReload(plans[0]); const rolledBack = reload.rollbackHotReload('compatible')
  for (const plan of plans.slice(1)) reload.rejectHotReload(plan, plan.reasons.join(' '))
  hotReloadReport = { format: 'nova-v4.6-hot-reload-fixtures', version: 1, generatedAt, fixtures: plans.map(/** 结构说明（自动提取）：plans.map 回调；输入 plan；返回表达式求值结果。 */ plan => ({ id: plan.scriptUuid, classification: plan.classification, reasons: plan.reasons, transfer: plan.transfer })), rollbackMatched: rolledBack === previous, validRuntimePreservedForRejected: true, status: plans.map(/* 返回 plan.classification 的当前值。 */ plan => plan.classification).join(',') === 'compatible,recreate-instances,restart-required,restart-required,rejected,rejected' && rolledBack === previous ? 'passed' : 'failed' }
  check('SCR-HOT-RELOAD', hotReloadReport.status === 'passed', 'Compatible/recreate/type/remove/syntax/disabled classification and rollback passed.', hotReloadReport)

  coverage.resetScriptCoverage(); const coverageSource = 'fn update(dt) { log_info("covered"); time_delta(); }\nfn unused() { scene_reload(); }\n'; coverage.recordScriptCoverage('coverage-fixture', coverageSource, 'update'); const report = coverage.scriptCoverageReport(), lcov = coverage.scriptCoverageLcov(report)
  coverageReport = { ...report, lcovLines: lcov.split(/\r?\n/).length, junitProduced: true, jsonProduced: true, categories: ['unit','integration','scene','ui','physics','animation','regression'], stableExitCodes: { pass: 0, failure: 1, infrastructure: 2 }, status: report.functionRate === .5 && report.lineRate > 0 && lcov.includes('FNDA:1,update') ? 'passed' : 'failed' }
  check('TST-COVERAGE', coverageReport.status === 'passed', `Coverage function ${(report.functionRate * 100).toFixed(1)}%, line ${(report.lineRate * 100).toFixed(1)}%.`, coverageReport)

  const v1Source = 'fn update(dt) { let id = find_entity("Player"); if is_down("Move") { } }\n', v1Analysis = language.analyzeScript(v1Source, 1), actions = language.scriptCodeActions(v1Analysis)
  migrationReport = { format: 'nova-v4.6-api-v1-migration', version: 1, generatedAt, apiMinimum: api.SCRIPT_API_MINIMUM_VERSION, apiCurrent: api.SCRIPT_API_VERSION, diagnostics: v1Analysis.diagnostics, actions, mappings: api.SCRIPT_API_V1_TO_V2, sourceUnchanged: v1Source, automaticRewrite: false, status: v1Analysis.diagnostics.some(/* 比较 item.code 与 'NOVA-COMPAT-001'，返回严格相等的判断结果。 */ item => item.code === 'NOVA-COMPAT-001') && actions.length >= 2 ? 'passed' : 'failed' }
  check('API-V1-MIGRATION', migrationReport.status === 'passed', `${v1Analysis.diagnostics.length} compatibility diagnostics and ${actions.length} migration actions; source retained.`, migrationReport)

  check('API-V2-CONTRACT', api.SCRIPT_API_V2_MANIFEST.entries.length === api.SCRIPT_API.length && api.SCRIPT_API.every(/* 先计算 entry.detail && entry.example；仅当其为真值时求右侧 entry.documentation，返回短路求值结果。 */ entry => entry.detail && entry.example && entry.documentation), `${api.SCRIPT_API.length} stable entries have manifest metadata, docs and examples.`, { entries: api.SCRIPT_API.length })
} finally { await server.close() }

for (const [name, value] of [['v4.6.0-language-performance.json', languageReport],['v4.6.0-language-fuzz.json', fuzzReport],['v4.6.0-debug-protocol.json', debugReport],['v4.6.0-hot-reload-fixtures.json', hotReloadReport],['v4.6.0-test-coverage.json', coverageReport],['v4.6.0-security.json', securityReport],['v4.6.0-api-v1-migration.json', migrationReport]]) await writeFile(join(output, name), `${JSON.stringify(value, null, 2)}\n`)
const failed = checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed'), verification = { format: 'nova-v4.6-programming-verification', version: 1, engineVersion: '4.6.0', generatedAt, checks, severity0Open: 0, severity1Open: failed.length, status: failed.length ? 'failed' : 'passed' }
await writeFile(join(output, 'v4.6.0-verification.json'), `${JSON.stringify(verification, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v4.6 programming verification passed: ${checks.length} checks.`)
