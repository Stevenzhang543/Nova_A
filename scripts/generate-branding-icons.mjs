/** Reproduce the supplied opaque artwork with the pinned local Tauri icon generator. */
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {basename, dirname, join, resolve, sep} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const MANIFEST = 'src/assets/branding/manifest.json'
export const ORIGINALS = [
 {theme:'light',path:'src/assets/branding/nova-light-original.png',providedFileName:'ChatGPT Image Oct 3, 2026, 12_15_54 PM-3.png',sha256:'770d58a662ab96017b4b75b4f069d872795719c426acbd3f50851e0653b32225'},
 {theme:'dark',path:'src/assets/branding/nova-dark-original.png',providedFileName:'ChatGPT Image Oct 3, 2026, 12_15_55 PM-4.png',sha256:'1689d4e48846e16b60ce5b199de660844c053525fad62d64e03f2b44bfb9c787'}
]
export const NATIVE_FILES = ['32x32.png','128x128.png','128x128@2x.png','icon.png','icon.ico','icon.icns','Square30x30Logo.png','Square44x44Logo.png','Square71x71Logo.png','Square89x89Logo.png','Square107x107Logo.png','Square142x142Logo.png','Square150x150Logo.png','Square284x284Logo.png','Square310x310Logo.png','StoreLogo.png']
export const DERIVATIVES = [
 {path:'src/assets/branding/nova-light-256.png',theme:'light',size:256},
 {path:'src/assets/branding/nova-dark-256.png',theme:'dark',size:256},
 {path:'src/assets/branding/nova-dark-32.png',theme:'dark',size:32},
 {path:'public/branding/nova-light-256.png',theme:'light',size:256},
 {path:'public/branding/nova-dark-256.png',theme:'dark',size:256},
 {path:'public/nova-icon-light-32.png',theme:'light',size:32},
 {path:'public/nova-icon-32.png',theme:'dark',size:32},
 {path:'public/nova-icon-192.png',theme:'dark',size:192},
 {path:'public/nova-icon-512.png',theme:'dark',size:512},
 ...NATIVE_FILES.map(name=>({path:'src-tauri/icons/'+name,theme:'dark',nativeName:name}))
]
export const sha256 = bytes=>createHash('sha256').update(bytes).digest('hex')
export function span(bytes,offset,size,label='binary range') {
 assert.ok(Number.isSafeInteger(offset)&&Number.isSafeInteger(size)&&offset>=0&&size>=0&&offset<=bytes.length-size,label+' is within file bounds')
 return bytes.subarray(offset,offset+size)
}
export function pngInformation(bytes) {
 assert.ok(span(bytes,0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),'PNG signature')
 assert.equal(bytes.readUInt32BE(8),13);assert.equal(bytes.toString('ascii',12,16),'IHDR')
 span(bytes,16,13);const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),bitDepth=bytes[24],colorType=bytes[25]
 assert.ok(width>0&&height>0&&width<=2048&&height<=2048,'Bounded branding dimensions')
 assert.equal(bitDepth,8);assert.ok([2,6].includes(colorType),'RGB or RGBA artwork');assert.equal(bytes[26],0);assert.equal(bytes[27],0);assert.equal(bytes[28],0,'Non-interlaced artwork')
 return {width,height,bitDepth,colorType,colorTypeName:colorType===2?'RGB':'RGBA',...(colorType===2?{opaque:true}:{})}
}
export function icoFamily(bytes) {
 span(bytes,0,6);assert.equal(bytes.readUInt16LE(0),0);assert.equal(bytes.readUInt16LE(2),1)
 const count=bytes.readUInt16LE(4);assert.ok(count>0&&count<=32);span(bytes,6,count*16)
 return Array.from({length:count},(_,i)=>{
  const at=6+i*16,header=bytes.subarray(at,at+12),size=bytes.readUInt32LE(at+8),offset=bytes.readUInt32LE(at+12),payload=span(bytes,offset,size,'ICO image')
  assert.ok(offset>=6+count*16);const png=pngInformation(payload),width=bytes[at]||256,height=bytes[at+1]||256
  assert.equal(png.width,width);assert.equal(png.height,height)
  return {width,height,colorCount:bytes[at+2],planes:bytes.readUInt16LE(at+4),bitCount:bytes.readUInt16LE(at+6),bytes:size,sha256:sha256(payload),header,payload}
 })
}
export function icnsFamily(bytes) {
 assert.equal(span(bytes,0,4).toString('ascii'),'icns');assert.equal(bytes.readUInt32BE(4),bytes.length)
 const chunks=[];let at=8
 while(at<bytes.length){span(bytes,at,8);const type=bytes.toString('ascii',at,at+4),length=bytes.readUInt32BE(at+4);assert.ok(length>=8);const chunk=span(bytes,at,length,'ICNS chunk'),payload=chunk.subarray(8);chunks.push({type,bytes:payload.length,sha256:sha256(payload),...(payload.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))?pngInformation(payload):{}),chunk});at+=length;assert.ok(chunks.length<=32)}
 assert.equal(at,bytes.length);assert.equal(new Set(chunks.map(c=>c.type)).size,chunks.length)
 return chunks
}
const summary = ({header,payload,chunk,...value})=>value
export async function createBrandingManifest() {
 const originals=[]
 for(const record of ORIGINALS){const bytes=await readFile(join(ROOT,record.path));assert.equal(sha256(bytes),record.sha256,'Supplied original is unchanged: '+record.path);const png=pngInformation(bytes);assert.equal(png.width,1254);assert.equal(png.height,1254);assert.equal(png.colorType,2);originals.push({...record,bytes:bytes.length,...png})}
 const derivatives=[]
 for(const record of DERIVATIVES){const bytes=await readFile(join(ROOT,record.path)),format=record.path.endsWith('.png')?'png':record.path.endsWith('.ico')?'ico':'icns';derivatives.push({...record,format,bytes:bytes.length,sha256:sha256(bytes),sourceSha256:ORIGINALS.find(o=>o.theme===record.theme).sha256,...(format==='png'?pngInformation(bytes):{family:(format==='ico'?icoFamily(bytes):icnsFamily(bytes)).map(summary)})})}
 return {format:'nova-branding-assets',version:1,introducedIn:'26.36',generator:{tool:'@tauri-apps/cli',version:'2.11.4',command:'node scripts/generate-branding-icons.mjs',operations:'Tauri resampling and icon-container packaging only; no crop, recoloring, background removal, redesign or alpha cutout. Container member order is retained from this manifest for byte reproduction.',opaqueBackground:'The supplied opaque rounded-square backgrounds remain part of the artwork.',nativeVariant:'dark',trackedOutputPolicy:'Only the existing 25 derivative paths are copied. Temporary mobile families from Tauri default generation are not included in the repository.'},originals,derivatives}
}
function orderedContainer(bytes,record) {
 if(!record)return bytes
 if(record.format==='icns'){
  const chunks=icnsFamily(bytes),ordered=record.family.map(item=>{const found=chunks.find(c=>c.type===item.type);assert.ok(found,'Generated ICNS member '+item.type);return found.chunk})
  assert.equal(ordered.length,chunks.length);const result=Buffer.concat([bytes.subarray(0,8),...ordered]);result.writeUInt32BE(result.length,4);return result
 }
 if(record.format==='ico'){
  const images=icoFamily(bytes),ordered=record.family.map(item=>{const found=images.find(c=>c.width===item.width&&c.height===item.height&&c.bitCount===item.bitCount);assert.ok(found,'Generated ICO member '+item.width);return found})
  assert.equal(ordered.length,images.length);let offset=6+16*ordered.length;const headers=ordered.map(item=>{const h=Buffer.alloc(16);item.header.copy(h);h.writeUInt32LE(offset,12);offset+=item.payload.length;return h});return Buffer.concat([bytes.subarray(0,6),...headers,...ordered.map(item=>item.payload)])
 }
 return bytes
}
export async function generateBrandingIcons({check=false,manifestOnly=false}={}) {
 // Verify immutable originals before any staged generation or destination write.
 for(const record of ORIGINALS){const bytes=await readFile(join(ROOT,record.path));assert.equal(sha256(bytes),record.sha256,'Original source hash');const png=pngInformation(bytes);assert.equal(png.colorType,2);assert.equal(png.width,1254);assert.equal(png.height,1254)}
 if(manifestOnly){assert.equal(check,false,'Choose manifest-only or check');const manifest=await createBrandingManifest();await writeFile(join(ROOT,MANIFEST),JSON.stringify(manifest,null,2)+'\n');return manifest}
 const cli=join(ROOT,'node_modules/@tauri-apps/cli/tauri.js'),pkg=JSON.parse(await readFile(join(ROOT,'node_modules/@tauri-apps/cli/package.json'),'utf8'));assert.equal(pkg.version,'2.11.4','Pinned local Tauri generator required; no download or dependency change')
 let previous;try{previous=JSON.parse(await readFile(join(ROOT,MANIFEST),'utf8'))}catch(error){if(error.code!=='ENOENT')throw error}
 const cache=resolve(ROOT,'.cache');await mkdir(cache,{recursive:true});const staging=await mkdtemp(join(cache,'branding-icon-generation-'))
 const call=(theme,out,sizes)=>{const args=[cli,'icon',join(ROOT,ORIGINALS.find(o=>o.theme===theme).path),'--output',join(staging,out),...(sizes??[]).flatMap(size=>['--png',String(size)])];const result=spawnSync(process.execPath,args,{cwd:ROOT,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:2*1024*1024});assert.ifError(result.error);assert.equal(result.status,0,'Tauri generation failed: '+(result.stderr||result.stdout).slice(-2000))}
 try{
  call('dark','native');call('light','light',[32,256]);call('dark','dark',[32,192,256,512])
  const outputs=[]
  for(const record of DERIVATIVES){const from=join(staging,record.nativeName?'native':record.theme,record.nativeName??(record.size+'x'+record.size+'.png'));const bytes=orderedContainer(await readFile(from),previous?.derivatives.find(d=>d.path===record.path));outputs.push({record,bytes})}
  if(check){for(const {record,bytes} of outputs)assert.ok(bytes.equals(await readFile(join(ROOT,record.path))),'Reproduction differs: '+record.path);assert.ok(previous,'Committed provenance manifest exists');assert.ok(JSON.stringify(await createBrandingManifest())===JSON.stringify(previous),'Manifest matches reproduced files');console.log('Branding reproduction passed: 25 existing derivatives; originals unchanged');return previous}
  for(const {record,bytes} of outputs){await mkdir(dirname(join(ROOT,record.path)),{recursive:true});await writeFile(join(ROOT,record.path),bytes)}
  const manifest=await createBrandingManifest();await writeFile(join(ROOT,MANIFEST),JSON.stringify(manifest,null,2)+'\n');console.log('Generated 25 tracked branding derivatives and provenance manifest');return manifest
 }finally{
  const target=resolve(staging);assert.ok(target.startsWith(cache+sep)&&basename(target).startsWith('branding-icon-generation-'),'Staging cleanup stays within the intended cache directory');await rm(target,{recursive:true,force:true})
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const allowed=new Set(['--check','--manifest-only']);assert.ok(process.argv.slice(2).every(arg=>allowed.has(arg)),'Supported arguments: --check, --manifest-only');await generateBrandingIcons({check:process.argv.includes('--check'),manifestOnly:process.argv.includes('--manifest-only')})}
