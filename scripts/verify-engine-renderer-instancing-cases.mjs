/** Browser cases use actual draw calls and unchanged pixels. Short smoke, never formal B1. */
export async function verifyInstancingCases(h) {
  const { check, assert, observations, captures, WebGL2Renderer, color, pixels } = h
  const core = await import('/src/renderer/core.ts')
  const frame = { width: 800, height: 450, pixelRatio: 1, clearColor: color(0, 0, 0) }
  const camera = { scale: 1, position: { x: 0, y: 0 }, offset: { x: 400, y: 225 } }
  const task = () => new Promise(resolve => setTimeout(resolve, 2))
  const distribution = samples => { const sorted = [...samples].sort((a, b) => a - b); return { median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.ceil(sorted.length * .95) - 1], samples } }
  const texture = document.createElement('canvas'); texture.width = 4; texture.height = 4
  const context = texture.getContext('2d'); context.fillStyle = '#ff4a20'; context.fillRect(0, 0, 4, 4); context.fillStyle = '#20a0ff'; context.fillRect(2, 0, 2, 2); context.fillStyle = '#8cff40'; context.fillRect(0, 2, 2, 2)
  const region = { key: 'instance-atlas', source: texture, uv: { x: 0, y: 0, width: 1, height: 1 }, filter: 'Nearest', revision: 0 }
  const otherTexture = document.createElement('canvas'); otherTexture.width = 4; otherTexture.height = 4
  const otherContext = otherTexture.getContext('2d'); otherContext.fillStyle = '#f060e0'; otherContext.fillRect(0, 0, 4, 4)
  const otherRegion = { ...region, key: 'instance-other-texture', source: otherTexture }
  const make = (enabled, aa = 'Off', failAllocation = false) => {
    const canvas = document.createElement('canvas'), environment = { settings: core.normalizeRenderingSettings({ ...core.DEFAULT_RENDERING_SETTINGS, antiAliasing: aa, textureStreaming: { enabled: false } }), postProcessing: { ...core.DEFAULT_RENDERING_SETTINGS.postProcessing }, assets: { generation: 1, atlasPageCount: 1, resolveTexture: () => region, readMaterialSource: () => JSON.stringify({ fragment: 'vec4 nova_material(vec4 baseColor,vec2 uv){return vec4(baseColor.rgb*.7,baseColor.a);}' }) }, ...(enabled === false ? { spriteInstancing: false } : {}) }
    let initializationGl, createBuffer, bufferAllocations = 0
    if (failAllocation) { initializationGl = canvas.getContext('webgl2', { alpha: false, antialias: aa !== 'Off', depth: false, premultipliedAlpha: true, powerPreference: 'high-performance' }); createBuffer = initializationGl.createBuffer; initializationGl.createBuffer = function () { return ++bufferAllocations === 3 ? null : createBuffer.call(initializationGl) } }
    let renderer
    try { renderer = new WebGL2Renderer(canvas, environment) } finally { if (initializationGl) initializationGl.createBuffer = createBuffer }
    h.recordDevice(renderer)
    const gl = renderer.gl, originals = { drawElements: gl.drawElements, drawElementsInstanced: gl.drawElementsInstanced, bufferSubData: gl.bufferSubData, bufferData: gl.bufferData, finish: gl.finish }
    const counts = { geometry: 0, instanced: 0, instances: 0, uploadBytes: 0, allocations: 0 }
    gl.drawElements = function (...args) { counts.geometry++; return originals.drawElements.apply(gl, args) }
    gl.drawElementsInstanced = function (...args) { counts.instanced++; counts.instances += args[4]; return originals.drawElementsInstanced.apply(gl, args) }
    gl.bufferSubData = function (target, offset, source, sourceOffset = 0, length) { counts.uploadBytes += (length ?? source.length - sourceOffset) * source.BYTES_PER_ELEMENT; return originals.bufferSubData.apply(gl, arguments) }
    gl.bufferData = function (...args) { counts.allocations++; return originals.bufferData.apply(gl, args) }
    gl.finish = () => { throw Error('Production path synchronously waited for GPU') }
    return { canvas, renderer, environment, counts, destroy: () => { Object.assign(gl, originals); renderer.destroy() }, reset: () => Object.keys(counts).forEach(key => counts[key] = 0) }
  }
  const command = index => ({ position: { x: index % 160 * 5 - 397.5, y: Math.floor(index / 160) * 7 - 218 }, rotation: index % 11 === 0 ? .17 : 0, scale: { x: index % 13 === 0 ? -1 : 1, y: index % 17 === 0 ? -1 : 1 }, size: { x: 3.5, y: 5 }, pivot: { x: .37, y: .61 }, flipX: index % 3 === 0, flipY: index % 5 === 0, tint: color(255, 255, 255, .83), texture: region, sortingLayer: 1, orderInLayer: 0, material: 'Default', blendMode: 'Alpha' })
  const submit = async (target, action, options = frame) => {
    for (let attempt = 0; attempt < 200; attempt++) {
      if (!target.renderer.tryBeginFrame(options)) { await task(); continue }
      target.renderer.beginCamera(camera); action(target.renderer); target.renderer.endCamera(); return target.renderer.endFrame()
    }
    throw Error('Actual GPU fence did not return admission within bounded browser tasks')
  }
  await check('10k visible production sprites use actual instanced draw and reduce complete CPU upload payload', async () => {
    const control = make(false), actual = make(true), timings = { geometry: [], instanced: [] }, bytes = { geometry: [], instanced: [] }, requests = { geometry: [], instanced: [] }
    const action = renderer => { for (let index = 0; index < 10000; index++) renderer.submitSprite(command(index)) }
    const timed = async (target, kind) => {
      // Admission waits happen before the CPU measurement and never inside production draw code.
      for (let attempt = 0; attempt < 200; attempt++) {
        target.reset(); const start = performance.now()
        if (!target.renderer.tryBeginFrame(frame)) { await task(); continue }
        target.renderer.beginCamera(camera); action(target.renderer); target.renderer.endCamera(); const stats = target.renderer.endFrame()
        timings[kind].push(performance.now() - start); bytes[kind].push(target.counts.uploadBytes); requests[kind].push({ ...target.counts, drawCalls: stats.drawCalls, triangles: stats.triangles }); return
      }
      throw Error('10k admission timed out')
    }
    try {
      for (let index = 0; index < 6; index++) { await submit(control, action); await submit(actual, action) }
      for (let index = 0; index < 12; index++) { for (const kind of index % 2 ? ['instanced', 'geometry'] : ['geometry', 'instanced']) await timed(kind === 'instanced' ? actual : control, kind); await task() }
      await submit(control, action); const reference = pixels(control.canvas); await submit(actual, action); const output = pixels(actual.canvas)
      observations.push({ name: '10000-visible-sprites-complete-renderer-cpu-short-smoke', count: 10000, visibleCount: 10000, quality: 'QualityLocked 800x450 DPR1 AA Off, same objects/atlas/tints/order; 6 warmups + 12 alternating samples per variant', before: { cpuMs: distribution(timings.geometry), uploadBytes: bytes.geometry, requests: requests.geometry }, after: { cpuMs: distribution(timings.instanced), uploadBytes: bytes.instanced, requests: requests.instanced }, scope: 'Command creation + transform/color preparation + sorting/batch packing + actual buffer API uploads/drawing/resolve + GPU fence submission. No GPU wait/readback inside timed section. Excludes Editor traversal, GPU execution and display; NOT formal B1.' })
      assert(reference.every((value, index) => value === output[index]), '10k rotated/negative-scale/flipped/tinted pixels differ')
      captures.push({ name: '10000-sprites-instance', data: actual.canvas.toDataURL() })
      assert(requests.instanced.every(value => value.instanced === 1 && value.instances === 10000 && value.geometry === 0 && value.drawCalls === 1 && value.triangles === 20000), 'Production submitSprite did not issue exactly one actual 10k instanced draw')
      assert(bytes.instanced.every(value => value === 640000) && bytes.geometry.every(value => value === 1520000), 'Unexpected actual sprite CPU-to-GPU upload size')
      assert(requests.instanced.every(value => value.allocations === 0), 'Steady instanced frame reallocated GPU buffers')
    } finally { control.destroy(); actual.destroy() }
  })
  await check('Actual mixed sprite/mesh/nine-slice/material/blend/filter/camera batches preserve exact transparent pixels and MSAA/post', async () => {
    for (const aa of ['Off', 'MSAA4']) {
      const control = make(false, aa), actual = make(true, aa)
      for (const target of [control, actual]) { target.environment.settings.postProcessing.enabled = aa !== 'Off'; target.environment.postProcessing.exposure = .15 }
      const action = renderer => {
        const base = { ...command(1), position: { x: 0, y: 0 }, size: { x: 230, y: 160 }, scale: { x: -1.2, y: .8 }, rotation: .31 }
        renderer.submitSprite({ ...base, orderInLayer: 3, tint: color(255, 170, 240, .43) })
        renderer.submitSprite({ ...base, orderInLayer: 3.5, texture: otherRegion, tint: color(110, 150, 230, .23) })
        renderer.submitSprite({ ...base, orderInLayer: 3.75, tint: color(170, 90, 255, .31) })
        renderer.submitSprite({ ...base, orderInLayer: 1, tint: color(110, 255, 170, .37) })
        renderer.submitSprite({ ...base, orderInLayer: 2, nineSlice: { left: 1, right: 1, top: 1, bottom: 1 }, tint: color(255, 190, 110, .41) })
        renderer.submitSprite({ ...base, orderInLayer: 4, mesh: { positions: [{ x: -100, y: -70 }, { x: 100, y: -70 }, { x: 0, y: 100 }], uvs: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: .5, y: 1 }], indices: [0, 1, 2] }, tint: color(80, 220, 255, .29) })
        renderer.submitSprite({ ...base, orderInLayer: 5, material: 'asset://custom', tint: color(190, 90, 255, .23) })
        renderer.submitSprite({ ...base, orderInLayer: 6, blendMode: 'Additive', tint: color(30, 90, 150, .21) })
        renderer.submitSprite({ ...base, orderInLayer: 6.5, blendMode: 'Alpha', tint: color(80, 30, 130, .17) })
        renderer.submitSprite({ ...base, orderInLayer: 7, blendMode: 'Multiply', texture: { ...region, filter: 'Linear' }, tint: color(250, 230, 210, .31) })
        renderer.submitSprite({ ...base, orderInLayer: 8, blendMode: 'Screen', tint: color(15, 20, 25, .11) })
        renderer.submitTileChunk({ sprites: [{ ...base, position: { x: 250, y: 0 }, size: { x: 50, y: 50 } }], sortingLayer: 1, orderInLayer: 9, material: 'Particles', blendMode: 'Alpha' })
        renderer.submitShape({ shape: 'Rectangle', position: { x: -250, y: 0 }, rotation: .15, scale: { x: -1, y: 1 }, vertices: [{ x: -30, y: -30 }, { x: 30, y: -30 }, { x: 30, y: 30 }, { x: -30, y: 30 }], radiusX: 1, radiusY: 1, fill: color(90, 190, 250, .63), stroke: color(0, 0, 0, 0), strokeWidth: 0, sortingLayer: 1, orderInLayer: 10, material: 'Default' })
        renderer.submitText({ position: { x: 0, y: -170 }, rotation: .1, scale: { x: 1, y: 1 }, text: 'Nova 中文', fontFamily: 'sans-serif', fontSize: 32, fontWeight: 500, lineHeight: 1.2, align: 'center', color: color(240, 220, 190, .81), outlineColor: color(0, 0, 0, 0), outlineWidth: 0, maxWidth: 0, sortingLayer: 1, orderInLayer: 11, material: 'Default' })
        renderer.endCamera(); renderer.beginCamera({ ...camera, viewport: { x: .7, y: .2, width: .25, height: .5 }, rotation: -.19 }); renderer.submitSprite({ ...base, size: { x: 80, y: 60 } })
      }
      try {
        await submit(control, action); const reference = pixels(control.canvas); await submit(actual, action); const output = pixels(actual.canvas)
        observations.push({ name: 'mixed-instance-geometry-' + aa, exactPixelDifferences: reference.filter((value, index) => value !== output[index]).length, before: { ...control.counts, stats: { ...control.renderer.stats } }, after: { ...actual.counts, stats: { ...actual.renderer.stats } } })
        assert(reference.every((value, index) => value === output[index]), 'Mixed batch transparent/MSAA/post/camera pixels differ: ' + aa)
        assert(actual.counts.instanced > 0 && actual.counts.geometry >= 3 && actual.renderer.stats.shaderFallbacks === 0, 'Mixed production did not retain actual mesh/nine-slice/custom programs')
        assert(actual.renderer.stats.batchBreakReasons.pipeline > 0, 'Mixed geometry/instance transition missing legal pipeline break')
        assert(actual.renderer.stats.batchBreakReasons.texture > 0 && actual.renderer.stats.batchBreakReasons.filter > 0 && actual.renderer.stats.batchBreakReasons.blend > 0 && actual.renderer.stats.batchBreakReasons.camera > 0, 'Mixed state transitions were not recorded as legal breaks')
        captures.push({ name: 'mixed-instance-' + aa, data: actual.canvas.toDataURL() })
      } finally { control.destroy(); actual.destroy() }
    }
  })
  await check('Instance pools and legal batches remain bounded; rejected values and mutable commands match old geometry', async () => {
    const control = make(false), actual = make(true)
    const count = 33000, action = renderer => { for (let index = 0; index < count; index++) renderer.submitSprite({ ...command(index % 10000), size: { x: .5, y: .5 }, tint: color(80, 100, 120, .2) }) }
    try {
      await submit(control, action); const reference = pixels(control.canvas); await submit(actual, action); const output = pixels(actual.canvas)
      assert(reference.every((value, index) => value === output[index]), 'Bounded multi-batch transparent pixels differ')
      assert(actual.counts.instanced === 3 && actual.counts.instances === count && actual.counts.uploadBytes === count * 64, '65k virtual vertex limit did not bound actual instance batches')
      assert(actual.renderer.instanceUpload.length <= 16250 * 16 && actual.renderer.instanceCapacityBytes <= 16250 * 64, 'Instance batch staging/GPU capacity exceeds bound')
      const capacity = actual.renderer.instanceCapacityBytes; actual.reset(); await submit(actual, action); assert(actual.counts.allocations === 0 && actual.renderer.instanceCapacityBytes === capacity, 'Repeat bounded frames reallocated instance storage')
      const snapshot = renderer => {
        const shared = { ...command(0), position: { x: -100, y: 0 }, size: { x: 50, y: 50 }, tint: color(255, 190, 90, .65) }
        renderer.submitSprite(shared); shared.position.x = 100; shared.size.x = 70; shared.tint.r = 30; renderer.submitSprite(shared)
        renderer.submitSprite({ ...shared, position: { x: NaN, y: 0 } }); renderer.submitSprite({ ...shared, rotation: Infinity }); renderer.submitSprite({ ...shared, texture: { ...region, uv: { ...region.uv, x: NaN } } })
      }
      await submit(control, snapshot); const snapshotReference = pixels(control.canvas); actual.reset(); await submit(actual, snapshot); const snapshotOutput = pixels(actual.canvas)
      assert(snapshotReference.every((value, index) => value === snapshotOutput[index]) && actual.counts.instances === 2, 'Snapshot/rejected nonfinite semantics differ from old geometry')
      observations.push({ name: 'bounded-instance-pools', count, actualBatchLimit: 16250, batchStagingBytes: actual.renderer.instanceUpload.byteLength, gpuCapacityBytes: capacity, frameStagingBytes: actual.renderer.instanceData.byteLength, exactPixelDifferences: 0, steadyGpuAllocations: 0 })
      const array = actual.renderer.instanceData; actual.renderer.destroy(); actual.renderer.destroy(); assert(actual.renderer.instanceData.length === 0 && actual.renderer.instanceUpload.length === 0 && array !== actual.renderer.instanceData, 'Destroy retained instance staging buffers')
    } finally { control.destroy(); actual.destroy() }
  })
  await check('Cold instance allocation failure preserves full WebGL2 geometry and records a bounded compatibility reason', async () => {
    const control = make(false), failed = make(true, 'Off', true), action = renderer => renderer.submitSprite({ ...command(0), position: { x: 0, y: 0 }, size: { x: 150, y: 100 } })
    try {
      await submit(control, action); const reference = pixels(control.canvas); await submit(failed, action); const output = pixels(failed.canvas)
      assert(reference.every((value, index) => value === output[index]), 'Instance initialization failure reduced or changed compatibility image')
      assert(failed.renderer.stats.spriteInstancing === false && failed.renderer.stats.spriteInstanceFallbackReason && failed.counts.geometry === 1 && failed.counts.instanced === 0, 'Failed instance initialization did not select the explicit geometry path')
      failed.reset(); await submit(failed, action); assert(failed.counts.allocations === 0 && failed.counts.instanced === 0, 'Initialization failure reattempted per frame')
      observations.push({ name: 'instance-cold-allocation-failure', backend: failed.renderer.stats.backend, reason: failed.renderer.stats.spriteInstanceFallbackReason, exactPixelDifferences: 0, runtimeRetries: 0, scope: 'Controlled null GPU buffer allocation during actual constructor; real retained geometry draw, no quality change.' })
    } finally { control.destroy(); failed.destroy() }
  })
}
