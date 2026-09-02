import { SCRIPT_API_V2_MANIFEST, type ScriptApiV2Binding } from '../editor/scriptApi'
import { packageState, versionSatisfies } from '../runtime/packages'
import { pluginState } from '../runtime/plugins'
import { defaultGraphValue, graphUuid, type GraphNode, type GraphParameter, type GraphPin, type GraphRoutine, type GraphValue, type GraphValueType, type NovaGraphDocument } from './graphTypes'

export interface GraphPinTemplate { key: string; name: string; direction: 'input' | 'output'; kind: 'execution' | 'data'; valueType?: GraphValueType; required?: boolean; defaultValue?: GraphValue }
export interface GraphNodeDefinition { type: string; title: string; category: string; description: string; keywords: string; color: string; pins: GraphPinTemplate[]; api?: ScriptApiV2Binding; packageId?: string; deprecatedBy?: string }

const COLORS: Record<string, string> = {
  Events: '#e45b73', Flow: '#a777e3', Values: '#5e9fe6', Variables: '#d9a441', Functions: '#7f79df', Libraries: '#5fa7b8', Math: '#44b894', Comparison: '#db8756', Conversion: '#8a9aae',
  Input: '#5f8fe8', Transform: '#48b8ad', Physics: '#e6815c', UI: '#d66fb7', Audio: '#8d77dc', Animation: '#b68b45', Scene: '#65aee7', Save: '#62a36f', Signals: '#d179a5', Timing: '#7793d8', Debug: '#9b8991', Gameplay: '#688ca8', Code: '#5f9da8'
}

function signatureParts(signature: string): { parameters: string[]; result: string } {
  const match = signature.match(/(?:fn\s+)?[A-Za-z_][A-Za-z0-9_]*\s*\(([^)]*)\)\s*(?:->\s*(.+))?$/)
  if (!match) return { parameters: [], result: '' }
  return { parameters: match[1].split(',').map(value => value.trim()).filter(Boolean), result: (match[2] ?? '').trim() }
}

function typeForName(name: string, result = ''): GraphValueType {
  const lowered = `${name} ${result}`.toLowerCase()
  if (/bool/.test(lowered) || /^(repeat|enabled|value|condition|checked|paused|consume)$/.test(name)) return 'Boolean'
  if (/vec2/.test(lowered) || /^(position|normal|velocity|scale|move)$/.test(name)) return 'Vec2'
  if (/handle<entity>|entity_id/.test(lowered) || /^(other|entity|source|target|handle)$/.test(name)) return 'Entity'
  if (/handle<resource>|prefab|scene|resource|asset|texture|clip|material/.test(lowered)) return 'Resource'
  if (/data|snapshot|payload|value/.test(result.toLowerCase()) || /^(payload|fallback)$/.test(name)) return 'Data'
  if (/float|number|int/.test(lowered) || /^(dt|x|y|px|py|nx|ny|rvx|rvy|seconds|minimum|maximum|radians|radians_per_second|rotation|scale_x|scale_y|radius|limit|priority)$/.test(name)) return 'Number'
  return 'String'
}

function typeForParameter(api: ScriptApiV2Binding, name: string): GraphValueType {
  if (api.callable === 'session_set' && name === 'value') return 'Data'
  if ((api.callable === 'score_set' || api.callable === 'score_add') && name === 'value') return 'Number'
  if (name === 'payload' || name === 'fallback' || api.callable === 'save_set' && name === 'value') return 'Data'
  if (name === 'condition' || api.callable.endsWith('_bool') && name === 'value' || api.callable === 'expect' && name === 'condition') return 'Boolean'
  if ((api.callable.endsWith('_float') || api.callable.endsWith('_integer') || api.callable === 'ui_set_value') && name === 'value') return 'Number'
  return typeForName(name)
}

function pin(template: GraphPinTemplate): GraphPin {
  const type = template.kind === 'data' ? template.valueType ?? 'Data' : null
  return { uuid: graphUuid(), key: template.key, name: template.name, direction: template.direction, kind: template.kind, valueType: type, required: template.required === true, defaultValue: template.defaultValue ?? (type ? defaultGraphValue(type) : null) }
}

function title(value: string): string { return value.split('_').map(part => part ? part[0].toUpperCase() + part.slice(1) : '').join(' ') }
function categoryFor(api: ScriptApiV2Binding): string {
  if (api.namespace === 'lifecycle') return 'Events'
  if (api.namespace === 'logging' || api.namespace === 'testing') return 'Debug'
  if (api.namespace === 'object' || api.namespace === 'component' || api.namespace === 'resources') return 'Gameplay'
  return title(api.namespace)
}

function definitionFromApi(api: ScriptApiV2Binding): GraphNodeDefinition {
  const parts = signatureParts(api.signature)
  const event = api.resultConvention === 'lifecycle'
  const parameters = parts.parameters.map(parameter => parameter.split(':')[0].trim())
  const pins: GraphPinTemplate[] = event
    ? [{ key: 'next', name: 'Next', direction: 'output', kind: 'execution' }, ...parameters.map(name => ({ key: name, name: title(name), direction: 'output' as const, kind: 'data' as const, valueType: typeForParameter(api, name), defaultValue: defaultGraphValue(typeForParameter(api, name)) }))]
    : [...(api.resultConvention === 'queued-command' ? [{ key: 'exec', name: 'In', direction: 'input' as const, kind: 'execution' as const }] : []),
      ...parameters.map(name => ({ key: name, name: title(name), direction: 'input' as const, kind: 'data' as const, valueType: typeForParameter(api, name), required: true, defaultValue: defaultGraphValue(typeForParameter(api, name)) })),
      ...(api.resultConvention === 'value' || api.resultConvention === 'result' ? (() => {
        const resultType = api.callable.startsWith('query_') ? 'Data' : api.callable === 'entity' || api.callable === 'find_entity' || api.callable === 'spawn_at' ? 'Entity' : typeForName('result', parts.result)
        return [{ key: 'value', name: 'Value', direction: 'output' as const, kind: 'data' as const, valueType: resultType, defaultValue: defaultGraphValue(resultType) }]
      })() : []),
      ...(api.resultConvention === 'queued-command' ? [{ key: 'next', name: 'Next', direction: 'output' as const, kind: 'execution' as const }] : [])]
  const category = categoryFor(api)
  return { type: `${event ? 'event' : 'api'}.${api.callable}`, title: event ? `Event ${title(api.callable)}` : title(api.callable), category, description: api.detail, keywords: `${api.callable} ${api.namespace} ${api.signature}`, color: COLORS[category] ?? COLORS.Gameplay, pins, api }
}

const CORE: readonly GraphNodeDefinition[] = [
  { type: 'code.module', title: 'Execute Rhai Module', category: 'Code', description: 'Explicit escape block: runs sandboxed top-level Rhai declarations that cannot map to typed blocks yet.', keywords: 'execute rhai code source module escape linked sync', color: COLORS.Code, pins: [] },
  { type: 'code.statement', title: 'Execute Rhai Statement', category: 'Code', description: 'Explicit escape block: runs one validated sandboxed Rhai statement inside an execution path.', keywords: 'execute rhai code statement escape linked sync', color: COLORS.Code, pins: [
    { key: 'exec', name: 'In', direction: 'input', kind: 'execution' }, { key: 'next', name: 'Next', direction: 'output', kind: 'execution' }
  ] },
  { type: 'code.expression', title: 'Execute Rhai Expression', category: 'Operators', description: 'Explicit escape block: evaluates sandboxed Rhai as a value when no typed block can preserve it.', keywords: 'execute rhai expression escape value linked lossless', color: COLORS.Values, pins: [
    { key: 'value', name: 'Value', direction: 'output', kind: 'data', valueType: 'Data', defaultValue: null }
  ] },
  { type: 'flow.branch', title: 'Branch', category: 'Flow', description: 'Routes execution according to a Boolean condition.', keywords: 'if condition true false', color: COLORS.Flow, pins: [
    { key: 'exec', name: 'In', direction: 'input', kind: 'execution' }, { key: 'condition', name: 'Condition', direction: 'input', kind: 'data', valueType: 'Boolean' },
    { key: 'true', name: 'True', direction: 'output', kind: 'execution' }, { key: 'false', name: 'False', direction: 'output', kind: 'execution' }, { key: 'next', name: 'Completed', direction: 'output', kind: 'execution' }
  ] },
  { type: 'flow.sequence', title: 'Sequence', category: 'Flow', description: 'Runs two execution paths in deterministic order.', keywords: 'then order sequence', color: COLORS.Flow, pins: [
    { key: 'exec', name: 'In', direction: 'input', kind: 'execution' }, { key: 'first', name: 'Then 0', direction: 'output', kind: 'execution' }, { key: 'second', name: 'Then 1', direction: 'output', kind: 'execution' }, { key: 'next', name: 'Completed', direction: 'output', kind: 'execution' }
  ] },
  { type: 'flow.repeat', title: 'Bounded Repeat', category: 'Flow', description: 'Repeats a body at most 1,024 times.', keywords: 'loop for bounded repeat', color: COLORS.Flow, pins: [
    { key: 'exec', name: 'In', direction: 'input', kind: 'execution' }, { key: 'count', name: 'Count', direction: 'input', kind: 'data', valueType: 'Number', defaultValue: 1 },
    { key: 'body', name: 'Loop body', direction: 'output', kind: 'execution' }, { key: 'index', name: 'Index', direction: 'output', kind: 'data', valueType: 'Number' }, { key: 'next', name: 'Completed', direction: 'output', kind: 'execution' }
  ] },
  ...(['Boolean', 'Number', 'String', 'Vec2', 'Entity', 'Resource', 'Data'] as const).map(valueType => ({ type: `literal.${valueType.toLowerCase()}`, title: valueType, category: 'Values', description: `A constant ${valueType} value.`, keywords: `constant literal ${valueType}`, color: COLORS.Values, pins: [{ key: 'value', name: 'Value', direction: 'output' as const, kind: 'data' as const, valueType, defaultValue: defaultGraphValue(valueType) }] })),
  ...['add', 'subtract', 'multiply', 'divide', 'modulo', 'minimum', 'maximum'].map(operation => ({ type: `math.${operation}`, title: title(operation), category: 'Math', description: `${title(operation)} two finite numbers.`, keywords: `number ${operation}`, color: COLORS.Math, pins: [{ key: 'a', name: 'A', direction: 'input' as const, kind: 'data' as const, valueType: 'Number' as const }, { key: 'b', name: 'B', direction: 'input' as const, kind: 'data' as const, valueType: 'Number' as const }, { key: 'value', name: 'Value', direction: 'output' as const, kind: 'data' as const, valueType: 'Number' as const }] })),
  ...['equal', 'not_equal', 'less', 'less_equal', 'greater', 'greater_equal'].map(operation => ({ type: `compare.${operation}`, title: title(operation), category: 'Comparison', description: `${title(operation)} comparison.`, keywords: `compare ${operation}`, color: COLORS.Comparison, pins: [{ key: 'a', name: 'A', direction: 'input' as const, kind: 'data' as const, valueType: operation.startsWith('less') || operation.startsWith('greater') ? 'Number' as const : 'Data' as const }, { key: 'b', name: 'B', direction: 'input' as const, kind: 'data' as const, valueType: operation.startsWith('less') || operation.startsWith('greater') ? 'Number' as const : 'Data' as const }, { key: 'value', name: 'Result', direction: 'output' as const, kind: 'data' as const, valueType: 'Boolean' as const }] })),
  ...['and', 'or'].map(operation => ({ type: `logic.${operation}`, title: title(operation), category: 'Comparison', description: `${title(operation)} Boolean values.`, keywords: `boolean ${operation}`, color: COLORS.Comparison, pins: [{ key: 'a', name: 'A', direction: 'input' as const, kind: 'data' as const, valueType: 'Boolean' as const }, { key: 'b', name: 'B', direction: 'input' as const, kind: 'data' as const, valueType: 'Boolean' as const }, { key: 'value', name: 'Result', direction: 'output' as const, kind: 'data' as const, valueType: 'Boolean' as const }] })),
  { type: 'logic.not', title: 'Not', category: 'Comparison', description: 'Inverts a Boolean.', keywords: 'boolean invert not', color: COLORS.Comparison, pins: [{ key: 'value', name: 'Value', direction: 'input', kind: 'data', valueType: 'Boolean' }, { key: 'result', name: 'Result', direction: 'output', kind: 'data', valueType: 'Boolean' }] },
  { type: 'value.make_vec2', title: 'Make Vec2', category: 'Values', description: 'Creates a two-dimensional value.', keywords: 'vector xy vec2', color: COLORS.Values, pins: [{ key: 'x', name: 'X', direction: 'input', kind: 'data', valueType: 'Number' }, { key: 'y', name: 'Y', direction: 'input', kind: 'data', valueType: 'Number' }, { key: 'value', name: 'Vec2', direction: 'output', kind: 'data', valueType: 'Vec2' }] },
  { type: 'value.break_vec2', title: 'Break Vec2', category: 'Values', description: 'Reads the X and Y values of a Vec2.', keywords: 'vector xy vec2 split', color: COLORS.Values, pins: [{ key: 'value', name: 'Vec2', direction: 'input', kind: 'data', valueType: 'Vec2' }, { key: 'x', name: 'X', direction: 'output', kind: 'data', valueType: 'Number' }, { key: 'y', name: 'Y', direction: 'output', kind: 'data', valueType: 'Number' }] },
  ...([['number_to_string', 'Number', 'String'], ['boolean_to_string', 'Boolean', 'String'], ['boolean_to_number', 'Boolean', 'Number'], ['string_to_number', 'String', 'Number']] as const).map(([name, input, output]) => ({ type: `convert.${name}`, title: title(name), category: 'Conversion', description: `Explicit safe ${input} to ${output} conversion.`, keywords: `convert ${input} ${output}`, color: COLORS.Conversion, pins: [{ key: 'value', name: input, direction: 'input' as const, kind: 'data' as const, valueType: input }, { key: 'result', name: output, direction: 'output' as const, kind: 'data' as const, valueType: output }] })),
  { type: 'reroute.data', title: 'Reroute', category: 'Flow', description: 'Keeps a data wire readable without changing its value.', keywords: 'reroute wire organize', color: COLORS.Flow, pins: [{ key: 'value', name: 'In', direction: 'input', kind: 'data', valueType: 'Data' }, { key: 'result', name: 'Out', direction: 'output', kind: 'data', valueType: 'Data' }] },
  { type: 'reroute.execution', title: 'Execution Reroute', category: 'Flow', description: 'Keeps an execution wire readable.', keywords: 'reroute execution wire organize', color: COLORS.Flow, pins: [{ key: 'exec', name: 'In', direction: 'input', kind: 'execution' }, { key: 'next', name: 'Out', direction: 'output', kind: 'execution' }] },
  { type: 'variable.get', title: 'Get Variable', category: 'Variables', description: 'Reads a graph variable.', keywords: 'get variable read', color: COLORS.Variables, pins: [{ key: 'value', name: 'Value', direction: 'output', kind: 'data', valueType: 'Data' }] },
  { type: 'variable.set', title: 'Set Variable', category: 'Variables', description: 'Writes a graph variable.', keywords: 'set variable write', color: COLORS.Variables, pins: [{ key: 'exec', name: 'In', direction: 'input', kind: 'execution' }, { key: 'value', name: 'Value', direction: 'input', kind: 'data', valueType: 'Data' }, { key: 'next', name: 'Next', direction: 'output', kind: 'execution' }] }
]

export const GRAPH_NODE_CATALOG: readonly GraphNodeDefinition[] = [...SCRIPT_API_V2_MANIFEST.entries.map(definitionFromApi), ...CORE].sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title) || a.type.localeCompare(b.type))
const CATALOG = new Map(GRAPH_NODE_CATALOG.map(item => [item.type, item]))

function parameterPins(parameters: readonly GraphParameter[], direction: 'input' | 'output'): GraphPinTemplate[] {
  return parameters.map(parameter => ({ key: parameter.name, name: title(parameter.name), direction, kind: 'data', valueType: parameter.valueType, required: direction === 'input', defaultValue: parameter.defaultValue }))
}

function routineDefinition(type: string, graph?: NovaGraphDocument, scope?: GraphRoutine | null): GraphNodeDefinition | null {
  if (!graph) return null
  if (type === 'routine.entry' && scope) return { type, title: `${title(scope.kind)} Entry`, category: 'Functions', description: `Entry point for ${scope.name}.`, keywords: 'entry parameters function macro subgraph', color: COLORS.Functions, pins: [{ key: 'next', name: 'Next', direction: 'output', kind: 'execution' }, ...parameterPins(scope.inputs, 'output')] }
  if (type === 'routine.return' && scope) return { type, title: 'Return', category: 'Functions', description: `Returns values from ${scope.name}.`, keywords: 'return output function', color: COLORS.Functions, pins: [{ key: 'exec', name: 'In', direction: 'input', kind: 'execution' }, ...parameterPins(scope.outputs, 'input')] }
  if ((type === 'local.get' || type === 'local.set') && scope) {
    const local = scope.locals[0], value = local?.valueType ?? 'Data'
    return type === 'local.get'
      ? { type, title: 'Get Local', category: 'Variables', description: 'Reads a function-local value.', keywords: 'local variable get', color: COLORS.Variables, pins: [{ key: 'value', name: 'Value', direction: 'output', kind: 'data', valueType: value }] }
      : { type, title: 'Set Local', category: 'Variables', description: 'Writes a function-local value.', keywords: 'local variable set', color: COLORS.Variables, pins: [{ key: 'exec', name: 'In', direction: 'input', kind: 'execution' }, { key: 'value', name: 'Value', direction: 'input', kind: 'data', valueType: value }, { key: 'next', name: 'Next', direction: 'output', kind: 'execution' }] }
  }
  const routineMatch = /^routine\.call\.([0-9a-f-]+)$/.exec(type)
  if (routineMatch) {
    const routine = (graph.routines ?? []).find(item => item.uuid === routineMatch[1])
    if (!routine) return null
    return { type, title: routine.name, category: 'Functions', description: routine.description || `Calls ${routine.kind} ${routine.name}.`, keywords: `${routine.kind} call ${routine.name} ${routine.deprecatedNames.join(' ')}`, color: COLORS.Functions, pins: [...(routine.pure ? [] : [{ key: 'exec', name: 'In', direction: 'input' as const, kind: 'execution' as const }]), ...parameterPins(routine.inputs, 'input'), ...parameterPins(routine.outputs, 'output'), ...(routine.pure ? [] : [{ key: 'next', name: 'Next', direction: 'output' as const, kind: 'execution' as const }])] }
  }
  const eventMatch = /^custom\.(event|emit)\.([0-9a-f-]+)$/.exec(type)
  if (eventMatch) {
    const event = (graph.customEvents ?? []).find(item => item.uuid === eventMatch[2])
    if (!event) return null
    return eventMatch[1] === 'event'
      ? { type, title: `Event ${title(event.name)}`, category: 'Events', description: event.description || `Receives ${event.name}.`, keywords: `custom event ${event.name}`, color: COLORS.Events, pins: [{ key: 'next', name: 'Next', direction: 'output', kind: 'execution' }, ...parameterPins(event.parameters, 'output')] }
      : { type, title: `Call ${title(event.name)}`, category: 'Events', description: event.description || `Invokes ${event.name}.`, keywords: `custom event call emit ${event.name}`, color: COLORS.Events, pins: [{ key: 'exec', name: 'In', direction: 'input', kind: 'execution' }, ...parameterPins(event.parameters, 'input'), { key: 'next', name: 'Next', direction: 'output', kind: 'execution' }] }
  }
  return null
}

export function productionGraphNodeCatalog(graph?: NovaGraphDocument, scope?: GraphRoutine | null): GraphNodeDefinition[] {
  const pluginNodes = pluginState.contributions.filter(contribution => contribution.kind === 'graphNodes').flatMap((contribution): GraphNodeDefinition[] => {
    const api = SCRIPT_API_V2_MANIFEST.entries.find(entry => entry.callable === (contribution.entry || contribution.id))
    if (!api) return []
    const definition = definitionFromApi(api)
    return [{ ...definition, type: `plugin.${contribution.pluginId}.${contribution.id}`, title: contribution.label, category: 'Libraries', description: contribution.description || definition.description, keywords: `${definition.keywords} ${contribution.pluginName} plugin extension`, color: COLORS.Libraries, packageId: contribution.pluginId }]
  })
  if (!graph) return pluginNodes
  const types = [
    ...(scope ? ['routine.entry', 'routine.return', 'local.get', 'local.set'] : []),
    ...(graph.routines ?? []).map(routine => `routine.call.${routine.uuid}`),
    ...(graph.customEvents ?? []).flatMap(event => [`custom.event.${event.uuid}`, `custom.emit.${event.uuid}`])
  ]
  const routineNodes = types.map(type => routineDefinition(type, graph, scope)).filter((item): item is GraphNodeDefinition => Boolean(item))
  const packageNodes = (graph.libraries ?? []).filter(library => library.enabled).flatMap(library => {
    const installed = packageState.installed.find(item => item.enabled && item.project && item.manifest.id === library.packageId && versionSatisfies(item.manifest.version, library.version))
    if (!installed) return []
    return installed.manifest.visualNodes.flatMap((node): GraphNodeDefinition[] => {
      const api = SCRIPT_API_V2_MANIFEST.entries.find(entry => entry.callable === node.callable)
      if (!api) return []
      const expected = signatureParts(api.signature).parameters.length
      if (expected !== node.inputs.length) return []
      const pins: GraphPinTemplate[] = [
        ...(api.resultConvention === 'queued-command' ? [{ key: 'exec', name: 'In', direction: 'input' as const, kind: 'execution' as const }] : []),
        ...node.inputs.map(input => ({ key: input.name, name: title(input.name), direction: 'input' as const, kind: 'data' as const, valueType: input.valueType, required: true, defaultValue: input.defaultValue as GraphValue })),
        ...(node.output ? [{ key: node.output.name, name: title(node.output.name), direction: 'output' as const, kind: 'data' as const, valueType: node.output.valueType }] : []),
        ...(api.resultConvention === 'queued-command' ? [{ key: 'next', name: 'Next', direction: 'output' as const, kind: 'execution' as const }] : [])
      ]
      return [{ type: `package.${installed.manifest.id}.${node.id}`, title: node.title, category: node.category || 'Libraries', description: node.description, keywords: `${installed.manifest.name} ${node.callable} package library`, color: COLORS.Libraries, pins, api, packageId: installed.manifest.id, deprecatedBy: node.deprecatedBy || undefined }]
    })
  })
  return [...routineNodes, ...packageNodes, ...pluginNodes]
}

export function graphNodeDefinition(type: string, graph?: NovaGraphDocument, scope?: GraphRoutine | null): GraphNodeDefinition | null { return CATALOG.get(type) ?? productionGraphNodeCatalog(graph, scope).find(item => item.type === type) ?? null }
export function searchGraphNodeCatalog(query: string, graph?: NovaGraphDocument, scope?: GraphRoutine | null): readonly GraphNodeDefinition[] { const needle = query.trim().toLowerCase(); return [...GRAPH_NODE_CATALOG, ...productionGraphNodeCatalog(graph, scope)].filter(item => !needle || `${item.title} ${item.category} ${item.description} ${item.keywords}`.toLowerCase().includes(needle)) }

export function createGraphNode(type: string, x = 0, y = 0, graph?: NovaGraphDocument, scope?: GraphRoutine | null): GraphNode {
  const definition = graphNodeDefinition(type, graph, scope)
  if (!definition) throw new Error(`Unknown visual graph node type: ${type}`)
  const node: GraphNode = { uuid: graphUuid(), type, title: definition.title, category: definition.category, position: { x, y }, size: { width: 224, height: Math.max(82, 46 + definition.pins.length * 26) }, collapsed: false, pins: definition.pins.map(pin), config: {} }
  if (type === 'literal.boolean') node.config.value = false
  else if (type === 'literal.number') node.config.value = 0
  else if (type === 'literal.vec2') node.config.value = [0, 0]
  else if (type.startsWith('literal.')) node.config.value = ''
  if (type.startsWith('variable.')) {
    const variable = graph?.variables[0]
    node.config.variableUuid = variable?.uuid ?? ''
    const valuePin = node.pins.find(item => item.kind === 'data')
    if (valuePin && variable) { valuePin.valueType = variable.valueType; valuePin.defaultValue = variable.defaultValue }
  }
  if (type.startsWith('local.')) {
    const local = scope?.locals[0]
    node.config.localUuid = local?.uuid ?? ''
    const valuePin = node.pins.find(item => item.kind === 'data')
    if (valuePin && local) { valuePin.valueType = local.valueType; valuePin.defaultValue = local.defaultValue }
  }
  return node
}

export function defaultVisualGraph(name = 'Visual Script'): NovaGraphDocument {
  const graph: NovaGraphDocument = {
    format: 'nova-graph', version: 1, apiVersion: 2, uuid: graphUuid(), name,
    variables: [], routines: [], customEvents: [], interfaces: [], libraries: [],
    debug: { breakpoints: [], watches: [], breakOnError: true, coverageEnabled: true }, migrations: [],
    nodes: [], edges: [], comments: [], viewport: { x: 24, y: 80, zoom: 1 }
  }
  const event = createGraphNode('event.start', 80, 120, graph)
  const log = createGraphNode('api.log_info', 380, 120, graph)
  const message = log.pins.find(item => item.key === 'message')
  if (message) message.defaultValue = 'Hello from Nova Visual Script'
  graph.nodes.push(event, log)
  graph.edges.push({ uuid: graphUuid(), from: { nodeUuid: event.uuid, pinUuid: event.pins.find(item => item.key === 'next')!.uuid }, to: { nodeUuid: log.uuid, pinUuid: log.pins.find(item => item.key === 'exec')!.uuid } })
  return graph
}
