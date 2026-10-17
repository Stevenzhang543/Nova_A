/** Real-browser correctness and short-sample cost evidence for the renderer migration slice. */
import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const option = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3)
const reportDir = resolve(option('report-dir') ?? 'release-audits/engine-renderer-slice')
const hardware = process.argv.includes('--hardware')
const creditChecks = process.argv.includes('--credit-checks')
const instancingChecks = process.argv.includes('--instancing-checks')
const frontendChecks = process.argv.includes('--frontend-checks')
const sourceFiles = ['src/renderer/WebGL2Renderer.ts', 'src/renderer/Canvas2DRenderer.ts', 'src/renderer/types.ts', 'src/renderer/sceneRenderer.ts', 'src/renderer/visibilityBounds.ts', 'src/runtime/tilemap.ts', 'src/renderer/textureContent.ts', 'src/renderer/core.ts', 'src/renderer/RendererEnvironment.ts', 'src/renderer/renderSettingsSchema.ts', 'src/renderer/materials.ts', 'src/editor/rendererAdapter.ts', 'src/assets/AssetDatabase.ts', 'scripts/verify-engine-renderer-slice.mjs', ...(creditChecks ? ['scripts/verify-engine-renderer-credit.mjs', 'scripts/verify-engine-renderer-credit-cases.mjs'] : [])]
if (existsSync('src/renderer/spriteInstances.ts')) sourceFiles.push('src/renderer/spriteInstances.ts')
if (instancingChecks) sourceFiles.push('scripts/verify-engine-renderer-instancing.mjs', 'scripts/verify-engine-renderer-instancing-cases.mjs')
sourceFiles.push('src/renderer/SceneRendererEnvironment.ts')
const baselineSource = resolve(option('baseline-source') ?? 'release-audits/engine-renderer-frontend-slice-20261006/src__renderer__sceneRenderer.ts.before')
if (frontendChecks) sourceFiles.push('scripts/verify-engine-renderer-frontend.mjs', 'scripts/verify-engine-renderer-frontend-cases.mjs', baselineSource, 'src/runtime/particles.ts', 'src/runtime/rigging.ts', 'src/renderer/renderSettings.ts')
const digest = async () => Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path, createHash('sha256').update(await readFile(path)).digest('hex')])))
const beforeHashes = await digest()
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

async function browserChecks(runCreditChecks = false, runInstancingChecks = false, runFrontendChecks = false) {
  const [{ WebGL2Renderer }, scene, tiles, { BoxEntity }, components, assets, { defaultImportSettings }, { renderingSettings }] = await Promise.all([
    import('/src/renderer/WebGL2Renderer.ts'), import('/src/renderer/sceneRenderer.ts'), import('/src/runtime/tilemap.ts'), import('/src/world/BoxEntity.ts'),
    import('/src/world/components.ts'), import('/src/assets/AssetDatabase.ts'), import('/src/assets/types.ts'), import('/src/renderer/renderSettings.ts')
  ])
  const { editorSceneRendererEnvironment } = await import('/src/editor/rendererAdapter.ts')
  const sceneEnvironment = editorSceneRendererEnvironment()
  const checks = [], observations = [], captures = []
  const assert = (value, message) => { if (!value) throw Error(message) }
  const check = async (name, action) => { try { await action(); checks.push({ name, status: 'passed' }) } catch (error) { checks.push({ name, status: 'failed', error: String(error.stack ?? error) }) } }
  const color = (r, g, b, a = 1) => ({ r, g, b, a })
  const camera = { scale: 16, position: { x: 0, y: 0 }, offset: { x: 128, y: 64 } }
  const frame = { width: 256, height: 128, pixelRatio: 1, clearColor: color(0, 0, 0) }
  const actualRenderDevices = new Set()
  const recordDevice = renderer => { const gl = renderer.gl, debug = gl.getExtension('WEBGL_debug_renderer_info'); actualRenderDevices.add(String(gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER))) }
  const make = () => { const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128; const renderer = new WebGL2Renderer(canvas); recordDevice(renderer); return { canvas, renderer } }
  const draw = (target, action) => { target.renderer.beginFrame(frame); target.renderer.beginCamera(camera); action(target.renderer); target.renderer.endCamera(); return target.renderer.endFrame() }
  const pixels = canvas => { const copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height; const context = copy.getContext('2d', { willReadFrequently: true }); context.drawImage(canvas, 0, 0); return Array.from(context.getImageData(0, 0, copy.width, copy.height).data) }
  // Test-only task boundaries: WebGL sync status cannot become signaled in its creation task.
  const renderScene = async (target, entities, options) => {
    for (let retry = 0; retry < 100; retry++) { const stats = scene.renderWorld(target.renderer, entities, options, sceneEnvironment); if (Number.isFinite(stats.cpuSubmissionAtMs)) return stats; await new Promise(resolve => setTimeout(resolve, 2)) }
    throw Error('Scene submission did not recover after real browser task boundaries')
  }
  const distribution = samples => { const sorted = [...samples].sort((a, b) => a - b); return { median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * .95) - 1)], samples } }
  const original = JSON.parse(JSON.stringify(renderingSettings))
  renderingSettings.postProcessing.enabled = false; renderingSettings.antiAliasing = 'Off'; renderingSettings.textureStreaming.enabled = false
  try {
    await check('Immutable text pixels stay cached; text/style changes and mutable canvases still upload', () => {
      const target = make(), command = { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, text: 'Nova 中文', fontFamily: 'sans-serif', fontSize: 3, fontWeight: 500, lineHeight: 1.2, align: 'center', color: color(255, 255, 255), outlineColor: color(0, 0, 0, 0), outlineWidth: 0, maxWidth: 0, sortingLayer: 1, orderInLayer: 0, material: 'Default' }
      try {
        draw(target, renderer => renderer.submitText(command)); const first = pixels(target.canvas)
        const timings = [], uploads = []
        for (let index = 0; index < 40; index++) { const start = performance.now(); const stats = draw(target, renderer => renderer.submitText(command)); timings.push(performance.now() - start); uploads.push(stats.textureUploads) }
        const unchanged = pixels(target.canvas)
        observations.push({ name: 'static-text', timing: distribution(timings), uploads, bytes: target.renderer.textureMemoryBytes, scope: '40 synchronous submit samples; real WebGL calls, no GPU wait. Smoke cost evidence, not formal B6 or display FPS.' })
        assert(first.some((value, index) => index % 4 !== 3 && value > 0), 'Text output is blank')
        assert(first.every((value, index) => value === unchanged[index]), 'Static text pixels changed')
        captures.push({ name: 'static-text', data: target.canvas.toDataURL() })
        assert(uploads.every(value => value === 0), `Static text uploaded ${uploads.reduce((sum, value) => sum + value, 0)} times`)
        command.text = 'Changed 文本'; assert(draw(target, renderer => renderer.submitText(command)).textureUploads === 1, 'Changed text did not publish new pixels')
        command.fontWeight = 700; assert(draw(target, renderer => renderer.submitText(command)).textureUploads === 1, 'Changed style did not publish new pixels')
        const source = document.createElement('canvas'); source.width = source.height = 2; const context = source.getContext('2d')
        const sprite = { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, size: { x: 4, y: 4 }, pivot: { x: .5, y: .5 }, flipX: false, flipY: false, tint: color(255, 255, 255), texture: { key: 'mutable', source, uv: { x: 0, y: 0, width: 1, height: 1 }, filter: 'Nearest' }, sortingLayer: 1, orderInLayer: 0, material: 'Default' }
        context.fillStyle = '#ff0000'; context.fillRect(0, 0, 2, 2); draw(target, renderer => renderer.submitSprite(sprite))
        context.fillStyle = '#00ff00'; context.fillRect(0, 0, 2, 2); assert(draw(target, renderer => renderer.submitSprite(sprite)).textureUploads === 1, 'Mutable canvas update was incorrectly cached')
        const changed = pixels(target.canvas), center = (64 * 256 + 128) * 4; assert(changed[center] === 0 && changed[center + 1] === 255, 'Mutable canvas pixels are stale')
      } finally { target.renderer.destroy() }
    })

    const imageSurface = document.createElement('canvas'); imageSurface.width = 4; imageSurface.height = 2; const imageContext = imageSurface.getContext('2d'); imageContext.fillStyle = '#ff0000'; imageContext.fillRect(0, 0, 2, 2); imageContext.fillStyle = '#00ff00'; imageContext.fillRect(2, 0, 2, 2)
    const image = { uuid: crypto.randomUUID(), name: 'Slice.png', path: 'Assets/Slice.png', assetType: 'image', source: imageSurface.toDataURL(), width: 4, height: 2, mimeType: 'image/png', settings: defaultImportSettings() }
    const set = { uuid: crypto.randomUUID(), name: 'Slice.tileset', path: 'Assets/Slice.tileset', assetType: 'tileset', source: 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify({ version: 2, textureAsset: 'asset://' + image.uuid, tileWidth: 2, tileHeight: 2, columns: 2, rows: 1, tiles: [] })), settings: defaultImportSettings() }
    assets.assetState.records.push(image, set); assets.assetState.generation++
    try {
      assets.resolveTexture('asset://' + image.uuid)
      for (let retry = 0; retry < 100 && assets.imageDecodedCacheStats().pending; retry++) await new Promise(resolve => setTimeout(resolve, 10))
      await check('Camera movement and local tile edits retain unaffected chunks; external revisions invalidate', () => {
        const entity = new BoxEntity(801, { x: 0, y: 0 }, { x: 1, y: 1 }), map = new components.TileMap2D()
        map.width = 64; map.height = 32; map.tiles = Array(2048).fill(0); map.layers[0].tiles = map.tiles; map.layers[0].transforms = Array(2048).fill(0); map.tileSetAsset = 'asset://' + set.uuid; entity.addComponent(map)
        const bounds = { minX: -100, maxX: 100, minY: -100, maxY: 100 }, commands = position => tiles.tileChunkCommands(entity, map, [entity], bounds, position)
        const initial = commands({ x: 0, y: 0 }), timings = [], replacements = []
        assert(initial.length === 2, 'Expected two nonempty chunks')
        for (let index = 0; index < 40; index++) { const start = performance.now(), next = commands({ x: index / 10, y: index / 20 }); timings.push(performance.now() - start); replacements.push(next.filter((value, n) => value !== initial[n]).length) }
        observations.push({ name: 'moving-camera-tile-cache', timing: distribution(timings), replacementCounts: replacements, tiles: 2048, scope: '40 ordinary layer camera queries, same two visible chunks; CPU generation/cache smoke evidence.' })
        assert(replacements.every(value => value === 0), 'Ordinary camera movement rebuilt tile chunks')
        tiles.tilemapEditorState.tool = 'brush'; tiles.tilemapEditorState.tileIndex = 1
        const stroke = tiles.beginTileStroke(map, { x: 0, y: 0 }); tiles.endTileStroke(map, stroke, { x: 0, y: 0 })
        const edited = commands({ x: 0, y: 0 }); assert(edited[0] !== initial[0] && edited[1] === initial[1], 'A local edit rebuilt an unaffected chunk'); assert(edited[0].sprites[0].texture.uv.x === .5, 'Changed tile UV not published')
        const runtimeChunk = tiles.readRuntimeTileChunk(map, 'base', 1, 0); runtimeChunk.tiles[0] = 1; assert(tiles.writeRuntimeTileChunk(map, runtimeChunk), 'Runtime chunk update rejected')
        const runtimeEdited = commands({ x: 0, y: 0 }); assert(runtimeEdited[0] === edited[0] && runtimeEdited[1] !== edited[1], 'Runtime local chunk write rebuilt other chunks')
        map.tiles[1] = 1; map.revision++; const external = commands({ x: 0, y: 0 }); assert(external[0] !== runtimeEdited[0] && external[0].sprites[1].texture.uv.x === .5, 'Untracked external revision retained stale pixels')
        map.layers[0].parallax = { x: .5, y: .75 }; const parallaxFirst = commands({ x: 0, y: 0 }), parallaxNext = commands({ x: 4, y: 8 })
        assert(parallaxNext[0].sprites[0].position.x - parallaxFirst[0].sprites[0].position.x === 2 && parallaxNext[0].sprites[0].position.y - parallaxFirst[0].sprites[0].position.y === 2, 'Parallax camera offsets were lost')
        map.layers.push({ ...map.layers[0], id: 'stationary', parallax: { x: 1, y: 1 }, tiles: [...map.tiles], transforms: [...map.layers[0].transforms] })
        const mixedFirst = commands({ x: 0, y: 0 }), mixedNext = commands({ x: 2, y: 1 })
        assert(mixedFirst[0] !== mixedNext[0] && mixedFirst[2] === mixedNext[2] && mixedFirst[3] === mixedNext[3], 'Moving parallax layer invalidated stationary layer chunks')
        const movedBounds = { minX: 170, maxX: 180, minY: -20, maxY: 20 }
        assert(tiles.tileChunkCommands(entity, map, [entity], movedBounds, { x: 400, y: 0 }).length > 0, 'Parallax bounds ignored actual camera translation')
      })
      await check('Performance culling matches uncropped transformed shape and sprite pixels', async () => {
        const target = make(), entity = new BoxEntity(802, { x: 14, y: 0 }, { x: 20, y: 3 })
        entity.layer = 1; entity.transform.rotation = .25; entity.transform.scale = { x: -1, y: 1.5 }; entity.renderer.strokeWidth = .4
        const options = { width: 256, height: 128, pixelRatio: 1, editorCamera: camera, gameView: false, activeLayer: 1, renderLayer: 'all', canvasColor: '#000000', connections: [] }
        try {
          await renderScene(target, [entity], { ...options, performanceMode: false }); const expected = pixels(target.canvas)
          captures.push({ name: 'large-transformed-shape-reference', data: target.canvas.toDataURL() })
          await renderScene(target, [entity], { ...options, performanceMode: true }); const actual = pixels(target.canvas)
          observations.push({ name: 'large-transformed-shape', expectedColoredPixels: expected.filter((value, index) => index % 4 !== 3 && value > 0).length, actualColoredPixels: actual.filter((value, index) => index % 4 !== 3 && value > 0).length })
          captures.push({ name: 'large-transformed-shape', data: target.canvas.toDataURL() })
          assert(expected.some((value, index) => index % 4 !== 3 && value > 0), 'Reference shape is blank'); assert(expected.every((value, index) => value === actual[index]), 'Culling removed visible rotated negative-scale shape pixels')
          entity.renderer.enabled = false; const sprite = new components.SpriteRenderer2D(); sprite.spriteAsset = 'asset://' + image.uuid; sprite.size = { x: 20, y: 4 }; sprite.pivot = { x: .5, y: .5 }; entity.addComponent(sprite)
          await renderScene(target, [entity], { ...options, performanceMode: false }); const spriteExpected = pixels(target.canvas)
          await renderScene(target, [entity], { ...options, performanceMode: true }); const spriteActual = pixels(target.canvas)
          assert(spriteExpected.some((value, index) => index % 4 !== 3 && value > 0), 'Reference sprite is blank'); assert(spriteExpected.every((value, index) => value === spriteActual[index]), 'Culling removed visible transformed sprite pixels')
          entity.transform.position.x = 100; await renderScene(target, [entity], { ...options, performanceMode: true }); assert(target.renderer.stats.sprites === 0, 'Wholly invisible sprite still submitted')
        } finally { target.renderer.destroy() }
      })
      await check('Long lines, ellipses, parent transforms and large TileMaps keep all visible pixels', async () => {
        const target = make(), options = { width: 256, height: 128, pixelRatio: 1, editorCamera: { ...camera, rotation: .3 }, gameView: false, activeLayer: 1, renderLayer: 'all', canvasColor: '#000000', connections: [] }
        const compare = async (entities, label) => {
          await renderScene(target, entities, { ...options, performanceMode: false }); const expected = pixels(target.canvas)
          await renderScene(target, entities, { ...options, performanceMode: true }); const actual = pixels(target.canvas)
          assert(expected.some((value, index) => index % 4 !== 3 && value > 0), label + ' reference is blank')
          assert(expected.every((value, index) => value === actual[index]), label + ' lost visible pixels')
        }
        try {
          const line = new BoxEntity(803, { x: 14, y: 0 }, { x: 1, y: 1 }); line.layer = 1; line.renderer.shape = 'Line'; line.renderer.vertices = [{ x: -20, y: 0 }, { x: 20, y: 0 }]; line.renderer.strokeWidth = .75; line.transform.rotation = .1; await compare([line], 'Long line')
          const ellipse = new BoxEntity(804, { x: 14, y: 0 }, { x: 1, y: 1 }); ellipse.layer = 1; ellipse.renderer.shape = 'Ellipse'; ellipse.renderer.radiusX = 16; ellipse.renderer.radiusY = 2; ellipse.transform.scale = { x: -1, y: 2 }; ellipse.transform.rotation = .2; await compare([ellipse], 'Ellipse')
          const parent = new BoxEntity(805, { x: 14, y: 0 }, { x: 1, y: 1 }); parent.layer = 2; parent.transform.rotation = .1; parent.transform.scale = { x: -1, y: 2 }
          const child = new BoxEntity(806, { x: 0, y: 0 }, { x: 20, y: 2 }); child.layer = 1; child.parentUuid = parent.uuid; await compare([parent, child], 'Parent transform')
          const tileEntity = new BoxEntity(807, { x: 14, y: 0 }, { x: 1, y: 1 }); tileEntity.layer = 1; const map = new components.TileMap2D(); map.tileSetAsset = 'asset://' + set.uuid; map.tiles.fill(0); tileEntity.addComponent(map); await compare([tileEntity], 'Large TileMap')
        } finally { target.renderer.destroy() }
      })
    } finally { for (const record of [image, set]) assets.assetState.records.splice(assets.assetState.records.findIndex(value => value.uuid === record.uuid), 1); assets.assetState.generation++ }

    await check('Timer queries stay bounded without waiting and disjoint results invalidate previous timing', () => {
      const target = make(), renderer = target.renderer, gl = renderer.gl
      const originals = { beginQuery: gl.beginQuery, endQuery: gl.endQuery, getQueryParameter: gl.getQueryParameter, getParameter: gl.getParameter }
      let beginCount = 0, available = false, disjoint = false
      renderer.timerExtension = { TIME_ELAPSED_EXT: 0x88bf, GPU_DISJOINT_EXT: 0x8fbb }
      gl.beginQuery = () => { beginCount++ }; gl.endQuery = () => {}
      gl.getQueryParameter = (_query, parameter) => parameter === gl.QUERY_RESULT_AVAILABLE ? available : 2_000_000
      gl.getParameter = parameter => parameter === 0x8fbb ? disjoint : originals.getParameter.call(gl, parameter)
      try {
        for (let index = 0; index < 64; index++) draw(target, () => {})
        observations.push({ name: 'delayed-query-backpressure', frames: 64, begun: beginCount, outstanding: renderer.pendingTimers.length, scope: 'Actual WebGL query allocation with controlled unavailable-result and disjoint injection; no claimed hardware query timing.' })
        assert(renderer.pendingTimers.length <= 4 && beginCount <= 4, 'Unavailable timer results accumulated unbounded queries')
        available = true; draw(target, () => {}); assert(renderer.stats.gpuMs === 2, 'Available nanoseconds were not converted to milliseconds')
        disjoint = true; draw(target, () => {}); assert(renderer.stats.gpuMs === null, 'Disjoint timing retained a stale valid-looking sample')
      } finally { Object.assign(gl, originals); renderer.destroy() }
    })
    await check('CPU submission timestamp is present for actual drawing and absent during context loss', async () => {
      const target = make()
      try {
        assert(Number.isFinite(draw(target, () => {}).cpuSubmissionAtMs), 'Successful WebGL drawing did not publish CPU submission time')
        const extension = target.renderer.gl.getExtension('WEBGL_lose_context'); assert(extension, 'Loss fixture requires WEBGL_lose_context')
        const lost = new Promise(resolve => target.canvas.addEventListener('webglcontextlost', resolve, { once: true }))
        extension.loseContext(); await lost
        assert(draw(target, () => {}).cpuSubmissionAtMs === null, 'Suspended WebGL drawing published a submission')
      } finally { target.renderer.destroy() }
      const { Canvas2DRenderer } = await import('/src/renderer/Canvas2DRenderer.ts')
      const canvas = document.createElement('canvas'), renderer = new Canvas2DRenderer(canvas)
      try { renderer.beginFrame(frame); assert(renderer.stats.cpuSubmissionAtMs === null, 'Canvas frame begins with an old submission'); assert(Number.isFinite(renderer.endFrame().cpuSubmissionAtMs), 'Canvas drawing API calls did not publish CPU submission time') } finally { renderer.destroy() }
    })
    await check('Standalone core environments isolate same-name materials, settings and lifecycle event owners', async () => {
      const core = await import('/src/renderer/core.ts')
      const makeEnvironment = channel => ({ settings: core.normalizeRenderingSettings({ ...core.DEFAULT_RENDERING_SETTINGS, antiAliasing: 'Off' }), postProcessing: { ...core.DEFAULT_RENDERING_SETTINGS.postProcessing }, assets: { generation: 1, atlasPageCount: channel, resolveTexture: () => null, readMaterialSource: () => JSON.stringify({ fragment: `vec4 nova_material(vec4 baseColor,vec2 uv){return vec4(${channel === 1 ? '1.,0.,0.' : '0.,0.,1.'},1.);}` }) }, contextLost: () => events.push(channel) })
      const events = [], firstCanvas = document.createElement('canvas'), secondCanvas = document.createElement('canvas'), firstEnvironment = makeEnvironment(1), secondEnvironment = makeEnvironment(2)
      const first = { canvas: firstCanvas, renderer: new core.WebGL2Renderer(firstCanvas, firstEnvironment) }, second = { canvas: secondCanvas, renderer: new core.WebGL2Renderer(secondCanvas, secondEnvironment) }
      const shape = { shape: 'Rectangle', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, vertices: [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }], radiusX: 1, radiusY: 1, fill: color(255, 255, 255), stroke: color(0, 0, 0, 0), strokeWidth: 0, sortingLayer: 1, orderInLayer: 0, material: 'asset://same-name' }
      try {
        assert(draw(first, renderer => renderer.submitShape(shape)).atlasPages === 1 && draw(second, renderer => renderer.submitShape(shape)).atlasPages === 2, 'One renderer read another environment asset metadata')
        const red = pixels(firstCanvas), blue = pixels(secondCanvas), center = (64 * 256 + 128) * 4
        assert(red[center] === 255 && red[center + 2] === 0 && blue[center] === 0 && blue[center + 2] === 255, 'Same material name leaked across injected environments')
        assert(first.renderer.stats.shaderFallbacks === 0 && second.renderer.stats.shaderFallbacks === 0, 'Injected material failed to compile')
        firstEnvironment.settings.antiAliasing = 'MSAA4'; draw(first, renderer => renderer.submitShape(shape)); assert(secondEnvironment.settings.antiAliasing === 'Off', 'Settings write leaked across renderer environments')
        const extension = first.renderer.gl.getExtension('WEBGL_lose_context'), lost = new Promise(resolve => firstCanvas.addEventListener('webglcontextlost', resolve, { once: true })); extension.loseContext(); await lost
        assert(events.length === 1 && events[0] === 1, 'Loss event escaped its injected owner')
        captures.push({ name: 'injected-material-blue', data: secondCanvas.toDataURL() })
      } finally { first.renderer.destroy(); second.renderer.destroy() }
    })
    if (runCreditChecks) { const { verifyCreditCases } = await import('/scripts/verify-engine-renderer-credit-cases.mjs'); await verifyCreditCases({ check, assert, observations, captures, WebGL2Renderer, scene, sceneEnvironment, BoxEntity, frame, camera, color, pixels, renderScene, renderingSettings, recordDevice }) }
    if (runInstancingChecks) { const { verifyInstancingCases } = await import('/scripts/verify-engine-renderer-instancing-cases.mjs'); await verifyInstancingCases({ check, assert, observations, captures, WebGL2Renderer, color, pixels, recordDevice }) }
    if (runFrontendChecks) { const { verifyFrontendCases } = await import('/scripts/verify-engine-renderer-frontend-cases.mjs'); await verifyFrontendCases({ check, assert, observations, captures, WebGL2Renderer, scene, sceneEnvironment, BoxEntity, components, assets, defaultImportSettings, camera, color, pixels, renderingSettings, recordDevice }) }
  } finally { Object.assign(renderingSettings, original) }
  const diagnostic = document.createElement('canvas').getContext('webgl2'), debug = diagnostic?.getExtension('WEBGL_debug_renderer_info')
  return { status: checks.every(check => check.status === 'passed') ? 'passed' : 'failed', checks, observations, captures, device: [...actualRenderDevices][0] ?? null, actualRenderDevices: [...actualRenderDevices], diagnosticDevice: diagnostic ? String(diagnostic.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? diagnostic.RENDERER)) : null, gpuTimerExtension: !!diagnostic?.getExtension('EXT_disjoint_timer_query_webgl2'), viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio } }
}

let server, browser, socket
try {
  await mkdir(reportDir, { recursive: true })
  const profile = await mkdtemp(join(tmpdir(), 'nova-renderer-slice-'))
  const baselineId = resolve('src/renderer/__frontendBaseline.ts').replaceAll('\\', '/')
  const baselineText = frontendChecks ? await readFile(baselineSource, 'utf8') : null
  server = await createServer({ configFile: false, root: process.cwd(), cacheDir: join(profile, 'vite'), logLevel: 'error', server: { host: '127.0.0.1', port: 0, strictPort: false, watch: null, hmr: false }, plugins: [{ name: 'renderer-frontend-before-source', enforce: 'pre', resolveId(source) { if (frontendChecks && source.endsWith('/__frontendBaseline.ts')) return baselineId }, load(id) { if (id === baselineId) return baselineText } }, { name: 'renderer-slice-page', configureServer(server) { server.middlewares.use((request, response, next) => { if (request.url !== '/renderer-slice.html') return next(); response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><title>Nova Renderer Slice</title><script type="module">window.rendererSliceRun=' + browserChecks.toString() + ';</script>') }) } }] })
  await server.listen(); const port = server.httpServer.address().port
  const executable = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
  if (!executable) throw Error('Microsoft Edge not available')
  browser = spawn(executable, ['--headless=new', '--no-first-run', '--disable-extensions', ...(hardware ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']), '--remote-debugging-port=0', `--user-data-dir=${profile}`, `http://127.0.0.1:${port}/renderer-slice.html`], { stdio: 'ignore', windowsHide: true })
  let debuggerPort
  for (let retry = 0; retry < 200 && !debuggerPort; retry++) { try { debuggerPort = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch {} if (!debuggerPort) await wait(100) }
  if (!debuggerPort) throw Error('Browser debugger did not start')
  const target = (await fetch(`http://127.0.0.1:${debuggerPort}/json/list`).then(response => response.json())).find(target => target.type === 'page')
  socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  let sequence = 0; const pending = new Map()
  socket.addEventListener('message', event => { const message = JSON.parse(event.data), request = pending.get(message.id); if (!request) return; pending.delete(message.id); clearTimeout(request.timer); message.error ? request.reject(Error(message.error.message)) : request.resolve(message.result) })
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence, timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout: ' + method)) }, 90000); pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result.value }
  for (let retry = 0; retry < 100 && !await evaluate('typeof window.rendererSliceRun==="function"'); retry++) await wait(100)
  const report = await evaluate('window.rendererSliceRun(' + creditChecks + ',' + instancingChecks + ',' + frontendChecks + ')')
  report.format = 'nova-engine-renderer-slice'; report.version = 1; report.generatedAt = new Date().toISOString(); report.browser = await send('Browser.getVersion'); report.sourceHashes = beforeHashes
  report.scope = 'Actual production WebGL2/scene/tile modules and pixels. Short samples only; timer availability/failure is controlled injection. ' + (creditChecks ? 'GPU credit checks use real fences and task boundaries, with labeled controlled delay/failure cases; GPU completion is not display presentation. ' : '') + (hardware ? 'Hardware requested; actual adapter string is authoritative. Headless browser is not Tauri WebView.' : 'Explicit SwiftShader software GPU: functional evidence, no hardware performance qualification.')
  if (JSON.stringify(beforeHashes) !== JSON.stringify(await digest())) throw Error('Sources changed during renderer verification')
  for (const capture of report.captures) { const file = capture.name + '.png'; await writeFile(join(reportDir, file), Buffer.from(capture.data.split(',')[1], 'base64')); capture.file = file; delete capture.data }
  await writeFile(join(reportDir, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' })
  for (const check of report.checks) console.log(check.status.toUpperCase() + ' ' + check.name + (check.error ? '\n' + check.error : ''))
  console.log('Saved ' + join(reportDir, 'report.json')); if (report.status !== 'passed') process.exitCode = 1
  try { await send('Browser.close') } catch {}
} finally { socket?.close(); browser?.kill(); server?.httpServer?.closeAllConnections(); await server?.close() }
