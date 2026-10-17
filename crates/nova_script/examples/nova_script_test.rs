// Rhai 测试命令行：发现测试、解析元数据、执行沙箱并生成 JSON/JUnit 结果。
use std::collections::{BTreeMap, BTreeSet};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::ExitCode;
use std::time::Instant;

use nova_script::{EventSnapshot, ScriptContext, ScriptRuntime, TimeSnapshot};
use serde::Serialize;
use serde_json::json;

#[derive(Clone, Debug, Default)]
struct TestMetadata {
    skip: bool,
    timeout_ms: u128,
    tags: Vec<String>,
    seed: u64,
    cases: Vec<String>,
    fixture: String,
    retries: u8,
    flaky_infrastructure: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TestResult {
    file: String,
    name: String,
    case_name: String,
    status: &'static str,
    duration_ms: f64,
    seed: u64,
    tags: Vec<String>,
    fixture: String,
    attempt: u8,
    message: String,
}

struct TestSuite {
    runtime: ScriptRuntime,
    context: ScriptContext,
    functions: BTreeSet<String>,
    callback_counts: BTreeMap<String, usize>,
    initialized: bool,
    attempted: bool,
    error: Option<String>,
}

impl TestSuite {
    // 创建测试沙箱及确定性的初始上下文，并登记已发现的脚本函数。
    fn new(functions: BTreeSet<String>) -> Self {
        Self {
            runtime: ScriptRuntime::new(),
            context: ScriptContext {
                entity: "test-entity".into(),
                entity_name: "Headless test".into(),
                random_seed: 1,
                time: TimeSnapshot {
                    fixed_delta: 1.0 / 60.0,
                    scale: 1.0,
                    ..TimeSnapshot::default()
                },
                ..ScriptContext::default()
            },
            functions,
            callback_counts: BTreeMap::new(),
            initialized: false,
            attempted: false,
            error: None,
        }
    }

    // 在测试宿主中执行回调并累计诊断或错误。
    fn invoke(&mut self, callback: &str, context: &mut ScriptContext) -> Result<(), String> {
        if !self.functions.contains(callback) {
            return Ok(());
        }
        *self.callback_counts.entry(callback.into()).or_default() += 1;
        let execution = self
            .runtime
            .execute_cached("suite", callback, context.clone())?;
        context.properties = execution.properties;
        if let Some(log) = execution.logs.iter().find(
            /* 判断 log . level == "error" 是否成立，供过滤或有效性检查使用。 */
            |log| log.level == "error",
        ) {
            return Err(log.message.clone());
        }
        Ok(())
    }

    // 从测试脚本初始化生命周期和测试宿主状态。
    fn initialize(&mut self, source: &str) {
        if self.attempted {
            return;
        }
        self.attempted = true;
        if let Err(error) = self.runtime.upsert("suite", source) {
            self.error = Some(error);
            return;
        }
        self.initialized = true;
        let mut context = self.context.clone();
        if let Err(error) = self.invoke("before_all", &mut context) {
            self.error = Some(format!("before_all: {error}"));
        }
        self.context = context;
    }

    // 完成测试宿主的生命周期清理，并报告收尾错误。
    fn finish(&mut self) -> Result<(), String> {
        if !self.initialized {
            return Ok(());
        }
        let mut context = self.context.clone();
        self.invoke("after_all", &mut context)
    }
}

// 执行测试命令行，并区分通过、测试失败及执行错误的退出码。
fn main() -> ExitCode {
    match run() {
        Ok(failed) => ExitCode::from(if failed { 1 } else { 0 }),
        Err(error) => {
            eprintln!("nova-script-test: {error}");
            ExitCode::from(2)
        }
    }
}

// 解析测试命令行参数，发现并执行测试，写出报告并返回失败状态。
fn run() -> Result<bool, String> {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.iter().any(
        /* 判断 value == "--help" 是否成立，供过滤或有效性检查使用。 */
        |value| value == "--help",
    ) {
        println!("Nova_A Rhai test runner v2\n\n  cargo run -p nova_script --example nova_script_test -- [path ...] [--format json|junit] [--output report] [--coverage-output coverage.json] [--tag name] [--changed path1,path2] [--shard-index n --shard-count n] [--include-skipped]\n\n  Metadata: // @test tags=unit fixture=name timeout=1000 seed=42 cases=a|b retries=2 flaky=infrastructure\n  Retries are ignored unless flaky=infrastructure is explicit.");
        return Ok(false);
    }
    let option = /* 判断 args . windows (2) . find (| pair | pair [0] == name) . map (| pair | pair [1] . clone ()) 是否成立，供过滤或有效性检查使用。 */ |name: &str| {
        args.windows(2)
            .find(/* 判断 pair [0] == name 是否成立，供过滤或有效性检查使用。 */ |pair| pair[0] == name)
            .map(/* 复制 pair [1] . clone () 的结果，避免向调用方暴露可变宿主引用。 */ |pair| pair[1].clone())
    };
    let format = option("--format").unwrap_or_else(
        /* 计算并返回 "json" . into ()，用于当前 run 流程。 */ || "json".into(),
    );
    if !matches!(format.as_str(), "json" | "junit") {
        return Err("--format must be json or junit".into());
    }
    let output = option("--output").map(PathBuf::from);
    let coverage_output = option("--coverage-output").map(PathBuf::from);
    let required_tag = option("--tag");
    let changed: BTreeSet<String> = option("--changed")
        .unwrap_or_default()
        .split(',')
        .filter(
            /* 判断 ! value . is_empty () 是否成立，供过滤或有效性检查使用。 */
            |value| !value.is_empty(),
        )
        .map(
            /* 计算并返回 value . replace ('\\' , "/")，用于当前 run 流程。 */
            |value| value.replace('\\', "/"),
        )
        .collect();
    let shard_count = option("--shard-count")
        .and_then(
            /* 判断 value . parse :: < u64 > () . ok () 是否成立，供过滤或有效性检查使用。 */
            |value| value.parse::<u64>().ok(),
        )
        .unwrap_or(1)
        .clamp(1, 256);
    let shard_index = option("--shard-index")
        .and_then(
            /* 判断 value . parse :: < u64 > () . ok () 是否成立，供过滤或有效性检查使用。 */
            |value| value.parse::<u64>().ok(),
        )
        .unwrap_or(0)
        .min(shard_count - 1);
    let include_skipped = args.iter().any(
        /* 判断 value == "--include-skipped" 是否成立，供过滤或有效性检查使用。 */
        |value| value == "--include-skipped",
    );
    let paths: Vec<PathBuf> = args
        .iter()
        .enumerate()
        .filter(
            /* 只接收位置参数作为脚本路径，排除选项及其后续取值。 */
            |(index, value)| {
                !value.starts_with('-')
                    && (*index == 0
                        || !matches!(
                            args[*index - 1].as_str(),
                            "--format"
                                | "--output"
                                | "--coverage-output"
                                | "--tag"
                                | "--changed"
                                | "--shard-index"
                                | "--shard-count"
                        ))
            },
        )
        .map(
            /* 计算并返回 PathBuf :: from (value)，用于当前 run 流程。 */
            |(_, value)| PathBuf::from(value),
        )
        .collect();
    let paths = if paths.is_empty() {
        vec![PathBuf::from("Assets/Scripts")]
    } else {
        paths
    };
    let mut files = Vec::new();
    for path in paths {
        collect_scripts(&path, &mut files)?;
    }
    files.sort();
    files.dedup();
    if files.is_empty() {
        return Err("no .rhai files found".into());
    }

    let started = Instant::now();
    let mut results = Vec::new();
    let mut coverage_files = Vec::new();
    let mut suite_reports = Vec::new();
    for path in files {
        let normalized_path = path.display().to_string().replace('\\', "/");
        if !changed.is_empty()
            && !changed
                .iter()
                .any(/* 判断 normalized_path . ends_with (item) || normalized_path . contains (item) 是否成立，供过滤或有效性检查使用。 */ |item| normalized_path.ends_with(item) || normalized_path.contains(item))
        {
            continue;
        }
        let source = fs::read_to_string(&path).map_err(
            /* 构造错误消息，保留{}: {error}。 */
            |error| format!("{}: {error}", path.display()),
        )?;
        let executable_functions = match ScriptRuntime::new().function_names(&source) {
            Ok(names) => names.into_iter().collect::<BTreeSet<_>>(),
            Err(error) => {
                results.push(TestResult {
                    file: path.display().to_string(),
                    name: "compile".into(),
                    case_name: String::new(),
                    status: "failed",
                    duration_ms: 0.0,
                    seed: 1,
                    tags: vec![],
                    fixture: String::new(),
                    attempt: 1,
                    message: error.clone(),
                });
                suite_reports.push(json!({"file":normalized_path,"initialized":false,"callbackCounts":{},"error":error}));
                continue;
            }
        };
        let tests = discover_tests(&source, &executable_functions);
        let mut suite = TestSuite::new(executable_functions.clone());
        for (name, metadata) in tests {
            if stable_hash(&format!("{}::{name}", path.display())) % shard_count != shard_index {
                continue;
            }
            if required_tag.as_ref().is_some_and(
                /* 判断 ! metadata . tags . contains (tag) 是否成立，供过滤或有效性检查使用。 */
                |tag| !metadata.tags.contains(tag),
            ) {
                continue;
            }
            let cases = if metadata.cases.is_empty() {
                vec![String::new()]
            } else {
                metadata.cases.clone()
            };
            for case_name in cases {
                if metadata.skip && !include_skipped {
                    results.push(TestResult {
                        file: path.display().to_string(),
                        name: name.clone(),
                        case_name,
                        status: "skipped",
                        duration_ms: 0.0,
                        seed: metadata.seed,
                        tags: metadata.tags.clone(),
                        fixture: metadata.fixture.clone(),
                        attempt: 1,
                        message: "Skipped by @test metadata".into(),
                    });
                    continue;
                }
                suite.initialize(&source);
                let mut result = run_test(&path, &mut suite, &name, &case_name, &metadata, 1);
                if metadata.flaky_infrastructure {
                    for attempt in 2..=metadata.retries.saturating_add(1) {
                        if !matches!(result.status, "failed" | "timeout") {
                            break;
                        }
                        result = run_test(&path, &mut suite, &name, &case_name, &metadata, attempt);
                    }
                }
                results.push(result);
            }
        }
        if let Err(error) = suite.finish() {
            results.push(TestResult {
                file: path.display().to_string(),
                name: "after_all".into(),
                case_name: String::new(),
                status: "failed",
                duration_ms: 0.0,
                seed: 1,
                tags: vec![],
                fixture: String::new(),
                attempt: 1,
                message: format!("after_all: {error}"),
            });
        }
        let covered_functions: BTreeSet<_> = suite.callback_counts.keys().cloned().collect();
        suite_reports.push(json!({"file":normalized_path,"initialized":suite.initialized,"callbackCounts":suite.callback_counts}));
        coverage_files.push(json!({"file":normalized_path,"executableFunctions":executable_functions,"coveredFunctions":covered_functions}));
    }
    let passed = results
        .iter()
        .filter(
            /* 判断 result . status == "passed" 是否成立，供过滤或有效性检查使用。 */
            |result| result.status == "passed",
        )
        .count();
    let failed = results
        .iter()
        .filter(/* 判断 result . status == "failed" || result . status == "timeout" 是否成立，供过滤或有效性检查使用。 */ |result| result.status == "failed" || result.status == "timeout")
        .count();
    let skipped = results
        .iter()
        .filter(
            /* 判断 result . status == "skipped" 是否成立，供过滤或有效性检查使用。 */
            |result| result.status == "skipped",
        )
        .count();
    let report = if format == "junit" {
        junit(&results, started.elapsed().as_secs_f64())
    } else {
        serde_json::to_string_pretty(&json!({
        "format": "nova-script-test-report", "version": 2, "engineVersion": env!("CARGO_PKG_VERSION"),
        "durationMs": started.elapsed().as_secs_f64() * 1_000.0, "shard":{"index":shard_index,"count":shard_count}, "changed":changed,
        "passed": passed, "failed": failed, "skipped": skipped, "results": results, "suites": suite_reports
    })).map_err(/* 将底层错误转换为字符串，保留错误信息供上层返回。 */ |error| error.to_string())?
    };
    if let Some(path) = output {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(
                /* 将底层错误转换为字符串，保留错误信息供上层返回。 */
                |error| error.to_string(),
            )?;
        }
        fs::write(path, format!("{report}\n")).map_err(
            /* 将底层错误转换为字符串，保留错误信息供上层返回。 */
            |error| error.to_string(),
        )?;
    } else {
        println!("{report}");
    }
    if let Some(path) = coverage_output {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(
                /* 将底层错误转换为字符串，保留错误信息供上层返回。 */
                |error| error.to_string(),
            )?;
        }
        let executable: usize = coverage_files
            .iter()
            .map(/* 按 file ["executableFunctions"] . as_array () . map_or (0 , Vec :: len) 读取或转换可选值，保留转换失败分支。 */ |file| file["executableFunctions"].as_array().map_or(0, Vec::len))
            .sum();
        let covered: usize = coverage_files
            .iter()
            .map(/* 按 file ["coveredFunctions"] . as_array () . map_or (0 , Vec :: len) 读取或转换可选值，保留转换失败分支。 */ |file| file["coveredFunctions"].as_array().map_or(0, Vec::len))
            .sum();
        let coverage = json!({"format":"nova-rhai-coverage","version":2,"engineVersion":env!("CARGO_PKG_VERSION"),"functionRate":if executable == 0 {1.0} else {covered as f64 / executable as f64},"files":coverage_files});
        fs::write(
            path,
            format!(
                "{}\n",
                serde_json::to_string_pretty(&coverage).map_err(
                    /* 把报告序列化错误转换为命令行可返回的文本。 */
                    |error| error.to_string()
                )?
            ),
        )
        .map_err(
            /* 将底层错误转换为字符串，保留错误信息供上层返回。 */
            |error| error.to_string(),
        )?;
    }
    Ok(failed > 0)
}

// 计算稳定字符串哈希，使测试身份和随机种子可复现。
fn stable_hash(value: &str) -> u64 {
    value.bytes().fold(2_166_136_261_u64, /* 计算并返回 (hash ^ u64 :: from (byte)) . wrapping_mul (16_777_619)，用于当前 stable_hash 流程。 */ |hash, byte| {
        (hash ^ u64::from(byte)).wrapping_mul(16_777_619)
    })
}

// 递归收集待执行脚本路径，保留错误传播。
fn collect_scripts(path: &Path, output: &mut Vec<PathBuf>) -> Result<(), String> {
    if path.is_file() {
        if path.extension().and_then(
            /* 计算并返回 value . to_str ()，用于当前 collect_scripts 流程。 */
            |value| value.to_str(),
        ) == Some("rhai")
        {
            output.push(path.to_path_buf());
        }
        return Ok(());
    }
    if !path.exists() {
        return Err(format!("path does not exist: {}", path.display()));
    }
    for entry in fs::read_dir(path).map_err(
        /* 将底层错误转换为字符串，保留错误信息供上层返回。 */
        |error| error.to_string(),
    )? {
        collect_scripts(
            &entry
                .map_err(
                    /* 将底层错误转换为字符串，保留错误信息供上层返回。 */
                    |error| error.to_string(),
                )?
                .path(),
            output,
        )?;
    }
    Ok(())
}

// 结合已编译函数名与源码元数据发现测试入口。
fn discover_tests(source: &str, functions: &BTreeSet<String>) -> Vec<(String, TestMetadata)> {
    let mut pending = None;
    let mut metadata = BTreeMap::new();
    let masked = mask_test_literals(source);
    for line in masked.lines() {
        let clean = line.trim();
        if let Some(fields) = clean.strip_prefix("// @test") {
            pending = Some(parse_metadata(fields));
            continue;
        }
        let Some(rest) = clean.strip_prefix("fn ") else {
            continue;
        };
        let Some(name) = rest.split('(').next() else {
            continue;
        };
        let name = name.trim();
        if functions.contains(name) {
            if let Some(value) = pending.take() {
                metadata.insert(name.to_owned(), value);
            }
        }
    }
    functions
        .iter()
        .filter(/* 计算并返回 name . starts_with ("test_")，用于当前 discover_tests 流程。 */ |name| name.starts_with("test_"))
        .map(/* 为发现的函数配对显式测试元数据；缺省使用十秒超时和固定种子。 */ |name| {
            (
                name.clone(),
                metadata.remove(name).unwrap_or_else(/* 计算并返回 TestMetadata { timeout_ms : 10_000 , seed : 1 , .. TestMetadata :: default ()，用于当前 discover_tests 流程。 */ || TestMetadata {
                    timeout_ms: 10_000,
                    seed: 1,
                    ..TestMetadata::default()
                }),
            )
        })
        .collect()
}

// Preserve genuine line metadata while hiding function-looking text inside
// strings and nested block comments. Rhai itself remains the syntax authority.
// 遮蔽字符串和注释，避免把其中的文本误识别为测试声明。
fn mask_test_literals(source: &str) -> String {
    let bytes = source.as_bytes();
    let mut output = bytes.to_vec();
    let mut at = 0;
    let mut depth = 0_u32;
    let mut quote = None;
    while at < bytes.len() {
        let pair = bytes.get(at..at + 2);
        if depth > 0 {
            if pair == Some(b"/*") {
                depth += 1;
                output[at] = b' ';
                output[at + 1] = b' ';
                at += 2;
                continue;
            }
            if pair == Some(b"*/") {
                depth -= 1;
                output[at] = b' ';
                output[at + 1] = b' ';
                at += 2;
                continue;
            }
            if bytes[at] != b'\n' && bytes[at] != b'\r' {
                output[at] = b' ';
            }
        } else if let Some(delimiter) = quote {
            if bytes[at] != b'\n' && bytes[at] != b'\r' {
                output[at] = b' ';
            }
            if bytes[at] == b'\\' && at + 1 < bytes.len() {
                at += 1;
                if bytes[at] != b'\n' && bytes[at] != b'\r' {
                    output[at] = b' ';
                }
            } else if bytes[at] == delimiter {
                quote = None;
            }
        } else if pair == Some(b"//") {
            while at < bytes.len() && bytes[at] != b'\n' {
                at += 1;
            }
            continue;
        } else if pair == Some(b"/*") {
            depth = 1;
            output[at] = b' ';
            output[at + 1] = b' ';
            at += 2;
            continue;
        } else if matches!(bytes[at], b'"' | b'\'' | b'`') {
            quote = Some(bytes[at]);
            output[at] = b' ';
        }
        at += 1;
    }
    String::from_utf8(output)
        .expect("Masked UTF-8 source retains only untouched UTF-8 or ASCII spaces")
}

// 解析测试标签、超时和种子等执行元数据。
fn parse_metadata(fields: &str) -> TestMetadata {
    let values: BTreeMap<_, _> = fields
        .split_whitespace()
        .map(/* 计算并返回 field . split_once ('=') . unwrap_or ((field , "true"))，用于当前 parse_metadata 流程。 */ |field| field.split_once('=').unwrap_or((field, "true")))
        .collect();
    TestMetadata {
        skip: values.get("skip").copied() == Some("true"),
        timeout_ms: values
            .get("timeout")
            .and_then(/* 按 value . parse () . ok () 读取或转换可选值，保留转换失败分支。 */ |value| value.parse().ok())
            .unwrap_or(10_000)
            .clamp(1, 120_000),
        tags: values
            .get("tags")
            .map(/* 判断 value . split (',') . filter (| value | ! value . is_empty ()) . take (32) . map (str :: to_owned) . collect () 是否成立，供过滤或有效性检查使用。 */ |value| {
                value
                    .split(',')
                    .filter(/* 判断 ! value . is_empty () 是否成立，供过滤或有效性检查使用。 */ |value| !value.is_empty())
                    .take(32)
                    .map(str::to_owned)
                    .collect()
            })
            .unwrap_or_default(),
        seed: values
            .get("seed")
            .and_then(/* 按 value . parse () . ok () 读取或转换可选值，保留转换失败分支。 */ |value| value.parse().ok())
            .unwrap_or(1),
        cases: values
            .get("cases")
            .map(/* 判断 value . split ('|') . filter (| value | ! value . is_empty ()) . take (128) . map (str :: to_owned) . collect () 是否成立，供过滤或有效性检查使用。 */ |value| {
                value
                    .split('|')
                    .filter(/* 判断 ! value . is_empty () 是否成立，供过滤或有效性检查使用。 */ |value| !value.is_empty())
                    .take(128)
                    .map(str::to_owned)
                    .collect()
            })
            .unwrap_or_default(),
        fixture: values
            .get("fixture")
            .copied()
            .unwrap_or_default()
            .chars()
            .take(128)
            .collect(),
        retries: values
            .get("retries")
            .and_then(/* 按 value . parse () . ok () 读取或转换可选值，保留转换失败分支。 */ |value| value.parse().ok())
            .unwrap_or(0)
            .min(3),
        flaky_infrastructure: values.get("flaky").copied() == Some("infrastructure")
            || values.get("flakyInfrastructure").copied() == Some("true"),
    }
}

// 按测试配置执行沙箱入口并记录通过、失败与耗时。
fn run_test(
    path: &Path,
    suite: &mut TestSuite,
    name: &str,
    case_name: &str,
    metadata: &TestMetadata,
    attempt: u8,
) -> TestResult {
    let started = Instant::now();
    let mut context = suite.context.clone();
    context.random_seed = metadata.seed;
    context.event = Some(EventSnapshot {
        name: "test.run".into(),
        source: "nova-script-test".into(),
        payload: json!({"test":name,"case":case_name,"seed":metadata.seed}),
    });
    let mut failures = Vec::new();
    if let Some(error) = &suite.error {
        failures.push(error.clone());
    } else {
        for callback in ["before_each", name] {
            if let Err(error) = suite.invoke(callback, &mut context) {
                failures.push(error);
                break;
            }
            if started.elapsed().as_millis() > metadata.timeout_ms {
                failures.push(format!("Timed out after {} ms", metadata.timeout_ms));
                break;
            }
        }
        // Test failures and timeout checks cannot bypass per-case cleanup.
        if let Err(error) = suite.invoke("after_each", &mut context) {
            failures.push(format!("after_each: {error}"));
        }
    }
    let duration_ms = started.elapsed().as_secs_f64() * 1_000.0;
    let timeout = duration_ms > metadata.timeout_ms as f64;
    TestResult {
        file: path.display().to_string(),
        name: name.into(),
        case_name: case_name.into(),
        status: if timeout {
            "timeout"
        } else if !failures.is_empty() {
            "failed"
        } else {
            "passed"
        },
        duration_ms,
        seed: metadata.seed,
        tags: metadata.tags.clone(),
        fixture: metadata.fixture.clone(),
        attempt,
        message: if failures.is_empty() {
            format!("Passed with deterministic seed {}", metadata.seed)
        } else {
            failures.join(" | ")
        },
    }
}

// 转义 XML 特殊字符，保护测试报告结构。
fn xml(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}
// 把测试结果序列化为 JUnit XML，并包含耗时与失败信息。
fn junit(results: &[TestResult], duration: f64) -> String {
    let failures = results
        .iter()
        .filter(/* 判断 matches ! (result . status , "failed" | "timeout") 是否成立，供过滤或有效性检查使用。 */ |result| matches!(result.status, "failed" | "timeout"))
        .count();
    let cases = results
        .iter()
        .map(
            /* 将单个测试结果转换为转义后的 JUnit testcase，包含参数案例、耗时与失败信息。 */
            |result| {
                format!(
                    "<testcase classname=\"{}\" name=\"{}{}\" time=\"{:.6}\">{}{}</testcase>",
                    xml(&result.file),
                    xml(&result.name),
                    if result.case_name.is_empty() {
                        String::new()
                    } else {
                        format!(" [{}]", xml(&result.case_name))
                    },
                    result.duration_ms / 1_000.0,
                    if result.status == "skipped" {
                        "<skipped/>".into()
                    } else {
                        String::new()
                    },
                    if matches!(result.status, "failed" | "timeout") {
                        format!("<failure message=\"{}\"/>", xml(&result.message))
                    } else {
                        String::new()
                    }
                )
            },
        )
        .collect::<String>();
    format!("<?xml version=\"1.0\" encoding=\"UTF-8\"?><testsuite name=\"Nova_A Rhai\" tests=\"{}\" failures=\"{}\" time=\"{duration:.6}\">{cases}</testsuite>", results.len(), failures)
}
