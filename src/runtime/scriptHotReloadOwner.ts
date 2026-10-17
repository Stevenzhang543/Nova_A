/** Fixed-World/catalog hot-reload metadata; original transaction algorithms retain their closure receiver semantics. */
import { analyzeScript } from './scriptAnalysis'
import type { GameplayScriptServices } from './scriptServices'
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
export interface ScriptHotReloadWorld { readonly entities: readonly unknown[] }
export interface ScriptHotReloadState { activePlan:HotReloadPlan|null;restartRequired:boolean;history:HotReloadHistoryEntry[];rollbackSources:Record<string,string> }
export function createInitialScriptHotReloadState():ScriptHotReloadState { return {
  activePlan: null as HotReloadPlan | null,
  restartRequired: false,
  history: [] as HotReloadHistoryEntry[],
  rollbackSources: {} as Record<string, string>
} }
function sourceHash(source: string): string {
  let hash = 2166136261
  for (const character of source) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0
  return hash.toString(16).padStart(8, '0')
}
export class ScriptHotReloadOwner {
 readonly state:ScriptHotReloadState
 readonly prepareHotReload: (scriptUuid: string, previousSource: string, candidateSource: string, previousExports: readonly HotReloadExportShape[], candidateExports: readonly HotReloadExportShape[], policy: 'preserve' | 'recreate' | 'disabled') => HotReloadPlan
 readonly commitHotReload: (plan: HotReloadPlan, previousDocument?: string) => void
 readonly rejectHotReload: (plan: HotReloadPlan, message: string) => void
 readonly peekHotReloadRollback: (scriptUuid: string) => { source: string; historyId: string | null } | null
 readonly completeHotReloadRollback: (historyId: string | null) => void
 readonly rollbackHotReload: (scriptUuid: string) => string | null
 readonly hotReloadHistory: (scriptUuid?: string) => HotReloadHistoryEntry[]
 readonly clearHotReloadSession: () => void
 constructor(readonly world:ScriptHotReloadWorld,readonly catalogIdentity:GameplayScriptServices,state:ScriptHotReloadState=createInitialScriptHotReloadState()) {
  if(!world||!Array.isArray(world.entities))throw new Error('HOT_RELOAD_WORLD_REQUIRED: Supply the fixed World.')
  if(!catalogIdentity||['resolveAsset','resolveModuleAsset','readSource','revision','listIdentities','compileVisual'].some(key=>typeof catalogIdentity[key as keyof GameplayScriptServices]!=='function'))throw new Error('HOT_RELOAD_CATALOG_REQUIRED: Supply the actual script services.')
  this.state=state
  const scriptHotReloadState=this.state
  let planSerial = 0
function append(entry: HotReloadHistoryEntry): void {
  scriptHotReloadState.history.unshift(entry)
  if (scriptHotReloadState.history.length > 200) scriptHotReloadState.history.splice(200)
}

function prepareHotReload(
  scriptUuid: string,
  previousSource: string,
  candidateSource: string,
  previousExports: readonly HotReloadExportShape[],
  candidateExports: readonly HotReloadExportShape[],
  policy: 'preserve' | 'recreate' | 'disabled'
): HotReloadPlan {
  const analysis = analyzeScript(candidateSource)
  const reasons: string[] = []
  const previous = new Map(previousExports.map(/* 返回按声明顺序构造的数组 [item.name, item]。 */ item => [item.name, item]))
  const candidate = new Map(candidateExports.map(/* 返回按声明顺序构造的数组 [item.name, item]。 */ item => [item.name, item]))
  const transfer: HotReloadPlan['transfer'] = []
  let classification: HotReloadCompatibility = 'compatible'

  if (policy === 'disabled') { classification = 'rejected'; reasons.push('Reload policy is disabled for this script.') }
  if (analysis.diagnostics.some(/* 比较 item.severity 与 'error'，返回严格相等的判断结果。 */ item => item.severity === 'error')) { classification = 'rejected'; reasons.push('Parser or semantic analysis failed.') }
  for (const [name, next] of candidate) {
    const before = previous.get(name)
    if (!before) { transfer.push({ property: name, action: 'initialize' }); continue }
    if (before.valueType !== next.valueType || before.serialized !== next.serialized) {
      if (classification !== 'rejected') classification = 'restart-required'
      reasons.push(`Export ${name} changed type or serialization lifetime.`); transfer.push({ property: name, action: 'initialize' })
    } else transfer.push({ property: name, action: 'preserve' })
  }
  for (const [name, before] of previous) if (!candidate.has(name)) {
    transfer.push({ property: name, action: 'drop' })
    if (before.serialized) { if (classification !== 'rejected') classification = 'restart-required'; reasons.push(`Serialized export ${name} was removed.`) }
  }
  if (policy === 'recreate' && classification === 'compatible') { classification = 'recreate-instances'; reasons.push('The script requests instance recreation.') }
  if (!reasons.length) reasons.push('Function bodies and exported property layout are compatible.')

  const plan: HotReloadPlan = {
    id: `reload-${Date.now()}-${++planSerial}-${sourceHash(candidateSource)}`,
    scriptUuid, requestedAt: new Date().toISOString(), previousHash: sourceHash(previousSource), candidateHash: sourceHash(candidateSource),
    classification, reasons, transfer, previousSource, candidateSource
  }
  scriptHotReloadState.activePlan = plan
  scriptHotReloadState.restartRequired = classification === 'restart-required'
  const { previousSource: _previousSource, candidateSource: _candidateSource, ...metadata } = plan
  append({ ...metadata, reasons: [...reasons], transfer: transfer.map(/** 构造并返回记录 { ...change }，字段按当前实参及捕获状态求值。 */ change => ({ ...change })), status: 'prepared', completedAt: null, message: reasons.join(' ') })
  return plan
}

function commitHotReload(plan: HotReloadPlan, previousDocument = plan.previousSource): void {
  scriptHotReloadState.rollbackSources[plan.scriptUuid] = previousDocument
  const entry = scriptHotReloadState.history.find(/* 比较 item.id 与 plan.id，返回严格相等的判断结果。 */ item => item.id === plan.id)
  if (entry) { entry.status = 'committed'; entry.completedAt = new Date().toISOString(); entry.message = `Committed ${plan.candidateHash}; rollback ${plan.previousHash} retained.` }
  if (scriptHotReloadState.activePlan?.id === plan.id) {
    scriptHotReloadState.activePlan = null
    scriptHotReloadState.restartRequired = false
  }
}

function rejectHotReload(plan: HotReloadPlan, message: string): void {
  const entry = scriptHotReloadState.history.find(/* 比较 item.id 与 plan.id，返回严格相等的判断结果。 */ item => item.id === plan.id)
  if (entry) { entry.status = 'rejected'; entry.completedAt = new Date().toISOString(); entry.message = message }
  if (scriptHotReloadState.activePlan?.id === plan.id) {
    scriptHotReloadState.activePlan = null
    scriptHotReloadState.restartRequired = plan.classification === 'restart-required'
  }
}

function peekHotReloadRollback(scriptUuid: string): { source: string; historyId: string | null } | null {
  const source = scriptHotReloadState.rollbackSources[scriptUuid]
  if (source === undefined) return null
  const latest = scriptHotReloadState.history.find(/* 先计算 item.scriptUuid === scriptUuid；仅当其为真值时求右侧 item.status === 'committed'，返回短路求值结果。 */ item => item.scriptUuid === scriptUuid && item.status === 'committed')
  return { source, historyId: latest?.id ?? null }
}

function completeHotReloadRollback(historyId: string | null): void {
  const entry = scriptHotReloadState.history.find(/* 先计算 item.id === historyId；仅当其为真值时求右侧 item.status === 'committed'，返回短路求值结果。 */ item => item.id === historyId && item.status === 'committed')
  if (entry) { entry.status = 'rolled-back'; entry.completedAt = new Date().toISOString(); entry.message = `Rolled back to ${entry.previousHash}.` }
}

function rollbackHotReload(scriptUuid: string): string | null {
  const rollback = peekHotReloadRollback(scriptUuid)
  if (!rollback) return null
  completeHotReloadRollback(rollback.historyId)
  delete scriptHotReloadState.rollbackSources[scriptUuid]
  return rollback.source
}

function hotReloadHistory(scriptUuid?: string): HotReloadHistoryEntry[] {
  return scriptHotReloadState.history.filter(/* 先计算 !scriptUuid；仅当其为假值时求右侧 item.scriptUuid === scriptUuid，返回短路求值结果。 */ item => !scriptUuid || item.scriptUuid === scriptUuid).map(/** 构造并返回记录 { ...item, reasons: [...item.reasons], transfer: item.transfer.map(change => ({ ...change })) }，字段按当前实参及捕获状态求值。 */ item => ({ ...item, reasons: [...item.reasons], transfer: item.transfer.map(/** 构造并返回记录 { ...change }，字段按当前实参及捕获状态求值。 */ change => ({ ...change })) }))
}

function clearHotReloadSession(): void {
  scriptHotReloadState.activePlan = null
  scriptHotReloadState.restartRequired = false
  scriptHotReloadState.rollbackSources = {}
}
  this.prepareHotReload=prepareHotReload
  this.commitHotReload=commitHotReload
  this.rejectHotReload=rejectHotReload
  this.peekHotReloadRollback=peekHotReloadRollback
  this.completeHotReloadRollback=completeHotReloadRollback
  this.rollbackHotReload=rollbackHotReload
  this.hotReloadHistory=hotReloadHistory
  this.clearHotReloadSession=clearHotReloadSession
 }
}
