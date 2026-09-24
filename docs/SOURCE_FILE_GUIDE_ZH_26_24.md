# Nova_A 26.24 自有文件中文索引

本表覆盖发布源码清单中的每一个文件。可执行源码的函数说明在代码旁；JSON、锁文件、项目数据、二进制资产和历史资料使用本表作为文件级伴随说明，避免插入注释破坏解析、签名或原始证据。

依赖、构建输出、缓存、既有 releases 和只读 Godot 参考树不属于此自有源码清单。中文说明的存在不代表全平台资格或无缺陷证明。

部分短回调与剩余函数使用明确标记的自动结构说明，只陈述语法树中的输入、直接调用、状态写入和控制流；另有人工按实际职责撰写的说明。两者均保持代码行为。

| 文件 | 中文用途说明 |
| --- | --- |
| `.githooks/pre-commit` | 自有配套资源或配置：由仓库构建和运行流程引用，使用本索引保存中文文件级说明。 |
| `.github/workflows/ci.yml` | 持续集成流程配置：定义自动化构建或验证的触发条件及任务。 |
| `.github/workflows/nova-validation.yml` | 持续集成流程配置：定义自动化构建或验证的触发条件及任务。 |
| `.github/workflows/release-matrix.yml` | 持续集成流程配置：定义自动化构建或验证的触发条件及任务。 |
| `.github/workflows/stability-24h.yml` | 持续集成流程配置：定义自动化构建或验证的触发条件及任务。 |
| `.gitignore` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `.node-version` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `app_color_palette_system.md` | 项目介绍、许可或设计资料；保留原文，本索引提供其文件级中文用途说明。 |
| `Cargo.lock` | 依赖锁文件：固定可复现的包版本和完整性信息，由对应包管理器维护。 |
| `Cargo.toml` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `crates/nova_format/Cargo.toml` | Rust 包依赖或构建配置，约束对应引擎模块的编译。 |
| `crates/nova_format/examples/migrate_fixture.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_format/src/lib.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_math/Cargo.toml` | Rust 包依赖或构建配置，约束对应引擎模块的编译。 |
| `crates/nova_math/src/lib.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_physics/Cargo.toml` | Rust 包依赖或构建配置，约束对应引擎模块的编译。 |
| `crates/nova_physics/examples/v3_4_evidence.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_physics/examples/v3_benchmark.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_physics/src/body.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_physics/src/collision/mod.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_physics/src/lib.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_physics/src/query/filtered.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_physics/src/query/mod.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_physics/src/rope/mod.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_physics/src/solver/contact_solver.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_physics/src/tests.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_physics/src/world/legacy.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_physics/src/world/origin.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_physics/src/world/persistent.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_runtime/Cargo.toml` | Rust 包依赖或构建配置，约束对应引擎模块的编译。 |
| `crates/nova_runtime/src/lib.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_script/Cargo.toml` | Rust 包依赖或构建配置，约束对应引擎模块的编译。 |
| `crates/nova_script/examples/nova_script_test.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_script/examples/runtime_bridge.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_script/src/lib.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `crates/nova_wasm/Cargo.toml` | Rust 包依赖或构建配置，约束对应引擎模块的编译。 |
| `crates/nova_wasm/LICENSE.md` | Rust 包依赖或构建配置，约束对应引擎模块的编译。 |
| `crates/nova_wasm/src/lib.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `docs/ACCESSIBILITY_GUIDE_4_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/ACCESSIBILITY_GUIDE_5_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/ANIMATION_AUDIO_CINEMATICS_5_6.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/ANIMATION_AUDIO_INTERFACE_LESSON_26_16.de.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/ANIMATION_AUDIO_INTERFACE_LESSON_26_16.en.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/ANIMATION_AUDIO_INTERFACE_LESSON_26_16.zh.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/ANIMATION_IMPORT_4_7.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/ANIMATION_UI_4_7.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/API_REFERENCE_4_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/API_REFERENCE_5_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/API_REFERENCE_7_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/API_SDK_26_10.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/ARCHIVED_ENGINE_GUIDANCE_4_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/ASSET_CONTENT_LIBRARY_26_04.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/ASSET_PIPELINE_4_4.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/ASSET_RENDERING_LESSON_26_15.de.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/ASSET_RENDERING_LESSON_26_15.en.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/ASSET_RENDERING_LESSON_26_15.zh.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/AUDIO_PRODUCTION.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/AUDIT_26_11.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/AUTOMATION_VISUAL_SCRIPTING_6_3.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/BACKEND_ENVIRONMENT_AUDIT_26_11.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/BENCHMARKS.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/BUILD_AUTOMATION_3_9.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/BUILD_CI_GUIDE_4_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/BUILD_EXPORT_4_9.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/BUILD_EXPORT_5_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/CHARACTER_CONTROLLERS_4_5.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/CLEAN_MACHINE_QUALIFICATION_26_10.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/COLLABORATION_3_9.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/COMPATIBILITY.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/COMPETITIVE_REVIEW_26_01.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/COMPETITIVE_REVIEW_26_21.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/COMPONENT_AUTHORING_4_3.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/CONTENT_ANIMATION_6_4.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/CREATE_EXPORT_SMALL_GAME_4_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/CREATOR_EXPERIENCE_6_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/DELIVERY_FIELD_MATRIX_26_19.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/DELIVERY_LESSON_26_19.de.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/DELIVERY_LESSON_26_19.en.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/DELIVERY_LESSON_26_19.zh.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/DEPENDENCY_LICENSE_REVIEW_4_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/DEPRECATION_POLICY_5_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/DEVICE_MOBILE_ACCESSIBILITY_6_7.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/DPI_MATRIX_4_1.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/DYNAMIC_OBJECT_API_5_4.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/ECOSYSTEM_COLLABORATION_SHIPPING_6_9.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/EDIT_LEDGER_26_11.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/EDIT_LEDGER_26_12.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/EDIT_LEDGER_26_13.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/EDIT_LEDGER_26_14.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/EDIT_LEDGER_26_15.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/EDIT_LEDGER_26_16.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/EDIT_LEDGER_26_17.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/EDIT_LEDGER_26_18.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/EDIT_LEDGER_26_19.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/EDIT_LEDGER_26_20.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/EDIT_LEDGER_26_21.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/EDIT_LEDGER_26_22.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/EDIT_LEDGER_26_23.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/EDIT_LEDGER_26_24.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/EVIDENCE_MANIFEST_SCHEMA_4_1.json` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/EXTENSIONS_PLATFORM_DELIVERY_5_9.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/EXTERNAL_CHANGES_4_2.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/FEATURE_COMPARISON_5_1.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/FEATURE_INVENTORY_26_01.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/FEATURE_INVENTORY_26_02.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/FEATURE_INVENTORY_26_03.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/FEATURE_INVENTORY_26_04.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/FEATURE_INVENTORY_26_05.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/FEATURE_INVENTORY_26_06.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/FEATURE_INVENTORY_26_11.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/FEATURE_INVENTORY_26_20.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/FEATURE_INVENTORY_26_21.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/FEATURE_INVENTORY_6_2.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/FEATURE_PARITY_4_1.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/FIRST_GAME_4_9.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/FIRST_GAME_5_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/FONT_LICENSE_VERIFICATION_4_1.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/GAMEPLAY_FRAMEWORK_5_4.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/GAP_REGISTER_26_21.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/GAP_REGISTER_26_22.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/GAP_REGISTER_26_23.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/HIERARCHY_INSPECTOR_4_3.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/IMPLEMENTATION_TRACKER_26_12_TO_26_16.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/IMPLEMENTATION_TRACKER_26_17.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/IMPLEMENTATION_TRACKER_26_18.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/IMPLEMENTATION_TRACKER_26_19.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/IMPLEMENTATION_TRACKER_26_20.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/IMPLEMENTATION_TRACKER_26_21.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/IMPLEMENTATION_TRACKER_26_22.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/IMPLEMENTATION_TRACKER_26_23.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/IMPLEMENTATION_TRACKER_26_24.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/INDEPENDENT_USABILITY_26_10.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/INPUT_GAME_FLOW_5_4.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/KEYBOARD_ACCESSIBILITY_4_1.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/KNOWN_ISSUES_4_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/KNOWN_ISSUES_4_1.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/KNOWN_ISSUES_4_2.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/KNOWN_ISSUES_4_3.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/KNOWN_ISSUES_4_4.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/KNOWN_ISSUES_4_5.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/KNOWN_ISSUES_4_6.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/KNOWN_ISSUES_5_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/KNOWN_LIMITATIONS.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/LANGUAGE_COMMENT_COVERAGE_26_24.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/LANGUAGE_DEBUGGING_26_03.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/LARGE_WORLD_PERFORMANCE_6_8.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/LAYOUT_ENGINE_STAGE.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/MATERIAL_SHADER_WORKFLOW.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/MATERIALS_EFFECTS_5_5.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/MIGRATION_26_10.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/MIGRATION_26_22.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/MIGRATION_26_23.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/MIGRATION_4_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/MIGRATION_4_9.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/MIGRATION_5_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/MIGRATION_7_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/MIGRATION_AND_ROLLBACK_4_2.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/MULTIPLAYER_LESSON_26_18.de.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/MULTIPLAYER_LESSON_26_18.en.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/MULTIPLAYER_LESSON_26_18.zh.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/MULTIPLAYER_PRODUCTION_26_07.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/MULTIPLAYER_PRODUCTION_6_6.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/NATIVE_SERVER_ARCHITECTURE_26_18.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/NAVIGATION_4_1.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/NETWORK_FIELD_MATRIX_26_18.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/NETWORKING_EXPERIMENTAL_3_9.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/NETWORKING_REPLAY_5_8.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/NOVA_GRAPH_FORMAT_5_2.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/NOVA_RHAI_API_V2_STUBS.rhai` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/OBJECT_EVENT_AUTHORING_26_02.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/OBJECT_FAMILY_LESSON_26_14.de.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/OBJECT_FAMILY_LESSON_26_14.en.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/OBJECT_FAMILY_LESSON_26_14.zh.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/OUTPUT_BUILD_RELIABILITY_26_06.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PACKAGE_AUTHORING_3_9.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PACKAGE_PLUGIN_SDK_4_9.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PACKAGE_PLUGIN_SDK_5_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PANEL_ACCESSIBILITY_REVIEW_26_13.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PANEL_AUDIT_26_21.json` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PANEL_AUDIT_26_21.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PANEL_AUDIT_26_22.json` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PANEL_AUDIT_26_22.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PANEL_FINDINGS_26_21.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PARTICLE_SYSTEMS.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PARTICLES_POST_5_5.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PERFORMANCE_ACCESSIBILITY_6_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PERFORMANCE_BASELINES_5_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PERFORMANCE_BUDGETS_26_20.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PERFORMANCE_CAPTURES.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PERFORMANCE_GUIDE_4_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PERFORMANCE_OBSERVATIONS_26_23.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PHYSICS_2D_4_5.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PHYSICS_2D.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PHYSICS_DIAGNOSTICS_4_5.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PHYSICS_RENDERER_6_5.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PHYSICS_WORLD_FIELD_MATRIX_26_17.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PHYSICS_WORLD_LESSON_26_17.de.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PHYSICS_WORLD_LESSON_26_17.en.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PHYSICS_WORLD_LESSON_26_17.zh.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PLATFORM_BUILD_MATRIX_4_9.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PLATFORM_BUILD_MATRIX_5_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PLATFORM_GAP_REGISTER_26_10.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PLATFORM_INPUT_ACCESSIBILITY_26_08.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PLATFORM_SUPPORT_3_9.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PLATFORM_VERIFICATION.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PORTABLE_PLAYER_AND_INPUT_5_1.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PRESENTATION_3_6.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PRODUCTION_MEDIA_26_05.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PROJECT_FORMAT_2_SCHEMA_23.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PROJECT_FORMAT_2_SCHEMA_24.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PROJECT_FORMAT_2_SCHEMA_25.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PROJECT_FORMAT_2_SCHEMA_26.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PROJECT_FORMAT_2_SCHEMA_27.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PROJECT_FORMAT_2_SCHEMA_28.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PROJECT_TRANSACTIONS_4_2.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/PROJECTION_AUDIT_26_13.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/QUALIFICATION_FEATURE_GAPS_26_20.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/QUALIFICATION_LESSON_26_20.de.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/QUALIFICATION_LESSON_26_20.en.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/QUALIFICATION_LESSON_26_20.zh.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/QUALIFICATION_LESSON_26_21.de.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/QUALIFICATION_LESSON_26_21.en.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/QUALIFICATION_LESSON_26_21.zh.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/QUALIFICATION_LESSON_26_22.de.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/QUALIFICATION_LESSON_26_22.en.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/QUALIFICATION_LESSON_26_22.zh.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/QUALIFICATION_LESSON_26_23.de.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/QUALIFICATION_LESSON_26_23.en.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/QUALIFICATION_LESSON_26_23.zh.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/QUALIFICATION_LESSON_26_24.de.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/QUALIFICATION_LESSON_26_24.en.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/QUALIFICATION_LESSON_26_24.zh.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RECOVERY_4_2.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_ENGINEERING_4_9.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_ENGINEERING_5_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_02.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_03.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_04.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_05.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_06.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_07.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_08.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_09.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_10.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_12.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_13.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_14.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_15.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_16.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_17.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_18.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_19.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_20.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_21.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_22.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_23.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RELEASE_NOTES_26_24.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RENDERER_CAPABILITY_PATHS.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RENDERER_STAGE.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/REPRODUCIBILITY_26_10.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RHAI_API_V1.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RHAI_API_V2_MANIFEST.json` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RHAI_API_V2.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RHAI_DEBUG_PROTOCOL_V2.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RHAI_EXTERNAL_TOOLS_4_6.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RHAI_HOT_RELOAD_4_6.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RHAI_LANGUAGE_PROTOCOL.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RHAI_TESTING_COVERAGE_4_6.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RHAI_V1_TO_V2.json` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/ROADMAP_26_01_TO_26_10.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/ROADMAP_26_11_TO_26_20.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/ROADMAP_26_21_TO_26_30.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/ROADMAP_26_23_TO_26_30_ADDENDUM.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/ROADMAP_6_2_TO_7_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/RUNTIME_STAGE.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SCENE_PREFAB_SCHEMA_4_3.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SCHEMA_COMPATIBILITY_MATRIX_4_2.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SCRIPT_SUPPORT_MATRIX_26_12.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SCRIPTING_3_5.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SCRIPTING_CONTRACT_26_23.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SECURITY_GUIDE_4_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SECURITY_POLICY_5_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SERIALIZATION_SPECIFICATION_4_2.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SIMULATION_AUTHORING_26_06.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SOURCE_CONTROL_4_9.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SOURCE_CONTROL_5_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SOURCE_FILE_GUIDE_ZH_26_24.md` | 本索引：逐项说明当前发布自有文件的用途与注释位置。 |
| `docs/SOURCE_INVENTORY_26_11.json` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SOURCE_INVENTORY_26_20.json` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SOURCE_INVENTORY_26_21.json` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SOURCE_MAP_26_11.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SOURCE_MAP_26_20.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SOURCE_MAP_26_21.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SPRITE_TILEMAP_FONT_4_4.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/STABILITY.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/STABLE_CONTRACTS_6_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/STABLE_CONTRACTS.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/STABLE_CREATOR_PLATFORM_26_10.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/STABLE_CREATOR_PLATFORM_7_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/STRUCTURAL_GRAPH_26_24.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SUPPORT_MATRIX_26_10.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SUPPORT_POLICY_4_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/SUPPORT_POLICY_5_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/TEMPLATE_LIBRARY_26_01.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/TEMPLATE_LIBRARY_26_11.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/TEMPLATE_LIBRARY_26_20.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/TEMPLATE_LIBRARY_26_21.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/TEMPLATE_LIBRARY_26_22.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/TROUBLESHOOTING_26_10.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/TROUBLESHOOTING_4_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/TROUBLESHOOTING_5_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/TROUBLESHOOTING_7_0.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/TUTORIALS_3_9.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/TYPOGRAPHY_INVENTORY_4_1.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/UI_DESIGN_TOKENS_4_1.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/UI_LAYOUT_AUDIT_26_01.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/UI_LAYOUT_AUDIT_26_02.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/UI_LAYOUT_AUDIT_26_03.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/UI_LAYOUT_AUDIT_26_04.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/UI_LAYOUT_AUDIT_26_05.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/UI_LAYOUT_AUDIT_26_06.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/UI_LAYOUT_AUDIT_26_07.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/UI_LAYOUT_AUDIT_26_08_TO_26_10.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/UI_LAYOUT_AUDIT_26_11.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/UI_LOCALIZATION_ACCESSIBILITY_4_7.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/UNDO_COVERAGE_4_2.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/UX_GUIDE_5_0_1.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_12_LANGUAGE.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_12_RELEASE_PLAN.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_12_UI.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_13_UI.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_13_WORKSPACES.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_14_UI.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_15_ASSETS.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_15_LIBRARY.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_15_LIGHT_UI.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_15_SPRITES_AND_LIBRARY.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_16_ANIMATION_UI.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_16_INTEGRATION.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_16_INTERFACE.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_16_MEDIA.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_17_PHYSICS_WORLD.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_18_MULTIPLAYER.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_19_DELIVERY.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_20_QUALIFICATION.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_21_FOUNDATIONS.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSION_26_22_TRANSACTIONS.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VERSIONING_2026.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VISUAL_AUDIO_PIPELINE_3_7.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VISUAL_GRAPH_PERFORMANCE_26_02.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VISUAL_SCRIPT_DEBUGGING_5_3.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VISUAL_SCRIPTING_26_01.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VISUAL_SCRIPTING_26_11.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VISUAL_SCRIPTING_5_2.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/VISUAL_SCRIPTING_5_3.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/WEB_HOSTING_26_23.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/WEB_HOSTING_26_24.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/WORKSPACE_REVIEW_26_13.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/WORLD_DATA_3_8.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `docs/WORLDS_NAVIGATION_AI_5_7.md` | 工程文档：记录文件名所示专题、版本计划、实现、编辑清单或验证证据边界。 |
| `index.html` | 应用或播放器 HTML 入口：供构建工具生成可部署页面。 |
| `LICENSE.md` | 项目介绍、许可或设计资料；保留原文，本索引提供其文件级中文用途说明。 |
| `manual/index.html` | 离线用户手册：提供对应语言的操作说明或手册浏览入口。 |
| `manual/MANUAL.de.md` | 离线用户手册：提供对应语言的操作说明或手册浏览入口。 |
| `manual/MANUAL.en.md` | 离线用户手册：提供对应语言的操作说明或手册浏览入口。 |
| `manual/MANUAL.zh-CN.md` | 离线用户手册：提供对应语言的操作说明或手册浏览入口。 |
| `nova_core/Cargo.toml` | Rust 包依赖或构建配置，约束对应引擎模块的编译。 |
| `nova_core/LICENSE.md` | Rust 包依赖或构建配置，约束对应引擎模块的编译。 |
| `nova_core/src/lib.rs` | Rust 引擎、格式、脚本或 WASM 桥接实现：函数和闭包说明位于源码。 |
| `package.json` | 前端包权威版本、依赖和命令入口；JSON 不允许注释，中文说明保存在本索引。 |
| `player.html` | 应用或播放器 HTML 入口：供构建工具生成可部署页面。 |
| `pnpm-lock.yaml` | 依赖锁文件：固定可复现的包版本和完整性信息，由对应包管理器维护。 |
| `pnpm-workspace.yaml` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `README.md` | 项目介绍、许可或设计资料；保留原文，本索引提供其文件级中文用途说明。 |
| `README.zh-CN.md` | 项目介绍、许可或设计资料；保留原文，本索引提供其文件级中文用途说明。 |
| `reference-projects/migrations/migration-results.json` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/migrations/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-05/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-05/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-05/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-06/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-06/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-06/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-07/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-07/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-07/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-08/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-08/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-08/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-09/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-09/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-09/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-10/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-10/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-10/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-11/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-11/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-11/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-12/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-12/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-12/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-13/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-13/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-13/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-14/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-14/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-14/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-15/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-15/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-15/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-16/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-16/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-16/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-17/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-17/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-17/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-18/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-18/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-18/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-19/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-19/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-19/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-20/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-20/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-20/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-21/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-21/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-21/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-22/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-22/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-22/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-23/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-23/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-23/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-24/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-24/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-24/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-25/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-25/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-25/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-26/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-26/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-26/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-27/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-27/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-27/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-28/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-28/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-28/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/migrations/schema-29/expected-migrated.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-29/pre-migration.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/migrations/schema-29/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/plugins/hello-plugin/hello-plugin.wasm` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/plugins/hello-plugin/plugin.json` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/accessible-hud/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/accessible-hud/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/accessible-hud/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/accessible-hud/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/ai-v57-perception-utility/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/ai-v57-perception-utility/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/ai-v57-perception-utility/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/ai-v57-perception-utility/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/animation-v47-rig-sprite/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/animation-v47-rig-sprite/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/animation-v47-rig-sprite/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/animation-v47-rig-sprite/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/animation-v47-state-machine/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/animation-v47-state-machine/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/animation-v47-state-machine/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/animation-v47-state-machine/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/animation-v56-blend-runtime/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/animation-v56-blend-runtime/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/animation-v56-blend-runtime/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/animation-v56-blend-runtime/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/animation-v56-interop-recording/debug-trace-fixture.json` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/animation-v56-interop-recording/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/animation-v56-interop-recording/generated.rhai` | 参考项目的 Rhai 行为脚本；函数说明位于源码，签名夹具另有伴随说明。 |
| `reference-projects/projects/animation-v56-interop-recording/hot-reload-fixtures/compatible.nova-graph` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/animation-v56-interop-recording/hot-reload-fixtures/expected.json` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/animation-v56-interop-recording/hot-reload-fixtures/incompatible.nova-graph` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/animation-v56-interop-recording/merge-fixtures/base.nova-graph` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/animation-v56-interop-recording/merge-fixtures/expected.json` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/animation-v56-interop-recording/merge-fixtures/ours.nova-graph` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/animation-v56-interop-recording/merge-fixtures/theirs.nova-graph` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/animation-v56-interop-recording/package-node-fixture.json` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/animation-v56-interop-recording/ProductionGraph.nova-graph` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/animation-v56-interop-recording/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/animation-v56-interop-recording/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/animation-v56-interop-recording/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/animator-state-machine/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/animator-state-machine/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/animator-state-machine/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/animator-state-machine/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/audio-bus-effects/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/audio-bus-effects/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/audio-bus-effects/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/audio-bus-effects/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/audio-positional/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/audio-positional/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/audio-positional/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/audio-positional/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/audio-streaming/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/audio-streaming/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/audio-streaming/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/audio-streaming/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/audio-v48-routing-effects/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/audio-v48-routing-effects/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/audio-v48-routing-effects/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/audio-v48-routing-effects/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/audio-v48-spatial-streaming/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/audio-v48-spatial-streaming/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/audio-v48-spatial-streaming/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/audio-v48-spatial-streaming/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/audio-v56-waveform-mixer/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/audio-v56-waveform-mixer/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/audio-v56-waveform-mixer/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/audio-v56-waveform-mixer/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/authoring-5000-stress/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/authoring-5000-stress/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/authoring-5000-stress/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/authoring-5000-stress/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/authoring-multiple-cameras/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/authoring-multiple-cameras/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/authoring-multiple-cameras/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/authoring-multiple-cameras/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/authoring-nested-prefabs/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/authoring-nested-prefabs/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/authoring-nested-prefabs/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/authoring-nested-prefabs/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/authoring-parallax/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/authoring-parallax/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/authoring-parallax/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/authoring-parallax/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/authoring-pixel-art/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/authoring-pixel-art/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/authoring-pixel-art/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/authoring-pixel-art/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/authoring-resolution-independent/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/authoring-resolution-independent/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/authoring-resolution-independent/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/authoring-resolution-independent/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/authoring-v43-component-validation/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/authoring-v43-component-validation/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/authoring-v43-component-validation/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/authoring-v43-component-validation/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/authoring-v43-multiscene/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/authoring-v43-multiscene/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/authoring-v43-multiscene/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/authoring-v43-multiscene/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/authoring-v43-nested-prefabs/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/authoring-v43-nested-prefabs/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/authoring-v43-nested-prefabs/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/authoring-v43-nested-prefabs/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/authoring-v43-prefab-variants/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/authoring-v43-prefab-variants/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/authoring-v43-prefab-variants/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/authoring-v43-prefab-variants/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/build-automation/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/build-automation/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/build-automation/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/build-automation/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/build-v49-platform-matrix/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/build-v49-platform-matrix/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/build-v49-platform-matrix/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/build-v49-platform-matrix/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/build-v49-release-pipeline/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/build-v49-release-pipeline/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/build-v49-release-pipeline/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/build-v49-release-pipeline/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/build-v50-platform-matrix/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/build-v50-platform-matrix/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/build-v50-platform-matrix/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/build-v50-platform-matrix/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/build-v50-release-pipeline/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/build-v50-release-pipeline/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/build-v50-release-pipeline/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/build-v50-release-pipeline/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/ccd-test/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/ccd-test/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/ccd-test/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/ccd-test/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/cinematic-v56-nested-subtitles/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/cinematic-v56-nested-subtitles/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/cinematic-v56-nested-subtitles/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/cinematic-v56-nested-subtitles/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/collaboration-v2609-semantic-merge/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/collaboration-v2609-semantic-merge/merge-fixtures/base.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/collaboration-v2609-semantic-merge/merge-fixtures/ours.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/collaboration-v2609-semantic-merge/merge-fixtures/theirs.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/collaboration-v2609-semantic-merge/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/collaboration-v2609-semantic-merge/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/collaboration-v2609-semantic-merge/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/collaboration-v49-local-team/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/collaboration-v49-local-team/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/collaboration-v49-local-team/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/collaboration-v49-local-team/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/collaboration-v50-local-team/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/collaboration-v50-local-team/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/collaboration-v50-local-team/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/collaboration-v50-local-team/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/content-v44-font-coverage/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/content-v44-font-coverage/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/content-v44-font-coverage/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/content-v44-font-coverage/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/content-v44-parallax-path/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/content-v44-parallax-path/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/content-v44-parallax-path/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/content-v44-parallax-path/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/content-v44-sprite-atlas/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/content-v44-sprite-atlas/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/content-v44-sprite-atlas/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/content-v44-sprite-atlas/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/content-v44-tilemap-streaming/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/content-v44-tilemap-streaming/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/content-v44-tilemap-streaming/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/content-v44-tilemap-streaming/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/controller-navigation/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/controller-navigation/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/controller-navigation/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/controller-navigation/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2610-block-game/debug-trace-fixture.json` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/creator-v2610-block-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2610-block-game/generated.rhai` | 参考项目的 Rhai 行为脚本；函数说明位于源码，签名夹具另有伴随说明。 |
| `reference-projects/projects/creator-v2610-block-game/hot-reload-fixtures/compatible.nova-graph` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/creator-v2610-block-game/hot-reload-fixtures/expected.json` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/creator-v2610-block-game/hot-reload-fixtures/incompatible.nova-graph` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/creator-v2610-block-game/merge-fixtures/base.nova-graph` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/creator-v2610-block-game/merge-fixtures/expected.json` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/creator-v2610-block-game/merge-fixtures/ours.nova-graph` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/creator-v2610-block-game/merge-fixtures/theirs.nova-graph` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/creator-v2610-block-game/package-node-fixture.json` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/creator-v2610-block-game/ProductionGraph.nova-graph` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/creator-v2610-block-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2610-block-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2610-block-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2610-code-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2610-code-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2610-code-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2610-code-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2610-mixed-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2610-mixed-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2610-mixed-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2610-mixed-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2612-blocks-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2612-blocks-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2612-blocks-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2612-blocks-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2612-code-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2612-code-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2612-code-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2612-code-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2612-mixed-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2612-mixed-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2612-mixed-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2612-mixed-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2613-blocks-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2613-blocks-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2613-blocks-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2613-blocks-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2613-code-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2613-code-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2613-code-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2613-code-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2613-mixed-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2613-mixed-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2613-mixed-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2613-mixed-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2614-blocks-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2614-blocks-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2614-blocks-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2614-blocks-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2614-code-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2614-code-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2614-code-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2614-code-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2614-enemy-family/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2614-enemy-family/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2614-enemy-family/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2614-enemy-family/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2614-mixed-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2614-mixed-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2614-mixed-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2614-mixed-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2615-blocks-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2615-blocks-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2615-blocks-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2615-blocks-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2615-code-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2615-code-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2615-code-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2615-code-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2615-mixed-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2615-mixed-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2615-mixed-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2615-mixed-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2616-animated-menu/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2616-animated-menu/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2616-animated-menu/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2616-animated-menu/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2616-blocks-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2616-blocks-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2616-blocks-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2616-blocks-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2616-code-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2616-code-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2616-code-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2616-code-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2616-mixed-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2616-mixed-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2616-mixed-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2616-mixed-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2617-blocks-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2617-blocks-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2617-blocks-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2617-blocks-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2617-code-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2617-code-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2617-code-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2617-code-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2617-mixed-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2617-mixed-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2617-mixed-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2617-mixed-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2618-blocks-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2618-blocks-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2618-blocks-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2618-blocks-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2618-code-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2618-code-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2618-code-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2618-code-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2618-mixed-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2618-mixed-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2618-mixed-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2618-mixed-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2619-blocks-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2619-blocks-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2619-blocks-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2619-blocks-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2619-code-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2619-code-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2619-code-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2619-code-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2619-mixed-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2619-mixed-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2619-mixed-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2619-mixed-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2620-animated-menu/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2620-animated-menu/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2620-animated-menu/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2620-animated-menu/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2620-blocks-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2620-blocks-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2620-blocks-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2620-blocks-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2620-code-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2620-code-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2620-code-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2620-code-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2620-mixed-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2620-mixed-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2620-mixed-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2620-mixed-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2620-output-quality/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2620-output-quality/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2620-output-quality/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2620-output-quality/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2621-animated-menu/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2621-animated-menu/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2621-animated-menu/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2621-animated-menu/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2621-blocks-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2621-blocks-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2621-blocks-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2621-blocks-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2621-code-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2621-code-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2621-code-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2621-code-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2621-mixed-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2621-mixed-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2621-mixed-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2621-mixed-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2621-output-quality/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2621-output-quality/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2621-output-quality/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2621-output-quality/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2622-animated-menu/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2622-animated-menu/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2622-animated-menu/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2622-animated-menu/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2622-blocks-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2622-blocks-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2622-blocks-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2622-blocks-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2622-code-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2622-code-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2622-code-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2622-code-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2622-mixed-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2622-mixed-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2622-mixed-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2622-mixed-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2622-output-quality/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2622-output-quality/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2622-output-quality/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2622-output-quality/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2623-animated-menu/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2623-animated-menu/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2623-animated-menu/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2623-animated-menu/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2623-blocks-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2623-blocks-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2623-blocks-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2623-blocks-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2623-code-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2623-code-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2623-code-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2623-code-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2623-mixed-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2623-mixed-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2623-mixed-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2623-mixed-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2623-output-quality/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2623-output-quality/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2623-output-quality/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2623-output-quality/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2624-animated-menu/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2624-animated-menu/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2624-animated-menu/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2624-animated-menu/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2624-blocks-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2624-blocks-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2624-blocks-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2624-blocks-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2624-code-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2624-code-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2624-code-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2624-code-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2624-mixed-game/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2624-mixed-game/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2624-mixed-game/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2624-mixed-game/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v2624-output-quality/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v2624-output-quality/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v2624-output-quality/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v2624-output-quality/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v60-animation-cutscene/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v60-animation-cutscene/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v60-animation-cutscene/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v60-animation-cutscene/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v60-localized-menu/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v60-localized-menu/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v60-localized-menu/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v60-localized-menu/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v60-network-sample/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v60-network-sample/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v60-network-sample/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v60-network-sample/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v60-package-plugin/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v60-package-plugin/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v60-package-plugin/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v60-package-plugin/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v60-physics-puzzle/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v60-physics-puzzle/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v60-physics-puzzle/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v60-physics-puzzle/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v60-platformer/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v60-platformer/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v60-platformer/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v60-platformer/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v60-save-checkpoint/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v60-save-checkpoint/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v60-save-checkpoint/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v60-save-checkpoint/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v60-snake/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v60-snake/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v60-snake/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v60-snake/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v60-tilemap-world/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v60-tilemap-world/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v60-tilemap-world/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v60-tilemap-world/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v60-top-down/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v60-top-down/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v60-top-down/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v60-top-down/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v60-web-deployment/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v60-web-deployment/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v60-web-deployment/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v60-web-deployment/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v60-windows-portable/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v60-windows-portable/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v60-windows-portable/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v60-windows-portable/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v601-mouse-knockout/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v601-mouse-knockout/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v601-mouse-knockout/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v601-mouse-knockout/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v602-interaction-export-audit/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v602-interaction-export-audit/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v602-interaction-export-audit/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v602-interaction-export-audit/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v603-template-export-accessibility/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v603-template-export-accessibility/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v603-template-export-accessibility/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v603-template-export-accessibility/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v604-linked-build-performance/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v604-linked-build-performance/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v604-linked-build-performance/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v604-linked-build-performance/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v620-behavior-contract/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v620-behavior-contract/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v620-behavior-contract/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v620-behavior-contract/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v630-automation-blocks/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v630-automation-blocks/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v630-automation-blocks/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v630-automation-blocks/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v640-content-animation/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v640-content-animation/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v640-content-animation/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v640-content-animation/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v650-physics-renderer/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v650-physics-renderer/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v650-physics-renderer/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v650-physics-renderer/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v660-coop-arena/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v660-coop-arena/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v660-coop-arena/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v660-coop-arena/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v660-headless-authority/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v660-headless-authority/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v660-headless-authority/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v660-headless-authority/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v670-touch-platformer/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v670-touch-platformer/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v670-touch-platformer/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v670-touch-platformer/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v680-large-world/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v680-large-world/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v680-large-world/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v680-large-world/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v690-package-shipping/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v690-package-shipping/PACKAGE_FIXTURE.zh.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v690-package-shipping/package-fixture/package.json` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/creator-v690-package-shipping/package-fixture/src/index.rhai` | 参考项目的 Rhai 行为脚本；函数说明位于源码，签名夹具另有伴随说明。 |
| `reference-projects/projects/creator-v690-package-shipping/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v690-package-shipping/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v690-package-shipping/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v690-semantic-collaboration/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v690-semantic-collaboration/merge-fixtures/base.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v690-semantic-collaboration/merge-fixtures/ours.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v690-semantic-collaboration/merge-fixtures/theirs.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v690-semantic-collaboration/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v690-semantic-collaboration/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v690-semantic-collaboration/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v700-migration-recovery/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v700-migration-recovery/migration-lab/EXPECTED.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v700-migration-recovery/migration-lab/future-schema.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v700-migration-recovery/migration-lab/v6.9-schema29.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v700-migration-recovery/migration-lab/v7-schema29-expected.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v700-migration-recovery/PACKAGE_FIXTURE.zh.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v700-migration-recovery/package-fixture/package.json` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/creator-v700-migration-recovery/package-fixture/src/index.rhai` | 参考项目的 Rhai 行为脚本；函数说明位于源码，签名夹具另有伴随说明。 |
| `reference-projects/projects/creator-v700-migration-recovery/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v700-migration-recovery/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v700-migration-recovery/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/creator-v700-stable-platform/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/creator-v700-stable-platform/PACKAGE_FIXTURE.zh.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v700-stable-platform/package-fixture/package.json` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/creator-v700-stable-platform/package-fixture/src/index.rhai` | 参考项目的 Rhai 行为脚本；函数说明位于源码，签名夹具另有伴随说明。 |
| `reference-projects/projects/creator-v700-stable-platform/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/creator-v700-stable-platform/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/creator-v700-stable-platform/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/data-foundation-validation.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/data-foundation-validation/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/data-foundation-validation/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/data-foundation-validation/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/data-foundation-validation/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/delivery-v2619-package-build/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/delivery-v2619-package-build/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/delivery-v2619-package-build/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/delivery-v2619-package-build/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/delivery-v2619-semantic-merge/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/delivery-v2619-semantic-merge/incoming.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/delivery-v2619-semantic-merge/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/delivery-v2619-semantic-merge/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/delivery-v2619-semantic-merge/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/delivery-v59-offline-registry/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/delivery-v59-offline-registry/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/delivery-v59-offline-registry/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/delivery-v59-offline-registry/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/delivery-v59-platform-matrix/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/delivery-v59-platform-matrix/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/delivery-v59-platform-matrix/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/delivery-v59-platform-matrix/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/delivery-v670-android-gated/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/delivery-v670-android-gated/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/delivery-v670-android-gated/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/delivery-v670-android-gated/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/ecosystem-v59-malicious-corpus/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/ecosystem-v59-malicious-corpus/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/ecosystem-v59-malicious-corpus/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/ecosystem-v59-malicious-corpus/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/ecosystem-v59-wasm-api-matrix/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/ecosystem-v59-wasm-api-matrix/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/ecosystem-v59-wasm-api-matrix/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/ecosystem-v59-wasm-api-matrix/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/empty.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/empty/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/empty/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/empty/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/empty/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/first-game-v49-tier1/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/first-game-v49-tier1/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/first-game-v49-tier1/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/first-game-v49-tier1/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/first-game-v50-tier1/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/first-game-v50-tier1/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/first-game-v50-tier1/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/first-game-v50-tier1/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/gameplay-v54-menu/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/gameplay-v54-menu/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/gameplay-v54-menu/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/gameplay-v54-menu/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/gameplay-v54-platformer/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/gameplay-v54-platformer/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/gameplay-v54-platformer/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/gameplay-v54-platformer/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/gameplay-v54-pooling/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/gameplay-v54-pooling/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/gameplay-v54-pooling/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/gameplay-v54-pooling/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/gameplay-v54-snake-growth/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/gameplay-v54-snake-growth/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/gameplay-v54-snake-growth/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/gameplay-v54-snake-growth/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/gameplay-v54-twin-stick/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/gameplay-v54-twin-stick/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/gameplay-v54-twin-stick/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/gameplay-v54-twin-stick/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/headless-networking/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/headless-networking/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/headless-networking/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/headless-networking/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/joint-showcase/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/joint-showcase/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/joint-showcase/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/joint-showcase/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/localization-workflow/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/localization-workflow/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/localization-workflow/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/localization-workflow/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/multiplayer-v2607-coop-rollback/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/multiplayer-v2607-coop-rollback/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/multiplayer-v2607-coop-rollback/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/multiplayer-v2607-coop-rollback/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/multiplayer-v2607-headless-authority/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/multiplayer-v2607-headless-authority/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/multiplayer-v2607-headless-authority/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/multiplayer-v2607-headless-authority/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/multiplayer-v2618-coop-client/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/multiplayer-v2618-coop-client/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/multiplayer-v2618-coop-client/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/multiplayer-v2618-coop-client/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/multiplayer-v2618-coop-host/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/multiplayer-v2618-coop-host/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/multiplayer-v2618-coop-host/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/multiplayer-v2618-coop-host/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/navigation-v57-10000-agents/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/navigation-v57-10000-agents/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/navigation-v57-10000-agents/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/navigation-v57-10000-agents/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/navigation-world/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/navigation-world/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/navigation-world/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/navigation-world/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/network-v58-late-join/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/network-v58-late-join/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/network-v58-late-join/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/network-v58-late-join/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/network-v58-localhost-rpc/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/network-v58-localhost-rpc/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/network-v58-localhost-rpc/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/network-v58-localhost-rpc/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/network-v58-loss-reconnect/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/network-v58-loss-reconnect/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/network-v58-loss-reconnect/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/network-v58-loss-reconnect/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/network-v58-replay-rollback/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/network-v58-replay-rollback/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/network-v58-replay-rollback/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/network-v58-replay-rollback/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/networked-optional.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/networked-optional/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/networked-optional/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/networked-optional/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/networked-optional/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/optional-object-pool/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/optional-object-pool/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/optional-object-pool/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/optional-object-pool/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/package-authoring/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/package-authoring/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/package-authoring/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/package-authoring/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/package-v49-extension-sdk/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/package-v49-extension-sdk/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/package-v49-extension-sdk/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/package-v49-extension-sdk/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/package-v50-extension-sdk/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/package-v50-extension-sdk/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/package-v50-extension-sdk/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/package-v50-extension-sdk/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/performance-v2609-large-world/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/performance-v2609-large-world/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/performance-v2609-large-world/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/performance-v2609-large-world/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/performance-v48-capture/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/performance-v48-capture/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/performance-v48-capture/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/performance-v48-capture/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/physics-sandbox.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/physics-sandbox/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/physics-sandbox/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/physics-sandbox/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/physics-sandbox/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/physics-v2617-navigation/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/physics-v2617-navigation/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/physics-v2617-navigation/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/physics-v2617-navigation/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/physics-v2617-platformer/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/physics-v2617-platformer/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/physics-v2617-platformer/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/physics-v2617-platformer/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/physics-v2617-puzzle/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/physics-v2617-puzzle/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/physics-v2617-puzzle/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/physics-v2617-puzzle/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/physics-v45-diagnostics/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/physics-v45-diagnostics/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/physics-v45-diagnostics/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/physics-v45-diagnostics/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/physics-v45-joints/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/physics-v45-joints/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/physics-v45-joints/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/physics-v45-joints/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/physics-v45-platformer/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/physics-v45-platformer/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/physics-v45-platformer/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/physics-v45-platformer/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/physics-v45-queries-triggers/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/physics-v45-queries-triggers/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/physics-v45-queries-triggers/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/physics-v45-queries-triggers/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/physics-v45-rope2d/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/physics-v45-rope2d/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/physics-v45-rope2d/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/physics-v45-rope2d/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/physics-v45-top-down/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/physics-v45-top-down/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/physics-v45-top-down/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/physics-v45-top-down/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/platform-v2608-touch-pen-accessibility/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/platform-v2608-touch-pen-accessibility/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/platform-v2608-touch-pen-accessibility/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/platform-v2608-touch-pen-accessibility/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/platformer-character/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/platformer-character/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/platformer-character/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/platformer-character/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/platformer.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/platformer/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/platformer/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/platformer/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/platformer/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/production-media-v2605-polished/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/production-media-v2605-polished/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/production-media-v2605-polished/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/production-media-v2605-polished/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/pseudoloc-stress/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/pseudoloc-stress/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/pseudoloc-stress/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/pseudoloc-stress/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/rendering-fonts-multilingual/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/rendering-fonts-multilingual/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/rendering-fonts-multilingual/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/rendering-fonts-multilingual/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/rendering-lighting-shadows/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/rendering-lighting-shadows/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/rendering-lighting-shadows/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/rendering-lighting-shadows/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/rendering-particles/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/rendering-particles/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/rendering-particles/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/rendering-particles/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/rendering-render-textures/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/rendering-render-textures/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/rendering-render-textures/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/rendering-render-textures/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/rendering-shader-uniforms/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/rendering-shader-uniforms/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/rendering-shader-uniforms/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/rendering-shader-uniforms/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/rendering-v48-lighting-materials/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/rendering-v48-lighting-materials/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/rendering-v48-lighting-materials/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/rendering-v48-lighting-materials/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/rendering-v48-particles/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/rendering-v48-particles/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/rendering-v48-particles/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/rendering-v48-particles/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/rendering-v48-shader-platform/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/rendering-v48-shader-platform/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/rendering-v48-shader-platform/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/rendering-v48-shader-platform/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/rendering-v48-texture-atlas/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/rendering-v48-texture-atlas/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/rendering-v48-texture-atlas/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/rendering-v48-texture-atlas/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/rendering-v55-fallback/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/rendering-v55-fallback/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/rendering-v55-fallback/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/rendering-v55-fallback/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/rendering-v55-material-graph/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/rendering-v55-material-graph/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/rendering-v55-material-graph/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/rendering-v55-material-graph/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/rendering-v55-particle-trails/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/rendering-v55-particle-trails/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/rendering-v55-particle-trails/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/rendering-v55-particle-trails/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/rendering-v55-pixel-high-dpi/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/rendering-v55-pixel-high-dpi/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/rendering-v55-pixel-high-dpi/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/rendering-v55-pixel-high-dpi/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/responsive-menu/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/responsive-menu/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/responsive-menu/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/responsive-menu/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/rtl-interface/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/rtl-interface/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/rtl-interface/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/rtl-interface/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/runtime-rebinding/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/runtime-rebinding/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/runtime-rebinding/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/runtime-rebinding/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/save-migration/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/save-migration/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/save-migration/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/save-migration/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/script-api-v1-examples/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/script-api-v1-examples/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/script-api-v1-examples/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/script-api-v1-examples/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/script-async-tasks/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/script-async-tasks/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/script-async-tasks/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/script-async-tasks/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/script-debugger-scenarios/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/script-debugger-scenarios/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/script-debugger-scenarios/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/script-debugger-scenarios/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/script-lifecycle-signals/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/script-lifecycle-signals/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/script-lifecycle-signals/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/script-lifecycle-signals/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/script-test-runner/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/script-test-runner/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/script-test-runner/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/script-test-runner/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/script-v46-api-contract/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/script-v46-api-contract/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/script-v46-api-contract/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/script-v46-api-contract/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/script-v46-debugger/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/script-v46-debugger/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/script-v46-debugger/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/script-v46-debugger/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/script-v46-external-tools/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/script-v46-external-tools/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/script-v46-external-tools/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/script-v46-external-tools/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/script-v46-hot-reload/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/script-v46-hot-reload/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/script-v46-hot-reload/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/script-v46-hot-reload/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/script-v46-language-services/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/script-v46-language-services/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/script-v46-language-services/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/script-v46-language-services/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/script-v46-tests-coverage/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/script-v46-tests-coverage/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/script-v46-tests-coverage/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/script-v46-tests-coverage/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/scripting-v2623-inventory-callback/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/scripting-v2623-inventory-callback/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/scripting-v2623-inventory-callback/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/scripting-v2623-inventory-callback/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/scripting-v2624-inventory-callback/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/scripting-v2624-inventory-callback/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/scripting-v2624-inventory-callback/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/scripting-v2624-inventory-callback/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/server-v2608-headless-authority/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/server-v2608-headless-authority/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/server-v2608-headless-authority/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/server-v2608-headless-authority/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/server-v2609-headless-authority/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/server-v2609-headless-authority/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/server-v2609-headless-authority/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/server-v2609-headless-authority/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/server-v2610-headless-authority/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/server-v2610-headless-authority/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/server-v2610-headless-authority/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/server-v2610-headless-authority/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/server-v2612-headless-authority/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/server-v2612-headless-authority/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/server-v2612-headless-authority/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/server-v2612-headless-authority/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/server-v2613-headless-authority/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/server-v2613-headless-authority/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/server-v2613-headless-authority/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/server-v2613-headless-authority/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/server-v2614-headless-authority/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/server-v2614-headless-authority/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/server-v2614-headless-authority/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/server-v2614-headless-authority/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/server-v2615-headless-authority/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/server-v2615-headless-authority/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/server-v2615-headless-authority/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/server-v2615-headless-authority/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/server-v2616-headless-authority/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/server-v2616-headless-authority/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/server-v2616-headless-authority/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/server-v2616-headless-authority/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/server-v2617-headless-authority/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/server-v2617-headless-authority/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/server-v2617-headless-authority/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/server-v2617-headless-authority/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/server-v2618-headless-authority/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/server-v2618-headless-authority/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/server-v2618-headless-authority/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/server-v2618-headless-authority/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/server-v2619-headless-authority/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/server-v2619-headless-authority/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/server-v2619-headless-authority/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/server-v2619-headless-authority/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/server-v2620-headless-authority/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/server-v2620-headless-authority/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/server-v2620-headless-authority/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/server-v2620-headless-authority/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/server-v2621-headless-authority/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/server-v2621-headless-authority/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/server-v2621-headless-authority/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/server-v2621-headless-authority/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/server-v2622-headless-authority/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/server-v2622-headless-authority/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/server-v2622-headless-authority/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/server-v2622-headless-authority/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/server-v2623-headless-authority/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/server-v2623-headless-authority/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/server-v2623-headless-authority/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/server-v2623-headless-authority/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/server-v2624-headless-authority/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/server-v2624-headless-authority/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/server-v2624-headless-authority/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/server-v2624-headless-authority/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/simulation-v2606-physics-navigation-ai/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/simulation-v2606-physics-navigation-ai/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/simulation-v2606-physics-navigation-ai/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/simulation-v2606-physics-navigation-ai/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/snake-v51-playable/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/snake-v51-playable/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/snake-v51-playable/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/snake-v51-playable/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/source-control-workflow/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/source-control-workflow/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/source-control-workflow/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/source-control-workflow/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/sprite-animation/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/sprite-animation/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/sprite-animation/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/sprite-animation/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/stacking-test/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/stacking-test/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/stacking-test/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/stacking-test/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/streamed-world/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/streamed-world/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/streamed-world/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/streamed-world/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/tilemap-animated/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/tilemap-animated/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/tilemap-animated/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/tilemap-animated/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/tilemap-multilayer/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/tilemap-multilayer/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/tilemap-multilayer/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/tilemap-multilayer/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/tilemap-terrain-rules/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/tilemap-terrain-rules/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/tilemap-terrain-rules/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/tilemap-terrain-rules/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/tilemap-v57-background-bake/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/tilemap-v57-background-bake/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/tilemap-v57-background-bake/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/tilemap-v57-background-bake/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/top-down-character/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/top-down-character/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/top-down-character/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/top-down-character/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/top-down.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/top-down/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/top-down/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/top-down/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/top-down/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/trigger-showcase/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/trigger-showcase/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/trigger-showcase/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/trigger-showcase/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/ui-showcase.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/ui-showcase/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/ui-showcase/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/ui-showcase/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/ui-showcase/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/ui-v47-accessibility/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/ui-v47-accessibility/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/ui-v47-accessibility/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/ui-v47-accessibility/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/ui-v47-multilingual-rtl/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/ui-v47-multilingual-rtl/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/ui-v47-multilingual-rtl/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/ui-v47-multilingual-rtl/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/ui-v47-responsive-hud/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/ui-v47-responsive-hud/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/ui-v47-responsive-hud/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/ui-v47-responsive-hud/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/visual-scripting-v52-foundation/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/visual-scripting-v52-foundation/generated.rhai` | 参考项目的 Rhai 行为脚本；函数说明位于源码，签名夹具另有伴随说明。 |
| `reference-projects/projects/visual-scripting-v52-foundation/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/visual-scripting-v52-foundation/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/visual-scripting-v52-foundation/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/visual-scripting-v52-foundation/VisualStartup.nova-graph` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/visual-scripting-v53-production/debug-trace-fixture.json` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/visual-scripting-v53-production/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/visual-scripting-v53-production/generated.rhai` | 参考项目的 Rhai 行为脚本；函数说明位于源码，签名夹具另有伴随说明。 |
| `reference-projects/projects/visual-scripting-v53-production/hot-reload-fixtures/compatible.nova-graph` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/visual-scripting-v53-production/hot-reload-fixtures/expected.json` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/visual-scripting-v53-production/hot-reload-fixtures/incompatible.nova-graph` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/visual-scripting-v53-production/merge-fixtures/base.nova-graph` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/visual-scripting-v53-production/merge-fixtures/expected.json` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/visual-scripting-v53-production/merge-fixtures/ours.nova-graph` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/visual-scripting-v53-production/merge-fixtures/theirs.nova-graph` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/visual-scripting-v53-production/package-node-fixture.json` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/visual-scripting-v53-production/ProductionGraph.nova-graph` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reference-projects/projects/visual-scripting-v53-production/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/visual-scripting-v53-production/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/visual-scripting-v53-production/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/web-deployment/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/web-deployment/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/web-deployment/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/web-deployment/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/workspace-recovery-validation.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/workspace-recovery-validation/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/workspace-recovery-validation/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/workspace-recovery-validation/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/workspace-recovery-validation/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/projects/world-v57-streaming-handoff/expected-output.json` | 参考项目的预期输出数据，供实际运行结果比较。 |
| `reference-projects/projects/world-v57-streaming-handoff/project.nova` | 参考项目文档：保存场景、实体、组件、资产引用和项目设置，供导入与导出示例使用。 |
| `reference-projects/projects/world-v57-streaming-handoff/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/projects/world-v57-streaming-handoff/test-controls.json` | 参考项目的操作输入与检查配置。 |
| `reference-projects/README.md` | 参考项目说明：描述该目录项目的操作、预期结果或验证边界。 |
| `reference-projects/workspace-recovery-validation.nova-workspaces` | 参考项目配套数据或资产；由同目录项目和说明文件引用。 |
| `reports/v26.22-animation-audio.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-animation-authoring.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-animation-ui.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-asset-import-property-discovery.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-audio-pcm.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-bindings.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-component-property-canonical.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-component-property-discovery.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-delivery-user.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-delivery.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-interface.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-lsp.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-media-field-lifecycle.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-media-performance.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-media-roundtrip.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-menu-user.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-navigation.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-network-process.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-networking.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-package-user.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-palette-layout.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-palette-user.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-panel-coverage-comparison.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-playback-stability-isolated.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-property-lifecycle-matrix.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-public-operations.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-quality-user.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-queries.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-reproducibility.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-retained-batches.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-retained-resource-handlers.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-runtime-family-evidence.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-save-recovery.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-settings-export-failures.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-settings-property-canonical.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-settings-property-discovery.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-timeline-actions.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-asset-import-corpus.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-asset-library-operations.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-audio-import-boundaries.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-authoring-actions.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-automation-actions.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-component-history.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-component-order.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-component-primitives.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-connection-corpus.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-document-boundaries.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-entity-api.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-event-validation.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-graph-actions.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-manifest-corpus.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-material-corpus.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-media-field-corpus.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-media-history.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-metadata-corpus.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-nested-component-corpus.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-operational-metadata-actions.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-package-lifecycle.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-reference-ownership.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-repair-actions.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-resource-actions.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-scene-ownership.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-script-assets-corpus.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-studio-save-boundary.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-tilemap-bake.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-trace-ui-theme-corpus.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-traced-api-signatures.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-traced-assets.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-traced-language-editor.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-traced-language.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-traced-script-modules.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-traced-sprites.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-traced-syntax-slots.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-traced-tiled.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-traced-typed-graphs.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-traced-workspaces.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-world-roundtrip.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `reports/v26.22-world-streaming.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `rust-toolchain.toml` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `scripts/audit-animation.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-calendar-milestone.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-chinese-comments.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-dependencies-v26.03.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-dependencies-v26.04.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-dependencies-v26.05.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-dependencies-v26.06.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-dependencies-v26.07.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-dependencies-v26.08.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-dependencies-v26.09.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-dependencies-v26.10.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-dependencies-v4.9.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-dependencies-v5.0.1.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-dependencies-v5.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-dependencies-v6.6.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-dependencies-v6.7.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-dependencies-v6.8.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-dependencies-v6.9.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-dependencies-v7.0.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-editor-shell.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-manual.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-rendering.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-repository-hygiene.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-script-studio.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-typography.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v2.5.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v2.6.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v2.7.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v2.8.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v2.9.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v26.01.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v26.02.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v26.03.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v26.04.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v26.05.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v26.06.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v26.07.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v26.11-ui-source.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v26.13-panels.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v26.21-reference-imports.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v26.21-surfaces.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v26.22-public-operations.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v26.22-reference-imports.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v26.22-runtime-families.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v26.22-surfaces.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v3.1.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v3.2.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v3.3.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v3.4.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v3.5.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v3.6.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v3.7.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v3.8.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v3.9.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v3.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v4.1.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v4.2.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v4.3.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v4.4.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v4.5.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v4.6.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v4.7.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v4.8.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v4.9.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v4.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v5.0.1.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v5.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v5.1.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v5.2.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v5.3.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v5.4.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v5.5.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v5.6.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v5.7.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v5.8.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v5.9.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v6.0.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v6.0.1.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v6.0.2.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v6.0.3.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v6.0.4.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v6.1.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v6.2.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v6.3.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v6.4.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v6.5.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v6.6.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v6.7.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v6.8.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v6.9.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/audit-v7.0.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/benchmark-v26.24-graph-layout.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/benchmark-v3.2.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/benchmark-v3.3.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/benchmark-v3.4.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/benchmark-v3.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/discover-v26.22-asset-import-properties.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/discover-v26.22-component-properties.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/discover-v26.22-media-lifecycle.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/discover-v26.22-property-lifecycle.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/discover-v26.22-settings-properties.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/draft-chinese-comments.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/export-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/export-template-registry.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/fixtures/layout24-baseline/graphLayoutEngine-v26.23.ts.gz` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/layout24-baseline/manifest.json` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/layout24-baseline/README.zh.md` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/renderer-fixture.ts` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/renderer20-fixture.ts` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/rendering20/baseline-webgl-v26.19.ts` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/v26.12-rhai-corpus.mjs` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/v26.15-template-library.json` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/v26.16-interface-components.json` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/v26.16-media-browser.mjs` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/v26.16-media-fields.mjs` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/v26.17-world-fields.mjs` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/v26.17-world-panels.nova` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/v26.22-derived-field-dispositions.json` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/v26.22-import-project.mjs` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/v26.22-media-structured.mjs` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/v26.22-operation-dispositions.json` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/v26.22-property-dispositions.mjs` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/v26.22-runtime-dispositions.mjs` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/v26.22-settings-dispositions.mjs` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/fixtures/v26.22-settings-populated.mjs` | 验证夹具：提供受控渲染、媒体、属性或旧版基线环境，不进入编辑器日常操作。 |
| `scripts/generate-calendar-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-release-plan.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-rhai-api-signatures.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-script-api-docs.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-sequential-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-source-guide-zh.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.01-feature-inventory.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.01-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.02-feature-inventory.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.02-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.03-feature-inventory.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.03-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.04-feature-inventory.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.04-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.05-feature-inventory.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.05-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.05-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.06-feature-inventory.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.06-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.06-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.07-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.07-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.08-v26.10-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.12-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.12-teaching.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.13-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.13-teaching.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.14-core-references.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.14-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.14-release-references.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.14-teaching.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.15-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.15-teaching.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.16-core-references.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.16-menu-reference.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.16-teaching.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.17-core-references.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.17-field-manual.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.17-layout-fixture.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.17-physics-references.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.17-teaching.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.18-core-references.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.18-field-manual.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.18-teaching.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.19-field-manual.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.19-references.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.19-teaching.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.20-ledger.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.20-references.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.20-teaching.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.20-template-walkthroughs.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.21-ledger.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.21-references.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.21-teaching.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.21-template-walkthroughs.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.22-component-enums.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.22-component-primitives.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.22-edit-ledger.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.22-references.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.22-teaching.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.22-template-walkthroughs.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.23-inventory-reference.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.23-references.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.23-teaching.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.24-inventory-reference.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.24-references.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v26.24-teaching.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v3.1-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v3.2-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v3.3-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v3.4-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v3.5-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v3.6-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v3.7-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v3.8-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v3.9-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v4-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v4-release-health.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v4.1-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v4.2-migration-fixtures.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v4.2-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v4.3-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v4.4-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v4.5-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v4.5-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v4.6-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v4.6-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v4.7-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v4.7-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v4.8-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v4.8-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v4.9-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v4.9-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.0.1-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.0.1-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.1.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.1.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.2.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.2.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.3.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.3.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.4.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.4.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.5.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.5.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.6.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.6.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.7.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.7.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.8.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.8.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.9.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v5.9.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.0.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.0.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.0.0-teaching-manual.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.0.1-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.0.1-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.0.1-teaching-manual.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.0.2-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.0.2-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.0.3-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.0.3-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.0.4-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.0.4-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.1.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.2.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.2.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.3.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.3.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.4.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.4.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.5.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.5.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.6.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.6.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.7.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.7.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.8.0-large-fixtures.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.8.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.8.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.9.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v6.9.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v7.0.0-reference-projects.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/generate-v7.0.0-release-evidence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/inventory-v26.11.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/inventory-v26.20.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/inventory-v26.21.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/lib/assetAudit15.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/browserOperationEvidence22.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/browserUserAudit.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/constructorFactoryEvidence22.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/declarationEvidence22.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/deliveryExportAudit19.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/deliveryExportAudit20.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/headlessPeerDiagnostics.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/mediaAudit16.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/milestoneAuditBundle.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/milestoneAuditContext.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/milestoneBuildReceipt.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/nativeRenderingConsumer.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/networkAudit18.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/networkExportAudit18.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/nodeOperationEvidence22.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/nodeOperationTrace22.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/operationCoverage22.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/operationDispositions22.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/operationEvidence22.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/propertyAudit22.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/rendererNativeAudit.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/renderingUserPixels.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/rhaiApiInventory.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/runtimeAudit14.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/userFixtures22.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/worldAudit17.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/worldExportAudit17.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/lib/worldExportServer17.mjs` | 构建与验证共享库：文件内中文注释说明接口和辅助流程。 |
| `scripts/network-peer-v26.18.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/network-peer-v5.8.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/network-peer-v6.6.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/nova-cli.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/nova-export.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/nova-package-publisher.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/nova-rhai-language-server.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/package-release.ps1` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/prepare-calendar-release.ps1` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/probe-native-key.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-editor-v3.1.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-editor-v3.2.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v26.01.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v26.02.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v26.03.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v26.04.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v26.05.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v26.06.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v26.07.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v26.08.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v26.09.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v26.10.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v26.11.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v26.20.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v26.21.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v26.22.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v26.23.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v26.24.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v3.3.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v3.4.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v3.5.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v3.6.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v3.7.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v3.8.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v3.9.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v4.1.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v4.2.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v4.3.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v4.4.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v4.5.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v4.6.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v4.7.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v4.8.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v4.9.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v4.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v5.0.1.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v5.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v5.4.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v5.5.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v5.6.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v5.7.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v5.8.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v5.9.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v6.0.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v6.0.1.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v6.0.2.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v6.0.3.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v6.0.4.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v6.1.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v6.2.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v6.3.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v6.4.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v6.5.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v6.6.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v6.7.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v6.8.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v6.9.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-layout-v7.0.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-native-window-v3.1.ps1` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-native-window-v3.2.ps1` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-panels-v26.20.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-panels-v26.21.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-panels-v26.22.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-panels-v26.23.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/qualify-panels-v26.24.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/release-milestone-gates.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/release-policy.ps1` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/release-qualification.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/release-source-snapshot.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/repair-v26.21-reference-identities.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/run-release-v4.9.ps1` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/run-release-v5.0.1.ps1` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/run-release-v5.0.ps1` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/run-tauri.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/set-calendar-release.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/stability-v3.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/trace-v26.22-retained.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/v4.3-verifier-entry.ts` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-calendar-history.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-calendar-layout-contract.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-calendar-milestone.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-release-package.ps1` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-template-catalog.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.01-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.01-visual-roundtrip.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.01.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.02-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.02.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.03-history.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.03-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.03-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.03.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.04-history.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.04-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.04-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.04.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.05-history.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.05-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.05-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.05.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.06-history.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.06-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.06-layout-contract.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.06-template-output.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.06-visual-graph.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.06-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.06.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.07-headless.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.07-history.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.07-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.07-layout-contract.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.07-networking.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.07-process-regression.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.07-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.07.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.08-headless.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.08-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.08-platform-input.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.08-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.09-headless.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.09-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.09-runtime-performance.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.09-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.10-headless.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.10-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.10-readiness.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.10-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.11-input-prompts.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.11-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.11-project-locks.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.11-templates.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.11-visual-roundtrip.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.12-api-signatures.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.12-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.12-code-game.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.12-language-editor.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.12-language.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.12-release-tooling.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.12-script-modules.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.12-script-ui.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.12-syntax-slots.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.12-typed-graphs.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.12-visual-game.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.13-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.13-focus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.13-layout.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.13-panel-accessibility.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.13-panel-controls.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.13-panels.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.13-project-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.13-project-departure.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.13-projection.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.13-studio-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.13-studio-drafts.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.13-studio-layout.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.13-workspace-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.13-workspaces.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.14-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.14-blueprint-handlers.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.14-enemy-family.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.14-family-runtime-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.14-focus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.14-native-tests.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.14-ownership.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.14-project-roundtrip.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.14-runtime-stage.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-asset-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-asset-layout.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-assets.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-audit-attachments.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-batches.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-focus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-headless-diagnostics.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-library-metadata.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-native-consumer-guards.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-renderer-native-guards.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-renderer.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-rendering-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-rendering-native-consumer.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-resource-handlers.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-sprites.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-template-library.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-template-ui-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-template-ui.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-tiled.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.15-web-export.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.16-animation-audio.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.16-animation-authoring-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.16-animation-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.16-animation-ui.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.16-audio-pcm.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.16-audit-bundle.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.16-audit-context.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.16-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.16-focus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.16-interface-pixels.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.16-interface-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.16-interface.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.16-media-layout.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.16-media-performance.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.16-media-roundtrip.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.16-menu-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.16-save-recovery.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.16-timeline-actions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.17-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.17-bindings.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.17-focus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.17-navigation.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.17-physics-export-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.17-physics-operations-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.17-physics-world-layout.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.17-physics-world-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.17-queries.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.17-world-roundtrip.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.17-world-streaming.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.18-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.18-focus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.18-network-export-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.18-network-layout.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.18-network-process.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.18-network-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.18-networking.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.19-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.19-delivery-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.19-delivery.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.19-focus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.19-lsp.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.19-package-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.19-reproducibility.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.19-save-recovery.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.20-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.20-delivery-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.20-delivery.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.20-focus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.20-lsp.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.20-menu-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.20-package-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.20-palettes-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.20-quality-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.20-renderer.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.20-reproducibility.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.20-save-recovery.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.20-template-library.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.20-template-output.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.21-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.21-delivery-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.21-delivery.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.21-focus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.21-foundations-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.21-foundations.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.21-hierarchy-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.21-layout-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.21-lsp.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.21-menu-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.21-package-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.21-palettes-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.21-quality-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.21-renderer.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.21-reproducibility.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.21-save-recovery.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.21-template-library.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.21-template-output.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-advanced-inspector-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-asset-import-corpus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-asset-library-operations.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-audio-draft-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-audio-import-boundaries.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-audit-dispositions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-audit-reporting.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-authoring-actions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-automation-actions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-component-history.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-component-order.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-component-primitives.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-connection-corpus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-connection-draft-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-control-order.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-delivery-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-delivery.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-device-render-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-document-boundaries.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-entity-api.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-event-draft-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-event-validation.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-focus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-foundations-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-foundations.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-graph-actions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-hierarchy-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-history-core.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-identity.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-import-input-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-joint-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-layout-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-lsp.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-manifest-corpus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-material-corpus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-material-graph-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-media-field-corpus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-media-history.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-menu-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-metadata-corpus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-nested-component-corpus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-numeric-expressions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-operation-coverage.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-operation-dispositions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-operation-linking.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-operational-metadata-actions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-package-lifecycle.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-package-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-palettes-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-particle-draft-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-path-draft-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-path-drafts.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-pending-drafts.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-playback-stability-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-presentation-numeric-layout.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-property-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-property-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-quality-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-reference-ownership.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-renderer.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-rendering-recovery.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-repair-actions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-reproducibility.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-resource-actions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-runtime-input-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-save-recovery.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-scene-ownership.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-scene-prefab-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-script-assets-corpus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-settings-input-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-studio-playback-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-studio-save-boundary.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-template-library.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-template-output.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-tilemap-bake.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-transactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.22-ui-theme-corpus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.23-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.23-delivery-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.23-delivery.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.23-focus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.23-idle-resume.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.23-inventory-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.23-language.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.23-launcher-advanced-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.23-lsp.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.23-property-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.23-renderer.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.23-reproducibility.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.23-runtime-regressions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.23-save-recovery.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.23-shell-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.23-static-host-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.23-template-library.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.23-template-output.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-asset-window.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-binding-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-bottom-dock.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-creator-delivery-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-diagnostics-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-ecosystem-audit-status.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-evidence-status-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-focus.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-graph-equivalence.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-graph-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-inventory-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-language-service-lifecycle.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-large-graph-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-linked-save.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-package-mirror.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-project-archive-bounds.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-regressions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-renderer.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-report-writing.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-retained-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-runtime-regressions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-static-host-user.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-structural-localization.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-studio-authoring.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v26.24-template-output.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v3.1.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v3.2.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v3.3.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v3.4.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v3.5.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v3.6.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v3.7.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v3.8-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v3.8.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v3.9-cli.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v3.9-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v3.9.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.1-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.1.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.2-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.2.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.3-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.3.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.4-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.4.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.5-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.5.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.6-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.6.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.7-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.7.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.8-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.8.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.9-reference-ci.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.9-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.9.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v4.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v5.0-reference-ci.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v5.0-reproducibility.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v5.0-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v5.0.1-reference-ci.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v5.0.1-reproducibility.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v5.0.1-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v5.0.1.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v5.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v5.2.0-graphs.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v5.3.0-graphs.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v5.4.0-gameplay.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v5.5.0-rendering.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v5.6.0-production.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v5.7.0-worlds.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v5.8.0-networking.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v5.9.0-ecosystem.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.0.0-creator.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.0.1-game.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.0.2-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.0.2-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.0.2.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.0.3-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.0.3-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.0.3.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.0.4-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.0.4-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.0.4.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.1.0-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.1.0-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.1.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.2.0-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.2.0-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.2.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.3.0-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.3.0-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.3.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.4.0-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.4.0-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.4.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.5.0-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.5.0-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.5.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.6.0-headless.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.6.0-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.6.0-networking.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.6.0-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.7.0-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.7.0-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.7.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.8.0-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.8.0-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.8.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.9.0-clean-source.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.9.0-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.9.0-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v6.9.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v7.0.0-clean-source.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v7.0.0-history.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v7.0.0-interactions.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v7.0.0-windows.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `scripts/verify-v7.0.0.mjs` | 命令行、生成或验证工具：由包命令或对应版本流程调用，函数说明位于源码。 |
| `src-tauri/.gitignore` | 原生宿主构建、权限或应用配置，按 Tauri 工具链读取。 |
| `src-tauri/build.rs` | 原生桌面宿主源码：实现系统交互、命令及播放器集成；中文说明位于源码。 |
| `src-tauri/capabilities/default.json` | 原生宿主构建、权限或应用配置，按 Tauri 工具链读取。 |
| `src-tauri/Cargo.lock` | 原生宿主构建、权限或应用配置，按 Tauri 工具链读取。 |
| `src-tauri/Cargo.toml` | 原生宿主构建、权限或应用配置，按 Tauri 工具链读取。 |
| `src-tauri/icons/128x128.png` | 原生应用图标资源：用于窗口、安装程序及操作系统显示，二进制内容保持原样。 |
| `src-tauri/icons/128x128@2x.png` | 原生应用图标资源：用于窗口、安装程序及操作系统显示，二进制内容保持原样。 |
| `src-tauri/icons/32x32.png` | 原生应用图标资源：用于窗口、安装程序及操作系统显示，二进制内容保持原样。 |
| `src-tauri/icons/icon.icns` | 原生应用图标资源：用于窗口、安装程序及操作系统显示，二进制内容保持原样。 |
| `src-tauri/icons/icon.ico` | 原生应用图标资源：用于窗口、安装程序及操作系统显示，二进制内容保持原样。 |
| `src-tauri/icons/icon.png` | 原生应用图标资源：用于窗口、安装程序及操作系统显示，二进制内容保持原样。 |
| `src-tauri/icons/Square107x107Logo.png` | 原生应用图标资源：用于窗口、安装程序及操作系统显示，二进制内容保持原样。 |
| `src-tauri/icons/Square142x142Logo.png` | 原生应用图标资源：用于窗口、安装程序及操作系统显示，二进制内容保持原样。 |
| `src-tauri/icons/Square150x150Logo.png` | 原生应用图标资源：用于窗口、安装程序及操作系统显示，二进制内容保持原样。 |
| `src-tauri/icons/Square284x284Logo.png` | 原生应用图标资源：用于窗口、安装程序及操作系统显示，二进制内容保持原样。 |
| `src-tauri/icons/Square30x30Logo.png` | 原生应用图标资源：用于窗口、安装程序及操作系统显示，二进制内容保持原样。 |
| `src-tauri/icons/Square310x310Logo.png` | 原生应用图标资源：用于窗口、安装程序及操作系统显示，二进制内容保持原样。 |
| `src-tauri/icons/Square44x44Logo.png` | 原生应用图标资源：用于窗口、安装程序及操作系统显示，二进制内容保持原样。 |
| `src-tauri/icons/Square71x71Logo.png` | 原生应用图标资源：用于窗口、安装程序及操作系统显示，二进制内容保持原样。 |
| `src-tauri/icons/Square89x89Logo.png` | 原生应用图标资源：用于窗口、安装程序及操作系统显示，二进制内容保持原样。 |
| `src-tauri/icons/StoreLogo.png` | 原生应用图标资源：用于窗口、安装程序及操作系统显示，二进制内容保持原样。 |
| `src-tauri/src/lib.rs` | 原生桌面宿主源码：实现系统交互、命令及播放器集成；中文说明位于源码。 |
| `src-tauri/src/main.rs` | 原生桌面宿主源码：实现系统交互、命令及播放器集成；中文说明位于源码。 |
| `src-tauri/tauri.conf.json` | 原生宿主构建、权限或应用配置，按 Tauri 工具链读取。 |
| `src-tauri/windows-app-manifest.xml` | 原生宿主构建、权限或应用配置，按 Tauri 工具链读取。 |
| `src/App.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/assets/assetBatch.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/AssetDatabase.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/assetFrameAnimation.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/assetGraph.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/assetPixels.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/assetProduction.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/assetReferences.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/assetWorkflowCopy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/contentHash.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/contentInteroperability.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/contentInteroperability.worker.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/contentLibrary26.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/derivedSprites.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/derivedSpriteTexture.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/editorReadability.css` | 编辑器共享样式：控制界面呈现，不改变项目内容。 |
| `src/assets/icons/addLayer.svg` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/icons/arrow.svg` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/icons/color.svg` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/icons/layers.svg` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/icons/pictures.svg` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/icons/play.svg` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/icons/render.svg` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/icons/reset.svg` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/icons/scene.svg` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/icons/settings.svg` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/icons/stop.svg` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/import.worker.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/importPipeline.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/importProfiles.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/importRetention.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/interchangeAuthoring.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/interchangeBindings.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/localizationDependencies.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/main.css` | 编辑器共享样式：控制界面呈现，不改变项目内容。 |
| `src/assets/projectFolder.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/template-previews/animation-lab.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/audio-lab.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/billiards-break.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/breakout.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/checkpoint-sprint.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/coin-trail.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/collision-lab.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/domino-cascade.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/empty.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/friction-ramp.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/gravity-fountain.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/grid-chase.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/hazard-crossing.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/lighting-starter.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/mouse-knockout.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/neon-garden.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/networked-optional.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/orbit-dodge.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/orbit-gallery.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/particle-fireworks.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/particle-lab.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/pendulum-row.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/physics-cleanup.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/physics-sandbox.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/platformer.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/pong.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/pyramid-stack.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/rain-room.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/rendering-lab.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/responsive-ui.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/restitution-gallery.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/shape-poster.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/slalom-run.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/snake.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/sprite-wall.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/starfield.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/target-circuit.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/tile-world.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/top-down.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/template-previews/ui-showcase.png` | 界面图形资产：由组件或入口引用，外观及资源字节保持原样。 |
| `src/assets/TextureAtlas.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/tiledInterchange.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/tiledMapAssets.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/assets/types.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/components/AccessibilityEvidencePanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ActionBar.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/AndroidDeliveryPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/AnimationPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/AssetImagePreview.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/AudioSystemPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/AutomationStudio.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/BuildSettingsPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/CommandPalette.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ConfigPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ConfirmDialog.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ConnectionBuilder.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ConsolePanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ContentAssetInspector.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ContextMenu.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/CreateObjectPalette.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/CreatorLearningCenter.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/CreatorOnboarding.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/DeviceInputPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/EcosystemStudioPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/EditorBottomPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/EditorFeedback.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ErrorRecovery.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/EventSheetEditor.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ExternalChangeDialog.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/GameplayComponentsInspector.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/GraphProductionPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ImportedAssetBindings.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/LayerBar.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/LimitNumberInput.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ManageWorkspace.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ManualViewer.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/MaterialGraphEditor.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/NetworkStudioPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/NumericExpressionInput.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ObjectBlueprintEditor.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ObjectOwnershipPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/PackageManagerPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/PanelMaximizeButton.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/PanelResizeHandle.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ParticleGraphEditor.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/PathTextInput.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/PhysicsRuntimePanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/PhysicsSettingsPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/PluginSettings.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/PresentationPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ProfilerPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ProjectHealthPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ProjectManager.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/RecoveryCenter.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/RenderingPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/RuntimeComponentsInspector.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/SaveDataSettings.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/SceneSideBar.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/SceneTabs.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ScriptConversionPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ScriptStudio.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ScriptWorkspace.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ShortcutEditor.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/SimulationStatusPanel17.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/StudioDraftConflict.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/StudioStatusDialog.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/TeamWorkflowPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/TilemapPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/TimelineButtonAction.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/ToolBar.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/UiScenePreview.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/UndoHistoryPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/VirtualControlsOverlay.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/VisualGraphEditor.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/WorkspaceBar.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/WorkspaceManager.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/WorldCanvas.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/WorldComponentsInspector.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/components/WorldToolsPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/editor/animationAuthoring.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/animationAuthoringCopy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/animationPreviewSession.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/animationStudioState.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/audioAudition.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/audioAuthoringCopy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/authoring2d.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/commands.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/componentPalette.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/deliveryLabels19.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/ecosystemAuditSummary.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/eventSheetDraftValidation.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/formLayoutCopy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/gizmo.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/graphApiCopy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/graphDiagnosticCopy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/graphLegacyCopy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/graphStandardApiCopy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/graphStandardApiLongCopy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/graphSyntaxCopy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/interfaceCopy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/lightInspectorCopy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/modalFocus.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/networkForm18.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/networkLabels18.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/objectAuthorNavigation.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/objectBlueprintAuthoring.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/objectBlueprintFields.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/objectCallbackLocation.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/objectOwnershipCopy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/objectProvenance.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/objectProvenanceModel.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/panelAuthoringGuards.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/panelControlCopy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/panelLayout.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/pathTextDraft.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/pendingDrafts.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/projectDepartureCopy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/projectDepartureGuard.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/propertyMetadata.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/sceneAuthoring.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/scriptApi.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/scriptConversionPresentation.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/scriptIndexPersistence.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/scriptLanguage.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/scriptLanguage.worker.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/scriptLanguage26.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/scriptLanguageSyntax.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/scriptStudioState.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/scriptTemplates.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/selection.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/selectValueDetails.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/semanticMergeCommand.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/shortcuts.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/simulationForm17.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/simulationLabels17.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/studioDraftRetention.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/studioLayoutCopy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/studioPaneLayout.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/studioSaveBoundary.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/tiledMapAuthoring.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/timelineUiActionCopy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/transientPopover.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/editor/workspaces.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/i18n.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/layout/EditorLayout.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/layout/SideBar.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/layout/StatusBar.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/layout/TopBar.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/main.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/panels/RendererPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/panels/ScenePanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/panels/SettingsPanel.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/player.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/PlayerApp.vue` | Vue 界面组件：模板描述界面，脚本实现交互，样式控制布局；中文说明位于文件与函数旁。 |
| `src/projects/projectArchive.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/projects/projectData.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/projects/projectFormat.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/projects/projectManager.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/projects/projectManifest.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/projects/projectPreflight.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/projects/projectSession.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/projects/templateCatalog26_11.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/projects/templateDiscovery.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/projects/templateGuides.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/projects/templates.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/cameraMath.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/Canvas2DRenderer.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/capabilities.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/geometry.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/index.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/lighting2d.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/materialGraph.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/materials.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/outputQuality20.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/particleGraph.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/renderGraph.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/renderOptimization.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/renderSettings.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/renderSettingsCopy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/renderTextures.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/sceneRenderer.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/surfaceLimits.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/textureContent.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/types.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/renderer/WebGL2Renderer.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/accessibilityEvidence.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/aiTools.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/animation.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/animationProduction.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/audio.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/audioBuffers.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/buildSettings.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/cinematicProduction.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/controlRegistry.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/crashReporter.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/creatorLearning.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/creatorQualification.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/dataResources.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/deliveryPipeline.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/deviceInput.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/dynamicInspection.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/dynamicObjects.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/ecosystemShipping.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/editorAutomation.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/editorFeedback.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/editorWindow.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/entityLifetimes.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/eventSheets.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/exportTemplates.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/extensionEcosystem.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/externalLinks.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/faultCenter.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/featureLifecycle.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/gameExporter.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/gameFlow.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/gameplayComponents.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/GameplayRuntime.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/gameUi.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/input.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/inputModality.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/jobScheduler.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/jobScheduler.worker.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/largeWorldPerformance.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/localization.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/mediaClock.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/mediaProduction26.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/mobileDelivery.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/navigation2d.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/navigationGeometry.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/networking.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/networkInput.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/networkProduction.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/networkProtocol.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/networkReplay.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/networkRollback.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/networkServices.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/novaPak.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/objectBlueprints.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/objectComposition.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/objectFamilyLesson.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/objectPool.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/openManual.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/packages.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/particles.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/performanceTools.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/physics2d.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/physicsDebug.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/physicsGeometry.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/physicsMonitor.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/physicsProduction.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/platformGapRegister.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/platformSupport.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/plugins.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/prefabs.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/presentation.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/production.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/productionRuntime.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/productionValidation.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/profiler.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/projectExternalChanges.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/projectIntegrity.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/projectMutationRouter.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/projectTransactions.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/projectTrash.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/projectUpgrade.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/recovery.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/releaseEngineering.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/replay.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/resources.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/rigging.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/runtimeSceneStreaming.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/runtimeSceneTransition.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/saveGame.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/sceneInstances.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/scriptContracts.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/scriptCoverage.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/scriptDebug.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/scriptHotReload.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/scriptModules.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/scriptSettings.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/scriptTestExecution.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/shipping.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/simulationAuthoring26.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/stableContracts.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/stableCreatorPlatform.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/streamLifecycle.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/support.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/teamWorkflow.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/testRunner.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/tilemap.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/tileSceneRuntime.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/time.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/timeline.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/timelineUiActions.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/uiAccessibility.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/uiImageTint.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/uiLayout.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/uiNativeInput.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/uiProduction.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/uiTextLayout.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/uiTextPresentation.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/uiTheme.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/webArchive.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/webExportCopy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/worldGameplay.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/runtime/worldStreaming.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/store/colorPalettes.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/store/dialog.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/store/editor.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/store/physics.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/store/preferences.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/graphCatalog.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/graphCodeSync.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/graphCompiler.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/graphDebugger.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/graphEditorGeometry.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/graphInteraction.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/graphLayout.worker.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/graphLayoutEngine.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/graphLayoutService.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/graphMeasurements.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/graphProduction.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/graphStudioState.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/graphSyntax.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/graphSyntaxApi.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/graphSyntaxSchema.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/graphTypes.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/graphWireEditing.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/rhaiApiSignatures.generated.json` | 前端配套数据或生成清单：按所属模块消费，严格格式使用本索引作中文说明。 |
| `src/visual/rhaiApiSignatures.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/rhaiRename.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/rhaiSyntax.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/rhaiSyntaxLexer.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/visual/rhaiSyntaxTypes.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/vite-env.d.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/BoxEntity.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/Camera.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/CircleEntity.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/componentEnums.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/componentPrimitiveTypes.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/componentRegistry.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/components.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/componentValidation.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/compoundGeometry.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/Connection.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/Entity.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/geometry.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/hierarchy.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/identity.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/layers.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/SceneManager.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/Transform.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/TriangleEntity.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/types.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `src/world/World.ts` | TypeScript 编辑器或运行时模块：按所属目录组织状态、数据和行为，中文说明位于文件与函数旁。 |
| `templates/package-authoring/manifest.json` | 模板创作资料：用于创建示例项目或包；严格清单保留原始数据结构。 |
| `templates/package-authoring/package.test.mjs` | 模板创作资料：用于创建示例项目或包；严格清单保留原始数据结构。 |
| `templates/package-authoring/README.md` | 模板创作资料：用于创建示例项目或包；严格清单保留原始数据结构。 |
| `tests/fixtures/migrations/public-schema-expected.json` | 测试夹具或配置：作为固定输入、预期输出或安全边界样本，不能当作产品通过证明。 |
| `tests/fixtures/migrations/public-schema-inputs.json` | 测试夹具或配置：作为固定输入、预期输出或安全边界样本，不能当作产品通过证明。 |
| `tests/fixtures/scripting/api-v1-contract.json` | 测试夹具或配置：作为固定输入、预期输出或安全边界样本，不能当作产品通过证明。 |
| `tests/fixtures/scripting/api-v2-contract.json` | 测试夹具或配置：作为固定输入、预期输出或安全边界样本，不能当作产品通过证明。 |
| `tests/fixtures/scripting/headless-fail.rhai` | Rhai 测试输入：包含正常或预期失败场景，按测试标记运行。 |
| `tests/fixtures/scripting/headless-pass.rhai` | Rhai 测试输入：包含正常或预期失败场景，按测试标记运行。 |
| `tests/fixtures/scripting/v4.6-failure/deliberate-failure.rhai` | Rhai 测试输入：包含正常或预期失败场景，按测试标记运行。 |
| `tests/fixtures/scripting/v4.6/pass.rhai` | Rhai 测试输入：包含正常或预期失败场景，按测试标记运行。 |
| `tests/fixtures/v1_1_2_project.json` | 测试夹具或配置：作为固定输入、预期输出或安全边界样本，不能当作产品通过证明。 |
| `tsconfig.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `tsconfig.node.json` | 仓库或工具链配置：控制依赖、编译、格式及文件规则，按原格式读取。 |
| `vite.config.ts` | 自有配套资源或配置：由仓库构建和运行流程引用，使用本索引保存中文文件级说明。 |
