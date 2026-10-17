/** 26.25 移动契约：方向与软键盘、旧浏览器前置提示及子目录安装路径。 */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { build } from 'vite'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
await mkdir('.cache/mobile25-contract',{recursive:true})
await build({configFile:false,logLevel:'error',build:{ssr:true,outDir:'.cache/mobile25-contract',rollupOptions:{input:resolve('src/runtime/mobileViewport.ts'),output:{entryFileNames:'viewport.mjs'}}}})
const {mobileViewport}=await import(pathToFileURL(resolve('.cache/mobile25-contract/viewport.mjs')))
const checks=[]
assert.equal(mobileViewport({touch:true,width:390,height:844,orientation:'portrait-primary'}).portrait,true)
assert.equal(mobileViewport({touch:true,width:844,height:390,visualHeight:150,orientation:'landscape-primary'}).portrait,false)
assert.equal(mobileViewport({touch:false,width:390,height:844}).portrait,false)
assert.equal(mobileViewport({touch:true,width:390,height:844,visualHeight:220}).portrait,true)
checks.push('portrait protection uses device/layout orientation, not keyboard visual height; desktops remain unrestricted')
const bootstrap=await readFile('public/browser-capabilities.js','utf8')
for(const language of ['en','de','zh-CN']){
 let message='',role=''
 const root={style:{},/** 记录无障碍提示角色。 */ setAttribute(k,v){if(k==='role')role=v},/** 收集可见旧浏览器提示。 */ appendChild(value){message+=value}}
 runInNewContext(bootstrap,{document:{/** 模拟不支持模块的旧浏览器。 */ createElement(){return{}},/** 返回启动根元素。 */ getElementById(){return root},/** 保留文本而不解析 HTML。 */ createTextNode(value){return value}},window:{},navigator:{language},HTMLElement:/** 提供旧浏览器元素构造器。 */ function(){}})
 assert.equal(role,'alert');assert.ok(message.includes('Nova_A'))
}
assert.ok(!/\b(?:const|let|class)\s|=>|\?\./.test(bootstrap),'ES5-only legacy bootstrap')
checks.push('legacy environment receives readable EN/DE/ZH notice before any app import')
const manifest=JSON.parse(await readFile('public/manifest.webmanifest','utf8'))
for(const base of ['https://example.test/','https://example.test/apps/nova/']){
 assert.equal(new URL(manifest.scope,base).href,base)
 assert.equal(new URL(manifest.start_url,base).href,base+'index.html')
 for(const icon of manifest.icons){assert.ok(new URL(icon.src,base).href.startsWith(base));const bytes=await readFile('public/'+icon.src);assert.equal(bytes.subarray(1,4).toString(),'PNG')}
}
checks.push('manifest scope/start and both PNG icons resolve below root or nested HTTPS directory')
const html=await readFile('index.html','utf8');assert.ok(html.indexOf('browser-capabilities.js')<html.indexOf('type="module"'));assert.match(html,/if \(window\.novaBrowserSupported\) import/)
assert.match(await readFile('src/components/MobileShell.vue','utf8'),/removeEventListener\('resize', schedule\)/)
checks.push('capability gate precedes editor load; viewport listeners have teardown')
const report={format:'nova-v26.25-mobile-contract',version:1,targetRelease:'26.25',status:'passed',generatedAt:new Date().toISOString(),checks,scope:'Focused pure viewport behavior, legacy JS execution and install URL/assets. Physical phone and other engines require separate evidence.'}
await mkdir('release-audits',{recursive:true});await writeFile('release-audits/v26.25-mobile-contract.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))

