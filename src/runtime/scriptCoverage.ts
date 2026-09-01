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

function hash(source: string): string {
  let value = 2166136261
  for (const character of source) value = Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0
  return value.toString(16).padStart(8, '0')
}

function fileFor(scriptUuid: string, source: string): MutableCoverageFile {
  const sourceHash = hash(source), existing = scriptCoverageState.files[scriptUuid]
  if (existing?.sourceHash === sourceHash) return existing
  const analysis = analyzeScript(source)
  const functions = Object.keys(analysis.functions)
  const executableLines = [...new Set(Object.values(analysis.functions).flatMap(fn => Array.from({ length: Math.max(1, fn.endLine - fn.line + 1) }, (_, index) => fn.line + index)))].sort((a, b) => a - b)
  const created: MutableCoverageFile = { scriptUuid, sourceHash, executableFunctions: functions, coveredFunctions: [], executableLines, coveredLines: [], apiBindings: analysis.apiUsage, functionHits: {}, lineHits: {} }
  scriptCoverageState.files[scriptUuid] = created
  return created
}

export function recordScriptCoverage(scriptUuid: string, source: string, functionName: string): void {
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

export function resetScriptCoverage(): void {
  scriptCoverageState.files = {}
  scriptCoverageState.bindingHits = {}
  scriptCoverageState.revision++
}

export function scriptCoverageReport(): ScriptCoverageReport {
  const files = Object.values(scriptCoverageState.files).map(file => ({ ...file, executableFunctions: [...file.executableFunctions], coveredFunctions: [...file.coveredFunctions].sort(), executableLines: [...file.executableLines], coveredLines: [...file.coveredLines].sort((a, b) => a - b), apiBindings: [...file.apiBindings] }))
  const executableLines = files.reduce((sum, file) => sum + file.executableLines.length, 0), coveredLines = files.reduce((sum, file) => sum + file.coveredLines.length, 0)
  const executableFunctions = files.reduce((sum, file) => sum + file.executableFunctions.length, 0), coveredFunctions = files.reduce((sum, file) => sum + file.coveredFunctions.length, 0)
  const stableBindings = SCRIPT_API_V2_MANIFEST.entries.filter(entry => !entry.deprecated).map(entry => entry.callable)
  const coveredBindings = stableBindings.filter(name => (scriptCoverageState.bindingHits[name] ?? 0) > 0)
  return {
    format: 'nova-rhai-coverage', version: 2, engineVersion: NOVA_ENGINE_VERSION, generatedAt: new Date().toISOString(),
    lineRate: executableLines ? coveredLines / executableLines : 1,
    functionRate: executableFunctions ? coveredFunctions / executableFunctions : 1,
    bindingRate: stableBindings.length ? coveredBindings.length / stableBindings.length : 1,
    files, coveredBindings, missingBindings: stableBindings.filter(name => !coveredBindings.includes(name))
  }
}

export function scriptCoverageLcov(report = scriptCoverageReport()): string {
  return report.files.map(file => [`TN:Nova_A`, `SF:${file.scriptUuid}`, ...file.executableFunctions.map(name => `FN:1,${name}`), ...file.executableFunctions.map(name => `FNDA:${file.coveredFunctions.includes(name) ? 1 : 0},${name}`), ...file.executableLines.map(line => `DA:${line},${file.coveredLines.includes(line) ? 1 : 0}`), 'end_of_record'].join('\n')).join('\n') + '\n'
}

