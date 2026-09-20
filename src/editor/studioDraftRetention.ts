/** Session recovery is tied to the live record object, not merely a reusable UUID.
 * No application imports: project departure owns the active-record boundary. */
export type StudioDraftKind = 'theme' | 'localization' | 'code' | 'graph' | 'events' | 'blueprint' | 'resource' | 'animation' | 'controller' | 'animationMask' | 'rig' | 'skin' | 'timeline' | 'material' | 'particle'
export interface StudioDraftRecord { uuid:string;name:string;assetType:string }
export interface StudioDraftPayload { source:string;baseSource:string|null;editorState?:unknown }
export interface StudioDraftCandidate extends StudioDraftPayload { record:StudioDraftRecord;projectId:string;kind:StudioDraftKind }
export interface RetainedStudioDraft extends StudioDraftPayload { projectId:string;assetUuid:string;kind:StudioDraftKind;revision:number;sourceFingerprint:string }
export interface PendingAuthoringDraft { assetUuid:string;kind:StudioDraftKind;name:string;revision:number;sourceFingerprint:string;active:boolean }
export interface StudioDraftSnapshot extends RetainedStudioDraft { assetType:string;name:string;savedSourceAtSnapshot:string|null }
interface Owner { read:()=>StudioDraftCandidate|null;discard:()=>void }
const drafts=new WeakMap<StudioDraftRecord,RetainedStudioDraft>(),owners=new Set<Owner>()
const assetTypes:Record<StudioDraftKind,string>={theme:'uiTheme',localization:'localization',code:'script',graph:'visualScript',events:'eventSheet',blueprint:'objectBlueprint',resource:'resource',animation:'animation',controller:'controller',animationMask:'animationMask',rig:'rig',skin:'skin',timeline:'timeline',material:'material',particle:'particleSystem'}
let nextRevision=0
function fingerprint(source:string){let a=2166136261,b=2654435769;for(let index=0;index<source.length;index++){const code=source.charCodeAt(index);a=Math.imul(a^code,16777619)>>>0;b=Math.imul(b+code,2246822519)>>>0}return`${source.length}:${a.toString(16)}:${b.toString(16)}`}
export function retainStudioDraft(candidate:StudioDraftCandidate):RetainedStudioDraft {
  if(!candidate.projectId||!candidate.record.uuid||candidate.record.assetType!==assetTypes[candidate.kind])throw new Error('Draft identity does not match its live asset.')
  const existing=drafts.get(candidate.record)
  if(existing?.projectId===candidate.projectId&&existing.kind===candidate.kind&&existing.assetUuid===candidate.record.uuid&&existing.source===candidate.source&&existing.baseSource===candidate.baseSource){const updated=Object.freeze({...existing,editorState:candidate.editorState});drafts.set(candidate.record,updated);return updated}
  const entry=Object.freeze({projectId:candidate.projectId,assetUuid:candidate.record.uuid,kind:candidate.kind,source:candidate.source,baseSource:candidate.baseSource,...(candidate.editorState!==undefined?{editorState:candidate.editorState}:{}),revision:++nextRevision,sourceFingerprint:fingerprint(candidate.source)})
  drafts.set(candidate.record,entry);return entry
}
export function readStudioDraft(record:StudioDraftRecord,projectId:string,kind:StudioDraftKind,currentSource:string|null){const entry=drafts.get(record);if(!entry||entry.projectId!==projectId||entry.assetUuid!==record.uuid||entry.kind!==kind||record.assetType!==assetTypes[kind])return null;return{entry,conflict:entry.baseSource!==currentSource}}
export function clearStudioDraft(record:StudioDraftRecord,projectId:string){if(drafts.get(record)?.projectId===projectId)drafts.delete(record)}
export function registerStudioDraftOwner(owner:Owner):()=>void {owners.add(owner);return()=>owners.delete(owner)}
function captureOwners(projectId:string,records:readonly StudioDraftRecord[]){
  const live=new Set(records),active=new Set<StudioDraftRecord>(),conflicted:PendingAuthoringDraft[]=[],conflictedRecords:StudioDraftRecord[]=[]
  for(const owner of owners){
    const candidate=owner.read();if(!candidate||candidate.projectId!==projectId)continue
    if(live.has(candidate.record)){retainStudioDraft(candidate);active.add(candidate.record)}
    else if(records.some(record=>record.uuid===candidate.record.uuid&&record.assetType===candidate.record.assetType)){
      // Undo may replace the record while an editor deliberately retains a conflict.
      // Report its mounted draft, but never attach the recovery entry to the new record.
      const entry=retainStudioDraft(candidate)
      conflictedRecords.push(candidate.record)
      conflicted.push({assetUuid:candidate.record.uuid,kind:candidate.kind,name:candidate.record.name,revision:entry.revision,sourceFingerprint:entry.sourceFingerprint,active:true})
    }
  }
  return {active,conflicted,conflictedRecords}
}
export function listPendingAuthoringDrafts(projectId:string,records:readonly StudioDraftRecord[]):PendingAuthoringDraft[]{
  const {active,conflicted}=captureOwners(projectId,records)
  const pending=records.flatMap(record=>{const entry=drafts.get(record);return entry?.projectId===projectId&&entry.assetUuid===record.uuid&&record.assetType===assetTypes[entry.kind]?[{assetUuid:record.uuid,kind:entry.kind,name:record.name,revision:entry.revision,sourceFingerprint:entry.sourceFingerprint,active:active.has(record)}]:[]})
  for(const draft of conflicted)if(!pending.some(entry=>entry.assetUuid===draft.assetUuid&&entry.kind===draft.kind))pending.push(draft)
  return pending.sort((a,b)=>a.assetUuid.localeCompare(b.assetUuid))
}
export function hasPendingAuthoringDrafts(projectId:string,records:readonly StudioDraftRecord[]){return listPendingAuthoringDrafts(projectId,records).length>0}
/** Explicit user discard only. A failed discard callback leaves its cache intact. */
export function discardAuthoringDrafts(projectId:string,records:readonly StudioDraftRecord[]){
  const live=new Set(records)
  for(const owner of owners){const candidate=owner.read();if(candidate?.projectId===projectId&&(live.has(candidate.record)||records.some(record=>record.uuid===candidate.record.uuid&&record.assetType===candidate.record.assetType))){owner.discard();clearStudioDraft(candidate.record,projectId)}}
  for(const record of records)clearStudioDraft(record,projectId)
}
export function snapshotAuthoringDrafts(projectId:string,records:readonly StudioDraftRecord[],readSource:(record:StudioDraftRecord)=>string|null):StudioDraftSnapshot[]{
  const {conflictedRecords}=captureOwners(projectId,records),snapshots:StudioDraftSnapshot[]=[]
  for(const record of [...records,...conflictedRecords]){const entry=drafts.get(record);if(entry?.projectId===projectId&&!snapshots.some(snapshot=>snapshot.assetUuid===entry.assetUuid&&snapshot.kind===entry.kind))snapshots.push({...entry,assetType:record.assetType,name:record.name,savedSourceAtSnapshot:readSource(record)})}
  return snapshots
}
/** Only the project transaction's explicit rollback calls this. Ordinary imports
 * and Undo cannot revive drafts by UUID. The saved source at snapshot time must match, independently of an older conflicted draft base. */
export function restoreAuthoringDrafts(projectId:string,records:readonly StudioDraftRecord[],snapshots:readonly StudioDraftSnapshot[],readSource:(record:StudioDraftRecord)=>string|null){
  const rejected:string[]=[]
  for(const entry of snapshots){const record=records.find(record=>record.uuid===entry.assetUuid&&record.assetType===entry.assetType);if(entry.projectId!==projectId||!record||readSource(record)!==entry.savedSourceAtSnapshot){rejected.push(entry.assetUuid);continue}retainStudioDraft({record,projectId,kind:entry.kind,source:entry.source,baseSource:entry.baseSource,editorState:entry.editorState})}
  return rejected
}
