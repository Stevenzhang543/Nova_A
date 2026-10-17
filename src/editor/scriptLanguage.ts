/** 编辑器工作区索引、协议与语言 Worker；共享分析算法由 Runtime 提供。 */
export * from '../runtime/scriptAnalysis'
import { analyzeScript, completionDetails, hoverInfo, parameterHint, scriptCodeActions, formatScript, renameScriptSymbol, type ScriptAnalysis, type ScriptSymbol, type WorkspaceScriptDocument, type WorkspaceSymbol, type ScriptReference } from '../runtime/scriptAnalysis'
import { analyzeModuleGraph } from '../runtime/scriptAnalysisAnnotations'
import type { ScriptRenameSelection } from '../runtime/scriptAnalysisSyntax'

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
    // 编号匹配仍不足以证明文档匹配；旧修订或不同 API 的结果必须重新计算。
    if (analysis && (analysis.revision !== pending.revision || analysis.apiVersion !== pending.apiVersion || JSON.stringify(analysis.externalFunctions ?? []) !== JSON.stringify(pending.externalFunctions))) analysis = undefined
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
