/** 关键动作必须可读：UiButton 的 label 只用于 title/aria，可见文字只来自默认插槽。
 * 因此"是否纯图标"必须按 icon && !slot 判定，不能按是否写了 label 判定。 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const checks = []
async function test(name, run) {
  try { await run(); checks.push({ name, status: 'passed' }); console.log('PASS ' + name) }
  catch (error) { checks.push({ name, status: 'failed', error: String(error && error.message || error) }); console.error('FAIL ' + name + ' :: ' + (error && error.message || error)) }
}

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.vue')) out.push(full)
  }
  return out
}

/** 统计每个文件的按钮可见性，返回纯图标清单与总数。 */
function measure() {
  const iconOnly = []
  let withText = 0
  let withoutIcon = 0
  for (const file of walk('src')) {
    const source = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n')
    const lines = source.split('\n')
    for (const match of source.matchAll(/<UiButton\b([^>]*?)(\/?)>/g)) {
      const attrs = match[1]
      if (!/\sicon="/.test(attrs)) { withoutIcon += 1; continue }
      const line = source.slice(0, match.index).split('\n').length
      if (match[2] === '/') { iconOnly.push({ file: file.replaceAll('\\', '/'), line, text: lines[line - 1].trim().slice(0, 120) }); continue }
      const rest = source.slice(match.index + match[0].length)
      const end = rest.indexOf('</UiButton>')
      const inner = end >= 0 ? rest.slice(0, end) : ''
      if (/<span|<kbd|\{\{/.test(inner)) withText += 1
      else iconOnly.push({ file: file.replaceAll('\\', '/'), line, text: lines[line - 1].trim().slice(0, 120) })
    }
  }
  return { iconOnly, withText, withoutIcon }
}

const panelSource = fs.readFileSync('src/components/EditorBottomPanel.vue', 'utf8').replaceAll('\r\n', '\n')
const requiredText = ['importAssets', 'newScript', 'visualGraph', 'createSceneAsset', 'newFolder']
const measured = measure()

await test('Primary authoring actions render visible text, not just an icon', () => {
  for (const key of requiredText) {
    assert.ok(panelSource.includes(">{{ t('" + key + "') }}</span>"), key + ' must render its own label as visible text')
  }
})

await test('Those actions keep their label so the tooltip and accessible name survive', () => {
  for (const key of requiredText) {
    assert.ok(panelSource.includes(':label="t(\'' + key + '\')"'), key + ' must keep :label for title and aria-label')
  }
})

await test('The icon-only measurement is reported and bounded', () => {
  assert.ok(measured.iconOnly.length > 0, 'the measurement must find icon-only buttons')
  assert.ok(measured.withText > 0, 'the measurement must find labelled buttons')
  globalThis.__measured = measured
})

await test('Icon-only buttons never exceed the recorded ceiling', () => {
  // Ceiling can only be lowered. Raising it requires a deliberate edit with a written reason.
  const CEILING = 213
  assert.ok(measured.iconOnly.length <= CEILING,
    'icon-only buttons grew to ' + measured.iconOnly.length + ' (ceiling ' + CEILING + '); key actions need visible text per the iteration brief section 22.1')
})

const out = process.env.NOVA_ACTION_LABEL_REPORT || 'reports/phase2/action-labels.json'
fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true })
fs.writeFileSync(out, JSON.stringify({
  generatedAt: new Date().toISOString(),
  counts: { iconOnly: measured.iconOnly.length, visibleText: measured.withText, withoutIcon: measured.withoutIcon },
  primaryAuthoringActionsFixed: requiredText,
  remainingIconOnly: measured.iconOnly,
  checks,
  status: checks.some(/** 任一失败即整体失败。 */ c => c.status === 'failed') ? 'failed' : 'passed',
}, null, 2) + '\n')
console.log('action label report -> ' + out + ' (icon-only ' + measured.iconOnly.length + ', visible text ' + measured.withText + ')')
if (checks.some(/** 任一失败即非零退出。 */ c => c.status === 'failed')) process.exitCode = 1
