/** 26.42 P-D: 2D lighting drawn by the WebGL2 renderer, with the Canvas 2D path as an explicit fallback.
 *
 *  - The Platformer template (one point light, shadow casters) is lit on the GPU: globalThis.__novaLighting
 *    reports backend WebGL2, at least one light, and no Canvas 2D lighting pass is drawn on the overlay;
 *  - the lit frame is not uniform (the light brightens part of the view) in both the dark and light editor themes;
 *  - `?lighting=canvas` forces the 26.41 Canvas 2D path and the diagnostics say so;
 *  - screenshots of both paths are kept as evidence for the visual difference review (multiplicative GPU light
 *    versus the Canvas 2D "punched" darkness), which is a documented change rather than a regression.
 *
 * Usage: build first (vite build), then `node scripts/verify-2642-lighting.mjs`.
 * Set NOVA_AUDIT_BROWSER to a Chromium executable on systems without Microsoft Edge. */
import assert from 'node:assert/strict'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'

const release = JSON.parse(await (await import('node:fs/promises')).readFile('package.json', 'utf8')).version.split('.').slice(0, 2).join('.')

await withBrowserAudit({ release, name: 'lighting-2642', width: 1366, height: 768, commandTimeoutMs: 120000 }, async ({ evaluate, until, click, clickText, press, capture, check, client, observations }) => {
  const openPlatformer = async () => {
    await until("!!document.querySelector('.project-manager .new-project')", 30000)
    await click('.project-manager .new-project')
    await until("!!document.querySelector('.creation-dialog .create-button')")
    await clickText('.creation-dialog [data-template-id]', 'Platformer Scene')
    await click('.creation-dialog .create-button')
    await until("!!document.querySelector('.editor-root .top-bar .workspace-list')", 30000)
    await wait(800)
    const skip = await evaluate("[...document.querySelectorAll('button')].findIndex(b=>b.textContent.trim()==='Skip for now')")
    if (skip >= 0) await clickText('button', 'Skip for now', true)
    // Software-rendered CI browsers compile scripts and warm the renderer for several seconds after opening.
    await wait(8000)
  }
  /** Luminance spread of the canvas area in a real composited screenshot (the WebGL surface is not read back). */
  const canvasSpread = async label => {
    const box = await evaluate("(()=>{const r=document.querySelector('.canvas-container').getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height}})()")
    const shot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    const result = await evaluate(`new Promise(resolve=>{const image=new Image();image.onload=()=>{const b=${JSON.stringify(box)},k=image.width/innerWidth;const c=document.createElement('canvas');c.width=Math.max(1,Math.round(b.width*k/4));c.height=Math.max(1,Math.round(b.height*k/4));const x=c.getContext('2d');x.drawImage(image,b.x*k,b.y*k,b.width*k,b.height*k,0,0,c.width,c.height);const d=x.getImageData(0,0,c.width,c.height).data;let min=1,max=0,sum=0,n=0;for(let i=0;i<d.length;i+=16){const l=(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2])/255;min=Math.min(min,l);max=Math.max(max,l);sum+=l;n++}resolve({min,max,mean:sum/n})};image.src='data:image/png;base64,${shot.data}'})`)
    observations.push({ id: label, ...result })
    return result
  }

  await check('The Platformer light is drawn by the WebGL2 renderer', async () => {
    await openPlatformer()
    await until("globalThis.__novaLighting && globalThis.__novaLighting.backend !== 'Off'", 10000)
    const lighting = await evaluate('({...globalThis.__novaLighting})')
    observations.push({ id: 'gpu-lighting', ...lighting })
    assert.equal(lighting.backend, 'WebGL2', `Lighting backend: ${JSON.stringify(lighting)}`)
    assert.ok(lighting.lights >= 1, 'At least one light reached the GPU pass')
    const spread = await canvasSpread('gpu-dark')
    assert.ok(spread.max - spread.min > .12, `The lit view is not uniform: ${JSON.stringify(spread)}`)
    await capture('gpu-dark')
  })

  await check('Light theme keeps the GPU light visible', async () => {
    await evaluate("document.documentElement.dataset.theme='light'")
    await wait(600)
    const spread = await canvasSpread('gpu-light')
    assert.ok(spread.max - spread.min > .12, `The lit view is not uniform in the light theme: ${JSON.stringify(spread)}`)
    await capture('gpu-light')
    await evaluate("document.documentElement.dataset.theme='dark'")
  })

  await check('Play keeps the GPU light and the Runtime frame running', async () => {
    await click('.actionbar .play-button')
    await until("document.querySelector('.editor-root')?.dataset.playMode==='playing'")
    await wait(1500)
    assert.equal(await evaluate('globalThis.__novaLighting.backend'), 'WebGL2')
    await capture('gpu-playing')
    await click('.actionbar .ui-button', 3)
    await until("document.querySelector('.editor-root')?.dataset.playMode==='editing'")
  })

  await check('?lighting=canvas switches to the Canvas 2D path and reports it', async () => {
    await evaluate("setTimeout(()=>{location.search='?lighting=canvas'},50),true")
    await wait(1000)
    // Leaving an edited project asks for confirmation (beforeunload); accept it like a user would.
    await client.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {})
    await wait(2000)
    await openPlatformer()
    await until("globalThis.__novaLighting && globalThis.__novaLighting.backend !== 'Off'", 10000)
    const lighting = await evaluate('({...globalThis.__novaLighting})')
    observations.push({ id: 'canvas-lighting', ...lighting })
    assert.equal(lighting.backend, 'Canvas2D')
    assert.equal(lighting.fallback, 'forced')
    // Evidence only: the Canvas 2D path (blurred shadow fills) can be too slow to screenshot in software-rendered CI.
    try { await capture('canvas-dark') } catch (error) { observations.push({ id: 'canvas-dark-capture', skipped: String(error?.message ?? error) }) }
  })
})
