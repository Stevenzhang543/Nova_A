import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'
import vue from '@vitejs/plugin-vue'

const root = dirname(dirname(fileURLToPath(import.meta.url))), temporary = await mkdtemp(join(tmpdir(),'nova-v2612-script-ui-'))
const checks = []
const check = async (name, run) => { await run(); checks.push({name,status:'passed'}) }
let failure
try {
  await writeFile(join(temporary,'package.json'),'{"type":"module"}\n')
  await build({configFile:false,root,logLevel:'error',build:{ssr:true,outDir:temporary,emptyOutDir:false,rollupOptions:{input:{presentation:join(root,'src/editor/scriptConversionPresentation.ts'),language:join(root,'src/editor/scriptLanguage.ts')},output:{entryFileNames:'[name].mjs'}}}})
  const {offsetAt,spanAt,textareaSelection,sourceOffsetFromTextarea,regionAt,conversionGate,acceptsConversionReview,saveBeforeNavigation,conversionCopy} = await import(pathToFileURL(join(temporary,'presentation.mjs')).href)
  const {analyzeScript,completionDetails,ScriptLanguageService}=await import(pathToFileURL(join(temporary,'language.mjs')).href)
  const source = '// 😀\r\nfn start() {\r\n  let café = "中文";\r\n}\r\n'
  const assessment = {valid:true,structural:3,sourceBacked:0,unpreservable:0,regions:[],diagnostics:[]}
  await check('Windows CRLF and UTF-16 spans select the exact identifier in the normalized textarea', () => {
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
  await check('LF, CR-only, final-line and out-of-bounds navigation stays within source', () => {
    assert.equal(offsetAt('one\rtwo\rthree',3,2),9)
    assert.equal(offsetAt('one\ntwo',2,100),7)
    assert.equal(offsetAt('one\ntwo',200,1),7)
    assert.deepEqual(textareaSelection('abc',{start:-50,end:200}),[0,3])
    assert.deepEqual(textareaSelection('a\rb',{start:2,end:3}),[2,3])
    assert.equal(sourceOffsetFromTextarea('a\r\nb',999),4)
    assert.equal(sourceOffsetFromTextarea('a\r\nb',-1),0)
  })
  await check('Diagnostic navigation chooses the nested expression instead of its containing function', () => {
    const outer = {id:'function',kind:'Function',classification:'structural',span:spanAt(source,2,1,4,2),nodeUuid:'function-node',scopeUuid:'root'}
    const inner = {id:'binding',kind:'Identifier',classification:'structural',span:spanAt(source,3,7,3,11),nodeUuid:'identifier-node',scopeUuid:'root'}
    assert.equal(regionAt({...assessment,regions:[outer,inner]},inner.span).nodeUuid,'identifier-node')
    assert.equal(regionAt({...assessment,regions:[outer,inner]},spanAt(source,1,1,1,2)),undefined)
  })
  await check('Source-backed regions require review and never count as editable structure', () => {
    assert.equal(conversionGate(assessment),'ready')
    assert.equal(conversionGate({...assessment,sourceBacked:1}),'review')
    assert.equal(conversionGate({...assessment,sourceBacked:1},true),'ready')
    assert.equal(conversionGate({...assessment,unpreservable:1},true),'blocked')
    assert.equal(conversionGate({...assessment,valid:false},true),'blocked')
    assert.equal(conversionGate({...assessment,diagnostics:[{severity:'error'}]},true),'blocked')
  })
  await check('Review approval cannot apply to another asset or a changed draft', () => {
    const preview = {source,assetUuid:'script-a',assessment}
    assert.equal(acceptsConversionReview({...preview},preview),true)
    assert.equal(acceptsConversionReview({...preview,source:source+' '},preview),false)
    assert.equal(acceptsConversionReview({...preview,assetUuid:'script-b'},preview),false)
    assert.equal(acceptsConversionReview(null,preview),false)
  })
  await check('Dirty editor navigation awaits its save and retains the editor after failure or cancellation', async () => {
    let resolveSave, calls = 0, destinationEntered = false
    const save = () => { calls++; return new Promise(resolve => {resolveSave=resolve}) }
    const transition = (async()=>{ if(await saveBeforeNavigation(true,save)) destinationEntered=true })()
    await Promise.resolve(); assert.equal(calls,1); assert.equal(destinationEntered,false)
    resolveSave(false); await transition; assert.equal(destinationEntered,false)
    assert.equal(await saveBeforeNavigation(true,null),false)
    assert.equal(await saveBeforeNavigation(true,async()=>false),false)
    assert.equal(await saveBeforeNavigation(true,async()=>true),true)
    assert.equal(await saveBeforeNavigation(false,()=>{throw Error('Clean editors must not save')}),true)
    await assert.rejects(saveBeforeNavigation(true,async()=>{throw Error('disk failure')}),/disk failure/)
  })
  await check('All new user-facing conversion copy is present in English, German and Chinese',()=>{
    const keys=Object.keys(conversionCopy.en)
    for(const locale of ['en','de','zh']) for(const key of keys) assert.ok(conversionCopy[locale][key]?.trim(),`${locale}:${key}`)
  })
  await check('Resolved module functions are recognized and completed while unrelated unknown calls remain errors',()=>{
    const source='use "Assets/Scripts/shared.rhai";\nfn start() { shared_value(); unknown_typo(); local_value(); }\nfn local_value() { 1 }\n'
    const unresolved=analyzeScript(source),resolved=analyzeScript(source,2,4,['shared_value'])
    assert.ok(unresolved.diagnostics.some(item=>item.code==='NOVA-SEM-003'&&item.message.includes('shared_value')))
    assert.deepEqual(resolved.diagnostics.filter(item=>item.code==='NOVA-SEM-003').map(item=>item.message),['Unknown function “unknown_typo”.'])
    assert.equal(completionDetails('shared_',resolved).find(item=>item.label==='shared_value').detail,'Resolved project module function')
    assert.ok(resolved.symbols.some(item=>item.name==='local_value'))
  })
  await check('Language service fallback and aborted analysis preserve explicit module function names',async()=>{
    const service=new ScriptLanguageService(),source='fn start() { shared_value(); unknown_typo(); }',controller=new AbortController();controller.abort()
    for(const options of [{externalFunctions:['shared_value']},{externalFunctions:['shared_value'],signal:controller.signal}]){
      const analysis=await service.analyze(source,options)
      assert.deepEqual(analysis.diagnostics.filter(item=>item.code==='NOVA-SEM-003').map(item=>item.message),['Unknown function “unknown_typo”.'])
    }
    service.dispose()
  })
  const bridge = 'virtual:nova-conversion-panel', normalizedRoot=root.replaceAll('\\','/')
  await build({configFile:false,root,logLevel:'error',plugins:[{name:'conversion-ui-entry',resolveId:id=>id===bridge?'\0'+bridge:undefined,load:id=>id==='\0'+bridge?`export { default as Panel } from '${normalizedRoot}/src/components/ScriptConversionPanel.vue'; export { createRenderer, h, nextTick } from '${normalizedRoot}/node_modules/vue/dist/vue.runtime.esm-bundler.js'; export { preferencesState } from '${normalizedRoot}/src/store/preferences.ts'`:undefined},vue()],build:{outDir:temporary,emptyOutDir:false,minify:false,lib:{entry:bridge,formats:['es'],fileName:()=> 'panel.mjs'},rollupOptions:{input:bridge}}})
  const {Panel,createRenderer,h,nextTick,preferencesState}=await import(pathToFileURL(join(temporary,'panel.mjs')).href)
  const renderer=createRenderer({
    createElement:type=>({type,children:[],props:{},text:''}),createText:text=>({type:'#text',text,children:[],props:{}}),createComment:text=>({type:'#comment',text,children:[],props:{}}),
    insert:(node,parent,anchor)=>{if(node.parent){const index=node.parent.children.indexOf(node);if(index>=0)node.parent.children.splice(index,1)}node.parent=parent;const index=anchor?parent.children.indexOf(anchor):-1;if(index<0)parent.children.push(node);else parent.children.splice(index,0,node)},
    remove:node=>{if(node.parent){const index=node.parent.children.indexOf(node);if(index>=0)node.parent.children.splice(index,1)}},
    setText:(node,text)=>{node.text=text},setElementText:(node,text)=>{node.text=text;node.children=[]},parentNode:node=>node.parent,nextSibling:node=>node.parent?.children[node.parent.children.indexOf(node)+1]??null,patchProp:(node,key,_old,value)=>{node.props[key]=value},
  })
  const descendants=node=>[node,...node.children.flatMap(descendants)], textOf=node=>node.text+node.children.filter(child=>child.type!=='#comment').map(textOf).join('')
  await check('Mounted Vue coverage shows source-backed regions separately and emits exact code/node navigation',async()=>{
    const span=spanAt(source,3,7,3,11),events=[],model={...assessment,structural:1,sourceBacked:1,regions:[{id:'binding',kind:'Identifier',classification:'structural',span,nodeUuid:'identifier-node',scopeUuid:'root'},{id:'source',kind:'Source',classification:'source-backed',span,reason:'Preserved verbatim'}],diagnostics:[{code:'TEST',severity:'warning',message:'Check this expression',span}]}
    const container={type:'root',children:[],props:{},text:''}
    const app=renderer.createApp({render:()=>h(Panel,{assessment:model,source,onNavigate:request=>events.push(request)})});app.mount(container)
    let nodes=descendants(container)
    assert.equal(nodes.find(node=>node.props['data-coverage']==='structural').text,'1')
    assert.equal(nodes.find(node=>node.props['data-coverage']==='source-backed').text,'1')
    assert.ok(textOf(container).includes('not editable typed blocks'))
    nodes.find(node=>node.type==='button'&&textOf(node)==='Select code').props.onClick()
    assert.deepEqual(events[0],{target:'code',span,nodeUuid:'identifier-node',scopeUuid:'root'})
    nodes.find(node=>node.type==='button'&&textOf(node)==='Select graph node').props.onClick()
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
