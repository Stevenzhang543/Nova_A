/** 生成逐文件中文用途索引，为严格数据格式、二进制及历史资料提供不改变内容的伴随说明。 */
import {writeFile} from 'node:fs/promises'
import {extname,basename} from 'node:path'
import {releaseSourceInventory} from './release-source-snapshot.mjs'
const output='docs/SOURCE_FILE_GUIDE_ZH_26_24.md'
/** 根据实际文件类别及所属目录说明用途；保留文件身份，不推断运行验证结论。 */
function purpose(path){
 const extension=extname(path),name=basename(path)
 if(path===output)return '本索引：逐项说明当前发布自有文件的用途与注释位置。'
 if(path.startsWith('reference-projects/')){if(extension==='.nova')return '参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。';if(extension==='.rhai')return '参考项目的 Rhai 行为脚本；函数说明位于源码，签名夹具另有伴随说明。';if(extension==='.md')return '参考项目说明：描述该目录项目的操作、预期结果或验证边界。';if(name==='expected-output.json')return '参考项目的预期输出数据，供实际运行结果比较。';if(name==='test-controls.json')return '参考项目的操作输入与检查配置。';return '参考项目配套数据或资产；由同目录项目和说明文件引用。'}
 if(path.startsWith('tests/'))return extension==='.rhai'?'Rhai 测试输入：包含正常或预期失败场景，按测试标记运行。':'测试夹具或配置：作为固定输入、预期输出或安全边界样本，不能当作产品通过证明。'
 if(path.startsWith('manual/'))return '离线用户手册：提供对应语言的操作说明或手册浏览入口。'
 if(path.startsWith('docs/'))return '工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。'
 if(path.startsWith('templates/'))return '模板创作资料：用于创建示例项目或包；严格清单保留原始数据结构。'
 if(path.startsWith('scripts/fixtures/'))return '验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。'
 if(path.startsWith('scripts/lib/'))return '构建与验证共享库：文件内中文注释说明接口和辅助流程。'
 if(path.startsWith('scripts/'))return '命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。'
 if(path.startsWith('src-tauri/icons/'))return '原生应用图标资源：用于窗口、安装程序及操作系统显示，二进制内容保持原样。'
 if(path.startsWith('src-tauri/'))return extension==='.rs'?'原生桌面宿主源码：实现系统交互、命令及播放器集成；中文说明位于源码。':'原生宿主构建、权限或应用配置，按 Tauri 工具链读取。'
 if(path.startsWith('crates/')||path.startsWith('nova_core/'))return extension==='.rs'?'Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。':'Rust 包依赖或构建配置，约束对应引擎模块的编译。'
 if(path.startsWith('src/')){if(extension==='.vue')return 'Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。';if(extension==='.ts')return 'TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。';if(extension==='.css')return '编辑器共享样式：控制界面呈现，不改变项目内容。';if(['.svg','.png','.ico','.icns'].includes(extension))return '界面图形资产：由组件或入口引用，外观及资源字节保持原样。';return '前端配套数据或生成清单：按所属模块消费，严格格式使用本索引作中文说明。'}
 if(path.startsWith('.github/'))return '持续集成流程配置：定义自动化构建或验证的触发条件及任务。'
 if(name==='package.json')return '前端包权威版本、依赖和命令入口；JSON 不允许注释，中文说明保存在本索引。'
 if(name.includes('lock'))return '依赖锁文件：固定可复现的包版本和完整性信息，由对应包管理器维护。'
 if(extension==='.html')return '应用或播放器 HTML 入口：供构建工具生成可部署页面。'
 if(extension==='.md')return '项目介绍、许可或设计资料；保留原文，本索引提供其文件级中文用途说明。'
 if(['.json','.toml','.yaml','.yml'].includes(extension)||name.startsWith('.'))return '仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。'
 return '自有配套资源或配置：由仓库构建和运行流程引用，使用本索引保存中文文件级说明。'
}
const files=await releaseSourceInventory(process.cwd())
if(!files.some(/** 检查索引是否已被源码清单收录。 */ row=>row.path===output))files.push({path:output})
files.sort(/** 按路径稳定排列，便于检查版本差异。 */ (a,b)=>a.path.localeCompare(b.path,'en'))
const lines=['# Nova_A 26.24 自有文件中文索引','','本表覆盖发布源码清单中的每一个文件。可执行源码的函数说明在代码旁；JSON、锁文件、项目数据、二进制资产和历史资料使用本表作为文件级伴随说明，避免插入注释破坏解析、签名或原始证据。','','依赖、构建输出、缓存、既有 releases 和只读 Godot 参考树不属于此自有源码清单。中文说明的存在不代表全平台资格或无缺陷证明。','','部分短回调与剩余函数使用明确标记的自动结构说明，只陈述语法树中的输入、直接调用、状态写入和控制流；另有人工按实际职责撰写的说明。两者均保持代码行为。','','| 文件 | 中文用途说明 |','| --- | --- |',...files.map(/** 将文件身份及用途写为一行 Markdown，保留精确相对路径。 */ row=>'| `'+row.path+'` | '+purpose(row.path)+' |'),'']
await writeFile(output,lines.join('\n'),'utf8')
console.log(JSON.stringify({output,files:files.length,status:'written',scope:'file documentation only'}))
