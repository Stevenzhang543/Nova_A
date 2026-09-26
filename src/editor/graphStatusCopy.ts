/** 图编辑器临时消息保留语义数据，切换语言时重新显示，不改写作者内容或错误原文。 */
import { studioLayoutCopy } from './studioLayoutCopy'
import { graphDiagnosticMessage } from './graphDiagnosticCopy'
import type { GraphCopyLocale } from './graphSyntaxCopy'

export type GraphStatusMessage = string
  | { kind: 'label'; key: keyof typeof studioLayoutCopy.en; suffix?: string }
  | { kind: 'diagnostics'; items: { code: string; message: string }[] }
  | { kind: 'result'; nodes: number; milliseconds: number }

/** 每次展示均使用当前语言；技术错误原文与未知扩展诊断不被猜译或丢弃。 */
export function graphStatusMessage(status: GraphStatusMessage, locale: GraphCopyLocale): string {
  if (typeof status === 'string') return status
  if (status.kind === 'label') return studioLayoutCopy[locale][status.key] + (status.suffix ?? '')
  if (status.kind === 'diagnostics') return status.items.map(/** 保留诊断身份以便语言切换后重新翻译。 */ item => graphDiagnosticMessage(item, locale)).join(' ')
  return `${status.nodes} ${{ en: 'nodes', de: 'Knoten', zh: '节点' }[locale]} · ${status.milliseconds.toFixed(1)} ms`
}
