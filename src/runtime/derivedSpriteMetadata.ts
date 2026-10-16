/** Original persisted DerivedSprite validation; authoring extraction stays in assets/derivedSprites. */


export interface DerivedSprite {
  version: 1
  ownerAsset: string
  sourceKey: string
  textureAsset: string
  frame: { x: number; y: number; width: number; height: number }
  sourceSize: { width: number; height: number }
  trimOffset: { x: number; y: number }
  rotated: boolean
  importedPivot: { x: number; y: number }
}

export const DERIVED_SPRITE_LIMITS = Object.freeze({ count: 4096, dimension: 8192, pixels: 16 * 1024 * 1024 })

export const reference = /^asset:\/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const fail = /** 抛出带精灵派生错误前缀的具体校验消息。 */ (message: string): never => { throw new Error(`SPRITE_DERIVATION: ${message}`) }

export const integer = /** 要求输入为指定范围内的安全整数像素值，非法值进入统一派生错误。 */ (value: unknown, minimum: number = 0, maximum: number = DERIVED_SPRITE_LIMITS.dimension): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > maximum) return fail('Expected bounded whole-pixel geometry.')
  return value
}


/** Reject malformed persisted metadata rather than silently clipping a different sprite. */
/** 检查稳定引用、帧几何、旋转裁剪和归一化轴心，限制像素预算后返回规范元信息。 */ export function validateDerivedSprite(value: unknown): DerivedSprite | undefined {
  if (value === undefined) return undefined
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('Invalid derived sprite metadata.')
  const v = value as DerivedSprite
  if (v.version !== 1 || !reference.test(v.ownerAsset) || !reference.test(v.textureAsset) || typeof v.sourceKey !== 'string' || !v.sourceKey || v.sourceKey.length > 512 || typeof v.rotated !== 'boolean') return fail('Invalid source identity or version.')
  const frame = { x: integer(v.frame?.x), y: integer(v.frame?.y), width: integer(v.frame?.width, 1), height: integer(v.frame?.height, 1) }
  const sourceSize = { width: integer(v.sourceSize?.width, 1), height: integer(v.sourceSize?.height, 1) }
  const trimOffset = { x: integer(v.trimOffset?.x), y: integer(v.trimOffset?.y) }
  if (sourceSize.width * sourceSize.height > DERIVED_SPRITE_LIMITS.pixels || trimOffset.x + (v.rotated ? frame.height : frame.width) > sourceSize.width || trimOffset.y + (v.rotated ? frame.width : frame.height) > sourceSize.height) return fail('Trimmed pixels exceed the original frame or decode budget.')
  if (![v.importedPivot?.x, v.importedPivot?.y].every(/* 先计算 typeof n === 'number' && Number.isFinite(n) && n >= 0；仅当其为真值时求右侧 n <= 1，返回短路求值结果。 */ n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)) return fail('Invalid normalized pivot.')
  return { version: 1, ownerAsset: v.ownerAsset.toLowerCase(), sourceKey: v.sourceKey, textureAsset: v.textureAsset.toLowerCase(), frame, sourceSize, trimOffset, rotated: v.rotated, importedPivot: { ...v.importedPivot } }
}
