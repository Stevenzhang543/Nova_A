import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer as createNetServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const evidenceRoot = join(root, 'release-audits')
const screenshotRoot = join(evidenceRoot, 'screenshots', 'v3.1.0')
const edgeCandidates = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe']
let edgePath = ''
for (const candidate of edgeCandidates) { try { await readFile(candidate); edgePath = candidate; break } catch { /* try next installed location */ } }
if (!edgePath) throw new Error('Microsoft Edge is required for the v3.1 editor qualification run.')
await mkdir(screenshotRoot, { recursive: true })

const previewServer = await preview({ root, logLevel: 'silent', preview: { host: '127.0.0.1', port: 4173, strictPort: true } })
const debugPort = await freePort()
const profile = await mkdtemp(join(tmpdir(), 'nova-a-edge-v31-'))
const edge = spawn(edgePath, [
  '--headless=new', '--no-first-run', '--disable-default-apps', '--disable-extensions', '--use-angle=swiftshader',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'http://127.0.0.1:4173/'
], { stdio: 'ignore', windowsHide: true })

const consoleErrors = [], results = [], screenshots = []
let client
try {
  const target = await waitForTarget(debugPort)
  client = await connectCdp(target.webSocketDebuggerUrl)
  client.on('Runtime.exceptionThrown', event => consoleErrors.push(event.exceptionDetails?.exception?.description || event.exceptionDetails?.text || 'Runtime exception'))
  client.on('Log.entryAdded', event => { if (event.entry?.level === 'error') consoleErrors.push(event.entry.text) })
  await client.send('Runtime.enable'); await client.send('Log.enable'); await client.send('Page.enable')
  const browser = await client.send('Browser.getVersion')
  results.push({ name: 'Browser engine', status: 'passed', detail: `${browser.product}; ${browser.userAgent}` })
  await waitForExpression(client, "document.readyState === 'complete' && Boolean(document.querySelector('.project-manager'))", 20_000)

  let focusedCreate = false, tabCount = 0
  for (; tabCount < 40; tabCount++) {
    if (await evaluate(client, "document.activeElement?.classList.contains('create-button') === true")) { focusedCreate = true; break }
    await key(client, 'Tab', 'Tab')
  }
  results.push({ name: 'Keyboard-only project creation focus', status: focusedCreate ? 'passed' : 'failed', detail: `Create Project reached after ${tabCount} Tab presses.` })
  if (!focusedCreate) throw new Error('Create Project was not keyboard reachable.')
  await key(client, 'Enter', 'Enter')
  await waitForExpression(client, "Boolean(document.querySelector('.editor-root'))", 25_000)

  await combo(client, 'k', 'KeyK', 2)
  const paletteOpened = await waitForExpression(client, "Boolean(document.querySelector('.command-palette'))", 5_000, false)
  if (paletteOpened) { await client.send('Input.insertText', { text: 'console' }); await key(client, 'Enter', 'Enter') }
  const consoleOpened = paletteOpened && await waitForExpression(client, "Boolean(document.querySelector('.bottom-panel')) && [...document.querySelectorAll('.panel-tabs button')].some(button => button.classList.contains('active') && /console/i.test(button.textContent || ''))", 5_000, false)
  results.push({ name: 'Command palette keyboard navigation', status: consoleOpened ? 'passed' : 'failed', detail: 'Ctrl+K searched Console and Enter opened its bottom tool.' })

  await combo(client, 'k', 'KeyK', 3)
  const shortcutDialog = await waitForExpression(client, "Boolean(document.querySelector('[role=dialog][aria-modal=true]'))", 5_000, false)
  results.push({ name: 'Shortcut editor keyboard route', status: shortcutDialog ? 'passed' : 'failed', detail: 'Ctrl+Alt+K opened the shortcut editor.' })
  await combo(client, 'k', 'KeyK', 3)
  await combo(client, 'w', 'KeyW', 3)
  const workspaceDialog = await waitForExpression(client, "Boolean(document.querySelector('[role=dialog][aria-modal=true]'))", 5_000, false)
  results.push({ name: 'Workspace manager keyboard route', status: workspaceDialog ? 'passed' : 'failed', detail: 'Ctrl+Alt+W opened workspace management.' })
  await combo(client, 'w', 'KeyW', 3)

  for (const [width, height] of [[1366, 768], [1920, 1080], [2560, 1440], [3840, 2160]]) {
    await client.send('Emulation.setDeviceMetricsOverride', { width, height, screenWidth: width, screenHeight: height, deviceScaleFactor: 1, mobile: false })
    await new Promise(resolve => setTimeout(resolve, 250))
    const layout = await evaluate(client, `(() => { const selectors=['.editor-root','.workspace-bar','.sidebar-container','.config-wrapper','.editor-workspace','.status-bar']; const items=selectors.map(selector=>{const node=document.querySelector(selector);if(!node)return{selector,visible:false};const rect=node.getBoundingClientRect();return{selector,visible:rect.width>0&&rect.height>0,left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height}});return{viewport:{width:innerWidth,height:innerHeight},scrollWidth:document.documentElement.scrollWidth,items,focusable:[...document.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]')].filter(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0}).length}})()`)
    const required = layout.items.filter(item => ['.editor-root','.workspace-bar','.sidebar-container','.config-wrapper','.editor-workspace','.status-bar'].includes(item.selector))
    const contained = layout.scrollWidth <= width + 1 && required.every(item => item.visible && item.left >= -1 && item.right <= width + 1 && item.top >= -1 && item.bottom <= height + 1)
    results.push({ name: `Layout ${width}x${height}`, status: contained ? 'passed' : 'failed', detail: JSON.stringify(layout) })
    const capture = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false })
    const name = `editor-design-${width}x${height}.png`
    await writeFile(join(screenshotRoot, name), Buffer.from(capture.data, 'base64'))
    screenshots.push({ name, width, height })
  }

  const fatalSurface = await evaluate(client, "Boolean(document.querySelector('.error-recovery,[data-fatal=true]'))")
  results.push({ name: 'Browser console and fatal surface', status: !fatalSurface && consoleErrors.length === 0 ? 'passed' : 'failed', detail: JSON.stringify({ fatalSurface, consoleErrors }) })
  const report = { format: 'nova-editor-browser-qualification', version: 1, engineVersion: '3.1.0', generatedAt: new Date().toISOString(), browser: browser.product, status: results.every(item => item.status === 'passed') ? 'passed' : 'failed', resolutions: screenshots, results, consoleErrors }
  await writeFile(join(evidenceRoot, 'v3.1.0-layout-keyboard-browser.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  if (report.status !== 'passed') throw new Error(`Browser qualification failed: ${results.filter(item => item.status !== 'passed').map(item => item.name).join(', ')}`)
  console.log(`Nova_A v3.1 browser qualification passed; ${screenshots.length} layout captures written to ${screenshotRoot}`)
} finally {
  try { await client?.send('Browser.close') } catch { /* process cleanup below */ }
  await new Promise(resolve => setTimeout(resolve, 300))
  if (!edge.killed) edge.kill()
  await new Promise(resolve => previewServer.httpServer.close(resolve))
  // Edge can hold a transient lock on profile files for a few hundred milliseconds
  // after Browser.close. Let Node retry those Windows EBUSY/EPERM failures so a
  // successful product qualification is not reported as a cleanup failure.
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 })
}

async function freePort() {
  const server = createNetServer()
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  const address = server.address(); const port = typeof address === 'object' && address ? address.port : 0
  await new Promise(resolve => server.close(resolve)); return port
}
async function waitForTarget(port) {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    try { const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json()); const target = targets.find(item => item.type === 'page'); if (target) return target } catch { /* browser is starting */ }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('Timed out connecting to Edge DevTools.')
}
async function connectCdp(url) {
  const socket = new WebSocket(url), pending = new Map(), listeners = new Map(); let nextId = 1
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  socket.addEventListener('message', message => { const value = JSON.parse(message.data); if (value.id) { const item = pending.get(value.id); if (!item) return; pending.delete(value.id); if (value.error) item.reject(new Error(value.error.message)); else item.resolve(value.result) } else for (const listener of listeners.get(value.method) || []) listener(value.params || {}) })
  return { send(method, params = {}) { return new Promise((resolve, reject) => { const id = nextId++; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })) }) }, on(method, listener) { listeners.set(method, [...(listeners.get(method) || []), listener]) } }
}
async function evaluate(client, expression) { const result = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value }
async function waitForExpression(client, expression, timeout, throwOnTimeout = true) { const deadline = Date.now() + timeout; while (Date.now() < deadline) { try { if (await evaluate(client, expression)) return true } catch { /* page may still be navigating */ } await new Promise(resolve => setTimeout(resolve, 100)) } if (throwOnTimeout) throw new Error(`Timed out waiting for ${expression}`); return false }
async function key(client, keyValue, code, modifiers = 0) { const virtualKey = keyValue.length === 1 ? keyValue.toUpperCase().charCodeAt(0) : keyValue === 'Enter' ? 13 : keyValue === 'Tab' ? 9 : keyValue === 'Escape' ? 27 : 0; const text = keyValue === 'Enter' ? '\r' : keyValue.length === 1 && modifiers === 0 ? keyValue : undefined; await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: keyValue, code, modifiers, windowsVirtualKeyCode: virtualKey, ...(text ? { text, unmodifiedText: text } : {}) }); await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyValue, code, modifiers, windowsVirtualKeyCode: virtualKey }) }
async function combo(client, keyValue, code, modifiers) { await key(client, keyValue, code, modifiers) }
