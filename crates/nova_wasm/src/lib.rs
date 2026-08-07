//! The only `wasm_bindgen` boundary in the Nova_A workspace.

use nova_runtime::{FixedTimeSettings, RuntimeWorld};
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

    pub fn diagnostics_json(&self) -> String {
        serde_json::to_string(&self.inner.diagnostics()).unwrap_or_else(|_| String::from("{}"))
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
