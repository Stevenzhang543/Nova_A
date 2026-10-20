// 接触求解器（26.44 Soft Step）：软约束、子步、松弛、恢复系数后处理和累计冲量热启动。
//
// Contacts are collected once per step (with a speculative margin) and solved in every substep
// with fixed anchors: separation is re-evaluated from the bodies' current poses, so no manifold
// is rebuilt inside the step. Each substep warm starts, solves with a soft bias (contact hertz,
// damping ratio, capped push-out speed), integrates positions and relaxes without bias, which
// removes the energy the bias added. Restitution is applied once after the substeps from the
// approach speed measured when the contact was prepared. This follows Box2D v3's "Soft Step".

// 软约束系数：偏置速率、质量缩放、冲量缩放（Catto, "Soft Constraints", GDC 2011）。
#[derive(Clone, Copy, Debug)]
struct Softness {
    bias_rate: f64,
    mass_scale: f64,
    impulse_scale: f64,
}

// 大于零（NaN 为否）。
fn is_positive(value: f64) -> bool {
    value > 0.0
}

impl Softness {
    // 刚性约束：无偏置，完整有效质量。
    const RIGID: Softness = Softness { bias_rate: 0.0, mass_scale: 1.0, impulse_scale: 0.0 };

    // 由频率（赫兹）和阻尼比计算软约束系数；频率为 0 时为刚性。
    fn from_frequency(hertz: f64, damping_ratio: f64, h: f64) -> Self {
        if !is_positive(hertz) || !is_positive(h) {
            return Self::RIGID;
        }
        let omega = 2.0 * std::f64::consts::PI * hertz;
        let a1 = 2.0 * damping_ratio.max(0.0) + h * omega;
        let a2 = h * omega * a1;
        let a3 = 1.0 / (1.0 + a2);
        Self { bias_rate: omega / a1, mass_scale: a2 * a3, impulse_scale: a3 }
    }

    // 由刚度（N/m）和阻尼（N·s/m）计算隐式弹簧的软约束系数（有效质量的倒数为 inverse_mass）。
    fn from_spring(stiffness: f64, damping: f64, inverse_mass: f64, h: f64) -> Self {
        let stiffness = stiffness.max(0.0);
        let damping = damping.max(0.0);
        let denominator = damping + h * stiffness;
        if !is_positive(h) || !is_positive(denominator) || !is_positive(inverse_mass) {
            return Self { bias_rate: 0.0, mass_scale: 0.0, impulse_scale: 0.0 };
        }
        // gamma = 1 / (h (c + h k)), beta = h k / (c + h k); bias = beta / h · C.
        let gamma = 1.0 / (h * denominator);
        let effective_mass = 1.0 / inverse_mass;
        let mass_scale = 1.0 / (1.0 + gamma * effective_mass);
        Self { bias_rate: stiffness / denominator, mass_scale, impulse_scale: mass_scale * gamma * effective_mass }
    }
}

// 每步的求解参数：子步时间、接触与关节软度、最大推出速度。
#[derive(Clone, Copy, Debug)]
struct StepSolverSettings {
    h: f64,
    inverse_h: f64,
    contact_softness: Softness,
    static_softness: Softness,
    joint_softness: Softness,
    max_push_speed: f64,
}

// 26.44: defaults after Box2D v3 (contacts at most a quarter of the substep rate, here up to 60 Hz
// instead of 30 because Nova runs 8 substeps by default, damping ratio 10, push-out at most
// 3 m/s; joints twice the contact frequency, damping ratio 2).
const CONTACT_HERTZ: f64 = 60.0;
const CONTACT_DAMPING_RATIO: f64 = 10.0;
const CONTACT_PUSH_MAX_SPEED: f64 = 3.0;
const JOINT_DAMPING_RATIO: f64 = 2.0;
// Contacts start this far before the shapes touch (plus the distance they can close in a step).
const SPECULATIVE_DISTANCE: f64 = 4.0 * LINEAR_SLOP;

impl StepSolverSettings {
    // 由子步时间计算本步的接触与关节软度。
    fn new(h: f64) -> Self {
        let substep_rate = if h > 0.0 { 1.0 / h } else { 0.0 };
        let contact_hertz = CONTACT_HERTZ.min(0.25 * substep_rate);
        Self {
            h,
            inverse_h: substep_rate,
            contact_softness: Softness::from_frequency(contact_hertz, CONTACT_DAMPING_RATIO, h),
            static_softness: Softness::from_frequency(2.0 * contact_hertz, CONTACT_DAMPING_RATIO, h),
            joint_softness: Softness::from_frequency(2.0 * contact_hertz, JOINT_DAMPING_RATIO, h),
            max_push_speed: CONTACT_PUSH_MAX_SPEED,
        }
    }
}

#[derive(Clone, Debug)]
struct Contact {
    body_a: usize,
    body_b: usize,
    child_a: u32,
    child_b: u32,
    feature_id: u32,
    normal: Vec2,
    tangent: Vec2,
    /// Penetration when the contact was collected (negative: speculative, still apart).
    depth: f64,
    /// Anchors from each body's position, world-oriented when collected (fixed Jacobian).
    radius_a: Vec2,
    radius_b: Vec2,
    /// The same anchors in each body's frame, for the current separation inside substeps.
    local_a: Vec2,
    local_b: Vec2,
    initial_relative_velocity: Vec2,
    /// Approach speed along the normal when collected (negative when approaching).
    initial_normal_velocity: f64,
    restitution: f64,
    restitution_threshold: f64,
    static_friction: f64,
    dynamic_friction: f64,
    normal_mass: f64,
    tangent_mass: f64,
    normal_impulse: f64,
    tangent_impulse: f64,
    max_normal_impulse: f64,
    is_sensor: bool,
    /// 26.43: false when neither side can move this step (static, sleeping or a resting
    /// kinematic body). Inactive contacts are still reported but not solved.
    active: bool,
    /// One side cannot be moved by contacts (static or kinematic): stiffer softness.
    against_immovable: bool,
}

// 拆分刚体切片以安全取得两个不重叠的可变引用。
fn two_bodies_mut(bodies: &mut [Body], a: usize, b: usize) -> (&mut Body, &mut Body) {
    debug_assert_ne!(a, b);
    if a < b {
        let (left, right) = bodies.split_at_mut(b);
        (&mut left[a], &mut right[0])
    } else {
        let (left, right) = bodies.split_at_mut(a);
        (&mut right[0], &mut left[b])
    }
}

// 将大小相等、方向相反的接触冲量施加到两个刚体。
fn apply_pair_impulse(
    bodies: &mut [Body],
    body_a: usize,
    body_b: usize,
    impulse: Vec2,
    radius_a: Vec2,
    radius_b: Vec2,
) {
    let (a, b) = two_bodies_mut(bodies, body_a, body_b);
    a.apply_impulse(impulse.neg(), radius_a);
    b.apply_impulse(impulse, radius_b);
}

// 沿方向的有效质量倒数。
fn directional_inverse_mass(a: &Body, b: &Body, radius_a: Vec2, radius_b: Vec2, direction: Vec2) -> f64 {
    let cross_a = radius_a.cross(direction);
    let cross_b = radius_b.cross(direction);
    a.inv_mass + b.inv_mass + cross_a * cross_a * a.inv_inertia + cross_b * cross_b * b.inv_inertia
}

// 计算接触的法向/切向有效质量（每步一次，锚点在步内固定）。
fn prepare_contact(bodies: &[Body], contact: &mut Contact) {
    let a = &bodies[contact.body_a];
    let b = &bodies[contact.body_b];
    let normal_inverse = directional_inverse_mass(a, b, contact.radius_a, contact.radius_b, contact.normal);
    let tangent_inverse = directional_inverse_mass(a, b, contact.radius_a, contact.radius_b, contact.tangent);
    contact.normal_mass = if normal_inverse > 0.0 { 1.0 / normal_inverse } else { 0.0 };
    contact.tangent_mass = if tangent_inverse > 0.0 { 1.0 / tangent_inverse } else { 0.0 };
    contact.against_immovable = a.inv_mass <= 0.0 || b.inv_mass <= 0.0;
    contact.max_normal_impulse = 0.0;
}

// 由两端当前位姿计算接触分离量（负值为穿透），无需重建流形。
fn contact_separation(bodies: &[Body], contact: &Contact) -> f64 {
    let a = &bodies[contact.body_a];
    let b = &bodies[contact.body_b];
    let anchor_a = a.position.add(rotate(contact.local_a, a.angle));
    let anchor_b = b.position.add(rotate(contact.local_b, b.angle));
    anchor_b.sub(anchor_a).dot(contact.normal) - contact.depth
}

// 两端在固定锚点处的相对速度。
fn contact_relative_velocity(bodies: &[Body], contact: &Contact) -> Vec2 {
    bodies[contact.body_b]
        .point_velocity(contact.radius_b)
        .sub(bodies[contact.body_a].point_velocity(contact.radius_a))
}

// 一个流形（同一对形状、同一法线）的接触点在 contacts 中的连续区间。
fn manifold_ranges(contacts: &[Contact]) -> Vec<std::ops::Range<usize>> {
    let mut ranges = Vec::new();
    let mut start = 0;
    for index in 1..=contacts.len() {
        let split = index == contacts.len() || {
            let (previous, current) = (&contacts[index - 1], &contacts[index]);
            (previous.body_a, previous.body_b, previous.child_a, previous.child_b) != (current.body_a, current.body_b, current.child_a, current.child_b)
                || previous.normal.dot(current.normal) < 0.999
        };
        if split {
            ranges.push(start..index);
            start = index;
        }
    }
    ranges
}

// 求解一个接触点的法向冲量（软约束或推测约束），冲量累计并夹紧。
fn solve_contact_normal(bodies: &mut [Body], contact: &mut Contact, settings: &StepSolverSettings, use_bias: bool) {
    if contact.is_sensor || !contact.active || contact.normal_mass <= 0.0 {
        return;
    }
    let separation = contact_separation(bodies, contact);
    let mut bias = 0.0;
    let mut mass_scale = 1.0;
    let mut impulse_scale = 0.0;
    if separation > 0.0 {
        // Speculative: allow the bodies to close the gap within this substep, not more.
        bias = separation * settings.inverse_h;
    } else if use_bias {
        let softness = if contact.against_immovable { settings.static_softness } else { settings.contact_softness };
        bias = (softness.mass_scale * softness.bias_rate * separation).max(-settings.max_push_speed);
        mass_scale = softness.mass_scale;
        impulse_scale = softness.impulse_scale;
    }
    let normal_speed = contact_relative_velocity(bodies, contact).dot(contact.normal);
    let impulse = -contact.normal_mass * (mass_scale * normal_speed + bias) - impulse_scale * contact.normal_impulse;
    let accumulated = (contact.normal_impulse + impulse).max(0.0);
    let applied = accumulated - contact.normal_impulse;
    contact.normal_impulse = accumulated;
    contact.max_normal_impulse = contact.max_normal_impulse.max(applied);
    if applied != 0.0 {
        apply_pair_impulse(bodies, contact.body_a, contact.body_b, contact.normal.mul(applied), contact.radius_a, contact.radius_b);
    }
}

// 求解一个接触点的摩擦冲量（静/动摩擦，以本点法向冲量为上限）。
fn solve_contact_friction(bodies: &mut [Body], contact: &mut Contact) {
    // No early exit on a zero normal impulse: the friction limit is then zero and a tangent impulse
    // left from an earlier substep must be removed, or warm starting re-applies it every substep.
    if contact.is_sensor || !contact.active || contact.tangent_mass <= 0.0 {
        return;
    }
    let tangent_speed = contact_relative_velocity(bodies, contact).dot(contact.tangent);
    let candidate = contact.tangent_impulse - tangent_speed * contact.tangent_mass;
    let static_limit = contact.static_friction * contact.normal_impulse;
    let dynamic_limit = contact.dynamic_friction * contact.normal_impulse;
    let accumulated = if candidate.abs() <= static_limit {
        candidate
    } else {
        candidate.clamp(-dynamic_limit, dynamic_limit)
    };
    let applied = accumulated - contact.tangent_impulse;
    contact.tangent_impulse = accumulated;
    if applied != 0.0 {
        apply_pair_impulse(bodies, contact.body_a, contact.body_b, contact.tangent.mul(applied), contact.radius_a, contact.radius_b);
    }
}

// 一个点的软约束参数：等效柔度 gamma（相对该点有效质量）与偏置速度。推测点与松弛阶段为刚性。
fn normal_target(bodies: &[Body], contact: &Contact, settings: &StepSolverSettings, use_bias: bool) -> (f64, f64) {
    let separation = contact_separation(bodies, contact);
    if separation > 0.0 {
        return (0.0, separation * settings.inverse_h);
    }
    if !use_bias {
        return (0.0, 0.0);
    }
    let softness = if contact.against_immovable { settings.static_softness } else { settings.contact_softness };
    if softness.mass_scale <= 0.0 || contact.normal_mass <= 0.0 {
        return (0.0, 0.0);
    }
    // Same as Box2D: the bias is mass_scale * bias_rate * s, capped at the push-out speed; the
    // single-point update -m (ms vn + bias) - is λ equals a compliance gamma = (1/ms - 1) / m.
    let bias = (softness.mass_scale * softness.bias_rate * separation).max(-settings.max_push_speed) / softness.mass_scale;
    let gamma = (1.0 / softness.mass_scale - 1.0) / contact.normal_mass;
    (gamma, bias)
}

// 26.44: 两点流形的法向冲量块求解（Box2D 2.4 的 2×2 线性互补，推广到软约束）。逐点 Gauss-Seidel 在
// 方块平落时先解的那一点会吃下全部冲击，产生虚假转动，摩擦随后把它变成滑移与翻滚；同时求解两点
// 保持对称。矩阵病态时回到逐点求解。
fn solve_manifold_normals(bodies: &mut [Body], points: &mut [Contact], settings: &StepSolverSettings, use_bias: bool) {
    let block = points.len() == 2 && points.iter().all(|point| !point.is_sensor && point.active && point.normal_mass > 0.0);
    if !block {
        for contact in points.iter_mut() {
            solve_contact_normal(bodies, contact, settings, use_bias);
        }
        return;
    }
    let (body_a, body_b, normal) = (points[0].body_a, points[0].body_b, points[0].normal);
    let (inv_mass_a, inv_inertia_a, inv_mass_b, inv_inertia_b) = {
        let a = &bodies[body_a];
        let b = &bodies[body_b];
        (a.inv_mass, a.inv_inertia, b.inv_mass, b.inv_inertia)
    };
    let rn = |point: &Contact| (point.radius_a.cross(normal), point.radius_b.cross(normal));
    let (rn_a1, rn_b1) = rn(&points[0]);
    let (rn_a2, rn_b2) = rn(&points[1]);
    let k11 = inv_mass_a + inv_mass_b + inv_inertia_a * rn_a1 * rn_a1 + inv_inertia_b * rn_b1 * rn_b1;
    let k22 = inv_mass_a + inv_mass_b + inv_inertia_a * rn_a2 * rn_a2 + inv_inertia_b * rn_b2 * rn_b2;
    let k12 = inv_mass_a + inv_mass_b + inv_inertia_a * rn_a1 * rn_a2 + inv_inertia_b * rn_b1 * rn_b2;
    let (gamma_1, bias_1) = normal_target(bodies, &points[0], settings, use_bias);
    let (gamma_2, bias_2) = normal_target(bodies, &points[1], settings, use_bias);
    let a11 = k11 + gamma_1;
    let a22 = k22 + gamma_2;
    let a12 = k12;
    let determinant = a11 * a22 - a12 * a12;
    if !is_positive(determinant - 1.0e-9 * a11 * a22) {
        for contact in points.iter_mut() {
            solve_contact_normal(bodies, contact, settings, use_bias);
        }
        return;
    }
    let speed = |bodies: &[Body], point: &Contact| contact_relative_velocity(bodies, point).dot(normal);
    let (old_1, old_2) = (points[0].normal_impulse, points[1].normal_impulse);
    // Residual r = A x + q, with q = vn + bias - K x_old (the soft terms make A = K + diag(gamma)).
    let q1 = speed(bodies, &points[0]) + bias_1 - (k11 * old_1 + k12 * old_2);
    let q2 = speed(bodies, &points[1]) + bias_2 - (k12 * old_1 + k22 * old_2);
    let both = ((-q1 * a22 + q2 * a12) / determinant, (-q2 * a11 + q1 * a12) / determinant);
    let solution = if both.0 >= 0.0 && both.1 >= 0.0 {
        both
    } else if -q1 / a11 >= 0.0 && a12 * (-q1 / a11) + q2 >= 0.0 {
        (-q1 / a11, 0.0)
    } else if -q2 / a22 >= 0.0 && a12 * (-q2 / a22) + q1 >= 0.0 {
        (0.0, -q2 / a22)
    } else if q1 >= 0.0 && q2 >= 0.0 {
        (0.0, 0.0)
    } else {
        for contact in points.iter_mut() {
            solve_contact_normal(bodies, contact, settings, use_bias);
        }
        return;
    };
    for (point, accumulated) in points.iter_mut().zip([solution.0, solution.1]) {
        let applied = accumulated - point.normal_impulse;
        point.normal_impulse = accumulated;
        point.max_normal_impulse = point.max_normal_impulse.max(applied);
        if applied != 0.0 {
            apply_pair_impulse(bodies, point.body_a, point.body_b, normal.mul(applied), point.radius_a, point.radius_b);
        }
    }
}

// 求解全部接触：每个流形先解法向（两点流形块求解）；摩擦只在松弛阶段求解（与 Box2D v3 相同），
// 否则偏置推出造成的瞬时转动会被摩擦转成横向滑移。
fn solve_contacts(bodies: &mut [Body], contacts: &mut [Contact], ranges: &[std::ops::Range<usize>], settings: &StepSolverSettings, use_bias: bool) {
    for range in ranges {
        let points = &mut contacts[range.clone()];
        solve_manifold_normals(bodies, points, settings, use_bias);
        if !use_bias {
            for contact in points.iter_mut() {
                solve_contact_friction(bodies, contact);
            }
        }
    }
}

// 子步结束后按接触时的接近速度施加恢复系数（反弹），只作用于确实承受过冲量的接触。
fn apply_contact_restitution(bodies: &mut [Body], contact: &mut Contact) {
    if contact.is_sensor
        || !contact.active
        || contact.restitution <= 0.0
        || contact.normal_mass <= 0.0
        || contact.initial_normal_velocity > -contact.restitution_threshold
        || contact.max_normal_impulse <= 0.0
    {
        return;
    }
    let normal_speed = contact_relative_velocity(bodies, contact).dot(contact.normal);
    let impulse = -contact.normal_mass * (normal_speed + contact.restitution * contact.initial_normal_velocity);
    let accumulated = (contact.normal_impulse + impulse).max(0.0);
    let applied = accumulated - contact.normal_impulse;
    contact.normal_impulse = accumulated;
    contact.max_normal_impulse = contact.max_normal_impulse.max(applied);
    if applied != 0.0 {
        apply_pair_impulse(bodies, contact.body_a, contact.body_b, contact.normal.mul(applied), contact.radius_a, contact.radius_b);
    }
}

type ContactCacheKey = (usize, usize, u32, u32, u32);

// 提取接触两端与子形状身份，生成热启动缓存键。
fn contact_cache_key(contact: &Contact) -> ContactCacheKey {
    (contact.body_a, contact.body_b, contact.child_a, contact.child_b, contact.feature_id)
}

// 把累计的法向和切向冲量重新施加到接触对（每个子步开始时）。
fn warm_start_contact(bodies: &mut [Body], contact: &Contact) {
    if contact.is_sensor || !contact.active { return; }
    let impulse = contact.normal.mul(contact.normal_impulse).add(contact.tangent.mul(contact.tangent_impulse));
    if impulse.length_squared() > 0.0 {
        apply_pair_impulse(bodies, contact.body_a, contact.body_b, impulse, contact.radius_a, contact.radius_b);
    }
}
