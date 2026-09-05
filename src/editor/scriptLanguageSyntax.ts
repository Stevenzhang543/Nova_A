import { RHAI_API_SIGNATURES } from '../visual/rhaiApiSignatures'
import { emitRhai, parseRhai, walkRhai, type RhaiBinding, type RhaiSourceEdit, type RhaiSpan } from '../visual/rhaiSyntax'
import { decodeRhaiString } from '../visual/rhaiSyntaxLexer'
import { apiEntry } from './scriptApi'
import { analyzeScript26 } from './scriptLanguage26'
import type { ScriptAnalysis, ScriptDiagnostic, ScriptSemanticToken, ScriptSymbol, ScriptTestMetadata } from './scriptLanguage'

export const VERIFIED_SCRIPT_SIGNATURES = RHAI_API_SIGNATURES.filter(signature => signature.available && signature.profiles.includes('wasm') && !signature.internal && !signature.operator)
const CALLABLE_NAMES = new Set(VERIFIED_SCRIPT_SIGNATURES.filter(signature => signature.role === 'callable').map(signature => signature.name))
const HOST_NAMES = new Set(RHAI_API_SIGNATURES.filter(signature => signature.available && signature.profiles.includes('wasm') && signature.origin === 'host' && signature.role === 'callable').map(signature => signature.name))
const LIFECYCLE_NAMES = new Set([...VERIFIED_SCRIPT_SIGNATURES.filter(signature => signature.role === 'lifecycle').map(signature => signature.name), 'before_all', 'before_each', 'after_each', 'after_all'])
const blank = (text: string) => text.replace(/[^\r\n]/g, ' ')

function diagnostic(span: RhaiSpan, severity: ScriptDiagnostic['severity'], phase: ScriptDiagnostic['phase'], code: string, message: string): ScriptDiagnostic {
  return { line: span.line, column: span.column, endLine: span.endLine, endColumn: span.endColumn, range: { start: { line: span.line, column: span.column }, end: { line: span.endLine, column: span.endColumn } }, severity, phase, code, message, source: 'Nova Rhai', documentation: `manual/index.html#diagnostic-${code.toLowerCase()}` }
}
function testDirective(text: string): Omit<ScriptTestMetadata, 'name' | 'line'> | null {
  const match = text.trimEnd().match(/^\s*\/\/\s*@test(?:\s+(.*))?$/)
  if (!match) return null
  const fields = Object.fromEntries(match[1]?.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(item => { const equal = item.indexOf('='); return equal < 0 ? [item, 'true'] : [item.slice(0, equal), item.slice(equal + 1).replace(/^"|"$/g, '')] }) ?? [])
  return { timeoutMs: Math.min(120_000, Math.max(1, Math.round(Number(fields.timeout) || 10_000))), skipped: fields.skip === 'true', tags: String(fields.tags ?? '').split(',').filter(Boolean).slice(0, 32), seed: Number.isFinite(Number(fields.seed)) ? Number(fields.seed) >>> 0 : 1, cases: String(fields.cases ?? '').split('|').filter(Boolean).slice(0, 128) }
}

/** One token/AST/scope authority for editor diagnostics, symbols and references. */
export function analyzeScriptSyntax(source: string, apiVersion: 1 | 2, revision: number, externalFunctions: readonly string[]): ScriptAnalysis {
  const started = performance.now(), program = parseRhai(source, { moduleMode: 'host' })
  const nodes = [...walkRhai(program)], bindingById = new Map(program.bindings.map(binding => [binding.id, binding]))
  const diagnostics: ScriptDiagnostic[] = program.diagnostics.map(item => {
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
  const commentsByLine = new Map(program.tokens.filter(token => token.kind === 'lineComment').map(token => [token.span.line, token.text]))
  const precedingComments = (line: number) => { const result: string[] = []; while (line > 1) { const text = commentsByLine.get(--line); if (!text) break; result.unshift(text) }; return result }
  const symbols: ScriptSymbol[] = [], tests: ScriptTestMetadata[] = [], functions: ScriptAnalysis['functions'] = {}, referencedBindings = new Set(program.references.map(reference => reference.bindingId))
  for (const node of nodes) if (node.kind === 'FunctionDeclaration' || node.kind === 'VariableDeclaration') {
    const comments = precedingComments(node.span.line), docs = comments.filter(text => /^\/\/\//.test(text)).map(text => text.replace(/^\/\/\/\s?/, '')).join('\n')
    const span = node.nameSpan, signature = node.kind === 'FunctionDeclaration' ? `fn ${node.receiver ? source.slice(node.receiver.span.start, node.receiver.span.end) + '.' : ''}${node.name}(${node.parameters.map(parameter => parameter.name).join(', ')})` : `${node.exported ? '@export ' : ''}${node.declarationKind} ${node.name}`
    symbols.push({ name: node.name, kind: node.kind === 'FunctionDeclaration' ? node.name.startsWith('test_') ? 'test' : 'function' : node.exported ? 'export' : 'variable', line: span.line, column: span.column, endLine: node.span.endLine, endColumn: node.span.endColumn, signature, documentation: docs })
    if (node.kind === 'FunctionDeclaration') {
      functions[node.name] = { line: node.span.line, endLine: node.span.endLine, parameters: node.parameters.map(parameter => parameter.name) }
      if (node.name.startsWith('test_')) tests.push({ name: node.name, line: node.span.line, ...(comments.map(testDirective).filter(item => item !== null).at(-1) ?? { timeoutMs: 10_000, skipped: false, tags: [], seed: 1, cases: [] }) })
      if (!LIFECYCLE_NAMES.has(node.name) && !node.name.startsWith('test_') && !calls.has(node.name) && !referencedBindings.has(node.bindingId)) diagnostics.push(diagnostic(span, 'warning', 'semantic', 'NOVA-LINT-UNUSED', `Function “${node.name}” is never called in this workspace document.`))
    }
  }
  const scopeById = new Map(program.scopes.map(scope => [scope.id, scope])), declarations = new Map<string, Map<string, RhaiBinding>>()
  for (const binding of program.bindings) if (binding.kind !== 'function' && binding.name !== 'this') {
    let scope = scopeById.get(binding.scopeId), shadow: RhaiBinding | undefined
    while (scope && !shadow) { shadow = declarations.get(scope.id)?.get(binding.name); scope = scope.parentId ? scopeById.get(scope.parentId) : undefined }
    if (shadow) diagnostics.push(diagnostic(binding.span, 'warning', 'semantic', 'NOVA-SEM-002', `“${binding.name}” shadows an earlier declaration.`))
    const entries = declarations.get(binding.scopeId) ?? new Map(); entries.set(binding.name, binding); declarations.set(binding.scopeId, entries)
  }
  const references = [...program.bindings.filter(binding => binding.name !== 'this').map(binding => ({ name: binding.name, line: binding.span.line, column: binding.span.column, declaration: true, bindingId: binding.id, scopeId: binding.scopeId })), ...program.references.map(reference => ({ name: reference.name, line: reference.span.line, column: reference.span.column, declaration: false, bindingId: reference.bindingId, scopeId: reference.scopeId, access: reference.access }))].sort((a, b) => a.line - b.line || a.column - b.column)
  const referenceByStart = new Map(program.references.map(reference => [reference.span.start, reference])), declarationByStart = new Map(program.bindings.filter(binding => binding.name !== 'this').map(binding => [binding.span.start, binding]))
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
    token.text.split('\n').forEach((text, index) => { const length = text.replace(/\r$/, '').length; if (length) semanticTokens.push({ line: token.span.line + index, column: index ? 1 : token.span.column, length, kind }) })
  }
  // Existing comment annotations remain additive; literal/block-comment bodies
  // must not manufacture declarations or inline-type errors for that adapter.
  const richSource = program.tokens.map(token => token.kind === 'blockComment' || token.kind === 'templateText' ? blank(token.text) : token.kind === 'string' && token.text.includes('\n') ? token.text[0] + blank(token.text.slice(1, -1)) + token.text.at(-1) : token.text).join('')
  const rich = analyzeScript26(richSource)
  for (const item of rich.annotationDiagnostics) diagnostics.push(diagnostic({ start: 0, end: 0, line: item.line, column: item.column, endLine: item.line, endColumn: item.column + 1 }, item.code === 'NOVA-TYPE-004' ? 'error' : 'warning', 'semantic', item.code, item.message))
  // Keep the old rich statement/type contract for debugger consumers; AST owns
  // error decisions and symbol binding. No source is discarded on limit errors.
  return { apiVersion, revision, elapsedMs: performance.now() - started, diagnostics: [...new Map(diagnostics.map(item => [`${item.code}:${item.line}:${item.column}:${item.message}`, item])).values()].slice(0, program.limits.maxDiagnostics), symbols, functions, references, tests, dependencies: [...new Set(dependencies)], semanticTokens, apiUsage: [...apiUsage], types: rich.types, structures: rich.structures, genericHelpers: rich.genericHelpers, statements: rich.statements, externalFunctions: [...new Set(externalFunctions)] }
}

export { renameRhaiBinding as renameSyntaxBinding } from '../visual/rhaiRename'
export type { RhaiRenameSelection as ScriptRenameSelection } from '../visual/rhaiRename'
/** Formats only lexical whitespace. Multiline literal/trivia bytes are retained. */
export function formatSyntaxWhitespace(source: string, options: { indentSize?: 2 | 4; lineWidth?: number; finalNewline?: boolean } = {}): string {
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
  const ending = program.tokens.filter(token => token.kind !== 'eof').at(-1), newline = source.includes('\r\n') ? '\r\n' : '\n'
  if (options.finalNewline === false) { if (ending?.kind === 'whitespace' && /[\r\n]/.test(ending.text)) edits.push({ start: ending.span.start, end: ending.span.end, text: '' }) }
  else if (!source.endsWith('\n')) edits.push({ start: source.length, end: source.length, text: newline })
  const result = emitRhai(program, edits), after = parseRhai(result, { moduleMode: 'host' })
  const exactTokens = (tokens: typeof program.tokens) => tokens.filter(token => token.kind !== 'whitespace' && token.kind !== 'eof').map(token => token.kind + ':' + token.text)
  if (!after.valid || JSON.stringify(exactTokens(after.tokens)) !== JSON.stringify(exactTokens(program.tokens))) return source
  return result
}
