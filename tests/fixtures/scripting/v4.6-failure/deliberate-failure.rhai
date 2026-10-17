// 脚本测试负例：预期断言失败，用于证明失败退出码；不代表产品运行故障。
// Deliberate negative fixture. It must produce process exit 1 and is never part of the default pass directory.
// @test tags=negative,regression fixture=exit-code timeout=1000 seed=462
fn test_deliberate_failure() { /* 故意触发断言失败，作为退出码一的负向测试。 */
  expect(false, "deliberate failure proves exit code 1");
}
