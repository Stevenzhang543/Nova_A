use std::io::{self, Read};

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
