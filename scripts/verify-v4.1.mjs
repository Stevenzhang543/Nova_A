/** 功能回归脚本：执行 verify-v4.1.mjs 对应场景，保留断言和证据输出。 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), output = join(root,'release-audits'), generatedAt = new Date().toISOString()
globalThis.localStorage ??= { values:new Map(), /* 当 this.values.get(k) 为 null 或 undefined 时返回 null，否则保留左侧值。 */ getItem(k){return this.values.get(k)??null}, /** 结构说明（自动提取）：setItem；输入 k、v；直接调用 values.set、String。 */ setItem(k,v){this.values.set(k,String(v))}, /** 结构说明（自动提取）：removeItem；输入 k；直接调用 values.delete。 */ removeItem(k){this.values.delete(k)}, /** 结构说明（自动提取）：clear；无显式参数；直接调用 values.clear。 */ clear(){this.values.clear()}, /* 当 [...this.values.keys()][i] 为 null 或 undefined 时返回 null，否则保留左侧值。 */ key(i){return [...this.values.keys()][i]??null}, /* 返回 this.values.size 的当前值。 */ get length(){return this.values.size} }
globalThis.crypto ??= { randomUUID: /** 结构说明（自动提取）：匿名回调；无显式参数；直接调用 slice、toString、Math.random；返回表达式求值结果。 */ () => `test-${Math.random().toString(16).slice(2)}` }
await mkdir(output,{recursive:true})
const server = await createServer({root,appType:'custom',logLevel:'silent',server:{middlewareMode:true}})
const checks = [], check = /* 调用 checks.push({id,status:passed?'passed':'failed',detail}) 并返回调用结果。 */ (id,passed,detail) => checks.push({id,status:passed?'passed':'failed',detail})
try {
  const [workspace, shortcuts, lifecycle, templates, feedback, editor] = await Promise.all(['/src/editor/workspaces.ts','/src/editor/shortcuts.ts','/src/runtime/featureLifecycle.ts','/src/projects/templates.ts','/src/runtime/editorFeedback.ts','/src/store/editor.ts'].map(/* 调用 server.ssrLoadModule(path) 并返回调用结果。 */ path=>server.ssrLoadModule(path)))
  check('WSP-001', JSON.stringify(workspace.WORKSPACE_PRESETS.filter(/* 比较 item.id 与 'custom'，返回严格不等的判断结果。 */ item=>item.id!=='custom').map(/* 返回 item.id 的当前值。 */ item=>item.id)) === JSON.stringify(['design','script','animation','ui','debug','manage']), 'Six public workspace order is deterministic; custom layouts remain separately managed.')
  check('WSP-002', workspace.WORKSPACE_PROFILE_PRESETS.length === 6, 'Six role profiles are registered.')
  for (const profile of workspace.WORKSPACE_PROFILE_PRESETS) check(`WSP-PROFILE-${profile.id}`, workspace.applyWorkspaceProfile(profile.id) && editor.editorState.activeWorkspace===profile.workspace, `${profile.id} applies without orphaning the shell.`)
  workspace.applyEditorWorkspace('design'); workspace.dockEditorPanel('hierarchy','floating'); workspace.dockEditorPanel('inspector','left'); workspace.workspaceState.splitDocking=true; workspace.setPanelPinned('bottom',false)
  const captured = workspace.captureWorkspaceLayout()
  check('WSP-003', captured.floatingPanels.includes('hierarchy') && captured.inspectorDock==='left' && captured.splitDocking && !captured.bottomPanelPinned, 'Dock, float, split and pin state round-trip through capture.')
  workspace.reorderBottomTab('console','assets')
  check('WSP-004', workspace.workspaceState.bottomTabOrder.indexOf('console') < workspace.workspaceState.bottomTabOrder.indexOf('assets'), 'Bottom tabs can be rearranged deterministically.')
  const exported = workspace.exportWorkspaces(); check('WSP-005', JSON.parse(exported).format==='nova-workspaces', 'Named layouts export with a versioned format.')

  const bindings = Object.fromEntries(shortcuts.shortcutState.definitions.map(/* 返回按声明顺序构造的数组 [item.id,item.binding]。 */ item=>[item.id,item.binding]))
  check('NAV-001', bindings.commandPalette==='Ctrl+Shift+P' && bindings.quickOpen==='Ctrl+P' && bindings.globalSearch==='Ctrl+Shift+F' && bindings.contextSearch==='Ctrl+K', 'Discovery shortcuts match the v4.1 contract.')
  shortcuts.setShortcut('quickOpen','Ctrl+Shift+P'); check('NAV-002', shortcuts.shortcutConflicts('Ctrl+Shift+P','quickOpen').some(/* 比较 item.id 与 'commandPalette'，返回严格相等的判断结果。 */ item=>item.id==='commandPalette'), 'Shortcut conflicts are detected.')
  shortcuts.resetShortcuts(); const shortcutDocument=shortcuts.exportShortcuts(); check('NAV-003', shortcuts.importShortcuts(shortcutDocument)>=4, 'Shortcut bindings import and export safely.')

  check('FLG-001', lifecycle.FEATURE_DEFINITIONS.some(/* 比较 item.lifecycle 与 'stable'，返回严格相等的判断结果。 */ item=>item.lifecycle==='stable') && lifecycle.FEATURE_DEFINITIONS.some(/* 比较 item.lifecycle 与 'beta'，返回严格相等的判断结果。 */ item=>item.lifecycle==='beta') && lifecycle.FEATURE_DEFINITIONS.some(/* 比较 item.lifecycle 与 'experimental'，返回严格相等的判断结果。 */ item=>item.lifecycle==='experimental') && lifecycle.FEATURE_DEFINITIONS.some(/* 比较 item.lifecycle 与 'internal'，返回严格相等的判断结果。 */ item=>item.lifecycle==='internal'), 'All lifecycle states have registry entries.')
  check('FLG-002', !lifecycle.setFeatureEnabled('networking',true) || lifecycle.featureAvailable('networking'), 'Optional feature state changes remain explicit.')

  for (const descriptor of templates.PROJECT_TEMPLATES) {
    const project=templates.createTemplateProject(descriptor.id,`Audit ${descriptor.id}`), issues=templates.auditTemplateProject(project,descriptor.id)
    check(`LCH-${descriptor.id}`, issues.length===0 && project.engineVersion==='4.1.0' && project.assets.some(/* 比较 asset.path 与 'Assets/Tutorials/Getting Started.md'，返回严格相等的判断结果。 */ asset=>asset.path==='Assets/Tutorials/Getting Started.md'), issues.length ? issues.join('; ') : 'Project validates at 4.1.0 and contains dismissible tutorial content.')
  }

  const cancelled=[], retried=[]
  const task=feedback.startTask('Qualification',{detail:'resource audit',progress:.25,logs:['queued'],resources:[{label:'Scene',id:'scene:1'}],cancel:/* 调用 cancelled.push(true) 并返回调用结果。 */ ()=>cancelled.push(true),retry:/* 调用 retried.push(true) 并返回调用结果。 */ ()=>retried.push(true)})
  feedback.appendTaskLog(task,'running'); feedback.cancelTask(task); feedback.retryTask(task); feedback.completeTask(task,'done')
  const saved=feedback.feedbackState.tasks.find(/* 比较 item.id 与 task，返回严格相等的判断结果。 */ item=>item.id===task)
  check('TSK-001', cancelled.length===1 && retried.length===1 && saved?.status==='complete' && saved.logs.length===2 && saved.resources.length===1, 'Task progress/cancel/retry/details/log/resources are retained.')
} finally { await server.close() }
const failed=checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item=>item.status==='failed'), report={format:'nova-v4.1-integration-verification',version:1,engineVersion:'4.1.0',generatedAt,checks,severity0Open:0,severity1Open:failed.length,status:failed.length?'failed':'passed'}
await writeFile(join(output,'v4.1.0-integration-verification.json'),`${JSON.stringify(report,null,2)}\n`)
if(failed.length){console.error(failed);process.exit(1)}
console.log(`Nova_A v4.1 integration verification passed: ${checks.length} workspace, shortcut, lifecycle, template and Task Center checks.`)
