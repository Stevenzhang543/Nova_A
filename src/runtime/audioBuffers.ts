/** Sample-addressed decoded transport. Streaming continues to use HTMLMediaElement. */
export interface AudioPlaybackElement {
  currentTime:number;readonly duration:number;volume:number;playbackRate:number;loop:boolean;readonly paused:boolean;readonly ended:boolean;src:string;preload:string
  play():Promise<void>;pause():void;load():void;removeAttribute(name:string):void
  addEventListener(name:string,handler:()=>void,options?:{once?:boolean}):void
  removeEventListener(name:string,handler:()=>void):void
}
interface BufferEntry {buffer:AudioBuffer;reverse:AudioBuffer|null;references:number;lastUse:number;bytes:number}
export const MAX_DECODED_AUDIO_BYTES=64*1024*1024
export const MAX_AUDIO_CLIP_BYTES=32*1024*1024
export class AudioBufferCache {
  private entries=new Map<string,BufferEntry>()
  private pending=new Map<string,{promise:Promise<BufferEntry>;waiters:number}>()
  private serial=0
  private generation=0
  constructor(private context:BaseAudioContext){}
  get byteLength():number{return [...this.entries.values()].reduce((sum,entry)=>sum+entry.bytes,0)}
  get size():number{return this.entries.size}
  private makeRoom(bytes:number):void{
    for(const [key,entry] of [...this.entries].sort((a,b)=>a[1].lastUse-b[1].lastUse)){if(this.byteLength+bytes<=MAX_DECODED_AUDIO_BYTES)break;if(!entry.references)this.entries.delete(key)}
    if(this.byteLength+bytes>MAX_DECODED_AUDIO_BYTES)throw new Error('AUDIO_BUFFER_LIMIT: Decoded audio exceeds the 64 MiB resident budget.')
  }
  async acquire(source:string):Promise<{buffer:AudioBuffer;reversed:()=>AudioBuffer;release:()=>void}>{
    let entry=this.entries.get(source)
    if(!entry){
      let request=this.pending.get(source)
      if(!request){
        if(this.pending.size>=16)throw new Error('AUDIO_DECODE_LIMIT: At most sixteen clips may decode concurrently.')
        const generation=this.generation
        const slot={promise:null as unknown as Promise<BufferEntry>,waiters:0}
        slot.promise=(async()=>{const response=await fetch(source);if(!response.ok)throw new Error(`Audio source read failed (${response.status}).`);const advertised=Number(response.headers.get('content-length'));if(advertised>MAX_AUDIO_CLIP_BYTES)throw new Error('AUDIO_CLIP_LIMIT: Compressed audio exceeds 32 MiB. Use streaming.');const data=await response.arrayBuffer();if(data.byteLength>MAX_AUDIO_CLIP_BYTES)throw new Error('AUDIO_CLIP_LIMIT: Compressed audio exceeds 32 MiB. Use streaming.');const buffer=await this.context.decodeAudioData(data),bytes=buffer.length*buffer.numberOfChannels*4;if(generation!==this.generation)throw new Error('AUDIO_DISPOSED: Decode completed after session disposal.');if(bytes>MAX_AUDIO_CLIP_BYTES)throw new Error('AUDIO_CLIP_LIMIT: Decoded clip exceeds 32 MiB. Use streaming.');this.makeRoom(bytes);const created={buffer,reverse:null,references:slot.waiters,lastUse:++this.serial,bytes};this.entries.set(source,created);return created})().finally(()=>{if(this.pending.get(source)===slot)this.pending.delete(source)})
        request=slot;this.pending.set(source,slot)
      }
      request.waiters++;entry=await request.promise
    }else entry.references++
    entry.lastUse=++this.serial
    let released=false
    return {buffer:entry.buffer,reversed:()=>{if(released)throw new Error('AUDIO_DISPOSED: Buffer lease was released.');if(!entry!.reverse){const bytes=entry!.buffer.length*entry!.buffer.numberOfChannels*4;this.makeRoom(bytes);const reverse=this.context.createBuffer(entry!.buffer.numberOfChannels,entry!.buffer.length,entry!.buffer.sampleRate);for(let channel=0;channel<reverse.numberOfChannels;channel++){const input=entry!.buffer.getChannelData(channel),output=reverse.getChannelData(channel);for(let index=0;index<input.length;index++)output[index]=input[input.length-1-index]}entry!.reverse=reverse;entry!.bytes+=bytes}return entry!.reverse},release:()=>{if(!released){released=true;entry!.references--}}}
  }
  clear():void{this.generation++;this.entries.clear();this.pending.clear()}
}

export class BufferedAudioPlayback implements AudioPlaybackElement {
  readonly output:GainNode
  preload='auto'
  private lease:Awaited<ReturnType<AudioBufferCache['acquire']>>|null=null
  private loading:Promise<void>|null=null
  private node:AudioBufferSourceNode|null=null
  private listeners=new Map<string,Array<{handler:()=>void;once:boolean}>>()
  private position=0
  private anchor=0
  private rate=1
  private looping=false
  private stopped=true
  private finished=false
  private disposed=false
  private start=0
  private end=0
  private serial=0
  constructor(private context:BaseAudioContext,public src:string,private cache:AudioBufferCache){this.output=context.createGain()}
  get volume():number{return this.output.gain.value}
  set volume(value:number){this.output.gain.value=Math.max(0,Math.min(1,value))}
  get duration():number{return this.lease?.buffer.duration??Number.NaN}
  get paused():boolean{return this.stopped}
  get ended():boolean{return this.finished}
  get currentTime():number{
    let value=this.position+(this.stopped?0:(this.context.currentTime-this.anchor)*this.rate)
    const end=this.end||this.duration
    if(this.looping&&end>this.start)value=this.start+((value-this.start)%(end-this.start)+(end-this.start))%(end-this.start)
    return Math.max(this.start,Math.min(Number.isFinite(end)?end:Number.POSITIVE_INFINITY,value))
  }
  set currentTime(value:number){if(!Number.isFinite(value))throw new Error('AUDIO_SEEK: Time must be finite.');this.position=Math.max(this.start,Math.min(this.end||Number.POSITIVE_INFINITY,value));this.anchor=this.context.currentTime;this.finished=false;if(!this.stopped)this.schedule()}
  get playbackRate():number{return this.rate}
  set playbackRate(value:number){if(!Number.isFinite(value)||Math.abs(value)>1024)throw new Error('AUDIO_RATE: Buffered playback supports finite rates from -1024 through 1024.');if(value===this.rate)return;this.position=this.currentTime;this.anchor=this.context.currentTime;this.rate=value;if(!this.stopped)this.schedule()}
  get loop():boolean{return this.looping}
  set loop(value:boolean){if(value===this.looping)return;this.position=this.currentTime;this.anchor=this.context.currentTime;this.looping=value;if(!this.stopped)this.schedule()}
  setBounds(start:number,end:number):void{if(start===this.start&&end===this.end)return;this.position=this.currentTime;this.anchor=this.context.currentTime;this.start=Math.max(0,start);this.end=Math.max(this.start,end);if(!this.stopped)this.schedule()}
  async play():Promise<void>{
    if(this.disposed)throw new Error('AUDIO_DISPOSED: Playback has been released.')
    if(!this.stopped){if(this.loading)await this.loading;return}
    this.stopped=false;this.finished=false;this.anchor=this.context.currentTime
    if(!this.lease){this.loading??=this.cache.acquire(this.src).then(lease=>{if(this.disposed){lease.release();return}this.lease=lease}).finally(()=>{this.loading=null});try{await this.loading}catch(error){this.stopped=true;throw error}}
    if(!this.stopped&&!this.disposed){this.position=this.currentTime;this.anchor=this.context.currentTime;this.schedule()}
  }
  pause():void{this.position=this.currentTime;this.anchor=this.context.currentTime;this.stopped=true;this.stopNode()}
  load():void{}
  removeAttribute(name:string):void{if(name==='src'){this.pause();this.src='';this.disposed=true;this.lease?.release();this.lease=null;this.output.disconnect();this.listeners.clear()}}
  addEventListener(name:string,handler:()=>void,options?:{once?:boolean}):void{const listeners=this.listeners.get(name)??[];listeners.push({handler,once:options?.once===true});this.listeners.set(name,listeners)}
  removeEventListener(name:string,handler:()=>void):void{this.listeners.set(name,(this.listeners.get(name)??[]).filter(value=>value.handler!==handler))}
  private emit(name:string):void{for(const entry of [...(this.listeners.get(name)??[])]){if(entry.once)this.removeEventListener(name,entry.handler);entry.handler()}}
  private stopNode():void{this.serial++;if(this.node){this.node.onended=null;try{this.node.stop()}catch{/* Already ended. */}this.node.disconnect();this.node=null}}
  private schedule():void{
    this.stopNode();if(!this.lease||this.stopped||this.disposed||this.rate===0)return
    const duration=this.lease.buffer.duration,end=Math.min(duration,this.end||duration),start=Math.min(end,this.start),reverse=this.rate<0
    this.position=Math.max(start,Math.min(end,this.position));this.anchor=this.context.currentTime
    if(!this.looping&&(reverse?this.position<=start:this.position>=end)){this.stopped=true;this.finished=true;this.emit('ended');return}
    const node=this.context.createBufferSource(),serial=this.serial;node.buffer=reverse?this.lease.reversed():this.lease.buffer;node.playbackRate.value=Math.abs(this.rate);node.loop=this.looping
    node.loopStart=reverse?duration-end:start;node.loopEnd=reverse?duration-start:end;node.connect(this.output)
    node.onended=()=>{if(serial!==this.serial)return;this.position=reverse?start:end;this.stopped=true;this.finished=true;node.disconnect();this.node=null;this.emit('timeupdate');this.emit('ended')}
    const offset=Math.round((reverse?duration-this.position:this.position)*node.buffer.sampleRate)/node.buffer.sampleRate
    if(this.looping)node.start(0,offset);else node.start(0,offset,Math.max(0,reverse?this.position-start:end-this.position))
    this.node=node
  }
}
