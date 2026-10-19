/** 26.42 glass budget and Play-mode degradation (docs/DEV_MANUAL_26_42.md, P-A and G0).
 *
 *  - While editing, at most five visible elements carry a live backdrop-filter;
 *  - while playing, none do, and the floating viewport controls fade out after 1.5 s without pointer
 *    movement and come back on the next movement;
 *  - in the Game view of a scene without lights, post effects or UI, the overlay canvas is cleared at most
 *    twice during Play instead of every frame (P-A, counted by globalThis.__novaOverlayStats);
 *  - "Reduce transparency" in Settings writes data-reduce-transparency and removes every backdrop-filter;
 *  - the default System palettes keep secondary labels at a contrast of at least 4.5:1.
 *
 * Usage: build first (vite build), then `node scripts/verify-2642-glass-budget.mjs`.
 * Set NOVA_AUDIT_BROWSER to a Chromium executable on systems without Microsoft Edge. */
import assert from 'node:assert/strict'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'

const release = JSON.parse(await (await import('node:fs/promises')).readFile('package.json', 'utf8')).version.split('.').slice(0, 2).join('.')
const LIVE_GLASS = `[...document.querySelectorAll('body *')].filter(e=>{const s=getComputedStyle(e);const f=s.backdropFilter||s.webkitBackdropFilter||'none';if(f==='none')return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'})`
const glassCount = `${LIVE_GLASS}.length`
const glassNames = `${LIVE_GLASS}.map(e=>e.tagName.toLowerCase()+'.'+[...e.classList].slice(0,3).join('.'))`

await withBrowserAudit({ release, name: 'glass-budget-2642', width: 1440, height: 900, commandTimeoutMs: 120000 }, async ({ evaluate, until, click, clickText, press, capture, check, client, observations }) => {
  const openTemplate = async name => {
    await until("!!document.querySelector('.project-manager .new-project')", 30000)
    await click('.project-manager .new-project')
    await until("!!document.querySelector('.creation-dialog .create-button')")
    await clickText('.creation-dialog [data-template-id]', name)
    await click('.creation-dialog .create-button')
    await until("!!document.querySelector('.editor-root .top-bar .workspace-list')", 30000)
    await wait(800)
    const skip = await evaluate("[...document.querySelectorAll('button')].findIndex(b=>b.textContent.trim()==='Skip for now')")
    if (skip >= 0) await clickText('button', 'Skip for now', true)
    // Software-rendered CI browsers compile scripts and warm the renderer for several seconds after opening.
    await wait(8000)
  }
  const play = async () => { await click('.actionbar .play-button'); await until("document.querySelector('.editor-root')?.dataset.playMode==='playing'") }
  const stop = async () => { await click('.actionbar .ui-button', 3); await until("document.querySelector('.editor-root')?.dataset.playMode==='editing'") }
  const move = async (x, y) => client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' })

  await check('Editing keeps live glass within the budget of five layers', async () => {
    await openTemplate('Platformer Scene')
    const count = await evaluate(glassCount)
    const names = await evaluate(glassNames)
    observations.push({ id: 'editing-glass', count, names })
    assert.ok(count <= 5, `Live backdrop-filter layers while editing: ${count} ${JSON.stringify(names)}`)
    assert.equal(await evaluate("document.documentElement.dataset.glass"), 'live')
    await capture('editing')
  })

  await check('Play removes every live backdrop-filter and the viewport controls fade when the pointer rests', async () => {
    await play()
    await move(700, 500)
    await wait(300)
    assert.equal(await evaluate(glassCount), 0, `Live glass while playing: ${JSON.stringify(await evaluate(glassNames))}`)
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.viewport-chrome')).opacity"), '1', 'The controls are visible right after the pointer moved')
    await wait(2200)
    assert.equal(await evaluate("document.querySelector('.editor-root').dataset.chromeIdle"), 'true', 'The layout marks the pointer as resting')
    await until("getComputedStyle(document.querySelector('.viewport-chrome')).opacity==='0'", 3000)
    await capture('playing-idle')
    // The controls fade out again 1.5 s after the last movement, so record the wake-up instead of racing the fade.
    await evaluate("window.__novaChromeWakes=0,new MutationObserver(()=>{if(!document.querySelector('.editor-root').dataset.chromeIdle)window.__novaChromeWakes++}).observe(document.querySelector('.editor-root'),{attributes:true,attributeFilter:['data-chrome-idle']}),true")
    await move(720, 520)
    await until('window.__novaChromeWakes>0', 5000)
    await click('.actionbar .ui-button', 1)
    await until("document.querySelector('.editor-root')?.dataset.playMode==='paused'")
    assert.equal(await evaluate(glassCount), 0, 'No live glass while paused either')
    await stop()
    await until(`${glassCount} > 0`, 5000)
  })

  await check('The Game view of an unlit scene clears its overlay at most twice during Play', async () => {
    // Return to the launcher and open the Clear Scene template (no light, post effect, debug view or UI).
    await evaluate("setTimeout(()=>location.reload(),50),true")
    await wait(1000)
    // Leaving an edited project asks for confirmation (beforeunload); accept it like a user would.
    await client.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {})
    await wait(2000)
    await until("!!document.querySelector('.project-manager .new-project')", 30000)
    await openTemplate('Clear Scene')
    await press('P', 10)
    await until("!!document.querySelector('.command-palette input[type=search]')", 5000)
    await (async () => { await client.send('Input.insertText', { text: 'Game view' }); await wait(300); await press('Enter') })()
    await until("!!globalThis.__novaOverlayStats", 10000)
    await play()
    await wait(600)
    const before = await evaluate('({...globalThis.__novaOverlayStats})')
    await wait(10_000)
    const after = await evaluate('({...globalThis.__novaOverlayStats})')
    observations.push({ id: 'overlay-clears', before, after, seconds: 10 })
    // A resize (also adaptive pixel-ratio changes on slow software renderers) clears the bitmap by itself and is not counted.
    const clears = after.clears - before.clears
    assert.ok(clears <= 2, `Overlay clears in 10 s of Play: ${clears} (resizes: ${after.resizes - before.resizes})`)
    assert.ok(after.skipped - before.skipped > 100, `Skipped overlay frames: ${after.skipped - before.skipped}`)
    await stop()
  })

  await check('Reduce transparency removes all glass and keeps secondary labels at 76 % opacity', async () => {
    await clickText('.workspace-list>button', 'Manage')
    await until("!!document.querySelector('[data-audit=reduce-transparency]')", 20000)
    // The Manage workspace slides in; click only once the switch has stopped moving.
    const rect = "JSON.stringify(document.querySelector('[data-audit=reduce-transparency]').getBoundingClientRect())"
    for (let previous = ''; ;) { const current = await evaluate(rect); if (current === previous) break; previous = current; await wait(250) }
    await click('[data-audit=reduce-transparency]')
    try { await until("document.documentElement.dataset.reduceTransparency==='true'", 5000) } catch {
      // Recorded, not hidden: a second click is reported in the observations.
      observations.push({ id: 'reduce-transparency-second-click', rect: await evaluate(rect) })
      await click('[data-audit=reduce-transparency]')
      await until("document.documentElement.dataset.reduceTransparency==='true'")
    }
    assert.equal(await evaluate("document.documentElement.dataset.glass"), 'off')
    await wait(300)
    assert.equal(await evaluate(glassCount), 0, `Glass with Reduce transparency: ${JSON.stringify(await evaluate(glassNames))}`)
    const label = await evaluate("getComputedStyle(document.documentElement).getPropertyValue('--label-secondary').trim()")
    assert.match(label, /76%/, `Secondary label mix: ${label}`)
    await capture('reduce-transparency')
    await click('[data-audit=reduce-transparency]')
    await until("document.documentElement.dataset.reduceTransparency==='false'")
  })

  await check('Secondary labels keep 4.5:1 contrast on the default System palettes', async () => {
    const result = await evaluate(`(()=>{
      const lum=c=>{const v=c.map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2]}
      const probe=document.createElement('div');document.body.append(probe)
      const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true})
      const color=v=>{probe.style.color='var('+v+')';return getComputedStyle(probe).color}
      const root=document.documentElement,saved={theme:root.dataset.theme,palette:root.dataset.palette},out={}
      for(const theme of ['light','dark']){
        root.dataset.theme=theme;root.dataset.palette='neutral-'+theme
        const bg=color('--surface-1'),fg=color('--text-secondary')
        ctx.clearRect(0,0,1,1);ctx.fillStyle=bg;ctx.fillRect(0,0,1,1);const b=[...ctx.getImageData(0,0,1,1).data].slice(0,3)
        ctx.fillStyle=fg;ctx.fillRect(0,0,1,1);const f=[...ctx.getImageData(0,0,1,1).data].slice(0,3)
        const x=lum(f),y=lum(b);out[theme]=Math.round(((Math.max(x,y)+.05)/(Math.min(x,y)+.05))*100)/100
      }
      root.dataset.theme=saved.theme;root.dataset.palette=saved.palette;probe.remove();return out})()`)
    observations.push({ id: 'secondary-label-contrast', ...result })
    for (const [theme, ratio] of Object.entries(result)) assert.ok(ratio >= 4.5, `${theme} secondary label contrast ${ratio}:1`)
  })
})
