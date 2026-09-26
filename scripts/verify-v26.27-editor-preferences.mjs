/** 26.27 偏好定向检查：验证预算覆盖、无障碍优先、持久化和不修改输入项目数据。 */
import assert from 'node:assert/strict'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {nextTick} from 'vue'
import {build} from 'vite'
const out=resolve('.cache/editor-performance27');await mkdir(out,{recursive:true})
await build({configFile:false,logLevel:'error',build:{ssr:true,outDir:out,emptyOutDir:false,rollupOptions:{input:{policy:resolve('src/store/editorPerformance.ts'),preferences:resolve('src/store/preferences.ts')},output:{entryFileNames:'[name].mjs'}}}})
const {resolveEditorPerformancePreferences:policy,normalizeEditorPerformanceOverrides:normalize}=await import(pathToFileURL(resolve(out,'policy.mjs')))
let combinations=0
for(const performanceProfile of ['balanced','low-end','quality'])for(const editorDecorativeMotion of ['auto','on','off'])for(const editorIdleFps of [0,15,30,60])for(const editorPreviewPolicy of ['auto','bounded','full'])for(const reduceMotion of [false,true])for(const system of [false,true]){
 const input={performanceProfile,editorDecorativeMotion,editorIdleFps,editorPreviewPolicy,reduceMotion},before=JSON.stringify(input),actual=policy(input,system),low=performanceProfile==='low-end',bounded=editorPreviewPolicy==='bounded'||editorPreviewPolicy==='auto'&&low
 assert.equal(actual.decorativeMotion,!system&&!reduceMotion&&(editorDecorativeMotion==='on'||editorDecorativeMotion==='auto'&&!low))
 assert.equal(actual.idleFps,editorIdleFps||(low?15:60));assert.equal(actual.previewMaxDimension,bounded?256:1024);assert.equal(actual.previewMaxHeight,bounded?192:768);assert.equal(actual.previewPixelRatio,bounded?1:2);assert.equal(JSON.stringify(input),before);combinations++
}
assert.deepEqual(normalize({editorDecorativeMotion:'surprise',editorIdleFps:Infinity,editorPreviewPolicy:'invalid'}),{editorDecorativeMotion:'auto',editorIdleFps:0,editorPreviewPolicy:'auto'})
const stylesheet=await readFile('src/assets/main.css','utf8')
assert.ok(stylesheet.includes("#app *:not(.player-root, .player-root *, .canvas-container, .canvas-container *)"),'Standalone players share #app: editor motion CSS must exclude both runtime roots and canvas subtrees')
const storage=new Map([['nova_a.preferences.v1',JSON.stringify({performanceProfile:'low-end',reduceMotion:false})]]),listeners=new Set(),root={dataset:{},style:{/** 接受与性能预算无关的缩放 CSS 写入。 */ setProperty(){}}},old={window:globalThis.window,document:globalThis.document,localStorage:globalThis.localStorage}
try{
 globalThis.window={/** 提供可实时切换的系统动效媒体查询。 */ matchMedia:()=>({matches:false,/** 记录唯一有效订阅者。 */ addEventListener:(_,callback)=>listeners.add(callback),/** 清理媒体查询订阅。 */ removeEventListener:(_,callback)=>listeners.delete(callback)})}
 globalThis.document={documentElement:root}
 globalThis.localStorage={/** 读取测试隔离的存储记录。 */ getItem:key=>storage.get(key)??null,/** 保存真实序列化偏好。 */ setItem:(key,value)=>storage.set(key,value)}
 const preferences=await import(pathToFileURL(resolve(out,'preferences.mjs'))),state=preferences.preferencesState
 assert.equal(state.editorDecorativeMotion,'auto');assert.equal(root.dataset.editorMotion,'off');assert.equal(listeners.size,1)
 state.editorDecorativeMotion='on';state.editorIdleFps=30;state.editorPreviewPolicy='full';await nextTick()
 const saved=JSON.parse(storage.get('nova_a.preferences.v1'));assert.equal(saved.editorDecorativeMotion,'on');assert.equal(saved.editorIdleFps,30);assert.equal(saved.editorPreviewPolicy,'full');assert.equal(root.dataset.editorMotion,'on')
 for(const listener of listeners)listener({matches:true});await nextTick();assert.equal(root.dataset.editorMotion,'off');assert.equal(state.reduceMotion,false)
 for(const listener of listeners)listener({matches:false});await nextTick();assert.equal(root.dataset.editorMotion,'on')
 preferences.resetPreferences();await nextTick();assert.equal(state.performanceProfile,'balanced');assert.equal(state.editorIdleFps,0);assert.equal(state.editorPreviewPolicy,'auto');assert.equal(root.dataset.editorMotion,'on')
}finally{for(const [key,value] of Object.entries(old)){if(value===undefined)delete globalThis[key];else globalThis[key]=value}}
await mkdir('release-audits',{recursive:true});await writeFile('release-audits/v26.27-editor-preferences.json',JSON.stringify({format:'nova-editor-preferences',version:1,release:'26.27',engineVersion:JSON.parse(await readFile('package.json','utf8')).version,generatedAt:new Date().toISOString(),status:'passed',combinations,checks:['old preference defaults','invalid override normalization','independent editor overrides','live system accessibility priority','actual reactive preference persistence','reset defaults','pure policy input immutability'],scope:'Module policy and mocked host storage/media event checks. Authored game/export isolation requires actual user/output checks.'},null,2));console.log(`PASS: ${combinations} editor policy combinations plus persistence and live system media changes`)
