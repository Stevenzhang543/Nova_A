/** 图生产编辑操作：维护例程及签名、稳定引用和节点迁移，执行函数提取、语义差异、三方合并及热重载兼容分析。 */
import { createGraphNode, graphNodeDefinition } from './graphCatalog'
import { canonicalGraphDocument, defaultGraphValue, graphUuid, parseGraphDocument, serializeGraphDocument, type GraphCanvasScope, type GraphCustomEvent, type GraphInterface, type GraphParameter, type GraphRoutine, type GraphRoutineKind, type GraphValue, type GraphValueType, type NovaGraphDocument } from './graphTypes'

export type GraphReferenceKind = 'variable' | 'local' | 'routine' | 'event' | 'interface' | 'library' | 'node'
export interface GraphReference { kind: GraphReferenceKind; targetUuid: string; scopeUuid: string; nodeUuid: string; label: string }
export interface GraphSemanticChange { identity: string; kind: 'added' | 'removed' | 'modified' | 'moved' | 'renamed'; path: string; before: unknown; after: unknown }
export interface GraphMergeConflict { id: string; identity: string; path: string; base: unknown; ours: unknown; theirs: unknown; resolution: 'unresolved' | 'ours' | 'theirs' }
export interface GraphMergeResult { graph: NovaGraphDocument; conflicts: GraphMergeConflict[]; changes: GraphSemanticChange[] }
export interface GraphHotReloadPlan { compatible: boolean; reasons: string[]; preserved: Record<string, GraphValue>; initialized: string[]; dropped: string[] }

/** 清理脚本标识符并限制为八十字符；清理后为空时使用备用名。 */ function identifier(value: string, fallback: string): string { const safe = value.trim().replace(/[^A-Za-z0-9_]/g, '_').replace(/^[^A-Za-z_]+/, '').slice(0, 80); return safe || fallback }
/* 根据 a < b 的真假，分别返回 -1 或 a > b ? 1 : 0。 */ function ordinal(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0 }
/** 构造并返回记录 { uuid: graphUuid(), name: identifier(name, 'value'), valueType, defaultValue: defaultGraphValue(valueType), tooltip: '' }，字段按当前实参及捕获状态求值。 */ function parameter(name: string, valueType: GraphValueType = 'Data'): GraphParameter { return { uuid: graphUuid(), name: identifier(name, 'value'), valueType, defaultValue: defaultGraphValue(valueType), tooltip: '' } }
/* 返回具有所列字段的新对象 { nodes: [], edges: [], comments: [], viewport: { x: 80, y: 80, zoom: 1 } }。 */ function emptyScope(): GraphCanvasScope { return { nodes: [], edges: [], comments: [], viewport: { x: 80, y: 80, zoom: 1 } } }

/** 创建独立例程及入口、返回节点，并用初始执行连线连接两者。 */ export function createGraphRoutine(kind: GraphRoutineKind, name: string): GraphRoutine {
  const routine: GraphRoutine = { uuid: graphUuid(), name: identifier(name, kind), kind, description: '', inputs: [], outputs: [], locals: [], pure: false, inline: kind === 'macro', interfaceUuid: null, deprecatedNames: [], ...emptyScope() }
  const entry = createGraphNode('routine.entry', 80, 120, { ...({ routines: [routine] } as unknown as NovaGraphDocument) }, routine)
  const exit = createGraphNode('routine.return', 420, 120, { ...({ routines: [routine] } as unknown as NovaGraphDocument) }, routine)
  routine.nodes.push(entry, exit)
  routine.edges.push({ uuid: graphUuid(), from: { nodeUuid: entry.uuid, pinUuid: entry.pins.find(/* 比较 pin.key 与 'next'，返回严格相等的判断结果。 */ pin => pin.key === 'next')!.uuid }, to: { nodeUuid: exit.uuid, pinUuid: exit.pins.find(/* 比较 pin.key 与 'exec'，返回严格相等的判断结果。 */ pin => pin.key === 'exec')!.uuid } })
  return routine
}

/* 返回具有所列字段的新对象 { uuid: graphUuid(), name: identifier(name, 'custom_event'), parameters: [], description: '' }。 */ export function createGraphCustomEvent(name: string): GraphCustomEvent { return { uuid: graphUuid(), name: identifier(name, 'custom_event'), parameters: [], description: '' } }
/** 构造并返回记录 { uuid: graphUuid(), name: identifier(name, 'graph_interface'), description: '', methods: [{ uuid: graphUuid(), name: 'execute', inputs: [], outputs: [] }] }，字段按当前实参及捕获状态求值。 */ export function createGraphInterface(name: string): GraphInterface { return { uuid: graphUuid(), name: identifier(name, 'graph_interface'), description: '', methods: [{ uuid: graphUuid(), name: 'execute', inputs: [], outputs: [] }] } }
/** 为选定输入或输出方向创建带稳定标识的参数，加入签名后返回。 */ export function addRoutineParameter(routine: GraphRoutine, direction: 'input' | 'output', name: string, valueType: GraphValueType): GraphParameter { const item = parameter(name, valueType); routine[direction === 'input' ? 'inputs' : 'outputs'].push(item); return item }

/** 枚举主图和例程画布，并保留作用域 UUID 与例程上下文。 */ function scopes(graph: NovaGraphDocument): Array<{ uuid: string; scope: GraphCanvasScope; routine: GraphRoutine | null }> { return [{ uuid: graph.uuid, scope: graph, routine: null }, ...graph.routines.map(/** 构造并返回记录 { uuid: routine.uuid, scope: routine, routine }，字段按当前实参及捕获状态求值。 */ routine => ({ uuid: routine.uuid, scope: routine, routine }))] }

/** 按最新例程、事件及局部变量定义重建相关节点引脚，尽量保留兼容引脚身份和值，并移除失效端点连线。 */ export function synchronizeGraphSignatures(graph: NovaGraphDocument): void {
  for (const { scope, routine } of scopes(graph)) {
    for (const node of scope.nodes) {
      if (!(node.type === 'routine.entry' || node.type === 'routine.return' || node.type.startsWith('routine.call.') || node.type.startsWith('custom.event.') || node.type.startsWith('custom.emit.') || node.type.startsWith('local.'))) continue
      const definition = graphNodeDefinition(node.type, graph, routine)
      if (!definition) continue
      const previous = new Map(node.pins.map(/* 返回按声明顺序构造的数组 [`${pin.direction}:${pin.key}`, pin]。 */ pin => [`${pin.direction}:${pin.key}`, pin]))
      const refreshed = createGraphNode(node.type, node.position.x, node.position.y, graph, routine)
      node.title = refreshed.title; node.category = refreshed.category
      node.pins = refreshed.pins.map(/** 按方向与键匹配旧引脚，类型仍兼容时保留稳定 UUID 及默认值。 */ pin => {
        const old = previous.get(`${pin.direction}:${pin.key}`)
        return old && old.kind === pin.kind && (old.valueType === pin.valueType || old.valueType === 'Data' || pin.valueType === 'Data') ? { ...pin, uuid: old.uuid, defaultValue: old.defaultValue } : pin
      })
      node.size.height = Math.max(82, 46 + node.pins.length * 26)
    }
    const validNodes = new Set(scope.nodes.map(/* 返回 node.uuid 的当前值。 */ node => node.uuid)), validPins = new Set(scope.nodes.flatMap(/** 提取节点所有引脚的稳定标识，用于签名刷新后的连线有效性检查。 */ node => node.pins.map(/* 返回 pin.uuid 的当前值。 */ pin => pin.uuid)))
    scope.edges = scope.edges.filter(/** 只保留起终节点和起终引脚全部仍存在的连线。 */ edge => validNodes.has(edge.from.nodeUuid) && validNodes.has(edge.to.nodeUuid) && validPins.has(edge.from.pinUuid) && validPins.has(edge.to.pinUuid))
  }
}

/** 收集配置、节点类型及接口声明对目标 UUID 的引用，按作用域与节点稳定排序。 */ export function findGraphReferences(graph: NovaGraphDocument, targetUuid: string): GraphReference[] {
  const output: GraphReference[] = []
  for (const { uuid, scope, routine } of scopes(graph)) for (const node of scope.nodes) {
    const values = Object.values(node.config).map(String)
    if (values.includes(targetUuid) || node.type.endsWith(targetUuid)) output.push({ kind: node.type.startsWith('routine.call.') ? 'routine' : node.type.startsWith('custom.') ? 'event' : node.type.startsWith('local.') ? 'local' : node.type.startsWith('variable.') ? 'variable' : 'node', targetUuid, scopeUuid: uuid, nodeUuid: node.uuid, label: `${routine?.name ?? graph.name} / ${node.title}` })
  }
  for (const routine of graph.routines) if (routine.interfaceUuid === targetUuid) output.push({ kind: 'interface', targetUuid, scopeUuid: routine.uuid, nodeUuid: '', label: `${routine.name} implements interface` })
  return output.sort(/* 先计算 ordinal(a.scopeUuid, b.scopeUuid)；仅当其为假值时求右侧 ordinal(a.nodeUuid, b.nodeUuid)，返回短路求值结果。 */ (a, b) => ordinal(a.scopeUuid, b.scopeUuid) || ordinal(a.nodeUuid, b.nodeUuid))
}

/** 定位可重命名声明并规范新名称，保留旧例程名及迁移记录后返回受影响引用。 */ export function renameGraphSymbol(graph: NovaGraphDocument, targetUuid: string, requestedName: string): GraphReference[] {
  const collections = [graph.variables, graph.routines, graph.customEvents, graph.interfaces, ...graph.routines.map(/* 返回 routine.locals 的当前值。 */ routine => routine.locals)] as Array<Array<{ uuid: string; name: string }>>
  const target = collections.flat().find(/* 比较 item.uuid 与 targetUuid，返回严格相等的判断结果。 */ item => item.uuid === targetUuid)
  if (!target) throw new Error('The graph symbol no longer exists.')
  const previous = target.name, next = identifier(requestedName, previous)
  if (next === previous) return findGraphReferences(graph, targetUuid)
  target.name = next
  if ('deprecatedNames' in target && Array.isArray(target.deprecatedNames) && !target.deprecatedNames.includes(previous)) target.deprecatedNames.push(previous)
  graph.migrations.push({ uuid: graphUuid(), kind: 'rename', from: previous, to: next, appliedAt: new Date().toISOString() })
  return findGraphReferences(graph, targetUuid)
}

/** 检查目标及替换定义，保留节点身份与配置和兼容引脚身份，删除失效连线并记录迁移。 */ export function replaceGraphNodeType(graph: NovaGraphDocument, nodeUuid: string, replacementType: string): void {
  const found = scopes(graph).flatMap(/* 调用 item.scope.nodes.map(node => ({ ...item, node })) 并返回调用结果。 */ item => item.scope.nodes.map(/** 构造并返回记录 { ...item, node }，字段按当前实参及捕获状态求值。 */ node => ({ ...item, node }))).find(/* 比较 item.node.uuid 与 nodeUuid，返回严格相等的判断结果。 */ item => item.node.uuid === nodeUuid)
  if (!found) throw new Error('The graph node no longer exists.')
  const definition = graphNodeDefinition(replacementType, graph, found.routine)
  if (!definition) throw new Error(`Replacement node type ${replacementType} is unavailable.`)
  const old = found.node, oldPins = new Map(old.pins.map(/* 返回按声明顺序构造的数组 [pin.key, pin]。 */ pin => [pin.key, pin]))
  const replacement = createGraphNode(replacementType, old.position.x, old.position.y, graph, found.routine)
  replacement.uuid = old.uuid; replacement.collapsed = old.collapsed; replacement.config = { ...old.config }
  for (const pin of replacement.pins) {
    const previous = oldPins.get(pin.key)
    if (previous && previous.direction === pin.direction && previous.kind === pin.kind && (previous.valueType === pin.valueType || previous.valueType === 'Data' || pin.valueType === 'Data')) pin.uuid = previous.uuid
  }
  const validPins = new Set(replacement.pins.map(/* 返回 pin.uuid 的当前值。 */ pin => pin.uuid))
  found.scope.nodes.splice(found.scope.nodes.indexOf(old), 1, replacement)
  found.scope.edges = found.scope.edges.filter(/** 保留不涉及替换节点的端点，涉及替换节点的端点必须仍属于有效引脚。 */ edge => (edge.from.nodeUuid !== old.uuid || validPins.has(edge.from.pinUuid)) && (edge.to.nodeUuid !== old.uuid || validPins.has(edge.to.pinUuid)))
  graph.migrations.push({ uuid: graphUuid(), kind: 'replace', from: old.type, to: replacementType, appliedAt: new Date().toISOString() })
}

/** 遍历所有画布，对已声明替代类型的旧节点执行替换并返回数量。 */ export function migrateDeprecatedGraphNodes(graph: NovaGraphDocument): number {
  let changed = 0
  for (const { scope, routine } of scopes(graph)) for (const node of [...scope.nodes]) {
    const replacement = graphNodeDefinition(node.type, graph, routine)?.deprecatedBy
    if (replacement) { replaceGraphNodeType(graph, node.uuid, replacement); changed++ }
  }
  return changed
}

/** 要求选区没有生命周期入口且至多一个执行入口和出口；移动节点到新例程并将边界数据与执行连线接到新调用节点。 */ export function extractGraphFunction(graph: NovaGraphDocument, selected: ReadonlySet<string>, requestedName: string): GraphRoutine {
  const nodes = graph.nodes.filter(/* 调用 selected.has(node.uuid) 并返回调用结果。 */ node => selected.has(node.uuid))
  if (!nodes.length) throw new Error('Select at least one main-graph node to extract.')
  if (nodes.some(/* 调用 node.type.startsWith('event.') 并返回调用结果。 */ node => node.type.startsWith('event.'))) throw new Error('Lifecycle event nodes cannot be extracted; select the nodes after the event.')
  const nodeIds = new Set(nodes.map(/* 返回 node.uuid 的当前值。 */ node => node.uuid)), internal = graph.edges.filter(/* 先计算 nodeIds.has(edge.from.nodeUuid)；仅当其为真值时求右侧 nodeIds.has(edge.to.nodeUuid)，返回短路求值结果。 */ edge => nodeIds.has(edge.from.nodeUuid) && nodeIds.has(edge.to.nodeUuid))
  const incoming = graph.edges.filter(/* 先计算 !nodeIds.has(edge.from.nodeUuid)；仅当其为真值时求右侧 nodeIds.has(edge.to.nodeUuid)，返回短路求值结果。 */ edge => !nodeIds.has(edge.from.nodeUuid) && nodeIds.has(edge.to.nodeUuid)), outgoing = graph.edges.filter(/* 先计算 nodeIds.has(edge.from.nodeUuid)；仅当其为真值时求右侧 !nodeIds.has(edge.to.nodeUuid)，返回短路求值结果。 */ edge => nodeIds.has(edge.from.nodeUuid) && !nodeIds.has(edge.to.nodeUuid))
  const pinOwner = new Map(graph.nodes.flatMap(/* 调用 node.pins.map(pin => [pin.uuid, { node, pin }] as const) 并返回调用结果。 */ node => node.pins.map(/** 将引脚 UUID 关联到所属节点和引脚对象，供提取函数时解析边界。 */ pin => [pin.uuid, { node, pin }] as const)))
  const incomingExec = incoming.filter(/* 比较 pinOwner.get(edge.to.pinUuid)?.pin.kind 与 'execution'，返回严格相等的判断结果。 */ edge => pinOwner.get(edge.to.pinUuid)?.pin.kind === 'execution'), outgoingExec = outgoing.filter(/* 比较 pinOwner.get(edge.from.pinUuid)?.pin.kind 与 'execution'，返回严格相等的判断结果。 */ edge => pinOwner.get(edge.from.pinUuid)?.pin.kind === 'execution')
  if (incomingExec.length > 1 || outgoingExec.length > 1) throw new Error('Extract Function requires a single execution entrance and exit.')
  const routine = createGraphRoutine('function', requestedName), entry = routine.nodes.find(/* 比较 node.type 与 'routine.entry'，返回严格相等的判断结果。 */ node => node.type === 'routine.entry')!, exit = routine.nodes.find(/* 比较 node.type 与 'routine.return'，返回严格相等的判断结果。 */ node => node.type === 'routine.return')!
  routine.nodes.splice(0, routine.nodes.length, ...nodes, entry, exit); routine.edges.splice(0)
  const minX = Math.min(...nodes.map(/* 返回 node.position.x 的当前值。 */ node => node.position.x)), minY = Math.min(...nodes.map(/* 返回 node.position.y 的当前值。 */ node => node.position.y))
  for (const node of nodes) { node.position.x -= minX - 300; node.position.y -= minY - 120 }
  entry.position = { x: 20, y: 120 }; exit.position = { x: Math.max(620, ...nodes.map(/* 计算表达式 node.position.x + node.size.width + 100 并返回结果，沿用操作数的原有类型规则。 */ node => node.position.x + node.size.width + 100)), y: 120 }
  routine.edges.push(...internal)
  for (const edge of incoming.filter(/* 比较 pinOwner.get(edge.to.pinUuid)?.pin.kind 与 'data'，返回严格相等的判断结果。 */ edge => pinOwner.get(edge.to.pinUuid)?.pin.kind === 'data')) {
    const target = pinOwner.get(edge.to.pinUuid)!, item = parameter(target.pin.key, target.pin.valueType ?? 'Data'); routine.inputs.push(item)
  }
  for (const edge of outgoing.filter(/* 比较 pinOwner.get(edge.from.pinUuid)?.pin.kind 与 'data'，返回严格相等的判断结果。 */ edge => pinOwner.get(edge.from.pinUuid)?.pin.kind === 'data')) {
    const source = pinOwner.get(edge.from.pinUuid)!, item = parameter(source.pin.key, source.pin.valueType ?? 'Data'); routine.outputs.push(item)
  }
  entry.pins = [{ uuid: graphUuid(), key: 'next', name: 'Next', direction: 'output', kind: 'execution', valueType: null, required: false, defaultValue: null }, ...routine.inputs.map(/** 把例程输入参数映射为入口节点的数据输出引脚。 */ item => ({ uuid: graphUuid(), key: item.name, name: item.name, direction: 'output' as const, kind: 'data' as const, valueType: item.valueType, required: false, defaultValue: item.defaultValue }))]
  exit.pins = [{ uuid: graphUuid(), key: 'exec', name: 'In', direction: 'input', kind: 'execution', valueType: null, required: false, defaultValue: null }, ...routine.outputs.map(/** 把例程输出参数映射为返回节点的必填数据输入引脚。 */ item => ({ uuid: graphUuid(), key: item.name, name: item.name, direction: 'input' as const, kind: 'data' as const, valueType: item.valueType, required: true, defaultValue: item.defaultValue }))]
  if (incomingExec[0]) routine.edges.push({ uuid: graphUuid(), from: { nodeUuid: entry.uuid, pinUuid: entry.pins[0].uuid }, to: { ...incomingExec[0].to } })
  if (outgoingExec[0]) routine.edges.push({ uuid: graphUuid(), from: { ...outgoingExec[0].from }, to: { nodeUuid: exit.uuid, pinUuid: exit.pins[0].uuid } })
  const incomingData = incoming.filter(/* 比较 pinOwner.get(edge.to.pinUuid)?.pin.kind 与 'data'，返回严格相等的判断结果。 */ edge => pinOwner.get(edge.to.pinUuid)?.pin.kind === 'data'), outgoingData = outgoing.filter(/* 比较 pinOwner.get(edge.from.pinUuid)?.pin.kind 与 'data'，返回严格相等的判断结果。 */ edge => pinOwner.get(edge.from.pinUuid)?.pin.kind === 'data')
  incomingData.forEach(/** 从新例程入口对应数据引脚接回选区内原数据目标。 */ (edge, index) => routine.edges.push({ uuid: graphUuid(), from: { nodeUuid: entry.uuid, pinUuid: entry.pins[index + 1].uuid }, to: { ...edge.to } }))
  outgoingData.forEach(/** 把选区内原数据来源接入新例程返回节点对应引脚。 */ (edge, index) => routine.edges.push({ uuid: graphUuid(), from: { ...edge.from }, to: { nodeUuid: exit.uuid, pinUuid: exit.pins[index + 1].uuid } }))
  routine.pure = incomingExec.length === 0 && outgoingExec.length === 0
  graph.routines.push(routine)
  const call = createGraphNode(`routine.call.${routine.uuid}`, minX, minY, graph)
  graph.nodes = graph.nodes.filter(/* 返回 nodeIds.has(node.uuid) 的逻辑取反结果。 */ node => !nodeIds.has(node.uuid)); graph.edges = graph.edges.filter(/* 先计算 !nodeIds.has(edge.from.nodeUuid)；仅当其为真值时求右侧 !nodeIds.has(edge.to.nodeUuid)，返回短路求值结果。 */ edge => !nodeIds.has(edge.from.nodeUuid) && !nodeIds.has(edge.to.nodeUuid)); graph.nodes.push(call)
  const callInputExec = call.pins.find(/* 比较 pin.key 与 'exec'，返回严格相等的判断结果。 */ pin => pin.key === 'exec'), callOutputExec = call.pins.find(/* 比较 pin.key 与 'next'，返回严格相等的判断结果。 */ pin => pin.key === 'next')
  if (incomingExec[0] && callInputExec) graph.edges.push({ uuid: graphUuid(), from: { ...incomingExec[0].from }, to: { nodeUuid: call.uuid, pinUuid: callInputExec.uuid } })
  if (outgoingExec[0] && callOutputExec) graph.edges.push({ uuid: graphUuid(), from: { nodeUuid: call.uuid, pinUuid: callOutputExec.uuid }, to: { ...outgoingExec[0].to } })
  incomingData.forEach(/** 根据参数方向和名称查找新调用节点引脚，并将原选区外数据连线接回新调用边界。 */ (edge, index) => { const pin = call.pins.find(/* 先计算 item.key === routine.inputs[index]?.name；仅当其为真值时求右侧 item.direction === 'input'，返回短路求值结果。 */ item => item.key === routine.inputs[index]?.name && item.direction === 'input'); if (pin) graph.edges.push({ uuid: graphUuid(), from: { ...edge.from }, to: { nodeUuid: call.uuid, pinUuid: pin.uuid } }) })
  outgoingData.forEach(/** 根据参数方向和名称查找新调用节点引脚，并将原选区外数据连线接回新调用边界。 */ (edge, index) => { const pin = call.pins.find(/* 先计算 item.key === routine.outputs[index]?.name；仅当其为真值时求右侧 item.direction === 'output'，返回短路求值结果。 */ item => item.key === routine.outputs[index]?.name && item.direction === 'output'); if (pin) graph.edges.push({ uuid: graphUuid(), from: { nodeUuid: call.uuid, pinUuid: pin.uuid }, to: { ...edge.to } }) })
  return routine
}

/** 递归按键排序对象，保留数组顺序，生成用于稳定比较的值结构。 */ function stableObject(value: unknown): unknown { if (Array.isArray(value)) return value.map(stableObject); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(/* 调用 ordinal(a, b) 并返回调用结果。 */ ([a], [b]) => ordinal(a, b)).map(/* 返回按声明顺序构造的数组 [key, stableObject(item)]。 */ ([key, item]) => [key, stableObject(item)])); return value }
/* 调用 JSON.stringify(stableObject(value)) 并返回调用结果。 */ function stable(value: unknown): string { return JSON.stringify(stableObject(value)) }
/** 按 UUID 展开图声明、作用域、节点、连线和注释，记录各自语义路径。 */ function identityItems(graph: NovaGraphDocument): Map<string, { path: string; value: unknown }> {
  const output = new Map<string, { path: string; value: unknown }>(), add = /* 调用 output.set(identity, { path, value }) 并返回调用结果。 */ (identity: string, path: string, value: unknown) => output.set(identity, { path, value })
  add(graph.uuid, 'graph', { ...graph, variables: undefined, routines: undefined, nodes: undefined, edges: undefined, comments: undefined, customEvents: undefined, interfaces: undefined, libraries: undefined, migrations: undefined })
  for (const variable of graph.variables) add(variable.uuid, `variables/${variable.name}`, variable)
  for (const event of graph.customEvents) add(event.uuid, `events/${event.name}`, event)
  for (const contract of graph.interfaces) { add(contract.uuid, `interfaces/${contract.name}`, contract); for (const method of contract.methods) add(method.uuid, `interfaces/${contract.name}/${method.name}`, method) }
  for (const library of graph.libraries) add(library.uuid, `libraries/${library.packageId}/${library.libraryId}`, library)
  for (const { uuid, scope, routine } of scopes(graph)) { if (routine) add(routine.uuid, `routines/${routine.name}`, { ...routine, nodes: undefined, edges: undefined, comments: undefined }); for (const node of scope.nodes) add(node.uuid, `${routine?.name ?? 'main'}/nodes/${node.title}`, node); for (const edge of scope.edges) add(edge.uuid, `${routine?.name ?? 'main'}/edges`, edge); for (const comment of scope.comments) add(comment.uuid, `${routine?.name ?? 'main'}/comments`, comment); void uuid }
  return output
}

/** 按稳定身份比较规范化图记录，区分新增、移除、改名、移动及其他修改。 */ export function semanticGraphDiff(beforeInput: NovaGraphDocument | string, afterInput: NovaGraphDocument | string): GraphSemanticChange[] {
  const before = identityItems(typeof beforeInput === 'string' ? parseGraphDocument(beforeInput) : canonicalGraphDocument(beforeInput)), after = identityItems(typeof afterInput === 'string' ? parseGraphDocument(afterInput) : canonicalGraphDocument(afterInput)), identities = [...new Set([...before.keys(), ...after.keys()])].sort(ordinal), changes: GraphSemanticChange[] = []
  for (const identity of identities) {
    const first = before.get(identity), second = after.get(identity)
    if (!first) changes.push({ identity, kind: 'added', path: second!.path, before: null, after: second!.value })
    else if (!second) changes.push({ identity, kind: 'removed', path: first.path, before: first.value, after: null })
    else if (stable(first.value) !== stable(second.value)) { const firstValue = first.value as Record<string, unknown>, secondValue = second.value as Record<string, unknown>; const kind = firstValue?.name !== secondValue?.name ? 'renamed' : firstValue?.position && stable(firstValue.position) !== stable(secondValue?.position) ? 'moved' : 'modified'; changes.push({ identity, kind, path: second.path, before: first.value, after: second.value }) }
  }
  return changes
}

/** 递归三方合并对象及具有 UUID 的数组；单方变更直接采纳，双方冲突保留我方值并登记冲突。 */ function mergeValue(base: unknown, ours: unknown, theirs: unknown, identity: string, path: string, conflicts: GraphMergeConflict[]): unknown {
  if (stable(ours) === stable(theirs)) return ours
  if (stable(base) === stable(ours)) return theirs
  if (stable(base) === stable(theirs)) return ours
  if (Array.isArray(base) && Array.isArray(ours) && Array.isArray(theirs) && [...base, ...ours, ...theirs].every(/* 先计算 item && typeof item === 'object'；仅当其为真值时求右侧 'uuid' in item，返回短路求值结果。 */ item => item && typeof item === 'object' && 'uuid' in item)) {
    const byId = /** 将带 UUID 的数组转换为身份索引，供三方合并逐项对齐。 */ (items: unknown[]) => new Map(items.map(/* 返回按声明顺序构造的数组 [String((item as { uuid: unknown }).uuid), item]。 */ item => [String((item as { uuid: unknown }).uuid), item])), b = byId(base), o = byId(ours), t = byId(theirs)
    return [...new Set([...b.keys(), ...o.keys(), ...t.keys()])].sort(ordinal).flatMap(/** 合并同一 UUID 的三方记录，已删除的结果不加入输出数组。 */ id => { const merged = mergeValue(b.get(id), o.get(id), t.get(id), id, `${path}/${id}`, conflicts); return merged === undefined ? [] : [merged] })
  }
  if (base && ours && theirs && typeof base === 'object' && typeof ours === 'object' && typeof theirs === 'object' && !Array.isArray(base) && !Array.isArray(ours) && !Array.isArray(theirs)) {
    const keys = [...new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])].sort(ordinal), result: Record<string, unknown> = {}
    for (const key of keys) result[key] = mergeValue((base as Record<string, unknown>)[key], (ours as Record<string, unknown>)[key], (theirs as Record<string, unknown>)[key], identity, `${path}/${key}`, conflicts)
    return result
  }
  const conflict: GraphMergeConflict = { id: graphUuid(), identity, path, base, ours, theirs, resolution: 'unresolved' }; conflicts.push(conflict); return ours
}

/** 解析并规范三份图文档，按稳定身份三方合并，返回合并图、冲突和相对基础图的差异。 */ export function mergeGraphs(baseInput: NovaGraphDocument | string, oursInput: NovaGraphDocument | string, theirsInput: NovaGraphDocument | string): GraphMergeResult {
  const base = typeof baseInput === 'string' ? JSON.parse(serializeGraphDocument(parseGraphDocument(baseInput))) : canonicalGraphDocument(baseInput), ours = typeof oursInput === 'string' ? JSON.parse(serializeGraphDocument(parseGraphDocument(oursInput))) : canonicalGraphDocument(oursInput), theirs = typeof theirsInput === 'string' ? JSON.parse(serializeGraphDocument(parseGraphDocument(theirsInput))) : canonicalGraphDocument(theirsInput), conflicts: GraphMergeConflict[] = []
  const merged = parseGraphDocument(`${JSON.stringify(mergeValue(base, ours, theirs, base.uuid, 'graph', conflicts))}\n`)
  return { graph: merged, conflicts, changes: semanticGraphDiff(base, merged) }
}

/** 沿语义路径定位冲突记录，应用我方或对方的替换、插入或删除，并重新解析规范化图。 */ export function applyGraphConflict(result: GraphMergeResult, conflictId: string, resolution: 'ours' | 'theirs'): GraphMergeResult {
  const conflict = result.conflicts.find(/* 比较 item.id 与 conflictId，返回严格相等的判断结果。 */ item => item.id === conflictId)
  if (!conflict) return result
  conflict.resolution = resolution
  const segments = conflict.path.split('/').filter(Boolean).slice(1)
  let current: unknown = result.graph
  for (const segment of segments.slice(0, -1)) {
    if (Array.isArray(current)) current = current.find(/* 先计算 item && typeof item === 'object'；仅当其为真值时求右侧 String((item as { uuid?: unknown }).uuid) === segment，返回短路求值结果。 */ item => item && typeof item === 'object' && String((item as { uuid?: unknown }).uuid) === segment)
    else if (current && typeof current === 'object') current = (current as Record<string, unknown>)[segment]
    else current = undefined
  }
  const last = segments[segments.length - 1], selected = resolution === 'ours' ? conflict.ours : conflict.theirs
  if (last && Array.isArray(current)) {
    const index = current.findIndex(/* 先计算 item && typeof item === 'object'；仅当其为真值时求右侧 String((item as { uuid?: unknown }).uuid) === last，返回短路求值结果。 */ item => item && typeof item === 'object' && String((item as { uuid?: unknown }).uuid) === last)
    if (selected === undefined && index >= 0) current.splice(index, 1)
    else if (index >= 0) current.splice(index, 1, selected)
    else if (selected !== undefined) current.push(selected)
  } else if (last && current && typeof current === 'object') {
    if (selected === undefined) delete (current as Record<string, unknown>)[last]
    else (current as Record<string, unknown>)[last] = selected
  }
  return { graph: parseGraphDocument(serializeGraphDocument(result.graph)), conflicts: result.conflicts, changes: result.changes }
}

/** 按 UUID 与类型和序列化生命周期保留兼容变量状态；列出新增、移除和公共例程签名变化作为重载判断依据。 */ export function planGraphHotReload(previousInput: NovaGraphDocument | string, candidateInput: NovaGraphDocument | string, state: Record<string, GraphValue>): GraphHotReloadPlan {
  const previous = typeof previousInput === 'string' ? parseGraphDocument(previousInput) : previousInput, candidate = typeof candidateInput === 'string' ? parseGraphDocument(candidateInput) : candidateInput, reasons: string[] = [], preserved: Record<string, GraphValue> = {}, initialized: string[] = [], dropped: string[] = [], before = new Map(previous.variables.map(/* 返回按声明顺序构造的数组 [item.uuid, item]。 */ item => [item.uuid, item]))
  for (const variable of candidate.variables) { const old = before.get(variable.uuid); if (old && old.valueType === variable.valueType && old.serialized === variable.serialized) preserved[variable.name] = state[old.name] ?? old.defaultValue; else { initialized.push(variable.name); if (old) reasons.push(`Variable ${variable.name} changed type or lifetime.`) } }
  for (const variable of previous.variables) if (!candidate.variables.some(/* 比较 item.uuid 与 variable.uuid，返回严格相等的判断结果。 */ item => item.uuid === variable.uuid)) { dropped.push(variable.name); if (variable.serialized) reasons.push(`Serialized variable ${variable.name} was removed.`) }
  const previousRoutines = new Map(previous.routines.map(/* 返回按声明顺序构造的数组 [item.uuid, item]。 */ item => [item.uuid, item]))
  for (const routine of candidate.routines) { const old = previousRoutines.get(routine.uuid); if (old && stable({ inputs: old.inputs, outputs: old.outputs, kind: old.kind }) !== stable({ inputs: routine.inputs, outputs: routine.outputs, kind: routine.kind })) reasons.push(`Routine ${routine.name} changed its public signature.`) }
  return { compatible: reasons.length === 0, reasons: reasons.length ? reasons : ['Stable identities and serialized variable layouts are compatible.'], preserved, initialized, dropped }
}
