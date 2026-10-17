// 物理证据示例：测量基准、确定性回放、连续碰撞、堆叠和加速长期运行。
use nova_physics::{step_physics, PhysicsWorld, STRIDE};
use std::time::Instant;

// 构造指定身份、位置、尺寸及静态标志的基准刚体。
fn body(id: u32, x: f64, y: f64, width: f64, height: f64, is_static: bool) -> Vec<f64> {
    let mut value = vec![0.0; STRIDE];
    value[0] = id as f64;
    value[2] = x;
    value[3] = y;
    value[8] = 1.0;
    value[9] = if is_static { 1.0 } else { 0.0 };
    value[12] = width;
    value[13] = height;
    value[17] = 1.0;
    value[20] = 0.6;
    value[11] = 0.45;
    value[25] = 1.0;
    value[27] = 1.0;
    value[33] = 0.0;
    value[42] = 1.0;
    value[47] = 0.0;
    value[48] = 1.0;
    value[54] = 0.0;
    value[55] = 3.0;
    let half_width = width * 0.5;
    let half_height = height * 0.5;
    for (index, (px, py)) in [
        (-half_width, -half_height),
        (half_width, -half_height),
        (half_width, half_height),
        (-half_width, half_height),
    ]
    .iter()
    .enumerate()
    {
        value[34 + index * 2] = *px;
        value[35 + index * 2] = *py;
    }
    value
}

// 基于通用刚体记录构造椭圆和连续碰撞参数。
fn ellipse(id: u32, x: f64, radius: f64, continuous: bool) -> Vec<f64> {
    let mut value = body(id, x, 0.0, radius * 2.0, radius * 2.0, false);
    value[1] = 1.0;
    value[12] = radius;
    value[13] = radius;
    value[47] = if continuous { 1.0 } else { 0.0 };
    value
}

// 重复推进指定数量的刚体，返回耗时及状态校验信息。
fn benchmark(count: usize, steps: usize) -> (f64, f64, u64) {
    let mut world = PhysicsWorld::new();
    for index in 0..count {
        let mut value = body(index as u32 + 1, index as f64 * 3.0, 0.0, 1.0, 1.0, false);
        value[4] = if index % 2 == 0 { 0.05 } else { -0.05 };
        value[48] = 0.0;
        world
            .create_body(index as u32 + 1, index as u32, &value)
            .unwrap();
    }
    world.step(1.0 / 60.0, 0.0, 0.0);
    let started = Instant::now();
    for _ in 0..steps {
        world.step(1.0 / 60.0, 0.0, 0.0);
    }
    let seconds = started.elapsed().as_secs_f64().max(1.0e-9);
    (
        seconds * 1000.0 / steps as f64,
        steps as f64 / seconds,
        world.state_checksum(),
    )
}

// 重复运行同一输入，比较物理校验值是否一致。
fn deterministic_replay() -> (u64, u64, bool) {
    // 构造同一初始场景并推进固定步数，返回用于回放对比的状态校验值。
    fn run() -> u64 {
        let mut world = PhysicsWorld::new();
        for index in 0..64 {
            let mut value = body(
                index + 1,
                (index % 8) as f64 * 1.2,
                (index / 8) as f64 * 1.2 + 1.0,
                1.0,
                1.0,
                false,
            );
            value[4] = ((index * 17) % 11) as f64 * 0.01;
            value[5] = ((index * 31) % 13) as f64 * -0.01;
            world.create_body(index + 1, index, &value).unwrap();
        }
        for _ in 0..600 {
            world.step(1.0 / 120.0, 9.80665, 0.01);
        }
        world.state_checksum()
    }
    let first = run();
    let second = run();
    (first, second, first == second)
}

// 运行高速穿墙场景，记录连续碰撞设置下的最终状态。
fn tunneling_case(continuous: bool) -> (f64, f64) {
    let mut input = ellipse(1, -5.0, 0.1, continuous);
    input[4] = 1_000.0;
    let mut wall = body(2, 0.0, 0.0, 0.2, 10.0, true);
    wall[47] = if continuous { 1.0 } else { 0.0 };
    input.extend(wall);
    let output = step_physics(&input, 0.01, 0.0, 0.0);
    (output[2], output[4])
}

// 运行堆叠场景并测量残余运动和位置稳定性。
fn stable_stack() -> (f64, f64) {
    let mut world = PhysicsWorld::new();
    world
        .create_body(1, 0, &body(1, 0.0, -0.5, 20.0, 1.0, true))
        .unwrap();
    for index in 0..20_u32 {
        let column = index % 4;
        let row = index / 4;
        let value = body(
            index + 2,
            (column as f64 - 1.5) * 2.0,
            row as f64 + 0.5,
            1.0,
            1.0,
            false,
        );
        world.create_body(index + 2, index + 1, &value).unwrap();
    }
    for _ in 0..1_200 {
        world.step(1.0 / 120.0, 9.80665, 0.01);
    }
    let state = world.state();
    let mut max_position_error = 0.0_f64;
    let mut kinetic_proxy = 0.0_f64;
    for index in 1..21 {
        let offset = index * STRIDE;
        let expected_y = ((index - 1) / 4) as f64 + 0.5;
        max_position_error = max_position_error.max((state[offset + 3] - expected_y).abs());
        kinetic_proxy +=
            state[offset + 4].powi(2) + state[offset + 5].powi(2) + state[offset + 15].powi(2);
    }
    (max_position_error, kinetic_proxy)
}

// 连续推进大量物理步，记录校验值、有限性和耗时。
fn accelerated_soak() -> (u64, u64, bool, f64) {
    let mut world = PhysicsWorld::new();
    let mut dynamic = body(1, 0.0, 2.0, 1.0, 1.0, false);
    dynamic[10] = 0.2;
    world.create_body(1, 0, &dynamic).unwrap();
    world
        .create_body(2, 1, &body(2, 0.0, -0.5, 8.0, 1.0, true))
        .unwrap();
    let ticks = 12_u64 * 60 * 60 * 60;
    let started = Instant::now();
    for _ in 0..ticks {
        world.step(1.0 / 60.0, 9.80665, 0.01);
    }
    let finite = world.state().iter().all(
        /* 判断 value . is_finite () 是否成立，供过滤或有效性检查使用。 */
        |value| value.is_finite(),
    );
    (
        ticks,
        world.state_checksum(),
        finite,
        started.elapsed().as_secs_f64(),
    )
}

// 运行不同规模基准、回放、穿墙、堆叠和长期模拟并输出证据。
fn main() {
    let (b100_ms, b100_hz, b100_hash) = benchmark(100, 30);
    let (b1000_ms, b1000_hz, b1000_hash) = benchmark(1_000, 20);
    let (b10000_ms, b10000_hz, b10000_hash) = benchmark(10_000, 5);
    let (det_a, det_b, deterministic) = deterministic_replay();
    let (discrete_x, discrete_vx) = tunneling_case(false);
    let (continuous_x, continuous_vx) = tunneling_case(true);
    let (stack_error, stack_energy) = stable_stack();
    let (soak_ticks, soak_hash, soak_finite, soak_wall_seconds) = accelerated_soak();
    println!(
        r#"{{"format":"nova-v3.4-physics-native-evidence","version":1,"engineVersion":"3.4.0","benchmarks":[{{"bodies":100,"steps":30,"meanStepMs":{b100_ms},"fixedStepsPerSecond":{b100_hz},"checksum":"{b100_hash:016x}"}},{{"bodies":1000,"steps":20,"meanStepMs":{b1000_ms},"fixedStepsPerSecond":{b1000_hz},"checksum":"{b1000_hash:016x}"}},{{"bodies":10000,"steps":5,"meanStepMs":{b10000_ms},"fixedStepsPerSecond":{b10000_hz},"checksum":"{b10000_hash:016x}"}}],"determinism":{{"first":"{det_a:016x}","second":"{det_b:016x}","matched":{deterministic}}},"tunneling":{{"discrete":{{"x":{discrete_x},"velocityX":{discrete_vx}}},"continuous":{{"x":{continuous_x},"velocityX":{continuous_vx},"passed":{}}}}},"stack":{{"maxPositionError":{stack_error},"kineticProxy":{stack_energy}}},"soak":{{"simulationHours":12,"fixedTicks":{soak_ticks},"checksum":"{soak_hash:016x}","finite":{soak_finite},"wallClockSeconds":{soak_wall_seconds},"wallClockQualified":false}}}}"#,
        continuous_x < 0.2
    );
}
