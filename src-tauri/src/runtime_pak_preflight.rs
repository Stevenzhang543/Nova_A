//! Structural v1 package preflight shared by native project authority checks.
//! Structural index admission only. Actual project gzip/SHA/JSON stays in the original helper.
use std::collections::HashSet;
use serde_json::Value;

const JS_MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;

/// A caller policy, not a PAKv1 format limit. Each 1GiB decoded cap is a NEW compatibility policy.
/// The package cannot grant itself larger budgets; a trusted host must supply a profile explicitly.
#[derive(Clone, Copy)]
pub(super) struct RuntimePakCallerDecodedPolicy {
    pub(super) maximum_package_bytes: u64,
    pub(super) maximum_entry_decoded_bytes: u64,
    pub(super) maximum_decoded_bytes: u64,
}

impl RuntimePakCallerDecodedPolicy {
    pub(super) const fn compatibility_1_gib() -> Self {
        Self {
            maximum_package_bytes: 1024 * 1024 * 1024,
            maximum_entry_decoded_bytes: 1024 * 1024 * 1024,
            maximum_decoded_bytes: 1024 * 1024 * 1024,
        }
    }

    fn validate(self) -> Result<(), String> {
        for (name, value) in [
            ("maximumPackageBytes", self.maximum_package_bytes),
            ("maximumEntryDecodedBytes", self.maximum_entry_decoded_bytes),
            ("maximumDecodedBytes", self.maximum_decoded_bytes),
        ] {
            if value == 0 || value > JS_MAX_SAFE_INTEGER {
                return Err(format!("RUNTIME_PAK_LIMITS_REQUIRED: {name} must be a positive safe integer."));
            }
        }
        Ok(())
    }
}

// Root-selected path policy: PreserveWriterOpaque; never interpret keys as filesystem paths.

pub(super) struct ValidatedRuntimePakIndex {
    /// Only the three accepted numeric fields are converted to integer JSON representation.
    /// Raw package/project bytes are never rewritten; the original .as_u64 metadata tail remains intact.
    pub(super) project_entry: Value,
    /// This is declared metadata, not actual decoded bytes or full-asset integrity proof.
    pub(super) declared_decoded_bytes: u64,
}

fn safe_integer(value: Option<&Value>, field: &str) -> Result<u64, String> {
    let number = value.and_then(Value::as_f64)
        .ok_or_else(|| format!("The runtime package {field} is not a number."))?;
    // Matches JavaScript Number.isSafeInteger on the parsed JSON numeric value, including 0.0/-0.
    if !number.is_finite() || number < 0.0 || number > JS_MAX_SAFE_INTEGER as f64 || number.fract() != 0.0 {
        return Err(format!("The runtime package {field} is not a nonnegative safe integer."));
    }
    Ok(number as u64)
}

pub(super) fn is_version_one(value: Option<&Value>) -> bool {
    safe_integer(value, "index version").ok() == Some(1)
}

/// The literal remains exact in the package Map. Only collision identity removes empty/dot segments.
/// Whole str::to_lowercase is intentional: char-by-char or ASCII lowercase would mishandle contextual Σ.
/// The locked Rust/JavaScript path-key pairing is exercised by the shared 31-case golden corpus.
pub(super) fn runtime_package_path_key(value: &str) -> Result<String, String> {
    let slashes = value.replace('\\', "/");
    let normalized = slashes.trim_start_matches('/');
    if normalized.is_empty() || normalized.split('/').any(|part| part == "..") || normalized != value {
        return Err(format!("Unsafe package path: {value}"));
    }

    // No scheme/drive/device-name/colon blacklist, no NFC/NFKC, locale folding or percent decoding.
    let identity = normalized.split('/').filter(|part| !part.is_empty() && *part != ".")
        .collect::<Vec<_>>().join("/");
    Ok(identity.to_lowercase())
}

fn optional_string(row: &serde_json::Map<String, Value>, name: &str) -> Result<(), String> {
    if row.get(name).is_some_and(|value| !value.is_string()) {
        return Err(format!("The runtime package optional {name} is invalid."));
    }
    Ok(())
}

/// Called only with the original serde_json index from this exact pack, before selecting any authority.
pub(super) fn preflight(
    pack: &[u8],
    index: &Value,
    policy: RuntimePakCallerDecodedPolicy,
) -> Result<ValidatedRuntimePakIndex, String> {
    policy.validate()?;
    let package_bytes = u64::try_from(pack.len()).map_err(|_| "The runtime package size is unrepresentable.")?;
    if package_bytes > policy.maximum_package_bytes {
        return Err(format!("RUNTIME_PAK_PACKAGE_LIMIT: Package requires {package_bytes} bytes; configured package limit is {}.", policy.maximum_package_bytes));
    }
    let header = pack.get(..16).ok_or("The embedded runtime package header is invalid.")?;
    if &header[..8] != b"NOVAPAK\0" || u32::from_le_bytes(header[8..12].try_into().map_err(|_| "The runtime package version is truncated.")?) != 1 {
        return Err("The embedded runtime package header is invalid.".into());
    }
    let index_length = u64::from(u32::from_le_bytes(header[12..16].try_into().map_err(|_| "The runtime package index length is truncated.")?));
    let data_start = 16_u64.checked_add(index_length).ok_or("The runtime package data offset overflowed.")?;
    if index_length == 0 || index_length > 16 * 1024 * 1024 || data_start > package_bytes {
        return Err("The runtime package index is invalid or truncated.".into());
    }
    let object = index.as_object().ok_or("The runtime package index is invalid.")?;
    if object.get("format").and_then(Value::as_str) != Some("nova-pak") || !is_version_one(object.get("version")) {
        return Err("The runtime package index contract is unsupported.".into());
    }
    // These metadata fields were optional in old native valid fixtures and the old JS reader.
    for name in ["engineVersion", "createdAt", "startupSceneUuid"] { optional_string(object, name)?; }
    if object.get("physicsProfile").is_some_and(|value| !value.is_object()) {
        return Err("The runtime package index physicsProfile is invalid.".into());
    }
    let entries = object.get("entries").and_then(Value::as_array).ok_or("The runtime package has no entry table.")?;
    if entries.len() > super::MAX_WEB_EXPORT_FILES {
        return Err("The runtime package entry table exceeds the safety limit.".into());
    }

    let mut paths = HashSet::with_capacity(entries.len());
    let mut identities = HashSet::with_capacity(entries.len());
    let mut intervals: Vec<(u64, u64, usize)> = Vec::with_capacity(entries.len());
    let mut declared_decoded_bytes = 0_u64;
    let mut project_entry = None;
    for (row_index, entry) in entries.iter().enumerate() {
        let row = entry.as_object().ok_or("The runtime package entry is not an object.")?;
        let path = row.get("path").and_then(Value::as_str).ok_or("The runtime package path is invalid.")?;
        if !paths.insert(runtime_package_path_key(path)?) {
            return Err(format!("Duplicate package path: {path}"));
        }
        let codec = row.get("codec").and_then(Value::as_str).ok_or("The runtime package codec is invalid.")?;
        if !matches!(codec, "store" | "gzip") { return Err(format!("Unsupported package codec: {codec}")); }
        let hash = row.get("sha256").and_then(Value::as_str).ok_or("The runtime package entry has no SHA-256 digest.")?;
        if hash.len() != 64 || !hash.bytes().all(|byte| byte.is_ascii_hexdigit()) {
            return Err(format!("The package entry {path} has an invalid SHA-256 digest."));
        }
        for name in ["mimeType", "assetUuid", "assetType"] { optional_string(row, name)?; }
        if let Some(asset_uuid) = row.get("assetUuid").and_then(Value::as_str) {
            if asset_uuid.is_empty() || !identities.insert(asset_uuid.to_lowercase()) {
                return Err(format!("Duplicate or empty package asset identity: {path}"));
            }
        }
        let offset = safe_integer(row.get("offset"), "entry offset")?;
        let length = safe_integer(row.get("length"), "entry length")?;
        let original_length = safe_integer(row.get("originalLength"), "entry originalLength")?;
        let start = data_start.checked_add(offset).ok_or("The runtime package entry offset overflowed.")?;
        let end = start.checked_add(length).ok_or("The runtime package entry length overflowed.")?;
        if start > JS_MAX_SAFE_INTEGER || end > JS_MAX_SAFE_INTEGER || end > package_bytes {
            return Err(format!("Package entry {path} is outside the archive"));
        }
        if codec == "store" && length != original_length {
            return Err(format!("Package entry {path} has the wrong stored size"));
        }
        let entry_limit = if path == "project.nova" {
            policy.maximum_entry_decoded_bytes.min(super::MAX_RUNTIME_PROJECT_BYTES as u64)
        } else { policy.maximum_entry_decoded_bytes };
        if original_length > entry_limit || (path == "project.nova" && original_length == 0) {
            return Err(format!("RUNTIME_PAK_DECODED_LIMIT: {path} requires {original_length} decoded bytes; configured entry limit is {entry_limit}."));
        }
        declared_decoded_bytes = declared_decoded_bytes.checked_add(original_length).ok_or("The runtime package declared decoded size overflowed.")?;
        if declared_decoded_bytes > JS_MAX_SAFE_INTEGER || declared_decoded_bytes > policy.maximum_decoded_bytes {
            return Err(format!("RUNTIME_PAK_DECODED_LIMIT: The decoded package requires {declared_decoded_bytes} bytes; configured aggregate limit is {}.", policy.maximum_decoded_bytes));
        }
        if length > 0 { intervals.push((start, end, row_index)); }
        if path == "project.nova" {
            // Only this one bounded index row is copied, after acceptance; no project bytes or asset blocks are decoded here.
            let mut normalized = row.clone();
            normalized.insert("offset".into(), Value::from(offset));
            normalized.insert("length".into(), Value::from(length));
            normalized.insert("originalLength".into(), Value::from(original_length));
            project_entry = Some(Value::Object(normalized));
        }
    }
    intervals.sort_unstable_by_key(|interval| (interval.0, interval.1, interval.2));
    for pair in intervals.windows(2) {
        if pair[1].0 < pair[0].1 { return Err("The runtime package has overlapping nonempty entries.".into()); }
    }
    let project_entry = project_entry.ok_or("The runtime package has no project.nova authority.")?;
    Ok(ValidatedRuntimePakIndex { project_entry, declared_decoded_bytes })
}
