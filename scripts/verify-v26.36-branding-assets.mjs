/** Bounded artwork/packaging acceptance, including read-only PE icon-resource identity. */
import assert from 'node:assert/strict'
import {mkdir,readFile,realpath,stat,writeFile} from 'node:fs/promises'
import {dirname,join,resolve} from 'node:path'
import {inflateSync} from 'node:zlib'
import {ROOT,MANIFEST,ORIGINALS,DERIVATIVES,createBrandingManifest,icoFamily,icnsFamily,pngInformation,sha256,span} from './generate-branding-icons.mjs'

const qualification=process.argv.find(arg=>arg.startsWith('--qualification-release='))?.split('=')[1]
assert.ok(qualification===undefined||['26.36','26.37'].includes(qualification),'Branding retention targets26.36 or26.37')
const release=qualification??'26.36',skipNative=process.argv.includes('--skip-native')
assert.ok(!(skipNative&&qualification),'Native proof cannot be skipped during release qualification')
const argument=(name,fallback)=>process.argv.find(arg=>arg.startsWith('--'+name+'='))?.slice(name.length+3)??fallback
const report=resolve(ROOT,argument('report','release-audits/v'+release+'-branding-assets.json')),nativePath=resolve(ROOT,argument('native','src-tauri/target/release/nova_a.exe')),oldPath=resolve(ROOT,'releases/v26.35/Nova_A-v26.35-windows-x64-portable.exe')
const setupPath=resolve(ROOT,argument('setup','src-tauri/target/release/bundle/nsis/Nova_A_'+release+'.0_x64-setup.exe')),nsisScriptOverride=argument('nsis-script',null),oldSetupPath=resolve(ROOT,'releases/v26.35/Nova_A-v26.35-windows-x64-setup.exe')
const checks=[],observations=[];let failure,expectedIcon
const check=async(name,action)=>{try{await action();checks.push({name,status:'passed'});console.log('PASS '+name)}catch(error){checks.push({name,status:'failed',message:error.message});throw error}}

/** Decode the supported RGB/RGBA PNG rows to prove opaque backgrounds, rather than infer alpha from a header. */
function opaquePng(bytes){
 const info=pngInformation(bytes),channels=info.colorType===6?4:3,stride=info.width*channels,expected=(stride+1)*info.height,idat=[];let at=8,ended=false
 while(at<bytes.length){span(bytes,at,12);const count=bytes.readUInt32BE(at),type=bytes.toString('ascii',at+4,at+8),data=span(bytes,at+8,count,'PNG chunk');span(bytes,at+8+count,4);if(type==='IDAT')idat.push(data);at+=12+count;if(type==='IEND'){assert.equal(count,0);ended=true;break}}
 assert.ok(ended&&idat.length);assert.equal(at,bytes.length);const decoded=inflateSync(Buffer.concat(idat),{maxOutputLength:expected});assert.equal(decoded.length,expected)
 let previous=Buffer.alloc(stride),offset=0;const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c}
 for(let y=0;y<info.height;y++){const filter=decoded[offset++];assert.ok(filter<=4);const row=Buffer.from(decoded.subarray(offset,offset+stride));offset+=stride
  for(let x=0;x<stride;x++){const left=x>=channels?row[x-channels]:0,up=previous[x],upperLeft=x>=channels?previous[x-channels]:0;row[x]=(row[x]+(filter===1?left:filter===2?up:filter===3?Math.floor((left+up)/2):filter===4?paeth(left,up,upperLeft):0))&255}
  if(channels===4)for(let x=3;x<stride;x+=4)assert.equal(row[x],255,'Supplied opaque background remains opaque');previous=row
 }
 return {...info,opaque:true,decodedBytes:expected}
}

/** Microsoft PE/COFF resource layout and RT_GROUP_ICON mapping, without loading or executing the binary.
 * https://learn.microsoft.com/en-us/windows/win32/debug/pe-format
 * https://devblogs.microsoft.com/oldnewthing/20120720-00/?p=7083/
 */
function peIconResources(bytes){
 span(bytes,0,64);assert.equal(bytes.toString('ascii',0,2),'MZ');const pe=bytes.readUInt32LE(0x3c);span(bytes,pe,24);assert.equal(bytes.toString('ascii',pe,pe+4),'PE\0\0')
 const sectionCount=bytes.readUInt16LE(pe+6),optionalSize=bytes.readUInt16LE(pe+20),optional=pe+24;assert.ok(sectionCount>0&&sectionCount<=96);span(bytes,optional,optionalSize)
 const magic=bytes.readUInt16LE(optional);assert.ok([0x10b,0x20b].includes(magic));const directory=optional+(magic===0x20b?112:96),directoryCount=bytes.readUInt32LE(directory-4);assert.ok(directoryCount>=3);assert.ok(directory+24<=optional+optionalSize)
 const resourceRva=bytes.readUInt32LE(directory+16),resourceSize=bytes.readUInt32LE(directory+20),headerSize=bytes.readUInt32LE(optional+60);assert.ok(resourceRva>0&&resourceSize>=16&&resourceSize<=16*1024*1024,'Bounded resource directory')
 const sectionTable=optional+optionalSize;span(bytes,sectionTable,sectionCount*40);const sections=Array.from({length:sectionCount},(_,i)=>{const at=sectionTable+i*40;return {rva:bytes.readUInt32LE(at+12),virtualSize:bytes.readUInt32LE(at+8),rawSize:bytes.readUInt32LE(at+16),rawOffset:bytes.readUInt32LE(at+20)}})
 const rvaOffset=(rva,size)=>{if(rva<headerSize){span(bytes,rva,size);assert.ok(rva+size<=headerSize);return rva}const matches=sections.filter(s=>rva>=s.rva&&rva<s.rva+Math.max(s.virtualSize,s.rawSize));assert.equal(matches.length,1,'RVA maps to one section');const section=matches[0],relative=rva-section.rva;assert.ok(relative+size<=section.rawSize,'Resource has backed file bytes');const offset=section.rawOffset+relative;span(bytes,offset,size);return offset}
 const base=rvaOffset(resourceRva,resourceSize),relativeSpan=(offset,size)=>{assert.ok(offset>=0&&offset+size<=resourceSize,'Resource table offset');return span(bytes,base+offset,size)},resources=[],seen=new Set();let directoryEntries=0
 const name=value=>{if(!(value&0x80000000))return value;const offset=value&0x7fffffff,head=relativeSpan(offset,2),length=head.readUInt16LE(0);assert.ok(length<=256);return relativeSpan(offset+2,length*2).toString('utf16le')}
 const visit=(relative,path)=>{assert.ok(path.length<=2,'Only Type/Name/Language hierarchy');assert.ok(!seen.has(relative),'Acyclic resource directories');seen.add(relative);const header=relativeSpan(relative,16),count=header.readUInt16LE(12)+header.readUInt16LE(14);directoryEntries+=count;assert.ok(directoryEntries<=4096);relativeSpan(relative+16,count*8)
  for(let n=0;n<count;n++){const entry=relativeSpan(relative+16+n*8,8),id=name(entry.readUInt32LE(0)),target=entry.readUInt32LE(4),next=[...path,id];if(path.length===0&&id!==3&&id!==14)continue
   if(target&0x80000000){visit(target&0x7fffffff,next);continue}assert.equal(next.length,3,'Icon resource language leaf');const data=relativeSpan(target,16),rva=data.readUInt32LE(0),length=data.readUInt32LE(4);assert.ok(length>0&&length<=4*1024*1024);const payload=span(bytes,rvaOffset(rva,length),length);resources.push({type:next[0],id:next[1],language:next[2],bytes:length,sha256:sha256(payload),payload})
  }
 }
 visit(0,[]);const icons=resources.filter(r=>r.type===3),groups=resources.filter(r=>r.type===14);assert.ok(icons.length&&groups.length,'Executable has actual RT_ICON and RT_GROUP_ICON resources')
 const parsedGroups=groups.map(group=>{const b=group.payload;span(b,0,6);assert.equal(b.readUInt16LE(0),0);assert.equal(b.readUInt16LE(2),1);const count=b.readUInt16LE(4);assert.ok(count>0&&count<=32);assert.equal(b.length,6+count*14)
  const entries=Array.from({length:count},(_,i)=>{const at=6+i*14,id=b.readUInt16LE(at+12),candidates=icons.filter(icon=>icon.id===id);const icon=candidates.find(icon=>icon.language===group.language)??candidates.find(icon=>icon.language===0)??(candidates.length===1?candidates[0]:null);assert.ok(icon,'Group resolves an actual icon payload');assert.equal(b.readUInt32LE(at+8),icon.bytes);return {width:b[at]||256,height:b[at+1]||256,colorCount:b[at+2],planes:b.readUInt16LE(at+4),bitCount:b.readUInt16LE(at+6),id,language:icon.language,bytes:icon.bytes,sha256:icon.sha256,payload:icon.payload}})
  return {...group,entries}
 })
 return {machine:bytes.readUInt16LE(pe+4),format:magic===0x20b?'PE32+':'PE32',iconResources:icons,groups:parsedGroups}
}
const pngSignature=Buffer.from('89504e470d0a1a0a','hex')
// Microsoft resource compilation normalizes the generated PNG ICO planes=0 directory field to planes=1.
// Accept only that observed header representation; image bytes and every other directory field stay exact.
const planesMatch=(entry,image)=>entry.planes===image.planes||(image.planes===0&&entry.planes===1&&image.payload.subarray(0,8).equals(pngSignature))
function groupMatches(group,expected){
 if(group.entries.length!==expected.length)return false
 const remaining=[...expected]
 for(const entry of group.entries){const match=remaining.findIndex(image=>entry.width===image.width&&entry.height===image.height&&entry.colorCount===image.colorCount&&planesMatch(entry,image)&&entry.bitCount===image.bitCount&&entry.bytes===image.bytes&&entry.payload.equals(image.payload));if(match<0)return false;remaining.splice(match,1)}
 return remaining.length===0
}
const withoutPayload=({payload,...value})=>value
async function binaryEvidence(file){
 const bytes=await readFile(file),resources=peIconResources(bytes)
 const headerNormalizations=resources.groups.flatMap(group=>group.entries.flatMap(entry=>{const image=expectedIcon.find(image=>image.payload.equals(entry.payload));return image&&image.planes===0&&entry.planes===1&&image.payload.subarray(0,8).equals(pngSignature)?[{groupId:group.id,resourceId:entry.id,width:entry.width,height:entry.height,icoPlanes:image.planes,resourcePlanes:entry.planes,rule:'PNG directory planes 0 to Windows resource planes 1; exact image payload retained'}]:[]}))
 return {bytes,resources,evidence:{path:file,bytes:bytes.length,sha256:sha256(bytes),machine:resources.machine,peFormat:resources.format,groups:resources.groups.map(group=>({...withoutPayload(group),entries:group.entries.map(withoutPayload),matchesExpected:groupMatches(group,expectedIcon)})),iconResources:resources.iconResources.map(withoutPayload),headerNormalizations}}
}

async function generatedNsisScriptPath(){
 if(nsisScriptOverride)return resolve(ROOT,nsisScriptOverride)
 if(process.env.CARGO_TARGET_DIR)return resolve(ROOT,process.env.CARGO_TARGET_DIR,'release/nsis/x64/installer.nsi')
 if(process.platform==='win32'){const managed=resolve(ROOT,'.cache/tauri-target/release/nsis/x64/installer.nsi');try{await stat(managed);return managed}catch(error){if(error.code!=='ENOENT')throw error}}
 return resolve(ROOT,'src-tauri/target/release/nsis/x64/installer.nsi')
}

try{
 const pkg=JSON.parse(await readFile(join(ROOT,'package.json'),'utf8'));assert.equal(pkg.version,release+'.0','Current version authority')
 const manifest=JSON.parse(await readFile(join(ROOT,MANIFEST),'utf8'))
 await check('Immutable supplied originals and exact derivative provenance',async()=>{assert.equal(manifest.format,'nova-branding-assets');assert.equal(manifest.generator.version,'2.11.4');assert.equal(manifest.derivatives.length,25);assert.deepEqual(manifest.derivatives.map(d=>d.path).sort(),DERIVATIVES.map(d=>d.path).sort());assert.ok(JSON.stringify(await createBrandingManifest())===JSON.stringify(manifest),'Hashes, dimensions and family metadata match committed provenance');for(const original of ORIGINALS){const bytes=await readFile(join(ROOT,original.path));assert.equal(sha256(bytes),original.sha256);const decoded=opaquePng(bytes);assert.equal(decoded.width,1254);assert.equal(decoded.height,1254);assert.equal(decoded.colorType,2)}observations.push({name:'originals',data:manifest.originals})})
 await check('Every tracked PNG has expected dimensions and a decoded opaque background',async()=>{const dimensions={'32x32.png':32,'128x128.png':128,'128x128@2x.png':256,'icon.png':512,'StoreLogo.png':50};for(const record of manifest.derivatives.filter(d=>d.format==='png')){const bytes=await readFile(join(ROOT,record.path)),png=opaquePng(bytes),expected=record.size??dimensions[record.nativeName]??Number(record.nativeName.match(/^Square(\d+)x/)[1]);assert.equal(png.width,expected);assert.equal(png.height,expected);assert.equal(png.colorType,6)}observations.push({name:'png-family',files:manifest.derivatives.filter(d=>d.format==='png').map(d=>({path:d.path,width:d.width,height:d.height,sha256:d.sha256,opaque:true}))})})
 await check('ICO and ICNS families contain the regenerated desktop sizes and preserved backgrounds',async()=>{expectedIcon=icoFamily(await readFile(join(ROOT,'src-tauri/icons/icon.ico')));assert.deepEqual(expectedIcon.map(i=>i.width).sort((a,b)=>a-b),[16,24,32,48,64,256]);for(const image of expectedIcon){assert.equal(image.bitCount,32);opaquePng(image.payload)}const family=icnsFamily(await readFile(join(ROOT,'src-tauri/icons/icon.icns'))),expectedTypes=['is32','s8mk','il32','l8mk','ic07','ic08','ic09','ic10','ic11','ic12','ic13','ic14'],pngSizes={ic07:128,ic08:256,ic09:512,ic10:1024,ic11:32,ic12:64,ic13:256,ic14:512};assert.deepEqual(family.map(c=>c.type).sort(),expectedTypes.sort());for(const chunk of family){if(pngSizes[chunk.type]){const png=opaquePng(chunk.chunk.subarray(8));assert.equal(png.width,pngSizes[chunk.type]);assert.equal(png.height,pngSizes[chunk.type]);assert.equal(png.colorType,6)}if(chunk.type==='s8mk'||chunk.type==='l8mk'){assert.equal(chunk.bytes,chunk.type==='s8mk'?256:1024);assert.ok(chunk.chunk.subarray(8).every(alpha=>alpha===255))}}observations.push({name:'desktop-containers',ico:expectedIcon.map(({header,payload,...value})=>value),icns:family.map(({chunk,...value})=>value)})})
 await check('Native/PWA/NSIS configuration references only the tracked regenerated icon paths',async()=>{const tauri=JSON.parse(await readFile(join(ROOT,'src-tauri/tauri.conf.json'),'utf8'));for(const file of tauri.bundle.icon)assert.ok(manifest.derivatives.some(d=>d.path==='src-tauri/'+file));const nsis=tauri.bundle.windows?.nsis;assert.equal(nsis?.installerIcon,'icons/icon.ico','Explicit NSIS installer artwork');assert.equal(nsis?.uninstallerIcon,'icons/icon.ico','Explicit NSIS uninstaller artwork');const pwa=JSON.parse(await readFile(join(ROOT,'public/manifest.webmanifest'),'utf8'));assert.deepEqual(pwa.icons.map(i=>[i.src,i.sizes,i.type,i.purpose]),[['./nova-icon-192.png','192x192','image/png','any'],['./nova-icon-512.png','512x512','image/png','any']]);assert.ok(manifest.derivatives.filter(d=>d.nativeName).every(d=>d.theme==='dark'));observations.push({name:'icon-references',tauri:tauri.bundle.icon,nsis:{installerIcon:nsis.installerIcon,uninstallerIcon:nsis.uninstallerIcon},pwa:pwa.icons})})
 await check('Negative control rejects the actual old 26.35 portable executable icon resources',async()=>{const old=await binaryEvidence(oldPath);assert.ok(old.resources.groups.every(group=>!groupMatches(group,expectedIcon)),'Old executable must not falsely pass the new icon comparison');observations.push({name:'old-native-negative-control',...old.evidence,expectedRejected:true,executed:false})})
 if(skipNative){checks.push({name:'Fresh native executable RT_ICON/RT_GROUP_ICON identity',status:'skipped',reason:'Explicit development --skip-native; no native qualification claimed'});observations.push({name:'native-proof',status:'not-executed',qualified:false})}
 else await check('Fresh native executable RT_ICON/RT_GROUP_ICON payloads match the regenerated ICO',async()=>{
  const native=await binaryEvidence(nativePath)
  // Preserve raw headers and hashes in failed reports as well as successful qualification evidence.
  observations.push({name:'native-proof',...native.evidence,executed:false,proof:'Read-only PE resource payload comparison; only PNG directory planes 0 to 1 normalization is accepted. No installation, signing, shell cache or visible window certification'})
  assert.ok(native.resources.groups.every(group=>groupMatches(group,expectedIcon)),'Fresh native icon groups must match every expected image payload')
  assert.ok(native.resources.iconResources.every(icon=>expectedIcon.some(image=>icon.payload.equals(image.payload))),'No stale or unreferenced native icon payload remains')
  const actual=native.resources.groups[0],changedPayload=Buffer.from(actual.entries[0].payload);changedPayload[changedPayload.length-1]^=1
  const controls=[
   {name:'invalid-planes',entries:actual.entries.map((entry,i)=>i===0?{...entry,planes:2}:entry)},
   {name:'duplicate-frame-hides-missing-size',entries:actual.entries.map((entry,i)=>i===0?actual.entries[1]:entry)},
   {name:'missing-frame',entries:actual.entries.slice(1)},
   {name:'changed-image-payload',entries:actual.entries.map((entry,i)=>i===0?{...entry,payload:changedPayload}:entry)}
  ]
  const results=controls.map(control=>({name:control.name,rejected:!groupMatches({...actual,entries:control.entries},expectedIcon)}))
  observations.push({name:'native-comparison-negative-controls',basis:'Controlled corruptions of the actual freshly parsed group; no executable modification',controls:results})
  for(const result of results)assert.equal(result.rejected,true,'Native comparison rejects '+result.name)
 })
 if(skipNative){checks.push({name:'Fresh NSIS setup icon resources and generated installer/uninstaller bindings',status:'skipped',reason:'Explicit development --skip-native; no setup or uninstaller qualification claimed'});observations.push({name:'nsis-setup-proof',status:'not-executed',qualified:false})}
 else await check('Fresh NSIS setup icon resources and generated installer/uninstaller bindings',async()=>{
  const setup=await binaryEvidence(setupPath)
  observations.push({name:'nsis-setup-proof',...setup.evidence,executed:false,proof:'Read-only setup PE resource payload comparison; exact six-image coverage and all-resource identity. No installer or uninstaller execution.'})
  const old=await binaryEvidence(oldSetupPath)
  observations.push({name:'old-setup-negative-control',...old.evidence,expectedRejected:true,executed:false})
  const nsisScriptPath=await generatedNsisScriptPath(),script=await readFile(nsisScriptPath,'utf8'),sourceIcon=resolve(ROOT,'src-tauri/icons/icon.ico')
  const [scriptStat,setupStat]=await Promise.all([stat(nsisScriptPath),stat(setupPath)]),compileGapMs=setupStat.mtimeMs-scriptStat.mtimeMs,scriptVersion=script.match(/^!define[ \t]+VERSION[ \t]+"([^"\r\n]*)"[ \t]*$/m)?.[1]??null
  const bindings={installerIcon:script.match(/^!define[ \t]+INSTALLERICON[ \t]+"([^"\r\n]*)"[ \t]*$/m)?.[1]??null,uninstallerIcon:script.match(/^!define[ \t]+UNINSTALLERICON[ \t]+"([^"\r\n]*)"[ \t]*$/m)?.[1]??null}
  const bindingEvidence={name:'nsis-script-icon-bindings',path:nsisScriptPath,sha256:sha256(Buffer.from(script)),sourceIco:sourceIcon,bindings,scriptVersion,scriptModifiedAt:scriptStat.mtime.toISOString(),setupModifiedAt:setupStat.mtime.toISOString(),compileGapMs,freshnessWindowMs:{minimum:-5000,maximum:600000},scope:'Both generated NSIS icon defines bind to the same source ICO. The generated uninstaller is not run or extracted from installer data.'}
  observations.push(bindingEvidence)
  assert.ok(old.resources.groups.every(group=>!groupMatches(group,expectedIcon)),'Old setup must not falsely pass the new icon comparison')
  assert.ok(setup.resources.groups.every(group=>groupMatches(group,expectedIcon)),'Fresh setup icon groups must match every expected image payload')
  assert.ok(setup.resources.iconResources.every(icon=>expectedIcon.some(image=>icon.payload.equals(image.payload))),'No default, stale or unreferenced setup icon payload remains')
  assert.equal(scriptVersion,release+'.0','Generated NSIS script uses the current release version')
  assert.ok(compileGapMs>=-5000&&compileGapMs<=600000,'Generated NSIS script precedes the built setup within the bounded ten-minute compilation window (five-second timestamp tolerance)')
  const expectedSource=await realpath(sourceIcon)
  for(const [kind,binding] of Object.entries(bindings)){assert.ok(binding,'Generated NSIS '+kind+' is explicit');const resolved=await realpath(resolve(binding.replace(/\$\$/g,'$')));assert.equal(resolved.toLowerCase(),expectedSource.toLowerCase(),'Generated NSIS '+kind+' binds the current source ICO')}
  bindingEvidence.sourceBindingsConfirmed=true
 })

}catch(error){failure=error;process.exitCode=1;console.error(error.message)}
const engineVersion=JSON.parse(await readFile(join(ROOT,'package.json'),'utf8')).version
await mkdir(dirname(report),{recursive:true});await writeFile(report,JSON.stringify({format:'nova-branding-assets-verification',version:1,release,engineVersion,expectedRelease:release,generatedAt:new Date().toISOString(),status:failure?'failed':'passed',qualifiedRelease:!failure&&!skipNative&&qualification===release?release:null,development:qualification!==release,checks,observations,error:failure?.stack,sources:['https://learn.microsoft.com/en-us/windows/win32/debug/pe-format','https://devblogs.microsoft.com/oldnewthing/20120720-00/?p=7083/'],scope:'Supplied source hashes, tracked generated files, decoded opaque PNG backgrounds, ICO/ICNS families, actual old executable rejection, and (unless explicitly skipped) freshly built executable and NSIS setup RT_ICON/RT_GROUP_ICON payload identity, actual old setup rejection, and generated installer/uninstaller source-icon bindings. Binaries are read, never loaded/executed/installed; generated uninstaller source bindings are inspected without running or extracting the uninstaller. No Windows shell-cache, taskbar rendering, installation, signing or cross-platform run claim.'},null,2)+'\n')
console.log('Branding asset verification '+(failure?'FAILED':skipNative?'passed (development; native skipped)':'passed')+'; '+report)
