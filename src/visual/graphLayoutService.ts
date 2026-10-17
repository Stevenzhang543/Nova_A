/** 图布局调度：复制响应式输入，以独占工作线程或可取消的主线程分片执行。 */
import { layoutGraphAsync, type GraphLayoutProgress, type GraphLayoutRequest, type GraphLayoutResult } from './graphLayoutEngine'

export interface GraphLayoutWorkerPort {
  postMessage(value: unknown): void
  terminate(): void
  onmessage: ((event: MessageEvent) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
}
export interface GraphLayoutServiceOptions {
  signal?: AbortSignal
  onProgress?: (progress: GraphLayoutProgress) => void
  useWorker?: boolean
  workerFactory?: () => GraphLayoutWorkerPort
  workerTimeoutMs?: number
  onFallback?: (reason: string) => void
}
/** 统一取消异常名称，供界面区分取消与布局失败。 */
function aborted(): Error { const error = new Error('Graph layout cancelled.'); error.name = 'AbortError'; return error }
/** 复制节点、连线、测量值和固定列表，避免把 Vue 代理或可变引用交给工作线程。 */
export function snapshotGraphLayoutRequest(request: GraphLayoutRequest): GraphLayoutRequest {
  if (request.nodes.length > 10_000 || request.edges.length > 20_000) throw new Error('Layout exceeds 10,000 nodes or 20,000 edges.')
  return {
    nodes: request.nodes.map(/* 拷贝节点几何与端口描述，排除响应式代理和无关编译数据。 */ node => ({ uuid: node.uuid, type: node.type, position: { ...node.position }, size: { ...node.size }, collapsed: node.collapsed, pins: node.pins?.map(/* 只保留布局所需的端口标识、顺序与方向。 */ pin => ({ uuid: pin.uuid, key: pin.key, kind: pin.kind, direction: pin.direction })) })),
    edges: request.edges.map(/* 复制连线端点与手动路径点，隔离异步计算期间的图编辑。 */ edge => ({ uuid: edge.uuid, from: { ...edge.from }, to: { ...edge.to }, ...(edge.reroutes ? { reroutes: edge.reroutes.map(/* 路径点使用独立对象，工作线程不能改动原图。 */ point => ({ ...point })) } : {}) })),
    ...(request.measuredBounds ? { measuredBounds: Object.fromEntries(Object.entries(request.measuredBounds).map(/* 按节点标识复制实测尺寸。 */ ([id, size]) => [id, { ...size }])) } : {}),
    ...(request.measuredPorts ? { measuredPorts: Object.fromEntries(Object.entries(request.measuredPorts).map(/* 按端口标识复制节点内的相对坐标。 */ ([id, point]) => [id, { ...point }])) } : {}),
    ...(request.selectedNodeUuids !== undefined ? { selectedNodeUuids: [...request.selectedNodeUuids] } : {}),
    ...(request.fixedNodeUuids !== undefined ? { fixedNodeUuids: [...request.fixedNodeUuids] } : {}),
    ...(request.origin ? { origin: { ...request.origin } } : {}), gap: request.gap, preserveReroutes: request.preserveReroutes
  }
}
/** 每次请求独占线程；完成、失败或取消时释放线程，旧响应不能完成后续请求。 */
export async function requestGraphLayout(request: GraphLayoutRequest, options: GraphLayoutServiceOptions = {}): Promise<GraphLayoutResult> {
  if (options.signal?.aborted) throw aborted()
  const input = snapshotGraphLayoutRequest(request)
  const fallback = /* 通知降级原因后运行可取消分片算法，保留同一输入快照。 */ (reason: string): Promise<GraphLayoutResult> => { options.onFallback?.(reason); return layoutGraphAsync(input, { signal: options.signal, onProgress: options.onProgress }) }
  if (options.useWorker === false || !options.workerFactory && typeof Worker === 'undefined') return fallback('Worker unavailable or disabled; using cancellable main-thread chunks.')
  let worker: GraphLayoutWorkerPort
  try { worker = options.workerFactory?.() ?? new Worker(new URL('./graphLayout.worker.ts', import.meta.url), { type: 'module' }) as unknown as GraphLayoutWorkerPort }
  catch (error) { return fallback(`Worker creation failed: ${String(error)}`) }
  const workerResult = await new Promise<{ result?: GraphLayoutResult; fallback?: string }> (/* 只允许一个终态，并在任何终态中清理线程与监听器。 */ (resolve, reject) => {
    let settled = false
    const cleanup = /* 清理超时、取消监听和线程，释放请求持有的资源。 */ (): void => { clearTimeout(timeout); options.signal?.removeEventListener('abort', cancel); worker.onmessage = null; worker.onerror = null; worker.terminate() }
    const finish = /* 幂等完成：迟到的消息不能覆盖已完成结果。 */ (value: { result?: GraphLayoutResult; fallback?: string }): void => { if (settled) return; settled = true; cleanup(); resolve(value) }
    const cancel = /* 取消属于拒绝结果，不能触发成功提交或自动降级。 */ (): void => { if (settled) return; settled = true; cleanup(); reject(aborted()) }
    const timeout = setTimeout(/* 超时后终止线程并请求主线程分片后备计算。 */ () => finish({ fallback: 'Worker did not respond before its deadline; using cancellable main-thread chunks.' }), Math.max(10, options.workerTimeoutMs ?? 30_000))
    worker.onmessage = /* 只接收当前请求的进度、结果或显式错误。 */ event => {
      if (settled || event.data?.id !== 1) return
      if (event.data.type === 'progress') options.onProgress?.(event.data.progress)
      else if (event.data.type === 'result') finish({ result: event.data.result })
      else if (event.data.type === 'error') { settled = true; cleanup(); reject(new Error(String(event.data.error))) }
    }
    worker.onerror = /* 线程故障走后备计算，错误原因留给诊断回调。 */ event => finish({ fallback: `Worker failed: ${event.message || 'unknown error'}` })
    options.signal?.addEventListener('abort', cancel, { once: true })
    if (options.signal?.aborted) { cancel(); return }
    try { worker.postMessage({ id: 1, request: input }) } catch (error) { finish({ fallback: `Worker message failed: ${String(error)}` }) }
  })
  if (options.signal?.aborted) throw aborted()
  return workerResult.result ?? fallback(workerResult.fallback ?? 'Worker returned no result.')
}
