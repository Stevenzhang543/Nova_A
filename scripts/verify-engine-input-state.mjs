/** Real Input Owners, unchanged consumers and explicit Vue bootstrap; no platform/GUI qualification. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash, webcrypto } from 'node:crypto'
import { createRequire } from 'node:module'
import { build } from 'vite'
import vuePlugin from '@vitejs/plugin-vue'
import ts from 'typescript'

const root = resolve(process.cwd()), before = process.argv.includes('--before'), stage = before ? 'before' : 'after'
const directory = join(root, '.cache/engine-overhaul/input-state'), temporary = await mkdtemp(join(tmpdir(), 'nova-input-state-'))
const files = ['src/runtime/deviceInput.ts', 'src/runtime/inputModality.ts']
const normalize = value => value.replaceAll('\\', '/'), hash = value => createHash('sha256').update(value).digest('hex')
const vueEntry = normalize(join(dirname(createRequire(import.meta.url).resolve('vue/package.json')), 'dist/vue.runtime.esm-bundler.js'))
const serverRendererEntry = normalize(createRequire(import.meta.url).resolve('vue/server-renderer'))
const checks = [], originals = new Map(), sourceHashes = {}, moduleGraphs = {}, sourceGraphs = {}, behavior = {}
const check = (name, operation) => { operation(); checks.push(name) }
let passed = false
if (!globalThis.crypto) globalThis.crypto = webcrypto
for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) if (!(name in globalThis)) globalThis[name] = class {}
let gamepads = [], reads = 0
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => { reads++; return gamepads }, maxTouchPoints: 0, platform: 'Win32', userAgent: 'Nova actual Input state integration' } })
try {
  const manifest = JSON.parse(await readFile(join(directory, 'before/.cache_engine-overhaul_profile-dist_engine-build-manifest.json'), 'utf8'))
  for (const file of files) {
    const saved = await readFile(join(directory, 'before', file.replaceAll('/', '_')), 'utf8')
    originals.set(normalize(join(root, file)), saved)
    sourceHashes[file] = hash(before ? saved : await readFile(join(root, file)))
    check('before-source-matches-frozen-0e471-manifest:' + file, () => assert.equal(hash(saved), manifest.source.find(item => item.path === file).sha256))
  }
  const entry = join(temporary, 'entry.ts')
  await writeFile(entry, `export * as device from '${normalize(join(root, files[0]))}';\nexport * as prompts from '${normalize(join(root, files[1]))}';\nexport * as input from '${normalize(join(root, 'src/runtime/input.ts'))}';\n` +
    `export { GameUiRuntime } from '${normalize(join(root, 'src/runtime/gameUi.ts'))}';\nexport { BoxEntity } from '${normalize(join(root, 'src/world/BoxEntity.ts'))}';\nexport { RectTransform, Text } from '${normalize(join(root, 'src/world/components.ts'))}';\n` +
    `export { default as VirtualControlsOverlay } from '${normalize(join(root, 'src/components/VirtualControlsOverlay.vue'))}';\nexport { default as DeviceInputPanel } from '${normalize(join(root, 'src/components/DeviceInputPanel.vue'))}';\n` +
    `export { reactive, toRaw, isReactive, watch, createSSRApp } from '${vueEntry}';\nexport { renderToString } from '${serverRendererEntry}';\n` +
    (!before ? `export { installInputStateAdapter } from '${normalize(join(root, 'src/runtime/inputStateAdapter.ts'))}';\nexport { installEditorInputState } from '${normalize(join(root, 'src/editor/inputStateAdapter.ts'))}';` : ''))
  const originalPlugin = { name: '0e471-input-originals', enforce: 'pre', load(id) { return originals.get(normalize(id)) } }
  await build({ configFile: false, root, logLevel: 'error', resolve: { alias: [{ find: /^vue$/, replacement: vueEntry }] }, ssr: { noExternal: true }, plugins: [vuePlugin(), ...(before ? [originalPlugin] : [])], build: { ssr: true, outDir: temporary, emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'integration.mjs', inlineDynamicImports: true } } } })
  const api = await import(pathToFileURL(join(temporary, 'integration.mjs')).href)
  const states = owner => [owner.device.deviceInputSettings, owner.device.deviceSensorState, owner.device.deviceRuntimeState, owner.prompts.inputPromptState]
  const raw = states(api).map(api.toRaw), defaults = states(api).map(value => JSON.parse(JSON.stringify(value)))
  check('four-single-Owners-with-original-defaults-and-host-mode', () => { states(api).forEach(state => assert.equal(api.isReactive(state), before)); assert.equal(raw[0].sensorFrequency, 30); assert.equal(raw[0].referenceDpi, 160); assert.equal(raw[1].permission, 'not-requested'); assert.equal(raw[2].capabilities.devicePixelRatio, 1); assert.equal(raw[3].promptStyle, 'compact') })
  const originalNested = [raw[0].customSafeArea, raw[0].gamepadCalibrations, raw[0].virtualControls, raw[1].orientation, raw[2].capabilities, raw[2].capabilities.safeArea]
  if (!before) {
    const fresh = async name => { const path = join(temporary, name + '.mjs'); await writeFile(path, await readFile(join(temporary, 'integration.mjs'))); return import(pathToFileURL(path).href) }
    check('factory-throw-does-not-publish-partial-state', () => { let calls = 0; assert.throws(() => api.installInputStateAdapter({ wrap: target => { if (++calls === 3) throw Error('third view failed'); return api.reactive(target) }, unwrap: api.toRaw }), /third view failed/); assert.equal(calls, 3); states(api).forEach((state, index) => assert.equal(state, raw[index])) })
    check('unwrap-validation-throw-releases-all-reservations', () => { assert.throws(() => api.installInputStateAdapter({ wrap: api.reactive, unwrap() { throw Error('unwrap failed') } }), /unwrap failed/); states(api).forEach((state, index) => assert.equal(state, raw[index])); assert.equal(api.device.isDeviceInputStateAdapterInstalled(), false); assert.equal(api.prompts.isInputPromptStateAdapterInstalled(), false) })
    check('cloned-root-and-invalid-views-are-rejected-without-publish', () => { for (const wrap of [target => ({ ...target }), () => null, () => Promise.resolve({})]) { assert.throws(() => api.installInputStateAdapter({ wrap, unwrap: api.toRaw }), /same raw Owner/); states(api).forEach((state, index) => assert.equal(state, raw[index])) } })
    check('nested-clone-is-rejected-without-publish', () => { const wrap = target => new Proxy(target, { get(object, key) { return key === 'customSafeArea' ? { ...object[key] } : Reflect.get(object, key) } }); assert.throws(() => api.installInputStateAdapter({ wrap, unwrap: view => view === raw[0] ? view : raw.find(target => Object.getPrototypeOf(view) === Object.getPrototypeOf(target) && Reflect.ownKeys(view).join() === Reflect.ownKeys(target).join()) ?? view }), /same raw Owner/); states(api).forEach((state, index) => assert.equal(state, raw[index])) })
    check('reentrant-install-poisons-outer-attempt-even-if-factory-catches', () => { let attempted = false; assert.throws(() => api.installInputStateAdapter({ wrap: target => { if (!attempted) { attempted = true; assert.throws(() => api.installEditorInputState(), /reentrant/); } return api.reactive(target) }, unwrap: api.toRaw }), /reentrant/); states(api).forEach((state, index) => assert.equal(state, raw[index])) })
    const conflict = await fresh('prior-module-bootstrap')
    check('independent-bootstrap-is-explicitly-rejected-by-aggregate-preflight', () => { const lease = conflict.prompts.reserveInputPromptStateAdapter(); lease.commit(conflict.reactive(lease.target)); let calls = 0; assert.throws(() => conflict.installInputStateAdapter({ wrap: target => { calls++; return conflict.reactive(target) }, unwrap: conflict.toRaw }), /independent module bootstrap/); assert.equal(calls, 0); assert(conflict.isReactive(conflict.prompts.inputPromptState)); states(conflict).slice(0, 3).forEach(state => assert.equal(conflict.isReactive(state), false)); assert.throws(() => lease.commit(lease.target), /expired/); lease.release(); lease.release() })
    const reserved = await fresh('reserved-module-bootstrap')
    check('active-device-reservation-blocks-aggregate-until-explicit-release', () => { const lease = reserved.device.reserveDeviceInputStateAdapter(); assert.throws(() => reserved.installEditorInputState(), /independent module bootstrap/); states(reserved).forEach(state => assert.equal(reserved.isReactive(state), false)); lease.release(); lease.release(); assert.throws(() => lease.commit(lease.targets), /expired/); reserved.installEditorInputState(); states(reserved).forEach(state => assert.equal(reserved.isReactive(state), true)) })
    api.installEditorInputState()
    check('Editor-installs-identical-raw-and-nested-Owners-before-watchers', () => { states(api).forEach((state, index) => { assert(api.isReactive(state)); assert.equal(api.toRaw(state), raw[index]); assert.deepEqual(JSON.parse(JSON.stringify(state)), defaults[index]) }); const nested = [api.device.deviceInputSettings.customSafeArea, api.device.deviceInputSettings.gamepadCalibrations, api.device.deviceInputSettings.virtualControls, api.device.deviceSensorState.orientation, api.device.deviceRuntimeState.capabilities, api.device.deviceRuntimeState.capabilities.safeArea]; nested.forEach((value, index) => { assert(api.isReactive(value)); assert.equal(api.toRaw(value), originalNested[index]) }) })
    const installed = states(api)
    check('repeat-install-does-not-rewrap-or-call-new-factory', () => { api.installInputStateAdapter({ wrap() { throw Error('must not execute') }, unwrap() { throw Error('must not execute') } }); api.installEditorInputState(); states(api).forEach((state, index) => assert.equal(state, installed[index])) })
  }
  check('Input-public-reexport-retains-live-state-and-function-identities', () => { assert.equal(api.input.inputPromptState, api.prompts.inputPromptState); assert.equal(api.input.setInputModality, api.prompts.setInputModality); assert.equal(api.input.inputPromptForAction, api.prompts.inputPromptForAction) })
  const observed = { safeArea: [], controls: [], sensor: [], touch: [], prompt: [], layout: [] }
  const disposers = [api.watch(() => api.device.deviceInputSettings.customSafeArea.left, value => observed.safeArea.push(value), { flush: 'sync' }), api.watch(() => api.device.deviceInputSettings.virtualControls.length, value => observed.controls.push(value), { flush: 'sync' }), api.watch(() => api.device.deviceSensorState.orientation[0], value => observed.sensor.push(value), { flush: 'sync' }), api.watch(() => api.device.deviceRuntimeState.capabilities.touch, value => observed.touch.push(value), { flush: 'sync' }), api.watch(() => api.prompts.inputPromptState.modality, value => observed.prompt.push(value), { flush: 'sync' }), api.watch(() => api.prompts.inputPromptState.gamepadLayout, value => observed.layout.push(value), { flush: 'sync' })]
  const fixture = { virtualControlsEnabled: true, showVirtualControls: 'always', safeAreaMode: 'custom', customSafeArea: { left: 17, top: -8, right: 4, bottom: 9 }, referenceDpi: 2000, sensorFrequency: 999, virtualControls: [{ id: 'jump', action: 'Jump', accessibleLabel: ' Jump without sight ', label: 'Jump', size: 68 }], gamepadCalibrations: [{ deviceId: '*', axis: 0, minimum: -1, center: 0, maximum: 1, deadzone: .2, invert: true }, { deviceId: '*', axis: 0, minimum: -1, center: 0, maximum: 1 }, { deviceId: 'Sony', axis: 0, minimum: -1, center: 0, maximum: 1, deadzone: 0, invert: false }] }
  const normalized = api.device.normalizeDeviceInputSettings(fixture)
  api.device.loadDeviceInputSettings(fixture)
  behavior.settings = api.device.serializeDeviceInputSettings()
  check('normalize-load-save-format-and-original-root-Owner-retained', () => { assert.deepEqual(behavior.settings, normalized); assert.equal(api.toRaw(api.device.deviceInputSettings), raw[0]); assert.equal(normalized.sensorFrequency, 120); assert.equal(normalized.referenceDpi, 1200); assert.equal(normalized.gamepadCalibrations.length, 2); assert.equal(normalized.virtualControls[0].accessibleLabel, 'Jump without sight'); assert.deepEqual(normalized.customSafeArea, { left: 17, top: 0, right: 4, bottom: 9 }); behavior.settings.virtualControls[0].label = 'detached'; assert.equal(api.device.deviceInputSettings.virtualControls[0].label, 'Jump'); behavior.settings = api.device.serializeDeviceInputSettings() })
  api.device.deviceSensorState.orientation[0] = 90; api.device.deviceSensorState.permission = 'granted'; api.device.deviceRuntimeState.capabilities.touch = true
  check('actual-nested-Vue-watchers-observe-original-functions-and-state-writes', () => { assert.deepEqual(observed.safeArea, [17]); assert.deepEqual(observed.controls, [1]); assert.deepEqual(observed.sensor, [90]); assert.deepEqual(observed.touch, [true]); assert.equal(api.device.sensorValue('tilt-y'), .5); api.device.deviceSensorState.permission = 'denied'; assert.equal(api.device.sensorValue('tilt-y'), 0) })
  check('unchanged-calibration-and-sensor-sampling-gates', () => { assert.equal(api.device.applyGamepadAxisCalibration(.6, 'Sony', 0), .6); assert(Math.abs(api.device.applyGamepadAxisCalibration(.6, 'other', 0) + .5) < 1e-12); assert.equal(api.device.applyGamepadAxisCalibration(.1, 'other', 0), 0); assert.equal(api.device.applyGamepadAxisCalibration(NaN, 'other', 0), 0); assert.equal(api.device.sensorSampleDue(0, 8, 120), false); assert.equal(api.device.sensorSampleDue(0, 8.34, 120), true) })
  const mixed = [api.input.createInputAction('Jump', 'button', [api.input.createInputBinding('physical-key', 'Space'), api.input.createInputBinding('gamepad-button', '0')])]
  api.prompts.setInputModality('gamepad', 'Sony DualSense'); const changedAt = api.prompts.inputPromptState.changedAt
  const sony = api.prompts.inputPromptForAction('Jump', mixed); api.prompts.setInputModality('gamepad', 'Nintendo Switch')
  check('prompt-layout-change-keeps-modality-clock-and-real-binding-fallback', () => { assert.equal(sony.symbol, '✕'); assert.equal(api.prompts.inputPromptForAction('Jump', mixed).symbol, 'B'); assert.equal(api.prompts.inputPromptState.changedAt, changedAt); assert.deepEqual(observed.prompt, ['gamepad']); assert.deepEqual(observed.layout, ['playstation', 'nintendo']); assert.equal(api.prompts.inputPromptForAction('Jump', [mixed[0]], 'keyboard').symbol, 'Space'); const fallback = api.prompts.inputPromptForAction('Only', [api.input.createInputAction('Only', 'button', [api.input.createInputBinding('physical-key', 'Space')])], 'mouse'); assert.equal(fallback.modality, 'keyboard'); assert.equal(api.prompts.inputPromptForAction('Missing', []).accessibleLabel, 'Missing: unbound') })
  behavior.prompt = { sony, nintendo: api.prompts.inputPromptForAction('Jump', mixed) }
  const manager = new api.input.InputManager(), axis = api.input.createInputAction('Aim', 'axis', [{ ...api.input.createInputBinding('gamepad-axis', '0'), deadzone: 0 }])
  api.prompts.setInputModality('mouse'); gamepads = [{ id: 'Sony', index: 0, connected: true, mapping: 'standard', axes: [.6], buttons: [], timestamp: 1 }]; reads = 0
  behavior.axis = manager.sample([axis]).axes.Aim
  check('actual-InputManager-consumes-shared-calibration-and-prompt-Owner-once', () => { assert.equal(behavior.axis, .6); assert.equal(reads, 1); assert.equal(api.input.inputPromptState.modality, 'gamepad'); assert.equal(api.input.inputPromptState.gamepadLayout, 'playstation') }); gamepads = []
  const entity = new api.BoxEntity(1, { x: 0, y: 0 }, { x: 1, y: 1 }), rect = new api.RectTransform(), text = new api.Text()
  text.inputPromptAction = 'Jump'; text.wrap = 'None'; text.overflow = 'Visible'; entity.addComponent(rect); entity.addComponent(text)
  const draws = [], context = new Proxy({ canvas: { width: 640, height: 480 }, measureText: value => ({ width: value.length * 7 }), fillText: value => draws.push(value) }, { get: (target, key) => key in target ? target[key] : () => {} })
  const hud = new api.GameUiRuntime(); hud.setInputActions(mixed); hud.render(context, 640, 480, [entity]); api.prompts.inputPromptState.promptStyle = 'label'; hud.render(context, 640, 480, [entity])
  behavior.hud = draws
  check('real-GameUi-render-consumes-device-prompt-and-live-style', () => assert.deepEqual(draws, ['[✕] Jump', 'Jump (✕)']))
  const render = component => { const app = api.createSSRApp(component); app.config.warnHandler = () => {}; return api.renderToString(app) }
  const overlay = await render(api.VirtualControlsOverlay), panel = await render(api.DeviceInputPanel)
  behavior.ssr = { overlayAccessible: overlay.includes('aria-label="Jump without sight"'), overlaySafe: overlay.includes('right:28px'), panelDevice: panel.includes('landscape'), panelStudio: panel.includes('device-studio') }
  check('actual-Editor-consumer-setup-renders-shared-settings-and-device-view', () => assert.deepEqual(behavior.ssr, { overlayAccessible: true, overlaySafe: true, panelDevice: true, panelStudio: true }))
  disposers.forEach(dispose => dispose())
  if (!before) {
    const baseline = JSON.parse(await readFile(join(directory, 'before.json'), 'utf8'))
    check('actual-before-after-behavior-results-identical', () => assert.deepEqual(behavior, baseline.behavior))
    for (const file of files) {
      const saved = ts.createSourceFile(file, originals.get(normalize(join(root, file))), ts.ScriptTarget.Latest, true), current = ts.createSourceFile(file, await readFile(join(root, file), 'utf8'), ts.ScriptTarget.Latest, true)
      const functions = syntax => { const results = []; const visit = node => { if (ts.isFunctionLike(node) && node.body) results.push(node.getText(syntax)); ts.forEachChild(node, visit) }; visit(syntax); return results }
      check('every-original-function-method-and-arrow-expression-byte-exact:' + file, () => { const now = new Set(functions(current)); for (const value of functions(saved)) assert(now.has(value), value.slice(0, 140)) })
      const variables = syntax => new Map(syntax.statements.filter(ts.isVariableStatement).flatMap(node => node.declarationList.declarations.map(item => [item.name.getText(syntax), item])))
      const names = file.endsWith('deviceInput.ts') ? ['deviceInputSettings', 'deviceSensorState', 'deviceRuntimeState'] : ['inputPromptState']
      check('every-state-field-and-default-initializer-byte-exact:' + file, () => { for (const name of names) assert.equal(variables(current).get(name).initializer.getText(current), variables(saved).get(name).initializer.arguments[0].getText(saved), name) })
      const exports = syntax => syntax.statements.filter(node => node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)).flatMap(node => node.name ? [node.name.text] : ts.isVariableStatement(node) ? node.declarationList.declarations.map(item => item.name.text) : [])
      check('every-original-public-export-retained:' + file, () => { const now = new Set(exports(current)); for (const name of exports(saved)) assert(now.has(name), name) })
    }
    for (const file of ['src/runtime/input.ts', 'src/runtime/GameplayRuntimeCore.ts']) assert.equal(hash(await readFile(join(root, file))), hash(await readFile(join(directory, 'before', file.replaceAll('/', '_')))), file)
    checks.push('Core-and-Input-implementation-unchanged-by-slice')
    for (const path of ['src/runtime/inputStateAdapter.ts', ...files, 'src/runtime/input.ts']) {
      const modules = new Set()
      await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, plugins: [{ name: 'input-production-graph', generateBundle() { for (const id of this.getModuleIds()) modules.add(normalize(id)) } }], build: { ssr: true, outDir: join(temporary, 'graph-' + path.split('/').at(-1)), emptyOutDir: true, rollupOptions: { input: join(root, path) } } })
      const forbidden = [...modules].filter(id => /\/src\/(?:editor|store|assets)\/|\/node_modules\/(?:\.pnpm\/(?:vue@|@vue\+|pinia@)|vue\/|@vue\/|pinia\/)/.test(id))
      moduleGraphs[path] = { modules: [...modules].filter(id => id.startsWith(normalize(root))).map(id => id.slice(root.length + 1)), forbidden }
      check('compiled-real-entry-has-zero-Editor-Vue:' + path, () => assert.deepEqual(forbidden, []))
      const config = ts.readConfigFile(join(root, 'tsconfig.json'), ts.sys.readFile), options = ts.parseJsonConfigFileContent(config.config, ts.sys, root).options
      const pending = [join(root, path)], visited = new Set(), invalid = [], edges = []
      for (let cursor = 0; cursor < pending.length; cursor++) {
        const file = pending[cursor]; if (visited.has(file)) continue; visited.add(file)
        const syntax = ts.createSourceFile(file, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true), references = new Set()
        const visit = node => { if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) references.add(node.moduleSpecifier.text); if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteralLike(node.argument.literal)) references.add(node.argument.literal.text); ts.forEachChild(node, visit) }; visit(syntax)
        for (const specifier of references) { const resolution = ts.resolveModuleName(specifier, file, options, ts.sys).resolvedModule, target = resolution ? normalize(resolve(resolution.resolvedFileName)) : null; const edge = { from: normalize(file).slice(root.length + 1), specifier, target }; edges.push(edge); if (/^(?:vue|@vue\/|pinia)/.test(specifier) || target && /\/src\/(?:editor|store|components|layout|ui)\/|\/src\/assets\/(?:AssetDatabase|importPipeline)\./.test(target)) invalid.push(edge); else if (target?.startsWith(normalize(root) + '/src/')) pending.push(target); else if (!resolution && specifier.startsWith('.')) invalid.push({ ...edge, unresolved: true }) }
      }
      sourceGraphs[path] = { modules: [...visited].map(file => normalize(file).slice(root.length + 1)), edges, forbiddenOrUnresolved: invalid }
      check('source-type-graph-has-zero-Editor-Vue:' + path, () => assert.deepEqual(invalid, []))
    }
    const config = ts.readConfigFile(join(root, 'tsconfig.json'), ts.sys.readFile), options = ts.parseJsonConfigFileContent(config.config, ts.sys, root).options
    const owned = [...files, 'src/runtime/inputStateAdapter.ts', 'src/editor/inputStateAdapter.ts'].map(file => join(root, file)), program = ts.createProgram(owned, { ...options, noEmit: true })
    const ownedDiagnostics = ts.getPreEmitDiagnostics(program).filter(diagnostic => !diagnostic.file || owned.includes(diagnostic.file.fileName))
    check('owned-production-modules-pass-targeted-TypeScript-diagnostics', () => assert.deepEqual(ownedDiagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')), []))
  }
  passed = true
} finally {
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, stage + '.json'), JSON.stringify({ generatedAt: new Date().toISOString(), stage, status: passed ? 'passed' : 'failed', checks, sourceHashes, behavior, moduleGraphs, sourceGraphs, scope: 'Actual InputManager, game HUD CPU draw calls, Editor SSR/setup and Vue watch semantics. DOM/sensors remain direct host calls; no browser/GPU/Worker/independent Player qualification.' }, null, 2))
  await rm(temporary, { recursive: true, force: true })
  console.log(`Input states ${stage}: ${checks.length} checks ${passed ? 'passed' : 'failed'}`)
}
