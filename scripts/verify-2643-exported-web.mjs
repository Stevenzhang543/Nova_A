/** 26.43 release check: play a Web game exported by the editor (Build Settings → Web) in a browser.
 *
 * Serves the export folder as a static site (index.html, assets/, game.nova-pak) and, with real keyboard
 * input, checks that:
 *  - the independent Player starts the game (no fallback to the compatibility Player) and draws frames;
 *  - the game fills the window with no page scroll at a desktop and an iPad size;
 *  - Space makes the player jump and D walks it right (an entity named "Player", as in the Platformer).
 *
 * Usage: node scripts/verify-2643-exported-web.mjs <export folder inside this repository>
 * (Microsoft Edge, or NOVA_AUDIT_BROWSER naming a Chromium executable). Results: release-audits/v<release>-exported-web.json */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'

const root = process.cwd()
const folder = process.argv.slice(2).find(arg => !arg.startsWith('--'))
assert.ok(folder, 'Usage: node scripts/verify-2643-exported-web.mjs <export folder>')
const exported = resolve(root, folder)
await readFile(resolve(exported, 'game.nova-pak'))
process.env.NOVA_AUDIT_DIST_DIRECTORY = relative(root, exported)
const release = JSON.parse(await readFile('package.json', 'utf8')).version.split('.').slice(0, 2).join('.')
const started = "(()=>{const d=globalThis.__NOVA_PLAYER__;return !!d&&(d.stage==='running'||d.stage==='failed'||d.mode==='legacy')})()"

await withBrowserAudit({ release, name: 'exported-web', width: 1280, height: 800, readyExpression: started, qualifyRelease: false }, async ({ evaluate, until, press, capture, check, viewport, client, observations }) => {
  const state = () => evaluate(`(()=>{const d=globalThis.__NOVA_PLAYER__,s=d?.session,w=s?.runtime?.presentation?.world,p=w?.entities.find(e=>e.name==='Player'),c=document.querySelector('.nova-player-world'),r=c?.getBoundingClientRect();return{mode:d?.mode,stage:d?.stage,fallback:d?.fallbackReason,game:s?.gameName,backend:s?.view?.stats.backend,frames:s?.view?.stats.frames,player:p?{x:p.transform.position.x,y:p.transform.position.y}:null,canvas:r?[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]:null,scroll:[document.documentElement.scrollWidth-innerWidth,document.documentElement.scrollHeight-innerHeight],title:document.title}})()`)
  const reload = async () => { await client.send('Page.reload', { ignoreCache: true }); await wait(300); await until(started, 40000); await wait(900) }

  await check('The exported game starts in the independent Player', async () => {
    const value = await state()
    assert.equal(value.mode, 'independent', JSON.stringify(value)); assert.equal(value.stage, 'running', JSON.stringify(value))
    assert.equal(value.fallback, '', 'no fallback'); assert.ok(value.frames > 0, 'frames are drawn'); assert.ok(value.player, 'the game has a Player entity')
    observations.push({ name: 'game', game: value.game, title: value.title, backend: value.backend })
    await capture('start-1280')
  })
  await check('The game fills the window at desktop and iPad sizes without page scroll', async () => {
    for (const size of [[1280, 800], [1194, 834]]) {
      await viewport(size[0], size[1]); await reload()
      const value = await state()
      assert.deepEqual(value.scroll, [0, 0], `${size}: no page scroll`)
      assert.deepEqual(value.canvas, [0, 0, size[0], size[1]], `${size}: the game canvas is the window`)
    }
    await capture('ipad-1194')
  })
  await check('Space jumps and D walks right', async () => {
    await viewport(1280, 800); await reload()
    const start = (await state()).player
    await press(' ', 0, 90); await wait(220)
    const jumped = (await state()).player
    assert.ok(jumped.y > start.y + .3, `jumped ${start.y} → ${jumped.y}`)
    await wait(1200)
    const landed = (await state()).player
    await press('d', 0, 500)
    const walked = (await state()).player
    assert.ok(walked.x > landed.x + 1, `walked ${landed.x} → ${walked.x}`)
    observations.push({ name: 'input', start, jumped, landed, walked })
    await capture('after-input')
  })
})
