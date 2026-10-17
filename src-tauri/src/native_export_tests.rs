//! Real core/async export comparison; no WebView or signing/launch qualification.
use super::*;

struct TemporaryExports(PathBuf);

impl TemporaryExports {
    fn new() -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "nova-a-native-export-slice-{}-{nonce}",
            std::process::id()
        ));
        fs::create_dir_all(&path).unwrap();
        Self(path)
    }
}

impl Drop for TemporaryExports {
    fn drop(&mut self) {
        // This test creates and owns the exact absolute path, never an output chosen by a user.
        assert!(self.0.is_absolute());
        assert!(self
            .0
            .file_name()
            .unwrap()
            .to_string_lossy()
            .starts_with("nova-a-native-export-slice-"));
        let _ = fs::remove_dir_all(&self.0);
    }
}

fn request(root: &Path, pack: &[u8]) -> ExportRequest {
    let encoded = |bytes: &[u8]| base64::engine::general_purpose::STANDARD.encode(bytes);
    serde_json::from_value(serde_json::json!({
        "gameName": "NativeSlice", "target": "web", "architecture": "x86_64", "runtimeMode": "game",
        "packageIntoExecutable": false, "developmentBuild": false, "outputDirectory": root.to_string_lossy(),
        "packBase64": encoded(pack), "webFiles": [
            {"path": "index.html", "dataBase64": encoded(b"old html")},
            {"path": "assets/player.js", "dataBase64": encoded(b"console.log('actual slice')")},
            {"path": "index.html", "dataBase64": encoded(b"final html")},
            {"path": "nova-build-report.json", "dataBase64": encoded(b"ignored supplied report")},
            {"path": "nova-patch-manifest.json", "dataBase64": encoded(b"ignored supplied patch")}
        ],
        "run": false, "projectId": "native-slice", "profile": "release",
        "platform": {"identifier": "top.whitelists.native.slice", "version": "1.0.0", "iconAsset": null,
            "splashAsset": null, "orientation": "landscape", "permissions": [], "signingMode": "none",
            "signingIdentity": "", "notarizationProfile": ""},
        "delivery": {"deterministic": true, "incremental": true, "compression": "store", "patchManifest": true,
            "structuredLogs": false, "crashReports": false, "telemetryEnabled": false, "telemetryEndpoint": "",
            "privacyPolicyUrl": "", "cacheMode": "validate", "sizeReport": true, "dependencyReport": true}
    })).unwrap()
}

fn package() -> Vec<u8> {
    let project = serde_json::to_vec(
        &serde_json::json!({"projectSettings": {"build": {"runtimeMode": "game"}}}),
    )
    .unwrap();
    let index = serde_json::to_vec(&serde_json::json!({
        "format": "nova-pak", "version": 1, "entries": [{"path": "project.nova", "offset": 0,
            "length": project.len(), "originalLength": project.len(), "codec": "store", "sha256": sha256_hex(&project)}]
    })).unwrap();
    let mut pack = b"NOVAPAK\0".to_vec();
    pack.extend_from_slice(&1_u32.to_le_bytes());
    pack.extend_from_slice(&(index.len() as u32).to_le_bytes());
    pack.extend_from_slice(&index);
    pack.extend_from_slice(&project);
    pack
}

fn equal_artifacts(first: &ExportResult, second: &ExportResult) {
    assert_eq!(first.files, second.files);
    assert_eq!(first.build_id, second.build_id);
    assert_eq!(first.cache_hits, second.cache_hits);
    assert_eq!(first.changed_files, second.changed_files);
    assert!(!first.launched && !second.launched);
    for relative in &first.files {
        assert_eq!(
            fs::read(Path::new(&first.output_path).join(relative)).unwrap(),
            fs::read(Path::new(&second.output_path).join(relative)).unwrap(),
            "artifact differed: {relative}"
        );
    }
}

#[test]
fn native_export_async_command_matches_core_files_reports_cache_and_safety_errors() {
    let temporary = TemporaryExports::new();
    let pack = package();
    // Exercise the production static owner and the actual command, not a private test admission.
    let (started_tx, started_rx) = std::sync::mpsc::channel();
    let (release_tx, release_rx) = std::sync::mpsc::channel();
    let holding_owner = tauri::async_runtime::spawn(native_admission::run_export(move || {
        started_tx.send(()).unwrap();
        release_rx
            .recv_timeout(std::time::Duration::from_secs(5))
            .map_err(|error| error.to_string())
    }));
    started_rx
        .recv_timeout(std::time::Duration::from_secs(5))
        .unwrap();
    let busy_root = temporary.0.join("busy-must-not-be-created");
    let busy = tauri::async_runtime::block_on(export_game(request(&busy_root, &pack)))
        .err()
        .unwrap();
    assert!(busy.starts_with("Native export is busy;"));
    assert!(!busy_root.exists());
    release_tx.send(()).unwrap();
    tauri::async_runtime::block_on(holding_owner)
        .unwrap()
        .unwrap();

    let core_root = temporary.0.join("core");
    let async_root = temporary.0.join("async");
    let baseline = export_game_core(request(&core_root, &pack)).unwrap();
    let candidate =
        tauri::async_runtime::block_on(export_game(request(&async_root, &pack))).unwrap();
    equal_artifacts(&baseline, &candidate);
    assert_eq!(
        fs::read(async_root.join("index.html")).unwrap(),
        b"final html"
    );
    assert_eq!(fs::read(async_root.join("game.nova-pak")).unwrap(), pack);

    let baseline_second = export_game_core(request(&core_root, &pack)).unwrap();
    let candidate_second =
        tauri::async_runtime::block_on(export_game(request(&async_root, &pack))).unwrap();
    equal_artifacts(&baseline_second, &candidate_second);
    assert!(candidate_second.cache_hits > 0);

    let blocked_root = temporary.0.join("must-not-be-created");
    let mut traversal = request(&blocked_root, &pack);
    traversal.web_files[0].path = "../escape.js".into();
    let original_error = export_game_core(traversal).err().unwrap();
    let mut traversal = request(&blocked_root, &pack);
    traversal.web_files[0].path = "../escape.js".into();
    let async_error = tauri::async_runtime::block_on(export_game(traversal))
        .err()
        .unwrap();
    assert_eq!(original_error, async_error);
    assert!(!blocked_root.exists());

    let mut mismatched = request(&blocked_root, &pack);
    mismatched.runtime_mode = "headless-server".into();
    let original_error = export_game_core(mismatched).err().unwrap();
    let mut mismatched = request(&blocked_root, &pack);
    mismatched.runtime_mode = "headless-server".into();
    assert_eq!(
        original_error,
        tauri::async_runtime::block_on(export_game(mismatched))
            .err()
            .unwrap()
    );
    assert!(!blocked_root.exists());
    assert_eq!(MAX_EMBEDDED_PACKAGE_BYTES, 1024 * 1024 * 1024);
    assert_eq!(MAX_WEB_EXPORT_TOTAL_BYTES, 2 * 1024 * 1024 * 1024);
    assert_eq!(MAX_WEB_EXPORT_FILE_BYTES, 256 * 1024 * 1024);
    assert_eq!(MAX_WEB_EXPORT_FILES, 20_000);
}
