// 脚本测试正例：验证初始化、参数化、跳过或脚本接口契约。
@export(type="integer", min=0, max=100, step=1, group="Tests") let value = 0;

fn before_each() { /* 每次测试前把导出值初始化为二。 */ value = 2; }

// @test tags=unit,fast timeout=1000 seed=42 cases=first|second
fn test_parameterized_arithmetic() { /* 验证每次测试初始化状态和确定性加法。 */
  expect(value + 2 == 4, "setup state and deterministic arithmetic");
}

// @test skip=true tags=manual timeout=1000 seed=7
fn test_skipped_example() { /* 保留应跳过的失败断言，验证跳过标记生效。 */
  expect(false, "this skipped test must not execute");
}

fn after_each() { /* 每次测试后清零导出值。 */ value = 0; }
