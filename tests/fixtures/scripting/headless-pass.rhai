@export(type="integer", min=0, max=100, step=1, group="Tests") let value = 0;

fn before_each() { value = 2; }

// @test tags=unit,fast timeout=1000 seed=42 cases=first|second
fn test_parameterized_arithmetic() {
  expect(value + 2 == 4, "setup state and deterministic arithmetic");
}

// @test skip=true tags=manual timeout=1000 seed=7
fn test_skipped_example() {
  expect(false, "this skipped test must not execute");
}

fn after_each() { value = 0; }
