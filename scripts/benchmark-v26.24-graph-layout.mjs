/** 大图布局实测：在同一进程交替运行 26.23 基线与当前源码，记录分位数而不伪装成 GPU 帧率。 */
import assert from 'node:assert/strict'
import {gunzipSync} from 'node:zlib'
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {tmpdir,cpus} from 'node:os'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {build} from 'vite'
const engineVersion=JSON.parse(await readFile('package.json','utf8')).version
const temporary=await mkdtemp(join(tmpdir(),'nova-layout24-bench-')),baselineCommit='0bfc303',results=[]
/** 提供完整确定性节点/端口身份的长链；尺寸变化模拟实际测量后的不同节点高度。 */
function fixture(count){
  const nodes=Array.from({length:count},/** 每个节点的尺寸由序号确定，两版本使用相同输入。 */ (_,i)=>({uuid:'n'+String(i).padStart(5,'0'),type:'operation',position:{x:0,y:0},size:{width:224+(i%3)*20,height:110+(i%5)*14},pins:[{uuid:'in'+i,key:'input',direction:'input',kind:'data'},{uuid:'out'+i,key:'result',direction:'output',kind:'data'}]}))
  return{nodes,edges:nodes.slice(1).map(/** 相邻节点使用唯一连线，防止测量绕过真实布线工作。 */ (node,i)=>({uuid:'e'+i,from:{nodeUuid:nodes[i].uuid,pinUuid:'out'+i},to:{nodeUuid:node.uuid,pinUuid:'in'+(i+1)}}))}
}
/** 最近秩法计算样本分位数，同时保留原始测量；不对缺失样本作估算。 */
function distribution(values){const sorted=[...values].sort(/** 数值升序供分位定位。 */ (a,b)=>a-b);return{samples:values,p50:sorted[Math.ceil(sorted.length*.5)-1],p95:sorted[Math.ceil(sorted.length*.95)-1],p99:sorted[Math.ceil(sorted.length*.99)-1],max:sorted.at(-1)}}
/** 哈希布局语义输出，排除耗时计数，确保同一版本重复运行结果确定且两版本未移除节点和路径。 */
function digest(result){return createHash('sha256').update(JSON.stringify({positions:result.positions,routes:result.routes,regions:result.regions,diagnostics:result.diagnostics})).digest('hex')}
try{
  const baselineFixture='scripts/fixtures/layout24-baseline',manifest=JSON.parse(await readFile(baselineFixture+'/manifest.json','utf8'))
  const bytes=gunzipSync(await readFile(baselineFixture+'/graphLayoutEngine-v26.23.ts.gz'),{maxOutputLength:1_000_000})
  assert.equal(manifest.baselineCommit,baselineCommit);assert.equal(bytes.length,manifest.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.sha256)
  const before=bytes.toString('utf8'),current=await readFile('src/visual/graphLayoutEngine.ts','utf8')
  await writeFile(join(temporary,'baseline.ts'),before)
  await build({configFile:false,root:process.cwd(),logLevel:'error',build:{ssr:true,outDir:temporary,emptyOutDir:false,rollupOptions:{input:{baseline:join(temporary,'baseline.ts'),current:resolve('src/visual/graphLayoutEngine.ts')},output:{entryFileNames:'[name].mjs'}}}})
  const engines={baseline:await import(pathToFileURL(join(temporary,'baseline.mjs'))),current:await import(pathToFileURL(join(temporary,'current.mjs')))}
  for(const count of [100,1000,10000]){
    const input=fixture(count),original=JSON.stringify(input),samples={baseline:[],current:[]},hashes={},positionHashes={},failures={}
    for(let repetition=-2;repetition<15;repetition++)for(const label of repetition%2?['current','baseline']:['baseline','current']){
      const start=performance.now(),result=engines[label].layoutGraph(input),elapsed=performance.now()-start
      assert.equal(Object.keys(result.positions).length,count);assert.equal(Object.keys(result.routes).length+result.metrics.routeFailures,count-1)
      if(label==='current')assert.equal(result.metrics.routeFailures,0,'Current variable-size chain must route every edge')
      assert.ok(elapsed<30000,'Declared layout time bound exceeded')
      failures[label]=result.metrics.routeFailures
      const positionHash=createHash('sha256').update(JSON.stringify(result.positions)).digest('hex');if(positionHashes[label])assert.equal(positionHashes[label],positionHash);else positionHashes[label]=positionHash

      const hash=digest(result);if(hashes[label])assert.equal(hash,hashes[label]);else hashes[label]=hash
      if(repetition>=0)samples[label].push(elapsed)
    }
    assert.equal(JSON.stringify(input),original);assert.equal(positionHashes.baseline,positionHashes.current,'Unpinned input retains baseline node positions');assert.ok(failures.current<=failures.baseline)
    results.push({nodes:count,edges:count-1,baseline:distribution(samples.baseline),current:distribution(samples.current),resultSha256:hashes.current,baselineResultSha256:hashes.baseline,routeFailures:failures})
    console.log(JSON.stringify(results.at(-1)))
  }
  await mkdir('release-audits',{recursive:true})
  await writeFile('release-audits/v26.24-graph-layout-benchmarks.json',JSON.stringify({format:'nova-v26.24-graph-layout-benchmarks',version:1,status:'passed',targetRelease:'26.24',development:engineVersion!=='26.24.0',engineVersion,expectedRelease:'26.24',qualifiedRelease:engineVersion==='26.24.0'?'26.24':null,generatedAt:new Date().toISOString(),baselineFixture,baselineCommit,baselineSourceSha256:createHash('sha256').update(before).digest('hex'),currentSourceSha256:createHash('sha256').update(current).digest('hex'),environment:{node:process.version,cpu:cpus()[0]?.model,logicalProcessors:cpus().length},warmupPerEngine:2,measuredPerEngine:15,results,scope:'Synchronous CPU layout and routing. Alternating same-process versions, identical inputs and retained output hashes. No GPU, browser interaction latency, universal speedup or animation-removal claim.'})+'\n')
}finally{await rm(temporary,{recursive:true,force:true})}
