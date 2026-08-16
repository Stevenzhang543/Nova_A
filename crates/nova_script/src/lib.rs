//! Sandboxed Rhai execution for Nova_A gameplay scripts.
//!
//! The crate deliberately knows nothing about the editor, DOM, filesystem,
//! network, processes, or Tauri. Scripts can only observe the serialized host
//! context and return a small, validated command list.

use std::cell::RefCell;
use std::collections::BTreeMap;
use std::rc::Rc;

use rhai::{Dynamic, Engine, Map, Scope, AST, FLOAT, INT};
use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const MAX_SCRIPT_OPERATIONS: u64 = 100_000;

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeSnapshot {
    pub delta: f64,
    pub fixed_delta: f64,
    pub elapsed: f64,
    pub scale: f64,
    pub frame: u64,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InputSnapshot {
    #[serde(default)]
    pub down: BTreeMap<String, bool>,
    #[serde(default)]
    pub pressed: BTreeMap<String, bool>,
    #[serde(default)]
    pub released: BTreeMap<String, bool>,
    #[serde(default)]
    pub axes: BTreeMap<String, f64>,
    #[serde(default)]
    pub vectors: BTreeMap<String, [f64; 2]>,
    #[serde(default)]
    pub mouse_position: [f64; 2],
    #[serde(default)]
    pub wheel: [f64; 2],
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContactSnapshot {
    pub other_entity: String,
    pub point: [f64; 2],
    pub normal: [f64; 2],
    pub relative_velocity: [f64; 2],
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventSnapshot {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub payload: Value,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransformSnapshot {
    #[serde(default)]
    pub position: [f64; 2],
    pub rotation: f64,
    #[serde(default = "unit_scale")]
    pub scale: [f64; 2],
}

impl Default for TransformSnapshot {
    fn default() -> Self {
        Self {
            position: [0.0, 0.0],
            rotation: 0.0,
            scale: unit_scale(),
        }
    }
}

fn unit_scale() -> [f64; 2] {
    [1.0, 1.0]
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RigidBodySnapshot {
    #[serde(default)]
    pub velocity: [f64; 2],
    pub angular_velocity: f64,
    pub mass: f64,
    #[serde(default)]
    pub body_type: String,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterSnapshot {
    pub on_floor: bool,
    pub on_wall: bool,
    pub on_ceiling: bool,
    pub can_coyote_jump: bool,
    #[serde(default)]
    pub floor_normal: [f64; 2],
    #[serde(default)]
    pub wall_normal: [f64; 2],
    #[serde(default)]
    pub platform_velocity: [f64; 2],
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptContext {
    pub entity: String,
    #[serde(default)]
    pub entity_name: String,
    #[serde(default)]
    pub components: Vec<String>,
    #[serde(default)]
    pub entities: BTreeMap<String, String>,
    #[serde(default)]
    pub time: TimeSnapshot,
    #[serde(default)]
    pub random_seed: u64,
    #[serde(default)]
    pub input: InputSnapshot,
    #[serde(default)]
    pub contact: Option<ContactSnapshot>,
    #[serde(default)]
    pub event: Option<EventSnapshot>,
    #[serde(default)]
    pub properties: BTreeMap<String, Value>,
    #[serde(default)]
    pub save: BTreeMap<String, Value>,
    #[serde(default)]
    pub transform: TransformSnapshot,
    #[serde(default)]
    pub rigid_body: Option<RigidBodySnapshot>,
    #[serde(default)]
    pub character: Option<CharacterSnapshot>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ScriptCommand {
    ApplyForce {
        x: f64,
        y: f64,
    },
    ApplyImpulse {
        x: f64,
        y: f64,
    },
    SetVelocity {
        x: f64,
        y: f64,
    },
    SetPosition {
        x: f64,
        y: f64,
    },
    SetRotation {
        radians: f64,
    },
    SetScale {
        x: f64,
        y: f64,
    },
    SetAngularVelocity {
        radians_per_second: f64,
    },
    MoveCharacter {
        x: f64,
        y: f64,
    },
    AnimatorSetBool {
        name: String,
        value: bool,
    },
    AnimatorSetFloat {
        name: String,
        value: f64,
    },
    AnimatorSetInteger {
        name: String,
        value: i64,
    },
    AnimatorTrigger {
        name: String,
    },
    AnimatorPlay {
        state: String,
    },
    AudioPlay,
    AudioPause,
    AudioStop,
    Destroy,
    Despawn,
    Instantiate {
        prefab: String,
    },
    LoadScene {
        scene: String,
    },
    ReloadScene,
    Quit,
    StartTimer {
        name: String,
        seconds: f64,
        repeat: bool,
    },
    PauseTimer {
        name: String,
    },
    ResumeTimer {
        name: String,
    },
    CancelTimer {
        name: String,
    },
    StartTask {
        name: String,
        seconds: f64,
    },
    CancelTask {
        name: String,
    },
    EmitSignal {
        name: String,
        target: String,
        payload: Value,
    },
    SaveSet {
        key: String,
        value: Value,
    },
    SaveDelete {
        key: String,
    },
    SaveClear,
    SaveLoad {
        slot: String,
    },
    SaveCommit {
        slot: String,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptLog {
    pub level: String,
    pub message: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedProperty {
    pub name: String,
    pub value: Value,
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptExecution {
    pub commands: Vec<ScriptCommand>,
    pub logs: Vec<ScriptLog>,
    pub properties: BTreeMap<String, Value>,
}

#[derive(Default)]
struct HostOutput {
    commands: Vec<ScriptCommand>,
    logs: Vec<ScriptLog>,
}

#[derive(Clone, Debug)]
struct PreparedScript {
    source: String,
    exports: Vec<ExportedProperty>,
}

struct CompiledScript {
    prepared: PreparedScript,
    ast: AST,
}

#[derive(Default)]
pub struct ScriptRuntime {
    scripts: BTreeMap<String, CompiledScript>,
}

impl ScriptRuntime {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn validate(&self, source: &str) -> Result<Vec<ExportedProperty>, String> {
        let prepared = prepare_script(source)?;
        let engine = base_engine();
        engine
            .compile(&prepared.source)
            .map_err(|error| error.to_string())?;
        Ok(prepared.exports)
    }

    pub fn execute(
        &self,
        source: &str,
        function: &str,
        context: ScriptContext,
    ) -> Result<ScriptExecution, String> {
        let prepared = prepare_script(source)?;
        let engine = base_engine();
        let ast = engine
            .compile(&prepared.source)
            .map_err(|error| error.to_string())?;
        execute_prepared(&prepared, &ast, function, context)
    }

    /// Compile a script without replacing the previous valid program until
    /// compilation succeeds. The host applies this at a frame boundary.
    pub fn upsert(
        &mut self,
        script_id: &str,
        source: &str,
    ) -> Result<Vec<ExportedProperty>, String> {
        if script_id.trim().is_empty() {
            return Err("script id cannot be empty".into());
        }
        let prepared = prepare_script(source)?;
        let ast = base_engine()
            .compile(&prepared.source)
            .map_err(|error| error.to_string())?;
        let exports = prepared.exports.clone();
        self.scripts
            .insert(script_id.to_owned(), CompiledScript { prepared, ast });
        Ok(exports)
    }

    pub fn remove(&mut self, script_id: &str) -> bool {
        self.scripts.remove(script_id).is_some()
    }

    pub fn execute_cached(
        &self,
        script_id: &str,
        function: &str,
        context: ScriptContext,
    ) -> Result<ScriptExecution, String> {
        let compiled = self
            .scripts
            .get(script_id)
            .ok_or_else(|| format!("script is not compiled: {script_id}"))?;
        execute_prepared(&compiled.prepared, &compiled.ast, function, context)
    }
}

fn execute_prepared(
    prepared: &PreparedScript,
    ast: &AST,
    function: &str,
    context: ScriptContext,
) -> Result<ScriptExecution, String> {
    let output = Rc::new(RefCell::new(HostOutput::default()));
    let engine = engine_with_host(&context, Rc::clone(&output));
    let mut scope = Scope::new();
    engine
        .run_ast_with_scope(&mut scope, ast)
        .map_err(|error| error.to_string())?;
    call_lifecycle(&engine, &mut scope, ast, function, &context)?;

    let properties = collect_properties(&scope, &prepared.exports, &context.properties);
    let mut output = output.borrow_mut();
    Ok(ScriptExecution {
        commands: std::mem::take(&mut output.commands),
        logs: std::mem::take(&mut output.logs),
        properties,
    })
}

fn base_engine() -> Engine {
    let mut engine = Engine::new();
    engine.set_max_operations(MAX_SCRIPT_OPERATIONS);
    engine.set_max_call_levels(32);
    engine.set_max_expr_depths(64, 32);
    engine.disable_symbol("eval");
    engine.disable_symbol("import");
    engine
}

fn engine_with_host(context: &ScriptContext, output: Rc<RefCell<HostOutput>>) -> Engine {
    let mut engine = base_engine();

    let logs = Rc::clone(&output);
    engine.on_print(move |message| {
        logs.borrow_mut().logs.push(ScriptLog {
            level: "info".into(),
            message: message.chars().take(4_096).collect(),
        });
    });

    let entity = context.entity.clone();
    engine.register_fn("entity", move || entity.clone());
    let entity = context.entity.clone();
    engine.register_fn("entity_handle", move || {
        handle_map(true, "Entity", &entity, "")
    });
    let entity_name = context.entity_name.clone();
    engine.register_fn("entity_name", move || entity_name.clone());
    let entities = context.entities.clone();
    engine.register_fn("find_entity", move |name: &str| {
        entities.get(name).cloned().unwrap_or_default()
    });
    let entities = context.entities.clone();
    engine.register_fn("find_entity_handle", move |name: &str| {
        entities
            .get(name)
            .map(|id| handle_map(true, "Entity", id, ""))
            .unwrap_or_else(|| handle_map(false, "Entity", "", "Entity not found"))
    });
    let components = context.components.clone();
    engine.register_fn("has_component", move |kind: &str| {
        components.iter().any(|component| component == kind)
    });
    let component_entity = context.entity.clone();
    let components = context.components.clone();
    engine.register_fn("get_component", move |kind: &str| {
        components
            .iter()
            .find(|component| component.as_str() == kind)
            .map(|component| format!("component://{component_entity}/{component}"))
            .unwrap_or_default()
    });
    let component_entity = context.entity.clone();
    let components = context.components.clone();
    engine.register_fn("component_handle", move |kind: &str| {
        if components.iter().any(|component| component == kind) {
            handle_map(
                true,
                kind,
                &format!("component://{component_entity}/{kind}"),
                "",
            )
        } else {
            handle_map(false, kind, "", "Component not found")
        }
    });
    register_entity_api(&mut engine, context);

    register_time_api(&mut engine, context);
    let random_state = Rc::new(RefCell::new(if context.random_seed == 0 {
        0x6d2b79f5
    } else {
        context.random_seed
    }));
    let state = Rc::clone(&random_state);
    engine.register_fn("random", move || {
        let mut value = state.borrow_mut();
        *value ^= *value << 13;
        *value ^= *value >> 7;
        *value ^= *value << 17;
        (*value as f64) / (u64::MAX as f64 + 1.0)
    });
    let state = Rc::clone(&random_state);
    engine.register_fn("random_range", move |minimum: FLOAT, maximum: FLOAT| {
        if !minimum.is_finite() || !maximum.is_finite() || maximum <= minimum {
            return minimum;
        }
        let mut value = state.borrow_mut();
        *value ^= *value << 13;
        *value ^= *value >> 7;
        *value ^= *value << 17;
        minimum + (maximum - minimum) * ((*value as f64) / (u64::MAX as f64 + 1.0))
    });
    register_input_api(&mut engine, context);
    register_property_api(&mut engine, context);
    register_save_api(&mut engine, context, Rc::clone(&output));
    register_command_api(&mut engine, context, output);
    engine
}

fn handle_map(valid: bool, kind: &str, id: &str, error: &str) -> Map {
    let mut map = Map::new();
    map.insert("valid".into(), Dynamic::from_bool(valid));
    map.insert("kind".into(), Dynamic::from(kind.to_owned()));
    map.insert("id".into(), Dynamic::from(id.to_owned()));
    map.insert("error".into(), Dynamic::from(error.to_owned()));
    map
}

fn register_time_api(engine: &mut Engine, context: &ScriptContext) {
    let time = context.time.clone();
    let snapshot = time.clone();
    engine.register_fn("time_delta", move || snapshot.delta);
    let snapshot = time.clone();
    engine.register_fn("time_fixed_delta", move || snapshot.fixed_delta);
    let snapshot = time.clone();
    engine.register_fn("time_elapsed", move || snapshot.elapsed);
    let snapshot = time.clone();
    engine.register_fn("time_scale", move || snapshot.scale);
    engine.register_fn("time_frame", move || time.frame as INT);
    let time = context.time.clone();
    engine.register_fn("time", move || {
        let mut map = Map::new();
        map.insert("delta".into(), Dynamic::from_float(time.delta));
        map.insert("fixed_delta".into(), Dynamic::from_float(time.fixed_delta));
        map.insert("elapsed".into(), Dynamic::from_float(time.elapsed));
        map.insert("scale".into(), Dynamic::from_float(time.scale));
        map.insert("frame".into(), Dynamic::from_int(time.frame as INT));
        map
    });
}

fn register_entity_api(engine: &mut Engine, context: &ScriptContext) {
    let transform = context.transform.clone();
    engine.register_fn("transform", move || {
        let mut map = Map::new();
        map.insert(
            "position_x".into(),
            Dynamic::from_float(transform.position[0]),
        );
        map.insert(
            "position_y".into(),
            Dynamic::from_float(transform.position[1]),
        );
        map.insert("rotation".into(), Dynamic::from_float(transform.rotation));
        map.insert("scale_x".into(), Dynamic::from_float(transform.scale[0]));
        map.insert("scale_y".into(), Dynamic::from_float(transform.scale[1]));
        map
    });
    let rigid_body = context.rigid_body.clone();
    engine.register_fn("rigid_body", move || {
        let mut map = Map::new();
        if let Some(body) = &rigid_body {
            map.insert("valid".into(), Dynamic::from_bool(true));
            map.insert("velocity_x".into(), Dynamic::from_float(body.velocity[0]));
            map.insert("velocity_y".into(), Dynamic::from_float(body.velocity[1]));
            map.insert(
                "angular_velocity".into(),
                Dynamic::from_float(body.angular_velocity),
            );
            map.insert("mass".into(), Dynamic::from_float(body.mass));
            map.insert("body_type".into(), Dynamic::from(body.body_type.clone()));
        } else {
            map.insert("valid".into(), Dynamic::from_bool(false));
            map.insert(
                "error".into(),
                Dynamic::from("RigidBody2D component not found"),
            );
        }
        map
    });
    let component_entity = context.entity.clone();
    let components = context.components.clone();
    engine.register_fn("animator", move || {
        if components.iter().any(|kind| kind == "Animator") {
            format!("component://{component_entity}/Animator")
        } else {
            String::new()
        }
    });
    let component_entity = context.entity.clone();
    let components = context.components.clone();
    engine.register_fn("animator_handle", move || {
        if components.iter().any(|kind| kind == "Animator") {
            handle_map(
                true,
                "Animator",
                &format!("component://{component_entity}/Animator"),
                "",
            )
        } else {
            handle_map(false, "Animator", "", "Animator component not found")
        }
    });
    let component_entity = context.entity.clone();
    let components = context.components.clone();
    engine.register_fn("audio_source", move || {
        if components.iter().any(|kind| kind == "AudioSource") {
            format!("component://{component_entity}/AudioSource")
        } else {
            String::new()
        }
    });
    let component_entity = context.entity.clone();
    let components = context.components.clone();
    engine.register_fn("audio_source_handle", move || {
        if components.iter().any(|kind| kind == "AudioSource") {
            handle_map(
                true,
                "AudioSource",
                &format!("component://{component_entity}/AudioSource"),
                "",
            )
        } else {
            handle_map(false, "AudioSource", "", "AudioSource component not found")
        }
    });
}

fn register_input_api(engine: &mut Engine, context: &ScriptContext) {
    let input = context.input.clone();
    let snapshot = input.clone();
    engine.register_fn("input_down", move |action: &str| {
        snapshot.down.get(action).copied().unwrap_or(false)
    });
    let snapshot = context.input.clone();
    engine.register_fn("is_down", move |action: &str| {
        snapshot.down.get(action).copied().unwrap_or(false)
    });
    let snapshot = input.clone();
    engine.register_fn("input_pressed", move |action: &str| {
        snapshot.pressed.get(action).copied().unwrap_or(false)
    });
    let snapshot = context.input.clone();
    engine.register_fn("was_pressed", move |action: &str| {
        snapshot.pressed.get(action).copied().unwrap_or(false)
    });
    let snapshot = input.clone();
    engine.register_fn("input_released", move |action: &str| {
        snapshot.released.get(action).copied().unwrap_or(false)
    });
    let snapshot = context.input.clone();
    engine.register_fn("was_released", move |action: &str| {
        snapshot.released.get(action).copied().unwrap_or(false)
    });
    let snapshot = input.clone();
    engine.register_fn("input_axis", move |action: &str| {
        snapshot.axes.get(action).copied().unwrap_or(0.0)
    });
    let snapshot = context.input.clone();
    engine.register_fn("axis", move |action: &str| {
        snapshot.axes.get(action).copied().unwrap_or(0.0)
    });
    let snapshot = input.clone();
    engine.register_fn("input_vector_x", move |action: &str| {
        snapshot.vectors.get(action).map_or(0.0, |value| value[0])
    });
    let snapshot = input.clone();
    engine.register_fn("input_vector_y", move |action: &str| {
        snapshot.vectors.get(action).map_or(0.0, |value| value[1])
    });
    let snapshot = input.clone();
    engine.register_fn("input_vector", move |action: &str| {
        vector_map(snapshot.vectors.get(action).copied().unwrap_or([0.0, 0.0]))
    });
    let snapshot = context.input.clone();
    engine.register_fn("vector_x", move |action: &str| {
        snapshot.vectors.get(action).map_or(0.0, |value| value[0])
    });
    let snapshot = context.input.clone();
    engine.register_fn("vector_y", move |action: &str| {
        snapshot.vectors.get(action).map_or(0.0, |value| value[1])
    });
    let snapshot = context.input.clone();
    engine.register_fn("vector", move |action: &str| {
        vector_map(snapshot.vectors.get(action).copied().unwrap_or([0.0, 0.0]))
    });
    let snapshot = input.clone();
    engine.register_fn("mouse_x", move || snapshot.mouse_position[0]);
    let snapshot = input.clone();
    engine.register_fn("mouse_y", move || snapshot.mouse_position[1]);
    let snapshot = input.clone();
    engine.register_fn("wheel_x", move || snapshot.wheel[0]);
    engine.register_fn("wheel_y", move || input.wheel[1]);
}

fn vector_map(value: [f64; 2]) -> Map {
    let mut map = Map::new();
    map.insert("x".into(), Dynamic::from_float(value[0]));
    map.insert("y".into(), Dynamic::from_float(value[1]));
    map
}

fn register_property_api(engine: &mut Engine, context: &ScriptContext) {
    let numbers = context.properties.clone();
    engine.register_fn("export_value", move |name: &str, fallback: FLOAT| {
        numbers
            .get(name)
            .and_then(Value::as_f64)
            .unwrap_or(fallback)
    });
    let integers = context.properties.clone();
    engine.register_fn("export_value", move |name: &str, fallback: INT| {
        integers
            .get(name)
            .and_then(Value::as_i64)
            .unwrap_or(fallback)
    });
    let booleans = context.properties.clone();
    engine.register_fn("export_value", move |name: &str, fallback: bool| {
        booleans
            .get(name)
            .and_then(Value::as_bool)
            .unwrap_or(fallback)
    });
    let strings = context.properties.clone();
    engine.register_fn("export_value", move |name: &str, fallback: &str| {
        strings
            .get(name)
            .and_then(Value::as_str)
            .unwrap_or(fallback)
            .to_owned()
    });
}

fn register_save_api(
    engine: &mut Engine,
    context: &ScriptContext,
    output: Rc<RefCell<HostOutput>>,
) {
    let values = context.save.clone();
    engine.register_fn("save_has", move |key: &str| values.contains_key(key));

    let values = context.save.clone();
    engine.register_fn("save_get", move |key: &str, fallback: Dynamic| {
        values
            .get(key)
            .and_then(json_to_dynamic)
            .unwrap_or(fallback)
    });

    let commands = Rc::clone(&output);
    engine.register_fn("save_set", move |key: &str, value: Dynamic| {
        let key = key.trim().chars().take(80).collect::<String>();
        let Some(value) = dynamic_to_json(value) else {
            commands.borrow_mut().logs.push(ScriptLog {
                level: "error".into(),
                message: "Save.set received an unsupported value".into(),
            });
            return;
        };
        if key.is_empty() {
            commands.borrow_mut().logs.push(ScriptLog {
                level: "error".into(),
                message: "Save.set requires a non-empty key".into(),
            });
            return;
        }
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::SaveSet { key, value });
    });

    let commands = Rc::clone(&output);
    engine.register_fn("save_delete", move |key: &str| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::SaveDelete {
                key: key.trim().chars().take(80).collect(),
            });
    });
    let commands = Rc::clone(&output);
    engine.register_fn("save_clear", move || {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::SaveClear);
    });
    let commands = Rc::clone(&output);
    engine.register_fn("save_load", move |slot: &str| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::SaveLoad {
                slot: slot.trim().chars().take(80).collect(),
            });
    });
    engine.register_fn("save_commit", move |slot: &str| {
        output
            .borrow_mut()
            .commands
            .push(ScriptCommand::SaveCommit {
                slot: slot.trim().chars().take(80).collect(),
            });
    });
}

fn register_command_api(
    engine: &mut Engine,
    context: &ScriptContext,
    output: Rc<RefCell<HostOutput>>,
) {
    let assertions = Rc::clone(&output);
    engine.register_fn("expect", move |condition: bool, message: &str| {
        if !condition {
            assertions.borrow_mut().logs.push(ScriptLog {
                level: "error".into(),
                message: format!(
                    "Expectation failed: {}",
                    message.chars().take(512).collect::<String>()
                ),
            });
        }
        condition
    });
    let commands = Rc::clone(&output);
    engine.register_fn("apply_force", move |x: FLOAT, y: FLOAT| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::ApplyForce { x, y });
    });
    let commands = Rc::clone(&output);
    engine.register_fn("apply_impulse", move |x: FLOAT, y: FLOAT| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::ApplyImpulse { x, y });
    });
    let commands = Rc::clone(&output);
    engine.register_fn("set_velocity", move |x: FLOAT, y: FLOAT| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::SetVelocity { x, y });
    });
    let commands = Rc::clone(&output);
    engine.register_fn("set_position", move |x: FLOAT, y: FLOAT| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::SetPosition { x, y });
    });
    let commands = Rc::clone(&output);
    engine.register_fn("set_rotation", move |radians: FLOAT| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::SetRotation { radians });
    });
    let commands = Rc::clone(&output);
    engine.register_fn("set_scale", move |x: FLOAT, y: FLOAT| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::SetScale { x, y });
    });
    let commands = Rc::clone(&output);
    engine.register_fn("set_angular_velocity", move |radians_per_second: FLOAT| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::SetAngularVelocity { radians_per_second });
    });

    let character = context.character.clone().unwrap_or_default();
    let snapshot = character.clone();
    engine.register_fn("character_is_on_floor", move || snapshot.on_floor);
    let snapshot = character.clone();
    engine.register_fn("character_is_on_wall", move || snapshot.on_wall);
    let snapshot = character.clone();
    engine.register_fn("character_is_on_ceiling", move || snapshot.on_ceiling);
    let snapshot = character.clone();
    engine.register_fn("character_can_coyote_jump", move || {
        snapshot.can_coyote_jump
    });
    let snapshot = character.clone();
    engine.register_fn("can_coyote_jump", move || snapshot.can_coyote_jump);
    let snapshot = character.clone();
    engine.register_fn("character_floor_normal_x", move || snapshot.floor_normal[0]);
    let snapshot = character.clone();
    engine.register_fn("character_floor_normal_y", move || snapshot.floor_normal[1]);
    let snapshot = character.clone();
    engine.register_fn("character_floor_normal", move || {
        vector_map(snapshot.floor_normal)
    });
    let snapshot = character.clone();
    engine.register_fn("character_platform_velocity_x", move || {
        snapshot.platform_velocity[0]
    });
    let snapshot = character.clone();
    engine.register_fn("character_platform_velocity", move || {
        vector_map(snapshot.platform_velocity)
    });
    engine.register_fn("character_platform_velocity_y", move || {
        character.platform_velocity[1]
    });
    let commands = Rc::clone(&output);
    engine.register_fn("move_character", move |x: FLOAT, y: FLOAT| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::MoveCharacter { x, y });
    });
    let commands = Rc::clone(&output);
    engine.register_fn("animator_set_bool", move |name: &str, value: bool| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::AnimatorSetBool {
                name: name.chars().take(80).collect(),
                value,
            });
    });
    let commands = Rc::clone(&output);
    engine.register_fn("animator_set_float", move |name: &str, value: FLOAT| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::AnimatorSetFloat {
                name: name.chars().take(80).collect(),
                value,
            });
    });
    let commands = Rc::clone(&output);
    engine.register_fn("animator_set_integer", move |name: &str, value: INT| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::AnimatorSetInteger {
                name: name.chars().take(80).collect(),
                value,
            });
    });
    let commands = Rc::clone(&output);
    engine.register_fn("animator_trigger", move |name: &str| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::AnimatorTrigger {
                name: name.chars().take(80).collect(),
            });
    });
    let commands = Rc::clone(&output);
    engine.register_fn("animator_play", move |state: &str| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::AnimatorPlay {
                state: state.chars().take(80).collect(),
            });
    });
    let commands = Rc::clone(&output);
    engine.register_fn("audio_play", move || {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::AudioPlay)
    });
    let commands = Rc::clone(&output);
    engine.register_fn("audio_pause", move || {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::AudioPause)
    });
    let commands = Rc::clone(&output);
    engine.register_fn("audio_stop", move || {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::AudioStop)
    });
    let commands = Rc::clone(&output);
    engine.register_fn("destroy", move || {
        commands.borrow_mut().commands.push(ScriptCommand::Destroy)
    });

    let commands = Rc::clone(&output);
    engine.register_fn("despawn", move || {
        commands.borrow_mut().commands.push(ScriptCommand::Despawn)
    });
    let commands = Rc::clone(&output);
    engine.register_fn("instantiate", move |prefab: &str| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::Instantiate {
                prefab: prefab.chars().take(512).collect(),
            });
    });
    let commands = Rc::clone(&output);
    engine.register_fn("scene_load", move |scene: &str| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::LoadScene {
                scene: scene.chars().take(512).collect(),
            });
    });
    let commands = Rc::clone(&output);
    engine.register_fn("scene_reload", move || {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::ReloadScene)
    });
    let commands = Rc::clone(&output);
    engine.register_fn("scene_quit", move || {
        commands.borrow_mut().commands.push(ScriptCommand::Quit)
    });
    let commands = Rc::clone(&output);
    engine.register_fn(
        "timer_start",
        move |name: &str, seconds: FLOAT, repeat: bool| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::StartTimer {
                    name: name.chars().take(128).collect(),
                    seconds: seconds.max(0.0),
                    repeat,
                });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn("timer_pause", move |name: &str| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::PauseTimer {
                name: name.chars().take(128).collect(),
            });
    });
    let commands = Rc::clone(&output);
    engine.register_fn("timer_resume", move |name: &str| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::ResumeTimer {
                name: name.chars().take(128).collect(),
            });
    });
    let commands = Rc::clone(&output);
    engine.register_fn("timer_cancel", move |name: &str| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::CancelTimer {
                name: name.chars().take(128).collect(),
            });
    });
    let commands = Rc::clone(&output);
    engine.register_fn("task_wait", move |name: &str, seconds: FLOAT| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::StartTask {
                name: name.chars().take(128).collect(),
                seconds: seconds.max(0.0),
            });
    });
    let commands = Rc::clone(&output);
    engine.register_fn("task_cancel", move |name: &str| {
        commands
            .borrow_mut()
            .commands
            .push(ScriptCommand::CancelTask {
                name: name.chars().take(128).collect(),
            });
    });
    let commands = Rc::clone(&output);
    engine.register_fn(
        "signal_emit",
        move |name: &str, payload: Dynamic| match dynamic_to_json(payload) {
            Some(payload) => commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::EmitSignal {
                    name: name.chars().take(128).collect(),
                    target: String::new(),
                    payload,
                }),
            None => commands.borrow_mut().logs.push(ScriptLog {
                level: "error".into(),
                message: "Signal payload is not serializable".into(),
            }),
        },
    );
    engine.register_fn(
        "signal_emit_to",
        move |target: &str, name: &str, payload: Dynamic| match dynamic_to_json(payload) {
            Some(payload) => output
                .borrow_mut()
                .commands
                .push(ScriptCommand::EmitSignal {
                    name: name.chars().take(128).collect(),
                    target: target.chars().take(128).collect(),
                    payload,
                }),
            None => output.borrow_mut().logs.push(ScriptLog {
                level: "error".into(),
                message: "Signal payload is not serializable".into(),
            }),
        },
    );
}

fn call_lifecycle(
    engine: &Engine,
    scope: &mut Scope,
    ast: &AST,
    function: &str,
    context: &ScriptContext,
) -> Result<(), String> {
    let exists = ast
        .iter_functions()
        .any(|metadata| metadata.name == function);
    if !exists {
        return Ok(());
    }
    let result = match function {
        "update" | "late_update" => {
            engine.call_fn::<Dynamic>(scope, ast, function, (context.time.delta,))
        }
        "fixed_update" => {
            engine.call_fn::<Dynamic>(scope, ast, function, (context.time.fixed_delta,))
        }
        "on_timer" => {
            let name = context
                .contact
                .as_ref()
                .map(|contact| contact.other_entity.clone())
                .unwrap_or_default();
            engine.call_fn::<Dynamic>(scope, ast, function, (name,))
        }
        "on_task" => {
            let name = context
                .event
                .as_ref()
                .map(|event| event.name.clone())
                .unwrap_or_default();
            engine.call_fn::<Dynamic>(scope, ast, function, (name,))
        }
        "on_signal" => {
            let event = context.event.clone().unwrap_or_default();
            let payload = json_to_dynamic(&event.payload).unwrap_or(Dynamic::UNIT);
            engine.call_fn::<Dynamic>(scope, ast, function, (event.name, payload, event.source))
        }
        "on_collision_enter" | "on_collision_stay" | "on_collision_exit" | "on_trigger_enter"
        | "on_trigger_exit" => {
            let contact = context.contact.clone().unwrap_or_default();
            engine.call_fn::<Dynamic>(
                scope,
                ast,
                function,
                (
                    contact.other_entity,
                    contact.point[0],
                    contact.point[1],
                    contact.normal[0],
                    contact.normal[1],
                    contact.relative_velocity[0],
                    contact.relative_velocity[1],
                ),
            )
        }
        _ => engine.call_fn::<Dynamic>(scope, ast, function, ()),
    };
    result.map(|_| ()).map_err(|error| error.to_string())
}

fn collect_properties(
    scope: &Scope,
    exports: &[ExportedProperty],
    previous: &BTreeMap<String, Value>,
) -> BTreeMap<String, Value> {
    let mut values = BTreeMap::new();
    for export in exports {
        let value = scope
            .get_value::<Dynamic>(&export.name)
            .and_then(dynamic_to_json)
            .or_else(|| previous.get(&export.name).cloned())
            .unwrap_or_else(|| export.value.clone());
        values.insert(export.name.clone(), value);
    }
    values
}

fn dynamic_to_json(value: Dynamic) -> Option<Value> {
    if value.is::<bool>() {
        Some(Value::Bool(value.cast::<bool>()))
    } else if value.is::<INT>() {
        Some(Value::from(value.cast::<INT>()))
    } else if value.is::<FLOAT>() {
        serde_json::Number::from_f64(value.cast::<FLOAT>()).map(Value::Number)
    } else if value.is::<rhai::ImmutableString>() {
        Some(Value::String(
            value.cast::<rhai::ImmutableString>().to_string(),
        ))
    } else if value.is::<rhai::Array>() {
        value
            .cast::<rhai::Array>()
            .into_iter()
            .map(dynamic_to_json)
            .collect::<Option<Vec<_>>>()
            .map(Value::Array)
    } else if value.is::<Map>() {
        value
            .cast::<Map>()
            .into_iter()
            .map(|(key, value)| dynamic_to_json(value).map(|value| (key.to_string(), value)))
            .collect::<Option<serde_json::Map<String, Value>>>()
            .map(Value::Object)
    } else {
        None
    }
}

fn json_to_dynamic(value: &Value) -> Option<Dynamic> {
    match value {
        Value::Null => Some(Dynamic::UNIT),
        Value::Bool(value) => Some(Dynamic::from_bool(*value)),
        Value::Number(value) if value.is_i64() => value.as_i64().map(Dynamic::from_int),
        Value::Number(value) => value.as_f64().map(Dynamic::from_float),
        Value::String(value) => Some(Dynamic::from(value.clone())),
        Value::Array(values) => values
            .iter()
            .map(json_to_dynamic)
            .collect::<Option<rhai::Array>>()
            .map(Dynamic::from_array),
        Value::Object(values) => values
            .iter()
            .map(|(key, value)| json_to_dynamic(value).map(|value| (key.clone().into(), value)))
            .collect::<Option<Map>>()
            .map(Dynamic::from_map),
    }
}

fn prepare_script(source: &str) -> Result<PreparedScript, String> {
    if source.len() > 1_000_000 {
        return Err("script source exceeds the 1 MB safety limit".into());
    }
    let mut exports = Vec::new();
    let mut output = String::with_capacity(source.len());
    for line in source.lines() {
        let trimmed = line.trim();
        let declaration = if let Some(value) = trimmed.strip_prefix("@export ") {
            Some(value)
        } else {
            trimmed.strip_prefix("// @export ")
        };
        if let Some(declaration) = declaration {
            let declaration = declaration.strip_prefix("let ").unwrap_or(declaration);
            let Some((name, value)) = declaration.trim_end_matches(';').split_once('=') else {
                return Err(format!("invalid exported property declaration: {trimmed}"));
            };
            let name = name.trim().split(':').next().unwrap_or_default().trim();
            if !is_identifier(name) {
                return Err(format!("invalid exported property name: {name}"));
            }
            let expression = value.trim();
            let parsed = parse_export_value(expression)
                .ok_or_else(|| format!("unsupported exported property value: {expression}"))?;
            exports.push(ExportedProperty {
                name: name.to_owned(),
                value: parsed,
            });
            output.push_str(&format!(
                "let {name} = export_value(\"{name}\", {expression});\n"
            ));
        } else {
            output.push_str(line);
            output.push('\n');
        }
    }
    Ok(PreparedScript {
        source: output,
        exports,
    })
}

fn is_identifier(value: &str) -> bool {
    let mut chars = value.chars();
    chars
        .next()
        .is_some_and(|value| value == '_' || value.is_ascii_alphabetic())
        && chars.all(|value| value == '_' || value.is_ascii_alphanumeric())
}

fn parse_export_value(value: &str) -> Option<Value> {
    match value {
        "true" => Some(Value::Bool(true)),
        "false" => Some(Value::Bool(false)),
        _ if value.starts_with('"') && value.ends_with('"') && value.len() >= 2 => {
            serde_json::from_str(value).ok()
        }
        _ => value
            .parse::<i64>()
            .map(Value::from)
            .or_else(|_| {
                value
                    .parse::<f64>()
                    .ok()
                    .and_then(serde_json::Number::from_f64)
                    .map(Value::Number)
                    .ok_or(())
            })
            .ok(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn context() -> ScriptContext {
        ScriptContext {
            entity: "entity-1".into(),
            entity_name: "Player".into(),
            components: vec!["RigidBody2D".into()],
            time: TimeSnapshot {
                delta: 0.25,
                fixed_delta: 1.0 / 60.0,
                elapsed: 1.0,
                scale: 1.0,
                frame: 3,
            },
            input: InputSnapshot {
                pressed: BTreeMap::from([("Jump".into(), true)]),
                ..InputSnapshot::default()
            },
            ..ScriptContext::default()
        }
    }

    #[test]
    fn exported_properties_and_commands_cross_the_sandbox_boundary() {
        let source = r#"
            @export let jump_force = 5.0;
            fn update(dt) {
                if input_pressed("Jump") {
                    apply_impulse(0.0, jump_force * dt);
                    print(`jump ${entity_name()}`);
                }
            }
        "#;
        let execution = ScriptRuntime::new()
            .execute(source, "update", context())
            .unwrap();
        assert_eq!(execution.properties["jump_force"], 5.0);
        assert_eq!(
            execution.commands,
            vec![ScriptCommand::ApplyImpulse { x: 0.0, y: 1.25 }]
        );
        assert_eq!(execution.logs[0].message, "jump Player");
    }

    #[test]
    fn animation_and_audio_commands_cross_the_sandbox_boundary() {
        let source = r#"
            fn update(dt) {
                animator_set_bool("moving", true);
                animator_set_float("speed", dt);
                animator_set_integer("direction", 2);
                animator_trigger("jump");
                animator_play("Run");
                audio_play();
                audio_pause();
                audio_stop();
            }
        "#;
        let execution = ScriptRuntime::new()
            .execute(source, "update", context())
            .unwrap();
        assert_eq!(
            execution.commands,
            vec![
                ScriptCommand::AnimatorSetBool {
                    name: "moving".into(),
                    value: true
                },
                ScriptCommand::AnimatorSetFloat {
                    name: "speed".into(),
                    value: 0.25
                },
                ScriptCommand::AnimatorSetInteger {
                    name: "direction".into(),
                    value: 2
                },
                ScriptCommand::AnimatorTrigger {
                    name: "jump".into()
                },
                ScriptCommand::AnimatorPlay {
                    state: "Run".into()
                },
                ScriptCommand::AudioPlay,
                ScriptCommand::AudioPause,
                ScriptCommand::AudioStop,
            ]
        );
    }

    #[test]
    fn late_update_receives_the_render_delta() {
        let source = r#"
            fn late_update(dt) {
                set_position(dt, time_delta());
            }
        "#;
        let execution = ScriptRuntime::new()
            .execute(source, "late_update", context())
            .unwrap();
        assert_eq!(
            execution.commands,
            vec![ScriptCommand::SetPosition { x: 0.25, y: 0.25 }]
        );
    }

    #[test]
    fn entity_snapshots_use_copied_data_and_safe_component_handles() {
        let mut script_context = context();
        script_context.entity = "player-uuid".into();
        script_context
            .components
            .extend(["Animator".into(), "AudioSource".into()]);
        script_context
            .input
            .vectors
            .insert("Move".into(), [1.0, -0.5]);
        script_context.transform.position = [3.0, 4.0];
        script_context.rigid_body = Some(RigidBodySnapshot {
            velocity: [1.0, 2.0],
            angular_velocity: 0.5,
            mass: 8.0,
            body_type: "Dynamic".into(),
        });
        let source = r#"
            fn update(dt) {
                let pose = transform();
                let body = rigid_body();
                let movement = vector("Move");
                if get_component("RigidBody2D") == "component://player-uuid/RigidBody2D"
                    && animator() == "component://player-uuid/Animator"
                    && audio_source() == "component://player-uuid/AudioSource"
                    && body.valid {
                    set_position(pose.position_x + body.velocity_x * dt + movement.x, pose.position_y + movement.y);
                }
            }
        "#;
        let execution = ScriptRuntime::new()
            .execute(source, "update", script_context)
            .unwrap();
        assert_eq!(
            execution.commands,
            vec![ScriptCommand::SetPosition { x: 4.25, y: 3.5 }]
        );
    }

    #[test]
    fn scripts_cannot_import_host_modules() {
        let error = ScriptRuntime::new()
            .validate("import \"filesystem\";")
            .unwrap_err();
        assert!(
            error.to_lowercase().contains("reserved") || error.to_lowercase().contains("import")
        );
    }

    #[test]
    fn save_commands_support_scalars_arrays_and_maps() {
        let mut script_context = context();
        script_context.save.insert("coins".into(), Value::from(4));
        let source = r#"
            fn update(dt) {
                let next = save_get("coins", 0) + 1;
                save_set("coins", next);
                save_set("checkpoint", [2.0, 3.0]);
                save_set("flags", #{ boss: false, area: "cave" });
                save_commit("slot1");
            }
        "#;
        let execution = ScriptRuntime::new()
            .execute(source, "update", script_context)
            .unwrap();
        assert_eq!(execution.commands.len(), 4);
        assert!(matches!(
            &execution.commands[0],
            ScriptCommand::SaveSet { key, value } if key == "coins" && value == &Value::from(5)
        ));
        assert!(matches!(
            &execution.commands[3],
            ScriptCommand::SaveCommit { slot } if slot == "slot1"
        ));
    }

    #[test]
    fn runaway_scripts_hit_the_operation_limit() {
        let source = "fn update(dt) { while true { let value = dt * 2.0; } }";
        let error = ScriptRuntime::new()
            .execute(source, "update", context())
            .unwrap_err();
        assert!(error.to_lowercase().contains("operations"));
    }

    #[test]
    fn cached_compile_is_atomic_and_keeps_the_previous_valid_ast() {
        let mut runtime = ScriptRuntime::new();
        runtime
            .upsert("player", "fn update(dt) { set_velocity(3.0, 4.0); }")
            .unwrap();
        assert!(runtime.upsert("player", "fn update(dt) {").is_err());
        let result = runtime
            .execute_cached("player", "update", context())
            .unwrap();
        assert!(
            matches!(result.commands.first(), Some(ScriptCommand::SetVelocity { x, y }) if *x == 3.0 && *y == 4.0)
        );
    }

    #[test]
    fn signals_tasks_typed_handles_and_expectations_cross_the_sandbox() {
        let source = r#"
            fn update(dt) {
                let current = entity_handle();
                let missing = find_entity_handle("Nobody");
                expect(current.valid && !missing.valid, "typed handles");
                task_wait("resume", 0.25);
                signal_emit_to(current.id, "player.ready", #{ score: 3 });
            }
        "#;
        let result = ScriptRuntime::new()
            .execute(source, "update", context())
            .unwrap();
        assert!(result.logs.is_empty());
        assert!(result.commands.iter().any(|command| matches!(command, ScriptCommand::StartTask { name, seconds } if name == "resume" && *seconds == 0.25)));
        assert!(result.commands.iter().any(|command| matches!(command, ScriptCommand::EmitSignal { name, target, .. } if name == "player.ready" && target == "entity-1")));
    }

    #[test]
    fn lifecycle_functions_may_end_with_a_value_returning_expression() {
        let source = r#"
            fn test_expectation() {
                expect(true, "the final expression may return a value");
            }
        "#;
        let result = ScriptRuntime::new()
            .execute(source, "test_expectation", context())
            .unwrap();
        assert!(result.logs.is_empty());
    }

    #[test]
    fn seeded_random_numbers_are_repeatable_and_bounded() {
        let source = r#"
            fn update(dt) {
                set_position(random(), random_range(-4.0, 9.0));
            }
        "#;
        let mut seeded = context();
        seeded.random_seed = 0x1234_5678_9abc_def0;
        let first = ScriptRuntime::new()
            .execute(source, "update", seeded.clone())
            .unwrap();
        let second = ScriptRuntime::new()
            .execute(source, "update", seeded)
            .unwrap();
        assert_eq!(first.commands, second.commands);
        assert!(matches!(
            first.commands.first(),
            Some(ScriptCommand::SetPosition { x, y })
                if (0.0..1.0).contains(x) && (-4.0..9.0).contains(y)
        ));
    }
}
