/** 可视图校验与 Rhai 生成器：检查稳定标识、引脚及调用拓扑，并输出源码和逐行图节点映射。 */
import { graphNodeDefinition } from './graphCatalog'
import { MAX_GRAPH_EDGES, MAX_GRAPH_NODES, canonicalGraphDocument, parseGraphDocument, type GraphCanvasScope, type GraphEdge, type GraphNode, type GraphPin, type GraphRoutine, type GraphValue, type GraphValueType, type NovaGraphDocument } from './graphTypes'
import { assessRhaiConversion, emitSyntaxGraph, syntaxSourceLocation } from './graphSyntax'

export type GraphDiagnosticSeverity = 'error' | 'warning' | 'info'
export interface GraphDiagnostic { severity: GraphDiagnosticSeverity; code: string; message: string; scopeUuid?: string; nodeUuid?: string; pinUuid?: string; edgeUuid?: string }
export interface GraphValidationResult { valid: boolean; diagnostics: GraphDiagnostic[]; nodeCount: number; edgeCount: number; elapsedMs: number }
export interface GraphSourceMapping { generatedLine: number; graphUuid: string; scopeUuid: string; nodeUuid: string; edgeUuid: string }
export interface GraphCompileResult extends GraphValidationResult { source: string; graph: NovaGraphDocument; mappings: GraphSourceMapping[] }

interface ScopeContext { uuid: string; name: string; scope: GraphCanvasScope; routine: GraphRoutine | null }
interface EmittedLine { text: string; scopeUuid?: string; nodeUuid?: string; edgeUuid?: string }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
/* 先计算 source === target || source === 'Data'；仅当其为假值时求右侧 target === 'Data'，返回短路求值结果。 */ function compatible(source: GraphValueType | null, target: GraphValueType | null): boolean { return source === target || source === 'Data' || target === 'Data' }
/* 根据 a < b 的真假，分别返回 -1 或 a > b ? 1 : 0。 */ function ordinal(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0 }
/** 在节点引脚中按稳定 UUID 查找，缺失时返回 null。 */ function pinByUuid(node: GraphNode, uuid: string): GraphPin | null { return node.pins.find(/* 比较 pin.uuid 与 uuid，返回严格相等的判断结果。 */ pin => pin.uuid === uuid) ?? null }
/** 替换非法标识字符并删除不合法的开头；没有有效内容时使用备用名。 */ function safeIdentifier(value: string, fallback = 'value'): string { const safe = value.replace(/[^A-Za-z0-9_]/g, '_').replace(/^[^A-Za-z_]+/, ''); return safe || fallback }
/** 枚举主图及所有例程作用域，同时保留所属例程供签名与局部变量解析。 */ function graphScopes(graph: NovaGraphDocument): ScopeContext[] { return [{ uuid: graph.uuid, name: graph.name, scope: graph, routine: null }, ...graph.routines.map(/** 构造并返回记录 { uuid: routine.uuid, name: routine.name, scope: routine, routine }，字段按当前实参及捕获状态求值。 */ routine => ({ uuid: routine.uuid, name: routine.name, scope: routine, routine }))] }

/** 建立节点索引和按引脚分组的入边、出边索引，避免后续重复扫描所有边。 */ function graphTopology(scope: GraphCanvasScope) {
  const nodes = new Map(scope.nodes.map(/* 返回按声明顺序构造的数组 [node.uuid, node]。 */ node => [node.uuid, node])), incoming = new Map<string, GraphEdge[]>(), outgoing = new Map<string, GraphEdge[]>()
  for (const edge of scope.edges) { incoming.set(edge.to.pinUuid, [...(incoming.get(edge.to.pinUuid) ?? []), edge]); outgoing.set(edge.from.pinUuid, [...(outgoing.get(edge.from.pinUuid) ?? []), edge]) }
  return { nodes, incoming, outgoing }
}

/** 根据节点类型，在全局变量或当前例程局部变量中解析其配置引用。 */ function variableForNode(graph: NovaGraphDocument, routine: GraphRoutine | null, node: GraphNode) {
  if (node.type.startsWith('variable.')) return graph.variables.find(/* 比较 item.uuid 与 String(node.config.variableUuid ?? '')，返回严格相等的判断结果。 */ item => item.uuid === String(node.config.variableUuid ?? '')) ?? null
  if (node.type.startsWith('local.')) return routine?.locals.find(/* 比较 item.uuid 与 String(node.config.localUuid ?? '')，返回严格相等的判断结果。 */ item => item.uuid === String(node.config.localUuid ?? '')) ?? null
  return null
}

/** 检查图规模、稳定标识、声明、引脚、连线和调用环；结构图还验证源码投影，最终返回去重排序诊断。 */ export function validateGraph(graphInput: NovaGraphDocument): GraphValidationResult {
  const started = performance.now(), graph = canonicalGraphDocument(graphInput), diagnostics: GraphDiagnostic[] = []
  const nodeCount = graph.nodes.length + graph.routines.reduce(/* 计算表达式 sum + routine.nodes.length 并返回结果，沿用操作数的原有类型规则。 */ (sum, routine) => sum + routine.nodes.length, 0), edgeCount = graph.edges.length + graph.routines.reduce(/* 计算表达式 sum + routine.edges.length 并返回结果，沿用操作数的原有类型规则。 */ (sum, routine) => sum + routine.edges.length, 0)
  if (nodeCount > MAX_GRAPH_NODES) diagnostics.push({ severity: 'error', code: 'GRAPH-LIMIT-NODES', message: `Graph exceeds ${MAX_GRAPH_NODES.toLocaleString('en-US')} total nodes.` })
  if (edgeCount > MAX_GRAPH_EDGES) diagnostics.push({ severity: 'error', code: 'GRAPH-LIMIT-EDGES', message: `Graph exceeds ${MAX_GRAPH_EDGES.toLocaleString('en-US')} total edges.` })
  const ids = new Set<string>(), register = /** 记录稳定标识，分别报告非法 UUID 和重复 UUID，并保留诊断的图位置。 */ (uuid: string, kind: string, location: Partial<GraphDiagnostic> = {}) => { if (!UUID_PATTERN.test(uuid)) diagnostics.push({ severity: 'error', code: 'GRAPH-ID-INVALID', message: `${kind} requires a locale-independent RFC 4122 UUID: ${uuid || '(empty)'}.`, ...location }); if (ids.has(uuid)) diagnostics.push({ severity: 'error', code: 'GRAPH-ID-DUPLICATE', message: `${kind} has a duplicate stable UUID: ${uuid || '(empty)'}.`, ...location }); ids.add(uuid) }
  if (graph.language) {
    if (!graph.nodes.some(/* 先计算 node.uuid === graph.language!.rootNodeUuid；仅当其为真值时求右侧 node.type === 'rhai.Program'，返回短路求值结果。 */ node => node.uuid === graph.language!.rootNodeUuid && node.type === 'rhai.Program')) diagnostics.push({ severity: 'error', code: 'GRAPH-LANGUAGE-ROOT', message: 'A Rhai structure requires its original Program root.' })
    if (graph.variables.length || graph.routines.length || graph.customEvents.length) diagnostics.push({ severity: 'error', code: 'GRAPH-LANGUAGE-OWNERSHIP', message: 'Use Language declaration/function nodes in a Rhai structure. Legacy variable/routine/event tables belong to the original graph workflow.' })
  }
  const named = /** 检查声明的 UUID、脚本标识符形式和同集合重名，并附上所属作用域。 */ (items: ReadonlyArray<{ uuid: string; name: string }>, kind: string, scopeUuid = graph.uuid) => { const names = new Set<string>(); for (const item of items) { register(item.uuid, kind, { scopeUuid }); if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(item.name)) diagnostics.push({ severity: 'error', code: 'GRAPH-SYMBOL-NAME', message: `${kind} “${item.name}” is not a stable script identifier.`, scopeUuid }); if (names.has(item.name)) diagnostics.push({ severity: 'error', code: 'GRAPH-SYMBOL-DUPLICATE', message: `${kind} name “${item.name}” is duplicated.`, scopeUuid }); names.add(item.name) } }
  register(graph.uuid, 'Graph')
  named(graph.variables, 'Variable')
  for (const variable of graph.variables) if (variable.minimum !== null && variable.maximum !== null && variable.minimum > variable.maximum) diagnostics.push({ severity: 'error', code: 'GRAPH-VARIABLE-RANGE', message: `Variable “${variable.name}” has an inverted range.` })
  named(graph.routines, 'Routine'); named(graph.customEvents, 'Custom event'); named(graph.interfaces, 'Interface')
  for (const event of graph.customEvents) named(event.parameters, `Event ${event.name} parameter`)
  for (const contract of graph.interfaces) { named(contract.methods, `Interface ${contract.name} method`, contract.uuid); for (const method of contract.methods) { named(method.inputs, `${method.name} input`, contract.uuid); named(method.outputs, `${method.name} output`, contract.uuid) } }
  for (const library of graph.libraries) { register(library.uuid, 'Graph library'); if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(library.packageId) || !library.libraryId) diagnostics.push({ severity: 'error', code: 'GRAPH-LIBRARY-INVALID', message: 'Graph libraries require a reverse-domain package ID and library ID.' }) }
  for (const migration of graph.migrations) register(migration.uuid, 'Migration')
  const allNodeIds = new Set(graphScopes(graph).flatMap(/** 提取当前作用域的所有节点稳定标识，供孤立断点检测。 */ item => item.scope.nodes.map(/* 返回 node.uuid 的当前值。 */ node => node.uuid)))
  for (const breakpoint of graph.debug.breakpoints) if (!allNodeIds.has(breakpoint.nodeUuid)) diagnostics.push({ severity: 'warning', code: 'GRAPH-BREAKPOINT-ORPHAN', message: `Breakpoint target ${breakpoint.nodeUuid || '(empty)'} no longer exists.` })
  for (const context of graphScopes(graph)) {
    const { scope, routine } = context
    if (routine) {
      named(routine.inputs, `${routine.name} input`, routine.uuid); named(routine.outputs, `${routine.name} output`, routine.uuid); named(routine.locals, `${routine.name} local`, routine.uuid)
      const entries = scope.nodes.filter(/* 比较 node.type 与 'routine.entry'，返回严格相等的判断结果。 */ node => node.type === 'routine.entry'), returns = scope.nodes.filter(/* 比较 node.type 与 'routine.return'，返回严格相等的判断结果。 */ node => node.type === 'routine.return')
      if (entries.length !== 1) diagnostics.push({ severity: 'error', code: 'GRAPH-ROUTINE-ENTRY', message: `Routine ${routine.name} requires exactly one Entry node.`, scopeUuid: routine.uuid })
      if (!returns.length) diagnostics.push({ severity: 'error', code: 'GRAPH-ROUTINE-RETURN', message: `Routine ${routine.name} requires a Return node.`, scopeUuid: routine.uuid })
      if (routine.interfaceUuid) {
        const contract = graph.interfaces.find(/* 比较 item.uuid 与 routine.interfaceUuid，返回严格相等的判断结果。 */ item => item.uuid === routine.interfaceUuid), method = contract?.methods.find(/* 比较 item.name 与 routine.name，返回严格相等的判断结果。 */ item => item.name === routine.name)
        if (!contract || !method) diagnostics.push({ severity: 'error', code: 'GRAPH-INTERFACE-MISSING', message: `Routine ${routine.name} does not match an available interface method.`, scopeUuid: routine.uuid })
        else if (JSON.stringify(method.inputs.map(/* 返回 item.valueType 的当前值。 */ item => item.valueType)) !== JSON.stringify(routine.inputs.map(/* 返回 item.valueType 的当前值。 */ item => item.valueType)) || JSON.stringify(method.outputs.map(/* 返回 item.valueType 的当前值。 */ item => item.valueType)) !== JSON.stringify(routine.outputs.map(/* 返回 item.valueType 的当前值。 */ item => item.valueType))) diagnostics.push({ severity: 'error', code: 'GRAPH-INTERFACE-SIGNATURE', message: `Routine ${routine.name} does not implement the interface signature.`, scopeUuid: routine.uuid })
      }
    }
    const { nodes, incoming, outgoing } = graphTopology(scope)
    for (const node of scope.nodes) {
      register(node.uuid, 'Node', { scopeUuid: context.uuid, nodeUuid: node.uuid })
      const definition = graphNodeDefinition(node.type, graph, routine)
      if (!definition) diagnostics.push({ severity: 'error', code: 'GRAPH-NODE-UNKNOWN', message: `Node type “${node.type}” is unavailable. Install/enable its graph library or replace the node.`, scopeUuid: context.uuid, nodeUuid: node.uuid })
      else {
        for (const expected of definition.pins) {
          const actual = node.pins.find(/* 比较 pin.key 与 expected.key，返回严格相等的判断结果。 */ pin => pin.key === expected.key), variable = variableForNode(graph, routine, node)
          const expectedType = expected.kind === 'data' ? variable && expected.key === 'value' ? variable.valueType : expected.valueType ?? 'Data' : null
          if (!actual || actual.direction !== expected.direction || actual.kind !== expected.kind || actual.valueType !== expectedType) diagnostics.push({ severity: 'error', code: 'GRAPH-PIN-SCHEMA', message: `Node “${node.title}” has an incompatible or missing “${expected.name}” pin. Migrate or recreate the node.`, scopeUuid: context.uuid, nodeUuid: node.uuid, pinUuid: actual?.uuid })
        }
        if (definition.deprecatedBy) diagnostics.push({ severity: 'warning', code: 'GRAPH-NODE-DEPRECATED', message: `Node “${node.title}” is deprecated; replace it with ${definition.deprecatedBy}.`, scopeUuid: context.uuid, nodeUuid: node.uuid })
      }
      for (const pin of node.pins) register(pin.uuid, 'Pin', { scopeUuid: context.uuid, nodeUuid: node.uuid, pinUuid: pin.uuid })
      if ((node.type.startsWith('variable.') || node.type.startsWith('local.')) && !variableForNode(graph, routine, node)) diagnostics.push({ severity: 'error', code: node.type.startsWith('local.') ? 'GRAPH-LOCAL-MISSING' : 'GRAPH-VARIABLE-MISSING', message: `${node.type.startsWith('local.') ? 'Local' : 'Variable'} node refers to a missing declaration.`, scopeUuid: context.uuid, nodeUuid: node.uuid })
    }
    for (const edge of scope.edges) {
      register(edge.uuid, 'Edge', { scopeUuid: context.uuid, edgeUuid: edge.uuid })
      const fromNode = nodes.get(edge.from.nodeUuid), toNode = nodes.get(edge.to.nodeUuid), fromPin = fromNode ? pinByUuid(fromNode, edge.from.pinUuid) : null, toPin = toNode ? pinByUuid(toNode, edge.to.pinUuid) : null
      if (!fromNode || !toNode || !fromPin || !toPin) { diagnostics.push({ severity: 'error', code: 'GRAPH-EDGE-DANGLING', message: 'Wire refers to a missing node or pin.', scopeUuid: context.uuid, edgeUuid: edge.uuid }); continue }
      if (fromPin.direction !== 'output' || toPin.direction !== 'input') diagnostics.push({ severity: 'error', code: 'GRAPH-EDGE-DIRECTION', message: 'Wires must run from an output pin to an input pin.', scopeUuid: context.uuid, edgeUuid: edge.uuid })
      if (fromPin.kind !== toPin.kind) diagnostics.push({ severity: 'error', code: 'GRAPH-EDGE-KIND', message: 'Execution and data pins cannot be connected.', scopeUuid: context.uuid, edgeUuid: edge.uuid })
      if (fromPin.kind === 'data' && !compatible(fromPin.valueType, toPin.valueType)) diagnostics.push({ severity: 'error', code: 'GRAPH-EDGE-TYPE', message: `${fromPin.valueType ?? 'Unknown'} cannot connect to ${toPin.valueType ?? 'Unknown'}; add an explicit conversion node.`, scopeUuid: context.uuid, edgeUuid: edge.uuid, pinUuid: toPin.uuid })
    }
    for (const node of scope.nodes) for (const pin of node.pins.filter(/* 比较 pin.direction 与 'input'，返回严格相等的判断结果。 */ pin => pin.direction === 'input')) {
      const count = incoming.get(pin.uuid)?.length ?? 0
      if (count > 1) diagnostics.push({ severity: 'error', code: 'GRAPH-PIN-MULTIPLE', message: `Input “${pin.name}” has ${count} incoming wires.`, scopeUuid: context.uuid, nodeUuid: node.uuid, pinUuid: pin.uuid })
      if (pin.required && pin.kind === 'data' && count === 0 && pin.defaultValue === null) diagnostics.push({ severity: 'error', code: 'GRAPH-PIN-REQUIRED', message: `Input “${pin.name}” requires a value.`, scopeUuid: context.uuid, nodeUuid: node.uuid, pinUuid: pin.uuid })
    }
    const adjacency = new Map<string, string[]>()
    for (const edge of scope.edges) adjacency.set(edge.from.nodeUuid, [...(adjacency.get(edge.from.nodeUuid) ?? []), edge.to.nodeUuid])
    const visiting = new Set<string>(), visited = new Set<string>(), visit = /** 深度优先遍历节点邻接表；进入尚未退出的节点时报告无界连线环。 */ (uuid: string) => { if (visiting.has(uuid)) { diagnostics.push({ severity: 'error', code: 'GRAPH-CYCLE', message: 'Unbounded graph cycle detected. Use Bounded Repeat for loops.', scopeUuid: context.uuid, nodeUuid: uuid }); return }; if (visited.has(uuid)) return; visiting.add(uuid); for (const next of adjacency.get(uuid) ?? []) visit(next); visiting.delete(uuid); visited.add(uuid) }
    for (const node of scope.nodes) visit(node.uuid)
    for (const event of scope.nodes.filter(/* 先计算 node.type.startsWith('event.')；仅当其为假值时求右侧 node.type.startsWith('custom.event.')，返回短路求值结果。 */ node => node.type.startsWith('event.') || node.type.startsWith('custom.event.'))) { const next = event.pins.find(/* 比较 pin.key 与 'next'，返回严格相等的判断结果。 */ pin => pin.key === 'next'); if (next && !(outgoing.get(next.uuid)?.length)) diagnostics.push({ severity: 'warning', code: 'GRAPH-EVENT-EMPTY', message: `${event.title} has no execution path.`, scopeUuid: context.uuid, nodeUuid: event.uuid }) }
  }
  const calls = new Map<string, string[]>()
  for (const routine of graph.routines) for (const node of routine.nodes) { const match = /^routine\.call\.([0-9a-f-]+)$/.exec(node.type); if (match) calls.set(routine.uuid, [...(calls.get(routine.uuid) ?? []), match[1]]) }
  const visitingRoutines = new Set<string>(), visitedRoutines = new Set<string>(), visitRoutine = /** 深度优先检查例程调用链，报告递归环并避免重复检查已完成例程。 */ (uuid: string) => { if (visitingRoutines.has(uuid)) { diagnostics.push({ severity: 'error', code: 'GRAPH-ROUTINE-CYCLE', message: 'Recursive routine cycle is unbounded; use Bounded Repeat instead.', scopeUuid: uuid }); return }; if (visitedRoutines.has(uuid)) return; visitingRoutines.add(uuid); for (const next of calls.get(uuid) ?? []) visitRoutine(next); visitingRoutines.delete(uuid); visitedRoutines.add(uuid) }
  for (const routine of graph.routines) visitRoutine(routine.uuid)
  if (graph.language && !diagnostics.some(/* 比较 item.severity 与 'error'，返回严格相等的判断结果。 */ item => item.severity === 'error')) {
    try {
      const emitted = emitSyntaxGraph(graph), assessment = assessRhaiConversion(emitted.text, graph.name, graph)
      diagnostics.push(...assessment.diagnostics.map(/** 构造并返回记录 { severity: item.severity, code: item.code, message: item.message + ' (' + item.span.line + ':' + item.span.column + ')', nodeUuid: item.nodeUuid, scopeUuid: item.scopeUuid }，字段按当前实参及捕获状态求值。 */ item => ({ severity: item.severity, code: item.code, message: item.message + ' (' + item.span.line + ':' + item.span.column + ')', nodeUuid: item.nodeUuid, scopeUuid: item.scopeUuid })))
      const owned = new Set(emitted.ranges.map(/* 返回 range.nodeUuid 的当前值。 */ range => range.nodeUuid))
      for (const node of graph.nodes) if (!owned.has(node.uuid)) diagnostics.push({ severity: 'warning', code: 'GRAPH-LANGUAGE-DISCONNECTED', message: node.title + ' is not connected to the module and will not execute.', nodeUuid: node.uuid, scopeUuid: graph.uuid })
    } catch (error) { diagnostics.push({ severity: 'error', code: 'GRAPH-LANGUAGE-EMISSION', message: error instanceof Error ? error.message : String(error), scopeUuid: graph.uuid }) }
  }
  const unique = new Map<string, GraphDiagnostic>()
  for (const diagnostic of diagnostics) unique.set(`${diagnostic.code}:${diagnostic.scopeUuid ?? ''}:${diagnostic.nodeUuid ?? ''}:${diagnostic.pinUuid ?? ''}:${diagnostic.edgeUuid ?? ''}:${diagnostic.message}`, diagnostic)
  const result = [...unique.values()].sort(/** 按严重级别、诊断码、作用域及节点标识稳定排序诊断。 */ (a, b) => ordinal(a.severity, b.severity) || ordinal(a.code, b.code) || ordinal(a.scopeUuid ?? '', b.scopeUuid ?? '') || ordinal(a.nodeUuid ?? '', b.nodeUuid ?? ''))
  return { valid: !result.some(/* 比较 item.severity 与 'error'，返回严格相等的判断结果。 */ item => item.severity === 'error'), diagnostics: result, nodeCount, edgeCount, elapsedMs: performance.now() - started }
}

/* 调用 JSON.stringify(value) 并返回调用结果。 */ function rhaiString(value: string): string { return JSON.stringify(value) }
/** 递归把类型化值转换为 Rhai 字面量；规范数值、单位值、数组和按键排序的映射。 */ function rhaiValue(value: GraphValue): string { if (value === null) return '()'; if (typeof value === 'boolean') return value ? 'true' : 'false'; if (typeof value === 'number') return Number.isFinite(value) ? (Number.isInteger(value) ? `${value}.0` : String(value)) : '0.0'; if (typeof value === 'string') return rhaiString(value); if (Array.isArray(value)) return `[${value.map(rhaiValue).join(', ')}]`; return `#{ ${Object.entries(value).sort(/* 调用 ordinal(a, b) 并返回调用结果。 */ ([a], [b]) => ordinal(a, b)).map(/** 按模板 `${rhaiString(key)}: ${rhaiValue(item)}` 生成并返回字符串。 */ ([key, item]) => `${rhaiString(key)}: ${rhaiValue(item)}`).join(', ')} }` }
/** 原字面量仍表示当前类型化值时保留原文；否则重新生成类型化 Rhai 字面量。 */ function rhaiLiteral(value: GraphValue, source: unknown): string {
  if (typeof source === 'string') {
    try { if (JSON.stringify(JSON.parse(source)) === JSON.stringify(value)) return source } catch { /* Nonliteral source cannot override a typed value. */ }
    if (typeof value === 'number' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(source.trim()) && Number(source) === value) return source
    if (source.trim() === '()' && value === null) return '()'
  }
  return rhaiValue(value)
}
/** 生成导出变量的类型、分组、提示及持久化属性，并附上已配置的范围和资源限制。 */ function metadata(variable: NovaGraphDocument['variables'][number]): string { const fields = [`type=${rhaiString(variable.valueType.toLowerCase())}`, `group=${rhaiString(variable.group)}`, `tooltip=${rhaiString(variable.tooltip)}`, `serialize=${variable.serialized ? 'true' : 'false'}`]; if (variable.minimum !== null) fields.push(`min=${variable.minimum}`); if (variable.maximum !== null) fields.push(`max=${variable.maximum}`); if (variable.step !== null) fields.push(`step=${variable.step}`); if (variable.resourceType) fields.push(`resource=${rhaiString(variable.resourceType)}`); return fields.join(', ') }

/* 当 routine?.nodes.some(node => node.type === 'routine.entry' && node.config.rhaiOriginalSignature === true) 为 null 或 undefined 时返回 false，否则保留左侧值。 */ function originalRoutineSignature(routine: GraphRoutine | null | undefined): boolean { return routine?.nodes.some(/* 先计算 node.type === 'routine.entry'；仅当其为真值时求右侧 node.config.rhaiOriginalSignature === true，返回短路求值结果。 */ node => node.type === 'routine.entry' && node.config.rhaiOriginalSignature === true) ?? false }
/** 保留合法的原循环变量名，否则用节点稳定 UUID 生成内部索引名。 */ function repeatIndex(node: GraphNode): string { return typeof node.config.rhaiIndexName === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(node.config.rhaiIndexName) ? node.config.rhaiIndexName : `__index_${safeIdentifier(node.uuid.replace(/-/g, '').slice(0, 8))}` }

/** 依据数据依赖及执行连线生成当前作用域的 Rhai，插入追踪语句并保留节点及连线映射。 */ function compileScope(graph: NovaGraphDocument, context: ScopeContext): EmittedLine[] {
  const { scope, routine } = context, topology = graphTopology(scope), globalNames = new Map(graph.variables.map(/* 返回按声明顺序构造的数组 [variable.uuid, safeIdentifier(variable.name)]。 */ variable => [variable.uuid, safeIdentifier(variable.name)])), localNames = new Map((routine?.locals ?? []).map(/* 返回按声明顺序构造的数组 [variable.uuid, safeIdentifier(variable.name)]。 */ variable => [variable.uuid, safeIdentifier(variable.name)])), pinOwner = new Map<string, { node: GraphNode; pin: GraphPin }>()
  for (const node of scope.nodes) for (const pin of node.pins) pinOwner.set(pin.uuid, { node, pin })
  const incomingEdge = /* 当 topology.incoming.get(pin.uuid)?.[0] 为 null 或 undefined 时返回 null，否则保留左侧值。 */ (pin: GraphPin): GraphEdge | null => topology.incoming.get(pin.uuid)?.[0] ?? null
  const outputEdge = /** 查找指定键的执行输出引脚，并取其首条出边；未连接时返回 null。 */ (node: GraphNode, key: string): GraphEdge | null => { const pin = node.pins.find(/* 先计算 candidate.key === key && candidate.direction === 'output'；仅当其为真值时求右侧 candidate.kind === 'execution'，返回短路求值结果。 */ candidate => candidate.key === key && candidate.direction === 'output' && candidate.kind === 'execution'); return pin ? topology.outgoing.get(pin.uuid)?.[0] ?? null : null }
  const outputTarget = /** 通过指定执行出口的连线解析目标节点，缺少边或节点时返回 null。 */ (node: GraphNode, key: string): GraphNode | null => { const edge = outputEdge(node, key); return edge ? topology.nodes.get(edge.to.nodeUuid) ?? null : null }
  const resultName = /** 按模板 `__result_${safeIdentifier(node.uuid.replace(/-/g, '').slice(0, 12))}` 生成并返回字符串。 */ (node: GraphNode) => `__result_${safeIdentifier(node.uuid.replace(/-/g, '').slice(0, 12))}`
  const inputExpression = /** 优先沿数据入边递归生成来源表达式；未连接时保留与默认值一致的原字面量。 */ (node: GraphNode, key: string, stack = new Set<string>()): string => { const pin = node.pins.find(/* 先计算 candidate.key === key && candidate.direction === 'input'；仅当其为真值时求右侧 candidate.kind === 'data'，返回短路求值结果。 */ candidate => candidate.key === key && candidate.direction === 'input' && candidate.kind === 'data'); if (!pin) return '()'; const edge = incomingEdge(pin); if (!edge) { const originals = node.config.rhaiInputSources; return rhaiLiteral(pin.defaultValue, originals && typeof originals === 'object' && !Array.isArray(originals) ? originals[key] : undefined) }; const owner = pinOwner.get(edge.from.pinUuid); return owner ? expression(owner.node, owner.pin, stack) : rhaiValue(pin.defaultValue) }
  const expression = /** 按节点种类生成数据表达式、类型转换或调用结果；用节点与引脚访问集合阻止递归数据环。 */ (node: GraphNode, pin: GraphPin, stack = new Set<string>()): string => {
    const token = `${node.uuid}:${pin.uuid}`; if (stack.has(token)) return '()'; const nextStack = new Set(stack).add(token)
    if (node.type.startsWith('literal.')) return rhaiValue(node.config.value ?? pin.defaultValue)
    if (node.type === 'code.expression') return `(${String(node.config.source ?? '()').slice(0, 64_000)})`
    if (node.type === 'variable.get') return globalNames.get(String(node.config.variableUuid ?? '')) ?? '()'
    if (node.type === 'local.get') return localNames.get(String(node.config.localUuid ?? '')) ?? '()'
    if (node.type.startsWith('event.') && Array.isArray(node.config.rhaiParameters)) {
      const index = node.pins.filter(/* 先计算 item.kind === 'data'；仅当其为真值时求右侧 item.direction === 'output'，返回短路求值结果。 */ item => item.kind === 'data' && item.direction === 'output').findIndex(/* 比较 item.uuid 与 pin.uuid，返回严格相等的判断结果。 */ item => item.uuid === pin.uuid)
      return safeIdentifier(String(node.config.rhaiParameters[index] ?? pin.key))
    }
    if (node.type.startsWith('event.') || node.type.startsWith('custom.event.') || node.type === 'routine.entry') return safeIdentifier(pin.key)
    if (node.type === 'flow.repeat' && pin.key === 'index') return repeatIndex(node)
    if (node.type.startsWith('math.')) { const operation: Record<string, string> = { add: '+', subtract: '-', multiply: '*', divide: '/', modulo: '%' }, name = node.type.slice(5), a = inputExpression(node, 'a', nextStack), b = inputExpression(node, 'b', nextStack); if (name === 'minimum') return `if ${a} < ${b} { ${a} } else { ${b} }`; if (name === 'maximum') return `if ${a} > ${b} { ${a} } else { ${b} }`; if (node.config.rhaiArithmetic !== true && (name === 'divide' || name === 'modulo')) return `if ${b} == 0.0 { 0.0 } else { ${a} ${operation[name]} ${b} }`; return `(${a} ${operation[name] ?? '+'} ${b})` }
    if (node.type.startsWith('compare.')) { const operation: Record<string, string> = { equal: '==', not_equal: '!=', less: '<', less_equal: '<=', greater: '>', greater_equal: '>=' }; return `(${inputExpression(node, 'a', nextStack)} ${operation[node.type.slice(8)] ?? '=='} ${inputExpression(node, 'b', nextStack)})` }
    if (node.type === 'logic.and' || node.type === 'logic.or') return `(${inputExpression(node, 'a', nextStack)} ${node.type.endsWith('and') ? '&&' : '||'} ${inputExpression(node, 'b', nextStack)})`
    if (node.type === 'logic.not') return `!(${inputExpression(node, 'value', nextStack)})`
    if (node.type === 'value.make_vec2') return `[${inputExpression(node, 'x', nextStack)}, ${inputExpression(node, 'y', nextStack)}]`
    if (node.type === 'value.break_vec2') return `${inputExpression(node, 'value', nextStack)}[${pin.key === 'y' ? 1 : 0}]`
    if (node.type === 'reroute.data') return inputExpression(node, 'value', nextStack)
    if (node.type === 'convert.number_to_string' || node.type === 'convert.boolean_to_string') return `(${inputExpression(node, 'value', nextStack)}).to_string()`
    if (node.type === 'convert.boolean_to_number') return `if ${inputExpression(node, 'value', nextStack)} { 1.0 } else { 0.0 }`
    if (node.type === 'convert.string_to_number') return `(${inputExpression(node, 'value', nextStack)}).to_float()`
    const routineMatch = /^routine\.call\.([0-9a-f-]+)$/.exec(node.type)
    if (routineMatch) { const target = graph.routines.find(/* 比较 item.uuid 与 routineMatch[1]，返回严格相等的判断结果。 */ item => item.uuid === routineMatch[1]), parameters = [...(originalRoutineSignature(target) ? [] : [routine && !originalRoutineSignature(routine) ? '__nova_call_depth + 1' : '1']), ...(target?.inputs ?? []).map(/* 调用 inputExpression(node, item.name, nextStack) 并返回调用结果。 */ item => inputExpression(node, item.name, nextStack))], call = `${safeIdentifier(target?.name ?? 'missing')}(${parameters.join(', ')})`; if (target?.pure) return target.outputs.length > 1 ? `${call}[${rhaiString(pin.key)}]` : call; return target && target.outputs.length > 1 ? `${resultName(node)}[${rhaiString(pin.key)}]` : resultName(node) }
    const definition = graphNodeDefinition(node.type, graph, routine), api = definition?.api
    if (api) return `${api.callable}(${node.pins.filter(/* 先计算 candidate.direction === 'input'；仅当其为真值时求右侧 candidate.kind === 'data'，返回短路求值结果。 */ candidate => candidate.direction === 'input' && candidate.kind === 'data').map(/* 调用 inputExpression(node, candidate.key, nextStack) 并返回调用结果。 */ candidate => inputExpression(node, candidate.key, nextStack)).join(', ')})`
    return '()'
  }
  const watchValues = /** 汇总全局、局部及输入参数名，最多生成一百二十八项的调试观察值映射。 */ () => { const names = [...globalNames.values(), ...localNames.values(), ...(routine?.inputs.map(/* 调用 safeIdentifier(item.name) 并返回调用结果。 */ item => safeIdentifier(item.name)) ?? [])].slice(0, 128); return `#{ ${names.map(/** 按模板 `${rhaiString(name)}: ${name}` 生成并返回字符串。 */ name => `${rhaiString(name)}: ${name}`).join(', ')} }` }
  const traceDepth = /* 根据 routine && !originalRoutineSignature(routine) 的真假，分别返回 `__nova_call_depth + ${depth}` 或 String(depth)。 */ (depth: number) => routine && !originalRoutineSignature(routine) ? `__nova_call_depth + ${depth}` : String(depth)
  const traceNode = /** 生成当前节点的调试追踪语句，同时附上作用域、节点及当前变量快照。 */ (node: GraphNode, depth: number): EmittedLine => ({ text: `${'  '.repeat(Math.min(32, depth))}__nova_graph_trace(${rhaiString(graph.uuid)}, ${rhaiString(context.uuid)}, ${rhaiString(node.uuid)}, "", ${traceDepth(depth)}, ${watchValues()});`, scopeUuid: context.uuid, nodeUuid: node.uuid })
  const traceEdge = /** 存在连线时生成其调试追踪语句；空连线不输出源码。 */ (edge: GraphEdge | null, depth: number): EmittedLine[] => edge ? [{ text: `${'  '.repeat(Math.min(32, depth))}__nova_graph_trace(${rhaiString(graph.uuid)}, ${rhaiString(context.uuid)}, "", ${rhaiString(edge.uuid)}, ${traceDepth(depth)}, ${watchValues()});`, scopeUuid: context.uuid, edgeUuid: edge.uuid }] : []
  const emit = /** 沿执行出口递归生成语句、条件、序列、有界循环及调用；保留显式嵌入源码，并阻止路径环或过深遍历。 */ (node: GraphNode | null, depth: number, path: Set<string>): EmittedLine[] => {
    if (!node || depth > scope.nodes.length + 1 || path.has(node.uuid)) return []
    const nextPath = new Set(path).add(node.uuid), indent = '  '.repeat(Math.min(32, depth)), lines: EmittedLine[] = [traceNode(node, depth)]
    const definition = graphNodeDefinition(node.type, graph, routine), api = definition?.api
    const sourceOverride = typeof node.config.rhaiSourceOverride === 'string' ? node.config.rhaiSourceOverride : ''
    const embeddedSource = node.type === 'code.statement' && typeof node.config.source === 'string' ? node.config.source : sourceOverride
    if (embeddedSource.trim()) {
      for (const line of embeddedSource.split(/\r?\n/)) lines.push({ text: line, scopeUuid: context.uuid, nodeUuid: node.uuid })
      const edge = outputEdge(node, 'next')
      lines.push(...traceEdge(edge, depth), ...emit(edge ? topology.nodes.get(edge.to.nodeUuid) ?? null : null, depth, nextPath))
      return lines
    }
    if (api) { if (api.resultConvention === 'queued-command') lines.push({ text: `${indent}${api.callable}(${node.pins.filter(/* 先计算 pin.direction === 'input'；仅当其为真值时求右侧 pin.kind === 'data'，返回短路求值结果。 */ pin => pin.direction === 'input' && pin.kind === 'data').map(/* 调用 inputExpression(node, pin.key) 并返回调用结果。 */ pin => inputExpression(node, pin.key)).join(', ')});`, scopeUuid: context.uuid, nodeUuid: node.uuid }); const edge = outputEdge(node, 'next'); lines.push(...traceEdge(edge, depth), ...emit(edge ? topology.nodes.get(edge.to.nodeUuid) ?? null : null, depth, nextPath)); return lines }
    if (node.type === 'variable.set' || node.type === 'local.set') { const name = node.type === 'local.set' ? localNames.get(String(node.config.localUuid ?? '')) : globalNames.get(String(node.config.variableUuid ?? '')); if (name) lines.push({ text: `${indent}${name} = ${inputExpression(node, 'value')};`, scopeUuid: context.uuid, nodeUuid: node.uuid }); const edge = outputEdge(node, 'next'); lines.push(...traceEdge(edge, depth), ...emit(edge ? topology.nodes.get(edge.to.nodeUuid) ?? null : null, depth, nextPath)); return lines }
    if (node.type === 'flow.branch') { const trueEdge = outputEdge(node, 'true'), falseEdge = outputEdge(node, 'false'), nextEdge = outputEdge(node, 'next'); lines.push({ text: `${indent}if ${inputExpression(node, 'condition')} {`, scopeUuid: context.uuid, nodeUuid: node.uuid }, ...traceEdge(trueEdge, depth + 1), ...emit(trueEdge ? topology.nodes.get(trueEdge.to.nodeUuid) ?? null : null, depth + 1, nextPath), { text: `${indent}} else {`, scopeUuid: context.uuid, nodeUuid: node.uuid }, ...traceEdge(falseEdge, depth + 1), ...emit(falseEdge ? topology.nodes.get(falseEdge.to.nodeUuid) ?? null : null, depth + 1, nextPath), { text: `${indent}}`, scopeUuid: context.uuid, nodeUuid: node.uuid }, ...traceEdge(nextEdge, depth), ...emit(nextEdge ? topology.nodes.get(nextEdge.to.nodeUuid) ?? null : null, depth, nextPath)); return lines }
    if (node.type === 'flow.sequence') { for (const key of ['first', 'second', 'next']) { const edge = outputEdge(node, key); lines.push(...traceEdge(edge, depth), ...emit(edge ? topology.nodes.get(edge.to.nodeUuid) ?? null : null, depth, nextPath)) }; return lines }
    if (node.type === 'flow.repeat') { const suffix = safeIdentifier(node.uuid.replace(/-/g, '').slice(0, 8)), count = `__count_${suffix}`, index = repeatIndex(node), bodyEdge = outputEdge(node, 'body'), nextEdge = outputEdge(node, 'next'); lines.push({ text: `${indent}let ${count} = (${inputExpression(node, 'count')}).to_int();`, scopeUuid: context.uuid, nodeUuid: node.uuid }, { text: `${indent}if ${count} < 0 { ${count} = 0; }`, scopeUuid: context.uuid, nodeUuid: node.uuid }, { text: `${indent}if ${count} > 1024 { ${count} = 1024; }`, scopeUuid: context.uuid, nodeUuid: node.uuid }, { text: `${indent}for ${index} in 0..${count} {`, scopeUuid: context.uuid, nodeUuid: node.uuid }, ...traceEdge(bodyEdge, depth + 1), ...emit(bodyEdge ? topology.nodes.get(bodyEdge.to.nodeUuid) ?? null : null, depth + 1, nextPath), { text: `${indent}}`, scopeUuid: context.uuid, nodeUuid: node.uuid }, ...traceEdge(nextEdge, depth), ...emit(nextEdge ? topology.nodes.get(nextEdge.to.nodeUuid) ?? null : null, depth, nextPath)); return lines }
    const routineMatch = /^routine\.call\.([0-9a-f-]+)$/.exec(node.type)
    if (routineMatch) { const target = graph.routines.find(/* 比较 item.uuid 与 routineMatch[1]，返回严格相等的判断结果。 */ item => item.uuid === routineMatch[1]); if (target && !target.pure) { const parameters = [...(originalRoutineSignature(target) ? [] : [routine && !originalRoutineSignature(routine) ? '__nova_call_depth + 1' : '1']), ...target.inputs.map(/* 调用 inputExpression(node, item.name) 并返回调用结果。 */ item => inputExpression(node, item.name))], call = `${safeIdentifier(target.name)}(${parameters.join(', ')})`, statement = target.outputs.length ? `let ${resultName(node)} = ${call};` : `${call};`; lines.push({ text: `${indent}${statement}`, scopeUuid: context.uuid, nodeUuid: node.uuid }) }; const edge = outputEdge(node, 'next'); lines.push(...traceEdge(edge, depth), ...emit(edge ? topology.nodes.get(edge.to.nodeUuid) ?? null : null, depth, nextPath)); return lines }
    const eventMatch = /^custom\.emit\.([0-9a-f-]+)$/.exec(node.type)
    if (eventMatch) { const event = graph.customEvents.find(/* 比较 item.uuid 与 eventMatch[1]，返回严格相等的判断结果。 */ item => item.uuid === eventMatch[1]); if (event) lines.push({ text: `${indent}${safeIdentifier(event.name)}(${event.parameters.map(/* 调用 inputExpression(node, item.name) 并返回调用结果。 */ item => inputExpression(node, item.name)).join(', ')});`, scopeUuid: context.uuid, nodeUuid: node.uuid }); const edge = outputEdge(node, 'next'); lines.push(...traceEdge(edge, depth), ...emit(edge ? topology.nodes.get(edge.to.nodeUuid) ?? null : null, depth, nextPath)); return lines }
    if (node.type === 'routine.return') { const values = routine?.outputs.map(/* 调用 inputExpression(node, item.name) 并返回调用结果。 */ item => inputExpression(node, item.name)) ?? [], result = values.length === 0 ? '()' : values.length === 1 ? values[0] : `#{ ${(routine?.outputs ?? []).map(/** 按模板 `${rhaiString(item.name)}: ${values[index]}` 生成并返回字符串。 */ (item, index) => `${rhaiString(item.name)}: ${values[index]}`).join(', ')} }`; lines.push({ text: `${indent}return ${result};`, scopeUuid: context.uuid, nodeUuid: node.uuid }); return lines }
    if (node.type === 'reroute.execution' || node.type === 'routine.entry') { const edge = outputEdge(node, 'next'); lines.push(...traceEdge(edge, depth), ...emit(edge ? topology.nodes.get(edge.to.nodeUuid) ?? null : null, depth, nextPath)); return lines }
    return lines
  }
  if (routine) {
    const entry = scope.nodes.find(/* 比较 node.type 与 'routine.entry'，返回严格相等的判断结果。 */ node => node.type === 'routine.entry'), parameters = [...(originalRoutineSignature(routine) ? [] : ['__nova_call_depth']), ...routine.inputs.map(/* 调用 safeIdentifier(item.name) 并返回调用结果。 */ item => safeIdentifier(item.name))], header = `fn ${safeIdentifier(routine.name)}(${parameters.join(', ')}) {${routine.kind !== 'function' ? ` // ${routine.kind}${routine.inline ? ' · inline-safe' : ''}` : ''}`
    const lines: EmittedLine[] = [{ text: header, scopeUuid: context.uuid, nodeUuid: entry?.uuid }]
    for (const local of routine.locals) lines.push({ text: `  let ${safeIdentifier(local.name)} = ${rhaiValue(local.defaultValue)};`, scopeUuid: context.uuid })
    const start = entry ? outputTarget(entry, 'next') : null
    lines.push(...emit(start, 1, new Set(entry ? [entry.uuid] : [])), { text: '}', scopeUuid: context.uuid })
    return lines
  }
  const events = scope.nodes.filter(/* 先计算 node.type.startsWith('event.')；仅当其为假值时求右侧 node.type.startsWith('custom.event.')，返回短路求值结果。 */ node => node.type.startsWith('event.') || node.type.startsWith('custom.event.')).sort(/* 先计算 ordinal(a.type, b.type)；仅当其为假值时求右侧 ordinal(a.uuid, b.uuid)，返回短路求值结果。 */ (a, b) => ordinal(a.type, b.type) || ordinal(a.uuid, b.uuid)), lines: EmittedLine[] = []
  for (const eventNode of events) {
    const customMatch = /^custom\.event\.([0-9a-f-]+)$/.exec(eventNode.type), custom = customMatch ? graph.customEvents.find(/* 比较 item.uuid 与 customMatch[1]，返回严格相等的判断结果。 */ item => item.uuid === customMatch[1]) : null, name = custom?.name ?? eventNode.type.slice(6), parameters = Array.isArray(eventNode.config.rhaiParameters) ? eventNode.config.rhaiParameters.map(/* 调用 safeIdentifier(String(value)) 并返回调用结果。 */ value => safeIdentifier(String(value))) : eventNode.pins.filter(/* 先计算 pin.kind === 'data'；仅当其为真值时求右侧 pin.direction === 'output'，返回短路求值结果。 */ pin => pin.kind === 'data' && pin.direction === 'output').map(/* 调用 safeIdentifier(pin.key) 并返回调用结果。 */ pin => safeIdentifier(pin.key))
    lines.push({ text: `fn ${safeIdentifier(name)}(${parameters.join(', ')}) {`, scopeUuid: context.uuid, nodeUuid: eventNode.uuid }, traceNode(eventNode, 1), ...traceEdge(outputEdge(eventNode, 'next'), 1), ...emit(outputTarget(eventNode, 'next'), 1, new Set([eventNode.uuid])), { text: '}', scopeUuid: context.uuid, nodeUuid: eventNode.uuid }, { text: '' })
  }
  return lines
}

/** 先规范并验证图；结构图直接发射语法源码，旧式图按变量、模块、例程和事件组装，均返回源码映射。 */ export function compileGraph(graphInput: NovaGraphDocument): GraphCompileResult {
  const started = performance.now(), graph = canonicalGraphDocument(graphInput), validation = validateGraph(graph)
  if (!validation.valid) return { ...validation, elapsedMs: performance.now() - started, source: '', graph, mappings: [] }
  if (graph.language) {
    const emitted = emitSyntaxGraph(graph), mappings: GraphSourceMapping[] = []
    for (const range of [...emitted.ranges].sort(/* 计算表达式 (b.end - b.start) - (a.end - a.start) 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => (b.end - b.start) - (a.end - a.start))) {
      const first = syntaxSourceLocation(emitted.text, range.start).line, last = syntaxSourceLocation(emitted.text, range.end).line
      for (let line = first; line <= last; line++) mappings.push({ generatedLine: line, graphUuid: graph.uuid, scopeUuid: graph.uuid, nodeUuid: range.nodeUuid, edgeUuid: '' })
    }
    return { ...validation, elapsedMs: performance.now() - started, source: emitted.text, graph, mappings }
  }
  const lines: EmittedLine[] = [
    { text: `// Generated by Nova_A Visual Scripting · graph ${graph.uuid} · format ${graph.version} · API ${graph.apiVersion}` },
    { text: '// Linked .rhai and .nova-graph assets synchronize in both directions when either asset is saved.' },
    ...graph.variables.map(/** 构造并返回记录 { text: `${variable.exposed ? `@export(${metadata(variable)}) ` : ''}let ${safeIdentifier(variable.name)} = ${rhaiLiteral(variable.defaultValue, variable.sourceLiteral)};` }，字段按当前实参及捕获状态求值。 */ variable => ({ text: `${variable.exposed ? `@export(${metadata(variable)}) ` : ''}let ${safeIdentifier(variable.name)} = ${rhaiLiteral(variable.defaultValue, variable.sourceLiteral)};` })), { text: '' },
    ...graph.nodes.filter(/* 先计算 node.type === 'code.module' && typeof node.config.source === 'string'；仅当其为真值时求右侧 node.config.source.trim()，返回短路求值结果。 */ node => node.type === 'code.module' && typeof node.config.source === 'string' && node.config.source.trim()).flatMap(/** 逐行展开嵌入模块源码，保持所属图节点映射并在模块间插入空行。 */ node => [
      ...String(node.config.source).split(/\r?\n/).map(/** 构造并返回记录 { text, scopeUuid: graph.uuid, nodeUuid: node.uuid }，字段按当前实参及捕获状态求值。 */ text => ({ text, scopeUuid: graph.uuid, nodeUuid: node.uuid })),
      { text: '' }
    ])
  ]
  for (const routine of graph.routines) lines.push(...compileScope(graph, { uuid: routine.uuid, name: routine.name, scope: routine, routine }), { text: '' })
  lines.push(...compileScope(graph, { uuid: graph.uuid, name: graph.name, scope: graph, routine: null }))
  while (lines.length && lines[lines.length - 1]?.text === '') lines.pop()
  const source = `${lines.map(/* 返回 line.text 的当前值。 */ line => line.text).join('\n')}\n`, mappings = lines.flatMap(/** 仅为带图位置信息的生成行创建一基行号映射；纯分隔行不产生映射。 */ (line, index): GraphSourceMapping[] => line.scopeUuid || line.nodeUuid || line.edgeUuid ? [{ generatedLine: index + 1, graphUuid: graph.uuid, scopeUuid: line.scopeUuid ?? graph.uuid, nodeUuid: line.nodeUuid ?? '', edgeUuid: line.edgeUuid ?? '' }] : [])
  return { ...validation, elapsedMs: performance.now() - started, source, graph, mappings }
}

/* 调用 compileGraph(parseGraphDocument(source)) 并返回调用结果。 */ export function compileGraphSource(source: string): GraphCompileResult { return compileGraph(parseGraphDocument(source)) }
/** 编译图文本；存在错误时汇总诊断抛出异常，否则返回可执行源码。 */ export function executableGraphSource(source: string): string { const result = compileGraphSource(source); if (!result.valid) throw new Error(result.diagnostics.filter(/* 比较 item.severity 与 'error'，返回严格相等的判断结果。 */ item => item.severity === 'error').map(/** 按模板 `${item.code}: ${item.message}` 生成并返回字符串。 */ item => `${item.code}: ${item.message}`).join('\n')); return result.source }
