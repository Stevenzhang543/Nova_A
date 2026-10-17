/** 版本26.16：生成参考项目与对应资源，供功能演示和版本验证使用。 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root=dirname(dirname(fileURLToPath(import.meta.url))),temporary=await mkdtemp(join(tmpdir(),'nova-reference-2616-'))
const release='26.16',engineVersion='26.16.0',verify=process.argv.includes('--verify-only'),hash=/* 调用 createHash('sha256').update(value).digest('hex') 并返回调用结果。 */ value=>createHash('sha256').update(value).digest('hex')
const uuid=/** 将输入散列转换为确定性参考标识。 */ value=>{const h=hash(value);return h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32)}
const stamp='2026-09-05T00:00:00.000Z'
const actions=[
  {action:'Arrange the whole typed graph, then select a region and arrange only that region. Undo and Redo.',expected:'Unselected/manual positions, node identities and viewport survive; playing still follows the same six-point route.'},
  {action:'Add and move a wire reroute, save/reopen the graph, maximize and restore its panels.',expected:'Waypoints persist in order, node fields remain reachable and saved panel dimensions return.'},
  {action:'Play. Use WASD or arrow keys to collect the six checkpoints in order.',expected:'Each checkpoint adds one point; the sixth displays completion.'},
  {action:'Press R after completion and collect the first checkpoint again.',expected:'Score and route restart; the first checkpoint can be collected again.'},
  {action:'Open the gameplay script and switch between Code and Visual three times.',expected:'All statements remain typed nodes; source comments, variables and custom functions remain present.'},
  {action:'Select a numeric Literal node used by movement, change its Rhai spelling, save, and inspect Code.',expected:'Only the intended expression changes; the script passes syntax/VM validation and movement uses the new speed.'},
  {action:'Add an invalid delimiter in Code, attempt Visual, then cancel and repair it.',expected:'The invalid draft stays in Code with its diagnostic; repair enables conversion without losing the draft.'},
  {action:'Save the project, reopen, play, and export Web or Windows on the corresponding available host.',expected:'The same linked source/graph and six-checkpoint route survive reopening; exported runtime uses the selected Script2D asset.'}
]
/** 验证模式逐字比较生成内容，否则创建父目录并写入文件。 */ async function output(path,content){if(verify)assert.equal(await readFile(path,'utf8'),content,path+' differs from its deterministic generator');else{await mkdir(dirname(path),{recursive:true});await writeFile(path,content)}}
try{
  assert.equal(JSON.parse(await readFile(join(root,'package.json'),'utf8')).version,engineVersion,'Select the26.16 candidate before generating its references.')
  const entries={templates:'projects/templates',sync:'visual/graphCodeSync',types:'visual/graphTypes',compiler:'visual/graphCompiler',layout:'visual/graphLayoutEngine'}
  await build({configFile:false,root,logLevel:'error',ssr:{noExternal:true},build:{ssr:true,outDir:temporary,emptyOutDir:false,rollupOptions:{input:Object.fromEntries(Object.entries(entries).map(/* 返回按声明顺序构造的数组 [name,join(root,'src',path+'.ts')]。 */ ([name,path])=>[name,join(root,'src',path+'.ts')])),output:{entryFileNames:'[name].mjs',chunkFileNames:'[name]-[hash].mjs'}}}})
  const [templates,sync,types,compiler,layout]=await Promise.all(Object.keys(entries).map(/* 调用 import(pathToFileURL(join(temporary,name+'.mjs')).href) 并返回调用结果。 */ name=>import(pathToFileURL(join(temporary,name+'.mjs')).href)))
  // Every shipped Rhai starter participates in the same projection qualification.
  let converted=0
  for(const descriptor of templates.PROJECT_TEMPLATES)for(const asset of templates.createTemplateProject(descriptor.id,descriptor.name).assets.filter(/* 比较 asset.assetType 与 'script'，返回严格相等的判断结果。 */ asset=>asset.assetType==='script')){
    const graph=sync.createGraphFromRhaiSource(asset.source,asset.name),compiled=compiler.compileGraph(graph)
    assert.equal(compiled.valid,true,descriptor.id+'/'+asset.name+': '+JSON.stringify(compiled.diagnostics));assert.equal(compiled.source,asset.source);converted++
  }
  for(const mode of ['code','blocks','mixed']){
    const id='creator-v2616-'+mode+'-game',title='Nova 26.16 Coin Trail — '+mode,project=templates.createTemplateProject('coin-trail',title)
    const projectId=uuid(id);project.engineVersion=engineVersion;project.projectName=title;project.projectMetadata={...project.projectMetadata,id:projectId,name:title,template:id,createdAt:stamp,updatedAt:stamp};project.manifest={...project.manifest,projectUuid:projectId,name:title}
    const originalScripts=project.assets.filter(/* 比较 asset.assetType 与 'script'，返回严格相等的判断结果。 */ asset=>asset.assetType==='script'),graphAssets=[]
    for(const script of originalScripts){
      const seed=id+'/'+script.path,graph=sync.createGraphFromRhaiSource(script.source,script.name.replace(/\.rhai$/,''),uuid(seed+'/graph')),ids=new Map()
      for(const node of graph.nodes){ids.set(node.uuid,uuid(seed+'/node/'+node.config.astId));for(const pin of node.pins)ids.set(pin.uuid,uuid(seed+'/pin/'+node.config.astId+'/'+pin.direction+'/'+pin.key))}
      for(const edge of graph.edges)ids.set(edge.uuid,uuid(seed+'/edge/'+ids.get(edge.from.pinUuid)+'/'+ids.get(edge.to.pinUuid)))
      const stable=JSON.parse(JSON.stringify(graph,/* 根据 typeof value==='string'&&ids.has(value) 的真假，分别返回 ids.get(value) 或 value。 */ (_key,value)=>typeof value==='string'&&ids.has(value)?ids.get(value):value))
      const arranged=layout.layoutGraph({nodes:stable.nodes,edges:stable.edges})
      for(const node of stable.nodes)node.position=arranged.positions[node.uuid]??node.position
      assert.equal(compiler.compileGraph(stable).source,script.source,'Layout must preserve generated behavior and source')
      const source=types.serializeGraphDocument(stable),graphId=uuid(seed+'/asset'),name=script.name.replace(/\.rhai$/,'.nova-graph')
      const asset={...structuredClone(script),uuid:graphId,assetType:'visualScript',name,path:'Assets/Visual Scripts/'+name,mimeType:'application/x-nova-graph+json',source,byteLength:Buffer.byteLength(source)}
      delete asset.script;asset.pipeline={...asset.pipeline,sourceHash:hash(source),artifactHash:hash(source),contentHash:hash(source),cacheKey:hash(source),lastValidSource:source};graphAssets.push(asset)
      script.script={...script.script,version:2,linkedGraphUuid:stable.uuid};script.source=sync.createLinkedRhaiSource(stable);script.byteLength=Buffer.byteLength(script.source);script.pipeline={...script.pipeline,sourceHash:hash(script.source),artifactHash:hash(script.source),contentHash:hash(script.source),cacheKey:hash(script.source),lastValidSource:script.source}
      if(mode==='blocks')for(const scene of project.scenes)for(const entity of scene.entities)for(const component of entity.components)if(component.kind==='Script2D'&&component.data.scriptAsset==='asset://'+script.uuid)component.data.scriptAsset='asset://'+graphId
    }
    project.assets.push(...graphAssets)
    const directory=join(root,'reference-projects/projects',id),authoring=mode==='blocks'?'typed Rhai structure attached through Script2D':mode==='mixed'?'linked Rhai code and typed structure':'Rhai code with synchronized typed companion'
    const common={version:1,release,engineVersion,projectFormat:2,schema:29,reference:id,authoring}
    const expected={format:'nova-reference-expected-output',...common,checkpoints:6,initialScore:0,completionScore:6,restartAction:'Restart',graphs:graphAssets.map(/* 返回 asset.uuid 的当前值。 */ asset=>asset.uuid),sourceScripts:originalScripts.map(/* 返回 asset.uuid 的当前值。 */ asset=>asset.uuid),behaviors:actions.map(/** 将测试操作转换为带稳定索引的行为预期。 */ (item,index)=>({id:id+'-'+index,description:item.action,expectedOutcome:item.expected}))}
    const controls={format:'nova-reference-test-controls',...common,classification:['gameplay','code-visual','save-reopen','export'],actions}
    await output(join(directory,'project.nova'),JSON.stringify(project,null,2)+'\n');await output(join(directory,'expected-output.json'),JSON.stringify(expected,null,2)+'\n');await output(join(directory,'test-controls.json'),JSON.stringify(controls,null,2)+'\n')
    await output(join(directory,'README.md'),'# '+title+'\n\nPublic release **26.16** · Engine **26.16.0** · Project Format 2/schema 29.\n\nAuthoring: '+authoring+'. The same Coin Trail scene, input map and gameplay source are used by all three variants. Only the blocks variant attaches the graph asset directly. Both modes use the same runtime module resolver and command path.\n\n'+actions.map(/* 计算表达式 (index+1)+'. '+item.action+' **Expected:** '+item.expected 并返回结果，沿用操作数的原有类型规则。 */ (item,index)=>(index+1)+'. '+item.action+' **Expected:** '+item.expected).join('\n\n')+'\n\nSee [the26.14 object-family lesson and current asset/rendering manual](../../../docs/OBJECT_FAMILY_LESSON_26_14.en.md) and the English/German/Chinese offline manual. A generated reference is a repeatable test input; qualification results are recorded separately.\n')
  }
  const server=JSON.parse(await readFile(join(root,'reference-projects/projects/server-v2610-headless-authority/project.nova'),'utf8')),id='server-v2616-headless-authority',title='Nova 26.16 Headless Authority',directory=join(root,'reference-projects/projects',id)
  server.engineVersion=engineVersion;server.projectName=title;server.projectMetadata={...server.projectMetadata,id:uuid(id),name:title,template:id,createdAt:stamp,updatedAt:stamp};server.manifest={...server.manifest,projectUuid:uuid(id),name:title};if(server.projectSettings?.build)server.projectSettings.build.gameName=title
  server.projectSettings.production.networking.sessionName=title
  const serverActions=[{action:'Validate and export the configured local Windows authority.',expected:'The packaged renderer-disabled WebView authority starts with its exact engine and package hash.'},{action:'Connect and reconnect a loopback client.',expected:'Permission-checked snapshots arrive and stale peer state is removed.'},{action:'Remove a required permission or corrupt the player payload.',expected:'Validation rejects the candidate without starting an unsafe authority.'}],common={version:1,release,engineVersion,projectFormat:2,schema:29,reference:id,authoring:'permission-gated renderer-disabled WebView authority'}
  await output(join(directory,'project.nova'),JSON.stringify(server,null,2)+'\n');await output(join(directory,'expected-output.json'),JSON.stringify({format:'nova-reference-expected-output',...common,behaviors:serverActions},null,2)+'\n');await output(join(directory,'test-controls.json'),JSON.stringify({format:'nova-reference-test-controls',...common,classification:['native-export','loopback','permission-negative'],actions:serverActions},null,2)+'\n');await output(join(directory,'README.md'),'# '+title+'\n\nPublic release **26.16** · Engine **26.16.0** · Project Format 2/schema 29.\n\nThe retained authority runs in a renderer-disabled WebView; it is not a windowless native server. See test-controls.json for export, loopback and permission-negative checks. The separate current headless report records actual execution and binary hashes.\n')
  console.log((verify?'Verified':'Generated')+' three deterministic 26.16 games and one retained authority; '+converted+' shipped Rhai scripts converted exactly.')
}finally{await rm(temporary,{recursive:true,force:true})}
