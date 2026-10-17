/** 单一字段级契约入口：由生成式字段描述派生出稳定的字段契约，不建立并行表。
 * 约定：字段 id 等于序列化字段名，一经发布不得改名。
 * 只暴露源码可证明的事实（允许类型、TS 可选性、字面量默认值）；范围/单位/控件/i18n 属于策展层，不在此处猜测。 */
import type { ComponentKind } from './components'
import { componentFieldDescriptions } from './componentFieldDescriptions'

/** 允许的原始类型名，与生成式契约保持同一套词汇。 */
export type ComponentFieldPrimitive = 'boolean' | 'number' | 'string' | string

export interface ComponentFieldDescriptor {
  /** 稳定字段 id；等于项目文档中的序列化字段名。 */
  readonly id: string
  readonly kind: string
  /** 该字段允许的原始类型集合，直接来自生成式契约。 */
  readonly types: readonly ComponentFieldPrimitive[]
  /** 该字段在组件类中以 TS 可选属性（`?`）声明。 */
  readonly optional: boolean
  /** 源码中的字面量默认值；无法静态判定时为 undefined，不推测。 */
  readonly defaultValue?: string | number | boolean | null
  /** 生成式契约中已声明该字段。 */
  readonly declared: true
}

const index: ReadonlyMap<string, readonly ComponentFieldDescriptor[]> = new Map(
  Object.entries(componentFieldDescriptions).map(/** 为每个种类建立稳定排序后的字段契约列表。 */ ([kind, fields]) => [
    kind,
    Object.entries(fields)
      .map(/** 构造单个字段契约并冻结，避免调用方改写共享契约。 */ ([id, description]) => Object.freeze({
        id,
        kind,
        types: Object.freeze([...description.types]),
        optional: description.optional,
        defaultValue: description.default,
        declared: true as const,
      }))
      .sort(/** 以字段 id 的序关系排序，保证跨平台稳定。 */ (left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)),
  ]),
)

/** 返回该种类的字段契约；未声明字段的种类返回空列表，而不是抛出。 */
export function componentFields(kind: ComponentKind | string): readonly ComponentFieldDescriptor[] {
  return index.get(kind) ?? []
}

/** 按种类与字段 id 查询单个契约；未声明时返回 undefined。 */
export function componentField(kind: ComponentKind | string, id: string): ComponentFieldDescriptor | undefined {
  return componentFields(kind).find(/** 比较候选字段 id 与目标 id，返回严格相等的判断结果。 */ field => field.id === id)
}

/** 已具备字段级契约的种类数量，供覆盖率报告使用。 */
export function componentFieldKindCount(): number {
  return index.size
}
