/** Execute focused branding, browser delivery and native identity checks; preserve fresh raw evidence. */
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { runAudit, writeAuditBundle } from './lib/milestoneAuditBundle.mjs'

const gate = process.argv.find(arg => arg.startsWith('--gate='))?.slice(7)
const root = process.cwd(), release = '26.36'
const engineVersion = JSON.parse(await readFile('package.json', 'utf8')).version
assert.equal(engineVersion, release + '.0')
const target = ['--qualification-release=26.36']
const selections = {
  focus: [
    ['scripts/verify-ci-environment.mjs', [], 'v26.36-ci-environment'],
    ['scripts/verify-v26.36-branding-assets.mjs', target, 'v26.36-branding-assets'],
    ['scripts/verify-v26.34-native-headless.mjs', target, 'v26.36-native-headless'],
  ],
  'browser-layout': [
    ['scripts/verify-v26.36-branding-user.mjs', target, 'v26.36-branding-user'],
  ],
  'user-interactions': [
    ['scripts/verify-v26.34-static-host-user.mjs', target, 'v26.36-static-host-user'],
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
  for (const name of ['focus-bundle', 'browser-layout-bundle', 'user-interactions-bundle', 'verification', 'native-build', 'wasm', 'web', 'windows-smoke', 'headless-smoke', 'manual-audit']) {
    const path = `release-audits/v${release}-${name}.json`, report = JSON.parse(await readFile(path, 'utf8'))
    assert.equal(report.status, 'passed', path)
    assert.equal(report.engineVersion, engineVersion, path)
    reports.push({ path, status: report.status, generatedAt: report.generatedAt })
  }
  await writeFile(`release-audits/v${release}-product-audit.json`, JSON.stringify({ format: 'nova-release-product-audit', version: 1, release, engineVersion, generatedAt: new Date().toISOString(), status: 'passed', reports, globalDefectCount: null, externalCertificationComplete: false, scope: 'Source-bound supplied branding/theme/manual checks and fresh practical Windows/Web/WASM/physics-stdio/export delivery. No unrelated all-engine, all-panel, physical-device performance, signing or clean-install certification.' }) + '\n')
} else throw Error(`Unknown gate: ${gate}`)
