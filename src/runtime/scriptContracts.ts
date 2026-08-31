import { SCRIPT_API_V2_MANIFEST, type ScriptApiDeterminism, type ScriptApiThreadRule } from '../editor/scriptApi'
import { analyzeScript } from '../editor/scriptLanguage'

export const NOVA_SCRIPT_CONTRACT_VERSION = 1 as const
export const DEFAULT_SCRIPT_COMMAND_BUDGET = 4096
export const DEFAULT_SCRIPT_LOG_BUDGET = 512

export type ScriptContractRequirementKind = 'component' | 'input' | 'asset' | 'package'
export interface ScriptContractRequirement { kind: ScriptContractRequirementKind; value: string; line: number }
export interface ScriptContractDiagnostic { code: string; severity: 'error' | 'warning'; message: string; line: number }
export interface ScriptContract {
  format: 'nova-script-contract'
  version: typeof NOVA_SCRIPT_CONTRACT_VERSION
  strict: boolean
  deterministic: boolean
  requirements: ScriptContractRequirement[]
  budgets: { commands: number; logs: number }
}
export interface ScriptContractContext {
  components?: Iterable<string>
  inputActions?: Iterable<string>
  assets?: Iterable<string>
  packages?: Iterable<string>
}
export interface ScriptApiUsageContract {
  name: string
  module: string
  threadRule: ScriptApiThreadRule
  determinism: ScriptApiDeterminism
  permissions: readonly string[]
}
export interface ScriptContractReport {
  contract: ScriptContract
  diagnostics: ScriptContractDiagnostic[]
  apiUsage: ScriptApiUsageContract[]
  valid: boolean
}

const REQUIREMENT_KINDS = new Set<ScriptContractRequirementKind>(['component', 'input', 'asset', 'package'])
const API_BINDINGS = new Map(SCRIPT_API_V2_MANIFEST.entries.map(entry => [entry.name, entry]))

function boundedBudget(value: string, maximum: number): number | null {
  if (!/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum ? parsed : null
}

function cleanRequirement(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, '').slice(0, 240)
}

export function parseScriptContract(source: string): ScriptContractReport {
  const contract: ScriptContract = {
    format: 'nova-script-contract', version: NOVA_SCRIPT_CONTRACT_VERSION,
    strict: false, deterministic: false, requirements: [],
    budgets: { commands: DEFAULT_SCRIPT_COMMAND_BUDGET, logs: DEFAULT_SCRIPT_LOG_BUDGET }
  }
  const diagnostics: ScriptContractDiagnostic[] = []
  let contractHeaderSeen = false
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    const lineNumber = index + 1
    const directive = line.match(/^\s*\/\/\s*@nova(?:\s+(.*))?\s*$/)
    if (directive) {
      contractHeaderSeen = true
      for (const flag of (directive[1] ?? '').split(/\s+/).filter(Boolean)) {
        if (flag === 'strict') contract.strict = true
        else if (flag === 'deterministic') contract.deterministic = true
        else diagnostics.push({ code: 'NOVA-CONTRACT-001', severity: 'error', line: lineNumber, message: `Unknown @nova contract flag “${flag}”.` })
      }
      continue
    }
    const required = line.match(/^\s*\/\/\s*@requires\s+(\S+)\s+(.+?)\s*$/)
    if (required) {
      const kind = required[1] as ScriptContractRequirementKind, value = cleanRequirement(required[2])
      if (!REQUIREMENT_KINDS.has(kind)) diagnostics.push({ code: 'NOVA-CONTRACT-002', severity: 'error', line: lineNumber, message: `Unknown requirement kind “${required[1]}”.` })
      else if (!value) diagnostics.push({ code: 'NOVA-CONTRACT-003', severity: 'error', line: lineNumber, message: `The ${kind} requirement is empty.` })
      else if (!contract.requirements.some(item => item.kind === kind && item.value === value)) contract.requirements.push({ kind, value, line: lineNumber })
      continue
    }
    const budget = line.match(/^\s*\/\/\s*@budget\s+(commands|logs)\s+(\S+)\s*$/)
    if (budget) {
      const key = budget[1] as 'commands' | 'logs', maximum = key === 'commands' ? DEFAULT_SCRIPT_COMMAND_BUDGET : DEFAULT_SCRIPT_LOG_BUDGET
      const value = boundedBudget(budget[2], maximum)
      if (value === null) diagnostics.push({ code: 'NOVA-CONTRACT-004', severity: 'error', line: lineNumber, message: `${key} budget must be an integer from 1 to ${maximum}.` })
      else contract.budgets[key] = Math.min(contract.budgets[key], value)
      continue
    }
    if (/^\s*\/\/\s*@(requires|budget)\b/.test(line)) diagnostics.push({ code: 'NOVA-CONTRACT-005', severity: 'error', line: lineNumber, message: 'Malformed behavior-contract directive.' })
  }
  if ((contract.requirements.length || contract.budgets.commands !== DEFAULT_SCRIPT_COMMAND_BUDGET || contract.budgets.logs !== DEFAULT_SCRIPT_LOG_BUDGET) && !contractHeaderSeen) diagnostics.push({ code: 'NOVA-CONTRACT-006', severity: 'warning', line: 1, message: 'Add “// @nova” before behavior requirements and budgets so the contract is easy to discover.' })
  const analysis = analyzeScript(source)
  const apiUsage = analysis.apiUsage.flatMap(name => {
    const entry = API_BINDINGS.get(name)
    return entry ? [{ name, module: entry.module, threadRule: entry.threadRule, determinism: entry.determinism, permissions: entry.permissions }] : []
  })
  if (contract.deterministic) for (const entry of apiUsage.filter(item => item.determinism === 'host-dependent')) diagnostics.push({ code: 'NOVA-CONTRACT-007', severity: 'error', line: 1, message: `Deterministic behavior cannot use host-dependent API “${entry.name}”.` })
  if (contract.strict) {
    for (const reference of analysis.references.filter(item => !item.declaration)) {
      const binding = API_BINDINGS.get(reference.name)
      if (binding?.threadRule !== 'fixed-step') continue
      const owner = Object.entries(analysis.functions).find(([, range]) => reference.line >= range.line && reference.line <= range.endLine)?.[0] ?? ''
      if (owner !== 'fixed_update') diagnostics.push({ code: 'NOVA-CONTRACT-008', severity: 'error', line: reference.line, message: `Strict behavior may call fixed-step API “${reference.name}” only from fixed_update.` })
    }
  }
  return { contract, diagnostics, apiUsage, valid: !diagnostics.some(item => item.severity === 'error') }
}

export function validateScriptContract(source: string, context: ScriptContractContext = {}): ScriptContractReport {
  const report = parseScriptContract(source)
  const available: Partial<Record<ScriptContractRequirementKind, Set<string>>> = {
    component: context.components ? new Set(context.components) : undefined,
    input: context.inputActions ? new Set(context.inputActions) : undefined,
    asset: context.assets ? new Set(context.assets) : undefined,
    package: context.packages ? new Set(context.packages) : undefined
  }
  for (const requirement of report.contract.requirements) {
    const values = available[requirement.kind]
    if (values && !values.has(requirement.value)) report.diagnostics.push({ code: 'NOVA-CONTRACT-REQ', severity: 'error', line: requirement.line, message: `Required ${requirement.kind} “${requirement.value}” is unavailable.` })
  }
  report.valid = !report.diagnostics.some(item => item.severity === 'error')
  return report
}

export function scriptContractHeader(contract: ScriptContract = parseScriptContract('// @nova strict deterministic').contract): string {
  return [
    `// @nova${contract.strict ? ' strict' : ''}${contract.deterministic ? ' deterministic' : ''}`,
    ...contract.requirements.map(item => `// @requires ${item.kind} ${item.value}`),
    `// @budget commands ${contract.budgets.commands}`,
    `// @budget logs ${contract.budgets.logs}`
  ].join('\n')
}
