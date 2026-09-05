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
const literalPart = (text: string): Part => ({ text, ranges: [] })
const quoteRhai = (value: string): string => JSON.stringify(value).replace(/\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4})/g, escape => escape === '\\b' ? '\\u0008' : escape === '\\f' ? '\\u000c' : escape)
function combine(parts: Array<Part | string>): Part { let text = ''; const ranges: SyntaxSourceRange[] = []; for (const part of parts) { const value = typeof part === 'string' ? literalPart(part) : part; for (const range of value.ranges) ranges.push({ ...range, start: range.start + text.length, end: range.end + text.length }); text += value.text } return { text, ranges } }
function join(parts: Part[], separator: string): Part { return combine(parts.flatMap((part, index) => index ? [separator, part] : [part])) }
function isAst(value: unknown): value is Ast { return !!value && typeof value === 'object' && typeof (value as Ast).kind === 'string' && !!(value as Ast).span && typeof (value as Ast).id === 'string' }
function fieldsOf(ast: Ast): Record<string, GraphValue> { return Object.fromEntries(Object.entries(ast).filter(([key, value]) => !internalKeys.has(key) && (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number'))) as Record<string, GraphValue> }
function firstSpanAt<T extends { span: RhaiSpan }>(items: readonly T[], start: number): number { let low=0,high=items.length;while(low<high){const middle=(low+high)>>>1;if(items[middle].span.start<start)low=middle+1;else high=middle}return low }
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
function nodePin(key: string, name: string, direction: 'input' | 'output', required = false): GraphPin { return { uuid: graphUuid(), key, name, direction, kind: 'data', valueType: 'Data', required, defaultValue: null } }
function emptyGraph(name: string, uuid?: string): NovaGraphDocument { return { format: 'nova-graph', version: 1, apiVersion: 2, uuid: uuid || graphUuid(), name, nodes: [], edges: [], comments: [], viewport: { x: 32, y: 64, zoom: 1 }, variables: [], routines: [], customEvents: [], interfaces: [], libraries: [], debug: { breakpoints: [], watches: [], breakOnError: true, coverageEnabled: true }, migrations: [] } }

/** Project every parsed construct into an editable node. Only declared bounds can stop projection. */
export function projectRhaiSyntax(source: string, name = 'Visual Script', uuid?: string, previous?: NovaGraphDocument): NovaGraphDocument {
  if (source.length > MAX_SOURCE) throw new Error('Rhai structure exceeds the declared 64,000-character graph source limit. Split the module before conversion.')
  const program = parseRhai(source, { moduleMode: 'host', ...(previous?.language ? { previous: parseRhai(previous.language.source, { moduleMode: 'host' }) } : {}) })
  if (!program.valid) throw new Error(program.diagnostics.filter(item => item.severity === 'error').map(item => item.message + ' (' + item.span.line + ':' + item.span.column + ')').join('\n'))
  const graph = emptyGraph(name, uuid), oldById = new Map(previous?.nodes.map(node => [String(node.config.astId), node]) ?? [])
  const comments = program.tokens.filter(token=>token.kind==='lineComment'||token.kind==='blockComment')
  const rootSpan: RhaiSpan = { start: 0, end: source.length, line: 1, column: 1, endLine: source.split('\n').length, endColumn: (source.split('\n').at(-1)?.length ?? 0) + 1 }
  const root: Ast = { id: 'program', kind: 'Program', span: rootSpan, scopeId: program.scopes[0]?.id ?? 'module', body: program.body }
  const depths = new Map<string, number>()
  const add = (ast: Ast, depth: number): GraphNode => {
    if (graph.nodes.length >= MAX_GRAPH_NODES) throw new Error('The typed graph exceeds 10,000 nodes; no partial graph was saved.')
    const definition = syntaxNodeDefinition('rhai.' + ast.kind)
    if (!definition) throw new Error('No structural node schema for ' + ast.kind)
    const old = oldById.get(ast.id), fields = fieldsOf(ast)
    const node: GraphNode = { uuid: old?.uuid ?? graphUuid(), type: 'rhai.' + ast.kind, title: definition.title + (typeof fields.name === 'string' ? ' · ' + fields.name : ''), category: definition.category, position: old ? { ...old.position } : { x: depth * 300, y: 0 }, size: { width: 256, height: 120 }, collapsed: old?.collapsed ?? false, pins: [nodePin('result', ast.kind === 'Program' ? 'Module' : 'Value', 'output')], config: { astId: ast.id, syntaxScopeId: ast.scopeId, bindingId: typeof ast.bindingId === 'string' ? ast.bindingId : '', source: source.slice(ast.span.start, ast.span.end), sourceStart: ast.span.start, sourceEnd: ast.span.end, fields, originalFields: { ...fields }, fieldSpans: {}, slots: [] } }
    depths.set(node.uuid, depth)
    node.config.sourceColumn = ast.span.column
    const spans: Record<string, GraphValue> = {}
    for (const key of Object.keys(fields)) { const span = fieldSpan(ast, key, program); if (span) spans[key] = [span.start - ast.span.start, span.end - ast.span.start] }
    node.config.fieldSpans = spans
    graph.nodes.push(node)
    const slots: SyntaxSlot[] = []
    const append = (child: Ast, field: string, index: number) => {
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
        } else value.forEach((child, index) => append(child, field, index))
      }
    }
    for (const field of listFields[ast.kind] ?? []) {
      const existing = slots.filter(slot => slot.field === field), index = existing.length ? Math.max(...existing.map(slot => slot.index)) + 1 : 0, key = field + '_' + index
      node.pins.push(nodePin(key, 'Add ' + field, 'input'))
      slots.push({ key, field, index, start: -1, end: -1, childId: '', fallback: '' })
    }
    if (node.pins.length > 128) throw new Error('A structural node exceeds 128 pins; conversion stopped without truncation.')
    node.config.slots = slots as unknown as GraphValue
    const occupied=slots.filter(slot=>slot.start>=0).sort((a,b)=>a.start-b.start),ownedComments:string[]=[]
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

function generatedNode(kind: string, fields: Record<string, GraphValue>, children: Map<string, Part[]>): Part {
  const get = (key: string, fallback = '') => children.get(key)?.[0] ?? literalPart(fallback)
  const all = (key: string, separator = ', ') => join(children.get(key) ?? [], separator)
  const name = (key: string, fallback = '') => typeof fields[key] === 'string' ? String(fields[key]) : fallback
  const end = fields.terminated === false ? '' : ';'
  const postfix = (part: Part) => part.kind && ['Binary', 'Unary', 'Closure', 'If', 'Switch', 'Assignment'].includes(part.kind) ? combine(['(', part, ')']) : part
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
    case 'InterpolatedString': return combine(['`', ...(children.get('parts') ?? []).map(part => part.kind === 'TemplateText' || !part.kind ? part : combine(['${', part, '}'])), '`'])
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
export function emitSyntaxGraph(graph: NovaGraphDocument): Part {
  if (!graph.language) throw new Error('This is not a Rhai structure graph.')
  const nodes = new Map(graph.nodes.map(node => [node.uuid, node])), incoming = new Map<string, { nodeUuid: string; pinUuid: string }>()
  for (const edge of graph.edges) { if (incoming.has(edge.to.pinUuid)) throw new Error('A structural child has more than one incoming wire.'); incoming.set(edge.to.pinUuid, edge.from) }
  const relocated = graph.nodes.some(node => node.config.structureChanged === true || !node.config.source || JSON.stringify(node.config.fields) !== JSON.stringify(node.config.originalFields) || syntaxSlots(node).some(slot => { const pin = node.pins.find(pin => pin.key === slot.key && pin.direction === 'input'); return (pin ? incoming.get(pin.uuid)?.nodeUuid ?? '' : '') !== slot.childId }))
  const visiting = new Set<string>(), memo = new Map<string, Part>()
  const emit = (id: string): Part => {
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
      const pin = node.pins.find(item => item.key === slot.key && item.direction === 'input'), wire = pin ? incoming.get(pin.uuid) : undefined
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
      replacements.sort((a, b) => a.start - b.start || a.end - b.end)
      const parts: Array<Part | string> = []; let offset = 0
      for (const replacement of replacements) { if (replacement.start < offset || replacement.end > original.length) throw new Error('Overlapping or stale syntax spans; return to code and rebuild the structure.'); parts.push(original.slice(offset, replacement.start), replacement.part); offset = replacement.end }
      parts.push(original.slice(offset)); result = combine(parts)
    } else {
      result = generatedNode(node.type.slice(5), fields, children)
      const comments = Array.isArray(node.config.ownedComments) ? node.config.ownedComments.filter(item => typeof item === 'string').join('\n') : ''
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

export function assessRhaiConversion(source: string, _name?: string, graph?: NovaGraphDocument): SourceConversionAssessment {
  const program = parseRhai(source, { moduleMode: 'host' }), regions: SourceConversionRegion[] = [], diagnostics: SourceConversionDiagnostic[] = program.diagnostics.map(item => ({ ...item }))
  let ranges: SyntaxSourceRange[] = [], offset = 0
  if (graph?.language) { try { const emitted = emitSyntaxGraph(graph); const found = source.indexOf(emitted.text); if (found >= 0) { ranges = emitted.ranges; offset = found } } catch { /* Syntax errors below remain visible; stale node locations are not invented. */ } }
  const exactRanges=new Map<string,SyntaxSourceRange>(),kindByNode=new Map(graph?.nodes.map(node=>[node.uuid,node.type.slice(5)])??[])
  // Unterminated ExpressionStatement wrappers can share an exact span with
  // their Literal/Call child. Retain the matching node kind for navigation.
  for(const range of ranges){const key=(range.start+offset)+':'+(range.end+offset)+':'+kindByNode.get(range.nodeUuid);if(!exactRanges.has(key))exactRanges.set(key,range)}
  const legacyEscapes = graph && !graph.language ? [graph, ...graph.routines].flatMap(scope => scope.nodes.filter(node => node.type.startsWith('code.') || typeof node.config.rhaiSourceOverride === 'string').map(node => ({ node, scopeUuid: 'uuid' in scope ? scope.uuid : graph.uuid, source: String(node.config.rhaiSourceOverride ?? node.config.source ?? '') }))) : []
  const escapeRanges = legacyEscapes.flatMap(item => { const start = item.source ? source.indexOf(item.source) : -1; return start < 0 ? [] : [{ ...item, start, end: start + item.source.length }] })
  const visit = (node: Ast) => {
    const mapped = exactRanges.get(node.span.start+':'+node.span.end+':'+node.kind)
    const escaped = escapeRanges.find(range => node.span.start >= range.start && node.span.end <= range.end)
    const sourceBacked = !!escaped || (legacyEscapes.length > 0 && escapeRanges.length !== legacyEscapes.length)
    const classification = node.kind === 'Invalid' ? 'unpreservable' : sourceBacked ? 'source-backed' : 'structural'
    regions.push({ id: node.id, classification, kind: node.kind, span: node.span, ...(mapped ? { nodeUuid: mapped.nodeUuid, scopeUuid: graph!.uuid } : escaped ? { nodeUuid: escaped.node.uuid, scopeUuid: escaped.scopeUuid } : {}), ...(node.kind === 'Invalid' ? { reason: String(node.reason) } : sourceBacked ? { reason: 'The current legacy graph preserves this source in an Execute Rhai block. Rebuilding as a Rhai structure makes its parsed constructs editable.' } : {}) })
    for (const value of Object.values(node)) { if (isAst(value)) visit(value); else if (Array.isArray(value)) for (const child of value) if (isAst(child)) visit(child) }
  }
  for (const node of program.body) visit(node as unknown as Ast)
  if (source.length > MAX_SOURCE || regions.length > MAX_GRAPH_NODES - 1) diagnostics.push({ severity: 'error', code: 'RHAI-GRAPH-LIMIT', message: 'This module exceeds the declared source/node projection limits. No partial graph will be saved.', span: { start: 0, end: source.length, line: 1, column: 1, endLine: source.split('\n').length, endColumn: 1 } })
  for (const diagnostic of diagnostics) { let mapped:SyntaxSourceRange|undefined;for(const range of ranges)if(diagnostic.span.start>=range.start+offset&&diagnostic.span.end<=range.end+offset&&(!mapped||range.end-range.start<mapped.end-mapped.start))mapped=range;if(mapped){diagnostic.nodeUuid=mapped.nodeUuid;diagnostic.scopeUuid=graph!.uuid} }
  return { valid: program.valid && !diagnostics.some(item => item.severity === 'error'), structural: regions.filter(item => item.classification === 'structural').length, sourceBacked: regions.filter(item => item.classification === 'source-backed').length, unpreservable: regions.filter(item => item.classification === 'unpreservable').length + diagnostics.filter(item => item.code === 'RHAI-GRAPH-LIMIT').length, regions, diagnostics }
}

export function syntaxSourceLocation(source: string, offset: number): { line: number; column: number } { const prefix = source.slice(0, offset), at = prefix.lastIndexOf('\n'); return { line: prefix.split('\n').length, column: offset - at } }
