import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createRenderer, h, nextTick, reactive } from 'vue'
import { parse, compileScript, compileTemplate, compileStyle } from 'vue/compiler-sfc'

const root=process.cwd(),sourceRoot=resolve(process.argv.find(value=>value.startsWith('--source-root='))?.slice(14)??root)
await mkdir(join(root,'.cache'),{recursive:true})
const temporary=await mkdtemp(join(root,'.cache','nova-v2613-panel-controls-')),checks=[]
const previousDocument=globalThis.document
const overlay={name:'staged-panel-dependencies',enforce:'pre',resolveId(source,importer){
  if(!importer||!source.startsWith('.'))return null
  const raw=resolve(dirname(importer.split('?')[0]),source),prefix=[join(sourceRoot,'src'),join(root,'src')].find(prefix=>raw.startsWith(prefix+sep))
  if(!prefix)return null
  for(const base of [sourceRoot,root])for(const extension of ['','.ts','.vue','.json','.js','/index.ts']){const candidate=join(base,'src',raw.slice(prefix.length+1)+extension);if(existsSync(candidate))return candidate.replaceAll('\\','/')}
  return null
}}
const check=async(name,operation)=>{try{await operation();checks.push({name,status:'passed'})}catch(error){checks.push({name,status:'failed',error:error instanceof Error?error.message:String(error)})}}
const element=tag=>({tag,children:[],props:{},parentElement:null,offsetWidth:365,offsetHeight:268,capture:null,getBoundingClientRect(){return{width:this.offsetWidth,height:this.offsetHeight}},focus(){},setPointerCapture(id){this.capture=id},hasPointerCapture(id){return this.capture===id},releasePointerCapture(){this.capture=null}})
const renderer=createRenderer({
  createElement:element,createText:text=>({...element('#text'),text}),createComment:text=>({...element('#comment'),text}),
  setText:(node,text)=>node.text=text,setElementText:(node,text)=>node.text=text,
  parentNode:node=>node.parentElement,nextSibling:node=>node.parentElement?.children[node.parentElement.children.indexOf(node)+1]??null,
  insert(node,parent,anchor){node.parentElement=parent;const index=anchor?parent.children.indexOf(anchor):-1;if(index<0)parent.children.push(node);else parent.children.splice(index,0,node)},
  remove(node){const siblings=node.parentElement?.children;if(siblings)siblings.splice(siblings.indexOf(node),1);node.parentElement=null},
  patchProp:(node,key,previous,value)=>node.props[key]=value
})
try{
  await writeFile(join(temporary,'package.json'),'{"type":"module"}\n')
  await build({configFile:false,root,plugins:[overlay,vue()],logLevel:'error',build:{target:'esnext',outDir:temporary,emptyOutDir:false,minify:false,lib:{entry:join(sourceRoot,'src/components/PanelResizeHandle.vue'),formats:['es'],fileName:()=> 'handle.mjs'},rollupOptions:{external:['vue']}}})
  const {default:Handle}=await import(pathToFileURL(join(temporary,'handle.mjs')).href)
  globalThis.document={body:{style:{cursor:'crosshair',userSelect:'text'}}}
  const setup=()=>{
    const props=reactive({modelValue:520,orientation:'horizontal',minimum:120,maximum:520,reverse:true,label:'Panel',disabled:false}),events=[]
    const container=element('parent'),app=renderer.createApp({render:()=>h(Handle,{...props,'onUpdate:modelValue':value=>{props.modelValue=value;events.push(['value',value])},onCommit:value=>events.push(['commit',value]),onDragging:value=>events.push(['dragging',value])})})
    app.mount(container);const handle=container.children[0]
    const event=(key,overrides={})=>{const callback=handle.props[key];assert.equal(typeof callback,'function',key);callback({currentTarget:handle,target:handle,pointerId:7,button:0,clientX:100,clientY:100,stopPropagation(){},preventDefault(){},...overrides})}
    return{props,events,container,app,handle,event}
  }
  await check('Rejected mouse buttons never enter dragging or alter document styles',()=>{
    const state=setup();try{state.event('onPointerdown',{button:2});assert.deepEqual(state.events,[]);assert.equal(document.body.style.cursor,'crosshair')}finally{state.app.unmount()}
  })
  await check('A no-movement click preserves a viewport-capped saved preference',()=>{
    const state=setup();try{state.event('onPointerdown');state.event('onPointerup');assert.equal(state.props.modelValue,520);assert.equal(document.body.style.cursor,'crosshair');assert.deepEqual(state.events.filter(value=>value[0]==='dragging'),[['dragging',true],['dragging',false]])}finally{state.app.unmount()}
  })
  await check('Pointer motion starts at visible size and Escape restores the original preference',async()=>{
    const state=setup();try{state.event('onPointerdown');state.event('onPointermove',{clientY:90});assert.equal(state.props.modelValue,278);await nextTick();state.event('onKeydown',{key:'Escape'});assert.equal(state.props.modelValue,520);assert.equal(state.handle.capture,null);assert.deepEqual(document.body.style,{cursor:'crosshair',userSelect:'text'})}finally{state.app.unmount()}
  })
  await check('Lost pointer capture rolls back size and clears dragging state',()=>{
    const state=setup();try{state.event('onPointerdown');state.event('onPointermove',{clientY:150});state.event('onLostpointercapture');assert.equal(state.props.modelValue,520);assert.deepEqual(state.events.at(-1),['dragging',false])}finally{state.app.unmount()}
  })
  await check('Disabling a captured separator cancels the edit and releases styles',async()=>{
    const state=setup();try{state.event('onPointerdown');state.event('onPointermove',{clientY:150});state.props.disabled=true;await nextTick();assert.equal(state.props.modelValue,520);assert.equal(document.body.style.userSelect,'text');assert.equal(state.handle.capture,null)}finally{state.app.unmount()}
  })
  await check('Unmount cleanup cannot commit an old width into a newly selected workspace',()=>{
    const state=setup();state.event('onPointerdown');state.event('onPointermove',{clientY:150});state.events.splice(0);state.app.unmount();assert.deepEqual(state.events,[]);assert.deepEqual(document.body.style,{cursor:'crosshair',userSelect:'text'});assert.equal(state.handle.capture,null)
  })
  await check('Keyboard controls use visible extent and retain directional and absolute bounds',async()=>{
    const state=setup();try{state.event('onKeydown',{key:'ArrowUp'});assert.equal(state.props.modelValue,276);await nextTick();state.event('onKeydown',{key:'Home'});assert.equal(state.props.modelValue,120);await nextTick();state.event('onKeydown',{key:'End'});assert.equal(state.props.modelValue,520)}finally{state.app.unmount()}
  })
  await check('Unrelated shortcuts bubble while handled resize keys stop propagation',()=>{
    const state=setup();let stopped=0,prevented=0;try{state.event('onKeydown',{key:'s',ctrlKey:true,stopPropagation(){stopped++},preventDefault(){prevented++}});assert.equal(stopped,0);assert.equal(prevented,0);state.event('onKeydown',{key:'ArrowUp',stopPropagation(){stopped++},preventDefault(){prevented++}});assert.equal(stopped,1);assert.equal(prevented,1)}finally{state.app.unmount()}
  })
  await check('Edited Vue scripts, templates and scoped style sheets compile successfully',async()=>{
    for(const file of ['components/PanelResizeHandle.vue','components/PanelMaximizeButton.vue','components/SceneSideBar.vue','components/ConfigPanel.vue','components/EditorBottomPanel.vue','components/WorkspaceManager.vue','layout/EditorLayout.vue']){
      const filename=join(sourceRoot,'src',file),source=await readFile(filename,'utf8'),{descriptor,errors}=parse(source,{filename});assert.deepEqual(errors,[])
      const script=compileScript(descriptor,{id:file}),template=compileTemplate({source:descriptor.template.content,filename,id:file,compilerOptions:{bindingMetadata:script.bindings}});assert.deepEqual(template.errors,[])
      for(const style of descriptor.styles)assert.deepEqual(compileStyle({source:style.content,filename,id:file,scoped:style.scoped}).errors,[])
    }
  })
  const failed=checks.filter(value=>value.status==='failed'),status=failed.length?'failed':'passed',output=sourceRoot===root?join(root,'release-audits/v26.13-panel-controls.json'):join(sourceRoot,'reports/panel-controls-verification.json')
  await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify({status,generatedAt:new Date().toISOString(),scope:'Actual compiled Vue component handlers executed using the Vue custom renderer; no browser geometry, paint, hit-testing or focus-observation claim.',checks},null,2)+'\n')
  console.log(JSON.stringify({status,checks:checks.length,failed,output}));if(failed.length)process.exitCode=1
}finally{globalThis.document=previousDocument;await rm(temporary,{recursive:true,force:true})}
