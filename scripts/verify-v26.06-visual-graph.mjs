/** 验证脚本（v26.06-visual-graph）：组织对应功能与边界场景检查，断言行为并汇总验证结果。 */
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer as createNetServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build, createServer as createViteServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const checks = []
const check = /* 调用 checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics }) 并返回调用结果。 */ (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const pause = /** 返回在指定毫秒数后完成的等待任务。 */ milliseconds => new Promise(/* 调用 setTimeout(resolve, milliseconds) 并返回调用结果。 */ resolve => setTimeout(resolve, milliseconds))
const pageReadyTimeout = Math.max(30_000, Number(process.env.NOVA_GRAPH_PAGE_TIMEOUT_MS) || 60_000)
const compiled = await mkdtemp(join(tmpdir(), 'nova-v2606-graph-'))
const profile = await mkdtemp(join(tmpdir(), 'nova-v2606-graph-edge-'))
let vite, edge, client

try {
  await build({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true }, build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: join(root, 'src/visual/graphInteraction.ts'), output: { entryFileNames: 'graph.mjs' } } } })
  const graph = await import(`${pathToFileURL(join(compiled, 'graph.mjs')).href}?v=${Date.now()}`)
  const viewport = { x: 16, y: 28, zoom: 1 }
  const wheel = graph.wheelGraphZoom(viewport, -120, 0, 300, 180)
  const button = graph.stepGraphZoom(viewport, .1, 300, 180)
  const panned = graph.panGraphViewport(viewport, 75, -24)
  const dragged = graph.dragGraphPoint({ x: 30, y: 50 }, 80, -20, 2)
  check('VG-ZOOM-MATH', wheel.zoom > viewport.zoom && button.zoom === 1.1 && wheel.x !== viewport.x && wheel.y !== viewport.y, 'Wheel and button zoom change scale while keeping an explicit focal point.')
  check('VG-PAN-MATH', panned.x === 91 && panned.y === 4 && panned.zoom === 1, 'Background pan changes only viewport translation.', panned)
  check('VG-DRAG-MATH', dragged.x === 70 && dragged.y === 40, 'Node movement converts pointer pixels through current zoom.', dragged)

  const pin = /** 创建执行引脚，根据输入输出方向选择exec或next键。 */ (uuid, direction) => ({ uuid, key: direction === 'output' ? 'next' : 'exec', name: direction, direction, kind: 'execution', valueType: null, required: false, defaultValue: null })
  const node = /** 创建用于布局验证的图节点，配置不同宽度、执行引脚和可选源码。 */ (index, type = index ? 'flow.sequence' : 'event.start', height = 82) => ({ uuid: `node-${index}`, type, title: `Node ${index}`, category: index ? 'Flow' : 'Events', position: { x: 0, y: 0 }, size: { width: index === 2 ? 360 : 224, height }, collapsed: false, pins: [pin(`in-${index}`, 'input'), pin(`out-${index}`, 'output')], config: type === 'code.statement' ? { source: 'let value = 1;' } : {} })
  const nodes = [node(0), node(1), node(2, 'code.statement', 82), node(3), node(4)]
  const edges = [0, 1, 2].map(/** 建立相邻节点之间的执行引脚连接。 */ index => ({ uuid: `edge-${index}`, from: { nodeUuid: nodes[index].uuid, pinUuid: `out-${index}` }, to: { nodeUuid: nodes[index + 1].uuid, pinUuid: `in-${index + 1}` } }))
  const scope = { nodes, edges, comments: [], viewport: { x: 0, y: 0, zoom: 1 } }
  const arranged = graph.arrangeExecutionBlocks(scope), overlap = graph.graphLayoutOverlaps(scope.nodes, 8)
  const inserted = graph.availableGraphPosition(scope.nodes, { ...scope.nodes[0].position }, { width: 224, height: 100 })
  check('VG-TIDY-BOUNDS', arranged.visited === nodes.length && overlap.length === 0, 'Tidy visits every node and produces separated rendered-size bounds.', { ...arranged, overlap })
  check('VG-INSERTION-BOUNDS', inserted.x !== scope.nodes[0].position.x || inserted.y !== scope.nodes[0].position.y, 'New blocks choose a nearby free position instead of covering an existing block.', inserted)

  const editorSource = await readFile(join(root, 'src/components/VisualGraphEditor.vue'), 'utf8')
  const inspectorSource = await readFile(join(root, 'src/components/GraphProductionPanel.vue'), 'utf8')
  const workspaceSource = await readFile(join(root, 'src/components/ScriptWorkspace.vue'), 'utf8')
  check('VG-INLINE-EVENT-ISOLATION', /closest\(['"]button,input,textarea,select['"]\)/.test(editorSource) && /if\s*\(editing\)\s*return/.test(editorSource) && editorSource.includes('@pointerdown.stop="startNodeDrag'), 'Inline fields and header buttons cannot initiate node drag; text-edit Undo remains local.')
  check('VG-CONTROL-ISOLATION', editorSource.includes('class="canvas-controls"') && editorSource.includes('@pointerdown.stop') && editorSource.includes('canvasPointerDownCapture'), 'Zoom controls no longer bubble a competing pan gesture and middle-button panning is captured.')
  check('VG-SYNC-HANDOFF', editorSource.includes('studio.saveActiveGraph=saveGraph') && workspaceSource.includes('studio.activeGraphDirty') && workspaceSource.includes('await studio.saveActiveGraph()') && workspaceSource.includes('ensureLinkedGraphForScript(script.uuid, source)') && workspaceSource.includes('assetState.selectedGuid = synchronized.graphAssetUuid'), 'The selected Rhai asset opens its synchronized graph; returning to code validates, saves, and regenerates that exact linked asset first.')
  check('VG-INSPECTOR-CONTRACT', inspectorSource.includes('container:production-panel/inline-size') && inspectorSource.includes('flex-wrap:wrap') && inspectorSource.includes('@container production-panel (max-width:300px)') && editorSource.includes('@container graph-details (max-width:300px)'), 'Both details layers declare intrinsic wrapping and constrained-width stacking.')

  const edgeCandidates = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe']
  let edgePath = ''
  for (const candidate of edgeCandidates) { try { await readFile(candidate); edgePath = candidate; break } catch { /* Try the next installation. */ } }
  if (!edgePath) throw new Error('Microsoft Edge is required for the Visual Graph interaction verification.')
  const port = await freePort(), debugPort = await freePort()
  vite = await createViteServer({ root, logLevel: 'error', optimizeDeps: { noDiscovery: true }, server: { host: '127.0.0.1', port, strictPort: true } })
  await vite.listen()
  edge = spawn(edgePath, ['--headless=new', '--no-first-run', '--disable-default-apps', '--disable-extensions', '--use-angle=swiftshader', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, `http://127.0.0.1:${port}/`], { stdio: 'ignore', windowsHide: true })
  const target = await waitForTarget(debugPort)
  client = await connectCdp(target.webSocketDebuggerUrl)
  await client.send('Runtime.enable'); await client.send('Page.enable')
  await waitForExpression(client, "document.readyState === 'complete' && Boolean(document.querySelector('.project-manager,.editor-root'))", pageReadyTimeout)
  await evaluate(client, `(() => { localStorage.setItem('nova_a.preferences.v1',JSON.stringify({locale:'en',reduceMotion:true,uiScale:1})); localStorage.setItem('nova_a.creator-learning.v6',JSON.stringify({version:1,completed:[],onboardingComplete:true})); location.reload(); return true })()`)
  await waitForExpression(client, "document.readyState === 'complete' && Boolean(document.querySelector('.project-manager,.editor-root'))", pageReadyTimeout)
  if (await evaluate(client, "Boolean(document.querySelector('.project-manager'))")) {
    await evaluate(client, "document.querySelector('.create-button')?.click(); true")
    await waitForExpression(client, "Boolean(document.querySelector('.editor-root'))", pageReadyTimeout)
  }
  await setViewport(client, 1440, 900)
  await evaluate(client, "document.querySelectorAll('.workspace-list button')[1]?.click(); true")
  await waitForExpression(client, "Boolean(document.querySelector('.script-workspace'))", pageReadyTimeout)
  await evaluate(client, "document.querySelector('.logic-mode button:nth-child(2)')?.click(); true")
  await waitForExpression(client, "Boolean(document.querySelector('.graph-editor .graph-canvas'))", pageReadyTimeout)
  await pause(300)

  const domInteraction = await evaluate(client, `(async() => {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
    const root = [...document.querySelectorAll('.graph-editor')].find(item => { const rect=item.getBoundingClientRect();return rect.width>0&&rect.height>0 })
    const transform = () => root?.querySelector('.nodes-layer')?.style.transform || ''
    const canvas = root?.querySelector('.graph-canvas'), firstHeader = root?.querySelector('.graph-node>header'), field = root?.querySelector('.graph-node input[type=text],.graph-node input[type=number]')
    if (!canvas || !firstHeader || !field) return { error: 'Graph canvas, node header, or inline field missing.' }
    const canvasRect = canvas.getBoundingClientRect(), wheelBefore = transform()
    canvas.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:-120,deltaMode:0,clientX:canvasRect.left+canvasRect.width*.55,clientY:canvasRect.top+canvasRect.height*.45}))
    await wait(60); const wheelAfter = transform()
    const zoomTextBefore = root.querySelector('.canvas-controls .zoom-value')?.textContent
    root.querySelector('.canvas-controls button')?.click(); await wait(40)
    const zoomTextAfter = root.querySelector('.canvas-controls .zoom-value')?.textContent
    const panBefore = transform(), x=canvasRect.left+canvasRect.width*.55, y=canvasRect.top+canvasRect.height*.45
    canvas.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:71,isPrimary:true,button:0,buttons:1,clientX:x,clientY:y}))
    window.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:71,isPrimary:true,button:0,buttons:1,clientX:x+86,clientY:y-34}))
    window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:71,isPrimary:true,button:0,buttons:0,clientX:x+86,clientY:y-34}))
    await wait(60); const panAfter = transform()
    const node = firstHeader.closest('.graph-node'), nodeBefore = {left:node.style.left,top:node.style.top}, headerRect=firstHeader.getBoundingClientRect()
    firstHeader.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:72,isPrimary:true,button:0,buttons:1,clientX:headerRect.left+40,clientY:headerRect.top+15}))
    window.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:72,isPrimary:true,button:0,buttons:1,clientX:headerRect.left+104,clientY:headerRect.top+43}))
    window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:72,isPrimary:true,button:0,buttons:0,clientX:headerRect.left+104,clientY:headerRect.top+43}))
    await wait(60); const nodeAfter = {left:node.style.left,top:node.style.top}
    const editPosition = {left:node.style.left,top:node.style.top}, previousValue=field.value, nextValue=field.type==='number'?'37.5':'Visual graph edit verified'
    field.focus();field.value=nextValue;field.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:nextValue}));field.dispatchEvent(new Event('change',{bubbles:true}));await wait(60)
    const editAfter={left:node.style.left,top:node.style.top,value:field.value,active:document.activeElement===field}
    root.focus();root.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,cancelable:true,key:'0',ctrlKey:true}));await wait(60)
    const keyboardZoom=root.querySelector('.canvas-controls .zoom-value')?.textContent||'',keyboardReset=keyboardZoom.trim()==='100%'
    let minimap=root.querySelector('.minimap svg');if(!minimap){root.querySelector('.canvas-controls button:last-child')?.click();await wait(60);minimap=root.querySelector('.minimap svg')}
    const minimapBefore=transform();let minimapChanged=false
    if(minimap){const mr=minimap.getBoundingClientRect(),mx=mr.left+mr.width*.82,my=mr.top+mr.height*.72;minimap.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:73,isPrimary:true,button:0,buttons:1,clientX:mx,clientY:my}));window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:73,isPrimary:true,button:0,buttons:0,clientX:mx,clientY:my}));await wait(60);minimapChanged=minimapBefore!==transform()}
    return {wheelChanged:wheelBefore!==wheelAfter,controlChanged:zoomTextBefore!==zoomTextAfter,panChanged:panBefore!==panAfter,nodeChanged:nodeBefore.left!==nodeAfter.left||nodeBefore.top!==nodeAfter.top,inlineEdited:editAfter.value===nextValue&&editAfter.left===editPosition.left&&editAfter.top===editPosition.top,inlineFocused:editAfter.active,keyboardReset,keyboardZoom,minimapPresent:Boolean(minimap),minimapChanged,previousValue,nextValue,wheelBefore,wheelAfter,panBefore,panAfter,zoomTextBefore,zoomTextAfter}
  })()`)
  check('VG-DOM-WHEEL-CONTROLS', !domInteraction.error && domInteraction.wheelChanged && domInteraction.controlChanged, 'Real graph DOM responds independently to wheel and visible zoom buttons.', domInteraction)
  check('VG-DOM-PAN-DRAG', !domInteraction.error && domInteraction.panChanged && domInteraction.nodeChanged, 'Synthetic user pointer gestures move the real canvas and a real node.', domInteraction)
  check('VG-DOM-INLINE-EDIT', !domInteraction.error && domInteraction.inlineEdited && domInteraction.inlineFocused, 'A real inline field accepts input and keeps focus without moving its node.', domInteraction)
  check('VG-DOM-KEYBOARD', !domInteraction.error && domInteraction.keyboardReset, 'The graph keyboard layer resets zoom without stealing editing keystrokes from inline fields.', domInteraction)
  check('VG-DOM-MINIMAP', !domInteraction.error && domInteraction.minimapPresent && domInteraction.minimapChanged, 'The minimap viewport is visible and repositions the real canvas.', domInteraction)

  await evaluate(client, `(() => { const root=[...document.querySelectorAll('.graph-editor')].find(item=>{const r=item.getBoundingClientRect();return r.width>0&&r.height>0}),button=[...(root?.querySelectorAll('.graph-toolbar button')||[])].find(item=>/Tidy blocks/i.test(item.textContent||'')); button?.click(); return Boolean(button) })()`)
  await pause(100)
  const tidyGeometry = await evaluate(client, `(() => { const root=[...document.querySelectorAll('.graph-editor')].find(item=>{const r=item.getBoundingClientRect();return r.width>0&&r.height>0}),nodes=[...(root?.querySelectorAll('.graph-node')||[])].filter(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0}),pairs=[];for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i].getBoundingClientRect(),b=nodes[j].getBoundingClientRect(),dx=Math.min(a.right,b.right)-Math.max(a.left,b.left),dy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(dx>1&&dy>1)pairs.push([i,j,Math.round(dx*dy)])}return{nodes:nodes.length,pairs} })()`)
  check('VG-DOM-TIDY', tidyGeometry.nodes >= 2 && tidyGeometry.pairs.length === 0, 'Tidy produces non-overlapping real rendered node boxes.', tidyGeometry)

  const panelGeometry = []
  for (const [width, height] of [[1024, 768], [760, 720]]) {
    await setViewport(client, width, height)
    await evaluate(client, `(() => { const root=[...document.querySelectorAll('.graph-editor')].find(item=>{const r=item.getBoundingClientRect();return r.width>0&&r.height>0});root?.querySelector('.open-details')?.click();root?.querySelector('.variables>header button')?.click();return true })()`)
    await pause(120)
    panelGeometry.push(await evaluate(client, `(() => { const editor=[...document.querySelectorAll('.graph-editor')].find(item=>{const r=item.getBoundingClientRect();return r.width>0&&r.height>0}),root=editor?.querySelector('.graph-details');if(!root)return{missing:true};const rr=root.getBoundingClientRect(),visible=node=>{const style=getComputedStyle(node),r=node.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&r.width>0&&r.height>0&&r.bottom>rr.top&&r.top<rr.bottom},controls=[...root.querySelectorAll('input,select,textarea,button')].filter(visible),outside=controls.filter(node=>{const r=node.getBoundingClientRect();return r.left<rr.left-1||r.right>rr.right+1}).map(node=>(node.textContent||node.getAttribute('placeholder')||node.tagName).trim().slice(0,50)),describe=node=>{const r=node.getBoundingClientRect();return[(node.textContent||node.getAttribute('placeholder')||node.getAttribute('aria-label')||node.tagName).trim().slice(0,28),node.className||'',Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]},pairs=[];for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){if(controls[i].contains(controls[j])||controls[j].contains(controls[i]))continue;const a=controls[i].getBoundingClientRect(),b=controls[j].getBoundingClientRect(),dx=Math.min(a.right,b.right)-Math.max(a.left,b.left),dy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(dx>1&&dy>1)pairs.push([describe(controls[i]),describe(controls[j]),Math.round(dx*dy)])}return{width:innerWidth,root:[rr.left,rr.right,rr.width],controls:controls.length,outside,pairs:pairs.slice(0,20)} })()`))
  }
  check('VG-DOM-DETAILS-BOUNDS', panelGeometry.every(/* 先计算 !item.missing && item.controls > 0 && item.outside.length === 0；仅当其为真值时求右侧 item.pairs.length === 0，返回短路求值结果。 */ item => !item.missing && item.controls > 0 && item.outside.length === 0 && item.pairs.length === 0), 'The real right inspector contains every visible field/button without pairwise overlap at desktop and compact widths.', { panelGeometry })
} finally {
  if (vite) await vite.waitForRequestsIdle()
  try { await client?.send('Browser.close') } catch { /* Process cleanup below. */ }
  if (edge && !edge.killed) edge.kill()
  if (vite) await vite.close()
  await rm(compiled, { recursive: true, force: true })
  await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 })
}

const failed = checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed')
const report = {
  format: 'nova-v26.06-visual-graph-verification',
  version: 1,
  release: '26.06',
  engineVersion: '26.6.0',
  generatedAt: new Date().toISOString(),
  status: failed.length ? 'failed' : 'passed',
  failures: failed.map(/** 提取检查标识、详情和指标用于报告。 */ item => ({ id: item.id, detail: item.detail, metrics: item.metrics })),
  checks
}
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v26.06-visual-graph.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
if (failed.length) { console.error(JSON.stringify({ status: 'failed', checks }, null, 2)); process.exit(1) }
console.log(`Nova_A 26.06 Visual Graph verification passed: ${checks.length} focused checks.`)

/** 临时监听本机随机端口，读取分配结果并关闭监听后返回端口。 */ async function freePort() { const server=createNetServer();await new Promise(/** 监听本机随机端口，监听错误时拒绝等待，准备完成时结束等待。 */ (resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});const address=server.address(),port=typeof address==='object'&&address?address.port:0;await new Promise(/* 调用 server.close(resolve) 并返回调用结果。 */ resolve=>server.close(resolve));return port }
/** 在二十秒内轮询浏览器调试目标并返回首个页面，超时报错。 */ async function waitForTarget(port) { const deadline=Date.now()+20_000;while(Date.now()<deadline){try{const targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(/* 调用 response.json() 并返回调用结果。 */ response=>response.json()),target=targets.find(/* 比较 item.type 与 'page'，返回严格相等的判断结果。 */ item=>item.type==='page');if(target)return target}catch{}await pause(100)}throw new Error('Timed out connecting to Edge DevTools.') }
/** 建立浏览器调试WebSocket连接，关联请求响应并分发协议事件。 */ async function connectCdp(url) { const socket=new WebSocket(url),pending=new Map(),listeners=new Map();let nextId=1;await new Promise(/** 等待WebSocket首次连接成功或首次连接错误。 */ (resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});socket.addEventListener('message',/** 将调试响应分配到待处理请求，并把无请求标识的消息分发给事件监听者。 */ message=>{const value=JSON.parse(message.data);if(value.id){const item=pending.get(value.id);if(!item)return;pending.delete(value.id);value.error?item.reject(new Error(value.error.message)):item.resolve(value.result)}else for(const listener of listeners.get(value.method)||[])listener(value.params||{})});return{/** 发送带递增标识的调试协议请求，并返回等待响应的任务。 */ send(method,params={}){return new Promise(/** 登记调试请求的完成处理器并经WebSocket发送请求。 */ (resolve,reject)=>{const id=nextId++;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})},/** 向指定调试事件的监听器列表追加回调。 */ on(method,listener){listeners.set(method,[...(listeners.get(method)||[]),listener])}} }
/** 在浏览器内求值并等待异步结果，将远程异常转为本地错误。 */ async function evaluate(cdp, expression) { const result=await cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value }
/** 按间隔轮询浏览器表达式，成功时返回，达到期限时报告超时。 */ async function waitForExpression(cdp, expression, timeout) { const deadline=Date.now()+timeout;while(Date.now()<deadline){try{if(await evaluate(cdp,expression))return}catch{}await pause(100)}throw new Error(`Timed out waiting for ${expression}`) }
/** 设置浏览器视口与可见尺寸，派发尺寸变化事件后等待布局稳定。 */ async function setViewport(cdp, width, height) { await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,screenWidth:width,screenHeight:height,deviceScaleFactor:1,mobile:false});await cdp.send('Emulation.setVisibleSize',{width,height});await evaluate(cdp,"window.dispatchEvent(new Event('resize')); true");await pause(300) }
