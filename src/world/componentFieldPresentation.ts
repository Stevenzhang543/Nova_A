/** 字段呈现层：把字段契约映射为编辑器控件与分组。
 * 设计原则：能由类型或既有登记表推导的，一律推导；需要人工判断的数值范围/单位/步进**不在此处编造**。
 * 数值边界必须来自真实源码证据（默认值、构造器约束、校验代码），否则留空由后续策展步骤补齐。 */
import type { ComponentFieldDescriptor } from './componentFieldSchema'
import { componentDescriptor } from './componentRegistry'

/** 编辑器可用的字段控件种类。 */
export type ComponentFieldControl = 'toggle' | 'number' | 'text' | 'asset' | 'entity'

/** 由字段名后缀判断资源引用与实体引用，避免把引用当作自由文本编辑。 */
const ASSET_SUFFIX = /Asset$|AssetUuid$/
const ENTITY_SUFFIX = /Uuid$|TargetUuid$/

/** 依据声明类型与命名推导控件；顺序即优先级，布尔优先于命名后缀。 */
export function componentFieldControl(field: ComponentFieldDescriptor): ComponentFieldControl {
  if (field.types.includes('boolean')) return 'toggle'
  if (ENTITY_SUFFIX.test(field.id)) return 'entity'
  if (ASSET_SUFFIX.test(field.id)) return 'asset'
  if (field.types.includes('number')) return 'number'
  return 'text'
}

/** 分组直接采用既有登记表的类目，避免再维护一套分组表。 */
export function componentFieldGroup(kind: string): string {
  return componentDescriptor(kind as never)?.category ?? 'Other'
}

/** 该字段是否应被视为可显示在 Inspector 中的值（未知类型不进入）。 */
export function isPresentableField(field: ComponentFieldDescriptor): boolean {
  return field.types.some(/** 只接受已登记的原始类型。 */ type => ['boolean', 'number', 'string'].includes(type))
}
