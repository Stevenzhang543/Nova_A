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

// 对本子步移动过快的连续碰撞刚体逐段扫掠，把它放回最早接触的位置。
fn sweep_continuous_bodies(
    bodies: &mut [Body],
    start_poses: &[(Vec2, f64)],
    bound_pairs: &HashSet<(usize, usize)>,
) {
    for index in 0..bodies.len() {
        let body = &bodies[index];
        if body.is_static || body.is_kinematic || body.sleeping || !body.continuous_collision {
            continue;
        }
        let (start_position, start_angle) = start_poses[index];
        let delta = body.position.sub(start_position);
        let turn = normalize_angle(body.angle - start_angle);
        let travel = delta.length() + turn.abs() * body.maximum_collider_radius();
        let samples = continuous_sweep_samples(body, travel);
        if samples == 0 {
            continue;
        }
        let mut moving = body.clone();
        moving.position = start_position;
        moving.angle = start_angle;
        let swept = union_aabb(moving.compound_aabb(), body.compound_aabb());
        let candidates: Vec<usize> = (0..bodies.len())
            .filter(/* 只检测扫掠范围内、未绑定且起点未重叠的物体。 */ |&other| {
                other != index
                    && !bound_pairs.contains(&(index.min(other), index.max(other)))
                    && bodies[other].compound_aabb().overlaps(swept)
                    && !bodies_touch(&moving, &bodies[other])
            })
            .collect();
        if candidates.is_empty() {
            continue;
        }
        let pose = /* 按比例插值本子步的位置与角度。 */ |moving: &mut Body, fraction: f64| {
            moving.position = start_position.add(delta.mul(fraction));
            moving.angle = normalize_angle(start_angle + turn * fraction);
        };
        let touches = /* 当前姿态是否碰到任一候选物体。 */ |moving: &Body, bodies: &[Body]| {
            candidates.iter().any(|&other| bodies_touch(moving, &bodies[other]))
        };
        let mut clear = 0.0;
        let mut blocked = None;
        for sample in 1..=samples {
            let fraction = sample as f64 / samples as f64;
            pose(&mut moving, fraction);
            if touches(&moving, bodies) {
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
            pose(&mut moving, middle);
            if touches(&moving, bodies) {
                hit = middle;
            } else {
                clear = middle;
            }
        }
        pose(&mut moving, hit);
        bodies[index].position = moving.position;
        bodies[index].angle = moving.angle;
    }
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
fn record_contact_diagnostics(data: &mut [f64], body_a: &Body, body_b: &Body, manifold: &Manifold) {
    let data_a = body_a.data_index;
    let data_b = body_b.data_index;
    data[data_a + 29] += 1.0;
    data[data_b + 29] += 1.0;
    if manifold.depth >= data[data_a + 32] {
        data[data_a + 30] = manifold.normal.x;
        data[data_a + 31] = manifold.normal.y;
        data[data_a + 32] = manifold.depth;
    }
    if manifold.depth >= data[data_b + 32] {
        data[data_b + 30] = -manifold.normal.x;
        data[data_b + 31] = -manifold.normal.y;
        data[data_b + 32] = manifold.depth;
    }
}

#[derive(Clone, Copy)]
struct ContactSource {
    body_a_index: usize,
    body_b_index: usize,
    child_a: u32,
    child_b: u32,
    feature_id: u8,
    position_weight: f64,
}

// 由碰撞流形和两端材质构造求解接触约束。
fn contact_from_manifold(
    bodies: &[Body],
    body_a_view: &Body,
    body_b_view: &Body,
    manifold: Manifold,
    source: ContactSource,
) -> Contact {
    let ContactSource {
        body_a_index,
        body_b_index,
        child_a,
        child_b,
        feature_id,
        position_weight,
    } = source;
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
    let restitution_bias = if initial_normal_velocity < -threshold {
        -restitution * initial_normal_velocity
    } else {
        0.0
    };
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
        initial_relative_velocity,
        restitution_bias,
        static_friction,
        dynamic_friction,
        normal_impulse: 0.0,
        tangent_impulse: 0.0,
        is_sensor: body_a_view.is_sensor || body_b_view.is_sensor,
        position_weight,
        active: body_can_move(body_a) || body_can_move(body_b),
        slop: LINEAR_SLOP.min(
            0.05 * body_a_view
                .minimum_collider_extent()
                .min(body_b_view.minimum_collider_extent()),
        ),
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

// 筛选碰撞候选并生成含子形状身份、材质和缓存的接触集合。
fn collect_contacts(
    bodies: &[Body],
    bound_pairs: &HashSet<(usize, usize)>,
    data: &mut [f64],
    record_diagnostics: bool,
    coverage: &EdgeCoverage,
) -> Vec<Contact> {
    let mut broad_phase: Vec<(usize, Aabb)> = bodies
        .iter()
        .enumerate()
        .map(/* 计算并返回 (index , body . compound_aabb ())，用于当前 collect_contacts 流程。 */ |(index, body)| (index, body.compound_aabb()))
        .collect();
    // 26.43: sweep along the axis on which the bodies are spread most (tall levels and stacks
    // sort better along y), so fewer bounds overlap on the sweep axis.
    let count = broad_phase.len().max(1) as f64;
    let (mut mean_x, mut mean_y) = (0.0, 0.0);
    for (_, bounds) in &broad_phase {
        mean_x += (bounds.min_x + bounds.max_x) * 0.5 / count;
        mean_y += (bounds.min_y + bounds.max_y) * 0.5 / count;
    }
    let (mut spread_x, mut spread_y) = (0.0, 0.0);
    for (_, bounds) in &broad_phase {
        spread_x += ((bounds.min_x + bounds.max_x) * 0.5 - mean_x).powi(2);
        spread_y += ((bounds.min_y + bounds.max_y) * 0.5 - mean_y).powi(2);
    }
    let sweep_y = spread_y > spread_x;
    let lower = /* 扫掠轴上的下界。 */ |bounds: &Aabb| if sweep_y { bounds.min_y } else { bounds.min_x };
    let upper = /* 扫掠轴上的上界。 */ |bounds: &Aabb| if sweep_y { bounds.max_y } else { bounds.max_x };
    broad_phase.sort_by(/* 按扫掠轴下界排序，相同时按索引保持确定顺序。 */ |a, b| lower(&a.1).total_cmp(&lower(&b.1)).then(a.0.cmp(&b.0)));

    let mut contacts = Vec::new();
    for sorted_a in 0..broad_phase.len() {
        for sorted_b in (sorted_a + 1)..broad_phase.len() {
            let (first_index, first_bounds) = broad_phase[sorted_a];
            let (second_index, second_bounds) = broad_phase[sorted_b];
            if lower(&second_bounds) > upper(&first_bounds) {
                break;
            }
            if !first_bounds.overlaps(second_bounds) {
                continue;
            }
            // The lower body index is always side A, whichever axis is swept, so a contact keeps
            // its identity (and warm-start impulse) when the sweep axis changes.
            let (body_a_index, body_b_index) =
                (first_index.min(second_index), first_index.max(second_index));
            let ordered_pair = (
                body_a_index.min(body_b_index),
                body_a_index.max(body_b_index),
            );
            if bound_pairs.contains(&ordered_pair) {
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
            let variants_a =
                std::iter::once(None).chain((0..body_a.collider_children.len()).map(Some));
            for child_a_index in variants_a {
                let proxy_a = body_a.collider_proxy(child_a_index);
                let variants_b =
                    std::iter::once(None).chain((0..body_b.collider_children.len()).map(Some));
                for child_b_index in variants_b {
                    let proxy_b = body_b.collider_proxy(child_b_index);
                    if !proxy_a.can_collide_with(&proxy_b) {
                        continue;
                    }
                    let mut manifolds = collide(&proxy_a, &proxy_b);
                    // 26.43: drop contacts through internal edges of adjacent static polygons.
                    if child_a_index.is_none() && !proxy_b.is_static {
                        if let Some(edges) = coverage.get(&body_a_index) {
                            manifolds.retain(|manifold| keep_static_contact(&proxy_a, edges, &proxy_b, manifold, true));
                        }
                    }
                    if child_b_index.is_none() && !proxy_a.is_static {
                        if let Some(edges) = coverage.get(&body_b_index) {
                            manifolds.retain(|manifold| keep_static_contact(&proxy_b, edges, &proxy_a, manifold, false));
                        }
                    }
                    let position_weight = 1.0 / manifolds.len().max(1) as f64;
                    for (feature_id, manifold) in manifolds.into_iter().enumerate() {
                        if !proxy_a.accepts_one_way_contact(&proxy_b, manifold.normal)
                            || !proxy_b.accepts_one_way_contact(&proxy_a, manifold.normal.neg())
                        {
                            continue;
                        }
                        if record_diagnostics {
                            record_contact_diagnostics(data, body_a, body_b, &manifold);
                        }
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
                                feature_id: feature_id.min(u8::MAX as usize) as u8,
                                position_weight,
                            },
                        ));
                    }
                }
            }
        }
    }
    contacts
}

#[derive(Clone, Copy)]
struct SubStepContext {
    dt: f64,
    global_gravity: f64,
    air_friction: f64,
    record_diagnostics: bool,
}

// 执行一次子步的积分、接触与连接速度求解及位置修正。
#[allow(clippy::too_many_arguments)]
fn simulate_sub_step(
    bodies: &mut [Body],
    constraints: &mut [ConnectionConstraint],
    bound_pairs: &HashSet<(usize, usize)>,
    data: &mut [f64],
    context: SubStepContext,
    solver_iterations: usize,
    position_iterations: usize,
    impulse_cache: &mut HashMap<ContactCacheKey, (f64, f64)>,
    coverage: &EdgeCoverage,
) -> Vec<SolverContactSnapshot> {
    let start_poses: Vec<(Vec2, f64)> = bodies
        .iter()
        .map(/* 记录积分前位姿，供连续碰撞扫掠。 */ |body| (body.position, body.angle))
        .collect();
    for body in bodies.iter_mut() {
        body.integrate(context.dt, context.global_gravity, context.air_friction);
    }
    for constraint in constraints.iter_mut() {
        integrate_rope_nodes(
            constraint,
            context.dt,
            context.global_gravity,
            context.air_friction,
        );
    }
    sweep_continuous_bodies(bodies, &start_poses, bound_pairs);

    let mut contacts =
        collect_contacts(bodies, bound_pairs, data, context.record_diagnostics, coverage);
    for contact in &mut contacts {
        if let Some((normal, tangent)) = impulse_cache.get(&contact_cache_key(contact)).copied() {
            contact.normal_impulse = non_negative(normal, 0.0);
            contact.tangent_impulse = finite_or(tangent, 0.0);
            warm_start_contact(bodies, contact);
        }
    }
    for constraint in constraints.iter_mut() {
        resolve_rope_collisions(bodies, constraint);
    }
    for _ in 0..solver_iterations.clamp(1, 128) {
        for constraint in constraints.iter_mut() {
            solve_connection_velocity(bodies, constraint, context.dt);
        }
        let mut largest_change: f64 = 0.0;
        for contact in &mut contacts {
            largest_change = largest_change.max(solve_contact_velocity(bodies, contact));
        }
        // 26.43: a converged contact set (resting stacks, sleeping islands) needs no further
        // sweeps. Joints and ropes keep every configured iteration.
        if constraints.is_empty() && largest_change <= VELOCITY_TOLERANCE {
            break;
        }
    }
    // Anchor reprojection updates residual separation without regenerating collision manifolds.
    let anchors: Vec<_> = contacts
        .iter()
        .map(/* 将两端接触偏移转换到各自局部空间，供位置修正后重建接触点。 */ |contact| {
            (
                inverse_rotate(contact.radius_a, bodies[contact.body_a].angle),
                inverse_rotate(contact.radius_b, bodies[contact.body_b].angle),
            )
        })
        .collect();
    for _ in 0..position_iterations.clamp(1, 128) {
        for constraint in constraints.iter_mut() {
            correct_connection_position(bodies, constraint);
        }
        let mut maximum_error: f64 = 0.0;
        for (contact, (local_a, local_b)) in contacts.iter().zip(&anchors) {
            if contact.is_sensor || !contact.active {
                continue;
            }
            let a = &bodies[contact.body_a];
            let b = &bodies[contact.body_b];
            let mut projected = contact.clone();
            projected.radius_a = rotate(*local_a, a.angle);
            projected.radius_b = rotate(*local_b, b.angle);
            projected.depth = (contact.depth
                - b.position
                    .add(projected.radius_b)
                    .sub(a.position.add(projected.radius_a))
                    .dot(contact.normal))
            .max(0.0);
            maximum_error = maximum_error.max(projected.depth - projected.slop);
            correct_contact_position(bodies, &projected);
        }
        if constraints.is_empty() && maximum_error <= LINEAR_SLOP * 0.05 {
            break;
        }
    }
    for constraint in constraints.iter_mut() {
        constraint.evaluate_failure(bodies);
    }
    for constraint in constraints.iter() {
        if constraint.binding || constraint.joint_kind == 1 {
            correct_binding_position(bodies, constraint);
        }
        synchronize_binding_motion(bodies, constraint);
    }
    impulse_cache.clear();
    for contact in &contacts {
        if !contact.is_sensor {
            impulse_cache.insert(
                contact_cache_key(contact),
                (contact.normal_impulse, contact.tangent_impulse),
            );
        }
    }
    contacts
        .iter()
        .map(/* 将接触约束转换为世界空间快照，保留两端子体身份及求解冲量。 */ |contact| {
            let body_a = &bodies[contact.body_a];
            let body_b = &bodies[contact.body_b];
            let point_a = body_a.position.add(contact.radius_a);
            let point_b = body_b.position.add(contact.radius_b);
            SolverContactSnapshot {
                body_a: contact.body_a,
                body_b: contact.body_b,
                child_a: contact.child_a,
                child_b: contact.child_b,
                point: point_a.add(point_b).mul(0.5),
                normal: contact.normal,
                relative_velocity: body_b
                    .point_velocity(contact.radius_b)
                    .sub(body_a.point_velocity(contact.radius_a)),
                initial_relative_velocity: contact.initial_relative_velocity,
                normal_impulse: contact.normal_impulse,
                tangent_impulse: contact.tangent_impulse,
                normal_force: contact.normal_impulse / context.dt.max(f64::EPSILON),
                tangent_force: contact.tangent_impulse / context.dt.max(f64::EPSILON),
                penetration: contact.depth,
                sensor: contact.is_sensor,
            }
        })
        .collect()
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

struct SolverWorld {
    data: Vec<f64>,
    connection_data: Vec<f64>,
    bodies: Vec<Body>,
    constraints: Vec<ConnectionConstraint>,
    contacts: Vec<SolverContactSnapshot>,
    quality: SolverQuality,
    impulse_cache: HashMap<ContactCacheKey, (f64, f64)>,
    // 26.43: internal edges of adjacent static polygons, rebuilt when a static body changes.
    static_fingerprint: u64,
    edge_coverage: EdgeCoverage,
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
        let slow = island.iter().all(/* 检查物理岛中的刚体是否允许休眠且线速度、角速度均低于阈值。 */ |&index| {
            let body = &bodies[index];
            body.sleeping_allowed
                && body.velocity.length_squared()
                    <= quality.sleep_linear_threshold * quality.sleep_linear_threshold
                && body.angular_velocity.abs() <= quality.sleep_angular_threshold
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
            data,
            connection_data,
            bodies,
            constraints,
            contacts: Vec::new(),
            quality: quality.normalized(),
            impulse_cache: HashMap::new(),
            static_fingerprint: 0,
            edge_coverage: HashMap::new(),
        }
    }

    // 推进物理世界一个时间步，更新求解状态、缓存和事件。
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
        // 26.43: fast bodies are swept individually (sweep_continuous_bodies); the configured
        // substep count no longer grows with the fastest body in the world.
        let sub_steps = self.quality.minimum_substeps.clamp(1, MAX_SUB_STEPS);
        let fingerprint = static_fingerprint(&self.bodies);
        if fingerprint != self.static_fingerprint {
            self.edge_coverage = compute_edge_coverage(&self.bodies);
            self.static_fingerprint = fingerprint;
        }
        let sub_dt = dt / sub_steps as f64;
        for sub_step in 0..sub_steps {
            let contacts = simulate_sub_step(
                &mut self.bodies,
                &mut self.constraints,
                &bound_pairs,
                &mut self.data,
                SubStepContext {
                    dt: sub_dt,
                    global_gravity,
                    air_friction,
                    record_diagnostics: sub_step + 1 == sub_steps,
                },
                self.quality.solver_iterations,
                self.quality.position_iterations,
                &mut self.impulse_cache,
                &self.edge_coverage,
            );
            if sub_step + 1 == sub_steps {
                self.contacts = contacts;
            }
        }
        for body in &mut self.bodies {
            let has_contact = self.data[body.data_index + 29] > 0.0;
            body.update_sleep_state(
                dt,
                has_contact,
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
        );
        write_bodies(&mut self.data, &self.bodies);
        write_constraints(&mut self.connection_data, &self.constraints);
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
