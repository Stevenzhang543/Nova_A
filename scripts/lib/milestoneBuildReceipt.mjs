/** 审计基础辅助库，校验上下文、声明身份和执行证据。 */
import assert from 'node:assert/strict'
import {readdir,readFile} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
/** Locate the unique active local qualification; never substitute a preceding build. */
/** 查找唯一正在运行且原生构建已通过的资格记录，并校验当前版本与源码快照摘要。 */ export async function activeMilestoneBuild(root,release){
 const engineVersion=JSON.parse(await readFile(join(root,'package.json'),'utf8')).version;assert.equal(engineVersion,release+'.0')
 const {verifyReleaseSnapshot}=await import(pathToFileURL(join(root,'scripts/release-source-snapshot.mjs')))
 const candidates=[]
 for(const item of await readdir(join(root,'release-audits'),{withFileTypes:true})){
  if(!item.isDirectory()||!item.name.startsWith('qualification-v'+release+'-'))continue
  const runRoot=join(root,'release-audits',item.name),receiptPath=join(runRoot,'executed-gates.json');let receipt
  try{receipt=JSON.parse(await readFile(receiptPath,'utf8'))}catch(error){if(error.code==='ENOENT')continue;throw error}
  if(receipt.status!=='running'||receipt.release!==release||receipt.machineVersion!==engineVersion)continue
  const native=receipt.gates.filter(/* 比较 gate.id 与 'native-build'，返回严格相等的判断结果。 */ gate=>gate.id==='native-build');if(native.length!==1||native[0].status!=='passed'||native[0].exitCode!==0)continue
  const snapshotPath=join(runRoot,'source-snapshot.json'),snapshot=await verifyReleaseSnapshot(snapshotPath,root)
  assert.equal(snapshot.sourceInputDigest,receipt.sourceInputDigest);assert.equal(native[0].sourceInputDigest,snapshot.sourceInputDigest)
  candidates.push({runRoot:resolve(runRoot),receiptPath:resolve(receiptPath),snapshotPath:resolve(snapshotPath),sourceInputDigest:snapshot.sourceInputDigest})
 }
 assert.equal(candidates.length,1,'Exactly one running qualification with the current successful native build is required')
 return candidates[0]
}
