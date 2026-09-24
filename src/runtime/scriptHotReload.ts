/** 脚本热重载：比较候选脚本与当前实例，保留兼容状态并协调重载队列。 */
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

let planSerial = 0

/** 计算源码快速变化摘要以关联热重载前后版本。 */ function sourceHash(source: string): string {
  let hash = 2166136261
  for (const character of source) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0
  return hash.toString(16).padStart(8, '0')
}

/** 在热重载历史头部插入记录并保留最近二百条。 */ function append(entry: HotReloadHistoryEntry): void {
  scriptHotReloadState.history.unshift(entry)
  if (scriptHotReloadState.history.length > 200) scriptHotReloadState.history.splice(200)
}

/** 分析候选脚本并比较导出属性类型与生命周期，形成保留、初始化或删除计划及兼容性分类。 */ export function prepareHotReload(
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

/** 保存旧文档供回滚，将对应历史标记为已提交并清除匹配的活动计划。 */ export function commitHotReload(plan: HotReloadPlan, previousDocument = plan.previousSource): void {
  scriptHotReloadState.rollbackSources[plan.scriptUuid] = previousDocument
  const entry = scriptHotReloadState.history.find(/* 比较 item.id 与 plan.id，返回严格相等的判断结果。 */ item => item.id === plan.id)
  if (entry) { entry.status = 'committed'; entry.completedAt = new Date().toISOString(); entry.message = `Committed ${plan.candidateHash}; rollback ${plan.previousHash} retained.` }
  if (scriptHotReloadState.activePlan?.id === plan.id) {
    scriptHotReloadState.activePlan = null
    scriptHotReloadState.restartRequired = false
  }
}

/** 将计划标记拒绝并记录原因，清除活动计划但保留需要重启的提示状态。 */ export function rejectHotReload(plan: HotReloadPlan, message: string): void {
  const entry = scriptHotReloadState.history.find(/* 比较 item.id 与 plan.id，返回严格相等的判断结果。 */ item => item.id === plan.id)
  if (entry) { entry.status = 'rejected'; entry.completedAt = new Date().toISOString(); entry.message = message }
  if (scriptHotReloadState.activePlan?.id === plan.id) {
    scriptHotReloadState.activePlan = null
    scriptHotReloadState.restartRequired = plan.classification === 'restart-required'
  }
}

/** 读取旧文档和最近已提交历史身份，不修改回滚缓存。 */ export function peekHotReloadRollback(scriptUuid: string): { source: string; historyId: string | null } | null {
  const source = scriptHotReloadState.rollbackSources[scriptUuid]
  if (source === undefined) return null
  const latest = scriptHotReloadState.history.find(/* 先计算 item.scriptUuid === scriptUuid；仅当其为真值时求右侧 item.status === 'committed'，返回短路求值结果。 */ item => item.scriptUuid === scriptUuid && item.status === 'committed')
  return { source, historyId: latest?.id ?? null }
}

/** 将匹配的已提交历史标记为已回滚并记录完成时间。 */ export function completeHotReloadRollback(historyId: string | null): void {
  const entry = scriptHotReloadState.history.find(/* 先计算 item.id === historyId；仅当其为真值时求右侧 item.status === 'committed'，返回短路求值结果。 */ item => item.id === historyId && item.status === 'committed')
  if (entry) { entry.status = 'rolled-back'; entry.completedAt = new Date().toISOString(); entry.message = `Rolled back to ${entry.previousHash}.` }
}

/** 取出回滚源码、更新历史并删除缓存，返回需由调用方恢复的文档。 */ export function rollbackHotReload(scriptUuid: string): string | null {
  const rollback = peekHotReloadRollback(scriptUuid)
  if (!rollback) return null
  completeHotReloadRollback(rollback.historyId)
  delete scriptHotReloadState.rollbackSources[scriptUuid]
  return rollback.source
}

/** 按可选脚本身份过滤历史，复制原因和属性转移列表后返回。 */ export function hotReloadHistory(scriptUuid?: string): HotReloadHistoryEntry[] {
  return scriptHotReloadState.history.filter(/* 先计算 !scriptUuid；仅当其为假值时求右侧 item.scriptUuid === scriptUuid，返回短路求值结果。 */ item => !scriptUuid || item.scriptUuid === scriptUuid).map(/** 构造并返回记录 { ...item, reasons: [...item.reasons], transfer: item.transfer.map(change => ({ ...change })) }，字段按当前实参及捕获状态求值。 */ item => ({ ...item, reasons: [...item.reasons], transfer: item.transfer.map(/** 构造并返回记录 { ...change }，字段按当前实参及捕获状态求值。 */ change => ({ ...change })) }))
}

/** Rollback source belongs to the running session; retain only metadata afterwards. */
/** 清除活动计划、重启提示和回滚源码，但保留历史记录。 */ export function clearHotReloadSession(): void {
  scriptHotReloadState.activePlan = null
  scriptHotReloadState.restartRequired = false
  scriptHotReloadState.rollbackSources = {}
}
