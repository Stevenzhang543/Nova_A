import type { AssetImportSettings, AudioImportProfile, TextureImportProfile } from './types'

/** Applies documented, explicit texture defaults. Users can still override every
 * field after choosing a profile; no renderer behavior remains implicit. */
export function applyTextureImportProfile(settings: AssetImportSettings, profile: TextureImportProfile): void {
  settings.textureProfile = profile
  if (profile === 'PixelArt') Object.assign(settings, { filterMode: 'Nearest', compression: 'Lossless', colorSpace: 'sRGB', atlas: true })
  else if (profile === 'UI') Object.assign(settings, { filterMode: 'Linear', compression: 'Lossless', colorSpace: 'sRGB', atlas: true })
  else if (profile === 'NormalMap') Object.assign(settings, { filterMode: 'Linear', compression: 'Lossless', colorSpace: 'Linear', atlas: false })
  else Object.assign(settings, { filterMode: 'Linear', compression: 'Optimized', colorSpace: 'sRGB', atlas: true })
}

/** Audio profiles define import/streaming intent while retaining explicit codec,
 * quality, trimming, normalization, and loop controls. */
export function applyAudioImportProfile(settings: AssetImportSettings, profile: AudioImportProfile): void {
  settings.audioSettings.profile = profile
  if (profile === 'Music') Object.assign(settings.audioSettings, { streaming: true, codec: 'Vorbis', quality: .82, normalize: true, targetPeakDb: -1 })
  else if (profile === 'Voice') Object.assign(settings.audioSettings, { streaming: false, codec: 'Vorbis', quality: .7, normalize: true, targetPeakDb: -3 })
  else if (profile === 'Streaming') Object.assign(settings.audioSettings, { streaming: true, codec: 'Original', quality: .8, normalize: false })
  else Object.assign(settings.audioSettings, { streaming: false, codec: 'PCM', quality: 1, normalize: false })
}

export function normalizedFontFallbacks(value: string): string[] {
  return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))].slice(0, 16)
}
