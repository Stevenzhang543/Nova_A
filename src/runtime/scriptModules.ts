/** 脚本模块解析：规范模块引用并查找项目内可加载模块。 */
import { isRhaiTrivia, lexRhai } from '../visual/rhaiSyntaxLexer'

export interface ScriptModuleAsset { uuid: string; path: string; assetType: 'script' | 'visualScript' }
export interface ScriptModuleHost {
  resolveAsset(reference: string): ScriptModuleAsset | null
  readSource(uuid: string): string | null
  compileVisual(source: string): string
}
export interface ScriptModuleLimits { maxModules: number; maxDepth: number; maxSourceLength: number; maxBundleLength: number; maxVisualDocumentLength: number }
export const SCRIPT_MODULE_LIMITS: Readonly<ScriptModuleLimits> = Object.freeze({ maxModules: 256, maxDepth: 32, maxSourceLength: 1_000_000, maxBundleLength: 1_000_000, maxVisualDocumentLength: 16_777_216 })

interface Dependency { reference: string; start: number; end: number; line: number; column: number }
const location = /** 按模板 `${asset.path}:${line}:${column}` 生成并返回字符串。 */ (asset: ScriptModuleAsset, line: number, column: number) => `${asset.path}:${line}:${column}`

/** Host use directives have literal paths, not Rhai string interpolation/escape semantics. */
/** 对真实 Rhai 词法标记识别顶层整行常量 use 依赖，拒绝原生 import、嵌套声明和预算超限。 */ function dependencies(source: string, asset: ScriptModuleAsset, maximum: number): Dependency[] {
  const lexed = lexRhai(source, { moduleMode: 'host', limits: { maxSourceLength: maximum } })
  const limit = lexed.diagnostics.find(/* 先计算 item.code.startsWith('RHAI-LIMIT-')；仅当其为假值时求右侧 item.code === 'RHAI-CANCELLED'，返回短路求值结果。 */ item => item.code.startsWith('RHAI-LIMIT-') || item.code === 'RHAI-CANCELLED')
  if (limit) throw new Error(`${location(asset, limit.span.line, limit.span.column)}: ${limit.message}`)
  const tokens = lexed.tokens.filter(/* 先计算 !isRhaiTrivia(token)；仅当其为真值时求右侧 token.kind !== 'eof'，返回短路求值结果。 */ token => !isRhaiTrivia(token) && token.kind !== 'eof'), result: Dependency[] = []
  let nesting = 0
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    if (token.kind === 'keyword' && token.text === 'import') throw new Error(`${location(asset, token.span.line, token.span.column)}: Native import/namespace modules are disabled. Use a standalone project dependency: use "path";`)
    if (token.kind === 'keyword' && token.text === 'use') {
      if (nesting !== 0) throw new Error(`${location(asset, token.span.line, token.span.column)}: Project use dependencies must be declared at module scope.`)
      const start = source.lastIndexOf('\n', token.span.start - 1) + 1, newline = source.indexOf('\n', token.span.end), end = newline < 0 ? source.length : newline
      // Check the real token's whole line only. A matching line inside a comment or string is never visited.
      const match = /^\s*use\s+(["'`])([^"'`\r\n]+)\1\s*;?\s*$/.exec(source.slice(start, end))
      if (!match || match[1] === '`' && match[2].includes('${')) throw new Error(`${location(asset, token.span.line, token.span.column)}: A project dependency must occupy one whole line: use "path"; with a constant path and no alias.`)
      result.push({ reference: match[2], start: token.span.start, end, line: token.span.line, column: token.span.column })
      while (tokens[index + 1] && tokens[index + 1].span.start < end) index++
      continue
    }
    const structural = token.kind === 'punctuation' || token.kind === 'operator'
    if (token.kind === 'interpolationStart' || structural && ['{', '#{', '(', '['].includes(token.text)) nesting++
    else if (token.kind === 'interpolationEnd' || structural && ['}', ')', ']'].includes(token.text)) nesting = Math.max(0, nesting - 1)
  }
  return result
}

/** Pure asset reads/compilation until the complete bundle succeeds; no project or VM state is mutated. */
/** 限制模块深度、数量及源码总量，递归解析项目依赖并按依赖先行顺序生成保留行号的脚本包。 */ export function resolveProjectScriptBundle(rootReference: string, host: ScriptModuleHost, overrides = new Map<string, string>(), requested: Partial<ScriptModuleLimits> = {}): string | null {
  const limits = Object.fromEntries(Object.entries(SCRIPT_MODULE_LIMITS).map(/** 将调用者请求的模块预算限制在系统最大值以内，并使用正整数下界。 */ ([key, maximum]) => { const value = requested[key as keyof ScriptModuleLimits]; return [key, Math.max(1, Math.min(maximum, Number.isFinite(value) ? Math.floor(value!) : maximum))] })) as unknown as ScriptModuleLimits
  const root = host.resolveAsset(rootReference)
  if (!root) return null
  const visiting = new Set<string>(), resolved = new Set<string>(), chunks: string[] = []
  let totalLength = 0
  const visit = /** 检查循环与容量，读取或编译单模块，先递归依赖，再以空白替换 use 指令并追加带来源头的源码。 */ (asset: ScriptModuleAsset, depth: number): void => {
    if (visiting.has(asset.uuid)) throw new Error(`Circular script module dependency at ${asset.path}.`)
    if (resolved.has(asset.uuid)) return
    if (depth > limits.maxDepth) throw new Error(`Script module dependency depth exceeds ${limits.maxDepth} at ${asset.path}.`)
    if (visiting.size + resolved.size >= limits.maxModules) throw new Error(`Script module count exceeds ${limits.maxModules} at ${asset.path}.`)
    const raw = overrides.get(asset.uuid) ?? host.readSource(asset.uuid)
    if (raw === null) throw new Error(`Missing script module source: ${asset.path}.`)
    if (asset.assetType === 'visualScript' && raw.length > limits.maxVisualDocumentLength) throw new Error(`Visual script document exceeds ${limits.maxVisualDocumentLength} UTF-16 code units: ${asset.path}.`)
    const source = asset.assetType === 'visualScript' ? host.compileVisual(raw) : raw
    if (source.length > limits.maxSourceLength) throw new Error(`Script module source exceeds ${limits.maxSourceLength} UTF-16 code units: ${asset.path}.`)
    // Count source before descending, including directives, to bound work on large dependency trees.
    const header = `// module: ${asset.path.replace(/[\r\n]/g, ' ')}\n`
    totalLength += source.length + header.length + (visiting.size + resolved.size > 0 ? 2 : 0)
    if (totalLength > limits.maxBundleLength) throw new Error(`Script module bundle exceeds ${limits.maxBundleLength} UTF-16 code units at ${asset.path}.`)
    visiting.add(asset.uuid)
    const imports = dependencies(source, asset, limits.maxSourceLength)
    for (const dependency of imports) {
      const normalized = dependency.reference.replace(/\\/g, '/').replace(/^\.\//, '')
      const path = normalized.startsWith('Assets/') ? normalized : `Assets/Scripts/${normalized}`
      const module = [path, path.endsWith('.rhai') ? path : `${path}.rhai`].map(/* 调用 host.resolveAsset(reference) 并返回调用结果。 */ reference => host.resolveAsset(reference)).find(/* 比较 candidate?.assetType 与 'script'，返回严格相等的判断结果。 */ candidate => candidate?.assetType === 'script')
      if (!module) throw new Error(`${location(asset, dependency.line, dependency.column)}: Script module not found: ${dependency.reference}.`)
      visit(module, depth + 1)
    }
    visiting.delete(asset.uuid); resolved.add(asset.uuid)
    let stripped = source
    for (const dependency of [...imports].reverse()) stripped = stripped.slice(0, dependency.start) + stripped.slice(dependency.start, dependency.end).replace(/[^\r\n]/g, ' ') + stripped.slice(dependency.end)
    chunks.push(header + stripped)
  }
  visit(root, 1)
  return chunks.join('\n\n')
}
