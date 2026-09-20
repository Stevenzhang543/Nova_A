import {registerNodeBundle22,captureNodeBundle22} from './lib/nodeOperationTrace22.mjs'
import assert from 'node:assert/strict'
import { build } from 'vite'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { rhaiCorpus } from './fixtures/v26.12-rhai-corpus.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url))), temporary = await mkdtemp(join(tmpdir(), 'nova-v2612-graph-'))
const checks = []
const check = (name, run) => { try { run(); checks.push({ name, status: 'passed' }) } catch (error) { checks.push({ name, status: 'failed', error: error.stack ?? error.message }) } }
try {
  const entries = { sync:'visual/graphCodeSync', compiler:'visual/graphCompiler', syntax:'visual/graphSyntax', schema:'visual/graphSyntaxSchema', types:'visual/graphTypes', catalog:'visual/graphCatalog', api:'visual/graphSyntaxApi', signatures:'visual/rhaiApiSignatures' }
  await build({ configFile:false, root, logLevel:'error', ssr:{noExternal:true}, build: { sourcemap:process.env.NOVA_AUDIT_NODE_OPERATION_COVERAGE==='1'?'hidden':false, ssr:true,outDir:temporary,emptyOutDir:false,rollupOptions:{input:Object.fromEntries(Object.entries(entries).map(([name,path])=>[name,join(root,'src',path+'.ts')])),output:{entryFileNames:'[name].mjs',chunkFileNames:'[name]-[hash].mjs'}}} })
  registerNodeBundle22(temporary)
  const [sync,compiler,syntax,schema,types,catalog,api,signatures] = await Promise.all(Object.keys(entries).map(name=>import(pathToFileURL(join(temporary,name+'.mjs')).href)))
  const wasm = await import(pathToFileURL(join(root,'nova_core/pkg/nova_core.js')).href)
  await wasm.default({module_or_path:await readFile(join(root,'nova_core/pkg/nova_core_bg.wasm'))})
  assert.equal(wasm.engine_version(),JSON.parse(await readFile(join(root,'package.json'),'utf8')).version,'Rebuild WASM; the VM version is stale.')
  const execute = source => { const vm=new wasm.WasmScriptRuntime(); try { return {result:JSON.parse(vm.execute_json(source,'start',JSON.stringify({entity:'language-corpus'})))} } catch(error){return {error:String(error)}} finally{vm.free()} }
  const compiled = graph => { const result=compiler.compileGraph(graph); assert.equal(result.valid,true,JSON.stringify(result.diagnostics)); return result.source }
  const wire = (graph,child,parent,key) => { const pin=parent.pins.find(pin=>pin.key===key); assert.ok(pin,key); graph.edges=graph.edges.filter(edge=>edge.to.pinUuid!==pin.uuid); graph.edges.push({uuid:types.graphUuid(),from:{nodeUuid:child.uuid,pinUuid:child.pins.find(pin=>pin.direction==='output').uuid},to:{nodeUuid:parent.uuid,pinUuid:pin.uuid}}) }
  for(const fixture of rhaiCorpus){
    check(fixture.name+': exact source and serialized identity',()=>{
      const graph=sync.createGraphFromRhaiSource(fixture.source,fixture.name)
      assert.equal(compiled(graph),fixture.source)
      assert.equal(compiled(types.parseGraphDocument(types.serializeGraphDocument(graph))),fixture.source)
      const linked=sync.createLinkedRhaiSource(graph)
      assert.equal(types.serializeGraphDocument(sync.applyLinkedRhaiSource(graph,linked).graph),types.serializeGraphDocument(graph))
      assert.ok(graph.nodes.every(node=>node.type.startsWith('rhai.')))
      for(let i=0;i<graph.nodes.length;i++)for(let j=i+1;j<graph.nodes.length;j++){const a=graph.nodes[i],b=graph.nodes[j];assert.ok(a.position.x+a.size.width<=b.position.x||b.position.x+b.size.width<=a.position.x||a.position.y+a.size.height<=b.position.y||b.position.y+b.size.height<=a.position.y,'overlapping initial nodes')}
    })
    check(fixture.name+': every node regenerated structurally and executed in actual WASM',()=>{
      const graph=sync.createGraphFromRhaiSource(fixture.source,fixture.name)
      for(const node of graph.nodes)node.config.structureChanged=true
      const generated=compiled(graph),original=execute(fixture.source),rewritten=execute(generated)
      if(fixture.error){assert.match(original.error??'',fixture.error);assert.match(rewritten.error??'',fixture.error);return}
      assert.equal(original.error,undefined);assert.equal(rewritten.error,undefined,rewritten.error+'\n'+generated)
      for(const key of ['logs','properties','commands'])assert.deepEqual(rewritten.result[key],original.result[key],key+'\n'+generated)
    })
  }
  check('binding rename preserves shadowed variables and closure execution',()=>{
    const graph=sync.createGraphFromRhaiSource('fn start(){let value=2;{let value=3;print(value);}let f=|p|value+p;print(f.call(4));}')
    const declarations=graph.nodes.filter(node=>node.type==='rhai.VariableDeclaration'&&schema.syntaxFields(node).name==='value').sort((a,b)=>Number(a.config.sourceStart)-Number(b.config.sourceStart))
    const [declaration,shadow]=declarations
    assert.equal(declarations.length,2);assert.notEqual(declaration.config.bindingId,shadow.config.bindingId)
    schema.setSyntaxNodeField(declaration,'name','score',graph)
    assert.ok(declaration.title.endsWith(' · score'));assert.ok(graph.nodes.filter(node=>node.config.bindingId===declaration.config.bindingId&&node.type==='rhai.Identifier').every(node=>node.title.endsWith(' · score')))
    const source=compiled(graph);assert.match(source,/let score=2/);assert.match(source,/let value=3/);assert.match(source,/\|p\|\(?score\)?\+p/)
    assert.deepEqual(execute(source).result.logs.map(log=>log.message),['3','6'])
    schema.setSyntaxNodeField(shadow,'name','inner',graph)
    const twice=compiled(graph);assert.match(twice,/let inner=3;print\(inner\)/);assert.match(twice,/let score=2/)
    assert.deepEqual(execute(twice).result.logs.map(log=>log.message),['3','6'])
  })
  check('rewiring expressions preserves precedence, integer values and comments',()=>{
    const graph=sync.createGraphFromRhaiSource('fn start(){/* keep */print(2*3);}')
    const multiply=graph.nodes.find(node=>node.type==='rhai.Binary')
    const addition=catalog.createGraphNode('rhai.Binary',0,0);schema.setSyntaxNodeField(addition,'operator','+');schema.syntaxSlots(addition).find(slot=>slot.field==='left').fallback='4';schema.syntaxSlots(addition).find(slot=>slot.field==='right').fallback='5';graph.nodes.push(addition);wire(graph,addition,multiply,'right')
    const source=compiled(graph);assert.ok(source.includes('/* keep */'));assert.deepEqual(execute(source).result.logs.map(log=>log.message),['18'])
  })
  check('shared graph function rename rejects external consumers before any mutation',()=>{
    const graph=sync.createGraphFromRhaiSource('fn shared_value(){7}\nfn start(){print(shared_value());}')
    const declaration=graph.nodes.find(node=>node.type==='rhai.FunctionDeclaration'&&schema.syntaxFields(node).name==='shared_value'),before=types.serializeGraphDocument(graph)
    assert.throws(()=>schema.setSyntaxNodeField(declaration,'name','renamed',graph,['use "Assets/Scripts/shared.rhai";\nfn start(){print(shared_value());}']),/cross-module/)
    assert.equal(types.serializeGraphDocument(graph),before)
    schema.setSyntaxNodeField(declaration,'name','renamed',graph,['fn unrelated(){1}'])
    assert.deepEqual(execute(compiled(graph)).result.logs.map(log=>log.message),['7'])
  })
  check('graph rename rejects nested capture and preserves exact source, titles and VM output',()=>{
    const graph=sync.createGraphFromRhaiSource('fn start(){let x=1;{let y=2;print(x);}}'),declaration=graph.nodes.find(node=>node.type==='rhai.VariableDeclaration'&&schema.syntaxFields(node).name==='x')
    const before=types.serializeGraphDocument(graph),source=compiled(graph)
    assert.deepEqual(execute(source).result.logs.map(item=>item.message),['1'])
    assert.throws(()=>schema.setSyntaxNodeField(declaration,'name','y',graph),/capture|binding/)
    assert.equal(types.serializeGraphDocument(graph),before);assert.equal(compiled(graph),source);assert.deepEqual(execute(compiled(graph)).result.logs.map(item=>item.message),['1'])
  })
  check('graph rename rejects duplicate overloads and checks the currently edited source',()=>{
    const graph=sync.createGraphFromRhaiSource('fn first(v){v+1} fn second(v){v+2} fn start(){print(first(2));print(second(2));}'),first=graph.nodes.find(node=>node.type==='rhai.FunctionDeclaration'&&schema.syntaxFields(node).name==='first')
    const before=types.serializeGraphDocument(graph)
    assert.throws(()=>schema.setSyntaxNodeField(first,'name','second',graph),/duplicate|invalid/);assert.equal(types.serializeGraphDocument(graph),before)
    const changed=sync.createGraphFromRhaiSource('fn start(){let x=1;{let z=2;print(x);}}'),outer=changed.nodes.find(node=>node.type==='rhai.VariableDeclaration'&&schema.syntaxFields(node).name==='x'),inner=changed.nodes.find(node=>node.type==='rhai.VariableDeclaration'&&schema.syntaxFields(node).name==='z')
    schema.setSyntaxNodeField(inner,'name','y',changed);const edited=types.serializeGraphDocument(changed)
    assert.throws(()=>schema.setSyntaxNodeField(outer,'name','y',changed),/capture|binding/);assert.equal(types.serializeGraphDocument(changed),edited);assert.deepEqual(execute(compiled(changed)).result.logs.map(item=>item.message),['1'])
  })
  check('new visual nodes can build a complete executable program from an empty module',()=>{
    const graph=sync.createGraphFromRhaiSource(''),program=graph.nodes[0],fn=catalog.createGraphNode('rhai.FunctionDeclaration',0,0),block=catalog.createGraphNode('rhai.Block',0,0),statement=catalog.createGraphNode('rhai.ExpressionStatement',0,0),call=catalog.createGraphNode('rhai.Call',0,0)
    graph.nodes.push(fn,block,statement,call);schema.setSyntaxNodeField(fn,'name','start');schema.syntaxSlots(call).find(slot=>slot.field==='callee').fallback='print';schema.syntaxSlots(call).find(slot=>slot.field==='arguments').fallback='"visual"'
    wire(graph,fn,program,'body_0');wire(graph,block,fn,'body');wire(graph,statement,block,'body_0');wire(graph,call,statement,'expression')
    assert.deepEqual(execute(compiled(graph)).result.logs.map(log=>log.message),['visual'])
  })
  check('new source edits retain existing node UUID, manual position and viewport',()=>{
    const graph=sync.createGraphFromRhaiSource('fn start(){let x=1;print(x);}')
    graph.viewport={x:123,y:234,zoom:.6};const variable=graph.nodes.find(node=>node.type==='rhai.VariableDeclaration');variable.position={x:789,y:654}
    const rebuilt=sync.applyLinkedRhaiSource(graph,'// hello\nfn start() {let x=1;print(x); }').graph
    assert.deepEqual(rebuilt.viewport,graph.viewport);assert.deepEqual(rebuilt.nodes.find(node=>node.uuid===variable.uuid).position,variable.position)
  })
  check('diagnostics point to current generated spans after length-changing edits',()=>{
    const graph=sync.createGraphFromRhaiSource('fn start(){let x=1;print(x);}')
    const literal=graph.nodes.find(node=>node.type==='rhai.Literal');schema.setSyntaxNodeField(literal,'raw','1234567890',graph)
    const source=compiled(graph),assessment=syntax.assessRhaiConversion(source,'test',graph),region=assessment.regions.find(region=>region.nodeUuid===literal.uuid)
    assert.ok(region);assert.equal(source.slice(region.span.start,region.span.end),'1234567890')
    schema.setSyntaxNodeField(literal,'raw','[',graph);assert.equal(compiler.validateGraph(graph).valid,false)
  })
  check('cycles, removed required children, mixed declaration owners and oversized metadata are rejected',()=>{
    const graph=sync.createGraphFromRhaiSource('fn start(){print(1);}')
    const call=graph.nodes.find(node=>node.type==='rhai.Call');wire(graph,call,call,'callee');assert.equal(compiler.validateGraph(graph).valid,false)
    const missing=sync.createGraphFromRhaiSource('fn start(){print(1);}')
    missing.edges=missing.edges.filter(edge=>edge.to.pinUuid!==missing.nodes.find(node=>node.type==='rhai.Call').pins.find(pin=>pin.key==='callee').uuid);assert.equal(compiler.validateGraph(missing).valid,false)
    const mixed=sync.createGraphFromRhaiSource('');mixed.customEvents.push({uuid:types.graphUuid(),name:'ignored',parameters:[]});assert.equal(compiler.validateGraph(mixed).valid,false)
    const oversized=sync.createGraphFromRhaiSource('');oversized.language.source='x'.repeat(64001);assert.throws(()=>types.normalizeGraphDocument(oversized),/oversized/)
  })
  check('legacy source-backed blocks are never advertised as fully structural',()=>{
    const graph=sync.createLegacyGraphFromRhaiSource('fn start(){let f=|v|v+1;print(f.call(3));}'),source=sync.createLinkedRhaiSource(graph),assessment=syntax.assessRhaiConversion(source,'legacy',graph)
    assert.ok(assessment.sourceBacked>0)
    assert.equal(compiler.validateGraph(graph).valid,true)
  })
  check('large ordered arrays chunk without dropping values',()=>{
    const source='fn start(){let a=['+Array.from({length:130},(_,i)=>i).join(',')+'];print(a.len());print(a[129]);}',graph=sync.createGraphFromRhaiSource(source)
    assert.equal(compiled(graph),source);for(const node of graph.nodes)node.config.structureChanged=true
    assert.deepEqual(execute(compiled(graph)).result.logs.map(log=>log.message),['130','129'])
  })
  check('every available overload creates the exact ordered parameter pins and retained typed syntax',()=>{
    const expected=signatures.RHAI_API_SIGNATURES.filter(signature=>signature.available&&signature.profiles.includes('wasm')&&!signature.internal&&!signature.operator&&/^[A-Za-z_][A-Za-z0-9_]*$/.test(signature.name))
    assert.equal(api.SYNTAX_API_NODE_DEFINITIONS.length,expected.length)
    for(const signature of expected){
      const node=catalog.createGraphNode('rhai-api.'+signature.id),slots=schema.syntaxSlots(node).filter(slot=>slot.field===(signature.role==='lifecycle'?'parameters':'arguments'))
      assert.equal(node.type,signature.role==='lifecycle'?'rhai.FunctionDeclaration':'rhai.Call');assert.equal(slots.length,signature.parameters.length,signature.id)
      for(let index=0;index<slots.length;index++){assert.equal(slots[index].index,index);const parameter=signature.parameters[index],pin=node.pins.find(pin=>pin.key===slots[index].key);assert.equal(pin.required,signature.role==='callable'&&parameter.defaultLiteral===null);if(signature.role==='callable')assert.equal(slots[index].fallback,parameter.defaultLiteral??'')}
      assert.ok(node.pins.every((pin,index)=>node.pins.findIndex(other=>other.key===pin.key)===index),'duplicate pin key for '+signature.name)
    }
  })
  check('engine float overload palette executes exact float defaults, and opaque inputs stay required',()=>{
    const signature=signatures.getRhaiApiSignatures('set_position').find(item=>item.available&&item.parameters.length===2&&item.parameters.every(parameter=>parameter.type==='float'))
    assert.ok(signature);const graph=sync.createGraphFromRhaiSource('fn start(){print(1);}'),old=graph.nodes.find(node=>node.type==='rhai.Call'),statement=graph.nodes.find(node=>node.type==='rhai.ExpressionStatement'),call=catalog.createGraphNode('rhai-api.'+signature.id)
    graph.nodes.push(call);wire(graph,call,statement,'expression');assert.deepEqual(execute(compiled(graph)).result.commands,[{type:'setPosition',x:0,y:0}]);assert.ok(compiled(graph).includes('0.0'))
    const opaque=api.SYNTAX_API_NODE_DEFINITIONS.find(definition=>api.syntaxApiSignature(definition.type).role==='callable'&&api.syntaxApiSignature(definition.type).parameters.some(parameter=>parameter.defaultLiteral===null))
    assert.ok(opaque);const required=catalog.createGraphNode(opaque.type);graph.nodes.push(required);wire(graph,required,statement,'expression');assert.equal(compiler.validateGraph(graph).valid,false)
    assert.ok(graph.nodes.includes(old),'replaced expression remains available for undo/reuse')
  })
  check('visual native exports, whitespace-only changes and escaped control-key rewrites remain lossless',()=>{
    const original='export let value=2;\nfn start(){let m=#{"\\\\back":3};print(m["\\\\back"]);}',graph=sync.createGraphFromRhaiSource(original)
    for(const node of graph.nodes)node.config.structureChanged=true
    assert.deepEqual(execute(compiled(graph)).result.logs.map(log=>log.message),['3'])
    const changed=sync.applyLinkedRhaiSource(sync.createGraphFromRhaiSource('fn start(){}'),'\r\nfn start(){}\r\n').graph
    assert.equal(compiled(changed),'\r\nfn start(){}\r\n')
  })
  await mkdir(join(root,'release-audits'),{recursive:true})
  const report={format:'nova-typed-graph-audit',version:1,release:'26.12',engineVersion:wasm.engine_version(),generatedAt:new Date().toISOString(),runtime:'actual WasmScriptRuntime',fixtures:rhaiCorpus.length,overloads:api.SYNTAX_API_NODE_DEFINITIONS.length,checks,status:checks.every(item=>item.status==='passed')?'passed':'failed'}
  await writeFile(process.argv.find(value=>value.startsWith('--report='))?.slice(9)??join(root,'release-audits/v26.12-typed-graphs.json'),JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report,null,2));if(report.status!=='passed')process.exitCode=1
}finally{await captureNodeBundle22(temporary); await rm(temporary,{recursive:true,force:true})}
