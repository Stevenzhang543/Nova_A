/** 精灵帧动画创建：把已导入的帧与区域信息转换为动画资源。 */
import { assetState, createTextAsset, resolveAsset } from './AssetDatabase'
import type { AssetRecord } from './types'
import { spriteDefinitions } from './derivedSprites'
import { defaultAnimationClip } from '../runtime/animation'

/** Explicit second transaction: extracting frames never attaches an animation to a scene object. */
/** 确认来源仍属于当前项目且所有导出帧唯一存在，再按来源帧时长生成精灵帧动画资源。 */ export function createSpriteFrameAnimation(owner: AssetRecord): AssetRecord {
  if (resolveAsset(owner.uuid) !== owner) throw new Error('SPRITE_ANIMATION: The source is no longer in this project.')
  const definitions = spriteDefinitions(owner, assetState.records)
  if (!definitions.length) throw new Error('SPRITE_ANIMATION: The source contains no frames.')
  const frames = definitions.map(/** 按来源身份和帧键查找唯一派生精灵，缺失或重复则拒绝，缺少帧时长时使用十二帧每秒。 */ definition => {
    const matches = assetState.records.filter(/** 同时匹配派生精灵的拥有资源和稳定来源帧键。 */ asset => asset.derivedSprite?.ownerAsset === 'asset://' + owner.uuid && asset.derivedSprite.sourceKey === definition.sprite.sourceKey)
    if (matches.length !== 1) throw new Error('SPRITE_ANIMATION: Extract the source frames first; missing or duplicate frame ' + definition.name)
    return { spriteAsset: 'asset://' + matches[0].uuid, duration: definition.durationMs > 0 ? definition.durationMs / 1000 : 1 / 12 }
  })
  const name = owner.name.replace(/\.[^.]+$/, '') + ' Animation'
  return createTextAsset(name, 'animation', JSON.stringify({ ...defaultAnimationClip(name), spriteFrames: frames }, null, 2), 'Assets/Animations')
}
