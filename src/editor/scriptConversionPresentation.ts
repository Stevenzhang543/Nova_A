/** 代码与图转换的公共显示契约：用精确文档快照、UTF-16 位置和保存门禁保护跨面板编辑。 */
import type { SourceConversionAssessment } from '../visual/graphCodeSync'

export type ConversionSpan = SourceConversionAssessment['regions'][number]['span']
export interface ConversionNavigation {
  target: 'code' | 'graph'
  span: ConversionSpan
  nodeUuid?: string
  scopeUuid?: string
}
export interface ConversionSnapshot {
  source: string
  assetUuid: string
  assessment: SourceConversionAssessment
}
/** 只接受同一资源且源码逐字相同的审查快照，拒绝用户确认期间已过期的转换。 */
export function acceptsConversionReview(latest: ConversionSnapshot | null | undefined, preview: ConversionSnapshot | null): boolean {
  return !!latest && !!preview && latest.assetUuid === preview.assetUuid && latest.source === preview.source
}

/** Rhai uses UTF-16, half-open offsets. Keep CRLF intact until the DOM boundary. */
/** 按一基行列定位原始 UTF-16 偏移；保留 CRLF，在缺失行或越界列处截到有效范围。 */
export function offsetAt(source: string, line: number, column: number): number {
  let start = 0, currentLine = 1
  const breaks = /\r\n|\r|\n/g
  for (let match = breaks.exec(source); match && currentLine < line; match = breaks.exec(source)) {
    start = match.index + match[0].length
    currentLine++
  }
  if (currentLine < line) return source.length
  const end = source.slice(start).search(/[\r\n]/)
  return Math.min(end < 0 ? source.length : start + end, start + Math.max(0, column - 1))
}

/** 构造起止源范围，确保结束位置不会早于起点。 */
export function spanAt(source: string, line: number, column = 1, endLine = line, endColumn = column): ConversionSpan {
  const start = offsetAt(source, line, column), end = Math.max(start, offsetAt(source, endLine, endColumn))
  return { start, end, line, column, endLine, endColumn }
}

/** 将原始源码范围转换为浏览器换行规范化后的选区，避免 CRLF 导致选错字符。 */
export function textareaSelection(source: string, span: Pick<ConversionSpan, 'start' | 'end'>): [number, number] {
  const start = Math.max(0, Math.min(source.length, span.start)), end = Math.max(start, Math.min(source.length, span.end))
  const normalizedLength = /** 按浏览器规则合并每个 CRLF，仅计算选区前缀长度。 */ (offset: number) => source.slice(0, offset).replace(/\r\n|\r/g, '\n').length
  return [normalizedLength(start), normalizedLength(end)]
}

/** Convert an LF-normalized textarea caret back to the original UTF-16 source. */
/** 把 textarea 的 LF 偏移映射回原始源码中的 UTF-16 偏移，成对跨过 CRLF。 */
export function sourceOffsetFromTextarea(source:string,offset:number):number {
  const target=Math.max(0,Math.floor(Number.isFinite(offset)?offset:0))
  let normalized=0,index=0
  while(index<source.length&&normalized<target){if(source[index]==='\r'&&source[index+1]==='\n')index++;index++;normalized++}
  return index
}

/** Prefer the smallest containing region; a nested expression is more useful than its entire function. */
/** 选择包含目标源范围的最小已关联图节点区域，优先定位具体表达式而不是整段函数。 */
export function regionAt(assessment: SourceConversionAssessment, span: ConversionSpan) {
  const candidates = assessment.regions.filter(/** 仅考虑有节点身份且完整包含目标的区域。 */ region => region.nodeUuid && region.span.start <= span.start && region.span.end >= span.end)
  return candidates.sort(/** 区间更短者排前，相同长度维持原始次序。 */ (a, b) => (a.span.end - a.span.start) - (b.span.end - b.span.start))[0]
}

/** 语法错误或不可保留区域阻止转换；仅源码保留区域须审查同意；其余允许继续。 */
export function conversionGate(assessment: SourceConversionAssessment, acceptedSourceBacked = false): 'blocked' | 'review' | 'ready' {
  if (!assessment.valid || assessment.unpreservable > 0 || assessment.diagnostics.some(/** 任一错误级诊断足以阻止转换。 */ item => item.severity === 'error')) return 'blocked'
  return assessment.sourceBacked > 0 && !acceptedSourceBacked ? 'review' : 'ready'
}

/** The destination must never unmount an editor whose dirty save failed or was cancelled. */
/** 未修改可直接离开；已修改必须由保存函数确认成功，失败或取消时禁止卸载编辑器。 */
export async function saveBeforeNavigation(dirty: boolean, save: null | (() => boolean | Promise<boolean>)): Promise<boolean> {
  return !dirty || !!save && await save()
}

export const conversionCopy = {
  en: {
    title: 'Code ↔ graph coverage', structural: 'Editable structure', sourceBacked: 'Source-backed', unpreservable: 'Cannot preserve',
    explanation: 'Counts describe syntax regions, which may be nested. Source-backed regions retain code and are not editable typed blocks.',
    blocked: 'Conversion is blocked. Repair the listed ranges before switching; the current editor stays open.',
    review: 'These ranges keep their source text. Review them before continuing to the graph.',
    ready: 'The parser found no unpreservable regions. Syntax coverage does not certify runtime behavior; saving also validates the active editor.',
    code: 'Select code', graph: 'Select graph node', more: 'Show more regions', noRegions: 'No syntax regions.',
    continue: 'Continue with source-backed ranges', cancel: 'Keep editing', failed: 'The editor could not save. Your edits remain open.',
    newGraph: 'New Rhai structure', fields: 'Syntax fields', unavailable: 'Compile the graph to update its source coverage.',
    declarations: 'Declarations and functions', declarationHelp: 'Select a declaration to edit its syntax fields. Add syntax or API nodes from the palette and connect their ordered child pins.',
    children: 'Ordered children', addChild: 'Add child slot', removeChild: 'Remove child slot', moveUp: 'Move earlier', moveDown: 'Move later', emptySlot: 'Empty; connect a node', defaultChild: 'Default child',
    optionalChild: 'Optional child',
    saveBlocked: 'Generated Rhai was not saved. Fix the reported issue, or let the runtime finish loading, then try Save again.',
    searchNodes: 'Search graph nodes…',
    connectValue: 'Connect a value node to change this input.',
    renameScope: 'Rename the selected binding “{name}” and its references in this script.',
    renameConfirm: 'Rename the selected binding “{name}” to “{replacement}” in this script? The result will be validated and its linked graph synchronized before saving.',
    renameChanged: 'The selected script changed while rename was open. Select the binding again.',
  },
  de: {
    title: 'Code ↔ Graph: Abdeckung', structural: 'Editierbare Struktur', sourceBacked: 'Quelltextgebunden', unpreservable: 'Nicht erhaltbar',
    explanation: 'Gezählt werden Syntaxbereiche, auch verschachtelte. Quelltextgebundene Bereiche behalten ihren Code und sind keine editierbaren typisierten Blöcke.',
    blocked: 'Konvertierung gesperrt. Korrigieren Sie die markierten Bereiche. Der aktuelle Editor bleibt geöffnet.',
    review: 'Diese Bereiche behalten ihren Quelltext. Prüfen Sie sie vor dem Wechsel zum Graphen.',
    ready: 'Der Parser fand keine nicht erhaltbaren Bereiche. Syntaxabdeckung bestätigt kein Laufzeitverhalten; beim Speichern prüft der aktive Editor zusätzlich.',
    code: 'Code auswählen', graph: 'Graphknoten auswählen', more: 'Weitere Bereiche', noRegions: 'Keine Syntaxbereiche.',
    continue: 'Mit quelltextgebundenen Bereichen fortfahren', cancel: 'Weiter bearbeiten', failed: 'Speichern fehlgeschlagen. Ihre Änderungen bleiben geöffnet.',
    newGraph: 'Neue Rhai-Struktur', fields: 'Syntaxfelder', unavailable: 'Kompilieren Sie den Graphen, um die Quelltextabdeckung zu aktualisieren.',
    declarations: 'Deklarationen und Funktionen', declarationHelp: 'Wählen Sie eine Deklaration, um ihre Syntaxfelder zu bearbeiten. Ergänzen Sie Syntax- oder API-Knoten aus der Palette und verbinden Sie deren geordnete Kindanschlüsse.',
    children: 'Geordnete Kinder', addChild: 'Kindanschluss ergänzen', removeChild: 'Kindanschluss entfernen', moveUp: 'Nach vorn', moveDown: 'Nach hinten', emptySlot: 'Leer; Knoten verbinden', defaultChild: 'Standardkind',
    optionalChild: 'Optionales Kind',
    saveBlocked: 'Generierter Rhai-Code wurde nicht gespeichert. Beheben Sie den Fehler oder warten Sie auf die Laufzeit, und speichern Sie erneut.',
    searchNodes: 'Graphknoten suchen…',
    connectValue: 'Verbinden Sie einen Wertknoten, um diesen Eingang zu ändern.',
    renameScope: 'Die ausgewählte Bindung „{name}“ und ihre Referenzen in diesem Skript umbenennen.',
    renameConfirm: 'Die ausgewählte Bindung „{name}“ in diesem Skript in „{replacement}“ umbenennen? Das Ergebnis wird vor dem Speichern geprüft und der verknüpfte Graph synchronisiert.',
    renameChanged: 'Das ausgewählte Skript hat sich während der Umbenennung geändert. Wählen Sie die Bindung erneut aus.',
  },
  zh: {
    title: '代码 ↔ 图形覆盖情况', structural: '可编辑结构', sourceBacked: '保留源代码', unpreservable: '无法保留',
    explanation: '计数表示语法区域，区域可能嵌套。保留源代码的区域并非可编辑的类型化积木。',
    blocked: '转换已阻止。请先修复所列区域；当前编辑器保持打开。', review: '这些区域将保留源代码。请在切换至图形前检查。',
    ready: '解析器未发现无法保留的区域。语法覆盖不代表运行行为已通过验证；保存时还会执行当前编辑器的检查。',
    code: '选择代码', graph: '选择图形节点', more: '显示更多区域', noRegions: '没有语法区域。',
    continue: '保留这些源代码区域并继续', cancel: '继续编辑', failed: '编辑器无法保存。修改仍保留在当前编辑器中。',
    newGraph: '新建 Rhai 结构', fields: '语法字段', unavailable: '请编译图形以更新源代码覆盖情况。',
    declarations: '声明和函数', declarationHelp: '选择声明以编辑其语法字段。从节点库添加语法或 API 节点，然后连接有序的子节点端口。',
    children: '有序子节点', addChild: '添加子节点端口', removeChild: '移除子节点端口', moveUp: '前移', moveDown: '后移', emptySlot: '空端口；请连接节点', defaultChild: '默认子节点',
    optionalChild: '可选子节点',
    saveBlocked: '生成的 Rhai 未保存。请修复所报问题，或等待运行时加载完成，然后再次保存。',
    searchNodes: '搜索图形节点…',
    connectValue: '连接值节点以更改此输入。',
    renameScope: '重命名当前脚本中的选中绑定“{name}”及其引用。',
    renameConfirm: '将当前脚本中选中的绑定“{name}”重命名为“{replacement}”？保存前将验证结果并同步关联的图形。',
    renameChanged: '重命名期间当前脚本已更改。请重新选择绑定。',
  },
}
