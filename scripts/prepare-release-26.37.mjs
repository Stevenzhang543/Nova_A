/** Comfortable UI release: fourteen executed, source-bound checks and explicit omissions. */
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {requiredGateIds,validateQualificationPlan} from './release-qualification.mjs'
const option=name=>process.argv.find(arg=>arg.startsWith('--'+name+'='))?.slice(name.length+3)
for(const [id,name] of [['creator-v2637-mixed-game','Nova 26.37 Coin Trail — mixed'],['server-v2637-headless-authority','Nova 26.37 Headless Authority']]){
 const p=JSON.parse(await readFile('reference-projects/projects/'+id+'/project.nova','utf8'))
 if(p.engineVersion!=='26.37.0'||p.projectSettings?.build?.gameName!==name||p.projectMetadata?.name!==name||p.manifest?.name!==name||p.projectName!==name)throw Error('Reference identity mismatch: '+id)
}
const source=await readFile('scripts/prepare-release-26.30.mjs','utf8'),literal=source.match(/const plan=([\s\S]*?)\nplan\.sourceSnapshot=/)?.[1]
if(!literal)throw Error('Existing packaging plan changed; review contract')
const plan=JSON.parse(literal.replaceAll('26.30','26.37').replaceAll('26_30','26_37').replaceAll('v2630','v2637'))
const retained=new Set(['native-build','wasm','web','typescript','focus','browser-layout','user-interactions','windows','headless','hygiene','manual','performance','product'])
plan.gates=plan.gates.filter(g=>retained.has(g.id))
plan.editLedger='docs/EDIT_LEDGER_26_37.md'
plan.documentation=['docs/RELEASE_NOTES_26_37.md','docs/WEB_HOSTING_26_37.md','docs/NATIVE_HEADLESS_26_37.md','docs/ui/UI_SPEC.md','docs/ui/UI_VISUAL_V3_SPEC.md','docs/ui/MOTION_SYSTEM_SPEC.md','docs/ui/UI_MOTION_IMPLEMENTATION_PLAN.md','docs/ui/MOTION_QA_CHECKLIST.md','docs/ui/DECISIONS.md','docs/ui/MIGRATION.md']
plan.sourceSnapshot=option('snapshot')??'.cache/release-snapshots/v26.37-candidate1/snapshot.json'
plan.gates.splice(plan.gates.findIndex(g=>g.id==='focus')+1,0,{id:'motion-logic',category:'programmer',context:'Actual production spring/policy/owner/reversal/reduced-motion modules under a controllable browser-host double; no claim of actual GUI controller or compositor coverage.',command:{file:process.execPath,args:['scripts/qualify-v26.37-scoped.mjs','--gate=motion-logic']},reports:[{path:'release-audits/v26.37-motion-logic-bundle.json',target:'runtime/motion-logic.json',format:'nova-v26.37-motion-logic-bundle',version:1,requireRelease:true,requireEngine:true}],artifacts:[]})
const contexts={focus:'Pinned environment, fresh supplied-image/PE/NSIS artwork and actual native stdio identity; no unrelated physics implementation sweep.','browser-layout':'Real populated all-major-panel route inventory, containment, accessible controls and persistent-shell navigation; no legacy density required.','user-interactions':'Actual numeric editing/history/save/reopen, input routing, downloaded game, and root/nested static deployment contracts.',performance:'Same unchanged26.36 fixture/Player and1600×900/DPR1/UIscale1 before/after; real UI geometry, nine timings/four windows, interruption/reduced/focus/native drag and finite cleanup. Software browser, not physical GPU or input-to-display certification.'}
for(const g of plan.gates){g.command.file=process.execPath;if(['focus','browser-layout','user-interactions','performance','product'].includes(g.id))g.command.args[0]='scripts/qualify-v26.37-scoped.mjs';g.command.args[0]=resolve(g.command.args[0]);g.command.args=g.command.args.map(a=>a.startsWith('--pnpm-entry=')?'--pnpm-entry='+option('pnpm-entry'):a.startsWith('--pnpm-bin=')?'--pnpm-bin='+option('pnpm-bin'):a);if(contexts[g.id])g.context=contexts[g.id]}
const reasons={rust:'Only release identity changes Rust; fresh native/WASM compilation and actual runtime/version smoke run. No repeated unrelated physics/math suite.','rust-lint':'No Rust implementation changes; no new Rust lint certification.','native-rust':'No Tauri runtime/permission change; Windows build, artifact identity and export smoke run.',history:'Schema unchanged; actual authoring, undo/redo/save/reopen and downloaded fixtures are retained.',templates:'Template navigation/creation is exercised by actual layout/motion suites; unchanged catalog exhaustive sweep omitted.','layout-contract':'Actual all-panel containment and measured new geometry supersede duplicate historic compact pixel assertions.',stability:'Real rapid interruption/drag/reduced/idle/cleanup checks run; unrelated long engine soak omitted.',security:'Dependencies/credentials/permissions unchanged; hygiene runs, no new vulnerability certification.'}
plan.auditPolicy={kind:'change-risk-v1',authorization:'User requests comfortable default typography/geometry and complete editor motion integration with effective linked audits and a full26.37 release, preserving runtime and data compatibility.',omitted:requiredGateIds.filter(id=>!retained.has(id)).map(id=>({id,status:'not-run',reason:reasons[id]}))}
if(!option('pnpm-entry')||!option('pnpm-bin'))throw Error('Supply pinned pnpm entry/bin')
validateQualificationPlan(plan)
if(plan.gates.length!==14)throw Error('Expected exactly fourteen declared gates')
await mkdir('release-audits',{recursive:true});await writeFile('release-audits/v26.37-qualification-plan.json',JSON.stringify(plan,null,2)+'\n')
console.log('26.37: fourteen planned gates; '+plan.auditPolicy.omitted.length+' explicit omissions; none executed by this planner')
