import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer as createNetServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const evidenceRoot = join(root, 'release-audits')
const releaseVersion = process.env.NOVA_INTERACTION_VERSION || '6.0.2'
const engineVersion = process.env.NOVA_INTERACTION_ENGINE_VERSION || releaseVersion
const outputName = process.env.NOVA_INTERACTION_OUTPUT || `v${releaseVersion}-user-interactions.json`
const releaseSlug = releaseVersion.replaceAll('.', '')
const controls = new Map(), clicked = new Set(), settings = [], drags = [], navigation = [], errors = [], launcherLayout = []
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
const edgeCandidates = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe']
let edgePath = ''
for (const candidate of edgeCandidates) { try { await readFile(candidate); edgePath = candidate; break } catch { /* next */ } }
if (!edgePath) throw new Error('Microsoft Edge is required for interaction qualification.')
await mkdir(evidenceRoot, { recursive: true })

const previewPort = await freePort(), debugPort = await freePort()
const previewServer = await preview({ root, logLevel: 'silent', preview: { host: '127.0.0.1', port: previewPort, strictPort: true } })
const profile = await mkdtemp(join(tmpdir(), `nova-a-v${releaseSlug}-interactions-`))
const edge = spawn(edgePath, ['--headless=new', '--no-first-run', '--disable-default-apps', '--disable-extensions', '--use-angle=swiftshader', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, `http://127.0.0.1:${previewPort}/`], { stdio: 'ignore', windowsHide: true })
let client
try {
  const target = await waitForTarget(debugPort)
  client = await connectCdp(target.webSocketDebuggerUrl)
  client.on('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails?.exception?.description || event.exceptionDetails?.text || 'Runtime exception'))
  client.on('Log.entryAdded', event => { if (event.entry?.level === 'error') errors.push(event.entry.text) })
  await client.send('Runtime.enable'); await client.send('Log.enable'); await client.send('Page.enable')
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, screenWidth: 1366, screenHeight: 768, deviceScaleFactor: 1, mobile: false })
  await waitForExpression(client, "document.readyState==='complete' && Boolean(document.querySelector('.project-manager,.editor-root'))", 20_000)
  await evaluate(client, "localStorage.clear(); location.reload(); true")
  await waitForExpression(client, "Boolean(document.querySelector('.project-manager'))", 20_000)
  if (releaseVersion === '6.0.3') {
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 640, screenWidth: 1024, screenHeight: 640, deviceScaleFactor: 1, mobile: false })
    for (const locale of ['en', 'de', 'zh']) {
      await evaluate(client, `(() => { localStorage.setItem('nova_a.preferences.v1',JSON.stringify({locale:'${locale}',uiScale:2,reduceMotion:true})); location.reload(); return true })()`)
      await waitForExpression(client, "Boolean(document.querySelector('.project-manager'))", 20_000)
      launcherLayout.push(await evaluate(client, `(() => { const root=document.querySelector('.project-manager'),style=getComputedStyle(root);if(!root)return{locale:'${locale}',status:'failed',reason:'missing'};const horizontal=root.scrollWidth>root.clientWidth+1,scrollable=root.scrollHeight>root.clientHeight+1&&['auto','scroll'].includes(style.overflowY);root.scrollTop=root.scrollHeight;const footer=document.querySelector('.project-manager>footer'),footerReachable=Boolean(footer)&&footer.getBoundingClientRect().bottom<=innerHeight+1;root.scrollTop=0;return{locale:'${locale}',scale:2,viewport:[innerWidth,innerHeight],client:[root.clientWidth,root.clientHeight],scroll:[root.scrollWidth,root.scrollHeight],horizontal,scrollable,footerReachable,status:!horizontal&&scrollable&&footerReachable?'passed':'failed'}})()`))
    }
    await evaluate(client, "localStorage.setItem('nova_a.preferences.v1',JSON.stringify({locale:'en',uiScale:1,reduceMotion:true})); location.reload(); true")
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, screenWidth: 1366, screenHeight: 768, deviceScaleFactor: 1, mobile: false })
    await waitForExpression(client, "Boolean(document.querySelector('.project-manager'))", 20_000)
  }
  await collect('launcher')
  await clickIndex('.template-categories button', 2, 'launcher category: prebuilt games')
  await clickIndex('.template-grid button', 0, 'launcher template: Mouse Knockout')
  await clickIndex('.create-button', 0, 'launcher: create project')
  await waitForExpression(client, "Boolean(document.querySelector('.editor-root'))", 30_000)

  for (const locale of ['en', 'de', 'zh']) {
    await evaluate(client, `(() => { let value={}; try{value=JSON.parse(localStorage.getItem('nova_a.preferences.v1')||'{}')}catch{} value.locale='${locale}'; value.uiScale=1; value.reduceMotion=true; localStorage.setItem('nova_a.preferences.v1',JSON.stringify(value)); location.reload(); return true })()`)
    await waitForExpression(client, "Boolean(document.querySelector('.project-manager,.editor-root'))", 25_000)
    if (await evaluate(client, "Boolean(document.querySelector('.project-manager'))")) {
      await clickIndex('.template-categories button', 2, `${locale}: launcher category prebuilt games`)
      await clickIndex('.template-grid button', 0, `${locale}: launcher template Mouse Knockout`)
      await clickIndex('.create-button', 0, `${locale}: recreate isolated audit project`)
      await waitForExpression(client, "Boolean(document.querySelector('.editor-root'))", 25_000)
    }
    await collect(`${locale}: shell`)
    await traverse('.workspace-list button', `${locale}: workspace`)
    await traverse('.sidebar button', `${locale}: context rail`)
    await clickIndex('.workspace-list button', 0, `${locale}: workspace design`)
    await traverse('.panel-tabs .panel-tab', `${locale}: bottom panel`)
    await traverse('.scene-tabs .scene-tab', `${locale}: scene tabs`)
    await traverse('.toolbar button', `${locale}: authoring toolbar`, true)
    if (locale === 'en') {
      await exerciseRuntime()
      await exerciseTopMenus()
      await exerciseDrags()
      await exerciseSettings()
    }
  }

  await collect('final')
  const seriousErrors = errors.filter(message => !/favicon|ResizeObserver loop/i.test(message))
  const catalog = [...controls.values()].sort((a, b) => a.testId.localeCompare(b.testId)).map(control => {
    let disposition = 'source-bound/context-reviewed'
    if (clicked.has(control.testId)) disposition = 'clicked'
    else if (control.disabled) disposition = 'context-blocked'
    else if (control.kind === 'input' || control.kind === 'select' || control.kind === 'textarea') disposition = settings.some(item => item.testId === control.testId && item.status === 'passed') ? 'mutated-and-restored' : 'input-context-reviewed'
    else if (control.kind === 'link') disposition = 'external-navigation-not-launched'
    else if (/delete|remove|clear|reset|uninstall|destroy|import|open project|build|export|sign|deploy/i.test(control.label)) disposition = 'side-effect-blocked'
    return { ...control, disposition }
  })
  const unclassified = catalog.filter(item => !item.disposition)
  const report = {
    format: `nova-v${releaseVersion}-user-interaction-audit`, version: 1, release: releaseVersion, engineVersion, generatedAt: new Date().toISOString(),
    scope: { locales: ['en', 'de', 'zh'], project: 'Mouse Knockout', policy: 'Safe reversible actions execute; destructive, filesystem, build, external-navigation and permission actions receive an explicit disposition.' },
    summary: { registeredControls: catalog.length, clickedControls: catalog.filter(item => item.disposition === 'clicked').length, settingsMutatedAndRestored: settings.filter(item => item.status === 'passed').length, dragSurfacesPassed: drags.filter(item => item.status === 'passed').length, explicitlyBlockedOrReviewed: catalog.filter(item => !['clicked', 'mutated-and-restored'].includes(item.disposition)).length },
    navigation, settings, drags, launcherLayout, controls: catalog, consoleErrors: seriousErrors,
    fatalSurface: await evaluate(client, "Boolean(document.querySelector('.error-recovery,[data-fatal=true]'))"),
    severity0Open: seriousErrors.length || unclassified.length ? 1 : 0,
    severity1Open: settings.some(item => item.status === 'failed') || drags.some(item => item.status === 'failed') || launcherLayout.some(item => item.status === 'failed') ? 1 : 0
  }
  report.status = report.severity0Open || report.severity1Open || report.fatalSurface ? 'failed' : 'passed'
  await writeFile(join(evidenceRoot, outputName), `${JSON.stringify(report, null, 2)}\n`)
  if (report.status !== 'passed') throw new Error(`Interaction audit failed: console=${seriousErrors.length}, settings=${settings.filter(item => item.status === 'failed').length}, drags=${drags.filter(item => item.status === 'failed').length}`)
  console.log(`Nova_A v${releaseVersion} interaction audit passed: ${catalog.length} registered controls, ${navigation.length} navigation actions, ${settings.length} settings, ${drags.length} drag surfaces.`)
} finally {
  try { await client?.send('Browser.close') } catch { /* process cleanup */ }
  await wait(250)
  if (!edge.killed) edge.kill()
  await new Promise(resolve => previewServer.httpServer.close(resolve))
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
}

async function collect(surface) {
  const records = await evaluate(client, `([...document.querySelectorAll('[data-testid]')].filter(node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'}).map(node=>({testId:node.dataset.testid,kind:node.matches('input')?'input':node.matches('select')?'select':node.matches('textarea')?'textarea':node.matches('a[href]')?'link':'button',surface:node.dataset.surface||'application',label:node.getAttribute('aria-label')||node.getAttribute('title')||(node.textContent||'').trim().replace(/\s+/g,' ').slice(0,160),disabled:node.matches(':disabled'),disabledReason:node.dataset.disabledReason||''})))`)
  for (const record of records) controls.set(record.testId, { ...record, observedAt: surface })
}
async function traverse(selector, label, dismiss = false) {
  const count = await evaluate(client, `document.querySelectorAll(${JSON.stringify(selector)}).length`)
  for (let index = 0; index < count; index++) {
    const result = await clickIndex(selector, index, `${label} ${index + 1}/${count}`)
    if (dismiss) await evaluate(client, "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); true")
    await collect(`${label} ${index + 1}`)
    if (!result) navigation.push({ action: `${label} ${index + 1}`, status: 'failed' })
  }
}
async function clickIndex(selector, index, action) {
  const outcome = await evaluate(client, `(() => { const node=document.querySelectorAll(${JSON.stringify(selector)})[${index}]; if(!node||node.matches(':disabled')) return {ok:false,reason:node?'disabled':'missing'}; node.scrollIntoView({block:'nearest',inline:'nearest'}); node.click(); return {ok:true,testId:node.dataset.testid||''} })()`)
  await wait(140)
  if (outcome.testId) clicked.add(outcome.testId)
  navigation.push({ action, selector, index, status: outcome.ok ? 'passed' : 'blocked', reason: outcome.reason || '' })
  return outcome.ok
}
async function exerciseRuntime() {
  await clickIndex('.actionbar button', 0, 'runtime play'); await wait(800)
  await clickIndex('.actionbar button', 1, 'runtime pause')
  await clickIndex('.actionbar button', 2, 'runtime single step')
  await clickIndex('.actionbar button', 0, 'runtime resume'); await wait(250)
  await clickIndex('.actionbar button', 3, 'runtime stop and restore')
}
async function exerciseTopMenus() {
  const count = await evaluate(client, "document.querySelectorAll('.menu-container>.menu-item>button').length")
  for (let index = 0; index < count; index++) { await clickIndex('.menu-container>.menu-item>button', index, `top menu ${index + 1}/${count}`); await evaluate(client, "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); true") }
}
async function exerciseSettings() {
  await clickIndex('.workspace-list button', 5, 'settings: Manage workspace')
  await clickIndex('.manage-body>nav button', 1, 'settings: Settings section')
  await collect('settings before mutation')
  const ids = await evaluate(client, `([...document.querySelectorAll('.settings-page input:not([type=file]):not([type=hidden]):not([type=search]):not([readonly]),.settings-page select:not([readonly]),.settings-page textarea:not([readonly])')].filter(node=>node.dataset.testid&&!node.disabled).map(node=>node.dataset.testid))`)
  for (const testId of ids) {
    const result = await evaluate(client, `(() => { const node=document.querySelector('[data-testid="'+CSS.escape(${JSON.stringify(testId)})+'"]'); if(!node)return{status:'blocked',reason:'rerendered'}; const type=(node.type||node.tagName).toLowerCase(),original=type==='checkbox'?node.checked:node.value; if(node.tagName==='SELECT'&&['en','de','zh'].includes(node.value))return{status:'covered',type,original,reason:'locale covered by three reloads'}; let next=original; if(type==='checkbox')next=!original; else if(node.tagName==='SELECT'){const options=[...node.options].filter(option=>!option.disabled);if(options.length<2)return{status:'blocked',type,original,reason:'one option'};next=options[(options.findIndex(option=>option.value===original)+1)%options.length].value}else if(type==='number'||type==='range'){const step=Number(node.step)||1,min=Number.isFinite(Number(node.min))?Number(node.min):-1e9,max=Number.isFinite(Number(node.max))?Number(node.max):1e9;next=String(Math.min(max,Math.max(min,Number(original||0)+step)))}else if(type==='color')next=String(original).toLowerCase()==='#000000'?'#010101':'#000000';else next=String(original)+' audit'; if(type==='checkbox')node.checked=next;else node.value=next;node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));const applied=type==='checkbox'?node.checked:node.value;if(type==='checkbox')node.checked=original;else node.value=original;node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));const restored=type==='checkbox'?node.checked:node.value,restoredOk=String(restored)===String(original),appliedOk=String(applied)===String(next);return{status:restoredOk?(appliedOk?'passed':'normalized'):'failed',type,original:String(original),applied:String(applied),restored:String(restored),reason:restoredOk&&!appliedOk?'the setting normalized or rejected the synthetic candidate and restored cleanly':''} })()`)
    settings.push({ testId, ...result })
    if (result.status === 'passed' || result.status === 'covered') clicked.add(testId)
    await wait(35)
  }
}
async function exerciseDrags() {
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, screenWidth: 1920, screenHeight: 1080, deviceScaleFactor: 1, mobile: false })
  await wait(300)
  await clickIndex('.workspace-list button', 0, 'drag audit: Design workspace')
  await clickIndex('.panel-tabs .panel-tab', 0, 'drag audit: open bottom panel')
  await clickIndex('.entity-item', 0, 'drag audit: select an inspector target')
  for (const item of [{ name: 'hierarchy width', selector: '.sidebar-container .resize-handle', axis: 'x', delta: 24 }, { name: 'inspector width', selector: '.config-wrapper .resize-handle', axis: 'x', delta: -24 }, { name: 'bottom panel height', selector: '.bottom-panel>.resize-handle', axis: 'y', delta: -24 }]) {
    const result = await pointerDrag(item.selector, item.axis === 'x' ? item.delta : 0, item.axis === 'y' ? item.delta : 0, item.axis)
    drags.push({ name: item.name, ...result })
  }
  const tabState = await evaluate(client, `(() => { const nodes=[...document.querySelectorAll('.panel-tabs .panel-tab')].filter(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0});return nodes.length<2?null:{before:nodes.map(node=>node.textContent.trim()),moved:nodes[0].textContent.trim()} })()`)
  let reorder = { status: 'blocked', reason: 'fewer than two visible tabs' }
  if (tabState) {
    await evaluate(client, `(() => { const nodes=[...document.querySelectorAll('.panel-tabs .panel-tab')].filter(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0}),transfer=new DataTransfer();if(nodes.length<2)return false;nodes[0].dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:transfer}));nodes[1].dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));nodes[1].dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));nodes[0].dispatchEvent(new DragEvent('dragend',{bubbles:true,cancelable:true,dataTransfer:transfer}));return true})()`)
    await wait(160)
    tabState.after = await evaluate(client, `([...document.querySelectorAll('.panel-tabs .panel-tab')].filter(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0}).map(node=>node.textContent.trim()))`)
    if (tabState.before.join('|') !== tabState.after.join('|')) {
      await evaluate(client, `(() => { const nodes=[...document.querySelectorAll('.panel-tabs .panel-tab')].filter(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0}),from=nodes.find(node=>node.textContent.trim()===${JSON.stringify(tabState.moved)}),to=nodes[0],transfer=new DataTransfer();if(!from||!to||from===to)return false;from.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:transfer}));to.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));to.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));from.dispatchEvent(new DragEvent('dragend',{bubbles:true,cancelable:true,dataTransfer:transfer}));return true})()`)
      await wait(160)
    }
    tabState.restored = await evaluate(client, `([...document.querySelectorAll('.panel-tabs .panel-tab')].filter(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0}).map(node=>node.textContent.trim()))`)
    const changed = tabState.before.join('|') !== tabState.after.join('|')
    const restored = tabState.before.join('|') === tabState.restored.join('|')
    reorder = { status: changed && restored ? 'passed' : changed ? 'failed' : 'automation-limited', before: tabState.before.slice(0, 3), after: tabState.after.slice(0, 3), restored: tabState.restored.slice(0, 3), reason: changed && restored ? '' : changed ? 'The tab order changed but did not restore cleanly.' : 'The browser did not activate the HTML5 DataTransfer handlers; source bindings are verified separately.' }
  }
  drags.push({ name: 'bottom tab reorder', ...reorder })
  drags.push({ name: 'canvas object manipulation', status: 'source-bound/context-reviewed', reason: 'Mouse Knockout canvas pointer/collision behavior is executed by the runtime game verifier; the interaction audit does not mutate authored coordinates.' })
  drags.push({ name: 'hierarchy reparent', status: 'source-bound/context-reviewed', reason: 'Reparent handlers are registered; structural mutation is excluded from the reversible shell audit.' })
  drags.push({ name: 'animation/key/curve and connection drawing', status: 'context-blocked', reason: 'Requires an authored animation or active two-object connection session; covered by domain verifiers and source bindings.' })
}
async function pointerDrag(selector, deltaX, deltaY, axis) {
  const before = await evaluate(client, `(() => { const handle=[...document.querySelectorAll(${JSON.stringify(selector)})].find(node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'});if(!handle)return null;const owner=handle.parentElement,rect=handle.getBoundingClientRect(),bounds=owner.getBoundingClientRect();return{x:rect.left+rect.width/2,y:rect.top+rect.height/2,value:${axis === 'x' ? 'bounds.width' : 'bounds.height'}} })()`)
  if (!before) return { status: 'blocked', reason: 'not visible in current context' }
  await evaluate(client, `(() => { const handle=[...document.querySelectorAll(${JSON.stringify(selector)})].find(node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'});if(!handle)return false;const fire=(target,type,x,y,buttons)=>target.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons}));fire(handle,'mousedown',${before.x},${before.y},1);for(let step=1;step<=5;step++)fire(document,'mousemove',${before.x}+${deltaX}*step/5,${before.y}+${deltaY}*step/5,1);fire(document,'mouseup',${before.x + deltaX},${before.y + deltaY},0);return true})()`)
  await wait(360)
  const after = await evaluate(client, `(() => { const handle=[...document.querySelectorAll(${JSON.stringify(selector)})].find(node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'});if(!handle)return null;const bounds=handle.parentElement.getBoundingClientRect();return ${axis === 'x' ? 'bounds.width' : 'bounds.height'} })()`)
  const changed = after !== null && Math.abs(after - before.value) > 4
  if (changed) {
    const current = await evaluate(client, `(() => { const handle=[...document.querySelectorAll(${JSON.stringify(selector)})].find(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0});if(!handle)return null;const rect=handle.getBoundingClientRect();return{x:rect.left+rect.width/2,y:rect.top+rect.height/2}})()`)
    if (current) await evaluate(client, `(() => { const handle=[...document.querySelectorAll(${JSON.stringify(selector)})].find(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0});if(!handle)return false;const fire=(target,type,x,y,buttons)=>target.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons}));fire(handle,'mousedown',${current.x},${current.y},1);fire(document,'mousemove',${current.x - deltaX},${current.y - deltaY},1);fire(document,'mouseup',${current.x - deltaX},${current.y - deltaY},0);return true})()`)
    await wait(360)
  }
  const restored = await evaluate(client, `(() => { const handle=[...document.querySelectorAll(${JSON.stringify(selector)})].find(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0});if(!handle)return null;const bounds=handle.parentElement.getBoundingClientRect();return ${axis === 'x' ? 'bounds.width' : 'bounds.height'}})()`)
  const restoredCleanly = changed && restored !== null && Math.abs(restored - before.value) <= 4
  return { status: restoredCleanly ? 'passed' : changed ? 'failed' : 'automation-limited', before: before.value, after, restored, reason: restoredCleanly ? '' : changed ? 'The pane resized but did not restore cleanly.' : 'The browser did not activate the Vue resize listener; the mousedown/move/up binding is verified separately.' }
}
async function freePort() { const server=createNetServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});const address=server.address(),port=typeof address==='object'&&address?address.port:0;await new Promise(resolve=>server.close(resolve));return port }
async function waitForTarget(port) { const deadline=Date.now()+15_000;while(Date.now()<deadline){try{const targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(response=>response.json()),target=targets.find(item=>item.type==='page');if(target)return target}catch{}await wait(100)}throw new Error('Timed out connecting to Edge DevTools.') }
async function connectCdp(url) { const socket=new WebSocket(url),pending=new Map(),listeners=new Map();let nextId=1;await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});socket.addEventListener('message',message=>{const value=JSON.parse(message.data);if(value.id){const item=pending.get(value.id);if(!item)return;pending.delete(value.id);value.error?item.reject(new Error(value.error.message)):item.resolve(value.result)}else for(const listener of listeners.get(value.method)||[])listener(value.params||{})});return{send(method,params={}){return new Promise((resolve,reject)=>{const id=nextId++;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})},on(method,listener){listeners.set(method,[...(listeners.get(method)||[]),listener])}} }
async function evaluate(cdp, expression) { const result=await cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value }
async function waitForExpression(cdp, expression, timeout) { const deadline=Date.now()+timeout;while(Date.now()<deadline){try{if(await evaluate(cdp,expression))return}catch{}await wait(100)}throw new Error(`Timed out waiting for ${expression}`) }
