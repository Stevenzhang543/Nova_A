#[cfg(test)]
mod tests {
    use super::*;

    fn ellipse_record(id: f64, x: f64, y: f64, radius_x: f64, radius_y: f64) -> Vec<f64> {
        let mut record = vec![0.0; STRIDE];
        record[0] = id;
        record[1] = 1.0;
        record[2] = x;
        record[3] = y;
        record[8] = 1.0;
        record[10] = 0.0;
        record[12] = radius_x;
        record[13] = radius_y;
        record[17] = 1.0;
        record[25] = 1.0;
        record[27] = 1.0;
        record[33] = 1.0;
        record[42] = 2.0;
        record[47] = 1.0;
        record[48] = 1.0;
        record
    }

    fn box_record(id: f64, x: f64, y: f64, width: f64, height: f64) -> Vec<f64> {
        let mut record = vec![0.0; STRIDE];
        record[0] = id;
        record[2] = x;
        record[3] = y;
        record[8] = 1.0;
        record[12] = width;
        record[13] = height;
        record[17] = 1.0;
        record[25] = 1.0;
        record[27] = 1.0;
        record[33] = 1.0;
        record[42] = 2.0;
        record[47] = 1.0;
        record[48] = 1.0;
        let half_width = width * 0.5;
        let half_height = height * 0.5;
        let vertices = [
            (-half_width, -half_height),
            (half_width, -half_height),
            (half_width, half_height),
            (-half_width, half_height),
        ];
        for (index, (vx, vy)) in vertices.iter().enumerate() {
            record[34 + index * 2] = *vx;
            record[35 + index * 2] = *vy;
        }
        record
    }

    fn all_finite(values: &[f64]) -> bool {
        values.iter().all(|value| value.is_finite())
    }

    #[test]
    fn integrates_gravity_with_f64_precision() {
        let input = ellipse_record(1.0, 0.0, 0.0, 1.0, 1.0);
        let output = step_physics(&input, 0.1, 9.81, 0.0);
        assert!((output[5] + 0.981).abs() < 1.0e-10);
        assert!(output[3] < 0.0);
        assert!(all_finite(&output));
    }

    #[test]
    fn coincident_ellipses_remain_finite_and_separate() {
        let mut input = ellipse_record(1.0, 0.0, 0.0, 2.0, 1.0);
        input.extend(ellipse_record(2.0, 0.0, 0.0, 2.0, 1.0));
        let output = step_physics(&input, 1.0 / 60.0, 0.0, 0.0);
        assert!(all_finite(&output));
        assert!(output[29] > 0.0);
        assert!(output[32] > 0.0);
        let separation = Vec2::new(output[2], output[3])
            .sub(Vec2::new(output[STRIDE + 2], output[STRIDE + 3]))
            .length();
        assert!(separation > 0.0);
    }

    #[test]
    fn static_body_does_not_move() {
        let mut input = box_record(1.0, 3.0, 4.0, 2.0, 2.0);
        input[4] = 100.0;
        input[5] = -100.0;
        input[9] = 1.0;
        let output = step_physics(&input, 0.2, 9.81, 0.0);
        assert_eq!(output[2], 3.0);
        assert_eq!(output[3], 4.0);
    }

    #[test]
    fn kinematic_body_integrates_velocity_without_forces() {
        let mut input = box_record(1.0, 0.0, 0.0, 2.0, 2.0);
        input[4] = 5.0;
        input[5] = 2.0;
        input[24] = 1.0;
        let output = step_physics(&input, 0.2, 100.0, 100.0);
        assert!((output[2] - 1.0).abs() < 1.0e-10);
        assert!((output[3] - 0.4).abs() < 1.0e-10);
    }

    #[test]
    fn sensors_report_contacts_without_applying_impulses() {
        let mut input = ellipse_record(1.0, -0.5, 0.0, 1.0, 1.0);
        input[4] = 1.0;
        input[28] = 1.0;
        let mut second = ellipse_record(2.0, 0.5, 0.0, 1.0, 1.0);
        second[4] = -1.0;
        input.extend(second);
        let output = step_physics(&input, 1.0 / 120.0, 0.0, 0.0);
        assert!(output[29] > 0.0);
        assert!((output[4] - 1.0).abs() < 1.0e-10);
        assert!((output[STRIDE + 4] + 1.0).abs() < 1.0e-10);
    }

    #[test]
    fn collision_layers_are_isolated() {
        let mut input = ellipse_record(1.0, 0.0, 0.0, 1.0, 1.0);
        let mut second = ellipse_record(2.0, 0.5, 0.0, 1.0, 1.0);
        second[33] = 2.0;
        input.extend(second);
        let output = step_physics(&input, 1.0 / 60.0, 0.0, 0.0);
        assert_eq!(output[29], 0.0);
        assert_eq!(output[STRIDE + 29], 0.0);
    }

    #[test]
    fn malformed_numbers_are_sanitized() {
        let mut input = ellipse_record(1.0, f64::NAN, f64::INFINITY, -1.0, 0.0);
        input[4] = f64::NEG_INFINITY;
        input[8] = 0.0;
        let output = step_physics(&input, 1.0 / 60.0, 9.81, 0.0);
        assert!(all_finite(&output));
        assert!(output[8] > 0.0);
    }

    #[test]
    fn shape_inertia_matches_analytic_values() {
        let ellipse = Shape::Ellipse {
            radius_x: 2.0,
            radius_y: 1.0,
        };
        assert!((ellipse.inertia(4.0) - 5.0).abs() < 1.0e-10);

        let rectangle = Shape::Polygon {
            vertices: vec![
                Vec2::new(-2.0, -1.0),
                Vec2::new(2.0, -1.0),
                Vec2::new(2.0, 1.0),
                Vec2::new(-2.0, 1.0),
            ],
        };
        let expected = 4.0 * (4.0_f64.powi(2) + 2.0_f64.powi(2)) / 12.0;
        assert!((rectangle.inertia(4.0) - expected).abs() < 1.0e-10);
    }

    #[test]
    fn rotated_ellipse_and_polygon_generate_a_finite_manifold() {
        let mut input = ellipse_record(1.0, 0.0, 0.0, 2.0, 0.5);
        input[14] = 0.7;
        let mut polygon = box_record(2.0, 0.6, 0.0, 1.5, 1.5);
        polygon[14] = -0.35;
        input.extend(polygon);

        let output = step_physics(&input, 1.0 / 120.0, 0.0, 0.0);
        assert!(all_finite(&output));
        assert!(output[29] > 0.0);
        assert!(output[32] > 0.0);
    }

    #[test]
    fn perfectly_elastic_head_on_collision_reverses_velocities() {
        let mut input = ellipse_record(1.0, -0.95, 0.0, 1.0, 1.0);
        input[4] = 1.0;
        input[10] = 1.0;
        input[27] = 0.0;
        let mut second = ellipse_record(2.0, 0.95, 0.0, 1.0, 1.0);
        second[4] = -1.0;
        second[10] = 1.0;
        second[27] = 0.0;
        input.extend(second);

        let output = step_physics(&input, 1.0 / 240.0, 0.0, 0.0);
        assert!(output[4] < -0.99);
        assert!(output[STRIDE + 4] > 0.99);
    }

    #[test]
    fn restitution_threshold_suppresses_low_speed_bounce() {
        let mut input = ellipse_record(1.0, -0.95, 0.0, 1.0, 1.0);
        input[4] = 0.1;
        input[10] = 1.0;
        input[27] = 1.0;
        let mut second = ellipse_record(2.0, 0.95, 0.0, 1.0, 1.0);
        second[4] = -0.1;
        second[10] = 1.0;
        second[27] = 1.0;
        input.extend(second);

        let output = step_physics(&input, 1.0 / 240.0, 0.0, 0.0);
        assert!(output[4].abs() < 1.0e-8);
        assert!(output[STRIDE + 4].abs() < 1.0e-8);
    }

    #[test]
    fn high_speed_body_does_not_tunnel_through_a_thin_wall() {
        let mut input = ellipse_record(1.0, -5.0, 0.0, 0.5, 0.5);
        input[4] = 1_000.0;
        let mut wall = box_record(2.0, 0.0, 0.0, 0.2, 10.0);
        wall[9] = 1.0;
        input.extend(wall);

        let output = step_physics(&input, 0.01, 0.0, 0.0);
        assert!(all_finite(&output));
        assert!(output[2] < 0.6, "body tunneled to x={}", output[2]);
        assert!(output[4] < 1_000.0);
    }

    #[test]
    fn friction_coefficients_above_one_are_preserved() {
        let mut input = box_record(1.0, 0.0, 0.0, 1.0, 1.0);
        input[11] = 1.75;
        input[20] = 2.5;
        let body = Body::from_data(&input, 0);
        assert_eq!(body.dynamic_friction, 1.75);
        assert_eq!(body.static_friction, 2.5);
    }

    #[test]
    fn degenerate_polygon_vertices_fall_back_without_panicking() {
        let mut input = box_record(1.0, 0.0, 0.0, 2.0, 3.0);
        input
            .iter_mut()
            .take(42)
            .skip(34)
            .for_each(|value| *value = 0.0);
        let body = Body::from_data(&input, 0);
        assert!((body.shape.area() - 6.0).abs() < 1.0e-10);
        assert!(body.inertia.is_finite());
    }

    #[test]
    fn immovable_sensors_still_report_overlap() {
        let mut input = box_record(1.0, 0.0, 0.0, 2.0, 2.0);
        input[9] = 1.0;
        input[28] = 1.0;
        let mut second = box_record(2.0, 0.5, 0.0, 2.0, 2.0);
        second[9] = 1.0;
        input.extend(second);
        let output = step_physics(&input, 1.0 / 60.0, 0.0, 0.0);
        assert!(output[29] > 0.0);
        assert!(output[STRIDE + 29] > 0.0);
    }

    #[test]
    fn minimum_scale_shapes_collide_and_keep_analytic_inertia() {
        let radius = MIN_DIMENSION;
        let mass = MIN_DIMENSION;
        let mut input = ellipse_record(1.0, -0.75 * radius, 0.0, radius, radius);
        input[8] = mass;
        let mut second = ellipse_record(2.0, 0.75 * radius, 0.0, radius, radius);
        second[8] = mass;
        input.extend(second);

        let output = step_physics(&input, 1.0 / 1_000.0, 0.0, 0.0);
        let expected_inertia = 0.5 * mass * radius * radius;
        assert!(all_finite(&output));
        assert!(output[29] > 0.0);
        assert!((output[26] - expected_inertia).abs() <= expected_inertia * 1.0e-10);
    }

    #[test]
    fn force_acceleration_and_torque_follow_newtons_laws() {
        let mut input = ellipse_record(1.0, 0.0, 0.0, 1.0, 1.0);
        input[6] = 3.0;
        input[8] = 2.0;
        input[16] = 2.0;
        input[21] = 4.0;
        let output = step_physics(&input, 0.1, 0.0, 0.0);
        assert!((output[4] - 0.5).abs() < 1.0e-12);
        assert!((output[15] - 0.2).abs() < 1.0e-12);
    }

    #[test]
    fn exponential_air_damping_is_timestep_independent() {
        let mut input = ellipse_record(1.0, 0.0, 0.0, 1.0, 1.0);
        input[4] = 10.0;
        let output = step_physics(&input, 0.2, 0.0, 2.0);
        assert!((output[4] - 10.0 * (-0.4_f64).exp()).abs() < 1.0e-12);
    }

    #[test]
    fn static_friction_settles_a_slow_sliding_box() {
        let mut dynamic = box_record(1.0, 0.0, 0.0, 1.0, 1.0);
        dynamic[4] = 0.1;
        dynamic[11] = 1.0;
        dynamic[20] = 1.0;
        let mut floor = box_record(2.0, 0.0, -1.0, 20.0, 1.0);
        floor[9] = 1.0;
        floor[11] = 1.0;
        floor[20] = 1.0;
        dynamic.extend(floor);

        let mut state = dynamic;
        for _ in 0..120 {
            state = step_physics(&state, 1.0 / 120.0, 9.81, 0.0);
        }
        assert!(all_finite(&state));
        assert!(state[4].abs() < 1.0e-3, "sliding velocity={}", state[4]);
        assert!(state[5].abs() < 1.0e-3, "vertical velocity={}", state[5]);
    }

    #[test]
    fn moving_kinematic_body_transfers_momentum_to_dynamic_body() {
        let mut kinematic = box_record(1.0, -0.75, 0.0, 1.0, 1.0);
        kinematic[4] = 2.0;
        kinematic[24] = 1.0;
        let dynamic = box_record(2.0, 0.0, 0.0, 1.0, 1.0);
        kinematic.extend(dynamic);
        let output = step_physics(&kinematic, 1.0 / 120.0, 0.0, 0.0);
        assert!(output[STRIDE + 4] > 0.0);
        assert!((output[4] - 2.0).abs() < 1.0e-12);
    }

    fn connection_record(body_a: usize, body_b: usize, rest_length: f64) -> Vec<f64> {
        let mut record = vec![0.0; CONNECTION_STRIDE];
        record[0] = 1.0;
        record[1] = body_a as f64;
        record[2] = body_b as f64;
        record[7] = rest_length;
        record[9] = 1.0;
        record[10] = 100.0;
        record[12] = 1.25;
        record[13] = 100.0;
        record[14] = 100.0;
        record[16] = 1.0;
        record[28] = -1.0;
        record
    }

    #[test]
    fn rigid_string_prevents_endpoints_from_separating() {
        let mut bodies = ellipse_record(1.0, -1.0, 0.0, 0.1, 0.1);
        bodies[4] = -10.0;
        let mut second = ellipse_record(2.0, 1.0, 0.0, 0.1, 0.1);
        second[4] = 10.0;
        bodies.extend(second);
        let connection = connection_record(0, 1, 2.0);
        let output = step_physics_with_connections(&bodies, &connection, 0.1, 0.0, 0.0);
        let distance = output[STRIDE + 2] - output[2];
        assert!(distance <= 2.0 + 1.0e-6, "distance={distance}");
        assert_eq!(output[bodies.len() + 17], 0.0);
    }

    #[test]
    fn stretchable_string_applies_damped_hooke_tension() {
        let mut bodies = ellipse_record(1.0, -1.0, 0.0, 0.1, 0.1);
        let second = ellipse_record(2.0, 1.0, 0.0, 0.1, 0.1);
        bodies.extend(second);
        let mut connection = connection_record(0, 1, 1.0);
        connection[8] = 1.0;
        connection[10] = 200.0;
        connection[11] = 10.0;
        connection[12] = 10.0;
        let output = step_physics_with_connections(&bodies, &connection, 0.01, 0.0, 0.0);
        assert!(output[4] > 0.0);
        assert!(output[STRIDE + 4] < 0.0);
        assert!(output[bodies.len() + 18] > 0.0);
    }

    #[test]
    fn overload_reports_distinct_bending_and_stretch_failures() {
        let mut bodies = ellipse_record(1.0, 0.0, 0.0, 0.1, 0.1);
        bodies[8] = 5.0;
        let mut second = ellipse_record(2.0, 2.0, 0.0, 0.1, 0.1);
        second[8] = 5.0;
        bodies.extend(second);

        let mut bent = connection_record(0, 1, 2.0);
        bent[12] = 10.0;
        bent[13] = 0.001;
        bent[14] = 1.0e12;
        bent[24] = 1.0;
        bent[25] = 0.1;
        bent[26] = 0.1;
        bent[27] = 1.0;
        bent[ROPE_NODE_DATA_OFFSET + 1] = -1.0;
        let bent_output = step_physics_with_connections(&bodies, &bent, 0.01, 0.0, 0.0);
        assert_eq!(bent_output[bodies.len() + 17], 1.0);

        let mut stretched = connection_record(0, 1, 1.0);
        stretched[12] = 1.1;
        stretched[14] = 1.0;
        let stretched_output = step_physics_with_connections(&bodies, &stretched, 0.01, 0.0, 0.0);
        assert_eq!(stretched_output[bodies.len() + 17], 2.0);
    }

    #[test]
    fn invalid_connection_indices_are_ignored_without_corrupting_bodies() {
        let bodies = ellipse_record(1.0, 0.0, 0.0, 1.0, 1.0);
        let connection = connection_record(0, 999, 1.0);
        let output = step_physics_with_connections(&bodies, &connection, 0.01, 0.0, 0.0);
        assert!(all_finite(&output));
        assert_eq!(output.len(), bodies.len() + connection.len());
        assert_eq!(output[2], 0.0);
    }

    #[test]
    fn bound_overlapping_bodies_preserve_relative_transform() {
        let mut bodies = box_record(1.0, 0.0, 0.0, 1.0, 1.0);
        let mut second = box_record(2.0, 0.25, 0.0, 1.0, 1.0);
        second[21] = 100.0;
        second[16] = 20.0;
        bodies.extend(second);
        let mut binding = connection_record(0, 1, 0.25);
        binding[20] = 1.0;
        binding[22] = 0.25;

        let output = step_physics_with_connections(&bodies, &binding, 0.1, 0.0, 0.0);
        let relative = inverse_rotate(
            Vec2::new(
                output[STRIDE + 2] - output[2],
                output[STRIDE + 3] - output[3],
            ),
            output[14],
        );
        let relative_angle = normalize_angle(output[STRIDE + 14] - output[14]);
        assert!(
            (relative.x - 0.25).abs() < 1.0e-5,
            "relative_x={}",
            relative.x
        );
        assert!(relative.y.abs() < 1.0e-5, "relative_y={}", relative.y);
        assert!(
            relative_angle.abs() < 1.0e-5,
            "relative_angle={relative_angle}"
        );
        assert!(all_finite(&output));
    }

    #[test]
    fn rigid_compound_uses_combined_mass_for_external_force() {
        let first = box_record(1.0, 0.0, 0.0, 1.0, 1.0);
        let mut second = box_record(2.0, 0.25, 0.0, 1.0, 1.0);
        second[21] = 100.0;
        let mut bodies = first;
        bodies.extend(second);
        let mut binding = connection_record(0, 1, 0.25);
        binding[20] = 1.0;
        binding[22] = 0.25;

        let output = step_physics_with_connections(&bodies, &binding, 0.1, 0.0, 0.0);
        assert!((output[4] - 5.0).abs() < 1.0e-6, "first vx={}", output[4]);
        assert!(
            (output[STRIDE + 4] - 5.0).abs() < 1.0e-6,
            "second vx={}",
            output[STRIDE + 4]
        );
        assert!((output[15] - output[STRIDE + 15]).abs() < 1.0e-10);
    }

    #[test]
    fn cross_layer_connection_transmits_no_force() {
        let mut first = ellipse_record(1.0, -1.0, 0.0, 0.1, 0.1);
        first[4] = -10.0;
        let mut second = ellipse_record(2.0, 1.0, 0.0, 0.1, 0.1);
        second[4] = 10.0;
        second[33] = 2.0;
        first.extend(second);
        let connection = connection_record(0, 1, 2.0);
        let output = step_physics_with_connections(&first, &connection, 0.01, 0.0, 0.0);
        assert!((output[4] + 10.0).abs() < 1.0e-10);
        assert!((output[STRIDE + 4] - 10.0).abs() < 1.0e-10);
    }

    #[test]
    fn physical_string_nodes_receive_gravity_and_return_state() {
        let mut first = ellipse_record(1.0, -1.0, 0.0, 0.1, 0.1);
        first[9] = 1.0;
        let mut second = ellipse_record(2.0, 1.0, 0.0, 0.1, 0.1);
        second[9] = 1.0;
        first.extend(second);
        let mut connection = connection_record(0, 1, 2.0 * 2.0_f64.sqrt());
        connection[24] = 1.0;
        connection[25] = 0.1;
        connection[26] = 0.1;
        connection[27] = 1.0;
        connection[ROPE_NODE_DATA_OFFSET] = 0.0;
        connection[ROPE_NODE_DATA_OFFSET + 1] = 1.0;
        let output = step_physics_with_connections(&first, &connection, 0.02, 9.81, 0.0);
        let connection_offset = first.len();
        assert_eq!(output[connection_offset + 27], 1.0);
        assert!(output[connection_offset + ROPE_NODE_DATA_OFFSET + 1] < 1.0);
        assert!(output[connection_offset + ROPE_NODE_DATA_OFFSET + 3] < 0.0);
        assert!(all_finite(&output));
    }

    #[test]
    fn physical_string_node_collides_with_same_layer_body() {
        let mut first = ellipse_record(1.0, -2.0, 0.0, 0.1, 0.1);
        first[9] = 1.0;
        let mut second = ellipse_record(2.0, 2.0, 0.0, 0.1, 0.1);
        second[9] = 1.0;
        let mut floor = box_record(3.0, 0.0, -1.0, 4.0, 1.0);
        floor[9] = 1.0;
        first.extend(second);
        first.extend(floor);
        let mut connection = connection_record(0, 1, 4.1);
        connection[24] = 1.0;
        connection[25] = 0.2;
        connection[26] = 0.1;
        connection[27] = 1.0;
        connection[ROPE_NODE_DATA_OFFSET] = 0.0;
        connection[ROPE_NODE_DATA_OFFSET + 1] = -0.45;
        let output = step_physics_with_connections(&first, &connection, 0.001, 0.0, 0.0);
        let node_y = output[first.len() + ROPE_NODE_DATA_OFFSET + 1];
        assert!(node_y > -0.45, "node_y={node_y}");
        assert!(all_finite(&output));
    }

    #[test]
    fn physical_string_excludes_both_connected_bodies_from_collision() {
        let mut first = ellipse_record(1.0, -1.0, 0.0, 1.5, 1.5);
        first[9] = 1.0;
        let mut second = ellipse_record(2.0, 1.0, 0.0, 1.5, 1.5);
        second[9] = 1.0;
        first.extend(second);
        let mut connection = connection_record(0, 1, 2.0);
        connection[24] = 1.0;
        connection[25] = 0.2;
        connection[26] = 0.1;
        connection[27] = 1.0;
        let output = step_physics_with_connections(&first, &connection, 0.01, 0.0, 0.0);
        let node_offset = first.len() + ROPE_NODE_DATA_OFFSET;
        assert!(output[node_offset].abs() < 1.0e-12);
        assert!(output[node_offset + 1].abs() < 1.0e-12);
        assert!(output[node_offset + 2].abs() < 1.0e-12);
        assert!(output[node_offset + 3].abs() < 1.0e-12);
    }

    #[test]
    fn segment_collision_impulse_reaches_anchor_bodies() {
        let first = ellipse_record(1.0, -2.0, 0.0, 0.1, 0.1);
        let mut second = ellipse_record(2.0, 2.0, 0.0, 0.1, 0.1);
        second[9] = 1.0;
        let mut collider = ellipse_record(3.0, -1.0, -0.3, 0.25, 0.25);
        collider[5] = 10.0;
        let mut bodies = first;
        bodies.extend(second);
        bodies.extend(collider);
        let mut connection = connection_record(0, 1, 4.0);
        connection[24] = 1.0;
        connection[25] = 0.2;
        connection[26] = 0.1;
        connection[27] = 1.0;
        let output = step_physics_with_connections(&bodies, &connection, 0.001, 0.0, 0.0);
        assert!(output[5].abs() > 1.0e-6, "anchor vy={}", output[5]);
        assert!(output[2 * STRIDE + 5] < 10.0);
        assert!(all_finite(&output));
    }

    #[test]
    fn broken_physical_string_keeps_both_fragments_simulated() {
        let mut first = ellipse_record(1.0, -1.0, 0.0, 0.1, 0.1);
        first[9] = 1.0;
        let mut second = ellipse_record(2.0, 1.0, 0.0, 0.1, 0.1);
        second[9] = 1.0;
        first.extend(second);
        let mut connection = connection_record(0, 1, 2.0);
        connection[17] = 2.0;
        connection[24] = 1.0;
        connection[25] = 0.1;
        connection[26] = 0.1;
        connection[27] = 1.0;
        connection[28] = 0.0;
        let output = step_physics_with_connections(&first, &connection, 0.02, 9.81, 0.0);
        let connection_offset = first.len();
        assert_eq!(output[connection_offset + 17], 2.0);
        assert_eq!(output[connection_offset + 28], 0.0);
        assert!(output[connection_offset + ROPE_NODE_DATA_OFFSET + 3] < 0.0);
        assert!(all_finite(&output));
    }

    #[test]
    fn off_center_rope_anchor_applies_torque() {
        let first = ellipse_record(1.0, -1.0, 0.0, 0.5, 0.5);
        let mut second = ellipse_record(2.0, 2.0, 0.0, 0.5, 0.5);
        second[9] = 1.0;
        let mut bodies = first;
        bodies.extend(second);
        let mut connection = connection_record(0, 1, 2.0);
        connection[4] = 1.0;
        connection[24] = 1.0;
        connection[25] = 0.1;
        connection[26] = 0.1;
        connection[27] = 1.0;
        connection[ROPE_NODE_DATA_OFFSET] = 0.5;
        connection[ROPE_NODE_DATA_OFFSET + 1] = 0.5;
        let output = step_physics_with_connections(&bodies, &connection, 0.01, 0.0, 0.0);
        assert!(output[15].abs() > 1.0e-6, "angular velocity={}", output[15]);
        assert!(all_finite(&output));
    }

    #[test]
    fn multi_node_manual_rope_deforms_under_gravity() {
        let mut first = ellipse_record(1.0, -2.0, 0.0, 0.1, 0.1);
        first[9] = 1.0;
        let mut second = ellipse_record(2.0, 2.0, 0.0, 0.1, 0.1);
        second[9] = 1.0;
        first.extend(second);
        let mut connection = connection_record(0, 1, 5.0);
        connection[8] = 1.0;
        connection[10] = 300.0;
        connection[24] = 1.0;
        connection[25] = 0.1;
        connection[26] = 0.1;
        connection[27] = 3.0;
        let initial = [(-1.0, 1.0), (0.0, 1.5), (1.0, 1.0)];
        for (index, (x, y)) in initial.iter().enumerate() {
            let offset = ROPE_NODE_DATA_OFFSET + index * 4;
            connection[offset] = *x;
            connection[offset + 1] = *y;
        }
        let output = step_physics_with_connections(&first, &connection, 0.05, 9.81, 0.0);
        let connection_offset = first.len();
        assert!(output[connection_offset + ROPE_NODE_DATA_OFFSET + 1] < 1.0);
        assert!(output[connection_offset + ROPE_NODE_DATA_OFFSET + 5] < 1.5);
        assert!(output[connection_offset + ROPE_NODE_DATA_OFFSET + 9] < 1.0);
        assert!(all_finite(&output));
    }

    #[test]
    fn rope_linear_density_sets_exact_lumped_node_mass() {
        let mut bodies_data = ellipse_record(1.0, -3.0, 0.0, 0.1, 0.1);
        bodies_data.extend(ellipse_record(2.0, 3.0, 0.0, 0.1, 0.1));
        let bodies: Vec<Body> = (0..bodies_data.len() / STRIDE)
            .map(|index| Body::from_data(&bodies_data, index * STRIDE))
            .collect();
        let mut connection = connection_record(0, 1, 6.0);
        connection[24] = 1.0;
        connection[26] = 2.0;
        connection[27] = 3.0;
        let constraint = ConnectionConstraint::from_data(&connection, 0, bodies.len()).unwrap();
        let expected_inverse_mass = 3.0 / (2.0 * 6.0);
        assert!((rope_node_inverse_mass(&constraint) - expected_inverse_mass).abs() < 1.0e-12);
    }

    #[test]
    fn stretchable_rope_stiffness_is_sampling_independent() {
        let mut bodies = ellipse_record(1.0, -1.0, 0.0, 0.1, 0.1);
        bodies[9] = 1.0;
        let mut second = ellipse_record(2.0, 1.0, 0.0, 0.1, 0.1);
        second[9] = 1.0;
        bodies.extend(second);

        let mut one_node = connection_record(0, 1, 1.0);
        one_node[8] = 1.0;
        one_node[9] = 1.0;
        one_node[10] = 200.0;
        one_node[11] = 0.0;
        one_node[12] = 10.0;
        one_node[24] = 1.0;
        one_node[26] = 0.1;
        one_node[27] = 1.0;

        let mut three_nodes = one_node.clone();
        three_nodes[27] = 3.0;
        for (index, x) in [-0.5, 0.0, 0.5].iter().enumerate() {
            three_nodes[ROPE_NODE_DATA_OFFSET + index * 4] = *x;
        }

        let one_output = step_physics_with_connections(&bodies, &one_node, 1.0e-8, 0.0, 0.0);
        let three_output = step_physics_with_connections(&bodies, &three_nodes, 1.0e-8, 0.0, 0.0);
        let one_tension = one_output[bodies.len() + 18];
        let three_tension = three_output[bodies.len() + 18];
        assert!((one_tension - three_tension).abs() < 1.0e-6);
    }

    #[test]
    fn non_bendable_stretchable_rope_resists_curvature() {
        let mut bodies = ellipse_record(1.0, -2.0, 0.0, 0.1, 0.1);
        bodies[9] = 1.0;
        let mut second = ellipse_record(2.0, 2.0, 0.0, 0.1, 0.1);
        second[9] = 1.0;
        bodies.extend(second);
        let mut connection = connection_record(0, 1, 5.0);
        connection[8] = 1.0;
        connection[9] = 0.0;
        connection[10] = 0.0;
        connection[11] = 0.0;
        connection[12] = 10.0;
        connection[24] = 1.0;
        connection[26] = 0.1;
        connection[27] = 3.0;
        let initial = [(-1.0, 1.0), (0.0, 1.5), (1.0, 1.0)];
        for (index, (x, y)) in initial.iter().enumerate() {
            let offset = ROPE_NODE_DATA_OFFSET + index * 4;
            connection[offset] = *x;
            connection[offset + 1] = *y;
        }
        let output = step_physics_with_connections(&bodies, &connection, 0.01, 0.0, 0.0);
        let middle_y = output[bodies.len() + ROPE_NODE_DATA_OFFSET + 5];
        assert!(middle_y < 1.5, "middle_y={middle_y}");
    }

    #[test]
    fn broken_non_bendable_fragments_do_not_recouple_across_gap() {
        let mut bodies = ellipse_record(1.0, -2.0, 0.0, 0.1, 0.1);
        bodies[9] = 1.0;
        let mut second = ellipse_record(2.0, 2.0, 0.0, 0.1, 0.1);
        second[9] = 1.0;
        bodies.extend(second);
        let mut connection = connection_record(0, 1, 4.0);
        connection[8] = 1.0;
        connection[9] = 0.0;
        connection[10] = 0.0;
        connection[11] = 0.0;
        connection[12] = 10.0;
        connection[17] = 2.0;
        connection[24] = 1.0;
        connection[26] = 0.1;
        connection[27] = 2.0;
        connection[28] = 1.0;
        connection[ROPE_NODE_DATA_OFFSET] = -0.5;
        connection[ROPE_NODE_DATA_OFFSET + 1] = 1.0;
        connection[ROPE_NODE_DATA_OFFSET + 4] = 0.5;
        connection[ROPE_NODE_DATA_OFFSET + 5] = -1.0;
        let output = step_physics_with_connections(&bodies, &connection, 0.01, 0.0, 0.0);
        let offset = bodies.len() + ROPE_NODE_DATA_OFFSET;
        assert!((output[offset] + 0.5).abs() < 1.0e-12);
        assert!((output[offset + 1] - 1.0).abs() < 1.0e-12);
        assert!((output[offset + 4] - 0.5).abs() < 1.0e-12);
        assert!((output[offset + 5] + 1.0).abs() < 1.0e-12);
    }

    #[test]
    fn local_gravity_scale_angular_damping_and_manual_inertia_are_bound() {
        let mut body = ellipse_record(1.0, 0.0, 0.0, 1.0, 1.0);
        body[15] = 10.0;
        body[16] = 4.0;
        body[17] = 2.0;
        body[19] = 3.0;
        body[23] = 1.5;
        body[25] = 0.0;
        body[26] = 2.0;
        let output = step_physics(&body, 0.1, 9.0, 0.0);
        assert!((output[5] + 2.1).abs() < 1.0e-10);
        let mut expected_angular_velocity = 10.0;
        for _ in 0..BASE_SUB_STEPS {
            expected_angular_velocity = (expected_angular_velocity
                + 2.0 * 0.1 / BASE_SUB_STEPS as f64)
                * (-3.0 * 0.1 / BASE_SUB_STEPS as f64).exp();
        }
        assert!((output[15] - expected_angular_velocity).abs() < 1.0e-10);
        assert!((output[26] - 2.0).abs() < 1.0e-12);
    }

    #[test]
    fn one_world_unit_remains_one_configured_unit() {
        let mut body = box_record(1.0, 3.0, -4.0, 1.0, 1.0);
        body[4] = 10.0;
        body[5] = -6.0;
        body[24] = 1.0;
        let output = step_physics(&body, 0.25, 0.0, 0.0);
        assert!((output[2] - 5.5).abs() < 1.0e-10, "x={}", output[2]);
        assert!((output[3] + 5.5).abs() < 1.0e-10, "y={}", output[3]);
    }

    #[test]
    fn zero_collision_mask_disables_contacts() {
        let mut first = ellipse_record(1.0, 0.0, 0.0, 1.0, 1.0);
        first[42] = 0.0;
        let mut second = ellipse_record(2.0, 0.5, 0.0, 1.0, 1.0);
        second[42] = 0.0;
        first.extend(second);
        let output = step_physics(&first, 1.0 / 60.0, 0.0, 0.0);
        assert_eq!(output[29], 0.0);
        assert_eq!(output[STRIDE + 29], 0.0);
    }

    #[test]
    fn freeze_rotation_rejects_torque_and_angular_impulses() {
        let mut body = box_record(1.0, 0.0, 0.0, 2.0, 1.0);
        body[15] = 5.0;
        body[16] = 100.0;
        body[46] = 1.0;
        let output = step_physics(&body, 0.25, 0.0, 0.0);
        assert_eq!(output[14], 0.0);
        assert_eq!(output[15], 0.0);
    }

    #[test]
    fn continuous_mode_controls_adaptive_substeps() {
        let mut continuous = ellipse_record(1.0, 0.0, 0.0, 0.1, 0.1);
        continuous[4] = 1_000.0;
        let continuous_body = Body::from_data(&continuous, 0);
        assert!(determine_sub_steps(&[continuous_body], 0.1, 0.0) > BASE_SUB_STEPS);

        continuous[47] = 0.0;
        let discrete_body = Body::from_data(&continuous, 0);
        assert_eq!(determine_sub_steps(&[discrete_body], 0.1, 0.0), BASE_SUB_STEPS);
    }

    #[test]
    fn sleeping_body_wakes_when_an_impulse_arrives() {
        let data = ellipse_record(1.0, 0.0, 0.0, 1.0, 1.0);
        let mut body = Body::from_data(&data, 0);
        body.update_sleep_state(0.6, true);
        assert!(body.sleeping);
        body.apply_impulse(Vec2::new(1.0, 0.0), Vec2::ZERO);
        assert!(!body.sleeping);
        assert!(body.velocity.x > 0.0);
    }
}
