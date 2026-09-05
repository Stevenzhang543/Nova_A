import { assetState, createTextAsset, resolveAsset } from './AssetDatabase'
import type { AssetRecord } from './types'
import { spriteDefinitions } from './derivedSprites'
import { defaultAnimationClip } from '../runtime/animation'

/** Explicit second transaction: extracting frames never attaches an animation to a scene object. */
export function createSpriteFrameAnimation(owner: AssetRecord): AssetRecord {
  if (resolveAsset(owner.uuid) !== owner) throw new Error('SPRITE_ANIMATION: The source is no longer in this project.')
  const definitions = spriteDefinitions(owner, assetState.records)
  if (!definitions.length) throw new Error('SPRITE_ANIMATION: The source contains no frames.')
  const frames = definitions.map(definition => {
    const matches = assetState.records.filter(asset => asset.derivedSprite?.ownerAsset === 'asset://' + owner.uuid && asset.derivedSprite.sourceKey === definition.sprite.sourceKey)
    if (matches.length !== 1) throw new Error('SPRITE_ANIMATION: Extract the source frames first; missing or duplicate frame ' + definition.name)
    return { spriteAsset: 'asset://' + matches[0].uuid, duration: definition.durationMs > 0 ? definition.durationMs / 1000 : 1 / 12 }
  })
  const name = owner.name.replace(/\.[^.]+$/, '') + ' Animation'
  return createTextAsset(name, 'animation', JSON.stringify({ ...defaultAnimationClip(name), spriteFrames: frames }, null, 2), 'Assets/Animations')
}
