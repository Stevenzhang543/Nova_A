import type { GraphNodeDefinition, GraphPinTemplate } from './graphCatalog'
import { graphUuid, type GraphNode, type GraphValue, type NovaGraphDocument } from './graphTypes'
import { emitRhaiNode, parseRhai, walkRhai } from './rhaiSyntax'
import { renameRhaiBinding } from './rhaiRename'
// Both modules call each other's exported functions only after initialization;
// no schema constant depends on an emitter being evaluated during module load.
import { emitSyntaxGraph } from './graphSyntax'

export const RHAI_SYNTAX_KINDS = ['Program', 'Literal', 'Identifier', 'Array', 'Map', 'MapEntry', 'Unary', 'Binary', 'Assignment', 'Call', 'Member', 'Index', 'Parameter', 'Closure', 'TemplateText', 'InterpolatedString', 'Block', 'If', 'SwitchCase', 'Switch', 'For', 'While', 'Loop', 'DoWhile', 'Try', 'VariableDeclaration', 'FunctionDeclaration', 'ExpressionStatement', 'Return', 'Break', 'Continue', 'Throw', 'ModuleDeclaration', 'ExportDeclaration', 'ExportMetadata', 'Empty', 'Invalid'] as const
export type SyntaxField = { key: string; label: string; kind: 'text' | 'boolean' | 'choice'; value: string | boolean; options?: string[] }
export type SyntaxSlot = { key: string; field: string; index: number; start: number; end: number; childId: string; fallback: string }

const statements = new Set(['Program', 'Block', 'If', 'Switch', 'For', 'While', 'Loop', 'DoWhile', 'Try', 'VariableDeclaration', 'FunctionDeclaration', 'ExpressionStatement', 'Return', 'Break', 'Continue', 'Throw', 'ModuleDeclaration', 'ExportDeclaration', 'Empty'])
const kinds = new Set<string>(RHAI_SYNTAX_KINDS)
kinds.add('Sequence')
statements.add('Sequence')
const fieldDefaults: Record<string, Record<string, GraphValue>> = {
  Literal: { raw: '0', literalKind: 'integer' }, Identifier: { name: 'value' }, Parameter: { name: 'value' },
  MapEntry: { key: 'key', quoted: false }, Unary: { operator: '!' }, Binary: { operator: '+', shortCircuit: false }, Assignment: { operator: '=' },
  Member: { property: 'value', optional: false, namespace: false }, Index: { optional: false }, Call: { optional: false },
  VariableDeclaration: { name: 'value', declarationKind: 'let', exported: false, terminated: true },
  FunctionDeclaration: { name: 'my_function', private: false }, ExpressionStatement: { terminated: true },
  Return: { terminated: true }, Break: { terminated: true }, Continue: { terminated: true }, Throw: { terminated: true },
  DoWhile: { until: false }, SwitchCase: { isDefault: false }, TemplateText: { raw: '' },
  ModuleDeclaration: { keyword: 'import', terminated: true }, ExportDeclaration: { name: 'value', alias: '', terminated: true }, ExportMetadata: { name: 'group' }, Invalid: { reason: 'Unsupported source requires review' },
}
const childDefaults: Record<string, Array<[string, string]>> = {
  Program: [['body_0', 'fn start() {}']], Block: [['body_0', '']], Array: [['elements_0', '0']], Map: [['entries_0', 'key: 0']], MapEntry: [['value', '0']],
  Unary: [['operand', 'false']], Binary: [['left', '0'], ['right', '0']], Assignment: [['target', 'value'], ['value', '0']],
  Call: [['callee', 'log_info'], ['arguments_0', '"Hello"']], Member: [['object', '#{}']], Index: [['object', '[]'], ['index', '0']],
  Closure: [['parameters_0', 'value'], ['body', 'value']], InterpolatedString: [['parts_0', '']],
  If: [['condition', 'true'], ['consequent', '{}'], ['alternate', '{}']], For: [['variable', 'item'], ['iterable', '0..10'], ['body', '{}']],
  While: [['condition', 'false'], ['body', '{}']], Loop: [['body', '{ break; }']], DoWhile: [['body', '{}'], ['condition', 'false']],
  Try: [['body', '{}'], ['parameter', 'error'], ['handler', '{}']], Switch: [['value', '0'], ['cases_0', '_ => ()']],
  SwitchCase: [['patterns_0', '0'], ['body', '()']], VariableDeclaration: [['initializer', '0']],
  FunctionDeclaration: [['body', '{}']], ExpressionStatement: [['expression', '()']], Return: [['value', '()']], Break: [], Throw: [['value', '"error"']],
  ModuleDeclaration: [['path', '"module.rhai"']], ExportMetadata: [['value', '"Properties"']],
}

function label(value: string): string { return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ') }
export function isSyntaxNode(node: GraphNode): boolean { return node.type.startsWith('rhai.') && kinds.has(node.type.slice(5)) }
export function syntaxFields(node: GraphNode): Record<string, GraphValue> { const fields = node.config.fields; return fields && typeof fields === 'object' && !Array.isArray(fields) ? fields : {} }
export function syntaxSlots(node: GraphNode): SyntaxSlot[] { return Array.isArray(node.config.slots) ? node.config.slots as unknown as SyntaxSlot[] : [] }
export function syntaxNodeEditableFields(node: GraphNode): SyntaxField[] {
  if (!isSyntaxNode(node)) return []
  return Object.entries(syntaxFields(node)).filter(([, value]) => typeof value === 'string' || typeof value === 'boolean').filter(([key]) => !['literalKind', 'shortCircuit', 'terminated', 'keyword', 'reason', 'separator'].includes(key)).map(([key, value]) => {
    const options = key === 'operator' ? (node.type === 'rhai.Unary' ? ['!', '-', '+'] : node.type === 'rhai.Assignment' ? ['=', '+=', '-=', '*=', '/=', '%=', '**=', '&=', '|=', '^=', '<<=', '>>='] : ['+', '-', '*', '/', '%', '**', '==', '!=', '<', '<=', '>', '>=', '&&', '||', '&', '|', '^', '<<', '>>', '..', '..=', 'in', '??']) : key === 'declarationKind' ? ['let', 'const'] : undefined
    return { key, label: key === 'raw' && node.type === 'rhai.Literal' ? 'Literal (Rhai spelling)' : label(key), kind: typeof value === 'boolean' ? 'boolean' : options ? 'choice' : 'text', value: value as string | boolean, ...(options ? { options } : {}) }
  })
}

/** Renames follow parsed binding identity, so a shadowed variable is not renamed. */
export function setSyntaxNodeField(node: GraphNode, key: string, value: string | boolean, graph?: NovaGraphDocument, externalSources: readonly string[] = []): void {
  if (!syntaxNodeEditableFields(node).some(field => field.key === key)) return
  if (typeof value === 'string' && value.length > 8_192) throw new Error('A visual field exceeds the 8,192-character limit.')
  const fields = syntaxFields(node), previous = fields[key]
  if (key === 'name' && graph?.language && node.config.bindingId && previous !== value) {
    const current = emitSyntaxGraph(graph), range = current.ranges.find(range => range.nodeUuid === node.uuid)
    if (!range) throw new Error('Connect this binding to the current module before renaming it.')
    const program = parseRhai(current.text, { moduleMode: 'host' })
    const target = [...walkRhai(program)].filter(ast => ast.kind === node.type.slice(5) && 'name' in ast && ast.name === previous && ast.span.start >= range.start && ast.span.end <= range.end).sort((a, b) => a.span.start - b.span.start)[0]
    if (!target) throw new Error('The current binding cannot be resolved; synchronize the code and graph before renaming.')
    const offset = 'nameSpan' in target ? target.nameSpan.start : target.span.start
    // The shared lexical rename rejects capture, duplicate overloads and
    // unprovable references before any original node field/title is changed.
    const expected = renameRhaiBinding(current.text, String(previous), String(value), { offset, externalSources })
    const proposedNode = (candidate: GraphNode): GraphNode => candidate.config.bindingId === node.config.bindingId && typeof syntaxFields(candidate).name === 'string' ? { ...candidate, config: { ...candidate.config, fields: { ...syntaxFields(candidate), name: value } } } : candidate
    const proposed = { ...graph, nodes: graph.nodes.map(proposedNode), routines: graph.routines.map(scope => ({ ...scope, nodes: scope.nodes.map(proposedNode) })) }
    const actualProgram = parseRhai(emitSyntaxGraph(proposed).text, { moduleMode: 'host' }), expectedProgram = parseRhai(expected, { moduleMode: 'host' })
    const structuralSource = (parsed: typeof program) => parsed.body.map(emitRhaiNode).join('\n')
    if (!actualProgram.valid || structuralSource(actualProgram) !== structuralSource(expectedProgram)) throw new Error('Graph binding metadata is stale or incomplete; synchronize the code and graph before renaming.')
  }
  node.config.fields = { ...fields, [key]: value }
  const renameTitle = (candidate: GraphNode) => { const title = label(candidate.type.slice(5)); if (candidate.title === title || candidate.title.startsWith(title + ' · ') || candidate.type === 'rhai.FunctionDeclaration' && candidate.config.apiSignatureId) candidate.title = title + ' · ' + value }
  if (key === 'name') renameTitle(node)
  if (key !== 'name' || !graph || !node.config.bindingId || previous === value) return
  for (const candidate of [graph, ...graph.routines].flatMap(scope => scope.nodes)) {
    if (candidate !== node && candidate.config.bindingId === node.config.bindingId && typeof syntaxFields(candidate).name === 'string') { candidate.config.fields = { ...syntaxFields(candidate), name: value }; renameTitle(candidate) }
  }
}

export const SYNTAX_NODE_DEFINITIONS: readonly GraphNodeDefinition[] = RHAI_SYNTAX_KINDS.filter(kind => kind !== 'Invalid' && kind !== 'Program').map(kind => ({
  type: 'rhai.' + kind, title: label(kind), category: statements.has(kind) ? 'Language flow' : 'Language values',
  description: 'Editable Rhai ' + label(kind).toLowerCase() + ' with explicit structural children. The sandbox keeps its operation, recursion and collection limits.',
  keywords: 'rhai syntax ast language ' + label(kind), color: statements.has(kind) ? '#a777e3' : '#5e9fe6',
  pins: [{ key: 'result', name: statements.has(kind) ? 'Statement' : 'Value', direction: 'output', kind: 'data', valueType: 'Data' }] as GraphPinTemplate[],
}))
export function syntaxNodeDefinition(type: string): GraphNodeDefinition | null {
  const kind = type.slice(5)
  if (!type.startsWith('rhai.') || !kinds.has(kind)) return null
  return SYNTAX_NODE_DEFINITIONS.find(item => item.type === type) ?? { type, title: kind, category: 'Language flow', description: kind === 'Program' ? 'Ordered module declarations and statements.' : 'Source requiring review.', keywords: 'rhai', color: '#a777e3', pins: [{ key: 'result', name: 'Statement', direction: 'output', kind: 'data', valueType: 'Data' }] }
}
export function initializeSyntaxNode(node: GraphNode): void {
  if (!isSyntaxNode(node)) return
  const kind = node.type.slice(5)
  node.config.fields = { ...(fieldDefaults[kind] ?? {}) }
  node.config.originalFields = {}
  node.config.slots = (childDefaults[kind] ?? []).map(([key, fallback]) => {
    const match = /^(.*)_(\d+)$/.exec(key)
    node.pins.push({ uuid: graphUuid(), key, name: label(key), direction: 'input', kind: 'data', valueType: 'Data', required: false, defaultValue: null })
    return { key, field: match?.[1] ?? key, index: match ? Number(match[2]) : -1, start: -1, end: -1, childId: '', fallback }
  }) as unknown as GraphValue
  node.size.height = Math.max(90, 54 + node.pins.length * 28 + syntaxNodeEditableFields(node).length * 48)
}

const orderedSyntaxFields: Record<string, string[]> = {
  Program:['body'],Sequence:['body'],Block:['body'],Array:['elements'],Map:['entries'],Call:['arguments'],
  Closure:['parameters'],FunctionDeclaration:['parameters'],InterpolatedString:['parts'],Switch:['cases'],
  SwitchCase:['patterns'],VariableDeclaration:['metadata'],
}
export function syntaxNodeChildLists(node: GraphNode): Array<{ field: string; label: string; slots: SyntaxSlot[] }> {
  if (!isSyntaxNode(node)) return []
  return (orderedSyntaxFields[node.type.slice(5)] ?? []).map(field => ({field,label:label(field),slots:syntaxSlots(node).filter(slot=>slot.field===field && slot.index>=0)}))
}
function orderedList(node: GraphNode, field: string): SyntaxSlot[] {
  const list=syntaxNodeChildLists(node).find(item=>item.field===field)
  if(!list) throw new Error('This syntax node has no ordered '+field+' children.')
  return list.slots
}
function refreshSyntaxChildren(node: GraphNode): void {
  const slots=syntaxSlots(node)
  for(const list of syntaxNodeChildLists(node)) list.slots.forEach((slot,index)=>{
    slot.index=index
    const pin=node.pins.find(item=>item.key===slot.key)
    if(pin) pin.name=label(slot.field)+' '+(index+1)
  })
  // Retaining old source gaps after a reorder/removal would silently preserve the old order.
  // Regenerate this owner through its typed schema; its owned comments remain attached.
  node.config.structureChanged=true
  node.config.slots=slots as unknown as GraphValue
  const inputs=new Map(node.pins.filter(pin=>pin.direction==='input').map(pin=>[pin.key,pin]))
  node.pins=[...node.pins.filter(pin=>pin.direction!=='input'),...slots.flatMap(slot=>inputs.get(slot.key)??[]),...node.pins.filter(pin=>pin.direction==='input'&&!slots.some(slot=>slot.key===pin.key))]
  node.size.height=Math.max(108,54+node.pins.length*28)
}
export function addSyntaxChildSlot(node: GraphNode, field: string): SyntaxSlot {
  const list=orderedList(node,field)
  if(node.pins.length>=128) throw new Error('A syntax node supports at most 128 pins. Add a nested block or split this expression before adding a child.')
  let suffix=0
  while(node.pins.some(pin=>pin.key===field+'_'+suffix)) suffix++
  const slot:SyntaxSlot={key:field+'_'+suffix,field,index:list.length,start:-1,end:-1,childId:'',fallback:''}
  const slots=syntaxSlots(node);let lastIndex=-1
  slots.forEach((item,index)=>{if(item.field===field&&item.index>=0)lastIndex=index})
  slots.splice(lastIndex<0?slots.length:lastIndex+1,0,slot)
  node.pins.push({uuid:graphUuid(),key:slot.key,name:label(field)+' '+(list.length+1),direction:'input',kind:'data',valueType:'Data',required:false,defaultValue:null})
  node.config.slots=slots as unknown as GraphValue
  refreshSyntaxChildren(node)
  return slot
}
export function removeSyntaxChildSlot(graph: NovaGraphDocument,node: GraphNode,key: string): void {
  const slot=syntaxSlots(node).find(item=>item.key===key)
  if(!slot||slot.index<0) throw new Error('Only an ordered child slot can be removed.')
  orderedList(node,slot.field)
  const pin=node.pins.find(item=>item.key===key)
  node.config.slots=syntaxSlots(node).filter(item=>item.key!==key) as unknown as GraphValue
  node.pins=node.pins.filter(item=>item.key!==key)
  if(pin) for(const scope of [graph,...graph.routines]) scope.edges=scope.edges.filter(edge=>edge.to.pinUuid!==pin.uuid&&edge.from.pinUuid!==pin.uuid)
  refreshSyntaxChildren(node)
}
export function moveSyntaxChildSlot(node: GraphNode,key: string,direction: -1|1): boolean {
  const slots=syntaxSlots(node),slot=slots.find(item=>item.key===key)
  if(!slot||slot.index<0) throw new Error('Only an ordered child slot can be moved.')
  const list=orderedList(node,slot.field),index=list.indexOf(slot),neighbor=list[index+direction]
  if(!neighbor)return false
  const first=slots.indexOf(slot),second=slots.indexOf(neighbor)
  ;[slots[first],slots[second]]=[slots[second],slots[first]]
  refreshSyntaxChildren(node)
  return true
}

const optionalSyntaxFields: Record<string,Record<string,string>> = {
  FunctionDeclaration:{receiver:'"int"'},VariableDeclaration:{initializer:'()'},Return:{value:'()'},Break:{value:'()'},
  If:{alternate:'{}'},For:{counter:'index'},Try:{parameter:'error'},SwitchCase:{guard:'true'},ModuleDeclaration:{alias:'module'},
}
export function syntaxNodeOptionalChildren(node: GraphNode): Array<{ field:string;label:string;enabled:boolean;fallback:string }> {
  if(!isSyntaxNode(node))return []
  return Object.entries(optionalSyntaxFields[node.type.slice(5)]??{}).map(([field,fallback])=>({field,label:label(field),enabled:syntaxSlots(node).some(slot=>slot.field===field&&slot.index<0),fallback}))
}
export function setSyntaxOptionalChild(graph:NovaGraphDocument,node:GraphNode,field:string,enabled:boolean): void {
  const option=syntaxNodeOptionalChildren(node).find(item=>item.field===field)
  if(!option)throw new Error('This syntax node has no optional '+field+' child.')
  if(option.enabled===enabled)return
  if(enabled){
    if(node.pins.length>=128)throw new Error('A syntax node supports at most 128 pins. Remove an unused child slot before enabling another child.')
    if(node.pins.some(pin=>pin.key===field))throw new Error('The optional child key is already used by another pin.')
    node.config.slots=[...syntaxSlots(node),{key:field,field,index:-1,start:-1,end:-1,childId:'',fallback:option.fallback}] as unknown as GraphValue
    node.pins.push({uuid:graphUuid(),key:field,name:label(field),direction:'input',kind:'data',valueType:'Data',required:false,defaultValue:null})
  }else{
    const removed=new Set(syntaxSlots(node).filter(slot=>slot.field===field&&slot.index<0).map(slot=>slot.key))
    const pins=new Set(node.pins.filter(pin=>removed.has(pin.key)).map(pin=>pin.uuid))
    node.config.slots=syntaxSlots(node).filter(slot=>!removed.has(slot.key)) as unknown as GraphValue
    node.pins=node.pins.filter(pin=>!pins.has(pin.uuid))
    for(const scope of [graph,...graph.routines])scope.edges=scope.edges.filter(edge=>!pins.has(edge.to.pinUuid)&&!pins.has(edge.from.pinUuid))
  }
  refreshSyntaxChildren(node)
}
