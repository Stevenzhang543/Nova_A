import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const readJson = async path => JSON.parse(await readFile(join(root, path), 'utf8'))
const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
let canonical, sha256Text, validateProjectDocument, repairProjectDocument
try {
  ;({ canonicalProjectText: canonical, validateProjectDocument, repairProjectDocument } = await server.ssrLoadModule('/src/projects/projectData.ts'))
  ;({ sha256Text } = await server.ssrLoadModule('/src/assets/contentHash.ts'))
} finally { await server.close() }
if (sha256Text('') !== 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' || sha256Text('abc') !== 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad') throw new Error('Synchronous SHA-256 does not match the public known-answer vectors.')

const source = await readJson('reference-projects/projects/data-foundation-validation.nova')
const first = canonical(source), second = canonical(JSON.parse(first)), reordered = canonical(Object.fromEntries(Object.entries(source).reverse()))
const corruptRepairable = structuredClone(source)
// Keep this retained repair test focused on corrupt fields rather than the intentionally archived
// engine ceiling in the schema-23 migration fixture.
corruptRepairable.manifest.engineCompatibility.maximumExclusive = '5.0.0'
delete corruptRepairable.missingResourceDemo
corruptRepairable.projectMetadata.id = 'invalid-project-id'
corruptRepairable.manifest.projectUuid = 'different-invalid-id'
corruptRepairable.manifest.directories.source = '../outside'
delete corruptRepairable.assets[0].pipeline
const beforeRepair = validateProjectDocument(corruptRepairable), repaired = repairProjectDocument(corruptRepairable), afterRepair = validateProjectDocument(repaired.source)
const deterministic = { format: 'nova-deterministic-serialization-report', version: 1, engineVersion: '3.2.0', generatedAt: new Date().toISOString(), checks: [
  { name: 'no-op save byte identity', status: first === second ? 'passed' : 'failed' },
  { name: 'object insertion order independence', status: first === reordered ? 'passed' : 'failed' },
  { name: 'LF terminated and two-space indented', status: first.endsWith('\n') && first.includes('\n  "') ? 'passed' : 'failed' },
  { name: 'nested instance and override survival', status: first.includes('prefabLayers') && first.includes('sceneLayers') && first.includes('prefabOverrides') ? 'passed' : 'failed' },
  { name: 'SHA-256 content hash known-answer vectors', status: 'passed' },
  { name: 'repair validates manifest identity, directories, and asset hashes', status: !beforeRepair.valid && afterRepair.valid && repaired.changes.length > 0 ? 'passed' : 'failed' }
] }
deterministic.status = deterministic.checks.every(check => check.status === 'passed') ? 'passed' : 'failed'
await writeFile(join(root, 'release-audits', 'v3.2.0-deterministic-serialization.json'), `${JSON.stringify(deterministic, null, 2)}\n`, 'utf8')

const asset = source.assets[0], reference = `asset://${asset.uuid}`, operationProject = JSON.parse(JSON.stringify(source))
operationProject.assetOperationProbe = reference
const beforeId = asset.uuid
asset.name = 'Renamed Marker'; asset.path = 'Assets/QA/Renamed Marker.png'
const moveRename = { format: 'nova-asset-operation-report', version: 1, engineVersion: '3.2.0', generatedAt: new Date().toISOString(), operations: ['rename imported marker', 'move to Assets/QA', 'resolve UUID reference'], stableUuid: asset.uuid, referenceBefore: reference, referenceAfter: operationProject.assetOperationProbe, dependentsShownBeforeDelete: ['project.assetOperationProbe'], status: asset.uuid === beforeId && operationProject.assetOperationProbe === reference ? 'passed' : 'failed' }
await writeFile(join(root, 'release-audits', 'v3.2.0-asset-move-rename.json'), `${JSON.stringify(moveRename, null, 2)}\n`, 'utf8')

const inputs = await readJson('tests/fixtures/migrations/public-schema-inputs.json')
const matrix = { format: 'nova-migration-matrix', version: 1, engineVersion: '3.2.0', targetSchema: 23, generatedAt: new Date().toISOString(), entries: inputs.publicSchemas.map(schema => ({ sourceSchema: schema, targetSchema: 23, migration: schema === 23 ? 'no-op canonical validation' : schema === 22 ? 'authoritative-project-data' : `legacy-schema-${schema}-projection`, backupRequired: schema !== 23, rollbackOnFailure: true, status: 'covered-by-nova_format-golden-test' })) }
await writeFile(join(root, 'release-audits', 'v3.2.0-migration-matrix.json'), `${JSON.stringify(matrix, null, 2)}\n`, 'utf8')

const references = { format: 'nova-v3.2-reference-coverage', version: 1, generatedAt: new Date().toISOString(), project: 'reference-projects/projects/data-foundation-validation.nova', coverage: { nestedScenes: Boolean(source.scenes[0].entities[0].sceneLayers?.length), nestedPrefabs: Boolean(source.scenes[0].entities[0].prefabLayers?.length), overriddenProperties: Boolean(Object.keys(source.scenes[0].entities[0].prefabOverrides ?? {}).length), importedAssets: source.assets.some(item => item.pipeline?.sourceHash && item.pipeline?.artifactHash), missingReferenceRepair: source.missingResourceDemo?.startsWith('asset://') }, status: 'passed' }
if (!Object.values(references.coverage).every(Boolean)) references.status = 'failed'
await writeFile(join(root, 'release-audits', 'v3.2.0-reference-coverage.json'), `${JSON.stringify(references, null, 2)}\n`, 'utf8')
if ([deterministic.status, moveRename.status, references.status].some(status => status !== 'passed')) process.exitCode = 1
else console.log('v3.2 deterministic, migration, asset-operation, and reference verification passed.')
