/** Runtime graph hot-reload compatibility and stable value comparison; no catalog or editor initialization. */
import { parseGraphDocument, type GraphValue, type NovaGraphDocument } from './graphTypes'

export interface GraphHotReloadPlan { compatible: boolean; reasons: string[]; preserved: Record<string, GraphValue>; initialized: string[]; dropped: string[] }

/* 根据 a < b 的真假，分别返回 -1 或 a > b ? 1 : 0。 */ export function ordinal(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0 }

/** 递归按键排序对象，保留数组顺序，生成用于稳定比较的值结构。 */ function stableObject(value: unknown): unknown { if (Array.isArray(value)) return value.map(stableObject); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(/* 调用 ordinal(a, b) 并返回调用结果。 */ ([a], [b]) => ordinal(a, b)).map(/* 返回按声明顺序构造的数组 [key, stableObject(item)]。 */ ([key, item]) => [key, stableObject(item)])); return value }
/* 调用 JSON.stringify(stableObject(value)) 并返回调用结果。 */ export function stable(value: unknown): string { return JSON.stringify(stableObject(value)) }

/** 按 UUID 与类型和序列化生命周期保留兼容变量状态；列出新增、移除和公共例程签名变化作为重载判断依据。 */ export function planGraphHotReload(previousInput: NovaGraphDocument | string, candidateInput: NovaGraphDocument | string, state: Record<string, GraphValue>): GraphHotReloadPlan {
  const previous = typeof previousInput === 'string' ? parseGraphDocument(previousInput) : previousInput, candidate = typeof candidateInput === 'string' ? parseGraphDocument(candidateInput) : candidateInput, reasons: string[] = [], preserved: Record<string, GraphValue> = {}, initialized: string[] = [], dropped: string[] = [], before = new Map(previous.variables.map(/* 返回按声明顺序构造的数组 [item.uuid, item]。 */ item => [item.uuid, item]))
  for (const variable of candidate.variables) { const old = before.get(variable.uuid); if (old && old.valueType === variable.valueType && old.serialized === variable.serialized) preserved[variable.name] = state[old.name] ?? old.defaultValue; else { initialized.push(variable.name); if (old) reasons.push(`Variable ${variable.name} changed type or lifetime.`) } }
  for (const variable of previous.variables) if (!candidate.variables.some(/* 比较 item.uuid 与 variable.uuid，返回严格相等的判断结果。 */ item => item.uuid === variable.uuid)) { dropped.push(variable.name); if (variable.serialized) reasons.push(`Serialized variable ${variable.name} was removed.`) }
  const previousRoutines = new Map(previous.routines.map(/* 返回按声明顺序构造的数组 [item.uuid, item]。 */ item => [item.uuid, item]))
  for (const routine of candidate.routines) { const old = previousRoutines.get(routine.uuid); if (old && stable({ inputs: old.inputs, outputs: old.outputs, kind: old.kind }) !== stable({ inputs: routine.inputs, outputs: routine.outputs, kind: routine.kind })) reasons.push(`Routine ${routine.name} changed its public signature.`) }
  return { compatible: reasons.length === 0, reasons: reasons.length ? reasons : ['Stable identities and serialized variable layouts are compatible.'], preserved, initialized, dropped }
}
