import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root=dirname(dirname(fileURLToPath(import.meta.url))),temporary=await mkdtemp(join(tmpdir(),'nova-reference-2618-'))
const release='26.18',engineVersion='26.18.0',verify=process.argv.includes('--verify-only'),hash=value=>createHash('sha256').update(value).digest('hex')
const uuid=value=>{const h=hash(value);return h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32)}
const stamp='2026-09-09T00:00:00.000Z'
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
async function output(path,content){if(verify)assert.equal(await readFile(path,'utf8'),content,path+' differs from its deterministic generator');else{await mkdir(dirname(path),{recursive:true});await writeFile(path,content)}}
try{
  if(!process.argv.includes('--development')) assert.equal(JSON.parse(await readFile(join(root,'package.json'),'utf8')).version,engineVersion,'Select the26.18 candidate before generating its references.')
  const entries={templates:'projects/templates',sync:'visual/graphCodeSync',types:'visual/graphTypes',compiler:'visual/graphCompiler',layout:'visual/graphLayoutEngine'}
  await build({configFile:false,root,logLevel:'error',ssr:{noExternal:true},build:{ssr:true,outDir:temporary,emptyOutDir:false,rollupOptions:{input:Object.fromEntries(Object.entries(entries).map(([name,path])=>[name,join(root,'src',path+'.ts')])),output:{entryFileNames:'[name].mjs',chunkFileNames:'[name]-[hash].mjs'}}}})
  const [templates,sync,types,compiler,layout]=await Promise.all(Object.keys(entries).map(name=>import(pathToFileURL(join(temporary,name+'.mjs')).href)))
  // Every shipped Rhai starter participates in the same projection qualification.
  let converted=0
  for(const descriptor of templates.PROJECT_TEMPLATES)for(const asset of templates.createTemplateProject(descriptor.id,descriptor.name).assets.filter(asset=>asset.assetType==='script')){
    const graph=sync.createGraphFromRhaiSource(asset.source,asset.name),compiled=compiler.compileGraph(graph)
    assert.equal(compiled.valid,true,descriptor.id+'/'+asset.name+': '+JSON.stringify(compiled.diagnostics));assert.equal(compiled.source,asset.source);converted++
  }
  for(const mode of ['code','blocks','mixed']){
    const id='creator-v2618-'+mode+'-game',title='Nova 26.18 Coin Trail — '+mode,project=templates.createTemplateProject('coin-trail',title)
    const projectId=uuid(id);project.engineVersion=engineVersion;project.projectName=title;project.projectMetadata={...project.projectMetadata,id:projectId,name:title,template:id,createdAt:stamp,updatedAt:stamp};project.manifest={...project.manifest,projectUuid:projectId,name:title}
    const originalScripts=project.assets.filter(asset=>asset.assetType==='script'),graphAssets=[]
    for(const script of originalScripts){
      const seed=id+'/'+script.path,graph=sync.createGraphFromRhaiSource(script.source,script.name.replace(/\.rhai$/,''),uuid(seed+'/graph')),ids=new Map()
      for(const node of graph.nodes){ids.set(node.uuid,uuid(seed+'/node/'+node.config.astId));for(const pin of node.pins)ids.set(pin.uuid,uuid(seed+'/pin/'+node.config.astId+'/'+pin.direction+'/'+pin.key))}
      for(const edge of graph.edges)ids.set(edge.uuid,uuid(seed+'/edge/'+ids.get(edge.from.pinUuid)+'/'+ids.get(edge.to.pinUuid)))
      const stable=JSON.parse(JSON.stringify(graph,(_key,value)=>typeof value==='string'&&ids.has(value)?ids.get(value):value))
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
    const expected={format:'nova-reference-expected-output',...common,checkpoints:6,initialScore:0,completionScore:6,restartAction:'Restart',graphs:graphAssets.map(asset=>asset.uuid),sourceScripts:originalScripts.map(asset=>asset.uuid),behaviors:actions.map((item,index)=>({id:id+'-'+index,description:item.action,expectedOutcome:item.expected}))}
    const controls={format:'nova-reference-test-controls',...common,classification:['gameplay','code-visual','save-reopen','export'],actions}
    await output(join(directory,'project.nova'),JSON.stringify(project,null,2)+'\n');await output(join(directory,'expected-output.json'),JSON.stringify(expected,null,2)+'\n');await output(join(directory,'test-controls.json'),JSON.stringify(controls,null,2)+'\n')
    await output(join(directory,'README.md'),'# '+title+'\n\nPublic release **26.18** · Engine **26.18.0** · Project Format 2/schema 29.\n\nAuthoring: '+authoring+'. The same Coin Trail scene, input map and gameplay source are used by all three variants. Only the blocks variant attaches the graph asset directly. Both modes use the same runtime module resolver and command path.\n\n'+actions.map((item,index)=>(index+1)+'. '+item.action+' **Expected:** '+item.expected).join('\n\n')+'\n\nSee [the26.18 multiplayer lesson](../../../docs/MULTIPLAYER_LESSON_26_18.en.md) and the English/German/Chinese offline manual. A generated reference is a repeatable test input; qualification results are recorded separately.\n')
  }
  const server=JSON.parse(await readFile(join(root,'reference-projects/projects/server-v2610-headless-authority/project.nova'),'utf8')),id='server-v2618-headless-authority',title='Nova 26.18 Headless Authority',directory=join(root,'reference-projects/projects',id)
  server.engineVersion=engineVersion;server.projectName=title;server.projectMetadata={...server.projectMetadata,id:uuid(id),name:title,template:id,createdAt:stamp,updatedAt:stamp};server.manifest={...server.manifest,projectUuid:uuid(id),name:title};if(server.projectSettings?.build)server.projectSettings.build.gameName=title
  server.projectSettings.production.networking.sessionName=title
  const serverActions=[{action:'Validate and export the configured local Windows authority.',expected:'The packaged renderer-disabled WebView authority starts with its exact engine and package hash.'},{action:'Connect and reconnect a loopback client.',expected:'Permission-checked snapshots arrive and stale peer state is removed.'},{action:'Remove a required permission or corrupt the player payload.',expected:'Validation rejects the candidate without starting an unsafe authority.'}],common={version:1,release,engineVersion,projectFormat:2,schema:29,reference:id,authoring:'permission-gated renderer-disabled WebView authority'}
  await output(join(directory,'project.nova'),JSON.stringify(server,null,2)+'\n');await output(join(directory,'expected-output.json'),JSON.stringify({format:'nova-reference-expected-output',...common,behaviors:serverActions},null,2)+'\n');await output(join(directory,'test-controls.json'),JSON.stringify({format:'nova-reference-test-controls',...common,classification:['native-export','loopback','permission-negative'],actions:serverActions},null,2)+'\n');await output(join(directory,'README.md'),'# '+title+'\n\nPublic release **26.18** · Engine **26.18.0** · Project Format 2/schema 29.\n\nThe retained authority runs in a renderer-disabled WebView; it is not a windowless native server. See test-controls.json for export, loopback and permission-negative checks. The separate current headless report records actual execution and binary hashes.\n')

  // Two local co-op player projects share scene/entity/script identities; only their runtime roles/routes differ.
  const coopBase=JSON.parse(await readFile(join(root,'reference-projects/projects/multiplayer-v2607-coop-rollback/project.nova'),'utf8'))
  for(const role of ['host','client']) {
    const id='multiplayer-v2618-coop-'+role,title='Nova 26.18 Co-op '+role,directory=join(root,'reference-projects/projects',id),project=structuredClone(coopBase)
    project.engineVersion=engineVersion;project.projectName=title;project.projectMetadata={...project.projectMetadata,id:uuid(id),name:title,template:id,createdAt:stamp,updatedAt:stamp};project.manifest={...project.manifest,projectUuid:uuid(id),name:title}
    const settings=project.projectSettings.production.networking;Object.assign(settings,{enabled:true,permissionGranted:false,autoStart:false,sessionMode:'local',sessionName:'Nova 26.18 Local Co-op',role,playerName:role==='host'?'Host Player':'Client Player',reconnect:true,lateJoin:true})
    for(const definition of settings.replicatedEntities){definition.predict=false;definition.alwaysRelevant=true}
    project.projectSettings.build={...project.projectSettings.build,gameName:title,runtimeMode:'game'}
    const entities=project.scenes[0].entities,hint=entities.find(entity=>entity.name==='Tutorial Hint')
    hint.components.find(c=>c.kind==='Text').data.text='Co-op: connect in Network Studio, then Play. Focus each window; WASD / arrows move its player.'
    Object.assign(hint.components.find(c=>c.kind==='RectTransform').data,{position:{x:0,y:100},size:{x:1200,y:100}})
    for(const [slot,labelName,scriptName,y] of [['Host','Host Readout','CoopHostPlayer.rhai',190],['Client','Client Readout','CoopClientPlayer.rhai',270]]) {
      const label=structuredClone(hint);label.uuid=uuid('coop18/'+labelName);label.name=labelName
      for(const component of label.components)component.uuid=uuid('coop18/'+labelName+'/'+component.kind)
      Object.assign(label.components.find(c=>c.kind==='RectTransform').data,{position:{x:0,y},size:{x:1000,y:70}})
      Object.assign(label.components.find(c=>c.kind==='Text').data,{text:slot+' X 0 Y 0',fontSize:24});entities.push(label)
      const script=project.assets.find(asset=>asset.name===scriptName);assert.ok(script,scriptName)
      script.source+='\n@export(type="float", min=0, max=1, step=0.01, group="Readout") let readout_elapsed = 0.0;\nfn update(dt) {\n  readout_elapsed += dt;\n  if readout_elapsed < 0.1 { return; }\n  readout_elapsed = 0.0;\n  let pose = transform();\n  let x = (pose.position_x * 1000.0).round() / 1000.0;\n  let y = (pose.position_y * 1000.0).round() / 1000.0;\n  ui_set_text_on(find_entity_handle("'+labelName+'"), "'+slot+' X " + x + " Y " + y);\n}\n'
      script.byteLength=Buffer.byteLength(script.source);if(script.pipeline)Object.assign(script.pipeline,{sourceHash:hash(script.source),artifactHash:hash(script.source),contentHash:hash(script.source),cacheKey:hash(script.source),lastValidSource:script.source})
      assert.equal(compiler.compileGraph(sync.createGraphFromRhaiSource(script.source,script.name)).source,script.source)
    }

    const actions=[
      {action:'Open the host and client projects in separate players. In Network Studio grant permission explicitly, then connect Host first and Client second.',expected:'Both share the exact local session name, report distinct peer identities and no mandatory public provider.'},
      {action:'Play and use WASD or arrow keys in each focused player.',expected:'Host controls Host Player; Client sends bounded coop.move RPCs for Client Player. Both replicated bodies are visible in both players.'},
      {action:'Disconnect Client, move Host, reconnect Client, and observe peer and late-join diagnostics.',expected:'Old queues and peer ownership are cleared. Client restores current replicated state; it does not reset Host to its initial position.'},
      {action:'In a disposable copy choose owner authority for a replicated object, set an admitted owner identity, and exercise explicit authority transfer.',expected:'Only the current owner publishes owner state; host relay does not overwrite the owner. Server authority remains the shipped co-op default.'},
      {action:'Change a custom channel limit, enter an invalid number, repair it, Undo/Redo, then save and reopen.',expected:'Invalid numeric drafts preserve authored state. Valid settings and replication field selection survive history and reopening.'},
      {action:'Export both game players with explicit automatic networking enabled and compare their movement; separately export server-v2618-headless-authority on Windows.',expected:'Games match editor behavior. Server export is a renderer-disabled WebView, with per-player network diagnostics; no windowless-native claim.'}
    ],common={version:1,release,engineVersion,projectFormat:2,schema:29,reference:id,authoring:'Rhai co-op with explicit optional networking'}
    await output(join(directory,'project.nova'),JSON.stringify(project,null,2)+'\n');await output(join(directory,'expected-output.json'),JSON.stringify({format:'nova-reference-expected-output',...common,behaviors:actions},null,2)+'\n');await output(join(directory,'test-controls.json'),JSON.stringify({format:'nova-reference-test-controls',...common,classification:['co-op','authority','reconnect','late-join','save-reopen','export'],actions},null,2)+'\n')
    await output(join(directory,'README.md'),'# '+title+'\n\nPublic release **26.18** · Engine **26.18.0** · Project Format 2/schema 29.\n\nThis two-player localhost teaching project starts with permission withheld and automatic connection disabled. Grant permission and connect explicitly in each disposable player. Both projects share scene, entity and script identities; their role/player label differs. Additional clients share the Client Player teaching slot; this is not an eight-avatar game.\n\n'+actions.map((item,index)=>(index+1)+'. '+item.action+' **Expected:** '+item.expected).join('\n\n')+'\n\nFull physics/VM rollback and public internet are not provided by this reference. See docs/MULTIPLAYER_LESSON_26_18.en.md and the separately recorded user audits.\n')
  }
  console.log((verify?'Verified':'Generated')+' three deterministic 26.18 games, two co-op roles and one retained authority; '+converted+' shipped Rhai scripts converted exactly.')
}finally{await rm(temporary,{recursive:true,force:true})}
