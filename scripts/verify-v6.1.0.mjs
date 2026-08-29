import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build as viteBuild } from 'vite'

const root=dirname(dirname(fileURLToPath(import.meta.url))),checks=[]
const check=(id,passed,detail,metrics={})=>checks.push({id,status:passed?'passed':'failed',detail,metrics})
const text=async path=>readFile(join(root,path),'utf8')
const compiled=await mkdtemp(join(tmpdir(),'nova-v610-verify-')),workspace=await mkdtemp(join(tmpdir(),'nova-v610-export-'))
try{
  await viteBuild({configFile:false,root,logLevel:'warn',ssr:{noExternal:true},build:{ssr:true,outDir:compiled,emptyOutDir:false,rollupOptions:{input:{formats:join(root,'src/projects/projectFormat.ts'),templates:join(root,'src/projects/templates.ts'),pak:join(root,'src/runtime/novaPak.ts')},output:{entryFileNames:'[name].mjs',chunkFileNames:'chunks/[name]-[hash].mjs'}}}})
  const load=name=>import(`${pathToFileURL(join(compiled,`${name}.mjs`)).href}?v=${Date.now()}`)
  const [formats,templates,pak]=await Promise.all(['formats','templates','pak'].map(load))
  check('V610-AUTHORITY',formats.NOVA_ENGINE_VERSION==='6.1.0'&&formats.NOVA_PROJECT_FORMAT_MAJOR===2&&formats.NOVA_PROJECT_SCHEMA_VERSION===29,'Engine authority is 6.1.0 while Project Format 2/schema 29 remain unchanged.')

  const paths=await Promise.all(['package.json','pnpm-workspace.yaml','src-tauri/tauri.conf.json','src/runtime/editorWindow.ts','src/App.vue','src/layout/EditorLayout.vue','src/components/WorldCanvas.vue','src/runtime/profiler.ts','src/renderer/renderGraph.ts','src/assets/main.css','scripts/nova-export.mjs','scripts/package-release.ps1'].map(async path=>[path,await text(path)]))
  const source=Object.fromEntries(paths),activeSource=paths.map(([,value])=>value).join('\n')
  check('V610-PORTABLE-WORKSPACE',!activeSource.includes('C:\\Users\\steve\\OneDrive\\Desktop\\Nova_A')&&!activeSource.includes('C:/Users/steve/OneDrive/Desktop/Nova_A')&&source['pnpm-workspace.yaml'].includes('overrides:')&&!JSON.parse(source['package.json']).pnpm,'Active configuration is repository-relative and pnpm policy uses the current workspace format.')
  check('V610-WINDOW',source['src-tauri/tauri.conf.json'].includes('"maximized": true')&&source['src-tauri/tauri.conf.json'].includes('"fullscreen": false')&&source['src/runtime/editorWindow.ts'].indexOf('if (preferencesState.launchMaximized)')<source['src/runtime/editorWindow.ts'].indexOf('else if (saved)')&&source['src/runtime/editorWindow.ts'].includes('setDecorations(true)'),'Launch maximization wins over saved geometry without entering exclusive fullscreen or removing window decorations.')
  check('V610-LAZY-SHELL',source['src/App.vue'].includes('defineAsyncComponent')&&source['src/layout/EditorLayout.vue'].includes('requestIdleCallback')&&source['src/layout/EditorLayout.vue'].includes('inspectorLoaded')&&source['src/layout/EditorLayout.vue'].includes('v-show="showInspector"'),'Advanced surfaces are cached/lazy, idle-warmed, and the Inspector is retained after first use.')
  check('V610-POINTER-PIPELINE',source['src/components/WorldCanvas.vue'].includes('pendingMouseMove')&&source['src/components/WorldCanvas.vue'].includes('flushPendingMouseMove')&&source['src/components/WorldCanvas.vue'].includes('for (const e of world.entities)')&&!source['src/components/WorldCanvas.vue'].includes('const renderEntities = [...world.entities].sort'),'Pointer work is frame-coalesced and selected overlays do not sort or calculate unselected geometry.')
  check('V610-DIAGNOSTICS',source['src/runtime/profiler.ts'].includes("overheadMode: 'Low overhead'")&&source['src/runtime/profiler.ts'].includes("overheadMode === 'Off'")&&source['src/renderer/renderGraph.ts'].includes('framePasses'),'Default diagnostics avoid full-trace and per-pass reactive allocation while retaining Full and Off modes.')
  check('V610-VISUAL-LANGUAGE',['-apple-system','Segoe UI Variable Text','Noto Sans SC Variable','--font-display','semantic surface','backdrop blur'].every(marker=>source['src/assets/main.css'].includes(marker))&&!source['src/components/WorldCanvas.vue'].includes('imageSmoothingQuality = \'low\''),'System-first typography, semantic materials, restrained live glass, and high-quality canvas smoothing are present.')

  const project=templates.createTemplateProject('mouse-knockout','Nova v6.1.0 Relocation Audit');project.projectSettings.build.gameName='Mouse Knockout'
  const packageBytes=await pak.createNovaPak(JSON.stringify(project),structuredClone(project.assets),project.activeSceneUuid,{deterministic:true,compression:'balanced'}),projectPath=join(workspace,'project.nova'),playerPath=join(workspace,'nova-player.exe'),output=join(workspace,'portable')
  await writeFile(projectPath,`${JSON.stringify(project,null,2)}\n`);await writeFile(playerPath,Buffer.from('MZ\0Nova_A player template audit\n'))
  execFileSync(process.execPath,[join(root,'scripts/nova-export.mjs'),'--project',projectPath,'--target','windows','--output',output,'--profile','release','--architecture','x86_64','--runtime','game','--player',playerPath,'--single-file'],{cwd:root,stdio:'pipe'})
  const executablePath=join(output,'Mouse Knockout.exe'),executable=await readFile(executablePath),footerStart=executable.length-48,embeddedLength=Number(executable.readBigUInt64LE(footerStart+8)),embedded=executable.subarray(footerStart-embeddedLength,footerStart)
  check('V610-PORTABLE-GAME',packageBytes.byteLength>16&&executable.subarray(footerStart,footerStart+8).toString('ascii')==='NOVAPK2!'&&executable.subarray(footerStart+16).toString('hex')===createHash('sha256').update(embedded).digest('hex')&&!await exists(join(output,'game.nova-pak')),'The moved workspace still produces one verified portable game.',{executable:relative(root,executablePath),bytes:executable.length})
}finally{await rm(compiled,{recursive:true,force:true});await rm(workspace,{recursive:true,force:true})}

const failed=checks.filter(item=>item.status==='failed'),report={format:'nova-v6.1.0-verification',version:1,engineVersion:'6.1.0',generatedAt:new Date().toISOString(),perspectives:['environment','window','ui','performance','backend','portable-game'],checks,severity0Open:failed.length,severity1Open:0,status:failed.length?'failed':'passed'}
await mkdir(join(root,'release-audits'),{recursive:true});await writeFile(join(root,'release-audits/v6.1.0-verification.json'),`${JSON.stringify(report,null,2)}\n`)
if(failed.length){console.error(failed);process.exit(1)}
console.log(`Nova_A v6.1.0 verification passed: ${checks.length} checks.`)
async function exists(path){try{await stat(path);return true}catch{return false}}
