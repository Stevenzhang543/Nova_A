use wasm_bindgen::prelude::*;

const STRIDE: usize = 27; 

#[wasm_bindgen]
pub fn step_physics(input: &[f32], dt: f32, _global_gravity: f32, air_friction: f32) -> Vec<f32> {
    let mut data = input.to_vec();
    let count = data.len() / STRIDE;

    // Step 1: Integration
    for i in 0..count {
        let idx = i * STRIDE;
        
        // FIX: Y = -12 blocks (120 units) Teleport Plane
        if data[idx + 3] < -120.0 {
            data[idx + 2] = 0.0; // Reset X
            data[idx + 3] = 0.0; // Reset Y
            data[idx + 4] = 0.0; // Reset Velocity X
            data[idx + 5] = 0.0; // Reset Velocity Y
            data[idx + 15] = 0.0; // Reset Angular Velocity
            continue;
        }

        let is_static = data[idx + 9];
        let is_kinematic = data[idx + 24];
        if is_static > 0.5 { continue; }

        if is_kinematic < 0.5 {
            let mass = data[idx + 8];
            let gravity_scale = data[idx + 17];
            let force_x = data[idx + 21];
            let force_y = data[idx + 22];
            let local_gravity = data[idx + 23];

            // FIX: Gravity subtracts because +Y is UP
            let ax = data[idx + 6] + (force_x / mass);
            let ay = data[idx + 7] - (local_gravity * gravity_scale) + (force_y / mass);
            data[idx + 4] += ax * dt; 
            data[idx + 5] += ay * dt; 

            let w = data[idx + 12]; let h = data[idx + 13];
            let inertia = if data[idx + 25] > 0.5 { mass * (w*w + h*h) / 12.0 } else { data[idx + 26].max(0.1) };
            
            let torque = data[idx + 16];
            let alpha = torque / inertia; 
            data[idx + 15] += alpha * dt; 
        }

        // FIX: Time-scaled damping so it doesn't instantly wipe velocity
        let lin_damp = data[idx + 18];
        let ang_damp = data[idx + 19];
        data[idx + 4] *= 1.0 - (lin_damp * dt).clamp(0.0, 1.0);
        data[idx + 5] *= 1.0 - (lin_damp * dt).clamp(0.0, 1.0);
        data[idx + 15] *= 1.0 - (ang_damp * dt).clamp(0.0, 1.0);
        
        data[idx + 4] *= 1.0 - air_friction;
        data[idx + 5] *= 1.0 - air_friction;

        data[idx + 2] += data[idx + 4] * dt; 
        data[idx + 3] += data[idx + 5] * dt; 
        data[idx + 14] += data[idx + 15] * dt; 
    }

    // Step 2: Broadphase & Impulse Resolution
    for i in 0..count {
        for j in (i + 1)..count {
            let idx_a = i * STRIDE;
            let idx_b = j * STRIDE;

            let static_a = data[idx_a + 9] > 0.5; let static_b = data[idx_b + 9] > 0.5;
            let kin_a = data[idx_a + 24] > 0.5;   let kin_b = data[idx_b + 24] > 0.5;

            if (static_a || kin_a) && (static_b || kin_b) { continue; }

            let type_a = data[idx_a + 1]; let type_b = data[idx_b + 1];
            let w_a = data[idx_a + 12]; let h_a = data[idx_a + 13];
            let w_b = data[idx_b + 12]; let h_b = data[idx_b + 13];

            // FIX: Since shapes are drawn from Center, cx and cy are just pos_x and pos_y!
            let cx_a = data[idx_a + 2]; let cy_a = data[idx_a + 3];
            let cx_b = data[idx_b + 2]; let cy_b = data[idx_b + 3];

            let r_a = if type_a == 1.0 { w_a } else { (w_a*w_a + h_a*h_a).sqrt() / 2.0 };
            let r_b = if type_b == 1.0 { w_b } else { (w_b*w_b + h_b*h_b).sqrt() / 2.0 };

            let dx = cx_b - cx_a; let dy = cy_b - cy_a;
            let dist_sq = dx * dx + dy * dy;
            let min_dist = r_a + r_b;

            if dist_sq < min_dist * min_dist && dist_sq > 0.0 {
                let dist = dist_sq.sqrt();
                let overlap = min_dist - dist;
                let nx = dx / dist; let ny = dy / dist;

                let mass_a = if static_a || kin_a { f32::INFINITY } else { data[idx_a + 8] };
                let mass_b = if static_b || kin_b { f32::INFINITY } else { data[idx_b + 8] };
                let total_mass = if mass_a == f32::INFINITY { mass_b } else if mass_b == f32::INFINITY { mass_a } else { mass_a + mass_b };

                let ratio_a = if static_a || kin_a { 0.0 } else { mass_b / total_mass };
                let ratio_b = if static_b || kin_b { 0.0 } else { mass_a / total_mass };

                data[idx_a + 2] -= nx * overlap * ratio_a; data[idx_a + 3] -= ny * overlap * ratio_a;
                data[idx_b + 2] += nx * overlap * ratio_b; data[idx_b + 3] += ny * overlap * ratio_b;

                let inertia_a = if data[idx_a + 25] > 0.5 { mass_a * (w_a*w_a + h_a*h_a) / 12.0 } else { data[idx_a + 26].max(0.1) };
                let inertia_b = if data[idx_b + 25] > 0.5 { mass_b * (w_b*w_b + h_b*h_b) / 12.0 } else { data[idx_b + 26].max(0.1) };

                let r_ap_x = nx * r_a; let r_ap_y = ny * r_a;
                let r_bp_x = -nx * r_b; let r_bp_y = -ny * r_b;

                let rvx = (data[idx_b + 4] - data[idx_b + 15] * r_bp_y) - (data[idx_a + 4] - data[idx_a + 15] * r_ap_y);
                let rvy = (data[idx_b + 5] + data[idx_b + 15] * r_bp_x) - (data[idx_a + 5] + data[idx_a + 15] * r_ap_x);
                let vel_along_normal = rvx * nx + rvy * ny;

                if vel_along_normal < 0.0 {
                    let e = data[idx_a + 10].max(data[idx_b + 10]);
                    let cross_a = r_ap_x * ny - r_ap_y * nx; let cross_b = r_bp_x * ny - r_bp_y * nx;
                    let inv_mass_a = if mass_a == f32::INFINITY { 0.0 } else { 1.0 / mass_a };
                    let inv_mass_b = if mass_b == f32::INFINITY { 0.0 } else { 1.0 / mass_b };
                    let inv_inertia_a = if mass_a == f32::INFINITY { 0.0 } else { 1.0 / inertia_a };
                    let inv_inertia_b = if mass_b == f32::INFINITY { 0.0 } else { 1.0 / inertia_b };

                    let inv_mass_sum = inv_mass_a + inv_mass_b + (cross_a * cross_a) * inv_inertia_a + (cross_b * cross_b) * inv_inertia_b;
                    let j_impulse = -(1.0 + e) * vel_along_normal / inv_mass_sum;

                    if !static_a && !kin_a {
                        data[idx_a + 4] -= j_impulse * nx * inv_mass_a;
                        data[idx_a + 5] -= j_impulse * ny * inv_mass_a;
                        data[idx_a + 15] -= j_impulse * cross_a * inv_inertia_a; 
                    }
                    if !static_b && !kin_b {
                        data[idx_b + 4] += j_impulse * nx * inv_mass_b;
                        data[idx_b + 5] += j_impulse * ny * inv_mass_b;
                        data[idx_b + 15] += j_impulse * cross_b * inv_inertia_b; 
                    }
                }
            }
        }
    }
    data
}