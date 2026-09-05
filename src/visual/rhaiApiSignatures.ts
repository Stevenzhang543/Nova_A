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
export function getRhaiApiSignatures(name?: string): readonly RhaiApiSignature[] { return name ? RHAI_API_SIGNATURES.filter(item => item.name === name) : RHAI_API_SIGNATURES }
/** Placeholder literals are editor insertion values, never optional arguments. */
export function rhaiApiCallTemplate(signature: RhaiApiSignature): string | null {
  if (!signature.available || signature.internal || signature.operator || signature.role !== 'callable' || signature.parameters.some(parameter => parameter.defaultLiteral === null)) return null
  return `${signature.name}(${signature.parameters.map(parameter => parameter.defaultLiteral).join(', ')})`
}
