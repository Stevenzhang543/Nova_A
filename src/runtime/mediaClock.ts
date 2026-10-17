/** 媒体时钟协调：提供音频、动画及时间线之间共享的播放时间状态。 */
/** Common integer clock: exactly divisible by supported 44.1/48/96 kHz sample rates. */
export const MEDIA_TICKS_PER_SECOND = 14_112_000
export interface MediaClockSnapshot { ticks:number; seconds:number; frame:number; sample:number; frameRate:number; sampleRate:number }
/** 把有限秒数转换为四舍五入的采样位置，拒绝无效采样率及超出安全整数的结果。 */ export function mediaSample(seconds:number,sampleRate:number):number {
  if(!Number.isFinite(seconds)||!Number.isFinite(sampleRate)||sampleRate<=0)throw new Error('MEDIA_CLOCK_INPUT: Sample positions require finite time and a positive sample rate.')
  const sample=Math.round(seconds*sampleRate)
  if(!Number.isSafeInteger(sample))throw new Error('MEDIA_CLOCK_LIMIT: Sample position exceeds the integer clock range.')
  return sample
}
/** 验证时间和帧率后计算向下取整帧位置，加入微小容差抵消边界浮点误差。 */ export function mediaFrame(seconds:number,frameRate:number):number {
  if(!Number.isFinite(seconds)||!Number.isFinite(frameRate)||frameRate<=0)throw new Error('MEDIA_CLOCK_INPUT: Frame positions require finite time and a positive frame rate.')
  return Math.floor(seconds*frameRate+1e-9)
}
/* 计算表达式 mediaFrame(seconds,frameRate)/frameRate 并返回结果，沿用操作数的原有类型规则。 */ export function mediaFrameTime(seconds:number,frameRate:number):number{return mediaFrame(seconds,frameRate)/frameRate}
export class MediaClock {
  private ticksValue=0
  private remainder=0
  /** 初始化 MediaClock 实例时调用 this.seek(seconds)；不显式返回调用结果。 */ constructor(seconds=0){this.seek(seconds)}
  /* 返回 this.ticksValue 的当前值。 */ get ticks():number{return this.ticksValue}
  /* 计算表达式 this.ticksValue/MEDIA_TICKS_PER_SECOND 并返回结果，沿用操作数的原有类型规则。 */ get seconds():number{return this.ticksValue/MEDIA_TICKS_PER_SECOND}
  /** 定位整数媒体时钟，并保留不足一刻度的小数余量。 */ seek(seconds:number):void {
    const ticks=mediaSample(seconds,MEDIA_TICKS_PER_SECOND)
    this.ticksValue=ticks;this.remainder=seconds*MEDIA_TICKS_PER_SECOND-ticks
  }
  /** 按速度推进时钟并累积小数余量，拒绝非有限输入及超出整数范围的推进。 */ advance(delta:number,speed=1):number {
    if(!Number.isFinite(delta)||!Number.isFinite(speed))throw new Error('MEDIA_CLOCK_INPUT: Clock advancement must be finite.')
    const exact=delta*speed*MEDIA_TICKS_PER_SECOND+this.remainder,step=Math.round(exact),next=this.ticksValue+step
    if(!Number.isSafeInteger(step)||!Number.isSafeInteger(next))throw new Error('MEDIA_CLOCK_LIMIT: Clock advancement exceeds the integer range.')
    this.ticksValue=next;this.remainder=exact-step;return this.seconds
  }
  /** 构造并返回记录 {ticks:this.ticks,seconds:this.seconds,frame:mediaFrame(this.seconds,frameRate),sample:mediaSample(this.seconds,sampleRate),frameRate,sampleRate}，字段按当前实参及捕获状态求值。 */ snapshot(frameRate=60,sampleRate=48000):MediaClockSnapshot{return {ticks:this.ticks,seconds:this.seconds,frame:mediaFrame(this.seconds,frameRate),sample:mediaSample(this.seconds,sampleRate),frameRate,sampleRate}}
}
