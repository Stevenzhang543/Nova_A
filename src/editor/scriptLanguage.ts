import { apiEntry } from './scriptApi'
import { analyzeModuleGraph, type ScriptGenericHelper, type ScriptStatement, type ScriptStructure, type ScriptTypeInfo } from './scriptLanguage26'
import { analyzeScriptSyntax, formatSyntaxWhitespace, renameSyntaxBinding, VERIFIED_SCRIPT_SIGNATURES, type ScriptRenameSelection } from './scriptLanguageSyntax'

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
export interface ScriptReference { name: string; line: number; column: number; declaration: boolean; bindingId?: string | null; scopeId?: string; access?: 'read' | 'write' | 'readWrite' | 'call' }
export interface ScriptTestMetadata { name: string; line: number; timeoutMs: number; skipped: boolean; tags: string[]; seed: number; cases: string[] }
export interface ScriptSemanticToken { line: number; column: number; length: number; kind: 'keyword' | 'function' | 'variable' | 'api' | 'string' | 'comment' | 'number' | 'deprecated' }
export interface ScriptAnalysis {
  externalFunctions?: string[]
  apiVersion: 1 | 2
  revision: number
  elapsedMs: number
  diagnostics: ScriptDiagnostic[]
  symbols: ScriptSymbol[]
  dependencies: string[]
  functions: Record<string, { line: number; endLine: number; parameters: string[] }>
  references: ScriptReference[]
  tests: ScriptTestMetadata[]
  semanticTokens: ScriptSemanticToken[]
  apiUsage: string[]
  types: ScriptTypeInfo[]
  structures: ScriptStructure[]
  genericHelpers: ScriptGenericHelper[]
  statements: ScriptStatement[]
}
export interface ScriptCompletion { label: string; detail: string; documentation: string; insertText: string; deprecated: boolean }
export interface ScriptCodeAction { title: string; code: string; line: number; replacement: string }
export interface WorkspaceScriptDocument { uri: string; source: string; analysis: ScriptAnalysis }
export interface WorkspaceSymbol extends ScriptSymbol { uri: string }

export function analyzeScript(source: string, apiVersion: 1 | 2 = 2, revision = 0, externalFunctions: readonly string[] = []): ScriptAnalysis {
  return analyzeScriptSyntax(source, apiVersion, revision, externalFunctions)
}
export function applyScriptLintPolicy(analysis: ScriptAnalysis, policy: { deprecatedApi: 'off' | 'warning' | 'error'; shadowing: 'off' | 'warning'; unusedSymbols: 'off' | 'warning' }): ScriptAnalysis {
  const diagnostics = analysis.diagnostics.flatMap(item => {
    if (item.code === 'NOVA-COMPAT-001') return policy.deprecatedApi === 'off' ? [] : [{ ...item, severity: policy.deprecatedApi as 'warning' | 'error' }]
    if (item.code === 'NOVA-SEM-002' && policy.shadowing === 'off') return []
    if (item.code === 'NOVA-LINT-UNUSED' && policy.unusedSymbols === 'off') return []
    return [item]
  })
  return { ...analysis, diagnostics }
}

export function completionDetails(prefix: string, analysis?: ScriptAnalysis): ScriptCompletion[] {
  const lowered = prefix.toLowerCase(), local = analysis?.symbols.map(symbol => ({ label: symbol.name, detail: symbol.signature, documentation: symbol.documentation || 'Project symbol', insertText: symbol.name, deprecated: false })) ?? []
  const engine = VERIFIED_SCRIPT_SIGNATURES.map(signature => { const entry = apiEntry(signature.name); return { label: signature.name, detail: `${signature.name}(${signature.parameters.map(parameter => parameter.name + ': ' + parameter.type).join(', ')}) -> ${signature.returnType}`, documentation: entry ? `${entry.detail}\n\n${entry.example}` : signature.documentation, insertText: signature.name, deprecated: Boolean(entry?.deprecated) } })
  const external = (analysis?.externalFunctions ?? []).map(name => ({label:name,detail:'Resolved project module function',documentation:'Declared in the current resolved project module bundle.',insertText:name,deprecated:false}))
  return [...local, ...external, ...engine].filter((item, index, all) => item.label.toLowerCase().startsWith(lowered) && all.findIndex(candidate => candidate.label === item.label) === index).slice(0, 40)
}
export function completionItems(prefix: string, analysis?: ScriptAnalysis): string[] { return completionDetails(prefix, analysis).map(item => item.label) }
export function parameterHint(name: string, activeParameter = 0): { signature: string; activeParameter: number; documentation: string } | null {
  const signatures = VERIFIED_SCRIPT_SIGNATURES.filter(signature => signature.name === name), entry = apiEntry(name)
  return signatures.length ? { signature: signatures.map(signature => `${signature.name}(${signature.parameters.map(parameter => parameter.name + ': ' + parameter.type).join(', ')}) -> ${signature.returnType}`).join('\n'), activeParameter: Math.max(0, activeParameter), documentation: entry?.detail ?? signatures[0].documentation } : null
}
export function hoverInfo(name: string, analysis?: ScriptAnalysis): { signature: string; documentation: string; link: string } | null {
  const symbol = analysis?.symbols.find(item => item.name === name), inferred = analysis?.types.find(item => item.name === name)
  if (symbol) return { signature: inferred ? `${symbol.signature}: ${inferred.type}` : symbol.signature, documentation: symbol.documentation || (inferred ? `${inferred.confidence} type from ${inferred.source}` : 'Project symbol'), link: '' }
  const hint = parameterHint(name), entry = apiEntry(name)
  return hint ? { signature: hint.signature, documentation: entry ? `${entry.detail}\n\nExample: ${entry.example}` : hint.documentation, link: entry?.documentation ?? '' } : null
}
export function findScriptReferences(source: string, name: string): ScriptReference[] { return analyzeScript(source).references.filter(reference => reference.name === name) }
export function renameScriptSymbol(source: string, name: string, replacement: string, selection: ScriptRenameSelection = {}): string {
  return renameSyntaxBinding(source, name, replacement, selection)
}
export function formatScript(source: string, options: { indentSize?: 2 | 4; lineWidth?: number; finalNewline?: boolean } = {}): string {
  return formatSyntaxWhitespace(source, options)
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
  update(uri: string, source: string, apiVersion: 1 | 2 = 2, revision = 0): ScriptAnalysis {
    const current = this.documents.get(uri)
    if (current?.source === source && current.analysis.apiVersion === apiVersion && current.analysis.revision === revision) return current.analysis
    const analysis = analyzeScript(source, apiVersion, revision); this.documents.set(uri, { uri, source, analysis }); return analysis
  }
  remove(uri: string): void { this.documents.delete(uri) }
  document(uri: string): WorkspaceScriptDocument | null { return this.documents.get(uri) ?? null }
  documentSymbols(uri: string): ScriptSymbol[] { return [...(this.documents.get(uri)?.analysis.symbols ?? [])] }
  workspaceSymbols(query = ''): WorkspaceSymbol[] { const lowered = query.toLowerCase(); return [...this.documents.values()].flatMap(document => document.analysis.symbols.filter(symbol => !lowered || symbol.name.toLowerCase().includes(lowered)).map(symbol => ({ ...symbol, uri: document.uri }))) }
  definition(name: string): WorkspaceSymbol | null { return this.workspaceSymbols(name).find(symbol => symbol.name === name) ?? null }
  references(name: string): Array<ScriptReference & { uri: string }> { return [...this.documents.values()].flatMap(document => document.analysis.references.filter(reference => reference.name === name).map(reference => ({ ...reference, uri: document.uri }))) }
  rename(name: string, replacement: string, selection: ScriptRenameSelection & { uri?: string } = {}): Map<string, string> {
    const documents = [...this.documents.values()].filter(document => selection.uri ? document.uri === selection.uri : document.analysis.references.some(reference => reference.name === name))
    if (documents.length !== 1) throw new Error('Select a document and binding before renaming across an ambiguous workspace.')
    const document = documents[0], source = renameScriptSymbol(document.source, name, replacement, { ...selection, externalSources: [...this.documents.values()].filter(other => other.uri !== document.uri).map(other => other.source) })
    return new Map([[document.uri, source]])
  }
  moduleAssistance(uri: string): Array<{ module: string; status: 'resolved' | 'missing'; candidates: string[] }> {
    const document = this.documents.get(uri)
    if (!document) return []
    const uris = [...this.documents.keys()]
    return document.analysis.dependencies.map(module => ({ module, status: uris.some(candidate => candidate.endsWith(module) || candidate.endsWith(`${module}.rhai`)) ? 'resolved' : 'missing', candidates: uris.filter(candidate => candidate.toLowerCase().includes(module.split('/').pop()?.toLowerCase() ?? '')).slice(0, 8) }))
  }
  moduleDiagnostics() { return analyzeModuleGraph([...this.documents.values()].map(document => ({ uri: document.uri, dependencies: document.analysis.dependencies }))) }
  snapshot(): string {
    return JSON.stringify({ format: 'nova-script-index', version: 2, documents: [...this.documents.values()].map(document => ({ uri: document.uri, source: document.source, apiVersion: document.analysis.apiVersion, revision: document.analysis.revision })) })
  }
  restore(snapshot: string, maximumDocuments = 10_000): number {
    const value = JSON.parse(snapshot) as { format?: string; version?: number; documents?: Array<{ uri?: unknown; source?: unknown; apiVersion?: unknown; revision?: unknown }> }
    if (value.format !== 'nova-script-index' || value.version !== 2 || !Array.isArray(value.documents)) throw new Error('Unsupported or corrupt script index')
    this.documents.clear()
    for (const item of value.documents.slice(0, Math.max(1, maximumDocuments))) if (typeof item.uri === 'string' && typeof item.source === 'string') this.update(item.uri.slice(0, 1_024), item.source.slice(0, 2_000_000), Number(item.apiVersion) === 1 ? 1 : 2, Math.max(0, Math.round(Number(item.revision) || 0)))
    return this.documents.size
  }
  get size(): number { return this.documents.size }
  clear(): void { this.documents.clear() }
}

export type ScriptProtocolRequest =
  | { id: string | number; method: 'textDocument/analyze'; params: { uri: string; text: string } }
  | { id: string | number; method: 'textDocument/completion'; params: { uri: string; prefix: string } }
  | { id: string | number; method: 'textDocument/hover'; params: { uri: string; symbol: string } }
  | { id: string | number; method: 'textDocument/signatureHelp'; params: { symbol: string; activeParameter: number } }
  | { id: string | number; method: 'textDocument/codeAction'; params: { uri: string } }
  | { id: string | number; method: 'textDocument/rename'; params: { symbol: string; replacement: string; uri?: string; offset?: number; bindingId?: string } }
  | { id: string | number; method: 'textDocument/moduleAssistance'; params: { uri: string } }
  | { id: string | number; method: 'textDocument/definition'; params: { symbol: string } }
  | { id: string | number; method: 'textDocument/references'; params: { symbol: string } }
  | { id: string | number; method: 'workspace/symbol'; params: { query: string } }
  | { id: string | number; method: 'workspace/moduleDiagnostics'; params: Record<string, never> }
  | { id: string | number; method: 'textDocument/typeAnalysis'; params: { uri: string } }
  | { id: string | number; method: 'textDocument/formatting'; params: { uri: string } }

export function handleScriptProtocol(index: ScriptWorkspaceIndex, request: ScriptProtocolRequest): { id: string | number; result?: unknown; error?: { code: string; message: string } } {
  try {
    if (request.method === 'textDocument/analyze') return { id: request.id, result: index.update(request.params.uri, request.params.text) }
    if (request.method === 'textDocument/completion') return { id: request.id, result: completionDetails(request.params.prefix, index.document(request.params.uri)?.analysis) }
    if (request.method === 'textDocument/hover') return { id: request.id, result: hoverInfo(request.params.symbol) }
    if (request.method === 'textDocument/signatureHelp') return { id: request.id, result: parameterHint(request.params.symbol, request.params.activeParameter) }
    if (request.method === 'textDocument/codeAction') return { id: request.id, result: scriptCodeActions(index.document(request.params.uri)?.analysis ?? analyzeScript('')) }
    if (request.method === 'textDocument/rename') return { id: request.id, result: Object.fromEntries(index.rename(request.params.symbol, request.params.replacement, request.params)) }
    if (request.method === 'textDocument/moduleAssistance') return { id: request.id, result: index.moduleAssistance(request.params.uri) }
    if (request.method === 'textDocument/definition') return { id: request.id, result: index.definition(request.params.symbol) }
    if (request.method === 'textDocument/references') return { id: request.id, result: index.references(request.params.symbol) }
    if (request.method === 'workspace/symbol') return { id: request.id, result: index.workspaceSymbols(request.params.query) }
    if (request.method === 'workspace/moduleDiagnostics') return { id: request.id, result: index.moduleDiagnostics() }
    if (request.method === 'textDocument/typeAnalysis') { const analysis = index.document(request.params.uri)?.analysis; return { id: request.id, result: analysis ? { types: analysis.types, structures: analysis.structures, genericHelpers: analysis.genericHelpers, statements: analysis.statements } : null } }
    const document = index.document(request.params.uri)
    return { id: request.id, result: document ? [{ range: { start: { line: 1, column: 1 }, end: { line: document.source.split(/\r?\n/).length, column: 1 } }, newText: formatScript(document.source) }] : [] }
  } catch (error) { return { id: request.id, error: { code: 'NOVA-PROTOCOL-001', message: error instanceof Error ? error.message : String(error) } } }
}

interface WorkerReply { id: number; analysis: ScriptAnalysis }
export class ScriptLanguageService {
  private worker: Worker | null = null
  private requestId = 0
  private pending = new Map<number, { resolve: (analysis: ScriptAnalysis) => void; source: string; apiVersion: 1 | 2; revision: number; externalFunctions: string[] }>()
  constructor() {
    if (typeof Worker === 'undefined') return
    try {
      this.worker = new Worker(new URL('./scriptLanguage.worker.ts', import.meta.url), { type: 'module', name: 'nova-script-language' })
      this.worker.onmessage = (event: MessageEvent<WorkerReply>) => { const pending = this.pending.get(event.data.id); if (!pending) return; this.pending.delete(event.data.id); pending.resolve(event.data.analysis) }
    } catch { this.worker = null }
  }
  analyze(source: string, options: { apiVersion?: 1 | 2; revision?: number; signal?: AbortSignal; externalFunctions?: readonly string[] } = {}): Promise<ScriptAnalysis> {
    const apiVersion = options.apiVersion ?? 2, revision = Math.max(0, Math.round(options.revision ?? 0)), externalFunctions=[...(options.externalFunctions ?? [])]
    const id = ++this.requestId
    for (const [pendingId, pending] of this.pending) if (pendingId < id) { this.pending.delete(pendingId); pending.resolve(analyzeScript(pending.source, pending.apiVersion, pending.revision,pending.externalFunctions)) }
    if (options.signal?.aborted || !this.worker) return Promise.resolve(analyzeScript(source, apiVersion, revision,externalFunctions))
    return new Promise(resolve => {
      this.pending.set(id, { resolve, source, apiVersion, revision,externalFunctions })
      options.signal?.addEventListener('abort', () => { const pending = this.pending.get(id); if (!pending) return; this.pending.delete(id); pending.resolve(analyzeScript(source, apiVersion, revision,externalFunctions)) }, { once: true })
      this.worker?.postMessage({ id, source, apiVersion, revision,externalFunctions })
    })
  }
  dispose(): void { this.worker?.terminate(); this.worker = null; this.pending.clear() }
}
