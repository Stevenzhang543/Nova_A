import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root=dirname(dirname(fileURLToPath(import.meta.url))),output=join(root,'reference-projects/projects/creator-v620-behavior-contract'),compiled=await mkdtemp(join(tmpdir(),'nova-v620-reference-'))
try{
  await build({configFile:false,root,logLevel:'warn',ssr:{noExternal:true},build:{ssr:'src/projects/templates.ts',outDir:compiled,emptyOutDir:false,rollupOptions:{output:{entryFileNames:'templates.mjs'}}}})
  const templates=await import(`${pathToFileURL(join(compiled,'templates.mjs')).href}?v=${Date.now()}`),project=templates.createTemplateProject('mouse-knockout','Nova 6.2.0 Behavior Contract Audit')
  project.projectSettings.build.gameName='Contract Knockout'
  const script=project.assets.find(asset=>asset.path==='Assets/Scripts/KnockoutGameManager.rhai')
  if(!script)throw new Error('Mouse Knockout script asset is missing.')
  script.source=`// @nova strict deterministic\n// @budget commands 32\n// @budget logs 8\n\n${script.source}`
  const digest=createHash('sha256').update(script.source).digest('hex');script.sourceModified=0;script.byteLength=new TextEncoder().encode(script.source).byteLength;script.pipeline={...script.pipeline,sourceHash:digest,artifactHash:digest,contentHash:digest,cacheKey:digest,lastValidSource:script.source,error:'',status:'ready'}
  const failures=templates.auditTemplateProject(project,'mouse-knockout');if(failures.length)throw new Error(`Contract reference failed: ${failures.join('; ')}`)
  await mkdir(output,{recursive:true});await writeFile(join(output,'project.nova'),`${JSON.stringify(project,null,2)}\n`)
  await writeFile(join(output,'README.md'),`# Nova_A 6.2.0 behavior-contract audit

Engine **6.2.0** · Project Format 2 · schema 29

Open **project.nova** and inspect **Assets/Scripts/KnockoutGameManager.rhai** in Script Studio → Contract. Strict and deterministic must be active; commands must be 32 and logs 8. Play the complete Mouse Knockout game and push all eight targets out. The contract must not change physics or scoring.

Add **// @requires input MissingAction**, save, and Play: Script Studio, Project Health, Build Settings, and runtime must identify the missing input. Replace it with a real action or remove it; the game must run immediately. Change **// @budget commands 32** to zero and verify a precise range diagnostic, then restore 32. Add **mouse_x()** to this deterministic script and verify the host-dependent diagnostic, then undo.

Existing scripts without a contract remain valid. Graph↔Rhai synchronization and Project Format 2/schema 29 remain unchanged. Publisher signing, independent clean-machine/hardware certification, matching-host builds, and a 72-hour soak remain external.
`)
  await writeFile(join(output,'test-controls.json'),`${JSON.stringify({engineVersion:'6.2.0',reference:'creator-v620-behavior-contract',locales:['en','de','zh'],uiScales:[1,1.25,1.5,1.75,2],actions:['open Contract tab','play unchanged game','add missing input requirement','repair requirement','set invalid budget','undo','add host-dependent API','undo','build portable game'],expected:{projectFormat:2,schema:29,strict:true,deterministic:true,commandBudget:32,logBudget:8,score:8,contractErrorsAfterRepair:0,featuresRemoved:0,animationsRemoved:0}},null,2)}\n`)
  await writeFile(join(output,'expected-output.json'),`${JSON.stringify({engineVersion:'6.2.0',status:'passed',contract:{format:'nova-script-contract',version:1,strict:true,deterministic:true,commands:32,logs:8},game:{template:'mouse-knockout',playable:true,score:8},externalCertification:'pending'},null,2)}\n`)
}finally{await rm(compiled,{recursive:true,force:true})}

const indexPath=join(root,'reference-projects/README.md');let index=await readFile(indexPath,'utf8'),start='<!-- NOVA_V620_REFERENCES_START -->',end='<!-- NOVA_V620_REFERENCES_END -->',block=`${start}\n## Nova_A 6.2.0 behavior-contract project\n\n- [Behavior-contract audit](projects/creator-v620-behavior-contract/README.md) — strict/deterministic analysis, requirement repair, bounded callbacks, unchanged playable output, and portable build.\n${end}`,expression=new RegExp(`${start}[\\s\\S]*?${end}`,'m')
index=expression.test(index)?index.replace(expression,block):`${index.trimEnd()}\n\n${block}\n`;await writeFile(indexPath,index,'utf8')
console.log('Generated the Nova_A v6.2.0 behavior-contract reference project.')
