/** Current-source wheel ownership checks; DOM surfaces are controlled, not physical-device evidence. */
import assert from 'node:assert/strict'
import {readFile, mkdir, writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {openMediaAuditModules} from './lib/mediaAudit16.mjs'

const opened = await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{physics:'store/physics',input:'runtime/input'})
const {InputManager,createInputAction,createInputBinding} = opened.modules.input
const checks = []
const previousElement = globalThis.HTMLElement
const previousDomElement = globalThis.Element
class SurfaceElement {
  constructor(kind) { this.kind = kind; this.isContentEditable = false }
  closest(selector) {
    if (selector === '[data-game-input-surface]') return this.kind === 'game-canvas' ? this : null
    return this.kind === 'native-control' ? this : null
  }
}
class HostElement extends SurfaceElement {}
globalThis.Element = SurfaceElement
globalThis.HTMLElement = HostElement
const actions = [createInputAction('zoom','axis',[createInputBinding('mouse-wheel','y')])]
function wheel(kind='game-canvas',deltaY=120,defaultPrevented=false) { return {target:kind==='editor-svg'?new SurfaceElement(kind):new HostElement(kind),deltaX:0,deltaY,defaultPrevented} }
async function check(name,run) {
  try { await run(); checks.push({name,status:'passed'}); console.log('PASS '+name) }
  catch (error) { checks.push({name,status:'failed',error:String(error.stack ?? error)}); console.error('FAIL '+name+' '+error) }
}
try {
  await check('Already handled wheel cannot activate a gameplay action',()=>{
    const manager = new InputManager(); manager.onWheel(wheel('game-canvas',120,true))
    const sample = manager.sample(actions); assert.equal(sample.axes.zoom,0); assert.equal(sample.pressed.zoom,false); assert.deepEqual(sample.wheel,[0,0])
  })
  await check('Native text and numeric controls retain wheel ownership',()=>{
    const manager = new InputManager(); manager.onWheel(wheel('native-control'))
    assert.equal(manager.sample(actions).axes.zoom,0)
  })
  await check('Editor panel scrolling and unrelated canvas input do not reach gameplay',()=>{
    for (const kind of ['editor-panel','preview-canvas']) { const manager = new InputManager(); manager.onWheel(wheel(kind)); assert.equal(manager.sample(actions).axes.zoom,0,kind) }
  })
  await check('SVG editor icon targets cannot bypass DOM surface ownership',()=>{
    const manager=new InputManager();manager.onWheel(wheel('editor-svg'));assert.equal(manager.sample(actions).axes.zoom,0)
  })
  await check('Bare game canvas wheel samples once, resets transient delta, and preserves signed actions',()=>{
    const manager = new InputManager(); manager.onWheel(wheel()); const first=manager.sample(actions)
    assert.equal(first.axes.zoom,1); assert.equal(first.pressed.zoom,true); assert.deepEqual(first.wheel,[0,120])
    const second=manager.sample(actions); assert.equal(second.axes.zoom,0); assert.equal(second.released.zoom,true); assert.deepEqual(second.wheel,[0,0])
    manager.onWheel(wheel('game-canvas',-120)); assert.equal(manager.sample(actions).axes.zoom,-1)
  })
  await check('Multiple game surfaces and non-DOM runtime hosts retain wheel support',()=>{
    const manager = new InputManager(); manager.onWheel(wheel()); manager.onWheel(wheel('game-canvas',-40))
    assert.deepEqual(manager.sample(actions).wheel,[0,80])
    manager.onWheel({target:null,deltaX:0,deltaY:120,defaultPrevented:false}); assert.equal(manager.sample(actions).axes.zoom,1)
  })
  await check('Keyboard action handling remains independent from wheel routing',()=>{
    const manager=new InputManager(),keys=[createInputAction('jump','button',[createInputBinding('physical-key','Space')])]
    manager.onKeyDown({target:null,code:'Space',key:' ',defaultPrevented:false,isComposing:false,keyCode:32,repeat:false,ctrlKey:false,shiftKey:false,altKey:false,metaKey:false})
    assert.equal(manager.sample(keys).pressed.jump,true)
    manager.onKeyUp({code:'Space',key:' ',ctrlKey:false,shiftKey:false,altKey:false,metaKey:false}); assert.equal(manager.sample(keys).released.jump,true)
  })
} finally {
  if (previousElement === undefined) delete globalThis.HTMLElement; else globalThis.HTMLElement=previousElement
  if (previousDomElement === undefined) delete globalThis.Element; else globalThis.Element=previousDomElement
  const files=['src/runtime/input.ts','src/components/WorldCanvas.vue'],sourceHashes={}
  for (const file of files) sourceHashes[file]=createHash('sha256').update(await readFile(file)).digest('hex')
  const output=process.env.NOVA_INPUT_OWNERSHIP_REPORT || 'reports/phase2/26.34/input-ownership.json'
  await mkdir(new URL('.',new URL(output,'file:///'+process.cwd().replaceAll('\\','/')+'/')),{recursive:true})
  const report={format:'nova-input-ownership',version:1,engineVersion:JSON.parse(await readFile('package.json','utf8')).version,generatedAt:new Date().toISOString(),status:checks.every(check=>check.status==='passed')?'passed':'failed',checks,sourceHashes,scope:'Actual InputManager and named-action modules with controlled DOM target identities. WorldCanvas integration requires a separate real browser check; no physical-device claim.'}
  await writeFile(output,JSON.stringify(report,null,2)+'\n'); await opened.close()
}
if (checks.some(check=>check.status==='failed')) process.exitCode=1
