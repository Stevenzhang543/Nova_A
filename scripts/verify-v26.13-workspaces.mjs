/** 验证脚本（v26.13-workspaces）：组织对应功能与边界场景检查，断言行为并汇总验证结果。 */
import {registerNodeBundle22,captureNodeBundle22} from './lib/nodeOperationTrace22.mjs'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp,mkdir,rm,writeFile } from 'node:fs/promises'
import { dirname,join,resolve,sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'

const root=process.cwd(),stage=process.argv.find(/* 调用 item.startsWith('--source-root=') 并返回调用结果。 */ item=>item.startsWith('--source-root='))?.slice(14),sourceRoot=stage?resolve(stage):root
await mkdir(join(root,'.cache'),{recursive:true})
const temporary=await mkdtemp(join(root,'.cache','nova-v2613-workspaces-')),checks=[]
const check=/** 执行工作区检查并捕获可读异常，记录通过或失败。 */ async(name,run)=>{try{await run();checks.push({name,status:'passed'})}catch(error){checks.push({name,status:'failed',error:error instanceof Error?error.message:String(error)})}}
const memory=new Map(),savedStorage=globalThis.localStorage
globalThis.localStorage={getItem:/* 当 memory.get(key) 为 null 或 undefined 时返回 null，否则保留左侧值。 */ key=>memory.get(key)??null,setItem:/* 调用 memory.set(key,String(value)) 并返回调用结果。 */ (key,value)=>memory.set(key,String(value)),removeItem:/* 调用 memory.delete(key) 并返回调用结果。 */ key=>memory.delete(key),clear:/* 调用 memory.clear() 并返回调用结果。 */ ()=>memory.clear(),key:/* 当 [...memory.keys()][index] 为 null 或 undefined 时返回 null，否则保留左侧值。 */ index=>[...memory.keys()][index]??null,/* 返回 memory.size 的当前值。 */ get length(){return memory.size}}
try{
  const overlay={name:'isolated-milestone-source',enforce:'pre',/** 为隔离工作区构建优先解析阶段源码，再回退当前仓库模块。 */ resolveId(source,importer){
    if(!stage||!importer||!source.startsWith('.'))return null
    const raw=resolve(dirname(importer.split('?')[0]),source),prefix=[join(sourceRoot,'src'),join(root,'src')].find(/* 调用 raw.startsWith(prefix+sep) 并返回调用结果。 */ prefix=>raw.startsWith(prefix+sep))
    if(!prefix)return null
    const relative=raw.slice(prefix.length+1)
    for(const extension of ['','.ts','.json','.js','/index.ts']){const proposed=join(sourceRoot,'src',relative+extension);if(existsSync(proposed))return proposed.replaceAll('\\','/')}
    for(const extension of ['','.ts','.json','.js','/index.ts']){const original=join(root,'src',relative+extension);if(existsSync(original))return original.replaceAll('\\','/')}
    return null
  }}
  const input={panels:join(sourceRoot,'src/editor/panelLayout.ts'),workspaces:join(sourceRoot,'src/editor/workspaces.ts'),editor:join(root,'src/store/editor.ts'),preferences:join(root,'src/store/preferences.ts'),session:join(root,'src/projects/projectSession.ts')}
  await build({configFile:false,root,plugins:[overlay],logLevel:'error',build:{sourcemap:process.env.NOVA_AUDIT_NODE_OPERATION_COVERAGE==='1'?'hidden':false,ssr:true,outDir:temporary,emptyOutDir:false,rollupOptions:{input,output:{entryFileNames:'[name].mjs'}}}})
 registerNodeBundle22(temporary)
  const [panels,workspaces,{editorState},{preferencesState},{projectSessionState},{nextTick}]=await Promise.all([...Object.keys(input).map(/* 调用 import(pathToFileURL(join(temporary,key+'.mjs')).href) 并返回调用结果。 */ key=>import(pathToFileURL(join(temporary,key+'.mjs')).href)),import('vue')])
  await check('Pointer resizing respects direction, physical scale and finite size bounds',/** 验证面板拖动按缩放及方向换算，并安全处理范围和非有限数。 */ ()=>{
    assert.equal(panels.draggedPanelSize(300,60,1.5,false,160,500),340)
    assert.equal(panels.draggedPanelSize(300,-60,2,true,160,500),330)
    assert.equal(panels.draggedPanelSize(300,999,1,false,160,500),500)
    assert.equal(panels.draggedPanelSize(300,NaN,0,false,160,500),300)
    assert.equal(panels.clampPanelSize(Infinity,160,500),160)
  })
  await check('Keyboard resizing maps orientation, Shift, Home and End without consuming unrelated keys',/** 验证键盘缩放方向、加速步长、边界键及无关方向键处理。 */ ()=>{
    assert.equal(panels.keyedPanelSize(300,'ArrowRight','vertical',false,false,160,500),308)
    assert.equal(panels.keyedPanelSize(300,'ArrowUp','horizontal',true,true,120,520),340)
    assert.equal(panels.keyedPanelSize(300,'Home','vertical',false,false,160,500),160)
    assert.equal(panels.keyedPanelSize(300,'End','horizontal',false,false,120,520),520)
    assert.equal(panels.keyedPanelSize(300,'ArrowUp','vertical',false,false,160,500),null)
  })
  await check('Viewport-capped panels resize from their visible extent rather than a hidden saved preference',/** 验证受限面板使用实际显示尺寸作为拖动和键盘起点，无效测量回退存储尺寸。 */ ()=>{
    assert.equal(panels.visiblePanelSize(520,268,120,520),268)
    assert.equal(panels.draggedPanelSize(panels.visiblePanelSize(520,268,120,520),-10,1,true,120,520),278)
    assert.equal(panels.keyedPanelSize(panels.visiblePanelSize(480,365,252,480),'ArrowLeft','vertical',false,false,252,480),357)
    assert.equal(panels.visiblePanelSize(292,undefined,252,480),292);assert.equal(panels.visiblePanelSize(292,NaN,252,480),292)
  })
  preferencesState.workspaceLayoutScope='user';workspaces.initializeEditorWorkspaces();await nextTick()
  await check('Switching built-in workspaces restores independent authored layout preferences',/** 验证不同工作区分别保存面板布局，并按版本化格式持久化。 */ async()=>{
    editorState.hierarchyWidth=321;editorState.inspectorWidth=345;editorState.bottomPanelHeight=405;editorState.bottomPanelOpen=true
    const design=workspaces.captureWorkspaceLayout();workspaces.applyEditorWorkspace('script');editorState.bottomPanelHeight=299;await nextTick()
    workspaces.applyEditorWorkspace('design');assert.deepEqual(workspaces.captureWorkspaceLayout(),design)
    workspaces.applyEditorWorkspace('script');assert.equal(editorState.bottomPanelHeight,299);await nextTick()
    const persisted=JSON.parse(memory.get('nova-a-editor-workspaces-v3'));assert.equal(persisted.version,3);assert.equal(persisted.layouts.design.hierarchyWidth,321);assert.equal(persisted.layouts.script.bottomPanelHeight,299)
  })
  await check('Panel maximize and restore do not alter saved dimensions, docking or serialized layout',/** 验证最大化不污染布局快照，隐藏当前最大化面板能正确退出并恢复布局。 */ async()=>{
    workspaces.applyEditorWorkspace('design');await nextTick();const before=workspaces.captureWorkspaceLayout()
    for(const panel of ['hierarchy','inspector','bottom']){workspaces.togglePanelMaximize(panel);assert.equal(workspaces.workspaceState.maximizedPanel,panel);assert.deepEqual(workspaces.captureWorkspaceLayout(),before);workspaces.togglePanelMaximize(panel);assert.equal(workspaces.workspaceState.maximizedPanel,'')}
    workspaces.togglePanelMaximize('inspector');workspaces.toggleEditorPanel('inspector');assert.equal(workspaces.workspaceState.maximizedPanel,'');assert.equal(editorState.inspectorVisible,false)
    workspaces.toggleEditorPanel('inspector');assert.deepEqual(workspaces.captureWorkspaceLayout(),before)
  })
  await check('Project layout namespaces remain separate and restore their own cached dimensions',/** 验证项目级布局按项目隔离，切回用户级作用域恢复用户布局。 */ async()=>{
    projectSessionState.id='layout-project-a';preferencesState.workspaceLayoutScope='project';await nextTick();editorState.hierarchyWidth=333;await nextTick()
    projectSessionState.id='layout-project-b';await nextTick();assert.equal(editorState.hierarchyWidth,236);editorState.hierarchyWidth=277;await nextTick()
    projectSessionState.id='layout-project-a';await nextTick();assert.equal(editorState.hierarchyWidth,333)
    preferencesState.workspaceLayoutScope='user';await nextTick();assert.equal(editorState.hierarchyWidth,321)
  })
  await check('Reset clears remembered preset dimensions and malformed import cannot escape bounds',/** 验证重置布局跨工作区有效，并对导入尺寸进行范围裁剪和缺省处理。 */ async()=>{
    workspaces.resetEditorLayout();assert.equal(editorState.hierarchyWidth,236);workspaces.applyEditorWorkspace('script');workspaces.applyEditorWorkspace('design');assert.equal(editorState.hierarchyWidth,236)
    workspaces.importWorkspaces(JSON.stringify({format:'nova-workspaces',version:3,workspaces:[{id:'bounds',name:'Bounds',hierarchyWidth:1e30,inspectorWidth:-1,bottomPanelHeight:null}]}));const custom=workspaces.workspaceState.custom.find(/* 比较 item.id 与 'bounds'，返回严格相等的判断结果。 */ item=>item.id==='bounds');assert.equal(custom.hierarchyWidth,500);assert.equal(custom.inspectorWidth,252);assert.equal(custom.bottomPanelHeight,240);await nextTick()
  })
  await check('Corrupt storage restores both the Design layout and its workspace identity',/** 验证损坏的项目布局存储回退到设计工作区与场景页面。 */ async()=>{
    workspaces.applyEditorWorkspace('script');await nextTick();memory.set('nova-a-editor-workspaces-v3:project:corrupt','{');projectSessionState.id='corrupt';preferencesState.workspaceLayoutScope='project';await nextTick()
    assert.equal(editorState.activeWorkspace,'design');assert.equal(editorState.currentPage,'scene')
  })
  await check('Project namespaces do not inherit a global legacy workspace',/** 验证新项目作用域不会继承旧用户布局存储。 */ async()=>{
    memory.set('nova-a-editor-layout-v1',JSON.stringify({hierarchyWidth:499}));projectSessionState.id='fresh-no-legacy';await nextTick();assert.equal(editorState.hierarchyWidth,236);memory.delete('nova-a-editor-layout-v1')
  })
  await check('Deleting a custom workspace keeps unrelated selection and applies an active replacement',/** 验证删除非选中工作区保持当前选择，删除选中项后应用有效备用布局。 */ async()=>{
    preferencesState.workspaceLayoutScope='user';await nextTick();workspaces.workspaceState.custom.splice(0);workspaces.workspaceState.selectedCustomId=''
    editorState.hierarchyWidth=301;const first=workspaces.saveCurrentWorkspace('First');editorState.hierarchyWidth=402;const second=workspaces.saveCurrentWorkspace('Second');editorState.hierarchyWidth=450;const third=workspaces.saveCurrentWorkspace('Third')
    workspaces.removeWorkspace(first.id);assert.equal(workspaces.workspaceState.selectedCustomId,third.id)
    workspaces.removeWorkspace(third.id);assert.equal(workspaces.workspaceState.selectedCustomId,second.id);assert.equal(editorState.hierarchyWidth,402)
  })
  await check('Creating, duplicating or importing beyond the persisted custom limit fails without dropping entries',/** 验证保存、复制和导入均遵守自定义工作区数量上限，失败时状态不变。 */ async()=>{
    workspaces.workspaceState.custom.splice(0);workspaces.workspaceState.selectedCustomId='';for(let index=0;index<24;index++)workspaces.saveCurrentWorkspace('Workspace '+index)
    const before=workspaces.exportWorkspaces();assert.throws(/* 调用 workspaces.saveCurrentWorkspace('Overflow') 并返回调用结果。 */ ()=>workspaces.saveCurrentWorkspace('Overflow'),/24/);assert.throws(/* 调用 workspaces.duplicateWorkspace('design') 并返回调用结果。 */ ()=>workspaces.duplicateWorkspace('design'),/24/)
    assert.throws(/* 调用 workspaces.importWorkspaces(JSON.stringify({format:'nova-workspaces',version:3,workspaces:[{id:'extra',name:'Extra'}]})) 并返回调用结果。 */ ()=>workspaces.importWorkspaces(JSON.stringify({format:'nova-workspaces',version:3,workspaces:[{id:'extra',name:'Extra'}]})),/24/);assert.equal(workspaces.exportWorkspaces(),before);await nextTick()
  })
  await check('Reset restores the editor even when browser storage is unavailable',/** 验证存储拒绝删除时仍可在内存中安全重置编辑器布局。 */ ()=>{
    const storage=globalThis.localStorage;globalThis.localStorage={...storage,/** 模拟浏览器存储拒绝删除键。 */ removeItem(){throw new Error('Storage denied')}}
    try{editorState.hierarchyWidth=399;assert.doesNotThrow(/* 调用 workspaces.resetEditorLayout() 并返回调用结果。 */ ()=>workspaces.resetEditorLayout());assert.equal(editorState.activeWorkspace,'design');assert.equal(editorState.hierarchyWidth,236)}finally{globalThis.localStorage=storage}
  })
  await check('Imported duplicate identifiers become independent custom layouts without losing their names',/** 验证导入重复身份工作区生成唯一身份并保留名称，拒绝空文档格式。 */ ()=>{
    workspaces.workspaceState.custom.splice(0);workspaces.workspaceState.selectedCustomId=''
    assert.equal(workspaces.importWorkspaces(JSON.stringify({format:'nova-workspaces',version:3,workspaces:[{id:'same',name:'One'},{id:'same',name:'Two'}]})),2)
    assert.equal(new Set(workspaces.workspaceState.custom.map(/* 返回 value.id 的当前值。 */ value=>value.id)).size,2);assert.deepEqual(workspaces.workspaceState.custom.map(/* 返回 value.name 的当前值。 */ value=>value.name),['One','Two'])
    assert.throws(/* 调用 workspaces.importWorkspaces('null') 并返回调用结果。 */ ()=>workspaces.importWorkspaces('null'),/Unsupported Nova_A workspace document/)
  })
  await check('Applying a named workspace restores the chosen layout and refuses stale names atomically',/** 验证应用命名或内置工作区正确切换布局，未知名称不改变当前选择和状态。 */ ()=>{
    workspaces.workspaceState.custom.splice(0);workspaces.workspaceState.selectedCustomId=''
    editorState.hierarchyWidth=304;const first=workspaces.saveCurrentWorkspace('Readable')
    editorState.hierarchyWidth=410;const second=workspaces.saveCurrentWorkspace('Wide')
    assert.equal(workspaces.applyNamedWorkspace(first.id),true);assert.equal(editorState.hierarchyWidth,304);assert.equal(workspaces.workspaceState.selectedCustomId,first.id)
    const before=workspaces.captureWorkspaceLayout();assert.equal(workspaces.applyNamedWorkspace('missing'),false);assert.deepEqual(workspaces.captureWorkspaceLayout(),before);assert.equal(workspaces.workspaceState.selectedCustomId,first.id)
    assert.equal(workspaces.applyNamedWorkspace('script'),true);assert.equal(editorState.activeWorkspace,'script')
    assert.equal(workspaces.applyNamedWorkspace(second.id),true);assert.equal(editorState.activeWorkspace,'custom');assert.equal(editorState.hierarchyWidth,410)
  })
  const output=process.argv.find(/* 调用 arg.startsWith('--report=') 并返回调用结果。 */ arg=>arg.startsWith('--report='))?.slice(9)??(stage?join(sourceRoot,'reports/workspace-verification.json'):join(root,'release-audits/v26.13-workspaces.json'))
  const failed=checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item=>item.status==='failed'),status=failed.length?'failed':'passed'
  await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify({status,generatedAt:new Date().toISOString(),scope:'Actual production workspace state and finite resize helpers with in-memory browser storage. Pointer geometry and observed focus have a separate browser gate.',checks},null,2)+'\n')
  console.log(JSON.stringify({status,checks:checks.length,failed,output}));if(failed.length)process.exitCode=1
}finally{globalThis.localStorage=savedStorage;await captureNodeBundle22(temporary);await rm(temporary,{recursive:true,force:true})}
