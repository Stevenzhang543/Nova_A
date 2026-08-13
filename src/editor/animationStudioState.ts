import { reactive } from 'vue'
import { assetState, readTextAsset, updateTextAsset } from '../assets/AssetDatabase'
import { normalizeAnimationClip, type AnimatableProperty, type AnimationClipDocument, type AnimationKeyframe } from '../runtime/animation'
import type { Entity } from '../world/Entity'

export const animationStudioState = reactive({
  recordMode: false,
  previewPlaying: false,
  playhead: 0,
  snapEnabled: true,
  selectedKeyIds: [] as string[],
  selectedAssetGuid: '',
  view: 'dope' as 'dope' | 'curve' | 'controller' | 'rig' | 'timeline'
})

let openRecordingDocument: { assetGuid: string; document: AnimationClipDocument } | null = null

/** Keeps record mode writing into the visible clip draft as well as its persisted asset. */
export function setOpenAnimationRecordingDocument(assetGuid: string, document: AnimationClipDocument | null): void {
  openRecordingDocument = document && assetGuid ? { assetGuid, document } : null
}

function propertyValue(entity: Entity, property: AnimatableProperty): number | null {
  if (property === 'Transform.position.x') return entity.transform.position.x
  if (property === 'Transform.position.y') return entity.transform.position.y
  if (property === 'Transform.rotation') return entity.transform.rotation
  if (property === 'Transform.scale.x') return entity.transform.scale.x
  if (property === 'Transform.scale.y') return entity.transform.scale.y
  if (property === 'SpriteRenderer.opacity') return entity.spriteRenderer?.opacity ?? null
  for (const kind of ['Panel', 'Image', 'Text'] as const) {
    const component = entity.getComponent<{ opacity: number } & { readonly kind: typeof kind; enabled: boolean; removed: boolean; uuid: string }>(kind)
    if (component) return component.opacity
  }
  return null
}

export function recordEntityProperties(entities: Entity[], properties: AnimatableProperty[] = ['Transform.position.x', 'Transform.position.y', 'Transform.rotation', 'Transform.scale.x', 'Transform.scale.y']): boolean {
  if (!animationStudioState.recordMode || !animationStudioState.selectedAssetGuid || !entities.length) return false
  const asset = assetState.records.find(candidate => candidate.uuid === animationStudioState.selectedAssetGuid)
  const source = readTextAsset(animationStudioState.selectedAssetGuid)
  if (!asset || asset.assetType !== 'animation' || !source) return false
  let document: AnimationClipDocument
  if (openRecordingDocument?.assetGuid === asset.uuid) document = openRecordingDocument.document
  else try { document = normalizeAnimationClip(JSON.parse(source)) } catch { return false }
  const time = Math.round(Math.max(0, animationStudioState.playhead) * document.frameRate) / document.frameRate
  for (const entity of entities) for (const property of properties) {
    const value = propertyValue(entity, property); if (value === null) continue
    let track = document.tracks.find(candidate => candidate.targetEntityUuid === entity.uuid && candidate.property === property)
    if (!track) { track = { property, targetEntityUuid: entity.uuid, keyframes: [] }; document.tracks.push(track) }
    const keyframe: AnimationKeyframe = { time, value, tangentMode: 'Auto', inTangent: 0, outTangent: 0 }
    const existing = track.keyframes.findIndex(candidate => Math.abs(candidate.time - time) < 1e-9)
    if (existing >= 0) track.keyframes[existing] = keyframe; else track.keyframes.push(keyframe)
    track.keyframes.sort((first, second) => first.time - second.time)
  }
  return updateTextAsset(asset.uuid, JSON.stringify(normalizeAnimationClip(document), null, 2))
}
