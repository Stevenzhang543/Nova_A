/** 26.40 editor workflow regression: real pointer and keyboard input against the built editor.
 *
 * Covers the defects fixed in 26.40 so they cannot silently return:
 *  - the New Project dialog keeps its Create action visible at common laptop heights;
 *  - the Select tool moves a selected object by dragging, and Undo restores it;
 *  - Play shows a running state and Stop restores the authored position;
 *  - reopening a current-schema recent project goes straight to the editor (no migration prompt);
 *  - dismissing the Web export folder picker is a cancellation, not a failed build.
 *
 * Usage: pnpm build (or vite build) first, then `node scripts/verify-2640-editor-workflow.mjs`.
 * Set NOVA_AUDIT_BROWSER to a Chromium executable on systems without Microsoft Edge. */
import assert from 'node:assert/strict'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'

const release = JSON.parse(await (await import('node:fs/promises')).readFile('package.json', 'utf8')).version.split('.').slice(0, 2).join('.')

await withBrowserAudit({ release, name: 'editor-workflow-2640', width: 1366, height: 768 }, async ({ evaluate, until, click, clickText, press, capture, check, client, viewport }) => {
  const rect = selector => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,right:r.right}})()`)
  const playerPosition = () => evaluate(`[...document.querySelectorAll('input')].filter(i=>/Position \\(X, Y\\)/.test(i.getAttribute('aria-label')||'')).map(i=>Number(i.value))`)
  const drag = async (from, to, steps = 12) => {
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x, y: from.y })
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', clickCount: 1 })
    for (let step = 1; step <= steps; step++) { await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x + (to.x - from.x) * step / steps, y: from.y + (to.y - from.y) * step / steps, button: 'left', buttons: 1 }); await wait(16) }
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.x, y: to.y, button: 'left', clickCount: 1 })
    await wait(200)
  }

  await check('New Project keeps its Create action on screen at laptop heights', async () => {
    await until("!!document.querySelector('.project-manager .new-project')")
    await click('.project-manager .new-project')
    await until("!!document.querySelector('.creation-dialog .create-button')")
    for (const [w, h] of [[1366, 768], [1280, 720]]) {
      await viewport(w, h); await wait(300)
      const button = await rect('.creation-dialog .create-button')
      assert.ok(button && button.bottom <= h && button.right <= w && button.y >= 0, `Create Project must be visible at ${w}x${h}: ${JSON.stringify(button)}`)
    }
    await viewport(1366, 768)
    await capture('new-project-dialog')
  })

  await check('Creating a platformer project opens the editor with one title bar', async () => {
    await clickText('.creation-dialog [data-template-id]', 'Platformer Scene')
    await click('.creation-dialog .create-button')
    await until("!!document.querySelector('.editor-root .top-bar .workspace-list')", 30000)
    await wait(800)
    if (await evaluate("!!document.querySelector('.ui-dialog [data-onboarding], .onboarding-dialog')")) await press('Escape')
    const skip = await evaluate("[...document.querySelectorAll('button')].findIndex(b=>b.textContent.trim()==='Skip for now')")
    if (skip >= 0) await clickText('button', 'Skip for now', true)
    assert.equal(await evaluate("document.querySelectorAll('.editor-root .workspace-control-row').length"), 0, 'Workspace navigation lives in the title bar')
    assert.equal(await evaluate("document.querySelector('.workspace-list>button.active')?.dataset.workspace"), 'design')
    await capture('editor-design')
  })

  await check('Select tool drags the selected object and Undo restores it', async () => {
    await clickText('.entity-item .name', 'Player')
    await until("[...document.querySelectorAll('input')].some(i=>/Position \\(X, Y\\)/.test(i.getAttribute('aria-label')||''))")
    const before = await playerPosition()
    assert.match(await evaluate("document.querySelector('.toolbar-content .ui-button.active')?.getAttribute('aria-label') || ''"), /select/i, 'The Select tool is active by default')
    // Frame the selection so the object sits at the canvas centre, then drag it like a user would.
    await clickText('.entity-item .name', 'Player', false)
    const row = await evaluate("[...document.querySelectorAll('.entity-item .name')].findIndex(e=>e.textContent.includes('Player'))")
    await click('.entity-item .name', row, 'right')
    await clickText('.context-menu button, .ui-menu button', 'Frame selection')
    await wait(1200)
    const canvas = await rect('.overlay-canvas')
    const centre = { x: canvas.x + canvas.w / 2, y: canvas.y + canvas.h / 2 }
    await drag(centre, { x: centre.x + 60, y: centre.y - 40 })
    const moved = await playerPosition()
    assert.notDeepEqual(moved, before, 'Dragging with the Select tool moves the object')
    await press('z', 2); await wait(250)
    assert.deepEqual(await playerPosition(), before, 'Undo restores the dragged object')
  })

  await check('Play shows the running state and Stop restores the authored scene', async () => {
    const before = await playerPosition()
    await click('.actionbar .play-button')
    await until("document.querySelector('.editor-root')?.dataset.playMode==='playing'")
    await wait(900)
    await capture('playing')
    await click('.actionbar .ui-button', 3)
    await until("document.querySelector('.editor-root')?.dataset.playMode==='editing'")
    await wait(300)
    assert.deepEqual(await playerPosition(), before, 'Stop restores the authored position')
  })

  await check('Dismissing the Web export folder picker is a cancellation, not a failure', async () => {
    await evaluate("window.showDirectoryPicker = () => Promise.reject(new DOMException('The user aborted a request.', 'AbortError')); true")
    await clickText('.workspace-list>button', 'Manage')
    await until("!!document.querySelector('.build-panel, [data-manage-section]') || [...document.querySelectorAll('button')].some(b=>/Build Settings/.test(b.textContent))", 20000)
    await clickText('button', 'Build Settings')
    await until("[...document.querySelectorAll('select')].some(s=>[...s.options].some(o=>o.value==='web-release'))", 20000)
    await evaluate("(()=>{const s=[...document.querySelectorAll('select')].find(s=>[...s.options].some(o=>o.value==='web-release'));s.value='web-release';s.dispatchEvent(new Event('change',{bubbles:true}));return true})()")
    await wait(400)
    await clickText('button', 'Build', true)
    await wait(800)
    const failed = await evaluate("document.querySelector('.status-bar .task-status b')?.textContent || ''")
    assert.equal(failed, '', 'A dismissed picker must not count as a failed task')
    assert.match(await evaluate("document.querySelector('.status-bar .status')?.textContent || ''"), /cancel/i)
  })

  await check('Reopening a current-schema recent project skips the migration prompt', async () => {
    await evaluate("location.reload(); true")
    await wait(1500)
    await until("!!document.querySelector('.project-manager .recent-main')", 30000)
    await click('.project-manager .recent-main')
    await until("!!document.querySelector('.editor-root .top-bar') || !!document.querySelector('.upgrade-dialog')", 30000)
    assert.equal(await evaluate("!!document.querySelector('.upgrade-dialog')"), false, 'No migration dialog for a current project')
  })
})
