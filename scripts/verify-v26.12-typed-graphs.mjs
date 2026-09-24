/** 结构图回归：验证代码与节点转换、保存重开、绑定重命名及真实 WASM 执行一致性。 */
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
const check = /** 执行类型图检查并记录通过或带堆栈的失败信息。 */ (name, run) => { try { run(); checks.push({ name, status: 'passed' }) } catch (error) { checks.push({ name, status: 'failed', error: error.stack ?? error.message }) } }
try {
  const entries = { sync:'visual/graphCodeSync', compiler:'visual/graphCompiler', syntax:'visual/graphSyntax', schema:'visual/graphSyntaxSchema', types:'visual/graphTypes', catalog:'visual/graphCatalog', api:'visual/graphSyntaxApi', signatures:'visual/rhaiApiSignatures' }
  await build({ configFile:false, root, logLevel:'error', ssr:{noExternal:true}, build: { sourcemap:process.env.NOVA_AUDIT_NODE_OPERATION_COVERAGE==='1'?'hidden':false, ssr:true,outDir:temporary,emptyOutDir:false,rollupOptions:{input:Object.fromEntries(Object.entries(entries).map(/* 返回按声明顺序构造的数组 [name,join(root,'src',path+'.ts')]。 */ ([name,path])=>[name,join(root,'src',path+'.ts')])),output:{entryFileNames:'[name].mjs',chunkFileNames:'[name]-[hash].mjs'}}} })
  registerNodeBundle22(temporary)
  const [sync,compiler,syntax,schema,types,catalog,api,signatures] = await Promise.all(Object.keys(entries).map(/* 调用 import(pathToFileURL(join(temporary,name+'.mjs')).href) 并返回调用结果。 */ name=>import(pathToFileURL(join(temporary,name+'.mjs')).href)))
  const wasm = await import(pathToFileURL(join(root,'nova_core/pkg/nova_core.js')).href)
  await wasm.default({module_or_path:await readFile(join(root,'nova_core/pkg/nova_core_bg.wasm'))})
  assert.equal(wasm.engine_version(),JSON.parse(await readFile(join(root,'package.json'),'utf8')).version,'Rebuild WASM; the VM version is stale.')
  const execute = /** 执行类型图生成源码，返回WASM结果或错误并释放实例。 */ source => { const vm=new wasm.WasmScriptRuntime(); try { return {result:JSON.parse(vm.execute_json(source,'start',JSON.stringify({entity:'language-corpus'})))} } catch(error){return {error:String(error)}} finally{vm.free()} }
  const compiled = /** 编译图并断言有效，返回生成源码。 */ graph => { const result=compiler.compileGraph(graph); assert.equal(result.valid,true,JSON.stringify(result.diagnostics)); return result.source }
  const wire = /** 将子节点输出连接到父节点指定输入，替换原输入边。 */ (graph,child,parent,key) => { const pin=parent.pins.find(/* 比较 pin.key 与 key，返回严格相等的判断结果。 */ pin=>pin.key===key); assert.ok(pin,key); graph.edges=graph.edges.filter(/* 比较 edge.to.pinUuid 与 pin.uuid，返回严格不等的判断结果。 */ edge=>edge.to.pinUuid!==pin.uuid); graph.edges.push({uuid:types.graphUuid(),from:{nodeUuid:child.uuid,pinUuid:child.pins.find(/* 比较 pin.direction 与 'output'，返回严格相等的判断结果。 */ pin=>pin.direction==='output').uuid},to:{nodeUuid:parent.uuid,pinUuid:pin.uuid}}) }
  for(const fixture of rhaiCorpus){
    check(fixture.name+': exact source and serialized identity',/** 验证源码图往返、序列化和链接应用保持原文，并确认初始语法节点不重叠。 */ ()=>{
      const graph=sync.createGraphFromRhaiSource(fixture.source,fixture.name)
      assert.equal(compiled(graph),fixture.source)
      assert.equal(compiled(types.parseGraphDocument(types.serializeGraphDocument(graph))),fixture.source)
      const linked=sync.createLinkedRhaiSource(graph)
      assert.equal(types.serializeGraphDocument(sync.applyLinkedRhaiSource(graph,linked).graph),types.serializeGraphDocument(graph))
      assert.ok(graph.nodes.every(/* 调用 node.type.startsWith('rhai.') 并返回调用结果。 */ node=>node.type.startsWith('rhai.')))
      for(let i=0;i<graph.nodes.length;i++)for(let j=i+1;j<graph.nodes.length;j++){const a=graph.nodes[i],b=graph.nodes[j];assert.ok(a.position.x+a.size.width<=b.position.x||b.position.x+b.size.width<=a.position.x||a.position.y+a.size.height<=b.position.y||b.position.y+b.size.height<=a.position.y,'overlapping initial nodes')}
    })
    check(fixture.name+': every node regenerated structurally and executed in actual WASM',/** 强制重建所有语法节点，验证生成代码与原源码的结果或预期错误一致。 */ ()=>{
      const graph=sync.createGraphFromRhaiSource(fixture.source,fixture.name)
      for(const node of graph.nodes)node.config.structureChanged=true
      const generated=compiled(graph),original=execute(fixture.source),rewritten=execute(generated)
      if(fixture.error){assert.match(original.error??'',fixture.error);assert.match(rewritten.error??'',fixture.error);return}
      assert.equal(original.error,undefined);assert.equal(rewritten.error,undefined,rewritten.error+'\n'+generated)
      for(const key of ['logs','properties','commands'])assert.deepEqual(rewritten.result[key],original.result[key],key+'\n'+generated)
    })
  }
  // 固定元数据必须跨代码重投影与序列化保留，且不得改变可执行源码。
  check('pinned geometry survives reprojection and serialization without changing Rhai',/** 验证重新投影与序列化保留固定布局位置、中文注释及执行语义。 */ ()=>{
    const source='// 保留中文注释\nfn start(){let value=2;print(value);}', graph=sync.createGraphFromRhaiSource(source)
    const declaration=graph.nodes.find(/* 比较 node.type 与 'rhai.VariableDeclaration'，返回严格相等的判断结果。 */ node=>node.type==='rhai.VariableDeclaration')
    assert.ok(declaration)
    declaration.config.layoutPinned=true;declaration.position={x:1234,y:5678}
    const projected=syntax.projectRhaiSyntax(source,graph.name,graph.uuid,graph)
    const retained=projected.nodes.find(/* 比较 node.uuid 与 declaration.uuid，返回严格相等的判断结果。 */ node=>node.uuid===declaration.uuid)
    assert.ok(retained);assert.equal(retained.config.layoutPinned,true);assert.deepEqual(retained.position,declaration.position)
    const reopened=types.parseGraphDocument(types.serializeGraphDocument(projected))
    assert.equal(reopened.nodes.find(/* 比较 node.uuid 与 declaration.uuid，返回严格相等的判断结果。 */ node=>node.uuid===declaration.uuid).config.layoutPinned,true)
    assert.equal(compiled(reopened),source)
    assert.deepEqual(execute(compiled(reopened)),execute(source))
  })
  check('binding rename preserves shadowed variables and closure execution',/** 验证图中同名变量按绑定独立重命名，关联标题与闭包引用更新而遮蔽绑定不受影响。 */ ()=>{
    const graph=sync.createGraphFromRhaiSource('fn start(){let value=2;{let value=3;print(value);}let f=|p|value+p;print(f.call(4));}')
    const declarations=graph.nodes.filter(/* 先计算 node.type==='rhai.VariableDeclaration'；仅当其为真值时求右侧 schema.syntaxFields(node).name==='value'，返回短路求值结果。 */ node=>node.type==='rhai.VariableDeclaration'&&schema.syntaxFields(node).name==='value').sort(/* 计算表达式 Number(a.config.sourceStart)-Number(b.config.sourceStart) 并返回结果，沿用操作数的原有类型规则。 */ (a,b)=>Number(a.config.sourceStart)-Number(b.config.sourceStart))
    const [declaration,shadow]=declarations
    assert.equal(declarations.length,2);assert.notEqual(declaration.config.bindingId,shadow.config.bindingId)
    schema.setSyntaxNodeField(declaration,'name','score',graph)
    assert.ok(declaration.title.endsWith(' · score'));assert.ok(graph.nodes.filter(/* 先计算 node.config.bindingId===declaration.config.bindingId；仅当其为真值时求右侧 node.type==='rhai.Identifier'，返回短路求值结果。 */ node=>node.config.bindingId===declaration.config.bindingId&&node.type==='rhai.Identifier').every(/* 调用 node.title.endsWith(' · score') 并返回调用结果。 */ node=>node.title.endsWith(' · score')))
    const source=compiled(graph);assert.match(source,/let score=2/);assert.match(source,/let value=3/);assert.match(source,/\|p\|\(?score\)?\+p/)
    assert.deepEqual(execute(source).result.logs.map(/* 返回 log.message 的当前值。 */ log=>log.message),['3','6'])
    schema.setSyntaxNodeField(shadow,'name','inner',graph)
    const twice=compiled(graph);assert.match(twice,/let inner=3;print\(inner\)/);assert.match(twice,/let score=2/)
    assert.deepEqual(execute(twice).result.logs.map(/* 返回 log.message 的当前值。 */ log=>log.message),['3','6'])
  })
  check('rewiring expressions preserves precedence, integer values and comments',/** 将加法表达式接入乘法输入，验证括号优先级及原注释被保留。 */ ()=>{
    const graph=sync.createGraphFromRhaiSource('fn start(){/* keep */print(2*3);}')
    const multiply=graph.nodes.find(/* 比较 node.type 与 'rhai.Binary'，返回严格相等的判断结果。 */ node=>node.type==='rhai.Binary')
    const addition=catalog.createGraphNode('rhai.Binary',0,0);schema.setSyntaxNodeField(addition,'operator','+');schema.syntaxSlots(addition).find(/* 比较 slot.field 与 'left'，返回严格相等的判断结果。 */ slot=>slot.field==='left').fallback='4';schema.syntaxSlots(addition).find(/* 比较 slot.field 与 'right'，返回严格相等的判断结果。 */ slot=>slot.field==='right').fallback='5';graph.nodes.push(addition);wire(graph,addition,multiply,'right')
    const source=compiled(graph);assert.ok(source.includes('/* keep */'));assert.deepEqual(execute(source).result.logs.map(/* 返回 log.message 的当前值。 */ log=>log.message),['18'])
  })
  check('shared graph function rename rejects external consumers before any mutation',/** 验证跨模块引用阻止图函数重命名且无部分修改，无关外部源码不阻止安全重命名。 */ ()=>{
    const graph=sync.createGraphFromRhaiSource('fn shared_value(){7}\nfn start(){print(shared_value());}')
    const declaration=graph.nodes.find(/* 先计算 node.type==='rhai.FunctionDeclaration'；仅当其为真值时求右侧 schema.syntaxFields(node).name==='shared_value'，返回短路求值结果。 */ node=>node.type==='rhai.FunctionDeclaration'&&schema.syntaxFields(node).name==='shared_value'),before=types.serializeGraphDocument(graph)
    assert.throws(/** 尝试重命名被另一模块调用的图函数，以触发跨模块保护。 */ ()=>schema.setSyntaxNodeField(declaration,'name','renamed',graph,['use "Assets/Scripts/shared.rhai";\nfn start(){print(shared_value());}']),/cross-module/)
    assert.equal(types.serializeGraphDocument(graph),before)
    schema.setSyntaxNodeField(declaration,'name','renamed',graph,['fn unrelated(){1}'])
    assert.deepEqual(execute(compiled(graph)).result.logs.map(/* 返回 log.message 的当前值。 */ log=>log.message),['7'])
  })
  check('graph rename rejects nested capture and preserves exact source, titles and VM output',/** 验证会捕获内层绑定的图重命名失败且图、源码和执行结果均不改变。 */ ()=>{
    const graph=sync.createGraphFromRhaiSource('fn start(){let x=1;{let y=2;print(x);}}'),declaration=graph.nodes.find(/* 先计算 node.type==='rhai.VariableDeclaration'；仅当其为真值时求右侧 schema.syntaxFields(node).name==='x'，返回短路求值结果。 */ node=>node.type==='rhai.VariableDeclaration'&&schema.syntaxFields(node).name==='x')
    const before=types.serializeGraphDocument(graph),source=compiled(graph)
    assert.deepEqual(execute(source).result.logs.map(/* 返回 item.message 的当前值。 */ item=>item.message),['1'])
    assert.throws(/* 调用 schema.setSyntaxNodeField(declaration,'name','y',graph) 并返回调用结果。 */ ()=>schema.setSyntaxNodeField(declaration,'name','y',graph),/capture|binding/)
    assert.equal(types.serializeGraphDocument(graph),before);assert.equal(compiled(graph),source);assert.deepEqual(execute(compiled(graph)).result.logs.map(/* 返回 item.message 的当前值。 */ item=>item.message),['1'])
  })
  check('graph rename rejects duplicate overloads and checks the currently edited source',/** 验证重复函数名和已编辑后的变量捕获均被拒绝，保留此前有效图状态。 */ ()=>{
    const graph=sync.createGraphFromRhaiSource('fn first(v){v+1} fn second(v){v+2} fn start(){print(first(2));print(second(2));}'),first=graph.nodes.find(/* 先计算 node.type==='rhai.FunctionDeclaration'；仅当其为真值时求右侧 schema.syntaxFields(node).name==='first'，返回短路求值结果。 */ node=>node.type==='rhai.FunctionDeclaration'&&schema.syntaxFields(node).name==='first')
    const before=types.serializeGraphDocument(graph)
    assert.throws(/* 调用 schema.setSyntaxNodeField(first,'name','second',graph) 并返回调用结果。 */ ()=>schema.setSyntaxNodeField(first,'name','second',graph),/duplicate|invalid/);assert.equal(types.serializeGraphDocument(graph),before)
    const changed=sync.createGraphFromRhaiSource('fn start(){let x=1;{let z=2;print(x);}}'),outer=changed.nodes.find(/* 先计算 node.type==='rhai.VariableDeclaration'；仅当其为真值时求右侧 schema.syntaxFields(node).name==='x'，返回短路求值结果。 */ node=>node.type==='rhai.VariableDeclaration'&&schema.syntaxFields(node).name==='x'),inner=changed.nodes.find(/* 先计算 node.type==='rhai.VariableDeclaration'；仅当其为真值时求右侧 schema.syntaxFields(node).name==='z'，返回短路求值结果。 */ node=>node.type==='rhai.VariableDeclaration'&&schema.syntaxFields(node).name==='z')
    schema.setSyntaxNodeField(inner,'name','y',changed);const edited=types.serializeGraphDocument(changed)
    assert.throws(/* 调用 schema.setSyntaxNodeField(outer,'name','y',changed) 并返回调用结果。 */ ()=>schema.setSyntaxNodeField(outer,'name','y',changed),/capture|binding/);assert.equal(types.serializeGraphDocument(changed),edited);assert.deepEqual(execute(compiled(changed)).result.logs.map(/* 返回 item.message 的当前值。 */ item=>item.message),['1'])
  })
  check('new visual nodes can build a complete executable program from an empty module',/** 从空图创建启动函数、语句和打印调用，验证纯图编程可执行。 */ ()=>{
    const graph=sync.createGraphFromRhaiSource(''),program=graph.nodes[0],fn=catalog.createGraphNode('rhai.FunctionDeclaration',0,0),block=catalog.createGraphNode('rhai.Block',0,0),statement=catalog.createGraphNode('rhai.ExpressionStatement',0,0),call=catalog.createGraphNode('rhai.Call',0,0)
    graph.nodes.push(fn,block,statement,call);schema.setSyntaxNodeField(fn,'name','start');schema.syntaxSlots(call).find(/* 比较 slot.field 与 'callee'，返回严格相等的判断结果。 */ slot=>slot.field==='callee').fallback='print';schema.syntaxSlots(call).find(/* 比较 slot.field 与 'arguments'，返回严格相等的判断结果。 */ slot=>slot.field==='arguments').fallback='"visual"'
    wire(graph,fn,program,'body_0');wire(graph,block,fn,'body');wire(graph,statement,block,'body_0');wire(graph,call,statement,'expression')
    assert.deepEqual(execute(compiled(graph)).result.logs.map(/* 返回 log.message 的当前值。 */ log=>log.message),['visual'])
  })
  check('new source edits retain existing node UUID, manual position and viewport',/** 验证只修改源码注释和格式后，图视口与已有节点位置保留。 */ ()=>{
    const graph=sync.createGraphFromRhaiSource('fn start(){let x=1;print(x);}')
    graph.viewport={x:123,y:234,zoom:.6};const variable=graph.nodes.find(/* 比较 node.type 与 'rhai.VariableDeclaration'，返回严格相等的判断结果。 */ node=>node.type==='rhai.VariableDeclaration');variable.position={x:789,y:654}
    const rebuilt=sync.applyLinkedRhaiSource(graph,'// hello\nfn start() {let x=1;print(x); }').graph
    assert.deepEqual(rebuilt.viewport,graph.viewport);assert.deepEqual(rebuilt.nodes.find(/* 比较 node.uuid 与 variable.uuid，返回严格相等的判断结果。 */ node=>node.uuid===variable.uuid).position,variable.position)
  })
  check('diagnostics point to current generated spans after length-changing edits',/** 修改字面量后验证源码覆盖范围准确，非法字面量导致图验证失败。 */ ()=>{
    const graph=sync.createGraphFromRhaiSource('fn start(){let x=1;print(x);}')
    const literal=graph.nodes.find(/* 比较 node.type 与 'rhai.Literal'，返回严格相等的判断结果。 */ node=>node.type==='rhai.Literal');schema.setSyntaxNodeField(literal,'raw','1234567890',graph)
    const source=compiled(graph),assessment=syntax.assessRhaiConversion(source,'test',graph),region=assessment.regions.find(/* 比较 region.nodeUuid 与 literal.uuid，返回严格相等的判断结果。 */ region=>region.nodeUuid===literal.uuid)
    assert.ok(region);assert.equal(source.slice(region.span.start,region.span.end),'1234567890')
    schema.setSyntaxNodeField(literal,'raw','[',graph);assert.equal(compiler.validateGraph(graph).valid,false)
  })
  check('cycles, removed required children, mixed declaration owners and oversized metadata are rejected',/** 验证自连接、缺失调用目标、混用自定义事件以及超长源码均被拒绝。 */ ()=>{
    const graph=sync.createGraphFromRhaiSource('fn start(){print(1);}')
    const call=graph.nodes.find(/* 比较 node.type 与 'rhai.Call'，返回严格相等的判断结果。 */ node=>node.type==='rhai.Call');wire(graph,call,call,'callee');assert.equal(compiler.validateGraph(graph).valid,false)
    const missing=sync.createGraphFromRhaiSource('fn start(){print(1);}')
    missing.edges=missing.edges.filter(/* 比较 edge.to.pinUuid 与 missing.nodes.find(node=>node.type==='rhai.Call').pins.find(pin=>pin.key==='callee').uuid，返回严格不等的判断结果。 */ edge=>edge.to.pinUuid!==missing.nodes.find(/* 比较 node.type 与 'rhai.Call'，返回严格相等的判断结果。 */ node=>node.type==='rhai.Call').pins.find(/* 比较 pin.key 与 'callee'，返回严格相等的判断结果。 */ pin=>pin.key==='callee').uuid);assert.equal(compiler.validateGraph(missing).valid,false)
    const mixed=sync.createGraphFromRhaiSource('');mixed.customEvents.push({uuid:types.graphUuid(),name:'ignored',parameters:[]});assert.equal(compiler.validateGraph(mixed).valid,false)
    const oversized=sync.createGraphFromRhaiSource('');oversized.language.source='x'.repeat(64001);assert.throws(/* 调用 types.normalizeGraphDocument(oversized) 并返回调用结果。 */ ()=>types.normalizeGraphDocument(oversized),/oversized/)
  })
  check('legacy source-backed blocks are never advertised as fully structural',/** 验证旧式图对闭包保留源码支持且仍可编译。 */ ()=>{
    const graph=sync.createLegacyGraphFromRhaiSource('fn start(){let f=|v|v+1;print(f.call(3));}'),source=sync.createLinkedRhaiSource(graph),assessment=syntax.assessRhaiConversion(source,'legacy',graph)
    assert.ok(assessment.sourceBacked>0)
    assert.equal(compiler.validateGraph(graph).valid,true)
  })
  check('large ordered arrays chunk without dropping values',/** 验证超过单节点引脚规模的数组源码往返与强制重建都保留全部元素。 */ ()=>{
    const source='fn start(){let a=['+Array.from({length:130},/* 返回 i 的当前值。 */ (_,i)=>i).join(',')+'];print(a.len());print(a[129]);}',graph=sync.createGraphFromRhaiSource(source)
    assert.equal(compiled(graph),source);for(const node of graph.nodes)node.config.structureChanged=true
    assert.deepEqual(execute(compiled(graph)).result.logs.map(/* 返回 log.message 的当前值。 */ log=>log.message),['130','129'])
  })
  check('every available overload creates the exact ordered parameter pins and retained typed syntax',/** 逐一验证可用WASM API节点覆盖清单，参数槽顺序、默认值和必填性准确且引脚键唯一。 */ ()=>{
    const expected=signatures.RHAI_API_SIGNATURES.filter(/** 筛选可用于WASM图编辑的公开可用API，排除内部函数、运算符及非法标识符。 */ signature=>signature.available&&signature.profiles.includes('wasm')&&!signature.internal&&!signature.operator&&/^[A-Za-z_][A-Za-z0-9_]*$/.test(signature.name))
    assert.equal(api.SYNTAX_API_NODE_DEFINITIONS.length,expected.length)
    for(const signature of expected){
      const node=catalog.createGraphNode('rhai-api.'+signature.id),slots=schema.syntaxSlots(node).filter(/* 比较 slot.field 与 (signature.role==='lifecycle'?'parameters':'arguments')，返回严格相等的判断结果。 */ slot=>slot.field===(signature.role==='lifecycle'?'parameters':'arguments'))
      assert.equal(node.type,signature.role==='lifecycle'?'rhai.FunctionDeclaration':'rhai.Call');assert.equal(slots.length,signature.parameters.length,signature.id)
      for(let index=0;index<slots.length;index++){assert.equal(slots[index].index,index);const parameter=signature.parameters[index],pin=node.pins.find(/* 比较 pin.key 与 slots[index].key，返回严格相等的判断结果。 */ pin=>pin.key===slots[index].key);assert.equal(pin.required,signature.role==='callable'&&parameter.defaultLiteral===null);if(signature.role==='callable')assert.equal(slots[index].fallback,parameter.defaultLiteral??'')}
      assert.ok(node.pins.every(/* 比较 node.pins.findIndex(other=>other.key===pin.key) 与 index，返回严格相等的判断结果。 */ (pin,index)=>node.pins.findIndex(/* 比较 other.key 与 pin.key，返回严格相等的判断结果。 */ other=>other.key===pin.key)===index),'duplicate pin key for '+signature.name)
    }
  })
  check('engine float overload palette executes exact float defaults, and opaque inputs stay required',/** 验证浮点位置API节点默认值可执行，缺失不透明必填参数会报错且替换前节点仍可复用。 */ ()=>{
    const signature=signatures.getRhaiApiSignatures('set_position').find(/** 筛选可用且恰含两个浮点参数的API签名。 */ item=>item.available&&item.parameters.length===2&&item.parameters.every(/* 比较 parameter.type 与 'float'，返回严格相等的判断结果。 */ parameter=>parameter.type==='float'))
    assert.ok(signature);const graph=sync.createGraphFromRhaiSource('fn start(){print(1);}'),old=graph.nodes.find(/* 比较 node.type 与 'rhai.Call'，返回严格相等的判断结果。 */ node=>node.type==='rhai.Call'),statement=graph.nodes.find(/* 比较 node.type 与 'rhai.ExpressionStatement'，返回严格相等的判断结果。 */ node=>node.type==='rhai.ExpressionStatement'),call=catalog.createGraphNode('rhai-api.'+signature.id)
    graph.nodes.push(call);wire(graph,call,statement,'expression');assert.deepEqual(execute(compiled(graph)).result.commands,[{type:'setPosition',x:0,y:0}]);assert.ok(compiled(graph).includes('0.0'))
    const opaque=api.SYNTAX_API_NODE_DEFINITIONS.find(/** 筛选具有无默认值必填参数的可调用API节点定义。 */ definition=>api.syntaxApiSignature(definition.type).role==='callable'&&api.syntaxApiSignature(definition.type).parameters.some(/* 比较 parameter.defaultLiteral 与 null，返回严格相等的判断结果。 */ parameter=>parameter.defaultLiteral===null))
    assert.ok(opaque);const required=catalog.createGraphNode(opaque.type);graph.nodes.push(required);wire(graph,required,statement,'expression');assert.equal(compiler.validateGraph(graph).valid,false)
    assert.ok(graph.nodes.includes(old),'replaced expression remains available for undo/reuse')
  })
  check('visual native exports, whitespace-only changes and escaped control-key rewrites remain lossless',/** 验证导出变量和反斜杠映射键在重建时保留语义，应用源码保留CRLF。 */ ()=>{
    const original='export let value=2;\nfn start(){let m=#{"\\\\back":3};print(m["\\\\back"]);}',graph=sync.createGraphFromRhaiSource(original)
    for(const node of graph.nodes)node.config.structureChanged=true
    assert.deepEqual(execute(compiled(graph)).result.logs.map(/* 返回 log.message 的当前值。 */ log=>log.message),['3'])
    const changed=sync.applyLinkedRhaiSource(sync.createGraphFromRhaiSource('fn start(){}'),'\r\nfn start(){}\r\n').graph
    assert.equal(compiled(changed),'\r\nfn start(){}\r\n')
  })
  await mkdir(join(root,'release-audits'),{recursive:true})
  const report={format:'nova-typed-graph-audit',version:1,release:'26.12',engineVersion:wasm.engine_version(),generatedAt:new Date().toISOString(),runtime:'actual WasmScriptRuntime',fixtures:rhaiCorpus.length,overloads:api.SYNTAX_API_NODE_DEFINITIONS.length,checks,status:checks.every(/* 比较 item.status 与 'passed'，返回严格相等的判断结果。 */ item=>item.status==='passed')?'passed':'failed'}
  await writeFile(process.argv.find(/* 调用 value.startsWith('--report=') 并返回调用结果。 */ value=>value.startsWith('--report='))?.slice(9)??join(root,'release-audits/v26.12-typed-graphs.json'),JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report,null,2));if(report.status!=='passed')process.exitCode=1
}finally{await captureNodeBundle22(temporary); await rm(temporary,{recursive:true,force:true})}
