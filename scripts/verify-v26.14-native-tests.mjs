/** 功能回归脚本：执行 verify-v26.14-native-tests.mjs 对应场景，保留断言和证据输出。 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {runtimeAudit14Paths,buildRuntimeAudit14Example} from './lib/runtimeAudit14.mjs'
const paths=runtimeAudit14Paths(import.meta.url),{integrated,reportDir}=paths
const fixtures = join(reportDir,integrated?'v26.14-native-test-fixtures':'native-test-fixtures')
await mkdir(fixtures, { recursive: true })
const executable = await buildRuntimeAudit14Example(paths,'nova_script_test')
const checks = []
/** 结构说明（自动提取）：run；输入 name、source、options；直接调用 join、writeFile、spawnSync、assert.equal、assert.ok 等；等待异步结果。 */ async function run(name, source, options = []) {
  const path = join(fixtures, `${name}.rhai`), output = join(fixtures, `${name}.json`), coverage = join(fixtures, `${name}-coverage.json`)
  await writeFile(path, source)
  const result = spawnSync(executable, [path, '--output', output, '--coverage-output', coverage, ...options], { encoding: 'utf8', timeout: 15_000, windowsHide: true })
  assert.equal(result.error, undefined, result.error?.message)
  assert.ok([0, 1].includes(result.status), `${name}: ${result.stderr || result.stdout}`)
  return { exit: result.status, report: JSON.parse(await readFile(output, 'utf8')), coverage: JSON.parse(await readFile(coverage, 'utf8')) }
}
/** 结构说明（自动提取）：check；输入 name、test；直接调用 test、checks.push；等待异步结果。 */ async function check(name, test) { await test(); checks.push({ name, status: 'passed' }) }
await check('suite hooks execute once; each case receives isolated initialized export state', /** 结构说明（自动提取）：check 回调；无显式参数；直接调用 run、assert.equal、assert.deepEqual、assert.ok、report.results.every；等待异步结果。 */ async () => {
  const { exit, report, coverage } = await run('suite', '@export let count = 0;\nfn before_all() { count = 37; }\nfn before_each() { count += 1; }\nfn after_each() { if count != 99 { throw "case state"; } }\nfn after_all() { if count != 37 { throw "suite state"; } }\n// @test fixture=seeded cases=one|two seed=42\nfn test_case() { if count != 38 { throw "isolated state"; } count = 99; }')
  assert.equal(exit, 0); assert.equal(report.passed, 2); assert.deepEqual(report.suites[0].callbackCounts, { after_all: 1, after_each: 2, before_all: 1, before_each: 2, test_case: 2 })
  assert.ok(report.results.every(/* 先计算 test.fixture === 'seeded'；仅当其为真值时求右侧 test.seed === 42，返回短路求值结果。 */ test => test.fixture === 'seeded' && test.seed === 42)); assert.equal(coverage.functionRate, 1)
})
await check('test failures preserve after_each and after_all; cleanup failures remain visible', /** 结构说明（自动提取）：check 回调；无显式参数；直接调用 run、assert.equal、assert.match、assert.deepEqual；等待异步结果。 */ async () => {
  const { exit, report } = await run('cleanup', 'fn before_all() {}\nfn before_each() {}\nfn test_failure() { throw "body failed"; }\nfn after_each() { throw "case cleanup failed"; }\nfn after_all() { throw "suite cleanup failed"; }')
  assert.equal(exit, 1); assert.equal(report.failed, 2); assert.match(report.results[0].message, /body failed.*after_each:.*case cleanup failed/); assert.match(report.results[1].message, /after_all:.*suite cleanup failed/)
  assert.deepEqual(report.suites[0].callbackCounts, { after_all: 1, after_each: 1, before_all: 1, before_each: 1, test_failure: 1 })
})
await check('failed before_each skips body but always attempts case and suite teardown', /** 结构说明（自动提取）：check 回调；无显式参数；直接调用 run、assert.equal、assert.deepEqual、assert.match；等待异步结果。 */ async () => {
  const { report } = await run('setup-failure', 'fn before_each() { throw "setup"; }\nfn test_never() { throw "body must not run"; }\nfn after_each() {}\nfn after_all() {}')
  assert.equal(report.failed, 1); assert.deepEqual(report.suites[0].callbackCounts, { after_all: 1, after_each: 1, before_each: 1 }); assert.match(report.results[0].message, /setup/)
})
await check('failed before_all runs suite teardown and never begins case fixtures', /** 结构说明（自动提取）：check 回调；无显式参数；直接调用 run、assert.equal、assert.deepEqual；等待异步结果。 */ async () => {
  const { report } = await run('suite-setup-failure', 'fn before_all() { throw "suite setup"; }\nfn test_never() {}\nfn after_each() {}\nfn after_all() {}')
  assert.equal(report.failed, 1); assert.deepEqual(report.suites[0].callbackCounts, { after_all: 1, before_all: 1 })
})
await check('skip-only suite never initializes or runs hooks and has no claimed coverage', /** 结构说明（自动提取）：check 回调；无显式参数；直接调用 run、assert.equal、assert.deepEqual；等待异步结果。 */ async () => {
  const { report, coverage } = await run('skip', 'fn before_all() { throw "must not run"; }\n// @test skip\nfn test_skip() {}\nfn after_all() { throw "must not run"; }')
  assert.equal(report.skipped, 1); assert.equal(report.failed, 0); assert.equal(report.suites[0].initialized, false); assert.deepEqual(report.suites[0].callbackCounts, {}); assert.equal(coverage.functionRate, 0)
})
await check('actual compiler discovery finds compact/multiline functions and ignores comment/string lookalikes', /** 结构说明（自动提取）：check 回调；无显式参数；直接调用 run、assert.equal、assert.deepEqual、report.results.map；等待异步结果。 */ async () => {
  const { report, coverage } = await run('discovery', '/* fn test_phantom() {}\n// @test skip\nfn test_second() {} */\nlet text = `fn test_fake() {}`;\nfn test_first() {} fn test_second() {}\nfn\ntest_third\n() {}')
  assert.equal(report.passed, 3); assert.equal(report.skipped, 0); assert.deepEqual(report.results.map(/* 返回 test.name 的当前值。 */ test => test.name), ['test_first', 'test_second', 'test_third']); assert.deepEqual(coverage.files[0].executableFunctions, ['test_first', 'test_second', 'test_third'])
})
await check('compile failure is a failed report entry with no fabricated execution', /** 结构说明（自动提取）：check 回调；无显式参数；直接调用 run、assert.equal、assert.deepEqual；等待异步结果。 */ async () => {
  const { exit, report } = await run('compile', 'fn test_broken() { let = ; }')
  assert.equal(exit, 1); assert.equal(report.failed, 1); assert.equal(report.results[0].name, 'compile'); assert.equal(report.suites[0].initialized, false); assert.deepEqual(report.suites[0].callbackCounts, {})
})
await check('retries require explicit infrastructure flag and retain cleanup for every attempt', /** 结构说明（自动提取）：check 回调；无显式参数；直接调用 run、source.replace、assert.equal、assert.deepEqual；等待异步结果。 */ async () => {
  const source = 'fn before_all() {}\nfn after_each() {}\nfn after_all() {}\n// @test retries=2\nfn test_failure() { throw "failure"; }'
  const normal = await run('no-retry', source), retry = await run('retry', source.replace('retries=2', 'retries=2 flaky=infrastructure'))
  assert.equal(normal.report.results[0].attempt, 1); assert.equal(retry.report.results[0].attempt, 3)
  assert.deepEqual(retry.report.suites[0].callbackCounts, { after_all: 1, after_each: 3, before_all: 1, test_failure: 3 })
})
const report = { format: 'nova-v26.14-native-test-runner', version: 1, ...paths.metadata, fixtures, executable, status: 'passed', generatedAt: new Date().toISOString(), context: 'Freshly built actual native executable; fixture metadata remains a report label, while setup/teardown functions supply isolated test state. Source fixtures and raw results/coverage are retained at the reported fixture directory. No global release-readiness claim.', checks }
await writeFile(join(reportDir,integrated?'v26.14-native-tests.json':'native-test-runner-verification.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
