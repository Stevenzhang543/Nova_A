/** 音频缓冲管理：加载或生成可播放缓冲，管理解码缓存及相关处理任务。 */
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
  /** 保存用于音频解码与反转缓冲构造的音频上下文。 */ constructor(private context:BaseAudioContext){}
  /* 调用 [...this.entries.values()].reduce((sum,entry)=>sum+entry.bytes,0) 并返回调用结果。 */ get byteLength():number{return [...this.entries.values()].reduce(/* 计算表达式 sum+entry.bytes 并返回结果，沿用操作数的原有类型规则。 */ (sum,entry)=>sum+entry.bytes,0)}
  /* 返回 this.entries.size 的当前值。 */ get size():number{return this.entries.size}
  /** 按最近使用顺序逐出无引用缓冲，仍不能满足驻留预算时拒绝分配。 */ private makeRoom(bytes:number):void{
    for(const [key,entry] of [...this.entries].sort(/* 计算表达式 a[1].lastUse-b[1].lastUse 并返回结果，沿用操作数的原有类型规则。 */ (a,b)=>a[1].lastUse-b[1].lastUse)){if(this.byteLength+bytes<=MAX_DECODED_AUDIO_BYTES)break;if(!entry.references)this.entries.delete(key)}
    if(this.byteLength+bytes>MAX_DECODED_AUDIO_BYTES)throw new Error('AUDIO_BUFFER_LIMIT: Decoded audio exceeds the 64 MiB resident budget.')
  }
  /** 按源码地址复用缓冲或合并解码请求，限制并发与大小，返回引用计数控制的正反向缓冲租约。 */ async acquire(source:string):Promise<{buffer:AudioBuffer;reversed:()=>AudioBuffer;release:()=>void}>{
    let entry=this.entries.get(source)
    if(!entry){
      let request=this.pending.get(source)
      if(!request){
        if(this.pending.size>=16)throw new Error('AUDIO_DECODE_LIMIT: At most sixteen clips may decode concurrently.')
        const generation=this.generation
        const slot={promise:null as unknown as Promise<BufferEntry>,waiters:0}
        slot.promise=(/** 读取音频并验证压缩大小，解码后检查会话代次和内存预算，再建立带等待者引用数的缓存。 */ async()=>{const response=await fetch(source);if(!response.ok)throw new Error(`Audio source read failed (${response.status}).`);const advertised=Number(response.headers.get('content-length'));if(advertised>MAX_AUDIO_CLIP_BYTES)throw new Error('AUDIO_CLIP_LIMIT: Compressed audio exceeds 32 MiB. Use streaming.');const data=await response.arrayBuffer();if(data.byteLength>MAX_AUDIO_CLIP_BYTES)throw new Error('AUDIO_CLIP_LIMIT: Compressed audio exceeds 32 MiB. Use streaming.');const buffer=await this.context.decodeAudioData(data),bytes=buffer.length*buffer.numberOfChannels*4;if(generation!==this.generation)throw new Error('AUDIO_DISPOSED: Decode completed after session disposal.');if(bytes>MAX_AUDIO_CLIP_BYTES)throw new Error('AUDIO_CLIP_LIMIT: Decoded clip exceeds 32 MiB. Use streaming.');this.makeRoom(bytes);const created={buffer,reverse:null,references:slot.waiters,lastUse:++this.serial,bytes};this.entries.set(source,created);return created})().finally(/** 仅在该解码槽仍是当前请求时清理等待项。 */ ()=>{if(this.pending.get(source)===slot)this.pending.delete(source)})
        request=slot;this.pending.set(source,slot)
      }
      request.waiters++;entry=await request.promise
    }else entry.references++
    entry.lastUse=++this.serial
    let released=false
    return {buffer:entry.buffer,reversed:/** 按需分配并逐声道生成反转样本缓存，已释放租约拒绝访问。 */ ()=>{if(released)throw new Error('AUDIO_DISPOSED: Buffer lease was released.');if(!entry!.reverse){const bytes=entry!.buffer.length*entry!.buffer.numberOfChannels*4;this.makeRoom(bytes);const reverse=this.context.createBuffer(entry!.buffer.numberOfChannels,entry!.buffer.length,entry!.buffer.sampleRate);for(let channel=0;channel<reverse.numberOfChannels;channel++){const input=entry!.buffer.getChannelData(channel),output=reverse.getChannelData(channel);for(let index=0;index<input.length;index++)output[index]=input[input.length-1-index]}entry!.reverse=reverse;entry!.bytes+=bytes}return entry!.reverse},release:/** 幂等释放本租约持有的缓冲引用。 */ ()=>{if(!released){released=true;entry!.references--}}}
  }
  /** 递增缓存代次使迟到解码失效，并清空缓存和等待请求引用。 */ clear():void{this.generation++;this.entries.clear();this.pending.clear()}
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
  /** 将 context.createGain() 赋给 this.output，不显式返回值。 */ constructor(private context:BaseAudioContext,public src:string,private cache:AudioBufferCache){this.output=context.createGain()}
  /* 返回 this.output.gain.value 的当前值。 */ get volume():number{return this.output.gain.value}
  /** 将 Math.max(0,Math.min(1,value)) 赋给 this.output.gain.value，不显式返回值。 */ set volume(value:number){this.output.gain.value=Math.max(0,Math.min(1,value))}
  /* 当 this.lease?.buffer.duration 为 null 或 undefined 时返回 Number.NaN，否则保留左侧值。 */ get duration():number{return this.lease?.buffer.duration??Number.NaN}
  /* 返回 this.stopped 的当前值。 */ get paused():boolean{return this.stopped}
  /* 返回 this.finished 的当前值。 */ get ended():boolean{return this.finished}
  /** 依据音频时钟和速率推算当前位置，循环时折返到区间并限制边界。 */ get currentTime():number{
    let value=this.position+(this.stopped?0:(this.context.currentTime-this.anchor)*this.rate)
    const end=this.end||this.duration
    if(this.looping&&end>this.start)value=this.start+((value-this.start)%(end-this.start)+(end-this.start))%(end-this.start)
    return Math.max(this.start,Math.min(Number.isFinite(end)?end:Number.POSITIVE_INFINITY,value))
  }
  /** 验证并设置播放位置，重置结束状态，正在播放时重新安排节点。 */ set currentTime(value:number){if(!Number.isFinite(value))throw new Error('AUDIO_SEEK: Time must be finite.');this.position=Math.max(this.start,Math.min(this.end||Number.POSITIVE_INFINITY,value));this.anchor=this.context.currentTime;this.finished=false;if(!this.stopped)this.schedule()}
  /* 返回 this.rate 的当前值。 */ get playbackRate():number{return this.rate}
  /** 限制播放速率，保留切换前位置并按新速率重新安排活动音源。 */ set playbackRate(value:number){if(!Number.isFinite(value)||Math.abs(value)>1024)throw new Error('AUDIO_RATE: Buffered playback supports finite rates from -1024 through 1024.');if(value===this.rate)return;this.position=this.currentTime;this.anchor=this.context.currentTime;this.rate=value;if(!this.stopped)this.schedule()}
  /* 返回 this.looping 的当前值。 */ get loop():boolean{return this.looping}
  /** 修改循环状态前捕获当前位置，并重新安排活动音源。 */ set loop(value:boolean){if(value===this.looping)return;this.position=this.currentTime;this.anchor=this.context.currentTime;this.looping=value;if(!this.stopped)this.schedule()}
  /** 记录当前播放位置后更新播放区间，正在播放时重新安排音源。 */ setBounds(start:number,end:number):void{if(start===this.start&&end===this.end)return;this.position=this.currentTime;this.anchor=this.context.currentTime;this.start=Math.max(0,start);this.end=Math.max(this.start,end);if(!this.stopped)this.schedule()}
  /** 拒绝已释放播放器，合并异步缓冲加载并在仍可播放时按当前时钟启动音源。 */ async play():Promise<void>{
    if(this.disposed)throw new Error('AUDIO_DISPOSED: Playback has been released.')
    if(!this.stopped){if(this.loading)await this.loading;return}
    this.stopped=false;this.finished=false;this.anchor=this.context.currentTime
    if(!this.lease){this.loading??=this.cache.acquire(this.src).then(/** 解码完成后检查播放器是否已销毁，已销毁立即释放租约，否则保存租约。 */ lease=>{if(this.disposed){lease.release();return}this.lease=lease}).finally(/** 将 null 赋给 this.loading，不显式返回值。 */ ()=>{this.loading=null});try{await this.loading}catch(error){this.stopped=true;throw error}}
    if(!this.stopped&&!this.disposed){this.position=this.currentTime;this.anchor=this.context.currentTime;this.schedule()}
  }
  /** 捕获当前播放位置，标记暂停并停止现有音源节点。 */ pause():void{this.position=this.currentTime;this.anchor=this.context.currentTime;this.stopped=true;this.stopNode()}
  /** 保留媒体元素兼容的空加载入口，实际缓冲加载由播放方法触发。 */ load():void{}
  /** 移除 src 时暂停并终结播放器，释放缓冲引用、输出连接和事件监听。 */ removeAttribute(name:string):void{if(name==='src'){this.pause();this.src='';this.disposed=true;this.lease?.release();this.lease=null;this.output.disconnect();this.listeners.clear()}}
  /** 按事件名登记处理器及单次执行标记。 */ addEventListener(name:string,handler:()=>void,options?:{once?:boolean}):void{const listeners=this.listeners.get(name)??[];listeners.push({handler,once:options?.once===true});this.listeners.set(name,listeners)}
  /** 从指定事件的监听列表删除匹配处理器。 */ removeEventListener(name:string,handler:()=>void):void{this.listeners.set(name,(this.listeners.get(name)??[]).filter(/* 比较 value.handler 与 handler，返回严格不等的判断结果。 */ value=>value.handler!==handler))}
  /** 复制当前监听列表后依次触发，单次处理器在调用前移除。 */ private emit(name:string):void{for(const entry of [...(this.listeners.get(name)??[])]){if(entry.once)this.removeEventListener(name,entry.handler);entry.handler()}}
  /** 失效旧节点结束回调，停止并断开当前音源，容忍已结束状态。 */ private stopNode():void{this.serial++;if(this.node){this.node.onended=null;try{this.node.stop()}catch{/* Already ended. */}this.node.disconnect();this.node=null}}
  /** 按播放区间、方向、速度及循环设置重建音源，对齐采样偏移并绑定代次保护的结束处理。 */ private schedule():void{
    this.stopNode();if(!this.lease||this.stopped||this.disposed||this.rate===0)return
    const duration=this.lease.buffer.duration,end=Math.min(duration,this.end||duration),start=Math.min(end,this.start),reverse=this.rate<0
    this.position=Math.max(start,Math.min(end,this.position));this.anchor=this.context.currentTime
    if(!this.looping&&(reverse?this.position<=start:this.position>=end)){this.stopped=true;this.finished=true;this.emit('ended');return}
    const node=this.context.createBufferSource(),serial=this.serial;node.buffer=reverse?this.lease.reversed():this.lease.buffer;node.playbackRate.value=Math.abs(this.rate);node.loop=this.looping
    node.loopStart=reverse?duration-end:start;node.loopEnd=reverse?duration-start:end;node.connect(this.output)
    node.onended=/** 仅处理当前音源代次的结束，更新边界位置并释放节点，发出时间和结束事件。 */ ()=>{if(serial!==this.serial)return;this.position=reverse?start:end;this.stopped=true;this.finished=true;node.disconnect();this.node=null;this.emit('timeupdate');this.emit('ended')}
    const offset=Math.round((reverse?duration-this.position:this.position)*node.buffer.sampleRate)/node.buffer.sampleRate
    if(this.looping)node.start(0,offset);else node.start(0,offset,Math.max(0,reverse?this.position-start:end-this.position))
    this.node=node
  }
}
