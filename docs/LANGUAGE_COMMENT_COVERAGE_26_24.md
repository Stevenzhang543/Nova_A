# 26.24 中文注释范围与验证边界

JS/TS/Vue 脚本由 audit-chinese-comments.mjs 逐函数检查紧邻注释，并检查文件中文索引。21,243 个函数已覆盖（新增说明工具自身可使最终计数略增）；说明存在不等于全部语义审核通过。部分说明标记为自动结构提取，其余为人工职责说明。

Vue 共84文件，3422个脚本函数及34处显式模板箭头行已说明。模板内运行数据、测试脚本文字和签名夹具不为了覆盖率而改写。

生成型 Rhai 提示文件已通过生成器添加中文说明，API元数据已经从实际原生/WASM编译结果刷新；原分工中待 root 集成项现已完成。正式26.24资格仍由最终冻结源码的构建和测试决定。

以下保留原生语言分工记录及其历史测试限制：

# 26.24 Rust / PowerShell / Rhai 中文注释分工交接

状态：本分工已完成可执行自有源文件的中文说明；生成型 docs/NOVA_RHAI_API_V2_STUBS.rhai 交由 root 在其 JS 生成器中完成。共 45 个最终修改/新增路径。未修改行为、删功能、构建原生发布或更新发布目录。

## 覆盖

- Rust：25 文件，712 个显式 AST 函数，1056 个普通闭包，54 个宏内闭包；均有紧邻的中文注释。无自有 macro_rules 定义。derive/wasm_bindgen 的编译生成函数不是自有源定义，未改生成依赖。Rust 测试内 Rhai 字符串是原始测试输入，未改其字节，外层测试函数已逐项说明。
- PowerShell：9 文件，40 函数，28 脚本块回调。两份窗口审计的内嵌 C# 另补29声明/方法与1匿名委托。
- Rhai：8 个实际修改文件，28 函数。另3个带内容哈希/签名测试条件的包脚本恢复为原始字节，每个 start() 用包外 PACKAGE_FIXTURE.zh.md 说明。
- 范围内无自有 Python/Shell 文件。依赖、Godot、target、旧 releases、缓存排除。

## 检查

- 每次 Rust 注释写入前后完整 proc_macro2 token 流一致；cargo fmt 后归一化 AST/token 比较25文件通过。只归一化格式器的标点间距、末尾逗号与单表达式闭包冗余块；所有标识、字面量与其他 token 保留。
- cargo fmt --all -- --check、cargo fmt --manifest-path src-tauri/Cargo.toml -- --check：通过。
- .cache/rust-comments-final24.json：中文紧邻注释覆盖与归一化等价 passed。
- .cache/verify-ps24.ps1：9份 PowerShell 全部解析成功，非注释 token 等价；内嵌 C# 注释单独归一化。
- .cache/verify-csharp24.ps1：两份 C# 代码成功编译；未调用原生窗口操作。
- Rhai 词法 token 与原始脚本相同；旧现存26.21测试exe冒烟5通过、1跳过、2预期失败退出码1（.cache/rhai-comments-pass24.json / negative24.json）。此项不是26.24源绑定资格证据，root须用26.24新构建执行最终测试。
- scoped git diff --check：通过，仅Git行尾提示。

## 联动与保留

1. Rust已完成，root可重跑 scripts/generate-rhai-api-signatures.mjs 以刷新源码哈希及来源行号；未更改任何 rustdoc 属性/现有英文API元数据。
2. docs/NOVA_RHAI_API_V2_STUBS.rhai 的生成器是 scripts/generate-script-api-docs.mjs；root负责中文生成输出，避免手改被覆盖。
3. 3个包脚本来自 generate-v6.9.0-reference-projects.mjs 的硬编码源码/hash；7.0副本由 generate-v7.0.0-reference-projects.mjs 复制。签名是 external-fixture-signature占位且publisherVerified=false，未伪造真实验证或重签。原始索引脚本最终未修改。
4. 完整原始分工备份在 .cache/rust-original24，工具及中间失败日志仅在 .cache，不进入发布源码。部分写入遇Windows暂时映射/ACL错误，均按当前注释状态恢复，最终检查通过。

## 每条最终编辑

- crates/nova_format/examples/migrate_fixture.rs：工程迁移命令行示例：读取文件并输出经过校验的当前工程格式。 新增中文文件头、1 个函数、0 个普通闭包、0 个宏内闭包说明；仅格式器重排。
- crates/nova_format/src/lib.rs：工程格式边界：定义版本、迁移历史、资源及组件校验，并保留兼容性回归测试。 新增中文文件头、77 个函数、368 个普通闭包、28 个宏内闭包说明；仅格式器重排。
- crates/nova_math/src/lib.rs：双精度数值与二维几何基础：向量、变换、边界盒、有限值保护和凸包。 新增中文文件头、45 个函数、3 个普通闭包、0 个宏内闭包说明；仅格式器重排。
- crates/nova_physics/examples/v3_4_evidence.rs：物理证据示例：测量基准、确定性回放、连续碰撞、堆叠和加速长期运行。 新增中文文件头、9 个函数、1 个普通闭包、0 个宏内闭包说明；仅格式器重排。
- crates/nova_physics/examples/v3_benchmark.rs：物理基准示例：重复运行刚体场景并输出耗时与状态校验信息。 新增中文文件头、1 个函数、1 个普通闭包、0 个宏内闭包说明；仅格式器重排。
- crates/nova_physics/src/body.rs：刚体内部表示：形状支撑点、惯性、复合碰撞体、积分、冲量与休眠。 新增中文文件头、20 个函数、10 个普通闭包、0 个宏内闭包说明；仅格式器重排。
- crates/nova_physics/src/collision/mod.rs：窄相碰撞：通过 GJK/EPA 和多边形裁剪产生接触流形。 新增中文文件头、12 个函数、6 个普通闭包、0 个宏内闭包说明；仅格式器重排。
- crates/nova_physics/src/lib.rs：物理模块公开入口：组合内部求解器并导出稳定句柄、材质、关节及查询类型。 新增中文文件头、2 个函数、0 个普通闭包、0 个宏内闭包说明；仅格式器重排。
- crates/nova_physics/src/query/filtered.rs：带身份与过滤条件的精确二维物理查询，以及去重、排序和边界测试。 新增中文文件头、11 个函数、8 个普通闭包、0 个宏内闭包说明；仅格式器重排。
- crates/nova_physics/src/query/mod.rs：射线、重叠、形状扫掠及角色移动查询；包含坡面、台阶与复合碰撞回归。 新增中文文件头、30 个函数、22 个普通闭包、1 个宏内闭包说明；仅格式器重排。
- crates/nova_physics/src/rope/mod.rs：连接约束求解：绳索节点、断裂、摩擦、锚点、刚性绑定及关节电机与限位。 新增中文文件头、45 个函数、8 个普通闭包、0 个宏内闭包说明；仅格式器重排。
- crates/nova_physics/src/solver/contact_solver.rs：接触求解器：有效质量、法向与摩擦冲量、位置修正和缓存热启动。 新增中文文件头、6 个函数、0 个普通闭包、0 个宏内闭包说明；仅格式器重排。
- crates/nova_physics/src/tests.rs：物理行为回归：检查单位、材料、刚体、复合碰撞、绳索及关节的数值约束。 新增中文文件头、72 个函数、7 个普通闭包、4 个宏内闭包说明；仅格式器重排。
- crates/nova_physics/src/world/legacy.rs：兼容扁平数据的物理世界：装载记录、构建碰撞对、分步求解并写回状态。 新增中文文件头、24 个函数、15 个普通闭包、0 个宏内闭包说明；仅格式器重排。
- crates/nova_physics/src/world/origin.rs：世界原点平移：同步当前与历史刚体、绳索及求解缓存，保持局部锚点和身份。 新增中文文件头、10 个函数、1 个普通闭包、2 个宏内闭包说明；仅格式器重排。
- crates/nova_physics/src/world/persistent.rs：持久物理世界：稳定句柄、按需重建、状态缓存及接触生命周期事件。 新增中文文件头、39 个函数、14 个普通闭包、2 个宏内闭包说明；仅格式器重排。
- crates/nova_runtime/src/lib.rs：平台无关运行时：场景与组件管理、固定时间推进、物理事件和诊断。 新增中文文件头、65 个函数、4 个普通闭包、4 个宏内闭包说明；仅格式器重排。
- crates/nova_script/examples/nova_script_test.rs：Rhai 测试命令行：发现测试、解析元数据、执行沙箱并生成 JSON/JUnit 结果。 新增中文文件头、14 个函数、43 个普通闭包、1 个宏内闭包说明；仅格式器重排。
- crates/nova_script/examples/runtime_bridge.rs：脚本桥接示例：从标准输入读取请求，在原生沙箱执行并输出结构化结果。 新增中文文件头、1 个函数、4 个普通闭包、0 个宏内闭包说明；仅格式器重排。
- crates/nova_script/src/lib.rs：Rhai 沙箱运行时：编译缓存、导出属性、生命周期和受限宿主命令桥接。 新增中文文件头、77 个函数、258 个普通闭包、8 个宏内闭包说明；仅格式器重排。
- crates/nova_wasm/src/lib.rs：WebAssembly 边界：将运行时、脚本和工程迁移转换为浏览器可用的数据接口。 新增中文文件头、53 个函数、25 个普通闭包、0 个宏内闭包说明；仅格式器重排。
- nova_core/src/lib.rs：旧核心兼容入口：重新导出拆分后的数学、物理、格式、脚本及运行时模块。 新增中文文件头、0 个函数、0 个普通闭包、0 个宏内闭包说明；仅格式器重排。
- src-tauri/build.rs：桌面构建入口：调用 Tauri 构建辅助逻辑生成平台所需资源。 新增中文文件头、1 个函数、0 个普通闭包、0 个宏内闭包说明；仅格式器重排。
- src-tauri/src/lib.rs：桌面宿主：导出与事务保存、运行包加载、受控网络、外部工具和诊断日志。 新增中文文件头、96 个函数、258 个普通闭包、4 个宏内闭包说明；仅格式器重排。
- src-tauri/src/main.rs：桌面程序入口：配置 Windows 子系统后进入 Nova_A Tauri 运行流程。 新增中文文件头、1 个函数、0 个普通闭包、0 个宏内闭包说明；仅格式器重排。
- scripts/package-release.ps1：新增中文文件头、15 个函数及 11 个 PowerShell 回调说明。
- scripts/prepare-calendar-release.ps1：新增中文文件头、1 个函数及 1 个 PowerShell 回调说明。
- scripts/qualify-native-window-v3.1.ps1：新增中文文件头、4 个函数及 1 个 PowerShell 回调说明。 同时补内嵌 C# 原生接口及方法说明。
- scripts/qualify-native-window-v3.2.ps1：新增中文文件头、5 个函数及 1 个 PowerShell 回调说明。 同时补内嵌 C# 原生接口及方法说明。
- scripts/release-policy.ps1：新增中文文件头、5 个函数及 0 个 PowerShell 回调说明。
- scripts/run-release-v4.9.ps1：新增中文文件头、1 个函数及 0 个 PowerShell 回调说明。
- scripts/run-release-v5.0.1.ps1：新增中文文件头、1 个函数及 0 个 PowerShell 回调说明。
- scripts/run-release-v5.0.ps1：新增中文文件头、1 个函数及 0 个 PowerShell 回调说明。
- scripts/verify-release-package.ps1：新增中文文件头、7 个函数及 14 个 PowerShell 回调说明。
- reference-projects/projects/animation-v56-interop-recording/generated.rhai：新增中文文件说明及 5 个 Rhai 函数体内说明；原图身份、测试元数据和可执行词法 token 保持不变。
- reference-projects/projects/creator-v2610-block-game/generated.rhai：新增中文文件说明及 5 个 Rhai 函数体内说明；原图身份、测试元数据和可执行词法 token 保持不变。
- reference-projects/projects/visual-scripting-v52-foundation/generated.rhai：新增中文文件说明及 1 个 Rhai 函数体内说明；原图身份、测试元数据和可执行词法 token 保持不变。
- reference-projects/projects/visual-scripting-v53-production/generated.rhai：新增中文文件说明及 5 个 Rhai 函数体内说明；原图身份、测试元数据和可执行词法 token 保持不变。
- tests/fixtures/scripting/headless-fail.rhai：新增中文文件说明及 1 个 Rhai 函数体内说明；原图身份、测试元数据和可执行词法 token 保持不变。
- tests/fixtures/scripting/headless-pass.rhai：新增中文文件说明及 4 个 Rhai 函数体内说明；原图身份、测试元数据和可执行词法 token 保持不变。
- tests/fixtures/scripting/v4.6-failure/deliberate-failure.rhai：新增中文文件说明及 1 个 Rhai 函数体内说明；原图身份、测试元数据和可执行词法 token 保持不变。
- tests/fixtures/scripting/v4.6/pass.rhai：新增中文文件说明及 6 个 Rhai 函数体内说明；原图身份、测试元数据和可执行词法 token 保持不变。
- reference-projects/projects/creator-v690-package-shipping/PACKAGE_FIXTURE.zh.md：新增历史包源码的中文文件职责与 start() 说明；放在包目录外，原始源码、内容哈希及签名占位状态均保持原样。
- reference-projects/projects/creator-v700-migration-recovery/PACKAGE_FIXTURE.zh.md：新增历史包源码的中文文件职责与 start() 说明；放在包目录外，原始源码、内容哈希及签名占位状态均保持原样。
- reference-projects/projects/creator-v700-stable-platform/PACKAGE_FIXTURE.zh.md：新增历史包源码的中文文件职责与 start() 说明；放在包目录外，原始源码、内容哈希及签名占位状态均保持原样。
