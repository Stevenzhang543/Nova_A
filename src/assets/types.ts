/** Existing Editor API names; persisted types/defaults share one actual implementation. */
import type { TextureRegion } from '../renderer'
export * from '../runtime/runtimeAssetRecordContracts'


export interface TextureAtlasPage {
  key: string
  canvas: HTMLCanvasElement
  regions: Map<string, TextureRegion>
}
