/** 验证脚本（v26.13-panel-accessibility）：组织对应功能与边界场景检查，断言行为并汇总验证结果。 */
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'
import { parse, compileScript, compileTemplate, compileStyle } from 'vue/compiler-sfc'
import ts from 'typescript'

const root=process.cwd(),sourceRoot=resolve(process.argv.find(/* 调用 value.startsWith('--source-root=') 并返回调用结果。 */ value=>value.startsWith('--source-root='))?.slice(14)??root)
const baselineRoot=resolve(process.argv.find(/* 调用 value.startsWith('--baseline-root=') 并返回调用结果。 */ value=>value.startsWith('--baseline-root='))?.slice(16)??root)
const names=['AnimationPanel','RenderingPanel','PresentationPanel','EventSheetEditor','AudioSystemPanel','MaterialGraphEditor','ParticleGraphEditor','GraphProductionPanel']
const checks=[],inventory=[],sources=new Map()
const check=/** 执行异步无障碍检查并捕获可读错误，记录通过或失败。 */ async(name,operation)=>{try{await operation();checks.push({name,status:'passed'})}catch(error){checks.push({name,status:'failed',error:error instanceof Error?error.message:String(error)})}}
const controls=new Set(['input','select','textarea','button'])
const meaningful=/* 调用 /[a-zA-Z\u4e00-\u9fff]/.test(text) 并返回调用结果。 */ text=>/[a-zA-Z\u4e00-\u9fff]/.test(text)
const ownProperty=/** 从Vue模板节点读取静态属性值或对应动态绑定表达式。 */ (node,key)=>node.props.find(/* 先计算 value.type===6；仅当其为真值时求右侧 value.name===key，返回短路求值结果。 */ value=>value.type===6&&value.name===key)?.value?.content??node.props.find(/* 先计算 value.type===7&&value.name==='bind'；仅当其为真值时求右侧 value.arg?.content===key，返回短路求值结果。 */ value=>value.type===7&&value.name==='bind'&&value.arg?.content===key)?.exp?.content
const directive=/* 返回 node.props.find(value=>value.type===7&&value.name===key)?.exp?.content 的当前值。 */ (node,key)=>node.props.find(/* 先计算 value.type===7；仅当其为真值时求右侧 value.name===key，返回短路求值结果。 */ value=>value.type===7&&value.name===key)?.exp?.content
/** 递归提取可见标签文本，跳过输入控件及选项内部文本。 */ function labelText(node){return node.type===2?node.content:node.type===5?node.content.content:node.type===1&&(controls.has(node.tag)||node.tag==='option')?'':(node.children??[]).map(labelText).join(' ')}
/** 递归统计标签结构中的输入、选择和多行文本控件数量。 */ function fieldCount(node){return(node.type===1&&['input','select','textarea'].includes(node.tag)?1:0)+(node.children??[]).reduce(/* 计算表达式 sum+fieldCount(child) 并返回结果，沿用操作数的原有类型规则。 */ (sum,child)=>sum+fieldCount(child),0)}
/** 遍历模板节点并传递其元素祖先列表。 */ function walk(node,operation,parents=[]){operation(node,parents);for(const child of node.children??[])walk(child,operation,node.type===1?[...parents,node]:parents)}
/** 收集模板中的模型及值、状态和范围绑定，用于检查可访问性修改不改变编辑行为。 */ function authoredBindings(ast){const result=[];walk(ast,/** 记录当前元素的模型或编辑约束绑定，包括参数、表达式与修饰符。 */ node=>{if(node.type===1)for(const value of node.props)if(value.type===7&&(value.name==='model'||value.name==='bind'&&['value','checked','disabled','min','max','step'].includes(value.arg?.content)))result.push([node.tag,value.name,value.arg?.content??'',value.exp?.content??'',value.modifiers.map(/* 根据 typeof value==='string' 的真假，分别返回 value 或 value.content。 */ value=>typeof value==='string'?value:value.content)])});return result}
await mkdir(join(root,'.cache'),{recursive:true})
const temporary=await mkdtemp(join(root,'.cache','nova-v2613-panel-accessibility-'))
try{
  for(const name of names){
    const filename=join(sourceRoot,'src/components',name+'.vue'),source=await readFile(filename,'utf8'),baseline=await readFile(join(baselineRoot,'src/components',name+'.vue'),'utf8')
    sources.set(name,source)
    await check(`${name}: script, template and scoped CSS compile`,/** 验证Vue单文件组件的解析、脚本、模板和样式编译均无错误。 */ ()=>{
      const{descriptor,errors}=parse(source,{filename});assert.deepEqual(errors,[])
      const script=compileScript(descriptor,{id:name}),template=compileTemplate({source:descriptor.template.content,filename,id:name,compilerOptions:{bindingMetadata:script.bindings}});assert.deepEqual(template.errors,[])
      for(const style of descriptor.styles)assert.deepEqual(compileStyle({source:style.content,filename,id:name,scoped:style.scoped}).errors,[])
    })
    await check(`${name}: every conditional native control has a contextual name and no nested interactive control`,/** 检查可见交互控件具备有效名称且没有按钮内嵌交互控件，并登记静态清单。 */ ()=>{
      const{descriptor}=parse(source,{filename}),missing=[]
      walk(descriptor.template.ast,/** 提取控件显式或单字段标签名称，记录未命名及按钮内嵌控件问题。 */ (node,parents)=>{
        if(node.type!==1||!controls.has(node.tag)||node.props.some(/* 先计算 value.type===6；仅当其为真值时求右侧 value.name==='hidden'，返回短路求值结果。 */ value=>value.type===6&&value.name==='hidden'))return
        const explicit=ownProperty(node,'aria-label')??ownProperty(node,'aria-labelledby')??ownProperty(node,'title'),label=parents.findLast(/* 比较 value.tag 与 'label'，返回严格相等的判断结果。 */ value=>value.tag==='label')
        const implicit=node.tag==='button'?(node.children??[]).map(labelText).join(' '):label&&fieldCount(label)===1?labelText(label):''
        const record={file:name+'.vue',line:node.loc.start.line,tag:node.tag,model:directive(node,'model')??null,nameExpression:explicit??implicit,naming:explicit?'explicit':'visible label',observed:false}
        inventory.push(record)
        if(!meaningful(record.nameExpression??''))missing.push(`${record.line}: unnamed ${node.tag}`)
        if(parents.some(/* 比较 value.tag 与 'button'，返回严格相等的判断结果。 */ value=>value.tag==='button'))missing.push(`${record.line}: nested ${node.tag} inside button`)
      })
      assert.deepEqual(missing,[])
    })
    await check(`${name}: authored field bindings, limits and disabled states are unchanged`,/** 比较当前与基线模板的全部编辑数据绑定是否一致。 */ ()=>assert.deepEqual(authoredBindings(parse(source).descriptor.template.ast),authoredBindings(parse(baseline).descriptor.template.ast)))
    if(!['AnimationPanel','EventSheetEditor'].includes(name))await check(`${name}: handlers and serialization code are unchanged`,/** 忽略换行与新增标签帮助器导入后，验证组件脚本内容与基线一致。 */ ()=>{
      const strip=/* 调用 value.replaceAll('\r\n','\n').replace(/^import \{ panelControlLabel \} from '\.\.\/editor\/panelControlCopy'\n/m,'') 并返回调用结果。 */ value=>value.replaceAll('\r\n','\n').replace(/^import \{ panelControlLabel \} from '\.\.\/editor\/panelControlCopy'\n/m,'')
      assert.equal(strip(parse(source).descriptor.scriptSetup.content),strip(parse(baseline).descriptor.scriptSetup.content))
    })
  }
  const overlay={name:'panel-test-source-overlay',enforce:'pre',/** 为测试构建解析相对源码导入，依次查找审计源码根与当前仓库的可用文件。 */ resolveId(source,importer){
    if(!importer||!source.startsWith('.'))return null
    const raw=resolve(dirname(importer.split('?')[0]),source),prefix=[join(sourceRoot,'src'),join(root,'src')].find(/* 调用 raw.startsWith(prefix+sep) 并返回调用结果。 */ prefix=>raw.startsWith(prefix+sep))
    if(!prefix)return null
    for(const base of [sourceRoot,root])for(const extension of ['','.ts','.json','.js','/index.ts']){const candidate=join(base,'src',raw.slice(prefix.length+1)+extension);if(existsSync(candidate))return candidate.replaceAll('\\','/')}
    return null
  }}
  const testDictionaries={name:'test-only-dictionary-export',/** 为国际化模块追加测试字典导出，以供无障碍文案检查。 */ transform(source,id){if(id.replaceAll('\\','/')===join(root,'src/i18n.ts').replaceAll('\\','/'))return source+'\nexport { dictionaries as testDictionaries }\n'}}
  await build({configFile:false,root,plugins:[overlay,testDictionaries],logLevel:'error',build:{ssr:true,outDir:temporary,emptyOutDir:false,rollupOptions:{input:{guards:join(sourceRoot,'src/editor/panelAuthoringGuards.ts'),copy:join(sourceRoot,'src/editor/panelControlCopy.ts'),i18n:join(root,'src/i18n.ts'),preferences:join(root,'src/store/preferences.ts')},output:{entryFileNames:'[name].mjs'}}}})
  const[{isEditableKeyboardTarget,createEventSheetTransitionGuard},{panelControlLabel},{t,testDictionaries:dictionaries},{preferencesState}]=await Promise.all(['guards','copy','i18n','preferences'].map(/* 调用 import(pathToFileURL(join(temporary,name+'.mjs')).href) 并返回调用结果。 */ name=>import(pathToFileURL(join(temporary,name+'.mjs')).href)))
  await check('Control labels have registered English, German and Chinese translations',/** 验证控件名称引用的国际化键在英德中文均存在且生成文案非空。 */ ()=>{
    const expressions=inventory.map(/* 返回 value.nameExpression 的当前值。 */ value=>value.nameExpression).join('\n'),keys=[...expressions.matchAll(/\bt\('([^']+)'\)/g)].map(/* 返回 value[1] 的当前值。 */ value=>value[1]),copyKeys=[...expressions.matchAll(/panelControlLabel\('([^']+)'/g)].map(/* 返回 value[1] 的当前值。 */ value=>value[1])
    const missing=[];for(const locale of ['en','de','zh']){preferencesState.locale=locale;for(const key of new Set(keys)){if(!Object.hasOwn(dictionaries[locale],key))missing.push(`${locale}: missing ${key}`);assert.ok(t(key).length>0,`${locale}: empty ${key}`)}for(const key of copyKeys)assert.ok(panelControlLabel(key).length>0,`${locale}: ${key}`)}assert.deepEqual(missing,[])
  })
  await check('Actual AnimationPanel shortcut handler preserves input, textarea and contenteditable editing',/** 提取真实动画键盘处理器，验证文本编辑目标不触发关键帧快捷键，而普通目标正常复制粘贴删除。 */ ()=>{
    const script=parse(sources.get('AnimationPanel')).descriptor.scriptSetup.content,ast=ts.createSourceFile('animation.ts',script,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)
    const fn=ast.statements.find(/* 先计算 ts.isFunctionDeclaration(value)；仅当其为真值时求右侧 value.name?.text==='onKeyDown'，返回短路求值结果。 */ value=>ts.isFunctionDeclaration(value)&&value.name?.text==='onKeyDown');assert.ok(fn)
    const code=ts.transpileModule(fn.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
    let copied=0,pasted=0;const clip={value:{tracks:[{keyframes:[{time:1,value:2}]}]}},selectedKeys={value:[{track:0,key:0}]},studio={selectedKeyIds:['0:0']}
    const handler=new Function('isEditableKeyboardTarget','copyKeys','pasteKeys','clip','selectedKeys','studio',code+'\nreturn onKeyDown')(isEditableKeyboardTarget,/** 记录关键帧复制操作次数。 */ ()=>copied++,/** 记录关键帧粘贴操作次数。 */ ()=>pasted++,clip,selectedKeys,studio)
    for(const target of [{closest:/** 模拟最近匹配元素为单行输入框。 */ ()=>({tagName:'INPUT'})},{closest:/** 模拟最近匹配元素为多行文本框。 */ ()=>({tagName:'TEXTAREA'})},{isContentEditable:true},{parentElement:{closest:/** 模拟最近匹配元素为可编辑容器。 */ ()=>({tagName:'DIV'})}}])for(const key of ['c','v','Delete'])handler({target,key,ctrlKey:key!=='Delete',/** 在文本编辑快捷键被错误拦截时抛出测试失败。 */ preventDefault(){throw Error('Text editing was consumed')}})
    assert.equal(copied,0);assert.equal(pasted,0);assert.equal(clip.value.tracks[0].keyframes.length,1)
    const target={closest:/* 返回固定值 null。 */ ()=>null};handler({target,key:'c',ctrlKey:true,/** 提供无需执行浏览器默认行为处理的事件替身。 */ preventDefault(){}});handler({target,key:'v',ctrlKey:true,/** 提供无需执行浏览器默认行为处理的事件替身。 */ preventDefault(){}});handler({target,key:'Delete',/** 提供无需执行浏览器默认行为处理的事件替身。 */ preventDefault(){}});assert.equal(copied,1);assert.equal(pasted,1);assert.equal(clip.value.tracks[0].keyframes.length,0)
  })
  /** 从事件表组件提取指定函数并转译，注入测试依赖后返回可调用函数集。 */ function eventFunctions(names,dependencies){
    const ast=ts.createSourceFile('events.ts',parse(sources.get('EventSheetEditor')).descriptor.scriptSetup.content,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)
    const declarations=names.map(/** 在组件语法树中查找指定函数声明，确认存在并返回源码。 */ name=>{const node=ast.statements.find(/* 先计算 ts.isFunctionDeclaration(value)；仅当其为真值时求右侧 value.name?.text===name，返回短路求值结果。 */ value=>ts.isFunctionDeclaration(value)&&value.name?.text===name);assert.ok(node,name);return node.getText(ast)}).join('\n')
    const code=ts.transpileModule(declarations,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
    return new Function(...Object.keys(dependencies),code+'\nreturn {'+names.join(',')+'}')( ...Object.values(dependencies))
  }
  await check('Actual Event Sheet logic selection remains a draft until Save',/** 验证逻辑资源变化会将事件表标记为已修改。 */ ()=>{
    let marked=0;const {logicChanged}=eventFunctions(['logicChanged'],{markDirty:/** 记录文档被标记修改的次数。 */ ()=>marked++})
    logicChanged();assert.equal(marked,1)
  })
  await check('Actual Event Sheet Save retains failed drafts and updates the attached entity only after persistence',/** 验证事件表保存异常或失败保留草稿，成功才附加、记历史、更新基线并清理恢复缓存。 */ ()=>{
    for(const result of ['throw',false,true]){
      const dirty={value:true},document={value:{logicAsset:'new-logic'}},calls=[],record={uuid:'sheet',name:'Sheet'},loadedBaseSource={value:'saved before edit'},cache=new Map([[record,JSON.stringify(document.value)]])
      let saved='saved before edit'
      const {save}=eventFunctions(['save'],{activeAsset:{value:record},activeUuid:{value:'sheet'},errors:{value:[]},eventDraftConflict:{value:false},dirty,document,loadedBaseSource,draftProjectId:'project',
        saveEventSheetAsset:/** 模拟事件表持久化，验证输入身份并按测试设定抛错、拒绝或保存。 */ (uuid,value)=>{assert.equal(uuid,record.uuid);assert.equal(value,document.value);calls.push('persist');if(result==='throw')throw Error('disk unavailable');if(result)saved=JSON.stringify(value);return result},attached:{value:true},selectedEntity:{value:{}},
        readTextAsset:/** 核对资源身份并返回已保存内容，同时记录读取调用。 */ uuid=>{assert.equal(uuid,record.uuid);calls.push('read');return saved},clearStudioDraft:/** 核对资源和项目身份后清除测试草稿并记录清理调用。 */ (value,project)=>{assert.equal(value,record);assert.equal(project,'project');calls.push('clear');cache.delete(value)},
        attachEventSheet:/* 调用 calls.push('attach') 并返回调用结果。 */ ()=>calls.push('attach'),assetReference:/* 返回 value 的当前值。 */ value=>value,pushHistory:/* 调用 calls.push('history') 并返回调用结果。 */ ()=>calls.push('history'),addEditorLog:/* 调用 calls.push('log') 并返回调用结果。 */ ()=>calls.push('log'),panelControlLabel:/* 返回 value 的当前值。 */ value=>value,t:/* 返回 value 的当前值。 */ value=>value})
      assert.equal(save(),result===true);assert.equal(dirty.value,result!==true)
      assert.deepEqual(calls,result===true?['persist','attach','history','log','read','clear']:['persist','log']);assert.equal(cache.has(record),result!==true);assert.equal(loadedBaseSource.value,result===true?JSON.stringify(document.value):'saved before edit')
    }
  })
  await check('Actual Event Sheet Save blocks a saved-base conflict before persistence or cache cleanup',/** 验证冲突草稿拒绝保存并保持内容及修改状态，不清除恢复记录。 */ ()=>{
    const dirty={value:true},document={value:{logicAsset:'draft'}},calls=[]
    const {save}=eventFunctions(['save'],{activeAsset:{value:{uuid:'sheet'}},activeUuid:{value:'sheet'},errors:{value:[]},eventDraftConflict:{value:true},dirty,document,addEditorLog:/* 调用 calls.push('conflict') 并返回调用结果。 */ ()=>calls.push('conflict'),panelControlLabel:/* 返回 value 的当前值。 */ value=>value,saveEventSheetAsset:/** 若冲突草稿触发持久化则抛出测试失败。 */ ()=>{throw Error('Conflicted draft must not write')},clearStudioDraft:/** 若冲突草稿被清除恢复记录则抛出测试失败。 */ ()=>{throw Error('Conflicted draft must stay recoverable')}})
    assert.equal(save(),false);assert.equal(dirty.value,true);assert.deepEqual(document.value,{logicAsset:'draft'});assert.deepEqual(calls,['conflict'])
  })
  await check('Actual Event Sheet leave/Open logic handlers share decisions and restore discarded source before navigation',/** 验证离开事件表或打开逻辑时保存、放弃、取消三种选择对草稿、基线和目标资源的影响。 */ async()=>{
    for(const action of ['requestLeave','openLogic'])for(const choice of ['save','discard','cancel']){
      const dirty={value:true},document={value:{logicAsset:'draft-logic'}},activeUuid={value:'sheet'},calls=[],record={uuid:'sheet'},loadedBaseSource={value:'original base'},cache=new Map([[record,JSON.stringify(document.value)]])
      let saved='{"logicAsset":"saved-logic"}'
      const decisions=choice==='save'?[true]:[false,choice==='discard']
      const transitions=createEventSheetTransitionGuard({snapshot:/** 提取当前事件表身份、序列化内容及修改状态作为切换快照。 */ ()=>({identity:activeUuid.value,source:JSON.stringify(document.value),dirty:dirty.value}),chooseSave:/* 调用 decisions.shift() 并返回调用结果。 */ async()=>decisions.shift(),chooseDiscard:/* 调用 decisions.shift() 并返回调用结果。 */ async()=>decisions.shift(),save:/** 模拟成功保存事件表，更新基线、移除草稿并清除修改标记。 */ ()=>{saved=JSON.stringify(document.value);loadedBaseSource.value=saved;cache.delete(record);dirty.value=false;calls.push('save');return true},report:/* 调用 calls.push(reason) 并返回调用结果。 */ reason=>calls.push(reason)})
      const logicRecord={/* 返回具有所列字段的新对象 {assetType:'script',uuid:document.value.logicAsset}。 */ get value(){return {assetType:'script',uuid:document.value.logicAsset}}},graphStudioState={mode:'events'}
      const functions=eventFunctions(['restoreDiscardedDraft','requestLeave','openLogic'],{dirty,document,activeUuid,activeAsset:{value:record},loadedBaseSource,draftProjectId:'project',transitions,readTextAsset:/** 核对资源身份并返回测试持久化内容。 */ uuid=>{assert.equal(uuid,record.uuid);return saved},clearStudioDraft:/** 验证草稿所属资源和项目，移除缓存并记录清理。 */ (value,project)=>{assert.equal(value,record);assert.equal(project,'project');cache.delete(value);calls.push('clear')},parseEventSheet:JSON.parse,addEditorLog:/** 提供不执行额外操作的空回调，用于测试接口占位。 */ ()=>{},panelControlLabel:/* 返回 value 的当前值。 */ value=>value,logicRecord,graphStudioState,openScriptAsset:/* 调用 calls.push(uuid) 并返回调用结果。 */ uuid=>calls.push(uuid),openGraphAsset:/** 若脚本资源错误进入图打开路径则抛出测试失败。 */ ()=>{throw Error('wrong asset kind')}})
      assert.equal(await functions[action](),choice!=='cancel')
      assert.equal(document.value.logicAsset,choice==='discard'?'saved-logic':'draft-logic');assert.equal(dirty.value,choice==='cancel')
      assert.equal(cache.has(record),choice==='cancel');assert.equal(loadedBaseSource.value,choice==='cancel'?'original base':saved)
      if(action==='openLogic'){assert.equal(graphStudioState.mode,choice==='cancel'?'events':'code');if(choice!=='cancel')assert.ok(calls.includes(choice==='discard'?'saved-logic':'draft-logic'))}
      else assert.equal(graphStudioState.mode,'events')
    }
  })
  await check('Actual Event Sheet discard refuses missing or malformed saved text and retains its exact recovery state',/** 验证放弃草稿时若已保存内容缺失或损坏，则保留当前内容、基线与恢复能力。 */ ()=>{
    for(const saved of [null,'malformed JSON']){
      const dirty={value:true},document={value:{logicAsset:'invalid draft!'}},before=JSON.stringify(document.value),loadedBaseSource={value:'original base'},calls=[]
      const {restoreDiscardedDraft}=eventFunctions(['restoreDiscardedDraft'],{dirty,document,loadedBaseSource,activeUuid:{value:'sheet'},activeAsset:{value:{uuid:'sheet'}},draftProjectId:'project',readTextAsset:/* 返回 saved 的当前值。 */ ()=>saved,parseEventSheet:JSON.parse,addEditorLog:/* 调用 calls.push('error') 并返回调用结果。 */ ()=>calls.push('error'),panelControlLabel:/* 返回 value 的当前值。 */ value=>value,clearStudioDraft:/** 若放弃失败后仍清理草稿恢复记录则抛出测试失败。 */ ()=>{throw Error('Failed discard must retain recovery')}})
      assert.equal(restoreDiscardedDraft(),false);assert.equal(dirty.value,true);assert.equal(JSON.stringify(document.value),before);assert.equal(loadedBaseSource.value,'original base');assert.deepEqual(calls,['error'])
    }
  })
  const scenario=/** 构造可控制确认选择和保存结果的事件表切换测试宿主。 */ (decisions=[],saveResult=true)=>{
    const state={identity:'sheet-a',source:'current draft',dirty:true},calls={save:0,operation:0,decisions:0,reports:[]}
    const choose=/** 记录确认次数并返回下一项测试选择，缺省为拒绝。 */ async()=>{calls.decisions++;return decisions.shift()??false}
    const host={snapshot:/** 返回当前测试状态的浅拷贝快照。 */ ()=>({...state}),chooseSave:choose,chooseDiscard:choose,save:/** 记录保存次数并在设定成功时清除修改标记，返回预设保存结果。 */ ()=>{calls.save++;if(saveResult)state.dirty=false;return saveResult},report:/* 调用 calls.reports.push(reason) 并返回调用结果。 */ (reason,error)=>calls.reports.push(reason)}
    return{state,calls,host,operation:/** 模拟进入下一文档，记录切换次数并更新身份、内容和修改状态。 */ ()=>{calls.operation++;state.identity='sheet-b';state.source='next document';state.dirty=false}}
  }
  await check('Dirty Event Sheet transitions save successfully before changing the document',/** 验证用户选择保存时先保存一次再执行一次切换。 */ async()=>{
    const value=scenario([true]);assert.equal(await createEventSheetTransitionGuard(value.host).run(value.operation),true);assert.equal(value.calls.save,1);assert.equal(value.calls.operation,1)
  })
  await check('Discard proceeds without saving; Cancel preserves the exact draft and identity',/** 验证拒绝保存后的放弃或取消选择，仅放弃时切换，取消保留原状态。 */ async()=>{
    for(const discard of [true,false]){const value=scenario([false,discard]),before={...value.state};assert.equal(await createEventSheetTransitionGuard(value.host).run(value.operation),discard);assert.equal(value.calls.save,0);assert.equal(value.calls.operation,discard?1:0);if(!discard)assert.deepEqual(value.state,before)}
  })
  await check('Invalid and throwing saves retain dirty drafts and prevent creation/open side effects',/** 验证保存失败或抛出异常时切换被拒绝，原文档保持不变且不执行目标操作。 */ async()=>{
    const value=scenario([true],false),before={...value.state};assert.equal(await createEventSheetTransitionGuard(value.host).run(value.operation),false);assert.deepEqual(value.state,before);assert.equal(value.calls.operation,0);assert.deepEqual(value.calls.reports,['invalid'])
    value.host.chooseSave=/* 返回固定值 true。 */ async()=>true;value.host.save=/** 模拟持久化时发生磁盘不可用错误。 */ ()=>{throw Error('disk unavailable')};assert.equal(await createEventSheetTransitionGuard(value.host).run(value.operation),false);assert.deepEqual(value.state,before);assert.equal(value.calls.operation,0)
  })
  await check('Changes during a decision or asynchronous save reject stale transitions',/** 验证确认或保存期间草稿发生变化时拒绝过期切换，并保留较新内容。 */ async()=>{
    for(const phase of ['decision','save']){const value=scenario([true]);if(phase==='decision')value.host.chooseSave=/** 在异步确认期间改写草稿，模拟用户继续编辑后接受保存。 */ async()=>{value.state.source='newer draft';return true};else value.host.save=/** 在异步保存期间产生新的修改内容，模拟保存与编辑竞争。 */ async()=>{value.state.source='newer draft';value.state.dirty=true;return true};assert.equal(await createEventSheetTransitionGuard(value.host).run(value.operation),false);assert.equal(value.state.source,'newer draft');assert.equal(value.calls.operation,0);assert.deepEqual(value.calls.reports,['stale'])}
  })
  await check('Concurrent document changes cannot bypass an outstanding dirty-draft decision',/** 验证切换确认期间拒绝重复请求，取消后干净文档仍可正常切换。 */ async()=>{
    const value=scenario(),guard=createEventSheetTransitionGuard(value.host);let resolveDecision;value.host.chooseSave=/** 创建由测试控制完成时机的确认任务。 */ ()=>new Promise(/** 保存确认任务的完成处理器。 */ resolve=>resolveDecision=resolve)
    const first=guard.run(value.operation);assert.equal(await guard.run(value.operation),false);resolveDecision(false);assert.equal(await first,false);assert.equal(value.calls.operation,0)
    value.state.dirty=false;assert.equal(await guard.run(value.operation),true);assert.equal(value.calls.operation,1)
  })
  const status=checks.some(/* 比较 value.status 与 'failed'，返回严格相等的判断结果。 */ value=>value.status==='failed')?'failed':'passed',output=sourceRoot===root?join(root,'release-audits/v26.13-panel-accessibility.json'):join(sourceRoot,'reports/panel-accessibility-verification.json')
  await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify({status,generatedAt:new Date().toISOString(),scope:'Full conditional source control-name audit; compiled SFCs and executed production authoring handlers/helpers. This does not certify browser accessible-name computation, visual geometry, pointer actions or all panel states.',checks,controls:inventory},null,2)+'\n')
  console.log(JSON.stringify({status,checks:checks.length,controls:inventory.length,failed:checks.filter(/* 比较 value.status 与 'failed'，返回严格相等的判断结果。 */ value=>value.status==='failed'),output}));if(status==='failed')process.exitCode=1
}finally{await rm(temporary,{recursive:true,force:true})}
