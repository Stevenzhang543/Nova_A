//! The only `wasm_bindgen` boundary in the Nova_A workspace.

use nova_runtime::{FixedTimeSettings, RuntimeWorld};
use nova_script::{ScriptContext, ScriptRuntime};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct WasmRuntimeWorld {
    inner: RuntimeWorld,
}

#[wasm_bindgen]
impl WasmRuntimeWorld {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inner: RuntimeWorld::new(),
        }
    }

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

    pub fn destroy_body(&mut self, handle: u32) -> bool {
        self.inner.destroy_body(handle)
    }

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

    pub fn destroy_connection(&mut self, handle: u32) -> bool {
        self.inner.destroy_connection(handle)
    }

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
        .unwrap_or_else(|_| String::from("null"))
    }

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
        .unwrap_or_else(|_| String::from("[]"))
    }

    pub fn overlap_point_json(&self, x: f64, y: f64, mask: u32) -> String {
        serde_json::to_string(&self.inner.overlap_point([x, y], mask))
            .unwrap_or_else(|_| String::from("[]"))
    }

    pub fn overlap_circle_json(&self, x: f64, y: f64, radius: f64, mask: u32) -> String {
        serde_json::to_string(&self.inner.overlap_circle([x, y], radius, mask))
            .unwrap_or_else(|_| String::from("[]"))
    }

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
            .unwrap_or_else(|_| String::from("[]"))
    }

    // Flat scalar arguments keep the wasm-bindgen boundary allocation-free for hot queries.
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
        .unwrap_or_else(|_| String::from("null"))
    }

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
            Ok(result) => serde_json::to_string(&result).unwrap_or_else(|_| String::from("null")),
            Err(error) => serde_json::to_string(&serde_json::json!({ "error": error }))
                .unwrap_or_else(|_| String::from("null")),
        }
    }

    pub fn apply_force(&mut self, handle: u32, x: f64, y: f64, torque: f64) -> Result<(), JsValue> {
        self.inner
            .apply_force(handle, x, y, torque)
            .map_err(JsValue::from_str)
    }

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

    pub fn clear(&mut self) {
        self.inner.clear();
    }

    pub fn set_timing(
        &mut self,
        tick_rate: f64,
        max_catch_up_steps: u32,
        time_scale: f64,
        paused: bool,
    ) {
        self.inner.set_timing(FixedTimeSettings {
            tick_rate,
            max_catch_up_steps,
            time_scale,
            paused,
        });
    }

    pub fn advance(&mut self, frame_delta: f64, gravity: f64, air_friction: f64) -> u32 {
        self.inner.advance(frame_delta, gravity, air_friction).steps
    }

    pub fn prepare_advance(&mut self, frame_delta: f64) -> u32 {
        self.inner.prepare_advance(frame_delta).steps
    }

    pub fn advance_fixed_tick(&mut self, gravity: f64, air_friction: f64) {
        self.inner.advance_fixed_tick(gravity, air_friction);
    }

    pub fn complete_advance(&mut self) {
        self.inner.complete_advance();
    }

    pub fn single_step(&mut self, gravity: f64, air_friction: f64) {
        self.inner.single_step(gravity, air_friction);
    }

    pub fn interpolation_alpha(&self) -> f64 {
        self.inner.diagnostics().interpolation_alpha
    }
    pub fn body_state_len(&self) -> usize {
        self.inner.physics().body_state_len()
    }
    pub fn state_len(&self) -> usize {
        self.inner.physics().state().len()
    }

    pub fn copy_state(&self, target: &mut [f64]) -> usize {
        let state = self.inner.physics().state();
        let length = state.len().min(target.len());
        target[..length].copy_from_slice(&state[..length]);
        length
    }

    pub fn copy_previous_body_state(&self, target: &mut [f64]) -> usize {
        let state = self.inner.physics().previous_body_state();
        let length = state.len().min(target.len());
        target[..length].copy_from_slice(&state[..length]);
        length
    }

    pub fn state_checksum(&self) -> String {
        format!("{:016x}", self.inner.physics().state_checksum())
    }

    pub fn diagnostics_json(&self) -> String {
        serde_json::to_string(&self.inner.diagnostics()).unwrap_or_else(|_| String::from("{}"))
    }

    pub fn time_json(&self) -> String {
        serde_json::to_string(&self.inner.time()).unwrap_or_else(|_| String::from("{}"))
    }

    pub fn drain_events_json(&mut self) -> String {
        serde_json::to_string(&self.inner.drain_events()).unwrap_or_else(|_| String::from("[]"))
    }
}

impl Default for WasmRuntimeWorld {
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
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inner: ScriptRuntime::new(),
        }
    }

    pub fn validate(&self, source: &str) -> Result<String, JsValue> {
        let exports = self
            .inner
            .validate(source)
            .map_err(|error| JsValue::from_str(&error))?;
        serde_json::to_string(&exports).map_err(|error| JsValue::from_str(&error.to_string()))
    }

    pub fn execute_json(
        &self,
        source: &str,
        function: &str,
        context_json: &str,
    ) -> Result<String, JsValue> {
        let context: ScriptContext = serde_json::from_str(context_json)
            .map_err(|error| JsValue::from_str(&format!("invalid script context: {error}")))?;
        let result = self
            .inner
            .execute(source, function, context)
            .map_err(|error| JsValue::from_str(&error))?;
        serde_json::to_string(&result).map_err(|error| JsValue::from_str(&error.to_string()))
    }

    /// Atomically replaces the cached program only after successful compile.
    pub fn compile_cached(&mut self, script_id: &str, source: &str) -> Result<String, JsValue> {
        let exports = self
            .inner
            .upsert(script_id, source)
            .map_err(|error| JsValue::from_str(&error))?;
        serde_json::to_string(&exports).map_err(|error| JsValue::from_str(&error.to_string()))
    }

    pub fn execute_cached_json(
        &self,
        script_id: &str,
        function: &str,
        context_json: &str,
    ) -> Result<String, JsValue> {
        let context: ScriptContext = serde_json::from_str(context_json)
            .map_err(|error| JsValue::from_str(&format!("invalid script context: {error}")))?;
        let result = self
            .inner
            .execute_cached(script_id, function, context)
            .map_err(|error| JsValue::from_str(&error))?;
        serde_json::to_string(&result).map_err(|error| JsValue::from_str(&error.to_string()))
    }

    pub fn remove_cached(&mut self, script_id: &str) -> bool {
        self.inner.remove(script_id)
    }
}

impl Default for WasmScriptRuntime {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen]
pub fn migrate_project_json(source: &str) -> Result<String, JsValue> {
    nova_format::migrate_project_str(source).map_err(|error| JsValue::from_str(&error.to_string()))
}

#[wasm_bindgen]
pub fn current_format_version() -> u32 {
    nova_format::CURRENT_FORMAT_VERSION
}

#[wasm_bindgen]
pub fn engine_version() -> String {
    nova_format::CURRENT_ENGINE_VERSION.into()
}

// Compatibility exports for third-party callers during the 1.2 transition.
#[wasm_bindgen]
pub fn step_physics(input: &[f64], dt: f64, global_gravity: f64, air_friction: f64) -> Vec<f64> {
    nova_physics::step_physics(input, dt, global_gravity, air_friction)
}

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
