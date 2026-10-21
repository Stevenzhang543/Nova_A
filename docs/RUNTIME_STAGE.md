# Isolated26.14 runtime development

Integration notice: this historical development journal retains staged paths, intermediate failures and pending-at-the-time findings. Its reviewed authored files are integrated into the26.14 candidate after26.13 was separately finalized. Copied Cargo/support trees, scratch typecheck-stage.mjs and generated stage outputs were excluded. Current behavior and final evidence boundaries are in 26.14 release notes; executed-gate records determine production qualification.

This directory is a development overlay, not a qualified release. All changes are staged beneath `.cache/development-v26.14`; they must be merged against the eventual26.13 source before integration. `base-sources.json` records the fifteen original runtime/store/entity/Rust/CLI/validation source copies and hashes. The scratch Cargo workspace intentionally retains baseline26.12.0 metadata; it is not a version authority or release artifact. No active source, WASM package, native release binary or qualification report is overwritten by these stage checks.

## Consequences reviewed and exact edit ledger

| Staged path | Exact changes and consequences |
| --- | --- |
| `src/runtime/eventSheets.ts` | Resolves inherited handlers with actual source sheet and logic asset provenance; distinguishes event kind, case-sensitive selector and callback; additive inheritance keeps distinct authors while explicit overrides replace only matching inherited callbacks. Missing/cyclic/deeper-than64 chains fail closed; handlers are bounded to10,000. Callback discovery uses real module-level parser declarations and the production use resolver, excluding comments, strings and receiver-only methods. Adds destroy/task event kinds and explicit callback-family metadata. Inherited-only sheets resolve their nearest valid logic author; attachment validates before creating/changing Script2D and rejects invalid local logic or missing modules. Existing ambiguous duplicate handlers may now produce explicit diagnostics instead of silently hiding another callback. |
| `src/runtime/objectComposition.ts` (new) | Pure preflight resolves required component dependencies and exclusions before mutation; rejects Transform exclusion, contradictions, conflicting controllers and connection-only Rope creation. Creates fresh default components for required additions and applies an already validated plan. Existing child composition is preserved. |
| `src/runtime/objectBlueprints.ts` | Bounded inheritance fails closed; validates finite placement and inherited event sheets; instantiates without early selection/invalidation, prepares all root component plans before applying them, records prefab overrides and selects only roots. Failure removes only newly created entities/connections. Guided object creation is grouped in one history transaction, checks event save/attachment results and cancels on failure. Generated Rhai string literals escape the authored object name. The coordinated GUI addition validates unsaved documents using an injected current-asset reader in both chain traversal and merged composition, preserving asset/document identity without writing or normalizing drafts. Creation/instantiation also stores entity-level blueprint identity for static roots. |
| `src/runtime/GameplayRuntime.ts` | Runs inherited callbacks using their actual author's script and independent per-entity/per-script properties; deduplicates signal/event/connection callbacks by author and callback. Retains compiled source/raw graph/module document snapshots during Play so unqueued edits cannot bypass reload policy. Processes queued reloads while paused, uses exact drafts and pinned unchanged dependencies, checks project/dependent policy again at apply, and prepares one complete replacement VM plus all primary/inherited property transfers. A failed dependent compile leaves every live cache/instance intact and frees the candidate; success commits once and discards paused commands from replaced programs. Adds actual script/visual suite execution with shared teardown helper. Structural queues are drained as bounded snapshots so nested commands survive for the next boundary. Despawn is deferred; retiring entities cancel timers/tasks, pending targeted signals and debugger work. Pool release invokes destruction cleanup before reset; session setup provides simulation clock and lifetime generations to Rust. |
| `src/runtime/prefabs.ts` | User-audit follow-up: separates pure readPrefabOverrides from explicit normalization/capture. Inspector comparison and conflict reporting use the detached authoring snapshot without assigning reactive prefabOverrides, preventing their computed views from invalidating each other indefinitely. Explicit editing capture keeps its original persistence behavior. The actual module regression performs25 repeated reads with an override-setter trap, preserving override identity, unnormalized NaN, world connections/selection and asset bytes. |
| `src/projects/projectData.ts` | Actual save/reopen follow-up: decode prefab source through the existing byte decoder and strict UTF-8 before JSON validation, accepting established raw, percent-encoded and base64 assets. Malformed encoding/JSON remains an error. Component identity and unknown-kind checks still visit every serialized record; composition conflicts/dependencies consider only records whose removed flag is not true, matching runtime tombstone semantics. Disabled but present components remain part of authored composition. |
| `crates/nova_format/src/lib.rs` | Actual open follow-up: adds the twelve existing gameplay kinds (GridMover2D, PlatformController2D, TopDownController2D, Health2D, DamageHitbox2D, Collectible2D, Projectile2D, Spawner2D, Cooldown2D, Lifetime2D, MouseFollower2D, CameraFollow2D) to the explicit native/WASM project allowlist. Adds a real migrate/serialize/deserialize/validate regression preserving component data and rejecting an unknown future kind. No schema/version authority change is intended; this leaf was refreshed from the current26.13 baseline before editing. |
| `scripts/verify-v26.14-project-roundtrip.mjs` (new) | Loads actual production authoring, derived-blueprint, prefab, asset, serializer, validator and hydrator modules through a canonical Vite SSR overlay; browser background history timers are deferred in the Node host. Runs the actual staged WASM format boundary. Five groups cover quick creation/derived instance/export override persistence, raw/percent/base64/malformed prefab bytes, all40 published templates, every stable component kind/unknown rejection, and removed-versus-active composition. This is programmer evidence; it does not replace visible file-picker/download checks. |
| `tests/fixtures/migrations/public-schema-{inputs,expected}.json` (copied test support) | Two unmodified historical format fixtures required by the isolated Rust format test build. These copies are not integration edits. |
| `src/runtime/scriptHotReload.ts` | A rejected plan cannot be downgraded to restart-required by later export checks. Rollback stores the previous raw graph document when supplied, preserving graph serialization. Adds peek/complete rollback lifecycle so persistence failure, disabled apply or rejected compilation cannot consume the previous committed history entry. |
| `src/runtime/scriptTestExecution.ts` (new) | A suite compiles in an isolated VM, runs before_all/after_all once, runs before_each/after_each per case, preserves teardown after failures and frees the VM in finally, including compile failure. Skip-only suites allocate no VM. Tests receive cloned case contexts; limits are checked between callbacks alongside real VM operation limits. |
| `src/runtime/time.ts` | Timer/task generations invalidate already prepared callbacks when canceled/replaced/paused or when their entity/session is cleared. Rejects invalid requests; bounds timer count10,000 and frame callbacks4,096/64 per timer. Long repeats carry remaining debt to a later frame. Adds detached timer/task inspection; GameplayRuntime now uses the same expiration dispatch for ordinary frames and paused single-step. |
| `src/runtime/entityLifetimes.ts` (new) | Process-monotonic32-bit generations are assigned per entity lifetime and keyed by Vue's raw entity identity. Retirement disables handle resolution; pooled reuse receives a new generation. Exhaustion fails explicitly. The inspector uses a separate readonly lookup that does not create a generation. |
| `src/runtime/dynamicObjects.ts` | Scene snapshots expose current generations and omit retired entities. Direct handles require the current lifetime; resolved pending handles also carry their target lifetime, so pooled reuse cannot revive a prior pending handle. Existing target mutation validation is shared by code and visual command execution. |
| `src/runtime/objectPool.ts` | Inactive prewarmed entities are retired; acquisition starts a new lifetime and records simulation time. Release excludes the object from recursive release/acquire until cleanup finishes, restores transform/physics or full serialized state as configured, retires every member even if cleanup fails, and reports the error after consistent cleanup. Runtime hooks run destruction before reset and clear tasks/lifecycle state. Preparing pools prunes registrations whose owner or actual member objects no longer exist after scene replacement, then recomputes active counts. |
| `src/runtime/runtimeSceneTransition.ts` (new) | Detaches/decodes a candidate scene, checks entity/connection identities and remaps stored numeric anchors to newly allocated IDs. Preserves actual persistent Entity objects and their descendants, IDs and lifetime generations, detaching persistent roots from outgoing parents with world transform retained. Commit rejects changed live entity/connection identities or target scene documents and restores old world object references, scene identity/navigation and view settings after installation failure. Failed preflight may consume monotonic allocation IDs; it cannot reuse an old ID or hydrate project metadata/assets. |
| `src/store/physics.ts` | Runtime load/reload now use the prepared scene-only transaction, replacing the old whole-project reload plus serialized persistent-object recreation. Removes the now-unused persistence capture/restore helpers and hierarchy import. Adds a shared authoring-data serializer body and detached readEntityAuthoringData accessor; normal serializeEntity retains its original normalization behavior. Runtime view commit/rollback updates scene layers/settings/selection without reloading assets, save namespaces, plugins or project metadata. Serializes/hydrates entity-level blueprint identity, migrates missing legacy values from Script2D, honors explicit null and synchronizes its component mirror; live/stored asset counting, replacement and clearing include static blueprint references. |
| `src/world/Entity.ts` | Adds nullable objectBlueprintAsset metadata independently of Script2D. A valid static object can retain blueprint provenance without receiving an excluded or unwanted script component. |
| `src/runtime/worldGameplay.ts` | Optional-package initialization accepts a current-session predicate and checks it after await before installing signals/prewarming pools. GameplayRuntime supplies a generation guard for session start and accepted scene changes; Stop invalidates pending initializations. Existing callers without a predicate retain prior behavior. |
| `crates/nova_script/src/lib.rs` | Additive defaulted context invocationId/entityGenerations/callbackKind and scene generation fields preserve legacy deserialization. Entity handles/query readers use supplied generations; legacy contexts retain hashed generations. Pending spawn IDs include callback invocation identity. Explicit event family dispatch passes task/timer/signal/update/contact arguments to custom callbacks while preserving existing zero-argument custom handlers. Adds actual compiler function_names discovery without executing module statements. Adds four native regressions and updates the old pending-ID expectation. |
| `crates/nova_script/examples/nova_script_test.rs` | Native CLI compiles a suite once, runs before_all/after_all once, clones initialized properties for each case/retry, always attempts case teardown after setup/body failure and reports suite cleanup failures separately. Actual Rhai AST functions drive discovery; comment/string masking prevents false metadata attachment. Compile errors remain machine-readable failed entries. Adds actual callback-count suite evidence and reports only observed callback-entry coverage; retries still require explicit infrastructure metadata. The existing fixture=name field is a report label, not a filesystem fixture loader. |
| `scripts/typecheck-stage.mjs` (new) | TypeScript compiler host overlays staged modules onto canonical source paths and performs a no-output check; imported production dependencies remain real. Final checks retain the project's original unused-local/parameter settings rather than suppressing them. |
| `scripts/verify-v26.14-runtime-stage.mjs` (new) | Vite SSR overlay loads actual runtime methods and real asset/entity/component/parser/compiler modules, with unrelated host boundaries isolated. Covers inheritance, authored script dispatch, paused/invalid/disabled reload, signal dedup, callback discovery, suite teardown, visual tests, composition rollback, timer cancellation/bounds, lifetime rejection and pool expiry/reentrancy/failure cleanup. Canonical Windows module IDs prevent accidental duplicate singleton fixtures. Writes ignored reports with explicit native/WASM backend and host limitations. |
| `crates/nova_script/examples/runtime_bridge.rs` (new, test support) | Reads one JSON request from stdin and executes/validates it using the staged real Rust VM, emitting a JSON result/error. Enables actual bridge tests without rebuilding frozen WASM. Does not replace the shipped CLI. |
| `scripts/verify-v26.14-native-tests.mjs` (new) | Executes the actual staged CLI against generated source fixtures, checking initialized-state isolation, cleanup failures, failed setup, skipped suites, actual compiler discovery, compile errors and explicit retry attempts. Writes per-case/report/coverage evidence only under stage/reports. |
| `Cargo.toml`, `crates/nova_script/Cargo.toml`, `Cargo.lock` (test support) | Initially a single-crate workspace, then expanded to a copied baseline workspace/lock for real WASM verification. The script crate retains its isolated-test description. Build products stay in stage/target; these files must not overwrite workspace authorities. |
| `nova_core/{Cargo.toml,src/**}` and `crates/{nova_math,nova_physics,nova_runtime,nova_format,nova_wasm}/{Cargo.toml,src/**}` (copied test support) | Baseline source/manifests required to build the actual nova_wasm boundary against staged script/format crates. The nova_format/src/lib.rs exception is explicitly listed above and must be integrated; the remaining copies are unmodified test dependencies, not integration replacements. |
| `base-sources.json` (new, stage manifest) | Original file identity/hashes for later merge review. |
| `docs/RUNTIME_STAGE.md` (new) | This consequence/edit ledger, reproducible checks, achieved scope and remaining work. |

## Executed evidence

The isolated TypeScript overlay passed after the final runtime edits, including the project's unused-code checks. Native Rust passed28 tests, including four new lifetime/custom-callback regressions. The runtime integration suite passed44 checks with the actual staged Rust bridge and44 with the separately compiled staged WASM. The native CLI passed8 behavioral groups. Additional final checks cover draft inheritance cycles/composition/missing-prefab/identity validation without writes, static blueprint save/reload, legacy migration and live/stored asset replacement/clearing. Scene checks load the actual physics store, World, SceneManager and entity decoder: malformed/stale preparation, a deliberately injected late installation failure, runtime timer/cleanup preservation, persistent identity/descendant retention and outgoing destruction before incoming awake/start. The native example recompiles source per subprocess request; persistent AST cache atomicity is covered by the real Rust unit test and the staged WASM transaction, not inferred from the JavaScript cache adapter. Reports contain actual backend/timestamps and fixture limits.

Commands:

```powershell
cargo build --manifest-path .cache/development-v26.14/Cargo.toml --target-dir .cache/development-v26.14/target --offline -p nova_script --example runtime_bridge
node .cache/development-v26.14/scripts/typecheck-stage.mjs
node .cache/development-v26.14/scripts/verify-v26.14-runtime-stage.mjs --native
node .cache/development-v26.14/scripts/verify-v26.14-runtime-stage.mjs --staged-wasm
node .cache/development-v26.14/scripts/verify-v26.14-native-tests.mjs
cargo fmt --manifest-path .cache/development-v26.14/Cargo.toml -p nova_script --check
```

The staged WASM was built offline from the copied actual nova_wasm workspace. wasm-pack compiled Rust successfully but could not access its cached wrapper tool under sandbox permissions; the verified existing wasm-bindgen0.2.126 CLI then generated stage/wasm wrappers directly, without download/install. No production WASM package changed. The earlier active26.12-WASM23-check report is historical and cannot cover the new context ABI. Some first fixture drafts used inline export annotations, reserved shared, unavailable assert or task_start; the real VM rejected them and fixtures were corrected to valid Rhai/host calls. An initial workspace-wide cargo fmt invocation found no selected targets after expansion; the explicit -p nova_script format/check then passed.

Further GameplayRuntime edits since the initial ledger: generations now accompany both delayed command sources and queued removals, so recycled pooled IDs cannot execute older work; explicit destruction-spawn commands remain allowed through cleanup. Outgoing destruction runs after a successful scene commit, against outgoing read context, before incoming awake/start. No failure path runs destruction or removes timers. Cleanup bypasses suspension at text/graph breakpoints so commands cannot be stranded on removed objects. Stop invalidates pending optional initialization, clears authored/current state and frees its VM. inspectObjectRuntime returns detached authored entity/property baselines, current primary/inherited properties, active declared subscriptions and timers, without compilation or normalization. Re-entering an active session preserves its baseline. Rollback history is consumed only on successful apply; a dependent root whose raw document did not change rejects the misleading no-op rollback and instructs the user to roll back the changed imported module instead.

The later save/open correction passed42 native nova_format tests (including the new twelve-kind roundtrip and all historical schema fixtures), five actual project roundtrip groups, strict stage TypeScript and the existing44 runtime checks against freshly rebuilt stage WASM. The first isolated format test build correctly failed because its historical include_str fixtures had not been copied; the two exact test inputs were then copied and the full suite passed. Initial Node fixture failures used the wrong blank template ID and lacked browser history timers; those fixture errors were corrected before passing evidence. A broader template roundtrip then reproduced and fixed the removed-body Canvas conflict described above. The actual user-facing download/reopen rerun remains owned by the UI audit.

## Remaining work before26.14 completion

- Large-project replacement-cache time/memory still need measured limits and integration qualification. Imported-module rollback is initiated on the changed module's history entry; arbitrary simultaneous rollback of several independent asset documents is not implemented.
- Actual editor Play/Stop restoration, enemy-family ownership workflows, full pool/scene/network teardown and packaged export behavior require integrated GUI/reference checks. Nested awake/spawn waves, stale source/removal generations, task cancellation and stop teardown are covered by the staged suite.
- Before_all wall time and long single-callback cancellation remain constrained by VM operation limits. Native coverage records directly invoked callbacks, not every nested helper execution or branch. Metadata annotations retain the established line-before-function convention; fixture=name does not load external files.
- Explicit blueprint instance override editing, detailed provenance/ownership UI and complete reference-game/export checks belong to integration work. Initial composition tests use a controlled prefab factory/history boundary; the subsequent five-group project roundtrip suite also executes real quick creation, derived instantiation, complete serialization and WASM validation with only background browser timers deferred.
- Copied test dependency sources and generated wasm/target/compiled/reports directories must not be promoted as release authorities. Build the integrated26.14 native/WASM/export artifacts afresh after version and source gates.
- Generation values are runtime-local; persistent handles across separate player processes are not a supported save format. Optional-package cancellation and pruning disconnected pool registrations need actual package-enabled integration coverage beyond the focused runtime fixtures.
- No global claim of zero defects, public-network qualification, full GUI audit or release readiness follows from these isolated tests.

## Final UI dispatch repair and portable qualification harnesses

The actual enemy-family browser flow exposed duplicate UI Event Sheet execution. Before the repair, invokeUiCallback ran the sheet immediately with an empty event and queued ui.* for a second execution. GameplayRuntime now dispatches Event Sheet UI handlers only at the normal queued signal boundary with name/payload/source. Legacy named button functions still run immediately; their author/callback provenance is retained on the queued signal so matching event/connection paths cannot call them twice. When the UI Event Sheet owns the primary same-named callback, only its signal-family invocation runs. The canonical on_signal callback likewise is not invoked without event data.

Every additional edit: GameplayRuntime adds the signal's delivered-callback metadata and seeded deduplication, changes invokeUiCallback as described, and passes the metadata through dispatchSignals. The runtime-stage verifier adds two actual VM regressions: inherited/full-payload/legacy connection deduplication, and a same-name three-argument UI callback. The original path reproduced both defects; the repaired implementation passed46 native and46 actual WASM groups plus strict TypeScript. An initial test used unsupported entity_id(); it was corrected to validate real event payload.entity/source consistency before passing evidence. The runtime callback source hash at handoff is5069cb8ae60c2b1cd3fbbc5764192aa0105d0edd4abce26e7c020b2910f0f8ef. Actual UI rerun remains separately recorded by the UI audit.

The three qualification scripts now support isolated and promoted layouts:
- New scripts/lib/runtimeAudit14.mjs detects the script-root package.json, reports the actual package engineVersion and sourceMode, selects ignored compiled outputs and release reports, and performs a fresh offline cargo build for the requested allowlisted native example with windowsHide.
- verify-v26.14-runtime-stage.mjs uses .cache/verification-v26.14/runtime-compiled-{native,wasm} after promotion, root nova_core/pkg WASM, and explicitly builds root runtime_bridge for --native. It writes release-audits/v26.14-runtime-{native,wasm}.json. Stage reports keep their established names.
- verify-v26.14-native-tests.mjs freshly builds the actual root nova_script_test example after promotion, writes release-audits/v26.14-native-tests.json, and retains source/JSON/coverage fixtures under release-audits/v26.14-native-test-fixtures. This fixture directory and the report identify the actual execution inputs.
- verify-v26.14-project-roundtrip.mjs uses the integrated root WASM, ignored .cache/verification-v26.14/project-roundtrip-compiled and release-audits/v26.14-project-roundtrip.json after promotion. It includes actual metadata/status.
- The shared path helper was exercised with temporary integrated and isolated layouts plus rejection of an unsupported native example name. Following the path changes, stage native runtime46, CLI8 and project roundtrip5 groups passed, with fresh native example builds. Promoted full execution remains a release-gate responsibility.

Promote these authored scripts/helper and the authored Rust example sources; do not promote the copied support Cargo workspace or generated stage target/wasm/compiled files. The actual user audit has since confirmed quick-family download/reopen and reference migration work; its final full restart/completion results belong to its separately generated report.

## Reactive pool membership repair

Actual user restart auditing found that prepareObjectPools compared raw prefab entities to Vue-proxied live entities. A real reactive-world regression reproduced an unnecessary second prewarm allocation on the second prepare. objectPool.ts now records the raw owner identity and compares raw owner/member identities via Vue toRaw, matching entityLifetimes. Reusable allocation lookup also checks actual owner identity and prefab; release rejects an unrelated replacement object even if its UUID matches. This preserves valid reactive leases without reviving removed/replaced entities or old generations.

The runtime-stage verifier adds the exact Vue reactive-world acquire/release(proxy)/reuse sequence: one allocation remains one, reusedCount reaches2, generation changes, and a same-UUID foreign object cannot release the original. Actual removal invalidates the allocation. All47 native and47 staged WASM groups plus strict TypeScript passed after the repair. GameplayRuntime did not change in this repair; only objectPool.ts, runtime-stage verifier and this ledger changed. The UI audit owns the real enemy-family restart rerun.

## Synchronous prewarm and enforced spawn capacity

The final actual reference trace showed initial entity IDs11–18 and replacement19–26: beginWorldGameplay awaited unrelated optional AI preparation before prewarming, while start() immediately spawned with autoExpand=false. worldGameplay.ts now installs pool signals and prewarms synchronously before its optional await, with isCurrent checked both before setup and after await. ObjectPool is already a reviewed local module; async AI loading remains guarded.

Every additional edit: objectPool.ts exports hasObjectPool; dynamicObjects.ts refuses configured-pool fallback allocation when no lease is available; GameplayRuntime applies the same policy to legacy pending prefab spawns. A missing pool owner still permits ordinary prefab instantiation. autoExpand can create only within capacity. Runtime-stage adds actual command-path tests for disabled expansion, full capacity, allowed expansion and unrelated prefab fallback. Project-roundtrip adds real worldGameplay/pool/packages/component entries and an actual enabled-package/prefab test proving immediate prewarm, first/repeated reuse and no deferred reinitialization after Stop.

Final checks pass48 native runtime groups,48 actual staged WASM runtime groups,6 real project/package/prefab roundtrip groups and strict TypeScript. The existing8 native CLI groups remain passed. GameplayRuntime final source SHA256 is0dca6a61e08c7641d60449c179728762a55c85ee5191993c8ec2e87552279718. These programmer checks do not replace the separately recorded final browser restart workflow.

## 2026-10-06 增强主指令：真实阶段核验与连续切片

本节是当前进度与证据，以上 26.14 内容保留为历史。完整读取了根目录 `Nova_A_Engine_Runtime_Player_Overhaul_Prompt_Expanded.md` 第 1–1894 行，包括原技术资料和新增 35–68 节；文件 SHA256 为 `6fb979cbb88f3c77372159ebb6ffd65d4228d5c30226f41135e0fec460b5bb12`。原 0–34 节前缀 86218 bytes、SHA256 `d1f7ace283bd983ad78c15811211f330a65be7a0d6aad46473ac593932c1efa6` 已另存并核对。主指令和 AGENTS 未修改。本轮没有新增发行版本，原 `releases/v26.37` 保持原样。

起点为 `main` / commit `82c9c03118848df1c07af323c38a3abade7dd21b`；起始已跟踪文件无改动，AGENTS 和增强主指令为用户未跟踪文件。原源码归档及工具链/锁文件/设备事实在 `.cache/engine-overhaul/baseline/`。锁定 Node 22.22.2、pnpm 10.30.0、Rust/Cargo 1.92.0、wasm-pack 0.14.0；没有升级依赖或锁文件。安装的硬件资料不等于实际 rendering context 的证据。

### M0–M8 与第 65 节 X0–X6：出口尚未整体通过

| 阶段 | 已核实/已实施切片 | 必需剩余项，不以切片通过代替出口 |
|---|---|---|
| M0 + X0 | VERIFIED：原源码/工具链/普通 WASM 可复现记录；CPU、rAF、API submission、GPU/display 延迟分开；冻结舒适底线 | 正式 B0–B8、X01–X15、H1/H2 内容与五次长样本尚未完成；现有短 smoke 不充当正式基线 |
| M1 | VERIFIED FOR CORE：Renderer 后端 13 模块/117615 bytes 图没有 Vue/Editor；纯 Coordinator/队列/job 图通过；World 的实际服务注入图190/35违规模块→18/0，原加载循环已消除；性能观测 core 默认 plain state | Gameplay 和旧 Player 仍可达 store/Vue/AssetDatabase；Renderer frontend 的新局部纯图不等于全 M1；独立 exports/project references/类型源码边界、纯 Player/Tauri capability 分离尚未完成 |
| M2 + X1 | VERIFIED FOR SLICE：live Rhai private Scope、共享只读 phase、同阶段自写入查询一致；真实借用 WASM state 立即复制到拥有的缓存；统一资源/compute 重任务准入、五级队列、依赖提升、公平性、取消/epoch/字节边界 | Rust 尚不拥有完整实体 arena、层级与非物理 Transform；结构/组件/动画/存档所有 writer 迁移、版本化编辑事务与低频订阅尚未完成 |
| M3 + X1/X2 | VERIFIED FOR SLICE：快速 down/up 边缘不丢、补算只消费一次、取消独立 Worker、串行真实 task 后备；实际 Input/Gameplay/WASM 的 receipt/consumption identity 与隐藏/恢复22项通过；默认补算4、250ms与保持既有世界的时钟reset通过；冻结A1产物真实CDP键盘/文本焦点/hidden-resume9项通过 | 正常运行仍为 single-thread-compat；worker-engine、worker-simulation、受控 Transferable frame 池仍需完成；未测输入到屏幕光子的延迟 |
| M4 + X2/X3 | VERIFIED FOR SLICE：静态文字不再逐帧上传、普通 camera 不清 TileMap chunk cache、保守裁剪、GPU query 上限/采样；GPU completion credits 默认 2，允许 1/2/3，device epoch 与有界恢复；生产默认Sprite/Particle/TileChunk instancing的软件和实际硬件各11项通过 | RenderGraph 资源生命周期、Worker DOM-free 前端、全资源上传背压/预算、真正有收益的并行曲线尚未完成；private GPU64不是Frame64/Sprite80传输ABI |
| M5 + X4 | 复用既有二维功能、Comfortable tokens 与 Motion System；新策略面板实际 16px/44px 控件、持久设置和 Reduced Motion 已做短 GUI 检查 | 不能由既有功能清单宣称完整二维能力评分通过；全部 X 工作流、列表虚拟化/FLIP/blur 成本与无 Editor 泄漏到 Player 尚未验收 |
| M6 + X3 | WebGL2 仍为基线；没有假装默认开启 WebGPU | NOT PRESENT：真正 WebGPU device/WGSL/render backend；跨后端图像/limits/loss/导出与生产自动优选均未完成 |
| M7 + X5 | IMPLEMENTED/短运行 VERIFIED：单一辅助政策、设备偏好、独立 optimized-profiling 产物及源码/WASM 哈希；场景 renderScale/particleScale 保持 1 | 独立最小原生 Player、Web Player 依赖隔离、匹配 manifest/资源包、Windows/Linux 导出运行、测量驱动质量自适应与 GPU 调优缓存尚未完成 |
| M8 + X6 | 各切片原始数据/失败与回归分开记录 | NOT_TESTED：正式 10s warm-up + 120s × 5、30min、H2、Tauri/Linux、真实高刷新率/物理 DPI、实际 input-to-photon；不存在“整轮通过”结论 |

当前 TS/Rust 所有权事实：Authoring 文档、活动实体集合/父子关系/非物理 Transform、组件与生命周期调度仍由 TS 现有系统处理；Rust 拥有 solver 积分和 Rhai AST/private Scope。WASM RuntimeEntity/RuntimeScene 目前只是元数据定义，没有装载完整 entity arena 的生产桥。solver body handle 不能充当新 index+generation+worldEpoch。World 插值仍写到旧 TS 呈现对象，必须在后续权威迁移中分开并保护现有 update 查询顺序。不能把新增读取投影称为第二个权威世界，也不能把旧投影称为 Rust 已全面权威。

### 逐文件修改账本（根集成者）

| 文件 | 实际修改、原因与影响 |
|---|---|
| `src/runtime/performance/coordinator.ts`（新增） | 纯 V1 配置/不可变预算、全局与 owner 并发/字节租约、模式/epoch、1s 压力窗口和迟滞；Comfortable 底线固定。观察到的辅助任务重叠只是准入提示，不证明 CPU 因果或 GPU 瓶颈，不改变场景质量。 |
| `src/runtime/performance/workScheduler.ts`（新增） | 真实有限五级队列、依赖提升/失败传播、软 deadline、公平性、读写冲突、取消及终态；正在停止的任务保留租约；包含准备/排队/执行与合并/总 wall 的有界 trace。 |
| `src/runtime/performance/services.ts`（新增） | 单一纯 Coordinator 与队列实例；平台只注入 hardwareConcurrency 提示，不假装物理核心或空闲核心测量。 |
| `src/runtime/performance/byteBounds.ts`（新增） | 有界 payload/result 图的保守字节估计，用于防止大结果在 return clone 前失控；不是精确 JS heap/显存测量。 |
| `src/runtime/performance/pressureFeed.ts`（新增） | 接现有 Owner 观察回调，1s/最多600样本、hidden/长间隔清窗口、幂等取消；无新增 RAF/定时循环；未知 input queue/GPU 保持 null。 |
| `src/runtime/jobScheduler.ts` | 从 Vue/项目设置/Editor 指标解耦，实际 jobs 进入共享准入；独立 Worker 取消/超时先停止再归还额度，latest revision/epoch 在 merge 前校验；merge 在租约内计时，零 helper 有真实串行后备。追加已确认关联问题：revision key 限2048且保护活跃引用，旧显式generation不得回退新revision，已终态handle迟到cancel不得使后续job失效；created Workers 与 active Worker jobs 分开诊断。 |
| `src/runtime/jobScheduler.worker.ts` | 回传真实本地执行时间，并在 structured clone 回主线程前验证结果字节上限；保留七类现有算法和输入语义。 |
| `src/assets/importPipeline.ts` | 移除独立 import FIFO/并发额度，实际文件读取/哈希/解码进入共享 asset owner；不可中断 I/O 未结束时不提前释放；project session 清理取消旧 auxiliary tasks 并推进 epoch。512MiB 既有资源限制保留。 |
| `src/runtime/dataResources.ts` | CSV/JSON 的真实规范化/校验通过纯 merge 在同一租约内处理；authoring commit 仍在原调用者。 |
| `src/editor/jobSchedulerAdapter.ts`（新增） | Editor 独有 Vue 设置观察、reactive 展示与指标桥接；卸载清理，不把这些依赖放回纯队列。 |
| `src/editor/performanceTraceAdapter.ts`（新增） | Play 一次捕获 Authoring contentHash、固定质量签名、当前策略和有界任务 trace；仅诊断构建开放。实际 adapterUsedByRenderingContext 未测时为 null；probe device 不冒充实际 GPU。 |
| `src/platform/performanceHost.ts`（新增） | 独立设备配置持久化/visibility；最新切片去掉对LargeWorld/Vue的硬引用，由入口注入现有帧观察、预算发布和活动订阅；hidden优先，恢复最新活动状态；部分安装失败/卸载清理。两条profiling track明确选择，不用URL静默改普通偏好。实际play/interactive已接；loading/export/recovery生产Owner尚未全部接。 |
| `src/components/PerformancePolicyPanel.vue`（新增） | 真正挂在 Profiler Jobs，六项设置、资源诊断与三语言文案，共享 UiPropertyRow/16px/44px 控件。修复真实GUI发现的标题黏连和父scoped card覆盖：显式header gap12/wrap、20px内距、16px轮廓、8px gutter；冻结A1产物在常规/540宽/125%条件下已复验几何。 |
| `src/components/ProfilerPanel.vue` | job state 改由 Editor adapter 提供，实际插入新策略组件。另有测量标签/采样更新，见 UI agent 账本与验证文件。 |
| `src/store/physics.ts` | 新增只读 Authoring 基准来源 getter，避免使用运行中的坐标改变 contentHash；新项目及缺省补算上限改为4，显式保存的旧值不被改写。 |
| `src/runtime/engineTiming.ts`（新增） | 单一纯默认补算4与frame delta上限250ms，非有限/负delta为0；不调整fixed timestep、solver substeps或迭代画质。 |
| `src/runtime/time.ts` | 使用共享delta校验，保留现有媒体/Runtime时钟语义。 |
| `src/runtime/physicsProduction.ts` | Balanced preset的默认catch-up为4；Accurate及显式profile值保留。 |
| `src/runtime/physicsMonitor.ts` | 缺省诊断预算改为相同4，避免显示与实际默认不一致。 |
| `src/projects/templates.ts` | 新建内置项目的global catch-up缺省4；不改已有用户项目或旧发行参考文件。 |
| `src/main.ts` | 首先安装Editor性能state adapter，再安装Host、Editor jobs和opt-in trace；Host注入现有FrameOwner和play状态watch；HMR分别销毁订阅，无第二帧时钟。 |
| `src/player.ts` | 现有Vue兼容Player通过纯安装口包装同一性能对象，并注入相同FrameOwner/play状态；没有新增Player→Editor import。旧入口本来就带Vue/Editor store，仍不是独立纯Player。 |
| `src/world/World.ts` | 去掉AssetDatabase、TileMap具体Owner和PhysicsMonitor导入；每世界绑定WorldHostServices，原生产factory注入同一资源/投影/诊断Owner。缺失必需tile服务明确报错；修复投影producer失败提前提交signature造成空碰撞缓存的关联缺陷。Native缓存/owner映射仅成功后提交。 |
| `src/store/physics.ts`（WorldHost追加） | 唯一现有生产World由createEditorWorld工厂创建并注入原服务；保留同一个rawWorld、资源generation/材质/诊断/Tile缓存语义，不新增运行世界。 |
| `src/world/sceneOwnership.ts`（新增）、`src/world/Entity.ts`、`src/editor/sceneAuthoring.ts` | 将原EntityOwnership/RuntimePersistencePolicy两个union原样下沉world共享类型；Entity不再类型引用Editor，旧Editor出口re-export保留API。序列化值、默认值、组件和行为不变。 |
| `src/runtime/largeWorldPerformance.ts`（plain-state追加）、`src/editor/performanceStateAdapter.ts`（新增） | Runtime默认plain对象；首个Host可一次包装原始targets并发布ESM live bindings，Editor使用Vue reactive；不复制状态、队列、观察者或时钟。旧响应式发布节奏与历史数据保留。 |
| `scripts/collect-engine-baseline.mjs`（新增） | 不覆盖 baseline 的环境/源码/主指令前缀/锁文件收集器；保护原已提交归档和用户文件。 |
| `scripts/verify-engine-scheduler.mjs`（新增） | 实际纯生产模块图和可控 clock/Worker 状态机测试；新增 deadline、expiry、真实 pressure feed 清理。测试早期失败是错误消息匹配和窗口边界建模，保留实际生产拒绝，不移除断言。 |
| `scripts/verify-engine-asset-admission.mjs`（新增） | 实际 import/jobs 共用额度、不可中断 I/O 取消、session/merge/byte bounds，控制 Worker/FileReader 仅作逻辑宿主。 |
| `scripts/verify-v26.09-runtime-performance.mjs` | 原回归 fixture 明确注入8逻辑线程提示，移除重复 module query 造成的两份 singleton；没有改算法期望、取消/回收断言或冻结性能分母。 |
| `scripts/build-engine-profile.mjs`（新增） | 单独optimized-profiling构建、sourceHash/buildId、WASM/glue与输出清单；构建前后源必须一致；最新产物已带真实Rollup module/imports/chunks/renderedLength图，自身构建脚本也纳入sourceHash。文件数按各冻结manifest记录。 |
| `scripts/lib/browserUserAudit.mjs` | 显式选择 workspace 内诊断产物目录并记录，旧 default dist/输入行为/软件渲染与断言保留；coverage 使用相同目录，防止观察旧 dist。 |
| `scripts/audit-engine-boundaries.mjs`（新增） | 对实际源码导入图与Player emitted chunks分别审查并给可复现违规链；核对buildId/sourceHash和graph hash，完整边界不合格返回失败，不把目录移动或tree-shaking当通过。A1冻结产物正式返回NOT_PASSED，失败保留。 |
| `scripts/verify-engine-platform-host.mjs`（新增） | 7项真实SSR/平台Host/纯graph验证：服务可选、无额外帧、hidden/活动恢复、清理、部分安装失败、持久化与质量底线。可控平台不是独立Player/实际GPU验收。 |
| `scripts/verify-engine-observability-state.mjs`（新增） | 6项实际纯生产graph/默认plain/同raw target/ESM live/Vue watch/重装与reset验证；无复制观测状态。 |
| `package.json` | 仅补充已存在的可运行 engine profile/audit/verify commands；版本、依赖与锁不变。 |
| 本文 `docs/RUNTIME_STAGE.md` | 记录事实、逐文件影响、关联项、证据和未达出口；不改主指令和历史进度来放宽标准。 |

Renderer当前23个路径、初始/切片前后SHA、风险和关联项在 `release-audits/engine-renderer-handoff-20261006/ledger-instancing.json`；初期credits证据另保留 `ledger-credit.json`。Runtime首切片在 `.cache/engine-runtime/runtime-slice-handoff.json`，Input/Gameplay观测追加在 `.cache/engine-runtime/input-observation-handoff.json`，Rust/World时钟追加在 `release-audits/engine-runtime-timing-final-20261006/ledger.json`；最新WorldHost6路径、前后生产graph/错误和§30/64在 `.cache/engine-runtime/world-host-handoff.json`（SHA `77d421544b398c98e5275e6eb946e815e7c9420f62a3ff59855b1e18dda8cd01`）。旧切片hash保留原配对含义，不冒充当前源码；当前普通优化WASM为 `165830a5cfa68a1186a4782799fd11a4e4361da066294a2ab6b425bd525562c9`，glue为 `ee9af7b01217bceb8511636a5773c7860a455a089246b5accf095fcf44fbe924`，d.ts为 `4d7106d2682ecb5ab68eacd1844dc66db029a532023ea8701150551e82cd0f7a`。

### 已运行的证据与限制

- `pnpm check`：World/frontend/plain-state和脚本Core/facade的最新整合类型检查通过；其间eventSheets未使用导入的失败已修复，公开re-export保留。首产物 `engine-profile-ab81648f6dcd2badfe42` 的冻结manifest在 `.cache/engine-overhaul/short-smoke/profile-build-manifest.json`；第二产物 `engine-profile-a1d59d87a1ee47344a33` 共554源/271产物、22.98s，冻结manifest/module graph在 `.cache/engine-overhaul/boundaries-a1d59/`。第二产物包含Input/clock/instancing/header，尚不含之后Host注入、World/frontend/plain-state。大型shared chunk与dynamic/static警告保留。
- 实际A1生产边界检查NOT_PASSED：Runtime26、Renderer frontend22、Player40导入图违规，Player已输出模块36违规；原始调用链在 `.cache/engine-overhaul/boundaries-a1d59/production-boundaries.json`。新World/frontend单入口局部迁移不代替下一整合产物完整gate。
- WorldHost：12/12专用验证，原bindings18/queries9/world-streaming16业务断言不变通过；Gameplay10/timing8回归通过。原直接加载 `World→AssetDatabase→graph/plugins→store→new World` 的TDZ已消除，实际Rollup值导入190/35违规→18/0；types/project引用边界与纯Player仍另验。
- 平台Host：7/7，`.cache/engine-overhaul/platform-host-functional.json`；plain性能state：6/6，`.cache/engine-observability-state.json`。后者使用真实Vue代理同raw对象并验证live bindings/watch，不把响应式复制进纯生产graph。
- `node scripts/verify-engine-scheduler.mjs`：25/25，`.cache/engine-overhaul/scheduler-functional.json`；`verify-engine-asset-admission.mjs`：6/6；保留26.09 scheduler 回归通过。可控宿主逻辑证据，不是混合吞吐或正式 X 性能。
- Runtime：37 Rust script / 1 WASM crate；15 input / 7 live VM / 11 phase / 10 实际 Gameplay+Rust fixed / 12 实际 state-view。report和源码配对在 `.cache/engine-runtime/`。同500实体×50callback单次smoke，world records 25000→500、跨界世界上下文字节4741350→102178、完整局部wall152.68→44.08ms；这是单次，不是 B4 或 FPS。
- 2026-10-06最终普通WASM追加：Input/Gameplay observation 22/22，旧Input15/15与Gameplay10/10回归；新clock10 native与8 actual optimized WASM/World、借用视图旧12/12。隐藏期间实际Rust time/checksum/脚本steps/TSelapsed不推进，resume不补旧key pulse；现有Audio diagnostics暂停/恢复已查，扬声器输出与真实AudioContext激活仍NOT_TESTED。
- `cargo test --workspace --all-targets --locked`：195/195，包括format49、math2、physics96、runtime10、script37、wasm1。末输出chunk在 `.cache/engine-overhaul/rust-workspace-terminal.log`，明确不是完整stdout首段。此项是原生测试，不替代浏览器WASM/Worker/平台验收。
- State view：每100体×10双读，旧 bridge 20次输入分配/896000 bytes冗余JS→WASM，新为0，实际立即 owned `.set` copy仍存在；不能叫 GPU 零复制。100体冷sample旧0.4818ms/新0.7844ms，冷wall没有提升；冻结500体、每API10 warm-up、5组AB/BA各100双读的均值旧3.00916/new1.34928ms。完整顺序和未删样本在 `state-view-abba-ledger.json`，只证明局部已暖 micro smoke。
- Renderer：软件16/16；真正 Renderer.gl 为 NVIDIA RTX5060 Laptop/D3D11、Edge147.0.3912.72 的硬件功能smoke16/16；原冻结20/27图像10/10；pure core生产图通过。原始 report 在 `release-audits/engine-renderer-{credit-ledger-final,credit-hardware-ledger-final,retained-final,core-final-ledger}-20261006/`。硬件driver/query事实不意味着正式H1、Tauri或显示呈现验证。
- Sprite instancing最终软件11/11、同真实NVIDIA context硬件11/11；混合geometry/custom材质/blend/filter/multi-camera/AA4/post的精确像素差0。受控同10k sprites、两路draw均1，上传1520000→640000bytes（-57.9%）；6 warm/12交替短sample完整Renderer CPU中位4.5→1.7ms、p95 6.7→4.4ms。不是整帧FPS，也不是正式B1。使用最终ledger/report，保留修前失败和fixture隔离错误的记录，不挑早期更好的sample。
- 观察链：18/18纯/真实宿主，9/9 actual WorldCanvas render-body、10/10真实runFrame/Input/Gameplay/WASM契约，在 `.cache/engine-observability-{verification,presentation,input}.json`；Input/CPU world API提交仅匹配当帧消费identity，idle/unmapped/text/paused/resize不复用旧receipt，GPU/display未知保持null。旧capture2仅legacy可读，新capture3跨schema/track不比较。
- 真实编辑器软件GUI：`.cache/engine-overhaul/short-smoke/` 两轨各1s warm/3s sample/1run，同contentHash/qualitySignature/buildId，各8样本，无溢出；只能证明接线，不能冒充120s×5。`.cache/engine-overhaul/ui-smoke/` 原始布局/截图与12项输入/偏好/缩放/Reduced Motion/活动动画归零检查。DPR1、public scale100%和125%；物理DPI未知，根zoom1。Header/panel旧样式缺陷被如实记录并修复待下一产物复验。该冻结产物不包含后来 pressureFeed、header、instancing或input identity 变更。

### 第30/64节关联清单：本切片与后续必需项

| 关联修改 | 已处理 | 当前不适用/明确尚未处理 |
|---|---|---|
| Coordinator/五级队列/计算助手 | Editor与兼容Player配置注入、实际资源与parse/hash jobs、字节/依赖/公平性/取消、纯Editor指标桥、真实merge、持久偏好、诊断 | Engine/native/save/build/audio等Owner尚未全部接入；helper真实净收益曲线、native CPU semaphore、Transferable pool尚未实现；必需项不降为可选 |
| 脚本快照/状态/借用WASM | 同phase只读索引、self写入子孙query、原target flush顺序、liveScope迁移、坏包/epoch/generation、异常private状态、memory grow/Vec重排/clear与owned copy | 少量callback JSON/注册仍存在；动画/timeline直接writer采用显式safe-point刷新保障旧行为；Rust合并fixed脚本批次与全权威arena尚未完成 |
| Renderer core/提交credits | 设置schema与注入资源/事件、epoch/loss/有界恢复、query清理、GPUfence真task完成、旧surface/overlay/backing resize配对、gamepad输入独立采样 | 旧 direct beginFrame 只作untracked工具兼容；Worker/Offscreen、完整Frame64/Sprite80、resourceRenderGraph/WebGPU/资源包/Player能力边界未开始生产接线 |
| 批处理/atlas | 现有语义与冻图保留，普通sprite instancing切片另测UV/pivot/flip/order/material/filter/mixedgeometry/AA/post/loss | 没改资源持久格式或atlas导入；传输Sprite80和private GPU64不同，不互称ABI已通过 |
| 指标/日志/自适应 | CPU/rAF/API提交明确定义与UI标签、capture3/旧reader、版本/模式分轨、bounded opt-in raw exporter、未测null；移除旧CPU时间推测场景降质；当帧consumed input identity到实际API提交链已通过真实WASM和整合编辑器验证 | GPU query与每帧identity完整对应、显示呈现与输入到光子仍未测；AdaptiveExperience仅同一政策准入，本阶段不冒充已测画质自适应 |
| 舒适UI/动效/可见性 | 新控件真实16/44/12、20字段gap，scale125%等效20/55/15，持久ReducedMotion/系统设置、实际tab活动清零；全局文字/spacing/motion没有降低 | 全X04/X05/blur/FLIP/长列表/音频/隐藏恢复与空闲功耗尚未综合验收；现有coremotion复用不等于全部新的性能工程完成 |
| 构建/发行/平台 | 普通release WASM配对、独立profile产物/manifest/源码固定、真实后端软件与硬件功能证据、旧release保护 | baseline/SIMD/threaded多变体未同时交付；Windows独立TauriPlayer/Linux/正式Web独立边界/包及本轮发行资格均未达到 |

所有未达出口保留为必需工作。后续按同一M/X顺序推进并使用单独可归因产物；不能将本节理解为任务已完成或批准降低正式采样/门槛。

### 追加整合证据：4304产物与源码类型边界

第三个冻结产物 `engine-profile-4304a046bf66d3f39077`（完整sourceHash `4304a046bf66d3f39077e926ba734537e006853ce1809a3722b762d8630de768`）包含557源文件、271输出，构建21.08s。它包含World/场景前端/平台Host服务注入、plain性能state及Editor同raw对象包装，但不包含之后的ScriptServices/Core迁移与启动计时修正。完整产物保存在 `.cache/engine-overhaul/profile-dist-4304a/`；冻结manifest、compiled graph与严格失败报告在 `.cache/engine-overhaul/boundaries-4304a/`。

实际完整生产gate仍NOT_PASSED：Runtime26、Player40、Player输出模块36违规；Renderer frontend从22变为0。独立前端图143模块/22违规降为26/0，证明该入口的值依赖已隔离，不证明全Runtime/Player、Lighting、Tile/Particles/Rigging具体Owner或package exports已隔离。软件前端14/14通过；同实际NVIDIA context硬件13/14：唯一严格失败是原旧路径自身连续MSAA重复绘制也不稳定，old/new首次比较为0差异。失败、draw/上传/resolve追踪与未确认原因保存在 `release-audits/engine-renderer-frontend-slice-20261006/ledger.json`。未放宽像素容差、未把driver原因写成已证实，也未因该问题改生产GPU策略。

4304真实编辑器集成12/12在 `.cache/engine-overhaul/final-m1-attempt3/`，配对证据在 `profile-final-m1-evidence.json`：原参考内容11实体/41组件，Play前后保持，实际dirty transform从0变2；有效Space输入到World CPU/API提交观察为436.90ms，其他idle/未映射/text/paused/恢复帧为null。436.90ms是软件后端单次观察，不是正式低延迟门槛通过。实际WebGL2/SwiftShader、single-thread-compat、baseline WASM、DPR1；物理DPI、GPU执行与显示呈现未知。策略面板16px/44px、padding20/radius16/gutter8/header gap12、根zoom1，布局没有为了性能缩回。

使用computer-use浏览器在1280×720前台另验证Play/Stop及Test Hash/JSON：两个真实作业完成后active/queued/辅助活动额度和内存预约归零。截图 `in-app-ui-smoke/playing-jobs.jpg`、`stopped-policy.jpg` 和 `observations.json` 同属4304。此测试用独立临时Platformer项目9实体/33组件，与前述11/41参考项目不同，不能互作A/B视觉或性能样本；没有新录屏、GPU时间、input-to-photon或物理DPI证据。

A1后续Reduced Motion归零严格检查存在未解决失败：默认、重复诊断和有界paint-progress诊断均保留，其中paint诊断11/12。观测到浏览器document.timeline与performance.now进度差和CSS状态，但环境starvation只是HYPOTHESIS，尚不能断言应用无资源泄漏，也不能将历史首产物12项通过外推为当前全部动效验收。证据在 `.cache/engine-overhaul/input-ui-smoke-attempt3/` 与 `profile-input-slice-evidence.json`。正式高刷新率/前台连续动效与X04/X05仍未验收。

根集成者随后对 `SceneRendererEnvironment.ts` 的Tile/Skin签名使用同一world/renderer共享类型，`sceneRenderer.ts` 使用对应服务ReturnType，删掉指向Tile/Rigging具体实现的type-only依赖；不改绘制算法、数据或Owner。新 `scripts/audit-engine-source-boundaries.mjs` 使用锁定TS resolver遍历源代码import/export/import-type（包括被擦除的类型引用），World、Renderer core/frontend、Coordinator、jobs、事件reader、观察core及Host的源导入通过。Runtime core、兼容composition、旧Player仍失败；禁用边缘保留真实调用链并停止向下遍历，因此其违规边缘数不能与完整Rollup模块数比较。报告 `.cache/engine-overhaul/source-boundaries.json`。CSS资产、外部库内部、ambient declarations、package exports与项目引用是明确的额外验收范围。生产gate `audit-engine-boundaries.mjs` 追加Core和兼容入口双图，兼容层的Editor可达关系仍参与失败判断，没有用文件移动掩盖耦合。

前台检查还CONFIRMED旧“coldStartupMs”从模块求值一直计到首个Host frame，把人在启动页等待计入；旧“warmStartupMs”实际为含idle等待的workspace预取。真实process/cold/warm/Ready/first-pixel计时尚不可用。该关联修正在现有观察/Profiler和文案模块中实施；不得沿用旧名称比较，也不得把缺测填0。最新ScriptServices/计时修正和实际Worker串并行总wall结果需用下一冻结产物分别记录，不能归到4304。

### 追加整合证据：f775脚本服务与启动指标

`engine-profile-f775e0807d5c3090f8fc`（sourceHash `f775e0807d5c3090f8fce091083b5e401df74a7285fb3ab1ad2ab30bff25200c`）为独立optimized-profiling产物，561源/271输出、20.09s，源码构建前后一致。当前输出 `.cache/engine-overhaul/profile-dist/`；固定manifest/module graph及两类边界报告在 `.cache/engine-overhaul/boundaries-f775e/`。最新完整类型检查通过，日志 `check-script-startup-source.log`，完整构建日志 `build-script-startup-source.log`。现有普通优化WASM/glue配对未改变，版本仍26.37；没有覆盖已有发行或宣称新发行资格。

严格生产边界仍NOT_PASSED：Runtime core25、兼容composition26、Player40、Player输出模块36；Renderer frontend为0。源码边界另包含类型引用，纯入口通过，Runtime/compat/Player仍失败；两者遍历口径不同，不以违规边缘数推算迁移百分比。脚本Core仍有store、Editor analyzer、共享调试与其他Owner耦合，不能把唯一实现迁移和目录读口注入称为完整M1。

唯一Gameplay实现位于 `src/runtime/GameplayRuntimeCore.ts`；旧 `GameplayRuntime.ts` 是注入原Editor ScriptServices的薄兼容入口，保留类名、默认构造、单例、类型及DEFAULT_SCRIPT_SOURCE公开出口。新增 `scriptServices.ts` 为每实例只读目录/文本/revision/module identity/visual compiler以及显式可选作者写入能力；`editor/gameplayScriptServices.ts` 委托原AssetDatabase和断点metadata Owner，不复制资源目录。事件parser/继承dispatch原算法迁到唯一 `eventSheetReader.ts`，原 `eventSheets.ts` 创建/保存/校验入口委托，旧公共出口保留。22个历史审计/验证源码reader改为真实Core位置，事件常量reader改为真实reader位置；原业务判定不变。

实际原源码/WASM与新源码对照before9/9、after21/21；旧modules20、events5、Gameplay10、Input observation22、timing8回归通过。保留旧v26.02静态UI字符串2项、v26.03静态UI字符串1项失败，使用保存的旧Gameplay/Event和原断言重放得到相同结果，没有修改GUI或放宽断言。旧v26.14/27混合宿主大套未在此切片运行，旧VM fixture缺少当前instance/phase接口，不能算通过。Root审查另确认新readonly catalog缺counter Owner时hitCondition≥2的能力缺口：每次+1没有保存；原Editor Owner路径正确。该缺口记录为需单独修复的DebugOwner能力，不外推为完整只读Player debugger已支持。

启动/采样修正11/11、原观测18/18、plain-state6/6通过，证据 `.cache/engine-overhaul/startup-window-source/` 和 `.cache/engine-observability-state.json`。`largeWorldPerformance.ts` 将真实cold/warm保持null，并分别记录moduleToFirstHostFrameWallMs与workspacePrefetchWallMs；旧recordWarmStartup入口保留但明确只记录预取wall。reset不重新开始模块生命周期，也不把缺测写0。`observability.ts` 600容量与 `profiler.ts` 240汇总容量共用明确常量，采样/发布/保留历史语义没有改。`performanceTools.ts` 新capture4加入独立startup-observation-v1及采样范围，v2/v3可读，Frame schema和预算分母不变；旧startup数据仅保留为legacy，不能升级成已测真实启动。`profilerMeasurementCopy.ts`、`ProfilerPanel.vue` 和i18n三语言明确窗口、记录与发布节奏，未测值不附ms；没有修改布局token或Motion System。真实GUI/capture4导出待对f775产物定向验证。

环境切换后普通exec在进程创建阶段报apply deny-read ACLs，旧类型检查session丢失；没有把中断记为PASS。仅对仓库范围必要读/check/build经自动审查恢复执行，未改ACL、权限或安全配置，原主指令与AGENTS哈希再次相同。串并行成本样本安排在类型检查/构建/gate全部结束之后，避免编译竞争混入收益；它仍是短探索，不是正式B/X/H基准。

### 追加：真实 Worker 总成本与按证据选择执行器

Worker 探索产物为独立 `engine-job-exploration-a95075e7cfe3b7bee364`，不是整合 Editor f775/4304。七个生产算法/调度/服务源输入严格匹配4304，其他实际136模块导入图逐项记录当前hash（四个非target源已变化）；采样期间全部输入一致。宿主为Windows x64、Edge147.0.3912.72，hardwareConcurrency提示32，不当作物理核心或实际占用。候选助手0–4共享global cap4，原默认2在结束后恢复。

每批6资源、72000行、9字段，JSON UTF8输入13300032 bytes、CSV10199676 bytes。各候选各5次冷池、5次暖池，共100实测，另20预热和2参考全部保留。冷池包含真实Worker创建/module初始化；原调度准备、post/clone/返回、结果字节界限、数据schema转换/校验、稳定Promise.all收集都在完整wall中。不可独立拆分的收集与纯传输成本为null；各job重叠阶段不相加为批次wall。

| wall中位数，ms | 串行0 | 助手1 | 助手2 | 助手3 | 助手4 |
|---|---:|---:|---:|---:|---:|
| JSON冷池 | 233.3 | 513.4 | 377.1 | 378.2 | 389.7 |
| JSON暖池 | 219.9 | 448.7 | 350.7 | 337.3 | 351.5 |
| CSV冷池 | 623.7 | 705.3 | 451.9 | 498.8 | 452.7 |
| CSV暖池 | 533.2 | 586.2 | 514.8 | 455.7 | 461.4 |

JSON各助手档净负收益，观测范围分离；CSV冷池2/4助手改善27.5%/27.4%，但全部暖池范围重叠或混合，不能据此提高默认线程数。七算法真实Module Worker/串行哈希7/7一致；取消及过期各终态一次、零merge。生命周期累计创建123个Worker，同时created/active最多4，末Worker/租约/字节/revision keys均0。完整100wall合计44.6872s，预热9.0269s只是样本耗时，不是整体运行时间或正式采样长度。

证据：`release-audits/engine-job-parallel-benefit-native-20261006/` 的report、126条raw-events、ledger、integration-findings、metric-semantics。前三次宿主校验/初始化失败全部保留且0性能样本：其中`process is not defined`来自诊断lib-mode没有替换Vue依赖的process.env.NODE_ENV；只在独立测试构建定义production替换，未添加polyfill、源码stub或生产依赖。没有把这次宿主错误冒称生产TDZ。原旧trace在串行档的workerExecutionMs实际是本地耗时，旧字段/raw不改，说明单列；当前生产修复另用新源码身份，不能重标旧测量。

本成本探索不证明输入延迟、CPU实际核占用、功耗、H1/H2或正式X2通过。JSON原主线程merge暖池每文档约29.7ms、执行加merge约35.8ms，仍有不可抢占JS长阶段。选择更短wall不是输入长尾优化完成；后续必须独立验收响应性与分块，而不是增线程宣称有效。

Root本次必要改动与后果：

| 文件 | 新的实际改动 |
|---|---|
| `src/runtime/jobScheduler.ts` | 可选executor:auto/serial，默认auto保留其他七类调用者；主动串行仍使用同一队列/全局租约/有界本地task，不inline绕过准入。单一本地lane防止重叠；cancel/revision/epoch/byte bounds保持。新增serialCount/serialMs/activeSerialJobs，与fallbackCount和真实Worker分开；主动串行不假装Worker unavailable。无Worker执行时workerMs为0（该job没有Worker执行），local执行另报。 |
| `src/runtime/performance/workScheduler.ts` | WorkPhases追加兼容可选localExecutionMs；当前serial workerExecutionMs/postMessage/transport为null，实际本地计算记录localExecutionMs，旧trace保留旧含义。主动serial descriptor明确discard-after-completion；没有改变Frame ABI或Frame capture schema。 |
| `src/runtime/dataResources.ts` | json/database默认serial，csv保留auto/默认2 helpers。可选第四参数显式auto用于独立新源码配对实验，不增全局额度。原三参API、CSV/JSON parser、schema转换、问题顺序与作者commit Owner保持；此模块仍含AssetDatabase作者依赖，不能称纯Runtime。 |
| `scripts/verify-engine-scheduler.mjs` | 增加4项真实生产执行器/Worker并存、主动serial task boundary、取消/新epoch/单终态、latest-only/字节/无效executor与本地phase验证；新增report路径选项，旧25报告不覆盖。 |
| `scripts/verify-engine-data-executor.mjs`（新增） | 实际dataResources入口8项，独立期望的转换/错误顺序、JSON数组/rows/database records、CSV引号、原Worker handler、显式实验auto、坏JSON和queued epoch回归。受控宿主不冒称真实传输时间。 |
| `src/world/hierarchy.ts`、`src/editor/selection.ts` | 原subtreeEntities算法下沉已有world层，保留相同场景顺序、原对象引用与异常环处理；Editor原名导出指向同一函数。Runtime销毁子树将直接使用world出口，没有新增世界或复制实体。 |
| `src/main.ts`、`src/player.ts` | Editor在jobs watch/component setup前安装唯一production state adapter；旧Vue Player经纯安装口包装原对象，没有新增Player→Editor引用。兼容Player的旧Vue/store耦合仍是必需迁移项。 |

局部VERIFIED：调度29/29（`scheduler-serial-phases-functional.json`）、数据入口8/8（`data-serial-phases-functional.json`）；原串行/错误结果、取消/过期不merge、全部最终额度释放。树算法7个语义检查在`hierarchy-boundary-functional.json`，不是全Runtime隔离或性能验收。新整合类型检查/构建/GUI须以接下来的新manifest记录，不能沿用f775证明这些后来修改。

逐文件前后SHA/影响/证据在 `.cache/engine-overhaul/executor-source-handoff.json`，SHA `ab4fa2cbf8ff1d3dd4b818178a7ff4d2a968b4c7301b75443a8e1a3b0fb02923`。生产配置切片另外保留 `.cache/engine-overhaul/production-state-source/source-handoff.json`，SHA `38fef56bc441c443d17b3d60550dd98da08089b996fab3b602d1b1189e1be4f9`：production入口实际62模块/20Vue模块→3/0，默认值/normalize/load/serialize/reset函数体未改，首个Editor/兼容Player包装原target并发布live export；配置10/10和原实际存档失败/取消10/10通过。此入口纯度不能代替全部networking/save/profiler或Runtime图；新GUI设置→jobs watch→保存重开仍待新产物验证。

第30/64关联：实际data→job→Coordinator/lease/trace/Editor统计已处理；无WASM/资源持久格式/物理/渲染算法变更，因此这些ABI不适用本执行器修复。独立Player纯依赖、native重任务准入、完整upload背压、分块输入长尾、正式X2仍必需未完成。

### 追加：f775真实启动/窗口验收与完整产物保护

f775完整产物已另存 `.cache/engine-overhaul/profile-dist-f775e/`，manifest SHA256 `7be8e2fbe10a973afe0c62d42a6e3655ca49f7a079a8c00d340c5fca0b6e1f9e`；旧4304及所有发行未覆盖。脚本服务原ledger SHA `d3776d178a4ef1bfb1e8b9a780354eb112a5d7fb50bb2c9c216956e6587f7ff4`，f775 receipt `dee99a1acdbcd63d8c22c0fd3bf904bbb0b8fa3a4d745f1fae3d8cf963d07bdf`，它们仍代表该切片而不是后来的DebugOwner。

f775 GUI定向10/10：cold/warm/input未知显示Unavailable无ms，模块至首Host wall标签明确；实际模块wall2185.9ms包含刻意≥1.5s Launcher等待，预取未报告保持null。600 rAF/240抽样/4发布窗口说明、Freeze/Full/Off真实点击与两个public JSON下载通过。capture4实际frame schema-v1、startup-v1/samplingScope存在，18帧；真实cold/warm/Ready/first-pixel仍NOT_TESTED，不能将wall改回启动性能。

实际context为WebGL2/SwiftShader、single-thread-compat、baseline WASM、DPR1。16字体/44控件/20padding/r16/g8/header gap12、540宽行无横溢出，原Comfortable底线保持。软件18帧CI平均rAF472.13ms/render60.95ms，两个预算failed；10/10是功能真实性，绝不是帧时间达标。捕获Renderer query gpuMs=1.7285是该软件context的timer-query，FrameObservability gpuMs仍null，不能冒称真实显卡整体GPU或显示延迟。canvas snapshot backing848×560/CSS848×410是布局/保留resize中快照，不代表正式最终内部像素尺寸或降低锁定画质。

证据索引 `profile-startup-window-evidence.json` SHA `7da2e26ee28d373a839f93309f57f1aadc6a832495c224b7b377b35b7387aa4e`；实际capture/预算/PNG/raw在 `startup-window-gui-f775-attempt2/`。首次7项之后测试driver错误地用text找icon-only Freeze，真实按钮label在aria-label/title；原失败保存`startup-window-gui-f775/`，只修driver定位，不改生产按钮。旧Reduced Motion严格失败保留，正常前台连续动效仍NOT_TESTED。

### 追加：f3aa共享脚本分析与当前组合证据

新产物 `engine-profile-f3aa368fad00b3a26e91`，sourceHash `f3aa368fad00b3a26e9182f1409fa9bf05022a4a2edf7a2b657a0198bcc1782d`，568源/271输出，优化构建16.83s；Vue/TS完整类型检查通过，源码构建前后一致。完整不可覆盖副本 `.cache/engine-overhaul/profile-dist-f3aa3/`；配对ledger `.cache/engine-overhaul/script-analysis-source/source-handoff.json` SHA `43213dc2b72652a51f63ee19e618d76247ca31dcddde06b9b894759fc46e8771`。此Web builder不含src-tauri，原生切片另列，不混作同一二进制资格。保留26.37与所有既有发行。

本次每个脚本生产文件的前后副本和hash在上述ledger：

| 文件 | 实际修改与影响 |
| --- | --- |
| `src/runtime/scriptAnalysis.ts` | 从原Language提取唯一纯分析、补全、提示、格式化及重命名算法；不含工作区、协议或Worker客户端。 |
| `src/runtime/scriptAnalysisAnnotations.ts` | 原注释类型/结构/泛型/语句分析逐字迁移，只改变API目录import。 |
| `src/runtime/scriptAnalysisSyntax.ts` | 原语法分析逐字迁移，引用共享分析类型/目录/注释分析，原Rhai parser与signature数据未改。 |
| `src/runtime/scriptApiCatalog.ts` | 原API元数据逐字迁移为唯一实现。 |
| `src/editor/scriptLanguage.ts` | 共享函数与类型兼容reexport；WorkspaceIndex/Protocol/LanguageService后缀逐字保留，Worker URL不变。 |
| `src/editor/scriptLanguage26.ts`, `scriptLanguageSyntax.ts`, `scriptApi.ts` | 三个原公开入口兼容reexport，未删除公共API。 |
| `src/runtime/GameplayRuntimeCore.ts` | 两处分析import改为纯共享模块；VM/回调/断点/字段提交实现不改。 |
| `src/runtime/scriptContracts.ts`, `scriptCoverage.ts`, `scriptHotReload.ts`, `scriptTestExecution.ts` | 四处分析或类型import改为共享入口；本产物仍有目录兼容入口/响应式状态的残余边缘，不称四模块已纯。 |

新 `verify-engine-script-analysis.mjs`：82/82，包括与已保存原源码逐项输出对照（仅排除实际elapsedMs）、真实WASM语料格式化语义、原公开出口/共享函数identity、工作区revision/snapshot/协议、快速替换/abort/迟到回复/dispose。没有扩大语言支持或改VM。实际Gameplay ScriptServices再21/21，Core DebugOwner再21/21。新增debug测试`--report`只改变输出位置；首次引入的引号拼写错误在执行前触发Node SyntaxError，已修复并单独保留失败记录，没有当作Core失败或隐藏重跑。

11个历史static reader仅移动到真实实现或按需拼接纯算法+Editor后缀，169个原业务assert/check AST保持、11/11语法与8定向marker通过；4.6 LANGUAGE-SAFETY继续逐字检查Editor原服务。逐文件变化在 `release-audits/engine-script-analysis-static-reader-20261006/ledger.json`，SHA `c0edace6a7c455936f7531467903302a5e8876cd5da480dbd1dec26985ca9a3e`。动态SSR仍通过Editor兼容入口；未批量运行旧全审计、未重生成signature或改变锁文件。

严格gate继续FAIL：实际compiled Core22/compat23/Player37/emitted32；source包括类型，Core68/compat69/Player17。Shared script analysis、Lighting、Production等各自入口0违规已VERIFIED；source四consumer Contracts1/Coverage2/HotReload1/TestExecution1尚未通过。增加这些入口到两种审查脚本，没有取消任何旧失败入口或依靠tree-shaking隐藏耦合。

DebugCounter独立ledger `.cache/engine-runtime/debug-owner-handoff.json` SHA `ea1d912edb95de6256e654734f2bc362f222e0b9487659d49441d5f7259ff186`：Core21、计数预算/身份7、旧V26.14/V26.27各48、ScriptServices21通过；断点ID变更使旧Token失效，预算包括编码键UTF16，Editor metadata原Owner保持。Native持久Scope旧fixture不具备能力，不假造支持。

Lighting独立ledger `release-audits/engine-renderer-lighting-owner-slice-20261006/ledger.json` SHA `28863701810793e253572d15354d106ba7332c01caa387282bb85d5fca91fb70`：原算法经唯一环境端口访问，WorldCanvas接入真实Owner，29compiled/32source独立图0违规；原实际AssetDB区域15/15、15组old/new canonical像素零差。synthetic区域2651通道失败尚未诊断，旧MSAA失败仍保留；没有放宽容差、换基准或改锁定画质。

原生导出①独立ledger `.cache/engine-overhaul/native-export-slice/source-handoff.json` SHA `64a86d75f4fb6b195a24980af2108eca4b02090486998bd59fb3205aa5b5d970`：`src-tauri/src/lib.rs` 原同步正文迁到唯一core，async command先try-admit cap1，再spawn_blocking；新`native_admission.rs`持有RAII许可直到实际阻塞任务结束，busy明确拒绝；`native_export_tests.rs`及专用verifier测试真实command忙碌拒绝不建目录、running后drop/abort、error/panic回收和原文件/cache/安全错误A/B。locked offline jobs1 Rust21/21及check通过。两个原正文SHA边界差一个separator LF，各自前后逐字一致，范围明确记录；没有修改1GiB/2GiB/20k/256MiB旧容量、API payload、权限、签名或launch。产物为debug test executable，不能当正式Native Player或WebView验收。

第30/64：上述共享分析/import/公开入口、DI、计数会话与预算、原生准入/取消关联均逐项记录。无WASM ABI、协议布局、引擎时钟、物理/游戏动画或UI几何变化；非共享Worker拓扑、全局TS/native统一额度和完整字节预算、streaming Producer、任务尚未启动时取消/真实IPC取消、实际WebView、独立Player、Rust权威世界、真实WebGPU与正式B/X/H门槛仍必需未完成或NOT_TESTED。f3aa新GUI设置→jobs watch→保存重开待实测，不能沿用f775宣称通过；无任何本次完整性能资格或“充分利用硬件”结论。

### 追加：实际脚本状态、Profiler 与提交诊断 Owner（0e471 组合）

后续实测补充，不改写上面历史状态：f3aa 真实编辑器设置→jobs→保存重开已定向 10/10。证据 `.cache/engine-overhaul/production-ui-f3aa-evidence.json`（SHA `39d0200813e54e3b283c6c468884df8422efc50ef457d7672473e7d3b1544128`），截图与公开下载在 `production-ui-f3aa-attempt2/`。1600×900、DPR1、Edge147、软件 WebGL2/SwiftShader、single-thread-compat、普通 WASM，原平台场景11实体。组件计量范围澄清：原fixture及两次saved/reopened均59条序列化组件，其中18条removed=true；`largeWorldPerformance.ts`真实桶只统计未removed的41条。早先11/41是Runtime有效组件口径，11/59是项目总记录口径，不能混用；先前临时判定“41统计错误”现已纠正。Root核对实际源码与原JSON后确认59/18/41，fixture SHA `9b070ae2eb8cff968f0735eec07aae99807df32b864a5090b737c55a360530ba`，历史raw与ledger保持原样，没有项目或算法变更。首轮8项后等待 Lighting 的测试失败原样保留：世界画面仍亮且有阴影，当前请求未获提交时各 pass 为 Disabled，并不证明 Lighting 功能关闭。Root亲自检查失败截图、重开设置截图、Play 截图；软件环境/CDP暂停下约1秒帧间隔不能作性能通过。物理 DPI、Native WebView、精确 resize/DPI 全契约及完整动效仍 NOT_TESTED。

本次新增组合 `engine-profile-0e471944f69801413717`，sourceHash `0e471944f6980141371767bc0163f0d35dd84632357d17edd50f583cfc4149ec`：完整 Vue/TS 检查 PASS，571源/271产物，优化构建16.07s，前后源码 manifest 一致。完整逐产物 SHA 核对副本 `.cache/engine-overhaul/profile-dist-0e471/`，manifest SHA `f399c86667a354bce6b0a374139fb3db53447e7fd0b1a5a5ab3713b2b8919cf9`；记录 `owner-integration-0e471/artifact-receipt.json`。仍是诊断 Web 构建而非新发行；原 native 产物、26.37发行、4304/f775/f3aa完整副本均保留。

每项实际改动及后果：

| 文件 | 修改与保留的契约 |
| --- | --- |
| `src/runtime/scriptDebug.ts` | 默认原始对象，去直接 Vue reactive；原 Debug 字段、默认值、函数体不变，安装口发布同一对象的宿主视图。 |
| `src/runtime/scriptSettings.ts` | 相同设置 raw Owner 与序列化/normalize/reset；响应式包装由宿主安装。 |
| `src/runtime/scriptHotReload.ts` | 相同 plan/history/rollback Owner 和原函数体；不重写热重载决策。 |
| `src/runtime/scriptCoverage.ts` | 相同 hit/revision/report/LCOV 算法；去 Vue，API manifest 指向唯一纯目录。仍按实际 revision 通知消费者，不虚构 raw 条目深 watch。 |
| `src/runtime/scriptContracts.ts` | 仅 manifest import 指向纯目录，原契约函数不变。 |
| `src/runtime/scriptStateAdapter.ts`（新） | 四个视图构造完才一次发布；独立提前安装或构造失败明确拒绝。是可信同步宿主工厂，不宣称对恶意工厂提供安全沙箱。 |
| `src/editor/scriptStateAdapter.ts`（新） | 实际 Vue reactive/toRaw 包装原 target，Editor setup 前安装；无世界复制。 |
| `src/runtime/profiler.ts` | 去直接 Vue 与 toRaw，原 raw Owner、采样窗口、字段和capture v1保留；显式 wrap/unwrap验证根与嵌套身份，数组裁剪经宿主 unwrap。Off/disabled/frozen 时不聚合函数统计。 |
| `src/editor/performanceStateAdapter.ts` | 同一 Editor 安装入口接入 Profiler 包装；无新增时钟或镜像状态。 |
| `src/runtime/GameplayRuntimeCore.ts` | 真实回调 finally 在估算准备前查询 shouldRecordScriptFunction；原5个参数表达式、必需VM ABI JSON、属性/命令/错误/实例状态不变。 |
| `src/main.ts` | Setup 前安装脚本状态；实际 Profiler.enabled/mode 同步映射 GPU 诊断 off/full/sampled，HMR 清理 watch；不改变渲染质量或提交额度。 |
| `src/player.ts` | 旧 Vue Player 经纯安装口包装同一状态，未增加 Player→Editor import；原 Vue/store 耦合未解决，不能称独立 Player 完成。 |
| `src/renderer/GpuDiagnosticsBudget.ts`（新） | 纯有限模式预算 Owner，sampled 默认每8个 admitted frame/最多4个 pending，Full每帧/最多4，Off禁新query；不模拟GPU能力。 |
| `src/renderer/RendererEnvironment.ts`, `core.ts` | 可选诊断预算端口与兼容默认，原渲染器创建/能力契约保留。 |
| `src/renderer/WebGL2Renderer.ts` | 只在 admitted begin 锁存预算；Off下一 admitted frame清pending且GPU值null，处理中模式变化不破坏当前query配对，丢失context不删除旧epoch句柄。114个非诊断成员 AST 不变。 |
| `src/editor/rendererAdapter.ts` | 唯一 Editor GPU预算桥，原 assets/scene/lighting Owner 与提交/恢复逻辑不变。 |
| `src/renderer/renderGraph.ts` | 当前request与独立、最多5个pass的历史World CPU提交摘要分开。null=本次未提交；finite非负=世界Renderer CPU API提交；其他=未测，不猜GPU拒绝原因。诊断Owner scope/epoch防迟到清理与替换污染；原capture/sequence算法不变。 |
| `src/components/WorldCanvas.vue` | 实际画布创建、project/scene/renderer/runtimeSession/view变化及卸载连接诊断Owner；原绘制/模拟数据算法不改。 |
| `src/components/ProfilerPanel.vue`, `RenderingPanel.vue` | 实际表格标明最新请求未提交，历史CPU摘要单列且不混入本次耗时；不是GPU完成或显示呈现。Comfortable样式未改。 |
| `src/i18n.ts` | 三套既有语言补充上述计量范围与状态说明，避免把保留画面误标为功能Disabled。 |
| `scripts/audit-engine-source-boundaries.mjs`, `audit-engine-boundaries.mjs` | 增加真实Script bootstrap/Profiler入口，仍保留所有旧失败入口与严格规则。 |

局部证据区分 IMPLEMENTED/VERIFIED：四状态 before12/after41、实际 Core Debug21/ScriptServices21/Counter7、旧V26.14/27各48通过，ledger `.cache/engine-overhaul/script-state/handoff.json` SHA `f9d375945cf6f9783420d7b413030d80e4bb4a519c327481720367042ad84414`。两旧fixture只补实际共享模块imports，不改原业务断言。首次 Coverage 深watch断言在修前/修后均失败，保留raw；改为实际revision→report契约，不改生产算法或容差。

Caller verifier修前/修后各17项，真实21次Core/WASM调用：Off10+disabled2+frozen2的14次额外属性 stringify 14→0，必需ABI stringify仍14→14；开启7次原估算/调用/属性/错误一致。真实VM throw、恢复、同Scope切模式、成功新epoch后旧epoch拒绝通过。ledger `profiler-off-caller/handoff.json` SHA `ab17f9bafeffdb5c156e9c7d9ff1da72fcd6cff59e21652d5d0150a0e9ef9dda`。原 `source.length*2+JSON.stringify(props).length` 仍是混合历史heuristic，不称实际heap bytes；只证明额外调用消除，没有正式wall收益。

GPU预算 pure14、实际软件context10项通过；ledger `release-audits/engine-renderer-gpu-diagnostics-slice-20261006/ledger.json` SHA `2e7c800d867b54f7be99cc30ef05b86ca32604d78cbff3eb7bef064131c103fe`。没有修改锁定画质、GPU额度、实际input位置或增加助手。新诊断Owner真实模块/实际两Vue模板/三语言13项与原presentation9项通过，ledger `render-request-diagnostics/source-handoff.json` SHA `5ed4ad253a37812dbb8d6a420d34ba19818b84c3e96faad3542538b54eb178fd`。初次专用driver错误导入pnpm非直接包路径，失败保留；改用已锁定Vue编译器出口，无新增依赖。

0e471严格gate仍 NOT_PASSED：compiled Core22/compat23/Player37/emitted32；source含类型 Core61/compat62/Player17。四脚本consumer、Script bootstrap、Profiler、Renderer core/frontend、Lighting、Production等独立入口各0违规。此改善不等于完整M1；compiled计数不减是其他仍可达模块继续携带Vue。新0e471真实GUI尚在执行，不能用f3aa为后续Owner改动背书。

重要必需缺口：Profiler私有 functionProfiles Map 仍无界，显示slice2000不构成容量限制，2001条实际样本已证实；后续需要有界诊断预算及可观测拒绝契约，不能静默淘汰改变排名。原V26.24验证器固定历史report路径曾被本次宿主验证覆盖；正在分离实际before/after重新采集，不能假称原历史JSON完好或把stdout当完整JSON。原失败与不可恢复内容须独立说明。

Profiler独立终交 ledger `release-audits/engine-profiler-owner-slice-20261006/ledger.json` SHA `27dcd69e58ea6d014afd7450533551b1265d39470a78e04c4a9f5322404fd231`：实际状态专测15/15、既有观测6/6、原V26.23/24各3/3。旧两宿主在迁移前真正仅watch一项失败（另两项通过），只补显式Vue宿主安装，原断言/算法逐字保留。V26.24另外修正report环境变量路由，默认历史路径保持；corrected before实际2PASS/1watchFAIL和after3PASS已分离，当前被覆盖根文件另归档且重跑后SHA不变。此前历史内容无Git/已有副本确认，状态UNRECOVERED，不能伪造恢复；最早只有stdout的那次不称完整JSON。

Root组合配对 `owner-integration-0e471/integration-receipt.json` 保存两gate原始JSON及各SHA、所有571当前源与manifest逐字hash相同、check/build日志与Root main/player/gate脚本快照。main/player的aggregate before快照已包含Root后续安装编辑，明确不冒用为f3aa源；f3aa真实hash由其独立manifest引用。新增边界入口没有改变严格规则或取消失败入口。

第30/64关联：状态安装时序、旧兼容出口、真实Core/WASM/Editor消费者、Off诊断准备、GPU query生命周期、viewport scope与current/history UI已经处理并有对应局部证据。无Frame ABI/资源持久格式/物理权威/游戏动画/精确输入位置/Comfortable几何修改。完整依赖边界、Rust权威世界、Engine Worker、真实WebGPU、全局native额度/streaming资源与upload背压、正式B0–B8/X01–X15/H1/H2、QualityLocked/AdaptiveExperience、Native/Linux与完整动效（包含既存Reduced Motion失败）继续必需未完成或NOT_TESTED。

### 2026-10-06 追加：Input Owner、有界脚本诊断与实际导出范围

沿用 `main` / `82c9c03118848df1c07af323c38a3abade7dd21b`，主指令、AGENTS与已发布26.37产物未修改。本段替代上段“functionProfiles仍无界”的当前状态，不改写原始失败证据。普通优化WASM/glue配对未改；仍为 `single-thread-compat` 的既有组合，未实现默认Engine Worker或独立Player。

| 实际文件编辑 | 行为与后果 |
| --- | --- |
| `src/runtime/inputModality.ts`, `deviceInput.ts` | 四原状态默认成为纯raw Owner；保留原默认值、方法、保存格式及函数body。未改变InputManager、DOM/sensor调用或游戏输入算法。 |
| `src/runtime/inputStateAdapter.ts`（新） | 同步一次性可信host wrap/unwrap安装口；根与嵌套同raw验证，拒绝部分安装、重入、clone或工厂失败，不建立第二套世界。可信工厂契约不是恶意factory安全沙箱。 |
| `src/editor/inputStateAdapter.ts`（新） | Vue reactive/toRaw包装原四状态，真实Editor消费者仍观察原数据。 |
| `src/main.ts`, `src/player.ts` | Editor Setup前安装Input状态；旧Vue Player通过纯口安装，不新增Editor import。旧Player耦合继续失败。 |
| `src/runtime/profilerCollectionBudget.ts`（新） | 单一预算Owner：最多4096函数身份、估计元数据2MiB、记录基重128；拒绝新身份只计饱和安全的调用数，不存拒绝集合或淘汰已接纳项。UTF-16预算估算不冒充实测heap。 |
| `src/runtime/profiler.ts` | 原统计/稳定排序/Top2000表达式不变；新身份超预算明确拒绝统计，已有函数继续累计。clear重置预算；Off/disabled/frozen不记录拒绝。v1脚本capture附加可选不可变collection证据，旧capture未知，不补造完整性。 |
| `src/runtime/performanceTools.ts` | 实际v4通用性能capture附加同一Owner的可选collection snapshot；旧v2/v3/v4缺字段时保持未知。原CI预算、比较、序列化及frame统计算法不改。 |
| `src/editor/profilerMeasurementCopy.ts` | 三语分别说明已接纳集合排名、采集拒绝调用、Top2000展示截断与元数据估计；旧捕获完整性未知。历史源码/JSON长度混合heuristic不称实测分配字节。 |
| `src/components/ProfilerPanel.vue` | Scripts当前范围、已保存A/B范围和通用性能capture范围实际显示；历史allocation数值原样保存，移除误导性的B单位。原capture/compare/export函数和全部Comfortable styles逐字不变。 |
| `scripts/verify-engine-input-state.mjs`（新） | actual InputManager、GameUiRuntime、VirtualControls/DeviceInput真实组件与同raw/异常安装验证。 |
| `scripts/verify-engine-profiler-collection.mjs`（新）, `verify-engine-profiler-state.mjs` | before/after容量专项与原15项关联；只对新collection元数据增加独立检查，原fields/2001展示语义继续验证。 |
| `scripts/verify-engine-script-profiler-budget-caller.mjs`（新） | 公共Profiler API填满4096身份和2MiB，少量真实Core/WASM调用验证诊断拒绝不会拒绝玩法，不运行4096个VM冒充真实场景。 |
| `scripts/verify-engine-profiler-collection-presentation.mjs`（新） | 实际模块、JSON导出、旧capture未知、原比较/CI/Styles不变、三语真实模板fragment SSR；不是完整SFC Setup、GUI或性能资格。 |
| 两 `audit-engine-*-boundaries.mjs` | 新增预算及Input四个真实入口；严格规则及所有原失败入口保留，没有降低验收。 |
| `scripts/verify-engine-motion-timeline-cdp.mjs`（新） | 原0e471配对产物的无截图有界诊断，实际pointerup t0、page/timeline及动画identity；不写私有状态、不完成/取消动画，不证明物理paint。 |

Input before11/after37，原Input15、observability22、真实WASM玩法10、旧相关prompt回归通过；四独立入口source含type与compiled均0违规。ledger `.cache/engine-overhaul/input-state/handoff.json` SHA `4500cef2eb2f4b21bbd11863dcfc0f9450fbd68a370b8558cc2259b171a95348`。局部实现/验证不能代替新的GUI或整体平台分层。

预算pure13项、原Profiler关联15项通过，ledger `release-audits/engine-profiler-collection-budget-slice-20261006/ledger.json` SHA `37e4a4e035555b35dc0c57190b24e7b00f4fa61d40619d93d0af2ab0669f3b4e`。实际Core caller18项、24次VM/ABI尝试=20成功+4真实错误（throw3+旧epoch1），ledger `profiler-budget-caller/handoff.json` SHA `9595bdd9768e8a608a7608ca2223e462f027da0454194226148d50a255953202`。统计满额时原属性/私有scope/命令/异常和clear后继续状态均保留。Full拒绝依然执行原估算准备，18次Full额外属性JSON18/ABI18；Off/disabled/frozen各2次额外JSON0、必需ABI各2。不宣称Full准备成本已经消失或正式wall收益。初次fixture把成功lifecycleCalls误当全部24尝试，失败原fixture/raw保留；按实际Core成功计数20+scriptErrors4校正。

Root实际导出/模板7项PASS：`.cache/engine-overhaul/profiler-collection-integration/presentation-first.json`。同owner不可变v1/v4 snapshot、JSON保留、clear不改保存证据、旧版本缺字段未知、错误元数据未知、CI/比较不变、原capture/export函数及styles逐字不变和三语actual template fragment均有检查。它仅SHORT_SMOKE，不代表新GUI、实际heap、动效或正式开销。

新组合 `engine-profile-a1d6fe7b3c4ce5db243a` / sourceHash `a1d6fe7b3c4ce5db243a2935eed2d69c64d9cb6d3babc9053d7d97e2681ef9dc`，check与diff-check PASS，optimized build15.60s；574源在构建前后和集成receipt逐hash相同，271产物复制后逐hash相同。独立目录 `.cache/engine-overhaul/profile-dist-a1d6f/`，manifest SHA `f7230306e211b4247b7f9fe5e46cf88bd6201de5aa3ae4ef7f448ca6602e3be9`。receipt `input-collection-integration-a1d6f/integration-receipt.json` SHA `ef6c2d9e53afa52d3626a336eaac08056b305ac1f7eea5243ff94be16799a717` 保存Root逐文件before来源/after快照、gates原始JSON、日志和局部ledger哈希。source Core61→59/compat62→60/Player17；compiled Core22/compat23/Player37/emitted32继续NOT_PASSED。新预算/Input入口全部0违规；不把局部纯Owner当完整M1。新a1d6f GUI独立执行，旧0e471不为本cohort背书。

0e471真实GUI终交 `render-request-diagnostics/final-handoff-0e471-v2.json` SHA `8168ce122712d773f3e46f777c32cdfaf778587402ae4cf2a2d06b5e028b3409`：10项actual公开路径、真实Rhai行和Low8/Full1/Off0且maxPending4/4/0诊断Owner接线通过；软件Edge147/SwiftShader、DPR1、single-thread-compat。reference同一内容11entities / 59序列化components（18 removed=true）/ 41未removed且enabled，59与41是不同分母，先前v1误读已明确纠正，历史raw不改。current-not-submitted DOM和独立历史均有读取，但截图自然推进至submitted，状态 `NOT_TESTED_SAME_TRANSIENT_IMAGE`。CSS848×560与backing1228×632的初始差异保留，不称完整DPI/resize通过。

Motion旧严格A1失败不覆盖。新无截图诊断 `motion-timeline-0e471-attempt1/source-handoff.json` SHA `a9b05fb4c621b86f4ded03d26ac9a93291b4a05769671ba887fe460bef7f2fcf`，raw SHA `4750b12dd544c1f73fad7ef79a2cb4bc1044b7c90f146765347a407aea322dbd`，Normal/manualReduced/systemReduced×Preview/Play共6组，均未取得formal及时PASS。Normal Preview首次零2707.7ms；Normal Play首次零4114.7ms；Manual Reduced Preview4s末2个活动且最大pagegap2014.9ms；Manual Play首次零1683.9ms但gap199ms；System Preview2850ms但gap103.4ms；System Play3254.8ms且gap301.2ms。各组3s状态及timeline停滞/跃进原始值记录，真实paint、私有活动Map和Node polling gap不可知（null/NOT_TESTED）。迟到零动画不回写3s通过；CSS/startTime=null/currentTime=0/pending不足以确证资源泄漏。无永久timer/listener诊断残留的回收检查通过，不能等同“全部动效流畅”。

第30/64关联：同raw安装、真实旧业务消费者、持久保存格式、脚本scope/命令/错误、诊断预算与capture版本兼容、表格单位、两严格gate、原样式与精确输入保持有局部证据。没有Frame ABI、Rust权威、物理或真实游戏动画变更。正式QualityLocked/AdaptiveExperience、B0–B8/X01–X15/H1/H2、整套M1、默认Engine Worker、真实WebGPU、streaming上传/资源、全局native竞争额度、独立Player、Native/Linux与完整动效仍为必需缺口，不能用上述smoke或编译成功宣称整轮完成。

### 2026-10-07 接续：实际输入界面、Device 几何缺陷与 Motion Owner 可观测性

中断恢复核实：主指令SHA `6fb979cbb88f3c77372159ebb6ffd65d4228d5c30226f41135e0fec460b5bb12` 与AGENTS SHA `339082d51eca3dc014f1accd7ab8e03f83cde087cd622318466b20bfcdde3816` 未变；此前完整已读至文件末尾，无重复大扫描。工作区新增未跟踪 `new.py` 来源未确认，未读取、执行或覆盖，作为用户工作保护。

a1d6f公开功能实际9/9，独立交接 `input-collection-ui-a1d6f-attempt2/handoff-a1d6f-v1.json` SHA `5865e8a0f26a96c6dec1782f23bfe8ba25d668017bef401cb853bcfd88cd4537`：Scripts当前budget、真实A/B捕获及比较、通用JSON/CI原checks、Virtual Controls与Device输入响应、真实保存下载与file chooser重开、玩法与overlay持续均通过。实际采集3/4096、UTF16估计1040/2097152、拒绝0、admitted-set范围与导出一致；旧capture导入没有实际公开UI路径，不能称GUI旧capture加载通过。原CI仍failed（frame.average、render.average），overhead仍estimated。它是功能smoke，不是性能资格。Edge147/SwiftShader WebGL2、single-thread-compat、baseline WASM；这次CSS与backing均848×560、DPR1，仅此组合通过，物理DPI/前台/native未知。原项目11实体/59序列化组件（18 removed，41未removed）未改变，修改后的真实保存副本另hash，重开继续6个Runtime bodies/2 contacts与真实fixed_update。首次测试locator仅扫描旧label/.property-row导致失败，补实际.ui-property-row aria-label后重跑；失败attempt1保留，不改生产控件或旧全局helper。

Root亲看实际Device failure PNG与导出区域PNG。名字带 `actual-collection-capture-scope` 的图实际停在Memory标签且说明在视口外，不能作为已看到collection文字的视觉证明；上述copy以真实DOM/export功能证据为准。下一cohort需公开maximize/scroll且target DOMrect完整可见后截图，不重写旧图或借旧图证明新源码。

Device可读性 `CONFIRMED`：`device-layout-a1d6f-attempt1/device-layout-raw.json` 同1600×900/DPR1/zoom1；fields client1474/scroll1506、7列各203.7px/gap8，内部UiPropertyRow再分160px标签+27.7px控件。实际input34×44px、16px左右padding+2border占满，Label/Accessible/Size文字裁剪，数字stepper溢出；card client1490/scroll1514，而studio overflow hidden。这是小列与共享横排标签冲突，字体已16px，不能用缩字号解决。

实际Root编辑 `src/components/DeviceInputPanel.vue`：19个已有UiPropertyRow接共享stacked prop；field/calibration列用既有scaled280px field token和窄容器min-clamp；垂直20px/horizontal12px语义gap，header到字段16px；删除旧125/140/190px互相覆盖及旧两列规则，只保留一个mobile单列覆盖。原scriptSetup逐字不变，template除stacked prop外逐字不变；全局16px/44px/16px input padding、圆角、motion以及保存/history/input/传感器生命周期不改。before SHA `8642f860b81aab7652c89ca1b9bca1a54a362374e68684064844012a1eaa5414` → after `8bdd1f47b47ecd7280215e9b9b87691ffa7d3f898f0d4d573d5cc5a9a7e8a901`，`device-comfortable-layout/implementation.json` 保存精确修改；IMPLEMENTED，新GUI仍NOT_TESTED。真实产品最小窗口Tauri1024×640（config22–23）；下一视觉比较用1600×900及1024×640、公开100%/125% UI scale，浏览器zoom1。低于最小窗stress不能代替支持范围或理由缩小控件。

实际Root编辑 `src/editor/performanceTraceAdapter.ts`：仅新import既有 `getUiMotionDiagnostics` 并在主动metadata.environment读取同Owner的6个primitive计数/策略。既有trace Host负责structuredClone；不建新时钟、逐帧推送或永久任务，不改80ms CSS、WAAPI算法或3s门槛。固定小对象有额外allocation，成本未测，不冒称零heap。独立实际模块7/7功能通过，`release-audits/engine-motion-trace-metadata-ledger-20261007/ledger.json`：activeJobs0→1→0、manual/system Reduced fresh、快照隔离、metadata读不添加frame、实际frame1条且gpu=null、dispose解除API/订阅、幂等回收。第一次CRLF及Node navigator.platform夹具错误raw/script保留，未改Motion源规避。编译闭包不含Core/compat/new WorldHost，不为那些授予资格；编译后记录传递source SHA，非uniform manifest。a1d6f旧图上Player不达Editor traceAdapter，加一个仅该模块的出边不扩大Player的结论是INFERENCE，下一真实生产gate另验证。新真实GUI与JS Map现场仍NOT_TESTED，旧严格Reduced失败保持。

新测试文件逐项：`verify-engine-input-collection-cdp.mjs` 新真实功能driver；`verify-engine-device-layout-cdp.mjs` 新只读布局测量；`verify-engine-device-comfortable-cdp.mjs` 新build/hash守卫、稳定可见capture及最小窗/scale准备；`verify-engine-motion-trace-metadata.mjs` 新实际adapter/Motion/trace功能验证。实际文件名/完整hash以各ledger为准，不把准备中的driver当运行通过。Source边界追加纯Gameplay host、音频设置与scene transaction三个type入口，仅扩检查，不改原失败规则；Core直接宿主接线正在独立实施，后续需新的sourcefreeze/check/build证据。
### 2026-10-07 追加：Gameplay 显式直接宿主（M1/M2 局部切片）

本次只迁移 Core 直接使用的宿主，未把尚未分离的玩法模块宣称为独立 Runtime。分支 `main`、commit `82c9c03118848df1c07af323c38a3abade7dd21b`；增强主指令已完整读到文件末尾，基线及已发布26.37不改。工作区新出现的 `new.py` 来源未确认，保护且不读取、执行或覆盖。

| 实际文件编辑 | 行为与影响 |
| --- | --- |
| `src/runtime/gameplayWorldHost.ts`（新） | 纯类型契约，明确 live state、sceneUuid、原 authoring/delete/scene/log/quit 能力；没有默认导入 Editor、启动时钟或创建 World。 |
| `src/editor/gameplayWorldHost.ts`（新） | 唯一兼容组合仍引用原 physicsState/sceneManager 和原函数。quit 保留 Core.stopSession → stopPlayMode → status → 原事件顺序。Vue 展开类型丢失 World 私有字段，仅在可信 getter 恢复 nominal 类型，原 proxy/markRaw World 不变。 |
| `src/runtime/GameplayRuntimeCore.ts` | 116处直接 physicsState 引用及38处log、sceneUuid/authoring/delete/scene准备与quit尾部改为显式宿主；getter保持live，方法绑定原接收者。必需脚本服务仍先验证，宿主缺失时构造失败、不启动Play。 |
| `src/runtime/GameplayRuntime.ts` | 原公开默认构造及唯一单例保留，super 组合原 Editor 直接宿主。它继续是耦合兼容入口，不称纯 Runtime。 |
| `src/runtime/audioSettingsContracts.ts`（新）, `audio.ts` | 8个原类型声明逐字下沉，旧出口重导出；默认值、归一化、音频行为未改。 |
| `src/runtime/runtimeSceneContracts.ts`（新）, `runtimeSceneTransition.ts` | 原 PreparedRuntimeSceneTransition 类型下沉并保留旧出口；prepare/commit/rollback 函数体未改。 |
| `verify-engine-gameplay-world-host.mjs`, `verify-engine-gameplay-world-host-contract.mjs`（新） | 真正 beginSession/update/stopSession 的 WASM 生命周期验证与整文件逆变换/type graph；不把只赋 active=true 的fixture当正常启动证明。 |
| Core ScriptServices/DebugOwner、Off/预算caller、V26.14/V26.27 fixtures | 按真实新构造参数及Editor factory解析补接线；旧业务断言保留，初次未适配失败/旧配对报告均保留。Off与预算合同先逆变换直接Host，再核对原5参数及Off准备逻辑，不把Host改接算成诊断收益。 |
| `audit-engine-source-boundaries.mjs` | 增加纯Host/Audio/Scene类型入口；不为会被擦除的type-only入口伪造compiled模块，原严格失败入口保留。 |

终交 `.cache/engine-overhaul/gameplay-world-host/handoff.json` SHA `35cac7b6c8e8decd610f3d4702299b78e097812538424b3ace5d67674dab5b43` 保存18个文件前后哈希、16份实际raw、初次失败与第30/64节关联清单。Core最终 SHA `a38d8ce781984976a954ee019fd37a28a6ec399012249e74930adeed00df3291`，EditorHost最终 SHA `80e81d1ed67032816f057f70c5f8a4a902bb213f71e2cc69b40b3d19890d2db8`。正常生命周期 before10/current19，source/type合同8项通过；后两项在可信类型修复后重新执行。独立只读审查也完整逆变换Core到 `a2695bbf…fc07`、compat到 `76103adb…ce38`，没有发现本切片可归因的新业务回归。

初次全量check确实失败：`check-world-host-device-motion.log`，原日志不覆盖。修复只发生在Editor类型getter；`check-world-host-device-motion-retry1.log`全量check通过。相关原配对回归 ScriptServices21、Counter21、Off before/after各17、预算caller18（24真实VM/ABI尝试）、V26.14/27各48、Game10/Input15/Input观测22/timing8通过；这些报告属于其记录的源码配对，不冒称所有测试都在最终uniform产物上重跑。timing初次默认路径拒绝覆盖旧报告后，改用既有独立report参数；旧报告完好。

**仍未通过**：foreign World正常生命周期会经 `worldGameplay` 等既存全局Owner触及原World的 CharacterBody requestedMotion。实际失败作为限制保留，不删组件或改stub以假装多World安全。GameFlow暂停/分数/检查点与Collectible计分也仍绑定全局Owner，已确认下一片必须一起接线；dynamicObjects/objectPool仍另有全局查找链。Host构造验证state/world及5方法，完整其他字段依赖可信TS契约，不能称恶意JS宿主形状的完整安全校验。

纯Host source/type图26模块/0违规，Audio/Scene契约各1/0；整体source gate仍 Core57/compat59/Player17违规（NOT_PASSED）。不是完整M1、Engine Worker或独立Player通过。普通优化WASM/glue、物理语义、Frame ABI、精确输入、Comfortable几何和核心动效未由该Host迁移改变。旧a1d6f只证明其自身修前cohort。

新统一产物 `engine-profile-a4211a26348a4f129394`，sourceHash `a4211a26348a4f1293942c2e2e17a9b5992572ab48600733559f68191c010702`，全量check retry1与diff-check PASS，optimized build14.23s。构建前后及receipt检查578源hash一致；271产物复制后逐hash一致。独立目录 `.cache/engine-overhaul/profile-dist-a4211a26348a/`，manifest SHA `d245fdef8015039b795592f4033b491fb1e24bbca2e98a1482de6f14d13f7250`；receipt `world-host-device-motion-integration-a4211a26348a/integration-receipt.json` SHA `16cdfd4eb5f20dc2e10c6ce3d6c2c5ace3595031dd493f2cde4a323864ff621d` 保存10个实际变更源、原始gates、失败/重试日志和相关ledger。

compiled gate仍 Core22/compat24/Player38/emitted33违规。对照旧a1d6f，后三项各多一个 `src/editor/gameplayWorldHost.ts`，是明确保留的Editor兼容组合；不能把改接成纯Core形状视作整条可达依赖已经隔离。纯独立Owner入口仍0违规，Player既存Vue耦合继续失败。

a4211实际GUI终交 `.cache/engine-overhaul/device-comfortable-ui-a4211-attempt1/handoff-device-motion-a4211-v1.json` SHA `90a1a9d28bf0b57986ea02a4dbb2f49fe998b5cc7dcf97e0594144d88e6fde91`：公开功能/视觉8项通过，同一11实体/59序列化组件/41非removed组件保存fixture。1600×900及Tauri最低1024×640、100%/125%公开UI scale、browser zoom1/DPR1下，fields/card/control/input的client/scroll尺寸均无溢出。Text/select宽280/350，numeric宽86/107.5；文字16/20、控件高44/55、左右padding16/20，保留缩放后的Comfortable目标。旧a1d6f numeric宽34、文字可用宽近零的缺陷已在实际Device路径修复。Size96→104→Undo96→Redo104→Undo96，保存并fresh reopen SHA仍 `aba83b30…70ec`；原项目SHA `9b070ae2…30ba` 未变。

Root实际读了wide100、minimum125及两个Profiler范围PNG，Device标签/值可读，最小窗口允许正常垂直滚动而不压缩字号；当前预算和通用capture说明确实在画面里。Driver另有已保存A/B及minimum125末行PNG，全部hash/稳定Tab/全文DOM可见性前后检查入handoff。通用capturePNG明确保留 CI Failed 与 overhead Estimated，不当正式性能通过。新driver `verify-engine-device-comfortable-cdp.mjs`、`verify-engine-motion-owner-cdp.mjs` 均强制指定产物身份与独立输出；原a1d6f标题误导、说明实际不可见的旧图不再冒称视觉通过。

同产物仅一次manual Reduced Preview有界动效诊断：59样本/4.0365s、UTF-16队列估算58,626B，50ms目标、最多80样本/4s/1MiB；开始于真实pointerup。JS activeJobs全为0，唯一Jobs CSSTransition80ms在t+0.1ms pending/running（start=null/current0），t+499.3ms首次JS/CSS全0，3s前2977.2ms及后3040ms也全0。page最大采样gap499.2ms、Node轮询gap518.253ms、timeline最大step1037.5ms，另有timeline plateau812.6ms；metadata readDuration最高1.4ms。没有截图/Debugger/另加rAF、cancel/finish或动画赋值；此时Root和其他代理暂停CPU测试及构建，最后自有browser/server/monitor均清理。

上述动效结果只说明该次CSS pending可与同Owner JS活动计数区分，未观察到JS任务残留，不证明私有Map身份、物理paint或正式及时性。旧strict3s FAIL raw SHA `50f49e9b1d0b6bad53f16a80b1a3ddbdb22793bf24a5f5c794074dd185d121a4` 守卫不变；NOT_CERTIFIED继续保留，不能用新的单次zero推翻。真实环境为Headless Edge147/SwiftShader WebGL2、single-thread-compat、普通优化WASM；物理DPI、Native/WebView、Linux、真实GPU及完整B/X/H资格继续NOT_TESTED。

### 2026-10-07 追加：GameFlow 固定 World Owner 与兼容工厂重建

本片继续 M1/M2，未重复重构物理、渲染或 UI。原 a4211 的 12 份真实源码先按 manifest 保存到 `game-flow/before/`；Root Core/compat 的实际混合换行原文另存 `root-before-retry1/`。第一次迁移脚本错误假定 CRLF，在生产写入前失败，日志保留，重试只匹配实际原文。保护主指令、既有发布、用户项目和来源未知 `new.py`。

| 实际文件编辑 | 影响与保留条件 |
| --- | --- |
| `runtime/gameFlowOwner.ts`（新） | 明确固定 World、live settings/scene、独立默认状态与私有暂停倍率；原 8 个 API、6 字段、9 个函数算法、score/session/checkpoint 限制保留。 |
| `runtime/gameFlow.ts` | 纯兼容 facade，保留原状态视图和旧出口；通过唯一显式 provider 调用 Owner，不默认导入 Editor/Vue，不在 import 时读取 World 或启动时钟。 |
| `editor/gameFlowAdapter.ts`（新） | 可信 Vue 同 raw 视图和单根兼容组合。新 World 显式创建新固定 Owner并保留原 shared view/暂停倍率，旧实例不隐式 retarget；不承诺并发独立 Editor Worlds。 |
| `runtime/gameplayComponents.ts` | 移除直接全局计分 import，contacts 增加可选第 5 个 score callback；Core 注入同一 Owner，旧 4 参数只在实际 Collectible 路径要求 legacy provider。其余函数全文件逆变换保持原文。 |
| `runtime/GameplayRuntimeCore.ts` | 明确 Owner 默认构造与可选第 4 参数、9 个 GameFlow 调用及 Collectible callback 接线；构造拒绝错误 World，begin/frame/step/active stop 拒绝隐式 World 替换。第三 debug 参数仍兼容，原服务/Host 检查及 lifecycle 顺序保留。 |
| `runtime/GameplayRuntime.ts` | 保留原公开默认入口与单例，Editor 显式组合同根 Owner；继续是耦合兼容入口。 |
| `scripts/lib/gameFlowCoreContract.mjs`、`fixtures/game-flow-core-transform-v1.json`（新） | 精确逆变换 Core/compat 到片前整文件 hash；不忽略其他方法体。 |
| `scripts/lib/gameplayWorldHostContract.mjs` | 先逆变换新增 GameFlow 接线，再做原 Host 整文件 hash 守卫；原合同不放宽。 |
| `verify-engine-gameplay-world-host.mjs`、`verify-engine-gameplay-world-host-contract.mjs` | 增加独立 report-dir，避免覆盖旧 19/8 证据；更新观察范围，不把已经迁移的 GameFlow 仍标成全局。 |
| `verify-engine-script-profiler-caller.mjs` | before fixture 使用实际旧 GameFlow/contacts 配对，避免旧 Core 误接新 legacy provider；原 17 项/ABI/JSON 断言保留。 |
| `verify-v26.14-runtime-stage.mjs`、`verify-v26.27-runtime-stage.mjs` | 新 Owner 使用实际 import，Editor factory 接原受控 store bindings；原 48 项业务断言保留。 |
| `audit-engine-boundaries.mjs`、`audit-engine-source-boundaries.mjs` | 追加两个真实 GameFlow 入口检查，原严格失败规则不变；不为不存在或 erased 模块伪造通过。 |
| `verify-engine-game-flow-owner.mjs`、`verify-engine-game-flow-core.mjs`（新） | 真实原算法对照、状态独立/legacy 重建，以及真实普通 WASM/Rhai 的 Core begin/frame/stop。后者原 13 项字节守卫不变，仅追加实际 Editor World 重建检查。 |

初始独立 Owner before 原模块 7/7、after 14/14，通过 checkpoint/暂停/限额及实际 Collectible fixture；第一轮新夹具缺 player tag 的 12/14 失败保留，仅修夹具。初始 ledger `game-flow/handoff/ledger.json` SHA `a19c00c42dd199980f25503b75d4b2b7b9b0f9cfb2885bedf0a89333e961afb3` 不覆盖。纯入口编译闭包 7 模块/0 Editor/Vue/store，不是所有 Gameplay 依赖已隔离。

新接线确实引入兼容工厂缺陷：切换 World 后创建新 Runtime，工厂仍持有旧 Owner 并抛错。`v26.14-unadapted`、`v26.14-current`、`v26.27-current` 的失败日志均保留；后两次根误并行执行，使用同一旧 runtime-compiled-wasm 输出目录，明确不授予配对资格。修复为窄范围 `rebindLegacySingleRootHost` 新建固定 Owner，保留 shared state 和 private resumeScale，不把暂停倍率默默重置为 1。独立修前新增 16 项为 14 PASS/2 FAIL，修后首轮的 proxy/raw 夹具等号错误亦保留；修正为 live 身份与 toRaw 身份双检查后 16/16 PASS，原 14 项未删。完整修复证据 `game-flow/rebind-handoff/ledger.json`。

修复后 `game-flow/v26.14-current-retry2.json` → `v26.27-current-retry2.json` 顺序执行，各 48 PASS、20 VM 全释放。`check-rebind.log` 全量类型检查 PASS；新 Host 合同 8 PASS，整文件 GameFlow 逆变换后仍恢复原 Host 基线。`budget-caller-rebind/after.json` 18 PASS、24 真实 VM callbacks、4097 API prefill；不是 4097 次 VM，也不将此次 Owner 接线宣称为新诊断性能收益。早期该片 DebugOwner21、Off before/after17、Host正常19报告仅证明各自记录的源码配对，不冒称全都在最终构建重跑。

真实 Core 修前对照为 4 个兼容检查通过、5 个多 World GameFlow 隔离失败；修后原 13 项通过。新增真实 Editor World 重建后 14/14 PASS，`game-flow/core-integration/handoff-v2.json` SHA `970a8251ae1185a123c8cc1c840213face411a98cc36aead4f7dd314e23b7f65`，actual after `after-mV9xCi/report.json` SHA `d575de16dd97399bda74ef769cb09f7e07c251bcbfe2e500beb3c39fe92c1344`。真实 Rhai command 与下一 context、暂停/score/session/checkpoint、错误注入及旧 Core 拒绝 retarget 验证，7 Core input/VM、4 World 清理，运行中 sourceChanges=[]。Collectible 使用真实组件函数加 fixture contact event，并非 Rust solver 碰撞证明。

统一 optimized-profiling 产物 `engine-profile-9c0eb59498a2b41366dc`、sourceHash `9c0eb59498a2b41366dc27deb81007bb9529094a6073d9c65ab63a13c0a3d7f1`，构建 13.47s。580 源在构建前后和 receipt 时全部匹配，271 产物复制后全部 hash 匹配；不可变目录 `profile-dist-9c0eb59498a2/`，manifest SHA `1e1f47ecbdedc53405166cafe351f26c658dfba0999aa356c9de4171b9e41f1c`。`game-flow-integration-9c0eb59498a2/integration-receipt.json` SHA `978facfb168b3eace1bb750bdb3f57035e376f21bd592fe955efd83eead1e8ae` 保存 6 个实际生产文件编辑、gates、失败/重试 raw 和独立 ledgers；diff-check PASS。真实 GUI 尚待本产物验证，不借旧截图授予资格。

完整边界仍 **NOT_PASSED**：source Core55/compat58/Player17，compiled Core22/compat25/Player39/emitted34；新 GameFlow 两入口 source/compiled 均0。与 a4211 相比兼容/Player 增加的是显式 Editor adapter，保持诚实可达性；较少 source违规不是完整 M1 完成。checkpoint 仍 UUID/scene UUID 身份，generation/epoch 未升级。`worldGameplay` 仍会通过全局 World 消费 foreign Character requestedMotion，组件速度/cooldown/diagnostics、dynamicObjects/pool/流送仍有隐藏 Owner，下一片需真实接线与回归。Rust 权威/版本化 ABI、Engine Worker、WebGPU、独立 Player、全局原生额度、流式资源及完整 B/X/H 与 Native/Linux 验收仍未完成，既存严格 Reduced Motion 失败不由本片改变。

9c0e 实际公开编辑器功能 GUI 已验证；`game-flow/gui/handoff-game-flow-9c0e-v1.json` SHA `3d003d0289f690993606d181e56f756985d455ab5d9eddd627d33f01d6b11582`。新 driver `verify-engine-game-flow-owner-cdp.mjs`，真实 chooser/Open、Play、viewport Space、Console、Stop/Save/fresh reopen；271 封存产物 hash 全部匹配。a4211 同 11 实体/59 序列化组件/41 非removed 组件的真实 saved project，仅 ephemeral 副本一个 Rhai asset 的 source/byteLength/6个既有 hash/lastValidSource 共9字段改为测试探针，原移动/readout 保留，输入与场景/设置不改。

attempt1/2 的新增 helper 访问顶层实例变量 `audit_pending` 报错并按原 error policy 暂停；生产未修改。探针仅在宿主 update 入口内联变量操作。attempt3 的7项实际通过：新 Play 空状态、score101/sessionone/checkpoint、score123/changed/paused/scale0、Space resume/scale1、restore101/one、Stop/Save无数据污染、再 Play 空状态。第8项错误假定 scene_reload 清空 GameFlow，保留为 FAIL；源码 reset 只在 begin/stop，重载保持会话是原语义。attempt4仅补2项通过：实际重载日志及 awake→next update 仍101/one/checkpointtrue，fresh chooser reopen/new Play 为0/missing/false/scale1。两次共9项实际覆盖，**非单次9/9**，不覆写原失败或复计前7。

原 reference 项目 SHA `9b070ae2…30ba`、a4211 saved fixture `aba83b30…70ec` 未变。ephemeral baseline、actual Stop Save、fresh reopen Save 字节 SHA 均 `cfe5f48525b14123b407e0cbb4b0725d8cc3ec1c1dee911ce8855ca6c9d227e6`，diff=[]。Root 亲自读3张 Console PNG：暂停/恢复/checkpoint是下一 callback 日志，重载真实兼容值，fresh reopen 空状态；首图是日志证明，不能称暂停时刻单帧画面。浏览器/driver Win32 残留0，harness server/profile finally清理，无独立observer。环境为Headless Edge147/SwiftShader WebGL2、DPR1/zoom1；这轮无正式性能或动效采样，World对象身份/Native/WebView/Linux仍NOT_TESTED。证据使用9c0e Core及同hash旧Host快照，当前workspace下一WorldGameplay接线不借这些GUI授予资格。

### 2026-10-07 进行中：完整 WorldGameplay 直接编排 Owner

只读实际调用链与23源快照：`world-gameplay/readonly/review-B7UEh2/report.json` SHA `ff8bc4f88c2df5cb9c78bde4275168b613658f8712ed194478b9427b5a759701`。范围是实际23函数/13公开API，并非此前估计的18函数或12公开API；角色叶节点独修不能防止同一tick区域/portal/流送继续触及Root。迁移完整direct orchestration及私有maps，原AI/pool/navigation/streaming/tile/evidence/particle服务显式注入，不用默认空回调删除功能。Host缓存按实际suppliedHost身份，明确legacyRoot才用原sameRaw视图，foreign/custom host不按相同World合并摄像机/scene。隐藏共享服务继续NOT_PASSED。

Root编辑3源：Core必需explicit factory、同Owner 9调用及4生命周期guard，实际 suppliedHost receiver绑定；`gameplayWorldHost.ts`新增capability与统一camera类型；`editor/gameplayWorldHost.ts`明确this接线和legacyRoot原状态identity。旧3/4参数保留。Root16文件before最终 `world-gameplay/root-before-retry1/`（4生产源匹配9c0e），初次写到部分快照因记错caller文件名ENOENT而中止，保留partial且未改生产；迁移脚本的第一次空token逆变换失败亦在生产写入前停止并留存，重试改用完整import锚点。`worldGameplayCoreContract.mjs`及精确fixture新增，先逆到9c0e，再原GameFlow→DirectHost整Core守卫通过，无忽略方法体；旧helper追加这一步，边界gates追加两个真实Owner/facade入口。V14/V27仅适配实际Owner及既有受控store binding，原业务断言保留且顺序各48 PASS；Host合同8 PASS。

Phase1 `world-gameplay/owner/handoff/ledger.json` SHA `07ec235e25c2fc2d8ee18838b046c6a41a979d4da7c5c7f4c0602dce1d07ba0f`：Owner/facade/Editoradapter/新专用verifier快照，23body精确逆变换，actual before4/after10、同raw Vue观察、原WASM Character/origin/实际SceneStreaming与10个原服务hash均保留。不是最终资格：全量check确实exit2（`world-gameplay/check-phase1.log`），发现Editor nominal身份比较、camera.targetOffset原本可null的类型遗漏，以及navigationPaths残留旧变量。后者调用会ReferenceError，不仅是类型问题；正在修接原Map的port并添加真实selector验证。Root类型修复只把可信Editor identity比较cast为unknown，不clone/coerce，`editor-host-type-fix.json`与修前文件/Rootcontract保存，仍整文件inverse到原EditorHost。

Phase1实际Core/WASM配对 `world-gameplay/core-integration/handoff.json` SHA `481ad1c7763f082491a0c7e1e62c16b99955afa334b954056762fc14f43c9fc0`：before3 PASS/7 direct FAIL/1 shared FAIL；after13 direct PASS/1 shared FAIL。真实foreign Character/Rhai/fixed input/WASM移动、原Editor不变、Area、Portal请求（原Host真实拒绝未注册目标，仅请求路由）、原点/native/camera、factory/Worldguards及stop验证；旧7个污染失败完整保留。B.stop仍清空A/B共享simulation evidence，不能说整体隔离通过。before169/after171实际模块hash、sourceChanges=[]、3 Core input/VM及3 WASM与recording wrapper cleanup均保存。此报告仅phase1源，不用于未来修复源；未跑GUI/性能。

另一个实际反例已确认：reset后同UUID fresh stream队列会被旧microtask消费。phase1原算法故意保留且标CONFIRMED_RETAINED；下一必要phase2增加Owner私有代次，reset/finish递增、callback最先拒绝过期代次，确保不删除fresh队列或操作旧World。原反例、phase1源及raw不覆盖，修复须新报告及精确逆变换白名单。AI、其他服务Owner与帧协议不在此窄修中偷偷更改。最终check/build/gates、phase2实际Core和新GUI仍待执行，不把进行中标为整轮完成。

WorldGameplay phase2已实现并在当前源码复测：navigationPaths接回实际navigation Map，camera允许既有null，Editor身份比较只增加类型cast；Owner私有streamGeneration在reset/finish递增，旧microtask首先拒绝过期代次，finish立即同步pendingStreams=0。第一轮额外generation检查8项通过但finish-only pending仍1的诊断已保留，最后修复新增断言后实际stream原before3控制PASS/4目标FAIL，final8/8 PASS；中间raw不覆盖。`owner/phase2-handoff/ledger.json` SHA `ed163172b7f1eb3fcb31b02a7b24601b42151f52d79b4dc7f3230f71ccd08a4d`，明确新增selector/type/generation/pending逆变换白名单，再恢复phase1及23原函数body，不放宽算法守卫。

`check-final.log`全量类型检查PASS、`host-contract-final/source-contract.json` 8 PASS、`debug-owner-final.json`21 PASS、V14-final→V27-final顺序各48 PASS/20 VM释放、diff-check PASS。真实Core final `core-integration/after-GgZVUh/report.json`再次13 direct PASS/1 shared evidence FAIL，sourceChanges=[]；不是14全通过，也不把fixture Area/Portal contact冒称solver碰撞证明。

统一optimized-profiling产物`engine-profile-39140bde1d91e401c225` sourceHash `39140bde1d91e401c225ad3d189ec0b94a3917af4b8c412ac00cbc1467698084`，build13.25s，582当前源码、271原及复制产物全部hash相符；manifest SHA `7a6bff81118ece3929369c0e0b1183d66168a675eb82b1b79bd3f22f8b22e39d`。不可变目录`profile-dist-39140bde1d91/`，Root receipt `world-gameplay-integration-39140bde1d91/integration-receipt.json` SHA `c567fa859040809edd448b87dc9b17eefa716b34974dd991fd146d63da3b016f`封存6个实际生产文件编辑、所有失败/修复/gates；不是发布版，不覆盖26.37。

完整M1仍NOT_PASSED：source Core41/compat44/Player17，compiled Core22/compat26/Player40/emitted35；新WorldGameplay Owner和facade的source/compiled均0。source变化与显式port有关，compiled legacy新增Editor composition是诚实可达性，不能从数字下降宣称Player已独立。该产物真实GUI进行中，后续源码不能借旧GUI资格。shared evidence、组件状态、动态资源/池等Owner继续未过，Rust/ABI/Worker/WebGPU/Player及正式B/X/H和Native/Linux无新的资格。

组件只读实际复现`gameplay-components/readonly/handoff.json` SHA `efbb8da2…836657`：4控制PASS/6隔离目标FAIL，跨World速度/冷却/时间推进/begin/诊断污染CONFIRMED，无源码修改；下一最小修复是挂在固定WorldGameplayOwner的GameplayComponentsOwner、pure initializer保留。reset仅清本Owner缓存，stop保留原会话诊断统计；retire按准确端点，不能用substring误删。会话字典另有真实512容量继承键绕过及本地__proto__字典语义缺陷；真实Vue只读候选实验6项通过（`game-flow/session-keys/9c0e-attempt2/handoff-v1.json`），direct defineProperty(proxy)不通知deepwatch的反例保留，目前尚未生产修复。

### 2026-10-07 进行中：组件缓存与会话字典的已确认缺陷

Root独立编辑`gameFlowOwner.ts`的setSessionValue单一方法：容量判断改为hasOwnProperty.call，不能靠toString/constructor/hasOwnProperty等继承键绕过512；__proto__专用plain copy+enumerable/writable/configurable data property，通过state.session替换确保实际Vue深监听通知，普通键保留原赋值路径。safeValue、trim/slice80、64,000 JSON字符、null拒绝、512上限以及其他8算法字节完全不动，不增加key黑名单、不创建另一Owner。before SHA `4879d6cd…a1696`，after `670a645b6770458285e75bf38ade5be4fa9c3cd25cfa5c72649faa9dc40ccdf8`；`session-keys/production-fix/`修前/后和source-edit.json均保留。

新增`fixtures/game-flow-session-key-transform-v1.json`和`lib/gameFlowSessionKeyContract.mjs`，只接受整Owner精确after哈希与单方法count1，再恢复整before4879；`verify-engine-game-flow-owner.mjs`先做该独立逆变换，再原9函数body守卫，原业务断言不删除。已执行整Owner逆变换PASS；这里只是IMPLEMENTED及source contract验证，真实生产Vue/脚本/存档仍待新报告，不能借只读candidate6PASS算已修复验证。该字段字典引用仅proto写入时替换，原state/View/World引用不更换；原型修复限定本地字典，不宣称全局原型污染或脚本安全沙箱问题。

39140真实GUI发现新启动接线缺陷，0项通过；`world-gameplay/gui/39140-attempt1/`保留raw和failure PNG，Root亲读实际对话框`WORLD_GAMEPLAY_LEGACY_PORT_REQUIRED`。chooser确认项目upgrade时旧world settings API调用发生在lazy Editor Layout/Gameplay factory安装之前；source调用点physics.ts serialize426/1889和load1797、main未导入worldGameplayAdapter。没有取得生产stack细节，不能仅据source断言精确哪个snapshot首先触发。原project/reference/manifest守卫均保持，未运行Rhai/移动/导航，不把未执行项标PASS。Root最小修复只在`src/main.ts`的App import前显式import Editor adapter，旧入口SHA `7e633355…c8d1`→`c1cf397d83c37b831f96dd6f0504fb2666f82db5966c9380a9797174fd05a75a`，`world-gameplay/editor-startup-fix.json`及修前main保留；adapter只安装原sameRaw lazy provider，不启动World/lifecycle，pure Runtime facade不回导Editor。新产物GUI尚待验证。

组件实际Core before必要closure172份源/WASM已冻结至`gameplay-components/core-integration/before-39140-CiOrty/`，source.json SHA `39e41e9faf6b866813cb7361bd603447978432185e0f9f0f09e643042e962dd9`逐项符合39140manifest，明确overlay GameFlowOwner旧4879，而非把当前670workspace冒称旧产物。只读设计`readonly/design-jTAcUA/report.json` SHA `acb43be52888494c8934c22b45ffe4131adcef7653af59e41afbd7425b4380ce`记录12调用点及§30/64影响。

Root Core将原begin2/update2/contacts1/stream initialize1改用固定WorldGameplayOwner.componentsOwner，加唯一getter/type import；stop仅清child缓存保持累计diagnostics，entity退役清对应cache。第一实施Core `91c3f7…f90f5`原样保留；审查随后指出服务抛错会跳过清理，已在原WGO reset/retire位置使用try/finally，finally只操作固定旧child而不再经liveWorld getter，保留原异常、调用顺序与后续原抛错行为。final Core SHA `6158ab3f84237a0c658a4ded13a3a3473873063adaa45ccae225f8d9982b99c3`。8step精确fixture和`gameplayComponentsCoreContract.mjs`新增，旧Hosthelper先components→WGO→GameFlow→原Host，整Core逆变换恢复原`a2695bbf…fc07`PASS；旧gate仅追加两个真实component入口，forbidden/status未放宽。Owner尚在实施，整体编译/业务及抛错cleanup待验证，不在中间不完整源码跑测试冒充最终。

### 2026-10-07 已验证切片：Components / session 字典 / Editor 启动接线（80d68）

这是 M1/M2 的连续局部实现，不是 M0–M8/X0–X6 整体验收。commit 82c9c03118848df1c07af323c38a3abade7dd21b、main；主指令和 AGENTS 未改，旧 releases/26.37 与用户项目不覆盖，来源未知 new.py 保持保护。

| 本片实际生产编辑 | 作用与保留条件 |
| --- | --- |
| 新 runtime/gameplayComponentsOwner.ts | 固定 World 和独立 verticalVelocity/hitCooldowns/diagnostics；原 7 函数算法保留。增加准确 source/target 参与者索引用于 retire；旧冒号 key 语义不变。reset 只清缓存，累计诊断保持。 |
| runtime/gameplayComponents.ts | 原出口保留，纯 facade 和共享无状态 initializer；唯一 WGO provider，无第二 Owner registry；legacy contact 只在实际 Collectible 路径取旧 score callback。 |
| runtime/worldGameplayOwner.ts | 同固定 World 组合唯一 componentsOwner；其余原 23 编排方法整文件逆变换守卫保持。 |
| editor/worldGameplayAdapter.ts | 原 diagnostics raw 的 Vue view 安装一次，legacy Root 同 raw，foreign 新独立状态。 |
| runtime/GameplayRuntimeCore.ts | 原 begin2/update2/contact1/stream initializer1 接同 child；原 stop/retire 用 try/finally 清 child 缓存，保留服务异常和顺序。 |
| runtime/gameFlowOwner.ts | 单方法修复 own-key 容量判断和 __proto__ data property，原普通赋值/限制/其余算法保留。 |
| main.ts | 项目加载前显式安装 lazy Editor WGO provider，修复实际 GUI 的 LEGACY_PORT_REQUIRED；不启动世界或反向引入 Editor 到纯 Runtime facade。 |

组件 Owner ledger gameplay-components/owner/handoff/ledger.json SHA 0401bfc14c8a1c93ae304a19afc48f3edf8097acaf3e259c3e1b2aa3b5652baa：同业务组 before 3 PASS/6 FAIL，after 15 PASS（包含新增 guards），7 个纯模块边界无 Editor/Vue/store。精确 inverse helpers、fixture 和 gates 新增同真实入口；GameFlow/stream 旧 verifier 只调整真实组合及 inverse 链，不删原业务断言、不忽略方法体。

真实 Core/WASM gameplay-components/core-integration/handoff.json SHA 2ab9c5a467b2c91b875debd4c1f4ed80bcb83f1de162b4056436eff8f0037a6a：同 22 个组 before 13 PASS/8 component FAIL/1 shared FAIL，after 21 PASS/1 shared FAIL；另有 after-only 4/4 PASS，不能把不同分母冒称 26 对 22 全通过。实际两 World 相同 UUID 的控制速度、contact cooldown/time、begin/stop/retire/异常 finally、原 Spawner/场景提交与普通 WASM 操作验证；contact events 是 fixture 注入，不是 Rust 碰撞资格。B.stop 清空共享 simulation evidence 的失败保留。4 个 Core input/VM、3 个 native World 清理；运行源 hash 守卫不变。修后完整报告 SHA c54a490626b8e24e7a5248edb3a3b3dd0412d72e64e56772a801e0eef98646ae，首轮 25 PASS/1 shared FAIL 和 JSON bootstrap 缺 fixture 的失败均保留。

session-keys/production-670-handoff-v1.json SHA 7ee2b4c0088a1e9b6058584e59138b964fa130a8abc300f9f8c8286c72340e9a：真实 Vue 10/10（含 add/update/checkpoint restore/watch、512继承键和原限制）及真实普通 WASM/Rhai 2/2（session_set→Core→Owner→下一 update session_get、checkpoint、满容量拒绝继承键但允许原 own key 更新）。初期 direct defineProperty(proxy) 不通知 deep watch 的只读反例未删除；修复实际替换仅 session 字典引用，不替换 state/view/World。真实 GUI 的特殊字典键未测。

统一 optimized-profiling 构建 engine-profile-80d68e74761f015a742f（非 release）：sourceHash 80d68e74761f015a742f348ceb1f61648e31459e785df21be9d085894e21f468、manifest SHA 68dee038865101f718ac8b926dac43e4897b5bc51f3434965fed4f6a88c56760；583 源/271 原及复制产物匹配，build 13.66s，不可变 profile-dist-80d68e74761f/。Root receipt components-session-startup-integration-80d68e74761f/integration-receipt.json SHA 62e50099979e6e1eaaa640baed0f372868b8c0695cdc2290749cf0cc7e5248ec。全量 typecheck PASS、V14→V27 顺序各48 PASS/20 VM释放、原 GameFlow16/stream8/Host8 PASS、diff-check PASS。整文件旧 Core inverse 仍恢复原 a2695bbf…fc07。

该产物实际公开 GUI world-gameplay/gui/80d68-attempt1/handoff-v1.json SHA fa58423900427e80a1dfc2fab15ed48120e9e604a60d0388d48d3b8b9a17fb96，raw SHA 0dc688d71c778ed0cf9d8036e857cbad4961dfa80a4193fddd7236361f69410b：4/4 功能 SHORT_SMOKE，通过 chooser 打开→实际 Play/KeyD/Space native pose（x -4→-2.933，jump true、y -2.59995→-1.171）→WorldStudio Navigation debug selector→Stop/Save→fresh reopen/new Play。只以 readonly V8 precise coverage 验证真正 compiled navigationPaths 入口 count1；原 optional 包 disabled/0agent，只验证空 selector，不冒称非空 pathfinding。相同 11 实体/59 serialized/41 nonremoved 组件、窗口1600×900/DPR1/zoom1，ephemeral Rhai 9字段探针保留原移动。三次保存 diff=[]/SHA 30d01acc2b0d52f6a652dd7388d9f2a8330346f11386940b885b6c9b153165e2，原项目/reference 与271产物守卫保持。Root 亲读移动/跳跃 Console 和 Navigation 两张 PNG；自有浏览器/server进程0。

39140 GUI 0 PASS 的失败图/raw/handoff 继续保留，新产物才获得上述资格。80d68 为 Headless Edge147/SwiftShader WebGL2/single-thread-compat/baseline WASM，没有性能或动效采样，CDP/coverage/screenshot 扰动不能作计时结论。source Core40/compat43/Player17、compiled Core22/compat26/Player40/emitted35；整体 M1 仍 NOT_PASSED。Comfortable 16/44、留白、圆角和精确输入没有退回；旧 strict Reduced Motion FAIL 不由本片改变。Rust authority/ABI/Worker/WebGPU/独立 Player/全局额度/流式资源、正式 B/X/H、Tauri/Linux/真实 GPU 仍未完成或 NOT_TESTED。

下一已确认最小切片：仿真 history 需按固定 World 隔离，checksum 当前仍用 shared-legacy-ai，不能宣称 AI 隔离；Dynamic/Prefab/Pool 仍实际使用 Root 世界，独立只读烟测 1 PASS/3 FAIL。两个来源无关的修改分别实施、分别保留 before，Root 串行集成同一 Editor adapter/Core，防止并行覆盖。尚未给新源码构建/GUI资格。

### 2026-10-07 已验证局部：Simulation Evidence history 固定 World

只修已复现的记录污染，尚不升级 AI 权威、Worker 或协议。不可变 before-80d68-gc1jcs/source.json SHA b12ef29486a5792a6abd811d3b521811d0f02394f84137307d1666fe36b15183 保存173真实生产/WASM依赖并逐项匹配80d68；没有拿本轮过渡源充当修前。实际before-gCGJ4i/report.json SHA eee4c8958a55ac2042a7182ecffd121bdc5595b94356a9ad7e8d55c04c3d5eea：同10组=5旧行为PASS/4历史隔离FAIL/1真实AI checksum隔离FAIL。

| 实际编辑 | 影响与保留 |
| --- | --- |
| 新 runtime/simulationEvidenceOwner.ts | 固定World和独立四字段state；必需checksum port显式声明shared-legacy-ai或匹配fixed-world。唯一共享原checksum/capture/clear算法，600帧、排序/1e9量化/16hex/FNV参数、disabled早返、首divergence、clear保留enabled及frames数组身份均保留。Owner只接受当前固定World实际数组。 |
| runtime/simulationAuthoring26.ts | 旧public checksum/capture/clear签名继续接任意显式数组，委托同纯算法；原报告/preflight/validation函数原文保持，原raw单一Vue视图不变，无新provider或registry。 |
| 新 editor/simulationEvidenceAdapter.ts | 显式legacyRoot身份和同raw检查；Root原视图、foreign新plain state；当前唯一真实checksum port使用原AI blackboardSnapshot，scope明确shared-legacy-ai。 |
| editor/worldGameplayAdapter.ts | 4个精确delta：旧全局evidence import/字段移除，base ports类型Omit，每次World Owner组合创建自身evidence service。Core和WGO本片字节不改。 |
| 新 verify-engine-simulation-evidence-owner.mjs、lib/simulationEvidenceContract.mjs | 原算法AST/body/math及整facade exact守卫、不可覆盖输出，真实两Core普通WASM与Vue原视图验证。 |
| 新 simulationEvidenceEditorContract.mjs/精确fixture、旧 gameplayComponentsOwnerContract.mjs | 新Editor4delta whole inverse→18064，再Components→f293，保留旧完整body/状态验证，不忽略其他编辑。 |

Root首次迁移误假定该局部行末CRLF，整文件hash正确但exact occurrence=0，生产写入前失败；原attempt1.mjs和实际failure log保留于root-editor-integration/。修复只使用原文该行实际LF，不全文件归一化，whole inverse通过；Editor after SHA 6cd86c8685fe93283eebbe4279b415d481431ca142a4731016b537397700c50a。Owner3311eee050cc2223932386007806250fc59df1a6b27f7294e9d227f43ec986d0、facadeee9f3b6e96e8c94bd39b573fbb5f9a3cf0f0a9eafb1e26e3efcbb2d268b7ae2f、newAdapterf423c2d72e4e2936ec405ba64ee2474f0c1f69b42b898bbb257c6f2933669e83。

Owner-only after-2JcL9Q/report.json SHA 904072eacc9f6bd90357548bb4b128d124996b4f839c5d0fcc10aafd3a21c11b 为10PASS/1真实AI FAIL，只初始化普通WASM而未执行Core lifecycle，不替代集成资格。随后单片实际after-eInEqU/report.json SHA 2ed650a10f4532c93e1d68313417f5fc14d62fa40c6e2d45986f465b80bf48d8：原同10组=9PASS/1AI FAIL，原4历史污染全部修复；另新增2guard组PASS，总11PASS/1FAIL。真实B.stop前后A的frames1/2、lastChecksum、enabled=true、divergence=-1和active状态完全相同；B清自身记录且enabled保留。600上限、重复frame、wrong entities/connections、seeded constructor无清理副作用、原6类authoring report、same raw/frames/reactive watch/deepwatch均PASS。真实同UUID AI blackboard1→2仍使A checksum改变，保留为remaining-shared-ai FAIL。

此报告sourceChanges=[]/overlayChanges=[]，只4个生产delta配对80d68，2Core inputdetach/VM释放、3WASM World free成功；没有用空服务替换原AI/navigation/pool/stream/particles，未掩盖服务耦合。环境Node22.22.2/Windowsx64普通WASM功能验证；无GUI/Player/Worker/GPU/Motion/正式性能资格。旧组件报告shared evidence FAIL是历史配对，不能覆盖改成该构建PASS；本片另有明确修复证据。Renderer后续Dynamic/Pool源写在此实际测试结束之后启动，新组合须重新集成验证。

### 2026-10-08 追加：RuntimeObjects 与 Evidence 统一集成（M1/M2，X0/X1 关联）

继续当前 main / commit `82c9c03118848df1c07af323c38a3abade7dd21b` 的已授权迁移。保护原主指令、增强版、AGENTS、既有发布及项目文件，不读取或执行来源未知 `new.py`。本片没有改 Rust、公开 packet/ABI、物理数学、精确输入、渲染后端、舒适几何、动效参数、依赖或版本号。下列 14 个生产文件是对已封存 80d68 构建的实际差异；6 个为新文件。

| 生产文件 | 实际编辑、影响及保留合同 |
| --- | --- |
| `runtime/runtimePrefabInstantiator.ts`（新） | 单一共享 bundle/Prefab 算法，固定 World；原身份、父子、连接、嵌套 layer 与组件数据语义保留。显式必需资源/创建/生命周期端口；作者选择端口缺失时在任何分配前拒绝。 |
| `runtime/objectPoolOwner.ts`（新） | 原池算法迁入固定 World，实例、释放 hook、默认时钟、emitter 各自拥有；无第二套计时器或全局 registry。修复迁移中默认参数误引用为 `this.runtimeClock()`，单独补验无参数路径。 |
| `runtime/dynamicObjectsOwner.ts`（新） | 原 7 函数固定实体/父子/句柄查找与突变的 World；原 FNV、限制、pending、文本与缩放算法保留。snapshot 保留原显式 entities 参数，通过必需生命周期端口读取。 |
| `world/sceneEntityData.ts`（新） | 原场景记录类型与唯一 `storedComponent` 实现下沉，不改项目格式或字段默认值。 |
| `runtime/worldGameplayOwner.ts` | 同一固定 Owner 组合上述三子服务，旧池入口改为自身子服务；原 WorldGameplay 算法完整逆变换保留。 |
| `runtime/objectPool.ts` | 旧公共 API 委托既有唯一 WorldGameplay provider；原 `export let emitPoolSignal` 保持可调用，不新建共享池。 |
| `runtime/dynamicObjects.ts` | 旧公共 API 委托同一 Owner，旧单参数 snapshot 仍可用；生产 Core 使用显式 World，不经旧根查找。 |
| `runtime/prefabs.ts` | 作者入口复用单一 bundle 算法，窄资源读取端口公开；移除 2 个已无用途导入。create/apply/revert/unpack/variant/Undo 原作者函数体保留。 |
| `store/physics.ts` | 记录类型 re-export、`storedComponent` 下沉、bundle 创建委托共享实现；移除已无用途导入及一处原迁移注释尾空格。其余 18 个 builder 函数体、作者保存与 Undo 算法未改。 |
| `runtime/GameplayRuntimeCore.ts` | 14 个明确迁移点接入自身 Prefab/Pool/Dynamic 子服务，覆盖 begin/stop、两种 Spawner、Rhai spawn_at、resolve/mutation/despawn/snapshot；原安全点、顺序、异常 finally、数据上限保留。 |
| `editor/worldGameplayAdapter.ts` | 实际资源 reader/builder/toRaw/原生命周期/log/clock 作为必需端口组合；每个 World 创建自己的 Evidence。无全局 Owner fallback；独立纯 builder/catalog 仍未完成。 |
| `runtime/simulationEvidenceOwner.ts`（新） | 前一局部片实现固定 World 的 4 字段证据状态、600 上限和原 checksum/capture/clear 算法，本次统一产物实际包含。 |
| `editor/simulationEvidenceAdapter.ts`（新） | 同 raw 可信 Vue 根视图与 foreign fresh state；实际 AI 端口明确标 `shared-legacy-ai`，不伪称隔离。 |
| `runtime/simulationAuthoring26.ts` | 原作者报告/验证/预检保留，共享纯 checksum/capture/clear；随后仅移除 1 个无用途导入及 1 个注释尾空格，两次修补原文、精确 inverse 和独立报告保留。 |

相关工程文件逐项处理：新增 `lib/runtimeObjectsOwnerContract.mjs` 和精确 fixture 验证 21 个迁移算法、4 个 Owner skeleton、5 个完整原文件；新增 `lib/runtimeObjectsCoreContract.mjs`、`lib/runtimeObjectsEditorContract.mjs` 及各精确 fixture 验证 Root Core/Editor 迁移；新增 `lib/simulationEvidenceEditorContract.mjs` 及 fixture 验证前一 Evidence Editor 4 delta。`lib/gameplayWorldHostContract.mjs` 先逆 RuntimeObjects 再逆 Components/WGO/Flow/Host；`lib/gameplayComponentsOwnerContract.mjs` 增加新 World/Editor 局部逆变换后仍执行原组件合同。当前整链 Core/World/Editor 恢复最初 SHA `a2695bbf…c5fc07` / `767465af…62ab5` / `f29375bf…36e`，未放宽原 body/字段检查。

新增实际 `verify-engine-runtime-objects-owner.mjs`、`verify-engine-runtime-objects-core.mjs` 与独立专项/作者测试保存真实 before/after。旧 `verify-engine-game-flow-owner.mjs` 只更新必需、明确未使用时抛错的 fixture 端口，原 16 断言保留。`verify-v26.14-runtime-stage.mjs`、`verify-v26.27-runtime-stage.mjs` 只更新受控宿主：必需 ID、真实 builder/serialize、Evidence adapter 别名、同子 Prefab 受控桥接与清理；每份原 274 个 assert 表达式、49 个静态 check 调用体（含原有条件分支）与全文件 inverse 保留，普通 WASM 各实际执行 48。该受控 Prefab fixture 不等于真实资源实例化或 GUI 验证。

`audit-engine-source-boundaries.mjs`、`audit-engine-boundaries.mjs` 增加 7 个实际新/兼容入口，原 forbidden 与遍历规则不改。新构建中旧 dynamic facade 实际无编译 module、import reference 或 emitted chunk；首次明确 209575 gate 因必需 module assertion 中断，原日志保留。仅该新入口改为显式 `NOT_EMITTED_NOT_A_BOUNDARY_PASS` 并核对零引用、零 chunk membership；整体状态计算拒绝将它算作 compiled pass。完整其余违规继续输出，既有入口缺失仍抛错。

Owner 账本 `dynamic-objects/owner/handoff/ledger.json` SHA `9d7bed51173841b289c8fc13621cc933d7cdba96ab09c6c7ee30040b9e5a87ff`：原同 8 组由 2 PASS/6 FAIL 到 8 PASS，纯 compiled Owner 图另 1 PASS；新增独立 13 组 PASS。19 个 builder 与 147 个原函数 body 完整合同通过。原/当前同实际作者 API 对照各 1 PASS，Undo/Redo 原行为均 runtime 数字 ID 7→2、作者 UUID 稳定；新增 fixture 首次错误要求数字 ID 稳定，失败保留，按原真实合同纠正该新断言。无参池时钟曾有迁移 ReferenceError，单独失败与窄修复后验证均保留。

独立真实 Core 账本 `runtime-objects/core-integration/handoff/ledger.json` SHA `37d2e929e433049354cbb32225d3297b9644dc8f66ef1212561b875f078c99f3`：同脚本、同 11 组，before 3 对照 PASS/8 ownership FAIL → after 11 PASS；before `before-UOR3oD/report.json` SHA `fa40b94dc6b3ab8b4b643c88b4b7447eea3507345196f12b0fd0c96c1ec47bf5`，after `after-MZejVk/report.json` SHA `ab339bafc8ea5fe7bd9ac42820a514060cafa6733a9429300a8429fc6144e08c`。真实 Rhai、两个固定生成入口、父子/连接、独立池 hook/时钟、B.stop 活跃 lease、过期句柄与一次异常 cleanup 通过。Root 用原 `World.update(.11,true)` 预建非空 56 Float64 / 448 字节状态，逐元素与前后 snapshots 一致，clear 0。7 Core、6 WASM World、13 处记录包装均清理，sourceChanges=[]。

该 before 不是伪装的均一构建：80d68 原 173 文件 + 已独立验证的 Evidence 4 override，总 175 文件，原 manifest/hash 与明确 overlay 独立记录。首次 fixture 的 UUID、连接/文本、角度预期、B.stop 已过期前置及空 native view 问题均保留；最后同 11 组使用有效前置与原公开 `normalizeAngle` 精确结果，不改生产算法、容差或测试分母。

受控 V14→V27 顺序回归各 48/48 PASS、各 20 VM alloc/free；handoff `runtime-objects-controlled-v14-v27/attempt1/handoff-v1.json` SHA `5a2d964d8de6b48bf0e8261f5d9ac05f9c0c83dc118eef9ea29f10d56c9295a8`。Root `pnpm check`、Host 8、GameFlow 16、stream 8 与 diff-check PASS；首次 7 个真实 type error 修复日志保留。首次 GameFlow 报告参数错误触发旧报告拒绝覆盖、旧 compiled gate 误继承 80d68 路径均保留，未计作新产物成功。

统一产物 `engine-profile-209575ec1aff70a0b0d2`，sourceHash `209575ec1aff70a0b0d2f9f96a6f14a1d55d43ba69de833e7410204bfe0f16c1`，optimized profiling build 14.89s，589 源/271 产物逐 hash 校验并复制到新的 `.cache/engine-overhaul/profile-dist-209575ec1aff/`。manifest SHA `fbc9df252914bc75d0834e9b8543eff7eaf34b38a8a14e23137609fb2facbb06`；Root 收据 `runtime-objects-evidence-integration-209575ec1aff/integration-receipt.json` SHA `b2e807891b1c4c0adc5ef213b001d3b5ae9c78be47ef76fc78705c456939162b`，包含 14 源快照、gates、脚本合同、原失败、独立功能证据及未通过项。不是新发行或冷编译 Rust 资格。

同源码 source Core31/compat34/Player17 违规（原80d68为40/43/17）；新 Owner 入口均 0、unresolved 0。同产物 compiled Core22/compat27/Player41/emitted36（原80d68为22/26/40/35），后三项实际多出新 `editor/simulationEvidenceAdapter.ts`，不能以源入口减少伪称整依赖隔离改善。整体 M1 仍 NOT_PASSED，compiled legacy dynamic 仍 NOT_EMITTED。纯 Owner 函数不引 Vue 不等于实际 Editor/Player 组合已纯化。

§30/64：World 生命周期、实例化/池缓存、旧 API/作者 Undo、原 fixture、合同与生产依赖报告已处理局部关联；catalog/builder/global lifetime generation/worldEpoch 仍 PARTIAL；AI/navigation/stream/particle 隐藏 Owner 仍缺失，Evidence 同 UUID AI blackboard 污染 FAIL 保留。未改调度额度、线程拓扑、packet、GPU 或 UI，本片不声称并行收益、输入延迟、FPS、全服务安全或正式性能资格。真实209575 GUI正在独立执行，运行后另追加结果；旧80d68的GUI证据只属于原产物。QualityLocked/AdaptiveExperience、B/X/H、strict Reduced Motion deadline、真实显卡、Tauri WebView、Linux仍未通过或 NOT_TESTED，不能据短功能 smoke 宣布完成 M0–M8/X0–X6。

209575 公开 GUI 后续已完成，handoff `world-gameplay/gui/209575-attempt1/handoff-v1.json` SHA `a1135f5b6cf47681856738afb8d879cf0d46cbd436980e333b0bc44b9969275e`，raw SHA `385b69d7e352c174058d58a7c9cbb19ddc69fe3a62d7d30ffc293fb5c5660518`。沿用原完整 driver `ffd34937682b932d9d621b08e9126734cfb44d66ecc857ee790b4980fdff859c`、相同 11 实体/59 序列化组件/41 非 removed 组件、1600×900、DPR1/zoom1。4/4 实际 PASS：public Play 的原生 Rhai 姿态/输入查询，D 轴移动 x−4→−2.9333、Space 单次边缘及 y−2.600→−1.1711；public Navigation overlay 到新产物唯一 compiled facade，V8 entry count1；Stop/public Save；fresh chooser 重新打开及再次运行/保存。原始/停止/重开三份下载保存同 SHA `30d01acc2b0d52f6a652dd7388d9f2a8330346f11386940b885b6c9b153165e2`、JSON diff[]，只在临时副本改 9 个有界 Rhai 观察资源字段，原项目和参考文件不变。

589 current 源、271 immutable 产物、driver/manifest/receipt 前后 hash 全匹配；自有 Node/browser/server 已退出，14:58:04Z 进程复核 0，cleanup SHA `111e7453a26b794d0bde63f8acf0bc8ec666943d7f203d6a20c336b79355bd28`。Root 亲自读取运动、Navigation、fresh reopen 三份 PNG，真实面板/Console 与原非空关卡存在，Comfortable 字号/控件/圆角视觉未在此片退回。三张静态图仅验证实际渲染与可读布局，不证明动画过程或性能。

环境实际 Headless Edge147.0.3912.72 / SwiftShader WebGL2 / single-thread-compat / baseline WASM；渲染上下文 848×560（CSS/backing 一致），物理 DPI、真实 foreground/原生 WebView unknown/null。本 fixture 没有 NavigationAgent2D，Optional package disabled，count1 是空 selector 分支；不能称非空寻路通过。Tile facade 无公开 emitted UI consumer，未用私有调用替代。公开 Prefab Undo 未在该 driver 中存在，明确 NOT_TESTED；前述 Node 真作者 API 对照只属于它自身范围。V8 coverage、截图/CDP 扰动未用作 frame/CPU/GPU/显示延迟数据。正式 QualityLocked/AdaptiveExperience/动效与跨平台门槛继续保持未通过/未测。

### 2026-10-08 — M1/M2 固定世界 AI，X0/X1 关联接入

继续同一 main / `82c9c03118848df1c07af323c38a3abade7dd21b`；增强版主指令完整 0–68 节及末尾资料已读，保护基线与既有发布。本片不更换框架/依赖、物理或 AI 数学、Rust/ABI、运行输入、渲染、UI token、动效或版本。相对统一209575构建，实际生产差异恰为以下7源、其中3新源；逐字节记录在 `ai-integration-dc45610d35bd/integration-receipt.json`。

| 源文件 | 每项实际编辑及影响 |
| --- | --- |
| `runtime/aiOwner.ts`（新） | 原算法的唯一实现：9个Map、2个公平游标、诊断、时钟/资源/观察端口与emitter固定在每个世界的实例。规范完整实体数组走原路径；有效同世界子集/重排保持原输入与prune语义；外来或脱离世界的同UUID实体在副作用前拒绝。随后仅移除一个未使用的 `MAX_PERCEPTION_RESULTS` 导入，常量与预算保留。 |
| `runtime/aiDocuments.ts`（新） | 原文档类型、纯normalizer、感知格尺寸与三个原上限唯一实现；不引Editor、Vue、资源数据库。 |
| `runtime/aiTools.ts` | 保留全部旧导出，改为唯一已安装的惰性Owner端口、同raw诊断与纯文档re-export；缺少真实Editor启动组合明确报错。旧 `emitAiSignal` 仍取出回调后裸调用，保留原receiver语义。 |
| `editor/aiAdapter.ts`（新） | 显式实际AssetDatabase、graph trace/error、profiler、单调时钟端口，绑定原receiver；原raw的Vue视图保持。安装provider不提前读取世界、不另建全局Owner缓存。 |
| `runtime/worldGameplayOwner.ts` | 仅AI接口增加固定world及异步结果检查；要求返回AI与当前Owner同世界，否则走原load错误通道；原isCurrent、stop/restart和finally保留。 |
| `editor/worldGameplayAdapter.ts` | 从原全局动态AI导入改为每个WGO创建一个固定AI，唯一WeakMap登记同实例；loadAi与Evidence均使用该子服务。惰性旧入口从当前Editor WGO解析并检查归属，不另建Owner。 |
| `editor/simulationEvidenceAdapter.ts` | 必需端口改为该固定AI的blackboardSnapshot，检查world与方法并正确bind；删除旧共享AI getter连接；原Root同raw Vue视图及foreign fresh state不变。 |

算法证据：原20个函数声明、2个顶层箭头及全部63个含嵌套函数体、4份全源skeleton、旧aiTools整文件逆变换通过。原行为预算、深度/循环/非法值处理、2048公平推进、10,000代理上限、感知排序、Wait与state machine算法保留。新增 `lib/aiOwnerContract.mjs` / `fixtures/ai-owner-transform-v1.json` 不放宽原body；导入修复前后fixture分别归档。新增 `lib/aiIntegrationContract.mjs` / Root精确fixture覆盖2+7+6个明确组合delta；现有 `runtimeObjectsOwnerContract.mjs` 与 `runtimeObjectsEditorContract.mjs` 只增加该精确逆变换入口，原检查完整保留。Core/World/Editor/EvidenceAdapter整链恢复 `a2695bbf…c5fc07` / `767465af…62ab5` / `f29375bf…36e` / `f423c2d7…69e83`。独立新Root资格脚本首次相对导入路径错误保留，只修该新脚本路径，未改生产或原断言。

实际Owner测试 `ai/owner/handoff/ledger.json` SHA `b2a12a67c359d866560437a7703930f85025c025d68a5e34af42c00bdb36e394`：同9组 before2 PASS/7 ownership FAIL → after9 PASS；新增7组专项单独7 PASS。首次after第二份Vue宿主bootstrap失败保留，只调整新测试初始化时点，不能算首次全通过。真实Editor同raw watch、WGO.loadAi、Evidence同实例、端口receiver、有效子集与外来实体拒绝均有运行证据。最后导入修复资格 `ai/owner/import-only-qualification/report.json` SHA `0ea709037990b232196dca2d27704e82d46a4bc85a4edcd88c6f2302a9bddacc`：整文件仅移除一个unused import，逆变换和原63body通过；功能raw属于修复前源码，未冒称重新跑过。

独立实际Core账本 `ai/core-integration/handoff-pq02nM/ledger.json` SHA `b80dfcb92160c6dbd790bfe6fc9491a4730321dc2310df2845b2627499f68ea7`：同8组 before2 PASS/6 ownership FAIL → after8 PASS，另3新归属guard PASS。before `before-pUM580/report.json` SHA `7730927bce3220df16e4a141b4c71937f0a9dfa014d8bfc00c04b7f2dc023d71`；after `after-86WDeh/report.json` SHA `f711e3f418642d4044ef989f5916a9bf680d6c89addf4c85c8a3ee6dd5d32ac0`。原完整209575589源/WASM字节是before来源，actualSSR176→179加载、实际7个生产delta逐hash核对。真实Rhai action与Wait、两个相同UUID世界、停止/退役、blackboard checksum、state machine显式signal、延迟load stop/restart及诊断观察通过。Root原非空56 Float64/448字节逐元素保持、clear0；15 Runtime输入/VM、14 WASM、31处拦截清理。原生AI广播没有新增；旧外部Host的数组删除仍NOT_PASSED，未把AI隔离通过写成全Host通过。

旧 `verify-v26.17-bindings.mjs` 先只增加4个实际世界前置，18个原check及90个原assert表达式完整保持。首次真实suite在业务组之前报 `AI_LEGACY_PORT_REQUIRED`，旧宿主未导入正式Editor组合；报告与清理问题保留，0项业务通过。正在仅增加正式 `editor/worldGameplayAdapter` 启动入口，再核对全文件逆变换并运行原suite；结果另追加，不能预标PASS。此前历史Evidence shared-AI checksum FAIL仍保留，仅本片独立同世界AI证据证明当前连接已修。

两份边界gate仅增加3个AI入口，旧forbidden、遍历和必需模块断言全部保留；移除新增入口后整源SHA与旧209575封存收据完全一致。当前source Core31/compat34/Player17、unresolved0；compiled Core22/compat28/Player42/emitted37。后三项比209575各多1个实际 `editor/aiAdapter.ts`；新增纯AI三个入口两种gate均0违规，但整体M1依然NOT_PASSED，dynamic兼容入口仍NOT_EMITTED_NOT_A_BOUNDARY_PASS。不能以纯叶子通过或tree-shaking代替正式Player隔离。

统一新产物 `engine-profile-dc45610d35bd14b6a156`，sourceHash `dc45610d35bd14b6a156d7526c99d87121a83a193c1e3a1d56b166e1f73b29d5`；optimized profiling 24.16s、592源/271产物前后匹配，新immutable `.cache/engine-overhaul/profile-dist-dc45610d35bd/`。manifest SHA `e606cfd65fb1884497d4cb8aa78466e7342b73a1bd9091232ab3a41b6c994464`，Root收据SHA `21f3d577427b04315445e08e20ff0016035102688dab007447d2c3b29ffe2ab3`。`pnpm check`通过；首次unused import exit2保留。现有2.4MB输入adapter chunk与大chunk警告未通过隐藏警告解决；构建耗时不是游戏性能比较，也不代表冷编译Rust或正式发行。

§30/64关联：固定世界AI、Editor诊断观察、Evidence checksum、WGO异步生命周期、旧公共端口及预算/算法合同已处理本片范围；精确滑块/视口/关键帧、renderer、packet与UI参数不适用本片。外部Host同numericID删除与选择污染、pure builder/catalog、navigation/stream/particle剩余状态归属仍需后续实现。新产物公开GUI正在资格验证；QualityLocked/AdaptiveExperience、正式B/X/H、真实显卡/原生WebView/Linux、strict Reduced Motion与整轮M0–M8/X0–X6继续未达标或NOT_TESTED。本片没有测得并行总收益、GPU时间或真实显示延迟，未知值不填0。

V17后续实际18/18 PASS、exit0；`ai/controlled-v17/attempt3-final/v26.17-bindings.json` SHA `5ba7d9dcc388ea70c33081082442b3d90503e5e514f53ac571e8adfac9c882fd`，result SHA `654211f5e21c2389671573605be6ac00771f85cbd85f2a24bf38fd8804e26682`。第五前置只在entries导入正式Editor WGO启动入口，无手工fake getter/Owner；原18组、90断言及全文件逆变换保留，最终fixture SHA `4f87416717a4970e602ad3f36aaff10b56dc1a3c99706bf09c7dfed019ea9d5e`。25个显式跟踪脚本/源前后相同，原finally完成native free与opened.close；首次0业务通过的failed attempt、临时目录清理证据独立保留。25个测试跟踪文件不冒充592个构建源；manifest仅包含profile构建脚本，V17不在构建源分母中，无需为测试前置重构建生产。此是受控Node普通WASM功能回归，不能当GUI/性能资格。文档首次误记的代理上限已按实际共享常量修正为10,000，源码数值未改。

### 2026-10-08 — M1/M2 调用者世界删除与共享实体构建器统一集成

继续同一 main / `82c9c03118848df1c07af323c38a3abade7dd21b`，不重做已验证 Owner。相对 dc456 统一构建，本片实际9个生产文件变化、5个新增；不是新增引擎功能或第二套世界。增强版/AGENTS hash保持原值，版本26.37和已有发布不改。

| 生产文件 | 每项编辑、影响与保留行为 |
| --- | --- |
| `world/entityRemoval.ts`（新） | 单一共享结构删除算法显式接收调用者实体/连接集合。原倒序连接归一化、场景顺序subtree Set和实体splice顺序保持；返回ID Set供原作者选择尾部使用，生命周期/Undo仍由原调用者负责。随后仅将2个参数类型缩窄为 `Pick<World, 'entities' \| 'connections'>`，避免强求Vue解包类型具有World私有字段；全部5个含嵌套函数体逐字不变。 |
| `editor/gameplayWorldHost.ts` | 原删除函数属性改为receiver-aware方法，读取state一次；原Root实例走旧作者入口，foreign实例操作自身world。缺失/错误receiver不回退全局Root。其余scene/quit/authoring服务仍有Editor依赖，本片不将整个Host认定为Player安全。 |
| `world/entityBuilder.ts`（新） | 原18个完整builder算法及3个字段常量唯一实现，原50种extended构造、默认值、有限值/几何/UUID/组件启用与移除标记保留。创建器要求真实live message与原Tile cache invalidator；不拥有World、不插入实体、不提交事务。 |
| `runtime/tileMapValues.ts`（新） | 原 `integer`、`normalizeTileMap` 与两个上限下沉；默认层UUID、单元/变换/碰撞语义保留。 |
| `runtime/particleEmitterValues.ts`（新） | 原clamp/vector/curve/gradient/Particle normalizer唯一实现，排序、边界、默认数据保留；不搬动粒子模拟、渲染或实际值。 |
| `editor/entityBuilderAdapter.ts`（新） | 唯一惰性无World状态的builder服务，连接实际live翻译和原Tile WeakMap失效函数；不提前读取Editor世界。 |
| `runtime/tilemap.ts` | 原公共normalizer改为共享re-export；其余原chunk缓存、绘制、碰撞/编辑函数保留。最终仅去除一个unused type import，114个含嵌套函数体与TypeScript擦除后的JS逐字不变。 |
| `runtime/particles.ts` | 共享clamp import与normalizer re-export；原ParticleSystem算法、时钟、绘制和全局生命周期尚未迁移，不将纯value模块冒称完整粒子Owner。 |
| `store/physics.ts` | 原连接/子树删除委托共享函数并保留原选择尾部；原createEntityFromData/identifier/shape入口委托实际Editor builder，保存/加载/作者编辑继续使用同一算法。Root34步builder精确重放保留先前Host修复，随后只去除unused type及9组件导入，共36步；清理时179个实际函数体逐字不变。 |

Host真实配对账本 `host-entity-removal/handoff-wwjyFP/ledger.json` SHA `fcbc65b521ff33983ed6aaa8da5ce4b2f6f9993b5756bbeb421a4aeeff13f122`：同6组 before3正对照PASS/3foreign FAIL → after6PASS；7个独立新guard另记PASS。before真实同numericID foreign destroy错误删Root父子/连接/选择且自身子native查询仍命中，保留原raw。after实际Rhai frame与stepOnce、重复destroy、回调各一次、独立原生查询、Root非空56Float64/448字节与同ID非空1792字节状态、连接/选择、作者Undo/Redo均通过，不用空World或假删除端口代替。此历史配对属于Host895f/c6源，未冒称最终Builder组合源码。

Builder账本 `entity-builder/handoff/ledger.json` SHA `7cc36ec44fc23b2d143a7b0443602e55f073bfefeb09f9e1b7ffe2e70d814f2a`：同10组前态10PASS、当前10PASS，共同全部输出0差异；另4项required ports、receiver/live locale、原WeakMap warm/失效和纯依赖验证PASS。70条原始输入（含非法值/Infinity，原始表示独立记录）、实际组件/作者保存/Undo/Redo及Prefab create/apply/revert/variant/unpack保持。前态 `actual/before-DQlw98/report.json`，后态 `actual/after-X0utB3/report.json`；全部25原函数声明/默认参数、59含嵌套body、7完整skeleton与3整源inverse通过。独立pure source25/compiled21、三个value/builder入口0违规，无DOM/定时器依赖。

该新fixture的首次语法/前置错误、10组曾6PASS/4FAIL与9PASS/1FAIL、后态14功能PASS但严格serialization比较FAIL均保留。最后仅控制新测试的模块初始化UUID/Date并保持performance.now真实，统一含Infinity的完整原输入表示；没有屏蔽存储字段或改变生产算法/旧断言。功能raw属于Tile fad8/Physics59ba源；最终unused导入清理有 `entity-builder/import-only-qualification/report.json` SHA `07af13da…efcd1f` 与Root `host-builder-root/type-only-qualification/report.json` 的完整逐字逆变换，未冒称重跑过14组。

新增 `lib/entityRemovalContract.mjs` / `fixtures/entity-removal-transform-v1.json` 保持99个Physics原函数、97个未改body及完整detach/delete逆变换；新增同步 `lib/entityBuilderContract.mjs` / 精确fixture保持25/59全部原逻辑、参数和整源。旧 `runtimeObjectsOwnerContract.mjs`、`worldGameplayCoreContract.mjs` 只增加新Host逆变换；随后entityRemoval helper只在原证明之前增加Builder逆变换，全部旧检查不改。Root最终 `host-builder-root/whole-inverse-final-attempt1/whole-inverse.json` 验证Core/World/Editor/EvidenceAdapter/Physics/EditorHost六整链，Physics恢复最初 `e69139b0…b2554`、EditorHost恢复 `80e81d1e…d2db8`，前述四条原SHA保持。

首次完整typecheck失败保留于 `host-builder-root/check-attempt1.log`：unused imports及World私有字段型错误。最终只做上述import和窄参数修正，不以cast、删除测试、关闭检查或改数学处理；`pnpm check`最终exit0，diff-check exit0。根代理额外执行最终真实组合的原6项Host回归：`host-builder-root/host-smoke/raw-after-Pki61f/report.json` 为6/6PASS、sourceChanges=[]，5Core/6普通WASM World/23记录包装完全清理。新增缓存副本只将4个Builder源加入原完整closure与独立输出目录；全部原6组和原assert完整不变，整driver inverse通过；原Host配对driver不改。

统一产物 `engine-profile-95da1912fc92b591b580`，sourceHash `95da1912fc92b591b5803cec01c3c5e3acc626b05aa2f430ee135a54c3db3f37`；optimized profiling23.30s，597源/271产物全部hash前后匹配，immutable `.cache/engine-overhaul/profile-dist-95da1912fc92/`。manifest SHA `b967b4e52c48791738e8d38ad826c1f7d1a1b75f79d84c879f92d7513cc238bb`，Root `host-builder-integration-95da1912fc92/integration-receipt.json` SHA `34e6362c76ffd7973ee80d1756f5778caa4bc634fc769c98482fbbaf2a508bdd`；9源快照、最终helper与两gate、功能raw、原失败及未通过项在收据中。此为诊断产物，不是发行、冷构建Rust或正式性能对照。保留大chunk警告，不提高警告阈值掩盖它。

两gate只增加4个实际pure入口，原所有forbidden/遍历/必需entry/整体状态规则字节不变。新四入口source/compiled均0违规；整体source Core31/compat34/Player17，compiled Core23/compat29/Player43/emitted38，比dc456各多一个真实 `editor/entityBuilderAdapter.ts`。所以纯builder接入尚未改善全Player组合隔离，整体M1仍NOT_PASSED；dynamic兼容模块继续NOT_EMITTED_NOT_A_BOUNDARY_PASS。不是只交付未用新类，但也不能据此宣布Runtime/Player完成脱离Editor。

§30/64关联：调用者世界/子树/连接/native清理、原作者选择与Undo、场景记录与Prefab创建、live翻译/Tile缓存、legacy入口、原契约与完整边界报告已处理本片。Rust权威世界/句柄epoch、catalog与detached loader、navigation/stream/particle生命周期仍PARTIAL或待实现；没有修改packet/Worker调度、GPU、shader、固定步、精确拖动/滑块、UI尺寸/圆角/动效，相关参数变更不适用本片。QualityLocked与AdaptiveExperience各自仍无新增正式资格，B0–B8/X01–X15/H1/H2、真实GPU/nativeWebView/Linux、strict Reduced Motion门槛未达/未测。源码行数、线程数或构建秒数均不作为性能提升证据。

### dc456 真实GUI失败与有界输入诊断（独立历史产物范围）

原严格driver在 `world-gameplay/gui/dc45610d-attempt1/handoff-v1.json` SHA `1138caa47eac5ec619ce1068420bc2a62b614f2b8bfadf7931e75230fd067a36` 保存真实首次600ms方向键FAIL，首组未通过、不能算4PASS。真实Play/Rhai/native pose已运行，游戏canvas焦点前置PASS，但sample之间未观察到轴1；不将失败归因于焦点或虚构消费延迟。Root亲看失败PNG；其finally已Stop，所以不是midPlaying截图。

仅一个新的缓存受控诊断副本保持全部4原check/38assert、同11实体/59序列化组件/41非removed组件、1600×900/DPR1/zoom1及9个有界Rhai观察资源字段。D改为真实按住直到原最新axis/x谓词满足、15s独立硬截止/finally keyUp；原Space边缘不改。`dc45610d-diagnostic-attempt1/handoff-v1.json` SHA `92c59055644fd11066d4e70ecd5ca822db056bea00b13b9e26d71a33c60fb72c` 为4/4受控功能PASS；Stop/Save/fresh reopen三保存仍原同hash，原项目与参考文件不变。两个窗口visible、hasFocus、trusted keyboard、active canvas均确认。page D保持约1675/1694ms才达到原谓词，page rAF最大1128.9/985.8ms；不能以长保持PASS覆盖原600msFAIL或称低延迟通过。原identity-linked receipt/consumption缺测，不推算input-to-photon。

两个probe的bounded数组drop0，finally移除自身listener/rAF且自有browser/driver0。raw SHA `eeb57f14d49ae91c42a27e77279c3f5ce788bb39d8b04c9457ef08b5b5882d79`、analysis SHA `55183cec8c459a2054600fb67baf1dacb2006c051800f8d7180ea79885b1afab`。Root亲看midPlaying movement/native pose图，真实非空关卡、Console与舒适布局存在；不是动画或性能资格。271dc456产物保持，live592中恰4个Host/Builder已有差异独立列出，不把旧immutableGUI当新95da源码GUI通过。

只读稀疏rAF分析 `dc45610d-sparse-raf-readonly-attempt1/readonly-ledger-v1.json` SHA `f4ec402d4de84b74825450cd0cd6fe99ed7fd7aab8d0781b5f6874e57202a74e`：WorldCanvas及5观察模块在209575/dc456/current逐字相同，Playing idleFrameDelay=0，未发现明确1Hz游戏节流。现有snapshot仅计数/字节/队列，未采集CPU阶段或完整Host trace；稀疏page rAF现象CONFIRMED，主循环/浏览器具体原因仍HYPOTHESIS。新95da已授权一次相同受控功能路径与公开bounded `drain(64)`原始trace采集；结果待另追加，不预标新GUI或延迟/性能PASS。

95da后续实际受控功能与trace短测完成：`world-gameplay/gui/95da1912-trace-attempt1/handoff-v1.json` SHA `82175f8de7984e3e86a3a200a1ec801f1fdffec827ced0863276ca1066b696f9`；raw SHA `be19964aefa2ac775da5c52060af70dbd1b338de9293b49da245ee129131887d`，analysis SHA `babb9ee06555b2c397e41c9167775999adea284f6d92754c36ca70b2c54e4c1e`。4/4原业务check PASS，但仍是受控按住D路径；没有为原600ms授予新资格。597 current源/271immutable产物前后完整匹配，项目/参考/主指令/AGENTS/旧driver/shared helpers均守卫，browser与driver0、自身probe均移除。三张midPlaying/导航/fresh reopen截图保存；Root亲看movement/nativepose图，非空关卡、HUD/Console、原16px舒适布局和真实Playing存在，静态图不证明动效流畅。

新缓存trace-driver只增加每个已有movement窗口前后各一次公开 `drain(64)`，四个batch原文保存；原4check/38assert、受控D副本完整inverse均保持。两窗口各3个实际Host样本：covered `cpuFrameMs` 分别97.1–150.0ms和122.0–140.0ms，Host rAF间隔641.7–820.8ms。以连续样本的前帧coveredCPU与下一rAF配对，4对占比11.8–17.8%、未覆盖gap567.3–727.3ms，只能在本95da组证伪“整个长间隔都被begin→complete同步wall占满”；不能把本组CPU数据回填dc456，也不能归因于Profiler/Vue/浏览器或宣称性能改善。World API submission间隔604.2–877.3ms；4个identity-linked `inputToSubmitMs` 为476.5/762.5/502.4/576.0ms，其他null，事件identity没有公开，不能硬配成D/Space或input-to-photon。6个GPU样本均null，物理显示延迟不可知。短样本/软件GPU/CDP/有界probe扰动不能替代正式120s×5与30min采样、真实硬件或两画质轨的冻结对照。

用户补充当前只有这台Windows机器；Linux x86-64与真实低配/集显H2现场验收记NOT_TESTED，不把Windows浏览器或SwiftShader当Linux/H2通过，也不擅自降低正式目标。对外“约25%”是本轮整体实施进度粗略估计，不是冻结能力评分、测试分母或验收通过率。独立Player/Rust权威世界/publicABI/EngineWorker/WebGPU与完整性能动效平台门槛仍必需待完成。

### 2026-10-08 — M1/M2 共享资源值与项目只读目录，X0/X1 关联

继续 main / `82c9c03118848df1c07af323c38a3abade7dd21b`。相对95da统一产物，本片恰6生产源变化、2新源；既有未提交工作、新旧项目、主指令、AGENTS和已发行26.37保持。没有改Rust、PAKv1/schema29、Player入口、固定步、GPU、精确输入、舒适尺寸或动效默认值。

| 生产源 | 每项实际编辑与后果 |
| --- | --- |
| `runtime/runtimeAssetValues.ts`（新） | 原资源URI身份、排序索引、模块查找、资源查找和两种原文本解码的唯一共享实现。实际Editor调用已接入；类型使用最小结构视图，不经AssetRecord类型桶引入Editor/renderer依赖。保留不同查找语义：身份区分大小写且排序后碰撞last wins；module路径fallback取原数组first；resource折叠UUID大小写并取原数组first。 |
| `runtime/runtimeProjectCatalog.ts`（新） | 对明确projectId/revision和可信已准备plain数据，独立clone一次、递归freeze并建立私有索引；提供只读ScriptServices和必须注入的实际visual compiler。拒绝getter、隐藏字段、符号、class、binary view、非有限值、循环和稀疏数组。额外测试发现Array子类绕过prototype检查，随后只修这一个条件；不宣称可以检测任意Proxy。此目录没有正式Editor/Player调用者，当前只具Node资格。 |
| `assets/AssetDatabase.ts` | 原ensureIndex、assetGuid、resolveAsset、readTextAsset委托共享算法；原generation/indexSize和实际live记录身份不变。原read/write文本类型literal改用一个冻结共享常量，写入、byte元数据、时间、依赖和事务原body不变。没有把Editor live records替换成clone。 |
| `assets/assetReferences.ts` | 原assetSourceText委托同一个严格UTF-8/16MiB算法，原limit对象下沉并re-export；引用扫描/重写、节点/深度限额和哈希算法保留。严格UTF-8与脚本读取的非fatal解码保持两种原语义，不混为一个新解码规则。 |
| `runtime/resources.ts` | 仅原resourceRecord委托共享lookup。资源normalizer、variants、64层继承、创建/更新及旧AssetDatabase依赖保留；不能把整个resources模块称为纯Runtime。 |
| `editor/gameplayScriptServices.ts` | 原resolveModuleAsset箭头委托共享原算法，仍读实际live数组。原writeSource、revision、listIdentities、graph compiler和breakpoint身份检查保持；Core实际使用该Editor组合。 |

新增 `lib/runtimeCatalogContract.mjs` / `fixtures/runtime-catalog-transform-v1.json` 与两个专项verifier；原Root shared helpers不改。合同核对95个原top-level完整body：8项明确机械变化白名单、87个完整body逐字保留；7个共享原算法body、4旧源完整inverse、唯一原allowlist和唯一16MiB limit通过。新fixture的第一轮脚本用了非Nova生命周期名，before4/7失败raw保留，仅修新fixture为原start/update。额外plain测试首轮2/3失败真实暴露新Array subclass缺口；旧88d54源/fixture/raw保存，唯一prototype条件逆变换证明后重跑。最终新catalog SHA `ec4d8106960aa3f5be7465d87d207f8a1c208b12ee93998104ac5f4c084972ff`，另5源不变；不存在删除失败或放宽旧算法容差。

独立账本 `player-runtime-catalog-preparation/handoff-KOxYaf/ledger.json` SHA `a3dd55ef154fbe67fbc3d0121ea7441690291582769665cc58a42a760230240b`。同driver SHA `f2a31022a62f2a6a59609f00559f800aa4b5aeb22745f34d1c1470877f0306f0`，before-XWsc3Q同7/7PASS，final after-hKkGL8同7/7PASS与独立新增3/3PASS；真实Editor/AssetDB/graph compiler/Core/Rhai/普通WASM参与，不是stub。最终contract-MbivLq3/3PASS，包括三个负向篡改拒绝和八个plain边界。严格8文件pure类型closure以TS5.6.3/strict/noUnused双项检查0诊断。

功能before入口核实完整597基线；after功能后置守卫覆盖544个src/pkg源、SSR实际加载187路径，不能称该功能run后置核了全部599。最后独立seal复核599全部真实字节、变化仅6；Root另保存统一599完整源快照 `catalog-root/before-91ccbff99c92/source.json` SHA `b76fb7d6b36786ad3d30208138c34bce318cd9502ec9a01252768ca301005c0f`，0overlay。before5/after9实际Core全部inactive、输入解绑且Rhai VM释放；每次run的1个root physicsWASM释放。此cleanup不代表音频/GPU全生命周期通过。

Root全项目 `pnpm check` exit0，diff-check exit0；新optimized profiling构建13.19s（不是性能收益），build `engine-profile-91ccbff99c927376083f`，sourceHash `91ccbff99c927376083ff9654bcc7be716ede0df2b92e386df45e32ec50f6354`。599源/271产物逐hash复核并复制新的immutable `profile-dist-91ccbff99c92/`，manifest SHA `eaf02569386fe018599c3ddf70c6d50a6266ca071b12951c8c9e9bda44cbc845`；Root收据 `runtime-catalog-integration-91ccbff99c92/integration-receipt.json` SHA `a0abd8f8abfbd73ef536ef0bbc92a504071d02d99315d05167ecff30a555dd02`，包括6源、support、原raw失败、两gate、类型/构建日志和未过项。保留2.4MB chunk警告；这是profiling产物，不是发行或Rust冷构建资格。

两gate仅加2source/1compiled入口，移除新增delta后全部95da旧规则逐字相同，无新增缺失module例外。实际values入口source/compiled0违规；catalog source0违规，但实际compiled graph中module/reference/chunk均0，明确 `IMPLEMENTED_VERIFIED_NODE_ONLY_NOT_EMITTED`，不计compiled边界通过或生产Player接入。整体source Core31/compat34/Player17、compiled Core23/compat29/Player43/emitted38与95da相同，M1仍NOT_PASSED。新独立目录需要由实际detached loader/Player使用，不能强塞假caller让产物出现。

§30/64本片关联：资源身份/原查找与解码、Editor live写入/热重载/breakpoint语义、真实Core脚本、plain项目隔离、损坏数据、完整依赖与构建证据已处理局部范围。PAK安全/迁移就绪/入口Ready、detached场景加载与Player、navigation/stream/particle Owner、Rust世界和公共packet仍PARTIAL或待完成。没有改线程/调度/GPU/UI/motion，本片不增加并行收益、FPS或动效资格。新的91cc实际公开GUI回归单窗口正在执行，另追加结果；95da GUI只属于旧产物。QualityLocked/AdaptiveExperience和正式B/X/H仍未通过，原600ms输入与strict Reduced Motion失败保留；当前仅Windows，Linux/nativeWebView/真实低配环境继续NOT_TESTED。

91cc实际公开GUI随后完成，`world-gameplay/gui/91ccbff-regression-attempt1/handoff-v1.json` SHA `caaf10e18ebdd7468e194cf68f82b5c6e8af43625ce046667d0d514987d69d86`，raw SHA `8398ae069e8a1e303eca029af0c5c1085e78df3bba1d57d0eaf7a91e913990d0`。原95da driver完整bytecopy，4check/38assert、11实体/59序列化组件/41非removed组件、160probe/9有界资源字段以及1600×900/DPR1/zoom1保持；只新cache guard/output绑定91cc。4/4实际PASS：public Play方向/原生Rhai Space，公开Navigation空selector，Stop/public Save及fresh reopen运行/保存。599current源+599零overlay archive+271immutable产物前后全hash匹配，主指令/AGENTS/项目/参考/旧driver/shared helpers保护，after guard SHA `f41e607634c38ffa57a1a4ffa80a29bbdfcdd6d41bc05392064b6ef9fe9b924f`，自有browser/driver/probe0。

Root亲看新的Playing movement/nativepose PNG，真实非空平台场景、HUD、Console轴/跳跃记录和舒适Shell存在；不是空场景截图。原四个bounded drain batch原文保留，没有新增采样或做新性能比较。仍是Edge147/SwiftShader/WebGL2/single-thread-compat/baseline WASM浏览器功能smoke，不是真实GPU/显示延迟/正式帧率/动效过程/nativeWebView资格。Navigation optional disabled且fixture无NavAgent，只证明selector入口；原600ms与Reduced Motion失败继续保留。每10分钟汇报中的约26%是整体实施估算，非能力评分或验收通过率。

### 2026-10-08 — 寻路交接与资源包读取：已复现风险，候选资格验证中

继续以统一91cc的599源/271产物为基线，不重新进行M0–M8重构。寻路原始实现的两项同步Vue重入风险已有实际反例；机械按世界拆分另复现旧finally清除新任务active。第一轮生命周期候选仍失败于同Owner重入、旧reset清空新Owner实际Agent路径、已取消任务抛出NAVIGATION_STALE。原始运行分别保存在 `navigation/preparation/controlled-91cc-20261008-attempt1/actual-original-Ab3ZHH/`、`actual-mechanical-Jt4ZqO/`、`actual-lifecycle-WnJO0Y/`；前态交接 `handoff-v1.json` SHA `9f0a5333306f07d143265ce62307252690f0101b068c9bcd6ef05249cd2033f0`。原数学/采样/默认值的121个body与完整逆变换检查只证明这些内容保留，不替代运行通过。混合模拟时间/墙钟问题仍单列，未在本片修改。

寻路新增修复仅在缓存候选中：当前任务与可继续运行状态分开；共享诊断使用唯一写入token；先进入closing再清理，惰性provider在唯一WGO缓存发布后激活；失去权限的旧诊断Map读取也不能再取得新世界对象。审查发现的普通取消active不清理回归正在修复。未把任何尚未通过的候选写入生产，也未宣称导航出口完成。

PAK确认的调用链是原生 `runtime_project_document` 选择首个 `project.nova`，旧TS `parseNovaPak` Map覆盖后选择末个。当前工作为共享纯读取器、实际有界Web解压、已初始化Rust迁移端口，以及原生完整索引前置校验；唯一共享字节corpus尚待实际writer生成、两端执行。兼容调用方默认额度是新明确policy，不是PAKv1协议上限。保留单独合法的opaque键（含dot段、重复斜杠、冒号等），只用规范化identity拒绝别名冲突，未套文件系统提取规则。原写包完整函数、native项目boundedgzip/hash/JSON尾部以精确逆变换保护；类型自检不是坏包或原生运行资格。

Root新增的 `detached-player-root/cache-adopter-v2/` 仍为缓存启动草案：等待已有World.wasmReady、使用实际Rust版本/迁移函数、先校验后提交、卸载Abort及迟到回复拒绝。模板/样式字节相同，11项明确delta可整源逆恢复原PlayerApp SHA `aae8aea6ef57bd081738fadb162ab37f4a299fe4c156174fc748953009a96487`；没有创建备用World或假Catalog caller。包读取前的transport分配预算、独立Player全依赖隔离及真实浏览器卸载回归仍未完成。上述缓存状态均为NOT_IMPLEMENTED_IN_PRODUCTION / NOT_TESTED或仅VERIFIED_STATIC，各真实结果随后单独记录。

### 2026-10-08 — 寻路正式接入，资源包缓存候选通过

18:19 UTC整体约27%仍是实施估算，不是验收通过率。PAK缓存账本 `detached-loader/handoff-juNyQt/ledger.json` SHA `0f4b83b465c1b8d916c44d2b4fa8cd8f392035e2dffccd29836317d8143c4b88`：同八组前后8/8 PASS，独立新增3/3 PASS；物理51包使用唯一corpus SHA `e1ac344323000bce7e8a96a2c150063cade5e9063aa42bbeb1e5fd4ba5841c33`。20个旧JS接受的危险输入被拒绝，uppercase SHA从旧JS拒绝改为接受合法格式，尚不冒称native已验证。实际Node World默认engine metadata6.7.0与已初始化Rust26.37.0/schema29的不匹配在0 hash/0 gzip前被拒绝；这是host metadata guard，不是另一套WASM二进制buildId配对资格。所有此前fixture失败保留，599正式源前后全等，业务CPU与自身进程已清理。独立Player、资源Ready、大包内存及原生行为仍未完成。

Root在完整599源守卫和最终候选hash确认之后接入寻路恰6源/2新源及2gate；`navigation-root/production-integration-attempt1/edit-receipt.json` 保存逐文件前后SHA和范围。缓存最终 `actual-guarded-fw7rOL/report.json` SHA `910416203199273191a015e4faec010f0abcdc87ddaeac7ba55768ff6f583269` 为18/18 PASS，含真实TileMap/Agent、同步重入、取消、世界替换和清理。该报告仍是旧599快照加6明确overlay，不冒称正式601源已重跑。Root初次接入脚本误读取报告不存在的汇总字段而提前停止、0正式写入；随后改为检查真实18个check及全部PASSED，才写入下列完整已审阅字节。

| 正式文件 | 每项实际编辑与影响 |
| --- | --- |
| `runtime/navigationOwner.ts`（新） | 将原寻路缓存和计算置于每World唯一Owner；新增任务token、closing/closed与可撤销诊断写权限。区分任务仍拥有终态与取消后不可继续执行，普通取消能够正确清active，旧continuation不能读取新World的debug对象。原数学、采样、A*、默认参数和混合时钟表达式保留。 |
| `editor/navigationAdapter.ts`（新） | 将真实TileSet/TileMap、World、原live诊断和帧预算注入Owner。没有另一Owner缓存或诊断复制；legacy公共raw引用保持，foreign使用独立诊断。 |
| `runtime/navigation2d.ts` | 原公共调用委托当前唯一Owner，保留API、公共诊断Map/Profile及同raw的Vue包装。不是删除旧功能或另建寻路算法。 |
| `runtime/navigationGeometry.ts` | 原几何函数保留，世界/Tile资源读取通过必需port；原body可逐字恢复，无几何或碰撞语义变化。 |
| `runtime/worldGameplayOwner.ts` | 所有者构造/前置步/原点移动/reset路径连接同一个navigation child；销毁幂等，并防止已关闭Owner复用。 |
| `editor/worldGameplayAdapter.ts` | 同World缓存不重建；World替换先dispose旧Owner、重新检查同步重入，发布唯一缓存后才激活诊断；失败仅清理自身缓存，保留主错误和清理错误。 |
| 两个 `audit-engine-*-boundaries.mjs` | 各增加三个实际寻路入口。删除精确新增段即可恢复全部旧byte；原forbidden、遍历、必需模块检查、旧动态模块例外和整体失败规则不改，无新增缺模块例外。 |

候选121原函数body与6整源inverse已通过静态资格。§30/64的World归属、异步取消/错误/终态、原Tile接口和legacy引用已处理；正式合并type/build、原helper完整逆链、正固定步Core+普通WASM+非空Agent以及新产物真实GUI仍待验证。没有修改协议、Rust物理、线程额度、GPU、舒适UI或动效；这些变更在本片不适用。M1总体隔离、QualityLocked/AdaptiveExperience、B/X/H门槛仍未通过。

后续正式601源的 `pnpm check` exit0、optimized profiling构建exit0（15.92s），`engine-profile-ccc60d897e17771373fe` / sourceHash `ccc60d897e17771373fe8e700733f6b2f171b9293515f32628dc36ad5b890237`，271产物完整冻结于 `profile-dist-ccc60d897e17/`，manifest SHA `f11b694c35517404dbb6cf12858f7181b1369fa1a5874aaff0899d58c1fe5e46`。零overlay完整601源快照 `navigation-root/merged-ccc60d897e17/source.json` SHA `feb4ed8b6c4082ce24e14fd95add7173a4bac441ea353d4a313b471c365a95f9`。三个Nav入口source/compiled0违规；整体source Core31/compat34/Player17、compiled Core23/compat30/Player44/emitted39，NOT_PASSED保留。相比91cc compiled多一个真实Editor navigation adapter，不把适配器分离冒称整Player已隔离。大chunk警告保留；构建耗时不是运行性能收益。

Root另编辑恰3个检查支撑文件：新增 `scripts/lib/navigationOwnerContract.mjs` 与完整 `scripts/fixtures/navigation-owner-transform-v1.json`；旧 `scripts/lib/aiIntegrationContract.mjs` 仅增加import和Nav完整inverse前缀两段，全旧byte可精确恢复。新helper唯一差异是缓存数据URL改为正式fixture URL。`navigation-root/strict-helper-attempt1/report.json` SHA `93b5e1c597477f865d7439da6e2da31705c5d0358b8aa41a8621cc2d6b3ef074` 验证实际6整源、121原body，并拒绝刻意修改原cellSize默认值或新取消执行守卫；这些坏改只存在测试sourceSet，未写生产。原 `qualify-host-builder-root.mjs` 未改，实际再执行全部6整链与旧99 Physics/25 builder/21 objects检查；WGO恢复 `767465af…62ab5`、Editor恢复 `f29375bf…236e`，其余四整源原SHA也保持。新的positive fixed-step首次夹具把frame0的尚未发布native state_buffer当完整dense数据而失败；原raw保留，正在按真实tick发布后独立previous/current owned-copy校准夹具，尚不算正式功能PASS。

Windows原生函数候选现有真实资格：`native-pak-preflight-drafts-91ccbff-attempt3/native-run-attempt2/handoff-v1.json` SHA `ef5e04db91ad32faa95505b990cafc5051cf336153e4fab16f2d2e54a6a95384`。Rust/Cargo1.92.0 x86_64-pc-windows-msvc，实际 `cargo test --manifest-path <该目录>/native-function-audit/Cargo.toml --locked --offline -j 1 -- --test-threads=1 --nocapture` exit0、2/2 PASS；同物理51包原helper37接受、candidate19接受/32拒绝，20旧接受风险新拒，offset0.0/-0.0两个合法数从旧拒改为接受，17共同接受的项目JSON完全相同。31 actualJS/Rust路径identity全同，golden SHA `14e126b939758ce5b6899345d0a9b75d6434c65666077acb384cfcf1ae2ff3a7`。原项目gzip有界解码/hash/JSON尾部 SHA `c214adfeeb1d69ca9449a76199efc3eb59e066364a54724721676c38094953f6` 逐字保持，14正式保护源与锁文件前后不变，自有Cargo/rustc/test进程0。

原生只负责项目authority，C49/C80/C81三个asset checksum/decoded-length/gzip-body错误仍由TS完整reader拒绝，native该范围接受；差异逐项保留，不把职责不同掩盖成完整两端同一验证。corpus不含index.version1.0，所以合法该表示仍NOT_TESTED。旧consumer字段/Windows准备失败保留，仅3个明确consumer patch整源可逆，原helper/newmodule与51包byte未改。此为function-only缓存资格，native生产接入、Tauri/WebView/独立Player与大包峰值内存仍未验证。正式601源在该期间有已预告Nav四旧文件漂移，未拿旧599整体相等充当native判据。

寻路正式positive fixed-step最终3/3 PASS：`navigation/merged-preparation/attempt1-fixed-step/positive-fixed-step-handoff.json` SHA `d5a0567c5b8ed1112888dce9d714b5a8ea5512ec51e3662e0331358f3ae156c1`，raw `actual-merged-fixed-step-1Q8xj8/report.json` SHA `1378fbf2c76ec8a4aa34ee5b87dde84f38db51d38c40ba4e41f30536afffe8a3`。实际playing Host/Core推进一个Rust tick，WGO调用同一个Nav child一次，64-cell grid、一个Agent Ready/path2/debug2；native handle1的独立JS-owned previous/current各56 Float64，位置(-1,-1)→(-0.9960716289934082,-0.9960716289934082)。没有用JS插值位置或frame0冒充native位移。v1/v2分别是native buffer发布时序与测试Host默认editing错误，完整raw保留，v3只修有限前置/采样夹具，未改生产物理。重复Stop/input.stop1、cache清理及native释放通过，186实际模块哈希与601源配对，sourceChanges=[]，自有进程0。Root正式收据 `navigation-integration-ccc60d897e17/integration-receipt.json` SHA `47f16d213f982e790658e9710a7b3d02c8e5090de7a59abf27b27d3b102ff416`；候选18重入用例与正式3正控分开，不把候选overlay报告重标为合并重跑。新GUI/保存重开、正式性能及整体M1仍未通过。

18:42 UTC整体实施估算约28%，不是冻结能力分数。后续Root仅新增缓存的native source预算/identity草案：`native-runtime-source-root/preparation-attempt1/` 原d5d模块保留，`preparation-attempt2/runtime_package_source.rs` SHA `97966af7e199d9748599bf0786dbedc4a3041e1558d649ef9a44551c79ec672e`。它对真实同File handle先做metadata admission，再按实际读取字节强限制；使用既有native兼容policy的1GiB，不改PAKv1协议。Root审查发现初稿每chunk exact reserve可能反复搬迁prefix，v2仅3个明确容量delta：按已admit的metadata预留、增长按几何target且不超callerbudget、逻辑读预算独立不信metadata。原稿/逆变换保留；没有实测性能收益或RSS硬上限声明。

对应完整Lib缓存在已qualified nativeA上追加3段，SHA `5c17418eae2f4e5f2d13b87201d3d45300360d575c60db8b2995f18a7bff30d9`：module导入、唯一进程hash/size身份、runtime_package_bytes使用有界sidecar读取并校验同一raw包。只常驻hash/size，不另存整包；每次raw读取的SHA成本仍须计入。已确认源调用链为runtime_mode/runtime_package/网络policy读取同入口，网络policy用OnceLock缓存；真实swap权限/正文不一致反例仍HYPOTHESIS，待真实函数与文件测试。已缓存UDP授权不因该guard自动撤销；该候选只承诺后续不同raw包读取被拒绝，需要重启选择新包。整个包、native Base64及IPC字符串仍有内存成本。无正式native写入/锁文件变化/新增依赖，功能、Tauri/IPC/WebView与大包资格尚未运行。

### 2026-10-09：Graph、包读取与兼容 Player 的正式接入

从已验证601源 `engine-profile-ccc60d897e17771373fe` 继续，未重做原寻路切片。Root在全部候选功能进程结束后，核对完整601源、目标文件、AGENTS及主指令，再合入17个文件；原字节备份、每个before/after SHA及交付依据在 `.cache/engine-overhaul/root-integration-next/formal-integration-attempt1/approved-plan.json` 和 `edit-receipt.json`。未改依赖锁、已发布26.37、物理语义、公共ABI、线程模式、Comfortable尺寸或Motion源码。

| 实际编辑文件 | 本次改变与影响 |
|---|---|
| `src/visual/graphRuntimeHotReload.ts` | 新增无Editor/Vue依赖的原热重载规划、稳定值与排序算法，保持原实现。 |
| `src/visual/graphProduction.ts` | 使用共享稳定算法，并按原公开API重导出规划及类型；随后删除唯一不再使用的GraphValue类型import，修复完整typecheck发现的TS6133。 |
| `src/runtime/GameplayRuntimeCore.ts` | 唯一规划import改为纯Runtime模块；真实VM帧边界事务、回滚和其他Core算法不改。 |
| `src/runtime/novaPakReader.ts` | 唯一纯字节读取器，先验证完整索引、长度、重叠、身份、caller预算与标量，再执行注入的实际哈希/有界解压。 |
| `src/runtime/runtimeProjectLoader.ts` | 分离读取/迁移/预检，要求已初始化匹配Rust格式能力；返回原始项目值，不伪装成prepared AssetRecords或SceneReady。 |
| `src/runtime/novaPak.ts` | 旧读入口转用唯一读取器和Web能力；原包写入算法保留。Writer/Reader路径alias一致性另作实际关联核验，尚未宣称全部完成。 |
| `src/platform/webNovaPakCodecs.ts` | 注入真实SHA与gzip能力，复用唯一有界collector。 |
| `src/platform/runtimeByteStream.ts` | 新增真实字节计数、独立chunk拥有权、取消及reader终态清理；防止Buffer.slice共享底层内存。 |
| `src/platform/webRuntimePackageTransport.ts` | 新增实际HTTP流读取与异步canonical STANDARD Base64解码；超预算在atob/输出分配前拒绝。扫描和解码按有界工作量让出真实宿主task；scheduler.yield无参数绑定调用，兼容timer与晚到失败均清理。 |
| `src/PlayerApp.vue` | 原World初始化后才调用匹配Rust迁移、分离读取和校验；卸载先abort，异步阶段拒过期World/晚到结果，Web/native读取使用统一预算。删除旧whole-atob helper。模板和样式字节相同；仍是Vue/Editor兼容Player。 |
| `scripts/lib/graphHotReloadCoreContract.mjs` | 新增唯一Core import relocation完整逆变换，不忽略其他源码区段。 |
| `scripts/lib/runtimeObjectsCoreContract.mjs` | 在旧整源断言前组合上述逆变换，全部旧断言保持。 |
| `scripts/audit-engine-source-boundaries.mjs` | 添加Graph纯模块及五个包/平台入口；原forbidden、旧入口及失败规则不变。 |
| `scripts/audit-engine-boundaries.mjs` | 添加同样真实compiled入口；不增加缺模块例外或tree-shaking豁免。 |
| `src-tauri/src/runtime_pak_preflight.rs` | 原生项目授权前执行完整结构索引校验，原gzip/SHA/JSON尾部不改；两处过时测试状态注释按真实有限资格更新。 |
| `src-tauri/src/runtime_package_source.rs` | 同一File handle先admit再强制实际读取预算；只常驻raw包hash/size身份，变更包须重启。 |
| `src-tauri/src/lib.rs` | 接入以上两个原生模块及唯一进程身份；保持既有命令/能力和embedded优先语义，不自动撤销已缓存的原包UDP授权。 |

Graph缓存资格为完整before13/13→after13/13、语义值一致，只排除比较中三项实际compile.elapsedMs（原始值保留，无性能结论）。G13真实Core/Rhai涵盖disabled/rejected/pending/帧边界apply/rollback；Node分支未创建physics RuntimeWorld，不能冒称物理步资格。交付 `graph-runtime-hot-reload-comparison-601-attempt4/handoff-v1.json` SHA `f9562286b656a091f6f7d577ac93c7e8377298e4a3e36839ea34b886fbef9288`。此前缺.cache、随机conflict.id错误预期和document事件host缺失的失败均保留；唯一fixture修正不改13个业务check body或生产算法。

Transport首轮实际11/11 PASS，含Node Response/ReadableStream/回环fetch、同gzip对照与三个失败终态、跨真实task取消、host receiver/晚到reject和reader/timer/listener清理；601源前后0差。grammar取消0atob/0输出，decode取消发生于16个atob/1输出后；未冒称浏览器原生scheduler已验证。交付 `runtime-transport/handoff-3AlcH5/ledger.json` SHA `87d625262bb4d7138fb62717f3652a598d9a2f02d9ebfb431b739a787394052d`。原Reader/Loader8+3资格仍属原599+候选，未标成新合并cohort重跑。

NativeB真实Rust4组/22判据PASS，包括同File预算9项、OnceLock及4线程身份6项、embedded3项、4个独立copiedexe sidecar变化。旧路径same-size变更确实读到新project端口7778而缓存授权仍7777，HYPOTHESIS现升级为CONFIRMED；新路径拒绝不同raw包。交付 `native-runtime-source-review/attempt2/handoff.json` SHA `81dfa05e00777cebb9e6f71055d17c254f94a2f15d97efcf122a2234bc830e1a`。测试生成器数组常量抽取编译失败0business及其修正记录保留，无生产函数修复掩饰。功能测试并行负载已登记，全部耗时不作净收益。

合并后完整 `cargo check --manifest-path src-tauri/Cargo.toml --locked --offline -j 2` exit0（日志 `formal-integration-attempt1/native-check-attempt1.log`），保留declared_decoded_bytes未被生产调用者使用的dead_code警告。首轮完整 `pnpm check`因上述唯一无用类型import exit2，删除后完整重跑exit0；两个原日志分别为check-attempt1/check-attempt2，不覆盖失败。新identified profiling构建、compiled依赖图、原Core整逆链和实际Player浏览器启动继续进行。

实际Writer已生成原11实体/8资源平台游戏包，SHA `e6e765598078de5e32e26cab08d02aea58a74d0258fd2fe49372443ca1e9c246`，19299字节/9条目；见 `root-integration-next/player-smoke-package-attempt2/receipt.json`。第一次Node缺兼容端口失败保留，第二次实际Compatibility entry正常；Node不能解码SVG的atlas警告保留，不作为媒体或GPU Ready通过。GUI候选复用真实Player页面、原非空项目与1600×900/DPR1，尚未运行，不计验收。

§30/64关联：读协议/格式与Rust匹配、预算/损坏输入、真实平台能力、异步取消/结果有效期、包源授权身份、纯依赖及兼容入口已处理；公共FrameHeader/Sprite ABI、WASM内存所有权、Engine Worker、共享内存及GPU路线在该片未改且仍待其阶段。完整Runtime/Player分离、Resource Ready、Native IPC/WebView/实际RSS、严格Motion/视觉资格、QualityLocked/AdaptiveExperience正式B/X/H与Linux/H2均未完成，不因类型或函数测试通过而降门槛。

上述正式接入的后续核验：Graph生产文件除了删除无用类型import，编辑工具也移除恰一个末尾空行；完整逆变换单独登记这一非语义差异，没有忽略文件尾或算法。原6条Core整链检查随后exit0，旧99 Physics/25 Builder/21 Objects断言保持。原7d构建和首次失败日志保留。

Writer关联核验确认三种旧输出会被更严格Reader拒绝：`Assets//a`与`Assets/a`、`./Assets/a`与`Assets/a`、`./project.nova`与项目authority碰撞。实际修复仅`src/runtime/novaPak.ts`两段：import唯一`runtimePackagePathKey`，原写入冲突键改为该函数作用于原`safePackagePath`结果；原路径清理、写入顺序、编码、gzip和PAKv1不改。新增功能资格5/5 PASS，冲突在fetch前拒绝；9种单独合法opaque/Unicode/旧反斜线/前斜线路径包与旧Writer全字节相同。希腊路径首轮fixture预期错误4/5原raw保留，仅校准无后缀ΟΣ/Οσ用例，不放松真实冲突断言。交付`player-runtime-catalog-preparation/writer-alias-xXqhTr/report.json` SHA `5078c2b330bf6b968f48e1208f9d33b022df79ae1818d502e91ae98421100a7b`；正式edit收据`root-integration-next/writer-alias-integration/edit-receipt.json`，最终Writer SHA `77045d3374ca6157c6ed7c6d7be94aabd0df463591a7bb01ec24b0a59178402c`。

当前完整`pnpm check`和`pnpm build:engine:profile`均exit0。build `engine-profile-6ee510bb04f1f191bb42`，sourceHash `6ee510bb04f1f191bb42835ad228a5bfc572016059eee08ec8151be98e44d1d2`；607源/271产物冻结于`profile-dist-6ee510bb04f1/`，manifest SHA `092ce4809045897dcd07b601447cd553e119aba276259efd0bf588d193d67add`，零overlay完整源收据`root-integration-next/merged-6ee510bb04f1/source.json` SHA `ddf515ebfd494a0131620bc5aab49930cfceeab4574d92a385f767b84fd66dec`。保留大chunk警告，12.96s构建耗时不是运行性能收益。Rust6项单独范围字节未变，沿用本轮实际完整cargo check，不伪称在TS-only Writer修复后又重跑native。

当前compiled gate仍exit1/NOT_PASSED：新Graph与Reader/Loader/三平台入口六项均0违规，完整Core23/兼容组合30/Player44/Player emitted39仍违规；M1不能算通过。既有dynamic objects兼容入口未emitted仍明确NOT_EMITTED，不作为零违规通行。两gate日志和完整报告保留在`root-integration-next/writer-alias-integration/`。

实际Player GUI已运行：`root-integration-next/player-gui-6ee-attempt1/evidence/v26.37-engine-player-package.json`2/2功能smoke PASS、consoleErrors0，原关卡包在当前冻结产物实际启动。Root亲看两张1600×900/DPR1 PNG：非空平台关卡、SVG角色、材质与HUD存在，输入焦点稳定，后图角色离地与Space跳跃一致；600ms方向输入后的X仍-4.0，不宣称水平位移已验证。`raw-player-observations.json`保留实际WebGL2/SwiftShader、1590×900 canvas和physicalDpi:null；公开性能metadata/drain不可用为null，不填0，不冒称采集了本次GPU/显示延迟。自有浏览器/server由原runner关闭。浏览器启动功能不代表native WebView、入口全部资源/音频Ready、卸载期间取消、真实GPU性能、完整动效或发行验收；已发布26.37未覆盖。

15:06 UTC整体实施估算32%，不代表冻结能力评分或验收通过率。Motion两组旧ccc60冻结产物诊断结束，Normal/手动Reduced首次观察全零1255.9/2187.6ms，但有page/timeline/Node时钟间隙，旧严格3s失败继续保留，未改为认证通过。WebGPU缓存Sprite候选实际11项7PASS/4严格像素FAIL；透明颜色量化和变换边缘差异正在诊断，禁止放松像素断言或由异设备对照声称性能提升。其生产接入和完整二维能力尚未完成。


### 2026-10-09 M1 资源、插件、实体与 Player 组合接入

本次从 6ee/607 冻结基线继续，不重做已完成阶段。Root 在修改前核对了完整源码、两级合同与实际调用后果，保留全部原文件于 `root-integration-next/formal-m1-owner-integration-attempt1/before/`。下表记录每项正式编辑；没有修改物理、公开帧 ABI、原渲染默认路径、Comfortable token、Motion、依赖锁或已发布 26.37。

| 文件 | 实际编辑 |
|---|---|
| `src/runtime/runtimeAssetRecordContracts.ts` | 新增共享资源记录、默认值与元数据声明，旧 API 重导出。 |
| `src/assets/types.ts` | 资源声明改为共享模块重导出，保留全部旧公开名称。 |
| `src/renderer/types.ts` | TextureFilter 类型从纯共享声明导入，渲染接口和运行算法不改。 |
| `src/runtime/derivedSpriteMetadata.ts` | 新增原派生精灵元数据校验共享实现。 |
| `src/assets/derivedSprites.ts` | 实际资源路径调用共享校验，原生成与编码保持。 |
| `src/runtime/contentInterchangeMetadata.ts` | 新增原交换元数据规范化共享实现。 |
| `src/assets/contentInteroperability.ts` | 旧公开接口重导出并调用共享规范化，原读写业务保持。 |
| `src/runtime/runtimeAssetPreparation.ts` | 新增原记录准备循环和默认值组合的纯共享实现。 |
| `src/assets/AssetDatabase.ts` | 实际 loadAssets 使用同一准备循环，保留字体、资源与部分失败副作用顺序。 |
| `src/runtime/preparedRuntimeProjectResources.ts` | 新增显式 CPU 资源预算、身份校验、不可变目录和 ScriptServices 工厂；不是 SceneReady。 |
| `src/runtime/entityLifetimes.ts` | 实体代数移入固定 World Owner；旧公开调用通过明确兼容端口。 |
| `src/runtime/streamLifecycle.ts` | 初始化记录与 hooks 移入同生命期 Owner；解除回调使用身份保护。 |
| `src/editor/entityLifecycleAdapter.ts` | 新增 Editor 同 World 弱映射和实际 Vue toRaw 端口。 |
| `src/runtime/GameplayRuntimeCore.ts` | 实体/流送调用接固定 World Owner，插件调用接 host；其余整个 Core 逆变换精确不变。 |
| `src/runtime/worldGameplayOwner.ts` | 固定 World 注入同一个实体与流送生命期 Owner。 |
| `src/editor/worldGameplayAdapter.ts` | 实际 Editor 组合注入同 World 的生命期服务。 |
| `src/runtime/runtimeSceneStreaming.ts` | 运行场景流送显式使用当前 Owner，异步前捕获该端口。 |
| `src/runtime/worldStreaming.ts` | 实际世界流送按对应 World 路由活动与退场。 |
| `src/runtime/tileSceneRuntime.ts` | Tile 场景实例的生命周期调用接入同 World Owner。 |
| `src/runtime/plugins.ts` | 原 Editor 状态、启动标记与包回调组合共享插件实现；保留晚绑定 fetch。 |
| `src/runtime/gameplayWorldHost.ts` | 明确声明插件控制端口，保留原全部 host 契约。 |
| `src/editor/gameplayWorldHost.ts` | Editor host 提供原实际插件控制器。 |
| `src/runtime/pluginRuntimeOwner.ts` | 新增唯一插件算法工厂，真实平台、资源、权限状态由端口注入。 |
| `src/PlayerApp.vue` | 以实际加载后的资源 UUID 和包 hash 创建 Player 专属运行实例，画布与 headless 共用；增加代际检查和失败/卸载清理。 |
| `src/components/WorldCanvas.vue` | 新增可选固定 Runtime prop；Editor 默认旧实例，Player 显式传入同实例；模板和样式全体保持。 |
| `scripts/audit-engine-source-boundaries.mjs` | 只新增八个真实纯入口，原禁止规则与整体失败门槛保持。 |
| `scripts/audit-engine-boundaries.mjs` | 只新增八个纯入口及实际可达目录入口，不增加未编译豁免。 |

修改前的独立候选工作区包含全部 614 源与匹配 WASM，原 `pnpm check` exit0；组合三组真实业务原版/候选各 3/3，普通 WASM 实际 state_view/步进/query 与 Rhai 回调输出完全相同，世界、VM 和输入监听全部清理。资源完整记录身份链各 7/7，插件原八组全部保留并增加独立 Owner 一组。证据、每文件 SHA 和第 30/64 节关联表在本次 `approved-plan.json` 与 `edit-receipt.json`，失败夹具与首次原始输出保留。正式完整 check/build、永久合同与新 GUI 尚未执行，整体 M1 仍 NOT_PASSED。

Player 新 CPU 目录准入为 20,000 记录、8,388,608 元数据值、128 深度、2,214,592,512 UTF-8 文本字节（含 PAK 资产 data URL 展开）；这是显式宿主预算，不改 PAK-v1 格式上限，不声称该最大容量实测或内存峰值。旧兼容 loadProject 仍在此前执行，完整有界媒体/GPU/音频 Ready、纯 Player 和运行世界隔离仍是后续必需工作。

WebGPU 独立缓存证据：同实际 NVIDIA 硬件族 Sprite MJS 对照 12/12、typed 工厂 1/1，仍是显式诊断候选；新 Geometry32 混合五组 4PASS/1严格像素 FAIL（两通道差 1），没有放松零容差。旧异设备四个失败继续保留；完整 M6、线性前乘颜色、glyph atlas、Worker/WebView/导出与正式性能尚未通过。34%仅为整体实施估算。

新增入口首次 source gate 实际发现 `pluginRuntimeOwner → stableContracts → Vue`，同时污染 host 类型闭包；失败报告保持原样。Root 执行三项最小关联修复：`src/runtime/pluginApiContract.ts` 新增原唯一版本 2；`stableContracts.ts` 原声明改为该契约 import/reexport；`pluginRuntimeOwner.ts` 只更改版本导入路径。其他每条算法、稳定矩阵、常量值和旧公开路径整文件逆变换相同，未放宽 gate。三项编辑前像、SHA、逆变换与待测范围在 `root-integration-next/plugin-api-contract-fix-attempt1/edit-receipt.json`。预计完整源 615，历史 614 缓存类型和三业务资格保持其原 cohort，不冒称覆盖新修复。

正式接入后完整 pnpm check 和 build:engine:profile 均 exit0：engine-profile-ac155ce36a737db49528，sourceHash ac155ce36a737db495284376177f8a90824d851d906c9587254cb44bd3ff2a60，615 源/271 产物。profile-dist-ac155ce36a73 独立冻结，manifest SHA 8f1a580bc5052b31719246c1a0b119dbae4064aed612fd1d6e10a2a79c0d03ae；merged-ac155ce36a73/source.json SHA 0911b6274ffb9f6558839460a2a72c4253d37a913d5d932c6b621400ba550991，零 overlay、全部源与产物逐项核验。Native 六文件完全相同，沿用先前 locked/offline cargo check，不伪称重跑。13.99 秒构建耗时不是性能收益，大 chunk 警告保留。

修复后 source gate：八个新增纯入口与 direct host 均零违规，但整体 NOT_PASSED（Core25/兼容28/Player17）；compiled gate 新八入口与实际 prepared catalog 均零违规，整体仍 NOT_PASSED（Core23/兼容31/Player45/emitted40）。新增明确 Editor lifecycle adapter 的生产可达量如实报告，不以迁移数量或零违规子项宣布 M1 达标。两阶段 gate 原始报告在 formal-m1-owner-integration-attempt1/ 和 plugin-api-contract-fix-attempt1/；首次插件间接 Vue 违规未改为通过。

实际新 Player GUI：player-gui-ac155-attempt2/evidence，原关卡包 SHA e6e765598078de5e32e26cab08d02aea58a74d0258fd2fe49372443ca1e9c246，原 11 实体/8 资源；2/2 功能 smoke、consoleErrors0。Root 已查看两张原始 1600x900/DPR1 PNG，角色/平台/材质/HUD 和跳跃离地存在；X 仍 -4.0，水平位移仍未验证。运行器实际 headless Edge/SwiftShader WebGL2、canvas1590x900、physicalDpi:null；performance metadata/drain 都是 null，非手动前台观察、真实 GPU 性能或 native WebView 验收。首次只缺 --manifest-sha 的启动前参数失败保留在 player-gui.log；真正运行日志为 player-gui-attempt2.log，自有浏览器与 server 已由原 helper 清理。

版本常量迁移原 API 实际 before/after 九输入、完整稳定矩阵输出一致，两个整文件逆变换 PASS，runtime-comparison-attempt2/report.json；第一轮 Vite 返回数组而非单对象的测试生成器失败在创建业务模块前发生，partial entry 保留，不算生产失败。永久大合同缓存 19/19 已通过，尚待与此纯 import addon 组合安装；不把该静态合同当实际 WASM 重跑。16:22 UTC 整体实施估算35%，正式 B0-B8/X01-X15/QualityLocked/AdaptiveExperience、Linux/H2 和整轮发布仍未通过。


### 2026-10-09 永久 M1 搬迁合同接入（实际逐文件修改）

实现：10个测试文件；不修改生产源码、锁文件、游戏语义或UI尺寸/动效。安装前所有现有文件SHA及候选完整字节均匹配；6个旧helper前像保存在 .cache/engine-overhaul/root-integration-next/permanent-m1-contracts-attempt1/before/。原117个断言正文保留，旧12条canonical完整输出一致；缓存20/20静态检查、28项坏源/函数体/默认值/注销变异拒绝仅证明搬迁合同，不代表完整M1或GUI通过。

| 文件 | 修改 | 内容与影响 |
|---|---|---|
| scripts/lib/runtimeObjectsCoreContract.mjs | 更新 | 接入完整Owner逆变换；原断言保持不变 |
| scripts/lib/gameplayComponentsOwnerContract.mjs | 更新 | 接入完整Owner逆变换；原断言保持不变 |
| scripts/lib/runtimeObjectsOwnerContract.mjs | 更新 | 接入完整Owner逆变换；原断言保持不变 |
| scripts/lib/navigationOwnerContract.mjs | 更新 | 接入完整Owner逆变换；原断言保持不变 |
| scripts/lib/runtimeObjectsEditorContract.mjs | 更新 | 接入完整Owner逆变换；原断言保持不变 |
| scripts/lib/worldGameplayCoreContract.mjs | 更新 | 接入完整Owner逆变换；原断言保持不变 |
| scripts/lib/m1OwnerIntegrationContract.mjs | 新增 | 验证全部23个实际Owner源及54个新增函数体 |
| scripts/fixtures/m1-owner-integration-transform-v1.json | 新增 | 冻结完整搬迁逆变换，保留旧字节合同 |
| scripts/lib/pluginApiContractMigration.mjs | 新增 | 独立验证插件API常量和唯一导入逆变换 |
| scripts/fixtures/plugin-api-pure-import-transform-v1.json | 新增 | 冻结完整搬迁逆变换，保留旧字节合同 |

关联检查：主指令§30/64的生产协议、世界所有权、调度、输入、渲染及发行改动本批不适用；依赖隔离测试受影响，安装后执行真实源合同及旧WorldHost全逆变换。当前ac155/615源码与271产物不变，完整源/产物隔离仍NOT_PASSED。


### 2026-10-09 ac155 正式合同及统一证据封存

新增 scripts/verify-engine-m1-owner-contract.mjs：正式可重复入口，检查全部16旧文件逆变换、7新增Owner完整骨架/54函数体、插件API常量和独立逆变换、23整源变异、5真实默认值/函数体/注销变异及3插件变异拒绝，检查后源字节不变。实际34/34通过；旧 verify-engine-gameplay-world-host-contract.mjs 的8项原断言及纯源图8/8通过。只新增测试入口与本记录，生产源码仍ac155/615；无API、UI、锁文件或游戏语义改动。

统一核对：615当前正式源与615冻结源、271冻结产物、6原生文件、AGENTS及完整增强主指令均匹配原SHA，零overlay、零drift。收据 .cache/engine-overhaul/root-integration-next/merged-ac155ce36a73/integration-receipt.json 连接构建、类型、实际组合业务/WASM、API9case、正式合同、失败边界及实际Player2项功能smoke的原始数据。Player截图仅静态布局，SwiftShader/headless不能当真实GPU/前台动效/正式性能资格；横向输入尚未验证，单独有限诊断继续。

实现/验证分开：本批搬迁已IMPLEMENTED且上述合同/类型/构建/具体业务smoke VERIFIED；完整Core/compat/Player依赖边界仍NOT_PASSED。WebGPU originalcanonical图像仍NOT_MET，保留失败原始图和后续诊断，不改变nearest/rotation/alpha或容差冒充修复。B0–B8/X01–X15、QualityLocked/AdaptiveExperience、Linux/H2、独立Player发行及全GUI动效仍没有整轮验收。


### 2026-10-09 动画/时间轴与存档Owner正式接入（逐文件编辑）

安装20个生产源码及5个永久测试文件；每个文件安装前匹配已审前像/候选SHA，615原源、271冻结产物、6原生文件与主指令全部零漂移。前像及安装计划保存在 .cache/engine-overhaul/root-integration-next/formal-animation-save-attempt1/，此前ac155文档引用已另存不可变快照，不重写旧收据。

| 文件 | 修改 | 实际内容及后果 |
|---|---|---|
| src/runtime/animationDocuments.ts | 新增 | 搬迁动画文档类型、解析和数学函数，移除编辑器资源导入；原函数逆变换核对。 |
| src/runtime/timelineDocuments.ts | 新增 | 搬迁时间轴文档类型和解析；格式及时间单位保持原合同。 |
| src/runtime/animationTimelineContracts.ts | 新增 | 新增资源、音频、镜头等显式端口；不另建世界或时钟。 |
| src/runtime/animationTimelineDocumentReader.ts | 新增 | 从绑定世界的资源目录读取动画/时间轴文档，防止同UUID跨目录串读。 |
| src/runtime/animationOwner.ts | 新增 | 每世界独立动画状态；临时成员索引验证实体/组件/数组位置，拒绝同长度替换的陈旧写入。 |
| src/runtime/timelineOwner.ts | 新增 | 每世界独立播放与回调状态；保留录制、曲线、事件和原时间语义。 |
| src/runtime/animationTimelineOwner.ts | 新增 | 组合同一世界与同一资源目录的两个Owner，提供明确生命周期。 |
| src/runtime/animationTimelineLegacy.ts | 新增 | 保留Editor单例展示/录制兼容端口；外部Runtime不得隐式使用。 |
| src/runtime/animation.ts | 更新 | 改为旧API兼容门面及原authoring动作，算法下沉到Owner。 |
| src/runtime/timeline.ts | 更新 | 改为旧API兼容门面，保留编辑器展示状态。 |
| src/runtime/timelineUiActions.ts | 更新 | 显式订阅当前编辑器Owner，不覆盖另一世界的播放状态。 |
| src/editor/animationTimelineAdapter.ts | 新增 | Editor提供资源/unwrap及既有音频/镜头端口；底层共享音频尚未隔离。 |
| src/runtime/gameplayWorldHost.ts | 更新 | 要求世界绑定的动画及存档Owner工厂，明确运行侧服务合同。 |
| src/editor/gameplayWorldHost.ts | 更新 | Editor默认保留legacy；显式Player目录捕获独立资源、gameId及存档schema。 |
| src/runtime/GameplayRuntime.ts | 更新 | 旧Editor入口明确配置legacy兼容；显式服务入口使用独立Owner。 |
| src/runtime/GameplayRuntimeCore.ts | 更新 | 实际begin/fixed-step/参数/stop及7个存档脚本调用使用自身Owner；结构安全点标脏；存档延迟创建避免模块环。 |
| src/components/WorldCanvas.vue | 更新 | 实际运行时Owner接入时间轴展示，shallowRef/triggerRef更新；完整template/style字节不变。 |
| src/editor/saveGame.ts（26.45 起自 src/runtime 移入） | 更新 | 保留16个旧API及原Editor响应式种子门面；格式/校验/journal语义不变。 |
| src/editor/saveOwnerAdapter.ts | 新增 | Editor注入存储、时间、取消及项目端口；外部世界复制schema迁移配置，防止Editor后续修改污染。 |
| src/runtime/runtimeSaveOwner.ts | 新增 | 搬迁全部37个存档函数到独立状态闭包及显式平台端口；保留v1/v2、备份、恢复及serializer。 |
| scripts/lib/animationOwnerContract.mjs | 新增 | 验证17实际源码的完整逆变换及原算法；静态Save→Animation→M1归一化，无可变注册表。 |
| scripts/fixtures/animation-owner-transform-v1.json | 新增 | 冻结原完整动画/时间轴及搬迁数据，不放宽旧业务断言。 |
| scripts/lib/runtimeSaveOwnerContract.mjs | 新增 | 独立验证6实际源码、37旧函数及7实际Core调用。 |
| scripts/fixtures/runtime-save-owner-transform-v1.json | 新增 | 冻结完整旧存档源和明确逆变换，不改变存档格式验收。 |
| scripts/lib/m1OwnerIntegrationContract.mjs | 更新 | 只增加3个机械归一化连接；原28个中央断言及整链117个断言正文保留。 |

缓存验证：同12组实际Core/Rhai/普通WASM业务，前态8通过+4真实串扰失败，后态12通过；原8组输出完全一致。完整算法逆变换、严格类型、15个纯SSR模块、5个成员替换检查及14项永久合同通过。所有旧失败原数据保留。实际存档是受控内存localStorage平台端口，不能替代浏览器存储/原生存储验收。

正式状态：IMPLEMENTED；当前完整pnpm check、统一构建、正式合同、实际Editor保存重开/布局/动效及独立Player仍PENDING，安装不等于VERIFIED。关联§30/64：Owner/Core/Host/资源目录/生命周期/旧API门面/Canvas订阅与永久测试已处理；生产ABI、物理权威、Worker协议、渲染后端、线程预算、发行无本批变更，仍按各自阶段验收。

风险与剩余：成员索引是借用位置而非运行实体身份；未知参数连续miss可能反复O(N)刷新，未宣称加速。全局Audio/Camera/Profiler等仍共享；保存同Owner异步竞争/epoch及统一调度尚未资格验证。保存旧Promise微任务检查点不算让出绘制。整体M1依赖隔离和M0–M8/X0–X6仍未完成；UI16/44、留白/圆角/动效、物理/渲染默认及协议字节未改。


### 2026-10-09 旧WorldHost兼容合同连接补齐

更新 scripts/lib/gameplayWorldHostContract.mjs：新增一个静态导入及一条兼容门面严格逆变换，顺序为已审Save→Animation→旧GameFlow→旧Host。完整移除这两行即逐字恢复原helper，旧全部断言与容差不变。首次正式旧合同失败（新super组合未归一化）保存在 formal-animation-save-attempt1/world-host/source-contract.json；不删除失败，重新执行另存 world-host-retry1。生产源、游戏行为及完整M1验收均未改变。


### 2026-10-09 新Owner正式关联检查入口

更新 scripts/audit-engine-source-boundaries.mjs：仅追加12个真实新动画/时间轴/存档及旧门面入口，包含type-only合同；原禁止边、遍历、错误和全部旧入口逐字不变。更新 scripts/audit-engine-boundaries.mjs：仅追加11个实际有运行值的模块入口；不将类型擦除或缺模块当零违规通过，不改变整体失败标准。新增 scripts/verify-engine-animation-save-owner-contract.mjs：实际默认读取17动画源、6存档源，完整类/37旧存档函数及7个Core调用验证，并逐源拒绝未知修改；不是只验fixture数字。三个文件前像/增量记录在 formal-animation-save-attempt1/permanent-gates/。生产626源及271冻结产物未变，GUI/性能/发行未由静态检查替代。


### 2026-10-09 新组合正式验证与统一证据

完整pnpm check exit0；优化profiling构建 exit0，buildId engine-profile-5e34367a89c69db39f69，sourceHash5e34367a89c69db39f69f056820d0738ed7abd917438de286e874ff19ad6c184。626全源/271全产物冻结在 merged-5e34367a89c6 与 profile-dist-5e34367a89c6；从ac155仅20已审生产差异，零overlay/零漂移。34个M1合同、26个实际动画/存档完整源合同、8个旧WorldHost重试合同均PASS；首次旧门面合同失败原报告保留，补连接未改原断言。构建耗时15.02秒不当运行性能指标。

整体隔离仍NOT_PASSED：源Core17、compat20、Player17；编译Core24、compat33、Player47，Player真实生产块42。新8个纯动画/时间轴/存档值模块源及编译图0违规，纯类型合同源0；旧save兼容门面仍有Editor/Vue来源（源2/编译6）。Core编译图从旧23到24，具体新增路径继续核查，不宣称整个边界改善通过。LegacyDynamicObjects未编译仍NOT_EMITTED_NOT_A_BOUNDARY_PASS。

证据统一收据 merged-5e34367a89c6/integration-receipt.json；原始日志/源和编译图/首次失败与重试/实际默认读合同均保存。当前UI舒适及动效源未改，真实EditorGUI、保存重开、实际独立Player、本轮QualityLocked/AdaptiveExperience正式基准、Linux/H2仍NOT_TESTED或尚未验收。普通WASM为已有精确匹配产物，Rust源码本批没变，原生6文件未变复用既有锁定离线check。Rust workspace nova_core包装源码不在原profile source manifest范围，ABI任务将单列其实际来源，不把626视为完整原生编译闭包。


### 2026-10-09 5e343 实际Editor/Player资格补充

真实Editor GUI使用原11实体/8资源项目、同一选中Player、1600x900/DPR1/app scale1；物理DPI unknown。实际选择Inspector、Play/Stop与authoring不变、菜单保存/新页面重开后scene/settings/assets完全一致，3/3功能smoke通过。Root亲看舒适Inspector原PNG：输入16px/24行高/44高、内部9×16、圆角12，Inspector379宽/面板圆角16、panel20/gutter8/control-gap12/field-gap20/label-gap12，无根或Inspector水平溢出。证据 editor-animation-save-diagnostic-root/handoff-5e343.json；fresh重开图有toast遮挡，不作为全部字段可见性凭证。

实际动效独立4秒有限观测：正常53样本、Manual Reduced66，最终3秒括号内JS活动/CSS running/pending为0，但headless暂停/长间隔令原及时收敛门槛未认证；两个observer disposal PASS不当两个动效PASS。原3秒FAIL保留，不finish/cancel动画或关闭核心反馈。软件GPU/headless不是前台动态流畅、完整面板/窄窗口/DPI矩阵或正式性能资格。

新正式Player原2项smoke通过；独立只读缓存诊断 KeyD的MoveH=1，X -4→-1.801、World步+36、脚本生命周期20→61、错误0；Root亲看末态非空关卡PNG。真实浏览器tab切换trusted blur/hidden在显式keyup前held已空，恢复visible/focus；不能隔离两个handler的贡献。ArrowUp trusted down/up存在，但项目未绑定且0Runtime帧推进，不认证玩法消费。5秒仅5/10 rAF，原门槛仍NOT_MET；正式metadata/drain null，不叫input-to-pixel/正式性能/独立Player完成。player-input-diagnostic-root/handoff-player-5e343.json；所有owned browser/server/worker探针监听清理，626源/271产物及原PAK零漂移。

Core编译图额外Save依赖已定位：Core→productionRuntime→faultCenter→editor store→physics→旧saveGame→Editor adapter；Core自身7个Save调用正确使用Owner，该旧authoring链仍待隔离，不为降低计数改坏旧保存门面。

### 2026-10-09 包依赖世界绑定正式修改（逐文件）

| 文件 | 编辑 | 实际内容和影响 |
|---|---|---|
| src/runtime/gameplayWorldHost.ts | 更新 | 必需readEnabledPackageIds端口；不隐式读取Editor目录。 |
| src/editor/gameplayWorldHost.ts | 更新 | 原enabled&&project筛选算法保持；Editor legacy实时读、foreign捕获独立ID并每次返回新数组，防止另一项目污染。 |
| src/runtime/GameplayRuntimeCore.ts | 更新 | 验证必需端口并绑定冻结接收器；包契约使用本世界ID，移除直接packageState值导入；不改安装器、脚本、世界时钟或物理。 |
| scripts/fixtures/package-contract-host-transform-v1.json | 新增 | 冻结3整源及定位机械逆变换，保留完整旧算法。 |
| scripts/lib/packageContractHostContract.mjs | 新增 | 要求实际安装源完整SHA并可逐字恢复全部前像，拒绝未知修改。 |
| scripts/lib/runtimeSaveOwnerContract.mjs | 更新 | 接入新逆变换；原35断言正文及整helper逆变换保持，仅旧已接受的完整状态避免重复还原。 |
| scripts/verify-engine-package-contract-host.mjs | 新增 | 实际默认源、3完整逆变换与missing/binding/筛选等变异拒绝的10项永久检查。 |

缓存同实际Core/Rhai/普通WASM：原2PASS+1跨项目串扰FAIL→4PASS，原2输出逐项相同；新增Editor live/foreign snapshot/返回数组修改不污染检查通过。4Core/4World及input/VM释放。首次候选遗漏冻结接收器导致真实TypeError，原raw保留；第二缓存测试连接重复还原失败保留，未删旧断言。full Vue/config类型通过，原34/26/8合同通过，11缓存关联检查及新10项入口通过。

安装前626源/271冻结产物/6原生文件及冻结主指令逐SHA保护，前像和计划在 root-integration-next/formal-package-contract-host-attempt1/。本批无第二世界、调度/线程/ABI/渲染/权限/UI几何或motion修改。§30/64 Host/Core/调用/保存合同链已处理；实际类型/构建/边界/新GUI待安装后验收；性能、发行、Linux/H2未由缓存结果替代。整体M1及M0–M8/X0–X6仍未完成。


### 2026-10-09 包依赖绑定新组合正式验证

完整pnpm check实际exit0（PTY22187记录，无完整文件转录）；优化profile构建exit0、14.27秒，不叫运行加速。buildId engine-profile-3e10e07670160af15d0e，sourceHash 3e10e07670160af15d0e7d81404b66c447ea1852bdc920d585b8294a447808f2；626源/271产物在.cache/engine-overhaul/root-integration-next/merged-3e10e0767016与.cache/engine-overhaul/profile-dist-3e10e0767016冻结，manifest SHA 6fcb8ff00cc2d7718b8659cdedc93658a3f7dbfcb4f1aeffe499d14983d04e30，仅3已批准生产差异，零overlay/漂移。正式默认源34 M1、26动画/存档、8 WorldHost、10包契约全部通过；原业务8/12及新包2→4同源资格与各首次失败保留，不以新包装测试掩盖原FAIL。

整体source gate仍NOT_PASSED：Core17/compat20/Player17；compiled仍Core24/compat33/Player47、真实Player emitted42，与5e相同。package值导入虽从Core移除，但其他可达链仍携带原Editor依赖，本批不冒称隔离数量减少。正式GUI新cohort待同一原项目/PAK smoke，原5e实际UI/motion证明明确沿用不当重测。普通WASM与6原生源字节相同复用原资格，包装源码范围缺口仍登记；完整Worker/渲染/发行、B0-B8/X01-X15/QualityLocked/AdaptiveExperience及Linux/H2未通过。

统一集成收据 .cache/engine-overhaul/root-integration-next/merged-3e10e0767016/integration-receipt.json：真实失败边界、类型/构建/旧合同、新永久入口与缓存实际WASM业务分别关联；不可变文档快照保存。没有缩小16/44舒适控件、留白/圆角或关闭核心动效；源UI与motion字节不变。


### 2026-10-09 3e10 新组合真实GUI与并行基础资格附录

新组合在1600x900/DPR1/app scale1、同原11实体/8资源/59组件与原PAK运行：原Editor3/3、原Player2/2检查全部通过，626当前源/271产物与全部保护文件前后零漂移，自有浏览器/server/Node全退出。Root亲看新Comfortable Inspector PNG，16文字/24行框、44输入高、9×16内边距、12输入圆角、379 Inspector宽、16面板圆角仍成立，root/panel水平溢出0；panel20/gutter8/field20/labelgap12继续默认。3e10-handoff在fault-report-root/attempt1/只是证据所属目录，不代表fault候选已生产集成。

原Player2仅证明非空包启动和canvas键盘输入接收；D600ms HUD仍X=-4，跳跃图只静态观察，不认证水平位移或Gameplay Stop。此前5e只读D诊断的实际位移、blur/hidden释放保留各自build身份；不把它们套为当前3e重新测过。SwiftShader/headless、physicalDpi null、native WebView/真正GPU性能/前台完整motion仍未认证。原Motion和5s rAF FAIL未改。本附录 .cache/engine-overhaul/root-integration-next/merged-3e10e0767016/gui-addendum.json 关联不可变原集成收据，不修改旧收据的PENDING历史事实。

公共Frame协议缓存基础已交接：Header64/Sprite80/LE/v1 schema共生Rust/TS，独立144字节golden与39损坏包两端拒绝，Rust5/TS42+4 independent、实际ordinary WASM借用/Node Worker转移/池终态与CPU实际renderer桥有限资格通过；最新finite affine但GPU64角点溢出原silent-drop反例另加明确拒绝通过。原handoff未改，final-index索引完整候选/driver；整合12phase replay仅准备尚未执行。全部0正式源写、无GPU新增。原5e/626资格不能自动套当前3e或后续cohort。

ABI未完成：公开80转换8/48浮点变化；GPU图像、统一linear/premultiplied颜色、实际Rust Arena/storageRevision/帧出口、生产EngineWorker及独立Camera/Clip/Geometry/Batch布局/Device Owner绑定仍缺，不叫M2/M3完成或生产优化。两既有nova_core包装文件不在profile626 manifest，实际HEAD/current SHA单列资格；不将其冒算已冻结原生闭包。

Audio16缓存候选634镜像已完整Vue/config exit0；实际同4 Core/Rhai/普通WASM前1PASS+3串扰FAIL→后4PASS、额外Owner/UI/试听/流读取与迟到/取消专项通过，属于缓存资格尚未安装。独立review又复现同会话输出设备乱序覆盖与Context初始化失败丢失关闭引用两项旧P2；原FAIL保留在audio-owner-review/findings-tz5C7V/report.json，因与本生命周期改动直接关联，先加窄guard/实际反例/完整复验，不把旧问题标NOT_PRESENT或继续交付。本轮无真实音频设备播放/PCM认证，不扩新依赖。


### 2026-10-09 音频固定世界与平台端口正式安装（逐文件）

本切片复用当前3e10的包、保存、动画实现；不替换物理、脚本语言、自研渲染器或GUI框架。固定World/resource的RuntimeAudioOwner由Host提供，Core的14个音频调用、同一Timeline及实际runtime Canvas的GameUi控制器共享该音频实例。Editor legacy试听延迟绑定保留，不在冷import创建World/设备。旧Audio类44方法/30字段、8值函数及原Buffered/GameUi算法完整逆变换保存。

| 文件 | 编辑 | 内容与影响 |
|---|---|---|
| src/runtime/audioDocuments.ts | 新增 | 新增唯一纯默认值、规范化、混合设置与确定性变化函数；8个原函数body逐字保留。 |
| src/runtime/audioRuntimeContracts.ts | 新增 | 下沉原播放请求、音频传输及诊断类型；新增必需resource/platform端口和读取消controller工厂。 |
| src/runtime/audioResourceReader.ts | 新增 | 新增实际catalog结构验证读取适配；读取原音频字段，不伪装原始project为AssetRecord，不调用Editorfallback。 |
| src/runtime/audioRuntime.ts | 新增 | 机械迁移原完整44方法30字段实例引擎；资源/平台显式注入；新增限定生命周期、latestPending1真路由串行及部分Context分配清理。 |
| src/runtime/audioLegacy.ts | 新增 | 新增冷加载单根兼容端口注册；导入不创建World/音频设备，不调用provider；缺端口时明确拒绝。 |
| src/runtime/audio.ts | 更新 | 旧公共入口改为共享引擎兼容类/单例；保留无参AudioRuntime、单根试听与原exports。 |
| src/runtime/audioOwner.ts | 新增 | 新增固定World/同catalog实例Owner；命令验证实际对象成员，拒绝同UUID外国实体；原模拟时钟/游戏数学保持。 |
| src/platform/webAudioHost.ts | 新增 | 新增实际Web Audio/HTML Audio/设备/时间平台转发；源字节经既有唯一有界流collector，保留调用者Abort原因。 |
| src/runtime/audioBuffers.ts | 更新 | 原buffer租约/缓存与整个BufferedAudioPlayback算法保留；改显式有界read/controller，并取消清理过期解码结果。 |
| src/editor/audioAdapter.ts | 新增 | 新增Editor单根AssetDB/Vue兼容组装与foreign实际catalog组装；默认旧试听保持。 |
| src/runtime/gameplayWorldHost.ts | 更新 | 纯Host增加required createAudioOwner，Timeline接收同Core Audio实例；保留已资格Package端口。 |
| src/editor/gameplayWorldHost.ts | 更新 | 实际factory先组装同fixed World/资源的Audio，再注入Timeline；legacyRoot由显式options决定。 |
| src/editor/animationTimelineAdapter.ts | 更新 | 实际Timeline音频声部使用注入实例；独立Editor路径保留原兼容默认。 |
| src/runtime/GameplayRuntimeCore.ts | 更新 | 原音频调用只变为本Core Audio接收者；构造绑定factory并严格World/catalog匹配；真实begin/frame/stop/Rhai走同实例。 |
| src/runtime/gameUi.ts | 更新 | 原GameUiRuntime整个类算法保留，4音效调用改为constructor显式端口；默认Editor单例保留。 |
| src/components/WorldCanvas.vue | 更新 | 实际有runtime prop时创建该Core Audio驱动的UI控制器；Editor无prop保留旧单例，模板/样式与其余逻辑整逆。 |
| scripts/lib/audioOwnerContract.mjs | 新增 | Exact reviewed Audio16 full-source inverse and enumerated guard fixture |
| scripts/fixtures/audio-owner-transform-v1.json | 新增 | Exact reviewed Audio16 full-source inverse and enumerated guard fixture |
| scripts/lib/packageContractHostContract.mjs | 更新 | Only static Audio-before-Package normalization; every original assertion and whole helper inverse retained |
| scripts/verify-engine-gameplay-world-host-contract.mjs | 更新 | Old settings reexport and whole-audio assertions now receive exact Audio inverse; all original assertions retained |
| scripts/audit-engine-source-boundaries.mjs | 更新 | Append actual pure Audio entries; prior forbidden edges and failure rules unchanged, no type erasure counted compiled |
| scripts/audit-engine-boundaries.mjs | 更新 | Append actual pure Audio entries; prior forbidden edges and failure rules unchanged, no type erasure counted compiled |
| scripts/verify-engine-audio-owner-contract.mjs | 新增 | Actual installed/default Audio16 proof and lifecycle/wiring mutation rejection |

风险核查：设备路由有界为1 active+1 latest pending，同Context begin保留active避免并行setSinkId；过期世代/请求不能回写诊断；部分初始化失败清理监听/节点/cache/context，close失败明确报告；读取消保留AbortError及原因。仍不能强制取消已开始平台操作。每clip32MiB、每engine resident64MiB及原16 decode上限保留，但多Owner全局额度尚未完成。

缓存同源资格：实际Core/Rhai/普通WASM原4项1PASS/3跨世界FAIL→4PASS，原solo输出相同；新增5项含真实Rhai音频命令通过。原生命周期7项加设备路由/失败清理等共12项PASS；发现same-Context begin新回归的原FAIL保留，最终R05实际通过。11Core/13WASM World/媒体元素释放；无残留监听/未处理拒绝/自有任务。完整634源码Vue/config检查通过，16整源及8原文件完整逆变换、未知变异拒绝通过。Root叠加当前3e+Audio16后默认五个永久入口通过：34 M1/26动画保存/8WorldHost/10包/30Audio；首次旧WorldHost读门面合同FAIL保留，修为完整逆变换输入，未删除或放宽原断言。

安装前626当前源、271不可变产物、6原生源、AGENTS和主指令逐SHA保护。23源码/永久合同逐前像备份及计划在.cache/engine-overhaul/root-integration-next/formal-audio-owner-attempt1/；文档前像保留。§30/64对Host/Core、Timeline/UI/audio调用、兼容facade、平台字节读取、取消/清理/ABI关联已审查；无ABI/layout/线程/渲染/权限变化。正式类型/冷构建/边界/新产物Editor及Player GUI接下来执行。

已实现不等于全项验证：PCM硬件输出、设备权限/用户激活、真实WebView设备行为与端到端音频时延NOT_TESTED；Worker语义AudioHost/全局调度额度仍待实现。GameUi现有presentation/locale/resource以及productionRuntime fault/store旧authoring链仍待隔离。无性能提升结论，QualityLocked/AdaptiveExperience与完整M0–M8/X0–X6、Linux/H2/发行尚未通过。Comfortable16/44、留白/圆角和原motion不改，Canvas模板/样式完整保留。


### 2026-10-09 音频新组合正式验证

当前commit82c9c03118848df1c07af323c38a3abade7dd21b/main。pnpm check exit0（完整raw check.log），pnpm build:engine:profile exit0/编译13.30秒，不叫运行性能。buildId engine-profile-c82ded03995fe4f2f865、sourceHash c82ded03995fe4f2f865bff2b47d55b5099ba8c6c9fb417b8f5e93011b7cd110、manifest SHA 82bc21f8f670a86e2ebd682df522f68eb0fc5876973c4ec0e7630cb1b7a5e2e2；634源/271产物零overlay在.cache/engine-overhaul/root-integration-next/merged-c82ded03995f、.cache/engine-overhaul/profile-dist-c82ded03995f冻结，仅批准Audio16生产差异。安装源原34/26/8/10加Audio30永久检查全部通过；缓存实际Core/Rhai/WASM/最终12生命周期独立绑定相同字节。

源码整体仍NOT_PASSED：Core16（原17）/compat19（原20）/Player17不变；新9音频值/类型入口独立0禁止边。编译整体仍NOT_PASSED：Core24不变/compat34（原33）/Player48（原47），真实Player emitted43（原42）。新增Editor audioAdapter仍经旧GameplayRuntime→EditorHost可达；Core其他路径tilemap→AssetDB/importPipeline仍在，因此不能把Audio纯模块资格当整体Player隔离。style scoped-id变更是编译模块身份变动，不冒称新增组件功能。

6原生源原字节沿用旧locked资格未重复编译，nova_core/Cargo.toml与src/lib.rs不在profile源码清单的缺口仍明确记录；本产物未宣称Rust唯一权威/完整原生闭包。真实新cohort同项目/PAK的Editor/Player smoke待执行；Audio PCM、权限和硬件/正式性能NOT_TESTED。Comfortable模板/样式与motion未被降低。M1整体、Worker、完整renderer/WebGPU、发行、B0–B8/X01–X15、QualityLocked/AdaptiveExperience、Linux/H2均未由此切片完成。


### 2026-10-10 c82 音频正式GUI与协议联合验证补充

中断后完整634当前源/271冻结产物/6专列原生/主指令零漂移（resume-c82-20261010.json）。同原11实体8资源59组件/PAK，1600x900/DPR1/app scale1，新产物原Editor3/3与Player2/2PASS。Root亲看同Inspector PNG，舒适16/24行框/44输入/9×16内距/12圆角及379宽仍成立；headless/SwiftShader、physicalDPI null。独立小WAV/项目副本的额外实际Audio GUI2/2：trusted用户激活、真实AudioContext running/buffered voice1、公开Preview播放与暂停、退出dock后observer/process/server/timer清理；原项目/PAK不替换。Root亲看playing PNG，但未听到实际硬件声音；native设备/权限/硬件时延NOT_TESTED。首夹具Playing文案大小写FAIL在formal-audition-c82ded-p318Po保留，仅新driver期望纠正，正式源不改；成功raw在formal-audition-c82ded-rdped0。

公共帧协议Root fresh replay12/12全部exit0：Rust debug5/TS/独立golden、普通WASM借用/NodeWorker transfer、消费者崩溃恢复与CPU实际前端；22raw references在frame-packet-contract-root/root-replay-attempt1/root-correctness-addendum.json。严格使用原ac155→5e343 collector基础，非c82生产接入；无GPU、无正式源写。GPU64有8/48 float变化，图像/颜色语义、Rust Arena/完整Frame/EngineWorker仍未验证，不计正式性能或M3完成。

### 2026-10-10 故障报告隔离与profile原生来源补齐（逐文件）

| 文件 | 编辑 | 内容与影响 |
|---|---|---|
| src/runtime/runtimeFaultRecords.ts | 新增 | 新增纯应用故障Owner，完整8原函数/历史64保持；唯一原raw状态由可选Vue代理包装，最多65个ID通知/8192 UTF8描述字节，排空成功后才移除。 |
| src/runtime/faultCenter.ts | 更新 | 原Editor兼容API保留，显式同raw Vue代理与旧logger安装/有限排空；所有原调用者读取同Owner，冷Runtime不引Editor。 |
| src/contracts/applicationLog.ts | 新增 | 下沉原完整EditorLogCategory有限联合类型；类型输出擦除不当值入口资格。 |
| src/store/editor.ts | 更新 | 只替换/重导出原日志类别类型引用；整个日志实现和原store其他代码完整不变。 |
| src/runtime/productionRuntime.ts | 更新 | 仅把原3故障报告调用的模块路径指向纯Owner；完整网络、RPC、输入、启停函数逐字不变。 |
| scripts/lib/runtimeFaultRecordsContract.mjs | 新增 | 读取实际安装源的5整源校验/3完整逆变换/缺失linked Owner和未知修改拒绝；不修改旧合同。 |
| scripts/fixtures/runtime-fault-records-transform-v1.json | 新增 | 冻结Fault5完整原源与定位逆变换/8原声明，已知来源集合闭合。 |
| scripts/verify-engine-runtime-fault-records-contract.mjs | 新增 | 实际默认安装源32项永久合同，保原8函数与同raw代理/通知背压/变异拒绝。 |
| scripts/audit-engine-source-boundaries.mjs | 更新 | 只追加实际纯Fault入口；所有原遍历/禁止条件/失败出口不改，compiled不注册擦除类别类型。 |
| scripts/audit-engine-boundaries.mjs | 更新 | 只追加实际纯Fault入口；所有原遍历/禁止条件/失败出口不改，compiled不注册擦除类别类型。 |
| scripts/build-engine-profile.mjs | 更新 | Source roots新增nova_core/src，配置清单新增nova_core/Cargo.toml，补齐此前已单列的2包装源码；完整旧构建/图统计/安全路径/WASM限制文字不改。 |

实际问题：Core→productionRuntime→旧faultCenter→Editor store→physics/旧Save链带入编辑器；旧故障调用只在remote callback/startup/shutdown失败分支，不虚构每帧故障报告。Runtime故障记录现在纯值Owner，Editor兼容门面安装同raw的Vue代理及原logger，8原函数/default/body完整保留，Editor故障恢复面板继续用原状态。通知有界为65条/8192 UTF8描述字节，原64历史及payload截断不改；超限/过期明确计数，Hostthrow保留pending、只成功排空；不加轮询或第二个状态Owner。

缓存资格仅634→636：前后完整Vue、原五34/26/8/10/30及新增Fault32永久合同PASS；实际原11例前后完全一致、新7例PASS，包括真实Vue watcher/旧ErrorRecovery及实际production shutdown catch。旧夹具/原FAIL保留，不更改测试容差。永久3文件只增加完整源/原8声明/linked变异拒绝，不修改旧合同；源码门追加实际Owner+类别类型，compiled仅值Owner不拿类型擦除充数。

原生包装来源清单另属元数据修复：两个早已存在/未变的nova_core/Cargo.toml、src/lib.rs将进入下一profile manifest，旧构建全部逻辑完整逆变换保持，候选node语法检查通过。预期源清单636→638，新增登记不是源码新功能或本次重新编译WASM；实际构建后按真实值验收，不倒套先前634/636报告。

安装11文件前像、完整计划与doc前像在.cache/engine-overhaul/root-integration-next/formal-fault-owner-attempt1/；§30/64 production fault入口/Editorlogger/Vue单raw视图、类型兼容/有界队列/失败清理/构建来源已处理；无协议布局、Worker/GPU/物理/脚本/权限/舒适UI或动效改动。后续正式类型/六合同/冷构建/双边界/新GUI待执行。整体M1、M0–M8/X0–X6、QualityLocked/AdaptiveExperience正式采样、Linux/H2、完整发行仍未完成。


### 2026-10-10 Fault新组合正式验证与剩余替代链

pnpm check及六组34/26/8/10/30/32安装源合同全部exit0，完整raw日志保留；优化profile编译exit0/14.86秒不叫运行性能。buildId engine-profile-e74e7772acdd6c6df5c2、sourceHash e74e7772acdd6c6df5c241c2fd560eab31ea48244b26f622d6ee10cf85625f7b，638源/271产物零overlay/漂移冻结于.cache/engine-overhaul/root-integration-next/merged-e74e7772acdd和.cache/engine-overhaul/profile-dist-e74e7772acdd。从c82只5已审生产文件+1build来源清单更新，以及2未修改的原native包装源码新增记录，共8manifest差异；638并不代表native Tauri全源码或新WASM编译。原6专列native不变复用原资格未重跑。

安装时src/contracts目录尚不存在，在前两计划项后ENOENT停止；interrupted-attempt.json保留真实状态，精确前像+已写afterSHA全部检查后仅补父目录及剩余9项，原doc前像不变并完整恢复到11计划字节；recovery-receipt.json记录，不执行reset或重覆用户文件。

源码边界仍NOT_PASSED：Core14（原16）/compat17（原19）/Player17不变；纯Fault Owner与类别类型0禁止边。编译边界仍NOT_PASSED：Core24/compat34/Player48/emitted43不变，纯Fault Owner0。实际Core可达路径不再经过faultCenter，但替代链Core→tilemap→AssetDatabase→assetGraph→graphCompiler→graphCatalog→plugins→Editor store→physics→旧Save仍存在；scriptApi另从graphCatalog可达。只证明此次故障链已正确拆除，不按计数伪造整体隔离成功。

.cache/engine-overhaul/root-integration-next/merged-e74e7772acdd/integration-receipt.json关联真实失败边界、完整类型/冷构建/旧合同/Fault32、原11Exact+新7以及首次安装失败/恢复和native来源补齐。新e74产物Editor/Player GUI待同原项目/PAK短smoke；c82原5+Audio2资格明确原build身份，不套新构建重测；motion源码不改，前台及时收敛/硬件性能仍未认证。M1整体、Rust Arena/Worker/完整渲染/WebGPU/发行、B0–B8/X01–X15、QualityLocked/AdaptiveExperience、Linux/H2仍未过门槛。


### 2026-10-10 e74 故障正式产物 GUI 回归与下一字幕隔离切片

新故障/来源登记构建 e74e7772acdd：638当前源/638冻结源/271产物/6专列原生及主指令、原项目/PAK前后零漂移，原 Editor3/3、Player2/2均PASS。同原11实体8资源59组件、1600x900/DPR1/app scale1；Root亲看新Inspector截图，主要字号16、行框24、44输入、9×16内部padding、输入圆角12及面板圆角16仍保持。原5项只证明非空项目加载、Play/Stop文档保持、保存重开及Player键盘焦点，不冒作D位移、全动效或正式性能验收。headless Edge/SwiftShader，硬件GPU/物理DPI/Tauri/Linux/H2仍NOT_TESTED。raw/report在replay-world-review/formal-gui-e74-a1tRwF/，终态handoff在formal-gui-e74-handoff-gKmqoT/；自有Node/browser/server/profile全部结束。未重跑未改的Audio或动效采样。

### 2026-10-10 固定 World 字幕 Owner 正式迁移（逐文件）

| 文件 | 编辑 | 内容与影响 |
|---|---|---|
| src/runtime/presentationOwner.ts | 新增 | 新增固定 World 的纯字幕/无障碍/界面音效设置 Owner；原11函数算法、32字幕上限、ID、时长与默认值保持，退休 Owner 拒绝继续写入。 |
| src/runtime/presentation.ts | 更新 | 保留公开名称与原配置读写；原同 raw 的 Vue 视图经显式 legacy provider 使用唯一字幕 Owner，不再让 Core 引用该 Vue 门面。 |
| src/editor/presentationAdapter.ts | 新增 | 新增唯一 Editor 同 raw 代理与固定 World 构造桥；外来 Runtime 用独立设置种子，重绑保留字幕序号并阻止旧 Owner 尾部写入。 |
| src/runtime/GameplayRuntimeCore.ts | 更新 | 构造要求同 World 字幕 Owner，原 begin/frame/manualstep/stop 时钟调用机械改为自身 Owner；在输入和世界修改前拒绝错误身份。 |
| src/runtime/gameplayWorldHost.ts | 更新 | 新增必需 createPresentationOwner 能力，保持其他原接口与输入、音频、存档字段。 |
| src/editor/gameplayWorldHost.ts | 更新 | 显式装配当前 World 的字幕 Owner；兼容 Editor 全局配置与外来 Runtime 独立状态。 |
| src/runtime/gameUi.ts | 更新 | 新增可选字幕设置读取端口，真实 HUD 的字号、焦点与界面音效从相同 Core 设置读取；无参数旧行为保持。 |
| src/runtime/uiTextPresentation.ts | 更新 | 文字绘制和测量增加末尾可选无障碍参数，旧默认、字体、本地化、测量、绘制算法保持。 |
| src/components/WorldCanvas.vue | 更新 | 接入所传 Core 的字幕/无障碍/界面音效设置；最后一条字幕移除或 Stop 后刷新原 computed，避免残留可见字幕；不新增帧循环。 |
| scripts/lib/presentationOwnerContract.mjs | 新增 | 新增独立9文件严格资格与11原函数/7完整文件逆变换；未知源码与缺少关联 Owner 拒绝。 |
| scripts/fixtures/presentation-owner-transform-v1.json | 新增 | 新增封存前像、定位变换与公开类型/default/bodies，严格限定批准的字幕改动。 |
| scripts/verify-engine-presentation-owner-contract.mjs | 新增 | 新增实际默认安装源22项合同及变异拒绝，源码零写入。 |
| scripts/lib/audioOwnerContract.mjs | 更新 | 旧 Audio 合同仅前置已批准 Presentation 精确逆变换；旧已接受 SHA 早返避免重复逆变换，完整旧 helper 与严格拒绝策略保持。 |
| scripts/verify-engine-audio-owner-contract.mjs | 更新 | 先验证实际 Presentation9/Audio16，再静态归一执行全部旧30断言；最终来源记录恢复实际安装字节，不削弱断言。 |
| scripts/audit-engine-source-boundaries.mjs | 更新 | 仅追加实际纯 RuntimePresentationOwner 值入口，原遍历、拒绝规则、全 Runtime/Player 门禁和失败状态完整保持。 |
| scripts/audit-engine-boundaries.mjs | 更新 | 仅追加实际纯 RuntimePresentationOwner 值入口，原遍历、拒绝规则、全 Runtime/Player 门禁和失败状态完整保持。 |

确认缺陷：两个实际World/Core的B begin/tick/stop原本会清理A字幕或改变A时钟；原10项中3项隔离FAIL。候选通过同10原断言及新增11项实际Rhai/Core/真实Vue/编译SFC SSR/GameUi/uiText消费、World身份、重绑/退休尾部保护；总21/21。曾真实发现plain字幕最后dismiss/Stop不刷新Canvas computed的2项回归，原after-I28WR0 FAIL保留，单一刷新条件修复后同断言PASS。该21范围是旧Audio634→Presentation636缓存功能配对，不能倒套为本次640统一构建或GPU视觉验收。源码9实际字节及7旧整文件/11函数独立逆证明在presentation-independent-review-attempt1/report.json。

本次实际集成缓存基线为e74正式638+新增Presentation2=640：Vue/Node完整类型exit0，原六合同34/26/8/10/30/32及新增Presentation22全部PASS。永久Audio helper/entry整逆精确回旧前像，实际9/16先严格验源再静态归一，原30断言逐字保持；首次Package重复归一失败在permanent-composition-attempt1/run-U4d11p/保留，仅原已登记exactSHA早返修复，不扩充Presentation历史接受集合。候选/类型/原raw证据由permanent-composition-attempt2/handoff/ledger.json统一封存。

§30/64：固定World/同Owner注入、旧公开配置与Editor同raw视图、Core输入前身份检查、HUD及文字测量/音效、最后字幕卸载、缺Owner/未知源码拒绝和双边界入口已处理；Worker协议、Rust权威/物理、renderer算法、locale、PAK、权限、字体token/Comfortable几何和Motion未改。Foreign设置是构造时独立种子，运行时更改需显式Owner配置；旧无参数Editor配置仍为全局实时视图，不宣称新增项目范围自动传播。临时legacy单根桥将在所有无World配置/字幕API调用者显式接Owner后退出，不代表两个并存Editor文档独立。

16文件完整前像、doc前像及安装计划在.cache/engine-overhaul/root-integration-next/formal-presentation-owner-attempt1/。当前状态IMPLEMENTED，接下来正式默认安装源七合同、类型、冷profile构建、双边界及新产物真实GUI待执行。完整M1/Player隔离、M0–M8/X0–X6、QualityLocked/AdaptiveExperience正式基准与最终发行仍未通过。


### 2026-10-10 Presentation新组合正式验证与边界实情

pnpm check及安装源七组34/26/8/10/30/32/22均exit0；优化profile编译exit0/15.03秒仅为编译时长，不叫运行性能。新buildId engine-profile-7d501af718759aa16f60、sourceHash 7d501af718759aa16f60e302fe77338899fbb336835dfd9d68b5b5a3fb0e9887，640源/271产物，0overlay/0源与冻结漂移，封存于.cache/engine-overhaul/root-integration-next/merged-7d501af71875及.cache/engine-overhaul/profile-dist-7d501af71875。从e74只9已审生产差异（7既有接线/2新增），Rust/pkg/6专列native来源未变；本次无新Rust/WASM或nativeTauri编译。

新增纯Presentation值入口源/compiled均0禁止边。整体源码边界仍NOT_PASSED：Core13/compat16/Player17；compiled仍NOT_PASSED：Core24/compat35/Player49/emitted44。Core禁止模块集合与旧24完全相同，旧替代链仍使编辑器可达；compat/Player新加editor/presentationAdapter.ts是显式旧Editor兼容桥，尚未被真正独立Player入口剥离，不能掩盖新增1边或宣称整体改善。Player SFC scoped CSS ID仅因源码更新变化，不按它冒作新增功能。完整逐模块差异登记在新integration receipt。

此前e74 GUI5资格保持原身份；新7d50产物需同原项目/窗口/PAK真实GUI烟测。缓存实际21业务/Rhai/Vue/SFC属于明确旧634→636切片，未标为当前统一640运行证据。Comfortable token、Motion系统/旧严格收敛失败均保持；GPU、QualityLocked/AdaptiveExperience正式基准、Linux/H2仍NOT_TESTED或未达门槛。M1总体、Rust Arena/EngineWorker、独立Player发行和完整M0–M8/X0–X6仍未完成，下一片继续根据已复现Replay/虚拟输入/TileMap所有权问题推进。


### 2026-10-10 Presentation640新产物原五项GUI与Inspector布局

新7d501统一产物已真实执行原Editor3/Player2：同11实体/8资产/59组件项目、原PAK、1600×900/DPR1/uiScale1，原两driver及全部五断言字节未改，独立fresh profiles全部PASS。项目打开、Play/Stop作者内容保持、保存重开、Player非空包加载、键盘焦点分别有原raw和五PNG；source640/immutable271/6专列native/master/AGENT/项目PAK前后守卫零漂移，两个自有Node结束，浏览器/服务/profile原helper清理。

Root亲自查看actual-comfortable-inspector.png：实际16px/24px文字，44高输入，内部9×16padding/r12，Inspector379宽/r16、统一20panelinset/12标签gap/20字段gap，root/panel无横向溢出。未改变缩放/DPI/项目/选中对象来制造留白。

原GUI组合report .cache/engine-overhaul/replay-world-review/formal-gui-presentation-7d-aBbp4s/report.json SHA a36a293a72a8b49cf8b664a932ccdf44a6aafcc7c4cd3b37ebeddb2902c6872d；封存入口 .cache/engine-overhaul/root-integration-next/presentation-original-gui-handoff-9xcrLV/handoff.json SHA 5cb110a95fda717e35da36c0bb5e43995481d7506356dc341f6712e7e5df7b5d。WebGL2实际软件SwiftShader；不宣称物理GPU/Tauri/前台/完整动效流畅/字幕/真实移动/正式QualityLocked或AdaptiveExperience验收。此前GUI、旧严格Motion3s失败与其他平台缺测均保留。另行字幕诊断首次停在Design场景视图造成显示断言FAIL，原raw已保留，改用现有Debug/game公开视图后再查，生产算法未因此改动。


### 2026-10-10 Presentation640真实字幕DOM（明确诊断范围）

同7d501产物与原项目/PAK，两个独立Edge软件WebGL2 profile在1600×900/DPR1/uiScale1执行6项实际字幕DOM诊断：Editor与Player现有Core/同World的字幕发布显示、最后一条dismiss后raw与可见层清空、Stop清空均通过。Editor使用Debug/game公开入口及公开Stop，保存后scenes/assets/projectSettings与原baseline完全一致；Player是显式诊断Core API，不称公开用户字幕功能。Root亲自查看中英文字幕两张PNG，未缩放截图。

Player Core.stopSession(false)在同一次调用内active=false/captions0；旧宿主playMode仍playing，原frame的if(!active)beginSession下一帧自动启动，实测active=true且字幕层保持空。此条仅证明字幕卸载，不能证明Player全宿主持续停止。首次fixture误停Design视图和第二次持续inactive错误预期均保留FAIL；v2只改公开game选择/失败清理记录，v3追加同步Stop与原宿主重启断言，不改生产/时钟/宿主状态，不删原raw。

封存 .cache/engine-overhaul/root-integration-next/caption-dom-handoff-pRq1yT/handoff.json SHA df4e158e81e7e7b9dd0b7d118ebbe194f9d194db987dd73d9a0e2a5317c3d759；最终原raw .cache/engine-overhaul/root-integration-next/caption-browser-7d-mYOGwE/report.json SHA 2966d8efbefb4dcb09da894b26e7050e61e7a4bda466391c6a4b1168e4f34b43。640源/271immutable及served产物/native6前后0漂移，两次临时CDP breakpoint/事件/诊断引用全部移除，浏览器/服务/profile结束。捕获实际Core的一帧调试暂停影响计时，全部排除性能验收；软件GPU/静态PNG不能证明物理输入到显示、Tauri、前台动效或正式基准。只追加本证据，不更改此前失败/阶段门槛。


### 2026-10-10 VirtualControls固定输入Owner正式迁移（逐文件）

| 文件 | 编辑 | 内容与影响 |
|---|---|---|
| src/runtime/virtualControlsInputOwner.ts | 新增 | 无value依赖的同Runtime/World输入绑定；唯一原recompute算法，同input退休token与晚到cleanup保护，只释放自己已接受的动作，无新时钟。 |
| src/components/VirtualControlsOverlay.vue | 更新 | runtime/world/inputActions可选显式props，旧无arg默认保持；原10事件/指针函数、template/styles原字节不改，完整prop tuple pre watch重绑，blur/pagehide/hidden/unmount取消捕获输入。 |
| src/components/WorldCanvas.vue | 更新 | 唯一template行传所选Core、其presentation.world及当前inputMap；字幕修复、所有绘制/输入算法与布局保持。 |
| scripts/lib/virtualControlsInputOwnerContract.mjs | 新增 | 实际3批准SHA和2完整文件逆变换/10原声明/唯一原算法守卫；未知或缺关联源拒绝，不依赖Presentation helper。 |
| scripts/fixtures/virtual-controls-input-owner-transform-v1.json | 新增 | 封存实际3前后字节及明确定位变更，只允许本次虚拟输入归属修复。 |
| scripts/verify-engine-virtual-controls-input-owner-contract.mjs | 新增 | 新增24安装源合同，先验actual3再校原Presentation9；含未知/缺Linked/tamper负向，不替换业务17原assert。 |
| scripts/lib/presentationOwnerContract.mjs | 更新 | 只前置严格Virtual3逆层，再原9 SHA/11算法/6wire判据；3机械变换完整逆回旧helper，原fixture和七entry全文保持。 |
| scripts/audit-engine-source-boundaries.mjs | 更新 | 仅增加actual纯Virtual输入Owner值入口，原整体Core/compat/Player遍历/失败规则不改。 |
| scripts/audit-engine-boundaries.mjs | 更新 | 仅增加compiled纯Virtual输入Owner值入口，整体失败状态和真实产物要求不改。 |
| docs/RUNTIME_STAGE.md | 追加 | 本次逐文件后果、确认串扰、验证范围与未完成项；前文所有失败和门槛保持。 |

确认旧c82及Presentation640同5业务中2正控PASS/3归属FAIL：显式foreignCore B Overlay仍把pointer/Enter/joystick输入送compat根Core。actual候选641同5加12项=17/17 CPU/Vue真实InputManager/SFC通过；另23静态/坏源及完整类型通过。首候选sync逐prop更新错配14PASS2FAIL已保留，改为pre完整tuple；非可见SSR私有setupState夹具改公开props，不宣称SSR触屏/mount。仅native World分配/释放，不倒套为Rhai/tick验收。

缓存永久组合before640/after641原七34/26/8/10/32/30/22每套162项均PASS，新增24PASS，完整Vue0；原七entry/Presentation fixture字节原样。Root独立严格3/9逆及3未知source拒绝通过，原helper与2门禁整逆回前像；首次Root缓存缺既有fixture ENOENT和Agent误选catalog/统计顺序错误均保留，不改判据。交接a0285c4c…/da3c5f0a…及具体安装计划 .cache/engine-overhaul/root-integration-next/virtual-input-install-preparation-qxbFZz/preparation.json SHA 5701f127018a4add01e7b3f7f10f9a651cbf119da02e0dae14d9ed363e1bc5d4，完整前像/收据在 .cache/engine-overhaul/root-integration-next/formal-virtual-input-owner-0XPdZ0。

§30/64：同World/同Input、手势取消与tuple重绑、动作范围释放、legacy fallback、纯Owner源/compiled门禁与8合同已处理或待正式验证；原精确指针值/样式、普通WASM/Worker协议/PAK/物理/Renderer/Audio/Saves/Motion不改。非Overlay其他virtual来源同action仍旧last-write Map，DeviceInputPanel singleton清理尚未迁；legacy Overlay整体仍依赖Editor，纯Owner不代表独立Player完成。

当前IMPLEMENTED，正式默认8合同/类型/新冷profile/双边界/新GUI与实际虚拟控件路径待执行；真实硬件触屏、Tauri、前台、性能基准、Linux/H2及整体M1 NOT_TESTED或NOT_PASSED。无新依赖、功能删除或画质/Comfortable退让。


### 2026-10-10 Virtual641新组合正式验证与边界实情

pnpm check及安装源八组34/26/8/10/30/32/22/24全exit0，186项；优化profile编译exit0/14.38秒仅编译时长，原大chunk警告保留。新buildId engine-profile-210f7f3a28e0aa1e8334、sourceHash 210f7f3a28e0aa1e8334ed6249c1a2efc5755d446072cdf9bfb7e7a2894e8e07、641源/271产物，0overlay/0漂移，仅3批准生产差异（2接线/1新Owner），无源删除；原Rust/pkg/native6未变，无新WASM/Tauri编译。完整快照.cache/engine-overhaul/root-integration-next/merged-210f7f3a28e0及.cache/engine-overhaul/profile-dist-210f7f3a28e0。

actual纯Virtual输入Owner与PresentationOwner source/compiled禁止边均0。整体source仍NOT_PASSED：Runtime core=13 / Runtime compatibility composition=16 / Player=17；compiled仍NOT_PASSED：Runtime core=24 / Runtime compatibility composition=35 / Player=49 / Player emitted production chunks=44。完整集合差异在integration receipt，不以纯Owner入口掩盖兼容Player/Editor可达；Overlay仍有Editor无arg默认桥、DeviceInputPanel与同名virtual跨来源仲裁仍未迁。

此前7d640原GUI5及实际字幕6证据保留原build身份；新210f641原GUI及真正虚拟控件输入业务待执行，缓存641CPU17/静态23不冒充当前统一构建浏览器验证。Comfortable geometry/template/styles与Motion字节保持，所有旧失败保留；QualityLocked/AdaptiveExperience正式性能、Linux/H2缺测，Rust权威/Worker与完整M1/独立Player发行/M0–M8/X0–X6未完成。


### 2026-10-10 VirtualInput641新产物原五项GUI与舒适布局回归

统一210f7f3a28e0产物真实执行原Editor3/Player2，全部5项PASS。使用原11实体/8资产/59组件项目、原PAK、1600×900/DPR1/uiScale1；原两driver和业务断言未改。项目打开、公开Play/Stop后作者内容保持、保存重开、Player非空包与键盘焦点分别有原raw及5张PNG。641源码/271冻结产物/6专列native、主指令、AGENTS与项目PAK前后守卫零漂移；两自有Node结束，原helper负责浏览器、服务器和隔离profile清理。

Root已查看同条件actual-comfortable-inspector.png，实际16px/24px文字、44高输入、上下9/左右16内边距、输入r12、Inspector379宽/r16保留；panel inset20、标签gap12、字段gap20，根与面板无横向溢出。没有改变项目、缩放或DPI来制造舒适布局。

组合原始记录 .cache/engine-overhaul/replay-world-review/formal-gui-virtual-210-KMhKCY/report.json SHA 24e8d275cc6ec184269b305bac88425d8a7e76f574d492e61eed930eb63f1c6b；封存入口 .cache/engine-overhaul/root-integration-next/virtual-original-gui-handoff-w2S7tj/handoff.json SHA 615650307b0d926dbcad0bbfb343d629c5229cdffe21600ab85bd469a1a0fb0c。实际后端为headless Edge/SwiftShader WebGL2，以上仅VERIFIED启动/保存/布局与焦点，不证明虚拟按钮/摇杆/取消/实际移动、完整动效、真实GPU/Tauri/前台/Linux或正式QualityLocked/AdaptiveExperience性能；相应真实输入路径另行验证。完整Runtime/Player依赖门仍NOT_PASSED，旧严格Motion失败、字幕首次失败及全部历史限制保留。


### 2026-10-10 GraphDebug真实API只读归属审查

当前正式210f/641未改，实际Vite SSR加载6个仓库模块，完整graphDebugger15原函数已登记。7项有限检查全部执行：2项现有单会话正向能力（断点/Watch/Trace/Snapshot与Step/DepthClamp）保持；5项CONFIRMED共享状态问题包括第二catalog同graph ID覆盖断点文档、另一scope最新Trace成为热重载变量、同node ID覆盖率/错误合并、另一会话begin清空文档/轨迹、clearPause影响共享暂停。Core调用链begin566/Stop851/hotReload949/debugStep1020/recordTrace1420/compiledGraph1739明确使用该全局对象。

原始记录 .cache/engine-overhaul/root-integration-next/graph-debug-readonly-cuL69s/report.json SHA a1e514798950bf0da7e5cc87543fd86fb7d08feba6fb9d9b20bc360df80c6884；封存 .cache/engine-overhaul/root-integration-next/graph-debug-readonly-handoff-p9UABk/handoff.json SHA b1f7896e96878cc202b7d5296ee44c5bd676525734d687619b8700e91c3bc4ad。该复现直接执行实际模块API及确认Core静态调用链，尚未实例化双Core/World，不宣称其完整集成已验证，也不算已修复。无生产源写入、641源码守卫零漂移、无浏览器/Worker/World，Vite已关闭。首次Windows路径清单为0的记录 .cache/engine-overhaul/root-integration-next/graph-debug-readonly-ksJbRG/report.json 保留为清单未合格；第二仅修缓存路径规范化并强制非空，不改业务断言或源码。后续固定World/graph catalog Owner必须保持原函数、响应式Editor视图与真实调试路径；§30/64依赖、生命周期、草稿和HotReload关联均待实现核对。


### 2026-10-10 Replay固定World归属正式迁移（逐文件）

| 文件 | 编辑 | 内容及影响 |
|---|---|---|
| src/runtime/replayOwner.ts | 新增 | 每个固定World自己的Replay状态、pendingInput与xorshift随机种子；原10函数完整算法/参数、19声明与全部边界保持，无新时钟。 |
| src/runtime/replay.ts | 更新 | 保留原9公开转发签名，显式Editor sameRaw/lazy Owner安装，纯Runtime无Editor默认；未经安装的legacy调用明确拒绝。 |
| src/editor/replayOwnerAdapter.ts | 新增 | 唯一Editor响应式sameRaw视图；根World校验与懒绑定，新foreign Owner独立，原冷初始化不创建World或调用provider。 |
| src/runtime/GameplayRuntimeCore.ts | 更新 | 在输入/原生修改前绑定并校验host ReplayOwner/World，固定步、checksum和Rhai随机回调使用自身Owner；保持Core.Stop→ProfilerFinish导出顺序。 |
| src/runtime/gameplayWorldHost.ts | 更新 | 明确要求固定World Replay factory与只读配置端口，无隐式Root回退。 |
| src/editor/gameplayWorldHost.ts | 更新 | Editor root与foreign游戏配置显式创建对应ReplayOwner，保持其余host功能及顺序。 |
| scripts/lib/replayOwnerContract.mjs | 新增 | 6实际批准源SHA、原函数/参数逐字、完整wiring逆变换及坏源拒绝；不导入旧链或建立循环。 |
| scripts/fixtures/replay-owner-transform-v1.json | 新增 | 封存本次6源码的准确前后像、19声明/10算法/3接线及原Replay bounds，不开放通用白名单。 |
| scripts/verify-engine-replay-owner-contract.mjs | 新增 | 44永久安装合同含未知/缺失/变异linked Owner拒绝；原8入口和105运行断言原样。 |
| scripts/lib/presentationOwnerContract.mjs | 更新 | 3精确插入：先严格Replay逆层，再Virtual/Presentation原校验；整个helper可逆回原13e07字节。 |
| scripts/lib/packageContractHostContract.mjs | 更新 | 2精确修改，fixture3仍由首reader严格读，明确第二reader负责同版本关联源；无undefined自动fallback，整个helper逆回旧字节。 |
| scripts/audit-engine-source-boundaries.mjs | 更新 | 仅追加实际纯ReplayOwner入口，保留原Core/compat/Player整体规则与失败条件。 |
| scripts/audit-engine-boundaries.mjs | 更新 | 仅追加compiled纯ReplayOwner入口，保持原生产图遍历、禁止边与整体失败条件。 |
| docs/RUNTIME_STAGE.md | 追加 | 本次全部逐文件后果、资格证据与未验证范围；原文及历史失败保持。 |

原641实际双游戏/Core测试中7项3PASS/4归属FAIL；643候选同7及3新增10PASS，原105assert字节与2正向完整native56/Replay输出EXACT。完整Vue/Node类型0，纯SSR/compiled2模块零Editor/Vue依赖。缓存before641/after643原八34/26/8/10/32Fault/30Audio/22/24均exit0、名称状态完全一致；新增44PASS。Root独立再验证6实际源码、Presentation9/Package3、6未知源码拒绝、Package显式缺失/变异linked拒绝及2原helper整体逆回，13文件计划 .cache/engine-overhaul/root-integration-next/replay-owner-install-preparation-WRktuv/preparation.json SHA 8e1a6ad47336c1be7b931579fbb44f9fa3ef05e3f6e1c5e312da0cb4431d2bfe，完整前像 .cache/engine-overhaul/root-integration-next/formal-replay-owner-qToT0X。

Rhai与普通WASM真实运行但不等同Rust Arena/World权威迁移。原bounds 60000帧/50000000字符/32checksum/256mismatch及原随机算法保留。Core.Stop故意保留Recording供原Profiler Finish export/asset/Undo，不能将自动idle当修复。原非canonical数字作者ID经loader重编号造成Replay checksum差异仍记录；本批不重写loader/physics。首壁钟输入duration比较失败、错误probe/缓存路径、Package三源reader关联范围失败均原raw保留；后者不是旧业务断言失败。

§30/64：Replay格式与原input snapshot语义、固定World生命周期/替换拒绝、Rhai随机回调、公开Record/Stop/Finish业务body、cleanup与纯依赖已处理；Worker/SAB/ABI/GPU/音频/新原生Arena在本slice不适用。正式当前新合同/完整类型/冷profile/双边界及新GUI待执行。无依赖、画质、舒适尺寸/留白/圆角或Motion改动。整体M1及M0–M8/X0–X6仍未完成，硬件/Tauri/GUI Replay/Worker/性能、Linux/H2分别NOT_TESTED，不以纯Owner证明完整Player隔离。


### 2026-10-10 Replay643统一正式验证与Virtual641实际输入证据

正式pnpm check exit0，九组34/26/8/10/30Audio/32Fault/22/24/44共230安装源合同全exit0；优化profile exit0/13.29秒仅编译耗时，大chunk警告保留。新buildId engine-profile-7f2a701a71f279836eac、sourceHash 7f2a701a71f279836eac3ef64bf8a0596de58b1b40fd0197cd75281b7d1e6422、643源/271产物，0overlay/0源及冻结漂移，恰6批准生产差异（4旧/2新增）；原native/Rust/pkg6专列不变，未做新Rust/WASM/Tauri编译。快照 .cache/engine-overhaul/root-integration-next/merged-7f2a701a71f2 与冻结 .cache/engine-overhaul/profile-dist-7f2a701a71f2。

纯Replay/VirtualInput/Presentation Owner source+compiled禁止边均0。完整source仍NOT_PASSED：Runtime core=12 / Runtime compatibility composition=15 / Player=17；compiled仍NOT_PASSED：Runtime core=24 / Runtime compatibility composition=36 / Player=50 / Player emitted production chunks=45。Core源禁止边13→12，compat16→15仅为本轮具体依赖变化；compiled兼容/Player增加显式Editor replayAdapter，完整新增/移除集合在receipt，不把新增Owner当完整Player隔离。原所有失败门槛保持。

先前统一210f/641的真实Virtual GUI另13PASS（Editor7/Player6）：按钮pointer/Enter、摇杆正负、browser pointercancel、公共blur/refocus、Editor卸载，读取真实input.snapshot及Core.inputSnapshot；不调用setVirtualAction或伪sample。运行当时641/271/native6/主指令/AGENTS/原项目PAK前后全相同，两独立Edge profile串行已结束，browser/server/CDP订阅清0。Root查看两实际PNG，88按钮/120摇杆及双行文字未裁切或重叠；Player沿旧全局样式较方，本批未改样式，不冒称刷新了该轮廓。截图的Profiler时间与非enumerable Vec2序列化不当位移/性能证据。handoff .cache/engine-overhaul/replay-world-review/virtual-gui-handoff-3YYLS4/handoff.json SHA3cc46d34aa60cbc66c313b5e8d5a92624f8f59f4d65d46333bf6895316e5d284，首新卸载导航夹具误点Console的6PASS/1失败保留，第二仅明确Design导航后原13通过。

13项输入和原GUI5严格保留641身份，不能倒套为当前7f2a/643新产物GUI；新643原GUI与Replay真实公开控制待执行。静态布局、动态软件事件和性能证据分开；物理触摸/Tauri/硬件/前台/Linux/H2与正式QualityLocked/AdaptiveExperience基准NOT_TESTED。Comfortable/Motion源字节未变；整体M1/独立Player/Rust权威/Worker及M0–M8/X0–X6仍未完成。


### 2026-10-10 Replay643新产物原五项GUI与舒适布局回归

统一7f2a701a71f2实际产物执行原Editor3/Player2全部5项PASS。原两driver及其断言未改；原11实体/8资产/59组件项目、原PAK、1600×900/DPR1/uiScale1。公开项目打开、Play/Stop后作者内容保持、保存重开、Player非空包及键盘焦点有独立raw和5张PNG。643源码/271冻结产物/6专列native及主指令、AGENTS、项目和PAK前后守卫零漂移；两自有Node结束，原helper记录浏览器/服务器和profile清理。

Root查看实际Inspector截图，保留16px字号/24px行高、44高输入、上下9/左右16内边距、输入r12、379宽/r16 Inspector，以及20面板留白、12标签到控件、20字段间距；该范围未见裁剪或横向溢出。未改变项目、DPI或缩放伪造宽松效果。

组合记录 .cache/engine-overhaul/replay-world-review/formal-gui-replay-7f2-FTLEtE/report.json SHA 2b4a341a6693e15acaf9ce4aa2faaed404b2bd1ddb4ccd50e2bd31f4a9ab3569；封存 .cache/engine-overhaul/root-integration-next/replay-original-gui-handoff-HjaRxH/handoff.json SHA 24a6f000139d606bcdf2a845508b8df42ec582e94f8f303e4ff3c13c1bf6250e。后端为headless Edge/SwiftShader WebGL2，以上仅VERIFIED狭窄启动/保存/布局与焦点；不验证公开Replay录制/Stop/Finish、Virtual控件、移动、全动效、真实GPU/Tauri/前台/Linux/H2或正式性能。历史不同产物证据与失败仍保留，不冒称当前构建已验证相同路径；完整Runtime/Player依赖门仍NOT_PASSED。


### 2026-10-10 TileMap固定World迁移：643→648正式逐文件编辑

公开Replay7f2 GUI已经报告8/8及完整cleanup，之后执行本次独立Tile切片。安装计划 .cache/engine-overhaul/root-integration-next/tile-owner-install-preparation-fLPldH/preparation.json SHA b8e41be5171ccc52afd298924997881ee128abd02d339e6d6f10c89b7bffd991，完整25文件前像和原进度文档保存在 .cache/engine-overhaul/root-integration-next/formal-tile-owner-HdFEKw。本批17生产+3独立来源合同+3最新投影适配+2纯入口门，以下为每一次正式文件编辑：

| 文件 | 操作 | 具体后果 |
|---|---|---|
| src/runtime/tilemap.ts | 更新 | 保留作者绘图/层/Undo/保存/bake；纯值及运行缓存下沉，旧无参API改明确兼容端口。 |
| src/runtime/sceneInstances.ts | 更新 | 运行场景实例化调用显式RuntimeSceneInstantiator；原作者捕获/事务/保存保留。 |
| src/runtime/tileSceneRuntime.ts | 更新 | 旧诊断/方法改lazy Editor兼容端口，保持state raw与重置参数。 |
| src/assets/tiledMapAssets.ts | 更新 | 类型导入改纯TileSet值模块，原解析/UV算法不改。 |
| src/runtime/worldGameplayOwner.ts | 更新 | Tile ports改固定World Map/Scene，创建本Owner放置子状态并正确Stop/reset。 |
| src/editor/worldGameplayAdapter.ts | 更新 | 组合实际World的Tile/Scene资源与旧Editor诊断，保留其它Owner。 |
| src/runtime/GameplayRuntimeCore.ts | 更新 | 四处瓦片时钟写入改本World子Owner，移除全局tilemap值导入；Replay改动保留。 |
| src/store/physics.ts | 更新 | 原Tile collider能力明确捕获新建World，避免引用另一个编辑世界。 |
| src/editor/navigationAdapter.ts | 更新 | Navigation读取同catalog TileSet资源和原纯变换算法。 |
| src/editor/entityBuilderAdapter.ts | 更新 | 作者实体变更时失效实际编辑World的Tile缓存。 |
| src/editor/rendererAdapter.ts | 更新 | SceneEnvironment可绑定Tile Owner；Lighting可复用同SceneEnvironment；默认API保留。 |
| src/components/WorldCanvas.vue | 更新 | 实际renderedWorld绑定Tile Scene/Lighting，保留physicsState.world、完整模板样式及Virtual改动。 |
| src/runtime/tileSetValues.ts | 新增 | 新增纯TileSet类型与原归一化函数，不含作者状态。 |
| src/runtime/tileMapOwner.ts | 新增 | 新增共享catalog有界资源Owner及固定World的时钟/chunk/dirty/碰撞/绘制查询；原算法保留。 |
| src/runtime/runtimeSceneInstantiator.ts | 新增 | 新增原场景实例算法的显式World/资源能力实现，作者事务仍在原层。 |
| src/runtime/tileSceneOwner.ts | 新增 | 新增固定World放置缓存与诊断，组合本World的Prefab、Scene和生命周期。 |
| src/editor/tileMapAdapter.ts | 新增 | 新增唯一Editor资源缓存、perWorld子Owner和lazy旧API安装；保留原Vue视图。 |
| scripts/lib/fixtures/tileMapOwner.contract.json | 新增 | 新增实际643→648的精确前后SHA/step offsets/79原函数；旧缓存27+4证据单独记录。 |
| scripts/lib/tileMapOwnerContract.mjs | 新增 | 新增17源/linked新5严格校验、12完整逆；仅两个已封存640完整before SHA支持旧链重复投影。 |
| scripts/verify-engine-tilemap-owner-contract.mjs | 新增 | 新增可移植15来源断言，保留原正文；不冒充绝对cache路径的18项业务证据。 |
| scripts/lib/replayOwnerContract.mjs | 更新 | 先严格投影Tile的实际与linked完整源，再运行原6源/10函数Replay断言；whole inverse回原helper。 |
| scripts/lib/virtualControlsInputOwnerContract.mjs | 更新 | 先严格投影实际Canvas与linked Tile源，再原Virtual三源/10函数断言；whole inverse回原helper。 |
| scripts/lib/presentationOwnerContract.mjs | 更新 | 未知旧Presentation路径也经最新严格Replay/Tile投影，原9源/11函数/6接线不改。 |
| scripts/audit-engine-source-boundaries.mjs | 更新 | 仅追加四个实际纯Tile入口；全部原禁止边、整体Core/compat/Player失败条件保留。 |
| scripts/audit-engine-boundaries.mjs | 更新 | 仅追加四个compiled纯Tile入口；原生产图遍历、禁止规则与整体门保持。 |
| docs/RUNTIME_STAGE.md | 追加 | 本表、真实资格和具体限制，原章节/历史失败全部保留。 |

已在同一648缓存验证原九入口230断言全部PASS、原入口/fixture逐字不改；Tile portable15 PASS。原79函数body及12整个原文件可逆，Replay6/Virtual3保留。真实ordinary WASM/Rhai与Core业务27/27、实际Canvas Scene/Lighting初始化4/4、fullVue/Node类型exit0；Tile资源仍共享同catalog有界128条/64MiB缓存，World拥有私人time/chunk/dirty/collider/placement。新增source gate四纯模块0违规；完整Core/compat/Player仍NOT_PASSED，不能称整体M1完成。

Root实际27记录 .cache/engine-overhaul/root-integration-next/tile-current-actual-1LMxa2/actual-kLVdYC/report.json；4初始化 .cache/engine-overhaul/root-integration-next/tile-current-canvas-rku5PT/canvas-cJCcPu/report.json；230契约 .cache/engine-overhaul/root-integration-next/tile-contract-retry-8H6KJH/report.json SHA a949ced2b38782d6d9260a0c103a39e8fe0a5c77abf565b244720cba06d15ee1。全部断言与147实际驱动assert/check文本保留。缓存准备器多处替换偏移失败、报告路径提前拒绝及重复投影旧Canvas SHA失败原raw保留；修正仅缓存工具/显式最新契约规范化，无放宽业务断言。旧18项cache evidence entry未作为fresh-clone正式业务test安装；旧27+4历史证据与新648实际证据分开。

原opaque CPU atlas解码警告保留，previous valid atlas仍活动；这不验证真实GPU图像。§30/64相关World clock/生命周期/资源版本/碰撞能力/作者Undo与取消/cleanup均已处理；Rust Arena/epoch权威迁移、Worker/ABI、真正独立Player与完整GPU画质/设备丢失仍未完成或未测。实际Canvas原world=physicsState.world兼容绑定保留，不冒充foreignCore已经完整替代编辑根。无字号/四向留白/圆角/Motion、DPI/画质、输入时序、物理/Replay格式或依赖改动。

本次为IMPLEMENTED且有限cache功能VERIFIED；正式全类型、10来源合同、冷profile、双边界及新GUI需后续记录。整体M0–M8/X0–X6、QualityLocked/Adaptive正式基准、硬件/Tauri、Linux/H2仍未通过/NOT_TESTED。


### 2026-10-10 Tile648正式验证与历史Replay公开GUI证据

批准25文件和既有文档追加已实施：17生产文件（12旧/5新增）、3新Tile合同、3既有投影合同适配、2边界门新增纯入口；具体每个编辑的before/after与影响保留在approved-plan和edit-receipt。pnpm check exit0；十组34/26/8/10/30/32/22/24/44/15共245安装源合同全exit0；profile编译13.28秒/exit0，仅编译耗时，保留大chunk警告。正式buildId engine-profile-05eda57b6b2623cb012c、sourceHash 05eda57b6b2623cb012c85dfaf4ea37129008036d308d7828d6c33525c74fd05，648源/272冻结产物、0overlay/0漂移、native/Rust/pkg专列6不变。快照 .cache/engine-overhaul/root-integration-next/merged-05eda57b6b26；产物 .cache/engine-overhaul/profile-dist-05eda57b6b26；未做新Rust/WASM/Tauri编译。

真实普通WASM/Rhai双Core与Tile/Nav/Tiled/Prefab/Undo/保存27项通过，实际Canvas初始化环境4项通过；这4项不冒充Canvas挂载或GPU。四新Tile纯入口与原Replay/Virtual/Presentation source+compiled禁止边均0。完整source仍NOT_PASSED：Runtime core=10 / Runtime compatibility composition=13 / Player=17；compiled仍NOT_PASSED：Runtime core=25 / Runtime compatibility composition=37 / Player=51 / Player emitted production chunks=46。具体禁止模块增删集合在receipt，新增Editor tileMapAdapter使完整compiled禁止集合增加，不能以纯Owner通过宣称完整Player隔离或性能提升。

历史7f2/643/271公开Replay真实GUI8项通过：Record自动Play、首32固定步、Stop保留Finish、Finish资产8→9、Undo8/Redo9同UUID、Play Replay恢复原初8资产、保存后freshChooser9、第二实际8步Finish10并再次freshChooser。原格式与公开事务保持；Play只抽样Playing/mismatch0后停止，不认证完整回放确定性。Root已查看两原始1600×900/DPR1/uiScale1 PNG，记录/Finish与两回放资产在实际界面可读可达；不缩放截图。该运行当时643/271守卫无漂移、浏览器/服务器已清理；两次新夹具失败及修正保留，未删除断言或停用动效。证据 .cache/engine-overhaul/replay-public-gui-handoff-qqulri/handoff.json SHA 119629011fc9c6b4cdff817ef61ff88e7c6854bdbf3fcb729242586389baedc7；该旧身份只证明旧产物路径，不能倒套当前648。

当前648真实GUI待执行。以上headless Edge/SwiftShader范围不认证硬件GPU、物理前台、全动效、Tauri、Linux/H2、QualityLocked或AdaptiveExperience正式基准。Comfortable与Motion源保留；整体M1及M0–M8/X0–X6仍未完成。


### 2026-10-10 Tile648新产物原五项GUI与舒适布局回归

统一05eda57b6b26实际产物执行原Editor3/Player2全部5项PASS。原两driver及其断言未改；原11实体/8资产/59组件项目、原PAK、1600×900/DPR1/uiScale1。公开项目打开、Play/Stop后作者内容保持、保存重开、Player非空包及键盘焦点有独立raw和5张PNG。648源码/272冻结产物/6专列native及主指令、AGENTS、项目和PAK前后守卫零漂移；两自有Node结束，原helper记录浏览器/服务器和profile清理。

Root查看实际Inspector截图，保留16px字号/24px行高、44高输入、上下9/左右16内边距、输入r12、379宽/r16 Inspector，以及20面板留白、12标签到控件、20字段间距；该范围未见裁剪或横向溢出。未改变项目、DPI或缩放伪造宽松效果。

组合记录 .cache/engine-overhaul/replay-world-review/formal-gui-tile-05ed-YAjklq/report.json SHA 0232faa81974fbea2f28b6e628255dc2c429e6cdd4e39a24af16ff2ecd4acf35；封存 .cache/engine-overhaul/root-integration-next/tile-original-gui-handoff-6mdTHC/handoff.json SHA 9577095df30420995c3ea856e0abafb309e44f46da9e82cfbe750663baf6f709。后端为headless Edge/SwiftShader WebGL2，以上仅VERIFIED狭窄启动/保存/布局与焦点；不验证公开Replay录制/Stop/Finish、Virtual控件、移动、全动效、真实GPU/Tauri/前台/Linux/H2或正式性能。历史不同产物证据与失败仍保留，不冒称当前构建已验证相同路径；完整Runtime/Player依赖门仍NOT_PASSED。


### 2026-10-10 Particle + GraphDebug固定World联合迁移：648→652逐文件编辑

计划 .cache/engine-overhaul/root-integration-next/joint-owner-install-preparation-ylbRbS/preparation.json SHA a4e783f503a37e4c3d24d2ffdda4e4b61a7276fe7906f67cf260f0e60b527fc5；全部27文件及进度文档前像保存于 .cache/engine-overhaul/root-integration-next/formal-joint-owner-bqPnVq。本批16生产文件（4新/12旧）和11契约/读取层/门文件，未变更依赖、Rust/WASM、协议、物理/输入时钟、UI几何/Motion或旧发行。每次正式编辑：

| 文件 | 操作 | 具体后果 |
|---|---|---|
| src/components/WorldCanvas.vue | 更新 | 真实Canvas绑定本World粒子；完整template/style、physicsState.world、Comfortable与Virtual保持。 |
| src/editor/aiAdapter.ts | 更新 | AI执行器注入捕获的GraphDebug，避免另一个Core覆盖trace目标。 |
| src/editor/gameplayWorldHost.ts | 更新 | Editor Host显式提供同World/ScriptServices的两个Owner，旧作者层保留。 |
| src/editor/graphDebugAdapter.ts | 新增 | 新增lazy Editor图调试兼容入口，同raw状态提供Vue视图。 |
| src/editor/particleAdapter.ts | 新增 | 新增唯一Editor lazy兼容入口和per-World粒子Owner，旧Vue诊断保留。 |
| src/editor/rendererAdapter.ts | 更新 | Scene/Lighting共同绑定实际Tile及Particle Owner，拒绝错误World。 |
| src/editor/worldGameplayAdapter.ts | 更新 | 组合本World粒子、图调试与现有Tile等Owner，不改作者事务。 |
| src/renderer/sceneRenderer.ts | 更新 | 粒子提交通过实际Environment；单独传完整source membership，避免裁剪列表被误判外国World。 |
| src/renderer/SceneRendererEnvironment.ts | 更新 | 新增显式Particle提交能力，原场景渲染仍使用共用自研前端。 |
| src/runtime/GameplayRuntimeCore.ts | 更新 | 原粒子调用、十处图调试调用和五处读值改本Core Owner，保持时序与实际Rhai生命周期。 |
| src/runtime/gameplayWorldHost.ts | 更新 | Runtime Host创建并绑定本World的Particle和GraphDebug，保留其它Owner。 |
| src/runtime/graphDebugOwner.ts | 新增 | 新增固定World及真实ScriptServices的图调试Owner；原15函数、19状态初值与格式保留。 |
| src/runtime/particleOwner.ts | 新增 | 新增固定World/资源/时钟的粒子Owner，保留14段原数学、事件与诊断；独立dispose。 |
| src/runtime/particles.ts | 更新 | 旧无参粒子API改显式兼容Owner，原算法/默认参数通过整源逆证明。 |
| src/runtime/worldGameplayOwner.ts | 更新 | 粒子更新与AI图trace改捕获的本World Owner，明确停止/重置生命周期。 |
| src/visual/graphDebugger.ts | 更新 | 旧图调试导出转发Editor兼容Owner，原捕获/trace/step语义保留。 |
| scripts/lib/particleOwnerContract.mjs | 新增 | 新增11源严格证明/原数学逆向；读取端先严格验证Graph的最新共享源。 |
| scripts/fixtures/particle-owner-transform-v1.json | 新增 | 新增封存的原函数/原段/精确前后SHA契约，不改旧fixture。 |
| scripts/verify-engine-particle-owner-contract.mjs | 新增 | 新增68项独立来源契约，原缓存业务23另列，不冒充GPU测试。 |
| scripts/lib/graphDebugOwnerContract.mjs | 新增 | 新增9源严格限定、15函数/19初值/7完整逆及实际能力验证。 |
| scripts/lib/fixtures/graph-debug-owner-transform-v1.json | 新增 | 新增实际650→652精确来源契约，保留旧资料。 |
| scripts/verify-engine-graph-debug-owner-contract.mjs | 新增 | 新增15项来源与真实Owner能力测试，隔离运行后清理。 |
| scripts/lib/graphParticleSourceProjection.mjs | 新增 | 新增严格Graph→Particle→Tile旧基线读取组合；74历史SHA有出处，未知/损坏linked拒绝。 |
| scripts/lib/tileMapOwnerContract.mjs | 更新 | 读取实际及linked源经最新组合投影，原17源/79算法/12完整逆保留。 |
| scripts/verify-engine-tilemap-owner-contract.mjs | 更新 | 仅读取边界先验证最新Graph9/Particle11，全部15检查正文保留，报告明确投影范围。 |
| scripts/audit-engine-source-boundaries.mjs | 更新 | 只追加Particle/Graph两纯入口；完整Core/compat/Player失败门不变。 |
| scripts/audit-engine-boundaries.mjs | 更新 | 只追加对应compiled纯入口；原整个生产闭包和禁用边不变。 |
| docs/RUNTIME_STAGE.md | 追加 | 本表、实际资格和后续限制；原章节与失败记录全部保留。 |

已验证缓存资格：Root真实ordinary WASM/Rhai粒子双Core23/23、Scene/Lighting/完整source与裁剪子集5/5、同652真实Tile业务27/27；Graph16/16真实生命周期。原245+新Particle68+Graph15共328来源断言通过。原九入口字节不改，Tile15完整check正文不改；读取适配独立12项证明、20组缺失/损坏关联负控、74历史SHA原字节及出处，全部原fixtures保持。联合652整源含binary可逆到648；完整Vue/Node类型exit0。Root当前source gate Core5/compat8/Player17仍NOT_PASSED，Particle/Graph两新纯入口0违规。

完整证据在 .cache/engine-overhaul/root-integration-next/joint-owner-install-preparation-ylbRbS/preparation.json evidence；Root23 raw .cache/engine-overhaul/root-integration-next/particle-graph-business-preparation-pkVGir/after-actual-pYdP9S/report.json SHA08204747298768d51d572032658fb15099108c87c51302a5aef0946431ca340a，5 raw joint-actual-IeKJXl/report.json SHAd2606d3ae11603687936638ac07c379775167b2a6da4c6d5feba4b4b2192b15d，Tile27 .cache/engine-overhaul/root-integration-next/particle-graph-tile-business-Aa8EWs/actual-uMLlnP/report.json SHA8912abf87577f84edff2982a34b9abea911885d987fea5eb0024e9a574a5ba25。联合契约handoff .cache/engine-overhaul/graph-debug-owner-preparation/joint-contract-SnC21a/handoff-59De7t/final-index.json SHA66a145c416f59dedda9a1d68ca5d979e6fd5e67f71d33f44c7da0b059cc8cc14。

首次Tile读取检查14失败、重复Graph投影负控失败及缓存准备报告路径不匹配均保留，未放宽业务断言。CPU opaque atlas解码警告保留，不作为GPU图像证明。原scriptDebug全局 evaluator和Graph distinct key maps潜在无界状态是明确后续缺口，本批未宣称修复。单一Editor根lazy兼容仍存在，不冒充整个Player隔离。

§30/64：Owner/生命周期/真实catalog/资源时钟/Stop已处理；Renderer正确membership、裁剪和原顺序已处理；Tile作者Undo/保存/碰撞/Scene保持；UI/Motion源码底线保持。ABI/Worker/Rust Arena authority/native在本切片未改且其必需迁移仍未完成。正式类型、12入口契约、冷profile、双边界和新GUI须随后分别记录；硬件/Tauri/Linux/H2、完整动效与QualityLocked/Adaptive正式基准仍NOT_TESTED，不宣称整体M1/M0–M8/X0–X6通过。


### 2026-10-10 联合652正式构建和边界结果（GUI待新cohort）

真实buildId engine-profile-ab9c2acf1ec677d83686，sourceHash ab9c2acf1ec677d83686cbde436586f1a801bd386210a93cd59d632a038e9671；source record .cache/engine-overhaul/root-integration-next/merged-ab9c2acf1ec6/source.json SHA66fbf0ef16114f17613865f47ccf0d89600f75024e39c11bb60bfa013a032111；冻结manifest .cache/engine-overhaul/profile-dist-ab9c2acf1ec6/engine-build-manifest.json SHAc1b357a2bc71d33e811d74b170ea54be825c2994b3aed0d9c34aa7846d81f689。652来源/272真实产物/零overlay、无漂移，16限定生产差异4新增，6原生范围及其余源均保持。Root观察pnpm check session45587 exit0、profile session8638 exit0，日志在 .cache/engine-overhaul/root-integration-next/formal-joint-owner-bqPnVq/check.log/build.log；Vite14.16s为编译耗时，不是运行性能；原chunk>500KiB警告保留。

12实际契约共328项全部通过，原11组313保持，Graph15实际child exit0且完整raw在 .cache/verification-engine-graph-debug-owner/run-F8AkRg/report.json。Root第一次运行器错误地用--report-dir=value调用仅接受分离参数的Graph入口，实际15已通过但记录器扫描目录失败exit1；完整formal-contracts-first-runner-refused.json保存，reconcile-joint-formal-contracts.mjs仅核对原真实child/log/raw并修正记录路径，未重跑313项或改测试。

完整source门exit1，Core5/compat8/Player17；compiled门exit1，Core5/compat39/Player53/emitted48。两新Owner和原Renderer纯模块均0违规。完整Player/compat编译图仍含Editor兼容层，计数增长公开保留，不称整个M1成功；Core25→5仅对应当前原生compiled入口依赖变化。全部raw在 .cache/engine-overhaul/root-integration-next/formal-joint-owner-bqPnVq/source-boundaries.json/production-boundaries.json。

当前正式IMPLEMENTED并有限功能VERIFIED；新652 Editor3+Player2实际原项目GUI仍PENDING，过去05ed/7f2截图不能认证本cohort。所有全局调度、ScriptDebug隔离余项、Rust权威、Worker、WebGPU图像/设备、独立Player、完整动效/实际硬件和QualityLocked/Adaptive基准，以及Linux/H2保持未完成/NOT_TESTED。


### 2026-10-10 联合652新产物原GUI五项验证

engine-profile-ab9c2acf1ec677d83686 实际原项目Editor3+Player2通过，combined raw .cache/engine-overhaul/replay-world-review/formal-gui-joint-ab9-BczXoy/report.json SHAde6365a8da8b651b9cd0429089f54d090357b547da4e7be27ec267c0f3ac0aa1；handoff .cache/engine-overhaul/root-integration-next/joint-original-gui-handoff-8RxCzg/handoff.json。来源652/产物272/原生6前后零漂移，原11entities/8assets/59components与PAK保持；原检查正文未改。Root已查看两张未缩放的Inspector/playing PNG，1600x900 DPR1 uiScale1：16px主文字/24px行框，44px输入，内部9×16px padding，输入r12/面板r16，面板inset20/label12/field20，Inspector379px，无根水平溢出。保存后原公共chooserfresh重开通过。

两个Node、独立Edge/server/profile均实际await清理，owned children0。仅有限headless SwiftShader功能/布局，原Player2断言只证焦点，不证D/Space位移；Play screenshot中位置变化不冒充性能或确定性。首次回执扁平字段缺失拒绝在正式启动浏览器前发生，其raw保留；integration-receipt-gui-compatible.json仅重复准确manifest SHA/绝对冻结路径，原冻结回执和业务驱动均保留。全部截图/raw/hash见handoff。

未验证完整静态面板矩阵、动效连续性与硬件时限、实际GPU/Tauri/前台/DPI变化、Linux/H2、QualityLocked/Adaptive；各范围维持NOT_TESTED。此验证不改变完整Core/Player门NOT_PASSED。


### 2026-10-10 X1调度两行修正及§39旧断言冲突

独立批次计划 .cache/engine-overhaul/root-integration-next/scheduler-fairness-install-preparation-9wxi4G/preparation.json SHA7b261948589d74aa2b854c1e1bd50de81405e184c3e1c850924428047b001e99，两文件及原进度文档完整备份 .cache/engine-overhaul/root-integration-next/formal-scheduler-fairness-nI6p4b。逐文件编辑：

| 文件 | 操作 | 后果 |
|---|---|---|
| src/runtime/performance/workScheduler.ts | 更新 | 两行：Critical最高ready先排水，Visible/Required共享原8次公平轮转；原租约/字节/依赖/取消不改。 |
| scripts/verify-engine-scheduler.mjs | 更新 | 原第9组仅更新与§39冲突的Critical优先断言；其它28完整check不改，新增Visible/Required两类有限32任务后台进度与终态额度检查。 |
| docs/RUNTIME_STAGE.md | 追加 | 公开规则冲突、旧失败/新验收和尚无性能结论；旧历史保持。 |

基于最新冻结652/ab9c已通过原GUI5，主指令§39明确Critical短小有界、先排水、不参与普通后台轮转。原代码在第7个Critical后让后台插队，原Required连续工作却可让32个全部先于Background执行。现两行排除最高ready Critical，并使Visible/Required共同累积既有8次轮转；Critical/Background/Idle重置普通burst。依赖提升的Critical同样优先；不可准入Critical仍允许循环寻找其它可执行任务。未改变队列容量/字节/并发/依赖/取消/epoch/时间/输入/渲染/UI参数。

有限真实cache before→after：Required32→7、Visible7→7、Critical7→32；新增Critical/依赖提升/blocked/owner额度/混合5项通过。原29完整脚本保留exit1：前8PASS、第9要求Required在continuous Critical<=8与§39直接冲突、后20 NOT_EXECUTED；独立保持每个callback/assert全文+AST的continuation为28PASS/该1FAIL。旧关联7为6PASS/混合1FAIL，8数据原检查全部PASS。上述失败与原字节封存在 .cache/x1-fairness-root/attempt3/handoff.json SHA483444b14a70a0b4c6a1835b7f525c84a1b3d07d6c1f74e6cc1f6d38880fd176，不删除或改成通过。

正式第9组按新唯一权威规格改为18个Critical全部按序先于Required；其它28整check保持，新增Visible与Required各有限32任务时Background<=8、task/bytes/leases终态0。因此下一正式预期31+数据8需实跑。不是放宽性能门槛或用无界Critical流声称可用；Critical必须短小有界仍是§39约束。公平轮转与Critical排水只验证策略正确性，不宣称多核wall-time收益。

最新工作源仍652条但scheduler已不同于ab9c，冻结ab9c产物保护为历史且没有新uniform build；后续网络分层独立批次将冷构建统一来源。§30/64队列策略/终态/优先级关联已处理，原协议/Worker/物理/音频/UI本切片不改；全局Audio/waveform/content/native租约与总成本仍待实现，wholeX1/完整M1及QualityLocked/Adaptive正式基准NOT_PASSED/NOT_TESTED。


### 2026-10-10 调度新增有限生产者测试等待修正

逐文件：scripts/verify-engine-scheduler.mjs 更新新增2组生产者的等待能力，显式最后第32个真实callback完成后再join全部handles；原所有assert、28无关check与第9新Critical规则保持。新测试首次抓取动态增长Promise数组快照过早，Root真实exit1为22!==32；没有算法失败结论，原失败记录 .cache/engine-overhaul/root-integration-next/formal-scheduler-fairness-nI6p4b/finite-producer-first-failure.json 保留。三个精确等待文本替换整源可逆，前像 .cache/engine-overhaul/root-integration-next/scheduler-producer-test-repair-Xuk6oh/before.mjs；生产workScheduler两行完全不变。docs/RUNTIME_STAGE.md只追加此等待原因/证据，后续31+8需实际重验，不将首次FAIL改为PASS。


### 2026-10-10 X1正式有限策略回归31+8

Root实际Node scheduler31 exit0、data8 exit0，原raw复制封存 .cache/engine-overhaul/root-integration-next/formal-scheduler-fairness-nI6p4b/scheduler-actual.json SHA7e64bd790cf089562366566c27e63dde9f13a97c2565d933fbf17ccbb4a10860；.cache/engine-overhaul/root-integration-next/formal-scheduler-fairness-nI6p4b/data-actual.json SHAfeeaf575e69a03fdfeca13501813f4f57fb9e3c5c8aa5b5db3c74f64dce29442；每份真实sourceHashes逐项匹配当前来源。31项包含原28完整check、按§39更新的Critical精确顺序及新Visible/Required后台公平性2组。任务/字节/租约终态0由实际原测试与新增组assert验证；该运行器没有新建真实Worker，data controlled Worker明确不是真实浏览器传输性能。原packagedynamic/static import警告保留。

当前源码652仅workScheduler原两行改变，native6/其它来源零漂移；新working snapshot .cache/engine-overhaul/root-integration-next/working-source-scheduler-AX340V/source.json SHA43fb7bd1f20b69cd709701e50a0004f572f3da232dddcc1f5b3a1b2753db9eff，buildId/sourceHash明确null。冻结ab9c652/272仍历史产物，不冒充此working源的新uniform构建。完整Vue/Node类型仅前述cache候选0，本片实际fresh production/data编译通过；后续统一构建将跑全类型。qualification .cache/engine-overhaul/root-integration-next/formal-scheduler-fairness-nI6p4b/qualification-receipt.json；第一finiteproducer22/32失败及旧§39冲突失败全部保留。

本片只证策略功能，不证多核净收益；全局音频/波形/Worker/native共同额度、总准备传输合并成本及X01–X15/H1H2/B正式性能仍未完成/NOT_TESTED。


### 2026-10-10 网络World隔离与真实平台端口正式集成：逐文件编辑

计划 .cache/engine-overhaul/root-integration-next/network-install-preparation-S80LS2/preparation.json SHA 1edc0adf62aa0f5b77aad3e41f9c56f3f0a5787588e0b3d498991ec7555a055e；全部 32 文件和进度文档前像已在正式编辑前保存于 .cache/engine-overhaul/root-integration-next/formal-network-owner-7HRxO8。本批 19 生产文件，source 652→661。每次编辑与实际后果：

| 文件 | 操作 | 具体后果 |
|---|---|---|
| src/runtime/productionNetworkOwner.ts | 新增 | 固定World与配置端口；网络启动、停止、RPC和迟到会话结果按实例隔离，保留原权限与故障上报。 |
| src/runtime/networkSessionOwner.ts | 新增 | 每个会话拥有网络状态、订阅和连接；原协议、顺序、权威校验与输入消费算法迁入独立实例。 |
| src/runtime/multiplayerReplayOwner.ts | 新增 | 多人回放、校验与保存状态按会话隔离，原文件格式、校验和和恢复算法保留。 |
| src/runtime/networkProductionValues.ts | 新增 | 抽出纯配置与生产网络数据算法，移除运行核心对编辑器配置模块的导入。 |
| src/runtime/networkSessionContracts.ts | 新增 | 共享网络配置、事件、连接及平台服务类型，不引入Vue、DOM连接对象或编辑器store。 |
| src/platform/webNetworkTransports.ts | 新增 | 原WebSocket与BroadcastChannel传输实现迁到Web平台层，原完整类体与连接语义保留。 |
| src/platform/nativeNetworkTransport.ts | 新增 | 原Native UDP传输迁到原生平台层，权限与行为保留；本片未验证Tauri UDP设备运行。 |
| src/platform/networkPlatformFactory.ts | 新增 | 显式注入时钟、计时器与实际传输服务；Runtime不直接读取浏览器或Tauri宿主。 |
| src/editor/productionNetworkAdapter.ts | 新增 | 保留旧Vue视图的同一raw对象；最先校验legacyRoot实际physicsState身份，外部世界获得独立会话。 |
| src/runtime/productionRuntime.ts | 更新 | 保留旧无参API为显式Editor桥；Core改用实例Owner，旧算法不重复保留第二份。 |
| src/runtime/networking.ts | 更新 | 旧UI网络API通过显式提供者访问Editor会话；普通Runtime不再共享此全局网络世界。 |
| src/runtime/networkReplay.ts | 更新 | 旧多人回放UI接口委托实际Editor Owner，保留原视图和序列化入口。 |
| src/runtime/networkProduction.ts | 更新 | 原网络数据算法从唯一纯模块导入并兼容再导出，不改变项目配置和数据格式。 |
| src/runtime/GameplayRuntimeCore.ts | 更新 | 用required Host factory创建固定World的生产网络Owner，替换共享实例调用；权限及会话顺序保留。 |
| src/runtime/gameplayWorldHost.ts | 更新 | 增加required网络配置与Owner组合契约，无Editor默认回退。 |
| src/editor/gameplayWorldHost.ts | 更新 | 旧Editor显式使用live配置和legacy根，其余宿主使用捕获配置及独立Owner。 |
| src/PlayerApp.vue | 更新 | 保持原Runtime构造语句，将其置于运行覆盖配置、权限和World准备完成后，防止捕获旧配置；模板和样式不变。 |
| src/runtime/networkProtocol.ts | 更新 | 仅改共享类型导入方向，原协议解析、限制、序号和校验函数完整保留。 |
| src/runtime/networkServices.ts | 更新 | 仅改共享网络类型导入方向，原服务配置、权限和诊断函数完整保留。 |
| scripts/lib/networkOwnerContract.mjs | 新增 | 新增Network独立严格逆变换、封闭历史来源或37项契约；缺失和未知源码拒绝，不替代真实运行证据。 |
| scripts/lib/networkSourceProjection.mjs | 新增 | 新增Network独立严格逆变换、封闭历史来源或37项契约；缺失和未知源码拒绝，不替代真实运行证据。 |
| scripts/fixtures/network-owner-transform-v1.json | 新增 | 新增Network独立严格逆变换、封闭历史来源或37项契约；缺失和未知源码拒绝，不替代真实运行证据。 |
| scripts/fixtures/network-source-projection-history-v1.json | 新增 | 新增Network独立严格逆变换、封闭历史来源或37项契约；缺失和未知源码拒绝，不替代真实运行证据。 |
| scripts/lib/graphParticleSourceProjection.mjs | 更新 | 旧断言和夹具不变；增加完整19文件SHA校验后的源码读取适配，保留实际编译与未知改动拒绝。 |
| scripts/lib/graphDebugOwnerContract.mjs | 更新 | 旧断言和夹具不变；增加完整19文件SHA校验后的源码读取适配，保留实际编译与未知改动拒绝。 |
| scripts/lib/particleOwnerContract.mjs | 更新 | 旧断言和夹具不变；增加完整19文件SHA校验后的源码读取适配，保留实际编译与未知改动拒绝。 |
| scripts/lib/runtimeFaultRecordsContract.mjs | 更新 | 旧断言和夹具不变；增加完整19文件SHA校验后的源码读取适配，保留实际编译与未知改动拒绝。 |
| scripts/verify-engine-graph-debug-owner-contract.mjs | 更新 | 旧断言和夹具不变；增加完整19文件SHA校验后的源码读取适配，保留实际编译与未知改动拒绝。 |
| scripts/verify-engine-runtime-fault-records-contract.mjs | 更新 | 旧断言和夹具不变；增加完整19文件SHA校验后的源码读取适配，保留实际编译与未知改动拒绝。 |
| scripts/verify-engine-network-owner-contract.mjs | 新增 | 新增Network独立严格逆变换、封闭历史来源或37项契约；缺失和未知源码拒绝，不替代真实运行证据。 |
| scripts/audit-engine-source-boundaries.mjs | 更新 | 保留原Core、compatibility与Player禁用依赖检查；追加8个实际网络入口。源码包含type-only检查，编译检查不冒算被擦除类型。 |
| scripts/audit-engine-boundaries.mjs | 更新 | 保留原Core、compatibility与Player禁用依赖检查；追加7个实际网络入口。源码包含type-only检查，编译检查不冒算被擦除类型。 |
| docs/RUNTIME_STAGE.md | 追加 | 逐文件账目、真实证据、关联项与未完成范围，原内容保留。 |

缓存资格：旧12契约328项、Network37项、组合读取89项和旧根归属实际4项通过；完整Vue/Node类型0错误。原离线3项与实际本机BroadcastChannel7项来自同18生产字节的修复前候选，最终只新增首行旧根身份守卫；不假称重新运行。完整181原声明含3传输类、62默认值、10旧文件逆变换保留；原失败raw保留。最终交接 .cache/engine-overhaul/network-owner-preparation/rebase652-4D7asy/final-handoff-8LmP6S/handoff-with-entry-proof.json SHA 057a0928565859b61e9d251504770196d3e932ac97a4d5fc61a376f9378bd02c。正式安装后仍需本Root实际契约、冷构建、编译图与同条件GUI验证。

主指令§30/§64：处理固定World/会话归属、配置来源、类型与依赖、原网络协议/权限/输入顺序、回放保存格式、迟到结果取消、旧Vue根桥。Worker/frame ABI、物理/Rust权威、渲染数学、舒适布局及动效未改。完整Player/发行权限和硬件网络验收仍是后续必需工作。

本片不是整体M1或整轮验收。已确认Core源码图0编辑器违规；compatibility、Player及Save兼容依赖仍未通过，不能称独立Player完成。NativeUDP、远程WebSocket/Tauri、真实GPU/硬件性能、Linux/H2未测。QualityLocked/AdaptiveExperience没有新增性能结果，编译耗时不当FPS。当前working652无统一buildId，旧ab9c只为历史产物；此片冷构建后再建立661源码和全产物对应关系。未新增依赖、未修改主指令、旧发布产物及用户项目。


### 2026-10-10 网络19正式切片验收证据与剩余边界

本次仅追加本节；前像 .cache/engine-overhaul/root-integration-next/network-formal-handoff-Vplhk3。handoff .cache/engine-overhaul/root-integration-next/network-formal-handoff-Vplhk3/handoff.json SHA 13c38f2348946eaf062054bfca2821387c966cc55d67794876a27ef6c6193484。

正式source661、完整产物270、零overlay；buildId engine-profile-19a57fb5c0d0ed86eb11，sourceHash 19a57fb5c0d0ed86eb1123c341a878c494ca41946e0a97131f2c53bd5c247423。实际原12契约328＋Network37＝365全部通过，pnpm check与cold profiling build均exit0。原Root报告目录反斜杠保护拒绝保留在首log和prior-result，修正仅执行器路径，没有修改业务断言。源码661、全270产物及native6全部逐hash零漂移。

必需M1门禁仍exit1：源码Core0/compat3/Player17/Save2；编译图Core0/compat40/Player54/Save6，Player emitted chunks49，dynamic-objects compatibility未emit不算通过。相较ab9c编译compat39/Player53/emitted48有所增加，明确保留失败。仅Core隔离改善不等于Player独立。

原非空项目11entities8assets59components，1600×900、DPR1、uiScale1；新构建实际GUI Editor3＋Player2通过，包含public Play/Stop与保存fresh chooser重开。Root亲看原Comfortable Inspector和Playing PNG：16px/24px文字、44px输入、上下9px左右16px内边距、12px输入圆角/16px面板圆角、379px Inspector、20px面板inset、12px标签gap/20px字段gap未回退，本条件横向overflow0。旧功能保留；不是所有面板/窄窗口/DPI或动效过程验收。Player原检查只证明焦点，不冒称移动/跳跃已验。

GUI使用实际headless Edge/SwiftShader WebGL2；两子进程exit0且browser/server/profile清理已由原驱动完成。真实硬件/Tauri/H1/H2/Linux、正式B/X采样和QualityLocked/AdaptiveExperience均没有新增性能结果。ScriptDebug/HotReload与流送状态的后续Owner隔离仍待正式实现；独立RuntimeHost、Player、Worker和Rust权威仍未完成。上述范围状态不得用本片365契约或构建成功替代。


### 2026-10-10 资源转换全局准入与解码前边界正式集成：逐文件编辑

计划 .cache/engine-overhaul/root-integration-next/content-install-preparation-ljmKAL/preparation.json SHA 87486edb2c7e334d13134f4bf558a12f5db5f8dbf2274b5acb0def49530307d0；全部 6 文件和进度文档前像已在正式编辑前保存于 .cache/engine-overhaul/root-integration-next/formal-content-admission-5lj41R。本批 2 生产文件，source 661→661。每次编辑与实际后果：

| 文件 | 操作 | 具体后果 |
|---|---|---|
| src/assets/contentInteroperability.ts | 更新 | 异步转换接入已有全局asset准入；Worker与复制在租约后创建，取消、超时、失败及迟到结果唯一终态清理；原九个同步算法和Worker消息算法保持。 |
| src/assets/AssetDatabase.ts | 更新 | 仅原导入与重导入两个调用接入取消、版本及来源检查；解码前执行16MiB原字节边界，计入解码准备成本，原提交和失败保留语义不变。 |
| scripts/lib/contentAdmissionSourceProjection.mjs | 新增 | 严格Content2源码资格与真实Worker验证，实际运行保持新生产字节；缺失、未知和半迁移拒绝。 |
| scripts/fixtures/content-admission-transform-v1.json | 新增 | 严格Content2源码资格与真实Worker验证，实际运行保持新生产字节；缺失、未知和半迁移拒绝。 |
| scripts/verify-engine-content-admission.mjs | 新增 | 严格Content2源码资格与真实Worker验证，实际运行保持新生产字节；缺失、未知和半迁移拒绝。 |
| scripts/lib/m1OwnerIntegrationContract.mjs | 更新 | 唯一M1读取入口先做严格Content2 selected及linked整文件逆变换，再沿原Owner链；原断言、原算法与旧阶段封闭SHA不变。 |
| docs/RUNTIME_STAGE.md | 追加 | 逐文件账目、真实证据、关联项与未完成范围，原内容保留。 |

当前661+Content2实际缓存：22项真实生产转换/Node Worker/原导入重导入测试通过，12个Worker全部实际退出，任务/输入字节/scratch/output租约及计时器归零；旧13组365项契约通过，全部原callback与分母未改。完整候选Vue/TS检查实际exit0。M1读取入口只增加完整Content2机械逆变换，原关联逆变换顺序保留；源码和未知/缺失/半迁移负对照严格。正式安装后将由Root重新运行原365、实际22、类型与冷构建。实际raw .cache/engine-overhaul/root-integration-next/content-root-preparation-7KJvQd/root-actual/report.json SHA 1f893f293b72fd584d66e2b0fbeb12d3149918b6ea67671546ad6cbf0cc55685；缓存365 .cache/engine-overhaul/root-integration-next/content-read-boundary-MvwpH0/root-contracts-sc2f4c/report.json SHA 305b2b00979beb75f21cd0e5706e1f350edca726edd80c7a02d7c459e0302187。

主指令§30/§64：处理两个实际AssetDatabase调用、原UUID/path/slice/保存与失败保留语义、取消/版本/epoch、共享队列任务+字节+租约、真实Worker终态回收、串行后备、准备/解码/复制前准入。原9同步转换算法、Worker handler、限值及接口前三参数保留；新第四参数可选。没有修改World/物理、渲染、ABI、输入、UI token或动效，没有新增Coordinator/池/依赖。

此片只有资源转换准入，Audio/Graph/native等其它重任务仍需单独集成；不宣称X1/X2整体完成或并行净性能收益。真实NodeWorker退出不证明浏览器物理退出；Worker执行/transport/merge未知分段为null；保守字节预留不等同真实heap上限。原同步公开转换仍为兼容入口。现有Catalog3旧整文件契约在当前正式前态及候选均2PASS1FAIL，未适配更早M1资产迁移；失败raw保留、没有放宽断言或纳入通过数。本片没有GUI/硬件/Native/Linux/H2正式验收，QualityLocked和AdaptiveExperience没有新增性能结果。旧19a5冻结产物仍是历史完整网络片；本片需新冷构建后建立新的661 uniform对应，不以旧buildId冒充新代码。未改主指令、锁文件、旧release或用户项目。


### 2026-10-10 资源准入正式片：独立运行与新统一产物证据

正式修改 receipt .cache/engine-overhaul/root-integration-next/formal-content-admission-5lj41R/edit-receipt.json SHA d3264209b5c9d9b7d28713269369ced784541bc4fc3123dd189c079d86b05650：2生产+4契约文件，逐项前像与后果见前节。Root正式重跑旧365项全部通过；实际Content22通过，另13项读取/完整inverse/缺失、未知、半迁移和selected不一致负对照通过。实际12个Node Worker全部退出，0活动线程、0计时器、0队列/任务/输入字节/scratch/output租约。两实际导入/重导入路径保留失败前有效资源；未将Node物理退出等同浏览器退出。raw .cache/engine-overhaul/root-integration-next/formal-content-admission-5lj41R/actual-content-final-Y6Dziq/report.json SHA c635a11ec9bf858d217cc7ac26db62dcc23ce336fe8173884cd91dc2cb8ab123，qualification .cache/engine-overhaul/root-integration-next/formal-content-admission-5lj41R/actual-content-final-Y6Dziq/root-qualification.json SHA 41f6f11de0cf94819af5191d85f9d41e35011c785b4ce887de83cb7a9e8f58c3。

完整pnpm check与pnpm build:engine:profile实际exit0；编译日志与wall时间在 .cache/engine-overhaul/root-integration-next/formal-content-admission-5lj41R/build-qualification.json，仅编译时间，不是运行帧率或并行收益。无新增Rust/WASM/native构建。新统一 buildId engine-profile-49a41b35e183d6b3f47e，sourceHash 49a41b35e183d6b3f47ecaf36f325b508dbbc01499cb64de3f7866d878037fd3，661源/270实际产物/0overlay；source .cache/engine-overhaul/root-integration-next/merged-49a41b35e183/source.json SHA 98fd701fb64388257a0dfa810af325e67d851e758534a29fd6f71ebc720c2dff，manifest SHA cbd2130c003e1b3a4e31a2a79a02bf7afa4029c47827ca649225f5ab208f69af，新冻结目录 .cache/engine-overhaul/profile-dist-49a41b35e183。Root全部正式源、冻结源、native6与270产物逐字校验0漂移。旧19a5、ab9c和release产物保持。

两个实际依赖gate均exit1：源码Core0/compat3/Player17/Save2；编译Core0/compat40/Player54/Save6/Player生产chunk49违规。未emitted动态对象口不是通过。数量未较19a5改变；完整M1/独立Player仍NOT_PASSED。现有旧Catalog3在正式前态和第一候选均2PASS1FAIL（既有M1资产整文件迁移未纳入该旧helper），raw保留；未改原fixture或容差。

本片只实现并验证资源转换共享准入，不是X1/X2所有重任务完成。准备/解码计入已有wall字段；执行/transport/merge无法独立测量者为null，不宣称净并行收益。QualityLocked/AdaptiveExperience均NO_NEW_PERFORMANCE_MEASUREMENTS。Comfortable字号、布局token与动效字节未改，本片没有新GUI/录屏证据，前一19a5的GUI5仍仅属于前一冻结片；真实GPU/Tauri/Windows正式设备基准/Linux/H2、完整UI动态与最后发行仍未验收。


### 2026-10-10 Scene13共享数据与固定World流式Owner正式接入：逐文件编辑

计划 .cache/engine-overhaul/root-integration-next/scene-formal-plan-vwA76x/approved-plan.json SHA f0d601a98e955b4dd24b38e05be0135dae054a77436ced1e23bb7df4606ad46a；全部 18 文件和进度文档前像已在正式编辑前保存于 .cache/engine-overhaul/root-integration-next/formal-scene-owner-SiRxru。本批 13 生产文件，source 661→667。每次编辑与实际后果：

| 文件 | 操作 | 具体后果 |
|---|---|---|
| src/editor/sceneAuthoring.ts | 更新 | 改为重导出共享场景设置；其余作者操作、字段语义与Undo路径保持。 |
| src/world/SceneManager.ts | 更新 | 仅场景设置导入下沉到纯World模块；原目录管理算法保持。 |
| src/world/sceneSettings.ts | 新增 | 新增唯一纯场景设置算法；原七个声明和默认值逐字搬迁，供Editor与Runtime共享。 |
| src/runtime/worldStreamingOwner.ts | 新增 | 流式状态、交接、取消及容器按实际World与生命周期隔离；销毁和重入时阻止过期写入。 |
| src/runtime/worldStreaming.ts | 更新 | 旧API委托唯一显式Editor端口；原公开功能保留，运行Owner不依赖Vue。 |
| src/editor/worldStreamingAdapter.ts | 新增 | 新增原Vue诊断视图与固定World Owner的唯一桥；时钟及政策取自现有端口。 |
| src/runtime/worldGameplayOwner.ts | 更新 | 真实流式操作使用同一子Owner；旧Owner关闭后队列不能覆写继任实例。 |
| src/runtime/runtimeSceneStreaming.ts | 更新 | 固定交接读写Owner及World；五个变更入口在Owner关闭后于副作用前拒绝。 |
| src/editor/worldGameplayAdapter.ts | 更新 | 将原流式更新、重置、原点及场景交接接入同一捕获Owner；保留现有Editor目录。 |
| src/world/entitySerialization.ts | 新增 | 新增共享实体序列化；原四个完整声明逐字搬迁，读与规范化语义保持。 |
| src/runtime/runtimeSceneData.ts | 新增 | 新增共享实体、连接和物理设置读取工厂；原六个完整算法保持。 |
| src/runtime/runtimeSceneOwner.ts | 新增 | 新增固定World的两阶段场景事务组合及缓存数据入口失效防护；实际RuntimeHost采用仍待下一片。 |
| src/store/physics.ts | 更新 | 仅十个原序列化/数据读取函数委托共享实现；作者加载、保存、选择与Undo原流程保持。 |
| scripts/lib/sceneOwnerSourceProjection.mjs | 新增 | 独立严格Scene13整源资格；旧七个完整源可逆、新六个完整实现与关联源校验，缺失、篡改、半迁移和资格后变化拒绝。 |
| scripts/verify-engine-scene-owner-contract.mjs | 新增 | 独立严格Scene13整源资格；旧七个完整源可逆、新六个完整实现与关联源校验，缺失、篡改、半迁移和资格后变化拒绝。 |
| scripts/fixtures/scene-owner-composition-v1.json | 新增 | 独立严格Scene13整源资格；旧七个完整源可逆、新六个完整实现与关联源校验，缺失、篡改、半迁移和资格后变化拒绝。 |
| scripts/lib/m1OwnerIntegrationContract.mjs | 更新 | 仅最新Scene13资格逆变换接入原读取链；旧完整断言、历史资格与实际新源码编译保持。 |
| scripts/lib/networkSourceProjection.mjs | 更新 | 仅最新Scene13资格逆变换接入原读取链；旧完整断言、历史资格与实际新源码编译保持。 |
| docs/RUNTIME_STAGE.md | 追加 | 逐文件账目、真实证据、关联项与未完成范围，原内容保留。 |

缓存当前Content661+Scene13实际667源：13原契约365/365通过，原分母与断言保持。流式原业务及普通WASM before/after、缓存Owner过期写入负控、R0原业务26项、原Undo3项闭包一致证明、Scene13严格资格before18/after18+memo9原始证据见交接。旧M1首次未适配资格失败原样保留；只在严格最新Scene后像成立时为历史原契约恢复旧七源，缺失、篡改、半迁移由独立Scene完整十三源检查拒绝。

主指令§30/64：处理状态所有权（固定World与lifecycle、旧回调拒绝）、Scene接口/数据语义（完整声明逐字共享、十委托其余74作者算法全文保持）、流式交接/取消/清理（实际双World负控及普通WASM释放）、依赖边界（三个纯运行入口已源与emitted审计；整体Player依赖仍失败）。不适用协议布局、图形后端、线程拓扑、画质与UI尺寸：本批未改。正式源码类型/冷构建/全原契约及依赖门禁将在安装后执行，不提前记为通过。

本批IMPLEMENTED：Editor实际数据十委托与流式Owner已接入；新RuntimeSceneOwner class尚无主RuntimeHost生产采用，不能标为独立Runtime完成。SceneManager catalog/scene.loaded仍共享，独立Player仍携带Editor依赖，资源Ready/真实GPU基准/全动效/LINUX与H2尚未验收；整轮M1–M8/X0–X6仍NOT_PASSED。保持当前舒适16/44、间距、圆角与UI动效；UI及自研Renderer/Rust/WASM/依赖锁无改动。旧发行产物不覆盖。


### 2026-10-10 Scene667正式资格与真实RTX GUI证据

交接 .cache/engine-overhaul/root-integration-next/scene-formal-handoff-2lG6JY/handoff.json SHA dd271266b6d11f9ffef2dd0e47361acf34fd409743ffa1c7e7250ab53cb82826。当前 engine-profile-cb4e9e21a2b8760bfafd / source cb4e9e21a2b8760bfafd15fd6acbb500478a5c7d3800835228a755851b25630a；13生产、5契约逐文件账目见本节前一次正式安装记录。365原断言＋严格Scene18通过，完整类型及真实冷构建exit0，667源/6原生范围/270列出产物+manifest来源0漂移，0overlay。原11实体8资产59组件、1600×900、DPR1、uiScale1：Editor3和Player2实际GUI通过，两应用画布确为ANGLE NVIDIA RTX5060 D3D11 WebGL2；executionMode single-thread-compat，ordinary baseline。三截图已观察，Inspector文字16/行高24、输入44/padding9×16/圆角12、面板379宽/圆角16、间距token12/20与无横向溢出保持。迁移/保存临时toast堆叠会覆盖Inspector，属于仍需检查的UI反馈路径，不标全视觉完成。

主指令§30/64关联项：本批实际固定World流式状态、交接取消、失效防护及作者保存/Undo算法保护有对应证据；Renderer、协议ABI、线程、UI尺寸和原生权限未改。Core源/编译0违规仍不能代替Player隔离。两正式边界门禁实际exit1：source compat3/Player17/Save2，compiled compat41/Player55/Save6/Player emitted50，原始失败保留；新纯模块及生产Host接入是后续工作，未修改门禁目标。新RuntimeSceneOwner尚未被main RuntimeHost采用，SceneManager目录仍共享。

此记录区分IMPLEMENTED与VERIFIED：仅本场景切片功能/静态布局和有限硬件GUI已验证，B0–B8/X01–X15/QualityLocked/AdaptiveExperience、全部动效、Tauri、长期泄漏、Linux/H2尚未完成。GUI快捷输入只证焦点，未证角色水平/跳跃。实际GPU时间/功耗/显示延迟/physicalDPI保持null或NOT_TESTED。整体M1–M8/X0–X6仍NOT_PASSED，不发布为整轮完成。


### 2026-10-10 Script/Debug/Hot12与同World安全准入正式集成：逐文件编辑

计划 .cache/engine-overhaul/root-integration-next/script-formal-plan-XrJJ6U/approved-plan.json SHA 8e6063876d23a04f5d22190abed8dc90dfeb2de84b7213d66dcf776dac27d677；全部 27 文件和进度文档前像已在正式编辑前保存于 .cache/engine-overhaul/root-integration-next/formal-script-owner-IY23ac。本批 13 生产文件，source 667→671。每次编辑与实际后果：

| 文件 | 操作 | 具体后果 |
|---|---|---|
| src/runtime/scriptHotReloadOwner.ts | 新增 | 新增固定World及项目资源端口的热重载Owner；原计划、队列、历史与回滚算法保持。 |
| src/runtime/scriptHotReload.ts | 更新 | 旧热重载API委托显式Editor桥；公开参数与返回语义保持。 |
| src/editor/scriptHotReloadAdapter.ts | 新增 | 新增原Vue诊断视图桥；只有真实Editor状态可认领兼容根。 |
| src/runtime/gameplayWorldHost.ts | 更新 | 宿主提供显式热重载与调试Owner工厂端口，运行核心不反向取Editor。 |
| src/editor/gameplayWorldHost.ts | 更新 | 真实Editor宿主采用同World Owner并传入实际状态身份；外来World不能认领全局调试视图。 |
| src/runtime/GameplayRuntime.ts | 更新 | 兼容实例显式选择Editor根；普通实例使用独立Owner。 |
| src/runtime/GameplayRuntimeCore.ts | 更新 | 真实脚本执行与热重载调试使用捕获宿主Owner；保留原Core/Rhai算法和普通WASM语义。 |
| src/runtime/scriptDebugOwner.ts | 新增 | 新增固定World调试状态和运行错误历史；原二十字段、二十一函数逻辑保持。 |
| src/editor/scriptDebugAdapter.ts | 新增 | 新增唯一Vue调试视图桥；首次认领在任何副作用前验证实际Editor状态，关闭时释放。 |
| src/runtime/scriptDebug.ts | 更新 | 公开调试API委托同一Owner，保留原函数签名与默认Editor操作。 |
| src/runtime/graphDebugOwner.ts | 更新 | Graph调试仅复用共享评估算法，去除旧调试全局模块依赖。 |
| src/components/ScriptStudio.vue | 更新 | 回滚按钮计算增加Vue属性存在性追踪，同时保留own-property约束；修复真实回滚后显示过期。 |
| src/editor/worldGameplayAdapter.ts | 更新 | 在同一World绑定不同Graph/Core时，释放旧Owner前明确拒绝；只有World真正换代才允许原清理重建。 |
| scripts/lib/networkOwnerContract.mjs | 更新 | 仅完整资格读取与raw/qualified终态元数据适配；原断言、原算法和分母保持。 |
| scripts/lib/networkSourceProjection.mjs | 更新 | 仅完整资格读取与raw/qualified终态元数据适配；原断言、原算法和分母保持。 |
| scripts/verify-engine-network-owner-contract.mjs | 更新 | 仅完整资格读取与raw/qualified终态元数据适配；原断言、原算法和分母保持。 |
| scripts/verify-engine-graph-debug-owner-contract.mjs | 更新 | 仅完整资格读取与raw/qualified终态元数据适配；原断言、原算法和分母保持。 |
| scripts/verify-engine-runtime-fault-records-contract.mjs | 更新 | 仅完整资格读取与raw/qualified终态元数据适配；原断言、原算法和分母保持。 |
| scripts/lib/scriptDebugHotReloadSourceProjection.mjs | 新增 | 新增独立严格Script12资格或机械热重载/调试算法证明；保留全部当前实现、缺失/篡改/混迁移/暖后变化负控。 |
| scripts/fixtures/script-debug-hot-reload-projection-history-v1.json | 新增 | 新增独立严格Script12资格或机械热重载/调试算法证明；保留全部当前实现、缺失/篡改/混迁移/暖后变化负控。 |
| scripts/verify-engine-script-debug-hot-reload-read-boundary.mjs | 新增 | 新增独立严格Script12资格或机械热重载/调试算法证明；保留全部当前实现、缺失/篡改/混迁移/暖后变化负控。 |
| scripts/lib/scriptHotReloadOwnerContract.mjs | 新增 | 新增独立严格Script12资格或机械热重载/调试算法证明；保留全部当前实现、缺失/篡改/混迁移/暖后变化负控。 |
| scripts/fixtures/script-hot-reload-owner-transform-v1.json | 新增 | 新增独立严格Script12资格或机械热重载/调试算法证明；保留全部当前实现、缺失/篡改/混迁移/暖后变化负控。 |
| scripts/verify-engine-script-hot-reload-owner-contract.mjs | 新增 | 新增独立严格Script12资格或机械热重载/调试算法证明；保留全部当前实现、缺失/篡改/混迁移/暖后变化负控。 |
| scripts/lib/scriptDebugOwnerContract.mjs | 新增 | 新增独立严格Script12资格或机械热重载/调试算法证明；保留全部当前实现、缺失/篡改/混迁移/暖后变化负控。 |
| scripts/lib/fixtures/script-debug-owner-transform-v1.json | 新增 | 新增独立严格Script12资格或机械热重载/调试算法证明；保留全部当前实现、缺失/篡改/混迁移/暖后变化负控。 |
| scripts/fixtures/scene-owner-composition-v1.json | 更新 | 场景同World认领修复的精确完整源码逆证明；保留原13路径、7+6、18条件和原始before，不放宽允许未知源码。 |
| docs/RUNTIME_STAGE.md | 追加 | 逐文件账目、真实证据、关联项与未完成范围，原内容保留。 |

当前正式Scene667＋Script12＋WorldGameplayAdapter准入：缓存原13契约365/365、Hot40/读边界101/Scene18通过，实际普通WASM/Core/Graph/Rhai32通过；真实Vue/旧API19正例回调保留但normal fixture改为独立真实World，另加same-World重复Core拒绝且原active实例可Stop，合计20通过。原same-World构造19测试在Scene联合下实际18正例后Stop抛STREAM_OWNER_DISPOSED，失败原样保留，不宣称原同World双Core模式通过。完整671类型check exit0，正式冷构建与运行证据安装后再执行。原读边界旧helper指纹首次失败及相关完整逆证明保留。

主指令§30/64：处理脚本/Graph/Hot Owner固定World与catalog、控制/事务ACK及清理；真实双World同UUID不同脚本与pause/stop隔离；旧Vue facade代理/响应式回滚可见性；同World不同Graph在dispose前拒绝，仅真实World换代沿用原清理重建。13关联生产源和14资格契约都有当前整源守卫与完整原始before证明，原365/40/101/18断言及分母不降。协议ABI、Rust物理/Renderer/Worker拓扑/Comfortable视觉尺寸未改，标不适用；整体Player依赖边界、媒体Ready与新RuntimeHost实际采用明确后续阻塞，未降低验收。

本批只完成脚本/热重载/诊断所有权及原界面回滚可见性；原Editor兼容入口仍共享世界与平台媒体，sameWorld第二Core明确拒绝。独立Player、RuntimeWorldHost/MediaOwner接线、生产Worker/ABI、GPU一致性、B0–B8/X01–15正式性能、QualityLocked/AdaptiveExperience、Tauri发行、Linux/H2仍未通过或NOT_TESTED。保留16/44舒适底线、现有核心动效、自研renderer、普通WASM与WebGL2；不覆盖旧发行。当前source667与新增4源码来源受保护，不以缓存671冒充新uniform产物。


### 2026-10-10 独立Player World/Host与资源只读及通知舒适布局精确集成：逐文件编辑

计划 .cache/engine-overhaul/root-integration-next/adoption-plan-QusDRE/plan.json SHA 4cd64cddaf6d84a13986993028ec4c2e9ffaf16b0b07c183bbfec4d724b9027d；全部 19 文件和进度文档前像已在正式编辑前保存于 .cache/engine-overhaul/root-integration-next/formal-runtime-world-adoption-E2MXy3。本批 16 生产文件，source 671→678。每次编辑与实际后果：

| 文件 | 操作 | 具体后果 |
|---|---|---|
| src/projects/projectData.ts | 更新 | 共享规范值下沉到纯项目模块，原作者项目、默认值和保存字段保持。 |
| src/runtime/prefabs.ts | 更新 | 只读Prefab解析委托显式Runtime资源端口；其余实例化、作者操作与Undo算法保持。 |
| src/projects/projectCanonicalValues.ts | 新增 | 新增唯一纯项目规范算法，原五函数八常量逐字搬迁。 |
| src/runtime/runtimePrefabReader.ts | 新增 | 新增固定Catalog的原Prefab v1/v2只读解析端口；不使用全局Editor资源默认值。 |
| src/runtime/resources.ts | 更新 | 原公开作者资源入口保持，十九纯值算法委托共享模块。 |
| src/runtime/resourceValues.ts | 新增 | 新增原资源验证、依赖、变体与规范值唯一纯实现，显式资产端口。 |
| src/runtime/editorFeedback.ts | 更新 | 默认只呈现最新通知，当前最多五条/历史一百条；同kind完整短消息且无action才聚合，error不被success挤出，计时器在终态释放。 |
| src/components/EditorFeedback.vue | 更新 | 默认单条通知与44px历史入口，可展开当前通知和有限历史；复用原动效，局部Escape及epoch焦点恢复。 |
| src/i18n.ts | 更新 | 新增英/中/德通知历史、重复与有限历史计数文案，原语言条目和覆盖顺序保持。 |
| src/runtime/runtimeWorldHostContracts.ts | 新增 | 新增固定World/Catalog的真实Runtime Host或平台接线；Core所有服务同一World，场景与退出生命周期显式。 |
| src/runtime/runtimeWorldHost.ts | 新增 | 新增固定World/Catalog的真实Runtime Host或平台接线；Core所有服务同一World，场景与退出生命周期显式。 |
| src/runtime/runtimeWorldBootstrap.ts | 新增 | 新增固定World/Catalog的真实Runtime Host或平台接线；Core所有服务同一World，场景与退出生命周期显式。 |
| src/editor/runtimeWorldHostPlatformAdapter.ts | 新增 | 新增固定World/Catalog的真实Runtime Host或平台接线；Core所有服务同一World，场景与退出生命周期显式。 |
| src/components/WorldCanvas.vue | 更新 | 运行画布显式绑定同一Host view/surface/World及活状态、独立恢复、无Editor Undo改键；原帧/渲染/工具算法与舒适尺寸保持。 |
| src/world/World.ts | 更新 | 新增World最终disposeRuntimeWorld，原生wrapper恰好free一次并清借用缓存；在异步WASM完成前退出禁止迟到分配。 |
| src/PlayerApp.vue | 更新 | Player采用独立World/Host/Core，同lease绑定画布；原loadProject/PAK/network/headless保留；项目metadata.id与内容hash分开，退出先停Core/解绑Canvas再dispose Host/World。 |
| scripts/fixtures/runtime-world-adoption-source-v1.json | 新增 | 新增当前七关联源精确hash/完整原文件逆资格；只为Player/Canvas恢复既有契约输入，实际编译始终使用新源码。 |
| scripts/lib/runtimeWorldAdoptionSourceProjection.mjs | 新增 | 新增有界整源数学逆与每次完整七源准入，无缓存provider资格、不忽略缺失/变异链接、不改变原365业务断言。 |
| scripts/lib/scriptDebugHotReloadSourceProjection.mjs | 更新 | 仅增加当前Player/Canvas完整七源逆准入；原Network/Graph/Particle验证函数、19源检查与历史边界保持。 |
| docs/RUNTIME_STAGE.md | 追加 | 逐文件账目、真实证据、关联项与未完成范围，原内容保留。 |

已验证：本批完全相同16个生产文件的真实pnpm check exit0；当前七源准入20项＋六个封存历史整源的正反例12项＋原Hot40/Read101/Scene18全部通过。R1/R2 paired输出14/18项前后相同、普通WASM和纯依赖检查；Toast受控Vue16项与3个summary边界；Host4在真实ordinaryWASM/Rhai双同UUID世界8项通过；World最终释放6项通过；Player稳定项目identity保存4项通过。原365在R1/R2/Toast九文件候选完整通过，Canvas变化后分步已得230项及98项和最终Network37；前两份报告整体FAILED，不能把分步不同candidate结果标作本批完整365。正式安装后必须重新完整365、类型、冷构建及新GUI。此前所有失败原始记录保留。

主指令30/64关联：世界权威/实体/场景/脚本/音频/网络/Replay/Save使用Host的固定World与Catalog；旧Editor兼容路径保留，实际Player独立World替代重复Core同世界路径。退出顺序Core.stop→Canvas nextTick卸载→Host子Owner失效→World native.free；native wrapper每个恰好一次，两个owned copy数组448B仍可达，非borrowed缓存泄露证明。Canvas保留原Editor粒子世界绑定实表达式与原变异测试，Runtime路径不创建它。历史逆仅供测试资格，编译只读当前源码；当前七源缺失/变异依旧拒绝。协议ABI、Worker、时钟、GPU后端、线程额度未修改（本片不适用），资源上传Ready、真实Canvas卸载/启动取消和GUI需后续集成验收。Comfortable字号16/控件44/圆角与现有Motion未降级，Toast保留旧Task/Motion整体声明并新增折叠通知和局部焦点语义。

IMPLEMENTED局部不等于整轮VERIFIED。完整M1依赖边界仍NOT_PASSED：Player仍Vue Canvas及Editor媒体/本地化桥，Media8和UiReadPorts尚未合入；GPU critical upload ACK/CPU Ready分层未完成。Player工厂新增wasmError检查是提前局部清理的防御，Bootstrap原已检查wasmError，原假设false Ready NOT_PRESENT，不能称其为已证实缺陷修复。真实新GUI/WAAPI/Player DOM卸载/输入位移、Tauri独立Player/Linux/H2与B/X正式性能均尚未测试；QualityLocked/Adaptive结果不混用。没有Worker/ABI/WebGPU正式生产接入、新WASM变体、发行包或性能提升结论，不宣称本轮完成。


### 2026-10-10 修正首次Editor Core惰性服务交接并保留重复绑定拒绝：逐文件编辑

计划 .cache/engine-overhaul/root-integration-next/prebinding-plan-NCDSWS/plan.json SHA d2cfa55c5da448861698d478a0851f765e5092c8d5363c396f385225fb35ba8f；全部 4 文件和进度文档前像已在正式编辑前保存于 .cache/engine-overhaul/root-integration-next/formal-editor-first-core-prebinding-4Y2ktX。本批 1 生产文件，source 678→678。每次编辑与实际后果：

| 文件 | 操作 | 具体后果 |
|---|---|---|
| src/editor/worldGameplayAdapter.ts | 更新 | 区分惰性作者Owner与已显式Core绑定Owner：允许第一次Core交接，保留真正第二Core同World拒绝与第一Core固定服务。 |
| scripts/fixtures/runtime-world-adoption-source-v1.json | 更新 | 将实际Editor首次绑定修正登记到完整八源准入；旧业务算法和历史文本不修改。 |
| scripts/lib/runtimeWorldAdoptionSourceProjection.mjs | 更新 | 完整准入集合7→8，只增加实际Editor绑定源及全原文逆，不放宽未知/缺失/变异规则。 |
| scripts/lib/sceneOwnerSourceProjection.mjs | 更新 | 旧Scene13/18条件保留：选定及关联当前源码先经完整八源准入和整源逆，未知/缺失/变异仍拒绝，每次读取重新验证。 |
| docs/RUNTIME_STAGE.md | 追加 | 逐文件账目、真实证据、关联项与未完成范围，原内容保留。 |

已确认原678实际GUI无法打开Editor，显示WORLD_GAMEPLAY_WORLD_ALREADY_BOUND，Player尚未执行；原失败截图及原始数据保留。真实ordinaryWASM驱动复现惰性作者Owner→首次Core误拒绝。完全相同Adapter新字节的actual CPU 4/4通过：首次非空native tick、第二不同Graph的Core仍拒绝且第一Core保持active/继续tick/nav/stream、Stop、同Graph显式adopt登记后不同Graph拒绝。两World/native free2/返回2/重复dispose幂等；页面事件baseline1（pagehide）与tail1相同，新增Input监听delta0，不能称绝对监听0或真实DOM卸载已通过。新候选完整八源资格36及原Hot40/Read101/Scene18通过；相同生产字节实际类型检查0。旧Scene资格失败7项和后续1项均保留，最终通过不删除失败。正式安装后重新完整365、类型、冷构建、实际新产物GUI。

逐编辑后果：Adapter增加弱引用的显式Core绑定登记，允许第一次惰性Owner交接，保留已经绑定Owner的拒绝，登记同Graph缓存返回和重入路径；不存在新增全局时钟/业务world/物理语义/输入延迟。源码fixture完整八源及整源逆，资格helper集合7→8；Scene资格入口保留精确原before13/after13原文输入，对新源执行完整八源校验并整源逆后运行原13组/18项条件，每次关联读取重验，未知变异/缺失仍失败。主指令30/64：World/Gameplay/Graph服务生命周期与Editor首次启动关联已处理；独立Host的既有同World claim不改；ABI/Worker/GPU/资源协议/线程政策不适用本片，原脚本/Scene算法不改。舒适16/44和Motion不变。

这是已确认启动回归的局部修复，不是M1或整轮完成。原失败678GUI未通过；新GUI/Toast实际动画/Player实际移动和关闭DOM路径仍NOT_TESTED。候选CPU使用实际公开业务/Core/ordinaryWASM及Node平台夹具，不是浏览器或Tauri完整验收；pagehide既有baseline不能替代资源泄漏全面检测。Media/Ui/Locale隔离与GPU Ready仍待接线；WebGPU严格像素、B/X正式基准、QualityLocked/Adaptive、Tauri/Linux/H2与26.37发行仍未通过或未测。无性能提升和100%声明。


### 2026-10-10 首次绑定修复的嵌套源码资格顺序与原断言整源证明：逐文件编辑

计划 .cache/engine-overhaul/root-integration-next/prebinding-gate-plan-YmHjVw/plan.json SHA 4ae567661e6271ec6a0b13f3de76ae820a051bb6e1bfb5a0b802f18cab6bb30f；全部 4 文件和进度文档前像已在正式编辑前保存于 .cache/engine-overhaul/root-integration-next/formal-prebinding-linked-contract-order-owNRZm。本批 0 生产文件，source 678→678。每次编辑与实际后果：

| 文件 | 操作 | 具体后果 |
|---|---|---|
| scripts/lib/networkSourceProjection.mjs | 更新 | 最外层Network读取先执行新八源整源逆，再执行Scene→Hot→旧算法逆，避免嵌套验证收到混合历史阶段；原业务断言不改。 |
| scripts/fixtures/runtime-world-adoption-source-v1.json | 更新 | 只登记原Scene/Graph/Particle已接受且找到完整原文的绑定历史输入；fixture哈希、JSON路径及整源哈希全部校验，未知输入不接受。 |
| scripts/lib/runtimeWorldAdoptionSourceProjection.mjs | 更新 | 封闭历史全文集合按实际证据更新数量，原当前八源准入、未知/变异拒绝与每读验证不变。 |
| scripts/fixtures/script-debug-hot-reload-projection-history-v1.json | 更新 | 在原Network读取器整源逆记录追加2个可逆入口步骤；原101断言、365回调正文与原始before哈希不变。 |
| docs/RUNTIME_STAGE.md | 追加 | 逐文件账目、真实证据、关联项与未完成范围，原内容保留。 |

当前正式678生产源全部与完整缓存365通过的源相同，三个资格文件也与该缓存字节相同；第四文件仅登记原Network读取器两步入口整源逆，原rows/claimGuard/365回调与分母完整相同，新46源码正反例+原Hot40/Read101/Scene18通过。原正式365首次失败和后续缓存资格失败保留。此批生产0文件，不再次改变运行算法。安装后正式365仍必须重新执行，不能把缓存结果冒称正式实际执行。

主指令30/64：关联测试入口处理新代码→Scene→Hot→旧算法的逆顺序，精确登记原Scene/Graph/Particle已接受且有完整全文的5个绑定历史输入；逐记录校验fixture哈希/JSON路径/全文哈希。新当前八源全组缺失/变异拒绝、每读重验仍保留。原101检查器及365业务回调正文未编辑；readBoundary.modifiedFive保留原before哈希并追加两可逆步骤。ABI/Worker/GPU/线程/视觉尺寸不适用本片。

本批只修测试资格与证据账目；不代表完整M1、GUI、GPU、性能或发行验收。首次绑定修复的types/冷构建已0，仍需新统一产物GUI。独立Player媒体/UI/本地化生产接线、资源GPU确认、输入完整验证、WebGPU像素、正式B/X/QualityLocked/Adaptive、Tauri/Linux/H2、26.37所有发行文件均尚未完成或未测。


### 2026-10-10 首次Core修复实际GUI与有限输入：证据更新

本次只追加 docs/RUNTIME_STAGE.md，前像完整保存；代码、主指令、已发布文件不修改。实际构建 engine-profile-c91b4f5d495b90717e85 / source c91b4f5d495b90717e85da8d5d7a36dc96170c77afc172c3692c50b70f8caa4a，完整678源/270产物/0 overlay/原生6单列。正式原365全部PASS，类型及冷构建均0。

VERIFIED范围：同原11对象/8资源/59序列组件、1600×900、DPR1、uiScale1，原Editor3（打开非空项目/Play Stop作者内容不变/保存fresh reopen）及Player2（非空PAK启动/焦点）全部通过。实际WebGL2 / ANGLE NVIDIA RTX5060 Laptop D3D11 / contextLost=false；Inspector16px、44逻辑像素控件、面板radius16无横溢出。Root亲读Inspector、Playing及Player三张原尺寸截图；实际单条通知及44px摘要已可见，Toast动态另验尚未通过。图像不替代动画/性能采样。旧e967启动失败及截图原样保留，新通过不覆盖旧失败。

独立Runtime CPU输入8/8：actual Core/ordinaryWASM/Rhai +受控EventTarget，输入边缘、重复按下、松开、Space映射、hidden/resume、blur、stop及lease幂等；native构造1/free1/返回1、新增Input监听0、timeouts0，既有pagehide baseline1/tail1。这个范围不是Player实际移动、跳跃、浏览器关闭、Tauri或实体位置视觉验证。Player原截图文件名含move-and-jump，旧两check仍仅boot/focus，不因此扩大通过范围。

所有GPU窗口自有Browser/Node/server/profile已清理；CPU背景工作存在，故本轮GUI只功能smoke，绝不是无扰动正式性能。实际画布Player1590×900，物理DPI/显示延迟/空闲VRAM/功耗unknown。完整M1依赖边界仍NOT_PASSED；Media/Ui/Locale/GPU Ready接线、B0–B8/X01–X15正式采样、QualityLocked与AdaptiveExperience独立报告、WebGPU严格像素门槛、Tauri/Linux/H2及26.37全发行产物仍未完成/未测。整体百分比仅67%估算，不宣布整轮完成。

证据：
- .cache/engine-overhaul/root-integration-next/merged-c91b4f5d495b/source.json SHA a5fca3378f0cc0d8a08c017a80f004d95c4276172c7a356ebe109eed3b265c1b
- .cache/engine-overhaul/root-integration-next/merged-c91b4f5d495b/integration-receipt.json SHA a813c9e06df8d7902ff6736a558758e69fdf3e2fcb6898f9aecef2b3a82ce42d
- .cache/engine-overhaul/replay-world-review/formal-gui-runtime-host-c91b4f5d495b-Wf7e4b/report.json SHA 4ca6fc042e4b66f9711eeb01dc7557763aa87780ffd13e2620aba781169acab8
- .cache/engine-overhaul/player-host-hardware-gui-preparation/attempt1/prepared-oCxfod/handoff.json SHA b88d03b7302b7dc46fd39c5fa337d6b6d315410cb59fd9c40a7012d2bb0e44c1
- .cache/engine-overhaul/player-lifecycle-input-preparation/attempt2-input-qdgpIM/final-index.json SHA c7dbfdd4e2cf65e2ef266ddd0a93392cefba750cbc282f0ecb2d3ae2d9be75c2


### 2026-10-10 媒体与游戏UI共享实现及显式只读Owner隔离：逐文件编辑

计划 .cache/engine-overhaul/root-integration-next/media-ui-plan-6BBXCD/plan.json SHA 99ed959c004261b2e258f6fa79a43f8fb4046750a942bdbc7d6d481ac8b85c48；全部 20 文件和进度文档前像已在正式编辑前保存于 .cache/engine-overhaul/root-integration-next/formal-runtime-media-ui-read-owners-nwMF8H。本批 16 生产文件，source 678→687。每次编辑与实际后果：

| 文件 | 操作 | 具体后果 |
|---|---|---|
| src/runtime/runtimeMediaOwner.ts | 新增 | 新增显式Catalog/平台端口的媒体Owner：版本固定、解码/字体缓存和有界租约、真正终态后释放；CPU_MEDIA_READY不代表GPU或显示Ready。 |
| src/runtime/runtimeAtlas.ts | 新增 | 下沉原Atlas打包/采样算法到无Editor依赖入口，保持完整原算法、页预算与顺序。 |
| src/runtime/derivedSpriteTextureOwner.ts | 新增 | 下沉原派生纹理算法并按Owner隔离有界缓存；不改变原像素处理语义。 |
| src/platform/webMediaPorts.ts | 新增 | 新增Web解码/字体/画布平台注入；复用全局后台额度，取消不提前归还尚运行的codec租约，无新线程池。 |
| src/assets/AssetDatabase.ts | 更新 | 保留Editor数据库和原公共API，媒体操作委托唯一Editor兼容Owner；原查找/身份/读取语义不变。 |
| src/assets/TextureAtlas.ts | 更新 | 原Editor Atlas入口转为共享运行算法的兼容委托，不并存第二套打包实现。 |
| src/assets/derivedSpriteTexture.ts | 更新 | 原派生纹理入口委托共享Owner，保留Editor缓存与原调用语义。 |
| src/editor/rendererAdapter.ts | 更新 | 将媒体读取绑定明确的Editor媒体Owner；保留材质、渲染设置和作者工作流，不宣称foreignPlayer已接线。 |
| src/runtime/uiReadPorts.ts | 新增 | 统一14个必需只读平台方法，绑定接收者与Catalog身份；没有默认Editor、时钟或Owner。 |
| src/runtime/uiThemeValues.ts | 新增 | 下沉主题与HUD取值算法，参数显式，不依赖Editor/Vue或全局AssetDatabase。 |
| src/runtime/uiTheme.ts | 更新 | 保留旧主题API，委托纯值算法；Editor本地化/Assets读取仅由适配入口提供。 |
| src/runtime/uiTextPresentationValues.ts | 新增 | 下沉文字方向/字体/标签/输入提示取值算法，参数显式；不新增动画或字体缩放规则。 |
| src/runtime/uiTextPresentation.ts | 更新 | 保留旧文字展示API，委托纯值算法；RTL/缩放/输入提示不改变数学语义。 |
| src/runtime/gameUiOwner.ts | 新增 | 新增必需读取端口的纯GameUI Owner，保持45方法与6辅助函数的完整原算法，世界与UI状态由调用者拥有。 |
| src/runtime/gameUi.ts | 更新 | 保留旧GameUI API，委托唯一Editor适配Owner；纯Owner由调用者显式注入14个读取端口。 |
| src/editor/gameUiAdapter.ts | 新增 | 唯一Editor兼容接线：现有Presentation/Audio/Locale/媒体提供纯Owner所需端口，保留作者界面行为。 |
| scripts/fixtures/media-ui-closed-source-v1.json | 新增 | 仅保存原Content2与Tile完整阶段逆推导的AssetDatabase及rendererAdapter历史测试全文与来源；不进入生产编译，未知变异仍拒绝。 |
| scripts/fixtures/runtime-world-adoption-source-v1.json | 更新 | 完整资格集合8→24，新增媒体/UI实际16源与7整源逆；9新源的完整字节也须匹配，不放宽未知或缺失输入。 |
| scripts/lib/runtimeWorldAdoptionSourceProjection.mjs | 更新 | 按同一资格入口校验全部24个关联当前源码，每次读取重验，完整验证14封存旧输入原文，测试历史逆不进入生产编译。 |
| scripts/lib/contentAdmissionSourceProjection.mjs | 更新 | Content2的选定与关联源先经完整24源资格和整源逆，原完整before/after和未知/混合拒绝条件保持。 |
| docs/RUNTIME_STAGE.md | 追加 | 逐文件账目、真实证据、关联项与未完成范围，原内容保留。 |

同一16个实际生产文件的完整类型检查0；严格24源当前集合和7完整逆、14封存历史原文的98项定向验证通过，Hot40/Read101/Scene18原条件通过。上次完整13组执行前9组230项通过，Tile历史输入资格失败；新候选只补可追溯完整旧Renderer原文（原Tile完整逆及Particle fixture原before），其后原4组135项全部通过。两次为组合证据，不冒称最后候选一次完整365；正式安装后重新全部365、类型和冷构建。Media原CPU30/边界22以及Ui原7/同UUID双字体1和完整原算法证明见固定交接账本。旧M1 Content2和Tile历史资格失败全部保留。此前c91b实际NVIDIA WebGL2 Editor3/Player2和新Toast5通过，仅证明修改前产物；Toast正常/Reduced各4秒原始观察已保存，strict3秒NOT_CERTIFIED，正常4秒末还有自动退出任务1，未假称动画全部清零。

关联30/64：资源Catalog身份/版本、decode/字体真终态、Atlas/派生纹理所有权与旧Editor适配已处理；共享原Ui/主题/文字算法下沉并显式读取端口已处理。新增字段/缓存不会反向改写AuthoringDocument、Rust物理、脚本、Undo或输入值；Comfortable16/44/留白/圆角与现有Motion实现不改。协议ABI、Worker Owner、GPU提交时钟、游戏物理语义不适用本片。GPU源字节持有与Renderer退休关系必须由后续真实加载接线处理；实际CPU_MEDIA_READY与GPU完成严格分开。

IMPLEMENTED候选隔离已审查，正式运行回归待本批重建。当前Player仍使用Editor兼容桥，LocaleOwner/InputPromptOwner/MediaBinding/RequiredUpload保留缓存交接，尚未由Host/Viewport/Player真实消费；全M1、GPU Ready、独立入口与最小Tauri Player未通过。没有GUI或性能提升新结论；QualityLocked/Adaptive正式B/X、WebGPU严格像素、Linux/H2和26.37全部发行文件仍NOT_TESTED或未完成。原主指令、AGENTS、native6、旧冻结产物、未提交其他文件均保护，无Stage/Commit/Push/签名/外部发布。


### 2026-10-10 实际资源加载、渲染政策与骨骼资源的共享Owner组合：逐文件编辑

计划 .cache/engine-overhaul/root-integration-next/runtime-load-composition-plan-uTZufQ/plan.json SHA 836e1ccbc5073bfae122aab9226ba2d6fa46f34a01c397286cf96fa3d0aa2582；全部 21 文件和进度文档前像已在正式编辑前保存于 .cache/engine-overhaul/root-integration-next/formal-runtime-load-media-policy-rig-composition-fzQoB7。本批 19 生产文件，source 687→700。每次编辑与实际后果：

| 文件 | 操作 | 具体后果 |
|---|---|---|
| src/runtime/runtimeMediaBinding.ts | 新增 | 新增固定Catalog媒体绑定与CPU解码/字体准备阶段；同对象仅一活跃binding，版本/取消/真实codec终态检查，CPU_READY不代表GPU_READY。 |
| src/runtime/runtimeSceneMediaRequirements.ts | 新增 | 新增显式入口及动态资源声明准入，固定Catalog/revision/clock与完整coverage；未知动态引用不伪装准备成功，原Atlas全目录范围单列。 |
| src/platform/runtimeWorldMediaPlatformAdapter.ts | 新增 | 新增同Catalog renderer/tile/prefab/resource实际端口，导入Tiled继续显式注入原reader，不复刻parser或调用Editor数据库。 |
| src/runtime/localizationValues.ts | 新增 | 下沉原BCP47/plural/RTL/伪本地化/表格式等纯算法；数字、日期、回退顺序与原限制保持。 |
| src/runtime/runtimeLocalizationOwner.ts | 新增 | 新增显式Catalog版本的本地化Owner，独立有界表缓存与关闭失效；Editor mutable模式显式区分。 |
| src/runtime/localization.ts | 更新 | 旧API转兼容委托与纯值reexport，继续唯一Editor设置对象及原语义，不另建重复locale算法。 |
| src/editor/localizationAdapter.ts | 新增 | 新增唯一Editor-live Vue/Assets桥，保持原reactive设置身份和通知；foreign Runtime不导入它。 |
| src/runtime/inputModality.ts | 更新 | 旧提示API委托共享取值算法，保持原raw/proxy bootstrap和默认clock表达式；本文件原无Vue值依赖，不假装修复Vue缺陷。 |
| src/runtime/inputPromptOwner.ts | 新增 | 新增独立提示状态Owner，显式clock仅用于changedAt，原125 descriptor等价；没有输入采集器/timer/RAF，InputManager仍待实际接线。 |
| src/renderer/types.ts | 更新 | 增加可选必需资源上传租约API，保留所有旧Renderer接口；不支持的后端明确缺少能力，不伪造ACK。 |
| src/renderer/WebGL2Renderer.ts | 更新 | 将有界必需纹理租约接入原上传、提交序号和零等待fence轮询；取消/丢失/驱逐/失效/失败释放引用，原绘制算法及预算不变。 |
| src/renderer/requiredResourceUpload.ts | 新增 | 新增同Catalog/media/renderer/deviceEpoch的可撤销Ready租约，4批/2048引用及实际纹理预算限制；ACK表示GPU命令完成，非显示呈现。 |
| src/platform/runtimeUiReadPorts.ts | 新增 | 新增14真实UI读取方法的固定Owner组合，项目字体只采用同media实际注册family；dispose只释放自身读取租约，上游仍由Caller退休。 |
| src/renderer/renderSettings.ts | 更新 | 原Editor渲染设置API委托共享Owner；保留三reactive对象身份、通知、默认值与显式用户质量选择，不自动降画质。 |
| src/renderer/runtimeRenderingPolicyOwner.ts | 新增 | 新增同Surface独立渲染政策Owner；共享全部原10声明算法与默认值，无Vue/Editor、时钟或自动自适应。 |
| src/runtime/rigging.ts | 更新 | 原Rig/Skin编辑入口改为唯一兼容Owner与纯值reexport；保留三authoring函数完整声明及资源查找语义。 |
| src/runtime/riggingValues.ts | 新增 | 下沉原Rig/Skin归一化、IK、约束、权重和变形数学；全部原限额、算法、输出与原23声明资格保持。 |
| src/runtime/runtimeRiggingOwner.ts | 新增 | 新增固定Catalog/revision骨骼资源Owner及各自128缓存；不同项目同UUID隔离，过期/关闭拒绝，Editor mutable模式显式。 |
| src/runtime/runtimeRequiredMediaReady.ts | 新增 | 新增现有视口帧驱动的CPU准备/关键GPU上传协调租约；World Text与Canvas2D HUD范围分列，每次使用重验版本/Renderer，退出等待真实CPU终态。无新RAF、定时器或世界；GPU命令完成不代表显示呈现。 |
| scripts/fixtures/runtime-world-adoption-source-v1.json | 更新 | 固定当前19精确源/13新增/6完整源逆，资格24→43；原14封存历史输入、负控和未知输入拒绝不变。 |
| scripts/lib/runtimeWorldAdoptionSourceProjection.mjs | 更新 | 原检查继续严格证明实际43源集合及16完整旧源投影；只扩展已审核版本，不编译历史算法或接受未知变异。 |
| docs/RUNTIME_STAGE.md | 追加 | 逐文件账目、真实证据、关联项与未完成范围，原内容保留。 |

同一700源缓存（正式687+13新增）的实际完整Vue/Node类型检查0；当前43源/16完整原源逆/14封存历史输入的148项准入与负控全部通过，原Hot40/Read101/Scene18通过。MediaBinding19/Locale8/InputPrompt15/RequiredUpload13/UiRead10由已封存交接证明；RenderingPolicy15、Rig8（包含原6实景回调）、Ready31（原Renderer13+协调18）实际独立CPU全部通过。全旧源逆和原函数/数学/限额证明保存，不拿历史源码编译当前生产。Ready同步decode关闭早结算问题有真实before失败及after验证；原夹具失败、旧类型和M1失败保留，不删失败或放宽容差。正式安装后仍运行原365、实际类型和冷构建。此前正式3bca687的原Editor3/Player2真实NVIDIA RTX5060/ANGLE WebGL2全部通过、DPR1/1600×900/uiScale1；Root亲自查看实际Inspector和Player截图；这是修改前GUI烟雾证据，未冒称本批或完整游戏Ready。c91b Toast功能5通过、Root亲自查看2PNG；normal/reduced动态原始4秒观察已保存，但strict3秒NOT_CERTIFIED，正常退出活动尾项1，不能称所有动效稳定或清零。

主指令30/64关联：固定Catalog/Owner身份与revision、原CPU decode/字体安装终态、same-media纹理版本、Renderer/deviceEpoch与GPU上传租约回收已处理；World Text published纹理与Canvas2D HUD CPU overlay范围分列，未发布必需世界文字则NOT_READY。关闭加载协调只终止自身租约且等待真实CPU终态，Caller仍必须先停止Core/退休Viewport再释放Media。每帧从原Renderer现有提交/零等待fence观察，不加RAF、定时器、World或渲染时钟。原locale/input提示/骨骼/渲染政策完整共享算法已保持，Editor默认门面和raw/reactive通知已测。GPU时间、真正显示、传输/合并性能收益没有测量，保留null；QualityLocked不自动调用preset。协议、Worker、Rust模拟、Undo/保存语义和Comfortable16/44/四向空间/圆角/Motion不适用本片且原源未改。

IMPLEMENTED Owner与加载协调不等于生产Player消费已完成；现Player仍借用Editor兼容平台，独立入口/配置/纯Viewport、实际输入采集端口、世界文字纹理发布、同Host Surface camera/rig/policy与UI、GPU Ready和M1全门槛仍未过。接下来完成真实业务接线，不把组件测试冒称全工程验收。没有正式FPS/延迟/并行净收益结论，QualityLocked/AdaptiveExperience分别正式B/X采样尚未执行；WebGPU严格图像未达、Tauri实际启动/Linux/H2/26.37完整发行未测或未完成。全部原生产前像与文档先备份，逐文件记账；master/AGENTS/native6/旧冻结产物/其他未提交修改保护，不Stage/Commit/Push/签名/外部发布。


### 2026-10-11 Player 候选继续接线、共享值隔离与实际失败修正（尚未正式安装）

本记录是隔离候选的实施/验证进度，不改主指令和验收门槛。正式700源、native6、已冻结产物不变；工作区原有未提交修改保留。当前候选为 .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/candidate。实施前逐项核对影响；共享值和纯视口不创建额外权威世界，不修改 Rust 物理、ABI、Undo、Comfortable16/44或核心Motion。

本批每个生产路径的编辑与后果：

| 路径 | 编辑 | 实际后果 |
|---|---|---|
| src/projects/projectMetadataValues.ts | 新增 | 原名字/UUID/时间/metadata规范化算法，显式身份/时钟端口，无Vue或全局项目状态。 |
| src/projects/projectSession.ts | 修改 | 原reactive门面调用同一共享算法；generation、异常时写入、begin/touch/序列化语义保留。 |
| src/runtime/packageAdmissionValues.ts | 新增并修正 | 原20个函数体逐字保留；每个Runtime实例独立状态/官方表/清单规范化与信任键。复现并修复模块表变更污染已建实例的问题。 |
| src/runtime/packages.ts | 修改 | 原Editor安装/卸载/更新/生命周期接口保留，准入7接口委托同一policy，绑定原reactive状态/信任Set/官方表；仅移除类型检查指出的无用导入。 |
| src/runtime/packageManifestContract.ts | 新增 | 唯一Manifest版本常量仍为1，纯Runtime不用导入Vue诊断模块。 |
| src/runtime/stableContracts.ts | 修改 | 原常量导出从纯契约重新导出，原诊断及兼容公开接口不变。 |
| src/PlayerApp.vue | 修改 | 实际启动消费共享配置/原生参数；保留raw迁移settings与build真实本地默认。世界/generation/stop在迟到结果写入前检查，配置联网同引用传入Host。 |
| src/runtime/runtimeNetworkOverrides.ts | 新增 | 原生10字段参数封闭白名单及角色/传输/地址/权限检查，编辑最终实例配置。 |
| src/platform/webRuntimeViewport.ts | 新增 | 明确single-thread-compat唯一RAF，真实renderWorld/HUD/lighting/camera/input/resize/隐藏恢复路径；尚未接入Player实际入口。 |
| src/platform/webRuntimeGameUiOverlay.ts | 新增 | 原GameUI原生文本输入/IME/选择/焦点/a11y/字幕DOM语义，显式Owner与销毁。 |
| src/platform/webRuntimeVirtualControls.ts | 新增 | 原11个虚拟输入算法与Action lease，指针直接更新数值，独立平台控件。 |
| src/renderer/runtimeRenderTextureOwner.ts | 新增 | 原5函数命名capture/resolve/预算/释放算法；旧代码没有动态消费者，NOT_PRESENT，不能据此声称dynamic Ready。 |
| src/renderer/lighting2d.ts | 修改 | 可选固定World Camera Owner；未传入时原Editor默认不变，数学不变。 |
| src/renderer/WebGL2Renderer.ts | 修改 | textureDimensions守卫不存在的HTMLImage/Video构造器，修复实际函数在Worker环境的ReferenceError，浏览器尺寸结果不变。 |
| src/components/WorldCanvas.vue | 修改 | Lighting和Debug各传同一已有runtimeSurface Camera Owner。初次替换重复字段被TS1117捕获，原失败保留并精确修正，两处各唯一字段。 |

另新增隔离候选的 scripts/lib/editorMediaAuditHost.mjs 和 scripts/verify-package-lifecycle-editor-host.mjs，仅为原生命周期callback提供与Editor main相同的真实接口安装。原测试源码和15项断言未改，原无接口宿主失败保存；历史版本门槛仍development=true/qualifiedRelease=null。docs/RUNTIME_STAGE.md仅追加本节，未重写旧结论。

已验证范围与原始证据（全部CPU/受控宿主，不等于真实GUI/GPU）：

- metadata13差分：project-metadata-extraction-GJ3QRV/functional-jekrhG/report.json，SHA 2a32a4b7b17b9cc6c3b188fcec6a5c8c889374062ff464362aef787e7adee65d。现有保存10项在包修改后也通过：package-original-integrations-SjT6uG/report.json保留save通过及随后package宿主失败。
- package20差分：package-admission-extraction-xLYKu6/functional-KNHqlF/report.json，SHA 38b8109a9b21cbd7b28e0dd00714eb648cdc1d34e767b7632f0bfed711980891。实际3模块纯图无Vue；ES2020 strict/noUnused通过；原20函数body身份一致。先前Vue图失败、stdin名错误及跨实例污染失败均保留。
- 包生命周期实际Editor宿主15项：package-editor-host-run-oZ8zjH/report.json，SHA 5ca8b1bff687a98fa4807b5674fcd6f070c930d7f164f71ffd9a36e873bba015，真实普通WASM、保存重开/Undo/Redo/PAK与包插件权限，开发模式不冒充发行资格。
- 配置消费者27项：.cache/engine-overhaul/player-config-consumer-Oogj2s/functional-e7mAOW/report.json，SHA 3b7e29b131963898622e290ac8cb0e91bccf01e3fc7e0177500878eb18bef109。实际编译Vue SFC，受控平台/加载；4种旧迟到污染重现与反向验证、真实physics settings块11调用顺序、输入/音频一次规范化及bootstrap同引用。
- 纯视口34项：.cache/engine-overhaul/pure-player-viewport-3deg0i/handoff-bicT6H/handoff.json，SHA cb85cb2dd451e53cd8b0c14110c30985a35f2cabb94709af62e0fb2bea554f00。原5 RenderTexture/11 Virtual函数、Lighting整源逆、唯一RAF/IME/可访问性/取消清理均受控验证；Core/World/Canvas context是明确替代。
- 严格七文件合并：consumer-viewport-merge-iM8W6Q/report.json，SHA 60acd118ff5314bd98e165bc491e2bcad7d361eeddc628db1478c29c35905c99。完整Vue/Node types随后通过 types-tghKLO/report.json，SHA 38862d81c532f2b31b537289dce410fbe253ae2912ea082f210034e1bbba664a。
- 纹理函数11项：texture-camera-ports-cWMcp5/report.json，SHA 78497df3870c12253387e90c6d71210f3f0ab380a61065db27b263f17638c656。Camera第一次types失败 types-ccXBqr/report.json，SHA 340bcee3c5ef9bc51575075183e2eab611e495d0beff82d6c6c4cf8d99242ba0；correction-57JPeR SHA a5b7b3edc87f8dd431f32df06661bcd509d3981d5e38c50291cbf488e90ed4ef，修正后完整types已通过：types-ccD3a3/report.json，SHA 069384aba259733eb5f28b30430e135714773b78121b2e435b15cc7ea28dc683。

以上相对证据若未给完整前缀，均位于 .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/。每份源编辑账目含前后SHA/备份/整源或逐步逆；源码实际字节决定组合测试，不编译历史源冒充当前源。

721封存切片已完整types和真实JS冷构建。原preparation混合Windows路径排序导致hash与真实manifest不符，逐一确认721路径/bytes/SHA相同后，仅修正源排序资格记录：player-adoption-sealed-uYnI2T/source-order-correction-g96Jvh/preparation.json，SHA 07f862674ec113e192c1b1edf49db2cab0f7a3516458c7958c30f632fb38489d，buildId engine-profile-ca5109df88e43fc7ca27。实际271产物SHA核对；18395.9632ms是编译耗时，不是FPS。721的旧测试源入口关联正在修正，Hot40/Read101/Scene18与定向严格检查已过，完整13/365尚未全通过；该结果不适用于本节新增组合。

主指令30/64：纯配置/包权限/metadata、输入/IME/focus、frame token、CSS/DPR、固定World Camera、销毁/迟到结果关系已实际处理和受控检查；ABI/Rust模拟/Authoring语义不变。本节不声称新Worker Owner、GPU资源屏障、发布/显示计时、并行收益或完整Motion通过。RenderTexture动态消费者缺失明确登记，GPU/帧呈现/延迟数据仍null或unavailable，不以CPU测试或增加线程替代证据。

继续项：实际Player纯视口入口；移除loadProject/Editor World桥并补legacy资源准入；正式依赖门禁/独立入口/最小Tauri Player；真实当前产物GUI/输入/Comfortable与Motion回归；Worker和Rust权威闭合；WebGPU像素差异、正式QualityLocked/AdaptiveExperience各自B/X采样、26.37全部发行文件。Linux/H2缺设备NOT_TESTED，不能替Windows通过；本轮核心门槛和发行尚未完成。


### 2026-10-11 实际Player纯视口接线、资源值及新鲜物理初值（隔离组合，未发行）

仍保护正式700源/native6与用户已有未提交修改。以下新增/修改均在 runtime-player-adoption-work/candidate；本节及上一节只说明具体实现/验证范围，不降低M1、M8或26.37发行门槛。

| 路径 | 每个实际编辑 | 后果及保护 |
|---|---|---|
| src/runtime/runtimeEmbeddedImageValues.ts | 新增唯一共享 registerRuntimeEmbeddedImage 与原 assetBookkeepingDefaults | 原source去重、UUID/路径/时钟/字段/defaults/pipeline/push顺序，调用者独占records；不创建World、媒体或GPUReady。 |
| src/assets/AssetDatabase.ts | 原图片记录创建改为委托，原bookkeeping下沉 | Folder/异步metadata/atlas/generation仍由Editor门面持有，其他创建调用仍同一默认函数。 |
| src/assets/AssetDatabase.ts | 修复已确认Vue raw/proxy元信息身份问题 | toRaw校验当前UUID记录身份，通过实际proxy写width/height，既能触发Vue更新，也拒绝同UUID换记录/换源/旧Owner结果。原失败保留。 |
| src/runtime/runtimeProjectAdmission.ts | 新增独立metadata/packages/scene authoring/assets准入及PAK组合 | 两次真实资产规范化、unknownFields序列化顺序保留；输出独占快照，revision/Owner捕获，不创建World。尚未接实际Player加载入口；inline路径明确拒绝而非假装Ready。 |
| src/world/sceneEntityFormatValues.ts | 新增原 storedShapeType 唯一实现 | 形状推断不依赖World/Editor/Vue，不更改形状规则。 |
| src/world/entityBuilder.ts | storedShapeType方法委托上述原函数 | 原Builder/字段/组件/ID/UUID构建不变，完整逆变换。 |
| src/PlayerApp.vue | 实际入口采用已有纯viewport，独立场景/HUD两canvas | 旧WorldCanvas生产可达数0；真实sameWorld/Core/surface，loading不tick、headless仅原timer；先viewport→Core→surface/lease/media销毁，迟到factory/bootstrap/DOMflush不写旧会话。整个Player仍Vue/store/Editor，M1未完成。 |
| src/world/worldPhysicsDefaults.ts | 新增原32层mask、类型、global/diagnostics新鲜默认工厂 | 默认值来自原Editor/World实际初始化；无World/WASM/Vue分配，每实例layers/profile/masks独立。 |
| src/world/World.ts | 常量/类型保持公开reexport，lastSettings/diagnostics用共享原默认 | 求解器、WASM驱动、字段所有权不改；保留公开API。 |
| src/store/physics.ts | globalSettings初始值改调用唯一共享工厂 | 原Editor数值/对象独立性不变；hydrate/load/Undo/Redo没有改动。 |

原始来源/失败/逆变换与实测：

- 内嵌记录原17差分：embedded-image-extraction-VoL59C/functional-ora15S/report.json，SHA d2442cd36b568bf01138e767735dea805d98f90dab8fee9db5ec094146693ae4；真实Vue受控decoder证实旧proxy身份拒绝本记录。修复22项：functional-iyodw4/report.json，SHA cfd81ac10badfe106c81e9db75bc027eea5edd875640bb3f2b376c2dfc503036，新增值37触发一次同步Vue通知，五种迟到无写入。原无标准TextEncoder/atob类型失败保留，Worker标准库声明补足，全部行为断言保留。
- 元信息修复账目：embedded-image-identity-fix-Lr1QAv/report.json，SHA 008a14928d940ac07f289bddd800594e7875aede0359761686b8bb985e4ff311。该组合full Vue/Node types通过 types-u9wi0e/report.json，SHA 37c80800958a5e3cb08922359965fdccbad2505fd71be6336054c6fdc6c172ac。
- ProjectAdmission 32CPU与完整types：.cache/engine-overhaul/player-project-admission-Rsfc5u/handoff-TafV8f/handoff.json，SHA d46563855545b0e5f3e025f9849deae80fc33a184c0cca1981a5ed7617e52a50。包含原实际loadAssets/serializeAssets两轮差分、普通WASM迁移及actualPAK reader，非GPUReady。3文件精确合并 project-admission-merge-obTP5Y/report.json，SHA db1d02af5c8dbb089a4f76d6aa595c1f6592b095533d0b6ad77719f1951d29eb；合并器原误读diagnostics为exitCode在任何生产写入前被拒，原driver备份保留，改按实际report字段。
- 实际Player视口15 compiled SFC +5普通WASM真实World/Host/Core小片：.cache/engine-overhaul/player-viewport-adoption-9cFa6U/handoff-dinjlG/handoff.json，SHA 76e6f08dcfd864d77818a020a029012d2aa72e8b2211ed0f3d023e6982fdf368。后5项只有DOM/Canvas2D context受控，实际WASM/Core未替换；无脚本资产，无真实GPU。136个actualPlayer build产物与315可达图记录，仍Vue5/store5/Editor12。9编辑逆变换合并 viewport-adoption-merge-gZy25p/report.json，SHA ddb72f9431f9b6095f7213a65f8565dca9e842fc7f22662ac3dca707cd37fdc9。
- 默认物理6差分：world-physics-defaults-Jbus31/functional-tDtXK1/report.json，SHA 9abe5a249e723792ac322687a8d1dded3c942d0c6e3fadde534f1518d2cd605c；原Editor和World数值/顺序相同，32位mask和独立可变对象正确，ES2020 strict及实际pure graph无World/WASM/Editor/Vue。
- 更早729封存已fulltypes与实际JS冷构建：player-adoption-sealed-qzKVJK/preparation.json，SHA d63e5c9846ecd38ac75bd2e46a0a93813d17630a40741f9cd30f80e20839250a；manifest SHA174077571824e83cdc537d667eee1add5c589faed618714b43d237ea33e74b1a，buildId engine-profile-79f45d9ba546b131aab8，271实际产物；16824.2451ms仅编译wall时间。它早于本节新组合，不替代当前组合回归。

以上简写路径如无前缀均在 .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work；sealed构建位于其父root-integration-next。本节完整types/冷构建/真实GUI尚未统一重测，不把不同sealed结果合并冒称同一源码通过。原721最终测试入口修正统一13/365仍运行；保持原callbacks/fixture与历史guard，不扩大旧SHAallowlist。

主指令30/64关联：资产身份/双轮恢复/CPU预算/Owner revision/迟到结果/同UUID替换、实际单World视口/精确输入/隐藏恢复/退出、初始全局物理与原值类型已处理上述范围。后续仍需唯一实体准备Owner安全移交、active-only inline与namedLayers/初始physics顺序、无Vue/store实际Player入口、Worker/Rust权威、critical GPU Ready及真实画面输入/完整Motion/正式QualityLocked与AdaptiveExperience各自性能。没有新增线程或降低画质；GPU/显示时间与并行收益未测，Linux/H2仍NOT_TESTED，26.37全部11文件未生成。


### 2026-10-11 纯消息、单次实体准备、独立Shell及实际Session组合（隔离候选）

正式源码仍为700源/native6、HEAD 82c9c03118848df1c07af323c38a3abade7dd21b；下述生产编辑均仅在 .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/candidate。约72%仅为整体工作估算，不是验收通过率。M1实际生产入口仍未迁移，26.37尚未发行。

| 文件 | 每项实际编辑与后果 |
|---|---|
| src/ui/uiMessageValues.ts（新增） | 原字典、272次Object.assign及t/localizedUiLabel原行为下沉；createUiMessageQuery注入语言查询，三个语言各3969key，无Vue/store/DOM。 |
| src/i18n.ts | 仅Editor门面保留preferencesState.locale响应式查询，公开t/localizedUiLabel兼容；不改变翻译与参数替换。 |
| src/runtime/runtimeGlobalPhysicsValues.ts（新增） | 共享原normalizeGlobalSettings/loadGlobalSettings/loadPhysicsProjectSettings三函数；Project→activeScene覆盖顺序不改。 |
| src/runtime/runtimeActiveSceneAdmissionValues.ts（新增） | 独占sameSceneManager/sameEntityBuilder/sameEntities；只处理规范化active场景inline图片与namedLayers、pendingTileInvalidations，有界records/值快照及唯一移交/取消。不再二次UUID构建。 |
| src/runtime/runtimeSceneData.ts | 暴露原三个实体/连接解码函数的纯入口；原字段解码不改。 |
| src/runtime/runtimeWorldBootstrap.ts | 可选preparedScene采用原实体和Builder；成功completeTransfer，失败保留取消；未传时原兼容解码路径。 |
| src/runtime/runtimeWorldHostContracts.ts | 明确prepared实体Owner可选契约，原Runtime世界/资源/能力边界保留。 |
| src/runtime/runtimeWorldHost.ts | 原Host可采用sameBuilder，移交后原guard切换真实Hostguard，tile失效交还实际Host缓存Owner；无第二World。 |
| src/platform/webPlayerShell.ts（新增） | 无框架Shell：原项目标题、网络、传感器提示、40日志、焦点/Escape/inert/关闭与两canvas目标；使用实际注入消息，无缩字。 |
| src/platform/webPlayerShell.css（新增） | 仅Player Shell样式引用唯一Comfortable tokens，16文字/44控件/12输入/16面板/20留白、正常/Reduced Motion状态；不把Editor面板组件带入Player。 |
| src/playerRuntime.ts（新增） | 实际Session消费：CPU准备→sameViewport预热→criticalReady→sameCore一次启动；headless只原单timer，退出viewport→Core→upstream，取消/迟到防护。观察帧证据不提升Ready。 |
| src/runtime/GameplayRuntimeCore.ts | 可选第五参数捕获独立项目脚本配置，17处读取转该实例；省略仍原live Editor配置；84原方法投影与whole inverse保持，前四参数兼容。 |
| scripts/lib/scriptDebugHotReloadSourceProjection.mjs | 原闭合提取/Owner fixture识别当前独立Core配置小切片；不扩大历史SHA白名单。 |
| scripts/lib/networkSourceProjection.mjs | 当前已审查source使用全当前Runtime准入，旧source仍原guard；原断言/fixture不删。 |
| scripts/verify-engine-m1-owner-contract.mjs | 原Owner callbacks/fixture保持字节相同，正确关联冻结当前源入口。 |
| scripts/verify-engine-script-debug-hot-reload-read-boundary.mjs | 关联当前已审查source而不改变hot-reload旧fixture边界。 |
| src/platform/webPlayerSession.ts（新增） | 实际PAK/项目准入→纯配置→同media/input/device/sensor/camera→samepreparedScene/World/Host/Core/surface组合；同一次时钟、epoch、清理、40日志、原网络覆盖。所有平台和criticalReady为显式端口；尚未实际生产入口接线/业务验证。 |
| src/playerRuntime.ts | 新增显式entry-compatible-ready；Session预先声明expectedEntryReadinessKind，严格匹配headless/兼容/GPU范围后才启动。旧未声明Session保留原GPU/headless默认，不弱化门槛。 |
| src/platform/webPlayerShell.ts | 新增ENTRY_COMPAT_READY状态，Canvas2D不再伪称ENTRY_GPU_READY；无尺寸变更。 |
| src/platform/webPlayerSession.ts | 修正loading消息窄类型与projectSettings Record绑定；捕获实际非safeMode且enabled/projectEnabled/wasm插件entryAsset源，Ready明确动态资源覆盖；根据实际请求路径声明兼容/无GPU就绪范围。 |

证据与范围（缩略相对路径如未声明前缀均在root-integration-next/runtime-player-adoption-work）：

- 纯消息7项、23838普通查询与actual Vue locale反应通过 ui-message-values-XxDeD9/functional-9SekOd/report.json，SHA c8642ddebff777151986ec34b9e2ecbfed1451bd6859fb1d088670e8c0539b5a；跨VM __proto__非字符串对象身份导致的旧fixture失败保留，仅这两继承项改比结构，原字符串严格相等不变。该组合完整types-Q0dQhb通过，SHA e0c181cbd5195f0ca5b9551f60cf4db0158c1fe0183c40aeba4c207f41f56c64。
- Global7/Active20与完整types：.cache/engine-overhaul/player-active-scene-admission-KdJOGc/handoff-Gb1wu9/handoff.json，SHA3d49fc6c6badc5029cd6920ed9800f1d26260cd6a497149236d0e41469bb20d3；Root6文件18处精确逆变换active-scene-merge-P4jP7O/report.json，SHA5a7e51463fe2b2fbb1d7e4c05362f475cf59ae695b6a454bfeeb58179423e7d4。该组合types-roExBI通过，SHAf601bfc36c949a337a0789f93778c745f12b7a3349262e8ad840d079233dff99。受控World fixture未证明实际Session/WASM/GPUReady。
- Shell真实普通WASM/World/Host/Core+受控DOM/Ready25项通过：.cache/engine-overhaul/pure-player-shell-Hxhlyg/handoff-aH3AGU/handoff.json，SHA0a52d9474a309dab639d3ca62505ed539924ddfd274d0fe32ad1ca590bc444bb；actual独立API build210源/64可达、Vue/store/Editor0，非实际player.ts入口。Root纯Shell合并pure-shell-merge-IGMvgB/report.json，SHA0aa6ed858766a6bbe6503555209357f8d5940b31e058779b6611eb2a9e991907；两个合并器report字段误读在任何生产写入前被拒，原失败保留。
- Core第五参数15实际普通WASM/World/Core检查通过：.cache/engine-overhaul/core-project-script-settings-OAeY02/handoff.json，SHAc76caf6aa2453f7d8308900d7fb98c5c69f8e38979df0ec5cd1ece87c134cee2；Root exact逆变换core-script-settings-merge-pPpxdF/report.json，SHA4a635c9e7e76b541a4c3b79c72fc2ee728e6ddfadaccee944a83823615919a24。fixture错误与真实Rust panic原日志保留；未据独立15项声称最新组合全通过。
- 原13/365已在冻结721源最终通过（修正上一节“仍运行”的历史状态）：.cache/engine-overhaul/player-adoption-test-link-Ya3RTn/original365-xhQeFG/report.json，SHAa5e2f3996c1f04b0ddab0a7c3a865f7c2ccae80e12e88ac5722f96269d4e9adb。4个关联测试文件精确合并contract-association-merge-yiAswL/report.json，SHA735bdfbe28bfdd5c6d92ef0b1df5b841e5ee00138faab43a0c6fbca8d2442c75；当前新Session组合的365尚未重跑。
- 新Session完整types-diXI5f失败10项，SHA c0a60cb26d158bddf6f758033927e557cdfd47f21471458007e0a9863ba7622e：8项待新active Admission接口，另loading消息及projectSettings类型已局部修正，未先标当前全通过。逐项scope修改entry-scope-edit-ReoO5j/report.json，SHA bce74178c5f4e78cd26a2a2a13dac739de4be3a5580c3139e8ec35ad46cfbb07。原sealed25并未验证新增兼容分支。
- Worker事实审计 .cache/engine-overhaul/world-nodom-worker-audit-hsbAo8/report.json，SHA06828a9b23a95004a049ff37102dccf9db74bcd896f591f63d396dc95cf72b13：CONFIRMED World无document/Node分支不创建Rust运行Owner；NOT PRESENT实际生产worker-engine/worker-simulation，本轮暂未改World构造器，不把该审计称Worker完成。

主指令30/64关联：同一项目/场景/Builder/UUID、二轮资产、实体安全移交、Core脚本配置隔离、停止/取消/迟到、Ready范围、插件动态来源、旧Editor门面响应式已处理上述切片。active-only Admission调用链、critical media/audio/GPU就绪正接线；动态脚本/插件缺声明仍需完善兼容策略，不能静默删功能。M1生产bundle/独立原生Player、M3 Worker/Rust权威、跨后端像素门槛、全UI动态/输入、QualityLocked与AdaptiveExperience正式原始数据及全部11发行文件均尚未完成。Linux/H2仍NOT_TESTED。GPU时间/真正显示时延未知不填0，不把编译时间当FPS。


### 2026-10-11 实际独立入口、初始资源门控、插件准备与原生宿主（候选）

正式700源/native6与用户未提交修改保持；生产改动仅在隔离候选。当前约74%为整体工作估算，不是验收通过率。以下区分实际实现、已运行证据与未完成项；26.37没有正式发行。

| 文件 | 每项编辑、后果与兼容范围 |
|---|---|
| src/runtime/runtimeProjectAdmission.ts | Active路径接实际同SceneManager/Builder实体、二轮资产、包manifest和取消安全移交；旧Editor兼容函数保留原算法。回调政策Owner捕获后不随异步可变端口替换。 |
| src/visual/graphCatalogValues.ts（新增） | 共享真实节点定义与包/插件贡献查询算法，语言/项目状态通过显式纯端口；无Editor/store。 |
| src/visual/graphCatalog.ts | Editor门面继续读取原真实当前包/插件状态，原公开节点行为保留。 |
| src/visual/graphCompilerValues.ts（新增） | 原真实验证/编译算法移至纯工厂；使用当前节点定义和源，不制造空贡献。 |
| src/visual/graphCompiler.ts | Editor门面转原纯工厂，公开编译入口与诊断保留。 |
| src/visual/graphSyntaxSchema.ts | 仅类型导入切换纯节点契约，无运行算法变化。 |
| src/visual/graphSyntaxApi.ts | 仅类型导入切换纯节点契约，无运行算法变化。 |
| src/runtime/runtimeWorldHost.ts | 增加受Owner守卫的真实插件贡献读取，返回复制冻结数据；未绑定Owner时拒绝，不伪造贡献。 |
| src/platform/webPlayerSession.ts | 实际纯节点/编译工厂接实际准入包与同Host插件贡献；无未绑定空默认。后续接真实INITIAL_ENTRY Ready、CPU渲染门控和commitStarted，释放初始证书允许正常换场景。 |
| src/runtime/runtimePlayerEntryReadiness.ts（新增） | 同World/Core/Media/Audio/Renderer/时钟的入口依赖Owner；CPU缓存、实际Required上传和异步GPU fence才能GPUReady，观察32帧不代替门控。显式Canvas2D为entry-compatible-ready，headless为headless-resources-ready。未声明脚本/AI/插件、未闭合资源、真实stream仍NOT_READY。 |
| src/runtime/audioRuntime.ts | 新增与实际播放AudioBuffer缓存关联的required audio准备/使用/释放租约；不制造声部、不假装用户激活或播放输出。 |
| src/runtime/audioOwner.ts | 暴露同AudioOwner真实required buffer终态与释放，旧音频语义保留。 |
| src/runtime/audioRuntimeContracts.ts | 增补上述实际音频资源租约契约，streaming仍明确未完成。 |
| src/runtime/runtimeSceneInstantiator.ts | 导出原场景读取纯函数，旧门面委托；原17例解码算法字节/结果保持。 |
| src/platform/webRuntimeViewport.ts | 可选mayRenderFrameCPU屏障接已有唯一RAF；慢HUD字体准备期间不读取未就绪FontFace、不推进Core，输入/resize保留。 |
| src/playerRuntime.ts | 实际Session CPU屏障传唯一viewport；相同Ready种类严格验证、初始证书只消费一次，旧可控host可选接口兼容。 |
| src/platform/webNativePlayerPackage.ts（新增） | 真实native info/raw ArrayBuffer分块读取和整包SHA，串行且有界；捕获同invoke/hash Owner防异步端口替换。仍整包Uint8Array，不声称分页资源或并行收益。 |
| src/platform/webPlayerEntryHost.ts（新增） | 真正生产主入口组合普通WASM/迁移/同World/Core/loader/Ready/renderer/输入/宿主服务；语言/舒适尺寸/主题独立，无Vue或Editor store。性能Host已接activity，真实frame压力采样尚未接入。 |
| src/player.ts | 三字体CSS与独立无框架Player入口替代旧VuePlayerApp mount；旧PlayerApp文件留兼容，非生产入口。原本地crash落盘能力正在最小宿主恢复，尚未整合完成。 |
| vite.player.config.ts（新增） | 只player.html独立生产构建，无Vue插件/Editor入口；实际产物依赖违规导致构建失败，两个纯UI值/token路径精确例外。 |
| package.json | 仅增加build:player实际独立构建脚本，无依赖升级/锁文件变化。 |
| tsconfig.node.json | 将独立Vite配置纳入原Node类型检查，无放宽规则。 |
| src/platform/webNativePlayerPackage.ts | 参数保留名arguments改parameters以满足严格模式；类型接口命名修正，无数值/资源算法变化。 |
| src/platform/webPlayerEntryHost.ts | GPU Diagnostics import大小写匹配真实文件；保留严格类型和跨平台路径约束。 |
| src/runtime/GameplayRuntimeCore.ts | prepareSessionPlugins(signal)准备同一真实plugin Owner，同signal同Promise、取消/迟到/stop/失败清理；begin仍同步，prepared后不再第二次start。真实AST为85原members，83保持，仅begin/stop修改；此前84线索不作为证明。 |
| src/platform/webPlayerSession.ts | 在同Core构造后、Ready前await同signal的prepareSessionPlugins；无新World/RAF/线程，成功后原Ready→commitStarted→begin顺序。Editor Play awaited接线尚未实现。 |
| player-native/build.rs（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA 061fc2edb15d1521478dcb030483f96fc963f58107398f55b56efa72f45d0a29。 |
| player-native/capabilities/player.json（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA e86dc10d341cf5bc3b2d5b10909fd324810e9f87c276cde2b64c4b39722c0937。 |
| player-native/Cargo.lock（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA 1a60fba256579be3d53fab6c147772ce8619335105eeb098d3afccbe83ef2c7c。 |
| player-native/Cargo.toml（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA 36cc283a117fd7636654409c7f7d30cbfb6a74d4ac74bb70da93cea9e5c0e370。 |
| player-native/icons/128x128.png（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA d6be92b38b2b539fbfc32bac10a7c816d51b241652f5e625cb75dc6c750c2e1b。 |
| player-native/icons/128x128@2x.png（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA 70df77ee7796756c9559d945b2ce70e20701d6657487fe40564da9c7aabf607c。 |
| player-native/icons/32x32.png（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA d49776fb3173ddf5608b4bc309641caac665fcad6db2d52575a78d86e52268cf。 |
| player-native/icons/icon.ico（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA 2c820cd5e4618dd61578114ed783682859f50866f22a0d0205f6d1b2830acce0。 |
| player-native/permissions/autogenerated/runtime_overrides.toml（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA 7553c3ef9311a56a2a9b1db96c2d97ee7a03d3727d092929496f473f0bbf534c。 |
| player-native/permissions/autogenerated/runtime_package_info.toml（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA f49cdb24ea4befce1b2d04623bc4e1f9b368aad19b8791068b0125ec9af2dc05。 |
| player-native/permissions/autogenerated/runtime_package_read.toml（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA eacc1a9c13a9a3a072fb6c99b4c0b80d58b5da035ae3bd277337eae9af08fd99。 |
| player-native/permissions/autogenerated/udp_admit_peer.toml（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA e222e9e2d585cf2984b03cf7317c9b9c719ef1c91a33057f9772feaacbd79861。 |
| player-native/permissions/autogenerated/udp_close.toml（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA 9b296e1cf52d34ac05874531f5ea3908b2ec45b82d75d8a9d197fce2d8ad9b21。 |
| player-native/permissions/autogenerated/udp_forget_peer.toml（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA a006868826ed700a9b38e272adf58acea53f94b92d3ec860f7dfc8f3c81f5025。 |
| player-native/permissions/autogenerated/udp_open.toml（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA f5d4d2fc0dae752092a7e374c7a9186773409069903a839cfd8d1a77ad306f82。 |
| player-native/permissions/autogenerated/udp_receive.toml（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA c356bac861a34fdca0822fc9dc714861ef8c8ea9bfc33aeeb16d5b96ea8eb262。 |
| player-native/permissions/autogenerated/udp_send.toml（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA e5371b305246735c0b984c77c9a31646f91adc555cf6d41b5cb60a1eccb92283。 |
| player-native/README.md（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA 29eb96066a22d2dd36181009e6a54f9836f60a7ded2868f38597be3945432199。 |
| player-native/scripts/build-player.mjs（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA 9b6838b7403873a324d35ab8d64d91d75d4f8d7a777720df9e12de02ce902279。 |
| player-native/scripts/package-player.mjs（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA c80dd5cf3de37fd7519fdba3463e2be5ec47f4c5bac3ee9316a351eeea73616b。 |
| player-native/src/admission.rs（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA 8c026283262ea2038f2b31b8c64330eecff34c809879443df9ef5c578e505b01。 |
| player-native/src/lib.rs（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA edef6e77654e78272a090edea160e98a2d68999c2488d6a81877aafaa8f1e61a。 |
| player-native/src/main.rs（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA 47b11620910befbaeba606c9b3f6788bdd41df864624172b85ca54cc6e0f7f56。 |
| player-native/src/network_tests.rs（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA b470c9c3f6321c223db70bcf73ce5258df79ae3461053620c73e5fd09bea38da。 |
| player-native/src/package_tests.rs（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA 60aa229855ec4eb4da48163419a7c9adbc784d21a2eb06e28649c420778af69b。 |
| player-native/src/package.rs（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA ef943e02d4e0f2657faa5e10cf9aa5f0e66a5625018d39efa99c64f6e9f8a83e。 |
| player-native/src/runtime_pak_preflight.rs（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA 0baca862f202543e904454c640afdfaa7ab6f54e695be84863a263dc9d7ff83a。 |
| player-native/tauri.conf.json（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA 0725e1e19fbdaa201d42bdad44fe065347520b2c8148df1ab04bd9cdd879317b。 |
| player-native/windows-app-manifest.xml（新增） | 独立最小Player宿主切片；完整内容和许可证/协议/权限证据见 minimal-native-player-merge-vPJaWo。SHA 34889649c3a9929d1640aad018457c04d9d49fd4340e115a79527430106b4aa4。 |

逐项合并和逆变换证据均保留在 root-integration-next/runtime-player-adoption-work：

- Active Admission：active-admission-consumer-merge-njYGa4/report.json SHA c2cb97fe76ff745740c3527756849cdd03e3d30bc5969e816168b1e482dcc4a3；实际Active15、旧兼容32通过。纯Visual7+Session：pure-visual-values-merge-mVXttI/report.json SHA 5d81480a3f735f4aca3338a2a9b4f321d4a03c99694d61599798273c92d3835b；原150函数/208节点定义保留，CPU/WASM18及Host2通过，不代替新主入口首次生命周期。
- Ready6+两绑定：entry-readiness-merge-KlrqFK/report.json SHA 2fb09b0b552f3ba0041431adb73b28f24debd1e71a4ecfba66df9e50ea69758d；30/30实际普通WASM与真实Media/Audio/WebGL2类、受控DOM/fence测试通过，终态监听/RAF/timer0。受控fence不是硬件GPU完成或显示呈现。慢HUD、初始证书锁死换场景与AI来源遗漏的原失败保留。
- Native29：minimal-native-player-merge-vPJaWo/report.json SHA 091d4577e80b5acff8d7fd2b8e9162fba2b42f58909c806ab5bab22728c986d2；独立crate/标识/9命令，428锁定registry来源不升级，42旧无关依赖移除。21真实Rust测试、9 Windows诊断IPC及真实CSP音频对照通过；是诊断WebView，不是实际游戏Ready或正式发行。原生崩溃报告扩展正在下一切片，旧sealed29不改。
- 新入口6编辑 actual-entry-edit-y5Ifyw/report.json SHA ddfa3be5f9aab0d99e3434c129a67b932e94b1b0d57fcb4a65fccd4114a8ceb9；native端口替换真实失败保留，修复后31 CPU测试 native-byte-functional-NCkvWz/report.json SHA0a91be9dea15dc37591e886e85ad54f8d8df01ffe707014ff084133b087e0c09。类型失败2项保留 independent-entry-types-XdVz10；精确命名/大小写修正 entry-types-edit-oUn7ja/report.json SHA d98c09c25183d60c65dea28251051a646145b24470eada1c1fd6bcd04968e1c6。
- 完整组合Vue/Node类型通过 independent-entry-types-0Lzscd/report.json SHA81e3cc515a7f50d74c9482fcf80a37863b9f943d28cba13b8e3cdb46100c2ed6：687实际src/config、native29和formal700/native6保护。仅证明该冻结时刻类型，不涵盖后续Core准备接线。
- 第一次实际独立production构建通过 independent-player-build-gtyRTm/report.json SHA456725df120b04e04876acfdf704b72aee4cccefe044a954d90657a7e9a51643：746冻结源，buildId independent-player-6c18c5435b3d47cad2b1，真实248 emitted模块、Vue/Editor违规0。manifest SHA86fa530ee9c1898d083d3ac292e808184fcc1ba3482575494731105afb27d84c；production模式，已有匹配ordinaryWASM，非冷Rust/WASM构建。4784.7005ms只是编译wall，不是FPS/并行收益。
- 同一旧11实体8资产平台小游戏真实当前独立入口检查FAILED：independent-player-hardware-TUtwLA/report.json SHA dae66ee3bcc284788e8a709388cd44937d23bb930432f645799b6a505ad14e4f。1600×900/DPR1/uiScale1、原PAK SHA e6e765598078de5e32e26cab08d02aea58a74d0258fd2fe49372443ca1e9c246未改。PLAYER_ENTRY_DYNAMIC_DECLARATION_MISSING_OR_INVALID asset://f239103a-24ff-4666-8239-103a24ff5666；截图在同目录evidence。因未STARTED，不把启动失败记录称NVIDIA渲染验证通过。正在以原PAK完善verified目录兼容，不能删脚本或伪造声明。
- Core实际首次插件failure awake/start0保留 .cache/engine-overhaul/player-plugin-preparation-1mhEfg/functional-iRxodK/report.json SHA957c8e22166678f934eb0f77657b5f6dbfa6e137317566048541dc5ecaee87c3；改后16 ordinaryWASM+同World/Host/Core+真实smallplugin测试通过 functional-cx4O7E SHA c7b7eb17a430a50c5953aaddf93034484a17728b590839eb439d292785c00f94。Root合并 core-plugin-preparation-merge-d85dZl/report.json SHA976454ab2d6868f65ec9b94a5cbd5435fabd38d72948bf8fce8cdf799d91a36b，701逆变换且两文件小切片；实际Session完整组合仍待测。

30/64关联表当前：已处理本切片的真实同Owner/World/epoch/资源源值、CPU门控/初始证书、插件首次准备、原公开门面/数据算法、取消清理/分块协议和独立bundle。未完成：旧动态资源verified目录/实际导出保留规则、stream终态及其它未闭合类型、Editor Play异步plugin准备、frame压力政策接入、独立Player正式WebView小游戏/大PAK/CSP全路径/生产模板/原生全局额度。M2 Rust唯一权威、M3真实Worker、WebGPU严格像素门槛、全部UI动效/输入/性能、B0–B8/X01–X15正式采样、QualityLocked/AdaptiveExperience分别验收仍必需。Linux/H2继续NOT_TESTED。GPU执行时间/真正显示延迟均未知null，不填0；全部11发行文件尚未生成，不宣称本轮完成。


### 2026-10-11 15:49 UTC 帧反馈、本地报告、目录兼容与真实旧游戏（候选）

仍只在隔离候选实现，正式700源/native6及用户工作区原修改不覆盖。整体约75%是工作量估算，不是阶段通过率。下列每项编辑均有精确before/after、备份与逆变换记录。26.37尚未正式发行；M0–M8/X0–X6没有整轮完成声明。

| 文件 | 本次实际编辑、后果与保留范围 |
|---|---|
| src/platform/webRuntimeViewport.ts | 可选真实frame观测接原唯一RAF和Core/InputManager消费；同world/input epoch才计算CPU提交延迟，真正GPU/显示时间null。Frame candidate在finally释放；观测错误只退休观测，不破坏玩法，hidden重建测量基准，旧无observer路径保留。 |
| src/playerRuntime.ts | 将实际viewport样本交同Entry Host压力源，报告异常隔离；本时刻headless timer观测尚未合并，不能称所有执行模式已经接入。 |
| src/platform/webPlayerEntryHost.ts | frame监听集接原PerformanceHost/PressureFeed；dispose清理原监听。另仅native创建本地报告helper，实际package加载绑定原invoke；global uncaught error/rejection在fatal前尝试报告，失败只recoverable，不递归。 |
| src/platform/webPlayerSession.ts | 在实际PAK归一化后配置原本地报告开关/gameId/真实scene读取，退出解除；实际prepareCatalogCpuMedia传同load signal；source proof使用同monotonic clock。最终catalog目录包络通过惰性readCatalogCoverage传真实Ready，仅缺少精确声明的opaque source请求，静态或精确声明入口保持原流程。 |
| src/runtime/runtimePlayerPresentationOwner.ts | 原prepareCatalogCpuMedia新增可选AbortSignal，传实际requiredMedia consumer；不伪造物理解码终止，不强清运行租约。旧无signal缓存Promise保持。 |
| vite.player.config.ts | 从仅emitted检查升级同时检查compiled value graph及emitted graph；保留两套实际imports/chunks证据。增Pinia、Node browser-external、Importer/Exporter/project门面禁项，两个已有纯UI值/样式例外仅限Player，原共享Runtime audit不改。 |
| src/runtime/runtimePlayerCatalogCoverage.ts（新增） | 真正有界PAK parser/hash/gzip/source重建的私有认证token；最终catalog逐UUID/path/type/source对应原字节。合法旧PAK可用legacy-verified-package-catalog保守驻留包络，新显式verified-directory-rule必须双射；不是把所有文档叫初始critical。成本分别保留sourceRead与catalog binding，不声称并行收益。 |
| src/runtime/runtimeProjectLoader.ts | 原实际Loader接上述真正parser/proof并保留packageSourceEvidence；第7可选clock测真实准备wall，不替换旧迁移算法。 |
| src/runtime/runtimeProjectAdmission.ts | 两条原clone路径继续对原project/source做原预算/纯值复制，仅通过私有assert认证的冻结token保持原身份；伪造/clone仍拒绝。实际PAK wrapper新增末尾可选clock，旧调用兼容。 |
| src/runtime/runtimePlayerEntryReadiness.ts | 精确声明优先；只有missing声明才采用真正目录包络，目录媒体实际CPU/GPU上传/fence及audio buffer终态门控。新增受认证的惰性callback，错误记录unresolved，invalid声明绝不fallback；静态合法内嵌资源继续原precise流程。 |
| src/runtime/runtimeSceneMediaRequirements.ts | 同真实catalog/revision/clock认证目录动态范围，保守媒体驻留与精确入口scope区分；原预算/原atlas范围/原prepare path保持。 |
| player-native/build.rs | MODIFIED；本地崩溃报告协议、权限、配额、文件锁与真实宿主能力的独立切片。精确内容与逆变换见 native-crash-merge-3oa1fC；SHA eaf53b62e19cb8ecdbf94eac1a4e0a584990ae290a1ec4cffd97772fd79832d1。 |
| player-native/capabilities/player.json | MODIFIED；本地崩溃报告协议、权限、配额、文件锁与真实宿主能力的独立切片。精确内容与逆变换见 native-crash-merge-3oa1fC；SHA 4424d014bdf0abdb688ca9eb5071f3ed8b661c15c0c09ac196be9379ebf7bef0。 |
| player-native/Cargo.toml | MODIFIED；本地崩溃报告协议、权限、配额、文件锁与真实宿主能力的独立切片。精确内容与逆变换见 native-crash-merge-3oa1fC；SHA 48cde6f196a2066bc28b42419bc840e11864c78a36cfc557b34db295002450d9。 |
| player-native/permissions/autogenerated/runtime_crash_report.toml | ADDED；本地崩溃报告协议、权限、配额、文件锁与真实宿主能力的独立切片。精确内容与逆变换见 native-crash-merge-3oa1fC；SHA 8845063f60304b2bacf39ee61a175fdcdcdd7f78c0fbcc5a656cf914c3c81276。 |
| player-native/README.md | MODIFIED；本地崩溃报告协议、权限、配额、文件锁与真实宿主能力的独立切片。精确内容与逆变换见 native-crash-merge-3oa1fC；SHA 88846adc3e55bd1e12928aac6af184aaa77f12bac96666d01828eaa7fd7ae588。 |
| player-native/src/crash_tests.rs | ADDED；本地崩溃报告协议、权限、配额、文件锁与真实宿主能力的独立切片。精确内容与逆变换见 native-crash-merge-3oa1fC；SHA 12e02d29a8f0fd00b8ad32999fd564283fb91e3709ea372f73e7bc2e269c1117。 |
| player-native/src/crash.rs | ADDED；本地崩溃报告协议、权限、配额、文件锁与真实宿主能力的独立切片。精确内容与逆变换见 native-crash-merge-3oa1fC；SHA 738bccefc72272e1a269f5568050453a1877c0532cd2319d2dcdb0c478330112。 |
| player-native/src/lib.rs | MODIFIED；本地崩溃报告协议、权限、配额、文件锁与真实宿主能力的独立切片。精确内容与逆变换见 native-crash-merge-3oa1fC；SHA c127edeb887d176cab9bfe9045bdf3c2373c89e4a2ab4b974cb6b99d77b475d8。 |
| src/platform/nativePlayerFaultReporter.ts | ADDED；本地崩溃报告协议、权限、配额、文件锁与真实宿主能力的独立切片。精确内容与逆变换见 native-crash-merge-3oa1fC；SHA dccacfbf556387d7154429d4aea680a59beac1822f2fd4a33d7aa31cb76430a5。 |

已运行的证据与严格范围：

- 帧反馈封存46/46：原30 Ready断言字节不变，另16真实ordinaryWASM/Core/InputManager/唯一RAF及WebGL2类credit/fence受控测试。全Vue/Node类型与独立production图通过；最终listener/RAF/timer0。此受控CPU证据不代替GPU时间、真实输入到显示或正式性能。
- 取消切片19/19 actualSession/PAK/World/Core/真实小WASM插件/Compatibility或headless Ready通过，完整类型及248模块production图通过。真正浏览器codec可能不可抢占；HTMLImage无回调/timeout仅拒绝consumer但terminal可能永不结束，nativeclose等待风险是REQUIRED_FOLLOWUP，不标完成。
- 独立native32切片：32 Rust和32 helper测试，33 Windows诊断WebView检查通过；真实跨进程锁/只读verified game policy/固定AppData报告路径/配额/原始日志字节与原生成文件终态，Rust MSRV1.89与锁定1.92匹配，未升级依赖。它是诊断验证，真正生产小游戏native窗口仍在测试，原生产导出仍复制Editor.exe的CONFIRMED缺口未修。
- 目录切片53/53：原Loader11实际差分、3文件whole inverse、196纯生产图0forbidden。原11实体8资产PAK、ordinaryWASM/Rhai运行8帧，callbackBytes31636、error logs0，是CPU smoke。实际Admission两路径原失败保留；Root修原token后两条真实路径在r1xtV1 frozen source均PASS，8资产/627 reference bytes/5807 decoded source bytes。sourceRead8.0008ms、两binding0.0609/0.0439ms是单次功能样本，不能充当正式基准。
- 实际合并r1xtV1：689 src/config完整Vue/Node类型通过；748冻结源production build independent-player-df36ffd60cb8f12a5004，compiled253/emitted251，两个图禁项均0；对应manifest SHA88b22388338327fb7a628f78b66fca28f6e79e61a1fe4694ce5f01d664ef8818，已有匹配ordinaryWASM，非coldRust。
- 同一旧11/8项目实际硬件WebGL2 smoke两项PASS：1600×900/DPR1/uiScale1、NVIDIA GeForce RTX5060 Laptop ANGLE D3D11、contextLost false、原PAK SHA e6e765598078de5e32e26cab08d02aea58a74d0258fd2fe49372443ca1e9c246没改。真实STARTED、无error，原版本缺声明导致FAILED证据仍保留。已亲自查看同目录evidence实际启动与keyboard-focus两PNG，角色、场景、HUD坐标显示；新截图坐标变化可见，但原两个smoke断言仅认证Ready/硬件/focus，不冒称精确移动或跳跃已验收。headless硬件浏览器不认证foreground显示或nativeWebView；physicalDPI、GPU执行、真正显示延迟null。
- compiled边界actualVite反向5/5：旧emitted-only对照会放过compiled但被Rollup移除的Editor值，新gate实际拒绝它、真实锁定Vue及Node stub，type-onlyEditor值不进入runtime图。原unusedTS import被esbuild先擦除的fixture FAIL及缺少Pinia的解析FAIL均保留；改用实际compiled pure-call和现有Vue，未安装依赖、不修改production gate掩盖失败。Pinia实际集成NOT_TESTED（项目无该依赖），拒绝规则IMPLEMENTED。
- 最新完整原19Session组合在r1xtV1重跑12PASS/7FAIL，原assertions byte-identical，确认Root eager directory包络误拒绝合法static inline及已精确声明项目。已按上述两文件lazy修复IMPLEMENTED，原失败SHA015c0478c7dc7ac82e7c9e61015a3e7288cfbad275a8f2d5ec03b98fe4ddfcd3保留；新source原19、类型、production及硬件关联重测待结果，不继承r1xtV1 PASS。Opaque目录中的新派生inline资产尚无extra source provenance，必须后续真实接入，不能放宽认证或伪Ready。

每个合并/关联变更及本次证据索引：

- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/player-frame-feed-edit-5f5d3z/report.json，SHA 5ed39ae0181fb46bccbffc411c4174271b35ac519918390d5eb660b720d0f798。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/native-crash-merge-3oa1fC/report.json，SHA 4ec0185bd4133afb4784ce8772c6a41e9ee0a47579fe2728a65384c145670ead。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/native-crash-entry-edit-Jach5b/report.json，SHA 3a090146d8a9c5dafdd030042007488389daa5a22a764fb3b833267bd4439f36。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/player-media-cancel-merge-PjcMiT/report.json，SHA 1868aadf099cd776eedc7ec7bd5f349950a36df2a9353e427a424866d4ff8ebd。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/player-compiled-boundary-edit-Vt19Te/report.json，SHA ad2047a5c4643523aac0ea85483e17f54be38609b1d194c7e91fb3577ec571b9。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/catalog-coverage-merge-YYrL6y/report.json，SHA 9f607a54f9682b22c6a7a7731c80547720b8c35260821b2e947400f9b41f2162。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/player-catalog-consumer-edit-Vwqwm4/report.json，SHA 3cd486944f2e9c9242ff8915297de4cb7777faa57cdbaf184967e584daf2aa81。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/player-lazy-coverage-edit-v5l0Wb/report.json，SHA 0113a970f5cffbda03cc731a684e78daf6e8eb99b6845834cf320a0867f8031f。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/independent-entry-types-ctAn1J/report.json，SHA f3f4896b17f2cf26fcb402ce23636cbe8d43d24894f2f4881e3681ce3c838a92。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/independent-player-build-r1xtV1/report.json，SHA 3bdc740b91c14c8aee3c9b26e20a77a6601e311d95af7683b9e33577561d7ff4。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/admission-consumer-vgRCWy/report.json，SHA 0634e9a2b256274a934a0a6fe81bdf3355a8e7c0e41fc3cf7fdb9f5c1d3a36c6。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/independent-player-hardware-ILsjxY/report.json，SHA c3afb526c89d224feecf0d9bd52f64dc53b9aa7b263ceb7f314649d1ec701807。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/player-boundary-negative-DiIHgy/report.json，SHA bdee52e546cb75aa441e0f3e73e6e921c3d3e4ed2d5e15bc28adc91630163e41。

30/64关联表：已处理本切片真实source/proof、同Owner/signal/clock/epoch、两Admission值复制、Media取消consumer、原Renderer frame finally/真实输入消费、Native固定权限/本地报告、编译与emitted双依赖图；原测试、失败与源都保留。尚未完成：Editor实际异步plugin准备与独立PlayWorld、headless反馈最新组合、decoder真实终态与close、派生inline目录证明、stream/audio其它未闭合类型、生产Exporter/templates/standard+portable正式WebView、原生全局配额。M2 Rust唯一权威、M3 worker-engine/worker-simulation实际路径、WebGPU严格像素门槛、全部舒适UI真实动效/拖拽/IME/Reduced Motion、B0–B8/X01–X15正式采样、QualityLocked与AdaptiveExperience分别结果仍必需。Linux/H2保持NOT_TESTED。11发行文件未生成；不能以编译或单个小游戏称整轮完成。


### 2026-10-11 16:16 UTC 最新 Player 组合与真实原生验证的范围更新

整体约75%为工作量估算，非验收通过率。继续未完成 M0–M8/X0–X6，不宣称已发行。

- 本次唯一新增生产代码编辑为隔离候选 src/playerRuntime.ts：6aae387aa14349a3d8e426ffaae2bd459b24419c7496ef81b500171ab32aa1d4 → f3d3ddbeee1deb51b8495f6e32e78eb679dd0bfa2c7c419042cac9a344898a9e，10处完整逆变换、711封存源检查；Root原Session f490 / Ready bbd134 / Entry a993保持。接原唯一headless timer、实际同epoch输入消费、计量准备/派发/observer成本；无observer额外clock读取0。退出释放观测引用，原Server hidden/fixed-step语义保持。GPU、显示、RAF、提交和input-to-submit均null，控制11+5=16ms仅为计量逻辑验证。
- 最新组合 frozen production independent-player-b42f7a8a3761123b8c68（raa96z）：748源；实际Player production图251模块/禁项0，manifest SHA c28e366decaa4e7c69a072f23e464eeca92c24f77a4b7b9da1189049e53782de。689 src/config完整Vue/Node类型、32native源保护通过；已有匹配ordinaryWASM，仍非coldRust。
- 同一最新源原45/46/19断言分别PASS，原业务断言字节保留，两个计量套件终态listener/RAF/timer0。19项中的无WebGL2负例按原受控兼容测试运行，不能声称production静默Canvas fallback。q9原lazy修复的19/19也已有真实PASS：此前r1xt eager 12/7失败保留，不能删除该回归证据。
- 新的封存工具只增加实际配置和native独立来源记录、显式保护文件排除；原47闭合历史集合和严格逆变换规则不放宽。原365项驱动仅更新冻结来源关联，13个业务回调和总365断言保持。它们尚待最新最终候选实际运行，准备工具存在不算通过。
- 原生agent已发现默认sandbox看不到授权环境的真实PID，旧ESRCH退出结论撤回；同环境重新测自己的进程，r1xt标准真实Ready/硬件WebGL2/ordinaryWASM/权限/uncaught本地报告/失败界面Close退出15/15，portable真实Ready/同PAK footer/权限/Runtime quit退出12/12。精确截图、全日志和handoff仍待Root合并审查，不把这条agent消息当最终完整验收。移动/跳跃和音频只对应此前明确局部PASS，后续额外trusted按键导致的失败均保留；未过滤用户输入或改场景取PASS。q9新matching native二进制已构建，后续真实运行仍在执行。
- 无回调媒体链是CONFIRMED：HTMLImage/FontFace消费者cancel/timeout不能证明底层codec结束，真实lease仍active。默认stop等待真实terminal合理，但当前native Shell close也因此可能永远等待。正在独立六文件实现只允许调用方player窗口销毁自己的宿主命令及显式policy；尚未合并，不假lease释放或假cleanup已完成。宽泛allow-destroy权限不引入。
- docs/RUNTIME_STAGE.md 本次仅追加此段及原始证据链接，旧文本/失败/门槛不改。下一个版本仍26.37，完整11发行文件尚未生成；Linux/H2、正式QualityLocked/AdaptiveExperience性能、剩余Rust权威世界/Worker/WebGPU像素门槛和全UI动效回归未通过或NOT_TESTED。

原始证据：
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/player-headless-feedback-merge-SCLQHf/report.json，SHA 185e52c49d4e63027e8f53fef5c00e40b6435fc27730a39ac0607394915d483d。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/independent-player-build-raa96z/report.json，SHA 749132411708abf87fa3373d6b8df6fb3e38cf554f040e76a06148e989aa0ef6。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/independent-entry-types-HKoCnW/report.json，SHA 0bda2ea5c5ccae29ac5ffcfa03c07c945a45ac1a35afeb8651ab1768f6ca8c04。
- .cache/engine-overhaul/root-headless-session-combination-4UHS3S/preparation.json，SHA c7aa11aa572cf6b5f12f473bf92c410bf9ff0c18889b8ad351f9419fe4d8df80。
- .cache/engine-overhaul/root-headless-session-combination-4UHS3S/functional-CuokxX/report.json，SHA de4d80eb7a6ddacb7a4198237f843f8f53421f0f3a3e291803e040e9d04adb09。
- .cache/engine-overhaul/root-headless-session-combination-4UHS3S/functional-EkokLW/report.json，SHA 750c3e9561e5faddb3ac40deec5363419126a38eaa53530c43daaa6167873b3b。
- .cache/engine-overhaul/root-session-catalog-combination-JnTa5Q/functional-FVejo2/report.json，SHA 7540ec9ecdd02631d4865842cc63991da338d490f4e94a99c67fad8c38841d88。


### 2026-10-12 16:27 CEST 恢复执行与最新实际组合证据

整体约76%是工作量估算，不是验收率。中断期间的elapsed包含宿主暂停/休眠，不用于解释构建或游戏性能。formal700/native6、主指令和旧sealed保持；未读取或打包保护文件。下一个版本仍26.37，发行11文件尚未生成。

本次已集成的Editor准备切片逐文件如下。所有逐处offset/from/to、完整逆变换及对应后果在 editor-plugin-start-VxR7s1/edits.json 与封存账本；这些字段的准备、错误、取消行为真实接入现有入口。

| 文件 | 原sealed操作数 | 修改与影响 |
|---|---:|---|
| src/runtime/GameplayRuntime.ts | 5 | 复用同一Core/World插件准备，暂停恢复不重新初始化；Stop和Restart转向最新请求，保留debugRestart公开void签名。 |
| src/store/physics.ts | 6 | Stop、清场景和reset在修改当前世界前取消准备；保留原draft结算及原同步开始/单步提交。 |
| src/projects/projectSession.ts | 3 | 项目元信息或hydrate前退休旧准备，包括同ID替换；坏JSON不使旧请求继续启动。 |
| src/components/ActionBar.vue | 7 | 真实Play/单步/重启处理器await共享准备；原按钮工作流不绕过插件准备。 |
| src/components/CommandPalette.vue | 4 | 真实命令入口使用同一共享启动路径。 |
| src/components/ProfilerPanel.vue | 4 | 真实Profiler运行入口使用同一启动路径，运行状态不由过期ACK覆盖。 |
| src/editor/animationPreviewSession.ts | 12 | 预览Owner使用共享准备及原生命周期，取消时不污染新会话。 |
| src/runtime/testRunner.ts | 31 | 已知fixture同步修改后才更新本运行generation；supersede取消一次并停止后续fixture，finally不覆盖用户新Play。 |
| src/editor/editorPlayPreparation.ts | 6 | 唯一Editor准备Owner绑定World/projectGeneration/Core session identity/signal，draft与插件错误保留。 |
| src/editor/editorPlayPreparationBoundary.ts | 0 | 纯边界提供取消安装点，避免Runtime/Player反向依赖Editor。 |

另一个确认缺陷是取消通知回调抛错后，错误报告器再次抛错会阻止最新Play。Root仅在 editorPlayPreparation.ts 中隔离这两个诊断异常；旧真实draft/plugin/commit错误没有吞掉。相同两项测试先0/2失败、后2/2通过。原Editor15+21项断言在最新source750/native33组合均通过；这不宣称已实现独立Editor PlayWorld，authoring/runtime分离仍为必需工作。

关闭窗口切片精确集成6文件、18处：playerRuntime.ts 12处加入显式可选自宿主策略、真实cleanup/request两种终态、重入共享attempt、失败可明确重试、迟到清理不覆盖失败及adopted Owner首次await前停Core/input；webPlayerEntryHost.ts 1处仅native注入无参数命令；player-native/src/lib.rs 2处只销毁Tauri注入且label严格为player的自身窗口及注册命令；build.rs 1处注册权限；capabilities/player.json 1处仅增加专用allow；新增flat权限文件1处。默认普通Web仍await cleanup再close。没有增加任意label/path参数或宽泛allow-destroy，没有假codec取消/租约归零。逐处详情及第30/64节关联状态见 player-self-host-close-C7an61/EDIT_LEDGER.md。

最新组合实际验证：57/57关闭/Headless、原46/46viewport/input、Editor15/15+21/21；关闭与帧套件末态listener/RAF/timer均0。21项中坏JSON输出是原预期负例，不是吞掉的失败。这些是实际模块+ordinaryWASM+controlled DOM，不是亲眼GUI或性能资格。691源码/配置的完整类型与33native输入保护通过。独立Player生产build independent-player-f551dd09eafcf61d76e9，source750，实际编译图251模块、禁项0；manifest SHA2d06b4abe29dbe3fcb8d80a03b1edc8f445aee220745d3a1f96b85ae67ae2a49。WASM为已有匹配字节，未称cold Rust。

源码关联回归：390严格当前字节/完整逆变换/缺失/变异/历史身份检查通过，原40/101/18项通过。旧120≠76计数失败和scene17/18失败保留；修正只让有限闭合集合计数跟随实际fixture，同时分别检查当前new6完整字节及原始canonical完整字节。新的原365运行发现M1 setup只给部分历史源码、其他linked输入仍读当前源码；已在新冻结副本修正为同一完整已验证阶段，原34业务断言不改，仍在执行，不能宣布365全通过。旧74/365报告明确失败且保留。

先前q9真实Windows native证据经Root50项引用摘要检查通过，Root已查看原生Ready、实际跳跃及失败Close三个截图；该scope为q9旧frontend/native32，而非最新6oy/native33。q9原standard23/23、portable20/20：自研WebGL2，ANGLE NVIDIA RTX5060 Laptop/D3D11，WebView2 Edg143.0.3650.96，single-thread-compat，CSS1280×720/DPR1.5/backing1920×1080，ordinary匹配WASM。原真实脚本D/A和Space、HUD坐标、WebAudio decode/start、独立FontFace解码、最小权限拒绝、本地uncaught报告与退出均有该scope证据；不声称实际扬声器输出、Nunito被选用、显示延迟或H1性能。

CLI会将Cargo.toml从614B/SHA48cde6f1…格式化为628B/SHA41556d9d…；原preCLI32与实际compiled32不是逐字相同。仅已封存6处精确格式逆变换、31其他文件相同、locked metadata相等的证明建立关联，不接受任意漂移。新selfhost及Exporter生产native33构建与真实资格仍进行中；窗口请求ACK不代表Destroyed，挂起codec的消费者结束不代表cleanup完成。新原生输入测试捕获到驱动注入前额外trusted按键，原失败保留，来源unknown，不过滤为PASS。

下一片M2只读测量已确认：512脏body每次512次调用/229376B；完全clean仍约4.35ms准备比较（CPU smoke，非正式基准）。独立缓存开始NPCB批量预验证/epoch/revision/有界句柄墓碑及真实World差分；准备+编码+glue复制+执行+ACK/cache合并必须全部计入。无净收益不默认启用。不是新NVFP renderer ABI、Rust arena、Rhai调度或Worker完成的替代证据。

尚未完成：独立Editor PlayWorld、Exporter生产模板真实接线及匹配产物、Rust完整权威世界/脚本和批量ABI、实际worker-engine/worker-simulation回退、WebGPU像素门槛、资源流式读取/设备恢复与统一原生额度、完整Comfortable GUI/动效验证、正式B0–B8/X01–X15/QualityLocked与AdaptiveExperience独立数据、完整Windows发行。Linux/H2缺环境仍NOT_TESTED，未被豁免；未知GPU/功耗/真正显示时延保持null。

本次原始证据：
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/editor-preparation-merge-3ud41x/report.json，SHA 55781d5ed097a367253229ce335b907dae9e41d5931dd4d5122f28f2216936f8。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/editor-cancellation-report-test-fiBrsv/report.json，SHA 85669ca3ac046df4f4cfe367d088b7e813db55b12cfdffa95e289ec7569060ae。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/editor-cancellation-report-repair-4vHZb0/report.json，SHA d35c24a9ebf95f0b996fd53945f39be8d66894e1c7cec53b65d1f24724f595fc。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/editor-cancellation-report-test-2ctxHF/report.json，SHA 92282c565bf723f82d4495d3075506463ca547b55adaceb26de1801376fdc9d9。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/player-self-host-close-merge-ZWceNt/report.json，SHA 71fd4e608f467fe7bfaec007380fee82a72dd2347f9070ae33e952ea07a3655e。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/independent-player-build-6oyX3g/report.json，SHA 7da460aeb6735e20cfc759fd152095f6b50c9fef73bf4a670d2ffef5f4849e93。
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/independent-entry-types-JlScc7/report.json，SHA cab32c1eaa74c5e9b295117a65670f0ab683799497b3e21c001314025bdd63af。
- .cache/engine-overhaul/root-integration-next/player-adoption-sealed-982rZl/specific-NAX29A/report.json，SHA 42dce2239a35e1866da9dc5610c81ac2261972253e87eafdef690ef5cf7e55c9。
- .cache/engine-overhaul/root-integration-next/native-sealed-review-rm86DJ/report.json，SHA c808394459ec76ff98d729cb0cc319fedb63d96cd41d5ed7317304d46aa4486b。
- .cache/engine-overhaul/root-live-combination-1BCrSu/combination.json，SHA fda57c9f756bf24aac2d17c914c3f326e3fedc214e5e9531f069cddb9e07badc。
- .cache/engine-overhaul/player-self-host-close-C7an61/handoff.json，SHA ad2843c5179636bdc735f25ee3d99600689eaecbfd7f56dc023222bbb2c5c80d。
- .cache/engine-overhaul/editor-plugin-start-VxR7s1/handoff-kj9iY4/handoff.json，SHA b2fe87e34d097c6f541aad6c04e2f2219f16611d41a66f0bdfa307331ce30dd0。
- .cache/engine-overhaul/root-live-combination-1BCrSu/functional-zxcxim/report.json，SHA 837b914090a93ebc7d8e720a090d97b68dfb7340dc05beb144110ccf360c475d。
- .cache/engine-overhaul/root-live-combination-1BCrSu/functional-HO9hFq/report.json，SHA dae4e73bf87cb3390757326ac506aff08a500629a09c96768900493e19d96e77。
- .cache/engine-overhaul/root-live-combination-1BCrSu/functional-eQNwzR/report.json，SHA 7b1c305d3622710b48f9eb3444c8a97ee13d446cf2ee068e564bdb8d41175659。
- .cache/engine-overhaul/root-live-combination-1BCrSu/functional-ox7ZiP/report.json，SHA 6361e15c68761d6aee0b397ee76d52ae7bb586f79f12aff400ecc8dc74d6e353。


### 2026-10-12 17:44 CEST 独立公共库、原始契约与物理输入批处理切片

整体约77%是工作量估算，不能作为验收百分比。HEAD仍82c9c03118848df1c07af323c38a3abade7dd21b；本段实现只进入隔离集成候选，正式700源文件/6原生输入、旧发行和主指令均保持原字节。最新组合为762个源输入+33个独立Player原生输入。下一个版本仍26.37，发行11文件尚未生成。

原750/33组合的365个原始源码契约已按各自真实结果格式核验：12组331例保留原始exit0/raw/log SHA，M1修正测试setup的完整linked sourceMap后34例通过。前后生产750源与native33逐字相同；原FAILED_ORIGINAL365及首轮汇总器格式判断失败保留。新汇总 status=VERIFIED_STATIC_SOURCE_CONTRACTS_ONLY，不能称完整M1、GUI、Rust世界权威或性能达标；此365结果不继承到新的762组合。

#### 本次公共库10文件的实际变化及后果

| 文件 | 改动和影响 |
|---|---|
| package.json | Adds the real build:runtime and verify:boundaries commands and public Runtime/Renderer exports to a matched generated output directory. Other scripts/dependencies unchanged. |
| src/runtime/runtimeSaveOwner.ts | Exports the same formerly local MigratedSave interface for public declaration emission; emitted JavaScript byte-identical. |
| src/runtime/worldStreamingOwner.ts | Exports the same formerly local StreamedEntityState interface; emitted JavaScript byte-identical. |
| src/runtime/index.ts | Exposes existing pure Runtime/world APIs and types; no Editor singleton or UI dependency. |
| src/runtime/initializeRuntimeWasm.ts | Delegates initialization to matching generated glue and returns void; keeps generated low-level exports out of public declarations. |
| tsconfig.runtime.json | Independent ES2022 public declarations, matching existing Array.at use; no page scaling, UI or runtime behavior changes. |
| scripts/lib/independentBoundary.mjs | Shared source/type and actual compiled/emitted production gate; rejects Editor/Vue/Pinia/Node, unknown dynamic imports and local root escapes; case-insensitive path matching. |
| scripts/verify-independent-boundaries.mjs | Executable source/type import gate and hashed evidence; source checks alone are not full architecture qualification. |
| scripts/build-independent-runtime.mjs | Builds Runtime/Renderer ESM, declarations, dependency evidence and installable package; publishes both as one owned output, preserving verified prior output and rejecting unknown/modified directories. |
| scripts/verify-independent-boundary-integration.mjs | Tests actual shared production plugin and source/type gate using positive and negative fixtures; no application-state replacement. |

两个返回接口从局部作用域提升到公开类型；锁定TS编译输出的JS逐字一致。初次公开WASM生成声明暴露Symbol.dispose导致ES2022严格consumer失败，保留原Bk9eOs失败；最终采用void初始化包装，未修改生成glue/d.ts或skipLibCheck。包产物与源码项目自身exports分别执行真实JS导入、strict公共声明检查、真实普通WASM单步与dispose；controlled browser-shaped Node Host，不冒充真实GUI。16个正/负例实际调用共享源码/type门禁和同一Vite生产插件，包含被擦除类型、无用Vue导入、Editor相对路径及大小写、Node、非字面量dynamic和越界本地源。Pinia只验证specifier门禁，不声称安装Pinia后的生产负例。Linux大小写路径未测。

公共库封存构建163编译模块/3chunk/189产物，全部编译与最终产物禁止模块为0；本次762+冷NPCB WASM新组合已重新构建为164模块/3chunk/190产物，公开包与源码自身入口的四个真实consumer命令exit0。新组合buildId=independent-runtime-9ea137ba472b816b4d69。此结果不证明Editor Play隔离、Worker、GUI渲染、真实输入或GPU速度。已验证旧生成包在第二次构建保留；未知/被改目录拒绝逻辑已实现，专门失败场景尚未运行。

#### NPCB/v1七个源码文件及冷配对产物

| 文件 | 实际改变与影响 |
|---|---|
| crates/nova_runtime/src/lib.rs | 同一RuntimeWorld新增批输入验证/提交，原physics数学和兼容函数体保持；不新增第二世界。 |
| crates/nova_runtime/src/physics_command_protocol.rs | 独立NPCB/v1格式、长度/版本/epoch/revision/handle校验；坏包先完整验证再写。 |
| crates/nova_wasm/src/lib.rs | 批命令能力与有界入口；普通WASM、非SAB路径可实际运行。 |
| src/world/World.ts | 暂存完整输入、一次native ACK后更新TS缓存，取消/失败不写缓存、不重放坏包；原兼容同步体保留为默认。 |
| src/runtime/physicsCommandProtocol.ts | 与Rust生成常量一致的二进制组包，先检查8MiB/8192command边界再复制。 |
| scripts/generate-physics-command-protocol.mjs | 实际从锁定Rust常量生成TS标记区，check不写。 |
| scripts/verify-physics-command-protocol.mjs | 实际共享常量/golden/bad输入检查，失败不可静默通过。 |

| 匹配产物文件 | 状态 |
|---|---|
| nova_core/pkg/.gitignore | 匹配组整体复制，内容字节未变 |
| nova_core/pkg/LICENSE.md | 匹配组整体复制，内容字节未变 |
| nova_core/pkg/nova_core.d.ts | 换成同一次冷构建配对/manifest；不复用旧glue |
| nova_core/pkg/nova_core.js | 换成同一次冷构建配对/manifest；不复用旧glue |
| nova_core/pkg/nova_core_bg.wasm | 换成同一次冷构建配对/manifest；不复用旧glue |
| nova_core/pkg/nova_core_bg.wasm.d.ts | 换成同一次冷构建配对/manifest；不复用旧glue |
| nova_core/pkg/package.json | 换成同一次冷构建配对/manifest；不复用旧glue |
| nova_core/pkg/physics-command-build-manifest.json | 换成同一次冷构建配对/manifest；不复用旧glue |

冷构建真实jobs1/locked/offline普通release WASM，15项Rust单元、17项实际World/原兼容路径差分与memory.grow等检查通过。WASM SHA=63f1cea2d53a5a2b4ef3288ae216a0e3e529c9c36b864e9060fa661c4d1a7982；匹配buildId=physics-batch-c3ffef21fcf2713181be000b。wasm-opt在原始日志实际执行；最初“env跳过优化”的错误元数据保留并用effective correction纠正，不能称未优化构建。

全成本CPU A/B为3独立重复×6warm-up×24交替样本，1296条raw；这不是主指令120s×5正式基准。512全dirty批处理/兼容median=7.2034/5.6325ms，2048=33.2297/26.9793ms，均更慢；native子段更快不算总收益。准备/几何/层级扫描为主要剩余成本，诊断分段有测量扰动，单独标注。没有线程数量增加，没有GPU提升、QualityLocked/AdaptiveExperience或H1/H2结论。默认仍compat，批输入必须显式启用与匹配能力，失败包不自动回放。新Rust实体身份arena是后续单独切片，不借此声称M2完成。

Root精确审查完整逆变换、源文件、冷构建配对与所有封存引用后合并25个授权目标；未改源漂移0。此时需要重新执行最新组合的Player/Editor生命周期及物理批处理回归，不能继承旧750/33验收。

#### 真实原生关联与未完成项

Editor实际AppHandle发现证明两个模板可安装，但Tauri锁定codegen解析/重写HTML造成首轮hash失败；固定raw.txt第二轮字节一致却被MIME magic判为HTML。两轮真实FAIL和旧EXE/dist均保留，正在以固定有界base64 ASCII transport修复，继续保持原HTML receipt SHA/输出名、CSP和权限、不删除非可执行MIME断言。这段不预报最终GUI通过。

matching750 Player继续保持独立证据归属。标题栏get_window_state单次宿主观察异常等待约3934s被中断，标题栏关闭尚未验证；该elapsed不能作为游戏或构建性能。Root和其他代理未注入键鼠。完整独立Editor PlayWorld/显式Apply Runtime Changes Undo、M2权威字段迁移、M3worker-engine/worker-sim/非隔离恢复、M6生产WebGPU及严格像素/字体/颜色、统一原生并发、资源分页、正式B/X基准、完整Comfortable真实动效和11发行仍待完成。Linux/H2只有本Windows机器，仍必需NOT_TESTED，不降级为可选。

本段证据索引（完整SHA由progress receipt绑定）：
- .cache/engine-overhaul/root-integration-next/original365-combined-BeztVB/report.json SHA256=4ce183632f6d0196b94079881ca4e413c9826eccd88153e8133440955351f7f4
- .cache/engine-overhaul/independent-runtime-library-fVyYAu/handoff-SR3Osb/handoff.json SHA256=a2d6a8a8da350b4395b7e1b32a74445d55db433ff4dea974a08aebb6333e769b
- .cache/engine-overhaul/physics-command-batch-SLJXjr/handoff-wPXaz1/handoff.json SHA256=44568793d7e7fa6f3c4c353c66d1927cbdf8d5119db1b091c30f006aa3e2ae5c
- .cache/engine-overhaul/physics-command-batch-SLJXjr/functional-pZVM2E/report.json SHA256=7a2009b2e83305f7311c1e45859cd5b359bf0c9ba378ab3d51d5e827e2ef6481
- .cache/engine-overhaul/physics-command-batch-SLJXjr/performance-edtkYO/report.json SHA256=48fd92c19ccc214c7df98bfb4b071a7ce1a12ebddebfe0326f88579937049a00
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/shared-runtime-physics-merge-WMF1N1/report.json SHA256=93482f40aeab9c60cdf19c0f82781bed972b779e3458fb958840511a76f7e787
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/candidate/.cache/engine-overhaul/runtime-library-build-65t4IF/report.json SHA256=85611a5c24f7dc106ee2d11b463e08aa52c7675263212ba05a172bb3ef857d77
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/candidate/.cache/engine-overhaul/public-runtime-consumer-7hyb1P/report.json SHA256=8b17930b28bb0db9789e40e4cffb99d4f4e0576113fad774bd0a3a930d8d2483


### 2026-10-12 18:27 CEST 实体身份、无DOM宿主与独立导出器的实际集成

整体约79%仍是工作量估算，不是验收百分比。HEAD仍82c9c03118848df1c07af323c38a3abade7dd21b。最新隔离集成候选770源输入+33独立Player原生输入+125旧模板产物；正式700源/6原生输入和旧release均无写入。26.37的11项正式发行尚未生成；不得在核心门槛未过时发布并称完成。

计数纠正：旧段的“140项生命周期/帧/准备”属于汇总算术错误，原始四组真实计数是57+46+15+21=139，未增加、删除或修改业务断言。随后139+NPCB17=156；新arena32、无DOM15和Exporter21加入后最新224项原断言通过。原762首次旧产物负例误读已更新Root pkg导致失败，保留iSh4SW原失败；仅将读取和校验路径绑定原WMF1N1/before下165830…旧WASM/glue后通过。765首轮准备遗漏第二个旧WASM校验路径，在业务测试之前失败；v1和修正v2均保存。合并arena首轮报告解析把Core的passed/failed格式误当tests/status，未写生产即失败；原工具保存，按真实schema修正，不更改引擎或业务断言。

#### 实体身份11源文件与完整8匹配产物

| 文件 | 实际变化与后果 |
|---|---|
| crates/nova_runtime/src/lib.rs | 同一个Rust RuntimeWorld新增实体身份arena；物理clear不清空身份；不宣称组件/Transform迁移。 |
| crates/nova_wasm/src/lib.rs | 六个有界身份控制入口；owned ACK，未借用跨tick内存；不改变物理数学。 |
| src/runtime/entityLifetimes.ts | 现Owner选择一次authority并缓存Rust ACK；热active/generation无逐实体RPC，dispose回收租约。 |
| src/world/World.ts | 从现有native World提供身份租约；physics clear不结束身份，释放后拒绝迟到调用。 |
| src/runtime/runtimeWorldHost.ts | Host持有并释放身份Owner，构造与诊断异常回收，不生成第二个世界。 |
| src/runtime/GameplayRuntimeCore.ts | 原begin逐实体循环改一次beginMany；其余脚本/固定步行为保持。 |
| src/runtime/runtimePrefabInstantiator.ts | 沿原生成顺序批登记Prefab身份，保持回调与generation顺序。 |
| src/runtime/dynamicObjectsOwner.ts | 动态句柄通过实际Rust UUID/index/generation校验，拒绝重用/错UUID/过期pending。 |
| crates/nova_runtime/src/entity_arena.rs | 有界slot/freelist、UUID+index+generation+arenaEpoch、完整坏批验证、旧代际拒绝和不回绕；OOM回滚未承诺。 |
| src/runtime/runtimeEntityAuthority.ts | 唯一空Owner选择、能力/容量检查、批身份输入与ACK校验；旧WASM/预WASMEditor明确compat。 |
| scripts/generate-entity-arena-contract.mjs | 从Rust生成八个TS契约常量，check及损坏/漂移失败不吞掉。 |

| 冷匹配产物 | SHA256 |
|---|---|
| nova_core/pkg/.gitignore | 684888c0ebb17f374298b65ee2807526c066094c701bcc7ebbe1c1095f494fc1 |
| nova_core/pkg/LICENSE.md | a8143108bf7fe3ff1eb92fa846dd3d300659e2a697c9b11c0a5cc195d1c1f0ac |
| nova_core/pkg/nova_core.d.ts | 0203cb75b99ad49234852066611abaaeb7a61c1c0c9840070e59f827eae9ac88 |
| nova_core/pkg/nova_core.js | 755207c260dec090e5f9686d9c63edf71bb7069e79335aeeea80acdc2447b414 |
| nova_core/pkg/nova_core_bg.wasm | e7c0e6494263f50314167a1279124eda115db003eed1d812ccf87820b2f86f9d |
| nova_core/pkg/nova_core_bg.wasm.d.ts | 852506abd255044ac6d7e70101d69b10711af1c4c1657edc3caeb681f925c1c4 |
| nova_core/pkg/package.json | 69cfd3aa1ed027c25fa6241a775c80b27923ec7809d9379aba7fa0272d829911 |
| nova_core/pkg/physics-command-build-manifest.json | 3b5ca8254ecf5e421ff58a3e014ea2b04417d6a0ff4d80d46179fde3012902ca |

配对buildId=entity-arena-45a784bb39fa82f2078ff433，普通非SIMD/非threaded WASM；真实locked/offline/jobs1冷Rust release且日志观察到wasm-opt。原physics-command-build-manifest.json同路径更新为联合配对证据，绝不删掉或混用旧NPCB glue。21项Rust、14项World/stream/pool/dynamic、18项Core/plugin/Host及6生成器负例在封存源通过；Root765组合另重测32项、原156项和公开运行库。Root审查八个MOD完整精确逆变换、三NEW与完整匹配产物后合19目标，未改源漂移0。

身份准备/编码/复制/执行/ACK合并/释放CPU smoke全成本更慢：4096 begin约0.2718→2.1906ms，单项8 churn约0.0235→0.907ms，8热读约0.6523→1.2737ms，定向Rust校验约0.0983→0.7279ms。相同模块/World/场景初始化不计入该身份控制计时，不能称完整启动性能；保留raw、3重复×6warm×24交替样本。此为正确性迁移成本，无并行或GPU提升、不算正式QualityLocked/AdaptiveExperience。保留已批准的ready+匹配能力+容量的一次原生身份选择，不靠关闭校验制造收益。M2完整组件/Transform的Rust权威仍未完成。

#### World.ts单文件显式WASM宿主初始化的六处修改

| 逐项 | 改动与影响 |
|---|---|
| 1 | Optional explicit initializer port in existing WorldHostServices; no new contract or dependency |
| 2 | Only explicitly supplied nonfunction initialization rejected; defaults unchanged |
| 3 | Initialize callback bound to original host, snapshotted once with resource services |
| 4 | Explicit host selects WASM in no-DOM or Node; omission retains original quiet skip condition |
| 5 | Injected initializer deferred to promise for sync exception capture; skip host call after disposal; original browser init() call and native creation/version/ready body unchanged |
| 6 | Disposed explicit World ignores late failed initialization; legacy browser catch unchanged |

WorldHostServices.initializeWasm?():Promise<void>初始化同一glue；不注入另一个nativeWorld。原浏览器init与Node无DOM默认compat保留；明确宿主失败归入wasmError，不假Ready；dispose后的成功/失败不重新分配。实际无DOM普通WASM15项、严格Vue/Node类型、253reachable/255compiled生产禁依赖0通过。初始化fetch/compile取消仍由平台Owner负责；永不settle的外部Promise不在本接口中伪造终态。该修改不是完整worker-engine/worker-simulation。

#### 独立导出器8文件与125模板资源

| 文件 | 实际变化与后果 |
|---|---|
| src-tauri/src/lib.rs | lib.rs: Editor-only guarded readonly discovery and unique setup resource root; native export resolves authenticated independent template, digest-checks staged copy, preserves standard/modern48/legacy16 and previous successful output. |
| src-tauri/tauri.conf.json | tauri.conf.json: fixed player-templates resource map only; original Editor security/CSP unchanged. |
| src/runtime/exportTemplates.ts | exportTemplates.ts: actual receipt/files/native discovery, coalesced pending requests, strict bounded canonical ASCII base64 HTML transport verified against original signed source SHA; alias never enters runtime output. |
| src/runtime/exportTemplateValues.ts | exportTemplateValues.ts: pure format1/IDs/custom metadata retained, strict actual receipt compatibility validation; metadata alone cannot make template installed. |
| src/runtime/gameExporter.ts | gameExporter.ts: collect actual independent Web reachable artifacts instead of Editor multi-entry fallback, verified installation gate, preserve browser picker user activation before async fetch. |
| src-tauri/src/independent_player_templates.rs | independent_player_templates.rs: bounded receipt and artifact resolver, compiled raw receipt anchors, exact build/graph/WASM/glue/native identity, target CPU/header validation and negative/integration tests. |
| src-tauri/src/generated/independent_player_template_registry.rs | generated registry: finite matching Windows/Web receipt digests from local frozen producer; no arbitrary game or metadata path lookup. |
| scripts/prepare-independent-player-templates.mjs | prepare script: pinned matching frozen source/native33 producer, exact CLI transformation proof, fixed tuple receipt/registry generation, verified deployment to explicit independent new Editor build dist only. |

125资源逐项bytes/SHA登记在Exporter handoff及Root merge.templateArtifacts中，保留标准独立exe、Web所有120文件、收据/manifest/graph原始配对。旧模板明确front750/native33、WASM165830…，不能称最新arena/770源资格。发行前必须从最后整合源重新生产、部署并构建匹配Player/Editor；不得直接把这些旧模板作为26.37最终运行核。

封存验证：Rust27、CPU21、实际Editor AppHandle/生产模板验证/安装状态11、Editor实际导出standard8与portable8、实际native Web writer及121文件HTTP5通过。原Editor HTML parse/serialize失败和.txt被MIME sniff为HTML的第二失败保留；最终有界ASCII Base64 text/plain传输解码后仍逐字校验原482-byte HTML收据，不改CSP、权限、实际Player输出文件名或像素容差。GUI原始生产截图Root已查看启动页，其字号/圆角只是该旧封存源的静态局部证据，不证明全部面板/动效或最新源。模板CPU回归使用真实编译模块和已部署字节，未调用的Editor imports/native Response受控；不是完整GUI buildGame/Web Ready。

Root合World1+Exporter8及125资源时，报告首次把清单估为768，实际770：原先源清单外的既有Editor lib.rs/tauri.conf.json现新增登记，另三ADD。全部9源码和125资源已复制、原前像已保存后才遇到计数断言；count-observation及原工具保留。恢复仅核对全部当前after、backup和未改字节再生成报告，没有重复写源码，也没有放宽业务测试。

最新770组合224项通过；strict Vue/Node types、独立Player Vite与public Runtime实际生产构建通过，禁依赖数组均0。这是CPU/生产图验证，未运行最新Editor/Player原生GUI。此前365静态源码契约仍只绑定原750源，尚未迁移关联到770；不得自动继承。所有构建wall时间只是构建时间，不能当FPS或游戏性能。

#### 真实Worker能力及M6严格失败

CUA在M3代理环境无浏览器只记NOT_TESTED；随后M6代理在自己的唯一有限Edge实例完成真实无GPUModule Worker探测：无DOM、普通WASM单刚体step1、64B Transferable双向detach、native free1协作ACK通过；页面非isolated，不需SAB。CPU probe wall约116.6ms，不是性能基准。它证明能力，不证明正式Worker输入/音频/Ready/Renderer路径；真实Core input.start依赖window/document、Audio需Main AudioHost语义桥，不能用假window/no-op替代。生产FrameHeaderV1/SpriteInstanceV1目前NOT_PRESENT，私有GPU64实例不可冒充公共帧协议。

本次真实Edge147.0.3912.72、DPR1、非fallback nvidia blackwell严格图像5项4通过1失败：唯一pixel(33,55) GL(102,67,13,255)/WG(103,66,13,255)，两通道max1；GL/WG CPU上传相等不能证明纹理插值/最终颜色等价。原GL、旧抽取字体与当前字体A/A在无写调用下均出现6通道203→202，跨实现同次0差；原170652失败仍保留，不把A/A诊断当修复。WebGPU未接完整RequiredUpload/WorldText/Ready，自动优选尚不允许；有限fma数学诊断继续，未降低容差或画质。

750/native33匹配原生57项封存保留：原标准/便携27、直接自托管6、两15s真实consumer-timeout分支close/quit各8、单IPC拒绝与明确retry8。七个自有OS进程实际Exit0；只相同750配对源，不继承至770。原Titlebar观察调用3934.8s工具超时的失败及清理保留；没有发送titlebar click，不记close验证、不作为帧性能数据。

Editor独立Play六文件仍在单独候选：严格Ready、一次内存PAK捕获、独立World/Core、真实Renderer退休token与快速取消；尚未Root合并/GUI验证，Apply Runtime Changes的可撤销事务仍必需。接下来继续真实Worker生产接线、M6、UI完整动态回归、匹配冷构建/版本化资源与正式B0–B8/X01–X15。QualityLocked/AdaptiveExperience结果未达门槛；H1正式采样与H2/Linux仍NOT_TESTED。未知GPU时间、显示延迟和功耗保持null/unavailable。Comfortable16px/44控件/留白/圆角与既有motion源本切片未改变，仍需全界面动态证据；不因性能关断反馈。

证据索引（保留原失败与成功，各绑定自己的源）：

- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/entity-arena-merge-hv4JMI/report.json SHA256 1e8463b92206e03cb4c6ac7a50995a76b73ba0b8f9e067efa0fcbcdaa781193c
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/world-exporter-merge-kukzAM/report.json SHA256 8d704f2ea60104d63eea8585fd21731edb6de2b630fa79b1dc44d0193e94ef9b
- .cache/engine-overhaul/root-762-combination-RvMVbw/report.json SHA256 480f93ddbcb56426775b15d8a0c5fabce8bb49062efc029e06f1e553e56713fd
- .cache/engine-overhaul/root-762-combination-iSh4SW/report.json SHA256 9a19fb4dc0d100f775e609c38dbf50205b0bc9a9a7ff175dfd796ec567f6e25c
- .cache/engine-overhaul/root-765-combination-rCxclL/report.json SHA256 3c99838fb5299221abe8094a07f90c3e805721aa81b858d4ece65d2ea3b038cd
- .cache/engine-overhaul/root-765-entity-tests-NEZKv7/report.json SHA256 be4061fd11f6807cf086ae30c5e0ed029a257e10a38ee8b2f8667adbbe2aec25
- .cache/engine-overhaul/root-770-combination-vvkixo/report.json SHA256 30aa5cf2c53f27a67ab4a4b9d4f51304bb966b77836daa6fa6c3adad31a8fdc9
- .cache/engine-overhaul/root-770-build-check-ZGO77g/report.json SHA256 83ae16e17222fe75a8ad0cfa1da65fd2f229462620e9016ef2a4feca855536d2
- .cache/engine-overhaul/runtime-entity-arena-QzDJML/handoff-XMGiiv/handoff.json SHA256 049f88d4a3d26d8e0c6f19025fe8ef2c5593fa94f7cc0aa1409e209dcd2bd31a
- .cache/engine-overhaul/runtime-entity-arena-QzDJML/performance-ebuHvb/report.json SHA256 2af9a193e7dd03f2431674ef8c240c4a89bc8ce44c59ecbbbf8a72050928862e
- .cache/engine-overhaul/world-wasm-host-4HBPa2/handoff-YJczqu/handoff.json SHA256 6c85dfbcb4e816fdb619698ef354d823078c6d51f09e47b930f51ef88820aeaa
- .cache/engine-overhaul/independent-template-exporter-45b83a0d68/sealed-exporter8-b9aab854-3/handoff.json SHA256 b35307934fd6b3a04fd168d36cd533f996e86ed92154d19cf6c439cf0b85a9b1
- .cache/engine-overhaul/native-player-production-selfhost750-Yk8p2M/handoff.json SHA256 600ee0f9d9f73571918d6b63f1bf7cdf0954e37dc86d354c0061f500c4747290
- .cache/engine-overhaul/webgpu-production-adoption-5c328c6c/gpu-image-cKYbh2/geometry-report.json SHA256 705687648fc154cfa09bbbdfe8a25453b4ccd1f1f48c24b590f06c08048c0501
- .cache/engine-overhaul/webgpu-production-adoption-5c328c6c/gpu-image-cKYbh2/font-report.json SHA256 764b688c356a0b46adc89f2f776f05795595ed5fe6feef63926033e69b13fafa
- .cache/engine-overhaul/webgpu-production-adoption-5c328c6c/m3-browser-capability-bL3LCE/report.json SHA256 ffb07b65dd6ed2dc312a86bdbd19ddb1f7f0b22c7e49ed2634d2c9307dbc6fdd


### 2026-10-12 19:37 CEST 独立Play、输入、PAKv2身份与公共帧契约的精确集成

整体约80%为工作量估算，不能作为验收分数。HEAD仍82c9c03118848df1c07af323c38a3abade7dd21b；正式源700/原生6和既有未提交修改受保护。当前隔离候选781源+33独立Player原生输入+125明确旧模板产物，26.37的11项发行未生成。全部完成后再生成下一版本，不以阶段构建替代发行。

#### 本次逐文件编辑与后果

| Play6文件 | 实际变化 |
|---|---|
| src/editor/editorPlayWorldOwner.ts | NEW独立Play生命周期、Ready前阻止tick、快速取消/过期拒绝、Canvas退休ACK后dispose；单帧时钟保持原Canvas。 |
| src/editor/editorPlayWorldAdapter.ts | NEW实际内存PAK+Session/Host/Core/World，分离Authoring，真实renderer桥和成本项；无第二编辑世界权威。 |
| src/runtime/GameplayRuntime.ts | MOD缓存函数调用动态指向最新Core，实际preparing/phase桥；Stopped不推进Authoring。 |
| src/store/physics.ts | MOD默认Play创建独立世界；idle/preparing帧不再推进Authoring preview。Undo编辑文档不被运行tick污染。 |
| src/layout/EditorLayout.vue | MOD保持原Canvas挂载，注入当前独立Runtime binding；场景/脚本/设计工作区切换不重建Shell/世界。 |
| src/components/WorldCanvas.vue | MOD同Canvas切换运行视图和资源，严格Ready+退休token；独立Runtime纯相机补原Camera坐标方法、null局部平滑目标，live scale/offset。原Authoring相机与精确输入不变。 |

Play6 Owner27/179断言、实际普通WASM+PAK/Session/Ready6/58断言、真实Camera helper7/35断言通过。实际原项目GUI6观察：11entities/8assets、1600×900、DPR1、uiScale1、Edge147+ANGLE RTX5060Laptop/WebGL2；唯一Canvas、Play/Pause/Step、Script/Design切换和Stop不污染文档，full.nova前后SHA961d8c…e8a2相等。普通输入16px/line24/height44/radius12局部测量成立；仅该代表路径，不证明全部面板动效。原真实GUI首次P.screenToWorld非函数FAIL保留，确实修复纯Runtime相机缺原方法及undefined平滑目标；测试探针的Vue生产_vnode和transform字段错误另保留，不修改生产组件掩盖。

| InputA5文件 | 实际变化 |
|---|---|
| src/runtime/inputManagerOwner.ts | MOD显式primitive source订阅/终态清理，原DOM算法保持；start失败、cleanup抛错及迟到回调仍清held状态。 |
| src/runtime/inputPresentationPorts.ts | MOD可注入无DOM source，保留实际默认DOM输入、焦点和坐标路径。 |
| src/runtime/worker/runtimeWorkerInputContract.ts | NEW版本/范围/有限值/预算/epoch严格primitive契约，可靠边缘有序。 |
| src/runtime/worker/workerInputSource.ts | NEW有界单消费者无DOM输入ACK/重复/错序/旧epoch/reset；真实值立即更新。 |
| src/platform/webWorkerInputSource.ts | NEW实际DOM事件生产器，一在途batch、有限可靠队列+连续motion合并、overflow显式reset、dispose移除真实监听。 |

InputA完整逐处81映射及原方法body逆变换保存在其0a67fa…3a36封存交接，不以删除分支或强制false冒充无DOM输入。旧/新22DOM事件样本+12组CPU、实际普通WASM/World/Host/Core无DOM输入3组、类型与生产禁依赖0通过。跨时间原点校准、gamepad/sensor/tapHold生产桥、真实Worker模式、音频及完整Renderer仍必需。首次Root合并准备通用锚点重现2次、第二次把仅5owned封存目录误当完整source候选均在源码写入之前失败；改为精确锚点和完整owner.candidate，原失败保留，775→772逆变换全部字节相等。

| PAK身份7文件 | 实际变化与局限 |
|---|---|
| src/runtime/novaPakReader.ts | MOD explicit PAKv2 admission before resource decode; exact host/target/required-feature/index digest and dependency validation. Default v1 compatible; strict v2 without host rejected. Existing bytes/range/decompression guards preserved; eager1GiB compatibility policy still pending paging. |
| src/runtime/novaPak.ts | MOD explicit v2 producer seed and dependency table plus read-only legacy migration returning separate buffer. Default v1 exact bytes preserved; final game/settings equality checked. No default exporter switch or source overwrite. |
| src/runtime/runtimeProjectLoader.ts | MOD capture expected host identity before awaits, carry to authenticated reader and compare actual migrated project game/settings. No additional World or Editor hydration. |
| src/runtime/runtimePlayerCatalogCoverage.ts | MOD carries verification and discriminates actual build+hash-verifiedv2 from hash-onlyv1 evidence; existing private WeakMap authenticity retained. |
| src/runtime/runtimeProjectAdmission.ts | MOD both actual overloads pass optional verified-build policy into project loader; original detached admission/revision guards retained. |
| src/platform/webPlayerSession.ts | MOD immutable optional actual host buildVerification captured once and carried through actual load admission. Default entry host not yet supplies it; no qualified v2 default Player claim. |
| src/contracts/runtimeGameBuildManifest.ts | NEW bounded immutable identity/manifest/settings/dependency snapshots, exact host pairing and canonical index digest; actual producer must supply truthful versions and host identity. ES2020 compatible own-key check. No renderer/game logic or dependency change. |

这是真实load→admission→Session可选identity接线；明确PAKv2（旧parser拒绝），不能在PAKv1塞身份字段并让旧端静默忽略。Manifest绑定真实host提供engineBuildId/WASM+glue/hash/ABI/资源与脚本版本、目标OS/arch、所需增强、同gameId/version/settings和包索引digest；真实初始化Rust格式迁移和资源checksum通过。旧PAKv1默认writer逐字节相等，readonly迁移返回新buffer且源字节不变。快照拒绝getter/cycle/非法Unicode/NaN/无限元数据；误用Object.hasOwn造成锁定ES2020目标strict类型FAIL，改等价hasOwnProperty.call后重测，不升目标。

合并前30CPU坏包/身份/迁移测试、strictVue/Node与独立Player/publicRuntime生产构建通过。新gameBuildIdentity是测试显式合成值，不是发行engineBuildId，不伪称NVFP已接Runtime或Rust完整ABI。当前default Exporter/真实Entry host尚未提供新identity，最新模板尚未生成；PAKv2仍未默认发行准入。1GiB/eager decode兼容政策保持，真正range/u64/paging必需未完成。本片未增加依赖、不动物理数学、不改编辑状态或UI。

| 公共Frame新增5文件 | 实际变化 |
|---|---|
| src/contracts/frameProtocolV1.schema.json | 固定NVFPv1小端Header64/Sprite80，字段/单位/资源引用约束；绝非私有GPU64 stride。 |
| src/contracts/frameProtocolV1.ts | 完整字节验证、句柄/资源/相机Owner检查、容量与flags明确mask、独立Transferable及同步借用失效/终态/latest slot；保留原提取顺序。 |
| src/contracts/frameProtocolV1.generated.rs | 同schema生成常量，尚未编入Rust实际render extraction，不能报Rust抽帧通过。 |
| scripts/generate-frame-protocol.mjs | check不写漂移；write仅授权契约，生成TS/Rust同offset/stride。 |
| scripts/verify-frame-protocol.mjs | 25CPU/golden/坏长度/非法值/资源代际/租约/真实匹配WASM malloc+grow+free/实际磁盘生成器漂移测试。 |

Frame5原输入938项及正式706/master守卫0；公共类型ES2020且禁止依赖0。非零Clip/Event因其独立布局尚未实现而明确拒绝，不能静默忽略后称完整功能。Heap帧字节由测试写入，不是Rust真实extract。没有生产Frame消费路径、WorkerEngine模式/GPU/净收益资格；接入Rust/Renderer/完整独立表仍必需。

#### 最新组合与真实失败

Root775最新strictVue/Node/Player/publicRuntime生产构建通过；原224重放在旧EditorPrepare21停止：EI01要求“同Authoring World/Core”与新版独立世界相反，EI02把取消后实际未终态factory gate当已清，exit13/unsettled top-level await和partial保留。没有删失败测试。其余203原断言分离重放通过；Root775另Play40+Input15=55全原断言重放通过，原driver/适配inverse/raw/source绑定完整。

EI01–21逐项新语义映射仍是NOT_COMPLETED；不能拿新Owner测试掩盖旧scope。实际关联CONFIRMED：testRunner仍从Authoring取assertionResult，且只比较各Core从1重起的sessionIdentity可能旧finally停新Play；animationPreviewSession读Authoring与Editor singleton动画；Profiler录放仍legacy replay而新Core另有ReplayOwner。下一片必须修实际接线并新fixture覆盖原21，未把它们标已修。

PAK7→776已成功并有独立收据，再Frame封存清单的source字段实际叫rows，通用解析在五NEW写入前失败。保持成功的776，不重复写七文件；原attempt1保留，恢复只写Frame5，781→776→775虚拟inverse全部相等。Root781严格Vue/Node与Player/publicRuntime生产构建通过（实际167compiled/3chunks/193产物），独立Player禁依赖三数组0。781资源包30+Frame25=55、稳定203全部原断言通过；这两组不证明所有GUI/Worker/native。

组合准备的prefix锚点实际4次和内嵌driver换行语法错误均在业务执行前失败，保留原工具；独立多行v2 driver通过。另报告prefix替换误把3个历史失败引用从775改781：保留原c6c21a…4081报告，corrected报告只修3链接并校验原partial失败/exit13以及全部8原始结果SHA，没有改引擎或业务断言、没有重跑无收益回归。

#### 并行后续切片与不能继承的状态

Inspector8独立候选正在真实GUI核验：仅当前选中实体detached只读10Hz，复用原frametail，无新RAF/interval，draft/IME区域不被Runtime值覆盖；为此最小Core只读lifetime查询，缓存每帧，native校验限发布/身份变化。尚未Root合并；Apply Runtime Changes真实authoringRevision+可撤销事务仍必需。原ObjectOwnership500ms独立timer需迁移到统一低频Owner；保留当前Comfortable和motion。

Audio只读11文件调用链确认scrub/playbackTime真实调用仅Editor audition，可保留Main同步语义。Gameplay commands只有void Play/Pause/Stop；Timeline仍同步消费真实voice/rate诊断，不能以陈旧ACK/[]替代。已授权audioRuntime/contracts+NEWprimitive projection三文件窄片，Main实际消费复用原算法；真实Worker semantic桥、playlistIndex可靠版本回写、Timeline async诊断和激活/声音输出仍必需。准备、队列/传输、执行、反馈合并总成本未知，不报收益。

M6接口15旧封存尚未Root合并；Required-media3文件新封存保留原前像，21CPU生命周期+14上传/文字压力、strictVue通过。真实native静态媒体15通过：Image/FontFace安装、EntryObserver同Binding/文本geometry/原GPU提交、pending→nativecompletionACK、held文字256压力及退休清理。测试锁同条件AAOff/postfalse/streamingfalse，两后端像素零差，仅静态fixture，无World/Core/Player/Worker。原同(33,55)两通道max1几何FAIL和3fontAA FAIL依旧保留，runner总体exit1；不为过验收关闭项目效果或放宽容差。Streaming仍显式UNSUPPORTED，需真实缓存/背压接线；本片不是全M6通过。GPU时间、显示延迟、功耗未知仍null。

原Comfortable16/44/留白/圆角和核心motion源未被这四片改动；只局部GUI观察成立，全部主面板真实动态/拖拽/IME/ReducedMotion/取消/空闲清理仍未完成。正式B0–B8/X01–X15固定warmup10s+120s×5、B8长时、H1/H2、QualityLocked/AdaptiveExperience、Linux目标均不得继承短smoke。Linux/H2仅Windows环境继续NOT_TESTED，不免除必需验收。下一个版本仍按原11文件全套目标，完成前不发布。

证据索引（各范围只按其冻结源结论使用）：

- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/editor-play-merge-vMG6G0/report.json SHA256 3572b350af79f5625e9f3371bcb2576c77d5a55cdbe2b674d8ccac54e5941518
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/worker-input-merge-HLxhNY/report.json SHA256 5d80461e9be55a709dee3d7ea625d07deccc6e22ab762da0c0fd885ccbe47812
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/pak-build-identity-merge-klwQBP/report.json SHA256 3d7af9f902d72db0db94f849425a2489f09b2fd747039c9444a101c7861183b3
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/frame-protocol-merge-cVl6PO/report.json SHA256 498bf604470e5ee40c004cd3792cf5c3b49e6407aa6f5ddb745693ba31efaaed
- .cache/engine-overhaul/root-775-build-check-qG6xj2/report.json SHA256 a8f4fd13886082504a8a073b63bd81ffa3f5773bd15c6abc3a01f8c70427e4f2
- .cache/engine-overhaul/root-775-stable-cx9oYG/report.json SHA256 142eff541f0ba2beb348522b31b4a38bbe2654c498a72a5dc75f045727395216
- .cache/engine-overhaul/root775-play-input-replay-CYslfF/report.json SHA256 455468e01c5f9f1c6d4e01a2f28e66eee5e9cf4471cfc64b4fe480380015acf7
- .cache/engine-overhaul/runtime-inspector-apply-plan-20261012-1/ei21-map.json SHA256 4c9636bf8e8bef4c7e4420c124baa4cb006100e6b4f44f77d668d53acb8311c5
- .cache/engine-overhaul/runtime-pak-identity-YCCa0S/handoff-ArRiYr/handoff.json SHA256 9adf3eb43d09a80678e0942f292950b081b55eb37ff673709dea567710e7bd0a
- .cache/engine-overhaul/frame-protocol-HzcMbt/handoff-w4zEZN/handoff.json SHA256 453cd3af67aecbf97ece52de653665fcca27eebe0375a41a967f1a8adf384e4c
- .cache/engine-overhaul/root-781-build-check-F9ibdg/report.json SHA256 2a9e5319dfcfa38492b0fcbb31e703e8ec507d41d5d751bfdc9e80d336837468
- .cache/engine-overhaul/root-781-stable-j7dxvM/report.corrected.json SHA256 e4c36496f10088351e956e1f304f2746713d9673301eaf16cd67fefd60f0a8e6
- .cache/engine-overhaul/root-781-package-frame-Vt7Nud/report.json SHA256 8e351c4f85f6cce691b7c6e3bcb3aaa4cecdb1f11ceee8d3cfd21a50696f10af
- .cache/engine-overhaul/root775-play-input-replay-CYslfF/audio-owner-plan.json SHA256 395aab586945e5b7420cb3a733311094876b88f61b59cfbab20c43d9ed966885
- .cache/engine-overhaul/webgpu-production-adoption-5c328c6c/sealed-m6-required-media-CdmLQj/handoff.json SHA256 8c8f621a874e1379e120c6fe527708c19d84c422026c519b8b813ea62b265d92
- .cache/engine-overhaul/webgpu-production-adoption-5c328c6c/required-media-v1/gpu-image-GNOR3W/media-report.json SHA256 3e8bfe200d3e9b07010c0725ff1c7cd36a76fca718d40a4053498cb20c9d60f4


### 2026-10-12 20:30 CEST 声部消费者、Inspector及着色器构建边界的阶段集成

HEAD仍82c9c03118848df1c07af323c38a3abade7dd21b/main；正式700源与6原生输入、旧未提交修改受保护。隔离候选由781经精确切片成为792源/33 Player原生输入/125旧模板产物。所有本片逆变换和非owned字节守卫0；主指令及AGENTS原文未修改。整体约80%为工作量估算，绝非验收百分数。用户要求所有工程完成后发布下一版本，26.37完整11文件尚未生成，未作部分发行。

#### 本次逐文件编辑与后果

| 文件 | 实际编辑和后果 |
|---|---|
| scripts/build-independent-runtime.mjs | 接入生成声明规范化，把独立包输出作为实际NodeNext/Bundler消费；helper本身纳入buildId。 |
| scripts/lib/runtimeDeclarations.mjs | 新增AST声明处理，相对模块补合法.js/index.js；全部目标先验证，不改注释/ambient/bare package，不部分写坏产物。 |
| src/editor/runtimeInspectorReadOwner.ts | 新增当前实体detached只读观察、同binding/epoch/project/asset守卫及读租约。 |
| src/runtime/GameplayRuntime.ts | 接入实际Inspector Owner，跟随当前Core。 |
| src/components/WorldCanvas.vue | 原帧尾100ms发布只读观察，选择/结构变化即时；不加第二RAF。 |
| src/components/ConfigPanel.vue | 独立Play时只读Runtime区，Authoring编辑inert wrapper；搜索/折叠/滚动可用，新区移到高频位置。 |
| src/components/ObjectOwnershipPanel.vue | 从旧500ms interval迁移统一观察，不抢draft。 |
| src/editor/objectProvenance.ts | 独立运行实体来源只读映射。 |
| src/editor/objectOwnershipCopy.ts | 补实际运行/作者字段说明。 |
| src/runtime/GameplayRuntimeCore.ts | 新增同Owner只读inspectEntityLifetime，退休/错误代际返回null，native校验限实际发布；未重新创建世界。 |
| src/renderer/core.ts | 新增显式异步WebGPU诊断工厂和取消；旧同步createRenderer2D/默认WebGL2保持。媒体3续片加入实际required upload状态。 |
| src/renderer/types.ts | 扩展后端/required媒体类型，不把私有GPU stride冒充公共FrameABI。 |
| src/renderer/RendererEnvironment.ts | 注入诊断GPU平台能力。 |
| src/renderer/capabilities.ts | 显式后端能力描述，未知GPU指标不填0。 |
| src/renderer/materialGraph.ts | 目标后端兼容性声明；不支持项显式拒绝。 |
| src/renderer/materials.ts | 合法目标材质兼容检查。 |
| src/renderer/particleGraph.ts | WebGPU诊断限制的真实能力描述。 |
| src/components/ParticleGraphEditor.vue | 显示目标支持范围，不用默认材质替代缺失实现。 |
| src/renderer/WebGPUApi.ts | 新增实际使用API接口，仍可普通WebGL2启动。 |
| src/renderer/WebGPUCapability.ts | 新增实际初始化/limits探测，不只查API名字。 |
| src/renderer/WebGPUSpriteRenderer.ts | 新增自研显式诊断Sprite/geometry后端；媒体3续片加入有界required上传、设备epoch和native完成ACK。 |
| src/renderer/TextRasterResourceOwner.ts | 新增真实字体/文字光栅资源Owner；媒体3续片修复保留资源的版本与生命周期。 |
| src/renderer/sprites.wgsl | 新增自研Sprite shader源，不改变默认GL shader。 |
| src/renderer/geometry.wgsl | 新增自研geometry shader源；严格单像素差仍未通过。 |
| src/renderer/raw-shader.d.ts | 明确?raw shader导入类型。 |
| scripts/lib/independentBoundary.mjs | 精确.wgsl?raw资源叶纳入内容hash/生产图；realpath/regular-file/Editor禁止规则保持，不放行任意?raw。 |
| src/runtime/audioPresentationValues.ts | 新增纯数据数学与lazy读选择；消费者4续片新增primitive读端口，位置必须显式提供。 |
| src/runtime/audioRuntimeContracts.ts | 共享纯值/请求类型，Main原同步Entity facade保留。 |
| src/runtime/audioPresentationContract.ts | 新增非权威呈现frame/Timeline请求/源/监听者值契约；没有Entity/World/DOM对象重建。 |
| src/runtime/audioRuntime.ts | 四数学函数和选择器迁移同实际媒体消费者；update/play/Timeline Main与primitive共用唯一语音/mixer/时钟。独立Fix1两处重取退休后的当前声部数组，阻止旧退休引用重入。 |

音频Helper3的原19差分与数学病例、消费者4的19原Main+12primitive组及strict类型均在其冻结候选通过。确认旧cb6 polyphony3连续四次play保留3额外声部并重新引入退休项，原失败证据保留。Fix1只改两处局部引用，不改上限数学/随机/回调；11真实AudioRuntime受控媒体生命周期组（容量1/2/3/64、100/200/160连续播放、迟到ended/error/reject、资源ABA、stop/dispose）和原19差分通过。尚无真正浏览器声音输出，也没有Worker桥或异步反馈性能结论。

#### 验证与保留的失败

声明DTS2七组通过：真实已安装包strictNodeNext(skipLibCheck:false)、Bundler/ES2022及普通匹配WASM创建World/singleStep/dispose；AST注释/目录/ImportType/idempotence及坏目标不部分写。两次消费者fixture遗漏实际WorldHost回调/step参数的旧FAIL原文件保留，只修fixture，不改运行语义。新Inspector只读API随后在公共包三消费者重新验证。

Inspector原18组79断言+真实Core11组103断言通过；实际生产Vue/WebGL2 GUI11观察及一滚动观察通过。同11 entities/8 assets、1600×900、DPR1/uiScale1、Edge147/ANGLE RTX5060 Laptop，唯一Canvas、16px/line24/height44/radius12/padding9、运行只读/search draft/caret/focus/手动折叠/Stop成立。原新区域未展开、SaveToast遮挡搜索、NodeNext声明失败均保留并各自修真实折叠调用、实际遮挡fixture、DTS处理；并非全GUI/IME/全动效验收。

M6接口15+媒体3已精确Root集成，仍显式webgpu-sprites-diagnostic；默认WebGL2字节相等。21 CPU初始化/取消+14媒体/文字压力、真实静态native媒体15观察已通过；严格geometry(33,55)两通道max1及重复字体AA读回FAIL仍在，零像素容差没放宽。固定AAOff/postfalse/streamfalse仅隔离静态图测试，不能用它关闭生产功能换资格。完整RenderGraph、streaming、协调器上传预算、真实Session/Player/Worker以及跨后端/平台准入继续未完成。

Root790第一次组合Vue/Node/Player通过，Runtime在编译前因新WGSL资源叶未识别而失败。保留该真实FAIL，单文件ShaderBoundary修复精确raw叶/叶内容hash/realpath别名隔离；七组源图攻击/输入漂移通过，实际生产构建真实包含两shader，独立已安装包三消费者通过。没有放松Vue/Editor禁止图，也不只是绕过检查。

最新Root792组合严格Vue20.762s、Node0.867s、Player3.768s、Runtime11.532s全部exit0，生产禁止依赖三个阶段均0。真实公共Runtime buildId independent-runtime-64ca6b2d1d2ade40b52f，174 compiled/6 chunks/202 artifacts。这是锁定普通WASM+当前源/生成声明的实际构建，未进行新的Rust编译；构建时长不等于游戏FPS/输入延迟。最新音频组合行为重放仍待，旧scope不能自动继承最新全功能资格。

#### 当前并行工作与必需缺口

工具Owner8正接实际TestRunner、AnimationPreview和Profiler同独立Session/Core，移除旧80ms独立轮询、以binding+epoch避免旧finally停新Play，未Root合并/未完整验收。Apply Runtime Changes仍需真实authoring monotonic revision、文档hash与单Undo显式事务，结构变化/旧EI01–21完整映射仍必需。

Player M7 I1两文件producer正在真实Vite build管线封存。活跃实际依赖闭包、工具链/native parser/Node真实字节、生产环境文件准入及resolved配置摘要需绑定同ID；旧Vite generateBundle次序导致产物hash不符真实FAIL保留，使用本地锁定Rollup post hook修复。其旧draft通过结果不能当最终ID。I2真正Entry可信预期身份+匹配WASM bytes、I3原生编译常量/最小固定IPC、I4 v2模板receipt/导出/原生preflight仍未实现，不把producer manifest冒充完整可信启动。

AudioBridge3仍只读设计；Worker持有真正Core/世界/组件，Main持有媒体/缓存/mixer，不能复制World或将队列收据当播放成功。真实arenaEpoch/index/generation/组件revision、playlist Owner安全边界回写、Timeline异步诊断、激活和Ready解码租约均必需；全部准备+传输/排队+消费+反馈合并成本未知，不报净收益。

Comfortable字号/空间/圆角和Motion源未因此退回；全实际组件动态/Reduced Motion/IME/精确拖动/活动集合清理未完成。公共Frame Rust抽取与生产消费、实际Worker全模式、统一调度/并发/字节预算、自研GL优化/恢复、完整GPU/资源/音频/平台以及B0–B8/X01–X15正式采样仍必需。QualityLocked和AdaptiveExperience尚无完整独立结论；Linux与H2只有Windows环境维持NOT_TESTED而非豁免。不宣称M0–M8/X0–X6或26.37整体完成。

证据（只按对应冻结源和平台范围使用）：

- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/declaration-package-merge-frFBLR/report.json SHA256 d63b0f7ac9b22aaf6ea0754cc145162ad84e9abb3f8c4a8a354aa9008b4cf7bd
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/runtime-inspector-merge-MXvCSO/report.json SHA256 03f6b5574a0c4c31dc40e8e76f54acbf132952e47202f7bf160f0bb87861f5e9
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/m6-interface-merge-5guWsb/report.json SHA256 af76713f0e7cdaf1c14c53a4a1738d70c1243d862b213217d06faeb5e83f9dd3
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/m6-media-merge-lMrSBd/report.json SHA256 93aadccfc9f7aff5ffaba0e179050293eb69cf2f744427fd8cf6dcb7b0536c54
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/shader-source-boundary-merge-iXbWEf/report.json SHA256 db4c84870b7595dca4f2b1e049d439a98bc4a072c2e2362154ad03ebdc134be7
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/audio-values-merge-BIZEfD/report.json SHA256 d9b4cdc7efeac786cf5ca4ac1578f49ff4bb95805c32c5d538b6dd3a5503497d
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/audio-consumer-merge-49IwYK/report.json SHA256 dfaf95552ea35012a668ba8f17691bb448e8d371022478036bbcc0d4629f8d3b
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/audio-polyphony-merge-eB7I7p/report.json SHA256 a1777f9fc9b49a6823cea34f99d3a34a59b0c347f9ac2af311d667482ab2a4be
- .cache/engine-overhaul/runtime-declarations-eLas7M/functional-DbDxil/report.json SHA256 09aa28c2f796b90ae591e2650252f0b90a215f48b7ab223e4904d011ee72f141
- .cache/engine-overhaul/root-790-build-check-URxayw/report.json SHA256 0bc333ace313b34a9b34728e304b08762622422f5640690d2272fc68f4e69056
- .cache/engine-overhaul/shader-source-boundary-dUI8XM/functional-ilQ0la/report.json SHA256 fb8be28488ecc8de58684d3c019e3574a9e49fae0e4a68679d747e4486cd72b9
- .cache/engine-overhaul/shader-source-boundary-dUI8XM/public-consumer-0hjeVu/report.json SHA256 86846d6434ce643a332d9f30d939aed7a60b4538b213ab6d93361b81b67417d6
- .cache/engine-overhaul/audio-projection-Hiresu/handoff-9IbqjD/handoff.json SHA256 aa2752ca05b3b6b5d5f370ec5980e972b64173bbb5b639e6c81d44707bb7f910
- .cache/engine-overhaul/audio-consumer-uobMNq/handoff-rtfHhM/handoff.json SHA256 a659b3f0e60e3a0ecc9850a7db41e85645074911a64232e6e7a6347657ce1ebc
- .cache/engine-overhaul/audio-polyphony-AOjcRv/handoff-tBQHS3/handoff.json SHA256 488e0e10e9b6201983639d2693b5d998296af273716e8012d169e971a7a4d379
- .cache/engine-overhaul/root-792-build-check-x3nOTA/report.json SHA256 372bd22e54c7916bfc4656804a9f8649cbb1f13e698541765f87222fae5b707c
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/candidate/.cache/engine-overhaul/runtime-library-build-groIkB/report.json SHA256 e3f2fa43420bc9c6c8d864088d2e19e1f84e7bec0bebee9336091c4107f0fb53


### 2026-10-13 17:16 CEST 工具、Player身份、草稿查询与音频消息的当前整合

HEAD仍82c9c03118848df1c07af323c38a3abade7dd21b/main。当前私有候选800源/37原生输入/125旧模板；正式700源和6原生输入、主指令/AGENTS及旧发行均保持原字节。本轮为逐片复用正确实现，没有第二套World/渲染/全局Motion。整体80%仅工作量估算，不是通过门槛；下一版26.37必须在必需实现和验收后生成完整11发行文件，目前没有新版本发布。

#### 本次逐文件实际编辑及后果

| 文件 | 已进入Root候选的编辑及后果 |
|---|---|
| src/editor/editorRuntimeToolSession.ts | 新增实际工具Session，唯一Core/Owner/project generation/asset revision/epoch守卫。 |
| src/runtime/GameplayRuntime.ts | 接入TestRunner、动画预览、Profiler同实际独立Play Owner；旧finally不能停止新Play。Apply六路径仍在另一个候选，不计作已Root合并。 |
| src/editor/editorPlayPreparation.ts | 工具使用相同Authoring准备链与单独RuntimeSource。 |
| src/editor/editorPlayWorldOwner.ts | 同Owner工具许可与生命周期接线；清理必须等实际终态。 |
| src/runtime/testRunner.ts | 使用真实独立工具World/UUID seed，不再直接作用作者世界。 |
| src/editor/animationPreviewSession.ts | 接入实际Core timeline/lifetime，移除旧独立80ms轮询。 |
| src/components/AnimationPanel.vue | 实际预览/seek走工具Owner；保存动画资产仍是显式Undo事务。 |
| src/components/ProfilerPanel.vue | 观察同RuntimeSource/Core，不增加第二RAF。 |
| vite.player.config.ts | 实际构建接入身份producer和原生产依赖边界。 |
| scripts/lib/independentPlayerBuildIdentity.mjs | 新增完整源/锁定工具/普通WASM/图/实际产物hash producer；I2接入编译Entry→Host→Verifier→Session静态AST证明、schema3/实际target/fullDigest。续片精确5个Tauri schema输出仅regular-file忽略，并把实际resolved target纳入canonical input；未知gen/permissions/source仍参与hash。旧wrapper-v1投影限制仍需与I3接通，不能自动声明新native build有效。 |
| src/player.ts | 使用真正编译期身份及匹配WASM bytes，进入同实际EntryHost。 |
| src/platform/webPlayerEntryHost.ts | 最小固定IPC校验先于package/overrides/World；同初始化promise的cancel/晚终态清理，不另建WASM世界。 |
| src/platform/webPlayerBuildVerification.ts | 新增严格七字段native envelope/十字段identity/target/hash校验，只使用可信编译bytes初始化普通WASM。 |
| src/playerBuildIdentity.d.ts | 新增明确虚拟编译常量模块类型，不作可变运行配置。 |
| src/editor/pendingDrafts.ts | 新增dirty/clean/unknown只读查询，不commit/cancel/focus；独立D5b修瞬时注册add/delete ABA使查询invalidated，不把未知当clean。 |
| src/components/NumericExpressionInput.vue | 实际注册isDirty查询，原draft/IME/提交逻辑和SFC style保持。 |
| src/components/PathTextInput.vue | 实际注册isDirty查询，原光标/输入/提交逻辑和style保持。 |
| src/components/ConfigPanel.vue | rangeGesture进入同dirty查询，原Comfortable布局与操作保持。 |
| src/components/PresentationPanel.vue | mixerGesture进入同dirty查询，不让Apply忽略活动滑动草稿。 |
| src/runtime/audioRuntime.ts | 原pause/stop/scrub/playbackTime迁移同唯一媒体engine的primitive读取；组件退休释放旧voices/callback；旧timeUpdate快照必须仍是当前active voice才写，防止替换后删除新voice。 |
| src/runtime/entityLifetimes.ts | 新增只读实际arena身份验证，不allocate/begin/refresh；compat不伪造Rust index/epoch。 |
| src/runtime/worker/runtimeWorkerAudioContract.ts | 新增版本化语义消息、真实identity/组件revision/时间不确定度、严格plain/深度/总bytes验证，无AudioNode/World传输。 |
| src/runtime/worker/workerAudioProjectionOwner.ts | 新增同实际World的音频参与者投影；playlist反馈在实际安全边界按generation/revision/期待index验证后稳定回写。 |
| src/runtime/worker/workerAudioBridge.ts | 新增有界credits/可靠事件/最新投影/保留terminal slot，Stop不丢可靠请求，回复不是立即播放成功。 |
| src/platform/webWorkerAudioHost.ts | 新增借用唯一AudioRuntime的Main媒体Owner；异步解码等待不耗HeavyLease，保留CPU-ready资源真实确认/释放，late结果和dispose终态清理。真正Core/Host/Timeline/UI/Worker接线尚未完成。 |
| player-native/src/build_contract.rs | 新增actual artifact/full source closure/WASM+glue/canonical target/长度/hash验证，有限generated输出表且先拒绝symlink/kind错误。 |
| player-native/src/build_identity.rs | 新增只读编译常量与真实OS/x86_64校验；不从游戏或env替换预期身份。 |
| player-native/src/runtime_build_preflight.rs | 新增PAKv2十字段身份、entry/graphics/增强和UTF16稳定index digest/项目gameId/settings校验；旧v1仅explicit host允许。 |
| player-native/permissions/autogenerated/runtime_build_verification.toml | 新增唯一固定只读identity命令权限；字节匹配锁定Tauri生成器，没有shell/Editor权限。 |
| player-native/build.rs | 编译前后核对实际前端，生成OUT_DIR身份常量；try_build不冒充最终JS embedding。 |
| player-native/Cargo.toml | build阶段复用已锁serde_json/sha2；Cargo.lock未改，没有新外部依赖路线。 |
| player-native/src/lib.rs | 接入无参数runtime_build_verification，overrides和实际package先通过native preflight；原UDP/窗口能力保持最小边界。 |
| player-native/capabilities/player.json | 仅增加固定只读构建身份命令许可。 |
| player-native/src/runtime_pak_preflight.rs | 保留v1结构规则，增加明确v2结构入口和匹配编译身份的预检。 |
| player-native/src/package.rs | 实际project chunk完整性/解码后校验，先于网络/窗口Ready权限发布，不新增包Owner。 |
| player-native/src/network_tests.rs | 原scalar override断言不变，调用内部值函数；权限门禁另由真实package先验约束。 |
| player-native/scripts/build-player.mjs | 接schema3实际frontend/native输入；CLI终态后复核源/嵌入文件全集与native closure，未知Cargo/权限变换拒绝，report不被并发替换。 |
| player-native/scripts/package-player.mjs | 同模板与PAK的标准/现代48-byte便携封装；验证复制后模板前缀、初始header/index、完整输出hash/footer及原build report，再发布输出receipt。 |

#### 已验证范围与原失败

Root794严格Vue/Node及实际独立Player/public Runtime构建通过；实际生产图三个禁止依赖集合为空。Root794组合原Owner27组、Tool15组和actual普通WASM/PAK/Session201断言通过；这不是最新Root800的全组合资格。工具GUI此前真实Edge147/ANGLE RTX5060同11entities/8assets、1600×900、DPR1/UIscale1的Profiler/动画观察通过，不能代替全动效/全部面板验收。

I2独立35 Ownership+17 Session+7 Entry受控CPU病例通过，两次fresh canonical产物相同；最终types通过。生产AST绑定只证明编译接线；manifest runtimeStartup仍NOT_TESTED_BY_PRODUCER。原19对抗病例的18PASS/1诊断路径不匹配FAIL保留；没有放松旧规则，另一个维持identity实际使用的focused fixture正确命中原later guard。新Root800/native37必须重新生成actual匹配身份，不继承旧793/794的buildId。

D5十组60断言，实际Numeric/Path Vue注册/卸载通过；Config/Presentation仅实际注册表达式测试。D5b旧add-delete/add-remove-readd失败保留，同六组11断言通过。物理IME和全panel动态仍未验收。

Audio A6 12 bridge+9 terminal+1来源替换+4关联+15原Main差分共41 CPU病例及私有strict types通过。Node MessageChannel不是DedicatedWorker，受控媒体不是可听声音、真实激活或质量证明；24样本总成本仅SMOKE。控制槽当前Required分类需按实际语义接Critical/Visible/Required；B1只批准九路径Main factory纯化，remote Owner、真实identity evidence、Timeline异步诊断、UI火发并观察、Ready实际ACK及三个执行模式仍mandatory。

I3 synthetic Rust实际production模块七组通过，包含UTF16/控制字符/-0/MAXSAFE index golden、十身份错配、target/长度/坏依赖/legacy/重叠与生成输出closure。旧generated文件混入native closure真实Rust FAIL保留，有限regular-file排除后重测通过。构建/打包37真实自有fs相位受控CPU病例通过；旧25门禁漏检与12原check证据保留。spawnSync被控制、模板为不可执行CPU_TEST_ONLY文本，因此没有native二进制、固定IPC、GUI、游戏Ready资格。

Apply另一候选纯13组73断言、实际普通WASM/PAK/Ready17组113断言通过；旧清理期间新Play预留竞态CONFIRMED，旧Apply错误提交的FAIL保留后加入monotonic控制意图守卫。六路径尚未Root合并，完整结构事务仍mandatory，拒绝结构变化不代表该需求完成。其新QA physical-root junction及重复legacy SVG声明失败保留，只修新fixture物理副本/环境入口，原正式边界不放宽。

#### 当前必需出口

下一步是最新组合types、matching Windows/Web producer、实际cold Tauri/native身份IPC/PAKv2启动、标准与portable真实小游戏和Editor exporter/template v2接线。旧125模板仍legacy明确producer，不能拷新ID覆旧bytes；Web/web不能冒用原生x86_64 tuple。I4正在只读确认旧导出/receipt/parser关联。

Comfortable16/24/44/r12与四向空间保持；实际全Motion/ReducedMotion/IME/精确drag/收敛清理仍必需。Rust唯一Transform权威、公开Frame生产抽取/消费、Worker全模式、范围读取/大包、真实音频、GPU streaming/协调器及GL/WebGPU严格图像问题仍需完成。Geometry单像素和字体读回旧失败仍保留。B0–B8/X01–X15正式采样、H1/H2、QualityLocked/AdaptiveExperience尚没有完整独立结果。Linux/H2仅当前Windows环境维持NOT_TESTED，不豁免、不宣称整轮通过。

证据只用于对应冻结源与平台：

- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/tools-eight-merge-w7trSu/report.json SHA256 4fecd21f9d9f3528a7ae44a4bd45eb2f8227f6c266be08b0fd75882b2e23a2e1
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/m7-i1-producer-merge-mlmpVb/report.json SHA256 267a6438049f370c41e9dc1e8063c214495c19ff34cd4051288b71951954faa0
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/m7-i2-five-merge-TmWQ9A/report.json SHA256 bdee2d30e86e314d4b9be77a3efd7871f2aae913de0e7eaccfd1c9f61b54a440
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/i2-policy-one-merge-6CNRwg/report.json SHA256 8e338c10bbb7889747921a3d2d5455147058daab759aee0f7555afa9c9e480c4
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/draft-query-five-merge-5uKmJ4/report.json SHA256 f217a9ead09783b67c02fbd845eef12f5db2b8ed05a5b8f59f6f37c2e1aa20fd
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/draft-query-aba-one-merge-eKudGS/report.json SHA256 10fe1275e188aebb4b323ff1f157e1d7b86ad3bca2059002c2a700f0486cf940
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/audio-bridge-six-merge-43oPEb/report.json SHA256 f712e6a0604f4052f2bc3fa14c9596fd6e8b7fd704e9c7cb41675401a8f0f69d
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/m7-i3-native-thirteen-merge-sgMIB1/report.json SHA256 cd263c4df379ca390b80b05eaa735b1b908c28d4ff9311a0ddcebf47607c8400
- .cache/engine-overhaul/root-794-build-check-otej1G/report.json SHA256 9c507a37da18e5e9fe989cc6b41a905aa6ecc2cd24064a53949d55ed71d38978
- .cache/engine-overhaul/root794-runtime-tools-retest-EX4ojl/combination-MlES9y/report.json SHA256 ad418d3b7442149028369486772ac285eb4642a4000fe3ab59c2b41a328ca465
- .cache/engine-overhaul/audio-bridge3-ReqHJU/handoff-KHxw6J/handoff.json SHA256 03360b7c8454d143f099389cd630443504ee451daddcb9428238c2b98fda7f15
- .cache/engine-overhaul/m7-i3-contract-qa-6r9le1/run-Le5Caq/report.json SHA256 4990fbea0935bda5c0ed054f74898ea7da884abbff91643e43594e2c9c39c49f
- .cache/engine-overhaul/m7-i3-contract-qa-WdgL3P/generated-output-gap-UexCSs/report.json SHA256 adfec80436f061abfc49473a72c3d1aa4c445ceb13060194c97c924101f9e4cc
- .cache/engine-overhaul/m7-i3-script-gates-01139c781cfd/sealed-two-gates-uUJu3l/handoff.json SHA256 a4d02017bd5b2fe5efe58357a3d66476e9fecb57c7ef66c30910caee3c332c0e
- .cache/engine-overhaul/audio-bridge3-B-readonly-7b4a2f95/B1-nine-path-proposal.json SHA256 05b751d06e794a8ab2909e5f573db47b5c0e34889017ff7791fb5edb7de6ab5a


### 2026-10-13 18:24 CEST 实际 Windows Player、模板包装与 README 整理

HEAD仍82c9c03118848df1c07af323c38a3abade7dd21b/main；Root私有候选801源/37原生输入/125旧模板，正式700源+6原生输入与主指令/AGENTS保持原字节。80%只为工作量估算；下一版本26.37尚未完成全部门槛，没有执行最终发行。本段只追加事实，不修改主指令、旧失败或旧报告。

本段更正前一段归属：旧v1投影限制位于scripts/prepare-independent-player-templates.mjs；independentPlayerBuildIdentity.mjs已实际支持新37原生输入。新增schema3包装分支已与I3真实产物配对，不代表Editor导出链全部接通。

#### 本次逐文件编辑和后果

| 文件 | 当前实际编辑 |
|---|---|
| player-native/Cargo.toml | 将实际Tauri2.11.4此前重写的空格提前规范化；字符串与全部非空白词法token保持，deps/features/profile/锁未改。冷构建误差不靠豁免门禁放行，编译中任何新漂移仍拒绝。 |
| src/runtime/audioOwnerContract.ts | 新增纯本地factory/binding/owned终态契约和实际World/资源身份守卫，未实现remote facade。 |
| src/runtime/audioOwner.ts | 注册同真实Main Owner，抽出实际Main factory；原21方法保持。 |
| src/runtime/gameplayWorldHost.ts | type-only AudioOwner契约引用。 |
| src/runtime/GameplayRuntimeCore.ts | Main concrete value import改为纯type，构造时核对绑定；原89个非构造方法逐字保留。 |
| src/runtime/runtimeWorldHost.ts | 注入factory并绑定同Core/lifetime/scriptServices；错误后只有本次owned allocation被清理，并等待所有终态，foreign borrowed Owner不释放。 |
| src/runtime/runtimeWorldHostContracts.ts | composition capability由audioPlatform改为真实factory。 |
| src/platform/runtimeWorldPlatformAdapter.ts | 校验实际factory结果，失败只释放本次owned Owner；TS类型注解修复不改变emit。 |
| src/platform/webRuntimeWorldServices.ts | 真实Web平台注入Main factory，保持原评估时点。 |
| src/editor/runtimeWorldHostPlatformAdapter.ts | 编辑器注入同Main factory，input→audio→network构造次序保持。 |
| scripts/prepare-independent-player-templates.mjs | 新增显式schema3分支，核对源/工具/fullDigest/目标/WASM/图/静态绑定/原生终态，复制前后及receipt发布复核；原v1完整body逆向逐字不变且未执行，旧125与registry不写。 |
| readme.md | 从83361字节改为7314字节项目介绍；保留功能/手册/示例/安装开发/目录/许可证，校正Rust1.92.0，移除历史改动播报与旧发行命令。原字节备份，17链接/8脚本入口核验，产品和构建配置不改。 |
| docs/EDIT_LEDGER_26_37.md | 仅追加README编辑与核验记录1034字节，完整旧前缀保留。 |
| docs/RUNTIME_STAGE.md | 仅追加本段事实、逐文件后果与证据范围。 |

#### 已实现与已运行验证的区别

旧Root800 Vue/Node/真实Windows Player/public Runtime生产构建通过，三个禁止依赖集合为空。B1私有801/native33 strict types、18组actual Core/Host ordinary WASM受控音频以及Player/public Runtime图通过；本次Root合入最新801/native37后尚未完成其新matching整体构建，不能继承800的Ready。

真实Windows冷构建在锁定CLI空白重写后被build.rs正确拒绝，原失败日志与产物报告保留。仅预规范一处Cargo后，重新生成实际Windows frontend；实际native retry成功，但复制了原失败冷构建的依赖target，因此明确WARM，不是cold PASS。最终Player14986240字节 SHA2562bd9f4ce64e2df352451eddf500a596e739d2e147a0644db1c2bed8afd032327。13个既有dead-code warning保留，没有吞编译异常。

该冻结800/native37组合的buildId为independent-player-ca9cbc4f840b8ad6e622，fullDigest ca9cbc4f840b8ad6e622c80c0de3ad652389e6ddf8ee7fb2ebb866dd46ac709e，Windows/x86_64、ordinary WASM、生产profile；这是实际legacy-exact protocol，不能宣称NVFP/RustBatch目标协议已经生产生效。

同原11entity/8asset小游戏以实际生产PAKv2 writer/parser重新声明身份，9个解码文件/项目值保持，3个真实资产依赖保留；std与48-byte现代footer portable共用相同PAK。真实WebView标准与便携各21检查PASS：固定native IPC七字段与实际frontend/js bytes、普通WASM初始化、自研WebGL2非空绘制、真实Rhai移动/跳跃、HUD/font/audio source、权限拒绝和退出。最初GUI新增断言错误期待native IPC含增强字段的FAIL保留，只校正测试形状为实际七字段，原产品未改。

实际WebView143/ANGLE NVIDIA RTX5060 Laptop D3D11，DPR1.5，CSS1280×720/backing1920×1080；物理系统DPI未知。截图证明该小游戏静态布局，controlled observer证明实际音频source已start，不证明物理可听声音。报告中旧literal executionMode不是实际Owner probe，因此不作为Worker拓扑通过；没有帧率、GPU时间、input-to-pixel或正式性能主张。own Player进程真实退出、CDP端口关闭；没有残留GPU任务。

I4A封存单脚本50受控CPU检查PASS，76封存/raw引用Root独立核对；合成PE仅CPU_TEST_ONLY。另对上述真实冻结800/native37执行完整production packaging exit0、7检查PASS：新独立缓存tuple125 artifacts全部重新hash，v2 receipt088717d0cbf33918ab21ca11d879768f3d5fd375e33668158f0286bb66a9f07c，仅生成pending anchors未安装、旧125未写。它不是最新801Ready、不是Editor exporter或独立Web target通过。

Apply A6另一候选source796/native33最终七相位与真实相同项目GUI6项PASS，值确认8项/3对象、取消焦点、一次UndoRedo和dirty保护；完整六路径尚待Root逐项审查/合入，结构Apply仍mandatory。该GUI不是Root801资格。Main/remote音频的6个真实缺口、短控制被无关HeavyLease延迟及Ready解码尚未真实准入已确认；B2/C继续必要接线，不能改全部Critical冒充解决。

Comfortable16/24/44/r12及同shared Motion保持。完整Rust World权威、实际帧抽取消费、所有Worker模式、音频Ready与控制、范围读取大包、GL/WebGPU严格图像、GPU调度streaming、全UI动态、I4-B/C/D导出、最终fresh cold构建与正式QualityLocked/AdaptiveExperience/B0–B8/X01–X15/H1/H2仍必需。Linux/H2无实际环境仍NOT_TESTED，不豁免。原Windows实际GUI只是阶段证据，不替代整轮验收。

#### 固定证据位置

- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/cargo-normalize-one-DpTrx9/report.json SHA256 b653d154563fa6c73528377817baa9b0c25141c16be35585fe1452cf71b14ad5
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/audio-b1-nine-merge-j0lPsf/report.json SHA256 6838ef989dbc465cd1a4410b34f8456c2f8dd20162110aa31447c12e86f569f6
- .cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/i4a-one-script-merge-byQqp0/report.json SHA256 1838d802f28d0867dd0b4fccb3f20facc0d70bd23b9e2fbc69746df488e002cf
- .cache/engine-overhaul/root-800-build-check-OVJbD2/report.json SHA256 ce157e1dd347b0b56e9f0b7517f5da9e8062b28795c9866a03a99c96112ff92e
- .cache/engine-overhaul/m7-native-cold-Yb7fTL/run-2N2NUt/report.json SHA256 b49d1d5b05bb1dc2d813424196f06cdcc419a00adeb73e495fc380200923c694
- .cache/engine-overhaul/root-800-normalized-player-build-kGUDVg/report.json SHA256 82fada0bc84ca9b0fcfe12a8f1a24c41d3b5eef2385af7dfc15266795b44e92f
- .cache/engine-overhaul/m7-native-warm-retry-5ojbc7/run-SOH2A5/report.json SHA256 bf4e63dba8d5630b5149d1ae635214150e874909762295505b193fff1e0b93f5
- .cache/engine-overhaul/m7-native-pak-v2-sP0Dmf/report.json SHA256 147ea20975ec3df840d03990ae60c9d5d4cab68201ceeb5e2d6f21eb9816ea07
- .cache/engine-overhaul/m7-native-pak-v2-sP0Dmf/run-standard-cb1524c9c1/report.json SHA256 9da2a955f4595c43fc717a2d177eedd3db2e7b4fb1c076b7455c818ef49201fa
- .cache/engine-overhaul/m7-native-pak-v2-sP0Dmf/run-portable-c431fd74a2/report.json SHA256 47c53abe59599ac9ea0422656bc8f73b0b55d58173f304d30a2d2f86977cb73a
- .cache/engine-overhaul/m7-i4-a-schema3-ec437eb68f29/sealed-464f9b9f-3c2c-4c3d-9de3-d778696b9dfc/report.json SHA256 eb23889cea4ff5a950d79e34374f6f6673f92a960e349776fd35dcaadd60512b
- .cache/engine-overhaul/root-integration-next/i4a-actual-package-YcS0Ze/report.json SHA256 14d38adc42ece32a654aca2af3ff0ed3739ab3447b91dddd692cef8624268186
- .cache/engine-overhaul/root-integration-next/readme-introduction-yFWlEU/report.json SHA256 a99d5ab2ef8c38095feaecc3ebab53da1b5aed5587b940bd11004847097de324
- .cache/engine-overhaul/runtime-draft-query-D5-20261013-a/a6-sealed-oSCBUK/handoff.json SHA256 a1cc0ec9715febe57997a20cbd48737bce57b1861dea2db37aa017c9c3abf54e


### 2026-10-13 19:11 CEST：A6值回写、资源重导入Undo与Q4短控制精确合入（约80%，整轮未通过）

当前 main / 82c9c03118848df1c07af323c38a3abade7dd21b。保留正式700源码/native6原未提交修改；实施只在Root候选，最新source803/native37/旧模板125，965文件全hash核对；README已是项目介绍，工程主指令/AGENTS未改。没有发布、签名、push或将候选全仓覆盖正式工作区。

A6六路径从796私有证据精确合入Root803：physics.ts增加显式Runtime变化的execute-first DocumentMutationCommand与revision/草稿守卫；dialog.ts增加确认状态；GameplayRuntime.ts捕获Authoring版本、暂停预检、真实renderer retirement后提交一次Undo；ActionBar.vue接入真实确认与取消焦点恢复，未改既有style；新增runtimeChangesTransaction.ts/copy.ts分别为纯值规划及中英文文案。只支持该切片已声明的同场景值，不将结构/Prefab/scene handoff/originShift误算完成。逐字逆向和新文件不存在前像检查通过，原旧fallback/body保持。

Root实际检查既有同项目同窗口A6 GUI截图及raw动效采样：44逻辑像素输入/约390Inspector、可见圆角/标签留白；确认modal opacity0.70→0.98、scale0.9955→0.9998与180/240/320ms有限动效、取消后focus44且ghost0。它证明私有796该对话框，不证明最新Root803全GUI/全动效。

资源重导入确认缺陷：隔离RuntimeWorld没有simulationSnapshot，旧pushAssetReimportHistory直接返回，真实资源已更新却无Undo；紧凑JSON与canonical history还会制造伪pending edit。只改physics.ts此函数，重导入仅替换Authoring assets/assetFolders/assetDatabase，canonicalProjectText统一比较，无Runtime写入/停止。运行/暂停no-op保持Redo，单次Undo/Redo完整before/after相等，保存重开保留资源，非法type替换不添命令。实际生产Importer+PAK+Core+普通WASM+CommandHistory受控外部DOM/FileReader/GL四组52断言PASS。最初3次真实新失败及生成器失败全部封存。测试在Undo后的独立下一次Play前等待已有Owner.stop，未用此fixture修正宣称快速Undo→Play已修复。

Q4四路径从私有801证据精确合入当前Root803，48项literal edits逐项正/逆字节验证。workScheduler.ts增加可注入MainOwnerControlPolicy，仍共享队列count/bytes/conflict/epoch，默认Critical继续heavy；runtimeWorkerAudioContract.ts追加显式v2分类并保留v1；workerAudioBridge.ts增加actual ACK barrier、类别credit、cancel/listener清理；webWorkerAudioHost.ts按真实消息sequence执行、重验证state并保留terminal4096B直到实际late-codec/Dispose终态。没有把Ready长codec塞入短control。原兼容25检查与v2 19检查同post共44PASS、fullVue/Node/Player/publicRuntime0与Worker纯值依赖图0违规。

上述Q4 CPU为Node MessageChannel+真实Main AudioRuntime+受控媒体，非浏览器DedicatedWorker/可听声音/实际worker-engine资格。原Main Ready actual codec start缺Required lease仍mandatory；Core/Remote Owner/catalog ACK、Timeline异步诊断、真实Ready集成及独立Main Platform入口继续。短raw成本只记准备、传输/准入、实际执行与观察ACK，不相加重叠阶段、不主张净收益或正式QualityLocked/AdaptiveExperience。

I4-B1四路径fullVue/Node以及当前Rust纯harness9检查已通过并在封存，尚未Root合入；S4/C0仍实施中。S4真实无脚本新spawn没有当前Lifetime登记的FAIL已保留，Root核对Core与EntityLifetimeOwner后授权仅同Core ensureLifecycle安全点非空beginMany补丁，严格不revive retired。不得以Editor读取分配身份或安全拒绝结构来替代完成。

所有协议/调度关联第30/64表已分别写入Q4handoff和Root报告：世界/WASM/Frame/GPU未改，真实Core/codec/Worker/Timeline后续接线仍明确必需。Comfortable16/24/44、留白/圆角/Motion与精确输入不改。当前Root组合未做新full types/production/native，不继承旧800Windows资格。正式基准B0–B8/X01–X15、H1/H2、完整Rust World权威、帧协议生产消费、大包range、严格跨GPU图像、全动效与最终cold构建/发行仍未闭环；Linux/H2无环境仍NOT_TESTED，不豁免。

证据：
- E:/Nova_A/.cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/a6-six-merge-4IBbde/report.json SHA256 b08bf1ad6a421a148ac7563522e260aab560ff26d13fb65e54479e8984b84d0f
- E:/Nova_A/.cache/engine-overhaul/root-integration-next/asset-reimport-history-PI0xt8/sealed-root-report.json SHA256 1f671c88e382af1d09eb0a5ac555ae83d8c67eb31d99caffde6dc3b3a1399356
- E:/Nova_A/.cache/engine-overhaul/root-integration-next/asset-reimport-history-PI0xt8/actual-RvOcdx/report.json SHA256 2a974da73d8b36745b81cb05f6fb5f3f7af93a57d93887ca60cee534eb538e0c
- E:/Nova_A/.cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/q4-four-merge-qldc7O/report.json SHA256 58e4c67c04666961aa9d12e13169b502830f8c8e9e2c6f7ae156c1b4fbccac98
- E:/Nova_A/.cache/engine-overhaul/audio-B2-Q4-421f7a0c/handoff-jbreDv/handoff.json SHA256 a050107a73cefb0fe34308b27037c3f2dca99dc8e96ecf0cc373546ccf8b7203


### Root 集成追加 13o：2026-10-13 当前候选804与验收边界

本次继续基于 HEAD 82c9c03118848df1c07af323c38a3abade7dd21b/main，保护正式未提交改动。README此前已整理为真实项目介绍，当前121行、7314字节；本次未再次修改。主指令/AGENTS及正式700源码+native6保持原哈希。以下生产修改仍在私有候选，未接纳到正式源、未发行、未签名或上传。

当前源804 SHA eb97fd41e5452cda86bcfb3b8f0e37fffd697aee3de0400f1ae14e09c15659d7，native37/templates125及发行包装脚本2另列。完整逐项前后像/差异、失败原始日志和逆变换在对应Root receipt；不能将增加文件或编译成功当全工程完成。

- Editor入口1：去掉编辑器构建冒用独立Player身份/入口；Editor构建成功，独立入口按自身构建。B2五文件：明确Web逻辑目标与原生架构，保留无效既选模板为blocked，防止发现/挂载静默覆盖选择。42 CPU（33真实函数+9受控有限发现）及类型/独立生产构建通过；GUI/当前Native Ready未验证。
- 字体绘制2：真实Canvas绘制Context显式willReadFrequently:false，测量Context不改；不改AA/DITHER/渲染尺度/字体。初始RGBA与旧值逐字相同，20次缓存读稳定，12次真实WebGL2帧一致；原A/A像素漂移与被拒绝true策略原证据保留。实际DedicatedWorker Offscreen字体单项通过，不代表完整worker-engine。
- C1导出2：可信选定v2全10identity、真实build settings投影、有界静态依赖与保守目录证明、Web/web目标及原HTML字节相同index alias、异步发布前复核。76 CPU和六个types/production阶段通过；受控Editor/IPC fixture不冒称当前真实原生导出。旧v1路径的28字节恒等用例通过。D1原生先写前预检正在实现，v2有限anchor仍为空而blocked。
- 发行包装2：恢复全部21既有必需门禁并加核心motion为22；删除旧UI omission规则。product必须读取当前plan并核对所有前置报告status/schema/版本/时间/severity/实际SHA。61检查、38真实Node执行通过，其中正例报告为受控fixture；未执行本版全22真实门禁，也未建立完整M8外部认证。这不证明正式基准或发行合格。
- 音频完整13：同一Runtime Host/Core/lifetime拥有本地或显式远程接口；实际ACK后发布出生/退休、异步清理与Timeline、NEW remote Audio Owner。Root独立97 hunks逐字正逆变换+NEW整文件检查、58原始引用核验与803/37/125/2/711保护零漂移后合入。86 CPU通过、Vue/Node types+独立Player/publicRuntime构建通过，但该build基于代理冻结，当前Root804全组合尚未重建。远程Owner尚未由Player正式入口接入，真实Worker/remote Ready/codec Required租约/HUD/可听音频仍mandatory。批量begin真实RPC1，接受ACK发布额外native.validate由N变0，外部查询仍验证；5,000对象完整出生→Main ACK约1.29秒，仅单次CPU smoke，不声称净性能增益。

**容量归因纠正**：旧sealed Audio报告及Root合入记录继承的“identity-commit受4096 Control上限/100对象失败”结论错误，保留旧证据不重写。真实分类为Required；原131072 command/wire与4096 Control配置100对象通过、1000对象失败。首476身份chunk command130932字节，带scope/time真实request131420>Required credit131072。纠正报告capacity-attribution-correction-hjPtfZ/report.json SHA2583862f95c1b2da99961072875c849e3b0a5471cfe462e32dd39a91cb788f3c。须真正按完整envelope/实际credit分块，不扩预算冒充修复；该修复尚未实现。

S4原真实GUI7通过/第8 Awake删除FAIL/第9未执行仍保留；已授权在matching804的新四文件候选修Facade，未先把失败源合入Root。Tile/Pool实际诊断确认派生副本、inactive cache误拒与stream删除后重现；C source/Owner及host-local version1稀疏覆盖/schema30受控迁移方案已到文件末尾读取，仍是设计而非实现或验收通过。

当前M2核验：Rust已拥有物理、arena、clock与scene/component metadata；Transform图、批量权威写入和生产NVFP64/80尚未完成。既有TS Frame codec/生成常量不是生产Rust接线证据。完整Worker三模式、跨后端严格像素/设备恢复、PAK大包分页、全GUI动效/IME/拖拽/清理、实际B0–B8/X01–X15 warmup10s+120s×5及B8长时、QualityLocked与AdaptiveExperience仍各自未完成。H2与Linux只Windows环境NOT_TESTED，不冒称整体通过；未写releases/v26.37半成品。

证据：root-integration-next各locator editor-config-803-one、b2-803-five、font-803-two、c1-803-two、release-gates-two、audio-804-thirteen-merge-receipt.json；对应report保留actual hash、构建/测试原始记录、图像和全部失败。Comfortable16/24/44、四向留白/圆角和当前Motion未缩小或关闭。


### Root 集成追加 13p：2026-10-14 当前候选806与已验证范围

继续 HEAD 82c9c03118848df1c07af323c38a3abade7dd21b/main；本追加保留13o及其之前的全部原始前缀，按新证据更新状态，不改工程主指令或AGENTS。正式生产源码与已发行产物未接纳或覆盖。当前私有source806 SHA f7779ac8ba65d4a64f1280a0f606a0c2eaf0a5ac505b508066fa7820f49cf373；另有Player native37、历史template artifacts125、release supplemental2，共970唯一输入。此组合尚未整体重建或取得Native Ready。

S4四文件已Root合入（增加runtimeChangesStructure，更新transaction/copy/GameplayRuntime façade），新增Awake删除基线在beforeAwake保留；只有实际同epoch/gen退休ACK且对象已不在world时才确认tombstone。原Value planner不改，旧Apply取消/草稿/Undo保持。Root逆变换3 literal spans+NEW exact，并核验145证据引用。私有matching805组合7个types/production阶段通过，其中首Runtime driver缺锁定TS路径导致的工具准备失败保留，复制实际锁定121文件后原阶段通过，不更改类型检查断言。

真实编辑器9项原回归全部PASS：原6项A6函数正文逐字相同；新增Awake Prefab spawn、Awake destroy、same UUID replacement ABA拒绝。相同11对象/8资源、1600×900、DPR1、UI scale1；实际Edge147.0.3912.72/WebGL2 ANGLE RTX5060 Laptop D3D11，物理DPI未知。布局观测主文字16/行高24/input44/radius12、无overflow；正常动效启用。Root亲自检查comfortable-baseline与delete-structural-confirmation原PNG；12个modal运行样本观察opacity/短位移/受控回弹，取消焦点与ghost0。静态图不冒称动态流畅或输入到像素，运行样本不冒称录像/正式帧时间/全动效/高刷新验证。旧7PASS/第8FAIL/第9未执行的原证据保留。真实GUI还确认对象退休时面板把selected lifetime inactive误说成整个runtime stopped，另片文案修复尚未进行。

Audio C0三文件已Root合入：runtimeWorkerAudioContract按完整request envelope计量；Bridge缓存同channel真实capacity；remote Owner一次测量immutable身份并dense chunk，消除每追加身份反复全量spread/measure。Required131072与Control4096原预算不提高，协议/世代/终态不放宽。92 CPU受控范围通过；Vue/Node types、独立Player/publicRuntime4阶段通过（代理冻结804/968，非当前806全组合），依赖图没有Editor/Vue违规。实际100/1000/5000完整Main ACK通过，5000出生/退休各11chunks、最大request131068<=131072；Stop回收transport/context/lease/queue。Root逐字独立11步正逆证明、197原始引用核验后合入。13o所记录Required envelope缺口现在已实际修复；原错误control归因、原失败和correction继续保留。

C0串行CPU paired smoke记录原5,000出生到Main ACK1270.59ms/当前140.02ms、退休1285.31ms/162.61ms；source setup71.16/71.14ms另列，不把重叠阶段相加。范围为真实Core/Host普通WASM+Node MessageChannel+受控媒体的准备、分块、传输、Main验证Map与ACK，不包括实际Worker/codec/GPU/听觉/帧率。单次有计时扰动的CPU smoke不是正式性能收益，也不是QualityLocked或AdaptiveExperience。Main Map复制成本仍未优化。

D1原生导出预检四文件已Root合入。全10identity、target/Web架构、实际project/game/settings、依赖和索引摘要、所有entry hash以及原始Web artifact/index alias/provenance在任何mkdir/写出前检查。显式v2 branch不改变旧v1兼容入口；Root独立11 literal步骤正逆、NEW17442字节完整阅读、254 seal引用SHA一致；原v1解析正文及首次mkdir后整段73289字节SHA d355af267b89223fbc5e246f70c2b4aa4c66e62ac904b1bb48ade2e83454b029完全相同。真实业务模块在离线Rust CPU derivative54 packet cases/8组通过；actual prewrite prefix52案例的新目录未创建、旧目录sentinel不变；最终3个filtered groups通过。依赖27锁定版本/checksum同源。原fixture错改offset0、transient第三anchor数量断言、raw receipt诊断错误及runner EISDIR全部保留，未改生产判定使测试变绿。当前production ANCHORS_V2仍空，不能宣称真实Tauri AppHandle/IPC/export/Ready已经验证。

并行当前：M2私有Rust图/NVTC/schema+同world ACK接线正在实施，首Rust27/28仅新增fixture把合法generation254误当损坏输入，已要求保留并补Graph stale atomic检查，尚未合入Root；C6实际stream复活原FAIL已在private三文件修并原3组15断言PASS，六观察ports和后续host-local sparse覆盖/schema30仍未完成；Audio C1实际global codec调度/真实terminal/Player与Editor试听注入仍在实施。三代理明确所有权，Core属于C6、M2属于World/lifetime/graph，不互相覆盖；重构/构建重窗口串行，所有新阶段不继承旧800Windows资格。

工程余项仍包括生产Rust NVFP接线、完整Worker三模式/输入/Ready、真实新模板producer/完整导出与冷构建、大资源分页、跨后端严格图像（旧1pixel2channel失败未放宽）、完整实际GUI motion/IME/drag/cleanup、B0–B8与X01–X15正式采样、H1 QualityLocked/AdaptiveExperience分别结果。仅这台Windows可用，Linux/H2为NOT_TESTED而非豁免。UI舒适尺寸/留白/圆角/核心动效未关闭或压缩；README维持项目介绍。进度估算81%，不是验收得分；尚无releases/v26.37最终产物。

证据收据：
- S4 E:/Nova_A/.cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/candidate/../s4-four-merge-b9gSBW/report.json SHA256 ebd16a89d8fed56e31b9866f169a7d07b1d2c2d4ff6f96fc52658be2c55aa2a2
- Audio C0 E:/Nova_A/.cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/candidate/../audio-capacity-three-merge-9FDd80/report.json SHA256 77e214e599920d34afe954f5bf8151d0304e0e61d341c839308e6fe13d97593b
- D1 E:/Nova_A/.cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/candidate/../d1-four-merge-824gpS/report.json SHA256 9fea86993772db01e9ca5214aca20c94d720a47d4c9bde870a474c59eba216aa
- S4真实GUI raw s4-gui-XMr2u6/raw.json SHA256 657ee144d957833f20173251601b928adcd06a221f7daa648c02dc9d8beb1b21，modal-runtime-samples SHA256 b81d2add8fec081c3985807957713bcc714bd0e78677dfd95f98f620ed722197。

Root本轮合入D1后收据生成一次属性引用错误（prior locator为{path,sha256}，错误当{report}），已在同结果范围修正收据，未重写四源或吞掉错误；全部806/37/125/2/711 guards为零漂移。旧私有Font测试两浏览器确认其profile/父进程后通过Browser.close关闭，未关闭用户浏览器或删除资料。


### Root 集成追加13q：2026-10-14 文案纠正与模板登记工具

紧接13p后新增两项有限编辑，旧前缀逐字保持。当前私有source807 SHA 0fac463f48c1cc644f682d60e8636abdf6fde7899482a876ee7bb8c524ed8e62（native37/templates125/release2另列=971）；未接纳正式生产源，未注册v2模板或取得Native Ready。

对象来源copy-only：src/editor/objectOwnershipCopy.ts 原inactive来自选中对象runtime observation状态而不是整个world状态，实际S4截图曾显示退休对象时错误“运行已停止”。EN改Editor source values、DE改Werte aus dem Editor、ZH改编辑源数据；3精确literal正逆完全一致，不改World/对象状态、布局/字号/动效。新GUI文案尚未重放，保留IMPLEMENTED、非GUI VERIFIED。receipt E:/Nova_A/.cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/candidate/../ownership-copy-eXcyq2/report.json SHA 6f8c6477daa942eb94e18794d2bbfc9503bb247b23c607bc7ac1ed17f3d0835d。

NEW scripts/register-independent-player-templates.mjs：构建工具仅在隔离candidate执行，需显式reviewed producer report SHA及TS/Rust当前SHA。复用实际纯verifyIndependentPlayerTemplateV2，依据真实producer输入清单校验Node/esbuild bytes再执行验证器；完整当前source closure/Editor固定span投影、所有artifact/receipt/tool重新核验。只改初始为空v2表，旧v1保持；单文件原子rename+双文件journal及条件逆向恢复，明确不声称跨文件原子事务。返回REGISTERED_SOURCE_ONLY，不把登记说成实际运行。实际语法0、CLI错误source pin在任何表写入前拒绝（exit1预期），旧help0只对应早期code；还未执行genuine matching生产正例、生成Rust编译、IPC/export/Ready或写中断恢复。receipt E:/Nova_A/.cache/engine-overhaul/root-integration-next/runtime-player-adoption-work/candidate/../d2-register-tool-3XYdfL/report.json SHA 7b0733d6af28a059a259eff98c006333effc3d1010b267a898d8392462b75061，tool SHA7313e2532fbb3e346652ccede649a7fc5bf7ce8b5860e123846a7599121cbb93。当前两个anchor表仍原EMPTY，历史125产物未改。

代理正在继续：M2新ordinaryWASM与glue已真实构建、Rust30/30与raw World9/9通过；实际Editor reactive entities/Vue proxy的raw WeakMap漏接被确认，修完真实proxy/subset/physics前不合入或宣布Editor接线。Audio C1有限受控31/31正在唯一heavy types/独立production后接真实browsercodec/activation；C6来源观察/stream delete修复已测，但Tile/Pool稀疏Apply与当前schema迁移仍后续，原FAIL不掩盖。进度估算82%，完整门槛不降低；Windows之外Linux/H2仍NOT_TESTED，最终26.37未发布。


### 13r — cached ACK 接口接入与新增真实失败（2026-10-14 UTC）

当前 Root 私有候选为 source807：`048296e984c58e09c3db3253306aa0ac9e8db4e3120a53529548087f560a2770`；加 native37、既有模板125、release supplemental2，共971个唯一受保护输入。正式生产源码尚未采用此候选，26.37尚未发布；README项目介绍保持不变。

- **IMPLEMENTED / scoped VERIFIED**：`src/runtime/entityLifetimes.ts` 仅增加 `ENTITY_ARENA_MAX_SLOTS` 导入与 `readCommittedIdentity`。读取当前Owner已提交ACK的冻结副本，校验原对象、UUID、epoch/index/generation及Owner状态；不调用Native validate、不创建新lifetime。原13方法体逐字保持。Root两span整文件forward/inverse与807/37/125/2/711保护清单均通过；独立普通WASM端口测试验证1000次缓存读取无额外Native validate/begin调用。证据：`.cache/engine-overhaul/root-integration-next/cached-identity-port-rHymiK/report.json` SHA256 `3cff41c9dc5cfc665f3778cb0b5dc1987ea2a772e57f3b774dfe275f674bcc9f`；child端口报告 `.cache/engine-overhaul/m2-rust-transform-XUUedM/port-only-BZhh0k/report.json` SHA256 `b9c4ef1334d3dd839dc864c33292361fd5fdffa8d11343896dfb7fff432b6a5b`。这是缓存身份接口，不是完整M2变换、C6生产源格式或GUI验收。
- **CONFIRMED / BLOCKED MERGE**：M2真实普通WASM在17层合法有限缩放链上，retire父节点或beginReset会在提交Arena后触发 `TRANSFORM_WORLD_OVERFLOW` panic；panic后Native查询出现unsafe aliasing拒绝。原始失败 `.cache/engine-overhaul/m2-rust-transform-XUUedM/lifecycle-orphan-7SycII/report.json` SHA256 `a4b513f55e6b03cf323bfccb9c1732e2d62245067ec254d5b6efa65b19df0a5c`，WASM `732b06f74c98af8e37e55b4c3a2e5c27140ba396ff8780a8dc5665d29e4d1200`。未合并此缺陷源码。授权追加Arena prepare/commit窄修复：保留原touched-slot算法与错误优先级，双计划全部验证后再做不可失败提交，不克隆整个Arena、不更改WASM ABI。修复后必须重新冻结、生成和测试，34/34旧结果不得继承。物理旋转触发溢出的关联假设另在核验，尚不宣称确认。
- **C1 isolated IMPLEMENTED / scoped CPU VERIFIED**：25个512B资源被固定64MiB prepare额度拒绝的真实失败已保留。改为同Scheduler计数、实际压缩字节逐次预留、FIFO IO preparation、真实terminal后回收；取消Reader晚拒绝的cleanup错误不再被吞。当前13 owned/89 literal私有候选，33项Main容量/终态用例、11项Reader/epoch/复制预留和12项默认调度对照通过；89 literal整969输入逆向与原播放/Owner/Core方法体保持证明已完成。四项类型/Player/publicRuntime构建通过，报告 `.cache/engine-overhaul/audio-codec-GolMGH/types-build-YbfPjp/report.json` SHA256 `fa6851de6ba9d045ea9ceeb1c3ddd2c326539acea23f5bef0f851632fb02bf2b`。真实浏览器解码/可信激活仍在进行；未合并C1，不继承为Worker Ready、听觉或性能验收。
- **C6 isolated**：跨scene_load的同Run来源撤回、真实component replacement、full cached ACK和连接端点复用仍在补真实路径回归；旧3项structural Apply失败继续保留。T格式迁移未实现，不以观察器接口冒充完整Apply。

总进度估算仍82%；百分比不是验收门槛。Linux/H2缺实际环境，QualityLocked/AdaptiveExperience、完整M6、全部动效/长期负载和最终发行验收尚未关闭。禁止将上述局部PASS改写为整轮完成。


### 13s — 物理故障、观察器容量与真实缺口（2026-10-14 UTC）

补充13r之后的新事实，不覆盖旧测试/状态：

- **CONFIRMED**：phase3普通WASM在6层每轴scale1e50、叶x=y1.3e8、最上真实body旋转π/4场景，teleport发生Physics提交而Graph返回溢出；single_step直接panic并锁住Native包装器。第二次实际几何证明 `.cache/engine-overhaul/m2-rust-transform-XUUedM/physics-overflow-VBDxez/report.json` SHA256 `c773b3b57f222438a625cde98a1bbdc252b16540d0ed12be8c4bde43e3756777`；第一观察器错误fixture及原raw保留。
- **IMPLEMENTED / NOT YET VERIFIED**：M2私有14 owned新增受影响行Graph准备、原Physics角色移动纯preview与旧setter委托；固定步不可表示数值进入明确FAULTED终态，不声称回滚已执行Physics；WASM运行/查询/帧入口拒绝后续使用而诊断/free保留，World不回退到旧TS投影。新增Physics writer `crates/nova_physics/src/query/mod.rs` 前像 `c2ceabfe1608417fde8400f3a583ab0c3c28491029d6470f2d5ee17fd02c2de4`，原纯计算span保持。当前重新生成资格进行中，旧phase3资格不继承。首轮Physics98/98；Runtime40/41的新测试误用无step时空state_buffer，第二次又误将published-state checksum作为live body修改证据；两份原始失败完整保留，改用实际overlap/raycast几何断言，生产代码未为测试改变。
- **CONFIRMED missing production integration**：当前源码仅有资产/布局/job worker及Input/Audio worker端口，尚无同时拥有模拟与渲染的实际Engine Worker；worker-engine/worker-simulation/single-thread三模式M3仍必须实现。现NVFP V1有共享schema/编解码/守卫，但没有生产Runtime/Renderer调用，不能以协议工具类宣布真实帧管线完成。
- **C6 isolated scoped VERIFIED**：12个真实TileMap当前512×512包含9,437,184数值，最低估计75,497,472B超过64MiB，旧capture仍非null且诊断仅95,184字符字节。NEW helper补整capture共享逻辑owned-copy预算，按值8B及文本key逐项预检；原失败后2组8断言通过，预算边界5组58断言通过。旧authoring serializer仍会先JSON/数组克隆，临时内存/真实heap unavailable；不宣称整条heap硬上限。后续前置visitor为独立关联切片，尚未扩大writer。
- C6旧六源冻结 `.cache/engine-overhaul/runtime-structure-C6-iWyMc8/sealed-c6-PeziRu/source806.json`，7项类型/生产/边界出口全0；报告同目录 `types-production-report.json` SHA256 `f36b9dab2981ed84370dccfcf455cd7f74685c1312939527284f1cfcceab7671`。此后同NEW补终态host引用释放，旧资格不继承；在held lease/取消/stop/回调重入/失败后验证只保留状态，不持旧World。source强引用链确认，不称已有GC长测泄漏曲线。
- C1四构建通过的89literal仍私有；真实浏览器激活尚在环境恢复/测试，不冒称已执行。构建/功能窗口串行协调，真实UI可能并行，所列时间只诊断，不作为QualityLocked或AdaptiveExperience性能提升证据。

Root source807与正式711保护清单重验0漂移；本次仅追加跟踪与逐文件账本，完整M2/C6/C1尚未Root合并。正式README仍项目介绍。当前估算82%，不替代实际门槛；26.37未发布，Linux/H2/真正显示延迟/完整GUI与性能验收仍按未测记录。


### 2026-10-14 — scoped C6/C1 integration and M2 review (13t)

当前 Root 私有集成候选为 source809 / 973 受保护输入。C6 六文件已合入：GameplayRuntimeCore、worldGameplayOwner、runtimeSceneStreaming、tileSceneOwner、objectPoolOwner 及新增 runtimeStructureObservation。最后 NEW helper SHA 930d1aca…461c2a6；最终四类类型检查、独立 Player/Runtime 生产构建与源码边界七出口均为0。当前终态修改的8份功能报告 / 30组 / 324断言通过；旧源码的48组478断言单独保留，不冒用其资格。Root已独立审查五MOD完整diff和NEW全文件，复算74 MOD与97 NEW字面链。正式生产源码未采纳，完整C/T未通过：Tile/Pool Apply原三项失败保留，schema30稀疏placement覆盖、实际加载和Apply正在独立T切片实施。现有serializer临时峰值仍未被观察器逻辑预算完整覆盖。

C1 音频13文件已合入：audioRuntimeContracts/audioBuffers/audioRuntime；webAudioHost/webRuntimeWorldServices/webPlayerSession/webPlayerEntryHost；audioAdapter/runtimeWorldHostPlatformAdapter/editorPlayWorldAdapter/PlayerApp；新webAudioDecodeExecutor与workScheduler。Main33、Reader终态11、原调度12项受控CPU回归通过；Vue/Node类型与Player/公共Runtime生产四出口0。Root独立复算89操作（91字面位置，含NEW与三处all替换）全前向逆向，播放数学及原Main同步语义保持。字节预算只描述自有输入与保留副本，不声称浏览器内部codec/GC峰值。真实浏览器可信激活、输出、解码 NOT_TESTED：Sky启动审批超时；Edge/IAB不可用后出现未知Edge窗口，因工具无法可靠识别URL而政策停止，未导航、未点击、未创建新窗口。唯一自有HTTP服务已退出；未知窗口未操作。不得用CPU或构建替代真实激活、audibility、Worker或Tauri验证。

M2 十四文件旧scope已封存并由Root独立审查，不在本条宣称Root已采纳。Rust Runtime46/46、Physics98/98（匹配查询源码且原失败保留）、WASM check0、全新ordinary release0；新WASM SHA b706c1b7…cdf534b / 3,177,219B。实Native5组、World18项与四类派生入口类型0通过；Rust构建使用已存在依赖缓存，不能称cold完整发行。真实JS正常44值、旧58签名在所注明phase3对照保持，新增failure_json；故障记录已完成物理步、取消未执行债务、释放权限并要求新World。Core安全故障停止尚为独立切片，其正常Main18回归通过，真实故障/完整宿主清理仍在验证。

独立真实World复现标为CONFIRMED：S4/C6 current serializer可能导出尚未Native ACK的局部意图，有效实体身份并不证明变换已提交；正确显式commitPending真实拒绝overflow。另两wrapper严格断言为真正FAIL：teleport返回false后Graph仍从0改成1e8，Physics真实几何仍在0；Character成功后raw scale1e80被二次setWorld回写为1e50。旧14的Native-only资格不能覆盖这些wrapper。保持原FAIL，独立World/Rust窄修与快照前一次提交边界为发行阻塞，不放宽数学或断言。

生产worker-engine目前 NOT_PRESENT。现有Input/Audio端口和FrameV1 codec不证明完整引擎线程或NVFP生产消费。M3/C2正在独立809候选中复用真实Core/World/Host/Main音频Ready链；worker renderer还需Session、DOM HUD及WebGL2/lighting/renderTexture画布创建入口关联改线，不用伪document或sprite-only降低功能。本条未运行新GUI/GPU/H1/H2/B/X/最终22门槛，Linux/H2设备环境缺失仍NOT_TESTED。Comfortable尺寸与核心动效未因本切片修改；README保持项目介绍。

证据：Root C6 c6-six-merge-VvqDJW/report.json SHA5b44b884…483685；Root C1 c1-thirteen-merge-10kPPk/report.json SHA820b6054…cd7838；Root独立M2 m2-fourteen-independent-review-HJCubv/report.json SHA5c07770d…fa8611（含未闭合事项）。均在 .cache/engine-overhaul/root-integration-next/。M2 seal在 m2-rust-transform-XUUedM/recovery-9uA14r/sealed-report.json SHA46f1cd06…0a9ec5，pending原始复现在同目录consumer-ULnJhC/pending-serialization-finding.json SHA0e0caaf1…be998。完整原始路径、hash、上下文见各receipt，不以缩写代替核验。

## 2026-10-15 — 13u：恢复后续切片、格式30与真实捕获边界（未整轮验收）

- 当前 HEAD `82c9c03118848df1c07af323c38a3abade7dd21b` / `main`；只读工作区统计仍为486项（153 modified、333 untracked，排除禁止文件）。保护原未提交内容及历史发行产物。README仍是项目介绍，本次未改README。
- 原809/973候选及正式711保护输入均无漂移。新的T1父候选位于 `.cache/engine-overhaul/root-integration-next/tile-contract-adoption-iNjp3o/candidate`，输入976（source812，新增helper和两份迁移测试输入），全清单与原父、正式守卫分别验证；不覆盖旧候选。

### 已封切片与证据范围

1. Core故障安全停止：`core-fault-stop-LAcOb9/sealed-core-final-T2jzem/report.json` SHA `51de3c02f4514c173fd48e778b49105335da66b1b5dd6bf3e0b6a5d41d41f97a`。仅Core后像80e51ef…a81f；11 literal正逆、原77正常方法体逐字一致；真实普通WASM下故障5/Main18/Audio22共45组及7项类型/生产/边界出口通过。资格不继承到后续Core输入或捕获新增分支。
2. 暂停恢复输入独立修复：Core84bd47…e696；立即释放旧held后不在首帧再次清掉新按键。`input-resume-LHUwdP/report.json` 及 `engine-worker-l50BLu/engine-functional-rSIPDU/report.json`（9/9）保留原失败。仅受控时钟/Node通道/真实旧普通WASM，不是浏览器输入或新格式30资格。
3. T1八文件：新增host-local placementOverrides v1纯值合同；components/校验/TileMap归一化接入；TS/Rust项目schema29→30；两份迁移夹具保留5–29并加入30。15日志38 literal全前逆；60组件726原字段映射为708可移植值字段及18 typed references，parentUuid用结构关系表示，新覆盖字段单独加入。零、负、极小和大有限缩放可表示；不是允许加载器跳过奇异逆变换校验。
   `tile-placement-contract-T1-cFJw0o/sealed-t1-ws6kJN/report.json` SHA `cdeda6f5f4829af51afe3d9e7e2229c79bf29d93de5d761f9ac548ff4866c5ab`；Rust54（原49+新5）、四types、Player/Runtime生产及源边界8出口通过。Root独立审查 `tile-contract-eight-independent-review-rSNJvt/report.json`，Root新父收据 `tile-contract-adoption-iNjp3o/report.json`。真正placement加载/Apply仍在T2实现，合同通过不代替功能。
4. C2远端音频Ready三文件：私有证书和Main保留解码lease经过prepare/confirm/实际Begin ACK后释放；本地同步Ready/Main媒体trace差分保持一致。24操作/25实际替换正逆、12组远端及5项类型/生产/边界通过。`engine-worker-l50BLu/c2-seal-OyDfO1/report.json` SHA `09aadaf9b313914e65c4ee9f44db2835ac3015b52d506001b3196b4d0fec3f3c`。4 NEW Engine模块只是另列受控功能草稿，未完成真实图形Worker入口，不更改默认模式。

### 正在集成与真实未过项

- World事务片：teleport先Rust物理/图计划预校验再写；角色移动不重复提交规范化缩放；显式操作同时支持Physics/Animation并重置显示历史，普通fixed-step仍Physics-only。Rust48与WASMcheck通过；新增普通release WASM为3,261,446B / SHA `934edf90a39ed76e59f81b79f08736df4d76b8ac122c791741f180ca2fb1b187`，包含T1格式30。`world-wrapper-recovery2-YB4e9Q/ordinary-build-0GncFG/report.json` SHA `746726e06a8cd170f0b0d4f206e0258e9f56b1e2f2a4cae66b32381ecbfd4890`；使用本地target缓存，不能称冷构建。
- 原W02还揭示prepareQuery/synchronizeRuntime/writeEntityRecord/normalizeEntity写回raw scale的深层关联，已扩展geometry显式Runtime-owned策略，保持默认完整规整及旧惯性尺度算法；原W01/W02和World20新复测通过，四路径最终封口/生产资格尚待。中间W02失败保留。
- Root `runtime-pending-gate-PeGuuu` 实施三文件/四处显式接线：Facade Apply先权威flush后再次验证身份；observer每次显式capture先回调并重查live；Core真实host注入World.commitPendingRuntimeTransforms。没有逐实体隐式flush，不推进tick。实际observer6组33断言通过；新配对WASM下原S4实际Apply10组160断言通过。
- 新实际捕获四组中，G02（真实Core单次ACK且无frame推进）及G04（真实Apply+一笔Undo/Redo）通过；G01/G03仍FAIL：Rust拒绝TRANSFORM_WORLD_OVERFLOW后前端Authority无条件fatal，导致实体arena/graph revision2→0。当前不得宣布原子拒绝路径完整通过。原断言不改，正在独立区分可信提交前Err与未知trap/ACK损坏/真实终端故障。`pending-actual-xkbraB/report.json` SHA `737f0ff4e5a6d485ad4487789ca5d4cdb6238b3aca050972b61ca7b95ba9d000`。
- G04最初持久化角度直接比较raw .3的前提已修为现有normalizeAngle(.3)精确值；G02原生raw .3断言不变，无像素/数值容差放宽。首版外层断言中止报告、诊断和修正前脚本均保存。
- T2已确认真实clone和TileMap Owner快照路径：只冻结Owner自有detached snapshot，作者组件及输入表仍可编辑；整表替换/既有revision更新生效。真正TileScene overlay/跨placement/源连接映射/Apply/save重开/Player尚在实现。
- Canvas/媒体后续层独立于C2：真实Offscreen工厂/同HUD/同atlas算法正在迁移。已复现Media.dispose在其他真实终态未完时提前拒绝及派生unhandled问题；窄修复与有界错误回归进行中，不以取消Promise冒充解码终止。
- 旧pkg/physics-command-build-manifest.json仍是冻结历史输入；本次普通包来源由新的独立构建收据与逐项SHA确定。尚未完成最终发行manifest/冷构建配对，不将历史清单当新包来源。

### 验收限制与下一步

主指令0–68、AGENTS及已批准路线不变。保留自研WebGL2、普通非SAB兼容、Vue编辑器、舒适16px/44逻辑像素布局与核心动效；本次没有缩字号或禁用动效。当前没有新的GUI/动态录屏/GPU/正式性能证据。之前浏览器工具停止与IAB不可用仍有记录，不能通过CLI/CDP绕过或宣称目视通过。
继续修复真实拒绝路径、T2实际加载/Apply、完整Worker平台入口/NVFP生产消费、跨后端图像差异、D2新模板与发行全门。QualityLocked与AdaptiveExperience均未新增正式测量结果；Linux/H2因仅本Windows机器保持NOT_TESTED，不改分母。本检查点未生成发行目录、上传、签名或push；26.37的11项正式发行仍待必需门通过。进度估算83%不是验收通过率。


## 2026-10-15 — 13v：真实事务拒绝闭环、来源身份与Owner终态（未完整验收）

HEAD仍为82c9c03118848df1c07af323c38a3abade7dd21b / main；16:00 UTC只读状态486项（153 tracked changes、333 untracked，排除禁止文件）。保护正式711输入和旧产物。README保持项目介绍，主指令0–68及AGENTS未改。以下源码仍在隔离候选，不将它们称为正式生产采纳。

### Root组合与实际拒绝修复

13u当时的G01/G03失败已在后续独立Authority片修复，旧失败不改写。最终runtimeTransformAuthority后像d6ea77…c6a9b只改变submit，六literal全正逆，其余21方法体精确。只有可信普通WASM原子Err且Native revision未变才是可修正拒绝；未知trap、ACK/视图损坏、提交后变化和真实World故障继续终端。实际尝试、字节与Native调用/探测成本如实记入。Root当前983输入组合包括World四路径、T1格式30、Core安全停止/输入/捕获、C2三路径及匹配ordinary934。七项Vue/Node/Player/公共Runtime类型、Player/Runtime生产、源码边界全0；原S4实际Apply10组160与原拒绝捕获4组47通过，后者不再出现拒绝后arena revision2→0。

- Root七项：runtime-pending-gate-PeGuuu/seven-integrated-bBgTBM/report.json，SHA6cdc75ecaeef79fb9c2613bd70cf60fd8a37ec50b024e6578aff6430716ac883。
- 独立整合复核：core-fault-stop-LAcOb9/pending-integration-review-i0Gk8x/report.json，SHAb8b3dd207b2646b9cf7058ef1c9a3e28199dfda2fe5041fb101f1fc11f1c3d60。14 rawlogs、实际产物与934配对核对；正确大小写独立扫描无禁止依赖。旧pkg sidecar依旧不能冒作本次构建来源。

### 精确来源观察，非UUID猜测

Root观察器四层共33个literal，最终2cb7cf6b0255d3308d5422c9fe09a773ddb5b7e667502e8aad5412c6c4622c51：typed source/added映射；真实预激活connection值和坐标；显式capture包含World新增未登记connection但其归属和原始基线保持unknown/null；已知身份不能被显式空map擦除后换UUID。没有逐帧扫描、Native写入或World修改。连接端点仍按实际对象/token/lifetime投影，不凭名字、克隆UUID别名或端点推导Tile归属。首次空map可以未知，已删除来源extras合法，省略sources的旧生命周期保留已知身份。观察失败不改变游戏世界。

原22组150及原捕获6组33通过；独立新12组143验证空map首次丢失即失败/终态一次/不可复活/无World写，原9组45真实绕过复现保持不变。另实际端点ABA/retarget/detachment3组580独立通过。证据root-integration-next/sticky-source-identity-ThC7oE/report.json SHAcd95e6074e3bcfe3d738eeaa4238d430c2e227b301102e9fd24b39b8c8ef5095；独立observer-three-review-GDTuUk/report.json SHA76d9b601e1c932520207352b7e79ee13ea2104a360c3fb684b510d8504cf19a3。本段未继承整应用类型、实际Tile/Core、Apply或GUI资格。

### Tile实际加载与Owner失败停止

T2七源/25日志82span已独立全正逆；首片26组243、七类型/生产出口通过，但审查另复现替换后activation抛错仍缓存active。T2冻结原样，不能以旧PASS盖掉该失败。T3已实现同World分阶段scene lease与sticky runtimeFailure，准备失败保持可修正；不可逆retire/activate错误不伪回滚Awake、不留下false active、不在同Owner静默重试。Core独立3literal/4span后像d89461…4555接实际Owner getter与Native既有停止协议；77其他方法体精确，原beginSession完整体逐字移至private running入口，直接Begin也有故障边界。

真实ordinary934+当前World/Core/Tile路径注入activation异常：Begin/frame/step三入口均同原Error、Core停止、input订阅清零、观察取消、Native故障标记仍false、禁止同Core重跑；健康SHA prepare拒绝不停止，修正后真实Native incarnation正常。四组PASS：tile-placement-leases-T3-yxmUOq/native-owner-terminal-yxLvMF/report.json SHA344afd859b41f4f4c320c8d5ec5cae02f823820152599ca6554ff2b1c868da4d。它不代表完整T3跨resident、真实脚本Awake外部效果回滚或Player通过；跨placement完整图与primary源映射、Tile/Pool Apply/save重开仍在实现。

### Worker真实平台路径与边界门

Canvas20源原独立审查发现Atlas合法512MiB声明被Worker128MiB门误拒，正常2×2也失败；后续仅Atlas用途明确分流，不扩大普通image/font界。实际Owner→adapter→同scheduler默认额度、低硬件heavy1/串行、取消终态已测，五类型/生产出口通过；保守预留不等于实际heap测量，显式低内存不足会拒绝，整Player fallback仍未完成。

Session8既有+NEW完整Painter封口：原Window与纯平台组合共用同PAK分配、同World/Core/lease；原Main同步入口保持；WebViewport实际使用包含Scene/Lighting/Post/Debug/HUD/RenderTexture的共享绘制；Engine接管先实际Core音频prepare，Main BeginACK与释放串联。取消旧timeline Promise不再误报当前会话故障，真实当前错误仍报告。五出口、Session6、timeline6、原remote12及local完整trace差分通过。engine-worker-l50BLu/worker-integration-7RbLDp/seal-GonuFl/report.json SHAcc433d4477e672d6999355fe98ce0d7bdcccaa839f3a145100748f1702b817fe。此层仍旧schema29匹配包，不能继承格式30或真实Browser Worker资格。完整Host/Player/Editor选择、DOM/IME/a11y、Save跨realm持久化与fallback尚需实际接入；默认未切换。

另外独立修复两路径依赖门大小写缺口，保留原四种文件名source/Vite放行复现；原16+新8拒绝+2正常Core=26组通过。boundary-filename-byBIBX/sealed-HnWV97/report.json SHA74305440ccdc62958625ca00ab9f549ae69c81bd012930a529277f6c1b270851。新构建脚本输入须重新建立最终buildId/产物，不继承Root旧生产identity。

当前粗估86%不等于验收通过率。保留Comfortable字号/44逻辑像素/四向留白/圆角/核心动效；没有新GUI、录屏或正式性能测量。严格跨后端图像门、完整NVFP生产消费、原B/X/H1规则、QualityLocked与AdaptiveExperience分开采样、D2新模板和发行22门仍有必需未过项；Linux/H2仅Windows环境下仍NOT_TESTED。没有26.37正式11文件发行、签名、上传、commit或push。以上相对证据路径均位于.cache/engine-overhaul；完整literal与SHA见对应report，不以文字摘要代替原始证据。


## 2026-10-15 — 13w：精确来源、观察坐标、Save终态与Worker真实接线（仍未完整验收）

继续沿13v推进；HEAD仍82c9c03118848df1c07af323c38a3abade7dd21b/main。正式源码尚未采纳以下隔离候选。Root现有共同清单2102项、28层，sources-stage2.json SHA9ff429de706a88e76b95430c892503ec4e640e7e4135372adfe48870482085a5；其中1105项为明确当前工具输入的只读纳入，不是1105项产品修改。旧711正式/983父层反复0漂移。README已为项目介绍，保持不变；主指令0–68、AGENTS及旧发行不改。

### Tile/场景生命周期及来源

T3最终v8四源32日志/113位置已封：完整graph先准备、精确source lease引用、退役后提交且Awake一次，sticky Owner failure不伪回滚。七项类型/生产/边界全0；qualification-v8-final-ewn5Ib/report.json SHA5ddc673205db9fa77712ad8d5db2de09c9d4aa9b682287e501c7f9d6b7b64123；真实Native root-source3/cross-scene2/terminal4分别通过。首次vue报告的Error.cause目标库与Root日志参数三参错误已各自窄修，旧FAIL保留。Primary五源25+9literal和Host reporter1literal保留真正构造source对象、同对象退役再begin及同UUID冒名对象拒绝；Root实际Native两组通过，不以UUID猜来源。

后续T3b三源18literal保留精确world-retained stream来源与取消journal；12 Native+26兼容/236断言PASS，seal report255df1143cb0e7d30f708ad9a7653cc7f145a1b474a0bba275468b56c6b73ff7。T3c ObjectPool单源7literal，Prefab构造时捕获真实source/added映射，3 Native PASS，seal7f29bc9d9db9cbae59b905ac9d9320203ce73b8a9639f328203f67d55c2edb4b。T3d WGO/Tile两源7literal修真实transition后残留对象重复spawn，7 Native+26兼容/236 PASS，seal8c91c4fe75066e987b7118791777185c4257b6a63f3fcb7ecb8643909b2a2709。原marker误复活、同source duplicate和2!=1原FAIL均保留。所谓Core把Tile来源覆盖为scene的猜测实际NOT PRESENT，未对Core/Host进行无根据修复。共享tileMapOwner几何2literal只导出同一实际descriptor计算，128cells与3非法/overflow、5 Native+20兼容/180 PASS；f30189650c506a2e6f4937c9d27397b0045b25e3df496a43946c27472b53055c。后续片未单独重复全构建，等待共同集成门。

### Apply入口与观察坐标

GameplayRuntime.ts四层累计33逻辑/34物理：真正pre-Awake observer lease；暂停时权威flush与完整当前身份；每memberToken脚本编译契约；inactive Tile/Pool raw缓存不靠Native begin补全；pre-Corebegin冻结同lease SceneManager.data及UTF16聚合预算、同Core真实catalog读取。旧六组中缓存脚本A/B历史混用真实FAIL保留，第三层独立14组94及第四层真实SceneManager/catalog14组85通过。独立报告facade-token-review-JNMf3i/independent-review.json SHAa26b1c5c5c2e2a858ef4907e724c6da769edf46c98580ae96f5dbb9545f479cd；facade-admitted-review-eBHqQN/independent-review.json SHAab8b7e93db7950b3fcecfd02b39f5317552db2ba9268ae844f4e1e58303b330e。这些是方法/契约验证，不是完整Apply/Undo/生产资格。

实际ordinary934坐标复现CONFIRMED：旧场景退出后local=-100不再随global offset100→300移动，以全局坐标恢复得200而真实绝对位置0。原native-detached-coordinate-YLSluP业务FAIL完整保留。Root四源23literal候选仅在观察启用时收集World/Stream真实受移动引用，保持Native/pose/cache位移顺序；Observer成员与connection新增currentCoordinate，历史值保留实际最后参与的坐标，部分origin失败使观察失效而不吞游戏异常。observed-current-coordinate-wC6Zxv/stage.json，逐项正逆与parse0；同实际Native新报告native-detached-coordinate-PzIu6i/report.json SHA35112c644c8d05457db14f55186e43bc4325b1e48693ca89a965a778ed2b9d59通过原场景，更多cache/rope范围与独立审查在进行。

T4三Editor源仍在实现，按真实事件revision/完整来源组及token选择incarnation，复用原严格S4；未admission作者记录保留；Pool活动snapshot、Tile稀疏override、每行坐标正在关联。原观察Apply的三FAIL尚未被新完整Apply/Undo/save重开证据关闭，不宣称完成。

### Save身份、顺序和预算

Save三产品层33+11+8literal最终3d38a847e1579011158de05cdfedda71f80e72fdc5097d2567a49dabb0718d58：完整1–128 gameId独立namespace、仅可证明旧identity迁移；旧exact80歧义拒绝且保留bytes；小型保留marker防旧slot复活；草稿revision防迟ACK覆盖；真实commit/delete/recover顺序fence、write重入屏障；被supersede但尚未完成的ticket继续占32额度至finally；已准备UTF16 source总20MB/每save10MB。原慢A覆盖B/delete和32pending被误计1的FAIL原样保存。最终27组714+旧25组224+Editor10/Save15通过；真实磁盘/断电/跨realm OPFS/跨mode尚未验证。final-association-report.json SHA550f6b2c9fde29df2afe11bb31f448d01025cbd1628d4da8a1337665ef6c4571。

工具层仅runtimeSaveOwnerContract三literal+NEW精确patch fixture，固定完整SHA与54处逐位置逆向，不接受未知中间版；73组454 PASS，contract-final-9GoaJC/report.json SHAbccad53ec10cb624485935a97b0ddc04c3791c676411967a5956dfbff7048ebc。该五companion原source契约是闭合formal证明，不能冒作新common Core/Host已通过。Root全部54处独立复核save-final-source-review-PraKn7/report.json SHA2019fa65a98314d46d1a10969e48d922fbee42b050edbbe264c5c4da2bba177f。逻辑字节预算不称物理heap/磁盘测量。

### Worker绘制、HUD、UI音频与Main控制

完整Painter四源13literal+NEWsession：同自研scene/light/post/debug/HUD/RT管线、DPR与renderScale分开，实际filter探测/显式GL拒绝；seal-EInwXV/report9e25ab975c81cf4612014d9e301df7bb2f4377772b2f923795500e2dc2c3f335，7renderer/9Engine/6Main及五出口PASS。HUD三旧13literal+三NEW仅primitive DTO，可靠命令count+bytes、snapshot1在途+1最新、IME退出一次finalize，旧blur丢IME等失败保留；seal-nEYXn1/reportcd4f5ed43b66ca9a5fbcaa5410ab07f6b5366effbe051b7737dd500f33355558，14功能及关联五出口通过。

UI音频三旧9literal增加Worker真实playUiClipAsync与已有Main UI route连接，不是另建路由；资源uuid/hash/当前lease、真实声部接受bool ACK、旧会话取消不误报新故障。11功能+旧remote12/本地差分2 PASS；seal-ep8aWr/reporte53dee0d40aab52a707e2626a10bbe049137ea0537bb9bfd321bbe0ce4779e38。NEW workerPlayerHost20438B/da74e0bb1a99ba7abad4d205681551d841f3f416cf7b394c648192fc9d75e5d3：原Input单消费者ACK、控制count/bytes、真实scope/epoch、合作Stop后Main services终态；首轮并发dispose移除audio ACK监听导致死锁原FAIL保留，修后真实Node MessageChannel→Engine/Core/World/音频12组PASS。超时独立记timed-out不伪ACK；seal-pSe9bk/reportd038dbeff9c671b286ab8eb289f3ab47e433e9c278a4d563d5d5a367b2b90517。

以上Worker独立功能仍旧普通WASM schema29范围，不继承common934/schema30。真正compiled DedicatedWorker bootstrap、能力gate、同PAK只读Main audio metadata且无第二World、原Input单消费路由及真实fallback/remount仍在实现；同步Save/haptic/字体不等价必须明确降级，不假bool。Worker子图buildId/依赖边界待关联。默认未切换为未验证Worker。

### 真实限制与下一步

当前约89%仅工程估算，不是验收率。继续T4真实Apply/Undo、共同类型/生产/边界与匹配934、compiled Worker生产入口、NVFP实际producer/consumer、严格WebGL2/WebGPU图像门、D2新模板、原B/X/H1正式采样及发行22门。现有strict图像FAIL不放宽像素容差。Comfortable16px/44逻辑像素、四向留白/圆角/核心动效保持；无本轮新GUI/动态录屏/真实GPU/正式性能结果，不把构建或NodeChannel当目视/跨realm证明。QualityLocked与AdaptiveExperience分别NOT_TESTED，无新功耗/真实呈现数据。Linux/H2仅当前Windows机器受限仍NOT_TESTED。没有26.37正式11文件发行、commit/push/上传/签名；new.py从读取/执行/修改/打包清单排除。全部相对证据位于.cache/engine-overhaul，精确文件/每处增删由seal/literal清单确定。

## 2026-10-15 18:47 UTC — 共同源整合、真实 Apply/Player 与 Native render-pose（13x）

状态：约90%为工程估算，不是整体验收率；当前HEAD仍82c9c03118848df1c07af323c38a3abade7dd21b，保留正式脏工作区。以下新增实现仍在隔离候选，未整包采用或发行；Root当前共同源sources-stage5.json精确2116路径/42层，SHA49256d22960d48607540fa80fc022d679a38e263587245726e859d7b9e66b695。每处新增、删除和替换以相关owned/edits/literal与前后SHA为准，不把最终文件名当验证证据。

- 坐标记录：observed-current-coordinate-wC6Zxv四源23literal为实际仍存活的实体/连接记录各自currentCoordinate；Observer借用冻结修1literal（c9c3）；WGO跟踪移到Observer容错边界内，Set仅保存实体原引用，避免可选跟踪异常中断实际origin/camera/navigation/particles/scene/stream执行（c00b）。原真实Native脱离scene后原点漂移FAIL保留，新Native detached坐标恢复PASS；独立12组122断言与额外unwrap故障门PASS。World12bc只增加Observer通知，原Native与缓存平移顺序不改。
- Facade实际会话来源与TileSet查询：admitted-scene-sources-15qKZQ五literal只读取本次PAK已准入SceneManager.data，保留未准入作者场景；独立14组85断言PASS。actual-tileset-read-bridge-EEFcyL仅Core新增只读方法与Facade一个端口（共2literal，Core1164/Facadee687），使用唯一现有TileSet Owner/normalizer，不建第二解析器；7组34断言与imported真实Native查询/重建PASS。Root没有继承旧d894/Facade7f的全产物资格。
- 原共同源遗漏的既有边界小片已关联：independentBoundary四literal与integration一literal修复规范化小写路径仍含混合大小写正则的实际漏门；原16组不改、新增8文件名拒绝与2 Core允许均有证据。仅补来源，不重复改该实现。
- T4三Editor最终冻结sealed-editor-source-iSkD3s：Structure553a707b/78116B、Transactiondcaee03f/17491B、Copyc5cd1b3e/5376B，共18日志58literal全正逆exact，report92225307ec88a3c998bac8fbb3ef502116f688b3c200de19d3ce57886e06c078。原S4实际10组160断言、Tile5组48、Pool4组39、值合同3组16全部PASS。post-clone-fields-62oHSs唯一helper一literal在真实clone后恢复已经严格验证的显式字段（7745e5），修复新增Tile子对象元数据被Prefab构造器覆盖；26组236兼容与实际Native通过。
- T4真实提交、一次Undo/Redo、保存重开覆盖Tile属性、newborn child+rope、Pool Prefab/Scene、Pool Runtime/Transient与脚本A→B。5个真实saved-project经正式createNovaPak生成5个PAK，再由无框架SessionLoader/mount/Ready/普通934加载：5组PASS、254可达模块、无Vue/Pinia/store/Editor，report205c5a9cfb258cc19f6cdd442d9d7ba89df2d709430ae470bc7794bacac8c34f。该证据使用受控DOM/Canvas2D兼容诊断，不冒真实GUI/GPU/原生独立包。初次project-only PAK缺source proof的Ready拒绝保留。ImportedFacade图集加载路径仍NOT_VERIFIED。
- T4已证实的新Tile newborn软删除组件历史被v1 added.components拒绝，未过滤removed或复活默认组件。独立T5进行严格表v2与project schema31的TS/Rust同步修复；旧v1不接受removed、旧5–30输入语义保持。真实encoded dataURI和nested-v2绕过旧schema门的两个Rust FAIL已保，已授权有界只读解码/已知字段检查，无新依赖或锁变动。当前中途60项Rust与16组183项TS/cloner通过，最终历史typed-ref复验/7源冻结/匹配31WASM及整合尚未完成。
- Main Worker Host终态：worker-main-terminal-t19RQP三literal防cancelTimeout二次异常覆盖原错误并泄漏claim；原独立H06 FAIL保留，修后原7组47断言及12真实Core路径PASS，MainHostafbd。此合作Stop/超时语义不自动适用于未来OPFS writer。
- compiled Worker preflight三NEW只报告缺少同步存储并真实重建canvas回退原Main；8物理Node Worker路径PASS。默认生产入口未切到恒定fallback试探线程，尚无完整Engine绑定。
- canonical-input-o0e9CK七旧58literal+一个NEW Router：不改Input V1，把同事件canvasRect/wheel点与raw输入放同一物理有序消息并计入完整count/bytes预算；真实GameUiOwner优先消费，Core保持一个消费者。canonical-release-IzSze6另3literal移除未用导入，并在flags变化时向原UI owner交还mouseup；原真实FAIL605ddefe保留，后14功能门PASS、Router729469。完整Main native text/blur/raw Dispatcher的顺序仍待最终Engine绑定验证。
- Worker平台四NEW封口platform-binding-cwoB5E/seal-LtjguP：同已验证PAK来源与不可变catalog的Main音频资源目录（不建Main World）；锁定Fontsource5.3.0三字体族112face的URL/描述/hash与有界加载；真实最小GL/2D/字体探测端口。Audio5组与平台10组PASS只属定点受控端口测试；112face编码4,710,184B/SFNT8,158,592B不是原生驻留内存。尚未共同types/生产/实际GPU字体或可闻性验证。真实Worker同步持久存储、崩溃恢复和Main回退交接正在设计。
- N0/N1 Native pose：sealed-source-jaHt1f六MOD+六NEW，report5f8905336a221ef418528c4bd174c1bd916af3e0baac54f59a5b72a014b54ad0。实际Rust World只读提取唯一arena/transform graph的完整祖先闭包，Header64/Row144保留原f64，全部验证与可失败分配在发布前；不drain changed view、不step、不创建身份。原48+新17=65 Rust测试PASS，含1024父链、100000上限、坏请求保旧视图、epoch/revision/overflow/原NVFP LE黄金字节。最大输出capacity14,400,064B、handle800,000B、marker100,000B；物理heap unknown。WASM包装release check PASS，不等于新JS/WASM已生成；现body绑定旧NVTC不允许handle0，未改变其语义。原Frame Node门旧e7配对FAIL保留，私有显式关联934/glue76ff原25组PASS只属旧CPU/memory-grow。
- Root NVFP伴随表：nvfp-exact-companions-LKOzTi四NEW schema/codec/generator/维护验证脚本；独立Geometry1逐位保留原GPU64四角/UV/RGBA，Batch1保f64排序与原稳定顺序，冻结Header64/Sprite80字节不改，非i32层内次序第一片明确留原命令route。29跨表/损坏输入与17生成器/严格2文件types PASS。修前SAB来源与独立审查目标WASM/SAB/source-alias失败保留；destination-owner-fix-OzoxYl两literal在写入前拒无所有权目标，维护32组与原独立7组18断言通过。该协议尚未据此宣称真实生产消费/GPU图像或性能通过。
- Root真实消费片frame-production-dMUhB9正在实现：NEW帧资源表与整帧品牌凭据；types/WebGL2/WebGPUSpriteRenderer精确新增直接GPU64消费入口、实际device epoch/owner与旧队列排序，未改原shader、DITHER或图像容差。资源表10项受控源绑定/代次失效/预算/O(1)行校验/释放测试PASS；后端仅语法0诊断，未语义types/生产接入。完整producer、Native姿态Owned-copy适配与视口接入仍未完成。

共同类型历史：types-v2-8WKUW3实际四门3PASS/1FAIL，Vue报unused import与unknown tile类型；只有修后Structure1fe181版本的Vue单门重跑PASS。最终553a/canonical/N1/schema31等组合尚须全门重测，不继承旧通过。

Comfortable字号/行高/44px控件/四向留白/圆角/核心动效未降低。没有本轮新GUI、动态录屏、真实GPU图像/音频可闻性或正式性能采样；旧严格WebGL2/WebGPU图像FAIL保留。QualityLocked和AdaptiveExperience仍分别NOT_TESTED；Linux/H2缺设备仍NOT_TESTED。README仍为项目介绍未再改；主指令/AGENTS/旧发行未改；new.py不读/不执行/不改/不打包。没有正式26.37全11文件发行、commit/push/上传或签名。继续最终源整合、真实Worker/渲染通路、匹配冷构建、严格图形/输入/动效回归、B/X/H1与发行。
