use std::fs::{self, File, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::Engine;
use serde::{Deserialize, Serialize};

const EMBEDDED_MAGIC: &[u8; 8] = b"NOVAPAK!";
const EMBEDDED_FOOTER_BYTES: u64 = 16;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportFile {
    path: String,
    data_base64: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportRequest {
    game_name: String,
    target: String,
    architecture: String,
    package_into_executable: bool,
    development_build: bool,
    output_directory: String,
    pack_base64: String,
    web_files: Vec<ExportFile>,
    run: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportResult {
    output_path: String,
    files: Vec<String>,
    launched: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CrashPayload {
    message: String,
    stack: String,
    project: String,
    scene: String,
    renderer: String,
}

fn decode_base64(value: &str) -> Result<Vec<u8>, String> {
    base64::engine::general_purpose::STANDARD
        .decode(value)
        .map_err(|error| format!("invalid build data: {error}"))
}

fn safe_game_name(value: &str) -> String {
    let filtered: String = value
        .chars()
        .filter(|character| {
            !matches!(
                character,
                '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*'
            ) && !character.is_control()
        })
        .take(80)
        .collect();
    let trimmed = filtered.trim();
    if trimmed.is_empty() {
        "MyGame".into()
    } else {
        trimmed.into()
    }
}

fn default_output_root(game_name: &str) -> PathBuf {
    let home = std::env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" })
        .map(PathBuf::from)
        .unwrap_or_else(|| std::env::temp_dir().join("Nova_A"));
    home.join(if cfg!(windows) { "Documents" } else { "" })
        .join("Nova_A Builds")
        .join(game_name)
}

fn safe_relative_path(path: &str) -> Result<PathBuf, String> {
    let candidate = Path::new(path);
    if candidate.is_absolute()
        || candidate.components().any(|part| {
            matches!(
                part,
                std::path::Component::ParentDir
                    | std::path::Component::RootDir
                    | std::path::Component::Prefix(_)
            )
        })
    {
        return Err(format!("unsafe export path: {path}"));
    }
    Ok(candidate.to_path_buf())
}

fn write_export_file(root: &Path, file: &ExportFile) -> Result<String, String> {
    let relative = safe_relative_path(&file.path)?;
    let destination = root.join(&relative);
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(&destination, decode_base64(&file.data_base64)?)
        .map_err(|error| error.to_string())?;
    Ok(relative.to_string_lossy().replace('\\', "/"))
}

fn append_embedded_package(executable: &Path, pack: &[u8]) -> Result<(), String> {
    let mut file = OpenOptions::new()
        .append(true)
        .open(executable)
        .map_err(|error| error.to_string())?;
    file.write_all(pack).map_err(|error| error.to_string())?;
    file.write_all(EMBEDDED_MAGIC)
        .map_err(|error| error.to_string())?;
    file.write_all(&(pack.len() as u64).to_le_bytes())
        .map_err(|error| error.to_string())?;
    file.flush().map_err(|error| error.to_string())
}

fn embedded_package(executable: &Path) -> Result<Option<Vec<u8>>, String> {
    let mut file = File::open(executable).map_err(|error| error.to_string())?;
    let length = file.metadata().map_err(|error| error.to_string())?.len();
    if length < EMBEDDED_FOOTER_BYTES {
        return Ok(None);
    }
    file.seek(SeekFrom::End(-(EMBEDDED_FOOTER_BYTES as i64)))
        .map_err(|error| error.to_string())?;
    let mut footer = [0_u8; EMBEDDED_FOOTER_BYTES as usize];
    file.read_exact(&mut footer)
        .map_err(|error| error.to_string())?;
    if &footer[..8] != EMBEDDED_MAGIC {
        return Ok(None);
    }
    let pack_length = u64::from_le_bytes(
        footer[8..16]
            .try_into()
            .map_err(|_| "invalid embedded package footer")?,
    );
    if pack_length > length - EMBEDDED_FOOTER_BYTES {
        return Err("embedded Nova package is truncated".into());
    }
    file.seek(SeekFrom::Start(
        length - EMBEDDED_FOOTER_BYTES - pack_length,
    ))
    .map_err(|error| error.to_string())?;
    let mut pack = vec![0_u8; pack_length as usize];
    file.read_exact(&mut pack)
        .map_err(|error| error.to_string())?;
    Ok(Some(pack))
}

fn sidecar_package(executable: &Path) -> Option<PathBuf> {
    let beside = executable.parent()?.join("game.nova-pak");
    beside.is_file().then_some(beside)
}

fn runtime_package_bytes() -> Result<Option<Vec<u8>>, String> {
    let executable = std::env::current_exe().map_err(|error| error.to_string())?;
    if let Some(pack) = embedded_package(&executable)? {
        return Ok(Some(pack));
    }
    sidecar_package(&executable)
        .map(fs::read)
        .transpose()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn runtime_mode() -> Result<bool, String> {
    Ok(runtime_package_bytes()?.is_some())
}

#[tauri::command]
fn runtime_package() -> Result<Option<String>, String> {
    Ok(runtime_package_bytes()?
        .map(|bytes| base64::engine::general_purpose::STANDARD.encode(bytes)))
}

fn copy_directory(source: &Path, destination: &Path) -> Result<(), String> {
    fs::create_dir_all(destination).map_err(|error| error.to_string())?;
    for entry in fs::read_dir(source).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let destination_entry = destination.join(entry.file_name());
        if entry
            .file_type()
            .map_err(|error| error.to_string())?
            .is_dir()
        {
            copy_directory(&entry.path(), &destination_entry)?;
        } else {
            fs::copy(entry.path(), destination_entry).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn export_game(request: ExportRequest) -> Result<ExportResult, String> {
    if request.architecture != "x86_64" {
        return Err("Nova_A 2.3 supports x86_64 exports".into());
    }
    let game_name = safe_game_name(&request.game_name);
    let root = if request.output_directory.trim().is_empty() {
        default_output_root(&game_name)
    } else {
        PathBuf::from(request.output_directory.trim())
    };
    fs::create_dir_all(&root)
        .map_err(|error| format!("could not create output directory: {error}"))?;
    let pack = decode_base64(&request.pack_base64)?;
    let mut files = Vec::new();
    let mut launch_path = None;

    if request.target == "web" {
        for file in &request.web_files {
            files.push(write_export_file(&root, file)?);
        }
        fs::write(root.join("game.nova-pak"), &pack).map_err(|error| error.to_string())?;
        files.push("game.nova-pak".into());
    } else {
        let host = std::env::consts::OS;
        if request.target != host {
            return Err(format!(
                "{} exports must be built on a {} host",
                request.target, request.target
            ));
        }
        let current = std::env::current_exe().map_err(|error| error.to_string())?;
        if host == "macos" {
            if request.package_into_executable {
                return Err(
                    "Single-file export is unavailable for signed macOS app bundles".into(),
                );
            }
            let bundle = current
                .ancestors()
                .find(|path| path.extension().is_some_and(|extension| extension == "app"))
                .ok_or("Nova_A is not running from a macOS app bundle")?;
            let destination = root.join(format!("{game_name}.app"));
            copy_directory(bundle, &destination)?;
            let player = destination
                .join("Contents")
                .join("MacOS")
                .join(bundle.file_stem().unwrap_or_default());
            fs::write(
                player
                    .parent()
                    .unwrap_or(&destination)
                    .join("game.nova-pak"),
                &pack,
            )
            .map_err(|error| error.to_string())?;
            files.push(format!("{game_name}.app"));
            launch_path = Some(destination);
        } else {
            let file_name = if host == "windows" {
                format!("{game_name}.exe")
            } else {
                game_name.clone()
            };
            let destination = root.join(&file_name);
            fs::copy(&current, &destination)
                .map_err(|error| format!("could not copy Nova Player: {error}"))?;
            if request.package_into_executable {
                append_embedded_package(&destination, &pack)?;
            } else {
                fs::write(root.join("game.nova-pak"), &pack).map_err(|error| error.to_string())?;
                files.push("game.nova-pak".into());
            }
            files.push(file_name);
            launch_path = Some(destination);
        }
    }

    if request.development_build {
        fs::write(root.join("build-info.json"), format!("{{\n  \"engineVersion\": \"2.4.0\",\n  \"target\": \"{}\",\n  \"architecture\": \"{}\",\n  \"packageBytes\": {}\n}}", request.target, request.architecture, pack.len())).map_err(|error| error.to_string())?;
        files.push("build-info.json".into());
    }
    let launched = if request.run {
        let path = launch_path.ok_or("Build & Run is available for desktop targets")?;
        if cfg!(target_os = "macos") {
            Command::new("open")
                .arg(&path)
                .spawn()
                .map_err(|error| error.to_string())?;
        } else {
            Command::new(&path)
                .current_dir(&root)
                .spawn()
                .map_err(|error| error.to_string())?;
        }
        true
    } else {
        false
    };
    Ok(ExportResult {
        output_path: root.to_string_lossy().into_owned(),
        files,
        launched,
    })
}

fn logs_directory() -> PathBuf {
    let base = std::env::var_os(if cfg!(windows) { "APPDATA" } else { "HOME" })
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir);
    if cfg!(windows) {
        base.join("Nova_A").join("Logs")
    } else {
        base.join(".local")
            .join("share")
            .join("Nova_A")
            .join("Logs")
    }
}

fn write_log(contents: &str) -> Result<String, String> {
    let directory = logs_directory();
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let path = directory.join(format!("Nova_A-{seconds}.log"));
    fs::write(&path, contents).map_err(|error| error.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
fn write_crash_log(payload: CrashPayload) -> Result<String, String> {
    write_log(&format!("Nova_A version: 2.4.0\nOS: {} {}\nRenderer: {}\nProject: {}\nScene: {}\nError: {}\n\nStack trace:\n{}\n", std::env::consts::OS, std::env::consts::ARCH, payload.renderer, payload.project, payload.scene, payload.message, payload.stack))
}

fn install_panic_logger() {
    std::panic::set_hook(Box::new(|panic| {
        let location = panic
            .location()
            .map(|location| format!("{}:{}", location.file(), location.line()))
            .unwrap_or_else(|| "unknown".into());
        let message = panic
            .payload()
            .downcast_ref::<&str>()
            .copied()
            .or_else(|| panic.payload().downcast_ref::<String>().map(String::as_str))
            .unwrap_or("unknown panic");
        let _ = write_log(&format!(
            "Nova_A version: 2.4.0\nOS: {} {}\nFatal Rust panic at {location}\n{message}\n",
            std::env::consts::OS,
            std::env::consts::ARCH
        ));
    }));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    install_panic_logger();
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            runtime_mode,
            runtime_package,
            export_game,
            write_crash_log
        ])
        .run(tauri::generate_context!())
        .expect("error while running Nova_A");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_package_round_trips_without_changing_payload() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "nova-a-player-test-{}-{unique}.bin",
            std::process::id()
        ));
        fs::write(&path, b"executable-prefix").unwrap();
        let package = b"NOVAPAK\0\x01\0\0\0sample";
        append_embedded_package(&path, package).unwrap();
        assert_eq!(
            embedded_package(&path).unwrap().as_deref(),
            Some(package.as_slice())
        );
        fs::remove_file(path).unwrap();
    }

    #[test]
    fn export_paths_cannot_escape_the_selected_directory() {
        assert!(safe_relative_path("assets/player.js").is_ok());
        assert!(safe_relative_path("../private.txt").is_err());
        assert!(safe_relative_path("C:\\private.txt").is_err());
    }
}
