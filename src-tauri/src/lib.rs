use std::collections::{BTreeMap, HashMap};
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::net::{SocketAddr, UdpSocket};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::Engine;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

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
    project_id: String,
    profile: String,
    platform: BuildPlatformOptions,
    delivery: BuildDeliveryOptions,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct BuildPlatformOptions {
    identifier: String,
    version: String,
    icon_asset: Option<String>,
    splash_asset: Option<String>,
    orientation: String,
    permissions: Vec<String>,
    signing_mode: String,
    signing_identity: String,
    notarization_profile: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct BuildDeliveryOptions {
    deterministic: bool,
    incremental: bool,
    compression: String,
    patch_manifest: bool,
    structured_logs: bool,
    crash_reports: bool,
    telemetry_enabled: bool,
    telemetry_endpoint: String,
    privacy_policy_url: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportResult {
    output_path: String,
    files: Vec<String>,
    launched: bool,
    cache_hits: usize,
    changed_files: usize,
    build_id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportCapabilities {
    host: String,
    architecture: String,
    android_available: bool,
    android_reason: String,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct BuildFileRecord {
    path: String,
    sha256: String,
    bytes: u64,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct BuildReport {
    format: String,
    version: u32,
    engine_version: String,
    build_id: String,
    created_at: u64,
    target: String,
    architecture: String,
    profile: String,
    project_id: String,
    files: Vec<BuildFileRecord>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExternalDiffRequest {
    executable: String,
    arguments: String,
    left: String,
    right: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExternalMergeRequest {
    executable: String,
    arguments: String,
    base: String,
    ours: String,
    theirs: String,
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

#[derive(Default)]
struct UdpSockets {
    next_id: AtomicU32,
    sockets: Mutex<HashMap<u32, UdpSocket>>,
}

#[derive(Serialize)]
struct UdpPacket {
    source: String,
    payload: String,
}

#[tauri::command]
fn udp_open(state: tauri::State<'_, UdpSockets>, bind_address: String) -> Result<u32, String> {
    let address: SocketAddr = bind_address
        .parse()
        .map_err(|_| "UDP bind address must be an IP address and port".to_string())?;
    let socket = UdpSocket::bind(address).map_err(|error| error.to_string())?;
    socket
        .set_nonblocking(true)
        .map_err(|error| error.to_string())?;
    let id = state
        .next_id
        .fetch_add(1, Ordering::Relaxed)
        .wrapping_add(1);
    state
        .sockets
        .lock()
        .map_err(|_| "UDP socket state is unavailable".to_string())?
        .insert(id, socket);
    Ok(id)
}

#[tauri::command]
fn udp_send(
    state: tauri::State<'_, UdpSockets>,
    socket_id: u32,
    target: String,
    payload: String,
) -> Result<(), String> {
    if payload.len() > 65_507 {
        return Err("UDP payload exceeds 65,507 bytes".into());
    }
    let address: SocketAddr = target
        .parse()
        .map_err(|_| "UDP target must be an IP address and port".to_string())?;
    let sockets = state
        .sockets
        .lock()
        .map_err(|_| "UDP socket state is unavailable".to_string())?;
    let socket = sockets.get(&socket_id).ok_or("UDP socket is not open")?;
    socket
        .send_to(payload.as_bytes(), address)
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn udp_receive(
    state: tauri::State<'_, UdpSockets>,
    socket_id: u32,
    maximum: usize,
) -> Result<Vec<UdpPacket>, String> {
    let sockets = state
        .sockets
        .lock()
        .map_err(|_| "UDP socket state is unavailable".to_string())?;
    let socket = sockets.get(&socket_id).ok_or("UDP socket is not open")?;
    let mut packets = Vec::new();
    let mut buffer = vec![0_u8; 65_507];
    for _ in 0..maximum.clamp(1, 64) {
        match socket.recv_from(&mut buffer) {
            Ok((length, source)) => packets.push(UdpPacket {
                source: source.to_string(),
                payload: String::from_utf8_lossy(&buffer[..length]).into_owned(),
            }),
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => break,
            Err(error) => return Err(error.to_string()),
        }
    }
    Ok(packets)
}

#[tauri::command]
fn udp_close(state: tauri::State<'_, UdpSockets>, socket_id: u32) -> Result<(), String> {
    state
        .sockets
        .lock()
        .map_err(|_| "UDP socket state is unavailable".to_string())?
        .remove(&socket_id);
    Ok(())
}

fn decode_base64(value: &str) -> Result<Vec<u8>, String> {
    base64::engine::general_purpose::STANDARD
        .decode(value)
        .map_err(|error| format!("invalid build data: {error}"))
}

fn sha256_hex(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn file_hash(path: &Path) -> Result<String, String> {
    let mut file = File::open(path).map_err(|error| error.to_string())?;
    let mut digest = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = file.read(&mut buffer).map_err(|error| error.to_string())?;
        if read == 0 {
            break;
        }
        digest.update(&buffer[..read]);
    }
    Ok(format!("{:x}", digest.finalize()))
}

fn write_incremental(path: &Path, bytes: &[u8], incremental: bool) -> Result<bool, String> {
    if incremental && path.is_file() && file_hash(path)? == sha256_hex(bytes) {
        return Ok(false);
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let temporary = path.with_extension(format!("nova-write-{}", std::process::id()));
    fs::write(&temporary, bytes).map_err(|error| error.to_string())?;
    if path.exists() {
        fs::remove_file(path).map_err(|error| error.to_string())?;
    }
    fs::rename(&temporary, path).map_err(|error| error.to_string())?;
    Ok(true)
}

fn android_template() -> Option<PathBuf> {
    let sdk = std::env::var_os("ANDROID_HOME").or_else(|| std::env::var_os("ANDROID_SDK_ROOT"))?;
    if !Path::new(&sdk).is_dir() || std::env::var_os("JAVA_HOME").is_none() {
        return None;
    }
    let template = std::env::var_os("NOVA_A_ANDROID_TEMPLATE").map(PathBuf::from)?;
    template.is_dir().then_some(template)
}

#[tauri::command]
fn export_capabilities() -> ExportCapabilities {
    let android_available = android_template().is_some();
    ExportCapabilities {
        host: std::env::consts::OS.to_string(),
        architecture: std::env::consts::ARCH.to_string(),
        android_available,
        android_reason: if android_available {
            "Android SDK, JDK, and Nova Android template detected.".into()
        } else {
            "Install the optional Nova Android package, set ANDROID_HOME and JAVA_HOME, and configure NOVA_A_ANDROID_TEMPLATE.".into()
        },
    }
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

fn write_export_file(
    root: &Path,
    file: &ExportFile,
    incremental: bool,
) -> Result<(String, bool), String> {
    let relative = safe_relative_path(&file.path)?;
    let destination = root.join(&relative);
    let changed = write_incremental(
        &destination,
        &decode_base64(&file.data_base64)?,
        incremental,
    )?;
    Ok((relative.to_string_lossy().replace('\\', "/"), changed))
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

fn copy_file_incremental(
    source: &Path,
    destination: &Path,
    incremental: bool,
) -> Result<bool, String> {
    if incremental && destination.is_file() && file_hash(source)? == file_hash(destination)? {
        return Ok(false);
    }
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::copy(source, destination).map_err(|error| error.to_string())?;
    Ok(true)
}

fn tracked_write(
    root: &Path,
    relative: &str,
    bytes: &[u8],
    incremental: bool,
    files: &mut Vec<String>,
    cache_hits: &mut usize,
    changed_files: &mut usize,
) -> Result<(), String> {
    let relative = safe_relative_path(relative)?;
    if write_incremental(&root.join(&relative), bytes, incremental)? {
        *changed_files += 1;
    } else {
        *cache_hits += 1;
    }
    files.push(relative.to_string_lossy().replace('\\', "/"));
    Ok(())
}

fn build_file_records(root: &Path, files: &[String]) -> Result<Vec<BuildFileRecord>, String> {
    let mut records = Vec::new();
    for relative in files {
        let path = root.join(safe_relative_path(relative)?);
        if !path.is_file() {
            continue;
        }
        records.push(BuildFileRecord {
            path: relative.clone(),
            sha256: file_hash(&path)?,
            bytes: path.metadata().map_err(|error| error.to_string())?.len(),
        });
    }
    records.sort_by(|first, second| first.path.cmp(&second.path));
    records.dedup_by(|first, second| first.path == second.path);
    Ok(records)
}

#[tauri::command]
fn export_game(request: ExportRequest) -> Result<ExportResult, String> {
    if !matches!(
        request.target.as_str(),
        "windows" | "linux" | "macos" | "web" | "android"
    ) {
        return Err("unsupported export target".into());
    }
    if !matches!(request.architecture.as_str(), "x86_64" | "aarch64") {
        return Err("unsupported export architecture".into());
    }
    if request.target != "web"
        && request.target != "android"
        && request.architecture != std::env::consts::ARCH
    {
        return Err(format!(
            "{} export requires a matching {} player template",
            request.architecture, request.architecture
        ));
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
    let mut cache_hits = 0_usize;
    let mut changed_files = 0_usize;
    let mut build_digest = Sha256::new();
    build_digest.update(&pack);
    build_digest.update(request.target.as_bytes());
    build_digest.update(request.architecture.as_bytes());
    build_digest.update(request.profile.as_bytes());
    build_digest.update(serde_json::to_vec(&request.platform).map_err(|error| error.to_string())?);
    let build_id = format!("{:x}", build_digest.finalize());
    let previous_report = fs::read(root.join("nova-build-report.json"))
        .ok()
        .and_then(|bytes| serde_json::from_slice::<BuildReport>(&bytes).ok());

    if request.target == "web" {
        for file in &request.web_files {
            if matches!(
                file.path.as_str(),
                "nova-build-report.json" | "nova-patch-manifest.json"
            ) {
                continue;
            }
            let (path, changed) = write_export_file(&root, file, request.delivery.incremental)?;
            files.push(path);
            if changed {
                changed_files += 1
            } else {
                cache_hits += 1
            }
        }
        tracked_write(
            &root,
            "game.nova-pak",
            &pack,
            request.delivery.incremental,
            &mut files,
            &mut cache_hits,
            &mut changed_files,
        )?;
    } else if request.target == "android" {
        let template = android_template()
            .ok_or("Android export requires the SDK/JDK and an installed Nova Android template")?;
        let destination = root.join(format!("{}-android", game_name));
        if destination.exists() && !request.delivery.incremental {
            fs::remove_dir_all(&destination).map_err(|error| error.to_string())?;
        }
        copy_directory(&template, &destination)?;
        let relative = format!("{}-android/app/src/main/assets/game.nova-pak", game_name);
        tracked_write(
            &root,
            &relative,
            &pack,
            request.delivery.incremental,
            &mut files,
            &mut cache_hits,
            &mut changed_files,
        )?;
        files.push(format!("{}-android", game_name));
        changed_files += 1;
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
            write_incremental(
                &player
                    .parent()
                    .unwrap_or(&destination)
                    .join("game.nova-pak"),
                &pack,
                request.delivery.incremental,
            )?;
            files.push(format!("{game_name}.app"));
            changed_files += 1;
            launch_path = Some(destination);
        } else {
            let file_name = if host == "windows" {
                format!("{game_name}.exe")
            } else {
                game_name.clone()
            };
            let destination = root.join(&file_name);
            if request.package_into_executable {
                fs::copy(&current, &destination)
                    .map_err(|error| format!("could not copy Nova Player: {error}"))?;
                append_embedded_package(&destination, &pack)?;
                changed_files += 1;
            } else {
                if copy_file_incremental(&current, &destination, request.delivery.incremental)? {
                    changed_files += 1
                } else {
                    cache_hits += 1
                }
                tracked_write(
                    &root,
                    "game.nova-pak",
                    &pack,
                    request.delivery.incremental,
                    &mut files,
                    &mut cache_hits,
                    &mut changed_files,
                )?;
            }
            files.push(file_name);
            launch_path = Some(destination);
        }
    }

    let platform_config = serde_json::to_vec_pretty(&serde_json::json!({
        "format": "nova-platform-config", "version": 1, "engineVersion": "3.0.0",
        "target": request.target, "architecture": request.architecture, "profile": request.profile,
        "application": request.platform, "structuredLogs": request.delivery.structured_logs,
        "crashCapture": request.delivery.crash_reports,
        "telemetry": { "enabled": request.delivery.telemetry_enabled, "endpoint": request.delivery.telemetry_endpoint, "privacyPolicy": request.delivery.privacy_policy_url }
    })).map_err(|error| error.to_string())?;
    tracked_write(
        &root,
        "nova-platform-config.json",
        &platform_config,
        request.delivery.incremental,
        &mut files,
        &mut cache_hits,
        &mut changed_files,
    )?;
    if request.development_build {
        let build_info = serde_json::to_vec_pretty(&serde_json::json!({ "engineVersion": "3.0.0", "buildId": build_id, "target": request.target, "architecture": request.architecture, "packageBytes": pack.len() })).map_err(|error| error.to_string())?;
        tracked_write(
            &root,
            "build-info.json",
            &build_info,
            request.delivery.incremental,
            &mut files,
            &mut cache_hits,
            &mut changed_files,
        )?;
    }
    if request.delivery.crash_reports {
        let symbols = serde_json::to_vec_pretty(&serde_json::json!({
            "format": "nova-symbol-map", "version": 1, "engineVersion": "3.0.0", "buildId": build_id,
            "binary": files.iter().find(|path| path.ends_with(".exe") || path.ends_with(".app")).cloned(),
            "workflow": "Archive matching PDB, dSYM, or unstripped ELF symbols under this build ID; symbolicate crash addresses with the platform toolchain."
        })).map_err(|error| error.to_string())?;
        tracked_write(
            &root,
            "symbols/nova-symbol-map.json",
            &symbols,
            request.delivery.incremental,
            &mut files,
            &mut cache_hits,
            &mut changed_files,
        )?;
    }

    let records = build_file_records(&root, &files)?;
    let current_by_path: BTreeMap<_, _> = records
        .iter()
        .map(|record| (record.path.clone(), record.sha256.clone()))
        .collect();
    let previous_by_path: BTreeMap<_, _> = previous_report
        .as_ref()
        .map(|report| {
            report
                .files
                .iter()
                .map(|record| (record.path.clone(), record.sha256.clone()))
                .collect()
        })
        .unwrap_or_default();
    let added: Vec<_> = current_by_path
        .keys()
        .filter(|path| !previous_by_path.contains_key(*path))
        .cloned()
        .collect();
    let changed: Vec<_> = current_by_path
        .iter()
        .filter(|(path, hash)| {
            previous_by_path
                .get(*path)
                .is_some_and(|previous| previous != *hash)
        })
        .map(|(path, _)| path.clone())
        .collect();
    let removed: Vec<_> = previous_by_path
        .keys()
        .filter(|path| !current_by_path.contains_key(*path))
        .cloned()
        .collect();
    for relative in &removed {
        let path = root.join(safe_relative_path(relative)?);
        if path.is_file() {
            fs::remove_file(path).map_err(|error| error.to_string())?;
            changed_files += 1;
        }
    }
    if request.delivery.patch_manifest {
        let patch = serde_json::to_vec_pretty(&serde_json::json!({ "format": "nova-patch-manifest", "version": 1, "fromBuild": previous_report.as_ref().map(|report| &report.build_id), "toBuild": build_id, "added": added, "changed": changed, "removed": removed, "files": records })).map_err(|error| error.to_string())?;
        tracked_write(
            &root,
            "nova-patch-manifest.json",
            &patch,
            request.delivery.incremental,
            &mut files,
            &mut cache_hits,
            &mut changed_files,
        )?;
    }
    let report = BuildReport {
        format: "nova-build-report".into(),
        version: 1,
        engine_version: "3.0.0".into(),
        build_id: build_id.clone(),
        created_at: if request.delivery.deterministic {
            0
        } else {
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()
        },
        target: request.target.clone(),
        architecture: request.architecture.clone(),
        profile: request.profile.clone(),
        project_id: request.project_id.clone(),
        files: records,
    };
    let report_bytes = serde_json::to_vec_pretty(&report).map_err(|error| error.to_string())?;
    tracked_write(
        &root,
        "nova-build-report.json",
        &report_bytes,
        request.delivery.incremental,
        &mut files,
        &mut cache_hits,
        &mut changed_files,
    )?;
    tracked_write(
        &root,
        ".nova-build-cache/manifest.json",
        &report_bytes,
        request.delivery.incremental,
        &mut files,
        &mut cache_hits,
        &mut changed_files,
    )?;
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
        cache_hits,
        changed_files,
        build_id,
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

#[tauri::command]
fn open_external_diff(request: ExternalDiffRequest) -> Result<(), String> {
    if request.executable.trim().is_empty() || request.executable.len() > 1_024 {
        return Err("Choose a bounded external diff executable path".into());
    }
    let left = decode_base64(&request.left)?;
    let right = decode_base64(&request.right)?;
    if left.len() > 64 * 1024 * 1024 || right.len() > 64 * 1024 * 1024 {
        return Err("External diff snapshots are limited to 64 MiB each".into());
    }
    let directory = external_tool_directory("diff")?;
    let left_path = directory.join("project.saved.nova");
    let right_path = directory.join("project.current.nova");
    fs::write(&left_path, left).map_err(|error| error.to_string())?;
    fs::write(&right_path, right).map_err(|error| error.to_string())?;
    let arguments = request
        .arguments
        .split_whitespace()
        .take(128)
        .map(|argument| {
            argument
                .replace("{left}", &left_path.to_string_lossy())
                .replace("{right}", &right_path.to_string_lossy())
        });
    Command::new(request.executable.trim())
        .args(arguments)
        .spawn()
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn external_tool_directory(label: &str) -> Result<PathBuf, String> {
    let root = std::env::temp_dir().join("Nova_A");
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    let expiry = SystemTime::now()
        .checked_sub(std::time::Duration::from_secs(24 * 60 * 60))
        .unwrap_or(UNIX_EPOCH);
    if let Ok(entries) = fs::read_dir(&root) {
        for entry in entries.flatten().take(512) {
            if entry.file_type().is_ok_and(|kind| kind.is_dir())
                && entry
                    .metadata()
                    .and_then(|metadata| metadata.modified())
                    .is_ok_and(|modified| modified < expiry)
            {
                let _ = fs::remove_dir_all(entry.path());
            }
        }
    }
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let directory = root.join(format!("{label}-{}-{unique}", std::process::id()));
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory)
}

#[tauri::command]
fn open_external_merge(request: ExternalMergeRequest) -> Result<(), String> {
    if request.executable.trim().is_empty() || request.executable.len() > 1_024 {
        return Err("Choose a bounded external merge executable path".into());
    }
    let base = decode_base64(&request.base)?;
    let ours = decode_base64(&request.ours)?;
    let theirs = decode_base64(&request.theirs)?;
    if [base.len(), ours.len(), theirs.len()]
        .into_iter()
        .any(|length| length > 64 * 1024 * 1024)
    {
        return Err("External merge snapshots are limited to 64 MiB each".into());
    }
    let directory = external_tool_directory("merge")?;
    let base_path = directory.join("project.base.nova");
    let ours_path = directory.join("project.ours.nova");
    let theirs_path = directory.join("project.theirs.nova");
    let output_path = directory.join("project.merged.nova");
    fs::write(&base_path, base).map_err(|error| error.to_string())?;
    fs::write(&ours_path, &ours).map_err(|error| error.to_string())?;
    fs::write(&theirs_path, theirs).map_err(|error| error.to_string())?;
    fs::write(&output_path, ours).map_err(|error| error.to_string())?;
    let arguments = request
        .arguments
        .split_whitespace()
        .take(128)
        .map(|argument| {
            argument
                .replace("{base}", &base_path.to_string_lossy())
                .replace("{ours}", &ours_path.to_string_lossy())
                .replace("{theirs}", &theirs_path.to_string_lossy())
                .replace("{output}", &output_path.to_string_lossy())
        });
    Command::new(request.executable.trim())
        .args(arguments)
        .spawn()
        .map_err(|error| error.to_string())?;
    Ok(())
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
    write_log(&format!("Nova_A version: 3.0.0\nOS: {} {}\nRenderer: {}\nProject: {}\nScene: {}\nError: {}\n\nStack trace:\n{}\n", std::env::consts::OS, std::env::consts::ARCH, payload.renderer, payload.project, payload.scene, payload.message, payload.stack))
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
            "Nova_A version: 3.0.0\nOS: {} {}\nFatal Rust panic at {location}\n{message}\n",
            std::env::consts::OS,
            std::env::consts::ARCH
        ));
    }));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    install_panic_logger();
    tauri::Builder::default()
        .manage(UdpSockets::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            runtime_mode,
            runtime_package,
            export_capabilities,
            export_game,
            open_external_diff,
            open_external_merge,
            write_crash_log,
            udp_open,
            udp_send,
            udp_receive,
            udp_close
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

    #[test]
    fn incremental_writer_skips_identical_content_and_replaces_changes() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = std::env::temp_dir().join(format!(
            "nova-a-incremental-test-{}-{unique}",
            std::process::id()
        ));
        let path = directory.join("nested/build.dat");
        assert!(write_incremental(&path, b"first", true).unwrap());
        assert!(!write_incremental(&path, b"first", true).unwrap());
        assert!(write_incremental(&path, b"second", true).unwrap());
        assert_eq!(fs::read(&path).unwrap(), b"second");
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn build_hashes_are_stable_and_sensitive_to_content() {
        assert_eq!(sha256_hex(b"Nova_A"), sha256_hex(b"Nova_A"));
        assert_ne!(sha256_hex(b"Nova_A"), sha256_hex(b"Nova_B"));
    }
}
