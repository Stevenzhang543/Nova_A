import { SCRIPT_API } from './scriptApi'

export type ScriptSeverity = 'error' | 'warning' | 'info'
export interface ScriptDiagnostic { line: number; column: number; severity: ScriptSeverity; message: string }
export interface ScriptSymbol { name: string; kind: 'function' | 'variable' | 'export' | 'test'; line: number; column: number }
export interface ScriptAnalysis {
  diagnostics: ScriptDiagnostic[]
  symbols: ScriptSymbol[]
  dependencies: string[]
  functions: Record<string, { line: number; endLine: number }>
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/

export function analyzeScript(source: string): ScriptAnalysis {
  const diagnostics: ScriptDiagnostic[] = []
  const symbols: ScriptSymbol[] = []
  const dependencies: string[] = []
  const functions: Record<string, { line: number; endLine: number }> = {}
  const declarationLines = new Map<string, number>()
  const lines = source.split(/\r?\n/)
  let braces = 0
  let currentFunction: { name: string; line: number; depth: number } | null = null

  lines.forEach((line, index) => {
    const number = index + 1
    const code = line.replace(/\/\/.*$/, '')
    const dependency = code.match(/^\s*use\s+["'`]([^"'`]+)["'`]\s*;?\s*$/)
    if (dependency) dependencies.push(dependency[1])
    const fn = code.match(/^\s*fn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/)
    if (fn) {
      const name = fn[1]
      if (declarationLines.has(name)) diagnostics.push({ line: number, column: line.indexOf(name) + 1, severity: 'error', message: `Duplicate symbol “${name}”.` })
      declarationLines.set(name, number)
      symbols.push({ name, kind: name.startsWith('test_') ? 'test' : 'function', line: number, column: line.indexOf(name) + 1 })
      currentFunction = { name, line: number, depth: braces }
    }
    const variable = code.match(/^\s*(@export\s+)?let\s+([^\s:=;]+)/)
    if (variable) {
      const name = variable[2]
      if (!IDENTIFIER.test(name)) diagnostics.push({ line: number, column: Math.max(1, line.indexOf(name) + 1), severity: 'error', message: `Invalid identifier “${name}”.` })
      else {
        if (declarationLines.has(name)) diagnostics.push({ line: number, column: line.indexOf(name) + 1, severity: 'warning', message: `“${name}” shadows an earlier declaration.` })
        declarationLines.set(name, number)
        symbols.push({ name, kind: variable[1] ? 'export' : 'variable', line: number, column: line.indexOf(name) + 1 })
      }
    }
    for (const char of code.replace(/"(?:\\.|[^"\\])*"/g, '')) {
      if (char === '{') braces++
      if (char === '}') braces--
      if (braces < 0) { diagnostics.push({ line: number, column: Math.max(1, line.lastIndexOf('}') + 1), severity: 'error', message: 'Unexpected closing brace.' }); braces = 0 }
    }
    if (currentFunction && braces === currentFunction.depth) {
      functions[currentFunction.name] = { line: currentFunction.line, endLine: number }
      currentFunction = null
    }
  })
  if (braces > 0) diagnostics.push({ line: lines.length, column: Math.max(1, lines[lines.length - 1]?.length ?? 1), severity: 'error', message: `${braces} closing brace${braces === 1 ? '' : 's'} missing.` })
  for (const dependency of dependencies) if (dependency.includes('..')) diagnostics.push({ line: 1, column: 1, severity: 'error', message: `Module path may not escape Assets: ${dependency}` })
  return { diagnostics, symbols, dependencies: [...new Set(dependencies)], functions }
}

export function completionItems(prefix: string): string[] {
  const lowered = prefix.toLowerCase()
  return SCRIPT_API.map(entry => entry.name).filter(name => name.toLowerCase().startsWith(lowered)).slice(0, 24)
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
      this.worker.onmessage = (event: MessageEvent<WorkerReply>) => {
        const resolve = this.pending.get(event.data.id)
        if (!resolve) return
        this.pending.delete(event.data.id)
        resolve(event.data.analysis)
      }
    } catch { this.worker = null }
  }

  analyze(source: string): Promise<ScriptAnalysis> {
    const id = ++this.requestId
    // Older requests are cancelled logically; late worker replies are ignored.
    for (const [pendingId, resolve] of this.pending) if (pendingId < id) { this.pending.delete(pendingId); resolve(analyzeScript(source)) }
    if (!this.worker) return Promise.resolve(analyzeScript(source))
    return new Promise(resolve => { this.pending.set(id, resolve); this.worker?.postMessage({ id, source }) })
  }

  dispose(): void { this.worker?.terminate(); this.worker = null; this.pending.clear() }
}
