import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root=dirname(dirname(fileURLToPath(import.meta.url))),output=join(root,'reference-projects/projects/creator-v604-linked-build-performance'),compiled=await mkdtemp(join(tmpdir(),'nova-v604-reference-'))
try{
  await build({configFile:false,root,logLevel:'warn',ssr:{noExternal:true},build:{ssr:'src/projects/templates.ts',outDir:compiled,emptyOutDir:false,rollupOptions:{output:{entryFileNames:'templates.mjs'}}}})
  const templates=await import(`${pathToFileURL(join(compiled,'templates.mjs')).href}?v=${Date.now()}`),project=templates.createTemplateProject('mouse-knockout','Nova 6.0.4 Linked Build and Performance Audit')
  project.projectSettings.build.gameName='Mouse Knockout'
  const failures=templates.auditTemplateProject(project,'mouse-knockout');if(failures.length)throw new Error(`Mouse Knockout template failed: ${failures.join('; ')}`)
  await mkdir(output,{recursive:true});await writeFile(join(output,'project.nova'),`${JSON.stringify(project,null,2)}\n`)
  await writeFile(join(output,'README.md'),`# Nova_A 6.0.4 linked build and performance audit

Engine **6.0.4**, Project Format 2/schema 29.

Open **project.nova**, leave the complete Mouse Knockout game unchanged, and create a visual graph. In its Generated Rhai tab choose **Create / update linked Rhai**. Change the log-message string in Script Studio and save: the matching API node input must change. Change it visually and save the graph: the linked Rhai must regenerate. Add a top-level helper function in Rhai; it must reappear as a visible Code node and survive save/reload. An ordinary script without an @nova-graph-link marker must remain untouched.

Build a Windows x86-64 single-file game, leave it running, and build again to the same folder. The first player stays alive and the second build succeeds with a build-ID suffix when Windows locks the preferred name. The player remains a valid NOVAPK2!/SHA-256 executable.

Exercise Balanced, Low-end and High quality editor profiles. Low-end reduces redundant idle editor work but does not alter project data, exported output, active tool/camera animations, gameplay cadence, or visual quality inside the game. Publisher signing, independent clean-machine/hardware evidence and 72-hour soak remain external gates.
`)
  await writeFile(join(output,'test-controls.json'),`${JSON.stringify({engineVersion:'6.0.4',reference:'creator-v604-linked-build-performance',locales:['en','de','zh'],uiScales:[1,1.25,1.5,1.75,2],actions:['graph to linked Rhai','linked Rhai to graph','preserve arbitrary source in Code node','save and reload both assets','build while previous player is running','switch all editor performance profiles','launch exported game'],expected:{projectFormat:2,schema:29,preferredExecutable:'Mouse Knockout.exe',lockedFallbackPattern:'Mouse Knockout-[build-id].exe',accessDeniedErrors:0,bidirectional:true,independentScriptsUnchanged:true,arbitraryCodePreserved:true,featuresRemoved:0,animationsRemoved:0,singleFilePortable:true}},null,2)}\n`)
  await writeFile(join(output,'expected-output.json'),`${JSON.stringify({engineVersion:'6.0.4',status:'passed',graph:{linkedMarkers:true,codeToGraph:true,graphToCode:true,rawCodeNode:true},performance:{graphNodes:802,compileBudgetMs:1500,lazyWorkspace:true,indexedLookups:true,lowEndIdleCanvasFps:30,runtimeCadenceUnchanged:true},export:{staged:true,lockedFallback:true,footer:'NOVAPK2!',hash:'SHA-256'},externalCertification:'pending'},null,2)}\n`)
}finally{await rm(compiled,{recursive:true,force:true})}

const indexPath=join(root,'reference-projects/README.md');let index=await readFile(indexPath,'utf8'),start='<!-- NOVA_V604_REFERENCES_START -->',end='<!-- NOVA_V604_REFERENCES_END -->',block=`${start}\n## Nova_A 6.0.4 linked build and performance project\n\n- [Linked build and performance audit](projects/creator-v604-linked-build-performance/README.md) — two-way visual/Rhai authoring, arbitrary-code preservation, Windows locked-output rebuild, low-end editor profile and playable portable output.\n${end}`,expression=new RegExp(`${start}[\\s\\S]*?${end}`,'m')
index=expression.test(index)?index.replace(expression,block):`${index.trimEnd()}\n\n${block}\n`;await writeFile(indexPath,index,'utf8')
console.log('Generated the Nova_A v6.0.4 linked build and performance reference project.')
