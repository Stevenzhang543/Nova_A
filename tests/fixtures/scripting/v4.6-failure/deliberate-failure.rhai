// Deliberate negative fixture. It must produce process exit 1 and is never part of the default pass directory.
// @test tags=negative,regression fixture=exit-code timeout=1000 seed=462
fn test_deliberate_failure() {
  expect(false, "deliberate failure proves exit code 1");
}
