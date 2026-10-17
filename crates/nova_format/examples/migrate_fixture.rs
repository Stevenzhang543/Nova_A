// 工程迁移命令行示例：读取文件并输出经过校验的当前工程格式。
use std::io::{self, Read};

// 读取标准输入中的工程 JSON，将迁移结果或失败信息写入输出。
fn main() {
    let mut source = String::new();
    io::stdin()
        .read_to_string(&mut source)
        .expect("read project fixture from stdin");
    match nova_format::migrate_project_str(&source) {
        Ok(output) => print!("{output}"),
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(2);
        }
    }
}
