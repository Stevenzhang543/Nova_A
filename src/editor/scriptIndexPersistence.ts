/** 脚本索引持久化：校验缓存摘要，恢复或重建工作区符号索引并跟踪 API 变化。 */
import { reactive } from 'vue'
import { analyzeScript, type ScriptSymbol } from './scriptLanguage'

const INDEX_KEY = 'nova-a.script-index.v2'
const TEMP_KEY = `${INDEX_KEY}.pending`
const INDEX_FORMAT = 'nova-script-workspace-index'
const INDEX_VERSION = 2
const MAX_DOCUMENTS = 10_000

export interface PersistedScriptDocument {
  uri: string
  sourceHash: string
  apiVersion: 1 | 2
  revision: number
  symbols: ScriptSymbol[]
  dependencies: string[]
  diagnostics: number
}

interface PersistedScriptIndex {
  format: typeof INDEX_FORMAT
  version: typeof INDEX_VERSION
  apiVersion: 2
  createdAt: string
  checksum: string
  documents: PersistedScriptDocument[]
}

export const scriptIndexState = reactive({
  status: 'idle' as 'idle' | 'restored' | 'building' | 'ready' | 'error' | 'restart-required',
  documentCount: 0,
  symbolCount: 0,
  lastSavedAt: '',
  message: '',
  revision: 0
})

/** 逐字符混合生成固定八位十六进制源码摘要，用于索引变更检测。 */ function sourceHash(source: string): string {
  let hash = 2166136261
  for (const character of source) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0
  return hash.toString(16).padStart(8, '0')
}

/** 对索引文档的 URI、源码摘要、API 版本及修订序列生成校验摘要。 */ function payloadChecksum(documents: PersistedScriptDocument[]): string {
  return sourceHash(JSON.stringify(documents.map(/* 返回按声明顺序构造的数组 [document.uri, document.sourceHash, document.apiVersion, document.revision]。 */ document => [document.uri, document.sourceHash, document.apiVersion, document.revision])))
}

/** 同步索引状态、文档符号数量和保存时间，并递增可观察修订号。 */ function applyState(index: PersistedScriptIndex, status: typeof scriptIndexState.status): void {
  scriptIndexState.status = status
  scriptIndexState.documentCount = index.documents.length
  scriptIndexState.symbolCount = index.documents.reduce(/* 计算表达式 sum + document.symbols.length 并返回结果，沿用操作数的原有类型规则。 */ (sum, document) => sum + document.symbols.length, 0)
  scriptIndexState.lastSavedAt = index.createdAt
  scriptIndexState.message = status === 'restored' ? 'Restored the crash-safe workspace symbol index' : 'Workspace symbol index is current'
  scriptIndexState.revision++
}

/** 验证索引信封与文档基本结构，限制文档数量并校验摘要，不兼容或不一致时返回 null。 */ function parseIndex(value: string | null): PersistedScriptIndex | null {
  if (!value) return null
  const candidate = JSON.parse(value) as Partial<PersistedScriptIndex>
  if (candidate.format !== INDEX_FORMAT || candidate.version !== INDEX_VERSION || candidate.apiVersion !== 2 || !Array.isArray(candidate.documents)) return null
  const documents = candidate.documents.slice(0, MAX_DOCUMENTS).filter(/** 仅接受具有 URI、源码摘要、受支持 API 版本、符号数组及依赖数组的索引文档。 */ document =>
    typeof document?.uri === 'string' && typeof document.sourceHash === 'string' &&
    (document.apiVersion === 1 || document.apiVersion === 2) && Array.isArray(document.symbols) && Array.isArray(document.dependencies)
  )
  if (candidate.checksum !== payloadChecksum(documents)) return null
  return { format: INDEX_FORMAT, version: INDEX_VERSION, apiVersion: 2, createdAt: String(candidate.createdAt ?? ''), checksum: candidate.checksum, documents }
}

/** 优先恢复已提交索引，其次尝试临时记录；清理临时键并将读取异常反映到状态。 */ export function restoreScriptIndex(): PersistedScriptDocument[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const committed = parseIndex(localStorage.getItem(INDEX_KEY))
    const pending = parseIndex(localStorage.getItem(TEMP_KEY))
    const index = committed ?? pending
    localStorage.removeItem(TEMP_KEY)
    if (!index) return []
    applyState(index, 'restored')
    return index.documents
  } catch (error) {
    scriptIndexState.status = 'error'
    scriptIndexState.message = error instanceof Error ? error.message : String(error)
    scriptIndexState.revision++
    return []
  }
}

/** 分析有界脚本集合生成符号索引，按临时记录到提交记录顺序保存，并同步成功或失败状态。 */ export function rebuildAndPersistScriptIndex(inputs: Array<{ uri: string; source: string; apiVersion: 1 | 2; revision?: number }>): PersistedScriptDocument[] {
  scriptIndexState.status = 'building'
  scriptIndexState.message = 'Indexing project scripts'
  scriptIndexState.revision++
  try {
    const documents = inputs.slice(0, MAX_DOCUMENTS).map(/** 分析单个脚本，保存截断 URI、源码摘要、修订、符号依赖及诊断数量。 */ input => {
      const analysis = analyzeScript(input.source, input.apiVersion, input.revision ?? 0)
      return {
        uri: input.uri.slice(0, 1_024), sourceHash: sourceHash(input.source), apiVersion: input.apiVersion,
        revision: analysis.revision, symbols: analysis.symbols, dependencies: analysis.dependencies,
        diagnostics: analysis.diagnostics.length
      } satisfies PersistedScriptDocument
    })
    const index: PersistedScriptIndex = { format: INDEX_FORMAT, version: INDEX_VERSION, apiVersion: 2, createdAt: new Date().toISOString(), checksum: payloadChecksum(documents), documents }
    if (typeof localStorage !== 'undefined') {
      const serialized = JSON.stringify(index)
      localStorage.setItem(TEMP_KEY, serialized)
      localStorage.setItem(INDEX_KEY, serialized)
      localStorage.removeItem(TEMP_KEY)
    }
    applyState(index, 'ready')
    return documents
  } catch (error) {
    scriptIndexState.status = 'error'
    scriptIndexState.message = error instanceof Error ? error.message : String(error)
    scriptIndexState.revision++
    return []
  }
}

/** 标记 API 变更需要重建索引并递增状态修订号。 */ export function markScriptIndexApiChanged(): void {
  scriptIndexState.status = 'restart-required'
  scriptIndexState.message = 'Script API version changed; the workspace index will rebuild before the next lookup'
  scriptIndexState.revision++
}

/** 移除已提交及临时索引，清空数量时间与错误提示并恢复空闲状态。 */ export function clearPersistedScriptIndex(): void {
  if (typeof localStorage !== 'undefined') { localStorage.removeItem(INDEX_KEY); localStorage.removeItem(TEMP_KEY) }
  scriptIndexState.status = 'idle'; scriptIndexState.documentCount = 0; scriptIndexState.symbolCount = 0; scriptIndexState.lastSavedAt = ''; scriptIndexState.message = ''; scriptIndexState.revision++
}
