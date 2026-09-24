/** 脚本语言服务：提供诊断、补全、跳转、引用、改名及模块提示，协调工作线程请求。 */
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

/* 调用 analyzeScriptSyntax(source, apiVersion, revision, externalFunctions) 并返回调用结果。 */ export function analyzeScript(source: string, apiVersion: 1 | 2 = 2, revision = 0, externalFunctions: readonly string[] = []): ScriptAnalysis {
  return analyzeScriptSyntax(source, apiVersion, revision, externalFunctions)
}
/** 根据项目策略隐藏指定诊断或调整弃用 API 严重性，保留其余分析结果。 */ export function applyScriptLintPolicy(analysis: ScriptAnalysis, policy: { deprecatedApi: 'off' | 'warning' | 'error'; shadowing: 'off' | 'warning'; unusedSymbols: 'off' | 'warning' }): ScriptAnalysis {
  const diagnostics = analysis.diagnostics.flatMap(/** 按策略过滤弃用、遮蔽与未使用符号诊断，必要时调整弃用诊断严重性。 */ item => {
    if (item.code === 'NOVA-COMPAT-001') return policy.deprecatedApi === 'off' ? [] : [{ ...item, severity: policy.deprecatedApi as 'warning' | 'error' }]
    if (item.code === 'NOVA-SEM-002' && policy.shadowing === 'off') return []
    if (item.code === 'NOVA-LINT-UNUSED' && policy.unusedSymbols === 'off') return []
    return [item]
  })
  return { ...analysis, diagnostics }
}

/** 合并文档、外部模块与已验证引擎符号，按前缀筛选去重并返回最多四十条详细补全。 */ export function completionDetails(prefix: string, analysis?: ScriptAnalysis): ScriptCompletion[] {
  const lowered = prefix.toLowerCase(), local = analysis?.symbols.map(/** 构造并返回记录 { label: symbol.name, detail: symbol.signature, documentation: symbol.documentation || 'Project symbol', insertText: symbol.name, deprecated: false }，字段按当前实参及捕获状态求值。 */ symbol => ({ label: symbol.name, detail: symbol.signature, documentation: symbol.documentation || 'Project symbol', insertText: symbol.name, deprecated: false })) ?? []
  const engine = VERIFIED_SCRIPT_SIGNATURES.map(/** 将已验证签名和 API 文档组合为包含类型、示例和弃用标记的补全项。 */ signature => { const entry = apiEntry(signature.name); return { label: signature.name, detail: `${signature.name}(${signature.parameters.map(/* 计算表达式 parameter.name + ': ' + parameter.type 并返回结果，沿用操作数的原有类型规则。 */ parameter => parameter.name + ': ' + parameter.type).join(', ')}) -> ${signature.returnType}`, documentation: entry ? `${entry.detail}\n\n${entry.example}` : signature.documentation, insertText: signature.name, deprecated: Boolean(entry?.deprecated) } })
  const external = (analysis?.externalFunctions ?? []).map(/** 构造并返回记录 {label:name,detail:'Resolved project module function',documentation:'Declared in the current resolved project module bundle.',insertText:name,deprecated:false}，字段按当前实参及捕获状态求值。 */ name => ({label:name,detail:'Resolved project module function',documentation:'Declared in the current resolved project module bundle.',insertText:name,deprecated:false}))
  return [...local, ...external, ...engine].filter(/** 按不区分大小写的前缀筛选，并保留每个名称的首个补全条目。 */ (item, index, all) => item.label.toLowerCase().startsWith(lowered) && all.findIndex(/* 比较 candidate.label 与 item.label，返回严格相等的判断结果。 */ candidate => candidate.label === item.label) === index).slice(0, 40)
}
/** 提取详细补全中的名称供简化建议列表使用。 */ export function completionItems(prefix: string, analysis?: ScriptAnalysis): string[] { return completionDetails(prefix, analysis).map(/* 返回 item.label 的当前值。 */ item => item.label) }
/** 汇总同名已验证 API 重载签名，返回活动参数序号及说明，未知名称返回 null。 */ export function parameterHint(name: string, activeParameter = 0): { signature: string; activeParameter: number; documentation: string } | null {
  const signatures = VERIFIED_SCRIPT_SIGNATURES.filter(/* 比较 signature.name 与 name，返回严格相等的判断结果。 */ signature => signature.name === name), entry = apiEntry(name)
  return signatures.length ? { signature: signatures.map(/** 将单个重载的参数名称、类型和返回类型格式化为提示签名。 */ signature => `${signature.name}(${signature.parameters.map(/* 计算表达式 parameter.name + ': ' + parameter.type 并返回结果，沿用操作数的原有类型规则。 */ parameter => parameter.name + ': ' + parameter.type).join(', ')}) -> ${signature.returnType}`).join('\n'), activeParameter: Math.max(0, activeParameter), documentation: entry?.detail ?? signatures[0].documentation } : null
}
/** 优先展示项目符号和推断类型，否则返回已验证 API 签名、示例与文档链接。 */ export function hoverInfo(name: string, analysis?: ScriptAnalysis): { signature: string; documentation: string; link: string } | null {
  const symbol = analysis?.symbols.find(/* 比较 item.name 与 name，返回严格相等的判断结果。 */ item => item.name === name), inferred = analysis?.types.find(/* 比较 item.name 与 name，返回严格相等的判断结果。 */ item => item.name === name)
  if (symbol) return { signature: inferred ? `${symbol.signature}: ${inferred.type}` : symbol.signature, documentation: symbol.documentation || (inferred ? `${inferred.confidence} type from ${inferred.source}` : 'Project symbol'), link: '' }
  const hint = parameterHint(name), entry = apiEntry(name)
  return hint ? { signature: hint.signature, documentation: entry ? `${entry.detail}\n\nExample: ${entry.example}` : hint.documentation, link: entry?.documentation ?? '' } : null
}
/** 分析源码并按名称筛选引用，结果包含不同绑定的同名项。 */ export function findScriptReferences(source: string, name: string): ScriptReference[] { return analyzeScript(source).references.filter(/* 比较 reference.name 与 name，返回严格相等的判断结果。 */ reference => reference.name === name) }
/* 调用 renameSyntaxBinding(source, name, replacement, selection) 并返回调用结果。 */ export function renameScriptSymbol(source: string, name: string, replacement: string, selection: ScriptRenameSelection = {}): string {
  return renameSyntaxBinding(source, name, replacement, selection)
}
/* 调用 formatSyntaxWhitespace(source, options) 并返回调用结果。 */ export function formatScript(source: string, options: { indentSize?: 2 | 4; lineWidth?: number; finalNewline?: boolean } = {}): string {
  return formatSyntaxWhitespace(source, options)
}
/** 从受支持诊断中生成弃用调用替换及缺失闭括号修复建议。 */ export function scriptCodeActions(analysis: ScriptAnalysis): ScriptCodeAction[] {
  return analysis.diagnostics.flatMap(/** 按诊断解析弃用 API 的替代名或生成补闭括号建议，其余诊断不提供此类修复。 */ item => {
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
  /** 源码、API 版本和修订均未变化时复用分析，否则重新分析并更新文档缓存。 */ update(uri: string, source: string, apiVersion: 1 | 2 = 2, revision = 0): ScriptAnalysis {
    const current = this.documents.get(uri)
    if (current?.source === source && current.analysis.apiVersion === apiVersion && current.analysis.revision === revision) return current.analysis
    const analysis = analyzeScript(source, apiVersion, revision); this.documents.set(uri, { uri, source, analysis }); return analysis
  }
  /** 执行时调用 this.documents.delete(uri)；不显式返回调用结果。 */ remove(uri: string): void { this.documents.delete(uri) }
  /* 当 this.documents.get(uri) 为 null 或 undefined 时返回 null，否则保留左侧值。 */ document(uri: string): WorkspaceScriptDocument | null { return this.documents.get(uri) ?? null }
  /* 返回按声明顺序构造的数组 [...(this.documents.get(uri)?.analysis.symbols ?? [])]。 */ documentSymbols(uri: string): ScriptSymbol[] { return [...(this.documents.get(uri)?.analysis.symbols ?? [])] }
  /** 在所有已索引文档中按名称子串查找符号，并附加来源 URI。 */ workspaceSymbols(query = ''): WorkspaceSymbol[] { const lowered = query.toLowerCase(); return [...this.documents.values()].flatMap(/** 筛选单个文档中匹配查询的符号，并附加该文档 URI。 */ document => document.analysis.symbols.filter(/* 先计算 !lowered；仅当其为假值时求右侧 symbol.name.toLowerCase().includes(lowered)，返回短路求值结果。 */ symbol => !lowered || symbol.name.toLowerCase().includes(lowered)).map(/** 构造并返回记录 { ...symbol, uri: document.uri }，字段按当前实参及捕获状态求值。 */ symbol => ({ ...symbol, uri: document.uri }))) }
  /** 返回工作区中首个名称完全匹配的符号定义，未找到时返回 null。 */ definition(name: string): WorkspaceSymbol | null { return this.workspaceSymbols(name).find(/* 比较 symbol.name 与 name，返回严格相等的判断结果。 */ symbol => symbol.name === name) ?? null }
  /** 汇总工作区所有同名引用并附加文档 URI。 */ references(name: string): Array<ScriptReference & { uri: string }> { return [...this.documents.values()].flatMap(/** 筛选单个文档中的同名引用并附加来源 URI。 */ document => document.analysis.references.filter(/* 比较 reference.name 与 name，返回严格相等的判断结果。 */ reference => reference.name === name).map(/** 构造并返回记录 { ...reference, uri: document.uri }，字段按当前实参及捕获状态求值。 */ reference => ({ ...reference, uri: document.uri }))) }
  /** 要求唯一明确的目标文档，再以其他文档源码辅助执行绑定感知重命名并返回修改映射。 */ rename(name: string, replacement: string, selection: ScriptRenameSelection & { uri?: string } = {}): Map<string, string> {
    const documents = [...this.documents.values()].filter(/** 优先按显式 URI 选择重命名文档，否则选择包含同名引用的文档。 */ document => selection.uri ? document.uri === selection.uri : document.analysis.references.some(/* 比较 reference.name 与 name，返回严格相等的判断结果。 */ reference => reference.name === name))
    if (documents.length !== 1) throw new Error('Select a document and binding before renaming across an ambiguous workspace.')
    const document = documents[0], source = renameScriptSymbol(document.source, name, replacement, { ...selection, externalSources: [...this.documents.values()].filter(/* 比较 other.uri 与 document.uri，返回严格不等的判断结果。 */ other => other.uri !== document.uri).map(/* 返回 other.source 的当前值。 */ other => other.source) })
    return new Map([[document.uri, source]])
  }
  /** 为文档依赖提供后缀匹配的解析状态和最多八个名称相关候选。 */ moduleAssistance(uri: string): Array<{ module: string; status: 'resolved' | 'missing'; candidates: string[] }> {
    const document = this.documents.get(uri)
    if (!document) return []
    const uris = [...this.documents.keys()]
    return document.analysis.dependencies.map(/** 按已索引 URI 判断模块是否匹配，并列出名称相关候选文档。 */ module => ({ module, status: uris.some(/* 先计算 candidate.endsWith(module)；仅当其为假值时求右侧 candidate.endsWith(`${module}.rhai`)，返回短路求值结果。 */ candidate => candidate.endsWith(module) || candidate.endsWith(`${module}.rhai`)) ? 'resolved' : 'missing', candidates: uris.filter(/* 调用 candidate.toLowerCase().includes(module.split('/').pop()?.toLowerCase() ?? '') 并返回调用结果。 */ candidate => candidate.toLowerCase().includes(module.split('/').pop()?.toLowerCase() ?? '')).slice(0, 8) }))
  }
  /** 将当前索引文档依赖交给模块图分析器，返回循环依赖诊断。 */ moduleDiagnostics() { return analyzeModuleGraph([...this.documents.values()].map(/** 构造并返回记录 { uri: document.uri, dependencies: document.analysis.dependencies }，字段按当前实参及捕获状态求值。 */ document => ({ uri: document.uri, dependencies: document.analysis.dependencies }))) }
  /** 将文档源码、API 版本及修订序列化为版本化脚本索引快照。 */ snapshot(): string {
    return JSON.stringify({ format: 'nova-script-index', version: 2, documents: [...this.documents.values()].map(/** 构造并返回记录 { uri: document.uri, source: document.source, apiVersion: document.analysis.apiVersion, revision: document.analysis.revision }，字段按当前实参及捕获状态求值。 */ document => ({ uri: document.uri, source: document.source, apiVersion: document.analysis.apiVersion, revision: document.analysis.revision })) })
  }
  /** 验证索引快照后清空原文档，在数量和源码大小限制内重新分析有效记录。 */ restore(snapshot: string, maximumDocuments = 10_000): number {
    const value = JSON.parse(snapshot) as { format?: string; version?: number; documents?: Array<{ uri?: unknown; source?: unknown; apiVersion?: unknown; revision?: unknown }> }
    if (value.format !== 'nova-script-index' || value.version !== 2 || !Array.isArray(value.documents)) throw new Error('Unsupported or corrupt script index')
    this.documents.clear()
    for (const item of value.documents.slice(0, Math.max(1, maximumDocuments))) if (typeof item.uri === 'string' && typeof item.source === 'string') this.update(item.uri.slice(0, 1_024), item.source.slice(0, 2_000_000), Number(item.apiVersion) === 1 ? 1 : 2, Math.max(0, Math.round(Number(item.revision) || 0)))
    return this.documents.size
  }
  /* 返回 this.documents.size 的当前值。 */ get size(): number { return this.documents.size }
  /** 执行时调用 this.documents.clear()；不显式返回调用结果。 */ clear(): void { this.documents.clear() }
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

/** 分派编辑器脚本协议请求到索引、补全、导航和格式化服务，将异常包装成协议错误。 */ export function handleScriptProtocol(index: ScriptWorkspaceIndex, request: ScriptProtocolRequest): { id: string | number; result?: unknown; error?: { code: string; message: string } } {
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
/** 工作线程语言分析服务：失败、取消、替代与销毁均结算请求并释放监听器，保留本地分析回退契约。 */
export class ScriptLanguageService {
  private worker: Worker | null = null
  private requestId = 0
  private pending = new Map<number, { resolve: (analysis: ScriptAnalysis) => void; reject: (error: unknown) => void; cleanup: () => void; source: string; apiVersion: 1 | 2; revision: number; externalFunctions: string[] }>()
  /** 尝试创建模块工作线程；线程不可用时继续使用同一语言分析器的本地路径。 */
  constructor() {
    if (typeof Worker === 'undefined') return
    try {
      this.worker = new Worker(new URL('./scriptLanguage.worker.ts', import.meta.url), { type: 'module', name: 'nova-script-language' })
      this.worker.onmessage = /** 结构说明（自动提取）：匿名回调；输入 event；直接调用 finish。 */ (/** 仅结算仍在等待的编号；已取消、替代或销毁的迟到响应不会重新应用。 */ event: MessageEvent<WorkerReply>) => { this.finish(event.data.id, event.data.analysis) }
      this.worker.onerror = /** 工作线程错误已有本地回退处理，阻止其升级为未处理的编辑器全局错误。 */ event => { event.preventDefault(); this.stopWorker() }
      this.worker.onmessageerror = /** 消息反序列化失败时释放线程，并对所有等待请求执行本地回退。 */ () => { this.stopWorker() }
    } catch { this.stopWorker() }
  }
  /** 先移除请求和中止订阅，再交付响应或本地回退；回退抛错时拒绝对应 Promise 而非留下悬挂请求。 */
  private finish(id: number, analysis?: ScriptAnalysis): void {
    const pending = this.pending.get(id)
    if (!pending) return
    this.pending.delete(id); pending.cleanup()
    try { pending.resolve(analysis ?? analyzeScript(pending.source, pending.apiVersion, pending.revision, pending.externalFunctions)) }
    catch (error) { pending.reject(error) }
  }
  /** 断开事件处理、终止线程并结算全部等待请求；重复调用无副作用。 */
  private stopWorker(): void {
    const worker = this.worker; this.worker = null
    if (worker) { worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null; worker.terminate() }
    for (const id of [...this.pending.keys()]) this.finish(id)
  }
  /** 发起带源码版本的分析；旧请求、已中止请求和线程失败沿用本地分析，不丢弃外部函数上下文。 */
  analyze(source: string, options: { apiVersion?: 1 | 2; revision?: number; signal?: AbortSignal; externalFunctions?: readonly string[] } = {}): Promise<ScriptAnalysis> {
    const apiVersion = options.apiVersion ?? 2, revision = Math.max(0, Math.round(options.revision ?? 0)), externalFunctions=[...(options.externalFunctions ?? [])]
    const id = ++this.requestId
    for (const pendingId of [...this.pending.keys()]) if (pendingId < id) this.finish(pendingId)
    if (options.signal?.aborted || !this.worker) return Promise.resolve(analyzeScript(source, apiVersion, revision,externalFunctions))
    return new Promise(/** 保存完整回退上下文与可注销中止监听器；发送失败走统一线程清理路径。 */ (resolve, reject) => {
      const abort = /** 中止分析不会丢失请求结果，按现有契约返回同源本地分析。 */ () => this.finish(id)
      const cleanup = /** 成功、取消、替代及销毁后都移除中止订阅，释放捕获的源码和服务实例。 */ () => options.signal?.removeEventListener('abort', abort)
      this.pending.set(id, { resolve, reject, cleanup, source, apiVersion, revision,externalFunctions })
      options.signal?.addEventListener('abort', abort, { once: true })
      try { this.worker?.postMessage({ id, source, apiVersion, revision,externalFunctions }) }
      catch { this.stopWorker() }
    })
  }
  /** 销毁线程并结算所有等待请求；后续调用仍可通过本地分析器执行。 */
  dispose(): void { this.stopWorker() }
}
