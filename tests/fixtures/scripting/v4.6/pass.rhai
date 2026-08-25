@export(type="integer", serialize=false) let state = 0;

fn before_all() { state = 1; }
fn before_each() { state += 1; }

// @test tags=unit,contract fixture=counter timeout=1000 seed=460 cases=first|second
fn test_api_v2_contract() {
  expect(api_current_version() == 2, "API v2 current");
  expect(api_minimum_version() == 1, "API v1 adapter retained");
  expect(state >= 2, "setup hooks executed");
}

// @test tags=integration,fast fixture=runtime timeout=1000 seed=461
fn test_deterministic_runtime() {
  expect(random_range(2.0, 2.0) == 2.0, "bounded deterministic random");
}

fn after_each() { state -= 1; }
fn after_all() { state = 0; }
