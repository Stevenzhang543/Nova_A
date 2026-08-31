import { build } from 'vite'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root=dirname(dirname(fileURLToPath(import.meta.url))),compiled=await mkdtemp(join(tmpdir(),'nova-v620-verify-')),checks=[]
const check=(id,passed,detail,metrics={})=>checks.push({id,status:passed?'passed':'failed',detail,metrics})
const text=path=>readFile(join(root,path),'utf8')
try{
  await build({configFile:false,root,logLevel:'warn',ssr:{noExternal:true},build:{ssr:true,outDir:compiled,emptyOutDir:false,rollupOptions:{input:{contracts:join(root,'src/runtime/scriptContracts.ts'),formats:join(root,'src/projects/projectFormat.ts')},output:{entryFileNames:'[name].mjs',chunkFileNames:'chunks/[name]-[hash].mjs'}}}})
  const load=name=>import(`${pathToFileURL(join(compiled,`${name}.mjs`)).href}?v=${Date.now()}`),[contracts,formats]=await Promise.all(['contracts','formats'].map(load))
  check('V620-AUTHORITY',formats.NOVA_ENGINE_VERSION==='6.2.0'&&formats.NOVA_PROJECT_FORMAT_MAJOR===2&&formats.NOVA_PROJECT_SCHEMA_VERSION===29,'Engine authority advances while Project Format 2/schema 29 remain frozen.')
  const legacy=contracts.parseScriptContract('fn update(dt) { log_info("legacy"); }')
  check('V620-BACKWARD-COMPATIBILITY',legacy.valid&&!legacy.contract.strict&&!legacy.contract.deterministic&&legacy.contract.budgets.commands===4096&&legacy.contract.budgets.logs===512,'A script without directives keeps the frozen global behavior.')
  const strict=contracts.validateScriptContract(`// @nova strict deterministic\n// @requires component RigidBody2D\n// @requires input Jump\n// @requires asset Assets/Prefabs/Ball.nova-prefab\n// @requires package top.whitelists.example\n// @budget commands 32\n// @budget logs 8\nfn fixed_update(dt) { apply_force(1.0, 0.0); }`,{components:['RigidBody2D'],inputActions:['Jump'],assets:['Assets/Prefabs/Ball.nova-prefab'],packages:['top.whitelists.example']})
  check('V620-CONTRACT-PARSER',strict.valid&&strict.contract.strict&&strict.contract.deterministic&&strict.contract.requirements.length===4&&strict.contract.budgets.commands===32&&strict.contract.budgets.logs===8,'All contract requirement kinds and budgets normalize deterministically.',{apiBindings:strict.apiUsage.length})
  const missing=contracts.validateScriptContract('// @nova strict\n// @requires input Dash\nfn update(dt) {}',{inputActions:['Jump']})
  check('V620-FAIL-CLOSED',!missing.valid&&missing.diagnostics.some(item=>item.code==='NOVA-CONTRACT-REQ'),'Missing declared requirements fail closed with a specific diagnostic.')
  const nondeterministic=contracts.parseScriptContract('// @nova deterministic\nfn update(dt) { let x = mouse_x(); }')
  check('V620-DETERMINISM',!nondeterministic.valid&&nondeterministic.diagnostics.some(item=>item.code==='NOVA-CONTRACT-007'),'Deterministic contracts reject host-dependent API usage.')
  const wrongThread=contracts.parseScriptContract('// @nova strict\nfn update(dt) { apply_force(1.0, 0.0); }')
  check('V620-STRICT-THREAD',!wrongThread.valid&&wrongThread.diagnostics.some(item=>item.code==='NOVA-CONTRACT-008'),'Strict contracts reject fixed-step mutations from rendered-frame callbacks.')
  const boundedLow=contracts.parseScriptContract('// @nova\n// @budget commands 0\n// @budget logs 513\nfn update(dt) {}'),boundedHigh=contracts.parseScriptContract('// @nova\n// @budget commands 4096\n// @budget logs 512\nfn update(dt) {}')
  check('V620-BOUNDS',!boundedLow.valid&&boundedHigh.valid&&boundedHigh.contract.budgets.commands===4096&&boundedHigh.contract.budgets.logs===512,'Budget limits accept exact global maxima and reject values outside 1..max.')
  const malformed=contracts.parseScriptContract('// @nova strict surprise\n// @requires service x\n// @budget commands many\nfn update(dt) {}')
  check('V620-DIAGNOSTICS',!malformed.valid&&new Set(malformed.diagnostics.map(item=>item.code)).size>=3,'Malformed flags, requirement kinds and budgets remain separately actionable.')
  const sources=Object.fromEntries(await Promise.all(['src/runtime/GameplayRuntime.ts','src/runtime/productionValidation.ts','src/components/ScriptStudio.vue','src/components/ProjectHealthPanel.vue','src/editor/scriptTemplates.ts','src/i18n.ts','instructions.txt','docs/ROADMAP_6_2_TO_7_0.md','docs/FEATURE_INVENTORY_6_2.md'].map(async path=>[path,await text(path)])))
  check('V620-RUNTIME',sources['src/runtime/GameplayRuntime.ts'].includes('declared.contract.contract.budgets')&&sources['src/runtime/GameplayRuntime.ts'].includes('validateScriptContract')&&sources['src/runtime/GameplayRuntime.ts'].includes('contractValidations.clear()'),'Runtime validation, declared limits and session cache invalidation are connected.')
  check('V620-BUILD-HEALTH',sources['src/runtime/productionValidation.ts'].includes('validateScriptContract')&&sources['src/components/ProjectHealthPanel.vue'].includes('contractErrors'),'Build and Project Health use the same contract analyzer.')
  check('V620-AUTHORING',sources['src/components/ScriptStudio.vue'].includes("inspectorTab === 'contract'")&&sources['src/components/ScriptStudio.vue'].includes('contractReport.apiUsage')&&sources['src/editor/scriptTemplates.ts'].includes('// @nova strict deterministic'),'Script Studio exposes requirements, budgets and API characteristics; new templates opt in.')
  check('V620-LOCALIZATION',forEachLanguage(sources['src/i18n.ts'],'behaviorContract')&&forEachLanguage(sources['src/i18n.ts'],'behaviorContractHint'),'Contract UI is explicitly localized in English, German and Chinese.')
  check('V620-ROADMAP',sources['instructions.txt'].includes('docs/ROADMAP_6_2_TO_7_0.md')&&sources['docs/ROADMAP_6_2_TO_7_0.md'].includes('## 7.0.0')&&sources['docs/FEATURE_INVENTORY_6_2.md'].includes('323 teachable public operations'),'The current instructions point to the complete inventory and 6.2–7.0 implementation manual.')
}finally{await rm(compiled,{recursive:true,force:true})}
const failed=checks.filter(item=>item.status==='failed'),report={format:'nova-v6.2.0-verification',version:1,engineVersion:'6.2.0',generatedAt:new Date().toISOString(),perspectives:['compatibility','scripting','runtime','build','authoring','localization','roadmap'],checks,severity0Open:failed.length,severity1Open:0,status:failed.length?'failed':'passed'}
await mkdir(join(root,'release-audits'),{recursive:true});await writeFile(join(root,'release-audits/v6.2.0-verification.json'),`${JSON.stringify(report,null,2)}\n`)
if(failed.length){console.error(failed);process.exit(1)}
console.log(`Nova_A v6.2.0 verification passed: ${checks.length} checks.`)
function forEachLanguage(source,key){return ['Object.assign(en','Object.assign(de','Object.assign(zh'].every(marker=>{const at=source.lastIndexOf(marker);return at>=0&&source.slice(at,at+5000).includes(`${key}:`)})}
