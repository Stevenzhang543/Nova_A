/** 脚本覆盖率记录：跟踪语句执行和未覆盖位置，生成可导出的覆盖结果。 */
import { reactive } from 'vue'
import { SCRIPT_API_V2_MANIFEST } from '../editor/scriptApi'
import { analyzeScript } from '../editor/scriptLanguage'
import { NOVA_ENGINE_VERSION } from '../projects/projectFormat'

export interface ScriptCoverageFile {
  scriptUuid: string
  sourceHash: string
  executableFunctions: string[]
  coveredFunctions: string[]
  executableLines: number[]
  coveredLines: number[]
  apiBindings: string[]
}
export interface ScriptCoverageReport {
  format: 'nova-rhai-coverage'
  version: 2
  engineVersion: string
  generatedAt: string
  lineRate: number
  functionRate: number
  bindingRate: number
  files: ScriptCoverageFile[]
  coveredBindings: string[]
  missingBindings: string[]
}

interface MutableCoverageFile extends ScriptCoverageFile {
  functionHits: Record<string, number>
  lineHits: Record<number, number>
}

export const scriptCoverageState = reactive({
  enabled: true,
  files: {} as Record<string, MutableCoverageFile>,
  bindingHits: {} as Record<string, number>,
  revision: 0
})

/** 按字符迭代计算源码变化摘要，供覆盖记录失效判断。 */ function hash(source: string): string {
  let value = 2166136261
  for (const character of source) value = Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0
  return value.toString(16).padStart(8, '0')
}

/** 按源码摘要复用覆盖记录，变化时重新静态分析函数范围和 API 用法并重建空统计。 */ function fileFor(scriptUuid: string, source: string): MutableCoverageFile {
  const sourceHash = hash(source), existing = scriptCoverageState.files[scriptUuid]
  if (existing?.sourceHash === sourceHash) return existing
  const analysis = analyzeScript(source)
  const functions = Object.keys(analysis.functions)
  const executableLines = [...new Set(Object.values(analysis.functions).flatMap(/* 调用 Array.from({ length: Math.max(1, fn.endLine - fn.line + 1) }, (_, index) => fn.line + index) 并返回调用结果。 */ fn => Array.from({ length: Math.max(1, fn.endLine - fn.line + 1) }, /* 计算表达式 fn.line + index 并返回结果，沿用操作数的原有类型规则。 */ (_, index) => fn.line + index)))].sort(/* 计算表达式 a - b 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a - b)
  const created: MutableCoverageFile = { scriptUuid, sourceHash, executableFunctions: functions, coveredFunctions: [], executableLines, coveredLines: [], apiBindings: analysis.apiUsage, functionHits: {}, lineHits: {} }
  scriptCoverageState.files[scriptUuid] = created
  return created
}

/** 按回调执行记录函数命中，并以函数范围推定行覆盖、以静态用法推定绑定覆盖；不代表逐行或逐绑定实际执行追踪。 */ export function recordScriptCoverage(scriptUuid: string, source: string, functionName: string): void {
  if (!scriptCoverageState.enabled) return
  const file = fileFor(scriptUuid, source), fn = analyzeScript(source).functions[functionName]
  if (fn) {
    file.functionHits[functionName] = (file.functionHits[functionName] ?? 0) + 1
    if (!file.coveredFunctions.includes(functionName)) file.coveredFunctions.push(functionName)
    for (let line = fn.line; line <= fn.endLine; line++) {
      file.lineHits[line] = (file.lineHits[line] ?? 0) + 1
      if (!file.coveredLines.includes(line)) file.coveredLines.push(line)
    }
  }
  for (const binding of file.apiBindings) scriptCoverageState.bindingHits[binding] = (scriptCoverageState.bindingHits[binding] ?? 0) + 1
  scriptCoverageState.revision++
}

/** 清空文件与 API 覆盖统计并递增版本。 */ export function resetScriptCoverage(): void {
  scriptCoverageState.files = {}
  scriptCoverageState.bindingHits = {}
  scriptCoverageState.revision++
}

/** 复制覆盖记录并汇总推定行、函数和稳定 API 比率，列出尚未覆盖的绑定。 */ export function scriptCoverageReport(): ScriptCoverageReport {
  const files = Object.values(scriptCoverageState.files).map(/** 复制并排序文件覆盖集合，避免导出数组与活动记录共享引用。 */ file => ({ ...file, executableFunctions: [...file.executableFunctions], coveredFunctions: [...file.coveredFunctions].sort(), executableLines: [...file.executableLines], coveredLines: [...file.coveredLines].sort(/* 计算表达式 a - b 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a - b), apiBindings: [...file.apiBindings] }))
  const executableLines = files.reduce(/* 计算表达式 sum + file.executableLines.length 并返回结果，沿用操作数的原有类型规则。 */ (sum, file) => sum + file.executableLines.length, 0), coveredLines = files.reduce(/* 计算表达式 sum + file.coveredLines.length 并返回结果，沿用操作数的原有类型规则。 */ (sum, file) => sum + file.coveredLines.length, 0)
  const executableFunctions = files.reduce(/* 计算表达式 sum + file.executableFunctions.length 并返回结果，沿用操作数的原有类型规则。 */ (sum, file) => sum + file.executableFunctions.length, 0), coveredFunctions = files.reduce(/* 计算表达式 sum + file.coveredFunctions.length 并返回结果，沿用操作数的原有类型规则。 */ (sum, file) => sum + file.coveredFunctions.length, 0)
  const stableBindings = SCRIPT_API_V2_MANIFEST.entries.filter(/* 返回 entry.deprecated 的逻辑取反结果。 */ entry => !entry.deprecated).map(/* 返回 entry.callable 的当前值。 */ entry => entry.callable)
  const coveredBindings = stableBindings.filter(/* 比较 (scriptCoverageState.bindingHits[name] ?? 0) 与 0，返回大于的判断结果。 */ name => (scriptCoverageState.bindingHits[name] ?? 0) > 0)
  return {
    format: 'nova-rhai-coverage', version: 2, engineVersion: NOVA_ENGINE_VERSION, generatedAt: new Date().toISOString(),
    lineRate: executableLines ? coveredLines / executableLines : 1,
    functionRate: executableFunctions ? coveredFunctions / executableFunctions : 1,
    bindingRate: stableBindings.length ? coveredBindings.length / stableBindings.length : 1,
    files, coveredBindings, missingBindings: stableBindings.filter(/* 返回 coveredBindings.includes(name) 的逻辑取反结果。 */ name => !coveredBindings.includes(name))
  }
}

/** 将当前函数范围推定覆盖转换为 LCOV 文本，输出二值命中而非实际执行次数。 */ export function scriptCoverageLcov(report = scriptCoverageReport()): string {
  return report.files.map(/** 为单个脚本拼接 LCOV 函数和行记录，函数声明行按现有格式固定为一。 */ file => [`TN:Nova_A`, `SF:${file.scriptUuid}`, ...file.executableFunctions.map(/** 按模板 `FN:1,${name}` 生成并返回字符串。 */ name => `FN:1,${name}`), ...file.executableFunctions.map(/** 按模板 `FNDA:${file.coveredFunctions.includes(name) ? 1 : 0},${name}` 生成并返回字符串。 */ name => `FNDA:${file.coveredFunctions.includes(name) ? 1 : 0},${name}`), ...file.executableLines.map(/** 按模板 `DA:${line},${file.coveredLines.includes(line) ? 1 : 0}` 生成并返回字符串。 */ line => `DA:${line},${file.coveredLines.includes(line) ? 1 : 0}`), 'end_of_record'].join('\n')).join('\n') + '\n'
}

