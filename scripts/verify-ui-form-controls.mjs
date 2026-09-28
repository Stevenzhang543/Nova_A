/** Focused shared-control regression against actual Vue components and native DOM events. */
import assert from 'node:assert/strict'
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { withBrowserAudit } from './lib/browserUserAudit.mjs'

const fixture = '.cache/ui-form-controls.html'
await mkdir('.cache', { recursive: true })
await writeFile(fixture, `<!doctype html><html lang="en"><meta charset="utf-8"><div id="fixture"></div><script type="module">
import {createApp,h,reactive,nextTick} from 'vue';
import UiSlider from '/src/ui/components/UiSlider.vue';
import UiPropertyRow from '/src/ui/components/UiPropertyRow.vue';
import NumericExpressionInput from '/src/components/NumericExpressionInput.vue';
import {settleEditorDrafts} from '/src/editor/pendingDrafts.ts';
import '/src/ui/editor.css';
const state=reactive({slider:.2,lazy:.2,disabled:.2,expr:2,other:3,step:.05,resource:'A',events:[]});
const log=(kind,event)=>state.events.push({kind,type:event?.target?.type,value:event?.target?.value});
const slider=(id,extra={})=>h('div',{id,onChange:e=>log('bubble',e)},[h(UiPropertyRow,{label:id},{default:()=>h(UiSlider,{modelValue:state[id],min:0,max:1,step:.1,'data-resource-key':state.resource+':'+id,'onUpdate:modelValue':v=>{state[id]=v;log('update')},onInput:e=>log('input',e),onChange:e=>log('change',e),...extra})})]);
const numeric=(id,extra={})=>h('div',{id,onChange:e=>log('bubble',e)},[h(UiPropertyRow,{label:id},{default:()=>h(NumericExpressionInput,{modelValue:state[id],resourceKey:state.resource+':'+id,'onUpdate:modelValue':v=>state[id]=v,...extra})})]);
createApp({render:()=>h('main',{style:'padding:16px;width:540px'},[slider('slider'),slider('lazy',{modelModifiers:{lazy:true}}),slider('disabled',{disabled:true}),numeric('expr'),numeric('other'),numeric('step',{minimum:.05,maximum:.25,step:.1})])}).mount('#fixture');
window.formFixture={state,settleEditorDrafts,nextTick};window.fixtureReady=true;
</script></html>`)
const server = await createServer({ configFile: false, plugins: [vue()], logLevel: 'silent', server: { host: '127.0.0.1', port: 17332, strictPort: false, watch: null } })
await server.listen()
try {
  await withBrowserAudit({ release: '26.32', name: 'ui-form-controls', development: true, expectedRelease: '26.32', width: 1000, height: 700, initialUrl: 'about:blank', readyExpression: 'document.readyState === "complete"' }, async a => {
    const port = server.httpServer.address().port
    await a.client.send('Page.navigate', { url: `http://127.0.0.1:${port}/${fixture}` })
    await a.until('window.fixtureReady === true')
    const state = () => a.evaluate('JSON.parse(JSON.stringify(formFixture.state))')
    const clear = () => a.evaluate('formFixture.state.events.splice(0)')
    await a.check('Precise slider expression follows one native range input/change/bubble path', async () => {
      await a.click('#slider input[data-numeric-expression]'); await a.press('a', 2); await a.client.send('Input.insertText', { text: '.2 + .3' })
      await clear(); await a.press('Enter')
      const s = await state()
      assert.equal(s.slider, .5)
      assert.deepEqual(s.events.map(e => e.kind), ['update', 'input', 'change', 'bubble'])
      assert.ok(s.events.filter(e => e.kind !== 'update').every(e => e.type === 'range' && e.value === '0.5'))
    })
    await a.check('Native keyboard slider preserves callbacks and exact commit count', async () => {
      await a.evaluate("document.querySelector('#slider input[type=range]').focus()")
      await clear(); await a.press('ArrowRight')
      const s = await state(); assert.equal(s.slider, .6)
      assert.deepEqual(s.events.map(e => e.kind), ['update', 'input', 'change', 'bubble'])
    })
    await a.check('Lazy slider updates only at native change boundary', async () => {
      await clear()
      await a.evaluate("(()=>{const e=document.querySelector('#lazy input[type=range]');e.value='.8';e.dispatchEvent(new Event('input',{bubbles:true}))})()")
      assert.equal((await state()).lazy, .2)
      await a.evaluate("document.querySelector('#lazy input[type=range]').dispatchEvent(new Event('change',{bubbles:true}))")
      const s = await state(); assert.equal(s.lazy, .8)
      assert.deepEqual(s.events.map(e => e.kind), ['input', 'update', 'change', 'bubble'])
    })
    await a.check('Invalid precise range draft stays visible and cannot reach project callbacks', async () => {
      await a.click('#slider input[data-numeric-expression]'); await a.press('a', 2); await a.client.send('Input.insertText', { text: '2' })
      await clear(); await a.press('Enter')
      assert.equal((await state()).slider, .6)
      assert.equal(await a.evaluate("document.querySelector('#slider input[data-numeric-expression]').getAttribute('aria-invalid')"), 'true')
      assert.deepEqual((await state()).events, [])
      await a.press('Escape')
    })
    await a.check('Disabled precise value and steppers reject edits', async () => {
      assert.equal(await a.evaluate("[...document.querySelectorAll('#disabled input,#disabled button')].every(e=>e.disabled)"), true)
      await a.evaluate("document.querySelector('#disabled .numeric-steppers button:last-child').click()")
      assert.equal((await state()).disabled, .2)
    })
    await a.check('Save validates all drafts before any value commits; resource change discards old drafts', async () => {
      await a.evaluate("(()=>{for(const [id,value] of [['expr','9'],['other','invalid']]){const e=document.querySelector('#'+id+' input');e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}))}})()")
      assert.equal(await a.evaluate('formFixture.settleEditorDrafts()'), false)
      const s = await state(); assert.equal(s.expr, 2); assert.equal(s.other, 3)
      await a.evaluate("formFixture.state.resource='B';formFixture.nextTick()")
      assert.equal(await a.evaluate("document.querySelector('#expr input').value"), '2')
      assert.equal(await a.evaluate("document.querySelector('#other input').value"), '3')
      assert.equal(await a.evaluate('formFixture.settleEditorDrafts()'), true)
    })
    await a.check('Fractional minimum stepping and clamp retain precision', async () => {
      await a.click('#step .numeric-steppers button:last-child'); assert.equal((await state()).step, .15)
      await a.click('#step .numeric-steppers button:last-child'); assert.equal((await state()).step, .25)
      await a.click('#step .numeric-steppers button:last-child'); assert.equal((await state()).step, .25)
    })
    await a.check('Shared geometry stays bounded at 100% and 200% scale', async () => {
      for (const scale of [1,2]) {
        await a.evaluate(`document.documentElement.style.setProperty('--ui-scale','${scale}')`)
        const r = await a.evaluate("(()=>{const n=document.querySelector('#slider .numeric-draft').getBoundingClientRect(),r=document.querySelector('#slider input[type=range]').getBoundingClientRect(),i=document.querySelector('#slider input[data-numeric-expression]').getBoundingClientRect();return{number:n.width,range:r.width,height:i.height}})()")
        assert.ok(Math.abs(r.number - 88 * scale) < 1)
        assert.ok(Math.abs(r.range - 128 * scale) < 1)
        assert.ok(Math.abs(r.height - 28 * scale) < 1)
      }
    })
    await a.check('Saved stacked-label and compact-mode attributes affect shared primitives', async () => {
      await a.evaluate("document.documentElement.style.setProperty('--ui-scale','1');document.documentElement.dataset.formLabelLayout='stacked';document.documentElement.dataset.compact='true'")
      const geometry=await a.evaluate("(()=>{const row=document.querySelector('#expr .ui-property-row'),label=row.querySelector('.ui-property-label').getBoundingClientRect(),control=row.querySelector('.ui-property-control').getBoundingClientRect(),input=row.querySelector('input').getBoundingClientRect();return{labelBottom:label.bottom,controlTop:control.top,height:input.height}})()")
      assert.ok(geometry.controlTop>=geometry.labelBottom)
      assert.equal(geometry.height,24)
      await a.evaluate("delete document.documentElement.dataset.compact;delete document.documentElement.dataset.formLabelLayout")
      assert.equal(await a.evaluate("document.querySelector('#expr input').getBoundingClientRect().height"),28)
    })
    await a.capture('shared-controls')
  })
} finally { await server.close(); await unlink(fixture) }

