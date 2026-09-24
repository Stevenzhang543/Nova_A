/** 真实浏览器审核工具：通过 Edge 输入事件操作生产页面，只读取 DOM 与诊断，保存截图、下载和异常证据。 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { preview } from 'vite'

/** 等待指定毫秒数，供真实输入和异步页面更新之间让出执行。 */
export const wait = ms => new Promise(/* 调用 setTimeout(done, ms) 并返回调用结果。 */ done => setTimeout(done, ms))
/** 向本机回环地址申请临时端口，关闭探测服务后返回端口号。 */
async function freePort() {
  const server = createServer(); await new Promise(/* 调用 server.listen(0, '127.0.0.1', done) 并返回调用结果。 */ done => server.listen(0, '127.0.0.1', done))
  const port = server.address().port; await new Promise(/* 调用 server.close(done) 并返回调用结果。 */ done => server.close(done)); return port
}
/** 建立 DevTools WebSocket，将命令编号与有界超时关联，并分派异步事件；连接关闭时拒绝未完成命令。 */
async function connect(url, commandTimeoutMs = 30000) {
  const socket = new WebSocket(url), pending = new Map(), listeners = new Map(); let sequence = 0
  await new Promise(/** 监听连接打开或失败，使用一次性订阅完成握手。 */ (done, reject) => { socket.addEventListener('open', done, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  socket.addEventListener('message', /** 按命令编号结算响应，或将无编号的浏览器事件交给已注册订阅者。 */ event => {
    const message = JSON.parse(event.data)
    if (message.id) { const item = pending.get(message.id); if (!item) return; pending.delete(message.id); clearTimeout(item.timer); message.error ? item.reject(Error(message.error.message)) : item.done(message.result) }
    else for (const callback of listeners.get(message.method) ?? []) callback(message.params)
  })
  socket.addEventListener('close', /** 清除所有请求定时器并报告连接关闭，防止待处理 Promise 悬挂。 */ () => { for (const item of pending.values()) { clearTimeout(item.timer); item.reject(Error('Browser connection closed')) } pending.clear() })
  return {
    /** 发送编号命令并记录定时器；响应、连接关闭或超时只能结算对应待处理请求。 */
    send(method, params = {}) { return new Promise(/** 保存请求回调，定时器只负责当前编号的超时拒绝。 */ (done, reject) => { const id = ++sequence; const timer = setTimeout(/** 移除超时请求并附上具体 DevTools 方法名。 */ () => { pending.delete(id); reject(Error(`DevTools timed out: ${method}`)) }, method === 'Runtime.evaluate' ? commandTimeoutMs : method === 'Browser.close' ? 3000 : 30000); pending.set(id, { done, reject, timer }); socket.send(JSON.stringify({ id, method, params })) }) },
    /** 注册指定 DevTools 事件回调，并返回仅移除此订阅的注销函数。 */
    on(method, callback) { const handlers = listeners.get(method) ?? []; handlers.push(callback); listeners.set(method, handlers); return /** 只删除这一回调，保持其他同名事件订阅。 */ () => { const at = handlers.indexOf(callback); if (at >= 0) handlers.splice(at, 1) } },
    /** 关闭当前调试连接，由关闭监听器拒绝尚未完成的命令。 */
    close() { socket.close() }
  }
}

/** 启动独立 Edge 和本机生产预览，执行可见输入审核；核对版本、保留失败证据并释放仅本次创建的服务和临时配置目录。 */
export async function withBrowserAudit({ release, name, width = 1440, height = 900, commandTimeoutMs = 30000, root = process.env.NOVA_AUDIT_ROOT || process.cwd(), development = process.argv.includes('--development'), expectedRelease = development ? (process.env.NOVA_AUDIT_EXPECTED_RELEASE || '26.12') : release }, task) {
  const regressionOrigin = release
  const qualificationTarget = process.argv.find(/* 调用 value.startsWith('--qualification-release=') 并返回调用结果。 */ value => value.startsWith('--qualification-release='))?.split('=')[1]
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
  /** 浏览器读取失败时附上有界表达式上下文，保留原异常；不延长超时或改变断言。 */
  const evaluate = async expression => { const result = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }).catch(/** 指出未响应的 DOM 操作，便于区分具体界面路径。 */ error => { throw new Error(String(error.message) + ' while evaluating: ' + expression.slice(0, 800), {cause:error}) }); if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result.value }
  /** 在有界时间内轮询 DOM 条件；超时保留具体表达式用于定位界面故障。 */
  const until = async (expression, timeout = 20000) => { const end = Date.now() + timeout; while (Date.now() < end) { if (await evaluate(expression)) return; await wait(75) } throw Error(`Timed out: ${expression}`) }
  /** 将目标滚入视野并读取可见中心；缺失、禁用或无尺寸的控件立即失败。 */
  const point = async (selector, index = 0) => evaluate(`(()=>{const e=document.querySelectorAll(${JSON.stringify(selector)})[${index}];if(!e)throw Error('Missing '+${JSON.stringify(selector)});if(e.disabled)throw Error('Disabled '+e.textContent);e.scrollIntoView({block:'nearest',inline:'nearest'});const r=e.getBoundingClientRect();if(!r.width||!r.height)throw Error('Invisible '+${JSON.stringify(selector)});return{x:r.left+r.width/2,y:r.top+r.height/2}})()`)
  /** 在实际目标中心发送鼠标按下与释放，不直接调用应用事件处理函数。 */
  const click = async (selector, index = 0, button = 'left') => { const at = await point(selector, index); await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at, button, clickCount: 1 }); await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at, button, clickCount: 1 }); await wait(90) }
  /** 只在可见候选中按完整或部分文字定位，再执行真实鼠标点击。 */
  const clickText = async (selector, text, exact = false) => { const index = await evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].findIndex(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height&&${exact ? 'e.textContent.trim()===' : 'e.textContent.toLowerCase().includes('}${JSON.stringify(exact ? text : text.toLowerCase())}${exact ? '' : ')'})`); assert.ok(index >= 0, `Missing visible ${selector}: ${text}`); await click(selector, index) }
  /** 构造键码、修饰键和必要文本，发送按下/释放事件；长按保留指定真实持续时间。 */
  const press = async (key, modifiers = 0, duration = 0) => {
    const code = key === ' ' ? 'Space' : key.length === 1 ? `Key${key.toUpperCase()}` : key
    const windowsVirtualKeyCode = ({ Backspace: 8, Tab: 9, Enter: 13, Shift: 16, Control: 17, Alt: 18, Escape: 27, ' ': 32, Space: 32, PageUp: 33, PageDown: 34, End: 35, Home: 36, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Delete: 46 })[key] ?? (key.length === 1 ? key.toUpperCase().charCodeAt(0) : undefined)
    const event = { key: key === 'Space' ? ' ' : key, code, windowsVirtualKeyCode, modifiers }
    const text = !(modifiers & 7) && (key === 'Enter' || key === 'Space' || key === ' ') ? (key === 'Enter' ? '\r' : ' ') : undefined
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', ...event, ...(text ? { text, unmodifiedText: text } : {}) }); if (duration) await wait(duration); await client.send('Input.dispatchKeyEvent', { type: 'keyUp', ...event })
  }
  /** 聚焦文本控件，以全选和真实文本输入替换内容，再用 Tab 提交失焦编辑。 */
  const fill = async (selector, value, index = 0) => { await click(selector, index); await press('a', 2); await client.send('Input.insertText', { text: String(value) }); await press('Tab'); await wait(100) }
  /** 用键盘在可用选项中选择目标值，并读回确认；不直接设置 select.value。 */
  const select = async (selector, value, index = 0) => {
    const target = await evaluate(`(()=>{const e=document.querySelectorAll(${JSON.stringify(selector)})[${index}];if(!e)throw Error('Missing select');return [...e.options].filter(o=>!o.disabled&&!o.parentElement?.disabled).findIndex(o=>o.value===${JSON.stringify(value)})})()`)
    assert.ok(target >= 0, `Missing option ${value}`); await click(selector, index); await press('Escape'); await press('Home'); for (let n = 0; n < target; n++) await press('ArrowDown'); await press('Enter'); await press('Tab'); await wait(100)
    assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(selector)})[${index}].value`), value)
  }
  /** 捕获当前视口真实 PNG，以版本及检查名写入证据目录并记录文件名。 */
  const capture = async (label, pageClient = client) => { assert.match(label, /^[a-z0-9-]+$/); const file = `v${release}-${name}-${label}.png`; const result = await pageClient.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(join(evidence, file), Buffer.from(result.data, 'base64')); captures.push(file); return file }
  /** 运行具名断言，必要时收集本次 V8 执行覆盖；只有动作成功后才记录通过。 */
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
  /** 同步设置设备指标与可见尺寸，等待布局更新后核对页面实际内宽高。 */
  const viewport = async (w, h) => { await client.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }); await client.send('Emulation.setVisibleSize', { width: w, height: h }); await wait(480); assert.deepEqual(await evaluate('({width:innerWidth,height:innerHeight})'), { width: w, height: h }) }
  try {
    await mkdir(evidence, { recursive: true }); profile = await mkdtemp(join(tmpdir(), `nova-v${release.replace('.', '')}-${name}-`))
    const port = await freePort(), debug = await freePort(); server = await preview({ root, logLevel: 'silent', preview: { host: '127.0.0.1', port, strictPort: true } })
    let executable; for (const file of ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe']) try { await readFile(file); executable = file; break } catch {}
    assert.ok(executable, 'Microsoft Edge must be installed')
    edge = spawn(executable, ['--headless=new', '--no-first-run', '--disable-extensions', '--disable-blink-features=FileSystemAccessLocal', '--use-angle=swiftshader', `--remote-debugging-port=${debug}`, `--user-data-dir=${profile}`, `http://127.0.0.1:${port}/`], { stdio: 'ignore', windowsHide: true })
    let target; const deadline = Date.now() + 20000; while (!target && Date.now() < deadline) { try { target = (await fetch(`http://127.0.0.1:${debug}/json/list`).then(/* 调用 r.json() 并返回调用结果。 */ r => r.json())).find(/* 比较 item.type 与 'page'，返回严格相等的判断结果。 */ item => item.type === 'page') } catch {} if (!target) await wait(100) }
    assert.ok(target, 'Edge must expose its DevTools page'); client = await connect(target.webSocketDebuggerUrl, commandTimeoutMs)
    client.on('Runtime.exceptionThrown', /* 调用 errors.push(event.exceptionDetails?.exception?.description ?? event.exceptionDetails?.text) 并返回调用结果。 */ event => errors.push(event.exceptionDetails?.exception?.description ?? event.exceptionDetails?.text))
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
    if (server) await new Promise(/* 调用 server.httpServer.close(done) 并返回调用结果。 */ done => server.httpServer.close(done))
    if (profile) { const suffix = relative(resolve(tmpdir()), resolve(profile)); assert.ok(suffix && !suffix.startsWith('..') && !isAbsolute(suffix) && suffix.startsWith(`nova-v${release.replace('.', '')}-${name}-`)); await wait(200); await rm(resolve(profile), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }) }
  }
  if (failure) throw failure
}
