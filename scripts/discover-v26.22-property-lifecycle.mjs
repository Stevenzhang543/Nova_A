import {linkDeclarationEvidence22,linkSceneOwnerEvidence22} from './lib/declarationEvidence22.mjs'
import ts from 'typescript'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
const families={
 components:['src/world/components.ts'],
 entity:['src/world/Entity.ts','src/world/Transform.ts','src/world/Connection.ts'],
 scene:['src/world/SceneManager.ts','src/editor/sceneAuthoring.ts'],
 material:['src/renderer/materials.ts','src/renderer/materialGraph.ts'],
 input:['src/runtime/input.ts','src/runtime/deviceInput.ts'],
 animation:['src/runtime/animation.ts','src/runtime/animationProduction.ts','src/runtime/timeline.ts'],
 ui:['src/runtime/uiAccessibility.ts','src/runtime/uiTextLayout.ts'],
 scripts:['src/runtime/scriptSettings.ts','src/runtime/eventSheets.ts','src/runtime/objectBlueprints.ts'],
 packages:['src/runtime/packages.ts','src/runtime/plugins.ts'],
 build:['src/runtime/buildSettings.ts'],
 project:['src/projects/projectManifest.ts','src/projects/projectData.ts'],
 rendering:['src/renderer/renderSettings.ts']
}
const discovery=JSON.parse(await readFile('release-audits/v26.22-component-corpus.json','utf8')),probes=new Map(discovery.inventory.map(row=>[row.component+'.'+row.field,row]))
const componentHistory=JSON.parse(await readFile('release-audits/v26.22-component-history.json','utf8'));if(componentHistory.status!=='passed')throw Error('Component history evidence must pass');const historyByCase=new Map(componentHistory.cases.map(row=>[row.index,row]));
const rows=[],sources=[]
function componentLifecycle(probe){
 if(!probe)return{}
 const excluded=probe.disposition?.startsWith('runtime/derived exclusion:')
 const history=probe.cases?.length&&probe.cases.every(index=>historyByCase.get(index)?.status==='passed')?'release-audits/v26.22-component-history.json named transaction/whole-component Undo/field Redo cases '+probe.cases.join(', '):probe.cases?.length&&probe.cases.every(index=>historyByCase.get(index)?.disposition)?'Constructor identity replacement excluded from in-place property editing; creation/hydration retained in canonical corpus':probe.history;
 const verified=probe.cases?.length>0&&probe.cases.every(index=>discovery.cases[index]?.status==='passed')
 return excluded?{history:'Not authored: '+probe.disposition,persistence:'Excluded from authored data: '+probe.disposition,export:'Recreated runtime/derived value: '+probe.disposition}:{history,
  ...(verified?{persistence:probe.persistenceOwner+'; canonical component corpus cases '+probe.cases.join(', '),export:'release-audits/v26.22-component-corpus.json aggregate: whole-project WASM + deterministic NovaPak retention; runtime semantics separately pending'}:{})
 }
}
for(const [family,paths] of Object.entries(families))for(const path of paths){
 const text=await readFile(path,'utf8'),source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true)
 const owners=source.statements.filter(ts.isFunctionDeclaration).filter(n=>n.name).map(n=>n.name.text)
 sources.push({family,path,functions:owners})
 for(const declaration of source.statements){
  const members=ts.isClassDeclaration(declaration)||ts.isInterfaceDeclaration(declaration)?declaration.members:ts.isTypeAliasDeclaration(declaration)&&ts.isTypeLiteralNode(declaration.type)?declaration.type.members:null
  if(!members||!declaration.name)continue
  for(const member of members){
   if(!ts.isPropertyDeclaration(member)&&!ts.isPropertySignature(member)&&!ts.isGetAccessorDeclaration(member))continue
   const name=declaration.name.text,field=member.name.getText(source),probe=path==='src/world/components.ts'?probes.get(name+'.'+field):null
   rows.push({id:path+'#'+name+'.'+field,family,source:path,line:source.getLineAndCharacterOfPosition(member.getStart(source)).line+1,declaration:name,field,type:member.type?.getText(source)||'inferred',visibility:member.modifiers?.some(m=>m.kind===ts.SyntaxKind.PrivateKeyword)?'private':'public',readOnly:!!member.modifiers?.some(m=>m.kind===ts.SyntaxKind.ReadonlyKeyword),declarationKind:ts.isGetAccessorDeclaration(member)?'accessor':ts.isInterfaceDeclaration(declaration)?'interface field':'stored declaration',disposition:probe?.disposition||'requires explicit authored/runtime/derived/transport classification',lifecycle:{validation:'pending named constraint/owner audit',mutation:probe?.owner||'pending named mutation owner',history:probe?.history||'pending transaction or explicit exclusion',persistence:probe?.persistenceOwner||'pending serializer/hydrator or explicit exclusion',runtime:'pending effect test or named unsupported disposition',export:'pending export assertion or explicit exclusion',...componentLifecycle(probe)},developmentProbeCases:probe?.cases||[]})
  }
 }
}
for(const probe of discovery.inventory){
 const id=probe.source+'#'+probe.component+'.'+probe.field
 if(rows.some(row=>row.id===id))continue
 rows.push({id,family:'components',source:probe.source,line:probe.line,declaration:probe.component,field:probe.field,type:probe.type,disposition:probe.disposition,lifecycle:{validation:'pending full constraint/owner audit',mutation:probe.owner,history:probe.history,runtime:'pending effect test or named unsupported disposition',...componentLifecycle(probe)},developmentProbeCases:probe.cases||[]})
}
for(const [family,file] of [['reference','release-audits/v26.22-reference-ownership.json'],['nested-component','release-audits/v26.22-nested-component-corpus.json'],['connection','release-audits/v26.22-connection-corpus.json'],['package-contract','release-audits/v26.22-package-lifecycle.json'],['manifest','release-audits/v26.22-manifest-corpus.json'],['settings','release-audits/v26.22-settings-corpus.json'],['material','release-audits/v26.22-material-corpus.json'],['metadata','release-audits/v26.22-metadata-corpus.json'],['script-assets','release-audits/v26.22-script-assets-corpus.json'],['ui-theme','release-audits/v26.22-ui-theme-corpus.json'],['asset-import','release-audits/v26.22-asset-import-corpus.json']]){
 const report=JSON.parse(await readFile(file,'utf8'));if(report.status!=='passed')throw Error('Unpassed field evidence '+file)
 for(const field of report.inventory){const indexes=field.cases||[],passed=indexes.length&&indexes.every(index=>['retained','passed'].includes(report.cases[index]?.status));rows.push({id:family+'#'+field.id,family,source:field.source||({'package-contract':'src/runtime/packages.ts',metadata:'src/store/physics.ts','script-assets':field.id.startsWith('EventSheet.')?'src/runtime/eventSheets.ts':'src/runtime/objectBlueprints.ts','ui-theme':'src/runtime/uiTheme.ts',material:'src/renderer/materials.ts','asset-import':'src/assets/types.ts'})[family],field:field.id,disposition:field.disposition||'Authored asset/settings field; individual remaining lifecycle stages are pending',lifecycle:{mutation:field.owner,validation:'Canonical accepted-value cases; full UI/API rejection-domain audit pending',history:field.history||(passed&&['reference','package-contract','nested-component','connection','manifest','material','metadata','script-assets','ui-theme','asset-import'].includes(family)?file+' named transaction/Undo/Redo cases '+indexes.join(', '):'pending named transaction interaction'),persistence:passed?file+' cases '+indexes.join(', '):field.disposition,export:passed?file+' per-case native/WASM and NovaPak reopen':field.disposition,runtime:field.runtime||'pending effect test or named exclusion'},developmentProbeCases:indexes})}
}
const media=JSON.parse(await readFile('reports/v26.22-media-field-lifecycle.json','utf8'));for(const row of media.rows)rows.push({...row,id:'media#'+row.id,family:'media'});
const exclusions=JSON.parse(await readFile('scripts/fixtures/v26.22-derived-field-dispositions.json','utf8'));for(const entry of exclusions){const row=rows.find(row=>row.id===entry.id);if(!row)throw Error('Stale reviewed field exclusion '+entry.id);if(typeof entry.reason!=='string'||entry.reason.length<15)throw Error('Missing reviewed field reason '+entry.id);if(row.source!==entry.source||row.field!==entry.field)throw Error('Changed reviewed field exclusion '+entry.id);row.disposition=entry.disposition+': '+entry.reason;row.lifecycle={validation:'Not a project-authored input: '+entry.reason,mutation:entry.source+' runtime/derived owner; authored resource identified in disposition',history:'Excluded from document property Undo: '+entry.reason,persistence:'No independent authored persistence contract: '+entry.reason,runtime:'Runtime/derived state is exercised by its owning feature; this classification is not an effect-test pass.',export:'No independent authored export contract: '+entry.reason}}
const primitivePath='release-audits/v26.22-component-primitives.json',primitiveReport=JSON.parse(await readFile(primitivePath,'utf8'));
if(primitiveReport.status!=='passed')throw Error('Unpassed primitive validation evidence');
const primitiveFields=new Map();
for(const field of primitiveReport.inventory){for(const index of field.checks)if(primitiveReport.checks[index]?.status!=='passed')throw Error('Unpassed primitive field case');const id=field.component+'.'+field.field,list=primitiveFields.get(id)||[];list.push({kind:field.kind,types:field.types,checks:field.checks});primitiveFields.set(id,list)}
let primitiveValidationLinks=0;
for(const row of rows){const matches=row.family==='components'?primitiveFields.get(row.declaration+'.'+row.field):null;if(matches){row.primitiveValidationEvidence={report:primitivePath,contracts:matches,scope:'Actual component paste rejects mismatched primitives and nonfinite numbers before assignment. Nullable and undefined patch semantics are checked. Structured fields and UI/runtime completeness are not implied.'};row.lifecycle.validation=primitivePath+' '+matches.map(match=>match.kind+' checks '+match.checks.join(', ')).join('; ')+'; '+row.primitiveValidationEvidence.scope;primitiveValidationLinks++}}
const entityPath='release-audits/v26.22-entity-api.json',entityReport=JSON.parse(await readFile(entityPath,'utf8'));
if(entityReport.status!=='passed'||!entityReport.aliases?.length)throw Error('Missing passing Entity alias inventory');
let entityAliasLinks=0;
for(const alias of entityReport.aliases){
 const row=rows.find(row=>row.id==='src/world/Entity.ts#Entity.'+alias.field),owner=rows.find(row=>row.id==='src/world/components.ts#'+alias.canonicalDeclaration+'.'+alias.canonicalField.split('.')[0]);
 if(!row||!owner||!alias.checks.length||!alias.checks.every(name=>entityReport.checks.some(check=>check.name===name&&check.status==='passed'&&check.covers.includes(row.id))))throw Error('Invalid Entity ownership evidence '+alias.field);
 row.entityAliasEvidence={report:entityPath,checks:alias.checks,owner:owner.id,path:alias.path,scope:'Exact forwarding and serializer/hydrator behavior executed on a real BoxEntity. Nested material fields link their container owner; other collider variants, history, export and runtime semantics retain their independent requirements.'};
 row.lifecycle.validation=entityPath+' cases '+alias.checks.join(' / ')+'; exact forwarding-setter input assertions, canonical owner constraints remain separate';
 row.lifecycle.mutation='Entity.'+alias.field+' forwards to '+alias.path+'; named actual setter cases in '+entityPath;
 row.lifecycle.persistence=entityPath+' exact setter/serializer/hydrator equality; canonical owner '+owner.id;
 if(row.disposition==='requires explicit authored/runtime/derived/transport classification')row.disposition='Authored Entity forwarding alias; canonical owner and tested cases in entityAliasEvidence. Remaining lifecycle stages retain separate requirements.';
 entityAliasLinks++;
}
const eventPath='release-audits/v26.22-event-validation.json',eventReport=JSON.parse(await readFile(eventPath,'utf8'));
if(eventReport.status!=='passed')throw Error('Unpassed event field validation');
let eventValidationLinks=0;
for(const field of ['priority','deterministicSeed','kind','callback']){
 const ids=field==='deterministicSeed'?['src/runtime/eventSheets.ts#EventSheetDocument.deterministicSeed','script-assets#EventSheet.deterministicSeed']:['src/runtime/eventSheets.ts#ObjectEventHandler.'+field,'script-assets#EventSheet.handlers.0.'+field],checks=eventReport.checks.filter(check=>check.field===field);
 if(!checks.length||checks.some(check=>check.status!=='passed'))throw Error('Missing event rejection cases '+field);
 for(const id of ids){const row=rows.find(row=>row.id===id);if(!row)throw Error('Missing event field '+id);row.eventValidationEvidence={report:eventPath,cases:checks.map(check=>check.name),scope:'Authored Save rejects these named input domains before changing whole-project bytes or asset generation. Legacy parse, UI and runtime effect contracts remain separate.'};row.lifecycle.validation=eventPath+' '+checks.map(check=>check.name).join(' / ')+'; '+row.eventValidationEvidence.scope;eventValidationLinks++;}
}
let constructorIdentityLinks=0;
for(const row of rows.filter(row=>row.family==='components'&&row.field==='kind'&&row.readOnly&&!['Component2D','ComponentBase'].includes(row.declaration))){
 const cases=discovery.cases.flatMap((check,index)=>check.component===row.declaration&&check.status==='passed'?[index]:[]);if(!cases.length)throw Error('Missing constructor corpus '+row.id);
 row.constructorIdentityEvidence={report:'release-audits/v26.22-component-corpus.json',cases,scope:'Concrete constructor envelope retained while these component fields are tested. The kind itself is fixed, not an in-place editable property.'};
 row.lifecycle.validation='Readonly component implementation tag assigned by '+row.declaration+' constructor; in-place kind edits are outside its property API';
 row.lifecycle.history='Explicit exclusion: changing component kind is component replacement via Entity.addComponent/removeComponent, not editing this readonly tag';
 row.lifecycle.persistence='serializeEntity/createEntityFromData constructor envelope in component corpus cases '+cases.join(', ');
 row.lifecycle.export='Canonical component corpus whole-project native/NovaPak envelope retention; readonly kind is not independently mutated';
 row.lifecycle.runtime='Implementation identity selects the concrete component family; independent executable-family effect checks apply';constructorIdentityLinks++;
}
const declarationEvidence=linkDeclarationEvidence22(rows,entityReport);
const sceneOwnerReports=Object.fromEntries(await Promise.all(['scene-ownership','script-assets-corpus','component-order'].map(async name=>[name,JSON.parse(await readFile('release-audits/v26.22-'+name+'.json','utf8'))])));
declarationEvidence.sceneOwners=linkSceneOwnerEvidence22(rows,sceneOwnerReports);
let fixedVectorLinks=0;
for(const row of rows){const links=row.canonicalEvidence?.links;if(row.type!=='Vec2'||links?.length!==2)continue;const base=links[0].id.slice(0,-1);if(!links.every(link=>link.id.startsWith(base))||new Set(links.map(link=>link.id.slice(-1))).size!==2||!links.every(link=>['x','y'].includes(link.id.slice(-1))))continue;
 row.disposition='Fixed X/Y coordinate record; both named child lifecycles are linked. List insertion/removal/reordering is not an operation on Vec2.';
 for(const key of ['mutation','validation','history','persistence','export'])row.lifecycle[key]='Fixed coordinate owners: '+links.map(link=>link.id+' — '+link.lifecycle[key]).join(' / ');
 row.canonicalEvidence.scope='Complete fixed X/Y shape, each coordinate retains its own evidence and limitations; simultaneous edits and runtime behavior are not inferred.';fixedVectorLinks++;
}

// Preserve evidence limits while following canonical ownership; no pending cell becomes a pass.
let canonicalStageLinks=0;
for(const row of rows){
 const links=row.canonicalEvidence?.links||[],aliasOwner=row.entityAliasEvidence&&rows.find(candidate=>candidate.id===row.entityAliasEvidence.owner),owners=aliasOwner?[aliasOwner]:links.map(link=>rows.find(candidate=>candidate.id===link.id)).filter(Boolean);
 if(!owners.length)continue;
 for(const stage of ['validation','history','persistence','export']){
  if(row.lifecycle[stage]&&!String(row.lifecycle[stage]).startsWith('pending'))continue;
  if(!owners.every(owner=>owner.lifecycle[stage]&&!String(owner.lifecycle[stage]).startsWith('pending')))continue;
  row.lifecycle[stage]=(row.disposition.startsWith('Authored container')?'Populated child-field evidence only; arbitrary structural variants are not qualified. ':'Canonical owner evidence; no additional independent execution. ')+owners.map(owner=>owner.id+' ['+stage+']').join(' / ');canonicalStageLinks++;
 }
}
const reviewStages=['mutation','validation','history','persistence','export','runtime'];
for(const row of rows){
 if(!row.disposition||row.disposition.startsWith('requires ')||!row.lifecycle.mutation||String(row.lifecycle.mutation).startsWith('pending'))throw Error('Unclassified field '+row.id);
 row.review={field:row.id,classification:row.disposition,owner:row.lifecycle.mutation,stages:Object.fromEntries(reviewStages.map(stage=>[stage,{evidence:row.lifecycle[stage]||'No independent '+stage+' evidence attached',status:!row.lifecycle[stage]||/pending|unqualified/i.test(typeof row.lifecycle[stage]==='string'?row.lifecycle[stage]:JSON.stringify(row.lifecycle[stage]))?'explicit evidence limit':'scoped evidence or exclusion'}])),runtimeScope:'Observable effects are reviewed by named executable family in reports/v26.22-runtime-family-evidence.json; stored-value equality alone is not a runtime pass. Unsupported effects remain in docs/GAP_REGISTER_26_22.md'};
}
const fieldReview={namedFields:rows.length,unclassified:0,canonicalStageLinks,evidenceLimits:Object.fromEntries(reviewStages.map(stage=>[stage,rows.filter(row=>row.review.stages[stage].status==='explicit evidence limit').length])),meaning:'Every enumerated declaration/leaf has a named disposition. Stage limits and structural/input-domain gaps remain explicit; this is not a universal field/runtime pass.'};
await mkdir('reports',{recursive:true});await writeFile('reports/v26.22-property-lifecycle-matrix.json',JSON.stringify({release:'26.22',development:true,status:'reviewed-with-explicit-limits',fieldReview,constructorIdentityLinks,fixedVectorLinks,declarationEvidence,primitiveValidationLinks,entityAliasLinks,eventValidationLinks,scope:'Named lifecycle dispositions for enumerated persistent model families. Canonical owner and executable-family evidence retain explicit domain/structural limits; no global correctness or every-input pass is inferred.',sources,rows},null,2)+'\n')
console.log(JSON.stringify({declarations:rows.length,constructorIdentityLinks,fixedVectorLinks,declarationEvidence,primitiveValidationLinks,entityAliasLinks,eventValidationLinks,families:Object.fromEntries(Object.keys(families).map(family=>[family,rows.filter(r=>r.family===family).length]))}))
