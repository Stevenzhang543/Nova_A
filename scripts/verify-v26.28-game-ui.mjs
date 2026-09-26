/** 26.28 游戏界面回归：执行真实运行时，隔离主机画布、存储和控制器输入。 */
import assert from 'node:assert/strict'
import {build} from 'vite'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
const out=resolve('.cache/game-ui28'),checks=[]
await mkdir(out,{recursive:true})
/** 提供无副作用的主机事件占位；这不是设备验收。 */ function noop(){}
Object.assign(globalThis,{window:globalThis,location:{href:'https://nova.local/'},localStorage:{getItem:/** 不加载用户数据。 */ ()=>null,setItem:noop,removeItem:noop},addEventListener:noop,removeEventListener:noop,document:{documentElement:{dataset:{},style:{setProperty:noop}},fonts:{add:noop,delete:/** 字体由浏览器验收另行验证。 */ ()=>true},createElement:/** 不创建实际 DOM。 */ ()=>({getContext:/** 图像解码不在本次模块检查范围。 */ ()=>null})}})
let pads=[]
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{platform:'Win32',getGamepads:/** 返回当前用例指定的设备快照。 */ ()=>pads}})
const entries={ui:'runtime/gameUi',components:'world/components',box:'world/BoxEntity',native:'runtime/uiNativeInput',locale:'runtime/localization',database:'assets/AssetDatabase',types:'assets/types'}
await build({configFile:false,logLevel:'error',build:{ssr:true,outDir:out,emptyOutDir:false,rollupOptions:{input:Object.fromEntries(Object.entries(entries).map(/** 每个入口都来自当前源码，禁止使用旧版构建。 */ ([name,path])=>[name,resolve('src',path+'.ts')])),output:{entryFileNames:'[name].mjs'}}}})
const modules=Object.fromEntries(await Promise.all(Object.keys(entries).map(/** 加载同一构建的共享模块。 */ async name=>[name,await import(pathToFileURL(resolve(out,name+'.mjs')).href)])))
const {ui,components:c,box,native,locale,database:db,types}=modules
let sequence=100
/** 创建稳定 UUID 的真实实体并使用实际组件默认值。 */ function entity(parent=null,kind='Button'){
 const n=sequence++,e=new box.BoxEntity(n,{x:0,y:0},{x:1,y:1},`${n.toString(16).padStart(8,'0')}-0000-4000-8000-000000000000`)
 e.parentUuid=parent?.uuid??null;const r=e.addComponent(new c.RectTransform());Object.assign(r,{anchorPreset:'top-left',pivot:{x:0,y:0},size:{x:100,y:40},focusable:true,skipNavigation:false})
 if(kind)e.addComponent(new c[kind]());return e
}
/** 创建固定参考分辨率画布。 */ function root(){const e=entity(null,'Canvas');e.getComponent('Canvas').referenceSize={x:1000,y:500};return e}
/** 记录真实绘制参数；不冒充像素级浏览器渲染检查。 */ function context(){const calls=[];return new Proxy({calls,canvas:{width:1000,height:500},measureText:/** 确定性测量仅用于当前不含换行的标签。 */ value=>({width:String(value).length*10}),roundRect:/** 记录背景与填充矩形。 */ (...args)=>calls.push(['rect',...args]),arc:/** 记录滑块手柄坐标。 */ (...args)=>calls.push(['arc',...args]),fillText:/** 记录绘制文本。 */ (...args)=>calls.push(['text',...args])},{get:/** 提供其余 Canvas 接口。 */ (target,key)=>key in target?target[key]:noop})}
/** 通过公开渲染入口刷新实际布局和输入范围。 */ function render(runtime,entities,options={}){const ctx=context();runtime.render(ctx,1000,500,entities,{preview:true,...options});return ctx}
/** 模拟未按住修饰键的独立按键。 */ function key(key,extra={}){return {key,code:key,isComposing:false,keyCode:0,repeat:false,...extra}}
/** 保留失败原始错误，最终非零退出。 */ async function check(name,run){try{await run();checks.push({name,status:'passed'})}catch(error){checks.push({name,status:'failed',error:String(error.stack??error)})}}
await check('Opening modal releases old focus/remap and blocks background keyboard activation',/** 覆盖同场景中模态层出现而旧实体仍存在的情况。 */ ()=>{
 const canvas=root(),back=entity(canvas),modal=entity(canvas,'Panel'),front=entity(modal);modal.getComponent('Panel').behavior='Modal';modal.getComponent('Panel').visible=false
 const runtime=new ui.GameUiRuntime(),events=[];runtime.setCallback(/** 收集事件绑定实际目标。 */ (e,name)=>events.push([e.uuid,name]));render(runtime,[canvas,back,modal,front]);assert.ok(runtime.focusByUuid(back.uuid));back.getComponent('RectTransform').remapAction='jump';const remaps=[];runtime.setRemapCallback(/** 记录不应在模态背后发生的重映射。 */ (...args)=>remaps.push(args));runtime.keyDown(key('Enter'));events.length=0
 modal.getComponent('Panel').visible=true;render(runtime,[canvas,back,modal,front]);runtime.keyDown(key('Enter'));assert.equal(remaps.length,0);assert.ok(!events.some(/** 后台动作不得触发。 */ ([id,name])=>id===back.uuid&&name==='on_pressed'));assert.equal(runtime.focusByUuid(back.uuid),false);assert.ok(runtime.focusByUuid(front.uuid));runtime.keyDown(key('Enter'));assert.ok(events.some(/** 前台动作必须保留。 */ ([id,name])=>id===front.uuid&&name==='on_pressed'))
})
await check('Disabled input cannot consume stale keyboard focus or commit; IME remains native',/** 焦点失效与组合输入的限制互不冲突。 */ ()=>{
 const canvas=root(),input=entity(canvas,'TextInput'),button=entity(canvas),runtime=new ui.GameUiRuntime();render(runtime,[canvas,input,button]);assert.ok(runtime.focusByUuid(input.uuid));assert.equal(runtime.keyDown(key('Enter',{isComposing:true,keyCode:229})),false);assert.ok(runtime.focusedTextInput())
 input.getComponent('TextInput').interactable=false;render(runtime,[canvas,input,button]);assert.equal(runtime.focusedTextInput(),null);assert.equal(runtime.commitTextInput(input.uuid,'wrong'),false);runtime.keyDown(key('Tab'));assert.equal(runtime.accessibilityNodes().find(/** 找到按钮当前焦点状态。 */ n=>n.uuid===button.uuid).focused,true)
 const commits=[],bridge=new native.UiNativeInputBridge(/** 接受已提交值。 */ (id,value)=>{commits.push([id,value]);return true}),field={value:'',selectionStart:0,selectionEnd:0,setSelectionRange:noop};bridge.bind(field,'ime','');bridge.compositionStart();field.value='中文😀';assert.equal(bridge.input(field,20,true),false);assert.equal(commits.length,0);assert.ok(bridge.ownsCompositionKey(key('Enter')));bridge.compositionEnd(field,20);assert.deepEqual(commits,[['ime','中文😀']]);bridge.reset()
})
await check('Held stick on first controller does not repeat because second controller is idle',/** 两个控制器必须分别维护边沿状态并清理断开记录。 */ ()=>{
 const canvas=root(),a=entity(canvas),b=entity(canvas),d=entity(canvas);b.getComponent('RectTransform').position.x=200;d.getComponent('RectTransform').position.x=400
 const runtime=new ui.GameUiRuntime();render(runtime,[canvas,a,b,d]);runtime.focusByUuid(a.uuid);pads=[{id:'one',axes:[1,0],buttons:[]},{id:'two',axes:[0,0],buttons:[]}]
 render(runtime,[canvas,a,b,d],{preview:false});render(runtime,[canvas,a,b,d],{preview:false});assert.equal(runtime.accessibilityNodes().find(/** 只应移动一次。 */ n=>n.focused)?.uuid,b.uuid)
 pads=[];render(runtime,[canvas,a,b,d],{preview:false});pads=[{id:'one',axes:[1,0],buttons:[]}];render(runtime,[canvas,a,b,d],{preview:false});assert.equal(runtime.accessibilityNodes().find(/** 重新连接后的输入是新的边沿。 */ n=>n.focused)?.uuid,d.uuid);pads=[];runtime.reset()
})
await check('RTL slider pointer, filled bar and handle agree at both ends',/** 比较实际画布命令与按下位置，不仅检查值。 */ ()=>{
 const canvas=root(),slider=entity(canvas,'Slider'),runtime=new ui.GameUiRuntime(),items=[canvas,slider],options={layout:{direction:'rtl',localeDirection:/** 强制测试从右向左布局。 */ ()=>'rtl'}}
 render(runtime,items,options);const rect=runtime.accessibilityNodes().find(/** 读取运行时解析后的矩形。 */ n=>n.uuid===slider.uuid).rect
 runtime.pointerDown({x:rect.x,y:rect.y+20});runtime.pointerUp({x:rect.x,y:rect.y+20});assert.equal(slider.getComponent('Slider').value,1);assert.equal(render(runtime,items,options).calls.find(/** 找出手柄命令。 */ call=>call[0]==='arc')[1],rect.x)
 runtime.pointerDown({x:rect.x+rect.width,y:rect.y+20});runtime.pointerUp({x:rect.x+rect.width,y:rect.y+20});assert.equal(slider.getComponent('Slider').value,0);assert.equal(render(runtime,items,options).calls.find(/** 找出手柄命令。 */ call=>call[0]==='arc')[1],rect.x+rect.width)
 slider.getComponent('Slider').value=.25;const filled=render(runtime,items,options).calls.find(/** 从背景及裁剪命令中找到四分之一填充区。 */ call=>call[0]==='rect'&&call[3]===rect.width*.25);assert.equal(filled[1],rect.x+rect.width*.75);assert.equal(filled[3],rect.width*.25)
})
await check('Keyboard and controller move RTL slider visually in the requested direction',/** 所有水平输入共享 RTL 数值变换，改值事件保持可绑定。 */ ()=>{
 const canvas=root(),slider=entity(canvas,'Slider'),runtime=new ui.GameUiRuntime(),events=[],options={layout:{direction:'rtl',localeDirection:/** 固定 RTL 用例。 */ ()=>'rtl'}};runtime.setCallback(/** 收集实际值变化回调。 */ (_,name)=>events.push(name));render(runtime,[canvas,slider],options);runtime.focusByUuid(slider.uuid);runtime.keyDown(key('ArrowRight'));assert.equal(slider.getComponent('Slider').value,.49);runtime.keyDown(key('ArrowLeft'));assert.equal(slider.getComponent('Slider').value,.5)
 const buttons=Array.from({length:16},/** 创建未按下的按键。 */ ()=>({pressed:false}));buttons[15].pressed=true;pads=[{id:'pad',axes:[0,0],buttons}];render(runtime,[canvas,slider],{...options,preview:false});assert.equal(slider.getComponent('Slider').value,.49);assert.equal(events.filter(/** 焦点事件不计入改值次数。 */ name=>name==='on_value_changed').length,3);pads=[];runtime.reset()
})
await check('Accessible descriptions, values and tooltip use live locale with source fallback',/** 同一实例切换语言，不依赖重新创建项目。 */ ()=>{
 const original=[...db.assetState.records],canvas=root(),button=entity(canvas),tooltip=entity(canvas,'Panel'),runtime=new ui.GameUiRuntime(),r=button.getComponent('RectTransform');Object.assign(r,{accessibilityDescription:'{menu.detail}',accessibilityState:'{menu.state}',accessibilityValue:'{menu.value}'});tooltip.getComponent('Panel').behavior='Tooltip';tooltip.getComponent('Panel').tooltipText='{menu.detail}';tooltip.getComponent('Panel').tooltipDelay=0;tooltip.getComponent('RectTransform').position.x=300
 try{db.assetState.records.splice(0);for(const [index,language] of ['en','de','zh'].entries()){const entries=language==='en'?{'menu.detail':'Help','menu.state':'Ready','menu.value':'Value'}:language==='de'?{'menu.detail':'Hilfe'}:{'menu.detail':'帮助'},table={...locale.defaultLocalizationTable(language),entries},settings=types.defaultImportSettings();settings.localizationSettings.locale=language;db.assetState.records.push({uuid:`0000000${index+1}-0000-4000-8000-000000000000`,name:language,path:`Assets/${language}.locale`,assetType:'localization',source:JSON.stringify(table),mimeType:'application/json',settings,sourceModified:1,importedAt:1,byteLength:1})}
 db.assetState.generation++
 for(const [language,text] of [['en','Help'],['de','Hilfe'],['zh','帮助']]){locale.localizationSettings.previewLocale=language;render(runtime,[canvas,button,tooltip]);const node=runtime.accessibilityNodes().find(/** 读取可访问节点。 */ n=>n.uuid===button.uuid);assert.equal(node.description,`${text}; Ready`);assert.equal(node.value,'Value');runtime.pointerMove({x:310,y:20});assert.ok(render(runtime,[canvas,button,tooltip],{preview:false}).calls.some(/** 真实提示绘制必须使用翻译。 */ call=>call[0]==='text'&&call[1]===text))}
 }finally{db.assetState.records.splice(0,db.assetState.records.length,...original);db.assetState.generation++;locale.localizationSettings.previewLocale='en'}
})
await mkdir('release-audits',{recursive:true});const report={format:'nova-game-ui',version:1,release:'26.28',engineVersion:JSON.parse(await readFile('package.json','utf8')).version,generatedAt:new Date().toISOString(),status:checks.every(/** 汇总实际检查结果。 */ c=>c.status==='passed')?'passed':'failed',checks,scope:'Actual GameUiRuntime/component/layout/localization/native bridge modules; host canvas recorder and simulated controller snapshots. Not physical controller, touch device, screen reader or OS IME acceptance.'};await writeFile('release-audits/v26.28-game-ui.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.status!=='passed')process.exitCode=1

