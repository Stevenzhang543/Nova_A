/** 脚本语言服务：提供诊断、补全、跳转、引用、改名及模块提示，协调工作线程请求。 */
import { apiEntry } from './scriptApiCatalog'
import { type ScriptGenericHelper, type ScriptStatement, type ScriptStructure, type ScriptTypeInfo } from './scriptAnalysisAnnotations'
import { analyzeScriptSyntax, formatSyntaxWhitespace, renameSyntaxBinding, VERIFIED_SCRIPT_SIGNATURES, type ScriptRenameSelection } from './scriptAnalysisSyntax'

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

