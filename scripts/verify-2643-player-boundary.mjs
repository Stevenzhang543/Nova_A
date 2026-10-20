/** 26.43 P-E2: the exported game's Player starts without Vue, the Editor stores, Editor components or
 * Editor i18n. Builds the real production Player bundle (in memory) and checks every module that loads
 * before the game runs: the entry chunk and its static imports. The compatibility Player stays a lazily
 * loaded chunk and is reported separately.
 *
 * Desktop exports (index.html in game mode) are handed to the same page.
 *
 * Usage: node scripts/verify-2643-player-boundary.mjs. Results: .cache/verify/player-boundary-2643.json */
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { build, loadConfigFromFile } from 'vite'

const root = process.cwd()
const chunks = new Map()
// The project's own configuration (plugins, chunking), with only the Player as input.
const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, join(root, 'vite.config.ts'), root, 'error')
const config = loaded.config
config.plugins = [...(config.plugins ?? []).flat().filter(plugin => plugin?.name !== 'nova-manual-assets'), { name: 'nova-player-boundary', generateBundle(_, bundle) { for (const item of Object.values(bundle)) if (item.type === 'chunk') chunks.set(item.fileName, item) } }]
config.build = { ...config.build, write: false, emptyOutDir: false, reportCompressedSize: false, manifest: false, rollupOptions: { ...config.build?.rollupOptions, input: { player: join(root, 'player.html') } } }
await build({ ...config, root, configFile: false, logLevel: 'error' })
const normalize = id => relative(root, id.split('?')[0]).split(sep).join('/')
const forbidden = id => /(^|\/)node_modules\/(\.pnpm\/[^/]*\/node_modules\/)?(vue|@vue|pinia)\//.test(id) || /^src\/(store|components|editor|panels|layout)\//.test(id) || /\.vue$/.test(id) || id === 'src/i18n.ts'
const entry = [...chunks.values()].find(chunk => chunk.isEntry && chunk.facadeModuleId && normalize(chunk.facadeModuleId).endsWith('player.html'))
  ?? [...chunks.values()].find(chunk => chunk.isEntry)
assert.ok(entry, 'the Player entry chunk exists')
const startup = new Set(), queue = [entry.fileName]
while (queue.length) { const name = queue.shift(); if (startup.has(name)) continue; startup.add(name); queue.push(...(chunks.get(name)?.imports ?? [])) }
const startupModules = [...startup].flatMap(name => Object.keys(chunks.get(name)?.modules ?? {}).map(normalize))
const lazy = [...chunks.keys()].filter(name => !startup.has(name))
const lazyModules = lazy.flatMap(name => Object.keys(chunks.get(name).modules).map(normalize))
const bytes = names => names.reduce((sum, name) => sum + Buffer.byteLength(chunks.get(name)?.code ?? ''), 0)
const results = [], check = (name, run) => { try { run(); results.push({ name, ok: true }); console.log('PASS', name) } catch (error) { results.push({ name, ok: false, error: String(error?.message ?? error) }); console.log('FAIL', name, '\n   ', String(error?.message ?? error)) } }
const observed = {
  entry: entry.fileName, startupChunks: [...startup], startupBytes: bytes([...startup]), startupModules: startupModules.length,
  lazyChunks: lazy.length, lazyBytes: bytes(lazy), forbiddenAtStartup: startupModules.filter(forbidden),
  legacyChunkModules: lazyModules.filter(id => id === 'src/PlayerApp.vue' || id === 'src/playerLegacy.ts')
}
check('nothing the game needs at startup imports Vue, Editor stores/components/panels or Editor i18n', () => assert.deepEqual(observed.forbiddenAtStartup, []))
check('the independent Player composition is in the startup bundle', () => { for (const id of ['src/runtime/player/playerHost.ts', 'src/runtime/player/playerView.ts', 'src/runtime/GameplayRuntimeCore.ts']) assert.ok(startupModules.includes(id), id) })
check('the compatibility Player is a lazily loaded chunk (fallback only)', () => { assert.ok(observed.legacyChunkModules.includes('src/PlayerApp.vue')); assert.ok(!startupModules.includes('src/PlayerApp.vue')) })
// Desktop exports (the editor binary in game mode) open index.html; App.vue must hand them to player.html,
// which the app build packs next to index.html.
const appSource = await readFile(join(root, 'src', 'App.vue'), 'utf8'), viteSource = await readFile(join(root, 'vite.config.ts'), 'utf8')
check('desktop exports start the independent Player page too', () => {
  assert.match(appSource, /invoke<boolean>\('runtime_mode'\)\)\s*\{\s*location\.replace\(new URL\('player\.html', location\.href\)\.href\)/)
  assert.match(viteSource, /player:\s*resolve\(projectRoot, 'player\.html'\)/)
})
await mkdir(join(root, '.cache', 'verify'), { recursive: true })
await writeFile(join(root, '.cache', 'verify', 'player-boundary-2643.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results, observed: { ...observed, startupModuleList: startupModules.sort() } }, null, 2))
console.log(`startup: ${observed.startupChunks.length} chunks, ${(observed.startupBytes / 1024).toFixed(0)} KiB JS; lazy: ${observed.lazyChunks} chunks, ${(observed.lazyBytes / 1024).toFixed(0)} KiB`)
const failed = results.filter(item => !item.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
