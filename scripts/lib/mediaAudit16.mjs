import assert from 'node:assert/strict'
import {build} from 'vite'
import {existsSync,statSync} from 'node:fs'
import {mkdtemp,rm,readFile} from 'node:fs/promises'
import {dirname,join,resolve,sep,relative,isAbsolute} from 'node:path'
import {pathToFileURL} from 'node:url'
/** Real production modules; only missing browser host surfaces are inert in this Node CPU/format audit. */
export async function openMediaAuditModules(context,entries){
 const {repository:root,bases}=context
 Object.assign(globalThis,{window:globalThis,location:{href:'https://nova.local/'},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},addEventListener(){},removeEventListener(){},document:{documentElement:{dataset:{},style:{setProperty(){}}},fonts:{add(){},delete(){return true}},createElement:()=>({getContext:()=>null})}})
 const temporary=await mkdtemp(join(root,'.cache','nova-v2616-media-corpus-'))
 const locate=path=>{const file=bases.map(base=>join(base,'src',path+'.ts')).find(existsSync);assert.ok(file,'Missing real module '+path);return file}
 const overlay={name:'media-corpus-overlay',enforce:'pre',resolveId(source,importer){if(!importer||!source.startsWith('.'))return null;const raw=resolve(dirname(importer.split('?')[0]),source),prefix=bases.map(base=>join(base,'src')).find(prefix=>raw.startsWith(prefix+sep));if(!prefix)return null;for(const base of bases)for(const ext of['','.ts','.json','.js','/index.ts']){const file=join(base,'src',raw.slice(prefix.length+1)+ext);if(existsSync(file)&&statSync(file).isFile())return file.replaceAll('\\','/')}return null}}
 const close=async()=>{const suffix=relative(join(root,'.cache'),temporary);assert.ok(suffix.startsWith('nova-v2616-media-corpus-')&&!isAbsolute(suffix)&&!suffix.startsWith('..'));await rm(temporary,{recursive:true,force:true})}
 try{await build({configFile:false,root,plugins:[overlay],logLevel:'error',ssr:{noExternal:true},build:{ssr:true,outDir:temporary,emptyOutDir:false,rollupOptions:{input:Object.fromEntries(Object.entries(entries).map(([name,path])=>[name,locate(path)])),output:{entryFileNames:'[name].mjs'}}}})
 const modules=Object.fromEntries(await Promise.all(Object.keys(entries).map(async name=>[name,await import(pathToFileURL(join(temporary,name+'.mjs')).href)])))
 // Disable only background history/source-control timers after real module construction.
 globalThis.window={setTimeout:()=>0,clearTimeout(){},addEventListener(){},removeEventListener(){}}
 return{modules,locate,close,async wasm(){const dir=join(root,'nova_core/pkg'),module=await import(pathToFileURL(join(dir,'nova_core.js')).href),bytes=await readFile(join(dir,'nova_core_bg.wasm'));module.initSync({module:bytes});return{module,bytes,path:join(dir,'nova_core_bg.wasm')}}}
 }catch(error){await close();throw error}
}
export const mediaUuid=n=>n.toString(16).padStart(8,'0')+'-0000-4000-8000-000000000000'
