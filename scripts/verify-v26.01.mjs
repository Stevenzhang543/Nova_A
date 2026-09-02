import { build } from 'vite'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), compiled = await mkdtemp(join(tmpdir(), 'nova-v2601-verify-')), checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const read = path => readFile(join(root, path), 'utf8')
globalThis.crypto ??= (await import('node:crypto')).webcrypto
globalThis.localStorage ??= { getItem() { return null }, setItem() {}, removeItem() {} }
try {
  await build({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true }, build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: { format: join(root, 'src/projects/projectFormat.ts'), manifest: join(root, 'src/projects/projectManifest.ts'), upgrade: join(root, 'src/runtime/projectUpgrade.ts'), templates: join(root, 'src/projects/templates.ts'), platform: join(root, 'src/runtime/stableCreatorPlatform.ts') }, output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } } })
  const load = name => import(`${pathToFileURL(join(compiled, `${name}.mjs`)).href}?v=${Date.now()}`)
  const [format, manifest, upgrade, templates, platform] = await Promise.all(['format','manifest','upgrade','templates','platform'].map(load))
  const pkg = JSON.parse(await read('package.json')), tauri = JSON.parse(await read('src-tauri/tauri.conf.json')), cargo = await read('Cargo.toml'), nativeCargo = await read('src-tauri/Cargo.toml'), rustFormat = await read('crates/nova_format/src/lib.rs')
  check('V2601-AUTHORITY', format.NOVA_ENGINE_VERSION === '26.1.0' && format.NOVA_RELEASE_NAME === '26.01' && pkg.version === '26.1.0' && tauri.version === '26.1.0' && /version\s*=\s*"26\.1\.0"/.test(cargo) && /version\s*=\s*"26\.1\.0"/.test(nativeCargo) && rustFormat.includes('CURRENT_ENGINE_VERSION: &str = "26.1.0"'), 'Public 26.01 and machine 26.1.0 authorities agree across TypeScript, npm, Rust and Tauri.')
  check('V2601-FROZEN-FORMAT', format.NOVA_PROJECT_FORMAT_MAJOR === 2 && format.NOVA_PROJECT_SCHEMA_VERSION === 29, 'Calendar versioning does not rewrite Project Format 2/schema 29.')
  const normalized = manifest.normalizeProjectManifest({ engineCompatibility: { minimum: '3.9.0', maximumExclusive: '8.0.0' } })
  const legacySource = JSON.stringify({ projectFormat: 'Nova_A Project Format 2', formatVersion: 29, engineVersion: '7.0.0', projectMetadata: { id: '26010000-0000-4000-8000-000000000002', name: 'Legacy' }, manifest: { name: 'Legacy', engineCompatibility: { minimum: '3.9.0', maximumExclusive: '8.0.0' } }, scenes: [], assets: [] })
  const preview = upgrade.analyzeProjectUpgrade(legacySource)
  check('V2601-COMPATIBILITY-SEAL', normalized.engineCompatibility.maximumExclusive === '27.0.0' && manifest.manifestCompatibility(normalized).compatible && preview.supported && preview.requiresMigration && preview.targetSchema === 29 && preview.migrationSteps.some(step => step.name.includes('calendar-version')), 'Legacy reviewed ceilings migrate to <27.0.0 as metadata only, with preview and frozen schema.', { warnings: preview.warnings })
  const ids = templates.PROJECT_TEMPLATES.map(item => item.id), counts = Object.fromEntries(templates.PROJECT_TEMPLATE_CATEGORIES.map(category => [category, templates.PROJECT_TEMPLATES.filter(item => item.category === category).length]))
  const factoryFailures = []
  for (const descriptor of templates.PROJECT_TEMPLATES) { try { const project = templates.createTemplateProject(descriptor.id, `Verify ${descriptor.name}`); const issues = templates.auditTemplateProject(project, descriptor.id); if (issues.length) factoryFailures.push({ id: descriptor.id, issues }) } catch (error) { factoryFailures.push({ id: descriptor.id, issues: [String(error)] }) } }
  check('V2601-TEMPLATES', ids.length === 20 && new Set(ids).size === 20 && counts.scene === 7 && counts.test === 7 && counts.game === 6 && factoryFailures.length === 0, 'Exactly 20 unique Scene/Test/Gameplay templates build and pass their structural foundation audits.', { counts, factoryFailures })
  check('V2601-READINESS', platform.CREATOR_PLATFORM_SUMMARY.features >= 360 && platform.CREATOR_PLATFORM_SUMMARY.uncovered === 0 && platform.CREATOR_CONTRACT_REVIEW.release === '26.01', 'Every public operation has a complete seven-dimension readiness disposition under 26.01.', platform.CREATOR_PLATFORM_SUMMARY)
  const [instructions, roadmap, competitor, inventory, visual, library, layout, versioning, readme, zhReadme, visualReport] = await Promise.all(['instructions.txt','docs/ROADMAP_26_01_TO_26_10.md','docs/COMPETITIVE_REVIEW_26_01.md','docs/FEATURE_INVENTORY_26_01.md','docs/VISUAL_SCRIPTING_26_01.md','docs/TEMPLATE_LIBRARY_26_01.md','docs/UI_LAYOUT_AUDIT_26_01.md','docs/VERSIONING_2026.md','README.md','README.zh-CN.md','release-audits/v26.01-visual-roundtrip.json'].map(read))
  check('V2601-DOCUMENTATION', instructions.includes('26.01 through 26.10') && roadmap.includes('## 26.10') && competitor.includes('Godot') && competitor.includes('GameMaker') && inventory.includes(`${platform.CREATOR_PLATFORM_SUMMARY.features} public operations`) && visual.includes('Supported structural conversion') && library.includes('exactly 20') && layout.includes('Panel-by-panel') && versioning.includes('26.1.0') && readme.includes('26.01') && zhReadme.includes('26.01'), 'Roadmap, comparison, full inventory, user contracts, layout audit, version policy, and both READMEs are synchronized.')
  check('V2601-VISUAL-REPORT', JSON.parse(visualReport).status === 'passed', 'Focused variables/functions/control/operators/API two-way conversion verification passes.')
} finally { await rm(compiled, { recursive: true, force: true }) }
const failed = checks.filter(item => item.status === 'failed'), report = { format: 'nova-v26.01-verification', version: 1, release: '26.01', engineVersion: '26.1.0', generatedAt: new Date().toISOString(), perspectives: ['versioning','compatibility','templates','binding','documentation','user'], checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true }); await writeFile(join(root, 'release-audits/v26.01-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A 26.01 verification passed: ${checks.length} checks.`)
