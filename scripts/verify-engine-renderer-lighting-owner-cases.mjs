/** Independent actual Canvas regressions; original lighting source is a frozen virtual control. */
export async function lightingOwnerCases() {
  const [before, lighting, adapter, components, { BoxEntity }, assets, { defaultImportSettings }, settings] = await Promise.all([
    import('/src/renderer/__lightingOwnerBefore.ts'), import('/src/renderer/lighting2d.ts'), import('/src/editor/rendererAdapter.ts'),
    import('/src/world/components.ts'), import('/src/world/BoxEntity.ts'), import('/src/assets/AssetDatabase.ts'), import('/src/assets/types.ts'), import('/src/renderer/renderSettings.ts')
  ])
  const environment = adapter.editorLightingEnvironment(), checks = [], comparisons = [], captures = []
  const assert = (value, message) => { if (!value) throw Error(message) }
  const check = async (name, action) => { try { await action(); checks.push({ name, status: 'passed' }) } catch (error) { checks.push({ name, status: 'failed', error: String(error.stack ?? error) }) } }
  const hash = async values => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(values))), byte => byte.toString(16).padStart(2, '0')).join('')
  const original = { settings: JSON.parse(JSON.stringify(settings.renderingSettings)), post: { ...settings.activePostProcessing }, quality: { ...settings.activeRenderQuality } }
  const options = { width: 128, height: 96, editorCamera: { scale: 12, offset: { x: 64, y: 48 } }, activeLayer: 1, gameView: false }
  const normalize = value => typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean' ? value : value instanceof HTMLCanvasElement ? `canvas:${value.width}x${value.height}` : Object.prototype.toString.call(value)
  const make = (ratio = 1) => { const canvas = document.createElement('canvas'); canvas.width = options.width * ratio; canvas.height = options.height * ratio; const context = canvas.getContext('2d', { willReadFrequently: true }); context.setTransform(ratio, 0, 0, ratio, 0, 0); context.fillStyle = '#243042'; context.fillRect(0, 0, options.width, options.height); return { canvas, context } }
  const pixels = target => Array.from(target.context.getImageData(0, 0, target.canvas.width, target.canvas.height).data)
  const traceContext = (context, trace) => new Proxy(context, { get(target, key) { const value = Reflect.get(target, key, target); return typeof value === 'function' ? (...args) => { trace.push({ call: key, args: args.map(normalize) }); return Reflect.apply(value, target, args) } : value }, set(target, key, value) { trace.push({ set: key, value: normalize(value) }); return Reflect.set(target, key, value, target) } })
  const rendered = (implementation, entities, view = options, ratio = 1) => {
    const target = make(ratio), trace = [], context = traceContext(target.context, trace)
    implementation.renderLighting2D(context, entities, view, environment)
    implementation.renderPostProcessOverlay(context, view.width, view.height, environment)
    implementation.renderDebugView2D(context, entities, view, environment)
    return { ...target, trace, pixels: pixels(target), filter: implementation.worldPostProcessFilter(environment) }
  }
  const compare = async (name, entities, view = options, ratio = 1) => {
    const old = rendered(before, entities, view, ratio), current = rendered(lighting, entities, view, ratio)
    const differentChannels = old.pixels.reduce((count, value, index) => count + Number(value !== current.pixels[index]), 0)
    const observation = { name, width: old.canvas.width, height: old.canvas.height, differentChannels, oldHash: await hash(old.pixels), newHash: await hash(current.pixels), sameTrace: JSON.stringify(old.trace) === JSON.stringify(current.trace), oldFilter: old.filter, newFilter: current.filter, trace: current.trace }
    comparisons.push(observation)
    assert(differentChannels === 0, `${name}: ${differentChannels} channel differences (strict zero tolerance)`)
    assert(observation.sameTrace && old.filter === current.filter, name + ': draw/composite/camera/filter order changed')
    if (name === 'Point mirrored normals Ultra shadow DPR2') captures.push({ name: 'lighting-before', data: old.canvas.toDataURL() }, { name: 'lighting-after', data: current.canvas.toDataURL() })
    return current
  }
  const targetEntity = new BoxEntity(8801, { x: 0, y: 0 }, { x: 5, y: 4 }); targetEntity.layer = 1
  targetEntity.transform.rotation = .18; targetEntity.transform.scale = { x: -1, y: 1.2 }
  const sprite = targetEntity.addComponent(new components.SpriteRenderer2D()); sprite.size = { x: 5, y: 4 }; sprite.flipY = true
  const caster = targetEntity.addComponent(new components.ShadowCaster2D()); caster.opacity = .65
  const lightEntity = new BoxEntity(8802, { x: -2, y: 1 }, { x: 1, y: 1 }); lightEntity.layer = 1; lightEntity.transform.rotation = .25
  const light = lightEntity.addComponent(new components.Light2D()); light.intensity = 2.5; light.range = 8; light.castsShadows = true
  const normal = document.createElement('canvas'); normal.width = normal.height = 8
  const normalContext = normal.getContext('2d'); normalContext.fillStyle = 'rgb(128,128,255)'; normalContext.fillRect(0, 0, 8, 8)
  normalContext.fillStyle = 'rgb(255,128,128)'; normalContext.fillRect(0, 0, 4, 8)
  const normalAsset = { uuid: '88000000-0000-4000-8000-000000000001', name: 'Lighting normal.png', path: 'Assets/Lighting normal.png', assetType: 'image', source: normal.toDataURL(), width: 8, height: 8, mimeType: 'image/png', settings: defaultImportSettings() }
  const extraAssets = []
  normalAsset.settings.atlas = false
  try {
    await check('Editor has one complete lighting environment sharing original scene/assets/settings/post/quality owners', () => {
      assert(environment === adapter.editorLightingEnvironment() && environment.scene === adapter.editorSceneRendererEnvironment(), 'Adapter created a second lighting or scene owner')
      assert(environment.settings === settings.renderingSettings && environment.assets === environment.scene.assets && environment.postProcessing === settings.activePostProcessing && environment.renderQuality === settings.activeRenderQuality, 'Policy/resource objects were copied')
    })
    await check('Missing ports and mismatched scene ownership fail before any Canvas draw', () => {
      let draws = 0; const context = new Proxy({}, { get() { return () => { draws++ } } })
      for (const missing of ['settings', 'postProcessing', 'renderQuality', 'assets', 'scene']) {
        let failure = ''; try { lighting.renderLighting2D(context, [], options, { ...environment, [missing]: undefined }) } catch (error) { failure = String(error) }
        assert(failure.includes('LIGHTING_ENVIRONMENT_REQUIRED'), 'Missing ' + missing + ' silently used empty/default services')
      }
      let failure = ''; try { lighting.renderLighting2D(context, [], options, { ...environment, scene: { ...environment.scene, settings: { ...environment.settings } } }) } catch (error) { failure = String(error) }
      assert(failure.includes('LIGHTING_ENVIRONMENT_MISMATCH') && draws === 0, 'Mismatched policy owner drew a partial frame')
    })
    assets.assetState.records.push(normalAsset); assets.assetState.generation++
    assets.resolveTexture('asset://' + normalAsset.uuid)
    for (let retry = 0; retry < 100 && assets.imageDecodedCacheStats().pending; retry++) await new Promise(resolve => setTimeout(resolve, 10))
    assert(assets.resolveTexture('asset://' + normalAsset.uuid), 'Actual AssetDatabase normal map did not decode')
    sprite.normalMapAsset = 'asset://' + normalAsset.uuid
    Object.assign(settings.renderingSettings, { lightingEnabled: true, ambientIntensity: .35, ambientColor: { r: 120, g: 155, b: 195 }, debugView: 'None' })
    settings.renderingSettings.postProcessing.enabled = true
    Object.assign(settings.activePostProcessing, { exposure: .2, contrast: 1.12, saturation: .8, vignette: .25, blur: .1, bloom: .1 })
    for (const kind of ['Directional', 'Point', 'Spot', 'Area']) await check(kind + ' original light/normal/shadow/post algorithms preserve pixels and command order', async () => { light.lightType = kind; settings.activeRenderQuality.shadowQuality = 'Hard'; await compare(kind + ' lighting', [targetEntity, lightEntity]) })
    await check('Point mirrored normals Ultra shadow DPR2', async () => { light.lightType = 'Point'; settings.activeRenderQuality.shadowQuality = 'Ultra'; await compare('Point mirrored normals Ultra shadow DPR2', [targetEntity, lightEntity], options, 2) })
    for (const debug of ['Lighting', 'Overdraw', 'BatchBreaks', 'Normals']) await check(debug + ' debug and original post filters preserve exact output', async () => { settings.renderingSettings.debugView = debug; await compare(debug + ' debug', [targetEntity, lightEntity]) })
    settings.renderingSettings.debugView = 'None'
    await check('Two actual Camera2D viewports retain camera/layer masks and clipped compositing', async () => {
      const cameras = [new BoxEntity(8803, { x: -1, y: 0 }, { x: 1, y: 1 }), new BoxEntity(8804, { x: 1, y: 0 }, { x: 1, y: 1 })]
      cameras.forEach((entity, index) => { entity.layer = 1; const camera = entity.addComponent(new components.Camera2D()); camera.viewport = { x: index * .5, y: 0, width: .5, height: 1 }; camera.orthographicSize = 5; camera.layerMask = index ? 2 : 0xffff_ffff; camera.followSmoothing = 0 })
      await compare('Two cameras', [targetEntity, lightEntity, ...cameras], { ...options, gameView: true })
    })
    await check('Actual shadow quality and settings objects update live; no independent lighting policy', async () => {
      let previous = null
      for (const quality of ['Off', 'Hard', 'Soft', 'Ultra']) { settings.activeRenderQuality.shadowQuality = quality; const result = await compare('Shadow ' + quality, [targetEntity, lightEntity]); if (previous && quality === 'Hard') assert(JSON.stringify(result.pixels) !== JSON.stringify(previous), 'Shared shadow quality did not affect actual output'); previous = result.pixels }
      settings.renderingSettings.lightingEnabled = false; await compare('Lighting disabled', [targetEntity, lightEntity]); settings.renderingSettings.lightingEnabled = true
    })
    await check('Single original normal cache retains revisions and invalidates mutable sources without changing its frame owner', async () => {
      const coldAsset = { ...normalAsset, uuid: '88000000-0000-4000-8000-000000000002', path: 'Assets/Lighting cold normal.png', settings: { ...normalAsset.settings } }
      extraAssets.push(coldAsset); assets.assetState.records.push(coldAsset); assets.assetState.generation++
      const reference = 'asset://' + coldAsset.uuid; assets.resolveTexture(reference)
      for (let retry = 0; retry < 100 && (!assets.resolveTexture(reference) || assets.imageDecodedCacheStats().pending); retry++) await new Promise(resolve => setTimeout(resolve, 10))
      const coldTexture = assets.resolveTexture(reference); assert(coldTexture, 'Fresh original Owner normal map did not become ready')
      sprite.normalMapAsset = reference; light.castsShadows = false; settings.activeRenderQuality.shadowQuality = 'Off'
      const control = make(), originalDraw = () => { control.context.clearRect(0, 0, control.canvas.width, control.canvas.height); before.renderLighting2D(control.context, [targetEntity, lightEntity], options); return pixels(control) }
      const controlFirst = originalDraw(), controlRepeat = originalDraw(), controlDifferentChannels = controlFirst.reduce((count, value, index) => count + Number(value !== controlRepeat[index]), 0)
      const region = { ...coldTexture, key: 'lighting-cache-revision-probe', revision: 20 }
      const injectedAssets = { ...environment.assets, resolveTexture: () => region }, selected = { ...environment, assets: injectedAssets, scene: { ...environment.scene, assets: injectedAssets } }
      light.castsShadows = false; settings.activeRenderQuality.shadowQuality = 'Off'; const target = make()
      const originalCreate = document.createElement.bind(document); let canvases = 0
      document.createElement = function(name, ...rest) { if (name === 'canvas') canvases++; return originalCreate(name, ...rest) }
      const draw = () => { target.context.clearRect(0, 0, target.canvas.width, target.canvas.height); lighting.renderLighting2D(target.context, [targetEntity, lightEntity], options, selected); return pixels(target) }
      try {
        const first = draw(); assert(canvases === 1, 'Normal response was not computed once')
        const repeat = draw(), differentChannels = first.reduce((count, value, index) => count + Number(value !== repeat[index]), 0)
        comparisons.push({ name: 'normal-cache-stable-probe', canvases, differentChannels, controlDifferentChannels, firstHash: await hash(first), repeatHash: await hash(repeat), oldControlFirstHash: await hash(controlFirst), oldControlRepeatHash: await hash(controlRepeat), state: { alpha: target.context.globalAlpha, composite: target.context.globalCompositeOperation, filter: target.context.filter, transform: target.context.getTransform().toString() }, examples: first.flatMap((value, index) => value !== repeat[index] ? [{ index, first: value, repeat: repeat[index] }] : []).slice(0, 20) })
        assert(differentChannels === 0 && canvases === 1, `Stable normal revision: canvases=${canvases}, differentChannels=${differentChannels}`)
        normalContext.fillStyle = 'rgb(0,128,128)'; normalContext.fillRect(0, 0, 8, 8); region.source = normal; region.uv = { x: 0, y: 0, width: 1, height: 1 }; region.revision++
        const changed = draw(); assert(canvases === 2 && JSON.stringify(first) !== JSON.stringify(changed), 'New normal revision remained stale')
        delete region.revision; draw(); draw(); assert(canvases === 4, 'Mutable unversioned normal map stopped invalidating per lighting frame')
        comparisons.push({ name: 'normal-cache-real-source', computedCanvases: canvases, stableRevisionCanvases: 1, revisionChangeCanvases: 1, mutableFramesCanvases: 2 })
      } finally { document.createElement = originalCreate }
    })
    await check('Legacy compatibility calls and explicit environment use the same production lighting functions', async () => {
      settings.renderingSettings.postProcessing.enabled = true
      const oldStyle = make(), explicit = make()
      lighting.renderPostProcessOverlay(oldStyle.context, options.width, options.height)
      lighting.renderPostProcessOverlay(explicit.context, options.width, options.height, environment)
      assert(JSON.stringify(pixels(oldStyle)) === JSON.stringify(pixels(explicit)), 'Legacy bridge changed original post pixels')
      assert(lighting.worldPostProcessFilter() === lighting.worldPostProcessFilter(environment), 'Legacy filter selected another policy')
    })
  } finally {
    for (const asset of [normalAsset, ...extraAssets]) { const index = assets.assetState.records.indexOf(asset); if (index >= 0) assets.assetState.records.splice(index, 1) } assets.assetState.generation++
    Object.assign(settings.renderingSettings, original.settings); Object.assign(settings.activePostProcessing, original.post); Object.assign(settings.activeRenderQuality, original.quality)
  }
  return { status: checks.every(check => check.status === 'passed') ? 'passed' : 'failed', checks, comparisons, captures, userAgent: navigator.userAgent, scope: 'Actual Canvas2D algorithm/pixel/normal-cache regression against saved original Lighting source; strict zero pixel tolerance. Functional browser evidence only; no GPU or formal performance claim.' }
}
