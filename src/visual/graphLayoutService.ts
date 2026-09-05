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
function aborted(): Error { const error = new Error('Graph layout cancelled.'); error.name = 'AbortError'; return error }
/** Copies the structural input instead of attempting to structuredClone Vue proxies. */
export function snapshotGraphLayoutRequest(request: GraphLayoutRequest): GraphLayoutRequest {
  if (request.nodes.length > 10_000 || request.edges.length > 20_000) throw new Error('Layout exceeds 10,000 nodes or 20,000 edges.')
  return {
    nodes: request.nodes.map(node => ({ uuid: node.uuid, type: node.type, position: { ...node.position }, size: { ...node.size }, collapsed: node.collapsed, pins: node.pins?.map(pin => ({ uuid: pin.uuid, key: pin.key, kind: pin.kind, direction: pin.direction })) })),
    edges: request.edges.map(edge => ({ uuid: edge.uuid, from: { ...edge.from }, to: { ...edge.to }, ...(edge.reroutes ? { reroutes: edge.reroutes.map(point => ({ ...point })) } : {}) })),
    ...(request.measuredBounds ? { measuredBounds: Object.fromEntries(Object.entries(request.measuredBounds).map(([id, size]) => [id, { ...size }])) } : {}),
    ...(request.measuredPorts ? { measuredPorts: Object.fromEntries(Object.entries(request.measuredPorts).map(([id, point]) => [id, { ...point }])) } : {}),
    ...(request.selectedNodeUuids !== undefined ? { selectedNodeUuids: [...request.selectedNodeUuids] } : {}),
    ...(request.origin ? { origin: { ...request.origin } } : {}), gap: request.gap, preserveReroutes: request.preserveReroutes
  }
}
/** One worker owns one request; cancellation terminates it, so stale replies cannot settle a later request. */
export async function requestGraphLayout(request: GraphLayoutRequest, options: GraphLayoutServiceOptions = {}): Promise<GraphLayoutResult> {
  if (options.signal?.aborted) throw aborted()
  const input = snapshotGraphLayoutRequest(request)
  const fallback = (reason: string): Promise<GraphLayoutResult> => { options.onFallback?.(reason); return layoutGraphAsync(input, { signal: options.signal, onProgress: options.onProgress }) }
  if (options.useWorker === false || !options.workerFactory && typeof Worker === 'undefined') return fallback('Worker unavailable or disabled; using cancellable main-thread chunks.')
  let worker: GraphLayoutWorkerPort
  try { worker = options.workerFactory?.() ?? new Worker(new URL('./graphLayout.worker.ts', import.meta.url), { type: 'module' }) as unknown as GraphLayoutWorkerPort }
  catch (error) { return fallback(`Worker creation failed: ${String(error)}`) }
  const workerResult = await new Promise<{ result?: GraphLayoutResult; fallback?: string }>((resolve, reject) => {
    let settled = false
    const cleanup = (): void => { clearTimeout(timeout); options.signal?.removeEventListener('abort', cancel); worker.onmessage = null; worker.onerror = null; worker.terminate() }
    const finish = (value: { result?: GraphLayoutResult; fallback?: string }): void => { if (settled) return; settled = true; cleanup(); resolve(value) }
    const cancel = (): void => { if (settled) return; settled = true; cleanup(); reject(aborted()) }
    const timeout = setTimeout(() => finish({ fallback: 'Worker did not respond before its deadline; using cancellable main-thread chunks.' }), Math.max(10, options.workerTimeoutMs ?? 30_000))
    worker.onmessage = event => {
      if (settled || event.data?.id !== 1) return
      if (event.data.type === 'progress') options.onProgress?.(event.data.progress)
      else if (event.data.type === 'result') finish({ result: event.data.result })
      else if (event.data.type === 'error') { settled = true; cleanup(); reject(new Error(String(event.data.error))) }
    }
    worker.onerror = event => finish({ fallback: `Worker failed: ${event.message || 'unknown error'}` })
    options.signal?.addEventListener('abort', cancel, { once: true })
    if (options.signal?.aborted) { cancel(); return }
    try { worker.postMessage({ id: 1, request: input }) } catch (error) { finish({ fallback: `Worker message failed: ${String(error)}` }) }
  })
  if (options.signal?.aborted) throw aborted()
  return workerResult.result ?? fallback(workerResult.fallback ?? 'Worker returned no result.')
}
