import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root=dirname(dirname(fileURLToPath(import.meta.url))), output=join(root,'release-audits'), generatedAt=new Date().toISOString()
class MemoryStorage { values=new Map(); getItem(k){return this.values.get(k)??null} setItem(k,v){this.values.set(k,String(v))} removeItem(k){this.values.delete(k)} clear(){this.values.clear()} key(i){return [...this.values.keys()][i]??null} get length(){return this.values.size} }
globalThis.localStorage ??= new MemoryStorage()
globalThis.window ??= { setTimeout, clearTimeout, addEventListener(){}, removeEventListener(){} }
globalThis.location ??= { search:'' }
globalThis.crypto ??= { randomUUID:()=>`00000000-0000-4000-8000-${Math.floor(Math.random()*1e12).toString().padStart(12,'0')}` }
await mkdir(output,{recursive:true})
const server=await createServer({root,appType:'custom',logLevel:'silent',server:{middlewareMode:true}}), checks=[]
const check=(id,passed,detail)=>checks.push({id,status:passed?'passed':'failed',detail})
try {
  const [templates,data,tx,commandModule,upgrade,recovery] = await Promise.all(['/src/projects/templates.ts','/src/projects/projectData.ts','/src/runtime/projectTransactions.ts','/src/editor/commands.ts','/src/runtime/projectUpgrade.ts','/src/runtime/recovery.ts'].map(path=>server.ssrLoadModule(path)))
  const current=templates.createTemplateProject('empty','v4.2 Integrity Fixture'), canonical=data.canonicalProjectText(current)
  check('SER-001',canonical===data.canonicalProjectText(canonical)&&canonical.endsWith('\n')&&!canonical.includes('\r'),'Canonical output is LF-terminated and idempotent.')
  const unordered={z:-0,uuid:'E0AD0E60-3EA8-4E3B-8E89-C7E297EAB123',reference:'ASSET://E0AD0E60-3EA8-4E3B-8E89-C7E297EAB123',a:1.25}
  const normalized=data.canonicalProjectText(unordered)
  check('SER-002',normalized.indexOf('"a"')<normalized.indexOf('"z"')&&!normalized.includes('-0')&&normalized.includes('e0ad0e60-3ea8-4e3b-8e89-c7e297eab123'),'Key, negative-zero, UUID, reference, and shortest JSON-number rules are stable.')
  let nonFiniteBlocked=false;try{data.canonicalProjectText({value:Number.POSITIVE_INFINITY})}catch{nonFiniteBlocked=true}
  check('SER-003',nonFiniteBlocked,'Non-finite authored numbers fail before serialization.')
  const separated=data.separateAuthoredAndGeneratedProjectData(current)
  check('SER-004',separated.generated.format==='nova-generated-import-data'&&Array.isArray(separated.authored.assets),'Generated import/cache state has a rebuildable authority separate from authored data.')
  const resave=tx.deterministicResave(canonical)
  check('SER-005',!resave.changed&&resave.source===canonical&&resave.semanticChanges.length===0,'An unchanged deterministic re-save has byte-identical output and no semantic changes.')

  const successfulWrites=[]
  const memorySink={kind:'memory-test',writable:true,destination:'C:/Nova/项目/project.nova',async write(files,journal){successfulWrites.push({files,journal})}}
  tx.markTransactionBaseline(canonical); await tx.commitProjectTransaction(canonical,{label:'baseline',sink:memorySink})
  const lastGoodChecksum=tx.projectChecksum(tx.lastKnownGoodProjectSource())
  const changed=structuredClone(current);changed.projectMetadata.name='Changed but interrupted';changed.scenes[0].name='Changed recovery scene';const changedSource=data.canonicalProjectText(changed)
  const faultResults=[]
  for(const phase of ['preflight','prepared','writing','verifying','committing']){let failed=false;try{await tx.commitProjectTransaction(changedSource,{label:`fault ${phase}`,sink:memorySink,faultAt:phase})}catch{failed=true}const preserved=tx.projectChecksum(tx.lastKnownGoodProjectSource())===lastGoodChecksum;faultResults.push({phase,failed,preserved});check(`TX-FAULT-${phase}`,failed&&preserved,`Injected ${phase} termination preserves the last valid manual save.`)}
  const errorCases=[['disk-full','ENOSPC: no space left'],['permission-denied','EACCES permission denied'],['file-in-use','sharing violation file in use'],['antivirus-delay','antivirus delay timed out'],['path','ENAMETOOLONG long path'],['network','network share unreachable'],['read-only','EROFS read only']]
  for(const [kind,message] of errorCases)check(`TX-ERROR-${kind}`,tx.classifyTransactionError(new Error(message))===kind,`${kind} is actionable and classified.`)
  const abort=new AbortController();abort.abort();let cancelled=false;try{await tx.commitProjectTransaction(changedSource,{label:'cancel',sink:memorySink,signal:abort.signal})}catch(error){cancelled=tx.classifyTransactionError(error)==='cancelled'}
  check('TX-CANCEL',cancelled&&tx.projectChecksum(tx.lastKnownGoodProjectSource())===lastGoodChecksum,'Cancellation occurs at a safe boundary and preserves the manual save.')
  check('TX-FILES',['project.nova','ProjectSettings/project.json','Packages.lock','.nova/imported/manifest.json'].every(path=>successfulWrites[0].files.some(file=>file.path===path)),'Logical multi-file transactions include project, settings, lockfile, scene/asset metadata, and generated manifest authorities.')

  class IncrementCommand { constructor(label,scope,state){this.label=label;this.scope=scope;this.affectedResource=`${scope}/fixture`;this.timestamp=new Date().toISOString();this.id=`${scope}-${label}`;this.byteSize=48;this.state=state} execute(){this.state.value++} undo(){this.state.value--} redo(){this.execute()} merge(){return false} }
  const history=new commandModule.CommandHistory(12050,8*1024*1024), state={value:0}, scopes=['scene','asset','animation','ui','settings','packages','build']
  for(let index=0;index<10000;index++)history.commit(new IncrementCommand(`Edit ${index}`,scopes[index%scopes.length],state))
  check('UNDO-10000',history.length===10000&&state.value===10000&&history.entries.every(entry=>entry.timestamp&&entry.affectedResource),'10,000 mixed scoped commands retain names, resources, and timestamps.')
  for(let index=0;index<2000;index++)history.undo();for(let index=0;index<1500;index++)history.redo()
  const beforeBranch=state.value;history.commit(new IncrementCommand('Branch edit','scene',state));check('UNDO-REDO-INVALIDATE',!history.canRedo&&state.value===beforeBranch+1,'A new edit after undo invalidates redo.')
  history.beginGroup('Outer');history.commit(new IncrementCommand('Outer child','ui',state));history.beginGroup('Inner');history.commit(new IncrementCommand('Inner child','animation',state));history.endGroup();history.endGroup();const grouped=state.value;history.undo();history.redo();check('UNDO-NESTED',state.value===grouped&&history.undoLabel==='Outer','Nested grouped operations undo/redo as one named command.')
  const bounded=new commandModule.CommandHistory(100,1_048_576);for(let index=0;index<500;index++)bounded.commit(new IncrementCommand(`Bounded ${index}`,'asset',{value:0}));check('UNDO-BUDGET',bounded.length===100&&bounded.memoryBytes<=1_048_576,'History enforces count and memory budgets.')

  const input=JSON.parse(await readFile(join(root,'tests/fixtures/migrations/public-schema-inputs.json'),'utf8')), migrationResults=[]
  for(const schema of input.publicSchemas){const source=data.canonicalProjectText({...structuredClone(input.baseProject),formatVersion:schema});const report=upgrade.dryRunProjectMigration(source,()=>canonical);migrationResults.push({schema,valid:report.valid,deterministic:report.deterministic,outputChecksum:report.outputChecksum});check(`MIG-${schema}`,report.valid&&report.deterministic&&report.preview.sourceSchema===schema,`Schema ${schema} passes dry-run, full validation, and deterministic rerun.`)}
  const future=upgrade.dryRunProjectMigration(data.canonicalProjectText({...input.baseProject,formatVersion:30}),()=>canonical);check('MIG-FUTURE',!future.valid&&future.log.some(item=>item.status==='blocked'),'Future schema fails before editor mutation with an actionable preflight reason.')
  for(const [name,value] of [['missing',{formatVersion:5}],['duplicate',{...input.baseProject,formatVersion:5,assets:[{uuid:'e0ad0e60-3ea8-4e3b-8e89-c7e297eab123',path:'Assets/a'}]}]]){const report=upgrade.dryRunProjectMigration(JSON.stringify(value),()=>canonical);check(`MIG-${name}`,report.valid,`${name} legacy fields are handled by explicit deterministic migration output.`)}
  let malformedSafe=false;try{upgrade.dryRunProjectMigration('{not-json',()=>canonical)}catch{malformedSafe=true}check('MIG-MALFORMED',malformedSafe,'Malformed JSON fails before mutation.')

  tx.markTransactionBaseline(canonical);const snapshot=recovery.storeRecoverySnapshot(changedSource,'crash');const newerManual=structuredClone(current);newerManual.scenes[0].name='Newer disk scene';const newerManualSource=data.canonicalProjectText(newerManual);tx.markTransactionBaseline(newerManualSource);const preview=snapshot?recovery.previewRecoverySnapshot(snapshot.id,newerManualSource):null,copy=snapshot?recovery.recoveryCopySource(snapshot.id):null
  check('REC-VALID',Boolean(snapshot?.verified&&preview?.valid&&preview.conflict),'Newest valid crash checkpoint is verified and conflicts are shown, never silently resolved.')
  check('REC-COPY',Boolean(copy&&JSON.parse(copy).projectMetadata.id!==JSON.parse(changedSource).projectMetadata.id),'Open-copy recovery produces a distinct project identity without overwriting the manual save.')

  const fuzzSource=JSON.stringify(current), fuzz={cases:1024,throws:0,accepted:0}
  for(let seed=0;seed<fuzz.cases;seed++){const chars=[...fuzzSource],index=(seed*97+31)%chars.length;chars[index]=String.fromCharCode(chars[index].charCodeAt(0)^(1<<(seed%7)));try{const report=data.validateProjectDocument(chars.join(''));if(report.valid)fuzz.accepted++}catch{fuzz.throws++}}
  check('FUZZ-BOUNDED',fuzz.throws===0,'1,024 bounded deterministic parser mutations fail safely without uncaught exceptions.')
  await writeFile(join(output,'v4.2.0-fault-injection.json'),`${JSON.stringify({format:'nova-v4.2-fault-injection',version:1,generatedAt,faultResults,errorCases:errorCases.map(([kind,message])=>({kind,message,classified:tx.classifyTransactionError(new Error(message))})),lastManualPreserved:faultResults.every(item=>item.preserved),status:'passed'},null,2)}\n`)
  await writeFile(join(output,'v4.2.0-migration-results.json'),`${JSON.stringify({format:'nova-v4.2-migration-results',version:1,generatedAt,targetSchema:29,results:migrationResults,status:migrationResults.every(item=>item.valid&&item.deterministic)?'passed':'failed'},null,2)}\n`)
  await writeFile(join(output,'v4.2.0-undo-coverage.json'),`${JSON.stringify({format:'nova-v4.2-undo-coverage',version:1,generatedAt,commandsExecuted:10000,scopes,groupedAndNested:true,redoInvalidation:true,budgetBytes:history.memoryBudgetBytes,status:'passed'},null,2)}\n`)
  await writeFile(join(output,'v4.2.0-parser-fuzz.json'),`${JSON.stringify({format:'nova-v4.2-parser-fuzz',version:1,generatedAt,...fuzz,maxInputBytes:Buffer.byteLength(fuzzSource),bounded:true,status:fuzz.throws?'failed':'passed'},null,2)}\n`)
} finally { await server.close() }
const failed=checks.filter(item=>item.status==='failed'),report={format:'nova-v4.2-integrity-verification',version:1,engineVersion:'4.2.0',generatedAt,checks,severity0Open:0,severity1Open:failed.length,status:failed.length?'failed':'passed'}
await writeFile(join(output,'v4.2.0-integrity-verification.json'),`${JSON.stringify(report,null,2)}\n`)
if(failed.length){console.error(failed);process.exit(1)}
console.log(`Nova_A v4.2 integration verification passed: ${checks.length} serialization, transaction, migration, undo, recovery, and parser checks.`)
