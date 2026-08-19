// @test tags=ci-failure timeout=1000 seed=99
fn test_expected_failure() {
  expect(false, "intentional failure used to verify exit code 1");
}
