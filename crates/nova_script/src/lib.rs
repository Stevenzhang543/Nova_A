// Rhai 沙箱运行时：编译缓存、导出属性、生命周期和受限宿主命令桥接。
//! Sandboxed Rhai execution for Nova_A gameplay scripts.
//!
//! The crate deliberately knows nothing about the editor, DOM, filesystem,
//! network, processes, or Tauri. Scripts can only observe the serialized host
//! context and return a small, validated command list.

use std::cell::RefCell;
use std::collections::BTreeMap;
use std::rc::Rc;

// Rhai selects `web_time::Instant` for wasm32 and `std::time::Instant` on
// native targets. Using its portable clock keeps graph tracing from trapping
// before any lifecycle function can run in the editor/player WebAssembly host.
use rhai::{Array, CallFnOptions, Dynamic, Engine, Instant, Map, Scope, AST, FLOAT, INT};
use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const MAX_SCRIPT_OPERATIONS: u64 = 100_000;
pub const MAX_SCRIPT_STRING_SIZE: usize = 262_144;
pub const MAX_SCRIPT_ARRAY_SIZE: usize = 8_192;
pub const MAX_SCRIPT_MAP_SIZE: usize = 4_096;
pub const MAX_SCRIPT_COMMANDS: usize = 4_096;
pub const MAX_SCRIPT_LOGS: usize = 512;
pub const CURRENT_SCRIPT_API_VERSION: u8 = 2;
pub const MINIMUM_SCRIPT_API_VERSION: u8 = 1;

// 提供新脚本上下文使用的当前脚本接口版本。
fn current_script_api_version() -> u8 {
    CURRENT_SCRIPT_API_VERSION
}

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
    pub performed: BTreeMap<String, bool>,
    #[serde(default)]
    pub cancelled: BTreeMap<String, bool>,
    #[serde(default)]
    pub phases: BTreeMap<String, String>,
    #[serde(default)]
    pub durations: BTreeMap<String, f64>,
    #[serde(default)]
    pub axes: BTreeMap<String, f64>,
    #[serde(default)]
    pub vectors: BTreeMap<String, [f64; 2]>,
    #[serde(default)]
    pub mouse_position: [f64; 2],
    #[serde(default)]
    pub mouse_world_position: [f64; 2],
    #[serde(default)]
    pub view_bounds: [f64; 4],
    #[serde(default)]
    pub viewport_size: [f64; 2],
    #[serde(default)]
    pub wheel: [f64; 2],
    #[serde(default)]
    pub contexts: Vec<String>,
    #[serde(default)]
    pub maps: Vec<String>,
    #[serde(default)]
    pub scheme: String,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneEntitySnapshot {
    pub uuid: String,
    #[serde(default)]
    pub generation: u32,
    pub name: String,
    pub enabled: bool,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub groups: Vec<String>,
    #[serde(default)]
    pub components: Vec<String>,
    #[serde(default)]
    pub position: [f64; 2],
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameFlowSnapshot {
    pub paused: bool,
    pub score: f64,
    #[serde(default)]
    pub session: BTreeMap<String, Value>,
    #[serde(default)]
    pub checkpoints: Vec<String>,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkSnapshot {
    pub enabled: bool,
    pub connected: bool,
    pub authority: bool,
    pub peer_count: u32,
    #[serde(default)]
    pub local_peer_id: String,
    #[serde(default)]
    pub role: String,
    pub tick: u64,
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
    // 构造零位置、零旋转和单位缩放的实体快照。
    fn default() -> Self {
        Self {
            position: [0.0, 0.0],
            rotation: 0.0,
            scale: unit_scale(),
        }
    }
}

// 返回默认二维单位缩放。
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
    #[serde(default = "current_script_api_version")]
    pub api_version: u8,
    pub entity: String,
    #[serde(default)]
    pub invocation_id: u64,
    #[serde(default)]
    pub callback_kind: String,
    #[serde(default)]
    pub entity_generations: BTreeMap<String, u32>,
    #[serde(default)]
    pub entity_name: String,
    #[serde(default)]
    pub components: Vec<String>,
    #[serde(default)]
    pub entities: BTreeMap<String, String>,
    #[serde(default)]
    pub scene_entities: Vec<SceneEntitySnapshot>,
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
    #[serde(default)]
    pub game_flow: GameFlowSnapshot,
    #[serde(default)]
    pub networking: NetworkSnapshot,
    #[serde(default)]
    pub editor_automation: bool,
    #[serde(default)]
    pub editor_selection: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum ScriptCommand {
    GraphTrace {
        graph_uuid: String,
        scope_uuid: String,
        node_uuid: String,
        edge_uuid: String,
        depth: i64,
        duration_micros: u64,
        values: Value,
    },
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
    SpawnAt {
        pending_id: String,
        prefab: String,
        x: f64,
        y: f64,
        rotation: f64,
        scale_x: f64,
        scale_y: f64,
    },
    TargetSetPosition {
        target: String,
        generation: u32,
        x: f64,
        y: f64,
    },
    TargetSetRotation {
        target: String,
        generation: u32,
        radians: f64,
    },
    TargetSetScale {
        target: String,
        generation: u32,
        x: f64,
        y: f64,
    },
    TargetSetEnabled {
        target: String,
        generation: u32,
        enabled: bool,
    },
    TargetSetComponentEnabled {
        target: String,
        generation: u32,
        component: String,
        enabled: bool,
    },
    TargetSetUiText {
        target: String,
        generation: u32,
        text: String,
    },
    TargetSetUiValue {
        target: String,
        generation: u32,
        value: f64,
    },
    TargetAddTag {
        target: String,
        generation: u32,
        tag: String,
    },
    TargetRemoveTag {
        target: String,
        generation: u32,
        tag: String,
    },
    TargetAddGroup {
        target: String,
        generation: u32,
        group: String,
    },
    TargetRemoveGroup {
        target: String,
        generation: u32,
        group: String,
    },
    TargetDestroy {
        target: String,
        generation: u32,
    },
    LoadScene {
        scene: String,
    },
    ReloadScene,
    Quit,
    GamePause {
        paused: bool,
    },
    CheckpointSet {
        name: String,
    },
    CheckpointRestore {
        name: String,
    },
    ScoreSet {
        value: f64,
    },
    ScoreAdd {
        value: f64,
    },
    SessionSet {
        key: String,
        value: Value,
    },
    InputContextPush {
        name: String,
        priority: i64,
        consume: bool,
    },
    InputContextPop {
        name: String,
    },
    InputMapEnable {
        name: String,
    },
    InputMapDisable {
        name: String,
    },
    InputSchemeSet {
        name: String,
    },
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
    UiSetText {
        text: String,
    },
    UiSetValue {
        value: f64,
    },
    NavigationSetTarget {
        x: f64,
        y: f64,
    },
    NetworkRpc {
        name: String,
        payload: Value,
    },
    EditorSelect {
        target: String,
        generation: u32,
    },
    EditorRename {
        target: String,
        generation: u32,
        name: String,
    },
    EditorCreateEntity {
        shape: String,
        name: String,
        x: f64,
        y: f64,
        width: f64,
        height: f64,
    },
    EditorCreateTextAsset {
        path: String,
        asset_type: String,
        source: String,
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
    pub value_type: String,
    pub default_value: Value,
    pub minimum: Option<f64>,
    pub maximum: Option<f64>,
    pub step: Option<f64>,
    pub enum_values: Vec<String>,
    pub resource_type: Option<String>,
    pub group: String,
    pub tooltip: String,
    pub serialized: bool,
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

#[derive(Clone, Debug, PartialEq)]
struct PreparedScript {
    source: String,
    exports: Vec<ExportedProperty>,
    compatibility_warnings: Vec<String>,
}

struct CompiledScript {
    prepared: PreparedScript,
    ast: AST,
}

#[derive(Clone, Default)]
pub struct ScriptRuntime {
    scripts: BTreeMap<String, Rc<CompiledScript>>,
}

impl ScriptRuntime {
    // 编译脚本并提取声明的函数名，供测试发现和生命周期调度使用。
    /// Discover actual script functions without executing module statements.
    /// Receiver methods are not callable as test/lifecycle callbacks.
    pub fn function_names(&self, source: &str) -> Result<Vec<String>, String> {
        let prepared = prepare_script(source)?;
        let ast = base_engine().compile(&prepared.source).map_err(
            /* 将底层错误转换为字符串，保留错误信息供上层返回。 */
            |error| error.to_string(),
        )?;
        Ok(ast
            .iter_functions()
            .filter(
                /* 计算并返回 function . this_type . is_none ()，用于当前 function_names 流程。 */
                |function| function.this_type.is_none(),
            )
            .map(
                /* 计算并返回 function . name . to_owned ()，用于当前 function_names 流程。 */
                |function| function.name.to_owned(),
            )
            .collect())
    }

    // 创建空脚本编译缓存的默认运行时。
    pub fn new() -> Self {
        Self::default()
    }

    // 编译并校验脚本，返回可编辑导出属性或错误。
    pub fn validate(&self, source: &str) -> Result<Vec<ExportedProperty>, String> {
        let prepared = prepare_script(source)?;
        let engine = base_engine();
        engine.compile(&prepared.source).map_err(
            /* 将底层错误转换为字符串，保留错误信息供上层返回。 */
            |error| error.to_string(),
        )?;
        Ok(prepared.exports)
    }

    // 准备脚本后按给定上下文执行指定生命周期回调。
    pub fn execute(
        &self,
        source: &str,
        function: &str,
        context: ScriptContext,
    ) -> Result<ScriptExecution, String> {
        let prepared = prepare_script(source)?;
        let engine = base_engine();
        let ast = engine.compile(&prepared.source).map_err(
            /* 将底层错误转换为字符串，保留错误信息供上层返回。 */
            |error| error.to_string(),
        )?;
        execute_prepared(&prepared, &ast, function, context)
    }

    // 先完成新脚本编译，再原子替换缓存；失败时保留旧程序。
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
        if let Some(existing) = self.scripts.get(script_id) {
            if existing.prepared == prepared {
                return Ok(existing.prepared.exports.clone());
            }
        }
        let ast = base_engine().compile(&prepared.source).map_err(
            /* 将底层错误转换为字符串，保留错误信息供上层返回。 */
            |error| error.to_string(),
        )?;
        let exports = prepared.exports.clone();
        self.scripts.insert(
            script_id.to_owned(),
            Rc::new(CompiledScript { prepared, ast }),
        );
        Ok(exports)
    }

    // 移除指定脚本的缓存条目并返回是否存在。
    pub fn remove(&mut self, script_id: &str) -> bool {
        self.scripts.remove(script_id).is_some()
    }

    // 从编译缓存读取脚本并按本次上下文执行。
    pub fn execute_cached(
        &self,
        script_id: &str,
        function: &str,
        context: ScriptContext,
    ) -> Result<ScriptExecution, String> {
        let compiled = self
            .scripts
            .get(script_id)
            .ok_or_else(/* 计算并返回 format ! ("script is not compiled: {script_id}")，用于当前 execute_cached 流程。 */ || format!("script is not compiled: {script_id}"))?;
        execute_prepared(&compiled.prepared, &compiled.ast, function, context)
    }
}

// 建立受限宿主引擎，恢复导出状态，执行回调并汇总命令和属性。
fn execute_prepared(
    prepared: &PreparedScript,
    ast: &AST,
    function: &str,
    context: ScriptContext,
) -> Result<ScriptExecution, String> {
    let output = Rc::new(RefCell::new(HostOutput::default()));
    let engine = engine_with_host(&context, Rc::clone(&output));
    let mut scope = Scope::new();
    if let Err(error) = engine.run_ast_with_scope(&mut scope, ast) {
        if let Some(limit) = host_output_limit_error(&output) {
            return Err(limit);
        }
        return Err(error.to_string());
    }
    if let Err(error) = call_lifecycle(&engine, &mut scope, ast, function, &context) {
        if let Some(limit) = host_output_limit_error(&output) {
            return Err(limit);
        }
        return Err(error);
    }

    let properties = collect_properties(&scope, &prepared.exports, &context.properties);
    let mut output = output.borrow_mut();
    if output.commands.len() > MAX_SCRIPT_COMMANDS {
        return Err(format!(
            "script emitted {} host commands; the per-invocation limit is {MAX_SCRIPT_COMMANDS}",
            output.commands.len()
        ));
    }
    output.logs.truncate(MAX_SCRIPT_LOGS);
    for warning in &prepared.compatibility_warnings {
        if output.logs.len() >= MAX_SCRIPT_LOGS {
            break;
        }
        output.logs.push(ScriptLog {
            level: "warning".into(),
            message: warning.clone(),
        });
    }
    Ok(ScriptExecution {
        commands: std::mem::take(&mut output.commands),
        logs: std::mem::take(&mut output.logs),
        properties,
    })
}

// 检查沙箱宿主输出是否超过命令或文本等预算，并提供错误消息。
fn host_output_limit_error(output: &Rc<RefCell<HostOutput>>) -> Option<String> {
    let output = output.borrow();
    if output.commands.len() > MAX_SCRIPT_COMMANDS {
        Some(format!("script emitted too many host commands; the per-invocation limit is {MAX_SCRIPT_COMMANDS}"))
    } else if output.logs.len() > MAX_SCRIPT_LOGS {
        Some(format!(
            "script emitted too many log entries; the per-invocation limit is {MAX_SCRIPT_LOGS}"
        ))
    } else {
        None
    }
}

// 创建基础 Rhai 引擎并配置操作、集合及调用深度限制。
fn base_engine() -> Engine {
    let mut engine = Engine::new();
    engine.set_max_operations(MAX_SCRIPT_OPERATIONS);
    engine.set_max_call_levels(32);
    engine.set_max_expr_depths(64, 32);
    engine.set_max_string_size(MAX_SCRIPT_STRING_SIZE);
    engine.set_max_array_size(MAX_SCRIPT_ARRAY_SIZE);
    engine.set_max_map_size(MAX_SCRIPT_MAP_SIZE);
    engine.disable_symbol("eval");
    engine.disable_symbol("import");
    engine.disable_symbol("sleep");
    // A VM operation budget cannot interrupt an OS thread sleep, and sleeping
    // traps on wasm32-unknown-unknown. Guard function-pointer dispatch as well
    // as direct syntax; scripts should schedule timers/tasks through the host.
    engine.register_fn(
        "sleep",
        /* 拒绝阻塞睡眠调用，引导脚本使用引擎计时器或任务调度。 */
        |_seconds: INT| -> Result<(), Box<rhai::EvalAltResult>> {
            Err("Blocking sleep is disabled; use Nova_A timer/task scheduling".into())
        },
    );
    engine.register_fn(
        "sleep",
        /* 拒绝阻塞睡眠调用，引导脚本使用引擎计时器或任务调度。 */
        |_seconds: FLOAT| -> Result<(), Box<rhai::EvalAltResult>> {
            Err("Blocking sleep is disabled; use Nova_A timer/task scheduling".into())
        },
    );
    engine
}

// 在基础沙箱注册各宿主接口和有界输出回调。
fn engine_with_host(context: &ScriptContext, output: Rc<RefCell<HostOutput>>) -> Engine {
    let mut engine = base_engine();

    let resource_budget = Rc::clone(&output);
    engine.on_progress(
        /* 在执行进度边界检查宿主命令与日志数量，超过预算立即中止脚本。 */
        move |_| {
            let output = resource_budget.borrow();
            if output.commands.len() > MAX_SCRIPT_COMMANDS {
                Some("Script emitted too many host commands".into())
            } else if output.logs.len() > MAX_SCRIPT_LOGS {
                Some("Script emitted too many log entries".into())
            } else {
                None
            }
        },
    );

    let logs = Rc::clone(&output);
    engine.on_print(
        /* 将脚本打印转换为有条数与字符长度限制的信息日志。 */
        move |message| {
            let mut logs = logs.borrow_mut();
            if logs.logs.len() < MAX_SCRIPT_LOGS {
                logs.logs.push(ScriptLog {
                    level: "info".into(),
                    message: message.chars().take(4_096).collect(),
                });
            }
        },
    );

    let entity = context.entity.clone();
    engine.register_fn(
        "entity",
        /* 复制 entity . clone () 的结果，避免向调用方暴露可变宿主引用。 */
        move || entity.clone(),
    );
    let api_version = if context.api_version == 0 {
        CURRENT_SCRIPT_API_VERSION
    } else {
        context
            .api_version
            .clamp(MINIMUM_SCRIPT_API_VERSION, CURRENT_SCRIPT_API_VERSION)
    };
    engine.register_fn(
        "api_version",
        /* 返回当前快照值 api_version as INT。 */ move || api_version as INT,
    );
    engine.register_fn(
        "api_current_version",
        /* 返回当前快照值 CURRENT_SCRIPT_API_VERSION as INT。 */
        || CURRENT_SCRIPT_API_VERSION as INT,
    );
    engine.register_fn(
        "api_minimum_version",
        /* 返回当前快照值 MINIMUM_SCRIPT_API_VERSION as INT。 */
        || MINIMUM_SCRIPT_API_VERSION as INT,
    );
    engine.register_fn("api_namespace", /* 计算并返回 symbol . split ('_') . next () . unwrap_or (symbol) . to_owned ()，用于当前 engine_with_host 流程。 */ |symbol: &str| {
        symbol.split('_').next().unwrap_or(symbol).to_owned()
    });
    let entity = context.entity.clone();
    let generation = context.entity_generations.get(&entity).copied();
    engine.register_fn(
        "entity_handle",
        /* 计算并返回 entity_handle_map (& entity , generation)，用于当前 engine_with_host 流程。 */
        move || entity_handle_map(&entity, generation),
    );
    let entity_name = context.entity_name.clone();
    engine.register_fn(
        "entity_name",
        /* 复制 entity_name . clone () 的结果，避免向调用方暴露可变宿主引用。 */
        move || entity_name.clone(),
    );
    let entities = context.entities.clone();
    engine.register_fn("find_entity", /* 按 entities . get (name) . cloned () . unwrap_or_default () 读取或转换可选值，保留转换失败分支。 */ move |name: &str| {
        entities.get(name).cloned().unwrap_or_default()
    });
    let entities = context.entities.clone();
    let generations = context.entity_generations.clone();
    engine.register_fn("find_entity_handle", /* 按名称查找实体并附上生命周期代数；不存在时返回失效句柄。 */ move |name: &str| {
        entities
            .get(name)
            .map(/* 按 entity_handle_map (id , generations . get (id) . copied ()) 读取或转换可选值，保留转换失败分支。 */ |id| entity_handle_map(id, generations.get(id).copied()))
            .unwrap_or_else(/* 计算并返回 handle_map (false , "Entity" , "" , "Entity not found")，用于当前 engine_with_host 流程。 */ || handle_map(false, "Entity", "", "Entity not found"))
    });
    let components = context.components.clone();
    engine.register_fn("has_component", /* 判断 components . iter () . any (| component | component == kind) 是否成立，供过滤或有效性检查使用。 */ move |kind: &str| {
        components.iter().any(/* 判断 component == kind 是否成立，供过滤或有效性检查使用。 */ |component| component == kind)
    });
    let component_entity = context.entity.clone();
    let components = context.components.clone();
    engine.register_fn("get_component", /* 查找实体实际拥有的组件，返回其引用字符串；缺失则返回空串。 */ move |kind: &str| {
        components
            .iter()
            .find(/* 判断 component . as_str () == kind 是否成立，供过滤或有效性检查使用。 */ |component| component.as_str() == kind)
            .map(/* 计算并返回 format ! ("component://{component_entity}/{component}")，用于当前 engine_with_host 流程。 */ |component| format!("component://{component_entity}/{component}"))
            .unwrap_or_default()
    });
    let component_entity = context.entity.clone();
    let components = context.components.clone();
    engine.register_fn(
        "component_handle",
        /* 仅为当前实体实际拥有的组件生成有效句柄，否则返回带错误的失效句柄。 */
        move |kind: &str| {
            if components.iter().any(
                /* 判断 component == kind 是否成立，供过滤或有效性检查使用。 */
                |component| component == kind,
            ) {
                handle_map(
                    true,
                    kind,
                    &format!("component://{component_entity}/{kind}"),
                    "",
                )
            } else {
                handle_map(false, kind, "", "Component not found")
            }
        },
    );
    engine.register_fn(
        "resource_handle",
        /* 校验资源引用前缀、路径和类型后构造资源句柄。 */
        |reference: &str, resource_type: &str| {
            let valid = reference.starts_with("asset://")
                && reference.len() > "asset://".len()
                && !reference.contains("..")
                && !resource_type.trim().is_empty();
            handle_map(
                valid,
                resource_type.trim(),
                if valid { reference } else { "" },
                if valid {
                    ""
                } else {
                    "Invalid resource reference"
                },
            )
        },
    );
    register_entity_api(&mut engine, context);

    register_time_api(&mut engine, context);
    let random_state = Rc::new(RefCell::new(if context.random_seed == 0 {
        0x6d2b79f5
    } else {
        context.random_seed
    }));
    let state = Rc::clone(&random_state);
    engine.register_fn(
        "random",
        /* 推进异或移位随机状态，并将结果归一化到零到一之间。 */
        move || {
            let mut value = state.borrow_mut();
            *value ^= *value << 13;
            *value ^= *value >> 7;
            *value ^= *value << 17;
            (*value as f64) / (u64::MAX as f64 + 1.0)
        },
    );
    let state = Rc::clone(&random_state);
    engine.register_fn(
        "random_range",
        /* 校验随机范围，推进确定性异或移位种子，并映射到指定浮点区间。 */
        move |minimum: FLOAT, maximum: FLOAT| {
            if !minimum.is_finite() || !maximum.is_finite() || maximum <= minimum {
                return minimum;
            }
            let mut value = state.borrow_mut();
            *value ^= *value << 13;
            *value ^= *value >> 7;
            *value ^= *value << 17;
            minimum + (maximum - minimum) * ((*value as f64) / (u64::MAX as f64 + 1.0))
        },
    );
    register_input_api(&mut engine, context);
    register_game_flow_api(&mut engine, context);
    register_network_api(&mut engine, context);
    register_property_api(&mut engine, context);
    register_save_api(&mut engine, context, Rc::clone(&output));
    register_editor_automation_api(&mut engine, context, Rc::clone(&output));
    register_command_api(&mut engine, context, output);
    engine
}

// 构造带有效性、类型、身份和错误信息的脚本句柄映射。
fn handle_map(valid: bool, kind: &str, id: &str, error: &str) -> Map {
    let mut map = Map::new();
    map.insert("valid".into(), Dynamic::from_bool(valid));
    map.insert("kind".into(), Dynamic::from(kind.to_owned()));
    map.insert("id".into(), Dynamic::from(id.to_owned()));
    map.insert("error".into(), Dynamic::from(error.to_owned()));
    map.insert("api_version".into(), Dynamic::from_int(1));
    let generation = handle_generation(id);
    map.insert(
        "generation".into(),
        Dynamic::from_int(INT::from(generation)),
    );
    map
}

// 从句柄标识解析生命周期代数。
fn handle_generation(id: &str) -> u32 {
    id.bytes().fold(2_166_136_261_u32, /* 计算并返回 hash . wrapping_mul (16_777_619) ^ u32 :: from (byte)，用于当前 handle_generation 流程。 */ |hash, byte| {
        hash.wrapping_mul(16_777_619) ^ u32::from(byte)
    })
}

// 构造包含实体身份和生命周期代数的脚本句柄。
fn entity_handle_map(id: &str, generation: Option<u32>) -> Map {
    let mut handle = handle_map(true, "Entity", id, "");
    if let Some(generation) = generation {
        handle.insert(
            "generation".into(),
            Dynamic::from_int(INT::from(generation)),
        );
    }
    handle
}

// 校验句柄映射并取出命令目标身份与代数。
fn target_from_handle(handle: Map) -> Option<(String, u32)> {
    let id = handle.get("id")?.clone().try_cast::<String>()?;
    let generation = handle
        .get("generation")
        .and_then(
            /* 按 value . as_int () . ok () 读取或转换可选值，保留转换失败分支。 */
            |value| value.as_int().ok(),
        )
        .and_then(
            /* 按 u32 :: try_from (value) . ok () 读取或转换可选值，保留转换失败分支。 */
            |value| u32::try_from(value).ok(),
        )?;
    if id.is_empty() {
        None
    } else {
        Some((id, generation))
    }
}

// 按字符边界截断文本，使长度不超过给定上限。
fn bounded_text(value: &str, maximum: usize) -> String {
    value
        .chars()
        .filter(/* 判断 ! character . is_control () || * character == '\n' || * character == '\t' 是否成立，供过滤或有效性检查使用。 */ |character| !character.is_control() || *character == '\n' || *character == '\t')
        .take(maximum)
        .collect()
}

// 仅在允许的编辑器自动化上下文注册受限编辑命令。
fn register_editor_automation_api(
    engine: &mut Engine,
    context: &ScriptContext,
    output: Rc<RefCell<HostOutput>>,
) {
    let enabled = context.editor_automation;
    engine.register_fn(
        "editor_automation",
        /* 返回当前快照值 enabled。 */ move || enabled,
    );
    let selection = context.editor_selection.clone();
    engine.register_fn("editor_selected", /* 仅在自动化启用时读取最多二百五十六个选中实体句柄。 */ move || -> Array {
        if !enabled {
            return Array::new();
        }
        selection
            .iter()
            .take(256)
            .map(/* 计算并返回 Dynamic :: from_map (handle_map (true , "Entity" , id , ""))，用于当前 register_editor_automation_api 流程。 */ |id| Dynamic::from_map(handle_map(true, "Entity", id, "")))
            .collect()
    });
    let selection = context.editor_selection.clone();
    engine.register_fn("editor_selected_count", /* 按 if enabled { INT :: try_from (selection . len ()) . unwrap_or (INT :: MAX) } else { 0 } 读取或转换可选值，保留转换失败分支。 */ move || -> INT {
        if enabled {
            INT::try_from(selection.len()).unwrap_or(INT::MAX)
        } else {
            0
        }
    });
    let commands = Rc::clone(&output);
    engine.register_fn(
        "editor_select",
        /* 先检查编辑器自动化权限，将“选择编辑器实体”命令加入宿主队列。 */
        move |handle: Map| {
            if !enabled {
                return false;
            }
            if let Some((target, generation)) = target_from_handle(handle) {
                commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::EditorSelect { target, generation });
                true
            } else {
                false
            }
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "editor_rename",
        /* 先检查编辑器自动化权限，将“重命名编辑器实体”命令加入宿主队列。 */
        move |handle: Map, name: &str| {
            if !enabled {
                return false;
            }
            if let Some((target, generation)) = target_from_handle(handle) {
                let name = bounded_text(name.trim(), 120);
                if name.is_empty() {
                    return false;
                }
                commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::EditorRename {
                        target,
                        generation,
                        name,
                    });
                true
            } else {
                false
            }
        },
    );
    for (function, shape) in [
        ("editor_create_box", "Box"),
        ("editor_create_circle", "Circle"),
        ("editor_create_triangle", "Triangle"),
    ] {
        let commands = Rc::clone(&output);
        let shape = shape.to_owned();
        engine.register_fn(
            function,
            /* 先检查编辑器自动化权限，将“在编辑器创建实体”命令加入宿主队列。 */
            move |name: &str, x: FLOAT, y: FLOAT, width: FLOAT, height: FLOAT| {
                if !enabled
                    || !x.is_finite()
                    || !y.is_finite()
                    || !width.is_finite()
                    || !height.is_finite()
                    || width.abs() < 0.000_001
                    || height.abs() < 0.000_001
                {
                    return false;
                }
                let name = bounded_text(name.trim(), 120);
                if name.is_empty() {
                    return false;
                }
                commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::EditorCreateEntity {
                        shape: shape.clone(),
                        name,
                        x,
                        y,
                        width: width.abs().min(1_000_000.0),
                        height: height.abs().min(1_000_000.0),
                    });
                true
            },
        );
    }
    let commands = Rc::clone(&output);
    engine.register_fn(
        "editor_create_text_asset",
        /* 先检查编辑器自动化权限，将“在编辑器创建文本资源”命令加入宿主队列。 */
        move |path: &str, asset_type: &str, source: &str| {
            if !enabled {
                return false;
            }
            let path = bounded_text(path.trim(), 240);
            let asset_type = bounded_text(asset_type.trim(), 40);
            let source = bounded_text(source, 64_000);
            if path.is_empty() || source.is_empty() {
                return false;
            }
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::EditorCreateTextAsset {
                    path,
                    asset_type,
                    source,
                });
            true
        },
    );
}

// 限制查询结果数量并转换成带生命周期代数的句柄。
fn bounded_query_handles<'a>(
    values: impl Iterator<Item = &'a SceneEntitySnapshot>,
    limit: INT,
) -> Array {
    let maximum = usize::try_from(limit.clamp(0, 256)).unwrap_or(0);
    values
        .take(maximum)
        .map(/* 判断 Dynamic :: from_map (entity_handle_map (& entity . uuid , (entity . generation != 0) . then_some (entity . generation) ,)) 是否成立，供过滤或有效性检查使用。 */ |entity| {
            Dynamic::from_map(entity_handle_map(
                &entity.uuid,
                (entity.generation != 0).then_some(entity.generation),
            ))
        })
        .collect()
}

// 在当前场景快照中解析有效实体句柄，拒绝失效代数。
fn scene_entity_from_handle(
    handle: Map,
    entities: &[SceneEntitySnapshot],
) -> Option<&SceneEntitySnapshot> {
    let (id, generation) = target_from_handle(handle)?;
    entities.iter().find(/* 判断 entity . uuid == id && generation == if entity . generation == 0 { handle_generation (& id) } else { entity . generation } 是否成立，供过滤或有效性检查使用。 */ |entity| {
        entity.uuid == id
            && generation
                == if entity.generation == 0 {
                    handle_generation(&id)
                } else {
                    entity.generation
                }
    })
}

// 注册时间、帧号和固定步相关只读脚本接口。
fn register_time_api(engine: &mut Engine, context: &ScriptContext) {
    let time = context.time.clone();
    let snapshot = time.clone();
    engine.register_fn(
        "time_delta",
        /* 返回当前快照值 snapshot . delta。 */ move || snapshot.delta,
    );
    let snapshot = time.clone();
    engine.register_fn(
        "time_fixed_delta",
        /* 返回当前快照值 snapshot . fixed_delta。 */ move || snapshot.fixed_delta,
    );
    let snapshot = time.clone();
    engine.register_fn(
        "time_elapsed",
        /* 返回当前快照值 snapshot . elapsed。 */ move || snapshot.elapsed,
    );
    let snapshot = time.clone();
    engine.register_fn(
        "time_scale",
        /* 返回当前快照值 snapshot . scale。 */ move || snapshot.scale,
    );
    engine.register_fn(
        "time_frame",
        /* 返回当前快照值 time . frame as INT。 */ move || time.frame as INT,
    );
    let time = context.time.clone();
    engine.register_fn(
        "time",
        /* 将当前时间快照字段复制到脚本映射，避免暴露可变宿主引用。 */
        move || {
            let mut map = Map::new();
            map.insert("delta".into(), Dynamic::from_float(time.delta));
            map.insert("fixed_delta".into(), Dynamic::from_float(time.fixed_delta));
            map.insert("elapsed".into(), Dynamic::from_float(time.elapsed));
            map.insert("scale".into(), Dynamic::from_float(time.scale));
            map.insert("frame".into(), Dynamic::from_int(time.frame as INT));
            map
        },
    );
}

// 注册实体快照查询及受控实体访问接口。
fn register_entity_api(engine: &mut Engine, context: &ScriptContext) {
    let transform = context.transform.clone();
    engine.register_fn(
        "transform",
        /* 把实体位置、旋转和缩放快照转换为脚本可读取的映射。 */
        move || {
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
        },
    );
    let entities = context.scene_entities.clone();
    engine.register_fn("query_tag", /* 判断 bounded_query_handles (entities . iter () . filter (| entity | entity . tags . iter () . any (| value | value == tag)) , limit ,) 是否成立，供过滤或有效性检查使用。 */ move |tag: &str, limit: INT| {
        bounded_query_handles(
            entities
                .iter()
                .filter(/* 判断 entity . tags . iter () . any (| value | value == tag) 是否成立，供过滤或有效性检查使用。 */ |entity| entity.tags.iter().any(/* 判断 value == tag 是否成立，供过滤或有效性检查使用。 */ |value| value == tag)),
            limit,
        )
    });
    let entities = context.scene_entities.clone();
    engine.register_fn("query_group", /* 判断 bounded_query_handles (entities . iter () . filter (| entity | entity . groups . iter () . any (| value | value == group)) , limit ,) 是否成立，供过滤或有效性检查使用。 */ move |group: &str, limit: INT| {
        bounded_query_handles(
            entities
                .iter()
                .filter(/* 判断 entity . groups . iter () . any (| value | value == group) 是否成立，供过滤或有效性检查使用。 */ |entity| entity.groups.iter().any(/* 判断 value == group 是否成立，供过滤或有效性检查使用。 */ |value| value == group)),
            limit,
        )
    });
    let entities = context.scene_entities.clone();
    engine.register_fn("query_component", /* 判断 bounded_query_handles (entities . iter () . filter (| entity | entity . components . iter () . any (| value | value == kind)) , limit ,) 是否成立，供过滤或有效性检查使用。 */ move |kind: &str, limit: INT| {
        bounded_query_handles(
            entities
                .iter()
                .filter(/* 判断 entity . components . iter () . any (| value | value == kind) 是否成立，供过滤或有效性检查使用。 */ |entity| entity.components.iter().any(/* 判断 value == kind 是否成立，供过滤或有效性检查使用。 */ |value| value == kind)),
            limit,
        )
    });
    let entities = context.scene_entities.clone();
    engine.register_fn(
        "query_radius",
        /* 拒绝非法圆心与半径，按平方距离筛选实体并限制返回句柄数量。 */ move |x: FLOAT, y: FLOAT, radius: FLOAT, limit: INT| {
            if !x.is_finite() || !y.is_finite() || !radius.is_finite() || radius < 0.0 {
                return Array::new();
            }
            let radius_squared = radius.min(1.0e12).powi(2);
            bounded_query_handles(
                entities.iter().filter(/* 判断 let dx = entity . position [0] - x ; let dy = entity . position [1] - y ; dx * dx + dy * dy <= radius_squared 是否成立，供过滤或有效性检查使用。 */ |entity| {
                    let dx = entity.position[0] - x;
                    let dy = entity.position[1] - y;
                    dx * dx + dy * dy <= radius_squared
                }),
                limit,
            )
        },
    );
    let entities = context.scene_entities.clone();
    engine.register_fn("entity_name_on", /* 复制 scene_entity_from_handle (handle , & entities) . map (| entity | entity . name . clone ()) . unwrap_or_default () 的结果，避免向调用方暴露可变宿主引用。 */ move |handle: Map| {
        scene_entity_from_handle(handle, &entities)
            .map(/* 复制 entity . name . clone () 的结果，避免向调用方暴露可变宿主引用。 */ |entity| entity.name.clone())
            .unwrap_or_default()
    });
    let entities = context.scene_entities.clone();
    engine.register_fn("entity_enabled_on", /* 计算并返回 scene_entity_from_handle (handle , & entities) . map (| entity | entity . enabled) . unwrap_or (false)，用于当前 register_entity_api 流程。 */ move |handle: Map| {
        scene_entity_from_handle(handle, &entities)
            .map(/* 返回当前快照值 entity . enabled。 */ |entity| entity.enabled)
            .unwrap_or(false)
    });
    let entities = context.scene_entities.clone();
    engine.register_fn("entity_position_x_on", /* 计算并返回 scene_entity_from_handle (handle , & entities) . map (| entity | entity . position [0]) . unwrap_or (0.0)，用于当前 register_entity_api 流程。 */ move |handle: Map| {
        scene_entity_from_handle(handle, &entities)
            .map(/* 计算并返回 entity . position [0]，用于当前 register_entity_api 流程。 */ |entity| entity.position[0])
            .unwrap_or(0.0)
    });
    let entities = context.scene_entities.clone();
    engine.register_fn("entity_position_y_on", /* 计算并返回 scene_entity_from_handle (handle , & entities) . map (| entity | entity . position [1]) . unwrap_or (0.0)，用于当前 register_entity_api 流程。 */ move |handle: Map| {
        scene_entity_from_handle(handle, &entities)
            .map(/* 计算并返回 entity . position [1]，用于当前 register_entity_api 流程。 */ |entity| entity.position[1])
            .unwrap_or(0.0)
    });
    let rigid_body = context.rigid_body.clone();
    engine.register_fn(
        "rigid_body",
        /* 从可选刚体快照构造有效标志、速度和质量等只读脚本字段。 */
        move || {
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
        },
    );
    let component_entity = context.entity.clone();
    let components = context.components.clone();
    engine.register_fn("animator", /* 判断 if components . iter () . any (| kind | kind == "Animator") { format ! ("component://{component_entity}/Animator") } else { String :: new () } 是否成立，供过滤或有效性检查使用。 */ move || {
        if components.iter().any(/* 判断 kind == "Animator" 是否成立，供过滤或有效性检查使用。 */ |kind| kind == "Animator") {
            format!("component://{component_entity}/Animator")
        } else {
            String::new()
        }
    });
    let component_entity = context.entity.clone();
    let components = context.components.clone();
    engine.register_fn(
        "animator_handle",
        /* 仅在实体拥有 Animator 时生成有效动画组件句柄。 */
        move || {
            if components.iter().any(
                /* 判断 kind == "Animator" 是否成立，供过滤或有效性检查使用。 */
                |kind| kind == "Animator",
            ) {
                handle_map(
                    true,
                    "Animator",
                    &format!("component://{component_entity}/Animator"),
                    "",
                )
            } else {
                handle_map(false, "Animator", "", "Animator component not found")
            }
        },
    );
    let component_entity = context.entity.clone();
    let components = context.components.clone();
    engine.register_fn(
        "audio_source",
        /* 仅在实体拥有音频源组件时返回对应引用字符串，否则返回空串。 */
        move || {
            if components.iter().any(
                /* 判断 kind == "AudioSource" 是否成立，供过滤或有效性检查使用。 */
                |kind| kind == "AudioSource",
            ) {
                format!("component://{component_entity}/AudioSource")
            } else {
                String::new()
            }
        },
    );
    let component_entity = context.entity.clone();
    let components = context.components.clone();
    engine.register_fn(
        "audio_source_handle",
        /* 仅在实体拥有 AudioSource 时生成有效音频组件句柄。 */
        move || {
            if components.iter().any(
                /* 判断 kind == "AudioSource" 是否成立，供过滤或有效性检查使用。 */
                |kind| kind == "AudioSource",
            ) {
                handle_map(
                    true,
                    "AudioSource",
                    &format!("component://{component_entity}/AudioSource"),
                    "",
                )
            } else {
                handle_map(false, "AudioSource", "", "AudioSource component not found")
            }
        },
    );
}

// 注册动作、按键、指针和设备输入快照接口。
fn register_input_api(engine: &mut Engine, context: &ScriptContext) {
    let input = context.input.clone();
    let snapshot = input.clone();
    engine.register_fn("input_down", /* 按 snapshot . down . get (action) . copied () . unwrap_or (false) 读取或转换可选值，保留转换失败分支。 */ move |action: &str| {
        snapshot.down.get(action).copied().unwrap_or(false)
    });
    let snapshot = context.input.clone();
    engine.register_fn("is_down", /* 按 snapshot . down . get (action) . copied () . unwrap_or (false) 读取或转换可选值，保留转换失败分支。 */ move |action: &str| {
        snapshot.down.get(action).copied().unwrap_or(false)
    });
    let snapshot = input.clone();
    engine.register_fn("input_pressed", /* 按 snapshot . pressed . get (action) . copied () . unwrap_or (false) 读取或转换可选值，保留转换失败分支。 */ move |action: &str| {
        snapshot.pressed.get(action).copied().unwrap_or(false)
    });
    let snapshot = context.input.clone();
    engine.register_fn("was_pressed", /* 按 snapshot . pressed . get (action) . copied () . unwrap_or (false) 读取或转换可选值，保留转换失败分支。 */ move |action: &str| {
        snapshot.pressed.get(action).copied().unwrap_or(false)
    });
    let snapshot = input.clone();
    engine.register_fn("input_released", /* 按 snapshot . released . get (action) . copied () . unwrap_or (false) 读取或转换可选值，保留转换失败分支。 */ move |action: &str| {
        snapshot.released.get(action).copied().unwrap_or(false)
    });
    let snapshot = input.clone();
    engine.register_fn("input_performed", /* 按 snapshot . performed . get (action) . copied () . unwrap_or (false) 读取或转换可选值，保留转换失败分支。 */ move |action: &str| {
        snapshot.performed.get(action).copied().unwrap_or(false)
    });
    let snapshot = input.clone();
    engine.register_fn("input_cancelled", /* 按 snapshot . cancelled . get (action) . copied () . unwrap_or (false) 读取或转换可选值，保留转换失败分支。 */ move |action: &str| {
        snapshot.cancelled.get(action).copied().unwrap_or(false)
    });
    let snapshot = input.clone();
    engine.register_fn("input_phase", /* 按 snapshot . phases . get (action) . cloned () . unwrap_or_else (| | "idle" . into ()) 读取或转换可选值，保留转换失败分支。 */ move |action: &str| {
        snapshot
            .phases
            .get(action)
            .cloned()
            .unwrap_or_else(/* 计算并返回 "idle" . into ()，用于当前 register_input_api 流程。 */ || "idle".into())
    });
    let snapshot = input.clone();
    engine.register_fn("input_duration", /* 按 snapshot . durations . get (action) . copied () . unwrap_or (0.0) 读取或转换可选值，保留转换失败分支。 */ move |action: &str| {
        snapshot.durations.get(action).copied().unwrap_or(0.0)
    });
    let snapshot = input.clone();
    engine.register_fn("input_context_active", /* 判断 snapshot . contexts . iter () . any (| context | context == name) 是否成立，供过滤或有效性检查使用。 */ move |name: &str| {
        snapshot.contexts.iter().any(/* 判断 context == name 是否成立，供过滤或有效性检查使用。 */ |context| context == name)
    });
    let snapshot = input.clone();
    engine.register_fn("input_map_active", /* 判断 snapshot . maps . iter () . any (| map | map == name) 是否成立，供过滤或有效性检查使用。 */ move |name: &str| {
        snapshot.maps.iter().any(/* 判断 map == name 是否成立，供过滤或有效性检查使用。 */ |map| map == name)
    });
    let snapshot = input.clone();
    engine.register_fn(
        "input_scheme",
        /* 复制 snapshot . scheme . clone () 的结果，避免向调用方暴露可变宿主引用。 */
        move || snapshot.scheme.clone(),
    );
    let snapshot = context.input.clone();
    engine.register_fn("was_released", /* 按 snapshot . released . get (action) . copied () . unwrap_or (false) 读取或转换可选值，保留转换失败分支。 */ move |action: &str| {
        snapshot.released.get(action).copied().unwrap_or(false)
    });
    let snapshot = input.clone();
    engine.register_fn("input_axis", /* 按 snapshot . axes . get (action) . copied () . unwrap_or (0.0) 读取或转换可选值，保留转换失败分支。 */ move |action: &str| {
        snapshot.axes.get(action).copied().unwrap_or(0.0)
    });
    let snapshot = context.input.clone();
    engine.register_fn("axis", /* 按 snapshot . axes . get (action) . copied () . unwrap_or (0.0) 读取或转换可选值，保留转换失败分支。 */ move |action: &str| {
        snapshot.axes.get(action).copied().unwrap_or(0.0)
    });
    let snapshot = input.clone();
    engine.register_fn("input_vector_x", /* 按 snapshot . vectors . get (action) . map_or (0.0 , | value | value [0]) 读取或转换可选值，保留转换失败分支。 */ move |action: &str| {
        snapshot.vectors.get(action).map_or(0.0, /* 返回当前快照值 value [0]。 */ |value| value[0])
    });
    let snapshot = input.clone();
    engine.register_fn("input_vector_y", /* 按 snapshot . vectors . get (action) . map_or (0.0 , | value | value [1]) 读取或转换可选值，保留转换失败分支。 */ move |action: &str| {
        snapshot.vectors.get(action).map_or(0.0, /* 返回当前快照值 value [1]。 */ |value| value[1])
    });
    let snapshot = input.clone();
    engine.register_fn("input_vector", /* 按 vector_map (snapshot . vectors . get (action) . copied () . unwrap_or ([0.0 , 0.0])) 读取或转换可选值，保留转换失败分支。 */ move |action: &str| {
        vector_map(snapshot.vectors.get(action).copied().unwrap_or([0.0, 0.0]))
    });
    let snapshot = context.input.clone();
    engine.register_fn("vector_x", /* 按 snapshot . vectors . get (action) . map_or (0.0 , | value | value [0]) 读取或转换可选值，保留转换失败分支。 */ move |action: &str| {
        snapshot.vectors.get(action).map_or(0.0, /* 返回当前快照值 value [0]。 */ |value| value[0])
    });
    let snapshot = context.input.clone();
    engine.register_fn("vector_y", /* 按 snapshot . vectors . get (action) . map_or (0.0 , | value | value [1]) 读取或转换可选值，保留转换失败分支。 */ move |action: &str| {
        snapshot.vectors.get(action).map_or(0.0, /* 返回当前快照值 value [1]。 */ |value| value[1])
    });
    let snapshot = context.input.clone();
    engine.register_fn("vector", /* 按 vector_map (snapshot . vectors . get (action) . copied () . unwrap_or ([0.0 , 0.0])) 读取或转换可选值，保留转换失败分支。 */ move |action: &str| {
        vector_map(snapshot.vectors.get(action).copied().unwrap_or([0.0, 0.0]))
    });
    let snapshot = input.clone();
    engine.register_fn(
        "mouse_x",
        /* 计算并返回 snapshot . mouse_position [0]，用于当前 register_input_api 流程。 */
        move || snapshot.mouse_position[0],
    );
    let snapshot = input.clone();
    engine.register_fn(
        "mouse_y",
        /* 计算并返回 snapshot . mouse_position [1]，用于当前 register_input_api 流程。 */
        move || snapshot.mouse_position[1],
    );
    let snapshot = input.clone();
    engine.register_fn(
        "mouse_world_x",
        /* 计算并返回 snapshot . mouse_world_position [0]，用于当前 register_input_api 流程。 */
        move || snapshot.mouse_world_position[0],
    );
    let snapshot = input.clone();
    engine.register_fn(
        "mouse_world_y",
        /* 计算并返回 snapshot . mouse_world_position [1]，用于当前 register_input_api 流程。 */
        move || snapshot.mouse_world_position[1],
    );
    let snapshot = input.clone();
    engine.register_fn(
        "view_min_x",
        /* 计算并返回 snapshot . view_bounds [0]，用于当前 register_input_api 流程。 */
        move || snapshot.view_bounds[0],
    );
    let snapshot = input.clone();
    engine.register_fn(
        "view_max_x",
        /* 计算并返回 snapshot . view_bounds [1]，用于当前 register_input_api 流程。 */
        move || snapshot.view_bounds[1],
    );
    let snapshot = input.clone();
    engine.register_fn(
        "view_min_y",
        /* 计算并返回 snapshot . view_bounds [2]，用于当前 register_input_api 流程。 */
        move || snapshot.view_bounds[2],
    );
    let snapshot = input.clone();
    engine.register_fn(
        "view_max_y",
        /* 计算并返回 snapshot . view_bounds [3]，用于当前 register_input_api 流程。 */
        move || snapshot.view_bounds[3],
    );
    let snapshot = input.clone();
    engine.register_fn(
        "viewport_width",
        /* 计算并返回 snapshot . viewport_size [0]，用于当前 register_input_api 流程。 */
        move || snapshot.viewport_size[0],
    );
    let snapshot = input.clone();
    engine.register_fn(
        "viewport_height",
        /* 计算并返回 snapshot . viewport_size [1]，用于当前 register_input_api 流程。 */
        move || snapshot.viewport_size[1],
    );
    let snapshot = input.clone();
    engine.register_fn(
        "wheel_x",
        /* 计算并返回 snapshot . wheel [0]，用于当前 register_input_api 流程。 */
        move || snapshot.wheel[0],
    );
    engine.register_fn(
        "wheel_y",
        /* 计算并返回 input . wheel [1]，用于当前 register_input_api 流程。 */
        move || input.wheel[1],
    );
}

// 把二维数值数组转换成含 x 和 y 字段的脚本映射。
fn vector_map(value: [f64; 2]) -> Map {
    let mut map = Map::new();
    map.insert("x".into(), Dynamic::from_float(value[0]));
    map.insert("y".into(), Dynamic::from_float(value[1]));
    map
}

// 注册当前场景、关卡流程和游戏状态查询接口。
fn register_game_flow_api(engine: &mut Engine, context: &ScriptContext) {
    let flow = context.game_flow.clone();
    engine.register_fn(
        "game_paused",
        /* 返回当前快照值 flow . paused。 */ move || flow.paused,
    );
    let flow = context.game_flow.clone();
    engine.register_fn(
        "score_get",
        /* 返回当前快照值 flow . score。 */ move || flow.score,
    );
    let flow = context.game_flow.clone();
    engine.register_fn("checkpoint_has", /* 判断 flow . checkpoints . iter () . any (| checkpoint | checkpoint == name) 是否成立，供过滤或有效性检查使用。 */ move |name: &str| {
        flow.checkpoints.iter().any(/* 判断 checkpoint == name 是否成立，供过滤或有效性检查使用。 */ |checkpoint| checkpoint == name)
    });
    let values = context.game_flow.session.clone();
    engine.register_fn("session_get", /* 按 values . get (key) . and_then (json_to_dynamic) . unwrap_or (fallback) 读取或转换可选值，保留转换失败分支。 */ move |key: &str, fallback: Dynamic| {
        values
            .get(key)
            .and_then(json_to_dynamic)
            .unwrap_or(fallback)
    });
}

// 注册受当前上下文约束的网络状态与消息接口。
fn register_network_api(engine: &mut Engine, context: &ScriptContext) {
    let network = context.networking.clone();
    engine.register_fn(
        "network_enabled",
        /* 返回当前快照值 network . enabled。 */ move || network.enabled,
    );
    let network = context.networking.clone();
    engine.register_fn(
        "network_connected",
        /* 返回当前快照值 network . connected。 */ move || network.connected,
    );
    let network = context.networking.clone();
    engine.register_fn(
        "network_is_authority",
        /* 返回当前快照值 network . authority。 */ move || network.authority,
    );
    let network = context.networking.clone();
    engine.register_fn(
        "network_peer_count",
        /* 计算并返回 INT :: from (network . peer_count)，用于当前 register_network_api 流程。 */
        move || INT::from(network.peer_count),
    );
    let network = context.networking.clone();
    engine.register_fn(
        "network_local_peer",
        /* 复制 network . local_peer_id . clone () 的结果，避免向调用方暴露可变宿主引用。 */
        move || network.local_peer_id.clone(),
    );
    let network = context.networking.clone();
    engine.register_fn(
        "network_role",
        /* 复制 network . role . clone () 的结果，避免向调用方暴露可变宿主引用。 */
        move || network.role.clone(),
    );
    let network = context.networking.clone();
    engine.register_fn("network_tick", /* 按 INT :: try_from (network . tick) . unwrap_or (INT :: MAX) 读取或转换可选值，保留转换失败分支。 */ move || {
        INT::try_from(network.tick).unwrap_or(INT::MAX)
    });
}

// 将宿主提供的自定义属性注册为脚本可读取值。
fn register_property_api(engine: &mut Engine, context: &ScriptContext) {
    let numbers = context.properties.clone();
    engine.register_fn("export_value", /* 按 numbers . get (name) . and_then (Value :: as_f64) . unwrap_or (fallback) 读取或转换可选值，保留转换失败分支。 */ move |name: &str, fallback: FLOAT| {
        numbers
            .get(name)
            .and_then(Value::as_f64)
            .unwrap_or(fallback)
    });
    let integers = context.properties.clone();
    engine.register_fn("export_value", /* 按 integers . get (name) . and_then (Value :: as_i64) . unwrap_or (fallback) 读取或转换可选值，保留转换失败分支。 */ move |name: &str, fallback: INT| {
        integers
            .get(name)
            .and_then(Value::as_i64)
            .unwrap_or(fallback)
    });
    let booleans = context.properties.clone();
    engine.register_fn("export_value", /* 按 booleans . get (name) . and_then (Value :: as_bool) . unwrap_or (fallback) 读取或转换可选值，保留转换失败分支。 */ move |name: &str, fallback: bool| {
        booleans
            .get(name)
            .and_then(Value::as_bool)
            .unwrap_or(fallback)
    });
    let strings = context.properties.clone();
    engine.register_fn("export_value", /* 按 strings . get (name) . and_then (Value :: as_str) . unwrap_or (fallback) . to_owned () 读取或转换可选值，保留转换失败分支。 */ move |name: &str, fallback: &str| {
        strings
            .get(name)
            .and_then(Value::as_str)
            .unwrap_or(fallback)
            .to_owned()
    });
    let structured = context.properties.clone();
    engine.register_fn("export_value", /* 按 structured . get (name) . and_then (json_to_dynamic) . unwrap_or (fallback) 读取或转换可选值，保留转换失败分支。 */ move |name: &str, fallback: Dynamic| {
        structured
            .get(name)
            .and_then(json_to_dynamic)
            .unwrap_or(fallback)
    });
}

// 注册存档读取及排队写入命令，保持沙箱内的数据边界。
fn register_save_api(
    engine: &mut Engine,
    context: &ScriptContext,
    output: Rc<RefCell<HostOutput>>,
) {
    let values = context.save.clone();
    engine.register_fn(
        "save_has",
        /* 判断 values . contains_key (key) 是否成立，供过滤或有效性检查使用。 */
        move |key: &str| values.contains_key(key),
    );

    let values = context.save.clone();
    engine.register_fn("save_get", /* 按 values . get (key) . and_then (json_to_dynamic) . unwrap_or (fallback) 读取或转换可选值，保留转换失败分支。 */ move |key: &str, fallback: Dynamic| {
        values
            .get(key)
            .and_then(json_to_dynamic)
            .unwrap_or(fallback)
    });

    let commands = Rc::clone(&output);
    engine.register_fn(
        "save_set",
        /* 先转换可序列化数据，将“设置存档键值”命令加入宿主队列，并限制相关文本长度。 */
        move |key: &str, value: Dynamic| {
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
        },
    );

    let commands = Rc::clone(&output);
    engine.register_fn(
        "save_delete",
        /* 将“删除存档键值”命令加入宿主队列，并限制相关文本长度。 */
        move |key: &str| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::SaveDelete {
                    key: key.trim().chars().take(80).collect(),
                });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "save_clear",
        /* 将“清空存档”命令加入宿主队列。 */
        move || {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::SaveClear);
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "save_load",
        /* 将“加载存档槽”命令加入宿主队列，并限制相关文本长度。 */
        move |slot: &str| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::SaveLoad {
                    slot: slot.trim().chars().take(80).collect(),
                });
        },
    );
    engine.register_fn(
        "save_commit",
        /* 将“提交存档槽”命令加入宿主队列，并限制相关文本长度。 */
        move |slot: &str| {
            output
                .borrow_mut()
                .commands
                .push(ScriptCommand::SaveCommit {
                    slot: slot.trim().chars().take(80).collect(),
                });
        },
    );
}

// 注册修改游戏状态的宿主命令；脚本只产生有界命令，不直接访问编辑器。
fn register_command_api(
    engine: &mut Engine,
    context: &ScriptContext,
    output: Rc<RefCell<HostOutput>>,
) {
    let traces = Rc::clone(&output);
    let trace_clock = Rc::new(RefCell::new(Instant::now()));
    engine.register_fn(
        "__nova_graph_trace",
        /* 先转换可序列化数据，将“记录可视图节点执行追踪”命令加入宿主队列，并限制相关文本长度。 */
        move |graph_uuid: &str,
              scope_uuid: &str,
              node_uuid: &str,
              edge_uuid: &str,
              depth: INT,
              values: Dynamic| {
            let now = Instant::now();
            let duration_micros = now
                .duration_since(*trace_clock.borrow())
                .as_micros()
                .min(u128::from(u64::MAX)) as u64;
            *trace_clock.borrow_mut() = now;
            traces
                .borrow_mut()
                .commands
                .push(ScriptCommand::GraphTrace {
                    graph_uuid: graph_uuid.chars().take(128).collect(),
                    scope_uuid: scope_uuid.chars().take(128).collect(),
                    node_uuid: node_uuid.chars().take(128).collect(),
                    edge_uuid: edge_uuid.chars().take(128).collect(),
                    depth: depth.clamp(0, 32),
                    duration_micros,
                    values: dynamic_to_json(values).unwrap_or(Value::Null),
                });
        },
    );
    for (name, level) in [
        ("log_debug", "debug"),
        ("log_info", "info"),
        ("log_warning", "warning"),
        ("log_error", "error"),
    ] {
        let logs = Rc::clone(&output);
        engine.register_fn(name, /* 计算并返回 logs . borrow_mut () . logs . push (ScriptLog { level : level . into () , message : message . chars () . take (4_096) . collect () , }) ;，用于当前 register_command_api 流程。 */ move |message: &str| {
            logs.borrow_mut().logs.push(ScriptLog {
                level: level.into(),
                message: message.chars().take(4_096).collect(),
            });
        });
    }
    let assertions = Rc::clone(&output);
    engine.register_fn(
        "expect",
        /* 断言条件失败时输出截断后的错误日志，并返回条件值。 */
        move |condition: bool, message: &str| {
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
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "apply_force",
        /* 将“施加力”命令加入宿主队列。 */
        move |x: FLOAT, y: FLOAT| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::ApplyForce { x, y });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "apply_impulse",
        /* 将“施加冲量”命令加入宿主队列。 */
        move |x: FLOAT, y: FLOAT| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::ApplyImpulse { x, y });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "set_velocity",
        /* 将“设置线速度”命令加入宿主队列。 */
        move |x: FLOAT, y: FLOAT| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::SetVelocity { x, y });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "set_position",
        /* 将“设置位置”命令加入宿主队列。 */
        move |x: FLOAT, y: FLOAT| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::SetPosition { x, y });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "set_rotation",
        /* 将“设置旋转”命令加入宿主队列。 */
        move |radians: FLOAT| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::SetRotation { radians });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "set_scale",
        /* 将“设置缩放”命令加入宿主队列。 */
        move |x: FLOAT, y: FLOAT| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::SetScale { x, y });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "set_angular_velocity",
        /* 将“设置角速度”命令加入宿主队列。 */
        move |radians_per_second: FLOAT| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::SetAngularVelocity { radians_per_second });
        },
    );

    let character = context.character.clone().unwrap_or_default();
    let snapshot = character.clone();
    engine.register_fn(
        "character_is_on_floor",
        /* 返回当前快照值 snapshot . on_floor。 */ move || snapshot.on_floor,
    );
    let snapshot = character.clone();
    engine.register_fn(
        "character_is_on_wall",
        /* 返回当前快照值 snapshot . on_wall。 */ move || snapshot.on_wall,
    );
    let snapshot = character.clone();
    engine.register_fn(
        "character_is_on_ceiling",
        /* 返回当前快照值 snapshot . on_ceiling。 */ move || snapshot.on_ceiling,
    );
    let snapshot = character.clone();
    engine.register_fn(
        "character_can_coyote_jump",
        /* 返回当前快照值 snapshot . can_coyote_jump。 */
        move || snapshot.can_coyote_jump,
    );
    let snapshot = character.clone();
    engine.register_fn(
        "can_coyote_jump",
        /* 返回当前快照值 snapshot . can_coyote_jump。 */
        move || snapshot.can_coyote_jump,
    );
    let snapshot = character.clone();
    engine.register_fn(
        "character_floor_normal_x",
        /* 计算并返回 snapshot . floor_normal [0]，用于当前 register_command_api 流程。 */
        move || snapshot.floor_normal[0],
    );
    let snapshot = character.clone();
    engine.register_fn(
        "character_floor_normal_y",
        /* 计算并返回 snapshot . floor_normal [1]，用于当前 register_command_api 流程。 */
        move || snapshot.floor_normal[1],
    );
    let snapshot = character.clone();
    engine.register_fn(
        "character_floor_normal",
        /* 计算并返回 vector_map (snapshot . floor_normal)，用于当前 register_command_api 流程。 */
        move || vector_map(snapshot.floor_normal),
    );
    let snapshot = character.clone();
    engine.register_fn(
        "character_platform_velocity_x",
        /* 计算并返回 snapshot . platform_velocity [0]，用于当前 register_command_api 流程。 */
        move || snapshot.platform_velocity[0],
    );
    let snapshot = character.clone();
    engine.register_fn("character_platform_velocity", /* 计算并返回 vector_map (snapshot . platform_velocity)，用于当前 register_command_api 流程。 */ move || {
        vector_map(snapshot.platform_velocity)
    });
    engine.register_fn(
        "character_platform_velocity_y",
        /* 计算并返回 character . platform_velocity [1]，用于当前 register_command_api 流程。 */
        move || character.platform_velocity[1],
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "move_character",
        /* 将“移动角色”命令加入宿主队列。 */
        move |x: FLOAT, y: FLOAT| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::MoveCharacter { x, y });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "animator_set_bool",
        /* 将“设置动画布尔参数”命令加入宿主队列，并限制相关文本长度。 */
        move |name: &str, value: bool| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::AnimatorSetBool {
                    name: name.chars().take(80).collect(),
                    value,
                });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "animator_set_float",
        /* 将“设置动画浮点参数”命令加入宿主队列，并限制相关文本长度。 */
        move |name: &str, value: FLOAT| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::AnimatorSetFloat {
                    name: name.chars().take(80).collect(),
                    value,
                });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "animator_set_integer",
        /* 将“设置动画整数参数”命令加入宿主队列，并限制相关文本长度。 */
        move |name: &str, value: INT| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::AnimatorSetInteger {
                    name: name.chars().take(80).collect(),
                    value,
                });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "animator_trigger",
        /* 将“触发动画参数”命令加入宿主队列，并限制相关文本长度。 */
        move |name: &str| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::AnimatorTrigger {
                    name: name.chars().take(80).collect(),
                });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "animator_play",
        /* 将“播放动画状态”命令加入宿主队列，并限制相关文本长度。 */
        move |state: &str| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::AnimatorPlay {
                    state: state.chars().take(80).collect(),
                });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "audio_play",
        /* 将“播放音频”命令加入宿主队列。 */
        move || {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::AudioPlay)
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "audio_pause",
        /* 将“暂停音频”命令加入宿主队列。 */
        move || {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::AudioPause)
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "audio_stop",
        /* 将“停止音频”命令加入宿主队列。 */
        move || {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::AudioStop)
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "ui_set_text",
        /* 将“设置界面文本”命令加入宿主队列，并限制相关文本长度。 */
        move |text: &str| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::UiSetText {
                    text: text.chars().take(16_384).collect(),
                });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "ui_set_value",
        /* 先检查数值有限性，将“设置界面数值”命令加入宿主队列。 */
        move |value: FLOAT| {
            if value.is_finite() {
                commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::UiSetValue { value });
            } else {
                commands.borrow_mut().logs.push(ScriptLog {
                    level: "error".into(),
                    message: "ui_set_value rejected a non-finite value".into(),
                });
            }
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "navigation_set_target",
        /* 先检查数值有限性，将“设置导航目标”命令加入宿主队列。 */
        move |x: FLOAT, y: FLOAT| {
            if x.is_finite() && y.is_finite() {
                commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::NavigationSetTarget { x, y });
            } else {
                commands.borrow_mut().logs.push(ScriptLog {
                    level: "error".into(),
                    message: "navigation_set_target rejected a non-finite target".into(),
                });
            }
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "destroy",
        /* 将“销毁当前实体”命令加入宿主队列。 */
        move || commands.borrow_mut().commands.push(ScriptCommand::Destroy),
    );

    let commands = Rc::clone(&output);
    engine.register_fn(
        "despawn",
        /* 将“回收当前实体”命令加入宿主队列。 */
        move || commands.borrow_mut().commands.push(ScriptCommand::Despawn),
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "instantiate",
        /* 将“实例化预制体”命令加入宿主队列，并限制相关文本长度。 */
        move |prefab: &str| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::Instantiate {
                    prefab: prefab.chars().take(512).collect(),
                });
        },
    );
    let commands = Rc::clone(&output);
    let pending_serial = Rc::new(RefCell::new(0_u64));
    let source_entity = context.entity.clone();
    let invocation_id = context.invocation_id;
    engine.register_fn(
        "spawn_at",
        /* 先检查数值有限性，将“按位置实例化预制体”命令加入宿主队列，并限制相关文本长度。 */
        move |prefab: &str, x: FLOAT, y: FLOAT, rotation: FLOAT, scale_x: FLOAT, scale_y: FLOAT| {
            let prefab = prefab.trim().chars().take(512).collect::<String>();
            if prefab.is_empty()
                || ![x, y, rotation, scale_x, scale_y].iter().all(
                    /* 判断 value . is_finite () 是否成立，供过滤或有效性检查使用。 */
                    |value| value.is_finite(),
                )
                || scale_x.abs() < 1.0e-9
                || scale_y.abs() < 1.0e-9
            {
                commands.borrow_mut().logs.push(ScriptLog {
                    level: "error".into(),
                    message: "spawn_at requires a prefab, finite transform, and non-zero scale"
                        .into(),
                });
                return handle_map(false, "Entity", "", "Invalid spawn request");
            }
            let serial = {
                let mut value = pending_serial.borrow_mut();
                *value = value.saturating_add(1);
                *value
            };
            let pending_id = format!("pending:{source_entity}:{invocation_id}:{serial}");
            commands.borrow_mut().commands.push(ScriptCommand::SpawnAt {
                pending_id: pending_id.clone(),
                prefab,
                x,
                y,
                rotation,
                scale_x,
                scale_y,
            });
            handle_map(true, "Entity", &pending_id, "")
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "entity_set_position",
        /* 先校验目标句柄及生命周期代数，将“设置目标实体位置”命令加入宿主队列。 */
        move |handle: Map, x: FLOAT, y: FLOAT| {
            if let Some((target, generation)) = target_from_handle(handle) {
                commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::TargetSetPosition {
                        target,
                        generation,
                        x,
                        y,
                    })
            }
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "entity_set_rotation",
        /* 先校验目标句柄及生命周期代数，将“设置目标实体旋转”命令加入宿主队列。 */
        move |handle: Map, radians: FLOAT| {
            if let Some((target, generation)) = target_from_handle(handle) {
                commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::TargetSetRotation {
                        target,
                        generation,
                        radians,
                    })
            }
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "entity_set_scale",
        /* 先校验目标句柄及生命周期代数，将“设置目标实体缩放”命令加入宿主队列。 */
        move |handle: Map, x: FLOAT, y: FLOAT| {
            if let Some((target, generation)) = target_from_handle(handle) {
                commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::TargetSetScale {
                        target,
                        generation,
                        x,
                        y,
                    })
            }
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "entity_set_enabled",
        /* 先校验目标句柄及生命周期代数，将“设置目标实体启用状态”命令加入宿主队列。 */
        move |handle: Map, enabled: bool| {
            if let Some((target, generation)) = target_from_handle(handle) {
                commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::TargetSetEnabled {
                        target,
                        generation,
                        enabled,
                    })
            }
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "component_set_enabled_on",
        /* 先校验目标句柄及生命周期代数，将“设置目标组件启用状态”命令加入宿主队列，并限制相关文本长度。 */ move |handle: Map, component: &str, enabled: bool| {
            if let Some((target, generation)) = target_from_handle(handle) {
                commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::TargetSetComponentEnabled {
                        target,
                        generation,
                        component: component.chars().take(80).collect(),
                        enabled,
                    })
            }
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn("ui_set_text_on", /* 先校验目标句柄及生命周期代数，将“设置目标界面文本”命令加入宿主队列，并限制相关文本长度。 */ move |handle: Map, text: &str| {
        if let Some((target, generation)) = target_from_handle(handle) {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::TargetSetUiText {
                    target,
                    generation,
                    text: text.chars().take(16_384).collect(),
                })
        }
    });
    let commands = Rc::clone(&output);
    engine.register_fn(
        "ui_set_value_on",
        /* 先校验目标句柄及生命周期代数，将“设置目标界面数值”命令加入宿主队列。 */
        move |handle: Map, value: FLOAT| {
            if let Some((target, generation)) = target_from_handle(handle) {
                commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::TargetSetUiValue {
                        target,
                        generation,
                        value,
                    })
            }
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "entity_add_tag",
        /* 先校验目标句柄及生命周期代数，将“添加实体标签”命令加入宿主队列，并限制相关文本长度。 */
        move |handle: Map, tag: &str| {
            if let Some((target, generation)) = target_from_handle(handle) {
                commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::TargetAddTag {
                        target,
                        generation,
                        tag: tag.trim().chars().take(80).collect(),
                    })
            }
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "entity_remove_tag",
        /* 先校验目标句柄及生命周期代数，将“移除实体标签”命令加入宿主队列，并限制相关文本长度。 */
        move |handle: Map, tag: &str| {
            if let Some((target, generation)) = target_from_handle(handle) {
                commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::TargetRemoveTag {
                        target,
                        generation,
                        tag: tag.trim().chars().take(80).collect(),
                    })
            }
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "entity_add_group",
        /* 先校验目标句柄及生命周期代数，将“添加实体分组”命令加入宿主队列，并限制相关文本长度。 */
        move |handle: Map, group: &str| {
            if let Some((target, generation)) = target_from_handle(handle) {
                commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::TargetAddGroup {
                        target,
                        generation,
                        group: group.trim().chars().take(80).collect(),
                    })
            }
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "entity_remove_group",
        /* 先校验目标句柄及生命周期代数，将“移除实体分组”命令加入宿主队列，并限制相关文本长度。 */
        move |handle: Map, group: &str| {
            if let Some((target, generation)) = target_from_handle(handle) {
                commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::TargetRemoveGroup {
                        target,
                        generation,
                        group: group.trim().chars().take(80).collect(),
                    })
            }
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "entity_destroy",
        /* 先校验目标句柄及生命周期代数，将“销毁目标实体”命令加入宿主队列。 */
        move |handle: Map| {
            if let Some((target, generation)) = target_from_handle(handle) {
                commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::TargetDestroy { target, generation })
            }
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "scene_load",
        /* 将“加载场景”命令加入宿主队列，并限制相关文本长度。 */
        move |scene: &str| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::LoadScene {
                    scene: scene.chars().take(512).collect(),
                });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "scene_reload",
        /* 将“重载场景”命令加入宿主队列。 */
        move || {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::ReloadScene)
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "scene_quit",
        /* 将“退出游戏”命令加入宿主队列。 */
        move || commands.borrow_mut().commands.push(ScriptCommand::Quit),
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "game_pause",
        /* 将“设置游戏暂停状态”命令加入宿主队列。 */
        move |paused: bool| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::GamePause { paused })
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "checkpoint_set",
        /* 将“保存检查点”命令加入宿主队列，并限制相关文本长度。 */
        move |name: &str| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::CheckpointSet {
                    name: name.trim().chars().take(80).collect(),
                })
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "checkpoint_restore",
        /* 将“恢复检查点”命令加入宿主队列，并限制相关文本长度。 */
        move |name: &str| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::CheckpointRestore {
                    name: name.trim().chars().take(80).collect(),
                })
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "score_set",
        /* 先检查数值有限性，将“设置分数”命令加入宿主队列。 */
        move |value: FLOAT| {
            if value.is_finite() {
                commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::ScoreSet { value })
            }
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "score_add",
        /* 先检查数值有限性，将“累加分数”命令加入宿主队列。 */
        move |value: FLOAT| {
            if value.is_finite() {
                commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::ScoreAdd { value })
            }
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "session_set",
        /* 先转换可序列化数据，将“设置会话键值”命令加入宿主队列，并限制相关文本长度。 */
        move |key: &str, value: Dynamic| {
            if let Some(value) = dynamic_to_json(value) {
                commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::SessionSet {
                        key: key.trim().chars().take(80).collect(),
                        value,
                    })
            }
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "network_rpc",
        /* 先转换可序列化数据，将“排队网络远程调用”命令加入宿主队列，并限制相关文本长度。 */
        move |name: &str, payload: Dynamic| {
            let name: String = name.trim().chars().take(80).collect();
            match (name.is_empty(), dynamic_to_json(payload)) {
                (false, Some(payload)) => commands
                    .borrow_mut()
                    .commands
                    .push(ScriptCommand::NetworkRpc { name, payload }),
                _ => commands.borrow_mut().logs.push(ScriptLog {
                    level: "error".into(),
                    message: "network_rpc requires a name and a bounded serializable payload"
                        .into(),
                }),
            }
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "input_context_push",
        /* 将“压入输入上下文”命令加入宿主队列，并限制相关文本长度。 */
        move |name: &str, priority: INT, consume: bool| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::InputContextPush {
                    name: name.trim().chars().take(80).collect(),
                    priority: priority.clamp(-10_000, 10_000),
                    consume,
                })
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "input_context_pop",
        /* 将“弹出输入上下文”命令加入宿主队列，并限制相关文本长度。 */
        move |name: &str| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::InputContextPop {
                    name: name.trim().chars().take(80).collect(),
                })
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "input_map_enable",
        /* 将“启用输入映射”命令加入宿主队列，并限制相关文本长度。 */
        move |name: &str| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::InputMapEnable {
                    name: name.trim().chars().take(80).collect(),
                })
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "input_map_disable",
        /* 将“禁用输入映射”命令加入宿主队列，并限制相关文本长度。 */
        move |name: &str| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::InputMapDisable {
                    name: name.trim().chars().take(80).collect(),
                })
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "input_scheme_set",
        /* 将“切换输入方案”命令加入宿主队列，并限制相关文本长度。 */
        move |name: &str| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::InputSchemeSet {
                    name: name.trim().chars().take(80).collect(),
                })
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "timer_start",
        /* 先检查数值有限性，将“启动计时器”命令加入宿主队列，并限制相关文本长度。 */
        move |name: &str, seconds: FLOAT, repeat: bool| {
            if name.trim().is_empty() || !seconds.is_finite() || seconds < 0.0 {
                commands.borrow_mut().logs.push(ScriptLog {
                    level: "error".into(),
                    message: "timer_start requires a name and a finite non-negative duration"
                        .into(),
                });
                return;
            }
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::StartTimer {
                    name: name.chars().take(128).collect(),
                    seconds,
                    repeat,
                });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "timer_pause",
        /* 将“暂停计时器”命令加入宿主队列，并限制相关文本长度。 */
        move |name: &str| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::PauseTimer {
                    name: name.chars().take(128).collect(),
                });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "timer_resume",
        /* 将“恢复计时器”命令加入宿主队列，并限制相关文本长度。 */
        move |name: &str| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::ResumeTimer {
                    name: name.chars().take(128).collect(),
                });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "timer_cancel",
        /* 将“取消计时器”命令加入宿主队列，并限制相关文本长度。 */
        move |name: &str| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::CancelTimer {
                    name: name.chars().take(128).collect(),
                });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "task_wait",
        /* 先检查数值有限性，将“安排延迟任务”命令加入宿主队列，并限制相关文本长度。 */
        move |name: &str, seconds: FLOAT| {
            if name.trim().is_empty() || !seconds.is_finite() || seconds < 0.0 {
                commands.borrow_mut().logs.push(ScriptLog {
                    level: "error".into(),
                    message: "task_wait requires a name and a finite non-negative duration".into(),
                });
                return;
            }
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::StartTask {
                    name: name.chars().take(128).collect(),
                    seconds,
                });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "task_cancel",
        /* 将“取消任务”命令加入宿主队列，并限制相关文本长度。 */
        move |name: &str| {
            commands
                .borrow_mut()
                .commands
                .push(ScriptCommand::CancelTask {
                    name: name.chars().take(128).collect(),
                });
        },
    );
    let commands = Rc::clone(&output);
    engine.register_fn(
        "signal_emit",
        /* 先转换可序列化数据，将“发送信号”命令加入宿主队列，并限制相关文本长度。 */
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
        /* 先转换可序列化数据，将“发送信号”命令加入宿主队列，并限制相关文本长度。 */
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

// 根据回调种类提供对应参数，并兼容允许的零参数历史函数。
fn call_lifecycle(
    engine: &Engine,
    scope: &mut Scope,
    ast: &AST,
    function: &str,
    context: &ScriptContext,
) -> Result<(), String> {
    let exists = ast.iter_functions().any(
        /* 判断 metadata . name == function 是否成立，供过滤或有效性检查使用。 */
        |metadata| metadata.name == function,
    );
    if !exists {
        return Ok(());
    }
    // execute_prepared already initialized this scope. Re-evaluating the AST
    // would duplicate top-level commands and shadow the exported properties
    // whose callback changes must be returned to the host.
    let options = CallFnOptions::new().eval_ast(false);
    let family = match context.callback_kind.as_str() {
        "update" | "late_update" | "fixed_update" | "on_timer" | "on_task" | "on_signal"
        | "on_collision_enter" | "on_collision_stay" | "on_collision_exit" | "on_trigger_enter"
        | "on_trigger_stay" | "on_trigger_exit" => context.callback_kind.as_str(),
        _ => function,
    };
    // Existing custom handlers without parameters remain callable. Typed custom
    // handlers receive their event family's arguments just like canonical names.
    let family = if family != function
        && ast.iter_functions().any(/* 判断 entry . name == function && entry . this_type . is_none () && entry . params . is_empty () 是否成立，供过滤或有效性检查使用。 */ |entry| {
            entry.name == function && entry.this_type.is_none() && entry.params.is_empty()
        }) {
        ""
    } else {
        family
    };
    let result = match family {
        "update" | "late_update" => engine.call_fn_with_options::<Dynamic>(
            options,
            scope,
            ast,
            function,
            (context.time.delta,),
        ),
        "fixed_update" => engine.call_fn_with_options::<Dynamic>(
            options,
            scope,
            ast,
            function,
            (context.time.fixed_delta,),
        ),
        "on_timer" => {
            let name = context
                .event
                .as_ref()
                .map(/* 复制 event . name . clone () 的结果，避免向调用方暴露可变宿主引用。 */ |event| event.name.clone())
                .or_else(/* 按 context . contact . as_ref () . map (| contact | contact . other_entity . clone ()) 读取或转换可选值，保留转换失败分支。 */ || {
                    context
                        .contact
                        .as_ref()
                        .map(/* 复制 contact . other_entity . clone () 的结果，避免向调用方暴露可变宿主引用。 */ |contact| contact.other_entity.clone())
                })
                .unwrap_or_default();
            engine.call_fn_with_options::<Dynamic>(options, scope, ast, function, (name,))
        }
        "on_task" => {
            let name = context
                .event
                .as_ref()
                .map(
                    /* 复制 event . name . clone () 的结果，避免向调用方暴露可变宿主引用。 */
                    |event| event.name.clone(),
                )
                .unwrap_or_default();
            engine.call_fn_with_options::<Dynamic>(options, scope, ast, function, (name,))
        }
        "on_signal" => {
            let event = context.event.clone().unwrap_or_default();
            let payload = json_to_dynamic(&event.payload).unwrap_or(Dynamic::UNIT);
            engine.call_fn_with_options::<Dynamic>(
                options,
                scope,
                ast,
                function,
                (event.name, payload, event.source),
            )
        }
        "on_collision_enter" | "on_collision_stay" | "on_collision_exit" | "on_trigger_enter"
        | "on_trigger_stay" | "on_trigger_exit" => {
            let contact = context.contact.clone().unwrap_or_default();
            engine.call_fn_with_options::<Dynamic>(
                options,
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
        _ => engine.call_fn_with_options::<Dynamic>(options, scope, ast, function, ()),
    };
    result
        .map(
            /* 计算并返回 ()，用于当前 call_lifecycle 流程。 */ |_| (),
        )
        .map_err(
            /* 将底层错误转换为字符串，保留错误信息供上层返回。 */
            |error| error.to_string(),
        )
}

// 从脚本作用域提取可序列化的导出属性状态。
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
            .or_else(/* 按 previous . get (& export . name) . cloned () 读取或转换可选值，保留转换失败分支。 */ || previous.get(&export.name).cloned())
            .unwrap_or_else(/* 复制 export . value . clone () 的结果，避免向调用方暴露可变宿主引用。 */ || export.value.clone());
        values.insert(export.name.clone(), value);
    }
    values
}

// 递归把支持的 Rhai 动态值转换为 JSON，不支持的类型返回空值。
fn dynamic_to_json(value: Dynamic) -> Option<Value> {
    if value.is_unit() {
        Some(Value::Null)
    } else if value.is::<bool>() {
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
            .map(/* 计算并返回 dynamic_to_json (value) . map (| value | (key . to_string () , value))，用于当前 dynamic_to_json 流程。 */ |(key, value)| dynamic_to_json(value).map(/* 计算并返回 (key . to_string () , value)，用于当前 dynamic_to_json 流程。 */ |value| (key.to_string(), value)))
            .collect::<Option<serde_json::Map<String, Value>>>()
            .map(Value::Object)
    } else {
        None
    }
}

// 递归把 JSON 标量、数组及对象转换为 Rhai 动态值。
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
            .map(/* 复制 json_to_dynamic (value) . map (| value | (key . clone () . into () , value)) 的结果，避免向调用方暴露可变宿主引用。 */ |(key, value)| json_to_dynamic(value).map(/* 复制 (key . clone () . into () , value) 的结果，避免向调用方暴露可变宿主引用。 */ |value| (key.clone().into(), value)))
            .collect::<Option<Map>>()
            .map(Dynamic::from_map),
    }
}

// 解析导出声明、元数据和源码，再编译为可缓存程序。
fn prepare_script(source: &str) -> Result<PreparedScript, String> {
    if source.len() > 1_000_000 {
        return Err("script source exceeds the 1 MB safety limit".into());
    }
    let mut exports = Vec::new();
    let mut compatibility_warnings = Vec::new();
    let mut output = String::with_capacity(source.len());
    for line in source.lines() {
        let trimmed = line.trim();
        let export_line = trimmed
            .strip_prefix("// ")
            .unwrap_or(trimmed)
            .strip_prefix("@export");
        if let Some(raw_declaration) = export_line {
            let (metadata, declaration) = split_export_metadata(raw_declaration.trim())?;
            let declaration = declaration.strip_prefix("let ").unwrap_or(declaration);
            let Some((name, value)) = declaration.trim_end_matches(';').split_once('=') else {
                return Err(format!("invalid exported property declaration: {trimmed}"));
            };
            let name = name.trim().split(':').next().unwrap_or_default().trim();
            if !is_identifier(name) {
                return Err(format!("invalid exported property name: {name}"));
            }
            let expression = value.trim();
            let parsed = parse_export_value(expression).ok_or_else(
                /* 构造错误消息，保留unsupported exported property value: {expression}。 */
                || format!("unsupported exported property value: {expression}"),
            )?;
            let value_type = metadata
                .get("type")
                .cloned()
                .unwrap_or_else(/* 计算并返回 value_type_name (& parsed) . to_owned ()，用于当前 prepare_script 流程。 */ || value_type_name(&parsed).to_owned());
            let minimum = metadata_number(&metadata, "min")?;
            let maximum = metadata_number(&metadata, "max")?;
            let step = metadata_number(&metadata, "step")?;
            if minimum.zip(maximum).is_some_and(
                /* 判断 minimum > maximum 是否成立，供过滤或有效性检查使用。 */
                |(minimum, maximum)| minimum > maximum,
            ) {
                return Err(format!("exported property {name} has min greater than max"));
            }
            if step.is_some_and(
                /* 判断 ! step . is_finite () || step <= 0.0 是否成立，供过滤或有效性检查使用。 */
                |step| !step.is_finite() || step <= 0.0,
            ) {
                return Err(format!("exported property {name} has an invalid step"));
            }
            let enum_values = metadata
                .get("enum")
                .map(/* 按分隔符解析枚举选项，去空白并剔除空项，同时限制选项数量和各项长度。 */ |value| {
                    value
                        .split('|')
                        .map(str::trim)
                        .filter(/* 判断 ! value . is_empty () 是否成立，供过滤或有效性检查使用。 */ |value| !value.is_empty())
                        .take(128)
                        .map(/* 计算并返回 value . chars () . take (128) . collect ()，用于当前 prepare_script 流程。 */ |value| value.chars().take(128).collect())
                        .collect()
                })
                .unwrap_or_default();
            let serialized = metadata
                .get("serialize")
                .map(
                    /* 判断 value != "false" 是否成立，供过滤或有效性检查使用。 */
                    |value| value != "false",
                )
                .unwrap_or(true);
            let expression = export_literal(&parsed);
            exports.push(ExportedProperty {
                name: name.to_owned(),
                value: parsed.clone(),
                value_type,
                default_value: parsed,
                minimum,
                maximum,
                step,
                enum_values,
                resource_type: metadata.get("resource").cloned().filter(
                    /* 判断 ! value . is_empty () 是否成立，供过滤或有效性检查使用。 */
                    |value| !value.is_empty(),
                ),
                group: metadata.get("group").cloned().unwrap_or_else(
                    /* 计算并返回 "Script" . into ()，用于当前 prepare_script 流程。 */
                    || "Script".into(),
                ),
                tooltip: metadata.get("tooltip").cloned().unwrap_or_default(),
                serialized,
            });
            output.push_str(&format!(
                "let {name} = export_value(\"{name}\", {expression});\n"
            ));
        } else {
            output.push_str(line);
            output.push('\n');
        }
    }
    for (legacy, replacement) in [
        ("is_down", "input_down"),
        ("was_pressed", "input_pressed"),
        ("was_released", "input_released"),
        ("axis", "input_axis"),
        ("vector", "input_vector"),
        ("get_component", "component_handle"),
        ("animator", "animator_handle"),
        ("audio_source", "audio_source_handle"),
        ("character_can_coyote_jump", "can_coyote_jump"),
    ] {
        if source_contains_call(source, legacy) {
            compatibility_warnings.push(format!(
                "NOVA-SCRIPT-DEPRECATED: {legacy}() is retained for compatibility; use {replacement}() before API v2"
            ));
        }
    }
    Ok(PreparedScript {
        source: output,
        exports,
        compatibility_warnings,
    })
}

// 解析导出声明前的元数据并返回剩余声明文本。
fn split_export_metadata(value: &str) -> Result<(BTreeMap<String, String>, &str), String> {
    if !value.starts_with('(') {
        return Ok((BTreeMap::new(), value));
    }
    let mut quoted = false;
    let mut escaped = false;
    let mut closing = None;
    for (index, character) in value.char_indices().skip(1) {
        if escaped {
            escaped = false;
            continue;
        }
        if character == '\\' && quoted {
            escaped = true;
        } else if character == '"' {
            quoted = !quoted;
        } else if character == ')' && !quoted {
            closing = Some(index);
            break;
        }
    }
    let closing = closing.ok_or_else(/* 计算并返回 "unterminated @export metadata" . to_owned ()，用于当前 split_export_metadata 流程。 */ || "unterminated @export metadata".to_owned())?;
    let mut metadata = BTreeMap::new();
    for field in split_metadata_fields(&value[1..closing]) {
        let (key, raw) = field.split_once('=').ok_or_else(
            /* 构造错误消息，保留invalid @export metadata field: {field}。 */
            || format!("invalid @export metadata field: {field}"),
        )?;
        let key = key.trim();
        if !matches!(
            key,
            "type"
                | "min"
                | "max"
                | "step"
                | "enum"
                | "resource"
                | "group"
                | "tooltip"
                | "serialize"
        ) {
            return Err(format!("unknown @export metadata field: {key}"));
        }
        let raw = raw.trim();
        let decoded = if raw.starts_with('"') {
            serde_json::from_str::<String>(raw).map_err(
                /* 构造错误消息，保留invalid string metadata value for {key}。 */
                |_| format!("invalid string metadata value for {key}"),
            )?
        } else {
            raw.to_owned()
        };
        metadata.insert(key.to_owned(), decoded);
    }
    Ok((metadata, value[closing + 1..].trim()))
}

// 按字段边界拆分元数据，避免切开带引号的内容。
fn split_metadata_fields(value: &str) -> Vec<&str> {
    let mut fields = Vec::new();
    let mut start = 0;
    let mut quoted = false;
    let mut escaped = false;
    for (index, character) in value.char_indices() {
        if escaped {
            escaped = false;
        } else if character == '\\' && quoted {
            escaped = true;
        } else if character == '"' {
            quoted = !quoted;
        } else if character == ',' && !quoted {
            fields.push(value[start..index].trim());
            start = index + 1;
        }
    }
    if start < value.len() {
        fields.push(value[start..].trim());
    }
    fields
        .into_iter()
        .filter(
            /* 判断 ! field . is_empty () 是否成立，供过滤或有效性检查使用。 */
            |field| !field.is_empty(),
        )
        .collect()
}

// 读取并校验指定元数据字段的数值。
fn metadata_number(metadata: &BTreeMap<String, String>, key: &str) -> Result<Option<f64>, String> {
    metadata
        .get(key)
        .map(
            /* 把导出元数据解析成有限浮点数，失败时返回带字段名称的错误。 */
            |value| {
                value
                    .parse::<f64>()
                    .ok()
                    .filter(
                        /* 判断 value . is_finite () 是否成立，供过滤或有效性检查使用。 */
                        |value| value.is_finite(),
                    )
                    .ok_or_else(
                        /* 构造错误消息，保留invalid numeric @export metadata for {key}。 */
                        || format!("invalid numeric @export metadata for {key}"),
                    )
            },
        )
        .transpose()
}

// 返回 JSON 值对应的脚本导出类型名称。
fn value_type_name(value: &Value) -> &'static str {
    match value {
        Value::Bool(_) => "bool",
        Value::Number(number) if number.is_i64() => "integer",
        Value::Number(_) => "float",
        Value::String(_) => "string",
        Value::Array(_) => "array",
        Value::Object(_) => "map",
        Value::Null => "null",
    }
}

// 判断源码是否含指定调用形式，用于兼容诊断。
fn source_contains_call(source: &str, name: &str) -> bool {
    source.lines().any(/* 逐行排除注释文本，再按标识符边界寻找目标函数调用。 */ |line| {
        let code = line.split("//").next().unwrap_or_default();
        code.match_indices(name).any(/* 检查名称前不是标识符字符且后方是左括号，排除相似名称误报。 */ |(index, _)| {
            let before = code[..index].chars().next_back();
            let after = code[index + name.len()..].trim_start().chars().next();
            !before.is_some_and(/* 判断 character == '_' || character . is_ascii_alphanumeric () 是否成立，供过滤或有效性检查使用。 */ |character| character == '_' || character.is_ascii_alphanumeric())
                && after == Some('(')
        })
    })
}

// 检查标识符首字符和后续字符是否合法。
fn is_identifier(value: &str) -> bool {
    let mut chars = value.chars();
    chars
        .next()
        .is_some_and(/* 判断 value == '_' || value . is_ascii_alphabetic () 是否成立，供过滤或有效性检查使用。 */ |value| value == '_' || value.is_ascii_alphabetic())
        && chars.all(/* 判断 value == '_' || value . is_ascii_alphanumeric () 是否成立，供过滤或有效性检查使用。 */ |value| value == '_' || value.is_ascii_alphanumeric())
}

// 把 JSON 默认值转换为可嵌入 Rhai 源码的字面量。
/// Export defaults are serialized data; nested JSON maps need Rhai map syntax.
fn export_literal(value: &Value) -> String {
    match value {
        Value::Null => "()".into(),
        Value::Array(values) => format!(
            "[{}]",
            values
                .iter()
                .map(export_literal)
                .collect::<Vec<_>>()
                .join(",")
        ),
        Value::Object(values) => format!(
            "#{{{}}}",
            values
                .iter()
                .map(
                    /* 转义对象键并递归生成值的 Rhai 字面量，组合为映射条目。 */
                    |(key, value)| format!(
                        "{}:{}",
                        Value::String(key.clone()),
                        export_literal(value)
                    )
                )
                .collect::<Vec<_>>()
                .join(",")
        ),
        _ => value.to_string(),
    }
}

// 将导出值文本转换为可被 JSON 解析的表示。
/// Normalize constant Rhai map/unit tokens into JSON without evaluating source.
fn export_json(value: &str) -> String {
    let chars: Vec<char> = value.chars().collect();
    let mut output = String::with_capacity(value.len());
    let (mut index, mut quoted, mut escaped) = (0, false, false);
    while index < chars.len() {
        let ch = chars[index];
        if quoted {
            output.push(ch);
            if escaped {
                escaped = false;
            } else if ch == '\\' {
                escaped = true;
            } else if ch == '"' {
                quoted = false;
            }
            index += 1;
            continue;
        }
        if ch == '"' {
            quoted = true;
            output.push(ch);
            index += 1;
            continue;
        }
        if ch == '#' && chars.get(index + 1) == Some(&'{') {
            index += 1;
            continue;
        }
        if ch == '(' {
            let mut end = index + 1;
            while chars.get(end).is_some_and(
                /* 计算并返回 value . is_whitespace ()，用于当前 export_json 流程。 */
                |value| value.is_whitespace(),
            ) {
                end += 1;
            }
            if chars.get(end) == Some(&')') {
                output.push_str("null");
                index = end + 1;
                continue;
            }
        }
        if ch.is_ascii_alphabetic() || ch == '_' {
            let begin = index;
            index += 1;
            while chars
                .get(index)
                .is_some_and(/* 判断 value . is_ascii_alphanumeric () || * value == '_' 是否成立，供过滤或有效性检查使用。 */ |value| value.is_ascii_alphanumeric() || *value == '_')
            {
                index += 1;
            }
            let word: String = chars[begin..index].iter().collect();
            let mut next = index;
            while chars.get(next).is_some_and(
                /* 计算并返回 value . is_whitespace ()，用于当前 export_json 流程。 */
                |value| value.is_whitespace(),
            ) {
                next += 1;
            }
            if chars.get(next) == Some(&':') {
                output.push_str(&Value::String(word).to_string());
            } else {
                output.push_str(&word);
            }
            continue;
        }
        output.push(ch);
        index += 1;
    }
    output
}

// 解析导出属性初值，不支持的表达式返回空值。
fn parse_export_value(value: &str) -> Option<Value> {
    match value {
        "()" | "null" => Some(Value::Null),
        "true" => Some(Value::Bool(true)),
        "false" => Some(Value::Bool(false)),
        _ if value.starts_with("#{") && value.ends_with('}') => {
            serde_json::from_str(&export_json(value)).ok()
        }
        _ if (value.starts_with('[') && value.ends_with(']'))
            || (value.starts_with('{') && value.ends_with('}')) =>
        {
            serde_json::from_str(&export_json(value)).ok()
        }
        _ if value.starts_with('"') && value.ends_with('"') && value.len() >= 2 => {
            serde_json::from_str(value).ok()
        }
        _ => value
            .parse::<i64>()
            .map(Value::from)
            .or_else(/* 判断 value . parse :: < f64 > () . ok () . and_then (serde_json :: Number :: from_f64) . map (Value :: Number) . ok_or (()) 是否成立，供过滤或有效性检查使用。 */ |_| {
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

    // 构造脚本沙箱测试使用的宿主上下文。
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

    // 验证导出属性和受控命令正确跨越脚本沙箱边界。
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

    // 验证全局初始化只执行一次且导出状态修改被保留。
    #[test]
    fn lifecycle_runs_global_initialization_once_and_retains_export_changes() {
        let source = r#"
            @export let counter = 0;
            score_add(1.0);
            fn update(dt) { counter += 1; }
        "#;
        let execution = ScriptRuntime::new()
            .execute(source, "update", context())
            .unwrap();
        assert_eq!(
            execution.commands,
            vec![ScriptCommand::ScoreAdd { value: 1.0 }]
        );
        assert_eq!(execution.properties["counter"], 1);

        let mut next_context = context();
        next_context.properties = execution.properties;
        let mut cached = ScriptRuntime::new();
        cached.upsert("counter", source).unwrap();
        let next = cached
            .execute_cached("counter", "update", next_context)
            .unwrap();
        assert_eq!(next.commands, vec![ScriptCommand::ScoreAdd { value: 1.0 }]);
        assert_eq!(next.properties["counter"], 2);
    }

    // 验证向量和数据对象导出值可跨越可视脚本桥接。
    #[test]
    fn exported_graph_values_cross_the_sandbox_boundary() {
        let source = r#"
            @export(type="vec2") let direction = [2.0, -1.0];
            @export(type="data") let payload = #{ "score": 7, "ready": true };
            @export(type="data") let optional = ();
            fn start() { }
        "#;
        let runtime = ScriptRuntime::new();
        let exports = runtime.validate(source).expect("graph exports validate");
        assert_eq!(exports.len(), 3);
        let execution = runtime
            .execute(source, "start", context())
            .expect("graph exports execute");
        assert_eq!(
            execution.properties["direction"],
            serde_json::json!([2.0, -1.0])
        );
        assert_eq!(execution.properties["payload"]["score"], 7);
        assert_eq!(execution.properties["optional"], Value::Null);
    }

    // 验证图追踪命令有界并采用前端预期的驼峰字段。
    #[test]
    fn graph_trace_commands_are_bounded_and_use_the_camel_case_bridge() {
        let source = r#"
            fn start() {
                __nova_graph_trace("graph-1", "routine-1", "node-1", "edge-1", 99, #{ score: 7, ready: true });
            }
        "#;
        let execution = ScriptRuntime::new()
            .execute(source, "start", context())
            .expect("graph trace executes inside the sandbox");
        assert!(matches!(
            execution.commands.first(),
            Some(ScriptCommand::GraphTrace {
                graph_uuid,
                scope_uuid,
                node_uuid,
                edge_uuid,
                depth,
                values,
                ..
            }) if graph_uuid == "graph-1"
                && scope_uuid == "routine-1"
                && node_uuid == "node-1"
                && edge_uuid == "edge-1"
                && *depth == 32
                && values["score"] == 7
                && values["ready"] == true
        ));
        let serialized = serde_json::to_value(&execution.commands[0])
            .expect("graph trace serializes for the TypeScript bridge");
        assert_eq!(serialized["type"], "graphTrace");
        assert_eq!(serialized["graphUuid"], "graph-1");
        assert_eq!(serialized["scopeUuid"], "routine-1");
        assert_eq!(serialized["nodeUuid"], "node-1");
        assert_eq!(serialized["edgeUuid"], "edge-1");
        assert!(serialized.get("durationMicros").is_some());
        assert!(serialized.get("graph_uuid").is_none());
    }

    // 验证动画和音频命令按契约输出到宿主。
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

    // 验证后更新生命周期收到正确渲染时间增量。
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

    // 验证实体读取使用复制快照及有效组件句柄。
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

    // 验证脚本不能导入宿主文件系统等未授权模块。
    #[test]
    fn scripts_cannot_import_host_modules() {
        let error = ScriptRuntime::new()
            .validate("import \"filesystem\";")
            .unwrap_err();
        assert!(
            error.to_lowercase().contains("reserved") || error.to_lowercase().contains("import")
        );
    }

    // 验证存档命令支持标量、数组和映射。
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

    // 验证无限运行脚本触发操作预算限制。
    #[test]
    fn runaway_scripts_hit_the_operation_limit() {
        let source = "fn update(dt) { while true { let value = dt * 2.0; } }";
        let error = ScriptRuntime::new()
            .execute(source, "update", context())
            .unwrap_err();
        assert!(error.to_lowercase().contains("operations"));
    }

    // 验证编译失败时缓存仍保留上一有效语法树。
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

    // 验证信号、任务、类型句柄及断言桥接。
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
        assert!(result.commands.iter().any(/* 检查事件或命令是否符合当前测试预期：matches ! (command , ScriptCommand :: StartTask { name , seconds } if name == "resume" && * seconds == 0.25)。 */ |command| matches!(command, ScriptCommand::StartTask { name, seconds } if name == "resume" && *seconds == 0.25)));
        assert!(result.commands.iter().any(/* 检查事件或命令是否符合当前测试预期：matches ! (command , ScriptCommand :: EmitSignal { name , target , .. } if name == "player.ready" && target == "entity-1")。 */ |command| matches!(command, ScriptCommand::EmitSignal { name, target, .. } if name == "player.ready" && target == "entity-1")));
    }

    // 验证生命周期末尾可包含有返回值的表达式。
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

    // 验证相同随机种子产生可复现且有界的数值。
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

    // 验证第二版导出元数据完整并正确拒绝非法配置。
    #[test]
    fn api_v2_export_metadata_is_complete_and_validated() {
        let source = r#"
            @export(type="float", min=0, max=20, step=0.25, group="Movement", tooltip="Meters per second", serialize=true) let speed = 5.0;
            @export(type="resource", resource="Texture2D", group="Visual", serialize=false) let icon = "asset://texture";
        "#;
        let exports = ScriptRuntime::new().validate(source).unwrap();
        assert_eq!(exports.len(), 2);
        assert_eq!(exports[0].value_type, "float");
        assert_eq!(exports[0].minimum, Some(0.0));
        assert_eq!(exports[0].maximum, Some(20.0));
        assert_eq!(exports[0].step, Some(0.25));
        assert_eq!(exports[0].group, "Movement");
        assert!(exports[0].serialized);
        assert_eq!(exports[1].resource_type.as_deref(), Some("Texture2D"));
        assert!(!exports[1].serialized);
        assert!(ScriptRuntime::new()
            .validate("@export(min=10,max=1) let broken = 2.0;")
            .is_err());
    }

    // 验证稳定句柄和第二版接口仍遵守沙箱命令边界。
    #[test]
    fn stable_handles_and_api_v2_domains_are_sandboxed_commands() {
        let mut script_context = context();
        script_context
            .components
            .extend(["Text".into(), "NavigationAgent2D".into()]);
        let source = r#"
            fn update(dt) {
                let current = entity_handle();
                let texture = resource_handle("asset://texture", "Texture2D");
                expect(api_version() == 2 && api_current_version() == 2 && api_minimum_version() == 1 && current.generation > 0 && texture.valid, "v2 handles");
                log_info("ready");
                ui_set_text("Score: 3");
                ui_set_value(0.75);
                navigation_set_target(4.0, 6.0);
            }
        "#;
        let execution = ScriptRuntime::new()
            .execute(source, "update", script_context)
            .unwrap();
        assert_eq!(execution.logs[0].message, "ready");
        assert!(matches!(
            execution.commands[0],
            ScriptCommand::UiSetText { .. }
        ));
        assert!(
            matches!(execution.commands[1], ScriptCommand::UiSetValue { value } if value == 0.75)
        );
        assert!(
            matches!(execution.commands[2], ScriptCommand::NavigationSetTarget { x, y } if x == 4.0 && y == 6.0)
        );
    }

    // 验证动态实体、游戏流程和高级输入接口的边界。
    #[test]
    fn dynamic_object_game_flow_and_advanced_input_api_are_bounded() {
        let mut script_context = context();
        script_context.scene_entities = vec![SceneEntitySnapshot {
            uuid: "enemy-1".into(),
            generation: 0,
            name: "Enemy".into(),
            enabled: true,
            tags: vec!["enemy".into()],
            groups: vec!["actors".into()],
            components: vec!["Health2D".into()],
            position: [4.0, 2.0],
        }];
        script_context.input.performed.insert("Fire".into(), true);
        script_context
            .input
            .phases
            .insert("Fire".into(), "performed".into());
        script_context.input.durations.insert("Fire".into(), 0.4);
        script_context.input.contexts.push("Combat".into());
        script_context.input.maps.push("Default".into());
        script_context.input.scheme = "Gamepad".into();
        script_context.game_flow.score = 12.0;
        script_context.game_flow.checkpoints.push("start".into());
        script_context
            .game_flow
            .session
            .insert("wave".into(), Value::from(2));
        let source = r#"
            fn update(dt) {
                let targets = query_tag("enemy", 9999);
                expect(targets.len == 1 && input_performed("Fire") && input_phase("Fire") == "performed"
                    && input_duration("Fire") == 0.4 && input_context_active("Combat") && input_map_active("Default")
                    && input_scheme() == "Gamepad" && score_get() == 12.0
                    && checkpoint_has("start") && session_get("wave", 0) == 2, "v5.4 reads");
                let created = spawn_at("asset://bullet", 1.0, 2.0, 0.25, 1.0, 1.0);
                entity_set_position(created, 3.0, 4.0);
                entity_add_tag(targets[0], "targeted");
                component_set_enabled_on(targets[0], "Health2D", false);
                game_pause(true); score_add(5.0); checkpoint_set("combat");
                session_set("wave", 3); input_context_push("Menu", 100, true);
                input_context_pop("Menu"); input_map_enable("Combat"); input_map_disable("Combat"); input_scheme_set("KeyboardMouse");
            }
        "#;
        let execution = ScriptRuntime::new()
            .execute(source, "update", script_context)
            .expect("v5.4 gameplay API executes");
        assert!(execution.logs.is_empty());
        assert!(
            matches!(&execution.commands[0], ScriptCommand::SpawnAt { pending_id, prefab, .. } if pending_id == "pending:entity-1:0:1" && prefab == "asset://bullet")
        );
        assert!(
            matches!(&execution.commands[1], ScriptCommand::TargetSetPosition { target, .. } if target == "pending:entity-1:0:1")
        );
        assert!(
            matches!(&execution.commands[2], ScriptCommand::TargetAddTag { target, tag, .. } if target == "enemy-1" && tag == "targeted")
        );
        assert!(execution
            .commands
            .iter()
            .any(/* 检查事件或命令是否符合当前测试预期：matches ! (command , ScriptCommand :: GamePause { paused : true })。 */ |command| matches!(command, ScriptCommand::GamePause { paused: true })));
        assert!(execution.commands.iter().any(/* 检查事件或命令是否符合当前测试预期：matches ! (command , ScriptCommand :: InputContextPush { name , priority : 100 , consume : true } if name == "Menu")。 */ |command| matches!(command, ScriptCommand::InputContextPush { name, priority: 100, consume: true } if name == "Menu")));
        let serialized = serde_json::to_value(&execution.commands[1]).expect("command bridge");
        assert_eq!(serialized["type"], "targetSetPosition");
        assert!(serialized.get("generation").is_some());
    }

    // 验证实体生命周期代数在读取、查询与命令间保持一致。
    #[test]
    fn entity_lifetime_generations_cross_reads_queries_and_commands() {
        let mut script_context = context();
        script_context.entity_generations =
            BTreeMap::from([("entity-1".into(), 41), ("enemy-1".into(), 73)]);
        script_context
            .entities
            .insert("Enemy".into(), "enemy-1".into());
        script_context.scene_entities = vec![SceneEntitySnapshot {
            uuid: "enemy-1".into(),
            generation: 73,
            name: "Enemy".into(),
            enabled: true,
            tags: vec!["enemy".into()],
            groups: vec![],
            components: vec![],
            position: [4.0, 2.0],
        }];
        let execution = ScriptRuntime::new().execute(r#"
            fn update(dt) {
                expect(entity_handle().generation == 41, "self lifetime");
                let found = find_entity_handle("Enemy");
                let queried = query_tag("enemy", 1)[0];
                expect(found.generation == 73 && queried.generation == 73, "target lifetime");
                expect(entity_name_on(found) == "Enemy" && entity_position_x_on(queried) == 4.0, "fresh query");
                let stale = found; stale.generation = 72;
                expect(entity_name_on(stale) == "" && !entity_enabled_on(stale), "stale query rejected");
                entity_set_position(found, 3.0, 5.0);
            }
        "#, "update", script_context).unwrap();
        assert!(execution.logs.is_empty());
        assert!(
            matches!(&execution.commands[0], ScriptCommand::TargetSetPosition { generation: 73, target, .. } if target == "enemy-1")
        );
    }

    // 验证不同回调中待生成实体句柄不会冲突。
    #[test]
    fn pending_spawn_handles_are_unique_across_callback_invocations() {
        let source = r#"fn update(dt) { let item = spawn_at("asset://bullet", 0.0, 0.0, 0.0, 1.0, 1.0); entity_set_position(item, 2.0, 0.0); }"#;
        let mut first = context();
        first.invocation_id = 81;
        let mut second = context();
        second.invocation_id = 82;
        let runtime = ScriptRuntime::new();
        let a = runtime.execute(source, "update", first).unwrap();
        let b = runtime.execute(source, "update", second).unwrap();
        for (execution, expected) in [(&a, "pending:entity-1:81:1"), (&b, "pending:entity-1:82:1")]
        {
            assert!(
                matches!(&execution.commands[0], ScriptCommand::SpawnAt { pending_id, .. } if pending_id == expected)
            );
            assert!(
                matches!(&execution.commands[1], ScriptCommand::TargetSetPosition { target, generation, .. } if target == expected && *generation == handle_generation(expected))
            );
        }
    }

    // 验证缺少新生命周期元数据的旧上下文仍可反序列化。
    #[test]
    fn legacy_context_omitting_lifetime_metadata_still_deserializes() {
        let old: ScriptContext =
            serde_json::from_value(serde_json::json!({ "entity": "legacy" })).unwrap();
        assert_eq!(old.invocation_id, 0);
        assert!(old.entity_generations.is_empty());
        let execution = ScriptRuntime::new()
            .execute(
                "fn start(){ let h = entity_handle(); entity_set_position(h, 1.0, 2.0); }",
                "start",
                old,
            )
            .unwrap();
        assert!(
            matches!(execution.commands[0], ScriptCommand::TargetSetPosition { generation, .. } if generation == handle_generation("legacy"))
        );
    }

    // 验证旧别名只发出一次兼容警告。
    #[test]
    fn deprecated_aliases_emit_one_compatibility_warning() {
        let execution = ScriptRuntime::new()
            .execute(
                "fn update(dt) { if is_down(\"Jump\") { print(\"held\"); } }",
                "update",
                context(),
            )
            .unwrap();
        assert_eq!(execution.logs.len(), 1);
        assert!(execution.logs[0].message.contains("NOVA-SCRIPT-DEPRECATED"));
        assert!(execution.logs[0].message.contains("input_down"));
    }

    // 验证第二版全部宿主绑定可在沙箱执行。
    #[test]
    fn every_api_v2_host_binding_executes_inside_the_sandbox() {
        let mut script_context = context();
        script_context.components = vec![
            "RigidBody2D".into(),
            "Animator".into(),
            "AudioSource".into(),
            "CharacterBody2D".into(),
            "Text".into(),
            "NavigationAgent2D".into(),
        ];
        script_context
            .entities
            .insert("Player".into(), "entity-1".into());
        script_context.input.down.insert("Move".into(), true);
        script_context.input.released.insert("Move".into(), true);
        script_context.input.axes.insert("Move".into(), 0.5);
        script_context
            .input
            .vectors
            .insert("Move".into(), [0.5, -0.25]);
        script_context.input.mouse_world_position = [3.25, -4.5];
        script_context.input.view_bounds = [-12.0, 12.0, -7.0, 7.0];
        script_context.input.viewport_size = [1920.0, 1080.0];
        script_context.rigid_body = Some(RigidBodySnapshot {
            velocity: [1.0, 2.0],
            angular_velocity: 0.25,
            mass: 2.0,
            body_type: "Dynamic".into(),
        });
        script_context.character = Some(CharacterSnapshot {
            on_floor: true,
            can_coyote_jump: true,
            floor_normal: [0.0, -1.0],
            platform_velocity: [1.0, 0.0],
            ..CharacterSnapshot::default()
        });
        let source = r#"
            fn update(dt) {
                let h0 = entity_handle(); let h1 = find_entity_handle("Player"); let h2 = component_handle("RigidBody2D");
                let h3 = animator_handle(); let h4 = audio_source_handle(); let h5 = resource_handle("asset://texture", "Texture2D");
                expect(api_version() == 2 && api_current_version() == 2 && api_minimum_version() == 1 && api_namespace("scene_load") == "scene" && h0.valid && h1.valid && h2.valid && h3.valid && h4.valid && h5.valid, "handles");
                entity(); entity_name(); find_entity("Player"); has_component("RigidBody2D"); get_component("RigidBody2D"); transform(); rigid_body(); animator(); audio_source();
                input_down("Move"); input_pressed("Jump"); input_released("Move"); input_axis("Move"); input_vector("Move"); input_vector_x("Move"); input_vector_y("Move"); mouse_x(); mouse_y(); wheel_x(); wheel_y();
                expect(mouse_world_x() == 3.25 && mouse_world_y() == -4.5 && view_min_x() == -12.0 && view_max_x() == 12.0 && view_min_y() == -7.0 && view_max_y() == 7.0 && viewport_width() == 1920.0 && viewport_height() == 1080.0, "world pointer input");
                time(); time_delta(); time_fixed_delta(); time_elapsed(); time_scale(); time_frame(); random(); random_range(0.0, 1.0);
                apply_force(1.0, 2.0); apply_impulse(1.0, 2.0); set_velocity(1.0, 2.0); set_position(1.0, 2.0); set_rotation(0.5); set_scale(1.0, 1.0); set_angular_velocity(0.5);
                character_is_on_floor(); character_is_on_wall(); character_is_on_ceiling(); can_coyote_jump(); character_floor_normal_x(); character_floor_normal_y(); character_floor_normal(); character_platform_velocity_x(); character_platform_velocity_y(); character_platform_velocity(); move_character(1.0, 0.0);
                animator_set_bool("moving", true); animator_set_float("speed", 1.0); animator_set_integer("state", 1); animator_trigger("jump"); animator_play("Run");
                audio_play(); audio_pause(); audio_stop(); ui_set_text("Ready"); ui_set_value(0.5); navigation_set_target(4.0, 2.0);
                instantiate("asset://prefab"); timer_start("timer", 0.1, false); timer_pause("timer"); timer_resume("timer"); timer_cancel("timer"); task_wait("task", 0.1); task_cancel("task");
                signal_emit("ready", true); signal_emit_to(entity(), "ready", #{ value: 1 });
                save_has("score"); save_get("score", 0); save_set("score", 1); save_delete("score"); save_clear(); save_load("slot"); save_commit("slot");
                log_debug("debug"); log_info("info"); log_warning("warning"); log_error("expected diagnostic");
                scene_load("Main"); scene_reload(); scene_quit(); despawn(); destroy();
            }
        "#;
        let execution = ScriptRuntime::new()
            .execute(source, "update", script_context)
            .unwrap();
        assert!(execution.commands.len() > 30);
        assert!(execution.logs.iter().any(
            /* 在当前宏表达式中计算 log . level == "debug"，供查询映射、过滤或断言使用。 */
            |log| log.level == "debug"
        ));
        assert!(execution.logs.iter().any(
            /* 在当前宏表达式中计算 log . level == "warning"，供查询映射、过滤或断言使用。 */
            |log| log.level == "warning"
        ));
    }

    // 验证第一版上下文通过适配器继续可用。
    #[test]
    fn api_v1_context_remains_available_through_the_v2_adapter() {
        let mut script_context = context();
        script_context.api_version = 1;
        let execution = ScriptRuntime::new()
            .execute(
                "fn update(dt) { expect(api_version() == 1 && api_current_version() == 2, \"v1 adapter\"); input_down(\"Move\"); }",
                "update",
                script_context,
            )
            .unwrap();
        assert!(!execution.logs.iter().any(
            /* 在当前宏表达式中计算 log . level == "error"，供查询映射、过滤或断言使用。 */
            |log| log.level == "error"
        ));
    }

    // 验证编辑器自动化需明确授权、有界且对游戏禁用。
    #[test]
    fn editor_automation_is_explicit_bounded_and_disabled_for_games() {
        let source = r#"
            fn run() {
                expect(editor_automation(), "automation context");
                let selected = editor_selected();
                expect(editor_selected_count() == 1 && selected.len == 1, "selection snapshot");
                editor_rename(selected[0], "Renamed safely");
                editor_select(selected[0]);
                editor_create_box("Generated box", 2.0, 3.0, 4.0, 5.0);
                editor_create_text_asset("Assets/Automation/readme.data", "dataTable", "safe local output");
            }
        "#;
        let mut automation = context();
        automation.editor_automation = true;
        automation.editor_selection = vec![automation.entity.clone()];
        let execution = ScriptRuntime::new()
            .execute(source, "run", automation)
            .unwrap();
        assert_eq!(execution.commands.len(), 4);
        assert!(
            matches!(&execution.commands[0], ScriptCommand::EditorRename { name, .. } if name == "Renamed safely")
        );
        assert!(matches!(
            &execution.commands[1],
            ScriptCommand::EditorSelect { .. }
        ));
        assert!(
            matches!(&execution.commands[2], ScriptCommand::EditorCreateEntity { shape, width, height, .. } if shape == "Box" && *width == 4.0 && *height == 5.0)
        );
        assert!(
            matches!(&execution.commands[3], ScriptCommand::EditorCreateTextAsset { path, .. } if path == "Assets/Automation/readme.data")
        );

        let mut game = context();
        game.editor_selection = vec![game.entity.clone()];
        let disabled = ScriptRuntime::new().execute(
            "fn run() { let selected = editor_selected(); expect(!editor_automation() && selected.len == 0 && !editor_create_box(\"Nope\", 0.0, 0.0, 1.0, 1.0), \"disabled\"); }",
            "run",
            game,
        ).unwrap();
        assert!(disabled.commands.is_empty());
    }

    // 验证过量宿主命令输出被沙箱拒绝。
    #[test]
    fn sandbox_rejects_unbounded_host_command_output() {
        let error = ScriptRuntime::new()
            .execute(
                "fn update(dt) { for value in 0..5000 { score_add(1.0); } }",
                "update",
                context(),
            )
            .expect_err("command flood must stop inside the sandbox");
        assert!(error.contains("too many host commands"), "{error}");
    }

    // 验证脚本自建集合不能超过资源上限。
    #[test]
    fn sandbox_limits_script_owned_collections() {
        let error = ScriptRuntime::new()
            .execute(
                "fn update(dt) { let values = []; for value in 0..9000 { values.push(value); } }",
                "update",
                context(),
            )
            .expect_err("oversized script array must be rejected");
        assert!(error.to_lowercase().contains("array"), "{error}");
    }

    // 验证自定义事件获得所属事件族参数，并兼容零参数旧回调。
    #[test]
    fn custom_event_callbacks_receive_family_arguments_and_keep_zero_arg_compatibility() {
        let runtime = ScriptRuntime::new();
        for (family, source, expected) in [
            ("on_task", "fn custom(name) { log_info(name); }", "task"),
            ("on_timer", "fn custom(name) { log_info(name); }", "task"),
            (
                "on_signal",
                "fn custom(name, payload, source) { log_info(name + payload.n + source); }",
                "task7sender",
            ),
            ("on_task", "fn custom() { log_info(\"legacy\"); }", "legacy"),
        ] {
            let mut input = context();
            input.callback_kind = family.into();
            input.event = Some(EventSnapshot {
                name: "task".into(),
                source: "sender".into(),
                payload: serde_json::json!({"n":7}),
            });
            let result = runtime.execute(source, "custom", input).unwrap();
            assert_eq!(result.logs[0].message, expected);
        }
        let mut input = context();
        input.callback_kind = "update".into();
        input.time.delta = 0.25;
        assert!(runtime
            .execute(
                "fn custom(dt) { expect(dt == 0.25, \"delta\"); }",
                "custom",
                input
            )
            .unwrap()
            .logs
            .is_empty());
    }

    // 验证直接或函数指针调用的阻塞睡眠均被拒绝。
    #[test]
    fn sandbox_rejects_blocking_sleep_including_function_pointers() {
        let runtime = ScriptRuntime::new();
        for source in [
            "fn update(dt) { sleep(0); }",
            "fn update(dt) { sleep(0.0); }",
            "fn update(dt) { Fn(\"sleep\").call(0); }",
            "fn update(dt) { Fn(\"sleep\").call(0.0); }",
        ] {
            let error = runtime
                .execute(source, "update", context())
                .expect_err("direct and indirect sleep must never block a VM callback");
            assert!(error.to_lowercase().contains("sleep"), "{error}");
        }
    }

    // 验证候选缓存共享不可变程序而不修改正在运行的代数。
    #[test]
    fn candidate_cache_shares_immutable_programs_without_mutating_live_generation() {
        let mut live = ScriptRuntime::new();
        live.upsert("changed", "fn start(){print(1);}").unwrap();
        live.upsert("unchanged", "fn start(){print(10);}").unwrap();
        let mut candidate = live.clone();
        assert!(Rc::ptr_eq(
            &live.scripts["changed"],
            &candidate.scripts["changed"]
        ));
        assert!(Rc::ptr_eq(
            &live.scripts["unchanged"],
            &candidate.scripts["unchanged"]
        ));
        candidate
            .upsert("changed", "fn start(){print(2);}")
            .unwrap();
        assert!(!Rc::ptr_eq(
            &live.scripts["changed"],
            &candidate.scripts["changed"]
        ));
        assert!(Rc::ptr_eq(
            &live.scripts["unchanged"],
            &candidate.scripts["unchanged"]
        ));
        assert_eq!(
            live.execute_cached("changed", "start", context())
                .unwrap()
                .logs[0]
                .message,
            "1"
        );
        assert_eq!(
            candidate
                .execute_cached("changed", "start", context())
                .unwrap()
                .logs[0]
                .message,
            "2"
        );
        assert!(candidate.upsert("changed", "fn start( {").is_err());
        assert_eq!(
            candidate
                .execute_cached("changed", "start", context())
                .unwrap()
                .logs[0]
                .message,
            "2"
        );
        assert!(candidate.remove("unchanged"));
        assert!(live.execute_cached("unchanged", "start", context()).is_ok());
        drop(live);
        assert_eq!(
            candidate
                .execute_cached("changed", "start", context())
                .unwrap()
                .logs[0]
                .message,
            "2"
        );
    }

    // 验证嵌套导出默认值和空状态往返时不被后备值覆盖。
    #[test]
    fn nested_export_defaults_and_null_state_round_trip_without_fallback() {
        let source = "@export let bag = [#{\"coins\": 1, \"empty\": null}];\n@export let missing = null;\nfn start(){bag[0].coins+=4;missing=();}";
        let runtime = ScriptRuntime::new();
        let first = runtime.execute(source, "start", context()).unwrap();
        assert_eq!(
            first.properties["bag"],
            serde_json::json!([{"coins":5,"empty":null}])
        );
        assert_eq!(first.properties["missing"], Value::Null);
        let mut next = context();
        next.properties = first.properties;
        let second = runtime.execute(source, "start", next).unwrap();
        assert_eq!(
            second.properties["bag"],
            serde_json::json!([{"coins":9,"empty":null}])
        );
        assert!(dynamic_to_json(Dynamic::UNIT).unwrap().is_null());
        assert!(dynamic_to_json(Dynamic::from(rhai::FnPtr::new("start").unwrap())).is_none());
    }

    // 验证相同源码复用缓存，导出元数据改变时正确失效。
    #[test]
    fn compiled_cache_reuses_equal_content_and_invalidates_export_metadata() {
        let mut runtime = ScriptRuntime::new();
        let source = "@export(min=0) let count = 1;\nfn start(){count+=1;}";
        runtime.upsert("same", source).unwrap();
        let original = Rc::clone(&runtime.scripts["same"]);
        runtime.upsert("same", source).unwrap();
        assert!(Rc::ptr_eq(&original, &runtime.scripts["same"]));
        runtime
            .upsert("same", &source.replace("min=0", "min=1"))
            .unwrap();
        assert!(!Rc::ptr_eq(&original, &runtime.scripts["same"]));
        assert_eq!(
            runtime.scripts["same"].prepared.exports[0].minimum,
            Some(1.0)
        );
        assert!(parse_export_value("#{value: print(1)}").is_none());
        assert_eq!(
            parse_export_value("#{text: \"#{} ()\", nested: [#{value: ()}]}"),
            Some(serde_json::json!({"text":"#{} ()","nested":[{"value":null}]}))
        );
    }
}
