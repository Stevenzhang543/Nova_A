/** Preserve reproduced historical failures as evidence, separate from passing current checks. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'

const names = ['save-transactions-before', 'save-project-race-before', 'render-media-before', 'input-ownership-before', 'input-svg-before', 'performance-evidence-before', 'native-interpolation-before', 'native-axis-before', 'native-character-before']
const records = []
for (const name of names) {
  const path = `reports/phase2/26.34/${name}.json`, bytes = await readFile(path), report = JSON.parse(bytes)
  assert.equal(report.status, 'failed', `${path} records an actual pre-repair failure`)
  assert.ok(report.checks.some(check => check.status === 'failed'), `${path} has a failed assertion`)
  records.push({ path, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, report })
}
const engineVersion = JSON.parse(await readFile('package.json', 'utf8')).version
assert.equal(engineVersion, '26.34.0')
await mkdir('release-audits', { recursive: true })
await writeFile('release-audits/v26.34-reproduced-failures.json', JSON.stringify({
  format: 'nova-reproduced-failure-preservation', version: 1, release: '26.34', engineVersion,
  generatedAt: new Date().toISOString(), status: 'passed', records,
  scope: 'Passing preservation/integrity checks of raw earlier failed assertions. The nested reports intentionally remain failed and retain their actual engine/source/time identity. Current repairs are qualified by separate executed suites.'
}, null, 2) + '\n')
console.log(JSON.stringify({ status: 'passed', preservedReports: records.length }))
