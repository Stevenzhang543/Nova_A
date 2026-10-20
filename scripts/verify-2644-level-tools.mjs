/** 26.44 level tool checks: terrain auto-tiling (16-tile cardinal and 47-tile blob rules, connected
 * terrains, per-map rules) for every tile tool, the rules template layout, and the animated tile chunk
 * cache (an animation frame change rebuilds only the chunks that hold animated tiles).
 *
 * Usage: node scripts/verify-2644-level-tools.mjs. Results: .cache/verify/level-tools-2644.json */
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { webcrypto } from 'node:crypto'
import { build } from 'vite'

const root = process.cwd()
const out = await mkdtemp(join(tmpdir(), 'nova-level-2644-'))
const results = []
const observations = {}
const check = async (name, run) => { try { await run(); results.push({ name, ok: true }); console.log('PASS', name) } catch (error) { results.push({ name, ok: false, error: String(error?.stack ?? error) }); console.log('FAIL', name, '\n   ', String(error?.message ?? error)) } }
if (!globalThis.crypto) globalThis.crypto = webcrypto
for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) if (!(name in globalThis)) globalThis[name] = class {}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [], maxTouchPoints: 0, platform: 'Win32' } })
try {
  const entries = {
    'src/store/physics.ts': 'physicsState, createTileMapEntity',
    'src/assets/AssetDatabase.ts': 'assetState, createTextAsset, assetReference, readTextAsset, resolveAsset',
    'src/runtime/tilemap.ts': 'tilemapEditorState, normalizeTileMap, beginTileStroke, continueTileStroke, endTileStroke, copyTileSelection, readTerrainRules, saveTerrainRules, createTerrainRules, terrainTemplateRules, canonicalBlobMask, BLOB_MASKS, terrainMasks, diagnoseTileMap, validateTerrainRules',
    'src/runtime/tileMapOwner.ts': 'TileMapOwner, TileSetResourceOwner'
  }
  const entry = join(out, 'entry.ts')
  // The Editor installs the tile and world gameplay ports when its adapter loads.
  await writeFile(entry, [`import '${join(root, 'src/editor/worldGameplayAdapter.ts').replaceAll('\\', '/')}';`, ...Object.entries(entries).map(([path, names]) => `export { ${names} } from '${join(root, path).replaceAll('\\', '/')}';`)].join('\n'))
  await writeFile(join(out, 'package.json'), '{"type":"module"}\n')
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, build: { ssr: true, outDir: join(out, 'build'), emptyOutDir: false, rollupOptions: { input: { level: entry }, output: { entryFileNames: '[name].mjs' } } } })
  const api = await import(pathToFileURL(join(out, 'build', 'level.mjs')).href)
  // Editor history schedules an autosave; the timer never holds the process open.
  globalThis.window ??= { setTimeout: (run, ms) => { const timer = setTimeout(run, ms); timer.unref?.(); return timer }, clearTimeout, addEventListener() {}, removeEventListener() {} }
  const state = api.tilemapEditorState

  // A 16×8 TileSet: rule tiles come from the template blocks; 100 is the Ground paint tile, 110 is
  // Grass, 120 a decoration without terrain.
  const tileSetAsset = api.createTextAsset('Level TileSet', 'tileset', JSON.stringify({ version: 2, textureAsset: null, tileWidth: 16, tileHeight: 16, columns: 16, rows: 8, tiles: [{ index: 100, name: 'Ground', terrain: 'Ground' }, { index: 110, name: 'Grass', terrain: 'Grass' }, { index: 120, name: 'Flower' }] }), 'Assets/TileSets')
  const tileSetRef = api.assetReference(tileSetAsset.uuid)
  const cardinalRules = api.terrainTemplateRules('cardinal', 0, 16)
  const blobRules = api.terrainTemplateRules('blob', 0, 16)
  const cardinalTile = mask => (mask % 4) + Math.floor(mask / 4) * 16
  const blobTile = mask => { const order = api.BLOB_MASKS.indexOf(api.canonicalBlobMask(mask)); return order % 8 + Math.floor(order / 8) * 16 }
  const rulesAsset = (document) => { const asset = api.createTerrainRules(document); return api.assetReference(asset.uuid) }
  const map = (width = 20, height = 12, terrain = null) => {
    const entity = api.createTileMapEntity(), component = entity.getComponent('TileMap2D')
    component.width = width; component.height = height; component.tileSetAsset = tileSetRef; component.terrainRulesAsset = terrain
    component.layers = []; api.normalizeTileMap(component)
    return component
  }
  const at = (component, x, y) => component.tiles[y * component.width + x]
  const stroke = (component, tool, tile, from, to = from, path = []) => {
    state.tool = tool; state.tileIndex = tile; state.transform = 0; state.randomizeVariants = false
    const current = api.beginTileStroke(component, from)
    for (const point of path) api.continueTileStroke(component, current, point)
    return api.endTileStroke(component, current, to)
  }

  await check('blob masks: 47 canonical masks, corners only count with both edges, templates lay out in order', () => {
    assert.equal(api.BLOB_MASKS.length, 47)
    assert.equal(api.BLOB_MASKS[0], 0); assert.equal(api.BLOB_MASKS.at(-1), 255)
    assert.equal(api.canonicalBlobMask(2), 0, 'a lone corner is ignored')
    assert.equal(api.canonicalBlobMask(1 | 2 | 4), 7)
    assert.equal(api.canonicalBlobMask(255 & ~4), 1 | 16 | 32 | 64 | 128, 'without east, NE and SE drop')
    assert.equal(api.terrainMasks('cardinal').length, 16)
    assert.equal(cardinalRules['5'], 1 + 16)
    assert.equal(blobRules['255'], 46 % 8 + 5 * 16)
    assert.equal(Object.keys(blobRules).length, 47)
    assert.deepEqual(api.validateTerrainRules({ version: 2, terrain: 'Ground', mode: 'blob', connects: [], rules: blobRules }), [])
    const partial = api.validateTerrainRules({ version: 2, terrain: 'Ground', mode: 'blob', connects: [], rules: { '0': 0, '255': 1 } })
    assert.equal(partial[0]?.severity, 'warning')
    assert.equal(api.validateTerrainRules({ version: 2, terrain: 'Ground', mode: 'cardinal', connects: [], rules: { '0': 0 } })[0]?.severity, 'error')
  })

  await check('cardinal rules: brush, line, rectangle and eraser auto-tile the cells and their neighbours', () => {
    const terrain = rulesAsset({ terrain: 'Ground', mode: 'cardinal', rules: cardinalRules })
    const component = map(20, 12, terrain)
    assert.equal(stroke(component, 'brush', 100, { x: 5, y: 5 }), true)
    assert.equal(at(component, 5, 5), cardinalTile(0), 'an isolated cell')
    stroke(component, 'brush', 100, { x: 6, y: 5 })
    assert.equal(at(component, 5, 5), cardinalTile(2), 'neighbour on the right')
    assert.equal(at(component, 6, 5), cardinalTile(8), 'neighbour on the left')
    // Painting the terrain over itself keeps the rules' tile.
    assert.equal(stroke(component, 'brush', 100, { x: 5, y: 5 }), false)
    stroke(component, 'eraser', -1, { x: 6, y: 5 })
    assert.equal(at(component, 6, 5), -1)
    assert.equal(at(component, 5, 5), cardinalTile(0), 'erasing re-tiles the neighbour')
    stroke(component, 'rectangle', 100, { x: 10, y: 2 }, { x: 12, y: 4 })
    assert.equal(at(component, 11, 3), cardinalTile(15), 'rectangle centre')
    assert.equal(at(component, 10, 2), cardinalTile(1 | 2), 'bottom-left corner: up and right')
    assert.equal(at(component, 12, 4), cardinalTile(4 | 8), 'top-right corner: down and left')
    stroke(component, 'line', 100, { x: 0, y: 9 }, { x: 3, y: 9 })
    assert.deepEqual([0, 1, 2, 3].map(x => at(component, x, 9)), [cardinalTile(2), cardinalTile(10), cardinalTile(10), cardinalTile(8)])
    // A brush drag paints the cells between pointer samples.
    stroke(component, 'brush', 100, { x: 0, y: 0 }, { x: 4, y: 0 }, [{ x: 4, y: 0 }])
    assert.deepEqual([0, 1, 2, 3, 4].map(x => at(component, x, 0)), [cardinalTile(2), cardinalTile(10), cardinalTile(10), cardinalTile(10), cardinalTile(8)])
    // Decorations are painted as they are and do not join the terrain.
    stroke(component, 'brush', 120, { x: 5, y: 0 })
    assert.equal(at(component, 5, 0), 120)
    assert.equal(at(component, 4, 0), cardinalTile(8))
  })

  await check('fill and replace auto-tile the whole region once', () => {
    const terrain = rulesAsset({ terrain: 'Ground', mode: 'cardinal', rules: cardinalRules })
    const component = map(8, 6, terrain)
    assert.equal(stroke(component, 'fill', 100, { x: 3, y: 3 }), true)
    assert.equal(at(component, 0, 0), cardinalTile(1 | 2), 'map corner')
    assert.equal(at(component, 3, 3), cardinalTile(15), 'inside')
    assert.equal(at(component, 7, 2), cardinalTile(1 | 4 | 8), 'right edge')
    // Replace every inside tile with the decoration: the edge cells lose their inner neighbours.
    stroke(component, 'replace', 120, { x: 3, y: 3 })
    assert.equal(at(component, 3, 3), 120)
    assert.equal(at(component, 0, 0), cardinalTile(1 | 2), 'the corner keeps its two edge neighbours')
    assert.equal(at(component, 1, 1), 120)
    assert.equal(at(component, 0, 2), cardinalTile(1 | 4), 'left edge: up and down only')
  })

  await check('blob rules: corners follow diagonal neighbours, missing tiles fall back to the edge tile', () => {
    const terrain = rulesAsset({ terrain: 'Ground', mode: 'blob', rules: blobRules })
    const component = map(12, 10, terrain)
    stroke(component, 'rectangle', 100, { x: 2, y: 2 }, { x: 4, y: 4 })
    assert.equal(at(component, 3, 3), blobTile(255), 'centre of a 3×3 block')
    assert.equal(at(component, 2, 2), blobTile(1 | 2 | 4), 'bottom-left: N, NE, E')
    assert.equal(at(component, 3, 2), blobTile(1 | 2 | 4 | 64 | 128), 'bottom edge')
    stroke(component, 'eraser', -1, { x: 4, y: 4 })
    assert.equal(at(component, 3, 3), blobTile(255 & ~2), 'centre without its NE corner')
    const reduced = { ...blobRules }; delete reduced[String(255 & ~2)]
    assert.equal(api.saveTerrainRules(terrain, { version: 2, terrain: 'Ground', mode: 'blob', connects: [], rules: reduced }), true, 'rules saved')
    assert.equal(api.readTerrainRules(terrain).rules[String(255 & ~2)], undefined)
    stroke(component, 'rectangle', 100, { x: 6, y: 2 }, { x: 8, y: 4 })
    stroke(component, 'eraser', -1, { x: 8, y: 4 })
    assert.equal(at(component, 7, 3), blobTile(85), 'falls back to the tile for the same edges')
    const issues = api.diagnoseTileMap(component).filter(issue => issue.code === 'invalid-terrain')
    assert.equal(issues.length, 1); assert.equal(issues[0].severity, 'warning')
    observations.blobDiagnostic = issues[0].message
  })

  await check('connected terrains count as neighbours; per-map rules work without a panel choice', () => {
    state.terrainRulesAsset = null
    const terrain = rulesAsset({ terrain: 'Ground', mode: 'cardinal', connects: ['Grass'], rules: cardinalRules })
    const component = map(10, 6, terrain)
    stroke(component, 'brush', 100, { x: 2, y: 2 })
    stroke(component, 'brush', 110, { x: 3, y: 2 })
    assert.equal(at(component, 3, 2), 110, 'grass stays grass')
    assert.equal(at(component, 2, 2), cardinalTile(2), 'ground joins the grass on its right')
    const copy = map(10, 6, null)
    stroke(copy, 'brush', 100, { x: 2, y: 2 })
    assert.equal(at(copy, 2, 2), 100, 'no rules: the tile is painted as it is')
    const v1 = api.createTextAsset('Old Rules', 'terrainRules', JSON.stringify({ version: 1, terrain: 'Ground', rules: { 0: 7, 2: 8 } }), 'Assets/TerrainRules')
    const read = api.readTerrainRules(api.assetReference(v1.uuid))
    assert.equal(read.mode, 'cardinal'); assert.deepEqual(read.connects, []); assert.equal(read.rules['2'], 8)
  })

  await check('stamps paste exactly and the terrain around them joins; locked layers do not change', () => {
    const terrain = rulesAsset({ terrain: 'Ground', mode: 'cardinal', rules: cardinalRules })
    const component = map(10, 6, terrain)
    stroke(component, 'brush', 100, { x: 1, y: 1 })
    state.selection = { start: { x: 1, y: 1 }, end: { x: 1, y: 1 } }
    api.copyTileSelection(component)
    // Paste the isolated tile next to a ground cell: the pasted cell keeps its value, the neighbour joins it.
    stroke(component, 'brush', 100, { x: 5, y: 3 })
    stroke(component, 'stamp', 0, { x: 6, y: 3 })
    assert.equal(at(component, 6, 3), cardinalTile(0), 'the stamp is pasted as copied')
    assert.equal(at(component, 5, 3), cardinalTile(2), 'the ground next to it joins')
    state.clipboard = null; state.selection = null
    component.layers[component.activeLayer].locked = true
    assert.equal(stroke(component, 'brush', 100, { x: 8, y: 1 }), false)
    assert.equal(at(component, 8, 1), -1)
    component.layers[component.activeLayer].locked = false
  })

  await check('animated tiles rebuild only the chunks that hold them', () => {
    const asset = api.createTextAsset('Animated TileSet', 'tileset', JSON.stringify({ version: 2, textureAsset: 'asset://atlas', tileWidth: 16, tileHeight: 16, columns: 8, rows: 2, tiles: [{ index: 5, animation: { frames: [5, 6], framesPerSecond: 1, mode: 'Loop' } }] }), 'Assets/TileSets')
    let regions = 0
    const resources = new api.TileSetResourceOwner({ get generation() { return api.assetState.generation }, textureContentRevision: () => 0, resolveAsset: api.resolveAsset, readTextAsset: api.readTextAsset, resolveImportedTileSet: () => { throw new Error('not imported') }, resolveTextureRegion: (_reference, region) => { regions++; return { texture: 'atlas', ...region } } })
    const entity = api.createTileMapEntity(), component = entity.getComponent('TileMap2D')
    component.width = 64; component.height = 16; component.chunkSize = 32; component.tileSetAsset = api.assetReference(asset.uuid); component.layers = []; api.normalizeTileMap(component)
    component.tiles[2 * 64 + 3] = 5 // animated, chunk (0, 0)
    for (let x = 40; x < 48; x++) component.tiles[4 * 64 + x] = 1 // static, chunk (1, 0)
    const world = { entities: [entity] }
    const owner = new api.TileMapOwner({ world, resources, nowMilliseconds: () => 0 })
    owner.setTileAnimationTime(0.2)
    const first = owner.tileChunkCommands(entity, component, world.entities)
    assert.equal(first.length, 2)
    const firstRegions = regions
    owner.setTileAnimationTime(0.4)
    const same = owner.tileChunkCommands(entity, component, world.entities)
    assert.equal(regions, firstRegions, 'no frame change: nothing is rebuilt')
    assert.equal(same[0], first[0]); assert.equal(same[1], first[1])
    owner.setTileAnimationTime(1.2)
    const next = owner.tileChunkCommands(entity, component, world.entities)
    assert.equal(regions - firstRegions, 1, 'only the animated chunk walks its tiles again')
    const animated = next.find(command => command.sprites.length === 1), still = next.find(command => command.sprites.length === 8)
    assert.notEqual(animated, first.find(command => command.sprites.length === 1), 'the animated chunk is rebuilt')
    assert.equal(still, first.find(command => command.sprites.length === 8), 'the static chunk is reused')
    assert.equal(animated.sprites[0].texture.x, 6 * 16, 'and shows the next frame')
    observations.chunkRegions = { first: firstRegions, afterFrameChange: regions - firstRegions }
  })
} catch (error) {
  results.push({ name: 'setup', ok: false, error: String(error?.stack ?? error) }); console.log('FAIL setup\n   ', String(error?.stack ?? error))
} finally {
  await rm(out, { recursive: true, force: true })
}
await mkdir(join(root, '.cache', 'verify'), { recursive: true })
await writeFile(join(root, '.cache', 'verify', 'level-tools-2644.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results, observations }, null, 2))
const passed = results.filter(result => result.ok).length
console.log(`\n${passed}/${results.length} checks passed`)
process.exitCode = passed === results.length ? 0 : 1
