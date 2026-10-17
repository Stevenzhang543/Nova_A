/** 动画工作区状态：保存当前录制文档，并把实体属性改动记录到动画草稿。 */
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
/** 核对当前项目及资源对象身份，仅在录制文档偏离基线时返回恢复草稿。 */ function recordingDraft():StudioDraftCandidate|null {
  const open=openRecordingDocument
  if(!open||open.projectId!==projectSessionState.id||!assetState.records.includes(open.record))return null
  const source=encodeAnimationDraft(open.document)
  return source===open.baseline?null:{record:open.record,projectId:open.projectId,kind:'animation',source,baseSource:open.baseSource}
}
registerStudioDraftOwner({read:recordingDraft,discard:/** 清除打开录制资源的保留草稿，释放录制文档并退出录制模式。 */ ()=>{const open=openRecordingDocument;if(open)clearStudioDraft(open.record,open.projectId);openRecordingDocument=null;animationStudioState.recordMode=false}})
/** Record mode writes only a retained draft. It survives workspace navigation until Save or explicit discard. */
/** 将有效动画资源与当前录制文档、项目和保存基线关联，按录制状态处理空输入。 */ export function setOpenAnimationRecordingDocument(assetGuid:string,document:AnimationClipDocument|null,baseSource=readTextAsset(assetGuid),baseline=document?encodeAnimationDraft(document):''):void {
  if(!document||!assetGuid){if(!animationStudioState.recordMode)openRecordingDocument=null;return}
  const record=assetState.records.find(/* 先计算 record.uuid===assetGuid；仅当其为真值时求右侧 record.assetType==='animation'，返回短路求值结果。 */ record=>record.uuid===assetGuid&&record.assetType==='animation')
  if(record)openRecordingDocument={record,projectId:projectSessionState.id,document,baseSource,baseline}
}
/** 读取可录制的变换、精灵或 UI 透明度属性，缺少对应组件时返回 null。 */ function propertyValue(entity: Entity, property: AnimatableProperty): number | null {
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

/** 在录制模式下预检时间与轨道键数量，按帧取整后插入或替换属性键，并保留修改后的恢复草稿。 */ export function recordEntityProperties(entities: Entity[], properties: AnimatableProperty[] = ['Transform.position.x', 'Transform.position.y', 'Transform.rotation', 'Transform.scale.x', 'Transform.scale.y']): boolean {
  if (!animationStudioState.recordMode || !animationStudioState.selectedAssetGuid || !entities.length) return false
  animationStudioState.recordIssue=''
  const refuse=/** 写入录制拒绝原因并返回 false，供预检提前退出。 */ (code:string)=>{animationStudioState.recordIssue=code;return false}
  const open=openRecordingDocument
  if(!open||open.record.uuid!==animationStudioState.selectedAssetGuid||open.projectId!==projectSessionState.id||!assetState.records.includes(open.record))return refuse('ANIMATION_RECORD_TARGET')
  const document=open.document
  if(!Number.isFinite(document.frameRate)||document.frameRate<1||document.frameRate>240||!Number.isFinite(animationStudioState.playhead))return refuse('ANIMATION_RECORD_TIME')
  const time = Math.round(Math.max(0, animationStudioState.playhead) * document.frameRate) / document.frameRate
  // Preflight all additions before any key is inserted; serialized track/key bounds are hard limits.
  const additions=entities.flatMap(/* 调用 properties.map(property=>({entity,property,value:propertyValue(entity,property)})) 并返回调用结果。 */ entity=>properties.map(/** 构造并返回记录 {entity,property,value:propertyValue(entity,property)}，字段按当前实参及捕获状态求值。 */ property=>({entity,property,value:propertyValue(entity,property)}))).filter(/* 比较 entry.value 与 null，返回严格不等的判断结果。 */ entry=>entry.value!==null)
  const pendingTracks=new Set(additions.filter(/* 返回 document.tracks.some(track=>track.targetEntityUuid===entry.entity.uuid&&track.property===entry.property) 的逻辑取反结果。 */ entry=>!document.tracks.some(/* 先计算 track.targetEntityUuid===entry.entity.uuid；仅当其为真值时求右侧 track.property===entry.property，返回短路求值结果。 */ track=>track.targetEntityUuid===entry.entity.uuid&&track.property===entry.property)).map(/** 按模板 `${entry.entity.uuid}:${entry.property}` 生成并返回字符串。 */ entry=>`${entry.entity.uuid}:${entry.property}`))
  if(document.tracks.length+pendingTracks.size>100)return refuse('ANIMATION_RECORD_TRACK_LIMIT')
  for(const entry of additions){const track=document.tracks.find(/* 先计算 track.targetEntityUuid===entry.entity.uuid；仅当其为真值时求右侧 track.property===entry.property，返回短路求值结果。 */ track=>track.targetEntityUuid===entry.entity.uuid&&track.property===entry.property);if(!Number.isFinite(entry.value)||track&&track.keyframes.length>=10000&&!track.keyframes.some(/* 比较 Math.abs(key.time-time) 与 1e-9，返回小于的判断结果。 */ key=>Math.abs(key.time-time)<1e-9))return refuse('ANIMATION_RECORD_KEY_LIMIT')}

  for (const entity of entities) for (const property of properties) {
    const value = propertyValue(entity, property); if (value === null) continue
    let track = document.tracks.find(/* 先计算 candidate.targetEntityUuid === entity.uuid；仅当其为真值时求右侧 candidate.property === property，返回短路求值结果。 */ candidate => candidate.targetEntityUuid === entity.uuid && candidate.property === property)
    if (!track) { track = { property, targetEntityUuid: entity.uuid, keyframes: [] }; document.tracks.push(track) }
    const keyframe: AnimationKeyframe = { time, value, tangentMode: 'Auto', inTangent: 0, outTangent: 0 }
    const existing = track.keyframes.findIndex(/* 比较 Math.abs(candidate.time - time) 与 1e-9，返回小于的判断结果。 */ candidate => Math.abs(candidate.time - time) < 1e-9)
    if (existing >= 0) track.keyframes[existing] = keyframe; else track.keyframes.push(keyframe)
    track.keyframes.sort(/* 计算表达式 first.time - second.time 并返回结果，沿用操作数的原有类型规则。 */ (first, second) => first.time - second.time)
  }
  const candidate=recordingDraft();if(candidate)retainStudioDraft(candidate);return true
}
