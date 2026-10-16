//! Bounded package-source reads and process-lifetime byte identity. No Tauri capabilities.
use std::fs::File;
use std::io::Read;
use std::path::Path;
use std::sync::OnceLock;
use sha2::{Digest, Sha256};

#[derive(Clone, Copy, PartialEq, Eq)]
pub(super) struct PackageIdentity {
    bytes: u64,
    sha256: [u8; 32],
}

/// Every authority/transport caller accepts the same raw package throughout a process.
/// Retain only size/hash, not an additional permanently resident package allocation.
pub(super) fn verify_package_identity(identity: &OnceLock<Option<PackageIdentity>>, package: Option<&[u8]>) -> Result<(), String> {
    let observed = package.map(|bytes| PackageIdentity { bytes: bytes.len() as u64, sha256: Sha256::digest(bytes).into() });
    if *identity.get_or_init(|| observed) != observed {
        return Err("RUNTIME_PACKAGE_CHANGED: The runtime package changed during this process; restart the player to select another package.".into());
    }
    Ok(())
}

/// Open once, inspect that handle, then enforce the actual byte count while reading.
/// Metadata alone is not a limit: the file can grow after metadata was read.
pub(super) fn read_bounded_sidecar(path: &Path, maximum_bytes: u64) -> Result<Vec<u8>, String> {
    if maximum_bytes == 0 || maximum_bytes > 9_007_199_254_740_991 {
        return Err("RUNTIME_PACKAGE_SOURCE_LIMIT: Supply a positive safe package byte budget.".into());
    }
    let mut file = File::open(path).map_err(|error| error.to_string())?;
    let metadata = file.metadata().map_err(|error| error.to_string())?;
    if !metadata.is_file() {
        return Err("RUNTIME_PACKAGE_SOURCE_INVALID: The sidecar is not a regular file.".into());
    }
    if metadata.len() > maximum_bytes {
        return Err(format!("RUNTIME_PACKAGE_SOURCE_LIMIT: Sidecar metadata reports {} bytes; the configured package limit is {maximum_bytes}.", metadata.len()));
    }
    collect_bounded_file(&mut file, maximum_bytes, metadata.len())
}

fn collect_bounded_file(file: &mut File, maximum_bytes: u64, initial_length: u64) -> Result<Vec<u8>, String> {
    let maximum_capacity = usize::try_from(maximum_bytes)
        .map_err(|_| "RUNTIME_PACKAGE_SOURCE_LIMIT: Package budget exceeds the host address space.")?;
    let initial_capacity = usize::try_from(initial_length)
        .map_err(|_| "RUNTIME_PACKAGE_SOURCE_LIMIT: File size exceeds the host address space.")?;
    if initial_capacity > maximum_capacity {
        return Err("RUNTIME_PACKAGE_SOURCE_LIMIT: File size exceeds the configured byte budget.".into());
    }
    let mut bytes = Vec::new();
    bytes.try_reserve_exact(initial_capacity).map_err(|error| format!("RUNTIME_PACKAGE_ALLOCATION_FAILED: {error}"))?;
    let mut chunk = [0_u8; 64 * 1024];
    loop {
        let count = file.read(&mut chunk).map_err(|error| error.to_string())?;
        if count == 0 { break; }
        let required = (bytes.len() as u64).checked_add(count as u64)
            .ok_or("RUNTIME_PACKAGE_SOURCE_LIMIT: Package byte count overflow.")?;
        if required > maximum_bytes {
            return Err(format!("RUNTIME_PACKAGE_SOURCE_LIMIT: Sidecar requires at least {required} bytes; the configured package limit is {maximum_bytes}."));
        }
        let required_capacity = usize::try_from(required)
            .map_err(|_| "RUNTIME_PACKAGE_SOURCE_LIMIT: Read size exceeds the host address space.")?;
        if required_capacity > bytes.capacity() {
            let target_capacity = bytes.capacity().saturating_mul(2).max(required_capacity).min(maximum_capacity);
            bytes.try_reserve_exact(target_capacity - bytes.len())
                .map_err(|error| format!("RUNTIME_PACKAGE_ALLOCATION_FAILED: {error}"))?;
        }
        bytes.extend_from_slice(&chunk[..count]);
    }
    Ok(bytes)
}
