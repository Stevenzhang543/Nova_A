import { reactive } from 'vue'
import type { AssetRecord } from '../assets/types'
import { assetState, readTextAsset } from '../assets/AssetDatabase'
import { type AnimatableProperty, type AnimationClipDocument, type AnimationKeyframe } from '../runtime/animation'
import type { Entity } from '../world/Entity'
import { projectSessionState } from '../projects/projectSession'
import { encodeAnimationDraft } from './animationAuthoring'
import { clearStudioDraft, registerStudioDraftOwner, retainStudioDraft, type StudioDraftCandidate } from './studioDraftRetention'

export const animationStudioState = reactive({
  recordMode: false,
  recordIssue: '',
  previewPlaying: false,
  playhead: 0,
  snapEnabled: true,
  selectedKeyIds: [] as string[],
  selectedAssetGuid: '',
  view: 'dope' as 'dope' | 'curve' | 'controller' | 'rig' | 'timeline'
})

let openRecordingDocument: { record: AssetRecord; projectId: string; document: AnimationClipDocument; baseSource: string|null; baseline: string } | null = null
function recordingDraft():StudioDraftCandidate|null {
  const open=openRecordingDocument
  if(!open||open.projectId!==projectSessionState.id||!assetState.records.includes(open.record))return null
  const source=encodeAnimationDraft(open.document)
  return source===open.baseline?null:{record:open.record,projectId:open.projectId,kind:'animation',source,baseSource:open.baseSource}
}
registerStudioDraftOwner({read:recordingDraft,discard:()=>{const open=openRecordingDocument;if(open)clearStudioDraft(open.record,open.projectId);openRecordingDocument=null;animationStudioState.recordMode=false}})
/** Record mode writes only a retained draft. It survives workspace navigation until Save or explicit discard. */
export function setOpenAnimationRecordingDocument(assetGuid:string,document:AnimationClipDocument|null,baseSource=readTextAsset(assetGuid),baseline=document?encodeAnimationDraft(document):''):void {
  if(!document||!assetGuid){if(!animationStudioState.recordMode)openRecordingDocument=null;return}
  const record=assetState.records.find(record=>record.uuid===assetGuid&&record.assetType==='animation')
  if(record)openRecordingDocument={record,projectId:projectSessionState.id,document,baseSource,baseline}
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
  animationStudioState.recordIssue=''
  const refuse=(code:string)=>{animationStudioState.recordIssue=code;return false}
  const open=openRecordingDocument
  if(!open||open.record.uuid!==animationStudioState.selectedAssetGuid||open.projectId!==projectSessionState.id||!assetState.records.includes(open.record))return refuse('ANIMATION_RECORD_TARGET')
  const document=open.document
  if(!Number.isFinite(document.frameRate)||document.frameRate<1||document.frameRate>240||!Number.isFinite(animationStudioState.playhead))return refuse('ANIMATION_RECORD_TIME')
  const time = Math.round(Math.max(0, animationStudioState.playhead) * document.frameRate) / document.frameRate
  // Preflight all additions before any key is inserted; serialized track/key bounds are hard limits.
  const additions=entities.flatMap(entity=>properties.map(property=>({entity,property,value:propertyValue(entity,property)}))).filter(entry=>entry.value!==null)
  const pendingTracks=new Set(additions.filter(entry=>!document.tracks.some(track=>track.targetEntityUuid===entry.entity.uuid&&track.property===entry.property)).map(entry=>`${entry.entity.uuid}:${entry.property}`))
  if(document.tracks.length+pendingTracks.size>100)return refuse('ANIMATION_RECORD_TRACK_LIMIT')
  for(const entry of additions){const track=document.tracks.find(track=>track.targetEntityUuid===entry.entity.uuid&&track.property===entry.property);if(!Number.isFinite(entry.value)||track&&track.keyframes.length>=10000&&!track.keyframes.some(key=>Math.abs(key.time-time)<1e-9))return refuse('ANIMATION_RECORD_KEY_LIMIT')}

  for (const entity of entities) for (const property of properties) {
    const value = propertyValue(entity, property); if (value === null) continue
    let track = document.tracks.find(candidate => candidate.targetEntityUuid === entity.uuid && candidate.property === property)
    if (!track) { track = { property, targetEntityUuid: entity.uuid, keyframes: [] }; document.tracks.push(track) }
    const keyframe: AnimationKeyframe = { time, value, tangentMode: 'Auto', inTangent: 0, outTangent: 0 }
    const existing = track.keyframes.findIndex(candidate => Math.abs(candidate.time - time) < 1e-9)
    if (existing >= 0) track.keyframes[existing] = keyframe; else track.keyframes.push(keyframe)
    track.keyframes.sort((first, second) => first.time - second.time)
  }
  const candidate=recordingDraft();if(candidate)retainStudioDraft(candidate);return true
}
