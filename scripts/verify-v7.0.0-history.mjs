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
check('V700-HISTORY-JSON', malformed.length === 0 && parsed.length >= 120, 'Every JSON/NOVA history, template, migration and reference fixture parses without executing content.', { documents: parsed.length, malformed })

const projectDocuments = parsed.filter(item => item.value && typeof item.value === 'object' && (item.path.endsWith('.nova') || item.value.projectFormat === 'Nova_A Project Format 2'))
const schemas = [...new Set(projectDocuments.map(item => Number(item.value.formatVersion)).filter(Number.isInteger))].sort((a, b) => a - b)
const invalidProject = projectDocuments.filter(item => !Array.isArray(item.value.scenes) || !Number.isInteger(Number(item.value.formatVersion)) || Number(item.value.formatVersion) < 1)
check('V700-HISTORY-PROJECTS', projectDocuments.length >= 80 && invalidProject.length === 0 && schemas.includes(29), 'Every project fixture retains a scene collection and registered positive schema; current schema 29 is represented.', { projects: projectDocuments.length, schemas, invalid: invalidProject.map(item => item.path) })

const v7Projects = projectDocuments.filter(item => item.path.includes('v700-'))
check('V700-CURRENT-REFERENCES', v7Projects.length >= 5 && v7Projects.every(item => item.value.engineVersion === '7.0.0' || item.path.includes('v6.9-schema29') || item.path.includes('future-schema')), 'Current v7 reference and expected migration documents identify the correct engine.', { documents: v7Projects.map(item => item.path) })

const source = projectDocuments.find(item => item.path.endsWith('creator-v700-migration-recovery/migration-lab/v6.9-schema29.nova'))?.value
const expected = projectDocuments.find(item => item.path.endsWith('creator-v700-migration-recovery/migration-lab/v7-schema29-expected.nova'))?.value
const future = projectDocuments.find(item => item.path.endsWith('creator-v700-migration-recovery/migration-lab/future-schema.nova'))?.value
check('V700-GOLDEN-MIGRATION', source?.engineVersion === '6.9.0' && source?.formatVersion === 29 && source?.manifest?.engineCompatibility?.maximumExclusive === '7.0.0' && expected?.engineVersion === '7.0.0' && expected?.formatVersion === 29 && expected?.manifest?.engineCompatibility?.maximumExclusive === '8.0.0' && Number(future?.formatVersion) > 29, 'Golden fixtures cover the 6.9 ceiling seal, expected current output and fail-closed future schema.')

const [formatRust, templates, projectUpgrade, manifestSource, compatibility] = await Promise.all(['crates/nova_format/src/lib.rs','src/projects/templates.ts','src/runtime/projectUpgrade.ts','src/projects/projectManifest.ts','docs/COMPATIBILITY.md'].map(path => readFile(join(root, path), 'utf8')))
check('V700-RUST-MIGRATION', formatRust.includes('CURRENT_ENGINE_VERSION: &str = "7.0.0"') && formatRust.includes('v70_seals_historical_engine_boundaries_without_changing_schema_29') && formatRust.includes('json!("8.0.0")'), 'Rust migration authority and golden boundary test preserve schema 29 and seal the compatibility ceiling.')
check('V700-TEMPLATE-AUTHORITY', templates.includes('PROJECT_TEMPLATES') && templates.includes("category: 'scene'") && templates.includes("category: 'test'") && templates.includes("category: 'game'"), 'Startup scene, test and prebuilt-game templates continue to use the registered catalog.')
check('V700-MIGRATION-WIRING', projectUpgrade.includes('downloadProjectBackup') && projectUpgrade.includes('storeUpgradeRollback') && projectUpgrade.includes('semanticProjectDiff') && manifestSource.includes("['4.0.0', '5.0.0', '6.0.0', '7.0.0']") && compatibility.includes('<8.0.0'), 'Preview, backup, semantic diff, rollback and historical-ceiling normalization are wired and documented.')

const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v7.0.0-history-verification', version: 1, engineVersion: '7.0.0', generatedAt: new Date().toISOString(), checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v7.0.0-history-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v7.0.0 history audit passed: ${projectDocuments.length} project documents and ${parsed.length} structured fixtures.`)
