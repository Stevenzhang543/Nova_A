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
}

#[derive(Clone, Copy, Debug)]
struct RopeNode {
    position: Vec2,
    velocity: Vec2,
}

impl ConnectionConstraint {
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
            .map(|node_index| {
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
        })
    }

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

    fn link_lengths(&self, bodies: &[Body], physical_rope: bool) -> Vec<f64> {
        if !physical_rope {
            return vec![self.geometry(bodies).3];
        }
        (0..rope_point_count(self) - 1)
            .map(|point| {
                rope_point_position(self, bodies, point + 1)
                    .sub(rope_point_position(self, bodies, point))
                    .length()
            })
            .collect()
    }

    fn strongest_stretch(&self) -> (usize, f64) {
        self.link_tensions
            .iter()
            .copied()
            .enumerate()
            .max_by(|a, b| a.1.total_cmp(&b.1))
            .unwrap_or((0, self.tension))
    }

    fn strongest_bend(&self, bodies: &[Body], physical_rope: bool) -> (usize, f64) {
        if !physical_rope {
            return (0, self.tension * self.bend_amount);
        }
        let positions: Vec<Vec2> = (0..rope_point_count(self))
            .map(|point| rope_point_position(self, bodies, point))
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
            .max_by(|a, b| a.1.total_cmp(&b.1))
            .map(|entry| entry.0)
            .unwrap_or(stretch_link);
        self.break_link = physical_rope.then_some(if stretch_force > 0.0 {
            stretch_link
        } else {
            longest_link
        });
    }

    fn evaluate_failure(&mut self, bodies: &[Body]) {
        if !self.active || self.broken_code != 0 || self.binding {
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

fn load_ratio(force: f64, tolerance_mass: f64) -> f64 {
    if tolerance_mass > 0.0 {
        force / STANDARD_GRAVITY / tolerance_mass
    } else if force > 0.0 {
        f64::INFINITY
    } else {
        0.0
    }
}

fn rope_point_count(constraint: &ConnectionConstraint) -> usize {
    constraint.rope_nodes.len() + 2
}

fn rope_node_inverse_mass(constraint: &ConnectionConstraint) -> f64 {
    let node_count = constraint.rope_nodes.len().max(1) as f64;
    let node_mass =
        (constraint.linear_density * constraint.rest_length / node_count).max(MIN_DIMENSION);
    1.0 / node_mass
}

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

fn solve_rope_velocity(bodies: &mut [Body], constraint: &mut ConnectionConstraint, dt: f64) {
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
            constraint.tension = constraint.tension.max(force.abs());
            constraint.link_tensions[point_a] = constraint.link_tensions[point_a].max(force.abs());
            -force * dt / SOLVER_ITERATIONS as f64
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
            .map(|point| rope_point_position(constraint, bodies, point))
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

fn rope_collision_body(node: RopeNode, radius: f64, mass: f64, layer: i64) -> Body {
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
        is_static: false,
        is_kinematic: false,
        is_sensor: false,
        layer,
    }
}

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
    layer: i64,
}

#[derive(Clone, Copy)]
struct RopeContactKinematics {
    normal: Vec2,
    radius_body: Vec2,
    relative_velocity: Vec2,
    normal_scalar: f64,
}

fn rope_can_collide_with_body(
    constraint: &ConnectionConstraint,
    body: &Body,
    body_index: usize,
    layer: i64,
) -> bool {
    body_index != constraint.body_a
        && body_index != constraint.body_b
        && body.layer == layer
        && !body.is_sensor
}

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
    );
    for manifold in collide(&sample_body, &bodies[body_index]) {
        resolve_rope_manifold(bodies, constraint, sample, body_index, manifold);
    }
}

fn resolve_rope_collisions(bodies: &mut [Body], constraint: &mut ConnectionConstraint) {
    if !constraint.active || !constraint.collision_enabled || constraint.rope_nodes.is_empty() {
        return;
    }
    let layer = bodies[constraint.body_a].layer;
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
                if !rope_can_collide_with_body(constraint, &bodies[body_index], body_index, layer) {
                    continue;
                }
                resolve_rope_sample_body(
                    bodies,
                    constraint,
                    RopeSample { link, ratio, layer },
                    body_index,
                );
            }
        }
    }
}

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
        let (a, b) = two_bodies_mut(bodies, constraint.body_a, constraint.body_b);
        a.angular_velocity -= angular_impulse * a.inv_inertia;
        b.angular_velocity += angular_impulse * b.inv_inertia;
    }
}

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

fn synchronize_binding_motion(bodies: &mut [Body], constraint: &ConnectionConstraint) {
    if !constraint.binding || !constraint.active {
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

fn solve_connection_velocity(bodies: &mut [Body], constraint: &mut ConnectionConstraint, dt: f64) {
    let simulating_fragments = constraint.collision_enabled && constraint.break_link.is_some();
    if !constraint.active || (constraint.broken_code != 0 && !simulating_fragments) || dt <= 0.0 {
        return;
    }
    if constraint.binding {
        solve_binding_velocity(bodies, constraint, dt);
        return;
    }
    if constraint.collision_enabled {
        solve_rope_velocity(bodies, constraint, dt);
        return;
    }
    let (radius_a, radius_b, normal, length, _) = constraint.geometry(bodies);
    let error = length - constraint.rest_length;
    if constraint.bendable && error <= 0.0 {
        constraint.tension = 0.0;
        return;
    }

    let (denominator, relative_speed) = {
        let a = &bodies[constraint.body_a];
        let b = &bodies[constraint.body_b];
        let relative_velocity = b.point_velocity(radius_b).sub(a.point_velocity(radius_a));
        let cross_a = radius_a.cross(normal);
        let cross_b = radius_b.cross(normal);
        (
            a.inv_mass
                + b.inv_mass
                + cross_a * cross_a * a.inv_inertia
                + cross_b * cross_b * b.inv_inertia,
            relative_velocity.dot(normal),
        )
    };
    if denominator <= 0.0 {
        return;
    }

    let impulse = if constraint.stretchable {
        let raw_force = constraint.stiffness * error + constraint.damping * relative_speed;
        let force = if constraint.bendable {
            raw_force.max(0.0)
        } else {
            raw_force
        };
        constraint.tension = constraint.tension.max(force.abs());
        -force * dt / SOLVER_ITERATIONS as f64
    } else {
        let bias = 0.25 * error / dt;
        let impulse = -(relative_speed + bias) / denominator;
        constraint.tension = constraint.tension.max((impulse / dt).abs());
        impulse
    };

    if impulse != 0.0 {
        apply_pair_impulse(
            bodies,
            constraint.body_a,
            constraint.body_b,
            normal.mul(impulse),
            radius_a,
            radius_b,
        );
    }
}

fn correct_connection_position(bodies: &mut [Body], constraint: &mut ConnectionConstraint) {
    let simulating_fragments = constraint.collision_enabled && constraint.break_link.is_some();
    if !constraint.active || (constraint.broken_code != 0 && !simulating_fragments) {
        return;
    }
    if constraint.binding {
        correct_binding_position(bodies, constraint);
        return;
    }
    if constraint.collision_enabled {
        correct_rope_position(bodies, constraint);
        return;
    }
    let (radius_a, radius_b, normal, length, _) = constraint.geometry(bodies);
    let error = length - constraint.rest_length;
    if constraint.stretchable || (constraint.bendable && error <= POSITION_SLOP) {
        return;
    }
    let a = &bodies[constraint.body_a];
    let b = &bodies[constraint.body_b];
    let cross_a = radius_a.cross(normal);
    let cross_b = radius_b.cross(normal);
    let denominator = a.inv_mass
        + b.inv_mass
        + cross_a * cross_a * a.inv_inertia
        + cross_b * cross_b * b.inv_inertia;
    if denominator <= 0.0 {
        return;
    }
    let correction = normal.mul(error * 0.75 / denominator);
    let (a, b) = two_bodies_mut(bodies, constraint.body_a, constraint.body_b);
    a.position = a
        .position
        .add(correction.mul(a.inv_mass))
        .finite_or(a.position);
    a.angle = normalize_angle(a.angle + radius_a.cross(correction) * a.inv_inertia);
    b.position = b
        .position
        .sub(correction.mul(b.inv_mass))
        .finite_or(b.position);
    b.angle = normalize_angle(b.angle - radius_b.cross(correction) * b.inv_inertia);
}

