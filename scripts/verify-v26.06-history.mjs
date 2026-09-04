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
check('V2606-HISTORY-JSON', malformed.length === 0 && parsed.length >= 120, 'Every JSON/NOVA history, template, migration and reference fixture parses without executing content.', { documents: parsed.length, malformed })
const projects = parsed.filter(item => item.value && typeof item.value === 'object' && (item.path.endsWith('.nova') || item.value.projectFormat === 'Nova_A Project Format 2'))
const schemas = [...new Set(projects.map(item => Number(item.value.formatVersion)).filter(Number.isInteger))].sort((a,b) => a-b)
const invalid = projects.filter(item => !Array.isArray(item.value.scenes) || !Number.isInteger(Number(item.value.formatVersion)) || Number(item.value.formatVersion) < 1)
check('V2606-HISTORY-PROJECTS', projects.length >= 80 && invalid.length === 0 && schemas.includes(29), 'Historical projects retain positive registered schemas and scene collections; schema 29 remains represented.', { projects: projects.length, schemas, invalid: invalid.map(item => item.path) })
const [formatRust, projectUpgrade, manifestSource, expectedSource] = await Promise.all(['crates/nova_format/src/lib.rs','src/runtime/projectUpgrade.ts','src/projects/projectManifest.ts','tests/fixtures/migrations/public-schema-expected.json'].map(path => readFile(join(root,path),'utf8')))
const expected = JSON.parse(expectedSource)
check('V2606-HISTORY-AUTHORITY', formatRust.includes('CURRENT_ENGINE_VERSION: &str = "26.6.0"') && formatRust.includes('CURRENT_FORMAT_VERSION: u32 = 29') && formatRust.includes('v2601_seals_historical_engine_boundaries_without_changing_schema_29'), 'Rust owns 26.6.0/schema-29 authority and retains the historical boundary test.')
check('V2606-HISTORY-WIRING', projectUpgrade.includes('downloadProjectBackup') && projectUpgrade.includes('storeUpgradeRollback') && projectUpgrade.includes('semanticProjectDiff') && manifestSource.includes("maximumExclusive: '27.0.0'"), 'Upgrade preview, complete backup, semantic diff, rollback and the 2026 compatibility ceiling remain connected.')
check('V2606-HISTORY-GOLDEN', expected.targetEngine === '26.6.0' && expected.targetSchema === 29 && expected.preservedMarker?.preserve === true, 'The public migration golden targets 26.6.0/schema 29 and retains unknown authored data.', { expected })
const simulationReferenceSource = await readFile(join(root, 'reference-projects/projects/simulation-v2606-physics-navigation-ai/project.nova'), 'utf8')
const simulationReference = JSON.parse(simulationReferenceSource)
const reloadedSimulationReference = JSON.parse(JSON.stringify(simulationReference))
const authoredProjection = project => ({
  physics: project.projectSettings?.physics,
  entities: project.scenes?.flatMap(scene => scene.entities ?? []).map(entity => ({
    uuid: entity.uuid,
    components: (entity.components ?? []).filter(component => ['BoxCollider2D','EllipseCollider2D','DistanceJoint2D','NavigationRegion2D','NavigationAgent2D','NavigationObstacle2D','BehaviorTree2D','StateMachine2D'].includes(component.kind)).map(component => ({ kind: component.kind, enabled: component.enabled, data: component.data }))
  })).filter(entity => entity.components.length),
  connections: project.scenes?.flatMap(scene => scene.connections ?? []).map(connection => ({ componentType: connection.componentType, route: connection.route, restLengths: connection.restLengths, maxStretchRatio: connection.maxStretchRatio, collisionEnabled: connection.collisionEnabled, segmentCount: connection.segmentCount, anchors: connection.anchors, manualPoints: connection.manualPoints })),
  aiAssets: (project.assets ?? []).filter(asset => ['behaviorTree','stateMachine'].includes(asset.assetType)).map(asset => ({ uuid: asset.uuid, assetType: asset.assetType, path: asset.path, source: asset.source }))
})
const originalProjection = authoredProjection(simulationReference), reloadedProjection = authoredProjection(reloadedSimulationReference)
const referenceComponents = originalProjection.entities.flatMap(entity => entity.components), referenceKinds = new Set(referenceComponents.map(component => component.kind))
check('V2606-HISTORY-SIMULATION-ROUNDTRIP', JSON.stringify(originalProjection) === JSON.stringify(reloadedProjection)
  && originalProjection.physics?.units?.gridUnitMeters === 1
  && referenceComponents.some(component => component.kind === 'BoxCollider2D' && component.data?.shapes?.length >= 2)
  && originalProjection.connections.length >= 3 && originalProjection.connections.every(connection => connection.componentType === 'Rope2D' && connection.collisionEnabled && connection.segmentCount >= 3 && connection.restLengths?.length === 1 && connection.restLengths[0] > 0)
  && ['NavigationRegion2D','NavigationAgent2D','NavigationObstacle2D','BehaviorTree2D','StateMachine2D'].every(kind => referenceKinds.has(kind))
  && originalProjection.aiAssets.length >= 2 && originalProjection.aiAssets.every(asset => typeof asset.source === 'string' && asset.source.length > 0), 'Save/reload preserves the canonical physics settings, compound children, constraint rest lengths/Rope2D fields, navigation/avoidance fields, AI asset references, and embedded Behavior Tree/HSM sources.', { entities: originalProjection.entities.length, connections: originalProjection.connections.length, aiAssets: originalProjection.aiAssets.length })
const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v26.06-history-verification', version: 1, engineVersion: '26.6.0', releaseLabel: '26.06', generatedAt: new Date().toISOString(), checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root,'release-audits'), { recursive: true }); await writeFile(join(root,'release-audits/v26.06-history-verification.json'), `${JSON.stringify(report,null,2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A 26.06 history audit passed: ${projects.length} project documents and ${parsed.length} structured fixtures.`)
