import type { TextureFilter, TextureRegion } from '../renderer'

export type AssetType = 'image' | 'audio' | 'font' | 'scene' | 'prefab' | 'script' | 'material' | 'animation' | 'controller' | 'tileset' | 'other'
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
}

export interface TextureAtlasPage {
  key: string
  canvas: HTMLCanvasElement
  regions: Map<string, TextureRegion>
}

export const DEFAULT_ASSET_FOLDERS = [
  'Assets', 'Assets/Scenes', 'Assets/Sprites', 'Assets/Audio', 'Assets/Scripts',
  'Assets/Fonts', 'Assets/Prefabs', 'Assets/Tiles', 'Assets/TileSets', 'Assets/Materials', 'Assets/Animations', 'Assets/Controllers', 'ProjectSettings',
  '.nova/cache', '.nova/imported'
] as const

export function defaultImportSettings(): AssetImportSettings {
  return {
    filterMode: 'Linear', compression: 'Lossless', pixelsPerUnit: 100,
    spriteRegion: null, pivot: { x: .5, y: .5 }, atlas: true
  }
}
