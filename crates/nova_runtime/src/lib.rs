//! Runtime orchestration independent of the editor and host platform.

use std::collections::VecDeque;

use nova_math::finite_or;
use nova_physics::{PhysicsEvent, PhysicsWorld};
use serde::Serialize;

pub const DEFAULT_TICK_RATE: f64 = 60.0;
pub const DEFAULT_MAX_CATCH_UP_STEPS: u32 = 8;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct FixedTimeSettings {
    pub tick_rate: f64,
    pub max_catch_up_steps: u32,
    pub time_scale: f64,
    pub paused: bool,
}

impl Default for FixedTimeSettings {
    fn default() -> Self {
        Self {
            tick_rate: DEFAULT_TICK_RATE,
            max_catch_up_steps: DEFAULT_MAX_CATCH_UP_STEPS,
            time_scale: 1.0,
            paused: true,
        }
    }
}

impl FixedTimeSettings {
    pub fn normalized(mut self) -> Self {
        self.tick_rate = finite_or(self.tick_rate, DEFAULT_TICK_RATE).clamp(1.0, 1_000.0);
        self.max_catch_up_steps = self.max_catch_up_steps.clamp(1, 240);
        self.time_scale = finite_or(self.time_scale, 1.0).clamp(0.0, 100.0);
        self
    }

    pub fn fixed_delta(self) -> f64 {
        1.0 / self.normalized().tick_rate
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct StepReport {
    pub steps: u32,
    pub interpolation_alpha: f64,
    pub dropped_seconds: f64,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineDiagnostics {
    pub body_count: usize,
    pub connection_count: usize,
    pub steps_last_frame: u32,
    pub total_physics_steps: u64,
    pub interpolation_alpha: f64,
    pub dropped_seconds: f64,
    pub event_count: usize,
    pub configuration_rebuilds: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum EngineEvent {
    CollisionStarted {
        handle: u32,
    },
    CollisionEnded {
        handle: u32,
    },
    TriggerEntered {
        first: u32,
        second: u32,
    },
    TriggerExited {
        first: u32,
        second: u32,
    },
    EntityCreated {
        handle: u32,
    },
    EntityDestroyed {
        handle: u32,
    },
    SceneLoaded {
        uuid: String,
    },
    SceneUnloaded {
        uuid: String,
    },
    AssetReloaded {
        uuid: String,
    },
    AnimationEvent {
        entity: String,
        name: String,
    },
    ScriptError {
        entity: Option<String>,
        message: String,
    },
}

#[derive(Default)]
pub struct EventBus {
    events: VecDeque<EngineEvent>,
}

impl EventBus {
    pub fn publish(&mut self, event: EngineEvent) {
        self.events.push_back(event);
    }
    pub fn len(&self) -> usize {
        self.events.len()
    }
    pub fn is_empty(&self) -> bool {
        self.events.is_empty()
    }
    pub fn drain(&mut self) -> Vec<EngineEvent> {
        self.events.drain(..).collect()
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct RuntimeEntity {
    pub uuid: String,
    pub handle: u32,
    pub enabled: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct RuntimeScene {
    pub uuid: String,
    pub name: String,
    pub loaded: bool,
}

/// Host-independent runtime skeleton. Later releases add components, input,
/// scripting, animation, and audio without changing this timing contract.
pub struct RuntimeWorld {
    physics: PhysicsWorld,
    timing: FixedTimeSettings,
    accumulator: f64,
    diagnostics: EngineDiagnostics,
    events: EventBus,
}

impl Default for RuntimeWorld {
    fn default() -> Self {
        Self::new()
    }
}

impl RuntimeWorld {
    pub fn new() -> Self {
        Self {
            physics: PhysicsWorld::new(),
            timing: FixedTimeSettings::default(),
            accumulator: 0.0,
            diagnostics: EngineDiagnostics::default(),
            events: EventBus::default(),
        }
    }

    pub fn physics(&self) -> &PhysicsWorld {
        &self.physics
    }
    pub fn physics_mut(&mut self) -> &mut PhysicsWorld {
        &mut self.physics
    }
    pub fn timing(&self) -> FixedTimeSettings {
        self.timing
    }

    pub fn set_timing(&mut self, settings: FixedTimeSettings) {
        let settings = settings.normalized();
        if (settings.tick_rate - self.timing.tick_rate).abs() > f64::EPSILON {
            self.accumulator = 0.0;
        }
        self.timing = settings;
    }

    pub fn set_paused(&mut self, paused: bool) {
        self.timing.paused = paused;
    }

    pub fn upsert_body(
        &mut self,
        handle: u32,
        order: u32,
        record: &[f64],
    ) -> Result<bool, &'static str> {
        let changed = self.physics.upsert_body(handle, order, record)?;
        self.forward_physics_events();
        Ok(changed)
    }

    pub fn destroy_body(&mut self, handle: u32) -> bool {
        let removed = self.physics.destroy_body(handle);
        self.forward_physics_events();
        removed
    }

    pub fn upsert_connection(
        &mut self,
        handle: u32,
        order: u32,
        record: &[f64],
    ) -> Result<bool, &'static str> {
        self.physics.upsert_connection(handle, order, record)
    }

    pub fn destroy_connection(&mut self, handle: u32) -> bool {
        self.physics.destroy_connection(handle)
    }

    pub fn advance(
        &mut self,
        frame_delta: f64,
        global_gravity: f64,
        air_friction: f64,
    ) -> StepReport {
        let settings = self.timing.normalized();
        let fixed_delta = settings.fixed_delta();
        let frame_delta = finite_or(frame_delta, 0.0).clamp(0.0, 0.25);
        let mut report = StepReport::default();
        if !settings.paused && settings.time_scale > 0.0 {
            self.accumulator += frame_delta * settings.time_scale;
            while self.accumulator + f64::EPSILON >= fixed_delta
                && report.steps < settings.max_catch_up_steps
            {
                self.physics.step(fixed_delta, global_gravity, air_friction);
                self.accumulator = (self.accumulator - fixed_delta).max(0.0);
                report.steps += 1;
                self.diagnostics.total_physics_steps =
                    self.diagnostics.total_physics_steps.saturating_add(1);
                self.forward_physics_events();
            }
            if self.accumulator >= fixed_delta {
                let retained = self.accumulator % fixed_delta;
                report.dropped_seconds = self.accumulator - retained;
                self.accumulator = retained;
            }
        }
        report.interpolation_alpha = (self.accumulator / fixed_delta).clamp(0.0, 1.0);
        self.refresh_diagnostics(report);
        report
    }

    pub fn single_step(&mut self, global_gravity: f64, air_friction: f64) -> StepReport {
        let fixed_delta = self.timing.fixed_delta();
        self.physics.step(fixed_delta, global_gravity, air_friction);
        self.diagnostics.total_physics_steps =
            self.diagnostics.total_physics_steps.saturating_add(1);
        self.forward_physics_events();
        let report = StepReport {
            steps: 1,
            interpolation_alpha: 1.0,
            dropped_seconds: 0.0,
        };
        self.refresh_diagnostics(report);
        report
    }

    pub fn diagnostics(&self) -> EngineDiagnostics {
        self.diagnostics
    }
    pub fn events(&self) -> &EventBus {
        &self.events
    }
    pub fn drain_events(&mut self) -> Vec<EngineEvent> {
        self.events.drain()
    }

    pub fn clear(&mut self) {
        self.physics.clear();
        self.accumulator = 0.0;
        self.forward_physics_events();
        self.refresh_diagnostics(StepReport::default());
    }

    fn forward_physics_events(&mut self) {
        for event in self.physics.drain_events() {
            let event = match event {
                PhysicsEvent::BodyCreated { handle } => EngineEvent::EntityCreated { handle },
                PhysicsEvent::BodyDestroyed { handle } => EngineEvent::EntityDestroyed { handle },
                PhysicsEvent::ContactStarted { handle } => EngineEvent::CollisionStarted { handle },
                PhysicsEvent::ContactEnded { handle } => EngineEvent::CollisionEnded { handle },
            };
            self.events.publish(event);
        }
    }

    fn refresh_diagnostics(&mut self, report: StepReport) {
        self.diagnostics.body_count = self.physics.body_count();
        self.diagnostics.connection_count = self.physics.connection_count();
        self.diagnostics.steps_last_frame = report.steps;
        self.diagnostics.interpolation_alpha = report.interpolation_alpha;
        self.diagnostics.dropped_seconds += report.dropped_seconds;
        self.diagnostics.event_count = self.events.len();
        self.diagnostics.configuration_rebuilds = self.physics.configuration_rebuilds();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use nova_physics::STRIDE;

    fn moving_body() -> Vec<f64> {
        let mut body = vec![0.0; STRIDE];
        body[0] = 1.0;
        body[8] = 1.0;
        body[12] = 1.0;
        body[13] = 1.0;
        body[17] = 1.0;
        body[25] = 1.0;
        body[26] = 1.0;
        body[4] = 10.0;
        body
    }

    fn simulate(render_rate: f64) -> f64 {
        let mut runtime = RuntimeWorld::new();
        runtime
            .physics_mut()
            .upsert_body(1, 0, &moving_body())
            .unwrap();
        runtime.set_timing(FixedTimeSettings {
            paused: false,
            ..FixedTimeSettings::default()
        });
        for _ in 0..render_rate as usize {
            runtime.advance(1.0 / render_rate, 0.0, 0.0);
        }
        runtime.physics().state()[2]
    }

    #[test]
    fn physics_is_independent_of_render_refresh_rate() {
        let expected = simulate(60.0);
        for rate in [30.0, 144.0, 240.0] {
            assert!((simulate(rate) - expected).abs() < 1.0e-9, "rate={rate}");
        }
    }

    #[test]
    fn paused_runtime_only_moves_on_single_step() {
        let mut runtime = RuntimeWorld::new();
        runtime
            .physics_mut()
            .upsert_body(1, 0, &moving_body())
            .unwrap();
        runtime.advance(1.0, 0.0, 0.0);
        assert!(runtime.physics().state().is_empty());
        runtime.single_step(0.0, 0.0);
        assert!(runtime.physics().state()[2] > 0.0);
    }
}
