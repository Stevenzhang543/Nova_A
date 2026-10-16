/** The unique fixed-World composition. No World allocation, default services or background clock. */
import {AnimationOwner} from './animationOwner'
import {TimelineOwner} from './timelineOwner'
import {AnimationTimelineDocumentReader} from './animationTimelineDocumentReader'
import {createInitialTimelinePresentation,validateAnimationTimelinePorts,type AnimationWorld,type AnimationTimelinePorts,type TimelinePresentation,type AnimationRecordingObservers} from './animationTimelineContracts'
export class AnimationTimelineOwner{
 readonly documents:AnimationTimelineDocumentReader
 readonly animation:AnimationOwner
 readonly timeline:TimelineOwner
 readonly presentation:TimelinePresentation
 constructor(readonly world:AnimationWorld,readonly ports:AnimationTimelinePorts,presentation=createInitialTimelinePresentation(),observers:AnimationRecordingObservers=new Set()){
  validateAnimationTimelinePorts(world,ports);this.presentation=presentation;this.documents=new AnimationTimelineDocumentReader(ports.resources);this.animation=new AnimationOwner(world,ports,this.documents,observers);this.timeline=new TimelineOwner(world,ports,this.documents,this.animation,presentation)
 }
 assertEntities(entities:AnimationWorld['entities']):void{this.animation.assertEntities(entities)}
 markMembershipDirty():void{this.animation.markMembershipDirty()}
 unwrap(value:unknown):unknown{return this.ports.unwrapEntity(value)}
}
