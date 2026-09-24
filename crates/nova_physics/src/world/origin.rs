// 从扁平刚体记录的世界坐标减去原点偏移。
// 世界原点平移：同步当前与历史刚体、绳索及求解缓存，保持局部锚点和身份。
fn shift_body_coordinates(values: &mut [f64], offset: Vec2) {
    for record in values.chunks_exact_mut(STRIDE) {
        record[2] -= offset.x;
        record[3] -= offset.y;
    }
}
// 平移绳索节点的世界坐标，同时保留局部锚点。
fn shift_rope_coordinates(values: &mut [f64], offset: Vec2) {
    for record in values.chunks_exact_mut(CONNECTION_STRIDE) {
        let count = non_negative(record[27], 0.0).min(ROPE_NODE_CAPACITY as f64) as usize;
        for index in 0..count {
            let at = ROPE_NODE_DATA_OFFSET + index * 4;
            record[at] -= offset.x;
            record[at + 1] -= offset.y;
        }
    }
}
impl PhysicsWorld {
    // 原子校验原点偏移，再同步当前、历史及求解缓存中的世界坐标。
    /// Translate the coordinate frame without a teleport, wake, handle change or solver rebuild.
    pub fn shift_origin(&mut self, x: f64, y: f64) -> Result<(), &'static str> {
        if !x.is_finite() || !y.is_finite() || x.abs() > 1e12 || y.abs() > 1e12 {
            return Err("origin shift must be finite and within world bounds");
        }
        if self.bodies.iter().any(/* 判断 ! ((record . values [2] - x) . is_finite () && (record . values [3] - y) . is_finite ()) 是否成立，供过滤或有效性检查使用。 */ |record| {
            !((record.values[2] - x).is_finite() && (record.values[3] - y).is_finite())
        }) {
            return Err("origin shift would create a nonfinite body position");
        }
        let offset = Vec2::new(x, y);
        for record in &mut self.bodies {
            shift_body_coordinates(&mut record.values, offset);
        }
        for record in &mut self.connections {
            shift_rope_coordinates(&mut record.values, offset);
        }
        shift_body_coordinates(&mut self.dense_bodies, offset);
        shift_body_coordinates(&mut self.previous_bodies, offset);
        shift_rope_coordinates(&mut self.dense_connections, offset);
        let body_length = self.dense_bodies.len().min(self.state_buffer.len());
        shift_body_coordinates(&mut self.state_buffer[..body_length], offset);
        shift_rope_coordinates(&mut self.state_buffer[body_length..], offset);
        for contact in self.contacts.values_mut() {
            contact.point[0] -= x;
            contact.point[1] -= y;
        }
        for event in &mut self.events {
            if let PhysicsEvent::ContactStarted(contact)
            | PhysicsEvent::ContactStayed(contact)
            | PhysicsEvent::ContactEnded(contact) = event
            {
                contact.point[0] -= x;
                contact.point[1] -= y;
            }
        }
        if let Some(solver) = &mut self.solver {
            shift_body_coordinates(&mut solver.data, offset);
            shift_rope_coordinates(&mut solver.connection_data, offset);
            for body in &mut solver.bodies {
                body.position = body.position.sub(offset);
            }
            for constraint in &mut solver.constraints {
                for node in &mut constraint.rope_nodes {
                    node.position = node.position.sub(offset);
                }
            }
            for contact in &mut solver.contacts {
                contact.point = contact.point.sub(offset);
            }
        }
        Ok(())
    }
}
#[cfg(test)]
mod origin_shift_tests {
    use super::*;
    // 构造当前回归场景所需的刚体扁平记录。
    fn record(x: f64) -> Vec<f64> {
        let mut data = vec![0.0; STRIDE];
        data[2] = x;
        data[8] = 1.0;
        data[12] = 1.0;
        data[13] = 1.0;
        data[25] = 1.0;
        data[42] = 1.0;
        data[48] = 1.0;
        data
    }
    // 验证原点平移保留句柄、休眠、历史状态和求解缓存。
    #[test]
    fn origin_shift_preserves_handles_sleep_previous_state_and_solver_cache() {
        let mut world = PhysicsWorld::new();
        let mut body = record(10000.0);
        body[49] = 1.0;
        body[50] = 1.0;
        world.create_body(44, 0, &body).unwrap();
        world.step(0.01, 0.0, 0.0);
        world.drain_events();
        let before = world.state().to_vec();
        let previous = world.previous_body_state().to_vec();
        let rebuilds = world.configuration_rebuilds();
        let steps = world.physics_steps();
        world.shift_origin(10000.0, 20.0).unwrap();
        assert_eq!(world.bodies[0].handle, 44);
        assert_eq!(world.state()[2], before[2] - 10000.0);
        assert_eq!(world.state()[3], before[3] - 20.0);
        for (index, value) in before.iter().enumerate().take(STRIDE) {
            if index != 2 && index != 3 {
                assert_eq!(world.state()[index], *value, "field {index}");
            }
        }
        assert_eq!(world.previous_body_state()[2], previous[2] - 10000.0);
        assert!(world.drain_events().is_empty());
        assert_eq!(world.physics_steps(), steps);
        world.step(0.01, 0.0, 0.0);
        assert_eq!(world.configuration_rebuilds(), rebuilds);
        assert_eq!(world.overlap_point([0.0, -20.0], 1), vec![44]);
    }
    // 验证原点平移不破坏接触生命周期与缓存冲量。
    #[test]
    fn origin_shift_preserves_contact_lifecycle_and_impulses() {
        let mut world = PhysicsWorld::new();
        let mut a = record(10000.0);
        a[9] = 1.0;
        a[28] = 1.0;
        world.create_body(1, 0, &a).unwrap();
        world.create_body(2, 1, &record(10000.25)).unwrap();
        world.step(0.01, 0.0, 0.0);
        let contact = *world.contacts.values().next().unwrap();
        let rebuilds = world.configuration_rebuilds();
        world.shift_origin(10000.0, 0.0).unwrap();
        assert!(
            (world.contacts.values().next().unwrap().point[0] - (contact.point[0] - 10000.0)).abs()
                < 1e-9
        );
        let pending = world.drain_events();
        assert!(pending.iter().any(/* 检查事件或命令是否符合当前测试预期：matches ! (event , PhysicsEvent :: ContactStarted (value) if value . point [0] . abs () < 1.0)。 */ |event| matches!(event, PhysicsEvent::ContactStarted(value) if value.point[0].abs() < 1.0)));
        world.step(0.01, 0.0, 0.0);
        assert!(world
            .drain_events()
            .iter()
            .any(/* 检查事件或命令是否符合当前测试预期：matches ! (event , PhysicsEvent :: ContactStayed (_))。 */ |event| matches!(event, PhysicsEvent::ContactStayed(_))));
        assert_eq!(world.configuration_rebuilds(), rebuilds);
    }
    // 验证原点平移同步绳缓冲和节点，同时保持局部锚点。
    #[test]
    fn origin_shift_translates_rope_buffers_and_nodes_without_modifying_local_anchors() {
        let mut world = PhysicsWorld::new();
        let mut a = record(10000.0);
        a[9] = 1.0;
        world.create_body(1, 0, &a).unwrap();
        a[2] = 10004.0;
        world.create_body(2, 1, &a).unwrap();
        let mut connection = vec![0.0; CONNECTION_STRIDE];
        connection[1] = 0.0;
        connection[2] = 1.0;
        connection[7] = 4.0;
        connection[8] = 1.0;
        connection[9] = 1.0;
        connection[10] = 10.0;
        connection[12] = 2.0;
        connection[16] = 1.0;
        connection[24] = 1.0;
        connection[25] = 0.1;
        connection[26] = 1.0;
        connection[27] = 1.0;
        connection[28] = -1.0;
        connection[29] = 10002.0;
        world.upsert_connection(3, 0, &connection).unwrap();
        world.step(0.01, 0.0, 0.0);
        let before = world.connections[0].values.clone();
        let rebuilds = world.configuration_rebuilds();
        world.shift_origin(10000.0, 100.0).unwrap();
        assert_eq!(&world.connections[0].values[3..7], &before[3..7]);
        assert!((world.connections[0].values[29] - (before[29] - 10000.0)).abs() < 1e-9);
        assert!(
            (world.solver.as_ref().unwrap().constraints[0].rope_nodes[0]
                .position
                .x
                - world.connections[0].values[29])
                .abs()
                < 1e-9
        );
        world.step(0.01, 0.0, 0.0);
        assert_eq!(world.configuration_rebuilds(), rebuilds);
    }
    // 验证非法原点平移无部分修改，重复平移可等价回放。
    #[test]
    fn invalid_origin_shift_is_atomic_and_repeated_shifts_replay_equivalently() {
        let mut shifted = PhysicsWorld::new();
        let mut reference = PhysicsWorld::new();
        let mut a = record(10000.0);
        a[4] = 3.0;
        shifted.create_body(5, 0, &a).unwrap();
        a[2] = 0.0;
        reference.create_body(5, 0, &a).unwrap();
        shifted.step(0.01, 0.0, 0.0);
        reference.step(0.01, 0.0, 0.0);
        let before = shifted.state().to_vec();
        assert!(shifted.shift_origin(f64::NAN, 0.0).is_err());
        assert_eq!(shifted.state(), before);
        shifted.shift_origin(10000.0, 0.0).unwrap();
        for _ in 0..50 {
            shifted.shift_origin(100.0, -50.0).unwrap();
            shifted.shift_origin(-100.0, 50.0).unwrap();
            shifted.step(0.01, 0.0, 0.0);
            reference.step(0.01, 0.0, 0.0);
        }
        assert!((shifted.state()[2] - reference.state()[2]).abs() < 1e-8);
        assert_eq!(shifted.state()[4], reference.state()[4]);
        assert_eq!(
            shifted.configuration_rebuilds(),
            reference.configuration_rebuilds()
        );
    }
}

#[cfg(test)]
mod quality_binding_tests {
    use super::*;
    // 创建使用指定位置迭代次数的物理测试世界。
    fn simulation(position_iterations: usize) -> PhysicsWorld {
        let mut world = PhysicsWorld::new();
        world.set_quality_iterations(1, 1, position_iterations, 0.001, 0.001, 0.5);
        let mut body = vec![0.0; STRIDE];
        body[8] = 1.0;
        body[12] = 2.0;
        body[13] = 2.0;
        body[25] = 1.0;
        body[42] = 1.0;
        body[9] = 1.0;
        world.create_body(1, 0, &body).unwrap();
        body[9] = 0.0;
        body[3] = 1.5;
        world.create_body(2, 1, &body).unwrap();
        world.step(0.001, 0.0, 0.0);
        world
    }
    // 验证增加位置迭代降低残余穿透而不改变速度。
    #[test]
    fn independently_bound_position_iterations_reduce_residual_penetration_without_velocity_changes(
    ) {
        let low = simulation(1);
        let high = simulation(12);
        assert!(high.state()[STRIDE + 3] > low.state()[STRIDE + 3]);
        assert!(high.state()[STRIDE + 3] <= 2.000001);
        assert_eq!(high.state()[STRIDE + 5], low.state()[STRIDE + 5]);
        assert_eq!(
            high.quality.solver_iterations,
            low.quality.solver_iterations
        );
        assert_eq!(high.quality.position_iterations, 12);
    }
}
