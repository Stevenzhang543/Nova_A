// 脚本测试正例：验证初始化、参数化、跳过或脚本接口契约。
@export(type="integer", serialize=false) let state = 0;

fn before_all() { /* 整个测试套件开始前初始化共享状态。 */ state = 1; }
fn before_each() { /* 每次测试前递增共享测试状态。 */ state += 1; }

// @test tags=unit,contract fixture=counter timeout=1000 seed=460 cases=first|second
fn test_api_v2_contract() { /* 检查第二版脚本接口、第一版适配兼容和初始化钩子。 */
  expect(api_current_version() == 2, "API v2 current");
  expect(api_minimum_version() == 1, "API v1 adapter retained");
  expect(state >= 2, "setup hooks executed");
}

// @test tags=integration,fast fixture=runtime timeout=1000 seed=461
fn test_deterministic_runtime() { /* 验证上下界相同的随机范围返回该确定值。 */
  expect(random_range(2.0, 2.0) == 2.0, "bounded deterministic random");
}

fn after_each() { /* 每次测试后递减共享测试状态。 */ state -= 1; }
fn after_all() { /* 整个测试套件结束后清零共享状态。 */ state = 0; }
