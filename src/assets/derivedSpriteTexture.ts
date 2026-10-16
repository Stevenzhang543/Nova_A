/** Existing public derived-sprite API delegates the same Editor Catalog child. */
import {getEditorMediaOwner} from './AssetDatabase'
import type {DerivedSprite} from '../runtime/derivedSpriteMetadata'
import type {TextureRegion} from '../renderer/types'
export function derivedSpriteTextureStats(){return getEditorMediaOwner().derived.derivedSpriteTextureStats()}
export function clearDerivedSpriteTextures():void{getEditorMediaOwner().clearDerived()}
export function resolveDerivedSpriteTexture(sprite:DerivedSprite,texture:TextureRegion,imageSize:{width:number;height:number},filter:'Nearest'|'Linear'):TextureRegion|null{return getEditorMediaOwner().derived.resolveDerivedSpriteTexture(sprite,texture,imageSize,filter)}
