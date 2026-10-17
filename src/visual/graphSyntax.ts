/** Rhai 结构投影与发射：保留源码区间、注释和稳定标识，为代码与可视图提供共同表示。 */
import { parseRhai } from './rhaiSyntax'
import { decodeRhaiString } from './rhaiSyntaxLexer'
import type { RhaiProgram, RhaiSpan } from './rhaiSyntaxTypes'
import { graphUuid, MAX_GRAPH_NODES, type GraphNode, type GraphPin, type GraphValue, type NovaGraphDocument } from './graphTypes'
import { isSyntaxNode, syntaxFields, syntaxNodeDefinition, syntaxSlots, type SyntaxSlot } from './graphSyntaxSchema'

export interface SourceConversionRegion { id: string; classification: 'structural' | 'source-backed' | 'unpreservable'; kind: string; span: RhaiSpan; nodeUuid?: string; scopeUuid?: string; reason?: string }
export interface SourceConversionDiagnostic { code: string; severity: 'error' | 'warning' | 'info'; message: string; span: RhaiSpan; nodeUuid?: string; scopeUuid?: string }
export interface SourceConversionAssessment { valid: boolean; structural: number; sourceBacked: number; unpreservable: number; regions: SourceConversionRegion[]; diagnostics: SourceConversionDiagnostic[] }
export interface SyntaxSourceRange { start: number; end: number; nodeUuid: string }
interface Part { text: string; ranges: SyntaxSourceRange[]; kind?: string }
type Ast = { id: string; kind: string; span: RhaiSpan; scopeId: string; [key: string]: unknown }
const MAX_SOURCE = 64_000
const internalKeys = new Set(['id', 'kind', 'span', 'scopeId', 'bindingId', 'captureBindingIds', 'nameSpan', 'propertySpan', 'keySpan'])
const listFields: Record<string, string[]> = { Program: ['body'], Sequence: ['body'], Block: ['body'], Array: ['elements'], Map: ['entries'], Call: ['arguments'], Closure: ['parameters'], FunctionDeclaration: ['parameters'], InterpolatedString: ['parts'], Switch: ['cases'], SwitchCase: ['patterns'], VariableDeclaration: ['metadata'] }
const literalPart = /** 创建不带节点映射的固定文本片段。 */ (text: string): Part => ({ text, ranges: [] })
const quoteRhai = /** 使用 JSON 字符串转义，并修正 Rhai 不支持的退格与换页短转义。 */ (value: string): string => JSON.stringify(value).replace(/\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4})/g, /** 仅替换不兼容的短转义，其余转义逐字保留。 */ escape => escape === '\\b' ? '\\u0008' : escape === '\\f' ? '\\u000c' : escape)
/** 连接源码片段，并将每个子片段的节点映射偏移到完整输出位置；不丢弃空白或注释。 */
function combine(parts: Array<Part | string>): Part { let text = ''; const ranges: SyntaxSourceRange[] = []; for (const part of parts) { const value = typeof part === 'string' ? literalPart(part) : part; for (const range of value.ranges) ranges.push({ ...range, start: range.start + text.length, end: range.end + text.length }); text += value.text } return { text, ranges } }
/** 用指定分隔符连接已带映射的子片段，交给 combine 统一修正源范围。 */
function join(parts: Part[], separator: string): Part { return combine(parts.flatMap(/** 仅在第二个及以后片段之前添加分隔符。 */ (part, index) => index ? [separator, part] : [part])) }
/** 仅接受带语法种类、源范围和稳定身份的对象，过滤 AST 附属数据。 */
function isAst(value: unknown): value is Ast { return !!value && typeof value === 'object' && typeof (value as Ast).kind === 'string' && !!(value as Ast).span && typeof (value as Ast).id === 'string' }
/** 提取可编辑的标量语法字段，排除身份、绑定和源位置等内部元数据。 */
function fieldsOf(ast: Ast): Record<string, GraphValue> { return Object.fromEntries(Object.entries(ast).filter(/** 内部字段不进入编辑表；仅保留标量语法属性。 */ ([key, value]) => !internalKeys.has(key) && (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number'))) as Record<string, GraphValue> }
/** 在按源码起点排序的序列中二分查找首个不早于目标的位置，避免逐节点扫描全量 token。 */
function firstSpanAt<T extends { span: RhaiSpan }>(items: readonly T[], start: number): number { let low=0,high=items.length;while(low<high){const middle=(low+high)>>>1;if(items[middle].span.start<start)low=middle+1;else high=middle}return low }
/** 定位可原位替换的名称、键、字面量或运算符；无可靠范围时返回空，后续完整生成该节点。 */
function fieldSpan(ast: Ast, key: string, program: RhaiProgram): RhaiSpan | null {
  if (key === 'name') return (ast.nameSpan as RhaiSpan | undefined) ?? (['Identifier', 'Parameter'].includes(ast.kind) ? ast.span : null)
  if (key === 'property') return ast.propertySpan as RhaiSpan
  if (key === 'key') return ast.keySpan as RhaiSpan
  if (key === 'raw' && ['Literal', 'TemplateText'].includes(ast.kind)) return ast.span
  if (key === 'operator') {
    const lower = isAst(ast.left) ? ast.left.span.end : isAst(ast.target) ? ast.target.span.end : ast.span.start
    const upper = isAst(ast.right) ? ast.right.span.start : isAst(ast.value) ? ast.value.span.start : isAst(ast.operand) ? ast.operand.span.start : ast.span.end
    for(let index=firstSpanAt(program.tokens,lower);index<program.tokens.length&&program.tokens[index].span.start<=upper;index++){const token=program.tokens[index];if(token.span.end<=upper&&token.text===ast.operator)return token.span}
    return null
  }
  return null
}
/** 创建独立 UUID 的数据端口；语法父子关系统一使用 Data 类型且不预填默认值。 */
function nodePin(key: string, name: string, direction: 'input' | 'output', required = false): GraphPin { return { uuid: graphUuid(), key, name, direction, kind: 'data', valueType: 'Data', required, defaultValue: null } }
/** 创建独立、可序列化的图容器及调试设置；若提供 UUID 则保留文档身份。 */
function emptyGraph(name: string, uuid?: string): NovaGraphDocument { return { format: 'nova-graph', version: 1, apiVersion: 2, uuid: uuid || graphUuid(), name, nodes: [], edges: [], comments: [], viewport: { x: 32, y: 64, zoom: 1 }, variables: [], routines: [], customEvents: [], interfaces: [], libraries: [], debug: { breakpoints: [], watches: [], breakOnError: true, coverageEnabled: true }, migrations: [] } }

/** Project every parsed construct into an editable node. Only declared bounds can stop projection. */
/** 完整解析后投影结构节点；超过源长度、节点数或端口数上限立即抛错，不返回截断图。匹配 AST 身份时保留位置与固定状态。 */
export function projectRhaiSyntax(source: string, name = 'Visual Script', uuid?: string, previous?: NovaGraphDocument): NovaGraphDocument {
  if (source.length > MAX_SOURCE) throw new Error('Rhai structure exceeds the declared 64,000-character graph source limit. Split the module before conversion.')
  const program = parseRhai(source, { moduleMode: 'host', ...(previous?.language ? { previous: parseRhai(previous.language.source, { moduleMode: 'host' }) } : {}) })
  if (!program.valid) throw new Error(program.diagnostics.filter(/** 投影失败消息只收集错误级诊断。 */ item => item.severity === 'error').map(/** 将原始消息附上真实行列，不伪造图节点位置。 */ item => item.message + ' (' + item.span.line + ':' + item.span.column + ')').join('\n'))
  const graph = emptyGraph(name, uuid), oldById = new Map(previous?.nodes.map(/** 旧 AST 身份映射到已有图节点，支持位置和调试信息继承。 */ node => [String(node.config.astId), node]) ?? [])
  const comments = program.tokens.filter(/** 按 token 类型选择真实注释，字符串内相似内容不当成注释。 */ token=>token.kind==='lineComment'||token.kind==='blockComment')
  const rootSpan: RhaiSpan = { start: 0, end: source.length, line: 1, column: 1, endLine: source.split('\n').length, endColumn: (source.split('\n').at(-1)?.length ?? 0) + 1 }
  const root: Ast = { id: 'program', kind: 'Program', span: rootSpan, scopeId: program.scopes[0]?.id ?? 'module', body: program.body }
  const depths = new Map<string, number>()
  const add = /** 递归创建结构节点、子槽及连线，保留匹配节点的编辑器元数据。 */ (ast: Ast, depth: number): GraphNode => {
    if (graph.nodes.length >= MAX_GRAPH_NODES) throw new Error('The typed graph exceeds 10,000 nodes; no partial graph was saved.')
    const definition = syntaxNodeDefinition('rhai.' + ast.kind)
    if (!definition) throw new Error('No structural node schema for ' + ast.kind)
    const old = oldById.get(ast.id), fields = fieldsOf(ast)
    const node: GraphNode = { uuid: old?.uuid ?? graphUuid(), type: 'rhai.' + ast.kind, title: definition.title + (typeof fields.name === 'string' ? ' · ' + fields.name : ''), category: definition.category, position: old ? { ...old.position } : { x: depth * 300, y: 0 }, size: { width: 256, height: 120 }, collapsed: old?.collapsed ?? false, pins: [nodePin('result', ast.kind === 'Program' ? 'Module' : 'Value', 'output')], config: { astId: ast.id, syntaxScopeId: ast.scopeId, bindingId: typeof ast.bindingId === 'string' ? ast.bindingId : '', source: source.slice(ast.span.start, ast.span.end), sourceStart: ast.span.start, sourceEnd: ast.span.end, fields, originalFields: { ...fields }, fieldSpans: {}, slots: [] } }
    // 固定状态属于编辑器几何元数据；代码变化保留匹配标识的状态，不参与 Rhai 发射。
    if (old?.config.layoutPinned === true) node.config.layoutPinned = true
    depths.set(node.uuid, depth)
    node.config.sourceColumn = ast.span.column
    const spans: Record<string, GraphValue> = {}
    for (const key of Object.keys(fields)) { const span = fieldSpan(ast, key, program); if (span) spans[key] = [span.start - ast.span.start, span.end - ast.span.start] }
    node.config.fieldSpans = spans
    graph.nodes.push(node)
    const slots: SyntaxSlot[] = []
    const append = /** 为一个 AST 子节点创建有序输入槽和稳定关联，记录相对源范围。 */ (child: Ast, field: string, index: number) => {
      const key = index < 0 ? field : field + '_' + index
      const childNode = add(child, depth + 1), pin = nodePin(key, key.replace(/_/g, ' '), 'input', index < 0)
      node.pins.push(pin)
      slots.push({ key, field, index, start: child.span.start - ast.span.start, end: child.span.end - ast.span.start, childId: childNode.uuid, fallback: '' })
      graph.edges.push({ uuid: graphUuid(), from: { nodeUuid: childNode.uuid, pinUuid: childNode.pins[0].uuid }, to: { nodeUuid: node.uuid, pinUuid: pin.uuid } })
    }
    for (const [field, value] of Object.entries(ast)) {
      if (isAst(value)) append(value, field, -1)
      else if (Array.isArray(value) && value.every(isAst)) {
        if (value.length > 24) {
          for (let index = 0; index < value.length; index += 24) {
            const batch = value.slice(index, index + 24), first = batch[0], last = batch[batch.length - 1]
            append({ id: ast.id + '-' + field + '-chunk-' + index, kind: 'Sequence', span: { ...first.span, end: last.span.end, endLine: last.span.endLine, endColumn: last.span.endColumn }, scopeId: ast.scopeId, body: batch, separator: ['body'].includes(field) ? '\n' : field === 'parts' ? '' : ', ' }, field, index)
          }
        } else value.forEach(/** 按源数组顺序投影未分组的子节点。 */ (child, index) => append(child, field, index))
      }
    }
    for (const field of listFields[ast.kind] ?? []) {
      const existing = slots.filter(/** 只统计当前列表字段的槽，避免不同子列表混用序号。 */ slot => slot.field === field), index = existing.length ? Math.max(...existing.map(/** 新槽序号跟在当前字段最大序号之后。 */ slot => slot.index)) + 1 : 0, key = field + '_' + index
      node.pins.push(nodePin(key, 'Add ' + field, 'input'))
      slots.push({ key, field, index, start: -1, end: -1, childId: '', fallback: '' })
    }
    if (node.pins.length > 128) throw new Error('A structural node exceeds 128 pins; conversion stopped without truncation.')
    node.config.slots = slots as unknown as GraphValue
    const occupied=slots.filter(/** 无源码位置的新槽不能占有原始注释。 */ slot=>slot.start>=0).sort(/** 子范围按源码起点排列，支持线性分配注释归属。 */ (a,b)=>a.start-b.start),ownedComments:string[]=[]
    let childIndex=0
    for(let index=firstSpanAt(comments,ast.span.start);index<comments.length&&comments[index].span.start<ast.span.end;index++){
      const token=comments[index];if(token.span.end>ast.span.end)continue
      while(childIndex<occupied.length&&occupied[childIndex].end+ast.span.start<=token.span.start)childIndex++
      const child=occupied[childIndex]
      if(!child||token.span.start<child.start+ast.span.start||token.span.end>child.end+ast.span.start)ownedComments.push(token.text)
    }
    node.config.ownedComments = ownedComments
    node.size.height = Math.max(108, 54 + node.pins.length * 28)
    return node
  }
  const rootNode = add(root, 0)
  // Initial placement uses complete node bounds; existing manual positions remain owned by the user.
  const columnBottom = new Map<number, number>()
  for (const node of graph.nodes) if (oldById.has(String(node.config.astId))) columnBottom.set(depths.get(node.uuid)!, Math.max(columnBottom.get(depths.get(node.uuid)!) ?? 0, node.position.y + node.size.height + 40))
  for (const node of graph.nodes) if (!oldById.has(String(node.config.astId))) { const depth = depths.get(node.uuid)!; node.position.y = columnBottom.get(depth) ?? 0; columnBottom.set(depth, node.position.y + node.size.height + 40) }
  graph.language = { version: 1, source, rootNodeUuid: rootNode.uuid }
  if (previous) { graph.viewport = { ...previous.viewport }; graph.debug = structuredClone(previous.debug); graph.comments = structuredClone(previous.comments) }
  return graph
}

/** 按具体语法种类生成 Rhai；字段或子节点结构变动时使用，保留必要括号与语句结束符。 */
function generatedNode(kind: string, fields: Record<string, GraphValue>, children: Map<string, Part[]>): Part {
  const get = /** 读取单个子表达式，缺失时使用该语法种类给出的默认文本。 */ (key: string, fallback = '') => children.get(key)?.[0] ?? literalPart(fallback)
  const all = /** 保持槽顺序连接同一字段的全部子片段。 */ (key: string, separator = ', ') => join(children.get(key) ?? [], separator)
  const name = /** 仅把字符串字段当作语法名称，其他值回退到明确默认值。 */ (key: string, fallback = '') => typeof fields[key] === 'string' ? String(fields[key]) : fallback
  const end = fields.terminated === false ? '' : ';'
  const postfix = /** 在成员或索引访问前为低优先级表达式补括号，保持求值语义。 */ (part: Part) => part.kind && ['Binary', 'Unary', 'Closure', 'If', 'Switch', 'Assignment'].includes(part.kind) ? combine(['(', part, ')']) : part
  switch (kind) {
    case 'Program': return all('body', '\n')
    case 'Sequence': return all('body', name('separator', '\n'))
    case 'Literal': case 'TemplateText': return literalPart(name('raw', '()'))
    case 'Identifier': case 'Parameter': return literalPart(name('name', 'value'))
    case 'Array': return combine(['[', all('elements'), ']'])
    case 'Map': return combine(['#{', all('entries'), '}'])
    case 'MapEntry': return combine([fields.quoted ? quoteRhai(name('key')) : name('key', 'key'), ': ', get('value', '()')])
    case 'Unary': return combine([name('operator', '!'), '(', get('operand', 'false'), ')'])
    case 'Binary': return combine(['(', get('left', '0'), ') ', name('operator', '+'), ' (', get('right', '0'), ')'])
    case 'Assignment': return combine([get('target', 'value'), ' ', name('operator', '='), ' ', get('value', '()')])
    case 'Call': return combine([get('callee', name('callable', 'log_info')), '(', all('arguments'), ')'])
    case 'Member': return combine([fields.namespace ? get('object') : postfix(get('object', '#{}')), fields.namespace ? '::' : fields.optional ? '?.' : '.', name('property', 'value')])
    case 'Index': return combine([postfix(get('object', '[]')), fields.optional ? '?[' : '[', get('index', '0'), ']'])
    case 'Closure': return combine(['|', all('parameters'), '| ', get('body', '()')])
    case 'InterpolatedString': return combine(['`', ...(children.get('parts') ?? []).map(/** 模板文字直接保留，表达式片段包入插值花括号。 */ part => part.kind === 'TemplateText' || !part.kind ? part : combine(['${', part, '}'])), '`'])
    case 'Block': return combine(['{\n', all('body', '\n'), '\n}'])
    case 'If': return combine(['if ', get('condition', 'false'), ' ', get('consequent', '{}'), ...(children.has('alternate') ? [' else ', get('alternate')] : [])])
    case 'For': return combine(['for ', ...(children.has('counter') ? ['(', get('variable', 'item'), ', ', get('counter'), ')'] : [get('variable', 'item')]), ' in ', get('iterable', '0..0'), ' ', get('body', '{}')])
    case 'While': return combine(['while ', get('condition', 'false'), ' ', get('body', '{}')])
    case 'Loop': return combine(['loop ', get('body', '{ break; }')])
    case 'DoWhile': return combine(['do ', get('body', '{}'), fields.until ? ' until ' : ' while ', get('condition', 'false'), ';'])
    case 'Try': return combine(['try ', get('body', '{}'), ' catch', ...(children.has('parameter') ? [' (', get('parameter'), ')'] : []), ' ', get('handler', '{}')])
    case 'Switch': return combine(['switch ', get('value', '()'), ' { ', all('cases'), ' }'])
    case 'SwitchCase': return combine([fields.isDefault ? '_' : all('patterns', ' | '), ...(children.has('guard') ? [' if ', get('guard')] : []), ' => ', get('body', '()')])
    case 'VariableDeclaration': return combine([fields.exported ? combine(['@export', ...(children.has('metadata') ? ['(', all('metadata'), ')'] : []), ' ']) : '', name('declarationKind', 'let'), ' ', name('name', 'value'), ...(children.has('initializer') ? [' = ', get('initializer')] : []), end])
    case 'FunctionDeclaration': return combine([fields.private ? 'private ' : '', 'fn ', ...(children.has('receiver') ? [get('receiver'), '.'] : []), name('name', 'my_function'), '(', all('parameters'), ') ', get('body', '{}')])
    case 'ExpressionStatement': return combine([get('expression', '()'), end])
    case 'Return': case 'Break': case 'Throw': return combine([kind.toLowerCase(), ...(children.has('value') ? [' ', get('value')] : []), end])
    case 'Continue': return literalPart('continue' + end)
    case 'ModuleDeclaration': return combine([name('keyword', 'import'), ' ', get('path', '"module.rhai"'), ...(children.has('alias') ? [' as ', get('alias')] : []), end])
    case 'ExportDeclaration': return children.has('declaration') ? combine(['export ', get('declaration')]) : literalPart('export ' + name('name', 'value') + (fields.alias ? ' as ' + name('alias') : '') + end)
    case 'ExportMetadata': return combine([name('name', 'group'), ' = ', get('value', '"Properties"')])
    case 'Empty': return literalPart(';')
    default: throw new Error('Unsupported typed node: ' + kind)
  }
}

/** Emission uses exact source gaps for unchanged structure, and typed generation for rewiring. */
/** 从程序根节点递归发射源码，复用未变源片段并追踪节点范围；循环、重复归属和失效区间会阻止输出。 */
export function emitSyntaxGraph(graph: NovaGraphDocument): Part {
  if (!graph.language) throw new Error('This is not a Rhai structure graph.')
  const nodes = new Map(graph.nodes.map(/** 以图 UUID 建立发射查找表。 */ node => [node.uuid, node])), incoming = new Map<string, { nodeUuid: string; pinUuid: string }>()
  for (const edge of graph.edges) { if (incoming.has(edge.to.pinUuid)) throw new Error('A structural child has more than one incoming wire.'); incoming.set(edge.to.pinUuid, edge.from) }
  const relocated = graph.nodes.some(/** 任一结构、字段或子连线变动都可能使字符串源位置失效。 */ node => node.config.structureChanged === true || !node.config.source || JSON.stringify(node.config.fields) !== JSON.stringify(node.config.originalFields) || syntaxSlots(node).some(/** 比对当前连线与原子槽身份，判断子树是否重新归属。 */ slot => { const pin = node.pins.find(/** 按稳定槽键查找对应输入端口。 */ pin => pin.key === slot.key && pin.direction === 'input'); return (pin ? incoming.get(pin.uuid)?.nodeUuid ?? '' : '') !== slot.childId }))
  const visiting = new Set<string>(), memo = new Map<string, Part>()
  const emit = /** 发射一个已关联子树，检测递归所有权环，复用缓存并保留各层源映射。 */ (id: string): Part => {
    if (visiting.has(id)) throw new Error('A syntax ownership cycle cannot be emitted. Use a loop node or function call.')
    const cached = memo.get(id); if (cached) return cached
    const node = nodes.get(id); if (!node) throw new Error('A structural child refers to a missing node.')
    if (!isSyntaxNode(node)) {
      if (node.type.startsWith('literal.')) return literalPart(node.type === 'literal.string' ? JSON.stringify(String(node.config.value ?? '')) : JSON.stringify(node.config.value ?? null).replace(/^null$/, '()'))
      throw new Error('Connect Language nodes to a Rhai structure. Legacy execution nodes retain their separate graph workflow.')
    }
    visiting.add(id)
    const fields = syntaxFields(node), originalFields = node.config.originalFields && typeof node.config.originalFields === 'object' ? node.config.originalFields as Record<string, GraphValue> : {}
    const original = typeof node.config.source === 'string' ? node.config.source : '', children = new Map<string, Part[]>(), replacements: Array<{ start: number; end: number; part: Part }> = []
    let structuralChange = !original || node.config.structureChanged === true, fieldRegeneration = false
    for (const slot of syntaxSlots(node)) {
      const pin = node.pins.find(/** 只读取该槽的输入端口，输出端口不能提供子节点。 */ item => item.key === slot.key && item.direction === 'input'), wire = pin ? incoming.get(pin.uuid) : undefined
      let part: Part | null = wire ? emit(wire.nodeUuid) : slot.fallback ? literalPart(slot.fallback) : pin?.defaultValue !== null && pin?.defaultValue !== undefined ? literalPart(JSON.stringify(pin.defaultValue)) : null
      if (!part && pin?.required) throw new Error(node.title + ': connect the required ' + pin.name + ' child.')
      if (part) {
        const list = children.get(slot.field) ?? []; list.push(part); children.set(slot.field, list)
        if (wire?.nodeUuid !== slot.childId || slot.start < 0) structuralChange = true
        if (slot.start >= 0) {
          if (['Binary', 'Unary'].includes(node.type.slice(5)) && part.text !== original.slice(slot.start, slot.end)) part = combine(['(', part, ')'])
          replacements.push({ start: slot.start, end: slot.end, part })
        }
      } else if (slot.childId) structuralChange = true
    }
    const spans = node.config.fieldSpans && typeof node.config.fieldSpans === 'object' ? node.config.fieldSpans as Record<string, GraphValue> : {}
    for (const key of Object.keys(fields)) if (JSON.stringify(fields[key]) !== JSON.stringify(originalFields[key])) {
      const span = spans[key]
      if (Array.isArray(span) && span.length === 2) replacements.push({ start: Number(span[0]), end: Number(span[1]), part: literalPart(key === 'key' && fields.quoted ? quoteRhai(String(fields[key])) : String(fields[key])) })
      else fieldRegeneration = true
    }
    let result: Part
    if (!structuralChange && !fieldRegeneration) {
      replacements.sort(/** 原位替换按起点和终点排序，后续逐项拒绝重叠或过期区间。 */ (a, b) => a.start - b.start || a.end - b.end)
      const parts: Array<Part | string> = []; let offset = 0
      for (const replacement of replacements) { if (replacement.start < offset || replacement.end > original.length) throw new Error('Overlapping or stale syntax spans; return to code and rebuild the structure.'); parts.push(original.slice(offset, replacement.start), replacement.part); offset = replacement.end }
      parts.push(original.slice(offset)); result = combine(parts)
    } else {
      result = generatedNode(node.type.slice(5), fields, children)
      const comments = Array.isArray(node.config.ownedComments) ? node.config.ownedComments.filter(/** 仅输出合法字符串注释，忽略非文本配置值。 */ item => typeof item === 'string').join('\n') : ''
      if (comments) result = combine([comments, '\n', result])
    }
    if (relocated && node.type === 'rhai.Literal' && fields.literalKind === 'string' && result.text.startsWith('"') && /\\\r?\n/.test(result.text)) result = literalPart(quoteRhai(decodeRhaiString(result.text, fields.raw === originalFields.raw ? Number(node.config.sourceColumn) || 1 : 1)))
    result.kind = node.type.slice(5)
    result.ranges.push({ start: 0, end: result.text.length, nodeUuid: id })
    visiting.delete(id); memo.set(id, result); return result
  }
  const result = emit(graph.language.rootNodeUuid)
  if (result.text.length > MAX_SOURCE) throw new Error('Generated Rhai exceeds the 64,000-character structure limit; the source was not truncated.')
  return result
}

/** 重新解析输出，分类可编辑、仅保留源码及无法保留区域，并在范围可靠时关联最小图节点。 */
export function assessRhaiConversion(source: string, _name?: string, graph?: NovaGraphDocument): SourceConversionAssessment {
  const program = parseRhai(source, { moduleMode: 'host' }), regions: SourceConversionRegion[] = [], diagnostics: SourceConversionDiagnostic[] = program.diagnostics.map(/** 复制诊断后添加图导航信息，不修改解析器结果。 */ item => ({ ...item }))
  let ranges: SyntaxSourceRange[] = [], offset = 0
  if (graph?.language) { try { const emitted = emitSyntaxGraph(graph); const found = source.indexOf(emitted.text); if (found >= 0) { ranges = emitted.ranges; offset = found } } catch { /* Syntax errors below remain visible; stale node locations are not invented. */ } }
  const exactRanges=new Map<string,SyntaxSourceRange>(),kindByNode=new Map(graph?.nodes.map(/** 记录映射节点的语法种类，区分源区间相同的包装节点和表达式。 */ node=>[node.uuid,node.type.slice(5)])??[])
  // Unterminated ExpressionStatement wrappers can share an exact span with
  // their Literal/Call child. Retain the matching node kind for navigation.
  for(const range of ranges){const key=(range.start+offset)+':'+(range.end+offset)+':'+kindByNode.get(range.nodeUuid);if(!exactRanges.has(key))exactRanges.set(key,range)}
  const legacyEscapes = graph && !graph.language ? [graph, ...graph.routines].flatMap(/** 遍历主图与例程中的旧源码块，显式标注非结构覆盖。 */ scope => scope.nodes.filter(/** 只纳入旧代码块和源码覆盖节点。 */ node => node.type.startsWith('code.') || typeof node.config.rhaiSourceOverride === 'string').map(/** 为旧源码块保留所属作用域与精确文本。 */ node => ({ node, scopeUuid: 'uuid' in scope ? scope.uuid : graph.uuid, source: String(node.config.rhaiSourceOverride ?? node.config.source ?? '') }))) : []
  const escapeRanges = legacyEscapes.flatMap(/** 仅在完整源码中找到精确子串时建立旧块源范围。 */ item => { const start = item.source ? source.indexOf(item.source) : -1; return start < 0 ? [] : [{ ...item, start, end: start + item.source.length }] })
  const visit = /** 遍历 AST 区域，结合实际图映射标注结构性与源码保留情况。 */ (node: Ast) => {
    const mapped = exactRanges.get(node.span.start+':'+node.span.end+':'+node.kind)
    const escaped = escapeRanges.find(/** 只把完全落在源码块内部的节点归为该块。 */ range => node.span.start >= range.start && node.span.end <= range.end)
    const sourceBacked = !!escaped || (legacyEscapes.length > 0 && escapeRanges.length !== legacyEscapes.length)
    const classification = node.kind === 'Invalid' ? 'unpreservable' : sourceBacked ? 'source-backed' : 'structural'
    regions.push({ id: node.id, classification, kind: node.kind, span: node.span, ...(mapped ? { nodeUuid: mapped.nodeUuid, scopeUuid: graph!.uuid } : escaped ? { nodeUuid: escaped.node.uuid, scopeUuid: escaped.scopeUuid } : {}), ...(node.kind === 'Invalid' ? { reason: String(node.reason) } : sourceBacked ? { reason: 'The current legacy graph preserves this source in an Execute Rhai block. Rebuilding as a Rhai structure makes its parsed constructs editable.' } : {}) })
    for (const value of Object.values(node)) { if (isAst(value)) visit(value); else if (Array.isArray(value)) for (const child of value) if (isAst(child)) visit(child) }
  }
  for (const node of program.body) visit(node as unknown as Ast)
  if (source.length > MAX_SOURCE || regions.length > MAX_GRAPH_NODES - 1) diagnostics.push({ severity: 'error', code: 'RHAI-GRAPH-LIMIT', message: 'This module exceeds the declared source/node projection limits. No partial graph will be saved.', span: { start: 0, end: source.length, line: 1, column: 1, endLine: source.split('\n').length, endColumn: 1 } })
  for (const diagnostic of diagnostics) { let mapped:SyntaxSourceRange|undefined;for(const range of ranges)if(diagnostic.span.start>=range.start+offset&&diagnostic.span.end<=range.end+offset&&(!mapped||range.end-range.start<mapped.end-mapped.start))mapped=range;if(mapped){diagnostic.nodeUuid=mapped.nodeUuid;diagnostic.scopeUuid=graph!.uuid} }
  return { valid: program.valid && !diagnostics.some(/** 任一错误会使整份转换评估无效。 */ item => item.severity === 'error'), structural: regions.filter(/** 按明确分类分别统计；嵌套区域仍各自计数。 */ item => item.classification === 'structural').length, sourceBacked: regions.filter(/** 按明确分类分别统计；嵌套区域仍各自计数。 */ item => item.classification === 'source-backed').length, unpreservable: regions.filter(/** 按明确分类分别统计；嵌套区域仍各自计数。 */ item => item.classification === 'unpreservable').length + diagnostics.filter(/** 总投影超限即使未生成 Invalid 区域也必须计入不可保留项。 */ item => item.code === 'RHAI-GRAPH-LIMIT').length, regions, diagnostics }
}

/** 从源码前缀计算一基行列，用于输出映射和错误定位。 */
export function syntaxSourceLocation(source: string, offset: number): { line: number; column: number } { const prefix = source.slice(0, offset), at = prefix.lastIndexOf('\n'); return { line: prefix.split('\n').length, column: offset - at } }
