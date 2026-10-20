//! 26.43: cost of one live script callback (native build), for the engine-reuse work.
//! `cargo run --release -p nova_script --example script_bench`
use std::time::Instant;

use nova_script::{ScriptContext, ScriptRuntime};

fn main() {
    let mut runtime = ScriptRuntime::new();
    let source = "@export let speed = 8.0;\nlet counter = 0;\nfn fixed_update(dt) { counter += 1; let x = speed * dt; if x > 100.0 { print(\"far\"); } }";
    runtime.upsert("probe", source).unwrap();
    let calls = 20_000;
    let context = || {
        let mut context = ScriptContext {
            entity: "entity-1".into(),
            ..ScriptContext::default()
        };
        context.entity_generations.insert("entity-1".into(), 1);
        context
    };
    for _ in 0..200 {
        runtime
            .execute_instance("probe", "fixed_update", 1, 1, context())
            .unwrap();
    }
    let started = Instant::now();
    for _ in 0..calls {
        runtime
            .execute_instance("probe", "fixed_update", 1, 1, context())
            .unwrap();
    }
    let per_call = started.elapsed().as_secs_f64() * 1e6 / calls as f64;
    println!("{{\"calls\":{calls},\"microsecondsPerCallback\":{per_call:.2}}}");
}
