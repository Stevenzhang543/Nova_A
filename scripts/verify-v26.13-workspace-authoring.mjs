/** 验证脚本（v26.13-workspace-authoring）：组织对应功能与边界场景检查，断言行为并汇总验证结果。 */
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'

await withBrowserAudit({ release: '26.13', name: 'workspace-authoring' }, /** 通过真实控件验证工作区缩放、折叠、最大化、浮动及布局导出导入和项目重开持久化。 */ async audit => {
  const { click, clickText, fill, press, point, until, evaluate, client, check, viewport, capture, observations, select } = audit
  const selectors = { hierarchy: '.sidebar-container', inspector: '.config-wrapper', bottom: '.bottom-panel' }
  const value = /** 读取指定面板分隔条的当前无障碍尺寸值。 */ async panel => Number(await evaluate(`document.querySelector(${JSON.stringify(selectors[panel] + '>.panel-resize-handle')}).getAttribute('aria-valuenow')`))
  const resize = /** 使用真实指针分步拖动面板分隔条，支持Escape取消并记录命中信息。 */ async (panel, delta, cancel = false) => {
    const selector = selectors[panel] + '>.panel-resize-handle', start = await point(selector), end = { x: start.x + (panel === 'bottom' ? 0 : delta), y: start.y + (panel === 'bottom' ? delta : 0) }
    observations.push({ panel, start, delta, hit: await evaluate(`(()=>{const e=document.elementFromPoint(${start.x},${start.y});return{tag:e?.tagName,classes:e?.className,separator:!!e?.closest('.panel-resize-handle')}})()`) })
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...start, button: 'left', clickCount: 1 })
    for (let n = 1; n <= 4; n++) await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: start.x + (end.x - start.x) * n / 4, y: start.y + (end.y - start.y) * n / 4, button: 'left', buttons: 1 })
    await wait(80); if (cancel) await press('Escape')
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...end, button: 'left', clickCount: 1 }); await wait(140)
  }
  const geometry = /** 读取指定元素的可视矩形位置与尺寸。 */ async selector => evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}})()`)
  const manager = /** 通过布局菜单打开工作区管理器并等待显示。 */ async () => { if(!await evaluate("document.querySelector('.layout-menu').open")) await click('.layout-menu>summary'); await clickText('.layout-menu button', 'Manage workspaces'); await until("!!document.querySelector('.scrim .manager-grid')") }
  const closeManager = /** 关闭工作区管理器并等待遮罩消失。 */ async () => { await click('.scrim:has(.manager-grid)>article>header>button'); await until("!document.querySelector('.scrim .manager-grid')") }
  await check('Create a blank disposable workspace through the launcher', /** 创建空白工作区，验证引导焦点约束后进入设计并选中相机显示检查器。 */ async () => {
    assert.ok(await evaluate(`document.body.innerText.includes(${JSON.stringify(audit.expectedRelease)})`))
    await fill('.creation-card header input', '26.13 Workspace Audit'); await click('[data-template-id="empty"]'); await click('.create-button'); await until("!!document.querySelector('.editor-root')", 30000)
    if (await evaluate("[...document.querySelectorAll('button')].some(e=>e.textContent==='Skip for now')")) {
      for(let n=0;n<14;n++){await press('Tab',n<7?0:8);assert.equal(await evaluate("!!document.activeElement.closest('.onboarding-scrim')"),true)}
      await evaluate("[...document.querySelectorAll('.onboarding-scrim button')].find(e=>e.textContent.trim()==='Skip for now').focus()")
      await press('Enter')
    }
    await until("!document.querySelector('.onboarding-scrim')")
    await clickText('.workspace-list button', 'Design'); await clickText('.entity-item .name', 'Main Camera'); await until("!!document.querySelector('.config-wrapper>.panel-resize-handle')")
  })
  await check('Drag, cancel and keyboard-resize the hierarchy and Inspector using visible separators', /** 验证层级与检查器面板支持拖动提交、Escape回滚及键盘微调，并恢复光标。 */ async () => {
    for (const panel of ['hierarchy', 'inspector']) {
      const before = await value(panel), direction = panel === 'inspector' ? -1 : 1
      await resize(panel, direction * 40); assert.ok(Math.abs(await value(panel) - before - 40) <= 2, `${panel}: ${before} -> ${await value(panel)}`)
      const committed = await value(panel); await resize(panel, direction * 35, true); assert.equal(await value(panel), committed)
      await click(selectors[panel] + '>.panel-resize-handle'); await press(panel === 'inspector' ? 'ArrowLeft' : 'ArrowRight'); assert.equal(await value(panel), committed + 8)
      assert.equal(await evaluate("document.body.style.cursor"), '')
      observations.push({ panel, before, after: await value(panel), operation: 'pointer commit, Escape rollback and keyboard +8' })
    }
    await capture('resized')
  })
  await check('Workspace navigation restores the user dimensions rather than preset defaults', /** 验证工作区往返保留用户设置的层级与检查器宽度。 */ async () => {
    const before = { hierarchy: await value('hierarchy'), inspector: await value('inspector') }
    await clickText('.workspace-list button', 'Script'); await until("!!document.querySelector('.script-workspace')")
    await clickText('.workspace-list button', 'Design'); await until("!!document.querySelector('.sidebar-container>.panel-resize-handle')")
    assert.equal(await value('hierarchy'), before.hierarchy); assert.equal(await value('inspector'), before.inspector)
  })
  await check('Collapse the hierarchy and activate its visible expansion rail', /** 验证层级面板折叠后展开按钮仍可见可点，展开恢复可用宽度。 */ async () => {
    await click('.sidebar-container>.panel-resize-handle'); await press('Home'); await until("!!document.querySelector('.sidebar-container>.expand')")
    const rail = await geometry('.sidebar-container'), button = await geometry('.sidebar-container>.expand')
    assert.ok(rail.width >= 20 && button.width > 0 && button.x >= rail.x - 1 && button.x + button.width <= rail.x + rail.width + 1)
    await click('.sidebar-container>.expand'); await until("!document.querySelector('.sidebar-container>.expand')"); assert.ok(await value('hierarchy') >= 160)
  })
  await check('Maximize and restore each dock while retaining geometry and excluding covered controls from focus', /** 逐一最大化面板，验证占满编辑区域、遮挡控件不可聚焦且恢复原尺寸。 */ async () => {
    if (await evaluate("!!document.querySelector('.compact-tab-select')?.getBoundingClientRect().width")) await select('.compact-tab-select', 'assets')
    else await clickText('.panel-tabs .panel-tab', 'Assets')
    if (await evaluate("document.querySelector('.bottom-panel').classList.contains('collapsed')")) await click('.panel-tabs>button:last-child')
    await until("!!document.querySelector('.bottom-panel>.panel-resize-handle')")
    for (const panel of ['hierarchy', 'inspector', 'bottom']) {
      const before = await geometry(selectors[panel]), stored = await value(panel)
      await click(`[data-panel-maximize="${panel}"]`); await until(`document.querySelector('.editor-main').dataset.maximizedPanel===${JSON.stringify(panel)}`)
      const whole = await geometry('.editor-main'), focused = await geometry(selectors[panel])
      assert.ok(Math.abs(whole.width - focused.width) <= 2 && Math.abs(whole.height - focused.height) <= 2, `${panel} must occupy the full editor area`)
      for (let n = 0; n < 24; n++) { await press('Tab'); assert.equal(await evaluate("!!document.activeElement.closest('[inert]')"), false, 'Tab cannot enter an inert subtree') }
      await capture(`maximized-${panel}`); await click(`[data-panel-maximize="${panel}"]`)
      await until("document.querySelector('.editor-main').dataset.maximizedPanel===''")
      await wait(300)
      const restored = await geometry(selectors[panel]); assert.ok(Math.abs(restored.width - before.width) <= 2 && Math.abs(restored.height - before.height) <= 2)
      assert.equal(await value(panel), stored)
    }
  })
  await check('A short-window bottom resize moves immediately from its measured visible size', /** 验证短窗口中受限底部面板从实测高度立即响应缩放而无拖动死区。 */ async () => {
    await viewport(1024, 640); await click('.bottom-panel>.panel-resize-handle'); await press('End')
    assert.equal(await value('bottom'), 520)
    const before = await geometry('.bottom-panel'); await resize('bottom', 24); const after = await geometry('.bottom-panel')
    assert.ok(after.height < before.height - 15, 'Capped bottom panel must shrink immediately without a dead zone')
    await capture('bottom-capped-resize'); await viewport(1440, 900)
  })
  await check('Float, maximize and restore both side docks through the workspace manager', /** 通过管理器浮动两侧面板，验证最大化和恢复停靠后的几何。 */ async () => {
    for (const [index, panel] of ['hierarchy', 'inspector'].entries()) {
      await manager(); await click('.dock-grid fieldset:nth-of-type(' + (index + 1) + ')>button', 2); await closeManager()
      await until(`!!document.querySelector('.${panel === 'hierarchy' ? 'hierarchy' : 'inspector'}-float')`)
      await click(`[data-panel-maximize="${panel}"]`)
      const whole = await geometry('.editor-main'), focused = await geometry(selectors[panel]); assert.ok(Math.abs(whole.width - focused.width) <= 2 && Math.abs(whole.height - focused.height) <= 2)
      await capture(`floating-maximized-${panel}`); await click(`[data-panel-maximize="${panel}"]`)
      await manager(); await click('.dock-grid fieldset:nth-of-type(' + (index + 1) + ')>button', index); await closeManager()
      await until(`!document.querySelector('.${panel === 'hierarchy' ? 'hierarchy' : 'inspector'}-float')`)
    }
  })
  await check('Save custom workspace, change widths and restore its named layout through the manager', /** 保存命名工作区，验证管理器焦点约束并在修改宽度后准确恢复布局。 */ async () => {
    const before = await value('hierarchy'); await manager(); await fill('.manager-grid>main>label input', 'Readable workspace 中文')
    for(let n=0;n<48;n++){await press('Tab',n<24?0:8);assert.equal(await evaluate("!!document.activeElement.closest('.scrim:has(.manager-grid)')"),true)}
    await clickText('.manager-grid .actions button', 'Save current as new'); await until("document.querySelector('.manager-grid>nav').textContent.includes('Readable workspace 中文')"); await closeManager()
    await resize('hierarchy', 25); assert.notEqual(await value('hierarchy'), before)
    await manager(); await clickText('.manager-grid>nav button', 'Readable workspace 中文')
    // Choosing a row previews its identity; the footer action applies the layout.
    const apply = await evaluate("[...document.querySelectorAll('.scrim:has(.manager-grid) button')].findIndex(e=>e.textContent.trim()==='Apply workspace')")
    assert.ok(apply >= 0, 'The custom layout must expose its apply action'); await click('.scrim:has(.manager-grid) button', apply)
    if (await evaluate("!!document.querySelector('.scrim .manager-grid')")) await closeManager()
    assert.equal(await value('hierarchy'), before)
    await capture('custom-restored')
  })
  const downloaded = /** 触发真实下载并等待可解析JSON，将下载文件、大小和散列记录为证据。 */ async (name, action) => {
    const folder=join(audit.profile,'downloads');await mkdir(folder,{recursive:true})
    await client.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:folder,eventsEnabled:true});await action()
    let source;const deadline=Date.now()+20000
    while(!source&&Date.now()<deadline){try{source=await readFile(join(folder,name));JSON.parse(source.toString())}catch{source=null;await wait(80)}}
    assert.ok(source,`Actual download: ${name}`);const file=join(audit.evidence,'v26.13-workspace-'+name);await writeFile(file,source)
    observations.push({file,bytes:source.length,sha256:createHash('sha256').update(source).digest('hex')});return{file,document:JSON.parse(source.toString())}
  }
  const chooseFile = /** 拦截真实文件选择器并输入指定文件，完成后取消事件订阅。 */ async (file, action) => {
    let chooser;const off=client.on('Page.fileChooserOpened',/** 保存文件选择器打开事件。 */ event=>chooser=event);await client.send('Page.setInterceptFileChooserDialog',{enabled:true});await action()
    const deadline=Date.now()+10000;while(!chooser&&Date.now()<deadline)await wait(50)
    assert.ok(chooser,'Visible import action opens file picker');await client.send('DOM.setFileInputFiles',{files:[file],backendNodeId:chooser.backendNodeId});off()
  }
  await check('Export, delete and import the actual workspace document, retaining named geometry',/** 导出并删除自定义工作区，再导入实际文件，验证名称和几何完整恢复。 */ async()=>{
    const before=await value('hierarchy');await manager()
    const exported=await downloaded('Nova_A-workspaces.nova-workspaces',/* 调用 clickText('.manager-grid .io button','Export workspaces') 并返回调用结果。 */ ()=>clickText('.manager-grid .io button','Export workspaces'))
    assert.equal(exported.document.version,3);assert.ok(exported.document.workspaces.some(/* 先计算 item.name==='Readable workspace 中文'；仅当其为真值时求右侧 item.hierarchyWidth===before，返回短路求值结果。 */ item=>item.name==='Readable workspace 中文'&&item.hierarchyWidth===before))
    await clickText('.manager-grid>nav button','Readable workspace 中文');await clickText('.manager-grid .io button','Delete workspace')
    await until("!document.querySelector('.manager-grid>nav').textContent.includes('Readable workspace 中文')")
    await chooseFile(exported.file,/* 调用 clickText('.manager-grid .io button','Import workspaces') 并返回调用结果。 */ ()=>clickText('.manager-grid .io button','Import workspaces'))
    await until("document.querySelector('.manager-grid>nav').textContent.includes('Readable workspace 中文')")
    await clickText('.manager-grid>nav button','Readable workspace 中文');await clickText('.manager-grid .actions button','Apply workspace');await until("!document.querySelector('.scrim .manager-grid')")
    assert.equal(await value('hierarchy'),before);await capture('workspace-imported')
  })
  await check('Save and reopen the real project after a page reload with the custom layout retained',/** 保存并重新打开项目，验证用户布局宽度和命名工作区列表持久化。 */ async()=>{
    const before=await value('hierarchy')
    const saved=await downloaded('project.nova',/** 通过文件菜单触发项目保存。 */ async()=>{await click('.menu-item>button',0);await clickText('.menu-item .dropdown button','Save Project')})
    await client.send('Page.reload');await until("!!document.querySelector('.project-manager')",30000)
    await chooseFile(saved.file,/* 调用 clickText('.quick-actions button','Open Project') 并返回调用结果。 */ ()=>clickText('.quick-actions button','Open Project'));await until("!!document.querySelector('.upgrade-dialog')",30000)
    await click('.upgrade-dialog footer button.primary');await until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')",30000)
    await until("!!document.querySelector('.sidebar-container>.panel-resize-handle')");assert.equal(await value('hierarchy'),before)
    await manager();assert.ok((await evaluate("document.querySelector('.manager-grid>nav').textContent")).includes('Readable workspace 中文'));await closeManager();await capture('project-layout-reopened')
  })
})
