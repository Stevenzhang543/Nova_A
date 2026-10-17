/** 验证脚本（v26.12-script-ui）：组织对应功能与边界场景检查，断言行为并汇总验证结果。 */
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'
import vue from '@vitejs/plugin-vue'

const root = dirname(dirname(fileURLToPath(import.meta.url))), temporary = await mkdtemp(join(tmpdir(),'nova-v2612-script-ui-'))
const checks = []
const check = /** 执行异步UI逻辑检查并在正常完成后记录通过。 */ async (name, run) => { await run(); checks.push({name,status:'passed'}) }
let failure
try {
  await writeFile(join(temporary,'package.json'),'{"type":"module"}\n')
  await build({configFile:false,root,logLevel:'error',build:{ssr:true,outDir:temporary,emptyOutDir:false,rollupOptions:{input:{presentation:join(root,'src/editor/scriptConversionPresentation.ts'),language:join(root,'src/editor/scriptLanguage.ts')},output:{entryFileNames:'[name].mjs'}}}})
  const {offsetAt,spanAt,textareaSelection,sourceOffsetFromTextarea,regionAt,conversionGate,acceptsConversionReview,saveBeforeNavigation,conversionCopy} = await import(pathToFileURL(join(temporary,'presentation.mjs')).href)
  const {analyzeScript,completionDetails,ScriptLanguageService}=await import(pathToFileURL(join(temporary,'language.mjs')).href)
  const source = '// 😀\r\nfn start() {\r\n  let café = "中文";\r\n}\r\n'
  const assessment = {valid:true,structural:3,sourceBacked:0,unpreservable:0,regions:[],diagnostics:[]}
  await check('Windows CRLF and UTF-16 spans select the exact identifier in the normalized textarea', /** 验证CRLF和Unicode下源码范围与文本框选区的双向偏移换算。 */ () => {
    const span = spanAt(source,3,7,3,11)
    assert.equal(source.slice(span.start,span.end),'café')
    const [start,end] = textareaSelection(source,span)
    assert.equal(source.replace(/\r\n/g,'\n').slice(start,end),'café')
    assert.equal(sourceOffsetFromTextarea(source,start),span.start)
    assert.equal(sourceOffsetFromTextarea(source,end),span.end)
    assert.equal(offsetAt(source,2,1),source.indexOf('fn start'))
    assert.deepEqual(textareaSelection(source,{start:3,end:5}),[3,5])
    assert.equal(source.slice(3,5),'😀')
  })
  await check('LF, CR-only, final-line and out-of-bounds navigation stays within source', /** 验证混合换行、超界行列和负偏移均得到安全裁剪的位置。 */ () => {
    assert.equal(offsetAt('one\rtwo\rthree',3,2),9)
    assert.equal(offsetAt('one\ntwo',2,100),7)
    assert.equal(offsetAt('one\ntwo',200,1),7)
    assert.deepEqual(textareaSelection('abc',{start:-50,end:200}),[0,3])
    assert.deepEqual(textareaSelection('a\rb',{start:2,end:3}),[2,3])
    assert.equal(sourceOffsetFromTextarea('a\r\nb',999),4)
    assert.equal(sourceOffsetFromTextarea('a\r\nb',-1),0)
  })
  await check('Diagnostic navigation chooses the nested expression instead of its containing function', /** 验证源码定位选择最内层匹配区域，无匹配时返回空值。 */ () => {
    const outer = {id:'function',kind:'Function',classification:'structural',span:spanAt(source,2,1,4,2),nodeUuid:'function-node',scopeUuid:'root'}
    const inner = {id:'binding',kind:'Identifier',classification:'structural',span:spanAt(source,3,7,3,11),nodeUuid:'identifier-node',scopeUuid:'root'}
    assert.equal(regionAt({...assessment,regions:[outer,inner]},inner.span).nodeUuid,'identifier-node')
    assert.equal(regionAt({...assessment,regions:[outer,inner]},spanAt(source,1,1,1,2)),undefined)
  })
  await check('Source-backed regions require review and never count as editable structure', /** 验证结构转换、保留源码审阅及不可保留或错误状态的转换门禁。 */ () => {
    assert.equal(conversionGate(assessment),'ready')
    assert.equal(conversionGate({...assessment,sourceBacked:1}),'review')
    assert.equal(conversionGate({...assessment,sourceBacked:1},true),'ready')
    assert.equal(conversionGate({...assessment,unpreservable:1},true),'blocked')
    assert.equal(conversionGate({...assessment,valid:false},true),'blocked')
    assert.equal(conversionGate({...assessment,diagnostics:[{severity:'error'}]},true),'blocked')
  })
  await check('Review approval cannot apply to another asset or a changed draft', /** 验证转换审阅仅在源码和资源身份仍一致时有效。 */ () => {
    const preview = {source,assetUuid:'script-a',assessment}
    assert.equal(acceptsConversionReview({...preview},preview),true)
    assert.equal(acceptsConversionReview({...preview,source:source+' '},preview),false)
    assert.equal(acceptsConversionReview({...preview,assetUuid:'script-b'},preview),false)
    assert.equal(acceptsConversionReview(null,preview),false)
  })
  await check('Dirty editor navigation awaits its save and retains the editor after failure or cancellation', /** 验证导航等待保存完成，拒绝缺失或失败保存，干净编辑器跳过保存且异常向上传递。 */ async () => {
    let resolveSave, calls = 0, destinationEntered = false
    const save = /** 记录保存调用并返回由测试显式完成的异步任务。 */ () => { calls++; return new Promise(/** 保存测试保存任务的完成处理器以控制其时序。 */ resolve => {resolveSave=resolve}) }
    const transition = (/** 等待保存门禁通过后才标记进入目标界面。 */ async()=>{ if(await saveBeforeNavigation(true,save)) destinationEntered=true })()
    await Promise.resolve(); assert.equal(calls,1); assert.equal(destinationEntered,false)
    resolveSave(false); await transition; assert.equal(destinationEntered,false)
    assert.equal(await saveBeforeNavigation(true,null),false)
    assert.equal(await saveBeforeNavigation(true,/* 返回固定值 false。 */ async()=>false),false)
    assert.equal(await saveBeforeNavigation(true,/* 返回固定值 true。 */ async()=>true),true)
    assert.equal(await saveBeforeNavigation(false,/** 在干净编辑器错误地触发保存时主动抛出测试失败。 */ ()=>{throw Error('Clean editors must not save')}),true)
    await assert.rejects(saveBeforeNavigation(true,/** 模拟异步保存发生磁盘错误。 */ async()=>{throw Error('disk failure')}),/disk failure/)
  })
  await check('All new user-facing conversion copy is present in English, German and Chinese',/** 验证英德中文转换界面文案键完整且非空。 */ ()=>{
    const keys=Object.keys(conversionCopy.en)
    for(const locale of ['en','de','zh']) for(const key of keys) assert.ok(conversionCopy[locale][key]?.trim(),`${locale}:${key}`)
  })
  await check('Resolved module functions are recognized and completed while unrelated unknown calls remain errors',/** 验证模块解析消除外部函数误报，同时保留未知调用诊断及本地符号。 */ ()=>{
    const source='use "Assets/Scripts/shared.rhai";\nfn start() { shared_value(); unknown_typo(); local_value(); }\nfn local_value() { 1 }\n'
    const unresolved=analyzeScript(source),resolved=analyzeScript(source,2,4,['shared_value'])
    assert.ok(unresolved.diagnostics.some(/* 先计算 item.code==='NOVA-SEM-003'；仅当其为真值时求右侧 item.message.includes('shared_value')，返回短路求值结果。 */ item=>item.code==='NOVA-SEM-003'&&item.message.includes('shared_value')))
    assert.deepEqual(resolved.diagnostics.filter(/* 比较 item.code 与 'NOVA-SEM-003'，返回严格相等的判断结果。 */ item=>item.code==='NOVA-SEM-003').map(/* 返回 item.message 的当前值。 */ item=>item.message),['Unknown function “unknown_typo”.'])
    assert.equal(completionDetails('shared_',resolved).find(/* 比较 item.label 与 'shared_value'，返回严格相等的判断结果。 */ item=>item.label==='shared_value').detail,'Resolved project module function')
    assert.ok(resolved.symbols.some(/* 比较 item.name 与 'local_value'，返回严格相等的判断结果。 */ item=>item.name==='local_value'))
  })
  await check('Language service fallback and aborted analysis preserve explicit module function names',/** 验证语言服务在正常和已取消请求情况下都保留外部函数信息，结束后释放服务。 */ async()=>{
    const service=new ScriptLanguageService(),source='fn start() { shared_value(); unknown_typo(); }',controller=new AbortController();controller.abort()
    for(const options of [{externalFunctions:['shared_value']},{externalFunctions:['shared_value'],signal:controller.signal}]){
      const analysis=await service.analyze(source,options)
      assert.deepEqual(analysis.diagnostics.filter(/* 比较 item.code 与 'NOVA-SEM-003'，返回严格相等的判断结果。 */ item=>item.code==='NOVA-SEM-003').map(/* 返回 item.message 的当前值。 */ item=>item.message),['Unknown function “unknown_typo”.'])
    }
    service.dispose()
  })
  const bridge = 'virtual:nova-conversion-panel', normalizedRoot=root.replaceAll('\\','/')
  await build({configFile:false,root,logLevel:'error',plugins:[{name:'conversion-ui-entry',resolveId:/* 根据 id===bridge 的真假，分别返回 '\0'+bridge 或 undefined。 */ id=>id===bridge?'\0'+bridge:undefined,load:/** 为面板测试虚拟入口导出转换面板、Vue渲染接口及偏好状态。 */ id=>id==='\0'+bridge?`export { default as Panel } from '${normalizedRoot}/src/components/ScriptConversionPanel.vue'; export { createRenderer, h, nextTick } from '${normalizedRoot}/node_modules/vue/dist/vue.runtime.esm-bundler.js'; export { preferencesState } from '${normalizedRoot}/src/store/preferences.ts'`:undefined},vue()],build:{outDir:temporary,emptyOutDir:false,minify:false,lib:{entry:bridge,formats:['es'],fileName:/* 返回固定值 'panel.mjs'。 */ ()=> 'panel.mjs'},rollupOptions:{input:bridge}}})
  const {Panel,createRenderer,h,nextTick,preferencesState}=await import(pathToFileURL(join(temporary,'panel.mjs')).href)
  const renderer=createRenderer({
    createElement:/** 创建具有空子节点和属性的测试元素。 */ type=>({type,children:[],props:{},text:''}),createText:/** 创建自定义渲染器使用的文本节点。 */ text=>({type:'#text',text,children:[],props:{}}),createComment:/** 创建自定义渲染器使用的注释节点。 */ text=>({type:'#comment',text,children:[],props:{}}),
    insert:/** 从旧父节点移除测试节点，并按锚点位置插入新父节点。 */ (node,parent,anchor)=>{if(node.parent){const index=node.parent.children.indexOf(node);if(index>=0)node.parent.children.splice(index,1)}node.parent=parent;const index=anchor?parent.children.indexOf(anchor):-1;if(index<0)parent.children.push(node);else parent.children.splice(index,0,node)},
    remove:/** 从父节点的子列表中移除测试节点。 */ node=>{if(node.parent){const index=node.parent.children.indexOf(node);if(index>=0)node.parent.children.splice(index,1)}},
    setText:/** 更新测试节点的文本内容。 */ (node,text)=>{node.text=text},setElementText:/** 设置元素文本并清空其子节点列表。 */ (node,text)=>{node.text=text;node.children=[]},parentNode:/* 返回 node.parent 的当前值。 */ node=>node.parent,nextSibling:/* 当 node.parent?.children[node.parent.children.indexOf(node)+1] 为 null 或 undefined 时返回 null，否则保留左侧值。 */ node=>node.parent?.children[node.parent.children.indexOf(node)+1]??null,patchProp:/** 写入自定义渲染器节点的指定属性。 */ (node,key,_old,value)=>{node.props[key]=value},
  })
  const descendants=/* 返回按声明顺序构造的数组 [node,...node.children.flatMap(descendants)]。 */ node=>[node,...node.children.flatMap(descendants)], textOf=/** 递归拼接节点文本，忽略注释子节点。 */ node=>node.text+node.children.filter(/* 比较 child.type 与 '#comment'，返回严格不等的判断结果。 */ child=>child.type!=='#comment').map(textOf).join('')
  await check('Mounted Vue coverage shows source-backed regions separately and emits exact code/node navigation',/** 挂载转换面板，验证覆盖数量、源码及图导航事件与德中文切换，最后卸载并恢复语言。 */ async()=>{
    const span=spanAt(source,3,7,3,11),events=[],model={...assessment,structural:1,sourceBacked:1,regions:[{id:'binding',kind:'Identifier',classification:'structural',span,nodeUuid:'identifier-node',scopeUuid:'root'},{id:'source',kind:'Source',classification:'source-backed',span,reason:'Preserved verbatim'}],diagnostics:[{code:'TEST',severity:'warning',message:'Check this expression',span}]}
    const container={type:'root',children:[],props:{},text:''}
    const app=renderer.createApp({render:/* 调用 h(Panel,{assessment:model,source,onNavigate:request=>events.push(request)}) 并返回调用结果。 */ ()=>h(Panel,{assessment:model,source,onNavigate:/* 调用 events.push(request) 并返回调用结果。 */ request=>events.push(request)})});app.mount(container)
    let nodes=descendants(container)
    assert.equal(nodes.find(/* 比较 node.props['data-coverage'] 与 'structural'，返回严格相等的判断结果。 */ node=>node.props['data-coverage']==='structural').text,'1')
    assert.equal(nodes.find(/* 比较 node.props['data-coverage'] 与 'source-backed'，返回严格相等的判断结果。 */ node=>node.props['data-coverage']==='source-backed').text,'1')
    assert.ok(textOf(container).includes('not editable typed blocks'))
    nodes.find(/* 先计算 node.type==='button'；仅当其为真值时求右侧 textOf(node)==='Select code'，返回短路求值结果。 */ node=>node.type==='button'&&textOf(node)==='Select code').props.onClick()
    assert.deepEqual(events[0],{target:'code',span,nodeUuid:'identifier-node',scopeUuid:'root'})
    nodes.find(/* 先计算 node.type==='button'；仅当其为真值时求右侧 textOf(node)==='Select graph node'，返回短路求值结果。 */ node=>node.type==='button'&&textOf(node)==='Select graph node').props.onClick()
    assert.equal(events[1].target,'graph');assert.equal(events[1].nodeUuid,'identifier-node')
    preferencesState.locale='de';await nextTick();assert.ok(textOf(container).includes('Quelltextgebunden'))
    preferencesState.locale='zh';await nextTick();assert.ok(textOf(container).includes('保留源代码'))
    app.unmount();preferencesState.locale='en'
  })
} catch(error) { failure=error; process.exitCode=1 }
finally {
  await mkdir(join(root,'release-audits'),{recursive:true})
  await writeFile(join(root,'release-audits/v26.12-script-ui.json'),JSON.stringify({status:failure?'failed':'passed',generatedAt:new Date().toISOString(),checks,error:failure?.stack,scope:'Behavior of production navigation/range/review helpers used by the Vue editors. Does not certify rendered layout, clicks, parser completeness or runtime equivalence.'},null,2)+'\n')
  await rm(temporary,{recursive:true,force:true})
}
if(failure) console.error(failure); else console.log(`26.12 scripting UI: ${checks.length} behavior checks passed`)
