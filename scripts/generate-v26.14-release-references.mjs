/** 版本26.14：生成参考项目与对应资源，供功能演示和版本验证使用。 */
import assert from 'node:assert/strict'
import {readFile,readdir} from 'node:fs/promises'
import {join} from 'node:path'
import {dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {runAudit} from './lib/milestoneAuditBundle.mjs'
const root=dirname(dirname(fileURLToPath(import.meta.url)))
for(const script of ['generate-v26.14-core-references.mjs','generate-v26.14-reference-projects.mjs'])await runAudit(root,'scripts/'+script,process.argv.includes('--verify-only')?['--verify-only']:[])

// Match the package boundary before qualification can pass.
for(const item of await readdir(join(root,'reference-projects/projects'),{withFileTypes:true})){
 if(!item.isDirectory())continue
 const folder=join(root,'reference-projects/projects',item.name)
 let project;try{project=JSON.parse(await readFile(join(folder,'project.nova'),'utf8'))}catch(error){if(error.code==='ENOENT')continue;throw error}
 if(project.engineVersion!=='26.14.0')continue
 const readme=await readFile(join(folder,'README.md'),'utf8'),expected=JSON.parse(await readFile(join(folder,'expected-output.json'),'utf8')),controls=JSON.parse(await readFile(join(folder,'test-controls.json'),'utf8'))
 assert.match(readme,/Engine \*\*26\.14\.0\*\*/,item.name)
 for(const value of[expected,controls]){assert.equal(value.release,'26.14');assert.equal(value.engineVersion,'26.14.0');assert.equal(value.reference,item.name);assert.equal(value.projectFormat,2);assert.equal(value.schema,29);assert.ok(value.authoring?.trim())}
 assert.equal(expected.authoring,controls.authoring);assert.ok(controls.classification.length);assert.ok(controls.actions.length);for(const action of controls.actions){assert.ok(action.action.trim());assert.ok(action.expected.trim())}
}
console.log('Current reference metadata matches the release packaging contract.')
