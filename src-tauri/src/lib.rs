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

const EMBEDDED_LEGACY_MAGIC: &[u8; 8] = b"NOVAPAK!";
const EMBEDDED_MAGIC: &[u8; 8] = b"NOVAPK2!";
const EMBEDDED_LEGACY_FOOTER_BYTES: u64 = 16;
const EMBEDDED_FOOTER_BYTES: u64 = 48;
const MAX_EMBEDDED_PACKAGE_BYTES: u64 = 1024 * 1024 * 1024;
const MAX_WEB_EXPORT_FILES: usize = 20_000;
const MAX_WEB_EXPORT_FILE_BYTES: u64 = 256 * 1024 * 1024;
const MAX_WEB_EXPORT_TOTAL_BYTES: u64 = 2 * 1024 * 1024 * 1024;
const ENGINE_VERSION: &str = env!("CARGO_PKG_VERSION");

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
    #[serde(default)]
    manifest_asset: Option<String>,
    #[serde(default)]
    version_metadata: BTreeMap<String, String>,
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
    #[serde(default)]
    cache_mode: String,
    #[serde(default)]
    include: Vec<String>,
    #[serde(default)]
    exclude: Vec<String>,
    #[serde(default)]
    strip_unused_assets: bool,
    #[serde(default)]
    size_report: bool,
    #[serde(default)]
    dependency_report: bool,
    #[serde(default)]
    debug_symbols: bool,
    #[serde(default)]
    crash_symbols: bool,
    #[serde(default)]
    release_channel: String,
    #[serde(default)]
    export_template: String,
    #[serde(default)]
    provenance: bool,
    #[serde(default)]
    sbom: bool,
    #[serde(default)]
    web_headers: bool,
    #[serde(default)]
    deployment_mode: String,
    #[serde(default)]
    deployment_destination: String,
    #[serde(default)]
    signing_hook: String,
    #[serde(default)]
    notarization_hook: String,
    #[serde(default)]
    clean_machine_job: bool,
    #[serde(default = "default_true")]
    content_cache: bool,
    #[serde(default = "default_true")]
    delta_builds: bool,
    #[serde(default = "default_ci_matrix_version")]
    ci_matrix_version: u32,
    #[serde(default)]
    deployment_connector_id: String,
    #[serde(default)]
    deployment_permission_granted: bool,
}

fn default_true() -> bool {
    true
}
fn default_ci_matrix_version() -> u32 {
    1
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
    #[serde(default)]
    cache_mode: String,
    #[serde(default)]
    total_bytes: u64,
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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectTransactionFile {
    path: String,
    data_base64: String,
    checksum: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectTransactionRequest {
    project_directory: String,
    transaction_id: String,
    files: Vec<ProjectTransactionFile>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectTransactionResult {
    transaction_id: String,
    committed_files: usize,
    committed_bytes: u64,
    journal_path: String,
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

fn decode_base64_limited(value: &str, maximum: u64, label: &str) -> Result<Vec<u8>, String> {
    let estimated = (value.len() as u64)
        .checked_add(3)
        .and_then(|length| length.checked_div(4))
        .and_then(|groups| groups.checked_mul(3))
        .ok_or_else(|| format!("{label} size overflow"))?;
    if estimated > maximum.saturating_add(2) {
        return Err(format!("{label} exceeds the {} byte safety limit", maximum));
    }
    let decoded = decode_base64(value)?;
    if decoded.len() as u64 > maximum {
        return Err(format!("{label} exceeds the {} byte safety limit", maximum));
    }
    Ok(decoded)
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
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let temporary = path.with_extension(format!("nova-write-{}-{nonce}", std::process::id()));
    fs::write(&temporary, bytes).map_err(|error| error.to_string())?;
    if !path.exists() {
        return fs::rename(&temporary, path)
            .map(|_| true)
            .map_err(|error| error.to_string());
    }
    if !path.is_file() {
        let _ = fs::remove_file(&temporary);
        return Err(format!("build output is not a replaceable file: {}", path.display()));
    }
    let backup = path.with_extension(format!("nova-backup-{}-{nonce}", std::process::id()));
    fs::rename(path, &backup).map_err(|error| {
        let _ = fs::remove_file(&temporary);
        format!("could not stage the previous build output: {error}")
    })?;
    if let Err(error) = fs::rename(&temporary, path) {
        let _ = fs::rename(&backup, path);
        let _ = fs::remove_file(&temporary);
        return Err(format!("atomic build replacement failed; the previous output was restored: {error}"));
    }
    let _ = fs::remove_file(backup);
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
            String::new()
        } else {
            "Android export requires JDK 17, Android SDK/NDK, and a validated NOVA_A_ANDROID_TEMPLATE directory."
                .into()
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

#[tauri::command]
fn commit_project_transaction(
    request: ProjectTransactionRequest,
) -> Result<ProjectTransactionResult, String> {
    if request.files.is_empty() || request.files.len() > 20_000 {
        return Err("project transaction must contain between 1 and 20,000 files".into());
    }
    let transaction_id: String = request
        .transaction_id
        .chars()
        .filter(|value| value.is_ascii_alphanumeric() || *value == '-')
        .take(80)
        .collect();
    if transaction_id.is_empty() {
        return Err("project transaction ID is invalid".into());
    }
    let root = PathBuf::from(&request.project_directory);
    if !root.is_absolute() {
        return Err("project transaction directory must be absolute".into());
    }
    fs::create_dir_all(&root).map_err(|error| format!("permission preflight failed: {error}"))?;
    let root = root
        .canonicalize()
        .map_err(|error| format!("project path preflight failed: {error}"))?;
    let transaction_root = root
        .join(".nova")
        .join("transactions")
        .join(&transaction_id);
    let staging = transaction_root.join("staging");
    let backup = transaction_root.join("backup");
    fs::create_dir_all(&staging)
        .map_err(|error| format!("transaction staging preflight failed: {error}"))?;
    fs::create_dir_all(&backup)
        .map_err(|error| format!("transaction backup preflight failed: {error}"))?;
    let journal_path = transaction_root.join("journal.json");
    let manifest: Vec<serde_json::Value> = request
        .files
        .iter()
        .map(|file| serde_json::json!({"path":file.path,"checksum":file.checksum}))
        .collect();
    fs::write(&journal_path, serde_json::to_vec_pretty(&serde_json::json!({"format":"nova-native-project-transaction","version":1,"transactionId":transaction_id,"phase":"prepared","files":manifest})).map_err(|error| error.to_string())?).map_err(|error| error.to_string())?;
    let mut staged = Vec::with_capacity(request.files.len());
    let mut total_bytes = 0_u64;
    for item in &request.files {
        let relative = safe_relative_path(&item.path)?;
        let bytes = decode_base64(&item.data_base64)?;
        total_bytes = total_bytes
            .checked_add(bytes.len() as u64)
            .ok_or("transaction size overflow")?;
        if total_bytes > 2 * 1024 * 1024 * 1024 {
            return Err("project transaction exceeds the 2 GiB safety limit".into());
        }
        if sha256_hex(&bytes) != item.checksum.to_ascii_lowercase() {
            return Err(format!("checksum preflight failed for {}", item.path));
        }
        let staged_path = staging.join(&relative);
        if let Some(parent) = staged_path.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        fs::write(&staged_path, &bytes)
            .map_err(|error| format!("staging write failed for {}: {error}", item.path))?;
        if file_hash(&staged_path)? != item.checksum.to_ascii_lowercase() {
            return Err(format!("staged checksum failed for {}", item.path));
        }
        staged.push((relative, staged_path));
    }
    fs::write(&journal_path, serde_json::to_vec_pretty(&serde_json::json!({"format":"nova-native-project-transaction","version":1,"transactionId":transaction_id,"phase":"committing","files":manifest})).map_err(|error| error.to_string())?).map_err(|error| error.to_string())?;
    let mut committed: Vec<(PathBuf, Option<PathBuf>)> = Vec::new();
    for (relative, staged_path) in &staged {
        let destination = root.join(relative);
        if let Some(parent) = destination.parent() {
            if let Err(error) = fs::create_dir_all(parent) {
                rollback_project_files(&committed);
                return Err(format!("destination preflight failed: {error}"));
            }
        }
        let previous = if destination.exists() {
            let previous = backup.join(relative);
            if let Some(parent) = previous.parent() {
                if let Err(error) = fs::create_dir_all(parent) {
                    rollback_project_files(&committed);
                    return Err(format!("backup preflight failed: {error}"));
                }
            }
            if let Err(error) = fs::rename(&destination, &previous) {
                rollback_project_files(&committed);
                return Err(format!(
                    "file-in-use or antivirus delay at {}: {error}",
                    relative.display()
                ));
            }
            Some(previous)
        } else {
            None
        };
        if let Err(error) = fs::rename(staged_path, &destination) {
            if let Some(previous) = &previous {
                let _ = fs::rename(previous, &destination);
            }
            rollback_project_files(&committed);
            return Err(format!(
                "atomic replacement failed at {}: {error}",
                relative.display()
            ));
        }
        committed.push((destination, previous));
    }
    let committed_journal = serde_json::to_vec_pretty(&serde_json::json!({"format":"nova-native-project-transaction","version":1,"transactionId":transaction_id,"phase":"committed","files":manifest,"bytes":total_bytes})).map_err(|error| error.to_string())?;
    if let Err(error) = fs::write(&journal_path, committed_journal) {
        rollback_project_files(&committed);
        return Err(format!(
            "commit journal finalization failed; project rolled back: {error}"
        ));
    }
    Ok(ProjectTransactionResult {
        transaction_id,
        committed_files: committed.len(),
        committed_bytes: total_bytes,
        journal_path: journal_path.to_string_lossy().into_owned(),
    })
}

fn rollback_project_files(committed: &[(PathBuf, Option<PathBuf>)]) {
    for (destination, previous) in committed.iter().rev() {
        let _ = fs::remove_file(destination);
        if let Some(previous) = previous {
            let _ = fs::rename(previous, destination);
        }
    }
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
    if pack.is_empty() {
        return Err("cannot embed an empty Nova package".into());
    }
    if pack.len() as u64 > MAX_EMBEDDED_PACKAGE_BYTES {
        return Err("embedded Nova packages are limited to 1 GiB".into());
    }
    let digest = Sha256::digest(pack);
    let mut file = OpenOptions::new()
        .append(true)
        .open(executable)
        .map_err(|error| error.to_string())?;
    file.write_all(pack).map_err(|error| error.to_string())?;
    file.write_all(EMBEDDED_MAGIC)
        .map_err(|error| error.to_string())?;
    file.write_all(&(pack.len() as u64).to_le_bytes())
        .map_err(|error| error.to_string())?;
    file.write_all(&digest).map_err(|error| error.to_string())?;
    file.flush().map_err(|error| error.to_string())
}

fn embedded_package(executable: &Path) -> Result<Option<Vec<u8>>, String> {
    let mut file = File::open(executable).map_err(|error| error.to_string())?;
    let length = file.metadata().map_err(|error| error.to_string())?.len();
    if length < EMBEDDED_LEGACY_FOOTER_BYTES {
        return Ok(None);
    }
    let (footer_bytes, pack_length, expected_hash) = if length >= EMBEDDED_FOOTER_BYTES {
        file.seek(SeekFrom::End(-(EMBEDDED_FOOTER_BYTES as i64)))
            .map_err(|error| error.to_string())?;
        let mut footer = [0_u8; EMBEDDED_FOOTER_BYTES as usize];
        file.read_exact(&mut footer)
            .map_err(|error| error.to_string())?;
        if &footer[..8] == EMBEDDED_MAGIC {
            let pack_length = u64::from_le_bytes(
                footer[8..16]
                    .try_into()
                    .map_err(|_| "invalid embedded package footer")?,
            );
            (
                EMBEDDED_FOOTER_BYTES,
                pack_length,
                Some(footer[16..48].to_vec()),
            )
        } else {
            file.seek(SeekFrom::End(-(EMBEDDED_LEGACY_FOOTER_BYTES as i64)))
                .map_err(|error| error.to_string())?;
            let mut legacy = [0_u8; EMBEDDED_LEGACY_FOOTER_BYTES as usize];
            file.read_exact(&mut legacy)
                .map_err(|error| error.to_string())?;
            if &legacy[..8] != EMBEDDED_LEGACY_MAGIC {
                return Ok(None);
            }
            let pack_length = u64::from_le_bytes(
                legacy[8..16]
                    .try_into()
                    .map_err(|_| "invalid legacy embedded package footer")?,
            );
            (EMBEDDED_LEGACY_FOOTER_BYTES, pack_length, None)
        }
    } else {
        file.seek(SeekFrom::End(-(EMBEDDED_LEGACY_FOOTER_BYTES as i64)))
            .map_err(|error| error.to_string())?;
        let mut legacy = [0_u8; EMBEDDED_LEGACY_FOOTER_BYTES as usize];
        file.read_exact(&mut legacy)
            .map_err(|error| error.to_string())?;
        if &legacy[..8] != EMBEDDED_LEGACY_MAGIC {
            return Ok(None);
        }
        let pack_length = u64::from_le_bytes(
            legacy[8..16]
                .try_into()
                .map_err(|_| "invalid legacy embedded package footer")?,
        );
        (EMBEDDED_LEGACY_FOOTER_BYTES, pack_length, None)
    };
    if pack_length == 0 || pack_length > MAX_EMBEDDED_PACKAGE_BYTES {
        return Err("embedded Nova package has an invalid size".into());
    }
    if pack_length > length - footer_bytes {
        return Err("embedded Nova package is truncated".into());
    }
    file.seek(SeekFrom::Start(length - footer_bytes - pack_length))
        .map_err(|error| error.to_string())?;
    let mut pack = vec![0_u8; pack_length as usize];
    file.read_exact(&mut pack)
        .map_err(|error| error.to_string())?;
    if expected_hash.is_some_and(|expected| Sha256::digest(&pack)[..] != expected[..]) {
        return Err("embedded Nova package failed its SHA-256 integrity check".into());
    }
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

fn player_staging_path(destination: &Path, build_id: &str) -> PathBuf {
    let parent = destination.parent().unwrap_or_else(|| Path::new("."));
    let stem = destination
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("NovaPlayer");
    let suffix = &build_id[..build_id.len().min(12)];
    parent.join(format!(".{stem}.{suffix}.{}.nova-staging", std::process::id()))
}

fn locked_player_fallback(destination: &Path, build_id: &str, attempt: usize) -> PathBuf {
    let parent = destination.parent().unwrap_or_else(|| Path::new("."));
    let stem = destination
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("NovaPlayer");
    let extension = destination
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| format!(".{value}"))
        .unwrap_or_default();
    let suffix = &build_id[..build_id.len().min(8)];
    let counter = if attempt == 0 {
        String::new()
    } else {
        format!("-{attempt}")
    };
    parent.join(format!("{stem}-{suffix}{counter}{extension}"))
}

/// Publishes a self-contained player without ever modifying the previous
/// executable in place. Windows keeps running executables locked, so a build-ID
/// filename is used when the preferred output cannot be replaced. The editor
/// must not terminate a game the creator launched independently.
fn publish_embedded_player(
    source: &Path,
    preferred_destination: &Path,
    pack: &[u8],
    build_id: &str,
) -> Result<PathBuf, String> {
    if let Some(parent) = preferred_destination.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("could not create the game output directory: {error}"))?;
    }
    let staging = player_staging_path(preferred_destination, build_id);
    if staging.exists() {
        fs::remove_file(&staging).map_err(|error| {
            format!("could not clear the previous Nova Player staging file: {error}")
        })?;
    }
    fs::copy(source, &staging).map_err(|error| {
        format!(
            "could not stage Nova Player in the selected output directory: {error}. Check folder permissions and available disk space"
        )
    })?;
    if let Err(error) = append_embedded_package(&staging, pack) {
        let _ = fs::remove_file(&staging);
        return Err(error);
    }

    if !preferred_destination.exists() {
        fs::rename(&staging, preferred_destination).map_err(|error| {
            let _ = fs::remove_file(&staging);
            format!("could not publish Nova Player: {error}")
        })?;
        return Ok(preferred_destination.to_path_buf());
    }

    let staged_hash = file_hash(&staging)?;
    if file_hash(preferred_destination).ok().as_deref() == Some(staged_hash.as_str()) {
        fs::remove_file(&staging).map_err(|error| error.to_string())?;
        return Ok(preferred_destination.to_path_buf());
    }

    match fs::remove_file(preferred_destination) {
        Ok(()) => {
            fs::rename(&staging, preferred_destination).map_err(|error| {
                let _ = fs::remove_file(&staging);
                format!("could not publish Nova Player after replacing the previous build: {error}")
            })?;
            Ok(preferred_destination.to_path_buf())
        }
        Err(replace_error) => {
            for attempt in 0..100 {
                let fallback = locked_player_fallback(preferred_destination, build_id, attempt);
                if fallback.exists() {
                    if file_hash(&fallback).ok().as_deref() == Some(staged_hash.as_str()) {
                        let _ = fs::remove_file(&staging);
                        return Ok(fallback);
                    }
                    continue;
                }
                match fs::rename(&staging, &fallback) {
                    Ok(()) => return Ok(fallback),
                    Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
                    Err(error) => {
                        let _ = fs::remove_file(&staging);
                        return Err(format!(
                            "the previous game is locked ({replace_error}) and Nova_A could not publish a versioned fallback: {error}"
                        ));
                    }
                }
            }
            let _ = fs::remove_file(&staging);
            Err(format!(
                "the previous game is locked ({replace_error}); close old game builds or choose another output directory"
            ))
        }
    }
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
    if request.web_files.len() > MAX_WEB_EXPORT_FILES {
        return Err(format!("web export contains more than {MAX_WEB_EXPORT_FILES} files"));
    }
    if request.project_id.len() > 160 || request.profile.len() > 32 {
        return Err("export request metadata exceeds its safety limit".into());
    }
    let game_name = safe_game_name(&request.game_name);
    let root = if request.output_directory.trim().is_empty() {
        default_output_root(&game_name)
    } else {
        let selected = PathBuf::from(request.output_directory.trim());
        if !selected.is_absolute() {
            return Err("export output directory must be an absolute path".into());
        }
        selected
    };
    let pack = decode_base64_limited(
        &request.pack_base64,
        MAX_EMBEDDED_PACKAGE_BYTES,
        "game package",
    )?;
    if pack.is_empty() {
        return Err("game package cannot be empty".into());
    }
    let mut decoded_web_bytes = 0_u64;
    for file in &request.web_files {
        let estimated = (file.data_base64.len() as u64)
            .checked_add(3)
            .and_then(|length| length.checked_div(4))
            .and_then(|groups| groups.checked_mul(3))
            .ok_or("web export size overflow")?;
        if estimated > MAX_WEB_EXPORT_FILE_BYTES.saturating_add(2) {
            return Err(format!("web export file {} exceeds its safety limit", file.path));
        }
        decoded_web_bytes = decoded_web_bytes
            .checked_add(estimated)
            .ok_or("web export total size overflow")?;
        if decoded_web_bytes > MAX_WEB_EXPORT_TOTAL_BYTES {
            return Err("web export exceeds the 2 GiB safety limit".into());
        }
        safe_relative_path(&file.path)?;
    }
    fs::create_dir_all(&root)
        .map_err(|error| format!("could not create output directory: {error}"))?;
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
    let mut previous_report = fs::read(root.join("nova-build-report.json"))
        .ok()
        .and_then(|bytes| serde_json::from_slice::<BuildReport>(&bytes).ok());
    let mut cache_invalidated = Vec::new();
    if request.delivery.cache_mode == "validate" {
        if let Some(previous) = previous_report.as_ref() {
            for record in &previous.files {
                let path = root.join(safe_relative_path(&record.path)?);
                if !path.is_file() || file_hash(&path)? != record.sha256 {
                    cache_invalidated.push(record.path.clone());
                }
            }
        }
        if !cache_invalidated.is_empty() {
            previous_report = None;
        }
    }

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
            let mut file_name = if host == "windows" {
                format!("{game_name}.exe")
            } else {
                game_name.clone()
            };
            let mut destination = root.join(&file_name);
            if destination == current {
                return Err("the game output cannot overwrite the running Nova_A editor".into());
            }
            if request.package_into_executable {
                destination = publish_embedded_player(&current, &destination, &pack, &build_id)?;
                file_name = destination
                    .file_name()
                    .and_then(|value| value.to_str())
                    .unwrap_or(&file_name)
                    .to_string();
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
        "format": "nova-platform-config", "version": 1, "engineVersion": ENGINE_VERSION,
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
        let build_info = serde_json::to_vec_pretty(&serde_json::json!({ "engineVersion": ENGINE_VERSION, "buildId": build_id, "target": request.target, "architecture": request.architecture, "packageBytes": pack.len() })).map_err(|error| error.to_string())?;
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
    if request.delivery.crash_symbols || request.delivery.debug_symbols {
        let symbols = serde_json::to_vec_pretty(&serde_json::json!({
            "format": "nova-symbol-map", "version": 1, "engineVersion": ENGINE_VERSION, "buildId": build_id,
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

    let cache_diagnostics = serde_json::to_vec_pretty(&serde_json::json!({ "format": "nova-build-cache-diagnostics", "version": 1, "engineVersion": ENGINE_VERSION, "mode": request.delivery.cache_mode, "status": if cache_invalidated.is_empty() { "valid" } else { "invalidated" }, "invalidated": cache_invalidated })).map_err(|error| error.to_string())?;
    tracked_write(
        &root,
        "nova-build-cache-diagnostics.json",
        &cache_diagnostics,
        request.delivery.incremental,
        &mut files,
        &mut cache_hits,
        &mut changed_files,
    )?;
    let mut records = build_file_records(&root, &files)?;
    if request.delivery.size_report {
        let total_bytes: u64 = records.iter().map(|record| record.bytes).sum();
        let size_report = serde_json::to_vec_pretty(&serde_json::json!({ "format": "nova-build-size-report", "version": 1, "engineVersion": ENGINE_VERSION, "totalBytes": total_bytes, "files": records })).map_err(|error| error.to_string())?;
        tracked_write(
            &root,
            "nova-build-size-report.json",
            &size_report,
            request.delivery.incremental,
            &mut files,
            &mut cache_hits,
            &mut changed_files,
        )?;
    }
    if request.delivery.dependency_report {
        let dependency_report = serde_json::to_vec_pretty(&serde_json::json!({ "format": "nova-dependency-report", "version": 1, "engineVersion": ENGINE_VERSION, "package": { "path": "game.nova-pak", "sha256": sha256_hex(&pack), "bytes": pack.len() }, "application": request.platform.identifier, "permissions": request.platform.permissions, "contentPolicy": { "include": request.delivery.include, "exclude": request.delivery.exclude, "stripUnusedAssets": request.delivery.strip_unused_assets } })).map_err(|error| error.to_string())?;
        tracked_write(
            &root,
            "nova-dependency-report.json",
            &dependency_report,
            request.delivery.incremental,
            &mut files,
            &mut cache_hits,
            &mut changed_files,
        )?;
    }
    records = build_file_records(&root, &files)?;
    let content_manifest = serde_json::to_vec_pretty(&serde_json::json!({
        "format": "nova-content-manifest", "version": 1, "engineVersion": ENGINE_VERSION, "buildId": build_id,
        "include": request.delivery.include, "exclude": request.delivery.exclude,
        "stripUnusedAssets": request.delivery.strip_unused_assets, "compression": request.delivery.compression,
        "files": records
    })).map_err(|error| error.to_string())?;
    tracked_write(
        &root,
        "nova-content-manifest.json",
        &content_manifest,
        request.delivery.incremental,
        &mut files,
        &mut cache_hits,
        &mut changed_files,
    )?;
    records = build_file_records(&root, &files)?;
    let output_digest = {
        let mut digest = Sha256::new();
        for record in &records {
            digest.update(record.path.as_bytes());
            digest.update(record.sha256.as_bytes());
            digest.update(record.bytes.to_le_bytes());
        }
        format!("{:x}", digest.finalize())
    };
    if request.delivery.provenance {
        let provenance = serde_json::to_vec_pretty(&serde_json::json!({
            "format": "nova-build-provenance", "version": 1, "engineVersion": ENGINE_VERSION, "buildId": build_id,
            "projectId": request.project_id, "target": request.target, "architecture": request.architecture,
            "profile": request.profile, "releaseChannel": request.delivery.release_channel,
            "exportTemplate": request.delivery.export_template, "inputsHash": build_id, "outputsHash": output_digest,
            "deterministic": request.delivery.deterministic, "sourceCommit": "working-tree",
            "toolchain": { "builder": "Nova_A Desktop Export 1", "host": std::env::consts::OS, "architecture": std::env::consts::ARCH },
            "generatedAt": if request.delivery.deterministic { "1970-01-01T00:00:00.000Z" } else { "runtime" },
            "files": records
        })).map_err(|error| error.to_string())?;
        tracked_write(
            &root,
            "nova-build-provenance.json",
            &provenance,
            request.delivery.incremental,
            &mut files,
            &mut cache_hits,
            &mut changed_files,
        )?;
    }
    if request.delivery.sbom {
        let sbom = serde_json::to_vec_pretty(&serde_json::json!({
            "bomFormat": "CycloneDX", "specVersion": "1.5", "version": 1,
            "metadata": { "component": { "type": "application", "name": game_name, "version": request.platform.version }, "properties": [{ "name": "nova.engine", "value": ENGINE_VERSION }, { "name": "nova.build", "value": build_id }] },
            "components": [{ "type": "file", "name": "game.nova-pak", "hashes": [{ "alg": "SHA-256", "content": sha256_hex(&pack) }] }]
        })).map_err(|error| error.to_string())?;
        tracked_write(
            &root,
            "nova-sbom.cdx.json",
            &sbom,
            request.delivery.incremental,
            &mut files,
            &mut cache_hits,
            &mut changed_files,
        )?;
    }
    let deployment = serde_json::to_vec_pretty(&serde_json::json!({
        "format": "nova-deployment-manifest", "version": 1, "engineVersion": ENGINE_VERSION, "buildId": build_id,
        "mode": request.delivery.deployment_mode, "destination": request.delivery.deployment_destination,
        "releaseChannel": request.delivery.release_channel, "implicitNetworkOperation": false,
        "connectorId": request.delivery.deployment_connector_id, "permissionGranted": request.delivery.deployment_permission_granted,
        "contentCache": request.delivery.content_cache, "deltaBuilds": request.delivery.delta_builds, "ciMatrixVersion": request.delivery.ci_matrix_version,
        "signing": { "mode": request.platform.signing_mode, "hookConfigured": !request.delivery.signing_hook.trim().is_empty(), "notarizationHookConfigured": !request.delivery.notarization_hook.trim().is_empty(), "execution": "external-explicit" },
        "cleanMachineJob": request.delivery.clean_machine_job
    })).map_err(|error| error.to_string())?;
    tracked_write(
        &root,
        "nova-deployment-manifest.json",
        &deployment,
        request.delivery.incremental,
        &mut files,
        &mut cache_hits,
        &mut changed_files,
    )?;
    if request.target == "web" && request.delivery.web_headers {
        let headers = b"/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n\n/index.html\n  Cache-Control: no-cache\n/player.html\n  Cache-Control: no-cache\n";
        tracked_write(
            &root,
            "_headers",
            headers,
            request.delivery.incremental,
            &mut files,
            &mut cache_hits,
            &mut changed_files,
        )?;
    }
    records = build_file_records(&root, &files)?;
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
            match fs::remove_file(&path) {
                Ok(()) => changed_files += 1,
                Err(error)
                    if error.kind() == std::io::ErrorKind::PermissionDenied
                        && path.extension().is_some_and(|extension| extension == "exe") =>
                {
                    // A creator may still be running an earlier Build & Run
                    // artifact. Retain it instead of failing the new build.
                }
                Err(error) => return Err(error.to_string()),
            }
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
        version: 2,
        engine_version: ENGINE_VERSION.into(),
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
        cache_mode: request.delivery.cache_mode.clone(),
        total_bytes: records.iter().map(|record| record.bytes).sum(),
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
    write_log(&format!("Nova_A version: {ENGINE_VERSION}\nOS: {} {}\nRenderer: {}\nProject: {}\nScene: {}\nError: {}\n\nStack trace:\n{}\n", std::env::consts::OS, std::env::consts::ARCH, payload.renderer, payload.project, payload.scene, payload.message, payload.stack))
}

#[tauri::command]
fn initialize_git_repository(
    project_directory: String,
    ignore_contents: String,
    pre_commit_contents: String,
    ci_contents: String,
) -> Result<String, String> {
    let root = PathBuf::from(project_directory)
        .canonicalize()
        .map_err(|error| format!("Project directory is unavailable: {error}"))?;
    if !root.is_dir() {
        return Err("Project directory must be an existing directory".into());
    }
    let output = Command::new("git")
        .arg("-C")
        .arg(&root)
        .arg("init")
        .output()
        .map_err(|error| format!("Could not start Git: {error}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_owned());
    }
    let write_new = |path: &Path, contents: &str| -> Result<(), String> {
        if path.exists() {
            return Ok(());
        }
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        fs::write(path, contents).map_err(|error| error.to_string())
    };
    write_new(&root.join(".gitignore"), &ignore_contents)?;
    write_new(&root.join(".githooks/pre-commit"), &pre_commit_contents)?;
    write_new(
        &root.join(".github/workflows/nova-validation.yml"),
        &ci_contents,
    )?;
    let config = Command::new("git")
        .arg("-C")
        .arg(&root)
        .args(["config", "core.hooksPath", ".githooks"])
        .output()
        .map_err(|error| format!("Could not configure Git hooks: {error}"))?;
    if !config.status.success() {
        return Err(String::from_utf8_lossy(&config.stderr).trim().to_owned());
    }
    Ok(root.to_string_lossy().into_owned())
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
            "Nova_A version: {ENGINE_VERSION}\nOS: {} {}\nFatal Rust panic at {location}\n{message}\n",
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
            initialize_git_repository,
            commit_project_transaction,
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
    fn embedded_package_rejects_corrupted_payload() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "nova-a-player-corrupt-test-{}-{unique}.bin",
            std::process::id()
        ));
        fs::write(&path, b"executable-prefix").unwrap();
        append_embedded_package(&path, b"NOVAPAK\0payload").unwrap();
        let mut bytes = fs::read(&path).unwrap();
        let payload_index = b"executable-prefix".len() + 3;
        bytes[payload_index] ^= 0xff;
        fs::write(&path, bytes).unwrap();
        assert!(embedded_package(&path)
            .unwrap_err()
            .contains("SHA-256 integrity"));
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
    fn embedded_player_publish_is_staged_before_replacing_the_previous_build() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = std::env::temp_dir().join(format!(
            "nova-a-player-publish-test-{}-{unique}",
            std::process::id()
        ));
        fs::create_dir_all(&directory).unwrap();
        let source = directory.join("editor-source.bin");
        let destination = directory.join("Game.exe");
        fs::write(&source, b"player-prefix").unwrap();
        let published = publish_embedded_player(
            &source,
            &destination,
            b"NOVAPAK\0first",
            "11111111111111111111111111111111",
        )
        .unwrap();
        assert_eq!(published, destination);
        assert_eq!(
            embedded_package(&destination).unwrap().as_deref(),
            Some(b"NOVAPAK\0first".as_slice())
        );
        assert!(!directory
            .read_dir()
            .unwrap()
            .any(|entry| entry.unwrap().path().extension().is_some_and(|value| value == "nova-staging")));
        fs::remove_dir_all(directory).unwrap();
    }

    #[cfg(windows)]
    #[test]
    fn locked_windows_player_uses_a_versioned_fallback_instead_of_failing() {
        use std::os::windows::fs::OpenOptionsExt;

        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = std::env::temp_dir().join(format!(
            "nova-a-player-lock-test-{}-{unique}",
            std::process::id()
        ));
        fs::create_dir_all(&directory).unwrap();
        let source = directory.join("editor-source.bin");
        let destination = directory.join("Game.exe");
        fs::write(&source, b"player-prefix").unwrap();
        fs::write(&destination, b"running-old-build").unwrap();
        let lock = OpenOptions::new()
            .read(true)
            .share_mode(0)
            .open(&destination)
            .unwrap();
        let published = publish_embedded_player(
            &source,
            &destination,
            b"NOVAPAK\0replacement",
            "abcdef1234567890abcdef1234567890",
        )
        .unwrap();
        assert_ne!(published, destination);
        assert_eq!(published.file_name().unwrap(), "Game-abcdef12.exe");
        assert_eq!(
            embedded_package(&published).unwrap().as_deref(),
            Some(b"NOVAPAK\0replacement".as_slice())
        );
        drop(lock);
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn bounded_base64_rejects_oversized_build_data_before_decoding() {
        let oversized = base64::engine::general_purpose::STANDARD.encode([7_u8; 33]);
        assert_eq!(decode_base64_limited(&oversized, 33, "fixture").unwrap().len(), 33);
        assert!(decode_base64_limited(&oversized, 32, "fixture")
            .unwrap_err()
            .contains("safety limit"));
    }

    #[test]
    fn build_hashes_are_stable_and_sensitive_to_content() {
        assert_eq!(sha256_hex(b"Nova_A"), sha256_hex(b"Nova_A"));
        assert_ne!(sha256_hex(b"Nova_A"), sha256_hex(b"Nova_B"));
    }

    #[test]
    fn project_transaction_stages_every_file_before_replacing_the_manual_save() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = std::env::temp_dir().join(format!(
            "nova-a-transaction-test-{}-{unique}",
            std::process::id()
        ));
        fs::create_dir_all(&directory).unwrap();
        let project_path = directory.join("project.nova");
        fs::write(&project_path, b"last-manual-save").unwrap();
        let encoded = |bytes: &[u8]| base64::engine::general_purpose::STANDARD.encode(bytes);
        let invalid = ProjectTransactionRequest {
            project_directory: directory.to_string_lossy().into_owned(),
            transaction_id: "fault-before-commit".into(),
            files: vec![
                ProjectTransactionFile {
                    path: "project.nova".into(),
                    data_base64: encoded(b"new-project"),
                    checksum: sha256_hex(b"new-project"),
                },
                ProjectTransactionFile {
                    path: "ProjectSettings/project.json".into(),
                    data_base64: encoded(b"settings"),
                    checksum: sha256_hex(b"wrong"),
                },
            ],
        };
        assert!(commit_project_transaction(invalid).is_err());
        assert_eq!(fs::read(&project_path).unwrap(), b"last-manual-save");

        let valid = ProjectTransactionRequest {
            project_directory: directory.to_string_lossy().into_owned(),
            transaction_id: "verified-commit".into(),
            files: vec![
                ProjectTransactionFile {
                    path: "project.nova".into(),
                    data_base64: encoded(b"new-project"),
                    checksum: sha256_hex(b"new-project"),
                },
                ProjectTransactionFile {
                    path: "ProjectSettings/project.json".into(),
                    data_base64: encoded(b"settings"),
                    checksum: sha256_hex(b"settings"),
                },
            ],
        };
        let result = commit_project_transaction(valid).unwrap();
        assert_eq!(result.committed_files, 2);
        assert_eq!(fs::read(&project_path).unwrap(), b"new-project");
        assert_eq!(
            fs::read(directory.join("ProjectSettings/project.json")).unwrap(),
            b"settings"
        );
        assert!(fs::read_to_string(result.journal_path)
            .unwrap()
            .contains("\"phase\": \"committed\""));
        fs::remove_dir_all(directory).unwrap();
    }
}
