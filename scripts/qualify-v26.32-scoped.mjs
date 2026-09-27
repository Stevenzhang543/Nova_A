/** Execute selected checks and preserve their fresh reports and screenshots. */
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { runAudit, writeAuditBundle } from './lib/milestoneAuditBundle.mjs'
const gate = process.argv.find(arg => arg.startsWith('--gate='))?.slice(7)
const root = process.cwd(), release = '26.32', engineVersion = JSON.parse(await readFile('package.json', 'utf8')).version
assert.equal(engineVersion, '26.32.0')
const selections = {
  focus: [['scripts/verify-ci-environment.mjs', [], 'v26.32-ci-environment'], ['scripts/verify-v26.13-workspaces.mjs', ['--report=release-audits/v26.32-workspaces.json'], 'v26.32-workspaces'], ['scripts/generate-panel-inventory-26.32.mjs', ['--check'], 'v26.32-panel-inventory'], ['scripts/verify-v26.32-native-headless.mjs', [], 'v26.32-native-headless']],
  'browser-layout': [['scripts/verify-v26.32-layout-user.mjs', [], 'v26.32-layout-user']],
  'user-interactions': [['scripts/verify-v26.32-static-host-user.mjs', [], 'v26.32-static-host-user']],
}
if (selections[gate]) {
  const executions = []
  for (const [script, args, report] of selections[gate]) {
    const execution = await runAudit(root, script, args)
    execution.reports = [`release-audits/${report}.json`]
    executions.push(execution)
  }
  await writeAuditBundle(root, release, gate, executions)
} else if (gate === 'product') {
  const reports = []
  for (const name of ['focus-bundle', 'browser-layout-bundle', 'user-interactions-bundle', 'verification', 'native-build', 'rust', 'wasm', 'web', 'windows-smoke', 'headless-smoke', 'manual-audit']) {
    const path = `release-audits/v${release}-${name}.json`, report = JSON.parse(await readFile(path, 'utf8'))
    assert.equal(report.status, 'passed', path)
    assert.equal(report.engineVersion, engineVersion, path)
    reports.push({ path, status: report.status, generatedAt: report.generatedAt })
  }
  await writeFile(`release-audits/v${release}-product-audit.json`, JSON.stringify({ format: 'nova-release-product-audit', version: 1, release, engineVersion, generatedAt: new Date().toISOString(), status: 'passed', reports, globalDefectCount: null, externalCertificationComplete: false, scope: 'Only the explicitly executed 26.32 checks. No claim of all-source semantic review, zero bugs, or every conditional UI state.' }) + '\n')
} else throw Error(`Unknown gate: ${gate}`)
