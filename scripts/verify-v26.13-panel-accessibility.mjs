import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'
import { parse, compileScript, compileTemplate, compileStyle } from 'vue/compiler-sfc'
import ts from 'typescript'

const root=process.cwd(),sourceRoot=resolve(process.argv.find(value=>value.startsWith('--source-root='))?.slice(14)??root)
const baselineRoot=resolve(process.argv.find(value=>value.startsWith('--baseline-root='))?.slice(16)??root)
const names=['AnimationPanel','RenderingPanel','PresentationPanel','EventSheetEditor','AudioSystemPanel','MaterialGraphEditor','ParticleGraphEditor','GraphProductionPanel']
const checks=[],inventory=[],sources=new Map()
const check=async(name,operation)=>{try{await operation();checks.push({name,status:'passed'})}catch(error){checks.push({name,status:'failed',error:error instanceof Error?error.message:String(error)})}}
const controls=new Set(['input','select','textarea','button'])
const meaningful=text=>/[a-zA-Z\u4e00-\u9fff]/.test(text)
const ownProperty=(node,key)=>node.props.find(value=>value.type===6&&value.name===key)?.value?.content??node.props.find(value=>value.type===7&&value.name==='bind'&&value.arg?.content===key)?.exp?.content
const directive=(node,key)=>node.props.find(value=>value.type===7&&value.name===key)?.exp?.content
function labelText(node){return node.type===2?node.content:node.type===5?node.content.content:node.type===1&&(controls.has(node.tag)||node.tag==='option')?'':(node.children??[]).map(labelText).join(' ')}
function fieldCount(node){return(node.type===1&&['input','select','textarea'].includes(node.tag)?1:0)+(node.children??[]).reduce((sum,child)=>sum+fieldCount(child),0)}
function walk(node,operation,parents=[]){operation(node,parents);for(const child of node.children??[])walk(child,operation,node.type===1?[...parents,node]:parents)}
function authoredBindings(ast){const result=[];walk(ast,node=>{if(node.type===1)for(const value of node.props)if(value.type===7&&(value.name==='model'||value.name==='bind'&&['value','checked','disabled','min','max','step'].includes(value.arg?.content)))result.push([node.tag,value.name,value.arg?.content??'',value.exp?.content??'',value.modifiers.map(value=>typeof value==='string'?value:value.content)])});return result}
await mkdir(join(root,'.cache'),{recursive:true})
const temporary=await mkdtemp(join(root,'.cache','nova-v2613-panel-accessibility-'))
try{
  for(const name of names){
    const filename=join(sourceRoot,'src/components',name+'.vue'),source=await readFile(filename,'utf8'),baseline=await readFile(join(baselineRoot,'src/components',name+'.vue'),'utf8')
    sources.set(name,source)
    await check(`${name}: script, template and scoped CSS compile`,()=>{
      const{descriptor,errors}=parse(source,{filename});assert.deepEqual(errors,[])
      const script=compileScript(descriptor,{id:name}),template=compileTemplate({source:descriptor.template.content,filename,id:name,compilerOptions:{bindingMetadata:script.bindings}});assert.deepEqual(template.errors,[])
      for(const style of descriptor.styles)assert.deepEqual(compileStyle({source:style.content,filename,id:name,scoped:style.scoped}).errors,[])
    })
    await check(`${name}: every conditional native control has a contextual name and no nested interactive control`,()=>{
      const{descriptor}=parse(source,{filename}),missing=[]
      walk(descriptor.template.ast,(node,parents)=>{
        if(node.type!==1||!controls.has(node.tag)||node.props.some(value=>value.type===6&&value.name==='hidden'))return
        const explicit=ownProperty(node,'aria-label')??ownProperty(node,'aria-labelledby')??ownProperty(node,'title'),label=parents.findLast(value=>value.tag==='label')
        const implicit=node.tag==='button'?(node.children??[]).map(labelText).join(' '):label&&fieldCount(label)===1?labelText(label):''
        const record={file:name+'.vue',line:node.loc.start.line,tag:node.tag,model:directive(node,'model')??null,nameExpression:explicit??implicit,naming:explicit?'explicit':'visible label',observed:false}
        inventory.push(record)
        if(!meaningful(record.nameExpression??''))missing.push(`${record.line}: unnamed ${node.tag}`)
        if(parents.some(value=>value.tag==='button'))missing.push(`${record.line}: nested ${node.tag} inside button`)
      })
      assert.deepEqual(missing,[])
    })
    await check(`${name}: authored field bindings, limits and disabled states are unchanged`,()=>assert.deepEqual(authoredBindings(parse(source).descriptor.template.ast),authoredBindings(parse(baseline).descriptor.template.ast)))
    if(!['AnimationPanel','EventSheetEditor'].includes(name))await check(`${name}: handlers and serialization code are unchanged`,()=>{
      const strip=value=>value.replaceAll('\r\n','\n').replace(/^import \{ panelControlLabel \} from '\.\.\/editor\/panelControlCopy'\n/m,'')
      assert.equal(strip(parse(source).descriptor.scriptSetup.content),strip(parse(baseline).descriptor.scriptSetup.content))
    })
  }
  const overlay={name:'panel-test-source-overlay',enforce:'pre',resolveId(source,importer){
    if(!importer||!source.startsWith('.'))return null
    const raw=resolve(dirname(importer.split('?')[0]),source),prefix=[join(sourceRoot,'src'),join(root,'src')].find(prefix=>raw.startsWith(prefix+sep))
    if(!prefix)return null
    for(const base of [sourceRoot,root])for(const extension of ['','.ts','.json','.js','/index.ts']){const candidate=join(base,'src',raw.slice(prefix.length+1)+extension);if(existsSync(candidate))return candidate.replaceAll('\\','/')}
    return null
  }}
  const testDictionaries={name:'test-only-dictionary-export',transform(source,id){if(id.replaceAll('\\','/')===join(root,'src/i18n.ts').replaceAll('\\','/'))return source+'\nexport { dictionaries as testDictionaries }\n'}}
  await build({configFile:false,root,plugins:[overlay,testDictionaries],logLevel:'error',build:{ssr:true,outDir:temporary,emptyOutDir:false,rollupOptions:{input:{guards:join(sourceRoot,'src/editor/panelAuthoringGuards.ts'),copy:join(sourceRoot,'src/editor/panelControlCopy.ts'),i18n:join(root,'src/i18n.ts'),preferences:join(root,'src/store/preferences.ts')},output:{entryFileNames:'[name].mjs'}}}})
  const[{isEditableKeyboardTarget,createEventSheetTransitionGuard},{panelControlLabel},{t,testDictionaries:dictionaries},{preferencesState}]=await Promise.all(['guards','copy','i18n','preferences'].map(name=>import(pathToFileURL(join(temporary,name+'.mjs')).href)))
  await check('Control labels have registered English, German and Chinese translations',()=>{
    const expressions=inventory.map(value=>value.nameExpression).join('\n'),keys=[...expressions.matchAll(/\bt\('([^']+)'\)/g)].map(value=>value[1]),copyKeys=[...expressions.matchAll(/panelControlLabel\('([^']+)'/g)].map(value=>value[1])
    const missing=[];for(const locale of ['en','de','zh']){preferencesState.locale=locale;for(const key of new Set(keys)){if(!Object.hasOwn(dictionaries[locale],key))missing.push(`${locale}: missing ${key}`);assert.ok(t(key).length>0,`${locale}: empty ${key}`)}for(const key of copyKeys)assert.ok(panelControlLabel(key).length>0,`${locale}: ${key}`)}assert.deepEqual(missing,[])
  })
  await check('Actual AnimationPanel shortcut handler preserves input, textarea and contenteditable editing',()=>{
    const script=parse(sources.get('AnimationPanel')).descriptor.scriptSetup.content,ast=ts.createSourceFile('animation.ts',script,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)
    const fn=ast.statements.find(value=>ts.isFunctionDeclaration(value)&&value.name?.text==='onKeyDown');assert.ok(fn)
    const code=ts.transpileModule(fn.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
    let copied=0,pasted=0;const clip={value:{tracks:[{keyframes:[{time:1,value:2}]}]}},selectedKeys={value:[{track:0,key:0}]},studio={selectedKeyIds:['0:0']}
    const handler=new Function('isEditableKeyboardTarget','copyKeys','pasteKeys','clip','selectedKeys','studio',code+'\nreturn onKeyDown')(isEditableKeyboardTarget,()=>copied++,()=>pasted++,clip,selectedKeys,studio)
    for(const target of [{closest:()=>({tagName:'INPUT'})},{closest:()=>({tagName:'TEXTAREA'})},{isContentEditable:true},{parentElement:{closest:()=>({tagName:'DIV'})}}])for(const key of ['c','v','Delete'])handler({target,key,ctrlKey:key!=='Delete',preventDefault(){throw Error('Text editing was consumed')}})
    assert.equal(copied,0);assert.equal(pasted,0);assert.equal(clip.value.tracks[0].keyframes.length,1)
    const target={closest:()=>null};handler({target,key:'c',ctrlKey:true,preventDefault(){}});handler({target,key:'v',ctrlKey:true,preventDefault(){}});handler({target,key:'Delete',preventDefault(){}});assert.equal(copied,1);assert.equal(pasted,1);assert.equal(clip.value.tracks[0].keyframes.length,0)
  })
  function eventFunctions(names,dependencies){
    const ast=ts.createSourceFile('events.ts',parse(sources.get('EventSheetEditor')).descriptor.scriptSetup.content,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)
    const declarations=names.map(name=>{const node=ast.statements.find(value=>ts.isFunctionDeclaration(value)&&value.name?.text===name);assert.ok(node,name);return node.getText(ast)}).join('\n')
    const code=ts.transpileModule(declarations,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
    return new Function(...Object.keys(dependencies),code+'\nreturn {'+names.join(',')+'}')( ...Object.values(dependencies))
  }
  await check('Actual Event Sheet logic selection remains a draft until Save',()=>{
    let marked=0;const {logicChanged}=eventFunctions(['logicChanged'],{markDirty:()=>marked++})
    logicChanged();assert.equal(marked,1)
  })
  await check('Actual Event Sheet Save retains failed drafts and updates the attached entity only after persistence',()=>{
    for(const result of ['throw',false,true]){
      const dirty={value:true},document={value:{logicAsset:'new-logic'}},calls=[],record={uuid:'sheet',name:'Sheet'},loadedBaseSource={value:'saved before edit'},cache=new Map([[record,JSON.stringify(document.value)]])
      let saved='saved before edit'
      const {save}=eventFunctions(['save'],{activeAsset:{value:record},activeUuid:{value:'sheet'},errors:{value:[]},eventDraftConflict:{value:false},dirty,document,loadedBaseSource,draftProjectId:'project',
        saveEventSheetAsset:(uuid,value)=>{assert.equal(uuid,record.uuid);assert.equal(value,document.value);calls.push('persist');if(result==='throw')throw Error('disk unavailable');if(result)saved=JSON.stringify(value);return result},attached:{value:true},selectedEntity:{value:{}},
        readTextAsset:uuid=>{assert.equal(uuid,record.uuid);calls.push('read');return saved},clearStudioDraft:(value,project)=>{assert.equal(value,record);assert.equal(project,'project');calls.push('clear');cache.delete(value)},
        attachEventSheet:()=>calls.push('attach'),assetReference:value=>value,pushHistory:()=>calls.push('history'),addEditorLog:()=>calls.push('log'),panelControlLabel:value=>value,t:value=>value})
      assert.equal(save(),result===true);assert.equal(dirty.value,result!==true)
      assert.deepEqual(calls,result===true?['persist','attach','history','log','read','clear']:['persist','log']);assert.equal(cache.has(record),result!==true);assert.equal(loadedBaseSource.value,result===true?JSON.stringify(document.value):'saved before edit')
    }
  })
  await check('Actual Event Sheet Save blocks a saved-base conflict before persistence or cache cleanup',()=>{
    const dirty={value:true},document={value:{logicAsset:'draft'}},calls=[]
    const {save}=eventFunctions(['save'],{activeAsset:{value:{uuid:'sheet'}},activeUuid:{value:'sheet'},errors:{value:[]},eventDraftConflict:{value:true},dirty,document,addEditorLog:()=>calls.push('conflict'),panelControlLabel:value=>value,saveEventSheetAsset:()=>{throw Error('Conflicted draft must not write')},clearStudioDraft:()=>{throw Error('Conflicted draft must stay recoverable')}})
    assert.equal(save(),false);assert.equal(dirty.value,true);assert.deepEqual(document.value,{logicAsset:'draft'});assert.deepEqual(calls,['conflict'])
  })
  await check('Actual Event Sheet leave/Open logic handlers share decisions and restore discarded source before navigation',async()=>{
    for(const action of ['requestLeave','openLogic'])for(const choice of ['save','discard','cancel']){
      const dirty={value:true},document={value:{logicAsset:'draft-logic'}},activeUuid={value:'sheet'},calls=[],record={uuid:'sheet'},loadedBaseSource={value:'original base'},cache=new Map([[record,JSON.stringify(document.value)]])
      let saved='{"logicAsset":"saved-logic"}'
      const decisions=choice==='save'?[true]:[false,choice==='discard']
      const transitions=createEventSheetTransitionGuard({snapshot:()=>({identity:activeUuid.value,source:JSON.stringify(document.value),dirty:dirty.value}),chooseSave:async()=>decisions.shift(),chooseDiscard:async()=>decisions.shift(),save:()=>{saved=JSON.stringify(document.value);loadedBaseSource.value=saved;cache.delete(record);dirty.value=false;calls.push('save');return true},report:reason=>calls.push(reason)})
      const logicRecord={get value(){return {assetType:'script',uuid:document.value.logicAsset}}},graphStudioState={mode:'events'}
      const functions=eventFunctions(['restoreDiscardedDraft','requestLeave','openLogic'],{dirty,document,activeUuid,activeAsset:{value:record},loadedBaseSource,draftProjectId:'project',transitions,readTextAsset:uuid=>{assert.equal(uuid,record.uuid);return saved},clearStudioDraft:(value,project)=>{assert.equal(value,record);assert.equal(project,'project');cache.delete(value);calls.push('clear')},parseEventSheet:JSON.parse,addEditorLog:()=>{},panelControlLabel:value=>value,logicRecord,graphStudioState,openScriptAsset:uuid=>calls.push(uuid),openGraphAsset:()=>{throw Error('wrong asset kind')}})
      assert.equal(await functions[action](),choice!=='cancel')
      assert.equal(document.value.logicAsset,choice==='discard'?'saved-logic':'draft-logic');assert.equal(dirty.value,choice==='cancel')
      assert.equal(cache.has(record),choice==='cancel');assert.equal(loadedBaseSource.value,choice==='cancel'?'original base':saved)
      if(action==='openLogic'){assert.equal(graphStudioState.mode,choice==='cancel'?'events':'code');if(choice!=='cancel')assert.ok(calls.includes(choice==='discard'?'saved-logic':'draft-logic'))}
      else assert.equal(graphStudioState.mode,'events')
    }
  })
  await check('Actual Event Sheet discard refuses missing or malformed saved text and retains its exact recovery state',()=>{
    for(const saved of [null,'malformed JSON']){
      const dirty={value:true},document={value:{logicAsset:'invalid draft!'}},before=JSON.stringify(document.value),loadedBaseSource={value:'original base'},calls=[]
      const {restoreDiscardedDraft}=eventFunctions(['restoreDiscardedDraft'],{dirty,document,loadedBaseSource,activeUuid:{value:'sheet'},activeAsset:{value:{uuid:'sheet'}},draftProjectId:'project',readTextAsset:()=>saved,parseEventSheet:JSON.parse,addEditorLog:()=>calls.push('error'),panelControlLabel:value=>value,clearStudioDraft:()=>{throw Error('Failed discard must retain recovery')}})
      assert.equal(restoreDiscardedDraft(),false);assert.equal(dirty.value,true);assert.equal(JSON.stringify(document.value),before);assert.equal(loadedBaseSource.value,'original base');assert.deepEqual(calls,['error'])
    }
  })
  const scenario=(decisions=[],saveResult=true)=>{
    const state={identity:'sheet-a',source:'current draft',dirty:true},calls={save:0,operation:0,decisions:0,reports:[]}
    const choose=async()=>{calls.decisions++;return decisions.shift()??false}
    const host={snapshot:()=>({...state}),chooseSave:choose,chooseDiscard:choose,save:()=>{calls.save++;if(saveResult)state.dirty=false;return saveResult},report:(reason,error)=>calls.reports.push(reason)}
    return{state,calls,host,operation:()=>{calls.operation++;state.identity='sheet-b';state.source='next document';state.dirty=false}}
  }
  await check('Dirty Event Sheet transitions save successfully before changing the document',async()=>{
    const value=scenario([true]);assert.equal(await createEventSheetTransitionGuard(value.host).run(value.operation),true);assert.equal(value.calls.save,1);assert.equal(value.calls.operation,1)
  })
  await check('Discard proceeds without saving; Cancel preserves the exact draft and identity',async()=>{
    for(const discard of [true,false]){const value=scenario([false,discard]),before={...value.state};assert.equal(await createEventSheetTransitionGuard(value.host).run(value.operation),discard);assert.equal(value.calls.save,0);assert.equal(value.calls.operation,discard?1:0);if(!discard)assert.deepEqual(value.state,before)}
  })
  await check('Invalid and throwing saves retain dirty drafts and prevent creation/open side effects',async()=>{
    const value=scenario([true],false),before={...value.state};assert.equal(await createEventSheetTransitionGuard(value.host).run(value.operation),false);assert.deepEqual(value.state,before);assert.equal(value.calls.operation,0);assert.deepEqual(value.calls.reports,['invalid'])
    value.host.chooseSave=async()=>true;value.host.save=()=>{throw Error('disk unavailable')};assert.equal(await createEventSheetTransitionGuard(value.host).run(value.operation),false);assert.deepEqual(value.state,before);assert.equal(value.calls.operation,0)
  })
  await check('Changes during a decision or asynchronous save reject stale transitions',async()=>{
    for(const phase of ['decision','save']){const value=scenario([true]);if(phase==='decision')value.host.chooseSave=async()=>{value.state.source='newer draft';return true};else value.host.save=async()=>{value.state.source='newer draft';value.state.dirty=true;return true};assert.equal(await createEventSheetTransitionGuard(value.host).run(value.operation),false);assert.equal(value.state.source,'newer draft');assert.equal(value.calls.operation,0);assert.deepEqual(value.calls.reports,['stale'])}
  })
  await check('Concurrent document changes cannot bypass an outstanding dirty-draft decision',async()=>{
    const value=scenario(),guard=createEventSheetTransitionGuard(value.host);let resolveDecision;value.host.chooseSave=()=>new Promise(resolve=>resolveDecision=resolve)
    const first=guard.run(value.operation);assert.equal(await guard.run(value.operation),false);resolveDecision(false);assert.equal(await first,false);assert.equal(value.calls.operation,0)
    value.state.dirty=false;assert.equal(await guard.run(value.operation),true);assert.equal(value.calls.operation,1)
  })
  const status=checks.some(value=>value.status==='failed')?'failed':'passed',output=sourceRoot===root?join(root,'release-audits/v26.13-panel-accessibility.json'):join(sourceRoot,'reports/panel-accessibility-verification.json')
  await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify({status,generatedAt:new Date().toISOString(),scope:'Full conditional source control-name audit; compiled SFCs and executed production authoring handlers/helpers. This does not certify browser accessible-name computation, visual geometry, pointer actions or all panel states.',checks,controls:inventory},null,2)+'\n')
  console.log(JSON.stringify({status,checks:checks.length,controls:inventory.length,failed:checks.filter(value=>value.status==='failed'),output}));if(status==='failed')process.exitCode=1
}finally{await rm(temporary,{recursive:true,force:true})}
