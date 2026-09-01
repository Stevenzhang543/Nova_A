import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const sourceDirectory = join(root, 'reference-projects/projects/creator-v690-package-shipping')
const references = [
  {
    id: 'creator-v700-stable-platform',
    uuid: '70000000-0000-4000-8000-000000000001',
    name: 'Nova 7 Stable Creator Platform',
    description: 'Playable end-to-end authoring, code/graph parity, diagnostics, accessibility, build and exact release-evidence workflow.'
  },
  {
    id: 'creator-v700-migration-recovery',
    uuid: '70000000-0000-4000-8000-000000000002',
    name: 'Nova 7 Migration and Recovery Lab',
    description: 'Safe dry-run migration, semantic diff, backup, deterministic apply, rollback and future-version rejection workflow.'
  }
]

const rewriteForV7 = value => {
  if (Array.isArray(value)) return value.map(rewriteForV7)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, rewriteForV7(child)]))
  if (typeof value !== 'string') return value
  return value
    .replaceAll('6.9.0', '7.0.0')
    .replaceAll('>=6.0.0 <7.0.0', '>=6.0.0 <8.0.0')
    .replaceAll('<7.0.0', '<8.0.0')
}

for (const reference of references) {
  const target = join(root, `reference-projects/projects/${reference.id}`)
  await rm(target, { recursive: true, force: true })
  await mkdir(target, { recursive: true })
  await cp(sourceDirectory, target, { recursive: true })
  const projectPath = join(target, 'project.nova')
  const project = rewriteForV7(JSON.parse(await readFile(projectPath, 'utf8')))
  project.engineVersion = '7.0.0'
  project.projectMetadata = { ...project.projectMetadata, id: reference.uuid, name: reference.name, template: reference.id, description: reference.description, updatedAt: '2026-09-01T00:00:00.000Z' }
  project.manifest = { ...project.manifest, projectUuid: reference.uuid, name: reference.name, engineCompatibility: { minimum: String(project.manifest?.engineCompatibility?.minimum ?? '3.9.0'), maximumExclusive: '8.0.0' } }
  project.projectSettings.build.gameName = reference.name
  if (project.projectSettings?.build?.platform) project.projectSettings.build.platform.version = '7.0.0'
  await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`)

  const packageManifestPath = join(target, 'package-fixture/package.json')
  const packageManifest = rewriteForV7(JSON.parse(await readFile(packageManifestPath, 'utf8')))
  packageManifest.engine = '>=6.0.0 <8.0.0'
  packageManifest.provenance = 'nova-v700-stable-platform-reference'
  await writeFile(packageManifestPath, `${JSON.stringify(packageManifest, null, 2)}\n`)

  const migration = reference.id.includes('migration')
  await writeFile(join(target, 'README.md'), `# ${reference.name}\n\nEngine **7.0.0** · Project Format 2/schema 29.\n\n${reference.description}\n\nOpen the project, run Play/Pause/Step, and follow \`test-controls.json\`. ${migration ? 'The migration fixtures are copies: preview them before applying and restore the generated backup during the recovery step.' : 'Use Manage → Learning Center → Platform readiness to connect every authored action to its validation and release evidence.'}\n\nWindows and Web are locally qualified Tier 1. Linux/macOS matching-host builds, Android hardware, signing, independent observation and a real soak remain external; this project does not claim those results.\n`)
  await writeFile(join(target, 'test-controls.json'), `${JSON.stringify({
    engineVersion: '7.0.0',
    reference: reference.id,
    workflow: migration
      ? ['open migration-lab/v6.9-schema29.nova', 'review dry-run source/target and semantic diff', 'confirm backup path', 'apply migration', 'save and reopen', 'compare canonical checksum', 'restore backup', 'confirm future-schema.nova fails closed']
      : ['play reference', 'move and resize an object', 'edit one Rhai behavior and inspect Visual Graph parity', 'edit one visual block and inspect generated Rhai', 'open Platform readiness and inspect all seven dimensions', 'run Project Health', 'switch EN/DE/ZH and 100/150/200% scale', 'keyboard-traverse workspaces', 'save/reopen/play', 'build Windows and Web', 'inspect exact-eleven release plan'],
    expected: { playable: true, projectFormat: 2, schema: 29, engineCeiling: '<8.0.0', implicitNetworkOperation: false, exactReleaseArtifacts: 11, externalCertificationClaimed: false }
  }, null, 2)}\n`)
  await writeFile(join(target, 'expected-output.json'), `${JSON.stringify({ engineVersion: '7.0.0', status: 'passed', projectFormat: 2, schema: 29, readinessFeatures: 358, readinessDimensions: 7, migrationPreview: migration, runtimePlayable: true, exactReleaseArtifacts: 11, externalCertificationComplete: false }, null, 2)}\n`)

  if (migration) {
    const fixtureDirectory = join(target, 'migration-lab')
    await mkdir(fixtureDirectory, { recursive: true })
    const historical = structuredClone(project)
    historical.engineVersion = '6.9.0'
    historical.manifest.engineCompatibility.maximumExclusive = '7.0.0'
    historical.projectMetadata.name = 'Nova 6.9 schema-29 migration source'
    const current = structuredClone(project)
    current.projectMetadata.name = 'Nova 7 schema-29 expected target'
    const future = structuredClone(project)
    future.engineVersion = '99.0.0'
    future.formatVersion = 999
    await Promise.all([
      ['v6.9-schema29.nova', historical],
      ['v7-schema29-expected.nova', current],
      ['future-schema.nova', future]
    ].map(([name, value]) => writeFile(join(fixtureDirectory, name), `${JSON.stringify(value, null, 2)}\n`)))
    await writeFile(join(fixtureDirectory, 'EXPECTED.md'), '# Expected migration behavior\n\n- The v6.9 fixture previews a metadata-only `<7.0.0` → `<8.0.0` compatibility seal.\n- The preview produces a backup and deterministic semantic diff before apply.\n- Repeating the migration is a no-op and produces the same canonical project.\n- Rollback restores the byte-for-byte source fixture.\n- The future-schema fixture is blocked without modifying the open project.\n')
  }
}

console.log(`Generated ${references.length} Nova_A v7 stable-platform and migration-recovery references.`)
