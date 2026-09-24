/** 结构化脚本语言分析：把 Rhai 语法与绑定信息转换为编辑诊断、测试指令和格式化结果。 */
import { RHAI_API_SIGNATURES } from '../visual/rhaiApiSignatures'
import { emitRhai, parseRhai, walkRhai, type RhaiBinding, type RhaiSourceEdit, type RhaiSpan } from '../visual/rhaiSyntax'
import { decodeRhaiString } from '../visual/rhaiSyntaxLexer'
import { apiEntry } from './scriptApi'
import { analyzeScript26 } from './scriptLanguage26'
import type { ScriptAnalysis, ScriptDiagnostic, ScriptSemanticToken, ScriptSymbol, ScriptTestMetadata } from './scriptLanguage'

export const VERIFIED_SCRIPT_SIGNATURES = RHAI_API_SIGNATURES.filter(/* 先计算 signature.available && signature.profiles.includes('wasm') && !signature.internal；仅当其为真值时求右侧 !signature.operator，返回短路求值结果。 */ signature => signature.available && signature.profiles.includes('wasm') && !signature.internal && !signature.operator)
const CALLABLE_NAMES = new Set(VERIFIED_SCRIPT_SIGNATURES.filter(/* 比较 signature.role 与 'callable'，返回严格相等的判断结果。 */ signature => signature.role === 'callable').map(/* 返回 signature.name 的当前值。 */ signature => signature.name))
const HOST_NAMES = new Set(RHAI_API_SIGNATURES.filter(/** 筛选 WASM 配置可用的宿主可调用签名，构建静态 API 名称集合。 */ signature => signature.available && signature.profiles.includes('wasm') && signature.origin === 'host' && signature.role === 'callable').map(/* 返回 signature.name 的当前值。 */ signature => signature.name))
const LIFECYCLE_NAMES = new Set([...VERIFIED_SCRIPT_SIGNATURES.filter(/* 比较 signature.role 与 'lifecycle'，返回严格相等的判断结果。 */ signature => signature.role === 'lifecycle').map(/* 返回 signature.name 的当前值。 */ signature => signature.name), 'before_all', 'before_each', 'after_each', 'after_all'])
const blank = /* 调用 text.replace(/[^\r\n]/g, ' ') 并返回调用结果。 */ (text: string) => text.replace(/[^\r\n]/g, ' ')

/** 将源码跨度和诊断类别转换为编辑器统一定位、严重性及文档链接。 */ function diagnostic(span: RhaiSpan, severity: ScriptDiagnostic['severity'], phase: ScriptDiagnostic['phase'], code: string, message: string): ScriptDiagnostic {
  return { line: span.line, column: span.column, endLine: span.endLine, endColumn: span.endColumn, range: { start: { line: span.line, column: span.column }, end: { line: span.endLine, column: span.endColumn } }, severity, phase, code, message, source: 'Nova Rhai', documentation: `manual/index.html#diagnostic-${code.toLowerCase()}` }
}
/** 解析行注释中的测试参数，规范化超时、跳过、标签、随机种子与参数化用例数量。 */ function testDirective(text: string): Omit<ScriptTestMetadata, 'name' | 'line'> | null {
  const match = text.trimEnd().match(/^\s*\/\/\s*@test(?:\s+(.*))?$/)
  if (!match) return null
  const fields = Object.fromEntries(match[1]?.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(/** 将测试指令参数拆为键值，单独标志视为 true，并去除值两端引号。 */ item => { const equal = item.indexOf('='); return equal < 0 ? [item, 'true'] : [item.slice(0, equal), item.slice(equal + 1).replace(/^"|"$/g, '')] }) ?? [])
  return { timeoutMs: Math.min(120_000, Math.max(1, Math.round(Number(fields.timeout) || 10_000))), skipped: fields.skip === 'true', tags: String(fields.tags ?? '').split(',').filter(Boolean).slice(0, 32), seed: Number.isFinite(Number(fields.seed)) ? Number(fields.seed) >>> 0 : 1, cases: String(fields.cases ?? '').split('|').filter(Boolean).slice(0, 128) }
}

/** One token/AST/scope authority for editor diagnostics, symbols and references. */
/** 基于 Rhai 语法与绑定生成诊断、符号、引用、测试及语义高亮，并兼容既有注释类型分析结果。 */ export function analyzeScriptSyntax(source: string, apiVersion: 1 | 2, revision: number, externalFunctions: readonly string[]): ScriptAnalysis {
  const started = performance.now(), program = parseRhai(source, { moduleMode: 'host' })
  const nodes = [...walkRhai(program)], bindingById = new Map(program.bindings.map(/* 返回按声明顺序构造的数组 [binding.id, binding]。 */ binding => [binding.id, binding]))
  const diagnostics: ScriptDiagnostic[] = program.diagnostics.map(/** 把解析器诊断编码映射到编辑器语法或语义类别，保留原跨度与消息。 */ item => {
    const code = item.code === 'RHAI-BIND-DUPLICATE' ? 'NOVA-SEM-001' : item.code.startsWith('RHAI-BIND-') ? item.code.replace('RHAI-BIND-', 'NOVA-SEM-') : item.code.replace(/^RHAI-/, 'NOVA-PARSE-')
    return diagnostic(item.span, item.severity, item.code.startsWith('RHAI-BIND-') ? 'semantic' : 'parser', code, item.message)
  })
  const known = new Set([...CALLABLE_NAMES, ...externalFunctions, '__nova_graph_trace']), calls = new Set<string>(), apiUsage = new Set<string>()
  for (const node of nodes) if (node.kind === 'Call') {
    const callee = node.callee, name = callee.kind === 'Identifier' ? callee.name : callee.kind === 'Member' ? callee.property : null
    if (!name) continue
    calls.add(name)
    // Member names may resolve through a map-held closure or dynamic receiver.
    // Only unresolved direct identifiers prove that a function name is unknown.
    if (callee.kind === 'Identifier' && !callee.bindingId && !known.has(name) && !['sleep', 'eval'].includes(name)) diagnostics.push(diagnostic(callee.span, 'error', 'semantic', 'NOVA-SEM-003', `Unknown function “${name}”.`))
    const entry = apiEntry(name)
    if (HOST_NAMES.has(name)) apiUsage.add(name)
    if (entry?.deprecated) diagnostics.push(diagnostic(callee.kind === 'Member' ? callee.propertySpan : callee.span, 'warning', 'compatibility', 'NOVA-COMPAT-001', `“${name}” is deprecated; use “${entry.deprecated.replacement}”.`))
    if (name === 'Fn' && node.arguments[0]?.kind === 'Literal' && node.arguments[0].literalKind === 'string') { try { calls.add(decodeRhaiString(node.arguments[0].raw)) } catch { /* Lexer owns malformed strings. */ } }
  }
  const dependencies: string[] = []
  for (const node of nodes) if (node.kind === 'ModuleDeclaration' && node.keyword === 'use') {
    const path = source.slice(node.path.span.start, node.path.span.end).slice(1, -1)
    if (path.replace(/\\/g, '/').split('/').includes('..') || /^[a-z]+:/i.test(path)) diagnostics.push(diagnostic(node.path.span, 'error', 'semantic', 'NOVA-MODULE-001', `Module path may not escape Assets: ${path}`))
    dependencies.push(path)
  }
  if (apiVersion === 1) diagnostics.push(diagnostic({ start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 2 }, 'info', 'compatibility', 'NOVA-COMPAT-V1', 'This asset uses the API v1 compatibility adapter. Use code actions to migrate deprecated calls before selecting API v2.'))
  const commentsByLine = new Map(program.tokens.filter(/* 比较 token.kind 与 'lineComment'，返回严格相等的判断结果。 */ token => token.kind === 'lineComment').map(/* 返回按声明顺序构造的数组 [token.span.line, token.text]。 */ token => [token.span.line, token.text]))
  const precedingComments = /** 向上收集紧邻声明的连续行注释，保持原始顺序用于文档和测试指令。 */ (line: number) => { const result: string[] = []; while (line > 1) { const text = commentsByLine.get(--line); if (!text) break; result.unshift(text) }; return result }
  const symbols: ScriptSymbol[] = [], tests: ScriptTestMetadata[] = [], functions: ScriptAnalysis['functions'] = {}, referencedBindings = new Set(program.references.map(/* 返回 reference.bindingId 的当前值。 */ reference => reference.bindingId))
  for (const node of nodes) if (node.kind === 'FunctionDeclaration' || node.kind === 'VariableDeclaration') {
    const comments = precedingComments(node.span.line), docs = comments.filter(/* 调用 /^\/\/\//.test(text) 并返回调用结果。 */ text => /^\/\/\//.test(text)).map(/* 调用 text.replace(/^\/\/\/\s?/, '') 并返回调用结果。 */ text => text.replace(/^\/\/\/\s?/, '')).join('\n')
    const span = node.nameSpan, signature = node.kind === 'FunctionDeclaration' ? `fn ${node.receiver ? source.slice(node.receiver.span.start, node.receiver.span.end) + '.' : ''}${node.name}(${node.parameters.map(/* 返回 parameter.name 的当前值。 */ parameter => parameter.name).join(', ')})` : `${node.exported ? '@export ' : ''}${node.declarationKind} ${node.name}`
    symbols.push({ name: node.name, kind: node.kind === 'FunctionDeclaration' ? node.name.startsWith('test_') ? 'test' : 'function' : node.exported ? 'export' : 'variable', line: span.line, column: span.column, endLine: node.span.endLine, endColumn: node.span.endColumn, signature, documentation: docs })
    if (node.kind === 'FunctionDeclaration') {
      functions[node.name] = { line: node.span.line, endLine: node.span.endLine, parameters: node.parameters.map(/* 返回 parameter.name 的当前值。 */ parameter => parameter.name) }
      if (node.name.startsWith('test_')) tests.push({ name: node.name, line: node.span.line, ...(comments.map(testDirective).filter(/* 比较 item 与 null，返回严格不等的判断结果。 */ item => item !== null).at(-1) ?? { timeoutMs: 10_000, skipped: false, tags: [], seed: 1, cases: [] }) })
      if (!LIFECYCLE_NAMES.has(node.name) && !node.name.startsWith('test_') && !calls.has(node.name) && !referencedBindings.has(node.bindingId)) diagnostics.push(diagnostic(span, 'warning', 'semantic', 'NOVA-LINT-UNUSED', `Function “${node.name}” is never called in this workspace document.`))
    }
  }
  const scopeById = new Map(program.scopes.map(/* 返回按声明顺序构造的数组 [scope.id, scope]。 */ scope => [scope.id, scope])), declarations = new Map<string, Map<string, RhaiBinding>>()
  for (const binding of program.bindings) if (binding.kind !== 'function' && binding.name !== 'this') {
    let scope = scopeById.get(binding.scopeId), shadow: RhaiBinding | undefined
    while (scope && !shadow) { shadow = declarations.get(scope.id)?.get(binding.name); scope = scope.parentId ? scopeById.get(scope.parentId) : undefined }
    if (shadow) diagnostics.push(diagnostic(binding.span, 'warning', 'semantic', 'NOVA-SEM-002', `“${binding.name}” shadows an earlier declaration.`))
    const entries = declarations.get(binding.scopeId) ?? new Map(); entries.set(binding.name, binding); declarations.set(binding.scopeId, entries)
  }
  const references = [...program.bindings.filter(/* 比较 binding.name 与 'this'，返回严格不等的判断结果。 */ binding => binding.name !== 'this').map(/** 构造并返回记录 { name: binding.name, line: binding.span.line, column: binding.span.column, declaration: true, bindingId: binding.id, scopeId: binding.scopeId }，字段按当前实参及捕获状态求值。 */ binding => ({ name: binding.name, line: binding.span.line, column: binding.span.column, declaration: true, bindingId: binding.id, scopeId: binding.scopeId })), ...program.references.map(/** 展开绑定引用的源码位置、作用域及访问类别，供导航与重命名使用。 */ reference => ({ name: reference.name, line: reference.span.line, column: reference.span.column, declaration: false, bindingId: reference.bindingId, scopeId: reference.scopeId, access: reference.access }))].sort(/* 先计算 a.line - b.line；仅当其为假值时求右侧 a.column - b.column，返回短路求值结果。 */ (a, b) => a.line - b.line || a.column - b.column)
  const referenceByStart = new Map(program.references.map(/* 返回按声明顺序构造的数组 [reference.span.start, reference]。 */ reference => [reference.span.start, reference])), declarationByStart = new Map(program.bindings.filter(/* 比较 binding.name 与 'this'，返回严格不等的判断结果。 */ binding => binding.name !== 'this').map(/* 返回按声明顺序构造的数组 [binding.span.start, binding]。 */ binding => [binding.span.start, binding]))
  const semanticTokens: ScriptSemanticToken[] = []
  for (const token of program.tokens) {
    let kind: ScriptSemanticToken['kind'] | null = null
    if (['lineComment', 'blockComment'].includes(token.kind)) kind = 'comment'
    else if (['string', 'character', 'templateStart', 'templateText', 'templateEnd'].includes(token.kind)) kind = 'string'
    else if (token.kind === 'number') kind = 'number'
    else if (token.kind === 'keyword') kind = 'keyword'
    else if (token.kind === 'identifier') {
      const reference = referenceByStart.get(token.span.start), binding = declarationByStart.get(token.span.start) ?? (reference?.bindingId ? bindingById.get(reference.bindingId) : null)
      kind = reference?.access === 'call' || binding?.kind === 'function' ? apiEntry(token.text)?.deprecated ? 'deprecated' : HOST_NAMES.has(token.text) ? 'api' : 'function' : 'variable'
    }
    if (!kind) continue
    token.text.split('\n').forEach(/** 把多行词元拆成逐行语义高亮片段，跳过空行并去除行尾回车。 */ (text, index) => { const length = text.replace(/\r$/, '').length; if (length) semanticTokens.push({ line: token.span.line + index, column: index ? 1 : token.span.column, length, kind }) })
  }
  // Existing comment annotations remain additive; literal/block-comment bodies
  // must not manufacture declarations or inline-type errors for that adapter.
  const richSource = program.tokens.map(/** 遮蔽注释、模板文本及多行字符串内部内容供兼容分析器使用，避免文本伪造声明且保留布局。 */ token => token.kind === 'blockComment' || token.kind === 'templateText' ? blank(token.text) : token.kind === 'string' && token.text.includes('\n') ? token.text[0] + blank(token.text.slice(1, -1)) + token.text.at(-1) : token.text).join('')
  const rich = analyzeScript26(richSource)
  for (const item of rich.annotationDiagnostics) diagnostics.push(diagnostic({ start: 0, end: 0, line: item.line, column: item.column, endLine: item.line, endColumn: item.column + 1 }, item.code === 'NOVA-TYPE-004' ? 'error' : 'warning', 'semantic', item.code, item.message))
  // Keep the old rich statement/type contract for debugger consumers; AST owns
  // error decisions and symbol binding. No source is discarded on limit errors.
  return { apiVersion, revision, elapsedMs: performance.now() - started, diagnostics: [...new Map(diagnostics.map(/* 返回按声明顺序构造的数组 [`${item.code}:${item.line}:${item.column}:${item.message}`, item]。 */ item => [`${item.code}:${item.line}:${item.column}:${item.message}`, item])).values()].slice(0, program.limits.maxDiagnostics), symbols, functions, references, tests, dependencies: [...new Set(dependencies)], semanticTokens, apiUsage: [...apiUsage], types: rich.types, structures: rich.structures, genericHelpers: rich.genericHelpers, statements: rich.statements, externalFunctions: [...new Set(externalFunctions)] }
}

export { renameRhaiBinding as renameSyntaxBinding } from '../visual/rhaiRename'
export type { RhaiRenameSelection as ScriptRenameSelection } from '../visual/rhaiRename'
/** Formats only lexical whitespace. Multiline literal/trivia bytes are retained. */
/** 仅格式化有效程序的安全缩进和末尾换行，保护多行字面量，并复解析核对非空白词元完全一致。 */ export function formatSyntaxWhitespace(source: string, options: { indentSize?: 2 | 4; lineWidth?: number; finalNewline?: boolean } = {}): string {
  const program = parseRhai(source, { moduleMode: 'host' })
  if (!program.valid) return source
  const protectedLines = new Set<number>()
  for (const token of program.tokens) if (token.kind !== 'whitespace' && token.span.endLine > token.span.line) for (let line = token.span.line; line <= token.span.endLine; line++) protectedLines.add(line)
  for (const node of walkRhai(program)) if (node.kind === 'InterpolatedString') for (let line = node.span.line; line <= node.span.endLine; line++) protectedLines.add(line)
  const indentation = new Map<number, number>(); let depth = 0
  for (const token of program.tokens) {
    if (token.kind === 'whitespace' || token.kind === 'eof') continue
    const closing = token.text === '}' && token.kind === 'punctuation'
    if (!indentation.has(token.span.line)) indentation.set(token.span.line, Math.max(0, depth - Number(closing)))
    if (closing) depth = Math.max(0, depth - 1)
    else if ((token.text === '{' || token.text === '#{') && ['punctuation', 'operator'].includes(token.kind)) depth++
  }
  const edits: RhaiSourceEdit[] = [], width = options.indentSize === 4 ? 4 : 2
  const lineStarts = [0]; for (let index = 0; index < source.length; index++) if (source[index] === '\n') lineStarts.push(index + 1)
  for (const [line, level] of indentation) {
    if (protectedLines.has(line)) continue
    const start = lineStarts[line - 1], end = start + (source.slice(start).match(/^[ \t]*/)?.[0].length ?? 0), text = ' '.repeat(level * width)
    if (source.slice(start, end) !== text) edits.push({ start, end, text })
  }
  const ending = program.tokens.filter(/* 比较 token.kind 与 'eof'，返回严格不等的判断结果。 */ token => token.kind !== 'eof').at(-1), newline = source.includes('\r\n') ? '\r\n' : '\n'
  if (options.finalNewline === false) { if (ending?.kind === 'whitespace' && /[\r\n]/.test(ending.text)) edits.push({ start: ending.span.start, end: ending.span.end, text: '' }) }
  else if (!source.endsWith('\n')) edits.push({ start: source.length, end: source.length, text: newline })
  const result = emitRhai(program, edits), after = parseRhai(result, { moduleMode: 'host' })
  const exactTokens = /* 调用 tokens.filter(token => token.kind !== 'whitespace' && token.kind !== 'eof').map(token => token.kind + ':' + token.text) 并返回调用结果。 */ (tokens: typeof program.tokens) => tokens.filter(/* 先计算 token.kind !== 'whitespace'；仅当其为真值时求右侧 token.kind !== 'eof'，返回短路求值结果。 */ token => token.kind !== 'whitespace' && token.kind !== 'eof').map(/* 计算表达式 token.kind + ':' + token.text 并返回结果，沿用操作数的原有类型规则。 */ token => token.kind + ':' + token.text)
  if (!after.valid || JSON.stringify(exactTokens(after.tokens)) !== JSON.stringify(exactTokens(program.tokens))) return source
  return result
}
