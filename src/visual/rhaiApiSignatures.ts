/** 读取生成的 Rhai 签名目录，为查询与编辑器调用模板提供同一份注册信息。 */
import inventory from './rhaiApiSignatures.generated.json'

export type RhaiApiType = 'int' | 'float' | 'bool' | 'string' | 'char' | 'array' | 'map' | 'dynamic' | 'unit' | 'fn' | 'range' | 'timestamp' | 'blob' | 'opaque'
export interface RhaiApiParameter { name: string; type: RhaiApiType; rustType: string; defaultLiteral: string | null; optional: boolean; mutable: boolean }
export interface RhaiApiSignature {
  id: string; name: string; parameters: RhaiApiParameter[]; returnType: RhaiApiType; rustReturnType: string
  role: 'callable' | 'lifecycle'; origin: 'host' | 'standard-package' | 'intrinsic'; package: string | null
  source: { path: string; line: number }; available: boolean; internal: boolean; operator: boolean; variadic: boolean; throws: boolean
  profiles: Array<'native' | 'wasm'>; documentation: string
}
export const RHAI_API_SIGNATURES: readonly RhaiApiSignature[] = inventory.signatures as RhaiApiSignature[]
export const RHAI_API_PACKAGES = inventory.packages
export const RHAI_API_INVENTORY = inventory
/** Returns registered overloads, including explicit disabled/internal entries. */
/** 按可选名称筛选注册签名；保留禁用和内部条目供诊断完整查询。 */
export function getRhaiApiSignatures(name?: string): readonly RhaiApiSignature[] { return name ? RHAI_API_SIGNATURES.filter(/** 精确匹配函数名并保留所有重载。 */ item => item.name === name) : RHAI_API_SIGNATURES }
/** Placeholder literals are editor insertion values, never optional arguments. */
/** 仅为全部参数有可插入字面量的公开调用生成模板；占位值不代表可省略参数。 */
export function rhaiApiCallTemplate(signature: RhaiApiSignature): string | null {
  if (!signature.available || signature.internal || signature.operator || signature.role !== 'callable' || signature.parameters.some(/** 检查是否存在必须由有效生产节点提供的实参。 */ /** 按注册参数次序提取插入用字面量。 */ parameter => parameter.defaultLiteral === null)) return null
  return `${signature.name}(${signature.parameters.map(/** 按注册参数次序提取插入用字面量。 */ parameter => parameter.defaultLiteral).join(', ')})`
}
