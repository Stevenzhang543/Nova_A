// 26.45 物理回归：胶囊（圆角形状）、新关节、表面速度与滚动阻力、子弹连续碰撞、快照与确定性。
#[cfg(test)]
mod tests_2645 {
    use super::*;

    const DT: f64 = 1.0 / 60.0;
    const GRAVITY: f64 = 9.81;

    fn record(id: f64, shape: f64, x: f64, y: f64, width: f64, height: f64) -> Vec<f64> {
        let mut record = vec![0.0; STRIDE];
        record[0] = id;
        record[1] = shape;
        record[2] = x;
        record[3] = y;
        record[8] = 1.0;
        record[11] = 0.6;
        record[12] = width;
        record[13] = height;
        record[17] = 1.0;
        record[20] = 0.6;
        record[25] = 1.0;
        record[27] = 1.0;
        record[33] = 1.0;
        record[42] = 2.0;
        record[47] = 1.0;
        record[48] = 1.0;
        if shape == 0.0 {
            let (half_width, half_height) = (width * 0.5, height * 0.5);
            for (index, (vx, vy)) in [(-half_width, -half_height), (half_width, -half_height), (half_width, half_height), (-half_width, half_height)].iter().enumerate() {
                record[34 + index * 2] = *vx;
                record[35 + index * 2] = *vy;
            }
        }
        record
    }

    fn floor(id: f64, y: f64, width: f64) -> Vec<f64> {
        let mut floor = record(id, 0.0, 0.0, y, width, 1.0);
        floor[9] = 1.0;
        floor
    }

    fn capsule(id: f64, x: f64, y: f64, width: f64, height: f64) -> Vec<f64> {
        record(id, 2.0, x, y, width, height)
    }

    fn body(world: &SolverWorld, index: usize) -> &Body {
        &world.bodies[index]
    }

    fn run(bodies: &[f64], connections: &[f64], steps: usize) -> SolverWorld {
        let mut world = SolverWorld::new(bodies, connections, SolverQuality::default());
        for _ in 0..steps {
            world.step(DT, GRAVITY, 0.0);
        }
        world
    }

    #[test]
    fn a_lying_capsule_rests_flat_on_the_floor() {
        // Floor top at y = 0; a 3 x 1 capsule (radius 0.5) dropped from just above.
        let mut bodies = floor(1.0, -0.5, 20.0);
        bodies.extend(capsule(2.0, 0.0, 0.7, 3.0, 1.0));
        let world = run(&bodies, &[], 180);
        let capsule = body(&world, 1);
        assert!(capsule.angle.abs() < 1.0e-3, "angle {}", capsule.angle);
        assert!((capsule.position.y - 0.5).abs() < 2.0 * LINEAR_SLOP, "height {}", capsule.position.y);
        assert!(capsule.angular_velocity.abs() < 1.0e-3 && capsule.velocity.length() < 1.0e-3);
    }

    #[test]
    fn a_tilted_standing_capsule_falls_onto_its_side() {
        let mut bodies = floor(1.0, -0.5, 40.0);
        let mut standing = capsule(2.0, 0.0, 1.55, 1.0, 3.0);
        standing[14] = 0.15;
        bodies.extend(standing);
        let world = run(&bodies, &[], 360);
        let capsule = body(&world, 1);
        let lying = (capsule.angle.abs() - std::f64::consts::FRAC_PI_2).abs();
        assert!(lying < 0.02, "angle {}", capsule.angle);
        assert!((capsule.position.y - 0.5).abs() < 0.03, "height {}", capsule.position.y);
    }

    #[test]
    fn stacked_capsules_and_a_box_settle() {
        let mut bodies = floor(1.0, -0.5, 20.0);
        bodies.extend(capsule(2.0, 0.0, 0.55, 4.0, 1.0));
        bodies.extend(capsule(3.0, 0.3, 1.6, 4.0, 1.0));
        bodies.extend(record(4.0, 0.0, -0.4, 2.7, 1.0, 1.0));
        let world = run(&bodies, &[], 300);
        assert!((body(&world, 1).position.y - 0.5).abs() < 0.03);
        assert!((body(&world, 2).position.y - 1.5).abs() < 0.04, "upper capsule {}", body(&world, 2).position.y);
        assert!((body(&world, 3).position.y - 2.5).abs() < 0.05, "box {}", body(&world, 3).position.y);
        for index in 1..4 {
            assert!(body(&world, index).velocity.length() < 0.01, "body {index} still moves");
        }
    }

    #[test]
    fn a_ball_rolls_off_a_lying_capsule() {
        let mut bodies = floor(1.0, -0.5, 40.0);
        let mut bar = capsule(2.0, 0.0, 0.5, 4.0, 1.0);
        bar[9] = 1.0;
        bodies.extend(bar);
        // The flat top spans |x| <= 1.5; the ball starts on the rounded end.
        bodies.extend(record(3.0, 1.0, 1.62, 1.8, 0.3, 0.3));
        let world = run(&bodies, &[], 240);
        let ball = body(&world, 2);
        assert!(ball.position.x.abs() > 1.5, "the ball rolled off the rounded end: x={}", ball.position.x);
        assert!((ball.position.y - 0.3).abs() < 0.05, "the ball rests on the floor: y={}", ball.position.y);
    }

    #[test]
    fn rays_and_points_see_the_rounded_surface() {
        let mut world = PhysicsWorld::new();
        world.create_body(5, 0, &capsule(5.0, 0.0, 0.0, 1.0, 3.0)).unwrap();
        let down = world.raycast([0.0, 5.0], [0.0, -1.0], 10.0, u32::MAX).expect("hits the cap");
        assert!((down.point[1] - 1.5).abs() < 1.0e-9 && (down.normal[1] - 1.0).abs() < 1.0e-9);
        let side = world.raycast([5.0, 0.3], [-1.0, 0.0], 10.0, u32::MAX).expect("hits the side");
        assert!((side.point[0] - 0.5).abs() < 1.0e-9 && (side.normal[0] - 1.0).abs() < 1.0e-9);
        // A corner of the bounding box is outside the rounded cap.
        assert!(world.overlap_point([0.48, 1.48], u32::MAX).is_empty());
        assert_eq!(world.overlap_point([0.0, 1.4], u32::MAX), vec![5]);
    }

    fn joint_record(kind: f64, body_a: usize, body_b: usize, anchor_a: (f64, f64), anchor_b: (f64, f64)) -> Vec<f64> {
        let mut joint = vec![0.0; CONNECTION_STRIDE];
        joint[0] = 1.0;
        joint[1] = body_a as f64;
        joint[2] = body_b as f64;
        joint[3] = anchor_a.0;
        joint[4] = anchor_a.1;
        joint[5] = anchor_b.0;
        joint[6] = anchor_b.1;
        joint[7] = 1.0;
        joint[10] = 1200.0;
        joint[11] = 35.0;
        joint[12] = 1.25;
        joint[13] = 1.0e12;
        joint[14] = 1.0e12;
        joint[16] = 1.0;
        joint[18] = kind;
        joint[29] = 1.0;
        joint[30] = 0.0;
        joint[32] = -1.0;
        joint[33] = 1.0;
        joint[37] = 1000.0;
        joint[38] = f64::INFINITY;
        joint[39] = f64::INFINITY;
        joint
    }

    // A chassis on two wheels: chassis box (index 1) and wheels (2, 3) on a long floor (0).
    fn car(motor_speed: f64, hertz: f64) -> (Vec<f64>, Vec<f64>) {
        let mut bodies = floor(1.0, -0.5, 200.0);
        let mut chassis = record(2.0, 0.0, 0.0, 1.4, 3.0, 0.5);
        chassis[8] = 4.0;
        bodies.extend(chassis);
        for (id, x) in [(3.0, -1.2), (4.0, 1.2)] {
            let mut wheel = record(id, 1.0, x, 0.45, 0.45, 0.45);
            wheel[11] = 1.0;
            wheel[20] = 1.0;
            bodies.extend(wheel);
        }
        let mut joints = Vec::new();
        for (wheel, x) in [(2_usize, -1.2), (3, 1.2)] {
            let mut joint = joint_record(7.0, 1, wheel, (x, -0.95), (0.0, 0.0));
            joint[29] = 0.0;
            joint[30] = 1.0;
            joint[31] = 1.0;
            joint[32] = -0.4;
            joint[33] = 0.4;
            joint[35] = if motor_speed != 0.0 { 1.0 } else { 0.0 };
            joint[36] = motor_speed;
            joint[37] = 40.0;
            joint[40] = hertz;
            joint[41] = 0.7;
            joints.extend(joint);
        }
        (bodies, joints)
    }

    #[test]
    fn wheel_joints_carry_a_chassis_on_springs() {
        let (bodies, joints) = car(0.0, 4.0);
        let world = run(&bodies, &joints, 300);
        let chassis = body(&world, 1);
        // Unloaded the chassis centre is 0.95 above the wheel centres (0.45): the springs carry
        // its weight a little lower, and it comes to rest level.
        let height = chassis.position.y;
        assert!(height < 1.40 - 0.01 && height > 1.0, "chassis height {height}");
        assert!(chassis.velocity.length() < 0.01 && chassis.angle.abs() < 0.01);
        for wheel in [2, 3] {
            assert!((body(&world, wheel).position.y - 0.45).abs() < 0.02);
        }
    }

    #[test]
    fn a_wheel_motor_drives_the_car() {
        let (bodies, joints) = car(-12.0, 4.0);
        let world = run(&bodies, &joints, 240);
        let chassis = body(&world, 1);
        assert!(chassis.position.x > 3.0, "the car drove right: x={}", chassis.position.x);
        assert!(chassis.angle.abs() < 0.2);
    }

    // A box welded to a static post at its left end: soft angular welds droop, stiff ones barely do.
    fn cantilever(angular_hertz: f64) -> SolverWorld {
        let mut post = record(1.0, 0.0, 0.0, 0.0, 0.2, 0.2);
        post[9] = 1.0;
        let mut beam = record(2.0, 0.0, 1.0, 0.0, 2.0, 0.2);
        beam[42] = 1.0;
        post[42] = 1.0;
        post.extend(beam);
        let mut weld = joint_record(9.0, 0, 1, (0.0, 0.0), (-1.0, 0.0));
        weld[42] = angular_hertz;
        weld[43] = 0.7;
        run(&post, &weld, 240)
    }

    #[test]
    fn soft_welds_bend_and_stiff_welds_hold() {
        let soft = cantilever(1.0);
        let stiff = cantilever(0.0);
        let gap = |world: &SolverWorld| {
            let beam = body(world, 1);
            beam.position.add(rotate(Vec2::new(-1.0, 0.0), beam.angle)).length()
        };
        assert!(body(&soft, 1).angle < -0.05, "the soft weld droops: {}", body(&soft, 1).angle);
        assert!(body(&stiff, 1).angle.abs() < 0.02, "the stiff weld holds: {}", body(&stiff, 1).angle);
        assert!(gap(&soft) < 0.02 && gap(&stiff) < 0.02, "both stay attached");
    }

    fn physics_world(records: &[Vec<f64>]) -> PhysicsWorld {
        let mut world = PhysicsWorld::new();
        for (order, record) in records.iter().enumerate() {
            world.create_body(record[0] as u32, order as u32, record).unwrap();
        }
        world
    }

    fn state_of(world: &PhysicsWorld, order: usize) -> (f64, f64, f64, f64) {
        let base = order * STRIDE;
        let state = world.state();
        (state[base + 2], state[base + 3], state[base + 4], state[base + 5])
    }

    #[test]
    fn a_target_joint_holds_a_body_up_unless_too_weak() {
        let mut world = physics_world(&[record(7.0, 0.0, 0.0, 0.0, 1.0, 1.0)]);
        world.set_body_target(7, 0.0, 0.0, 2.0, 3.0, 5.0, 0.7, 1000.0).unwrap();
        for _ in 0..240 {
            world.step(DT, GRAVITY, 0.0);
        }
        let (x, y, vx, vy) = state_of(&world, 0);
        assert!((x - 2.0).abs() < 0.05 && (y - 3.0).abs() < 0.05 && vx.abs() < 0.05 && vy.abs() < 0.05, "at ({x}, {y})");
        // Less than its weight: it sags far below the target.
        world.set_body_target(7, 0.0, 0.0, 2.0, 3.0, 5.0, 0.7, 5.0).unwrap();
        for _ in 0..120 {
            world.step(DT, GRAVITY, 0.0);
        }
        assert!(state_of(&world, 0).1 < 0.0, "a weak target cannot hold it");
        assert!(world.clear_body_target(7));
        assert!(!world.clear_body_target(7));
    }

    #[test]
    fn a_conveyor_carries_a_box_and_rolling_resistance_stops_a_ball() {
        let mut belt = floor(1.0, -0.5, 30.0);
        belt[0] = 1.0;
        let box_on_belt = record(2.0, 0.0, 0.0, 0.5, 1.0, 1.0);
        let mut world = physics_world(&[belt, box_on_belt]);
        world.set_body_surface(1, 2.0, 0.0).unwrap();
        for _ in 0..180 {
            world.step(DT, GRAVITY, 0.0);
        }
        let (_, _, vx, _) = state_of(&world, 1);
        assert!((vx - 2.0).abs() < 0.05, "the box moves with the belt: {vx}");

        let roll = |resistance: f64| {
            let mut ball = record(3.0, 1.0, 0.0, 0.5, 0.5, 0.5);
            ball[4] = 3.0;
            let mut world = physics_world(&[floor(1.0, -0.5, 400.0), ball]);
            world.set_body_surface(3, 0.0, resistance).unwrap();
            for _ in 0..240 {
                world.step(DT, GRAVITY, 0.0);
            }
            state_of(&world, 1).2
        };
        // Sliding turns into rolling at two thirds of the speed (a solid disc), then it keeps rolling.
        assert!(roll(0.0) > 1.8, "a free ball keeps rolling");
        assert!(roll(0.3).abs() < 0.05, "rolling resistance stops it");
    }

    #[test]
    fn head_on_bullets_stop_at_each_other() {
        let mut first = record(1.0, 0.0, -10.0, 0.0, 0.1, 0.1);
        first[4] = 400.0;
        let mut second = record(2.0, 0.0, 10.0, 0.0, 0.1, 0.1);
        second[4] = -400.0;
        for bullet in [&mut first, &mut second] {
            bullet[17] = 0.0;
        }
        first.extend(second);
        let world = run(&first, &[], 3);
        let (a, b) = (body(&world, 0).position.x, body(&world, 1).position.x);
        assert!(a < b, "the bullets did not pass through each other: {a} vs {b}");
    }

    #[test]
    fn restoring_a_snapshot_reproduces_the_simulation_exactly() {
        let mut records = vec![floor(1.0, -0.5, 30.0)];
        for index in 0..12 {
            let mut crate_record = record(10.0 + index as f64, if index % 3 == 0 { 1.0 } else { 0.0 }, (index % 4) as f64 * 0.9 - 1.4, 0.6 + (index / 4) as f64 * 1.05, 0.8, 0.8);
            crate_record[14] = 0.1 * index as f64;
            records.push(crate_record);
        }
        records.push(capsule(30.0, 0.3, 5.0, 2.0, 0.6));
        let mut world = physics_world(&records);
        world.set_body_surface(1, 0.5, 0.0).unwrap();
        for _ in 0..40 {
            world.step(DT, GRAVITY, 0.0);
        }
        let snapshot = world.snapshot();
        assert!(snapshot.approximate_bytes() > 0 && snapshot.physics_steps() == 40);
        world.drain_events();
        for _ in 0..90 {
            world.step(DT, GRAVITY, 0.0);
        }
        let first_run = (world.state_checksum(), world.state().to_vec());
        world.restore(&snapshot);
        let resumed_events_start = world.physics_steps();
        assert_eq!(resumed_events_start, 40);
        world.step(DT, GRAVITY, 0.0);
        let events = world.drain_events();
        assert!(!events.iter().any(|event| matches!(event, PhysicsEvent::ContactStarted(contact) if contact.first == 1 || contact.second == 1)),
            "contacts that persist across the restore are not reported as new");
        for _ in 0..89 {
            world.step(DT, GRAVITY, 0.0);
        }
        assert_eq!(world.state_checksum(), first_run.0);
        assert_eq!(world.state(), first_run.1.as_slice());
    }
}
