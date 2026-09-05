import { layoutGraphAsync, type GraphLayoutRequest } from './graphLayoutEngine'

const workerScope = self as unknown as { postMessage(value: unknown): void; onmessage: ((event: MessageEvent<{ id: number; request: GraphLayoutRequest }>) => void) | null }
workerScope.onmessage = event => {
  const { id, request } = event.data
  void layoutGraphAsync(request, { onProgress: progress => workerScope.postMessage({ id, type: 'progress', progress }) }).then(
    result => workerScope.postMessage({ id, type: 'result', result }),
    error => workerScope.postMessage({ id, type: 'error', error: error instanceof Error ? error.message : String(error) })
  )
}
