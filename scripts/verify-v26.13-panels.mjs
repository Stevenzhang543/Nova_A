import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'

// Routes are reached through controls. This matrix does not evaluate application
// expressions or fabricate state for panels whose prerequisites are absent.
await withBrowserAudit({ release: '26.13', name: 'panels' }, async audit => {
  const { click, clickText, fill, select, press, until, evaluate, client, check, viewport, capture, observations, evidence } = audit
  const surfaces = [], findings = [], observedClasses = new Set()
  observations.push({ scope: 'Partial observations are retained even when a later route fails.', surfaces, findings })
  const record = async (label, screenshot = false) => {
    await wait(100)
    const state = await evaluate(`(()=>{
      const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&!e.closest('[inert]')};
      const path=e=>{const parts=[];while(e&&e.tagName!=='BODY'){const siblings=[...e.parentElement?.children??[]].filter(x=>x.tagName===e.tagName);parts.unshift(e.tagName.toLowerCase()+(siblings.length>1?':nth-of-type('+(siblings.indexOf(e)+1)+')':''));e=e.parentElement}return 'body>'+parts.join('>')};
      const classes=[...new Set([...document.querySelectorAll('[class]')].filter(visible).flatMap(e=>[...e.classList]))];
      const controls=[...document.querySelectorAll('input:not([type=hidden]),select,textarea,button,summary,[role=separator]')].filter(visible).map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{path:path(e),tag:e.tagName.toLowerCase(),type:e.type??'',text:(e.textContent??'').trim().slice(0,120),label:e.getAttribute('aria-label')||e.labels?.[0]?.textContent?.trim()||e.title||null,width:r.width,height:r.height,cssWidth:r.width/(Number(getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'))||1),disabled:!!e.disabled,clipped:e.scrollWidth>e.clientWidth+2&&['hidden','clip'].includes(s.overflowX)&&!e.title}});
      const clipped=[...document.querySelectorAll('label>span,header>strong,p,summary,button')].filter(visible).filter(e=>{const s=getComputedStyle(e);return (e.scrollWidth>e.clientWidth+2&&['hidden','clip'].includes(s.overflowX)||e.scrollHeight>e.clientHeight+2&&['hidden','clip'].includes(s.overflowY))&&!e.title}).map(e=>({path:path(e),text:e.textContent.trim().slice(0,180)}));
      return{width:innerWidth,height:innerHeight,locale:document.documentElement.lang,scale:getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim(),theme:document.documentElement.dataset.theme,classes,controls,clipped,bodyOverflow:document.documentElement.scrollWidth>innerWidth+2};
    })()`)
    const ax = await client.send('Accessibility.getFullAXTree')
    state.unnamed = ax.nodes.filter(node => !node.ignored && ['textbox', 'combobox', 'spinbutton', 'slider', 'checkbox', 'switch', 'button', 'separator'].includes(node.role?.value) && (node.role.value !== 'separator' || node.properties?.some(value => value.name === 'focusable' && value.value.value === true)) && !String(node.name?.value ?? '').trim()).map(node => ({ role: node.role.value, backendNodeId: node.backendDOMNodeId }))
    for (const unnamed of state.unnamed) {
      try { const { object } = await client.send('DOM.resolveNode', { backendNodeId: unnamed.backendNodeId }); const result = await client.send('Runtime.callFunctionOn', { objectId: object.objectId, functionDeclaration: 'function(){return {html:this.outerHTML.slice(0,900),parent:this.parentElement?.outerHTML.slice(0,1600)}}', returnByValue: true }); Object.assign(unnamed, result.result.value); await client.send('Runtime.releaseObject', { objectId: object.objectId }) } catch (error) { unnamed.inspectionError = String(error) }
    }
    state.label = label; for (const name of state.classes) observedClasses.add(name)
    surfaces.push(state)
    if (state.bodyOverflow) findings.push({ label, kind: 'document-overflow' })
    for (const control of state.controls) if (['input', 'select', 'textarea'].includes(control.tag) && !['checkbox', 'radio', 'color', 'range'].includes(control.type) && control.cssWidth < 48) findings.push({ ...control, controlLabel: control.label, label, kind: 'unreadable-field-width' })
    for (const clipped of state.clipped) findings.push({ label, kind: 'clipped-text', ...clipped })
    for (const unnamed of state.unnamed) findings.push({ label, kind: 'unnamed-accessibility-control', ...unnamed })
    if (screenshot) await capture(label)
  }
  const workspace = async index => { await click('.workspace-list button', index); await until(`document.querySelectorAll('.workspace-list button')[${index}].classList.contains('active')`); await wait(350); await until(`!!document.querySelector(${JSON.stringify(['.toolbar .create-object','.script-workspace','.animation-studio','.presentation-panel','.game-view','.manage-workspace'][index])})`); await until("!document.querySelector('.page-enter-active,.page-leave-active')") }
  const manage = async index => { await workspace(5); await until("!!document.querySelector('.manage-workspace')"); await click('.manage-body>nav button', index); await wait(150) }
  const disclose = async scope => {
    const count = await evaluate(`document.querySelectorAll(${JSON.stringify(scope + ' details')}).length`)
    for (let n = 0; n < count; n++) if (await evaluate(`(()=>{const e=document.querySelectorAll(${JSON.stringify(scope + ' details')})[${n}];return e&&!e.open&&e.getBoundingClientRect().width>0})()`)) await click(scope + ' details>summary', n)
  }
  await check('Create a disposable project through the current launcher', async () => {
    assert.equal(await evaluate(`document.body.innerText.includes(${JSON.stringify(audit.expectedRelease)})`), true)
    await fill('.creation-card header input', '26.13 Panel Audit'); await click('[data-template-id="empty"]'); await click('.create-button'); await until("!!document.querySelector('.editor-root')", 30000)
    if (await evaluate("[...document.querySelectorAll('button')].some(e=>e.textContent==='Skip for now')")) await clickText('button', 'Skip for now', true)
    await until("!document.querySelector('.onboarding-scrim')"); await record('design-initial', true)
  })
  await check('Reach all six workspace surfaces and management routes', async () => {
    for (let n = 0; n < 6; n++) { await workspace(n); await record(`workspace-${n}`, true) }
    for (let n = 0; n < 7; n++) { await manage(n); await disclose('.manage-body>main'); await record(`manage-${n}`, true) }
  })
  await check('Create scene objects and expose the selected-object Inspector and component picker', async () => {
    await workspace(0)
    for (const name of ['Rectangle', 'Navigation Region', 'Audio Emitter']) {
      await click('.toolbar .create-object'); await until("!!document.querySelector('.authoring-palette')")
      await fill('.authoring-palette .palette-search input', name)
      await record('create-' + name.toLowerCase().replaceAll(' ', '-'), true)
      await clickText('.authoring-palette .type-card', name); await click('.authoring-palette footer .primary')
      await until("!document.querySelector('.authoring-palette')&&!!document.querySelector('.inspector-header h3')")
      await disclose('.config-panel'); await record('inspector-' + name.toLowerCase().replaceAll(' ', '-'), true)
    }
    await click('.add-component-trigger'); await until("!!document.querySelector('.component-picker')"); await record('component-picker', true); await press('Escape')
    await until("!document.querySelector('.component-picker')")
  })
  await check('Reach each rendering, presentation and bottom-dock tab', async () => {
    await manage(5)
    const renderTabs = await evaluate("document.querySelectorAll('.rendering-studio>.studio-header nav button').length")
    for (let n = 0; n < renderTabs; n++) { await click('.rendering-studio>.studio-header nav button', n); await disclose('.rendering-studio'); await record(`rendering-${n}`, true) }
    await workspace(3)
    const presentationTabs = await evaluate("document.querySelectorAll('.presentation-header nav button').length")
    for (let n = 0; n < presentationTabs; n++) { await click('.presentation-header nav button', n); await disclose('.presentation-panel'); await record(`presentation-${n}`, true) }
    await workspace(0)
    const tabs = await evaluate("[...document.querySelectorAll('.compact-tab-select option')].map(e=>e.value)")
    for (let n = 0; n < tabs.length; n++) {
      if (await evaluate("getComputedStyle(document.querySelector('.compact-tab-select')).display!=='none'")) await select('.compact-tab-select', tabs[n])
      else await click('.panel-tabs .panel-tab', n)
      await disclose('.panel-content'); await record(`bottom-${tabs[n].toLowerCase()}`, true)
    }
  })
  await check('Reach package subpanels and all Settings disclosures', async () => {
    await manage(3); await clickText('.package-header button', 'Plugin'); await disclose('.plugin-manager-tools'); await record('packages-plugins', true)
    await clickText('.package-header button', 'Browse'); await record('packages-catalog', true)
    await manage(1); await disclose('.settings-page'); await record('settings-disclosed', true)
  })
  await check('Create all six animation asset types and expose their actual editing surfaces', async () => {
    await workspace(2); await until("!!document.querySelector('.animation-studio')")
    await click('[data-panel-maximize="bottom"]')
    for (const [index, type] of ['clip', 'controller', 'rig', 'skin', 'timeline', 'mask'].entries()) {
      await click('.animation-studio .create-menu button', index); await until("!!document.querySelector('.animation-studio .studio-modes')")
      if (type === 'clip') {
        await click('.track-list>header button'); await until("!!document.querySelector('.clip-inspector>button')")
        await clickText('.transport button', 'Editing'); await disclose('.clip-inspector')
      }
      if (type === 'controller') { await click('.state-machine>.add-state'); await until("!!document.querySelector('.state-inspector input')") }
      const modes = await evaluate("document.querySelectorAll('.animation-studio .studio-modes button').length")
      for (let mode = 0; mode < modes; mode++) { await click('.animation-studio .studio-modes button', mode); await disclose('.animation-studio'); await record(`animation-${type}-${mode}`, true) }
      await click('.animation-studio>.studio-toolbar>button'); await wait(100)
    }
    await click('[data-panel-maximize="bottom"]')
  })
  await check('Observe panel text and fields across locales, scales, themes and narrow windows', async () => {
    await manage(1)
    // These are actual Settings selects and theme buttons, not CSS/style injection.
    const localeSelector = '.settings-page select:has(option[value="de"]):has(option[value="zh"])'
    const scaleSelector = '.settings-page input[type="range"][min="1"][max="2"][step="0.05"]'
    const setScale = async scale => { await click(scaleSelector); await press('Home'); for (let n = 0; n < Math.round((Number(scale) - 1) / .05); n++) await press('ArrowRight'); await press('Tab'); assert.equal(Number(await evaluate(`document.querySelector(${JSON.stringify(scaleSelector)}).value`)), Number(scale)) }
    for (const locale of ['en', 'de', 'zh']) {
      await select(localeSelector, locale)
      for (const scale of ['1', '1.5', '2']) {
        await setScale(scale)
        for (const theme of [0, 1]) {
          await click('.theme-switch button', theme); await viewport(1024, 640)
          await record(`${locale}-${scale.replace('.', '-')}-${theme === 0 ? 'dark' : 'light'}-settings`, true)
          for (let n = 0; n < 6; n++) { await workspace(n); await record(`${locale}-${scale.replace('.', '-')}-${theme}-workspace-${n}`) }
          await manage(1)
        }
      }
    }
    await select(localeSelector, 'en'); await setScale('1'); await viewport(1440, 900)
  })
  const inventory = JSON.parse(await readFile(join(evidence, 'panel-source-inventory.json'), 'utf8'))
  const sourceCoverage = inventory.records.map(record => ({ file: record.file, importReachable: record.importReachable, observedRootClass: record.roots.flatMap(root => String(root.class ?? '').split(/\s+/)).find(name => observedClasses.has(name)) ?? null, conditionalStateCount: record.conditions.length, conditionCoverage: 'Not inferred from a mounted root; only explicitly recorded route/disclosure states were exercised.' }))
  await writeFile(join(evidence, 'v26.13-panel-matrix.json'), JSON.stringify({ format: 'nova-v26.13-panel-matrix', version: 1, generatedAt: new Date().toISOString(), status: findings.length ? 'failed' : 'passed', surfaces, findings, sourceCoverage }, null, 2) + '\n')
  observations.push({ matrix: 'v26.13-panel-matrix.json', surfaces: surfaces.length, findings: findings.length, sourceCoverage })
  assert.deepEqual(findings, [], 'Every recorded panel geometry/accessibility finding must be resolved or precisely reclassified from rendered evidence')
})
