/** Focused branding acceptance through real Edge input and public static files. */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolveMilestoneAuditContext } from './lib/milestoneAuditContext.mjs'
import { withBrowserAudit } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'

const context = resolveMilestoneAuditContext(import.meta.url, { release: '26.36', reportName: 'branding-user' })
const sourceSha256 = createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex')
async function brandingBrowserAudit(task) {
  const started = Date.now(), metadata = context.metadata()
  const report = join(resolve(context.buildRoot, process.env.NOVA_AUDIT_REPORT_DIRECTORY || 'release-audits'), `v${metadata.release}-branding-user.json`)
  try { return await withBrowserAudit({ release: metadata.release, name: 'branding-user', root: context.buildRoot, development: context.development, expectedRelease: context.expectedRelease, width: 1440, height: 900 }, task) }
  finally {
    let actual
    try { actual = JSON.parse(await readFile(report, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
    if (actual) {
      assert.ok(Date.parse(actual.generatedAt) >= started - 1000, 'Branding evidence belongs to this invocation')
      await writeFile(report, JSON.stringify({ ...actual, ...context.metadata(), sourceSha256 }, null, 2) + '\n')
    }
  }
}
const staticRoot = resolve(context.buildRoot, 'dist'), staticRequests = []
const mimeTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.woff2': 'font/woff2' }
// Mount the unchanged production output at both public paths; no rewritten HTML or bundle.
const server = createServer(async (request, response) => {
  let pathname = request.url
  try {
    pathname = new URL(request.url, 'http://local').pathname
    const prefix = pathname.startsWith('/apps/nova/') ? '/apps/nova/' : '/'
    const relative = decodeURIComponent(pathname.slice(prefix.length)) || 'index.html'
    const path = resolve(staticRoot, relative)
    assert.ok(path.startsWith(staticRoot + sep) && !relative.split('/').some(part => part.startsWith('.')))
    const bytes = await readFile(path), type = mimeTypes[extname(path)] ?? 'application/octet-stream'
    staticRequests.push({ path: pathname, status: 200, type, bytes: bytes.length })
    response.writeHead(200, { 'Content-Type': type, 'Content-Length': bytes.length, 'Cache-Control': 'no-store' })
    response.end(bytes)
  } catch {
    staticRequests.push({ path: pathname, status: 404 })
    response.writeHead(404); response.end('Not found')
  }
})
await new Promise(done => server.listen(0, '127.0.0.1', done))
const staticOrigin = 'http://127.0.0.1:' + server.address().port

try {
  await brandingBrowserAudit(async a => {
    const u = worldUserControls17(a), requests = new Map(), brandFailures = []
    const isBrandUrl = url => /\/(?:branding\/nova-(?:dark|light)-256\.png|nova-icon(?:-light)?-(?:32|192|512)\.png|manifest\.webmanifest)(?:\?|$)/.test(url)
    const stopRequest = a.client.on('Network.requestWillBeSent', event => requests.set(event.requestId, event.request.url))
    const stopFailure = a.client.on('Network.loadingFailed', event => { const url = requests.get(event.requestId); if (url && isBrandUrl(url)) brandFailures.push({ url, error: event.errorText, cancelled: event.canceled ?? false }) })
    const stopResponse = a.client.on('Network.responseReceived', event => { if (isBrandUrl(event.response.url) && event.response.status >= 400) brandFailures.push({ url: event.response.url, status: event.response.status }) })
    await a.client.send('Network.enable')
    a.observations.push({ name: 'scope', sourceSha256, text: 'Real visible theme/palette/range/menu actions and DOM/image observations against current production dist. Public root and nested static requests. No private engine/editor state injection. About remains an external project link and is not followed; native executable icon identity and shell installation are separate packaging evidence. Software-rendered Edge is not physical GPU/DPI/native favicon cache certification.' })

    async function captureSettled(label) {
      // Keep the actual entrance animation intact; capture its readable settled state.
      await a.until("(()=>{const root=document.querySelector('.project-manager');return !root||root.getAnimations({subtree:true}).every(animation=>animation.playState!=='running'||animation.effect?.getComputedTiming().iterations===Infinity)})()")
      return a.capture(label)
    }

    async function marks(scope, mode, minimum = 1) {
      const selector = scope + ' .nova-mark img[data-nova-brand]'
      await a.until(`(()=>{const all=[...document.querySelectorAll(${JSON.stringify(selector)})],images=all.filter(e=>e.getBoundingClientRect().width>0);return images.length>=${minimum}&&all.every(e=>e.complete&&e.naturalWidth===256&&e.naturalHeight===256)&&images.every(e=>e.dataset.novaBrand===${JSON.stringify(mode)})})()`)
      const values = await a.evaluate(`(()=>{const images=[...document.querySelectorAll(${JSON.stringify(selector)})].filter(e=>e.getBoundingClientRect().width>0);return images.map(e=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return{src:e.currentSrc,theme:e.dataset.novaBrand,naturalWidth:e.naturalWidth,naturalHeight:e.naturalHeight,width:r.width,height:r.height,left:r.left,top:r.top,right:r.right,bottom:r.bottom,parentLeft:p.left,parentRight:p.right,parentTop:p.top,parentBottom:p.bottom,alt:e.alt,hidden:e.closest('[aria-hidden]')?.getAttribute('aria-hidden'),draggable:e.draggable,siblingVariants:[...e.parentElement.querySelectorAll('img[data-nova-brand]')].map(i=>({theme:i.dataset.novaBrand,complete:i.complete,width:i.naturalWidth,height:i.naturalHeight})),viewportWidth:innerWidth,viewportHeight:innerHeight}})})()`)
      for (const image of values) {
        assert.ok(new URL(image.src).pathname.endsWith(`/branding/nova-${mode}-256.png`), image.src)
        assert.equal(image.alt, ''); assert.equal(image.hidden, 'true'); assert.equal(image.draggable, false)
        assert.deepEqual(image.siblingVariants.map(item => item.theme).sort(), ['dark','light'])
        assert.ok(image.siblingVariants.every(item => item.complete && item.width === 256 && item.height === 256), JSON.stringify(image))
        assert.ok(image.width > 0 && Math.abs(image.width - image.height) < .6, JSON.stringify(image))
        assert.ok(image.left >= -.6 && image.top >= -.6 && image.right <= image.viewportWidth + .6 && image.bottom <= image.viewportHeight + .6, JSON.stringify(image))
        assert.ok(image.left >= image.parentLeft - .6 && image.right <= image.parentRight + .6 && image.top >= image.parentTop - .6 && image.bottom <= image.parentBottom + .6, JSON.stringify(image))
      }
      return values
    }

    async function asset(url, size) {
      const result = await a.evaluate(`(async()=>{const url=${JSON.stringify(url)},response=await fetch(url),bytes=await response.arrayBuffer(),view=new DataView(bytes),image=new Image();image.src=url;await image.decode();return{url:image.currentSrc,status:response.status,type:response.headers.get('content-type'),bytes:bytes.byteLength,signature:Array.from(new Uint8Array(bytes,0,8)),headerWidth:view.getUint32(16),headerHeight:view.getUint32(20),decodedWidth:image.naturalWidth,decodedHeight:image.naturalHeight}})()`)
      assert.equal(result.status, 200); assert.match(result.type ?? '', /^image\/png(?:;|$)/i)
      assert.deepEqual(result.signature, [137,80,78,71,13,10,26,10]); assert.ok(result.bytes > 100)
      for (const key of ['headerWidth','headerHeight','decodedWidth','decodedHeight']) assert.equal(result[key], size, JSON.stringify(result))
      return result
    }

    async function favicon(mode) {
      const value = await a.evaluate("(()=>{const icon=document.querySelector('link#nova-app-icon[rel=icon]');return icon?{href:icon.href,type:icon.type}:null})()")
      assert.ok(value, 'The shared themed PNG favicon link exists'); assert.equal(value.type, 'image/png')
      assert.ok(new URL(value.href).pathname.endsWith(mode === 'light' ? '/nova-icon-light-32.png' : '/nova-icon-32.png'), value.href)
      return asset(value.href, 32)
    }

    async function settings() {
      await u.workspace('Manage'); await a.click('.manage-body>nav button', 1)
      await a.until("!!document.querySelector('[data-audit=color-palette]')")
      await a.click('.settings-search nav button', 0)
    }

    async function switchPalette(id, mode, themeButton = false) {
      // Audit-only observations retain DOM identity; they do not modify application state.
      await a.evaluate(`(()=>{const shell=document.querySelector('.editor-root'),mark=document.querySelector('.top-bar .brand .nova-mark'),rect=mark.getBoundingClientRect(),state={done:false,frames:0,shellMissingFrames:0,shellReplacementFrames:0,markMissingFrames:0,markReplacementFrames:0,loadingFrames:0,maxGeometryShift:0};globalThis.__novaBrandingMonitor=state;const start=performance.now();function tick(){state.frames++;const current=document.querySelector('.editor-root'),wrapper=document.querySelector('.top-bar .brand .nova-mark');if(!current)state.shellMissingFrames++;else if(current!==shell)state.shellReplacementFrames++;if(!wrapper)state.markMissingFrames++;else{if(wrapper!==mark)state.markReplacementFrames++;const r=wrapper.getBoundingClientRect(),image=[...wrapper.querySelectorAll('img')].find(i=>i.getBoundingClientRect().width>0);state.maxGeometryShift=Math.max(state.maxGeometryShift,Math.abs(r.width-rect.width),Math.abs(r.height-rect.height),Math.abs(r.left-rect.left),Math.abs(r.top-rect.top));if(!image||!image.complete||!image.naturalWidth)state.loadingFrames++}if(performance.now()-start<700)requestAnimationFrame(tick);else state.done=true}requestAnimationFrame(tick)})()`)
      if (themeButton) await a.clickText('.theme-switch button', id, true)
      else await a.select('[data-audit=color-palette]', id)
      await a.until(`document.documentElement.dataset.theme===${JSON.stringify(mode)}${themeButton ? '' : `&&document.documentElement.dataset.palette===${JSON.stringify(id)}`}`)
      const images = await marks('.top-bar .brand', mode), icon = await favicon(mode)
      await a.until('globalThis.__novaBrandingMonitor.done')
      const continuity = await a.evaluate('globalThis.__novaBrandingMonitor')
      assert.ok(continuity.frames > 0); assert.equal(continuity.shellMissingFrames, 0); assert.equal(continuity.shellReplacementFrames, 0); assert.equal(continuity.markMissingFrames, 0); assert.equal(continuity.markReplacementFrames, 0); assert.equal(continuity.loadingFrames, 0)
      assert.ok(continuity.maxGeometryShift <= .6, JSON.stringify(continuity))
      a.observations.push({ name: (themeButton ? 'theme-button-' : 'palette-') + id, mode, images, icon, continuity })
    }

    async function launcher() {
      await a.click('.menu-item>button', 0)
      await a.until("!![...document.querySelectorAll('.menu-item .dropdown button')].find(e=>e.textContent.trim()==='Project Manager')")
      // The fixed popup is already visible. scrollIntoView would scroll its menu
      // ancestor at200%, firing that ancestor's existing close-on-scroll handler.
      const point = await a.evaluate("(()=>{const e=[...document.querySelectorAll('.menu-item .dropdown button')].find(e=>e.textContent.trim()==='Project Manager'),r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);return{x,y,available:!e.disabled,inside:x>=0&&y>=0&&x<innerWidth&&y<innerHeight,targetMatches:e===hit||e.contains(hit),hit:hit?.outerHTML.slice(0,250)}})()")
      assert.ok(point.available && point.inside, JSON.stringify(point))
      a.observations.push({ name: 'launcher-menu-real-hit', ...point })
      if (point.targetMatches) {
        const at = { x: point.x, y: point.y }
        await a.client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at, buttons: 0 })
        await a.client.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at, button: 'left', buttons: 1, clickCount: 1 })
        await a.client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at, button: 'left', buttons: 0, clickCount: 1 })
      } else {
        assert.match(point.hit ?? '', /workspace-bar/, 'Only the specifically proved inherited toolbar overlap permits keyboard continuation')
        a.observations.push({ name: 'inherited-menu-pointer-limitation', status: 'not-passed', text: 'The first File-menu item center is covered by the workspace toolbar. Parent/toolbar z-index600 and header-height tokens match the pre26.36 source baseline. Actual pointer failure is retained in development3 cache evidence. This icon-only audit continues with public focus+Enter; it does not certify this pointer menu entry or change navigation source.', ...point })
        await a.evaluate("[...document.querySelectorAll('.menu-item .dropdown button')].find(e=>e.textContent.trim()==='Project Manager').focus({preventScroll:true})")
        await a.press('Enter')
      }
      await a.until("!!document.querySelector('.project-manager,.confirm-dialog')")
      if (await a.evaluate("!!document.querySelector('.confirm-dialog')")) await a.click('.confirm-dialog .ui-button--danger')
      await a.until("!!document.querySelector('.project-manager')&&!document.querySelector('.editor-root')", 30000)
    }

    try {
      await a.check('Default dark launcher shows both loaded, bounded supplied brand images and PNG favicon', async () => {
        assert.equal(await a.evaluate('document.documentElement.dataset.theme'), 'dark')
        a.observations.push({ name: 'launcher-default', images: await marks('.project-manager', 'dark', 2), icon: await favicon('dark') })
        await captureSettled('launcher-dark')
      })
      await a.check('Visible Clear Scene creation reaches the editor with the shared dark brand', async () => {
        await a.click('.new-project'); await a.until("!!document.querySelector('.creation-dialog')")
        await a.fill('.creation-card header input', 'Branding acceptance')
        await a.click('[data-template-id=empty]'); await a.click('.create-button')
        await a.until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')", 30000)
        if (await a.evaluate("!!document.querySelector('.onboarding-scrim')")) { await a.evaluate("document.querySelector('.onboarding-scrim').focus()"); await a.press('Escape'); await a.until("!document.querySelector('.onboarding-scrim')") }
        a.observations.push({ name: 'editor-default', images: await marks('.top-bar .brand', 'dark'), icon: await favicon('dark') })
        await captureSettled('editor-dark')
      })
      await a.check('Actual theme buttons and all five palettes update brand and favicon without remount or geometry shift', async () => {
        await settings()
        await switchPalette('Light', 'light', true); await captureSettled('editor-light')
        await switchPalette('Dark', 'dark', true)
        for (const [id, mode] of [['cloud-blue','light'],['meadow-cream','light'],['blush-berry','light'],['midnight-blue','dark'],['night-garden','dark']]) await switchPalette(id, mode)
        await switchPalette('Light', 'light', true)
      })
      await a.check('At 1024 by 640 and 200 percent scale, editor and launcher brands stay loaded and bounded', async () => {
        await a.viewport(1024, 640)
        await a.click('.settings-page input[type=range][aria-label="Interface scale"]'); await a.press('End'); await a.press('Tab')
        await a.until("document.documentElement.dataset.uiScale==='xlarge'&&Number(document.querySelector('.settings-page input[type=range][aria-label=\"Interface scale\"]').value)===2")
        a.observations.push({ name: 'minimum-editor-200', images: await marks('.top-bar .brand', 'light') }); await captureSettled('editor-light-minimum-200')
        await launcher()
        a.observations.push({ name: 'minimum-launcher-200', images: await marks('.project-manager', 'light', 2), icon: await favicon('light') }); await captureSettled('launcher-light-minimum-200')
      })
      await a.check('A real reload preserves the selected light logo, favicon and 200 percent preference', async () => {
        let navigated = false
        const stop = a.client.on('Page.frameNavigated', event => { if (!event.frame.parentId) navigated = true })
        try { await a.client.send('Page.reload'); await a.until("!!document.querySelector('.project-manager')", 30000); assert.ok(navigated, 'Fresh main-frame reload observed') } finally { stop() }
        assert.equal(await a.evaluate('document.documentElement.dataset.theme'), 'light')
        assert.equal(await a.evaluate('document.documentElement.dataset.uiScale'), 'xlarge')
        a.observations.push({ name: 'saved-launcher-light', images: await marks('.project-manager', 'light', 2), icon: await favicon('light') }); await captureSettled('launcher-light-reloaded')
      })
      await a.check('Unmodified root and nested static deployments resolve branded PNGs, manifest and default dark icons', async () => {
        await a.viewport(1440, 900)
        for (const prefix of ['/', '/apps/nova/']) {
          await a.client.send('Page.navigate', { url: staticOrigin + prefix + 'index.html' }); await a.until("!!document.querySelector('.project-manager')", 30000)
          const images = await marks('.project-manager', 'dark', 2), icon = await favicon('dark')
          for (const image of images) assert.ok(new URL(image.src).pathname.startsWith(prefix + 'branding/'), image.src)
          const metadata = await a.evaluate(`(async()=>{const href=document.querySelector('link[rel=manifest]').href,response=await fetch(href),manifest=await response.json();return{href,status:response.status,type:response.headers.get('content-type'),manifest,touch:document.querySelector('link[rel=apple-touch-icon]').href}})()`)
          assert.equal(metadata.status, 200); assert.match(metadata.type, /^application\/manifest\+json/)
          assert.equal(new URL(metadata.manifest.start_url, metadata.href).pathname, prefix + 'index.html'); assert.equal(new URL(metadata.manifest.scope, metadata.href).pathname, prefix)
          assert.equal(new URL(metadata.touch).pathname, prefix + 'nova-icon-192.png')
          assert.equal(metadata.manifest.icons.length, 2)
          const assets = []
          for (const entry of metadata.manifest.icons) { const size = Number(entry.sizes.split('x')[0]), url = new URL(entry.src, metadata.href).href; assert.ok([192,512].includes(size)); assert.equal(new URL(url).pathname, prefix + `nova-icon-${size}.png`); assert.equal(entry.type, 'image/png'); assets.push(await asset(url, size)) }
          for (const [name,size] of [['branding/nova-dark-256.png',256],['branding/nova-light-256.png',256],['nova-icon-32.png',32],['nova-icon-light-32.png',32]]) assets.push(await asset(staticOrigin + prefix + name, size))
          a.observations.push({ name: 'static-' + (prefix === '/' ? 'root' : 'nested'), images, icon, metadata, assets }); await captureSettled(prefix === '/' ? 'static-root-launcher' : 'static-nested-launcher')
        }
      })
      await a.check('The independent nested manual toggles and persists its supplied brand without replacing the fixed header box', async () => {
        await a.client.send('Page.navigate', { url: staticOrigin + '/apps/nova/manual/index.html' })
        await a.until("!!document.querySelector('.brand .mark img.manual-mark-dark')&&!!document.querySelector('#theme')", 30000)
        const currentLesson = await a.evaluate("(()=>{const section=document.querySelector('#en-v2636-branding'),html=document.documentElement.innerHTML;return{ordinarySection:section?.tagName==='SECTION',heading:section?.querySelector('h2')?.textContent,engineText:section?.querySelector('p')?.textContent,currentMarker:html.includes('NOVA_V2636_BRANDING_en'),obsoleteSupplement:html.includes('NOVA_V2636_BRANDING_START')}})()")
        assert.ok(currentLesson.ordinarySection && currentLesson.currentMarker && !currentLesson.obsoleteSupplement, JSON.stringify(currentLesson))
        assert.match(currentLesson.heading, /^26\.36/); assert.match(currentLesson.engineText, /Engine 26\.36\.0/)
        async function manual(mode) {
          await a.until(`(()=>{const mark=document.querySelector('.brand .mark'),images=mark?[...mark.querySelectorAll('img')]:[],visible=images.filter(e=>e.getBoundingClientRect().width>0);return document.documentElement.dataset.theme===${JSON.stringify(mode)}&&images.length===2&&images.every(e=>e.complete&&e.naturalWidth===256&&e.naturalHeight===256)&&visible.length===1&&visible[0].classList.contains('manual-mark-'+${JSON.stringify(mode)})&&document.querySelector('#nova-manual-favicon')?.href===visible[0].currentSrc})()`)
          const value = await a.evaluate("(()=>{const mark=document.querySelector('.brand .mark'),rect=mark.getBoundingClientRect(),image=[...mark.querySelectorAll('img')].find(e=>e.getBoundingClientRect().width>0),favicon=document.querySelector('#nova-manual-favicon');return{theme:document.documentElement.dataset.theme,src:image.currentSrc,alt:image.alt,hidden:mark.getAttribute('aria-hidden'),width:rect.width,height:rect.height,left:rect.left,top:rect.top,icon: favicon.href,type:favicon.type,stored:localStorage.getItem('nova-manual-theme'),sameWrapper:!globalThis.__novaManualBrandingWrapper||globalThis.__novaManualBrandingWrapper===mark}})()")
          assert.equal(value.width, 34); assert.equal(value.height, 34); assert.equal(value.hidden, 'true'); assert.equal(value.alt, ''); assert.ok(value.sameWrapper)
          assert.equal(value.type, 'image/png'); assert.equal(value.icon, value.src)
          assert.ok(new URL(value.src).pathname.startsWith('/apps/nova/assets/'), value.src)
          assert.ok(new URL(value.src).pathname.includes(`nova-${mode}-256`), value.src)
          return { ...value, decoded: await asset(value.src, 256) }
        }
        const dark = await manual('dark'); await captureSettled('manual-dark')
        await a.evaluate("globalThis.__novaManualBrandingWrapper=document.querySelector('.brand .mark')")
        await a.click('#theme')
        const light = await manual('light'); assert.equal(light.stored, 'light'); assert.equal(light.left, dark.left); assert.equal(light.top, dark.top); await captureSettled('manual-light')
        await a.client.send('Page.reload'); await a.until("document.readyState==='complete'&&!!document.querySelector('#theme')", 30000)
        const reopened = await manual('light'); assert.equal(reopened.stored, 'light'); await captureSettled('manual-light-reloaded')
        a.observations.push({ name: 'independent-manual-theme', currentLesson, dark, light, reopened, scope: 'The manual uses its visible256px source as favicon; the editor uses separate32px favicons. Actual local manual input/reload only; print and native browser shell caching are outside this check.' })
      })
      await a.check('Brand assets incur no failed browser requests or unexpected paths', async () => {
        assert.deepEqual(brandFailures, []); assert.equal(staticRequests.filter(item => item.status !== 200).length, 0, JSON.stringify(staticRequests.filter(item => item.status !== 200)))
        a.observations.push({ name: 'actual-static-requests', requests: staticRequests, brandFailures })
      })
    } finally { stopRequest(); stopFailure(); stopResponse() }
  })
} finally { await new Promise(done => server.close(done)) }
