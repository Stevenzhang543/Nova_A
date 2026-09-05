import { RHAI_API_SIGNATURES, type RhaiApiParameter, type RhaiApiSignature } from './rhaiApiSignatures'
import type { GraphNodeDefinition } from './graphCatalog'
import { graphUuid, type GraphNode, type GraphValue } from './graphTypes'
import { initializeSyntaxNode, type SyntaxSlot } from './graphSyntaxSchema'

const usable = RHAI_API_SIGNATURES.filter(signature => signature.available && signature.profiles.includes('wasm') && !signature.internal && !signature.operator && /^[A-Za-z_][A-Za-z0-9_]*$/.test(signature.name))
const signatureByType = new Map(usable.map(signature => ['rhai-api.' + signature.id, signature]))
export const SYNTAX_API_NODE_DEFINITIONS: readonly GraphNodeDefinition[] = usable.map(signature => ({
  type: 'rhai-api.' + signature.id,
  title: signature.name + '(' + signature.parameters.map(parameter => parameter.type).join(', ') + ')',
  category: signature.role === 'lifecycle' ? 'Language callbacks' : signature.origin === 'host' ? 'Language engine API' : 'Language ' + (signature.package ?? 'built-ins'),
  description: (signature.role === 'lifecycle' ? 'Callback declaration. ' : 'Returns ' + signature.returnType + '. ') + signature.documentation + ' Parameters are required; inserted literals are editable placeholders.',
  keywords: [signature.name, signature.package ?? '', signature.origin, signature.returnType, ...signature.parameters.map(parameter => parameter.name + ' ' + parameter.type)].join(' '),
  color: signature.role === 'lifecycle' ? '#e45b73' : '#48b8ad',
  pins: [{ key: 'result', name: signature.role === 'lifecycle' ? 'Declaration' : signature.returnType, direction: 'output', kind: 'data', valueType: 'Data' }],
}))
const definitionByType = new Map(SYNTAX_API_NODE_DEFINITIONS.map(definition => [definition.type, definition]))
export function syntaxApiNodeDefinition(type: string): GraphNodeDefinition | null { return definitionByType.get(type) ?? null }
export function syntaxApiSignature(type: string): RhaiApiSignature | null { return signatureByType.get(type) ?? null }

function extensionLiteral(value: unknown, parameter: RhaiApiParameter): string | null {
  if (value === undefined) return parameter.defaultLiteral
  const quote = (text: string) => '"' + [...text].map(character => character === '"' ? '\\"' : character === '\\' ? '\\\\' : character === '\n' ? '\\n' : character === '\r' ? '\\r' : character === '\t' ? '\\t' : character.charCodeAt(0) < 32 ? `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}` : character).join('') + '"'
  const number = (value: number, float: boolean) => { const raw = Object.is(value, -0) ? '-0' : String(value); return float && !/[.eE]/.test(raw) ? raw + '.0' : raw }
  let visited = 0
  const data = (value: unknown, depth = 0): string | null => {
    if (++visited > 4096 || depth > 16) return null
    if (value === null) return '()'
    if (typeof value === 'boolean') return String(value)
    if (typeof value === 'string') return value.length > 8192 ? null : quote(value)
    if (typeof value === 'number') return Number.isFinite(value) ? number(value, !Number.isSafeInteger(value) || Object.is(value, -0)) : null
    if (!value || typeof value !== 'object') return null
    const values: string[] = []
    if (Array.isArray(value)) {
      if (value.length > 4096 - visited) return null
      for (const child of value) { const literal = data(child, depth + 1); if (literal === null) return null; values.push(literal) }
    } else {
      for (const key in value) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) continue
        if (visited >= 4096 || key.length > 8192) return null
        const literal = data((value as Record<string, unknown>)[key], depth + 1)
        if (literal === null) return null
        values.push(quote(key) + ': ' + literal)
      }
    }
    const result = Array.isArray(value) ? '[' + values.join(', ') + ']' : '#{' + values.join(', ') + '}'
    return result.length > 8192 ? null : result
  }
  let result: string | null = null
  if (parameter.type === 'float' && typeof value === 'number' && Number.isFinite(value)) result = number(value, true)
  else if (parameter.type === 'int' && typeof value === 'number' && Number.isSafeInteger(value)) result = number(value, false)
  else if (parameter.type === 'bool' && typeof value === 'boolean') result = String(value)
  else if (parameter.type === 'string' && typeof value === 'string' && value.length <= 8192) result = quote(value)
  else if (parameter.type === 'array' && Array.isArray(value) || parameter.type === 'dynamic') result = data(value)
  // Handles, opaque Rust values, closures and timestamps must come from valid
  // producer nodes. A serialized object does not establish a live handle.
  return result !== null && result.length <= 8192 ? result : null
}

/** Existing package/plugin graph contributions are aliases, not registrations
 * of new Rhai functions. Offer one alias per verified, arity-compatible overload. */
export function syntaxExtensionDefinitions(contributions: readonly GraphNodeDefinition[]): GraphNodeDefinition[] {
  return contributions.flatMap(contribution => {
    if (!contribution.api || !contribution.packageId) return []
    const inputs = contribution.pins.filter(pin => pin.direction === 'input' && pin.kind === 'data')
    return usable.filter(signature => signature.role === 'callable' && signature.profiles.includes('wasm') && signature.name === contribution.api!.callable && signature.parameters.length === inputs.length).map(signature => {
      const syntaxApiType = 'rhai-api.' + signature.id, definition = definitionByType.get(syntaxApiType)!
      return {
        ...definition, type: contribution.type + '.' + signature.id, syntaxApiType,
        syntaxApiDefaults: inputs.map((input, index) => extensionLiteral(input.defaultValue, signature.parameters[index])),
        title: contribution.title + '(' + signature.parameters.map(parameter => parameter.type).join(', ') + ')',
        category: contribution.category || 'Libraries', description: contribution.description || definition.description,
        keywords: definition.keywords + ' ' + contribution.keywords, packageId: contribution.packageId, api: contribution.api,
      }
    })
  })
}

/** Palette overloads persist as ordinary Call/FunctionDeclaration structure nodes. */
export function initializeSyntaxApiNode(node: GraphNode, requestedType: string, defaults?: readonly (string | null)[]): void {
  const signature = signatureByType.get(requestedType)
  if (!signature) throw new Error('This Rhai overload is unavailable in the declared runtime.')
  if (defaults && defaults.length !== signature.parameters.length) throw new Error('Extension defaults do not match the registered overload arity.')
  node.type = signature.role === 'lifecycle' ? 'rhai.FunctionDeclaration' : 'rhai.Call'
  initializeSyntaxNode(node)
  node.pins = node.pins.filter(pin => pin.direction === 'output')
  node.config.fields = signature.role === 'lifecycle' ? { name: signature.name, private: false } : { optional: false }
  node.config.apiSignatureId = signature.id
  const slots: SyntaxSlot[] = []
  const append = (field: string, index: number, name: string, fallback: string | null) => {
    const key = index < 0 ? field : field + '_' + index
    node.pins.push({ uuid: graphUuid(), key, name, direction: 'input', kind: 'data', valueType: 'Data', required: fallback === null, defaultValue: null })
    slots.push({ key, field, index, start: -1, end: -1, childId: '', fallback: fallback ?? '' })
  }
  if (signature.role === 'lifecycle') {
    signature.parameters.forEach((parameter, index) => append('parameters', index, parameter.name, /^[A-Za-z_][A-Za-z0-9_]*$/.test(parameter.name) ? parameter.name : 'arg' + index))
    append('body', -1, 'Callback body', '{}')
  } else {
    append('callee', -1, 'Function', signature.name)
    signature.parameters.forEach((parameter, index) => append('arguments', index, parameter.name + ' · ' + parameter.type, defaults ? defaults[index] : parameter.defaultLiteral))
  }
  if (node.pins.length > 128) throw new Error('This overload exceeds the declared node pin limit.')
  node.config.slots = slots as unknown as GraphValue
  node.size = { width: 288, height: Math.max(108, 54 + node.pins.length * 28) }
}
