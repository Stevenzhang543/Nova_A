/** Common integer clock: exactly divisible by supported 44.1/48/96 kHz sample rates. */
export const MEDIA_TICKS_PER_SECOND = 14_112_000
export interface MediaClockSnapshot { ticks:number; seconds:number; frame:number; sample:number; frameRate:number; sampleRate:number }
export function mediaSample(seconds:number,sampleRate:number):number {
  if(!Number.isFinite(seconds)||!Number.isFinite(sampleRate)||sampleRate<=0)throw new Error('MEDIA_CLOCK_INPUT: Sample positions require finite time and a positive sample rate.')
  const sample=Math.round(seconds*sampleRate)
  if(!Number.isSafeInteger(sample))throw new Error('MEDIA_CLOCK_LIMIT: Sample position exceeds the integer clock range.')
  return sample
}
export function mediaFrame(seconds:number,frameRate:number):number {
  if(!Number.isFinite(seconds)||!Number.isFinite(frameRate)||frameRate<=0)throw new Error('MEDIA_CLOCK_INPUT: Frame positions require finite time and a positive frame rate.')
  return Math.floor(seconds*frameRate+1e-9)
}
export function mediaFrameTime(seconds:number,frameRate:number):number{return mediaFrame(seconds,frameRate)/frameRate}
export class MediaClock {
  private ticksValue=0
  private remainder=0
  constructor(seconds=0){this.seek(seconds)}
  get ticks():number{return this.ticksValue}
  get seconds():number{return this.ticksValue/MEDIA_TICKS_PER_SECOND}
  seek(seconds:number):void {
    const ticks=mediaSample(seconds,MEDIA_TICKS_PER_SECOND)
    this.ticksValue=ticks;this.remainder=seconds*MEDIA_TICKS_PER_SECOND-ticks
  }
  advance(delta:number,speed=1):number {
    if(!Number.isFinite(delta)||!Number.isFinite(speed))throw new Error('MEDIA_CLOCK_INPUT: Clock advancement must be finite.')
    const exact=delta*speed*MEDIA_TICKS_PER_SECOND+this.remainder,step=Math.round(exact),next=this.ticksValue+step
    if(!Number.isSafeInteger(step)||!Number.isSafeInteger(next))throw new Error('MEDIA_CLOCK_LIMIT: Clock advancement exceeds the integer range.')
    this.ticksValue=next;this.remainder=exact-step;return this.seconds
  }
  snapshot(frameRate=60,sampleRate=48000):MediaClockSnapshot{return {ticks:this.ticks,seconds:this.seconds,frame:mediaFrame(this.seconds,frameRate),sample:mediaSample(this.seconds,sampleRate),frameRate,sampleRate}}
}
