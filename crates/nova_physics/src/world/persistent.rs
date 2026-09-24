// 持久物理世界：稳定句柄、按需重建、状态缓存及接触生命周期事件。
#[derive(Clone, Debug, PartialEq)]
pub enum PhysicsEvent {
    BodyCreated {
        handle: u32,
    },
    BodyDestroyed {
        handle: u32,
    },
    ContactStarted(PhysicsContact),
    ContactStayed(PhysicsContact),
    ContactEnded(PhysicsContact),
    BodySleeping {
        handle: u32,
    },
    BodyWoke {
        handle: u32,
    },
    ConstraintBroken {
        handle: u32,
        joint_kind: u8,
        link: i32,
        tension: f64,
        strain: f64,
    },
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PhysicsContact {
    pub first: u32,
    pub second: u32,
    pub first_collider: u32,
    pub second_collider: u32,
    pub sensor: bool,
    pub point: [f64; 2],
    pub normal: [f64; 2],
    pub relative_velocity: [f64; 2],
    pub initial_relative_velocity: [f64; 2],
    pub normal_impulse: f64,
    pub tangent_impulse: f64,
    pub normal_force: f64,
    pub tangent_force: f64,
    pub penetration: f64,
}

#[derive(Clone, Debug)]
struct BodyRecord {
    handle: u32,
    order: u32,
    values: Vec<f64>,
    collider_shapes: Vec<f64>,
}

#[derive(Clone, Debug)]
struct ConnectionRecord {
    handle: u32,
    order: u32,
    values: Vec<f64>,
}

/// Retained physics storage used by the runtime and native/WASM frontends.
///
/// Bodies and connections are rebuilt only when a configuration command marks
/// the dense solver cache dirty. Ordinary steps advance the retained cache and
/// reuse the state buffers.
#[derive(Default)]
pub struct PhysicsWorld {
    bodies: Vec<BodyRecord>,
    connections: Vec<ConnectionRecord>,
    body_index: HashMap<u32, usize>,
    connection_index: HashMap<u32, usize>,
    dense_bodies: Vec<f64>,
    dense_connections: Vec<f64>,
    previous_bodies: Vec<f64>,
    state_buffer: Vec<f64>,
    events: Vec<PhysicsEvent>,
    contacts: HashMap<(u32, u32, u32, u32), PhysicsContact>,
    transient_forces: HashMap<u32, (f64, f64, f64)>,
    configuration_dirty: bool,
    solver: Option<SolverWorld>,
    configuration_rebuilds: u64,
    physics_steps: u64,
    quality: SolverQuality,
}

impl PhysicsWorld {
    // 创建空持久物理世界并使用规范的默认求解质量。
    pub fn new() -> Self {
        Self {
            quality: SolverQuality::default(),
            ..Self::default()
        }
    }

    // 设置物理求解质量，并使依赖配置的缓存按需更新。
    pub fn set_quality(
        &mut self,
        minimum_substeps: usize,
        solver_iterations: usize,
        sleep_linear_threshold: f64,
        sleep_angular_threshold: f64,
        time_to_sleep: f64,
    ) {
        let quality = SolverQuality {
            minimum_substeps,
            solver_iterations,
            position_iterations: 1,
            sleep_linear_threshold,
            sleep_angular_threshold,
            time_to_sleep,
        }
        .normalized();
        if quality != self.quality {
            self.quality = quality;
            self.configuration_dirty = true;
        }
    }

    // 分别设置速度与位置迭代上限及连续碰撞、休眠选项。
    pub fn set_quality_iterations(
        &mut self,
        minimum_substeps: usize,
        velocity_iterations: usize,
        position_iterations: usize,
        sleep_linear_threshold: f64,
        sleep_angular_threshold: f64,
        time_to_sleep: f64,
    ) {
        let quality = SolverQuality {
            minimum_substeps,
            solver_iterations: velocity_iterations,
            position_iterations,
            sleep_linear_threshold,
            sleep_angular_threshold,
            time_to_sleep,
        }
        .normalized();
        if quality != self.quality {
            self.quality = quality;
            self.configuration_dirty = true;
        }
    }

    // 返回持久世界中的刚体数量。
    pub fn body_count(&self) -> usize {
        self.bodies.len()
    }
    // 返回持久世界中的连接数量。
    pub fn connection_count(&self) -> usize {
        self.connections.len()
    }
    // 返回因配置改变而重建求解器的累计次数。
    pub fn configuration_rebuilds(&self) -> u64 {
        self.configuration_rebuilds
    }
    // 返回累计物理推进次数。
    pub fn physics_steps(&self) -> u64 {
        self.physics_steps
    }

    // 分配稳定句柄并插入规范化后的刚体记录。
    pub fn create_body(
        &mut self,
        handle: u32,
        order: u32,
        values: &[f64],
    ) -> Result<(), &'static str> {
        if self.body_index.contains_key(&handle) {
            return Err("body handle already exists");
        }
        self.upsert_body(handle, order, values).map(/* 计算并返回 ()，用于当前 create_body 流程。 */ |_| ())
    }

    // 按稳定句柄新增或更新刚体记录，返回是否发生有效变化。
    pub fn upsert_body(
        &mut self,
        handle: u32,
        order: u32,
        values: &[f64],
    ) -> Result<bool, &'static str> {
        if values.len() != STRIDE {
            return Err("body record has the wrong length");
        }
        if let Some(&index) = self.body_index.get(&handle) {
            let record = &mut self.bodies[index];
            let changed = record.order != order || record.values != values;
            if changed {
                let transform_changed = [2_usize, 3, 12, 13, 14, 43, 44, 45]
                    .into_iter()
                    .any(/* 判断 record . values [field] != values [field] 是否成立，供过滤或有效性检查使用。 */ |field| record.values[field] != values[field])
                    || record.values[34..42] != values[34..42];
                record.order = order;
                record.values.copy_from_slice(values);
                if transform_changed {
                    record.values[49] = 0.0;
                    record.values[50] = 0.0;
                }
                self.configuration_dirty = true;
            }
            return Ok(changed);
        }
        self.bodies.push(BodyRecord {
            handle,
            order,
            values: values.to_vec(),
            collider_shapes: Vec::new(),
        });
        self.rebuild_indexes();
        self.configuration_dirty = true;
        self.events.push(PhysicsEvent::BodyCreated { handle });
        Ok(true)
    }

    // 移除指定刚体以及依赖它的状态，返回是否找到目标。
    pub fn destroy_body(&mut self, handle: u32) -> bool {
        let Some(index) = self.body_index.get(&handle).copied() else {
            return false;
        };
        let ended = self
            .contacts
            .iter()
            .filter_map(/* 判断 (pair . 0 == handle || pair . 1 == handle) . then_some ((* pair , * contact)) 是否成立，供过滤或有效性检查使用。 */ |(pair, contact)| {
                (pair.0 == handle || pair.1 == handle).then_some((*pair, *contact))
            })
            .collect::<Vec<_>>();
        for (pair, contact) in ended {
            self.contacts.remove(&pair);
            self.events.push(PhysicsEvent::ContactEnded(contact));
        }
        self.bodies.remove(index);
        self.rebuild_indexes();
        self.configuration_dirty = true;
        self.events.push(PhysicsEvent::BodyDestroyed { handle });
        true
    }

    // 按刚体句柄更新复合碰撞体记录，并标记配置变化。
    /// Additive collider-child channel. The stable body record remains 56
    /// scalars; compound/chain/concave pieces are retained beside it.
    pub fn upsert_collider_shapes(
        &mut self,
        handle: u32,
        values: &[f64],
    ) -> Result<bool, &'static str> {
        if values.len() % COLLIDER_CHILD_STRIDE != 0 {
            return Err("collider child records have the wrong length");
        }
        if values.len() / COLLIDER_CHILD_STRIDE > 128 {
            return Err("a body cannot have more than 128 solver collider children");
        }
        let Some(index) = self.body_index.get(&handle).copied() else {
            return Err("body handle does not exist");
        };
        if self.bodies[index].collider_shapes == values {
            return Ok(false);
        }
        self.bodies[index].collider_shapes.clear();
        self.bodies[index].collider_shapes.extend_from_slice(values);
        self.configuration_dirty = true;
        Ok(true)
    }

    // 更新指定刚体的位置与角度，并使休眠刚体重新活动。
    pub fn set_transform(
        &mut self,
        handle: u32,
        x: f64,
        y: f64,
        angle: f64,
    ) -> Result<(), &'static str> {
        self.update_body(handle, /* 更新有限化后的位置和规范角度，并清零休眠状态与计时。 */ |values| {
            values[2] = finite_or(x, values[2]);
            values[3] = finite_or(y, values[3]);
            values[14] = normalize_angle(angle);
            values[49] = 0.0;
            values[50] = 0.0;
        })
    }

    // 更新指定刚体的线速度与角速度。
    pub fn set_velocity(
        &mut self,
        handle: u32,
        x: f64,
        y: f64,
        angular: f64,
    ) -> Result<(), &'static str> {
        self.update_body(handle, /* 更新有限化后的线速度和角速度，并清零休眠状态与计时。 */ |values| {
            values[4] = finite_or(x, values[4]);
            values[5] = finite_or(y, values[5]);
            values[15] = finite_or(angular, values[15]);
            values[49] = 0.0;
            values[50] = 0.0;
        })
    }

    // 更新刚体接触材质参数，并触发必要的求解配置更新。
    pub fn set_material(
        &mut self,
        handle: u32,
        restitution: f64,
        static_friction: f64,
        dynamic_friction: f64,
    ) -> Result<(), &'static str> {
        self.update_body(handle, /* 把恢复系数限制为单位区间，并保存非负静、动摩擦系数。 */ |values| {
            values[10] = unit_interval(restitution);
            values[20] = non_negative(static_friction, values[20]);
            values[11] = non_negative(dynamic_friction, values[11]);
        })
    }

    // 给指定刚体设置持续力和力矩。
    pub fn apply_force(
        &mut self,
        handle: u32,
        x: f64,
        y: f64,
        torque: f64,
    ) -> Result<(), &'static str> {
        self.update_body(handle, /* 保存有限化后的持续力与力矩，并唤醒目标刚体。 */ |values| {
            values[21] = finite_or(x, values[21]);
            values[22] = finite_or(y, values[22]);
            values[16] = finite_or(torque, values[16]);
            values[49] = 0.0;
            values[50] = 0.0;
        })
    }

    // 累加仅下一物理步生效的临时力与力矩。
    /// Adds a force for the next fixed step only. Multiple effectors accumulate
    /// without changing the retained body descriptor or rebuilding the solver.
    pub fn apply_transient_force(
        &mut self,
        handle: u32,
        x: f64,
        y: f64,
        torque: f64,
    ) -> Result<(), &'static str> {
        if !self.body_index.contains_key(&handle) {
            return Err("body handle does not exist");
        }
        let entry = self
            .transient_forces
            .entry(handle)
            .or_insert((0.0, 0.0, 0.0));
        entry.0 = finite_or(entry.0 + finite_or(x, 0.0), entry.0);
        entry.1 = finite_or(entry.1 + finite_or(y, 0.0), entry.1);
        entry.2 = finite_or(entry.2 + finite_or(torque, 0.0), entry.2);
        Ok(())
    }

    // 把冲量转换为线速度和角速度变化，并遵守刚体运动约束。
    pub fn apply_impulse(
        &mut self,
        handle: u32,
        x: f64,
        y: f64,
        offset_x: f64,
        offset_y: f64,
    ) -> Result<(), &'static str> {
        self.update_body(handle, /* 忽略不可受冲量的刚体，按质量和惯量更新速度并清理非法数值。 */ |values| {
            if values[9] > 0.5 || values[24] > 0.5 {
                return;
            }
            let mass = positive(values[8], 1.0);
            values[4] = finite_or(values[4] + finite_or(x, 0.0) / mass, values[4]);
            values[5] = finite_or(values[5] + finite_or(y, 0.0) / mass, values[5]);
            let inertia = positive_with_minimum(values[26], 1.0, MIN_INERTIA);
            values[15] = finite_or(
                values[15] + (offset_x * y - offset_y * x) / inertia,
                values[15],
            );
            values[49] = 0.0;
            values[50] = 0.0;
        })
    }

    // 按稳定句柄新增或更新连接记录，并保留确定性的顺序。
    pub fn upsert_connection(
        &mut self,
        handle: u32,
        order: u32,
        values: &[f64],
    ) -> Result<bool, &'static str> {
        if values.len() != CONNECTION_STRIDE {
            return Err("connection record has the wrong length");
        }
        if let Some(&index) = self.connection_index.get(&handle) {
            let record = &mut self.connections[index];
            let changed = record.order != order || record.values != values;
            if changed {
                record.order = order;
                record.values.copy_from_slice(values);
                self.configuration_dirty = true;
            }
            return Ok(changed);
        }
        self.connections.push(ConnectionRecord {
            handle,
            order,
            values: values.to_vec(),
        });
        self.rebuild_indexes();
        self.configuration_dirty = true;
        Ok(true)
    }

    // 移除指定连接并标记求解配置需要更新。
    pub fn destroy_connection(&mut self, handle: u32) -> bool {
        let Some(index) = self.connection_index.get(&handle).copied() else {
            return false;
        };
        self.connections.remove(index);
        self.rebuild_indexes();
        self.configuration_dirty = true;
        true
    }

    // 清空运行状态及其关联缓存，供重新加载使用。
    pub fn clear(&mut self) {
        for record in &self.bodies {
            self.events.push(PhysicsEvent::BodyDestroyed {
                handle: record.handle,
            });
        }
        self.bodies.clear();
        self.connections.clear();
        self.body_index.clear();
        self.connection_index.clear();
        self.dense_bodies.clear();
        self.dense_connections.clear();
        self.previous_bodies.clear();
        self.state_buffer.clear();
        self.contacts.clear();
        self.transient_forces.clear();
        self.solver = None;
        self.configuration_dirty = false;
        self.configuration_rebuilds = 0;
        self.physics_steps = 0;
    }

    // 推进物理世界一个时间步，更新求解状态、缓存和事件。
    pub fn step(&mut self, dt: f64, global_gravity: f64, air_friction: f64) {
        self.rebuild_dense_if_needed();
        if self.dense_bodies.is_empty() {
            return;
        }
        self.previous_bodies.clear();
        self.previous_bodies.extend_from_slice(&self.dense_bodies);
        let Some(solver) = self.solver.as_mut() else {
            return;
        };
        let transient_forces = std::mem::take(&mut self.transient_forces);
        for (handle, (x, y, torque)) in &transient_forces {
            let Some(index) = self.body_index.get(handle).copied() else {
                continue;
            };
            let Some(body) = solver.bodies.get_mut(index) else {
                continue;
            };
            body.force.x = finite_or(body.force.x + x, body.force.x);
            body.force.y = finite_or(body.force.y + y, body.force.y);
            body.torque = finite_or(body.torque + torque, body.torque);
        }
        solver.step(dt, global_gravity, air_friction);
        for (handle, (x, y, torque)) in transient_forces {
            let Some(index) = self.body_index.get(&handle).copied() else {
                continue;
            };
            let Some(body) = solver.bodies.get_mut(index) else {
                continue;
            };
            body.force.x = finite_or(body.force.x - x, body.force.x);
            body.force.y = finite_or(body.force.y - y, body.force.y);
            body.torque = finite_or(body.torque - torque, body.torque);
        }
        write_bodies(&mut solver.data, &solver.bodies);
        self.physics_steps = self.physics_steps.saturating_add(1);
        solver.copy_state(&mut self.dense_bodies, &mut self.dense_connections);
        self.collect_state_events();
        self.copy_dense_to_records();
        self.collect_contact_events();
        self.state_buffer.clear();
        self.state_buffer.extend_from_slice(&self.dense_bodies);
        self.state_buffer.extend_from_slice(&self.dense_connections);
    }

    // 借用当前合并后的扁平物理状态。
    pub fn state(&self) -> &[f64] {
        &self.state_buffer
    }
    // 对物理状态生成可重现校验值，用于回放一致性检查。
    /// Stable checksum of the authoritative, ordered physics state. Float bits
    /// are hashed exactly so replay diagnostics detect even sub-pixel drift.
    pub fn state_checksum(&self) -> u64 {
        let mut hash = 0xcbf2_9ce4_8422_2325_u64;
        for value in &self.state_buffer {
            for byte in value.to_bits().to_le_bytes() {
                hash ^= u64::from(byte);
                hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
            }
        }
        hash ^= self.physics_steps;
        hash.wrapping_mul(0x0000_0100_0000_01b3)
    }
    // 借用上一物理步的刚体状态，供渲染插值使用。
    pub fn previous_body_state(&self) -> &[f64] {
        &self.previous_bodies
    }
    // 返回刚体状态所占的扁平元素数量。
    pub fn body_state_len(&self) -> usize {
        self.dense_bodies.len()
    }
    // 取出待处理事件并清空内部事件队列。
    pub fn drain_events(&mut self) -> Vec<PhysicsEvent> {
        std::mem::take(&mut self.events)
    }

    // 重建稳定句柄到记录位置的索引。
    fn rebuild_indexes(&mut self) {
        self.body_index.clear();
        for (index, record) in self.bodies.iter().enumerate() {
            self.body_index.insert(record.handle, index);
        }
        self.connection_index.clear();
        for (index, record) in self.connections.iter().enumerate() {
            self.connection_index.insert(record.handle, index);
        }
    }

    // 仅在配置脏标记存在时重建连续求解数据。
    fn rebuild_dense_if_needed(&mut self) {
        if !self.configuration_dirty {
            return;
        }
        self.bodies.sort_by_key(/* 返回当前快照值 record . order。 */ |record| record.order);
        self.connections.sort_by_key(/* 返回当前快照值 record . order。 */ |record| record.order);
        self.rebuild_indexes();
        self.dense_bodies.clear();
        for record in &self.bodies {
            self.dense_bodies.extend_from_slice(&record.values);
        }
        self.dense_connections.clear();
        for record in &self.connections {
            self.dense_connections.extend_from_slice(&record.values);
        }
        let child_shapes = self
            .bodies
            .iter()
            .map(/* 按 record . collider_shapes . as_slice () 读取或转换可选值，保留转换失败分支。 */ |record| record.collider_shapes.as_slice())
            .collect::<Vec<_>>();
        self.solver = Some(SolverWorld::new_with_children(
            &self.dense_bodies,
            &self.dense_connections,
            self.quality,
            &child_shapes,
        ));
        self.configuration_rebuilds = self.configuration_rebuilds.saturating_add(1);
        self.state_buffer.clear();
        self.state_buffer.extend_from_slice(&self.dense_bodies);
        self.state_buffer.extend_from_slice(&self.dense_connections);
        self.configuration_dirty = false;
    }

    // 将连续求解缓冲中的状态同步回持久记录。
    fn copy_dense_to_records(&mut self) {
        for (index, record) in self.bodies.iter_mut().enumerate() {
            record
                .values
                .copy_from_slice(&self.dense_bodies[index * STRIDE..(index + 1) * STRIDE]);
        }
        for (index, record) in self.connections.iter_mut().enumerate() {
            record.values.copy_from_slice(
                &self.dense_connections[index * CONNECTION_STRIDE..(index + 1) * CONNECTION_STRIDE],
            );
        }
    }

    // 比较前后刚体与连接状态，生成休眠、唤醒或断裂事件。
    fn collect_state_events(&mut self) {
        for (index, record) in self.bodies.iter().enumerate() {
            let before = record.values[49] > 0.5;
            let after = self
                .dense_bodies
                .get(index * STRIDE + 49)
                .copied()
                .unwrap_or(0.0)
                > 0.5;
            if before != after {
                self.events.push(if after {
                    PhysicsEvent::BodySleeping {
                        handle: record.handle,
                    }
                } else {
                    PhysicsEvent::BodyWoke {
                        handle: record.handle,
                    }
                });
            }
        }
        for (index, record) in self.connections.iter().enumerate() {
            let base = index * CONNECTION_STRIDE;
            let before = record.values[17];
            let after = self
                .dense_connections
                .get(base + 17)
                .copied()
                .unwrap_or(before);
            if before <= 0.5 && after > 0.5 {
                self.events.push(PhysicsEvent::ConstraintBroken {
                    handle: record.handle,
                    joint_kind: finite_or(record.values[18], 0.0).round().clamp(0.0, 255.0) as u8,
                    link: finite_or(
                        self.dense_connections
                            .get(base + 28)
                            .copied()
                            .unwrap_or(-1.0),
                        -1.0,
                    )
                    .round() as i32,
                    tension: non_negative(
                        self.dense_connections
                            .get(base + 18)
                            .copied()
                            .unwrap_or(0.0),
                        0.0,
                    ),
                    strain: non_negative(
                        self.dense_connections
                            .get(base + 19)
                            .copied()
                            .unwrap_or(0.0),
                        0.0,
                    ),
                });
            }
        }
    }

    // 比较前后接触集合，生成进入、持续和离开事件。
    fn collect_contact_events(&mut self) {
        let mut current = HashMap::<(u32, u32, u32, u32), PhysicsContact>::new();
        if let Some(solver) = self.solver.as_ref() {
            for contact in solver.contacts() {
                let (Some(first), Some(second)) = (
                    self.bodies.get(contact.body_a),
                    self.bodies.get(contact.body_b),
                ) else {
                    continue;
                };
                let pair = if first.handle <= second.handle {
                    (
                        first.handle,
                        second.handle,
                        contact.child_a,
                        contact.child_b,
                    )
                } else {
                    (
                        second.handle,
                        first.handle,
                        contact.child_b,
                        contact.child_a,
                    )
                };
                let snapshot = PhysicsContact {
                    first: first.handle,
                    second: second.handle,
                    first_collider: contact.child_a,
                    second_collider: contact.child_b,
                    sensor: contact.sensor,
                    point: [contact.point.x, contact.point.y],
                    normal: [contact.normal.x, contact.normal.y],
                    relative_velocity: [contact.relative_velocity.x, contact.relative_velocity.y],
                    initial_relative_velocity: [
                        contact.initial_relative_velocity.x,
                        contact.initial_relative_velocity.y,
                    ],
                    normal_impulse: contact.normal_impulse,
                    tangent_impulse: contact.tangent_impulse,
                    normal_force: contact.normal_force,
                    tangent_force: contact.tangent_force,
                    penetration: contact.penetration.max(0.0),
                };
                match current.get_mut(&pair) {
                    Some(existing) if existing.penetration < snapshot.penetration => {
                        *existing = snapshot
                    }
                    None => {
                        current.insert(pair, snapshot);
                    }
                    _ => {}
                }
            }
        }
        let mut current_contacts = current.iter().collect::<Vec<_>>();
        current_contacts.sort_by_key(/* 计算并返回 * * pair，用于当前 collect_contact_events 流程。 */ |(pair, _)| **pair);
        for (pair, contact) in current_contacts {
            self.events.push(if self.contacts.contains_key(pair) {
                PhysicsEvent::ContactStayed(*contact)
            } else {
                PhysicsEvent::ContactStarted(*contact)
            });
        }
        let mut ended_contacts = self.contacts.iter().collect::<Vec<_>>();
        ended_contacts.sort_by_key(/* 计算并返回 * * pair，用于当前 collect_contact_events 流程。 */ |(pair, _)| **pair);
        for (pair, contact) in ended_contacts {
            if !current.contains_key(pair) {
                self.events.push(PhysicsEvent::ContactEnded(*contact));
            }
        }
        self.contacts = current;
    }

    // 取得目标刚体记录并应用更新回调，再记录配置变化。
    fn update_body(
        &mut self,
        handle: u32,
        update: impl FnOnce(&mut [f64]),
    ) -> Result<(), &'static str> {
        let Some(index) = self.body_index.get(&handle).copied() else {
            return Err("body handle does not exist");
        };
        update(&mut self.bodies[index].values);
        self.configuration_dirty = true;
        Ok(())
    }
}

#[cfg(test)]
mod persistent_world_tests {
    use super::*;

    // 构造持久物理世界测试使用的刚体记录。
    fn body_record() -> Vec<f64> {
        let mut body = vec![0.0; STRIDE];
        body[8] = 1.0;
        body[12] = 1.0;
        body[13] = 1.0;
        body[17] = 1.0;
        body[25] = 1.0;
        body[26] = 1.0;
        body
    }

    // 验证常规物理步复用求解器而不反复重建。
    #[test]
    fn retained_solver_is_not_rebuilt_between_ordinary_steps() {
        let mut world = PhysicsWorld::new();
        world.create_body(1, 0, &body_record()).unwrap();
        world.step(1.0 / 60.0, 0.0, 0.0);
        world.step(1.0 / 60.0, 0.0, 0.0);
        assert_eq!(world.configuration_rebuilds(), 1);
        assert_eq!(world.physics_steps(), 2);
    }

    // 验证配置命令延迟到下一物理步才触发重建。
    #[test]
    fn command_changes_rebuild_only_on_the_next_step() {
        let mut world = PhysicsWorld::new();
        world.create_body(1, 0, &body_record()).unwrap();
        world.step(1.0 / 60.0, 0.0, 0.0);
        world.set_velocity(1, 3.0, 0.0, 0.0).unwrap();
        assert_eq!(world.configuration_rebuilds(), 1);
        world.step(1.0 / 60.0, 0.0, 0.0);
        assert_eq!(world.configuration_rebuilds(), 2);
    }

    // 验证临时力累加一次生效且不重建求解器。
    #[test]
    fn transient_forces_accumulate_for_one_tick_without_rebuilding() {
        let mut world = PhysicsWorld::new();
        world.create_body(1, 0, &body_record()).unwrap();
        world.step(0.1, 0.0, 0.0);
        let rebuilds = world.configuration_rebuilds();
        world.apply_transient_force(1, 2.0, 0.0, 0.0).unwrap();
        world.apply_transient_force(1, 3.0, 0.0, 0.0).unwrap();
        world.step(0.1, 0.0, 0.0);
        let velocity_after_force = world.state()[4];
        world.step(0.1, 0.0, 0.0);
        assert!((velocity_after_force - 0.5).abs() < 1.0e-9);
        assert!((world.state()[4] - velocity_after_force).abs() < 1.0e-9);
        assert_eq!(world.configuration_rebuilds(), rebuilds);
    }

    // 验证变换命令唤醒休眠刚体。
    #[test]
    fn transform_commands_wake_a_sleeping_body() {
        let mut record = body_record();
        record[48] = 1.0;
        record[49] = 1.0;
        record[50] = 1.0;
        let mut world = PhysicsWorld::new();
        world.create_body(1, 0, &record).unwrap();
        world.set_transform(1, 3.0, 4.0, 0.5).unwrap();
        assert_eq!(world.bodies[0].values[49], 0.0);
        assert_eq!(world.bodies[0].values[50], 0.0);

        let mut moved = record;
        moved[2] = 8.0;
        world.upsert_body(1, 0, &moved).unwrap();
        assert_eq!(world.bodies[0].values[49], 0.0);
        assert_eq!(world.bodies[0].values[50], 0.0);
    }

    // 验证接触事件包含两端身份和传感器状态。
    #[test]
    fn contact_events_identify_both_bodies_and_sensor_state() {
        let mut first = body_record();
        let mut second = body_record();
        first[9] = 1.0;
        first[28] = 1.0;
        first[42] = 1.0;
        second[42] = 1.0;
        second[2] = 0.25;
        let mut world = PhysicsWorld::new();
        world.create_body(10, 0, &first).unwrap();
        world.create_body(20, 1, &second).unwrap();
        world.drain_events();
        world.step(1.0 / 60.0, 0.0, 0.0);
        let events = world.drain_events();
        assert!(events.iter().any(/* 检查事件或命令是否符合当前测试预期：matches ! (event , PhysicsEvent :: ContactStarted (contact) if contact . first == 10 && contact . second == 20 && contact . sensor)。 */ |event| matches!(
            event,
            PhysicsEvent::ContactStarted(contact)
                if contact.first == 10 && contact.second == 20 && contact.sensor
        )));
        world.step(1.0 / 60.0, 0.0, 0.0);
        assert!(world
            .drain_events()
            .iter()
            .any(/* 检查事件或命令是否符合当前测试预期：matches ! (event , PhysicsEvent :: ContactStayed (_))。 */ |event| matches!(event, PhysicsEvent::ContactStayed(_))));
    }

    // 验证同时接触按稳定句柄顺序发出事件。
    #[test]
    fn simultaneous_contacts_are_emitted_in_stable_handle_order() {
        let mut world = PhysicsWorld::new();
        for (order, handle, x) in [(0, 30, -0.2), (1, 10, 0.0), (2, 20, 0.2)] {
            let mut record = body_record();
            record[0] = handle as f64;
            record[2] = x;
            record[9] = 1.0;
            record[28] = 1.0;
            record[42] = 1.0;
            world.create_body(handle, order, &record).unwrap();
        }
        world.drain_events();
        world.step(1.0 / 60.0, 0.0, 0.0);
        let pairs = world
            .drain_events()
            .into_iter()
            .filter_map(/* 仅提取接触进入事件，并按较小句柄在前规范接触对。 */ |event| match event {
                PhysicsEvent::ContactStarted(contact) => Some((
                    contact.first.min(contact.second),
                    contact.first.max(contact.second),
                )),
                _ => None,
            })
            .collect::<Vec<_>>();
        let mut sorted = pairs.clone();
        sorted.sort_unstable();
        assert_eq!(pairs, sorted);
    }
}
