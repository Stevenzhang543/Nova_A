// 无窗口原生物理命令宿主：有界 JSONL 标准输入输出，不创建 WebView 或网络监听。
use nova_physics::{PhysicsQueryRequest2D, COLLIDER_CHILD_STRIDE, CONNECTION_STRIDE, STRIDE};
use nova_runtime::{FixedTimeSettings, RuntimeWorld};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{
    collections::HashSet,
    io::{self, BufRead, Read, Write},
};
const LINE_LIMIT: usize = 65_536;
const BODY_LIMIT: usize = 256;
const CONNECTION_LIMIT: usize = 512;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Request {
    id: u64,
    command: Command,
}
#[derive(Deserialize)]
#[serde(tag = "op", rename_all = "snake_case", deny_unknown_fields)]
enum Command {
    Hello {},
    Configure {
        tick_rate: f64,
    },
    UpsertBody {
        handle: u32,
        order: u32,
        record: Vec<f64>,
    },
    DestroyBody {
        handle: u32,
    },
    Colliders {
        handle: u32,
        records: Vec<f64>,
    },
    UpsertConnection {
        handle: u32,
        order: u32,
        record: Vec<f64>,
    },
    DestroyConnection {
        handle: u32,
    },
    Step {
        ticks: u32,
        gravity: f64,
        air_friction: f64,
    },
    Query {
        query: PhysicsQueryRequest2D,
    },
    Snapshot {},
    Reset {},
    Shutdown {},
}
struct Host {
    world: RuntimeWorld,
    bodies: HashSet<u32>,
    connections: HashSet<u32>,
    last_id: Option<u64>,
    pending_configuration: bool,
}
impl Host {
    // 每个进程独占物理世界和请求序列，不共享或隐式恢复旧会话。
    fn new() -> Self {
        Self {
            world: RuntimeWorld::new(),
            bodies: HashSet::new(),
            connections: HashSet::new(),
            last_id: None,
            pending_configuration: false,
        }
    }
    // 只允许有限且有界的记录值，先验证再向真实运行时提交。
    fn records(values: &[f64], size: usize) -> Result<(), String> {
        if values.len() != size
            || values.iter().any(
                /* 拒绝不能安全参与求解的值。 */
                |v| !v.is_finite() || v.abs() > 1e9,
            )
        {
            return Err("RECORD_INVALID: wrong stride or out-of-range number".into());
        }
        Ok(())
    }
    // 返回观察快照；这不是完整 VM／接触缓存／随机数状态的可恢复回滚镜像。
    fn snapshot(&self) -> Value {
        json!({"time":self.world.time(),"diagnostics":self.world.diagnostics(),"configurationPending":self.pending_configuration,"state":if self.pending_configuration {&[][..]}else{self.world.physics().state()},"checksum":if self.pending_configuration {None}else{Some(self.world.physics().state_checksum().to_string())},"snapshotKind":"physics-observation-not-rollback"})
    }
    // 按严格递增序号执行单一所有者请求，失败不得自动重放非幂等步进。
    fn execute(&mut self, request: Request) -> Result<(Value, bool), String> {
        if self.last_id.is_some_and(
            /* 拒绝重复或乱序命令以免重复推进世界。 */
            |id| request.id <= id,
        ) {
            return Err("REQUEST_ORDER: id must increase".into());
        }
        let (value, stop) = match request.command {
            Command::Hello {} => (
                json!({"engineVersion":env!("CARGO_PKG_VERSION"),"protocol":"nova-native-physics-jsonl","protocolVersion":1,"transport":"stdio","renderer":false,"webview":false,"projectLoader":false,"scriptHost":false,"networkServer":false,"bodyStride":STRIDE,"connectionStride":CONNECTION_STRIDE,"limits":{"lineBytes":LINE_LIMIT,"bodies":BODY_LIMIT,"connections":CONNECTION_LIMIT,"ticksPerCommand":120}}),
                false,
            ),
            Command::Configure { tick_rate } => {
                if !tick_rate.is_finite() || !(1.0..=1000.0).contains(&tick_rate) {
                    return Err("TIMING_INVALID".into());
                }
                self.world.set_timing(FixedTimeSettings {
                    tick_rate,
                    ..Default::default()
                });
                (json!({"tickRate":tick_rate}), false)
            }
            Command::UpsertBody {
                handle,
                order,
                record,
            } => {
                Self::records(&record, STRIDE)?;
                if !self.bodies.contains(&handle) && self.bodies.len() >= BODY_LIMIT {
                    return Err("BODY_LIMIT".into());
                }
                let changed = self
                    .world
                    .upsert_body(handle, order, &record)
                    .map_err(str::to_owned)?;
                self.bodies.insert(handle);
                self.pending_configuration |= changed;
                (json!({"changed":changed}), false)
            }
            Command::DestroyBody { handle } => {
                self.pending_configuration |= self.bodies.remove(&handle);
                (json!({"removed":self.world.destroy_body(handle)}), false)
            }
            Command::Colliders { handle, records } => {
                if !self.bodies.contains(&handle)
                    || records.len() > 16 * COLLIDER_CHILD_STRIDE
                    || records.len() % COLLIDER_CHILD_STRIDE != 0
                {
                    return Err("COLLIDERS_INVALID".into());
                }
                Self::records(&records, records.len())?;
                let changed = self
                    .world
                    .upsert_collider_shapes(handle, &records)
                    .map_err(str::to_owned)?;
                self.pending_configuration |= changed;
                (json!({"changed":changed}), false)
            }
            Command::UpsertConnection {
                handle,
                order,
                record,
            } => {
                Self::records(&record, CONNECTION_STRIDE)?;
                if !self.connections.contains(&handle) && self.connections.len() >= CONNECTION_LIMIT
                {
                    return Err("CONNECTION_LIMIT".into());
                }
                let changed = self
                    .world
                    .upsert_connection(handle, order, &record)
                    .map_err(str::to_owned)?;
                self.connections.insert(handle);
                self.pending_configuration |= changed;
                (json!({"changed":changed}), false)
            }
            Command::DestroyConnection { handle } => {
                self.pending_configuration |= self.connections.remove(&handle);
                (
                    json!({"removed":self.world.destroy_connection(handle)}),
                    false,
                )
            }
            Command::Step {
                ticks,
                gravity,
                air_friction,
            } => {
                if !(1..=120).contains(&ticks)
                    || !gravity.is_finite()
                    || gravity.abs() > 1e6
                    || !air_friction.is_finite()
                    || !(0.0..=1e6).contains(&air_friction)
                {
                    return Err("STEP_INVALID".into());
                }
                for _ in 0..ticks {
                    self.world.single_step(gravity, air_friction);
                    self.world.drain_events();
                }
                self.pending_configuration = false;
                (self.snapshot(), false)
            }
            Command::Query { query } => {
                if self.pending_configuration {
                    return Err("STEP_REQUIRED: pending configuration".into());
                }
                (
                    serde_json::to_value(self.world.query_filtered(&query).map_err(str::to_owned)?)
                        .map_err(
                            /* 保留序列化失败的准确原因。 */ |e| e.to_string(),
                        )?,
                    false,
                )
            }
            Command::Snapshot {} => (self.snapshot(), false),
            Command::Reset {} => {
                self.world = RuntimeWorld::new();
                self.bodies.clear();
                self.connections.clear();
                self.pending_configuration = false;
                (self.snapshot(), false)
            }
            Command::Shutdown {} => (json!({"shutdown":true}), true),
        };
        self.last_id = Some(request.id);
        self.world.drain_events();
        Ok((value, stop))
    }
}
// 固定64KiB输入上限；EOF正常退出，超长行终止会话而不是无限积累内存。
fn serve() -> Result<(), String> {
    let mut host = Host::new();
    let stdin = io::stdin();
    let mut input = stdin.lock();
    let stdout = io::stdout();
    let mut output = stdout.lock();
    loop {
        let mut line = Vec::new();
        let length = (&mut input)
            .take((LINE_LIMIT + 1) as u64)
            .read_until(b'\n', &mut line)
            .map_err(
                /* 把输入故障传到进程退出诊断。 */ |e| e.to_string(),
            )?;
        if length == 0 {
            break;
        }
        if length > LINE_LIMIT {
            return Err("LINE_LIMIT: session closed before command execution".into());
        }
        let mut stop = false;
        let response = match serde_json::from_slice::<Request>(&line) {
            Ok(request) => {
                let id = request.id;
                match host.execute(request) {
                    Ok((result, shutdown)) => {
                        stop = shutdown;
                        json!({"id":id,"ok":true,"result":result})
                    }
                    Err(error) => json!({"id":id,"ok":false,"error":error}),
                }
            }
            Err(error) => json!({"id":null,"ok":false,"error":format!("REQUEST_INVALID: {error}")}),
        };
        serde_json::to_writer(&mut output, &response).map_err(
            /* 写端关闭时结束宿主，不继续占用资源。 */ |e| e.to_string(),
        )?;
        writeln!(output).map_err(
            /* 报告标准输出写入错误。 */ |e| e.to_string(),
        )?;
        output.flush().map_err(
            /* 每条响应立即可供客户端读取。 */ |e| e.to_string(),
        )?;
        if stop {
            break;
        }
    }
    Ok(())
}
// 仅显式stdio模式启动服务；帮助／版本不加载任何GUI或系统媒体依赖。
fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    match args.as_slice(){[flag] if flag=="--stdio"=>{if let Err(error)=serve(){eprintln!("{error}");std::process::exit(2)}},[flag] if flag=="--version"=>println!("nova_headless {}",env!("CARGO_PKG_VERSION")),[]=>println!("nova_headless --stdio | --version\nBounded native physics JSONL; no WebView, project loader, script host or network listener."),_=>{eprintln!("Unknown arguments; use --stdio or --version");std::process::exit(2)}}
}
