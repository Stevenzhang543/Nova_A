/** 功能回归脚本：执行 verify-v26.23-property-authoring.mjs 对应场景，保留断言和证据输出。 */
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runAudit,writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
const root=process.cwd(),executions=[]
assert.equal(JSON.parse(await readFile('package.json','utf8')).version,'26.23.0','Release qualification requires aligned26.23 source and builds')
for(const name of ['studio-playback-user','path-draft-user','property-user','runtime-input-user','joint-user','scene-prefab-user','import-input-user','audio-draft-user','presentation-numeric-layout','advanced-inspector-user','device-render-user','settings-input-user','connection-draft-user','material-graph-user','particle-draft-user','event-draft-user','playback-stability-user','delivery-user']){const run=await runAudit(root,'scripts/verify-v'+(name==='delivery-user'?'26.23':'26.22')+'-'+name+'.mjs',['--qualification-release=26.23']);run.reports=['release-audits/v26.23-'+name+'.json'];executions.push(run)}
await writeAuditBundle(root,'26.23','property-authoring',executions)
