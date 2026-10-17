/** 验证脚本（v26.12-syntax-slots）：组织对应功能与边界场景检查，断言行为并汇总验证结果。 */
import {registerNodeBundle22,captureNodeBundle22} from './lib/nodeOperationTrace22.mjs'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root=dirname(dirname(fileURLToPath(import.meta.url))),temporary=await mkdtemp(join(tmpdir(),'nova-v2612-slots-')),checks=[]
let failure
try{
  await writeFile(join(temporary,'package.json'),'{"type":"module"}\n')
  await build({configFile:false,root,logLevel:'error',ssr:{noExternal:true},build: { sourcemap:process.env.NOVA_AUDIT_NODE_OPERATION_COVERAGE==='1'?'hidden':false,ssr:true,outDir:temporary,emptyOutDir:false,rollupOptions:{input:{syntax:join(root,'src/visual/graphSyntax.ts'),schema:join(root,'src/visual/graphSyntaxSchema.ts'),catalog:join(root,'src/visual/graphCatalog.ts'),compiler:join(root,'src/visual/graphCompiler.ts'),types:join(root,'src/visual/graphTypes.ts')},output:{entryFileNames:'[name].mjs'}}}})
  registerNodeBundle22(temporary)
  const load=/* 调用 import(pathToFileURL(join(temporary,name+'.mjs')).href) 并返回调用结果。 */ name=>import(pathToFileURL(join(temporary,name+'.mjs')).href)
  const {projectRhaiSyntax,emitSyntaxGraph}=await load('syntax'),{syntaxSlots,syntaxFields,addSyntaxChildSlot,removeSyntaxChildSlot,moveSyntaxChildSlot,setSyntaxOptionalChild,syntaxNodeOptionalChildren,setSyntaxNodeField}=await load('schema'),{createGraphNode}=await load('catalog'),{compileGraph}=await load('compiler'),{serializeGraphDocument,parseGraphDocument}=await load('types')
  const wasm=await import(pathToFileURL(join(root,'nova_core/pkg/nova_core.js')).href)
  await wasm.default({module_or_path:await readFile(join(root,'nova_core/pkg/nova_core_bg.wasm'))})
  const runtime=new wasm.WasmScriptRuntime()
  const context=JSON.stringify({apiVersion:2,entity:'test',entityName:'test',components:[],entities:{},sceneEntities:[],time:{delta:0,fixedDelta:0,elapsed:0,scale:1,frame:1},properties:{},save:{},transform:{position:[0,0],rotation:0,scale:[1,1]}})
  const run=/** 编译语法图并在WASM执行，可附加断言函数，失败时附上生成源码帮助诊断。 */ (graph,assertion='')=>{const result=compileGraph(graph);assert.equal(result.valid,true,JSON.stringify(result.diagnostics));const source=emitSyntaxGraph(graph).text;try{runtime.execute_json(source+'\nfn assert_eq(a,b) { if a != b { throw "Assertion failed"; } }'+(assertion?'\nfn verify() { '+assertion+' }':''),assertion?'verify':'start',context)}catch(error){throw Error(String(error)+'\nGenerated source:\n'+source+'\nVerification: '+assertion)}return source}
  const check=/** 执行语法槽检查并记录通过结果。 */ (name,fn)=>{fn();checks.push({name,status:'passed'})}
  const node=/* 调用 graph.nodes.find(item=>item.type==='rhai.'+kind&&(name===undefined||syntaxFields(item).name===name)) 并返回调用结果。 */ (graph,kind,name)=>graph.nodes.find(/* 先计算 item.type==='rhai.'+kind；仅当其为真值时求右侧 (name===undefined||syntaxFields(item).name===name)，返回短路求值结果。 */ item=>item.type==='rhai.'+kind&&(name===undefined||syntaxFields(item).name===name))
  const child=/** 沿指定语法子槽的输入边取得对应子节点。 */ (graph,owner,field)=>{const slot=syntaxSlots(owner).find(/* 比较 item.field 与 field，返回严格相等的判断结果。 */ item=>item.field===field),pin=owner.pins.find(/* 比较 item.key 与 slot.key，返回严格相等的判断结果。 */ item=>item.key===slot.key),edge=graph.edges.find(/* 比较 item.to.pinUuid 与 pin.uuid，返回严格相等的判断结果。 */ item=>item.to.pinUuid===pin.uuid);return graph.nodes.find(/* 比较 item.uuid 与 edge.from.nodeUuid，返回严格相等的判断结果。 */ item=>item.uuid===edge.from.nodeUuid)}
  const wire=/** 替换目标输入引脚的已有连接，将指定值节点输出接入。 */ (graph,owner,key,value)=>{const input=owner.pins.find(/* 先计算 item.key===key；仅当其为真值时求右侧 item.direction==='input'，返回短路求值结果。 */ item=>item.key===key&&item.direction==='input'),output=value.pins.find(/* 比较 item.direction 与 'output'，返回严格相等的判断结果。 */ item=>item.direction==='output');assert.ok(input&&output);graph.edges=graph.edges.filter(/* 比较 item.to.pinUuid 与 input.uuid，返回严格不等的判断结果。 */ item=>item.to.pinUuid!==input.uuid);graph.edges.push({uuid:crypto.randomUUID(),from:{nodeUuid:value.uuid,pinUuid:output.uuid},to:{nodeUuid:owner.uuid,pinUuid:input.uuid}})}
  try{
    check('Create typed block/call/literal children through real catalog nodes and execute the connected graph',/** 完全由图节点构造函数调用及两个参数，验证生成的断言调用可执行。 */ ()=>{
      const graph=projectRhaiSyntax('fn start() {}'),block=node(graph,'Block'),statement=createGraphNode('rhai.ExpressionStatement',0,0,graph),call=createGraphNode('rhai.Call',0,0,graph),callee=createGraphNode('rhai.Identifier',0,0,graph),left=createGraphNode('rhai.Literal',0,0,graph),right=createGraphNode('rhai.Literal',0,0,graph)
      graph.nodes.push(statement,call,callee,left,right);setSyntaxNodeField(callee,'name','assert_eq',graph);setSyntaxNodeField(left,'raw','42',graph);setSyntaxNodeField(right,'raw','42',graph)
      wire(graph,block,addSyntaxChildSlot(block,'body').key,statement);wire(graph,statement,'expression',call);wire(graph,call,'callee',callee);wire(graph,call,'arguments_0',left);wire(graph,call,addSyntaxChildSlot(call,'arguments').key,right)
      assert.match(run(graph),/assert_eq\(42, 42\)/)
    })
    check('Function parameter reordering changes execution order while retaining stable slot and pin IDs',/** 重排函数参数槽，验证引脚身份稳定且调用参数顺序改变。 */ ()=>{
      const graph=projectRhaiSyntax('fn number(a,b) { a*10+b } fn start() {}'),fn=node(graph,'FunctionDeclaration','number'),slots=syntaxSlots(fn).filter(/* 先计算 item.field==='parameters'；仅当其为真值时求右侧 item.childId，返回短路求值结果。 */ item=>item.field==='parameters'&&item.childId),ids=slots.map(/* 返回 fn.pins.find(pin=>pin.key===slot.key).uuid 的当前值。 */ slot=>fn.pins.find(/* 比较 pin.key 与 slot.key，返回严格相等的判断结果。 */ pin=>pin.key===slot.key).uuid)
      assert.equal(moveSyntaxChildSlot(fn,slots[1].key,-1),true);assert.equal(syntaxSlots(fn).filter(/* 比较 slot.field 与 'parameters'，返回严格相等的判断结果。 */ slot=>slot.field==='parameters')[0].key,slots[1].key)
      for(let i=0;i<slots.length;i++)assert.equal(fn.pins.find(/* 比较 pin.key 与 slots[i].key，返回严格相等的判断结果。 */ pin=>pin.key===slots[i].key).uuid,ids[i])
      run(graph,'assert_eq(number(2,7),72);')
    })
    check('Array slot reorder/removal changes values and removes only the removed pin connections',/** 重排并删除数组子槽，验证执行顺序、连接清理及槽索引重新连续。 */ ()=>{
      const graph=projectRhaiSyntax('fn values() { [1,2,3] } fn start() {}'),array=node(graph,'Array'),slots=syntaxSlots(array).filter(/* 返回 item.childId 的当前值。 */ item=>item.childId),removedPin=array.pins.find(/* 比较 pin.key 与 slots[0].key，返回严格相等的判断结果。 */ pin=>pin.key===slots[0].key).uuid
      moveSyntaxChildSlot(array,slots[2].key,-1);moveSyntaxChildSlot(array,slots[2].key,-1);run(graph,'assert_eq(values(),[3,1,2]);')
      removeSyntaxChildSlot(graph,array,slots[0].key);assert.ok(graph.edges.every(/* 先计算 edge.to.pinUuid!==removedPin；仅当其为真值时求右侧 edge.from.pinUuid!==removedPin，返回短路求值结果。 */ edge=>edge.to.pinUuid!==removedPin&&edge.from.pinUuid!==removedPin));run(graph,'assert_eq(values(),[3,2]);')
      assert.equal(syntaxSlots(array).filter(/* 比较 slot.field 与 'elements'，返回严格相等的判断结果。 */ slot=>slot.field==='elements')[0].index,0)
    })
    check('Block statement order and removal change the executed sequence; serialization preserves undo snapshots',/** 重排并删除块语句，验证执行效果和序列化前后结果，同时保留原快照。 */ ()=>{
      const graph=projectRhaiSyntax('fn values() { let output=[]; output.push(1); output.push(2); output } fn start() {}'),block=child(graph,node(graph,'FunctionDeclaration','values'),'body'),slots=syntaxSlots(block).filter(/* 返回 slot.childId 的当前值。 */ slot=>slot.childId),before=serializeGraphDocument(graph)
      moveSyntaxChildSlot(block,slots[2].key,-1);run(graph,'assert_eq(values(),[2,1]);');removeSyntaxChildSlot(graph,block,slots[1].key);run(graph,'assert_eq(values(),[2]);')
      run(parseGraphDocument(before),'assert_eq(values(),[1,2]);');run(parseGraphDocument(serializeGraphDocument(graph)),'assert_eq(values(),[2]);')
    })
    check('Call argument reordering changes the returned value through the real VM',/** 交换调用参数子槽，验证运行结果符合新的参数顺序。 */ ()=>{
      const graph=projectRhaiSyntax('fn number(a,b) { a*10+b } fn value() { number(2,7) } fn start() {}'),call=node(graph,'Call'),slots=syntaxSlots(call).filter(/* 先计算 slot.field==='arguments'；仅当其为真值时求右侧 slot.childId，返回短路求值结果。 */ slot=>slot.field==='arguments'&&slot.childId)
      moveSyntaxChildSlot(call,slots[1].key,-1);run(graph,'assert_eq(value(),72);')
    })
    check('Optional initializer, return value, else and loop counter can be removed and reintroduced structurally',/** 切换初始化器、分支、循环计数器与返回值可选子节点，验证生成语法和运行结果。 */ ()=>{
      const graph=projectRhaiSyntax('fn value() { let x=4; if false { return 1; } else { return x; } } fn start() {}'),declaration=node(graph,'VariableDeclaration','x'),branch=node(graph,'If')
      setSyntaxOptionalChild(graph,declaration,'initializer',false);assert.ok(!syntaxNodeOptionalChildren(declaration).find(/* 比较 item.field 与 'initializer'，返回严格相等的判断结果。 */ item=>item.field==='initializer').enabled);run(graph,'assert_eq(value(),());')
      setSyntaxOptionalChild(graph,branch,'alternate',false);run(graph,'assert_eq(value(),());')
      setSyntaxOptionalChild(graph,branch,'alternate',true);assert.ok(syntaxNodeOptionalChildren(branch).find(/* 比较 item.field 与 'alternate'，返回严格相等的判断结果。 */ item=>item.field==='alternate').enabled);run(graph)
      const loopGraph=projectRhaiSyntax('fn start() { for item in 0..2 { } }'),loop=node(loopGraph,'For');setSyntaxOptionalChild(loopGraph,loop,'counter',true);assert.match(run(loopGraph),/for \(item, index\)/)
      const returned=projectRhaiSyntax('fn value() { return 7; } fn start() {}'),returnNode=node(returned,'Return');setSyntaxOptionalChild(returned,returnNode,'value',false);run(returned,'assert_eq(value(),());')
    })
    check('128-pin limit and invalid slot mutation fail before changing the node',/** 验证语法槽达到引脚上限或字段类型不符时原节点不变，必需非序列槽不能删除。 */ ()=>{
      const graph=projectRhaiSyntax('fn start() {}'),block=node(graph,'Block');while(block.pins.length<128)addSyntaxChildSlot(block,'body');const before=JSON.stringify(block)
      assert.throws(/* 调用 addSyntaxChildSlot(block,'body') 并返回调用结果。 */ ()=>addSyntaxChildSlot(block,'body'),/128 pins/);assert.equal(JSON.stringify(block),before)
      assert.throws(/* 调用 addSyntaxChildSlot(block,'arguments') 并返回调用结果。 */ ()=>addSyntaxChildSlot(block,'arguments'),/no ordered/);assert.equal(JSON.stringify(block),before)
      const fn=node(graph,'FunctionDeclaration','start');assert.throws(/* 调用 removeSyntaxChildSlot(graph,fn,'body') 并返回调用结果。 */ ()=>removeSyntaxChildSlot(graph,fn,'body'),/Only an ordered/)
    })
    check('Typed method receiver, catch parameter and switch guard optional children compile and execute',/** 切换方法接收者、捕获参数和分支守卫等可选结构，验证生成源码与执行结果。 */ ()=>{
      const method=projectRhaiSyntax('fn plus(value) { this + value } fn start() {}'),fn=node(method,'FunctionDeclaration','plus');setSyntaxOptionalChild(method,fn,'receiver',true);assert.match(run(method,'assert_eq((5).plus(2),7);'),/fn "int"\.plus/)
      const caught=projectRhaiSyntax('fn value() { let output=0; try { throw "expected"; } catch(error) { output=4; } output } fn start() {}'),handler=node(caught,'Try');setSyntaxOptionalChild(caught,handler,'parameter',false);run(caught,'assert_eq(value(),4);');setSyntaxOptionalChild(caught,handler,'parameter',true);run(caught,'assert_eq(value(),4);')
      const switched=projectRhaiSyntax('fn value(input) { switch input { 1 => 10, _ => 20 } } fn start() {}'),branch=switched.nodes.find(/* 先计算 item.type==='rhai.SwitchCase'；仅当其为真值时求右侧 !syntaxFields(item).isDefault，返回短路求值结果。 */ item=>item.type==='rhai.SwitchCase'&&!syntaxFields(item).isDefault);setSyntaxOptionalChild(switched,branch,'guard',true);assert.match(run(switched,'assert_eq(value(1),10);'),/if true/);setSyntaxOptionalChild(switched,branch,'guard',false);run(switched,'assert_eq(value(2),20);')
    })
  }finally{runtime.free()}
}catch(error){failure=error;process.exitCode=1}
finally{
  await mkdir(join(root,'release-audits'),{recursive:true});await writeFile(process.argv.find(/* 调用 arg.startsWith('--report=') 并返回调用结果。 */ arg=>arg.startsWith('--report='))?.slice(9)??join(root,'release-audits/v26.12-syntax-slots.json'),JSON.stringify({status:failure?'failed':'passed',generatedAt:new Date().toISOString(),checks,error:failure?.stack,scope:'Real typed graph creation and slot mutation, compiler validation, serialize/restore and actual shipped WASM Rhai execution. Browser drag, click geometry and undo buttons remain separate checks.'},null,2)+'\n')
  await captureNodeBundle22(temporary);await rm(temporary,{recursive:true,force:true})
}
if(failure)console.error(failure);else console.log(`26.12 syntax slots: ${checks.length} compiler and WASM behavior checks passed`)
