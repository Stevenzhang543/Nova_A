/** 组件输入校验：在写入前检查字段原始类型、枚举和嵌套有限数值，保留关节无限阈值约定。 */
import {componentEnumValues} from './componentEnums'
import {componentPrimitiveTypes} from './componentPrimitiveTypes'

/** Validate a whole candidate before its component owner assigns any field. */
/** 先检查已登记类型和枚举，再迭代遍历嵌套值拒绝非法数值；仅关节断裂阈值允许约定的无限值。 */ export function validateComponentValues(kind: string, values: Record<string, unknown>, path = kind): void {
  const primitives = Object.prototype.hasOwnProperty.call(componentPrimitiveTypes, kind) ? componentPrimitiveTypes[kind] : undefined
  for (const [field, value] of Object.entries(values)) {
    const allowed = primitives && Object.prototype.hasOwnProperty.call(primitives, field) ? primitives[field] : undefined
    if (!allowed || value === undefined) continue // Partial patches may explicitly omit a value.
    if (value === null && kind.endsWith('Joint2D') && (field === 'breakForce' || field === 'breakTorque')) continue
    const actual = value === null ? 'null' : typeof value
    if (!allowed.includes(actual)) throw new Error(`${path}.${field}: expected ${allowed.filter(/* 比较 type 与 'undefined'，返回严格不等的判断结果。 */ type => type !== 'undefined').join(' or ')}.`)
  }
  for (const [field, allowed] of Object.entries(Object.prototype.hasOwnProperty.call(componentEnumValues, kind) ? componentEnumValues[kind] : {})) {
    const value = values[field]
    if (value !== undefined && (typeof value !== 'string' || !allowed.includes(value))) {
      throw new Error(`${path}.${field}: expected one of ${allowed.join(', ')}.`)
    }
  }
  const pending = Object.entries(values).map(/** 构造并返回记录 {value, path: `${path}.${field}`, unlimited: kind.endsWith('Joint2D') && (field === 'breakForce' || field === 'breakTorque')}，字段按当前实参及捕获状态求值。 */ ([field, value]) => ({value, path: `${path}.${field}`, unlimited: kind.endsWith('Joint2D') && (field === 'breakForce' || field === 'breakTorque')}))
  const seen = new WeakSet<object>()
  while (pending.length) {
    const current = pending.pop()!
    if (typeof current.value === 'number' && !Number.isFinite(current.value) && !(current.unlimited && current.value === Number.POSITIVE_INFINITY)) {
      throw new Error(`${current.path}: expected a finite number.`)
    }
    if (current.value && typeof current.value === 'object' && !seen.has(current.value)) {
      seen.add(current.value)
      for (const [key, value] of Object.entries(current.value)) pending.push({value, path: `${current.path}.${key}`, unlimited: false})
    }
  }
}
