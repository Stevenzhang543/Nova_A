/** 编辑器音频试听：管理试听播放、定位、状态检查和资源释放。 */
import { AudioRuntime, normalizeAudioSettings, type AudioProjectSettings } from '../runtime/audio'
import { AudioSource } from '../world/components'
import { BoxEntity } from '../world/BoxEntity'
/** 试听专属总线覆盖仅属于编辑器会话，不写入项目设置或历史。 */
export type AudioAuditionOverrides = Record<string, { mute?: boolean; solo?: boolean }>
/** 复制并归一化配置后应用试听覆盖，保留作者的混音数据不变。 */
export function auditionMixSettings(settings:AudioProjectSettings, overrides:AudioAuditionOverrides):AudioProjectSettings {
 const copy=normalizeAudioSettings(settings)
 for(const bus of copy.mixer.buses){const override=overrides[bus.id];if(override?.mute!==undefined)bus.mute=override.mute;if(override?.solo!==undefined)bus.solo=override.solo}
 return copy
}
/** A detached entity and independent mixer audition saved assets without touching scene voices. */
/** 创建独立音频运行时和非空间试听音源，提供播放、定位、诊断及释放接口。 */ export function createAudioAudition(){
 const runtime=new AudioRuntime(),entity=new BoxEntity(-1,{x:0,y:0},{x:1,y:1}),source=entity.addComponent(new AudioSource())
 source.autoplay=false;source.loop=false;source.spatialBlend=0
 let initialized=false, overrides:AudioAuditionOverrides={}
 return{
  runtime,
  /** 替换试听覆盖；拷贝输入，避免外部对象修改影响正在播放的会话。 */ setMixOverrides(value:AudioAuditionOverrides){overrides=Object.fromEntries(Object.entries(value).map(/** 复制每条总线的两个布尔覆盖，不保留响应式代理。 */ ([id,flags])=>[id,{...flags}]))},
  /** 更新试听资源和总线，首次配置时初始化运行时，再同步音源设置。 */ configure(reference:string,bus:string,settings:AudioProjectSettings){source.audioClip=reference;source.bus=bus;settings=auditionMixSettings(settings,overrides);if(!initialized){runtime.begin(settings);initialized=true}runtime.update([entity],settings,true)},
  /** 重新启动试听并定位指定时间，清零资源起始偏移以使用绝对试听位置。 */ play(seconds:number){source.startOffsetSeconds=0;runtime.pause(entity);runtime.play(entity);runtime.scrub(entity,seconds);runtime.play(entity)},
  /** 执行时调用 runtime.pause(entity)；不显式返回调用结果。 */ pause(){runtime.pause(entity)},
  /** 定位试听音源，仅在定位成功且要求恢复时继续播放。 */ seek(seconds:number,resume=false){const result=runtime.scrub(entity,seconds);if(result&&resume)runtime.play(entity);return result},
  /** 初始化后按音源当前播放时间更新音频运行时及项目设置。 */ tick(settings:AudioProjectSettings){if(!initialized)return;const time=runtime.playbackTime(entity)??0;runtime.update([entity],auditionMixSettings(settings,overrides),true,{seconds:time,playing:true,scale:1});},
  /** 从音源诊断时钟读取试听播放状态和时间，未建立时钟时使用安全默认值。 */ inspect(){const clock=runtime.diagnostics.voiceClocks['source:'+source.uuid];return{time:runtime.playbackTime(entity)??0,playing:clock?.playing??false}},
  /** 释放独立音频运行时并重置初始化状态。 */ dispose(){overrides={};initialized=false;return runtime.dispose()},
 }
}