/** Optimized pure-core boundary and targeted actual software WebGL diagnostic query regression. */
import { build, createServer } from 'vite'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'

const root = process.cwd(), option = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3)
const reportDir = resolve(option('report-dir') ?? 'release-audits/engine-renderer-gpu-diagnostics')
const digest = async path => createHash('sha256').update(await readFile(path)).digest('hex')
const sourceFiles = ['src/renderer/WebGL2Renderer.ts', 'src/renderer/RendererEnvironment.ts', 'src/renderer/GpuDiagnosticsBudget.ts', 'src/renderer/core.ts', 'src/editor/rendererAdapter.ts', 'scripts/verify-engine-renderer-gpu-diagnostics.mjs', 'scripts/verify-engine-renderer-gpu-diagnostics-cases.mjs']
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path, await digest(path)])))
await mkdir(reportDir, { recursive: true })
const modules = new Set()
const result = await build({ configFile: false, root, logLevel: 'warn', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'gpu-diagnostics-core-boundary', moduleParsed(module) { modules.add(module.id) } }], build: { write: false, target: 'es2022', minify: 'esbuild', lib: { entry: resolve('src/renderer/core.ts'), formats: ['es'], fileName: 'core' } } })
const sourceInputs = [...modules].filter(path => !path.startsWith('\0')).map(path => relative(root, path).replaceAll('\\', '/')).sort()
const violations = sourceInputs.filter(path => /^(?:src\/(?:editor|store|components|layout|ui)\/)|src\/assets\/(?:AssetDatabase|importPipeline)\.|node_modules\/.*(?:vue|pinia|tauri)|src\/renderer\/(?:renderSettings|capabilities|renderGraph)\.ts$/.test(path))
const code = (Array.isArray(result) ? result : [result]).flatMap(output => output.output).find(output => output.type === 'chunk').code
await writeFile(join(reportDir, 'core.js'), code, { flag: 'wx' })
const boundary = { status: violations.length ? 'failed' : 'passed', modules: sourceInputs.length, sourceInputs, violations, bytes: Buffer.byteLength(code), sha256: createHash('sha256').update(code).digest('hex'), scope: 'Compiled standalone renderer core boundary only, separate from whole Runtime/Player and project/source type gates.' }
await writeFile(join(reportDir, 'boundary.json'), JSON.stringify(boundary, null, 2) + '\n', { flag: 'wx' })
if (violations.length) throw Error('Pure core boundary failed: ' + violations.join(','))

let server, browser, socket
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
try {
  const profile = await mkdtemp(join(tmpdir(), 'nova-gpu-diagnostics-'))
  server = await createServer({ configFile: false, root, cacheDir: join(profile, 'vite'), logLevel: 'error', server: { host: '127.0.0.1', port: 0, watch: null, hmr: false }, plugins: [{ name: 'gpu-diagnostics-test-host', configureServer(server) { server.middlewares.use((request, response, next) => { if (request.url !== '/gpu-diagnostics.html') return next(); response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><title>Nova GPU diagnostic owner</title><script>window.gpuDiagnosticErrors=[];addEventListener("error",e=>gpuDiagnosticErrors.push(String(e.error?.stack??e.message)));</script><script type="module">import {gpuDiagnosticsCases} from "/scripts/verify-engine-renderer-gpu-diagnostics-cases.mjs";window.gpuDiagnosticsRun=gpuDiagnosticsCases;</script>') }) } }] })
  await server.listen(); const port = server.httpServer.address().port
  const executable = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
  if (!executable) throw Error('Actual native browser unavailable')
  browser = spawn(executable, ['--headless=new', '--no-first-run', '--disable-extensions', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `http://127.0.0.1:${port}/gpu-diagnostics.html`], { stdio: 'ignore', windowsHide: true })
  let debuggerPort
  for (let attempt = 0; attempt < 200 && !debuggerPort; attempt++) { try { debuggerPort = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch {} if (!debuggerPort) await wait(100) }
  if (!debuggerPort) throw Error('Browser debugger unavailable')
  const target = (await fetch(`http://127.0.0.1:${debuggerPort}/json/list`).then(value => value.json())).find(value => value.type === 'page')
  socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  let sequence = 0; const pending = new Map()
  socket.addEventListener('message', event => { const message = JSON.parse(event.data), item = pending.get(message.id); if (!item) return; pending.delete(message.id); clearTimeout(item.timer); message.error ? item.reject(Error(message.error.message)) : item.resolve(message.result) })
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence, timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout ' + method)) }, 30000); pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result.value }
  for (let attempt = 0; attempt < 100 && !await evaluate('typeof window.gpuDiagnosticsRun==="function"'); attempt++) await wait(100)
  if (!await evaluate('typeof window.gpuDiagnosticsRun==="function"')) throw Error('GPU diagnostic host failed: ' + JSON.stringify(await evaluate('({href:location.href,title:document.title,errors:window.gpuDiagnosticErrors})')))
  const report = await evaluate('window.gpuDiagnosticsRun()')
  report.format = 'nova-gpu-diagnostics-owner-regression'; report.version = 1; report.generatedAt = new Date().toISOString(); report.browser = await send('Browser.getVersion'); report.sourceHashes = sourceHashes; report.boundary = boundary
  report.environment = 'Native Edge Windows x64 with explicitly selected SwiftShader software GPU. Actual WebGL query/fence handles and context-loss events are functional evidence only. Controlled unavailable-result/fence/capability tests do not measure hardware timing.'
  for (const [path, hash] of Object.entries(sourceHashes)) if (await digest(path) !== hash) throw Error('Owned sources changed during GPU diagnostic verification: ' + path)
  await writeFile(join(reportDir, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' })
  for (const check of report.checks) console.log(check.status.toUpperCase() + ' ' + check.name + (check.error ? '\n' + check.error : ''))
  if (report.status !== 'passed') process.exitCode = 1
  try { await send('Browser.close') } catch {}
} catch (error) { await writeFile(join(reportDir, 'failure.json'), JSON.stringify({ error: String(error.stack ?? error), sourceHashes, generatedAt: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx' }); throw error }
finally { socket?.close(); browser?.kill(); server?.httpServer?.closeAllConnections(); await server?.close() }
