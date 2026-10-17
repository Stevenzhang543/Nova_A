/** 脚本语言服务工作线程入口：处理协议请求并回传分析结果。 */
import { analyzeScript } from './scriptLanguage'

self.onmessage = /** 执行时调用 self.postMessage({ id: event.data.id, analysis: analyzeScript(event.data.source, event.data.apiVersion ?? 2, event.data.revision ?? 0,event.data.externalFunctions) })；不显式返回调用结果。 */ (event: MessageEvent<{ id: number; source: string; apiVersion?: 1 | 2; revision?: number; externalFunctions?: string[] }>) => {
  self.postMessage({ id: event.data.id, analysis: analyzeScript(event.data.source, event.data.apiVersion ?? 2, event.data.revision ?? 0,event.data.externalFunctions) })
}
