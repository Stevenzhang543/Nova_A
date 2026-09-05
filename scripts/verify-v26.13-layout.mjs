import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Worker as NodeWorker } from 'node:worker_threads'
import { build } from 'vite'

const stage = dirname(dirname(fileURLToPath(import.meta.url)))
const root = existsSync(join(stage, 'package.json')) ? stage : resolve(stage, '../..'), temporary = await mkdtemp(join(tmpdir(), 'nova-v2613-layout-'))
const checks = [], benchmarks = []
const check = async (name, operation) => { await operation(); checks.push({ name, status: 'passed' }) }
const node = (uuid, type = 'operation', x = 0, y = 0, width = 224, height = 110) => ({ uuid, type, position: { x, y }, size: { width, height }, collapsed: false, pins: [{ uuid: `${uuid}:in`, key: 'input', direction: 'input', kind: 'data' }, { uuid: `${uuid}:out`, key: 'result', direction: 'output', kind: 'data' }] })
const edge = (uuid, from, to, reroutes) => ({ uuid, from: { nodeUuid: from, pinUuid: `${from}:out` }, to: { nodeUuid: to, pinUuid: `${to}:in` }, ...(reroutes ? { reroutes } : {}) })
const chain = count => { const nodes = Array.from({ length: count }, (_, index) => node(`n${String(index).padStart(5, '0')}`)); return { nodes, edges: nodes.slice(1).map((value, index) => edge(`e${index}`, nodes[index].uuid, value.uuid)) } }
function rectangles(input, result) { return input.nodes.map(value => ({ uuid: value.uuid, ...result.positions[value.uuid] ?? value.position, ...input.measuredBounds?.[value.uuid] ?? value.size })) }
function noOverlap(input, result) {
  const sorted = rectangles(input, result).sort((a, b) => a.x - b.x)
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]
    for (let j = i + 1; j < sorted.length && sorted[j].x < a.x + a.width; j++) {
      const b = sorted[j]
      assert.ok(!(a.y < b.y + b.height && a.y + a.height > b.y), `Overlapping nodes ${a.uuid}/${b.uuid}`)
    }
  }
}
try {
  await build({ configFile: false, root, logLevel: 'error', build: { ssr: true, outDir: temporary, emptyOutDir: false, rollupOptions: { input: { engine: join(stage, 'src/visual/graphLayoutEngine.ts'), service: join(stage, 'src/visual/graphLayoutService.ts'), worker: join(stage, 'src/visual/graphLayout.worker.ts') }, output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } } })
  const engine = await import(pathToFileURL(join(temporary, 'engine.mjs')).href), service = await import(pathToFileURL(join(temporary, 'service.mjs')).href)
  await check('measured bounds override saved estimates without mutating source or viewport', () => {
    const input = { ...chain(8), measuredBounds: { n00002: { width: 680, height: 720 }, n00005: { width: 420, height: 980 } }, viewport: { x: 7, y: 9, zoom: .63 } }, before = JSON.stringify(input)
    const result = engine.layoutGraph(input); noOverlap(input, result); assert.equal(result.metrics.measuredNodes, 2); assert.equal(JSON.stringify(input), before)
  })
  await check('node and edge input permutations do not change layout or routes', () => {
    const input = chain(22), original = engine.layoutGraph(input), reordered = engine.layoutGraph({ nodes: [...input.nodes].reverse(), edges: [...input.edges].reverse() })
    assert.deepEqual(original.positions, reordered.positions); assert.deepEqual(original.routes, reordered.routes); assert.deepEqual(original.regions, reordered.regions)
  })
  await check('typed ownership follows child-to-parent data edges and nests control regions', () => {
    const input = { nodes: [node('a', 'rhai.Literal'), node('b', 'rhai.If'), node('z', 'rhai.Program')], edges: [edge('literal-if', 'a', 'b'), edge('if-program', 'b', 'z')] }
    const result = engine.layoutGraph(input); noOverlap(input, result)
    assert.ok(result.positions.z.y < result.positions.b.y && result.positions.b.y < result.positions.a.y)
    const child = result.regions.find(region => region.nodeUuid === 'b'), parent = result.regions.find(region => region.nodeUuid === 'z')
    assert.equal(child.parentRegionUuid, 'z'); assert.ok(child.rect.x >= parent.rect.x && child.rect.y >= parent.rect.y && child.rect.x + child.rect.width <= parent.rect.x + parent.rect.width && child.rect.y + child.rect.height <= parent.rect.y + parent.rect.height)
  })
  await check('selected-only layout avoids fixed obstacles and never returns fixed node mutations', () => {
    const input = { nodes: [node('a', 'operation', 0, 0), node('b', 'operation', 0, 0), node('fixed', 'operation', 0, 0, 750, 800)], edges: [edge('a-b', 'a', 'b')], selectedNodeUuids: ['a', 'b'] }, before = JSON.stringify(input)
    const result = engine.layoutGraph(input); noOverlap(input, result); assert.equal(result.positions.fixed, undefined); assert.equal(result.metrics.fixedNodes, 1); assert.equal(JSON.stringify(input), before)
    assert.deepEqual(engine.layoutGraph({ ...input, selectedNodeUuids: [] }).positions, {})
  })
  await check('cycles and disconnected components retain every identity without overlap', () => {
    const input = { nodes: [node('a'), node('b'), node('c'), node('loose')], edges: [edge('ab', 'a', 'b'), edge('bc', 'b', 'c'), edge('ca', 'c', 'a')] }, result = engine.layoutGraph(input)
    assert.equal(Object.keys(result.positions).length, 4); noOverlap(input, result); assert.equal(result.metrics.routeFailures, 0)
  })
  await check('empty selection recalculates fixed-node routes and blocked diagnostics without moving any node', () => {
    const input = { nodes: [node('a', 'operation', 0, 0, 100, 100), node('z', 'operation', 700, 0, 100, 100), node('block', 'operation', 300, -30, 200, 180)], edges: [edge('az', 'a', 'z')], selectedNodeUuids: [], measuredPorts: { 'a:out': { x: 100, y: 70 }, 'z:in': { x: 0, y: 30 } } }, before = JSON.stringify(input)
    const result = engine.layoutGraph(input)
    assert.deepEqual(result.positions, {}); assert.equal(result.metrics.movedNodes, 0); assert.equal(result.metrics.fixedNodes, 3)
    assert.ok(result.routes.az?.length >= 4); assert.deepEqual(result.routes.az[0], { x: 100, y: 70 }); assert.deepEqual(result.routes.az.at(-1), { x: 700, y: 30 })
    assert.equal(engine.layoutRouteIntersectsNode(result.routes.az, { x: 300, y: -30, width: 200, height: 180 }), false)
    assert.equal(result.metrics.routeFailures, 0); assert.equal(JSON.stringify(input), before)
    const blocked = engine.layoutGraph({ ...input, edges: [edge('az', 'a', 'z', [{ x: 350, y: 50 }])] })
    assert.deepEqual(blocked.positions, {}); assert.equal(blocked.routes.az, undefined); assert.equal(blocked.metrics.routeFailures, 1); assert.ok(blocked.diagnostics.some(item => item.code === 'WIRE_ROUTE_BLOCKED' && item.edgeUuid === 'az'))
  })
  await check('every generated route in a branching graph avoids unrelated measured node rectangles', () => {
    const input = chain(100); for (let i = 3; i < 30; i += 3) input.edges.push(edge(`branch-${i}`, 'n00000', input.nodes[i].uuid))
    const result = engine.layoutGraph(input); noOverlap(input, result); assert.equal(result.metrics.routeFailures, 0)
    for (const link of input.edges) for (const rect of rectangles(input, result)) if (rect.uuid !== link.from.nodeUuid && rect.uuid !== link.to.nodeUuid) assert.equal(engine.layoutRouteIntersectsNode(result.routes[link.uuid], rect), false, `Wire ${link.uuid} crosses ${rect.uuid}`)
  })
  await check('routes avoid a fixed obstructing node and respect retained waypoints', () => {
    const input = { nodes: [node('a', 'operation', 0, 0, 100, 100), node('z', 'operation', 700, 0, 100, 100), node('block', 'operation', 300, -30, 200, 180)], edges: [edge('az', 'a', 'z', [{ x: 250, y: 250 }])], selectedNodeUuids: ['a'], origin: { x: 0, y: 0 } }, result = engine.layoutGraph(input)
    assert.equal(result.metrics.routeFailures, 0); assert.ok(result.routes.az.length >= 4)
    assert.equal(engine.layoutRouteIntersectsNode(result.routes.az, { x: 300, y: -30, width: 200, height: 180 }), false)
    assert.ok(result.routes.az.some((p, i, points) => p.x === 250 && p.y === 250 || i > 0 && p.y === 250 && points[i - 1].y === 250 && 250 >= Math.min(p.x, points[i - 1].x) && 250 <= Math.max(p.x, points[i - 1].x)))
  })
  await check('a blocked manual waypoint is diagnosed instead of drawing through an obstacle', () => {
    const input = { nodes: [node('a', 'operation', 0, 0, 100, 100), node('z', 'operation', 700, 0, 100, 100), node('block', 'operation', 300, -30, 200, 180)], edges: [edge('az', 'a', 'z', [{ x: 350, y: 50 }])], selectedNodeUuids: ['a'], origin: { x: 0, y: 0 } }
    const result = engine.layoutGraph(input); assert.equal(result.metrics.routeFailures, 1); assert.equal(result.routes.az, undefined); assert.ok(result.diagnostics.some(item => item.code === 'WIRE_ROUTE_BLOCKED'))
    assert.equal(engine.layoutGraph({ ...input, preserveReroutes: false }).metrics.routeFailures, 0)
  })
  await check('invalid sizes, duplicate identities, unknown selection and oversized input fail explicitly', () => {
    assert.throws(() => engine.layoutGraph({ nodes: [node('same'), node('same')], edges: [] }), /unique/)
    assert.throws(() => engine.layoutGraph({ ...chain(1), measuredBounds: { n00000: { width: NaN, height: 20 } } }), /finite/)
    assert.throws(() => engine.layoutGraph({ ...chain(1), selectedNodeUuids: ['missing'] }), /missing/)
    assert.throws(() => engine.layoutGraph(chain(10_001)), /10,000/)
  })
  await check('fallback snapshots input before asynchronous source changes', async () => {
    const input = chain(500), snapshot = structuredClone(input), promise = service.requestGraphLayout(input, { useWorker: false })
    input.nodes[100].size.height = 1800; input.nodes[100].position.x = 550
    const result = await promise; assert.deepEqual(result.positions, engine.layoutGraph(snapshot).positions)
  })
  await check('abort before and during chunked fallback returns AbortError and leaves input unchanged', async () => {
    const input = chain(1000), before = JSON.stringify(input), controller = new AbortController(); controller.abort()
    await assert.rejects(service.requestGraphLayout(input, { signal: controller.signal }), { name: 'AbortError' })
    const running = new AbortController()
    await assert.rejects(service.requestGraphLayout(input, { useWorker: false, signal: running.signal, onProgress: () => running.abort() }), { name: 'AbortError' })
    assert.equal(JSON.stringify(input), before)
  })
  await check('worker creation failure falls back to the same pure result', async () => {
    const input = chain(12), reasons = [], result = await service.requestGraphLayout(input, { workerFactory: () => { throw new Error('CSP denied worker') }, onFallback: reason => reasons.push(reason) })
    assert.deepEqual(result.positions, engine.layoutGraph(input).positions); assert.match(reasons[0], /creation failed/)
  })
  await check('worker cancellation terminates its request and ignores a late reply', async () => {
    let port, terminated = 0; const controller = new AbortController(), input = chain(3)
    const promise = service.requestGraphLayout(input, { signal: controller.signal, workerFactory: () => port = { postMessage: () => {}, terminate: () => terminated++, onmessage: null, onerror: null } })
    const callback = port.onmessage; controller.abort(); callback({ data: { id: 1, type: 'result', result: engine.layoutGraph(input) } })
    await assert.rejects(promise, { name: 'AbortError' }); assert.equal(terminated, 1)
  })
  await check('stalled worker times out into cancellable fallback', async () => {
    const input = chain(3); let terminated = 0, fallback = false
    const result = await service.requestGraphLayout(input, { workerTimeoutMs: 10, onFallback: () => fallback = true, workerFactory: () => ({ postMessage: () => {}, terminate: () => terminated++, onmessage: null, onerror: null }) })
    assert.equal(fallback, true); assert.equal(terminated, 1); assert.deepEqual(result.positions, engine.layoutGraph(input).positions)
  })
  await check('actual worker executes the production entry and agrees with fallback', async () => {
    const input = chain(30), workerUrl = pathToFileURL(join(temporary, 'worker.mjs')).href
    const result = await service.requestGraphLayout(input, { workerFactory: () => {
      const native = new NodeWorker(`const {parentPort}=require('node:worker_threads');globalThis.self={postMessage:value=>parentPort.postMessage(value),onmessage:null};import(${JSON.stringify(workerUrl)}).then(()=>parentPort.on('message',data=>self.onmessage({data})));`, { eval: true })
      const port = { postMessage: value => native.postMessage(value), terminate: () => { void native.terminate() }, onmessage: null, onerror: null }
      native.on('message', data => port.onmessage?.({ data })); native.on('error', error => port.onerror?.({ message: error.message })); return port
    } })
    assert.deepEqual(result.positions, engine.layoutGraph(input).positions); assert.deepEqual(result.routes, engine.layoutGraph(input).routes)
  })
  await check('browser bundling emits the actual worker and its layout engine', async () => {
    const output = join(temporary, 'browser')
    await build({ configFile: false, root, logLevel: 'error', build: { outDir: output, emptyOutDir: false, rollupOptions: { input: join(stage, 'src/visual/graphLayoutService.ts'), preserveEntrySignatures: 'strict' } } })
    const assets = await readdir(join(output, 'assets')), worker = assets.find(name => /^graphLayout\.worker-.*\.js$/.test(name))
    assert.ok(worker, 'The production build must contain an executable worker asset')
    assert.match(await readFile(join(output, 'assets', worker), 'utf8'), /MISSING_ENDPOINT|WIRE_ROUTE_BLOCKED/)
  })
  for (const count of [100, 1000, 10000]) await check(`${count}-node connected graph benchmark preserves every node and avoids overlap`, async () => {
    const input = chain(count), result = await service.requestGraphLayout(input, { useWorker: false }), begun = performance.now(); noOverlap(input, result)
    assert.equal(Object.keys(result.positions).length, count); assert.equal(result.metrics.routeFailures, 0)
    assert.ok(Object.values(result.positions).every(position => Math.abs(position.x) < 1_000_000 && Math.abs(position.y) < 1_000_000))
    benchmarks.push({ nodes: count, edges: input.edges.length, layoutMs: result.metrics.elapsedMs, geometryCheckMs: performance.now() - begun, routes: Object.keys(result.routes).length, foldedEdges: result.metrics.foldedEdges })
    assert.ok(result.metrics.elapsedMs < 30_000, 'Bounded layout exceeded30seconds')
  })
  const report = { format: 'nova-v26.13-layout-engine-verification', version: 1, release: '26.13', status: 'passed', generatedAt: new Date().toISOString(), context: 'Actual pure layout/routing engine, worker lifecycle and local graph timings. Browser editing and native assistive technology are separate evidence.', checks, benchmarks }
  const output = stage === root ? join(root, 'release-audits/v26.13-layout-engine.json') : join(stage, 'reports/layout-verification.json')
  await mkdir(dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
} finally { await rm(temporary, { recursive: true, force: true }) }
