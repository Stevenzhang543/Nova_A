import { createGraphNode, graphNodeDefinition } from './graphCatalog'
import { canonicalGraphDocument, defaultGraphValue, graphUuid, parseGraphDocument, serializeGraphDocument, type GraphCanvasScope, type GraphCustomEvent, type GraphInterface, type GraphParameter, type GraphRoutine, type GraphRoutineKind, type GraphValue, type GraphValueType, type NovaGraphDocument } from './graphTypes'

export type GraphReferenceKind = 'variable' | 'local' | 'routine' | 'event' | 'interface' | 'library' | 'node'
export interface GraphReference { kind: GraphReferenceKind; targetUuid: string; scopeUuid: string; nodeUuid: string; label: string }
export interface GraphSemanticChange { identity: string; kind: 'added' | 'removed' | 'modified' | 'moved' | 'renamed'; path: string; before: unknown; after: unknown }
export interface GraphMergeConflict { id: string; identity: string; path: string; base: unknown; ours: unknown; theirs: unknown; resolution: 'unresolved' | 'ours' | 'theirs' }
export interface GraphMergeResult { graph: NovaGraphDocument; conflicts: GraphMergeConflict[]; changes: GraphSemanticChange[] }
export interface GraphHotReloadPlan { compatible: boolean; reasons: string[]; preserved: Record<string, GraphValue>; initialized: string[]; dropped: string[] }

function identifier(value: string, fallback: string): string { const safe = value.trim().replace(/[^A-Za-z0-9_]/g, '_').replace(/^[^A-Za-z_]+/, '').slice(0, 80); return safe || fallback }
function ordinal(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0 }
function parameter(name: string, valueType: GraphValueType = 'Data'): GraphParameter { return { uuid: graphUuid(), name: identifier(name, 'value'), valueType, defaultValue: defaultGraphValue(valueType), tooltip: '' } }
function emptyScope(): GraphCanvasScope { return { nodes: [], edges: [], comments: [], viewport: { x: 80, y: 80, zoom: 1 } } }

export function createGraphRoutine(kind: GraphRoutineKind, name: string): GraphRoutine {
  const routine: GraphRoutine = { uuid: graphUuid(), name: identifier(name, kind), kind, description: '', inputs: [], outputs: [], locals: [], pure: false, inline: kind === 'macro', interfaceUuid: null, deprecatedNames: [], ...emptyScope() }
  const entry = createGraphNode('routine.entry', 80, 120, { ...({ routines: [routine] } as unknown as NovaGraphDocument) }, routine)
  const exit = createGraphNode('routine.return', 420, 120, { ...({ routines: [routine] } as unknown as NovaGraphDocument) }, routine)
  routine.nodes.push(entry, exit)
  routine.edges.push({ uuid: graphUuid(), from: { nodeUuid: entry.uuid, pinUuid: entry.pins.find(pin => pin.key === 'next')!.uuid }, to: { nodeUuid: exit.uuid, pinUuid: exit.pins.find(pin => pin.key === 'exec')!.uuid } })
  return routine
}

export function createGraphCustomEvent(name: string): GraphCustomEvent { return { uuid: graphUuid(), name: identifier(name, 'custom_event'), parameters: [], description: '' } }
export function createGraphInterface(name: string): GraphInterface { return { uuid: graphUuid(), name: identifier(name, 'graph_interface'), description: '', methods: [{ uuid: graphUuid(), name: 'execute', inputs: [], outputs: [] }] } }
export function addRoutineParameter(routine: GraphRoutine, direction: 'input' | 'output', name: string, valueType: GraphValueType): GraphParameter { const item = parameter(name, valueType); routine[direction === 'input' ? 'inputs' : 'outputs'].push(item); return item }

function scopes(graph: NovaGraphDocument): Array<{ uuid: string; scope: GraphCanvasScope; routine: GraphRoutine | null }> { return [{ uuid: graph.uuid, scope: graph, routine: null }, ...graph.routines.map(routine => ({ uuid: routine.uuid, scope: routine, routine }))] }

export function synchronizeGraphSignatures(graph: NovaGraphDocument): void {
  for (const { scope, routine } of scopes(graph)) {
    for (const node of scope.nodes) {
      if (!(node.type === 'routine.entry' || node.type === 'routine.return' || node.type.startsWith('routine.call.') || node.type.startsWith('custom.event.') || node.type.startsWith('custom.emit.') || node.type.startsWith('local.'))) continue
      const definition = graphNodeDefinition(node.type, graph, routine)
      if (!definition) continue
      const previous = new Map(node.pins.map(pin => [`${pin.direction}:${pin.key}`, pin]))
      const refreshed = createGraphNode(node.type, node.position.x, node.position.y, graph, routine)
      node.title = refreshed.title; node.category = refreshed.category
      node.pins = refreshed.pins.map(pin => {
        const old = previous.get(`${pin.direction}:${pin.key}`)
        return old && old.kind === pin.kind && (old.valueType === pin.valueType || old.valueType === 'Data' || pin.valueType === 'Data') ? { ...pin, uuid: old.uuid, defaultValue: old.defaultValue } : pin
      })
      node.size.height = Math.max(82, 46 + node.pins.length * 26)
    }
    const validNodes = new Set(scope.nodes.map(node => node.uuid)), validPins = new Set(scope.nodes.flatMap(node => node.pins.map(pin => pin.uuid)))
    scope.edges = scope.edges.filter(edge => validNodes.has(edge.from.nodeUuid) && validNodes.has(edge.to.nodeUuid) && validPins.has(edge.from.pinUuid) && validPins.has(edge.to.pinUuid))
  }
}

export function findGraphReferences(graph: NovaGraphDocument, targetUuid: string): GraphReference[] {
  const output: GraphReference[] = []
  for (const { uuid, scope, routine } of scopes(graph)) for (const node of scope.nodes) {
    const values = Object.values(node.config).map(String)
    if (values.includes(targetUuid) || node.type.endsWith(targetUuid)) output.push({ kind: node.type.startsWith('routine.call.') ? 'routine' : node.type.startsWith('custom.') ? 'event' : node.type.startsWith('local.') ? 'local' : node.type.startsWith('variable.') ? 'variable' : 'node', targetUuid, scopeUuid: uuid, nodeUuid: node.uuid, label: `${routine?.name ?? graph.name} / ${node.title}` })
  }
  for (const routine of graph.routines) if (routine.interfaceUuid === targetUuid) output.push({ kind: 'interface', targetUuid, scopeUuid: routine.uuid, nodeUuid: '', label: `${routine.name} implements interface` })
  return output.sort((a, b) => ordinal(a.scopeUuid, b.scopeUuid) || ordinal(a.nodeUuid, b.nodeUuid))
}

export function renameGraphSymbol(graph: NovaGraphDocument, targetUuid: string, requestedName: string): GraphReference[] {
  const collections = [graph.variables, graph.routines, graph.customEvents, graph.interfaces, ...graph.routines.map(routine => routine.locals)] as Array<Array<{ uuid: string; name: string }>>
  const target = collections.flat().find(item => item.uuid === targetUuid)
  if (!target) throw new Error('The graph symbol no longer exists.')
  const previous = target.name, next = identifier(requestedName, previous)
  if (next === previous) return findGraphReferences(graph, targetUuid)
  target.name = next
  if ('deprecatedNames' in target && Array.isArray(target.deprecatedNames) && !target.deprecatedNames.includes(previous)) target.deprecatedNames.push(previous)
  graph.migrations.push({ uuid: graphUuid(), kind: 'rename', from: previous, to: next, appliedAt: new Date().toISOString() })
  return findGraphReferences(graph, targetUuid)
}

export function replaceGraphNodeType(graph: NovaGraphDocument, nodeUuid: string, replacementType: string): void {
  const found = scopes(graph).flatMap(item => item.scope.nodes.map(node => ({ ...item, node }))).find(item => item.node.uuid === nodeUuid)
  if (!found) throw new Error('The graph node no longer exists.')
  const definition = graphNodeDefinition(replacementType, graph, found.routine)
  if (!definition) throw new Error(`Replacement node type ${replacementType} is unavailable.`)
  const old = found.node, oldPins = new Map(old.pins.map(pin => [pin.key, pin]))
  const replacement = createGraphNode(replacementType, old.position.x, old.position.y, graph, found.routine)
  replacement.uuid = old.uuid; replacement.collapsed = old.collapsed; replacement.config = { ...old.config }
  for (const pin of replacement.pins) {
    const previous = oldPins.get(pin.key)
    if (previous && previous.direction === pin.direction && previous.kind === pin.kind && (previous.valueType === pin.valueType || previous.valueType === 'Data' || pin.valueType === 'Data')) pin.uuid = previous.uuid
  }
  const validPins = new Set(replacement.pins.map(pin => pin.uuid))
  found.scope.nodes.splice(found.scope.nodes.indexOf(old), 1, replacement)
  found.scope.edges = found.scope.edges.filter(edge => edge.from.nodeUuid !== old.uuid && edge.to.nodeUuid !== old.uuid || validPins.has(edge.from.pinUuid) && validPins.has(edge.to.pinUuid))
  graph.migrations.push({ uuid: graphUuid(), kind: 'replace', from: old.type, to: replacementType, appliedAt: new Date().toISOString() })
}

export function migrateDeprecatedGraphNodes(graph: NovaGraphDocument): number {
  let changed = 0
  for (const { scope, routine } of scopes(graph)) for (const node of [...scope.nodes]) {
    const replacement = graphNodeDefinition(node.type, graph, routine)?.deprecatedBy
    if (replacement) { replaceGraphNodeType(graph, node.uuid, replacement); changed++ }
  }
  return changed
}

export function extractGraphFunction(graph: NovaGraphDocument, selected: ReadonlySet<string>, requestedName: string): GraphRoutine {
  const nodes = graph.nodes.filter(node => selected.has(node.uuid))
  if (!nodes.length) throw new Error('Select at least one main-graph node to extract.')
  if (nodes.some(node => node.type.startsWith('event.'))) throw new Error('Lifecycle event nodes cannot be extracted; select the nodes after the event.')
  const nodeIds = new Set(nodes.map(node => node.uuid)), internal = graph.edges.filter(edge => nodeIds.has(edge.from.nodeUuid) && nodeIds.has(edge.to.nodeUuid))
  const incoming = graph.edges.filter(edge => !nodeIds.has(edge.from.nodeUuid) && nodeIds.has(edge.to.nodeUuid)), outgoing = graph.edges.filter(edge => nodeIds.has(edge.from.nodeUuid) && !nodeIds.has(edge.to.nodeUuid))
  const pinOwner = new Map(graph.nodes.flatMap(node => node.pins.map(pin => [pin.uuid, { node, pin }] as const)))
  const incomingExec = incoming.filter(edge => pinOwner.get(edge.to.pinUuid)?.pin.kind === 'execution'), outgoingExec = outgoing.filter(edge => pinOwner.get(edge.from.pinUuid)?.pin.kind === 'execution')
  if (incomingExec.length > 1 || outgoingExec.length > 1) throw new Error('Extract Function requires a single execution entrance and exit.')
  const routine = createGraphRoutine('function', requestedName), entry = routine.nodes.find(node => node.type === 'routine.entry')!, exit = routine.nodes.find(node => node.type === 'routine.return')!
  routine.nodes.splice(0, routine.nodes.length, ...nodes, entry, exit); routine.edges.splice(0)
  const minX = Math.min(...nodes.map(node => node.position.x)), minY = Math.min(...nodes.map(node => node.position.y))
  for (const node of nodes) { node.position.x -= minX - 300; node.position.y -= minY - 120 }
  entry.position = { x: 20, y: 120 }; exit.position = { x: Math.max(620, ...nodes.map(node => node.position.x + node.size.width + 100)), y: 120 }
  routine.edges.push(...internal)
  for (const edge of incoming.filter(edge => pinOwner.get(edge.to.pinUuid)?.pin.kind === 'data')) {
    const target = pinOwner.get(edge.to.pinUuid)!, item = parameter(target.pin.key, target.pin.valueType ?? 'Data'); routine.inputs.push(item)
  }
  for (const edge of outgoing.filter(edge => pinOwner.get(edge.from.pinUuid)?.pin.kind === 'data')) {
    const source = pinOwner.get(edge.from.pinUuid)!, item = parameter(source.pin.key, source.pin.valueType ?? 'Data'); routine.outputs.push(item)
  }
  entry.pins = [{ uuid: graphUuid(), key: 'next', name: 'Next', direction: 'output', kind: 'execution', valueType: null, required: false, defaultValue: null }, ...routine.inputs.map(item => ({ uuid: graphUuid(), key: item.name, name: item.name, direction: 'output' as const, kind: 'data' as const, valueType: item.valueType, required: false, defaultValue: item.defaultValue }))]
  exit.pins = [{ uuid: graphUuid(), key: 'exec', name: 'In', direction: 'input', kind: 'execution', valueType: null, required: false, defaultValue: null }, ...routine.outputs.map(item => ({ uuid: graphUuid(), key: item.name, name: item.name, direction: 'input' as const, kind: 'data' as const, valueType: item.valueType, required: true, defaultValue: item.defaultValue }))]
  if (incomingExec[0]) routine.edges.push({ uuid: graphUuid(), from: { nodeUuid: entry.uuid, pinUuid: entry.pins[0].uuid }, to: { ...incomingExec[0].to } })
  if (outgoingExec[0]) routine.edges.push({ uuid: graphUuid(), from: { ...outgoingExec[0].from }, to: { nodeUuid: exit.uuid, pinUuid: exit.pins[0].uuid } })
  const incomingData = incoming.filter(edge => pinOwner.get(edge.to.pinUuid)?.pin.kind === 'data'), outgoingData = outgoing.filter(edge => pinOwner.get(edge.from.pinUuid)?.pin.kind === 'data')
  incomingData.forEach((edge, index) => routine.edges.push({ uuid: graphUuid(), from: { nodeUuid: entry.uuid, pinUuid: entry.pins[index + 1].uuid }, to: { ...edge.to } }))
  outgoingData.forEach((edge, index) => routine.edges.push({ uuid: graphUuid(), from: { ...edge.from }, to: { nodeUuid: exit.uuid, pinUuid: exit.pins[index + 1].uuid } }))
  routine.pure = incomingExec.length === 0 && outgoingExec.length === 0
  graph.routines.push(routine)
  const call = createGraphNode(`routine.call.${routine.uuid}`, minX, minY, graph)
  graph.nodes = graph.nodes.filter(node => !nodeIds.has(node.uuid)); graph.edges = graph.edges.filter(edge => !nodeIds.has(edge.from.nodeUuid) && !nodeIds.has(edge.to.nodeUuid)); graph.nodes.push(call)
  const callInputExec = call.pins.find(pin => pin.key === 'exec'), callOutputExec = call.pins.find(pin => pin.key === 'next')
  if (incomingExec[0] && callInputExec) graph.edges.push({ uuid: graphUuid(), from: { ...incomingExec[0].from }, to: { nodeUuid: call.uuid, pinUuid: callInputExec.uuid } })
  if (outgoingExec[0] && callOutputExec) graph.edges.push({ uuid: graphUuid(), from: { nodeUuid: call.uuid, pinUuid: callOutputExec.uuid }, to: { ...outgoingExec[0].to } })
  incomingData.forEach((edge, index) => { const pin = call.pins.find(item => item.key === routine.inputs[index]?.name && item.direction === 'input'); if (pin) graph.edges.push({ uuid: graphUuid(), from: { ...edge.from }, to: { nodeUuid: call.uuid, pinUuid: pin.uuid } }) })
  outgoingData.forEach((edge, index) => { const pin = call.pins.find(item => item.key === routine.outputs[index]?.name && item.direction === 'output'); if (pin) graph.edges.push({ uuid: graphUuid(), from: { nodeUuid: call.uuid, pinUuid: pin.uuid }, to: { ...edge.to } }) })
  return routine
}

function stableObject(value: unknown): unknown { if (Array.isArray(value)) return value.map(stableObject); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => ordinal(a, b)).map(([key, item]) => [key, stableObject(item)])); return value }
function stable(value: unknown): string { return JSON.stringify(stableObject(value)) }
function identityItems(graph: NovaGraphDocument): Map<string, { path: string; value: unknown }> {
  const output = new Map<string, { path: string; value: unknown }>(), add = (identity: string, path: string, value: unknown) => output.set(identity, { path, value })
  add(graph.uuid, 'graph', { ...graph, variables: undefined, routines: undefined, nodes: undefined, edges: undefined, comments: undefined, customEvents: undefined, interfaces: undefined, libraries: undefined, migrations: undefined })
  for (const variable of graph.variables) add(variable.uuid, `variables/${variable.name}`, variable)
  for (const event of graph.customEvents) add(event.uuid, `events/${event.name}`, event)
  for (const contract of graph.interfaces) { add(contract.uuid, `interfaces/${contract.name}`, contract); for (const method of contract.methods) add(method.uuid, `interfaces/${contract.name}/${method.name}`, method) }
  for (const library of graph.libraries) add(library.uuid, `libraries/${library.packageId}/${library.libraryId}`, library)
  for (const { uuid, scope, routine } of scopes(graph)) { if (routine) add(routine.uuid, `routines/${routine.name}`, { ...routine, nodes: undefined, edges: undefined, comments: undefined }); for (const node of scope.nodes) add(node.uuid, `${routine?.name ?? 'main'}/nodes/${node.title}`, node); for (const edge of scope.edges) add(edge.uuid, `${routine?.name ?? 'main'}/edges`, edge); for (const comment of scope.comments) add(comment.uuid, `${routine?.name ?? 'main'}/comments`, comment); void uuid }
  return output
}

export function semanticGraphDiff(beforeInput: NovaGraphDocument | string, afterInput: NovaGraphDocument | string): GraphSemanticChange[] {
  const before = identityItems(typeof beforeInput === 'string' ? parseGraphDocument(beforeInput) : canonicalGraphDocument(beforeInput)), after = identityItems(typeof afterInput === 'string' ? parseGraphDocument(afterInput) : canonicalGraphDocument(afterInput)), identities = [...new Set([...before.keys(), ...after.keys()])].sort(ordinal), changes: GraphSemanticChange[] = []
  for (const identity of identities) {
    const first = before.get(identity), second = after.get(identity)
    if (!first) changes.push({ identity, kind: 'added', path: second!.path, before: null, after: second!.value })
    else if (!second) changes.push({ identity, kind: 'removed', path: first.path, before: first.value, after: null })
    else if (stable(first.value) !== stable(second.value)) { const firstValue = first.value as Record<string, unknown>, secondValue = second.value as Record<string, unknown>; const kind = firstValue?.name !== secondValue?.name ? 'renamed' : firstValue?.position && stable(firstValue.position) !== stable(secondValue?.position) ? 'moved' : 'modified'; changes.push({ identity, kind, path: second.path, before: first.value, after: second.value }) }
  }
  return changes
}

function mergeValue(base: unknown, ours: unknown, theirs: unknown, identity: string, path: string, conflicts: GraphMergeConflict[]): unknown {
  if (stable(ours) === stable(theirs)) return ours
  if (stable(base) === stable(ours)) return theirs
  if (stable(base) === stable(theirs)) return ours
  if (Array.isArray(base) && Array.isArray(ours) && Array.isArray(theirs) && [...base, ...ours, ...theirs].every(item => item && typeof item === 'object' && 'uuid' in item)) {
    const byId = (items: unknown[]) => new Map(items.map(item => [String((item as { uuid: unknown }).uuid), item])), b = byId(base), o = byId(ours), t = byId(theirs)
    return [...new Set([...b.keys(), ...o.keys(), ...t.keys()])].sort(ordinal).flatMap(id => { const merged = mergeValue(b.get(id), o.get(id), t.get(id), id, `${path}/${id}`, conflicts); return merged === undefined ? [] : [merged] })
  }
  if (base && ours && theirs && typeof base === 'object' && typeof ours === 'object' && typeof theirs === 'object' && !Array.isArray(base) && !Array.isArray(ours) && !Array.isArray(theirs)) {
    const keys = [...new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])].sort(ordinal), result: Record<string, unknown> = {}
    for (const key of keys) result[key] = mergeValue((base as Record<string, unknown>)[key], (ours as Record<string, unknown>)[key], (theirs as Record<string, unknown>)[key], identity, `${path}/${key}`, conflicts)
    return result
  }
  const conflict: GraphMergeConflict = { id: graphUuid(), identity, path, base, ours, theirs, resolution: 'unresolved' }; conflicts.push(conflict); return ours
}

export function mergeGraphs(baseInput: NovaGraphDocument | string, oursInput: NovaGraphDocument | string, theirsInput: NovaGraphDocument | string): GraphMergeResult {
  const base = typeof baseInput === 'string' ? JSON.parse(serializeGraphDocument(parseGraphDocument(baseInput))) : canonicalGraphDocument(baseInput), ours = typeof oursInput === 'string' ? JSON.parse(serializeGraphDocument(parseGraphDocument(oursInput))) : canonicalGraphDocument(oursInput), theirs = typeof theirsInput === 'string' ? JSON.parse(serializeGraphDocument(parseGraphDocument(theirsInput))) : canonicalGraphDocument(theirsInput), conflicts: GraphMergeConflict[] = []
  const merged = parseGraphDocument(`${JSON.stringify(mergeValue(base, ours, theirs, base.uuid, 'graph', conflicts))}\n`)
  return { graph: merged, conflicts, changes: semanticGraphDiff(base, merged) }
}

export function applyGraphConflict(result: GraphMergeResult, conflictId: string, resolution: 'ours' | 'theirs'): GraphMergeResult {
  const conflict = result.conflicts.find(item => item.id === conflictId)
  if (!conflict) return result
  conflict.resolution = resolution
  const segments = conflict.path.split('/').filter(Boolean).slice(1)
  let current: unknown = result.graph
  for (const segment of segments.slice(0, -1)) {
    if (Array.isArray(current)) current = current.find(item => item && typeof item === 'object' && String((item as { uuid?: unknown }).uuid) === segment)
    else if (current && typeof current === 'object') current = (current as Record<string, unknown>)[segment]
    else current = undefined
  }
  const last = segments[segments.length - 1], selected = resolution === 'ours' ? conflict.ours : conflict.theirs
  if (last && Array.isArray(current)) {
    const index = current.findIndex(item => item && typeof item === 'object' && String((item as { uuid?: unknown }).uuid) === last)
    if (selected === undefined && index >= 0) current.splice(index, 1)
    else if (index >= 0) current.splice(index, 1, selected)
    else if (selected !== undefined) current.push(selected)
  } else if (last && current && typeof current === 'object') {
    if (selected === undefined) delete (current as Record<string, unknown>)[last]
    else (current as Record<string, unknown>)[last] = selected
  }
  return { graph: parseGraphDocument(serializeGraphDocument(result.graph)), conflicts: result.conflicts, changes: result.changes }
}

export function planGraphHotReload(previousInput: NovaGraphDocument | string, candidateInput: NovaGraphDocument | string, state: Record<string, GraphValue>): GraphHotReloadPlan {
  const previous = typeof previousInput === 'string' ? parseGraphDocument(previousInput) : previousInput, candidate = typeof candidateInput === 'string' ? parseGraphDocument(candidateInput) : candidateInput, reasons: string[] = [], preserved: Record<string, GraphValue> = {}, initialized: string[] = [], dropped: string[] = [], before = new Map(previous.variables.map(item => [item.uuid, item]))
  for (const variable of candidate.variables) { const old = before.get(variable.uuid); if (old && old.valueType === variable.valueType && old.serialized === variable.serialized) preserved[variable.name] = state[old.name] ?? old.defaultValue; else { initialized.push(variable.name); if (old) reasons.push(`Variable ${variable.name} changed type or lifetime.`) } }
  for (const variable of previous.variables) if (!candidate.variables.some(item => item.uuid === variable.uuid)) { dropped.push(variable.name); if (variable.serialized) reasons.push(`Serialized variable ${variable.name} was removed.`) }
  const previousRoutines = new Map(previous.routines.map(item => [item.uuid, item]))
  for (const routine of candidate.routines) { const old = previousRoutines.get(routine.uuid); if (old && stable({ inputs: old.inputs, outputs: old.outputs, kind: old.kind }) !== stable({ inputs: routine.inputs, outputs: routine.outputs, kind: routine.kind })) reasons.push(`Routine ${routine.name} changed its public signature.`) }
  return { compatible: reasons.length === 0, reasons: reasons.length ? reasons : ['Stable identities and serialized variable layouts are compatible.'], preserved, initialized, dropped }
}
