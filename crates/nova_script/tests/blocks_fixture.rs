//! 26.43 Blocks: the Rhai produced by the Blocks editor for every event and block (fixture written
//! by `node scripts/verify-2643-blocks.mjs --write-fixture`) compiles in the real engine and every
//! generated callback runs without a script error.
use nova_script::{
    CharacterSnapshot, ContactSnapshot, EventSnapshot, RigidBodySnapshot, ScriptContext,
    ScriptRuntime,
};

#[test]
fn every_generated_block_callback_runs() {
    let source = include_str!("fixtures/all-blocks.rhai");
    let mut runtime = ScriptRuntime::new();
    runtime
        .upsert("blocks", source)
        .expect("generated blocks compile");
    let callbacks = [
        "start",
        "update",
        "fixed_update",
        "on_collision_enter",
        "on_trigger_enter",
        "on_trigger_exit",
        "on_signal",
        "on_timer",
        "on_destroy",
        "hit",
        "__blk_wait_1",
        "__blk_text",
    ];
    for callback in callbacks {
        let mut context = ScriptContext {
            entity: "self".into(),
            api_version: 2,
            ..ScriptContext::default()
        };
        context.entity_generations.insert("self".into(), 1);
        context.entity_generations.insert("other".into(), 1);
        context.time.delta = 1.0 / 60.0;
        context.time.fixed_delta = 1.0 / 60.0;
        context.callback_kind = match callback {
            "hit" | "__blk_wait_1" | "__blk_text" => "call".into(),
            name => name.into(),
        };
        context.rigid_body = Some(RigidBodySnapshot {
            velocity: [0.0, 0.0],
            angular_velocity: 0.0,
            mass: 1.0,
            body_type: "Kinematic".into(),
        });
        context.character = Some(CharacterSnapshot {
            on_floor: true,
            can_coyote_jump: true,
            ..CharacterSnapshot::default()
        });
        context.contact = Some(ContactSnapshot {
            other_entity: "other".into(),
            ..ContactSnapshot::default()
        });
        let name = match callback {
            "on_signal" => "player.won",
            "on_timer" => "tick",
            other => other,
        };
        context.event = Some(EventSnapshot {
            name: name.into(),
            source: "caller".into(),
            payload: serde_json::json!([3, "fire"]),
        });
        let execution = runtime
            .execute_instance("blocks", callback, 1, 1, context)
            .unwrap_or_else(|error| panic!("{callback}: {error}"));
        let errors: Vec<_> = execution
            .logs
            .iter()
            .filter(|log| log.level == "error")
            .map(|log| log.message.clone())
            .collect();
        assert!(errors.is_empty(), "{callback}: {errors:?}");
    }
}
