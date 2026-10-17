# 离线包脚本中文说明

文件：`package-fixture/src/index.rhai`。此文件是历史包发布测试的精确字节输入；保留原始内容，以免改变内容摘要或签名测试条件。

- 文件职责：作为离线包的运行时脚本入口，以日志证明包脚本被执行。
- `start()`：启动时调用 `print`，输出固定文本 `Nova_A offline package fixture`；没有返回值，也不修改实体或文件。

包清单中的 `ed25519-v1:external-fixture-signature` 是历史测试占位标记，`publisherVerified` 为 `false`，不能据此声称真实发布者已通过签名验证。本说明不修改、补签或提升该信任状态。

原始生成入口：`scripts/generate-v6.9.0-reference-projects.mjs`；7.0 的两个副本由 `scripts/generate-v7.0.0-reference-projects.mjs` 从该历史示例复制。
