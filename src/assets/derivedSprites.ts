import type { AssetRecord } from './types'
import { resolveInterchangeTexture } from './interchangeBindings'

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
export interface SpriteDefinition { name: string; sprite: DerivedSprite; durationMs: number }
export const DERIVED_SPRITE_LIMITS = Object.freeze({ count: 4096, dimension: 8192, pixels: 16 * 1024 * 1024 })
const reference = /^asset:\/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const fail = (message: string): never => { throw new Error(`SPRITE_DERIVATION: ${message}`) }
const integer = (value: unknown, minimum: number = 0, maximum: number = DERIVED_SPRITE_LIMITS.dimension): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > maximum) return fail('Expected bounded whole-pixel geometry.')
  return value
}

/** Reject malformed persisted metadata rather than silently clipping a different sprite. */
export function validateDerivedSprite(value: unknown): DerivedSprite | undefined {
  if (value === undefined) return undefined
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('Invalid derived sprite metadata.')
  const v = value as DerivedSprite
  if (v.version !== 1 || !reference.test(v.ownerAsset) || !reference.test(v.textureAsset) || typeof v.sourceKey !== 'string' || !v.sourceKey || v.sourceKey.length > 512 || typeof v.rotated !== 'boolean') return fail('Invalid source identity or version.')
  const frame = { x: integer(v.frame?.x), y: integer(v.frame?.y), width: integer(v.frame?.width, 1), height: integer(v.frame?.height, 1) }
  const sourceSize = { width: integer(v.sourceSize?.width, 1), height: integer(v.sourceSize?.height, 1) }
  const trimOffset = { x: integer(v.trimOffset?.x), y: integer(v.trimOffset?.y) }
  if (sourceSize.width * sourceSize.height > DERIVED_SPRITE_LIMITS.pixels || trimOffset.x + (v.rotated ? frame.height : frame.width) > sourceSize.width || trimOffset.y + (v.rotated ? frame.width : frame.height) > sourceSize.height) return fail('Trimmed pixels exceed the original frame or decode budget.')
  if (![v.importedPivot?.x, v.importedPivot?.y].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)) return fail('Invalid normalized pivot.')
  return { version: 1, ownerAsset: v.ownerAsset.toLowerCase(), sourceKey: v.sourceKey, textureAsset: v.textureAsset.toLowerCase(), frame, sourceSize, trimOffset, rotated: v.rotated, importedPivot: { ...v.importedPivot } }
}

export function spriteDefinitions(owner: AssetRecord, records: readonly AssetRecord[]): SpriteDefinition[] {
  if (owner.derivedSprite) return fail('Slice the original source, not another derived sprite.')
  const ownerAsset = `asset://${owner.uuid}`, result: SpriteDefinition[] = []
  if (owner.assetType === 'image') {
    const sheet = owner.settings.spriteSheet
    const columns = integer(sheet.columns, 1, 256), rows = integer(sheet.rows, 1, 256), margin = integer(sheet.margin), spacing = integer(sheet.spacing)
    if (columns * rows > DERIVED_SPRITE_LIMITS.count) return fail('A sheet may produce at most4096 sprites.')
    integer(owner.width, 1); integer(owner.height, 1)
    const width = Math.floor((owner.width - margin * 2 - spacing * (columns - 1)) / columns), height = Math.floor((owner.height - margin * 2 - spacing * (rows - 1)) / rows)
    integer(width, 1); integer(height, 1)
    const stem = owner.name.replace(/\.[^.]+$/, '')
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) result.push({
      name: `${stem}_${String(row * columns + column).padStart(3, '0')}.png`, durationMs: 0,
      sprite: { version: 1, ownerAsset, sourceKey: `grid:${row}:${column}`, textureAsset: ownerAsset,
        frame: { x: margin + column * (width + spacing), y: margin + row * (height + spacing), width, height }, sourceSize: { width, height }, trimOffset: { x: 0, y: 0 }, rotated: false, importedPivot: { ...owner.settings.pivot } }
    })
  } else if (owner.assetType === 'atlas' && owner.interchange) {
    const binding = resolveInterchangeTexture(owner, records)
    if (!binding.reference || binding.diagnostics.length) return fail(binding.diagnostics.map(v => v.message).join('\n') || 'Assign an atlas image before extracting sprites.')
    if (owner.interchange.slices.length > DERIVED_SPRITE_LIMITS.count) return fail('Materialize at most4096 atlas sprites at a time.')
    for (const slice of [...owner.interchange.slices].sort((a, b) => (a.sourceIndex ?? 0) - (b.sourceIndex ?? 0))) result.push({ name: slice.name.replace(/\.[^.]+$/, '') + '.png', durationMs: slice.durationMs,
      sprite: { version: 1, ownerAsset, sourceKey: `slice:${slice.id}`, textureAsset: binding.reference, frame: { ...slice.frame }, sourceSize: { ...slice.sourceSize }, trimOffset: { ...(slice.trimOffset ?? { x: 0, y: 0 }) }, rotated: slice.rotated, importedPivot: { ...slice.pivot } } })
  } else return fail('Only image sheets and imported atlas documents produce sprite frames.')
  const keys = new Set<string>()
  for (const definition of result) {
    definition.sprite = validateDerivedSprite(definition.sprite)!
    if (keys.has(definition.sprite.sourceKey)) return fail('Duplicate source frame identity.')
    keys.add(definition.sprite.sourceKey)
    const texture = records.find(v => `asset://${v.uuid}` === definition.sprite.textureAsset)
    const image = definition.sprite.textureAsset === ownerAsset ? owner : texture
    const frame = definition.sprite.frame
    if (!image || image.assetType !== 'image' || image.derivedSprite || frame.x + frame.width > image.width || frame.y + frame.height > image.height) return fail('Frame pixels lie outside the referenced source image.')
  }
  return result
}

/** Detached update plans preserve child UUID/path/name and independent import-setting edits. */
export function prepareDerivedSpriteRefresh(candidate: AssetRecord, records: readonly AssetRecord[]): Array<{ record: AssetRecord; sprite: DerivedSprite }> {
  const live = records.map(v => v.uuid === candidate.uuid ? candidate : v), reference = `asset://${candidate.uuid}`
  const owners = new Set(records.filter(v => v.derivedSprite && (v.derivedSprite.ownerAsset === reference || v.derivedSprite.textureAsset === reference)).map(v => v.derivedSprite!.ownerAsset))
  const plans: Array<{ record: AssetRecord; sprite: DerivedSprite }> = []
  for (const ownerRef of owners) {
    const owner = live.find(v => `asset://${v.uuid}` === ownerRef)
    if (!owner) return fail('A derived sprite owner is missing.')
    const definitions = new Map(spriteDefinitions(owner, live).map(v => [v.sprite.sourceKey, v.sprite]))
    for (const record of records.filter(v => v.derivedSprite?.ownerAsset === ownerRef)) {
      const sprite = definitions.get(record.derivedSprite!.sourceKey)
      if (!sprite) return fail(`${record.path}: the replacement removed this frame. Delete or restore the dependent frame before reimporting.`)
      const local = record.settings.spriteRegion
      if (local && (![local.x, local.y, local.width, local.height].every(Number.isFinite) || local.x < 0 || local.y < 0 || local.width <= 0 || local.height <= 0 || local.x + local.width > sprite.sourceSize.width || local.y + local.height > sprite.sourceSize.height)) return fail(`${record.path}: the authored crop no longer fits the replacement.`)
      plans.push({ record, sprite })
    }
  }
  return plans
}

export function applyDerivedSprite(record: AssetRecord, sprite: DerivedSprite): void {
  const previous = record.derivedSprite
  if (!previous || (record.settings.pivot.x === previous.importedPivot.x && record.settings.pivot.y === previous.importedPivot.y)) record.settings.pivot = { ...sprite.importedPivot }
  record.derivedSprite = sprite; record.width = sprite.sourceSize.width; record.height = sprite.sourceSize.height
}
