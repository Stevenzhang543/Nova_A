/** 真实模块及原生渲染审计辅助库，构建隔离环境并核验证据。 */
import {captureNodeBundle22,registerNodeBundle22} from './nodeOperationTrace22.mjs'
import assert from 'node:assert/strict'
import {build} from 'vite'
import {existsSync,statSync} from 'node:fs'
import {mkdir,mkdtemp,rm,readFile} from 'node:fs/promises'
import {dirname,join,resolve,sep,relative,isAbsolute} from 'node:path'
import {pathToFileURL} from 'node:url'
/** Real production modules; only missing browser host surfaces are inert in this Node CPU/format audit. */
/** 搭建隔离的真实模块审计环境，按源码优先级构建导入并提供清理和 WASM 初始化入口。 */ export async function openMediaAuditModules(context,entries){
 const {repository:root,bases}=context
 Object.assign(globalThis,{window:globalThis,location:{href:'https://nova.local/'},localStorage:{getItem:/* 返回固定值 null。 */ ()=>null,/** 存储桩忽略写入，不持久化审计数据。 */ setItem(){},/** 存储桩忽略删除操作。 */ removeItem(){}},/** 环境桩不注册全局事件监听。 */ addEventListener(){},/** 环境桩不执行全局事件移除。 */ removeEventListener(){},document:{documentElement:{dataset:{},style:{/** 样式桩忽略自定义属性写入。 */ setProperty(){}}},fonts:{/** 字体集合桩忽略字体注册。 */ add(){},/* 返回固定值 true。 */ delete(){return true}},createElement:/** 创建只提供空绘图上下文的元素桩。 */ ()=>({getContext:/* 返回固定值 null。 */ ()=>null})}})
 // A fresh checkout has no ignored cache directory yet.
 await mkdir(join(root,'.cache'),{recursive:true})
 const temporary=await mkdtemp(join(root,'.cache','nova-v2616-media-corpus-'))
 const locate=/** 按源码覆盖顺序定位真实模块，找不到时中止。 */ path=>{const file=bases.map(/* 调用 join(base,'src',path+'.ts') 并返回调用结果。 */ base=>join(base,'src',path+'.ts')).find(existsSync);assert.ok(file,'Missing real module '+path);return file}
 const overlay={name:'media-corpus-overlay',enforce:'pre',/** 为相对导入按覆盖源码根与扩展名优先级解析实际文件。 */ resolveId(source,importer){if(!importer||!source.startsWith('.'))return null;const raw=resolve(dirname(importer.split('?')[0]),source),prefix=bases.map(/* 调用 join(base,'src') 并返回调用结果。 */ base=>join(base,'src')).find(/* 调用 raw.startsWith(prefix+sep) 并返回调用结果。 */ prefix=>raw.startsWith(prefix+sep));if(!prefix)return null;for(const base of bases)for(const ext of['','.ts','.json','.js','/index.ts']){const file=join(base,'src',raw.slice(prefix.length+1)+ext);if(existsSync(file)&&statSync(file).isFile())return file.replaceAll('\\','/')}return null}}
 const close=/** 确认临时目录属于指定缓存前缀，按需采集追踪后删除临时产物。 */ async()=>{const suffix=relative(join(root,'.cache'),temporary);assert.ok(suffix.startsWith('nova-v2616-media-corpus-')&&!isAbsolute(suffix)&&!suffix.startsWith('..'));if(process.env.NOVA_AUDIT_NODE_OPERATION_COVERAGE==='1')await captureNodeBundle22(temporary);await rm(temporary,{recursive:true,force:true})}
 const inputs=Object.fromEntries(Object.entries(entries).map(/* 返回按声明顺序构造的数组 [name,locate(path)]。 */ ([name,path])=>[name,locate(path)]));if(context.initializeBundledWasm)inputs.__wasm=join(root,'nova_core/pkg/nova_core.js')
 try{await build({configFile:false,root,plugins:[overlay],logLevel:'error',ssr:{noExternal:true},build:{ssr:true,sourcemap:process.env.NOVA_AUDIT_NODE_OPERATION_COVERAGE==='1'?'hidden':false,outDir:temporary,emptyOutDir:false,rollupOptions:{input:inputs,output:{entryFileNames:'[name].mjs'}}}})
 registerNodeBundle22(temporary)
 const modules=Object.fromEntries(await Promise.all(Object.keys(inputs).map(/* 返回按声明顺序构造的数组 [name,await import(pathToFileURL(join(temporary,name+'.mjs')).href)]。 */ async name=>[name,await import(pathToFileURL(join(temporary,name+'.mjs')).href)])))
 if(context.initializeBundledWasm)modules.__wasm.initSync({module:await readFile(join(root,'nova_core/pkg/nova_core_bg.wasm'))})
 // Disable only background history/source-control timers after real module construction.
 globalThis.window={setTimeout:/* 返回固定值 0。 */ ()=>0,/** 禁止后台计时环境中的清除操作为空实现。 */ clearTimeout(){},/** 模块构造后环境桩不注册后台事件。 */ addEventListener(){},/** 模块构造后环境桩不处理后台事件移除。 */ removeEventListener(){},...(context.initializeBundledWasm?{performance:globalThis.performance}:{})}
 return{modules,locate,close,/** 读取并初始化仓库 WASM 模块，返回模块、原始字节和路径。 */ async wasm(){const dir=join(root,'nova_core/pkg'),module=await import(pathToFileURL(join(dir,'nova_core.js')).href),bytes=await readFile(join(dir,'nova_core_bg.wasm'));module.initSync({module:bytes});return{module,bytes,path:join(dir,'nova_core_bg.wasm')}}}
 }catch(error){await close();throw error}
}
export const mediaUuid=/* 计算表达式 n.toString(16).padStart(8,'0')+'-0000-4000-8000-000000000000' 并返回结果，沿用操作数的原有类型规则。 */ n=>n.toString(16).padStart(8,'0')+'-0000-4000-8000-000000000000'
