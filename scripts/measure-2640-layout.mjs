/** 测量 26.40 UI 重构前的真实布局溢出与尺寸，避免凭感觉改。 */
import { readFile } from 'node:fs/promises'
import { withBrowserAudit } from './lib/browserUserAudit.mjs'

const packageVersion = JSON.parse(await readFile('package.json', 'utf8')).version
const release = packageVersion.replace(/\.0$/, '')
const report = {}

await withBrowserAudit({ release, name: 'layout-measure-2640', width: 1600, height: 1000 }, async a => {
  await a.until("!!document.querySelector('.project-manager')", 30000)
  await a.click('.quick-actions .new-project'); await a.until("!!document.querySelector('.creation-card')")
  await a.fill('.creation-card header input', 'Layout measurement')
  await a.click('[data-template-id="top-down"]'); await a.click('.create-button')
  await a.until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')", 30000)
  if (await a.evaluate("!!document.querySelector('.onboarding-scrim')")) {
    await a.evaluate("document.querySelector('.onboarding-scrim').focus()"); await a.press('Escape')
    await a.until("!document.querySelector('.onboarding-scrim')")
  }

  const measure = `(() => {
    const info = (el, label) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return { label, w: Math.round(r.width), h: Math.round(r.height), clientW: el.clientWidth, scrollW: el.scrollWidth, overflowX: el.scrollWidth > el.clientWidth + 1, fontSize: cs.fontSize, padding: cs.padding, gap: cs.gap, display: cs.display }
    }
    const row = document.querySelector('.workspace-control-row')
    const top = document.querySelector('.top-bar')
    const list = document.querySelector('.workspace-list')
    const ctx = document.querySelector('.context-title')
    const action = document.querySelector('.actionbar')
    return {
      viewport: { w: innerWidth, h: innerHeight },
      topBar: info(top, 'top-bar'),
      topBarChildren: top ? [...top.children].map(c => info(c, c.className)) : [],
      controlRow: info(row, 'workspace-control-row'),
      controlRowChildren: row ? [...row.children].map(c => info(c, c.className)) : [],
      workspaceList: info(list, 'workspace-list'),
      workspaceTabs: list ? [...list.children].map(c => info(c, c.textContent.trim().slice(0, 20))) : [],
      contextTitle: info(ctx, 'context-title'),
      contextTitleText: ctx ? { text: ctx.textContent.trim().slice(0, 80), strongW: ctx.querySelector('strong')?.scrollWidth, strongClientW: ctx.querySelector('strong')?.clientWidth } : null,
      actionBar: info(action, 'actionbar'),
      sceneTabs: info(document.querySelector('.scene-tabs'), 'scene-tabs'),
      bottomTabs: info(document.querySelector('.bottom-panel .panel-tabs'), 'bottom-tabs'),
      inspectorW: Math.round(document.querySelector('.inspector-pane')?.getBoundingClientRect().width ?? 0),
      hierarchyW: Math.round(document.querySelector('.hierarchy-pane, .scene-sidebar')?.getBoundingClientRect().width ?? 0),
      truncations: [...document.querySelectorAll('.editor-root *')].filter(el => el.children.length === 0 && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0).slice(0, 20).map(el => ({ cls: String(el.className).slice(0, 40), text: (el.textContent || '').trim().slice(0, 30), clientW: el.clientWidth, scrollW: el.scrollWidth }))
    }
  })()`
  report.wide = await a.evaluate(measure)
  await a.client.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
  await new Promise(resolve => setTimeout(resolve, 400))
  report.narrow = await a.evaluate(measure)
})

/** 输出紧凑摘要，便于直接判断空间分配。 */
const summarize = (scope, data) => {
  const lines = ['--- ' + scope + ' viewport=' + data.viewport.w + 'x' + data.viewport.h]
  const node = (label, item) => { if (item) lines.push('  ' + label.padEnd(24) + String(item.w).padStart(5) + 'px  scrollW=' + String(item.scrollW).padStart(5) + (item.overflowX ? '  OVERFLOW' : '')) }
  node('top-bar', data.topBar)
  for (const t of data.topBarChildren ?? []) node('  .' + String(t.label).split(' ')[0], t)
  node('control-row', data.controlRow)
  for (const t of data.controlRowChildren ?? []) node('  .' + String(t.label).split(' ')[0], t)
  node('workspace-list', data.workspaceList)
  lines.push('  tabs: ' + (data.workspaceTabs ?? []).map(/** 显示每个标签宽度。 */ t => t.label + '=' + t.w).join(' '))
  node('actionbar', data.actionBar)
  node('scene-tabs', data.sceneTabs)
  lines.push('  truncations=' + (data.truncations ?? []).length + (data.truncations?.length ? ' ' + JSON.stringify(data.truncations.slice(0, 5)) : ''))
  return lines.join('\n')
}
console.log(summarize('wide 1600', report.wide))
console.log(summarize('narrow 1280', report.narrow))

