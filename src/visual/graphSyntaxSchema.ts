/** Rhai 结构节点模式：定义字段、子节点端口与顺序，绑定重命名先验证完整源码再修改原图。 */
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

/** 把内部驼峰和下划线键转为默认标签，界面再通过共享词典本地化。 */
function label(value: string): string { return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ') }
/** 只识别已注册的 Rhai 结构节点类型。 */
export function isSyntaxNode(node: GraphNode): boolean { return node.type.startsWith('rhai.') && kinds.has(node.type.slice(5)) }
/** 安全读取字段对象，非对象或数组配置回退为空字段。 */
export function syntaxFields(node: GraphNode): Record<string, GraphValue> { const fields = node.config.fields; return fields && typeof fields === 'object' && !Array.isArray(fields) ? fields : {} }
/** 安全读取结构子槽列表，非数组配置回退为空列表。 */
export function syntaxSlots(node: GraphNode): SyntaxSlot[] { return Array.isArray(node.config.slots) ? node.config.slots as unknown as SyntaxSlot[] : [] }
/** 仅暴露允许编辑的文本或布尔字段，并为运算符与声明类型提供合法选项。 */
export function syntaxNodeEditableFields(node: GraphNode): SyntaxField[] {
  if (!isSyntaxNode(node)) return []
  return Object.entries(syntaxFields(node)).filter(/** 只显示字符串和布尔字段，其他结构数据由专门编辑器处理。 */ ([, value]) => typeof value === 'string' || typeof value === 'boolean').filter(/** 隐藏由语法模式维护的内部字段。 */ ([key]) => !['literalKind', 'shortCircuit', 'terminated', 'keyword', 'reason', 'separator'].includes(key)).map(/** 根据值类型和节点种类构造文本、布尔或选项控件。 */ ([key, value]) => {
    const options = key === 'operator' ? (node.type === 'rhai.Unary' ? ['!', '-', '+'] : node.type === 'rhai.Assignment' ? ['=', '+=', '-=', '*=', '/=', '%=', '**=', '&=', '|=', '^=', '<<=', '>>='] : ['+', '-', '*', '/', '%', '**', '==', '!=', '<', '<=', '>', '>=', '&&', '||', '&', '|', '^', '<<', '>>', '..', '..=', 'in', '??']) : key === 'declarationKind' ? ['let', 'const'] : undefined
    return { key, label: key === 'raw' && node.type === 'rhai.Literal' ? 'Literal (Rhai spelling)' : label(key), kind: typeof value === 'boolean' ? 'boolean' : options ? 'choice' : 'text', value: value as string | boolean, ...(options ? { options } : {}) }
  })
}

/** Renames follow parsed binding identity, so a shadowed variable is not renamed. */
/** 按绑定身份更新字段；重命名前校验作用域、外部引用和完整发射源码，失败不修改原节点。 */
export function setSyntaxNodeField(node: GraphNode, key: string, value: string | boolean, graph?: NovaGraphDocument, externalSources: readonly string[] = []): void {
  if (!syntaxNodeEditableFields(node).some(/** 确认字段属于当前节点允许编辑的字段集合。 */ field => field.key === key)) return
  if (typeof value === 'string' && value.length > 8_192) throw new Error('A visual field exceeds the 8,192-character limit.')
  const fields = syntaxFields(node), previous = fields[key]
  if (key === 'name' && graph?.language && node.config.bindingId && previous !== value) {
    const current = emitSyntaxGraph(graph), range = current.ranges.find(/** 查找待重命名节点对应的当前发射源码区间。 */ range => range.nodeUuid === node.uuid)
    if (!range) throw new Error('Connect this binding to the current module before renaming it.')
    const program = parseRhai(current.text, { moduleMode: 'host' })
    const target = [...walkRhai(program)].filter(/** 按种类、名称和源码区间缩小绑定声明候选范围。 */ ast => ast.kind === node.type.slice(5) && 'name' in ast && ast.name === previous && ast.span.start >= range.start && ast.span.end <= range.end).sort(/** 按源码起点排序候选，使用最早匹配的绑定。 */ (a, b) => a.span.start - b.span.start)[0]
    if (!target) throw new Error('The current binding cannot be resolved; synchronize the code and graph before renaming.')
    const offset = 'nameSpan' in target ? target.nameSpan.start : target.span.start
    // The shared lexical rename rejects capture, duplicate overloads and
    // unprovable references before any original node field/title is changed.
    const expected = renameRhaiBinding(current.text, String(previous), String(value), { offset, externalSources })
    const proposedNode = /** 只对相同绑定身份的命名节点构造新字段，原图保持不变。 */ (candidate: GraphNode): GraphNode => candidate.config.bindingId === node.config.bindingId && typeof syntaxFields(candidate).name === 'string' ? { ...candidate, config: { ...candidate.config, fields: { ...syntaxFields(candidate), name: value } } } : candidate
    const proposed = { ...graph, nodes: graph.nodes.map(proposedNode), routines: graph.routines.map(/** 为每个函数作用域构造重命名后的节点快照。 */ scope => ({ ...scope, nodes: scope.nodes.map(proposedNode) })) }
    const actualProgram = parseRhai(emitSyntaxGraph(proposed).text, { moduleMode: 'host' }), expectedProgram = parseRhai(expected, { moduleMode: 'host' })
    const structuralSource = /** 将语法树规范化为语句文本，比较图重命名与词法重命名是否等价。 */ (parsed: typeof program) => parsed.body.map(emitRhaiNode).join('\n')
    if (!actualProgram.valid || structuralSource(actualProgram) !== structuralSource(expectedProgram)) throw new Error('Graph binding metadata is stale or incomplete; synchronize the code and graph before renaming.')
  }
  node.config.fields = { ...fields, [key]: value }
  const renameTitle = /** 更新系统生成标题的名称部分，保留作者自定义标题。 */ (candidate: GraphNode) => { const title = label(candidate.type.slice(5)); if (candidate.title === title || candidate.title.startsWith(title + ' · ') || candidate.type === 'rhai.FunctionDeclaration' && candidate.config.apiSignatureId) candidate.title = title + ' · ' + value }
  if (key === 'name') renameTitle(node)
  if (key !== 'name' || !graph || !node.config.bindingId || previous === value) return
  for (const candidate of [graph, ...graph.routines].flatMap(/** 合并模块及函数作用域的节点用于同步绑定引用。 */ scope => scope.nodes)) {
    if (candidate !== node && candidate.config.bindingId === node.config.bindingId && typeof syntaxFields(candidate).name === 'string') { candidate.config.fields = { ...syntaxFields(candidate), name: value }; renameTitle(candidate) }
  }
}

export const SYNTAX_NODE_DEFINITIONS: readonly GraphNodeDefinition[] = RHAI_SYNTAX_KINDS.filter(/** 节点库不提供错误保留块或额外程序根供手动插入。 */ kind => kind !== 'Invalid' && kind !== 'Program').map(/** 按结构种类建立节点库描述及结果端口。 */ kind => ({
  type: 'rhai.' + kind, title: label(kind), category: statements.has(kind) ? 'Language flow' : 'Language values',
  description: 'Editable Rhai ' + label(kind).toLowerCase() + ' with explicit structural children. The sandbox keeps its operation, recursion and collection limits.',
  keywords: 'rhai syntax ast language ' + label(kind), color: statements.has(kind) ? '#a777e3' : '#5e9fe6',
  pins: [{ key: 'result', name: statements.has(kind) ? 'Statement' : 'Value', direction: 'output', kind: 'data', valueType: 'Data' }] as GraphPinTemplate[],
}))
/** 取得结构节点定义，程序根和错误保留节点使用专门回退定义。 */
export function syntaxNodeDefinition(type: string): GraphNodeDefinition | null {
  const kind = type.slice(5)
  if (!type.startsWith('rhai.') || !kinds.has(kind)) return null
  return SYNTAX_NODE_DEFINITIONS.find(/** 查找与请求类型完全匹配的结构定义。 */ item => item.type === type) ?? { type, title: kind, category: 'Language flow', description: kind === 'Program' ? 'Ordered module declarations and statements.' : 'Source requiring review.', keywords: 'rhai', color: '#a777e3', pins: [{ key: 'result', name: 'Statement', direction: 'output', kind: 'data', valueType: 'Data' }] }
}
/** 按结构模式初始化默认字段、子槽、端口和基础尺寸。 */
export function initializeSyntaxNode(node: GraphNode): void {
  if (!isSyntaxNode(node)) return
  const kind = node.type.slice(5)
  node.config.fields = { ...(fieldDefaults[kind] ?? {}) }
  node.config.originalFields = {}
  node.config.slots = (childDefaults[kind] ?? []).map(/** 从默认子槽建立对应输入端口、顺序索引和源码占位值。 */ ([key, fallback]) => {
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
/** 列出可排序的子节点分组，并保持其当前索引顺序。 */
export function syntaxNodeChildLists(node: GraphNode): Array<{ field: string; label: string; slots: SyntaxSlot[] }> {
  if (!isSyntaxNode(node)) return []
  return (orderedSyntaxFields[node.type.slice(5)] ?? []).map(/** 为每个允许排序的字段建立显示标签及其现有子槽列表。 */ field => ({field,label:label(field),slots:syntaxSlots(node).filter(/** 筛选当前字段的有序子槽，排除标量子项。 */ slot=>slot.field===field && slot.index>=0)}))
}
/** 取得指定有序子列表，不支持的分组明确报错。 */
function orderedList(node: GraphNode, field: string): SyntaxSlot[] {
  const list=syntaxNodeChildLists(node).find(/** 按字段名查找对应的子节点配置。 */ item=>item.field===field)
  if(!list) throw new Error('This syntax node has no ordered '+field+' children.')
  return list.slots
}
/** 重建子槽索引和端口次序，并标记结构变化以避免重用旧源码间隙。 */
function refreshSyntaxChildren(node: GraphNode): void {
  const slots=syntaxSlots(node)
  for(const list of syntaxNodeChildLists(node)) list.slots.forEach(/** 将列表位置写回子槽索引并同步可见端口序号。 */ (slot,index)=>{
    slot.index=index
    const pin=node.pins.find(/** 查找子槽关联的稳定端口键。 */ item=>item.key===slot.key)
    if(pin) pin.name=label(slot.field)+' '+(index+1)
  })
  // Retaining old source gaps after a reorder/removal would silently preserve the old order.
  // Regenerate this owner through its typed schema; its owned comments remain attached.
  node.config.structureChanged=true
  node.config.slots=slots as unknown as GraphValue
  const inputs=new Map(node.pins.filter(/** 收集现有输入端口，供按子槽顺序重建。 */ pin=>pin.direction==='input').map(/** 建立端口键到端口对象的映射。 */ pin=>[pin.key,pin]))
  node.pins=[...node.pins.filter(/** 保留全部输出端口。 */ pin=>pin.direction!=='input'),...slots.flatMap(/** 按子槽顺序提取已有输入端口，缺失项不新增伪端口。 */ slot=>inputs.get(slot.key)??[]),...node.pins.filter(/** 保留不属于结构子槽的输入端口。 */ pin=>pin.direction==='input'&&!slots.some(/** 判断输入端口是否已经由子槽顺序覆盖。 */ /** 收集待删除子槽的稳定键。 */ slot=>slot.key===pin.key))]
  node.size.height=Math.max(108,54+node.pins.length*28)
}
/** 在端口上限内插入新的稳定子槽键，并刷新顺序和尺寸。 */
export function addSyntaxChildSlot(node: GraphNode, field: string): SyntaxSlot {
  const list=orderedList(node,field)
  if(node.pins.length>=128) throw new Error('A syntax node supports at most 128 pins. Add a nested block or split this expression before adding a child.')
  let suffix=0
  while(node.pins.some(/** 检测待分配子槽键是否已被占用。 */ /** 在启用可选子槽前检查其端口键是否冲突。 */ pin=>pin.key===field+'_'+suffix)) suffix++
  const slot:SyntaxSlot={key:field+'_'+suffix,field,index:list.length,start:-1,end:-1,childId:'',fallback:''}
  const slots=syntaxSlots(node);let lastIndex=-1
  slots.forEach(/** 记录指定有序字段最后一个子槽的位置，用于紧邻插入。 */ (item,index)=>{if(item.field===field&&item.index>=0)lastIndex=index})
  slots.splice(lastIndex<0?slots.length:lastIndex+1,0,slot)
  node.pins.push({uuid:graphUuid(),key:slot.key,name:label(field)+' '+(list.length+1),direction:'input',kind:'data',valueType:'Data',required:false,defaultValue:null})
  node.config.slots=slots as unknown as GraphValue
  refreshSyntaxChildren(node)
  return slot
}
/** 删除指定有序子槽及对应端口和连线，然后重新排列剩余子槽。 */
export function removeSyntaxChildSlot(graph: NovaGraphDocument,node: GraphNode,key: string): void {
  const slot=syntaxSlots(node).find(/** 按稳定键定位待操作的子槽或端口。 */ item=>item.key===key)
  if(!slot||slot.index<0) throw new Error('Only an ordered child slot can be removed.')
  orderedList(node,slot.field)
  const pin=node.pins.find(/** 按稳定键定位待操作的子槽或端口。 */ item=>item.key===key)
  node.config.slots=syntaxSlots(node).filter(/** 移除指定键的子槽或端口，其他对象保持原顺序。 */ item=>item.key!==key) as unknown as GraphValue
  node.pins=node.pins.filter(/** 移除指定键的子槽或端口，其他对象保持原顺序。 */ item=>item.key!==key)
  if(pin) for(const scope of [graph,...graph.routines]) scope.edges=scope.edges.filter(/** 移除连接已删除端口的所有边，避免悬空引用。 */ edge=>edge.to.pinUuid!==pin.uuid&&edge.from.pinUuid!==pin.uuid)
  refreshSyntaxChildren(node)
}
/** 与指定方向的相邻子槽交换位置，越过列表边界时保持不变。 */
export function moveSyntaxChildSlot(node: GraphNode,key: string,direction: -1|1): boolean {
  const slots=syntaxSlots(node),slot=slots.find(/** 按稳定键定位待操作的子槽或端口。 */ item=>item.key===key)
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
/** 列出类型支持的可选子节点和当前启用状态。 */
export function syntaxNodeOptionalChildren(node: GraphNode): Array<{ field:string;label:string;enabled:boolean;fallback:string }> {
  if(!isSyntaxNode(node))return []
  return Object.entries(optionalSyntaxFields[node.type.slice(5)]??{}).map(/** 组合可选子项标签、默认源码和当前启用状态。 */ ([field,fallback])=>({field,label:label(field),enabled:syntaxSlots(node).some(/** 判断标量子槽是否属于指定可选字段。 */ slot=>slot.field===field&&slot.index<0),fallback}))
}
/** 启用或删除可选子槽，同时维护端口、悬空边和结构变化标记。 */
export function setSyntaxOptionalChild(graph:NovaGraphDocument,node:GraphNode,field:string,enabled:boolean): void {
  const option=syntaxNodeOptionalChildren(node).find(/** 按字段名查找对应的子节点配置。 */ item=>item.field===field)
  if(!option)throw new Error('This syntax node has no optional '+field+' child.')
  if(option.enabled===enabled)return
  if(enabled){
    if(node.pins.length>=128)throw new Error('A syntax node supports at most 128 pins. Remove an unused child slot before enabling another child.')
    if(node.pins.some(/** 在启用可选子槽前检查其端口键是否冲突。 */ pin=>pin.key===field))throw new Error('The optional child key is already used by another pin.')
    node.config.slots=[...syntaxSlots(node),{key:field,field,index:-1,start:-1,end:-1,childId:'',fallback:option.fallback}] as unknown as GraphValue
    node.pins.push({uuid:graphUuid(),key:field,name:label(field),direction:'input',kind:'data',valueType:'Data',required:false,defaultValue:null})
  }else{
    const removed=new Set(syntaxSlots(node).filter(/** 判断标量子槽是否属于指定可选字段。 */ slot=>slot.field===field&&slot.index<0).map(/** 收集待删除子槽的稳定键。 */ slot=>slot.key))
    const pins=new Set(node.pins.filter(/** 筛选属于已移除子槽的端口。 */ pin=>removed.has(pin.key)).map(/** 收集端口标识，用于清理连接边。 */ pin=>pin.uuid))
    node.config.slots=syntaxSlots(node).filter(/** 保留未删除的结构子槽。 */ slot=>!removed.has(slot.key)) as unknown as GraphValue
    node.pins=node.pins.filter(/** 保留不属于本次删除集合的端口。 */ pin=>!pins.has(pin.uuid))
    for(const scope of [graph,...graph.routines])scope.edges=scope.edges.filter(/** 删除任一端点引用已移除端口的连线。 */ edge=>!pins.has(edge.to.pinUuid)&&!pins.has(edge.from.pinUuid))
  }
  refreshSyntaxChildren(node)
}
