/** Actual WebGL query handles; labeled availability/fence controls test admission, never GPU speed. */
import * as core from '/src/renderer/core.ts'

export async function gpuDiagnosticsCases() {
  const checks = [], observations = [], devices = []
  const assert = (value, message) => { if (!value) throw Error(message) }
  const check = async (name, fn) => { try { await fn(); checks.push({ name, status: 'passed' }) } catch (error) { checks.push({ name, status: 'failed', error: String(error.stack ?? error) }) } }
  const task = () => new Promise(resolve => setTimeout(resolve, 2))
  const frame = { width: 64, height: 48, pixelRatio: 1, clearColor: { r: 0, g: 0, b: 0, a: 1 } }
  const command = { shape: 'Rectangle', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, vertices: [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }], radiusX: 1, radiusY: 1, fill: { r: 255, g: 0, b: 0, a: 1 }, stroke: { r: 0, g: 0, b: 0, a: 0 }, strokeWidth: 0, sortingLayer: 0, orderInLayer: 0, material: 'Default' }
  const make = (mode = 'sampled') => {
    const owner = core.createGpuDiagnosticsBudgetOwner(mode), canvas = document.createElement('canvas')
    const environment = { settings: core.normalizeRenderingSettings({ ...core.DEFAULT_RENDERING_SETTINGS, antiAliasing: 'Off', textureStreaming: { enabled: false } }), postProcessing: { ...core.DEFAULT_RENDERING_SETTINGS.postProcessing }, assets: { generation: 0, atlasPageCount: 0, resolveTexture: () => null, readMaterialSource: () => null }, gpuDiagnosticsBudget: () => owner.snapshot }
    const renderer = new core.WebGL2Renderer(canvas, environment), gl = renderer.gl
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    devices.push({ renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : null, timerExtension: !!renderer.timerExtension })
    const original = { create: gl.createQuery, begin: gl.beginQuery, end: gl.endQuery, remove: gl.deleteQuery, parameter: gl.getQueryParameter, get: gl.getParameter, draw: gl.drawElements }
    const trace = { created: [], begun: [], ended: 0, deleted: [], resultReads: [], availabilityReads: [], draws: 0 }
    gl.createQuery = function () { const query = original.create.call(gl); if (query) trace.created.push(query); return query }
    gl.beginQuery = function (target, query) { trace.begun.push(query); return original.begin.call(gl, target, query) }
    gl.endQuery = function (target) { trace.ended++; return original.end.call(gl, target) }
    gl.deleteQuery = function (query) { trace.deleted.push(query); return original.remove.call(gl, query) }
    gl.drawElements = function (...args) { trace.draws++; return original.draw.apply(gl, args) }
    gl.getQueryParameter = function (query, parameter) { if (parameter === gl.QUERY_RESULT) trace.resultReads.push(query); else if (parameter === gl.QUERY_RESULT_AVAILABLE) trace.availabilityReads.push(query); return original.parameter.call(gl, query, parameter) }
    return { owner, canvas, environment, renderer, gl, original, trace }
  }
  const pending = target => { target.gl.getQueryParameter = function (query, parameter) { if (parameter === target.gl.QUERY_RESULT_AVAILABLE) { target.trace.availabilityReads.push(query); return false } target.trace.resultReads.push(query); throw Error('Unavailable query result was read') } }
  // The old untracked entry is an explicit diagnostic control for exact cadence/counts in one task.
  // Production admission/real browser task boundaries are checked independently below.
  const begin = target => { target.renderer.beginFrame(frame); target.renderer.beginCamera({ scale: 12, offset: { x: 32, y: 24 } }); target.renderer.submitShape(command); target.renderer.endCamera() }
  const draw = target => { begin(target); return target.renderer.endFrame() }
  const requireTimer = target => { assert(target.renderer.timerExtension, 'Actual test host does not provide optional EXT_disjoint_timer_query_webgl2') }

  await check('Pure diagnostic owner has bounded defaults, stable revisions and unknown-key fallback', () => {
    const owner = core.createGpuDiagnosticsBudgetOwner(), first = owner.snapshot
    assert(first.mode === 'sampled' && first.sampleIntervalFrames === 8 && first.maxPendingQueries === 4, 'Default budget changed')
    assert(owner.setMode('sampled') === first, 'Unchanged mode changed its snapshot')
    assert(owner.setMode('off').revision === 1 && owner.snapshot.sampleIntervalFrames === null && owner.snapshot.maxPendingQueries === 0, 'Off budget invalid')
    assert(owner.setMode('full').revision === 2 && owner.snapshot.sampleIntervalFrames === 1 && owner.snapshot.maxPendingQueries === 4, 'Full budget unbounded')
    const unknown = core.gpuDiagnosticsBudget('unknown-adapter-or-policy', Number.NaN)
    assert(unknown.mode === 'sampled' && unknown.revision === 0 && Object.isFrozen(unknown), 'Unknown input discriminated device or leaked mutable policy')
  })
  await check('Off submits unchanged production drawing with zero new GPU queries and null time', async () => {
    const target = make('off')
    try {
      for (let index = 0; index < 24; index++) { if (target.renderer.tryBeginFrame(frame)) { target.renderer.beginCamera({ scale: 12, offset: { x: 32, y: 24 } }); target.renderer.submitShape(command); target.renderer.endCamera(); const stats = target.renderer.endFrame(); assert(Number.isFinite(stats.cpuSubmissionAtMs) && stats.gpuMs === null && stats.gpuSubmissionCreditLimit === 2, 'Off changed drawing/credit/CPU submission semantics') } await task() }
      assert(target.trace.created.length === 0 && target.trace.ended === 0 && target.trace.draws > 0, 'Off created queries or skipped actual drawing')
      assert(target.canvas.width === 64 && target.canvas.height === 48 && target.environment.settings.resolutionScale === 1, 'Diagnostic budget changed locked dimensions/scale')
      observations.push({ name: 'off-production', actualDraws: target.trace.draws, newQueries: target.trace.created.length, pendingSubmissions: target.renderer.pendingSubmissions.length, gpuMs: target.renderer.stats.gpuMs })
    } finally { target.renderer.destroy() }
  })
  await check('Unspecified sampled control preserves every8 cadence and max4 backpressure', () => {
    const target = make(); delete target.environment.gpuDiagnosticsBudget; requireTimer(target); pending(target)
    try {
      for (let index = 0; index < 64; index++) draw(target)
      assert(target.trace.created.length === 4 && target.trace.ended === 4 && target.renderer.pendingTimers.length === 4 && target.trace.resultReads.length === 0, 'Sampled default cadence/cap/result gating changed')
      observations.push({ name: 'sampled-default', requests: 64, createdQueries: 4, pendingQueries: 4, scope: 'Explicit legacy diagnostic control with actual query handles and controlled unavailable results; no throughput/timing claim.' })
    } finally { target.renderer.destroy() }
  })
  await check('Explicit Full remains max4 and Off discards pending queries once without reading results', () => {
    const target = make('full'); requireTimer(target); pending(target)
    try {
      for (let index = 0; index < 64; index++) draw(target)
      const queries = [...target.trace.created]
      assert(queries.length === 4 && target.renderer.pendingTimers.length === 4, 'Full exceeded bounded query admission')
      target.renderer.lastGpuMs = 7 // Labeled controlled stale value, never reported as hardware time.
      target.owner.setMode('off'); const stats = draw(target)
      assert(stats.gpuMs === null && target.renderer.lastGpuMs === null && target.renderer.pendingTimers.length === 0 && target.trace.resultReads.length === 0, 'Off retained/read stale timing')
      for (const query of queries) assert(target.trace.deleted.filter(value => value === query).length === 1, 'Pending query deleted repeatedly')
      for (let index = 0; index < 16; index++) draw(target)
      assert(target.trace.created.length === 4, 'Off created a new query')
      target.owner.setMode('full'); draw(target)
      assert(target.trace.created.length === 5 && target.trace.resultReads.length === 0, 'Re-enabled mode reused/read cancelled result')
      observations.push({ name: 'full-off-reenable', fullCreatedQueries: 4, offNewQueries: 0, cancelledQueries: queries.length, reenabledNewQueries: 1, controlledStaleGpuMs: 7, publishedAfterOff: stats.gpuMs })
    } finally { target.renderer.destroy() }
  })
  await check('Mode changes inside a frame preserve begin/end pairing and apply next admitted frame', () => {
    const target = make('full'); requireTimer(target); pending(target)
    try {
      begin(target); assert(target.trace.begun.length === 1 && target.renderer.activeTimer, 'Full did not start actual query')
      target.owner.setMode('off'); target.renderer.endFrame()
      assert(target.trace.ended === 1 && target.renderer.pendingTimers.length === 1 && target.trace.deleted.length === 0, 'Mid-frame Off interrupted the latched query')
      begin(target); target.owner.setMode('full'); target.renderer.endFrame()
      assert(target.trace.created.length === 1 && target.trace.deleted.length === 1 && target.renderer.stats.gpuMs === null, 'Mid-frame Full started a query under latched Off')
      draw(target); assert(target.trace.created.length === 2 && target.trace.ended === 2, 'Next frame did not apply Full')
    } finally { target.renderer.destroy() }
  })
  await check('Deferred production request does not relatch mode or create/cancel the current epoch queries', async () => {
    const target = make('full'); requireTimer(target); pending(target); const originalWait = target.gl.clientWaitSync
    target.gl.clientWaitSync = (_sync, flags, timeout) => { assert(flags === 0 && timeout === 0, 'GPU admission waited'); return target.gl.TIMEOUT_EXPIRED }
    try {
      for (let i = 0; i < 2; i++) { assert(target.renderer.tryBeginFrame(frame), 'Initial default2 admission failed'); target.renderer.endFrame() }
      target.owner.setMode('off'); const serial = target.renderer.frameSerial
      assert(!target.renderer.tryBeginFrame(frame) && target.renderer.frameSerial === serial && target.trace.created.length === 2 && target.trace.deleted.length === 0 && target.renderer.pendingTimers.length === 2, 'Deferred request performed frame/query work')
      target.gl.clientWaitSync = originalWait
      let admitted = false
      for (let i = 0; i < 100 && !admitted; i++) { await task(); admitted = target.renderer.tryBeginFrame(frame) }
      assert(admitted, 'Real task boundaries did not return default2 credits'); const stats = target.renderer.endFrame()
      assert(target.trace.created.length === 2 && target.trace.deleted.length === 2 && stats.gpuMs === null && stats.gpuSubmissionCreditLimit === 2, 'Admitted Off did not clear pending while retaining credit policy')
    } finally { target.gl.clientWaitSync = originalWait; target.renderer.destroy() }
  })
  await check('Absent optional timer capability stays null without disabling the drawing backend', () => {
    const target = make('full')
    try { target.renderer.timerExtension = null; for (let i = 0; i < 8; i++) assert(draw(target).gpuMs === null, 'Missing timing capability fabricated a sample'); assert(target.trace.created.length === 0 && target.trace.draws === 8, 'Missing timer changed actual drawing'); observations.push({ name: 'timer-unavailable-control', timerCapability: 'controlled missing optional extension', gpuMs: null, actualDraws: 8 }) } finally { target.renderer.destroy() }
  })
  await check('Destroyed query owner ends active work and deletes each handle exactly once', () => {
    const target = make('full'); requireTimer(target); pending(target)
    draw(target); begin(target)
    const queries = [...target.trace.created]
    target.renderer.destroy(); target.renderer.destroy()
    assert(target.trace.ended === 2 && target.renderer.pendingTimers.length === 0 && target.renderer.activeTimer === null, 'Destroy did not close/clear active query')
    for (const query of queries) assert(target.trace.deleted.filter(value => value === query).length === 1, 'Destroy leaked/double-deleted query')
    assert(target.renderer.stats.gpuMs === null && !target.renderer.tryBeginFrame(frame), 'Destroyed owner admitted more work or retained time')
  })
  await check('Actual context loss forgets old queries and old cleanup cannot delete a new epoch owner', async () => {
    const old = make('full'); requireTimer(old); pending(old); const loss = old.gl.getExtension('WEBGL_lose_context')
    assert(loss, 'Test host lacks actual WEBGL_lose_context'); draw(old); const epoch = old.renderer.deviceEpoch
    loss.loseContext()
    for (let i = 0; i < 100 && !old.renderer.contextLost; i++) await task()
    assert(old.renderer.contextLost && old.renderer.deviceEpoch !== epoch && old.renderer.pendingTimers.length === 0 && old.renderer.stats.gpuMs === null, 'Loss retained old query/time/epoch')
    const newer = make('full'); requireTimer(newer); pending(newer)
    try { draw(newer); old.renderer.destroy(); assert(old.trace.deleted.length === 0 && newer.renderer.pendingTimers.length === 1 && newer.trace.deleted.length === 0, 'Lost owner deleted handles in another epoch'); observations.push({ name: 'loss-query-epoch', oldEpoch: epoch, invalidatedEpoch: old.renderer.deviceEpoch, newEpoch: newer.renderer.deviceEpoch, oldDeleteCalls: old.trace.deleted.length, newPendingQueries: newer.renderer.pendingTimers.length }) } finally { old.renderer.destroy(); newer.renderer.destroy() }
  })
  await check('Editor setter changes only diagnostic DI; Coordinator credit and original quality owners stay intact', async () => {
    const editor = await import('/src/editor/rendererAdapter.ts'), { performanceCoordinator } = await import('/src/runtime/performance/services.ts')
    const before = performanceCoordinator.snapshot, environment = editor.editorRendererEnvironment(), settings = environment.settings, originalMode = environment.gpuDiagnosticsBudget().mode
    try {
      for (const mode of ['off', 'full', 'sampled']) { editor.setEditorRendererGpuDiagnosticsMode(mode); assert(environment.gpuDiagnosticsBudget().mode === mode && environment.submissionCreditLimit() === before.gpuSubmissionCreditLimit && performanceCoordinator.snapshot === before && environment.settings === settings, 'Diagnostic bridge mutated Coordinator/quality or failed actual DI') }
    } finally { editor.setEditorRendererGpuDiagnosticsMode(originalMode) }
  })
  return { status: checks.every(check => check.status === 'passed') ? 'passed' : 'failed', checks, observations, devices, scope: 'Functional actual WebGL2 query ownership/admission/cleanup with explicitly labeled unavailable-result/fence/capability controls. No image baseline changes, hardware timing, FPS, presentation or formal performance claim.' }
}
