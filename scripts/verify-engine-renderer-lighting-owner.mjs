/** Separate source/compiled boundary gate and strict actual Canvas owner regressions. */
import { build, createServer } from 'vite'
import ts from 'typescript'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'

const root = process.cwd(), option = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3)
const reportDir = resolve(option('report-dir') ?? 'release-audits/engine-renderer-lighting-owner')
const baselineSource = resolve(option('baseline-source') ?? 'release-audits/engine-renderer-lighting-owner-slice-20261006/src__renderer__lighting2d.ts.before')
const baselineId = resolve('src/renderer/__lightingOwnerBefore.ts').replaceAll('\\', '/')
const beforeText = await readFile(baselineSource, 'utf8'), digest = async path => createHash('sha256').update(await readFile(path)).digest('hex')
const sourceFiles = ['src/renderer/lighting2d.ts', 'src/renderer/LightingEnvironment.ts', 'src/renderer/SceneRendererEnvironment.ts', 'src/renderer/sceneRenderer.ts', 'src/renderer/textureContent.ts', 'src/renderer/RendererEnvironment.ts', 'src/renderer/renderSettings.ts', 'src/renderer/renderSettingsSchema.ts', 'src/world/Connection.ts', 'src/world/components.ts', 'src/world/hierarchy.ts', 'src/assets/AssetDatabase.ts', 'src/assets/types.ts', 'src/editor/rendererAdapter.ts', 'src/components/WorldCanvas.vue', 'scripts/verify-engine-renderer-lighting-owner.mjs', 'scripts/verify-engine-renderer-lighting-owner-cases.mjs', baselineSource]
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path, await digest(path)])))
await mkdir(reportDir, { recursive: true })
const beforePlugin = () => ({ name: 'lighting-before-source', enforce: 'pre', resolveId(source) { if (source.replaceAll('\\', '/').endsWith('__lightingOwnerBefore.ts')) return baselineId }, load(id) { if (id.replaceAll('\\', '/') === baselineId) return beforeText } })
const forbidden = path => /^(?:src\/(?:editor|store|components|layout|ui)\/)|src\/assets\/(?:AssetDatabase|importPipeline)\.|node_modules\/.*(?:vue|pinia|tauri)|src\/renderer\/(?:renderSettings|capabilities|renderGraph)\.ts$/.test(path)
const graphs = []
let standalone
for (const entry of [baselineId, resolve('src/renderer/lighting2d.ts')]) {
  const inputs = new Set(), edges = []
  const result = await build({ configFile: false, root, logLevel: 'warn', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [beforePlugin(), { name: 'lighting-real-graph', moduleParsed(module) { inputs.add(module.id); edges.push({ id: module.id, imports: module.importedIds }) } }], build: { write: false, target: 'es2022', minify: 'esbuild', lib: { entry, formats: ['es'], fileName: 'lighting' } } })
  const sourceInputs = [...inputs].filter(path => !path.startsWith('\0')).map(path => relative(root, path).replaceAll('\\', '/')).sort()
  const violations = sourceInputs.filter(forbidden)
  const chunks = (Array.isArray(result) ? result.flatMap(value => value.output) : result.output).filter(value => value.type === 'chunk')
  if (chunks.length !== 1) throw Error('Expected one standalone lighting chunk')
  const code = chunks[0].code, before = entry === baselineId
  graphs.push({ entry: before ? 'saved-original-lighting' : 'src/renderer/lighting2d.ts', compiledModules: sourceInputs.length, sourceInputs, violations, edges, bytes: Buffer.byteLength(code), sha256: createHash('sha256').update(code).digest('hex') })
  await writeFile(join(reportDir, before ? 'before-lighting.js' : 'pure-lighting.js'), code, { flag: 'wx' })
  if (!before) standalone = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
}
const config = ts.readConfigFile(resolve('tsconfig.json'), ts.sys.readFile), options = ts.parseJsonConfigFileContent(config.config, ts.sys, root).options
const graph = new Map(), pendingSources = [resolve('src/renderer/lighting2d.ts')], sourceViolations = [], unresolved = []
for (let cursor = 0; cursor < pendingSources.length; cursor++) {
  const path = pendingSources[cursor]; if (graph.has(path)) continue
  const text = await readFile(path, 'utf8'), file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true), refs = []
  const add = (value, kind) => { if (value && ts.isStringLiteralLike(value)) refs.push({ specifier: value.text, kind }) }
  const visit = node => { if (ts.isImportDeclaration(node)) add(node.moduleSpecifier, node.importClause?.isTypeOnly ? 'type-import' : 'import'); if (ts.isExportDeclaration(node)) add(node.moduleSpecifier, node.isTypeOnly ? 'type-export' : 'export'); if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) add(node.argument.literal, 'import-type'); if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) add(node.arguments[0], 'dynamic-import'); ts.forEachChild(node, visit) }
  visit(file)
  const dependencies = []
  for (const reference of refs) {
    const resolved = ts.resolveModuleName(reference.specifier, path, options, ts.sys).resolvedModule, target = resolved?.resolvedFileName, id = target ? relative(root, target).replaceAll('\\', '/') : reference.specifier
    dependencies.push({ ...reference, target: id })
    if (forbidden(id) || /^(?:vue|@vue|pinia|@tauri-apps)(?:\/|$)/.test(reference.specifier)) { sourceViolations.push({ from: relative(root, path).replaceAll('\\', '/'), ...reference, target: id }); continue }
    if (!target && reference.specifier.startsWith('.')) unresolved.push({ from: path, ...reference })
    else if (target && id.startsWith('src/')) pendingSources.push(resolve(target))
  }
  graph.set(path, { path: relative(root, path).replaceAll('\\', '/'), sha256: await digest(path), dependencies })
}
let drawCalls = 0
const context = new Proxy({}, { get() { return () => { drawCalls++ } } }), absent = []
for (const [name, args] of [['renderLighting2D', [context, [], {}]], ['renderDebugView2D', [context, [], {}]], ['renderPostProcessOverlay', [context, 128, 96]], ['worldPostProcessFilter', []]]) {
  let failure = ''; try { standalone[name](...args) } catch (error) { failure = String(error) }
  absent.push({ name, failure, status: failure.includes('LIGHTING_ENVIRONMENT_REQUIRED') && drawCalls === 0 ? 'passed' : 'failed' })
}
const boundary = { format: 'nova-lighting-pure-owner-boundary', version: 1, generatedAt: new Date().toISOString(), graphs, sourceGraph: [...graph.values()], sourceViolations, unresolved, absent, status: graphs[0].violations.length > 0 && graphs[1].violations.length === 0 && sourceViolations.length === 0 && unresolved.length === 0 && absent.every(value => value.status === 'passed') ? 'passed' : 'failed', scope: 'Real compiled production and source/type import graphs for lighting entry, with strict absent-service behavior. Package/project exports, whole Runtime/Player and DOM-free Worker execution remain separate requirements.' }
await writeFile(join(reportDir, 'boundary.json'), JSON.stringify(boundary, null, 2) + '\n', { flag: 'wx' })
console.log(`${boundary.status.toUpperCase()} lighting compiled old=${graphs[0].compiledModules}/${graphs[0].violations.length} forbidden, new=${graphs[1].compiledModules}/${graphs[1].violations.length}; source including types=${graph.size}/${sourceViolations.length}`)
if (boundary.status !== 'passed') { process.exitCode = 1; console.error(JSON.stringify({ sourceViolations, unresolved })); throw Error('Lighting pure owner boundary failed') }

let server, browser, socket
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
try {
  const profile = await mkdtemp(join(tmpdir(), 'nova-lighting-owner-'))
  server = await createServer({ configFile: false, root, cacheDir: join(profile, 'vite'), logLevel: 'error', server: { host: '127.0.0.1', port: 0, watch: null, hmr: false }, plugins: [beforePlugin(), { name: 'lighting-test-host', configureServer(server) { server.middlewares.use((request, response, next) => { if (request.url !== '/lighting-owner.html') return next(); response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><title>Nova Lighting Owner</title><script>window.lightingErrors=[];addEventListener("error",e=>lightingErrors.push(String(e.error?.stack??e.message)));</script><script type="module">import {lightingOwnerCases} from "/scripts/verify-engine-renderer-lighting-owner-cases.mjs";window.lightingOwnerRun=lightingOwnerCases;</script>') }) } }] })
  await server.listen(); const port = server.httpServer.address().port
  const executable = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
  if (!executable) throw Error('Actual native browser unavailable')
  browser = spawn(executable, ['--headless=new', '--no-first-run', '--disable-extensions', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `http://127.0.0.1:${port}/lighting-owner.html`], { stdio: 'ignore', windowsHide: true })
  let debuggerPort
  for (let attempt = 0; attempt < 200 && !debuggerPort; attempt++) { try { debuggerPort = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch {} if (!debuggerPort) await wait(100) }
  if (!debuggerPort) throw Error('Browser debugger unavailable')
  const target = (await fetch(`http://127.0.0.1:${debuggerPort}/json/list`).then(value => value.json())).find(value => value.type === 'page')
  socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  let sequence = 0; const pending = new Map()
  socket.addEventListener('message', event => { const message = JSON.parse(event.data), item = pending.get(message.id); if (!item) return; pending.delete(message.id); clearTimeout(item.timer); message.error ? item.reject(Error(message.error.message)) : item.resolve(message.result) })
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence, timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout ' + method)) }, 90000); pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result.value }
  for (let attempt = 0; attempt < 100 && !await evaluate('typeof window.lightingOwnerRun==="function"'); attempt++) await wait(100)
  if (!await evaluate('typeof window.lightingOwnerRun==="function"')) throw Error('Lighting host failed: ' + JSON.stringify(await evaluate('({href:location.href,title:document.title,body:document.body?.innerText.slice(0,500),errors:window.lightingErrors})')))
  const report = await evaluate('window.lightingOwnerRun()')
  report.format = 'nova-lighting-pure-owner-actual-regression'; report.version = 1; report.generatedAt = new Date().toISOString(); report.browser = await send('Browser.getVersion'); report.sourceHashes = sourceHashes; report.boundary = { modules: graphs[1].compiledModules, sourceModules: graph.size, violations: 0 }; report.environment = 'Windows x64 headless native Edge; Canvas2D actual pixels. Explicit SwiftShader launch is functional evidence only, not hardware GPU performance. Test host uses Vite transforms; optimized compiled boundary tested separately.'
  for (const [path, hash] of Object.entries(sourceHashes)) if (await digest(path) !== hash) throw Error('Sources changed during Lighting verification: ' + path)
  for (const capture of report.captures) { capture.file = capture.name + '.png'; await writeFile(join(reportDir, capture.file), Buffer.from(capture.data.split(',')[1], 'base64'), { flag: 'wx' }); delete capture.data }
  await writeFile(join(reportDir, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' })
  for (const check of report.checks) console.log(check.status.toUpperCase() + ' ' + check.name + (check.error ? '\n' + check.error : ''))
  if (report.status !== 'passed') process.exitCode = 1
  try { await send('Browser.close') } catch {}
} catch (error) { await writeFile(join(reportDir, 'failure.json'), JSON.stringify({ error: String(error.stack ?? error), sourceHashes, generatedAt: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx' }); throw error }
finally { socket?.close(); browser?.kill(); server?.httpServer?.closeAllConnections(); await server?.close() }
