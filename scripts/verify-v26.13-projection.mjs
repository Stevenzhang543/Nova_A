/** 验证脚本（v26.13-projection）：组织对应功能与边界场景检查，断言行为并汇总验证结果。 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'

const root=process.cwd(),option=/* 调用 process.argv.find(value=>value.startsWith('--'+name+'='))?.slice(name.length+3) 并返回调用结果。 */ name=>process.argv.find(/* 调用 value.startsWith('--'+name+'=') 并返回调用结果。 */ value=>value.startsWith('--'+name+'='))?.slice(name.length+3)
const sourceRoot=resolve(option('source-root')??root),baselineRoot=resolve(option('baseline-root')??root),staged=sourceRoot!==root
const {rhaiCorpus}=await import(pathToFileURL(join(root,'scripts/fixtures/v26.12-rhai-corpus.mjs')).href)
await mkdir(join(root,'.cache'),{recursive:true})
const temporary=await mkdtemp(join(root,'.cache','nova-v2613-projection-')),checks=[],benchmarks=[],failures=[]
const check=/** 执行异步投影检查，保存异常、错误文本和堆栈供汇总。 */ async(name,operation)=>{try{await operation();checks.push({name,status:'passed'})}catch(error){failures.push(error);checks.push({name,status:'failed',error:String(error),stack:error.stack})}}
const bundle=/** 分别构建并导入隔离版本的图语法、类型、编译及字段模块，支持当前源码回退。 */ async(directory,target)=>{
  const overlay={name:'isolated-projection-source',enforce:'pre',/** 解析隔离投影源码的相对依赖，WASM产物从当前仓库复用，其余优先使用目标版本。 */ resolveId(source,importer){
    if(!importer||!source.startsWith('.'))return null
    const raw=resolve(dirname(importer.split('?')[0]),source)
    // Archived authored-source snapshots omit generated WASM glue. Both source
    // profiles intentionally use the explicitly reported production runtime.
    if(raw.startsWith(join(target,'nova_core')+sep))for(const extension of ['','.js','.json']){const artifact=join(root,raw.slice(target.length+1)+extension);if(existsSync(artifact))return artifact.replaceAll('\\','/')}
    const prefix=[join(target,'src'),join(root,'src')].find(/* 调用 raw.startsWith(prefix+sep) 并返回调用结果。 */ prefix=>raw.startsWith(prefix+sep))
    if(!prefix)return null
    const relative=raw.slice(prefix.length+1)
    for(const base of [target,root])for(const extension of ['','.ts','.json','.js','/index.ts']){const proposed=join(base,'src',relative+extension);if(existsSync(proposed))return proposed.replaceAll('\\','/')}
    return null
  }}
  const paths={syntax:'visual/graphSyntax',types:'visual/graphTypes',compiler:'visual/graphCompiler',schema:'visual/graphSyntaxSchema'}
  const input=Object.fromEntries(Object.entries(paths).map(/* 返回按声明顺序构造的数组 [name,join(existsSync(join(target,'src',path+'.ts'))?target:root,'src',path+'.ts')]。 */ ([name,path])=>[name,join(existsSync(join(target,'src',path+'.ts'))?target:root,'src',path+'.ts')]))
  await build({configFile:false,root,plugins:[overlay],logLevel:'error',ssr:{noExternal:true},build:{ssr:true,outDir:directory,emptyOutDir:false,rollupOptions:{input,output:{entryFileNames:'[name].mjs',chunkFileNames:'chunks/[name]-[hash].mjs'}}}})
  return Object.fromEntries(await Promise.all(Object.keys(input).map(/* 返回按声明顺序构造的数组 [name,await import(pathToFileURL(join(directory,name+'.mjs')).href)]。 */ async name=>[name,await import(pathToFileURL(join(directory,name+'.mjs')).href)])))
}
try{
  // Separate builds prevent the overlay resolver from silently turning the
  // current-release baseline into another copy of staged source.
  const baseline=await bundle(join(temporary,'baseline'),baselineRoot),current=await bundle(join(temporary,'current'),sourceRoot)
  const wasm=await import(pathToFileURL(join(root,'nova_core/pkg/nova_core.js')).href)
  await wasm.default({module_or_path:await readFile(join(root,'nova_core/pkg/nova_core_bg.wasm'))})
  const execute=/** 执行投影测试脚本，提取命令、日志和属性或错误并释放WASM运行时。 */ source=>{const runtime=new wasm.WasmScriptRuntime();try{const {commands,logs,properties}=JSON.parse(runtime.execute_json(source,'start','{"entity":"projection-probe"}'));return{commands,logs,properties}}catch(error){return{error:String(error)}}finally{runtime.free()}}
  const compile=/** 使用指定版本模块编译图并断言有效，返回源码。 */ (modules,graph)=>{const compiled=modules.compiler.compileGraph(graph);assert.equal(compiled.valid,true,JSON.stringify(compiled.diagnostics));return compiled.source}
  const equivalent=/** 按样本预期比较执行结果，错误样本检查错误模式，其余要求完全一致。 */ (expected,actual,fixture)=>{if(fixture.error){assert.match(expected.error??'',fixture.error);assert.match(actual.error??'',fixture.error)}else{assert.equal(expected.error,undefined);assert.deepEqual(actual,expected)}}
  const fields=/** 按语法身份排序并提取图节点语义、源码范围、注释和绑定字段以比较版本。 */ graph=>graph.nodes.map(/** 提取节点的语法身份、字段、源码、注释、绑定及作用域数据。 */ node=>({id:node.config.astId,type:node.type,fields:node.config.fields,spans:node.config.fieldSpans,source:node.config.source,comments:node.config.ownedComments,binding:node.config.bindingId,scope:node.config.syntaxScopeId})).sort(/* 调用 a.id.localeCompare(b.id) 并返回调用结果。 */ (a,b)=>a.id.localeCompare(b.id))
  for(const fixture of rhaiCorpus)await check('independent baseline/staged projection and full regeneration: '+fixture.name,/** 比较基线与当前源码投影的字段，并验证原文编译和强制重建均保持执行语义。 */ ()=>{
    const original=execute(fixture.source),before=baseline.syntax.projectRhaiSyntax(fixture.source),after=current.syntax.projectRhaiSyntax(fixture.source)
    assert.deepEqual(fields(after),fields(before))
    for(const [modules,graph] of [[baseline,before],[current,after]]){
      assert.equal(compile(modules,graph),fixture.source);equivalent(original,execute(compile(modules,graph)),fixture)
      for(const node of graph.nodes)node.config.structureChanged=true
      const generated=compile(modules,graph);equivalent(original,execute(generated),fixture)
    }
  })
  await check('exact source ranges choose the matching syntax kind for equal-span wrappers',/** 验证相同源码跨度的包装节点仍映射到正确种类的转换区域。 */ ()=>{
    for(const source of ['fn value(){42} fn start(){print(value());}','fn start(){let x=1;{print(x)}}','fn start(){print(`value ${1+2}`);}']){
      const graph=current.syntax.projectRhaiSyntax(source),assessment=current.syntax.assessRhaiConversion(source,'ranges',graph),byId=new Map(graph.nodes.map(/* 返回按声明顺序构造的数组 [node.uuid,node]。 */ node=>[node.uuid,node]))
      assert.equal(assessment.valid,true)
      for(const region of assessment.regions){assert.ok(region.nodeUuid,region.kind);assert.equal(byId.get(region.nodeUuid)?.type,'rhai.'+region.kind,region.kind+' mapped to wrong equal-span wrapper')}
    }
  })
  await check('operator spans and owned comments survive indexed lookup, edits and regeneration',/** 修改运算符并强制重建，验证执行结果和各层注释恰好保留一次。 */ ()=>{
    const source='/* module */\nfn start(){// body\nlet x=1/* left */+/* right */2;print(x);if x>0{/* nested */print("ok");}}'
    const graph=current.syntax.projectRhaiSyntax(source),other=baseline.syntax.projectRhaiSyntax(source)
    assert.deepEqual(fields(graph),fields(other))
    const binary=graph.nodes.find(/* 先计算 node.type==='rhai.Binary'；仅当其为真值时求右侧 node.config.fields.operator==='+'，返回短路求值结果。 */ node=>node.type==='rhai.Binary'&&node.config.fields.operator==='+')
    current.schema.setSyntaxNodeField(binary,'operator','*',graph)
    for(const node of graph.nodes)node.config.structureChanged=true
    const generated=compile(current,graph),result=execute(generated)
    assert.deepEqual(result.logs.map(/* 返回 log.message 的当前值。 */ log=>log.message),['2','ok'])
    for(const comment of ['module','body','left','right','nested'])assert.equal((generated.match(new RegExp('/[/*] '+comment,'g'))??[]).length,1,comment)
  })
  await check('edited and linked source ranges remain current instead of using original spans',/** 验证编辑后加源码前缀仍能定位正确字面量范围，非法字面量使评估失败。 */ ()=>{
    const graph=current.syntax.projectRhaiSyntax('fn start(){let x=1;print(x);}'),literal=graph.nodes.find(/* 比较 node.type 与 'rhai.Literal'，返回严格相等的判断结果。 */ node=>node.type==='rhai.Literal')
    current.schema.setSyntaxNodeField(literal,'raw','123456789',graph)
    const source='// linked source prefix\n'+compile(current,graph),assessment=current.syntax.assessRhaiConversion(source,'edited',graph),region=assessment.regions.find(/* 比较 region.nodeUuid 与 literal.uuid，返回严格相等的判断结果。 */ region=>region.nodeUuid===literal.uuid)
    assert.equal(source.slice(region.span.start,region.span.end),'123456789')
    current.schema.setSyntaxNodeField(literal,'raw','[',graph)
    assert.equal(current.syntax.assessRhaiConversion(current.syntax.emitSyntaxGraph(graph).text,'invalid',graph).valid,false)
  })
  await check('waypoints round-trip without affecting compiler source or actual VM channels',/** 验证手工转折点序列化保留、执行不变且旧版本读取仍兼容。 */ ()=>{
    const graph=current.syntax.projectRhaiSyntax('fn start(){let x=4;print(x+1);set_position(2.0,3.0);}'),source=compile(current,graph),original=execute(source)
    graph.edges.forEach(/** 为边设置具有不同索引坐标及边界坐标的测试转折点。 */ (edge,index)=>{edge.reroutes=[{x:index+.5,y:-index-.25},{x:1_000_000,y:-1_000_000}]})
    const saved=current.types.serializeGraphDocument(graph),restored=current.types.parseGraphDocument(saved)
    const byId=new Map(restored.edges.map(/* 返回按声明顺序构造的数组 [edge.uuid,edge]。 */ edge=>[edge.uuid,edge]));for(const edge of graph.edges)assert.deepEqual(byId.get(edge.uuid).reroutes,edge.reroutes)
    assert.equal(compile(current,restored),source);assert.deepEqual(execute(compile(current,restored)),original)
    const compatibility=baseline.types.parseGraphDocument(saved);assert.equal(compile(baseline,compatibility),source)
  })
  await check('malformed/nonfinite/out-of-range and oversized waypoint lists reject without truncation',/** 验证转折点类型、有限坐标、界限和数量限制，同时允许空值缺省及合法边界数量。 */ ()=>{
    const graph=current.syntax.projectRhaiSyntax('fn start(){print(1);}'),edge=graph.edges[0]
    for(const value of [null,{},'route',[null],[{x:'1',y:2}],[{x:NaN,y:2}],[{x:Infinity,y:2}],[{x:1_000_001,y:2}],Array(65).fill({x:0,y:0})]){edge.reroutes=value;assert.throws(/* 调用 current.types.normalizeGraphDocument(graph) 并返回调用结果。 */ ()=>current.types.normalizeGraphDocument(graph),/reroute|finite|64/)}
    edge.reroutes=Array.from({length:64},/** 按索引生成横纵坐标互为相反数的转折点。 */ (_,index)=>({x:index,y:-index}));assert.equal(current.types.normalizeGraphDocument(graph).edges[0].reroutes.length,64)
    edge.reroutes=[];assert.deepEqual(current.types.normalizeGraphDocument(graph).edges[0].reroutes,[])
    delete edge.reroutes;assert.equal(Object.hasOwn(current.types.normalizeGraphDocument(graph).edges[0],'reroutes'),false)
  })
  await check('aggregate waypoint/node/edge limits reject before normalizing unrelated metadata',/** 验证全图节点、边和转折点总量超限在读取节点配置前被拒绝，十万点边界可通过。 */ ()=>{
    const graph=current.syntax.projectRhaiSyntax('fn start(){print(1);}'),point={x:0,y:0},edge=graph.edges[0],nodes=graph.nodes
    const poisoned={...nodes[0],/** 在配置被过早读取时抛错，用于验证资源限额预检顺序。 */ get config(){throw Error('POISON_CONFIG_WAS_READ')}}
    const routed={...graph,nodes:[poisoned],edges:Array.from({length:1563},/** 克隆测试边并填充六十四个转折点。 */ ()=>({...edge,reroutes:Array(64).fill(point)}))}
    assert.throws(/* 调用 current.types.normalizeGraphDocument(routed) 并返回调用结果。 */ ()=>current.types.normalizeGraphDocument(routed),/100,000/)
    assert.throws(/** 尝试规范化跨根图和例程总节点超限的文档以验证全局上限。 */ ()=>current.types.normalizeGraphDocument({...graph,nodes:Array(5000).fill(poisoned),routines:[{nodes:Array(5001).fill(poisoned),edges:[]}]}),/total node or edge/)
    assert.throws(/* 调用 current.types.normalizeGraphDocument({...graph,nodes:[poisoned],edges:Array(20001).fill(edge)}) 并返回调用结果。 */ ()=>current.types.normalizeGraphDocument({...graph,nodes:[poisoned],edges:Array(20001).fill(edge)}),/20,000|20000/)
    const boundary={...graph,edges:[...Array.from({length:1562},/** 创建唯一身份的测试边并填充六十四个转折点。 */ ()=>({...edge,uuid:current.types.graphUuid(),reroutes:Array(64).fill(point)})),{...edge,uuid:current.types.graphUuid(),reroutes:Array(32).fill(point)}]}
    assert.equal(current.types.normalizeGraphDocument(boundary).edges.reduce(/* 计算表达式 sum+edge.reroutes.length 并返回结果，沿用操作数的原有类型规则。 */ (sum,edge)=>sum+edge.reroutes.length,0),100000)
  })
  await check('stale endpoint or pin identities remain invalid even with valid waypoints',/** 验证附有手工路由的边仍会检查节点与引脚端点存在性。 */ ()=>{
    const graph=current.syntax.projectRhaiSyntax('fn start(){print(1);}'),edge=graph.edges[0]
    edge.reroutes=[{x:42,y:19}];edge.from.nodeUuid=current.types.graphUuid();assert.equal(current.compiler.validateGraph(graph).valid,false)
    const pin=current.syntax.projectRhaiSyntax('fn start(){print(1);}')
    pin.edges[0].reroutes=[{x:42,y:19}];pin.edges[0].from.pinUuid=current.types.graphUuid();assert.equal(current.compiler.validateGraph(pin).valid,false)
  })
  const array=/* 计算表达式 '['+Array(count).fill('0').join(',')+']' 并返回结果，沿用操作数的原有类型规则。 */ count=>'['+Array(count).fill('0').join(',')+']'
  const benchmarkSources=[{nodes:100,source:'fn start(){let values='+array(91)+';}'},{nodes:1000,source:'fn start(){let values='+array(955)+';}'},{nodes:10000,source:'fn start(){'+Array.from({length:10},/* 计算表达式 'let values'+index+'='+array(955)+';' 并返回结果，沿用操作数的原有类型规则。 */ (_,index)=>'let values'+index+'='+array(955)+';').join('')+';'.repeat(25)+'}'}]
  for(const fixture of benchmarkSources)await check('bounded '+fixture.nodes+' node projection and assessment',/** 测量基线和当前投影及转换评估耗时，同时确认节点规模、引脚限额和原文编译一致。 */ ()=>{
    for(const [profile,modules] of [['baseline',baseline],['current',current]]){
      const started=performance.now(),graph=modules.syntax.projectRhaiSyntax(fixture.source),projectMs=performance.now()-started
      assert.equal(graph.nodes.length,fixture.nodes);assert.ok(graph.nodes.every(/* 比较 node.pins.length 与 128，返回小于或等于的判断结果。 */ node=>node.pins.length<=128));assert.ok(fixture.source.length<=64000)
      const assessmentStarted=performance.now(),assessment=modules.syntax.assessRhaiConversion(fixture.source,'benchmark',graph),assessmentMs=performance.now()-assessmentStarted
      assert.equal(assessment.valid,true);assert.equal(compile(modules,graph),fixture.source)
      benchmarks.push({profile,nodes:graph.nodes.length,sourceLength:fixture.source.length,projectMs,assessmentMs})
    }
  })
  const output=staged?join(sourceRoot,'reports/projection-verification.json'):join(root,'release-audits/v26.13-projection.json')
  const sourceProfiles=await Promise.all([['baseline',baselineRoot],['current',sourceRoot]].map(/** 收集指定版本源码目录及关键投影文件的SHA-256身份。 */ async([profile,directory])=>({profile,directory,files:await Promise.all(['src/visual/graphSyntax.ts','src/visual/graphTypes.ts'].map(/** 从版本目录或当前仓库读取源码并计算SHA-256。 */ async path=>({path,sha256:createHash('sha256').update(await readFile(join(existsSync(join(directory,path))?directory:root,path))).digest('hex')})))})))
  await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify({status:failures.length?'failed':'passed',generatedAt:new Date().toISOString(),runtimeVersion:wasm.engine_version(),runtimeSha256:createHash('sha256').update(await readFile(join(root,'nova_core/pkg/nova_core_bg.wasm'))).digest('hex'),baselineRoot,sourceRoot,sourceProfiles,checks,benchmarks,scope:'Independent source bundles, actual WASM semantic comparison, graph persistence/bounds and local projection/assessment timing. Benchmark durations are measurements, not UI frame-rate claims.'},null,2)+'\n')
  console.log(JSON.stringify({status:failures.length?'failed':'passed',checks:checks.length,benchmarks,failed:checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item=>item.status==='failed'),output},null,2))
  if(failures.length)process.exitCode=1
}finally{await rm(temporary,{recursive:true,force:true})}
