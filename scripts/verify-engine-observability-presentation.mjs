/** Execute the actual WorldCanvas render body against controlled owner replies; no GPU performance claim. */
import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import ts from 'typescript'

const path = resolve('src/components/WorldCanvas.vue'), source = await readFile(path, 'utf8')
const start = source.indexOf('function render(deltaSeconds = 0,'), next = source.indexOf('function drawWorldDebugLabel', start), end = source.lastIndexOf('/**', next)
assert.ok(start >= 0 && next > start && end > start)
const body = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
let reply, clears = 0, lighting = 0, hud = 0, captures = 0, marked = 0, requestedRatio = 1, lastWorldRequest
const passes = []
const sceneRendererEnvironment = Object.freeze({ owner: 'controlled-scene-owner' })
const lightingEnvironment = Object.freeze({ owner: 'controlled-lighting-owner' })
const renderGraphDiagnosticsOwner = Object.freeze({ owner: 'controlled-graph-diagnostics-owner' })
const noop = () => {}, ctx = new Proxy({ clearRect() { clears++ } }, { get: (target, key) => key in target ? target[key] : noop })
const environment = {
  ctx, canvasRef: { value: { width: 100, height: 100 } }, canvasLogicalWidth: 100, canvasLogicalHeight: 100, canvasPixelRatio: 1,
  desiredCanvasPixelRatio: () => requestedRatio, resize: noop, state: { playMode: 'playing', globalSettings: { timeScale: 1 }, selectedEntityIds: [] },
  camera: { scale: 1, offset: { x: 0, y: 0 } }, resetCameraSmoothing: noop, beginRenderGraph(owner) { assert.equal(owner, renderGraphDiagnosticsOwner); passes.length = 0; return 10 },
  recordRenderPass(name, _started, enabled, _drawCalls, owner) { assert.equal(owner, renderGraphDiagnosticsOwner); passes.push({ name, enabled }); return 11 },
  completeRenderGraph(_worldStarted, _stats, _uiStarted, _overlayStarted, owner) { assert.equal(owner, renderGraphDiagnosticsOwner) },
  renderGraphDiagnosticsOwner, synchronizeRenderGraphDiagnosticsScope: noop, lightingEnvironment,
  renderer: {}, sceneRendererEnvironment, renderWorld(_renderer, _entities, options, services) { assert.equal(services, sceneRendererEnvironment, 'The actual caller must reuse its explicit scene services'); lastWorldRequest = options; return reply }, world: { entities: [], connections: [] }, editorState: { currentPage: 'game', rendererStats: {}, activeLayer: 1, renderLayer: 1 },
  palette: {}, authoringState: { performanceMode: 'off' }, prefs: {}, markPerformanceSubmission() { marked++ },
  renderLighting2D(_ctx, _entities, _options, services) { assert.equal(services, lightingEnvironment); lighting++ }, renderPostProcessOverlay: noop, renderDebugView2D: noop,
  renderingSettings: { lightingEnabled: true, postProcessing: { enabled: true }, debugView: 'None' },
  renderTransformGizmo: noop, renderPointGizmo: noop, drawPhysicsDebug: noop, drawWorldGameplayDebug: noop,
  gameUiRuntime: { render() { hud++ }, accessibilityNodes: () => [] }, renderScreenRulers: noop,
  accessibilitySignature: '', accessibilityNodes: { value: [] }, renderCanvasRef: { value: {} },
  captureRenderSurface() { captures++ }, worldPostProcessFilter: () => 'none', activeGameCameras: () => [],
  renderGraphState: { frame: 1 }, captureRenderTexture: noop, runtimeCaptions: [], captionTick: { value: 0 }
}
const { render, setViewport } = new Function(...Object.keys(environment), body + '\nreturn {render,setViewport(width,height,ratio){canvasLogicalWidth=width;canvasLogicalHeight=height;canvasPixelRatio=ratio}};')(...Object.values(environment))
const check = (status, submitted, expected) => {
  reply = { gpuSubmissionStatus: status, cpuSubmissionAtMs: submitted ? 20 : null, drawCalls: submitted ? 1 : 0, renderTargets: 0 }
  render(1 / 60)
  assert.deepEqual({ clears, lighting, hud, captures, marked }, expected)
  assert.deepEqual(Object.fromEntries(passes.map(pass => [pass.name, pass.enabled])), { World: submitted, Lighting: submitted, PostProcess: submitted, EditorOverlay: false, UI: submitted }, 'Every associated pass must belong to the same submitted world and game-view scope')
}
check('submitted', true, { clears: 1, lighting: 1, hud: 1, captures: 1, marked: 1 })
for (const status of ['deferred', 'suspended', 'sync-failed']) check(status, false, { clears: 1, lighting: 1, hud: 1, captures: 1, marked: 1 })
// A fence failure after drawing has already changed the surface: update its matching overlay once.
check('sync-failed', true, { clears: 2, lighting: 2, hud: 2, captures: 2, marked: 2 })
check('sync-failed', false, { clears: 2, lighting: 2, hud: 2, captures: 2, marked: 2 })
check('untracked', true, { clears: 3, lighting: 3, hud: 3, captures: 3, marked: 3 })
requestedRatio = 2; setViewport(200, 150, 2)
check('deferred', false, { clears: 3, lighting: 3, hud: 3, captures: 3, marked: 3 })
assert.deepEqual({ width: environment.canvasRef.value.width, height: environment.canvasRef.value.height }, { width: 100, height: 100 }, 'Pending resize must retain previous overlay pixels')
check('submitted', true, { clears: 4, lighting: 4, hud: 4, captures: 4, marked: 4 })
assert.deepEqual({ width: environment.canvasRef.value.width, height: environment.canvasRef.value.height }, { width: 400, height: 300 })
assert.deepEqual({ width: lastWorldRequest.width, height: lastWorldRequest.height, pixelRatio: lastWorldRequest.pixelRatio }, { width: 200, height: 150, pixelRatio: 2 }, 'Admission must not reduce the requested size or quality')
const report = resolve(process.argv.find(value => value.startsWith('--output='))?.slice(9) || '.cache/engine-observability-presentation.json')
await mkdir(resolve(report, '..'), { recursive: true })
await writeFile(report, JSON.stringify({ status: 'passed', scope: 'SHORT_SMOKE actual production render-body host contract. Controlled Renderer replies and Canvas host; not pixel/GPU/display qualification.', checks: 9, sourceHash: createHash('sha256').update(source).digest('hex') }, null, 2) + '\n')
console.log(JSON.stringify({ status: 'passed', checks: 9, scope: 'SHORT_SMOKE', report }))
