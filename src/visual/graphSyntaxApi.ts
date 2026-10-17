/** 将已注册 Rhai 重载映射到结构节点库，校验扩展默认值并建立调用或生命周期声明的子槽。 */
import { RHAI_API_SIGNATURES, type RhaiApiParameter, type RhaiApiSignature } from './rhaiApiSignatures'
import type { GraphNodeDefinition } from './graphCatalog'
import { graphUuid, type GraphNode, type GraphValue } from './graphTypes'
import { initializeSyntaxNode, type SyntaxSlot } from './graphSyntaxSchema'

const usable = RHAI_API_SIGNATURES.filter(/** 仅公开 WASM 可用、非内部且可作为普通标识符调用的重载。 */ signature => signature.available && signature.profiles.includes('wasm') && !signature.internal && !signature.operator && /^[A-Za-z_][A-Za-z0-9_]*$/.test(signature.name))
const signatureByType = new Map(usable.map(/** 按稳定重载编号索引签名，避免同名不同参数的函数混淆。 */ signature => ['rhai-api.' + signature.id, signature]))
export const SYNTAX_API_NODE_DEFINITIONS: readonly GraphNodeDefinition[] = usable.map(/** 为每个重载生成节点库标题、分类、检索词和结果端口。 */ signature => ({
  type: 'rhai-api.' + signature.id,
  title: signature.name + '(' + signature.parameters.map(/** 在标题中保留实际参数类型以区分重载。 */ parameter => parameter.type).join(', ') + ')',
  category: signature.role === 'lifecycle' ? 'Language callbacks' : signature.origin === 'host' ? 'Language engine API' : 'Language ' + (signature.package ?? 'built-ins'),
  description: (signature.role === 'lifecycle' ? 'Callback declaration. ' : 'Returns ' + signature.returnType + '. ') + signature.documentation + ' Parameters are required; inserted literals are editable placeholders.',
  keywords: [signature.name, signature.package ?? '', signature.origin, signature.returnType, ...signature.parameters.map(/** 将参数名和类型加入节点检索关键词。 */ parameter => parameter.name + ' ' + parameter.type)].join(' '),
  color: signature.role === 'lifecycle' ? '#e45b73' : '#48b8ad',
  pins: [{ key: 'result', name: signature.role === 'lifecycle' ? 'Declaration' : signature.returnType, direction: 'output', kind: 'data', valueType: 'Data' }],
}))
const definitionByType = new Map(SYNTAX_API_NODE_DEFINITIONS.map(/** 按节点类型建立定义索引。 */ definition => [definition.type, definition]))
/** 查询已公开的节点定义；未知或不可用类型返回空值。 */
export function syntaxApiNodeDefinition(type: string): GraphNodeDefinition | null { return definitionByType.get(type) ?? null }
/** 查询节点对应的具体 Rhai 重载签名；未知类型返回空值。 */
export function syntaxApiSignature(type: string): RhaiApiSignature | null { return signatureByType.get(type) ?? null }

/** 按注册参数类型序列化扩展默认值；限制嵌套、节点数和文本长度，拒绝无法表示的值。 */
function extensionLiteral(value: unknown, parameter: RhaiApiParameter): string | null {
  if (value === undefined) return parameter.defaultLiteral
  /** 转义引号、反斜线、换行及控制字符，构造 Rhai 字符串字面量。 */
  const quote = (text: string) => '"' + [...text].map(/** 将单个字符转换为安全的字面量内容；普通字符保持原样。 */ character => character === '"' ? '\\"' : character === '\\' ? '\\\\' : character === '\n' ? '\\n' : character === '\r' ? '\\r' : character === '\t' ? '\\t' : character.charCodeAt(0) < 32 ? `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}` : character).join('') + '"'
  /** 保留负零，浮点参数的整数字面量补小数点以避免选中整数重载。 */
  const number = (value: number, float: boolean) => { const raw = Object.is(value, -0) ? '-0' : String(value); return float && !/[.eE]/.test(raw) ? raw + '.0' : raw }
  let visited = 0
  /** 递归序列化动态值；拒绝非有限数字、过深或过大的集合及不支持的 JS 类型。 */
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
/** 扩展节点只是已有重载的别名；仅匹配名称与数据输入数量相同的已注册可调用签名。 */
export function syntaxExtensionDefinitions(contributions: readonly GraphNodeDefinition[]): GraphNodeDefinition[] {
  return contributions.flatMap(/** 忽略未声明 API 或包身份的贡献，将合格贡献展开为各个匹配重载。 */ contribution => {
    if (!contribution.api || !contribution.packageId) return []
    const inputs = contribution.pins.filter(/** 仅数据输入参与调用参数数量匹配，排除控制流端口。 */ pin => pin.direction === 'input' && pin.kind === 'data')
    return usable.filter(/** 筛选当前运行环境中名称与参数数量兼容的可调用重载。 */ signature => signature.role === 'callable' && signature.profiles.includes('wasm') && signature.name === contribution.api!.callable && signature.parameters.length === inputs.length).map(/** 继承系统签名结构，保留扩展展示文案、包身份及已验证的参数默认值。 */ signature => {
      const syntaxApiType = 'rhai-api.' + signature.id, definition = definitionByType.get(syntaxApiType)!
      return {
        ...definition, type: contribution.type + '.' + signature.id, syntaxApiType,
        syntaxApiDefaults: inputs.map(/** 按位置使用注册类型验证每个扩展默认值。 */ (input, index) => extensionLiteral(input.defaultValue, signature.parameters[index])),
        title: contribution.title + '(' + signature.parameters.map(/** 在标题中保留实际参数类型以区分重载。 */ parameter => parameter.type).join(', ') + ')',
        category: contribution.category || 'Libraries', description: contribution.description || definition.description,
        keywords: definition.keywords + ' ' + contribution.keywords, packageId: contribution.packageId, api: contribution.api,
      }
    })
  })
}

/** Palette overloads persist as ordinary Call/FunctionDeclaration structure nodes. */
/** 将节点库重载实例化为普通结构调用或函数声明；校验默认值数量并限制端口总数。 */
export function initializeSyntaxApiNode(node: GraphNode, requestedType: string, defaults?: readonly (string | null)[]): void {
  const signature = signatureByType.get(requestedType)
  if (!signature) throw new Error('This Rhai overload is unavailable in the declared runtime.')
  if (defaults && defaults.length !== signature.parameters.length) throw new Error('Extension defaults do not match the registered overload arity.')
  node.type = signature.role === 'lifecycle' ? 'rhai.FunctionDeclaration' : 'rhai.Call'
  initializeSyntaxNode(node)
  node.pins = node.pins.filter(/** 重建输入槽前保留结构节点的输出端口。 */ pin => pin.direction === 'output')
  node.config.fields = signature.role === 'lifecycle' ? { name: signature.name, private: false } : { optional: false }
  node.config.apiSignatureId = signature.id
  const slots: SyntaxSlot[] = []
  /** 同时建立输入端口与对应源码子槽；无默认字面量时要求连接有效子节点。 */
  const append = (field: string, index: number, name: string, fallback: string | null) => {
    const key = index < 0 ? field : field + '_' + index
    node.pins.push({ uuid: graphUuid(), key, name, direction: 'input', kind: 'data', valueType: 'Data', required: fallback === null, defaultValue: null })
    slots.push({ key, field, index, start: -1, end: -1, childId: '', fallback: fallback ?? '' })
  }
  if (signature.role === 'lifecycle') {
    signature.parameters.forEach(/** 生命周期形参保留合法名称，否则使用确定性的后备参数名。 */ (parameter, index) => append('parameters', index, parameter.name, /^[A-Za-z_][A-Za-z0-9_]*$/.test(parameter.name) ? parameter.name : 'arg' + index))
    append('body', -1, 'Callback body', '{}')
  } else {
    append('callee', -1, 'Function', signature.name)
    signature.parameters.forEach(/** 为每个调用实参建立类型提示，优先采用已校验的扩展默认值。 */ (parameter, index) => append('arguments', index, parameter.name + ' · ' + parameter.type, defaults ? defaults[index] : parameter.defaultLiteral))
  }
  if (node.pins.length > 128) throw new Error('This overload exceeds the declared node pin limit.')
  node.config.slots = slots as unknown as GraphValue
  node.size = { width: 288, height: Math.max(108, 54 + node.pins.length * 28) }
}
