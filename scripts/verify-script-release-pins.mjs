/** 守卫：withBrowserAudit 调用不得同时使用"字面量 release"与"派生 expectedRelease"。
 * 背景：同类缺陷已出现两次（authoring 与 input）。两者同时出现时 harness 会断言它们相等
 * （browserUserAudit.mjs:51），于是脚本静默失去可运行性，而没有任何东西报警。
 * 逐版本脚本固定自己的 release 是合法的，因此这里只针对该组合，不做全库版本号扫描。 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const checks = []
async function test(name, run) {
  try { await run(); checks.push({ name, status: 'passed' }); console.log('PASS ' + name) }
  catch (error) { checks.push({ name, status: 'failed', error: String(error && error.message || error) }); console.error('FAIL ' + name + ' :: ' + (error && error.message || error)) }
}

const packageVersion = JSON.parse(fs.readFileSync('package.json', 'utf8')).version
const currentMinor = packageVersion.split('.')[1]
const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.mjs')) out.push(full)
  }
  return out
}

/** 提取每个 withBrowserAudit 调用的参数片段（截取到下一个右括号后即可，粗粒度但足够判定）。 */
function auditCalls(source) {
  const calls = []
  const marker = 'withBrowserAudit('
  let index = source.indexOf(marker)
  while (index >= 0) {
    calls.push(source.slice(index, index + 600))
    index = source.indexOf(marker, index + marker.length)
  }
  return calls
}

const scripts = walk('scripts')
const offenders = []
let auditedScripts = 0
for (const file of scripts) {
  const source = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n')
  if (!source.includes('withBrowserAudit(')) continue
  auditedScripts += 1
  for (const call of auditCalls(source)) {
    const literalRelease = /release:\s*'26\.(\d{2})'/.exec(call)
    // Only the concrete defect pattern: expectedRelease derived from the package while release is
    // a literal. A literal that falls back to the same value, as in the template-library script, is fine.
    const hasDerivedExpected = /expectedRelease:\s*[^'"\s]/.test(call) && call.includes('package.json')
    if (literalRelease && hasDerivedExpected && literalRelease[1] !== currentMinor) {
      offenders.push({ file: path.basename(file), pinned: literalRelease[1], current: currentMinor })
    }
  }
}

await test('No audit call mixes a stale pinned release with a derived expectedRelease', () => {
  assert.deepEqual(offenders, [], 'these scripts cannot run because the harness asserts release equals expectedRelease: ' + JSON.stringify(offenders))
})

await test('The guard actually inspects audit scripts', () => {
  assert.ok(auditedScripts > 50, 'expected many browser audit scripts, saw ' + auditedScripts)
  globalThis.__audited = auditedScripts
})

const out = 'reports/phase2/script-release-pins.json'
fs.mkdirSync('reports/phase2', { recursive: true })
fs.writeFileSync(out, JSON.stringify({
  generatedAt: new Date().toISOString(),
  packageVersion,
  currentMinor,
  scannedScripts: scripts.length,
  browserAuditScripts: auditedScripts,
  offenders,
  checks,
  status: checks.some(/** 任一失败即整体失败。 */ c => c.status === 'failed') ? 'failed' : 'passed',
}, null, 2) + '\n')
console.log('scanned ' + scripts.length + ' scripts, ' + auditedScripts + ' browser audits -> ' + out)
if (checks.some(/** 任一失败即非零退出。 */ c => c.status === 'failed')) process.exitCode = 1
