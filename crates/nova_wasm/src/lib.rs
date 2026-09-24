// WebAssembly 边界：将运行时、脚本和工程迁移转换为浏览器可用的数据接口。
//! The only `wasm_bindgen` boundary in the Nova_A workspace.

use nova_runtime::{DroppedTimePolicy, FixedTimeSettings, RuntimeWorld};
use nova_script::{ScriptContext, ScriptRuntime};
use wasm_bindgen::prelude::*;

// 安装 WebAssembly panic 处理器，将 Rust 错误位置传到浏览器异常。
/// Surface Rust panic locations to the editor console instead of leaving users
/// with an opaque `RuntimeError: unreachable` from the WebAssembly boundary.
#[wasm_bindgen(start)]
pub fn install_panic_reporter() {
    std::panic::set_hook(Box::new(
        /* 计算并返回 wasm_bindgen :: throw_str (& format ! ("Nova_A WebAssembly panic: {info}")) ;，用于当前 install_panic_reporter 流程。 */
        |info| {
            wasm_bindgen::throw_str(&format!("Nova_A WebAssembly panic: {info}"));
        },
    ));
}

#[wasm_bindgen]
pub struct WasmRuntimeWorld {
    inner: RuntimeWorld,
}

#[wasm_bindgen]
impl WasmRuntimeWorld {
    // 创建由平台无关运行时支持的浏览器物理世界包装器。
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inner: RuntimeWorld::new(),
        }
    }

    // 按稳定句柄新增或更新刚体记录，返回是否发生有效变化。
    pub fn upsert_body(
        &mut self,
        handle: u32,
        order: u32,
        record: &[f64],
    ) -> Result<bool, JsValue> {
        self.inner
            .upsert_body(handle, order, record)
            .map_err(JsValue::from_str)
    }

    // 移除指定刚体以及依赖它的状态，返回是否找到目标。
    pub fn destroy_body(&mut self, handle: u32) -> bool {
        self.inner.destroy_body(handle)
    }

    // 按刚体句柄更新复合碰撞体记录，并标记配置变化。
    pub fn upsert_collider_shapes(
        &mut self,
        handle: u32,
        records: &[f64],
    ) -> Result<bool, JsValue> {
        self.inner
            .upsert_collider_shapes(handle, records)
            .map_err(JsValue::from_str)
    }

    // 按稳定句柄新增或更新连接记录，并保留确定性的顺序。
    pub fn upsert_connection(
        &mut self,
        handle: u32,
        order: u32,
        record: &[f64],
    ) -> Result<bool, JsValue> {
        self.inner
            .upsert_connection(handle, order, record)
            .map_err(JsValue::from_str)
    }

    // 移除指定连接并标记求解配置需要更新。
    pub fn destroy_connection(&mut self, handle: u32) -> bool {
        self.inner.destroy_connection(handle)
    }

    // 验证 JSON 请求大小并执行带过滤查询，将结果或错误转回 JavaScript。
    pub fn query_filtered_json(&self, source: &str) -> Result<String, JsValue> {
        if source.len() > 32768 {
            return Err(JsValue::from_str(
                "PHYSICS_QUERY_LIMIT: request exceeds32KiB",
            ));
        }
        let request: nova_physics::PhysicsQueryRequest2D = serde_json::from_str(source).map_err(
            /* 把错误消息转换为 JavaScript 可接收的异常值。 */
            |error| JsValue::from_str(&format!("PHYSICS_QUERY_INPUT: {error}")),
        )?;
        let hits = self
            .inner
            .query_filtered(&request)
            .map_err(JsValue::from_str)?;
        serde_json::to_string(&hits).map_err(
            /* 把错误消息转换为 JavaScript 可接收的异常值。 */
            |error| JsValue::from_str(&error.to_string()),
        )
    }

    // 将单次射线命中结果编码为 JSON。
    pub fn raycast_json(
        &self,
        origin_x: f64,
        origin_y: f64,
        direction_x: f64,
        direction_y: f64,
        distance: f64,
        mask: u32,
    ) -> String {
        serde_json::to_string(&self.inner.raycast(
            [origin_x, origin_y],
            [direction_x, direction_y],
            distance,
            mask,
        ))
        .unwrap_or_else(
            /* 提供缺省或失败路径的空值：String :: from ("null")。 */
            |_| String::from("null"),
        )
    }

    // 将所有射线命中结果编码为 JSON。
    pub fn raycast_all_json(
        &self,
        origin_x: f64,
        origin_y: f64,
        direction_x: f64,
        direction_y: f64,
        distance: f64,
        mask: u32,
    ) -> String {
        serde_json::to_string(&self.inner.raycast_all(
            [origin_x, origin_y],
            [direction_x, direction_y],
            distance,
            mask,
        ))
        .unwrap_or_else(
            /* 提供缺省或失败路径的空值：String :: from ("[]")。 */
            |_| String::from("[]"),
        )
    }

    // 将点重叠查询的刚体句柄集合编码为 JSON。
    pub fn overlap_point_json(&self, x: f64, y: f64, mask: u32) -> String {
        serde_json::to_string(&self.inner.overlap_point([x, y], mask)).unwrap_or_else(
            /* 提供缺省或失败路径的空值：String :: from ("[]")。 */
            |_| String::from("[]"),
        )
    }

    // 将圆形重叠查询结果编码为 JSON。
    pub fn overlap_circle_json(&self, x: f64, y: f64, radius: f64, mask: u32) -> String {
        serde_json::to_string(&self.inner.overlap_circle([x, y], radius, mask)).unwrap_or_else(
            /* 提供缺省或失败路径的空值：String :: from ("[]")。 */
            |_| String::from("[]"),
        )
    }

    // 将旋转矩形重叠查询结果编码为 JSON。
    pub fn overlap_box_json(
        &self,
        x: f64,
        y: f64,
        width: f64,
        height: f64,
        angle: f64,
        mask: u32,
    ) -> String {
        serde_json::to_string(&self.inner.overlap_box([x, y], [width, height], angle, mask))
            .unwrap_or_else(
                /* 提供缺省或失败路径的空值：String :: from ("[]")。 */
                |_| String::from("[]"),
            )
    }

    // Flat scalar arguments keep the wasm-bindgen boundary allocation-free for hot queries.
    // 将矩形扫掠查询结果编码为 JSON。
    #[allow(clippy::too_many_arguments)]
    pub fn shape_cast_json(
        &self,
        x: f64,
        y: f64,
        width: f64,
        height: f64,
        angle: f64,
        direction_x: f64,
        direction_y: f64,
        distance: f64,
        mask: u32,
    ) -> String {
        serde_json::to_string(&self.inner.shape_cast(
            [x, y],
            [width, height],
            angle,
            [direction_x, direction_y],
            distance,
            mask,
        ))
        .unwrap_or_else(
            /* 提供缺省或失败路径的空值：String :: from ("null")。 */
            |_| String::from("null"),
        )
    }

    // 将角色移动与地面判定结果编码为 JSON。
    #[allow(clippy::too_many_arguments)]
    pub fn move_character_box_json(
        &mut self,
        handle: u32,
        width: f64,
        height: f64,
        displacement_x: f64,
        displacement_y: f64,
        max_slope_angle: f64,
        step_height: f64,
        floor_snap: f64,
        max_slides: u32,
        safe_margin: f64,
        mask: u32,
    ) -> String {
        match self.inner.move_character_box(
            handle,
            [width, height],
            [displacement_x, displacement_y],
            max_slope_angle,
            step_height,
            floor_snap,
            max_slides,
            safe_margin,
            mask,
        ) {
            Ok(result) => serde_json::to_string(&result).unwrap_or_else(
                /* 提供缺省或失败路径的空值：String :: from ("null")。 */
                |_| String::from("null"),
            ),
            Err(error) => serde_json::to_string(&serde_json::json!({ "error": error }))
                .unwrap_or_else(
                    /* 提供缺省或失败路径的空值：String :: from ("null")。 */
                    |_| String::from("null"),
                ),
        }
    }

    // 给指定刚体设置持续力和力矩。
    pub fn apply_force(&mut self, handle: u32, x: f64, y: f64, torque: f64) -> Result<(), JsValue> {
        self.inner
            .apply_force(handle, x, y, torque)
            .map_err(JsValue::from_str)
    }

    // 累加仅下一物理步生效的临时力与力矩。
    pub fn apply_transient_force(
        &mut self,
        handle: u32,
        x: f64,
        y: f64,
        torque: f64,
    ) -> Result<(), JsValue> {
        self.inner
            .apply_transient_force(handle, x, y, torque)
            .map_err(JsValue::from_str)
    }

    // 原子校验原点偏移，再同步当前、历史及求解缓存中的世界坐标。
    pub fn shift_origin(&mut self, x: f64, y: f64) -> Result<(), JsValue> {
        self.inner
            .physics_mut()
            .shift_origin(x, y)
            .map_err(JsValue::from_str)
    }

    // 通过物理世界更新目标刚体变换，并将错误转换到 JavaScript 边界。
    pub fn teleport_body(
        &mut self,
        handle: u32,
        x: f64,
        y: f64,
        angle: f64,
    ) -> Result<(), JsValue> {
        self.inner
            .physics_mut()
            .set_transform(handle, x, y, angle)
            .map_err(JsValue::from_str)
    }

    // 更新目标刚体速度并把失败信息转换为 JavaScript 错误。
    pub fn set_body_velocity(
        &mut self,
        handle: u32,
        x: f64,
        y: f64,
        angular: f64,
    ) -> Result<(), JsValue> {
        self.inner
            .physics_mut()
            .set_velocity(handle, x, y, angular)
            .map_err(JsValue::from_str)
    }

    // 清空运行状态及其关联缓存，供重新加载使用。
    pub fn clear(&mut self) {
        self.inner.clear();
    }

    // 规范并保存固定时间设置。
    pub fn set_timing(
        &mut self,
        tick_rate: f64,
        max_catch_up_steps: u32,
        time_scale: f64,
        paused: bool,
        dropped_time_policy: u8,
    ) {
        self.inner.set_timing(FixedTimeSettings {
            tick_rate,
            max_catch_up_steps,
            time_scale,
            paused,
            dropped_time_policy: match dropped_time_policy {
                1 => DroppedTimePolicy::PreserveBacklog,
                2 => DroppedTimePolicy::SlowMotion,
                _ => DroppedTimePolicy::Drop,
            },
        });
    }

    // 把独立的速度和位置迭代设置传给物理世界。
    pub fn set_physics_quality_iterations(
        &mut self,
        minimum_substeps: usize,
        velocity_iterations: usize,
        position_iterations: usize,
        sleep_linear_threshold: f64,
        sleep_angular_threshold: f64,
        time_to_sleep: f64,
    ) {
        self.inner.set_physics_quality_iterations(
            minimum_substeps,
            velocity_iterations,
            position_iterations,
            sleep_linear_threshold,
            sleep_angular_threshold,
            time_to_sleep,
        );
    }

    // 把物理质量、连续碰撞和休眠设置应用到物理世界。
    pub fn set_physics_quality(
        &mut self,
        minimum_substeps: usize,
        solver_iterations: usize,
        sleep_linear_threshold: f64,
        sleep_angular_threshold: f64,
        time_to_sleep: f64,
    ) {
        self.inner.set_physics_quality(
            minimum_substeps,
            solver_iterations,
            sleep_linear_threshold,
            sleep_angular_threshold,
            time_to_sleep,
        );
    }

    // 按渲染帧时间推进有界数量的固定物理步，并返回推进报告。
    pub fn advance(&mut self, frame_delta: f64, gravity: f64, air_friction: f64) -> u32 {
        self.inner.advance(frame_delta, gravity, air_friction).steps
    }

    // 累计帧时间，计算本帧固定步数及丢弃时间，供宿主在各步前调用脚本。
    pub fn prepare_advance(&mut self, frame_delta: f64) -> u32 {
        self.inner.prepare_advance(frame_delta).steps
    }

    // 执行一个固定物理步并同步时间计数与物理事件。
    pub fn advance_fixed_tick(&mut self, gravity: f64, air_friction: f64) {
        self.inner.advance_fixed_tick(gravity, air_friction);
    }

    // 结束分段帧推进，刷新插值和诊断结果。
    pub fn complete_advance(&mut self) {
        self.inner.complete_advance();
    }

    // 在暂停状态也允许明确执行单个固定物理步。
    pub fn single_step(&mut self, gravity: f64, air_friction: f64) {
        self.inner.single_step(gravity, air_friction);
    }

    // 返回当前渲染帧在相邻物理状态之间的插值比例。
    pub fn interpolation_alpha(&self) -> f64 {
        self.inner.diagnostics().interpolation_alpha
    }
    // 返回刚体状态所占的扁平元素数量。
    pub fn body_state_len(&self) -> usize {
        self.inner.physics().body_state_len()
    }
    // 返回当前物理状态缓冲区所需的元素总数。
    pub fn state_len(&self) -> usize {
        self.inner.physics().state().len()
    }

    // 将当前模拟状态复制到调用方提供的输出缓冲区。
    pub fn copy_state(&self, target: &mut [f64]) -> usize {
        let state = self.inner.physics().state();
        let length = state.len().min(target.len());
        target[..length].copy_from_slice(&state[..length]);
        length
    }

    // 将上一物理步的刚体状态复制到调用方缓冲区。
    pub fn copy_previous_body_state(&self, target: &mut [f64]) -> usize {
        let state = self.inner.physics().previous_body_state();
        let length = state.len().min(target.len());
        target[..length].copy_from_slice(&state[..length]);
        length
    }

    // 对物理状态生成可重现校验值，用于回放一致性检查。
    pub fn state_checksum(&self) -> String {
        format!("{:016x}", self.inner.physics().state_checksum())
    }

    // 把运行时诊断快照序列化为 JSON。
    pub fn diagnostics_json(&self) -> String {
        serde_json::to_string(&self.inner.diagnostics()).unwrap_or_else(
            /* 提供缺省或失败路径的空值：String :: from ("{}")。 */
            |_| String::from("{}"),
        )
    }

    // 把运行时间和帧计数序列化为 JSON。
    pub fn time_json(&self) -> String {
        serde_json::to_string(&self.inner.time()).unwrap_or_else(
            /* 提供缺省或失败路径的空值：String :: from ("{}")。 */
            |_| String::from("{}"),
        )
    }

    // 取出并清空运行时事件，以 JSON 返回给浏览器。
    pub fn drain_events_json(&mut self) -> String {
        serde_json::to_string(&self.inner.drain_events()).unwrap_or_else(
            /* 提供缺省或失败路径的空值：String :: from ("[]")。 */
            |_| String::from("[]"),
        )
    }
}

impl Default for WasmRuntimeWorld {
    // 通过统一构造入口创建默认 WebAssembly 运行世界。
    fn default() -> Self {
        Self::new()
    }
}

/// Rhai is kept behind the same WASM boundary as the runtime. The JavaScript
/// host exchanges JSON snapshots and validated commands, never Rust pointers.
#[wasm_bindgen]
pub struct WasmScriptRuntime {
    inner: ScriptRuntime,
}

#[wasm_bindgen]
impl WasmScriptRuntime {
    // 创建浏览器脚本沙箱的编译缓存包装器。
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inner: ScriptRuntime::new(),
        }
    }

    // 创建共享不可变编译程序的脚本缓存候选副本。
    /// Share immutable compiled programs while isolating candidate cache replacements.
    pub fn fork(&self) -> Self {
        Self {
            inner: self.inner.clone(),
        }
    }

    // 编译并校验脚本，返回可编辑导出属性或错误。
    pub fn validate(&self, source: &str) -> Result<String, JsValue> {
        let exports = self.inner.validate(source).map_err(
            /* 把错误消息转换为 JavaScript 可接收的异常值。 */
            |error| JsValue::from_str(&error),
        )?;
        serde_json::to_string(&exports).map_err(
            /* 把错误消息转换为 JavaScript 可接收的异常值。 */
            |error| JsValue::from_str(&error.to_string()),
        )
    }

    // 解析宿主上下文，执行脚本回调并序列化结果。
    pub fn execute_json(
        &self,
        source: &str,
        function: &str,
        context_json: &str,
    ) -> Result<String, JsValue> {
        let context: ScriptContext = serde_json::from_str(context_json).map_err(
            /* 把错误消息转换为 JavaScript 可接收的异常值。 */
            |error| JsValue::from_str(&format!("invalid script context: {error}")),
        )?;
        let result = self.inner.execute(source, function, context).map_err(
            /* 把错误消息转换为 JavaScript 可接收的异常值。 */
            |error| JsValue::from_str(&error),
        )?;
        serde_json::to_string(&result).map_err(
            /* 把错误消息转换为 JavaScript 可接收的异常值。 */
            |error| JsValue::from_str(&error.to_string()),
        )
    }

    // 编译或更新指定脚本缓存，并返回导出属性描述。
    /// Atomically replaces the cached program only after successful compile.
    pub fn compile_cached(&mut self, script_id: &str, source: &str) -> Result<String, JsValue> {
        let exports = self.inner.upsert(script_id, source).map_err(
            /* 把错误消息转换为 JavaScript 可接收的异常值。 */
            |error| JsValue::from_str(&error),
        )?;
        serde_json::to_string(&exports).map_err(
            /* 把错误消息转换为 JavaScript 可接收的异常值。 */
            |error| JsValue::from_str(&error.to_string()),
        )
    }

    // 解析上下文后执行缓存中的脚本，将输出转换为 JSON。
    pub fn execute_cached_json(
        &self,
        script_id: &str,
        function: &str,
        context_json: &str,
    ) -> Result<String, JsValue> {
        let context: ScriptContext = serde_json::from_str(context_json).map_err(
            /* 把错误消息转换为 JavaScript 可接收的异常值。 */
            |error| JsValue::from_str(&format!("invalid script context: {error}")),
        )?;
        let result = self
            .inner
            .execute_cached(script_id, function, context)
            .map_err(
                /* 把错误消息转换为 JavaScript 可接收的异常值。 */
                |error| JsValue::from_str(&error),
            )?;
        serde_json::to_string(&result).map_err(
            /* 把错误消息转换为 JavaScript 可接收的异常值。 */
            |error| JsValue::from_str(&error.to_string()),
        )
    }

    // 移除指定脚本编译缓存并返回是否存在。
    pub fn remove_cached(&mut self, script_id: &str) -> bool {
        self.inner.remove(script_id)
    }
}

impl Default for WasmScriptRuntime {
    // 通过统一构造入口创建默认 WebAssembly 脚本运行时。
    fn default() -> Self {
        Self::new()
    }
}

// 在 WebAssembly 边界调用工程迁移，并转换错误类型。
#[wasm_bindgen]
pub fn migrate_project_json(source: &str) -> Result<String, JsValue> {
    nova_format::migrate_project_str(source).map_err(
        /* 把错误消息转换为 JavaScript 可接收的异常值。 */
        |error| JsValue::from_str(&error.to_string()),
    )
}

// 返回当前工程格式版本号。
#[wasm_bindgen]
pub fn current_format_version() -> u32 {
    nova_format::CURRENT_FORMAT_VERSION
}

// 返回当前引擎版本字符串。
#[wasm_bindgen]
pub fn engine_version() -> String {
    nova_format::CURRENT_ENGINE_VERSION.into()
}

// Compatibility exports for third-party callers during the 1.2 transition.
// 通过兼容接口推进不含外部连接记录的物理数据。
#[wasm_bindgen]
pub fn step_physics(input: &[f64], dt: f64, global_gravity: f64, air_friction: f64) -> Vec<f64> {
    nova_physics::step_physics(input, dt, global_gravity, air_friction)
}

// 通过兼容接口同时推进刚体和连接记录。
#[wasm_bindgen]
pub fn step_physics_with_connections(
    input: &[f64],
    connections: &[f64],
    dt: f64,
    global_gravity: f64,
    air_friction: f64,
) -> Vec<f64> {
    nova_physics::step_physics_with_connections(
        input,
        connections,
        dt,
        global_gravity,
        air_friction,
    )
}

#[cfg(test)]
mod tests {
    use nova_runtime::EngineEvent;

    // 验证运行时事件 JSON 与前端接触和关节字段约定一致。
    #[test]
    fn runtime_event_json_matches_frontend_contact_and_joint_fields() {
        let event = EngineEvent::CollisionStarted {
            first: 1,
            second: 2,
            first_collider: 3,
            second_collider: 4,
            point: [0.0, 1.0],
            normal: [1.0, 0.0],
            relative_velocity: [2.0, 3.0],
            initial_relative_velocity: [4.0, 5.0],
            normal_impulse: 6.0,
            tangent_impulse: 7.0,
            normal_force: 8.0,
            tangent_force: 9.0,
            penetration: 0.25,
        };
        let json = serde_json::to_value(event).unwrap();
        assert_eq!(json["type"], "collisionStarted");
        assert_eq!(json["firstCollider"], 3);
        assert_eq!(json["secondCollider"], 4);
        assert_eq!(json["relativeVelocity"], serde_json::json!([2.0, 3.0]));
        assert_eq!(
            json["initialRelativeVelocity"],
            serde_json::json!([4.0, 5.0])
        );
        assert_eq!(json["normalImpulse"], 6.0);
        assert_eq!(json["tangentImpulse"], 7.0);
        assert_eq!(json["normalForce"], 8.0);
        assert_eq!(json["tangentForce"], 9.0);
        let joint = serde_json::to_value(EngineEvent::JointBroken {
            handle: 1,
            joint_kind: 2,
            link: 3,
            tension: 4.0,
            strain: 5.0,
        })
        .unwrap();
        assert_eq!(joint["jointKind"], 2);
    }
}
