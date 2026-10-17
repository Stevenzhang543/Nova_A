# Nova_A 26.29 / 26.29.0 — 逐路径修改清单

Files changed/added — deterministic path-level manifest.

比较基线为已发布26.28 candidate2源码快照 4542bf06db50f3d9e77513be205fe0fbc91ebf3d3c9f71dbcc6b3bb2378f9e60；保留此前未提交改动和既有发布文件。每项对应相对该快照的新增或修改，非相对旧Git提交的累计改动。此账本需在冻结前最后刷新。

- `.github/workflows/platform-recipes.yml` — 新增手动触发的 Linux/macOS 匹配宿主候选构建；明确未认证，不冒充本机已测试发布。
- `Cargo.lock` — 同步机器/公开版本26.29.0/26.29；工作区接入原生工具，项目格式及schema29保持。
- `Cargo.toml` — 同步机器/公开版本26.29.0/26.29；工作区接入原生工具，项目格式及schema29保持。
- `README.md` — 更新26.29当前源码入口、前提和有限原生工具范围，保留历史章节。
- `crates/nova_format/src/lib.rs` — 同步机器/公开版本26.29.0/26.29；工作区接入原生工具，项目格式及schema29保持。
- `crates/nova_headless/Cargo.toml` — 声明独立原生物理 JSONL crate、版本及工作区依赖，不引入 WebView。
- `crates/nova_headless/src/main.rs` — 实现有界 JSONL 物理命令、严格请求校验和无窗口入口；不提供完整项目、脚本或网络服务器。
- `docs/EDIT_LEDGER_26_29.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/IMPLEMENTATION_TRACKER_26_29.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/NATIVE_HEADLESS_26_29.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/NETWORK_26_29.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/PLATFORM_26_29.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/QUALIFICATION_LESSON_26_29.de.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/QUALIFICATION_LESSON_26_29.en.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/QUALIFICATION_LESSON_26_29.zh.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/RELEASE_NOTES_26_29.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/WEB_HOSTING_26_29.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/WORLD_26_29.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `manual/MANUAL.de.md` — 更新当前手册版本并新增对应语言26.29世界/联网/平台教学章节，保留全部历史内容。
- `manual/MANUAL.en.md` — 更新当前手册版本并新增对应语言26.29世界/联网/平台教学章节，保留全部历史内容。
- `manual/MANUAL.zh-CN.md` — 更新当前手册版本并新增对应语言26.29世界/联网/平台教学章节，保留全部历史内容。
- `manual/index.html` — 更新当前手册版本并新增对应语言26.29世界/联网/平台教学章节，保留全部历史内容。
- `package.json` — 同步机器/公开版本26.29.0/26.29；工作区接入原生工具，项目格式及schema29保持。
- `reference-projects/projects/creator-v2629-mixed-game/README.md` — 说明本版参考项目操作、期望结果与实际支持边界。
- `reference-projects/projects/creator-v2629-mixed-game/expected-output.json` — 记录本版参考项目可验证输出与边界。
- `reference-projects/projects/creator-v2629-mixed-game/project.nova` — 新增本版独立参考项目，保留继承玩法并同步版本与世界/联网运行场景。
- `reference-projects/projects/creator-v2629-mixed-game/test-controls.json` — 记录本版参考项目可复现输入动作和检查路径。
- `reference-projects/projects/server-v2629-headless-authority/README.md` — 说明本版参考项目操作、期望结果与实际支持边界。
- `reference-projects/projects/server-v2629-headless-authority/expected-output.json` — 记录本版参考项目可验证输出与边界。
- `reference-projects/projects/server-v2629-headless-authority/project.nova` — 新增本版独立参考项目，保留继承玩法并同步版本与世界/联网运行场景。
- `reference-projects/projects/server-v2629-headless-authority/test-controls.json` — 记录本版参考项目可复现输入动作和检查路径。
- `reference-projects/projects/world-v2629-stream-client/README.md` — 说明本版参考项目操作、期望结果与实际支持边界。
- `reference-projects/projects/world-v2629-stream-client/expected-output.json` — 记录本版参考项目可验证输出与边界。
- `reference-projects/projects/world-v2629-stream-client/project.nova` — 新增本版独立参考项目，保留继承玩法并同步版本与世界/联网运行场景。
- `reference-projects/projects/world-v2629-stream-client/test-controls.json` — 记录本版参考项目可复现输入动作和检查路径。
- `reference-projects/projects/world-v2629-stream-host/README.md` — 说明本版参考项目操作、期望结果与实际支持边界。
- `reference-projects/projects/world-v2629-stream-host/expected-output.json` — 记录本版参考项目可验证输出与边界。
- `reference-projects/projects/world-v2629-stream-host/project.nova` — 新增本版独立参考项目，保留继承玩法并同步版本与世界/联网运行场景。
- `reference-projects/projects/world-v2629-stream-host/test-controls.json` — 记录本版参考项目可复现输入动作和检查路径。
- `scripts/check-windows-prerequisites.ps1` — 新增只读 OS/架构/WebView2 启动前检查和可操作失败说明，不自动安装。
- `scripts/lib/streamNetworkExportAudit29.mjs` — 新增本版流送联网真实浏览器/导出审计辅助，保留实际行为和失败证据。
- `scripts/package-release.ps1` — 26.29起把原生工具、说明与前提脚本放入现有参考ZIP；根目录仍严格11项。
- `scripts/prepare-release-26.29.mjs` — 定义本版独立参考工程、聚焦门禁与证据输入，保留此前发布。
- `scripts/qualify-v26.29-scoped.mjs` — 新增或调整本版执行门禁/审计/发布工具，记录真实结果与范围，不重复无关矩阵。
- `scripts/verify-release-package.ps1` — 独立检查参考ZIP内原生工具身份、内容与摘要，保留已有归档断言。
- `scripts/verify-v26.29-native-headless.mjs` — 执行真实原生进程的协议、严格无效请求、物理和清理检查，区分实际支持范围。
- `scripts/verify-v26.29-network.mjs` — 五项真实模块生命周期、授权快照、重放边界及本地化回归；明确宿主事件桩。
- `scripts/verify-v26.29-platform-layout.mjs` — 新增或调整本版执行门禁/审计/发布工具，记录真实结果与范围，不重复无关矩阵。
- `scripts/verify-v26.29-platform.mjs` — 检查实际平台模块、当前Windows前提和模拟缺运行时/旧OS失败分支。
- `scripts/verify-v26.29-release-inputs.mjs` — 核验本版版本、账本、手册、参考工程和交付输入完整性。
- `scripts/verify-v26.29-static-host-user.mjs` — 执行静态Web根/子路径、离线本地使用与服务边界相关实际浏览器检查。
- `scripts/verify-v26.29-stream-build.mjs` — 通过实际生产验证入口覆盖流送、场景包含、错误绑定、重复身份及活动编辑七项定向回归。
- `scripts/verify-v26.29-stream-network-user.mjs` — 新增或调整本版执行门禁/审计/发布工具，记录真实结果与范围，不重复无关矩阵。
- `scripts/verify-v26.29-world.mjs` — 执行成员替换缓存、失效目标、跨分块隔离和交接恢复五项实际世界模块检查。
- `src-tauri/Cargo.lock` — 同步机器/公开版本26.29.0/26.29；工作区接入原生工具，项目格式及schema29保持。
- `src-tauri/Cargo.toml` — 同步机器/公开版本26.29.0/26.29；工作区接入原生工具，项目格式及schema29保持。
- `src-tauri/tauri.conf.json` — 同步机器/公开版本26.29.0/26.29；工作区接入原生工具，项目格式及schema29保持。
- `src/components/BuildSettingsPanel.vue` — 新增当前目标/架构前提卡片、原始检测详情及刷新；目标选择随匹配宿主检测更新。
- `src/components/NetworkStudioPanel.vue` — 新增恢复范围和快照年龄/刻/权威端三语诊断卡，按可见页管理唯一计时器。
- `src/editor/networkCopy29.ts` — 新增EN/DE/ZH联网恢复与快照新鲜度文案，随当前编辑器语言变化。
- `src/projects/projectFormat.ts` — 同步机器/公开版本26.29.0/26.29；工作区接入原生工具，项目格式及schema29保持。
- `src/runtime/navigation2d.ts` — 清理离场/禁用区域与代理缓存；导航目标失效即时停速清路径，恢复后重新寻路。
- `src/runtime/networking.ts` — WebSocket握手所有终止路径及时结算并释放计时器/回调；记录实际授权快照诊断并在会话结束清除。
- `src/runtime/platformGapRegister.ts` — 区分原生无窗口物理工具与仍依赖WebView的游戏服务器导出，保留未实现完整服务器边界。
- `src/runtime/platformPrerequisites29.ts` — 新增按平台/架构/运行模式选择的三语前提说明，不执行安装或网络操作。
- `src/runtime/platformSupport.ts` — 修正Web/ARM浏览器前提和未知目标兜底；匹配宿主候选不提升为已认证平台。
- `src/runtime/productionValidation.ts` — 按构建所包含场景验证复制实体；接受未加载流送场景，拒绝错误场景、重复身份及活动场景已删除实体，保留未保存编辑。
- `src/runtime/worldStreaming.ts` — 交接恢复仅限当前分块后代，排除父链回路根，缺省enabled保持原状态。
- `tests/fixtures/migrations/public-schema-expected.json` — 同步机器/公开版本26.29.0/26.29；工作区接入原生工具，项目格式及schema29保持。

删除文件：无。
