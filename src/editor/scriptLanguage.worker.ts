import { analyzeScript } from './scriptLanguage'

self.onmessage = (event: MessageEvent<{ id: number; source: string }>) => {
  self.postMessage({ id: event.data.id, analysis: analyzeScript(event.data.source) })
}
