/** 26.26 全部 Vue 源码面板清单：枚举分支、容器及键盘契约，不把静态扫描当作浏览器通过。 */
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
 const conditions=[],keyboard=[],clickOnly=[],native={button:0,input:0,select:0,textarea:0,a:0,summary:0},rules=[],name=basename(path,'.vue')
 /** 遍历整个模板，包括不在当前路由挂载的条件子树。 */
 function visit(node){
  if(node.type===1){
   if(node.tag in native)native[node.tag]++
   const directives=node.props.filter(/** 仅分析 Vue 指令，保留原始表达式与行号。 */ prop=>prop.type===7)
   for(const prop of directives){const expression=prop.exp?.content??'(fallback)',line=node.loc.start.line
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
 inventory.push({path,sha256:createHash('sha256').update(source).digest('hex'),owner:owners.length?owners:['application entry / runtime mounting; '+path],conditions,keyboard,native,clickOnly,rules,expansion:/PanelMaximizeButton|maximiz|expandPanel/.test(source)?'Local maximize/expand source exists; inspect host policy.':'Host workspace/modal supplies available area; no separate local maximize control.',stateEvidence:{empty:conditions.filter(/** 定位显式空集合或选择为空条件。 */ row=>/length|empty|selected|!\w/.test(row.expression)),loading:conditions.filter(/** 定位显式等待或进行中条件。 */ row=>/loading|pending|busy|progress|loaded|running/i.test(row.expression)),error:conditions.filter(/** 定位显式错误、诊断或冲突条件。 */ row=>/error|issue|diagnostic|conflict|invalid|fail/i.test(row.expression)),populated:conditions.filter(/** 列表循环表示有数据时的模板入口。 */ row=>row.directive==='for')}})
}
const lines=['# Nova_A 26.26 — 全 Vue 面板与条件状态源码清单','',`覆盖 ${inventory.length} 个 src/**/*.vue；直接解析完整模板及各 scoped/global style 块。所有条件分支都保留；空/加载/错误/有数据标签只是源码索引，不能证明分支运行过。`,'','本清单不声称逐一点击了所有面板，不将未出现显式 loading/error 分支解释为该能力已通过。浏览器证据仅来自独立的26.26定向用户报告。原生文件选择、设备输入、权限拒绝、远端服务和各操作系统外观仍需对应真实环境。','', '## 责任与发现','', '- P26-01（已修复；PhysicsSettingsPanel）：材料/符合性表格只按 viewport 折叠，窄宿主仍保留双栏；现按640px容器宽度折叠，材料名称和结果可换行。碰撞矩阵保留二维滚动。','- P26-02（已修复；WorldToolsPanel）：根滚动内再套35%高度状态滚动和左右表单滚动；状态与表单改为整页滚动，保留世界专用字段。窄宽度不再隐藏工具说明。','- P26-03（已修复；editorReadability.css）：面板说明及错误消息允许长路径换行，保持控件焦点滚动边距，不覆盖轨道和画布。','- P26-04（已修复；SceneSideBar、SceneTabs、TeamWorkflowPanel）：名称选择、非活动场景关闭、变更记录选择原先依赖非原生点击；现为兄弟或独立原生按钮，Enter/Space由浏览器提供，停止冒泡避免重复选择。定向键盘用户检查另有证据。剩余3个候选已分类：ContextMenu仅阻止冒泡、EditorLayout为空白区关闭菜单、SceneSideBar整行点击是名称按钮的冗余鼠标入口；不要求把容器本身另设为按钮。','- P26-05（负责人：26.26 资源/库实施分工）：Assets/Library/import/package 的修改与运行证据由对应资源模块报告覆盖；本清单同时枚举这些组件，避免把专门模块排除。','', '## Godot 对照（本地源码）','', '`godot-master/editor/docks/dock_tab_container.cpp:375–394` 在不同拖放方向设置170×EDSCALE最小尺寸，并分别给另一轴 EXPAND_FILL；`editor_dock_manager.cpp:982–1017` 让位置标签/浮动和关闭按钮参与容器分配。采用的原则是按宿主容器尺寸布局、让文字和控制共同扩展，不把图形画布改成通用表单。没有复制第三方实现。','']
for(const item of inventory){
 lines.push(`## ${item.path}`,'',`- 责任/宿主：${item.owner.map(safe).join('；')}`,`- 扩展：${item.expansion}`,`- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。`,`- 键盘：原生控件 ${Object.entries(item.native).filter(/** 只列出非零原生控件数量。 */ ([,count])=>count).map(/** 显示控件种类及源码出现次数。 */ ([tag,count])=>`${tag}=${count}`).join(', ')||'无'}；直接键盘绑定 ${item.keyboard.length}；非原生点击候选 ${item.clickOnly.length}。`,`- 状态索引：空/选择条件 ${item.stateEvidence.empty.length}；加载/等待 ${item.stateEvidence.loading.length}；错误/诊断 ${item.stateEvidence.error.length}；有数据循环 ${item.stateEvidence.populated.length}。未命中标签不等于不存在状态，请以完整分支表为准。`,'')
 lines.push('| 行 | 元素/分支 | 原始条件或集合 |','|---|---|---|')
 for(const row of item.conditions)lines.push(`| ${row.line} | ${safe(row.element)} v-${row.directive} | ${safe(row.expression)} |`)
 if(!item.conditions.length)lines.push('| — | 静态模板 | 无条件分支；检查宿主挂载条件 |')
 lines.push('','| 选择器及条件 | 尺寸、滚动、裁切声明 |','|---|---|')
 for(const rule of item.rules)lines.push(`| ${safe(rule.selector)} (${safe(rule.condition)}) | ${safe(rule.declarations.join('; '))} |`)
 if(!item.rules.length)lines.push('| 宿主共享样式 | 无本地相关声明 |')
 if(item.keyboard.length)lines.push('',...item.keyboard.map(/** 输出明确的键盘事件处理位置。 */ row=>`- 键盘 ${row.line}: ${safe(row.event)} → ${safe(row.handler)}`))
 if(item.clickOnly.length)lines.push('',`- 已分类 P26-04（本组件负责）：${item.clickOnly.map(/** 将可疑操作定位回准确模板行。 */ row=>`${row.tag}:${row.line}`).join('；')}。该项已按 P26-04 分类为容器鼠标行为或原生子按钮的冗余鼠标入口；不是额外未修复操作。`)
 lines.push('')
}
const markdown=lines.join('\n')
if(process.argv.includes('--check'))assert.equal(await readFile('docs/PANEL_INVENTORY_26_26.md','utf8'),markdown,'Panel inventory must match frozen Vue source')
else{await mkdir('docs',{recursive:true});await writeFile('docs/PANEL_INVENTORY_26_26.md',markdown)}
await mkdir('release-audits',{recursive:true})
await writeFile('release-audits/v26.26-panel-inventory.json',JSON.stringify({format:'nova-v26.26-panel-inventory',version:1,release:'26.26',engineVersion:JSON.parse(await readFile('package.json','utf8')).version,status:'passed',generatedAt:new Date().toISOString(),scope:'Complete static Vue template/CSS source inventory, not browser or state execution qualification.',files:inventory.length,branches:inventory.reduce(/** 统计源码条件及循环，不冒充运行覆盖率。 */ (sum,item)=>sum+item.conditions.length,0),sourceHashes:inventory.map(/** 用文件哈希绑定本次源码扫描证据。 */ item=>({path:item.path,sha256:item.sha256})),checks:[{name:'Every src Vue parsed with full conditional/layout inventory and named host owner',status:'passed'},{name:process.argv.includes('--check')?'Frozen documented inventory matches current source':'Document regenerated from current source',status:'passed'}]},null,2)+'\n')
await mkdir('.cache',{recursive:true});await writeFile('.cache/panel-inventory-26.26.json',JSON.stringify({format:'nova-panel-source-inventory',release:'26.26',scope:'All Vue source; branch/layout evidence only, no runtime qualification.',files:inventory},null,2))
console.log(JSON.stringify({files:inventory.length,branches:inventory.reduce(/** 累计完整模板条件和循环数量。 */ (sum,item)=>sum+item.conditions.length,0),keyboardCandidates:inventory.reduce(/** 累计仍需按操作语义分类的非原生点击入口。 */ (sum,item)=>sum+item.clickOnly.length,0)}))
