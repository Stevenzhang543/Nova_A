/** Execute selected checks and preserve their fresh reports and screenshots. */
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { runAudit, writeAuditBundle } from './lib/milestoneAuditBundle.mjs'
const gate = process.argv.find(arg => arg.startsWith('--gate='))?.slice(7)
const root = process.cwd(), release = '26.33', engineVersion = JSON.parse(await readFile('package.json', 'utf8')).version
assert.equal(engineVersion, '26.33.0')
process.env.NOVA_FOUNDATIONS_REPORT = 'release-audits/v26.33-foundations.json'
process.env.NOVA_SAVE_REPORT = 'release-audits/v26.33-runtime-save.json'
process.env.NOVA_REGISTRY_REPORT = 'release-audits/v26.33-component-registry.json'
const selections = {
  focus: [['scripts/verify-ci-environment.mjs', [], 'v26.33-ci-environment'], ['scripts/verify-engine-foundations.mjs', [], 'v26.33-foundations'], ['scripts/verify-engine-save.mjs', [], 'v26.33-runtime-save'], ['scripts/verify-engine-component-registry.mjs', [], 'v26.33-component-registry'], ['scripts/verify-v26.33-native-headless.mjs', [], 'v26.33-native-headless']],
  'browser-layout': [['scripts/verify-ui-rebuild-layout-user.mjs', ['--qualification-release=26.33','--final'], 'v26.33-ui-rebuild-layout-final']],
  'user-interactions': [['scripts/verify-engine-workflows.mjs', ['--qualification-release=26.33'], 'v26.33-phase2-workflows'], ['scripts/verify-v26.33-static-host-user.mjs', ['--qualification-release=26.33'], 'v26.33-static-host-user'], ['scripts/verify-v26.33-reference-game.mjs', [], 'v26.33-reference-game']],
}
if (selections[gate]) {
  const executions = []
  for (const [script, args, report] of selections[gate]) {
    const execution = await runAudit(root, script, args)
    execution.reports = report ? [`release-audits/${report}.json`] : []
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
  await writeFile(`release-audits/v${release}-product-audit.json`, JSON.stringify({ format: 'nova-release-product-audit', version: 1, release, engineVersion, generatedAt: new Date().toISOString(), status: 'passed', reports, globalDefectCount: null, externalCertificationComplete: false, scope: 'Only the explicitly executed 26.33 checks. No claim of all-source semantic review, zero bugs, or every conditional UI state.' }) + '\n')
} else throw Error(`Unknown gate: ${gate}`)
