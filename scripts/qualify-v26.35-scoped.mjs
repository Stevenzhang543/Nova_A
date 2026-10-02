/** Qualify only the V3 presentation, input, gesture and delivery risks; keep raw evidence. */
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { runAudit, writeAuditBundle } from './lib/milestoneAuditBundle.mjs'

const gate = process.argv.find(arg => arg.startsWith('--gate='))?.slice(7)
const root = process.cwd(), release = '26.35'
const engineVersion = JSON.parse(await readFile('package.json', 'utf8')).version
assert.equal(engineVersion, release + '.0')
process.env.NOVA_FOUNDATIONS_REPORT = 'release-audits/v26.35-foundations.json'
const target = ['--qualification-release=26.35']
const selections = {
  focus: [
    ['scripts/verify-ci-environment.mjs', [], 'v26.35-ci-environment'],
    ['scripts/verify-v26.35-motion.mjs', [], 'v26.35-motion-unit'],
    ['scripts/verify-engine-foundations.mjs', [], 'v26.35-foundations'],
    ['scripts/verify-v26.34-native-headless.mjs', target, 'v26.35-native-headless'],
  ],
  'browser-layout': [
    ['scripts/verify-ui-rebuild-layout-user.mjs', [...target, '--final'], 'v26.35-ui-rebuild-layout-final'],
    ['scripts/verify-ui-rebuild-navigation-user.mjs', target, 'v26.35-ui-rebuild-navigation'],
  ],
  'user-interactions': [
    ['scripts/verify-v26.34-authoring-user.mjs', target, 'v26.35-authoring-user'],
    ['scripts/verify-v26.34-input-user.mjs', target, 'v26.35-input-user'],
    ['scripts/verify-v26.34-reference-game.mjs', target, 'v26.35-reference-game'],
    ['scripts/verify-v26.34-static-host-user.mjs', target, 'v26.35-static-host-user'],
  ],
  performance: [
    ['scripts/verify-v26.35-motion-user.mjs', target, 'v26.35-motion-user'],
  ],
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
  for (const name of ['focus-bundle', 'browser-layout-bundle', 'user-interactions-bundle', 'performance-bundle', 'verification', 'native-build', 'rust', 'wasm', 'web', 'windows-smoke', 'headless-smoke', 'manual-audit']) {
    const path = `release-audits/v${release}-${name}.json`, report = JSON.parse(await readFile(path, 'utf8'))
    assert.equal(report.status, 'passed', path)
    assert.equal(report.engineVersion, engineVersion, path)
    reports.push({ path, status: report.status, generatedAt: report.generatedAt })
  }
  await writeFile(`release-audits/v${release}-product-audit.json`, JSON.stringify({ format: 'nova-release-product-audit', version: 1, release, engineVersion, generatedAt: new Date().toISOString(), status: 'passed', reports, globalDefectCount: null, externalCertificationComplete: false, scope: 'Source-bound V3 checks and retained practical authoring/export/input/navigation contracts. Browser timings use software rendering; no physical input-to-display, device CPU/GPU or clean-install certification.' }) + '\n')
} else throw Error(`Unknown gate: ${gate}`)
