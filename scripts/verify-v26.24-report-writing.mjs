/** 发布报告写入回归：确认紧凑格式无损且无效数据不会覆盖已有报告。 */
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeJson } from './release-qualification.mjs'
const directory=await mkdtemp(join(tmpdir(),'nova-report24-')),path=join(directory,'evidence.json')
try{
  const value={label:'中德英完整证据',nested:Array.from({length:10000},/* 生成可重复的深层布局记录，验证数组顺序与转义文本。 */ (_,index)=>({index,rows:[{label:'第一行\n第二行',visible:true,bounds:{x:index,y:index===0?0:-index,width:200,height:40}}]})),empty:null}
  await writeJson(path,value)
  const bytes=await readFile(path,'utf8')
  assert.equal(bytes,JSON.stringify(value)+'\n')
  assert.deepEqual(JSON.parse(bytes),value)
  const cyclic={};cyclic.self=cyclic
  assert.throws(/* 循环对象必须在写文件前失败，保留上一份完整结果。 */ ()=>writeJson(path,cyclic),/circular/i)
  assert.equal(await readFile(path,'utf8'),bytes)
  assert.throws(/* JSON 不支持的数值类型必须明确拒绝，不能悄悄丢失字段。 */ ()=>writeJson(path,{value:1n}),/BigInt/i)
  assert.equal(await readFile(path,'utf8'),bytes)
  console.log(JSON.stringify({status:'passed',rows:value.nested.length,compactBytes:Buffer.byteLength(bytes),prettyBytes:Buffer.byteLength(JSON.stringify(value,null,2)),scope:'Report serialization only; not full release qualification.'}))
}finally{await rm(directory,{recursive:true,force:true})}

