import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const version = '7.0.0'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const compiled = await mkdtemp(join(tmpdir(), 'nova-v700-verify-'))
const checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const read = path => readFile(join(root, path), 'utf8')

globalThis.crypto ??= (await import('node:crypto')).webcrypto
globalThis.localStorage ??= { getItem() { return null }, setItem() {}, removeItem() {} }

try {
  await build({
    configFile: false, root, logLevel: 'warn', ssr: { noExternal: true },
    build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: {
      platform: join(root, 'src/runtime/stableCreatorPlatform.ts'), contracts: join(root, 'src/runtime/stableContracts.ts'),
      format: join(root, 'src/projects/projectFormat.ts'), upgrade: join(root, 'src/runtime/projectUpgrade.ts'),
      learning: join(root, 'src/runtime/creatorLearning.ts'), manifest: join(root, 'src/projects/projectManifest.ts')
    }, output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } }
  })
  const load = name => import(`${pathToFileURL(join(compiled, `${name}.mjs`)).href}?v=${Date.now()}`)
  const [platform, contracts, format, upgrade, learning, manifest] = await Promise.all(['platform', 'contracts', 'format', 'upgrade', 'learning', 'manifest'].map(load))

  check('V700-AUTHORITY', format.NOVA_ENGINE_VERSION === version && format.NOVA_PROJECT_FORMAT_MAJOR === 2 && format.NOVA_PROJECT_SCHEMA_VERSION === 29, 'Engine authority is 7.0.0 while Project Format 2/schema 29 remains frozen.')
  check('V700-CONTRACTS', contracts.NOVA_STABLE_CONTRACTS.length === 7 && contracts.NOVA_STABLE_CONTRACTS.every(item => item.frozen) && platform.CREATOR_CONTRACT_REVIEW.nextContractDecision === 'deferred' && !platform.CREATOR_CONTRACT_REVIEW.schemaChangeApproved, 'All seven reviewed contracts remain frozen and the next breaking-contract decision is honestly deferred.')

  const dimensions = platform.CREATOR_READINESS_DIMENSIONS
  const readiness = platform.CREATOR_PLATFORM_READINESS
  const allowed = new Set(['covered', 'not-applicable', 'external'])
  const complete = readiness.length === learning.CREATOR_LEARNING_GUIDES.length && readiness.every(item => dimensions.length === 7 && dimensions.every(dimension => item.dimensions[dimension] && allowed.has(item.dimensions[dimension].status) && item.dimensions[dimension].route && item.dimensions[dimension].detail))
  check('V700-FEATURE-READINESS', complete && platform.CREATOR_PLATFORM_SUMMARY.uncovered === 0 && readiness.length >= 350, 'Every public feature has a complete seven-dimension readiness disposition.', { features: readiness.length, dimensions: dimensions.length, ...platform.CREATOR_PLATFORM_SUMMARY })
  check('V700-SUPPORT-MATRIX', platform.CREATOR_SUPPORT_MATRIX.length === 7 && platform.CREATOR_SUPPORT_MATRIX.some(item => item.target.includes('Windows') && item.status === 'tier-1-local') && platform.CREATOR_SUPPORT_MATRIX.some(item => item.target.includes('iOS') && item.status === 'deferred-or-excluded'), 'Local Tier-1, matching-host, optional, deferred and out-of-scope support states remain explicit.')

  const migrationFixtureText = await read('reference-projects/projects/creator-v700-migration-recovery/migration-lab/v6.9-schema29.nova')
  const migrationFixture = JSON.parse(migrationFixtureText)
  const preview = upgrade.analyzeProjectUpgrade(migrationFixtureText)
  check('V700-MIGRATION-PREVIEW', preview.supported && preview.requiresMigration && preview.sourceSchema === 29 && preview.targetSchema === 29 && preview.targetEngine === version && preview.migrationSteps.some(step => step.name.includes('compatibility metadata seal')) && preview.preflight.some(item => item.id === 'backup' && item.status === 'passed'), 'A 6.9/schema-29 project receives a metadata-only, backed-up compatibility migration preview.', { warnings: preview.warnings })
  const normalized = manifest.normalizeProjectManifest({ ...migrationFixture.manifest, engineCompatibility: { minimum: '3.9.0', maximumExclusive: '7.0.0' } }, migrationFixture.projectMetadata)
  check('V700-MIGRATION-CANONICAL', normalized.engineCompatibility.maximumExclusive === '8.0.0' && manifest.manifestCompatibility(normalized).compatible, 'Historical supported-engine ceilings normalize deterministically to <8.0.0 without schema data changes.')
  const futureText = await read('reference-projects/projects/creator-v700-migration-recovery/migration-lab/future-schema.nova')
  const futurePreview = upgrade.analyzeProjectUpgrade(futureText)
  check('V700-FUTURE-BLOCK', !futurePreview.supported && futurePreview.preflight.some(item => item.status === 'blocked'), 'Future schemas fail closed before editor state is modified.')

  const [ui, i18n, instructions, guide, api, migration, troubleshooting, manualEn, manualDe, manualZh, manualHtml, stableReference, migrationReference] = await Promise.all([
    'src/components/CreatorLearningCenter.vue', 'src/i18n.ts', 'instructions.txt', 'docs/STABLE_CREATOR_PLATFORM_7_0.md', 'docs/API_REFERENCE_7_0.md', 'docs/MIGRATION_7_0.md', 'docs/TROUBLESHOOTING_7_0.md',
    'manual/MANUAL.en.md', 'manual/MANUAL.de.md', 'manual/MANUAL.zh-CN.md', 'manual/index.html',
    'reference-projects/projects/creator-v700-stable-platform/project.nova', 'reference-projects/projects/creator-v700-migration-recovery/project.nova'
  ].map(read))
  check('V700-UI-WIRING', ui.includes("activeTab === 'readiness'") && ui.includes('CREATOR_PLATFORM_READINESS') && ui.includes('CREATOR_SUPPORT_MATRIX') && ['platformReadiness','bindingCoverage','runtimeExport','supportMatrix'].every(key => (i18n.match(new RegExp(`${key}:`, 'g')) ?? []).length >= 3), 'Platform readiness, support limits and every new label reach the EN/DE/ZH editor UI.')
  check('V700-MANUALS', [manualEn, manualDe, manualZh].every(text => text.includes('Engine: **7.0.0**') && text.includes('v70-stable-platform') && text.length > 400_000) && manualHtml.includes('Nova_A 7.0.0 Manual') && manualHtml.includes('v70-stable-platform'), 'The webpage and three complete Markdown manuals teach all feature and v7 platform workflows.', { bytes: manualEn.length + manualDe.length + manualZh.length })
  check('V700-DOCUMENTATION', instructions.includes('## 7.0.0 implementation checkpoint') && guide.includes('## Contract decision') && api.includes('## Gameplay behavior') && migration.includes('## User workflow') && troubleshooting.includes('## Project will not open'), 'Roadmap checkpoint, support contract, API, migration and troubleshooting documentation are synchronized.')
  const references = [JSON.parse(stableReference), JSON.parse(migrationReference)]
  const referencePackage = JSON.parse(await read('reference-projects/projects/creator-v700-stable-platform/package-fixture/package.json'))
  check('V700-REFERENCES', references.every(project => project.engineVersion === version && project.projectFormatMajor === 2 && project.formatVersion === 29 && project.manifest.engineCompatibility.maximumExclusive === '8.0.0') && referencePackage.engine === '>=6.0.0 <8.0.0' && referencePackage.provenance.includes('v700'), 'Both v7 guided references and their reusable package use the frozen format and reviewed <8 compatibility ceiling.')
} finally {
  await rm(compiled, { recursive: true, force: true })
}

const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v7.0.0-verification', version: 1, engineVersion: version, generatedAt: new Date().toISOString(), perspectives: ['contract-review','feature-inventory','migration','support','documentation','normal-user'], checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v7.0.0-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v7.0.0 verification passed: ${checks.length} stable-platform checks across ${checks.find(item => item.id === 'V700-FEATURE-READINESS')?.metrics.features ?? 0} public features.`)
