// 带身份与过滤条件的精确二维物理查询，以及去重、排序和边界测试。
#[derive(Clone, Copy, Debug, serde::Deserialize)]
pub enum PhysicsQueryKind2D {
    Ray,
    Point,
    Circle,
    Box,
    Sweep,
    Nearest,
}

#[derive(Clone, Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PhysicsQueryRequest2D {
    pub kind: PhysicsQueryKind2D,
    pub origin: [f64; 2],
    pub direction: [f64; 2],
    pub size: [f64; 2],
    pub angle: f64,
    pub radius: f64,
    pub distance: f64,
    pub layer_mask: u32,
    pub include_sensors: bool,
    pub excluded_handles: Vec<u32>,
    pub maximum_results: usize,
}

#[derive(Clone, Copy, Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhysicsFilteredHit2D {
    #[serde(flatten)]
    pub hit: PhysicsQueryHit,
    pub collider: u32,
    pub sensor: bool,
    pub physics_layer: u32,
    pub body_type: &'static str,
}

// 计算形状表面或内部距查询点最近的位置。
fn closest_collider_point(body: &Body, point: Vec2) -> Vec2 {
    if point_in_body(body, point) {
        return point;
    }
    let local = inverse_rotate(point.sub(body.collider_position()), body.collider_angle());
    let closest = match &body.shape {
        Shape::Polygon { vertices } => {
            let mut closest = vertices[0];
            let mut best = f64::INFINITY;
            for index in 0..vertices.len() {
                let a = vertices[index];
                let edge = vertices[(index + 1) % vertices.len()].sub(a);
                let length_squared = edge.dot(edge);
                let t = if length_squared > 0.0 {
                    local.sub(a).dot(edge) / length_squared
                } else {
                    0.0
                };
                let candidate = a.add(edge.mul(t.clamp(0.0, 1.0)));
                let delta = candidate.sub(local);
                if delta.dot(delta) < best {
                    best = delta.dot(delta);
                    closest = candidate;
                }
            }
            closest
        }
        Shape::Ellipse {
            radius_x: a,
            radius_y: b,
        } => {
            // Outside an ellipse, the Lagrange multiplier is nonnegative and
            // its constraint is strictly decreasing. Bisection has a fixed budget.
            let a2 = a * a;
            let b2 = b * b;
            let constraint = /* 计算并返回 (a * local . x / (a2 + lambda)) . powi (2) + (b * local . y / (b2 + lambda)) . powi (2)，用于当前 closest_collider_point 流程。 */ |lambda: f64| {
                (a * local.x / (a2 + lambda)).powi(2) + (b * local.y / (b2 + lambda)).powi(2)
            };
            let mut low = 0.0;
            let mut high = (a * local.x).hypot(b * local.y);
            for _ in 0..80 {
                let middle = low + (high - low) * 0.5;
                if constraint(middle) > 1.0 {
                    low = middle;
                } else {
                    high = middle;
                }
            }
            Vec2::new(a2 * local.x / (a2 + high), b2 * local.y / (b2 + high))
        }
    };
    body.collider_position()
        .add(rotate(closest, body.collider_angle()))
}

impl PhysicsWorld {
    // 展开碰撞体记录并保留所有者和子形状身份。
    fn query_records_with_identity(&self) -> Vec<(u32, u32, Body)> {
        let mut records = Vec::new();
        for record in &self.bodies {
            let mut body = Body::from_data(&record.values, 0);
            body.apply_collider_children(&record.collider_shapes);
            // Move child descriptors out before cloning the query proxy: avoid
            // cloning every sibling for each child of a compound body.
            let children = std::mem::take(&mut body.collider_children);
            records.push((record.handle, 0, body.clone()));
            for child in children {
                let mut proxy = body.clone();
                proxy.shape = child.shape;
                proxy.collider_offset = child.offset;
                proxy.collider_angle_offset = child.angle_offset;
                proxy.is_sensor = child.is_sensor;
                proxy.layer = child.layer;
                proxy.collision_mask = child.collision_mask;
                proxy.one_way = child.one_way;
                proxy.one_way_normal = child.one_way_normal;
                records.push((record.handle, child.id, proxy));
            }
        }
        records
    }

    // 先应用身份、层和传感器过滤，再执行精确查询、稳定排序及去重。
    pub fn query_filtered(
        &self,
        request: &PhysicsQueryRequest2D,
    ) -> Result<Vec<PhysicsFilteredHit2D>, &'static str> {
        if request.excluded_handles.len() > 1024 || !(1..=4096).contains(&request.maximum_results) {
            return Err(
                "PHYSICS_QUERY_LIMIT: at most1024 exclusions and1..4096 results are supported",
            );
        }
        let scalars = [
            request.origin[0],
            request.origin[1],
            request.direction[0],
            request.direction[1],
            request.size[0],
            request.size[1],
            request.angle,
            request.radius,
            request.distance,
        ];
        if scalars
            .iter()
            .any(/* 判断 ! value . is_finite () || value . abs () > 1.0e12 是否成立，供过滤或有效性检查使用。 */ |value| !value.is_finite() || value.abs() > 1.0e12)
            || request.distance < 0.0
            || request.radius <= 0.0
            || request.size.iter().any(/* 判断 * value <= 0.0 是否成立，供过滤或有效性检查使用。 */ |value| *value <= 0.0)
        {
            return Err("PHYSICS_QUERY_INPUT: finite bounded coordinates, positive dimensions and nonnegative distance are required");
        }
        if matches!(
            request.kind,
            PhysicsQueryKind2D::Ray | PhysicsQueryKind2D::Sweep
        ) && request.direction[0].hypot(request.direction[1]) <= 0.0
        {
            return Err("PHYSICS_QUERY_INPUT: ray and sweep direction must be nonzero");
        }
        let collider_count: usize = self
            .bodies
            .iter()
            .map(/* 计算并返回 1 + record . collider_shapes . len () / COLLIDER_CHILD_STRIDE，用于当前 query_filtered 流程。 */ |record| 1 + record.collider_shapes.len() / COLLIDER_CHILD_STRIDE)
            .sum();
        if collider_count > 100_000 {
            return Err("PHYSICS_QUERY_LIMIT: more than100000 collider pieces require a smaller query world");
        }
        let excluded: HashSet<u32> = request.excluded_handles.iter().copied().collect();
        let origin = Vec2::new(request.origin[0], request.origin[1]);
        let direction = Vec2::new(request.direction[0], request.direction[1])
            .normalized_or(Vec2::new(1.0, 0.0));
        let shape = match request.kind {
            PhysicsQueryKind2D::Circle => Some(query_shape(
                Shape::Ellipse {
                    radius_x: request.radius,
                    radius_y: request.radius,
                },
                origin,
                0.0,
            )),
            PhysicsQueryKind2D::Box => Some(query_shape(
                box_shape(request.size[0] * 0.5, request.size[1] * 0.5),
                origin,
                normalize_angle(request.angle),
            )),
            _ => None,
        };
        let mut hits = Vec::new();
        for (handle, collider, body) in self.query_records_with_identity() {
            if excluded.contains(&handle)
                || !query_enabled(request.layer_mask, &body)
                || (!request.include_sensors && body.is_sensor)
            {
                continue;
            }
            let hit = match request.kind {
                PhysicsQueryKind2D::Ray => ray_body(&body, origin, direction, request.distance),
                PhysicsQueryKind2D::Sweep => cast_box_against_body(
                    origin,
                    request.size,
                    request.angle,
                    direction,
                    request.distance,
                    &body,
                ),
                PhysicsQueryKind2D::Nearest => {
                    let point = closest_collider_point(&body, origin);
                    let delta = origin.sub(point);
                    let distance = delta.length();
                    let normal = delta.normalized_or(Vec2::ZERO);
                    (distance <= request.distance).then_some(PhysicsQueryHit {
                        handle,
                        point: [point.x, point.y],
                        normal: [normal.x, normal.y],
                        distance,
                    })
                }
                PhysicsQueryKind2D::Point
                | PhysicsQueryKind2D::Circle
                | PhysicsQueryKind2D::Box => {
                    let overlaps = shape.as_ref().map_or_else(
                        /* 计算并返回 point_in_body (& body , origin)，用于当前 query_filtered 流程。 */ || point_in_body(&body, origin),
                        /* 判断 ! collide (query , & body) . is_empty () 是否成立，供过滤或有效性检查使用。 */ |query| !collide(query, &body).is_empty(),
                    );
                    overlaps.then_some(PhysicsQueryHit {
                        handle,
                        point: request.origin,
                        normal: [0.0, 0.0],
                        distance: 0.0,
                    })
                }
            };
            if let Some(mut hit) = hit {
                hit.handle = handle;
                hits.push(PhysicsFilteredHit2D {
                    hit,
                    collider,
                    sensor: body.is_sensor,
                    physics_layer: body.layer,
                    body_type: if body.is_static {
                        "Static"
                    } else if body.is_kinematic {
                        "Kinematic"
                    } else {
                        "Dynamic"
                    },
                });
            }
        }
        hits.sort_by(/* 按命中距离、所属刚体句柄和子形状身份依次排序。 */ |a, b| {
            a.hit
                .distance
                .total_cmp(&b.hit.distance)
                .then(a.hit.handle.cmp(&b.hit.handle))
                .then(a.collider.cmp(&b.collider))
        });
        let mut owners = HashSet::new();
        hits.retain(/* 计算并返回 owners . insert (hit . hit . handle)，用于当前 query_filtered 流程。 */ |hit| owners.insert(hit.hit.handle));
        hits.truncate(request.maximum_results);
        Ok(hits)
    }
}
#[cfg(test)]
mod filtered_query_tests {
    use super::*;
    // 构造当前回归场景所需的刚体扁平记录。
    fn record(x: f64, y: f64) -> Vec<f64> {
        let mut value = vec![0.0; STRIDE];
        value[2] = x;
        value[3] = y;
        value[8] = 1.0;
        value[9] = 1.0;
        value[12] = 2.0;
        value[13] = 2.0;
        value[25] = 1.0;
        value[26] = 1.0;
        value[42] = u32::MAX as f64;
        value
    }
    // 构造指定查询类型的默认过滤请求。
    fn request(kind: PhysicsQueryKind2D) -> PhysicsQueryRequest2D {
        PhysicsQueryRequest2D {
            kind,
            origin: [0.0, 0.0],
            direction: [1.0, 0.0],
            size: [1.0, 1.0],
            angle: 0.0,
            radius: 1.0,
            distance: 100.0,
            layer_mask: u32::MAX,
            include_sensors: true,
            excluded_handles: vec![],
            maximum_results: 4096,
        }
    }
    // 验证射线、扫掠和最近点选择前先执行过滤。
    #[test]
    fn filters_before_selecting_ray_sweep_and_nearest() {
        let mut world = PhysicsWorld::new();
        let mut sensor = record(2.0, 0.0);
        sensor[28] = 1.0;
        world.create_body(10, 0, &sensor).unwrap();
        world.create_body(20, 1, &record(5.0, 0.0)).unwrap();
        world.create_body(30, 2, &record(8.0, 0.0)).unwrap();
        for kind in [
            PhysicsQueryKind2D::Ray,
            PhysicsQueryKind2D::Sweep,
            PhysicsQueryKind2D::Nearest,
        ] {
            let mut query = request(kind);
            query.include_sensors = false;
            query.excluded_handles = vec![20];
            query.maximum_results = 1;
            let hits = world.query_filtered(&query).unwrap();
            assert_eq!(hits.len(), 1);
            assert_eq!(hits[0].hit.handle, 30);
            assert!(!hits[0].sensor);
        }
    }
    // 验证复合子形状先过滤，再按所属刚体去重。
    #[test]
    fn filters_compound_children_before_owner_deduplication() {
        let mut world = PhysicsWorld::new();
        let mut primary = record(2.0, 0.0);
        primary[28] = 1.0;
        world.create_body(10, 0, &primary).unwrap();
        let mut child = vec![0.0; COLLIDER_CHILD_STRIDE];
        child[0] = 42.0;
        child[1] = 3.0;
        child[2] = 4.0;
        child[5] = 2.0;
        child[6] = 2.0;
        child[8] = 1.0;
        child[9] = u32::MAX as f64;
        world.upsert_collider_shapes(10, &child).unwrap();
        for kind in [
            PhysicsQueryKind2D::Ray,
            PhysicsQueryKind2D::Sweep,
            PhysicsQueryKind2D::Nearest,
        ] {
            let mut query = request(kind);
            query.include_sensors = false;
            query.layer_mask = 2;
            let hits = world.query_filtered(&query).unwrap();
            assert_eq!(hits.len(), 1);
            assert_eq!(hits[0].collider, 42);
            assert_eq!(hits[0].physics_layer, 1);
            assert!(!hits[0].sensor);
        }
        for kind in [
            PhysicsQueryKind2D::Point,
            PhysicsQueryKind2D::Circle,
            PhysicsQueryKind2D::Box,
        ] {
            let mut query = request(kind);
            query.origin = [6.0, 0.0];
            query.include_sensors = false;
            assert_eq!(world.query_filtered(&query).unwrap()[0].collider, 42);
            query.origin = [2.0, 0.0];
            assert!(world.query_filtered(&query).unwrap().is_empty());
        }
    }
    // 验证最近点查询不会遗漏角度采样间的小目标。
    #[test]
    fn nearest_finds_small_targets_between_angular_samples() {
        let mut world = PhysicsWorld::new();
        let angle = std::f64::consts::PI / 64.0;
        let mut value = record(10.0 * angle.cos(), 10.0 * angle.sin());
        value[1] = 1.0;
        value[12] = 0.001;
        value[13] = 0.001;
        world.create_body(7, 0, &value).unwrap();
        for sample in 0..64 {
            let a = sample as f64 * std::f64::consts::TAU / 64.0;
            assert!(world
                .raycast([0.0, 0.0], [a.cos(), a.sin()], 20.0, u32::MAX)
                .is_none());
        }
        let hits = world
            .query_filtered(&request(PhysicsQueryKind2D::Nearest))
            .unwrap();
        assert_eq!(hits[0].hit.handle, 7);
        assert!((hits[0].hit.distance - 9.999).abs() < 1.0e-9);
    }
    // 验证椭圆最近点满足表面方程和法线约束。
    #[test]
    fn ellipse_closest_point_satisfies_surface_and_normal_constraints() {
        let mut world = PhysicsWorld::new();
        let mut value = record(0.0, 0.0);
        value[1] = 1.0;
        value[12] = 3.0;
        value[13] = 1.0;
        world.create_body(1, 0, &value).unwrap();
        let mut query = request(PhysicsQueryKind2D::Nearest);
        query.origin = [4.0, 2.0];
        let hit = world.query_filtered(&query).unwrap()[0].hit;
        let [x, y] = hit.point;
        assert!((x * x / 9.0 + y * y - 1.0).abs() < 1.0e-10);
        assert!(((4.0 - x) * y - (2.0 - y) * x / 9.0).abs() < 1.0e-10);
        query.origin = [0.0, 0.0];
        assert_eq!(world.query_filtered(&query).unwrap()[0].hit.distance, 0.0);
    }
    // 验证持久刚体修改立即影响查询，等距结果保持稳定顺序。
    #[test]
    fn query_changes_follow_retained_body_edits_and_stable_ties() {
        let mut world = PhysicsWorld::new();
        world.create_body(20, 0, &record(-3.0, 0.0)).unwrap();
        world.create_body(10, 1, &record(3.0, 0.0)).unwrap();
        let query = request(PhysicsQueryKind2D::Nearest);
        assert_eq!(world.query_filtered(&query).unwrap()[0].hit.handle, 10);
        world.upsert_body(10, 1, &record(8.0, 0.0)).unwrap();
        assert_eq!(world.query_filtered(&query).unwrap()[0].hit.handle, 20);
        world.destroy_body(20);
        assert_eq!(world.query_filtered(&query).unwrap()[0].hit.handle, 10);
    }
    // 验证查询拒绝非法数值和超预算请求。
    #[test]
    fn rejects_invalid_or_excessive_requests() {
        let world = PhysicsWorld::new();
        let mut query = request(PhysicsQueryKind2D::Ray);
        query.origin[0] = f64::NAN;
        assert!(world.query_filtered(&query).is_err());
        query.origin[0] = 0.0;
        query.direction = [0.0, 0.0];
        assert!(world.query_filtered(&query).is_err());
        query.direction = [1.0, 0.0];
        query.size[0] = -1.0;
        assert!(world.query_filtered(&query).is_err());
        query.size[0] = 1.0;
        query.maximum_results = 0;
        assert!(world.query_filtered(&query).is_err());
        query.maximum_results = 4097;
        assert!(world.query_filtered(&query).is_err());
        query.maximum_results = 1;
        query.excluded_handles = vec![1; 1025];
        assert!(world.query_filtered(&query).is_err());
    }
}
