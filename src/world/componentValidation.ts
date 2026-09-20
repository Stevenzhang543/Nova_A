import {componentEnumValues} from './componentEnums'
import {componentPrimitiveTypes} from './componentPrimitiveTypes'

/** Validate a whole candidate before its component owner assigns any field. */
export function validateComponentValues(kind: string, values: Record<string, unknown>, path = kind): void {
  const primitives = Object.prototype.hasOwnProperty.call(componentPrimitiveTypes, kind) ? componentPrimitiveTypes[kind] : undefined
  for (const [field, value] of Object.entries(values)) {
    const allowed = primitives && Object.prototype.hasOwnProperty.call(primitives, field) ? primitives[field] : undefined
    if (!allowed || value === undefined) continue // Partial patches may explicitly omit a value.
    if (value === null && kind.endsWith('Joint2D') && (field === 'breakForce' || field === 'breakTorque')) continue
    const actual = value === null ? 'null' : typeof value
    if (!allowed.includes(actual)) throw new Error(`${path}.${field}: expected ${allowed.filter(type => type !== 'undefined').join(' or ')}.`)
  }
  for (const [field, allowed] of Object.entries(Object.prototype.hasOwnProperty.call(componentEnumValues, kind) ? componentEnumValues[kind] : {})) {
    const value = values[field]
    if (value !== undefined && (typeof value !== 'string' || !allowed.includes(value))) {
      throw new Error(`${path}.${field}: expected one of ${allowed.join(', ')}.`)
    }
  }
  const pending = Object.entries(values).map(([field, value]) => ({value, path: `${path}.${field}`, unlimited: kind.endsWith('Joint2D') && (field === 'breakForce' || field === 'breakTorque')}))
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
