import type { TextureFilter, TextureRegion } from '../renderer'

export type AssetType =
  | 'image' | 'audio' | 'font' | 'scene' | 'prefab' | 'script' | 'material'
  | 'animation' | 'controller' | 'animationMask' | 'rig' | 'skin' | 'timeline'
  | 'tileset' | 'other'
export type TextAssetType = Extract<AssetType, 'script' | 'prefab' | 'scene' | 'material' | 'animation' | 'controller' | 'animationMask' | 'rig' | 'skin' | 'timeline' | 'tileset'>
export type AssetCompression = 'None' | 'Lossless' | 'Optimized'

export interface SpriteRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface AssetImportSettings {
  filterMode: TextureFilter
  compression: AssetCompression
  pixelsPerUnit: number
  spriteRegion: SpriteRegion | null
  pivot: { x: number; y: number }
  atlas: boolean
  colorSpace: 'sRGB' | 'Linear'
  platformVariants: Partial<Record<'windows' | 'linux' | 'macos' | 'web', AssetCompression>>
}

export interface ScriptAssetMetadata {
  version: 1
  breakpoints: number[]
  tests: string[]
  packageDependencies: string[]
}

export interface AnimationImportMetadata {
  version: 1
  sourceAsset: string | null
  sourceFrameRate: number
  sampleRate: number
  trackMappings: Array<{ source: string; target: string }>
  lastImportedAt: number
}

export interface AssetRecord {
  uuid: string
  name: string
  path: string
  assetType: AssetType
  mimeType: string
  byteLength: number
  source: string
  sourceModified: number
  importedAt: number
  width: number
  height: number
  duration: number
  fontFamily: string
  settings: AssetImportSettings
  script?: ScriptAssetMetadata
  animationImport?: AnimationImportMetadata
  /** Top-level fields from newer tools are emitted unchanged on the next save. */
  unknownFields?: Record<string, unknown>
}

export function defaultScriptMetadata(): ScriptAssetMetadata {
  return { version: 1, breakpoints: [], tests: [], packageDependencies: [] }
}

export function defaultAnimationImportMetadata(): AnimationImportMetadata {
  return { version: 1, sourceAsset: null, sourceFrameRate: 60, sampleRate: 60, trackMappings: [], lastImportedAt: 0 }
}

export interface TextureAtlasPage {
  key: string
  canvas: HTMLCanvasElement
  regions: Map<string, TextureRegion>
}

export const DEFAULT_ASSET_FOLDERS = [
  'Assets', 'Assets/Scenes', 'Assets/Sprites', 'Assets/Audio', 'Assets/Scripts',
  'Assets/Fonts', 'Assets/Prefabs', 'Assets/Plugins', 'Assets/Tiles', 'Assets/TileSets', 'Assets/Materials',
  'Assets/Animations', 'Assets/Controllers', 'Assets/AnimationMasks', 'Assets/Rigs', 'Assets/Skins', 'Assets/Timelines', 'ProjectSettings',
  '.nova/cache', '.nova/imported'
] as const

export function defaultImportSettings(): AssetImportSettings {
  return {
    filterMode: 'Linear', compression: 'Lossless', pixelsPerUnit: 100,
    spriteRegion: null, pivot: { x: .5, y: .5 }, atlas: true, colorSpace: 'sRGB', platformVariants: {}
  }
}
