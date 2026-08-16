use std::time::Instant;

use nova_physics::{step_physics, STRIDE};

fn main() {
    let body_count = 2_000_usize;
    let steps = 240_usize;
    let mut bodies = vec![0.0_f64; body_count * STRIDE];
    for body in 0..body_count {
        let index = body * STRIDE;
        bodies[index] = body as f64;
        bodies[index + 1] = 1.0;
        bodies[index + 2] = (body % 100) as f64 * 2.5;
        bodies[index + 3] = (body / 100) as f64 * 2.5;
        bodies[index + 4] = ((body % 7) as f64 - 3.0) * 0.1;
        bodies[index + 8] = 1.0;
        bodies[index + 12] = 0.5;
        bodies[index + 13] = 0.5;
        bodies[index + 17] = 1.0;
        bodies[index + 18] = 0.01;
        bodies[index + 20] = 0.5;
        bodies[index + 25] = 1.0;
        bodies[index + 27] = 1.0;
        bodies[index + 42] = u32::MAX as f64;
        bodies[index + 48] = 1.0;
        bodies[index + 53] = 1.0;
    }
    let started = Instant::now();
    for _ in 0..steps {
        bodies = step_physics(&bodies, 1.0 / 60.0, 9.80665, 0.01);
    }
    let elapsed = started.elapsed();
    let finite = bodies.iter().all(|value| value.is_finite());
    let body_steps = body_count * steps;
    println!(
        "{{\"bodyCount\":{body_count},\"steps\":{steps},\"bodySteps\":{body_steps},\"elapsedMs\":{:.3},\"bodyStepsPerSecond\":{:.0},\"finite\":{finite}}}",
        elapsed.as_secs_f64() * 1_000.0,
        body_steps as f64 / elapsed.as_secs_f64()
    );
}
