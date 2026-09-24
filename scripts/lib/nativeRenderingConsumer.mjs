/** 渲染与进程审计辅助库，验证实际产物并提取有界诊断。 */
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {gunzipSync} from 'node:zlib'
const sha=/* 调用 createHash('sha256').update(bytes).digest('hex') 并返回调用结果。 */ bytes=>createHash('sha256').update(bytes).digest('hex')
/** Independent inspection of the actual SDK output; never constructs or substitutes a player. */
/** 验证26.15原生游戏前缀、嵌入包边界与散列，解包后对照实际保存场景和渲染设置。 */ export function inspectRenderingGame(bytes,template,savedProject){
 assert.ok(bytes.length>48,'Embedded game is truncated')
 const footer=bytes.length-48;assert.equal(bytes.subarray(footer,footer+8).toString('ascii'),'NOVAPK2!','Actual SDK game must carry its embedded package footer')
 const length=Number(bytes.readBigUInt64LE(footer+8));assert.ok(Number.isSafeInteger(length)&&length>16&&length<=64*1024*1024&&length<footer,'Bounded embedded rendering package')
 const start=footer-length,pack=bytes.subarray(start,footer)
 assert.equal(start,template.bytes,'Exported PE prefix length must match qualified template');assert.equal(sha(bytes.subarray(0,start)),template.sha256,'Exported PE prefix must equal qualified template bytes')
 assert.equal(sha(pack),bytes.subarray(footer+16).toString('hex'),'Embedded package checksum')
 assert.equal(pack.subarray(0,8).toString('binary'),'NOVAPAK\0');assert.equal(pack.readUInt32LE(8),1)
 const indexLength=pack.readUInt32LE(12);assert.ok(indexLength>0&&indexLength<=16*1024*1024&&indexLength+16<pack.length,'Bounded package index')
 const index=JSON.parse(pack.subarray(16,16+indexLength).toString()),dataStart=16+indexLength,files=new Map();let total=0
 assert.equal(index.format,'nova-pak');assert.equal(index.version,1);assert.equal(index.engineVersion,'26.15.0');assert.ok(Array.isArray(index.entries)&&index.entries.length>0&&index.entries.length<=16384)
 for(const entry of index.entries){
  assert.ok(typeof entry.path==='string'&&entry.path&&!entry.path.includes('\\')&&!entry.path.includes(':')&&!entry.path.split('/').some(/* 先计算 !part||part==='.'；仅当其为假值时求右侧 part==='..'，返回短路求值结果。 */ part=>!part||part==='.'||part==='..')&&!files.has(entry.path),'Safe unique embedded path')
  for(const value of[entry.offset,entry.length,entry.originalLength])assert.ok(Number.isSafeInteger(value)&&value>=0,'Bounded package entry')
  total+=entry.originalLength;assert.ok(entry.originalLength<=32*1024*1024&&total<=128*1024*1024&&dataStart+entry.offset+entry.length<=pack.length,'Bounded decoded package bytes');assert.ok(entry.codec==='gzip'||entry.codec==='store','Known package codec')
  const stored=pack.subarray(dataStart+entry.offset,dataStart+entry.offset+entry.length),decoded=entry.codec==='gzip'?gunzipSync(stored,{maxOutputLength:32*1024*1024}):stored
  assert.equal(decoded.length,entry.originalLength);assert.equal(sha(decoded),entry.sha256);files.set(entry.path,decoded)
 }
 assert.ok(files.has('project.nova'));const project=JSON.parse(files.get('project.nova').toString());assert.equal(project.engineVersion,'26.15.0')
 assert.deepEqual(project.scenes,savedProject.scenes,'SDK export must preserve the exact visibly saved scenes')
 assert.deepEqual(project.projectSettings.rendering,savedProject.projectSettings.rendering,'SDK export must preserve authored rendering settings')
 assert.equal(project.projectSettings.build.target,'windows');assert.equal(project.projectSettings.build.runtimeMode,'game');assert.equal(project.projectSettings.rendering.lightingEnabled,true)
 return{packageBytes:pack.length,packageSha256:sha(pack),projectSha256:sha(files.get('project.nova')),entries:index.entries.length,prefixSha256:sha(bytes.subarray(0,start))}
}
/** 核验26.15浏览器报告资格、新鲜度及保存项目和三个真实像素证据。 */ export function validateRenderingUserEvidence(report,nativeBuildCompletedAt){
 assert.equal(report.status,'passed');assert.equal(report.release,'26.15');assert.equal(report.expectedRelease,'26.15');assert.equal(report.qualifiedRelease,'26.15');assert.equal(report.development,false)
 assert.ok(Array.isArray(report.checks)&&report.checks.length>=4&&report.checks.every(/* 比较 check.status 与 'passed'，返回严格相等的判断结果。 */ check=>check.status==='passed'),'Actual browser authoring must pass first')
 const created=Date.parse(report.generatedAt),built=Date.parse(nativeBuildCompletedAt);assert.ok(Number.isFinite(created)&&Number.isFinite(built)&&created>=built&&created<=Date.now()+1000,'Browser authoring must follow this actual native build')
 const project=report.observations?.find(/* 比较 item.name 与 'downloaded-lit-project'，返回严格相等的判断结果。 */ item=>item.name==='downloaded-lit-project'),web=report.observations?.find(/* 比较 item.name 与 'actual-export-player'，返回严格相等的判断结果。 */ item=>item.name==='actual-export-player')
 assert.ok(project&&typeof project.artifact==='string'&&/^[a-f0-9]{64}$/.test(project.sha256)&&Number.isSafeInteger(project.bytes)&&project.bytes>0&&project.bytes<=32*1024*1024,'Exact saved user project identity is required')
 assert.ok(web?.engineVersion==='26.15.0'&&Array.isArray(web.pixels)&&web.pixels.length===3&&web.pixels.every(/* 先计算 Array.isArray(pixel)&&pixel.length===4；仅当其为真值时求右侧 pixel.every(value=>Number.isInteger(value)&&value>=0&&value<=255)，返回短路求值结果。 */ pixel=>Array.isArray(pixel)&&pixel.length===4&&pixel.every(/* 先计算 Number.isInteger(value)&&value>=0；仅当其为真值时求右侧 value<=255，返回短路求值结果。 */ value=>Number.isInteger(value)&&value>=0&&value<=255)),'Three real browser player pixel oracles are required')
 return{project,web}
}

/** 要求导出清单只含一个安全且自有的根目录游戏可执行文件。 */ export function selectRenderingExecutable(report){
 const files=report.files?.filter(/* 先计算 typeof file?.path==='string'；仅当其为真值时求右侧 /^[^/\\]+\.exe$/i.test(file.path)，返回短路求值结果。 */ file=>typeof file?.path==='string'&&/^[^/\\]+\.exe$/i.test(file.path))??[]
 assert.equal(files.length,1,'Exactly one root game executable must be declared')
 const file=files[0];assert.ok(file.path!=='.'&&!file.path.includes('..')&&report.ownedFiles?.includes(file.path),'Game executable must be a safe owned output')
 return file
}
