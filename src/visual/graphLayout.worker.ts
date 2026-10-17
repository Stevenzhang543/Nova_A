/** 图布局工作线程入口：回传请求标识、进度与结果，错误转为消息交给主线程处理。 */
import { layoutGraphAsync, type GraphLayoutRequest } from './graphLayoutEngine'

const workerScope = self as unknown as { postMessage(value: unknown): void; onmessage: ((event: MessageEvent<{ id: number; request: GraphLayoutRequest }>) => void) | null }
workerScope.onmessage = /* 每条请求只使用消息携带的独立布局快照。 */ event => {
  const { id, request } = event.data
  void layoutGraphAsync(request, { onProgress: /* 把分片进度绑定到当前请求，供主线程过滤迟到消息。 */ progress => workerScope.postMessage({ id, type: 'progress', progress }) }).then(
    /* 返回完整几何结果，由主线程核对文档版本后决定是否应用。 */ result => workerScope.postMessage({ id, type: 'result', result }),
    /* 序列化异常文本，避免跨线程传递不可克隆的错误对象。 */ error => workerScope.postMessage({ id, type: 'error', error: error instanceof Error ? error.message : String(error) })
  )
}
