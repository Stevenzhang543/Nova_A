/** 功能回归脚本：执行 verify-v26.22-component-order.mjs 对应场景，保留断言和证据输出。 */
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {propertyAudit22} from './lib/propertyAudit22.mjs'
import {openMediaAuditModules} from './lib/mediaAudit16.mjs'
const audit=await propertyAudit22('component-order'),opened=await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{physics:'store/physics'}),checks=[];
try{const p=opened.modules.physics;assert.ok(p.loadProject(await readFile('reference-projects/projects/creator-v2622-code-game/project.nova','utf8')));const before=JSON.parse(p.getSceneJSON());for(let cycle=0;cycle<50;cycle++){assert.ok(p.loadProject(JSON.stringify(before)));assert.deepEqual(JSON.parse(p.getSceneJSON()),before,'Hydration changed authored component order at cycle '+cycle)}checks.push({name:'Fifty project hydrations preserve component order identities removed records and exact authored values',status:'passed'});console.log('PASS '+checks[0].name)}finally{await opened.close()}
await audit.write(checks,'Actual production project hydration and serialization. Separate browser playback smoke checks the real Play/Pause/Stop boundary.')
