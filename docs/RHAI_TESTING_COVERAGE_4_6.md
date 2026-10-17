# Rhai testing and coverage in Nova_A 4.6

Functions named `test_*` are discovered without executing editor-time gameplay. A preceding metadata comment can set category tags, fixture, timeout, deterministic seed, cases, skip state, and explicitly infrastructure-flaky retry policy.

```rhai
// @test tags=unit,fast fixture=counter timeout=1000 seed=46 cases=first|second
fn test_counter() { expect(2 + 2 == 4, "math"); }
```

Supported categories are unit, integration, scene, UI, physics, animation, and regression. `before_all`, `before_each`, `after_each`, and `after_all` provide setup/teardown. Script Studio can run the current file, current project, selected tags, or only prior failures, and can copy a headless command.

The headless runner supports source/project discovery, name and tag filters, changed selection, deterministic sharding, cancellation, captured seeds, JSON summary, JUnit XML, JSON/LCOV coverage, and stable exits: `0` pass, `1` assertion/test failure, `2` infrastructure or invalid invocation. Retries are accepted only for tests explicitly marked as flaky infrastructure; gameplay assertion failures are never hidden by automatic retry. World-owning editor tests execute serially because they share one mutable world; independent CLI shards provide safe process-level parallelism.

Coverage reports function, executable-line, and stable API-binding use. Project settings store collection thresholds; missing coverage is visible and never converted into an invented pass. See `reference-projects/projects/script-v46-tests-coverage/` and `release-audits/v4.6.0-test-coverage.json`.
