/** 26.24 结构转换验证：固定种子生成控制流，强制节点重新发射，并比较原生与 WASM 的实际轨迹。 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'
import { rhaiCorpus } from './fixtures/v26.12-rhai-corpus.mjs'
const root = process.cwd(), temporary = await mkdtemp(join(tmpdir(), 'nova-graph24-'))
const checks = [], kinds = new Set()
let state = 2624
/** 确定性伪随机生成器，使失败案例可按相同种子复现。 */
function random(limit) { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state % limit }
/** 生成有界循环、遮蔽变量和动态函数调用；期望值由单独的 JavaScript 计算给出。 */
function generatedCase(index) {
  const limit = 2 + random(7), skip = random(limit), factor = 1 + random(5), bias = random(9)
  let expected = bias
  for (let value = 0; value < limit; value++) if (value !== skip) expected += value * factor
  return { name:`seed-2624-${index}`, source:`// 中文注释 ${index}\nfn scale(value){value*${factor}}\nfn start(){let total=${bias};for value in 0..${limit}{if value==${skip}{continue;}let f=Fn("scale");total+=f.call(value);} {let total=999;print(total);}print(total);}`, logs:['999', String(expected)] }
}
/** 仅比较可观察的命令、日志和导出属性；运行耗时不是语义的一部分。 */
function trace(value) { return { commands:value.commands, logs:value.logs, properties:value.properties } }
try {
  const nativeBuild = spawnSync('cargo', ['build','--locked','--offline','-p','nova_script','--example','runtime_bridge','--target-dir',resolve('target')], { encoding:'utf8', windowsHide:true, timeout:180000 })
  assert.equal(nativeBuild.status,0,nativeBuild.error?.message ?? nativeBuild.stderr)
  await build({configFile:false,root,logLevel:'error',ssr:{noExternal:true},build:{ssr:true,outDir:temporary,emptyOutDir:false,rollupOptions:{input:{modules:resolve('src/runtime/scriptModules.ts'),syntax:resolve('src/visual/graphSyntax.ts'),compiler:resolve('src/visual/graphCompiler.ts'),types:resolve('src/visual/graphTypes.ts')},output:{entryFileNames:'[name].mjs'}}}})
  const syntax=await import(pathToFileURL(join(temporary,'syntax.mjs'))), compiler=await import(pathToFileURL(join(temporary,'compiler.mjs'))), types=await import(pathToFileURL(join(temporary,'types.mjs')))
  const {resolveProjectScriptBundle}=await import(pathToFileURL(join(temporary,'modules.mjs')))
  const wasm=await import(pathToFileURL(resolve('nova_core/pkg/nova_core.js')))
  wasm.initSync({module:await readFile('nova_core/pkg/nova_core_bg.wasm')})
  const version=JSON.parse(await readFile('package.json','utf8')).version
  assert.equal(wasm.engine_version(),version,'The executable WASM must match current source authority.')
  /** 用一次性 WASM 实例执行案例，始终释放原生堆资源。 */
  function runWasm(source) {
    const vm=new wasm.WasmScriptRuntime()
    try{return {value:JSON.parse(vm.execute_json(source,'start',JSON.stringify({entity:'graph24'})))}}catch(error){return {error:String(error)}}finally{vm.free()}
  }
  /** 启动实际原生解释器桥接；进程退出、超时或无效输出均使当前案例失败。 */
  function runNative(source) {
    const result=spawnSync(resolve('target/debug/examples/runtime_bridge'+(process.platform==='win32'?'.exe':'')),{input:JSON.stringify({source,function:'start',context:{entity:'graph24'}}),encoding:'utf8',windowsHide:true,timeout:15000})
    assert.equal(result.status,0,result.error?.message ?? result.stderr)
    return JSON.parse(result.stdout)
  }
  /** 使用实际项目模块解析器加载确定的本地辅助模块，两个后端执行同一个展开契约。 */
  function bundle(source){
    const assets=[{uuid:'root',path:'Assets/Scripts/main.rhai',assetType:'script'},{uuid:'helper',path:'Assets/Scripts/helpers/math.rhai',assetType:'script'}]
    return resolveProjectScriptBundle('root',{
      resolveAsset:/* 当 assets.find(asset=>asset.uuid===reference||asset.path===reference) 为 null 或 undefined 时返回 null，否则保留左侧值。 */ reference=>assets.find(/* 先计算 asset.uuid===reference；仅当其为假值时求右侧 asset.path===reference，返回短路求值结果。 */ asset=>asset.uuid===reference||asset.path===reference)??null,
      readSource:/* 根据 uuid==='root' 的真假，分别返回 source 或 uuid==='helper'?'fn twice(value){value*2}':null。 */ uuid=>uuid==='root'?source:uuid==='helper'?'fn twice(value){value*2}':null,
      compileVisual:/** 结构说明（自动提取）：匿名回调；无显式参数；直接调用 Error；包含显式抛错路径。 */ ()=>{throw Error('This fixture only declares script assets.')}
    })
  }
  const fixtures=[...rhaiCorpus,
    {name:'project module structural declaration',source:'use "helpers/math";\nfn start(){print(twice(3));}',logs:['6'],module:true},
    {name:'chunked structural sequence',source:'fn start(){let values=['+Array.from({length:32},/* 返回 index 的当前值。 */ (_,index)=>index).join(',')+'];print(values.len());}',logs:['32']},
    ...Array.from({length:32},/* 调用 generatedCase(index) 并返回调用结果。 */ (_,index)=>generatedCase(index))]
  const invalidSource='fn start( {',unmodified=syntax.projectRhaiSyntax('fn start(){}'),originalDocument=types.serializeGraphDocument(unmodified)
  assert.equal(syntax.assessRhaiConversion(invalidSource).valid,false)
  assert.throws(/* 调用 syntax.projectRhaiSyntax(invalidSource,'Invalid',unmodified.uuid,unmodified) 并返回调用结果。 */ ()=>syntax.projectRhaiSyntax(invalidSource,'Invalid',unmodified.uuid,unmodified))
  assert.equal(types.serializeGraphDocument(unmodified),originalDocument)

  for(const fixture of fixtures){
    try{
      const graph=syntax.projectRhaiSyntax(fixture.source)
      for(const node of graph.nodes)kinds.add(node.type)
      assert.equal(compiler.compileGraph(graph).source,fixture.source)
      const reopened=types.parseGraphDocument(types.serializeGraphDocument(graph))
      assert.equal(compiler.compileGraph(reopened).source,fixture.source)
      for(const node of reopened.nodes)node.config.structureChanged=true
      const compiled=compiler.compileGraph(reopened)
      assert.equal(compiled.valid,true,JSON.stringify(compiled.diagnostics))
      const reprojected=syntax.projectRhaiSyntax(compiled.source)
      assert.equal(compiler.compileGraph(reprojected).source,compiled.source)
      const originalExecutable=fixture.module?bundle(fixture.source):fixture.source,projectedExecutable=fixture.module?bundle(compiled.source):compiled.source
      const results=[runWasm(originalExecutable),runWasm(projectedExecutable),runNative(originalExecutable),runNative(projectedExecutable)]
      if(fixture.error){for(const result of results)assert.match(result.error??'',fixture.error)}
      else{
        for(const result of results)assert.equal(result.error,undefined)
        for(const result of results.slice(1))assert.deepEqual(trace(result.value),trace(results[0].value))
        if(fixture.logs)assert.deepEqual(results[0].value.logs.map(/* 返回 log.message 的当前值。 */ log=>log.message),fixture.logs)
      }
      checks.push({name:fixture.name,status:'passed',nodes:graph.nodes.length})
    }catch(error){checks.push({name:fixture.name,status:'failed',error:String(error)})}
  }
  const report={format:'nova-v26.24-graph-equivalence',version:1,release:'26.24',engineVersion:version,expectedRelease:'26.24',qualifiedRelease:version==='26.24.0'?'26.24':null,development:version!=='26.24.0',generatedAt:new Date().toISOString(),status:checks.every(/* 比较 check.status 与 'passed'，返回严格相等的判断结果。 */ check=>check.status==='passed')?'passed':'failed',seed:2624,generatedCases:32,rejectedInvalidSourcePreservesPreviousGraph:true,structuralKinds:[...kinds].sort(),checks,scope:'Actual native/WASM source and regenerated-graph traces. Fixed-seed bounded generation plus retained language corpus; does not assert every possible program or every UI workflow is covered.'}
  await mkdir('release-audits',{recursive:true});await writeFile('release-audits/v26.24-graph-equivalence.json',JSON.stringify(report)+'\n')
  console.log(JSON.stringify(report));if(report.status!=='passed')process.exitCode=1
}finally{await rm(temporary,{recursive:true,force:true})}
