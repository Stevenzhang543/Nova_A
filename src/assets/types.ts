import type { TextureFilter, TextureRegion } from '../renderer'

export type AssetType =
  | 'image' | 'audio' | 'font' | 'scene' | 'prefab' | 'script' | 'material'
  | 'animation' | 'controller' | 'animationMask' | 'rig' | 'skin' | 'timeline'
  | 'tileset' | 'atlas' | 'shader' | 'localization' | 'uiTheme' | 'other'
  | 'behaviorTree' | 'stateMachine' | 'tilePalette' | 'brushPreset' | 'terrainRules'
  | 'dataSchema' | 'dataTable' | 'replay'
export type TextAssetType = Extract<AssetType, 'script' | 'prefab' | 'scene' | 'material' | 'animation' | 'controller' | 'animationMask' | 'rig' | 'skin' | 'timeline' | 'tileset' | 'atlas' | 'shader' | 'localization' | 'uiTheme' | 'behaviorTree' | 'stateMachine' | 'tilePalette' | 'brushPreset' | 'terrainRules' | 'dataSchema' | 'dataTable' | 'replay'>
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
  atlasSettings: { maxSize: number; padding: number; trim: boolean }
  audioSettings: { normalize: boolean; normalizationGain: number; targetPeakDb: number; streaming: boolean; sampleRate: number; loopStart: number; loopEnd: number }
  tileSettings: { tileWidth: number; tileHeight: number; margin: number; spacing: number }
  scriptSettings: { encoding: 'utf-8'; module: boolean }
  shaderSettings: { stage: 'fragment' | 'vertex'; entry: string }
  localizationSettings: { locale: string; fallbackLocale: string }
}

export interface AssetPipelineMetadata {
  importerVersion: string
  platform: 'windows' | 'linux' | 'macos' | 'web'
  contentHash: string
  cacheKey: string
  status: 'ready' | 'failed'
  lastValidSource: string
  error: string
  dependencies: string[]
  cacheHit: boolean
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
  pipeline?: AssetPipelineMetadata
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
  'Assets/Animations', 'Assets/Controllers', 'Assets/AnimationMasks', 'Assets/Rigs', 'Assets/Skins', 'Assets/Timelines',
  'Assets/Atlases', 'Assets/Shaders', 'Assets/Localization', 'Assets/UI Themes', 'Assets/Packages', 'ProjectSettings',
  'Assets/AI', 'Assets/TilePalettes', 'Assets/BrushPresets', 'Assets/TerrainRules',
  'Assets/Data', 'Assets/Data/Schemas', 'Assets/Data/Tables', 'Assets/Replays',
  '.nova/cache', '.nova/imported'
] as const

export function defaultImportSettings(): AssetImportSettings {
  return {
    filterMode: 'Linear', compression: 'Lossless', pixelsPerUnit: 100,
    spriteRegion: null, pivot: { x: .5, y: .5 }, atlas: true, colorSpace: 'sRGB', platformVariants: {},
    atlasSettings: { maxSize: 2048, padding: 2, trim: true },
    audioSettings: { normalize: false, normalizationGain: 1, targetPeakDb: -1, streaming: false, sampleRate: 48_000, loopStart: 0, loopEnd: 0 },
    tileSettings: { tileWidth: 32, tileHeight: 32, margin: 0, spacing: 0 },
    scriptSettings: { encoding: 'utf-8', module: true },
    shaderSettings: { stage: 'fragment', entry: 'main' },
    localizationSettings: { locale: 'en', fallbackLocale: 'en' }
  }
}
