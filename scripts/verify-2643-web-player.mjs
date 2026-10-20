/** 26.43 exported Web game in the built Player, desktop and iPad sizes:
 *  - the independent Player (no Vue/Editor code) starts the Platformer template from game.nova-pak;
 *  - the game fills the visible viewport exactly at 1280×800, 1194×834 (iPad landscape), 768×1024
 *    (iPad mini) and 507×834 (split view): no page scroll, canvas = viewport, backing store = DPR;
 *  - keyboard walks and jumps; on touch screens the automatic controls appear inside the safe area,
 *    do not overlap, and move/jump the player;
 *  - development exports open F3 statistics; Release exports have no debug tools;
 *  - the compatibility Player (`?legacyPlayer=1`) still runs the same package.
 *
 * Usage: build first (vite build), then `node scripts/verify-2643-web-player.mjs`. The package is
 * written to dist/game.nova-pak for the run and removed afterwards.
 * Set NOVA_AUDIT_BROWSER to a Chromium executable on systems without Microsoft Edge. */
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { webcrypto } from 'node:crypto'
import { build } from 'vite'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'

const root = process.cwd()
const release = JSON.parse(await (await import('node:fs/promises')).readFile('package.json', 'utf8')).version.split('.').slice(0, 2).join('.')
if (!globalThis.crypto) globalThis.crypto = webcrypto

// The Platformer template as the exporter packs it (deterministic package, every template asset).
const out = await mkdtemp(join(tmpdir(), 'nova-web-player-'))
let packages
try {
  const entry = join(out, 'entry.ts')
  await writeFile(entry, [`export { createTemplateProjectJson } from '${join(root, 'src/projects/templates.ts').replaceAll('\\', '/')}';`, `export { createNovaPak } from '${join(root, 'src/runtime/novaPak.ts').replaceAll('\\', '/')}';`].join('\n'))
  await writeFile(join(out, 'package.json'), '{"type":"module"}\n')
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, build: { ssr: true, outDir: join(out, 'build'), emptyOutDir: false, rollupOptions: { input: { pack: entry }, output: { entryFileNames: '[name].mjs' } } } })
  const api = await import(pathToFileURL(join(out, 'build', 'pack.mjs')).href)
  const pack = async profile => {
    const project = JSON.parse(api.createTemplateProjectJson('platformer', 'Web Player Check'))
    const buildSettings = project.projectSettings.build ?? {}
    project.projectSettings.build = { ...buildSettings, profile, developmentBuild: profile !== 'release', gameName: 'Web Player Check' }
    const startup = project.activeSceneUuid ?? project.scenes[0].uuid
    project.activeSceneUuid = startup
    return Buffer.from(await api.createNovaPak(JSON.stringify(project), project.assets ?? [], startup, { deterministic: true, compression: 'balanced', authoritativeAssets: true }))
  }
  packages = { development: await pack('debug'), release: await pack('release') }
} finally { await rm(out, { recursive: true, force: true }) }

const dist = join(root, process.env.NOVA_AUDIT_DIST_DIRECTORY || 'dist'), pakPath = join(dist, 'game.nova-pak')
try {
  await withBrowserAudit({ release, name: 'web-player-2643', width: 1280, height: 800 }, async ({ evaluate, until, press, capture, check, viewport, client, observations }) => {
    const origin = await evaluate('location.origin')
    const open = async (query, size, touch = false) => {
      await viewport(size[0], size[1])
      await client.send('Emulation.setTouchEmulationEnabled', touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false })
      await client.send('Emulation.setEmitTouchEventsForMouse', { enabled: touch, configuration: 'mobile' })
      await client.send('Page.navigate', { url: `${origin}/player.html${query}` })
      await wait(300)
      await until("(()=>{const d=globalThis.__NOVA_PLAYER__;return d&&(d.stage==='running'||d.stage==='failed'||d.mode==='legacy'&&!!document.querySelector('.player-root canvas'))})()", 40000)
      await wait(900)
    }
    const state = () => evaluate(`(()=>{const d=globalThis.__NOVA_PLAYER__,s=d?.session,w=s?.runtime?.presentation?.world,p=w?.entities.find(e=>e.name==='Player'),c=document.querySelector('.nova-player-world'),o=document.querySelector('.nova-player-overlay'),r=c?.getBoundingClientRect();return{mode:d?.mode,stage:d?.stage,fallback:d?.fallbackReason,backend:s?.view?.stats.backend,frames:s?.view?.stats.frames,player:p?{x:p.transform.position.x,y:p.transform.position.y}:null,canvas:r?[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]:null,overlayBacking:o?[o.width,o.height]:null,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,scroll:[document.documentElement.scrollWidth-innerWidth,document.documentElement.scrollHeight-innerHeight],controls:[...document.querySelectorAll('.nova-player-control')].map(b=>{const q=b.getBoundingClientRect();return{label:b.getAttribute('aria-label'),x:q.x,y:q.y,w:q.width,h:q.height}}),fullscreen:!!document.querySelector('.nova-player-fullscreen'),debug:s?(s.debug?{...s.debug.state}:null):undefined,stats:[...document.querySelectorAll('.nova-player-debug-stats, .nova-player-debug-canvas')].some(e=>getComputedStyle(e).display!=='none')}})()`)

    await writeFile(pakPath, packages.development)
    await check('The independent Player starts the exported Platformer and fills the page at desktop and iPad sizes', async () => {
      for (const size of [[1280, 800], [1194, 834], [768, 1024], [507, 834]]) {
        await open('?legacyPlayer=0', size)
        const value = await state()
        assert.equal(value.mode, 'independent'); assert.equal(value.stage, 'running', JSON.stringify(value))
        assert.ok(value.frames > 0, 'frames are drawn')
        assert.deepEqual(value.scroll, [0, 0], `${size}: no page scroll`)
        assert.deepEqual(value.canvas, [0, 0, size[0], size[1]], `${size}: the game canvas is the viewport`)
        assert.deepEqual(value.overlayBacking, [Math.round(size[0] * value.dpr), Math.round(size[1] * value.dpr)].map(v => Math.max(1, v)), `${size}: backing store follows the pixel ratio`)
        assert.ok(value.fullscreen, 'a browser game offers full screen')
        observations.push({ name: `player-${size.join('x')}`, backend: value.backend, frames: value.frames })
        await capture(`player-${size.join('x')}`)
      }
    })
    // Jump first, from the start position (open sky above); walking right ends under the floating
    // platform, where a jump stops at its underside.
    await check('Keyboard: Space jumps and D walks right', async () => {
      await open('?legacyPlayer=0', [1280, 800])
      const start = (await state()).player
      await press(' ', 0, 90); await wait(220)
      const jumped = (await state()).player
      assert.ok(jumped.y > start.y + .3, `jumped ${start.y} → ${jumped.y}`)
      await wait(1200)
      const landed = (await state()).player
      await press('d', 0, 500)
      const walked = (await state()).player
      assert.ok(walked.x > landed.x + 1, `walked ${landed.x} → ${walked.x}`)
    })
    await check('Touch: automatic controls sit inside the screen without overlapping and move the player', async () => {
      await open('?legacyPlayer=0', [768, 1024], true)
      const value = await state()
      assert.equal(value.controls.length, 3, JSON.stringify(value.controls))
      for (const control of value.controls) assert.ok(control.x >= 0 && control.y >= 0 && control.x + control.w <= 768 && control.y + control.h <= 1024, JSON.stringify(control))
      for (const [index, a] of value.controls.entries()) for (const b of value.controls.slice(index + 1)) assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${a.label} overlaps ${b.label}`)
      const right = value.controls.find(control => /▶/.test(control.label)) ?? value.controls[1], jump = value.controls.find(control => /jump/i.test(control.label)) ?? value.controls.at(-1)
      const touch = async (control, ms) => { const point = { x: control.x + control.w / 2, y: control.y + control.h / 2 }; await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1 }] }); await wait(ms); await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }) }
      const start = value.player
      await touch(jump, 90); await wait(220); const jumped = (await state()).player
      assert.ok(jumped.y > start.y + .3, `touch jump ${start.y} → ${jumped.y}`)
      await wait(1200); const landed = (await state()).player
      await touch(right, 500); const moved = (await state()).player
      assert.ok(moved.x > landed.x + 1, `touch walk ${landed.x} → ${moved.x}`)
      await capture('player-touch-768')
      await client.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    })
    await check('Development exports open F3 statistics; Release exports have no debug tools', async () => {
      await open('?legacyPlayer=0', [1280, 800])
      const closed = await state()
      assert.deepEqual(closed.debug, { stats: false, physics: false }); assert.equal(closed.stats, false, 'closed debug tools take no space')
      await press('F3'); await wait(400)
      assert.equal((await state()).stats, true, 'F3 shows frame statistics')
      await writeFile(pakPath, packages.release)
      await open('?legacyPlayer=0&debug=stats,physics', [1280, 800])
      const value = await state()
      assert.equal(value.stage, 'running'); assert.equal(value.debug, null, 'no debug tools in a Release export'); assert.equal(value.stats, false)
      await writeFile(pakPath, packages.development)
    })
    await check('The compatibility Player still runs the same package', async () => {
      await open('?legacyPlayer=1', [1280, 800])
      const value = await evaluate("({mode:globalThis.__NOVA_PLAYER__?.mode,canvas:!!document.querySelector('.player-root canvas'),error:document.querySelector('.player-status.error')?.textContent??''})")
      assert.deepEqual(value, { mode: 'legacy', canvas: true, error: '' })
    })
  })
} finally { await rm(pakPath, { force: true }) }
