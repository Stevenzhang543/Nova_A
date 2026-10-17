/** 仓库工具模块 repair-v26.21-reference-identities.mjs：供构建、资料生成或验证流程调用。 */
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const old='e18d824a-8cb6-4af0-8ae1-4d71aa38f7b0'
for(const name of ['ai-v57-perception-utility','creator-v60-top-down','gameplay-v54-twin-stick']) {
 const path='reference-projects/projects/'+name+'/project.nova',source=readFileSync(path,'utf8'),project=JSON.parse(source)
 const enemy=project.scenes.flatMap(/* 返回 s.entities 的当前值。 */ s=>s.entities).find(/* 比较 e.name 与 'Enemy'，返回严格相等的判断结果。 */ e=>e.name==='Enemy'),component=enemy.components.find(/* 比较 c.kind 与 'Health2D'，返回严格相等的判断结果。 */ c=>c.kind==='Health2D')
 const hash=createHash('sha256').update('nova-26.21-reference-repair:'+name+':'+enemy.uuid+':Health2D').digest();hash[6]=(hash[6]&15)|64;hash[8]=(hash[8]&63)|128
 const hex=hash.subarray(0,16).toString('hex'),next=[hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-')
 if(component.uuid===next){assert.equal(source.split(old).length-1,1);console.log('Verified '+path);continue}
 assert.ok(!process.argv.includes('--verify-only'),'Repair not applied: '+path)
 assert.equal(component.uuid,old);assert.equal(source.split(old).length-1,2,'Only the two definitions may use this UUID')
 const index=source.lastIndexOf(old),output=source.slice(0,index)+next+source.slice(index+old.length)
 component.uuid=next;assert.deepEqual(JSON.parse(output),project,'Exactly the Enemy Health2D UUID changes')
 writeFileSync(path,output);console.log('Repaired '+path+' -> '+next)
}
