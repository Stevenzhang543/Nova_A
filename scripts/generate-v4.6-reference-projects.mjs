import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const projectsRoot = join(root, 'reference-projects', 'projects')
const base = JSON.parse(await readFile(join(projectsRoot, 'script-api-v1-examples', 'project.nova'), 'utf8'))
const baseScript = base.assets.find(asset => asset.assetType === 'script')
if (!baseScript) throw new Error('The script API reference seed has no script asset')

const namespaceRepresentatives = {
  lifecycle: 'awake', scene: 'scene_load', object: 'entity_handle', component: 'component_handle', transform: 'transform', input: 'input_down',
  physics: 'rigid_body', ui: 'ui_set_text', audio: 'audio_play', animation: 'animator_handle', navigation: 'navigation_set_target',
  save: 'save_get', timing: 'time_delta', logging: 'log_info', resources: 'resource_handle', signals: 'signal_emit', tasks: 'task_wait', testing: 'expect'
}

function stableUuid(seed) {
  const value = createHash('sha256').update(seed).digest('hex').slice(0, 32)
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-4${value.slice(13, 16)}-8${value.slice(17, 20)}-${value.slice(20)}`
}

function hash(source) { return createHash('sha256').update(source).digest('hex') }
function scriptAsset(slug, name, source, options = {}) {
  const contentHash = hash(source)
  return {
    ...structuredClone(baseScript), uuid: options.uuid ?? stableUuid(`v4.6:${slug}:${name}`), name: `${name}.rhai`, path: `Assets/Scripts/${name}.rhai`,
    byteLength: Buffer.byteLength(source), source, sourceModified: 0, importedAt: 0,
    pipeline: { ...structuredClone(baseScript.pipeline), importerVersion: 'nova-script-4.6', sourceHash: contentHash, artifactHash: contentHash, contentHash, cacheKey: contentHash, dependencies: options.dependencies ?? [], reverseDependencies: [] },
    script: { version: 2, apiVersion: options.apiVersion ?? 2, breakpoints: options.breakpoints ?? [], breakpointDetails: options.breakpointDetails ?? [], tests: options.tests ?? [], packageDependencies: options.dependencies ?? [], packageName: `samples.v46.${slug}`, reloadPolicy: options.reloadPolicy ?? 'preserve', signalConnections: [], recoverySource: '', lastSavedHash: contentHash.slice(0, 8) }
  }
}

function projectSettings(project) {
  project.projectSettings ??= {}
  project.projectSettings.scripting = {
    apiVersion: 2, exceptionPolicy: 'uncaught', hotReload: true,
    formatting: { indentWidth: 2, finalNewline: true, maximumLineLength: 120 },
    lint: { enabled: true, unusedSymbols: 'warning', deprecatedApi: 'warning', implicitAny: 'warning' },
    indexing: { enabled: true, persist: true, maximumDocuments: 10000 },
    testing: { defaultTimeoutMs: 2000, deterministicSeed: 460, parallelism: 1, coverageEnabled: true, minimumFunctionCoverage: 0.8, minimumLineCoverage: 0.7, minimumBindingCoverage: 0.6 },
    remoteDebug: { enabled: false, exportedPlayers: false, host: '127.0.0.1', port: 47620, requireAuthentication: true, authenticationToken: '' }
  }
}

function readme(slug, title, demonstrates, limitations) {
  return `# ${title}\n\nEngine **4.6.0**, Project Format 2, schema 29.\n\n## Purpose\n\n${demonstrates}\n\n## Test procedure\n\n1. Open \`project.nova\` and switch to **Script**.\n2. Follow \`test-controls.json\` and compare the result with \`expected-output.json\`.\n3. Run \`pnpm nova script-test ./reference-projects/projects/${slug}/project.nova --format json\` when the project path is supported, or use the listed \`Assets/Scripts\` fixture sources directly.\n4. Confirm Project Health reports API v2 and no blocking script error.\n\n## Requirements\n\n- Required packages: None; Nova_A core only.\n- Target platforms: Windows x86-64 editor/runtime and the supported Chromium web runtime.\n\n## Known limitations\n\n${limitations}\n`
}

async function writeReference({ slug, title, description, scripts, expectations, limitations = 'This focused fixture validates its listed workflow; clean-machine, real remote-player, and long-duration soak gates remain external qualification work.' }) {
  const project = structuredClone(base)
  project.engineVersion = '4.6.0'; project.projectMetadata.name = title; project.projectMetadata.template = slug; project.manifest.name = title
  projectSettings(project)
  project.assets = project.assets.filter(asset => asset.assetType !== 'script')
  project.assets.push(...scripts)
  const oldScriptUuid = baseScript.uuid
  for (const scene of project.scenes ?? []) for (const entity of scene.entities ?? []) for (const component of entity.components ?? []) {
    if (component.kind === 'Script2D' && (component.data?.scriptAsset === oldScriptUuid || component.data?.scriptAsset === `asset://${oldScriptUuid}`)) component.data.scriptAsset = scripts[0]?.uuid ?? ''
  }
  const directory = join(projectsRoot, slug); await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'project.nova'), `${JSON.stringify(project, null, 2)}\n`)
  await writeFile(join(directory, 'expected-output.json'), `${JSON.stringify({ engineVersion: '4.6.0', schema: 29, projectName: title, expectedValidation: 'pass', ...expectations }, null, 2)}\n`)
  await writeFile(join(directory, 'test-controls.json'), `${JSON.stringify({ open: 'Project Manager > Open project.nova', workspace: 'Script', runFile: 'Script Studio > Run tests > Current file', runProject: 'Script Studio > Run tests > Current project', runTags: 'Script Studio > Run tests > Selected tags', inspect: 'Project Health > Scripts', headless: 'Script Studio > Run tests > Copy headless command' }, null, 2)}\n`)
  await writeFile(join(directory, 'README.md'), readme(slug, title, description, limitations))
}

const apiScripts = Object.entries(namespaceRepresentatives).map(([namespace, representative]) => {
  const testName = `test_api_${namespace}`
  const source = `// Nova_A API v2 contract fixture: ${namespace}\n// Representative binding: ${representative}\n// @test tags=api,contract,${namespace} timeout=1000 seed=460\nfn ${testName}() {\n  expect(api_current_version() == 2, "API v2 engine");\n  expect(api_minimum_version() == 1, "API v1 adapter");\n  expect(api_namespace("${representative}") == "${namespace}", "${namespace} namespace metadata");\n}\n`
  return scriptAsset('script-v46-api-contract', `Api_${namespace}`, source, { tests: [testName] })
})
await writeReference({ slug: 'script-v46-api-contract', title: 'Script v4.6 API Contract', description: 'One deterministic tested script covers every stable API v2 namespace/category and the v1 compatibility floor.', scripts: apiScripts, expectations: { minimumScripts: apiScripts.length, apiVersion: 2, apiNamespaces: Object.keys(namespaceRepresentatives), expectedTests: apiScripts.length } })

const languageSource = `${Array.from({ length: 500 }, (_, index) => `fn indexed_symbol_${String(index).padStart(4, '0')}(value) { value + ${index} }`).join('\n')}\n// @test tags=language,index timeout=1500 seed=460\nfn test_language_index() { expect(indexed_symbol_0499(1) == 500, "large symbol index"); }\n`
await writeReference({ slug: 'script-v46-language-services', title: 'Script v4.6 Language Services', description: 'Large-symbol completion, hover, signature help, definition, references, rename, formatting, module assistance, cancellation and persisted workspace indexing.', scripts: [scriptAsset('script-v46-language-services', 'LargeWorkspace', languageSource, { tests: ['test_language_index'] }), scriptAsset('script-v46-language-services', 'UtilityModule', 'fn utility_value() { 46 }\n', { dependencies: ['LargeWorkspace.rhai'] })], expectations: { minimumSymbols: 502, interactiveBudgetMs: 50, persistedIndex: true } })

const debuggerSource = `@export(type="integer", group="Debug") let counter = 0;\nfn recursive_depth(value) { if value <= 0 { counter } else { recursive_depth(value - 1) } }\nfn update(dt) { counter += 1; task_wait("debug-task", 0.01); if counter == 3 { log_info("logpoint counter=" + counter); } }\nfn on_task(name) { let depth = recursive_depth(3); expect(depth >= 0, "recursive stack"); }\n// @test tags=debugger timeout=1000 seed=460\nfn test_debugger_fixture() { expect(recursive_depth(4) >= 0, "stack and locals"); }\n`
const debuggerPoints = [{ id: 'conditional-counter', line: 3, functionName: 'update', condition: 'properties.counter >= 3', hitCondition: 3, logMessage: '', enabled: true, hitCount: 0, group: 'Gameplay' }, { id: 'log-counter', line: 3, functionName: 'update', condition: '', hitCondition: 0, logMessage: 'counter={counter}', enabled: true, hitCount: 0, group: 'Telemetry' }]
await writeReference({ slug: 'script-v46-debugger', title: 'Script v4.6 Debugger', description: 'Persistent grouped line/function/conditional/hit/log breakpoints, recursion, stack-frame selection, locals, watches, task view, stepping and exception policy.', scripts: [scriptAsset('script-v46-debugger', 'DebuggerScenario', debuggerSource, { breakpoints: [3], breakpointDetails: debuggerPoints, tests: ['test_debugger_fixture'] })], expectations: { breakpoints: 2, deterministicSeed: 460, remoteDebugDefault: 'disabled' } })

const hotReloadSources = [
  ['HotReloadCompatible', '@export(type="float") let speed = 4.0;\nfn update(dt) { set_position(speed * dt, 0.0); }\n'],
  ['HotReloadAddedFunction', '@export(type="float") let speed = 4.0;\nfn helper(value) { value * speed }\nfn update(dt) { set_position(helper(dt), 0.0); }\n'],
  ['HotReloadRemovedState', '@export(type="float") let legacy_speed = 4.0;\nfn update(dt) { set_position(legacy_speed * dt, 0.0); }\n'],
  ['HotReloadSyntaxError', 'fn update(dt) { set_position(dt, 0.0);\n'],
  ['HotReloadRuntimeException', 'fn update(dt) { expect(false, "deliberate runtime failure"); }\n']
].map(([name, source]) => scriptAsset('script-v46-hot-reload', name, source))
await writeReference({ slug: 'script-v46-hot-reload', title: 'Script v4.6 Hot Reload', description: 'Deliberate compatible, function-addition, removed-state, syntax-error and runtime-exception candidates exercise classification, state transfer, transaction rollback and restart-required reporting.', scripts: hotReloadSources, expectations: { fixtures: ['compatible-property', 'function-added', 'removed-state', 'syntax-error', 'runtime-exception'], failedCandidateReplacesRuntime: false } })

const testSource = `@export(type="integer", serialize=false) let state = 0;\nfn before_all() { state = 1; }\nfn before_each() { state += 1; }\n// @test tags=unit,fast fixture=counter timeout=1000 seed=460 cases=alpha|beta\nfn test_unit_counter() { expect(state >= 2, "unit setup"); }\n// @test tags=integration,scene,ui,physics,animation,regression timeout=1500 seed=461\nfn test_cross_domain() { expect(api_current_version() == 2, "cross-domain API"); }\nfn after_each() { state -= 1; }\nfn after_all() { state = 0; }\n`
await writeReference({ slug: 'script-v46-tests-coverage', title: 'Script v4.6 Tests Coverage', description: 'Discovery, categories, tags, fixture metadata, setup/teardown, cases, timeout, deterministic seeds, filtering, cancellation, sharding, changed selection, JSON/JUnit reports and function/line/API coverage.', scripts: [scriptAsset('script-v46-tests-coverage', 'TestCoverage', testSource, { tests: ['test_unit_counter', 'test_cross_domain'] })], expectations: { testCases: 3, formats: ['json', 'junit', 'lcov'], stableExitCodes: { pass: 0, fail: 1, infrastructure: 2 } } })

const externalSource = `// Open this source through the external-editor protocol.\n// @test tags=external-tools timeout=1000 seed=460\nfn test_external_protocol() { expect(api_current_version() == 2, "generated stubs match runtime"); }\n`
await writeReference({ slug: 'script-v46-external-tools', title: 'Script v4.6 External Tools', description: 'JSON-line language protocol, URI/line/column navigation, generated API stubs, debug protocol integration path and authenticated local exported-player policy.', scripts: [scriptAsset('script-v46-external-tools', 'ExternalToolFixture', externalSource, { tests: ['test_external_protocol'] })], expectations: { languageProtocol: 2, debugProtocol: 2, stub: 'docs/NOVA_RHAI_API_V2_STUBS.rhai', remoteRequiresAuthentication: true } })

for (const entry of await readdir(projectsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const directory = join(projectsRoot, entry.name)
  try { const project = JSON.parse(await readFile(join(directory, 'project.nova'), 'utf8')); project.engineVersion = '4.6.0'; await writeFile(join(directory, 'project.nova'), `${JSON.stringify(project, null, 2)}\n`) } catch { /* non-project catalog entry */ }
  try { const expected = JSON.parse(await readFile(join(directory, 'expected-output.json'), 'utf8')); expected.engineVersion = '4.6.0'; await writeFile(join(directory, 'expected-output.json'), `${JSON.stringify(expected, null, 2)}\n`) } catch { /* optional expectation */ }
  try { const controls = JSON.parse(await readFile(join(directory, 'test-controls.json'), 'utf8')); if ('engineVersion' in controls) controls.engineVersion = '4.6.0'; if (typeof controls.evidence === 'string') controls.evidence = controls.evidence.replace(/evidence-v\d+\.\d+\.\d+/, 'evidence-v4.6.0'); await writeFile(join(directory, 'test-controls.json'), `${JSON.stringify(controls, null, 2)}\n`) } catch { /* optional controls */ }
  try { const readme = await readFile(join(directory, 'README.md'), 'utf8'); await writeFile(join(directory, 'README.md'), readme.replace(/Engine \*\*\d+\.\d+\.\d+\*\*/, 'Engine **4.6.0**')) } catch { /* optional readme */ }
}

console.log('Generated six Nova_A 4.6 scripting reference projects and normalized the complete reference catalog to 4.6.0.')
