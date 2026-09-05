import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {join,resolve} from 'node:path'
/** Bind fixture reports to their actual source/package; an overlay never becomes production evidence. */
export async function assetAuditMetadata(repository,sourceRoot){
 const root=resolve(repository),source=resolve(sourceRoot),packageRoot=existsSync(join(source,'package.json'))?source:root
 const engineVersion=JSON.parse(await readFile(join(packageRoot,'package.json'),'utf8')).version,development=source!==root
 if(!development)assert.equal(engineVersion,'26.15.0','Integrated15 corpus requires the actual15 package')
 return{release:'26.15',engineVersion,expectedRelease:'26.15',development,qualifiedRelease:development?null:'26.15',sourceMode:development?'isolated-source-overlay':'integrated-source',generatedAt:new Date().toISOString()}
}
