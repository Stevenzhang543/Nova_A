import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const excluded = new Set(['.git','dist','node_modules','releases','target'])
async function graphFiles(directory) {
  const output = []
  for (const entry of await readdir(directory,{withFileTypes:true})) {
    if (entry.isDirectory() && !excluded.has(entry.name)) output.push(...await graphFiles(join(directory,entry.name)))
    else if (entry.isFile() && entry.name.endsWith('.nova-graph')) output.push(join(directory,entry.name))
  }
  return output
}
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{platform:'Win32',hardwareConcurrency:8,userAgent:'Nova_A v5.3 graph verifier',mediaDevices:{addEventListener(){},removeEventListener(){},async enumerateDevices(){return[]}}}})
globalThis.window ??= {setTimeout,clearTimeout,setInterval,clearInterval,addEventListener(){},removeEventListener(){},dispatchEvent(){}}
globalThis.localStorage ??= {getItem(){return null},setItem(){},removeItem(){}}
const server=await createServer({root,appType:'custom',logLevel:'silent',server:{middlewareMode:true}});await server.watcher.close()
const checks=[]
const check=(id,passed,detail,metrics={})=>{checks.push({id,status:passed?'passed':'failed',detail,metrics});if(!passed)console.error(`${id}: ${detail}`)}
try {
  const types=await server.ssrLoadModule('/src/visual/graphTypes.ts')
  const catalog=await server.ssrLoadModule('/src/visual/graphCatalog.ts')
  const compiler=await server.ssrLoadModule('/src/visual/graphCompiler.ts')
  const production=await server.ssrLoadModule('/src/visual/graphProduction.ts')
  const debuggerModule=await server.ssrLoadModule('/src/visual/graphDebugger.ts')
  const language=await server.ssrLoadModule('/src/editor/scriptLanguage.ts')
  const packages=await server.ssrLoadModule('/src/runtime/packages.ts')
  const paths=(await graphFiles(root)).sort(),assets=[]
  for(const path of paths){const id=relative(root,path).replaceAll('\\','/'),source=await readFile(path,'utf8');try{const graph=types.parseGraphDocument(source),canonical=types.serializeGraphDocument(graph),roundTrip=types.serializeGraphDocument(types.parseGraphDocument(canonical)),compiled=compiler.compileGraphSource(canonical),scriptErrors=compiled.valid?language.analyzeScript(compiled.source,2).diagnostics.filter(item=>item.severity==='error'):[];assets.push({id,status:canonical===roundTrip&&compiled.valid&&!scriptErrors.length?'passed':'failed',nodes:compiled.nodeCount,edges:compiled.edgeCount,routines:graph.routines.length,diagnostics:compiled.diagnostics,scriptErrors})}catch(error){assets.push({id,status:'failed',error:error instanceof Error?error.message:String(error)})}}
  check('V530-GRAPH-ASSETS',assets.length>=7&&assets.every(item=>item.status==='passed'),'Every repository graph parses, canonically round-trips, compiles and passes static Rhai API-v2 analysis.',{count:assets.length,failed:assets.filter(item=>item.status!=='passed')})

  const fixtureRoot=join(root,'reference-projects/projects/visual-scripting-v53-production'),source=await readFile(join(fixtureRoot,'ProductionGraph.nova-graph'),'utf8'),graph=types.parseGraphDocument(source),compiled=compiler.compileGraphSource(source)
  check('V530-PRODUCTION-SCOPES',compiled.valid&&graph.routines.map(item=>item.kind).sort().join(',')==='function,macro,subgraph'&&graph.customEvents.length===1&&graph.interfaces.length===1&&graph.routines.flatMap(item=>item.locals).length===1,'Function, macro, subgraph, event, interface and local fixture compiles.',{diagnostics:compiled.diagnostics})
  check('V530-GRAPH-TEXT-PARITY',compiled.source.includes('__nova_graph_trace')&&compiled.source.includes('fn calculate_bonus(__nova_call_depth, score)')&&!language.analyzeScript(compiled.source,2).diagnostics.some(item=>item.severity==='error'),'Generated source is transparent, traced and accepted by the same Rhai API-v2 analyzer.',{mappings:compiled.mappings.length})

  const compatible=await readFile(join(fixtureRoot,'hot-reload-fixtures/compatible.nova-graph'),'utf8'),incompatible=await readFile(join(fixtureRoot,'hot-reload-fixtures/incompatible.nova-graph'),'utf8'),compatiblePlan=production.planGraphHotReload(source,compatible,{bonus_multiplier:7}),incompatiblePlan=production.planGraphHotReload(source,incompatible,{bonus_multiplier:7})
  check('V530-HOT-RELOAD',compatiblePlan.compatible&&compatiblePlan.preserved.bonus_multiplier===7&&!incompatiblePlan.compatible&&incompatiblePlan.reasons.some(reason=>reason.includes('lifetime')),'Hot reload preserves compatible UUID/type/lifetime state and rejects serialized-lifetime changes.',{compatiblePlan,incompatiblePlan})

  const base=await readFile(join(fixtureRoot,'merge-fixtures/base.nova-graph'),'utf8'),ours=await readFile(join(fixtureRoot,'merge-fixtures/ours.nova-graph'),'utf8'),theirs=await readFile(join(fixtureRoot,'merge-fixtures/theirs.nova-graph'),'utf8'),firstMerge=production.mergeGraphs(base,ours,theirs),secondMerge=production.mergeGraphs(base,ours,theirs)
  const deterministicMerge=firstMerge.conflicts.map(item=>({identity:item.identity,path:item.path})),again=secondMerge.conflicts.map(item=>({identity:item.identity,path:item.path}))
  let resolved=firstMerge
  for(const conflict of [...resolved.conflicts])resolved=production.applyGraphConflict(resolved,conflict.id,'theirs')
  const resolvedCompile=compiler.compileGraph(resolved.graph)
  check('V530-MERGE',firstMerge.conflicts.length===1&&JSON.stringify(deterministicMerge)===JSON.stringify(again)&&resolved.conflicts.every(item=>item.resolution==='theirs')&&resolvedCompile.valid,'Semantic three-way merge finds one true identity conflict, remains deterministic and compiles after explicit resolution.',{conflicts:deterministicMerge,changes:firstMerge.changes.length})

  debuggerModule.registerGraphDebugDocument(source)
  const traceFixture=JSON.parse(await readFile(join(fixtureRoot,'debug-trace-fixture.json'),'utf8'))
  const runTrace=()=>{debuggerModule.beginGraphDebugSession();const decisions=traceFixture.commands.map(command=>debuggerModule.recordGraphTrace(command));return{active:debuggerModule.graphDebugState.activeNodeUuid,activeEdge:debuggerModule.graphDebugState.activeEdgeUuid,sequence:debuggerModule.graphDebugState.sequence,coverage:{...debuggerModule.graphDebugState.coverage},calls:Object.fromEntries(Object.entries(debuggerModule.graphDebugState.timings).map(([id,item])=>[id,item.calls])),paused:debuggerModule.graphDebugState.paused,reasons:decisions.map(item=>item.reason)}}
  const traceA=runTrace(),traceB=runTrace()
  check('V530-DEBUGGER',JSON.stringify(traceA)===JSON.stringify(traceB)&&traceA.paused&&traceA.active===traceFixture.expected.breakpointNode&&Object.keys(traceA.coverage).length===traceFixture.expected.coverageNodes,'Ordered trace playback yields deterministic breakpoint, coverage, timing-call and active-wire state.',traceA)

  const manifest=packages.normalizePackageManifest(JSON.parse(await readFile(join(fixtureRoot,'package-node-fixture.json'),'utf8')))
  packages.packageState.installed.push({manifest,source:{kind:'local',location:'fixture',sha256:manifest.sha256},enabled:true,project:true,installedAt:0,securityStatus:'verified',grantedPermissions:[],deprecations:[]})
  const libraryGraph=catalog.defaultVisualGraph('Package graph');libraryGraph.libraries.push({uuid:types.graphUuid(),packageId:manifest.id,libraryId:'visual-nodes',version:manifest.version,enabled:true})
  const packageType=`package.${manifest.id}.comfortable-log`,definition=catalog.graphNodeDefinition(packageType,libraryGraph,null),packageNode=catalog.createGraphNode(packageType,500,300,libraryGraph,null);libraryGraph.nodes.push(packageNode)
  const libraryCompile=compiler.compileGraph(libraryGraph)
  check('V530-PACKAGE-NODES',definition?.api?.callable==='log_info'&&packageNode.pins.some(pin=>pin.key==='message'&&pin.valueType==='String')&&libraryCompile.valid,'Package Manifest 1 visual nodes expose only an exact Rhai API-v2 callable signature and compile through the shared command path.',{type:packageType,diagnostics:libraryCompile.diagnostics})

  const refactorGraph=types.parseGraphDocument(source),variable=refactorGraph.variables[0],beforeUuid=variable.uuid,referencesBefore=production.findGraphReferences(refactorGraph,beforeUuid),referencesAfter=production.renameGraphSymbol(refactorGraph,beforeUuid,'refactored_multiplier')
  const extractTarget=refactorGraph.nodes.find(node=>node.type==='api.log_info'),extracted=extractTarget?production.extractGraphFunction(refactorGraph,new Set([extractTarget.uuid]),'extracted_log'):null,refactorCompile=compiler.compileGraph(refactorGraph)
  check('V530-REFACTOR',variable.uuid===beforeUuid&&referencesBefore.length===referencesAfter.length&&extracted?.kind==='function'&&refactorCompile.valid&&refactorGraph.migrations.some(item=>item.kind==='rename'),'Rename/find references and Extract Function preserve identities and produce a valid graph.',{references:referencesAfter.length,diagnostics:refactorCompile.diagnostics})

  const editor=await readFile(join(root,'src/components/VisualGraphEditor.vue'),'utf8'),panel=await readFile(join(root,'src/components/GraphProductionPanel.vue'),'utf8')
  check('V530-REDUCED-MOTION',editor.includes('@media(prefers-reduced-motion:reduce)')&&editor.includes('.wires path.active')&&panel.includes('@media(prefers-reduced-motion:reduce)'),'Active execution remains visible while animation is removed for reduced-motion users.')
}finally{await Promise.race([server.close(),new Promise(resolve=>setTimeout(resolve,2000))])}
const failed=checks.filter(item=>item.status==='failed'),report={format:'nova-v5.3.0-graph-production-verification',version:1,engineVersion:'5.3.0',generatedAt:new Date().toISOString(),checks,status:failed.length?'failed':'passed'}
await mkdir(join(root,'release-audits'),{recursive:true});await writeFile(join(root,'release-audits/v5.3.0-graph-production.json'),`${JSON.stringify(report,null,2)}\n`)
if(failed.length){console.error(`Nova_A v5.3.0 graph verification failed: ${failed.length}/${checks.length}.`);process.exit(1)}
console.log(`Nova_A v5.3.0 graph verification passed: ${checks.length} production checks.`)
