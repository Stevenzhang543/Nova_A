import { AudioRuntime, type AudioProjectSettings } from '../runtime/audio'
import { AudioSource } from '../world/components'
import { BoxEntity } from '../world/BoxEntity'
/** A detached entity and independent mixer audition saved assets without touching scene voices. */
export function createAudioAudition(){
 const runtime=new AudioRuntime(),entity=new BoxEntity(-1,{x:0,y:0},{x:1,y:1}),source=entity.addComponent(new AudioSource())
 source.autoplay=false;source.loop=false;source.spatialBlend=0
 let initialized=false
 return{
  runtime,
  configure(reference:string,bus:string,settings:AudioProjectSettings){source.audioClip=reference;source.bus=bus;if(!initialized){runtime.begin(settings);initialized=true}runtime.update([entity],settings,true)},
  play(seconds:number){source.startOffsetSeconds=0;runtime.pause(entity);runtime.play(entity);runtime.scrub(entity,seconds);runtime.play(entity)},
  pause(){runtime.pause(entity)},
  seek(seconds:number,resume=false){const result=runtime.scrub(entity,seconds);if(result&&resume)runtime.play(entity);return result},
  tick(settings:AudioProjectSettings){if(!initialized)return;const time=runtime.playbackTime(entity)??0;runtime.update([entity],settings,true,{seconds:time,playing:true,scale:1});},
  inspect(){const clock=runtime.diagnostics.voiceClocks['source:'+source.uuid];return{time:runtime.playbackTime(entity)??0,playing:clock?.playing??false}},
  dispose(){runtime.dispose();initialized=false},
 }
}