import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const failures = []
const assert = (condition, message) => { if (!condition) failures.push(message) }
const read = path => readFile(join(root, path), 'utf8')

const [pkg, projectFormat, rustFormat, tauri, contracts, app, crash, faults, translations, packages, templates, cli] = await Promise.all([
  read('package.json').then(JSON.parse), read('src/projects/projectFormat.ts'), read('crates/nova_format/src/lib.rs'), read('src-tauri/tauri.conf.json').then(JSON.parse),
  read('src/runtime/stableContracts.ts'), read('src/App.vue'), read('src/runtime/crashReporter.ts'), read('src/runtime/faultCenter.ts'), read('src/i18n.ts'), read('src/runtime/packages.ts'), read('src/projects/templates.ts'), read('scripts/nova-export.mjs')
])

assert(pkg.version === '3.2.0' && tauri.version === '3.2.0', 'Application/Tauri version is not 3.2.0.')
assert(projectFormat.includes("NOVA_ENGINE_VERSION = '3.2.0'") && projectFormat.includes('NOVA_PROJECT_SCHEMA_VERSION = 23') && projectFormat.includes('NOVA_MINIMUM_SCHEMA_VERSION = 5'), 'TypeScript format authority must expose schema 23 / schemas 5–23 / engine 3.2.0.')
assert(rustFormat.includes('CURRENT_ENGINE_VERSION: &str = "3.2.0"') && rustFormat.includes('CURRENT_FORMAT_VERSION: u32 = 23') && rustFormat.includes('MINIMUM_SUPPORTED_FORMAT_VERSION: u32 = 5'), 'Rust format authority does not match the v3.2 data contract.')
for (const value of ['NOVA_RUNTIME_API_VERSION = 1', 'NOVA_PLUGIN_API_VERSION = 2', 'NOVA_PACKAGE_MANIFEST_VERSION = 1', 'NOVA_BUILD_CLI_VERSION = 1']) assert(contracts.includes(value), `Stable contract missing ${value}.`)
assert(cli.includes("const ENGINE_VERSION = '3.2.0'") && cli.includes("['windows', 'linux', 'macos', 'web']"), 'Build CLI 1 is not current or lacks the documented targets.')

for (const component of ['ErrorRecovery', 'StudioStatusDialog']) assert(app.includes(`<${component}`), `${component} is not mounted globally.`)
assert(crash.includes("addEventListener('error'") && crash.includes("addEventListener('unhandledrejection'") && crash.includes('ResizeObserver loop'), 'Global fault capture/filtering is incomplete.')
for (const value of ['recent.length > 64', 'isExpectedCancellation', 'reportRecoverableError', 'reportFatalError']) assert(faults.includes(value), `Fault center is missing ${value}.`)

const newKeys = ['studioStatus', 'compatibilityPromise', 'fatalErrorTitle', 'copyDiagnostics', 'restartSafeMode', 'atlasRebuildFailed']
for (const key of newKeys) assert((translations.match(new RegExp(`${key}:`, 'g')) ?? []).length >= 3, `Localization key ${key} is not present in EN/DE/ZH.`)
assert(!/\b(?:window\.)?(?:confirm|prompt|alert)\s*\(/.test((await collectSources(join(root, 'src'))).map(item => item.source).join('\n')), 'A browser confirm/prompt/alert call remains in the application.')

const inputs = JSON.parse(await read('tests/fixtures/migrations/public-schema-inputs.json'))
const expected = JSON.parse(await read('tests/fixtures/migrations/public-schema-expected.json'))
assert(JSON.stringify(inputs.publicSchemas) === JSON.stringify(Array.from({ length: 19 }, (_, index) => index + 5)), 'Migration golden inputs do not cover every schema 5–23.')
assert(expected.targetSchema === 23 && expected.targetEngine === '3.2.0', 'Migration golden output is not schema 23 / engine 3.2.0.')
assert(rustFormat.includes('every_public_schema_matches_the_v3_golden_projection') && rustFormat.includes('corrupted_input_fuzz_cases_never_panic'), 'Rust golden migration/corruption tests are missing.')

for (const kind of ['Light2D', 'ShadowCaster2D', 'TileMap2D', 'Animator', 'AudioSource', 'TextInput', 'ParticleEmitter2D', 'DistanceJoint2D']) assert(templates.includes(`'${kind}'`), `Reference templates do not exercise ${kind}.`)
for (const project of ['empty', 'platformer', 'top-down', 'physics-sandbox', 'ui-showcase', 'networked-optional']) assert(existsSync(join(root, 'reference-projects', 'projects', `${project}.nova`)), `Generated reference project ${project}.nova is missing.`)
assert(existsSync(join(root, 'reference-projects', 'plugins', 'hello-plugin', 'plugin.json')) && existsSync(join(root, 'reference-projects', 'plugins', 'hello-plugin', 'hello-plugin.wasm')), 'Plugin API 2 reference package is missing.')
assert(packages.includes("engine: '>=2.9.0 <4.0.0'") && packages.includes("engineVersion = '3.2.0'"), 'Official optional packages are not compatible with the v3 engine range.')

for (const document of ['STABLE_CONTRACTS.md', 'COMPATIBILITY.md', 'BENCHMARKS.md', 'STABILITY.md', 'PLATFORM_VERIFICATION.md', 'KNOWN_LIMITATIONS.md']) assert(existsSync(join(root, 'docs', document)), `Required v3 document ${document} is missing.`)
for (const workflow of ['release-matrix.yml', 'stability-24h.yml']) assert(existsSync(join(root, '.github', 'workflows', workflow)), `Qualification workflow ${workflow} is missing.`)
for (const command of ['audit:typography', 'benchmark:v3', 'stability:v3', 'references']) assert(typeof pkg.scripts[command] === 'string', `Package command ${command} is missing.`)

const vueSources = (await collectSources(join(root, 'src'))).filter(item => item.path.endsWith('.vue'))
let controls = 0
for (const { path, source } of vueSources) {
  for (const match of source.matchAll(/<(button|input|select|textarea)\b([^>]*)>/g)) {
    controls++
    const [, kind, attributes] = match
    const bound = /(?:v-model|@click|@change|@input|@keydown|@keyup|@drop|:value|:checked|\breadonly\b|\bdisabled\b|\bv-for\b|type\s*=\s*["'](?:submit|file)["'])/.test(attributes)
    assert(bound || (kind === 'input' && /type\s*=\s*["']hidden["']/.test(attributes)), `${relative(root, path)} has an apparently unbound <${kind}> control.`)
  }
}
assert(controls >= 300, `Only ${controls} controls were audited; expected the complete editor surface.`)

if (failures.length) {
  console.error(`Nova_A v3 audit failed (${failures.length}):\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log(`Nova_A v3 audit passed: frozen contracts, all public migration goldens, fault containment, ${controls} visible controls, tri-lingual v3 UI, references, evidence tooling, limitations, and platform workflows.`)

async function collectSources(directory) {
  const result = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) result.push(...await collectSources(path))
    else if (/\.(?:ts|vue|css)$/.test(entry.name)) result.push({ path, source: await readFile(path, 'utf8') })
  }
  return result
}
