/** 26.30 全部 Vue 源码面板清单：枚举分支、容器及键盘契约，不把静态扫描当作浏览器通过。 */
import assert from 'node:assert/strict'
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises'
import {join,relative,basename} from 'node:path'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
import {parse} from 'vue/compiler-sfc'
const require=createRequire(import.meta.url),css=createRequire(require.resolve('vite/package.json'))('postcss'),root=process.cwd()
/** 仅遍历产品源码，按路径稳定列出所有 Vue 文件。 */
async function list(directory){const result=[];for(const entry of await readdir(directory,{withFileTypes:true})){const path=join(directory,entry.name);if(entry.isDirectory())result.push(...await list(path));else if(path.endsWith('.vue'))result.push(path)}return result.sort()}
const files=await list(join(root,'src')),sources=new Map(await Promise.all(files.map(/** 读取单个组件源，供完整模板和 CSS 分析。 */ async path=>[relative(root,path).replaceAll('\\','/'),await readFile(path,'utf8')]))),inventory=[]
/** 将任意表达式安全写入 Markdown 表格。 */
function safe(value){return String(value).replaceAll('|','\\|').replaceAll('\n',' ').replaceAll('`','ʼ')}
for(const [path,source]of sources){
 const {descriptor,errors}=parse(source,{filename:path});if(errors.length)throw Error(path+': '+errors.join('; '))
 const bindings=[],conditions=[],keyboard=[],clickOnly=[],native={button:0,input:0,select:0,textarea:0,a:0,summary:0},rules=[],name=basename(path,'.vue')
 /** 遍历整个模板，包括不在当前路由挂载的条件子树。 */
 function visit(node){
  if(node.type===1){
   if(node.tag in native)native[node.tag]++
   const directives=node.props.filter(/** 仅分析 Vue 指令，保留原始表达式与行号。 */ prop=>prop.type===7)
   for(const prop of directives){const expression=prop.exp?.content??'(fallback)',line=node.loc.start.line
    if(prop.name==='model'||prop.name==='on'&&/^(?:input|change|update:|click|submit)/.test(prop.arg?.content??''))bindings.push({line,element:node.tag,directive:prop.name,event:prop.arg?.content??'',expression})
    if(['if','else-if','else','show','for'].includes(prop.name))conditions.push({line,element:node.tag,directive:prop.name,expression})
    if(prop.name==='on'&&/^key/.test(prop.arg?.content??''))keyboard.push({line,event:prop.arg.content,handler:expression})
   }
   if(directives.some(/** 找出鼠标点击绑定以检查非原生操作入口。 */ prop=>prop.name==='on'&&prop.arg?.content==='click')&&!['button','input','a','summary','select','option','label'].includes(node.tag)&&node.tag===node.tag.toLowerCase()){
    const keyed=directives.some(/** 组件自身的键盘绑定可提供直接操作入口。 */ prop=>prop.name==='on'&&/^key/.test(prop.arg?.content??'')),tabbed=node.props.some(/** 静态或绑定 tabindex 表示显式焦点入口。 */ prop=>prop.name==='tabindex'||prop.type===7&&prop.arg?.content==='tabindex')
    if(!keyed&&!tabbed)clickOnly.push({line:node.loc.start.line,tag:node.tag})
   }
  }
  for(const child of node.children??[])visit(child)
 }
 if(descriptor.template?.ast)visit(descriptor.template.ast)
 for(const style of descriptor.styles)css.parse(style.content).walkRules(/** 收集有实际布局约束的选择器，包含媒体与容器条件。 */ rule=>{
  const declarations=rule.nodes.filter(/** 仅记录尺寸、溢出及文本裁切相关声明。 */ node=>node.type==='decl'&&/^(min-width|max-width|min-height|max-height|overflow(?:-x|-y)?|text-overflow|white-space|resize|container(?:-type|-name)?|grid-template-columns)$/.test(node.prop)).map(/** 保留属性原值，避免猜测浏览器计算尺寸。 */ node=>`${node.prop}:${node.value}`)
  if(declarations.length)rules.push({selector:rule.selector,condition:rule.parent.type==='atrule'?`@${rule.parent.name} ${rule.parent.params}`:'base',declarations})
 })
 const owners=[...sources].filter(/** 查找直接导入或模板使用，保留全部已知宿主路径。 */ ([other,text])=>other!==path&&(text.includes('/'+name+'.vue')||text.includes('<'+name))).map(/** 提取宿主路径作为问题责任位置。 */ ([other])=>other)
 inventory.push({path,sha256:createHash('sha256').update(source).digest('hex'),owner:owners.length?owners:['application entry / runtime mounting; '+path],bindings,conditions,keyboard,native,clickOnly,rules,expansion:/PanelMaximizeButton|maximiz|expandPanel/.test(source)?'Local maximize/expand source exists; inspect host policy.':'Host workspace/modal supplies available area; no separate local maximize control.',stateEvidence:{empty:conditions.filter(/** 定位显式空集合或选择为空条件。 */ row=>/length|empty|selected|!\w/.test(row.expression)),loading:conditions.filter(/** 定位显式等待或进行中条件。 */ row=>/loading|pending|busy|progress|loaded|running/i.test(row.expression)),error:conditions.filter(/** 定位显式错误、诊断或冲突条件。 */ row=>/error|issue|diagnostic|conflict|invalid|fail/i.test(row.expression)),populated:conditions.filter(/** 列表循环表示有数据时的模板入口。 */ row=>row.directive==='for')}})
}
const lines=['# Nova_A 26.30 — 全 Vue 面板与条件状态源码清单','',`覆盖 ${inventory.length} 个 src/**/*.vue；直接解析完整模板及各 scoped/global style 块。所有条件分支都保留；空/加载/错误/有数据标签只是源码索引，不能证明分支运行过。`,'','本清单不声称逐一点击了所有面板，不将未出现显式 loading/error 分支解释为该能力已通过。浏览器证据仅来自独立的26.30定向用户报告。原生文件选择、设备输入、权限拒绝、远端服务和各操作系统外观仍需对应真实环境。','', '## 证据边界','','全部模板条件、宿主和CSS属于静态索引。历史P26问题不能自动代表本版通过；当前浏览器结果由26.30独立用户报告记录。非原生点击候选需逐项由UI审计分类。','']
for(const item of inventory){
 lines.push(`## ${item.path}`,'',`- 责任/宿主：${item.owner.map(safe).join('；')}`,`- 扩展：${item.expansion}`,`- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。`,`- 键盘：原生控件 ${Object.entries(item.native).filter(/** 只列出非零原生控件数量。 */ ([,count])=>count).map(/** 显示控件种类及源码出现次数。 */ ([tag,count])=>`${tag}=${count}`).join(', ')||'无'}；直接键盘绑定 ${item.keyboard.length}；非原生点击候选 ${item.clickOnly.length}。`,`- 状态索引：空/选择条件 ${item.stateEvidence.empty.length}；加载/等待 ${item.stateEvidence.loading.length}；错误/诊断 ${item.stateEvidence.error.length}；有数据循环 ${item.stateEvidence.populated.length}。未命中标签不等于不存在状态，请以完整分支表为准。`,'')
 lines.push('| 行 | 元素/分支 | 原始条件或集合 |','|---|---|---|')
 for(const row of item.conditions)lines.push(`| ${row.line} | ${safe(row.element)} v-${row.directive} | ${safe(row.expression)} |`)
 if(!item.conditions.length)lines.push('| — | 静态模板 | 无条件分支；检查宿主挂载条件 |')
 lines.push('','| 选择器及条件 | 尺寸、滚动、裁切声明 |','|---|---|')
 for(const rule of item.rules)lines.push(`| ${safe(rule.selector)} (${safe(rule.condition)}) | ${safe(rule.declarations.join('; '))} |`)
 if(!item.rules.length)lines.push('| 宿主共享样式 | 无本地相关声明 |')
 if(item.keyboard.length)lines.push('',...item.keyboard.map(/** 输出明确的键盘事件处理位置。 */ row=>`- 键盘 ${row.line}: ${safe(row.event)} → ${safe(row.handler)}`))
 if(item.clickOnly.length)lines.push('',`- 静态点击候选（本组件负责）：${item.clickOnly.map(/** 将可疑操作定位回准确模板行。 */ row=>`${row.tag}:${row.line}`).join('；')}。需要按当前实际交互分类；本清单不推断是否存在键盘缺陷。`)
 lines.push('')
}
const markdown=lines.join('\n')
if(process.argv.includes('--check'))assert.equal(await readFile('docs/PANEL_INVENTORY_26_30.md','utf8'),markdown,'Panel inventory must match frozen Vue source')
else{await mkdir('docs',{recursive:true});await writeFile('docs/PANEL_INVENTORY_26_30.md',markdown)}
await mkdir('release-audits',{recursive:true})
await writeFile('release-audits/v26.30-panel-inventory.json',JSON.stringify({format:'nova-v26.30-panel-inventory',version:1,release:'26.30',engineVersion:JSON.parse(await readFile('package.json','utf8')).version,status:'passed',generatedAt:new Date().toISOString(),scope:'Complete static Vue template/CSS source inventory, not browser or state execution qualification.',files:inventory.length,branches:inventory.reduce(/** 统计源码条件及循环，不冒充运行覆盖率。 */ (sum,item)=>sum+item.conditions.length,0),sourceHashes:inventory.map(/** 用文件哈希绑定本次源码扫描证据。 */ item=>({path:item.path,sha256:item.sha256})),checks:[{name:'Every src Vue parsed with full conditional/layout inventory and named host owner',status:'passed'},{name:process.argv.includes('--check')?'Frozen documented inventory matches current source':'Document regenerated from current source',status:'passed'}]},null,2)+'\n')
await mkdir('.cache',{recursive:true});await writeFile('.cache/panel-inventory-26.30.json',JSON.stringify({format:'nova-panel-source-inventory',release:'26.30',scope:'All Vue source; branch/layout evidence only, no runtime qualification.',files:inventory},null,2))
console.log(JSON.stringify({files:inventory.length,branches:inventory.reduce(/** 累计完整模板条件和循环数量。 */ (sum,item)=>sum+item.conditions.length,0),keyboardCandidates:inventory.reduce(/** 累计仍需按操作语义分类的非原生点击入口。 */ (sum,item)=>sum+item.clickOnly.length,0)}))

/** 输出字段和事件绑定原文，只标记静态声明；不把点击事件自动归为持久化编辑。 */
const fieldMarkdown=JSON.stringify({format:'nova-field-binding-inventory',release:'26.30',scope:'All Vue v-model and input/change/update/click/submit declarations; destination expressions require operation-specific semantic evidence. Canvas/programmatic routes belong to EDIT_ROUTE_INVENTORY_26_30.json.',files:inventory.map(/** 保留组件哈希、宿主和每个字段事件绑定。 */ item=>({path:item.path,sha256:item.sha256,owners:item.owner,bindings:item.bindings}))},null,2)+'\n'
if(process.argv.includes('--check'))assert.equal(await readFile('docs/FIELD_BINDING_INVENTORY_26_30.json','utf8'),fieldMarkdown,'Field binding inventory must match frozen Vue source')
else await writeFile('docs/FIELD_BINDING_INVENTORY_26_30.json',fieldMarkdown)
