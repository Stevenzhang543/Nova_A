// 脚本桥接示例：从标准输入读取请求，在原生沙箱执行并输出结构化结果。
use nova_script::{ScriptContext, ScriptRuntime};
use serde::Deserialize;
use std::io::{self, Read};

#[derive(Deserialize)]
struct Request {
    source: String,
    function: Option<String>,
    context: Option<ScriptContext>,
}

// 解析标准输入请求，执行脚本沙箱并把结构化结果写入标准输出。
fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let result = (/* 解析桥接请求，执行指定回调或只校验脚本，并统一返回结构化成功或错误。 */|| -> Result<serde_json::Value, String> {
        let request: Request = serde_json::from_str(&input).map_err(
            /* 将底层错误转换为字符串，保留错误信息供上层返回。 */
            |error| error.to_string(),
        )?;
        let runtime = ScriptRuntime::new();
        if let Some(function) = request.function {
            serde_json::to_value(runtime.execute(
                &request.source,
                &function,
                request.context.unwrap_or_default(),
            )?)
            .map_err(
                /* 将底层错误转换为字符串，保留错误信息供上层返回。 */
                |error| error.to_string(),
            )
        } else {
            serde_json::to_value(runtime.validate(&request.source)?).map_err(
                /* 将底层错误转换为字符串，保留错误信息供上层返回。 */
                |error| error.to_string(),
            )
        }
    })();
    match result {
        Ok(value) => println!("{}", serde_json::json!({"value": value})),
        Err(error) => println!("{}", serde_json::json!({"error": error})),
    }
}
