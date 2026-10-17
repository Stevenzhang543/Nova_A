# Nova_A 26.30 / 26.30.0 — 逐路径修改清单

Files changed/added — deterministic path-level manifest.

比较基线为已发布26.29 candidate4源码快照 166f0458ed014f5aebad29d7d3f6c1f93da4852167bca496ec8cb8324afd9b57；保留此前未提交改动和既有发布文件。每项对应相对该快照的新增或修改，非相对旧Git提交的累计改动。此账本需在冻结前最后刷新。

- `Cargo.lock` — 同步机器/公开版本26.30.0/26.30；保留现有原生工具，项目格式及schema29保持。
- `Cargo.toml` — 同步机器/公开版本26.30.0/26.30；保留现有原生工具，项目格式及schema29保持。
- `README.md` — 本版关联修改；具体影响见实现跟踪及所属子系统说明。
- `README.zh-CN.md` — 本版关联修改；具体影响见实现跟踪及所属子系统说明。
- `crates/nova_format/src/lib.rs` — 同步机器/公开版本26.30.0/26.30；保留现有原生工具，项目格式及schema29保持。
- `docs/COMPETITIVE_REVIEW_26_30.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/EDIT_LEDGER_26_30.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/EDIT_ROUTE_INVENTORY_26_30.json` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/FEATURE_INVENTORY_26_30.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/FIELD_BINDING_INVENTORY_26_30.json` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/IMPLEMENTATION_TRACKER_26_30.md` — 记录最终19门禁、代表性实际操作与静态清单区别、成本限制和外部未验证边界。
- `docs/ISSUE_CLOSURE_26_30.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/NATIVE_HEADLESS_26_30.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/PANEL_INVENTORY_26_30.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/PERFORMANCE_26_30.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/QUALIFICATION_LESSON_26_30.de.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/QUALIFICATION_LESSON_26_30.en.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/QUALIFICATION_LESSON_26_30.zh.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/RELEASE_NOTES_26_30.md` — 说明最终收尾范围、保留功能/动画、部署限制与11项发布契约，不预先宣告测试通过。
- `docs/SOURCE_INVENTORY_26_30.json` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/SOURCE_MAP_26_30.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/UI_26_30.md` — 新增本版对应主题的实现、影响、逐文件账本、教学、部署或验证范围说明；最终资格取决冻结执行证据。
- `docs/WEB_HOSTING_26_30.md` — 提供根/子目录原子部署、在线PWA和可选后端说明，保留三语和设备验证边界。
- `manual/MANUAL.de.md` — 更新当前手册版本并新增对应语言26.30最终收尾教学章节，保留全部历史内容。
- `manual/MANUAL.en.md` — 更新当前手册版本并新增对应语言26.30最终收尾教学章节，保留全部历史内容。
- `manual/MANUAL.zh-CN.md` — 更新当前手册版本并新增对应语言26.30最终收尾教学章节，保留全部历史内容。
- `manual/index.html` — 更新当前手册版本并新增对应语言26.30最终收尾教学章节，保留全部历史内容。
- `package.json` — 同步机器/公开版本26.30.0/26.30；保留现有原生工具，项目格式及schema29保持。
- `reference-projects/projects/creator-v2630-mixed-game/README.md` — 说明本版参考项目操作、期望结果与实际支持边界。
- `reference-projects/projects/creator-v2630-mixed-game/expected-output.json` — 记录本版参考项目可验证输出与边界。
- `reference-projects/projects/creator-v2630-mixed-game/project.nova` — 新增本版独立参考项目，保留继承玩法并同步版本与世界/联网运行场景。
- `reference-projects/projects/creator-v2630-mixed-game/test-controls.json` — 记录本版参考项目可复现输入动作和检查路径。
- `reference-projects/projects/server-v2630-headless-authority/README.md` — 说明本版参考项目操作、期望结果与实际支持边界。
- `reference-projects/projects/server-v2630-headless-authority/expected-output.json` — 记录本版参考项目可验证输出与边界。
- `reference-projects/projects/server-v2630-headless-authority/project.nova` — 新增本版独立参考项目，保留继承玩法并同步版本与世界/联网运行场景。
- `reference-projects/projects/server-v2630-headless-authority/test-controls.json` — 记录本版参考项目可复现输入动作和检查路径。
- `reference-projects/projects/world-v2630-stream-client/README.md` — 说明本版参考项目操作、期望结果与实际支持边界。
- `reference-projects/projects/world-v2630-stream-client/expected-output.json` — 记录本版参考项目可验证输出与边界。
- `reference-projects/projects/world-v2630-stream-client/project.nova` — 新增本版独立参考项目，保留继承玩法并同步版本与世界/联网运行场景。
- `reference-projects/projects/world-v2630-stream-client/test-controls.json` — 记录本版参考项目可复现输入动作和检查路径。
- `reference-projects/projects/world-v2630-stream-host/README.md` — 说明本版参考项目操作、期望结果与实际支持边界。
- `reference-projects/projects/world-v2630-stream-host/expected-output.json` — 记录本版参考项目可验证输出与边界。
- `reference-projects/projects/world-v2630-stream-host/project.nova` — 新增本版独立参考项目，保留继承玩法并同步版本与世界/联网运行场景。
- `reference-projects/projects/world-v2630-stream-host/test-controls.json` — 记录本版参考项目可复现输入动作和检查路径。
- `scripts/audit-dependencies-v26.30.mjs` — 新增或调整本版执行门禁/审计/发布工具，记录真实结果与范围，不重复无关矩阵。
- `scripts/generate-panel-inventory-26.30.mjs` — 新增或调整本版执行门禁/审计/发布工具，记录真实结果与范围，不重复无关矩阵。
- `scripts/inventory-v26.30.mjs` — 新增或调整本版执行门禁/审计/发布工具，记录真实结果与范围，不重复无关矩阵。
- `scripts/prepare-release-26.30.mjs` — 新增19项本版门禁及3项明确省略类别，保留独立参考/版本/证据目标和固定工具链参数。
- `scripts/qualify-v26.30-scoped.mjs` — 顺序执行本版真实定向检查，按开始时间和当前版本聚合报告；增加迁移、模板、性能、依赖门禁。
- `scripts/verify-v26.30-layout-user.mjs` — 新增或调整本版执行门禁/审计/发布工具，记录真实结果与范围，不重复无关矩阵。
- `scripts/verify-v26.30-native-headless.mjs` — 新增或调整本版执行门禁/审计/发布工具，记录真实结果与范围，不重复无关矩阵。
- `scripts/verify-v26.30-network.mjs` — 保留五项实际联网模块生命周期/权威快照/有限变换回放检查，输出独立本版报告。
- `scripts/verify-v26.30-performance-user.mjs` — 新增或调整本版执行门禁/审计/发布工具，记录真实结果与范围，不重复无关矩阵。
- `scripts/verify-v26.30-release-inputs.mjs` — 在长构建前核验所有参考README与项目身份、当前动作/输出元数据、手册版本及必要门禁。
- `scripts/verify-v26.30-static-host-user.mjs` — 本版重新执行根/子路径在线PWA、移动工程和实际下载游戏与脚本原生/WASM对应检查。
- `scripts/verify-v26.30-stream-build.mjs` — 保留七项实际生产验证入口的流送复制身份和构建包含检查，改用本版独立参考。
- `scripts/verify-v26.30-template-output.mjs` — 新增或调整本版执行门禁/审计/发布工具，记录真实结果与范围，不重复无关矩阵。
- `src-tauri/Cargo.lock` — 同步机器/公开版本26.30.0/26.30；保留现有原生工具，项目格式及schema29保持。
- `src-tauri/Cargo.toml` — 同步机器/公开版本26.30.0/26.30；保留现有原生工具，项目格式及schema29保持。
- `src-tauri/tauri.conf.json` — 同步机器/公开版本26.30.0/26.30；保留现有原生工具，项目格式及schema29保持。
- `src/assets/editorReadability.css` — 本版关联修改；具体影响见实现跟踪及所属子系统说明。
- `src/components/ConfigPanel.vue` — 本版关联修改；具体影响见实现跟踪及所属子系统说明。
- `src/editor/workspaces.ts` — 本版关联修改；具体影响见实现跟踪及所属子系统说明。
- `src/projects/projectFormat.ts` — 同步机器/公开版本26.30.0/26.30；保留现有原生工具，项目格式及schema29保持。
- `src/store/editor.ts` — 本版关联修改；具体影响见实现跟踪及所属子系统说明。
- `tests/fixtures/migrations/public-schema-expected.json` — 同步机器/公开版本26.30.0/26.30；保留现有原生工具，项目格式及schema29保持。

删除文件：无。
