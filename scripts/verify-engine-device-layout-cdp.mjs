/** Read-only layout supplement to a1d6f public Save/reopen GUI smoke; no performance or motion sampling. */
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {join,resolve,relative} from 'node:path'
import {withBrowserAudit} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const root=resolve(process.cwd()),dist=join(root,'.cache/engine-overhaul/profile-dist-a1d6f'),output=join(root,'.cache/engine-overhaul/device-layout-a1d6f-attempt1')
const sha=b=>createHash('sha256').update(b).digest('hex'),mb=await readFile(join(dist,'engine-build-manifest.json')),manifest=JSON.parse(mb)
assert.equal(sha(mb),'f7230306e211b4247b7f9fe5e46cf88bd6201de5aa3ae4ef7f448ca6602e3be9')
assert.equal(manifest.buildId,'engine-profile-a1d6fe7b3c4ce5db243a')
for(const f of manifest.artifacts)assert.equal(sha(await readFile(join(dist,f.path))),f.sha256)
const project=join(root,'.cache/engine-overhaul/input-collection-ui-a1d6f-attempt2/v26.17-a1d6f-input-collection.nova'),pb=await readFile(project)
assert.equal(sha(pb),'aba83b30b8fc5563bdd82fb73268c0642774769210f6d6051504486578a470ec')
await mkdir(output);await writeFile(join(output,'profile-build-manifest.json'),mb);await writeFile(join(output,'driver-source.mjs'),await readFile(new URL(import.meta.url)))
process.env.NOVA_AUDIT_DIST_DIRECTORY=relative(root,dist);process.env.NOVA_AUDIT_REPORT_DIRECTORY=relative(root,output)
const raw={scope:'READ_ONLY_LAYOUT_SUPPLEMENT',buildId:manifest.buildId,artifactSourceHash:manifest.sourceHash,manifestSha256:sha(mb),projectSha256:sha(pb),viewport:{width:1600,height:900,dpr:1},counts:{entities:11,serializedComponents:59,runtimeNotRemovedComponents:41}}
await withBrowserAudit({root,release:'26.37',name:'engine-device-layout',width:1600,height:900,development:true,expectedRelease:'26.37',qualifyRelease:false},async a=>{
 try{
  const ui=worldUserControls17(a);await ui.open(project);await ui.workspace('Manage');await a.click('.manage-body>nav button',1);await a.until("!!document.querySelector('.settings-page')");await a.fill('.settings-search input','deviceInput');await a.clickText('.device-studio>.ui-tabs button','Virtual controls',true)
  raw.geometry=await a.evaluate(`(()=>{const measure=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,className:e.className,width:r.width,height:r.height,left:r.left,top:r.top,clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,overflowX:s.overflowX,overflowY:s.overflowY,display:s.display,gridTemplateColumns:s.gridTemplateColumns,gap:s.gap,minWidth:s.minWidth,fontSize:s.fontSize,paddingLeft:s.paddingLeft,paddingRight:s.paddingRight,boxSizing:s.boxSizing}};const fields=document.querySelector('.device-studio .control-card .fields');return {dpr:devicePixelRatio,bodyFont:getComputedStyle(document.body).fontSize,rootZoom:getComputedStyle(document.documentElement).zoom,fields:measure(fields),card:measure(fields.parentElement),rows:[...fields.querySelectorAll('.ui-property-row')].map(row=>({label:row.getAttribute('aria-label'),row:measure(row),labelBox:measure(row.querySelector('.ui-property-label')),control:measure(row.querySelector('.ui-property-control')),inputOrSelect:[...row.querySelectorAll('input,select')].map(e=>({...measure(e),value:e.value,ariaLabel:e.getAttribute('aria-label'),childWrapper:e.parentElement===row.querySelector('.ui-property-control')?null:measure(e.parentElement)}))}))}})()`)
  assert.equal(raw.geometry.dpr,1);assert.equal(raw.geometry.bodyFont,'16px');assert.equal(raw.geometry.rootZoom,'1')
  raw.screenshot=await a.capture('same-saved-virtual-fields');raw.browser=await a.client.send('Browser.getVersion');raw.completedAt=new Date().toISOString()
 }finally{await writeFile(join(output,'device-layout-raw.json'),JSON.stringify(raw,null,2)+'\n')}
})
assert.equal(sha(await readFile(project)),raw.projectSha256)
console.log(JSON.stringify({scope:raw.scope,output,status:process.exitCode?'failed':'recorded'}))
