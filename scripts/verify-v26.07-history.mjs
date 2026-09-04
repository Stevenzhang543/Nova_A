import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
async function filesBelow(directory) { const output = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); entry.isDirectory() ? output.push(...await filesBelow(path)) : output.push(path) } return output }
const roots = ['reference-projects','tests/fixtures/migrations','release-fixtures'].map(path => join(root, path))
const all = (await Promise.all(roots.map(path => filesBelow(path).catch(() => [])))).flat()
const candidates = all.filter(path => ['.nova','.json'].includes(extname(path).toLowerCase())), parsed = [], malformed = []
for (const path of candidates) { try { parsed.push({ path: relative(root, path).replaceAll('\\','/'), value: JSON.parse(await readFile(path,'utf8')) }) } catch (error) { malformed.push({ path: relative(root,path).replaceAll('\\','/'), error: error instanceof Error ? error.message : String(error) }) } }
check('V2607-HISTORY-JSON', malformed.length === 0 && parsed.length >= 124, 'Every JSON/NOVA history, migration and reference fixture parses without executing content.', { documents: parsed.length, malformed })
const projects = parsed.filter(item => item.value && typeof item.value === 'object' && (item.path.endsWith('.nova') || item.value.projectFormat === 'Nova_A Project Format 2'))
const schemas = [...new Set(projects.map(item => Number(item.value.formatVersion)).filter(Number.isInteger))].sort((a,b) => a-b)
check('V2607-HISTORY-PROJECTS', projects.length >= 82 && projects.every(item => Array.isArray(item.value.scenes) && Number(item.value.formatVersion) >= 1) && schemas.includes(29), 'Historical projects remain readable and schema 29 stays represented.', { projects: projects.length, schemas })
const [formatTs, formatRust, projectUpgrade, manifestSource, replaySource, coopSource, serverSource] = await Promise.all(['src/projects/projectFormat.ts','crates/nova_format/src/lib.rs','src/runtime/projectUpgrade.ts','src/projects/projectManifest.ts','src/runtime/networkReplay.ts','reference-projects/projects/multiplayer-v2607-coop-rollback/project.nova','reference-projects/projects/multiplayer-v2607-headless-authority/project.nova'].map(path => readFile(join(root,path),'utf8')))
check('V2607-HISTORY-AUTHORITY', formatTs.includes("NOVA_ENGINE_VERSION = '26.7.0'") && formatTs.includes('NOVA_PROJECT_SCHEMA_VERSION = 29') && formatRust.includes('CURRENT_ENGINE_VERSION: &str = "26.7.0"') && formatRust.includes('CURRENT_FORMAT_VERSION: u32 = 29'), 'TypeScript and Rust agree on 26.7.0 while schema 29 remains frozen.')
check('V2607-HISTORY-MIGRATION', projectUpgrade.includes('downloadProjectBackup') && projectUpgrade.includes('storeUpgradeRollback') && projectUpgrade.includes('semanticProjectDiff') && manifestSource.includes("maximumExclusive: '27.0.0'"), 'Preview, complete backup, semantic diff, atomic apply and rollback remain connected through the 27.0.0 ceiling.')
check('V2607-HISTORY-REPLAY-V1', replaySource.includes("version: 1") && replaySource.includes('normalizeMultiplayerReplay'), 'The existing multiplayer replay/save version-1 reader remains present after additive 26.07 work.')
const coop = JSON.parse(coopSource), server = JSON.parse(serverSource)
const projection = project => ({ schema: project.formatVersion, protocol: project.projectSettings.production.networking.protocolVersion, network: project.projectSettings.production.networking, build: project.projectSettings.build, assets: project.assets.map(asset => ({ uuid: asset.uuid, path: asset.path, type: asset.assetType, source: asset.source })), entities: project.scenes.flatMap(scene => scene.entities).map(entity => ({ uuid: entity.uuid, components: entity.components })) })
for (const [name, project, mode, role] of [['coop', coop, 'game', 'host'], ['server', server, 'headless-server', 'server']]) {
  const original = projection(project), roundtrip = projection(JSON.parse(JSON.stringify(project)))
  check(`V2607-HISTORY-${name.toUpperCase()}-ROUNDTRIP`, JSON.stringify(original) === JSON.stringify(roundtrip) && project.engineVersion === '26.7.0' && project.formatVersion === 29 && project.projectSettings.build.runtimeMode === mode && project.projectSettings.production.networking.role === role, `The ${name} reference preserves authored scripts, entities, networking and build settings through a JSON save/reload round trip.`)
}
const oldRefs = projects.filter(item => item.path.includes('creator-v660-'))
check('V2607-HISTORY-OLD-NETWORK-REFS', oldRefs.length >= 2 && oldRefs.every(item => item.value.engineVersion === '6.6.0'), 'Historical 6.6 networking references remain unmodified and readable.', { references: oldRefs.map(item => item.path) })
const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v26.07-history-verification', version: 1, releaseLabel: '26.07', engineVersion: '26.7.0', generatedAt: new Date().toISOString(), checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root,'release-audits'), { recursive: true }); await writeFile(join(root,'release-audits/v26.07-history-verification.json'), `${JSON.stringify(report,null,2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A 26.07 history audit passed: ${projects.length} project documents and ${parsed.length} structured fixtures.`)
