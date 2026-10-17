# 26.29 世界绑定、导航与流送修复

## 修改前发现与行为后果

1. `restoreStreamCellState` 原来按全世界 UUID 查找实体。导入交接数组中包含其他分块或全局实体 UUID 时，会修改不属于当前分块的对象；部分记录没有 enabled 字段也会把禁用对象重新启用。恢复现在只允许当前分块的实际后代，缺省 enabled 保持原值。损坏的父链回路不能把分块根加入成员集合。合法捕获的后代变换、速度及启用状态保留原有语义。
2. 导航调度、路径修订、调试路径和区域网格原来只在整体重置时清除。流送反复换成员会保留退场对象的缓存。每次真实导航更新现在移除不再启用/不存在的区域和代理缓存；重新载入会根据当前世界重新寻路。
3. 绑定目标丢失或禁用时，导航原来用代理自身代替目标，但在重寻路间隔内仍沿旧路径驱动实体。现在立即清除路径并把导航/物理速度归零，标记 Unreachable；原 UUID 目标重新出现或启用后正常重新寻路。

这些修复只涉及共用运行模块，编辑器运行和导出播放器均直接使用。没有更改项目格式、组件字段、默认设置或撤销模型，也没有新增后台服务或依赖。现有世界作者表单/序列化仍原样保存目标 UUID 和分块父链。试听、渲染和其他版本功能保持原实现。

## 每个修改文件

- `src/runtime/worldStreaming.ts`：恢复索引限定为分块后代；根实体排除回路成员遍历；仅显式布尔 enabled 修改启用状态。
- `src/runtime/navigation2d.ts`：更新时清除退场/禁用成员缓存；导出只读缓存计数用于真实生命周期检查；目标丢失/禁用立即停止旧路径并清空调度状态。
- `scripts/verify-v26.29-world.mjs`：五项真实产品模块断言：20 次成员替换缓存规模、目标失效即时停速与重入、禁用目标、导入交接跨分块隔离、部分/完整交接重复恢复。
- `docs/WORLD_26_29.md`：本次影响、变更清单、测试和边界记录。

## Godot 本地参考及支持边界

针对性阅读 `godot-master/scene/2d/navigation/navigation_agent_2d.cpp` 中 `NOTIFICATION_EXIT_TREE`、代理父级/导航地图解除，以及 `set_target_position` 的重寻路请求。参考的是成员生命周期必须对应运行资源生命周期，以及目标绑定必须有明确失效处理。没有复制实现，也不声称 Nova_A 已具有 Godot 导航服务器完整功能。

Nova_A 当前导航保留网格/多边形模式、AStar/HierarchicalAStar/FlowField、区域和目标 UUID、净空/几何、成本、限额与已有缓存失效合约。重寻路和避让预算不变。流送交接只恢复已定义的启用、变换及线/角速度字段，不是脚本 VM、接触流形、音频、随机状态、网络输入等完整确定性状态快照，因此本修复不构成完整 rollback/resimulation 功能。

## 实际验证

本机开发检查（2026-09-26，产品源码26.29.0）：

- `node scripts/verify-v26.29-world.mjs --development --report=release-audits/v26.29-world-development.json`：5/5 通过。
- `node scripts/verify-v26.17-navigation.mjs --qualification-release=26.29 --report=release-audits/v26.29-navigation-development.json`：17/17 通过。
- `node scripts/verify-v26.17-world-streaming.mjs --qualification-release=26.29 --report=release-audits/v26.29-streaming-development.json`：16/16 通过；实际 WASM 世界/场景/流送模块和已有边界回归。开发树结果不等同冻结发布资格。

冻结发布正式检查命令：`node scripts/verify-v26.29-world.mjs --qualification-release=26.29`，报告 `release-audits/v26.29-world.json`，由主任务按最终构建统一执行。序列化/撤销/用户面板回归由主任务选择对应保留套件，不在本子任务重复全仓或跨平台矩阵。上述 Node 合约不证明实体硬件、网络服务、平台安装器或浏览器用户点击已通过。

## 26.29 流送联机参考与实际用户链路

新增两个独立参考目录 `reference-projects/projects/world-v2629-stream-host/` 与 `world-v2629-stream-client/`，各包含 `project.nova`、`README.md`、`test-controls.json`、`expected-output.json`。保留旧26.18双人参考原文件。新项目在原有双人脚本和复制合约上增加实际未常驻地标场景、分块持有者、地标服务器权威复制声明、独立流送 Rhai HUD；没有远程后端依赖，必须用户明确授权同源浏览器本地会话。

新增 `scripts/verify-v26.29-stream-network-user.mjs`，实际执行分块预算编辑/撤销/重做/保存重开，双编辑器授权加入、真实键盘移动与复制、断开重连/迟加入基线、流送场景成员检查，再分别通过真实界面导出主机与客户端，运行实际下载内容。`scripts/lib/streamNetworkExportAudit29.mjs` 保留现有导出独立逐文件哈希、包索引和完整实体/组件比较，仅隔离26.29文件名称。检查同时利用已打开的World/Network面板进行720×900 EN最后控件命中，避免无关旧面板矩阵。

正式命令：`node scripts/verify-v26.29-stream-network-user.mjs --qualification-release=26.29`；报告 `release-audits/v26.29-stream-network-user.json`。这是实际同源本地BroadcastChannel双页面，不是公网服务器、跨计算机网络或完整状态回滚认证。

### 联机用户开发检查结果

最初前四项实际用户检查通过（同构建记录于 `release-audits/v26.29-stream-network-user-development.json`），之后导出发现并保留两个事实：旧测试辅助的鼠标菜单保存未观察下载事件，导致等待下载超时；生产构建验证错误地把合法未加载场景中的复制实体当作丢失，此产品问题由独立验证模块修复，并重新构建。

修复后执行 `node scripts/verify-v26.29-stream-network-user.mjs --development --exports-only --report=release-audits/v26.29-stream-network-export-development.json`，3/3 通过。此开发入口从当前参考工程执行真实保存/导出，不冒充此前作者编辑重放，正式模式禁止跳过前四项。两份 Web ZIP 独立逐文件/包索引哈希与作者实体比较通过；独立导出播放器实际加载地标脚本。HUD 显式显示 host/client 各自 `peers 1` 后才发送移动输入，前台恢复时观察复制收敛并保存采样时间戳；此次首个56ms采样主机X=-0.682、客户端观测X=-0.594（容差0.5），并非以任意固定延时推定已连接。

第一轮仅等待固定600ms时远端HUD仍为-3，因此日志保留为失败；新检查先验证实际连接身份/数量，再等待有上限的真实坐标收敛。没有降低位移或复制容差，也没有修改网络实现掩盖失败。全部7项在冻结后由主任务完整重跑，分开开发通过结果不合成冻结资格。


候选1完整用户流程再次在导出前保存处超时。检查产品代码确认浏览器降级保存固定名为 project.nova，先前“保留原文件名”的解释不成立；失败临时浏览器目录已由公共辅助正常清理，因此没有声称检查到其中下载文件。新26.29流程改为真实前台 Ctrl+S，先关闭菜单并聚焦画布，订阅下载开始/进度并保存目录列表、可见状态和故障信息，最后验证实际完整 JSON 文件。未修改产品保存实现或旧共享辅助；完整冻结检查仍须重跑。

最新完整开发链路：`node scripts/verify-v26.29-stream-network-user.mjs --development --report=release-audits/v26.29-stream-network-full-development.json`，7/7 全部通过（同一次运行，日志 `.cache/v2629-stream-network-full-development2.log`）。三次作者/主机/客户端保存均捕获 `project.nova` 下载开始及 completed 事件，目录存在完整文件且界面 dirty=false；完整流程不再依赖菜单坐标。另补齐对等页面传给公共控件辅助的 observations 容器，使迁移提示存在时可以正常记录/关闭提示，不修改产品逻辑。导出玩家实际确认双方 peers=1，184ms内坐标误差收敛至0.276（容差0.5），原始35ms样本误差1.119也保留。候选1报告和截图保存于 `release-audits/v26.29-candidate1-failed-stream-user/`，开发提示容器失败另存 `v26.29-stream-network-full-development-toast-failure.json`；这些失败没有改写为通过。此完整开发通过仍等待候选2冻结资格重跑。

发布前补齐两份参考工程的 Engine／Project Format／schema 说明，以及 expected-output/test-controls 的版本、authoring、classification 和 action/expected 元数据。项目玩法文件未改变。26.29 输入预检现在提前核验这些归档要求。窄屏测试显式使用即时滚动后读取命中结果，避免测试自己的平滑滚动尚未完成时误判；不关闭产品默认动画。
