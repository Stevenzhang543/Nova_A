// 脚本测试负例：预期断言失败，用于证明失败退出码；不代表产品运行故障。
// @test tags=ci-failure timeout=1000 seed=99
fn test_expected_failure() { /* 故意产生失败断言，验证测试进程返回失败退出码。 */
  expect(false, "intentional failure used to verify exit code 1");
}
