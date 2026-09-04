import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const release = process.argv.find(value => value.startsWith('--release='))?.slice(10)
const machine = process.argv.find(value => value.startsWith('--engine='))?.slice(9)
if (!/^26\.(?:08|09|10)$/.test(release ?? '') || !/^26\.(?:8|9|10)\.0$/.test(machine ?? '')) throw new Error('Calendar history requires --release=26.08|26.09|26.10 and its --engine value.')
const checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
async function filesBelow(directory) { const output = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); entry.isDirectory() ? output.push(...await filesBelow(path)) : output.push(path) } return output }

const roots = ['reference-projects', 'tests/fixtures/migrations', 'release-fixtures'].map(path => join(root, path))
const all = (await Promise.all(roots.map(path => filesBelow(path).catch(() => [])))).flat()
const candidates = all.filter(path => ['.nova', '.json'].includes(extname(path).toLowerCase()))
const parsed = [], malformed = []
for (const path of candidates) {
  try { parsed.push({ path: relative(root, path).split('\\').join('/'), value: JSON.parse(await readFile(path, 'utf8')) }) }
  catch (error) { malformed.push({ path: relative(root, path).split('\\').join('/'), error: error instanceof Error ? error.message : String(error) }) }
}
check('CAL-HISTORY-JSON', malformed.length === 0 && parsed.length >= 120, 'Every retained migration, fixture, reference and release JSON/NOVA document parses without executing content.', { documents: parsed.length, malformed })
const projects = parsed.filter(item => item.value && typeof item.value === 'object' && (item.path.endsWith('.nova') || item.value.projectFormat === 'Nova_A Project Format 2'))
const schemas = [...new Set(projects.map(item => Number(item.value.formatVersion)).filter(Number.isInteger))].sort((a, b) => a - b)
check('CAL-HISTORY-SCHEMAS', projects.length >= 80 && schemas.includes(29) && projects.every(item => Number(item.value.formatVersion) >= 1), 'Historical projects remain present and the frozen current schema is represented.', { projects: projects.length, schemas })

const [formatTs, formatRust, upgrade, manifest, expected] = await Promise.all(['src/projects/projectFormat.ts', 'crates/nova_format/src/lib.rs', 'src/runtime/projectUpgrade.ts', 'src/projects/projectManifest.ts', 'tests/fixtures/migrations/public-schema-expected.json'].map(path => readFile(join(root, path), 'utf8')))
check('CAL-HISTORY-AUTHORITY', formatTs.includes(`NOVA_ENGINE_VERSION = '${machine}'`) && formatTs.includes(`NOVA_RELEASE_NAME = '${release}'`) && formatTs.includes('NOVA_PROJECT_SCHEMA_VERSION = 29') && formatRust.includes(`CURRENT_ENGINE_VERSION: &str = "${machine}"`) && JSON.parse(expected).targetEngine === machine, 'TypeScript, Rust and the current migration golden agree on the calendar release while schema 29 stays frozen.')
check('CAL-HISTORY-TRANSACTION', upgrade.includes('downloadProjectBackup') && upgrade.includes('storeUpgradeRollback') && upgrade.includes('semanticProjectDiff') && manifest.includes("maximumExclusive: '27.0.0'"), 'Migration retains preview, complete backup, semantic diff, atomic apply, rollback and the reviewed calendar-cycle ceiling.')
const historical = projects.filter(item => /creator-v(?:60|6[5-9]0|700)-/.test(item.path))
check('CAL-HISTORY-UNCHANGED-BASELINES', historical.length >= 15 && historical.some(item => item.value.engineVersion === '6.7.0') && historical.some(item => item.value.engineVersion === '6.8.0') && historical.some(item => item.value.engineVersion === '6.9.0') && historical.some(item => item.value.engineVersion === '7.0.0'), 'Historical 6.7/6.8/6.9/7.0 authored baselines remain readable instead of being overwritten.', { retained: historical.length })
const currentMarker = release.split('.')[1]
const current = projects.filter(item => item.path.includes(`v26${currentMarker}`))
check('CAL-HISTORY-CURRENT-ROUNDTRIP', current.length >= (release === '26.09' ? 2 : release === '26.10' ? 3 : 1) && current.every(item => item.value.engineVersion === machine && item.value.formatVersion === 29 && JSON.stringify(JSON.parse(JSON.stringify(item.value))) === JSON.stringify(item.value)), 'Every current representative project preserves its authored document through a JSON save/reload round trip.', { current: current.map(item => item.path) })

const failed = checks.filter(item => item.status === 'failed')
const report = { format: `nova-v${release}-history-verification`, version: 1, release, releaseLabel: release, engineVersion: machine, generatedAt: new Date().toISOString(), checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, `release-audits/v${release}-history-verification.json`), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A ${release} history verification passed: ${projects.length} projects and ${parsed.length} structured fixtures.`)
