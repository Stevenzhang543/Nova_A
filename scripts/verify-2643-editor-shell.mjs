/** 26.43 G1 editor window structure, with real pointer and keyboard input against the built editor:
 *  - the canvas keeps at least 640 px at 1100 and 1280 px windows (both panels stay docked from 1240 px,
 *    narrower under 1480 px; the inspector floats below 1240 px);
 *  - a narrow title bar (iPad portrait, split view) folds the six menus into one Menu button whose list
 *    opens the same menus, never overflows, and keeps the workspace switcher and Run reachable;
 *  - F6 / Shift+F6 move the keyboard between title bar, hierarchy, viewport, inspector and bottom panel;
 *    Alt alone focuses the menus;
 *  - the Inspector's body type is a segmented control that edits the object and undoes in one step.
 *
 * Usage: build first (vite build), then `node scripts/verify-2643-editor-shell.mjs`.
 * Set NOVA_AUDIT_BROWSER to a Chromium executable on systems without Microsoft Edge. */
import assert from 'node:assert/strict'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'

const release = JSON.parse(await (await import('node:fs/promises')).readFile('package.json', 'utf8')).version.split('.').slice(0, 2).join('.')
const ALT = 1, CTRL = 2, SHIFT = 8

await withBrowserAudit({ release, name: 'editor-shell-2643', width: 1600, height: 900 }, async ({ evaluate, until, click, clickText, press, capture, check, viewport, observations }) => {
  const shell = () => evaluate(`(()=>{const r=s=>{const e=document.querySelector(s);if(!e||!e.getClientRects().length)return null;const b=e.getBoundingClientRect();return{x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)}};const top=document.querySelector('.top-bar');return{layout:document.querySelector('.editor-root')?.dataset.layout,compactDocks:document.querySelector('.editor-root')?.dataset.compactDocks==='true',canvas:r('.editor-content'),hierarchy:r('.left-dock .sidebar-container'),inspector:r('.right-dock .config-wrapper'),topOverflow:top?top.scrollWidth-top.clientWidth:-1,pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,appMenu:!!document.querySelector('[data-testid="app-menu"]'),menus:document.querySelectorAll('.menu-item>button[data-menu]').length,run:r('.actionbar .play-button'),workspaces:[...document.querySelectorAll('.workspace-list>button')].filter(b=>{const a=b.getBoundingClientRect(),l=b.parentElement.getBoundingClientRect();return a.width>0&&a.left>=l.left-1&&a.right<=l.right+1}).length,brand:!!r('.brand')}})()`)

  await check('A platformer project opens in the editor', async () => {
    await until("!!document.querySelector('.project-manager .new-project')")
    await click('.project-manager .new-project')
    await until("!!document.querySelector('.creation-dialog .create-button')")
    await clickText('.creation-dialog [data-template-id]', 'Platformer Scene')
    await click('.creation-dialog .create-button')
    await until("!!document.querySelector('.editor-root .top-bar .workspace-list')", 30000)
    await wait(800)
    const skip = await evaluate("[...document.querySelectorAll('button')].findIndex(b=>b.textContent.trim()==='Skip for now')")
    if (skip >= 0) await clickText('button', 'Skip for now', true)
    await wait(300)
  })

  await check('The canvas keeps at least 640 px at 1100 and 1280 px; panels dock from 1240 px', async () => {
    const sizes = {}
    for (const [width, height] of [[1600, 900], [1280, 800], [1100, 720]]) {
      await viewport(width, height); await wait(500)
      const value = await shell(); sizes[width] = value
      assert.equal(value.pageOverflow, 0, `${width}: no horizontal page scroll`)
      assert.equal(value.topOverflow, 0, `${width}: the title bar fits`)
      assert.ok(value.canvas && value.canvas.w >= 640, `${width}: canvas ${JSON.stringify(value.canvas)}`)
    }
    assert.equal(sizes[1600].layout, 'wide'); assert.ok(sizes[1600].hierarchy && sizes[1600].inspector, 'both panels docked at 1600')
    assert.equal(sizes[1280].layout, 'wide'); assert.equal(sizes[1280].compactDocks, true); assert.ok(sizes[1280].hierarchy && sizes[1280].inspector, 'both panels docked at 1280')
    assert.equal(sizes[1100].layout, 'medium')
    observations.push({ name: 'canvas-widths', ...Object.fromEntries(Object.entries(sizes).map(([key, value]) => [key, { layout: value.layout, canvas: value.canvas?.w, hierarchy: value.hierarchy?.w ?? null, inspector: value.inspector?.w ?? null }])) })
    await viewport(1280, 800); await capture('compact-docks-1280')
  })

  await check('A narrow title bar folds the menus into one Menu button that opens the same menus', async () => {
    for (const [width, height] of [[768, 1024], [507, 834]]) {
      await viewport(width, height); await wait(500)
      const value = await shell()
      assert.equal(value.topOverflow, 0, `${width}: the title bar does not overflow`)
      assert.equal(value.pageOverflow, 0, `${width}: no horizontal page scroll`)
      assert.ok(value.appMenu && value.menus === 0, `${width}: one Menu button replaces the six menus`)
      assert.ok(value.run && value.run.x + value.run.w <= width, `${width}: Run stays in the title bar`)
      assert.ok(value.workspaces >= (width >= 700 ? 6 : 5), `${width}: ${value.workspaces} workspace buttons visible`)
      if (width < 600) assert.equal(value.brand, false, 'the brand mark gives way below 600 px')
      observations.push({ name: `title-bar-${width}`, workspaces: value.workspaces, run: value.run })
    }
    await viewport(768, 1024); await wait(400)
    await click('[data-testid="app-menu"]')
    await until("!!document.querySelector('.dropdown.app-menu:not([inert])')")
    await click('.dropdown.app-menu button[data-menu="edit"]')
    await until("[...document.querySelectorAll('.dropdown:not([inert]) button')].some(b=>/Undo/.test(b.textContent))")
    await capture('app-menu-edit-768')
    await press('Escape'); await wait(250)
    assert.equal(await evaluate("document.querySelectorAll('.dropdown:not([inert])').length"), 0, 'Escape closes the menu')
  })

  await check('F6 and Shift+F6 move between the editor regions; Alt alone focuses the menus', async () => {
    await viewport(1600, 900); await wait(500)
    await click('.editor-content canvas.overlay-canvas, .editor-content canvas')
    const region = () => evaluate(`(()=>{const a=document.activeElement;if(!a)return'';for(const [name,s] of [['title','.top-bar'],['hierarchy','.left-dock'],['viewport','.editor-content'],['inspector','.right-dock'],['bottom','.bottom-panel']])if(a.closest(s))return name;return a.tagName})()`)
    const forward = []
    for (let index = 0; index < 5; index++) { await press('F6'); await wait(120); forward.push(await region()) }
    for (const name of ['title', 'hierarchy', 'viewport', 'inspector', 'bottom']) assert.ok(forward.includes(name), `F6 reaches ${name}: ${forward.join(' → ')}`)
    const before = await region(); await press('F6', SHIFT); await wait(120); const after = await region()
    assert.notEqual(after, before, 'Shift+F6 moves back')
    await click('.editor-content canvas.overlay-canvas, .editor-content canvas')
    await press('Alt', ALT); await wait(150)
    assert.equal(await evaluate("document.activeElement?.closest('.menu-item')?document.activeElement.dataset.menu||'app':''"), 'file', 'Alt focuses the first menu')
    await press('Escape')
    observations.push({ name: 'f6-cycle', forward })
  })

  await check('Body type is a segmented control that edits the object and undoes in one step', async () => {
    await clickText('.ui-tree-row', 'Player')
    await until("!!document.querySelector('.body-type-segmented')", 10000)
    const checked = () => evaluate("document.querySelector('.body-type-segmented button[aria-checked=\"true\"]')?.textContent.trim()")
    const start = await checked()
    assert.ok(start, 'one body type is selected')
    await clickText('.body-type-segmented button', 'Static', true); await wait(200)
    assert.equal(await checked(), 'Static')
    await capture('body-type-static')
    await press('z', CTRL); await wait(300)
    assert.equal(await checked(), start, 'one undo restores the previous body type')
  })
})
