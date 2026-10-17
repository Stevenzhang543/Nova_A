/** Pure temporary legacy facade; actual fixed-World execution is AnimationOwner. */
import type {Entity} from '../world/Entity'
import type {Animator,AnimatorParameterValue} from '../world/components'
import type {AssetRecord} from './runtimeAssetRecordContracts'
import {finiteNumber} from '../world/geometry'
import {TRACKS,defaultAnimationClip,defaultAnimatorController,defaultAnimationMask,animationClipLength,normalizeAnimationClip,sampleAnimationTrack,reduceAnimationKeys,type AnimatableProperty,type AnimationKeyframe,type AnimationClipDocument,type AnimationRootMotionDelta} from './animationDocuments'
import {applyAnimatorParameterFromDocuments,type AnimationOwner} from './animationOwner'
import {legacyAnimationAuthoring,legacyAnimationDocuments,requireLegacyAnimationTimelineOwner,observeLegacyAnimationRecordingReset,getLegacyAnimationRecordingObservers} from './animationTimelineLegacy'
export * from './animationDocuments'
export type {AnimatorRuntimeInspection,RuntimeAnimationRecordingStatus,TimelineAnimationSample} from './animationOwner'
export {getLegacyAnimationTimelineRawPresentation,installLegacyAnimationTimelinePort} from './animationTimelineLegacy'
export function readAnimationClip(reference:string|null){return legacyAnimationDocuments().readAnimationClip(reference)}
export function readAnimatorController(reference:string|null){return legacyAnimationDocuments().readAnimatorController(reference)}
export function readAnimationMask(reference:string|null){return legacyAnimationDocuments().readAnimationMask(reference)}


/* 调用 legacyAnimationAuthoring().createText(name, 'animation', JSON.stringify(defaultAnimationClip(name), null, 2), 'Assets/Animations') 并返回调用结果。 */ export function createAnimationClipAsset(name = 'New Animation'): AssetRecord {
  return legacyAnimationAuthoring().createText(name, 'animation', JSON.stringify(defaultAnimationClip(name), null, 2), 'Assets/Animations')
}

/* 调用 legacyAnimationAuthoring().createText(name, 'controller', JSON.stringify(defaultAnimatorController(name), null, 2), 'Assets/Controllers') 并返回调用结果。 */ export function createAnimatorControllerAsset(name = 'New Controller'): AssetRecord {
  return legacyAnimationAuthoring().createText(name, 'controller', JSON.stringify(defaultAnimatorController(name), null, 2), 'Assets/Controllers')
}

/* 调用 legacyAnimationAuthoring().createText(name, 'animationMask', JSON.stringify(defaultAnimationMask(name), null, 2), 'Assets/AnimationMasks') 并返回调用结果。 */ export function createAnimationMaskAsset(name = 'New Animation Mask'): AssetRecord {
  return legacyAnimationAuthoring().createText(name, 'animationMask', JSON.stringify(defaultAnimationMask(name), null, 2), 'Assets/AnimationMasks')
}

/** 结构说明（自动提取）：reimportAnimationClip；输入 asset；直接调用 resolveAsset、readAnimationClip、Math.min、Math.max、finiteNumber 等；写入 settings.sourceFrameRate、settings.sampleRate、settings.lastImportedAt；包含显式抛错路径。 */ export function reimportAnimationClip(asset: AssetRecord): AnimationClipDocument | null {
  const settings = asset.animationImport
  if (asset.assetType !== 'animation' || !settings?.sourceAsset || legacyAnimationDocuments().resources.resolveAsset(settings.sourceAsset)?.uuid === asset.uuid) return null
  const source = readAnimationClip(settings.sourceAsset)
  if (!source) return null
  const sampleRate = Math.min(240, Math.max(1, finiteNumber(settings.sampleRate, source.frameRate)))
  const mapping = new Map(settings.trackMappings.flatMap(/** 结构说明（自动提取）：settings.trackMappings.flatMap 回调；输入 item；直接调用 TRACKS.has；返回表达式求值结果。 */ item => TRACKS.has(item.source as AnimatableProperty) && TRACKS.has(item.target as AnimatableProperty)
    ? [[item.source as AnimatableProperty, item.target as AnimatableProperty] as const]
    : []))
  const length = animationClipLength(source)
  if(Math.ceil(length*sampleRate)+1>10000||(Math.ceil(length*sampleRate)+1)*source.tracks.length>250000)throw new Error('ANIMATION_IMPORT_LIMIT: Resampling exceeds 10,000 keys per track or 250,000 total keys; slice the source or reduce sample rate.')
  const tracks = source.tracks.map(/** 结构说明（自动提取）：source.tracks.map 回调；输入 track；直接调用 mapping.get、Math.ceil、Math.min、sampleAnimationTrack、keyframes.push 等；包含循环处理。 */ track => {
    const property = mapping.get(track.property) ?? track.property
    const keyframes: AnimationKeyframe[] = []
    for (let index = 0; index <= Math.ceil(length * sampleRate); index++) {
      const time = Math.min(length, index / sampleRate)
      const value = sampleAnimationTrack(track.keyframes, time)
      if (value !== null) keyframes.push({ time, value, tangentMode: 'Linear', inTangent: 0, outTangent: 0, interpolation: 'Linear' })
    }
    return { property, targetEntityUuid: track.targetEntityUuid, keyframes: reduceAnimationKeys(keyframes, settings.compressionTolerance) }
  })
  const imported = normalizeAnimationClip({
    ...source, name: asset.name.replace(/\.nova-anim$/i, ''), frameRate: sampleRate, tracks,
    events: settings.preserveEvents ? source.events.map(/** 构造并返回记录 { ...event }，字段按当前实参及捕获状态求值。 */ event => ({ ...event })) : [], spriteFrames: source.spriteFrames.map(/** 构造并返回记录 { ...frame }，字段按当前实参及捕获状态求值。 */ frame => ({ ...frame }))
  })
  settings.sourceFrameRate = source.frameRate
  settings.sampleRate = sampleRate
  settings.lastImportedAt = Date.now()
  return legacyAnimationAuthoring().writeText(asset.uuid, JSON.stringify(imported, null, 2)) ? imported : null
}
/** 结构说明（自动提取）：applyAnimationRootMotion；输入 entity、delta、weight；直接调用 every、Error、Math.max、Math.min；写入 entity.transform.position.x、entity.transform.position.y、entity.transform.rotation；包含显式抛错路径。 */ export function applyAnimationRootMotion(entity:Entity,delta:AnimationRootMotionDelta,weight=1):void{
  if(![delta.x,delta.y,delta.rotation,weight].every(Number.isFinite))throw new Error('ANIMATION_ROOT_MOTION: Root displacement and weight must be finite.')
  const amount=Math.max(0,Math.min(1,weight));entity.transform.position.x+=delta.x*amount;entity.transform.position.y+=delta.y*amount;entity.transform.rotation+=delta.rotation*amount
}

/* 调用 legacyAnimationAuthoring().assetReference(asset.uuid) 并返回调用结果。 */ export function animationAssetReference(asset: AssetRecord): string { return legacyAnimationAuthoring().assetReference(asset.uuid) }
export const animationRuntime=new Proxy({} as AnimationOwner,{get(_target,key){if(key==='observeRecordingReset')return observeLegacyAnimationRecordingReset;if(key==='recordingResetObservers')return getLegacyAnimationRecordingObservers();const owner=requireLegacyAnimationTimelineOwner().animation,value=Reflect.get(owner,key,owner);if(typeof value!=='function'||key==='onEvent'||key==='onCommand')return value;return value.bind(owner)},set(_target,key,value){const owner=requireLegacyAnimationTimelineOwner().animation;return Reflect.set(owner,key,value,owner)}})
export function setAnimatorParameter(animator:Animator,name:string,value:AnimatorParameterValue):void{applyAnimatorParameterFromDocuments(animator,name,value,legacyAnimationDocuments())}
