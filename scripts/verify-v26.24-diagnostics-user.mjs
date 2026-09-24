/** 转换失败的三语言真实用户检查：保留原稿与原始诊断，通过可见详情读取具体原因。 */
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const expectedRelease=JSON.parse(await readFile('package.json','utf8')).version.replace(/\.0$/,'')
/** 使用实际设置、文本编辑器及转换按钮，DOM 只用于聚焦和读取。 */
await withBrowserAudit({release:'26.24',name:'diagnostics-user',expectedRelease,development:expectedRelease!=='26.24'},/** 结构说明（自动提取）：withBrowserAudit 回调；输入 a；直接调用 worldUserControls17、user.open、resolve、user.workspace、a.clickText 等；包含循环处理；等待异步结果。 */ async a=>{
  const user=worldUserControls17(a)
  await user.open(resolve('reference-projects/projects/creator-v2624-code-game/project.nova'))
  await user.workspace('Script');await a.clickText('.toolbar-actions button','New script')
  const valid='// 作者原稿 user_42\nfn start(){print(42);}',invalid='// 作者原稿 user_42\nfn start(){const broken;}'
  /** 经真实键盘输入替换当前草稿，失焦触发现有诊断流程。 */
  async function edit(source){await a.evaluate("(()=>{const e=document.querySelector('.editor-shell textarea');e.focus();e.select()})()");await a.client.send('Input.insertText',{text:source});await a.evaluate("document.querySelector('.editor-shell textarea').blur()");await wait(250)}
  await edit(valid)
  for(const [locale,expected] of [['zh','常量必须提供初始值'],['de','Eine Konstante benötigt einen Anfangswert'],['en','A constant requires an initializer']]){
    /** 从正常脚本状态切换语言，再故意制造同一个诊断，避免丢弃未保存错误草稿。 */
    await a.check('Conversion failure preserves the source and details in '+locale,/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 user.workspace、a.click、a.until、a.select、edit 等；等待异步结果。 */ async()=>{
      await user.workspace('Manage');await a.click('.manage-body>nav button',1);await a.until("!!document.querySelector('[data-audit=color-palette]')");await a.click('.settings-search nav button',0)
      await a.select('.settings-page select:has(option[value="de"]):has(option[value="zh"])',locale)
      await user.workspace('Script');await a.until("!!document.querySelector('.editor-shell textarea')")
      await edit(invalid);await a.click('.logic-mode button',1)
      await a.until("!!document.querySelector('.conversion-review .conversion-region.error')")
      const text=await a.evaluate("document.querySelector('.conversion-review').textContent")
      assert.ok(text.includes(expected),text)
      assert.equal(await a.evaluate("document.querySelector('.editor-shell textarea').value"),invalid)
      assert.equal(await a.evaluate("!!document.querySelector('.graph-editor')"),false)
      if(locale!=='en'){
        await a.click('.conversion-review .conversion-region.error details>summary')
        const raw=await a.evaluate("document.querySelector('.conversion-review .conversion-region.error details[open] pre').textContent")
        assert.equal(raw,'A constant requires an initializer.')
      }
      await a.capture('diagnostic-'+locale)
      await a.click('.conversion-review-actions button:last-child');await edit(valid)
    })
  }
})
