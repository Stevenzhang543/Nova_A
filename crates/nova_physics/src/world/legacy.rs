// 26.43: 连续碰撞改为逐物体扫掠。旧版用全局子步（任一快速物体最多把整个世界推到 128 个子步，
// 仍可能穿透）；现在只对开启连续碰撞且本子步位移超过自身尺寸四分之一的物体，按其尺寸分段检测，
// 找到首个重叠段后二分细化到最早接触点，物体停在刚接触处，由接触求解器处理反弹或停止。
fn continuous_sweep_samples(body: &Body, travel: f64) -> usize {
    let permitted = body.minimum_collider_extent() * 0.25;
    if permitted.is_nan() || permitted <= 0.0 || travel <= permitted {
        return 0;
    }
    ((travel / permitted).ceil() as usize).clamp(2, MAX_CCD_SAMPLES)
}

// 判断两刚体（含复合子形状）是否有会产生实体接触的重叠；传感器与单向平台的放行方向不计。
fn bodies_touch(body_a: &Body, body_b: &Body) -> bool {
    let variants_a = std::iter::once(None).chain((0..body_a.collider_children.len()).map(Some));
    for child_a in variants_a {
        let proxy_a = body_a.collider_proxy(child_a);
        if proxy_a.is_sensor {
            continue;
        }
        let variants_b =
            std::iter::once(None).chain((0..body_b.collider_children.len()).map(Some));
        for child_b in variants_b {
            let proxy_b = body_b.collider_proxy(child_b);
            if proxy_b.is_sensor || !proxy_a.can_collide_with(&proxy_b) {
                continue;
            }
            if collide(&proxy_a, &proxy_b).iter().any(/* 单向平台只在阻挡方向算接触。 */ |manifold| {
                proxy_a.accepts_one_way_contact(&proxy_b, manifold.normal)
                    && proxy_b.accepts_one_way_contact(&proxy_a, manifold.normal.neg())
            }) {
                return true;
            }
        }
    }
    false
}

// 合并两个包围盒。
fn union_aabb(first: Aabb, second: Aabb) -> Aabb {
    Aabb {
        min_x: first.min_x.min(second.min_x),
        max_x: first.max_x.max(second.max_x),
        min_y: first.min_y.min(second.min_y),
        max_y: first.max_y.max(second.max_y),
    }
}

// 26.45: one body's motion over a substep: start position, start angle, translation and turn.
type SweepMotion = (Vec2, f64, Vec2, f64);

// 对本子步移动过快的连续碰撞刚体逐段扫掠，把它放回最早接触的位置。
// 26.45: 另一个同样高速扫掠的连续碰撞刚体（子弹对子弹）在同一比例处插值，而不是停在终点，
// 两颗相向的子弹因此在相遇处停下，不再互相穿过。
fn sweep_continuous_bodies(
    bodies: &mut [Body],
    start_poses: &[(Vec2, f64)],
    bound_pairs: &HashSet<(usize, usize)>,
) {
    // Fast continuous movers of this substep: (start position, start angle, translation, turn).
    let motion = |bodies: &[Body], index: usize| -> Option<SweepMotion> {
        let body = &bodies[index];
        if body.is_static || body.is_kinematic || body.sleeping || !body.continuous_collision {
            return None;
        }
        let (start_position, start_angle) = start_poses[index];
        let delta = body.position.sub(start_position);
        let turn = normalize_angle(body.angle - start_angle);
        let travel = delta.length() + turn.abs() * body.maximum_collider_radius();
        (continuous_sweep_samples(body, travel) > 0).then_some((start_position, start_angle, delta, turn))
    };
    for index in 0..bodies.len() {
        let Some((start_position, start_angle, delta, turn)) = motion(bodies, index) else {
            continue;
        };
        let body = &bodies[index];
        let travel = delta.length() + turn.abs() * body.maximum_collider_radius();
        let samples = continuous_sweep_samples(body, travel);
        let mut moving = body.clone();
        moving.position = start_position;
        moving.angle = start_angle;
        let swept = union_aabb(moving.compound_aabb(), body.compound_aabb());
        // Candidates and, for other fast movers, their own sweep.
        let candidates: Vec<(usize, Option<SweepMotion>)> = (0..bodies.len())
            .filter(|&other| other != index && !bound_pairs.contains(&(index.min(other), index.max(other))))
            .filter_map(|other| {
                let other_motion = motion(bodies, other);
                let other_bounds = match other_motion {
                    Some((position, angle, _, _)) => {
                        let mut start = bodies[other].clone();
                        start.position = position;
                        start.angle = angle;
                        if bodies_touch(&moving, &start) {
                            return None;
                        }
                        union_aabb(start.compound_aabb(), bodies[other].compound_aabb())
                    }
                    None => {
                        if bodies_touch(&moving, &bodies[other]) {
                            return None;
                        }
                        bodies[other].compound_aabb()
                    }
                };
                other_bounds.overlaps(swept).then_some((other, other_motion))
            })
            .collect();
        if candidates.is_empty() {
            continue;
        }
        let pose = /* 按比例插值本子步的位置与角度。 */ |target: &mut Body, start: Vec2, angle: f64, delta: Vec2, turn: f64, fraction: f64| {
            target.position = start.add(delta.mul(fraction));
            target.angle = normalize_angle(angle + turn * fraction);
        };
        let touches = /* 当前比例下是否碰到任一候选物体（高速候选同样插值）。 */ |moving: &Body, bodies: &[Body], fraction: f64| {
            candidates.iter().any(|&(other, other_motion)| match other_motion {
                Some((position, angle, delta, turn)) => {
                    let mut posed = bodies[other].clone();
                    pose(&mut posed, position, angle, delta, turn, fraction);
                    bodies_touch(moving, &posed)
                }
                None => bodies_touch(moving, &bodies[other]),
            })
        };
        let mut clear = 0.0;
        let mut blocked = None;
        for sample in 1..=samples {
            let fraction = sample as f64 / samples as f64;
            pose(&mut moving, start_position, start_angle, delta, turn, fraction);
            if touches(&moving, bodies, fraction) {
                blocked = Some(fraction);
                break;
            }
            clear = fraction;
        }
        let Some(mut hit) = blocked else {
            continue;
        };
        for _ in 0..CCD_REFINEMENT_STEPS {
            let middle = (clear + hit) * 0.5;
            pose(&mut moving, start_position, start_angle, delta, turn, middle);
            if touches(&moving, bodies, middle) {
                hit = middle;
            } else {
                clear = middle;
            }
        }
        pose(&mut moving, start_position, start_angle, delta, turn, hit);
        bodies[index].position = moving.position;
        bodies[index].angle = moving.angle;
    }
}

// 26.45: 目标（鼠标）关节：把刚体上的锚点软性拉向世界目标点（Box2D v3 b2MouseJoint），最大力限制冲量。
#[derive(Clone, Copy, Debug)]
struct BodyTarget {
    body: usize,
    local_anchor: Vec2,
    target: Vec2,
    hertz: f64,
    damping_ratio: f64,
    max_force: f64,
    impulse: Vec2,
}

// 子步开始时重新施加累计冲量。
fn warm_start_target(bodies: &mut [Body], target: &BodyTarget) {
    let Some(body) = bodies.get_mut(target.body) else { return };
    if body.inv_mass <= 0.0 || target.impulse.length_squared() == 0.0 {
        return;
    }
    let radius = rotate(target.local_anchor, body.angle);
    body.velocity = body.velocity.add(target.impulse.mul(body.inv_mass));
    body.angular_velocity += radius.cross(target.impulse) * body.inv_inertia;
}

// 软弹簧（频率、阻尼比）求解，累计冲量长度不超过 最大力 × 子步时间。
fn solve_target(bodies: &mut [Body], target: &mut BodyTarget, settings: &StepSolverSettings) {
    let Some(body) = bodies.get_mut(target.body) else { return };
    if body.inv_mass <= 0.0 || settings.h <= 0.0 {
        return;
    }
    let radius = rotate(target.local_anchor, body.angle);
    let error = body.position.add(radius).sub(target.target);
    let velocity = body.point_velocity(radius);
    let (im, ii) = (body.inv_mass, body.inv_inertia);
    let k11 = im + ii * radius.y * radius.y;
    let k12 = -ii * radius.x * radius.y;
    let k22 = im + ii * radius.x * radius.x;
    let softness = Softness::from_frequency(target.hertz.max(0.01), target.damping_ratio.max(0.0), settings.h);
    let solved = solve_symmetric_2x2(k11, k12, k22, velocity.add(error.mul(softness.bias_rate)));
    let impulse = solved.mul(-softness.mass_scale).sub(target.impulse.mul(softness.impulse_scale));
    let previous = target.impulse;
    let mut accumulated = previous.add(impulse);
    let limit = target.max_force.max(0.0) * settings.h;
    let length = accumulated.length();
    if length > limit {
        accumulated = accumulated.mul(if length > 0.0 { limit / length } else { 0.0 });
    }
    target.impulse = accumulated;
    let applied = accumulated.sub(previous);
    body.velocity = body.velocity.add(applied.mul(im));
    body.angular_velocity += radius.cross(applied) * ii;
}

// 清零扁平刚体记录中的本步接触诊断字段。
fn reset_contact_diagnostics(data: &mut [f64], body_count: usize) {
    for body_index in 0..body_count {
        let index = body_index * STRIDE;
        data[index + 29..index + 33].fill(0.0);
    }
}

// 从固定步长的扁平数组读取内部刚体列表。
fn read_bodies(data: &[f64], body_count: usize) -> Vec<Body> {
    (0..body_count)
        .map(/* 计算并返回 Body :: from_data (data , body_index * STRIDE)，用于当前 read_bodies 流程。 */ |body_index| Body::from_data(data, body_index * STRIDE))
        .collect()
}

// 解析连接记录，并排除不存在或不合法的刚体引用。
fn read_constraints(
    connection_data: &[f64],
    body_count: usize,
    bodies: &[Body],
) -> Vec<ConnectionConstraint> {
    let connection_count = connection_data.len() / CONNECTION_STRIDE;
    (0..connection_count)
        .filter_map(/* 计算并返回 ConnectionConstraint :: from_data (connection_data , connection_index * CONNECTION_STRIDE , body_count ,)，用于当前 read_constraints 流程。 */ |connection_index| {
            ConnectionConstraint::from_data(
                connection_data,
                connection_index * CONNECTION_STRIDE,
                body_count,
            )
        })
        .filter(/* 判断 bodies [constraint . body_a] . layer == bodies [constraint . body_b] . layer 是否成立，供过滤或有效性检查使用。 */ |constraint| bodies[constraint.body_a].layer == bodies[constraint.body_b].layer)
        .collect()
}

// 用并查集收集刚性绑定组及禁止内部碰撞的刚体对。
fn active_bound_pairs(
    constraints: &[ConnectionConstraint],
    body_count: usize,
) -> HashSet<(usize, usize)> {
    // 沿父索引寻找并压缩并查集路径。
    fn root(parents: &mut [usize], index: usize) -> usize {
        let mut current = index;
        while parents[current] != current {
            parents[current] = parents[parents[current]];
            current = parents[current];
        }
        current
    }
    // 按秩合并两个并查集集合，保持查找深度有界。
    fn union(parents: &mut [usize], ranks: &mut [u8], first: usize, second: usize) {
        let first_root = root(parents, first);
        let second_root = root(parents, second);
        if first_root == second_root {
            return;
        }
        if ranks[first_root] < ranks[second_root] {
            parents[first_root] = second_root;
        } else {
            parents[second_root] = first_root;
            if ranks[first_root] == ranks[second_root] {
                ranks[first_root] = ranks[first_root].saturating_add(1);
            }
        }
    }

    let mut parents: Vec<usize> = (0..body_count).collect();
    let mut ranks = vec![0_u8; body_count];
    for constraint in constraints.iter().filter(/* 计算并返回 constraint . active && ! constraint . collide_connected && constraint . binding，用于当前 active_bound_pairs 流程。 */ |constraint| {
        constraint.active && !constraint.collide_connected && constraint.binding
    }) {
        union(
            &mut parents,
            &mut ranks,
            constraint.body_a,
            constraint.body_b,
        );
    }

    let mut components: HashMap<usize, Vec<usize>> = HashMap::new();
    for body in 0..body_count {
        let component = root(&mut parents, body);
        components.entry(component).or_default().push(body);
    }
    let mut pairs = HashSet::new();
    // Every binding component behaves as one compound body.
    for members in components.values() {
        for (offset, &first) in members.iter().enumerate() {
            for &second in members.iter().skip(offset + 1) {
                pairs.insert((first.min(second), first.max(second)));
            }
        }
    }
    // An ordinary non-colliding joint does not propagate through other joint
    // chains, but each endpoint represents its complete binding component.
    // Suppress the Cartesian product so A bound to B and B jointed to C also
    // correctly suppresses A-C, without turning A-B-C joint chains compound.
    for constraint in constraints.iter().filter(/* 判断 constraint . active && ! constraint . collide_connected && ! constraint . binding && constraint . joint_kind > 0 是否成立，供过滤或有效性检查使用。 */ |constraint| {
        constraint.active
            && !constraint.collide_connected
            && !constraint.binding
            && constraint.joint_kind > 0
    }) {
        let first_root = root(&mut parents, constraint.body_a);
        let second_root = root(&mut parents, constraint.body_b);
        let first_members = components
            .get(&first_root)
            .map(Vec::as_slice)
            .unwrap_or(&[]);
        let second_members = components
            .get(&second_root)
            .map(Vec::as_slice)
            .unwrap_or(&[]);
        for &first in first_members {
            for &second in second_members {
                if first != second {
                    pairs.insert((first.min(second), first.max(second)));
                }
            }
        }
    }
    pairs
}

// 将流形信息累加到两端刚体的接触诊断记录。
fn record_contact_diagnostics(data: &mut [f64], body_a: &Body, body_b: &Body, normal: Vec2, depth: f64) {
    let data_a = body_a.data_index;
    let data_b = body_b.data_index;
    data[data_a + 29] += 1.0;
    data[data_b + 29] += 1.0;
    if depth >= data[data_a + 32] {
        data[data_a + 30] = normal.x;
        data[data_a + 31] = normal.y;
        data[data_a + 32] = depth;
    }
    if depth >= data[data_b + 32] {
        data[data_b + 30] = -normal.x;
        data[data_b + 31] = -normal.y;
        data[data_b + 32] = depth;
    }
}

#[derive(Clone, Copy)]
struct ContactSource {
    body_a_index: usize,
    body_b_index: usize,
    child_a: u32,
    child_b: u32,
    feature_id: u32,
}

// 由碰撞流形和两端材质构造求解接触约束（锚点在本步内固定）。
fn contact_from_manifold(
    bodies: &[Body],
    body_a_view: &Body,
    body_b_view: &Body,
    manifold: Manifold,
    source: ContactSource,
) -> Contact {
    let ContactSource { body_a_index, body_b_index, child_a, child_b, feature_id } = source;
    let body_a = &bodies[body_a_index];
    let body_b = &bodies[body_b_index];
    let radius_a = manifold.point.sub(body_a.position);
    let radius_b = manifold.point.sub(body_b.position);
    let initial_relative_velocity = body_b
        .point_velocity(radius_b)
        .sub(body_a.point_velocity(radius_a));
    let initial_normal_velocity = initial_relative_velocity.dot(manifold.normal);
    let threshold = body_a_view
        .restitution_threshold
        .max(body_b_view.restitution_threshold);
    let combine = /* 按两端优先级更高的材质模式选择最小、相乘、最大或平均混合。 */ |first: f64, second: f64, first_mode: u8, second_mode: u8| {
        // Mode priority mirrors the editor contract: Maximum > Multiply >
        // Minimum > Average. Mixed material pairs therefore remain stable.
        match first_mode.max(second_mode) {
            1 => first.min(second),
            2 => first * second,
            3 => first.max(second),
            _ => (first + second) * 0.5,
        }
    };
    let restitution = combine(
        body_a_view.restitution,
        body_b_view.restitution,
        body_a_view.restitution_combine,
        body_b_view.restitution_combine,
    )
    .clamp(0.0, 1.0);
    let dynamic_friction = combine(
        body_a_view.dynamic_friction,
        body_b_view.dynamic_friction,
        body_a_view.friction_combine,
        body_b_view.friction_combine,
    );
    let static_friction = combine(
        body_a_view.static_friction,
        body_b_view.static_friction,
        body_a_view.friction_combine,
        body_b_view.friction_combine,
    )
    .max(dynamic_friction);
    Contact {
        body_a: body_a_index,
        body_b: body_b_index,
        child_a,
        child_b,
        feature_id,
        normal: manifold.normal,
        tangent: manifold.normal.perp(),
        depth: manifold.depth,
        radius_a,
        radius_b,
        local_a: inverse_rotate(radius_a, body_a.angle),
        local_b: inverse_rotate(radius_b, body_b.angle),
        initial_relative_velocity,
        initial_normal_velocity,
        restitution,
        restitution_threshold: threshold.max(0.0),
        static_friction,
        dynamic_friction,
        normal_mass: 0.0,
        tangent_mass: 0.0,
        normal_impulse: 0.0,
        tangent_impulse: 0.0,
        max_normal_impulse: 0.0,
        is_sensor: body_a_view.is_sensor || body_b_view.is_sensor,
        active: body_can_move(body_a) || body_can_move(body_b),
        against_immovable: false,
        // Conveyor surfaces: A's face carries B along -tangent, B's face carries A along +tangent
        // (tangent = normal.perp()); see Body::tangent_speed.
        target_tangent_speed: -(body_a.tangent_speed + body_b.tangent_speed),
        rolling_resistance: (body_a.rolling_resistance * body_a_view.rolling_radius())
            .max(body_b.rolling_resistance * body_b_view.rolling_radius())
            .max(0.0),
        rolling_impulse: 0.0,
    }
}

// 26.43: 本步可能移动的刚体：醒着的动态体或任何运动学体（运动学体可能被脚本直接移动）。
fn body_can_move(body: &Body) -> bool {
    !body.is_static && (body.is_kinematic || !body.sleeping)
}

// 26.43: 刚体或其任一子形状是传感器。
fn has_sensor(body: &Body) -> bool {
    body.is_sensor || body.collider_children.iter().any(|child| child.is_sensor)
}

// 26.44: 本步内刚体表面可能移动的最大距离（线速度加转动），用于推测接触与扫掠包围盒。
fn body_reach(body: &Body, dt: f64) -> f64 {
    if body.is_static || (body.sleeping && !body.is_kinematic) {
        return 0.0;
    }
    let reach = (body.velocity.length() + body.angular_velocity.abs() * body.maximum_collider_radius()) * dt;
    if reach.is_finite() { reach.max(0.0) } else { 0.0 }
}

// 扩大包围盒。
fn inflate_aabb(bounds: Aabb, margin: f64) -> Aabb {
    Aabb { min_x: bounds.min_x - margin, max_x: bounds.max_x + margin, min_y: bounds.min_y - margin, max_y: bounds.max_y + margin }
}

// 26.44: 本步不会移动、也不需要重新检测接触的刚体：静态体、休眠的动态体或静止的运动学体，且没有传感器。
fn body_rests(body: &Body) -> bool {
    !has_sensor(body)
        && (body.is_static
            || (body.is_kinematic && body.velocity == Vec2::ZERO && body.angular_velocity == 0.0)
            || (!body.is_kinematic && body.sleeping))
}

// 26.44: 每步一次收集接触（宽相 + 窄相），含推测余量：两物体在本步内可能接触时即建立约束。
fn collect_contacts(
    bodies: &[Body],
    bound_pairs: &HashSet<(usize, usize)>,
    coverage: &EdgeCoverage,
    dt: f64,
    broad_phase: &mut BroadPhaseTree,
    querying: &[bool],
) -> Vec<Contact> {
    let reaches: Vec<f64> = bodies.iter().map(|body| body_reach(body, dt)).collect();
    let pairs = broad_phase.update_pairs(bodies, &reaches, SPECULATIVE_DISTANCE, querying);
    let mut contacts = Vec::new();
    for (body_a_index, body_b_index) in pairs {
        if bound_pairs.contains(&(body_a_index, body_b_index)) {
            continue;
        }
        let body_a = &bodies[body_a_index];
        let body_b = &bodies[body_b_index];
        // 26.43: two bodies that cannot be moved by contacts (static or kinematic) never
        // exchange impulses; only sensors need their overlap. Baked TileMap rectangles are
        // static, so this removes most pairs in tile levels.
        let dynamic = /* 由求解器推动的刚体。 */ |body: &Body| !body.is_static && !body.is_kinematic;
        if !dynamic(body_a) && !dynamic(body_b) && !has_sensor(body_a) && !has_sensor(body_b) {
            continue;
        }
        let pair_margin = SPECULATIVE_DISTANCE + reaches[body_a_index] + reaches[body_b_index];
        let variants_a =
            std::iter::once(None).chain((0..body_a.collider_children.len()).map(Some));
        for child_a_index in variants_a {
            let proxy_a = body_a.collider_proxy(child_a_index);
            let bounds_a = inflate_aabb(proxy_a.compound_aabb(), pair_margin);
            let variants_b =
                std::iter::once(None).chain((0..body_b.collider_children.len()).map(Some));
            for child_b_index in variants_b {
                let proxy_b = body_b.collider_proxy(child_b_index);
                if !proxy_a.can_collide_with(&proxy_b) {
                    continue;
                }
                // 26.44: children of compound bodies are paired only when their bounds meet.
                if (child_a_index.is_some() || child_b_index.is_some()) && !bounds_a.overlaps(proxy_b.compound_aabb()) {
                    continue;
                }
                // Sensors report real overlap only; solid pairs get speculative contacts.
                let margin = if proxy_a.is_sensor || proxy_b.is_sensor { 0.0 } else { pair_margin };
                let mut manifolds = collide_speculative(&proxy_a, &proxy_b, margin);
                // 26.43: contacts through internal edges of adjacent static polygons are dropped or,
                // for polygons, moved to the exposed face (26.44).
                if child_a_index.is_none() && !proxy_b.is_static {
                    if let Some(edges) = coverage.get(&body_a_index) {
                        manifolds = fix_static_manifolds(&proxy_a, edges, &proxy_b, manifolds, true, margin);
                    }
                }
                if child_b_index.is_none() && !proxy_a.is_static {
                    if let Some(edges) = coverage.get(&body_b_index) {
                        manifolds = fix_static_manifolds(&proxy_b, edges, &proxy_a, manifolds, false, margin);
                    }
                }
                for (index, manifold) in manifolds.into_iter().enumerate() {
                    if !proxy_a.accepts_one_way_contact(&proxy_b, manifold.normal)
                        || !proxy_b.accepts_one_way_contact(&proxy_a, manifold.normal.neg())
                    {
                        continue;
                    }
                    let feature_id = if manifold.feature == 0 { index as u32 } else { manifold.feature };
                    contacts.push(contact_from_manifold(
                        bodies,
                        &proxy_a,
                        &proxy_b,
                        manifold,
                        ContactSource {
                            body_a_index,
                            body_b_index,
                            child_a: body_a.child_id(child_a_index),
                            child_b: body_b.child_id(child_b_index),
                            feature_id,
                        },
                    ));
                }
            }
        }
    }
    remove_seam_duplicates(bodies, contacts)
}

// 26.44: 两块相邻静态体（瓦片、首尾相接的箱子）在接缝处各给出一个几乎重合、同法线的接触点。
// 两个重合的软约束等于在同一点加倍刚度，压着重物时会让下面的物体左右摇摆并发散。保留第一个。
fn remove_seam_duplicates(bodies: &[Body], contacts: Vec<Contact>) -> Vec<Contact> {
    let immovable = |index: usize| bodies[index].inv_mass <= 0.0;
    let world_point = |contact: &Contact| bodies[contact.body_a].position.add(contact.radius_a);
    // (moving body, immovable body, normal pointing at the moving body, contact index): only
    // contacts of one moving body against immovable bodies can be seam duplicates.
    let mut candidates: Vec<(usize, usize, Vec2, usize)> = contacts
        .iter()
        .enumerate()
        .filter(|(_, contact)| !contact.is_sensor)
        .filter_map(|(index, contact)| match (immovable(contact.body_a), immovable(contact.body_b)) {
            (true, false) => Some((contact.body_b, contact.body_a, contact.normal, index)),
            (false, true) => Some((contact.body_a, contact.body_b, contact.normal.neg(), index)),
            _ => None,
        })
        .collect();
    candidates.sort_unstable_by_key(|candidate| (candidate.0, candidate.3));
    let mut keep = vec![true; contacts.len()];
    for group in candidates.chunk_by(|first, second| first.0 == second.0) {
        for (offset, first) in group.iter().enumerate() {
            if !keep[first.3] {
                continue;
            }
            for second in &group[offset + 1..] {
                if !keep[second.3] || first.1 == second.1 || first.2.dot(second.2) < 0.999 {
                    continue;
                }
                if world_point(&contacts[first.3]).sub(world_point(&contacts[second.3])).length_squared() <= (2.0 * LINEAR_SLOP) * (2.0 * LINEAR_SLOP) {
                    keep[second.3] = false;
                }
            }
        }
    }
    contacts.into_iter().zip(keep).filter_map(|(contact, keep)| keep.then_some(contact)).collect()
}

// 26.44: 按连接类型选择求解路径。普通关节（距离、弹簧、绳长、转动、移动）走 Soft Step；
// 刚性绑定与带节点的物理绳索保留原求解器。
fn uses_soft_step(constraint: &ConnectionConstraint) -> bool {
    !(constraint.binding || constraint.joint_kind == 1 || constraint.collision_enabled)
}

// 把一步内的接触状态转换为世界空间快照（只含真正接触或承受冲量的接触）。
fn contact_snapshots<'a>(bodies: &[Body], contacts: impl Iterator<Item = &'a Contact>, data: &mut [f64], h: f64) -> Vec<SolverContactSnapshot> {
    let mut snapshots = Vec::new();
    for contact in contacts {
        let separation = contact_separation(bodies, contact);
        let touching = if contact.is_sensor {
            contact.depth > 0.0
        } else {
            separation <= LINEAR_SLOP || contact.normal_impulse > 0.0
        };
        if !touching {
            continue;
        }
        let body_a = &bodies[contact.body_a];
        let body_b = &bodies[contact.body_b];
        let penetration = if contact.is_sensor { contact.depth.max(0.0) } else { (-separation).max(0.0) };
        record_contact_diagnostics(data, body_a, body_b, contact.normal, penetration);
        let point_a = body_a.position.add(rotate(contact.local_a, body_a.angle));
        let point_b = body_b.position.add(rotate(contact.local_b, body_b.angle));
        snapshots.push(SolverContactSnapshot {
            body_a: contact.body_a,
            body_b: contact.body_b,
            child_a: contact.child_a,
            child_b: contact.child_b,
            point: point_a.add(point_b).mul(0.5),
            normal: contact.normal,
            relative_velocity: contact_relative_velocity(bodies, contact),
            initial_relative_velocity: contact.initial_relative_velocity,
            normal_impulse: contact.normal_impulse,
            tangent_impulse: contact.tangent_impulse,
            normal_force: contact.normal_impulse / h.max(f64::EPSILON),
            tangent_force: contact.tangent_impulse / h.max(f64::EPSILON),
            penetration,
            sensor: contact.is_sensor,
        });
    }
    snapshots
}

// 把内部刚体位置、速度和休眠状态写回扁平输出。
fn write_bodies(data: &mut [f64], bodies: &[Body]) {
    for body in bodies {
        let index = body.data_index;
        data[index + 2] = finite_or(body.position.x, 0.0);
        data[index + 3] = finite_or(body.position.y, 0.0);
        data[index + 4] = finite_or(body.velocity.x, 0.0);
        data[index + 5] = finite_or(body.velocity.y, 0.0);
        data[index + 8] = body.mass;
        data[index + 14] = normalize_angle(body.angle);
        data[index + 15] = finite_or(body.angular_velocity, 0.0);
        data[index + 26] = body.inertia;
        data[index + 49] = if body.sleeping { 1.0 } else { 0.0 };
        data[index + 50] = finite_or(body.sleep_timer, 0.0).max(0.0);
    }
}

// 把连接、断裂与绳索节点状态写回扁平输出。
fn write_constraints(connection_data: &mut [f64], constraints: &[ConnectionConstraint]) {
    for constraint in constraints {
        let index = constraint.data_index;
        connection_data[index + 16] = if constraint.active { 1.0 } else { 0.0 };
        connection_data[index + 17] = constraint.broken_code as f64;
        connection_data[index + 18] = finite_or(constraint.tension, 0.0).max(0.0);
        connection_data[index + 19] = finite_or(constraint.strain, 0.0).max(0.0);
        connection_data[index + 27] = constraint.rope_nodes.len() as f64;
        connection_data[index + 28] = constraint.break_link.map_or(-1.0, /* 返回当前快照值 link as f64。 */ |link| link as f64);
        for (node_index, node) in constraint
            .rope_nodes
            .iter()
            .enumerate()
            .take(ROPE_NODE_CAPACITY)
        {
            let offset = index + ROPE_NODE_DATA_OFFSET + node_index * 4;
            connection_data[offset] = finite_or(node.position.x, 0.0);
            connection_data[offset + 1] = finite_or(node.position.y, 0.0);
            connection_data[offset + 2] = finite_or(node.velocity.x, 0.0);
            connection_data[offset + 3] = finite_or(node.velocity.y, 0.0);
        }
    }
}

#[derive(Clone)]
struct SolverWorld {
    // 26.45: bodies pulled toward a world point (target / mouse joints), solved every substep.
    targets: Vec<BodyTarget>,
    data: Vec<f64>,
    connection_data: Vec<f64>,
    bodies: Vec<Body>,
    constraints: Vec<ConnectionConstraint>,
    contacts: Vec<SolverContactSnapshot>,
    quality: SolverQuality,
    impulse_cache: HashMap<ContactCacheKey, (f64, f64, f64)>,
    // 26.43: internal edges of adjacent static polygons, rebuilt when a static body changes.
    static_fingerprint: u64,
    edge_coverage: EdgeCoverage,
    // 26.44: persistent dynamic AABB tree.
    broad_phase: BroadPhaseTree,
    // 26.44: contacts of pairs that cannot change (both sides asleep, static or a resting
    // kinematic body, and not moved since the previous step), kept from the step that collected
    // them instead of colliding the pair again.
    resting_pairs: std::collections::BTreeMap<(usize, usize), Vec<Contact>>,
    // Poses at the end of the previous step, to notice bodies moved between steps.
    previous_poses: Vec<(Vec2, f64)>,
    // A body record was replaced since the static fingerprint was last taken.
    statics_changed: bool,
}

#[derive(Clone, Copy, Debug, PartialEq)]
struct SolverQuality {
    minimum_substeps: usize,
    solver_iterations: usize,
    position_iterations: usize,
    sleep_linear_threshold: f64,
    sleep_angular_threshold: f64,
    time_to_sleep: f64,
}

impl Default for SolverQuality {
    // 建立默认子步、迭代、休眠阈值及连续碰撞配置。
    fn default() -> Self {
        Self {
            minimum_substeps: BASE_SUB_STEPS,
            solver_iterations: SOLVER_ITERATIONS,
            position_iterations: 1,
            sleep_linear_threshold: 1.0e-3,
            sleep_angular_threshold: 1.0e-3,
            time_to_sleep: 0.5,
        }
    }
}

impl SolverQuality {
    // 把求解迭代次数、子步数及阈值限制在支持范围。
    fn normalized(self) -> Self {
        Self {
            minimum_substeps: self.minimum_substeps.clamp(1, MAX_SUB_STEPS),
            solver_iterations: self.solver_iterations.clamp(1, 128),
            position_iterations: self.position_iterations.clamp(1, 128),
            sleep_linear_threshold: finite_or(self.sleep_linear_threshold, 1.0e-3)
                .clamp(0.0, 1.0e6),
            sleep_angular_threshold: finite_or(self.sleep_angular_threshold, 1.0e-3)
                .clamp(0.0, 1.0e6),
            time_to_sleep: finite_or(self.time_to_sleep, 0.5).clamp(0.0, 3_600.0),
        }
    }
}

#[derive(Clone, Copy, Debug)]
struct SolverContactSnapshot {
    body_a: usize,
    body_b: usize,
    child_a: u32,
    child_b: u32,
    point: Vec2,
    normal: Vec2,
    relative_velocity: Vec2,
    initial_relative_velocity: Vec2,
    normal_impulse: f64,
    tangent_impulse: f64,
    normal_force: f64,
    tangent_force: f64,
    penetration: f64,
    sensor: bool,
}

// 将相连动态刚体的休眠与唤醒状态同步到同一物理岛。
fn synchronize_sleep_islands(
    bodies: &mut [Body],
    contacts: &[SolverContactSnapshot],
    constraints: &[ConnectionConstraint],
    quality: SolverQuality,
    motion: &[(f64, f64)],
) {
    let mut adjacency = vec![Vec::<usize>::new(); bodies.len()];
    for contact in contacts.iter().filter(/* 计算并返回 ! contact . sensor，用于当前 synchronize_sleep_islands 流程。 */ |contact| !contact.sensor) {
        adjacency[contact.body_a].push(contact.body_b);
        adjacency[contact.body_b].push(contact.body_a);
    }
    for constraint in constraints.iter().filter(/* 返回当前快照值 constraint . active。 */ |constraint| constraint.active) {
        adjacency[constraint.body_a].push(constraint.body_b);
        adjacency[constraint.body_b].push(constraint.body_a);
    }
    let mut visited = vec![false; bodies.len()];
    for start in 0..bodies.len() {
        if visited[start] || bodies[start].is_static || bodies[start].is_kinematic {
            continue;
        }
        let mut pending = vec![start];
        let mut island = Vec::new();
        visited[start] = true;
        while let Some(current) = pending.pop() {
            if !bodies[current].is_static && !bodies[current].is_kinematic {
                island.push(current);
            }
            for &next in &adjacency[current] {
                if !visited[next] && !bodies[next].is_static && !bodies[next].is_kinematic {
                    visited[next] = true;
                    pending.push(next);
                }
            }
        }
        let slow = island.iter().all(/* 检查物理岛中的刚体是否允许休眠且本步实际线运动、角运动均低于阈值。 */ |&index| {
            let body = &bodies[index];
            let (linear_speed, angular_speed) = motion.get(index).copied().unwrap_or((body.velocity.length(), body.angular_velocity.abs()));
            body.sleeping_allowed
                && linear_speed <= quality.sleep_linear_threshold
                && angular_speed <= quality.sleep_angular_threshold
        });
        if !slow {
            for &index in &island {
                bodies[index].sleeping = false;
                bodies[index].sleep_timer = 0.0;
            }
            continue;
        }
        let shared_timer = island
            .iter()
            .map(/* 计算并返回 bodies [index] . sleep_timer，用于当前 synchronize_sleep_islands 流程。 */ |&index| bodies[index].sleep_timer)
            .fold(f64::INFINITY, f64::min);
        let should_sleep = shared_timer >= quality.time_to_sleep;
        for &index in &island {
            bodies[index].sleep_timer = shared_timer;
            bodies[index].sleeping = should_sleep;
            if should_sleep {
                bodies[index].velocity = Vec2::ZERO;
                bodies[index].angular_velocity = 0.0;
            }
        }
    }
}

impl SolverWorld {
    // 从刚体与连接记录构造无额外子形状的求解世界。
    fn new(input: &[f64], connection_input: &[f64], quality: SolverQuality) -> Self {
        Self::new_with_children(input, connection_input, quality, &[])
    }

    // 从刚体、连接和子碰撞体数据构造保留求解状态的世界。
    fn new_with_children(
        input: &[f64],
        connection_input: &[f64],
        quality: SolverQuality,
        child_shapes: &[&[f64]],
    ) -> Self {
        let mut data = input.to_vec();
        let connection_data = connection_input.to_vec();
        let body_count = data.len() / STRIDE;
        reset_contact_diagnostics(&mut data, body_count);
        let mut bodies = read_bodies(&data, body_count);
        for (index, shapes) in child_shapes.iter().enumerate().take(bodies.len()) {
            bodies[index].apply_collider_children(shapes);
        }
        let constraints = read_constraints(&connection_data, body_count, &bodies);
        Self {
            targets: Vec::new(),
            data,
            connection_data,
            bodies,
            constraints,
            contacts: Vec::new(),
            quality: quality.normalized(),
            impulse_cache: HashMap::new(),
            static_fingerprint: 0,
            edge_coverage: HashMap::new(),
            broad_phase: BroadPhaseTree::new(),
            resting_pairs: std::collections::BTreeMap::new(),
            previous_poses: Vec::new(),
            statics_changed: true,
        }
    }

    // 26.44 Soft Step: 推进物理世界一个时间步。接触每步收集一次（含推测余量），之后每个子步：
    // 积分速度 → 热启动 → 带偏置求解 → 积分位置 → 连续碰撞 → 松弛；子步结束后施加恢复系数。
    fn step(&mut self, dt: f64, global_gravity: f64, air_friction: f64) {
        let body_count = self.bodies.len();
        reset_contact_diagnostics(&mut self.data, body_count);
        let dt = finite_or(dt, 0.0).clamp(0.0, 0.25);
        if body_count == 0 || dt <= 0.0 {
            self.contacts.clear();
            write_bodies(&mut self.data, &self.bodies);
            write_constraints(&mut self.connection_data, &self.constraints);
            return;
        }
        let global_gravity = finite_or(global_gravity, 0.0);
        let air_friction = non_negative(air_friction, 0.0);
        for constraint in &mut self.constraints {
            constraint.tension = 0.0;
            constraint.strain = 0.0;
            constraint.motor_torque = 0.0;
            constraint.link_tensions.fill(0.0);
        }
        let bound_pairs = active_bound_pairs(&self.constraints, self.bodies.len());
        let sub_steps = self.quality.minimum_substeps.clamp(1, MAX_SUB_STEPS);
        // 26.45: a body held by a target joint never sleeps.
        for target in &self.targets {
            if let Some(body) = self.bodies.get_mut(target.body) {
                body.sleeping = false;
                body.sleep_timer = 0.0;
            }
        }
        // 26.44: bodies only change between steps through `forget_resting_body` (record refresh);
        // hashing every static polygon each step cost 0.3 ms in a 1600-tile level.
        if self.statics_changed {
            let fingerprint = static_fingerprint(&self.bodies);
            if fingerprint != self.static_fingerprint {
                self.edge_coverage = compute_edge_coverage(&self.bodies);
                self.static_fingerprint = fingerprint;
            }
            self.statics_changed = false;
        }
        let h = dt / sub_steps as f64;
        let settings = StepSolverSettings::new(h);
        // Soft constraints are tuned for one biased solve and one relax pass per substep (a second
        // biased pass doubles the effective stiffness and can ring); accuracy comes from the
        // substep count. The velocity/position iteration settings still drive ropes and welds.
        let solve_iterations = 1;
        let relax_iterations = 1;

        // 26.44: bodies at rest that have not moved since the last step keep their contacts; only
        // the others query the broad phase. A pair is collided again as soon as one side moves.
        let frozen: Vec<bool> = self
            .bodies
            .iter()
            .enumerate()
            .map(|(index, body)| body_rests(body) && self.previous_poses.get(index).is_some_and(|(position, angle)| *position == body.position && *angle == body.angle))
            .collect();
        let querying: Vec<bool> = frozen.iter().map(|frozen| !frozen).collect();
        let mut resting_pairs = std::mem::take(&mut self.resting_pairs);
        resting_pairs.retain(|(body_a, body_b), list| {
            let keep = frozen.get(*body_a).copied().unwrap_or(false) && frozen.get(*body_b).copied().unwrap_or(false);
            if !keep {
                // Collided again below: keep the impulses for warm starting.
                for contact in list.iter() {
                    self.impulse_cache.insert(contact_cache_key(contact), (contact.normal_impulse, contact.tangent_impulse, contact.rolling_impulse));
                }
            }
            keep
        });
        let mut contacts = collect_contacts(&self.bodies, &bound_pairs, &self.edge_coverage, dt, &mut self.broad_phase, &querying);
        // A sleeping body touched by a body that moves (awake, or moved since the last step) wakes
        // before the solve, as Box2D wakes the island when such a contact begins; its kept
        // contacts are solved again from this step. Before, it stayed asleep and acted as an
        // immovable body, so a kinematic platform moved into a sleeping box went through it.
        let mut woken: Vec<usize> = Vec::new();
        for contact in contacts.iter().filter(|contact| !contact.is_sensor && contact.depth > -LINEAR_SLOP) {
            for (sleeper, other) in [(contact.body_a, contact.body_b), (contact.body_b, contact.body_a)] {
                let body = &self.bodies[sleeper];
                if body.sleeping && !body.is_static && !body.is_kinematic && !frozen[other] {
                    woken.push(sleeper);
                }
            }
        }
        if !woken.is_empty() {
            woken.sort_unstable();
            woken.dedup();
            for &index in &woken {
                self.bodies[index].sleeping = false;
                self.bodies[index].sleep_timer = 0.0;
            }
            let kept: Vec<(usize, usize)> = resting_pairs
                .keys()
                .filter(|(body_a, body_b)| woken.binary_search(body_a).is_ok() || woken.binary_search(body_b).is_ok())
                .copied()
                .collect();
            for key in kept {
                if let Some(list) = resting_pairs.remove(&key) {
                    contacts.extend(list);
                }
            }
            for contact in &mut contacts {
                contact.active = body_can_move(&self.bodies[contact.body_a]) || body_can_move(&self.bodies[contact.body_b]);
            }
        }
        for contact in &mut contacts {
            if let Some((normal, tangent, rolling)) = self.impulse_cache.get(&contact_cache_key(contact)).copied() {
                contact.normal_impulse = non_negative(normal, 0.0);
                contact.tangent_impulse = finite_or(tangent, 0.0);
                contact.rolling_impulse = finite_or(rolling, 0.0);
            }
            prepare_contact(&self.bodies, contact);
        }
        let ranges = manifold_ranges(&contacts);
        let has_legacy_constraints = self.constraints.iter().any(|constraint| !uses_soft_step(constraint));
        let step_start: Vec<(Vec2, f64)> = self.bodies.iter().map(|body| (body.position, body.angle)).collect();
        for _ in 0..sub_steps {
            let start_poses: Vec<(Vec2, f64)> = self.bodies.iter().map(|body| (body.position, body.angle)).collect();
            for body in self.bodies.iter_mut() {
                body.integrate_velocity(h, global_gravity, air_friction);
            }
            for constraint in self.constraints.iter_mut() {
                integrate_rope_nodes(constraint, h, global_gravity, air_friction);
            }
            for contact in &contacts {
                warm_start_contact(&mut self.bodies, contact);
            }
            for constraint in self.constraints.iter() {
                warm_start_joint(&mut self.bodies, constraint);
            }
            for target in &self.targets {
                warm_start_target(&mut self.bodies, target);
            }
            for constraint in self.constraints.iter_mut() {
                resolve_rope_collisions(&mut self.bodies, constraint);
            }
            for _ in 0..solve_iterations {
                for target in self.targets.iter_mut() {
                    solve_target(&mut self.bodies, target, &settings);
                }
                for constraint in self.constraints.iter_mut() {
                    solve_soft_joint(&mut self.bodies, constraint, &settings, true);
                }
                solve_contacts(&mut self.bodies, &mut contacts, &ranges, &settings, true);
            }
            if has_legacy_constraints {
                for _ in 0..self.quality.solver_iterations.clamp(1, 128) {
                    for constraint in self.constraints.iter_mut().filter(|constraint| !uses_soft_step(constraint)) {
                        solve_connection_velocity(&mut self.bodies, constraint, h, self.quality.solver_iterations);
                    }
                }
            }
            for body in self.bodies.iter_mut() {
                body.integrate_position(h);
            }
            sweep_continuous_bodies(&mut self.bodies, &start_poses, &bound_pairs);
            for _ in 0..relax_iterations {
                for target in self.targets.iter_mut() {
                    solve_target(&mut self.bodies, target, &settings);
                }
                for constraint in self.constraints.iter_mut() {
                    solve_soft_joint(&mut self.bodies, constraint, &settings, false);
                }
                solve_contacts(&mut self.bodies, &mut contacts, &ranges, &settings, false);
            }
            if has_legacy_constraints {
                for _ in 0..self.quality.position_iterations.clamp(1, 128) {
                    for constraint in self.constraints.iter_mut().filter(|constraint| !uses_soft_step(constraint)) {
                        correct_connection_position(&mut self.bodies, constraint);
                    }
                }
            }
            for constraint in self.constraints.iter_mut() {
                constraint.evaluate_failure(&self.bodies);
            }
            for constraint in self.constraints.iter() {
                if constraint.binding || constraint.joint_kind == 1 {
                    correct_binding_position(&mut self.bodies, constraint);
                }
                synchronize_binding_motion(&mut self.bodies, constraint);
            }
        }
        for contact in &mut contacts {
            apply_contact_restitution(&mut self.bodies, contact);
        }
        // 26.44: pull revolute joint anchors back together (positions only, a few passes).
        for _ in 0..4 {
            if project_revolute_positions(&mut self.bodies, &self.constraints) <= 0.25 * LINEAR_SLOP {
                break;
            }
        }
        self.impulse_cache.clear();
        for contact in &contacts {
            if !contact.is_sensor && contact.active {
                self.impulse_cache.insert(contact_cache_key(contact), (contact.normal_impulse, contact.tangent_impulse, contact.rolling_impulse));
            }
        }
        self.contacts = contact_snapshots(&self.bodies, contacts.iter().chain(resting_pairs.values().flatten()), &mut self.data, h);
        // Motion actually made over the step (see Body::update_sleep_with_motion). A body that was
        // asleep stays measured by its velocity, which a hit sets.
        let motion: Vec<(f64, f64)> = self
            .bodies
            .iter()
            .zip(&step_start)
            .map(|(body, (position, angle))| {
                let linear = body.position.sub(*position).length() / dt;
                let angular = normalize_angle(body.angle - angle).abs() / dt;
                if body.sleeping { (body.velocity.length(), body.angular_velocity.abs()) } else { (linear, angular) }
            })
            .collect();
        for (body, (linear, angular)) in self.bodies.iter_mut().zip(&motion) {
            body.update_sleep_with_motion(
                dt,
                *linear,
                *angular,
                self.quality.sleep_linear_threshold,
                self.quality.sleep_angular_threshold,
                self.quality.time_to_sleep,
            );
        }
        synchronize_sleep_islands(
            &mut self.bodies,
            &self.contacts,
            &self.constraints,
            self.quality,
            &motion,
        );
        // Pairs whose both sides now rest are kept for the following steps.
        for contact in contacts {
            if !contact.is_sensor && body_rests(&self.bodies[contact.body_a]) && body_rests(&self.bodies[contact.body_b]) {
                resting_pairs.entry((contact.body_a, contact.body_b)).or_default().push(contact);
            }
        }
        self.resting_pairs = resting_pairs;
        self.previous_poses.clear();
        self.previous_poses.extend(self.bodies.iter().map(|body| (body.position, body.angle)));
        write_bodies(&mut self.data, &self.bodies);
        write_constraints(&mut self.connection_data, &self.constraints);
    }

    // 26.44: 刚体记录被外部修改（形状、过滤、位置）后，丢弃它保留的静止接触，下一步重新检测。
    fn forget_resting_body(&mut self, index: usize) {
        self.statics_changed = true;
        self.resting_pairs.retain(|(body_a, body_b), _| *body_a != index && *body_b != index);
        if let Some(pose) = self.previous_poses.get_mut(index) {
            *pose = (Vec2::new(f64::NAN, f64::NAN), f64::NAN);
        }
    }

    // 将当前模拟状态复制到调用方提供的输出缓冲区。
    fn copy_state(&self, bodies: &mut Vec<f64>, connections: &mut Vec<f64>) {
        bodies.clear();
        bodies.extend_from_slice(&self.data);
        connections.clear();
        connections.extend_from_slice(&self.connection_data);
    }

    // 借用本步求解器的接触快照切片。
    fn contacts(&self) -> &[SolverContactSnapshot] {
        &self.contacts
    }

    // 取出并合并模拟后的刚体与连接输出数据。
    fn into_output(self) -> Vec<f64> {
        let mut output = self.data;
        output.extend(self.connection_data);
        output
    }
}

// 通过兼容接口推进不含外部连接记录的物理数据。
pub fn step_physics(input: &[f64], dt: f64, global_gravity: f64, air_friction: f64) -> Vec<f64> {
    step_physics_with_connections(input, &[], dt, global_gravity, air_friction)
}

// 通过兼容接口同时推进刚体和连接记录。
pub fn step_physics_with_connections(
    input: &[f64],
    connection_input: &[f64],
    dt: f64,
    global_gravity: f64,
    air_friction: f64,
) -> Vec<f64> {
    let source_stride = if input.is_empty() || input.len() % STRIDE == 0 {
        STRIDE
    } else if input.len() % V3_3_STRIDE == 0 {
        V3_3_STRIDE
    } else if input.len() % V1_2_STRIDE == 0 {
        V1_2_STRIDE
    } else if input.len() % LEGACY_STRIDE == 0 {
        LEGACY_STRIDE
    } else {
        STRIDE
    };
    let legacy = source_stride != STRIDE;
    let upgraded = if legacy {
        let mut records = vec![0.0; input.len() / source_stride * STRIDE];
        for (record_index, source) in input.chunks_exact(source_stride).enumerate() {
            let target = &mut records[record_index * STRIDE..(record_index + 1) * STRIDE];
            target[..source_stride].copy_from_slice(source);
            if source_stride == LEGACY_STRIDE {
                let layer = finite_or(source[33], 0.0).round().clamp(0.0, 31.0) as u32;
                target[42] = (1_u32 << layer) as f64;
            }
            target[47] = 1.0;
            target[48] = 1.0;
            if source_stride <= V3_3_STRIDE {
                target[54] = 0.0;
                target[55] = 3.0;
            }
        }
        records
    } else {
        input.to_vec()
    };
    let mut world = SolverWorld::new(&upgraded, connection_input, SolverQuality::default());
    world.step(dt, global_gravity, air_friction);
    let output = world.into_output();
    if !legacy {
        return output;
    }
    let body_count = upgraded.len() / STRIDE;
    let mut downgraded = Vec::with_capacity(body_count * source_stride + connection_input.len());
    for record in output[..body_count * STRIDE].chunks_exact(STRIDE) {
        downgraded.extend_from_slice(&record[..source_stride]);
    }
    downgraded.extend_from_slice(&output[body_count * STRIDE..]);
    downgraded
}
