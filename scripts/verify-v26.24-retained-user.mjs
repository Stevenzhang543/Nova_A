/** 26.24 用户回归集合：保留编辑、属性、运行与导出流程；每项使用实际浏览器输入并单独记录证据。 */
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runAudit,writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
assert.equal(JSON.parse(await readFile('package.json','utf8')).version,'26.24.0')
const tasks=[
 ['26.24','inventory-user',[],'inventory-user'],['26.24','static-host-user',[],'static-host-user'],
 ['26.23','launcher-advanced-user',[],'launcher-advanced-user'],['26.23','shell-user',[],'shell-user'],['26.23','idle-resume',[],'idle-resume'],
 ['26.22','layout-user',[],'layout-user'],['26.22','foundations-user',[],'foundations-user'],['26.22','hierarchy-user',[],'hierarchy-user'],['26.22','palettes-user',[],'palette-user'],['26.22','palettes-user',['--layout'],'palette-layout'],['26.22','quality-user',[],'quality-user'],['26.22','menu-user',[],'menu-user'],['26.22','package-user',[],'package-user'],
 ['26.21','delivery-user',[],'delivery-user'],
]
for(const name of ['studio-playback-user','path-draft-user','property-user','runtime-input-user','joint-user','scene-prefab-user','import-input-user','audio-draft-user','presentation-numeric-layout','advanced-inspector-user','device-render-user','settings-input-user','connection-draft-user','material-graph-user','particle-draft-user','event-draft-user','playback-stability-user'])tasks.push(['26.22',name,[],name])
const executions=[]
for(const [origin,name,args,report] of tasks){
 const run=await runAudit(process.cwd(),'scripts/verify-v'+origin+'-'+name+'.mjs',[...args,'--qualification-release=26.24'])
 run.reports=['release-audits/v26.24-'+report+'.json'];executions.push(run)
}
await writeAuditBundle(process.cwd(),'26.24','retained-user',executions)
