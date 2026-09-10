import { WebGL2Renderer } from '/src/renderer/WebGL2Renderer'
import { WebGL2Renderer as Baseline } from '/baseline-webgl20.ts'
import { renderingSettings, activePostProcessing } from '/src/renderer/renderSettings'
import { multisampleCount } from '/src/renderer/outputQuality20'

export async function run() {
 const checks=[],captures=[],observations=[]
 const assert=(condition,message)=>{if(!condition)throw Error(message)}
 const check=async(name,fn)=>{try{await fn();checks.push({name,status:'passed'})}catch(e){checks.push({name,status:'failed',error:String(e.message??e)})}}
 const make=Type=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=192;document.body.append(canvas);return{canvas,renderer:new Type(canvas)}}
 const shape=(i=0)=>({shape:'Polygon',position:{x:(i%10-5)*.15,y:(Math.floor(i/10)%10-5)*.15},rotation:i*.01,scale:{x:1,y:1},vertices:[{x:-.7,y:-.5},{x:.7,y:-.3},{x:.2,y:.7}],radiusX:1,radiusY:1,fill:{r:120+i%130,g:80,b:160,a:.8},stroke:{r:0,g:0,b:0,a:0},strokeWidth:0,sortingLayer:0,orderInLayer:0,material:'Default',blendMode:'Alpha'})
 const begin=r=>{r.beginFrame({width:192,height:192,pixelRatio:1,clearColor:{r:0,g:0,b:0,a:1}});r.beginCamera({scale:60,offset:{x:96,y:96}})}
 const draw=(target,n=30)=>{begin(target.renderer);for(let i=0;i<n;i++)target.renderer.submitShape(shape(i));target.renderer.endCamera();return target.renderer.endFrame()}
 const copy=canvas=>{const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;c.getContext('2d').drawImage(canvas,0,0);return c}
 const bytes=canvas=>copy(canvas).getContext('2d').getImageData(0,0,canvas.width,canvas.height).data
 const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i])
 const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)]
 const original=JSON.parse(JSON.stringify(renderingSettings))
 try {
 Object.assign(renderingSettings,{antiAliasing:'Auto',pixelSnap:false});renderingSettings.postProcessing.enabled=false
 await check('GPU upload arrays and painter-order pixels match the frozen 26.19 renderer',()=>{
  const before=make(Baseline),after=make(WebGL2Renderer),uploads=[]
  try{for(const target of[before,after]){const gl=target.renderer.gl,trace=[];uploads.push(trace);const data=gl.bufferData.bind(gl),sub=gl.bufferSubData.bind(gl);gl.bufferData=(kind,value,...rest)=>{if(ArrayBuffer.isView(value))trace.push({kind,values:Array.from(value)});return data(kind,value,...rest)};gl.bufferSubData=(kind,offset,value,start=0,length=value.length,...rest)=>{trace.push({kind,values:Array.from(value.subarray(start,start+length))});return sub(kind,offset,value,start,length,...rest)}}
   draw(before);draw(after);assert(JSON.stringify(uploads[0])===JSON.stringify(uploads[1]),'Vertex/index uploads changed');const a=bytes(before.canvas),b=bytes(after.canvas);assert(same(a,b),'Painter output differs');captures.push({name:'ordered-before',data:copy(before.canvas).toDataURL()},{name:'ordered-after',data:copy(after.canvas).toDataURL()});
   uploads[0].length=0;uploads[1].length=0;draw(before,1);draw(after,1);assert(JSON.stringify(uploads[0])===JSON.stringify(uploads[1]),'Shrinking frame uploaded stale vertices');assert(same(bytes(before.canvas),bytes(after.canvas)),'Shrinking output differs')
  }finally{before.renderer.destroy();after.renderer.destroy()}
 })
 await check('Linear batch assembly preserves all 16000 packets and draw boundaries',()=>{
  const timings=[]
  for(const[version,Type]of[['26.19',Baseline],['26.20',WebGL2Renderer]]){const target=make(Type);try{let counts=[];target.renderer.drawBatch=batch=>counts.push({packets:batch.length,vertices:batch.reduce((n,p)=>n+p.geometry.positions.length,0),sequence:batch.map(p=>p.sequence)});begin(target.renderer);for(let i=0;i<16000;i++)target.renderer.submitShape(shape(i));const samples=[];for(let sample=0;sample<9;sample++){counts=[];const start=performance.now();target.renderer.endFrame();samples.push(performance.now()-start)}assert(counts.reduce((n,x)=>n+x.packets,0)===16000,'Packet loss');assert(counts.every(x=>x.vertices<=65000),'Batch over limit');timings.push({version,medianMs:median(samples.slice(2)),samples,counts})}finally{target.renderer.destroy()}}
  assert(JSON.stringify(timings[0].counts)===JSON.stringify(timings[1].counts),'Batch boundaries changed');const speedup=timings[0].medianMs/Math.max(.001,timings[1].medianMs);observations.push({name:'batch-assembly',scope:'Actual endFrame packet grouping with drawBatch replaced by identical recording sink; CPU algorithm timing, not GPU FPS.',beforeMs:timings[0].medianMs,afterMs:timings[1].medianMs,speedup,packets:16000});assert(speedup>2,'Expected material reduction in quadratic batch cost: '+speedup)
 })
 await check('Retained GPU buffers grow only as required and empty frames keep no old commands',()=>{
  const target=make(WebGL2Renderer);try{let allocations=0;const gl=target.renderer.gl,original=gl.bufferData.bind(gl);gl.bufferData=(...args)=>{allocations++;return original(...args)};draw(target,100);const first=allocations;for(let i=0;i<5;i++)draw(target,100);assert(allocations===first,'Steady frames reallocate GPU storage');begin(target.renderer);const stats=target.renderer.endFrame();assert(stats.drawCalls===0&&stats.triangles===0,'Old frame redrawn');assert(target.renderer.vertexUpload.length<=65000*8,'Vertex storage unbounded')}finally{target.renderer.destroy();assert(target.renderer.vertexUpload.length===0&&target.renderer.indexUpload.length===0,'CPU upload storage retained after destroy')}}
 )
 await check('Explicit MSAA without post effects presents successfully on a default multisample surface',()=>{
  renderingSettings.postProcessing.enabled=false;renderingSettings.antiAliasing='MSAA4';const target=make(WebGL2Renderer);
  try{const stats=draw(target,1);assert(stats.antiAliasingSamples>1,'MSAA missing');assert(target.renderer.gl.getError()===0,'Invalid presentation');assert(bytes(target.canvas).some((v,i)=>i%4!==3&&v>0),'Blank presentation');captures.push({name:'msaa-without-post',data:copy(target.canvas).toDataURL()})}finally{target.renderer.destroy()}
 })
 await check('Index-heavy packet batches preserve all triangles within bounded uploads',()=>{
  renderingSettings.postProcessing.enabled=false;renderingSettings.antiAliasing='Auto';const target=make(WebGL2Renderer);try{begin(target.renderer);for(let i=0;i<5;i++)target.renderer.submitShape(shape(i));for(const packet of target.renderer.packets)packet.geometry.indices=Array.from({length:90000},(_,i)=>i%3);const batches=[];target.renderer.drawBatch=batch=>batches.push(batch.map(p=>({sequence:p.sequence,indices:p.geometry.indices.length})));target.renderer.endFrame();assert(batches.flat().length===5,'Packet loss');assert(batches.every(batch=>batch.reduce((n,p)=>n+p.indices,0)<=195000),'Index upload bound exceeded');assert(batches.flat().every((p,i)=>p.sequence===i),'Painter sequence changed')}finally{target.renderer.destroy()}
 })
 await check('Post-processing retains visible multisample edges and original effects',()=>{
  Object.assign(renderingSettings,{antiAliasing:'MSAA4',pixelSnap:false});renderingSettings.postProcessing.enabled=true
  Object.assign(activePostProcessing,{exposure:0,contrast:1,saturation:1,vignette:0,bloom:0,blur:0,userMaterial:null})
  const target=make(WebGL2Renderer);try{const stats=draw(target,1);assert(stats.antiAliasingSamples>1,'No multisample surface');const pixels=bytes(target.canvas);let edges=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>0&&pixels[i]<90)edges++;assert(edges>20,'No partially covered edge pixels');captures.push({name:'post-msaa',data:copy(target.canvas).toDataURL()});const originalPixels=Array.from(pixels);activePostProcessing.exposure=1;draw(target,1);assert(!same(originalPixels,bytes(target.canvas)),'Post effect was removed');assert(stats.backingWidth===192&&stats.backingHeight===192,'Incorrect actual resolution');observations.push({name:'actual-msaa',samples:stats.antiAliasingSamples,edgePixels:edges,backing:[192,192]})}finally{target.renderer.destroy()}
 })
 await check('MSAA device and allocation bounds never lower the logical resolution',()=>{
  assert(multisampleCount(8,[8,4,2],4096,4096)===2,'Memory cap not respected');assert(multisampleCount(8,[4,2],192,192)===4,'Unsupported sample count selected');assert(multisampleCount(8,[8,4,2],NaN,10)===0,'Invalid allocation accepted');renderingSettings.antiAliasing='Auto';renderingSettings.pixelSnap=true;const target=make(WebGL2Renderer);try{const stats=draw(target,1);assert(stats.antiAliasingSamples===0,'Auto added smoothing to pixel-art effects')}finally{target.renderer.destroy()}
 })
 }finally{Object.assign(renderingSettings,original)}
 return{checks,captures,observations}
}
