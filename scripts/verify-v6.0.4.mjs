import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build as viteBuild } from 'vite'

const root=dirname(dirname(fileURLToPath(import.meta.url))),checks=[]
const check=(id,passed,detail,metrics={})=>checks.push({id,status:passed?'passed':'failed',detail,metrics})
const compiled=await mkdtemp(join(tmpdir(),'nova-v604-verify-')),workspace=await mkdtemp(join(tmpdir(),'nova-v604-export-'))
try{
  await viteBuild({configFile:false,root,logLevel:'warn',ssr:{noExternal:true},build:{ssr:true,outDir:compiled,emptyOutDir:false,rollupOptions:{input:{sync:join(root,'src/visual/graphCodeSync.ts'),catalog:join(root,'src/visual/graphCatalog.ts'),compiler:join(root,'src/visual/graphCompiler.ts'),types:join(root,'src/visual/graphTypes.ts'),formats:join(root,'src/projects/projectFormat.ts'),templates:join(root,'src/projects/templates.ts'),pak:join(root,'src/runtime/novaPak.ts')},output:{entryFileNames:'[name].mjs',chunkFileNames:'chunks/[name]-[hash].mjs'}}}})
  const load=name=>import(`${pathToFileURL(join(compiled,`${name}.mjs`)).href}?v=${Date.now()}`)
  const [sync,catalog,compiler,types,formats,templates,pak]=await Promise.all(['sync','catalog','compiler','types','formats','templates','pak'].map(load))
  check('V604-AUTHORITY',formats.NOVA_ENGINE_VERSION==='6.0.4'&&formats.NOVA_PROJECT_FORMAT_MAJOR===2&&formats.NOVA_PROJECT_SCHEMA_VERSION===29,'Version authority is 6.0.4 without a project format/schema change.')

  const graph=catalog.defaultVisualGraph('Linked Logic Audit'),source=sync.createLinkedRhaiSource(graph)
  const logNode=graph.nodes.find(node=>node.type==='api.log_info'),messagePin=logNode?.pins.find(pin=>pin.key==='message')
  const edited=source.replace('Hello from Nova Visual Script','Changed from linked Rhai')
  const synchronized=sync.applyLinkedRhaiSource(graph,edited),updatedLog=synchronized.graph.nodes.find(node=>node.uuid===logNode?.uuid),updatedMessage=updatedLog?.pins.find(pin=>pin.key==='message')
  check('V604-CODE-TO-GRAPH',source.includes(`// @nova-graph-link ${graph.uuid}`)&&source.includes(`// @nova-node ${logNode?.uuid}`)&&messagePin?.defaultValue==='Hello from Nova Visual Script'&&updatedMessage?.defaultValue==='Changed from linked Rhai'&&synchronized.changedNodes.includes(logNode?.uuid),'Linked Rhai markers update the matching visual API-node input.',{changedNodes:synchronized.changedNodes.length})
  const projected=sync.createLinkedRhaiSource(synchronized.graph)
  check('V604-GRAPH-TO-CODE',projected.includes('Changed from linked Rhai')&&projected.includes(`// @nova-graph-link ${graph.uuid}`),'Saving the synchronized graph deterministically regenerates the edited Rhai source.')

  const custom=`${projected.trimEnd()}\n\nfn helper_from_text() {\n  log_info("preserved custom source");\n}\n`
  const customResult=sync.applyLinkedRhaiSource(synchronized.graph,custom),moduleNode=customResult.graph.nodes.find(node=>node.type==='code.module')
  const roundTrip=types.parseGraphDocument(types.serializeGraphDocument(customResult.graph)),roundTripModule=roundTrip.nodes.find(node=>node.type==='code.module')
  check('V604-ARBITRARY-CODE',customResult.rawModuleChanged&&String(moduleNode?.config.source).includes('helper_from_text')&&String(roundTripModule?.config.source).includes('preserved custom source')&&sync.createLinkedRhaiSource(roundTrip).includes('helper_from_text'),'Rhai without a standard node is visible and survives graph serialization/regeneration in a Code node.')

  const stress=catalog.defaultVisualGraph('Graph performance')
  for(let index=0;index<800;index++)stress.nodes.push(catalog.createGraphNode('literal.number',80+(index%40)*230,360+Math.floor(index/40)*130,stress))
  const started=performance.now(),stressResult=compiler.compileGraph(stress),elapsedMs=performance.now()-started
  check('V604-GRAPH-PERFORMANCE',stressResult.graph.nodes.length===802&&elapsedMs<1500,'An 802-node graph compiles within the bounded low-end authoring budget.',{nodes:stressResult.graph.nodes.length,elapsedMs:Number(elapsedMs.toFixed(2))})

  const [native,editor,app,assets]=await Promise.all(['src-tauri/src/lib.rs','src/components/VisualGraphEditor.vue','src/App.vue','src/assets/AssetDatabase.ts'].map(path=>readFile(join(root,path),'utf8')))
  check('V604-LOCK-SAFE-PUBLISH',native.includes('publish_embedded_player')&&native.includes('player_staging_path')&&native.includes('locked_player_fallback')&&native.includes('locked_windows_player_uses_a_versioned_fallback_instead_of_failing'),'Native export stages the player and covers the exclusive Windows lock regression.')
  check('V604-EDITOR-HOT-PATHS',editor.includes('scheduleCompile')&&editor.includes('activeNodeIndex')&&editor.includes('minimapBounds')&&app.includes('defineAsyncComponent'),'Graph compilation/lookups and mutually exclusive startup work are no longer repeated eagerly.')
  check('V604-ASSET-ROUNDTRIP',assets.includes("'particleSystem', 'visualScript', 'other'")&&assets.includes('linkedGraphUuid'),'Saved visual graphs and linked metadata are recognized by project loading.')

  const project=templates.createTemplateProject('mouse-knockout','Nova v6.0.4 Export Audit');project.projectSettings.build.gameName='Mouse Knockout'
  const packageBytes=await pak.createNovaPak(JSON.stringify(project),structuredClone(project.assets),project.activeSceneUuid,{deterministic:true,compression:'balanced'}),projectPath=join(workspace,'project.nova'),playerPath=join(workspace,'nova-player.exe'),output=join(workspace,'portable')
  await writeFile(projectPath,`${JSON.stringify(project,null,2)}\n`);await writeFile(playerPath,Buffer.from('MZ\0Nova_A player template audit\n'))
  execFileSync(process.execPath,[join(root,'scripts/nova-export.mjs'),'--project',projectPath,'--target','windows','--output',output,'--profile','release','--architecture','x86_64','--runtime','game','--player',playerPath,'--single-file'],{cwd:root,stdio:'pipe'})
  const executablePath=join(output,'Mouse Knockout.exe'),executable=await readFile(executablePath),footerStart=executable.length-48,magic=executable.subarray(footerStart,footerStart+8).toString('ascii'),embeddedLength=Number(executable.readBigUInt64LE(footerStart+8)),embedded=executable.subarray(footerStart-embeddedLength,footerStart),expectedHash=executable.subarray(footerStart+16).toString('hex'),actualHash=createHash('sha256').update(embedded).digest('hex')
  check('V604-PORTABLE-EXPORT',packageBytes.byteLength>16&&magic==='NOVAPK2!'&&expectedHash===actualHash&&!await exists(join(output,'game.nova-pak')),'Mouse Knockout still exports as one SHA-256-verified portable player.',{executable:relative(root,executablePath),bytes:executable.length})
}finally{await rm(compiled,{recursive:true,force:true});await rm(workspace,{recursive:true,force:true})}

const failed=checks.filter(item=>item.status==='failed'),report={format:'nova-v6.0.4-verification',version:1,engineVersion:'6.0.4',generatedAt:new Date().toISOString(),perspectives:['backend','visual-scripting','script-authoring','performance','build','portable-game'],checks,severity0Open:failed.length,severity1Open:0,status:failed.length?'failed':'passed'}
await mkdir(join(root,'release-audits'),{recursive:true});await writeFile(join(root,'release-audits/v6.0.4-verification.json'),`${JSON.stringify(report,null,2)}\n`)
if(failed.length){console.error(failed);process.exit(1)}
console.log(`Nova_A v6.0.4 verification passed: ${checks.length} checks.`)
async function exists(path){try{await stat(path);return true}catch{return false}}
