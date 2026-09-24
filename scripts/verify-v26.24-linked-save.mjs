/** 关联图保存回归：使用真实资源数据库验证只读伙伴拒绝、多脚本一致性及写入中断回滚。 */
import assert from 'node:assert/strict'
import {mkdtemp,rm,writeFile,readFile,mkdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {build} from 'vite'
const temporary=await mkdtemp(join(tmpdir(),'nova-linked24-')),checks=[]
try{
  await build({configFile:false,root:process.cwd(),logLevel:'error',ssr:{noExternal:true},build:{ssr:true,outDir:temporary,emptyOutDir:false,rollupOptions:{input:{sync:resolve('src/visual/graphCodeSync.ts'),assets:resolve('src/assets/AssetDatabase.ts'),schema:resolve('src/visual/graphSyntaxSchema.ts'),types:resolve('src/visual/graphTypes.ts')},output:{entryFileNames:'[name].mjs'}}}})
  const sync=await import(pathToFileURL(join(temporary,'sync.mjs'))),assets=await import(pathToFileURL(join(temporary,'assets.mjs'))),schema=await import(pathToFileURL(join(temporary,'schema.mjs'))),types=await import(pathToFileURL(join(temporary,'types.mjs')))
  const graph=sync.createGraphFromRhaiSource('fn start(){print(1);}','Atomic graph'),record=assets.createTextAsset('Atomic graph','visualScript',types.serializeGraphDocument(graph)),first=assets.createTextAsset('First','script',sync.createLinkedRhaiSource(graph)),second=assets.createTextAsset('Second','script',sync.createLinkedRhaiSource(graph))
  assert.ok(sync.linkScriptToGraph(first.uuid,graph));assert.ok(sync.linkScriptToGraph(second.uuid,graph))
  const literal=graph.nodes.find(/** 修改实际字面量节点以触发重新生成。 */ node=>node.type==='rhai.Literal');schema.setSyntaxNodeField(literal,'raw','2',graph)
  second.path='.nova/protected/second.rhai'
  const before=JSON.stringify(assets.assetState.records),generation=assets.assetState.generation
  assert.throws(/** 任一关联脚本不可写时，同步必须拒绝整个集合。 */ ()=>sync.synchronizeLinkedScriptsForGraph(graph),/writ|readonly|read-only|protected/i)
  assert.equal(JSON.stringify(assets.assetState.records),before);assert.equal(assets.assetState.generation,generation)
  checks.push({name:'Protected linked companion rejects before changing any record',status:'passed'})
  /** 捕获全部可见资源状态；不仅检查源码，也检查顺序、目录、选择和缓存代次。 */
  const snapshot=()=>JSON.stringify({records:assets.assetState.records,folders:assets.assetState.folders,selected:assets.assetState.selectedGuid,folder:assets.assetState.currentFolder,generation:assets.assetState.generation})
  /** 以实际数据库对象检查失败操作无副作用，并保留响应式记录的身份。 */
  const rejectsUnchanged=(name,operation,pattern)=>{
    const state=snapshot(),identities=[...assets.assetState.records]
    assert.throws(operation,pattern)
    assert.equal(snapshot(),state,name)
    identities.forEach(/** 回滚后各记录仍为原响应式对象，避免悬空选中引用。 */ (item,index)=>assert.equal(assets.assetState.records[index],item))
    checks.push({name,status:'passed'})
  }
  rejectsUnchanged('Protected companion rejects graph and script transaction',/** 执行指定失败场景并检查完整回滚。 */ ()=>sync.commitLinkedGraphAsset(record.uuid,graph),/protected/)
  second.path='Assets/Scripts/Second.rhai'
  for(const stage of ['after-graph','after-scripts']) rejectsUnchanged('Rollback '+stage,/** 执行指定失败场景并检查完整回滚。 */ ()=>sync.commitLinkedGraphAsset(record.uuid,graph,stage),/Injected/)
  const previousPath=record.path;record.path='.nova/protected/graph.nova-graph'
  rejectsUnchanged('Protected graph rejects before companion updates',/** 执行指定失败场景并检查完整回滚。 */ ()=>sync.commitLinkedGraphAsset(record.uuid,graph),/protected/)
  record.path=previousPath
  const wrongGraph=structuredClone(graph);wrongGraph.uuid=crypto.randomUUID()
  rejectsUnchanged('Graph identity mismatch refuses overwrite',/** 执行指定失败场景并检查完整回滚。 */ ()=>sync.commitLinkedGraphAsset(record.uuid,wrongGraph),/identity/)
  second.script.linkedGraphUuid=crypto.randomUUID()
  rejectsUnchanged('Conflicting metadata and source marker refuse overwrite',/** 执行指定失败场景并检查完整回滚。 */ ()=>sync.commitLinkedGraphAsset(record.uuid,graph),/conflicting/)
  second.script.linkedGraphUuid=graph.uuid
  const result=sync.commitLinkedGraphAsset(record.uuid,graph)
  assert.deepEqual(new Set(result.scriptUuids),new Set([first.uuid,second.uuid]))
  assert.equal(assets.readTextAsset(record.uuid),types.serializeGraphDocument(graph))
  for(const item of [first,second]){assert.equal(assets.readTextAsset(item.uuid),sync.createLinkedRhaiSource(graph));assert.equal(item.script.linkedGraphUuid,graph.uuid)}
  checks.push({name:'Successful save commits graph and all linked scripts',status:'passed'})
  second.path='.nova/protected/second.rhai'
  const protectedState=snapshot();assert.equal(sync.linkScriptToGraph(second.uuid,wrongGraph),false);assert.equal(snapshot(),protectedState)
  checks.push({name:'Single protected script refuses new link without metadata mutation',status:'passed'})
  const solo=sync.createGraphFromRhaiSource('fn start(){print(3);}','Solo graph'),soloRecord=assets.createTextAsset('Solo graph','visualScript',types.serializeGraphDocument(solo))
  assets.assetState.folders=assets.assetState.folders.filter(/** 强制本次创建增加目录，以验证异常会删除该目录。 */ folder=>folder!=='Assets/Scripts/Generated')
  rejectsUnchanged('New companion interruption removes orphan and restores folders and selection',/** 执行指定失败场景并检查完整回滚。 */ ()=>sync.commitLinkedGraphAsset(soloRecord.uuid,solo,'after-create'),/Injected/)
  const created=sync.commitLinkedGraphAsset(soloRecord.uuid,solo)
  assert.equal(created.scriptUuids.length,1);assert.equal(sync.linkedScriptGraphUuid(created.scriptUuids[0]),solo.uuid)
  assert.equal(assets.readTextAsset(created.scriptUuids[0]),sync.createLinkedRhaiSource(solo))
  checks.push({name:'Unlinked graph save creates exactly one verified companion',status:'passed'})
  const count=assets.assetState.records.length,ensured=sync.ensureLinkedScriptForGraph(solo)
  assert.equal(ensured.created,false);assert.equal(ensured.scriptUuid,created.scriptUuids[0]);assert.equal(assets.assetState.records.length,count)
  checks.push({name:'Repeated companion generation reuses existing linked resource',status:'passed'})
  const raw=assets.createTextAsset('Original CRLF','script','// 作者注释\r\nfn start(){print(4); }\r\n'),edited='// 新注释保持原文\r\nfn start(){print(5); }\r\n'
  raw.script.recoverySource=edited
  const metadata=JSON.parse(JSON.stringify(raw.script));metadata.recoverySource='';metadata.lastSavedHash='test-hash'
  for(const stage of ['after-source','after-graph']) rejectsUnchanged('Reverse conversion rollback '+stage,/** 执行指定失败场景并检查完整回滚。 */ ()=>sync.commitLinkedScriptAsset(raw.uuid,edited,metadata,stage),/Injected/)
  const reverse=sync.commitLinkedScriptAsset(raw.uuid,edited,metadata)
  assert.equal(reverse.created,true);assert.equal(assets.readTextAsset(raw.uuid),edited);assert.equal(raw.script.recoverySource,'');assert.equal(raw.script.lastSavedHash,'test-hash')
  assert.equal(sync.linkedScriptGraphUuid(raw.uuid),reverse.graph.uuid)
  checks.push({name:'Reverse conversion preserves exact authored CRLF source and commits metadata',status:'passed'})
  const reverseRecord=assets.assetState.records.find(/** 查找真实图资源以施加只读边界。 */ item=>item.uuid===reverse.graphAssetUuid)
  const reversePath=reverseRecord.path;reverseRecord.path='.nova/readonly/reverse.nova-graph'
  rejectsUnchanged('Reverse conversion into protected graph restores source metadata and generation',/** 执行指定失败场景并检查完整回滚。 */ ()=>sync.commitLinkedScriptAsset(raw.uuid,'fn start(){print(6);}',metadata),/protected/)
  reverseRecord.path=reversePath
  rejectsUnchanged('Reverse source with conflicting graph marker rejects before graph overwrite',/** 执行指定失败场景并检查完整回滚。 */ ()=>sync.commitLinkedScriptAsset(raw.uuid,sync.GRAPH_LINK_PREFIX+crypto.randomUUID()+'\nfn start(){}'),/conflicting/)
  const secondReverse=sync.commitLinkedScriptAsset(raw.uuid,'fn start(){print(7);}',metadata)
  assert.equal(secondReverse.created,false);assert.equal(secondReverse.graphAssetUuid,reverse.graphAssetUuid)
  assert.equal(assets.readTextAsset(raw.uuid),'fn start(){print(7);}')
  checks.push({name:'Repeated reverse save retains the exact graph resource identity',status:'passed'})
  const readOnly=assets.createTextAsset('Read only','script','fn start(){}');readOnly.path='.nova/protected/unlinked.rhai'
  rejectsUnchanged('Mode conversion of a protected unlinked script creates no graph',/** 模拟只读脚本直接切换到可视编辑。 */ ()=>sync.ensureLinkedGraphForScript(readOnly.uuid,'fn start(){}'),/protected/)
  raw.path='.nova/protected/linked.rhai'
  rejectsUnchanged('Mode conversion of a protected linked script changes no graph',/** 模拟已有伙伴的只读脚本切换。 */ ()=>sync.ensureLinkedGraphForScript(raw.uuid,'fn start(){print(8);}'),/protected/)
  await mkdir('release-audits',{recursive:true});await writeFile('release-audits/v26.24-linked-save.json',JSON.stringify({format:'nova-v26.24-linked-save',version:1,release:'26.24',engineVersion:JSON.parse(await readFile('package.json','utf8')).version,generatedAt:new Date().toISOString(),status:'passed',checks})+'\n')
  console.log(JSON.stringify({status:'passed',checks:checks.length}))
}finally{await rm(temporary,{recursive:true,force:true})}
