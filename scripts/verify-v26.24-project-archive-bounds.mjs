/** 项目 ZIP 资源边界回归：使用真实 Deflate 和可观测流验证伪造长度会提前取消，而非先收集完整解压结果。 */
import assert from 'node:assert/strict'
import {deflateRawSync} from 'node:zlib'
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {build} from 'vite'
/** 计算独立 ZIP 夹具的 CRC-32，标准多项式与公开 ZIP 格式保持一致。 */
function checksum(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0}
/** 创建一个中央目录和本地头均完整的项目条目；允许独立篡改声明长度以模拟攻击归档。 */
function archive(content,{method=8,declared=content.length,name='project.nova',crc=checksum(content)}={}){
  const payload=method===0?content:deflateRawSync(content),filename=Buffer.from(name),local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22)
  local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(method,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(payload.length,18);local.writeUInt32LE(declared,22);local.writeUInt16LE(filename.length,26)
  central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(method,10);central.writeUInt32LE(crc,16);central.writeUInt32LE(payload.length,20);central.writeUInt32LE(declared,24);central.writeUInt16LE(filename.length,28)
  end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+filename.length,12);end.writeUInt32LE(local.length+filename.length+payload.length,16)
  return new File([Buffer.concat([local,filename,payload,central,filename,end])],'project.zip')
}
const temporary=await mkdtemp(join(tmpdir(),'nova-archive24-')),original=globalThis.DecompressionStream
try{
  await build({configFile:false,logLevel:'error',build:{ssr:true,outDir:temporary,rollupOptions:{input:resolve('src/projects/projectArchive.ts'),output:{entryFileNames:'archive.mjs'}}}})
  const {readProjectArchive}=await import(pathToFileURL(join(temporary,'archive.mjs')))
  const content=Buffer.from('{"name":"归档 Ä","value":42}')
  for(const method of [0,8]){
    assert.equal((await readProjectArchive(archive(content,{method}))).source,content.toString())
    await assert.rejects(readProjectArchive(archive(content,{method,declared:1})),/length|limit/)
    await assert.rejects(readProjectArchive(archive(content,{method,declared:content.length+1})),/length|limit/)
    await assert.rejects(readProjectArchive(archive(content,{method,crc:0})),/checksum/)
  }
  await assert.rejects(readProjectArchive(archive(Buffer.alloc(2*1024*1024,65),{declared:1})),/declared length|limit/)
  await assert.rejects(readProjectArchive(archive(content,{declared:64*1024*1024+1})),/too large/)
  await assert.rejects(readProjectArchive(archive(content,{name:'../project.nova'})),/Unsafe/)
  await assert.rejects(readProjectArchive(archive(Buffer.from([0xff]))),TypeError)
  assert.equal((await readProjectArchive(archive(Buffer.alloc(0)))).source,'')
  let pulls=0,cancelled=false
  globalThis.DecompressionStream=class {
    /** 提供按需产出的测试流，模拟解压器持续输出；不分配完整攻击载荷。 */
    constructor(){this.writable=new WritableStream();this.readable=new ReadableStream({
      /** 每次最多生成一小块，让测试能观测消费端是否在超限时停止继续读取。 */
      pull(controller){pulls++;controller.enqueue(new Uint8Array(1024));if(pulls===100)controller.close()},
      /** 记录消费端是否显式取消超限流。 */
      cancel(){cancelled=true}
    })}
  }
  await assert.rejects(readProjectArchive(archive(content,{declared:1})),/declared length|limit/)
  assert.equal(cancelled,true,'Overflow must cancel the decompression stream')
  assert.ok(pulls<=2,'Do not drain the complete forged stream: '+pulls)
  await mkdir('release-audits',{recursive:true})
  const report={format:'nova-v26.24-project-archive-bounds',version:1,targetRelease:'26.24',generatedAt:new Date().toISOString(),status:'passed',streamCancelled:cancelled,streamPulls:pulls,realDeflateForgedOutputBytes:2*1024*1024,scope:'Stored/Deflate UTF-8 round trips, CRC and path rejection, declared/global size bounds and observable early stream cancellation.'}
  await writeFile('release-audits/v26.24-project-archive-bounds.json',JSON.stringify(report)+'\n')
  console.log(JSON.stringify(report))
}finally{globalThis.DecompressionStream=original;await rm(temporary,{recursive:true,force:true})}
