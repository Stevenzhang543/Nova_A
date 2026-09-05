import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const evidence = join(root, 'release-audits'), checks = [], errors = [], captures = [], observations = []
const source = 'fn update(dt) {\n  if input_pressed("Jump") {\n    set_position(2.0, 0.0);\n  }\n}\n'
const positionSelector = '[data-property-path="Transform.position"] input'
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
let client, edge, server, profile, failure

// Browser evaluation reads rendered DOM, or focuses/selects/scrolls a real control.
// All content changes, selection, clicks and gameplay input use CDP mouse/keyboard events.
async function evaluate(expression) {
  const result = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
  return result.result.value
}
async function until(expression, timeout = 20000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) { if (await evaluate(expression)) return; await wait(100) }
  throw Error('Timed out: ' + expression)
}
async function click(selector, index = 0) {
  const point = await evaluate(`(()=>{const el=document.querySelectorAll(${JSON.stringify(selector)})[${index}];if(!el)throw Error('Missing '+${JSON.stringify(selector)});if(el.disabled)throw Error('Disabled '+el.textContent);el.scrollIntoView({block:'center',inline:'nearest'});const r=el.getBoundingClientRect();if(!r.width||!r.height)throw Error('Hidden '+${JSON.stringify(selector)});return{x:r.left+r.width/2,y:r.top+r.height/2}})()`)
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 })
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 })
  await wait(100)
}
async function clickText(selector, text) {
  const index = await evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].findIndex(el=>el.textContent.toLowerCase().includes(${JSON.stringify(text.toLowerCase())}))`)
  assert.ok(index >= 0, `Missing ${selector} text ${text}`); await click(selector, index)
}
async function fill(selector, value, index = 0) {
  await evaluate(`(()=>{const el=document.querySelectorAll(${JSON.stringify(selector)})[${index}];if(!el)throw Error('Missing input');el.focus();el.select()})()`)
  await client.send('Input.insertText', { text: value }); await evaluate('document.activeElement.blur()'); await wait(180)
}
async function press(code, modifiers = 0, hold = 0) {
  const key = code === 'Space' ? ' ' : code
  const windowsVirtualKeyCode = { Home: 36, End: 35, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Enter: 13, Escape: 27, Space: 32, Tab: 9 }[code]
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode })
  if (hold) await wait(hold)
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode })
}
async function selectIndex(selector, index) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`)
  await press('Home'); for (let i = 0; i < index; i++) await press('ArrowDown'); await press('Enter'); await press('Tab'); await wait(100)
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).selectedIndex`), index)
}
async function position(label) {
  const value = await evaluate(`[...document.querySelectorAll(${JSON.stringify(positionSelector)})].map(el=>Number(el.value))`)
  assert.equal(value.length, 2, 'Inspector must expose both live transform coordinates')
  observations.push({ label, position: value }); return value
}
async function capture(name) {
  const result = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  const file = `v26.12-code-game-${name}.png`; await writeFile(join(evidence, file), Buffer.from(result.data, 'base64')); captures.push(file)
}
async function check(name, action) { await action(); checks.push({ name, status: 'passed' }); console.log('PASS ' + name) }
async function freePort() {
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port
}
async function connect(url) {
  const socket = new WebSocket(url), pending = new Map(), listeners = new Map(); let id = 0
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.id) { const item = pending.get(message.id); if (!item) return; pending.delete(message.id); message.error ? item.reject(Error(message.error.message)) : item.resolve(message.result) }
    else for (const handler of listeners.get(message.method) ?? []) handler(message.params)
  })
  return {
    send(method, params = {}) { return new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); socket.send(JSON.stringify({ id: key, method, params })) }) },
    on(method, handler) { listeners.set(method, [...(listeners.get(method) ?? []), handler]) },
  }
}

try {
  await mkdir(evidence, { recursive: true }); profile = await mkdtemp(join(tmpdir(), 'nova-v2612-code-game-'))
  const port = await freePort(), debug = await freePort()
  server = await preview({ root, logLevel: 'silent', preview: { host: '127.0.0.1', port, strictPort: true } })
  let executable = ''
  for (const file of ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe']) {
    try { await readFile(file); executable = file; break } catch {}
  }
  if (!executable) throw Error('Microsoft Edge is unavailable')
  // Exercise Nova_A's actual download/file-input fallback in a browser without local file pickers.
  // OPFS remains available; no application objects or browser functions are monkey-patched.
  edge = spawn(executable, ['--headless=new', '--no-first-run', '--disable-extensions', '--disable-blink-features=FileSystemAccessLocal', '--use-angle=swiftshader', `--remote-debugging-port=${debug}`, `--user-data-dir=${profile}`, `http://127.0.0.1:${port}/`], { stdio: 'ignore', windowsHide: true })
  let target; const deadline = Date.now() + 20000
  while (Date.now() < deadline && !target) { try { target = (await fetch(`http://127.0.0.1:${debug}/json/list`).then(response => response.json())).find(item => item.type === 'page') } catch {} if (!target) await wait(100) }
  if (!target) throw Error('Edge DevTools did not start')
  client = await connect(target.webSocketDebuggerUrl)
  client.on('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails?.exception?.description ?? event.exceptionDetails?.text))
  await client.send('Runtime.enable'); await client.send('Page.enable')
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await until("!!document.querySelector('.project-manager')")
  assert.equal(await evaluate("'showSaveFilePicker' in window || 'showOpenFilePicker' in window"), false, 'The browser must expose the download/file-input fallback capability profile')
  await check('Create a fresh blank project and a Rectangle through the object palette', async () => {
    await fill('.creation-card header input', '26.12 Code Microgame'); await click('[data-template-id="empty"]'); await click('.create-button')
    await until("!!document.querySelector('.editor-root')", 30000)
    await wait(300) // Let the first-run dialog finish its documented entrance animation before clicking.
    if (await evaluate("[...document.querySelectorAll('button')].some(el=>el.textContent==='Skip for now')")) { await clickText('button', 'Skip for now'); await until("!document.querySelector('.onboarding-scrim')") }
    await click('.toolbar .create-object'); await until("!!document.querySelector('.authoring-palette')")
    await fill('.authoring-palette .palette-search input', 'Rectangle'); await clickText('.authoring-palette .type-card', 'Rectangle')
    await click('.authoring-palette footer .primary'); await until("!!document.querySelector('.inspector-header h3')")
    assert.match(await evaluate("document.querySelector('.inspector-header h3').textContent"), /Rectangle/)
    await fill(positionSelector, '0', 0); await fill(positionSelector, '0', 1)
    // Rectangle includes a physics body; choose Kinematic so this input test has no gravity drift.
    const bodyType = '.config-panel select:has(option[value="Kinematic"])'
    await selectIndex(bodyType, 1)
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(bodyType)}).value`), 'Kinematic')
    assert.deepEqual(await position('authored'), [0, 0])
  })
  await check('Author and save the Jump action game in the Rhai editor', async () => {
    await clickText('.workspace-list button', 'Script'); await until("!!document.querySelector('.script-studio')")
    await clickText('.studio-toolbar button', 'New Script'); await until("!!document.querySelector('.editor-shell textarea')")
    await fill('.editor-shell textarea', source); await clickText('.studio-toolbar button', 'Save Script')
    await until("!document.querySelector('.source-save-error') && document.querySelector('.editor-status>span:first-child')?.classList.contains('status-ok')")
    assert.equal(await evaluate("document.querySelector('.editor-shell textarea').value"), source)
    observations.push({ label: 'saved-script', path: await evaluate("document.querySelector('.project-scripts .script-list button.active small').textContent") })
  })
  await check('Add Script2D and attach the saved Rhai asset using the Inspector picker', async () => {
    await clickText('.workspace-list button', 'Design'); await until("!!document.querySelector('.toolbar .create-object')")
    await click('.add-component-trigger'); await fill('.component-picker>input', 'Script')
    await clickText('.component-main', 'Script'); await until("!document.querySelector('.component-picker')")
    const sectionIndex = await evaluate("[...document.querySelectorAll('.inspector-section')].findIndex(el=>el.querySelector('summary')?.textContent.includes('Script'))")
    assert.ok(sectionIndex >= 0)
    if (!await evaluate(`document.querySelectorAll('.inspector-section')[${sectionIndex}].open`)) await click('.inspector-section>summary', sectionIndex)
    const selector = '.config-panel select[aria-label="Script asset"]'
    await until(`!!document.querySelector(${JSON.stringify(selector)})`)
    const index = await evaluate(`[...document.querySelector(${JSON.stringify(selector)}).options].findIndex(option=>option.textContent.includes('Rhai'))`)
    assert.ok(index > 0, 'The saved Rhai asset must be selectable')
    await selectIndex(selector, index)
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).selectedIndex`), index)
    assert.equal(await evaluate("!!document.querySelector('.script-error')"), false)
    await capture('attached')
  })
  await check('Play runs without changing position until the actual Space key is pressed', async () => {
    await click('.actionbar button', 0); await until("document.querySelector('.actionbar button')?.classList.contains('active')")
    await wait(350); assert.deepEqual(await position('playing-before-input'), [0, 0])
    // A non-editable status label clears button focus so Space does not activate Play again.
    await click('.actionbar .mode-label')
    assert.equal(await evaluate("document.activeElement.matches('input,textarea,select,[contenteditable=true]')"), false)
    await press('Space', 0, 180)
    await until(`Number(document.querySelector(${JSON.stringify(positionSelector)}).value)===2`)
    assert.deepEqual(await position('playing-after-space'), [2, 0])
    assert.equal(await evaluate("!!document.querySelector('.script-error')"), false)
    await capture('moved')
  })
  await check('Stop restores the authored scene and a second Play run receives fresh input', async () => {
    await click('.actionbar button', 3); await until("document.querySelectorAll('.actionbar button')[3].disabled")
    assert.deepEqual(await position('stopped-restored'), [0, 0])
    await click('.actionbar button', 0); await click('.actionbar .mode-label'); await wait(250); assert.deepEqual(await position('second-run-before-input'), [0, 0])
    await press('Space', 0, 180); await until(`Number(document.querySelector(${JSON.stringify(positionSelector)}).value)===2`)
    assert.deepEqual(await position('second-run-after-space'), [2, 0])
    await click('.actionbar button', 3); await until("document.querySelectorAll('.actionbar button')[3].disabled")
    assert.deepEqual(await position('second-stop-restored'), [0, 0]); await capture('restored')
  })
  await check('Save Project downloads a real .nova file containing the authored game', async () => {
    const downloads = join(profile, 'downloads'); await mkdir(downloads, { recursive: true })
    await client.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads })
    await clickText('.menu-container>.menu-item>button', 'File'); await clickText('.dropdown button', 'Save Project')
    let downloaded; const deadline = Date.now() + 20000
    while (Date.now() < deadline && !downloaded) { try { const candidate = await readFile(join(downloads, 'project.nova')); JSON.parse(candidate.toString()); downloaded = candidate } catch {} if (!downloaded) await wait(100) }
    assert.ok(downloaded, 'Save Project must finish a parseable file download')
    const artifact = 'v26.12-code-game.nova'; await writeFile(join(evidence, artifact), downloaded)
    const document = JSON.parse(downloaded.toString()), scriptPath = observations.find(item => item.label === 'saved-script').path
    const asset = document.assets.find(item => item.assetType === 'script' && item.path === scriptPath)
    assert.ok(asset?.source?.startsWith('data:text/x-rhai;charset=utf-8,'), 'The project must embed the saved script asset')
    assert.equal(decodeURIComponent(asset.source.slice(asset.source.indexOf(',') + 1)), source, 'The downloaded asset must preserve the exact authored source')
    observations.push({ label: 'downloaded-project', artifact, bytes: downloaded.length, sha256: createHash('sha256').update(downloaded).digest('hex') })
    await until("!document.querySelector('.top-bar .dirty-pill')")
  })
  await check('Reload, open the downloaded .nova through Open Project, and play the saved game', async () => {
    await client.send('Page.reload', { ignoreCache: true }); await until("!!document.querySelector('.project-manager')", 30000)
    let chooser; client.on('Page.fileChooserOpened', event => { chooser = event })
    await client.send('Page.setInterceptFileChooserDialog', { enabled: true })
    await clickText('.project-manager .quick-actions button', 'Open Project')
    const deadline = Date.now() + 5000; while (!chooser && Date.now() < deadline) await wait(50)
    assert.ok(chooser?.backendNodeId, 'Open Project must request an actual file input')
    await client.send('DOM.setFileInputFiles', { files: [join(evidence, 'v26.12-code-game.nova')], backendNodeId: chooser.backendNodeId })
    await until("!!document.querySelector('.upgrade-dialog') || (!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager'))", 30000)
    if (await evaluate("!!document.querySelector('.upgrade-dialog')")) {
      assert.equal(await evaluate("!!document.querySelector('.upgrade-dialog .lock-warning')"), false, 'Reloading this tab must not leave an inaccessible write lease')
      await clickText('.upgrade-dialog footer button', 'Open Project')
    }
    await until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')", 30000)
    await clickText('.workspace-list button', 'Design'); await clickText('.entity-list .entity-item .name', 'Rectangle')
    assert.deepEqual(await position('reopened-before-play'), [0, 0])
    assert.equal(await evaluate("document.querySelector('.config-panel select:has(option[value=\"Kinematic\"])').value"), 'Kinematic')
    assert.ok(await evaluate("document.querySelector('.config-panel select[aria-label=\"Script asset\"]').selectedIndex>0"), 'Reopening must retain the script attachment')
    await click('.actionbar button', 0); await click('.actionbar .mode-label'); await wait(250)
    assert.deepEqual(await position('reopened-playing-before-input'), [0, 0])
    await press('Space', 0, 180); await until(`Number(document.querySelector(${JSON.stringify(positionSelector)}).value)===2`)
    assert.deepEqual(await position('reopened-playing-after-space'), [2, 0])
    assert.equal(await evaluate("!!document.querySelector('.script-error')"), false)
    await capture('reopened-moved'); await click('.actionbar button', 3)
    await until("document.querySelectorAll('.actionbar button')[3].disabled"); assert.deepEqual(await position('reopened-stopped-restored'), [0, 0])
  })
  assert.deepEqual(errors, [])
} catch (error) {
  failure = error; process.exitCode = 1; console.error(error)
  if (client) try { await capture('failure'); console.error(await evaluate("JSON.stringify({text:document.body.innerText.slice(-7000),inputs:[...document.querySelectorAll('.config-panel input,.config-panel select')].map(el=>({label:el.getAttribute('aria-label'),value:el.value}))})")) } catch {}
} finally {
  await mkdir(evidence, { recursive: true })
  await writeFile(join(evidence, 'v26.12-code-game.json'), JSON.stringify({ format: 'nova-v26.12-code-game-user-audit', version: 1, release: '26.12', status: failure ? 'failed' : 'passed', generatedAt: new Date().toISOString(), checks, observations, captures, consoleErrors: errors, source, error: failure?.stack, scope: 'Actual headless Edge mouse/keyboard creation, scripting, asset attachment, Play, Jump input, live Inspector coordinates, Stop restoration, real .nova download and file-input reopening in a fresh disposable profile against current dist. FileSystemAccessLocal disabled using a browser capability flag to exercise the existing download fallback; native OS file-picker behavior is a separate gate. No application or VM state injection. Separate visual authoring audit compares the same game behavior.' }, null, 2) + '\n')
  try { await client?.send('Browser.close') } catch {}
  if (edge && !edge.killed) edge.kill()
  if (server) await new Promise(resolve => server.httpServer.close(resolve))
  if (profile) { await wait(200); await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }) }
}
