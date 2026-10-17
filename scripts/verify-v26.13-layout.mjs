/** 图布局回归：校验测量、碰撞、布线、取消、工作线程和大图性能，并保存可审计结果。 */
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
const check = /** 执行异步布局检查并记录通过结果。 */ async (name, operation) => { await operation(); checks.push({ name, status: 'passed' }) }
const node = /** 构造具有默认位置、尺寸和数据输入输出引脚的布局测试节点。 */ (uuid, type = 'operation', x = 0, y = 0, width = 224, height = 110) => ({ uuid, type, position: { x, y }, size: { width, height }, collapsed: false, pins: [{ uuid: `${uuid}:in`, key: 'input', direction: 'input', kind: 'data' }, { uuid: `${uuid}:out`, key: 'result', direction: 'output', kind: 'data' }] })
const edge = /** 构造测试节点之间的数据边，并按需附加手工转折点。 */ (uuid, from, to, reroutes) => ({ uuid, from: { nodeUuid: from, pinUuid: `${from}:out` }, to: { nodeUuid: to, pinUuid: `${to}:in` }, ...(reroutes ? { reroutes } : {}) })
const chain = /** 创建指定长度且标识补零的顺序节点链。 */ count => { const nodes = Array.from({ length: count }, /* 调用 node(`n${String(index).padStart(5, '0')}`) 并返回调用结果。 */ (_, index) => node(`n${String(index).padStart(5, '0')}`)); return { nodes, edges: nodes.slice(1).map(/* 调用 edge(`e${index}`, nodes[index].uuid, value.uuid) 并返回调用结果。 */ (value, index) => edge(`e${index}`, nodes[index].uuid, value.uuid)) } }
/** 合并布局输出位置和实测尺寸，构造节点矩形集合。 */ function rectangles(input, result) { return input.nodes.map(/** 为节点选择布局结果位置及实测尺寸，缺失时保留节点原值。 */ value => ({ uuid: value.uuid, ...result.positions[value.uuid] ?? value.position, ...input.measuredBounds?.[value.uuid] ?? value.size })) }
/** 按横坐标扫描节点矩形，断言横向候选之间不存在纵向交叠。 */ function noOverlap(input, result) {
  const sorted = rectangles(input, result).sort(/* 计算表达式 a.x - b.x 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a.x - b.x)
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]
    for (let j = i + 1; j < sorted.length && sorted[j].x < a.x + a.width; j++) {
      const b = sorted[j]
      assert.ok(!(a.y < b.y + b.height && a.y + a.height > b.y), `Overlapping nodes ${a.uuid}/${b.uuid}`)
    }
  }
}
try {
  await build({ configFile: false, root, logLevel: 'error', build: { ssr: true, outDir: temporary, emptyOutDir: false, rollupOptions: { input: { engine: join(stage, 'src/visual/graphLayoutEngine.ts'), measurements: join(stage, 'src/visual/graphMeasurements.ts'), service: join(stage, 'src/visual/graphLayoutService.ts'), worker: join(stage, 'src/visual/graphLayout.worker.ts') }, output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } } })
  const engine = await import(pathToFileURL(join(temporary, 'engine.mjs')).href), service = await import(pathToFileURL(join(temporary, 'service.mjs')).href)
  const {retainGraphMeasurements}=await import(pathToFileURL(join(temporary,'measurements.mjs')).href)
  // 缓存边界随当前图变化，不能把屏外节点误当成已删除节点。
  await check('measurement cache prunes deleted identities while retaining offscreen graph nodes',/** 验证测量缓存保留屏外有效节点、清理已删除节点且不修改输入缓存。 */ ()=>{
    const nodes=[node('visible'),node('offscreen')]
    const bounds={visible:{width:100,height:80},offscreen:{width:200,height:90},deleted:{width:100,height:100}}
    const ports={'visible:in':{x:0,y:20},'offscreen:out':{x:200,y:40},'deleted:in':{x:0,y:0}}
    const before=JSON.stringify({bounds,ports}),result=retainGraphMeasurements(nodes,bounds,ports)
    assert.equal(result.removed,2)
    assert.deepEqual(Object.keys(result.bounds),['visible','offscreen'])
    assert.deepEqual(Object.keys(result.ports),['visible:in','offscreen:out'])
    assert.equal(JSON.stringify({bounds,ports}),before)
    assert.deepEqual(retainGraphMeasurements([],bounds,ports),{bounds:{},ports:{},removed:6})
  })
  await check('measured bounds override saved estimates without mutating source or viewport', /** 验证实测大节点参与布局、结果无重叠且原输入不变。 */ () => {
    const input = { ...chain(8), measuredBounds: { n00002: { width: 680, height: 720 }, n00005: { width: 420, height: 980 } }, viewport: { x: 7, y: 9, zoom: .63 } }, before = JSON.stringify(input)
    const result = engine.layoutGraph(input); noOverlap(input, result); assert.equal(result.metrics.measuredNodes, 2); assert.equal(JSON.stringify(input), before)
  })
  // 固定节点是布局障碍；选择整理、工作线程快照及未知标识都必须遵守同一契约。
  await check('fixed positions survive selected layout and are copied for worker transport', /** 验证固定节点不被移动、快照隔离和非法固定标识拒绝，并覆盖全固定及全自由情况。 */ () => {
    const input = { ...chain(6), fixedNodeUuids: ['n00002'], selectedNodeUuids: ['n00000','n00001','n00002','n00003','n00004','n00005'] }
    input.nodes[2].position = { x: 70, y: 70 }
    const before = JSON.stringify(input), result = engine.layoutGraph(input)
    assert.equal(result.positions.n00002, undefined)
    assert.equal(result.metrics.fixedNodes, 1)
    noOverlap(input, result)
    assert.equal(JSON.stringify(input), before)
    const copied = service.snapshotGraphLayoutRequest(input)
    input.fixedNodeUuids.push('n00003')
    assert.deepEqual(copied.fixedNodeUuids, ['n00002'])
    assert.throws(/* 调用 engine.layoutGraph({ ...input, fixedNodeUuids: ['missing'] }) 并返回调用结果。 */ () => engine.layoutGraph({ ...input, fixedNodeUuids: ['missing'] }), /Fixed layout node is missing/)
    assert.equal(engine.layoutGraph({ ...input, fixedNodeUuids: [] }).metrics.movedNodes, 6)
    assert.equal(engine.layoutGraph({ ...input, fixedNodeUuids: input.nodes.map(/* 返回 node.uuid 的当前值。 */ node => node.uuid) }).metrics.movedNodes, 0)
  })
  await check('node and edge input permutations do not change layout or routes', /** 验证颠倒节点与边的输入顺序仍产生完全一致的布局结果。 */ () => {
    const input = chain(22), original = engine.layoutGraph(input), reordered = engine.layoutGraph({ nodes: [...input.nodes].reverse(), edges: [...input.edges].reverse() })
    assert.deepEqual(original.positions, reordered.positions); assert.deepEqual(original.routes, reordered.routes); assert.deepEqual(original.regions, reordered.regions)
  })
  await check('typed ownership follows child-to-parent data edges and nests control regions', /** 验证语法父节点位于子节点上方，嵌套区域具有正确父关系与包围范围。 */ () => {
    const input = { nodes: [node('a', 'rhai.Literal'), node('b', 'rhai.If'), node('z', 'rhai.Program')], edges: [edge('literal-if', 'a', 'b'), edge('if-program', 'b', 'z')] }
    const result = engine.layoutGraph(input); noOverlap(input, result)
    assert.ok(result.positions.z.y < result.positions.b.y && result.positions.b.y < result.positions.a.y)
    const child = result.regions.find(/* 比较 region.nodeUuid 与 'b'，返回严格相等的判断结果。 */ region => region.nodeUuid === 'b'), parent = result.regions.find(/* 比较 region.nodeUuid 与 'z'，返回严格相等的判断结果。 */ region => region.nodeUuid === 'z')
    assert.equal(child.parentRegionUuid, 'z'); assert.ok(child.rect.x >= parent.rect.x && child.rect.y >= parent.rect.y && child.rect.x + child.rect.width <= parent.rect.x + parent.rect.width && child.rect.y + child.rect.height <= parent.rect.y + parent.rect.height)
  })
  await check('selected-only layout avoids fixed obstacles and never returns fixed node mutations', /** 验证仅布局所选节点时避让未选大节点，不修改原图且空选择不移动节点。 */ () => {
    const input = { nodes: [node('a', 'operation', 0, 0), node('b', 'operation', 0, 0), node('fixed', 'operation', 0, 0, 750, 800)], edges: [edge('a-b', 'a', 'b')], selectedNodeUuids: ['a', 'b'] }, before = JSON.stringify(input)
    const result = engine.layoutGraph(input); noOverlap(input, result); assert.equal(result.positions.fixed, undefined); assert.equal(result.metrics.fixedNodes, 1); assert.equal(JSON.stringify(input), before)
    assert.deepEqual(engine.layoutGraph({ ...input, selectedNodeUuids: [] }).positions, {})
  })
  await check('cycles and disconnected components retain every identity without overlap', /** 验证循环连接和孤立节点都能完成无重叠布局且路由无失败。 */ () => {
    const input = { nodes: [node('a'), node('b'), node('c'), node('loose')], edges: [edge('ab', 'a', 'b'), edge('bc', 'b', 'c'), edge('ca', 'c', 'a')] }, result = engine.layoutGraph(input)
    assert.equal(Object.keys(result.positions).length, 4); noOverlap(input, result); assert.equal(result.metrics.routeFailures, 0)
  })
  await check('empty selection recalculates fixed-node routes and blocked diagnostics without moving any node', /** 验证仅重新布线时固定节点不动、端点采用实测位置并避障，受阻手工点产生明确诊断。 */ () => {
    const input = { nodes: [node('a', 'operation', 0, 0, 100, 100), node('z', 'operation', 700, 0, 100, 100), node('block', 'operation', 300, -30, 200, 180)], edges: [edge('az', 'a', 'z')], selectedNodeUuids: [], measuredPorts: { 'a:out': { x: 100, y: 70 }, 'z:in': { x: 0, y: 30 } } }, before = JSON.stringify(input)
    const result = engine.layoutGraph(input)
    assert.deepEqual(result.positions, {}); assert.equal(result.metrics.movedNodes, 0); assert.equal(result.metrics.fixedNodes, 3)
    assert.ok(result.routes.az?.length >= 4); assert.deepEqual(result.routes.az[0], { x: 100, y: 70 }); assert.deepEqual(result.routes.az.at(-1), { x: 700, y: 30 })
    assert.equal(engine.layoutRouteIntersectsNode(result.routes.az, { x: 300, y: -30, width: 200, height: 180 }), false)
    assert.equal(result.metrics.routeFailures, 0); assert.equal(JSON.stringify(input), before)
    const blocked = engine.layoutGraph({ ...input, edges: [edge('az', 'a', 'z', [{ x: 350, y: 50 }])] })
    assert.deepEqual(blocked.positions, {}); assert.equal(blocked.routes.az, undefined); assert.equal(blocked.metrics.routeFailures, 1); assert.ok(blocked.diagnostics.some(/* 先计算 item.code === 'WIRE_ROUTE_BLOCKED'；仅当其为真值时求右侧 item.edgeUuid === 'az'，返回短路求值结果。 */ item => item.code === 'WIRE_ROUTE_BLOCKED' && item.edgeUuid === 'az'))
  })
  await check('every generated route in a branching graph avoids unrelated measured node rectangles', /** 验证大链及分支图无重叠，所有边路由均避开非端点节点。 */ () => {
    const input = chain(100); for (let i = 3; i < 30; i += 3) input.edges.push(edge(`branch-${i}`, 'n00000', input.nodes[i].uuid))
    const result = engine.layoutGraph(input); noOverlap(input, result); assert.equal(result.metrics.routeFailures, 0)
    for (const link of input.edges) for (const rect of rectangles(input, result)) if (rect.uuid !== link.from.nodeUuid && rect.uuid !== link.to.nodeUuid) assert.equal(engine.layoutRouteIntersectsNode(result.routes[link.uuid], rect), false, `Wire ${link.uuid} crosses ${rect.uuid}`)
  })
  await check('routes avoid a fixed obstructing node and respect retained waypoints', /** 验证布局后的避障路由仍经过指定手工转折点。 */ () => {
    const input = { nodes: [node('a', 'operation', 0, 0, 100, 100), node('z', 'operation', 700, 0, 100, 100), node('block', 'operation', 300, -30, 200, 180)], edges: [edge('az', 'a', 'z', [{ x: 250, y: 250 }])], selectedNodeUuids: ['a'], origin: { x: 0, y: 0 } }, result = engine.layoutGraph(input)
    assert.equal(result.metrics.routeFailures, 0); assert.ok(result.routes.az.length >= 4)
    assert.equal(engine.layoutRouteIntersectsNode(result.routes.az, { x: 300, y: -30, width: 200, height: 180 }), false)
    assert.ok(result.routes.az.some(/** 判断路由顶点或水平线段是否经过指定手工坐标。 */ (p, i, points) => p.x === 250 && p.y === 250 || i > 0 && p.y === 250 && points[i - 1].y === 250 && 250 >= Math.min(p.x, points[i - 1].x) && 250 <= Math.max(p.x, points[i - 1].x)))
  })
  await check('a blocked manual waypoint is diagnosed instead of drawing through an obstacle', /** 验证位于障碍内的保留转折点导致路由失败，关闭保留后可重新布线。 */ () => {
    const input = { nodes: [node('a', 'operation', 0, 0, 100, 100), node('z', 'operation', 700, 0, 100, 100), node('block', 'operation', 300, -30, 200, 180)], edges: [edge('az', 'a', 'z', [{ x: 350, y: 50 }])], selectedNodeUuids: ['a'], origin: { x: 0, y: 0 } }
    const result = engine.layoutGraph(input); assert.equal(result.metrics.routeFailures, 1); assert.equal(result.routes.az, undefined); assert.ok(result.diagnostics.some(/* 比较 item.code 与 'WIRE_ROUTE_BLOCKED'，返回严格相等的判断结果。 */ item => item.code === 'WIRE_ROUTE_BLOCKED'))
    assert.equal(engine.layoutGraph({ ...input, preserveReroutes: false }).metrics.routeFailures, 0)
  })
  await check('invalid sizes, duplicate identities, unknown selection and oversized input fail explicitly', /** 验证重复节点、无效测量、缺失选择以及超量节点输入被拒绝。 */ () => {
    assert.throws(/* 调用 engine.layoutGraph({ nodes: [node('same'), node('same')], edges: [] }) 并返回调用结果。 */ () => engine.layoutGraph({ nodes: [node('same'), node('same')], edges: [] }), /unique/)
    assert.throws(/* 调用 engine.layoutGraph({ ...chain(1), measuredBounds: { n00000: { width: NaN, height: 20 } } }) 并返回调用结果。 */ () => engine.layoutGraph({ ...chain(1), measuredBounds: { n00000: { width: NaN, height: 20 } } }), /finite/)
    assert.throws(/* 调用 engine.layoutGraph({ ...chain(1), selectedNodeUuids: ['missing'] }) 并返回调用结果。 */ () => engine.layoutGraph({ ...chain(1), selectedNodeUuids: ['missing'] }), /missing/)
    assert.throws(/* 调用 engine.layoutGraph(chain(10_001)) 并返回调用结果。 */ () => engine.layoutGraph(chain(10_001)), /10,000/)
  })
  await check('fallback snapshots input before asynchronous source changes', /** 验证异步布局使用提交时快照，后续修改输入不影响结果。 */ async () => {
    const input = chain(500), snapshot = structuredClone(input), promise = service.requestGraphLayout(input, { useWorker: false })
    input.nodes[100].size.height = 1800; input.nodes[100].position.x = 550
    const result = await promise; assert.deepEqual(result.positions, engine.layoutGraph(snapshot).positions)
  })
  await check('abort before and during chunked fallback returns AbortError and leaves input unchanged', /** 验证启动前及运行中取消均抛出中止错误，原输入保持不变。 */ async () => {
    const input = chain(1000), before = JSON.stringify(input), controller = new AbortController(); controller.abort()
    await assert.rejects(service.requestGraphLayout(input, { signal: controller.signal }), { name: 'AbortError' })
    const running = new AbortController()
    await assert.rejects(service.requestGraphLayout(input, { useWorker: false, signal: running.signal, onProgress: /* 调用 running.abort() 并返回调用结果。 */ () => running.abort() }), { name: 'AbortError' })
    assert.equal(JSON.stringify(input), before)
  })
  await check('worker creation failure falls back to the same pure result', /** 验证工作线程创建失败时记录原因并回退到一致的主线程布局。 */ async () => {
    const input = chain(12), reasons = [], result = await service.requestGraphLayout(input, { workerFactory: /** 模拟内容安全策略拒绝创建工作线程。 */ () => { throw new Error('CSP denied worker') }, onFallback: /* 调用 reasons.push(reason) 并返回调用结果。 */ reason => reasons.push(reason) })
    assert.deepEqual(result.positions, engine.layoutGraph(input).positions); assert.match(reasons[0], /creation failed/)
  })
  await check('worker cancellation terminates its request and ignores a late reply', /** 验证取消后忽略迟到的线程结果，任务拒绝且线程仅终止一次。 */ async () => {
    let port, terminated = 0; const controller = new AbortController(), input = chain(3)
    const promise = service.requestGraphLayout(input, { signal: controller.signal, workerFactory: /** 创建可记录终止次数且不主动响应的受控工作线程端口。 */ () => port = { postMessage: /** 提供不执行额外操作的空回调，用于测试接口占位。 */ () => {}, terminate: /** 递增测试工作线程终止次数。 */ () => terminated++, onmessage: null, onerror: null } })
    const callback = port.onmessage; controller.abort(); callback({ data: { id: 1, type: 'result', result: engine.layoutGraph(input) } })
    await assert.rejects(promise, { name: 'AbortError' }); assert.equal(terminated, 1)
  })
  await check('stalled worker times out into cancellable fallback', /** 验证线程超时后终止并回退，最终布局与同步计算一致。 */ async () => {
    const input = chain(3); let terminated = 0, fallback = false
    const result = await service.requestGraphLayout(input, { workerTimeoutMs: 10, onFallback: /** 标记测试已触发回退。 */ () => fallback = true, workerFactory: /** 创建不返回结果的工作线程替身以触发超时路径。 */ () => ({ postMessage: /** 提供不执行额外操作的空回调，用于测试接口占位。 */ () => {}, terminate: /** 递增测试工作线程终止次数。 */ () => terminated++, onmessage: null, onerror: null }) })
    assert.equal(fallback, true); assert.equal(terminated, 1); assert.deepEqual(result.positions, engine.layoutGraph(input).positions)
  })
  await check('actual worker executes the production entry and agrees with fallback', /** 使用真实Node工作线程适配浏览器协议，验证位置和路由与同步结果一致。 */ async () => {
    const input = chain(30), workerUrl = pathToFileURL(join(temporary, 'worker.mjs')).href
    const result = await service.requestGraphLayout(input, { workerFactory: /** 启动布局工作线程并将Node消息和错误转发到浏览器式端口接口。 */ () => {
      const native = new NodeWorker(`const {parentPort}=require('node:worker_threads');globalThis.self={postMessage:value=>parentPort.postMessage(value),onmessage:null};import(${JSON.stringify(workerUrl)}).then(()=>parentPort.on('message',data=>self.onmessage({data})));`, { eval: true })
      const port = { postMessage: /* 调用 native.postMessage(value) 并返回调用结果。 */ value => native.postMessage(value), terminate: /** 请求终止原生测试工作线程，不等待其返回任务。 */ () => { void native.terminate() }, onmessage: null, onerror: null }
      native.on('message', /* 调用 port.onmessage?.({ data }) 并返回调用结果。 */ data => port.onmessage?.({ data })); native.on('error', /* 调用 port.onerror?.({ message: error.message }) 并返回调用结果。 */ error => port.onerror?.({ message: error.message })); return port
    } })
    assert.deepEqual(result.positions, engine.layoutGraph(input).positions); assert.deepEqual(result.routes, engine.layoutGraph(input).routes)
  })
  await check('browser bundling emits the actual worker and its layout engine', /** 构建布局服务测试入口，验证生产产物包含可执行的工作线程资源。 */ async () => {
    const output = join(temporary, 'browser')
    await build({ configFile: false, root, logLevel: 'error', build: { outDir: output, emptyOutDir: false, rollupOptions: { input: join(stage, 'src/visual/graphLayoutService.ts'), preserveEntrySignatures: 'strict' } } })
    const assets = await readdir(join(output, 'assets')), worker = assets.find(/* 调用 /^graphLayout\.worker-.*\.js$/.test(name) 并返回调用结果。 */ name => /^graphLayout\.worker-.*\.js$/.test(name))
    assert.ok(worker, 'The production build must contain an executable worker asset')
    assert.match(await readFile(join(output, 'assets', worker), 'utf8'), /MISSING_ENDPOINT|WIRE_ROUTE_BLOCKED/)
  })
  for (const count of [100, 1000, 10000]) await check(`${count}-node connected graph benchmark preserves every node and avoids overlap`, /** 测量指定规模图布局，验证无重叠、边界受控、路由完整且耗时在限额内。 */ async () => {
    const input = chain(count), result = await service.requestGraphLayout(input, { useWorker: false }), begun = performance.now(); noOverlap(input, result)
    assert.equal(Object.keys(result.positions).length, count); assert.equal(result.metrics.routeFailures, 0)
    assert.ok(Object.values(result.positions).every(/* 先计算 Math.abs(position.x) < 1_000_000；仅当其为真值时求右侧 Math.abs(position.y) < 1_000_000，返回短路求值结果。 */ position => Math.abs(position.x) < 1_000_000 && Math.abs(position.y) < 1_000_000))
    benchmarks.push({ nodes: count, edges: input.edges.length, layoutMs: result.metrics.elapsedMs, geometryCheckMs: performance.now() - begun, routes: Object.keys(result.routes).length, foldedEdges: result.metrics.foldedEdges })
    assert.ok(result.metrics.elapsedMs < 30_000, 'Bounded layout exceeded30seconds')
  })
  const report = { format: 'nova-v26.13-layout-engine-verification', version: 1, release: '26.13', status: 'passed', generatedAt: new Date().toISOString(), context: 'Actual pure layout/routing engine, worker lifecycle and local graph timings. Browser editing and native assistive technology are separate evidence.', checks, benchmarks }
  const output = stage === root ? join(root, 'release-audits/v26.13-layout-engine.json') : join(stage, 'reports/layout-verification.json')
  await mkdir(dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
} finally { await rm(temporary, { recursive: true, force: true }) }
