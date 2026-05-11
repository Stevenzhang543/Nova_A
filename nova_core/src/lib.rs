use wasm_bindgen::prelude::*;

const STRIDE: usize = 42;
const EPSILON: f32 = 1e-6;
const AABB_MARGIN: f32 = 0.1;

// Baumgarte stabilization
const SLOP: f32 = 0.01;     // penetration allowance
const PERCENT: f32 = 0.8;   // correction strength

fn dot(vx1: f32, vy1: f32, vx2: f32, vy2: f32) -> f32 { vx1 * vx2 + vy1 * vy2 }
fn cross_s_v(s: f32, vx: f32, vy: f32) -> (f32, f32) { (-s * vy, s * vx) }
fn cross_v_v(vx1: f32, vy1: f32, vx2: f32, vy2: f32) -> f32 { vx1 * vy2 - vy1 * vx2 }
fn safe_normalize(vx: f32, vy: f32) -> (f32, f32) {
    let len_sq = dot(vx, vy, vx, vy);
    if len_sq > EPSILON { let len = len_sq.sqrt(); (vx / len, vy / len) } else { (0.0, 0.0) }
}

fn get_vs(data: &[f32], idx: usize) -> Vec<(f32, f32)> {
    let mut vs: Vec<(f32, f32)> = Vec::new();
    for k in 0..4 {
        let vx = data[idx + 34 + k * 2]; let vy = data[idx + 35 + k * 2];
        if k > 0 && (vx - vs[k - 1].0).abs() < 1e-4 && (vy - vs[k - 1].1).abs() < 1e-4 { continue; } 
        vs.push((vx, vy));
    }
    vs
}

fn get_poly_axes(th: f32, vs: &[(f32, f32)]) -> Vec<(f32, f32)> {
    let cos_t = th.cos(); let sin_t = th.sin();
    let mut axes = Vec::new();
    for i in 0..vs.len() {
        let p1 = vs[i]; let p2 = vs[(i + 1) % vs.len()];
        let w1x = p1.0 * cos_t - p1.1 * sin_t; let w1y = p1.0 * sin_t + p1.1 * cos_t;
        let w2x = p2.0 * cos_t - p2.1 * sin_t; let w2y = p2.0 * sin_t + p2.1 * cos_t;
        let (nx, ny) = safe_normalize(-(w2y - w1y), w2x - w1x);
        let mut is_dup = false;
        for &(ax, ay) in &axes { if dot(ax, ay, nx, ny).abs() > 0.99 { is_dup = true; break; } }
        if !is_dup { axes.push((nx, ny)); }
    }
    axes
}

fn project_poly(cx: f32, cy: f32, th: f32, vs: &[(f32, f32)], axis_x: f32, axis_y: f32) -> (f32, f32) {
    let cos_t = th.cos(); let sin_t = th.sin();
    let mut min_proj = f32::MAX; let mut max_proj = f32::MIN;
    for &(vx, vy) in vs {
        let wx = cx + vx * cos_t - vy * sin_t; let wy = cy + vx * sin_t + vy * cos_t;
        let proj = wx * axis_x + wy * axis_y;
        if proj < min_proj { min_proj = proj; } if proj > max_proj { max_proj = proj; }
    }
    (min_proj, max_proj)
}

fn support_poly(cx: f32, cy: f32, th: f32, vs: &[(f32, f32)], dir_x: f32, dir_y: f32) -> (f32, f32) {
    let cos_t = th.cos(); let sin_t = th.sin();
    let mut max_proj = f32::MIN; let mut best = (cx, cy);
    for &(vx, vy) in vs {
        let wx = cx + vx * cos_t - vy * sin_t; let wy = cy + vx * sin_t + vy * cos_t;
        let proj = wx * dir_x + wy * dir_y;
        if proj > max_proj { max_proj = proj; best = (wx, wy); }
    }
    best
}

fn project_ellipse(cx: f32, cy: f32, rx: f32, ry: f32, th: f32, axis_x: f32, axis_y: f32) -> (f32, f32) {
    let cos_t = th.cos(); let sin_t = th.sin();
    let local_ax = axis_x * cos_t + axis_y * sin_t;
    let local_ay = -axis_x * sin_t + axis_y * cos_t;
    let extent = ((rx * local_ax).powi(2) + (ry * local_ay).powi(2)).sqrt();
    let proj = cx * axis_x + cy * axis_y;
    (proj - extent, proj + extent)
}

fn support_ellipse(cx: f32, cy: f32, rx: f32, ry: f32, th: f32, dir_x: f32, dir_y: f32) -> (f32, f32) {
    let cos_t = th.cos(); let sin_t = th.sin();
    let local_dx = dir_x * cos_t + dir_y * sin_t;
    let local_dy = -dir_x * sin_t + dir_y * cos_t;
    let extent = ((rx * local_dx).powi(2) + (ry * local_dy).powi(2)).sqrt();
    if extent < EPSILON { return (cx, cy); }
    let local_ex = (rx * rx * local_dx) / extent;
    let local_ey = (ry * ry * local_dy) / extent;
    let ex = local_ex * cos_t - local_ey * sin_t;
    let ey = local_ex * sin_t + local_ey * cos_t;
    (cx + ex, cy + ey)
}

struct Contact { idx_a: usize, idx_b: usize, nx: f32, ny: f32, overlap: f32, r_ap_x: f32, r_ap_y: f32, r_bp_x: f32, r_bp_y: f32, e: f32, mu: f32, inv_mass_sum: f32, inv_mass_a: f32, inv_mass_b: f32, inv_inertia_a: f32, inv_inertia_b: f32 }
struct AABB { idx: usize, min_x: f32, max_x: f32, min_y: f32, max_y: f32 }

#[wasm_bindgen]
pub fn step_physics(input: &[f32], dt: f32, global_gravity: f32, air_friction: f32) -> Vec<f32> {
    let mut data = input.to_vec(); let count = data.len() / STRIDE;

    for i in 0..count {
        let idx = i * STRIDE;
        data[idx + 29] = 0.0; data[idx + 30] = 0.0; data[idx + 31] = 0.0; data[idx + 32] = 0.0;
    }

    if dt <= 0.0 { return data; }

    // HEAVY PRECISION: Sub-stepping logic (160 iterations per frame)
    let sub_steps = 8;
    let sub_dt = dt / (sub_steps as f32);

    for _sub in 0..sub_steps {

        for i in 0..count {
            let idx = i * STRIDE;
            if data[idx + 3] < -100000.0 {
                data[idx + 2] = 0.0; data[idx + 3] = 0.0; data[idx + 4] = 0.0; data[idx + 5] = 0.0; data[idx + 15] = 0.0; continue;
            }

            let is_static = data[idx + 9] > 0.5; let is_kinematic = data[idx + 24] > 0.5;
            if is_static || is_kinematic { continue; }

            let mass = data[idx + 8]; let gravity_scale = data[idx + 17];
            let force_x = data[idx + 21]; let force_y = data[idx + 22]; let local_gravity = data[idx + 23];
            
            let inv_mass = if mass == 0.0 { 0.0 } else { 1.0 / mass };
            let ax = data[idx + 6] + (force_x * inv_mass);
            let ay = data[idx + 7] - ((global_gravity + local_gravity) * gravity_scale) + (force_y * inv_mass);
            data[idx + 4] += ax * sub_dt; data[idx + 5] += ay * sub_dt; 

            let w = data[idx + 12]; let h = data[idx + 13];
            let inertia = if data[idx + 25] > 0.5 { mass * (w*w + h*h) / 12.0 } else { data[idx + 26].max(0.1) };
            data[idx + 15] += (data[idx + 16] / if inertia == 0.0 { 1.0 } else { inertia }) * sub_dt; 

            // FIX: True exponential decay for completely stable drag curves regardless of framerate
            let lin_damp = data[idx + 18]; let ang_damp = data[idx + 19];
            data[idx + 4] *= (-lin_damp * sub_dt).exp() * (-air_friction * sub_dt).exp();
            data[idx + 5] *= (-lin_damp * sub_dt).exp() * (-air_friction * sub_dt).exp();
            data[idx + 15] *= (-ang_damp * sub_dt).exp();

            // Synchronize Integration before testing collisions
            data[idx + 2] += data[idx + 4] * sub_dt; 
            data[idx + 3] += data[idx + 5] * sub_dt; 
            data[idx + 14] += data[idx + 15] * sub_dt; 
        }

        let mut aabbs = Vec::with_capacity(count);
        for i in 0..count {
            let idx = i * STRIDE;
            let type_id = data[idx + 1]; let cx = data[idx + 2]; let cy = data[idx + 3];
            let max_r = if type_id == 1.0 { data[idx + 12].max(data[idx + 13]) } else {
                let vs = get_vs(&data, idx); let mut max_sq = 0.0_f32;
                for &(vx, vy) in &vs { let sq = vx*vx + vy*vy; if sq > max_sq { max_sq = sq; } }
                max_sq.sqrt()
            };
            aabbs.push(AABB { idx, min_x: cx - max_r - AABB_MARGIN, max_x: cx + max_r + AABB_MARGIN, min_y: cy - max_r - AABB_MARGIN, max_y: cy + max_r + AABB_MARGIN });
        }
        aabbs.sort_by(|a, b| a.min_x.partial_cmp(&b.min_x).unwrap());

        let mut contacts = Vec::new();
        for i in 0..count {
            for j in (i + 1)..count {
                let box_a = &aabbs[i]; let box_b = &aabbs[j];
                if box_b.min_x > box_a.max_x { break; }
                if box_a.min_y > box_b.max_y || box_a.max_y < box_b.min_y { continue; }

                let idx_a = box_a.idx; let idx_b = box_b.idx;
                if (data[idx_a + 33] - data[idx_b + 33]).abs() > 0.1 { continue; } 

                let static_a = data[idx_a + 9] > 0.5; let static_b = data[idx_b + 9] > 0.5;
                let kin_a = data[idx_a + 24] > 0.5;   let kin_b = data[idx_b + 24] > 0.5;
                if (static_a || kin_a) && (static_b || kin_b) { continue; }

                let type_a = data[idx_a + 1]; let type_b = data[idx_b + 1];
                let cx_a = data[idx_a + 2]; let cy_a = data[idx_a + 3]; let th_a = data[idx_a + 14];
                let cx_b = data[idx_b + 2]; let cy_b = data[idx_b + 3]; let th_b = data[idx_b + 14];
                
                let vs_a = if type_a == 0.0 { get_vs(&data, idx_a) } else { Vec::new() };
                let vs_b = if type_b == 0.0 { get_vs(&data, idx_b) } else { Vec::new() };

                let mut axes = Vec::new();
                if type_a == 0.0 { axes.extend(get_poly_axes(th_a, &vs_a)); }
                if type_b == 0.0 { axes.extend(get_poly_axes(th_b, &vs_b)); }

                if type_a == 1.0 && type_b == 0.0 {
                    let mut best_pt = (cx_b, cy_b); let mut min_d = f32::MAX;
                    let c_t = th_b.cos(); let s_t = th_b.sin();
                    for &(vx, vy) in &vs_b {
                        let wx = cx_b + vx * c_t - vy * s_t; let wy = cy_b + vx * s_t + vy * c_t;
                        let d = dot(wx - cx_a, wy - cy_a, wx - cx_a, wy - cy_a);
                        if d < min_d { min_d = d; best_pt = (wx, wy); }
                    }
                    axes.push(safe_normalize(cx_a - best_pt.0, cy_a - best_pt.1));
                } else if type_b == 1.0 && type_a == 0.0 {
                    let mut best_pt = (cx_a, cy_a); let mut min_d = f32::MAX;
                    let c_t = th_a.cos(); let s_t = th_a.sin();
                    for &(vx, vy) in &vs_a {
                        let wx = cx_a + vx * c_t - vy * s_t; let wy = cy_a + vx * s_t + vy * c_t;
                        let d = dot(wx - cx_b, wy - cy_b, wx - cx_b, wy - cy_b);
                        if d < min_d { min_d = d; best_pt = (wx, wy); }
                    }
                    axes.push(safe_normalize(cx_b - best_pt.0, cy_b - best_pt.1));
                } else if type_a == 1.0 && type_b == 1.0 {
                    axes.push(safe_normalize(cx_b - cx_a, cy_b - cy_a));
                }

                let mut overlap = f32::MAX; let mut nx = 0.0; let mut ny = 0.0; let mut is_colliding = true;

                for &(ax, ay) in &axes {
                    if ax == 0.0 && ay == 0.0 { continue; }
                    let (min_a, max_a) = if type_a == 1.0 { project_ellipse(cx_a, cy_a, data[idx_a + 12], data[idx_a + 13], th_a, ax, ay) } else { project_poly(cx_a, cy_a, th_a, &vs_a, ax, ay) };
                    let (min_b, max_b) = if type_b == 1.0 { project_ellipse(cx_b, cy_b, data[idx_b + 12], data[idx_b + 13], th_b, ax, ay) } else { project_poly(cx_b, cy_b, th_b, &vs_b, ax, ay) };
                    
                    let over = max_a.min(max_b) - min_a.max(min_b);
                    if over <= 0.0 { is_colliding = false; break; }
                    if over < overlap { overlap = over; nx = ax; ny = ay; if dot(cx_b - cx_a, cy_b - cy_a, nx, ny) < 0.0 { nx = -nx; ny = -ny; } }
                }

                if is_colliding {
                    if _sub == sub_steps - 1 {
                        data[idx_a + 29] += 1.0; data[idx_b + 29] += 1.0;
                        data[idx_a + 30] = nx; data[idx_a + 31] = ny; data[idx_a + 32] = overlap;
                        data[idx_b + 30] = -nx; data[idx_b + 31] = -ny; data[idx_b + 32] = overlap;
                    }

                    if data[idx_a + 28] > 0.5 || data[idx_b + 28] > 0.5 { continue; } 

                    let mass_a = if static_a || kin_a { f32::INFINITY } else { data[idx_a + 8] };
                    let mass_b = if static_b || kin_b { f32::INFINITY } else { data[idx_b + 8] };
                    let inertia_a = if data[idx_a + 25] > 0.5 { mass_a * (data[idx_a + 12]*data[idx_a + 12] + data[idx_a + 13]*data[idx_a + 13]) / 12.0 } else { data[idx_a + 26].max(0.1) };
                    let inertia_b = if data[idx_b + 25] > 0.5 { mass_b * (data[idx_b + 12]*data[idx_b + 12] + data[idx_b + 13]*data[idx_b + 13]) / 12.0 } else { data[idx_b + 26].max(0.1) };

                    let inv_mass_a = if mass_a == f32::INFINITY { 0.0 } else { 1.0 / mass_a }; let inv_mass_b = if mass_b == f32::INFINITY { 0.0 } else { 1.0 / mass_b };
                    let inv_inertia_a = if mass_a == f32::INFINITY { 0.0 } else { 1.0 / inertia_a }; let inv_inertia_b = if mass_b == f32::INFINITY { 0.0 } else { 1.0 / inertia_b };

                    let r_ap_x; let r_ap_y; let r_bp_x; let r_bp_y;
                    if type_a == 1.0 && type_b == 1.0 { 
                        let (sa_x, sa_y) = support_ellipse(cx_a, cy_a, data[idx_a + 12], data[idx_a + 13], th_a, nx, ny);
                        let (sb_x, sb_y) = support_ellipse(cx_b, cy_b, data[idx_b + 12], data[idx_b + 13], th_b, -nx, -ny);
                        let cp_x = (sa_x + sb_x) / 2.0; let cp_y = (sa_y + sb_y) / 2.0;
                        r_ap_x = cp_x - cx_a; r_ap_y = cp_y - cy_a; r_bp_x = cp_x - cx_b; r_bp_y = cp_y - cy_b;
                    } else if type_a == 0.0 && type_b == 0.0 { 
                        let (sa_x, sa_y) = support_poly(cx_a, cy_a, th_a, &vs_a, nx, ny);
                        let (sb_x, sb_y) = support_poly(cx_b, cy_b, th_b, &vs_b, -nx, -ny);
                        let cp_x = (sa_x + sb_x) / 2.0; let cp_y = (sa_y + sb_y) / 2.0;
                        r_ap_x = cp_x - cx_a; r_ap_y = cp_y - cy_a; r_bp_x = cp_x - cx_b; r_bp_y = cp_y - cy_b;
                    } else { 
                        if type_a == 1.0 { 
                            let (sb_x, sb_y) = support_poly(cx_b, cy_b, th_b, &vs_b, -nx, -ny);
                            r_ap_x = sb_x - cx_a; r_ap_y = sb_y - cy_a; r_bp_x = sb_x - cx_b; r_bp_y = sb_y - cy_b;
                        } else { 
                            let (sa_x, sa_y) = support_poly(cx_a, cy_a, th_a, &vs_a, nx, ny);
                            r_ap_x = sa_x - cx_a; r_ap_y = sa_y - cy_a; r_bp_x = sa_x - cx_b; r_bp_y = sa_y - cy_b;
                        }
                    }

                    let cross_a = cross_v_v(r_ap_x, r_ap_y, nx, ny); let cross_b = cross_v_v(r_bp_x, r_bp_y, nx, ny);
                    let inv_mass_sum = inv_mass_a + inv_mass_b + (cross_a * cross_a) * inv_inertia_a + (cross_b * cross_b) * inv_inertia_b;
                    let rvx = (data[idx_b + 4] - data[idx_b + 15] * r_bp_y) - (data[idx_a + 4] - data[idx_a + 15] * r_ap_y);
                    let rvy = (data[idx_b + 5] + data[idx_b + 15] * r_bp_x) - (data[idx_a + 5] + data[idx_a + 15] * r_ap_x);
                    
                    let mut e = data[idx_a + 10].max(data[idx_b + 10]);
                    if dot(rvx, rvy, nx, ny).abs() < data[idx_a + 27].max(data[idx_b + 27]) { e = 0.0; }
                    let mu = (data[idx_a + 11] + data[idx_b + 11]) / 2.0;

                    contacts.push(Contact { idx_a, idx_b, nx, ny, overlap, r_ap_x, r_ap_y, r_bp_x, r_bp_y, e, mu, inv_mass_sum, inv_mass_a, inv_mass_b, inv_inertia_a, inv_inertia_b });
                }
            }
        }

        // Heavy Precision Solver: 20 passes PER SUBSTEP
        let iterations = 20; 
        for _ in 0..iterations {
            for c in &contacts {
                let (v_ax, v_ay, w_a) = (data[c.idx_a + 4], data[c.idx_a + 5], data[c.idx_a + 15]);
                let (v_bx, v_by, w_b) = (data[c.idx_b + 4], data[c.idx_b + 5], data[c.idx_b + 15]);
                let (cross_wb_x, cross_wb_y) = cross_s_v(w_b, c.r_bp_x, c.r_bp_y); let (cross_wa_x, cross_wa_y) = cross_s_v(w_a, c.r_ap_x, c.r_ap_y);
                let rv_x = (v_bx + cross_wb_x) - (v_ax + cross_wa_x); let rv_y = (v_by + cross_wb_y) - (v_ay + cross_wa_y);

                let vn = dot(rv_x, rv_y, c.nx, c.ny);
                if vn > 0.0 { continue; }

                let j = -(1.0 + c.e) * vn / c.inv_mass_sum;
                let ix = j * c.nx; let iy = j * c.ny;
                data[c.idx_a + 4] -= ix * c.inv_mass_a; data[c.idx_a + 5] -= iy * c.inv_mass_a; data[c.idx_a + 15] -= cross_v_v(c.r_ap_x, c.r_ap_y, ix, iy) * c.inv_inertia_a;
                data[c.idx_b + 4] += ix * c.inv_mass_b; data[c.idx_b + 5] += iy * c.inv_mass_b; data[c.idx_b + 15] += cross_v_v(c.r_bp_x, c.r_bp_y, ix, iy) * c.inv_inertia_b;

                let (v_ax2, v_ay2, w_a2) = (data[c.idx_a + 4], data[c.idx_a + 5], data[c.idx_a + 15]);
                let (v_bx2, v_by2, w_b2) = (data[c.idx_b + 4], data[c.idx_b + 5], data[c.idx_b + 15]);
                let (cross_wb_x2, cross_wb_y2) = cross_s_v(w_b2, c.r_bp_x, c.r_bp_y); let (cross_wa_x2, cross_wa_y2) = cross_s_v(w_a2, c.r_ap_x, c.r_ap_y);
                let rv_x2 = (v_bx2 + cross_wb_x2) - (v_ax2 + cross_wa_x2); let rv_y2 = (v_by2 + cross_wb_y2) - (v_ay2 + cross_wa_y2);

                let vn2 = dot(rv_x2, rv_y2, c.nx, c.ny);
                let tx = rv_x2 - vn2 * c.nx; let ty = rv_y2 - vn2 * c.ny;
                let (tx, ty) = safe_normalize(tx, ty);
                let inv_mass_sum_t = c.inv_mass_a + c.inv_mass_b + (cross_v_v(c.r_ap_x, c.r_ap_y, tx, ty).powi(2)) * c.inv_inertia_a + (cross_v_v(c.r_bp_x, c.r_bp_y, tx, ty).powi(2)) * c.inv_inertia_b;

                if inv_mass_sum_t > EPSILON {
                    let mut jt = -dot(rv_x2, rv_y2, tx, ty) / inv_mass_sum_t;
                    jt = jt.clamp(-c.mu * j, c.mu * j);
                    data[c.idx_a + 4] -= jt * tx * c.inv_mass_a; data[c.idx_a + 5] -= jt * ty * c.inv_mass_a; data[c.idx_a + 15] -= cross_v_v(c.r_ap_x, c.r_ap_y, jt * tx, jt * ty) * c.inv_inertia_a;
                    data[c.idx_b + 4] += jt * tx * c.inv_mass_b; data[c.idx_b + 5] += jt * ty * c.inv_mass_b; data[c.idx_b + 15] += cross_v_v(c.r_bp_x, c.r_bp_y, jt * tx, jt * ty) * c.inv_inertia_b;
                }
            }
        }

        // Sub-step Baumgarte
        for c in &contacts {
            let cx = ((c.overlap - SLOP).max(0.0) * PERCENT / (c.inv_mass_a + c.inv_mass_b)) * c.nx;
            let cy = ((c.overlap - SLOP).max(0.0) * PERCENT / (c.inv_mass_a + c.inv_mass_b)) * c.ny;
            data[c.idx_a + 2] -= cx * c.inv_mass_a; data[c.idx_a + 3] -= cy * c.inv_mass_a;
            data[c.idx_b + 2] += cx * c.inv_mass_b; data[c.idx_b + 3] += cy * c.inv_mass_b;
        }
    }

    data
}