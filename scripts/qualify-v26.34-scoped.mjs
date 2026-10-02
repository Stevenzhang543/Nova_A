/** Execute selected checks and preserve their fresh reports and screenshots. */
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { runAudit, writeAuditBundle } from './lib/milestoneAuditBundle.mjs'
const gate = process.argv.find(arg => arg.startsWith('--gate='))?.slice(7)
const root = process.cwd(), release = '26.34', engineVersion = JSON.parse(await readFile('package.json', 'utf8')).version
assert.equal(engineVersion, '26.34.0')
process.env.NOVA_FOUNDATIONS_REPORT = 'release-audits/v26.34-foundations.json'
process.env.NOVA_SAVE_REPORT = 'release-audits/v26.34-runtime-save.json'
process.env.NOVA_REGISTRY_REPORT = 'release-audits/v26.34-component-registry.json'
process.env.NOVA_INPUT_OWNERSHIP_REPORT = 'release-audits/v26.34-input-ownership.json'
process.env.NOVA_PERFORMANCE_EVIDENCE_REPORT = 'release-audits/v26.34-performance-evidence.json'
const selections = {
  focus: [['scripts/verify-ci-environment.mjs', [], 'v26.34-ci-environment'], ['scripts/verify-engine-foundations.mjs', [], 'v26.34-foundations'], ['scripts/verify-engine-save.mjs', [], 'v26.34-runtime-save'], ['scripts/verify-engine-component-registry.mjs', [], 'v26.34-component-registry'], ["scripts/verify-v26.34-save-transactions.mjs", ["--report=release-audits/v26.34-save-transactions.json"], "v26.34-save-transactions"], ["scripts/verify-v26.34-render-media.mjs", ["--report=release-audits/v26.34-render-media.json"], "v26.34-render-media"], ["scripts/verify-v26.34-input-ownership.mjs", ["--report=release-audits/v26.34-input-ownership.json"], "v26.34-input-ownership"], ["scripts/verify-v26.34-performance-evidence.mjs", ["--report=release-audits/v26.34-performance-evidence.json"], "v26.34-performance-evidence"], ["scripts/verify-v26.34-game-scenarios.mjs", ["--report=release-audits/v26.34-game-scenarios.json"], "v26.34-game-scenarios"], ["scripts/verify-v26.28-media.mjs", ["--qualification-release=26.34", "--report=release-audits/v26.34-media.json"], "v26.34-media"], ["scripts/verify-v26.29-world.mjs", ["--qualification-release=26.34", "--report=release-audits/v26.34-world.json"], "v26.34-world"], ["scripts/verify-v26.17-world-streaming.mjs", ["--qualification-release=26.34", "--report=release-audits/v26.34-world-streaming.json"], "v26.34-world-streaming"], ["scripts/verify-v26.28-game-ui.mjs", [], "v26.28-game-ui"], ["scripts/verify-v26.28-media-bindings.mjs", [], "v26.28-media-bindings"], ["scripts/verify-v26.34-native-headless.mjs", [], "v26.34-native-headless"]],
  'browser-layout': [['scripts/verify-ui-rebuild-layout-user.mjs', ['--qualification-release=26.34','--final'], 'v26.34-ui-rebuild-layout-final'], ['scripts/verify-ui-rebuild-navigation-user.mjs', ['--qualification-release=26.34'], 'v26.34-ui-rebuild-navigation']],
  'user-interactions': [['scripts/verify-engine-workflows.mjs', ['--qualification-release=26.34'], 'v26.34-phase2-workflows'], ['scripts/verify-v26.34-static-host-user.mjs', ['--qualification-release=26.34'], 'v26.34-static-host-user'], ['scripts/verify-v26.34-reference-game.mjs', ['--qualification-release=26.34'], 'v26.34-reference-game'], ['scripts/verify-v26.34-input-user.mjs', ['--qualification-release=26.34'], 'v26.34-input-user'], ['scripts/verify-v26.34-authoring-user.mjs', ['--qualification-release=26.34'], 'v26.34-authoring-user']],
}
selections.focus.push(['scripts/preserve-v26.34-regression-evidence.mjs', [], 'v26.34-reproduced-failures'])
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
  await writeFile(`release-audits/v${release}-product-audit.json`, JSON.stringify({ format: 'nova-release-product-audit', version: 1, release, engineVersion, generatedAt: new Date().toISOString(), status: 'passed', reports, globalDefectCount: null, externalCertificationComplete: false, scope: 'Only the explicitly executed 26.34 checks. No claim of all-source semantic review, zero bugs, or every conditional UI state.' }) + '\n')
} else throw Error(`Unknown gate: ${gate}`)
