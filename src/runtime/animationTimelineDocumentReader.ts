/** Unique original resource-reading algorithms; cache state is per explicit resource port. */
import type { AnimationResources } from './animationTimelineContracts'
import {normalizeAnimationClip,normalizeAnimatorController,normalizeAnimationMask,type AnimationClipDocument,type AnimatorControllerDocument,type AnimationMaskDocument} from './animationDocuments'
import {normalizeTimeline,type TimelineDocument} from './timelineDocuments'
export class AnimationTimelineDocumentReader{
 private clipCache=new Map<string,{generation:number;value:AnimationClipDocument|null}>()
 private controllerCache=new Map<string,{generation:number;value:AnimatorControllerDocument|null}>()
 private maskCache=new Map<string,{generation:number;value:AnimationMaskDocument|null}>()
 private animationCacheGeneration=-1
 private cache=new Map<string,{generation:number;value:TimelineDocument|null}>()
 private cacheGeneration=-1
 constructor(readonly resources:AnimationResources){if(!resources||typeof resources.resolveAsset!=='function'||typeof resources.readSource!=='function'||typeof resources.revision!=='function')throw new Error('ANIMATION_RESOURCES_REQUIRED')}
 private parseAsset<T>(reference: string | null, type: 'animation' | 'controller' | 'animationMask', normalize: (source: unknown) => T): T | null {
  const asset = this.resources.resolveAsset(reference)
  const source = this.resources.readSource(reference)
  if (!asset || asset.assetType !== type || !source) return null
  try { return normalize(JSON.parse(source)) } catch { return null }
}
private refreshAnimationCaches():void{if(this.animationCacheGeneration!==this.resources.revision()){this.clipCache.clear();this.controllerCache.clear();this.maskCache.clear();this.animationCacheGeneration=this.resources.revision()}for(const cache of [this.clipCache,this.controllerCache,this.maskCache])while(cache.size>=512)cache.delete(cache.keys().next().value!)}
readAnimationClip(reference: string | null): AnimationClipDocument | null {
  if (!reference) return null
  this.refreshAnimationCaches()
  const cached = this.clipCache.get(reference)
  if (cached?.generation === this.resources.revision()) return cached.value
  const value = this.parseAsset(reference, 'animation', normalizeAnimationClip)
  this.clipCache.set(reference, { generation: this.resources.revision(), value })
  return value
}
readAnimatorController(reference: string | null): AnimatorControllerDocument | null {
  if (!reference) return null
  this.refreshAnimationCaches()
  const cached = this.controllerCache.get(reference)
  if (cached?.generation === this.resources.revision()) return cached.value
  const value = this.parseAsset(reference, 'controller', normalizeAnimatorController)
  this.controllerCache.set(reference, { generation: this.resources.revision(), value })
  return value
}
readAnimationMask(reference: string | null): AnimationMaskDocument | null {
  if (!reference) return null
  this.refreshAnimationCaches()
  const cached = this.maskCache.get(reference); if (cached?.generation === this.resources.revision()) return cached.value
  const value = this.parseAsset(reference, 'animationMask', normalizeAnimationMask)
  this.maskCache.set(reference, { generation: this.resources.revision(), value }); return value
}

readTimeline(reference: string | null): TimelineDocument | null {
  if (!reference) return null
  if(this.cacheGeneration!==this.resources.revision()){this.cache.clear();this.cacheGeneration=this.resources.revision()}while(this.cache.size>=256)this.cache.delete(this.cache.keys().next().value!)
  const cached = this.cache.get(reference); if (cached?.generation === this.resources.revision()) return cached.value
  const asset = this.resources.resolveAsset(reference), source = this.resources.readSource(reference); let value: TimelineDocument | null = null
  if (asset?.assetType === 'timeline' && source) try { value = normalizeTimeline(JSON.parse(source)) } catch { value = null }
  this.cache.set(reference, { generation: this.resources.revision(), value }); return value
}
}
