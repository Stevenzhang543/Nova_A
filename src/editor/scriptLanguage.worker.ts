import { analyzeScript } from './scriptLanguage'

self.onmessage = (event: MessageEvent<{ id: number; source: string; apiVersion?: 1 | 2; revision?: number }>) => {
  self.postMessage({ id: event.data.id, analysis: analyzeScript(event.data.source, event.data.apiVersion ?? 2, event.data.revision ?? 0) })
}
