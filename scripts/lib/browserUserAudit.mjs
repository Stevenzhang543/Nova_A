import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { preview } from 'vite'

export const wait = ms => new Promise(done => setTimeout(done, ms))
async function freePort() {
  const server = createServer(); await new Promise(done => server.listen(0, '127.0.0.1', done))
  const port = server.address().port; await new Promise(done => server.close(done)); return port
}
async function connect(url, commandTimeoutMs = 30000) {
  const socket = new WebSocket(url), pending = new Map(), listeners = new Map(); let sequence = 0
  await new Promise((done, reject) => { socket.addEventListener('open', done, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.id) { const item = pending.get(message.id); if (!item) return; pending.delete(message.id); clearTimeout(item.timer); message.error ? item.reject(Error(message.error.message)) : item.done(message.result) }
    else for (const callback of listeners.get(message.method) ?? []) callback(message.params)
  })
  socket.addEventListener('close', () => { for (const item of pending.values()) { clearTimeout(item.timer); item.reject(Error('Browser connection closed')) } pending.clear() })
  return {
    send(method, params = {}) { return new Promise((done, reject) => { const id = ++sequence; const timer = setTimeout(() => { pending.delete(id); reject(Error(`DevTools timed out: ${method}`)) }, method === 'Runtime.evaluate' ? commandTimeoutMs : method === 'Browser.close' ? 3000 : 30000); pending.set(id, { done, reject, timer }); socket.send(JSON.stringify({ id, method, params })) }) },
    on(method, callback) { const handlers = listeners.get(method) ?? []; handlers.push(callback); listeners.set(method, handlers); return () => { const at = handlers.indexOf(callback); if (at >= 0) handlers.splice(at, 1) } },
    close() { socket.close() }
  }
}

/** Genuine browser input and DOM observations. No application-module imports or state mutation. */
export async function withBrowserAudit({ release, name, width = 1440, height = 900, commandTimeoutMs = 30000, root = process.env.NOVA_AUDIT_ROOT || process.cwd(), development = process.argv.includes('--development'), expectedRelease = development ? (process.env.NOVA_AUDIT_EXPECTED_RELEASE || '26.12') : release }, task) {
  const regressionOrigin = release
  const qualificationTarget = process.argv.find(value => value.startsWith('--qualification-release='))?.split('=')[1]
  if (qualificationTarget && qualificationTarget !== release) {
    assert.match(qualificationTarget, /^26\.(?:2[0-9]|30)$/)
    assert.ok(Number(qualificationTarget.split('.')[1]) >= Number(release.split('.')[1]), 'Cannot qualify a future regression suite')
    assert.equal(JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version, qualificationTarget + '.0', 'Retained browser regression must target the actual source authority')
    release = qualificationTarget; expectedRelease = qualificationTarget
  }
  assert.match(release, /^26\.(?:1[3-9]|2[0-9]|30)$/); assert.match(name, /^[a-z0-9-]+$/)
  assert.ok(Number.isFinite(commandTimeoutMs) && commandTimeoutMs >= 30000 && commandTimeoutMs <= 180000, 'Bounded diagnostic command deadline');
  assert.match(expectedRelease, /^26\.\d{2}$/)
  if (!development) assert.equal(expectedRelease, release, 'Qualification must exercise its actual public version')
  root = resolve(root)
  const evidence = join(root, 'release-audits'), captures = [], checks = [], observations = [], errors = []
  let client, edge, server, profile, failure, browser, coverageMapper, coverageOrigin
  const operationCoverage = []
  const evaluate = async expression => { const result = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result.value }
  const until = async (expression, timeout = 20000) => { const end = Date.now() + timeout; while (Date.now() < end) { if (await evaluate(expression)) return; await wait(75) } throw Error(`Timed out: ${expression}`) }
  const point = async (selector, index = 0) => evaluate(`(()=>{const e=document.querySelectorAll(${JSON.stringify(selector)})[${index}];if(!e)throw Error('Missing '+${JSON.stringify(selector)});if(e.disabled)throw Error('Disabled '+e.textContent);e.scrollIntoView({block:'nearest',inline:'nearest'});const r=e.getBoundingClientRect();if(!r.width||!r.height)throw Error('Invisible '+${JSON.stringify(selector)});return{x:r.left+r.width/2,y:r.top+r.height/2}})()`)
  const click = async (selector, index = 0, button = 'left') => { const at = await point(selector, index); await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at, button, clickCount: 1 }); await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at, button, clickCount: 1 }); await wait(90) }
  const clickText = async (selector, text, exact = false) => { const index = await evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].findIndex(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height&&${exact ? 'e.textContent.trim()===' : 'e.textContent.toLowerCase().includes('}${JSON.stringify(exact ? text : text.toLowerCase())}${exact ? '' : ')'})`); assert.ok(index >= 0, `Missing visible ${selector}: ${text}`); await click(selector, index) }
  const press = async (key, modifiers = 0, duration = 0) => {
    const code = key === ' ' ? 'Space' : key.length === 1 ? `Key${key.toUpperCase()}` : key
    const windowsVirtualKeyCode = ({ Backspace: 8, Tab: 9, Enter: 13, Shift: 16, Control: 17, Alt: 18, Escape: 27, ' ': 32, Space: 32, PageUp: 33, PageDown: 34, End: 35, Home: 36, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Delete: 46 })[key] ?? (key.length === 1 ? key.toUpperCase().charCodeAt(0) : undefined)
    const event = { key: key === 'Space' ? ' ' : key, code, windowsVirtualKeyCode, modifiers }
    const text = !(modifiers & 7) && (key === 'Enter' || key === 'Space' || key === ' ') ? (key === 'Enter' ? '\r' : ' ') : undefined
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', ...event, ...(text ? { text, unmodifiedText: text } : {}) }); if (duration) await wait(duration); await client.send('Input.dispatchKeyEvent', { type: 'keyUp', ...event })
  }
  const fill = async (selector, value, index = 0) => { await click(selector, index); await press('a', 2); await client.send('Input.insertText', { text: String(value) }); await press('Tab'); await wait(100) }
  const select = async (selector, value, index = 0) => {
    const target = await evaluate(`(()=>{const e=document.querySelectorAll(${JSON.stringify(selector)})[${index}];if(!e)throw Error('Missing select');return [...e.options].filter(o=>!o.disabled&&!o.parentElement?.disabled).findIndex(o=>o.value===${JSON.stringify(value)})})()`)
    assert.ok(target >= 0, `Missing option ${value}`); await click(selector, index); await press('Escape'); await press('Home'); for (let n = 0; n < target; n++) await press('ArrowDown'); await press('Enter'); await press('Tab'); await wait(100)
    assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(selector)})[${index}].value`), value)
  }
  const capture = async (label, pageClient = client) => { assert.match(label, /^[a-z0-9-]+$/); const file = `v${release}-${name}-${label}.png`; const result = await pageClient.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(join(evidence, file), Buffer.from(result.data, 'base64')); captures.push(file); return file }
  const check = async (label, action) => {
    if (coverageMapper) await client.send('Profiler.takePreciseCoverage')
    await action()
    if (coverageMapper) {
      const sample = await client.send('Profiler.takePreciseCoverage'), operations = []
      for (const script of sample.result) {
        if (!script.url.startsWith(coverageOrigin + '/')) continue
        const path = decodeURIComponent(new URL(script.url).pathname).slice(1)
        if (!path.endsWith('.js')) continue
        operations.push(...await coverageMapper.mapScript(path, script.functions))
      }
      operationCoverage.push({case: label, operations})
    }
    checks.push({ name: label, status: 'passed' }); console.log(`PASS ${label}`)
  }
  const viewport = async (w, h) => { await client.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }); await client.send('Emulation.setVisibleSize', { width: w, height: h }); await wait(480); assert.deepEqual(await evaluate('({width:innerWidth,height:innerHeight})'), { width: w, height: h }) }
  try {
    await mkdir(evidence, { recursive: true }); profile = await mkdtemp(join(tmpdir(), `nova-v${release.replace('.', '')}-${name}-`))
    const port = await freePort(), debug = await freePort(); server = await preview({ root, logLevel: 'silent', preview: { host: '127.0.0.1', port, strictPort: true } })
    let executable; for (const file of ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe']) try { await readFile(file); executable = file; break } catch {}
    assert.ok(executable, 'Microsoft Edge must be installed')
    edge = spawn(executable, ['--headless=new', '--no-first-run', '--disable-extensions', '--disable-blink-features=FileSystemAccessLocal', '--use-angle=swiftshader', `--remote-debugging-port=${debug}`, `--user-data-dir=${profile}`, `http://127.0.0.1:${port}/`], { stdio: 'ignore', windowsHide: true })
    let target; const deadline = Date.now() + 20000; while (!target && Date.now() < deadline) { try { target = (await fetch(`http://127.0.0.1:${debug}/json/list`).then(r => r.json())).find(item => item.type === 'page') } catch {} if (!target) await wait(100) }
    assert.ok(target, 'Edge must expose its DevTools page'); client = await connect(target.webSocketDebuggerUrl, commandTimeoutMs)
    client.on('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails?.exception?.description ?? event.exceptionDetails?.text))
    await client.send('Runtime.enable'); await client.send('Page.enable'); browser = await client.send('Browser.getVersion'); await viewport(width, height)
    await until("!!document.querySelector('.project-manager,.editor-root')")
    if (process.env.NOVA_AUDIT_OPERATION_COVERAGE === '1') {
      const {createOperationCoverageMapper22} = await import('./operationCoverage22.mjs')
      const sourceRoot = resolve(process.env.NOVA_AUDIT_COVERAGE_SOURCE_ROOT || process.cwd())
      const inventory = JSON.parse(await readFile(join(sourceRoot, 'reports/v26.22-public-operations.json'), 'utf8'))
      coverageMapper = await createOperationCoverageMapper22({root: sourceRoot, dist: join(root, 'dist'), operations: inventory.operations})
      coverageOrigin = `http://127.0.0.1:${port}`
      await client.send('Profiler.enable'); await client.send('Profiler.startPreciseCoverage', {callCount:true, detailed:true})
    }
    await task({ evaluate, until, point, click, clickText, press, fill, select, capture, check, viewport, client, evidence, profile, observations, checks, expectedRelease, development })
    assert.deepEqual(errors, [], 'No uncaught browser exceptions')
  } catch (error) { failure = error; process.exitCode = 1; console.error(error); if (client) try { await capture('failure') } catch {} }
  finally {
    await mkdir(evidence, { recursive: true })
    await writeFile(join(evidence, `v${release}-${name}.json`), JSON.stringify({ format: `nova-v${release}-${name}-user-audit`, version: 1, release, regressionOrigin, expectedRelease, development, qualifiedRelease: development ? null : release, generatedAt: new Date().toISOString(), status: failure ? 'failed' : 'passed', checks, observations, captures, consoleErrors: errors, browser, commandTimeoutMs, ...(coverageMapper ? {operationCoverage, executionTracing: true, tracingScope: 'Positive V8 function-entry counters within named passing assertions; source, bundle and map hashes checked. Not input-domain coverage or performance qualification.'} : {}), error: failure?.stack, scope: (development ? 'Development source overlay only, not release qualification. ' : '') + 'Recorded real Edge input and DOM observations against production dist. Headless software rendering and download/file-input fallback; physical assistive technology and native OS picker behavior are not measured.' }, null, 2) + '\n')
    try { await client?.send('Browser.close') } catch {} client?.close(); if (edge && !edge.killed) edge.kill()
    if (server) await new Promise(done => server.httpServer.close(done))
    if (profile) { const suffix = relative(resolve(tmpdir()), resolve(profile)); assert.ok(suffix && !suffix.startsWith('..') && !isAbsolute(suffix) && suffix.startsWith(`nova-v${release.replace('.', '')}-${name}-`)); await wait(200); await rm(resolve(profile), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }) }
  }
  if (failure) throw failure
}
