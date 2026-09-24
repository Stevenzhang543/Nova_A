/** 导入配置应用：将已选择的纹理或音频配置写入资源导入设置。 */
import type { AssetImportSettings, AudioImportProfile, TextureImportProfile } from './types'

/** Applies documented, explicit texture defaults. Users can still override every
 * field after choosing a profile; no renderer behavior remains implicit. */
/** 按像素画、UI、法线或通用用途应用过滤、压缩、颜色空间、图集、透明和 mipmap 默认设置。 */ export function applyTextureImportProfile(settings: AssetImportSettings, profile: TextureImportProfile): void {
  settings.textureProfile = profile
  if (profile === 'PixelArt') Object.assign(settings, { filterMode: 'Nearest', compression: 'Lossless', colorSpace: 'sRGB', atlas: true, generateMipmaps: false, transparency: 'Preserve' })
  else if (profile === 'UI') Object.assign(settings, { filterMode: 'Linear', compression: 'Lossless', colorSpace: 'sRGB', atlas: true, generateMipmaps: false, transparency: 'Premultiply' })
  else if (profile === 'NormalMap') Object.assign(settings, { filterMode: 'Linear', compression: 'Lossless', colorSpace: 'Linear', atlas: false, generateMipmaps: true, transparency: 'Discard' })
  else Object.assign(settings, { filterMode: 'Linear', compression: 'Optimized', colorSpace: 'sRGB', atlas: true, generateMipmaps: true, transparency: 'Preserve' })
}

/** Audio profiles define import/streaming intent while retaining explicit codec,
 * quality, trimming, normalization, and loop controls. */
/** 按音乐、语音、流式或音效用途配置音频编码、质量、归一化及流式默认值。 */ export function applyAudioImportProfile(settings: AssetImportSettings, profile: AudioImportProfile): void {
  settings.audioSettings.profile = profile
  if (profile === 'Music') Object.assign(settings.audioSettings, { streaming: true, codec: 'Vorbis', quality: .82, normalize: true, targetPeakDb: -1 })
  else if (profile === 'Voice') Object.assign(settings.audioSettings, { streaming: false, codec: 'Vorbis', quality: .7, normalize: true, targetPeakDb: -3 })
  else if (profile === 'Streaming') Object.assign(settings.audioSettings, { streaming: true, codec: 'Original', quality: .8, normalize: false })
  else Object.assign(settings.audioSettings, { streaming: false, codec: 'PCM', quality: 1, normalize: false })
}

/* 调用 [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))].slice(0, 16) 并返回调用结果。 */ export function normalizedFontFallbacks(value: string): string[] {
  return [...new Set(value.split(',').map(/* 调用 item.trim() 并返回调用结果。 */ item => item.trim()).filter(Boolean))].slice(0, 16)
}
