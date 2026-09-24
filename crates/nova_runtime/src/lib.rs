// 平台无关运行时：场景与组件管理、固定时间推进、物理事件和诊断。
//! Runtime orchestration independent of the editor and host platform.

use std::collections::{HashMap, VecDeque};

use nova_math::finite_or;
use nova_physics::{CharacterMoveResult, PhysicsEvent, PhysicsQueryHit, PhysicsWorld};
use serde::Serialize;

pub const DEFAULT_TICK_RATE: f64 = 60.0;
pub const DEFAULT_MAX_CATCH_UP_STEPS: u32 = 8;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum DroppedTimePolicy {
    #[default]
    Drop,
    PreserveBacklog,
    SlowMotion,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct FixedTimeSettings {
    pub tick_rate: f64,
    pub max_catch_up_steps: u32,
    pub time_scale: f64,
    pub paused: bool,
    pub dropped_time_policy: DroppedTimePolicy,
}

impl Default for FixedTimeSettings {
    // 建立默认固定频率、追帧上限、暂停状态和丢帧策略。
    fn default() -> Self {
        Self {
            tick_rate: DEFAULT_TICK_RATE,
            max_catch_up_steps: DEFAULT_MAX_CATCH_UP_STEPS,
            time_scale: 1.0,
            paused: true,
            dropped_time_policy: DroppedTimePolicy::Drop,
        }
    }
}

impl FixedTimeSettings {
    // 规范固定频率、追帧步数及时间倍率，替换非有限输入。
    pub fn normalized(mut self) -> Self {
        self.tick_rate = finite_or(self.tick_rate, DEFAULT_TICK_RATE).clamp(1.0, 1_000.0);
        self.max_catch_up_steps = self.max_catch_up_steps.clamp(1, 240);
        self.time_scale = finite_or(self.time_scale, 1.0).clamp(0.0, 100.0);
        self
    }

    // 根据规范化固定频率返回单次物理步长。
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
pub struct EngineTime {
    pub delta: f64,
    pub fixed_delta: f64,
    pub elapsed: f64,
    pub scale: f64,
    pub frame: u64,
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
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum EngineEvent {
    CollisionStarted {
        first: u32,
        second: u32,
        first_collider: u32,
        second_collider: u32,
        point: [f64; 2],
        normal: [f64; 2],
        relative_velocity: [f64; 2],
        initial_relative_velocity: [f64; 2],
        normal_impulse: f64,
        tangent_impulse: f64,
        normal_force: f64,
        tangent_force: f64,
        penetration: f64,
    },
    CollisionStayed {
        first: u32,
        second: u32,
        first_collider: u32,
        second_collider: u32,
        point: [f64; 2],
        normal: [f64; 2],
        relative_velocity: [f64; 2],
        initial_relative_velocity: [f64; 2],
        normal_impulse: f64,
        tangent_impulse: f64,
        normal_force: f64,
        tangent_force: f64,
        penetration: f64,
    },
    CollisionEnded {
        first: u32,
        second: u32,
        first_collider: u32,
        second_collider: u32,
        point: [f64; 2],
        normal: [f64; 2],
        relative_velocity: [f64; 2],
        initial_relative_velocity: [f64; 2],
        normal_impulse: f64,
        tangent_impulse: f64,
        normal_force: f64,
        tangent_force: f64,
    },
    TriggerEntered {
        first: u32,
        second: u32,
        first_collider: u32,
        second_collider: u32,
        point: [f64; 2],
        normal: [f64; 2],
        relative_velocity: [f64; 2],
    },
    TriggerStayed {
        first: u32,
        second: u32,
        first_collider: u32,
        second_collider: u32,
        point: [f64; 2],
        normal: [f64; 2],
        relative_velocity: [f64; 2],
    },
    TriggerExited {
        first: u32,
        second: u32,
        first_collider: u32,
        second_collider: u32,
        point: [f64; 2],
        normal: [f64; 2],
        relative_velocity: [f64; 2],
    },
    EntityCreated {
        handle: u32,
    },
    EntityDestroyed {
        handle: u32,
    },
    BodySleeping {
        handle: u32,
    },
    BodyWoke {
        handle: u32,
    },
    JointBroken {
        handle: u32,
        joint_kind: u8,
        link: i32,
        tension: f64,
        strain: f64,
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
    // 将引擎事件追加到待处理队列。
    pub fn publish(&mut self, event: EngineEvent) {
        self.events.push_back(event);
    }
    // 返回事件队列当前长度。
    pub fn len(&self) -> usize {
        self.events.len()
    }
    // 判断事件队列是否为空。
    pub fn is_empty(&self) -> bool {
        self.events.is_empty()
    }
    // 取出事件队列的全部内容并清空队列。
    pub fn drain(&mut self) -> Vec<EngineEvent> {
        self.events.drain(..).collect()
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum ComponentKind {
    Transform2D,
    ShapeRenderer2D,
    SpriteRenderer2D,
    TextRenderer2D,
    Camera2D,
    Script2D,
    RigidBody2D,
    BoxCollider2D,
    EllipseCollider2D,
    PolygonCollider2D,
    FixedJoint2D,
    Rope2D,
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct RuntimeComponent {
    pub uuid: String,
    pub kind: ComponentKind,
    pub enabled: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RuntimeEntity {
    pub uuid: String,
    pub handle: u32,
    pub enabled: bool,
    pub parent_uuid: Option<String>,
    pub components: Vec<RuntimeComponent>,
}

impl RuntimeEntity {
    // 按组件类型查询运行时实体上的组件。
    pub fn component(&self, kind: ComponentKind) -> Option<&RuntimeComponent> {
        self.components.iter().find(
            /* 判断 component . kind == kind 是否成立，供过滤或有效性检查使用。 */
            |component| component.kind == kind,
        )
    }

    // 按组件类型插入或替换实体组件。
    pub fn upsert_component(&mut self, component: RuntimeComponent) {
        if let Some(existing) = self.components.iter_mut().find(
            /* 判断 existing . kind == component . kind 是否成立，供过滤或有效性检查使用。 */
            |existing| existing.kind == component.kind,
        ) {
            *existing = component;
        } else {
            self.components.push(component);
        }
    }

    // 移除指定组件，同时保护必须存在的变换组件。
    pub fn remove_component(&mut self, kind: ComponentKind) -> bool {
        if kind == ComponentKind::Transform2D {
            return false;
        }
        let length = self.components.len();
        self.components.retain(
            /* 判断 component . kind != kind 是否成立，供过滤或有效性检查使用。 */
            |component| component.kind != kind,
        );
        self.components.len() != length
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct RuntimeScene {
    pub uuid: String,
    pub name: String,
    pub loaded: bool,
}

#[derive(Default)]
pub struct RuntimeSceneManager {
    scenes: HashMap<String, RuntimeScene>,
    active_scene_uuid: Option<String>,
}

impl RuntimeSceneManager {
    // 访问已加载场景集合。
    pub fn scenes(&self) -> impl Iterator<Item = &RuntimeScene> {
        self.scenes.values()
    }

    // 返回当前活动场景，不存在时返回空值。
    pub fn active_scene(&self) -> Option<&RuntimeScene> {
        self.active_scene_uuid.as_ref().and_then(
            /* 按 self . scenes . get (uuid) 读取或转换可选值，保留转换失败分支。 */
            |uuid| self.scenes.get(uuid),
        )
    }

    // 装载场景并维护活动场景选择。
    pub fn load(&mut self, mut scene: RuntimeScene) -> bool {
        scene.loaded = true;
        let uuid = scene.uuid.clone();
        let inserted = self.scenes.insert(uuid.clone(), scene).is_none();
        if self.active_scene_uuid.is_none() {
            self.active_scene_uuid = Some(uuid);
        }
        inserted
    }

    // 移除指定场景，并更新可能失效的活动场景引用。
    pub fn unload(&mut self, uuid: &str) -> bool {
        let Some(scene) = self.scenes.get_mut(uuid) else {
            return false;
        };
        if self.active_scene_uuid.as_deref() == Some(uuid) {
            return false;
        }
        scene.loaded = false;
        true
    }

    // 根据保留的场景源重新装载指定场景。
    pub fn reload(&mut self, uuid: &str) -> bool {
        let Some(scene) = self.scenes.get_mut(uuid) else {
            return false;
        };
        scene.loaded = true;
        true
    }

    // 仅在目标场景存在时切换活动场景。
    pub fn set_active(&mut self, uuid: &str) -> bool {
        let Some(scene) = self.scenes.get_mut(uuid) else {
            return false;
        };
        scene.loaded = true;
        self.active_scene_uuid = Some(uuid.to_owned());
        true
    }
}

/// Host-independent runtime skeleton. Later releases add components, input,
/// scripting, animation, and audio without changing this timing contract.
pub struct RuntimeWorld {
    physics: PhysicsWorld,
    timing: FixedTimeSettings,
    accumulator: f64,
    diagnostics: EngineDiagnostics,
    events: EventBus,
    scenes: RuntimeSceneManager,
    time: EngineTime,
    prepared_report: Option<StepReport>,
}

impl Default for RuntimeWorld {
    // 通过统一构造入口创建默认运行时，保持初始化逻辑一致。
    fn default() -> Self {
        Self::new()
    }
}

impl RuntimeWorld {
    // 创建物理、场景、时间累加器、事件总线和诊断均已初始化的运行时。
    pub fn new() -> Self {
        Self {
            physics: PhysicsWorld::new(),
            timing: FixedTimeSettings::default(),
            accumulator: 0.0,
            diagnostics: EngineDiagnostics::default(),
            events: EventBus::default(),
            scenes: RuntimeSceneManager::default(),
            time: EngineTime::default(),
            prepared_report: None,
        }
    }

    // 借用运行时持有的物理世界。
    pub fn physics(&self) -> &PhysicsWorld {
        &self.physics
    }
    // 取得运行时物理世界的可变引用。
    pub fn physics_mut(&mut self) -> &mut PhysicsWorld {
        &mut self.physics
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
        self.physics.set_quality_iterations(
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
        self.physics.set_quality(
            minimum_substeps,
            solver_iterations,
            sleep_linear_threshold,
            sleep_angular_threshold,
            time_to_sleep,
        );
    }
    // 返回当前固定时间设置。
    pub fn timing(&self) -> FixedTimeSettings {
        self.timing
    }

    // 返回当前运行时间、帧和物理步计数。
    pub fn time(&self) -> EngineTime {
        self.time
    }

    // 访问已加载场景集合。
    pub fn scenes(&self) -> &RuntimeSceneManager {
        &self.scenes
    }

    // 装载场景并记录对应的引擎生命周期事件。
    pub fn load_scene(&mut self, scene: RuntimeScene) -> bool {
        let uuid = scene.uuid.clone();
        let inserted = self.scenes.load(scene);
        self.events.publish(EngineEvent::SceneLoaded { uuid });
        inserted
    }

    // 卸载场景并同步运行时与生命周期事件。
    pub fn unload_scene(&mut self, uuid: &str) -> bool {
        if !self.scenes.unload(uuid) {
            return false;
        }
        self.events.publish(EngineEvent::SceneUnloaded {
            uuid: uuid.to_owned(),
        });
        true
    }

    // 重载指定场景并生成相应运行时事件。
    pub fn reload_scene(&mut self, uuid: &str) -> bool {
        if !self.scenes.reload(uuid) {
            return false;
        }
        self.events.publish(EngineEvent::SceneUnloaded {
            uuid: uuid.to_owned(),
        });
        self.events.publish(EngineEvent::SceneLoaded {
            uuid: uuid.to_owned(),
        });
        true
    }

    // 将活动场景切换请求交给场景管理器。
    pub fn set_active_scene(&mut self, uuid: &str) -> bool {
        self.scenes.set_active(uuid)
    }

    // 规范并保存固定时间设置。
    pub fn set_timing(&mut self, settings: FixedTimeSettings) {
        let settings = settings.normalized();
        if (settings.tick_rate - self.timing.tick_rate).abs() > f64::EPSILON {
            self.accumulator = 0.0;
        }
        self.timing = settings;
    }

    // 设置运行时暂停标志。
    pub fn set_paused(&mut self, paused: bool) {
        self.timing.paused = paused;
    }

    // 按稳定句柄新增或更新刚体记录，返回是否发生有效变化。
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

    // 移除指定刚体以及依赖它的状态，返回是否找到目标。
    pub fn destroy_body(&mut self, handle: u32) -> bool {
        let removed = self.physics.destroy_body(handle);
        self.forward_physics_events();
        removed
    }

    // 按刚体句柄更新复合碰撞体记录，并标记配置变化。
    pub fn upsert_collider_shapes(
        &mut self,
        handle: u32,
        records: &[f64],
    ) -> Result<bool, &'static str> {
        self.physics.upsert_collider_shapes(handle, records)
    }

    // 按稳定句柄新增或更新连接记录，并保留确定性的顺序。
    pub fn upsert_connection(
        &mut self,
        handle: u32,
        order: u32,
        record: &[f64],
    ) -> Result<bool, &'static str> {
        self.physics.upsert_connection(handle, order, record)
    }

    // 移除指定连接并标记求解配置需要更新。
    pub fn destroy_connection(&mut self, handle: u32) -> bool {
        self.physics.destroy_connection(handle)
    }

    // 先应用身份、层和传感器过滤，再执行精确查询、稳定排序及去重。
    pub fn query_filtered(
        &self,
        request: &nova_physics::PhysicsQueryRequest2D,
    ) -> Result<Vec<nova_physics::PhysicsFilteredHit2D>, &'static str> {
        self.physics.query_filtered(request)
    }

    // 返回射线查询中最近的合格命中。
    pub fn raycast(
        &self,
        origin: [f64; 2],
        direction: [f64; 2],
        distance: f64,
        mask: u32,
    ) -> Option<PhysicsQueryHit> {
        self.physics.raycast(origin, direction, distance, mask)
    }
    // 按掩码执行射线查询，返回按距离稳定排序的全部命中。
    pub fn raycast_all(
        &self,
        origin: [f64; 2],
        direction: [f64; 2],
        distance: f64,
        mask: u32,
    ) -> Vec<PhysicsQueryHit> {
        self.physics.raycast_all(origin, direction, distance, mask)
    }
    // 查询包含给定世界点且通过掩码的刚体。
    pub fn overlap_point(&self, point: [f64; 2], mask: u32) -> Vec<u32> {
        self.physics.overlap_point(point, mask)
    }
    // 构造圆形查询体并返回符合掩码的重叠刚体。
    pub fn overlap_circle(&self, center: [f64; 2], radius: f64, mask: u32) -> Vec<u32> {
        self.physics.overlap_circle(center, radius, mask)
    }
    // 构造可旋转矩形查询体并返回重叠刚体。
    pub fn overlap_box(&self, center: [f64; 2], size: [f64; 2], angle: f64, mask: u32) -> Vec<u32> {
        self.physics.overlap_box(center, size, angle, mask)
    }
    // 沿位移扫掠矩形形状，返回最先发生的合格接触。
    pub fn shape_cast(
        &self,
        center: [f64; 2],
        size: [f64; 2],
        angle: f64,
        direction: [f64; 2],
        distance: f64,
        mask: u32,
    ) -> Option<PhysicsQueryHit> {
        self.physics
            .shape_cast(center, size, angle, direction, distance, mask)
    }

    // 求解角色矩形移动、滑动、坡面、台阶和地面吸附，并报告接触状态。
    #[allow(clippy::too_many_arguments)]
    pub fn move_character_box(
        &mut self,
        handle: u32,
        size: [f64; 2],
        displacement: [f64; 2],
        max_slope_angle: f64,
        step_height: f64,
        floor_snap: f64,
        max_slides: u32,
        safe_margin: f64,
        mask: u32,
    ) -> Result<CharacterMoveResult, &'static str> {
        self.physics.move_character_box(
            handle,
            size,
            displacement,
            max_slope_angle,
            step_height,
            floor_snap,
            max_slides,
            safe_margin,
            mask,
        )
    }

    // 给指定刚体设置持续力和力矩。
    pub fn apply_force(
        &mut self,
        handle: u32,
        x: f64,
        y: f64,
        torque: f64,
    ) -> Result<(), &'static str> {
        self.physics.apply_force(handle, x, y, torque)
    }

    // 累加仅下一物理步生效的临时力与力矩。
    pub fn apply_transient_force(
        &mut self,
        handle: u32,
        x: f64,
        y: f64,
        torque: f64,
    ) -> Result<(), &'static str> {
        self.physics.apply_transient_force(handle, x, y, torque)
    }

    // 按渲染帧时间推进有界数量的固定物理步，并返回推进报告。
    pub fn advance(
        &mut self,
        frame_delta: f64,
        global_gravity: f64,
        air_friction: f64,
    ) -> StepReport {
        let report = self.prepare_advance(frame_delta);
        for _ in 0..report.steps {
            self.advance_fixed_tick(global_gravity, air_friction);
        }
        self.complete_advance();
        report
    }

    // 累计帧时间，计算本帧固定步数及丢弃时间，供宿主在各步前调用脚本。
    /// Calculates this rendered frame's fixed ticks without stepping physics.
    /// Hosts use this split form to run `FixedUpdate` immediately before each
    /// deterministic physics tick.
    pub fn prepare_advance(&mut self, frame_delta: f64) -> StepReport {
        let settings = self.timing.normalized();
        let fixed_delta = settings.fixed_delta();
        let frame_delta = finite_or(frame_delta, 0.0).clamp(0.0, 0.25);
        let mut report = StepReport::default();
        self.time.fixed_delta = fixed_delta;
        self.time.scale = settings.time_scale;
        self.time.delta = 0.0;
        if !settings.paused && settings.time_scale > 0.0 {
            let scaled_delta = frame_delta * settings.time_scale;
            self.time.delta = scaled_delta;
            self.time.elapsed += scaled_delta;
            self.time.frame = self.time.frame.saturating_add(1);
            self.accumulator += scaled_delta;
            while self.accumulator + f64::EPSILON >= fixed_delta
                && report.steps < settings.max_catch_up_steps
            {
                self.accumulator = (self.accumulator - fixed_delta).max(0.0);
                report.steps += 1;
            }
            if self.accumulator >= fixed_delta {
                match settings.dropped_time_policy {
                    DroppedTimePolicy::Drop => {
                        let retained = self.accumulator % fixed_delta;
                        report.dropped_seconds = self.accumulator - retained;
                        self.accumulator = retained;
                    }
                    DroppedTimePolicy::PreserveBacklog => {
                        let maximum_backlog = fixed_delta * f64::from(settings.max_catch_up_steps);
                        if self.accumulator > maximum_backlog {
                            report.dropped_seconds = self.accumulator - maximum_backlog;
                            self.accumulator = maximum_backlog;
                        }
                    }
                    DroppedTimePolicy::SlowMotion => {
                        report.dropped_seconds = (self.accumulator - fixed_delta).max(0.0);
                        self.accumulator = self.accumulator.min(fixed_delta);
                    }
                }
            }
        }
        report.interpolation_alpha = (self.accumulator / fixed_delta).clamp(0.0, 1.0);
        self.prepared_report = Some(report);
        report
    }

    // 执行一个固定物理步并同步时间计数与物理事件。
    pub fn advance_fixed_tick(&mut self, global_gravity: f64, air_friction: f64) {
        let fixed_delta = self.timing.fixed_delta();
        self.physics.step(fixed_delta, global_gravity, air_friction);
        self.diagnostics.total_physics_steps =
            self.diagnostics.total_physics_steps.saturating_add(1);
        self.forward_physics_events();
    }

    // 结束分段帧推进，刷新插值和诊断结果。
    pub fn complete_advance(&mut self) -> StepReport {
        let report = self.prepared_report.take().unwrap_or_default();
        self.refresh_diagnostics(report);
        report
    }

    // 在暂停状态也允许明确执行单个固定物理步。
    pub fn single_step(&mut self, global_gravity: f64, air_friction: f64) -> StepReport {
        self.advance_fixed_tick(global_gravity, air_friction);
        let report = StepReport {
            steps: 1,
            interpolation_alpha: 1.0,
            dropped_seconds: 0.0,
        };
        self.refresh_diagnostics(report);
        report
    }

    // 返回当前引擎诊断快照。
    pub fn diagnostics(&self) -> EngineDiagnostics {
        self.diagnostics
    }
    // 借用运行时事件总线。
    pub fn events(&self) -> &EventBus {
        &self.events
    }
    // 取出待处理事件并清空内部事件队列。
    pub fn drain_events(&mut self) -> Vec<EngineEvent> {
        self.events.drain()
    }

    // 清空运行状态及其关联缓存，供重新加载使用。
    pub fn clear(&mut self) {
        self.physics.clear();
        self.accumulator = 0.0;
        self.time = EngineTime::default();
        self.prepared_report = None;
        self.forward_physics_events();
        self.refresh_diagnostics(StepReport::default());
    }

    // 把底层物理事件转换为引擎事件，保留接触和关节身份。
    fn forward_physics_events(&mut self) {
        for event in self.physics.drain_events() {
            let event = match event {
                PhysicsEvent::BodyCreated { handle } => EngineEvent::EntityCreated { handle },
                PhysicsEvent::BodyDestroyed { handle } => EngineEvent::EntityDestroyed { handle },
                PhysicsEvent::BodySleeping { handle } => EngineEvent::BodySleeping { handle },
                PhysicsEvent::BodyWoke { handle } => EngineEvent::BodyWoke { handle },
                PhysicsEvent::ConstraintBroken {
                    handle,
                    joint_kind,
                    link,
                    tension,
                    strain,
                } => EngineEvent::JointBroken {
                    handle,
                    joint_kind,
                    link,
                    tension,
                    strain,
                },
                PhysicsEvent::ContactStarted(contact) if contact.sensor => {
                    EngineEvent::TriggerEntered {
                        first: contact.first,
                        second: contact.second,
                        first_collider: contact.first_collider,
                        second_collider: contact.second_collider,
                        point: contact.point,
                        normal: contact.normal,
                        relative_velocity: contact.relative_velocity,
                    }
                }
                PhysicsEvent::ContactStayed(contact) if contact.sensor => {
                    EngineEvent::TriggerStayed {
                        first: contact.first,
                        second: contact.second,
                        first_collider: contact.first_collider,
                        second_collider: contact.second_collider,
                        point: contact.point,
                        normal: contact.normal,
                        relative_velocity: contact.relative_velocity,
                    }
                }
                PhysicsEvent::ContactEnded(contact) if contact.sensor => {
                    EngineEvent::TriggerExited {
                        first: contact.first,
                        second: contact.second,
                        first_collider: contact.first_collider,
                        second_collider: contact.second_collider,
                        point: contact.point,
                        normal: contact.normal,
                        relative_velocity: contact.relative_velocity,
                    }
                }
                PhysicsEvent::ContactStarted(contact) => EngineEvent::CollisionStarted {
                    first: contact.first,
                    second: contact.second,
                    first_collider: contact.first_collider,
                    second_collider: contact.second_collider,
                    point: contact.point,
                    normal: contact.normal,
                    relative_velocity: contact.relative_velocity,
                    initial_relative_velocity: contact.initial_relative_velocity,
                    normal_impulse: contact.normal_impulse,
                    tangent_impulse: contact.tangent_impulse,
                    normal_force: contact.normal_force,
                    tangent_force: contact.tangent_force,
                    penetration: contact.penetration,
                },
                PhysicsEvent::ContactStayed(contact) => EngineEvent::CollisionStayed {
                    first: contact.first,
                    second: contact.second,
                    first_collider: contact.first_collider,
                    second_collider: contact.second_collider,
                    point: contact.point,
                    normal: contact.normal,
                    relative_velocity: contact.relative_velocity,
                    initial_relative_velocity: contact.initial_relative_velocity,
                    normal_impulse: contact.normal_impulse,
                    tangent_impulse: contact.tangent_impulse,
                    normal_force: contact.normal_force,
                    tangent_force: contact.tangent_force,
                    penetration: contact.penetration,
                },
                PhysicsEvent::ContactEnded(contact) => EngineEvent::CollisionEnded {
                    first: contact.first,
                    second: contact.second,
                    first_collider: contact.first_collider,
                    second_collider: contact.second_collider,
                    point: contact.point,
                    normal: contact.normal,
                    relative_velocity: contact.relative_velocity,
                    initial_relative_velocity: contact.initial_relative_velocity,
                    normal_impulse: contact.normal_impulse,
                    tangent_impulse: contact.tangent_impulse,
                    normal_force: contact.normal_force,
                    tangent_force: contact.tangent_force,
                },
            };
            self.events.publish(event);
        }
    }

    // 根据本帧推进报告更新运行时性能及状态计数。
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

    // 构造带初速度的运行时物理测试刚体。
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

    // 按指定渲染刷新率运行固定步模拟并返回最终位置。
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

    // 验证固定步物理不受渲染刷新率影响。
    #[test]
    fn physics_is_independent_of_render_refresh_rate() {
        let expected = simulate(60.0);
        for rate in [30.0, 144.0, 240.0] {
            assert!((simulate(rate) - expected).abs() < 1.0e-9, "rate={rate}");
        }
    }

    // 验证暂停运行时只响应明确的单步推进。
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

    // 验证分段帧允许宿主在每个物理步之前执行固定更新。
    #[test]
    fn split_frame_places_host_fixed_update_before_each_tick() {
        let mut runtime = RuntimeWorld::new();
        runtime
            .physics_mut()
            .upsert_body(1, 0, &moving_body())
            .unwrap();
        runtime.set_timing(FixedTimeSettings {
            paused: false,
            ..FixedTimeSettings::default()
        });
        let report = runtime.prepare_advance(1.0 / 30.0);
        assert_eq!(report.steps, 2);
        assert!(runtime.physics().state().is_empty());
        for _ in 0..report.steps {
            runtime.advance_fixed_tick(0.0, 0.0);
        }
        runtime.complete_advance();
        assert!(runtime.physics().state()[2] > 0.0);
        assert_eq!(runtime.time().frame, 1);
        assert_eq!(runtime.time().fixed_delta, 1.0 / 60.0);
    }

    // 验证变换组件不可移除，其余组件可按类型替换。
    #[test]
    fn transform_component_is_mandatory_but_other_components_are_replaceable() {
        let mut entity = RuntimeEntity {
            uuid: "entity".into(),
            handle: 1,
            enabled: true,
            parent_uuid: None,
            components: vec![RuntimeComponent {
                uuid: "transform".into(),
                kind: ComponentKind::Transform2D,
                enabled: true,
            }],
        };
        assert!(!entity.remove_component(ComponentKind::Transform2D));
        entity.upsert_component(RuntimeComponent {
            uuid: "body".into(),
            kind: ComponentKind::RigidBody2D,
            enabled: true,
        });
        assert!(entity.component(ComponentKind::RigidBody2D).is_some());
        assert!(entity.remove_component(ComponentKind::RigidBody2D));
    }

    // 验证场景加载、切换、重载和卸载生命周期。
    #[test]
    fn scene_manager_loads_switches_reloads_and_unloads() {
        let mut runtime = RuntimeWorld::new();
        runtime.load_scene(RuntimeScene {
            uuid: "one".into(),
            name: "One".into(),
            loaded: false,
        });
        runtime.load_scene(RuntimeScene {
            uuid: "two".into(),
            name: "Two".into(),
            loaded: false,
        });
        assert!(runtime.set_active_scene("two"));
        assert_eq!(runtime.scenes().active_scene().unwrap().uuid, "two");
        assert!(runtime.unload_scene("one"));
        assert!(runtime.reload_scene("one"));
        let events = runtime.drain_events();
        assert!(events
            .iter()
            .any(/* 检查事件或命令是否符合当前测试预期：matches ! (event , EngineEvent :: SceneUnloaded { uuid } if uuid == "one")。 */ |event| matches!(event, EngineEvent::SceneUnloaded { uuid } if uuid == "one")));
    }

    // 验证传感器接触进入、持续和离开阶段完整转发。
    #[test]
    fn sensors_forward_enter_stay_and_exit_phases() {
        let mut sensor = moving_body();
        sensor[4] = 0.0;
        sensor[9] = 1.0;
        sensor[28] = 1.0;
        sensor[42] = 1.0;
        let mut visitor = moving_body();
        visitor[0] = 2.0;
        visitor[4] = 0.0;
        visitor[42] = 1.0;
        visitor[2] = 0.25;
        let mut runtime = RuntimeWorld::new();
        runtime.physics_mut().upsert_body(1, 0, &sensor).unwrap();
        runtime.physics_mut().upsert_body(2, 1, &visitor).unwrap();
        runtime.drain_events();
        runtime.single_step(0.0, 0.0);
        assert!(runtime.drain_events().iter().any(/* 检查事件或命令是否符合当前测试预期：matches ! (event , EngineEvent :: TriggerEntered { first : 1 , second : 2 , .. })。 */ |event| matches!(
            event,
            EngineEvent::TriggerEntered {
                first: 1,
                second: 2,
                ..
            }
        )));
        runtime.single_step(0.0, 0.0);
        assert!(runtime.drain_events().iter().any(/* 检查事件或命令是否符合当前测试预期：matches ! (event , EngineEvent :: TriggerStayed { first : 1 , second : 2 , .. })。 */ |event| matches!(
            event,
            EngineEvent::TriggerStayed {
                first: 1,
                second: 2,
                ..
            }
        )));
        runtime
            .physics_mut()
            .set_transform(2, 10.0, 0.0, 0.0)
            .unwrap();
        runtime.single_step(0.0, 0.0);
        assert!(runtime.drain_events().iter().any(/* 检查事件或命令是否符合当前测试预期：matches ! (event , EngineEvent :: TriggerExited { first : 1 , second : 2 , .. })。 */ |event| matches!(
            event,
            EngineEvent::TriggerExited {
                first: 1,
                second: 2,
                ..
            }
        )));
    }
}
