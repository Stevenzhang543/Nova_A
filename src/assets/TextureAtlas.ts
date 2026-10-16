/** Legacy atlas API delegates its unique packing algorithm to the Catalog media implementation. */
import {buildRuntimeTextureAtlases,TEXTURE_ATLAS_LIMITS} from '../runtime/runtimeAtlas'
import {createWebMediaPorts} from '../platform/webMediaPorts'
import type {AssetRecord,TextureAtlasPage} from './types'
export {TEXTURE_ATLAS_LIMITS} from '../runtime/runtimeAtlas'
export async function buildTextureAtlases(records:AssetRecord[],pageSize=2048):Promise<TextureAtlasPage[]> {
 const ports=createWebMediaPorts()
 return buildRuntimeTextureAtlases(records,{decodeImage:source=>ports.decodeImage(source,{expectedBytes:TEXTURE_ATLAS_LIMITS.decodedPixels*4,identity:'legacy-atlas',revision:0}).result,createCanvas:ports.createCanvas},pageSize)
}
