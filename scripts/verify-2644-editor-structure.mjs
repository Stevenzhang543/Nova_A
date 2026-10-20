/** 26.44 editor structure (G1 leftovers), with real pointer input against the built editor:
 *  - the context rail is merged into the docked Hierarchy panel and returns as a rail only when the
 *    Hierarchy is an overlay (narrow layout); its tools still open the bottom panel;
 *  - the Inspector header has two rows: name and Add component, then search with one filter menu;
 *    a chosen filter shows as a token that clears it;
 *  - the bottom panel has three dock heights next to the free resize handle;
 *  - the canvas keeps at least 640 px at 1100 and 1280 px.
 *
 * Usage: build first (vite build), then `node scripts/verify-2644-editor-structure.mjs`.
 * Set NOVA_AUDIT_BROWSER to a Chromium executable on systems without Microsoft Edge. */
import assert from 'node:assert/strict'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'

const release = JSON.parse(await (await import('node:fs/promises')).readFile('package.json', 'utf8')).version.split('.').slice(0, 2).join('.')

await withBrowserAudit({ release, name: 'editor-structure-2644', width: 1600, height: 900 }, async ({ evaluate, until, click, clickText, press, capture, check, viewport, observations }) => {
  const rect = selector => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||!e.getClientRects().length)return null;const b=e.getBoundingClientRect();return{x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)}})()`)
  const visibleCount = selector => evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').length`)

  await check('A platformer project opens in the editor', async () => {
    await until("!!document.querySelector('.project-manager .new-project')")
    await click('.project-manager .new-project')
    await until("!!document.querySelector('.creation-dialog .create-button')")
    await clickText('.creation-dialog [data-template-id]', 'Platformer Scene')
    await click('.creation-dialog .create-button')
    await until("!!document.querySelector('.editor-root .top-bar .workspace-list')", 30000)
    await wait(800)
    const skip = await evaluate("[...document.querySelectorAll('button')].findIndex(b=>b.textContent.trim()==='Skip for now')")
    if (skip >= 0) await clickText('button', 'Skip for now', true)
    if (await evaluate("!!document.querySelector('.ui-dialog [data-onboarding], .onboarding-dialog')")) await press('Escape')
    await wait(300)
  })

  await check('The context tools sit at the top of the docked Hierarchy; there is no separate rail', async () => {
    assert.equal(await visibleCount('.editor-main > .sidebar'), 0, 'no rail next to a docked Hierarchy')
    const tools = await rect('.left-dock .sidebar-container .context-tools')
    const hierarchy = await rect('.left-dock .sidebar-container')
    assert.ok(tools && hierarchy, 'the tools are in the Hierarchy panel')
    assert.ok(tools.y - hierarchy.y <= 4 && tools.w >= hierarchy.w - 4, `the tools span the top of the panel ${JSON.stringify({ tools, hierarchy })}`)
    assert.ok(await visibleCount('.left-dock .context-tools .ui-button') >= 3, 'scene view, assets, console and create')
    // The Console tool opens the bottom panel on the Console tab.
    const consoleIndex = await evaluate("[...document.querySelectorAll('.left-dock .context-tools .ui-button')].findIndex(b=>/Console/.test(b.getAttribute('aria-label')||''))")
    assert.ok(consoleIndex >= 0, 'a Console tool')
    await click('.left-dock .context-tools .ui-button', consoleIndex); await wait(500)
    assert.equal(await evaluate("document.querySelector('.bottom-panel')?.classList.contains('collapsed')"), false, 'the bottom panel opened')
    assert.equal(await evaluate("[...document.querySelectorAll('.left-dock .context-tools .ui-button')][" + consoleIndex + "].getAttribute('aria-pressed')"), 'true')
    await capture('hierarchy-context-tools')
  })

  await check('The bottom panel snaps to short, medium and tall heights', async () => {
    assert.equal(await visibleCount('.bottom-panel .dock-preset'), 3)
    const heights = {}
    for (const [index, name] of [[2, 'tall'], [0, 'short'], [1, 'medium']]) {
      await click('.bottom-panel .dock-preset', index); await wait(600)
      heights[name] = (await rect('.bottom-panel')).h
      assert.equal(await evaluate(`document.querySelectorAll('.bottom-panel .dock-preset')[${index}].getAttribute('aria-pressed')`), 'true', `${name} is pressed`)
    }
    assert.ok(Math.abs(heights.short - 160) <= 2, `short ${heights.short}`)
    assert.ok(Math.abs(heights.medium - 280) <= 2, `medium ${heights.medium}`)
    assert.ok(Math.abs(heights.tall - Math.min(440, 900 * 0.64)) <= 2, `tall ${heights.tall}`)
    observations.push({ name: 'dock-heights', ...heights })
    await capture('bottom-dock-medium')
  })

  await check('The Inspector header is two rows with one filter menu; a filter shows as a clearing token', async () => {
    await clickText('.entity-item .name', 'Player'); await wait(400)
    assert.equal(await evaluate("document.querySelector('.inspector-header h3')?.textContent.trim()"), 'Player')
    assert.equal(await visibleCount('.inspector-categories'), 0, 'no row of category chips')
    const header = await rect('.inspector-header'), search = await rect('.inspector-search-row'), sticky = await rect('.inspector-sticky')
    assert.ok(header && search && sticky, 'header and search rows')
    assert.ok(search.y >= header.y + header.h && sticky.y + sticky.h - (search.y + search.h) <= 16, `two rows of chrome: ${JSON.stringify({ header, search, sticky })}`)
    assert.ok(await rect('.inspector-header .add-component-trigger'), 'Add component is in the first row')
    const sectionsBefore = await visibleCount('.config-panel .settings-content > *')
    await click('.inspector-filter-trigger'); await wait(300)
    assert.equal(await visibleCount('.inspector-filter-menu > button'), 9, 'seven categories and two toggles')
    await capture('inspector-filter-menu')
    await clickText('.inspector-filter-menu > button', 'Physics'); await wait(400)
    assert.equal(await visibleCount('.inspector-filter-menu > button'), 0, 'choosing closes the menu')
    assert.equal(await evaluate("document.querySelector('.inspector-filter-token')?.textContent.trim()"), 'Physics')
    const sectionsFiltered = await visibleCount('.config-panel .settings-content > *')
    assert.ok(sectionsFiltered < sectionsBefore, `the filter hides sections (${sectionsBefore} → ${sectionsFiltered})`)
    await capture('inspector-filtered')
    await click('.inspector-filter-token'); await wait(300)
    assert.equal(await visibleCount('.inspector-filter-token'), 0, 'the token clears the filter')
    assert.equal(await visibleCount('.config-panel .settings-content > *'), sectionsBefore)
    // Escape closes the menu and returns focus to its button.
    await click('.inspector-filter-trigger'); await wait(250)
    await press('Escape'); await wait(250)
    assert.equal(await visibleCount('.inspector-filter-menu > button'), 0)
    assert.equal(await evaluate("document.activeElement?.classList.contains('inspector-filter-trigger')"), true, 'focus returns to the filter button')
  })

  await check('The canvas keeps at least 640 px at 1100 and 1280 px; the rail returns when the Hierarchy is an overlay', async () => {
    const sizes = {}
    for (const [width, height] of [[1600, 900], [1366, 768], [1280, 800], [1100, 720], [880, 900]]) {
      await viewport(width, height); await wait(500)
      sizes[width] = { canvas: (await rect('.editor-content'))?.w ?? 0, rail: await visibleCount('.editor-main > .sidebar'), layout: await evaluate("document.querySelector('.editor-root')?.dataset.layout") }
      assert.equal(await evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth'), 0, `${width}: no horizontal page scroll`)
    }
    assert.ok(sizes[1280].canvas >= 640 && sizes[1100].canvas >= 640, JSON.stringify(sizes))
    assert.equal(sizes[1600].rail, 0); assert.equal(sizes[1100].rail, 0)
    assert.equal(sizes[880].layout, 'narrow'); assert.equal(sizes[880].rail, 1, 'narrow layout: the Hierarchy is an overlay, the tools are a rail')
    observations.push({ name: 'canvas-widths', ...sizes })
    await viewport(1366, 768); await wait(500); await capture('editor-1366')
  })
})
