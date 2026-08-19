import { SCRIPT_API, apiEntry } from './scriptApi'

export type ScriptSeverity = 'error' | 'warning' | 'info'
export type ScriptDiagnosticPhase = 'parser' | 'semantic' | 'compatibility' | 'runtime' | 'test'
export interface ScriptPosition { line: number; column: number }
export interface ScriptRange { start: ScriptPosition; end: ScriptPosition }
export interface ScriptDiagnostic extends ScriptPosition {
  endLine: number
  endColumn: number
  range: ScriptRange
  severity: ScriptSeverity
  phase: ScriptDiagnosticPhase
  code: string
  message: string
  source: 'Nova Rhai'
  documentation: string
}
export interface ScriptSymbol {
  name: string
  kind: 'function' | 'variable' | 'export' | 'test'
  line: number
  column: number
  endLine: number
  endColumn: number
  signature: string
  documentation: string
}
export interface ScriptReference { name: string; line: number; column: number; declaration: boolean }
export interface ScriptTestMetadata { name: string; line: number; timeoutMs: number; skipped: boolean; tags: string[]; seed: number; cases: string[] }
export interface ScriptSemanticToken { line: number; column: number; length: number; kind: 'keyword' | 'function' | 'variable' | 'api' | 'string' | 'comment' | 'number' | 'deprecated' }
export interface ScriptAnalysis {
  diagnostics: ScriptDiagnostic[]
  symbols: ScriptSymbol[]
  dependencies: string[]
  functions: Record<string, { line: number; endLine: number; parameters: string[] }>
  references: ScriptReference[]
  tests: ScriptTestMetadata[]
  semanticTokens: ScriptSemanticToken[]
  apiUsage: string[]
}
export interface ScriptCompletion { label: string; detail: string; documentation: string; insertText: string; deprecated: boolean }
export interface ScriptCodeAction { title: string; code: string; line: number; replacement: string }
export interface WorkspaceScriptDocument { uri: string; source: string; analysis: ScriptAnalysis }
export interface WorkspaceSymbol extends ScriptSymbol { uri: string }

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/
const KEYWORDS = new Set(['fn', 'let', 'const', 'if', 'else', 'for', 'while', 'loop', 'in', 'return', 'break', 'continue', 'true', 'false', 'switch', 'throw', 'try', 'catch', 'use'])
const BUILTINS = new Set(['print', 'debug', 'type_of', 'len', 'is_def_var', 'this'])
const API_NAMES = new Set(SCRIPT_API.map(entry => entry.name))

function diagnostic(line: number, column: number, length: number, severity: ScriptSeverity, phase: ScriptDiagnosticPhase, code: string, message: string): ScriptDiagnostic {
  const endColumn = Math.max(column + Math.max(1, length), column + 1)
  return {
    line, column, endLine: line, endColumn, range: { start: { line, column }, end: { line, column: endColumn } },
    severity, phase, code, message, source: 'Nova Rhai', documentation: `manual/index.html#diagnostic-${code.toLowerCase()}`
  }
}

function parseTestDirective(line: string): Omit<ScriptTestMetadata, 'name' | 'line'> | null {
  const match = line.match(/^\s*\/\/\s*@test(?:\s+(.*))?$/)
  if (!match) return null
  const fields = Object.fromEntries((match[1] ?? '').match(/(?:[^\s"]+|"[^"]*")+/g)?.flatMap(item => {
    const pair = item.split(/=(.*)/s).slice(0, 2)
    return pair.length === 2 ? [[pair[0], pair[1].replace(/^"|"$/g, '')]] : [[item, 'true']]
  }) ?? [])
  return {
    timeoutMs: Math.min(120_000, Math.max(1, Math.round(Number(fields.timeout) || 10_000))),
    skipped: fields.skip === 'true',
    tags: String(fields.tags ?? '').split(',').map(value => value.trim()).filter(Boolean).slice(0, 32),
    seed: Number.isFinite(Number(fields.seed)) ? Number(fields.seed) >>> 0 : 1,
    cases: String(fields.cases ?? '').split('|').map(value => value.trim()).filter(Boolean).slice(0, 128)
  }
}

export function analyzeScript(source: string): ScriptAnalysis {
  const diagnostics: ScriptDiagnostic[] = [], symbols: ScriptSymbol[] = [], dependencies: string[] = [], references: ScriptReference[] = [], tests: ScriptTestMetadata[] = [], semanticTokens: ScriptSemanticToken[] = []
  const functions: ScriptAnalysis['functions'] = {}, declarations = new Map<string, ScriptSymbol>(), calls: Array<{ name: string; line: number; column: number }> = []
  const lines = source.split(/\r?\n/)
  let braces = 0, currentFunction: { name: string; line: number; depth: number; parameters: string[] } | null = null
  let pendingTest: Omit<ScriptTestMetadata, 'name' | 'line'> | null = null, pendingDocs: string[] = []

  lines.forEach((line, index) => {
    const lineNumber = index + 1, testDirective = parseTestDirective(line)
    if (testDirective) pendingTest = testDirective
    const commentAt = line.indexOf('//')
    if (commentAt >= 0) semanticTokens.push({ line: lineNumber, column: commentAt + 1, length: line.length - commentAt, kind: 'comment' })
    if (/^\s*\/\/\//.test(line)) pendingDocs.push(line.replace(/^\s*\/\/\/\s?/, ''))
    else if (line.trim() && !/^\s*\/\//.test(line) && !/^\s*fn\s/.test(line)) pendingDocs = []
    const code = line.replace(/\/\/.*$/, '')
    const dependency = code.match(/^\s*use\s+["'`]([^"'`]+)["'`]\s*;?\s*$/)
    if (dependency) dependencies.push(dependency[1])
    const fn = code.match(/^\s*fn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/)
    if (fn) {
      const name = fn[1], column = line.indexOf(name) + 1, parameters = fn[2].split(',').map(value => value.trim().split(':')[0].trim()).filter(Boolean)
      if (declarations.has(name)) diagnostics.push(diagnostic(lineNumber, column, name.length, 'error', 'semantic', 'NOVA-SEM-001', `Duplicate symbol “${name}”.`))
      const symbol: ScriptSymbol = { name, kind: name.startsWith('test_') ? 'test' : 'function', line: lineNumber, column, endLine: lineNumber, endColumn: column + name.length, signature: `fn ${name}(${fn[2].trim()})`, documentation: pendingDocs.join('\n') }
      declarations.set(name, symbol); symbols.push(symbol); references.push({ name, line: lineNumber, column, declaration: true }); currentFunction = { name, line: lineNumber, depth: braces, parameters }
      semanticTokens.push({ line: lineNumber, column, length: name.length, kind: 'function' })
      if (name.startsWith('test_')) tests.push({ name, line: lineNumber, ...(pendingTest ?? { timeoutMs: 10_000, skipped: false, tags: [], seed: 1, cases: [] }) })
      pendingTest = null; pendingDocs = []
    }
    const variable = code.match(/^\s*(@export(?:\([^)]*\))?\s+)?let\s+([^\s:=;]+)/)
    if (variable) {
      const name = variable[2], column = Math.max(1, line.indexOf(name) + 1)
      if (!IDENTIFIER.test(name)) diagnostics.push(diagnostic(lineNumber, column, name.length, 'error', 'parser', 'NOVA-PARSE-002', `Invalid identifier “${name}”.`))
      else {
        if (declarations.has(name)) diagnostics.push(diagnostic(lineNumber, column, name.length, 'warning', 'semantic', 'NOVA-SEM-002', `“${name}” shadows an earlier declaration.`))
        const symbol: ScriptSymbol = { name, kind: variable[1] ? 'export' : 'variable', line: lineNumber, column, endLine: lineNumber, endColumn: column + name.length, signature: variable[1] ? `@export ${name}` : `let ${name}`, documentation: pendingDocs.join('\n') }
        declarations.set(name, symbol); symbols.push(symbol); references.push({ name, line: lineNumber, column, declaration: true }); semanticTokens.push({ line: lineNumber, column, length: name.length, kind: 'variable' })
      }
    }
    if (/^\s*@export\(/.test(code) && !/^\s*@export\([^)]*\)\s+let\s+/.test(code)) diagnostics.push(diagnostic(lineNumber, Math.max(1, line.indexOf('@export') + 1), 7, 'error', 'parser', 'NOVA-PARSE-006', 'Export metadata must close before a let declaration.'))
    for (const match of code.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) {
      const name = match[1]
      if (name === 'fn' || KEYWORDS.has(name) || (name === 'export' && code[(match.index ?? 0) - 1] === '@')) continue
      const column = (match.index ?? 0) + 1
      calls.push({ name, line: lineNumber, column }); references.push({ name, line: lineNumber, column, declaration: false })
      const entry = apiEntry(name)
      semanticTokens.push({ line: lineNumber, column, length: name.length, kind: entry?.deprecated ? 'deprecated' : entry ? 'api' : 'function' })
      if (entry?.deprecated) diagnostics.push(diagnostic(lineNumber, column, name.length, 'warning', 'compatibility', 'NOVA-COMPAT-001', `“${name}” is deprecated; use “${entry.deprecated.replacement}”.`))
    }
    for (const match of code.matchAll(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g)) semanticTokens.push({ line: lineNumber, column: (match.index ?? 0) + 1, length: match[0].length, kind: 'string' })
    for (const match of code.matchAll(/\b\d+(?:\.\d+)?\b/g)) semanticTokens.push({ line: lineNumber, column: (match.index ?? 0) + 1, length: match[0].length, kind: 'number' })
    for (const match of code.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*\b/g)) if (KEYWORDS.has(match[0])) semanticTokens.push({ line: lineNumber, column: (match.index ?? 0) + 1, length: match[0].length, kind: 'keyword' })
    const structuralCode = code.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, value => ' '.repeat(value.length))
    for (const [offset, character] of [...structuralCode].entries()) {
      if (character === '{') braces++
      if (character === '}') braces--
      if (braces < 0) { diagnostics.push(diagnostic(lineNumber, offset + 1, 1, 'error', 'parser', 'NOVA-PARSE-001', 'Unexpected closing brace.')); braces = 0 }
    }
    if (currentFunction && braces === currentFunction.depth) {
      functions[currentFunction.name] = { line: currentFunction.line, endLine: lineNumber, parameters: currentFunction.parameters }
      const symbol = declarations.get(currentFunction.name); if (symbol) { symbol.endLine = lineNumber; symbol.endColumn = Math.max(1, line.length + 1) }
      currentFunction = null
    }
  })
  if (braces > 0) diagnostics.push(diagnostic(lines.length, Math.max(1, (lines[lines.length - 1]?.length ?? 0) + 1), 1, 'error', 'parser', 'NOVA-PARSE-003', `${braces} closing brace${braces === 1 ? '' : 's'} missing.`))
  for (const dependency of dependencies) if (dependency.includes('..') || /^[a-z]+:/i.test(dependency)) diagnostics.push(diagnostic(1, 1, dependency.length, 'error', 'semantic', 'NOVA-MODULE-001', `Module path may not escape Assets: ${dependency}`))
  const known = new Set([...declarations.keys(), ...API_NAMES, ...BUILTINS])
  for (const call of calls) if (!known.has(call.name)) diagnostics.push(diagnostic(call.line, call.column, call.name.length, 'error', 'semantic', 'NOVA-SEM-003', `Unknown function “${call.name}”.`))
  const uniqueDiagnostics = [...new Map(diagnostics.map(item => [`${item.code}:${item.line}:${item.column}:${item.message}`, item])).values()]
  return { diagnostics: uniqueDiagnostics, symbols, dependencies: [...new Set(dependencies)], functions, references, tests, semanticTokens, apiUsage: [...new Set(calls.map(call => call.name).filter(name => API_NAMES.has(name)))] }
}

export function completionDetails(prefix: string, analysis?: ScriptAnalysis): ScriptCompletion[] {
  const lowered = prefix.toLowerCase(), local = analysis?.symbols.map(symbol => ({ label: symbol.name, detail: symbol.signature, documentation: symbol.documentation || 'Project symbol', insertText: symbol.name, deprecated: false })) ?? []
  const engine = SCRIPT_API.map(entry => ({ label: entry.name, detail: entry.signature, documentation: `${entry.detail}\n\n${entry.example}`, insertText: entry.name, deprecated: Boolean(entry.deprecated) }))
  return [...local, ...engine].filter((item, index, all) => item.label.toLowerCase().startsWith(lowered) && all.findIndex(candidate => candidate.label === item.label) === index).slice(0, 40)
}
export function completionItems(prefix: string, analysis?: ScriptAnalysis): string[] { return completionDetails(prefix, analysis).map(item => item.label) }
export function parameterHint(name: string, activeParameter = 0): { signature: string; activeParameter: number; documentation: string } | null {
  const entry = apiEntry(name); return entry ? { signature: entry.signature, activeParameter: Math.max(0, activeParameter), documentation: entry.detail } : null
}
export function hoverInfo(name: string, analysis?: ScriptAnalysis): { signature: string; documentation: string; link: string } | null {
  const entry = apiEntry(name); if (entry) return { signature: entry.signature, documentation: `${entry.detail}\n\nExample: ${entry.example}`, link: entry.documentation }
  const symbol = analysis?.symbols.find(item => item.name === name); return symbol ? { signature: symbol.signature, documentation: symbol.documentation || 'Project symbol', link: '' } : null
}
export function findScriptReferences(source: string, name: string): ScriptReference[] { return analyzeScript(source).references.filter(reference => reference.name === name) }
export function renameScriptSymbol(source: string, name: string, replacement: string): string {
  if (!IDENTIFIER.test(replacement)) throw new Error('Replacement is not a valid Rhai identifier')
  return source.replace(new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), replacement)
}
export function formatScript(source: string): string {
  let depth = 0
  return source.replace(/\r\n/g, '\n').split('\n').map(line => {
    const trimmed = line.trimEnd().trimStart()
    if (!trimmed) return ''
    if (trimmed.startsWith('}')) depth = Math.max(0, depth - 1)
    const output = `${'  '.repeat(depth)}${trimmed}`
    const code = trimmed.replace(/\/\/.*$/, '').replace(/"(?:\\.|[^"\\])*"/g, '')
    const opens = [...code].filter(character => character === '{').length, closes = [...code].filter(character => character === '}').length
    depth = Math.max(0, depth + opens - closes + (trimmed.startsWith('}') ? 1 : 0))
    return output
  }).join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '') + '\n'
}
export function scriptCodeActions(analysis: ScriptAnalysis): ScriptCodeAction[] {
  return analysis.diagnostics.flatMap(item => {
    if (item.code === 'NOVA-COMPAT-001') {
      const original = item.message.match(/“([^”]+)”/)?.[1] ?? '', replacement = apiEntry(original)?.deprecated?.replacement ?? ''
      return replacement ? [{ title: `Replace ${original} with ${replacement}`, code: item.code, line: item.line, replacement }] : []
    }
    if (item.code === 'NOVA-PARSE-003') return [{ title: 'Insert missing closing brace', code: item.code, line: item.line, replacement: '}' }]
    return []
  })
}

export class ScriptWorkspaceIndex {
  private documents = new Map<string, WorkspaceScriptDocument>()
  update(uri: string, source: string): ScriptAnalysis { const analysis = analyzeScript(source); this.documents.set(uri, { uri, source, analysis }); return analysis }
  remove(uri: string): void { this.documents.delete(uri) }
  document(uri: string): WorkspaceScriptDocument | null { return this.documents.get(uri) ?? null }
  documentSymbols(uri: string): ScriptSymbol[] { return [...(this.documents.get(uri)?.analysis.symbols ?? [])] }
  workspaceSymbols(query = ''): WorkspaceSymbol[] { const lowered = query.toLowerCase(); return [...this.documents.values()].flatMap(document => document.analysis.symbols.filter(symbol => !lowered || symbol.name.toLowerCase().includes(lowered)).map(symbol => ({ ...symbol, uri: document.uri }))) }
  definition(name: string): WorkspaceSymbol | null { return this.workspaceSymbols(name).find(symbol => symbol.name === name) ?? null }
  references(name: string): Array<ScriptReference & { uri: string }> { return [...this.documents.values()].flatMap(document => document.analysis.references.filter(reference => reference.name === name).map(reference => ({ ...reference, uri: document.uri }))) }
  rename(name: string, replacement: string): Map<string, string> { return new Map([...this.documents.values()].filter(document => document.analysis.references.some(reference => reference.name === name)).map(document => [document.uri, renameScriptSymbol(document.source, name, replacement)])) }
  clear(): void { this.documents.clear() }
}

export type ScriptProtocolRequest =
  | { id: string | number; method: 'textDocument/analyze'; params: { uri: string; text: string } }
  | { id: string | number; method: 'textDocument/completion'; params: { uri: string; prefix: string } }
  | { id: string | number; method: 'textDocument/hover'; params: { uri: string; symbol: string } }
  | { id: string | number; method: 'textDocument/definition'; params: { symbol: string } }
  | { id: string | number; method: 'textDocument/references'; params: { symbol: string } }
  | { id: string | number; method: 'workspace/symbol'; params: { query: string } }
  | { id: string | number; method: 'textDocument/formatting'; params: { uri: string } }

export function handleScriptProtocol(index: ScriptWorkspaceIndex, request: ScriptProtocolRequest): { id: string | number; result?: unknown; error?: { code: string; message: string } } {
  try {
    if (request.method === 'textDocument/analyze') return { id: request.id, result: index.update(request.params.uri, request.params.text) }
    if (request.method === 'textDocument/completion') return { id: request.id, result: completionDetails(request.params.prefix, index.document(request.params.uri)?.analysis) }
    if (request.method === 'textDocument/hover') return { id: request.id, result: hoverInfo(request.params.symbol) }
    if (request.method === 'textDocument/definition') return { id: request.id, result: index.definition(request.params.symbol) }
    if (request.method === 'textDocument/references') return { id: request.id, result: index.references(request.params.symbol) }
    if (request.method === 'workspace/symbol') return { id: request.id, result: index.workspaceSymbols(request.params.query) }
    const document = index.document(request.params.uri)
    return { id: request.id, result: document ? [{ range: { start: { line: 1, column: 1 }, end: { line: document.source.split(/\r?\n/).length, column: 1 } }, newText: formatScript(document.source) }] : [] }
  } catch (error) { return { id: request.id, error: { code: 'NOVA-PROTOCOL-001', message: error instanceof Error ? error.message : String(error) } } }
}

interface WorkerReply { id: number; analysis: ScriptAnalysis }
export class ScriptLanguageService {
  private worker: Worker | null = null
  private requestId = 0
  private pending = new Map<number, (analysis: ScriptAnalysis) => void>()
  constructor() {
    if (typeof Worker === 'undefined') return
    try {
      this.worker = new Worker(new URL('./scriptLanguage.worker.ts', import.meta.url), { type: 'module', name: 'nova-script-language' })
      this.worker.onmessage = (event: MessageEvent<WorkerReply>) => { const resolve = this.pending.get(event.data.id); if (!resolve) return; this.pending.delete(event.data.id); resolve(event.data.analysis) }
    } catch { this.worker = null }
  }
  analyze(source: string): Promise<ScriptAnalysis> {
    const id = ++this.requestId
    for (const [pendingId, resolve] of this.pending) if (pendingId < id) { this.pending.delete(pendingId); resolve(analyzeScript(source)) }
    if (!this.worker) return Promise.resolve(analyzeScript(source))
    return new Promise(resolve => { this.pending.set(id, resolve); this.worker?.postMessage({ id, source }) })
  }
  dispose(): void { this.worker?.terminate(); this.worker = null; this.pending.clear() }
}
