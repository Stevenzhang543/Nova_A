import { reactive } from 'vue'
import { analyzeScript } from '../editor/scriptLanguage'

export type HotReloadCompatibility = 'compatible' | 'recreate-instances' | 'restart-required' | 'rejected'
export interface HotReloadExportShape { name: string; valueType: string; serialized: boolean }
export interface HotReloadPlan {
  id: string
  scriptUuid: string
  requestedAt: string
  previousHash: string
  candidateHash: string
  classification: HotReloadCompatibility
  reasons: string[]
  transfer: Array<{ property: string; action: 'preserve' | 'initialize' | 'drop' }>
  previousSource: string
  candidateSource: string
}
export interface HotReloadHistoryEntry extends Omit<HotReloadPlan, 'previousSource' | 'candidateSource'> {
  status: 'prepared' | 'committed' | 'rolled-back' | 'rejected'
  completedAt: string | null
  message: string
}

export const scriptHotReloadState = reactive({
  activePlan: null as HotReloadPlan | null,
  restartRequired: false,
  history: [] as HotReloadHistoryEntry[],
  rollbackSources: {} as Record<string, string>
})

function sourceHash(source: string): string {
  let hash = 2166136261
  for (const character of source) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0
  return hash.toString(16).padStart(8, '0')
}

function append(entry: HotReloadHistoryEntry): void {
  scriptHotReloadState.history.unshift(entry)
  if (scriptHotReloadState.history.length > 200) scriptHotReloadState.history.splice(200)
}

export function prepareHotReload(
  scriptUuid: string,
  previousSource: string,
  candidateSource: string,
  previousExports: readonly HotReloadExportShape[],
  candidateExports: readonly HotReloadExportShape[],
  policy: 'preserve' | 'recreate' | 'disabled'
): HotReloadPlan {
  const analysis = analyzeScript(candidateSource)
  const reasons: string[] = []
  const previous = new Map(previousExports.map(item => [item.name, item]))
  const candidate = new Map(candidateExports.map(item => [item.name, item]))
  const transfer: HotReloadPlan['transfer'] = []
  let classification: HotReloadCompatibility = 'compatible'

  if (policy === 'disabled') { classification = 'rejected'; reasons.push('Reload policy is disabled for this script.') }
  if (analysis.diagnostics.some(item => item.severity === 'error')) { classification = 'rejected'; reasons.push('Parser or semantic analysis failed.') }
  for (const [name, next] of candidate) {
    const before = previous.get(name)
    if (!before) { transfer.push({ property: name, action: 'initialize' }); continue }
    if (before.valueType !== next.valueType || before.serialized !== next.serialized) {
      classification = 'restart-required'; reasons.push(`Export ${name} changed type or serialization lifetime.`); transfer.push({ property: name, action: 'initialize' })
    } else transfer.push({ property: name, action: 'preserve' })
  }
  for (const [name, before] of previous) if (!candidate.has(name)) {
    transfer.push({ property: name, action: 'drop' })
    if (before.serialized) { classification = 'restart-required'; reasons.push(`Serialized export ${name} was removed.`) }
  }
  if (policy === 'recreate' && classification === 'compatible') { classification = 'recreate-instances'; reasons.push('The script requests instance recreation.') }
  if (!reasons.length) reasons.push('Function bodies and exported property layout are compatible.')

  const plan: HotReloadPlan = {
    id: `reload-${Date.now()}-${sourceHash(candidateSource)}`,
    scriptUuid, requestedAt: new Date().toISOString(), previousHash: sourceHash(previousSource), candidateHash: sourceHash(candidateSource),
    classification, reasons, transfer, previousSource, candidateSource
  }
  scriptHotReloadState.activePlan = plan
  scriptHotReloadState.restartRequired = classification === 'restart-required'
  append({ ...plan, status: 'prepared', completedAt: null, message: reasons.join(' ') })
  return plan
}

export function commitHotReload(plan: HotReloadPlan): void {
  scriptHotReloadState.rollbackSources[plan.scriptUuid] = plan.previousSource
  const entry = scriptHotReloadState.history.find(item => item.id === plan.id)
  if (entry) { entry.status = 'committed'; entry.completedAt = new Date().toISOString(); entry.message = `Committed ${plan.candidateHash}; rollback ${plan.previousHash} retained.` }
  scriptHotReloadState.activePlan = null
  scriptHotReloadState.restartRequired = false
}

export function rejectHotReload(plan: HotReloadPlan, message: string): void {
  const entry = scriptHotReloadState.history.find(item => item.id === plan.id)
  if (entry) { entry.status = 'rejected'; entry.completedAt = new Date().toISOString(); entry.message = message }
  scriptHotReloadState.activePlan = null
  scriptHotReloadState.restartRequired = plan.classification === 'restart-required'
}

export function rollbackHotReload(scriptUuid: string): string | null {
  const source = scriptHotReloadState.rollbackSources[scriptUuid]
  if (!source) return null
  const latest = scriptHotReloadState.history.find(item => item.scriptUuid === scriptUuid && item.status === 'committed')
  if (latest) { latest.status = 'rolled-back'; latest.completedAt = new Date().toISOString(); latest.message = `Rolled back to ${latest.previousHash}.` }
  delete scriptHotReloadState.rollbackSources[scriptUuid]
  return source
}

export function hotReloadHistory(scriptUuid?: string): HotReloadHistoryEntry[] {
  return scriptHotReloadState.history.filter(item => !scriptUuid || item.scriptUuid === scriptUuid).map(item => ({ ...item, reasons: [...item.reasons], transfer: item.transfer.map(change => ({ ...change })) }))
}
