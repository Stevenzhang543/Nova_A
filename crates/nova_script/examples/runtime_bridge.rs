use nova_script::{ScriptContext, ScriptRuntime};
use serde::Deserialize;
use std::io::{self, Read};

#[derive(Deserialize)]
struct Request {
    source: String,
    function: Option<String>,
    context: Option<ScriptContext>,
}

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let result = (|| -> Result<serde_json::Value, String> {
        let request: Request = serde_json::from_str(&input).map_err(|error| error.to_string())?;
        let runtime = ScriptRuntime::new();
        if let Some(function) = request.function {
            serde_json::to_value(runtime.execute(
                &request.source,
                &function,
                request.context.unwrap_or_default(),
            )?)
            .map_err(|error| error.to_string())
        } else {
            serde_json::to_value(runtime.validate(&request.source)?)
                .map_err(|error| error.to_string())
        }
    })();
    match result {
        Ok(value) => println!("{}", serde_json::json!({"value": value})),
        Err(error) => println!("{}", serde_json::json!({"error": error})),
    }
}
