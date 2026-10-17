/** 诊断：Input Map 面板中"添加动作"按钮的可点击性。 */
import { withBrowserAudit } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'
import { readFile } from 'node:fs/promises'

const packageVersion = JSON.parse(await readFile('package.json', 'utf8')).version
const release = packageVersion.replace(/\.0$/, '')
const result = { steps: [], panel: null, addButton: null, cardVisible: null }

await withBrowserAudit({ release, name: 'inputmap-diagnosis', qualifyRelease: false, width: 1600, height: 1000 }, async a => {
  const u = worldUserControls17(a)
  if (await a.evaluate("!!document.querySelector('.editor-root')")) {
    await a.client.send('Page.reload'); await a.until("!!document.querySelector('.project-manager')", 30000)
  }
  await a.click('.quick-actions .new-project'); await a.until("!!document.querySelector('.creation-card')")
  await a.fill('.creation-card header input', 'Diagnosis input map')
  await a.click('[data-template-id="empty"]'); await a.click('.create-button')
  await a.until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')", 30000)
  if (await a.evaluate("!!document.querySelector('.onboarding-scrim')")) {
    await a.evaluate("document.querySelector('.onboarding-scrim').focus()"); await a.press('Escape')
    await a.until("!document.querySelector('.onboarding-scrim')")
  }
  result.steps.push('project created')

  await a.press('P', 10)
  await a.until("!!document.querySelector('.command-palette')", 15000)
  await a.fill('.command-palette input[type=search]', 'Input map')
  result.steps.push('palette searched')
  result.panel = await a.evaluate(`[...document.querySelectorAll('.command-results [role=option]')].slice(0,6).map(o => o.textContent.trim().slice(0,60))`)
  await a.clickText('.command-results [role=option]', 'Input map')
  await a.until("!!document.querySelector('.input-actions')", 15000)
  result.steps.push('input map card reached')

  result.cardVisible = await a.evaluate(`(()=>{const list=document.querySelector('.input-actions');const card=list.closest('.settings-card,.ui-property-section,section');return {found:!!list, actions:document.querySelectorAll('.input-action').length, listVisible: !!list && list.offsetParent!==null, cardTag: card?.tagName, cardClass: card?.className, cardDisplay: card?getComputedStyle(card).display:null}})()`)
  result.addButton = await a.evaluate(`(()=>{const list=document.querySelector('.input-actions');const sib=list?.nextElementSibling;const candidates=[...document.querySelectorAll('.secondary-action')].map(b=>({text:b.textContent.trim().slice(0,30), visible:b.offsetParent!==null, cls:b.className}));return {sibling:{tag:sib?.tagName, cls:sib?.className, text:sib?.textContent?.trim().slice(0,30), visible:sib? sib.offsetParent!==null : null}, secondaryActions:candidates}})()`)

  // 决定性对比：程序化 click 是否能让计数变化。
  const before = await a.evaluate("document.querySelectorAll('.input-action').length")
  await a.evaluate("(()=>{const b=[...document.querySelectorAll('.input-map-card .secondary-action')].find(x=>x.textContent.trim()==='Add action');b?.click();return !!b})()")
  await new Promise(r => setTimeout(r, 600))
  const afterProgrammatic = await a.evaluate("document.querySelectorAll('.input-action').length")
  result.clickProbe = { before, afterProgrammatic, delta: afterProgrammatic - before }

  a.observations.push({ id: 'inputmap-diagnosis', ...result })
})

console.log(JSON.stringify(result, null, 2))
