import { assetState, readTextAsset } from '../assets/AssetDatabase'
import { projectSessionState } from '../projects/projectSession'
import { gameplayRuntime } from '../runtime/GameplayRuntime'
import { animationRuntime, type AnimationClipDocument } from '../runtime/animation'
import { timelineRuntime } from '../runtime/timeline'
import { simulationPreflight } from '../runtime/simulationAuthoring26'
import { physicsState, stopPlayMode, toggleSimulation } from '../store/physics'
import type { Animator, TimelinePlayer } from '../world/components'
import { readStudioDraft, restoreAuthoringDrafts, snapshotAuthoringDrafts, type StudioDraftSnapshot } from './studioDraftRetention'

type PreviewKind='animation'|'controller'|'timeline'
/** Owns only a session it started from Edit mode; global Play remains independently owned. */
export function createAnimationPreviewSession() {
  let session:{runtimeSessionId:number;projectId:string;kind:PreviewKind;target:string;reference:string;drafts:StudioDraftSnapshot[]}|null=null
  let generation=0,captured:AnimationClipDocument|null=null
  const unobserve=animationRuntime.observeRecordingReset(document=>{if(session?.projectId===projectSessionState.id&&session.runtimeSessionId===gameplayRuntime.sessionIdentity)captured=document})
  function restoreDrafts(current:NonNullable<typeof session>) {
    if(projectSessionState.id===current.projectId)restoreAuthoringDrafts(current.projectId,assetState.records,current.drafts.filter(entry=>{const record=assetState.records.find(record=>record.uuid===entry.assetUuid);return !record||!readStudioDraft(record,current.projectId,entry.kind,readTextAsset(record.uuid))}),record=>readTextAsset(record.uuid))
  }
  function synchronize(){if(session&&(physicsState.playMode==='editing'||session.runtimeSessionId!==gameplayRuntime.sessionIdentity||!gameplayRuntime.isActive)){const previous=session;session=null;restoreDrafts(previous)}return session}
  function stop(){generation++;const previous=session;session=null;if(!previous||projectSessionState.id!==previous.projectId)return;if(previous.runtimeSessionId===gameplayRuntime.sessionIdentity&&gameplayRuntime.isActive&&physicsState.playMode!=='editing'){gameplayRuntime.stopSession();stopPlayMode()}restoreDrafts(previous)}
  return {
    get active(){return !!synchronize()},
    get target(){return synchronize()?.target??null},
    async start(kind:PreviewKind,reference:string,target:string,stillCurrent:()=>boolean=()=>true,stateId?:string){
      if(synchronize())return true
      if(physicsState.playMode!=='editing'||gameplayRuntime.isActive)throw new Error('ANIMATION_PREVIEW_BUSY')
      const token=++generation,projectId=projectSessionState.id
      await physicsState.world.wasmReady
      if(token!==generation||projectSessionState.id!==projectId||!stillCurrent())return false
      if(physicsState.world.wasmError)throw physicsState.world.wasmError
      if(physicsState.playMode!=='editing'||gameplayRuntime.isActive)throw new Error('ANIMATION_PREVIEW_BUSY')
      const entity=physicsState.world.entities.find(entity=>entity.uuid===target)
      if(!entity)throw new Error('ANIMATION_PREVIEW_TARGET')
      const blocked=simulationPreflight(physicsState.world.entities,physicsState.world.connections,physicsState.globalSettings).blocked
      if(blocked.length)throw new Error(`ANIMATION_PREVIEW_PREFLIGHT: ${blocked.map(issue=>issue.code).join(', ')}`)
      if(kind==='controller'&&entity.getComponent<Animator>('Animator')?.controllerAsset!==reference)throw new Error('ANIMATION_PREVIEW_TARGET')
      if(kind==='timeline'&&entity.getComponent<TimelinePlayer>('TimelinePlayer')?.timelineAsset!==reference)throw new Error('ANIMATION_PREVIEW_TARGET')
      const drafts=snapshotAuthoringDrafts(projectId,assetState.records,record=>readTextAsset(record.uuid))
      session={runtimeSessionId:gameplayRuntime.sessionIdentity+1,projectId,kind,target,reference,drafts}
      try {
        toggleSimulation(true);gameplayRuntime.beginSession()
        const currentEntity=physicsState.world.entities.find(entity=>entity.uuid===target)
        if(!gameplayRuntime.isActive||session.runtimeSessionId!==gameplayRuntime.sessionIdentity||!currentEntity)throw new Error('ANIMATION_PREVIEW_TARGET')
        if(kind==='controller'&&currentEntity.getComponent<Animator>('Animator')?.controllerAsset!==reference)throw new Error('ANIMATION_PREVIEW_TARGET')
        if(kind==='timeline'&&currentEntity.getComponent<TimelinePlayer>('TimelinePlayer')?.timelineAsset!==reference)throw new Error('ANIMATION_PREVIEW_TARGET')
        if(kind==='animation'){if(!animationRuntime.seekClipPlayback(target,reference,0,physicsState.world.entities))throw new Error('ANIMATION_PREVIEW_TARGET')}
        else if(kind==='timeline'){const player=currentEntity.getComponent<TimelinePlayer>('TimelinePlayer')!;player.playing=true;timelineRuntime.seek(target,physicsState.world.entities,0)}
        else if(stateId)currentEntity.getComponent<Animator>('Animator')!.currentState=stateId
        return true
      }catch(error){stop();throw error}
    },
    stop,
    takeRecordingDraft(){const document=captured;captured=null;return document},
    dispose(){stop();unobserve()},
    pause(){if(synchronize())toggleSimulation(false)},
    resume(){if(synchronize())toggleSimulation(true)},
    seek(seconds:number){const current=synchronize();if(!current)return false;if(current.kind==='animation')return animationRuntime.seekClipPlayback(current.target,current.reference,seconds,physicsState.world.entities);if(current.kind==='timeline')return timelineRuntime.seek(current.target,physicsState.world.entities,seconds);return false},
    inspect(){const current=synchronize();if(!current)return null;const entity=physicsState.world.entities.find(entity=>entity.uuid===current.target);return{kind:current.kind,playing:physicsState.playMode==='playing',time:current.kind==='animation'?animationRuntime.inspectClipPlayback(current.target)?.time??null:current.kind==='timeline'?entity?.getComponent<TimelinePlayer>('TimelinePlayer')?.currentTime??null:null}},
  }
}