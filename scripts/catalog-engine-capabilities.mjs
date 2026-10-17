/** Current authored catalogs, explicitly separated from executed verification evidence. */
import fs from 'node:fs'
import {openMediaAuditModules} from './lib/mediaAudit16.mjs'
const o=await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{physics:'store/physics',components:'world/componentRegistry',primitives:'world/componentPrimitiveTypes',graph:'visual/graphCatalog',platform:'runtime/stableCreatorPlatform'})
try{
 const {components:{STABLE_COMPONENTS:components},primitives:{componentPrimitiveTypes:primitives},graph:{GRAPH_NODE_CATALOG:graph},platform:{CREATOR_PLATFORM_READINESS:operations}}=o.modules
 const api=JSON.parse(fs.readFileSync('docs/RHAI_API_V2_MANIFEST.json','utf8')).entries
 const cell=x=>String(x??'').replaceAll('|','\\|').replaceAll('\n',' ')
 const engineVersion=JSON.parse(fs.readFileSync('package.json','utf8')).version
 const lines=[`# Nova_A current capability catalog — ${engineVersion}`,'',`Source declares ${operations.length} editor operations, ${components.length} registered kinds (including the Rope2D scene connection), ${api.length} Rhai API entries and ${graph.length} graph definitions. Primitive contracts describe ${Object.keys(primitives).length} component kinds. Transform2D and scene connections have separate persistence owners.`, '', 'Generated declarations describe intended functionality and ownership. They are not passing tests, full semantic review or proof that every edit reaches runtime/export. Executed evidence and limits are in FEATURE_MATRIX.md and TEST_MATRIX.md.','', '## Components and serialized primitive fields','','| Kind | Family | Behavior | Primitive fields |','|---|---|---|---|']
 for(const c of components)lines.push(`| ${c.kind} | ${c.category} | ${cell(c.summary)} | ${cell(Object.keys(primitives[c.kind]||{}).join(', '))} |`)
 lines.push('','## Editor operations and integration owners','','| Operation | Workspace / panel | Behavior | Binding | Validation | Undo | Persistence | Runtime/export |','|---|---|---|---|---|---|---|---|')
 for(const c of operations)lines.push(`| ${c.id} | ${cell(c.workspace)} / ${cell(c.panel)} | ${cell(c.feature)} | ${['binding','validation','undo','persistence','runtimeExport'].map(k=>cell(c.dimensions[k].source)).join(' | ')} |`)
 lines.push('','## Rhai APIs','','| Signature | Behavior |','|---|---|')
 for(const c of api)lines.push(`| ${cell(c.signature)} | ${cell(c.detail)} |`)
 lines.push('','## Graph definitions','','| Type | Family | Behavior |','|---|---|---|')
 for(const c of graph)lines.push(`| ${cell(c.type)} | ${cell(c.category)} | ${cell(c.description)} |`)
 fs.writeFileSync('docs/engine/CAPABILITY_CATALOG.md',lines.join('\n')+'\n')
 console.log(JSON.stringify({operations:operations.length,registeredKinds:components.length,primitiveKinds:Object.keys(primitives).length,rhai:api.length,graph:graph.length}))
}finally{await o.close()}
