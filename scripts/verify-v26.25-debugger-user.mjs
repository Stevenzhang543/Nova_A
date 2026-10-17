/** 26.25 调试面板真实用户检查：通过键盘鼠标检查能力说明、只读观察及草稿保存。 */
import assert from 'node:assert/strict'
import {resolve} from 'node:path'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
await withBrowserAudit({release:'26.25',name:'debugger-user'},/** 从作者实际打开项目进入脚本调试面板，不调用内部运行时接口。 */ async a=>{
 const user=worldUserControls17(a)
 /** 使用真实文本输入；编辑器 Tab 是缩进键，因此通过 DOM 失焦提交而不注入额外空格。 */
 async function edit(source){await a.evaluate("(()=>{const e=document.querySelector('.editor-shell textarea');e.focus();e.select()})()");await a.client.send('Input.insertText',{text:source});await a.evaluate("document.querySelector('.editor-shell textarea').blur()");await wait(200)}
 await user.open(resolve('reference-projects/projects/creator-v2624-code-game/project.nova'))
 await user.workspace('Script')
 await a.clickText('.script-list button','CheckpointGame.rhai')
 await a.until("!!document.querySelector('.editor-shell textarea')")
 await a.check('Actual callback breakpoint, read-only scope, boundary resume and stale navigation',/** 在实际已绑定脚本中设置断点，播放并使用真实继续按钮。 */ async()=>{
  const line=await a.evaluate("document.querySelector('.editor-shell textarea').value.split('\\n').findIndex(line=>line.includes('fn start()'))")
  assert.ok(line>=0);await a.click('.gutter button',line+1)
  await user.workspace('Design');await a.click('.actionbar>button',0)
  await a.until("document.querySelector('.actionbar .mode-label')?.textContent.toLowerCase().includes('paused')",30000)
  await user.workspace('Script');await a.clickText('.inspector-tabs button','Debug')
  await a.until("document.querySelector('.debug-pane')?.textContent.includes('Callback-entry breakpoint')")
  await a.capture('callback-entry-pause')
  const original=await a.evaluate("document.querySelector('.editor-shell textarea').value")
  await edit(original+'\n// unsaved while paused')
  await a.click('.debug-pane > button')
  assert.equal(await a.evaluate("document.querySelector('.editor-shell textarea').value"),original+'\n// unsaved while paused')
  assert.match(await a.evaluate("document.querySelector('.script-studio').textContent"),/Source changed since this pause/)
  await a.click('.studio-more>summary');await a.clickText('.studio-commands button','Boundary over')
  await a.until("document.querySelector('.debug-pane')?.textContent.includes('completed at a safe callback boundary')")
  if(!await a.evaluate("document.querySelector('.studio-more').open"))await a.click('.studio-more>summary')
  await a.clickText('.studio-commands button','Continue')
  await user.workspace('Design');await a.click('.actionbar>button',3);await user.workspace('Script')
 })
 await a.clickText('.toolbar-actions button','New script')
 await a.until("!!document.querySelector('.editor-shell textarea')")
 const draft='// debugger user draft 26.25\nfn start(){print(25);}'
 await edit(draft)
 await a.clickText('.inspector-tabs button','Debug')
 await a.check('Host boundaries and unavailable VM capabilities are visible',/** 检查面板说明与不可用已捕获异常选项。 */ async()=>{
  await a.until("!!document.querySelector('.debug-pane')")
  const text=await a.evaluate("document.querySelector('.debug-pane').textContent")
  assert.match(text,/Callback-entry breakpoints/);assert.match(text,/VM statement suspension/);assert.match(text,/Host snapshot location/)
  assert.equal(await a.evaluate("document.querySelector('.debug-pane select option[value=all]').disabled"),true)
  await a.capture('host-boundary-contract')
 })
 await a.check('Watch calls are rejected and unsaved text survives navigation',/** 输入危险形式观察表达式，再切换面板确认草稿保留。 */ async()=>{
  await user.field('.debug-pane .dependency-editor input','print(999)')
  await a.click('.debug-pane .dependency-editor button');await wait(150)
  assert.match(await a.evaluate("document.querySelector('.debug-pane').textContent"),/Only snapshot property paths|Unknown snapshot property/)
  await a.clickText('.inspector-tabs button','Problems');await a.clickText('.inspector-tabs button','Debug')
  assert.equal(await a.evaluate("document.querySelector('.editor-shell textarea').value"),draft)
  await a.capture('readonly-watch-draft')
 })
})
