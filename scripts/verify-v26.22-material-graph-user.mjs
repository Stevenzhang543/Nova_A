import {blockedStudioSave22} from './lib/userFixtures22.mjs'
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {openMediaAuditModules} from './lib/mediaAudit16.mjs'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const fixture=join(process.cwd(),'.cache/v2622-material-graph.nova'),opened=await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{physics:'store/physics',templates:'projects/templates',assets:'assets/AssetDatabase',materials:'renderer/materials',graph:'renderer/materialGraph'}),ids=[]
try{const {physics:p,templates,assets,materials:m,graph:g}=opened.modules,wasm=await opened.wasm();assert.ok(p.loadProject(wasm.module.migrate_project_json(templates.createTemplateProjectJson('empty','Material drafts'))));for(const name of ['A','B']){const material=m.defaultMaterial('Draft material '+name);material.uniforms={auditScalar:2,auditCount:3,auditDirection:[1,2,3],auditRange:.5};material.uniformSchema=[{name:'auditScalar',label:'Audit scalar',type:'number',minimum:0,maximum:10,step:.1},{name:'auditCount',label:'Audit count',type:'integer'},{name:'auditDirection',label:'Audit direction',type:'vector3'},{name:'auditRange',label:'Audit range',type:'range',minimum:0,maximum:1,step:.1}];material.graph=g.defaultMaterialGraph();const input=material.graph.nodes[0],output=material.graph.nodes.find(n=>n.kind==='Output');material.graph.nodes.push({uuid:'shared-palette',kind:'Palette',label:'Palette draft',position:{x:240,y:120},values:{steps:6,strength:6}});material.graph.edges=[{uuid:'palette-in',fromNode:input.uuid,fromPin:'color',toNode:'shared-palette',toPin:'color'},{uuid:'palette-out',fromNode:'shared-palette',fromPin:'color',toNode:output.uuid,toPin:'color'}];ids.push(assets.createTextAsset('Draft material '+name,'material',m.serializeMaterial(material),'Assets/Materials').uuid)}await writeFile(fixture,p.getSceneJSON())}finally{await opened.close()}
await withBrowserAudit({release:'26.22',name:'material-graph-user',development:process.argv.includes('--development'),expectedRelease:JSON.parse(await readFile('package.json','utf8')).version.split('.').slice(0,2).join('.'),width:1366,height:900},async a=>{
 const u=worldUserControls17(a),field='input[data-resource-key$=":selectedNode.values.steps"]';
 async function graph(){await u.workspace('Manage');await a.until("!!document.querySelector('.manage-body>nav button')");await a.click('.manage-body>nav button',5);await a.until("!!document.querySelector('.rendering-studio')");await a.click('.rendering-studio>.studio-header nav button',3);await a.until("!!document.querySelector('.graph-toolbar select')");await a.select('.graph-toolbar select',ids[0]);await a.clickText('.material-graph-editor .graph-node','shared-palette')}
 const stored=document=>{const record=document.assets.find(a=>a.uuid===ids[0]);return JSON.parse(decodeURIComponent(record.source.slice(record.source.indexOf(',')+1))).graph.nodes.find(n=>n.uuid==='shared-palette').values.steps};
 await u.open(fixture);await graph();
 await a.check('Invalid material graph drafts block asset Save and corrected expressions survive reopening',async()=>{await u.field(field,'4+4');await u.field(field,'100');assert.equal(await a.evaluate(`document.querySelector('${field}').getAttribute('aria-invalid')`),'true');await u.activate('.graph-toolbar>button:last-child');assert.equal(await a.evaluate(`document.querySelector('${field}').value`),'100');await a.evaluate(`document.querySelector('${field}').focus()`);await a.press('Escape');await blockedStudioSave22(a);await u.activate('.graph-toolbar>button:last-child');await wait(150);const saved=await u.save('material-graph-saved-22');assert.equal(stored(saved.document),8);await u.open(saved.file);await graph();assert.equal(await a.evaluate(`Number(document.querySelector('${field}').value)`),8);await a.capture('material-graph-expression')})
 await a.check('Switching materials with copied node IDs cannot carry an invalid draft into the other asset',async()=>{await u.field(field,'100');await a.select('.graph-toolbar select',ids[1]);await a.clickText('.material-graph-editor .graph-node','shared-palette');assert.equal(await a.evaluate(`Number(document.querySelector('${field}').value)`),6);assert.equal(await a.evaluate(`document.querySelector('${field}').getAttribute('aria-invalid')`),null);await a.select('.graph-toolbar select',ids[0]);await a.clickText('.material-graph-editor .graph-node','shared-palette');assert.equal(await a.evaluate(`Number(document.querySelector('${field}').value)`),8)})
 await a.check('Saved material graph values refresh in the open inspector after Undo and Redo',async()=>{await u.field(field,'10');await u.activate('.graph-toolbar>button:last-child');await a.evaluate(`document.activeElement.blur()`);await a.press('z',2);await wait(220);assert.equal(await a.evaluate(`Number(document.querySelector('${field}').value)`),8);await a.press('y',2);await wait(220);assert.equal(await a.evaluate(`Number(document.querySelector('${field}').value)`),10)})
 await a.check('A dirty material cannot overwrite an asset replaced by Undo',async()=>{
  await u.field(field,'12');await a.evaluate('document.activeElement.blur()');await a.press('z',2);await wait(220);
  assert.equal(await a.evaluate(`Number(document.querySelector('${field}').value)`),12);
  await u.activate('.graph-toolbar>button:last-child');await blockedStudioSave22(a);
  assert.equal(await a.evaluate(`Number(document.querySelector('${field}').value)`),12);
  await a.until("!!document.querySelector('[data-audit=material-source-conflict]')");
  await u.activate('[data-audit=material-source-conflict] button');
  assert.equal(await a.evaluate(`Number(document.querySelector('${field}').value)`),8);
  const saved=await u.save('material-conflict-restored-22');assert.equal(stored(saved.document),8);
 })
 await a.check('Unsaved material graph edits survive asset switches and panel replacement',async()=>{
  await u.field(field,'11');await a.select('.graph-toolbar select',ids[1]);await a.select('.graph-toolbar select',ids[0]);await a.clickText('.material-graph-editor .graph-node','shared-palette');
  assert.equal(await a.evaluate(`Number(document.querySelector('${field}').value)`),11);
  await a.click('.manage-body>nav button',1);await graph();
  assert.equal(await a.evaluate(`Number(document.querySelector('${field}').value)`),11);
  await u.activate('.graph-toolbar>button:last-child');
 })
 await a.check('Typed scalar and vector uniforms retain rejected input and save expressions without removing sliders',async()=>{
  await a.click('.rendering-studio>.studio-header nav button',1);
  const scalar='input[aria-label="Audit scalar"]',count='input[aria-label="Audit count"]',vector='input[aria-label="Audit direction · 2"]';
  await a.until(`!!document.querySelector('input[aria-label="Audit scalar"]')`);
  await u.field(scalar,'2+2');await u.field(vector,'3*2');await u.field(count,'2+3.4');await u.field(vector,'1/0');
  assert.equal(await a.evaluate(`document.querySelector('input[aria-label="Audit direction · 2"]').getAttribute('aria-invalid')`),'true');
  await u.activate('.material-properties>header button');
  assert.equal(await a.evaluate(`document.querySelector('input[aria-label="Audit direction · 2"]').value`),'1/0');
  await a.evaluate(`document.querySelector('input[aria-label="Audit direction · 2"]').focus()`);await a.press('Escape');
  await blockedStudioSave22(a);const read=doc=>JSON.parse(decodeURIComponent(doc.assets.find(x=>x.uuid===ids[0]).source.split(',').slice(1).join(','))).uniforms;
  await u.activate('.material-properties>header button');const saved=await u.save('material-uniform-saved-22');
  assert.equal(read(saved.document).auditScalar,4);assert.equal(read(saved.document).auditCount,5);assert.deepEqual(read(saved.document).auditDirection,[1,6,3]);
  assert.equal(await a.evaluate(`document.querySelector('input[aria-label="Audit range"]').type`),'range');
  await u.open(saved.file);await graph();await a.click('.rendering-studio>.studio-header nav button',1);
  assert.equal(await a.evaluate(`document.querySelector('input[aria-label="Audit scalar"]').value`),'4');
  assert.equal(await a.evaluate(`document.querySelector('input[aria-label="Audit direction · 2"]').value`),'6');await a.capture('material-uniform-drafts');
 })
 await a.check('Malformed advanced JSON survives preview edits and corrected JSON saves intact',async()=>{
  await a.click('.rendering-studio>.studio-header nav button',2);
  await a.click('.advanced-toggle input');
  const raw='.shader-side details label:first-of-type textarea',shader='.shader-editor>textarea';
  await u.field(raw,'{"auditScalar":');
  assert.equal(await a.evaluate(`document.querySelector('${raw}').getAttribute('aria-invalid')`),'true');
  const original=await a.evaluate(`document.querySelector('${shader}').value`);
  await u.field(shader,original+'\n// preserve advanced draft');await wait(200);
  assert.equal(await a.evaluate(`document.querySelector('${raw}').value`),'{"auditScalar":');
  assert.equal(await a.evaluate(`document.querySelector('${raw}').getAttribute('aria-invalid')`),'true');
  await a.click('.manage-body>nav button',1);await graph();await a.click('.rendering-studio>.studio-header nav button',2);await a.click('.advanced-toggle input');
  assert.equal(await a.evaluate(`document.querySelector('${raw}').value`),'{"auditScalar":');
  await u.field(raw,JSON.stringify({auditScalar:7,auditCount:5,auditDirection:[1,6,3],auditRange:.5}));await wait(200);
  await a.click('.rendering-studio>.studio-header nav button',1);
  await u.activate('.material-properties>header button');
  const saved=await u.save('material-advanced-json-22');
  const material=JSON.parse(decodeURIComponent(saved.document.assets.find(x=>x.uuid===ids[0]).source.split(',').slice(1).join(',')));
  assert.equal(material.uniforms.auditScalar,7);assert.ok(material.fragment.includes('// preserve advanced draft'));
 })
 await a.check('Typed material numbers stay readable and reachable across three languages, scales and viewport widths',async()=>{
  const failures=[];
  for(const locale of ['en','de','zh'])for(const scale of [1,1.5,2]){
   await a.viewport(1440,900);await u.workspace('Manage');await a.click('.manage-body>nav button',1);
   await a.until(`!!document.querySelector('.settings-page select:has(option[value=de]):has(option[value=zh])')`);
   await a.select('.settings-page select:has(option[value=de]):has(option[value=zh])',locale);
   await a.evaluate(`document.querySelector('.settings-page input[type=range][min="1"][max="2"]').focus()`);await a.press('Home');for(let n=0;n<Math.round((scale-1)/.05);n++)await a.press('ArrowRight');await a.press('Tab');
   await a.click('.manage-body>nav button',5);await a.until(`!!document.querySelector('.rendering-studio')`);await a.click('.rendering-studio>.studio-header nav button',1);
   for(const width of [1024,1366,1920]){
    await a.viewport(width,768);await wait(100);
    const metrics=await a.evaluate(`(()=>{const c=document.createElement('canvas').getContext('2d');return [...document.querySelectorAll('.typed-uniforms input[data-numeric-expression]')].map(e=>{const s=getComputedStyle(e);c.font=s.fontStyle+' '+s.fontWeight+' '+s.fontSize+' '+s.fontFamily;return{field:e.dataset.resourceKey,width:e.clientWidth,digits:(e.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight))/c.measureText('0').width}})})()`);
    assert.equal(metrics.length,5);for(const m of metrics)if(m.digits+.1<6)failures.push({locale,scale,width,...m});a.observations.push({name:'material-uniform-layout',locale,scale,width,metrics});
    const reachability=await a.evaluate(`(()=>{const pane=document.querySelector('.rendering-studio>.section-scroll'),header=document.querySelector('.rendering-studio>.studio-header'),results=[];for(const e of document.querySelectorAll('.typed-uniforms input[data-numeric-expression]')){e.scrollIntoView({block:'center',inline:'nearest'});const r=e.getBoundingClientRect(),p=pane.getBoundingClientRect(),x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;results.push({field:e.dataset.resourceKey,reachable:r.width>0&&r.height>0&&x>=p.left&&x<=p.right&&y>=p.top&&y<=p.bottom&&document.elementFromPoint(x,y)===e})}return{paneHeight:pane.clientHeight,headerHeight:header.clientHeight,results}})()`);
    a.observations.push({name:'material-uniform-reachability',locale,scale,width,...reachability});assert.ok(reachability.paneHeight>=80,JSON.stringify({locale,scale,width,...reachability}));assert.ok(reachability.results.every(r=>r.reachable),JSON.stringify({locale,scale,width,...reachability}));
    if(scale===2&&width===1024)await a.capture(locale+'-large-material-uniforms');
   }
  }
  assert.deepEqual(failures,[]);
 })
})
