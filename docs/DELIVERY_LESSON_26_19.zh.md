# Nova_A 26.19：构建、审阅与恢复

请使用六个 `v2619` 参考项目的临时副本，从启动器打开 `reference-projects/projects` 中对应的 `project.nova`。源码包和参考项目包均包含文件，不需要服务账号。Project Format 2／schema 29、Rhai API 2、Graph Format 1、Plugin API 2 和 Package Manifest 1 保持兼容。

## 用三种编程方式完成小游戏

打开 `creator-v2619-code-game`、`creator-v2619-blocks-game` 或 `creator-v2619-mixed-game`。播放后聚焦游戏视口，使用 WASD／方向键依次收集六个检查点。标题从 Checkpoint 1/6 逐步变为完成提示；R 重置分数、位置和检查点。编辑前先停止播放。

代码模式打开 CheckpointGame.rhai，将 X／Y 两处移动速度乘数从 6.0 改为 4.0。积木模式打开 CheckpointGame.nova-graph，找到两个移动表达式的数值节点并修改为 4.0。混合模式保留关联的代码和类型化图：来回切换，确认两边数值一致，然后保存。撤销／重做应只恢复对应编辑。语法错误必须保留在草稿中并显示诊断，不能用不完整图静默覆盖代码。

拾取计算通过 `find_entity_handle`、`entity_position_x_on`、`entity_position_y_on` 读取当前检查点实体的世界坐标。在 Design 中移动 Checkpoint 1，再次播放时拾取地点也应移动。这修复了旧教程使用固定坐标数组的问题。保存并重新打开，检查变换和脚本／图数值后再导出。三种方式执行相同的受支持 Rhai 操作；图形自动排列不改变求值顺序。

## 处理真实的协作冲突

打开 `delivery-v2619-semantic-merge/project.nova`。选择 Checkpoint 1，把 Transform position X 从 -6 改为 -4。在 Manage → Build Settings → Team 启用可选团队工作流，并导入同目录的 `incoming.nova`；它把同一实体的 X 改为 -2。

对照本地和传入值，展开基础版本查看 -6。选择传入值并应用语义合并，同一实体应变为 X=-2。撤销恢复 -4，重做恢复 -2。保存、重新打开并导出。实体标识和数量不应变化。顺序冲突只决定顺序，同时保留已合并的属性编辑；删除与编辑冲突可以恢复被删除的实体，也可以再次更改选择。

如果在审阅期间继续编辑项目，旧预览会拒绝应用。重新导入传入文件，再审阅最新本地状态。未解决冲突会阻止应用。重复标识、过大或过深的输入会在提交部分方案之前被拒绝。这是本地三方项目合并，不是云协作服务；合并本身不需要网络操作。

## 审阅软件包及其生命周期

打开 `delivery-v2619-package-build`，进入 Manage → Packages → Browse，选择 Nova Navigation 2D。查看发布者、版本、兼容性、依赖、权限、SHA-256 和许可证，再点击安装并审阅确认内容。随附离线目录不需要下载。回到已安装列表，依次禁用、启用、卸载；撤销卸载后保存并重新打开检查。

仍被其他软件包依赖的包不能卸载。更新权限批准失败会恢复原权限；被拒绝的更新保留原安装版本和锁文件。隔离无效的新版本不会禁用有效的旧版本。回滚先检查安全状态及整个依赖图，再消耗历史记录。禁用或卸载软件包会卸载对应的运行中插件。版本更新或回滚会卸载并禁用旧插件二进制，直到导入对应的新审阅清单和二进制；只改变版本标签不等于替换了执行代码。原生插件不属于进程内 WASM 沙箱。远程插件 URL 不会自动下载，必须先本地导入资源。

## 构建并核对输出

Manage → Build Settings 的 Overview 设置目标、架构、配置、场景顺序和启动场景；Platform 管理应用标识与可选签名设置；Delivery 管理确定性输出、缓存、包含规则和报告；Diagnostics & history 保留输出信息与构建失败；Team 管理本地协作。

浏览器中选择 Web。原生导出需要桌面宿主能力检测成功，不能只根据浏览器运行在 Windows 上就判定可用。检测失败应显示重启／重试指引。Android 需要实际本地工具链，设备认证还需要真实设备；Linux／macOS 必须在匹配宿主上测试，Windows 结果不能代替。

构建前保存，并等待保存任务结束。导出 Web，解压到独立目录，通过本地 HTTP 打开 index 页面。比较检查点位置、移动速度、分数、重置及资源与已保存编辑器项目是否一致。构建报告提供文件大小与哈希，交付后应核验。`server-v2619-headless-authority` 仍是在关闭渲染的 WebView 中运行的服务器，不是无窗口原生服务器。

## 离线与移动目录后的源码构建

先明确安装依赖工具：Node 22.22.2、pnpm 10.30.0、Rust 1.92.0、clippy、rustfmt、wasm32-unknown-unknown、wasm-pack 及其已缓存的 bindgen 工具。`.node-version`、`packageManager`、`rust-toolchain.toml` 固定工具版本。Windows 原生构建还需要匹配的 MSVC／Windows SDK 与 Tauri 打包工具。使用仓库锁文件，不因版本号变化而随意调整应用直接依赖。

缓存完整时执行 `pnpm install --offline --frozen-lockfile --ignore-scripts`，然后执行 `wasm-pack build crates/nova_wasm --target web --out-dir ../../nova_core/pkg --out-name nova_core --release --mode no-install -- --locked --offline`，最后执行 `pnpm build`。缓存缺项必须明确报错；离线不代表自动拥有所有先决条件。

Windows pnpm 目录联接可能在移动项目后仍指向旧路径。在新目录明确执行 `pnpm install --offline --frozen-lockfile --ignore-scripts --force` 修复，再重新构建。不要把生成的依赖目录放进发布源码包。专门的可复现审计逐字节对比干净构建和移动目录后的 Web 输出，并保留命令日志；它不宣称完全未准备的机器也能离线构建。

## 外部编辑器与恢复

标准 LSP 客户端可从已安装依赖的源码目录启动 `node scripts/nova-rhai-language-server.mjs --stdio`。协议使用 Content-Length JSON-RPC、UTF-16 位置和完整文档同步。支持已声明 Rhai 模型的诊断、补全、悬停、符号、定义、引用、重命名及格式化。文档版本必须递增；旧版本修改会被忽略。关闭文档会移除索引，关闭服务会等待已排队工作。可选索引文件只是缓存，不是脚本权威来源。

外部修改项目文件后，先比较再选择编辑器或磁盘版本。已停止／替换的观察器不能把旧读取结果写入另一项目。尚未写完的无效文件应保留诊断并重试；此时可保留编辑器版本，修复磁盘文件后再次比较。保存和恢复流程先在临时副本上测试。

暂存签名更新需要明确启用、匹配频道、有效签名／指纹、适用的基础版本和新序号。验证期间取消、切换频道或改变基础版本，都必须阻止旧结果暂存。暂存不下载也不安装。提交／回滚记录表示操作员已确认的安装器操作，不是原子二进制更新器。正式签名以及临时机器上的安装／打开／升级／卸载必须单独认证；用户现有 Windows 电脑不视为可随意重装的临时设备。iPhone 不能认证 Android。

## 验收与证据边界

程序员检查包含畸形归档、生命周期取消、撤权、语义标识／顺序、真实 LSP 子进程、干净／移动目录离线构建和完整发布门禁。用户检查包含真实输入、冲突选择、撤销／重做、保存／打开、软件包审阅及导出游戏。变更面板覆盖英／德／中、深／浅主题、100／150／200% 和三种宽度。本机原生 UI 自动化未能初始化，不能把浏览器观察写成原生点击证据。请以绑定确切源码的发布证据为准，并保留未完成的外部认证项目；教程文字本身不是认证。

随包导入的插件声明必须匹配包的标识、版本与 API。导入文件携带的授权会被清空，插件保持禁用；请先在插件工具中审查能力再启用。替换声明会卸载此前运行的实例。

Tauri 生成的原生权限元数据也包含绝对缓存路径。移动项目后使用新的原生目标目录：`cargo check --manifest-path src-tauri/Cargo.toml --target-dir src-tauri/target/relocated --locked --offline`。如需打包，先将 `CARGO_TARGET_DIR` 设置为新目录，再运行 `pnpm tauri build`；输出会写入该目录。新构建成功前保留源码及旧缓存。可复现性审计使用四个编译任务，并记录这一明确的缓存修复步骤。
