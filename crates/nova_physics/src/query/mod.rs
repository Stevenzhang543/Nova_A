// 射线、重叠、形状扫掠及角色移动查询；包含坡面、台阶与复合碰撞回归。
#[derive(Clone, Copy, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhysicsQueryHit {
    pub handle: u32,
    pub point: [f64; 2],
    pub normal: [f64; 2],
    pub distance: f64,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterMoveResult {
    pub position: [f64; 2],
    pub applied_motion: [f64; 2],
    pub remaining_motion: [f64; 2],
    pub floor_normal: [f64; 2],
    pub wall_normal: [f64; 2],
    pub ceiling_normal: [f64; 2],
    pub platform_velocity: [f64; 2],
    pub on_floor: bool,
    pub on_wall: bool,
    pub on_ceiling: bool,
    pub slide_count: u32,
}

// 检查刚体层是否命中查询掩码。
fn query_enabled(mask: u32, body: &Body) -> bool {
    mask & (1_u32 << body.layer) != 0
}

// 按边方向检查点是否位于凸多边形内。
fn polygon_contains(vertices: &[Vec2], point: Vec2) -> bool {
    if vertices.len() < 3 {
        return false;
    }
    let mut sign = 0.0;
    for index in 0..vertices.len() {
        let cross = vertices[(index + 1) % vertices.len()]
            .sub(vertices[index])
            .cross(point.sub(vertices[index]));
        if cross.abs() <= EPSILON {
            continue;
        }
        if sign == 0.0 {
            sign = cross.signum();
        } else if sign * cross < 0.0 {
            return false;
        }
    }
    true
}

// 把世界点转换到碰撞体局部空间后执行形状包含测试。
fn point_in_body(body: &Body, point: Vec2) -> bool {
    let local = inverse_rotate(point.sub(body.collider_position()), body.collider_angle());
    match &body.shape {
        Shape::Ellipse { radius_x, radius_y } => {
            (local.x / radius_x).powi(2) + (local.y / radius_y).powi(2) <= 1.0 + EPSILON
        }
        Shape::Polygon { vertices } => polygon_contains(vertices, local),
    }
}

// 求射线与具体形状的精确交点、法线和距离。
fn ray_body(body: &Body, origin: Vec2, direction: Vec2, distance: f64) -> Option<PhysicsQueryHit> {
    let direction = direction.normalized_or(Vec2::new(1.0, 0.0));
    if point_in_body(body, origin) {
        return Some(PhysicsQueryHit {
            handle: 0,
            point: [origin.x, origin.y],
            normal: [-direction.x, -direction.y],
            distance: 0.0,
        });
    }
    match &body.shape {
        Shape::Ellipse { radius_x, radius_y } => {
            let local_origin =
                inverse_rotate(origin.sub(body.collider_position()), body.collider_angle());
            let local_direction = inverse_rotate(direction, body.collider_angle());
            let a = (local_direction.x / radius_x).powi(2) + (local_direction.y / radius_y).powi(2);
            let b = 2.0
                * (local_origin.x * local_direction.x / radius_x.powi(2)
                    + local_origin.y * local_direction.y / radius_y.powi(2));
            let c = (local_origin.x / radius_x).powi(2) + (local_origin.y / radius_y).powi(2) - 1.0;
            let discriminant = b * b - 4.0 * a * c;
            if a <= EPSILON || discriminant < 0.0 {
                return None;
            }
            let root = discriminant.sqrt();
            let t = [(-b - root) / (2.0 * a), (-b + root) / (2.0 * a)]
                .into_iter()
                .filter(/* 判断 * value >= 0.0 && * value <= distance 是否成立，供过滤或有效性检查使用。 */ |value| *value >= 0.0 && *value <= distance)
                .min_by(f64::total_cmp)?;
            let local_point = local_origin.add(local_direction.mul(t));
            let local_normal = Vec2::new(
                local_point.x / radius_x.powi(2),
                local_point.y / radius_y.powi(2),
            )
            .normalized_or(local_direction.neg());
            let normal = rotate(local_normal, body.collider_angle());
            let point = origin.add(direction.mul(t));
            Some(PhysicsQueryHit {
                handle: 0,
                point: [point.x, point.y],
                normal: [normal.x, normal.y],
                distance: t,
            })
        }
        Shape::Polygon { vertices } => {
            let world_vertices: Vec<Vec2> = vertices
                .iter()
                .map(/* 计算并返回 body . collider_position () . add (rotate (* vertex , body . collider_angle ()))，用于当前 ray_body 流程。 */ |vertex| {
                    body.collider_position()
                        .add(rotate(*vertex, body.collider_angle()))
                })
                .collect();
            let signed_area: f64 = (0..world_vertices.len())
                .map(/* 计算并返回 world_vertices [index] . cross (world_vertices [(index + 1) % world_vertices . len ()])，用于当前 ray_body 流程。 */ |index| {
                    world_vertices[index].cross(world_vertices[(index + 1) % world_vertices.len()])
                })
                .sum();
            let mut closest: Option<(f64, Vec2)> = None;
            for index in 0..world_vertices.len() {
                let a = world_vertices[index];
                let b = world_vertices[(index + 1) % world_vertices.len()];
                let edge = b.sub(a);
                let denominator = direction.cross(edge);
                if denominator.abs() <= EPSILON {
                    continue;
                }
                let delta = a.sub(origin);
                let ray_t = delta.cross(edge) / denominator;
                let edge_t = delta.cross(direction) / denominator;
                if ray_t < 0.0 || ray_t > distance || !(-EPSILON..=1.0 + EPSILON).contains(&edge_t)
                {
                    continue;
                }
                let raw = if signed_area >= 0.0 {
                    Vec2::new(edge.y, -edge.x)
                } else {
                    Vec2::new(-edge.y, edge.x)
                };
                let normal = raw.normalized_or(direction.neg());
                if closest.map_or(true, /* 判断 ray_t < value . 0 是否成立，供过滤或有效性检查使用。 */ |value| ray_t < value.0) {
                    closest = Some((ray_t, normal));
                }
            }
            closest.map(/* 由射线距离计算交点，并保存法线及距离到命中记录。 */ |(t, normal)| {
                let point = origin.add(direction.mul(t));
                PhysicsQueryHit {
                    handle: 0,
                    point: [point.x, point.y],
                    normal: [normal.x, normal.y],
                    distance: t,
                }
            })
        }
    }
}

// 将查询形状包装为不参与动力学的临时刚体。
fn query_shape(shape: Shape, position: Vec2, angle: f64) -> Body {
    Body {
        data_index: usize::MAX,
        shape,
        position,
        velocity: Vec2::ZERO,
        acceleration: Vec2::ZERO,
        angle,
        angular_velocity: 0.0,
        force: Vec2::ZERO,
        torque: 0.0,
        mass: 1.0,
        inv_mass: 0.0,
        inertia: 1.0,
        inv_inertia: 0.0,
        gravity_scale: 0.0,
        local_gravity: 0.0,
        linear_damping: 0.0,
        angular_damping: 0.0,
        restitution: 0.0,
        restitution_threshold: 0.0,
        static_friction: 0.0,
        dynamic_friction: 0.0,
        friction_combine: 0,
        restitution_combine: 3,
        is_static: true,
        is_kinematic: false,
        is_sensor: true,
        layer: 0,
        collision_mask: u32::MAX,
        collider_offset: Vec2::ZERO,
        collider_angle_offset: 0.0,
        freeze_rotation: true,
        continuous_collision: false,
        sleeping_allowed: false,
        sleeping: false,
        sleep_timer: 0.0,
        one_way: false,
        one_way_normal: Vec2::new(0.0, 1.0),
        auto_inertia: false,
        collider_children: Vec::new(),
    }
}

// 根据半宽和半高构造矩形凸多边形。
fn box_shape(half_width: f64, half_height: f64) -> Shape {
    Shape::Polygon {
        vertices: vec![
            Vec2::new(-half_width, -half_height),
            Vec2::new(half_width, -half_height),
            Vec2::new(half_width, half_height),
            Vec2::new(-half_width, half_height),
        ],
    }
}

// 计算射线穿越轴对齐边界盒的有效距离区间。
fn ray_aabb_interval(
    origin: Vec2,
    direction: Vec2,
    distance: f64,
    bounds: Aabb,
) -> Option<(f64, f64)> {
    let mut entry: f64 = 0.0;
    let mut exit = distance;
    for (origin_axis, direction_axis, minimum, maximum) in [
        (origin.x, direction.x, bounds.min_x, bounds.max_x),
        (origin.y, direction.y, bounds.min_y, bounds.max_y),
    ] {
        if direction_axis.abs() <= EPSILON {
            if origin_axis < minimum || origin_axis > maximum {
                return None;
            }
            continue;
        }
        let first = (minimum - origin_axis) / direction_axis;
        let second = (maximum - origin_axis) / direction_axis;
        entry = entry.max(first.min(second));
        exit = exit.min(first.max(second));
        if entry > exit {
            return None;
        }
    }
    (exit >= 0.0 && entry <= distance).then_some((entry.max(0.0), exit.min(distance)))
}

impl PhysicsWorld {
    // 读取当前持久刚体数据并展开可查询的碰撞形状。
    fn query_records(&self) -> Vec<(u32, Body)> {
        self.query_records_with_identity()
            .into_iter()
            .map(/* 计算并返回 (handle , body)，用于当前 query_records 流程。 */ |(handle, _, body)| (handle, body))
            .collect()
    }

    // 按掩码执行射线查询，返回按距离稳定排序的全部命中。
    pub fn raycast_all(
        &self,
        origin: [f64; 2],
        direction: [f64; 2],
        distance: f64,
        mask: u32,
    ) -> Vec<PhysicsQueryHit> {
        let origin = Vec2::new(finite_or(origin[0], 0.0), finite_or(origin[1], 0.0));
        let direction = Vec2::new(finite_or(direction[0], 1.0), finite_or(direction[1], 0.0));
        let distance = non_negative(distance, 0.0);
        let mut hits: Vec<_> = self
            .query_records()
            .into_iter()
            .filter_map(/* 先检查查询掩码，再计算精确交点并补入所属刚体句柄。 */ |(handle, body)| {
                if !query_enabled(mask, &body) {
                    return None;
                }
                ray_body(&body, origin, direction, distance).map(/* 计算并返回 hit . handle = handle ; hit，用于当前 raycast_all 流程。 */ |mut hit| {
                    hit.handle = handle;
                    hit
                })
            })
            .collect();
        hits.sort_by(/* 按 first . distance . total_cmp (& second . distance) . then (first . handle . cmp (& second . handle)) 比较顺序，供稳定排序使用。 */ |first, second| {
            first
                .distance
                .total_cmp(&second.distance)
                .then(first.handle.cmp(&second.handle))
        });
        // The public query contract returns bodies, so retain the closest
        // child hit for each owner without reporting duplicates.
        let mut owners = HashSet::new();
        hits.retain(/* 计算并返回 owners . insert (hit . handle)，用于当前 raycast_all 流程。 */ |hit| owners.insert(hit.handle));
        hits
    }

    // 返回射线查询中最近的合格命中。
    pub fn raycast(
        &self,
        origin: [f64; 2],
        direction: [f64; 2],
        distance: f64,
        mask: u32,
    ) -> Option<PhysicsQueryHit> {
        self.raycast_all(origin, direction, distance, mask)
            .into_iter()
            .next()
    }

    // 查询包含给定世界点且通过掩码的刚体。
    pub fn overlap_point(&self, point: [f64; 2], mask: u32) -> Vec<u32> {
        let point = Vec2::new(finite_or(point[0], 0.0), finite_or(point[1], 0.0));
        let mut owners = HashSet::new();
        self.query_records()
            .into_iter()
            .filter_map(/* 判断 (query_enabled (mask , & body) && point_in_body (& body , point) && owners . insert (handle)) . then_some (handle) 是否成立，供过滤或有效性检查使用。 */ |(handle, body)| {
                (query_enabled(mask, &body) && point_in_body(&body, point) && owners.insert(handle))
                    .then_some(handle)
            })
            .collect()
    }

    // 构造圆形查询体并返回符合掩码的重叠刚体。
    pub fn overlap_circle(&self, center: [f64; 2], radius: f64, mask: u32) -> Vec<u32> {
        let query = query_shape(
            Shape::Ellipse {
                radius_x: positive(radius, MIN_DIMENSION),
                radius_y: positive(radius, MIN_DIMENSION),
            },
            Vec2::new(finite_or(center[0], 0.0), finite_or(center[1], 0.0)),
            0.0,
        );
        self.overlap_shape(&query, mask)
    }

    // 构造可旋转矩形查询体并返回重叠刚体。
    pub fn overlap_box(&self, center: [f64; 2], size: [f64; 2], angle: f64, mask: u32) -> Vec<u32> {
        let query = query_shape(
            box_shape(
                positive(size[0].abs(), MIN_DIMENSION) * 0.5,
                positive(size[1].abs(), MIN_DIMENSION) * 0.5,
            ),
            Vec2::new(finite_or(center[0], 0.0), finite_or(center[1], 0.0)),
            normalize_angle(angle),
        );
        self.overlap_shape(&query, mask)
    }

    // 对候选刚体执行精确形状相交测试，收集重叠身份。
    fn overlap_shape(&self, query: &Body, mask: u32) -> Vec<u32> {
        let mut owners = HashSet::new();
        self.query_records()
            .into_iter()
            .filter_map(/* 判断 (query_enabled (mask , & body) && ! collide (query , & body) . is_empty () && owners . insert (handle)) . then_some (handle) 是否成立，供过滤或有效性检查使用。 */ |(handle, body)| {
                (query_enabled(mask, &body)
                    && !collide(query, &body).is_empty()
                    && owners.insert(handle))
                .then_some(handle)
            })
            .collect()
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
        self.shape_cast_excluding(center, size, angle, direction, distance, mask, None)
    }

    // 执行形状扫掠并排除指定刚体，避免角色与自身相撞。
    #[allow(clippy::too_many_arguments)]
    fn shape_cast_excluding(
        &self,
        center: [f64; 2],
        size: [f64; 2],
        angle: f64,
        direction: [f64; 2],
        distance: f64,
        mask: u32,
        excluded_handle: Option<u32>,
    ) -> Option<PhysicsQueryHit> {
        let start = Vec2::new(finite_or(center[0], 0.0), finite_or(center[1], 0.0));
        let direction = Vec2::new(finite_or(direction[0], 1.0), finite_or(direction[1], 0.0));
        self.query_records()
            .into_iter()
            .filter_map(/* 排除自身、不匹配掩码及角色查询中的传感器，再执行精确矩形扫掠。 */ |(handle, body)| {
                if Some(handle) == excluded_handle
                    || !query_enabled(mask, &body)
                    || (excluded_handle.is_some() && body.is_sensor)
                {
                    return None;
                }
                cast_box_against_body(
                    start,
                    size,
                    angle,
                    direction,
                    non_negative(distance, 0.0),
                    &body,
                )
                .map(/* 计算并返回 hit . handle = handle ; hit，用于当前 shape_cast_excluding 流程。 */ |mut hit| {
                    hit.handle = handle;
                    hit
                })
            })
            .min_by(/* 按 a . distance . total_cmp (& b . distance) . then (a . handle . cmp (& b . handle)) 比较顺序，供稳定排序使用。 */ |a, b| {
                a.distance
                    .total_cmp(&b.distance)
                    .then(a.handle.cmp(&b.handle))
            })
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
        let Some(body_index) = self.body_index.get(&handle).copied() else {
            return Err("character body handle does not exist");
        };
        let start = Vec2::new(
            finite_or(self.bodies[body_index].values[2], 0.0),
            finite_or(self.bodies[body_index].values[3], 0.0),
        );
        let body_angle = normalize_angle(self.bodies[body_index].values[14]);
        let mut geometry = Body::from_data(&self.bodies[body_index].values, 0);
        geometry.apply_collider_children(&self.bodies[body_index].collider_shapes);
        // CharacterBody2D has a box envelope contract. Include the real collider
        // offset/rotation and every nonsensor compound child in its local bounds.
        geometry.position = Vec2::ZERO;
        geometry.angle = 0.0;
        geometry.shape = box_shape(
            positive(size[0].abs(), MIN_DIMENSION) * 0.5,
            positive(size[1].abs(), MIN_DIMENSION) * 0.5,
        );
        let mut bounds = geometry
            .shape
            .aabb(geometry.collider_offset, geometry.collider_angle_offset);
        for child in &geometry.collider_children {
            if child.is_sensor {
                continue;
            }
            let other = child.shape.aabb(child.offset, child.angle_offset);
            bounds.min_x = bounds.min_x.min(other.min_x);
            bounds.max_x = bounds.max_x.max(other.max_x);
            bounds.min_y = bounds.min_y.min(other.min_y);
            bounds.max_y = bounds.max_y.max(other.max_y);
        }
        let offset = rotate(
            Vec2::new(
                (bounds.min_x + bounds.max_x) * 0.5,
                (bounds.min_y + bounds.max_y) * 0.5,
            ),
            body_angle,
        );
        let start = start.add(offset);
        let angle = body_angle;
        let size = [bounds.max_x - bounds.min_x, bounds.max_y - bounds.min_y];
        let requested = Vec2::new(
            finite_or(displacement[0], 0.0),
            finite_or(displacement[1], 0.0),
        );
        let slope_cosine = finite_or(max_slope_angle, std::f64::consts::FRAC_PI_4)
            .clamp(0.0, std::f64::consts::FRAC_PI_2)
            .cos();
        let step_height = non_negative(step_height, 0.0);
        let floor_snap = non_negative(floor_snap, 0.0);
        let margin = non_negative(safe_margin, 1.0e-5).max(1.0e-9);
        let maximum_slides = max_slides.clamp(1, 32);
        let mut result = CharacterMoveResult {
            position: [start.x, start.y],
            remaining_motion: [requested.x, requested.y],
            ..CharacterMoveResult::default()
        };
        let mut position = start;
        let mut remaining = requested;

        for _ in 0..maximum_slides {
            let distance = remaining.length();
            if distance <= EPSILON {
                break;
            }
            let direction = remaining.mul(1.0 / distance);
            let hit = self.shape_cast_excluding(
                [position.x, position.y],
                size,
                angle,
                [direction.x, direction.y],
                distance + margin,
                mask,
                Some(handle),
            );
            let Some(hit) = hit else {
                position = position.add(remaining);
                remaining = Vec2::ZERO;
                break;
            };
            let travel = (hit.distance - margin).clamp(0.0, distance);
            position = position.add(direction.mul(travel));
            let normal = Vec2::new(hit.normal[0], hit.normal[1]).normalized_or(direction.neg());
            if normal.y >= slope_cosine {
                result.on_floor = true;
                result.floor_normal = [normal.x, normal.y];
                if let Some(platform) = self
                    .bodies
                    .iter()
                    .find(/* 判断 record . handle == hit . handle 是否成立，供过滤或有效性检查使用。 */ |record| record.handle == hit.handle)
                {
                    result.platform_velocity = [
                        finite_or(platform.values[4], 0.0),
                        finite_or(platform.values[5], 0.0),
                    ];
                }
            } else if normal.y <= -slope_cosine {
                result.on_ceiling = true;
                result.ceiling_normal = [normal.x, normal.y];
            } else {
                result.on_wall = true;
                result.wall_normal = [normal.x, normal.y];
            }
            result.slide_count = result.slide_count.saturating_add(1);

            let untravelled = direction.mul((distance - travel).max(0.0));
            if result.on_wall && step_height > EPSILON && direction.y.abs() < 0.5 {
                let raised = position.add(Vec2::new(0.0, step_height));
                let step_hit = self.shape_cast_excluding(
                    [raised.x, raised.y],
                    size,
                    angle,
                    [direction.x, direction.y],
                    untravelled.length(),
                    mask,
                    Some(handle),
                );
                let ceiling_hit = self.shape_cast_excluding(
                    [position.x, position.y],
                    size,
                    angle,
                    [0.0, 1.0],
                    step_height + margin,
                    mask,
                    Some(handle),
                );
                if step_hit.is_none() && ceiling_hit.is_none() {
                    position = raised.add(untravelled);
                    remaining = Vec2::ZERO;
                    break;
                }
            }
            let into_surface = untravelled.dot(normal);
            remaining = if into_surface < 0.0 {
                untravelled.sub(normal.mul(into_surface))
            } else {
                untravelled
            };
            if remaining.length() <= margin {
                remaining = Vec2::ZERO;
                break;
            }
        }

        if floor_snap > EPSILON && !result.on_floor && requested.y <= EPSILON {
            if let Some(hit) = self.shape_cast_excluding(
                [position.x, position.y],
                size,
                angle,
                [0.0, -1.0],
                floor_snap + margin,
                mask,
                Some(handle),
            ) {
                let normal =
                    Vec2::new(hit.normal[0], hit.normal[1]).normalized_or(Vec2::new(0.0, 1.0));
                if normal.y >= slope_cosine {
                    position.y -= (hit.distance - margin).clamp(0.0, floor_snap);
                    result.on_floor = true;
                    result.floor_normal = [normal.x, normal.y];
                    if let Some(platform) = self
                        .bodies
                        .iter()
                        .find(/* 判断 record . handle == hit . handle 是否成立，供过滤或有效性检查使用。 */ |record| record.handle == hit.handle)
                    {
                        result.platform_velocity = [
                            finite_or(platform.values[4], 0.0),
                            finite_or(platform.values[5], 0.0),
                        ];
                    }
                }
            }
        }

        let body_position = position.sub(offset);
        self.set_transform(handle, body_position.x, body_position.y, body_angle)?;
        result.position = [body_position.x, body_position.y];
        result.applied_motion = [position.x - start.x, position.y - start.y];
        result.remaining_motion = [remaining.x, remaining.y];
        Ok(result)
    }
}

#[cfg(test)]
mod query_tests {
    use super::*;

    // 构造矩形测试刚体的扁平记录。
    fn box_record(x: f64, y: f64, layer: u32) -> Vec<f64> {
        let mut record = vec![0.0; STRIDE];
        record[2] = x;
        record[3] = y;
        record[8] = 1.0;
        record[9] = 1.0;
        record[12] = 2.0;
        record[13] = 2.0;
        record[25] = 1.0;
        record[26] = 1.0;
        record[33] = layer as f64;
        record[42] = u32::MAX as f64;
        record
    }

    // 验证查询按掩码筛选并按距离稳定返回精确命中。
    #[test]
    fn queries_return_sorted_masked_precise_hits() {
        let mut world = PhysicsWorld::new();
        world.create_body(20, 1, &box_record(5.0, 0.0, 1)).unwrap();
        world.create_body(10, 0, &box_record(2.0, 0.0, 0)).unwrap();
        let hits = world.raycast_all([0.0, 0.0], [1.0, 0.0], 10.0, u32::MAX);
        assert_eq!(
            hits.iter().map(/* 在当前宏表达式中计算 hit . handle，供查询映射、过滤或断言使用。 */ |hit| hit.handle).collect::<Vec<_>>(),
            vec![10, 20]
        );
        assert!((hits[0].distance - 1.0).abs() < 1.0e-10);
        assert_eq!(
            world
                .raycast([0.0, 0.0], [1.0, 0.0], 10.0, 1 << 1)
                .unwrap()
                .handle,
            20
        );
        assert_eq!(world.overlap_point([2.0, 0.0], 1), vec![10]);
        assert_eq!(world.overlap_circle([5.0, 0.0], 0.5, 1 << 1), vec![20]);
        assert_eq!(world.overlap_box([2.0, 0.0], [0.5, 0.5], 0.0, 1), vec![10]);
        let cast = world
            .shape_cast([0.0, 0.0], [0.5, 0.5], 0.0, [1.0, 0.0], 10.0, 1)
            .unwrap();
        assert_eq!(cast.handle, 10);
        assert!((cast.distance - 0.75).abs() < 1.0e-6);
    }

    // 验证复合子形状使用自身偏移与碰撞层。
    #[test]
    fn compound_children_are_queried_at_their_exact_offsets_and_layers() {
        let mut world = PhysicsWorld::new();
        world.create_body(10, 0, &box_record(0.0, 10.0, 0)).unwrap();
        let mut child = vec![0.0; COLLIDER_CHILD_STRIDE];
        child[0] = 42.0;
        child[1] = 3.0;
        child[2] = 4.0;
        child[3] = -10.0;
        child[5] = 2.0;
        child[6] = 2.0;
        child[8] = 1.0;
        child[9] = u32::MAX as f64;
        world.upsert_collider_shapes(10, &child).unwrap();
        assert_eq!(world.overlap_point([4.0, 0.0], 2), vec![10]);
        assert!(world.overlap_point([4.0, 0.0], 1).is_empty());
        assert!(world.overlap_point([2.0, 5.0], u32::MAX).is_empty());
        assert_eq!(world.overlap_circle([4.0, 0.0], 0.5, 2), vec![10]);
        assert_eq!(world.overlap_box([4.0, 0.0], [0.5, 0.5], 0.0, 2), vec![10]);
        let ray = world.raycast([0.0, 0.0], [1.0, 0.0], 10.0, 2).unwrap();
        assert_eq!(ray.handle, 10);
        assert!((ray.distance - 3.0).abs() < 1.0e-9);
        let sweep = world
            .shape_cast([0.0, 0.0], [1.0, 1.0], 0.0, [1.0, 0.0], 10.0, 2)
            .unwrap();
        assert!((sweep.distance - 2.5).abs() < 1.0e-6);

        let mut second_child = child.clone();
        second_child[0] = 43.0;
        second_child[2] = 4.5;
        child.extend(second_child);
        world.upsert_collider_shapes(10, &child).unwrap();
        assert_eq!(world.overlap_point([4.0, 0.0], 2), vec![10]);
        assert_eq!(world.overlap_circle([4.0, 0.0], 0.5, 2), vec![10]);
        assert_eq!(world.raycast_all([0.0, 0.0], [1.0, 0.0], 10.0, 2).len(), 1);
    }

    // 验证角色与复合实体碰撞，但不被传感器阻挡。
    #[test]
    fn characters_collide_with_compound_children_but_not_sensors() {
        let mut world = PhysicsWorld::new();
        world.create_body(1, 0, &box_record(0.0, 0.0, 0)).unwrap();
        world.create_body(2, 1, &box_record(0.0, 10.0, 0)).unwrap();
        let mut child = vec![0.0; COLLIDER_CHILD_STRIDE];
        child[0] = 42.0;
        child[1] = 3.0;
        child[2] = 4.0;
        child[3] = -10.0;
        child[5] = 2.0;
        child[6] = 2.0;
        child[9] = u32::MAX as f64;
        world.upsert_collider_shapes(2, &child).unwrap();
        let moved = world
            .move_character_box(1, [2.0, 2.0], [10.0, 0.0], 0.5, 0.0, 0.0, 4, 1.0e-5, 1)
            .unwrap();
        assert!(moved.on_wall);
        assert!((moved.position[0] - 2.0).abs() < 1.0e-4);
        world.set_transform(1, 0.0, 0.0, 0.0).unwrap();
        child[7] = 1.0;
        world.upsert_collider_shapes(2, &child).unwrap();
        let through_sensor = world
            .move_character_box(1, [2.0, 2.0], [10.0, 0.0], 0.5, 0.0, 0.0, 4, 1.0e-5, 1)
            .unwrap();
        assert!(!through_sensor.on_wall);
        assert!((through_sensor.position[0] - 10.0).abs() < 1.0e-9);
        assert_eq!(world.overlap_point([4.0, 0.0], 1), vec![2]);
    }

    // 验证角色移动使用世界单位，并排除自身碰撞体。
    #[test]
    fn character_motion_uses_exact_units_and_excludes_its_own_collider() {
        let mut world = PhysicsWorld::new();
        world.create_body(1, 0, &box_record(0.0, 0.0, 0)).unwrap();
        world.create_body(2, 1, &box_record(4.0, 0.0, 0)).unwrap();
        let moved = world
            .move_character_box(
                1,
                [2.0, 2.0],
                [10.0, 0.0],
                std::f64::consts::FRAC_PI_4,
                0.0,
                0.0,
                4,
                1.0e-5,
                1,
            )
            .unwrap();
        assert!(moved.on_wall);
        assert!((moved.position[0] - 2.0).abs() < 1.0e-4);
        assert!((moved.applied_motion[0] - 2.0).abs() < 1.0e-4);
    }

    // 验证地面、天花板分类及移动平台速度报告。
    #[test]
    fn character_classifies_floor_ceiling_and_moving_platform_velocity() {
        let mut world = PhysicsWorld::new();
        world.create_body(1, 0, &box_record(0.0, 0.0, 0)).unwrap();
        let mut floor = box_record(0.0, -3.0, 0);
        floor[4] = 2.5;
        world.create_body(2, 1, &floor).unwrap();
        world.create_body(3, 2, &box_record(0.0, 3.0, 0)).unwrap();
        let down = world
            .move_character_box(
                1,
                [2.0, 2.0],
                [0.0, -10.0],
                std::f64::consts::FRAC_PI_4,
                0.0,
                0.0,
                4,
                1.0e-5,
                1,
            )
            .unwrap();
        assert!(down.on_floor && down.floor_normal[1] > 0.99);
        assert!((down.platform_velocity[0] - 2.5).abs() < 1.0e-10);
        world.set_transform(1, 0.0, 0.0, 0.0).unwrap();
        let up = world
            .move_character_box(
                1,
                [2.0, 2.0],
                [0.0, 10.0],
                std::f64::consts::FRAC_PI_4,
                0.0,
                0.0,
                4,
                1.0e-5,
                1,
            )
            .unwrap();
        assert!(up.on_ceiling && up.ceiling_normal[1] < -0.99);
    }

    // 验证长距离连续扫掠仍命中薄旋转目标。
    #[test]
    fn continuous_polygon_sweeps_hit_thin_rotated_targets_over_long_travel() {
        let mut world = PhysicsWorld::new();
        let mut wall = box_record(10000.0, 0.0, 0);
        wall[12] = 0.00001;
        wall[13] = 100.0;
        wall[14] = 0.6;
        world.create_body(9, 0, &wall).unwrap();
        let hit = world
            .shape_cast([0.0, 0.0], [0.00001, 0.00001], 0.2, [1.0, 0.0], 20000.0, 1)
            .unwrap();
        assert!(hit.distance > 9999.9 && hit.distance < 10000.0);
        assert_eq!(hit.handle, 9);
    }

    // 验证跨台阶不会穿过低顶，静止吸附仍更新地面状态。
    #[test]
    fn step_up_cannot_teleport_through_a_low_ceiling_and_idle_snap_refreshes_floor() {
        let mut world = PhysicsWorld::new();
        world.create_body(1, 0, &box_record(0.0, 0.0, 0)).unwrap();
        world.create_body(2, 1, &box_record(4.0, 0.0, 0)).unwrap();
        world.create_body(3, 2, &box_record(2.0, 2.5, 0)).unwrap();
        let moved = world
            .move_character_box(1, [2.0, 2.0], [8.0, 0.0], 0.5, 3.0, 0.0, 4, 1e-5, 1)
            .unwrap();
        assert!(moved.position[0] < 2.01);
        assert!(moved.position[1] < 0.01);
        world.set_transform(1, 0.0, 0.2, 0.0).unwrap();
        world.create_body(4, 3, &box_record(0.0, -2.0, 0)).unwrap();
        let idle = world
            .move_character_box(1, [2.0, 2.0], [0.0, 0.0], 0.5, 0.0, 0.5, 4, 1e-5, 1)
            .unwrap();
        assert!(idle.on_floor);
        world.destroy_body(4);
        let removed = world
            .move_character_box(1, [2.0, 2.0], [0.0, 0.0], 0.5, 0.0, 0.5, 4, 1e-5, 1)
            .unwrap();
        assert!(!removed.on_floor);
    }

    // 验证地面吸附距离和台阶高度使用世界单位。
    #[test]
    fn character_floor_snap_and_step_height_are_applied_in_world_units() {
        let mut snap_world = PhysicsWorld::new();
        snap_world
            .create_body(1, 0, &box_record(0.0, 0.2, 0))
            .unwrap();
        snap_world
            .create_body(2, 1, &box_record(0.0, -2.0, 0))
            .unwrap();
        let snapped = snap_world
            .move_character_box(
                1,
                [2.0, 2.0],
                [0.25, 0.0],
                std::f64::consts::FRAC_PI_4,
                0.0,
                0.5,
                4,
                1.0e-5,
                1,
            )
            .unwrap();
        assert!(snapped.on_floor);
        assert!((snapped.position[1]).abs() < 1.0e-4);

        let mut step_world = PhysicsWorld::new();
        step_world
            .create_body(1, 0, &box_record(0.0, 0.0, 0))
            .unwrap();
        step_world
            .create_body(2, 1, &box_record(4.0, 0.0, 0))
            .unwrap();
        let stepped = step_world
            .move_character_box(
                1,
                [2.0, 2.0],
                [8.0, 0.0],
                std::f64::consts::FRAC_PI_4,
                3.0,
                0.0,
                4,
                1.0e-5,
                1,
            )
            .unwrap();
        assert!(stepped.position[0] > 7.9);
        assert!((stepped.position[1] - 3.0).abs() < 1.0e-4);
    }

    // 验证坡度限制内的旋转表面可作为地面。
    #[test]
    fn character_accepts_a_rotated_surface_inside_the_slope_limit() {
        let mut world = PhysicsWorld::new();
        world.create_body(1, 0, &box_record(0.0, 4.0, 0)).unwrap();
        let mut slope = box_record(0.0, 0.0, 0);
        slope[12] = 10.0;
        slope[13] = 1.0;
        slope[14] = 0.25;
        for (index, (x, y)) in [(-5.0, -0.5), (5.0, -0.5), (5.0, 0.5), (-5.0, 0.5)]
            .iter()
            .enumerate()
        {
            slope[34 + index * 2] = *x;
            slope[35 + index * 2] = *y;
        }
        world.create_body(2, 1, &slope).unwrap();
        let result = world
            .move_character_box(1, [1.0, 2.0], [0.0, -8.0], 0.5, 0.0, 0.0, 4, 1.0e-5, 1)
            .unwrap();
        assert!(result.on_floor);
        assert!(result.floor_normal[1] >= 0.5_f64.cos());
    }
}

// 连续计算移动矩形与目标形状的首次接触，避免离散采样穿透。
fn cast_box_against_body(
    start: Vec2,
    size: [f64; 2],
    angle: f64,
    direction: Vec2,
    distance: f64,
    body: &Body,
) -> Option<PhysicsQueryHit> {
    let direction = direction.normalized_or(Vec2::new(1.0, 0.0));
    let shape = box_shape(
        positive(size[0].abs(), MIN_DIMENSION) * 0.5,
        positive(size[1].abs(), MIN_DIMENSION) * 0.5,
    );
    let query_bounds = shape.aabb(Vec2::ZERO, normalize_angle(angle));
    let query_half_width = query_bounds.max_x.abs().max(query_bounds.min_x.abs());
    let query_half_height = query_bounds.max_y.abs().max(query_bounds.min_y.abs());
    if body.one_way {
        let allowed =
            rotate(body.one_way_normal, body.collider_angle()).normalized_or(Vec2::new(0.0, 1.0));
        if direction.dot(allowed) >= -EPSILON
            || start.sub(body.collider_position()).dot(allowed) < -POSITION_SLOP
        {
            return None;
        }
    }
    let target_bounds = body
        .shape
        .aabb(body.collider_position(), body.collider_angle());
    let expanded = Aabb {
        min_x: target_bounds.min_x - query_half_width,
        max_x: target_bounds.max_x + query_half_width,
        min_y: target_bounds.min_y - query_half_height,
        max_y: target_bounds.max_y + query_half_height,
    };
    let (entry, exit) = ray_aabb_interval(start, direction, distance, expanded)?;
    let collides_at = /* 在给定扫掠距离构造查询体，并取其与目标的首个接触流形。 */ |travel: f64| {
        let query = query_shape(
            shape.clone(),
            start.add(direction.mul(travel)),
            normalize_angle(angle),
        );
        collide(&query, body).into_iter().next()
    };
    if let Some(manifold) = collides_at(0.0) {
        let surface_normal = manifold.normal.neg();
        let hit = PhysicsQueryHit {
            handle: 0,
            point: [manifold.point.x, manifold.point.y],
            normal: [surface_normal.x, surface_normal.y],
            distance: 0.0,
        };
        return Some(hit);
    }
    if let Shape::Polygon { vertices } = &body.shape {
        // Continuous SAT: intersect the exact time interval on every separating axis.
        // Thin/rotated targets cannot fall between a finite number of sample positions.
        let mut axes = vec![
            rotate(Vec2::new(1.0, 0.0), angle),
            rotate(Vec2::new(0.0, 1.0), angle),
        ];
        for index in 0..vertices.len() {
            let edge = rotate(
                vertices[(index + 1) % vertices.len()].sub(vertices[index]),
                body.collider_angle(),
            );
            if edge.length_squared() > EPSILON * EPSILON {
                axes.push(Vec2::new(-edge.y, edge.x).normalized_or(Vec2::new(1.0, 0.0)));
            }
        }
        let mut first: f64 = 0.0;
        let mut last = distance;
        let mut normal = direction.neg();
        for axis in axes {
            let query_min = shape.support(start, angle, axis.neg()).dot(axis);
            let query_max = shape.support(start, angle, axis).dot(axis);
            let target_min = body
                .shape
                .support(body.collider_position(), body.collider_angle(), axis.neg())
                .dot(axis);
            let target_max = body
                .shape
                .support(body.collider_position(), body.collider_angle(), axis)
                .dot(axis);
            let speed = direction.dot(axis);
            if speed.abs() <= EPSILON {
                if query_max < target_min || query_min > target_max {
                    return None;
                }
                continue;
            }
            let a = (target_min - query_max) / speed;
            let b = (target_max - query_min) / speed;
            let entry = a.min(b);
            let exit = a.max(b);
            if entry > first {
                first = entry;
                normal = if speed > 0.0 { axis.neg() } else { axis };
            }
            last = last.min(exit);
            if first > last {
                return None;
            }
        }
        if last < 0.0 || first > distance {
            return None;
        }
        let point = shape.support(start.add(direction.mul(first)), angle, normal.neg());
        return Some(PhysicsQueryHit {
            handle: 0,
            point: [point.x, point.y],
            normal: [normal.x, normal.y],
            distance: first,
        });
    }
    // In ellipse unit space a translated box is a parallelogram. Its first
    // contact with the unit circle is either a vertex crossing or an edge tangent.
    // Solve those finite candidates analytically instead of sampling the travel.
    if let Shape::Ellipse { radius_x, radius_y } = &body.shape {
        let center = body.collider_position();
        let target_angle = body.collider_angle();
        let unit = /* 计算并返回 let local = inverse_rotate (point . sub (center) , target_angle) ; Vec2 :: new (local . x / radius_x , local . y / radius_y)，用于当前 cast_box_against_body 流程。 */ |point: Vec2| {
            let local = inverse_rotate(point.sub(center), target_angle);
            Vec2::new(local.x / radius_x, local.y / radius_y)
        };
        let local_direction = inverse_rotate(direction, target_angle);
        let velocity = Vec2::new(local_direction.x / radius_x, local_direction.y / radius_y);
        let half_x = size[0].abs() * 0.5;
        let half_y = size[1].abs() * 0.5;
        let vertices = [
            Vec2::new(-half_x, -half_y),
            Vec2::new(half_x, -half_y),
            Vec2::new(half_x, half_y),
            Vec2::new(-half_x, half_y),
        ]
        .map(/* 计算并返回 unit (start . add (rotate (point , angle)))，用于当前 cast_box_against_body 流程。 */ |point| unit(start.add(rotate(point, angle))));
        let mut candidates: Vec<(f64, Vec2)> = Vec::with_capacity(16);
        let a = velocity.length_squared();
        for vertex in vertices {
            let b = vertex.dot(velocity);
            let c = vertex.length_squared() - 1.0;
            let discriminant = b * b - a * c;
            if discriminant >= 0.0 && a > 0.0 {
                for travel in [
                    (-b - discriminant.sqrt()) / a,
                    (-b + discriminant.sqrt()) / a,
                ] {
                    if travel >= entry - 1e-9 && travel <= exit + 1e-9 {
                        candidates.push((travel.max(0.0), vertex.add(velocity.mul(travel))));
                    }
                }
            }
        }
        for index in 0..4 {
            let first = vertices[index];
            let edge = vertices[(index + 1) % 4].sub(first);
            let normal = Vec2::new(-edge.y, edge.x).normalized_or(Vec2::new(1.0, 0.0));
            let speed = velocity.dot(normal);
            if speed.abs() <= f64::EPSILON {
                continue;
            }
            for sign in [-1.0, 1.0] {
                let travel = (sign - first.dot(normal)) / speed;
                if travel < entry - 1e-9 || travel > exit + 1e-9 {
                    continue;
                }
                let point = normal.mul(sign);
                let fraction =
                    point.sub(first.add(velocity.mul(travel))).dot(edge) / edge.length_squared();
                if (-1e-9..=1.0 + 1e-9).contains(&fraction) {
                    candidates.push((travel.max(0.0), point));
                }
            }
        }
        if let Some((travel, point)) = candidates
            .into_iter()
            .filter(/* 判断 * travel <= distance 是否成立，供过滤或有效性检查使用。 */ |(travel, _)| *travel <= distance)
            .min_by(/* 按 a . 0 . total_cmp (& b . 0) 比较顺序，供稳定排序使用。 */ |a, b| a.0.total_cmp(&b.0))
        {
            let world_point = center.add(rotate(
                Vec2::new(point.x * radius_x, point.y * radius_y),
                target_angle,
            ));
            let normal = rotate(
                Vec2::new(point.x / radius_x, point.y / radius_y),
                target_angle,
            )
            .normalized_or(direction.neg());
            return Some(PhysicsQueryHit {
                handle: 0,
                point: [world_point.x, world_point.y],
                normal: [normal.x, normal.y],
                distance: travel,
            });
        }
    }
    None
}

#[cfg(test)]
mod sweep_binding_tests {
    use super::*;
    // 验证椭圆连续查询不依赖离散采样也能命中细长旋转目标。
    #[test]
    fn ellipse_sweep_finds_a_thin_rotated_long_target_without_sampling() {
        let mut values = vec![0.0; STRIDE];
        values[1] = 1.0;
        values[2] = 5000.0;
        values[8] = 1.0;
        values[9] = 1.0;
        values[12] = 0.01;
        values[13] = 1000.0;
        values[14] = 0.6;
        values[42] = u32::MAX as f64;
        let mut world = PhysicsWorld::new();
        world.create_body(1, 0, &values).unwrap();
        let hit = world
            .shape_cast(
                [0.0, 0.0],
                [0.001, 0.001],
                0.2,
                [1.0, 0.0],
                10000.0,
                u32::MAX,
            )
            .unwrap();
        assert!(hit.distance > 4999.0 && hit.distance < 5000.0);
        assert!(hit.normal[0] < -0.5);
        let miss = world.shape_cast(
            [0.0, 2000.0],
            [0.001, 0.001],
            0.2,
            [1.0, 0.0],
            10000.0,
            u32::MAX,
        );
        assert!(miss.is_none());
    }
    // 验证角色碰撞偏移与复合外包络不会改变刚体原点语义。
    #[test]
    fn character_offset_and_compound_envelope_keep_the_body_origin_separate() {
        let mut values = vec![0.0; STRIDE];
        values[8] = 1.0;
        values[24] = 1.0;
        values[12] = 2.0;
        values[13] = 2.0;
        values[42] = u32::MAX as f64;
        values[43] = 3.0;
        let mut world = PhysicsWorld::new();
        world.create_body(1, 0, &values).unwrap();
        values[24] = 0.0;
        values[9] = 1.0;
        values[43] = 0.0;
        values[2] = 8.0;
        world.create_body(2, 1, &values).unwrap();
        let moved = world
            .move_character_box(1, [2.0, 2.0], [10.0, 0.0], 0.5, 0.0, 0.0, 4, 1e-5, u32::MAX)
            .unwrap();
        assert!((moved.position[0] - 3.0).abs() < 0.001);
        assert!(moved.on_wall);
        assert!((moved.applied_motion[0] - moved.position[0]).abs() < 1e-9);
    }
}
