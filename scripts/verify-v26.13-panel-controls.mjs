/** 验证脚本（v26.13-panel-controls）：组织对应功能与边界场景检查，断言行为并汇总验证结果。 */
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createRenderer, h, nextTick, reactive } from 'vue'
import { parse, compileScript, compileTemplate, compileStyle } from 'vue/compiler-sfc'

const root=process.cwd(),sourceRoot=resolve(process.argv.find(/* 调用 value.startsWith('--source-root=') 并返回调用结果。 */ value=>value.startsWith('--source-root='))?.slice(14)??root)
await mkdir(join(root,'.cache'),{recursive:true})
const temporary=await mkdtemp(join(root,'.cache','nova-v2613-panel-controls-')),checks=[]
const previousDocument=globalThis.document
const overlay={name:'staged-panel-dependencies',enforce:'pre',/** 从审计源码或当前仓库解析相对模块，支持TS、Vue、JSON与入口文件。 */ resolveId(source,importer){
  if(!importer||!source.startsWith('.'))return null
  const raw=resolve(dirname(importer.split('?')[0]),source),prefix=[join(sourceRoot,'src'),join(root,'src')].find(/* 调用 raw.startsWith(prefix+sep) 并返回调用结果。 */ prefix=>raw.startsWith(prefix+sep))
  if(!prefix)return null
  for(const base of [sourceRoot,root])for(const extension of ['','.ts','.vue','.json','.js','/index.ts']){const candidate=join(base,'src',raw.slice(prefix.length+1)+extension);if(existsSync(candidate))return candidate.replaceAll('\\','/')}
  return null
}}
const check=/** 执行异步无障碍检查并捕获可读错误，记录通过或失败。 */ async(name,operation)=>{try{await operation();checks.push({name,status:'passed'})}catch(error){checks.push({name,status:'failed',error:error instanceof Error?error.message:String(error)})}}
const element=/** 创建带尺寸、焦点和指针捕获接口的面板控件测试元素。 */ tag=>({tag,children:[],props:{},parentElement:null,offsetWidth:365,offsetHeight:268,capture:null,/* 返回具有所列字段的新对象 {width:this.offsetWidth,height:this.offsetHeight}。 */ getBoundingClientRect(){return{width:this.offsetWidth,height:this.offsetHeight}},/** 提供无需真实浏览器焦点变更的测试接口。 */ focus(){},/** 记录测试元素捕获的指针标识。 */ setPointerCapture(id){this.capture=id},/* 比较 this.capture 与 id，返回严格相等的判断结果。 */ hasPointerCapture(id){return this.capture===id},/** 清除测试元素的指针捕获状态。 */ releasePointerCapture(){this.capture=null}})
const renderer=createRenderer({
  createElement:element,createText:/** 在测试元素基础上创建文本节点。 */ text=>({...element('#text'),text}),createComment:/** 在测试元素基础上创建注释节点。 */ text=>({...element('#comment'),text}),
  setText:/** 更新测试节点文本。 */ (node,text)=>node.text=text,setElementText:/** 更新测试节点文本。 */ (node,text)=>node.text=text,
  parentNode:/* 返回 node.parentElement 的当前值。 */ node=>node.parentElement,nextSibling:/* 当 node.parentElement?.children[node.parentElement.children.indexOf(node)+1] 为 null 或 undefined 时返回 null，否则保留左侧值。 */ node=>node.parentElement?.children[node.parentElement.children.indexOf(node)+1]??null,
  /** 将节点按锚点插入父元素，并设置父元素引用。 */ insert(node,parent,anchor){node.parentElement=parent;const index=anchor?parent.children.indexOf(anchor):-1;if(index<0)parent.children.push(node);else parent.children.splice(index,0,node)},
  /** 从父元素列表移除节点并清除父引用。 */ remove(node){const siblings=node.parentElement?.children;if(siblings)siblings.splice(siblings.indexOf(node),1);node.parentElement=null},
  patchProp:/** 更新自定义渲染节点的属性值。 */ (node,key,previous,value)=>node.props[key]=value
})
try{
  await writeFile(join(temporary,'package.json'),'{"type":"module"}\n')
  await build({configFile:false,root,plugins:[overlay,vue()],logLevel:'error',build:{target:'esnext',outDir:temporary,emptyOutDir:false,minify:false,lib:{entry:join(sourceRoot,'src/components/PanelResizeHandle.vue'),formats:['es'],fileName:/* 返回固定值 'handle.mjs'。 */ ()=> 'handle.mjs'},rollupOptions:{external:['vue']}}})
  const {default:Handle}=await import(pathToFileURL(join(temporary,'handle.mjs')).href)
  globalThis.document={body:{style:{cursor:'crosshair',userSelect:'text'}}}
  const setup=/** 挂载响应式面板缩放控件，收集尺寸与拖动事件并提供事件触发接口。 */ ()=>{
    const props=reactive({modelValue:520,orientation:'horizontal',minimum:120,maximum:520,reverse:true,label:'Panel',disabled:false}),events=[]
    const container=element('parent'),app=renderer.createApp({render:/** 渲染缩放控件并连接尺寸更新、提交和拖动状态回调。 */ ()=>h(Handle,{...props,'onUpdate:modelValue':/** 同步面板尺寸模型并记录尺寸变更事件。 */ value=>{props.modelValue=value;events.push(['value',value])},onCommit:/* 调用 events.push(['commit',value]) 并返回调用结果。 */ value=>events.push(['commit',value]),onDragging:/* 调用 events.push(['dragging',value]) 并返回调用结果。 */ value=>events.push(['dragging',value])})})
    app.mount(container);const handle=container.children[0]
    const event=/** 查找指定事件处理器并传入默认指针参数与测试覆盖值。 */ (key,overrides={})=>{const callback=handle.props[key];assert.equal(typeof callback,'function',key);callback({currentTarget:handle,target:handle,pointerId:7,button:0,clientX:100,clientY:100,/** 提供不执行真实冒泡处理的事件替身。 */ stopPropagation(){},/** 提供无需执行浏览器默认行为处理的事件替身。 */ preventDefault(){},...overrides})}
    return{props,events,container,app,handle,event}
  }
  await check('Rejected mouse buttons never enter dragging or alter document styles',/** 验证右键不会启动面板拖动或改变全局光标。 */ ()=>{
    const state=setup();try{state.event('onPointerdown',{button:2});assert.deepEqual(state.events,[]);assert.equal(document.body.style.cursor,'crosshair')}finally{state.app.unmount()}
  })
  await check('A no-movement click preserves a viewport-capped saved preference',/** 验证无移动的指针按下释放保持尺寸，并正确结束拖动与恢复光标。 */ ()=>{
    const state=setup();try{state.event('onPointerdown');state.event('onPointerup');assert.equal(state.props.modelValue,520);assert.equal(document.body.style.cursor,'crosshair');assert.deepEqual(state.events.filter(/* 比较 value[0] 与 'dragging'，返回严格相等的判断结果。 */ value=>value[0]==='dragging'),[['dragging',true],['dragging',false]])}finally{state.app.unmount()}
  })
  await check('Pointer motion starts at visible size and Escape restores the original preference',/** 验证拖动后按Escape恢复原尺寸、释放捕获并恢复页面样式。 */ async()=>{
    const state=setup();try{state.event('onPointerdown');state.event('onPointermove',{clientY:90});assert.equal(state.props.modelValue,278);await nextTick();state.event('onKeydown',{key:'Escape'});assert.equal(state.props.modelValue,520);assert.equal(state.handle.capture,null);assert.deepEqual(document.body.style,{cursor:'crosshair',userSelect:'text'})}finally{state.app.unmount()}
  })
  await check('Lost pointer capture rolls back size and clears dragging state',/** 验证拖动中丢失指针捕获会取消修改并发出拖动结束事件。 */ ()=>{
    const state=setup();try{state.event('onPointerdown');state.event('onPointermove',{clientY:150});state.event('onLostpointercapture');assert.equal(state.props.modelValue,520);assert.deepEqual(state.events.at(-1),['dragging',false])}finally{state.app.unmount()}
  })
  await check('Disabling a captured separator cancels the edit and releases styles',/** 验证拖动期间禁用控件会恢复尺寸、文字选择和指针捕获状态。 */ async()=>{
    const state=setup();try{state.event('onPointerdown');state.event('onPointermove',{clientY:150});state.props.disabled=true;await nextTick();assert.equal(state.props.modelValue,520);assert.equal(document.body.style.userSelect,'text');assert.equal(state.handle.capture,null)}finally{state.app.unmount()}
  })
  await check('Unmount cleanup cannot commit an old width into a newly selected workspace',/** 验证控件卸载清理拖动资源且不再发出更新事件。 */ ()=>{
    const state=setup();state.event('onPointerdown');state.event('onPointermove',{clientY:150});state.events.splice(0);state.app.unmount();assert.deepEqual(state.events,[]);assert.deepEqual(document.body.style,{cursor:'crosshair',userSelect:'text'});assert.equal(state.handle.capture,null)
  })
  await check('Keyboard controls use visible extent and retain directional and absolute bounds',/** 验证缩放控件方向键按实测尺寸调整，Home和End分别到最小与最大值。 */ async()=>{
    const state=setup();try{state.event('onKeydown',{key:'ArrowUp'});assert.equal(state.props.modelValue,276);await nextTick();state.event('onKeydown',{key:'Home'});assert.equal(state.props.modelValue,120);await nextTick();state.event('onKeydown',{key:'End'});assert.equal(state.props.modelValue,520)}finally{state.app.unmount()}
  })
  await check('Unrelated shortcuts bubble while handled resize keys stop propagation',/** 验证缩放控件不拦截无关快捷键，仅消费自身处理的方向键。 */ ()=>{
    const state=setup();let stopped=0,prevented=0;try{state.event('onKeydown',{key:'s',ctrlKey:true,/** 记录事件停止传播的调用次数。 */ stopPropagation(){stopped++},/** 记录阻止默认行为的调用次数。 */ preventDefault(){prevented++}});assert.equal(stopped,0);assert.equal(prevented,0);state.event('onKeydown',{key:'ArrowUp',/** 记录事件停止传播的调用次数。 */ stopPropagation(){stopped++},/** 记录阻止默认行为的调用次数。 */ preventDefault(){prevented++}});assert.equal(stopped,1);assert.equal(prevented,1)}finally{state.app.unmount()}
  })
  await check('Edited Vue scripts, templates and scoped style sheets compile successfully',/** 逐一编译面板尺寸、最大化及布局相关Vue组件，检查模板和样式无错误。 */ async()=>{
    for(const file of ['components/PanelResizeHandle.vue','components/PanelMaximizeButton.vue','components/SceneSideBar.vue','components/ConfigPanel.vue','components/EditorBottomPanel.vue','components/WorkspaceManager.vue','layout/EditorLayout.vue']){
      const filename=join(sourceRoot,'src',file),source=await readFile(filename,'utf8'),{descriptor,errors}=parse(source,{filename});assert.deepEqual(errors,[])
      const script=compileScript(descriptor,{id:file}),template=compileTemplate({source:descriptor.template.content,filename,id:file,compilerOptions:{bindingMetadata:script.bindings}});assert.deepEqual(template.errors,[])
      for(const style of descriptor.styles)assert.deepEqual(compileStyle({source:style.content,filename,id:file,scoped:style.scoped}).errors,[])
    }
  })
  const failed=checks.filter(/* 比较 value.status 与 'failed'，返回严格相等的判断结果。 */ value=>value.status==='failed'),status=failed.length?'failed':'passed',output=sourceRoot===root?join(root,'release-audits/v26.13-panel-controls.json'):join(sourceRoot,'reports/panel-controls-verification.json')
  await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify({status,generatedAt:new Date().toISOString(),scope:'Actual compiled Vue component handlers executed using the Vue custom renderer; no browser geometry, paint, hit-testing or focus-observation claim.',checks},null,2)+'\n')
  console.log(JSON.stringify({status,checks:checks.length,failed,output}));if(failed.length)process.exitCode=1
}finally{globalThis.document=previousDocument;await rm(temporary,{recursive:true,force:true})}
