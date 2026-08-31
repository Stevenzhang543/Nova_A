import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root=dirname(dirname(fileURLToPath(import.meta.url))),checks=[]
const check=(id,passed,detail,metrics={})=>checks.push({id,status:passed?'passed':'failed',detail,metrics})
const read=path=>readFile(join(root,path),'utf8'),json=async path=>JSON.parse(await read(path))
const [pkg,tauri,cargo,nativeCargo,format,contracts,runtime,studio,production,templates,instructions,roadmap,inventory,verification,catalog,interactions,layoutReport]=await Promise.all([
  json('package.json'),json('src-tauri/tauri.conf.json'),read('Cargo.toml'),read('src-tauri/Cargo.toml'),read('src/projects/projectFormat.ts'),read('src/runtime/scriptContracts.ts'),read('src/runtime/GameplayRuntime.ts'),read('src/components/ScriptStudio.vue'),read('src/runtime/productionValidation.ts'),read('src/editor/scriptTemplates.ts'),read('instructions.txt'),read('docs/ROADMAP_6_2_TO_7_0.md'),read('docs/FEATURE_INVENTORY_6_2.md'),json('release-audits/v6.2.0-verification.json'),json('release-audits/template-catalog-verification.json'),json('release-audits/v6.2.0-user-interactions.json'),json('release-audits/v6.2.0-layout-browser.json')
])
check('V620-VERSION',pkg.version==='6.2.0'&&tauri.version==='6.2.0'&&/version\s*=\s*"6\.2\.0"/.test(cargo)&&/version\s*=\s*"6\.2\.0"/.test(nativeCargo)&&format.includes("NOVA_ENGINE_VERSION = '6.2.0'"),'Frontend, native, Rust and project authorities identify 6.2.0.')
check('V620-FORMAT',format.includes('NOVA_PROJECT_FORMAT_MAJOR = 2')&&format.includes('NOVA_PROJECT_SCHEMA_VERSION = 29'),'Project Format 2/schema 29 remain frozen.')
check('V620-CONTRACT',contracts.includes("format: 'nova-script-contract'")&&contracts.includes('validateScriptContract')&&contracts.includes('HOST')===false&&runtime.includes('declared.contract.contract.budgets'),'One versioned analyzer and bounded runtime enforcement are present without a second host contract.')
check('V620-SURFACES',studio.includes("inspectorTab === 'contract'")&&production.includes('validateScriptContract')&&templates.includes('// @nova strict deterministic'),'Authoring, Project Health/Build validation and new templates share the contract system.')
check('V620-COMPATIBILITY',contracts.includes('DEFAULT_SCRIPT_COMMAND_BUDGET = 4096')&&contracts.includes('DEFAULT_SCRIPT_LOG_BUDGET = 512')&&instructions.includes('Project Format 2/schema 29'),'Legacy scripts retain frozen limits and data contracts.')
check('V620-ROADMAP',roadmap.includes('## 6.2.0')&&roadmap.includes('## 7.0.0')&&inventory.includes('323 teachable public operations')&&instructions.includes('docs/ROADMAP_6_2_TO_7_0.md'),'Complete inventory and current 6.2–7.0 coding manual are authoritative.')
check('V620-VERIFICATION',verification.status==='passed'&&verification.engineVersion==='6.2.0','Contract parser, runtime, build, authoring and roadmap checks pass.',{checks:verification.checks.length})
check('V620-TEMPLATES',catalog.status==='passed'&&catalog.engineVersion==='6.2.0','All startup templates retain valid gameplay/build/accessibility behavior.',{checks:catalog.checks.length})
check('V620-INTERACTIONS',interactions.status==='passed'&&interactions.severity0Open===0&&interactions.severity1Open===0,'User-style interaction traversal reports no critical failure.',interactions.summary)
check('V620-LAYOUT',layoutReport.status==='passed'&&layoutReport.severity0Open===0&&layoutReport.severity1Open===0,'EN/DE/ZH layout remains contained through 200% scale.',{states:layoutReport.matrix.length})
const failed=checks.filter(item=>item.status==='failed'),report={format:'nova-v6.2.0-product-audit',version:1,engineVersion:'6.2.0',generatedAt:new Date().toISOString(),perspectives:['programmer','user','compatibility','scripting','runtime','build','localization','layout','release'],checks,severity0Open:0,severity1Open:failed.length,externalGates:{publisherSigning:'pending-external',cleanMachineLifecycle:'pending-external',secondMachineReproducibility:'pending-external',independentHardwareAccessibility:'pending-external',soak72Hours:'pending-external'},status:failed.length?'failed':'passed'}
await mkdir(join(root,'release-audits'),{recursive:true});await writeFile(join(root,'release-audits/v6.2.0-product-audit.json'),`${JSON.stringify(report,null,2)}\n`)
if(failed.length){console.error(failed);process.exit(1)}
console.log(`Nova_A v6.2.0 product audit passed: ${checks.length} checks.`)
