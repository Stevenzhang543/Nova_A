/** Browser-only cases; real WebGL handles, bounded polling, and explicitly labeled fault injections. */
export async function verifyCreditCases(h) {
  const { check, assert, observations, captures, WebGL2Renderer, scene, sceneEnvironment, BoxEntity, frame, camera, color, pixels, renderScene } = h
  const core = await import('/src/renderer/core.ts')
  const task = () => new Promise(resolve => setTimeout(resolve, 2))
  const faults = []
  const make = (limit = 2) => {
    const canvas = document.createElement('canvas')
    const environment = { settings: core.normalizeRenderingSettings({ ...core.DEFAULT_RENDERING_SETTINGS, antiAliasing: 'Off', textureStreaming: { enabled: false } }), postProcessing: { ...core.DEFAULT_RENDERING_SETTINGS.postProcessing }, assets: { generation: 0, atlasPageCount: 0, resolveTexture: () => null, readMaterialSource: () => null }, submissionCreditLimit: () => limit, submissionFault: reason => faults.push(reason) }
    const renderer = new WebGL2Renderer(canvas, environment); h.recordDevice(renderer)
    return { canvas, environment, renderer }
  }
  const shape = { shape: 'Rectangle', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, vertices: [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }], radiusX: 1, radiusY: 1, fill: color(255, 0, 0), stroke: color(0, 0, 0, 0), strokeWidth: 0, sortingLayer: 1, orderInLayer: 0, material: 'Default' }
  const submit = target => {
    if (!target.renderer.tryBeginFrame(frame)) return null
    target.renderer.beginCamera(camera); target.renderer.submitShape(shape); target.renderer.endCamera()
    return target.renderer.endFrame()
  }
  const options = { width: 256, height: 128, pixelRatio: 1, editorCamera: camera, gameView: false, activeLayer: 1, renderLayer: 'all', canvasColor: '#000000', connections: [], performanceMode: true }
  const distribution = samples => { const sorted = [...samples].sort((a, b) => a - b); return { median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * .95) - 1)], samples } }

  await check('Production renderWorld defaults to two credits, skips duplicate work and resumes the newest state', async () => {
    const target = make(), baseline = make(), entities = Array.from({ length: 32 }, (_, index) => { const entity = new BoxEntity(900 + index, { x: index % 8 - 4, y: Math.floor(index / 8) - 2 }, { x: .3, y: .3 }); entity.layer = 1; return entity })
    delete target.environment.submissionCreditLimit
    const gl = target.renderer.gl, waitOriginal = gl.clientWaitSync, drawOriginal = gl.drawElements, clearOriginal = gl.clear
    let draws = 0, clears = 0, polls = 0
    gl.clientWaitSync = (_sync, flags, timeout) => { assert(flags === 0 && timeout === 0, 'Production admission blocked/flushed in the polling call'); polls++; return gl.TIMEOUT_EXPIRED }
    gl.drawElements = function (...args) { draws++; return drawOriginal.apply(gl, args) }
    gl.clear = function (...args) { clears++; return clearOriginal.apply(gl, args) }
    baseline.renderer.tryBeginFrame = undefined // Explicit legacy untracked control; same source/content/quality.
    try {
      const before = [], after = []
      for (let index = 0; index < 64; index++) { const start = performance.now(); scene.renderWorld(baseline.renderer, entities, options, sceneEnvironment); before.push(performance.now() - start) }
      assert(Number.isFinite(scene.renderWorld(target.renderer, entities, options, sceneEnvironment).cpuSubmissionAtMs), 'First production frame was refused')
      assert(Number.isFinite(scene.renderWorld(target.renderer, entities, options, sceneEnvironment).cpuSubmissionAtMs), 'Second default credit was unavailable')
      const retained = pixels(target.canvas), drawsBefore = draws, width = target.canvas.width, settings = JSON.stringify(target.environment.settings)
      for (let index = 0; index < 64; index++) {
        entities[0].transform.position.x = index / 64
        const inputState = JSON.stringify(entities[0].transform)
        const start = performance.now(), stats = scene.renderWorld(target.renderer, entities, { ...options, width: index % 2 ? 256 : 512 }, sceneEnvironment)
        after.push(performance.now() - start)
        assert(stats.gpuSubmissionStatus === 'deferred' && stats.cpuSubmissionAtMs === null, 'Full credits published an actual submission')
        assert(inputState === JSON.stringify(entities[0].transform), 'Admission modified logical entity state')
      }
      assert(target.renderer.pendingSubmissions.length === 2 && draws === drawsBefore && clears === 2, 'Deferred frames issued drawing commands or exceeded two fences')
      assert(target.renderer.packets.length === 0 && target.canvas.width === width && JSON.stringify(target.environment.settings) === settings, 'Deferred requests retained packets/resized/changed locked quality')
      target.renderer.resize(512, 256, 1)
      assert(target.canvas.width === width && target.canvas.height === 128, 'Host resize erased the retained surface before GPU admission')
      const deferredPixels = pixels(target.canvas)
      assert(retained.every((value, index) => value === deferredPixels[index]), 'Deferred frame altered retained pixels')
      gl.clientWaitSync = waitOriginal
      await task(); const resumed = await renderScene(target, entities, options)
      scene.renderWorld(baseline.renderer, entities, options, sceneEnvironment)
      const latest = pixels(target.canvas), expected = pixels(baseline.canvas)
      assert(latest.every((value, index) => value === expected[index]), 'Recovery rendered stale queued state or changed pixels')
      assert(Number.isFinite(resumed.gpuCompletionObservedAtMs), 'A later real task did not observe a completed fence')
      observations.push({ name: 'production-submit-admission', scope: '64 same-task legacy untracked submissions versus 64 controlled-unsignaled production deferrals after two admitted frames; same 32 objects/quality/size. CPU request cost and bounded work only, not frame throughput, GPU speed or display latency.', before: { requests: 64, submissions: 64, timing: distribution(before) }, after: { requests: 64, submissions: 0, retainedFences: 2, timing: distribution(after) }, zeroTimeoutPolls: polls })
      captures.push({ name: 'credit-resumed-latest-state', data: target.canvas.toDataURL() })
    } finally { gl.clientWaitSync = waitOriginal; gl.drawElements = drawOriginal; gl.clear = clearOriginal; target.renderer.destroy(); baseline.renderer.destroy() }
  })

  await check('Real task boundaries return completed credits for each candidate 1, 2 and 3', async () => {
    const results = []
    for (const limit of [1, 2, 3]) {
      const target = make(limit)
      try {
        for (let index = 0; index < limit; index++) assert(submit(target)?.gpuSubmissionStatus === 'submitted', 'Candidate refused one of its credits')
        assert(submit(target) === null && target.renderer.stats.gpuFramesInFlight === limit, 'Same-task pending fences exceeded candidate limit')
        let stats = null
        for (let retry = 0; retry < 100 && !stats; retry++) { await task(); stats = submit(target) }
        assert(stats && Number.isFinite(stats.gpuCompletionObservedAtMs) && stats.gpuCompletedSubmissionId >= 1, 'Actual later tasks did not recover completed credits')
        assert(stats.gpuFramesInFlight <= limit && target.canvas.width === 256 && target.canvas.height === 128, 'Candidate changed capacity or logical resolution')
        const output = pixels(target.canvas), center = (64 * 256 + 128) * 4; assert(output[center] === 255 && output[center + 1] === 0, 'Candidate lost complete scene output')
        results.push({ limit, pendingAfterResume: stats.gpuFramesInFlight, observedCompletedSubmission: stats.gpuCompletedSubmissionId, completionObservedAtMs: stats.gpuCompletionObservedAtMs })
      } finally { target.renderer.destroy() }
    }
    observations.push({ name: 'real-fence-task-boundaries', candidates: results, scope: 'Real WebGL2 fences/status after browser task boundaries; observed completion clock is an upper-bound observation of GPU commands, never presentation.' })
  })

  await check('Submission credit preserves requested MSAA, post effects, resolution and exact painter-order pixels', () => {
    const target = make(1), baseline = make(1)
    const commands = [{ ...shape, rotation: .23, fill: color(255, 0, 0, .7) }, { ...shape, position: { x: .7, y: 0 }, rotation: -.1, fill: color(0, 255, 0, .5), orderInLayer: 1 }]
    for (const value of [target, baseline]) { value.environment.settings.antiAliasing = 'MSAA4'; value.environment.settings.postProcessing.enabled = true; value.environment.postProcessing.exposure = .2; value.environment.postProcessing.vignette = .15 }
    try {
      assert(target.renderer.tryBeginFrame(frame), 'One-credit MSAA frame was not admitted')
      target.renderer.beginCamera(camera); for (const command of commands) target.renderer.submitShape(command); target.renderer.endCamera(); const stats = target.renderer.endFrame()
      baseline.renderer.beginFrame(frame); baseline.renderer.beginCamera(camera); for (const command of commands) baseline.renderer.submitShape(command); baseline.renderer.endCamera(); baseline.renderer.endFrame()
      const actual = pixels(target.canvas), expected = pixels(baseline.canvas)
      assert(actual.some((value, index) => index % 4 !== 3 && value > 0) && actual.every((value, index) => value === expected[index]), 'Credit path changed transparent painter order or post/MSAA pixels')
      assert(stats.antiAliasingSamples === 4 && stats.backingWidth === 256 && stats.backingHeight === 128 && target.environment.settings.postProcessing.enabled && target.environment.settings.antiAliasing === 'MSAA4', 'Credit path lowered requested quality or resolution')
      captures.push({ name: 'credit-msaa-post-transparent', data: target.canvas.toDataURL() })
    } finally { target.renderer.destroy(); baseline.renderer.destroy() }
  })

  await check('Live injected policy decreases admission without cancelling existing GPU work', () => {
    const target = make(3), gl = target.renderer.gl, original = gl.clientWaitSync
    gl.clientWaitSync = () => gl.TIMEOUT_EXPIRED
    try {
      assert(submit(target) && submit(target) && submit(target), 'Initial three-credit policy was not applied')
      target.environment.submissionCreditLimit = () => 1
      assert(submit(target) === null && target.renderer.stats.gpuSubmissionCreditLimit === 1 && target.renderer.pendingSubmissions.length === 3, 'Policy reduction erased outstanding work or submitted a fourth frame')
      target.environment.submissionCreditLimit = () => Number.NaN
      assert(submit(target) === null && target.renderer.stats.gpuSubmissionCreditLimit === 2, 'Invalid injected policy did not use conservative default two')
    } finally { gl.clientWaitSync = original; target.renderer.destroy() }
  })

  await check('Sampled GPU timer results are read after real browser tasks with unavailable time preserved', async () => {
    const target = make(), gl = target.renderer.gl, original = gl.getQueryParameter, nanoseconds = []
    gl.getQueryParameter = function (query, parameter) { const value = original.call(gl, query, parameter); if (parameter === gl.QUERY_RESULT) nanoseconds.push(value); return value }
    try {
      for (let index = 0; index < 32; index++) { submit(target); await task() }
      assert(target.renderer.pendingTimers.length <= 4, 'Actual timer results exceeded the diagnostic query bound')
      assert(target.renderer.stats.gpuMs === null || Number.isFinite(target.renderer.stats.gpuMs) && target.renderer.stats.gpuMs >= 0, 'Driver result produced an invalid numeric GPU time')
      assert(nanoseconds.every(value => Number.isFinite(value) && value >= 0), 'Actual GPU query result was not finite nonnegative nanoseconds')
      observations.push({ name: 'actual-sampled-gpu-timer', extensionAvailable: !!target.renderer.timerExtension, actualResultNanoseconds: nanoseconds, lastGpuMs: target.renderer.stats.gpuMs, scope: '32 browser tasks, real optional driver query results. Empty results/time null mean unavailable; no fabricated zero. This is not queue/display latency or a formal performance distribution.' })
    } finally { gl.getQueryParameter = original; target.renderer.destroy() }
  })

  await check('WAIT_FAILED stops production submissions and notifies once without fake completion', () => {
    const target = make(), gl = target.renderer.gl, original = gl.clientWaitSync, beforeFaults = faults.length
    try {
      assert(submit(target), 'Error fixture did not submit its initial real fence')
      gl.clientWaitSync = () => gl.WAIT_FAILED
      for (let index = 0; index < 64; index++) assert(submit(target) === null && target.renderer.stats.cpuSubmissionAtMs === null, 'WAIT_FAILED was treated as available credit')
      assert(faults.length === beforeFaults + 1 && target.renderer.stats.gpuSubmissionStatus === 'sync-failed' && target.renderer.pendingSubmissions.length === 1, 'Failure notification repeated or failed fence was recycled as complete')
      assert(target.renderer.stats.gpuCompletionObservedAtMs == null, 'Failed fence published a completion timestamp')
    } finally { gl.clientWaitSync = original; target.renderer.destroy() }
  })

  await check('Null fence after drawing preserves actual CPU submission evidence then suspends', () => {
    const target = make(), gl = target.renderer.gl, original = gl.fenceSync, beforeFaults = faults.length
    gl.fenceSync = () => null
    try {
      const stats = submit(target)
      assert(stats?.gpuSubmissionStatus === 'sync-failed' && Number.isFinite(stats.cpuSubmissionAtMs), 'Drawing before null fence lost CPU submission evidence needed for coherent overlay')
      const output = pixels(target.canvas), center = (64 * 256 + 128) * 4; assert(output[center] === 255, 'Actual drawing before fence failure was lost')
      for (let index = 0; index < 16; index++) assert(submit(target) === null, 'Null fence failure kept sending new work')
      assert(faults.length === beforeFaults + 1 && target.renderer.stats.gpuCompletionObservedAtMs == null, 'Null fence repeated recovery or claimed completion')
    } finally { gl.fenceSync = original; target.renderer.destroy() }
  })

  await check('Context loss advances epoch and old-owner cleanup never deletes a new device fence', async () => {
    const old = make(), newer = make()
    try {
      assert(submit(old), 'Loss fixture did not allocate a real old fence')
      const epoch = old.renderer.stats.deviceEpoch, extension = old.renderer.gl.getExtension('WEBGL_lose_context')
      assert(extension, 'Loss fixture requires WEBGL_lose_context')
      const lost = new Promise(resolve => old.canvas.addEventListener('webglcontextlost', resolve, { once: true })); extension.loseContext(); await lost
      assert(old.renderer.stats.deviceEpoch !== epoch && old.renderer.pendingSubmissions.length === 0 && old.renderer.stats.gpuCompletionObservedAtMs === null, 'Loss retained an old epoch/completion/fence')
      assert(submit(old) === null && old.renderer.stats.cpuSubmissionAtMs === null, 'Lost owner admitted work')
      assert(submit(newer), 'New renderer did not admit an independent device epoch')
      const gl = newer.renderer.gl, original = gl.deleteSync; let deleted = 0
      gl.deleteSync = function (...args) { deleted++; return original.apply(gl, args) }
      try { old.renderer.destroy(); assert(deleted === 0 && newer.renderer.pendingSubmissions.length === 1 && newer.renderer.stats.deviceEpoch !== old.renderer.stats.deviceEpoch, 'Old cleanup injected into new device ownership') } finally { gl.deleteSync = original }
    } finally { old.renderer.destroy(); newer.renderer.destroy() }
  })

  await check('Destroy cancels fence ownership once and viewport recovery is bounded/cancellable', async () => {
    const target = make(), gl = target.renderer.gl, original = gl.deleteSync; let deleted = 0
    gl.deleteSync = function (...args) { deleted++; return original.apply(gl, args) }
    try {
      assert(submit(target) && submit(target), 'Destroy fixture failed to allocate two real fences')
      target.renderer.destroy(); target.renderer.destroy()
      assert(deleted === 2 && submit(target) === null && target.renderer.pendingSubmissions.length === 0, 'Destroy leaked/double-deleted fences or admitted later work')
    } finally { gl.deleteSync = original; target.renderer.destroy() }
    const { createRendererRecoveryOwner, editorRendererEnvironment } = await import('/src/editor/rendererAdapter.ts')
    const { performanceCoordinator } = await import('/src/runtime/performance/services.ts')
    let resets = 0; const owner = createRendererRecoveryOwner(() => { resets++ }), disposed = createRendererRecoveryOwner(() => { resets++ })
    const config = performanceCoordinator.config
    try {
      for (const limit of [1, 2, 3]) { performanceCoordinator.configure({ ...config, maxSubmissionCredits: limit }); assert(editorRendererEnvironment(owner).submissionCreditLimit() === limit, 'Production Editor adapter ignored Coordinator policy') }
      for (let index = 0; index < 6; index++) { owner.submissionFault('controlled host recovery fault'); await task() }
      assert(resets === 2, 'Remounted renderer failures caused unbounded automatic rebuilds')
      disposed.submissionFault('controlled cancelled host recovery'); disposed.dispose(); await task(); assert(resets === 2, 'Disposed viewport fired a stale recovery task')
    } finally { owner.dispose(); disposed.dispose(); performanceCoordinator.configure(config) }
  })
}
