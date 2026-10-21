// 连接约束求解：绳索节点、断裂、摩擦、锚点、刚性绑定及关节电机与限位。
#[derive(Clone, Debug)]
struct ConnectionConstraint {
    data_index: usize,
    body_a: usize,
    body_b: usize,
    local_anchor_a: Vec2,
    local_anchor_b: Vec2,
    rest_length: f64,
    stretchable: bool,
    bendable: bool,
    stiffness: f64,
    damping: f64,
    max_stretch_ratio: f64,
    bending_tolerance_mass: f64,
    stretching_tolerance_mass: f64,
    bend_amount: f64,
    collision_enabled: bool,
    collision_radius: f64,
    linear_density: f64,
    rope_nodes: Vec<RopeNode>,
    break_link: Option<usize>,
    link_tensions: Vec<f64>,
    binding: bool,
    bind_angle: f64,
    bind_offset: Vec2,
    active: bool,
    broken_code: u8,
    tension: f64,
    strain: f64,
    joint_kind: u8,
    joint_axis: Vec2,
    limits_enabled: bool,
    lower_limit: f64,
    upper_limit: f64,
    collide_connected: bool,
    motor_enabled: bool,
    motor_speed: f64,
    max_motor_force: f64,
    break_force: f64,
    break_torque: f64,
    motor_torque: f64,
    // 26.44 Soft Step: accumulated impulses (warm started every substep and across steps).
    linear_impulse: Vec2,
    axial_impulse: f64,
    angular_impulse: f64,
    lower_impulse: f64,
    upper_impulse: f64,
    motor_impulse: f64,
    // 26.45: wheel suspension / weld softness (0 hertz = stiff). Fields 40-43 of joint records.
    spring_hertz: f64,
    spring_damping_ratio: f64,
    angular_hertz: f64,
    angular_damping_ratio: f64,
}

#[derive(Clone, Copy, Debug)]
struct RopeNode {
    position: Vec2,
    velocity: Vec2,
}

impl ConnectionConstraint {
    // 解析连接两端及约束字段；非法端点返回空值，绳节点与限位采用有界参数。
    fn from_data(data: &[f64], data_index: usize, body_count: usize) -> Option<Self> {
        let body_a = non_negative(data[data_index + 1], 0.0).round() as usize;
        let body_b = non_negative(data[data_index + 2], 0.0).round() as usize;
        if body_a >= body_count || body_b >= body_count || body_a == body_b {
            return None;
        }
        let rope_node_count = non_negative(data[data_index + 27], 0.0)
            .round()
            .min(ROPE_NODE_CAPACITY as f64) as usize;
        let rope_nodes = (0..rope_node_count)
            .map(/* 从固定步长绳节点记录中读取有限化的位置和速度。 */ |node_index| {
                let offset = data_index + ROPE_NODE_DATA_OFFSET + node_index * 4;
                RopeNode {
                    position: Vec2::new(
                        finite_or(data[offset], 0.0),
                        finite_or(data[offset + 1], 0.0),
                    ),
                    velocity: Vec2::new(
                        finite_or(data[offset + 2], 0.0),
                        finite_or(data[offset + 3], 0.0),
                    ),
                }
            })
            .collect();
        let link_count = rope_node_count + 1;
        let broken_code = non_negative(data[data_index + 17], 0.0)
            .round()
            .clamp(0.0, 2.0) as u8;
        let raw_break_link = finite_or(data[data_index + 28], -1.0).round() as isize;
        let break_link =
            if broken_code != 0 && raw_break_link >= 0 && (raw_break_link as usize) < link_count {
                Some(raw_break_link as usize)
            } else {
                None
            };
        Some(Self {
            data_index,
            body_a,
            body_b,
            local_anchor_a: Vec2::new(
                finite_or(data[data_index + 3], 0.0),
                finite_or(data[data_index + 4], 0.0),
            ),
            local_anchor_b: Vec2::new(
                finite_or(data[data_index + 5], 0.0),
                finite_or(data[data_index + 6], 0.0),
            ),
            rest_length: positive(data[data_index + 7], 1.0),
            stretchable: data[data_index + 8] > 0.5,
            bendable: data[data_index + 9] > 0.5,
            stiffness: non_negative(data[data_index + 10], 1200.0).min(1.0e12),
            damping: non_negative(data[data_index + 11], 35.0).min(1.0e9),
            max_stretch_ratio: positive(data[data_index + 12], 1.25).max(1.0),
            bending_tolerance_mass: non_negative(data[data_index + 13], 1.0e12),
            stretching_tolerance_mass: non_negative(data[data_index + 14], 1.0e12),
            bend_amount: non_negative(data[data_index + 15], 0.0),
            collision_enabled: data[data_index + 24] > 0.5 && rope_node_count > 0,
            collision_radius: positive(data[data_index + 25], 0.2).min(1.0e6),
            linear_density: positive(data[data_index + 26], 0.08),
            rope_nodes,
            break_link,
            link_tensions: vec![0.0; link_count],
            binding: data[data_index + 20] > 0.5,
            bind_angle: normalize_angle(data[data_index + 21]),
            bind_offset: Vec2::new(
                finite_or(data[data_index + 22], 0.0),
                finite_or(data[data_index + 23], 0.0),
            ),
            active: data[data_index + 16] > 0.5,
            broken_code,
            tension: 0.0,
            strain: 0.0,
            joint_kind: non_negative(data[data_index + 18], 0.0).round().clamp(0.0, 9.0) as u8,
            joint_axis: Vec2::new(
                finite_or(data[data_index + 29], 1.0),
                finite_or(data[data_index + 30], 0.0),
            )
            .normalized_or(Vec2::new(1.0, 0.0)),
            limits_enabled: data[data_index + 31] > 0.5,
            lower_limit: finite_or(data[data_index + 32], -1.0),
            upper_limit: finite_or(data[data_index + 33], 1.0)
                .max(finite_or(data[data_index + 32], -1.0)),
            collide_connected: data[data_index + 34] > 0.5,
            motor_enabled: data[data_index + 35] > 0.5,
            motor_speed: finite_or(data[data_index + 36], 0.0),
            max_motor_force: non_negative(data[data_index + 37], 1000.0),
            break_force: if data[data_index + 38].is_finite() && data[data_index + 38] > 0.0 {
                data[data_index + 38]
            } else {
                f64::MAX
            },
            break_torque: if data[data_index + 39].is_finite() && data[data_index + 39] > 0.0 {
                data[data_index + 39]
            } else {
                f64::MAX
            },
            motor_torque: 0.0,
            linear_impulse: Vec2::ZERO,
            axial_impulse: 0.0,
            angular_impulse: 0.0,
            lower_impulse: 0.0,
            upper_impulse: 0.0,
            motor_impulse: 0.0,
            // Rope records keep node data from index 29 on; only joints 7+ carry these fields.
            spring_hertz: if data[data_index + 18] >= 6.5 { non_negative(data[data_index + 40], 0.0).min(1.0e4) } else { 0.0 },
            spring_damping_ratio: if data[data_index + 18] >= 6.5 { non_negative(data[data_index + 41], 0.7).min(1.0e3) } else { 0.0 },
            angular_hertz: if data[data_index + 18] >= 6.5 { non_negative(data[data_index + 42], 0.0).min(1.0e4) } else { 0.0 },
            angular_damping_ratio: if data[data_index + 18] >= 6.5 { non_negative(data[data_index + 43], 0.7).min(1.0e3) } else { 0.0 },
        })
    }

    // 计算连接两端世界锚点、方向、距离与相关偏移。
    fn geometry(&self, bodies: &[Body]) -> (Vec2, Vec2, Vec2, f64, Vec2) {
        let a = &bodies[self.body_a];
        let b = &bodies[self.body_b];
        let radius_a = rotate(self.local_anchor_a, a.angle);
        let radius_b = rotate(self.local_anchor_b, b.angle);
        let point_a = a.position.add(radius_a);
        let point_b = b.position.add(radius_b);
        let delta = point_b.sub(point_a);
        let length = delta.length();
        let normal = delta.normalized_or(Vec2::new(1.0, 0.0));
        (radius_a, radius_b, normal, length, delta)
    }

    // 计算绳索相邻节点或端点之间的链节长度。
    fn link_lengths(&self, bodies: &[Body], physical_rope: bool) -> Vec<f64> {
        if !physical_rope {
            return vec![self.geometry(bodies).3];
        }
        (0..rope_point_count(self) - 1)
            .map(/* 计算并返回 rope_point_position (self , bodies , point + 1) . sub (rope_point_position (self , bodies , point)) . length ()，用于当前 link_lengths 流程。 */ |point| {
                rope_point_position(self, bodies, point + 1)
                    .sub(rope_point_position(self, bodies, point))
                    .length()
            })
            .collect()
    }

    // 找出伸长比例最大的链节及其比例。
    fn strongest_stretch(&self) -> (usize, f64) {
        self.link_tensions
            .iter()
            .copied()
            .enumerate()
            .max_by(/* 按 a . 1 . total_cmp (& b . 1) 比较顺序，供稳定排序使用。 */ |a, b| a.1.total_cmp(&b.1))
            .unwrap_or((0, self.tension))
    }

    // 找出最严重的弯曲位置与弯曲程度。
    fn strongest_bend(&self, bodies: &[Body], physical_rope: bool) -> (usize, f64) {
        if !physical_rope {
            return (0, self.tension * self.bend_amount);
        }
        let positions: Vec<Vec2> = (0..rope_point_count(self))
            .map(/* 计算并返回 rope_point_position (self , bodies , point)，用于当前 strongest_bend 流程。 */ |point| rope_point_position(self, bodies, point))
            .collect();
        let mut strongest = (0, 0.0);
        for point in 1..positions.len() - 1 {
            let incoming = positions[point]
                .sub(positions[point - 1])
                .normalized_or(Vec2::new(1.0, 0.0));
            let outgoing = positions[point + 1]
                .sub(positions[point])
                .normalized_or(incoming);
            let turn_sine_half = ((1.0 - incoming.dot(outgoing)).max(0.0) * 0.5).sqrt();
            let left_tension = self.link_tensions.get(point - 1).copied().unwrap_or(0.0);
            let right_tension = self.link_tensions.get(point).copied().unwrap_or(0.0);
            let force = 2.0 * left_tension.min(right_tension) * turn_sine_half;
            if force > strongest.1 {
                strongest = (
                    if left_tension >= right_tension {
                        point - 1
                    } else {
                        point
                    },
                    force,
                );
            }
        }
        strongest
    }

    // 按最大拉伸处记录断裂，维护断裂后的分段状态。
    fn break_at_stretch(
        &mut self,
        physical_rope: bool,
        link_lengths: &[f64],
        stretch_link: usize,
        stretch_force: f64,
    ) {
        self.broken_code = 2;
        let longest_link = link_lengths
            .iter()
            .copied()
            .enumerate()
            .max_by(/* 按 a . 1 . total_cmp (& b . 1) 比较顺序，供稳定排序使用。 */ |a, b| a.1.total_cmp(&b.1))
            .map(/* 返回当前快照值 entry . 0。 */ |entry| entry.0)
            .unwrap_or(stretch_link);
        self.break_link = physical_rope.then_some(if stretch_force > 0.0 {
            stretch_link
        } else {
            longest_link
        });
    }

    // 比较拉伸和弯曲负载与容限，更新连接失效状态。
    fn evaluate_failure(&mut self, bodies: &[Body]) {
        if !self.active || self.broken_code != 0 || self.binding {
            return;
        }
        if self.joint_kind > 0 {
            if self.tension > self.break_force || self.motor_torque > self.break_torque {
                self.broken_code = 1;
                self.active = false;
            }
            return;
        }
        let physical_rope = self.collision_enabled && !self.rope_nodes.is_empty();
        let link_lengths = self.link_lengths(bodies, physical_rope);
        let length: f64 = link_lengths.iter().sum();
        self.strain = ((length / self.rest_length) - 1.0).max(0.0);
        let (stretch_link, stretch_force) = self.strongest_stretch();
        let stretch_load_ratio = load_ratio(stretch_force, self.stretching_tolerance_mass);
        let stretch_geometry_ratio = length / self.rest_length / self.max_stretch_ratio;
        let (bend_link, bend_force) = self.strongest_bend(bodies, physical_rope);
        let bend_load_ratio = load_ratio(bend_force, self.bending_tolerance_mass);

        let should_tear = stretch_geometry_ratio > 1.0 || stretch_load_ratio > 1.0;
        let should_snap = bend_load_ratio > 1.0;
        if should_snap
            && (!should_tear || bend_load_ratio >= stretch_load_ratio.max(stretch_geometry_ratio))
        {
            self.broken_code = 1;
            self.break_link = physical_rope.then_some(bend_link);
        } else if should_tear {
            self.break_at_stretch(physical_rope, &link_lengths, stretch_link, stretch_force);
        }
        if self.broken_code != 0 && !physical_rope {
            self.active = false;
        }
    }
}

// 把作用力换算为相对于容许质量重力的负载比例。
fn load_ratio(force: f64, tolerance_mass: f64) -> f64 {
    if tolerance_mass > 0.0 {
        force / STANDARD_GRAVITY / tolerance_mass
    } else if force > 0.0 {
        f64::INFINITY
    } else {
        0.0
    }
}

// 返回包含锚点的绳索求解点数。
fn rope_point_count(constraint: &ConnectionConstraint) -> usize {
    constraint.rope_nodes.len() + 2
}

// 根据绳索线密度和离散长度计算节点逆质量。
fn rope_node_inverse_mass(constraint: &ConnectionConstraint) -> f64 {
    let node_count = constraint.rope_nodes.len().max(1) as f64;
    let node_mass =
        (constraint.linear_density * constraint.rest_length / node_count).max(MIN_DIMENSION);
    1.0 / node_mass
}

// 按端点或中间节点索引读取绳索世界位置。
fn rope_point_position(constraint: &ConnectionConstraint, bodies: &[Body], point: usize) -> Vec2 {
    if point == 0 {
        let body = &bodies[constraint.body_a];
        body.position
            .add(rotate(constraint.local_anchor_a, body.angle))
    } else if point + 1 == rope_point_count(constraint) {
        let body = &bodies[constraint.body_b];
        body.position
            .add(rotate(constraint.local_anchor_b, body.angle))
    } else {
        constraint.rope_nodes[point - 1].position
    }
}

// 按端点或中间节点索引取得绳索点速度。
fn rope_point_velocity(constraint: &ConnectionConstraint, bodies: &[Body], point: usize) -> Vec2 {
    if point == 0 {
        let body = &bodies[constraint.body_a];
        body.point_velocity(rotate(constraint.local_anchor_a, body.angle))
    } else if point + 1 == rope_point_count(constraint) {
        let body = &bodies[constraint.body_b];
        body.point_velocity(rotate(constraint.local_anchor_b, body.angle))
    } else {
        constraint.rope_nodes[point - 1].velocity
    }
}

// 计算指定方向上绳索点的有效逆质量，包含端点转动贡献。
fn rope_point_effective_inverse(
    constraint: &ConnectionConstraint,
    bodies: &[Body],
    point: usize,
    direction: Vec2,
) -> f64 {
    if point == 0 {
        let body = &bodies[constraint.body_a];
        let radius = rotate(constraint.local_anchor_a, body.angle);
        body.inv_mass + radius.cross(direction).powi(2) * body.inv_inertia
    } else if point + 1 == rope_point_count(constraint) {
        let body = &bodies[constraint.body_b];
        let radius = rotate(constraint.local_anchor_b, body.angle);
        body.inv_mass + radius.cross(direction).powi(2) * body.inv_inertia
    } else {
        rope_node_inverse_mass(constraint)
    }
}

// 将冲量施加到绳索节点或其连接刚体。
fn apply_rope_point_impulse(
    constraint: &mut ConnectionConstraint,
    bodies: &mut [Body],
    point: usize,
    impulse: Vec2,
) {
    if point == 0 {
        let body = &mut bodies[constraint.body_a];
        let radius = rotate(constraint.local_anchor_a, body.angle);
        body.apply_impulse(impulse, radius);
    } else if point + 1 == rope_point_count(constraint) {
        let body = &mut bodies[constraint.body_b];
        let radius = rotate(constraint.local_anchor_b, body.angle);
        body.apply_impulse(impulse, radius);
    } else {
        let inverse_mass = rope_node_inverse_mass(constraint);
        let node = &mut constraint.rope_nodes[point - 1];
        node.velocity = node
            .velocity
            .add(impulse.mul(inverse_mass))
            .finite_or(node.velocity);
    }
}

// 按有效质量修正绳索节点或端点刚体的位置。
fn apply_rope_point_correction(
    constraint: &mut ConnectionConstraint,
    bodies: &mut [Body],
    point: usize,
    correction: Vec2,
) {
    if point == 0 {
        let body = &mut bodies[constraint.body_a];
        let radius = rotate(constraint.local_anchor_a, body.angle);
        body.position = body
            .position
            .add(correction.mul(body.inv_mass))
            .finite_or(body.position);
        body.angle = normalize_angle(body.angle + radius.cross(correction) * body.inv_inertia);
    } else if point + 1 == rope_point_count(constraint) {
        let body = &mut bodies[constraint.body_b];
        let radius = rotate(constraint.local_anchor_b, body.angle);
        body.position = body
            .position
            .add(correction.mul(body.inv_mass))
            .finite_or(body.position);
        body.angle = normalize_angle(body.angle + radius.cross(correction) * body.inv_inertia);
    } else {
        let inverse_mass = rope_node_inverse_mass(constraint);
        let node = &mut constraint.rope_nodes[point - 1];
        node.position = node
            .position
            .add(correction.mul(inverse_mass))
            .finite_or(node.position);
    }
}

// 按重力、阻尼与时间步推进自由绳索节点。
fn integrate_rope_nodes(
    constraint: &mut ConnectionConstraint,
    dt: f64,
    global_gravity: f64,
    air_friction: f64,
) {
    if !constraint.active || !constraint.collision_enabled || constraint.binding {
        return;
    }
    let decay = (-air_friction * dt).exp();
    for node in &mut constraint.rope_nodes {
        node.velocity.y -= global_gravity * dt;
        node.velocity = node.velocity.mul(decay).finite_or(Vec2::ZERO);
        node.position = node
            .position
            .add(node.velocity.mul(dt))
            .finite_or(node.position);
    }
}

// 求解绳索伸长、阻尼和弯曲的速度约束。
fn solve_rope_velocity(bodies: &mut [Body], constraint: &mut ConnectionConstraint, dt: f64, iterations: usize) {
    if dt <= 0.0 || constraint.rope_nodes.is_empty() {
        return;
    }
    let point_count = rope_point_count(constraint);
    let link_rest_length = constraint.rest_length / (point_count - 1) as f64;
    for point_a in 0..point_count - 1 {
        if constraint.break_link == Some(point_a) {
            continue;
        }
        let point_b = point_a + 1;
        let position_a = rope_point_position(constraint, bodies, point_a);
        let position_b = rope_point_position(constraint, bodies, point_b);
        let delta = position_b.sub(position_a);
        let length = delta.length();
        let normal = delta.normalized_or(Vec2::new(1.0, 0.0));
        let error = length - link_rest_length;
        if constraint.bendable && error <= 0.0 {
            continue;
        }
        let velocity_a = rope_point_velocity(constraint, bodies, point_a);
        let velocity_b = rope_point_velocity(constraint, bodies, point_b);
        let relative_speed = velocity_b.sub(velocity_a).dot(normal);
        let denominator = rope_point_effective_inverse(constraint, bodies, point_a, normal)
            + rope_point_effective_inverse(constraint, bodies, point_b, normal);
        if denominator <= 0.0 {
            continue;
        }
        let scalar_impulse = if constraint.stretchable {
            let links = (point_count - 1) as f64;
            let link_stiffness = constraint.stiffness * links;
            let link_damping = constraint.damping * links;
            let raw_force = link_stiffness * error + link_damping * relative_speed;
            let force = if constraint.bendable {
                raw_force.max(0.0)
            } else {
                raw_force
            };
            // 26.44: the compliance follows the iteration count actually used (it assumed 20).
            let iteration_dt = dt / iterations.max(1) as f64;
            // Backward-Euler compliance keeps high stiffness/damping stable even
            // when a rope is represented by many low-mass collision samples.
            // A direct F*dt impulse feeds the new relative speed back into the
            // next solver iteration and diverges as sampling density increases.
            let compliance = 1.0
                + denominator * (link_damping * iteration_dt
                    + link_stiffness * iteration_dt * iteration_dt);
            let impulse = -force * iteration_dt / compliance.max(EPSILON);
            let effective_force = (impulse / iteration_dt).abs();
            constraint.tension = constraint.tension.max(effective_force);
            constraint.link_tensions[point_a] = constraint.link_tensions[point_a].max(effective_force);
            impulse
        } else {
            let bias = 0.25 * error / dt;
            let impulse = -(relative_speed + bias) / denominator;
            let force = (impulse / dt).abs();
            constraint.tension = constraint.tension.max(force);
            constraint.link_tensions[point_a] = constraint.link_tensions[point_a].max(force);
            impulse
        };
        let impulse = normal.mul(scalar_impulse);
        apply_rope_point_impulse(constraint, bodies, point_a, impulse.neg());
        apply_rope_point_impulse(constraint, bodies, point_b, impulse);
    }
}

// 修正绳索长度及弯曲位置误差，尊重已断开的链节。
fn correct_rope_position(bodies: &mut [Body], constraint: &mut ConnectionConstraint) {
    if constraint.rope_nodes.is_empty() {
        return;
    }
    let point_count = rope_point_count(constraint);
    if !constraint.stretchable {
        let link_rest_length = constraint.rest_length / (point_count - 1) as f64;
        for point_a in 0..point_count - 1 {
            if constraint.break_link == Some(point_a) {
                continue;
            }
            let point_b = point_a + 1;
            let position_a = rope_point_position(constraint, bodies, point_a);
            let position_b = rope_point_position(constraint, bodies, point_b);
            let delta = position_b.sub(position_a);
            let length = delta.length();
            let normal = delta.normalized_or(Vec2::new(1.0, 0.0));
            let error = length - link_rest_length;
            if constraint.bendable && error <= POSITION_SLOP {
                continue;
            }
            let denominator = rope_point_effective_inverse(constraint, bodies, point_a, normal)
                + rope_point_effective_inverse(constraint, bodies, point_b, normal);
            if denominator <= 0.0 {
                continue;
            }
            let correction = normal.mul(error * 0.75 / denominator);
            apply_rope_point_correction(constraint, bodies, point_a, correction);
            apply_rope_point_correction(constraint, bodies, point_b, correction.neg());
        }
    }
    if !constraint.bendable && constraint.rope_nodes.len() > 1 {
        let positions: Vec<Vec2> = (0..point_count)
            .map(/* 计算并返回 rope_point_position (constraint , bodies , point)，用于当前 correct_rope_position 流程。 */ |point| rope_point_position(constraint, bodies, point))
            .collect();
        let inverse_mass = rope_node_inverse_mass(constraint);
        for node_index in 0..constraint.rope_nodes.len() {
            if constraint.break_link == Some(node_index)
                || constraint.break_link == Some(node_index + 1)
            {
                continue;
            }
            let target = positions[node_index]
                .add(positions[node_index + 2])
                .mul(0.5);
            let correction = target
                .sub(positions[node_index + 1])
                .mul(0.22 / inverse_mass);
            apply_rope_point_correction(constraint, bodies, node_index + 1, correction);
        }
    }
}

// 将绳索局部采样构造为用于碰撞求解的临时刚体。
fn rope_collision_body(
    node: RopeNode,
    radius: f64,
    mass: f64,
    layer: u32,
    collision_mask: u32,
) -> Body {
    Body {
        data_index: usize::MAX,
        shape: Shape::Ellipse {
            radius_x: radius,
            radius_y: radius,
        },
        position: node.position,
        velocity: node.velocity,
        acceleration: Vec2::ZERO,
        angle: 0.0,
        angular_velocity: 0.0,
        force: Vec2::ZERO,
        torque: 0.0,
        mass,
        inv_mass: 1.0 / mass,
        inertia: 0.5 * mass * radius * radius,
        inv_inertia: 0.0,
        gravity_scale: 1.0,
        local_gravity: 0.0,
        linear_damping: 0.0,
        angular_damping: 0.0,
        restitution: 0.0,
        restitution_threshold: 0.0,
        static_friction: 0.4,
       dynamic_friction: 0.25,
        friction_combine: 0,
        restitution_combine: 3,
        is_static: false,
        is_kinematic: false,
        is_sensor: false,
        layer,
        collision_mask,
        collider_offset: Vec2::ZERO,
        collider_angle_offset: 0.0,
        freeze_rotation: true,
        continuous_collision: true,
        sleeping_allowed: false,
        sleeping: false,
        sleep_timer: 0.0,
        one_way: false,
        one_way_normal: Vec2::new(0.0, 1.0),
        auto_inertia: false,
        collider_children: Vec::new(),
        tangent_speed: 0.0,
        rolling_resistance: 0.0,
    }
}

// 在绳索相邻求解点之间插值世界位置。
fn rope_sample_position(
    constraint: &ConnectionConstraint,
    bodies: &[Body],
    link: usize,
    ratio: f64,
) -> Vec2 {
    rope_point_position(constraint, bodies, link)
        .mul(1.0 - ratio)
        .add(rope_point_position(constraint, bodies, link + 1).mul(ratio))
}

// 在绳索相邻求解点之间插值速度。
fn rope_sample_velocity(
    constraint: &ConnectionConstraint,
    bodies: &[Body],
    link: usize,
    ratio: f64,
) -> Vec2 {
    rope_point_velocity(constraint, bodies, link)
        .mul(1.0 - ratio)
        .add(rope_point_velocity(constraint, bodies, link + 1).mul(ratio))
}

// 按采样权重合成两端的有效逆质量。
fn rope_sample_effective_inverse(
    constraint: &ConnectionConstraint,
    bodies: &[Body],
    link: usize,
    ratio: f64,
    direction: Vec2,
) -> f64 {
    let weight_a = 1.0 - ratio;
    let weight_b = ratio;
    weight_a * weight_a * rope_point_effective_inverse(constraint, bodies, link, direction)
        + weight_b
            * weight_b
            * rope_point_effective_inverse(constraint, bodies, link + 1, direction)
}

// 把采样点冲量按插值权重分配到相邻绳索点。
fn apply_rope_sample_impulse(
    constraint: &mut ConnectionConstraint,
    bodies: &mut [Body],
    link: usize,
    ratio: f64,
    impulse: Vec2,
) {
    apply_rope_point_impulse(constraint, bodies, link, impulse.mul(1.0 - ratio));
    apply_rope_point_impulse(constraint, bodies, link + 1, impulse.mul(ratio));
}

// 把采样点位置修正按权重分配到相邻绳索点。
fn apply_rope_sample_correction(
    constraint: &mut ConnectionConstraint,
    bodies: &mut [Body],
    link: usize,
    ratio: f64,
    correction: Vec2,
) {
    apply_rope_point_correction(constraint, bodies, link, correction.mul(1.0 - ratio));
    apply_rope_point_correction(constraint, bodies, link + 1, correction.mul(ratio));
}

#[derive(Clone, Copy)]
struct RopeSample {
    link: usize,
    ratio: f64,
    layer: u32,
    collision_mask: u32,
}

#[derive(Clone, Copy)]
struct RopeContactKinematics {
    normal: Vec2,
    radius_body: Vec2,
    relative_velocity: Vec2,
    normal_scalar: f64,
}

// 检查绳索与刚体的层及端点排除规则。
fn rope_can_collide_with_body(
    constraint: &ConnectionConstraint,
    body: &Body,
    body_index: usize,
    layer: u32,
    collision_mask: u32,
) -> bool {
    body_index != constraint.body_a
        && body_index != constraint.body_b
        && (collision_mask & (1_u32 << body.layer)) != 0
        && (body.collision_mask & (1_u32 << layer)) != 0
        && !body.is_sensor
}

// 根据接触法向冲量限制绳索切向摩擦冲量。
fn apply_rope_friction(
    bodies: &mut [Body],
    constraint: &mut ConnectionConstraint,
    sample: RopeSample,
    body_index: usize,
    contact: RopeContactKinematics,
) {
    let tangent = contact.normal.perp();
    let tangent_cross = contact.radius_body.cross(tangent);
    let tangent_denominator =
        rope_sample_effective_inverse(constraint, bodies, sample.link, sample.ratio, tangent)
            + bodies[body_index].inv_mass
            + tangent_cross * tangent_cross * bodies[body_index].inv_inertia;
    if tangent_denominator <= 0.0 {
        return;
    }
    let tangent_speed = contact.relative_velocity.dot(tangent);
    let static_limit = (bodies[body_index].static_friction * 0.4).sqrt() * contact.normal_scalar;
    let dynamic_limit = (bodies[body_index].dynamic_friction * 0.25).sqrt() * contact.normal_scalar;
    let unconstrained = -tangent_speed / tangent_denominator;
    let tangent_scalar = if unconstrained.abs() <= static_limit {
        unconstrained
    } else {
        unconstrained.clamp(-dynamic_limit, dynamic_limit)
    };
    let friction_impulse = tangent.mul(tangent_scalar);
    apply_rope_sample_impulse(
        constraint,
        bodies,
        sample.link,
        sample.ratio,
        friction_impulse.neg(),
    );
    bodies[body_index].apply_impulse(friction_impulse, contact.radius_body);
}

// 按接触流形求解绳索与刚体间的冲量和穿透修正。
fn resolve_rope_manifold(
    bodies: &mut [Body],
    constraint: &mut ConnectionConstraint,
    sample: RopeSample,
    body_index: usize,
    manifold: Manifold,
) {
    let radius_body = manifold.point.sub(bodies[body_index].position);
    let body_velocity = bodies[body_index].point_velocity(radius_body);
    let relative_velocity = body_velocity.sub(rope_sample_velocity(
        constraint,
        bodies,
        sample.link,
        sample.ratio,
    ));
    let cross_body = radius_body.cross(manifold.normal);
    let rope_normal_inverse = rope_sample_effective_inverse(
        constraint,
        bodies,
        sample.link,
        sample.ratio,
        manifold.normal,
    );
    let denominator = rope_normal_inverse
        + bodies[body_index].inv_mass
        + cross_body * cross_body * bodies[body_index].inv_inertia;
    if denominator <= 0.0 {
        return;
    }
    let normal_speed = relative_velocity.dot(manifold.normal);
    let normal_scalar = if normal_speed < 0.0 {
        let restitution = if -normal_speed > bodies[body_index].restitution_threshold {
            bodies[body_index].restitution
        } else {
            0.0
        };
        -(1.0 + restitution) * normal_speed / denominator
    } else {
        0.0
    };
    if normal_scalar > 0.0 {
        let impulse = manifold.normal.mul(normal_scalar);
        apply_rope_sample_impulse(constraint, bodies, sample.link, sample.ratio, impulse.neg());
        bodies[body_index].apply_impulse(impulse, radius_body);
        apply_rope_friction(
            bodies,
            constraint,
            sample,
            body_index,
            RopeContactKinematics {
                normal: manifold.normal,
                radius_body,
                relative_velocity,
                normal_scalar,
            },
        );
    }

    let correction = manifold
        .normal
        .mul((manifold.depth - POSITION_SLOP).max(0.0) * POSITION_CORRECTION / denominator);
    apply_rope_sample_correction(
        constraint,
        bodies,
        sample.link,
        sample.ratio,
        correction.neg(),
    );
    let body = &mut bodies[body_index];
    body.position = body
        .position
        .add(correction.mul(body.inv_mass))
        .finite_or(body.position);
    body.angle = normalize_angle(body.angle + radius_body.cross(correction) * body.inv_inertia);
}

// 为绳索采样点与刚体生成接触并求解。
fn resolve_rope_sample_body(
    bodies: &mut [Body],
    constraint: &mut ConnectionConstraint,
    sample: RopeSample,
    body_index: usize,
) {
    let sample_position = rope_sample_position(constraint, bodies, sample.link, sample.ratio);
    let sample_velocity = rope_sample_velocity(constraint, bodies, sample.link, sample.ratio);
    let sample_inverse = rope_sample_effective_inverse(
        constraint,
        bodies,
        sample.link,
        sample.ratio,
        Vec2::new(1.0, 0.0),
    )
    .max(MIN_DIMENSION);
    let sample_body = rope_collision_body(
        RopeNode {
            position: sample_position,
            velocity: sample_velocity,
        },
        constraint.collision_radius,
        1.0 / sample_inverse,
        sample.layer,
        sample.collision_mask,
    );
    let variants = std::iter::once(None)
        .chain((0..bodies[body_index].collider_children.len()).map(Some));
    for child_index in variants {
        let proxy = bodies[body_index].collider_proxy(child_index);
        if proxy.is_sensor
            || (sample.collision_mask & (1_u32 << proxy.layer)) == 0
            || (proxy.collision_mask & (1_u32 << sample.layer)) == 0 { continue; }
        for manifold in collide(&sample_body, &proxy) {
            resolve_rope_manifold(bodies, constraint, sample, body_index, manifold);
        }
    }
}

// 遍历绳索采样与合格刚体，处理绳索碰撞。
fn resolve_rope_collisions(bodies: &mut [Body], constraint: &mut ConnectionConstraint) {
    if !constraint.active || !constraint.collision_enabled || constraint.rope_nodes.is_empty() {
        return;
    }
    let layer = bodies[constraint.body_a].layer;
    let collision_mask = bodies[constraint.body_a].collision_mask;
    let point_count = rope_point_count(constraint);
    for link in 0..point_count - 1 {
        if constraint.break_link == Some(link) {
            continue;
        }
        let link_length = rope_point_position(constraint, bodies, link + 1)
            .sub(rope_point_position(constraint, bodies, link))
            .length();
        let sample_count = ((link_length / constraint.collision_radius.max(MIN_DIMENSION)).ceil()
            as usize)
            .clamp(1, 32);
        for sample_index in 0..sample_count {
            let ratio = (sample_index as f64 + 0.5) / sample_count as f64;
            for body_index in 0..bodies.len() {
                if !rope_can_collide_with_body(
                    constraint,
                    &bodies[body_index],
                    body_index,
                    layer,
                    collision_mask,
                ) {
                    continue;
                }
                resolve_rope_sample_body(
                    bodies,
                    constraint,
                    RopeSample {
                        link,
                        ratio,
                        layer,
                        collision_mask,
                    },
                    body_index,
                );
            }
        }
    }
}

// 求解对称二阶线性系统；退化时使用安全后备结果。
fn solve_symmetric_2x2(k11: f64, k12: f64, k22: f64, rhs: Vec2) -> Vec2 {
    let determinant = k11 * k22 - k12 * k12;
    if determinant.abs() <= EPSILON {
        return Vec2::ZERO;
    }
    Vec2::new(
        (k22 * rhs.x - k12 * rhs.y) / determinant,
        (-k12 * rhs.x + k11 * rhs.y) / determinant,
    )
}

// 计算两个刚体在绑定锚点处的二维有效质量矩阵。
fn binding_mass_matrix(a: &Body, b: &Body, radius_a: Vec2, radius_b: Vec2) -> (f64, f64, f64) {
    let inverse_mass = a.inv_mass + b.inv_mass;
    (
        inverse_mass
            + radius_a.y * radius_a.y * a.inv_inertia
            + radius_b.y * radius_b.y * b.inv_inertia,
        -radius_a.x * radius_a.y * a.inv_inertia - radius_b.x * radius_b.y * b.inv_inertia,
        inverse_mass
            + radius_a.x * radius_a.x * a.inv_inertia
            + radius_b.x * radius_b.x * b.inv_inertia,
    )
}

// 求解刚性绑定的相对线速度和角速度约束。
fn solve_binding_velocity(bodies: &mut [Body], constraint: &mut ConnectionConstraint, dt: f64) {
    if dt <= 0.0 {
        return;
    }
    let (radius_a, radius_b, error, relative_velocity, k11, k12, k22) = {
        let a = &bodies[constraint.body_a];
        let b = &bodies[constraint.body_b];
        let radius_a = rotate(constraint.bind_offset, a.angle);
        let radius_b = Vec2::ZERO;
        let error = b.position.add(radius_b).sub(a.position.add(radius_a));
        let relative_velocity = b.point_velocity(radius_b).sub(a.point_velocity(radius_a));
        let (k11, k12, k22) = binding_mass_matrix(a, b, radius_a, radius_b);
        (radius_a, radius_b, error, relative_velocity, k11, k12, k22)
    };

    let bias = error.mul(0.2 / dt);
    let impulse = solve_symmetric_2x2(k11, k12, k22, relative_velocity.add(bias).neg());
    if impulse.length_squared() > 0.0 {
        apply_pair_impulse(
            bodies,
            constraint.body_a,
            constraint.body_b,
            impulse,
            radius_a,
            radius_b,
        );
        constraint.tension = constraint.tension.max(impulse.length() / dt);
    }

    let (inverse_inertia, relative_angular_velocity, angle_error) = {
        let a = &bodies[constraint.body_a];
        let b = &bodies[constraint.body_b];
        (
            a.inv_inertia + b.inv_inertia,
            b.angular_velocity - a.angular_velocity,
            normalize_angle((b.angle - a.angle) - constraint.bind_angle),
        )
    };
    if inverse_inertia > 0.0 {
        let angular_impulse =
            -(relative_angular_velocity + 0.2 * angle_error / dt) / inverse_inertia;
        constraint.motor_torque = constraint.motor_torque.max(angular_impulse.abs() / dt);
        let (a, b) = two_bodies_mut(bodies, constraint.body_a, constraint.body_b);
        a.angular_velocity -= angular_impulse * a.inv_inertia;
        b.angular_velocity += angular_impulse * b.inv_inertia;
    }
}

// 修正绑定刚体间的参考位置与角度偏差。
fn correct_binding_position(bodies: &mut [Body], constraint: &ConnectionConstraint) {
    for _ in 0..8 {
        let (angle_error, inverse_inertia) = {
            let a = &bodies[constraint.body_a];
            let b = &bodies[constraint.body_b];
            (
                normalize_angle((b.angle - a.angle) - constraint.bind_angle),
                a.inv_inertia + b.inv_inertia,
            )
        };
        if inverse_inertia > 0.0 {
            let angular_impulse = -angle_error * 0.75 / inverse_inertia;
            let (a, b) = two_bodies_mut(bodies, constraint.body_a, constraint.body_b);
            a.angle = normalize_angle(a.angle - angular_impulse * a.inv_inertia);
            b.angle = normalize_angle(b.angle + angular_impulse * b.inv_inertia);
        }

        let (radius_a, radius_b, error, k11, k12, k22) = {
            let a = &bodies[constraint.body_a];
            let b = &bodies[constraint.body_b];
            let radius_a = rotate(constraint.bind_offset, a.angle);
            let radius_b = Vec2::ZERO;
            let error = b.position.add(radius_b).sub(a.position.add(radius_a));
            let (k11, k12, k22) = binding_mass_matrix(a, b, radius_a, radius_b);
            (radius_a, radius_b, error, k11, k12, k22)
        };
        let impulse = solve_symmetric_2x2(k11, k12, k22, error.mul(-0.75));
        let (a, b) = two_bodies_mut(bodies, constraint.body_a, constraint.body_b);
        a.position = a
            .position
            .sub(impulse.mul(a.inv_mass))
            .finite_or(a.position);
        a.angle = normalize_angle(a.angle - radius_a.cross(impulse) * a.inv_inertia);
        b.position = b
            .position
            .add(impulse.mul(b.inv_mass))
            .finite_or(b.position);
        b.angle = normalize_angle(b.angle + radius_b.cross(impulse) * b.inv_inertia);
    }
}

// 按组合质量同步绑定刚体的整体运动。
fn synchronize_binding_motion(bodies: &mut [Body], constraint: &ConnectionConstraint) {
    if (!constraint.binding && constraint.joint_kind != 1) || !constraint.active {
        return;
    }
    let (a_index, b_index) = (constraint.body_a, constraint.body_b);
    if bodies[a_index].inv_mass <= 0.0 {
        let angular_velocity = bodies[a_index].angular_velocity;
        let radius = rotate(constraint.bind_offset, bodies[a_index].angle);
        let velocity = bodies[a_index].point_velocity(radius);
        bodies[b_index].velocity = velocity;
        bodies[b_index].angular_velocity = angular_velocity;
        return;
    }
    if bodies[b_index].inv_mass <= 0.0 {
        let angular_velocity = bodies[b_index].angular_velocity;
        let radius = rotate(constraint.bind_offset, bodies[a_index].angle);
        bodies[a_index].velocity = bodies[b_index].velocity.sub(Vec2::new(
            -angular_velocity * radius.y,
            angular_velocity * radius.x,
        ));
        bodies[a_index].angular_velocity = angular_velocity;
        return;
    }

    let a = &bodies[a_index];
    let b = &bodies[b_index];
    let total_mass = a.mass + b.mass;
    if total_mass <= 0.0 {
        return;
    }
    let center = a
        .position
        .mul(a.mass)
        .add(b.position.mul(b.mass))
        .mul(1.0 / total_mass);
    let radius_a = a.position.sub(center);
    let radius_b = b.position.sub(center);
    let linear_velocity = a
        .velocity
        .mul(a.mass)
        .add(b.velocity.mul(b.mass))
        .mul(1.0 / total_mass);
    let compound_inertia = a.inertia
        + a.mass * radius_a.length_squared()
        + b.inertia
        + b.mass * radius_b.length_squared();
    let angular_momentum = a.inertia * a.angular_velocity
        + radius_a.cross(a.velocity.mul(a.mass))
        + b.inertia * b.angular_velocity
        + radius_b.cross(b.velocity.mul(b.mass));
    let angular_velocity = if compound_inertia > MIN_INERTIA {
        angular_momentum / compound_inertia
    } else {
        0.0
    };
    let velocity_a = linear_velocity.add(Vec2::new(
        -angular_velocity * radius_a.y,
        angular_velocity * radius_a.x,
    ));
    let velocity_b = linear_velocity.add(Vec2::new(
        -angular_velocity * radius_b.y,
        angular_velocity * radius_b.x,
    ));
    let (a, b) = two_bodies_mut(bodies, a_index, b_index);
    a.velocity = velocity_a.finite_or(a.velocity);
    b.velocity = velocity_b.finite_or(b.velocity);
    a.angular_velocity = finite_or(angular_velocity, 0.0);
    b.angular_velocity = finite_or(angular_velocity, 0.0);
}

// ---------------------------------------------------------------------------------------------
// 26.44 Soft Step joints (distance, spring, rope length, revolute, prismatic).
//
// Every joint keeps accumulated impulses that are warm started at the start of each substep.
// Position errors are corrected softly in the biased solve (joint softness: twice the contact
// frequency, damping ratio 2) and not at all in the relax pass; limits use speculative bias so a
// joint can approach a limit exactly; motors clamp the accumulated impulse to the configured
// maximum force or torque (before, the clamp was per iteration, so the effective limit grew with
// the iteration count); limits are one-sided (they used to pull back towards the limit too).
// Springs are implicit (stiffness N/m and damping N·s/m become soft coefficients for the actual
// substep), so their behaviour no longer depends on the iteration count.
// ---------------------------------------------------------------------------------------------

// 向两端施加线冲量与各自的角冲量（关节雅可比形式）。
fn apply_joint_impulse(bodies: &mut [Body], body_a: usize, body_b: usize, linear: Vec2, angular_a: f64, angular_b: f64) {
    let (a, b) = two_bodies_mut(bodies, body_a, body_b);
    if a.inv_mass > 0.0 {
        a.velocity = a.velocity.sub(linear.mul(a.inv_mass));
        a.angular_velocity -= angular_a * a.inv_inertia;
    }
    if b.inv_mass > 0.0 {
        b.velocity = b.velocity.add(linear.mul(b.inv_mass));
        b.angular_velocity += angular_b * b.inv_inertia;
    }
}

// 关节两端的当前锚点偏移。
fn joint_radii(bodies: &[Body], constraint: &ConnectionConstraint) -> (Vec2, Vec2) {
    (
        rotate(constraint.local_anchor_a, bodies[constraint.body_a].angle),
        rotate(constraint.local_anchor_b, bodies[constraint.body_b].angle),
    )
}

// 关节相对角（相对于参考角，规范到 ±π）。
fn joint_angle(bodies: &[Body], constraint: &ConnectionConstraint) -> f64 {
    normalize_angle((bodies[constraint.body_b].angle - bodies[constraint.body_a].angle) - constraint.bind_angle)
}

// 角向有效质量。
fn angular_mass(bodies: &[Body], constraint: &ConnectionConstraint) -> f64 {
    let inverse = bodies[constraint.body_a].inv_inertia + bodies[constraint.body_b].inv_inertia;
    if inverse > 0.0 { 1.0 / inverse } else { 0.0 }
}

// 单边约束（限位、最大长度）：未达到时用推测偏置允许恰好接近，越过时按软度修正。
fn one_sided_bias(error: f64, settings: &StepSolverSettings, use_bias: bool) -> (f64, Softness) {
    if error > 0.0 {
        (error * settings.inverse_h, Softness::RIGID)
    } else if use_bias {
        (settings.joint_softness.bias_rate * error, settings.joint_softness)
    } else {
        (0.0, Softness::RIGID)
    }
}

// 每个子步开始时重新施加累计冲量。
fn warm_start_joint(bodies: &mut [Body], constraint: &ConnectionConstraint) {
    if !soft_joint_active(constraint) {
        return;
    }
    let (radius_a, radius_b) = joint_radii(bodies, constraint);
    match constraint.joint_kind {
        3 => {
            let axial = constraint.motor_impulse + constraint.lower_impulse - constraint.upper_impulse;
            let linear = constraint.linear_impulse;
            apply_joint_impulse(bodies, constraint.body_a, constraint.body_b, linear, radius_a.cross(linear) + axial, radius_b.cross(linear) + axial);
        }
        4 => {
            let a = &bodies[constraint.body_a];
            let b = &bodies[constraint.body_b];
            let delta = b.position.add(radius_b).sub(a.position.add(radius_a));
            let axis = rotate(constraint.joint_axis, a.angle).normalized_or(Vec2::new(1.0, 0.0));
            let perpendicular = axis.perp();
            let (a1, a2) = (delta.add(radius_a).cross(axis), radius_b.cross(axis));
            let (s1, s2) = (delta.add(radius_a).cross(perpendicular), radius_b.cross(perpendicular));
            let axial = constraint.motor_impulse + constraint.lower_impulse - constraint.upper_impulse;
            let perpendicular_impulse = constraint.linear_impulse.x;
            let linear = axis.mul(axial).add(perpendicular.mul(perpendicular_impulse));
            let angular_a = axial * a1 + perpendicular_impulse * s1 + constraint.angular_impulse;
            let angular_b = axial * a2 + perpendicular_impulse * s2 + constraint.angular_impulse;
            apply_joint_impulse(bodies, constraint.body_a, constraint.body_b, linear, angular_a, angular_b);
        }
        7 => {
            let a = &bodies[constraint.body_a];
            let b = &bodies[constraint.body_b];
            let delta = b.position.add(radius_b).sub(a.position.add(radius_a));
            let axis = rotate(constraint.joint_axis, a.angle).normalized_or(Vec2::new(1.0, 0.0));
            let perpendicular = axis.perp();
            let (a1, a2) = (delta.add(radius_a).cross(axis), radius_b.cross(axis));
            let (s1, s2) = (delta.add(radius_a).cross(perpendicular), radius_b.cross(perpendicular));
            let axial = constraint.axial_impulse + constraint.lower_impulse - constraint.upper_impulse;
            let perpendicular_impulse = constraint.linear_impulse.x;
            let linear = axis.mul(axial).add(perpendicular.mul(perpendicular_impulse));
            let angular_a = axial * a1 + perpendicular_impulse * s1 + constraint.motor_impulse;
            let angular_b = axial * a2 + perpendicular_impulse * s2 + constraint.motor_impulse;
            apply_joint_impulse(bodies, constraint.body_a, constraint.body_b, linear, angular_a, angular_b);
        }
        9 => {
            let linear = constraint.linear_impulse;
            apply_joint_impulse(bodies, constraint.body_a, constraint.body_b, linear, radius_a.cross(linear) + constraint.angular_impulse, radius_b.cross(linear) + constraint.angular_impulse);
        }
        _ => {
            let (_, _, axis, _, _) = constraint.geometry(bodies);
            let linear = axis.mul(constraint.axial_impulse);
            apply_joint_impulse(bodies, constraint.body_a, constraint.body_b, linear, radius_a.cross(linear), radius_b.cross(linear));
        }
    }
}

// 关节是否由 Soft Step 求解且处于有效状态。
fn soft_joint_active(constraint: &ConnectionConstraint) -> bool {
    constraint.active && constraint.broken_code == 0 && uses_soft_step(constraint)
}

// 26.44: 每步结束后对转动关节的锚点做位置投影（Box2D v2 的非线性 Gauss-Seidel，只改位姿不改速度）。
// 软约束在剧烈摆动时会让锚点拉开几毫米（链条甩动时约 8 mm）；投影把它收回到线性容差以内。
// 返回本次修正前的最大锚点间隙。
fn project_revolute_positions(bodies: &mut [Body], constraints: &[ConnectionConstraint]) -> f64 {
    let mut largest: f64 = 0.0;
    for constraint in constraints.iter().filter(|constraint| constraint.joint_kind == 3 && soft_joint_active(constraint)) {
        let (body_a, body_b) = (constraint.body_a, constraint.body_b);
        let (radius_a, radius_b) = joint_radii(bodies, constraint);
        let separation = bodies[body_b].position.add(radius_b).sub(bodies[body_a].position.add(radius_a));
        let gap = separation.length();
        largest = largest.max(gap);
        if gap <= 0.25 * LINEAR_SLOP {
            continue;
        }
        let (mass_a, inertia_a, mass_b, inertia_b) = {
            let (a, b) = (&bodies[body_a], &bodies[body_b]);
            let moves = |body: &Body| !body.is_static && !body.is_kinematic && !body.sleeping;
            let (ma, ia) = if moves(a) { (a.inv_mass, a.inv_inertia) } else { (0.0, 0.0) };
            let (mb, ib) = if moves(b) { (b.inv_mass, b.inv_inertia) } else { (0.0, 0.0) };
            (ma, ia, mb, ib)
        };
        let k11 = mass_a + mass_b + inertia_a * radius_a.y * radius_a.y + inertia_b * radius_b.y * radius_b.y;
        let k12 = -inertia_a * radius_a.x * radius_a.y - inertia_b * radius_b.x * radius_b.y;
        let k22 = mass_a + mass_b + inertia_a * radius_a.x * radius_a.x + inertia_b * radius_b.x * radius_b.x;
        let determinant = k11 * k22 - k12 * k12;
        if !is_positive(determinant.abs() - 1.0e-12) {
            continue;
        }
        // Correct at most 0.2 m per pass (Box2D's maximum linear correction).
        let error = if gap > 0.2 { separation.mul(0.2 / gap) } else { separation };
        let impulse = Vec2::new(-(k22 * error.x - k12 * error.y) / determinant, -(k11 * error.y - k12 * error.x) / determinant);
        let (a, b) = two_bodies_mut(bodies, body_a, body_b);
        a.position = a.position.sub(impulse.mul(mass_a));
        a.angle -= inertia_a * radius_a.cross(impulse);
        b.position = b.position.add(impulse.mul(mass_b));
        b.angle += inertia_b * radius_b.cross(impulse);
    }
    largest
}

// 求解一个 Soft Step 关节；use_bias=false 为松弛阶段（不修正位置误差）。
fn solve_soft_joint(bodies: &mut [Body], constraint: &mut ConnectionConstraint, settings: &StepSolverSettings, use_bias: bool) {
    if !soft_joint_active(constraint) || settings.h <= 0.0 {
        return;
    }
    match constraint.joint_kind {
        3 => solve_revolute_soft(bodies, constraint, settings, use_bias),
        4 => solve_prismatic_soft(bodies, constraint, settings, use_bias),
        7 => solve_wheel_soft(bodies, constraint, settings, use_bias),
        9 => solve_weld_soft(bodies, constraint, settings, use_bias),
        _ => solve_distance_soft(bodies, constraint, settings, use_bias),
    }
}

// 26.45: 车轮关节（Box2D v3 b2WheelJoint）：B 的锚点沿 A 上的轴线滑动（垂直方向刚性），沿轴为悬挂弹簧
// （频率与阻尼比），可选平移限位；电机驱动 B 相对 A 的转动（最大电机力作为最大扭矩）。
fn solve_wheel_soft(bodies: &mut [Body], constraint: &mut ConnectionConstraint, settings: &StepSolverSettings, use_bias: bool) {
    let (body_a, body_b) = (constraint.body_a, constraint.body_b);
    let (radius_a, radius_b) = joint_radii(bodies, constraint);
    let (delta, axis) = {
        let a = &bodies[body_a];
        let b = &bodies[body_b];
        (b.position.add(radius_b).sub(a.position.add(radius_a)), rotate(constraint.joint_axis, a.angle).normalized_or(Vec2::new(1.0, 0.0)))
    };
    // Motor: relative rotation.
    let axial_angular_mass = angular_mass(bodies, constraint);
    if constraint.motor_enabled && constraint.max_motor_force > 0.0 && axial_angular_mass > 0.0 {
        let relative = bodies[body_b].angular_velocity - bodies[body_a].angular_velocity;
        let impulse = -axial_angular_mass * (relative - constraint.motor_speed);
        let limit = constraint.max_motor_force * settings.h;
        let accumulated = (constraint.motor_impulse + impulse).clamp(-limit, limit);
        let applied = accumulated - constraint.motor_impulse;
        constraint.motor_impulse = accumulated;
        apply_joint_impulse(bodies, body_a, body_b, Vec2::ZERO, applied, applied);
    }
    let (a1, a2) = (delta.add(radius_a).cross(axis), radius_b.cross(axis));
    let axial_inverse = {
        let a = &bodies[body_a];
        let b = &bodies[body_b];
        a.inv_mass + b.inv_mass + a.inv_inertia * a1 * a1 + b.inv_inertia * a2 * a2
    };
    let axial_mass = if axial_inverse > 0.0 { 1.0 / axial_inverse } else { 0.0 };
    let axial_speed = |bodies: &[Body]| {
        let a = &bodies[body_a];
        let b = &bodies[body_b];
        axis.dot(b.velocity.sub(a.velocity)) + a2 * b.angular_velocity - a1 * a.angular_velocity
    };
    let translation = axis.dot(delta);
    // Suspension spring along the axis (a physical spring: biased solve and relax alike).
    if constraint.spring_hertz > 0.0 && axial_mass > 0.0 {
        let softness = Softness::from_frequency(constraint.spring_hertz, constraint.spring_damping_ratio, settings.h);
        let impulse = -axial_mass * softness.mass_scale * (axial_speed(bodies) + softness.bias_rate * translation) - softness.impulse_scale * constraint.axial_impulse;
        constraint.axial_impulse += impulse;
        apply_joint_impulse(bodies, body_a, body_b, axis.mul(impulse), impulse * a1, impulse * a2);
    } else {
        constraint.axial_impulse = 0.0;
    }
    if constraint.limits_enabled && axial_mass > 0.0 {
        let (bias, softness) = one_sided_bias(translation - constraint.lower_limit, settings, use_bias);
        let impulse = -axial_mass * softness.mass_scale * (axial_speed(bodies) + bias) - softness.impulse_scale * constraint.lower_impulse;
        let accumulated = (constraint.lower_impulse + impulse).max(0.0);
        let applied = accumulated - constraint.lower_impulse;
        constraint.lower_impulse = accumulated;
        apply_joint_impulse(bodies, body_a, body_b, axis.mul(applied), applied * a1, applied * a2);
        let (bias, softness) = one_sided_bias(constraint.upper_limit - translation, settings, use_bias);
        let impulse = -axial_mass * softness.mass_scale * (-axial_speed(bodies) + bias) - softness.impulse_scale * constraint.upper_impulse;
        let accumulated = (constraint.upper_impulse + impulse).max(0.0);
        let applied = accumulated - constraint.upper_impulse;
        constraint.upper_impulse = accumulated;
        apply_joint_impulse(bodies, body_a, body_b, axis.mul(-applied), -applied * a1, -applied * a2);
    }
    // Perpendicular: rigid (joint softness while biased).
    let perpendicular = axis.perp();
    let (s1, s2) = (delta.add(radius_a).cross(perpendicular), radius_b.cross(perpendicular));
    let (perpendicular_mass, perpendicular_speed) = {
        let a = &bodies[body_a];
        let b = &bodies[body_b];
        let inverse = a.inv_mass + b.inv_mass + a.inv_inertia * s1 * s1 + b.inv_inertia * s2 * s2;
        let speed = perpendicular.dot(b.velocity.sub(a.velocity)) + s2 * b.angular_velocity - s1 * a.angular_velocity;
        (if inverse > 0.0 { 1.0 / inverse } else { 0.0 }, speed)
    };
    if perpendicular_mass > 0.0 {
        let softness = if use_bias { settings.joint_softness } else { Softness::RIGID };
        let error = perpendicular.dot(delta);
        let impulse = -perpendicular_mass * softness.mass_scale * (perpendicular_speed + softness.bias_rate * error) - softness.impulse_scale * constraint.linear_impulse.x;
        constraint.linear_impulse.x += impulse;
        apply_joint_impulse(bodies, body_a, body_b, perpendicular.mul(impulse), impulse * s1, impulse * s2);
    }
    let axial = constraint.axial_impulse.abs().max(constraint.lower_impulse).max(constraint.upper_impulse);
    constraint.tension = constraint.tension.max(constraint.linear_impulse.x.abs().max(axial) / settings.h);
    constraint.motor_torque = constraint.motor_torque.max(constraint.motor_impulse.abs() / settings.h);
}

// 26.45: 软焊接关节（Box2D v3 b2WeldJoint）：相对角与锚点重合，各自可设频率；频率为 0 时与其他关节
// 一样只在带偏置求解时使用关节软度（近似刚性）。
fn solve_weld_soft(bodies: &mut [Body], constraint: &mut ConnectionConstraint, settings: &StepSolverSettings, use_bias: bool) {
    let (body_a, body_b) = (constraint.body_a, constraint.body_b);
    let softness_for = |hertz: f64, ratio: f64| {
        if hertz > 0.0 {
            Some(Softness::from_frequency(hertz, ratio, settings.h))
        } else if use_bias {
            Some(settings.joint_softness)
        } else {
            None
        }
    };
    let axial_mass = angular_mass(bodies, constraint);
    if axial_mass > 0.0 {
        let (bias, mass_scale, impulse_scale) = match softness_for(constraint.angular_hertz, constraint.angular_damping_ratio) {
            Some(softness) => (softness.bias_rate * joint_angle(bodies, constraint), softness.mass_scale, softness.impulse_scale),
            None => (0.0, 1.0, 0.0),
        };
        let relative = bodies[body_b].angular_velocity - bodies[body_a].angular_velocity;
        let impulse = -axial_mass * mass_scale * (relative + bias) - impulse_scale * constraint.angular_impulse;
        constraint.angular_impulse += impulse;
        apply_joint_impulse(bodies, body_a, body_b, Vec2::ZERO, impulse, impulse);
    }
    let (radius_a, radius_b) = joint_radii(bodies, constraint);
    let (error, relative_velocity, k11, k12, k22) = {
        let a = &bodies[body_a];
        let b = &bodies[body_b];
        let error = b.position.add(radius_b).sub(a.position.add(radius_a));
        let relative_velocity = b.point_velocity(radius_b).sub(a.point_velocity(radius_a));
        let (k11, k12, k22) = binding_mass_matrix(a, b, radius_a, radius_b);
        (error, relative_velocity, k11, k12, k22)
    };
    let (bias, mass_scale, impulse_scale) = match softness_for(constraint.spring_hertz, constraint.spring_damping_ratio) {
        Some(softness) => (error.mul(softness.bias_rate), softness.mass_scale, softness.impulse_scale),
        None => (Vec2::ZERO, 1.0, 0.0),
    };
    let solved = solve_symmetric_2x2(k11, k12, k22, relative_velocity.add(bias));
    let impulse = solved.mul(-mass_scale).sub(constraint.linear_impulse.mul(impulse_scale));
    constraint.linear_impulse = constraint.linear_impulse.add(impulse);
    apply_joint_impulse(bodies, body_a, body_b, impulse, radius_a.cross(impulse), radius_b.cross(impulse));
    constraint.tension = constraint.tension.max(constraint.linear_impulse.length() / settings.h);
    constraint.motor_torque = constraint.motor_torque.max(constraint.angular_impulse.abs() / settings.h);
}

// 转动关节：电机 → 角度限位 → 锚点重合（2×2 块求解）。
fn solve_revolute_soft(bodies: &mut [Body], constraint: &mut ConnectionConstraint, settings: &StepSolverSettings, use_bias: bool) {
    let axial_mass = angular_mass(bodies, constraint);
    let (body_a, body_b) = (constraint.body_a, constraint.body_b);
    if constraint.motor_enabled && constraint.max_motor_force > 0.0 && axial_mass > 0.0 {
        let relative = bodies[body_b].angular_velocity - bodies[body_a].angular_velocity;
        let impulse = -axial_mass * (relative - constraint.motor_speed);
        let limit = constraint.max_motor_force * settings.h;
        let accumulated = (constraint.motor_impulse + impulse).clamp(-limit, limit);
        let applied = accumulated - constraint.motor_impulse;
        constraint.motor_impulse = accumulated;
        apply_joint_impulse(bodies, body_a, body_b, Vec2::ZERO, applied, applied);
    }
    if constraint.limits_enabled && axial_mass > 0.0 {
        let angle = joint_angle(bodies, constraint);
        // Lower limit: angle - lower >= 0.
        let (bias, softness) = one_sided_bias(angle - constraint.lower_limit, settings, use_bias);
        let relative = bodies[body_b].angular_velocity - bodies[body_a].angular_velocity;
        let impulse = -axial_mass * softness.mass_scale * (relative + bias) - softness.impulse_scale * constraint.lower_impulse;
        let accumulated = (constraint.lower_impulse + impulse).max(0.0);
        let applied = accumulated - constraint.lower_impulse;
        constraint.lower_impulse = accumulated;
        apply_joint_impulse(bodies, body_a, body_b, Vec2::ZERO, applied, applied);
        // Upper limit: upper - angle >= 0.
        let (bias, softness) = one_sided_bias(constraint.upper_limit - angle, settings, use_bias);
        let relative = bodies[body_a].angular_velocity - bodies[body_b].angular_velocity;
        let impulse = -axial_mass * softness.mass_scale * (relative + bias) - softness.impulse_scale * constraint.upper_impulse;
        let accumulated = (constraint.upper_impulse + impulse).max(0.0);
        let applied = accumulated - constraint.upper_impulse;
        constraint.upper_impulse = accumulated;
        apply_joint_impulse(bodies, body_a, body_b, Vec2::ZERO, -applied, -applied);
    }
    let (radius_a, radius_b) = joint_radii(bodies, constraint);
    let (error, relative_velocity, k11, k12, k22) = {
        let a = &bodies[body_a];
        let b = &bodies[body_b];
        let error = b.position.add(radius_b).sub(a.position.add(radius_a));
        let relative_velocity = b.point_velocity(radius_b).sub(a.point_velocity(radius_a));
        let (k11, k12, k22) = binding_mass_matrix(a, b, radius_a, radius_b);
        (error, relative_velocity, k11, k12, k22)
    };
    let softness = if use_bias { settings.joint_softness } else { Softness::RIGID };
    let bias = error.mul(softness.bias_rate);
    let solved = solve_symmetric_2x2(k11, k12, k22, relative_velocity.add(bias));
    let impulse = solved.mul(-softness.mass_scale).sub(constraint.linear_impulse.mul(softness.impulse_scale));
    constraint.linear_impulse = constraint.linear_impulse.add(impulse);
    apply_joint_impulse(bodies, body_a, body_b, impulse, radius_a.cross(impulse), radius_b.cross(impulse));
    constraint.tension = constraint.tension.max(constraint.linear_impulse.length() / settings.h);
    let angular = constraint.motor_impulse.abs().max(constraint.lower_impulse).max(constraint.upper_impulse);
    constraint.motor_torque = constraint.motor_torque.max(angular / settings.h);
}

// 移动关节：电机与平移限位沿轴 → 垂直位移与相对转角（2×2 块求解）。
fn solve_prismatic_soft(bodies: &mut [Body], constraint: &mut ConnectionConstraint, settings: &StepSolverSettings, use_bias: bool) {
    let (body_a, body_b) = (constraint.body_a, constraint.body_b);
    let (radius_a, radius_b) = joint_radii(bodies, constraint);
    let geometry = |bodies: &[Body]| {
        let a = &bodies[body_a];
        let b = &bodies[body_b];
        let delta = b.position.add(radius_b).sub(a.position.add(radius_a));
        let axis = rotate(constraint.joint_axis, a.angle).normalized_or(Vec2::new(1.0, 0.0));
        (delta, axis)
    };
    let (delta, axis) = geometry(bodies);
    let (a1, a2) = (delta.add(radius_a).cross(axis), radius_b.cross(axis));
    let axial_inverse = {
        let a = &bodies[body_a];
        let b = &bodies[body_b];
        a.inv_mass + b.inv_mass + a.inv_inertia * a1 * a1 + b.inv_inertia * a2 * a2
    };
    let axial_mass = if axial_inverse > 0.0 { 1.0 / axial_inverse } else { 0.0 };
    let axial_speed = |bodies: &[Body]| {
        let a = &bodies[body_a];
        let b = &bodies[body_b];
        axis.dot(b.velocity.sub(a.velocity)) + a2 * b.angular_velocity - a1 * a.angular_velocity
    };
    if constraint.motor_enabled && constraint.max_motor_force > 0.0 && axial_mass > 0.0 {
        let impulse = axial_mass * (constraint.motor_speed - axial_speed(bodies));
        let limit = constraint.max_motor_force * settings.h;
        let accumulated = (constraint.motor_impulse + impulse).clamp(-limit, limit);
        let applied = accumulated - constraint.motor_impulse;
        constraint.motor_impulse = accumulated;
        apply_joint_impulse(bodies, body_a, body_b, axis.mul(applied), applied * a1, applied * a2);
    }
    if constraint.limits_enabled && axial_mass > 0.0 {
        let translation = axis.dot(delta);
        let (bias, softness) = one_sided_bias(translation - constraint.lower_limit, settings, use_bias);
        let impulse = -axial_mass * softness.mass_scale * (axial_speed(bodies) + bias) - softness.impulse_scale * constraint.lower_impulse;
        let accumulated = (constraint.lower_impulse + impulse).max(0.0);
        let applied = accumulated - constraint.lower_impulse;
        constraint.lower_impulse = accumulated;
        apply_joint_impulse(bodies, body_a, body_b, axis.mul(applied), applied * a1, applied * a2);
        let (bias, softness) = one_sided_bias(constraint.upper_limit - translation, settings, use_bias);
        let impulse = -axial_mass * softness.mass_scale * (-axial_speed(bodies) + bias) - softness.impulse_scale * constraint.upper_impulse;
        let accumulated = (constraint.upper_impulse + impulse).max(0.0);
        let applied = accumulated - constraint.upper_impulse;
        constraint.upper_impulse = accumulated;
        apply_joint_impulse(bodies, body_a, body_b, axis.mul(-applied), -applied * a1, -applied * a2);
    }
    // Perpendicular translation and relative rotation, solved together.
    let perpendicular = axis.perp();
    let (s1, s2) = (delta.add(radius_a).cross(perpendicular), radius_b.cross(perpendicular));
    let (velocity, k11, k12, k22, error) = {
        let a = &bodies[body_a];
        let b = &bodies[body_b];
        let velocity = Vec2::new(
            perpendicular.dot(b.velocity.sub(a.velocity)) + s2 * b.angular_velocity - s1 * a.angular_velocity,
            b.angular_velocity - a.angular_velocity,
        );
        let k11 = a.inv_mass + b.inv_mass + a.inv_inertia * s1 * s1 + b.inv_inertia * s2 * s2;
        let k12 = a.inv_inertia * s1 + b.inv_inertia * s2;
        let angular_inverse = a.inv_inertia + b.inv_inertia;
        let k22 = if angular_inverse > 0.0 { angular_inverse } else { 1.0 };
        let error = Vec2::new(perpendicular.dot(delta), joint_angle(bodies, constraint));
        (velocity, k11, k12, k22, error)
    };
    let softness = if use_bias { settings.joint_softness } else { Softness::RIGID };
    let solved = solve_symmetric_2x2(k11, k12, k22, velocity.add(error.mul(softness.bias_rate)));
    let impulse = solved.mul(-softness.mass_scale).sub(Vec2::new(constraint.linear_impulse.x, constraint.angular_impulse).mul(softness.impulse_scale));
    constraint.linear_impulse.x += impulse.x;
    constraint.angular_impulse += impulse.y;
    let linear = perpendicular.mul(impulse.x);
    apply_joint_impulse(bodies, body_a, body_b, linear, impulse.x * s1 + impulse.y, impulse.x * s2 + impulse.y);
    let axial = constraint.lower_impulse.max(constraint.upper_impulse);
    constraint.tension = constraint.tension.max(constraint.linear_impulse.x.abs().max(axial) / settings.h);
    constraint.motor_torque = constraint.motor_torque.max(constraint.motor_impulse.abs().max(constraint.angular_impulse.abs()) / settings.h);
}

// 距离类关节：刚性距离、最大长度（单边）和隐式弹簧（可只拉不推）。
fn solve_distance_soft(bodies: &mut [Body], constraint: &mut ConnectionConstraint, settings: &StepSolverSettings, use_bias: bool) {
    let (radius_a, radius_b, axis, length, _) = constraint.geometry(bodies);
    let (body_a, body_b) = (constraint.body_a, constraint.body_b);
    let inverse = {
        let a = &bodies[body_a];
        let b = &bodies[body_b];
        directional_inverse_mass(a, b, radius_a, radius_b, axis)
    };
    if inverse <= 0.0 {
        return;
    }
    let mass = 1.0 / inverse;
    let error = length - constraint.rest_length;
    let relative_speed = {
        let a = &bodies[body_a];
        let b = &bodies[body_b];
        b.point_velocity(radius_b).sub(a.point_velocity(radius_a)).dot(axis)
    };
    // Kind 6 (rope length) and bendable strings only pull.
    let pull_only = constraint.joint_kind == 6 || (constraint.joint_kind != 2 && constraint.bendable);
    let accumulated = if constraint.stretchable {
        // A physical spring acts in the biased solve and the relax pass alike.
        let softness = Softness::from_spring(constraint.stiffness, constraint.damping, inverse, settings.h);
        let impulse = -mass * softness.mass_scale * (relative_speed + softness.bias_rate * error) - softness.impulse_scale * constraint.axial_impulse;
        let next = constraint.axial_impulse + impulse;
        if constraint.bendable { next.min(0.0) } else { next }
    } else if pull_only {
        let (bias, softness) = one_sided_bias(-error, settings, use_bias);
        // The constraint is "rest - length >= 0": its speed is -relative_speed.
        let impulse = -mass * softness.mass_scale * (-relative_speed + bias) - softness.impulse_scale * (-constraint.axial_impulse);
        -((-constraint.axial_impulse + impulse).max(0.0))
    } else {
        let softness = if use_bias { settings.joint_softness } else { Softness::RIGID };
        let impulse = -mass * softness.mass_scale * (relative_speed + softness.bias_rate * error) - softness.impulse_scale * constraint.axial_impulse;
        constraint.axial_impulse + impulse
    };
    let applied = accumulated - constraint.axial_impulse;
    constraint.axial_impulse = accumulated;
    let linear = axis.mul(applied);
    apply_joint_impulse(bodies, body_a, body_b, linear, radius_a.cross(linear), radius_b.cross(linear));
    constraint.tension = constraint.tension.max(constraint.axial_impulse.abs() / settings.h);
}

// 按连接种类分派原求解器路径（刚性绑定与物理绳索）的速度求解。
fn solve_connection_velocity(bodies: &mut [Body], constraint: &mut ConnectionConstraint, dt: f64, iterations: usize) {
    let simulating_fragments = constraint.collision_enabled && constraint.break_link.is_some();
    if !constraint.active || (constraint.broken_code != 0 && !simulating_fragments) || dt <= 0.0 {
        return;
    }
    if constraint.binding || constraint.joint_kind == 1 {
        solve_binding_velocity(bodies, constraint, dt);
        return;
    }
    if constraint.collision_enabled {
        solve_rope_velocity(bodies, constraint, dt, iterations);
    }
}

// 按连接种类分派原求解器路径（刚性绑定与物理绳索）的位置修正。
fn correct_connection_position(bodies: &mut [Body], constraint: &mut ConnectionConstraint) {
    let simulating_fragments = constraint.collision_enabled && constraint.break_link.is_some();
    if !constraint.active || (constraint.broken_code != 0 && !simulating_fragments) {
        return;
    }
    if constraint.binding || constraint.joint_kind == 1 {
        correct_binding_position(bodies, constraint);
        return;
    }
    if constraint.collision_enabled {
        correct_rope_position(bodies, constraint);
    }
}
