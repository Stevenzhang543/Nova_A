/** 26.41 editor regression: real pointer and keyboard input against the built editor.
 *
 * Covers the 26.41 display and play-mode fixes so they cannot silently return:
 *  - the viewport chrome (scene tabs, tools, layers) floats over the canvas as one row of capsules;
 *  - a collapsed Inspector section points its chevron sideways (one rotation, not a doubled 180° turn);
 *  - while playing, the Runtime moves objects and the Inspector follows them (plain-access frames still
 *    publish to the editor), and Stop restores the authored scene;
 *  - the notification history lives in the status bar instead of a pill floating over the panels;
 *  - Settings rows put every control on one trailing column;
 *  - the Create object categories wrap instead of clipping off the dialog edge.
 *
 * Usage: build first (vite build), then `node scripts/verify-2641-editor-ui.mjs`.
 * Set NOVA_AUDIT_BROWSER to a Chromium executable on systems without Microsoft Edge. */
import assert from 'node:assert/strict'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'

const release = JSON.parse(await (await import('node:fs/promises')).readFile('package.json', 'utf8')).version.split('.').slice(0, 2).join('.')

await withBrowserAudit({ release, name: 'editor-ui-2641', width: 1366, height: 768 }, async ({ evaluate, until, click, clickText, press, capture, check }) => {
  const playerPosition = () => evaluate(`[...document.querySelectorAll('input')].filter(i=>/Position \\(X, Y\\)/.test(i.getAttribute('aria-label')||'')).map(i=>Number(i.value))`)

  await check('A platformer project opens with the viewport chrome floating over the canvas', async () => {
    await until("!!document.querySelector('.project-manager .new-project')")
    await click('.project-manager .new-project')
    await until("!!document.querySelector('.creation-dialog .create-button')")
    await clickText('.creation-dialog [data-template-id]', 'Platformer Scene')
    await click('.creation-dialog .create-button')
    await until("!!document.querySelector('.editor-root .top-bar .workspace-list')", 30000)
    await wait(800)
    if (await evaluate("!!document.querySelector('.ui-dialog [data-onboarding], .onboarding-dialog')")) await press('Escape')
    const skip = await evaluate("[...document.querySelectorAll('button')].findIndex(b=>b.textContent.trim()==='Skip for now')")
    if (skip >= 0) await clickText('button', 'Skip for now', true)
    const chrome = await evaluate(`(()=>{const c=document.querySelector('.viewport-chrome'),canvas=document.querySelector('.overlay-canvas');if(!c||!canvas)return null;const a=c.getBoundingClientRect(),b=canvas.getBoundingClientRect();return {capsules:c.querySelectorAll('.nv-glass').length,inside:a.top>=b.top-1&&a.bottom<=b.top+120,header:!!document.querySelector('.viewport-header')}})()`)
    assert.ok(chrome, 'The viewport chrome overlay exists')
    assert.equal(chrome.header, false, 'The old opaque viewport header is gone')
    assert.ok(chrome.capsules >= 3 && chrome.inside, `Scene tabs, tools and layers float over the top of the canvas: ${JSON.stringify(chrome)}`)
    await capture('editor-chrome')
  })

  await check('Collapsed Inspector sections turn their chevron once', async () => {
    await clickText('.entity-item .name', 'Player')
    await until("[...document.querySelectorAll('input')].some(i=>/Position \\(X, Y\\)/.test(i.getAttribute('aria-label')||''))")
    const turns = await evaluate(`[...document.querySelectorAll('.config-panel details.ui-property-section:not([open]) > summary > .editor-icon')].map(i=>{const s=getComputedStyle(i);return s.transform+'|'+s.rotate})`)
    assert.ok(turns.length > 0, 'The Player has collapsed sections')
    for (const turn of turns) assert.equal(turn, 'none|-90deg', `A collapsed chevron rotates once and points sideways: ${turn}`)
  })

  await check('Playing moves the Player, the Inspector follows, and Stop restores it', async () => {
    const before = await playerPosition()
    await click('.actionbar .play-button')
    await until("document.querySelector('.editor-root')?.dataset.playMode==='playing'")
    await wait(700)
    // Keys typed while a toolbar button has focus belong to that button; click neutral chrome first like a player would.
    await click('.status-bar .status')
    await press('d', 0, 900)
    // Software-rendered CI browsers simulate slowly; wait for the Inspector rather than for a fixed time.
    const authored = JSON.stringify(before)
    await until(`JSON.stringify([...document.querySelectorAll('input')].filter(i=>/Position \\(X, Y\\)/.test(i.getAttribute('aria-label')||'')).map(i=>Number(i.value)))!==${JSON.stringify(authored)}`, 15000).catch(() => {})
    const during = await playerPosition()
    assert.notDeepEqual(during, before, `The Inspector shows the running position (${JSON.stringify(before)} -> ${JSON.stringify(during)})`)
    await capture('playing-inspector')
    await click('.actionbar .ui-button', 3)
    await until("document.querySelector('.editor-root')?.dataset.playMode==='editing'")
    await wait(300)
    assert.deepEqual(await playerPosition(), before, 'Stop restores the authored position')
  })

  await check('Notification history opens from the status bar, not a floating pill', async () => {
    await until("document.querySelectorAll('.toast-stack article').length===0", 30000)
    assert.equal(await evaluate("!!document.querySelector('.notification-summary')"), false, 'No pill floats over the panels once toasts are gone')
    if (await evaluate("!!document.querySelector('.status-bar .notification-status')")) {
      await click('.status-bar .notification-status')
      await until("!!document.querySelector('#editor-notification-history')")
      await press('Escape')
      await until("!document.querySelector('#editor-notification-history')")
    }
  })

  await check('Create object categories wrap inside the dialog', async () => {
    const create = await evaluate("[...document.querySelectorAll('.viewport-chrome .ui-button')].findIndex(b=>b.getAttribute('aria-label')==='Create object')")
    assert.ok(create >= 0, 'The floating tools offer Create object')
    await click('.viewport-chrome .ui-button', create)
    await until("!!document.querySelector('.authoring-dialog nav')")
    const nav = await evaluate("(()=>{const n=document.querySelector('.authoring-dialog nav');const d=n.closest('.ui-dialog')||n.parentElement;const a=n.getBoundingClientRect(),b=d.getBoundingClientRect();return {overflow:n.scrollWidth-n.clientWidth,right:a.right,dialogRight:b.right,last:[...n.querySelectorAll('button')].pop().getBoundingClientRect().right}})()")
    assert.ok(nav.overflow <= 1 && nav.last <= nav.dialogRight, `Every category is visible: ${JSON.stringify(nav)}`)
    await capture('create-object')
    await clickText('.authoring-dialog button', 'Cancel', true)
    await until("!document.querySelector('.authoring-dialog')")
  })

  await check('Settings rows align every control on one trailing column', async () => {
    await clickText('.workspace-list>button', 'Manage')
    await until("!!document.querySelector('.settings-page .ui-toggle')", 20000)
    const edges = await evaluate("[...document.querySelectorAll('.settings-page .ui-property-section')][0] ? [...[...document.querySelectorAll('.settings-page .ui-property-section')][0].querySelectorAll('.ui-toggle')].map(t=>Math.round(t.getBoundingClientRect().right)) : []")
    assert.ok(edges.length >= 3, 'Appearance has several switches')
    assert.ok(Math.max(...edges) - Math.min(...edges) <= 1, `Switches share one trailing edge: ${edges}`)
    assert.equal(await evaluate("[...document.querySelectorAll('.settings-search .ui-property-label')].length"), 0, 'The search field is not repeated as a label')
    await capture('settings')
  })
})
