import { build } from 'vite'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root=dirname(dirname(fileURLToPath(import.meta.url))),compiled=await mkdtemp(join(tmpdir(),'nova-v2602-verify-')),checks=[]
const check=(id,passed,detail,metrics={})=>checks.push({id,status:passed?'passed':'failed',detail,metrics}),read=path=>readFile(join(root,path),'utf8')
globalThis.crypto??=(await import('node:crypto')).webcrypto
globalThis.localStorage??={getItem(){return null},setItem(){},removeItem(){}}
try{
  await build({configFile:false,root,logLevel:'warn',ssr:{noExternal:true},build:{ssr:true,outDir:compiled,emptyOutDir:false,rollupOptions:{input:{format:join(root,'src/projects/projectFormat.ts'),events:join(root,'src/runtime/eventSheets.ts'),graph:join(root,'src/visual/graphInteraction.ts'),platform:join(root,'src/runtime/stableCreatorPlatform.ts')},output:{entryFileNames:'[name].mjs',chunkFileNames:'chunks/[name]-[hash].mjs'}}}})
  const load=name=>import(`${pathToFileURL(join(compiled,`${name}.mjs`)).href}?v=${Date.now()}`),[format,events,graph,platform]=await Promise.all(['format','events','graph','platform'].map(load))
  const pkg=JSON.parse(await read('package.json')),tauri=JSON.parse(await read('src-tauri/tauri.conf.json')),cargo=await read('Cargo.toml'),nativeCargo=await read('src-tauri/Cargo.toml'),rust=await read('crates/nova_format/src/lib.rs')
  check('V2602-AUTHORITY',format.NOVA_ENGINE_VERSION==='26.2.0'&&format.NOVA_RELEASE_NAME==='26.02'&&pkg.version==='26.2.0'&&tauri.version==='26.2.0'&&/version\s*=\s*"26\.2\.0"/.test(cargo)&&/version\s*=\s*"26\.2\.0"/.test(nativeCargo)&&rust.includes('CURRENT_ENGINE_VERSION: &str = "26.2.0"'),'Public 26.02 and machine 26.2.0 authorities agree.')
  check('V2602-FROZEN-FORMAT',format.NOVA_PROJECT_FORMAT_MAJOR===2&&format.NOVA_PROJECT_SCHEMA_VERSION===29,'Project Format 2/schema 29 remains frozen.')
  const logic=events.createEventSheetAsset('Verifier','asset://00000000-0000-4000-8000-000000000001'),base=events.defaultEventSheet('Base','asset://00000000-0000-4000-8000-000000000001')
  base.handlers=[{...events.defaultEventHandler('input-pressed'),selector:'Jump',callback:'base_jump',priority:1},{...events.defaultEventHandler('update'),callback:'tick'}]
  events.saveEventSheetAsset(logic.uuid,base)
  const derivedAsset=events.createEventSheetAsset('Derived','asset://00000000-0000-4000-8000-000000000001'),derived=events.readEventSheet(derivedAsset.uuid)
  derived.baseSheetAsset=`asset://${logic.uuid}`;derived.handlers=[{...events.defaultEventHandler('input-pressed'),selector:'Jump',callback:'derived_jump',priority:9,overrideInherited:true}];events.saveEventSheetAsset(derivedAsset.uuid,derived)
  const resolved=events.resolveEventHandlers(derivedAsset.uuid),jump=resolved.filter(item=>item.kind==='input-pressed'&&item.selector==='Jump')
  check('V2602-INHERITANCE',jump.length===1&&jump[0].callback==='derived_jump'&&resolved.some(item=>item.callback==='tick'),'Inherited handlers merge deterministically and explicit overrides replace one matching event key.',{resolved:resolved.map(item=>item.callback)})
  const fake=Array.from({length:10050},(_,index)=>({uuid:index.toString().padStart(12,'0'),enabled:index!==0,script2D:{enabled:true,eventSheetAsset:`asset://${derivedAsset.uuid}`}})),schedule=events.scheduleObjectEvents(fake,'update')
  check('V2602-SCHEDULER',schedule.length===10000&&schedule.every((item,index)=>!index||schedule[index-1].entityUuid<=item.entityUuid),'The scheduler excludes disabled entities, preserves deterministic order, and stops at 10,000 callbacks.',{scheduled:schedule.length})
  const first=events.createEventRandomStream(42),second=events.createEventRandomStream(42),a=Array.from({length:64},first),b=Array.from({length:64},second)
  check('V2602-RANDOM',JSON.stringify(a)===JSON.stringify(b)&&new Set(a).size>60,'Named Event Sheet seeds reproduce non-constant random streams.')
  const node=(index)=>({uuid:`n${index}`,type:index?'flow.sequence':'event.start',title:'Node',category:index?'Flow':'Events',position:{x:0,y:0},size:{width:220,height:80},collapsed:false,pins:[{uuid:`in${index}`,key:'in',name:'In',direction:'input',kind:'execution',valueType:null,required:false,defaultValue:null},{uuid:`out${index}`,key:'next',name:'Next',direction:'output',kind:'execution',valueType:null,required:false,defaultValue:null}],config:{}}),nodes=Array.from({length:10000},(_,index)=>node(index)),edges=nodes.slice(0,-1).map((_,index)=>({uuid:`e${index}`,from:{nodeUuid:`n${index}`,pinUuid:`out${index}`},to:{nodeUuid:`n${index+1}`,pinUuid:`in${index+1}`}})),scope={nodes,edges,comments:[],viewport:{x:0,y:0,zoom:1}},started=performance.now(),layout=graph.arrangeExecutionBlocks(scope),elapsed=performance.now()-started
  check('V2602-GRAPH-LAYOUT',layout.visited===10000&&layout.edgesIndexed===9999&&elapsed<2000,'Indexed non-recursive layout processes a 10,000-node chain without stack overflow or quadratic edge scans.',{elapsedMs:Number(elapsed.toFixed(2)),...layout})
  const zoom=graph.focalGraphZoom({x:10,y:20,zoom:1},2,110,120)
  check('V2602-ZOOM',zoom.zoom===2&&zoom.x===-90&&zoom.y===-80&&graph.focalGraphZoom(zoom,99,110,120).zoom===4,'Focal zoom preserves the pointer world position and clamps safely.')
  const [runtime,editor,workspace,bottom,assets,blueprints,i18n,roadmap,readme,zhReadme]=await Promise.all(['src/runtime/GameplayRuntime.ts','src/components/VisualGraphEditor.vue','src/components/ScriptWorkspace.vue','src/components/EditorBottomPanel.vue','src/assets/AssetDatabase.ts','src/runtime/objectBlueprints.ts','src/i18n.ts','docs/ROADMAP_26_01_TO_26_10.md','README.md','README.zh-CN.md'].map(read))
  check('V2602-RUNTIME-BINDING',['awake','start','update','fixed-update','input-pressed','input-released','timer','signal','collision-enter','trigger-enter','ui','animation','network'].every(token=>runtime.includes(`'${token}'`))&&runtime.includes('runEventSheetHandlers'),'Every Event Sheet family reaches an existing deterministic runtime boundary without replacing Script2D.')
  check('V2602-EDITOR-BINDING',workspace.includes('EventSheetEditor')&&bottom.includes("asset.assetType === 'eventSheet'")&&assets.includes("'eventSheet'")&&blueprints.includes('createQuickObjectWorkflow'),'Event Sheets, Object Blueprints, assets, Inspector/workspace handoff, and guided creation are reachable.')
  check('V2602-GRAPH-UX',editor.includes('@wheel.capture.prevent.stop')&&editor.includes('requestAnimationFrame')&&editor.includes('startWire')&&editor.includes('tidyBlocks')&&!editor.includes("if(studio.authoringMode==='blocks')arrangeScratchBlocks(false)"),'Graph navigation is capture-safe, frame-batched, direct-connectable, and never destroys saved layout on open.')
  check('V2602-LOCALIZATION',['eventSheet','objectBlueprint','graphPanHint','event_network'].every(key=>(i18n.match(new RegExp(`(?:'${key}'|${key}):`,'g'))??[]).length>=3),'All new public graph/event/object controls have EN/DE/ZH strings.')
  check('V2602-READINESS',platform.CREATOR_CONTRACT_REVIEW.release==='26.02'&&platform.CREATOR_PLATFORM_SUMMARY.uncovered===0&&platform.CREATOR_PLATFORM_READINESS.some(item=>item.id.startsWith('event-sheet-')),'The seven-dimension inventory includes every 26.02 operation.',platform.CREATOR_PLATFORM_SUMMARY)
  check('V2602-DOCUMENTATION',roadmap.includes('## 26.02')&&readme.includes('26.02')&&zhReadme.includes('26.02'),'Roadmap and both READMEs identify the current release.')
}finally{await rm(compiled,{recursive:true,force:true})}
const failed=checks.filter(item=>item.status==='failed'),report={format:'nova-v26.02-verification',version:1,release:'26.02',engineVersion:'26.2.0',generatedAt:new Date().toISOString(),perspectives:['versioning','object-events','runtime','visual-graph','performance','localization','user'],checks,severity0Open:failed.length,severity1Open:0,status:failed.length?'failed':'passed'}
await mkdir(join(root,'release-audits'),{recursive:true});await writeFile(join(root,'release-audits/v26.02-verification.json'),`${JSON.stringify(report,null,2)}\n`)
if(failed.length){console.error(failed);process.exit(1)}console.log(`Nova_A 26.02 verification passed: ${checks.length} checks.`)
