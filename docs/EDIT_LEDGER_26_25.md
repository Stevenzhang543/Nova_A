# Nova_A 26.25 / 26.25.0 edit ledger

Base: ccb660b (26.24). No earlier release artifacts were changed. Project Format 2/schema29 and default animation remain.

## Consequences and checks

Debug protocol v4 requires session/pause identity; host callback stepping remains available, genuine suspended VM stacks are not claimed. Invalid event/blueprint saves fail before mutation. Rotation retains mounted author state; menus dismiss on resize. PWA is online-only. Actual related module/WASM/browser/save/export/build checks and immutable artifact validation are required; unrelated checks explicitly remain not-run. New/changed JS/TS/Vue Chinese comment coverage was checked (30files/957functions); this is presence coverage, not a whole-repository semantic certification.

## Files changed/added

This deterministic path-level manifest lists every current changed/added source path. Strict JSON, reference data and binary icons receive Chinese companion descriptions here.

| Path | 每项修改说明 |
| --- | --- |
| `Cargo.lock` | 统一当前引擎版本为26.25.0（公开26.25），不修改项目格式或历史发布。 |
| `Cargo.toml` | 统一当前引擎版本为26.25.0（公开26.25），不修改项目格式或历史发布。 |
| `README.md` | 更新开发版本入口，标明26.24已经发布，并链接本版范围/文档。 |
| `crates/nova_format/src/lib.rs` | 统一当前引擎版本为26.25.0（公开26.25），不修改项目格式或历史发布。 |
| `docs/BROWSER_MOBILE_26_25.md` | 新增26.25实施、发布、三语操作或网页部署说明；外部未测环境不标为通过。 |
| `docs/EDIT_LEDGER_26_25.md` | 逐文件变更清单与后果、验证范围。 |
| `docs/IMPLEMENTATION_TRACKER_26_25.md` | 本版需求、执行状态、风险审计范围与外部限制。 |
| `docs/QUALIFICATION_LESSON_26_25.de.md` | 新增26.25实施、发布、三语操作或网页部署说明；外部未测环境不标为通过。 |
| `docs/QUALIFICATION_LESSON_26_25.en.md` | 新增26.25实施、发布、三语操作或网页部署说明；外部未测环境不标为通过。 |
| `docs/QUALIFICATION_LESSON_26_25.zh.md` | 新增26.25实施、发布、三语操作或网页部署说明；外部未测环境不标为通过。 |
| `docs/RELEASE_NOTES_26_25.md` | 新增26.25实施、发布、三语操作或网页部署说明；外部未测环境不标为通过。 |
| `docs/WEB_HOSTING_26_25.md` | 新增26.25实施、发布、三语操作或网页部署说明；外部未测环境不标为通过。 |
| `index.html` | 相对清单/图标、安全区视口，以及应用模块执行前的浏览器能力提示。 |
| `manual/MANUAL.de.md` | 更新当前手册身份并加入调试/继承/移动/PWA操作及能力边界，历史章节保留。 |
| `manual/MANUAL.en.md` | 更新当前手册身份并加入调试/继承/移动/PWA操作及能力边界，历史章节保留。 |
| `manual/MANUAL.zh-CN.md` | 更新当前手册身份并加入调试/继承/移动/PWA操作及能力边界，历史章节保留。 |
| `manual/index.html` | 更新当前身份并加入三语26.25课程，保留历史课程身份。 |
| `package.json` | 统一当前引擎版本为26.25.0（公开26.25），不修改项目格式或历史发布。 |
| `public/browser-capabilities.js` | ES5能力检查及三语不支持提示，先于应用模块。 |
| `public/manifest.webmanifest` | 严格JSON安装清单，子目录相对路径、横屏偏好、独立图标；无离线缓存。 |
| `public/nova-icon-192.png` | 新增原创字母图标位图，供主屏幕安装使用；二进制说明在本账本。 |
| `public/nova-icon-512.png` | 新增原创字母图标位图，供主屏幕安装使用；二进制说明在本账本。 |
| `reference-projects/projects/creator-v2625-mixed-game/README.md` | 新增独立26.25混合游戏/无窗口参考文件，保留26.24原件；更新本版身份及控制/期望说明。 |
| `reference-projects/projects/creator-v2625-mixed-game/expected-output.json` | 新增独立26.25混合游戏/无窗口参考文件，保留26.24原件；更新本版身份及控制/期望说明。 |
| `reference-projects/projects/creator-v2625-mixed-game/project.nova` | 新增独立26.25混合游戏/无窗口参考文件，保留26.24原件；更新本版身份及控制/期望说明。 |
| `reference-projects/projects/creator-v2625-mixed-game/test-controls.json` | 新增独立26.25混合游戏/无窗口参考文件，保留26.24原件；更新本版身份及控制/期望说明。 |
| `reference-projects/projects/server-v2625-headless-authority/README.md` | 新增独立26.25混合游戏/无窗口参考文件，保留26.24原件；更新本版身份及控制/期望说明。 |
| `reference-projects/projects/server-v2625-headless-authority/expected-output.json` | 新增独立26.25混合游戏/无窗口参考文件，保留26.24原件；更新本版身份及控制/期望说明。 |
| `reference-projects/projects/server-v2625-headless-authority/project.nova` | 新增独立26.25混合游戏/无窗口参考文件，保留26.24原件；更新本版身份及控制/期望说明。 |
| `reference-projects/projects/server-v2625-headless-authority/test-controls.json` | 新增独立26.25混合游戏/无窗口参考文件，保留26.24原件；更新本版身份及控制/期望说明。 |
| `scripts/generate-sequential-release-evidence.mjs` | 证据记录审计范围；仅复制实际生成的可选性能报告。 |
| `scripts/package-release.ps1` | 风险计划要求实际声明报告，旧版完整门禁不变；保留必需产物与散列核验。 |
| `scripts/prepare-release-26.25.mjs` | 生成13类真实执行门禁与8类明确未运行理由，工具链由参数指定。 |
| `scripts/qualify-v26.25-scoped.mjs` | 运行相关调试/事件/移动及下载游戏测试，保留原始报告并汇总当前资格。 |
| `scripts/release-qualification.mjs` | 增加显式风险策略与未运行理由校验，保留必需门禁及源码/日志/产物验证。 |
| `scripts/verify-v26.25-debugger-user.mjs` | 新增本版定向回归：debugger-user；检查实际行为或明确程序员边界，保留失败及原始证据。 |
| `scripts/verify-v26.25-debugger.mjs` | 新增本版定向回归：debugger；检查实际行为或明确程序员边界，保留失败及原始证据。 |
| `scripts/verify-v26.25-event-user.mjs` | 新增本版定向回归：event-user；检查实际行为或明确程序员边界，保留失败及原始证据。 |
| `scripts/verify-v26.25-events.mjs` | 新增本版定向回归：events；检查实际行为或明确程序员边界，保留失败及原始证据。 |
| `scripts/verify-v26.25-language-replies.mjs` | 新增本版定向回归：language-replies；检查实际行为或明确程序员边界，保留失败及原始证据。 |
| `scripts/verify-v26.25-mobile-contract.mjs` | 新增本版定向回归：mobile-contract；检查实际行为或明确程序员边界，保留失败及原始证据。 |
| `scripts/verify-v26.25-mobile-user.mjs` | 新增本版定向回归：mobile-user；检查实际行为或明确程序员边界，保留失败及原始证据。 |
| `scripts/verify-v26.25-release-policy.mjs` | 新增本版定向回归：release-policy；检查实际行为或明确程序员边界，保留失败及原始证据。 |
| `scripts/verify-v26.25-static-host-user.mjs` | 新增本版定向回归：static-host-user；检查实际行为或明确程序员边界，保留失败及原始证据。 |
| `src-tauri/Cargo.lock` | 统一当前引擎版本为26.25.0（公开26.25），不修改项目格式或历史发布。 |
| `src-tauri/Cargo.toml` | 统一当前引擎版本为26.25.0（公开26.25），不修改项目格式或历史发布。 |
| `src-tauri/tauri.conf.json` | 统一当前引擎版本为26.25.0（公开26.25），不修改项目格式或历史发布。 |
| `src/App.vue` | 编辑器模式安装横屏保护层，不限制导出播放器方向。 |
| `src/components/EventSheetEditor.vue` | 条件/动作/来源卡片、规范资源URI草稿预览、诊断定位和去重规则提示。 |
| `src/components/MobileShell.vue` | 旋转保留挂载和草稿，可视视口、安全区、触摸尺寸和可访问方向提示/监听清理。 |
| `src/components/ObjectBlueprintEditor.vue` | 继承声明来源与诊断定位。 |
| `src/components/ScriptStudio.vue` | 三语调试能力/边界标签、不可用操作说明及可见的过期源码提示，保留草稿。 |
| `src/components/WorldCanvas.vue` | 安装和释放编辑器触摸桥，复用已有编辑事务。 |
| `src/editor/eventProvenanceCopy.ts` | 事件和蓝图新界面三语文案。 |
| `src/editor/scriptLanguage.ts` | 拒绝修订、API版本或外部函数集合不匹配的线程回复。 |
| `src/projects/projectFormat.ts` | 统一当前引擎版本为26.25.0（公开26.25），不修改项目格式或历史发布。 |
| `src/runtime/GameplayRuntime.ts` | 调试宿主生命周期接线；用执行会话的作者源码定位断点/异常，修正合并代码行号误差。 |
| `src/runtime/editorTouch.ts` | 单指工具、双指平移/缩放、取消/捕获丢失/卸载清理。 |
| `src/runtime/eventSheets.ts` | 保存身份/循环/重复校验，草稿继承预览，保持同优先级实际声明顺序。 |
| `src/runtime/mobileViewport.ts` | 区分屏幕旋转与键盘改变的可视区域。 |
| `src/runtime/objectBlueprints.ts` | 所有保存调用共用身份、继承与组件冲突安全边界。 |
| `src/runtime/scriptDebug.ts` | 真实能力边界、协议v4会话/暂停/权限绑定、宿主继续/取消、单位置快照。 |
| `src/visual/graphDebugger.ts` | 清理旧会话文档，观察值使用无副作用有界预览，明确命令重放。 |
| `tests/fixtures/migrations/public-schema-expected.json` | 仅更新当前迁移期望的引擎版本，旧版样本与schema29不变。 |

| `scripts/verify-release-package.ps1` | 独立解包器支持显式风险计划；仍检查必需门禁、原始日志、源码与Web/原生产物散列。 |

发布预检补充：package-release.ps1 的旧平面性能副本要求也改为风险范围下可省略；正式证据只包含实际执行报告，不生成占位通过报告。候选1保留，使用候选2重新冻结构建验证。
