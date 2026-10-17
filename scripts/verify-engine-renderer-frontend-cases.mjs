/** Actual scene/asset/tile/particle/skin owners; pre-injection scene source is a locked local control. */
export async function verifyFrontendCases(h) {
  const { check, assert, observations, captures, WebGL2Renderer, scene, sceneEnvironment, BoxEntity, components, assets, defaultImportSettings, camera, color, pixels, renderingSettings, recordDevice } = h
  const [before, adapter, tiles, rigging, particles, core] = await Promise.all([import('/src/renderer/__frontendBaseline.ts'), import('/src/editor/rendererAdapter.ts'), import('/src/runtime/tilemap.ts'), import('/src/runtime/rigging.ts'), import('/src/runtime/particles.ts'), import('/src/renderer/core.ts')])
  const task = () => new Promise(resolve => setTimeout(resolve, 2))
  const baseOptions = { width: 256, height: 128, pixelRatio: 1, editorCamera: camera, gameView: false, activeLayer: 1, renderLayer: 'all', canvasColor: '#10151a', connections: [], performanceMode: true }
  const make = (environment = adapter.editorRendererEnvironment(), canvasOnly = false) => {
    const canvas = document.createElement('canvas'), renderer = core.createRenderer2D(canvas, canvasOnly, environment)
    if (!canvasOnly) recordDevice(renderer)
    return { canvas, renderer }
  }
  const render = async (module, target, entities, options, environment) => {
    for (let retry = 0; retry < 100; retry++) {
      const stats = module.renderWorld(target.renderer, entities, options, environment)
      if (Number.isFinite(stats.cpuSubmissionAtMs)) return stats
      await task()
    }
    throw Error('Frontend submission did not return after bounded real task boundaries')
  }
  // Untimed diagnostic interception only: capture actual upload bytes and draw-state snapshots.
  // These synchronous state queries must never enter production or CPU/GPU timing samples.
  const traceFrame = async (module, target, entities, options, environment) => {
    const gl = target.renderer.gl, original = {}, records = []; let recording = false
    const drawState = () => ({ viewport: Array.from(gl.getParameter(gl.VIEWPORT)), scissor: gl.isEnabled(gl.SCISSOR_TEST), scissorBox: Array.from(gl.getParameter(gl.SCISSOR_BOX)), framebuffer: gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) === target.renderer.sampleFramebuffer ? 'msaa' : gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) === target.renderer.framebuffer ? 'resolve' : 'default', blend: gl.isEnabled(gl.BLEND), blendSrc: gl.getParameter(gl.BLEND_SRC_RGB), blendDst: gl.getParameter(gl.BLEND_DST_RGB), dither: gl.isEnabled(gl.DITHER), colorMask: Array.from(gl.getParameter(gl.COLOR_WRITEMASK)), textureMinFilter: gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER), textureMagFilter: gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER) })
    for (const method of ['clear', 'bufferSubData', 'uniform4f', 'uniform2f', 'uniform1i', 'drawElements', 'drawElementsInstanced', 'drawArrays', 'blitFramebuffer']) {
      original[method] = gl[method]
      gl[method] = function (...args) {
        if (method === 'clear') { recording = true; records.length = 0 }
        if (recording) {
          if (method === 'bufferSubData') { const input = args[2], offset = (args[3] ?? 0) * input.BYTES_PER_ELEMENT, length = (args[4] ?? input.length) * input.BYTES_PER_ELEMENT; records.push([method, args[0], args[1], Array.from(new Uint8Array(input.buffer, input.byteOffset + offset, length))]) }
          else if (method.startsWith('uniform')) records.push([method, ...args.slice(1)])
          else records.push([method, args, method === 'clear' || method.startsWith('draw') ? drawState() : null])
        }
        return original[method].apply(gl, args)
      }
    }
    try { const stats = await render(module, target, entities, options, environment); return { stats, records } } finally { Object.assign(gl, original) }
  }
  const normalized = value => JSON.parse(JSON.stringify(value, (key, entry) => key === 'source' ? '<same source owner>' : entry))
  const commands = (module, entities, options, environment) => {
    const records = [], renderer = { stats: { backend: 'WebGL2' }, tryBeginFrame(frame) { records.push(['frame', frame]); return true }, beginCamera(view) { records.push(['camera', view]) }, submitSprite(command) { records.push(['sprite', command]) }, submitTileChunk(command) { records.push(['tile', command]) }, submitShape(command) { records.push(['shape', command]) }, submitText(command) { records.push(['text', command]) }, endCamera() { records.push(['end-camera']) }, endFrame() { return { cpuSubmissionAtMs: performance.now() } } }
    module.renderWorld(renderer, entities, options, environment)
    return normalized(records)
  }

  await check('Editor backend/frontend use identical settings/assets and original tile/skin/particle owners', () => {
    const backend = adapter.editorRendererEnvironment()
    assert(sceneEnvironment === adapter.editorSceneRendererEnvironment(), 'Editor created multiple scene service containers')
    assert(backend.settings === sceneEnvironment.settings && backend.assets === sceneEnvironment.assets, 'Frontend/backend settings or resource sources diverged')
    assert(sceneEnvironment.tileChunkCommands === tiles.tileChunkCommands && sceneEnvironment.deformSkin === rigging.deformSkin, 'Tile or rig algorithm/cache owner was duplicated')
    const original = particles.particleRuntime.submit; let calls = 0
    particles.particleRuntime.submit = function (renderer, entities) { calls++; return original.call(this, renderer, entities) }
    try { sceneEnvironment.submitParticles({ stats: { backend: 'WebGL2' } }, []); assert(calls === 1, 'Adapter did not invoke the original particle owner exactly once') } finally { particles.particleRuntime.submit = original }
  })
  await check('Explicit partial service environments fail before drawing rather than silently dropping features', () => {
    for (const missing of ['settings', 'assets', 'assetKind', 'fontMetadata', 'publishPostProcess', 'publishRenderQuality', 'tileChunkCommands', 'submitParticles', 'deformSkin']) {
      const incomplete = { ...sceneEnvironment, [missing]: undefined }; let draws = 0, failure = ''
      try { scene.renderWorld({ beginFrame() { draws++ }, tryBeginFrame() { draws++; return true } }, [], baseOptions, incomplete) } catch (error) { failure = String(error) }
      assert(failure.includes('SCENE_ENVIRONMENT_REQUIRED') && draws === 0, missing + ' silently accepted or drew')
    }
  })

  const records = []
  const textRecord = (type, document) => {
    const record = { uuid: crypto.randomUUID(), name: 'Frontend.' + type, path: 'Assets/Frontend.' + type, assetType: type, source: 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(document)), sourceModified: 1, settings: defaultImportSettings() }
    records.push(record); return record
  }
  const surface = document.createElement('canvas'); surface.width = 8; surface.height = 4
  const ctx = surface.getContext('2d'); ctx.fillStyle = '#ea376e'; ctx.fillRect(0, 0, 4, 4); ctx.fillStyle = '#32bada'; ctx.fillRect(4, 0, 4, 4)
  const image = { uuid: crypto.randomUUID(), name: 'Frontend.png', path: 'Assets/Frontend.png', assetType: 'image', source: surface.toDataURL(), width: 8, height: 4, sourceModified: 1, settings: defaultImportSettings() }; records.push(image)
  const imageRef = 'asset://' + image.uuid
  const tileSet = textRecord('tileset', { version: 2, textureAsset: imageRef, tileWidth: 4, tileHeight: 4, columns: 2, rows: 1, tiles: [{ index: 0, animation: { frames: [0, 1], framesPerSecond: 4, mode: 'Loop' } }] })
  const material = textRecord('material', { fragment: 'vec4 nova_material(vec4 baseColor,vec2 uv){return vec4(baseColor.rgb*vec3(.75,1.,.9),baseColor.a);}', blendMode: 'Alpha', sampling: 'Nearest', uniforms: {}, textures: {} })
  const rig = textRecord('rig', rigging.defaultRig()), skinDocument = rigging.defaultSkin(); skinDocument.rigAsset = 'asset://' + rig.uuid
  const skin = textRecord('skin', skinDocument)
  const font = textRecord('font', {}); font.fontFamily = 'sans-serif'; font.settings.fontSettings.fallbackFamilies = ['monospace', 'Test "Family"']; font.settings.fontSettings.outlineWidth = .07
  assets.assetState.records.push(...records); assets.assetState.generation++
  const entity = (id, position) => { const value = new BoxEntity(id, position, { x: 1, y: 1 }); value.layer = 1; value.renderer.enabled = false; return value }
  const tileEntity = entity(1801, { x: -4, y: -2 }), map = new components.TileMap2D(); map.width = 4; map.height = 2; map.tiles = Array(8).fill(0); map.layers[0].tiles = map.tiles; map.layers[0].transforms = Array(8).fill(0); map.tileSetAsset = 'asset://' + tileSet.uuid; tileEntity.addComponent(map)
  const spriteEntity = entity(1802, { x: 1, y: 1 }), sprite = new components.SpriteRenderer2D(); sprite.spriteAsset = imageRef; sprite.size = { x: 4, y: 2 }; sprite.opacity = 72.5; sprite.flipX = true; sprite.material = 'asset://' + material.uuid; spriteEntity.transform.rotation = .23; spriteEntity.transform.scale = { x: -1.1, y: .8 }; spriteEntity.addComponent(sprite)
  const skeleton = new components.Skeleton2D(); skeleton.rigAsset = 'asset://' + rig.uuid; skeleton.skinAsset = 'asset://' + skin.uuid; skeleton.pose = [{ boneId: 'root', position: { x: .15, y: .08 }, rotation: .17, scale: { x: 1.05, y: .9 } }]; spriteEntity.addComponent(skeleton)
  const nineEntity = entity(1803, { x: 3, y: -1 }), nine = new components.SpriteRenderer2D(); nine.spriteAsset = imageRef; nine.size = { x: 3, y: 2 }; nine.nineSlice = { enabled: true, left: 1, top: 1, right: 1, bottom: 1 }; nine.orderInLayer = 2; nineEntity.addComponent(nine)
  const textEntity = entity(1804, { x: 0, y: 2.5 }), text = new components.TextRenderer2D(); text.text = 'Nova 中文'; text.fontAsset = 'asset://' + font.uuid; text.fontFamily = 'serif'; text.fontSize = .8; text.opacity = 81.25; text.sortingLayer = 2; textEntity.addComponent(text)
  // Particle RNG is keyed by authored UUID: freeze this content input for reproducible A/B.
  const emitterEntity = entity(1805, { x: -2, y: 1 }), emitter = new components.ParticleEmitter2D('00000000-0000-4000-8000-000000001805'); emitter.burst = 3; emitter.emissionRate = 0; emitter.textureAsset = imageRef; emitter.gravity = { x: 0, y: 0 }; emitter.initialVelocityMin = emitter.initialVelocityMax = { x: .3, y: .1 }; emitter.startScale = .6; emitter.endScale = .6; emitter.trailEnabled = true; emitterEntity.addComponent(emitter)
  const parent = entity(1806, { x: 0, y: 0 }); parent.authoring.kind = 'ParallaxLayer'; parent.authoring.parallax.motionScale = { x: .7, y: .9 }; parent.authoring.parallax.repeat = { x: 7, y: 0 }; parent.authoring.parallax.mirror = true; nineEntity.parentUuid = parent.uuid
  const shapeEntity = entity(1807, { x: -1, y: -1 }); shapeEntity.renderer.enabled = true; shapeEntity.renderer.material = 'asset://' + material.uuid; shapeEntity.renderer.opacity = 60; shapeEntity.transform.rotation = -.4
  const cameraEntity = entity(1808, { x: .2, y: .1 }), cam = new components.Camera2D(); cam.orthographicSize = 4; cam.viewport = { x: 0, y: 0, width: .55, height: 1 }; cam.smoothing.enabled = true; cam.followTargetUuid = shapeEntity.uuid; cameraEntity.addComponent(cam)
  const cameraEntity2 = entity(1809, { x: .7, y: -.2 }), cam2 = new components.Camera2D(); cam2.orthographicSize = 4; cam2.viewport = { x: .55, y: 0, width: .45, height: 1 }; cam2.priority = 1; cameraEntity2.addComponent(cam2)
  const entities = [tileEntity, spriteEntity, nineEntity, textEntity, emitterEntity, parent, shapeEntity, cameraEntity, cameraEntity2]
  try {
    assets.resolveTexture(imageRef)
    for (let retry = 0; retry < 100 && assets.imageDecodedCacheStats().pending; retry++) await new Promise(resolve => setTimeout(resolve, 10))
    assert(assets.resolveTexture(imageRef), 'Actual image owner did not decode source')
    particles.particleRuntime.update(entities, .02, true); particles.particleRuntime.update(entities, .05, true)
    tiles.setTileAnimationTime(0)
    await check('Original and injected scene produce identical complete mixed feature commands, fonts and multicamera mesh borrowing', () => {
      before.resetCameraSmoothing(); scene.resetCameraSmoothing()
      const options = { ...baseOptions, gameView: true, deltaSeconds: .016 }
      const expected = commands(before, entities, options), counts = { skin: 0, tile: 0, particles: 0, post: 0, quality: 0 }
      const environment = { ...sceneEnvironment, deformSkin(...args) { counts.skin++; return sceneEnvironment.deformSkin(...args) }, tileChunkCommands(...args) { counts.tile++; return sceneEnvironment.tileChunkCommands(...args) }, submitParticles(...args) { counts.particles++; return sceneEnvironment.submitParticles(...args) }, publishPostProcess(...args) { counts.post++; sceneEnvironment.publishPostProcess(...args) }, publishRenderQuality(...args) { counts.quality++; sceneEnvironment.publishRenderQuality(...args) } }
      const actual = commands(scene, entities, options, environment)
      assert(JSON.stringify(expected) === JSON.stringify(actual), 'Injected frontend altered command, camera, layer, transparent order, font or material fields')
      assert(counts.skin === 2 && counts.tile === 2 && counts.particles === 2 && counts.post === 1 && counts.quality === 1, 'Per-frame/per-camera service invocation semantics changed: ' + JSON.stringify(counts))
      const fontCommand = actual.find(value => value[0] === 'text')[1]
      assert(fontCommand.fontFamily === 'sans-serif, monospace, "Test Family"' && fontCommand.outlineWidth === .07 && fontCommand.outlineColor.a === .8125, 'Imported font/fallback/outline semantics lost')
      assert(actual.some(value => value[0] === 'sprite' && value[1].mesh?.indices.length === 6), 'Actual rig owner produced no mesh')
      assert(actual.some(value => value[0] === 'shape' && value[1].orderInLayer === -.001), 'Existing particle trails were absent')
      observations.push({ name: 'shared-owner-command-equivalence', commands: actual.length, invocations: counts, exactEqual: true, scope: 'Original scene source against injected single frontend; real original assets/tile/particle/rig owners. No replacement algorithm.' })
    })
    await check('Original and injected actual mixed scene pixels match in WebGL2, MSAA/post and Canvas2D diagnostic', async () => {
      const failures = []
      for (const mode of ['WebGL2', 'WebGL2-MSAA4-post', 'Canvas2D']) {
        renderingSettings.antiAliasing = mode.includes('MSAA4') ? 'MSAA4' : 'Off'; renderingSettings.postProcessing.enabled = mode.includes('post')
        before.resetCameraSmoothing(); scene.resetCameraSmoothing()
        const old = make(undefined, mode === 'Canvas2D'), current = make(undefined, mode === 'Canvas2D'), options = { ...baseOptions, gameView: true, deltaSeconds: .016 }
        try {
          const oldStats = await render(before, old, entities, options), stats = await render(scene, current, entities, options, sceneEnvironment)
          const expected = pixels(old.canvas), actual = pixels(current.canvas), differences = expected.reduce((total, value, index) => total + (value !== actual[index] ? 1 : 0), 0)
          captures.push({ name: 'frontend-before-' + mode.toLowerCase(), data: old.canvas.toDataURL() }, { name: 'frontend-after-' + mode.toLowerCase(), data: current.canvas.toDataURL() })
          observations.push({ name: 'frontend-old-new-pixels', mode, differences, sprites: stats.sprites, drawCalls: stats.drawCalls, mismatches: expected.flatMap((value, index) => value !== actual[index] ? [{ index, old: value, current: actual[index] }] : []).slice(0, 32), scope: 'Frozen pre-injection scene source with same retained owners/backends; exact channel equality; no golden fixture or tolerance changes.' })
          before.resetCameraSmoothing()
          await render(before, old, entities, options)
          const repeatedOld = pixels(old.canvas), oldRepeatDifferences = expected.reduce((total, value, index) => total + (value !== repeatedOld[index] ? 1 : 0), 0)
          observations.push({ name: 'frontend-old-old-repeat-control', mode, differences: oldRepeatDifferences })
          assert(oldRepeatDifferences === 0, mode + ' original source itself changed on repeat')
          assert(differences === 0, mode + ' changed ' + differences + ' exact pixel channels')
          assert(oldStats.sprites === stats.sprites && oldStats.drawCalls === stats.drawCalls, mode + ' changed submitted feature counts')
        } catch (error) { failures.push(mode + ': ' + String(error)) } finally { old.renderer.destroy(); current.renderer.destroy() }
      }
      assert(failures.length === 0, failures.join('; '))
    })
    await check('Animated tile time, chunk cache and local dirty revisions keep their existing unique owner', () => {
      const bounds = { minX: -100, maxX: 100, minY: -100, maxY: 100 }
      tiles.setTileAnimationTime(0); const first = sceneEnvironment.tileChunkCommands(tileEntity, map, entities, bounds, { x: 0, y: 0 })
      const originalOwner = tiles.tileChunkCommands(tileEntity, map, entities, bounds, { x: 0, y: 0 })
      assert(first[0] === originalOwner[0], 'Adapter introduced a second chunk cache')
      const firstUv = first[0].sprites[0].texture.uv.x
      tiles.setTileAnimationTime(.3); const next = sceneEnvironment.tileChunkCommands(tileEntity, map, entities, bounds, { x: 0, y: 0 })
      assert(next[0] !== first[0] && next[0].sprites[0].texture.uv.x !== firstUv, 'Original animation time failed to invalidate/update cached texture region')
      const update = tiles.readRuntimeTileChunk(map, 'base', 0, 0); update.tiles[0] = 1
      assert(tiles.writeRuntimeTileChunk(map, update), 'Existing runtime tile writer rejected the local change')
      const edited = sceneEnvironment.tileChunkCommands(tileEntity, map, entities, bounds, { x: 0, y: 0 })
      assert(edited[0] !== next[0], 'Original local dirty tile owner was bypassed')
      tiles.setTileAnimationTime(0)
      assert(JSON.stringify(commands(before, entities, baseOptions)) === JSON.stringify(commands(scene, entities, baseOptions, sceneEnvironment)), 'Animated/edited tile frontend fields differ')
    })
    await check('Untimed original MSAA repeat diagnostics identify actual uploads, viewport/scissor and geometry versus instance controls', async () => {
      renderingSettings.antiAliasing = 'MSAA4'; renderingSettings.postProcessing.enabled = true
      const readSurface = (target, resolved) => {
        const gl = target.renderer.gl, previous = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING), bytes = new Uint8Array(target.canvas.width * target.canvas.height * 4)
        try { gl.bindFramebuffer(gl.READ_FRAMEBUFFER, resolved ? target.renderer.framebuffer : null); gl.readPixels(0, 0, target.canvas.width, target.canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, bytes); assert(gl.getError() === gl.NO_ERROR, 'Untimed surface read failed'); return bytes } finally { gl.bindFramebuffer(gl.READ_FRAMEBUFFER, previous) }
      }
      for (const instancing of [false, true]) {
        const target = make({ ...adapter.editorRendererEnvironment(), spriteInstancing: instancing }), options = { ...baseOptions, gameView: true, deltaSeconds: .016 }
        try {
          before.resetCameraSmoothing(); const first = await traceFrame(before, target, entities, options), initial = pixels(target.canvas)
          const firstCapture = target.canvas.toDataURL(), firstResolved = readSurface(target, true), firstDefault = readSurface(target, false)
          before.resetCameraSmoothing(); const second = await traceFrame(before, target, entities, options), repeated = pixels(target.canvas)
          const secondResolved = readSurface(target, true), secondDefault = readSurface(target, false)
          const differences = initial.reduce((total, value, index) => total + (value !== repeated[index] ? 1 : 0), 0)
          const resolvedDifferences = firstResolved.reduce((total, value, index) => total + (value !== secondResolved[index] ? 1 : 0), 0), defaultDifferences = firstDefault.reduce((total, value, index) => total + (value !== secondDefault[index] ? 1 : 0), 0)
          const relevant = records => normalized(records).map(record => {
            if (record[0] !== 'clear') return record
            // GLES glClear ignores blend and viewport; disabled scissor makes its box irrelevant.
            const state = record[2]
            delete state.blend; delete state.blendSrc; delete state.blendDst; delete state.viewport; delete state.textureMinFilter; delete state.textureMagFilter
            if (!state.scissor) delete state.scissorBox
            return record
          })
          const equalCommands = JSON.stringify(relevant(first.records)) === JSON.stringify(relevant(second.records))
          observations.push({ name: 'original-msaa-real-gl-repeat-diagnostic', spriteInstancing: instancing, differences, resolvedDifferences, defaultDifferences, equalCommands, first: first.records, second: second.records, scope: 'Untimed diagnostic state queries, synchronous readPixels and complete buffer uploads. Original pre-injection frontend, same content/policy. Reads resolved offscreen and default surfaces to locate repeat discrepancy; no claimed timing or accepted image failure.' })
          captures.push({ name: 'original-msaa-' + (instancing ? 'instance' : 'geometry') + '-first', data: firstCapture }, { name: 'original-msaa-' + (instancing ? 'instance' : 'geometry') + '-repeat', data: target.canvas.toDataURL() })
          assert(equalCommands, 'Original repeat changed actual GL input bytes/uniforms/viewport/scissor/filter state')
        } finally { target.renderer.destroy() }
      }
    })
  } finally {
    tiles.setTileAnimationTime(null); particles.particleRuntime.reset(); before.resetCameraSmoothing(); scene.resetCameraSmoothing()
    for (const record of records) assets.assetState.records.splice(assets.assetState.records.findIndex(value => value.uuid === record.uuid), 1)
    assets.assetState.generation++
    renderingSettings.antiAliasing = 'Off'; renderingSettings.postProcessing.enabled = false
  }

  await check('Explicit frontend owners isolate same-name resources, fonts, skin and particle services from Editor migration values', async () => {
    const seen = []
    const isolated = channel => {
      const environment = { settings: core.normalizeRenderingSettings({ ...core.DEFAULT_RENDERING_SETTINGS, antiAliasing: 'Off', textureStreaming: { enabled: false } }), postProcessing: { ...core.DEFAULT_RENDERING_SETTINGS.postProcessing, enabled: false }, assets: { generation: channel, atlasPageCount: 0, resolveTexture: () => null, readMaterialSource: () => JSON.stringify({ fragment: `vec4 nova_material(vec4 baseColor,vec2 uv){return vec4(${channel === 1 ? '1.,0.,0.' : '0.,0.,1.'},1.);}` }) } }
      const frontend = { settings: environment.settings, assets: environment.assets, assetKind: () => 'material', fontMetadata: () => ({ family: channel === 1 ? 'serif' : 'monospace', fallbackFamilies: [], outlineWidth: 0 }), publishPostProcess() { seen.push(channel + ':post') }, publishRenderQuality() { seen.push(channel + ':quality') }, tileChunkCommands() { throw Error('Unrequested tile service') }, submitParticles() { seen.push(channel + ':particles') }, deformSkin() { throw Error('Unrequested skin service') } }
      return { ...make(environment), frontend }
    }
    const first = isolated(1), second = isolated(2), value = entity(1810, { x: 0, y: 0 }); value.renderer.enabled = true; value.renderer.material = 'asset://same-name'
    try {
      await render(scene, first, [value], baseOptions, first.frontend); await render(scene, second, [value], baseOptions, second.frontend)
      const red = pixels(first.canvas), blue = pixels(second.canvas), center = (64 * 256 + 128) * 4
      assert(red[center] === 255 && red[center + 2] === 0 && blue[center] === 0 && blue[center + 2] === 255, 'Frontend ignored injected same-name material owner')
      assert(seen.join(',') === '1:post,1:quality,1:particles,2:post,2:quality,2:particles', 'Service callbacks crossed environment owners')
      const label = entity(1811, { x: 0, y: 0 }), component = new components.TextRenderer2D(); component.text = 'Owner'; label.addComponent(component)
      const one = commands(scene, [label], baseOptions, first.frontend), two = commands(scene, [label], baseOptions, second.frontend)
      assert(one.find(value => value[0] === 'text')[1].fontFamily === 'serif' && two.find(value => value[0] === 'text')[1].fontFamily === 'monospace', 'Font metadata leaked from Editor migration owner')
    } finally { first.renderer.destroy(); second.renderer.destroy() }
  })
}
