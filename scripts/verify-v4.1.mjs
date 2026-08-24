import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), output = join(root,'release-audits'), generatedAt = new Date().toISOString()
globalThis.localStorage ??= { values:new Map(), getItem(k){return this.values.get(k)??null}, setItem(k,v){this.values.set(k,String(v))}, removeItem(k){this.values.delete(k)}, clear(){this.values.clear()}, key(i){return [...this.values.keys()][i]??null}, get length(){return this.values.size} }
globalThis.crypto ??= { randomUUID: () => `test-${Math.random().toString(16).slice(2)}` }
await mkdir(output,{recursive:true})
const server = await createServer({root,appType:'custom',logLevel:'silent',server:{middlewareMode:true}})
const checks = [], check = (id,passed,detail) => checks.push({id,status:passed?'passed':'failed',detail})
try {
  const [workspace, shortcuts, lifecycle, templates, feedback, editor] = await Promise.all(['/src/editor/workspaces.ts','/src/editor/shortcuts.ts','/src/runtime/featureLifecycle.ts','/src/projects/templates.ts','/src/runtime/editorFeedback.ts','/src/store/editor.ts'].map(path=>server.ssrLoadModule(path)))
  check('WSP-001', JSON.stringify(workspace.WORKSPACE_PRESETS.filter(item=>item.id!=='custom').map(item=>item.id)) === JSON.stringify(['design','script','animation','ui','debug','manage']), 'Six public workspace order is deterministic; custom layouts remain separately managed.')
  check('WSP-002', workspace.WORKSPACE_PROFILE_PRESETS.length === 6, 'Six role profiles are registered.')
  for (const profile of workspace.WORKSPACE_PROFILE_PRESETS) check(`WSP-PROFILE-${profile.id}`, workspace.applyWorkspaceProfile(profile.id) && editor.editorState.activeWorkspace===profile.workspace, `${profile.id} applies without orphaning the shell.`)
  workspace.applyEditorWorkspace('design'); workspace.dockEditorPanel('hierarchy','floating'); workspace.dockEditorPanel('inspector','left'); workspace.workspaceState.splitDocking=true; workspace.setPanelPinned('bottom',false)
  const captured = workspace.captureWorkspaceLayout()
  check('WSP-003', captured.floatingPanels.includes('hierarchy') && captured.inspectorDock==='left' && captured.splitDocking && !captured.bottomPanelPinned, 'Dock, float, split and pin state round-trip through capture.')
  workspace.reorderBottomTab('console','assets')
  check('WSP-004', workspace.workspaceState.bottomTabOrder.indexOf('console') < workspace.workspaceState.bottomTabOrder.indexOf('assets'), 'Bottom tabs can be rearranged deterministically.')
  const exported = workspace.exportWorkspaces(); check('WSP-005', JSON.parse(exported).format==='nova-workspaces', 'Named layouts export with a versioned format.')

  const bindings = Object.fromEntries(shortcuts.shortcutState.definitions.map(item=>[item.id,item.binding]))
  check('NAV-001', bindings.commandPalette==='Ctrl+Shift+P' && bindings.quickOpen==='Ctrl+P' && bindings.globalSearch==='Ctrl+Shift+F' && bindings.contextSearch==='Ctrl+K', 'Discovery shortcuts match the v4.1 contract.')
  shortcuts.setShortcut('quickOpen','Ctrl+Shift+P'); check('NAV-002', shortcuts.shortcutConflicts('Ctrl+Shift+P','quickOpen').some(item=>item.id==='commandPalette'), 'Shortcut conflicts are detected.')
  shortcuts.resetShortcuts(); const shortcutDocument=shortcuts.exportShortcuts(); check('NAV-003', shortcuts.importShortcuts(shortcutDocument)>=4, 'Shortcut bindings import and export safely.')

  check('FLG-001', lifecycle.FEATURE_DEFINITIONS.some(item=>item.lifecycle==='stable') && lifecycle.FEATURE_DEFINITIONS.some(item=>item.lifecycle==='beta') && lifecycle.FEATURE_DEFINITIONS.some(item=>item.lifecycle==='experimental') && lifecycle.FEATURE_DEFINITIONS.some(item=>item.lifecycle==='internal'), 'All lifecycle states have registry entries.')
  check('FLG-002', !lifecycle.setFeatureEnabled('networking',true) || lifecycle.featureAvailable('networking'), 'Optional feature state changes remain explicit.')

  for (const descriptor of templates.PROJECT_TEMPLATES) {
    const project=templates.createTemplateProject(descriptor.id,`Audit ${descriptor.id}`), issues=templates.auditTemplateProject(project,descriptor.id)
    check(`LCH-${descriptor.id}`, issues.length===0 && project.engineVersion==='4.1.0' && project.assets.some(asset=>asset.path==='Assets/Tutorials/Getting Started.md'), issues.length ? issues.join('; ') : 'Project validates at 4.1.0 and contains dismissible tutorial content.')
  }

  const cancelled=[], retried=[]
  const task=feedback.startTask('Qualification',{detail:'resource audit',progress:.25,logs:['queued'],resources:[{label:'Scene',id:'scene:1'}],cancel:()=>cancelled.push(true),retry:()=>retried.push(true)})
  feedback.appendTaskLog(task,'running'); feedback.cancelTask(task); feedback.retryTask(task); feedback.completeTask(task,'done')
  const saved=feedback.feedbackState.tasks.find(item=>item.id===task)
  check('TSK-001', cancelled.length===1 && retried.length===1 && saved?.status==='complete' && saved.logs.length===2 && saved.resources.length===1, 'Task progress/cancel/retry/details/log/resources are retained.')
} finally { await server.close() }
const failed=checks.filter(item=>item.status==='failed'), report={format:'nova-v4.1-integration-verification',version:1,engineVersion:'4.1.0',generatedAt,checks,severity0Open:0,severity1Open:failed.length,status:failed.length?'failed':'passed'}
await writeFile(join(output,'v4.1.0-integration-verification.json'),`${JSON.stringify(report,null,2)}\n`)
if(failed.length){console.error(failed);process.exit(1)}
console.log(`Nova_A v4.1 integration verification passed: ${checks.length} workspace, shortcut, lifecycle, template and Task Center checks.`)
