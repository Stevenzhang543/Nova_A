import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })

async function filesBelow(directory) {
  const output = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) output.push(...await filesBelow(path))
    else output.push(path)
  }
  return output
}

const roots = ['reference-projects', 'tests/fixtures/migrations', 'release-fixtures'].map(path => join(root, path))
const all = (await Promise.all(roots.map(path => filesBelow(path).catch(() => [])))).flat()
const candidates = all.filter(path => ['.nova', '.json'].includes(extname(path).toLowerCase()))
const parsed = [], malformed = []
for (const path of candidates) {
  try { parsed.push({ path: relative(root, path).replaceAll('\\', '/'), value: JSON.parse(await readFile(path, 'utf8')) }) }
  catch (error) { malformed.push({ path: relative(root, path).replaceAll('\\', '/'), error: error instanceof Error ? error.message : String(error) }) }
}
check('V2603-HISTORY-JSON', malformed.length === 0 && parsed.length >= 120, 'Every JSON/NOVA history, template, migration and reference fixture parses without executing content.', { documents: parsed.length, malformed })

const projects = parsed.filter(item => item.value && typeof item.value === 'object' && (item.path.endsWith('.nova') || item.value.projectFormat === 'Nova_A Project Format 2'))
const schemas = [...new Set(projects.map(item => Number(item.value.formatVersion)).filter(Number.isInteger))].sort((a, b) => a - b)
const invalid = projects.filter(item => !Array.isArray(item.value.scenes) || !Number.isInteger(Number(item.value.formatVersion)) || Number(item.value.formatVersion) < 1)
check('V2603-HISTORY-PROJECTS', projects.length >= 80 && invalid.length === 0 && schemas.includes(29), 'All project fixtures retain registered positive schemas and scene collections; current schema 29 is represented.', { projects: projects.length, schemas, invalid: invalid.map(item => item.path) })

const [formatRust, projectUpgrade, manifestSource, expectedSource] = await Promise.all([
  'crates/nova_format/src/lib.rs',
  'src/runtime/projectUpgrade.ts',
  'src/projects/projectManifest.ts',
  'tests/fixtures/migrations/public-schema-expected.json'
].map(path => readFile(join(root, path), 'utf8')))
const expected = JSON.parse(expectedSource)
check('V2603-HISTORY-AUTHORITY', formatRust.includes('CURRENT_ENGINE_VERSION: &str = "26.3.0"') && formatRust.includes('CURRENT_FORMAT_VERSION: u32 = 29') && formatRust.includes('v2601_seals_historical_engine_boundaries_without_changing_schema_29'), 'Rust owns engine/schema authority and retains the schema-29 historical boundary test.')
check('V2603-HISTORY-WIRING', projectUpgrade.includes('downloadProjectBackup') && projectUpgrade.includes('storeUpgradeRollback') && projectUpgrade.includes('semanticProjectDiff') && manifestSource.includes("maximumExclusive: '27.0.0'"), 'Upgrade preview, backup, semantic diff, rollback and the 2026 compatibility ceiling remain connected.')
check('V2603-HISTORY-GOLDEN', expected.targetEngine === '26.3.0' && expected.targetSchema === 29 && expected.preservedMarker?.preserve === true, 'The public migration golden projection targets 26.3.0/schema 29 and retains unknown authored data.', { expected })

const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v26.03-history-verification', version: 1, engineVersion: '26.3.0', releaseLabel: '26.03', generatedAt: new Date().toISOString(), checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v26.03-history-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A 26.03 history audit passed: ${projects.length} project documents and ${parsed.length} structured fixtures.`)
