/** 绑定重命名和签名的真实用户审计：通过可视字段及源码编辑，核对调用引用与遮蔽变量保持正确。 */
import assert from 'node:assert/strict'
import {resolve} from 'node:path'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
await withBrowserAudit({release:'26.24',name:'binding-user',width:1920,height:1080},/** 使用实际控件，不通过应用模块修改图状态。 */ async a=>{
 const user=worldUserControls17(a)
 await user.open(resolve('reference-projects/projects/creator-v2624-code-game/project.nova'))
 await user.workspace('Script');await a.clickText('.toolbar-actions button','New script')
 /** 直接输入源码，避免编辑器把测试中的 Tab 当作用户缩进。 */
 async function inputSource(text){await a.evaluate("(()=>{const e=document.querySelector('.editor-shell textarea');e.focus();e.select()})()");await a.client.send('Input.insertText',{text});await a.evaluate("document.querySelector('.editor-shell textarea').blur()")}
 /** 等待模式转换与初始排版完成后再操作图。 */
 async function graphMode(){await a.click('.logic-mode button',1);await a.until("document.querySelectorAll('.graph-node').length>5");await a.until("!document.querySelector('.graph-editor[data-initial-layout=running]')");await wait(200)}
 /** 通过导航搜索选中可见的声明项，确认选中的节点类型。 */
 async function selectDeclaration(query,label,type){await a.fill('.graph-symbol-search input',query);a.observations.push({name:'declaration-search',query,labels:await a.evaluate("[...document.querySelectorAll('.graph-symbol-search button')].map(e=>e.textContent)")});await a.clickText('.graph-symbol-search button',label);await a.until("!!document.querySelector('.graph-node.selected')");assert.equal(await a.evaluate("document.querySelector('.graph-node.selected').dataset.nodeType"),type)}
 const source='fn adjust_score(amount){let temp=amount+1;{let temp=10;print(temp);}temp}\nfn start(){print(adjust_score(2));}\n'
 await inputSource(source);await graphMode()
 await a.check('Visual function rename updates the call while preserving nested local bindings',/** 名称输入触发共享词法绑定重命名。 */ async()=>{
  await selectDeclaration('adjust_score','Function Declaration · adjust_score','rhai.FunctionDeclaration')
  await a.fill('.syntax-fields>label>input:not([type])','score_after_bonus')
  assert.equal(await a.evaluate("document.querySelector('.syntax-fields [role=alert]')?.textContent??''"),'')
  await a.click('.logic-mode button',0);await a.until("!!document.querySelector('.editor-shell textarea')")
  const text=await a.evaluate("document.querySelector('.editor-shell textarea').value")
  assert.match(text,/fn score_after_bonus\(amount\)/);assert.match(text,/print\(score_after_bonus\(2\)\)/);assert.match(text,/let temp=10;print\(temp\)/);assert.doesNotMatch(text,/adjust_score/)
 })
 await a.check('Visual parameter rename updates its references without changing shadowed locals',/** 参数身份重命名必须同时更新函数体中的绑定引用。 */ async()=>{
  await graphMode();await selectDeclaration('amount','Parameter · amount','rhai.Parameter')
  await a.fill('.syntax-fields>label>input:not([type])','points')
  await a.click('.logic-mode button',0);await a.until("!!document.querySelector('.editor-shell textarea')")
  const text=await a.evaluate("document.querySelector('.editor-shell textarea').value")
  assert.match(text,/fn score_after_bonus\(points\)/);assert.match(text,/let temp=(?:points|\(points\))\+1/);assert.match(text,/let temp=10;print\(temp\)/);assert.doesNotMatch(text,/amount/)
 })
 await a.check('Changed source signature generates two visual parameter slots and survives return to code',/** 同时修改声明和调用，再核对视觉参数数量与完整返回源码。 */ async()=>{
  const revised='fn score_after_bonus(points,bonus){let temp=points+bonus;{let temp=10;print(temp);}temp}\nfn start(){print(score_after_bonus(2,3));}\n'
  await inputSource(revised);await graphMode()
  await selectDeclaration('score_after_bonus','Function Declaration · score_after_bonus','rhai.FunctionDeclaration')
  const slots=await a.evaluate("[...document.querySelectorAll('.syntax-child-list [data-syntax-slot^=parameters_]')].map(e=>e.querySelector('span').textContent)")
  assert.equal(slots.length,3,'Two parameter connections plus the documented empty insertion slot')
  assert.equal(slots.filter(/** 空插入槽不是第三个函数参数。 */ text=>text.includes('Empty; connect a node')).length,1)
  assert.ok(slots.some(/** 声明参数 points 必须连接到对应结构节点。 */ text=>text.includes('Parameter · points')))
  assert.ok(slots.some(/** 新增参数 bonus 必须连接到对应结构节点。 */ text=>text.includes('Parameter · bonus')))
  a.observations.push({name:'signature-slots',slots,connectedParameters:2,emptyInsertionSlots:1})
  await a.capture('two-parameter-signature')
  await a.click('.logic-mode button',0);await a.until("!!document.querySelector('.editor-shell textarea')")
  const returned=await a.evaluate("document.querySelector('.editor-shell textarea').value"),header=returned.match(/^\/\/ @nova-graph-link [0-9a-f-]{36}\n\/\/ Rhai structure IR 1: code and typed nodes share the same program\.\n/)
  assert.equal(header?returned.slice(header[0].length):returned,revised)
 })
})
