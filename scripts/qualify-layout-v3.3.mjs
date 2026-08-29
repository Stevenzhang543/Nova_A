import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer as createNetServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const qualificationVersion = process.env.NOVA_LAYOUT_VERSION || '3.3.0'
const qualificationTag = qualificationVersion.split('.').slice(0, 2).join('.')
const [qualificationMajor, qualificationMinor] = qualificationVersion.split('.').map(Number)
const isV41 = qualificationMajor > 4 || (qualificationMajor === 4 && qualificationMinor >= 1)
const evidenceRoot = join(root, 'release-audits')
const screenshotRoot = join(evidenceRoot, 'screenshots', `v${qualificationVersion}`)
const requiredViewports = String(process.env.NOVA_LAYOUT_REQUIRED_VIEWPORTS ?? '').split(',').map(value => {
  const [width, height] = value.split('x').map(Number)
  return Number.isFinite(width) && Number.isFinite(height) ? [width, height] : null
}).filter(Boolean)
const requiredScales = String(process.env.NOVA_LAYOUT_REQUIRED_SCALES ?? '1').split(',').map(Number).filter(value => Number.isFinite(value) && value >= 1 && value <= 2)
const edgeCandidates = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe']
let edgePath = ''
for (const candidate of edgeCandidates) { try { await readFile(candidate); edgePath = candidate; break } catch { /* next installed path */ } }
if (!edgePath) throw new Error(`Microsoft Edge is required for the v${qualificationTag} layout qualification.`)
await mkdir(screenshotRoot, { recursive: true })

const previewPort = await freePort()
const previewServer = await preview({ root, logLevel: 'silent', preview: { host: '127.0.0.1', port: previewPort, strictPort: true } })
const debugPort = await freePort()
const profile = await mkdtemp(join(tmpdir(), `nova-a-edge-v${qualificationTag.replace('.', '')}-layout-`))
const edge = spawn(edgePath, [
  '--headless=new', '--no-first-run', '--disable-default-apps', '--disable-extensions', '--use-angle=swiftshader',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, `http://127.0.0.1:${previewPort}/`
], { stdio: 'ignore', windowsHide: true })

const results = [], requiredMatrix = [], consoleErrors = [], screenshots = [], stableControlsById = new Map()
let client
try {
  const target = await waitForTarget(debugPort)
  client = await connectCdp(target.webSocketDebuggerUrl)
  client.on('Runtime.exceptionThrown', event => consoleErrors.push(event.exceptionDetails?.exception?.description || event.exceptionDetails?.text || 'Runtime exception'))
  client.on('Log.entryAdded', event => { if (event.entry?.level === 'error') consoleErrors.push(event.entry.text) })
  await client.send('Runtime.enable'); await client.send('Log.enable'); await client.send('Page.enable')
  const browser = await client.send('Browser.getVersion')
  await waitForExpression(client, "document.readyState === 'complete' && Boolean(document.querySelector('.project-manager,.editor-root'))", 20_000)

  for (const locale of ['en', 'de', 'zh']) {
    await evaluate(client, `(() => { let value={}; try { value=JSON.parse(localStorage.getItem('nova_a.preferences.v1')||'{}') } catch {} value.locale='${locale}'; value.reduceMotion=true; value.uiScale=1; localStorage.setItem('nova_a.preferences.v1',JSON.stringify(value)); localStorage.setItem('nova_a.creator-learning.v6',JSON.stringify({version:1,completed:[],onboardingComplete:true})); location.reload(); return true })()`)
    await waitForExpression(client, "document.readyState === 'complete' && Boolean(document.querySelector('.project-manager,.editor-root'))", 20_000)
    if (await evaluate(client, "Boolean(document.querySelector('.project-manager'))")) {
      if (isV41 && locale === 'en') await captureSurface(client, screenshotRoot, screenshots, 'launcher-en-1920x1080.png', locale, 1920, 1080)
      await evaluate(client, "document.querySelector('.create-button')?.click(); true")
      await waitForExpression(client, "Boolean(document.querySelector('.editor-root'))", 25_000)
    }

    if (process.env.NOVA_LAYOUT_SMOKE === '1') {
      await clickIndex(client, '.workspace-list button', 5)
      await setViewport(client, 2560, 1440)
      await recordLayout(client, results, `${locale} Manage 2560x1440 smoke`)
      for (const [width, height] of [[1920, 1080], [1024, 768], [1280, 800], [1600, 900], [1920, 1080], [1024, 768]]) {
        await setViewport(client, width, height)
        await clickIndex(client, '.workspace-list button', 0)
        await recordLayout(client, results, `${locale} Design ${width}x${height} smoke`)
      }
      break
    }

    if (requiredViewports.length) {
      for (const scale of requiredScales) {
        await reloadEditorAtViewport(client, requiredViewports[0][0], requiredViewports[0][1])
        await clickIndex(client, '.workspace-list button', 5)
        await clickIndex(client, '.manage-body>nav button', 1)
        await evaluate(client, `(() => { const scale=${scale}; document.documentElement.style.setProperty('--ui-scale', String(scale)); document.documentElement.dataset.uiScale=scale>1.75?'xlarge':scale>1.25?'large':'standard'; return true })()`)
        for (const [width, height] of requiredViewports) {
          await setViewport(client, width, height)
          await recordLayout(client, requiredMatrix, `${locale} Settings ${width}x${height} ${Math.round(scale * 100)}%`)
        }
      }
      await evaluate(client, "(() => { document.documentElement.style.setProperty('--ui-scale','1'); document.documentElement.dataset.uiScale='standard'; return true })()")
    }

    if (isV41) {
      const workspaceCount = await evaluate(client, "document.querySelectorAll('.workspace-list button').length")
      if (!requiredViewports.length) {
        for (const scale of [1, 1.25, 1.5, 1.75, 2]) {
          for (const [width, height] of [[1366,768],[1920,1080],[2560,1440],[3840,2160]]) {
            await setViewport(client,width,height,scale)
            for (let index=0;index<workspaceCount;index++) { await clickIndex(client,'.workspace-list button',index); await recordLayout(client,results,`${locale} SHELL workspace ${index+1}/${workspaceCount} ${width}x${height} ${Math.round(scale*100)}%`) }
          }
        }
      }
      await setViewport(client,1920,1080)
      if (locale === 'en') {
        const names=['design','script','animation','ui','debug','manage']
        for(let index=0;index<workspaceCount;index++){await clickIndex(client,'.workspace-list button',index);await captureSurface(client,screenshotRoot,screenshots,`workspace-${names[index]||index}-en-1920x1080.png`,locale,1920,1080)}
        await clickIndex(client,'.workspace-list button',5)
        const manageCount=await evaluate(client,"document.querySelectorAll('.manage-body>nav button').length")
        const sections=['settings','packages','project-health','rendering','build']
        for(let index=0;index<manageCount;index++){await clickIndex(client,'.manage-body>nav button',index);await recordLayout(client,results,`en Manage ${sections[index]||index}`);await captureSurface(client,screenshotRoot,screenshots,`manage-${sections[index]||index}-en-1920x1080.png`,locale,1920,1080)}
        await evaluate(client,"document.querySelector('.command-trigger')?.click(); true");await waitForExpression(client,"Boolean(document.querySelector('.command-palette'))",5000);await captureSurface(client,screenshotRoot,screenshots,'command-palette-en-1920x1080.png',locale,1920,1080);await evaluate(client,"document.querySelector('.command-palette input')?.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); true")
        await evaluate(client,"document.querySelector('.task-status')?.click(); true");await waitForExpression(client,"Boolean(document.querySelector('.status-center'))",5000);await captureSurface(client,screenshotRoot,screenshots,'task-center-en-1920x1080.png',locale,1920,1080);await evaluate(client,"document.querySelector('.status-center>header button')?.click(); true")
      }
    }

    // Begin breakpoint traversal from a page laid out at the minimum target.
    // This avoids carrying a headless compositor surface from the preceding
    // 1920/2560 screenshot pass into the responsive authoring checks.
    await reloadEditorAtViewport(client, 1024, 768)
    for (const [width, height] of [[1024, 768], [1280, 800], [1600, 900], [1920, 1080]]) {
      await setViewport(client, width, height)
      await clickIndex(client, '.workspace-list button', 0)
      await recordLayout(client, results, `${locale} Design ${width}x${height}`)
      if (width === 1600) {
        const capture = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false })
        const name = `editor-design-${locale}-${width}x${height}.png`
        await writeFile(join(screenshotRoot, name), Buffer.from(capture.data, 'base64'))
        screenshots.push({ name, locale, width, height })
      }
    }

    await setViewport(client, 1600, 900)
    const workspaceCount = await evaluate(client, "document.querySelectorAll('.workspace-list button').length")
    for (let index = 0; index < workspaceCount; index++) {
      await clickIndex(client, '.workspace-list button', index)
      await recordLayout(client, results, `${locale} workspace ${index + 1}/${workspaceCount}`)
    }
    if (isV41 || ['3.5.0', '3.6.0', '3.7.0', '3.8.0', '3.9.0', '4.0.0'].includes(qualificationVersion)) {
      await clickIndex(client, '.workspace-list button', 1)
      for (const [width, height] of [[800, 720], [1024, 768], [1280, 800], [1600, 900], [1920, 1080]]) {
        await setViewport(client, width, height)
        await recordLayout(client, results, `${locale} Script workspace ${width}x${height}`)
        const inspectorTabCount = await evaluate(client, "document.querySelectorAll('.inspector-tabs button').length")
        for (let tab = 0; tab < inspectorTabCount; tab++) {
          await clickIndex(client, '.inspector-tabs button', tab)
          await recordLayout(client, results, `${locale} Script inspector ${tab + 1}/${inspectorTabCount} ${width}x${height}`)
        }
      }
      await setViewport(client, 1600, 900)
      const capture = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false })
      const name = `script-studio-${locale}-1600x900.png`
      await writeFile(join(screenshotRoot, name), Buffer.from(capture.data, 'base64'))
      screenshots.push({ name, locale, width: 1600, height: 900 })
      await clickIndex(client, '.workspace-list button', 4)
      const profilerTabs = await evaluate(client, "document.querySelectorAll('.production-header nav button').length")
      for (let tab = 0; tab < profilerTabs; tab++) {
        await clickIndex(client, '.production-header nav button', tab)
        await recordLayout(client, results, `${locale} Profiler section ${tab + 1}/${profilerTabs}`)
      }
      if (isV41 || ['3.6.0', '3.7.0', '3.8.0', '3.9.0', '4.0.0'].includes(qualificationVersion)) {
        await clickIndex(client, '.workspace-list button', 3)
        const uiTabs = await evaluate(client, "document.querySelectorAll('.presentation-header nav button').length")
        for (let tab = 0; tab < uiTabs; tab++) { await clickIndex(client, '.presentation-header nav button', tab); await recordLayout(client, results, `${locale} UI workspace ${tab + 1}/${uiTabs}`) }
        const uiCapture = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false })
        const uiName = `responsive-ui-${locale}-1600x900.png`; await writeFile(join(screenshotRoot, uiName), Buffer.from(uiCapture.data, 'base64')); screenshots.push({ name: uiName, locale, width: 1600, height: 900 })
      }
    }
    await clickIndex(client, '.workspace-list button', 0)

    const bottomCount = await evaluate(client, "document.querySelectorAll('.panel-tabs .panel-tab').length")
    for (let index = 0; index < bottomCount; index++) {
      await clickIndex(client, '.panel-tabs .panel-tab', index)
      await recordLayout(client, results, `${locale} bottom panel ${index + 1}/${bottomCount}`)
      if ((isV41 || ['3.7.0', '3.8.0', '3.9.0', '4.0.0'].includes(qualificationVersion)) && await evaluate(client, "Boolean(document.querySelector('.rendering-studio'))")) {
        const renderingTabs = await evaluate(client, "document.querySelectorAll('.rendering-studio>.studio-header nav button').length")
        for (let tab = 0; tab < renderingTabs; tab++) { await clickIndex(client, '.rendering-studio>.studio-header nav button', tab); await recordLayout(client, results, `${locale} rendering section ${tab + 1}/${renderingTabs}`) }
        const renderingCapture = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false })
        const renderingName = `rendering-studio-${locale}-1600x900.png`; await writeFile(join(screenshotRoot, renderingName), Buffer.from(renderingCapture.data, 'base64')); screenshots.push({ name: renderingName, locale, width: 1600, height: 900 })
      }
    }

    const sidebarCount = await evaluate(client, "document.querySelectorAll('.sidebar button').length")
    for (let index = 0; index < sidebarCount; index++) {
      await clickIndex(client, '.sidebar button', index)
      await recordLayout(client, results, `${locale} page ${index + 1}/${sidebarCount}`)
      if ((isV41 || ['3.4.0', '3.5.0', '3.6.0', '3.7.0', '3.8.0', '3.9.0', '4.0.0'].includes(qualificationVersion)) && await evaluate(client, "Boolean(document.querySelector('.settings-page'))")) {
        const scopeCount = await evaluate(client, "document.querySelectorAll('.settings-search nav button').length")
        for (let scope = 0; scope < scopeCount; scope++) {
          await clickIndex(client, '.settings-search nav button', scope)
          if (!await evaluate(client, "Boolean(document.querySelector('.physics-workspace'))")) continue
          const physicsTabCount = await evaluate(client, "document.querySelectorAll('.physics-heading nav button').length")
          for (let tab = 0; tab < physicsTabCount; tab++) {
            await clickIndex(client, '.physics-heading nav button', tab)
            await recordLayout(client, results, `${locale} physics settings ${tab + 1}/${physicsTabCount}`)
          }
        }
      }
    }
    await clickIndex(client, '.sidebar button', 0)
  }

  const seriousConsoleErrors = consoleErrors.filter(message => !/favicon|ResizeObserver loop/i.test(message))
  const stableControls = isV41 ? [...stableControlsById.values()] : []
  const controlIds = new Set(stableControls.map(item=>item.testId))
  const controlsPassed = !isV41 || stableControls.length > 0 && controlIds.size === stableControls.length && stableControls.every(item => item.testId && item.surface && item.label && (!item.disabled || item.disabledReason))
  results.push({name:'Stable control inventory',status:controlsPassed?'passed':'failed',detail:{count:stableControls.length,unique:controlIds.size}})
  results.push({ name: 'Browser console and fatal surface', status: seriousConsoleErrors.length === 0 && !await evaluate(client, "Boolean(document.querySelector('.error-recovery,[data-fatal=true]'))") ? 'passed' : 'failed', detail: JSON.stringify(seriousConsoleErrors) })
  const report = { format: `nova-v${qualificationVersion}-layout-qualification`, version: 1, engineVersion: qualificationVersion, generatedAt: new Date().toISOString(), browser: browser.product, languages: ['en','de','zh'], matrix:requiredMatrix.length?requiredMatrix:isV41?{viewports:['1366x768','1920x1080','2560x1440','3840x2160'],scales:[100,125,150,175,200],catalogs:['SHELL','LCH','HLT','BLD']}:undefined,stableControls,screenshots,results,consoleErrors: seriousConsoleErrors }
  report.status = results.every(result => result.status === 'passed') ? 'passed' : 'failed'
  if (requiredMatrix.length && !requiredMatrix.every(result => result.status === 'passed')) report.status = 'failed'
  report.severity0Open = 0
  report.severity1Open = report.status === 'passed' ? 0 : 1
  await writeFile(join(evidenceRoot, `v${qualificationVersion}-layout-browser.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  if (report.status !== 'passed') throw new Error(`Layout qualification failed: ${results.filter(result => result.status !== 'passed').map(result => result.name).join(', ')}`)
  console.log(`Nova_A v${qualificationVersion} layout qualification passed: ${results.length - 1} panel/viewport states in three languages; ${screenshots.length} captures.`)
} finally {
  try { await client?.send('Browser.close') } catch { /* process cleanup below */ }
  await new Promise(resolve => setTimeout(resolve, 300))
  if (!edge.killed) edge.kill()
  await new Promise(resolve => previewServer.httpServer.close(resolve))
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 })
}

async function recordLayout(cdp, collection, name) {
  // Qualification observes the settled surface, not an intentional panel
  // transition half-way through its compositor animation.
  await new Promise(resolve => setTimeout(resolve, Number(process.env.NOVA_LAYOUT_SETTLE_MS || 320)))
  const detail = await evaluate(cdp, `(() => {
    const visible = node => { const style=getComputedStyle(node),rect=node.getBoundingClientRect(); return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0 }
    const description = node => node.className && typeof node.className==='string' ? '.'+node.className.trim().replace(/\\s+/g,'.') : node.tagName.toLowerCase()
    const selectTextWidth = node => { const text=(node.selectedOptions?.[0]?.textContent||'').trim(); if(!text)return 0; const style=getComputedStyle(node),canvas=document.createElement('canvas'),context=canvas.getContext('2d'); if(!context)return 0; context.font=style.font; return context.measureText(text).width+parseFloat(style.paddingLeft||'0')+parseFloat(style.paddingRight||'0')+28 }
    const overflow = [...document.querySelectorAll('button,summary,label,input,select,.camera-overlay,.segmented')].filter(visible).filter(node => { const style=getComputedStyle(node),horizontal=node.tagName==='SELECT'?selectTextWidth(node)>node.clientWidth+1:(node.scrollWidth>node.clientWidth+1)&&style.overflowX==='visible',vertical=['BUTTON','SUMMARY'].includes(node.tagName)||node.matches('.camera-overlay,.segmented')?(node.scrollHeight>node.clientHeight+1)&&style.overflowY==='visible':false; return horizontal||vertical }).slice(0,40).map(node => ({ node:description(node), text:(node.textContent||'').trim().slice(0,90), client:[node.clientWidth,node.clientHeight], scroll:[node.scrollWidth,node.scrollHeight] }))
    const overlap = []
    for (const selector of ['.toolbar-content','.workspace-list','.panel-controls','.panel-tabs','.asset-actions-row','.asset-diagnostics','.studio-toolbar','.toolbar-actions','.inspector-tabs','.production-header','.transport','.tilemap-toolbar','.world-tools>header','.menu-container']) {
      const parent=document.querySelector(selector); if(!parent||!visible(parent)) continue
      const children=[...parent.children].filter(visible).map(node=>({node,rect:node.getBoundingClientRect()}))
      for(let i=0;i<children.length;i++) for(let j=i+1;j<children.length;j++){const a=children[i].rect,b=children[j].rect,dx=Math.min(a.right,b.right)-Math.max(a.left,b.left),dy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(dx>1&&dy>1) overlap.push({group:selector,a:description(children[i].node),b:description(children[j].node),area:Math.round(dx*dy)})}
    }
    const toolbar=document.querySelector('.toolbar'),content=document.querySelector('.toolbar-content'); const toolbarState=toolbar&&content?{clientWidth:toolbar.clientWidth,scrollWidth:toolbar.scrollWidth,contentWidth:content.getBoundingClientRect().width,childOverflows:overflow.filter(item=>/^\\.(create-object|segmented|snap|tool-menu|camera-overlay)/.test(item.node)).length}:null
    const required=['.editor-root','.top-bar','.workspace-control-row','.editor-main','.status-bar'].map(selector=>{const node=document.querySelector(selector);if(!node)return{selector,visible:false};const rect=node.getBoundingClientRect();return{selector,visible:visible(node),left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom}})
    const verticalText=[...document.querySelectorAll('button,label,summary')].filter(visible).filter(node=>getComputedStyle(node).writingMode!=='horizontal-tb').slice(0,40).map(node=>({node:description(node),text:(node.textContent||'').trim().slice(0,90),writingMode:getComputedStyle(node).writingMode}))
    const contained=document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1&&required.every(item=>item.visible&&item.left>=-1&&item.right<=innerWidth+1&&item.top>=-1&&item.bottom<=innerHeight+1)
    const controls=[...document.querySelectorAll('[data-testid]')].filter(visible).map(node=>({testId:node.getAttribute('data-testid'),surface:node.getAttribute('data-surface')||'',label:node.getAttribute('aria-label')||node.getAttribute('title')||(node.textContent||'').trim().slice(0,120),disabled:node.matches(':disabled'),disabledReason:node.getAttribute('data-disabled-reason')||''}))
    return {viewport:[innerWidth,innerHeight],document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],required,contained,overflow,overlap:overlap.slice(0,40),verticalText,toolbarState,controls}
  })()`)
  for (const control of detail.controls ?? []) if (control.testId) stableControlsById.set(control.testId, control)
  const passed = detail.contained && detail.overflow.length === 0 && detail.overlap.length === 0 && detail.verticalText.length === 0 && (!detail.toolbarState || detail.toolbarState.childOverflows === 0)
  collection.push({ name, status: passed ? 'passed' : 'failed', detail })
}
async function setViewport(cdp, width, height, deviceScaleFactor = 1) {
  // Replace the active override directly. Clearing first briefly restores the
  // host's physical surface and can leave viewport-unit layout cached at that
  // unrelated size in headless Chromium.
  try {
    const { windowId } = await cdp.send('Browser.getWindowForTarget')
    await cdp.send('Browser.setWindowBounds', { windowId, bounds: { width, height, windowState: 'normal' } })
  } catch { /* Some Chromium builds expose only device emulation in headless mode. */ }
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, screenWidth: width, screenHeight: height, deviceScaleFactor, mobile: false })
  // Headless Chromium can update `innerWidth` before its visible surface and
  // viewport-unit layout are invalidated. Keep those two authorities aligned
  // so the matrix never records stale 1920x1080 geometry at a narrow size.
  await cdp.send('Emulation.setVisibleSize', { width, height })
  await evaluate(cdp, `(() => { window.dispatchEvent(new Event('resize')); void document.documentElement.offsetWidth; return true })()`)
  const deadline = Date.now() + 2_500
  while (Date.now() < deadline) {
    const viewport = await evaluate(cdp, `({ width: innerWidth, height: innerHeight, scale: devicePixelRatio })`)
    if (viewport.width === width && viewport.height === height && Math.abs(viewport.scale - deviceScaleFactor) < 0.01) {
      // Chromium updates viewport metrics before repainting vw-sized app roots.
      // Leave one bounded repaint window before recording shell containment.
      await new Promise(resolve => setTimeout(resolve, 480))
      return
    }
    await new Promise(resolve => setTimeout(resolve, 80))
  }
  throw new Error(`Viewport did not settle at ${width}x${height} @ ${Math.round(deviceScaleFactor * 100)}%`)
}
async function captureSurface(cdp, directory, collection, name, locale, width, height) { await setViewport(cdp,width,height); const capture=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false}); await writeFile(join(directory,name),Buffer.from(capture.data,'base64')); collection.push({name,locale,width,height}) }
async function clickIndex(cdp, selector, index) { await evaluate(cdp, `(() => { const node=document.querySelectorAll(${JSON.stringify(selector)})[${index}]; if(!node)return false; node.click(); return true })()`); await new Promise(resolve => setTimeout(resolve, 120)) }
async function reloadEditorAtViewport(cdp, width, height) { await setViewport(cdp,width,height); await evaluate(cdp,'location.reload(); true'); await waitForExpression(cdp,"document.readyState === 'complete' && Boolean(document.querySelector('.project-manager,.editor-root'))",20_000); if(await evaluate(cdp,"Boolean(document.querySelector('.project-manager'))")){await evaluate(cdp,"document.querySelector('.create-button')?.click(); true");await waitForExpression(cdp,"Boolean(document.querySelector('.editor-root'))",25_000)} }
async function freePort() { const server=createNetServer(); await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)}); const address=server.address(),port=typeof address==='object'&&address?address.port:0; await new Promise(resolve=>server.close(resolve)); return port }
async function waitForTarget(port) { const deadline=Date.now()+15_000; while(Date.now()<deadline){try{const targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(response=>response.json()),target=targets.find(item=>item.type==='page');if(target)return target}catch{}await new Promise(resolve=>setTimeout(resolve,100))}throw new Error('Timed out connecting to Edge DevTools.') }
async function connectCdp(url) { const socket=new WebSocket(url),pending=new Map(),listeners=new Map();let nextId=1;await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});socket.addEventListener('message',message=>{const value=JSON.parse(message.data);if(value.id){const item=pending.get(value.id);if(!item)return;pending.delete(value.id);if(value.error)item.reject(new Error(value.error.message));else item.resolve(value.result)}else for(const listener of listeners.get(value.method)||[])listener(value.params||{})});return{send(method,params={}){return new Promise((resolve,reject)=>{const id=nextId++;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})},on(method,listener){listeners.set(method,[...(listeners.get(method)||[]),listener])}} }
async function evaluate(cdp, expression) { const result=await cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result.value }
async function waitForExpression(cdp, expression, timeout) { const deadline=Date.now()+timeout;while(Date.now()<deadline){try{if(await evaluate(cdp,expression))return true}catch{}await new Promise(resolve=>setTimeout(resolve,100))}throw new Error(`Timed out waiting for ${expression}`) }
